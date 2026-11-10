// Audience mode: one live session (one talk, or its ".test" rehearsal). Pure functions on a plain state object, with
// no Cloudflare APIs: index.js (the Durable Object) loads the state from storage, calls handle() for every WebSocket
// message, writes back the keys it names, and delivers the messages it returns. Tested in node by test/run.js.
//
// The state in memory, and the storage keys it is kept under (one small value per vote, upvote, question and phone,
// so no stored value grows with the size of the audience):
//   meta     { name, code, test, s, title, ask, react, acts, cur, ph, opened, shown, live, qr, board, started, ended,
//            last, join, wdue }
//            s: "none" (no plan with this code), "waiting" (planned, not started), "live", "ended"
//            acts: the plan's activities, copied at the start (plus quick polls); cur: the one on screen (-1: none yet);
//            ph: "open" (cur is on screen) or "idle" (between activities); opened[id]: when it was first opened (ms,
//            the quiz timer); shown[id]: its results are revealed (voting is closed); live[id]: a poll's bars show live;
//            join: the join secret, copied from the plan at the start; wdue: when nicknames given before the start
//            are deleted if the talk has not started by then
//   plan     the latest saved plan (pushed by the Worker whenever the presenter saves it), with its join secrets
//   players  { id: { tok, n, s } }        key "ph:<tok>" = { id, n, s }: a phone that has kept something
//            n: its nickname ("" for none), s: "new" (waiting for the presenter), "ok" (shown), "no" (not shown)
//   toks     { browser token: id }        (from the same keys; phones that have kept nothing are only in memory)
//   qs       [ { id, x, by, up: [ids], st: "new" | "shown" | "hidden", big, at } ]
//            key "q:<id>" = the question without up; key "u:<q>:<id>" = 1 for each upvote
//   res      { activity id: { n: [count per answer], by: { id: answer }, p: { id: points } } }
//            key "v:<activity>:<id>" = [answer] or [answer, points]; the counts are added up when the state is loaded
// Ids are 16 random characters the worker gives a phone when it first says hello. The phone's own random token (in
// its localStorage) only finds its id again after a reload; it never decides who voted. No IP addresses: index.js
// counts connections per address in memory only.
//
// Messages (JSON, at most LIMITS.msg characters). From a phone:
//   {t:"hi", tok, k: join secret}  {t:"nick", n}  {t:"vote", a: id, c: answer}  {t:"ask", x}  {t:"up", q: id}
//   {t:"react", e: 0..5}
// From the presenter (projector, remote): {t:"hi", key} first, then
//   {t:"start"} {t:"next"} {t:"prev"} {t:"go", i} {t:"close"} {t:"reveal"} {t:"hide"} {t:"qr", on} {t:"board", on}
//   {t:"live", on} {t:"quick", q, opts} {t:"qset", q: id, st} {t:"qbig", q: id} {t:"name", n, s: "ok" | "no"}
//   {t:"names"} (show every waiting nickname) {t:"end"} {t:"reset"}
// To phones: {t:"state", ...audienceView}, {t:"voted", a, c}, {t:"votes", a, n, total} (live polls), {t:"qup", q, up},
//   {t:"asked", q}, {t:"nick", ok, n, s, e}, {t:"err", e}
// To presenters: {t:"pstate", ...presenterView}, {t:"votes", a, n, total}, {t:"n", n} (people connected),
//   {t:"q", q} (a new question), {t:"qup", q, up}, {t:"react", e}
import { LIMITS, VOTE_TYPES, EMOJI, checkAct, clean, nameOk, newId, planCode, secret, same } from './plan.js';

export const IDLE = 12 * 3600e3;  // a live session with no presenter command for this long ends by itself
export const KEEP = 24 * 3600e3;  // audience data is deleted this long after the session ends
export const GRACE = 1500;        // ms after a quiz's time is up in which a late answer still counts (network delay)
const TOKEN = /^[A-Za-z0-9_-]{16,40}$/;
const ID_LEN = 16;                // characters of a phone's id
const ASK_GAP = 15000;            // ms between two questions from one connection
const ASK_MAX = 5;                // questions from one phone per session
const Q_MAX = 300;                // questions per session
const MSG_CAP = 40, MSG_MS = 1000;    // message bucket of a connection: 40 at once, one more a second
const RE_CAP = 5, RE_MS = 1200;       // reactions of a connection: 5 at once, one more every 1.2 s
const RE_ALL = 12;                    // reactions forwarded to the projector a second, from everyone together
const NAMES_NEW = 100, NAMES_NO = 50; // nicknames listed for the presenter: waiting ones, and ones not shown

/* a map for keys that come from outside (no prototype, so "__proto__" or "constructor" are plain keys) */
function map() { return Object.create(null); }

export function blank(name) {
    return {
        meta: { name: name, code: planCode(name), test: name.slice(-5) === '.test', s: 'none', title: '', ask: false, react: false,
            acts: [], cur: -1, ph: 'idle', opened: {}, shown: {}, live: {}, qr: false, board: false, started: 0, ended: 0, last: 0,
            join: '', wdue: 0 },
        plan: null, players: map(), toks: map(), qs: [], res: map()
    };
}

