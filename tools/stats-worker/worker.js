// Visit counter for florias-papadopoulos.github.io (a Cloudflare Worker with a D1 database bound as DB).
// It keeps daily totals only: no cookies, no IP addresses, nothing about any one visitor.
//   POST /hit    one page view, sent by the site: {"p": "/games/", "r": "google.com", "d": "phone", "b": "Firefox"}
//   GET  /stats  the totals of the ?days=7, 30 or 90 days up to yesterday (UTC), read by the site's /stats/ page. Today is
//                left out and anything under MIN views is grouped as "(other)", so no single visit can be read off it.
//   GET  /whoami the country this request would be counted under (for the /you/ page; nothing is stored)
// Two-player games (Kitty Kart Duo on /games/): the two devices pass each other one "how to reach me" message (WebRTC
// SDP, which holds their network addresses), then race directly. A room keeps them for at most ROOM_TTL, then is deleted.
//   POST /room               the host opens a room: {"offer": "v=0..."} -> {"code": "BDFG"} (503 when MAX_ROOMS are open)
//   GET  /room/BDFG          the friend reads the offer: {"offer": "v=0..."}, 404 when there is no such room (or it expired)
//   POST /room/BDFG          the friend answers: {"answer": "v=0..."}, 409 when the room already has an answer
//   GET  /room/BDFG/answer   the host waits: {"answer": "v=0..."} once it is there, and the room is deleted; 204 until then
//   POST /room/BDFG/close    the host gives up waiting: the room is deleted
// Every request first deletes the rooms older than ROOM_TTL (so does the scheduled handler, if a cron trigger is set).
//   GET  /turn               the ICE servers for a race: Cloudflare's STUN, plus short-lived TURN relay credentials when the
//                            secrets TURN_KEY_ID and TURN_KEY_API_TOKEN are set (Cloudflare Realtime TURN). The relay is
//                            only used when two devices cannot reach each other directly. At most TURN_DAY a day.
// Tables (schema.sql): counts(day, kind, key, n), kind is total, page, ref, device, browser or country (and turn: relay
//                      credentials handed out, not shown on /stats);
//                      rooms(code, offer, answer, at), at = when the room was opened (ms).
const SITE = 'https://florias-papadopoulos.github.io';
const BROWSERS = ['Firefox', 'Chrome', 'Safari', 'Edge', 'Opera', 'Other'];
const TOP = 40;   // /stats lists at most this many pages, referrers, countries... (keeps the answer small whatever is sent)
const MIN = 3;    // /stats groups pages, referrers, countries... with fewer views than this as "(other)"
const RANGES = [7, 30, 90];
/* The site's pages. Anything else that is sent (a page added later, or made up) is counted as "(other)", so nobody can
   put words on the public /stats/ page. Add new pages here. */
const PAGES = ['/', '/bachelor/', '/master/', '/papers/', '/games/', '/projects/', '/you/', '/stats/', '/privacy/', '/404/'];
const MAX_REFS = 50;      // distinct referring sites a day; later new ones are counted as "(other site)"
const DAY_CAP = 5000;     // page views counted a day; past it nothing is written, so fake hits cannot use up the database quota
const MAX_BODY = 1000;    // bytes; a real /hit body is under 100
const ROOM_TTL = 120000;  // ms a room lives at most
const MAX_ROOMS = 100;    // rooms open at once; past it new ones are refused
const MAX_SDP = 6000;     // bytes; an offer or answer with its network addresses is usually 1 to 3 KB
const LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';  // room codes: no vowels (so no words), no I or O to mix up with 1 or 0
const STUN = [{ urls: 'stun:stun.cloudflare.com:3478' }];
const TURN_TTL = 7200;    // s a relay credential lasts (a long evening of rematches is still one connection)
const TURN_DAY = 300;     // relay credentials handed out a day at most, so nobody can run up the relay bill with them

function headers(extra) {
    return Object.assign({ 'Access-Control-Allow-Origin': SITE, 'Vary': 'Origin' }, extra || {});
}

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: headers({ 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' }) });
        }
        try {
            if (url.pathname === '/room' || url.pathname.indexOf('/room/') === 0) return await room(req, url, env);
            if (url.pathname === '/turn' && req.method === 'GET') return await turn(req, env);
            /* old rooms go on every other request too, after the answer (and never in its way) */
            if (ctx && ctx.waitUntil) ctx.waitUntil(Promise.resolve().then(function () { return sweep(env); }).catch(function () {}));
            if (url.pathname === '/hit' && req.method === 'POST') return await hit(req, env);
            if (url.pathname === '/stats' && req.method === 'GET') return await stats(url, env);
            if (url.pathname === '/whoami' && req.method === 'GET') {
                return new Response(JSON.stringify({ country: (req.cf && req.cf.country) || 'XX' }),
                    { headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }) });
            }
        } catch (e) {
            return new Response('Error', { status: 500, headers: headers() });
        }
        return new Response('Not found', { status: 404, headers: headers() });
    },
    async scheduled(ev, env, ctx) { ctx.waitUntil(sweep(env)); }
};

