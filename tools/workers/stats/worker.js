// Visit counter for florias-papadopoulos.github.io (a Cloudflare Worker with a D1 database bound as DB).
// It keeps daily totals only: no cookies, no IP addresses, nothing about any one visitor.
//   POST /hit    one page view, sent by the site: {"p": "/games/", "r": "google.com", "d": "phone", "b": "Firefox"}
//   GET  /stats  the totals of the ?days=7, 30 or 90 days up to yesterday (UTC), read by the site's /stats/ page. Today is
//                left out and anything under MIN views is grouped as "(other)", so no single visit can be read off it.
//                Owner only: the request must carry "Authorization: Bearer <key>" with the key set as the Worker secret
//                STATS_KEY (Settings, Variables and Secrets, type Secret), at least 24 characters with lower case, upper case
//                and digits. Without such a secret nobody can read the totals.
//   GET  /whoami the country this request would be counted under (for the /you/ page; nothing is stored)
// Two-player games (Kitty Kart Duo on /games/): the two devices pass each other one "how to reach me" message (WebRTC
// SDP, which holds their network addresses), then race directly. A room keeps them for at most ROOM_TTL, then is deleted.
//   POST /room               the host opens a room: {"offer": "v=0...", "k": 1} -> {"code": "BDFG", "key": "..."} (503 when
//                            MAX_ROOMS are open or ROOM_CAP rooms were opened today). With "k": 1 the room gets a random
//                            host key, which only the host knows; pages from before the key (no "k") get a room without
//                            one, as before, and no "key" in the answer.
//   GET  /room/BDFG          the friend reads the offer: {"offer": "v=0..."}, 404 when there is no such room (or it expired)
//   POST /room/BDFG          the friend answers: {"answer": "v=0..."}, 409 when the room already has an answer
//   GET  /room/BDFG/answer   the host waits: {"answer": "v=0..."} once it is there, and the room is deleted; 204 until then.
//                            A room with a key needs "Authorization: Room <key>", else 403.
//   POST /room/BDFG/close    the host gives up waiting: the room is deleted. A room with a key needs the key, in the
//                            body {"key": "..."} (or the Authorization header as above), else 403. Never in the address.
// Old rooms are deleted at most once every SWEEP_EVERY per running copy of the worker, after a request (and by the
// scheduled handler, if a cron trigger is set); a room older than ROOM_TTL is never served, swept or not.
// Leaderboards (Games page): each game and difficulty (and Kitty Kart track) has a board; players add a score under a
// nickname they type. Only the nickname, the score and when are stored, never an IP address.
//   GET  /scores?g=long-cat&l=normal(&b=meadow)   {"all": [{"n": "Milo", "s": 420}, ...], "week": [...]}: the top 10,
//                one line per nickname, all time and since Monday (UTC); b must be one of the game's tracks (BOARDS)
//   POST /scores {"g": "long-cat", "l": "normal", "b": "", "n": "Milo", "s": 420}   adds a score, answers like GET;
//                400 for a bad game, track or score (outside the game's min and max), 422 {"error": "name"} for a nickname
//                that is not allowed, 503 past SCORE_CAP scores a day or BOARD_CAP on this board (reading still works)
//   GET  /scores/summary   {"boards": [{"b": "long-cat/normal", "p": 14, "top": [{"n": "Milo", "s": 420}, ...]}, ...]}: every
//                board that has scores, with its number of players (nicknames) and its all time top 3 (the Leaderboards
//                tab's overview)
// To remove a nickname: DELETE FROM scores WHERE name = 'Bad Name'; in the D1 console.
// Likes (Games page): every game has a like count (a paw print on its card); the cards of each tab are ordered by it.
// A browser remembers its own like (localStorage), the server only keeps the totals per game. The site only sends likes
// (1) and taking one back (0); the down count is kept for old dislikes (-1) from before the site dropped them.
//   GET  /likes                                 {"long-cat": {"u": 12, "d": 1}, ...}
//   POST /likes {"g": "long-cat", "f": 0, "t": 1}   moves one vote from f to t (1 like, -1 old dislike, 0 none), answers like GET;
//                400 for an unknown game or vote, 503 past LIKE_CAP changes a day; a like taken back past the day's
//                limit for that game (see mayRemove) is ignored and the totals come back unchanged
// Tables (schema.sql): counts(day, kind, key, n), kind is total, page, ref, device, browser, country (or scores: the
//                      scores added that day, for SCORE_CAP; board: per board, for BOARD_CAP; likes: the vote changes
//                      that day, for LIKE_CAP; like+ and like-: likes added and taken back per game; rooms: rooms opened,
//                      for ROOM_CAP);
//                      rooms(code, offer, answer, at, secret), at = when the room was opened (ms), secret = the host key;
//                      scores(id, board, name, score, week, at), board = game/level(/track), week = its Monday;
//                      likes(game, up, down).
//                      The worker itself adds what an older database lacks (the likes table, the rooms secret column and
//                      the index on rooms.at), once per running copy, so no D1 console step is needed.
const SITE = 'https://florias-papadopoulos.github.io';
const BROWSERS = ['Firefox', 'Chrome', 'Safari', 'Edge', 'Opera', 'Other'];
const TOP = 40;   // /stats lists at most this many pages, referrers, countries... (keeps the answer small whatever is sent)
const MIN = 3;    // /stats groups pages, referrers, countries... with fewer views than this as "(other)"
const RANGES = [7, 30, 90];
/* The site's pages. Anything else that is sent (a page added later, or made up) is counted as "(other)", so nobody can
   put words on the /stats/ page. Add new pages here. */
