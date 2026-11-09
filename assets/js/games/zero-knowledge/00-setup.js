/* Zero Knowledge: the cat (or dog) must convince Hoot, a sceptical guard owl, that it knows a secret without ever
   showing it. Every level is a real interactive proof, played with small numbers and pictures:

     Moon Cave         the ring cave with a door that opens with a magic word (honest, then without the word)
     Two Yarn Balls    the guard is colour blind, swaps the balls or not behind his back; you say which
     Sealed Envelopes  a 3-colouring of a map of gardens: repaint with shuffled colours, seal, the guard opens one fence
     Twin Maps         graph isomorphism: send a scrambled copy, show how it matches the map the guard asks for
     Square Root Club  square roots mod n (Fiat-Shamir style): x = r^2, a challenge bit, y = r or r*s mod n
     Bell Tower        Schnorr identification: t = g^r, a challenge c, s = r + c*x mod q; then a reused r leaks x
     Fake Video        the simulator: with a rewind button you fake a perfect video without the word
     Night Watch       you are the guard: shout sides and catch the bluffers, some of whom read your habits
     Fence Inspector   (Hard) you are the guard of the envelope proof and pick which fence to open

   You play three roles: the honest prover (quick and right answers score), the cheater (pick what to prepare, watch
   the odds) and the verifier (pick challenges that catch cheaters within a limited number of rounds). A line under
   the title shows the soundness at work: the chance that a cheater gets this far (1 in 2^k for one bit per round).

   A run: Easy 6 levels, Normal 8, Hard 9 (see ORDER in 90-run.js); Easy has smaller numbers, fewer rounds and twice
   the time. Trust: a wrong answer as the honest prover, a timeout, letting a cheater in or turning an honest prover
   away costs one paw of trust (Easy 5, Normal and Hard 3); with none left the run ends. Being caught while you
   play the cheater is the lesson, not a mistake, and costs nothing.
   Score: an honest round 20 plus up to 20 for speed; a cheater round survived 5; a right call as the guard 40 and
   3 for every round left unused; 50 for each level cleared; 25 for every paw of trust left at the end.

   With a dog chosen (html[data-pet="dog"]) the hero is a dog, the yarn balls are tennis balls, the seals are bones.

   This game is a folder of parts joined in name order into one script (layouts/_default/arcade.html; map in
   README.md). This part: helpers, the maths and the protocol logic (pure functions in LOGIC, which a test can load
   in node without a page), the styles and the level list. */
