    /* ---------- the tracks ---------- */
    var VX0 = 0, VY0 = 0, VX1 = 0, VY1 = 0, VB = null;  /* the visible part of the world, for culling; VB: the other view (split screen) */
    function vis(x, y, r) { return x + r > VX0 && x - r < VX1 && y + r > VY0 && y - r < VY1 || !!VB && x + r > VB[0] && x - r < VB[2] && y + r > VB[1] && y - r < VB[3]; }

    var MEADOW = {
        id: 'meadow', name: 'Catnip Meadow', blurb: 'A sprinkler and a farm gate shortcut',
        ctrl: [829, 969, 1211, 944, 1435, 829, 1466, 638, 1339, 510, 1116, 542, 925, 670, 734, 638, 670, 479, 797, 319,
               1084, 287, 1244, 160, 956, 109, 574, 128, 287, 224, 191, 446, 224, 701, 287, 892, 446, 956], scale: 1,
        phys: { vmax: 330, vgrass: 100, acc: 360, grip: 9, gripOff: 5, coast: 0.7, turn: 3.1, care: 1 },
        col: { bg: '#cdeac6', edge: '#bfe2b6', road: '#b4bcc6', panel: 'rgba(255,255,255,.85)' },
        alt: { a: 236, b: 286, hw: 30, vf: 0.8, gate: { at: 0.5, open: 3.4, shut: 2.6 } }, gate: 'farm',
        pads: [[140, 0.5], [380, -0.5]], picks: [30, 330], padCol: ['#f59e0b', '#fff7d6'],
        prep: function () {
            this.spr = side(410, HW + 34);
            seed = 4;
            var sp = spots(3, 420, 235, [this.spr]);
            this.pond = sp[0]; this.barn = sp[1]; this.hay = sp[2];
            var trees = this.trees = [], self = this;
            seed = 12;
            scatter(400, HW + 80, function (x, y) {
                if (trees.length >= 46) return;
                for (var k = 0; k < 3; k++) if (sp[k] && Math.hypot(x - sp[k].x, y - sp[k].y) < 150) return;
                if (Math.hypot(x - self.spr.x, y - self.spr.y) < 210) return;
                for (k = 0; k < trees.length; k++) if (Math.hypot(x - trees[k].x, y - trees[k].y) < 70) return;
                trees.push({ x: x, y: y, r: 22 + rnd() * 16, c: rnd() < 0.2 ? 1 : 0 });
            });
        },
        paint: function (g) {
            var i, k, p, self = this;
            g.fillStyle = '#c4e5b8'; g.fillRect(0, 0, WW, WH);
            blotch(g, ['#a9d69b', '#d8f1cd', '#b7dfa6'], 150, 3, 0.75);
            g.fillStyle = 'rgba(255,255,255,.13)';  /* mowing stripes */
            for (i = -WH; i < WW; i += 140) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 70, 0); g.lineTo(i + 70 + WH * 0.5, WH); g.lineTo(i + WH * 0.5, WH); g.fill(); }
            grain(g, 1400, ['#9ccb8d', '#e4f6dc', '#8fc480'], 4, HW + 24, 0, 5);  /* grass tufts */
            seed = 7;
            scatter(240, HW + 26, function (x, y, n) { circle(g, x, y, 3, n % 3 ? '#ffffff' : '#f9c6d9'); circle(g, x, y, 1.2, '#facc15'); });
            var q = this.pond;  /* a duck pond with reeds */
            if (q) {
                g.fillStyle = '#9fcf8f'; g.beginPath(); g.ellipse(q.x, q.y, 150, 104, 0.3, 0, 7); g.fill();
                g.fillStyle = '#5fb3d9'; g.beginPath(); g.ellipse(q.x, q.y, 134, 90, 0.3, 0, 7); g.fill();
                g.fillStyle = '#7cc5e6'; g.beginPath(); g.ellipse(q.x - 12, q.y - 10, 106, 64, 0.3, 0, 7); g.fill();
                g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3;
                for (k = 0; k < 4; k++) { g.beginPath(); g.arc(q.x - 40 + k * 26, q.y - 20 + k * 12, 14, 3.6, 5.6); g.stroke(); }
                circle(g, q.x + 50, q.y + 30, 18, '#5aa64a'); circle(g, q.x + 46, q.y + 26, 4, '#f9a8d4');  /* a lily pad */
                g.strokeStyle = '#4d8a3a'; g.lineWidth = 3;
                for (k = 0; k < 14; k++) { var ra = 3.6 + k * 0.12; g.beginPath(); g.moveTo(q.x + Math.cos(ra) * 140, q.y + Math.sin(ra) * 96); g.lineTo(q.x + Math.cos(ra) * 128, q.y + Math.sin(ra) * 80 - 18); g.stroke(); }
            }
            q = this.barn;  /* a red barn and a little yard */
            if (q) {
                g.fillStyle = '#d8c49a'; rr(g, q.x - 120, q.y - 80, 240, 170, 20); g.fill();
                g.fillStyle = 'rgba(40,30,20,.22)'; g.fillRect(q.x - 66, q.y - 36, 140, 100);
                g.fillStyle = '#c0392b'; g.fillRect(q.x - 76, q.y - 50, 140, 100);
                g.fillStyle = '#a93226'; g.fillRect(q.x - 76, q.y - 50, 140, 50);
                g.strokeStyle = '#7b241c'; g.lineWidth = 3; g.strokeRect(q.x - 76, q.y - 50, 140, 100);
                g.strokeStyle = '#f5e6c8'; g.lineWidth = 4; g.beginPath(); g.moveTo(q.x - 76, q.y); g.lineTo(q.x + 64, q.y); g.stroke();
                g.fillStyle = '#f5e6c8'; g.fillRect(q.x - 18, q.y - 50, 20, 100);
                circle(g, q.x + 92, q.y + 40, 13, '#e2b84a'); circle(g, q.x + 92, q.y + 40, 6, '#c99a2e');  /* a hay roll */
            }
            q = this.hay;  /* a flower garden */
            if (q) {
                var FL = ['#f472b6', '#facc15', '#ffffff', '#c084fc', '#fb923c'];
                for (k = 0; k < 5; k++) {
                    var bx = q.x + Math.cos(k * 1.26) * 70, by = q.y + Math.sin(k * 1.26) * 50;
                    g.fillStyle = '#8a6a4a'; g.beginPath(); g.ellipse(bx, by, 46, 26, k, 0, 7); g.fill();
                    seed = 40 + k;
                    for (i = 0; i < 26; i++) { var fa = rnd() * 7, fr = rnd() * 0.9; circle(g, bx + Math.cos(fa) * 40 * fr, by + Math.sin(fa) * 22 * fr, 4, FL[(k + i) % 5]); }
                }
            }
            circle(g, this.spr.x, this.spr.y, 192, 'rgba(70,150,210,.12)');  /* the lawn the sprinkler keeps wet */
            this.trees.forEach(function (t) { g.fillStyle = 'rgba(30,60,30,.18)'; g.beginPath(); g.ellipse(t.x + t.r * 0.5, t.y + t.r * 0.6, t.r * 1.05, t.r * 0.8, 0.5, 0, 7); g.fill(); });
            rail(g, HW + 64, 3, function (a, b) {  /* a white picket fence where there is room */
                g.strokeStyle = '#f8fafc'; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
            }, function (pt) { circle(g, pt.x + 1, pt.y + 2, 3.6, 'rgba(15,23,42,.15)'); circle(g, pt.x, pt.y, 3.4, '#ffffff'); });
            stand(g, 4, 22, HW + 44, ['#7c8aa0', '#a3b1c4']);
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 20, '#b2d9a5');
            strokeLoop(g, 0, N, 2 * HW + 34, '#b4dba6');  /* verge */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#b98c56');  /* the farm lane shortcut: muddy and slow, with a gate */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw - 12, '#c79d68');
            for (i = 3; i < ALT.n - 3; i += 2) { var mp = altSide(i, (i % 4 - 1.5) * 9); circle(g, mp.x, mp.y, 6, 'rgba(110,72,35,.3)'); }
            strokeAlt(g, 2, ALT.n - 3, 4, 'rgba(110,72,35,.35)', [14, 6]);
            for (i = 1; i < ALT.n - 1; i += 2) for (var fk = -1; fk <= 1; fk += 2) {  /* fence posts along the lane */
                var fp = altSide(i, fk * (ALT.hw + 5)); circle(g, fp.x + 1, fp.y + 2, 3.5, 'rgba(15,23,42,.15)'); circle(g, fp.x, fp.y, 3.2, '#8b5a2b');
            }
            road(g, { shadow: [3, 5, 'rgba(40,70,40,.18)'], edgeW: 6, kerb: ['#ffffff', '#e8484f', 18], line: '#ffffff', rim: '#a6aeb9', col: '#b8c0ca', crown: 'rgba(255,255,255,.07)' });
            grain(g, 1600, ['rgba(255,255,255,.35)', 'rgba(60,70,90,.18)'], 2.5, 0, HW - 6, 9);
            skids(g, 'rgba(60,66,80,.16)');
            strokeLoop(g, 0, N, 2, 'rgba(255,255,255,.6)', [18, 22]);  /* centre line */
            self = null;
        },
        over: function () {  /* tree tops and the barn roof, standing up off the ground */
            var i, t, x, y;
            for (i = 0; i < this.trees.length; i++) {
                t = this.trees[i];
                if (!vis(t.x, t.y, t.r + 60)) continue;
                x = liftX(t.x, 0.07); y = liftY(t.y, 0.07);
                circle(ctx, x, y, t.r, t.c ? '#e58fb0' : '#5fae57');
                circle(ctx, x - t.r * 0.18, y - t.r * 0.2, t.r * 0.72, t.c ? '#f4b6cc' : '#7cc46f');
                circle(ctx, x - t.r * 0.35, y - t.r * 0.38, t.r * 0.32, t.c ? '#fbd5e3' : '#9ad68a');
            }
            var q = this.barn;
            if (q && vis(q.x, q.y, 140)) {
                var h = 0.05, x0 = liftX(q.x - 76, h), y0 = liftY(q.y - 50, h), x1 = liftX(q.x + 64, h), y1 = liftY(q.y + 50, h);
                ctx.fillStyle = '#8e2a20'; ctx.beginPath(); ctx.moveTo(q.x - 76, q.y + 50); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.lineTo(q.x + 64, q.y + 50); ctx.fill();
                ctx.fillStyle = '#b03a2e'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
                ctx.fillStyle = '#c94a3c'; ctx.fillRect(x0, y0, x1 - x0, (y1 - y0) / 2);
                ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
                ctx.beginPath(); ctx.moveTo(x0, (y0 + y1) / 2); ctx.lineTo(x1, (y0 + y1) / 2); ctx.stroke();
                circle(ctx, (x0 + x1) / 2, y0 + 12, 6, '#f5e6c8');
            }
        },
        effect: function (c, dt) {  /* the sprinkler: its jet sweeps round and makes the road wet */
            var s = this.spr, th = clock * 1.3, dx = c.x - s.x, dy = c.y - s.y, d = Math.hypot(dx, dy);
            if (c.z > 0 || d > 190 || d < 12 || Math.abs(wrap(Math.atan2(dy, dx) - th)) > 0.17) return;
            if (c.slip < 0.1) { stat('sprinkler'); if (quiet(c, 4)) say('Sprinkler! Wet paws!', c); }
            c.slip = Math.max(c.slip, 0.45);
            c.vx += Math.cos(th) * 150 * dt; c.vy += Math.sin(th) * 150 * dt;
        },
        under: function () {
            var s = this.spr, th = clock * 1.3, k;
            if (!vis(s.x, s.y, 200)) return;
            ctx.fillStyle = 'rgba(120,190,255,.22)'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, 188, th - 0.17, th + 0.17); ctx.fill();
            ctx.fillStyle = 'rgba(110,180,250,.75)';
            for (k = 1; k <= 13; k++) {
                var r = k * 14, w = Math.sin(clock * 20 + k) * 2;
                ctx.beginPath(); ctx.arc(s.x + Math.cos(th) * r - Math.sin(th) * w, s.y + Math.sin(th) * r + Math.cos(th) * w, 2.5 + k * 0.25, 0, 7); ctx.fill();
            }
            circle(ctx, s.x + 2, s.y + 3, 9, 'rgba(15,23,42,.2)'); circle(ctx, s.x, s.y, 8, '#64748b'); circle(ctx, s.x, s.y, 4, '#cbd5e1');
        }
    };

    function block(b, wall, lit) {  /* a building standing up: its walls lean out with the view, the roof on top */
        if (!vis(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) return;
        var x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h, h = b.hi;
        var X0 = liftX(x0, h), Y0 = liftY(y0, h), X1 = liftX(x1, h), Y1 = liftY(y1, h);
        [[x0, y0, x1, y0, X1, Y0, X0, Y0], [x1, y0, x1, y1, X1, Y1, X1, Y0], [x1, y1, x0, y1, X0, Y1, X1, Y1], [x0, y1, x0, y0, X0, Y0, X0, Y1]].forEach(function (q, n) {
            ctx.fillStyle = wall[n % 2];
            ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.lineTo(q[6], q[7]); ctx.fill();
        });
        if (lit) {  /* rows of lit windows on the walls that face the camera */
            ctx.fillStyle = lit;
            var fx = (X1 + X0) / 2 - (x1 + x0) / 2, fy = (Y1 + Y0) / 2 - (y1 + y0) / 2;
            if (fy < -2) for (var u = 0.15; u < 0.9; u += 0.17) { var wx = x0 + (x1 - x0) * u, wy = y1; ctx.fillRect(wx + fx * 0.4, wy + fy * 0.4 - 2, 6, 3); }
            if (fx < -2) for (u = 0.15; u < 0.9; u += 0.2) { wy = y0 + (y1 - y0) * u; ctx.fillRect(x1 + fx * 0.4 - 2, wy + fy * 0.4, 3, 6); }
            if (fx > 2) for (u = 0.15; u < 0.9; u += 0.2) { wy = y0 + (y1 - y0) * u; ctx.fillRect(x0 + fx * 0.4 - 1, wy + fy * 0.4, 3, 6); }
            if (fy > 2) for (u = 0.15; u < 0.9; u += 0.17) { wx = x0 + (x1 - x0) * u; ctx.fillRect(wx + fx * 0.4, y0 + fy * 0.4 - 1, 6, 3); }
        }
        ctx.fillStyle = b.col; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
        if (b.ol) {  /* the cel-shaded look: bold outlines, a roof ridge and a highlight */
            ctx.strokeStyle = b.ol; ctx.lineWidth = 3; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(X0, Y1); ctx.moveTo(x1, y1); ctx.lineTo(X1, Y1); ctx.moveTo(x1, y0); ctx.lineTo(X1, Y0); ctx.moveTo(x0, y0); ctx.lineTo(X0, Y0); ctx.stroke();
            ctx.lineWidth = 4; ctx.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
            ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X0, (Y0 + Y1) / 2); ctx.lineTo(X1, (Y0 + Y1) / 2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(X0 + 4, Y0 + 4, X1 - X0 - 8, 6);
            if (b.neon) { ctx.fillStyle = b.ol; rrect(X0 + 10, Y1 - 28, 46, 18, 4); ctx.fill(); ctx.strokeStyle = b.neon; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X0 + 16, Y1 - 19); ctx.lineTo(X0 + 50, Y1 - 19); ctx.stroke(); }
            return;
        }
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 3; ctx.strokeRect(X0 + 1.5, Y0 + 1.5, X1 - X0 - 3, Y1 - Y0 - 3);
        ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(X0 + 10, Y0 + 10, X1 - X0 - 20, Y1 - Y0 - 20);
        if (b.ac) { ctx.fillStyle = '#6b7488'; ctx.fillRect(X1 - 34, Y0 + 14, 20, 16); ctx.fillStyle = '#59627a'; ctx.fillRect(X1 - 31, Y0 + 17, 14, 10); }
        if (lit) { ctx.fillStyle = 'rgba(255,214,120,.85)'; for (var i = 0; i < b.sky.length; i++) ctx.fillRect(X0 + b.sky[i], Y1 - 16, 7, 5); }
        if (b.neon) {
            ctx.strokeStyle = b.neon; ctx.globalAlpha = 0.35; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(X0 + 8, Y0 + 5); ctx.lineTo(X0 + (X1 - X0) * 0.6, Y0 + 5); ctx.stroke();
            ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.stroke();
        }
    }

    /* Night City: street blocks with sharp corners, street lights, zebra crossings, puddles (slippery) and cones */
    var CITY = {
        id: 'city', name: 'Night City', blurb: 'Puddles, a tram, a gated building site',
        poly: [0, 250, 250, 0, 900, 0, 900, 300, 1200, 300, 1200, 900, 700, 900, 700, 600, 400, 600, 400, 900, 0, 900],
        round: 100, scale: 1.1, start: 0.94,
        phys: { vmax: 340, vgrass: 90, acc: 380, grip: 8, gripOff: 5, coast: 0.7, turn: 3.2, care: 1 },
        col: { bg: '#1a2030', edge: '#3b4253', road: '#4a5266', panel: 'rgba(15,23,42,.72)', mini: '#cbd5e1', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 312, b: 405, hw: 30, vf: 0.85, gate: { at: 0.5, open: 3.6, shut: 3 } }, gate: 'boom',
        pads: [[25, 0.5], [300, -0.5]], picks: [88, 240], padCol: ['#0891b2', '#a5f3fc'],
        prep: function () {
            var i, k, tj = 112;
            this.tram = { j: tj, x: X[tj], y: Y[tj], ux: -Math.sin(A[tj]), uy: Math.cos(A[tj]), tx: Math.cos(A[tj]), ty: Math.sin(A[tj]) };
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
            this.tram.s = -620; this.tram.dir = 1; this.tram.wait = 2;
        },
        paint: function (g) {
            var i, k, p;
            g.fillStyle = '#1a2030'; g.fillRect(0, 0, WW, WH);
            g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2;  /* the back streets */
            for (i = 0; i < WW; i += 180) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, WH); g.stroke(); }
            for (i = 0; i < WH; i += 180) { g.beginPath(); g.moveTo(0, i); g.lineTo(WW, i); g.stroke(); }
            seed = 5;
            var o = { x: 0, y: 0 }, ROOF = ['#3a445e', '#463d5e', '#33495a', '#514148', '#3e483e', '#383d52'], blds = this.blds = [];
            var tr = this.tram;
            function clear(x, y) {  /* away from the roads and from the tram line */
                if (Math.abs((x - tr.x) * tr.tx + (y - tr.y) * tr.ty) < 46) return false;
                o.x = x; o.y = y; nearest(o); return o.dist > HW + 36;
            }
            for (var gx = 0; gx < WW; gx += 180) for (var gy = 0; gy < WH; gy += 180) {  /* one block per street square */
                var w = 110 + rnd() * 50, h = 100 + rnd() * 60, x = gx + 12 + rnd() * (156 - w), y = gy + 12 + rnd() * (156 - h);
                if (!(clear(x, y) && clear(x + w, y) && clear(x, y + h) && clear(x + w, y + h) && clear(x + w / 2, y + h / 2) &&
                      clear(x + w / 2, y) && clear(x + w / 2, y + h) && clear(x, y + h / 2) && clear(x + w, y + h / 2))) continue;
                if (rnd() < 0.16) {  /* a little park */
                    g.fillStyle = '#1d3a2e'; g.fillRect(x, y, w, h);
                    for (k = 0; k < 5; k++) { var tx = x + 18 + rnd() * (w - 36), ty = y + 18 + rnd() * (h - 36); circle(g, tx + 3, ty + 4, 14, 'rgba(0,0,0,.3)'); circle(g, tx, ty, 14, '#2c5a40'); circle(g, tx - 4, ty - 4, 6, '#3b7352'); }
                    continue;
                }
                g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 6, y + 8, w + 10, h + 10);  /* shadow; the building itself stands up in over() */
                g.fillStyle = '#2a3142'; g.fillRect(x, y, w, h);
                var b = { x: x, y: y, w: w, h: h, col: ROOF[Math.floor(rnd() * ROOF.length)], hi: 0.035 + rnd() * 0.05, sky: [], ac: rnd() < 0.5, neon: null };
                for (k = x + 14; k < x + w - 14; k += 14) if (rnd() < 0.55) b.sky.push(k - x);
                if (rnd() < 0.4) b.neon = rnd() < 0.5 ? '#ff4fa3' : '#4fd1ff';
                blds.push(b);
            }
            g.strokeStyle = '#4b5563'; g.lineWidth = 3;  /* tram rails across the top street */
            for (k = -1; k <= 1; k += 2) {
                g.beginPath(); g.moveTo(tr.x - tr.ux * 2000 + tr.tx * k * 11, tr.y - tr.uy * 2000 + tr.ty * k * 11);
                g.lineTo(tr.x + tr.ux * 2000 + tr.tx * k * 11, tr.y + tr.uy * 2000 + tr.ty * k * 11); g.stroke();
            }
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 22, '#5b5148');  /* the building site shortcut: narrow gravel behind a barrier */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#4a423a');
            seed = 13;
            for (i = 1; i < ALT.n - 1; i++) { p = altSide(i, (rnd() - 0.5) * 2 * ALT.hw); circle(g, p.x, p.y, 1.5 + rnd() * 2, 'rgba(255,255,255,.12)'); }
            for (i = 2; i < ALT.n - 2; i += 2) for (k = -1; k <= 1; k += 2) {
                p = altSide(i, k * (ALT.hw + 7));
                g.save(); g.translate(p.x, p.y); g.rotate(ALT.ang[i]); g.fillStyle = i % 4 ? '#f97316' : '#f8fafc'; g.fillRect(-9, -3, 18, 6); g.restore();
            }
            strokeLoop(g, 0, N, 2 * HW + 44, '#3b4253');  /* pavement */
            for (i = 0; i < N; i += 2) for (k = -1; k <= 1; k += 2) { p = side(i, k * (HW + 13)); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(p.x - 1, p.y - 1, 2, 2); }
            strokeLoop(g, 0, N, 2 * HW + 8, '#8e97a8');  /* kerb stones */
            strokeLoop(g, 0, N, 2 * HW, '#272d3b');  /* the road */
            strokeLoop(g, 0, N, 2 * HW - 8, 'rgba(255,255,255,.45)');
            strokeLoop(g, 0, N, 2 * HW - 12, '#272d3b');
            grain(g, 1400, ['rgba(255,255,255,.07)', 'rgba(0,0,0,.25)'], 2.5, 0, HW - 8, 22);
            skids(g, 'rgba(0,0,0,.32)');
            strokeLoop(g, 0, N, 3, '#e8c547', [22, 18]);  /* the yellow middle line */
            g.strokeStyle = '#6b7280'; g.lineWidth = 3;  /* the rails again, over the road */
            for (k = -1; k <= 1; k += 2) {
                g.beginPath(); g.moveTo(tr.x - tr.ux * (HW + 30) + tr.tx * k * 11, tr.y - tr.uy * (HW + 30) + tr.ty * k * 11);
                g.lineTo(tr.x + tr.ux * (HW + 30) + tr.tx * k * 11, tr.y + tr.uy * (HW + 30) + tr.ty * k * 11); g.stroke();
            }
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
            var sp = Math.hypot(c.vx, c.vy), i, q, t = this.tram;
            var cx = t.x + t.ux * t.s, cy = t.y + t.uy * t.s, u = (c.x - cx) * t.ux + (c.y - cy) * t.uy, v = (c.x - cx) * t.tx + (c.y - cy) * t.ty;
            if (Math.abs(u) < 78 + R && Math.abs(v) < 22 + R && c.z <= 0) {  /* the tram pushes you out of its way */
                var push = (v < 0 ? -1 : 1) * (22 + R) - v, vn = c.vx * t.tx + c.vy * t.ty, move = t.wait > 0 ? 0 : 130 * t.dir;
                c.x += t.tx * push; c.y += t.ty * push;
                c.vx += t.ux * move - t.tx * vn * 1.4; c.vy += t.uy * move - t.ty * vn * 1.4;
                if (clock - (c.tramT || -9) > 1) { c.tramT = clock; stat('tram'); spinOut(c, 0.6, 'Ding ding! Mind the tram!'); }
            }
            for (i = 0; i < this.puddles.length; i++) {
                q = this.puddles[i];
                var dx = c.x - q.x, dy = c.y - q.y, ca = Math.cos(q.a), sa = Math.sin(q.a), u = (dx * ca + dy * sa) / q.rx, v = (dy * ca - dx * sa) / q.ry;
                if (u * u + v * v > 1 || sp < 40) continue;
                if (c.slip <= 0) {
                    for (var k = 0; k < 7; k++) puff('drop', c.x, c.y, c.vx * 0.3 + (Math.random() - 0.5) * 160, c.vy * 0.3 + (Math.random() - 0.5) * 160, 0.45, 2 + Math.random() * 2);
                    if (mine(c) && phase === 'race') { sfx(c, 'move'); if (quiet(c, 5)) say('Splash! Slippery!', c); }
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
                sfx(c, 'tap');
            }
        },
        wait: function (c) {  /* the computer cats stop for the tram */
            var t = this.tram, d = (t.j - c.idx + N) % N, p = t.s * t.dir;
            return !c.alt && d > 2 && d < 22 && t.wait < 0.6 && p > -330 && p < 135;
        },
        over: function () {
            var t = this.tram, cx = t.x + t.ux * t.s, cy = t.y + t.uy * t.s, p = t.s * t.dir, on = t.wait < 1.2 && p > -540 && p < 150, k;
            for (k = 0; k < this.blds.length; k++) block(this.blds[k], ['#252c3c', '#1c2230'], 'rgba(255,214,120,.9)');
            for (k = -1; k <= 1; k += 2) {  /* crossing lights that blink while the tram comes */
                var lx = t.x + t.ux * k * (HW + 20) - t.tx * 18 * k, ly = t.y + t.uy * k * (HW + 20) - t.ty * 18 * k;
                if (!vis(lx, ly, 20)) continue;
                var lit = on && Math.floor(clock * 4) % 2 === (k > 0 ? 0 : 1);
                circle(ctx, lx, ly, 7, '#111827'); circle(ctx, lx, ly, 4.2, lit ? '#ef4444' : '#4b1d1d');
                if (lit) circle(ctx, lx, ly, 13, 'rgba(239,68,68,.28)');
            }
            if (!vis(cx, cy, 110)) return;
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(t.uy, t.ux));
            ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(-72, -17, 156, 44, 10); ctx.fill();
            ctx.fillStyle = '#0f766e'; rrect(-78, -22, 156, 44, 10); ctx.fill();
            ctx.fillStyle = '#e2e8f0'; rrect(-70, -12, 140, 24, 6); ctx.fill();
            ctx.fillStyle = '#fde68a';
            for (k = -62; k < 60; k += 20) { ctx.fillRect(k, -17, 12, 3); ctx.fillRect(k, 14, 12, 3); }
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(4, -9); ctx.lineTo(26, 0); ctx.stroke();
            var fx = 74 * t.dir;
            circle(ctx, fx, -13, 3.5, '#fff7c2'); circle(ctx, fx, 13, 3.5, '#fff7c2'); circle(ctx, -fx, -13, 3, '#ef4444'); circle(ctx, -fx, 13, 3, '#ef4444');
            ctx.restore();
        },
        update: function (dt) {
            var t = this.tram;
            if (t.wait > 0) t.wait -= dt;
            else {  /* from far up the street down to its stop inside the block, and back */
                t.s += t.dir * 240 * dt;
                if (t.s >= 330 || t.s <= -620) { t.s = t.s > 0 ? 330 : -620; t.dir = -t.dir; t.wait = 3.2; }
            }
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
        id: 'reef', name: 'Coral Reef', blurb: 'Currents, a turtle, a tunnel with clams',
        ctrl: [200, 320, 480, 180, 760, 230, 900, 370, 1060, 250, 1300, 170, 1560, 260, 1640, 520, 1480, 700, 1250, 640,
               1100, 760, 1180, 980, 980, 1120, 720, 1000, 560, 1120, 300, 1060, 180, 840, 360, 680, 250, 520], scale: 1, start: 0,
        phys: { vmax: 325, vgrass: 135, acc: 310, grip: 4.2, gripOff: 3.2, coast: 0.45, turn: 2.8, care: 1.2 },
        col: { bg: '#3f98ad', edge: '#d9c48e', road: '#ecdcae', panel: 'rgba(255,255,255,.82)' },
        alt: { a: 152, b: 238, hw: 32, vf: 1 }, flow: 120,
        pads: [[70, 0.5], [440, -0.5]], picks: [30, 180], padCol: ['#0d9488', '#ccfbf1'],
        reset: function () { this.turtle.s = -250; this.turtle.dir = 1; this.clams.forEach(function (q) { q.open = 1; }); },
        altGood: function (c) {  /* the smarter cats only go in when neither clam will snap as they pass */
            if (!c.P) return true;
            var s = (ALT.a - c.idx + N) % N, v = Math.max(c.vf, 200) + this.flow, ok = true;
            this.clams.forEach(function (q) { var p = (clock + (s * SP + q.ci * ALT.step) / v + q.off) % 3.6; if (p > 1.95 && p < 2.75) ok = false; });
            return ok;
        },
        prep: function () {
            var i, tj = 345;
            this.clams = [0.33, 0.67].map(function (f, n) {  /* two giant clams in the tunnel, open and shut in turn */
                var ci = Math.round(f * (ALT.n - 1)), q = altSide(ci, n ? 11 : -11);
                return { x: q.x, y: q.y, a: ALT.ang[ci], ci: ci, off: n * 1.7, open: 1 };
            });
            this.turtle = { x0: X[tj], y0: Y[tj], ux: -Math.sin(A[tj]), uy: Math.cos(A[tj]), s: -250, dir: 1 };
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
            blotch(g, ['#2f7f99', '#5bb3c2', '#3a8fa6', '#d8cfa0'], 130, 41, 0.6);
            grain(g, 1200, ['rgba(255,255,255,.12)', 'rgba(10,50,70,.15)'], 4, HW + 30, 0, 42);
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
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 30, '#2a6c80');  /* the current tunnel shortcut: a deep trench */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#4d93a3');
            for (i = 1; i < ALT.n - 1; i += 2) for (k = -1; k <= 1; k += 2) {
                var tp = altSide(i, k * (ALT.hw + 7)); circle(g, tp.x, tp.y, 5 + (i % 3) * 2, (i + k) % 3 ? '#ff7f9e' : '#b88ae6');
            }
            rail(g, HW + 30, 2, null, function (pt, j, sg) {  /* rocks along the sides of the path */
                var r2 = 9 + ((j * 7 + sg * 3) % 5) * 2;
                circle(g, pt.x + 3, pt.y + 5, r2, 'rgba(8,40,60,.25)'); circle(g, pt.x, pt.y, r2, '#6f8f99'); circle(g, pt.x - r2 * 0.3, pt.y - r2 * 0.3, r2 * 0.5, '#8fb0b8');
            });
            road(g, { shadow: [4, 7, 'rgba(8,40,60,.25)'], edgeW: 30, edge: '#d4bd84', rim: '#e3d09c', col: '#eedfb3', crown: 'rgba(255,255,255,.12)' });
            grain(g, 1400, ['rgba(160,130,80,.35)', 'rgba(255,255,255,.5)'], 3, 0, HW - 4, 43);
            g.strokeStyle = 'rgba(170,140,90,.3)'; g.lineWidth = 2;  /* ripples in the sand */
            seed = 44;
            for (i = 0; i < N; i += 2) { var rp = side(i, (rnd() - 0.5) * 1.6 * HW), ra = A[i] + 1.3; g.beginPath(); g.moveTo(rp.x - Math.cos(ra) * 10, rp.y - Math.sin(ra) * 10); g.quadraticCurveTo(rp.x + Math.cos(ra - 0.6) * 4, rp.y + Math.sin(ra - 0.6) * 4, rp.x + Math.cos(ra) * 10, rp.y + Math.sin(ra) * 10); g.stroke(); }
            this.zones.forEach(function (z) { strokeLoop(g, z.i0, z.i1, 2 * HW, z.side ? 'rgba(80,190,235,.3)' : 'rgba(120,230,200,.32)', []); });
            for (i = 0; i < N; i += 3) for (k = -1; k <= 1; k += 2) {  /* shells along both edges */
                var p = side(i, k * (HW + 1)); circle(g, p.x, p.y, 3.3, (i / 3) % 2 ? '#fff8e7' : '#f9c6d9');
            }
            strokeLoop(g, 0, N, 2, 'rgba(150,120,70,.35)', [14, 22]);
        },
        effect: function (c, dt) {
            for (var i = 0; i < 3; i++) {  /* the water carries the kart, so steer against it */
                var z = this.zones[i];
                if (!inZone(c.idx, z) || c.dist > HW + 70 || c.alt) continue;
                var a = A[c.idx], d0 = (c.idx - z.i0 + N) % N, e = Math.min(1, Math.min(d0, z.i1 - z.i0 - d0) / 6 + 0.2);  /* weaker at the ends */
                var fx = z.side ? -Math.sin(a) * z.side : Math.cos(a), fy = z.side ? Math.cos(a) * z.side : Math.sin(a);
                c.x += fx * z.f * e * dt; c.y += fy * z.f * e * dt;
            }
            if (c.alt && c.ai > 0 && c.ai < ALT.n - 1) {  /* the tunnel current carries you forward */
                var fa = ALT.ang[c.ai]; c.x += Math.cos(fa) * this.flow * dt; c.y += Math.sin(fa) * this.flow * dt;
            }
            var t = this.turtle, tx = t.x0 + t.ux * t.s, ty = t.y0 + t.uy * t.s, ex = c.x - tx, ey = c.y - ty, ed = Math.hypot(ex, ey);
            if (ed < 30 + R && ed > 0.1) {  /* bumping into the turtle */
                var vn = (c.vx * ex + c.vy * ey) / ed;
                c.x = tx + ex / ed * (30 + R); c.y = ty + ey / ed * (30 + R);
                if (vn < 0) { c.vx -= ex / ed * vn * 1.5; c.vy -= ey / ed * vn * 1.5; }
                if (clock - (c.turtleT || -9) > 1) {
                    c.turtleT = clock; stat('turtle');
                    sfx(c, 'hit'); if (quiet(c, 3)) say('Oops, sorry Mr Turtle!', c);
                }
            }
            c.bt = (c.bt || 0) - dt;
            if (c.thr > 0 && c.bt <= 0 && vis(c.x, c.y, 40)) {  /* bubbles from the exhaust */
                c.bt = 0.12;
                puff('bub', c.x - Math.cos(c.a) * 17, c.y - Math.sin(c.a) * 17, -c.vx * 0.1 + (Math.random() - 0.5) * 20, -c.vy * 0.1 + (Math.random() - 0.5) * 20, 1.1, 2 + Math.random() * 2.5);
            }
        },
        update: function (dt) {
            var t = this.turtle;
            t.s += t.dir * 42 * dt;
            if (Math.abs(t.s) > 260) { t.s = 260 * t.dir; t.dir = -t.dir; }
            this.clams.forEach(function (q) {
                var p = (clock + q.off) % 3.6, was = q.open;
                q.open = p < 2.3 ? Math.min(1, p / 0.3) : p < 2.42 ? 1 - (p - 2.3) / 0.12 : 0;
                q.warn = p > 1.8 && p < 2.3;
                if (was > 0.5 && q.open <= 0.5 && phase !== 'pick' && !remote) karts.forEach(function (c) {
                    if (c.z <= 0 && Math.hypot(c.x - q.x, c.y - q.y) < 28) { stat('clam'); spinOut(c, 0.9, 'A clam nipped your tail!', 0); }
                });
            });
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
            ctx.strokeStyle = 'rgba(235,252,255,.7)'; ctx.beginPath();  /* the tunnel current */
            var fs = (clock * 2.5) % 3;
            for (k = 1; k < ALT.n - 4; k += 3) {
                var pos = k + fs, a0 = Math.floor(pos), uu = pos - a0, ax = ALT.x[a0] + (ALT.x[a0 + 1] - ALT.x[a0]) * uu, ay = ALT.y[a0] + (ALT.y[a0 + 1] - ALT.y[a0]) * uu;
                if (!vis(ax, ay, 20)) continue;
                var aa = ALT.ang[a0], dc = Math.cos(aa), ds = Math.sin(aa);
                ctx.moveTo(ax - dc * 6 - ds * 9, ay - ds * 6 + dc * 9); ctx.lineTo(ax, ay); ctx.lineTo(ax - dc * 6 + ds * 9, ay - ds * 6 - dc * 9);
            }
            ctx.stroke();
            this.clams.forEach(function (q) {  /* giant clams: the top shell folds back when open */
                if (!vis(q.x, q.y, 40)) return;
                ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a + (q.warn ? Math.sin(clock * 40) * 0.08 : 0));
                ctx.fillStyle = 'rgba(8,40,60,.25)'; ctx.beginPath(); ctx.ellipse(3, 5, 24, 18, 0, 0, 7); ctx.fill();
                ctx.fillStyle = '#d9c2e9'; ctx.strokeStyle = '#6b4a8a'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
                if (q.open > 0.05) { circle(ctx, 2, 0, 13 * q.open, '#fbe7f3'); circle(ctx, 4, 0, 5.5 * q.open, '#ffffff'); circle(ctx, 2.5, -1.5, 1.8 * q.open, '#e0f2fe'); }
                ctx.save(); ctx.translate(-q.open * 20, 0); ctx.scale(1 - q.open * 0.72, 1);
                ctx.fillStyle = '#c4a5dd'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = 'rgba(107,74,138,.6)'; ctx.lineWidth = 1.2;
                for (var r = -2; r <= 2; r++) { ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(18, r * 6.5); ctx.stroke(); }
                ctx.restore(); ctx.restore();
            });
            var tt = this.turtle, ttx = tt.x0 + tt.ux * tt.s, tty = tt.y0 + tt.uy * tt.s;
            if (vis(ttx, tty, 60)) {  /* the sea turtle, paddling slowly across */
                var fl = Math.sin(clock * 3) * 0.4, sd;
                ctx.save(); ctx.translate(ttx, tty); ctx.rotate(Math.atan2(tt.uy * tt.dir, tt.ux * tt.dir));
                ctx.fillStyle = 'rgba(8,40,60,.22)'; ctx.beginPath(); ctx.ellipse(6, 9, 32, 25, 0, 0, 7); ctx.fill();
                ctx.fillStyle = '#7bbf6a';
                for (sd = -1; sd <= 1; sd += 2) {
                    ctx.save(); ctx.translate(12, sd * 18); ctx.rotate(sd * (0.5 + fl)); ctx.beginPath(); ctx.ellipse(7, 0, 15, 6, 0, 0, 7); ctx.fill(); ctx.restore();
                    ctx.save(); ctx.translate(-16, sd * 15); ctx.rotate(sd * (-0.6 - fl * 0.6)); ctx.beginPath(); ctx.ellipse(-4, 0, 9, 5, 0, 0, 7); ctx.fill(); ctx.restore();
                }
                circle(ctx, 31, 0, 9, '#8fcf7c'); circle(ctx, 35, -4, 1.7, '#0f172a'); circle(ctx, 35, 4, 1.7, '#0f172a');
                ctx.fillStyle = '#6b4f2a'; ctx.strokeStyle = '#3f2d14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 26, 21, 0, 0, 7); ctx.fill(); ctx.stroke();
                circle(ctx, 0, 0, 8, '#9a7740');
                for (sd = 0; sd < 6; sd++) circle(ctx, Math.cos(sd * 1.047) * 15, Math.sin(sd * 1.047) * 12, 5, '#8a6a3a');
                ctx.restore();
            }
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
            ctx.lineCap = 'round';
            for (var ai = 4; ai < ALT.n - 4; ai += 7) {  /* coral arches over the tunnel */
                var a1 = altSide(ai, -ALT.hw - 10), a2 = altSide(ai, ALT.hw + 10);
                if (!vis(a1.x, a1.y, 90)) continue;
                ctx.strokeStyle = 'rgba(255,127,158,.78)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(a1.x, a1.y);
                ctx.quadraticCurveTo((a1.x + a2.x) / 2 + 8, (a1.y + a2.y) / 2 - 14, a2.x, a2.y); ctx.stroke();
                ctx.strokeStyle = 'rgba(255,214,226,.6)'; ctx.lineWidth = 3; ctx.stroke();
            }
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
