// A local stand-in for Cloudflare, for testing on a machine without wrangler (node 12 is enough): runs the real
// src/index.js (Worker, Plans, Session and Relay) on node's http server, with small emulations of the Durable Object APIs
// it uses (storage, acceptWebSocket, getWebSockets, attachments, the ping auto-response) and a minimal WebSocket
// server. With HIBERNATE=1 every Session is thrown away after each event and rebuilt from its storage, as Cloudflare
// does when an object hibernates, so state kept only in memory shows up as a bug.
//   LIVE_DEV_KEY=<a made-up key> PORT=8811 SCRATCH=<a folder for one patched file> node tools/workers/live/test/devserver.js
// This is a test harness, not Cloudflare: it shows that the code is consistent with the documented APIs, not that
// Cloudflare behaves exactly like it.
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import url from 'url';
import util from 'util';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const src = path.join(here, '../src');
const scratch = process.env.SCRATCH || path.join(here, 'out-dev');
const PORT = +(process.env.PORT || 8811);
const HIBERNATE = process.env.HIBERNATE === '1';
fs.mkdirSync(scratch, { recursive: true });

function frame(op, data) {
    const n = data.length;
    const head = n < 126 ? Buffer.from([0x80 | op, n]) : n < 65536 ? Buffer.from([0x80 | op, 126, n >> 8, n & 255]) : null;
    if (!head) { const h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeUInt32BE(0, 2); h.writeUInt32BE(n, 6); return Buffer.concat([h, data]); }
    return Buffer.concat([head, data]);
}
/* ---------- the Workers runtime, as far as index.js uses it ---------- */
class Headers {
    constructor(h) { this.m = {}; Object.keys(h || {}).forEach((k) => { this.m[k.toLowerCase()] = String(h[k]); }); }
    get(k) { const v = this.m[k.toLowerCase()]; return v === undefined ? null : v; }
    set(k, v) { this.m[k.toLowerCase()] = String(v); }
}
class Request {
    constructor(u, o) { this.url = u; this.method = o.method || 'GET'; this.headers = new Headers(o.headers); this.body = o.body || ''; }
    async text() { return this.body; }
}
class Response {
    constructor(body, o) { o = o || {}; this.body = body; this.status = o.status || 200; this.headers = new Headers(o.headers); this.webSocket = o.webSocket || null; }
}
class WebSocketRequestResponsePair { constructor(a, b) { this.a = a; this.b = b; } }
let wsSeq = 0;
class ServerSocket {
    constructor() { this.id = ++wsSeq; this.raw = null; this.queue = []; this.att = null; this.closed = false; this.do = null; }
    send(text) {
        if (this.closed) throw new Error('closed');
        if (!this.raw) { this.queue.push(text); return; }
        this.raw.write(frame(1, Buffer.from(String(text))));
    }
    close(code, reason) {
        if (this.closed) return;
        this.closed = true;
        const b = Buffer.alloc(2 + Buffer.byteLength(reason || ''));
        b.writeUInt16BE(code || 1000, 0); b.write(reason || '', 2);
        const go = () => { try { this.raw.write(frame(8, b)); this.raw.end(); } catch (e) { /* gone */ } };
        if (this.raw) go(); else this.pendingClose = go;
    }
    serializeAttachment(v) {
        const s = JSON.stringify(v);
        if (s.length > 16384) throw new Error('attachment over 16 KiB');
        this.att = s;
    }
    deserializeAttachment() { return this.att ? JSON.parse(this.att) : null; }
}
globalThis.WebSocketPair = function () { const s = new ServerSocket(); return { 0: { peer: s }, 1: s }; };
globalThis.WebSocketRequestResponsePair = WebSocketRequestResponsePair;
globalThis.Response = Response;
/* no timingSafeEqual here (plan.js uses its constant-time loop); getRandomValues from node's CSPRNG */
globalThis.crypto = { subtle: {}, getRandomValues: function (b) { return crypto.randomFillSync(b); } };
globalThis.TextEncoder = globalThis.TextEncoder || util.TextEncoder;

