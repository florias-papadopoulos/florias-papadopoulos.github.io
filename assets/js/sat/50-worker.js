/* The satellites page, part 50: the worker that screens for close approaches (its own script: sgp4 bundle, 00, 50).
   An approximate screening of public data, nothing like an operational conjunction assessment:

   1. every object is propagated with SGP4 every 5 minutes over the chosen hours;
   2. between those samples, positions and velocities come from Hermite interpolation, every DT seconds;
   3. at each of those steps the objects go into a grid of cells, and only objects in neighbouring cells are compared:
      their relative motion is taken as straight over the next DT seconds, and a pair whose straight-line miss distance
      is under the limit (plus a margin) becomes a candidate;
   4. each candidate is refined with SGP4 itself (a golden-section search for the time of closest approach).

   Pairs moving together (under 50 m/s apart: docked, in formation, fragments of one breakup still close) and pairs
   inside one group marked "own" (Starlink, whose operator keeps its own satellites apart) are left out.

   In:  { cmd: 'screen', id, objs: [{ rec, own }], start (ms), hours, km }
   Out: { id, progress: 0..1 } while working, then { id, done: true, list: [{ a, b, t, d, v, alt }], objects, steps } */
(function () {
    'use strict';
    var H = 300;            /* seconds between SGP4 samples */
    var DT = 15;            /* seconds between screening steps */
    var VMAX = 16;          /* km/s, about the fastest two objects in orbit can close */
    var MARGIN = 2;         /* km added in the coarse test (interpolation and straight-line errors) */
    var SLOW = 0.05;        /* km/s: slower than this, the two fly together */
    var KEEP = 100;         /* most results returned */

    self.onmessage = function (e) {
        var m = e.data;
        if (!m || m.cmd !== 'screen') return;
        try { screen(m); } catch (err) { self.postMessage({ id: m.id, error: String(err && err.message || err) }); }
    };

    function screen(m) {
        var t0 = Date.now();
        var recs = [], own = [], idx = [];
        for (var i = 0; i < m.objs.length; i++) {
            var s = SAT.satrec(m.objs[i].rec);
            if (s) { recs.push(s); own.push(m.objs[i].own ? 1 : 0); idx.push(i); }
        }
        var n = recs.length, lim = m.km, R = lim + MARGIN + VMAX * DT, C = R * 2;
        var p0 = new Float64Array(3 * n), v0 = new Float64Array(3 * n);
        var p1 = new Float64Array(3 * n), v1 = new Float64Array(3 * n);
        var ok0 = new Uint8Array(n), ok1 = new Uint8Array(n);
        var P = new Float64Array(3 * n), V = new Float64Array(3 * n), on = new Uint8Array(n);
        /* the grid: an open-addressing table of cell keys, each with a linked list of its objects */
        var BITS = 4; while ((1 << BITS) < n * 4) BITS++;
        var SIZE = 1 << BITS, SHIFT = 32 - BITS;   /* at most a quarter full */
        var keys = new Int32Array(SIZE), head = new Int32Array(SIZE), next = new Int32Array(n);
        var cand = new Map();
        var samples = Math.ceil(m.hours * 3600 / H), sub = H / DT;
        var sample = function (t, p, v, ok) {
            for (var i = 0; i < n; i++) ok[i] = SAT.state(recs[i], t, p, v, 3 * i) ? 1 : 0;
        };
        sample(m.start, p0, v0, ok0);
        var lastPost = 0;
        for (var k = 0; k < samples; k++) {
            var tA = m.start + k * H * 1000;
            sample(tA + H * 1000, p1, v1, ok1);
            for (var q = 0; q < sub; q++) {
                var u = q / sub, tq = tA + q * DT * 1000, u2 = u * u, u3 = u2 * u;
                /* Hermite weights of this step for positions (ha..hd) and velocities (ga..gd) */
                var ha = 2 * u3 - 3 * u2 + 1, hb = (u3 - 2 * u2 + u) * H, hc = -2 * u3 + 3 * u2, hd = (u3 - u2) * H;
                var ga = (6 * u2 - 6 * u) / H, gb = 3 * u2 - 4 * u + 1, gc = -ga, gd = 3 * u2 - 2 * u;
                keys.fill(-1);
                for (var a = 0; a < n; a++) {
                    on[a] = ok0[a] & ok1[a];
                    if (!on[a]) continue;
                    var i3 = 3 * a;
                    var px = P[i3] = ha * p0[i3] + hb * v0[i3] + hc * p1[i3] + hd * v1[i3];
                    var py = P[i3 + 1] = ha * p0[i3 + 1] + hb * v0[i3 + 1] + hc * p1[i3 + 1] + hd * v1[i3 + 1];
                    var pz = P[i3 + 2] = ha * p0[i3 + 2] + hb * v0[i3 + 2] + hc * p1[i3 + 2] + hd * v1[i3 + 2];
                    var cx = Math.floor(px / C) + 512, cy = Math.floor(py / C) + 512, cz = Math.floor(pz / C) + 512;
                    if (cx < 1 || cy < 1 || cz < 1 || cx > 1022 || cy > 1022 || cz > 1022) { on[a] = 0; continue; }
                    var h = slot(keys, (cx * 1024 + cy) * 1024 + cz, SHIFT);
                    if (keys[h] < 0) { keys[h] = (cx * 1024 + cy) * 1024 + cz; head[h] = -1; }
                    next[a] = head[h]; head[h] = a;
                    if (!own[a]) {
                        V[i3] = ga * p0[i3] + gb * v0[i3] + gc * p1[i3] + gd * v1[i3];
                        V[i3 + 1] = ga * p0[i3 + 1] + gb * v0[i3 + 1] + gc * p1[i3 + 1] + gd * v1[i3 + 1];
                        V[i3 + 2] = ga * p0[i3 + 2] + gb * v0[i3 + 2] + gc * p1[i3 + 2] + gd * v1[i3 + 2];
                    }
                }
                /* each object looks at the 8 cells that cover the box of half-width R around it (cells are 2R wide);
                   objects of an "own" group do not look themselves: the others find them */
                for (var b = 0; b < n; b++) {
                    if (!on[b] || own[b]) continue;
                    var b3 = 3 * b, x = P[b3], y = P[b3 + 1], z = P[b3 + 2];
                    var fx = Math.floor(x / C), fy = Math.floor(y / C), fz = Math.floor(z / C);
                    var bx = fx + 512 - (x / C - fx < 0.5 ? 1 : 0), by = fy + 512 - (y / C - fy < 0.5 ? 1 : 0), bz = fz + 512 - (z / C - fz < 0.5 ? 1 : 0);
                    for (var c = 0; c < 8; c++) {
                        var kk = ((bx + (c & 1)) * 1024 + by + (c >> 1 & 1)) * 1024 + bz + (c >> 2 & 1);
                        var hh = slot(keys, kk, SHIFT);
                        if (keys[hh] < 0) continue;
                        for (var j = head[hh]; j >= 0; j = next[j]) {
                            if (j <= b && !own[j]) continue;
                            var j3 = 3 * j, rx = P[j3] - x, ry = P[j3 + 1] - y, rz = P[j3 + 2] - z;
                            if (rx > R || rx < -R || ry > R || ry < -R || rz > R || rz < -R) continue;
                            if (own[j]) {
                                V[j3] = ga * p0[j3] + gb * v0[j3] + gc * p1[j3] + gd * v1[j3];
                                V[j3 + 1] = ga * p0[j3 + 1] + gb * v0[j3 + 1] + gc * p1[j3 + 1] + gd * v1[j3 + 1];
                                V[j3 + 2] = ga * p0[j3 + 2] + gb * v0[j3 + 2] + gc * p1[j3 + 2] + gd * v1[j3 + 2];
                            }
                            var wx = V[j3] - V[b3], wy = V[j3 + 1] - V[b3 + 1], wz = V[j3 + 2] - V[b3 + 2];
                            var w2 = wx * wx + wy * wy + wz * wz;
                            if (w2 < SLOW * SLOW) continue;
                            var tt = -(rx * wx + ry * wy + rz * wz) / w2;
                            if (tt < 0) tt = 0; else if (tt > DT) tt = DT;
                            var dx = rx + wx * tt, dy = ry + wy * tt, dz = rz + wz * tt;
                            var d2 = dx * dx + dy * dy + dz * dz;
                            if (d2 > (lim + MARGIN) * (lim + MARGIN)) continue;
                            var pk = b * n + j, old = cand.get(pk), tc = tq + tt * 1000;
                            if (!old || d2 < old[1]) cand.set(pk, [tc, d2]);
                        }
                    }
                }
            }
            var sw = p0; p0 = p1; p1 = sw; sw = v0; v0 = v1; v1 = sw;
            var so = ok0; ok0 = ok1; ok1 = so;
            if (Date.now() - lastPost > 150) { lastPost = Date.now(); self.postMessage({ id: m.id, progress: (k + 1) / samples * 0.9 }); }
        }
        /* refine with SGP4 itself */
        var list = [], ta = new Float64Array(3), tb = new Float64Array(3), va = new Float64Array(3), vb = new Float64Array(3);
        var dist = function (ia, ib, t) {
            if (!SAT.state(recs[ia], t, ta, va, 0) || !SAT.state(recs[ib], t, tb, vb, 0)) return Infinity;
            return Math.hypot(ta[0] - tb[0], ta[1] - tb[1], ta[2] - tb[2]);
        };
        var end = m.start + m.hours * 3600000;
        cand.forEach(function (val, pk) {
            var ia = Math.floor(pk / n), ib = pk - ia * n;
            var lo = Math.max(m.start, val[0] - DT * 1000), hi = Math.min(end, val[0] + DT * 1000);
            var g = (Math.sqrt(5) - 1) / 2, c1 = hi - g * (hi - lo), c2 = lo + g * (hi - lo);
            var f1 = dist(ia, ib, c1), f2 = dist(ia, ib, c2);
            for (var it = 0; it < 40 && hi - lo > 2; it++) {
                if (f1 < f2) { hi = c2; c2 = c1; f2 = f1; c1 = hi - g * (hi - lo); f1 = dist(ia, ib, c1); }
                else { lo = c1; c1 = c2; f1 = f2; c2 = lo + g * (hi - lo); f2 = dist(ia, ib, c2); }
            }
            var t = (lo + hi) / 2, d = dist(ia, ib, t);
            if (!(d <= lim)) return;
            var rv = Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
            if (rv < SLOW) return;
            list.push({ a: idx[ia], b: idx[ib], t: Math.round(t), d: d, v: rv, alt: Math.hypot(ta[0], ta[1], ta[2]) - SAT.RE });
        });
        list.sort(function (x, y) { return x.d - y.d; });
        self.postMessage({ id: m.id, done: true, list: list.slice(0, KEEP), found: list.length, objects: n,
            candidates: cand.size, ms: Date.now() - t0 });
    }

    /* the slot of a cell key (cells are numbered (x * 1024 + y) * 1024 + z, about 160 000 km each way) */
    function slot(keys, key, shift) {
        var h = Math.imul(key, 0x9E3779B1) >>> shift, mask = keys.length - 1;
        while (keys[h] >= 0 && keys[h] !== key) h = (h + 1) & mask;
        return h;
    }
}());
