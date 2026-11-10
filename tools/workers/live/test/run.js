// Tests of the pure logic (plan.js, session.js), in plain node (12 or later): node tools/workers/live/test/run.js
import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as P from '../src/plan.js';
import * as S from '../src/session.js';

let passed = 0, failed = 0;
function test(name, fn) {
    try { fn(); passed++; } catch (e) { failed++; console.log('FAIL ' + name + '\n   ' + (e && e.stack || e).split('\n').slice(0, 3).join('\n   ')); }
}
const KEY = 'Aa1' + 'x'.repeat(30);  // a made-up test key, not a real one
function seq(seed) { let x = seed || 1; return function () { x = (x * 16807) % 2147483647; return x / 2147483647; }; }
function rnd(n) { return crypto.randomBytes(n); }

/* ---------- plan.js ---------- */
test('codes', function () {
    ['pkc27', 'ab', 'eurocrypt-2027', 'a1'].forEach(function (c) { assert.ok(P.codeOk(c), c); });
    ['a', 'PKC27', 'pkc 27', '-ab', 'ab-', 'a--b', 'x'.repeat(21), 'pkc27.test', '', null].forEach(function (c) { assert.ok(!P.codeOk(c), String(c)); });
    assert.ok(P.sessionOk('pkc27.test'));
    assert.ok(!P.sessionOk('pkc27.test.test'));
    assert.strictEqual(P.planCode('pkc27.test'), 'pkc27');
});

test('clean text', function () {
    assert.strictEqual(P.clean('  a \n\t b\u0000c  ', 50), 'a b c');
    assert.strictEqual(P.clean('abcdef', 3), 'abc');
    assert.strictEqual(P.clean('😀😀😀', 2), '😀😀');
    assert.strictEqual(P.clean(5, 10), '');
});

const goodPlan = {
    title: '  Fuzzy PSI from IPE ', ask: true, react: true,
    acts: [
        { type: 'poll', q: 'Have you used PSI?', opts: ['Yes', 'No', 'What is PSI?'] },
        { type: 'quiz', q: 'Which is post-quantum?', opts: ['RSA', 'ECDH', 'Kyber', 'DH'], correct: [2], secs: 20 },
        { type: 'questions', q: '' },
        { type: 'reactions', q: 'How was the demo?' },
        { type: 'leaderboard' }
    ]
};

test('a good plan', function () {
    const r = P.checkPlan(goodPlan, 'pkc27', seq(3));
    assert.ok(!r.error, r.error);
    assert.strictEqual(r.plan.title, 'Fuzzy PSI from IPE');
    assert.strictEqual(r.plan.acts.length, 5);
    const ids = r.plan.acts.map(function (a) { return a.id; });
    assert.strictEqual(new Set(ids).size, 5);
    ids.forEach(function (id) { assert.ok(/^[a-z0-9]{6}$/.test(id)); });
    assert.strictEqual(r.plan.acts[0].live, false);
    assert.deepStrictEqual(r.plan.acts[1].correct, [2]);
    assert.strictEqual(r.plan.acts[2].q, 'Questions for the speaker');
    assert.strictEqual(r.plan.acts[4].q, 'Quiz ranking');
    /* saved again with its ids: the ids stay */
    const again = P.checkPlan(r.plan, 'pkc27', seq(9));
    assert.deepStrictEqual(again.plan.acts.map(function (a) { return a.id; }), ids);
});

test('bad plans', function () {
    function bad(p, code) { const r = P.checkPlan(p, code || 'pkc27'); assert.ok(r.error, JSON.stringify(p)); return r.error; }
    bad(null); bad([]); bad({ title: '', acts: [] }); bad({ title: 'x' });
    bad({ title: 'x', acts: [] }, 'BAD');
    bad({ title: 'x', acts: [{ type: 'nope' }] });
    bad({ title: 'x', acts: [{ type: 'poll', q: 'q', opts: ['only one'] }] });
    bad({ title: 'x', acts: [{ type: 'poll', q: 'q', opts: ['a', ''] }] });
    bad({ title: 'x', acts: [{ type: 'poll', q: '', opts: ['a', 'b'] }] });
    bad({ title: 'x', acts: [{ type: 'poll', q: 'q', opts: ['1', '2', '3', '4', '5', '6', '7'] }] });
    bad({ title: 'x', acts: [{ type: 'quiz', q: 'q', opts: ['a', 'b'], correct: [] }] });
    bad({ title: 'x', acts: [{ type: 'quiz', q: 'q', opts: ['a', 'b'], correct: [0, 1] }] });
    bad({ title: 'x', acts: [{ type: 'quiz', q: 'q', opts: ['a', 'b'], correct: [2] }] });
    bad({ title: 'x', acts: [{ type: 'quiz', q: 'q', opts: ['a', 'b'], correct: ['0'] }] });
    const many = []; for (let i = 0; i < P.LIMITS.acts + 1; i++) many.push({ type: 'questions' });
    assert.ok(/at most/.test(bad({ title: 'x', acts: many })));
    assert.ok(/Activity 2/.test(bad({ title: 'x', acts: [{ type: 'questions' }, { type: 'poll', q: 'q', opts: ['a'] }] })));
});

test('quiz seconds are kept in range', function () {
    const r = P.checkPlan({ title: 'x', acts: [{ type: 'quiz', q: 'q', opts: ['a', 'b'], correct: [0], secs: 9999 },
        { type: 'quiz', q: 'q', opts: ['a', 'b'], correct: [1], secs: 1 }, { type: 'quiz', q: 'q', opts: ['a', 'b'], correct: [1, 1] }] }, 'ab');
    assert.strictEqual(r.plan.acts[0].secs, P.LIMITS.maxSecs);
    assert.strictEqual(r.plan.acts[1].secs, P.LIMITS.minSecs);
    assert.strictEqual(r.plan.acts[2].secs, 20);
    assert.deepStrictEqual(r.plan.acts[2].correct, [1]);
});

test('duplicate or bad ids are replaced', function () {
    const r = P.checkPlan({ title: 'x', acts: [{ id: 'aaaaaa', type: 'questions' }, { id: 'aaaaaa', type: 'questions' }, { id: 'BAD!', type: 'questions' }] }, 'ab', seq(5));
    const ids = r.plan.acts.map(function (a) { return a.id; });
    assert.strictEqual(ids[0], 'aaaaaa');
    assert.notStrictEqual(ids[1], 'aaaaaa');
    assert.ok(/^[a-z0-9]{6}$/.test(ids[2]));
});

test('nicknames', function () {
    ['Milo', 'Anna B.', 'Jo', 'Zoë', "O'Neil", 'crypto_fan'].forEach(function (n) { assert.ok(P.nameOk(n), n); });
    ['M', 'x'.repeat(21), ' Milo', 'Milo  B', 'Sh1t', 'b.i.t.c.h', 'florias', 'Admin', 'a<b>', ''].forEach(function (n) { assert.ok(!P.nameOk(n), n); });
});