/* ---------- storage ---------- */
/* the state from what storage.list() gave (a Map or a plain object of key -> value) */
export function fromStorage(name, entries) {
    const st = blank(name);
    const each = entries instanceof Map ? Array.from(entries.entries()) : Object.keys(entries || {}).map(function (k) { return [k, entries[k]]; });
    const votes = [], ups = [];
    for (const kv of each) {
        const k = kv[0], v = kv[1];
        if (k === 'meta') st.meta = Object.assign(st.meta, v);
        else if (k === 'plan') st.plan = v;
        else if (k.indexOf('ph:') === 0) {
            if (!v || typeof v.id !== 'string') continue;
            const tok = k.slice(3);
            st.toks[tok] = v.id;
            st.players[v.id] = { tok: tok, n: v.n || '', s: v.s || '' };
        } else if (k.indexOf('q:') === 0) {
            if (v && Number.isInteger(v.id)) st.qs.push({ id: v.id, x: v.x, by: v.by, up: [], st: v.st, big: !!v.big, at: v.at });
        } else if (k.indexOf('v:') === 0) votes.push([k.split(':'), v]);
        else if (k.indexOf('u:') === 0) ups.push(k.split(':'));
    }
    st.qs.sort(function (x, y) { return x.id - y.id; });
    const qById = {};
    for (const q of st.qs) qById[q.id] = q;
    for (const u of ups) { const q = qById[+u[1]]; if (q && q.up.indexOf(u[2]) < 0) q.up.push(u[2]); }
    const acts = {};
    for (const a of st.meta.acts) acts[a.id] = a;
    for (const e of votes) {
        const a = e[0][1], id = e[0][2], v = e[1];
        if (!Array.isArray(v) || !Number.isInteger(v[0]) || v[0] < 0 || v[0] >= 6) continue;
        const res = st.res[a] || (st.res[a] = { n: [], by: map(), p: map() });
        res.by[id] = v[0];
        if (v.length > 1) res.p[id] = v[1];
    }
    for (const a of Object.keys(st.res)) {
        const res = st.res[a], len = acts[a] && acts[a].opts ? acts[a].opts.length : 6;
        res.n = new Array(len).fill(0);
        for (const id of Object.keys(res.by)) if (res.by[id] < len) res.n[res.by[id]]++;
    }
    st.meta.name = name; st.meta.code = planCode(name); st.meta.test = name.slice(-5) === '.test';
    return st;
}
/* the value to store under a key named in "dirty" (undefined: delete the key) */
export function part(st, key) {
    if (key === 'meta' || key === 'plan') return st[key];
    const i = key.indexOf(':'), kind = key.slice(0, i), rest = key.slice(i + 1);
    if (kind === 'ph') {
        const id = st.toks[rest], p = id && st.players[id];
        return p ? { id: id, n: p.n, s: p.s } : undefined;
    }
    if (kind === 'q') {
        const q = st.qs.filter(function (x) { return String(x.id) === rest; })[0];
        return q ? { id: q.id, x: q.x, by: q.by, st: q.st, big: !!q.big, at: q.at } : undefined;
    }
    if (kind === 'v') {
        const j = rest.indexOf(':'), res = st.res[rest.slice(0, j)], id = rest.slice(j + 1);
        if (!res || res.by[id] === undefined) return undefined;
        return res.p[id] === undefined ? [res.by[id]] : [res.by[id], res.p[id]];
    }
    if (kind === 'u') {
        const j = rest.indexOf(':'), q = st.qs.filter(function (x) { return String(x.id) === rest.slice(0, j); })[0];
        return q && q.up.indexOf(rest.slice(j + 1)) >= 0 ? 1 : undefined;
    }
    return undefined;
}
/* every stored key that holds audience data */
export function audienceKeys(st) {
    const keys = [];
    for (const id of Object.keys(st.players)) keys.push('ph:' + st.players[id].tok);
    for (const q of st.qs) { keys.push('q:' + q.id); for (const u of q.up) keys.push('u:' + q.id + ':' + u); }
    for (const a of Object.keys(st.res)) for (const id of Object.keys(st.res[a].by)) keys.push('v:' + a + ':' + id);
    return keys;
}

