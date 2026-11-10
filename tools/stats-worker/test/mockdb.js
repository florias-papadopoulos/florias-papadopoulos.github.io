/* An in-memory stand-in for the D1 binding, for test/run.js. It knows exactly the statements worker.js sends (matched
   by their text) and does what SQLite would do with them; any other statement throws, so a changed query fails a test
   until it is taught here. log lists every statement run, in order. */
'use strict';
function today() { return new Date().toISOString().slice(0, 10); }

function MockDB(opts) {
    opts = opts || {};
    this.t = { counts: [], rooms: [], scores: [], likes: [] };
    this.log = [];
    this.noSecret = !!opts.roomsWithoutSecret;   /* a rooms table from before the host key */
    this.nextId = 1;
}
MockDB.prototype.table = function (n) { return this.t[n]; };
MockDB.prototype.insert = function (n, row) {
    if (n === 'scores' && row.id === undefined) row.id = this.nextId++;
    this.t[n].push(row);
};
MockDB.prototype.count = function (kind, key, n, day) { this.add(day || today(), kind, key, n); };
MockDB.prototype.counted = function (kind, key, day) { var r = this.find(day || today(), kind, key); return r ? r.n : 0; };
MockDB.prototype.find = function (day, kind, key) { return this.t.counts.filter(function (r) { return r.day === day && r.kind === kind && r.key === key; })[0]; };
MockDB.prototype.add = function (day, kind, key, n) {
    var r = this.find(day, kind, key);
    if (r) r.n += n; else this.t.counts.push({ day: day, kind: kind, key: key, n: n });
};
MockDB.prototype.has = function (sql) { return this.log.indexOf(sql) >= 0; };
MockDB.prototype.prepare = function (sql) { return new Stmt(this, sql, []); };
MockDB.prototype.batch = function (stmts) {
    return stmts.reduce(function (p, s) { return p.then(function (out) { return s.run().then(function (r) { out.push(r); return out; }); }); }, Promise.resolve([]));
};