test('the nickname filter is the leaderboards worker\'s, unchanged', function () {
    const w = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../../stats/worker.js'), 'utf8');
    /* the same lists */
    const short = /const SHORT = new Set\((\[[^\]]*\])\)/.exec(w), long = /const LONG = (\[[^\]]*\])/.exec(w);
    assert.ok(short && long, 'SHORT or LONG not found in the stats worker');
    assert.deepStrictEqual(eval(short[1]), Array.from(P.SHORT));  // eslint-disable-line no-eval
    assert.deepStrictEqual(eval(long[1]), P.LONG);  // eslint-disable-line no-eval
    /* the same code: the stats worker's constants and functions, run on their own, answer as plan.js does */
    const from = w.indexOf('const SHORT = new Set('), to = w.indexOf(']);', w.indexOf('const FOLD = new Map(')) + 3;
    const fn = function (name) { const i = w.indexOf('function ' + name + '('); return w.slice(i, w.indexOf('\n}\n', i) + 2); };
    assert.ok(from > 0 && to > from, 'the constants were not found');
    const box = {};
    vm.createContext(box);
    vm.runInContext(w.slice(from, to) + '\n' + fn('fold') + '\n' + fn('words') + '\n' + fn('nameOk') + '\nthis.nameOk = nameOk;', box);
    const names = ['Milo', 'Anna B.', 'Jo', 'Zoë', "O'Neil", 'crypto_fan', 'Essex', 'Dickens', 'Badminton', 'Nazir', 'Gamora', 'M', 'x'.repeat(21),
        ' Milo', 'Milo  B', 'Sh1t', 'sh1thead', 'b.i.t.c.h', 's.e.x', 'S E X', 'BigDick', 'dick69', 'florias', 'Admin', 'a<b>', '', 'Флориас',
        'Ψ', 'Straße', 'Łukasz', 'Nguyễn', '2×3', 'f u c k', 'K1ll', 'moderator1', 'Mr. Bean', '___'];
    names.forEach(function (n) { assert.strictEqual(P.nameOk(n), box.nameOk(n), n); });
});

test('presenter key', function () {
    const real = 'Q7mWx2Lk9PzR4tYv8NbC3dFh';
    assert.ok(P.strong(real));
    assert.ok(P.keyOk(real, real));
    assert.ok(!P.keyOk(real.slice(0, -1) + 'x', real));
    assert.ok(!P.keyOk(real + 'x', real));
    assert.ok(!P.keyOk('', real));
    assert.ok(!P.keyOk(undefined, real));
    const weak = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    assert.ok(!P.keyOk(weak, weak), 'a weak secret opens nothing');
    assert.ok(!P.keyOk(undefined, undefined));
    assert.ok(!P.keyOk('', ''));
    let used = false;
    assert.ok(P.keyOk(real, real, function (a, b) { used = true; return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0; }));
    assert.ok(used);
    assert.strictEqual(P.bearer('Bearer ' + real), real);
    assert.strictEqual(P.bearer('Bearer short'), '');
    assert.strictEqual(P.bearer(null), '');
});

test('origins', function () {
    assert.ok(P.originOk('https://florias-papadopoulos.github.io', false));
    assert.ok(!P.originOk('https://florias-papadopoulos.github.io.evil.com', false));
    assert.ok(!P.originOk('http://localhost:8810', false));
    assert.ok(P.originOk('http://localhost:8810', true));
    assert.ok(P.originOk('http://127.0.0.1:1313', true));
    assert.ok(!P.originOk('http://localhost.evil.com', true));
    assert.ok(!P.originOk('', true));
});

/* ---------- session.js ---------- */
/* box.aud: the phones joined so far (what index.js passes for a hello); box.ip: the address key of the next messages */
function setup(name) {
    const plan = P.withJoin(P.checkPlan(goodPlan, 'pkc27', seq(7)).plan, null, rnd);
    const st = S.blank(name || 'pkc27');
    const box = { st: st, plan: plan, now: 1e12, mem: {}, aud: 0, ip: '' };
    box.info = function () { return { now: box.now, aud: box.aud, mem: box.mem, rand: seq(11), bytes: rnd, ip: box.ip, keyOk: function (k) { return P.keyOk(k, KEY); } }; };
    box.send = function (att, msg) { const r = S.handle(box.st, att, msg, box.info()); Object.assign(att, r.att || {}); return r; };
    box.phone = function (tok, k) {
        const att = { r: 'a', ok: false, at: box.now, name: box.st.meta.name };
        const r = box.send(att, { t: 'hi', tok: tok, k: k === undefined ? S.joinFor(box.st) : k });
        if (att.ok) box.aud++;
        att.r0 = r;
        return att;
    };
    box.pres = function () { const att = { r: 'p', ok: false }; box.send(att, { t: 'hi', key: KEY }); return att; };
    return box;
}
function mine(r) { return r.out.filter(function (o) { return o.to === 'me'; }).map(function (o) { return o.m; }); }
const T1 = 'tokentokentoken1aaaa', T2 = 'tokentokentoken2bbbb', T3 = 'tokentokentoken3cccc';

test('no plan: a phone hears "none" and is closed', function () {
    const b = setup();
    const ph = b.phone(T1);
    assert.strictEqual(mine(ph.r0)[0].s, 'none');
    assert.strictEqual(ph.r0.close, 4004);
});

test('hello rules', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    let att = { r: 'a', ok: false };
    assert.strictEqual(b.send(att, { t: 'vote', a: 'x', c: 0 }).close, 4000);
    att = { r: 'a', ok: false };
    assert.strictEqual(b.send(att, { t: 'hi', tok: 'short' }).close, 4000);
    att = { r: 'p', ok: false };
    assert.strictEqual(b.send(att, { t: 'hi', key: 'Wrong' + KEY.slice(5) }).close, 4001);
    assert.ok(!att.ok);
    att = { r: 'p', ok: false };
    const r = b.send(att, { t: 'hi', key: KEY });
    assert.ok(att.ok);
    assert.strictEqual(mine(r)[0].t, 'pstate');
    assert.strictEqual(S.handle(b.st, {}, null, b.info()).close, 4000);
});

test('a phone before the start sees the title and waits', function () {
    const b = setup();
    const r = S.setPlan(b.st, b.plan);
    assert.ok(r.dirty.indexOf('plan') >= 0 && r.dirty.indexOf('meta') >= 0);
    const ph = b.phone(T1);
    const v = mine(ph.r0)[0];
    assert.strictEqual(v.s, 'waiting');
    assert.strictEqual(v.title, 'Fuzzy PSI from IPE');
    assert.strictEqual(v.act, null);
    assert.ok(!ph.r0.close);
    /* the presenter hears about the new phone */
    assert.ok(ph.r0.out.some(function (o) { return o.to === 'pres' && o.m.t === 'n' && o.m.n === 1; }));
});