/* ---------- small helpers ---------- */
function result() { return { dirty: [], del: [], out: [] }; }
function views(r) { r.out.push({ to: 'aud', view: true }, { to: 'pres', view: true }); return r; }
function me(r, m) { r.out.push({ to: 'me', m: m }); return r; }
function err(e, close) { const r = result(); me(r, { t: 'err', e: e }); if (close) r.close = close; return r; }
function cur(st) { const m = st.meta; return m.s === 'live' && m.cur >= 0 && m.cur < m.acts.length ? m.acts[m.cur] : null; }
function onScreen(st) { const a = cur(st); return a && st.meta.ph === 'open' ? a : null; }
function bucket(att, k, now, cap, ms) {
    const at = att[k + 't'] || now, have = Math.min(cap, (att[k] === undefined ? cap : att[k]) + (now - at) / ms);
    att[k + 't'] = now;
    if (have < 1) { att[k] = have; return false; }
    att[k] = have - 1;
    return true;
}
function total(n) { return n.reduce(function (s, x) { return s + x; }, 0); }
function copy(o) { return JSON.parse(JSON.stringify(o)); }
function resOf(st, a) { return st.res[a.id] || (st.res[a.id] = { n: a.opts.map(function () { return 0; }), by: map(), p: map() }); }

/* the join secret phones must give now: the one copied at the start, or before it the plan's */
export function joinFor(st) {
    const m = st.meta;
    if (m.s === 'live' || m.s === 'ended') return m.join || '';
    if (!st.plan) return '';
    return (m.test ? st.plan.tjoin : st.plan.join) || '';
}

/* This connection's phone, as stored: another connection of the same browser may have been given its id first (then
   this one takes it over); a phone that keeps something for the first time is added (at most LIMITS.ids). Answers
   the player, or null when the session is full. */
function adopt(st, att) { const known = st.toks[att.tok]; if (known) att.id = known; }
function own(st, att, r) {
    adopt(st, att);
    let p = st.players[att.id];
    if (!p) {
        if (Object.keys(st.players).length >= LIMITS.ids) return null;
        p = st.players[att.id] = { tok: att.tok, n: '', s: '' };
        st.toks[att.tok] = att.id;
        r.dirty.push('ph:' + att.tok);
    }
    r.att = att;
    return p;
}

/* A guest's name on the ranking when no nickname was given (or it is not shown): "Guest 123", the same for the same
   phone in one session */
export function guest(id) {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000003;
    return 'Guest ' + (100 + h % 900);
}
/* the name others see: the nickname once the presenter has shown it, otherwise the guest name */
function shownName(st, id) { const p = st.players[id]; return p && p.n && p.s === 'ok' ? p.n : guest(id); }
/* points of one quiz answer: 500 to 1000 for a correct one (the faster the more), 0 otherwise */
export function points(ok, ms, secs) {
    if (!ok) return 0;
    const t = Math.min(Math.max(ms, 0), secs * 1000) / (secs * 1000);
    return Math.round(1000 - 500 * t);
}
/* the ranking, from the quizzes whose answers are revealed: [{ id, n (as others see it), own (the nickname), p, c }]
   best first */
export function ranking(st) {
    const by = map(), m = st.meta;
    for (const a of m.acts) {
        if (a.type !== 'quiz' || !m.shown[a.id] || !st.res[a.id]) continue;
        const p = st.res[a.id].p;
        for (const id of Object.keys(p)) {
            const e = by[id] || (by[id] = { id: id, p: 0, c: 0 });
            e.p += p[id];
            if (p[id] > 0) e.c++;
        }
    }
    return Object.keys(by).map(function (k) {
        const e = by[k], pl = st.players[k];
        e.n = shownName(st, k); e.own = pl && pl.n ? pl.n : '';
        return e;
    }).sort(function (x, y) { return y.p - x.p || y.c - x.c || (x.id < y.id ? -1 : 1); });
}
/* the top n; a phone sees its own nickname in its own row even before the presenter shows it to everyone */
function top(rank, n, self) { return rank.slice(0, n).map(function (e) { return { n: e.id === self && e.own ? e.own : e.n, p: e.p }; }); }
function boardOn(st) { const a = onScreen(st); return st.meta.board || !!(a && a.type === 'leaderboard') || st.meta.s === 'ended'; }
function hasQuiz(st) { return st.meta.acts.some(function (a) { return a.type === 'quiz' && st.meta.shown[a.id]; }); }
function askNow(st) { const a = onScreen(st); return st.meta.s === 'live' && (st.meta.ask || !!(a && a.type === 'questions')); }
function reactNow(st) { const a = onScreen(st); return st.meta.s === 'live' && (st.meta.react || !!(a && a.type === 'reactions')); }
function left(st, a, now) {
    if (a.type !== 'quiz') return undefined;
    return Math.max(0, (st.meta.opened[a.id] || now) + a.secs * 1000 - now);
}

/* ---------- views ---------- */
/* what one phone (id) shows now. memo: an object shared by the calls of one broadcast, so the ranking is worked out
   once for all phones */