(function () {
    'use strict';
    var LEVELS = {};
    function level(def) { LEVELS[def.id] = def; }
    var LOGIC = {};

    /* ---------- small helpers ---------- */
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function ri(rnd, a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function pick(rnd, l) { return l[Math.floor(rnd() * l.length)]; }
    function shuffle(rnd, l) {
        l = l.slice();
        for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; }
        return l;
    }
    function mod(a, n) { return ((a % n) + n) % n; }
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
    function mulmod(a, b, m) { return (mod(a, m) * mod(b, m)) % m; }   /* all numbers here are small: no overflow */
    function powmod(b, e, m) { var r = 1 % m; b = mod(b, m); while (e > 0) { if (e & 1) r = (r * b) % m; b = (b * b) % m; e = Math.floor(e / 2); } return r; }
    function inv(a, m) {   /* extended Euclid; null when there is none */
        var t = 0, nt = 1, r = m, nr = mod(a, m);
        while (nr) { var q = Math.floor(r / nr), x; x = t - q * nt; t = nt; nt = x; x = r - q * nr; r = nr; nr = x; }
        return r === 1 ? mod(t, m) : null;
    }
    /* "1 in 8", "1 in 1,024", or a percent for chances that are not 1 in a power */
    function oneIn(n) { n = Math.round(n); return '1 in ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function pct(p) { return p >= 0.1 ? Math.round(p * 100) + '%' : p >= 0.001 ? (p * 100).toFixed(1) + '%' : 'under 0.1%'; }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    LOGIC.mod = mod; LOGIC.powmod = powmod; LOGIC.inv = inv; LOGIC.gcd = gcd; LOGIC.oneIn = oneIn;

    /* ---------- the ring cave: a prover who knows the word always comes out where asked; one who does not, only
       when the guard happens to shout the side it went in by ---------- */
    LOGIC.caveExit = function (entry, shout, knowsWord) { return knowsWord ? shout : entry; };
    LOGIC.cavePasses = function (entry, shout, knowsWord) { return LOGIC.caveExit(entry, shout, knowsWord) === shout; };
    /* does a video of shouts give itself away: always the same side ('same') or always switching ('switch')? */
    LOGIC.patterned = function (v) {
        if (v.length < 4) return false;
        var same = true, sw = true;
        for (var i = 1; i < v.length; i++) { if (v[i] !== v[0]) same = false; if (v[i] === v[i - 1]) sw = false; }
        return same ? 'same' : sw ? 'switch' : false;
    };

    /* ---------- maps (graphs) for the envelope and twin map levels ---------- */
    function segCross(a, b, c, d) {   /* do segments ab and cd cross (not just touch at an end)? */
        function o(p, q, r) { return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); }
        var d1 = o(a, b, c), d2 = o(a, b, d), d3 = o(c, d, a), d4 = o(c, d, b);
        return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    }
    /* points spread over the unit square (best of a few random tries) */
    function spread(rnd, n, minD) {
        var pts = [], tries = 0;
        while (pts.length < n && tries < 4000) {
            tries++;
            var p = { x: 0.1 + 0.8 * rnd(), y: 0.12 + 0.76 * rnd() }, ok = true;
            for (var i = 0; i < pts.length; i++) if (Math.hypot(pts[i].x - p.x, pts[i].y - p.y) < minD) { ok = false; break; }
            if (ok) pts.push(p);
            if (tries % 600 === 0 && pts.length < n) { pts = []; minD *= 0.9; }
        }
        return pts;
    }
    /* a connected, flat (no crossing fences) map of n gardens with a secret 3-colouring and about `want` fences.
       Fences only join gardens of different colours, so the colouring is always valid. */
    LOGIC.genColourMap = function (rnd, n, want) {
        for (var attempt = 0; attempt < 200; attempt++) {
            var pts = spread(rnd, n, 0.62 / Math.sqrt(n));
            var col = [], i, j;
            for (i = 0; i < n; i++) col.push(i % 3);
            col = shuffle(rnd, col);
            var cand = [];
            for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (col[i] !== col[j]) cand.push({ a: i, b: j, d: Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) });
            cand.sort(function (u, v) { return u.d - v.d; });
            var edges = [], deg = [];
            for (i = 0; i < n; i++) deg.push(0);
            var parent = []; for (i = 0; i < n; i++) parent.push(i);
            function root(x) { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; }
            function fits(c) {
                if (deg[c.a] >= 4 || deg[c.b] >= 4) return false;
                for (var k = 0; k < edges.length; k++) {
                    var e = edges[k];
                    if (e[0] === c.a || e[0] === c.b || e[1] === c.a || e[1] === c.b) continue;
                    if (segCross(pts[c.a], pts[c.b], pts[e[0]], pts[e[1]])) return false;
                }
                /* a fence must not pass right over another garden */
                for (k = 0; k < n; k++) {
                    if (k === c.a || k === c.b) continue;
                    var A = pts[c.a], B = pts[c.b], P = pts[k], dx = B.x - A.x, dy = B.y - A.y;
                    var t = clamp(((P.x - A.x) * dx + (P.y - A.y) * dy) / (dx * dx + dy * dy), 0, 1);
                    if (Math.hypot(A.x + t * dx - P.x, A.y + t * dy - P.y) < 0.07) return false;
                }
                return true;
            }
            /* first a tree (so the map is connected), then more fences up to `want` */
            cand.forEach(function (c) {
                if (root(c.a) !== root(c.b) && fits(c)) { edges.push([c.a, c.b]); deg[c.a]++; deg[c.b]++; parent[root(c.a)] = root(c.b); }
            });
            if (edges.length !== n - 1) continue;
            for (i = 0; i < cand.length && edges.length < want; i++) {
                var c = cand[i];
                if (edges.some(function (e) { return (e[0] === c.a && e[1] === c.b) || (e[0] === c.b && e[1] === c.a); })) continue;
                if (fits(c)) { edges.push([c.a, c.b]); deg[c.a]++; deg[c.b]++; }
            }
            if (edges.length < want) continue;
            return { nodes: pts, edges: edges, col: col };
        }
        return null;
    };
    LOGIC.validColouring = function (edges, col) { return edges.every(function (e) { return col[e[0]] !== col[e[1]]; }); };
    /* a shuffle of the three colours that moves every colour (so the change is visible every round) */
    LOGIC.colourShuffle = function (rnd) { return rnd() < 0.5 ? [1, 2, 0] : [2, 0, 1]; };
    LOGIC.applyShuffle = function (col, perm) { return col.map(function (c) { return perm[c]; }); };

    /* twin maps: B is A with its gardens renamed by the secret key pi (A node i is B node pi[i]) and drawn elsewhere */
    function edgeSet(edges) { var s = {}; edges.forEach(function (e) { s[Math.min(e[0], e[1]) + '-' + Math.max(e[0], e[1])] = 1; }); return s; }
    LOGIC.relabel = function (edges, map) { return edges.map(function (e) { return [map[e[0]], map[e[1]]]; }); };
    /* is `map` (node of X -> node of Y) a matching that turns the tunnels of X into exactly the tunnels of Y? */
    LOGIC.isIso = function (n, edgesX, edgesY, map) {
        if (!map || map.length !== n || edgesX.length !== edgesY.length) return false;
        var seen = {};
        for (var i = 0; i < n; i++) { if (typeof map[i] !== 'number' || map[i] < 0 || map[i] >= n || seen[map[i]]) return false; seen[map[i]] = 1; }
        var sy = edgeSet(edgesY);
        return edgesX.every(function (e) { var a = map[e[0]], b = map[e[1]]; return sy[Math.min(a, b) + '-' + Math.max(a, b)] === 1; });
    };
    LOGIC.randPerm = function (rnd, n) { var p = []; for (var i = 0; i < n; i++) p.push(i); return shuffle(rnd, p); };
    LOGIC.invPerm = function (p) { var q = []; for (var i = 0; i < p.length; i++) q[p[i]] = i; return q; };
    /* the honest answer when the guard asks about B: B node j is A node pi^-1(j), which is copy node sigma(pi^-1(j)) */
    LOGIC.isoAnswer = function (sigma, pi, askB) {
        if (!askB) return sigma.slice();
        var pinv = LOGIC.invPerm(pi);
        return pinv.map(function (a) { return sigma[a]; });
    };
    /* a map for the twin level: connected, no crossings, with no symmetry (so the matching is unique and the key matters;
       the smallest such maps have 6 rooms) */
    LOGIC.genTwin = function (rnd, n, want) {
        for (var k = 0; k < 200; k++) {
            var m = LOGIC.genColourMap(rnd, n, want);
            if (!m) continue;
            var autos = 0, perms = allPerms(n);
            for (var i = 0; i < perms.length && autos < 2; i++) if (LOGIC.isIso(n, m.edges, m.edges, perms[i])) autos++;
            if (autos === 1) return m;
        }
        return LOGIC.genColourMap(rnd, n, want);   /* a map with a symmetry still works: any matching that fits passes */
    };
    function allPerms(n) {
        var out = [];
        (function go(p, used) {
            if (p.length === n) { out.push(p.slice()); return; }
            for (var i = 0; i < n; i++) if (!used[i]) { used[i] = 1; p.push(i); go(p, used); p.pop(); used[i] = 0; }
        })([], {});
        return out;
    }

    /* ---------- square roots mod n: public n = p q and v = s^2 mod n; the secret is s ---------- */
    LOGIC.SQ = {
        normal: [[7, 11], [7, 13], [11, 13]],
        hard: [[13, 17], [13, 19], [17, 19]]
    };
    LOGIC.genSq = function (rnd, lv) {
        var pq = pick(rnd, LOGIC.SQ[lv] || LOGIC.SQ.normal), n = pq[0] * pq[1], s;
        do { s = ri(rnd, 3, lv === 'hard' ? 14 : 9); } while (gcd(s, n) !== 1);
        return { p: pq[0], q: pq[1], n: n, s: s, v: mulmod(s, s, n) };
    };
    LOGIC.sqR = function (rnd, n, lv) { var r; do { r = ri(rnd, 4, lv === 'hard' ? 40 : 25); } while (gcd(r, n) !== 1); return r; };
    LOGIC.sqAnswer = function (P, r, c) { return c ? mulmod(r, P.s, P.n) : mod(r, P.n); };
    LOGIC.sqCheck = function (P, x, c, y) { return mulmod(y, y, P.n) === (c ? mulmod(x, P.v, P.n) : mod(x, P.n)); };
    /* the impostor's two preparations: ready for 0 sends x = r^2 (answer r), ready for 1 sends x = r^2 / v (answer r) */
    LOGIC.sqCheat = function (P, r, ready) { return ready ? mulmod(mulmod(r, r, P.n), inv(P.v, P.n), P.n) : mulmod(r, r, P.n); };

    /* ---------- Schnorr: g has order q mod p; public y = g^x; the secret is x ---------- */
    LOGIC.GROUPS = { easy: { p: 11, q: 5, g: 3 }, normal: { p: 23, q: 11, g: 2 }, hard: { p: 47, q: 23, g: 2 } };
    LOGIC.genSchnorr = function (rnd, lv) {
        var G = LOGIC.GROUPS[lv] || LOGIC.GROUPS.normal, x = ri(rnd, 2, G.q - 1);
        return { p: G.p, q: G.q, g: G.g, x: x, y: powmod(G.g, x, G.p) };
    };
    LOGIC.schAnswer = function (S, r, c) { return mod(r + c * S.x, S.q); };
    LOGIC.schCheck = function (S, t, c, s) { return powmod(S.g, s, S.p) === mulmod(t, powmod(S.y, c, S.p), S.p); };
    /* the simulator (and the impostor who bets on a challenge): pick c and s first, then t = g^s * y^-c */
    LOGIC.schFake = function (S, c, s) { return mulmod(powmod(S.g, s, S.p), inv(powmod(S.y, c, S.p), S.p), S.p); };
    /* two answers to one t give the secret: x = (s1 - s2) / (c1 - c2) mod q */
    LOGIC.schExtract = function (S, c1, s1, c2, s2) { return mulmod(mod(s1 - s2, S.q), inv(mod(c1 - c2, S.q), S.q), S.q); };

    /* ---------- the bluffers of Night Watch: where each goes in, from the guard's shouts so far ('L' / 'R') ---------- */
    function other(s) { return s === 'L' ? 'R' : 'L'; }
    LOGIC.BLUFFERS = {
        coin:    function (h, rnd) { return rnd() < 0.5 ? 'L' : 'R'; },
        lefty:   function () { return 'L'; },
        copycat: function (h, rnd) { return h.length ? h[h.length - 1] : (rnd() < 0.5 ? 'L' : 'R'); },
        zigzag:  function (h, rnd) { return h.length ? other(h[h.length - 1]) : (rnd() < 0.5 ? 'L' : 'R'); },
        /* reads the guard: what usually came after the last two shouts, in everything the guard shouted tonight */
        reader:  function (h, rnd) {
            if (h.length < 3) return rnd() < 0.5 ? 'L' : 'R';
            var key = h.slice(-2).join(''), nL = 0, nR = 0;
            for (var i = 2; i < h.length; i++) if (h[i - 2] + h[i - 1] === key) { if (h[i] === 'L') nL++; else nR++; }
            if (nL === nR) { nL = h.filter(function (s) { return s === 'L'; }).length; nR = h.length - nL; }
            return nL === nR ? (rnd() < 0.5 ? 'L' : 'R') : nL > nR ? 'L' : 'R';
        }
    };
    /* Fence Inspector: which fence a cheater leaves bad this round, from the fences the guard opened so far */
    LOGIC.FENCERS = {
        fixed: function (hist, E, me) { return me.bad; },
        sneak: function (hist, E, me, rnd) {   /* the fence the guard just opened: guards seldom open the same one twice in a row */
            return hist.length ? hist[hist.length - 1] : Math.floor(rnd() * E);
        }
    };

    /* ---------- colours of the visitor's pet (cat.css), read once per game ---------- */
    function petColours() {
        var cs = null;
        try { cs = getComputedStyle(document.documentElement); } catch (e) { /* ginger */ }
        function v(name, dflt) { var s = cs && cs.getPropertyValue('--' + name).trim(); return s || dflt; }
        var dog = document.documentElement.dataset.pet === 'dog';
        return { dog: dog, fur: v('fur-bot', dog ? '#c98546' : '#f0932c'), light: v('fur-top', dog ? '#e8b57a' : '#ffc06e'),
                 head: v('head-top', dog ? '#ecbd86' : '#ffc479'), stripe: v('stripe', '#cf7419'), cream: v('cream', '#ffe9c9'),
                 tail: v('tail', '#f5a03c'), iris: v('iris', '#8ed383'), ear: v('ear', '#8a5428'), nose: v('nose', '#2b2220'),
                 dark: v('fur-dark', '#de8a2c') };
    }

    /* the colours of the map paints, each with a mark of its own so they can be told apart without colour */
    var PAINT = [
        { c: '#e5484d', name: 'red', mark: 'dot' },
        { c: '#3b6fd8', name: 'blue', mark: 'tri' },
        { c: '#f2b705', name: 'yellow', mark: 'bar' }
    ];
    var INK = '#231f3a';

    var CSS =
        '.zk { position: absolute; inset: 0; display: flex; flex-direction: column; background: #f4f1ea; color: #231f3a;' +
        '  -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }' +
        'html[data-pet="dog"] .zk { background: #faf4ea; }' +
        '.zk button { font: inherit; color: inherit; cursor: pointer; touch-action: manipulation; }' +
        '.zk button:focus-visible { outline: 3px solid #4a5bd4; outline-offset: 2px; }' +
        '.zk-top { flex: none; display: flex; align-items: center; gap: 10px; padding: 8px 14px 4px; }' +
        '.zk-title { flex: 1 1 auto; min-width: 0; font-weight: 800; font-size: 1.05rem; line-height: 1.2; }' +
        '.zk-title small { display: block; color: #6f6888; font-size: .74rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }' +
        '.zk-title span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
        '.zk-role { flex: none; padding: 3px 9px; border: 2px solid #231f3a; border-radius: 6px; font-weight: 800; font-size: .8rem; white-space: nowrap; }' +
        '.zk-role.honest { background: #dff1e1; } .zk-role.cheat { background: #fde2e7; } .zk-role.check { background: #e2e6fb; } .zk-role.film { background: #fff1c7; }' +
        '.zk-trust { flex: none; display: flex; gap: 2px; } .zk-trust svg { width: 18px; height: 18px; fill: #d6336c; } .zk-trust svg.off { fill: #d8d3e4; }' +
        '.zk-odds { flex: none; display: flex; align-items: center; gap: 8px; min-height: 22px; padding: 0 14px; font-size: .88rem; font-weight: 700; color: #423b5e; }' +
        '.zk-odds[hidden] { display: none; }' +
        '.zk-odds-bar { flex: 0 0 90px; height: 8px; border: 2px solid #231f3a; border-radius: 6px; background: #fff; overflow: hidden; }' +
        '.zk-odds-bar i { display: block; height: 100%; background: #d6336c; transition: width .4s; }' +
        '.zk-stage { position: relative; flex: 1 1 auto; min-height: 150px; }' +
        '.zk-stage canvas { position: absolute; left: 0; top: 0; display: block; }' +
        '.zk-time { flex: none; height: 6px; margin: 0 14px; background: #e3dfee; border-radius: 3px; overflow: hidden; visibility: hidden; }' +
        '.zk-time.on { visibility: visible; } .zk-time i { display: block; height: 100%; width: 100%; background: #4a5bd4; }' +
        '.zk-time.low i { background: #d6336c; }' +
        '.zk-panel { flex: none; max-height: 58%; overflow-y: auto; touch-action: pan-y; padding: 8px 14px 64px; display: flex; flex-direction: column; align-items: center; gap: 8px; }' +
        '.zk-msg { margin: 0; max-width: 680px; text-align: center; line-height: 1.42; font-size: .98rem; color: #2f2950; min-height: 2.8em; }' +
        '.zk-msg b { color: #231f3a; } .zk-msg .who { font-weight: 800; color: #8a5a00; }' +
        '.zk-ctrl { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; max-width: 680px; }' +
        '.zk-btn { min-height: 42px; padding: 6px 16px; border: 2px solid #231f3a; border-radius: 8px; background: #fff; box-shadow: 0 3px 0 #231f3a; font-weight: 800; }' +
        '.zk-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #231f3a; }' +
        '.zk-btn:disabled { opacity: .4; cursor: default; transform: none; box-shadow: 0 3px 0 #231f3a; }' +
        '.zk-go { background: #4a5bd4; color: #fff !important; }' +
        '.zk-no { background: #fde2e7; } .zk-yes { background: #dff1e1; } .zk-sel { background: #ffe9a8; }' +
        '.zk-sym { min-width: 46px; font-size: 1.25rem; padding: 4px 10px; }' +
        '.zk-note { font: 700 .92rem/1.5 ui-monospace, Menlo, Consolas, monospace; text-align: center; color: #2f2950; }' +
        '.zk-note b { color: #231f3a; } .zk-ok { color: #2f8a3a; } .zk-bad { color: #c92a54; }' +
        '.zk-pts { position: absolute; z-index: 3; left: 50%; top: 40%; transform: translateX(-50%); font-weight: 800; font-size: 1.3rem; color: #2f8a3a;' +
        '  pointer-events: none; animation: zk-up 1.1s ease-out forwards; }' +
        '.zk-pts.bad { color: #c92a54; }' +
        '@keyframes zk-up { from { opacity: 1; margin-top: 0; } to { opacity: 0; margin-top: -46px; } }' +
        /* number pad */
        '.zk-pad { display: flex; flex-direction: column; align-items: center; gap: 6px; }' +
        '.zk-pad-show { min-width: 140px; padding: 4px 12px; border: 2px solid #231f3a; border-radius: 8px; background: #fff; text-align: center;' +
        '  font: 800 1.35rem/1.25 ui-monospace, Menlo, Consolas, monospace; }' +
        '.zk-pad-show small { display: block; font: 700 .7rem/1.2 system-ui, sans-serif; color: #6f6888; text-transform: uppercase; letter-spacing: .05em; }' +
        '.zk-keys { display: grid; grid-template-columns: repeat(6, 46px); gap: 6px; }' +
        '.zk-keys button { height: 40px; padding: 0; border: 2px solid #231f3a; border-radius: 8px; background: #fff; box-shadow: 0 2px 0 #231f3a; font-weight: 800; font-size: 1.05rem; }' +
        '.zk-keys button:active { transform: translateY(2px); box-shadow: none; }' +
        '.zk-keys .ok { grid-column: span 2; background: #4a5bd4; color: #fff !important; }' +
        /* the cards between levels */
        '.zk-cover { position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center; padding: 14px;' +
        '  background: rgba(244, 241, 234, .94); overflow-y: auto; touch-action: pan-y; }' +
        'html[data-pet="dog"] .zk-cover { background: rgba(250, 244, 234, .94); }' +
        '.zk-cover[hidden] { display: none; }' +
        '.zk-card { max-width: 480px; margin: auto; padding: 20px 22px 18px; border: 2px solid #231f3a; border-radius: 14px; background: #fff; box-shadow: 0 6px 0 #231f3a; text-align: center; }' +
        '.zk-card h3 { margin: 0 0 4px; font-size: 1.35rem; }' +
        '.zk-card .tag { margin: 0 0 10px; color: #6f6888; font-size: .8rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }' +
        '.zk-card p { margin: 0 0 12px; line-height: 1.45; color: #3a3358; }' +
        '.zk-card .fact { font-style: italic; }' +
        '.zk-card a { color: #4a5bd4; font-weight: 700; }' +
        '.zk-steps { display: flex; gap: 4px; justify-content: center; margin-bottom: 10px; }' +
        '.zk-steps i { width: 12px; height: 12px; border-radius: 50%; background: #ddd8ee; }' +
        '.zk-steps i.done { background: #4a5bd4; } .zk-steps i.now { background: #ffb400; }' +
        '@media (max-width: 520px) { .zk-top { padding: 6px 10px 2px; gap: 6px; } .zk-title { font-size: .95rem; } .zk-role { font-size: .72rem; padding: 2px 6px; }' +
        '  .zk-odds { padding: 0 10px; font-size: .8rem; } .zk-odds-bar { flex-basis: 54px; } .zk-panel { padding: 6px 10px 60px; } .zk-msg { font-size: .92rem; }' +
        '  .zk-keys { grid-template-columns: repeat(6, 42px); } .zk-btn { padding: 6px 12px; } .zk-trust svg { width: 15px; height: 15px; } }' +
        '@media (pointer: coarse) { .zk button { font-size: 16px; } .zk-sym { font-size: 1.25rem; } }';