test('start, polls, one vote each, live bars', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1), c = b.phone(T2);
    let r = b.send(p, { t: 'start' });
    assert.strictEqual(b.st.meta.s, 'live');
    assert.strictEqual(r.alarm, b.now + S.IDLE);
    assert.ok(r.out.some(function (o) { return o.to === 'aud' && o.view; }));
    r = b.send(p, { t: 'next' });
    const poll = b.st.meta.acts[0];
    assert.strictEqual(b.st.meta.cur, 0);
    assert.ok(b.st.res[poll.id], 'the results are ready in memory');
    assert.deepStrictEqual(r.dirty, ['meta'], 'nothing more is written before the first vote');
    let v = S.audienceView(b.st, a.id, b.now);
    assert.strictEqual(v.act.type, 'poll');
    assert.strictEqual(v.act.n, undefined, 'no counts before the reveal');
    r = b.send(a, { t: 'vote', a: poll.id, c: 1 });
    assert.deepStrictEqual(mine(r)[0], { t: 'voted', a: poll.id, c: 1 });
    assert.ok(r.out.some(function (o) { return o.to === 'pres' && o.m.t === 'votes' && o.m.total === 1; }));
    assert.ok(!r.out.some(function (o) { return o.to === 'aud'; }), 'not live: phones get no bars');
    r = b.send(a, { t: 'vote', a: poll.id, c: 0 });
    assert.deepStrictEqual(b.st.res[poll.id].n, [0, 1, 0], 'a second vote does not count');
    /* the same browser again on a new connection */
    const a2 = b.phone(T1);
    assert.strictEqual(a2.id, a.id, 'the same browser keeps its id');
    b.send(a2, { t: 'vote', a: poll.id, c: 2 });
    assert.deepStrictEqual(b.st.res[poll.id].n, [0, 1, 0]);
    b.send(c, { t: 'vote', a: poll.id, c: 7 });
    b.send(c, { t: 'vote', a: poll.id, c: 1.5 });
    b.send(c, { t: 'vote', a: 'other', c: 0 });
    assert.deepStrictEqual(b.st.res[poll.id].n, [0, 1, 0]);
    b.send(p, { t: 'live', on: true });
    r = b.send(c, { t: 'vote', a: poll.id, c: 0 });
    assert.ok(r.out.some(function (o) { return o.to === 'aud' && o.coalesce === 'votes'; }), 'live: phones get the bars');
    v = S.audienceView(b.st, c.id, b.now);
    assert.deepStrictEqual(v.act.n, [1, 1, 0]);
    assert.strictEqual(v.act.mine, 0);
    b.send(p, { t: 'reveal' });
    const d = setup(); d.st = b.st;
    const late = b.phone(T3);
    r = b.send(late, { t: 'vote', a: poll.id, c: 0 });
    assert.strictEqual(mine(r)[0].e, 'closed', 'the reveal closes the voting');
});

test('quiz: timer, points, reveal, ranking, no early answers', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1), c = b.phone(T2), d = b.phone(T3);
    b.send(p, { t: 'start' });
    b.send(p, { t: 'go', i: 1 });
    const quiz = b.st.meta.acts[1];
    let v = S.audienceView(b.st, a.id, b.now);
    assert.strictEqual(v.act.left, 20000);
    assert.strictEqual(JSON.stringify(v).indexOf('correct'), -1, 'the answer is not sent before the reveal');
    b.send(a, { t: 'vote', a: quiz.id, c: 2 });          // right, at once
    b.now += 10000;
    b.send(c, { t: 'vote', a: quiz.id, c: 2 });          // right, half way
    b.now += 2000;
    b.send(d, { t: 'vote', a: quiz.id, c: 0 });          // wrong
    assert.deepStrictEqual(b.st.res[quiz.id].p[a.id], 1000);
    assert.deepStrictEqual(b.st.res[quiz.id].p[c.id], 750);
    assert.deepStrictEqual(b.st.res[quiz.id].p[d.id], 0);
    v = S.audienceView(b.st, a.id, b.now);
    assert.strictEqual(v.me.p, undefined, 'no points before the reveal');
    assert.strictEqual(v.act.left, 8000);
    b.now += 9600;  // 21.6 s: past the time and the grace
    const e = b.phone('tokentokentoken4dddd');
    assert.strictEqual(mine(b.send(e, { t: 'vote', a: quiz.id, c: 2 }))[0].e, 'late');
    b.send(p, { t: 'reveal' });
    v = S.audienceView(b.st, c.id, b.now);
    assert.deepStrictEqual(v.act.correct, [2]);
    assert.strictEqual(v.act.ok, true);
    assert.strictEqual(v.act.pts, 750);
    assert.strictEqual(v.me.p, 750);
    assert.strictEqual(v.me.rank, 2);
    assert.strictEqual(v.me.of, 3);
    v = S.audienceView(b.st, d.id, b.now);
    assert.strictEqual(v.act.ok, false);
    assert.strictEqual(v.act.pts, 0);
    const rank = S.ranking(b.st);
    assert.deepStrictEqual(rank.map(function (x) { return x.p; }), [1000, 750, 0]);
    assert.ok(/^Guest \d{3}$/.test(rank[0].n));
    /* nickname */
    let r = b.send(a, { t: 'nick', n: 'Milo' });
    assert.deepStrictEqual(mine(r)[0], { t: 'nick', ok: true, n: 'Milo', s: 'ok' });
    r = b.send(c, { t: 'nick', n: 'milo' });
    assert.strictEqual(mine(r)[0].e, 'taken');
    r = b.send(c, { t: 'nick', n: 'sh1thead' });
    assert.strictEqual(mine(r)[0].e, 'name');
    assert.strictEqual(S.ranking(b.st)[0].own, 'Milo');
    assert.strictEqual(S.ranking(b.st)[0].n, 'Milo', 'shown at once');
    /* the leaderboard activity shows the top 10 */
    b.send(p, { t: 'go', i: 4 });
    v = S.audienceView(b.st, c.id, b.now);
    assert.strictEqual(v.top[0].n, 'Milo');
    assert.strictEqual(JSON.stringify(v).indexOf(T1), -1, 'no other browser token reaches a phone');
    assert.strictEqual(JSON.stringify(v).indexOf(a.id), -1, 'nor another phone\'s id');
    const pv = S.presenterView(b.st, b.now, 3);
    assert.strictEqual(JSON.stringify(pv).indexOf(T1), -1, 'nor the projector');
    assert.strictEqual(JSON.stringify(pv).indexOf(a.id), -1);
    assert.strictEqual(pv.top.length, 3);
});

test('next and prev walk the plan and stop at the ends', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres();
    assert.strictEqual(mine(b.send(p, { t: 'next' }))[0].e, 'notlive');
    b.send(p, { t: 'start' });
    b.send(p, { t: 'prev' });
    assert.strictEqual(b.st.meta.cur, -1);
    for (let i = 0; i < 5; i++) b.send(p, { t: 'next' });
    assert.strictEqual(b.st.meta.cur, 4);
    b.send(p, { t: 'next' });
    assert.strictEqual(b.st.meta.ph, 'idle');
    assert.strictEqual(S.audienceView(b.st, 'x', b.now).act, null);
    b.send(p, { t: 'prev' });
    assert.strictEqual(b.st.meta.cur, 4);
    b.send(p, { t: 'close' });
    assert.strictEqual(b.st.meta.ph, 'idle');
    b.send(p, { t: 'next' });
    assert.strictEqual(b.st.meta.ph, 'idle', 'past the end stays past the end');
    assert.strictEqual(mine(b.send(p, { t: 'go', i: 99 }))[0].e, 'bad');
});