const PAGES = ['/', '/bachelor/', '/master/', '/papers/', '/phd/', '/phd/papers/', '/phd/projects/', '/phd/projects/satellites/', '/phd/projects/signal/', '/games/', '/projects/', '/you/', '/stats/', '/privacy/', '/404/'];
const MAX_REFS = 50;      // distinct referring sites a day; later new ones are counted as "(other site)"
const DAY_CAP = 5000;     // page views counted a day; past it nothing is written, so fake hits cannot use up the database quota
const MAX_BODY = 1000;    // bytes; a real /hit body is under 100
const ROOM_TTL = 120000;  // ms a room lives at most
const MAX_ROOMS = 100;    // rooms open at once; past it new ones are refused
const ROOM_CAP = 2000;    // rooms opened a day; past it new ones are refused (a real evening of races is a few dozen)
const SWEEP_EVERY = 30000;   // ms between two deletions of old rooms by one running copy of the worker
const MAX_SDP = 6000;     // bytes; an offer or answer with its network addresses is usually 1 to 3 KB
const LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';  // room codes: no vowels (so no words), no I or O to mix up with 1 or 0
const KK_TRACKS = ['meadow', 'city', 'reef', 'moon', 'volcano', 'trees', 'desert', 'sky', 'music', 'rainbow', 'zombie', 'room'];
/* Games with a leaderboard (a Map, so only these exact names count: "constructor" or "__proto__" are no game).
   lower = lower is better (a time or a number of moves); min and max = the lowest and highest score that can be real,
   one number or one per difficulty; dec = decimals allowed (else whole numbers); tracks = the sub-boards a score can go
   to (the ids the game passes to api.end as board, as in content/games/_index.md; a game with tracks needs one, a game
   without must send none); old = earlier sub-boards that can still be read but get no new scores. Two-player games have
   none. The caps come from each game's scoring code (2026-11-10): the exact best for games that end, about 2 to 3 times
   a very good run for endless ones. Higher is better games start at 1 (the site never sends a 0). */
