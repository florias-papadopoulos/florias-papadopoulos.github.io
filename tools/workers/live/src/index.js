// florias-live: audience mode for talks (the site's hidden /live/ pages). A Cloudflare Worker with two kinds of
// SQLite-backed Durable Objects:
//   Session  one per talk code (idFromName("pkc27"), and "pkc27.test" for a rehearsal): the phones, the projector and
//            the remote keep one WebSocket each to it (Hibernation API: the object sleeps between messages and its
//            state lives in its storage), and it pushes every change to them, so nobody polls.
//   Plans    one object ("owner") with the presenter's talk plans (quiz answers included), never in the public repo.
//   Relay    one per room of the Signal demo (/phd/projects/signal/, two phones): forwards messages between its two
//            WebSockets and stores nothing but its closing alarm (relay.js).
// The logic is in plan.js and session.js (pure functions, tested in node by test/run.js); this file only connects
// them to Cloudflare's APIs.
//
// HTTP (all but / and /ws need "Authorization: Bearer <PRESENTER_KEY>"):
//   GET    /                        {"service": "florias-live", "presenterKey": "set" | "missing or too weak"}
//   GET    /relay                   {"relay": true} (the Signal demo checks that this worker has the relay)
//   GET    /relay/<room>            WebSocket into a room of the Signal demo (12 letters a-z, 2-7), two phones at most
//   GET    /ws/<session>?r=a|p      WebSocket for a phone (a, which sends the join secret first) or the presenter
//                                   (p, who sends the key first)
//   GET    /plans                   {"plans": [{code, title, n, updated}]}
//   GET    /plans/<code>            {"plan": {...}} (with its join secrets), 404 when there is none
//   PUT    /plans/<code>(?new=1)    saves a plan: {"plan": {...}} as cleaned and checked, with its join secrets (kept,
//                                   or made for a new talk); 422 {"error": "..."}; with ?new=1, 409 when the code is
//                                   taken
//   DELETE /plans/<code>
//   GET    /results/<session>       everything collected in that session (votes, ranking, questions) as JSON
//   DELETE /results/<session>       deletes it now (the plan stays)
import { DurableObject } from 'cloudflare:workers';
import { LIMITS, SITE, bearer, checkPlan, codeOk, ipKey, keyOk, originOk, secret, sessionOk, strong, summary, withJoin } from './plan.js';
import * as S from './session.js';
import { RELAY, fresh, judge, roomOk, spend } from './relay.js';

/* the presenter key, compared in constant time (crypto.subtle.timingSafeEqual is a Workers extension) */
function presenterKey(env, k) {
    const eq = crypto.subtle.timingSafeEqual ? function (a, b) { return crypto.subtle.timingSafeEqual(a, b); } : null;
    return keyOk(k, env.PRESENTER_KEY, eq) === true;
}
/* n random bytes from the CSPRNG */
function bytes(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return b; }

