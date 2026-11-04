    var TREES = {
        id: 'trees', name: 'Giant Grove', blurb: 'Swinging vines, a plank bridge, a hollow log',
        ctrl: [200, 400, 450, 250, 700, 400, 950, 250, 1250, 300, 1350, 550, 1150, 700, 1300, 950, 1050, 1100, 800, 950,
               650, 1100, 400, 1050, 300, 850, 450, 650], scale: 1.15, start: 0.23,
        phys: { vmax: 330, vgrass: 95, acc: 360, grip: 8.5, gripOff: 5, coast: 0.7, turn: 3.15, care: 1 },
        col: { bg: '#18301f', edge: '#4b7a3a', road: '#9a6a3c', panel: 'rgba(15,23,42,.72)', mini: '#d9b48a', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 340, b: 430, hw: 26, vf: 0.92 }, bridge: { i0: 240, i1: 266, hw: 30 }, fallSay: 'Off the planks! Back you go.',
        pads: [[100, 0.5], [200, -0.5]], picks: [20, 300], padCol: ['#65a30d', '#ecfccb'], dustCol: '#8a6a4a',
        prep: function () {
            this.saps = [[0.3, -0.45], [0.55, 0.45], [0.8, -0.45]].map(function (s) { var j = Math.round(s[0] * (ALT.n - 1)), q = altSide(j, s[1] * ALT.hw); return { x: q.x, y: q.y, a: ALT.ang[j] }; });
            this.vines = [[60, 0], [165, 2.2]].map(function (v) { return { j: v[0], ph: v[1] }; });
            this.lanterns = [];
            for (var i = 10; i < N; i += 34) if ((i - this.bridge.i0 + N) % N > this.bridge.i1 - this.bridge.i0) this.lanterns.push(side(i, (i / 34 % 2 ? 1 : -1) * (HW + 20)));
            var trunks = this.trunks = [];
            seed = 92;
            scatter(80, HW + 150, function (x, y) { if (trunks.length < 10) trunks.push({ x: x, y: y, r: 70 + rnd() * 50 }); });
            seed = 91; this.flies = [];
            for (i = 0; i < 34; i++) this.flies.push({ x: rnd() * WW, y: rnd() * WH, ph: rnd() * 7, sp: 0.4 + rnd() * 0.6 });
        },
        vine: function (v) {  /* where the swinging vine is now */
            var l = Math.sin(clock * 1.7 + v.ph) * (HW + 8);
            return side(v.j, l);
        },
        paint: function (g) {
            var i, k, p;
            g.fillStyle = '#18301f'; g.fillRect(0, 0, WW, WH);
            seed = 93;
            blotch(g, ['#22432a', '#0f2014', '#2f5a2f', '#3a4a22'], 110, 93, 0.85);
            grain(g, 1600, ['#2c5232', '#10200f', '#4d6b2f'], 3.5, HW + 26, 0, 94);
            var trunks = this.trunks;
            g.lineCap = 'round';
            trunks.forEach(function (t) {  /* giant roots spreading out */
                for (k = 0; k < 6; k++) {
                    var a = k * 1.05 + rnd(), l = t.r + 80 + rnd() * 120, mx = t.x + Math.cos(a + 0.3) * l * 0.6, my = t.y + Math.sin(a + 0.3) * l * 0.6;
                    g.strokeStyle = '#3d2817'; g.lineWidth = 26 - k; g.beginPath(); g.moveTo(t.x, t.y); g.quadraticCurveTo(mx, my, t.x + Math.cos(a) * l, t.y + Math.sin(a) * l); g.stroke();
                    g.strokeStyle = 'rgba(255,220,170,.12)'; g.lineWidth = 6; g.stroke();
                }
            });
            trunks.forEach(function (t) { circle(g, t.x + 18, t.y + 24, t.r * 1.05, 'rgba(0,0,0,.4)'); circle(g, t.x, t.y, t.r, '#3d2817'); });  /* the trunks stand up in over() */
            scatter(220, HW + 40, function (x, y, n) {  /* mushrooms and ferns */
                if (n % 3 === 0) {
                    var r = 6 + rnd() * 9, glow = n % 9 === 0;
                    circle(g, x + 2, y + 3, r, 'rgba(0,0,0,.3)'); circle(g, x, y, r, glow ? '#5eead4' : '#dc2626');
                    for (k = 0; k < 4; k++) circle(g, x + Math.cos(k * 1.6) * r * 0.5, y + Math.sin(k * 1.6) * r * 0.5, r * 0.18, glow ? '#ccfbf1' : '#fff7ed');
                } else if (n % 3 === 1) {
                    g.strokeStyle = n % 2 ? '#3f8f3a' : '#57a84a'; g.lineWidth = 3;
                    for (k = 0; k < 6; k++) { var a = k * 1.05 + n; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * 10, y + Math.sin(a + 0.4) * 10, x + Math.cos(a) * 18, y + Math.sin(a) * 18); g.stroke(); }
                }
            });
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 18, '#3d2614');  /* the hollow log shortcut: narrow, with sticky sap */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#6b4424');
            strokeAlt(g, 1, ALT.n - 2, 2, 'rgba(0,0,0,.25)', [8, 10]);
            this.saps.forEach(function (s) {
                g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.fillStyle = '#d97706'; g.beginPath(); g.ellipse(0, 0, 18, 11, 0, 0, 7); g.fill();
                g.fillStyle = 'rgba(255,240,180,.6)'; g.beginPath(); g.ellipse(-5, -3, 6, 3, 0, 0, 7); g.fill(); g.restore();
            });
            road(g, { shadow: [4, 7, 'rgba(0,0,0,.35)'], edgeW: 22, edge: '#4b7a3a', line: '#6d9a4a', rim: '#87592f', col: '#9a6a3c', crown: 'rgba(255,220,170,.08)' });
            grain(g, 1800, ['rgba(60,35,15,.4)', 'rgba(255,220,170,.25)'], 3, 0, HW - 6, 95);
            offLine(g, -HW * 0.38, 9, 'rgba(70,42,18,.16)'); offLine(g, HW * 0.38, 9, 'rgba(70,42,18,.16)');  /* two worn ruts */
            g.strokeStyle = '#5b3b22'; g.lineCap = 'round';  /* roots crossing the edges of the road */
            seed = 96;
            for (i = 3; i < N; i += 11) {
                if (inZone(i, { i0: this.bridge.i0 - 4, i1: this.bridge.i1 + 4 })) continue;
                var sd = rnd() < 0.5 ? -1 : 1, r0 = side(i, sd * (HW + 26)), r1 = side(i + 2, sd * (HW - 14 - rnd() * 14));
                g.lineWidth = 7; g.beginPath(); g.moveTo(r0.x, r0.y); g.quadraticCurveTo((r0.x + r1.x) / 2 + 6, (r0.y + r1.y) / 2 - 6, r1.x, r1.y); g.stroke();
            }
            skids(g, 'rgba(60,35,15,.25)');
            var b = this.bridge;
            strokeLoop(g, b.i0, b.i1, 2 * HW + 30, '#0b170e', []);  /* the plank bridge over a drop to the forest floor */
            strokeLoop(g, b.i0, b.i1, 2 * HW + 4, '#0b170e', []);
            for (i = b.i0; i <= b.i1; i++) {
                p = side(i, 0); g.save(); g.translate(p.x, p.y); g.rotate(A[ix(i)]);
                g.fillStyle = i % 2 ? '#b98b55' : '#a87c49'; g.fillRect(-4.5, -b.hw, 8, 2 * b.hw);
                g.restore();
            }
            for (k = -1; k <= 1; k += 2) {
                g.beginPath();
                for (i = b.i0; i <= b.i1; i++) { p = side(i, k * (b.hw + 4)); if (i === b.i0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
                g.strokeStyle = '#d6b98a'; g.lineWidth = 3; g.setLineDash([]); g.stroke();
                for (i = b.i0; i <= b.i1; i += 4) { p = side(i, k * (b.hw + 4)); circle(g, p.x, p.y, 3.5, '#5b3b22'); }
            }
            this.lanterns.forEach(function (q) {  /* warm light from the lanterns */
                var gl = g.createRadialGradient(q.x, q.y, 3, q.x, q.y, 90);
                gl.addColorStop(0, 'rgba(255,200,110,.3)'); gl.addColorStop(1, 'rgba(255,200,110,0)');
                g.fillStyle = gl; g.fillRect(q.x - 90, q.y - 90, 180, 180);
            });
        },
        effect: function (c) {
            var i;
            if (c.alt) for (i = 0; i < this.saps.length; i++) if (Math.hypot(c.x - this.saps[i].x, c.y - this.saps[i].y) < 20) {
                if (!(c.sticky > 0)) { stat('sap'); if (quiet(c, 3)) say('Sticky sap!', c); }
                c.sticky = 0.35;
            }
            if (c.z > 0) return;
            for (i = 0; i < this.vines.length; i++) {
                var q = this.vine(this.vines[i]);
                if (Math.hypot(c.x - q.x, c.y - q.y) < R + 12 && clock - (c.vineT || -9) > 1.2) { c.vineT = clock; stat('vine'); spinOut(c, 0.7, 'Whoa! A swinging vine!'); }
            }
        },
        over: function () {
            var self = this, i, k;
            for (i = 0; i < this.trunks.length; i++) {  /* the giant trunks: bark sides rising to the cut top with its rings */
                var t = this.trunks[i];
                if (!vis(t.x, t.y, t.r + 120)) continue;
                var tx = liftX(t.x, 0.14), ty = liftY(t.y, 0.14), dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * t.r, ny = dx / d * t.r;
                ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(t.x + nx, t.y + ny); ctx.lineTo(tx + nx, ty + ny); ctx.lineTo(tx - nx, ty - ny); ctx.lineTo(t.x - nx, t.y - ny); ctx.fill();
                ctx.strokeStyle = 'rgba(30,18,10,.45)'; ctx.lineWidth = 4;
                for (k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(t.x + nx * k / 2.6, t.y + ny * k / 2.6); ctx.lineTo(tx + nx * k / 2.6, ty + ny * k / 2.6); ctx.stroke(); }
                circle(ctx, tx, ty, t.r, '#a8784a'); circle(ctx, tx, ty, t.r - 6, '#c49464');
                ctx.strokeStyle = '#a8784a'; ctx.lineWidth = 2.5;
                for (k = t.r - 18; k > 8; k -= 13) { ctx.beginPath(); ctx.arc(tx + (t.r - k) * 0.05, ty, k, 0, 7); ctx.stroke(); }
                circle(ctx, tx - t.r * 0.45, ty - t.r * 0.4, t.r * 0.18, '#6cb04a'); circle(ctx, tx + t.r * 0.5, ty + t.r * 0.3, t.r * 0.12, '#5aa03c');
            }
            ctx.lineCap = 'round';
            for (i = 4; i < ALT.n - 4; i += 5) {  /* the log over the shortcut, see-through so you can still see the karts */
                var a1 = altSide(i, -ALT.hw - 9), a2 = altSide(i, ALT.hw + 9);
                if (!vis(a1.x, a1.y, 80)) continue;
                ctx.strokeStyle = 'rgba(92,58,30,.6)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(a1.x, a1.y);
                ctx.quadraticCurveTo((a1.x + a2.x) / 2, (a1.y + a2.y) / 2 - 10, a2.x, a2.y); ctx.stroke();
            }
            this.vines.forEach(function (v) {
                var q = self.vine(v);
                if (!vis(q.x, q.y, 140)) return;
                circle(ctx, q.x + 6, q.y + 10, 11, 'rgba(0,0,0,.3)');
                ctx.strokeStyle = '#2f6b2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.quadraticCurveTo(q.x + 10, q.y - 60, q.x, q.y - 130); ctx.stroke();
                circle(ctx, q.x, q.y, 12, '#3f8f3a'); circle(ctx, q.x - 4, q.y - 4, 6, '#6cc04a');
                for (k = 0; k < 4; k++) { ctx.fillStyle = '#4fa83f'; ctx.beginPath(); ctx.ellipse(q.x + Math.cos(k * 1.6) * 12, q.y + Math.sin(k * 1.6) * 12, 7, 3.5, k * 1.6, 0, 7); ctx.fill(); }
            });
            this.lanterns.forEach(function (q, n) {  /* paper lanterns hanging from the branches */
                if (!vis(q.x, q.y, 30)) return;
                var sw = Math.sin(clock * 2 + n) * 2;
                ctx.strokeStyle = '#3d2817'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x + sw, q.y - 8); ctx.lineTo(q.x, q.y - 30); ctx.stroke();
                circle(ctx, q.x + sw, q.y, 14, 'rgba(255,190,90,.25)');
                ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(q.x + sw, q.y, 7, 9, 0, 0, 7); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fde68a'; ctx.fillRect(q.x + sw - 1.5, q.y - 6, 3, 12);
            });
            for (i = 0; i < this.flies.length; i++) {  /* fireflies */
                var f = this.flies[i], fx = f.x + Math.sin(clock * f.sp + f.ph) * 60, fy = f.y + Math.cos(clock * f.sp * 1.3 + f.ph) * 40;
                if (!vis(fx, fy, 10)) continue;
                var on = 0.5 + 0.5 * Math.sin(clock * 3 + f.ph);
                ctx.globalAlpha = on; circle(ctx, fx, fy, 6, 'rgba(250,255,150,.35)'); circle(ctx, fx, fy, 2, '#fbff9e'); ctx.globalAlpha = 1;
            }
        }
    };

    /* Red Canyon: red rock, mesas and cacti, soft sand, tumbleweeds, sandstorms, a dry riverbed shortcut with a gorge jump */
    var DESERT = {
        id: 'desert', name: 'Red Canyon', blurb: 'Tumbleweeds, sandstorms, a gorge jump',
        poly: [0, 0, 240, 0, 360, 120, 480, 0, 700, 0, 1000, 300, 1400, 300, 1400, 800, 900, 800, 900, 1100, 300, 1100, 300, 600, 0, 600], round: 110, scale: 1.05, start: 0.95,
        phys: { vmax: 335, vgrass: 105, acc: 360, grip: 7.5, gripOff: 4, coast: 0.65, turn: 3.1, care: 1.05 },
        col: { bg: '#e6b27a', edge: '#c98a52', road: '#a8673a', panel: 'rgba(255,255,255,.82)' },
        alt: { a: 310, b: 400, hw: 30, vf: 0.9, ramp: 0.38, gap: [0.5, 0.66] },
        jumpK: 0.62, G: 420, jumpSay: 'Yee-haw!', fallSay: 'Down the gorge! Back you go.', aiSlow: 1,
        altGood: function (c) { return c.vf > 150; },
        pads: [[170, 0.5], [270, -0.5], [0.24, 0, true]], picks: [90, 420], padCol: ['#dc2626', '#fee2e2'], dustCol: '#d9a066',
        reset: function () { this.storm = { t: 12, on: 0 }; this.aiSlow = 1; this.weeds.forEach(function (w, n) { w.s = -320 + n * 200; }); },
        prep: function () {
            var mesas = this.mesas = [];
            seed = 74;
            scatter(90, HW + 190, function (x2, y2) {
                if (mesas.length >= 8) return;
                for (var q = 0; q < mesas.length; q++) if (Math.hypot(mesas[q].x - x2, mesas[q].y - y2) < 300) return;
                var m = { x: x2, y: y2, r: 80 + rnd() * 50, s: rnd(), pts: [] };
                for (var k = 0; k < 9; k++) { var a = k * 0.7 + m.s, r = m.r * (0.75 + 0.3 * Math.sin(k * 2.3 + m.s * 9)); m.pts.push(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r * 0.85); }
                mesas.push(m);
            });
            this.sand = [[80, 0.2], [150, -0.3], [230, 0.25], [440, 0]].map(function (d) { var q = side(d[0], d[1] * HW); return { x: q.x, y: q.y, a: A[d[0]] }; });
            this.weeds = [60, 215, 455].map(function (j, n) { return { x0: X[j], y0: Y[j], ux: -Math.sin(A[j]), uy: Math.cos(A[j]), s: 0, sp: 110 + n * 25, rot: 0 }; });
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
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 30, '#e9cf9f');  /* the dry riverbed shortcut: cracked mud */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#d8b27c');
            g.strokeStyle = 'rgba(120,70,30,.35)'; g.lineWidth = 1.5;
            for (i = 1; i < ALT.n - 1; i++) { p = altSide(i, (rnd() - 0.5) * 2 * ALT.hw); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + (rnd() - 0.5) * 24, p.y + (rnd() - 0.5) * 24); g.lineTo(p.x + (rnd() - 0.5) * 30, p.y + (rnd() - 0.5) * 30); g.stroke(); }
            [[2 * ALT.hw + 70, '#7a3518'], [2 * ALT.hw + 50, '#4a1e0c'], [2 * ALT.hw + 28, '#1f0c05']].forEach(function (st) { strokeAlt(g, ALT.g0, ALT.g1, st[0], st[1], []); });
            g.save(); g.translate(ALT.x[ALT.ramp], ALT.y[ALT.ramp]); g.rotate(ALT.ang[ALT.ramp]);  /* a wooden ramp */
            g.fillStyle = 'rgba(60,30,10,.35)'; g.fillRect(-16, -ALT.hw + 3, 34, 2 * ALT.hw - 4);
            for (k = -ALT.hw + 4; k < ALT.hw - 4; k += 8) { g.fillStyle = (k / 8) % 2 ? '#c08a4f' : '#a8743f'; g.fillRect(-18, k, 34, 7); }
            g.restore();
            rail(g, HW + 46, 4, null, function (pt, j) {  /* red rock boulders lining the road */
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
            for (i = 0; i < 3; i++) {  /* tumbleweeds */
                var w = this.weeds[i], wx = w.x0 + w.ux * w.s, wy = w.y0 + w.uy * w.s;
                if (c.z > 10 || Math.hypot(c.x - wx, c.y - wy) > R + 16 || clock - (c.weedT || -9) < 1) continue;
                c.weedT = clock; c.vx *= 0.65; c.vy *= 0.65; c.a += (Math.random() - 0.5) * 0.5; stat('tumbleweed');
                sfx(c, 'hit'); if (quiet(c, 3)) say('Tumbleweed!', c);
            }
        },
        update: function (dt) {
            this.weeds.forEach(function (w) { w.s += w.sp * dt; w.rot += w.sp * dt / 16; if (w.s > 340) w.s = -340 - Math.random() * 200; });
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
        },
        under: function () {
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

    /* Blossom Sky Town: an original bright cel-shaded town, petal whirlwinds, boost rings, a rooftop beam shortcut */
    var SKY = {
        id: 'sky', name: 'Blossom Town', blurb: 'Petal whirlwinds, boost rings, a rooftop beam',
        poly: [100, 0, 1300, 0, 1500, 200, 1500, 500, 1000, 500, 800, 700, 1200, 1000, 0, 1000, 0, 600, 400, 350, 0, 200], round: 120, scale: 1, start: 0.04,
        phys: { vmax: 340, vgrass: 100, acc: 380, grip: 8.5, gripOff: 5, coast: 0.7, turn: 3.2, care: 1 },
        col: { bg: '#fdf2e9', edge: '#2b2340', road: '#6b6fa8', panel: 'rgba(255,255,255,.85)', mini: '#8b8fc8' },
        alt: { a: 165, b: 255, hw: 22, vf: 1, edge: true }, fallSay: 'Off the roof! Back you go.', noGantry: true,
        pads: [[90, 0.5], [300, -0.5]], picks: [60, 210], padCol: ['#ec4899', '#fce7f3'],
        reset: function () { this.whirls.forEach(function (w) { w.hitT = -9; }); },
        prep: function () {
            this.rings = [[25, 0], [330, 0.3], [430, -0.2]].map(function (d) { var q = side(d[0], d[1] * HW); return { x: q.x, y: q.y, a: A[d[0]] }; });
            this.whirls = [[70, 1], [320, -1]].map(function (d) { var q = side(d[0], 0); return { cx: q.x, cy: q.y, dir: d[1], x: q.x, y: q.y }; });
            this.gateAt = 8;
            this.strings = [140, 280, 380];
            var q2 = { x: WW / 2, y: WH / 2 }; this.balloon = q2;
        },
        paint: function (g) {
            var i, k, p, OLc = '#2b2340';
            g.fillStyle = '#fdf2e9'; g.fillRect(0, 0, WW, WH);
            g.strokeStyle = '#efe2d2'; g.lineWidth = 10;  /* the little streets */
            for (i = 0; i < WW; i += 160) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, WH); g.stroke(); }
            for (i = 0; i < WH; i += 160) { g.beginPath(); g.moveTo(0, i); g.lineTo(WW, i); g.stroke(); }
            seed = 17;
            var ROOF = ['#ffb3c7', '#9be3de', '#ffe08a', '#c7b8ff', '#a7e3a1', '#ffc59e'], o = { x: 0, y: 0 }, houses = this.houses = [];
            function clear(x, y) { o.x = x; o.y = y; nearest(o); return o.dist > HW + 40; }
            for (var gx = 10; gx < WW; gx += 160) for (var gy = 10; gy < WH; gy += 160) {  /* houses with bold outlines, flat roofs */
                var w = 90 + rnd() * 40, h = 80 + rnd() * 50, x = gx + 8 + rnd() * (140 - w), y = gy + 8 + rnd() * (140 - h);
                if (!(clear(x, y) && clear(x + w, y) && clear(x, y + h) && clear(x + w, y + h) && clear(x + w / 2, y + h / 2))) continue;
                if (rnd() < 0.3) {  /* a cherry tree instead */
                    for (k = 0; k < 5; k++) {
                        var tx = x + w / 2 + Math.cos(k * 1.3) * 22, ty = y + h / 2 + Math.sin(k * 1.3) * 18;
                        circle(g, tx + 4, ty + 6, 22, 'rgba(43,35,64,.15)');
                    }
                    for (k = 0; k < 5; k++) {
                        tx = x + w / 2 + Math.cos(k * 1.3) * 22; ty = y + h / 2 + Math.sin(k * 1.3) * 18;
                        g.fillStyle = '#ffc4dd'; g.strokeStyle = OLc; g.lineWidth = 3; g.beginPath(); g.arc(tx, ty, 22, 0, 7); g.fill(); g.stroke();
                    }
                    for (k = 0; k < 5; k++) { tx = x + w / 2 + Math.cos(k * 1.3) * 22; ty = y + h / 2 + Math.sin(k * 1.3) * 18; circle(g, tx + 6, ty + 6, 12, '#ff9cc4'); circle(g, tx - 7, ty - 7, 5, '#fff0f6'); }
                    continue;
                }
                g.fillStyle = 'rgba(43,35,64,.2)'; g.fillRect(x + 8, y + 10, w + 8, h + 8);  /* the shadow; the house stands up in over() */
                g.fillStyle = OLc; g.fillRect(x - 2, y - 2, w + 4, h + 4);
                houses.push({ x: x, y: y, w: w, h: h, col: ROOF[Math.floor(rnd() * ROOF.length)], hi: 0.03 + rnd() * 0.035, sky: [], ac: false, neon: rnd() < 0.45 ? (rnd() < 0.5 ? '#ff4fa3' : '#36e2ff') : null, ol: OLc });
            }
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 50, 'rgba(43,35,64,.55)');  /* the rooftop beam shortcut over a deep street */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 8, OLc);
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#f4f1ff');
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw - 10, '#ff6b8b', [12, 12]);
            kerbs(g, 2 * HW + 24, '#ffffff', '#ff6b8b');
            strokeLoop(g, 0, N, 2 * HW + 10, OLc);  /* the road, cel shaded */
            strokeLoop(g, 0, N, 2 * HW, '#6b6fa8');
            strokeLoop(g, 0, N, 2 * HW - 18, '#7c80b8');
            skids(g, 'rgba(43,35,64,.18)');
            strokeLoop(g, 0, N, 4, '#ffffff', [26, 20]);
            for (i = 0; i < N; i += 3) for (k = -1; k <= 1; k += 2) {  /* petals on the road */
                if (rnd() < 0.5) continue;
                p = side(i, k * rnd() * HW); g.fillStyle = '#ffc4dd'; g.beginPath(); g.ellipse(p.x, p.y, 3, 1.8, rnd() * 3, 0, 7); g.fill();
            }
            this.rings.forEach(function (r) { g.fillStyle = 'rgba(43,35,64,.18)'; g.beginPath(); g.ellipse(r.x + 6, r.y + 10, 22, 12, r.a, 0, 7); g.fill(); });
        },
        effect: function (c) {
            var i, r;
            for (i = 0; i < this.rings.length; i++) {  /* boost rings */
                r = this.rings[i];
                if (Math.hypot(c.x - r.x, c.y - r.y) < 22 && clock - (c.ringT || -9) > 0.6) {
                    c.ringT = clock; c.boost = Math.max(c.boost, 1.1); stat('ring');
                    sfx(c, 'point');
                }
            }
            for (i = 0; i < this.whirls.length; i++) {  /* blossom whirlwinds spin you round */
                var w = this.whirls[i];
                if (c.z > 10 || Math.hypot(c.x - w.x, c.y - w.y) > R + 22 || clock - (c.whirlT || -9) < 1.5) continue;
                c.whirlT = clock; stat('whirl');
                if (spinOut(c, 0.8, 'Whirl! A blossom whirlwind!')) for (var k = 0; k < 8; k++) puff('petal', c.x, c.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, 0.9, 4);
            }
        },
        update: function (dt) {
            this.whirls.forEach(function (w, n) {  /* each whirlwind wanders back and forth across the road */
                w.x = w.cx + Math.cos(clock * 0.5 * w.dir + n) * 95; w.y = w.cy + Math.sin(clock * 0.7 * w.dir + n * 2) * 70;
                if (vis(w.x, w.y, 60) && Math.random() < 0.35) puff('petal', w.x + (Math.random() - 0.5) * 30, w.y + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 1, 3.5);
            });
            if (Math.random() < 0.3) puff('petal', VX0 + Math.random() * (VX1 - VX0), VY0 + Math.random() * (VY1 - VY0), 30 + Math.random() * 30, 20 + Math.random() * 20, 2.5, 3);
            var b = this.balloon;
            b.x = WW / 2 + Math.cos(clock * 0.06) * WW * 0.3; b.y = WH / 2 + Math.sin(clock * 0.08) * WH * 0.25;
        },
        under: function () {
            this.whirls.forEach(function (w) {
                if (!vis(w.x, w.y, 50)) return;
                ctx.strokeStyle = 'rgba(255,140,190,.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
                for (var k = 0; k < 3; k++) {
                    ctx.beginPath();
                    for (var t = 0; t < 1; t += 0.08) { var a = clock * 6 + k * 2.1 + t * 7, r = 6 + t * 26; ctx.lineTo(w.x + Math.cos(a) * r, w.y + Math.sin(a) * r * 0.8); }
                    ctx.stroke();
                }
            });
            drawParts('petal');
        },
        over: function () {
            var i, k, OLc = '#2b2340';
            for (i = 0; i < this.houses.length; i++) block(this.houses[i], ['#fff4ea', '#f1dfd0'], '#8fd3f4');
            this.rings.forEach(function (r, n) {  /* glowing boost rings, standing up over the road */
                if (!vis(r.x, r.y, 40)) return;
                ctx.save(); ctx.translate(r.x, r.y - 8); ctx.rotate(r.a + Math.PI / 2);
                ctx.lineWidth = 9; ctx.strokeStyle = OLc; ctx.beginPath(); ctx.ellipse(0, 0, 9, 26, 0, 0, 7); ctx.stroke();
                ctx.lineWidth = 5; ctx.strokeStyle = n % 2 ? '#36e2ff' : '#ff6bb5'; ctx.stroke();
                ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(clock * 8)).toFixed(2) + ')'; ctx.stroke();
                ctx.restore();
            });
            var g0 = this.gateAt, pl = side(g0, -HW - 14), pr = side(g0, HW + 14), ga = A[g0];
            if (vis(pl.x, pl.y, 160)) {  /* a big red gate over the start straight (an original design) */
                ctx.lineCap = 'round';
                [[pl, pr]].forEach(function (pp) {
                    var a = pp[0], b = pp[1], dx = Math.cos(ga) * 10, dy = Math.sin(ga) * 10;
                    ctx.strokeStyle = 'rgba(43,35,64,.25)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(a.x + 12, a.y + 16); ctx.lineTo(b.x + 12, b.y + 16); ctx.stroke();
                    ctx.strokeStyle = OLc; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(a.x - dx * 0.6, a.y - dy * 0.6); ctx.lineTo(b.x - dx * 0.6, b.y - dy * 0.6); ctx.stroke();
                    ctx.strokeStyle = '#e8452c'; ctx.lineWidth = 10; ctx.stroke();
                    ctx.strokeStyle = OLc; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(a.x + dx, a.y + dy); ctx.lineTo(b.x + dx, b.y + dy); ctx.stroke();
                    ctx.strokeStyle = '#ff6a4d'; ctx.lineWidth = 7; ctx.stroke();
                    [a, b].forEach(function (q) { circle(ctx, q.x, q.y, 10, OLc); circle(ctx, q.x, q.y, 7, '#e8452c'); circle(ctx, q.x - 2, q.y - 2, 2.5, '#ffb199'); });
                });
            }
            this.strings.forEach(function (j) {  /* strings of paper lanterns across the road */
                var a = side(j, -HW - 18), b = side(j, HW + 18);
                if (!vis(a.x, a.y, 140)) return;
                ctx.strokeStyle = OLc; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 14, b.x, b.y); ctx.stroke();
                for (k = 1; k < 6; k++) {
                    var t = k / 6, lx = a.x + (b.x - a.x) * t, ly = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 12;
                    ctx.fillStyle = k % 2 ? '#ff5a5f' : '#fff4e0'; ctx.strokeStyle = OLc; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.ellipse(lx, ly + 4, 5, 7, 0, 0, 7); ctx.fill(); ctx.stroke();
                }
            });
            var bl = this.balloon;  /* the giant star balloon floating over town (an original mascot) */
            if (vis(bl.x, bl.y, 200)) {
                ctx.fillStyle = 'rgba(43,35,64,.15)'; ctx.beginPath(); ctx.ellipse(bl.x + 60, bl.y + 90, 70, 40, 0, 0, 7); ctx.fill();
                ctx.save(); ctx.translate(bl.x, bl.y); ctx.rotate(Math.sin(clock * 0.8) * 0.08);
                ctx.strokeStyle = OLc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 60); ctx.quadraticCurveTo(14, 100, 0, 140); ctx.stroke();
                ctx.beginPath();
                for (i = 0; i < 10; i++) { var rr2 = i % 2 ? 40 : 82, aa = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); }
                ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = OLc; ctx.stroke(); ctx.lineWidth = 10; ctx.strokeStyle = '#ffd84d'; ctx.stroke(); ctx.fillStyle = '#ffd84d'; ctx.fill();
                ctx.fillStyle = '#ffeaa0'; ctx.beginPath(); ctx.ellipse(-18, -22, 16, 9, -0.5, 0, 7); ctx.fill();
                circle(ctx, -14, 2, 5, OLc); circle(ctx, 14, 2, 5, OLc); circle(ctx, -12, 0, 1.8, '#fff'); circle(ctx, 16, 0, 1.8, '#fff');
                circle(ctx, -26, 14, 6, '#ff9cc4'); circle(ctx, 26, 14, 6, '#ff9cc4');
                ctx.strokeStyle = OLc; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 10, 8, 0.3, Math.PI - 0.3); ctx.stroke();
                ctx.restore();
            }
        },
        screen: function () {  /* speed lines while you boost */
            if (!(me.boost > 0) || phase !== 'race') return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath();
            for (var k = 0; k < 26; k++) {
                var a = k * 0.2417 * Math.PI * 2 + clock * 0.3, r0 = Math.max(W, H) * (0.42 + 0.08 * Math.sin(clock * 30 + k)), r1 = Math.max(W, H) * 0.75;
                ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1);
            }
            ctx.stroke();
        }
    };
    /* shared bits for the newer tracks */
    function pillar(x, y, r, h, side, top) {  /* something round standing up: its side up to the lifted top; returns the top centre */
        var tx = liftX(x, h), ty = liftY(y, h), dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * r, ny = dx / d * r;
        ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.lineTo(tx + nx, ty + ny); ctx.lineTo(tx - nx, ty - ny); ctx.lineTo(x - nx, y - ny); ctx.fill();
        circle(ctx, x, y, r, side);
        if (top) circle(ctx, tx, ty, r, top);
        return { x: tx, y: ty };
    }
    function hear(x, y, r, n) {  /* a sound for the players at this device who are near (x, y); nothing is sent: every device works it out */
        if (!me) return;
        if (Math.hypot(me.x - x, me.y - y) < r || (split && Math.hypot(pal.x - x, pal.y - y) < r)) api.sfx(n);
    }
    function locals() { return split ? [karts[0], karts[1]] : [me]; }  /* the karts driven at this device */
    var noteAC = null, noteOut = null, PENT = [0, 2, 4, 7, 9];
    function note(k, type, dur, vol) {  /* a musical note, k steps up a two octave pentatonic scale from middle C and back */
        try {
            if (!noteAC) {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                noteAC = new AC(); noteOut = noteAC.createGain(); noteOut.gain.value = 0.28; noteOut.connect(noteAC.destination);
            }
            noteOut.gain.value = 0.28 * (window.Arcade && Arcade.sfxLevel ? Arcade.sfxLevel() : 1);   /* the Effects slider */
            if (noteAC.state === 'suspended') noteAC.resume();
            if (!noteOut.gain.value) return;
            var m = ((k % 18) + 18) % 18; if (m > 9) m = 18 - m;
            var f = 261.63 * Math.pow(2, (Math.floor(m / 5) * 12 + PENT[m % 5]) / 12) * (type === 'sine' ? 2 : 1);
            var t = noteAC.currentTime + 0.005, o = noteAC.createOscillator(), g = noteAC.createGain();
            o.type = type; o.frequency.setValueAtTime(f, t);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(noteOut); o.start(t); o.stop(t + dur + 0.05);
        } catch (e) { /* no sound: fine */ }
    }
    function quad(g, a, b, c, d) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); }
    function lerp(a, b, f) { return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; }

    /* Melody Lane: a road over giant sheet music. Stretches of piano keyboard play a note under every wheel, notes hop
       across the road, a giant metronome swings its weight over it, and a narrow xylophone bridge is the shortcut */
