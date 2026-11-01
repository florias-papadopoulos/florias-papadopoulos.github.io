/* Kitty Kart: a top-down kart race, the orange cat against three other cats. 3 laps; best score = fastest race time.
   Before the race you pick one of four tracks (Catnip Meadow, Night City, Coral Reef, Moon Rim): each has its own
   layout, scenery, handling and one twist (slippery puddles and cones, water currents, low grip and ramps).
   A track is a closed path resampled into N evenly spaced points; karts find their nearest point to know where
   they are, and a lap counts only after all checkpoints were passed in order (no shortcuts). Shell API: arcade.js. */
Arcade.register('kitty-kart', function (api) {
    'use strict';
    api.css(
        '.kk, .kk-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
        '.kk-hud { position: absolute; left: 10px; top: 10px; display: flex; gap: 6px; align-items: center; pointer-events: none; }' +
        '.kk-pill { padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,.92); box-shadow: 0 3px 10px rgba(15,23,42,.08);' +
        '  color: #0f172a; font-weight: 800; font-size: .9rem; white-space: nowrap; }' +
        '.kk-pill small { margin-right: 4px; color: #64748b; font-weight: 600; font-size: .75rem; }' +
        '.kk-pos { color: #d6336c; font-size: 1.25rem; padding: 2px 12px; }' +
        '.kk-time { font-family: ui-monospace, Menlo, Consolas, monospace; color: #1e3a8a; }' +
        '.kk-count { position: absolute; left: 50%; top: 24%; transform: translate(-50%, -50%); color: #1e3a8a; font-size: 5rem;' +
        '  font-weight: 800; line-height: 1; text-shadow: 0 4px 0 #fff; pointer-events: none; white-space: nowrap; }' +
        '.kk-count.kk-go { color: #d6336c; }' +
        '.kk-count.kk-warn { color: #d6336c; font-size: 2.2rem; }' +
        '.kk-pop { animation: kk-pop .35s cubic-bezier(.3, 1.6, .5, 1); }' +
        '.kk-hint { position: absolute; left: 50%; top: calc(24% + 56px); transform: translateX(-50%); max-width: 86%; padding: 6px 12px;' +
        '  border-radius: 12px; background: rgba(255,255,255,.92); color: #475569; font-size: .85rem; font-weight: 600; text-align: center; pointer-events: none; }' +
        '.kk-btn { position: absolute; display: none; width: 72px; height: 72px; padding: 0; border: none; border-radius: 50%;' +
        '  background: rgba(255,255,255,.88); box-shadow: 0 4px 0 #cbd5e1; color: #1e3a8a; font: 800 .95rem/1 inherit; touch-action: none; }' +
        '.kk-btn svg { width: 34px; height: 34px; fill: none; stroke: currentColor; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }' +
        '.kk.kk-touch .kk-btn { display: grid; place-items: center; }' +
        '.kk-btn.kk-on { transform: translateY(3px); box-shadow: 0 1px 0 #cbd5e1; background: #1e3a8a; color: #fff; }' +
        '.kk-left { left: 14px; bottom: 16px; } .kk-right { left: 100px; bottom: 16px; }' +
        '.kk-gas { right: 14px; bottom: 96px; width: 84px; height: 84px; background: #d6336c; color: #fff; box-shadow: 0 4px 0 #a61e4d; }' +
        '.kk-gas.kk-on { background: #a61e4d; }' +
        '.kk-brake { right: 108px; bottom: 16px; width: 64px; height: 64px; }' +
        /* the track picker shown before the race */
        '.kk.kk-picking .kk-hud, .kk.kk-picking .kk-btn, .kk.kk-picking .kk-hint, .kk.kk-picking .kk-count { display: none; }' +
        '.kk-pick { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; padding: 12px;' +
        '  background: rgba(15,23,42,.38); overflow-y: auto; }' +
        '.kk.kk-picking .kk-pick { display: flex; }' +
        '.kk-pick-box { width: 100%; max-width: 660px; margin: auto; padding: 14px; border-radius: 18px; background: rgba(255,255,255,.96);' +
        '  box-shadow: 0 10px 30px rgba(15,23,42,.25); text-align: center; }' +
        '.kk-pick-box h3 { margin: 0 0 10px; color: #1e3a8a; font-size: 1.15rem; font-weight: 800; }' +
        '.kk-maps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }' +
        '.kk-narrow .kk-maps { grid-template-columns: repeat(2, 1fr); }' +
        '.kk-map { min-width: 0; padding: 6px 6px 8px; border: 2px solid #e2e8f0; border-radius: 14px; background: #fff; color: #0f172a;' +
        '  font: inherit; text-align: center; cursor: pointer; touch-action: manipulation; }' +
        '.kk-map:hover { border-color: #f3a5c0; }' +
        '.kk-map.kk-sel { border-color: #d6336c; box-shadow: 0 0 0 3px rgba(214,51,108,.22); }' +
        '.kk-map canvas { display: block; width: 100%; height: auto; border-radius: 10px; }' +
        '.kk-map b { display: block; margin-top: 6px; font-size: .92rem; font-weight: 800; }' +
        '.kk-map small { display: block; margin-top: 2px; color: #64748b; font-size: .74rem; line-height: 1.25; }' +
        '.kk-map .kk-mbest { color: #1e3a8a; font-weight: 700; min-height: 1.2em; }' +
        '.kk-pick-tip { margin: 10px 0 0; color: #64748b; font-size: .8rem; font-weight: 600; }' +
        '@keyframes kk-pop { from { transform: translate(-50%, -50%) scale(.4); } to { transform: translate(-50%, -50%) scale(1); } }');

    var N = 480, CP = 12, SEG = N / CP, LAPS = 3, HW = 52, PAD = 380, BRAKE = 520, REV = 90, R = 12;
    var X = new Float32Array(N), Y = new Float32Array(N), A = new Float32Array(N), K = new Float32Array(N);
    var WW, WH, SP;
    var VMAX, VGRASS, ACC, GRIP, GRIPOFF, COAST, TURN, CARE;  /* handling, set by the track */
    function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function nearest(o) {  /* o.idx, o.dist: the closest track point to (o.x, o.y) */
        var best = 1e12, bi = 0;
        for (var i = 0; i < N; i++) {
            var dx = X[i] - o.x, dy = Y[i] - o.y, q = dx * dx + dy * dy;
            if (q < best) { best = q; bi = i; }
        }
        o.idx = bi; o.dist = Math.sqrt(best);
    }
    var seed = 1;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function ix(i) { return ((i % N) + N) % N; }
    function side(i, l) { return { x: X[ix(i)] - Math.sin(A[ix(i)]) * l, y: Y[ix(i)] + Math.cos(A[ix(i)]) * l }; }  /* l > 0: right of the driving direction */

    /* ---------- building a track: a smooth spline or straight streets with rounded corners ---------- */
    function spline(C, s) {  /* Catmull-Rom through the control points */
        var n = C.length / 2, d = [], i, j, c;
        for (i = 0; i < n; i++) {
            var p = [(i + n - 1) % n, i, (i + 1) % n, (i + 2) % n];
            for (j = 0; j < 24; j++) {
                var t = j / 24, t2 = t * t, t3 = t2 * t;
                for (c = 0; c < 2; c++) {
                    var a = C[p[0] * 2 + c], b = C[p[1] * 2 + c], e = C[p[2] * 2 + c], f = C[p[3] * 2 + c];
                    d.push(s * 0.5 * (2 * b + (e - a) * t + (2 * a - 5 * b + 4 * e - f) * t2 + (3 * b - a - 3 * e + f) * t3));
                }
            }
        }
        return d;
    }
    function fillet(P, r, s) {  /* a polygon whose corners are arcs of radius r */
        var n = P.length / 2, d = [], i, k;
        for (i = 0; i < n; i++) {
            var a = (i + n - 1) % n, c = (i + 1) % n, bx = P[i * 2] * s, by = P[i * 2 + 1] * s;
            var ux = P[a * 2] * s - bx, uy = P[a * 2 + 1] * s - by, lu = Math.hypot(ux, uy);
            var vx = P[c * 2] * s - bx, vy = P[c * 2 + 1] * s - by, lv = Math.hypot(vx, vy);
            ux /= lu; uy /= lu; vx /= lv; vy /= lv;
            var ang = Math.acos(clamp(ux * vx + uy * vy, -1, 1)), t = r / Math.tan(ang / 2), h = r / Math.sin(ang / 2);
            var mx = ux + vx, my = uy + vy, lm = Math.hypot(mx, my), ox = bx + mx / lm * h, oy = by + my / lm * h;
            var a1 = Math.atan2(by + uy * t - oy, bx + ux * t - ox), da = wrap(Math.atan2(by + vy * t - oy, bx + vx * t - ox) - a1);
            var m = Math.max(2, Math.ceil(Math.abs(da) * r / 8));
            for (k = 0; k <= m; k++) d.push(ox + Math.cos(a1 + da * k / m) * r, oy + Math.sin(a1 + da * k / m) * r);
        }
        return d;
    }
    function build(map) {
        var d = map.ctrl ? spline(map.ctrl, map.scale) : fillet(map.poly, map.round, map.scale);
        var m = d.length / 2, len = [0], i, j;
        for (i = 1; i <= m; i++) len.push(len[i - 1] + Math.hypot(d[(i % m) * 2] - d[i * 2 - 2], d[(i % m) * 2 + 1] - d[i * 2 - 1]));
        SP = len[m] / N;
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, off = (map.start || 0) * len[m];
        for (i = 0, j = 0; i < N; i++) {  /* resample to evenly spaced points, the first one on the start line */
            var s = (i * SP + off) % len[m];
            if (s < len[j]) j = 0;
            while (len[j + 1] < s) j++;
            var u = (s - len[j]) / (len[j + 1] - len[j]), q = j * 2, r = ((j + 1) % m) * 2;
            X[i] = d[q] + (d[r] - d[q]) * u; Y[i] = d[q + 1] + (d[r + 1] - d[q + 1]) * u;
            x0 = Math.min(x0, X[i]); y0 = Math.min(y0, Y[i]); x1 = Math.max(x1, X[i]); y1 = Math.max(y1, Y[i]);
        }
        for (i = 0; i < N; i++) { X[i] += PAD - x0; Y[i] += PAD - y0; }
        WW = Math.ceil(x1 - x0 + 2 * PAD); WH = Math.ceil(y1 - y0 + 2 * PAD);
        for (i = 0; i < N; i++) A[i] = Math.atan2(Y[(i + 1) % N] - Y[(i + N - 1) % N], X[(i + 1) % N] - X[(i + N - 1) % N]);
        for (i = 0; i < N; i++) K[i] = wrap(A[(i + 1) % N] - A[(i + N - 1) % N]) / (2 * SP);
        var ph = map.phys;
        VMAX = ph.vmax; VGRASS = ph.vgrass; ACC = ph.acc; GRIP = ph.grip; GRIPOFF = ph.gripOff; COAST = ph.coast; TURN = ph.turn; CARE = ph.care;
    }
    function straight(j, a, b, lim) {  /* is the track nearly straight from j + a to j + b? */
        for (var i = j + a; i <= j + b; i++) if (Math.abs(K[ix(i)]) > lim) return false;
        return true;
    }
    function straightNear(f, a, b, lim) {  /* the straight spot closest to a fraction f of the lap */
        var j0 = Math.round(f * N);
        for (var d = 0; d < N / 2; d++) {
            if (straight(j0 + d, a, b, lim)) return ix(j0 + d);
            if (straight(j0 - d, a, b, lim)) return ix(j0 - d);
        }
        return j0;
    }
    function inZone(i, z) { return (i - z.i0 + N) % N <= z.i1 - z.i0; }

    /* ---------- drawing helpers for the cached track ---------- */
    function strokeLoop(g, from, to, width, color, dash) {
        g.beginPath();
        for (var i = from; i <= to; i++) { var k = ix(i); if (i === from) g.moveTo(X[k], Y[k]); else g.lineTo(X[k], Y[k]); }
        if (to - from >= N) g.closePath();
        g.lineWidth = width; g.strokeStyle = color; g.setLineDash(dash || []); g.lineCap = dash ? 'butt' : 'round'; g.stroke();
    }
    function kerbs(g, w, c1, c2) {  /* striped kerbs where the track bends */
        for (var i = 0; i < N; i++) {
            if (Math.abs(K[i]) < 0.0053 || Math.abs(K[(i + N - 1) % N]) >= 0.0053) continue;
            for (var k = i; Math.abs(K[k % N]) >= 0.0053 && k < i + N; k++);
            strokeLoop(g, i - 2, k + 2, w, c1, []);
            strokeLoop(g, i - 2, k + 2, w, c2, [12, 12]);
        }
    }
    function scatter(n, minDist, fn) {  /* n random spots at least minDist from the track centre line */
        var o = { x: 0, y: 0 };
        for (var i = 0; i < n; i++) {
            o.x = rnd() * WW; o.y = rnd() * WH; nearest(o);
            if (o.dist >= minDist) fn(o.x, o.y, i, o);
        }
    }
    function circle(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

    /* ---------- particles: bubbles, splashes and moon dust ---------- */
    var parts = [];
    function puff(kind, x, y, vx, vy, life, r) {
        if (parts.length < 160) parts.push({ k: kind, x: x, y: y, vx: vx, vy: vy, t: 0, life: life, r: r });
    }
    function moveParts(dt) {
        for (var i = parts.length - 1; i >= 0; i--) {
            var p = parts[i];
            p.t += dt;
            if (p.t >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            var f = Math.max(0, 1 - 2 * dt); p.vx *= f; p.vy *= f;
        }
    }

    /* ---------- the tracks ---------- */
    var VX0 = 0, VY0 = 0, VX1 = 0, VY1 = 0;  /* the visible part of the world, for culling */
    function vis(x, y, r) { return x + r > VX0 && x - r < VX1 && y + r > VY0 && y - r < VY1; }

    var MEADOW = {
        id: 'meadow', name: 'Catnip Meadow', blurb: 'The classic: grass, kerbs, sunshine',
        ctrl: [829, 969, 1211, 944, 1435, 829, 1466, 638, 1339, 510, 1116, 542, 925, 670, 734, 638, 670, 479, 797, 319,
               1084, 287, 1244, 160, 956, 109, 574, 128, 287, 224, 191, 446, 224, 701, 287, 892, 446, 956], scale: 1,
        phys: { vmax: 330, vgrass: 100, acc: 360, grip: 9, gripOff: 5, coast: 0.7, turn: 3.1, care: 1 },
        col: { bg: '#cdeac6', edge: '#bfe2b6', road: '#b4bcc6', panel: 'rgba(255,255,255,.85)' },
        paint: function (g) {
            var i;
            g.fillStyle = '#cdeac6'; g.fillRect(0, 0, WW, WH);
            g.fillStyle = '#d7efd0';  /* mowing stripes */
            for (i = -WH; i < WW; i += 140) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 70, 0); g.lineTo(i + 70 + WH * 0.5, WH); g.lineTo(i + WH * 0.5, WH); g.fill(); }
            seed = 7;
            var o = { x: 0, y: 0 };
            for (i = 0; i < 260; i++) {  /* bushes and flowers, away from the track */
                o.x = rnd() * WW; o.y = rnd() * WH; nearest(o);
                var big = i < 70, rr = big ? 16 + rnd() * 14 : 3;
                if (o.dist < HW + (big ? 70 : 24)) continue;
                if (big) {
                    circle(g, o.x + 4, o.y + 6, rr, 'rgba(15,23,42,.08)');
                    circle(g, o.x, o.y, rr, '#97d08f');
                    circle(g, o.x - rr * 0.3, o.y - rr * 0.3, rr * 0.5, '#b4e2aa');
                } else circle(g, o.x, o.y, rr, i % 3 ? '#ffffff' : '#f9c6d9');
            }
            strokeLoop(g, 0, N, 2 * HW + 34, '#bfe2b6');  /* verge */
            strokeLoop(g, 0, N, 2 * HW + 5, '#ffffff');  /* white edge lines */
            kerbs(g, 2 * HW + 16, '#ffffff', '#e8484f');
            strokeLoop(g, 0, N, 2 * HW, '#b4bcc6');  /* asphalt */
            strokeLoop(g, 0, N, 2, 'rgba(255,255,255,.55)', [18, 22]);  /* centre line */
        }
    };

    /* Night City: street blocks with sharp corners, street lights, zebra crossings, puddles (slippery) and cones */
    var CITY = {
        id: 'city', name: 'Night City', blurb: 'Neon streets, slippery puddles, cones',
        poly: [0, 250, 250, 0, 900, 0, 900, 300, 1200, 300, 1200, 900, 700, 900, 700, 600, 400, 600, 400, 900, 0, 900],
        round: 100, scale: 1.1, start: 0.94,
        phys: { vmax: 340, vgrass: 90, acc: 380, grip: 8, gripOff: 5, coast: 0.7, turn: 3.2, care: 1 },
        col: { bg: '#1a2030', edge: '#3b4253', road: '#4a5266', panel: 'rgba(15,23,42,.72)', mini: '#cbd5e1', grid: 'rgba(255,255,255,.6)' },
        prep: function () {
            var i, k;
            seed = 21;
            this.puddles = [];
            var fr = [0.13, 0.3, 0.46, 0.6, 0.77];
            for (i = 0; i < fr.length; i++) {
                var j = ix(Math.round(fr[i] * N) + Math.round(rnd() * 8)), p = side(j, (rnd() - 0.5) * HW);
                this.puddles.push({ x: p.x, y: p.y, a: A[j] + (rnd() - 0.5) * 0.6, rx: 30 + rnd() * 10, ry: 17 + rnd() * 6 });
            }
            this.cross = [straightNear(0.08, -6, 6, 0.002), straightNear(0.38, -6, 6, 0.002), straightNear(0.7, -6, 6, 0.002)];
            this.cones = [];
            for (i = 0; i < N; i++) {  /* a pair of cones on the inside of every corner: cut it and they fly */
                if (Math.abs(K[i]) < 0.006 || Math.abs(K[(i + N - 1) % N]) >= 0.006) continue;
                for (k = i; Math.abs(K[k % N]) >= 0.006 && k < i + N; k++);
                var mid = Math.round((i + k) / 2), sg = K[ix(mid)] > 0 ? 1 : -1;
                for (var c = -1; c <= 1; c += 2) {
                    var q = side(mid + c * 3, sg * (HW + 4));
                    this.cones.push({ x0: q.x, y0: q.y });
                }
            }
        },
        reset: function () {
            this.cones.forEach(function (c) { c.x = c.x0; c.y = c.y0; c.vx = c.vy = c.va = 0; c.a = 0.3; c.hit = -9; });
        },
        paint: function (g) {
            var i, k, p;
            g.fillStyle = '#1a2030'; g.fillRect(0, 0, WW, WH);
            g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2;  /* the back streets */
            for (i = 0; i < WW; i += 180) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, WH); g.stroke(); }
            for (i = 0; i < WH; i += 180) { g.beginPath(); g.moveTo(0, i); g.lineTo(WW, i); g.stroke(); }
            seed = 5;
            var o = { x: 0, y: 0 }, ROOF = ['#323b52', '#3b3452', '#2c4150', '#45383d', '#363f36', '#2f3346'];
            function clear(x, y) { o.x = x; o.y = y; nearest(o); return o.dist > HW + 36; }
            for (var gx = 0; gx < WW; gx += 180) for (var gy = 0; gy < WH; gy += 180) {  /* one block per street square */
                var w = 110 + rnd() * 50, h = 100 + rnd() * 60, x = gx + 12 + rnd() * (156 - w), y = gy + 12 + rnd() * (156 - h);
                if (!(clear(x, y) && clear(x + w, y) && clear(x, y + h) && clear(x + w, y + h) && clear(x + w / 2, y + h / 2) &&
                      clear(x + w / 2, y) && clear(x + w / 2, y + h) && clear(x, y + h / 2) && clear(x + w, y + h / 2))) continue;
                if (rnd() < 0.16) {  /* a little park */
                    g.fillStyle = '#1d3a2e'; g.fillRect(x, y, w, h);
                    for (k = 0; k < 5; k++) { var tx = x + 18 + rnd() * (w - 36), ty = y + 18 + rnd() * (h - 36); circle(g, tx + 3, ty + 4, 14, 'rgba(0,0,0,.3)'); circle(g, tx, ty, 14, '#2c5a40'); circle(g, tx - 4, ty - 4, 6, '#3b7352'); }
                    continue;
                }
                g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 9, y + 11, w, h);  /* shadow */
                g.fillStyle = ROOF[Math.floor(rnd() * ROOF.length)]; g.fillRect(x, y, w, h);
                g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
                g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 10, y + 10, w - 20, h - 20);
                for (k = 0; k < 2; k++) { g.fillStyle = '#5b6478'; g.fillRect(x + 16 + rnd() * (w - 46), y + 16 + rnd() * (h - 44), 16, 12); }
                if (rnd() < 0.5) { circle(g, x + w - 24, y + 24, 10, '#6b7488'); circle(g, x + w - 24, y + 24, 6, '#59627a'); }
                g.fillStyle = 'rgba(255,214,120,.85)';  /* lit skylights */
                for (k = x + 14; k < x + w - 14; k += 14) if (rnd() < 0.55) g.fillRect(k, y + h - 16, 7, 5);
                if (rnd() < 0.35) {  /* a neon sign on the roof edge */
                    g.strokeStyle = rnd() < 0.5 ? '#ff4fa3' : '#4fd1ff'; g.lineWidth = 3; g.shadowColor = g.strokeStyle; g.shadowBlur = 10;
                    g.beginPath(); g.moveTo(x + 8, y + 5); g.lineTo(x + w * 0.6, y + 5); g.stroke(); g.shadowBlur = 0;
                }
            }
            strokeLoop(g, 0, N, 2 * HW + 44, '#3b4253');  /* pavement */
            for (i = 0; i < N; i += 2) for (k = -1; k <= 1; k += 2) { p = side(i, k * (HW + 13)); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(p.x - 1, p.y - 1, 2, 2); }
            strokeLoop(g, 0, N, 2 * HW + 8, '#8e97a8');  /* kerb stones */
            strokeLoop(g, 0, N, 2 * HW, '#272d3b');  /* the road */
            strokeLoop(g, 0, N, 2 * HW - 8, 'rgba(255,255,255,.45)');
            strokeLoop(g, 0, N, 2 * HW - 12, '#272d3b');
            strokeLoop(g, 0, N, 3, '#e8c547', [22, 18]);  /* the yellow middle line */
            this.cross.forEach(function (j) {  /* zebra crossings */
                g.save(); g.translate(X[j], Y[j]); g.rotate(A[j]); g.fillStyle = '#272d3b'; g.fillRect(-18, -HW + 4, 36, 2 * HW - 8);
                g.fillStyle = 'rgba(255,255,255,.85)';
                for (var b = -HW + 8; b < HW - 10; b += 13) g.fillRect(-16, b, 32, 7);
                g.restore();
            });
            for (i = 30; i < N - 20; i += 57) {  /* manhole covers */
                p = side(i, (i % 2 ? 1 : -1) * HW * 0.5);
                circle(g, p.x, p.y, 9, '#1e2330'); g.strokeStyle = '#3d4456'; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, 6, 0, 7); g.stroke();
            }
            this.puddles.forEach(function (q) {
                g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.scale(1, q.ry / q.rx);
                var gr = g.createRadialGradient(-q.rx * 0.3, -q.rx * 0.3, 2, 0, 0, q.rx);
                gr.addColorStop(0, '#5f86b8'); gr.addColorStop(1, '#2d4466');
                g.fillStyle = gr; g.beginPath(); g.arc(0, 0, q.rx, 0, 7); g.fill();
                g.strokeStyle = 'rgba(190,215,255,.55)'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, q.rx * 0.65, 3.6, 4.6); g.stroke();
                g.beginPath(); g.arc(q.rx * 0.2, q.rx * 0.1, q.rx * 0.35, 0.2, 1); g.stroke();
                g.restore();
            });
            for (i = 12; i < N; i += 24) {  /* street lights, their warm glow on the road */
                p = side(i, ((i / 24) % 2 ? 1 : -1) * (HW + 20));
                var gl = g.createRadialGradient(p.x, p.y, 4, p.x, p.y, 110);
                gl.addColorStop(0, 'rgba(255,205,120,.32)'); gl.addColorStop(1, 'rgba(255,205,120,0)');
                g.fillStyle = gl; g.fillRect(p.x - 110, p.y - 110, 220, 220);
                circle(g, p.x + 2, p.y + 3, 5.5, 'rgba(0,0,0,.4)'); circle(g, p.x, p.y, 5, '#2a2f3c'); circle(g, p.x, p.y, 3.2, '#fff1c1');
            }
        },
        effect: function (c, dt) {
            if (c.slip > 0) c.slip -= dt;
            var sp = Math.hypot(c.vx, c.vy), i, q;
            for (i = 0; i < this.puddles.length; i++) {
                q = this.puddles[i];
                var dx = c.x - q.x, dy = c.y - q.y, ca = Math.cos(q.a), sa = Math.sin(q.a), u = (dx * ca + dy * sa) / q.rx, v = (dy * ca - dx * sa) / q.ry;
                if (u * u + v * v > 1 || sp < 40) continue;
                if (c.slip <= 0) {
                    for (var k = 0; k < 7; k++) puff('drop', c.x, c.y, c.vx * 0.3 + (Math.random() - 0.5) * 160, c.vy * 0.3 + (Math.random() - 0.5) * 160, 0.45, 2 + Math.random() * 2);
                    if (c === me && phase === 'race') { api.sfx('move'); if (clock - lastSay > 5) say('Splash! Slippery!'); }
                }
                c.slip = 0.55;
            }
            for (i = 0; i < this.cones.length; i++) {
                q = this.cones[i];
                var ex = q.x - c.x, ey = q.y - c.y, d2 = ex * ex + ey * ey;
                if (d2 > (R + 7) * (R + 7) || clock - q.hit < 0.3) continue;
                var d = Math.sqrt(d2) || 1;
                q.hit = clock; q.vx = c.vx * 0.9 + ex / d * 90; q.vy = c.vy * 0.9 + ey / d * 90; q.va = (Math.random() - 0.5) * 18;
                c.vx *= 0.9; c.vy *= 0.9;
                if (c === me) api.sfx('tap');
            }
        },
        update: function (dt) {
            this.cones.forEach(function (q) {
                if (!q.vx && !q.vy) return;
                q.x = clamp(q.x + q.vx * dt, 20, WW - 20); q.y = clamp(q.y + q.vy * dt, 20, WH - 20); q.a += q.va * dt;
                var f = Math.max(0, 1 - 2.4 * dt); q.vx *= f; q.vy *= f; q.va *= f;
                if (Math.abs(q.vx) + Math.abs(q.vy) < 4) q.vx = q.vy = 0;
            });
        },
        under: function () {
            var i, c;
            if (!this.beam) {  /* headlights: one gradient in kart space, reused for every kart */
                this.beam = ctx.createLinearGradient(14, 0, 120, 0);
                this.beam.addColorStop(0, 'rgba(255,240,190,.3)'); this.beam.addColorStop(1, 'rgba(255,240,190,0)');
            }
            for (i = 0; i < 4; i++) {
                c = karts[i];
                if (!vis(c.x, c.y, 130)) continue;
                ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.fillStyle = this.beam;
                ctx.beginPath(); ctx.moveTo(14, -7); ctx.lineTo(120, -44); ctx.lineTo(120, 44); ctx.lineTo(14, 7); ctx.fill();
                ctx.restore();
            }
            for (i = 0; i < this.cones.length; i++) {  /* traffic cones, seen from above */
                c = this.cones[i];
                if (!vis(c.x, c.y, 14)) continue;
                ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
                ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(-5, -4, 14, 14, 3); ctx.fill();
                ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.2; rrect(-7, -7, 14, 14, 3); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 7); ctx.fillStyle = '#fb923c'; ctx.fill();
                ctx.restore();
            }
            drawParts('drop');
        }
    };

    /* Coral Reef: a winding sand path on the sea floor, floaty handling and currents that carry you */
    var REEF = {
        id: 'reef', name: 'Coral Reef', blurb: 'Floaty karts, currents push you',
        ctrl: [200, 300, 500, 150, 800, 250, 1100, 150, 1400, 300, 1450, 600, 1250, 750, 1000, 650, 800, 800, 900, 1000,
               700, 1120, 400, 1020, 250, 800, 350, 600, 170, 470], scale: 1, start: 0,
        phys: { vmax: 325, vgrass: 135, acc: 310, grip: 4.2, gripOff: 3.2, coast: 0.45, turn: 2.8, care: 1.2 },
        col: { bg: '#3f98ad', edge: '#d9c48e', road: '#ecdcae', panel: 'rgba(255,255,255,.82)' },
        prep: function () {
            var i;
            this.zones = [  /* side: push to the right (1) or left (-1) of the track; 0: a stream along the track */
                { i0: Math.round(0.2 * N), side: 1, f: 62 },
                { i0: Math.round(0.44 * N), side: 0, f: 85 },
                { i0: Math.round(0.66 * N), side: -1, f: 62 }];
            this.zones.forEach(function (z) { z.i1 = z.i0 + 38; });
            seed = 33;
            var kelp = this.kelp = [], fish = this.fish = [], vents = this.vents = [];
            scatter(160, HW + 46, function (x, y, k) { if (kelp.length < 46) kelp.push({ x: x, y: y, len: 40 + (k % 5) * 9, ph: k * 1.3 }); });
            scatter(30, HW + 60, function (x, y) { if (vents.length < 7) vents.push({ x: x, y: y, t: 0 }); });
            var FC = ['#ffb347', '#ff6f91', '#ffe066', '#7ad7f0', '#c49bff'];
            for (i = 0; i < 14; i++) fish.push({ x: rnd() * WW, y: rnd() * WH, a: rnd() * 7, sp: 40 + rnd() * 40, s: 0.8 + rnd() * 0.6, col: FC[i % FC.length], ph: rnd() * 7 });
        },
        paint: function (g) {
            var i, k;
            g.fillStyle = '#3f98ad'; g.fillRect(0, 0, WW, WH);
            seed = 41;
            for (i = 0; i < 40; i++) circle(g, rnd() * WW, rnd() * WH, 80 + rnd() * 140, rnd() < 0.5 ? 'rgba(255,240,200,.07)' : 'rgba(10,60,90,.08)');
            g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 3; g.lineCap = 'round';  /* sand ripples */
            for (i = 0; i < 260; i++) {
                var rx = rnd() * WW, ry = rnd() * WH; g.beginPath(); g.moveTo(rx, ry); g.quadraticCurveTo(rx + 18, ry - 8, rx + 36, ry); g.stroke();
            }
            var CO = ['#ff7f9e', '#ff9f5a', '#b88ae6', '#ffd166', '#ff6b6b'];
            scatter(200, HW + 40, function (x, y, n) {  /* coral, rocks, starfish */
                var t = n % 5, col = CO[n % CO.length], r = 10 + rnd() * 14;
                if (t === 0 || t === 1) {  /* branching coral */
                    circle(g, x + 4, y + 6, r * 0.9, 'rgba(8,40,60,.18)');
                    g.strokeStyle = col; g.lineCap = 'round';
                    for (k = 0; k < 6; k++) {
                        var a = k * 1.05 + rnd(), ex = x + Math.cos(a) * r * 1.3, ey = y + Math.sin(a) * r * 1.3;
                        g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
                        g.lineWidth = 3.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + Math.cos(a + 0.7) * r * 0.5, ey + Math.sin(a + 0.7) * r * 0.5);
                        g.moveTo(ex, ey); g.lineTo(ex + Math.cos(a - 0.7) * r * 0.5, ey + Math.sin(a - 0.7) * r * 0.5); g.stroke();
                    }
                    circle(g, x, y, 4, '#fff3');
                } else if (t === 2) {  /* brain coral */
                    circle(g, x + 4, y + 6, r, 'rgba(8,40,60,.2)'); circle(g, x, y, r, '#e9a27a');
                    g.strokeStyle = '#c97a55'; g.lineWidth = 2;
                    for (k = -r + 5; k < r - 3; k += 6) { g.beginPath(); g.moveTo(x - Math.sqrt(r * r - k * k) + 3, y + k); g.bezierCurveTo(x - 4, y + k - 4, x + 4, y + k + 4, x + Math.sqrt(r * r - k * k) - 3, y + k); g.stroke(); }
                } else if (t === 3) {  /* a rock with an anemone */
                    circle(g, x + 5, y + 7, r * 1.2, 'rgba(8,40,60,.22)'); circle(g, x, y, r * 1.2, '#5d7f8c'); circle(g, x - r * 0.3, y - r * 0.3, r * 0.6, '#7a9ba7');
                    g.strokeStyle = '#c084fc'; g.lineWidth = 2.5;
                    for (k = 0; k < 10; k++) { g.beginPath(); g.moveTo(x + r * 0.3, y + r * 0.2); g.lineTo(x + r * 0.3 + Math.cos(k * 0.63) * 9, y + r * 0.2 + Math.sin(k * 0.63) * 9); g.stroke(); }
                    circle(g, x + r * 0.3, y + r * 0.2, 3, '#f0abfc');
                } else {  /* starfish */
                    g.fillStyle = n % 2 ? '#ff8a5c' : '#ffd166'; g.beginPath();
                    for (k = 0; k < 10; k++) { var sr = k % 2 ? 4 : 11, sa = k * Math.PI / 5 + n; g.lineTo(x + Math.cos(sa) * sr, y + Math.sin(sa) * sr); }
                    g.closePath(); g.fill();
                }
            });
            strokeLoop(g, 0, N, 2 * HW + 30, '#d9c48e');  /* the sand path */
            strokeLoop(g, 0, N, 2 * HW, '#ecdcae');
            this.zones.forEach(function (z) { strokeLoop(g, z.i0, z.i1, 2 * HW, z.side ? 'rgba(80,190,235,.3)' : 'rgba(120,230,200,.32)', []); });
            for (i = 0; i < N; i += 3) for (k = -1; k <= 1; k += 2) {  /* shells along both edges */
                var p = side(i, k * (HW + 1)); circle(g, p.x, p.y, 3.3, (i / 3) % 2 ? '#fff8e7' : '#f9c6d9');
            }
            strokeLoop(g, 0, N, 2, 'rgba(150,120,70,.35)', [14, 22]);
        },
        effect: function (c, dt) {
            for (var i = 0; i < 3; i++) {  /* the water carries the kart, so steer against it */
                var z = this.zones[i];
                if (!inZone(c.idx, z) || c.dist > HW + 70) continue;
                var a = A[c.idx], d0 = (c.idx - z.i0 + N) % N, e = Math.min(1, Math.min(d0, z.i1 - z.i0 - d0) / 6 + 0.2);  /* weaker at the ends */
                var fx = z.side ? -Math.sin(a) * z.side : Math.cos(a), fy = z.side ? Math.cos(a) * z.side : Math.sin(a);
                c.x += fx * z.f * e * dt; c.y += fy * z.f * e * dt;
            }
            c.bt = (c.bt || 0) - dt;
            if (c.thr > 0 && c.bt <= 0 && vis(c.x, c.y, 40)) {  /* bubbles from the exhaust */
                c.bt = 0.12;
                puff('bub', c.x - Math.cos(c.a) * 17, c.y - Math.sin(c.a) * 17, -c.vx * 0.1 + (Math.random() - 0.5) * 20, -c.vy * 0.1 + (Math.random() - 0.5) * 20, 1.1, 2 + Math.random() * 2.5);
            }
        },
        update: function (dt) {
            this.fish.forEach(function (f) {
                f.a += Math.sin(clock * 0.7 + f.ph) * 0.5 * dt;
                f.x += Math.cos(f.a) * f.sp * dt; f.y += Math.sin(f.a) * f.sp * dt;
                if (f.x < -40) f.x = WW + 30; else if (f.x > WW + 40) f.x = -30;
                if (f.y < -40) f.y = WH + 30; else if (f.y > WH + 40) f.y = -30;
            });
            this.vents.forEach(function (v) {
                v.t -= dt;
                if (v.t <= 0 && vis(v.x, v.y, 60)) { v.t = 0.3 + Math.random() * 0.3; puff('bub', v.x + (Math.random() - 0.5) * 8, v.y, (Math.random() - 0.5) * 14, -14, 1.8, 2 + Math.random() * 4); }
            });
        },
        under: function () {
            var i, k, z;
            ctx.strokeStyle = 'rgba(235,252,255,.55)'; ctx.lineWidth = 3; ctx.lineCap = ctx.lineJoin = 'round';
            ctx.beginPath();
            for (i = 0; i < 3; i++) {  /* moving chevrons show where the water flows */
                z = this.zones[i];
                for (k = z.i0 + 2; k <= z.i1 - 2; k += 4) {
                    var j = ix(k);
                    if (!vis(X[j], Y[j], HW)) continue;
                    var a = A[j], ca = Math.cos(a), sa = Math.sin(a), sh = (clock * z.f * 0.5) % 34;
                    for (var l = -1; l <= 1; l++) {
                        var px, py, dx, dy;
                        if (z.side) { var lat = ((l + 1) * 34 + sh + k * 3) % 102 - 51; px = X[j] - sa * lat * z.side; py = Y[j] + ca * lat * z.side; dx = -sa * z.side; dy = ca * z.side; }
                        else { var fw = sh * 4 / 34 * SP; px = X[j] + ca * fw - sa * l * HW * 0.55; py = Y[j] + sa * fw + ca * l * HW * 0.55; dx = ca; dy = sa; }
                        ctx.moveTo(px - dx * 5 - dy * 6, py - dy * 5 + dx * 6); ctx.lineTo(px, py); ctx.lineTo(px - dx * 5 + dy * 6, py - dy * 5 - dx * 6);
                    }
                }
            }
            ctx.stroke();
            ctx.lineWidth = 4; ctx.strokeStyle = '#2f8f5b';  /* kelp swaying in the water */
            for (i = 0; i < this.kelp.length; i++) {
                var q = this.kelp[i];
                if (!vis(q.x, q.y, q.len + 20)) continue;
                var sw = Math.sin(clock * 1.4 + q.ph) * 12, tx = q.x + sw, ty = q.y - q.len;
                ctx.strokeStyle = '#256f48'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.quadraticCurveTo(q.x - sw * 0.6, q.y - q.len * 0.5, tx, ty); ctx.stroke();
                ctx.fillStyle = '#3aa36a';
                for (k = 1; k <= 3; k++) {
                    var t = k / 3.4, lx = q.x + (tx - q.x) * t + Math.sin(clock * 1.4 + q.ph + k) * 3, ly = q.y + (ty - q.y) * t;
                    ctx.beginPath(); ctx.ellipse(lx + (k % 2 ? 7 : -7), ly, 8, 3.5, k % 2 ? -0.5 : 0.5, 0, 7); ctx.fill();
                }
            }
        },
        over: function () {
            for (var i = 0; i < this.fish.length; i++) {  /* little fish swim over everything */
                var f = this.fish[i];
                if (!vis(f.x, f.y, 30)) continue;
                var w = Math.sin(clock * 9 + f.ph) * 0.35;
                ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.scale(f.s, f.s);
                ctx.fillStyle = 'rgba(8,40,60,.18)'; ctx.beginPath(); ctx.ellipse(6, 10, 11, 5, 0, 0, 7); ctx.fill();
                ctx.fillStyle = f.col; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-18, -6 + w * 6); ctx.lineTo(-18, 6 + w * 6); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, 7); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-3, -5, 2.5, 10);
                circle(ctx, 6, -1.5, 1.6, '#0f172a');
                ctx.restore();
            }
            drawParts('bub');
        },
        screen: function () {  /* sun rays through the water */
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (!this.ray || this.rayH !== H) {
                this.rayH = H; this.ray = ctx.createLinearGradient(0, 0, 0, H);
                this.ray.addColorStop(0, 'rgba(230,255,255,.16)'); this.ray.addColorStop(1, 'rgba(230,255,255,0)');
            }
            ctx.fillStyle = this.ray;
            for (var i = 0; i < 4; i++) {
                var x = W * (0.12 + i * 0.27) + Math.sin(clock * 0.25 + i * 2.1) * W * 0.05, w = 26 + (i % 2) * 24;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * 2.4 + H * 0.35, H); ctx.lineTo(x + H * 0.35, H); ctx.fill();
            }
        }
    };

    /* Moon Rim: a dusty road on a slab of moon floating in space, low grip, ramps for long low gravity jumps */
    var MOON = {
        id: 'moon', name: 'Moon Rim', blurb: 'Low grip, ramps, long floaty jumps',
        ctrl: [250, 250, 800, 200, 1350, 250, 1600, 450, 1500, 700, 1150, 700, 950, 560, 700, 520, 520, 700, 700, 900,
               1150, 920, 1450, 1050, 1300, 1250, 700, 1300, 250, 1150, 150, 700], scale: 0.74, start: 0.09,
        phys: { vmax: 350, vgrass: 125, acc: 300, grip: 3.4, gripOff: 2.4, coast: 0.35, turn: 2.9, care: 1.4 },
        col: { bg: '#070b1c', edge: '#8d8f99', road: '#b8bbc5', panel: 'rgba(15,23,42,.72)', mini: '#cbd5e1', grid: 'rgba(255,255,255,.7)' },
        sky: true, RIM: HW + 84, G: 150,
        prep: function () {
            this.ramps = [straightNear(0.12, -2, 30, 0.004), straightNear(0.47, -2, 30, 0.004), straightNear(0.8, -2, 30, 0.004)];
            seed = 77;
            this.blobs = [];
            for (var i = 0; i < 7; i++) {
                var j = Math.round(i * N / 7 + 20), sg = i % 2 ? 1 : -1, p = side(j, sg * (HW + 120)), o = { x: p.x, y: p.y };
                nearest(o);
                if (o.dist > HW + 100) this.blobs.push({ x: p.x, y: p.y, r: 80 + rnd() * 50 });
            }
            var far = { x: 0, y: 0, dist: 0 };  /* the Earth hangs in the emptiest bit of sky */
            for (var gx = 100; gx < WW - 100; gx += 40) for (var gy = 100; gy < WH - 100; gy += 40) {
                o = { x: gx, y: gy }; nearest(o);
                if (o.dist > far.dist) far = o;
            }
            this.ex = far.x; this.ey = far.y;
        },
        paint: function (g) {
            var i, k, p, b;
            g.clearRect(0, 0, WW, WH);  /* the space around stays see-through, the sky is drawn behind */
            var self = this;
            function slab(dx, dy, color) {
                g.save(); g.translate(dx, dy);
                strokeLoop(g, 0, N, 2 * (HW + 100), color);
                g.fillStyle = color; self.blobs.forEach(function (q) { g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); });
                g.restore();
            }
            slab(0, 26, '#2e3040'); slab(0, 13, '#4a4c5a'); slab(0, 0, '#9a9ca6');  /* the cliff edge, then the top */
            seed = 9;
            for (i = 0; i < N; i += 2) for (k = -1; k <= 1; k += 2) {  /* rocks along the rim */
                p = side(i, k * (HW + 96 + rnd() * 6)); var rr = 5 + rnd() * 9;
                circle(g, p.x, p.y + 3, rr, '#6e707c'); circle(g, p.x - rr * 0.2, p.y - rr * 0.2, rr * 0.7, '#a3a5af');
            }
            var o = { x: 0, y: 0 };
            for (i = 0; i < 1600; i++) {  /* dust texture and craters, only on the slab */
                o.x = rnd() * WW; o.y = rnd() * WH; nearest(o);
                if (o.dist > HW + 92) continue;
                if (i % 9) { circle(g, o.x, o.y, 1 + rnd() * 2.5, rnd() < 0.5 ? '#a9abb4' : '#8a8c96'); continue; }
                var cr = o.dist < HW + 4 ? 6 + rnd() * 6 : 10 + rnd() * 22;
                circle(g, o.x, o.y, cr, '#83858f'); circle(g, o.x + cr * 0.15, o.y + cr * 0.15, cr * 0.82, '#757783');
                g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1.5, cr * 0.14);
                g.beginPath(); g.arc(o.x, o.y, cr, 0.6, 2.6); g.stroke();
            }
            this.blobs.forEach(function (q, n) {
                for (k = 0; k < 4; k++) {
                    var a = rnd() * 7, d = rnd() * q.r * 0.6, x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d, r2 = 10 + rnd() * 18;
                    circle(g, x, y, r2, '#83858f'); circle(g, x + r2 * 0.15, y + r2 * 0.15, r2 * 0.82, '#757783');
                }
                if (n === 1) {  /* a little lander */
                    g.save(); g.translate(q.x, q.y);
                    g.strokeStyle = '#d1d5db'; g.lineWidth = 3;
                    for (k = 0; k < 4; k++) { var la = k * 1.571 + 0.785; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(la) * 26, Math.sin(la) * 26); g.stroke(); circle(g, Math.cos(la) * 26, Math.sin(la) * 26, 4, '#d1d5db'); }
                    circle(g, 4, 6, 15, 'rgba(0,0,0,.3)');
                    g.fillStyle = '#e0b84a'; g.fillRect(-13, -13, 26, 26);
                    circle(g, 0, 0, 9, '#f1f5f9'); circle(g, 2, -2, 3.5, '#60a5fa');
                    g.restore();
                }
                if (n === 3) {  /* a flag with a paw print */
                    g.save(); g.translate(q.x, q.y);
                    circle(g, 0, 0, 3, '#e5e7eb'); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(4, 4, 34, 22);
                    g.fillStyle = '#d6336c'; g.fillRect(0, -2, 34, 22);
                    circle(g, 17, 12, 4.5, '#fff'); circle(g, 11, 5, 2.2, '#fff'); circle(g, 15.5, 3, 2.2, '#fff'); circle(g, 20.5, 3, 2.2, '#fff'); circle(g, 25, 5, 2.2, '#fff');
                    g.restore();
                }
            });
            strokeLoop(g, 0, N, 2 * HW + 10, '#6f7280');  /* the road */
            strokeLoop(g, 0, N, 2 * HW, '#b8bbc5');
            strokeLoop(g, 0, N, 2, 'rgba(255,255,255,.45)', [16, 20]);
            for (i = 0; i < N; i += 4) for (k = -1; k <= 1; k += 2) {  /* runway lights along both edges */
                p = side(i, k * (HW + 2)); circle(g, p.x, p.y, 6, 'rgba(110,220,255,.25)'); circle(g, p.x, p.y, 2.6, '#bff3ff');
            }
            this.ramps.forEach(function (j) {  /* ramps: yellow plates with chevrons */
                g.save(); g.translate(X[j], Y[j]); g.rotate(A[j]);
                g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-14, -HW + 2, 34, 2 * HW - 4);
                g.fillStyle = '#e2b13c'; g.fillRect(-18, -HW + 4, 34, 2 * HW - 8);
                g.fillStyle = '#fde68a'; g.fillRect(12, -HW + 4, 4, 2 * HW - 8);
                g.strokeStyle = '#3b2a10'; g.lineWidth = 4;
                for (b = -HW + 18; b < HW - 10; b += 22) { g.beginPath(); g.moveTo(-10, b - 7); g.lineTo(4, b); g.lineTo(-10, b + 7); g.stroke(); }
                g.restore();
            });
        },
        effect: function (c, dt) {
            if (c.rampT > 0) c.rampT -= dt;
            if (c.z > 0 || c.vz > 0) {  /* in the air: the moon pulls only gently */
                c.z += c.vz * dt; c.vz -= this.G * dt;
                if (c.z <= 0) {
                    c.z = c.vz = 0;
                    for (var k = 0; k < 6; k++) puff('dust', c.x, c.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, 0.8, 5 + Math.random() * 5);
                    if (c === me) api.sfx('tap');
                }
            } else if (c.rampT <= 0 && c.vf > 110) {
                for (var i = 0; i < 3; i++) {
                    var j = this.ramps[i], d = (c.idx - j + N) % N;
                    if (d <= 1 && c.dist < HW) {
                        c.vz = c.vf * 0.22; c.z = 0.01; c.rampT = 1.5;
                        if (c === me) { api.sfx('jump'); if (clock - lastSay > 6) say('Wheee! Low gravity!'); }
                    }
                }
            }
            if (!c.z && c.dist > HW + 4 && Math.abs(c.vf) > 90 && Math.random() < 0.25) puff('dust', c.x, c.y, -c.vx * 0.1, -c.vy * 0.1, 0.7, 4 + Math.random() * 3);
            nearest(c);
            if (c.dist > this.RIM) {  /* the rocks on the rim stop you from driving into space */
                var px = X[c.idx], py = Y[c.idx], nx = (c.x - px) / c.dist, ny = (c.y - py) / c.dist, vn = c.vx * nx + c.vy * ny;
                c.x = px + nx * this.RIM; c.y = py + ny * this.RIM;
                if (vn > 0) { c.vx -= nx * vn * 1.4; c.vy -= ny * vn * 1.4; if (c === me && vn > 60 && clock - hitAt > 0.5) { hitAt = clock; api.sfx('hit'); } }
            }
        },
        under: function () { drawParts('dust'); },
        drawSky: function (cw, ch, k) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#060a1a'; ctx.fillRect(0, 0, cw, ch);
            if (!this.stars) {  /* a tile of stars, and the Earth, drawn once */
                var t = this.stars = document.createElement('canvas'); t.width = t.height = 300;
                var g = t.getContext('2d'), s = 99;
                for (var i = 0; i < 70; i++) {
                    s = (s * 16807) % 2147483647; var x = s % 300; s = (s * 16807) % 2147483647; var y = s % 300; s = (s * 16807) % 2147483647;
                    var b = s % 10;
                    circle(g, x, y, b > 8 ? 1.8 : b > 5 ? 1.2 : 0.7, b > 8 ? '#fff7d6' : b > 5 ? '#e2e8f0' : '#94a3b8');
                }
                this.pat = ctx.createPattern(t, 'repeat');
                var e = this.earth = document.createElement('canvas'); e.width = e.height = 180;
                g = e.getContext('2d');
                var gl = g.createRadialGradient(90, 90, 60, 90, 90, 90); gl.addColorStop(0, 'rgba(120,180,255,.5)'); gl.addColorStop(1, 'rgba(120,180,255,0)');
                g.fillStyle = gl; g.fillRect(0, 0, 180, 180);
                g.save(); g.beginPath(); g.arc(90, 90, 64, 0, 7); g.clip();
                g.fillStyle = '#2f6fd6'; g.fillRect(0, 0, 180, 180);
                g.fillStyle = '#4caf6a';
                [[70, 60, 22, 30], [105, 105, 26, 18], [60, 120, 14, 12], [118, 62, 12, 16]].forEach(function (c) { g.beginPath(); g.ellipse(c[0], c[1], c[2], c[3], 0.5, 0, 7); g.fill(); });
                g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 6; g.lineCap = 'round';
                [[40, 80, 90, 70], [80, 135, 130, 128], [95, 40, 135, 50]].forEach(function (c) { g.beginPath(); g.moveTo(c[0], c[1]); g.quadraticCurveTo((c[0] + c[2]) / 2, c[1] - 10, c[2], c[3]); g.stroke(); });
                var sh = g.createLinearGradient(50, 40, 150, 140); sh.addColorStop(0.45, 'rgba(6,10,26,0)'); sh.addColorStop(1, 'rgba(6,10,26,.85)');
                g.fillStyle = sh; g.fillRect(0, 0, 180, 180);
                g.restore();
            }
            var ox = (camX * k * 0.15) % 300, oy = (camY * k * 0.15) % 300;
            ctx.save(); ctx.translate(-ox, -oy); ctx.scale(dpr * 0.7, dpr * 0.7); ctx.fillStyle = this.pat; ctx.fillRect(0, 0, (cw + 600) / dpr / 0.7, (ch + 600) / dpr / 0.7); ctx.restore();
            var es = 230 * k, ex = (this.ex + (camX - this.ex) * 0.3) * k - VX0 * k, ey = (this.ey + (camY - this.ey) * 0.3) * k - VY0 * k;
            if (ex > -es && ex < cw + es && ey > -es && ey < ch + es) ctx.drawImage(this.earth, ex - es / 2, ey - es / 2, es, es);
        }
    };
    var MAPS = [MEADOW, CITY, REEF, MOON];

    function drawParts(kind) {
        var any = false;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p.k !== kind || !vis(p.x, p.y, 20)) continue;
            var f = p.t / p.life;
            ctx.globalAlpha = 1 - f; any = true;
            if (kind === 'bub') {
                var r = p.r * (0.7 + f * 0.8);
                ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.fillRect(p.x - r * 0.45, p.y - r * 0.55, r * 0.35, r * 0.35);
            } else if (kind === 'drop') { circle(ctx, p.x, p.y, p.r, '#a9c8ff'); }
            else { ctx.globalAlpha = (1 - f) * 0.5; circle(ctx, p.x, p.y, p.r * (1 + f * 1.5), '#cfd2da'); }
        }
        if (any) ctx.globalAlpha = 1;
    }

    /* ---------- page: canvas, HUD, countdown, touch buttons, track picker ---------- */
    function arrow(d) { return '<svg viewBox="0 0 24 24"><path d="' + d + '"/></svg>'; }
    var wrapEl = document.createElement('div');
    wrapEl.className = 'kk kk-picking' + (api.touch ? ' kk-touch' : '');
    wrapEl.innerHTML = '<canvas class="kk-cv"></canvas>' +
        '<div class="kk-hud"><span class="kk-pill kk-pos">4th</span><span class="kk-pill"><small>Lap</small><b class="kk-lap">1/3</b></span>' +
        '<span class="kk-pill kk-time">0.0</span></div><div class="kk-count"></div>' +
        '<div class="kk-hint">' + (api.touch ? 'Hold Gas, steer with the arrows' : 'Arrows or WASD: up to drive, down to brake, left and right to steer') + '</div>' +
        '<button class="kk-btn kk-left" data-k="left" aria-label="Steer left">' + arrow('M15 5l-7 7 7 7') + '</button>' +
        '<button class="kk-btn kk-right" data-k="right" aria-label="Steer right">' + arrow('M9 5l7 7-7 7') + '</button>' +
        '<button class="kk-btn kk-brake" data-k="down">Brake</button><button class="kk-btn kk-gas" data-k="up">Gas</button>' +
        '<div class="kk-pick"><div class="kk-pick-box" role="dialog" aria-label="Pick a track"><h3>Pick a track</h3><div class="kk-maps"></div>' +
        '<p class="kk-pick-tip">' + (api.touch ? 'Tap a track to race' : 'Click a track, or arrows to choose and Enter to race') + '</p></div></div>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.kk-cv'), ctx = cv.getContext('2d', { alpha: false });
    var posEl = wrapEl.querySelector('.kk-pos'), lapEl = wrapEl.querySelector('.kk-lap'), timeEl = wrapEl.querySelector('.kk-time');
    var countEl = wrapEl.querySelector('.kk-count'), hintEl = wrapEl.querySelector('.kk-hint'), mapsEl = wrapEl.querySelector('.kk-maps');

    /* the last track and the best time on each track are remembered in this browser */
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('kitty-kart-maps')); } catch (e) { saved = null; }
    if (!saved || typeof saved !== 'object') saved = {};
    if (!saved.best || typeof saved.best !== 'object') saved.best = {};
    function persist() { try { localStorage.setItem('kitty-kart-maps', JSON.stringify(saved)); } catch (e) { /* private mode: fine */ } }
    var sel = 0;
    MAPS.forEach(function (m, i) { if (m.id === saved.map) sel = i; });
    var MAP = MAPS[sel];

    var cards = MAPS.map(function (m, i) {
        build(m);
        if (m.prep) m.prep();
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'kk-map';
        b.innerHTML = '<canvas width="240" height="180"></canvas><b></b><small></small><small class="kk-mbest"></small>';
        b.querySelector('b').textContent = m.name;
        b.querySelector('small').textContent = m.blurb;
        thumb(b.querySelector('canvas').getContext('2d'), m);
        mapsEl.appendChild(b);
        api.on(b, 'click', function () { if (phase !== 'pick') return; choose(i); go(); });
        api.on(b, 'focus', function () { if (phase === 'pick' && sel !== i) choose(i); });
        return b;
    });
    function thumb(g, m) {  /* a small picture of the track for its button */
        var s = Math.min(220 / WW, 160 / WH), i;
        g.fillStyle = m.col.bg; g.fillRect(0, 0, 240, 180);
        g.save(); g.translate((240 - WW * s) / 2, (180 - WH * s) / 2); g.scale(s, s); g.lineJoin = 'round';
        if (m === MOON) { seed = 3; for (i = 0; i < 60; i++) circle(g, rnd() * WW, rnd() * WH, 6, '#cbd5e1'); }
        if (m === REEF) { seed = 3; for (i = 0; i < 26; i++) circle(g, rnd() * WW, rnd() * WH, 30, ['#ff7f9e', '#ffd166', '#b88ae6'][i % 3]); }
        if (m === CITY) { seed = 3; for (i = 0; i < 40; i++) { g.fillStyle = i % 4 ? '#323b52' : '#ffd27a'; g.fillRect(rnd() * WW, rnd() * WH, 90, 70); } }
        if (m === MEADOW) { seed = 3; for (i = 0; i < 40; i++) circle(g, rnd() * WW, rnd() * WH, 34, '#97d08f'); }
        strokeLoop(g, 0, N, 2 * HW + (m === MOON ? 200 : 60), m.col.edge);
        strokeLoop(g, 0, N, 2 * HW + 30, m.col.road);
        g.setLineDash([]);
        g.translate(X[0], Y[0]); g.rotate(A[0]); g.fillStyle = '#0f172a'; g.fillRect(-12, -HW - 15, 24, 2 * HW + 30);
        g.fillStyle = '#fff'; g.fillRect(-12, -HW - 15, 12, 2 * HW + 30);
        g.restore();
    }
    function showBests() {
        cards.forEach(function (b, i) {
            var t = saved.best[MAPS[i].id];
            b.querySelector('.kk-mbest').textContent = typeof t === 'number' ? 'Best ' + t.toFixed(1) + ' s' : '';
            b.classList.toggle('kk-sel', i === sel);
            b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
        });
    }

    var dpr = 1, W = 0, H = 0, zoom = 1, res = 0, track = null, mini = null, MM = 110, mmK = 1, dirty = true;
    function fit(s) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);  /* sharp enough, and much lighter on phones */
        W = s.w; H = s.h;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        zoom = clamp(Math.sqrt(W * H) / 760, 0.7, 1.4);
        MM = W < 600 ? 92 : 120;
        wrapEl.classList.toggle('kk-narrow', W < 600);
        MAPS.forEach(function (m) { m.beam = m.ray = null; });  /* gradients belong to the old canvas state */
        var r = Math.min(zoom * dpr, Math.sqrt(9e6 / (WW * WH)));  /* cap the cached track at about 9 megapixels */
        if (Math.abs(r - res) > 0.01 || !track || dirty) { res = r; renderTrack(); dirty = false; }
        renderMini();
    }

    /* the static track, drawn once into an offscreen canvas in world units times res */
    function renderTrack() {
        track = track || document.createElement('canvas');
        track.width = Math.ceil(WW * res); track.height = Math.ceil(WH * res);
        var g = track.getContext('2d'), i, k;
        g.setTransform(res, 0, 0, res, 0, 0);
        g.lineJoin = g.lineCap = 'round';
        MAP.paint(g);
        g.setLineDash([]);
        g.save();  /* start/finish line, chequered */
        g.translate(X[0], Y[0]); g.rotate(A[0]);
        var q = HW / 5;
        for (i = 0; i < 10; i++) for (k = 0; k < 2; k++) { g.fillStyle = (i + k) % 2 ? '#0f172a' : '#ffffff'; g.fillRect(-q + k * q, -HW + i * q, q, q); }
        g.restore();
        for (i = 0; i < 4; i++) {  /* grid boxes */
            var j = N - 3 - i * 3, sd = (i % 2 ? 1 : -1) * HW * 0.45;
            g.save(); g.translate(X[j] - Math.sin(A[j]) * sd, Y[j] + Math.cos(A[j]) * sd); g.rotate(A[j]);
            g.strokeStyle = MAP.col.grid || 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.strokeRect(-14, -12, 32, 24);
            g.restore();
        }
    }
    function renderMini() {
        mini = mini || document.createElement('canvas');
        mmK = MM / Math.max(WW, WH);
        mini.width = Math.ceil(WW * mmK * dpr); mini.height = Math.ceil(WH * mmK * dpr);
        var g = mini.getContext('2d');
        g.setTransform(mmK * dpr, 0, 0, mmK * dpr, 0, 0);
        g.lineJoin = g.lineCap = 'round';
        strokeLoop(g, 0, N, 2 * HW, MAP.col.mini || '#b4bcc6');
        g.setLineDash([]);
        g.translate(X[0], Y[0]); g.rotate(A[0]);  /* the start line */
        g.fillStyle = MAP.col.mini ? '#d6336c' : '#0f172a'; g.fillRect(-1 / mmK, -HW, 2 / mmK, 2 * HW);
    }

    /* ---------- karts: the player (first) and three computer cats with their own fur ---------- */
    var karts = [
        { fur: '#f6a23a', stripe: '#cf7419', body: '#d6336c', skill: 1 },  /* you: orange tabby, pink kart */
        { fur: '#a3aab5', stripe: '#6b7280', body: '#1e3a8a', skill: 0.945 },  /* grey tabby */
        { fur: '#45424d', stripe: null, body: '#0f9d8a', skill: 0.925 },  /* black cat */
        { fur: '#fbf7ef', stripe: '#e8c9a0', body: '#8b5cf6', skill: 0.895 }];  /* white cat */
    karts.forEach(function (c, i) { c.phase = i * 1.7; c.lane = (i % 2 ? 1 : -1) * 0.3 * HW; });
    var me = karts[0], keys = {}, pads = {};
    var phase = 'pick', clock = 0, raceTime = 0, finishers = 0, place = 4, camX = 0, camY = 0, shake = 0;
    var shown = { pos: '', lap: '', time: '', count: '' }, lastSay = -99, hitAt = -99, wrongFor = 0;

    function reset() {
        karts.forEach(function (c, i) {
            var slot = (i + 3) % 4, j = N - 3 - slot * 3, sd = slot % 2 ? 1 : -1;  /* you start at the back */
            c.x = X[j] - Math.sin(A[j]) * sd * HW * 0.45; c.y = Y[j] + Math.cos(A[j]) * sd * HW * 0.45;
            c.a = A[j]; c.vx = c.vy = c.vf = c.steer = c.thr = 0;
            c.k = 0; c.fin = 0; c.prog = 0; c.z = c.vz = c.slip = c.rampT = 0;
            nearest(c);
        });
        parts.length = 0;
        if (MAP.reset) MAP.reset();
        camX = me.x; camY = me.y;
    }
    function choose(i) {  /* switch the track shown behind the picker */
        sel = (i + MAPS.length) % MAPS.length;
        MAP = MAPS[sel];
        build(MAP);
        if (MAP.prep) MAP.prep();
        reset();
        dirty = true;
        fit(api.size());
        showBests();
        saved.map = MAP.id; persist();
    }
    function go() {  /* the picked track: on to the countdown */
        if (phase !== 'pick') return;
        phase = 'count'; clock = 0; keys = {};
        wrapEl.classList.remove('kk-picking');
        if (document.activeElement && wrapEl.contains(document.activeElement)) document.activeElement.blur();
        saved.map = MAP.id; persist();
        api.sfx('tap');
    }

    /* driving: same simple physics for everybody, the inputs come from keys, touch or the computer */
    function step(c, dt) {
        var ca = Math.cos(c.a), sa = Math.sin(c.a);
        var vf = c.vx * ca + c.vy * sa, vr = c.vy * ca - c.vx * sa, air = c.z > 0;
        var off = c.dist > HW + 4 && !air, vmax = off ? VGRASS : VMAX, thr = air ? 0 : c.thr;
        if (thr > 0) vf += (vf < 0 ? BRAKE : ACC * Math.max(0, 1 - vf / vmax)) * thr * dt;
        else if (thr < 0) vf += (vf > 0 ? BRAKE : ACC * 0.5 * Math.max(0, 1 + vf / REV)) * thr * dt;
        else if (!air) vf -= vf * COAST * dt;
        if (vf > vmax) vf -= (vf - vmax) * 2.6 * dt;  /* the grass slows you down */
        if (!air) vr *= Math.max(0, 1 - (off ? GRIPOFF : GRIP) * (c.slip > 0 ? 0.12 : 1) * dt);  /* grip: a little slide, not much */
        var sp = Math.abs(vf), turn = air ? 0 : c.steer * TURN * Math.min(1, sp / 60) * (1 - 0.25 * Math.min(1, sp / VMAX));
        c.a += (vf < 0 ? -turn : turn) * dt;
        ca = Math.cos(c.a); sa = Math.sin(c.a);
        c.vx = ca * vf - sa * vr; c.vy = sa * vf + ca * vr; c.vf = vf;
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (MAP.effect) MAP.effect(c, dt);
        if (c.x < 30 || c.x > WW - 30) { c.x = clamp(c.x, 30, WW - 30); c.vx *= -0.3; }  /* the fence around the field */
        if (c.y < 30 || c.y > WH - 30) { c.y = clamp(c.y, 30, WH - 30); c.vy *= -0.3; }
    }
    function autopilot(c, skill) {
        var look = Math.round((34 + Math.abs(c.vf) * 0.32) / SP), j = (c.idx + look) % N, lane = c.lane * Math.sin(clock * 0.35 + c.phase);
        var tx = X[j] - Math.sin(A[j]) * lane, ty = Y[j] + Math.cos(A[j]) * lane;
        c.steer = clamp(wrap(Math.atan2(ty - c.y, tx - c.x) - c.a) * 3, -1, 1);
        var km = 0;
        for (var i = 1; i < 26; i++) km = Math.max(km, Math.abs(K[(c.idx + i) % N]));
        var vt = VMAX * skill / (1 + km * 80 * CARE);
        c.thr = c.vf < vt ? 1 : c.vf > vt + 30 ? -0.7 : 0;
    }
    /* checkpoints: k counts the ones passed in order (the start line is the first); a lap is CP of them */
    function progress(c) {
        nearest(c);
        var next = (c.k % CP) * SEG;
        if ((c.idx - next + N) % N < SEG / 2 && c.dist < HW + 30) {
            c.k++;
            if (c.k > 1 && (c.k - 1) % CP === 0) lapDone(c);
        }
        var e = (c.idx - (((c.k - 1) % CP + CP) % CP) * SEG + N) % N;
        if (e > N / 2) e -= N;
        c.prog = c.k * SEG + clamp(e, -SEG, SEG * 1.5);
    }
    function laps(c) { return c.k > 0 ? Math.floor((c.k - 1) / CP) : 0; }
    function lapDone(c) {
        var l = laps(c);
        if (l >= LAPS && !c.fin) { c.fin = raceTime; finishers++; if (c === me) finish(); return; }
        if (c !== me) return;
        api.sfx('pop');
        if (l === LAPS - 1) { api.cat('wow'); say('Final lap!'); }
    }
    function ordinal(p) { return p + ['st', 'nd', 'rd', 'th'][Math.min(p, 4) - 1]; }
    function say(t) { lastSay = clock; api.say(t, 1800); }
    function finish() {
        phase = 'done';
        count('');
        place = finishers;
        var t = Math.round(raceTime * 10) / 10, old = saved.best[MAP.id];
        if (typeof old !== 'number' || t < old) { saved.best[MAP.id] = t; persist(); }
        show();
        if (place === 1) { api.cat('happy'); api.say('Purrfect! First place!', 2400); }
        else api.say(place === 2 ? 'So close! Again?' : 'Meow. Next time!', 2400);
        api.end({ score: t, lowerIsBetter: true, win: place === 1,
            text: 'You finished ' + ordinal(place) + ' on ' + MAP.name + '\nTime ' + t.toFixed(1) + ' s' });
    }
    function collide() {
        for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) {
            var a = karts[i], b = karts[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
            if (d2 >= 4 * R * R || d2 === 0 || Math.abs(a.z - b.z) > 8) continue;  /* a jumping kart flies over */
            var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, push = (2 * R - d) / 2;
            a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
            var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vn >= 0) continue;
            var imp = -vn * 0.7;  /* a soft bounce, both lose a little speed */
            a.vx -= nx * imp; a.vy -= ny * imp; b.vx += nx * imp; b.vy += ny * imp;
            a.vx *= 0.96; a.vy *= 0.96; b.vx *= 0.96; b.vy *= 0.96;
            if (i === 0 && -vn > 50 && clock - hitAt > 0.5) { hitAt = clock; api.sfx('hit'); if (!api.reducedMotion) shake = Math.min(6, -vn / 25); }
        }
    }

    /* ---------- drawing ---------- */
    function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    var OL = '#3b2a1e';
    function drawKart(c) {
        ctx.save(); ctx.translate(c.x, c.y);
        if (c.z > 0) {  /* in the air: the shadow stays on the ground, the kart grows a little */
            ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(c.z * 0.5, c.z * 0.8, 16, 11, c.a, 0, 7); ctx.fill();
            ctx.scale(1 + c.z / 45, 1 + c.z / 45);
        }
        ctx.rotate(c.a);
        ctx.fillStyle = 'rgba(15,23,42,.16)'; rrect(-14, -8, 32, 20, 8); ctx.fill();
        ctx.fillStyle = '#1f2937';
        rrect(-14, -13, 10, 6, 2); ctx.fill(); rrect(-14, 7, 10, 6, 2); ctx.fill();
        for (var s = -1; s <= 1; s += 2) { ctx.save(); ctx.translate(9, s * 10); ctx.rotate(c.steer * 0.45); rrect(-4.5, -2.5, 9, 5, 2); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = c.body; ctx.strokeStyle = 'rgba(15,23,42,.55)'; ctx.lineWidth = 1.4;
        rrect(-15, -8.5, 31, 17, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.4)'; rrect(11, -6, 4, 12, 2); ctx.fill();
        var wag = Math.sin(clock * 9 + c.phase) * 3;  /* the tail, over the back of the kart */
        ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(-17, 4 + wag, -21, 9 + wag);
        ctx.strokeStyle = OL; ctx.lineWidth = 5.6; ctx.stroke(); ctx.strokeStyle = c.fur; ctx.lineWidth = 3.4; ctx.stroke();
        ctx.fillStyle = c.fur; ctx.strokeStyle = OL; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(4, -9.5); ctx.lineTo(3.5, -2); ctx.closePath();  /* ears */
        ctx.moveTo(-3, 5); ctx.lineTo(4, 9.5); ctx.lineTo(3.5, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(-1, 0, 7, 0, 7); ctx.fill(); ctx.stroke();
        if (c.stripe) {
            ctx.strokeStyle = c.stripe; ctx.lineWidth = 1.6; ctx.beginPath();
            ctx.moveTo(-6.5, -3); ctx.lineTo(-2.5, -2.4); ctx.moveTo(-7.4, 0); ctx.lineTo(-2.5, 0); ctx.moveTo(-6.5, 3); ctx.lineTo(-2.5, 2.4); ctx.stroke();
        }
        ctx.restore();
    }
    function draw() {
        var k = dpr * zoom, cw = cv.width, ch = cv.height, i;
        var cx = camX + (shake ? (Math.random() - 0.5) * shake : 0), cy = camY + (shake ? (Math.random() - 0.5) * shake : 0);
        var ox = Math.round(cx * k - cw / 2), oy = Math.round(cy * k - ch / 2);   /* view offset in device pixels */
        VX0 = ox / k; VY0 = oy / k; VX1 = (ox + cw) / k; VY1 = (oy + ch) / k;
        if (MAP.sky) MAP.drawSky(cw, ch, k);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (Math.abs(res - k) < 0.01 && ox >= 0 && oy >= 0 && ox + cw <= track.width && oy + ch <= track.height) {
            ctx.drawImage(track, ox, oy, cw, ch, 0, 0, cw, ch);  /* the usual case: a plain copy, no scaling */
        } else {                                                 /* track cache capped, or the window is larger than the field */
            if (!MAP.sky) { ctx.fillStyle = MAP.col.bg; ctx.fillRect(0, 0, cw, ch); }
            var hw = cw / 2 / k, hh = ch / 2 / k, x0 = Math.max(0, Math.floor(cx - hw)), y0 = Math.max(0, Math.floor(cy - hh));
            var x1 = Math.min(WW, Math.ceil(cx + hw)), y1 = Math.min(WH, Math.ceil(cy + hh));
            ctx.setTransform(k, 0, 0, k, cw / 2 - cx * k, ch / 2 - cy * k);
            if (x1 > x0 && y1 > y0) ctx.drawImage(track, x0 * res, y0 * res, (x1 - x0) * res, (y1 - y0) * res, x0, y0, x1 - x0, y1 - y0);
        }
        ctx.setTransform(k, 0, 0, k, -ox, -oy);
        if (MAP.under) MAP.under();
        for (i = 3; i >= 0; i--) if (!(karts[i].z > 0)) drawKart(karts[i]);
        for (i = 3; i >= 0; i--) if (karts[i].z > 0) drawKart(karts[i]);
        if (MAP.over) MAP.over();
        if (MAP.screen) MAP.screen();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);  /* minimap, top right */
        var mw = WW * mmK, mh = WH * mmK, mx = W - mw - 10, my = 10;
        ctx.fillStyle = MAP.col.panel; rrect(mx - 6, my - 6, mw + 12, mh + 12, 12); ctx.fill();
        ctx.drawImage(mini, mx, my, mw, mh);
        for (i = 3; i >= 0; i--) {
            var c = karts[i];
            ctx.beginPath(); ctx.arc(mx + c.x * mmK, my + c.y * mmK, i ? 3.5 : 4.5, 0, 7);
            ctx.fillStyle = i ? c.body : c.fur; ctx.fill();
            ctx.strokeStyle = i ? '#fff' : OL; ctx.lineWidth = 1.5; ctx.stroke();
        }
    }
    function setText(el, key, v) { if (shown[key] !== v) { shown[key] = v; el.textContent = v; } }
    function show() {
        setText(posEl, 'pos', ordinal(place));
        setText(lapEl, 'lap', Math.min(LAPS, laps(me) + 1) + '/' + LAPS);
        var t = raceTime.toFixed(1);
        if (shown.time !== t) { setText(timeEl, 'time', t); api.score(t, 'Time'); }
    }
    function count(text, cls) {
        if (shown.count === text) return;
        shown.count = text;
        countEl.textContent = text;
        countEl.className = 'kk-count' + (cls ? ' ' + cls : '');
        if (text && !api.reducedMotion) { void countEl.offsetWidth; countEl.classList.add('kk-pop'); }
    }

    /* ---------- the loop ---------- */
    var test = window.__errors ? (window.__kk = { bot: false, steps: 1 }) : null;  /* only on the test page */
    if (test) test.state = function () { return { phase: phase, map: MAP.id, lap: laps(me), place: place, time: raceTime, z: me.z, slip: me.slip, fin: karts.map(function (c) { return c.fin; }) }; };
    function update(dt) {
        clock += dt;
        if (MAP.update) MAP.update(dt);
        moveParts(dt);
        if (phase === 'pick') return;
        if (phase === 'count') {  /* 3, 2, 1, Go */
            var n = 3 - Math.floor(clock - 0.6);
            if (clock >= 0.6 && n >= 1 && shown.count !== String(n)) { count(String(n)); api.sfx('tap'); }
            if (n < 1) { phase = 'race'; count('Go!', 'kk-go'); api.sfx('point'); hintEl.style.display = 'none'; }
        } else {
            if (phase === 'race') {
                raceTime += dt;
                if (test && test.bot) autopilot(me, 0.98);
                else {
                    me.thr = (keys.up || pads.up ? 1 : 0) - (keys.down || pads.down ? 1 : 0);
                    var want = (keys.right || pads.right ? 1 : 0) - (keys.left || pads.left ? 1 : 0);
                    me.steer += (want - me.steer) * Math.min(1, dt * 10);
                }
            } else autopilot(me, 0.45);  /* after the finish: a slow lap of honour */
            for (var i = 1; i < 4; i++) {
                var c = karts[i];  /* a little rubber band: the others ease off when far ahead and push when behind */
                autopilot(c, c.fin ? 0.6 : c.skill * (1 + clamp((me.prog - c.prog) / (SEG * 30), -0.07, 0.05)));
            }
            for (i = 0; i < 4; i++) step(karts[i], dt);
            collide();
            for (i = 0; i < 4; i++) progress(karts[i]);
            if (phase === 'race') {
                var p = 1;
                for (i = 1; i < 4; i++) if (karts[i].fin || karts[i].prog > me.prog) p++;
                if (p !== place && clock - lastSay > 6) {
                    if (p === 1) { api.cat('happy'); say('Purr! You took the lead!'); }
                    else if (p < place) { api.cat('wow'); say('Nice pass!'); }
                    else if (p === 2 && place === 1) { api.cat('sad'); say('Hiss! Catch them!'); }
                }
                place = p;
                var wrong = Math.abs(wrap(me.a - A[me.idx])) > 2.1 && me.vf > 20;
                wrongFor = wrong ? wrongFor + dt : 0;
                if (clock > 5) count(wrongFor > 0.8 ? 'Wrong way!' : '', 'kk-warn');
            }
            if (clock > 4.4 && shown.count === 'Go!') count('');
        }
        camX += (me.x + me.vx * 0.4 - camX) * Math.min(1, dt * 4);
        camY += (me.y + me.vy * 0.4 - camY) * Math.min(1, dt * 4);
        shake = Math.max(0, shake - dt * 20);
    }
    api.loop(function (dt) {
        for (var s = test ? test.steps : 1; s > 0; s--) update(dt);
        var vw = W / 2 / zoom, vh = H / 2 / zoom;  /* keep the view inside the field */
        camX = vw * 2 < WW ? clamp(camX, vw, WW - vw) : WW / 2;
        camY = vh * 2 < WH ? clamp(camY, vh, WH - vh) : WH / 2;
        draw();
        show();
    });

    /* ---------- controls: keys on desktop, buttons on touch screens ---------- */
    var KEYMAP = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
    api.on(window, 'keydown', function (e) {
        var key = (e.key || '').toLowerCase(), k = KEYMAP[key];
        if (phase === 'pick') {  /* in the picker: arrows choose, Enter or Space races */
            if (k) { choose(sel + (k === 'left' || k === 'up' ? -1 : 1)); if (wrapEl.contains(document.activeElement)) cards[sel].focus(); e.preventDefault(); }
            else if (key === 'enter' || key === ' ') { e.preventDefault(); go(); }
            return;
        }
        if (k) { keys[k] = true; e.preventDefault(); }
    });
    api.on(window, 'keyup', function (e) { var k = KEYMAP[(e.key || '').toLowerCase()]; if (k) keys[k] = false; });
    api.on(window, 'blur', function () { keys = {}; });
    Array.prototype.forEach.call(wrapEl.querySelectorAll('.kk-btn'), function (b) {
        function set(on) { return function (e) { e.preventDefault(); pads[b.dataset.k] = on; b.classList.toggle('kk-on', on); }; }
        api.on(b, 'pointerdown', set(true));
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { api.on(b, t, set(false)); });
        api.on(b, 'contextmenu', function (e) { e.preventDefault(); });
    });
    api.on(wrapEl, 'pointerdown', function (e) {  /* a touch screen the media query missed */
        if (e.pointerType === 'touch' && !wrapEl.classList.contains('kk-touch')) {
            wrapEl.classList.add('kk-touch'); hintEl.textContent = 'Hold Gas, steer with the arrows';
        }
    });

    build(MAP);
    if (MAP.prep) MAP.prep();
    reset();
    fit(api.size());
    api.onResize(fit);
    showBests();
    show();
    return { destroy: function () { if (window.__kk === test) try { delete window.__kk; } catch (e) { window.__kk = undefined; } } };
});