test('quick poll goes right after the current activity', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1);
    b.send(p, { t: 'start' });
    b.send(p, { t: 'next' });
    b.send(p, { t: 'quick', q: 'Coffee break now?', opts: [] });
    const m = b.st.meta;
    assert.strictEqual(m.cur, 1);
    assert.strictEqual(m.acts[1].q, 'Coffee break now?');
    assert.deepStrictEqual(m.acts[1].opts, ['Yes', 'No']);
    assert.ok(m.acts[1].quick && m.live[m.acts[1].id]);
    assert.strictEqual(m.acts.length, 6);
    const r = b.send(a, { t: 'vote', a: m.acts[1].id, c: 0 });
    assert.ok(r.out.some(function (o) { return o.to === 'aud'; }), 'quick polls are live');
    b.send(p, { t: 'next' });
    assert.strictEqual(m.acts[m.cur].type, 'quiz');
    assert.strictEqual(mine(b.send(p, { t: 'quick', q: '', opts: ['a', 'b'] }))[0].e, 'quick');
});

test('audience questions: when, how often, moderation, upvotes', function () {
    const b = setup();
    const plan = JSON.parse(JSON.stringify(b.plan)); plan.ask = false; plan.react = false;
    S.setPlan(b.st, plan);
    const p = b.pres(), a = b.phone(T1), c = b.phone(T2);
    b.send(p, { t: 'start' });
    assert.strictEqual(mine(b.send(a, { t: 'ask', x: 'Is it post-quantum?' }))[0].e, 'closed');
    b.send(p, { t: 'go', i: 2 });  // the questions activity
    let r = b.send(a, { t: 'ask', x: '  Is it   post-quantum? ' });
    assert.strictEqual(mine(r)[0].t, 'asked');
    assert.strictEqual(b.st.qs[0].x, 'Is it post-quantum?');
    assert.strictEqual(b.st.qs[0].st, 'new');
    assert.ok(r.out.some(function (o) { return o.to === 'pres' && o.m.t === 'q'; }));
    assert.strictEqual(mine(b.send(a, { t: 'ask', x: 'And another one?' }))[0].e, 'wait');
    assert.strictEqual(mine(b.send(c, { t: 'ask', x: 'ab' }))[0].e, 'short');
    /* a new question is seen only by its author until the speaker shows it */
    let v = S.audienceView(b.st, c.id, b.now);
    assert.strictEqual(v.qs.length, 0);
    v = S.audienceView(b.st, a.id, b.now);
    assert.strictEqual(v.qs.length, 1);
    assert.strictEqual(mine(b.send(c, { t: 'up', q: 1 }))[0].e, 'bad', 'no upvotes before it is shown');
    b.send(p, { t: 'qset', q: 1, st: 'shown' });
    v = S.audienceView(b.st, c.id, b.now);
    assert.strictEqual(v.qs.length, 1);
    r = b.send(c, { t: 'up', q: 1 });
    assert.ok(r.out.some(function (o) { return o.to === 'aud' && o.m.t === 'qup' && o.m.up === 1; }));
    b.send(c, { t: 'up', q: 1 });
    b.send(a, { t: 'up', q: 1 });  // own question
    assert.strictEqual(b.st.qs[0].up.length, 1);
    b.send(p, { t: 'qbig', q: 1 });
    assert.ok(b.st.qs[0].big);
    b.send(p, { t: 'qset', q: 1, st: 'hidden' });
    assert.ok(!b.st.qs[0].big);
    assert.strictEqual(S.audienceView(b.st, c.id, b.now).qs.length, 0);
    /* at most ASK_MAX from one browser */
    for (let i = 0; i < 10; i++) { b.now += 16000; b.send(a, { t: 'ask', x: 'Question number ' + i }); }
    assert.strictEqual(b.st.qs.filter(function (q) { return q.by === a.id; }).length, 5);
});

test('reactions: only when on, rate limited, index checked', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1);
    assert.strictEqual(mine(b.send(a, { t: 'react', e: 0 }))[0].e, 'closed', 'not before the start');
    b.send(p, { t: 'start' });
    let sent = 0;
    for (let i = 0; i < 20; i++) { const r = b.send(a, { t: 'react', e: i % 6 }); if (r.out.some(function (o) { return o.to === 'pres'; })) sent++; }
    assert.strictEqual(sent, 5, 'a burst of 5, then wait');
    b.now += 1300;
    assert.ok(b.send(a, { t: 'react', e: 1 }).out.some(function (o) { return o.to === 'pres'; }));
    assert.strictEqual(mine(b.send(a, { t: 'react', e: 6 }))[0].e, 'bad');
    /* everyone together: at most 12 a second */
    b.now += 1001;
    let all = 0;
    for (let i = 0; i < 40; i++) {
        const ph = b.phone('tokentokentokenR' + (1000 + i));
        if (b.send(ph, { t: 'react', e: 0 }).out.some(function (o) { return o.to === 'pres'; })) all++;
    }
    assert.strictEqual(all, 12);
});

test('message flood closes the connection', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const a = b.phone(T1);
    let closed = 0;
    for (let i = 0; i < 60; i++) if (b.send(a, { t: 'nick', n: 'Milo' }).close === 4008) closed++;
    assert.ok(closed > 0);
});

test('end, alarms, deletion after 24 hours, export', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1);
    b.send(p, { t: 'start' });
    const t0 = b.now;
    assert.deepStrictEqual(S.alarmStep(b.st, t0 + 1000), { act: null, at: t0 + S.IDLE });
    b.send(p, { t: 'next' });
    b.send(a, { t: 'vote', a: b.st.meta.acts[0].id, c: 2 });
    b.now += 5000;
    b.send(p, { t: 'go', i: 2 });
    b.send(a, { t: 'ask', x: 'What about malicious senders?' });
    /* forgotten: ends by itself 12 hours after the last command */
    let step = S.alarmStep(b.st, b.now + S.IDLE);
    assert.strictEqual(step.act, 'end');
    let r = b.send(p, { t: 'end' });
    assert.strictEqual(b.st.meta.s, 'ended');
    assert.strictEqual(r.alarm, b.now + S.KEEP);
    assert.strictEqual(S.audienceView(b.st, a.id, b.now).s, 'ended');
    const x = S.exportResults(b.st, b.now);
    assert.strictEqual(x.talk.code, 'pkc27');
    assert.strictEqual(x.activities[0].answers[2].votes, 1);
    assert.strictEqual(x.activities[1].answers[2].correct, true);
    assert.strictEqual(x.questions[0].text, 'What about malicious senders?');
    assert.strictEqual(JSON.stringify(x).indexOf(T1), -1, 'no tokens in the export');
    assert.strictEqual(JSON.stringify(x).indexOf(a.id), -1, 'no ids either');
    assert.strictEqual(JSON.stringify(x).indexOf(b.plan.join), -1, 'nor the join secret');
    step = S.alarmStep(b.st, b.now + S.KEEP - 1);
    assert.deepStrictEqual(step, { act: null, at: b.now + S.KEEP });
    step = S.alarmStep(b.st, b.now + S.KEEP);
    assert.strictEqual(step.act, 'purge');
    r = S.purge(b.st);
    assert.strictEqual(b.st.meta.s, 'waiting', 'the plan stays');
    assert.ok(r.del.indexOf('v:' + b.st.plan.acts[0].id + ':' + a.id) >= 0 && r.del.indexOf('q:1') >= 0 && r.del.indexOf('ph:' + T1) >= 0);
    assert.strictEqual(r.alarm, 0);
    assert.deepStrictEqual(Object.keys(b.st.res), []);
    assert.deepStrictEqual(b.st.qs, []);
    assert.strictEqual(b.st.meta.title, 'Fuzzy PSI from IPE');
});