export function audienceView(st, id, now, memo) {
    const m = st.meta, v = { t: 'state', s: m.s, title: m.title, test: m.test, ask: askNow(st), react: reactNow(st), act: null };
    if (m.s === 'none') return v;
    id = id || '';
    const pl = st.players[id];
    v.me = { n: pl ? pl.n : '', ns: pl && pl.n ? pl.s : '', guest: guest(id) };
    /* does this talk have quiz questions (then phones offer a nickname for the ranking)? */
    v.quiz = (m.s === 'waiting' && st.plan ? st.plan.acts : m.acts).some(function (a) { return a.type === 'quiz'; });
    const a = onScreen(st);
    if (a) {
        const x = { id: a.id, type: a.type, q: a.q, shown: !!m.shown[a.id] };
        if (a.opts) x.opts = a.opts;
        const res = st.res[a.id];
        if (VOTE_TYPES.indexOf(a.type) >= 0 && res) {
            if (res.by[id] !== undefined) x.mine = res.by[id];
            if (x.shown || (a.type === 'poll' && m.live[a.id])) { x.n = res.n; x.total = total(res.n); }
        }
        if (a.type === 'quiz') {
            x.secs = a.secs;
            x.left = left(st, a, now);
            if (x.shown) {
                x.correct = a.correct;
                x.ok = x.mine !== undefined && a.correct.indexOf(x.mine) >= 0;
                x.pts = res && res.p[id] || 0;
            }
        }
        v.act = x;
    }
    if (hasQuiz(st)) {
        memo = memo || {};
        const rank = memo.rank || (memo.rank = ranking(st));
        if (!memo.pos) { memo.pos = map(); rank.forEach(function (e, k) { memo.pos[e.id] = k; }); }
        const i = memo.pos[id] === undefined ? -1 : memo.pos[id];
        v.me.p = i >= 0 ? rank[i].p : 0;
        if (i >= 0) v.me.rank = i + 1;
        v.me.of = rank.length;
        if ((a && a.type === 'leaderboard') || m.board || m.s === 'ended') v.top = top(rank, 10, id);
    }
    if (v.ask || (a && a.type === 'questions')) {
        v.qs = st.qs.filter(function (q) { return q.st === 'shown' || (q.st === 'new' && q.by === id); })
            .map(function (q) { return { id: q.id, x: q.x, up: q.up.length, st: q.st, mine: q.by === id, v: q.up.indexOf(id) >= 0 }; })
            .sort(function (x, y) { return y.up - x.up || x.id - y.id; });
    }
    return v;
}

/* what the projector and the presenter's remote show: everything, with the correct answers and the join secret, but
   on the ranking only the nicknames the presenter has shown (the remote lists the others to decide on) */
export function presenterView(st, now, aud) {
    const m = st.meta;
    const v = { t: 'pstate', s: m.s, name: m.name, code: m.code, test: m.test, title: m.title, ask: m.ask, react: m.react,
        cur: m.cur, ph: m.ph, qr: m.qr, board: m.board, n: aud || 0, started: m.started, ended: m.ended, plan: !!st.plan,
        join: joinFor(st) };
    const acts = m.s === 'waiting' || m.s === 'none' ? (st.plan ? st.plan.acts : []) : m.acts;
    v.acts = acts.map(function (a) {
        const r = st.res[a.id];
        return { id: a.id, type: a.type, q: a.q, quick: !!a.quick, shown: !!m.shown[a.id], total: r ? total(r.n) : 0 };
    });
    const a = cur(st);
    if (a) {
        const x = copy(a);
        x.shown = !!m.shown[a.id];
        x.live = !!m.live[a.id];
        const r = st.res[a.id];
        if (r) { x.n = r.n; x.total = total(r.n); }
        if (a.type === 'quiz') x.left = left(st, a, now);
        v.act = x;
    } else v.act = null;
    v.qs = st.qs.map(function (q) { return { id: q.id, x: q.x, up: q.up.length, st: q.st, big: !!q.big, at: q.at }; });
    const rank = ranking(st);
    v.top = top(rank, 10, null);
    v.players = rank.length;
    const waiting = [], off = [], shown = [];
    let ok = 0;
    for (const id of Object.keys(st.players)) {
        const p = st.players[id];
        if (!p.n) continue;
        if (p.s === 'ok') { ok++; shown.push(p.n); }
        else if (p.s === 'no') off.push(p.n);
        else waiting.push(p.n);
    }
    /* waiting: only from talks saved before nicknames were shown at once */
    v.names = { waiting: waiting.slice(0, NAMES_NEW), off: off.slice(-NAMES_NO), shown: shown.slice(-NAMES_NEW), nw: waiting.length, nno: off.length, nok: ok };
    return v;
}

/* ---------- the plan arrives (saved or deleted on the presenter page) ---------- */
function waitFor(m, plan) {
    m.s = 'waiting'; m.title = plan.title; m.ask = !!plan.ask; m.react = !!plan.react;
}
export function setPlan(st, plan) {
    const m = st.meta;
    if ((m.s === 'none' || m.s === 'waiting') && !plan) {
        /* deleted before it was held: whatever phones left before the start goes now, and they are sent away */
        st.plan = null;
        const r = purge(st);
        r.dirty.push('plan');
        return r;
    }
    const r = result();
    st.plan = plan || null;
    r.dirty.push('plan');
    if (m.s === 'none' || m.s === 'waiting') {
        waitFor(m, plan);
        r.dirty.push('meta');
        views(r);
    }
    return r;
}

