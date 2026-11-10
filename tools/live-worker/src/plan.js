// Audience mode: talk plans, codes, limits, nicknames and the presenter key. Pure functions only (no Cloudflare APIs),
// tested in node by test/run.js. The site's copies of a few limits are in assets/js/live/00-common.js (LV.LIMITS);
// the test checks that both agree.

/* ---------- limits ---------- */
export const LIMITS = {
    title: 120,        // characters of a talk title
    q: 200,            // characters of a question or prompt
    opt: 80,           // characters of one answer
    minOpts: 2,
    maxOpts: 6,
    acts: 60,          // activities in one plan (quick polls during the talk add to the session, up to acts + 20)
    quick: 20,
    plans: 200,        // plans kept for one presenter
    planBytes: 64000,  // a saved plan as JSON, in UTF-8 bytes (so a plan and a session's meta stay far below the
                       // storage limit of one value, 128 KiB on the old storage and 2 MB on SQLite)
    msg: 2000,         // characters of one WebSocket message
    ask: 200,          // characters of an audience question
    nick: 20,
    minSecs: 5,
    maxSecs: 120,
    aud: 500,          // phones that have joined a session (said hello with the join secret)
    audAll: 600,       // audience connections in all, joined or not (the oldest that has not said hello makes room)
    ipConn: 150,       // audience connections from one IP address (an IPv6 /64), generous for a conference NAT
    ipNew: 300,        // new phones from one address while the session is awake (counted in memory only)
    ids: 2000,         // phones that can keep anything (a vote, a question, a nickname) in one session
    hello: 10000,      // ms a new connection has to say hello before it can be closed to make room
    join: 8,           // characters of a talk's join secret
    pres: 6            // presenter connections per session (projector, remote, admin preview)
};

/* the activity types of version 1. Later: 'ballot' (secret ballot: votes encrypted on the phone with exponential
   ElGamal plus a proof of a valid vote, tallied encrypted, decrypted on the presenter's laptop) and 'zkguard'. They
   plug in here and in session.js (VOTE_TYPES) without changing the message format: a vote's "c" field then carries a
   ciphertext and proof instead of an answer index. */
export const TYPES = ['poll', 'quiz', 'questions', 'reactions', 'leaderboard'];
export const VOTE_TYPES = ['poll', 'quiz'];
export const EMOJI = 6;  // reactions are sent as an index 0..5 (the site draws the faces)

/* ---------- codes ---------- */
/* A talk code: 2 to 20 lower case letters, digits and single hyphens, e.g. "pkc27". A rehearsal of it runs under
   "<code>.test", a separate session with the same plan. */
const CODE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,19}$/;
export function codeOk(c) { return typeof c === 'string' && CODE.test(c); }
/* the name of a session: a code, or a code with ".test" */
export function sessionOk(s) {
    if (typeof s !== 'string') return false;
    return codeOk(s) || (s.slice(-5) === '.test' && codeOk(s.slice(0, -5)));
}
export function planCode(session) { return session.slice(-5) === '.test' ? session.slice(0, -5) : session; }

/* ---------- text ---------- */
/* one line of text: control characters out, runs of spaces made one, trimmed, cut to max characters (by code point) */
export function clean(s, max) {
    if (typeof s !== 'string') return '';
    // eslint-disable-next-line no-control-regex
    const t = s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
    const cps = Array.from(t);
    return cps.length > max ? cps.slice(0, max).join('').trim() : t;
}

/* ---------- ids and secrets ---------- */
const ID = /^[a-z0-9]{4,10}$/;
const ABC = 'abcdefghijkmnpqrstuvwxyz23456789';  // 32 letters and digits, without l, o, 0 and 1 (easy to read and type)
/* an activity id (not a secret: Math.random is fine) */
export function newId(rand, taken) {
    for (;;) {
        let id = '';
        for (let i = 0; i < 6; i++) id += ABC[Math.floor(rand() * ABC.length)];
        if (!taken[id]) return id;
    }
}
/* n characters from a CSPRNG: bytes(n) gives n random bytes (crypto.getRandomValues in the Worker). 256 is a multiple
   of 32, so every character is equally likely: 5 bits each, 40 bits for a join secret of 8. */
export function secret(bytes, n) {
    const b = bytes(n);
    let s = '';
    for (let i = 0; i < n; i++) s += ABC[b[i] & 31];
    return s;
}
const JOIN = /^[a-km-np-z2-9]{8}$/;
export function joinOk(s) { return typeof s === 'string' && JOIN.test(s); }
/* the join secrets of a plan (join: the talk, tjoin: its rehearsal), which go into the QR code and the link
   (/live/#pkc27/k3x9mn2p): kept when the talk is saved again, made new for a new talk or one saved before they existed.
   Whatever the page sends for them is ignored. */
export function withJoin(plan, old, bytes) {
    plan.join = old && joinOk(old.join) ? old.join : secret(bytes, LIMITS.join);
    plan.tjoin = old && joinOk(old.tjoin) ? old.tjoin : secret(bytes, LIMITS.join);
    return plan;
}
/* two strings equal, in time that does not depend on where they differ */
export function same(given, want) {
    if (typeof given !== 'string' || typeof want !== 'string' || !want || given.length !== want.length) return false;
    let d = 0;
    for (let i = 0; i < want.length; i++) d |= given.charCodeAt(i) ^ want.charCodeAt(i);
    return d === 0;
}