/* ---------- rooms for two-player games ---------- */
function sweep(env) { return env.DB.prepare('DELETE FROM rooms WHERE at < ?1').bind(Date.now() - ROOM_TTL).run(); }

function reply(status, obj) {
    return new Response(obj ? JSON.stringify(obj) : null,
        { status: status, headers: headers(Object.assign({ 'Cache-Control': 'no-store' }, obj ? { 'Content-Type': 'application/json' } : {})) });
}

/* an offer or answer as the browser makes it: a string that starts like SDP, not too long */
function sdp(d, key) {
    const v = d && d[key];
    return typeof v === 'string' && v.slice(0, 3) === 'v=0' && v.length <= MAX_SDP ? v : null;
}

function newCode() {
    const b = new Uint8Array(12);
    crypto.getRandomValues(b);
    let c = '';
    for (let i = 0; i < b.length && c.length < 4; i++) if (b[i] < 240) c += LETTERS[b[i] % LETTERS.length];  /* 240 = 12 * 20: no letter favoured */
    return c.length === 4 ? c : null;
}

async function room(req, url, env) {
    if (req.headers.get('Origin') !== SITE) return reply(403);
    await sweep(env);
    const m = /^\/room(?:\/([A-Z]{4})(\/answer|\/close)?)?$/.exec(url.pathname);
    if (!m) return reply(404);
    const code = m[1], what = m[2], post = req.method === 'POST', get = req.method === 'GET';
    if (!code) {   /* POST /room: open one */
        if (!post) return reply(404);
        const offer = sdp(await body(req, MAX_SDP + 200), 'offer');
        if (!offer) return reply(400);
        const open = await env.DB.prepare('SELECT COUNT(*) AS n FROM rooms').first();
        if (open && open.n >= MAX_ROOMS) return reply(503);
        for (let tries = 0; tries < 6; tries++) {
            const c = newCode();
            if (!c) continue;
            const r = await env.DB.prepare('INSERT INTO rooms (code, offer, at) VALUES (?1, ?2, ?3) ON CONFLICT(code) DO NOTHING').bind(c, offer, Date.now()).run();
            if (r && r.meta && r.meta.changes === 1) return reply(200, { code: c });
        }
        return reply(503);
    }
    if (what === '/close') {
        if (!post) return reply(404);
        await env.DB.prepare('DELETE FROM rooms WHERE code = ?1').bind(code).run();
        return reply(204);
    }
    const row = await env.DB.prepare('SELECT offer, answer FROM rooms WHERE code = ?1').bind(code).first();
    if (what === '/answer') {   /* the host waiting for the answer */
        if (!get) return reply(404);
        if (!row) return reply(404);
        if (row.answer === null || row.answer === undefined) return reply(204);
        await env.DB.prepare('DELETE FROM rooms WHERE code = ?1').bind(code).run();
        return reply(200, { answer: row.answer });
    }
    if (get) return row ? reply(200, { offer: row.offer }) : reply(404);
    if (!post) return reply(404);
    const answer = sdp(await body(req, MAX_SDP + 200), 'answer');
    if (!answer) return reply(400);
    if (!row) return reply(404);
    if (row.answer !== null && row.answer !== undefined) return reply(409);
    const r = await env.DB.prepare('UPDATE rooms SET answer = ?2 WHERE code = ?1 AND answer IS NULL').bind(code, answer).run();
    return reply(r && r.meta && r.meta.changes === 1 ? 204 : 409);
}

/* The ICE servers for one race. Without the TURN secrets (or past TURN_DAY, or if Cloudflare does not answer) only
   STUN, and the two devices can still connect directly. URLs on port 53 are left out: browsers block that port, and a
   device would wait for it in vain. */
async function turn(req, env) {
    if (req.headers.get('Origin') !== SITE) return reply(403);
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return reply(200, { iceServers: STUN });
    const day = new Date().toISOString().slice(0, 10);
    const used = await env.DB.prepare("SELECT n FROM counts WHERE day = ?1 AND kind = 'turn' AND key = 'all'").bind(day).first();
    if (used && used.n >= TURN_DAY) return reply(200, { iceServers: STUN });
    try {
        const r = await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/' + env.TURN_KEY_ID + '/credentials/generate-ice-servers', {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + env.TURN_KEY_API_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ttl: TURN_TTL })
        });
        if (!r.ok) return reply(200, { iceServers: STUN });
        const d = await r.json();
        let list = d && d.iceServers;
        if (list && !Array.isArray(list)) list = [list];
        if (!list || !list.length) return reply(200, { iceServers: STUN });
        list = list.map(function (srv) {
            const urls = (Array.isArray(srv.urls) ? srv.urls : [srv.urls]).filter(function (u) { return typeof u === 'string' && !/:53(\?|$)/.test(u); });
            const out = { urls: urls };
            if (srv.username) { out.username = srv.username; out.credential = srv.credential; }
            return out;
        }).filter(function (srv) { return srv.urls.length; });
        await env.DB.prepare("INSERT INTO counts (day, kind, key, n) VALUES (?1, 'turn', 'all', 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1").bind(day).run();
        return reply(200, { iceServers: list });
    } catch (e) {
        return reply(200, { iceServers: STUN });
    }
}

