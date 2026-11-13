/* Checks of the geometry of /phd/projects/gfm/ (assets/js/gfm/10-core.js): node assets/js/gfm/test/run.js
   Partitioner: at every resolution, the rectangles are disjoint and inside the region, no two of them could still be
   fused, and every lattice point of the region is covered exactly once by a rectangle or a residual point.
   DASA: Alice's strings are exactly the maximal complete subtries of the interval, and one of Bob's strings matches
   one of Alice's exactly when his value is in the interval. */
'use strict';
var G = require('../10-core.js');
var N = G.N, fails = 0, checks = 0;
function ok(c, msg) { checks++; if (!c) { fails++; if (fails < 20) console.log('FAIL', msg); } }

var seed = 7;
function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

var regions = [
    { kind: 'ball', cx: 64, cy: 64, R: 20, p: 2 },
    { kind: 'ball', cx: 10, cy: 120, R: 30, p: 1 },
    { kind: 'ball', cx: 100, cy: 40, R: 25, p: 4 },
    { kind: 'ball', cx: 60, cy: 60, R: 13, p: Infinity },
    { kind: 'ball', cx: 3, cy: 3, R: 1, p: 2 },
    { kind: 'poly', pts: [[6, 8], [30, 5], [41, 14], [39, 33], [20, 36], [8, 28]] },
    { kind: 'poly', pts: [[6, 7], [41, 4], [59, 17], [58, 50], [31, 56], [7, 45]] },
    { kind: 'boxes', boxes: [{ x0: 6, y0: 68, x1: 58, y1: 78 }, { x0: 6, y0: 76, x1: 20, y1: 99 }, { x0: 44, y0: 76, x1: 58, y1: 99 }, { x0: 19, y0: 84, x1: 45, y1: 93 }] },
    { kind: 'ball', cx: 98, cy: 83, R: 25, p: 2 },
    { kind: 'poly', pts: [[10, 10], [100, 20], [20, 40], [110, 90], [5, 120]] },
    { kind: 'boxes', boxes: [{ x0: 52, y0: 47, x1: 85, y1: 57 }, { x0: 52, y0: 55, x1: 63, y1: 72 }, { x0: 74, y0: 55, x1: 85, y1: 72 }] }
];
for (var t = 0; t < 12; t++) {
    var pts = [], n = 3 + Math.floor(rnd() * 6);
    for (var i = 0; i < n; i++) pts.push([rnd() * 128, rnd() * 128]);
    regions.push({ kind: 'poly', pts: pts });
    var bs = [];
    for (i = 0; i < 1 + Math.floor(rnd() * 4); i++) {
        var x0 = Math.floor(rnd() * 120), y0 = Math.floor(rnd() * 120);
        bs.push({ x0: x0, y0: y0, x1: Math.min(127, x0 + Math.floor(rnd() * 40)), y1: Math.min(127, y0 + Math.floor(rnd() * 40)) });
    }
    regions.push({ kind: 'boxes', boxes: bs });
}