function Stmt(db, sql, args) { this.db = db; this.sql = sql; this.args = args; }
Stmt.prototype.bind = function () { return new Stmt(this.db, this.sql, Array.prototype.slice.call(arguments)); };
Stmt.prototype.exec = function () {
    var db = this.db, sql = this.sql, a = this.args, t = db.t, m;
    db.log.push(sql);
    var arg = function (i) { return a[i - 1]; };
    var rooms = function (code) { return t.rooms.filter(function (r) { return r.code === code; })[0]; };
    var cnt = function (day, kind, key) { var r = db.find(day, kind, key); return r ? r.n : null; };
    /* rooms */
    if (/^CREATE TABLE IF NOT EXISTS (rooms|likes) /.test(sql)) return { rows: [], changes: 0 };
    if (sql === 'CREATE INDEX IF NOT EXISTS rooms_at ON rooms (at)') return { rows: [], changes: 0 };
    if (sql === 'SELECT secret FROM rooms LIMIT 1') {
        if (db.noSecret) throw new Error('D1_ERROR: no such column: secret: SQLITE_ERROR');
        return { rows: t.rooms.slice(0, 1).map(function (r) { return { secret: r.secret }; }) };
    }
    if (sql === 'ALTER TABLE rooms ADD COLUMN secret TEXT') {
        if (!db.noSecret) throw new Error('D1_ERROR: duplicate column name: secret: SQLITE_ERROR');
        db.noSecret = false;
        t.rooms.forEach(function (r) { r.secret = null; });
        return { rows: [], changes: 0 };
    }
    if (sql === 'DELETE FROM rooms WHERE at < ?1') {
        var before = t.rooms.length;
        t.rooms = t.rooms.filter(function (r) { return !(r.at < arg(1)); });
        return { rows: [], changes: before - t.rooms.length };
    }
    if (/^SELECT \(SELECT COUNT\(\*\) FROM rooms WHERE at >= \?1\) AS open, \(SELECT n FROM counts WHERE day = \?2 AND kind = 'rooms' AND key = 'all'\) AS opened$/.test(sql)) {
        return { rows: [{ open: t.rooms.filter(function (r) { return r.at >= arg(1); }).length, opened: cnt(arg(2), 'rooms', 'all') }] };
    }
    if (/^INSERT INTO rooms \(code, offer, answer, at, secret\) VALUES \(\?1, \?2, NULL, \?3, \?4\) ON CONFLICT\(code\) DO UPDATE SET offer = excluded.offer, answer = NULL, at = excluded.at, secret = excluded.secret WHERE rooms.at < \?5$/.test(sql)) {
        if (db.noSecret) throw new Error('D1_ERROR: table rooms has no column named secret');
        var old = rooms(arg(1));
        if (!old) { t.rooms.push({ code: arg(1), offer: arg(2), answer: null, at: arg(3), secret: arg(4) }); return { rows: [], changes: 1 }; }
        if (old.at < arg(5)) { old.offer = arg(2); old.answer = null; old.at = arg(3); old.secret = arg(4); return { rows: [], changes: 1 }; }
        return { rows: [], changes: 0 };
    }
    if ((m = /^SELECT (secret|offer, answer, secret) FROM rooms WHERE code = \?1 AND at >= \?2$/.exec(sql))) {
        var r = rooms(arg(1));
        if (!r || !(r.at >= arg(2))) return { rows: [] };
        return { rows: [m[1] === 'secret' ? { secret: r.secret } : { offer: r.offer, answer: r.answer, secret: r.secret }] };
    }
    if (sql === 'DELETE FROM rooms WHERE code = ?1') {
        var n0 = t.rooms.length;
        t.rooms = t.rooms.filter(function (r) { return r.code !== arg(1); });
        return { rows: [], changes: n0 - t.rooms.length };
    }
    if (sql === 'UPDATE rooms SET answer = ?2 WHERE code = ?1 AND answer IS NULL AND at >= ?3') {
        var u = rooms(arg(1));
        if (u && u.answer === null && u.at >= arg(3)) { u.answer = arg(2); return { rows: [], changes: 1 }; }
        return { rows: [], changes: 0 };
    }
    /* counts */
    if ((m = /^INSERT INTO counts \(day, kind, key, n\) VALUES \(\?1, (\?2|'[a-z]+'), (\?3|'[a-z]+'), 1\) ON CONFLICT\(day, kind, key\) DO UPDATE SET n = n \+ 1$/.exec(sql))) {
        var kind = m[1] === '?2' ? arg(2) : m[1].slice(1, -1), key = m[2] === '?3' ? arg(3) : m[2].slice(1, -1);
        db.add(arg(1), kind, key, 1);
        return { rows: [], changes: 1 };
    }
    if (/^SELECT \(SELECT n FROM counts WHERE day = \?1 AND kind = 'scores' AND key = 'all'\) AS total, \(SELECT n FROM counts WHERE day = \?1 AND kind = 'board' AND key = \?2\) AS board$/.test(sql)) {
        return { rows: [{ total: cnt(arg(1), 'scores', 'all'), board: cnt(arg(1), 'board', arg(2)) }] };
    }
    if (/^SELECT \(SELECT n FROM counts WHERE day = \?1 AND kind = 'likes' AND key = 'all'\) AS total, \(SELECT n FROM counts WHERE day = \?1 AND kind = 'like\+' AND key = \?2\) AS added, \(SELECT n FROM counts WHERE day = \?1 AND kind = 'like-' AND key = \?2\) AS removed$/.test(sql)) {
        return { rows: [{ total: cnt(arg(1), 'likes', 'all'), added: cnt(arg(1), 'like+', arg(2)), removed: cnt(arg(1), 'like-', arg(2)) }] };
    }
    if (sql === "SELECT day, n FROM counts WHERE kind = 'total' AND day BETWEEN ?1 AND ?2") {
        return { rows: t.counts.filter(function (r) { return r.kind === 'total' && r.day >= arg(1) && r.day <= arg(2); }).map(function (r) { return { day: r.day, n: r.n }; }) };
    }
    if (/^SELECT kind, key, SUM\(n\) AS n FROM counts WHERE kind IN \('page', 'ref', 'device', 'browser', 'country'\) AND day BETWEEN \?1 AND \?2 GROUP BY kind, key ORDER BY n DESC$/.test(sql)) {
        var g = new Map();
        t.counts.forEach(function (r) {
            if (['page', 'ref', 'device', 'browser', 'country'].indexOf(r.kind) < 0 || r.day < arg(1) || r.day > arg(2)) return;
            var k = r.kind + '\u0000' + r.key;
            g.set(k, (g.get(k) || 0) + r.n);
        });
        return { rows: Array.from(g.entries()).map(function (e) { var p = e[0].split('\u0000'); return { kind: p[0], key: p[1], n: e[1] }; })
            .sort(function (x, y) { return y.n - x.n; }) };
    }
    /* scores */
    if (sql === 'INSERT INTO scores (board, name, score, week, at) VALUES (?1, ?2, ?3, ?4, ?5)') {
        db.insert('scores', { board: arg(1), name: arg(2), score: arg(3), week: arg(4), at: arg(5) });
        return { rows: [], changes: 1 };
    }
    if (/^DELETE FROM scores WHERE board = \?1 AND /.test(sql)) return { rows: [], changes: 0 };   /* trimming: not needed by the tests */
    if ((m = /^SELECT name, (MIN|MAX)\(score\) AS s, MIN\(at\) AS at FROM scores WHERE board = \?1( AND week = \?2)? GROUP BY LOWER\(name\) ORDER BY s (ASC|DESC), at ASC LIMIT 10$/.exec(sql))) {
        var low = m[1] === 'MIN', by = new Map();
        t.scores.forEach(function (r) {
            if (r.board !== arg(1) || (m[2] && r.week !== arg(2))) return;
            var k = r.name.toLowerCase(), c = by.get(k);
            if (!c) by.set(k, { name: r.name, s: r.score, at: r.at });
            else { c.s = low ? Math.min(c.s, r.score) : Math.max(c.s, r.score); c.at = Math.min(c.at, r.at); }
        });
        return { rows: Array.from(by.values()).sort(function (x, y) { return (low ? x.s - y.s : y.s - x.s) || x.at - y.at; }).slice(0, 10) };
    }
    if (sql === 'SELECT board, name, score, at FROM scores') return { rows: t.scores.map(function (r) { return { board: r.board, name: r.name, score: r.score, at: r.at }; }) };
    /* likes */
    if (sql === 'SELECT game, up, down FROM likes') return { rows: t.likes.map(function (r) { return { game: r.game, up: r.up, down: r.down }; }) };
    if (/^INSERT INTO likes \(game, up, down\) VALUES \(\?1, MAX\(\?2, 0\), MAX\(\?3, 0\)\) ON CONFLICT\(game\) DO UPDATE SET up = MAX\(up \+ \?2, 0\), down = MAX\(down \+ \?3, 0\)$/.test(sql)) {
        var l = t.likes.filter(function (r) { return r.game === arg(1); })[0];
        if (!l) t.likes.push({ game: arg(1), up: Math.max(arg(2), 0), down: Math.max(arg(3), 0) });
        else { l.up = Math.max(l.up + arg(2), 0); l.down = Math.max(l.down + arg(3), 0); }
        return { rows: [], changes: 1 };
    }
    throw new Error('mock D1 does not know: ' + sql);
};
Stmt.prototype.run = function () { var s = this; return Promise.resolve().then(function () { var r = s.exec(); return { success: true, meta: { changes: r.changes || 0 } }; }); };
Stmt.prototype.all = function () { var s = this; return Promise.resolve().then(function () { return { results: s.exec().rows || [] }; }); };
Stmt.prototype.first = function () { var s = this; return Promise.resolve().then(function () { var r = s.exec().rows || []; return r.length ? r[0] : null; }); };

module.exports = MockDB;