class Storage {
    constructor() { this.m = new Map(); this.alarm = null; }
    clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
    async get(k) {
        if (Array.isArray(k)) { const r = new Map(); k.forEach((x) => { if (this.m.has(x)) r.set(x, this.clone(this.m.get(x))); }); return r; }
        return this.clone(this.m.get(k));
    }
    async put(k, v) {
        if (typeof k === 'object') { if (Object.keys(k).length > 128) throw new Error('put: over 128 keys'); Object.keys(k).forEach((x) => this.put(x, k[x])); return; }
        if (v === undefined) throw new Error('put: undefined value for ' + k);
        this.m.set(k, this.clone(v));
    }
    async delete(k) {
        if (Array.isArray(k)) { if (k.length > 128) throw new Error('delete: over 128 keys'); let n = 0; k.forEach((x) => { if (this.m.delete(x)) n++; }); return n; }
        return this.m.delete(k);
    }
    async list(o) {
        const p = (o && o.prefix) || '', r = new Map();
        Array.from(this.m.keys()).sort().forEach((k) => { if (k.indexOf(p) === 0) r.set(k, this.clone(this.m.get(k))); });
        return r;
    }
    async deleteAll() { this.m.clear(); }
    async setAlarm(t) { this.alarm = t; }
    async getAlarm() { return this.alarm; }
    async deleteAlarm() { this.alarm = null; }
}
class Ctx {
    constructor(name) { this.id = { name: name }; this.storage = new Storage(); this.sockets = []; this.auto = null; }
    acceptWebSocket(ws, tags) { ws.tags = tags || []; this.sockets.push(ws); }
    getWebSockets(tag) { return this.sockets.filter((w) => !w.closed && (!tag || w.tags.indexOf(tag) >= 0)); }
    getTags(ws) { return ws.tags; }
    setWebSocketAutoResponse(p) { this.auto = p; }
    blockConcurrencyWhile(fn) { return fn(); }
}
globalThis.__DO = class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } };

/* src/index.js with its two imports pointed at this machine */
const code = fs.readFileSync(path.join(src, 'index.js'), 'utf8')
    .replace("import { DurableObject } from 'cloudflare:workers';", 'const DurableObject = globalThis.__DO;')
    .replace(/from '\.\/(plan|session|relay)\.js'/g, (m, f) => "from '" + url.pathToFileURL(path.join(src, f + '.js')).href + "'");
const patched = path.join(scratch, 'index.dev.mjs');
fs.writeFileSync(patched, code);