test('starting again after the end starts fresh', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1);
    b.send(p, { t: 'start' }); b.send(p, { t: 'next' });
    b.send(a, { t: 'vote', a: b.st.meta.acts[0].id, c: 0 });
    b.send(p, { t: 'end' });
    const r = b.send(p, { t: 'start' });
    assert.strictEqual(b.st.meta.s, 'live');
    assert.deepStrictEqual(Object.keys(b.st.res), []);
    assert.ok(r.del.length > 0);
});

test('a plan saved during the talk does not change it; deleted before the talk: none', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres();
    b.send(p, { t: 'start' });
    const other = JSON.parse(JSON.stringify(b.plan)); other.title = 'Changed'; other.acts = other.acts.slice(0, 1);
    S.setPlan(b.st, other);
    assert.strictEqual(b.st.meta.title, 'Fuzzy PSI from IPE');
    assert.strictEqual(b.st.meta.acts.length, 5);
    const c = setup();
    S.setPlan(c.st, c.plan);
    S.setPlan(c.st, null);
    assert.strictEqual(c.st.meta.s, 'none');
});

test('storage round trip', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1);
    b.send(p, { t: 'start' }); b.send(p, { t: 'next' });
    b.send(a, { t: 'vote', a: b.st.meta.acts[0].id, c: 1 });
    const store = new Map();
    ['meta', 'plan'].concat(S.audienceKeys(b.st))
        .forEach(function (k) { store.set(k, JSON.parse(JSON.stringify(S.part(b.st, k)))); });
    const st2 = S.fromStorage('pkc27', store);
    assert.deepStrictEqual(S.audienceView(st2, a.id, b.now), S.audienceView(b.st, a.id, b.now));
    assert.strictEqual(st2.meta.name, 'pkc27');
    const t = S.fromStorage('pkc27.test', new Map());
    assert.ok(t.meta.test);
    assert.strictEqual(t.meta.code, 'pkc27');
});

test('points', function () {
    assert.strictEqual(S.points(true, 0, 20), 1000);
    assert.strictEqual(S.points(true, 20000, 20), 500);
    assert.strictEqual(S.points(true, 99999, 20), 500);
    assert.strictEqual(S.points(true, -5, 20), 1000);
    assert.strictEqual(S.points(false, 0, 20), 0);
});

/* ---------- H1: idle connections cannot lock a talk ---------- */
test('H1: connections that never say hello are closed and do not count', function () {
    const now = 1e12, L = P.LIMITS;
    function socks(nOk, nIdle, idleAt, sameIp) {
        const a = [];
        for (let i = 0; i < nOk; i++) a.push({ ok: true, at: now - 60000, ip: !!sameIp });
        for (let i = 0; i < nIdle; i++) a.push({ ok: false, at: idleAt + i, ip: !!sameIp });
        return a;
    }
    /* 500 sockets that only ping (never said hello), older than 10 s: all closed, the new phone gets in */
    let d = S.admit('a', socks(0, 500, now - L.hello - 1000), now);
    assert.strictEqual(d.drop.length, 500);
    assert.strictEqual(d.full, false);
    /* fresh ones (under 10 s) stay, but do not count toward the 500 joined phones */
    d = S.admit('a', socks(499, 50, now - 1000), now);
    assert.strictEqual(d.drop.length, 0);
    assert.strictEqual(d.full, false);
    d = S.admit('a', socks(500, 0, 0), now);
    assert.strictEqual(d.full, true, '500 joined: full');
    /* the hard limit of 600 in all: the oldest that has not said hello makes room */
    d = S.admit('a', socks(300, 300, now - 5000), now);
    assert.deepStrictEqual(d.drop, [300]);
    assert.strictEqual(d.full, false);
    /* one address: at most 150 connections */
    d = S.admit('a', socks(150, 0, 0, true), now);
    assert.strictEqual(d.full, true);
    d = S.admit('a', socks(149, 0, 0, true), now);
    assert.strictEqual(d.full, false);
    /* presenters: idle unauthenticated ones go, and the presenter always gets in */
    d = S.admit('p', [{ ok: false, at: now - 100 }, { ok: false, at: now - 200 }, { ok: true, at: 0 }, { ok: true, at: 0 }, { ok: true, at: 0 }, { ok: true, at: 0 }], now);
    assert.deepStrictEqual(d.drop, [1]);
    assert.strictEqual(d.full, false);
    d = S.admit('p', [{ ok: false, at: now - 20000 }], now);
    assert.deepStrictEqual(d.drop, [0]);
    d = S.admit('p', [0, 1, 2, 3, 4, 5].map(function () { return { ok: true, at: 0 }; }), now);
    assert.strictEqual(d.full, true);
});

test('H1: a hello is refused when 500 phones have joined; the count is of joined phones', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    b.aud = P.LIMITS.aud;
    const ph = b.phone(T1);
    assert.strictEqual(ph.r0.close, 4003);
    assert.ok(!ph.ok);
    b.aud = 41;
    const ok = b.phone(T2);
    assert.ok(ok.ok);
    assert.ok(ok.r0.out.some(function (o) { return o.to === 'pres' && o.m.t === 'n' && o.m.n === 42; }));
});

/* ---------- the join secret ---------- */
test('join secrets: CSPRNG characters, kept on a new save, made for old plans', function () {
    const counts = {};
    for (let i = 0; i < 400; i++) {
        const k = P.secret(rnd, 8);
        assert.ok(P.joinOk(k), k);
        for (const ch of k) counts[ch] = (counts[ch] || 0) + 1;
    }
    assert.strictEqual(Object.keys(counts).length, 32, 'all 32 characters appear');
    const fresh = P.withJoin(P.checkPlan(goodPlan, 'pkc27').plan, null, rnd);
    assert.ok(P.joinOk(fresh.join) && P.joinOk(fresh.tjoin) && fresh.join !== fresh.tjoin);
    /* saved again: the page's copy is ignored, the stored one kept */
    const input = JSON.parse(JSON.stringify(fresh)); input.join = 'aaaaaaaa'; input.tjoin = 'bad';
    const again = P.withJoin(P.checkPlan(input, 'pkc27').plan, fresh, rnd);
    assert.strictEqual(again.join, fresh.join);
    assert.strictEqual(again.tjoin, fresh.tjoin);
    assert.strictEqual(P.checkPlan(input, 'pkc27').plan.join, undefined, 'checkPlan never takes a secret from the page');
    /* a plan saved before secrets existed gets them on its next save */
    const old = P.checkPlan(goodPlan, 'pkc27').plan;
    const upd = P.withJoin(P.checkPlan(old, 'pkc27').plan, old, rnd);
    assert.ok(P.joinOk(upd.join) && P.joinOk(upd.tjoin));
    assert.ok(P.same('abc', 'abc') && !P.same('abc', 'abd') && !P.same('ab', 'abc') && !P.same(undefined, 'abc') && !P.same('', ''));
});