/* ---------- addresses ---------- */
/* The key under which connections from one place are counted (in memory only, never stored): an IPv4 address as it
   is, an IPv6 address cut to its first 64 bits (one phone or one home network usually has a whole /64). */
export function ipKey(ip) {
    if (typeof ip !== 'string' || !ip || ip.length > 64) return '';
    if (ip.indexOf(':') < 0) return ip;
    if (ip.indexOf('.') >= 0) return ip.slice(ip.lastIndexOf(':') + 1);  // IPv4 written as IPv6 (::ffff:1.2.3.4)
    const halves = ip.toLowerCase().split('::');
    if (halves.length > 2) return '';
    const head = halves[0] ? halves[0].split(':') : [], tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const groups = halves.length === 2 ? head.concat(new Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), tail) : head;
    if (groups.length !== 8 || groups.some(function (g) { return !/^[0-9a-f]{1,4}$/.test(g); })) return '';
    return groups.slice(0, 4).map(function (g) { return parseInt(g, 16).toString(16); }).join(':') + '::/64';
}

/* ---------- plans ---------- */
/* A plan as the presenter page saves it:
     { code: "pkc27", title: "Fuzzy PSI from IPE", ask: true, react: true,
       acts: [ { id, type: "poll", q: "...", opts: ["...", "..."], live: false },
               { id, type: "quiz", q, opts, correct: [1], secs: 20 },
               { id, type: "questions", q: "Questions for me?" },
               { id, type: "reactions", q: "How was the demo?" },
               { id, type: "leaderboard", q: "Quiz ranking" } ] }
   ask: phones may send questions at any time (else only during a "questions" activity); react: the reaction bar
   is on at any time (else only during a "reactions" activity). The Plans object adds the join secrets (withJoin).
   checkPlan() answers { plan } (cleaned, ids given where missing) or { error: "what is wrong, in words" }. */
export function checkPlan(input, code, rand) {
    rand = rand || Math.random;
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'The plan is not an object.' };
    if (!codeOk(code)) return { error: 'The code may have 2 to 20 lower case letters, digits and hyphens.' };
    const title = clean(input.title, LIMITS.title);
    if (!title) return { error: 'The talk needs a title.' };
    if (!Array.isArray(input.acts)) return { error: 'The plan has no list of activities.' };
    if (input.acts.length > LIMITS.acts) return { error: 'A plan has at most ' + LIMITS.acts + ' activities.' };
    const taken = {}, acts = [];
    for (let i = 0; i < input.acts.length; i++) {
        const r = checkAct(input.acts[i], i + 1);
        if (r.error) return r;
        let id = r.act.id;
        if (!ID.test(id || '') || taken[id]) id = newId(rand, taken);
        taken[id] = true;
        r.act.id = id;
        acts.push(r.act);
    }
    return { plan: { code: code, title: title, ask: input.ask === true, react: input.react === true, acts: acts } };
}

export function checkAct(a, n) {
    const where = 'Activity ' + n + ': ';
    if (!a || typeof a !== 'object') return { error: where + 'not an object.' };
    if (TYPES.indexOf(a.type) < 0) return { error: where + 'unknown type.' };
    const out = { id: typeof a.id === 'string' ? a.id : '', type: a.type, q: clean(a.q, LIMITS.q) };
    if (a.type === 'poll' || a.type === 'quiz') {
        if (!out.q) return { error: where + 'the question is empty.' };
        if (!Array.isArray(a.opts)) return { error: where + 'no answers.' };
        const opts = a.opts.map(function (o) { return clean(o, LIMITS.opt); });
        if (opts.length < LIMITS.minOpts || opts.length > LIMITS.maxOpts) return { error: where + 'give ' + LIMITS.minOpts + ' to ' + LIMITS.maxOpts + ' answers.' };
        if (opts.some(function (o) { return !o; })) return { error: where + 'an answer is empty.' };
        out.opts = opts;
    }
    if (a.type === 'poll') out.live = a.live === true;
    if (a.type === 'quiz') {
        const c = Array.isArray(a.correct) ? a.correct : [];
        const correct = [];
        for (const x of c) {
            if (!(Number.isInteger(x) && x >= 0 && x < out.opts.length)) return { error: where + 'a correct answer is not one of the answers.' };
            if (correct.indexOf(x) < 0) correct.push(x);
        }
        if (!correct.length) return { error: where + 'mark at least one correct answer.' };
        if (correct.length === out.opts.length) return { error: where + 'not every answer can be correct.' };
        out.correct = correct.sort(function (x, y) { return x - y; });
        const secs = Number(a.secs);
        out.secs = Number.isFinite(secs) ? Math.round(Math.min(LIMITS.maxSecs, Math.max(LIMITS.minSecs, secs))) : 20;
    }
    if (!out.q) out.q = { questions: 'Questions for the speaker', reactions: 'How is it going?', leaderboard: 'Quiz ranking' }[a.type];
    return { act: out };
}