export default {
    async fetch(req, env) {
        const url = new URL(req.url), path = url.pathname, method = req.method;
        const origin = req.headers.get('Origin') || '', allowed = originOk(origin, env.DEV === '1');
        const cors = { 'Access-Control-Allow-Origin': allowed ? origin : SITE, 'Vary': 'Origin' };
        function reply(status, body) {
            return new Response(body === undefined ? null : JSON.stringify(body), { status: status,
                headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors) });
        }
        if (method === 'OPTIONS') {
            if (!allowed) return reply(403);
            return new Response(null, { status: 204, headers: Object.assign({ 'Access-Control-Allow-Methods': 'GET, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400' }, cors) });
        }
        /* browsers always send Origin on WebSockets and on these cross-site calls: other sites are turned away */
        if (origin && !allowed) return reply(403, { error: 'origin' });
        try {
            let m = /^\/ws\/([^/]{1,40})$/.exec(path);
            if (m) {
                if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return reply(426, { error: 'websocket' });
                if (!allowed) return reply(403, { error: 'origin' });
                if (!sessionOk(m[1])) return reply(404, { error: 'code' });
                return env.SESSION.get(env.SESSION.idFromName(m[1])).fetch(req);
            }
            if (path === '/relay' && method === 'GET') return reply(200, { relay: true });
            m = /^\/relay\/([^/]{1,40})$/.exec(path);
            if (m) {
                if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return reply(426, { error: 'websocket' });
                if (!allowed) return reply(403, { error: 'origin' });
                if (!roomOk(m[1])) return reply(404, { error: 'room' });
                return env.RELAY.get(env.RELAY.idFromName(m[1])).fetch(req);
            }
            if (path === '/' && method === 'GET') return reply(200, { service: 'florias-live', presenterKey: strong(env.PRESENTER_KEY) ? 'set' : 'missing or too weak' });

            if (!presenterKey(env, bearer(req.headers.get('Authorization')))) return reply(401, { error: 'key' });
            const plans = env.PLANS.get(env.PLANS.idFromName('owner'));
            if (path === '/plans' && method === 'GET') return reply(200, { plans: await plans.listPlans() });
            m = /^\/plans\/([^/]{1,40})$/.exec(path);
            if (m) {
                const code = m[1];
                if (!codeOk(code)) return reply(400, { error: 'The code may have 2 to 20 lower case letters, digits and hyphens.' });
                if (method === 'GET') {
                    const p = await plans.getPlan(code);
                    return p ? reply(200, { plan: p }) : reply(404, { error: 'none' });
                }
                if (method === 'PUT') {
                    const text = await req.text();
                    if (text.length > LIMITS.planBytes || new TextEncoder().encode(text).length > LIMITS.planBytes) return reply(413, { error: 'The plan is too long.' });
                    let body = null;
                    try { body = JSON.parse(text); } catch (e) { return reply(400, { error: 'The plan is not JSON.' }); }
                    const r = await plans.savePlan(code, body, url.searchParams.get('new') === '1');
                    if (r.error) return reply(r.status || 422, { error: r.error });
                    await tell(env, code, r.plan);
                    return reply(200, { plan: r.plan });
                }
                if (method === 'DELETE') {
                    await plans.deletePlan(code);
                    await tell(env, code, null);
                    return reply(200, { ok: true });
                }
            }
            m = /^\/results\/([^/]{1,40})$/.exec(path);
            if (m && sessionOk(m[1])) {
                const s = env.SESSION.get(env.SESSION.idFromName(m[1]));
                if (method === 'GET') return reply(200, await s.exportData(m[1]));
                if (method === 'DELETE') { await s.purgeNow(m[1]); return reply(200, { ok: true }); }
            }
        } catch (e) {
            return reply(500, { error: 'server' });
        }
        return reply(404, { error: 'not found' });
    }
};

/* a saved (or deleted) plan goes to its session and to its rehearsal, so phones see the title before the talk */
async function tell(env, code, plan) {
    for (const name of [code, code + '.test']) await env.SESSION.get(env.SESSION.idFromName(name)).setPlan(name, plan);
}

/* ---------- the presenter's plans ---------- */
export class Plans extends DurableObject {
    async listPlans() {
        const all = await this.ctx.storage.list({ prefix: 'plan:' });
        return Array.from(all.values()).map(function (e) { return summary(e.plan, e.updated); })
            .sort(function (x, y) { return y.updated - x.updated; });
    }
    async getPlan(code) {
        const e = await this.ctx.storage.get('plan:' + code);
        return e ? e.plan : null;
    }
    async savePlan(code, input, fresh) {
        const c = checkPlan(input, code);
        if (c.error) return c;
        const had = await this.ctx.storage.get('plan:' + code);
        if (had && fresh) return { error: 'There is already a talk with this code.', status: 409 };
        if (!had && (await this.ctx.storage.list({ prefix: 'plan:' })).size >= LIMITS.plans) return { error: 'There are too many talks; delete one first.', status: 409 };
        const plan = withJoin(c.plan, had && had.plan, bytes);
        await this.ctx.storage.put('plan:' + code, { plan: plan, updated: Date.now() });
        return { plan: plan };
    }
    async deletePlan(code) {
        await this.ctx.storage.delete('plan:' + code);
        return true;
    }
}

/* ---------- one live session ---------- */
function attOf(ws) { try { return ws.deserializeAttachment() || {}; } catch (e) { return {}; } }
function send(ws, text) { try { ws.send(text); } catch (e) { /* closing */ } }

