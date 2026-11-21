    /* Coral Reef: a winding sand path on the sea floor, floaty handling and currents that carry you; a long sweeper, a
       hairpin round a coral rock, a wiggle and a bulge the current tunnel cuts across; fish schools, crabs, jellyfish, a
       manta ray, a sunken ship, a treasure chest and diver cats cheering at the start */
    var REEF = {
        id: 'reef', name: 'Coral Reef', blurb: 'Currents, a turtle, a tunnel with clams',
        ctrl: [300, 380, 650, 210, 1050, 240, 1450, 160, 1820, 260, 1990, 520, 1880, 760, 1560, 700, 1280, 760, 1240, 920,
               1460, 1000, 1780, 1000, 1960, 1180, 1820, 1420, 1460, 1440, 1170, 1300, 900, 1440, 640, 1320, 430, 1450, 180, 1400,
               30, 1150, 60, 850, 250, 600], scale: 1, start: 0,
        phys: { vmax: 325, vgrass: 135, acc: 310, grip: 4.2, gripOff: 3.2, coast: 0.45, turn: 2.8, care: 1.2 },
        col: { bg: '#3f98ad', edge: '#d9c48e', road: '#ecdcae', panel: 'rgba(255,255,255,.82)' },
        alt: { a: 400, b: 462, hw: 32, vf: 1, via: [[430, 330, 0.25]] }, flow: 120,
        pads: [[22, 0.5], [236, -0.4], [432, 0.5]], picks: [40, 175, 335], padCol: ['#0d9488', '#ccfbf1'],
        reset: function () { this.turtle.s = -250; this.turtle.dir = 1; this.clams.forEach(function (q) { q.open = 1; }); },
        altGood: function (c) {  /* the smarter cats only go in when neither clam will snap as they pass */
            if (!c.P) return true;
            var s = (ALT.a - c.idx + N) % N, v = Math.max(c.vf, 200) + this.flow, ok = true;
            this.clams.forEach(function (q) { var p = (clock + (s * SP + q.ci * ALT.step) / v + q.off) % 3.6; if (p > 1.95 && p < 2.75) ok = false; });
            return ok;
        },
        prep: function () {
            var i, tj = 60;
            this.clams = [0.33, 0.67].map(function (f, n) {  /* two giant clams in the tunnel, open and shut in turn */
                var ci = Math.round(f * (ALT.n - 1)), q = altSide(ci, n ? 11 : -11);
                return { x: q.x, y: q.y, a: ALT.ang[ci], ci: ci, off: n * 1.7, open: 1 };
            });
            this.turtle = { x0: X[tj], y0: Y[tj], ux: -Math.sin(A[tj]), uy: Math.cos(A[tj]), s: -250, dir: 1 };
            this.zones = [  /* side: push to the right (1) or left (-1) of the track; 0: a stream along the track */
                { i0: Math.round(0.2 * N), side: 1, f: 62 },
                { i0: Math.round(0.44 * N), side: 0, f: 85 },
                { i0: Math.round(0.66 * N), side: -1, f: 62 }];
            this.zones.forEach(function (z) { z.i1 = z.i0 + 30; });
            seed = 33;
            var kelp = this.kelp = [], fish = this.fish = [], vents = this.vents = [];
            scatter(260, HW + 46, function (x, y, k) { if (kelp.length < 72) kelp.push({ x: x, y: y, len: 40 + (k % 5) * 9, ph: k * 1.3 }); });
            scatter(50, HW + 60, function (x, y) { if (vents.length < 10) vents.push({ x: x, y: y, t: 0 }); });
            var FC = ['#ffb347', '#ff6f91', '#ffe066', '#7ad7f0', '#c49bff'];
            for (i = 0; i < 20; i++) fish.push({ x: rnd() * WW, y: rnd() * WH, a: rnd() * 7, sp: 40 + rnd() * 40, s: 0.8 + rnd() * 0.6, col: FC[i % FC.length], ph: rnd() * 7 });
            seed = 35;
            var sp = spots(2, 500, 250);
            this.ship = sp[0]; this.chest = sp[1];
            if (this.ship) vents.push({ x: this.ship.x + 30, y: this.ship.y - 10, t: 0 });
            if (this.chest) vents.push({ x: this.chest.x, y: this.chest.y - 8, t: 0 });
            this.schools = [];  /* schools of little fish circling by the road; they scatter when a kart comes */
            for (i = 0; i < 5; i++) {
                var sj = Math.round((i + 0.3) * N / 5), sq = side(sj, (i % 2 ? 1 : -1) * (HW + 170)), mem = [];
                for (var m = 0; m < 11; m++) mem.push({ x: (rnd() - 0.5) * 60, y: (rnd() - 0.5) * 40, ph: rnd() * 7 });
                this.schools.push({ x: sq.x, y: sq.y, ph: rnd() * 7, dir: i % 2 ? 1 : -1, col: FC[(i + 2) % FC.length], m: mem, sc: 0 });
            }
            this.crabs = flock(10, HW + 34, HW + 70, 36);  /* little crabs on the sand by the path; they dig in when a kart comes */
            this.crabs.forEach(function (q) { q.h = 0; });
            var jel = this.jelly = [];
            scatter(40, HW + 90, function (x, y, k) { if (jel.length < 8) jel.push({ x: x, y: y, ph: k * 1.9, col: k % 2 ? '#f0abfc' : '#a5f3fc' }); });
            this.fans = fanRow(466, 490, -(HW + 30), 2, ['#ff7f9e', '#ffd166', '#7ad7f0'], 37);
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
            var sh = this.ship;
            if (sh) {  /* a sunken ship lying on its side, half in the sand, weed on its deck */
                g.save(); g.translate(sh.x, sh.y); g.rotate(-0.4);
                g.fillStyle = 'rgba(8,40,60,.3)'; g.beginPath(); g.ellipse(12, 16, 150, 52, 0, 0, 7); g.fill();
                g.fillStyle = '#5b3a24'; g.beginPath(); g.moveTo(-140, -10); g.quadraticCurveTo(-120, -48, 0, -46); g.lineTo(120, -40); g.quadraticCurveTo(156, 0, 120, 40); g.lineTo(0, 46); g.quadraticCurveTo(-120, 48, -140, 10); g.closePath(); g.fill();
                g.fillStyle = '#7a5236'; g.beginPath(); g.ellipse(-6, 0, 118, 32, 0, 0, 7); g.fill();
                g.strokeStyle = '#5b3a24'; g.lineWidth = 3;
                for (k = -100; k <= 90; k += 18) { g.beginPath(); g.moveTo(k, -30); g.lineTo(k, 30); g.stroke(); }
                g.fillStyle = '#2f1f14'; g.fillRect(-40, -12, 26, 24); circle(g, 60, 0, 10, '#2f1f14');
                g.strokeStyle = '#6b4a2e'; g.lineWidth = 9; g.beginPath(); g.moveTo(20, 0); g.lineTo(180, 70); g.stroke();  /* the broken mast */
                g.fillStyle = 'rgba(235,225,200,.55)'; g.beginPath(); g.moveTo(110, 30); g.lineTo(170, 58); g.lineTo(120, 92); g.fill();
                g.strokeStyle = '#2f8f5b'; g.lineWidth = 4;
                for (k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-90 + k * 34, -28); g.quadraticCurveTo(-80 + k * 34, -50, -96 + k * 34, -66); g.stroke(); }
                g.restore();
            }
            if (this.chest) { g.fillStyle = 'rgba(240,225,180,.55)'; g.beginPath(); g.ellipse(this.chest.x, this.chest.y + 4, 62, 34, 0, 0, 7); g.fill(); }
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
            this.schools.forEach(function (q) {
                var k = kartWithin(q.x + Math.cos(clock * 0.35 * q.dir + q.ph) * 120, q.y + Math.sin(clock * 0.35 * q.dir + q.ph) * 80, 200);
                q.sc = k ? Math.min(1, q.sc + dt * 4) : Math.max(0, q.sc - dt * 0.4);
            });
            this.crabs.forEach(function (q) { q.h = kartWithin(q.x, q.y, 120) ? Math.min(1, q.h + dt * 6) : Math.max(0, q.h - dt * 0.6); });
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
            this.floor();
        },
        floor: function () {  /* things on the sea floor, drawn under the karts: crabs and the treasure chest */
            var i, q, k;
            for (i = 0; i < this.crabs.length; i++) {
                q = this.crabs[i];
                if (!vis(q.x, q.y, 30)) continue;
                var cx = q.x + Math.sin(clock * 1.3 + q.ph) * 14 * (1 - q.h), cy = q.y;
                if (q.h > 0.8) { circle(ctx, cx, cy, 7, 'rgba(160,130,80,.5)'); circle(ctx, cx - 3, cy - 2, 1.6, '#0f172a'); circle(ctx, cx + 3, cy - 2, 1.6, '#0f172a'); continue; }
                ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                var lg = Math.sin(clock * 16 + q.ph) * 2;
                for (k = -1; k <= 1; k += 2) {
                    ctx.beginPath(); ctx.moveTo(cx + k * 5, cy); ctx.lineTo(cx + k * 11, cy + 3 + lg * k); ctx.moveTo(cx + k * 5, cy + 2); ctx.lineTo(cx + k * 10, cy + 7 - lg * k); ctx.stroke();
                    circle(ctx, cx + k * 9, cy - 6, 3.2, '#ea580c');
                }
                circle(ctx, cx, cy, 7 * (1 - q.h * 0.3), '#f97316'); circle(ctx, cx - 2.5, cy - 4, 1.6, '#0f172a'); circle(ctx, cx + 2.5, cy - 4, 1.6, '#0f172a');
            }
            q = this.chest;
            if (q && vis(q.x, q.y, 60)) {  /* a treasure chest that opens now and then: gold glints inside */
                var p = (clock * 0.25) % 1, op = p < 0.45 ? Math.min(1, p / 0.08) : Math.max(0, 1 - (p - 0.45) / 0.08);
                ctx.fillStyle = 'rgba(8,40,60,.25)'; ctx.fillRect(q.x - 26, q.y - 10, 58, 34);
                ctx.fillStyle = '#7c4a1e'; ctx.fillRect(q.x - 30, q.y - 14, 60, 30); ctx.fillStyle = '#facc15'; ctx.fillRect(q.x - 30, q.y - 2, 60, 4);
                if (op > 0.05) {
                    circle(ctx, q.x - 10, q.y - 14, 8, '#fde047'); circle(ctx, q.x + 6, q.y - 16, 7, '#facc15'); circle(ctx, q.x + 16, q.y - 12, 5, '#fde68a');
                    if (Math.sin(clock * 9) > 0.3) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x - 2, q.y - 26); ctx.lineTo(q.x - 2, q.y - 16); ctx.moveTo(q.x - 7, q.y - 21); ctx.lineTo(q.x + 3, q.y - 21); ctx.stroke(); }
                }
                ctx.fillStyle = '#92400e'; ctx.fillRect(q.x - 30, q.y - 14 - 20 * op, 60, 12 + 8 * (1 - op));
                ctx.fillStyle = '#facc15'; ctx.fillRect(q.x - 4, q.y - 12 - 20 * op, 8, 7);
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
            for (i = 0; i < this.schools.length; i++) {  /* schools of fish, circling, scattering when a kart comes */
                var sc = this.schools[i], an = clock * 0.35 * sc.dir + sc.ph, ox = sc.x + Math.cos(an) * 120, oy = sc.y + Math.sin(an) * 80;
                if (!vis(ox, oy, 160)) continue;
                var hd = an + sc.dir * Math.PI / 2, ch = Math.cos(hd), sh = Math.sin(hd), spread = 1 + sc.sc * 2.4;
                ctx.fillStyle = sc.col;
                for (var m = 0; m < sc.m.length; m++) {
                    var mb = sc.m[m], fx = ox + (mb.x * ch - mb.y * sh) * spread + Math.sin(clock * 3 + mb.ph) * 3, fy = oy + (mb.x * sh + mb.y * ch) * spread;
                    var ta = hd + sc.sc * Math.sin(mb.ph) * 1.2, tc = Math.cos(ta), ts = Math.sin(ta), wg = Math.sin(clock * 14 + mb.ph) * 2;
                    ctx.beginPath(); ctx.ellipse(fx, fy, 6, 2.6, ta, 0, 7); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(fx - tc * 5, fy - ts * 5); ctx.lineTo(fx - tc * 10 - ts * (3 + wg), fy - ts * 10 + tc * (3 + wg)); ctx.lineTo(fx - tc * 10 + ts * (3 - wg), fy - ts * 10 - tc * (3 - wg)); ctx.fill();
                }
            }
            for (i = 0; i < this.jelly.length; i++) {  /* jellyfish, pulsing as they drift up and down */
                var jf = this.jelly[i], pu = Math.sin(clock * 2.2 + jf.ph), jx = jf.x + Math.sin(clock * 0.3 + jf.ph) * 30, jy = jf.y + Math.sin(clock * 0.5 + jf.ph) * 20 - pu * 4;
                if (!vis(jx, jy, 50)) continue;
                ctx.globalAlpha = 0.55; ctx.strokeStyle = jf.col; ctx.lineWidth = 2;
                for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(jx + k * 4, jy); ctx.quadraticCurveTo(jx + k * 5 + Math.sin(clock * 3 + k) * 5, jy + 14, jx + k * 4 + Math.sin(clock * 2 + k) * 6, jy + 28 + pu * 3); ctx.stroke(); }
                ctx.globalAlpha = 0.75; ctx.fillStyle = jf.col; ctx.beginPath(); ctx.ellipse(jx, jy, 13 + pu * 2, 10 - pu * 1.5, 0, Math.PI, 0); ctx.fill();
                ctx.globalAlpha = 1; circle(ctx, jx - 4, jy - 5, 2.5, 'rgba(255,255,255,.7)');
            }
            drawFans(this.fans, function (fn, fx, fy) {  /* diving helmets, a bubble now and then */
                ctx.strokeStyle = 'rgba(224,250,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(fx, fy, 8.5, 0, 7); ctx.stroke();
                var bt = (clock * 0.8 + fn.ph) % 2.5;
                if (bt < 1.2) { ctx.beginPath(); ctx.arc(fx + 5, fy - 12 - bt * 22, 2 + bt, 0, 7); ctx.stroke(); }
            });
            drawParts('bub');
            var mu = (clock / 30 + 0.62) % 1, mx = -300 + mu * (WW + 600), my = WH * (0.35 + 0.22 * Math.sin(mu * 6.28 + 1)), mh = Math.atan2(WH * 0.22 * Math.cos(mu * 6.28 + 1) * 6.28, WW + 600);
            if (vis(mx, my, 200)) {  /* a manta ray gliding over the whole reef, its shadow on the sand */
                var wf = Math.sin(clock * 1.8) * 10;
                for (var pass = 0; pass < 2; pass++) {
                    ctx.save(); ctx.translate(pass ? mx : mx + 60, pass ? my : my + 90); ctx.rotate(mh);
                    ctx.fillStyle = pass ? '#334e68' : 'rgba(8,40,60,.16)';
                    ctx.beginPath(); ctx.moveTo(48, 0); ctx.quadraticCurveTo(0, -12, -14, -78 - wf); ctx.quadraticCurveTo(-26, -20, -44, 0); ctx.quadraticCurveTo(-26, 20, -14, 78 + wf); ctx.quadraticCurveTo(0, 12, 48, 0); ctx.fill();
                    if (pass) {
                        ctx.strokeStyle = '#334e68'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-100, Math.sin(clock * 2) * 8); ctx.stroke();
                        ctx.fillStyle = '#5b7a99'; ctx.beginPath(); ctx.ellipse(8, 0, 22, 9, 0, 0, 7); ctx.fill();
                        circle(ctx, 40, -8, 2.4, '#0f172a'); circle(ctx, 40, 8, 2.4, '#0f172a');
                    }
                    ctx.restore();
                }
            }
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