/* the list entry of a plan on the presenter page */
export function summary(plan, updated) {
    return { code: plan.code, title: plan.title, n: plan.acts.length, updated: updated || 0 };
}

/* ---------- nicknames ---------- */
/* The leaderboards' rule and word lists, copied unchanged from tools/stats-worker/worker.js (test/run.js checks that the
   copy agrees): 2 to 20 Latin letters (with accents), digits, spaces and . _ ' -; none of the SHORT words as a whole
   word, none of the LONG ones anywhere, after lower case, accents removed and lookalike digits read as letters (and
   again with digits as gaps). The presenter still approves each nickname before others see it (session.js). */
export const SHORT = new Set(['sex', 'sexy', 'dick', 'dicks', 'cock', 'cocks', 'kill', 'kys', 'fag', 'fags', 'nazi', 'nazis',
    'gamo', 'hure', 'puta', 'fuk', 'rape', 'cunt', 'cunts', 'cunty', 'kunt', 'cvnt', 'twat', 'twats', 'arsch', 'admin']);
export const LONG = ['fuck', 'shit', 'bitch', 'pussy', 'penis', 'vagina', 'porn', 'hitler', 'nigg', 'faggot', 'retard', 'whore',
    'slut', 'wanker', 'wanka', 'dickhead', 'cocksuck', 'scheiss', 'fotze', 'hurensohn', 'wichs', 'arschloch',
    'schlampe', 'putain', 'merde', 'connard', 'salope', 'mierda', 'hijodeputa', 'cazzo', 'stronzo', 'vaffanculo', 'malaka',
    'gamoto', 'poutana', 'florias', 'moderator'];
const NAME_CH = 'A-Za-z0-9\\u00C0-\\u024F\\u1E00-\\u1EFF';   // Latin letters with accents (Latin-1, Extended A and B, Vietnamese)
const NAME_RE = new RegExp('^[' + NAME_CH + '][' + NAME_CH + ' ._\'-]{0,18}[' + NAME_CH + '.]$');
const LOOK = new Map([['0', 'o'], ['1', 'i'], ['3', 'e'], ['4', 'a'], ['5', 's'], ['7', 't'], ['8', 'b']]);
const FOLD = new Map([['ß', 'ss'], ['æ', 'ae'], ['œ', 'oe'], ['ø', 'o'], ['ł', 'l'], ['đ', 'd'], ['ð', 'd'], ['þ', 'th'],
    ['ı', 'i'], ['ħ', 'h'], ['ŧ', 't'], ['ŀ', 'l'], ['ĸ', 'k'], ['ŋ', 'n'], ['ƒ', 'f']]);
function fold(c) {
    const l = c.toLowerCase();
    if (/^[a-z]$/.test(l)) return l;
    if (FOLD.has(l)) return FOLD.get(l);
    const d = l.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return /^[a-z]+$/.test(d) ? d : null;
}
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
export function nameOk(raw) {
    if (typeof raw !== 'string') return false;
    const n = raw.normalize('NFC');
    if (!NAME_RE.test(n) || /  /.test(n) || /[×÷]/.test(n)) return false;
    for (const c of n) if (!/[0-9 ._'-]/.test(c) && fold(c) === null) return false;
    return [true, false].every(function (digits) {
        const ws = words(n, digits), flat = ws.join('');
        return !ws.some(function (w) { return SHORT.has(w); }) && !LONG.some(function (w) { return flat.indexOf(w) >= 0; });
    });
}

/* ---------- the presenter key ---------- */
/* A weak secret (under 24 characters, or without lower case, upper case and digits) opens nothing, so a short key set
   by mistake keeps everything locked. eq(a, b) compares two equal-length byte arrays in constant time (the Worker
   passes crypto.subtle.timingSafeEqual); without it a constant-time loop is used. */
export function strong(k) { return typeof k === 'string' && k.length >= 24 && k.length <= 200 && /[a-z]/.test(k) && /[A-Z]/.test(k) && /[0-9]/.test(k); }
export function keyOk(given, want, eq) {
    if (!strong(want) || typeof given !== 'string' || given.length < 24 || given.length > 200) return false;
    const a = utf8(given), b = utf8(want);
    if (eq && a.length === b.length) return eq(a, b);
    let d = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a[i % a.length] ^ b[i % b.length]) | (i >= a.length || i >= b.length ? 1 : 0);
    return d === 0;
}
function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    return Uint8Array.from(Buffer.from(s, 'utf8'));  // node 12 without a global TextEncoder
}
/* "Authorization: Bearer <key>" */
export function bearer(h) {
    const m = /^Bearer (\S{24,200})$/.exec(h || '');
    return m ? m[1] : '';
}

/* ---------- origins ---------- */
export const SITE = 'https://florias-papadopoulos.github.io';
/* the site, and with the DEV flag also http://localhost:<port> and http://127.0.0.1:<port> (local previews) */
export function originOk(o, dev) {
    if (o === SITE) return true;
    return !!dev && typeof o === 'string' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(o);
}