/* ---------- start, end, delete ---------- */
function start(st, now) {
    const r = result(), m = st.meta;
    if (m.s === 'live') return views(r);
    if (!st.plan) return err('noplan');
    if (m.s === 'ended') wipe(st, r);
    const p = st.plan;
    Object.assign(m, { s: 'live', title: p.title, ask: p.ask, react: p.react, acts: copy(p.acts), cur: -1, ph: 'idle',
        opened: {}, shown: {}, live: {}, qr: false, board: false, started: now, ended: 0, last: now,
        join: (m.test ? p.tjoin : p.join) || '', wdue: 0 });
    for (const a of m.acts) if (a.type === 'poll' && a.live) m.live[a.id] = true;
    r.dirty.push('meta');
    r.alarm = now + IDLE;
    return views(r);
}
/* the audience data goes (votes, questions, nicknames); the plan stays */
function wipe(st, r) {
    r.del = r.del.concat(audienceKeys(st));
    st.res = map(); st.players = map(); st.toks = map(); st.qs = [];
}
export function end(st, now) {
    const r = result(), m = st.meta;
    if (m.s !== 'live') return r;
    m.s = 'ended'; m.ended = now; m.ph = 'idle'; m.qr = false; m.board = false;
    for (const q of st.qs) if (q.big) { q.big = false; r.dirty.push('q:' + q.id); }
    r.dirty.push('meta');
    r.alarm = now + KEEP;
    return views(r);
}
/* back to "waiting" (or "none" without a plan) with nothing kept but the plan (the 24 hour deletion, a rehearsal's
   "start fresh", the presenter page's "delete the results now", or the plan deleted before the talk). Without a plan
   the phones are sent away (r.kick) and index.js deletes everything. */
export function purge(st) {
    const r = result(), plan = st.plan;
    wipe(st, r);
    st.meta = blank(st.meta.name).meta;
    r.dirty.push('meta');
    r.alarm = 0;
    if (plan) waitFor(st.meta, plan); else r.kick = 4004;
    return views(r);
}
/* what the alarm should do now: { act: "end" | "purge" | null, at: when the next alarm is due (ms) or 0 for none } */
export function alarmStep(st, now) {
    const m = st.meta;
    if (m.s === 'live') {
        const due = (m.last || m.started || now) + IDLE;
        return now >= due ? { act: 'end', at: now + KEEP } : { act: null, at: due };
    }
    if (m.s === 'ended') {
        const due = (m.ended || now) + KEEP;
        return now >= due ? { act: 'purge', at: 0 } : { act: null, at: due };
    }
    /* nicknames given while the talk was waiting, and it has not started within 24 hours of the last one */
    if (m.wdue) return now >= m.wdue ? { act: 'purge', at: 0 } : { act: null, at: m.wdue };
    return { act: null, at: 0 };
}

/* ---------- moving through the activities ---------- */
function go(st, i, now) {
    const m = st.meta;
    if (!(Number.isInteger(i) && i >= 0 && i < m.acts.length)) return false;
    const a = m.acts[i];
    m.cur = i; m.ph = 'open'; m.qr = false; m.board = false;
    if (!m.opened[a.id]) m.opened[a.id] = now;
    if (VOTE_TYPES.indexOf(a.type) >= 0) resOf(st, a);
    return true;
}