test('join secret: required in the hello, the rehearsal has its own, kept after the start', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    assert.strictEqual(b.phone(T1, undefined).ok, true);
    let ph = b.phone(T2, '');
    assert.strictEqual(ph.r0.close, 4005);
    assert.strictEqual(mine(ph.r0)[0].e, 'join');
    assert.strictEqual(JSON.stringify(ph.r0).indexOf(b.plan.title), -1, 'no title without the secret');
    ph = b.phone(T2, b.plan.tjoin);
    assert.strictEqual(ph.r0.close, 4005, 'the rehearsal secret does not open the talk');
    ph = b.phone(T2, b.plan.join.toUpperCase());
    assert.strictEqual(ph.r0.close, 4005);
    /* the rehearsal */
    const t = setup('pkc27.test');
    S.setPlan(t.st, b.plan);
    assert.strictEqual(t.phone(T1, b.plan.join).r0.close, 4005);
    assert.ok(t.phone(T1, b.plan.tjoin).ok);
    /* started: the secret is copied, so phones still join after the plan is deleted during the talk */
    const p = b.pres();
    b.send(p, { t: 'start' });
    assert.strictEqual(b.st.meta.join, b.plan.join);
    S.setPlan(b.st, null);
    assert.ok(b.phone(T3).ok);
    assert.strictEqual(S.presenterView(b.st, b.now, 0).join, b.plan.join, 'the projector gets the secret for its QR code');
    assert.strictEqual(JSON.stringify(S.audienceView(b.st, 'x', b.now)).indexOf(b.plan.join), -1, 'phones never get it');
    /* a plan without secrets (saved before they existed) lets nobody in */
    const o = setup();
    const noJoin = JSON.parse(JSON.stringify(o.plan)); delete noJoin.join; delete noJoin.tjoin;
    S.setPlan(o.st, noJoin);
    assert.strictEqual(o.phone(T1, '').r0.close, 4005);
});

/* ---------- M3: ids from the worker ---------- */
test('M3: the worker gives each phone an id; tokens only find it again', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1);
    assert.ok(/^[a-km-np-z2-9]{16}$/.test(a.id), a.id);
    assert.notStrictEqual(a.id, T1);
    /* a token that looks like a property of Object.prototype is just a token */
    const proto = b.phone('__defineGetter__');
    assert.ok(proto.ok && proto.id !== a.id);
    b.send(p, { t: 'start' }); b.send(p, { t: 'next' });
    const poll = b.st.meta.acts[0];
    assert.strictEqual(mine(b.send(proto, { t: 'vote', a: poll.id, c: 0 }))[0].c, 0);
    assert.deepStrictEqual(b.st.res[poll.id].n, [1, 0, 0]);
    /* a second hello with another token closes the connection; the same token again is ignored */
    assert.ok(!b.send(a, { t: 'hi', tok: T1, k: b.plan.join }).close);
    assert.strictEqual(b.send(a, { t: 'hi', tok: T2, k: b.plan.join }).close, 4000);
    /* the stored vote is under the id, not the token */
    const r = b.send(a, { t: 'vote', a: poll.id, c: 1 });
    assert.deepStrictEqual(r.dirty, ['ph:' + T1, 'v:' + poll.id + ':' + a.id]);
    /* after the object slept (memory lost), the same browser comes back to the same id, from storage */
    const store = new Map();
    ['meta', 'plan'].concat(S.audienceKeys(b.st)).forEach(function (k) { store.set(k, JSON.parse(JSON.stringify(S.part(b.st, k)))); });
    b.st = S.fromStorage('pkc27', store);
    const back = b.phone(T1);
    assert.strictEqual(back.id, a.id);
    assert.strictEqual(mine(b.send(back, { t: 'vote', a: poll.id, c: 2 }))[0].c, 1, 'still one vote');
    /* two connections that got different ids for one browser (one from before the sleep): the stored one wins */
    const before = { r: 'a', ok: true, tok: 'tokentokentoken9zzzz', id: 'aaaaaaaaaaaaaaaa', v: [] };
    const after = b.phone('tokentokentoken9zzzz');
    b.send(after, { t: 'vote', a: poll.id, c: 0 });
    b.send(before, { t: 'vote', a: poll.id, c: 0 });
    assert.strictEqual(before.id, after.id);
    assert.deepStrictEqual(b.st.res[poll.id].n, [2, 1, 0]);
});

test('M3: new phones per address are limited (in memory), and phones kept per session', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    b.ip = '203.0.113.7';
    let ok = 0;
    for (let i = 0; i < P.LIMITS.ipNew + 5; i++) if (b.phone('tokentokentoken-' + (10000 + i)).ok) ok++;
    assert.strictEqual(ok, P.LIMITS.ipNew);
    assert.strictEqual(b.phone('tokentokentoken-' + 10000).ok, true, 'a known browser still gets in');
    b.ip = '203.0.113.8';
    assert.ok(b.phone('tokentokentoken-other').ok, 'another address does');
    assert.strictEqual(Object.keys(b.mem.mint).length, 2, 'only counts, in memory');
    /* nothing about the address goes into storage or an attachment */
    const att = b.phone('tokentokentoken-third');
    assert.strictEqual(JSON.stringify(att).indexOf('203.0'), -1);
    /* at most LIMITS.ids phones can keep anything */
    const c = setup();
    S.setPlan(c.st, c.plan);
    const pr = c.pres();
    c.send(pr, { t: 'start' }); c.send(pr, { t: 'next' });
    for (let i = 0; i < P.LIMITS.ids; i++) c.st.players['id' + i] = { tok: 't' + i, n: '', s: '' };
    const late = c.phone(T1);
    assert.strictEqual(mine(c.send(late, { t: 'vote', a: c.st.meta.acts[0].id, c: 0 }))[0].e, 'full');
});