regions.forEach(function (rg, ri) {
    var m = G.mask(rg), S = G.sums(m);
    for (var r = 1; r <= G.RMAX; r++) {
        var p = G.partition(m, r, S), hits = new Uint8Array(N * N), tag = 'region ' + ri + ' r=' + r;
        p.rects.forEach(function (h) {
            for (var y = h.y0; y <= h.y1; y++) for (var x = h.x0; x <= h.x1; x++) {
                ok(m[y * N + x] === 1, tag + ': rectangle point outside the region');
                hits[y * N + x]++;
            }
        });
        p.res.forEach(function (k) { ok(m[k] === 1, tag + ': residual outside'); hits[k]++; });
        var once = true;
        for (var k = 0; k < N * N; k++) if (hits[k] !== (m[k] ? 1 : 0)) once = false;
        ok(once, tag + ': not covered exactly once');
        for (var a = 0; a < p.rects.length; a++) for (var b = 0; b < p.rects.length; b++) {
            if (a === b) continue;
            var A = p.rects[a], B = p.rects[b];
            ok(!((A.y0 === B.y0 && A.y1 === B.y1 && A.x1 + 1 === B.x0) || (A.x0 === B.x0 && A.x1 === B.x1 && A.y1 + 1 === B.y0)), tag + ': could still fuse');
        }
        p.rects.forEach(function (h) {
            ok((h.x1 - h.x0 + 1) % r === 0 && (h.y1 - h.y0 + 1) % r === 0, tag + ': rectangle not made of whole cells');
        });
        ok(p.K === p.rects.length && p.L === p.res.length, tag + ': counts');
        var c = G.cost(p);
        ok(c.total === c.alice + c.bob, tag + ': balanced is Alice plus Bob');
        ok((c.bob === 0) === (p.K === 0), tag + ': Bob works only for rectangles');
        ok(c.bits >= 2 * G.LAMBDA * (p.L + p.K), tag + ': message holds at least one pair per entry');
    }
    /* each "Best for" choice: r* is the first resolution with the smallest value */
    var sw = G.sweep(m);
    G.GOALS.forEach(function (g) {
        var b = sw.best[g], v = sw.list[b - 1][g];
        sw.list.forEach(function (e) { ok(e[g] > v || (e[g] === v && e.r >= b), 'region ' + ri + ' ' + g + ': r* not the first minimum'); });
    });
});

/* one rectangle of 8 x 8 points at r = 1, by hand: 2 floor(log2 8) = 6 strings per axis, J_S = 4 * 4 = 16,
   kappa' = 40 + 0 + 2 ceil(log2(log2 3.5)) = 42 */
(function () {
    var c = G.cost(G.partition(G.mask({ kind: 'boxes', boxes: [{ x0: 0, y0: 0, x1: 7, y1: 7 }] }), 1));
    ok(c.alice === 12 + 16 && c.bob === 32 && c.total === 60, 'hand example: work');
    ok(c.kappa === 42 && c.bits === 512 * 12 + (256 + 42) * 16, 'hand example: message bits ' + c.bits);
})();

/* DASA */
function isPrefixOf(str, v) {           /* does the string with * bits match the 7-bit value v */
    var b = G.bits(v, G.BITS);
    for (var i = 0; i < G.BITS; i++) if (str[i] !== '*' && str[i] !== b[i]) return false;
    return true;
}
for (var lo = 0; lo < N; lo += 3) for (var hi = lo; hi < N; hi += 5) {
    var A = G.recStrings(lo, hi), seen = new Uint8Array(N);
    A.forEach(function (a) {
        for (var v = 0; v < N; v++) if (isPrefixOf(a.s, v)) { ok(v >= lo && v <= hi, 'DASA_R covers outside'); seen[v]++; }
        /* maximal: the parent subtrie (one more *) is not inside the interval */
        if (a.k < G.BITS) {
            var size = 1 << (a.k + 1), start = a.lo - (a.lo % size);
            ok(start < lo || start + size - 1 > hi, 'DASA_R subtrie not maximal ' + lo + '..' + hi);
        }
    });
    for (var v = 0; v < N; v++) ok(seen[v] === (v >= lo && v <= hi ? 1 : 0), 'DASA_R not exactly once ' + lo + '..' + hi);
    ok(A.length <= Math.max(1, 2 * G.log2floor(hi - lo + 1)), 'DASA_R more strings than the padding ' + lo + '..' + hi);
    var w = hi - lo + 1, wmax = Math.min(128, w + Math.floor(rnd() * 20));
    for (var q = 0; q < N; q++) {
        var B = G.sndStrings(q, wmax), match = false;
        B.forEach(function (bs) { A.forEach(function (as) { if (as.s === bs.s) match = true; }); });
        ok(match === (q >= lo && q <= hi), 'DASA match wrong q=' + q + ' ' + lo + '..' + hi);
        ok(B.length === G.log2floor(wmax) + 1, 'DASA_S count');
    }
}

console.log(checks + ' checks, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