function presenter(st, att, msg, info) {
    const m = st.meta, now = info.now, r = result();
    const live = m.s === 'live';
    switch (msg.t) {
    case 'start': return start(st, now);
    case 'end': return end(st, now);
    case 'reset': return purge(st);
    case 'next':
        if (!live) return err('notlive');
        /* past the last activity: nothing on screen, "prev" comes back to the last one */
        if (!go(st, m.cur + 1, now)) { m.ph = 'idle'; m.cur = m.acts.length; }
        break;
    case 'prev':
        if (!live) return err('notlive');
        if (!go(st, Math.min(m.cur, m.acts.length) - 1, now)) return views(r);
        break;
    case 'go':
        if (!live || !go(st, msg.i, now)) return err('bad');
        break;
    case 'close': if (!live) return err('notlive'); m.ph = 'idle'; m.board = false; break;
    case 'reveal': case 'hide': {
        const a = onScreen(st);
        if (!a || VOTE_TYPES.indexOf(a.type) < 0) return err('bad');
        if (msg.t === 'reveal') m.shown[a.id] = true; else delete m.shown[a.id];
        break;
    }
    case 'live': {
        const a = cur(st);
        if (!a || a.type !== 'poll') return err('bad');
        if (msg.on) m.live[a.id] = true; else delete m.live[a.id];
        break;
    }
    case 'qr': m.qr = msg.on === undefined ? !m.qr : !!msg.on; break;
    case 'board':
        if (!live) return err('notlive');
        m.board = msg.on === undefined ? !m.board : !!msg.on;
        break;
    case 'quick': {
        if (!live) return err('notlive');
        if (m.acts.filter(function (a) { return a.quick; }).length >= LIMITS.quick) return err('toomany');
        const opts = Array.isArray(msg.opts) && msg.opts.length ? msg.opts : ['Yes', 'No'];
        const c = checkAct({ type: 'poll', q: msg.q, opts: opts, live: true }, 1);
        if (c.error) return me(result(), { t: 'err', e: 'quick', x: c.error.replace(/^Activity 1: /, '') });
        const taken = {};
        for (const a of m.acts) taken[a.id] = true;
        c.act.id = newId(info.rand || Math.random, taken);
        c.act.quick = true;
        const at = Math.min(Math.max(m.cur + 1, 0), m.acts.length);
        m.acts.splice(at, 0, c.act);
        m.live[c.act.id] = true;
        go(st, at, now);
        break;
    }
    case 'qset': case 'qbig': {
        const q = st.qs.filter(function (x) { return x.id === msg.q; })[0];
        if (!q) return err('bad');
        if (msg.t === 'qset') {
            if (['new', 'shown', 'hidden'].indexOf(msg.st) < 0) return err('bad');
            q.st = msg.st;
            if (q.st !== 'shown') q.big = false;
            r.dirty.push('q:' + q.id);
        } else {
            const on = !q.big;
            for (const x of st.qs) if (x.big && x !== q) { x.big = false; r.dirty.push('q:' + x.id); }
            q.big = on && q.st === 'shown';
            r.dirty.push('q:' + q.id);
        }
        break;
    }
    case 'name': case 'names': {
        /* nicknames reach the projector and the other phones only once shown here (by the name: they are unique).
           Each phone concerned hears it ({to: "who"}); all phones redraw only when the ranking is on screen. */
        if (msg.t === 'name' && (['ok', 'no'].indexOf(msg.s) < 0 || typeof msg.n !== 'string' || !msg.n)) return err('bad');
        const low = msg.t === 'name' ? msg.n.toLowerCase() : null;
        let hit = 0;
        for (const id of Object.keys(st.players)) {
            const p = st.players[id];
            if (!p.n) continue;
            if (low !== null ? p.n.toLowerCase() !== low : p.s === 'ok' || p.s === 'no') continue;
            p.s = low !== null ? msg.s : 'ok';
            r.dirty.push('ph:' + p.tok);
            r.out.push({ to: 'who', id: id, m: { t: 'nick', ok: true, n: p.n, s: p.s } });
            hit++;
        }
        if (low !== null && !hit) return err('bad');
        r.out.push({ to: 'pres', view: true });
        if (boardOn(st)) r.out.push({ to: 'aud', view: true });
        return r;
    }
    default: return err('unknown');
    }
    m.last = now;
    if (r.dirty.indexOf('meta') < 0) r.dirty.push('meta');
    return views(r);
}