test('IPv6 addresses count per /64', function () {
    assert.strictEqual(P.ipKey('203.0.113.7'), '203.0.113.7');
    assert.strictEqual(P.ipKey('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
    assert.strictEqual(P.ipKey('2001:0db8:0001:0002::abcd'), '2001:db8:1:2::/64');
    assert.strictEqual(P.ipKey('2001:db8::1'), '2001:db8:0:0::/64');
    assert.strictEqual(P.ipKey('::ffff:198.51.100.1'), '198.51.100.1');
    assert.strictEqual(P.ipKey(''), '');
    assert.strictEqual(P.ipKey('1::2::3'), '');
    assert.strictEqual(P.ipKey(null), '');
});

test('M3: nicknames are shown at once; the presenter can hide one and show it again', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const p = b.pres(), a = b.phone(T1), c = b.phone(T2);
    let r = b.send(a, { t: 'nick', n: 'Milo' });
    assert.ok(r.out.some(function (o) { return o.to === 'pres' && o.view; }), 'the remote hears of it');
    assert.ok(!r.out.some(function (o) { return o.to === 'aud'; }), 'not every phone redraws for a nickname');
    b.send(c, { t: 'nick', n: 'Noor' });
    let pv = S.presenterView(b.st, b.now, 2);
    assert.deepStrictEqual(pv.names.waiting, []);
    assert.deepStrictEqual(pv.names.shown.sort(), ['Milo', 'Noor']);
    assert.strictEqual(pv.names.nok, 2);
    assert.strictEqual(S.audienceView(b.st, a.id, b.now).me.ns, 'ok');
    r = b.send(p, { t: 'name', n: 'NOOR', s: 'no' });
    assert.ok(r.out.some(function (o) { return o.to === 'who' && o.id === c.id && o.m.s === 'no'; }), 'the phone hears it');
    pv = S.presenterView(b.st, b.now, 2);
    assert.deepStrictEqual(pv.names.off, ['Noor']);
    assert.deepStrictEqual(pv.names.shown, ['Milo']);
    assert.strictEqual(pv.names.nok, 1);
    assert.strictEqual(mine(b.send(p, { t: 'name', n: 'Nobody', s: 'ok' }))[0].e, 'bad');
    assert.strictEqual(mine(b.send(p, { t: 'name', s: 'ok' }))[0].e, 'bad', 'no name is not "all"');
    /* the same name again keeps its state (hidden stays hidden); "Show again" brings it back */
    b.send(c, { t: 'nick', n: 'Noor' });
    assert.strictEqual(b.st.players[c.id].s, 'no');
    b.send(p, { t: 'name', n: 'Noor', s: 'ok' });
    assert.strictEqual(b.st.players[c.id].s, 'ok');
    /* rude ones are refused */
    assert.strictEqual(mine(b.send(a, { t: 'nick', n: 'Scheisskerl' }))[0].e, 'name');
    assert.strictEqual(mine(b.send(a, { t: 'nick', n: 'fuck you' }))[0].e, 'name');
    /* a phone sees its own nickname on the ranking, others see the guest name (Noor hidden again) */
    b.send(p, { t: 'name', n: 'Noor', s: 'no' });
    b.send(p, { t: 'start' }); b.send(p, { t: 'go', i: 1 });
    const quiz = b.st.meta.acts[1];
    b.send(c, { t: 'vote', a: quiz.id, c: 2 });
    b.send(p, { t: 'reveal' }); b.send(p, { t: 'go', i: 4 });
    assert.strictEqual(S.audienceView(b.st, c.id, b.now).top[0].n, 'Noor');
    assert.ok(/^Guest/.test(S.audienceView(b.st, a.id, b.now).top[0].n));
    assert.ok(/^Guest/.test(S.presenterView(b.st, b.now, 2).top[0].n));
    const x = S.exportResults(b.st, b.now);
    assert.deepStrictEqual([x.ranking[0].name, x.ranking[0].shown], ['Noor', false]);
});

/* ---------- L3: no stored value grows with the audience ---------- */
test('L3: votes, upvotes and phones are one small key each', function () {
    const b = setup();
    const plan = JSON.parse(JSON.stringify(b.plan)); plan.ask = true;
    S.setPlan(b.st, plan);
    const p = b.pres();
    b.send(p, { t: 'start' }); b.send(p, { t: 'go', i: 1 });
    const quiz = b.st.meta.acts[1], phones = [];
    for (let i = 0; i < 1000; i++) {
        b.aud = 0;  // phones come and go: never more than 500 at once
        const ph = b.phone('tokentokentokenL' + (100000 + i));
        b.send(ph, { t: 'vote', a: quiz.id, c: i % 4 });
        phones.push(ph);
    }
    b.now += 1000;
    b.send(phones[0], { t: 'ask', x: 'A question everyone likes?' });
    b.send(p, { t: 'qset', q: 1, st: 'shown' });
    for (const ph of phones.slice(1)) b.send(ph, { t: 'up', q: 1 });
    assert.strictEqual(b.st.qs[0].up.length, 999);
    const keys = ['meta', 'plan'].concat(S.audienceKeys(b.st));
    assert.strictEqual(keys.length, 2 + 1000 + 1000 + 1 + 999);
    let biggest = 0;
    for (const k of keys.slice(2)) biggest = Math.max(biggest, Buffer.byteLength(k) + Buffer.byteLength(JSON.stringify(S.part(b.st, k))));
    assert.ok(biggest < 500, 'largest audience key and value: ' + biggest + ' bytes');
    assert.ok(Buffer.byteLength(JSON.stringify(S.part(b.st, 'meta'))) < 20000);
    /* loaded again, the counts are rebuilt from the single keys */
    const store = new Map();
    keys.forEach(function (k) { store.set(k, JSON.parse(JSON.stringify(S.part(b.st, k)))); });
    const st2 = S.fromStorage('pkc27', store);
    assert.deepStrictEqual(st2.res[quiz.id].n, [250, 250, 250, 250]);
    assert.strictEqual(st2.qs[0].up.length, 999);
    assert.deepStrictEqual(S.presenterView(st2, b.now, 1), S.presenterView(b.st, b.now, 1));
    /* a deleted part is deleted, not written as undefined */
    assert.strictEqual(S.part(b.st, 'v:' + quiz.id + ':nobody'), undefined);
});

test('L3: the largest plan and a full session meta stay far below a value limit of 128 KiB', function () {
    const big = '😀'.repeat(P.LIMITS.q), opt = '😀'.repeat(P.LIMITS.opt);
    const acts = [];
    for (let i = 0; i < P.LIMITS.acts; i++) acts.push({ type: 'poll', q: big, opts: [opt, opt, opt, opt, opt, opt] });
    const text = JSON.stringify({ title: 'x', acts: acts });
    assert.ok(Buffer.byteLength(text) > P.LIMITS.planBytes, 'such a plan is refused by its size in bytes');
    /* the largest plan that passes, plus 20 quick polls, as meta */
    const n = Math.floor(P.LIMITS.planBytes / Buffer.byteLength(JSON.stringify(acts[0])));
    const plan = P.withJoin(P.checkPlan({ title: 'x', acts: acts.slice(0, n) }, 'ab').plan, null, rnd);
    const b = setup();
    S.setPlan(b.st, plan);
    const pr = b.pres();
    b.send(pr, { t: 'start' });
    for (let i = 0; i < P.LIMITS.quick; i++) b.send(pr, { t: 'quick', q: big, opts: [opt, opt, opt, opt, opt, opt] });
    assert.strictEqual(b.st.meta.acts.length, n + P.LIMITS.quick);
    const meta = Buffer.byteLength(JSON.stringify(S.part(b.st, 'meta')));
    assert.ok(meta < 128 * 1024 * 0.95, 'meta: ' + meta + ' bytes');
});

/* ---------- privacy: nicknames given before the start ---------- */
test('privacy: nicknames from before the start go 24 hours later, or when the plan is deleted', function () {
    const b = setup();
    S.setPlan(b.st, b.plan);
    const a = b.phone(T1);
    const r = b.send(a, { t: 'nick', n: 'Milo' });
    assert.strictEqual(r.alarm, b.now + S.KEEP);
    assert.ok(r.dirty.indexOf('meta') >= 0);
    assert.deepStrictEqual(S.alarmStep(b.st, b.now + 1000), { act: null, at: b.now + S.KEEP });
    const step = S.alarmStep(b.st, b.now + S.KEEP);
    assert.strictEqual(step.act, 'purge');
    const g = S.purge(b.st);
    assert.ok(g.del.indexOf('ph:' + T1) >= 0);
    assert.strictEqual(b.st.meta.s, 'waiting');
    assert.strictEqual(b.st.meta.wdue, 0);
    assert.deepStrictEqual(S.alarmStep(b.st, b.now + 2 * S.KEEP), { act: null, at: 0 });
    /* the talk starts in time: the 24 hours after the end apply instead */
    const c = setup();
    S.setPlan(c.st, c.plan);
    c.send(c.phone(T1), { t: 'nick', n: 'Milo' });
    c.send(c.pres(), { t: 'start' });
    assert.strictEqual(c.st.meta.wdue, 0);
    assert.strictEqual(c.st.players[c.st.toks[T1]].n, 'Milo');
    /* the plan is deleted before the talk: everything goes now and the phones are sent away */
    const d = setup();
    S.setPlan(d.st, d.plan);
    d.send(d.phone(T1), { t: 'nick', n: 'Milo' });
    const del = S.setPlan(d.st, null);
    assert.strictEqual(d.st.meta.s, 'none');
    assert.strictEqual(del.kick, 4004);
    assert.ok(del.del.indexOf('ph:' + T1) >= 0);
    assert.strictEqual(del.alarm, 0);
    assert.deepStrictEqual(Object.keys(d.st.players), []);
});

/* ---------- the site: CSV export, presenter key, links, privacy note ---------- */
const siteDir = path.join(path.dirname(new URL(import.meta.url).pathname), '../../../../assets/js/live');
function siteBox(files) {
    const mem = function () {
        const m = {};
        return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } };
    };
    const box = { window: { LV: {} }, localStorage: mem(), sessionStorage: mem(), location: { hash: '' },
        crypto: { getRandomValues: function (b) { return crypto.randomFillSync(b); } },
        document: { getElementById: function () { return null; }, addEventListener: function () {} } };
    vm.createContext(box);
    for (const f of files) vm.runInContext(fs.readFileSync(path.join(siteDir, f), 'utf8'), box);
    return box;
}
test('L4: CSV cells cannot start a formula', function () {
    const box = siteBox([]);
    box.window.LV.A = {};
    box.window.LV.h = function () {};
    vm.runInContext(fs.readFileSync(path.join(siteDir, '55-admin-side.js'), 'utf8'), box);
    const csv = box.window.LV.A.csv;
    const out = csv({ activities: [{ n: 1, type: 'poll', question: '=HYPERLINK("http://x","y")', answers: [{ answer: '+1', votes: 3 }, { answer: '-2', votes: 0 }, { answer: '@SUM(A1)', votes: 1 }] }],
        ranking: [{ rank: 1, name: '\tTab', points: 10, correct: 1 }],
        questions: [{ text: '\rCR', upvotes: 0, status: 'shown' }, { text: '＝FULLWIDTH', upvotes: 0, status: 'shown' }, { text: 'Fine, "quoted"', upvotes: 2, status: 'shown' }] });
    assert.ok(out.indexOf(',"\'=HYPERLINK(""http://x"",""y"")",') >= 0, out);
    assert.ok(out.indexOf(",'+1,3,") >= 0);
    assert.ok(out.indexOf(",'-2,0,") >= 0);
    assert.ok(out.indexOf(",'@SUM(A1),1,") >= 0);
    assert.ok(out.indexOf(",'\tTab,") >= 0);
    assert.ok(out.indexOf(',"\'\rCR",') >= 0);
    assert.ok(out.indexOf(",'＝FULLWIDTH,") >= 0);
    assert.ok(out.indexOf(',"Fine, ""quoted""",') >= 0);
});

