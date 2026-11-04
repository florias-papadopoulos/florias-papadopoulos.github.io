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
// Leaderboards (Games page): each game and difficulty (and Kitty Kart track) has a board; players add a score under a
// nickname they type. Only the nickname, the score and when are stored, never an IP address.
//   GET  /scores?g=long-cat&l=normal(&b=meadow)   {"all": [{"n": "Milo", "s": 420}, ...], "week": [...]}: the top 10,
//                one line per nickname, all time and since Monday (UTC)
//   POST /scores {"g": "long-cat", "l": "normal", "b": "", "n": "Milo", "s": 420}   adds a score, answers like GET;
//                400 for a bad game or score, 422 {"error": "name"} for a nickname that is not allowed
// To remove a nickname: DELETE FROM scores WHERE name = 'Bad Name'; in the D1 console.
// Likes (Games page): every game has a thumbs up and a thumbs down count, shown on its card; the cards of each tab are
// ordered by them. A browser remembers its own vote (localStorage), the server only keeps the two totals per game.
//   GET  /likes                                 {"long-cat": {"u": 12, "d": 1}, ...}
//   POST /likes {"g": "long-cat", "f": 0, "t": 1}   moves one vote from f to t (1 up, -1 down, 0 none), answers like GET;
//                400 for an unknown game or vote, 503 past LIKE_CAP changes a day
// Tables (schema.sql): counts(day, kind, key, n), kind is total, page, ref, device, browser, country (or scores: the
//                      scores added that day, for SCORE_CAP; likes: the vote changes that day, for LIKE_CAP);
//                      rooms(code, offer, answer, at), at = when the room was opened (ms);
//                      scores(id, board, name, score, week, at), board = game/level(/track), week = its Monday;
//                      likes(game, up, down), made by the worker itself when it is missing.
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
/* Games with a leaderboard: lower = lower is better (a time or a number of moves), max = the highest score that can be
   real, dec = decimals allowed (else whole numbers). Two-player games have none. */
const BOARDS = {
    'long-cat': {}, 'whack-a-mouse': {}, 'paw-pairs': {}, 'four-in-a-row': {}, 'tic-tac-paw': {}, 'brick-paw': {},
    'cucumber-hop': {}, 'yarn-smash': {}, 'night-prowl': {}, 'orbit-paws': {}, 'paw-raiders': {}, 'garden-defender': {},
    'dino-valley': {}, 'cipher-cat': { max: 2500 }, 'cat-tower': { max: 20000 }, 'laser-chase': { max: 30000 },
    'sliding-kitten': { lower: true, min: 1 }, 'mouse-sweeper': { lower: true, min: 1 },
    'kitty-kart': { lower: true, min: 10, max: 3600, dec: 1 }
};
const LEVELS = ['easy', 'normal', 'hard'];
/* Games that can be liked: all of the leaderboard ones and the two-player games */
const LIKES = Object.keys(BOARDS).concat(['kitty-kart-duo', 'kitty-kart-split', 'tic-tac-paw-2p', 'four-in-a-row-2p']);
const LIKE_CAP = 3000;     // vote changes a day across all games; past it new ones are refused
const KEEP = 100;          // scores kept per board (all time), and again per board this week
const SCORE_CAP = 2000;    // scores added a day across all games; past it new ones are refused
/* Nicknames: 2 to 12 letters, digits, spaces and . _ ' -, and none of these words inside (checked after lower case,
   digits read as letters, and everything but letters removed, so "B.a.d" and "b4d" count too). */
const BAD = ['fuck', 'fuk', 'shit', 'cunt', 'bitch', 'dick', 'cock', 'pussy', 'penis', 'vagina', 'porn', 'sex', 'nazi',
    'hitler', 'nigg', 'nigga', 'fag', 'retard', 'whore', 'slut', 'rape', 'kill', 'kys', 'scheiss', 'fotze', 'hure', 'wichs',
    'arsch', 'schlampe', 'putain', 'merde', 'connard', 'salope', 'puta', 'mierda', 'cazzo', 'stronzo', 'vaffanculo',
    'malaka', 'gamo', 'poutana', 'admin', 'florias', 'moderator'];

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
            /* old rooms go on every other request too, after the answer (and never in its way) */
            if (ctx && ctx.waitUntil) ctx.waitUntil(Promise.resolve().then(function () { return sweep(env); }).catch(function () {}));
            if (url.pathname === '/hit' && req.method === 'POST') return await hit(req, env);
            if (url.pathname === '/stats' && req.method === 'GET') return await stats(url, env);
            if (url.pathname === '/scores') return await scores(req, url, env);
            if (url.pathname === '/likes') return await likes(req, env);
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