/* ---------- the audience ---------- */
function audience(st, att, msg, info) {
    const m = st.meta, now = info.now, r = result();
    switch (msg.t) {
    case 'nick': {
        if (m.s === 'none') return err('bad');
        const n = clean(msg.n, LIMITS.nick);
        if (n && !nameOk(n)) return me(r, { t: 'nick', ok: false, e: 'name' });
        adopt(st, att);
        const low = n.toLowerCase();
        if (n) for (const k of Object.keys(st.players)) if (k !== att.id && st.players[k].n.toLowerCase() === low) return me(r, { t: 'nick', ok: false, e: 'taken' });
        const p = own(st, att, r);
        if (!p) return me(r, { t: 'nick', ok: false, e: 'full' });
        /* a nickname that passes the word filter (nameOk) is shown at once; the presenter can still hide it ("name",
           s: "no"); the same one again keeps its state */
        if (p.n !== n) { p.n = n; p.s = n ? 'ok' : ''; }
        r.dirty.push('ph:' + p.tok);
        if (m.s === 'waiting' && n) {
            /* if the talk never starts, nicknames given before it are deleted 24 hours after the last one */
            m.wdue = now + KEEP;
            r.dirty.push('meta');
            r.alarm = m.wdue;
        }
        me(r, { t: 'nick', ok: true, n: n, s: p.s });
        /* the remote lists it (to hide if needed); phones redraw only when the ranking is on screen */
        r.out.push({ to: 'pres', view: true });
        if (boardOn(st)) r.out.push({ to: 'aud', view: true });
        return r;
    }
    case 'vote': {
        const a = onScreen(st);
        if (!a || a.id !== msg.a || VOTE_TYPES.indexOf(a.type) < 0) return err('closed');
        const res = resOf(st, a);
        adopt(st, att);
        if (res.by[att.id] !== undefined || (att.v || []).indexOf(a.id) >= 0) { r.att = att; return me(r, { t: 'voted', a: a.id, c: res.by[att.id] }); }
        if (m.shown[a.id]) return err('closed');
        const c = msg.c;
        if (!(Number.isInteger(c) && c >= 0 && c < a.opts.length)) return err('bad');
        const ms = now - (m.opened[a.id] || now);
        if (a.type === 'quiz' && ms > a.secs * 1000 + GRACE) return err('late');
        if (!own(st, att, r)) return err('full');
        const id = att.id;
        res.n[c]++;
        res.by[id] = c;
        if (a.type === 'quiz') res.p[id] = points(a.correct.indexOf(c) >= 0, ms, a.secs);
        att.v = (att.v || []).concat([a.id]).slice(-80);
        r.att = att;
        r.dirty.push('v:' + a.id + ':' + id);
        me(r, { t: 'voted', a: a.id, c: c });
        const up = { t: 'votes', a: a.id, n: res.n, total: total(res.n) };
        r.out.push({ to: 'pres', m: up });
        if (a.type === 'poll' && m.live[a.id]) r.out.push({ to: 'aud', m: up, coalesce: 'votes' });
        return r;
    }
    case 'ask': {
        if (!askNow(st)) return err('closed');
        const x = clean(msg.x, LIMITS.ask);
        if (Array.from(x).length < 3) return err('short');
        if (now - (att.qa || 0) < ASK_GAP) return err('wait');
        adopt(st, att);
        if (st.qs.filter(function (q) { return q.by === att.id; }).length >= ASK_MAX) return err('askmax');
        if (st.qs.length >= Q_MAX) return err('full');
        if (!own(st, att, r)) return err('full');
        const id = st.qs.reduce(function (s, q) { return Math.max(s, q.id); }, 0) + 1;
        const q = { id: id, x: x, by: att.id, up: [], st: 'new', big: false, at: now };
        st.qs.push(q);
        att.qa = now;
        r.att = att;
        r.dirty.push('q:' + id);
        me(r, { t: 'asked', q: { id: id, x: x, up: 0, st: 'new', mine: true, v: false } });
        r.out.push({ to: 'pres', m: { t: 'q', q: { id: id, x: x, up: 0, st: 'new', big: false, at: now } } });
        return r;
    }
    case 'up': {
        const q = st.qs.filter(function (x) { return x.id === msg.q; })[0];
        if (!q || q.st !== 'shown' || m.s !== 'live') return err('bad');
        adopt(st, att);
        if (q.by === att.id || q.up.indexOf(att.id) >= 0) { r.att = att; return r; }
        if (!own(st, att, r)) return err('full');
        q.up.push(att.id);
        r.dirty.push('u:' + q.id + ':' + att.id);
        const up = { t: 'qup', q: q.id, up: q.up.length };
        r.out.push({ to: 'pres', m: up }, { to: 'aud', m: up, coalesce: 'qup' + q.id });
        return r;
    }
    case 'react': {
        if (!reactNow(st)) return err('closed');
        if (!(Number.isInteger(msg.e) && msg.e >= 0 && msg.e < EMOJI)) return err('bad');
        const ok = bucket(att, 'e', now, RE_CAP, RE_MS);
        r.att = att;
        if (!ok) return r;
        /* everyone together: at most RE_ALL a second reach the projector (this memory is lost when the object sleeps,
           which is fine: it only matters while many people tap at once) */
        const mem = info.mem || {};
        mem.re = (mem.re || []).filter(function (t) { return now - t < 1000; });
        if (mem.re.length >= RE_ALL) return r;
        mem.re.push(now);
        r.out.push({ to: 'pres', m: { t: 'react', e: msg.e } });
        return r;
    }
    default: return err('unknown');
    }
}

/* ---------- a new connection ---------- */
/* Who makes room for a new connection, and whether it may stay. socks: the open connections of the same role, as
   [{ ok (has said hello), at (ms, when it connected), ip (true: from the same address as the new one) }].
   Answers { drop: [indexes of connections to close], full: true when the new one has to go }.
   - a connection that has not said hello within LIMITS.hello is closed (an attacker cannot hold places with pings,
     which the auto-response answers without waking the object);
   - phones: at most LIMITS.aud joined, LIMITS.ipConn from one address, LIMITS.audAll in all, the oldest that has not
     said hello making room;
   - presenters: at most LIMITS.pres, and the presenter always gets in (the oldest without the key makes room). */
export function admit(role, socks, now) {
    const drop = [], keep = [];
    socks.forEach(function (s, i) { if (!s.ok && now - (s.at || 0) > LIMITS.hello) drop.push(i); else keep.push(i); });
    const byAt = function (x, y) { return (socks[x].at || 0) - (socks[y].at || 0); };
    const waiting = keep.filter(function (i) { return !socks[i].ok; }).sort(byAt);
    if (role === 'p') {
        if (keep.length < LIMITS.pres) return { drop: drop, full: false };
        if (!waiting.length) return { drop: drop, full: true };
        drop.push(waiting[0]);
        return { drop: drop, full: false };
    }
    if (keep.filter(function (i) { return socks[i].ok; }).length >= LIMITS.aud) return { drop: drop, full: true };
    if (keep.filter(function (i) { return socks[i].ip; }).length >= LIMITS.ipConn) return { drop: drop, full: true };
    let n = keep.length;
    while (n + 1 > LIMITS.audAll && waiting.length) { drop.push(waiting.shift()); n--; }
    return { drop: drop, full: n + 1 > LIMITS.audAll };
}