import(url.pathToFileURL(patched).href).then(main, function (e) { console.error(e); process.exit(1); });
function main(mod) {
const worker = mod.default;

/* one namespace per class; a stub calls the object's methods (RPC) or its fetch */
function namespace(Cls, isSession) {
    const objs = {};
    function inst(name) {
        let o = objs[name];
        if (!o) o = objs[name] = { ctx: new Ctx(name), obj: null };
        if (!o.obj) o.obj = new Cls(o.ctx, env);
        return o;
    }
    async function call(name, fn) {
        const o = inst(name);
        try { return await fn(o.obj); } finally {
            if (HIBERNATE && isSession && !o.obj.timer) o.obj = null;  // "hibernate": the next event builds a new object
        }
    }
    return {
        objs: objs, inst: inst, call: call,
        idFromName: (n) => n,
        get: (id) => new Proxy({}, { get: (t, m) => (...args) => call(id, (o) => o[m].apply(o, args)) })
    };
}
const env = { DEV: '1', PRESENTER_KEY: process.env.LIVE_DEV_KEY || '' };
env.SESSION = namespace(mod.Session, true);
env.PLANS = namespace(mod.Plans, false);
env.RELAY = namespace(mod.Relay, true);

/* ---------- a minimal WebSocket server ---------- */
function bind(ws, raw, name, ns) {
    ws.raw = raw;
    ws.queue.splice(0).forEach((t) => ws.send(t));
    if (ws.pendingClose) ws.pendingClose();
    let buf = Buffer.alloc(0);
    raw.on('data', (d) => {
        buf = Buffer.concat([buf, d]);
        for (;;) {
            if (buf.length < 2) return;
            const op = buf[0] & 15; let n = buf[1] & 127, off = 2;
            if (n === 126) { if (buf.length < 4) return; n = buf.readUInt16BE(2); off = 4; } else if (n === 127) { if (buf.length < 10) return; n = buf.readUInt32BE(6); off = 10; }
            if (buf.length < off + 4 + n) return;
            const mask = buf.slice(off, off + 4), data = Buffer.from(buf.slice(off + 4, off + 4 + n));
            for (let i = 0; i < n; i++) data[i] ^= mask[i & 3];
            buf = buf.slice(off + 4 + n);
            if (op === 1) {
                const text = data.toString();
                const ctx = ns.inst(name).ctx;
                if (ctx.auto && text === ctx.auto.a) { stats.auto++; ws.send(ctx.auto.b); continue; }  // answered without waking the object
                stats.msgs++;
                ns.call(name, (o) => o.webSocketMessage(ws, text)).catch((e) => console.error('webSocketMessage', e));
            } else if (op === 8) {
                const c = data.length >= 2 ? data.readUInt16BE(0) : 1005;
                if (!ws.closed) { ws.closed = true; try { raw.write(frame(8, data.slice(0, 2))); raw.end(); } catch (e) { /* gone */ } }
                ns.call(name, (o) => o.webSocketClose(ws, c, '', true)).catch((e) => console.error('webSocketClose', e));
                return;
            } else if (op === 9) raw.write(frame(10, data));
        }
    });
    raw.on('close', () => {
        if (ws.gone) return;
        ws.gone = true;
        if (!ws.closed) { ws.closed = true; ns.call(name, (o) => o.webSocketClose(ws, 1006, '', false)).catch(() => {}); }
    });
}

const stats = { requests: 0, sockets: 0, msgs: 0, auto: 0 };
function toRequest(req, body) {
    /* Cloudflare puts the client's address in CF-Connecting-IP */
    const headers = Object.assign({}, req.headers, { 'cf-connecting-ip': process.env.FAKE_IP || req.socket.remoteAddress });
    return new Request('http://localhost:' + PORT + req.url, { method: req.method, headers: headers, body: body });
}
const server = http.createServer((req, res) => {
    if (req.url === '/__stats') { res.end(JSON.stringify(stats)); return; }
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
        stats.requests++;
        try {
            const r = await worker.fetch(toRequest(req, body), env);
            const h = {}; Object.keys(r.headers.m).forEach((k) => { h[k] = r.headers.m[k]; });
            res.writeHead(r.status, h);
            res.end(r.body || '');
        } catch (e) { console.error(e); res.writeHead(500); res.end('dev server error'); }
    });
});
server.on('upgrade', async (req, raw) => {
    stats.requests++;
    try {
        const r = await worker.fetch(toRequest(req, ''), env);
        if (r.status !== 101 || !r.webSocket) { raw.end('HTTP/1.1 ' + r.status + ' No\r\nContent-Length: 0\r\n\r\n'); return; }
        stats.sockets++;
        const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
        raw.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
        const m = /^\/(ws|relay)\/([^/?]+)/.exec(req.url);
        bind(r.webSocket.peer, raw, m[2], m[1] === 'relay' ? env.RELAY : env.SESSION);
    } catch (e) { console.error(e); raw.destroy(); }
});
server.listen(PORT, '127.0.0.1', () => console.log('live dev server on http://localhost:' + PORT + (HIBERNATE ? ' (hibernating after every event)' : '')));
}
