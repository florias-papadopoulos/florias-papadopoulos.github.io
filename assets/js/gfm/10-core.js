/* The geometry of /phd/projects/gfm/ (no drawing here, so node can test it: assets/js/gfm/test/run.js).
   Written from the paper "Privacy-preserving Proximity Testing from Geometric Fuzzy Matching" (ASIA CCS 2026):
   the region on a 128 x 128 lattice (7-bit coordinates), Partitioner / CutAndFuse (Section 3), the cost of a
   resolution counted from the protocol (Section 4), and DASA (Section 2). Lattice point (x, y) is index y * N + x. */
var GFM = (function () {
    'use strict';
    var N = 128, BITS = 7;

    function log2floor(w) { return 31 - Math.clz32(w); }

    /* ---------- regions: which lattice points are inside ---------- */
    /* ball: {kind: 'ball', cx, cy, R, p} with p = 1, 2, 4 or Infinity (the l_p norms);
       poly: {kind: 'poly', pts: [[x, y], ...]} in drawing units, lattice point (x, y) sits at (x + 0.5, y + 0.5);
       boxes: {kind: 'boxes', boxes: [{x0, y0, x1, y1}, ...]} inclusive lattice ranges, overlapping allowed */
    function inBall(rg, x, y) {
        var dx = Math.abs(x - rg.cx), dy = Math.abs(y - rg.cy);
        if (rg.p === Infinity) return Math.max(dx, dy) <= rg.R;
        return Math.pow(dx, rg.p) + Math.pow(dy, rg.p) <= Math.pow(rg.R, rg.p) + 1e-9;
    }
    function inPoly(pts, px, py) {
        var inside = false;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }
    function mask(rg) {
        var m = new Uint8Array(N * N), x, y;
        if (rg.kind === 'boxes') {
            rg.boxes.forEach(function (b) {
                for (y = Math.max(0, b.y0); y <= Math.min(N - 1, b.y1); y++)
                    for (x = Math.max(0, b.x0); x <= Math.min(N - 1, b.x1); x++) m[y * N + x] = 1;
            });
            return m;
        }
        for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
            if (rg.kind === 'ball' ? inBall(rg, x, y) : inPoly(rg.pts, x + 0.5, y + 0.5)) m[y * N + x] = 1;
        }
        return m;
    }

    /* ---------- Partitioner / CutAndFuse ---------- */
    function bbox(m) {
        var b = null;
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (m[y * N + x]) {
            if (!b) b = { x0: x, y0: y, x1: x, y1: y };
            else { if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; }
        }
        return b;
    }
    function sums(m) {           /* 2D prefix sums: how many inside points in any box, in O(1) */
        var S = new Int32Array((N + 1) * (N + 1));
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++)
            S[(y + 1) * (N + 1) + x + 1] = m[y * N + x] + S[y * (N + 1) + x + 1] + S[(y + 1) * (N + 1) + x] - S[y * (N + 1) + x];
        return S;
    }
    function count(S, x0, y0, x1, y1) {
        var W = N + 1;
        return S[(y1 + 1) * W + x1 + 1] - S[y0 * W + x1 + 1] - S[(y1 + 1) * W + x0] + S[y0 * W + x0];
    }
    /* fuse two rectangles that share a whole side, until none do */
    function fuseAll(rects) {
        var merged = true;
        while (merged) {
            merged = false;
            for (var i = 0; i < rects.length && !merged; i++) for (var j = 0; j < rects.length && !merged; j++) {
                if (i === j) continue;
                var a = rects[i], b = rects[j];
                var side = (a.y0 === b.y0 && a.y1 === b.y1 && a.x1 + 1 === b.x0) || (a.x0 === b.x0 && a.x1 === b.x1 && a.y1 + 1 === b.y0);
                if (side) {
                    rects[i] = { x0: a.x0, y0: a.y0, x1: b.x1, y1: b.y1 };
                    rects.splice(j, 1);
                    merged = true;
                }
            }
        }
        return rects;
    }
    /* CutAndFuse at resolution r, then the residual points (Phase 2). Cells hold r x r lattice points, from the
       bounding box's corner; a cell is kept when all its points are inside. Also returns the stages for the animation. */
    function partition(m, r, S) {
        var b = bbox(m);
        var out = { r: r, box: b, cols: 0, rows: 0, cells: [], runs: [], rects: [], res: [], K: 0, L: 0 };
        if (!b) return out;
        S = S || sums(m);
        out.cols = Math.floor((b.x1 - b.x0 + 1) / r);
        out.rows = Math.floor((b.y1 - b.y0 + 1) / r);
        var runs = [], open = {}, cols = [];
        for (var ky = 0; ky < out.rows; ky++) {
            var y = b.y0 + ky * r, run = null, rowRuns = [];
            for (var kx = 0; kx < out.cols; kx++) {
                var x = b.x0 + kx * r;
                if (count(S, x, y, x + r - 1, y + r - 1) === r * r) {
                    out.cells.push({ x: x, y: y });
                    if (run && run.x1 + 1 === x) run.x1 = x + r - 1;
                    else { run = { x0: x, y0: y, x1: x + r - 1, y1: y + r - 1 }; rowRuns.push(run); }
                } else run = null;
            }
            /* along rows done; now stack runs of the same width on the run just above */
            var nextOpen = {};
            rowRuns.forEach(function (rr) {
                runs.push({ x0: rr.x0, y0: rr.y0, x1: rr.x1, y1: rr.y1 });
                var key = rr.x0 + ',' + rr.x1, above = open[key];
                if (above) { above.y1 = rr.y1; nextOpen[key] = above; }
                else { var c = { x0: rr.x0, y0: rr.y0, x1: rr.x1, y1: rr.y1 }; cols.push(c); nextOpen[key] = c; }
            });
            open = nextOpen;
        }
        out.runs = runs;
        out.rects = fuseAll(cols);
        out.K = out.rects.length;
        var cov = new Uint8Array(N * N);
        out.rects.forEach(function (h) {
            for (var yy = h.y0; yy <= h.y1; yy++) for (var xx = h.x0; xx <= h.x1; xx++) cov[yy * N + xx] = 1;
        });
        for (var i = 0; i < N * N; i++) if (m[i] && !cov[i]) out.res.push(i);
        out.L = out.res.length;
        out.cover = cov;
        return out;
    }

    /* ---------- the cost of a partition, counted from the protocol (Section 4) ----------
       A box of w lattice points along an axis has half side delta with 2 delta + 1 = w. Alice puts
       2 floor(log2(2 delta + 1)) padded strings per box and axis into her OKVS (GetList), plus the L residual points
       (GetList_res); Bob makes J_S = prod_i (floor(log2(2 delta_max,i + 1)) + 1) string vectors (SndStrings), does d
       lookups for each of them in every box (GetTuples), and Alice checks the K * J_S answers. These are the terms of
       the paper's complexity theorem: 2dK log delta + K (log delta)^d + L for Alice and dK (log delta)^d for Bob. */
    function cost(part) {
        var d = 2, alice = 0, wmx = 1, wmy = 1;
        part.rects.forEach(function (h) {
            var wx = h.x1 - h.x0 + 1, wy = h.y1 - h.y0 + 1;
            alice += Math.max(1, 2 * log2floor(wx)) + Math.max(1, 2 * log2floor(wy));
            if (wx > wmx) wmx = wx;
            if (wy > wmy) wmy = wy;
        });
        var JS = (log2floor(wmx) + 1) * (log2floor(wmy) + 1);
        var answers = part.K * JS;
        return { total: alice + part.L + answers + d * answers, alice: alice + part.L + answers, bob: d * answers, JS: JS, wmax: [wmx, wmy] };
    }
    var RMAX = 32;
    function sweep(m) {
        var S = sums(m), list = [], best = 1;
        for (var r = 1; r <= RMAX; r++) {
            var p = partition(m, r, S), c = cost(p);
            list.push({ r: r, K: p.K, L: p.L, cost: c.total });
            if (c.total < list[best - 1].cost) best = r;
        }
        return { list: list, best: best, S: S };
    }

    /* ---------- DASA (Section 2) ---------- */
    function bits(v, n) { var s = v.toString(2); while (s.length < n) s = '0' + s; return s; }
    function star(v, k) { return bits(v >> k, BITS - k) + new Array(k + 1).join('*'); }
    /* DASA_R: the maximal complete subtries of the prefix trie whose leaves are lo..hi, as prefixes with * bits */
    function recStrings(lo, hi) {
        var out = [], x = lo;
        while (x <= hi) {
            var k = 0;
            while (k < BITS && x % (1 << (k + 1)) === 0 && x + (1 << (k + 1)) - 1 <= hi) k++;
            out.push({ s: star(x, k), k: k, lo: x, hi: x + (1 << k) - 1 });
            x += 1 << k;
        }
        return out;
    }
    /* DASA_S: Bob's value with its last i bits replaced by *, i = 0 .. floor(log2(2 delta + 1)) */
    function sndStrings(q, w) {
        var out = [];
        for (var i = 0; i <= log2floor(w); i++) out.push({ s: star(q, i), k: i });
        return out;
    }

    /* which piece holds lattice point (x, y): {rect: index} or {res: true} or null */
    function locate(part, x, y) {
        for (var i = 0; i < part.rects.length; i++) {
            var h = part.rects[i];
            if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return { rect: i };
        }
        if (part.res.indexOf(y * N + x) >= 0) return { res: true };
        return null;
    }

    return {
        N: N, BITS: BITS, RMAX: RMAX, mask: mask, bbox: bbox, sums: sums, partition: partition, cost: cost, sweep: sweep,
        recStrings: recStrings, sndStrings: sndStrings, bits: bits, locate: locate, inPoly: inPoly, log2floor: log2floor
    };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = GFM;