export class Session extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.st = null;      // the state, loaded from storage when the object wakes (see load)
        this.mem = {};       // kept only while awake: the reaction rate of everyone together
        this.pending = {};   // live poll bars and upvote counts for the phones, sent at most once a second
        this.timer = null;
        /* the address key of each audience connection (by the connection's random "c"), only in this memory: never
           stored, never in an attachment, gone when the object sleeps */
        this.ipOf = new Map();
        /* phones send "ping" every 50 s so their connection is not dropped as idle; answered without waking us */
        ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    }

    async load(name) {
        if (!this.st) {
            const all = await this.ctx.storage.list();
            const meta = all.get('meta');
            this.st = S.fromStorage(name || (meta && meta.name) || '', all);
        }
        return this.st;
    }

    /* phones that have joined (said hello with the join secret), without "not" */
    audCount(not) { return this.ctx.getWebSockets('a').filter(function (w) { return w !== not && attOf(w).ok; }).length; }

    async fetch(req) {
        const url = new URL(req.url), m = /^\/ws\/([^/]{1,40})$/.exec(url.pathname);
        if (!m || (req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
        const name = m[1];
        if (!sessionOk(name)) return new Response('Bad code', { status: 404 });
        await this.load(name);
        const role = url.searchParams.get('r') === 'p' ? 'p' : 'a', now = Date.now();
        /* the address, only to count connections from one place (CF-Connecting-IP is set by Cloudflare) */
        const ip = role === 'a' ? ipKey(req.headers.get('CF-Connecting-IP') || '') : '';
        const others = this.ctx.getWebSockets(role), ipOf = this.ipOf;
        const atts = others.map(attOf);
        const d = S.admit(role, atts.map(function (a) { return { ok: !!a.ok, at: a.at, ip: !!ip && ipOf.get(a.c) === ip }; }), now);
        for (const i of d.drop) { ipOf.delete(atts[i].c); try { others[i].close(4002, 'room'); } catch (e) { /* gone */ } }
        const pair = new WebSocketPair();
        const client = pair[0], server = pair[1];
        this.ctx.acceptWebSocket(server, [role]);
        const c = secret(bytes, 12);
        server.serializeAttachment({ r: role, ok: false, at: now, name: name, c: c });
        if (d.full) {
            send(server, JSON.stringify({ t: 'err', e: 'full' }));
            server.close(4003, 'full');
        } else if (ip) ipOf.set(c, ip);
        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws, message) {
        if (message === 'ping') { send(ws, 'pong'); return; }
        if (typeof message !== 'string' || message.length > LIMITS.msg) { ws.close(1009, 'too big'); return; }
        let msg = null;
        try { msg = JSON.parse(message); } catch (e) { /* handled as a bad message */ }
        const att = attOf(ws), env = this.env;
        const st = await this.load(att.name);
        /* the number of phones is only needed for a hello (it reads every attachment) */
        const aud = msg && msg.t === 'hi' && !att.ok ? this.audCount(ws) : 0;
        const r = S.handle(st, att, msg, { now: Date.now(), aud: aud, mem: this.mem, rand: Math.random, bytes: bytes,
            ip: this.ipOf.get(att.c) || '', keyOk: function (k) { return presenterKey(env, k); } });
        if (r.att) ws.serializeAttachment(r.att);
        await this.apply(r, ws);
        if (r.close) ws.close(r.close, '');
    }

    async webSocketClose(ws, code, reason, wasClean) {
        try { ws.close(1000, 'bye'); } catch (e) { /* already closed */ }
        this.gone(ws);
    }
    async webSocketError(ws, error) { this.gone(ws); }
    gone(ws) {
        const att = attOf(ws);
        this.ipOf.delete(att.c);
        if (att.r === 'a' && att.ok) this.deliver([{ to: 'pres', m: { t: 'n', n: this.audCount(ws) } }], null);
    }

    async alarm() {
        const st = await this.load(), now = Date.now(), step = S.alarmStep(st, now);
        let r = { dirty: [], del: [], out: [] };
        if (step.act === 'end') r = S.end(st, now);
        else if (step.act === 'purge') r = S.purge(st);
        else r.alarm = step.at;
        await this.apply(r, null);
    }

    /* called by the Worker */
    async setPlan(name, plan) { const st = await this.load(name); await this.apply(S.setPlan(st, plan), null); return true; }
    async exportData(name) { const st = await this.load(name); return S.exportResults(st, Date.now()); }
    async purgeNow(name) { const st = await this.load(name); await this.apply(S.purge(st), null); return true; }

    /* write what changed, then send (Durable Objects hold outgoing messages until the writes are safe anyway) */
    async apply(r, ws) {
        const s = this.ctx.storage, st = this.st;
        if (r.kick && st.meta.s === 'none' && !st.plan) {
            /* a session without a plan keeps nothing at all */
            await s.deleteAlarm();
            await s.deleteAll();
        } else {
            const keys = Array.from(new Set(r.dirty)), put = [], del = [];
            for (const k of keys) { const v = S.part(st, k); if (v === undefined) del.push(k); else put.push([k, v]); }
            const written = new Set(keys);
            for (const k of r.del) if (!written.has(k)) del.push(k);
            for (let i = 0; i < del.length; i += 100) await s.delete(del.slice(i, i + 100));
            for (let i = 0; i < put.length; i += 100) {
                const o = {};
                for (const kv of put.slice(i, i + 100)) o[kv[0]] = kv[1];
                await s.put(o);
            }
            if (r.alarm !== undefined) { if (r.alarm) await s.setAlarm(r.alarm); else await s.deleteAlarm(); }
        }
        this.deliver(r.out, ws);
        if (r.kick) for (const w of this.ctx.getWebSockets('a')) { try { w.close(r.kick, 'none'); } catch (e) { /* gone */ } }
    }

    deliver(out, ws) {
        const now = Date.now(), memo = {}, who = new Map();
        for (const o of out) {
            if (o.to === 'me') { if (ws) send(ws, JSON.stringify(o.m)); continue; }
            if (o.to === 'who') { who.set(o.id, (who.get(o.id) || []).concat([JSON.stringify(o.m)])); continue; }
            if (o.coalesce) { this.later(o); continue; }
            const list = this.ctx.getWebSockets(o.to === 'aud' ? 'a' : 'p');
            let text = o.m ? JSON.stringify(o.m) : null;
            if (o.view && o.to === 'pres') text = JSON.stringify(S.presenterView(this.st, now, this.audCount()));
            for (const w of list) {
                const att = attOf(w);
                if (!att.ok) continue;
                send(w, o.view && o.to === 'aud' ? JSON.stringify(S.audienceView(this.st, att.id, now, memo)) : text);
            }
        }
        /* messages for single phones, in one pass over the connections */
        if (who.size) for (const w of this.ctx.getWebSockets('a')) {
            const att = attOf(w), list = att.ok && who.get(att.id);
            if (list) for (const t of list) send(w, t);
        }
    }
    later(o) {
        this.pending[o.coalesce] = o;
        if (this.timer) return;
        const self = this;
        this.timer = setTimeout(function () {
            const p = self.pending;
            self.pending = {}; self.timer = null;
            self.deliver(Object.keys(p).map(function (k) { return { to: p[k].to, m: p[k].m }; }), null);
        }, 1000);
    }
}

/* ---------- one room of the Signal demo ----------
   Two WebSockets at most; each message from one goes unchanged to the other. Nothing is stored but the alarm that
   closes the room after RELAY.life; the message budget of each phone rides in its socket's attachment, so the object
   can hibernate between messages. When the last phone leaves, the alarm and everything else are deleted. */
export class Relay extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    }
    /* the phones in the room (a socket refused as the third has no attachment) */
    phones(not) { return this.ctx.getWebSockets().filter(function (w) { return w !== not && attOf(w).ok; }); }
    count(not) {
        const list = this.phones(not);
        for (const w of list) send(w, 'peers:' + list.length);
    }
    async fetch(req) {
        if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
        const now = Date.now(), full = this.phones().length >= RELAY.peers;
        const pair = new WebSocketPair();
        const client = pair[0], server = pair[1];
        this.ctx.acceptWebSocket(server);
        if (full) {
            server.close(4003, 'full');
        } else {
            server.serializeAttachment(fresh(now));
            if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + RELAY.life);
            this.count(null);
        }
        return new Response(null, { status: 101, webSocket: client });
    }
    async webSocketMessage(ws, message) {
        const att = attOf(ws);
        if (!att.ok) return;
        const j = judge(message);
        if (j === 'big') { ws.close(1009, 'too big'); return; }
        const s = spend(att, Date.now());
        if (!s.ok) { ws.close(4029, 'slow down'); return; }
        ws.serializeAttachment(s.att);
        if (j === 'forward') for (const w of this.phones(ws)) send(w, message);
    }
    async webSocketClose(ws) { await this.left(ws); }
    async webSocketError(ws) { await this.left(ws); }
    async left(ws) {
        const was = attOf(ws).ok;
        try { ws.serializeAttachment({}); } catch (e) { /* closed */ }
        try { ws.close(1000, 'bye'); } catch (e) { /* already closed */ }
        if (!was) return;
        if (this.phones(ws).length) this.count(ws);
        else { await this.ctx.storage.deleteAlarm(); await this.ctx.storage.deleteAll(); }
    }
    async alarm() {
        for (const w of this.ctx.getWebSockets()) { try { w.serializeAttachment({}); w.close(4008, 'time'); } catch (e) { /* gone */ } }
        await this.ctx.storage.deleteAll();
    }
}