const BOARDS = new Map([
    /* 22 x 26 cells at most; fish 1, gold fish 3, mouse 5 points for 1, 1 and 2 cells: at most 2.25 a cell, about 1280 */
    ['long-cat', { max: 1500 }],
    /* fixed length; a perfect simulated player gets about 500 / 550 / 1050 (an all gold, all x4 run, impossible, 3000) */
    ['whack-a-mouse', { max: { easy: 1200, normal: 1200, hard: 2500 } }],
    /* exact best: every flip a match at combo x5 and 20 per unused move: 2240 / 3360 / 6680 */
    ['paw-pairs', { max: { easy: 2300, normal: 3400, hard: 6700 } }],
    /* 1 per round won, the run ends at 3 lost; at most 3 or 4 wins a minute, easy can go on for long */
    ['four-in-a-row', { max: { easy: 500, normal: 300, hard: 100 } }],
    /* a win is 1 + the streak, a draw 1, the run ends at the first loss; about an hour of perfect play (hard: draws only) */
    ['tic-tac-paw', { max: { easy: 3000, normal: 1500, hard: 1000 } }],
    /* 6 levels: bricks, level bonuses and 100 per life left (9 at most): 6492 / 7272 / 8544 */
    ['brick-paw', { max: 10000 }],
    /* endless: about 75 / 135 / 200 points a second at full speed with every fish; a very good run is 15000 to 40000 */
    ['cucumber-hop', { max: 120000 }],
    /* endless: distance plus smashed glass, about 6 points a metre; a very good run is 3 to 5 km (20000 to 25000) */
    ['yarn-smash', { max: 100000 }],
    /* exact best: 3 per fish, 10 per room, 5 per life left: 158 / 190 / 185 */
    ['night-prowl', { max: 250 }],
    /* endless after 7 missions: a very good run (missions and 10 waves) is about 22000, an exceptional one 35000 */
    ['orbit-paws', { max: 100000 }],
    /* endless loops of 7 worlds, combo up to x8, bosses 140000 a loop: a very good run is 0.5 to 1.3 million, a
       perfect two loops 4 to 5 million */
    ['paw-raiders', { max: 5000000 }],
    /* endless waves: a very good run is 100000 to 150000 (wave 25 to 30); 500000 is past wave 45 */
    ['garden-defender', { max: 500000, tracks: ['tour'], old: ['lawn', 'patch', 'pond', 'orchard', 'court', 'night'] }],
    /* 10 levels, nothing comes back: eggs, berries, critters, rocks, level and life bonuses: 10735 / 9635 / 8835 */
    ['dino-valley', { max: 12000 }],
    /* 4 locks, base points plus 2 per second left, an instant solve gives 2430 / 1930 / 1690 */
    ['cipher-cat', { max: 2500 }],
    /* endless: about 90 a piece with every drop perfect; a very good run is 6000 to 9000, a 300 piece easy run 20000 */
    ['cat-tower', { max: 30000 }],
    /* endless: about 35 / 60 / 110 points a second at most; 30000 is about 8 minutes of expert play on hard */
    ['laser-chase', { max: 30000 }],
    /* moves: at least the shuffle's total distance, which the game keeps at n x n or more (9 / 16 / 25) */
    ['sliding-kitten', { lower: true, min: { easy: 9, normal: 16, hard: 25 }, max: 20000 }],
    /* seconds (with penalties); a lucky first tap can open the whole lawn, and the game sends at least 1 */
    ['mouse-sweeper', { lower: true, min: 1, max: 20000 }],
    /* race seconds, 3 laps: the shortest lap at top speed with boosts is about 12 s, so about 35 s for a race; a race
       has no time limit, but a very slow one only sits at the bottom */
    ['kitty-kart', { lower: true, min: 25, max: 3600, dec: 1, tracks: KK_TRACKS }],
    /* 6 / 8 / 10 rooms, 100 (150) each plus 3 per second left: at most about 2760 / 2780 / 3515 */
    ['crypto-heist', { max: 6000 }]
]);
const LEVELS = ['easy', 'normal', 'hard'];
/* Games that can be liked: all of the leaderboard ones and the two-player games */
const LIKES = new Set(Array.from(BOARDS.keys()).concat(['kitty-kart-duo', 'kitty-kart-split', 'tic-tac-paw-2p', 'four-in-a-row-2p']));
const LIKE_CAP = 3000;     // vote changes a day across all games; past it new ones are refused
const UNLIKE_SLACK = 3;    // likes a game may lose a day beyond the ones it got that day (see mayRemove)
const KEEP = 100;          // scores kept per board (all time), and again per board this week
const SCORE_CAP = 2000;    // scores added a day across all games; past it new ones are refused
const BOARD_CAP = 200;     // scores added a day to one board, so one board's spam cannot use up SCORE_CAP for all
/* Nicknames: 2 to 20 characters: Latin letters (with accents), digits, spaces and . _ ' -. Only Latin letters, so
   Cyrillic or Greek lookalikes (a Cyrillic "а" in "Florias") cannot slip past the words below; a letter counts when it
   reads as plain a to z (é is e, ß is ss), so fancy forms like small capitals do not pass either. Then none of the words
   below: SHORT ones as a whole word only (so Essex, Dickens, Skillful, Badminton, Nazir and Gamora are fine), LONG ones
   anywhere in the name. Checked after lower case, accents removed and the lookalike digits read as letters (b4d is
   bad), and again with digits as gaps (dick69). Words are split at spaces, . _ ' -, digits and a small letter followed
   by a capital (BigDick), and single letters in a row join up (s.e.x, S E X). */
const SHORT = new Set(['sex', 'sexy', 'dick', 'dicks', 'cock', 'cocks', 'kill', 'kys', 'fag', 'fags', 'nazi', 'nazis',
    'gamo', 'hure', 'puta', 'fuk', 'rape', 'cunt', 'cunts', 'cunty', 'kunt', 'cvnt', 'twat', 'twats', 'arsch', 'admin']);
const LONG = ['fuck', 'shit', 'bitch', 'pussy', 'penis', 'vagina', 'porn', 'hitler', 'nigg', 'faggot', 'retard', 'whore',
    'slut', 'wanker', 'wanka', 'dickhead', 'cocksuck', 'scheiss', 'fotze', 'hurensohn', 'wichs', 'arschloch',
    'schlampe', 'putain', 'merde', 'connard', 'salope', 'mierda', 'hijodeputa', 'cazzo', 'stronzo', 'vaffanculo', 'malaka',
    'gamoto', 'poutana', 'florias', 'moderator'];