/* ---------- leaderboards ---------- */
function json(status, obj, cache) {
    return new Response(obj === undefined ? null : JSON.stringify(obj), { status: status,
        headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': cache || 'no-store' }) });
}
function monday() {
    const d = new Date(Date.parse(new Date().toISOString().slice(0, 10)));
    return new Date(d - ((d.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
}
function nameOk(n) {
    if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'-]{0,10}[\p{L}\p{N}.]$/u.test(n) || /  /.test(n)) return false;
    const flat = n.toLowerCase().replace(/[0134578@$]/g, function (c) { return { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' }[c]; })
        .normalize('NFD').replace(/[^a-z]/g, '');
    return !BAD.some(function (w) { return flat.indexOf(w) >= 0; });
}
async function top(env, board, lower, week) {
    const best = lower ? 'MIN' : 'MAX';
    const st = env.DB.prepare('SELECT name, ' + best + '(score) AS s, MIN(at) AS at FROM scores WHERE board = ?1' +
        (week ? ' AND week = ?2' : '') + ' GROUP BY LOWER(name) ORDER BY s ' + (lower ? 'ASC' : 'DESC') + ', at ASC LIMIT 10');
    const rows = (await (week ? st.bind(board, week) : st.bind(board)).all()).results;
    return rows.map(function (r) { return { n: r.name, s: r.s }; });
}
async function scores(req, url, env) {
    const post = req.method === 'POST';
    if (!post && req.method !== 'GET') return json(404);
    let d;
    if (post) {
        if (req.headers.get('Origin') !== SITE) return json(403);
        d = await body(req, MAX_BODY);
        if (!d) return json(400);
    } else d = { g: url.searchParams.get('g'), l: url.searchParams.get('l'), b: url.searchParams.get('b') };
    const game = BOARDS[d.g], level = LEVELS.indexOf(d.l) >= 0 ? d.l : null;
    const track = d.b == null || d.b === '' ? '' : String(d.b);
    if (!game || !level || (track && !/^[a-z]{2,16}$/.test(track))) return json(400);
    const board = d.g + '/' + level + (track ? '/' + track : ''), lower = !!game.lower, week = monday();
    if (post) {
        const name = typeof d.n === 'string' ? d.n.trim() : '';
        const sc = d.s, dec = Math.pow(10, game.dec || 0);
        if (typeof sc !== 'number' || !isFinite(sc) || sc < (game.min || 1) || sc > (game.max || 1e7) || Math.abs(Math.round(sc * dec) - sc * dec) > 1e-6) return json(400);
        if (!nameOk(name)) return json(422, { error: 'name' });
        const day = new Date().toISOString().slice(0, 10);
        const used = await env.DB.prepare("SELECT n FROM counts WHERE day = ?1 AND kind = 'scores' AND key = 'all'").bind(day).first();
        if (used && used.n >= SCORE_CAP) return json(503);
        const order = 'ORDER BY score ' + (lower ? 'ASC' : 'DESC') + ', at ASC';
        await env.DB.batch([
            env.DB.prepare('INSERT INTO scores (board, name, score, week, at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(board, name, sc, week, Date.now()),
            env.DB.prepare("INSERT INTO counts (day, kind, key, n) VALUES (?1, 'scores', 'all', 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1").bind(day),
            /* one nickname keeps only its best score, and its best of this week */
            env.DB.prepare('DELETE FROM scores WHERE board = ?1 AND LOWER(name) = LOWER(?2) AND id NOT IN (SELECT id FROM scores WHERE board = ?1 AND LOWER(name) = LOWER(?2) ' + order + ' LIMIT 1) ' +
                'AND id NOT IN (SELECT id FROM scores WHERE board = ?1 AND LOWER(name) = LOWER(?2) AND week = ?3 ' + order + ' LIMIT 1)').bind(board, name, week),
            /* and a board keeps its KEEP best of all time and of this week */
            env.DB.prepare('DELETE FROM scores WHERE board = ?1 AND id NOT IN (SELECT id FROM scores WHERE board = ?1 ' + order + ' LIMIT ?3) ' +
                'AND id NOT IN (SELECT id FROM scores WHERE board = ?1 AND week = ?2 ' + order + ' LIMIT ?3)').bind(board, week, KEEP)
        ]);
    }
    return json(200, { all: await top(env, board, lower), week: await top(env, board, lower, week) }, post ? 'no-store' : 'public, max-age=15');
}

/* ---------- likes of the games ---------- */
let likesTable = false;   // the likes table is made once per worker instance, so no D1 console step is needed
async function likesAll(env) {
    const rows = await env.DB.prepare('SELECT game, up, down FROM likes').all();
    const out = {};
    (rows.results || []).forEach(function (r) { if (LIKES.indexOf(r.game) >= 0) out[r.game] = { u: r.up, d: r.down }; });
    return out;
}
async function likes(req, env) {
    const post = req.method === 'POST';
    if (!post && req.method !== 'GET') return json(404);
    if (!likesTable) {
        await env.DB.prepare('CREATE TABLE IF NOT EXISTS likes (game TEXT PRIMARY KEY, up INTEGER NOT NULL DEFAULT 0, down INTEGER NOT NULL DEFAULT 0)').run();
        likesTable = true;
    }
    if (post) {
        if (req.headers.get('Origin') !== SITE) return json(403);
        const d = await body(req, MAX_BODY);
        const ok = function (v) { return v === 1 || v === -1 || v === 0; };
        if (!d || LIKES.indexOf(d.g) < 0 || !ok(d.f) || !ok(d.t) || d.f === d.t) return json(400);
        const day = new Date().toISOString().slice(0, 10);
        const used = await env.DB.prepare("SELECT n FROM counts WHERE day = ?1 AND kind = 'likes' AND key = 'all'").bind(day).first();
        if (used && used.n >= LIKE_CAP) return json(503);
        const du = (d.t === 1 ? 1 : 0) - (d.f === 1 ? 1 : 0), dd = (d.t === -1 ? 1 : 0) - (d.f === -1 ? 1 : 0);
        await env.DB.batch([
            env.DB.prepare('INSERT INTO likes (game, up, down) VALUES (?1, MAX(?2, 0), MAX(?3, 0)) ON CONFLICT(game) DO UPDATE SET up = MAX(up + ?2, 0), down = MAX(down + ?3, 0)').bind(d.g, du, dd),
            env.DB.prepare("INSERT INTO counts (day, kind, key, n) VALUES (?1, 'likes', 'all', 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1").bind(day)
        ]);
    }
    return json(200, await likesAll(env), post ? 'no-store' : 'public, max-age=15');
}
