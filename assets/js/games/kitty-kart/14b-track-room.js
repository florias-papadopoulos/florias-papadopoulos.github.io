    /* Living Room Rally: tiny cats on a toy race track laid out across a giant living room. The wooden floor is fast
       but slippery, rugs are shaggy and slow, a robot vacuum makes its rounds, wind-up mice zip across, and the
       shortcut goes under the sofa, where the dust bunnies live */
    var ROOM = {
        id: 'room', name: 'Living Room Rally', blurb: 'A robot vacuum, wind-up mice, under the sofa',
        ctrl: [300, 400, 650, 250, 1000, 350, 1300, 250, 1650, 380, 1700, 700, 1400, 800, 1100, 700, 900, 850, 1050, 1100, 1500, 1150,
               1650, 1400, 1200, 1500, 700, 1400, 400, 1200, 500, 950, 250, 750], scale: 1, start: 0,
        phys: { vmax: 340, vgrass: 150, acc: 370, grip: 9, gripOff: 2.4, coast: 0.6, turn: 3.2, care: 1 },
        col: { bg: '#c98f55', edge: '#c2410c', road: '#fb923c', panel: 'rgba(255,255,255,.85)', mini: '#fb923c' },
        alt: { a: 200, b: 280, hw: 28, vf: 0.95 },
        pads: [[70, 0.5], [330, -0.5]], picks: [30, 240, 420], padCol: ['#2563eb', '#dbeafe'], gantry: ['#1d4ed8', '#facc15'],
        prep: function () {
            var self = this;
            seed = 21;
            var sp = spots(4, 420, 270);
            this.rugs = [];
            if (sp[0]) this.rugs.push({ x: sp[0].x, y: sp[0].y, rx: 230, ry: 170, round: true, c: ['#b91c1c', '#fde68a', '#1e3a8a'] });
            if (sp[1]) this.rugs.push({ x: sp[1].x, y: sp[1].y, rx: 220, ry: 150, round: false, c: ['#0f766e', '#f5f5f4', '#f59e0b'] });
            this.tower = sp[2]; this.plant = sp[3];
            var m = Math.round(ALT.n / 2);  /* the sofa sits over the middle of the shortcut */
            this.sofa = { x: ALT.x[m], y: ALT.y[m], a: ALT.ang[m] };
            this.bunnies = [0.3, 0.5, 0.7].map(function (f, n) { return { ci: Math.round(f * (ALT.n - 1)), ph: n * 2, x: 0, y: 0 }; });
            var j1 = 120, j2 = 150, d = HW + 150;  /* the robot vacuum's round: across the road, along, back across */
            this.route = [side(j1, -d), side(j1, d), side(j2, d), side(j2, -d)];
            var L = 0; this.legs = this.route.map(function (p, i) { var q = self.route[(i + 1) % 4], l = Math.hypot(q.x - p.x, q.y - p.y); L += l; return l; });
            this.routeLen = L;
            this.vac = { x: 0, y: 0, a: 0 };
            this.mice = [[50, 0, 1.4], [300, 2, 1.1], [400, 1, 1.7]].map(function (d2) { return { j: d2[0], ph: d2[1], w: d2[2], x: 0, y: 0, dir: 1 }; });
            this.update(0);
        },
        onRug: function (x, y) {
            for (var i = 0; i < this.rugs.length; i++) {
                var r = this.rugs[i], u = (x - r.x) / r.rx, v = (y - r.y) / r.ry;
                if (r.round ? u * u + v * v < 1 : Math.abs(u) < 1 && Math.abs(v) < 1) return true;
            }
            return false;
        },
        paint: function (g) {
            var i, k, p, self = this;
            g.fillStyle = '#c98f55'; g.fillRect(0, 0, WW, WH);
            seed = 22;
            for (var y = 0; y < WH; y += 64) {  /* floorboards: planks of slightly different wood, staggered joints */
                for (var x = -rnd() * 300; x < WW; x += 260 + rnd() * 160) {
                    var w = 260 + rnd() * 160;
                    g.fillStyle = ['#c98f55', '#d29a60', '#bf844b', '#cd955a'][Math.floor(rnd() * 4)]; g.fillRect(x, y, w, 64);
                    g.strokeStyle = 'rgba(120,70,30,.18)'; g.lineWidth = 2;
                    for (k = 0; k < 3; k++) { var gy = y + 12 + k * 17 + rnd() * 6; g.beginPath(); g.moveTo(x + 10, gy); g.bezierCurveTo(x + w * 0.3, gy - 5, x + w * 0.6, gy + 5, x + w - 10, gy); g.stroke(); }
                    g.fillStyle = 'rgba(90,50,20,.35)'; g.fillRect(x, y, 2, 64);
                }
                g.fillStyle = 'rgba(90,50,20,.35)'; g.fillRect(0, y, WW, 2);
            }
            this.rugs.forEach(function (r) {  /* rugs: a round one with rings, a square one with a pattern and fringes */
                g.fillStyle = 'rgba(60,30,10,.25)';
                if (r.round) { g.beginPath(); g.ellipse(r.x + 8, r.y + 10, r.rx, r.ry, 0, 0, 7); g.fill(); for (k = 0; k < 6; k++) { g.fillStyle = r.c[k % 3]; g.beginPath(); g.ellipse(r.x, r.y, r.rx * (1 - k * 0.16), r.ry * (1 - k * 0.16), 0, 0, 7); g.fill(); } }
                else {
                    g.fillRect(r.x - r.rx + 8, r.y - r.ry + 10, 2 * r.rx, 2 * r.ry);
                    g.strokeStyle = '#f5f5f4'; g.lineWidth = 3;
                    for (k = -r.rx; k <= r.rx; k += 10) { g.beginPath(); g.moveTo(r.x + k, r.y - r.ry - 12); g.lineTo(r.x + k, r.y + r.ry + 12); g.stroke(); }
                    g.fillStyle = r.c[0]; g.fillRect(r.x - r.rx, r.y - r.ry, 2 * r.rx, 2 * r.ry);
                    g.strokeStyle = r.c[1]; g.lineWidth = 10; g.strokeRect(r.x - r.rx + 18, r.y - r.ry + 18, 2 * r.rx - 36, 2 * r.ry - 36);
                    g.fillStyle = r.c[2];
                    for (k = -2; k <= 2; k++) { g.save(); g.translate(r.x + k * 70, r.y); g.rotate(0.785); g.fillRect(-18, -18, 36, 36); g.restore(); }
                }
                seed = 23;
                for (k = 0; k < 500; k++) { var a = rnd() * 7, d = Math.sqrt(rnd()); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(r.x + Math.cos(a) * d * r.rx * 0.95, r.y + Math.sin(a) * d * r.ry * 0.95, 2, 2); }
            });
            if (this.tower) circle(g, this.tower.x + 30, this.tower.y + 40, 110, 'rgba(60,30,10,.25)');
            if (this.plant) circle(g, this.plant.x + 24, this.plant.y + 30, 70, 'rgba(60,30,10,.25)');
            var s = this.sofa;  /* the sofa's shadow and the dusty floor under it */
            g.save(); g.translate(s.x, s.y); g.rotate(s.a);
            g.fillStyle = 'rgba(40,20,5,.5)'; rr(g, -110, -150, 240, 310, 30); g.fill();
            g.restore();
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 8, '#8a6a4a');
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw - 6, '#a07a52');
            seed = 24;
            for (i = 1; i < ALT.n - 1; i++) { p = altSide(i, (rnd() - 0.5) * 2 * ALT.hw); circle(g, p.x, p.y, 1.5 + rnd() * 2, 'rgba(230,220,210,.35)'); }
            seed = 25;  /* toys and things on the floor */
            scatter(90, HW + 50, function (x2, y2, n) {
                if (self.onRug(x2, y2)) return;
                g.save(); g.translate(x2, y2); g.rotate(rnd() * 7);
                var t = n % 5;
                if (t === 0) { g.fillStyle = 'rgba(60,30,10,.3)'; g.fillRect(-14, -10, 34, 26); g.fillStyle = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'][n % 4]; g.fillRect(-17, -13, 34, 26); g.fillStyle = 'rgba(255,255,255,.35)'; for (k = -1; k <= 1; k += 2) { circle(g, k * 8 - 4, -5, 5, 'rgba(255,255,255,.35)'); circle(g, k * 8 - 4, 5, 5, 'rgba(255,255,255,.35)'); } }
                else if (t === 1) { circle(g, 3, 4, 14, 'rgba(60,30,10,.3)'); drawYarn(g, 14, n, 1); }
                else if (t === 2) { g.fillStyle = 'rgba(60,30,10,.3)'; g.fillRect(-26, -16, 56, 38); g.fillStyle = ['#7c3aed', '#0e7490', '#b45309'][n % 3]; g.fillRect(-30, -20, 56, 38); g.fillStyle = '#f5f5f4'; g.fillRect(22, -18, 3, 34); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-22, -10, 30, 4); }
                else if (t === 3) { g.fillStyle = '#e2e8f0'; g.beginPath(); g.ellipse(0, 0, 26, 9, 0, 0, 7); g.fill(); g.fillStyle = '#f472b6'; g.fillRect(-26, -9, 10, 18); g.fillStyle = '#94a3b8'; g.fillRect(-8, -9, 4, 18); }
                else { circle(g, 3, 4, 10, 'rgba(60,30,10,.3)'); circle(g, 0, 0, 10, '#ef4444'); circle(g, -3, -3, 3, '#fecaca'); }
                g.restore();
            });
            /* the toy race track: raised orange plastic with joints, a white lane line and red and white kerbs */
            road(g, { shadow: [5, 9, 'rgba(60,30,10,.35)'], edgeW: 16, edge: '#c2410c', kerb: ['#ffffff', '#dc2626', 24], line: '#ea580c', rim: '#f97316', col: '#fb923c', crown: 'rgba(255,255,255,.1)' });
            for (i = 0; i < N; i += 24) {  /* the joints between the track pieces */
                var a1 = side(i, -HW - 8), a2 = side(i, HW + 8);
                g.strokeStyle = '#c2410c'; g.lineWidth = 3; g.beginPath(); g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
                for (k = -1; k <= 1; k += 2) { p = side(i, k * (HW + 4)); circle(g, p.x, p.y, 4, '#9a3412'); }
            }
            skids(g, 'rgba(120,50,10,.22)');
            strokeLoop(g, 0, N, 4, 'rgba(255,255,255,.85)', [22, 18]);
            self = null;
        },
        effect: function (c) {
            var i, q;
            if (c.z > 0 || c.fall > 0) return;
            if (!c.on && this.onRug(c.x, c.y)) c.sticky = Math.max(c.sticky, 0.06);  /* shaggy rug: slow */
            q = this.vac;
            var dx = c.x - q.x, dy = c.y - q.y, d = Math.hypot(dx, dy);
            if (d < R + 26 && d > 0.1) {  /* the robot vacuum shoves you aside */
                c.x = q.x + dx / d * (R + 26); c.y = q.y + dy / d * (R + 26); c.vx += dx / d * 140; c.vy += dy / d * 140;
                if (clock - (c.vacT || -9) > 1.2) { c.vacT = clock; stat('vacuum'); spinOut(c, 0.8, 'The robot vacuum! Shoo!'); }
            }
            for (i = 0; i < this.mice.length; i++) {
                q = this.mice[i];
                if (Math.hypot(c.x - q.x, c.y - q.y) < R + 9 && clock - (c.mouseT || -9) > 1) { c.mouseT = clock; stat('mouse'); spinOut(c, 0.6, 'A wind-up mouse! Must not chase it!'); }
            }
            if (c.alt) for (i = 0; i < this.bunnies.length; i++) {
                q = this.bunnies[i];
                if (Math.hypot(c.x - q.x, c.y - q.y) < 24) {
                    if (!(c.sticky > 0.1)) { stat('bunny'); if (quiet(c, 3)) say('Dust bunny! Sticky fluff!', c); }
                    c.sticky = 0.4;
                }
            }
        },
        update: function () {
            var self = this, v = this.vac, u = (clock * 55) % this.routeLen, i;
            for (i = 0; i < 4; i++) {  /* the vacuum's place on its round, from the clock alone */
                if (u <= this.legs[i]) { var p = this.route[i], q = this.route[(i + 1) % 4], f = u / this.legs[i]; v.x = p.x + (q.x - p.x) * f; v.y = p.y + (q.y - p.y) * f; v.a = Math.atan2(q.y - p.y, q.x - p.x); break; }
                u -= this.legs[i];
            }
            this.mice.forEach(function (m) {  /* wind-up mice zip across the road, stop to rewind, zip back */
                var t = (clock * m.w * 0.25 + m.ph) % 2, s = t < 0.8 ? -1 + t / 0.4 : t < 1 ? 1 : t < 1.8 ? 1 - (t - 1) / 0.4 : -1;
                m.dir = t < 1 ? 1 : -1;
                var q = side(m.j, s * (HW + 30)); m.x = q.x; m.y = q.y;
            });
            this.bunnies.forEach(function (b) { var q = altSide(b.ci, Math.sin(clock * 0.8 + b.ph) * ALT.hw * 0.75); b.x = q.x; b.y = q.y; });
            void self;
        },
        under: function () {
            this.bunnies.forEach(function (b, n) {  /* dust bunnies: grey fluff with ears */
                if (!vis(b.x, b.y, 30)) return;
                for (var k = 0; k < 7; k++) circle(ctx, b.x + Math.cos(k + clock + n) * 9, b.y + Math.sin(k * 1.7 + clock) * 7, 9, k % 2 ? '#cbd5e1' : '#e2e8f0');
                ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(b.x - 5, b.y - 14, 3, 7, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(b.x + 5, b.y - 14, 3, 7, 0.3, 0, 7); ctx.fill();
                circle(ctx, b.x - 3, b.y - 2, 1.6, '#334155'); circle(ctx, b.x + 3, b.y - 2, 1.6, '#334155');
            });
            this.mice.forEach(function (m) {  /* grey wind-up mice with a key on the back */
                if (!vis(m.x, m.y, 30)) return;
                var a = Math.atan2(Y[ix(m.j + 1)] - Y[m.j], X[ix(m.j + 1)] - X[m.j]) + (m.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
                ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(a);
                ctx.fillStyle = 'rgba(60,30,10,.3)'; ctx.beginPath(); ctx.ellipse(2, 3, 13, 8, 0, 0, 7); ctx.fill();
                ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(-18, 6, -22, 0); ctx.stroke();
                ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 7.5, 0, 0, 7); ctx.fill();
                circle(ctx, 3, -6, 3.5, '#f9a8d4'); circle(ctx, 3, 6, 3.5, '#f9a8d4'); circle(ctx, 11, 0, 1.6, '#f472b6'); circle(ctx, 7, -2.5, 1.2, '#0f172a'); circle(ctx, 7, 2.5, 1.2, '#0f172a');
                ctx.save(); ctx.translate(-3, 0); ctx.rotate(clock * 12); ctx.fillStyle = '#eab308'; ctx.fillRect(-6, -1.5, 12, 3); ctx.restore();
                ctx.restore();
            });
            var v = this.vac;
            if (vis(v.x, v.y, 50)) {  /* the robot vacuum: a disc with a bumper, a blinking light and spinning brushes */
                ctx.fillStyle = 'rgba(60,30,10,.35)'; ctx.beginPath(); ctx.arc(v.x + 5, v.y + 7, 30, 0, 7); ctx.fill();
                ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a);
                for (var k = -1; k <= 1; k += 2) { ctx.save(); ctx.translate(18, k * 18); ctx.rotate(clock * 15 * k); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); for (var b = 0; b < 3; b++) { ctx.moveTo(0, 0); ctx.lineTo(Math.cos(b * 2.1) * 11, Math.sin(b * 2.1) * 11); } ctx.stroke(); ctx.restore(); }
                circle(ctx, 0, 0, 28, '#334155'); circle(ctx, 0, 0, 24, '#e2e8f0'); circle(ctx, -2, 0, 17, '#cbd5e1');
                ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0, 0, 28, -0.9, 0.9); ctx.arc(0, 0, 22, 0.9, -0.9, true); ctx.fill();
                circle(ctx, 8, 0, 4, Math.floor(clock * 3) % 2 ? '#22c55e' : '#166534');
                ctx.restore();
            }
        },
        over: function () {
            var s = this.sofa, k;
            if (vis(s.x, s.y, 260)) {  /* the sofa: see-through over the shortcut, so the karts under it still show */
                ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#6d28d9'; rrect(-100, -150, 210, 300, 26); ctx.fill();  /* the base */
                ctx.fillStyle = '#7c3aed'; rrect(-92, -150, 50, 300, 22); ctx.fill(); rrect(48, -150, 50, 300, 22); ctx.fill();  /* arms */
                ctx.fillStyle = '#8b5cf6'; for (k = 0; k < 3; k++) { rrect(-40, -136 + k * 92, 86, 86, 16); ctx.fill(); }  /* cushions */
                ctx.fillStyle = 'rgba(255,255,255,.25)'; for (k = 0; k < 3; k++) { rrect(-32, -128 + k * 92, 26, 70, 10); ctx.fill(); }
                ctx.globalAlpha = 1; ctx.restore();
            }
            var q = this.tower;
            if (q && vis(q.x, q.y, 260)) {  /* a cat tree: sisal posts up to carpeted platforms, a little cat asleep on top */
                pillar(q.x - 30, q.y + 20, 14, 0.12, '#c8a26a', null);
                var p1 = pillar(q.x + 20, q.y - 10, 14, 0.22, '#c8a26a', null);
                var lo = { x: liftX(q.x - 20, 0.12), y: liftY(q.y + 10, 0.12) };
                ctx.fillStyle = '#9ca3af'; rrect(lo.x - 60, lo.y - 40, 120, 80, 16); ctx.fill(); ctx.fillStyle = '#b6bcc6'; rrect(lo.x - 54, lo.y - 34, 108, 68, 12); ctx.fill();
                ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.arc(p1.x, p1.y, 62, 0, 7); ctx.fill(); circle(ctx, p1.x, p1.y, 55, '#b6bcc6');
                ctx.fillStyle = '#f6a23a'; ctx.beginPath(); ctx.ellipse(p1.x, p1.y, 26, 20, 0.3, 0, 7); ctx.fill();
                ctx.strokeStyle = '#cf7419'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p1.x - 4, p1.y + 2, 14, 0.4, 2.6); ctx.stroke();
                circle(ctx, p1.x + 18, p1.y - 10, 11, '#f6a23a');
                ctx.fillStyle = '#f6a23a'; ctx.beginPath(); ctx.moveTo(p1.x + 12, p1.y - 18); ctx.lineTo(p1.x + 14, p1.y - 28); ctx.lineTo(p1.x + 20, p1.y - 19); ctx.fill(); ctx.beginPath(); ctx.moveTo(p1.x + 22, p1.y - 19); ctx.lineTo(p1.x + 28, p1.y - 26); ctx.lineTo(p1.x + 28, p1.y - 14); ctx.fill();
                ctx.font = '800 14px sans-serif'; ctx.fillStyle = '#1e3a8a'; ctx.textAlign = 'center';
                var zb = (clock * 0.8) % 1; ctx.globalAlpha = 1 - zb; ctx.fillText('z', p1.x + 30 + zb * 10, p1.y - 30 - zb * 20); ctx.globalAlpha = 1;
            }
            q = this.plant;
            if (q && vis(q.x, q.y, 220)) {  /* a potted plant, its leaves fanning out above */
                var t = pillar(q.x, q.y, 34, 0.08, '#b45309', '#78350f');
                circle(ctx, t.x, t.y, 28, '#3f2a14');
                var tp = { x: liftX(q.x, 0.16), y: liftY(q.y, 0.16) };
                for (k = 0; k < 9; k++) {
                    var a = k * 0.7 + 0.3;
                    ctx.fillStyle = k % 2 ? '#15803d' : '#22c55e'; ctx.beginPath(); ctx.ellipse(tp.x + Math.cos(a) * 40, tp.y + Math.sin(a) * 40, 42, 15, a, 0, 7); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(tp.x + Math.cos(a) * 75, tp.y + Math.sin(a) * 75); ctx.stroke();
                }
            }
        },
        thumbDeco: function (g) { seed = 3; for (var i = 0; i < 20; i++) { g.fillStyle = i % 2 ? '#bf844b' : '#d29a60'; g.fillRect(0, i * 90, WW, 60); } }
    };