async function hit(req, env) {
    const ua = req.headers.get('User-Agent') || '';
    /* only page views from the site itself, and no search engine robots */
    if (req.headers.get('Origin') !== SITE || /bot|crawl|spider|slurp|headless|preview|lighthouse/i.test(ua)) {
        return new Response(null, { status: 204, headers: headers() });
    }
    const d = await body(req, MAX_BODY);
    if (!d) return new Response(null, { status: 400, headers: headers() });
    /* a page is a short path of the site's own kind (/master/, /games/, /404/), a referrer a plain host name */
    const page = String(d.p || '');
    if (!/^\/[a-z0-9\-_\/]{0,80}$/i.test(page)) return new Response(null, { status: 400, headers: headers() });
    let ref = typeof d.r === 'string' && /^[a-z0-9.\-]{1,80}$/i.test(d.r) ? d.r.toLowerCase() : '(direct)';
    const device = d.d === 'phone' || d.d === 'tablet' ? d.d : 'desktop';
    const browser = BROWSERS.indexOf(d.b) >= 0 ? d.b : 'Other';
    const country = (req.cf && req.cf.country) || 'XX';   // worked out by Cloudflare; the IP address is never read here
    const day = new Date().toISOString().slice(0, 10);
    /* one read: today's views so far, how many referring sites today has, and whether this one is among them */
    const now = await env.DB.prepare("SELECT (SELECT n FROM counts WHERE day = ?1 AND kind = 'total' AND key = 'all') AS total, " +
        "(SELECT COUNT(*) FROM counts WHERE day = ?1 AND kind = 'ref') AS refs, " +
        "(SELECT COUNT(*) FROM counts WHERE day = ?1 AND kind = 'ref' AND key = ?2) AS known").bind(day, ref).first();
    if (now && now.total >= DAY_CAP) return new Response(null, { status: 204, headers: headers() });
    if (now && !now.known && now.refs >= MAX_REFS) ref = '(other site)';
    const add = env.DB.prepare('INSERT INTO counts (day, kind, key, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1');
    await env.DB.batch([['total', 'all'], ['page', PAGES.indexOf(page) >= 0 ? page : '(other)'], ['ref', ref], ['device', device], ['browser', browser], ['country', country]]
        .map(function (r) { return add.bind(day, r[0], r[1]); }));
    return new Response(null, { status: 204, headers: headers() });
}

/* The posted JSON object, or null when it is missing, malformed or longer than max bytes (checked before reading it
   when the browser says its length). */
async function body(req, max) {
    if (+(req.headers.get('Content-Length') || 0) > max) return null;
    try {
        const text = await req.text();
        const d = text.length <= max ? JSON.parse(text) : null;
        return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
    } catch (e) { return null; }
}

/* The answer only changes at midnight (UTC), so each running copy of the worker keeps it for 10 minutes. */
const memo = {};

async function stats(url, env) {
    const asked = parseInt(url.searchParams.get('days') || '30', 10);
    const days = RANGES.indexOf(asked) >= 0 ? asked : 30;
    const today = Date.parse(new Date().toISOString().slice(0, 10));
    const since = new Date(today - days * 864e5).toISOString().slice(0, 10);
    const until = new Date(today - 864e5).toISOString().slice(0, 10);
    const key = days + ' ' + until, hit = memo[key];
    let text = hit && Date.now() - hit.at < 6e5 ? hit.text : null;
    if (!text) {
        const out = { since: since, until: until, days: days, daily: {}, totals: {} };
        const daily = (await env.DB.prepare("SELECT day, n FROM counts WHERE kind = 'total' AND day BETWEEN ?1 AND ?2")
            .bind(since, until).all()).results;
        for (const r of daily) out.daily[r.day] = r.n;
        const rows = (await env.DB.prepare("SELECT kind, key, SUM(n) AS n FROM counts WHERE kind IN ('page', 'ref', 'device', 'browser', 'country') AND day BETWEEN ?1 AND ?2 " +
            "GROUP BY kind, key ORDER BY n DESC").bind(since, until).all()).results;
        for (const r of rows) {
            const t = out.totals[r.kind] || (out.totals[r.kind] = {});
            /* small numbers, the capped referrers and everything past the TOP are grouped */
            const k = r.n < MIN || r.key === '(other site)' || Object.keys(t).length >= TOP ? '(other)' : r.key;
            t[k] = (t[k] || 0) + r.n;
        }
        text = JSON.stringify(out);
        memo[key] = { at: Date.now(), text: text };
    }
    return new Response(text, { headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' }) });
}
