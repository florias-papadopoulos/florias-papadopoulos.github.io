    /* Red Canyon: red rock, mesas and cacti, soft sand, tumbleweeds, sandstorms, a dry riverbed shortcut with a gorge jump.
       A hawk circles overhead, dust devils wander across, lizards on the rocks dart off when a kart comes, the tall cacti
       open their flowers now and then, a windmill turns, and a crowd cheers at the start */
    var DESERT = {
        id: 'desert', name: 'Red Canyon', blurb: 'Tumbleweeds, sandstorms, a gorge jump',
        poly: [0, 1350, 0, 1050, 220, 850, 220, 650, 0, 450, 0, 0, 400, 0, 530, 130, 660, 0, 1050, 0, 1400, 350, 1850, 350, 1850, 780,
               1320, 780, 1320, 1060, 1850, 1060, 1850, 1380, 1150, 1380, 1150, 1680, 650, 1680, 650, 1380], round: 110, scale: 1, start: 0.335,
        phys: { vmax: 335, vgrass: 105, acc: 360, grip: 7.5, gripOff: 4, coast: 0.65, turn: 3.1, care: 1.05 },
        col: { bg: '#e6b27a', edge: '#c98a52', road: '#a8673a', panel: 'rgba(255,255,255,.82)' },
        alt: { a: 222, b: 292, hw: 30, vf: 0.9, ramp: 0.38, gap: [0.5, 0.66] },
        jumpK: 0.62, G: 420, jumpSay: 'Yee-haw!', fallSay: 'Down the gorge! Back you go.', aiSlow: 1,
        altGood: function (c) { return c.vf > 150; },
        pads: [[60, 0.5], [212, -0.5], [0.24, 0, true]], picks: [28, 160, 330], padCol: ['#dc2626', '#fee2e2'], dustCol: '#d9a066',
        reset: function () { this.storm = { t: 12, on: 0 }; this.aiSlow = 1; this.weeds.forEach(function (w, n) { w.s = -320 + (n * 260) % 640; }); },
        prep: function () {
            var mesas = this.mesas = [];
            seed = 74;
            scatter(160, HW + 190, function (x2, y2) {
                if (mesas.length >= 11) return;
                for (var q = 0; q < mesas.length; q++) if (Math.hypot(mesas[q].x - x2, mesas[q].y - y2) < 300) return;
                var m = { x: x2, y: y2, r: 80 + rnd() * 50, s: rnd(), pts: [] };
                for (var k = 0; k < 9; k++) { var a = k * 0.7 + m.s, r = m.r * (0.75 + 0.3 * Math.sin(k * 2.3 + m.s * 9)); m.pts.push(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r * 0.85); }
                mesas.push(m);
            });
            this.sand = [[48, 0.2], [150, -0.3], [200, 0.25], [330, 0], [402, -0.2]].map(function (d) { var q = side(d[0], d[1] * HW); return { x: q.x, y: q.y, a: A[d[0]] }; });
            this.weeds = [25, 100, 190, 318, 428].map(function (j, n) { return { x0: X[j], y0: Y[j], ux: -Math.sin(A[j]), uy: Math.cos(A[j]), s: 0, sp: 105 + n * 18, rot: 0 }; });
            function clear(x, y) { for (var q = 0; q < mesas.length; q++) if (Math.hypot(mesas[q].x - x, mesas[q].y - y) < mesas[q].r + 40) return false; return true; }
            var cacti = this.cacti = [];
            seed = 75;
            scatter(240, HW + 70, function (x, y, n, o) { if (cacti.length < 16 && o.dist < HW + 260 && clear(x, y)) cacti.push({ x: x, y: y, ph: rnd() * 7, arms: n % 3 }); });
            this.lizards = critters([[40, -1], [118, 1], [178, -1], [250, 1], [310, -1], [372, 1], [440, -1]], HW + 58, 120);
            seed = 76;
            var sp = spots(2, 700, 260, mesas);
            this.mill = sp[0] || { x: 200, y: 200 };
            this.hawk = sp[1] || { x: WW / 2, y: WH / 2 };
            this.devils = [[70, 1, 0], [262, -1, 2.1], [380, 1, 4.2]].map(function (d) { var q = side(d[0], d[1] * (HW + 60)); return { cx: q.x, cy: q.y, a: A[d[0]] + Math.PI / 2, ph: d[2], x: q.x, y: q.y }; });
            this.fans = [crowd(N - 20, N - 6, -(HW + 36), 2), crowd(N - 20, N - 6, HW + 36, 2)];
            this.update(0);
        },
        paint: function (g) {
            var i, k, p, self = this;
            g.fillStyle = '#e6b27a'; g.fillRect(0, 0, WW, WH);
            blotch(g, ['#f0c792', '#d99a62', '#e8b57e', '#c98a52'], 130, 71, 0.7);
            grain(g, 1500, ['#c98a52', '#f6d7a8', '#b5653d'], 3.5, HW + 26, 0, 72);
            g.strokeStyle = 'rgba(160,90,40,.18)'; g.lineWidth = 3; g.lineCap = 'round';
            for (i = 0; i < 240; i++) { var x = rnd() * WW, y = rnd() * WH; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 22, y - 9, x + 44, y); g.stroke(); }
            this.mesas.forEach(function (m) {  /* the mesas' shadows; the mesas themselves stand up in over() */
                g.fillStyle = 'rgba(110,50,20,.28)'; g.beginPath();
                for (var q = 0; q < m.pts.length; q += 2) g.lineTo(m.pts[q] + 30, m.pts[q + 1] + 40);
                g.closePath(); g.fill();
            });
            scatter(160, HW + 40, function (x2, y2, n) {  /* cacti and rocks */
                if (n % 2) {
                    circle(g, x2 + 4, y2 + 6, 9, 'rgba(90,50,20,.25)'); circle(g, x2, y2, 9, '#4d7c3a');
                    circle(g, x2 + 11, y2 - 2, 5, '#4d7c3a'); circle(g, x2 - 10, y2 + 3, 5, '#4d7c3a'); circle(g, x2 - 2, y2 - 2, 3, '#7bab5a');
                } else { circle(g, x2 + 3, y2 + 4, 7, 'rgba(90,50,20,.25)'); circle(g, x2, y2, 7, '#b5653d'); circle(g, x2 - 2, y2 - 2, 3, '#d7895f'); }
            });
            this.lizards.forEach(function (z) {  /* the lizards' sunny rocks and the cracks they hide in */
                circle(g, z.hx + 4, z.hy + 6, 17, 'rgba(90,40,20,.3)'); circle(g, z.hx, z.hy, 17, '#c2703f'); circle(g, z.hx - 5, z.hy - 5, 7, '#dd9061');
                g.strokeStyle = '#5a2a12'; g.lineWidth = 4; g.beginPath(); g.moveTo(z.rx - 12, z.ry - 4); g.lineTo(z.rx, z.ry + 2); g.lineTo(z.rx + 12, z.ry - 3); g.stroke();
            });
            this.cacti.forEach(function (q) { circle(g, q.x + 14, q.y + 20, 12, 'rgba(90,50,20,.25)'); });
            var ml = this.mill;
            g.fillStyle = 'rgba(90,50,20,.25)'; g.beginPath(); g.ellipse(ml.x + 40, ml.y + 55, 60, 26, 0.6, 0, 7); g.fill();
            circle(g, ml.x - 40, ml.y + 30, 26, '#8a6a4a'); circle(g, ml.x - 40, ml.y + 30, 21, '#5b8fb0'); circle(g, ml.x - 45, ml.y + 26, 6, 'rgba(255,255,255,.4)');  /* the water trough */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 30, '#e9cf9f');  /* the dry riverbed shortcut: cracked mud */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#d8b27c');
            g.strokeStyle = 'rgba(120,70,30,.35)'; g.lineWidth = 1.5;
            for (i = 1; i < ALT.n - 1; i++) { p = altSide(i, (rnd() - 0.5) * 2 * ALT.hw); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + (rnd() - 0.5) * 24, p.y + (rnd() - 0.5) * 24); g.lineTo(p.x + (rnd() - 0.5) * 30, p.y + (rnd() - 0.5) * 30); g.stroke(); }
            [[2 * ALT.hw + 70, '#7a3518'], [2 * ALT.hw + 50, '#4a1e0c'], [2 * ALT.hw + 28, '#1f0c05']].forEach(function (st) { strokeAlt(g, ALT.g0, ALT.g1, st[0], st[1], []); });
            g.save(); g.translate(ALT.x[ALT.ramp], ALT.y[ALT.ramp]); g.rotate(ALT.ang[ALT.ramp]);  /* a wooden ramp */
            g.fillStyle = 'rgba(60,30,10,.35)'; g.fillRect(-16, -ALT.hw + 3, 34, 2 * ALT.hw - 4);
            for (k = -ALT.hw + 4; k < ALT.hw - 4; k += 8) { g.fillStyle = (k / 8) % 2 ? '#c08a4f' : '#a8743f'; g.fillRect(-18, k, 34, 7); }
            g.restore();
            rail(g, HW + 46, 3, null, function (pt, j) {  /* red rock boulders lining the road */
                var r2 = 7 + (j * 13 % 7);
                circle(g, pt.x + 4, pt.y + 6, r2, 'rgba(90,40,20,.3)'); circle(g, pt.x, pt.y, r2, '#b5653d'); circle(g, pt.x - r2 * 0.3, pt.y - r2 * 0.3, r2 * 0.45, '#d7895f');
            });
            road(g, { shadow: [4, 7, 'rgba(120,60,30,.25)'], edgeW: 26, edge: '#c98a52', kerb: ['#f8f1e4', '#c2412d', 18], line: '#e9cf9f', rim: '#97592f', col: '#a8673a', crown: 'rgba(255,220,180,.06)' });
            grain(g, 1600, ['rgba(90,45,20,.3)', 'rgba(255,220,180,.25)'], 3, 0, HW - 6, 73);
            offLine(g, -HW * 0.4, 8, 'rgba(90,45,20,.18)'); offLine(g, HW * 0.4, 8, 'rgba(90,45,20,.18)');  /* wheel ruts */
            skids(g, 'rgba(80,35,15,.22)');
            this.sand.forEach(function (s) {  /* soft sand drifts on the road */
                g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.fillStyle = '#f0cf9a'; g.beginPath(); g.ellipse(0, 0, 48, 26, 0, 0, 7); g.fill();
                g.strokeStyle = 'rgba(190,130,70,.45)'; g.lineWidth = 2;
                for (k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-30, k * 8); g.quadraticCurveTo(0, k * 8 - 5, 30, k * 8); g.stroke(); }
                g.restore();
            });
            self = null;
        },
        effect: function (c) {
            var i;
            if (c.z <= 0 && !c.alt) for (i = 0; i < this.sand.length; i++) {
                var s = this.sand[i], dx = c.x - s.x, dy = c.y - s.y, u = (dx * Math.cos(s.a) + dy * Math.sin(s.a)) / 48, v = (dy * Math.cos(s.a) - dx * Math.sin(s.a)) / 26;
                if (u * u + v * v > 1) continue;
                if (!(c.loose > 0)) { stat('sand'); if (quiet(c, 4)) say('Soft sand, slidey paws!', c); }
                c.loose = 0.25;
            }
            if (c.alt && c.on && c.z <= 0) c.loose = Math.max(c.loose, 0.1);  /* the riverbed is loose too */
            for (i = 0; i < this.weeds.length; i++) {  /* tumbleweeds */
                var w = this.weeds[i], wx = w.x0 + w.ux * w.s, wy = w.y0 + w.uy * w.s;
                if (c.z > 10 || Math.hypot(c.x - wx, c.y - wy) > R + 16 || clock - (c.weedT || -9) < 1) continue;
                c.weedT = clock; c.vx *= 0.65; c.vy *= 0.65; c.a += (Math.random() - 0.5) * 0.5; stat('tumbleweed');
                sfx(c, 'hit'); if (quiet(c, 3)) say('Tumbleweed!', c);
            }
        },
        update: function (dt) {
            this.weeds.forEach(function (w) { w.s += w.sp * dt; w.rot += w.sp * dt / 16; if (w.s > 340) w.s = -340 - Math.random() * 200; });
            scare(this.lizards, dt, 150);
            this.devils.forEach(function (d) {  /* dust devils wander over the road and back, from the clock */
                var u = Math.sin(clock * 0.23 + d.ph) * 170, v = Math.sin(clock * 0.37 + d.ph * 2) * 50;
                d.x = d.cx + Math.cos(d.a) * u - Math.sin(d.a) * v; d.y = d.cy + Math.sin(d.a) * u + Math.cos(d.a) * v;
                if (dt && vis(d.x, d.y, 40) && Math.random() < 0.25) puff('dust', d.x + (Math.random() - 0.5) * 20, d.y + (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.9, 5 + Math.random() * 4);
            });
            if (phase !== 'race' || remote) return;
            var st = this.storm;
            if (st.on > 0) { st.on -= dt; if (st.on <= 0) { st.t = 16 + Math.random() * 8; this.aiSlow = 1; } }
            else { st.t -= dt; if (st.t <= 0) { st.on = 5; this.aiSlow = 0.94; stat('storm'); if (quiet(me, 1)) say('Sandstorm! Hold on!'); if (quiet(pal, 1)) say('Sandstorm! Hold on!', pal); } }
        },
        over: function () {  /* the mesas: steep red cliffs up to a flat top with rock bands */
            this.mesas.forEach(function (m) {
                if (!vis(m.x, m.y, m.r + 140)) return;
                var L = [[0, '#8a3519'], [0.04, '#9c3f22'], [0.08, '#a8482a'], [0.12, '#b44d2a']], k, q;
                for (k = 0; k < L.length; k++) {
                    ctx.fillStyle = L[k][1]; ctx.beginPath();
                    for (q = 0; q < m.pts.length; q += 2) ctx.lineTo(liftX(m.pts[q], L[k][0]), liftY(m.pts[q + 1], L[k][0]));
                    ctx.closePath(); ctx.fill();
                }
                ctx.fillStyle = '#c9643a'; ctx.beginPath();
                for (q = 0; q < m.pts.length; q += 2) ctx.lineTo(liftX(m.x + (m.pts[q] - m.x) * 0.9, 0.12), liftY(m.y + (m.pts[q + 1] - m.y) * 0.9, 0.12));
                ctx.closePath(); ctx.fill();
                var tx = liftX(m.x, 0.12), ty = liftY(m.y, 0.12);
                ctx.strokeStyle = 'rgba(120,45,15,.35)'; ctx.lineWidth = 2;
                for (k = 1; k < 3; k++) { ctx.beginPath(); ctx.ellipse(tx - 4, ty - 4, m.r * (0.7 - k * 0.15), m.r * (0.58 - k * 0.12), 0, 0, 7); ctx.stroke(); }
                circle(ctx, tx + m.r * 0.3, ty - m.r * 0.2, 8, '#4d7c3a'); circle(ctx, tx + m.r * 0.3 + 9, ty - m.r * 0.2 - 2, 4, '#4d7c3a');
            });
            var k;
            this.cacti.forEach(function (q) {  /* tall cacti with arms; every so often their flowers open */
                if (!vis(q.x, q.y, 60)) return;
                if (q.arms) { pillar(q.x - 15, q.y + 2, 5, 0.06, '#3f6d2f', '#5a8f43'); if (q.arms > 1) pillar(q.x + 14, q.y - 3, 5, 0.075, '#3f6d2f', '#5a8f43'); }
                var t = pillar(q.x, q.y, 9, 0.1, '#3f6d2f', '#5a8f43'), b = clamp(Math.sin(clock * 0.5 + q.ph) * 1.6, 0, 1);
                circle(ctx, t.x - 2, t.y - 2, 3, '#7bab5a');
                if (b > 0.05) {
                    for (k = 0; k < 5; k++) circle(ctx, t.x + Math.cos(k * 1.26 + q.ph) * 5 * b, t.y + Math.sin(k * 1.26 + q.ph) * 5 * b, 3.4 * b, q.arms ? '#f472b6' : '#fde047');
                    circle(ctx, t.x, t.y, 2.2 * b, '#fff7ed');
                }
            });
            var ml = this.mill;
            if (vis(ml.x, ml.y, 160)) {  /* a farm windmill: a lattice tower and a turning wheel of blades with a tail vane */
                ctx.strokeStyle = '#5b3a24'; ctx.lineWidth = 3;
                var top = { x: liftX(ml.x, 0.2), y: liftY(ml.y, 0.2) };
                for (k = 0; k < 4; k++) { var bx = ml.x + Math.cos(k * 1.57 + 0.78) * 22, by = ml.y + Math.sin(k * 1.57 + 0.78) * 22; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(top.x, top.y); ctx.stroke(); }
                ctx.save(); ctx.translate(top.x, top.y); ctx.rotate(0.6 + Math.sin(clock * 0.2) * 0.3);
                ctx.fillStyle = '#c2410c'; ctx.fillRect(-46, -3, 40, 6); ctx.beginPath(); ctx.moveTo(-46, -14); ctx.lineTo(-30, -3); ctx.lineTo(-30, 3); ctx.lineTo(-46, 14); ctx.fill();
                ctx.rotate(clock * 2.4);
                ctx.fillStyle = '#e5e7eb';
                for (k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(34, -6); ctx.lineTo(34, 6); ctx.lineTo(6, 3); ctx.fill(); }
                circle(ctx, 0, 0, 7, '#6b7280'); circle(ctx, 0, 0, 3, '#d1d5db');
                ctx.restore();
            }
            this.fans.forEach(fans);
            var h = this.hawkAt(), hx = liftX(h.x, 0.3), hy = liftY(h.y, 0.3);
            if (vis(hx, hy, 60)) {  /* the hawk, high up: gliding, a few flaps now and then */
                var fl = (clock % 7) < 1.2 ? Math.sin(clock * 14) : 0.15;
                ctx.save(); ctx.translate(hx, hy); ctx.rotate(h.a);
                ctx.fillStyle = '#7c4a24';
                for (k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(0, k * (22 + fl * 6), -10, k * (34 + fl * 8)); ctx.lineTo(-14, k * (30 + fl * 6)); ctx.quadraticCurveTo(-6, k * 12, -6, 0); ctx.fill(); }
                ctx.fillStyle = '#5b3418'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, 7); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-24, -7); ctx.lineTo(-24, 7); ctx.fill();
                circle(ctx, 12, 0, 4.5, '#f5f5f4'); ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.moveTo(16, -1.5); ctx.lineTo(20, 0); ctx.lineTo(16, 1.5); ctx.fill();
                ctx.restore();
            }
        },
        hawkAt: function () {  /* the hawk circles round its spot, from the clock */
            var h = this.hawk, t = clock * 0.3;
            return { x: h.x + Math.cos(t) * 340, y: h.y + Math.sin(t) * 240, a: Math.atan2(Math.cos(t) * 240, -Math.sin(t) * 340) };
        },
        under: function () {
            var h = this.hawkAt();
            if (vis(h.x, h.y, 40)) { ctx.fillStyle = 'rgba(90,40,20,.18)'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 30, 10, h.a + Math.PI / 2, 0, 7); ctx.fill(); }
            this.devils.forEach(function (d) {  /* a dust devil: a little whirl of sand and twigs */
                if (!vis(d.x, d.y, 50)) return;
                ctx.lineWidth = 3; ctx.lineCap = 'round';
                for (var k = 0; k < 3; k++) {
                    ctx.strokeStyle = 'rgba(200,150,90,' + (0.5 - k * 0.12) + ')'; ctx.beginPath();
                    for (var t = 0; t < 1; t += 0.1) { var a = -clock * 7 + k * 2.1 + t * 6, r = 5 + t * (22 + k * 8); ctx.lineTo(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.85 - t * 8); }
                    ctx.stroke();
                }
                ctx.fillStyle = '#8a6239';
                for (k = 0; k < 4; k++) { var b = clock * 9 + k * 1.6; ctx.fillRect(d.x + Math.cos(b) * 20 - 1, d.y + Math.sin(b) * 16 - 1, 3, 2); }
            });
            this.lizards.forEach(function (z) {  /* lizards sunning on rocks: off they dash into a crack when a kart comes */
                if (!vis(z.x, z.y, 24) || z.f > 0.97) return;
                var run = z.f > 0.02, a = run ? Math.atan2(z.ry - z.hy, z.rx - z.hx) : z.a + Math.sin(clock * 0.7 + z.ph) * 0.6, w = run ? Math.sin(clock * 30 + z.ph) * 3 : 0;
                ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(a);
                ctx.strokeStyle = '#6b7f2a'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(6, -5 + w); ctx.moveTo(3, 0); ctx.lineTo(6, 5 - w); ctx.moveTo(-5, 0); ctx.lineTo(-8, -5 - w); ctx.moveTo(-5, 0); ctx.lineTo(-8, 5 + w); ctx.stroke();
                ctx.fillStyle = '#7c8f2e'; ctx.beginPath(); ctx.ellipse(-1, 0, 8, 3.4, 0, 0, 7); ctx.fill();
                ctx.strokeStyle = '#7c8f2e'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-14, w * 1.5 + Math.sin(clock * 3 + z.ph) * 2, -19, 0); ctx.stroke();
                circle(ctx, 8, 0, 3.2, '#8ea33a'); circle(ctx, 9, -1.6, 0.9, '#111'); circle(ctx, 9, 1.6, 0.9, '#111');
                ctx.restore();
            });
            this.weeds.forEach(function (w) {
                var wx = w.x0 + w.ux * w.s, wy = w.y0 + w.uy * w.s;
                if (!vis(wx, wy, 30)) return;
                circle(ctx, wx + 4, wy + 8, 14, 'rgba(90,50,20,.25)');
                ctx.save(); ctx.translate(wx, wy); ctx.rotate(w.rot);
                ctx.strokeStyle = '#8a6239'; ctx.lineWidth = 1.6;
                for (var k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(0, 0, 15, 9, k * 0.45, 0, 7); ctx.stroke(); }
                ctx.strokeStyle = '#b08a5a'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.stroke();
                ctx.restore();
            });
        },
        screen: function () {  /* the sandstorm: warm haze and flying sand */
            var st = this.storm;
            if (!(st.on > 0)) return;
            var f = Math.min(1, (5 - st.on) / 0.8, st.on / 0.8), k;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = 'rgba(214,150,80,' + (0.62 * f).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(255,230,190,' + (0.6 * f).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.beginPath();
            for (k = 0; k < 40; k++) {
                var y = (k * 97.3 + clock * 23) % H, x = ((k * 211.7 + clock * 900) % (W + 200)) - 100;
                ctx.moveTo(x, y); ctx.lineTo(x + 40, y + 6);
            }
            ctx.stroke();
        }
    };