/* ---------- one message ---------- */
/* att: the connection's attachment { r: "a" | "p", ok, at, name, c, tok, id, ... } (index.js saves it again when r.att
   is set). info: { now, aud (phones joined, not counting this connection; needed for "hi"), keyOk(key), rand,
   bytes(n) (random bytes from a CSPRNG), ip (this connection's address key, or ""), mem (memory kept while the object
   is awake) }.
   Answers { dirty: [keys to write], del: [keys to delete], out: [{ to: "me" | "aud" | "pres", m } or { to, view: true }
   or { to: "who", id, m } (the phones with that id)],
   att?, close? (a close code), alarm? (ms, 0 = none), kick? (close every phone with this code) }. */
export function handle(st, att, msg, info) {
    const now = info.now;
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return err('bad', 4000);
    att = Object.assign({}, att);
    if (!bucket(att, 'b', now, MSG_CAP, MSG_MS)) { const r = err('slow', 4008); r.att = att; return r; }
    let r;
    if (!att.ok) {
        if (msg.t !== 'hi') { r = err('hello', 4000); r.att = att; return r; }
        if (att.r === 'p') {
            if (!info.keyOk(msg.key)) { r = err('key', 4001); r.att = att; return r; }
            att.ok = true;
            r = result();
            r.out.push({ to: 'me', m: presenterView(st, now, info.aud) });
        } else {
            r = hello(st, att, msg, info);
            if (r) { r.att = att; return r; }
            r = result();
            r.out.push({ to: 'me', m: audienceView(st, att.id, now) });
            r.out.push({ to: 'pres', m: { t: 'n', n: (info.aud || 0) + 1 } });
        }
        r.att = att;
        return r;
    }
    if (msg.t === 'hi') {
        /* one connection is one phone: a second hello with another token closes it */
        r = result(); r.att = att;
        if (att.r === 'a' && msg.tok !== att.tok) { me(r, { t: 'err', e: 'token' }); r.close = 4000; }
        return r;
    }
    r = att.r === 'p' ? presenter(st, att, msg, info) : audience(st, att, msg, info);
    r.att = Object.assign(att, r.att || {});
    return r;
}
/* a phone's hello: answers a result to send back when it may not join, or null after joining it (att.ok, att.id) */
function hello(st, att, msg, info) {
    if (typeof msg.tok !== 'string' || !TOKEN.test(msg.tok)) return err('token', 4000);
    if (st.meta.s === 'none') { const r = me(result(), audienceView(st, '', info.now)); r.close = 4004; return r; }
    if (!same(msg.k, joinFor(st))) return err('join', 4005);
    if ((info.aud || 0) >= LIMITS.aud) return err('full', 4003);
    let id = st.toks[msg.tok];
    if (!id) {
        /* a new phone: an id from the CSPRNG, and at most LIMITS.ipNew new phones from one address (counted only in
           memory, which is lost when the object sleeps) */
        const mem = info.mem || {};
        const mint = mem.mint || (mem.mint = map());
        if (info.ip && (mint[info.ip] || 0) >= LIMITS.ipNew) return err('full', 4003);
        if (info.ip) mint[info.ip] = (mint[info.ip] || 0) + 1;
        id = secret(info.bytes, ID_LEN);
        st.toks[msg.tok] = id;
    }
    att.ok = true; att.tok = msg.tok; att.id = id; att.v = [];
    return null;
}

/* ---------- the results file ---------- */
export function exportResults(st, now) {
    const m = st.meta;
    const rank = ranking(st);
    return {
        talk: { code: m.code, title: m.title, rehearsal: m.test, state: m.s, started: iso(m.started), ended: iso(m.ended),
            deleted: m.ended ? iso(m.ended + KEEP) : null },
        exported: iso(now),
        activities: m.acts.map(function (a, i) {
            const x = { n: i + 1, type: a.type, question: a.q };
            if (a.quick) x.quick = true;
            if (a.opts) {
                const res = st.res[a.id];
                x.answers = a.opts.map(function (o, k) {
                    const e = { answer: o, votes: res ? res.n[k] : 0 };
                    if (a.correct) e.correct = a.correct.indexOf(k) >= 0;
                    return e;
                });
                x.total = res ? total(res.n) : 0;
                x.revealed = !!m.shown[a.id];
            }
            if (a.secs) x.seconds = a.secs;
            return x;
        }),
        ranking: rank.map(function (e, i) {
            return { rank: i + 1, name: e.own || e.n, shown: !!e.own && e.n === e.own, points: e.p, correct: e.c };
        }),
        questions: st.qs.map(function (q) { return { text: q.x, upvotes: q.up.length, status: q.st, at: iso(q.at) }; })
    };
}
function iso(t) { return t ? new Date(t).toISOString() : null; }
