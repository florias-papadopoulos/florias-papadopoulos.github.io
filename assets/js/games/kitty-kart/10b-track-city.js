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
        if (lit) {  /* with b.fl set (a phase), windows go dark and light up again now and then */
            ctx.fillStyle = 'rgba(255,214,120,.85)';
            for (var i = 0; i < b.sky.length; i++) if (b.fl === undefined || Math.sin(clock * 0.35 + i * 2.3 + b.fl) < 0.8) ctx.fillRect(X0 + b.sky[i], Y1 - 16, 7, 5);
        }
        if (b.neon) {  /* with b.fl set, the neon flickers now and then */
            var na = b.fl === undefined ? 1 : flick(b.fl);
            ctx.strokeStyle = b.neon; ctx.globalAlpha = 0.35 * na; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(X0 + 8, Y0 + 5); ctx.lineTo(X0 + (X1 - X0) * 0.6, Y0 + 5); ctx.stroke();
            ctx.globalAlpha = na; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
        }
    }
    function flick(p) { var t = (clock + p) % 9; return t < 0.6 && Math.sin(t * 70) > 0 ? 0.2 : 1; }  /* a neon sign: on, with a short stutter every 9 s */


    /* Night City: street blocks with sharp corners, street lights, zebra crossings, puddles (slippery) and cones; a hairpin
       round a block, a jog with two 45 degree bends, a tram on the long street; traffic lights, cars on the back streets,
       pigeons and a neon billboard */
    var CITY = {
        id: 'city', name: 'Night City', blurb: 'Puddles, a tram, a gated building site',
        poly: [0, 300, 300, 0, 1000, 0, 1000, 380, 1300, 380, 1300, 0, 1650, 0, 1800, 150, 1800, 1100, 1300, 1100, 1300, 650,
               1050, 650, 1050, 1100, 620, 1100, 480, 960, 300, 960, 160, 1100, 0, 1100],
        round: 100, scale: 1, start: 0.95,
        phys: { vmax: 340, vgrass: 90, acc: 380, grip: 8, gripOff: 5, coast: 0.7, turn: 3.2, care: 1 },
        col: { bg: '#1a2030', edge: '#3b4253', road: '#4a5266', panel: 'rgba(15,23,42,.72)', mini: '#cbd5e1', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 98, b: 170, hw: 30, vf: 0.85, gate: { at: 0.5, open: 3.6, shut: 3 } }, gate: 'boom',
        pads: [[20, 0.5], [252, -0.5], [392, 0.5]], picks: [70, 288, 410], padCol: ['#0891b2', '#a5f3fc'],
        prep: function () {
            var i, k, tj = 222;
            this.tram = { j: tj, x: X[tj], y: Y[tj], ux: -Math.sin(A[tj]), uy: Math.cos(A[tj]), tx: Math.cos(A[tj]), ty: Math.sin(A[tj]) };
            seed = 21;
            this.puddles = [];
            var fr = [0.13, 0.3, 0.46, 0.6, 0.77, 0.9];
            for (i = 0; i < fr.length; i++) {
                var j = ix(Math.round(fr[i] * N) + Math.round(rnd() * 8)), p = side(j, (rnd() - 0.5) * HW);
                this.puddles.push({ x: p.x, y: p.y, a: A[j] + (rnd() - 0.5) * 0.6, rx: 30 + rnd() * 10, ry: 17 + rnd() * 6 });
            }
            this.cross = [straightNear(0.06, -6, 6, 0.002), straightNear(0.4, -6, 6, 0.002), straightNear(0.55, -6, 6, 0.002), straightNear(0.84, -6, 6, 0.002)];
            this.cones = []; this.lights = [];
            for (i = 0; i < N; i++) {  /* a pair of cones on the inside of every corner: cut it and they fly; a traffic light outside */
                if (Math.abs(K[i]) < 0.006 || Math.abs(K[(i + N - 1) % N]) >= 0.006) continue;
                for (k = i; Math.abs(K[k % N]) >= 0.006 && k < i + N; k++);
                var mid = Math.round((i + k) / 2), sg = K[ix(mid)] > 0 ? 1 : -1, q;
                for (var c = -1; c <= 1; c += 2) {
                    q = side(mid + c * 3, sg * (HW + 4));
                    this.cones.push({ x0: q.x, y0: q.y });
                }
                if (k - i > 6) { q = side(mid, -sg * (HW + 30)); this.lights.push({ x: q.x, y: q.y, ph: this.lights.length * 2.7 }); }
            }
            var tr = this.tram, o = { x: 0, y: 0 }, runs = [];
            function ok(x, y) { o.x = x; o.y = y; nearest(o); return o.dist > HW + 70 && Math.abs((x - tr.x) * tr.tx + (y - tr.y) * tr.ty) > 60; }
            function line(x0, y0, dx, dy, n) {  /* back street runs that stay clear of the race */
                var s = -1;
                for (var t = 0; t <= n; t++) {
                    var good = t < n && ok(x0 + dx * t, y0 + dy * t);
                    if (good && s < 0) s = t;
                    if (!good && s >= 0) { if ((t - 1 - s) * 24 >= 300) runs.push({ x0: x0 + dx * s, y0: y0 + dy * s, x1: x0 + dx * (t - 1), y1: y0 + dy * (t - 1), L: (t - 1 - s) * 24 }); s = -1; }
                }
            }
            for (var gx = 180; gx < WW; gx += 180) line(gx, 0, 0, 24, Math.floor(WH / 24));
            for (var gy = 180; gy < WH; gy += 180) line(0, gy, 24, 0, Math.floor(WW / 24));
            runs.sort(function (a, b) { return b.L - a.L; });
            var CARS = ['#ef4444', '#f8fafc', '#facc15', '#38bdf8', '#a3e635', '#f472b6'];
            this.cars = runs.slice(0, 18).map(function (r, n) { return { r: r, sp: 70 + rnd() * 60, off: rnd() * 2 * r.L, col: CARS[n % CARS.length] }; });
            this.fans = fanRow(466, 490, -(HW + 30), 2, ['#ff4fa3', '#4fd1ff', '#facc15'], 51).concat(fanRow(470, 488, HW + 30, 1, ['#ff4fa3', '#4fd1ff'], 52));
            this.birds = flock(12, HW + 26, HW + 56, 53);
            var bb = side(392, HW + 96);
            this.board = { x: bb.x, y: bb.y, a: A[392] };
        },
        reset: function () {
            this.cones.forEach(function (c) { c.x = c.x0; c.y = c.y0; c.vx = c.vy = c.va = 0; c.a = 0.3; c.hit = -9; });
            this.tram.s = -560; this.tram.dir = 1; this.tram.wait = 2;
        },
        paint: function (g) {
            var i, k, p;
            g.fillStyle = '#1a2030'; g.fillRect(0, 0, WW, WH);
            g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2;  /* the back streets */
            for (i = 0; i < WW; i += 180) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, WH); g.stroke(); }
            for (i = 0; i < WH; i += 180) { g.beginPath(); g.moveTo(0, i); g.lineTo(WW, i); g.stroke(); }
            g.strokeStyle = 'rgba(255,255,255,.06)'; g.setLineDash([10, 14]);  /* lane marks on the back streets the cars use */
            this.cars.forEach(function (c) { g.beginPath(); g.moveTo(c.r.x0, c.r.y0); g.lineTo(c.r.x1, c.r.y1); g.stroke(); });
            g.setLineDash([]);
            seed = 5;
            var o = { x: 0, y: 0 }, ROOF = ['#3a445e', '#463d5e', '#33495a', '#514148', '#3e483e', '#383d52'], blds = this.blds = [];
            var tr = this.tram, bd = this.board;
            function clear(x, y) {  /* away from the roads, the tram line and the billboard */
                if (Math.abs((x - tr.x) * tr.tx + (y - tr.y) * tr.ty) < 46) return false;
                if (Math.hypot(x - bd.x, y - bd.y) < 110) return false;
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
                var b = { x: x, y: y, w: w, h: h, col: ROOF[Math.floor(rnd() * ROOF.length)], hi: 0.035 + rnd() * 0.05, sky: [], ac: rnd() < 0.5, neon: null, fl: rnd() * 9 };
                for (k = x + 14; k < x + w - 14; k += 14) if (rnd() < 0.55) b.sky.push(k - x);
                if (rnd() < 0.4) b.neon = rnd() < 0.5 ? '#ff4fa3' : '#4fd1ff';
                blds.push(b);
            }
            g.strokeStyle = '#4b5563'; g.lineWidth = 3;  /* tram rails across the long street, out to the stop */
            for (k = -1; k <= 1; k += 2) {
                g.beginPath(); g.moveTo(tr.x - tr.ux * 2000 + tr.tx * k * 11, tr.y - tr.uy * 2000 + tr.ty * k * 11);
                g.lineTo(tr.x + tr.ux * 420 + tr.tx * k * 11, tr.y + tr.uy * 420 + tr.ty * k * 11); g.stroke();
            }
            p = { x: tr.x + tr.ux * 400, y: tr.y + tr.uy * 400 };  /* the tram stop at the end of the line */
            g.save(); g.translate(p.x, p.y); g.rotate(Math.atan2(tr.uy, tr.ux));
            g.fillStyle = '#3b4253'; g.fillRect(-60, 24, 90, 18); g.fillStyle = '#5b6478'; g.fillRect(-50, 30, 70, 6); g.fillStyle = '#e8c547'; g.fillRect(24, 26, 5, 5);
            g.restore();
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
            grain(g, 2000, ['rgba(255,255,255,.07)', 'rgba(0,0,0,.25)'], 2.5, 0, HW - 8, 22);
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
                var dx = c.x - q.x, dy = c.y - q.y, ca = Math.cos(q.a), sa = Math.sin(q.a), u2 = (dx * ca + dy * sa) / q.rx, v2 = (dy * ca - dx * sa) / q.ry;
                if (u2 * u2 + v2 * v2 > 1 || sp < 40) continue;
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
            var t = this.tram, cx = t.x + t.ux * t.s, cy = t.y + t.uy * t.s, p = t.s * t.dir, on = t.wait < 1.2 && p > -500 && p < 150, k, q;
            for (k = 0; k < this.blds.length; k++) block(this.blds[k], ['#252c3c', '#1c2230'], 'rgba(255,214,120,.9)');
            for (k = -1; k <= 1; k += 2) {  /* crossing lights that blink while the tram comes */
                var lx = t.x + t.ux * k * (HW + 20) - t.tx * 18 * k, ly = t.y + t.uy * k * (HW + 20) - t.ty * 18 * k;
                if (!vis(lx, ly, 20)) continue;
                var lit = on && Math.floor(clock * 4) % 2 === (k > 0 ? 0 : 1);
                circle(ctx, lx, ly, 7, '#111827'); circle(ctx, lx, ly, 4.2, lit ? '#ef4444' : '#4b1d1d');
                if (lit) circle(ctx, lx, ly, 13, 'rgba(239,68,68,.28)');
            }
            for (k = 0; k < this.lights.length; k++) {  /* traffic lights on the corners: green, amber, red, round and round */
                q = this.lights[k];
                if (!vis(q.x, q.y, 40)) continue;
                var ph = (clock + q.ph) % 8, st = ph < 3.5 ? 2 : ph < 4.6 ? 1 : 0, hx = liftX(q.x, 0.07), hy = liftY(q.y, 0.07);
                ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(hx, hy); ctx.stroke();
                ctx.fillStyle = '#111827'; rrect(hx - 6, hy - 16, 12, 30, 4); ctx.fill();
                for (var l = 0; l < 3; l++) {
                    var lc = ['#ef4444', '#f59e0b', '#22c55e'][l];
                    circle(ctx, hx, hy - 9 + l * 9, 3.3, l === st ? lc : 'rgba(255,255,255,.12)');
                    if (l === st) { ctx.globalAlpha = 0.3; circle(ctx, hx, hy - 9 + l * 9, 9, lc); ctx.globalAlpha = 1; }
                }
            }
            q = this.board;
            if (vis(q.x, q.y, 140)) {  /* a neon billboard on two posts, bulbs chasing round its frame */
                var bx = liftX(q.x, 0.1), by = liftY(q.y, 0.1), ca = Math.cos(q.a), sa = Math.sin(q.a);
                ctx.strokeStyle = '#0b0f19'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.moveTo(q.x - ca * 50, q.y - sa * 50); ctx.lineTo(bx - ca * 50, by - sa * 50); ctx.moveTo(q.x + ca * 50, q.y + sa * 50); ctx.lineTo(bx + ca * 50, by + sa * 50); ctx.stroke();
                ctx.save(); ctx.translate(bx, by); ctx.rotate(q.a + Math.PI);
                ctx.fillStyle = '#0f172a'; rrect(-86, -26, 172, 52, 8); ctx.fill();
                ctx.globalAlpha = flick(3.3); ctx.font = '800 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ff4fa3'; ctx.fillText(DOG ? 'WOOF ST.' : 'MEOW ST.', 0, -1);
                ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
                for (k = 0; k < 24; k++) {
                    var e = k < 8 ? [-80 + k * 22.8, -22] : k < 12 ? [80, -22 + (k - 8) * 14.7] : k < 20 ? [80 - (k - 12) * 22.8, 22] : [-80, 22 - (k - 20) * 14.7];
                    circle(ctx, e[0], e[1], 2.6, (k + Math.floor(clock * 10)) % 4 ? '#7c5a10' : '#fde68a');
                }
                ctx.restore();
            }
            drawFlock(this.birds, ['#94a3b8', '#cbd5e1'], '#94a3b8');
            drawFans(this.fans, function (f, fx, fy) {  /* glow sticks */
                if (!f.flag) return;
                ctx.strokeStyle = f.flag; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(clock * 6 + f.ph);
                ctx.beginPath(); ctx.moveTo(fx - 7, fy - 9); ctx.lineTo(fx - 3, fy - 15); ctx.stroke(); ctx.globalAlpha = 1;
            });
            if (!vis(cx, cy, 110)) return;
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(t.uy, t.ux));
            ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(-72, -17, 156, 44, 10); ctx.fill();
            ctx.fillStyle = '#0f766e'; rrect(-78, -22, 156, 44, 10); ctx.fill();
            ctx.fillStyle = '#e2e8f0'; rrect(-70, -12, 140, 24, 6); ctx.fill();
            ctx.fillStyle = '#fde68a';
            for (k = -62; k < 60; k += 20) { ctx.fillRect(k, -17, 12, 3); ctx.fillRect(k, 14, 12, 3); }
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(4, -9); ctx.lineTo(26, 0); ctx.stroke();
            if (t.wait <= 0 && Math.floor(clock * 6) % 2) { ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(8, -16); ctx.lineTo(2, -20); ctx.stroke(); }  /* sparks off the wire */
            var fx = 74 * t.dir;
            circle(ctx, fx, -13, 3.5, '#fff7c2'); circle(ctx, fx, 13, 3.5, '#fff7c2'); circle(ctx, -fx, -13, 3, '#ef4444'); circle(ctx, -fx, 13, 3, '#ef4444');
            ctx.restore();
        },
        update: function (dt) {
            var t = this.tram;
            if (t.wait > 0) t.wait -= dt;
            else {  /* from far up the street down to its stop inside the block, and back */
                t.s += t.dir * 240 * dt;
                if (t.s >= 330 || t.s <= -560) { t.s = t.s > 0 ? 330 : -560; t.dir = -t.dir; t.wait = 3.2; }
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
            for (i = 0; i < this.cars.length; i++) {  /* cars cruising the back streets, back and forth, keeping to the right */
                c = this.cars[i];
                var r = c.r, u = (clock * c.sp + c.off) % (2 * r.L), d = u < r.L ? u : 2 * r.L - u, f = d / r.L;
                var x = r.x0 + (r.x1 - r.x0) * f, y = r.y0 + (r.y1 - r.y0) * f;
                if (!vis(x, y, 60)) continue;
                ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(r.y1 - r.y0, r.x1 - r.x0) + (u < r.L ? 0 : Math.PI)); ctx.translate(0, 7);
                ctx.fillStyle = 'rgba(255,240,190,.16)'; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(60, -16); ctx.lineTo(60, 16); ctx.lineTo(10, 4); ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,.4)'; rrect(-10, -4, 23, 12, 3); ctx.fill();
                ctx.fillStyle = c.col; rrect(-12, -6, 23, 12, 3); ctx.fill();
                ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(1, -4, 5, 8); ctx.fillRect(-8, -4, 3, 8);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(-12, -5, 2, 3); ctx.fillRect(-12, 2, 2, 3);
                ctx.restore();
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
        },
        thumbDeco: function (g) {  /* the back street cars as dots of light */
            this.cars.forEach(function (c) { circle(g, (c.r.x0 + c.r.x1) / 2, (c.r.y0 + c.r.y1) / 2, 26, c.col); });
        }
    };
