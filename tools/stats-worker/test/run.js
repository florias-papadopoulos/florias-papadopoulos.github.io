/* Tests of the visit counter worker: node tools/stats-worker/test/run.js [filter]
   Node 12 has no ES modules by default, so worker.js is read as text, its "export default" turned into a variable,
   and the whole file run inside a function with the few globals a Worker has (Response, crypto, btoa) made up here.
   The D1 database is an in-memory mock (mockdb.js) that understands exactly the SQL the worker sends; an unknown
   statement fails the test, so a changed query shows up here. Every test gets a fresh copy of the worker (its memos
   and flags start empty). A word as argument runs only the tests whose name contains it. Exit code 1 on any failure. */
'use strict';
var fs = require('fs'), path = require('path'), nodeCrypto = require('crypto'), assert = require('assert');
var MockDB = require('./mockdb.js');
var SRC = fs.readFileSync(process.env.WORKER_FILE || path.join(__dirname, '..', 'worker.js'), 'utf8');   /* WORKER_FILE: test another copy */
var SITE = 'https://florias-papadopoulos.github.io';

function Headers(h) {
    var m = {};
    Object.keys(h || {}).forEach(function (k) { m[k.toLowerCase()] = String(h[k]); });
    return { get: function (k) { var v = m[String(k).toLowerCase()]; return v === undefined ? null : v; }, all: m };
}
function Response(body, init) {
    init = init || {};
    this.status = init.status || 200;
    this.headers = Headers(init.headers);
    this.text = body === null || body === undefined ? '' : String(body);
}
Response.prototype.json = function () { return JSON.parse(this.text); };

/* a body as a stream of chunks, counting how many were read (so a test can see that reading stopped early) */
function stream(chunks) {
    var i = 0, st = { reads: 0, cancelled: false };
    st.getReader = function () {
        return {
            read: function () {
                st.reads++;
                if (i >= chunks.length) return Promise.resolve({ done: true });
                return Promise.resolve({ done: false, value: Buffer.from(chunks[i++]) });
            },
            cancel: function () { st.cancelled = true; return Promise.resolve(); }
        };
    };
    return st;
}
function request(method, url, opts) {
    opts = opts || {};
    var h = Object.assign({}, opts.headers || {});
    if (opts.origin !== false) h.Origin = opts.origin || SITE;
    var body = null;
    if (opts.chunks) body = stream(opts.chunks);
    else if (opts.json !== undefined) {
        var t = JSON.stringify(opts.json);
        body = stream([t]);
        if (!opts.noLength) h['Content-Length'] = Buffer.byteLength(t);
    }
    return { method: method, url: 'https://w.example' + url, headers: Headers(h), body: body, cf: { country: 'CH' } };
}

/* a fresh worker: {fetch, i (its inner functions), db, env, waits (ctx.waitUntil promises)} */
var NAMES = ['nameOk', 'words', 'fold', 'boardOf', 'scoreOk', 'bound', 'mayRemove', 'body', 'readText', 'keyOk', 'keyOf',
    'newKey', 'newCode', 'same', 'BOARDS', 'LIKES', 'SHORT', 'LONG', 'ROOM_TTL', 'SWEEP_EVERY', 'ROOM_CAP', 'SCORE_CAP',
    'BOARD_CAP', 'LIKE_CAP', 'UNLIKE_SLACK', 'MAX_BODY'];
function worker(dbOpts) {
    var code = SRC.replace(/^export default /m, 'const WORKER = ') + '\nreturn { WORKER: WORKER, ' +
        NAMES.map(function (n) { return n + ': ' + n; }).join(', ') + ' };';
    var cryptoShim = { getRandomValues: function (a) { return nodeCrypto.randomFillSync(a); }, subtle: {} };
    var btoa = function (s) { return Buffer.from(s, 'binary').toString('base64'); };
    /* eslint-disable-next-line no-new-func */
    var i = new Function('Response', 'crypto', 'btoa', code)(Response, cryptoShim, btoa);
    var db = new MockDB(dbOpts), env = { DB: db, STATS_KEY: 'TestKey0123456789abcdefXYZ' }, waits = [];
    var ctx = { waitUntil: function (p) { waits.push(p); } };
    return {
        i: i, db: db, env: env, waits: waits,
        fetch: function (req) {
            return i.WORKER.fetch(req, env, ctx).then(function (r) { return Promise.all(waits.splice(0)).then(function () { return r; }); });
        },
        call: function (method, url, opts) { return this.fetch(request(method, url, opts)); }
    };
}