test('L6: the presenter key lives in sessionStorage only; an old one in localStorage is deleted', function () {
    const box = siteBox([]);
    box.localStorage.setItem('live-key', 'Old' + KEY);
    vm.runInContext(fs.readFileSync(path.join(siteDir, '00-common.js'), 'utf8'), box);
    const LV = box.window.LV;
    assert.strictEqual(box.localStorage.getItem('live-key'), null, 'the old copy is gone');
    assert.strictEqual(LV.key(), '');
    LV.setKey(KEY);
    assert.strictEqual(box.sessionStorage.getItem('live-key'), KEY);
    assert.strictEqual(box.localStorage.getItem('live-key'), null);
    assert.strictEqual(LV.key(), KEY);
    LV.setKey('');
    assert.strictEqual(box.sessionStorage.getItem('live-key'), null);
});

test('links: the code first, then the join secret; the privacy note says what is kept', function () {
    const box = siteBox(['00-common.js']);
    const LV = box.window.LV;
    LV.base = 'https://florias-papadopoulos.github.io/live/';
    box.location.hash = '#pkc27/k3x9mn2p';
    assert.strictEqual(LV.code(), 'pkc27');
    assert.strictEqual(LV.joinKey(), 'k3x9mn2p');
    box.location.hash = '#PKC27.test/K3X9MN2P';
    assert.strictEqual(LV.code(), 'pkc27.test');
    assert.strictEqual(LV.joinKey(), 'k3x9mn2p', 'typed in capitals still works');
    box.location.hash = '#pkc27';
    assert.strictEqual(LV.code(), 'pkc27');
    assert.strictEqual(LV.joinKey(), '');
    box.location.hash = '#pkc27/short';
    assert.strictEqual(LV.joinKey(), '');
    assert.strictEqual(LV.link('pkc27', 'k3x9mn2p'), 'https://florias-papadopoulos.github.io/live/#pkc27/k3x9mn2p');
    assert.strictEqual(LV.shortLink('pkc27', 'k3x9mn2p'), 'florias-papadopoulos.github.io/live/#pkc27/k3x9mn2p');
    const src = fs.readFileSync(path.join(siteDir, '00-common.js'), 'utf8');
    assert.ok(/24 hours after it ends/.test(src) && /backup/.test(src) && /in memory/.test(src));
});

test('no em or en dashes in audience mode', function () {
    const top = path.join(siteDir, '../../..');
    const files = [path.join(siteDir, 'README.md'), path.join(top, 'tools/workers/live/README.md'), path.join(top, 'assets/css/common/live.css'),
        path.join(top, 'layouts/partials/live-head.html'), path.join(top, 'layouts/partials/live-page.html')];
    [siteDir, path.join(top, 'tools/workers/live/src'), path.join(top, 'tools/workers/live/test'), path.join(top, 'layouts/live'), path.join(top, 'content/live')].forEach(function (d) {
        fs.readdirSync(d).filter(function (f) { return /\.(js|cjs|html|md)$/.test(f); }).forEach(function (f) { files.push(path.join(d, f)); });
    });
    files.forEach(function (f) { assert.ok(!/[\u2013\u2014]/.test(fs.readFileSync(f, 'utf8')), f); });
});

/* the site keeps copies of some limits for its forms: they must agree */
test('the site\'s limits agree with the worker', function () {
    const file = path.join(path.dirname(new URL(import.meta.url).pathname), '../../../../assets/js/live/00-common.js');
    const src = fs.readFileSync(file, 'utf8');
    const m = /LV\.LIMITS = (\{[^}]*\})/.exec(src);
    assert.ok(m, 'LV.LIMITS not found');
    const site = eval('(' + m[1] + ')');  // eslint-disable-line no-eval
    Object.keys(site).forEach(function (k) { assert.strictEqual(site[k], P.LIMITS[k], k); });
    const types = /LV\.TYPES = (\[[^\]]*\])/.exec(src);
    assert.deepStrictEqual(eval(types[1]), P.TYPES);  // eslint-disable-line no-eval
});

console.log(passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