const NAME_CH = 'A-Za-z0-9\\u00C0-\\u024F\\u1E00-\\u1EFF';   // Latin letters with accents (Latin-1, Extended A and B, Vietnamese)
const NAME_RE = new RegExp('^[' + NAME_CH + '][' + NAME_CH + ' ._\'-]{0,18}[' + NAME_CH + '.]$');
const LOOK = new Map([['0', 'o'], ['1', 'i'], ['3', 'e'], ['4', 'a'], ['5', 's'], ['7', 't'], ['8', 'b']]);
const FOLD = new Map([['ß', 'ss'], ['æ', 'ae'], ['œ', 'oe'], ['ø', 'o'], ['ł', 'l'], ['đ', 'd'], ['ð', 'd'], ['þ', 'th'],
    ['ı', 'i'], ['ħ', 'h'], ['ŧ', 't'], ['ŀ', 'l'], ['ĸ', 'k'], ['ŋ', 'n'], ['ƒ', 'f']]);

function headers(extra) {
    return Object.assign({ 'Access-Control-Allow-Origin': SITE, 'Vary': 'Origin' }, extra || {});
}

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);
        if (req.method === 'OPTIONS') {
            /* Max-Age: the browser asks again at most every 10 minutes, not before every request of the Duo host */
            return new Response(null, { headers: headers({ 'Access-Control-Allow-Methods': 'GET, POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '600' }) });
        }
        /* old rooms go after the answer (and never in its way), at most once every SWEEP_EVERY */
        if (ctx && ctx.waitUntil) ctx.waitUntil(sweep(env).catch(function () {}));
        try {
            if (url.pathname === '/room' || url.pathname.indexOf('/room/') === 0) return await room(req, url, env);
            if (url.pathname === '/hit' && req.method === 'POST') return await hit(req, env);
            if (url.pathname === '/stats' && req.method === 'GET') return owner(req, env) ? await stats(url, env) : reply(401);
            if (url.pathname === '/scores/summary' && req.method === 'GET') return await summary(env);
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
    async scheduled(ev, env, ctx) { ctx.waitUntil(sweep(env, true)); }
};

function today() { return new Date().toISOString().slice(0, 10); }

/* ---------- rooms for two-player games ---------- */
/* Once per running copy: the rooms table, its secret column (added to a database from before the host key) and the
   index on at, which keeps the sweep and the open room count cheap. */
/* (A flag, not a shared promise: a running copy must not wait for a promise of another request. Two requests may both
   run the setup at the start; every step is safe to repeat.) */
let roomsReady = false;
async function roomsSetup(env) {
    if (roomsReady) return;
    const db = env.DB, has = function () { return db.prepare('SELECT secret FROM rooms LIMIT 1').all(); };
    await db.prepare('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, offer TEXT NOT NULL, answer TEXT, at INTEGER NOT NULL, secret TEXT)').run();
    try { await has(); } catch (e) {
        /* no secret column yet; if adding it fails, another request may just have added it: check once more */
        try { await db.prepare('ALTER TABLE rooms ADD COLUMN secret TEXT').run(); } catch (e2) { await has(); }
    }
    await db.prepare('CREATE INDEX IF NOT EXISTS rooms_at ON rooms (at)').run();
    roomsReady = true;
}
let swept = 0;   // when this running copy last deleted old rooms (ms)
async function sweep(env, force) {
    const now = Date.now();
    if (!force && now - swept < SWEEP_EVERY) return;
    swept = now;
    await roomsSetup(env);
    await env.DB.prepare('DELETE FROM rooms WHERE at < ?1').bind(now - ROOM_TTL).run();
}

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
/* the host key: 16 random bytes (CSPRNG), base64url, 22 characters */
function newKey() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return btoa(String.fromCharCode.apply(null, b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/* the key a request carries: "Authorization: Room <key>", or {"key": "..."} in its body */
function keyOf(req, d) {
    const m = /^Room ([A-Za-z0-9_-]{16,64})$/.exec(req.headers.get('Authorization') || '');
    if (m) return m[1];
    return d && typeof d.key === 'string' && d.key.length <= 64 ? d.key : null;
}
/* a room from a page without the key (secret null) opens for anyone, as before; any other needs the same key */
function keyOk(secret, given) {
    if (secret === null || secret === undefined) return true;
    return typeof given === 'string' && same(given, secret);
}

async function room(req, url, env) {
    if (req.headers.get('Origin') !== SITE) return reply(403);
    const m = /^\/room(?:\/([A-Z]{4})(\/answer|\/close)?)?$/.exec(url.pathname);
    if (!m) return reply(404);
    await roomsSetup(env);
    const code = m[1], what = m[2], post = req.method === 'POST', get = req.method === 'GET';
    const now = Date.now(), fresh = now - ROOM_TTL;   /* rooms opened before fresh are gone, swept or not */
    if (!code) {   /* POST /room: open one */
        if (!post) return reply(404);
        const d = await body(req, MAX_SDP + 200), offer = sdp(d, 'offer');
        if (!offer) return reply(400);
        const day = today();
        const n = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM rooms WHERE at >= ?1) AS open, " +
            "(SELECT n FROM counts WHERE day = ?2 AND kind = 'rooms' AND key = 'all') AS opened").bind(fresh, day).first();
        if (n && (n.open >= MAX_ROOMS || n.opened >= ROOM_CAP)) return reply(503);
        const key = d.k === 1 ? newKey() : null;
        for (let tries = 0; tries < 6; tries++) {
            const c = newCode();
            if (!c) continue;
            /* a code still taken by an expired room that was not swept yet is reused */
            const r = await env.DB.prepare('INSERT INTO rooms (code, offer, answer, at, secret) VALUES (?1, ?2, NULL, ?3, ?4) ' +
                'ON CONFLICT(code) DO UPDATE SET offer = excluded.offer, answer = NULL, at = excluded.at, secret = excluded.secret WHERE rooms.at < ?5')
                .bind(c, offer, now, key, fresh).run();
            if (r && r.meta && r.meta.changes === 1) {
                await env.DB.prepare("INSERT INTO counts (day, kind, key, n) VALUES (?1, 'rooms', 'all', 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1").bind(day).run();
                return reply(200, key ? { code: c, key: key } : { code: c });
            }
        }
        return reply(503);
    }
    if (what === '/close') {
        if (!post) return reply(404);
        const d = await body(req, 400);
        const row = await env.DB.prepare('SELECT secret FROM rooms WHERE code = ?1 AND at >= ?2').bind(code, fresh).first();
        if (!row) return reply(204);
        if (!keyOk(row.secret, keyOf(req, d))) return reply(403);
        await env.DB.prepare('DELETE FROM rooms WHERE code = ?1').bind(code).run();
        return reply(204);
    }
    const row = await env.DB.prepare('SELECT offer, answer, secret FROM rooms WHERE code = ?1 AND at >= ?2').bind(code, fresh).first();
    if (what === '/answer') {   /* the host waiting for the answer */
        if (!get) return reply(404);
        if (!row) return reply(404);
        if (!keyOk(row.secret, keyOf(req, null))) return reply(403);
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
    const r = await env.DB.prepare('UPDATE rooms SET answer = ?2 WHERE code = ?1 AND answer IS NULL AND at >= ?3').bind(code, answer, fresh).run();
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
    const day = today();
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

/* The posted JSON object, or null when it is missing, malformed or longer than max bytes. A stated length is checked
   first; the body itself is read piece by piece and given up as soon as it passes max, so a long body without a
   stated length (chunked) is never read whole. */
async function body(req, max) {
    if (+(req.headers.get('Content-Length') || 0) > max) return null;
    try {
        const text = await readText(req, max);
        const d = text === null ? null : JSON.parse(text);
        return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
    } catch (e) { return null; }
}
async function readText(req, max) {
    if (!req.body) return '';
    const reader = req.body.getReader(), parts = [];
    let n = 0;
    for (;;) {
        const r = await reader.read();
        if (r.done) break;
        n += r.value.byteLength;
        if (n > max) { try { reader.cancel().catch(function () {}); } catch (e) { /* already closed */ } return null; }
        parts.push(r.value);
    }
    const all = new Uint8Array(n);
    let at = 0;
    for (const p of parts) { all.set(p, at); at += p.byteLength; }
    return new TextDecoder().decode(all);
}

/* Two strings compared in constant time (for keys), so their letters cannot be guessed from how long the answer takes. */
function same(x, y) {
    const enc = new TextEncoder(), a = enc.encode(x), b = enc.encode(y);
    if (crypto.subtle && crypto.subtle.timingSafeEqual) return a.length === b.length && crypto.subtle.timingSafeEqual(a, b);
    let d = a.length ^ b.length;
    for (let i = 0; i < Math.min(a.length, b.length); i++) d |= a[i] ^ b[i];
    return d === 0;
}
/* Is this the owner? The key in the Authorization header must equal the STATS_KEY secret. A weak secret (under 24
   characters, or without lower case, upper case and digits) opens nothing, so a short key set by mistake keeps the
   totals locked. */
function strong(k) { return typeof k === 'string' && k.length >= 24 && /[a-z]/.test(k) && /[A-Z]/.test(k) && /[0-9]/.test(k); }
function owner(req, env) {
    const want = env.STATS_KEY, m = /^Bearer (.{24,200})$/.exec(req.headers.get('Authorization') || '');
    if (!strong(want) || !m) return false;
    return same(m[1], want);
}

/* The answer only changes at midnight (UTC), so each running copy of the worker keeps it for 10 minutes. */
const memo = new Map();

async function stats(url, env) {
    const asked = parseInt(url.searchParams.get('days') || '30', 10);
    const days = RANGES.indexOf(asked) >= 0 ? asked : 30;
    const todayMs = Date.parse(today());
    const since = new Date(todayMs - days * 864e5).toISOString().slice(0, 10);
    const until = new Date(todayMs - 864e5).toISOString().slice(0, 10);
    const key = days + ' ' + until, hit = memo.get(key);
    let text = hit && Date.now() - hit.at < 6e5 ? hit.text : null;
    if (!text) {
        const out = { since: since, until: until, days: days, daily: {}, totals: {} };
        const daily = (await env.DB.prepare("SELECT day, n FROM counts WHERE kind = 'total' AND day BETWEEN ?1 AND ?2")
            .bind(since, until).all()).results;
        for (const r of daily) out.daily[r.day] = r.n;
        const rows = (await env.DB.prepare("SELECT kind, key, SUM(n) AS n FROM counts WHERE kind IN ('page', 'ref', 'device', 'browser', 'country') AND day BETWEEN ?1 AND ?2 " +
            "GROUP BY kind, key ORDER BY n DESC").bind(since, until).all()).results;
        const totals = new Map();
        for (const r of rows) {
            const t = totals.get(r.kind) || new Map();
            totals.set(r.kind, t);
            /* small numbers, the capped referrers and everything past the TOP are grouped */
            const k = r.n < MIN || r.key === '(other site)' || t.size >= TOP ? '(other)' : r.key;
            t.set(k, (t.get(k) || 0) + r.n);
        }
        totals.forEach(function (t, kind) { out.totals[kind] = Object.fromEntries(t); });
        text = JSON.stringify(out);
        memo.forEach(function (v, k) { if (k.slice(-10) !== until) memo.delete(k); });   /* yesterday's answers go */
        memo.set(key, { at: Date.now(), text: text });
    }
    return new Response(text, { headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }) });
}

/* ---------- leaderboards ---------- */
function json(status, obj, cache) {
    return new Response(obj === undefined ? null : JSON.stringify(obj), { status: status,
        headers: headers({ 'Content-Type': 'application/json', 'Cache-Control': cache || 'no-store' }) });
}
function monday() {
    const d = new Date(Date.parse(today()));
    return new Date(d - ((d.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
}
/* one character as plain a to z letters (é is e, ß is ss), or null when it is not a Latin letter */
function fold(c) {
    const l = c.toLowerCase();
    if (/^[a-z]$/.test(l)) return l;
    if (FOLD.has(l)) return FOLD.get(l);
    const d = l.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return /^[a-z]+$/.test(d) ? d : null;
}
/* the words of a name, in plain a to z; digits: the lookalike digits read as letters (else every digit is a gap) */
function words(n, digits) {
    const s = n.replace(/([a-zß-ÿ])([A-ZÀ-Þ])/g, '$1 $2');   /* BigDick: Big Dick */
    let out = '';
    for (const c of s) {
        if (/[0-9]/.test(c)) out += digits && LOOK.has(c) ? LOOK.get(c) : ' ';
        else { const f = fold(c); out += f === null ? ' ' : f; }
    }
    const res = [];
    let run = '';   /* single letters in a row (s.e.x) make one word */
    out.split(' ').forEach(function (w) {
        if (!w) return;
        if (w.length === 1) { run += w; return; }
        if (run) res.push(run);
        run = '';
        res.push(w);
    });
    if (run) res.push(run);
    return res;
}
function nameOk(raw) {
    if (typeof raw !== 'string') return false;
    const n = raw.normalize('NFC');
    if (!NAME_RE.test(n) || /  /.test(n) || /[×÷]/.test(n)) return false;
    for (const c of n) if (!/[0-9 ._'-]/.test(c) && fold(c) === null) return false;
    return [true, false].every(function (digits) {
        const ws = words(n, digits), flat = ws.join('');
        return !ws.some(function (w) { return SHORT.has(w); }) && !LONG.some(function (w) { return flat.indexOf(w) >= 0; });
    });
}
/* a min or max: one number for every difficulty, or one per difficulty */
function bound(v, level, dflt) {
    if (typeof v === 'number') return v;
    if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, level) && typeof v[level] === 'number') return v[level];
    return dflt;
}
/* The board a request names: {name, game, level, lower}, or null for an unknown game, difficulty or track. post: a
   track that only exists for reading (old) does not count. */
function boardOf(d, post) {
    const game = typeof d.g === 'string' ? BOARDS.get(d.g) : undefined;
    const level = typeof d.l === 'string' && LEVELS.indexOf(d.l) >= 0 ? d.l : null;
    const track = d.b === null || d.b === undefined || d.b === '' ? '' : typeof d.b === 'string' ? d.b : null;
    if (!game || !level || track === null) return null;
    if (game.tracks) {
        if (game.tracks.indexOf(track) < 0 && (post || !game.old || game.old.indexOf(track) < 0)) return null;
    } else if (track) return null;
    return { name: d.g + '/' + level + (track ? '/' + track : ''), game: game, level: level, lower: !!game.lower };
}
/* a score that can be real on this board: a number between the game's min and max, with no more decimals than allowed */
function scoreOk(b, s) {
    const g = b.game, dec = Math.pow(10, g.dec || 0);
    return typeof s === 'number' && isFinite(s) && s >= bound(g.min, b.level, 1) && s <= bound(g.max, b.level, 1e7) &&
        Math.abs(Math.round(s * dec) - s * dec) <= 1e-6;
}
async function top(env, board, lower, week) {
    const best = lower ? 'MIN' : 'MAX';
    const st = env.DB.prepare('SELECT name, ' + best + '(score) AS s, MIN(at) AS at FROM scores WHERE board = ?1' +
        (week ? ' AND week = ?2' : '') + ' GROUP BY LOWER(name) ORDER BY s ' + (lower ? 'ASC' : 'DESC') + ', at ASC LIMIT 10');
    const rows = (await (week ? st.bind(board, week) : st.bind(board)).all()).results;
    return rows.map(function (r) { return { n: r.name, s: r.s }; });
}
/* GET /scores answers are kept 15 seconds per board by each running copy (as long as browsers may keep them), so
   asking again and again costs no database reads; a score added through this copy refreshes its board at once. */
const boardMemo = new Map();
async function scores(req, url, env) {
    const post = req.method === 'POST';
    if (!post && req.method !== 'GET') return json(404);
    let d;
    if (post) {
        if (req.headers.get('Origin') !== SITE) return json(403);
        d = await body(req, MAX_BODY);
        if (!d) return json(400);
    } else d = { g: url.searchParams.get('g'), l: url.searchParams.get('l'), b: url.searchParams.get('b') };
    const b = boardOf(d, post);
    if (!b) return json(400);
    const board = b.name, lower = b.lower, week = monday();
    if (post) {
        const name = typeof d.n === 'string' ? d.n.trim().normalize('NFC') : '';
        const sc = d.s;
        if (!scoreOk(b, sc)) return json(400);
        if (!nameOk(name)) return json(422, { error: 'name' });
        const day = today();
        const used = await env.DB.prepare("SELECT (SELECT n FROM counts WHERE day = ?1 AND kind = 'scores' AND key = 'all') AS total, " +
            "(SELECT n FROM counts WHERE day = ?1 AND kind = 'board' AND key = ?2) AS board").bind(day, board).first();
        if (used && (used.total >= SCORE_CAP || used.board >= BOARD_CAP)) return json(503);
        const order = 'ORDER BY score ' + (lower ? 'ASC' : 'DESC') + ', at ASC';
        const count = env.DB.prepare("INSERT INTO counts (day, kind, key, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1");
        await env.DB.batch([
            env.DB.prepare('INSERT INTO scores (board, name, score, week, at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(board, name, sc, week, Date.now()),
            count.bind(day, 'scores', 'all'),
            count.bind(day, 'board', board),
            /* one nickname keeps only its best score, and its best of this week */
            env.DB.prepare('DELETE FROM scores WHERE board = ?1 AND LOWER(name) = LOWER(?2) AND id NOT IN (SELECT id FROM scores WHERE board = ?1 AND LOWER(name) = LOWER(?2) ' + order + ' LIMIT 1) ' +
                'AND id NOT IN (SELECT id FROM scores WHERE board = ?1 AND LOWER(name) = LOWER(?2) AND week = ?3 ' + order + ' LIMIT 1)').bind(board, name, week),
            /* and a board keeps its KEEP best of all time and of this week */
            env.DB.prepare('DELETE FROM scores WHERE board = ?1 AND id NOT IN (SELECT id FROM scores WHERE board = ?1 ' + order + ' LIMIT ?3) ' +
                'AND id NOT IN (SELECT id FROM scores WHERE board = ?1 AND week = ?2 ' + order + ' LIMIT ?3)').bind(board, week, KEEP)
        ]);
    }
    const key = board + ' ' + week, hit = boardMemo.get(key);
    let out = !post && hit && Date.now() - hit.at < 15000 ? hit.d : null;
    if (!out) {
        out = { all: await top(env, board, lower), week: await top(env, board, lower, week) };
        boardMemo.set(key, { at: Date.now(), d: out });
    }
    return json(200, out, post ? 'no-store' : 'public, max-age=15');
}

/* The overview of all boards: each running copy of the worker keeps it for 30 seconds. Boards and nicknames are Map
   keys, so a nickname such as "constructor" or "__proto__" is counted like any other. */
let summaryMemo = null;
async function summary(env) {
    if (summaryMemo && Date.now() - summaryMemo.at < 30000) return json(200, summaryMemo.d, 'public, max-age=30');
    const rows = (await env.DB.prepare('SELECT board, name, score, at FROM scores').all()).results || [];
    const by = new Map();
    for (const r of rows) {
        const game = BOARDS.get(String(r.board).split('/')[0]);
        if (!game) continue;
        const lower = !!game.lower, k = String(r.name).toLowerCase();
        let b = by.get(r.board);
        if (!b) { b = { lower: lower, best: new Map() }; by.set(r.board, b); }
        const cur = b.best.get(k);
        /* one line per nickname: its best score, the earlier one on a tie */
        if (!cur || (lower ? r.score < cur.s : r.score > cur.s) || (r.score === cur.s && r.at < cur.at)) b.best.set(k, { n: r.name, s: r.score, at: r.at });
    }
    const d = { boards: Array.from(by.keys()).map(function (board) {
        const b = by.get(board), list = Array.from(b.best.values());
        list.sort(function (x, y) { return (b.lower ? x.s - y.s : y.s - x.s) || x.at - y.at; });
        return { b: board, p: list.length, top: list.slice(0, 3).map(function (r) { return { n: r.n, s: r.s }; }) };
    }) };
    summaryMemo = { at: Date.now(), d: d };
    return json(200, d, 'public, max-age=30');
}

/* ---------- likes of the games ---------- */
/* Without accounts a script can always send "take my like back", so these are limited: a game may lose on one day only
   the likes it got that day plus UNLIKE_SLACK. A script that likes and unlikes in turn gets nowhere, and one that only
   unlikes can take at most UNLIKE_SLACK a day off a game. The price: on a day when more visitors take back a like they
   gave on an earlier day than the slack allows, those take-backs are ignored (their browser shows the like gone, the
   total keeps it). On a site of this size that is rare, and the total is then too high by a few, never too low. */
function mayRemove(added, removed) { return (removed || 0) < (added || 0) + UNLIKE_SLACK; }
let likesTable = false;   // the likes table is made once per worker instance, so no D1 console step is needed
async function likesAll(env) {
    const rows = await env.DB.prepare('SELECT game, up, down FROM likes').all();
    const out = {};
    (rows.results || []).forEach(function (r) { if (LIKES.has(r.game)) out[r.game] = { u: r.up, d: r.down }; });
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
        if (!d || typeof d.g !== 'string' || !LIKES.has(d.g) || !ok(d.f) || !ok(d.t) || d.f === d.t) return json(400);
        const day = today();
        const used = await env.DB.prepare("SELECT (SELECT n FROM counts WHERE day = ?1 AND kind = 'likes' AND key = 'all') AS total, " +
            "(SELECT n FROM counts WHERE day = ?1 AND kind = 'like+' AND key = ?2) AS added, " +
            "(SELECT n FROM counts WHERE day = ?1 AND kind = 'like-' AND key = ?2) AS removed").bind(day, d.g).first() || {};
        if (used.total >= LIKE_CAP) return json(503);
        const du = (d.t === 1 ? 1 : 0) - (d.f === 1 ? 1 : 0), dd = (d.t === -1 ? 1 : 0) - (d.f === -1 ? 1 : 0);
        if (du < 0 && !mayRemove(used.added, used.removed)) return json(200, await likesAll(env), 'no-store');   /* ignored */
        const count = env.DB.prepare("INSERT INTO counts (day, kind, key, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + 1");
        const writes = [
            env.DB.prepare('INSERT INTO likes (game, up, down) VALUES (?1, MAX(?2, 0), MAX(?3, 0)) ON CONFLICT(game) DO UPDATE SET up = MAX(up + ?2, 0), down = MAX(down + ?3, 0)').bind(d.g, du, dd),
            count.bind(day, 'likes', 'all')
        ];
        if (du !== 0) writes.push(count.bind(day, du > 0 ? 'like+' : 'like-', d.g));
        await env.DB.batch(writes);
    }
    return json(200, await likesAll(env), post ? 'no-store' : 'public, max-age=15');
}