var tests = [], filter = process.argv[2] || '';
function test(name, fn) { tests.push({ name: name, fn: fn }); }
var realNow = Date.now;
function at(ms) { Date.now = function () { return ms; }; }

/* ---------- 1: own properties only, and real tracks ---------- */
test('M2 prototype names are no game, no like, no board', async function () {
    var w = worker();
    ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'].forEach(function (g) {
        assert.strictEqual(w.i.boardOf({ g: g, l: 'normal', b: '' }, false), null, g);
        assert.ok(!w.i.LIKES.has(g), g);
    });
    for (var g of ['constructor', '__proto__', 'toString']) {
        assert.strictEqual((await w.call('GET', '/scores?g=' + g + '&l=normal')).status, 400, 'GET ' + g);
        assert.strictEqual((await w.call('POST', '/scores', { json: { g: g, l: 'normal', b: '', n: 'Milo', s: 5 } })).status, 400, 'POST ' + g);
        assert.strictEqual((await w.call('POST', '/likes', { json: { g: g, f: 0, t: 1 } })).status, 400, 'like ' + g);
    }
    assert.strictEqual((await w.call('GET', '/scores?g=long-cat&l=constructor')).status, 400);
    assert.strictEqual(w.db.table('scores').length, 0);
});
test('M2 tracks: only the game\'s real tracks', async function () {
    var w = worker(), b = w.i.boardOf;
    assert.ok(b({ g: 'kitty-kart', l: 'hard', b: 'meadow' }, true));
    assert.ok(b({ g: 'kitty-kart', l: 'easy', b: 'room' }, true));
    assert.strictEqual(b({ g: 'kitty-kart', l: 'hard', b: '' }, true), null, 'kitty kart needs a track');
    assert.strictEqual(b({ g: 'kitty-kart', l: 'hard', b: 'nowhere' }, false), null);
    assert.strictEqual(b({ g: 'kitty-kart', l: 'hard', b: 'constructor' }, false), null);
    assert.strictEqual(b({ g: 'kitty-kart', l: 'hard', b: ['meadow'] }, true), null, 'not a string');
    assert.strictEqual(b({ g: 'long-cat', l: 'normal', b: 'meadow' }, true), null, 'no tracks: none allowed');
    assert.strictEqual(b({ g: 'long-cat', l: 'normal', b: null }, false).name, 'long-cat/normal');
    assert.strictEqual(b({ g: 'garden-defender', l: 'normal', b: 'tour' }, true).name, 'garden-defender/normal/tour');
    assert.ok(b({ g: 'garden-defender', l: 'normal', b: 'pond' }, false), 'old garden can be read');
    assert.strictEqual(b({ g: 'garden-defender', l: 'normal', b: 'pond' }, true), null, 'old garden gets no scores');
    assert.strictEqual((await w.call('GET', '/scores?g=kitty-kart&l=hard&b=zzz')).status, 400);
    assert.strictEqual((await w.call('GET', '/scores?g=kitty-kart&l=hard&b=moon')).status, 200);
    assert.strictEqual((await w.call('POST', '/scores', { json: { g: 'garden-defender', l: 'hard', b: 'tour', n: 'Milo', s: 4200 } })).status, 200);
});
test('M2 tracks match content/games/_index.md', function () {
    var w = worker(), md = fs.readFileSync(path.join(__dirname, '../../../content/games/_index.md'), 'utf8');
    var line = md.split('\n').filter(function (l) { return /tracks: \[/.test(l); });
    var kk = (/tracks: \[(.*)\]/.exec(line[0])[1].match(/id: ([a-z]+)/g) || []).map(function (s) { return s.slice(4); });
    assert.deepStrictEqual(w.i.BOARDS.get('kitty-kart').tracks, kk);
    var gd = (/tracks: \[(.*)\]/.exec(line[1])[1].match(/id: ([a-z]+)/g) || []).map(function (s) { return s.slice(4); });
    assert.deepStrictEqual(w.i.BOARDS.get('garden-defender').tracks, gd);
    /* every game with levels and not in the two player group has a board */
    (md.match(/^ {2}- \{ id: [a-z0-9-]+.*$/mg) || []).forEach(function (l) {
        var id = /id: ([a-z0-9-]+)/.exec(l)[1];
        if (/group: two/.test(l)) assert.ok(!w.i.BOARDS.has(id) && w.i.LIKES.has(id), id + ' (two player)');
        else assert.ok(w.i.BOARDS.has(id), id + ' has a board');
    });
});
test('M2 summary: nicknames like constructor and __proto__ count', async function () {
    var w = worker();
    w.db.insert('scores', { board: 'long-cat/normal', name: 'constructor', score: 50, week: '2026-11-09', at: 1 });
    w.db.insert('scores', { board: 'long-cat/normal', name: '__proto__', score: 40, week: '2026-11-09', at: 2 });
    w.db.insert('scores', { board: 'long-cat/normal', name: 'toString', score: 30, week: '2026-11-09', at: 3 });
    w.db.insert('scores', { board: 'constructor/normal', name: 'Milo', score: 30, week: '2026-11-09', at: 3 });
    var d = (await w.call('GET', '/scores/summary')).json();
    assert.strictEqual(d.boards.length, 1);
    assert.strictEqual(d.boards[0].p, 3);
    assert.deepStrictEqual(d.boards[0].top.map(function (r) { return r.n; }), ['constructor', '__proto__', 'toString']);
});

/* ---------- 2: score caps ---------- */
test('M4 every board has a max, lower is better ones a min', function () {
    var w = worker();
    w.i.BOARDS.forEach(function (g, id) {
        ['easy', 'normal', 'hard'].forEach(function (l) {
            var max = w.i.bound(g.max, l, null), min = w.i.bound(g.min, l, null);
            assert.ok(typeof max === 'number' && max < 1e7, id + ' ' + l + ' max');
            if (g.lower) assert.ok(typeof min === 'number' && min >= 1 && min < max, id + ' ' + l + ' min');
        });
    });
});
test('M4 scores outside the caps are refused', async function () {
    var w = worker(), ok = function (g, l, s, b) { return w.i.scoreOk(w.i.boardOf({ g: g, l: l, b: b || '' }, true), s); };
    assert.ok(!ok('long-cat', 'normal', 10000000));
    assert.ok(ok('long-cat', 'normal', 1500) && !ok('long-cat', 'normal', 1501));
    assert.ok(!ok('long-cat', 'normal', 0) && !ok('long-cat', 'normal', 12.5));
    assert.ok(ok('whack-a-mouse', 'hard', 2500) && !ok('whack-a-mouse', 'easy', 2500));
    assert.ok(ok('paw-pairs', 'easy', 2240) && !ok('paw-pairs', 'easy', 2400) && ok('paw-pairs', 'hard', 6680));
    assert.ok(ok('night-prowl', 'normal', 190) && !ok('night-prowl', 'normal', 1000));
    assert.ok(ok('kitty-kart', 'hard', 25, 'moon') && !ok('kitty-kart', 'hard', 24.9, 'moon'));
    assert.ok(ok('kitty-kart', 'hard', 41.3, 'moon') && !ok('kitty-kart', 'hard', 41.35, 'moon') && !ok('kitty-kart', 'hard', 3600.1, 'moon'));
    assert.ok(!ok('sliding-kitten', 'easy', 8) && ok('sliding-kitten', 'easy', 9) && !ok('sliding-kitten', 'normal', 15) && ok('sliding-kitten', 'hard', 25));
    assert.ok(ok('mouse-sweeper', 'easy', 1) && !ok('mouse-sweeper', 'easy', 0.5));
    assert.ok(!ok('paw-raiders', 'hard', Infinity) && !ok('paw-raiders', 'hard', NaN) && !ok('paw-raiders', 'hard', '500'));
    var r = await w.call('POST', '/scores', { json: { g: 'long-cat', l: 'normal', b: '', n: 'Milo', s: 10000000 } });
    assert.strictEqual(r.status, 400);
    r = await w.call('POST', '/scores', { json: { g: 'long-cat', l: 'normal', b: '', n: 'Milo', s: 420 } });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json().all, [{ n: 'Milo', s: 420 }]);
});

/* ---------- 3: likes cannot be zeroed ---------- */
test('M4 likes: take-backs limited to the day\'s likes plus the slack', async function () {
    var w = worker();
    w.db.insert('likes', { game: 'long-cat', up: 50, down: 0 });
    var up = async function (f, t) { var r = await w.call('POST', '/likes', { json: { g: 'long-cat', f: f, t: t } }); assert.strictEqual(r.status, 200); return r.json()['long-cat'].u; };
    var slack = w.i.UNLIKE_SLACK;
    for (var k = 0; k < slack; k++) assert.strictEqual(await up(1, 0), 49 - k, 'take-back ' + k);
    assert.strictEqual(await up(1, 0), 50 - slack, 'past the slack: ignored');
    assert.strictEqual(await up(1, 0), 50 - slack);
    assert.strictEqual(await up(0, 1), 51 - slack, 'a like');
    assert.strictEqual(await up(1, 0), 50 - slack, 'which can be taken back');
    assert.strictEqual(await up(1, 0), 50 - slack, 'but no more');
    /* like and unlike in turn: no change in the end */
    for (k = 0; k < 20; k++) { await up(0, 1); await up(1, 0); }
    assert.strictEqual(await up(1, 0), 50 - slack);
    /* another game has its own limit */
    var r = await w.call('POST', '/likes', { json: { g: 'brick-paw', f: 1, t: 0 } });
    assert.deepStrictEqual(r.json()['brick-paw'], { u: 0, d: 0 }, 'never below 0');
    assert.ok(w.i.mayRemove(undefined, undefined) && w.i.mayRemove(0, 2) && !w.i.mayRemove(0, 3) && w.i.mayRemove(5, 7) && !w.i.mayRemove(5, 8));
});
test('M4 likes: LIKE_CAP still holds', async function () {
    var w = worker();
    w.db.count('likes', 'all', w.i.LIKE_CAP);
    assert.strictEqual((await w.call('POST', '/likes', { json: { g: 'long-cat', f: 0, t: 1 } })).status, 503);
    assert.strictEqual((await w.call('GET', '/likes')).status, 200, 'reading still works');
});

/* ---------- 4: rooms with a host key ---------- */
var OFFER = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n', ANSWER = 'v=0\r\no=- 3 4 IN IP4 127.0.0.1\r\n';
test('L2 rooms: a host key guards the answer and the close', async function () {
    var w = worker();
    var r = await w.call('POST', '/room', { json: { offer: OFFER, k: 1 } });
    assert.strictEqual(r.status, 200);
    var d = r.json(), code = d.code, key = d.key;
    assert.ok(/^[A-Z]{4}$/.test(code) && /^[A-Za-z0-9_-]{22}$/.test(key), JSON.stringify(d));
    assert.strictEqual(w.db.table('rooms')[0].secret, key);
    assert.strictEqual((await w.call('GET', '/room/' + code + '/answer')).status, 403, 'no key');
    assert.strictEqual((await w.call('GET', '/room/' + code + '/answer', { headers: { Authorization: 'Room ' + key.replace(/^./, key[0] === 'A' ? 'B' : 'A') } })).status, 403, 'wrong key');
    assert.strictEqual((await w.call('GET', '/room/' + code + '/answer?key=' + key)).status, 403, 'a key in the address does not count');
    assert.strictEqual((await w.call('GET', '/room/' + code + '/answer', { headers: { Authorization: 'Room ' + key } })).status, 204, 'waiting');
    assert.strictEqual((await w.call('POST', '/room/' + code + '/close')).status, 403, 'close without key');
    assert.strictEqual((await w.call('POST', '/room/' + code + '/close', { json: { key: 'x'.repeat(22) } })).status, 403);
    assert.strictEqual(w.db.table('rooms').length, 1);
    assert.strictEqual((await w.call('GET', '/room/' + code)).json().offer, OFFER, 'the friend reads the offer');
    assert.strictEqual((await w.call('POST', '/room/' + code, { json: { answer: ANSWER } })).status, 204);
    assert.strictEqual((await w.call('POST', '/room/' + code, { json: { answer: ANSWER } })).status, 409);
    r = await w.call('GET', '/room/' + code + '/answer', { headers: { Authorization: 'Room ' + key } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json().answer, ANSWER);
    assert.strictEqual(w.db.table('rooms').length, 0, 'deleted once read');
    /* closing with the key in the body (what the site sends with keepalive) */
    d = (await w.call('POST', '/room', { json: { offer: OFFER, k: 1 } })).json();
    assert.strictEqual((await w.call('POST', '/room/' + d.code + '/close', { json: { key: d.key } })).status, 204);
    assert.strictEqual(w.db.table('rooms').length, 0);
    d = (await w.call('POST', '/room', { json: { offer: OFFER, k: 1 } })).json();
    assert.strictEqual((await w.call('POST', '/room/' + d.code + '/close', { headers: { Authorization: 'Room ' + d.key } })).status, 204);
    assert.strictEqual(w.db.table('rooms').length, 0);
    assert.strictEqual((await w.call('POST', '/room', { json: { offer: OFFER, k: 1 }, origin: 'https://evil.example' })).status, 403);
});
test('L2 rooms: pages from before the key work as before', async function () {
    var w = worker();
    var d = (await w.call('POST', '/room', { json: { offer: OFFER } })).json();
    assert.ok(d.code && d.key === undefined, 'no key asked, none given');
    assert.strictEqual((await w.call('GET', '/room/' + d.code + '/answer')).status, 204);
    assert.strictEqual((await w.call('POST', '/room/' + d.code, { json: { answer: ANSWER } })).status, 204);
    assert.strictEqual((await w.call('GET', '/room/' + d.code + '/answer')).json().answer, ANSWER);
    d = (await w.call('POST', '/room', { json: { offer: OFFER } })).json();
    assert.strictEqual((await w.call('POST', '/room/' + d.code + '/close')).status, 204);
    assert.strictEqual(w.db.table('rooms').length, 0);
});
test('L2 rooms: an old database gets the secret column and the index', async function () {
    var w = worker({ roomsWithoutSecret: true });
    assert.strictEqual((await w.call('POST', '/room', { json: { offer: OFFER, k: 1 } })).status, 200);
    assert.ok(w.db.has('ALTER TABLE rooms ADD COLUMN secret TEXT'), 'column added');
    assert.ok(w.db.has('CREATE INDEX IF NOT EXISTS rooms_at ON rooms (at)'), 'index made');
    var n = w.db.log.length;
    await w.call('GET', '/room/BCDF');
    assert.ok(!w.db.log.slice(n).some(function (s) { return /CREATE|ALTER|SELECT secret FROM rooms LIMIT/.test(s); }), 'once per running copy');
    var w2 = worker();
    await w2.call('POST', '/room', { json: { offer: OFFER, k: 1 } });
    assert.ok(!w2.db.has('ALTER TABLE rooms ADD COLUMN secret TEXT'), 'no ALTER when the column is there');
});
test('L2 rooms: daily cap, open cap, expired rooms', async function () {
    var w = worker();
    w.db.count('rooms', 'all', w.i.ROOM_CAP);
    assert.strictEqual((await w.call('POST', '/room', { json: { offer: OFFER, k: 1 } })).status, 503, 'ROOM_CAP');
    w = worker();
    var t0 = realNow();
    at(t0);
    for (var k = 0; k < 100; k++) w.db.insert('rooms', { code: 'R' + k, offer: OFFER, answer: null, at: t0, secret: null });
    assert.strictEqual((await w.call('POST', '/room', { json: { offer: OFFER } })).status, 503, 'MAX_ROOMS');
    w.db.table('rooms').forEach(function (r) { r.at = t0 - w.i.ROOM_TTL - 1; });   /* all expired, not swept */
    var d = (await w.call('POST', '/room', { json: { offer: OFFER } })).json();
    assert.ok(d.code, 'expired rooms do not count as open');
    w.db.insert('rooms', { code: 'BBBB', offer: OFFER, answer: null, at: t0 - w.i.ROOM_TTL - 1, secret: null });
    assert.strictEqual((await w.call('GET', '/room/BBBB')).status, 404, 'an expired room is not served');
    assert.strictEqual((await w.call('POST', '/room/BBBB', { json: { answer: ANSWER } })).status, 404);
    assert.strictEqual(w.db.counted('rooms', 'all'), 1, 'rooms opened are counted');
    Date.now = realNow;
});
test('L2 rooms: a code held by an expired room is reused', async function () {
    var w = worker(), t0 = realNow();
    at(t0);
    w.db.insert('rooms', { code: 'ZZZZ', offer: 'old', answer: 'old', at: t0 - 200000, secret: 'old' });
    var res = await w.db.prepare('INSERT INTO rooms (code, offer, answer, at, secret) VALUES (?1, ?2, NULL, ?3, ?4) ' +
        'ON CONFLICT(code) DO UPDATE SET offer = excluded.offer, answer = NULL, at = excluded.at, secret = excluded.secret WHERE rooms.at < ?5')
        .bind('ZZZZ', OFFER, t0, null, t0 - w.i.ROOM_TTL).run();
    assert.strictEqual(res.meta.changes, 1);
    var row = w.db.table('rooms')[0];
    assert.ok(row.offer === OFFER && row.answer === null && row.secret === null && row.at === t0);
    res = await w.db.prepare('INSERT INTO rooms (code, offer, answer, at, secret) VALUES (?1, ?2, NULL, ?3, ?4) ' +
        'ON CONFLICT(code) DO UPDATE SET offer = excluded.offer, answer = NULL, at = excluded.at, secret = excluded.secret WHERE rooms.at < ?5')
        .bind('ZZZZ', 'v=0 other', t0, null, t0 - w.i.ROOM_TTL).run();
    assert.strictEqual(res.meta.changes, 0, 'a live room is not overwritten');
    Date.now = realNow;
});

/* ---------- 5: sweep at most every SWEEP_EVERY ---------- */
test('M1 sweep: at most once every SWEEP_EVERY per running copy', async function () {
    var w = worker(), t0 = realNow(), sweeps = function () { return w.db.log.filter(function (s) { return s === 'DELETE FROM rooms WHERE at < ?1'; }).length; };
    at(t0);
    for (var k = 0; k < 10; k++) await w.call('GET', '/likes');
    await w.call('GET', '/room/BCDF');
    assert.strictEqual(sweeps(), 1);
    at(t0 + w.i.SWEEP_EVERY - 1);
    await w.call('GET', '/likes');
    assert.strictEqual(sweeps(), 1);
    at(t0 + w.i.SWEEP_EVERY + 1);
    await w.call('GET', '/likes');
    assert.strictEqual(sweeps(), 2);
    w.db.insert('rooms', { code: 'OLDR', offer: OFFER, answer: null, at: t0 - w.i.ROOM_TTL, secret: null });
    await w.i.WORKER.scheduled({}, w.env, { waitUntil: function (p) { w.waits.push(p); } });
    await Promise.all(w.waits.splice(0));
    assert.strictEqual(sweeps(), 3, 'the cron trigger always sweeps');
    assert.strictEqual(w.db.table('rooms').length, 0);
    Date.now = realNow;
});

/* ---------- 6: nicknames ---------- */
test('L1 nicknames: lookalikes, whole words, new words', function () {
    var w = worker(), ok = w.i.nameOk;
    var good = ['Milo', 'Anna B.', 'Jo', 'Zoë', "O'Neil", 'crypto_fan', 'Dickens', 'Essex', 'Skillful', 'Scunthorpe', 'Nazir',
        'Gamora', 'Badminton', 'Hitchcock', 'Grape', 'Sussex', 'Kyshtym', 'José María', 'Łukasz', 'Søren', 'Đorđe', 'Straße',
        'Ștefan', 'Nguyễn', 'Quill Bill 2', 'Mia-Sofie', 'Player 1', 'Fukuda', 'Pusscat'];
    good.forEach(function (n) { assert.ok(ok(n), 'should pass: ' + n); });
    var bad = ['shіt', 'Ηitler', 'Floriаs', 'Аdmin', 'cunт', 'Florias', 'Admin', 'admin123', 'SiteAdmin', 'sex', 'Sex', 'S.E.X',
        's e x', 'sexy', 'dick', 'BigDick', 'dick69', 'd1ck', 'kill', 'Kill Bill', 'gamo', 'hure', 'puta', 'kys', 'fag', 'nazi',
        'Nazis', 'twat', 'Twat', 'wanker', 'W4nker', 'cunt', 'Cunts', 'kunt', 'cvnt', 'Sh1t', 'b.i.t.c.h', 'fu2ck', 'MotherFucker',
        'hurensohn', 'Arsch', 'ᴀdmin', 'Ｆuck', 'ꜰᴜᴄᴋ', 'shıt', 'M', 'x'.repeat(21), ' Milo', 'Milo  B', 'a<b>', '', 'Milo​',
        'Míló́', '-Milo', 'Milo×2', 'Ⅿilo', '𝐌ilo', 'Мilo'];
    bad.forEach(function (n) { assert.ok(!ok(n), 'should be refused: ' + JSON.stringify(n)); });
    assert.ok(ok('Zoë'), 'a name typed with a combining accent (NFD) is fine');
    assert.ok(!ok(null) && !ok(42));
});
test('L1 nicknames: the stored name is the composed (NFC) form', async function () {
    var w = worker();
    var r = await w.call('POST', '/scores', { json: { g: 'long-cat', l: 'normal', b: '', n: ' Zoë ', s: 10 } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(w.db.table('scores')[0].name, 'Zoë');
    assert.strictEqual((await w.call('POST', '/scores', { json: { g: 'long-cat', l: 'normal', b: '', n: 'Аdmin', s: 10 } })).status, 422);
});

/* ---------- 7: body size ---------- */
test('low body: a long body without a length is not read whole', async function () {
    var w = worker(), chunks = [];
    for (var k = 0; k < 50; k++) chunks.push('x'.repeat(100));
    var req = request('POST', '/scores', { chunks: chunks });
    assert.strictEqual(await w.i.body(req, 1000), null);
    assert.ok(req.body.cancelled && req.body.reads <= 11, 'stopped after ' + req.body.reads + ' reads');
    req = request('POST', '/scores', { headers: { 'Content-Length': '5000' }, chunks: chunks });
    assert.strictEqual(await w.i.body(req, 1000), null);
    assert.strictEqual(req.body.reads, 0, 'a stated length too long: nothing read');
    var good = JSON.stringify({ g: 'long-cat' });
    req = request('POST', '/scores', { chunks: [good.slice(0, 5), good.slice(5)] });
    assert.deepStrictEqual(await w.i.body(req, 1000), { g: 'long-cat' }, 'chunks are joined');
    req = request('POST', '/scores', { chunks: ['{"n": "Zo', 'ë"}'] });
    assert.deepStrictEqual(await w.i.body(req, 1000), { n: 'Zoë' }, 'UTF-8 across chunks');
    assert.strictEqual(await w.i.body(request('POST', '/x', { chunks: ['[1,2]'] }), 1000), null, 'not an object');
    assert.strictEqual(await w.i.body(request('POST', '/x', {}), 1000), null, 'no body');
    assert.strictEqual(await w.i.body(request('POST', '/x', { chunks: ['{"a": "' + 'é'.repeat(600) + '"}'] }), 1000), null, 'bytes, not characters');
    var r = await w.call('POST', '/scores', { chunks: chunks });
    assert.strictEqual(r.status, 400);
});

/* ---------- 8: daily caps ---------- */
test('M4 caps: a full SCORE_CAP does not block reading', async function () {
    var w = worker();
    w.db.insert('scores', { board: 'long-cat/normal', name: 'Milo', score: 50, week: '2000-01-03', at: 1 });
    w.db.count('scores', 'all', w.i.SCORE_CAP);
    assert.strictEqual((await w.call('POST', '/scores', { json: { g: 'long-cat', l: 'normal', b: '', n: 'Luna', s: 60 } })).status, 503);
    var r = await w.call('GET', '/scores?g=long-cat&l=normal');
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json().all, [{ n: 'Milo', s: 50 }]);
    assert.strictEqual((await w.call('GET', '/scores/summary')).status, 200);
});
test('M4 caps: BOARD_CAP blocks only that board', async function () {
    var w = worker();
    w.db.count('board', 'long-cat/normal', w.i.BOARD_CAP);
    assert.strictEqual((await w.call('POST', '/scores', { json: { g: 'long-cat', l: 'normal', b: '', n: 'Luna', s: 60 } })).status, 503);
    assert.strictEqual((await w.call('POST', '/scores', { json: { g: 'long-cat', l: 'hard', b: '', n: 'Luna', s: 60 } })).status, 200);
    assert.strictEqual(w.db.counted('board', 'long-cat/hard'), 1);
    assert.strictEqual(w.db.counted('scores', 'all'), 1);
});

/* ---------- 9: memos ---------- */
test('memo: GET /scores is kept 15 s, a new score refreshes it', async function () {
    var w = worker(), reads = function () { return w.db.log.filter(function (s) { return /^SELECT name, /.test(s); }).length; };
    await w.call('GET', '/scores?g=long-cat&l=normal');
    await w.call('GET', '/scores?g=long-cat&l=normal');
    assert.strictEqual(reads(), 2, 'one all time and one week read');
    await w.call('POST', '/scores', { json: { g: 'long-cat', l: 'normal', b: '', n: 'Luna', s: 60 } });
    var r = await w.call('GET', '/scores?g=long-cat&l=normal');
    assert.deepStrictEqual(r.json().all, [{ n: 'Luna', s: 60 }]);
    assert.strictEqual(reads(), 4);
});
test('stats: still owner only, totals grouped', async function () {
    var w = worker(), y = new Date(Date.parse(new Date().toISOString().slice(0, 10)) - 864e5).toISOString().slice(0, 10);
    w.db.count('total', 'all', 9, y); w.db.count('page', '/games/', 7, y); w.db.count('page', '/you/', 2, y); w.db.count('page', '__proto__', 5, y);
    assert.strictEqual((await w.call('GET', '/stats?days=7')).status, 401);
    var r = await w.call('GET', '/stats?days=7', { headers: { Authorization: 'Bearer ' + w.env.STATS_KEY } });
    assert.strictEqual(r.status, 200);
    var d = r.json();
    assert.strictEqual(d.daily[y], 9);
    assert.strictEqual(d.totals.page['/games/'], 7);
    assert.strictEqual(d.totals.page['(other)'], 2);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(d.totals.page, '__proto__'), true, 'an own key, not the prototype');
});
test('OPTIONS allows the Authorization header and is cached 10 minutes', async function () {
    var w = worker(), r = await w.call('OPTIONS', '/room/BCDF/answer');
    assert.ok(/Authorization/.test(r.headers.get('Access-Control-Allow-Headers')));
    assert.strictEqual(r.headers.get('Access-Control-Max-Age'), '600');
});
test('no dashes as punctuation in the worker\'s text', function () {
    assert.ok(!/[\u2013\u2014]/.test(SRC), 'en or em dash');
    assert.ok(!/ -- /.test(SRC), 'a double hyphen as a dash');
});

(async function () {
    var fails = 0, ran = 0;
    for (var t of tests) {
        if (filter && t.name.indexOf(filter) < 0) continue;
        ran++;
        try { await t.fn(); console.log('ok   ' + t.name); }
        catch (e) { fails++; console.log('FAIL ' + t.name + ': ' + (e && e.message)); if (process.env.TRACE) console.log(e.stack); }
        Date.now = realNow;
    }
    console.log(ran - fails + ' of ' + ran + ' tests passed' + (fails ? ', ' + fails + ' failed' : ''));
    process.exit(fails ? 1 : 0);
})();
