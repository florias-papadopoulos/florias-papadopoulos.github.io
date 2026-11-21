    var MUSIC = {
        id: 'music', name: 'Melody Lane', blurb: 'Singing piano keys, hopping notes, a xylophone bridge',
        ctrl: [300, 300, 700, 200, 1100, 260, 1400, 180, 1700, 300, 1720, 600, 1500, 700, 1300, 620, 1150, 760, 1300, 940, 1600, 1000,
               1620, 1250, 1250, 1320, 900, 1200, 700, 1300, 400, 1250, 250, 1000, 450, 820, 300, 600], scale: 0.92, start: 0,
        phys: { vmax: 335, vgrass: 100, acc: 370, grip: 8, gripOff: 5, coast: 0.65, turn: 3.15, care: 1 },
        col: { bg: '#f6f0e4', edge: '#2d2a3a', road: '#3a3550', panel: 'rgba(255,255,255,.85)', mini: '#8b86a8' },
        alt: { a: 246, b: 338, hw: 30, vf: 1, edge: true, ein: 8, via: [[246, 338, 0.5]] }, fallSay: 'Off the xylophone! Back you go.',
        pads: [[60, 0.5], [250, -0.5]], picks: [30, 200, 420], padCol: ['#f59e0b', '#fff7d6'], gantry: ['#2d2a3a', '#f59e0b'],
        keys: [[90, 140], [150, 196], [400, 446]],
        inKeys: function (i) { for (var s = 0; s < this.keys.length; s++) { var k = this.keys[s]; if (i >= k[0] && i < k[1]) return s * 40 + Math.floor((i - k[0]) / 2); } return -1; },
        prep: function () {
            this.hops = [[110, 0, 1.25], [124, 2.4, 1.05], [235, 1.1, 1.4], [440, 3, 1.2]].map(function (d) { return { j: d[0], ph: d[1], w: d[2], x: 0, y: 0, z: 0 }; });
            var mj = 300; this.metro = { j: mj, p: side(mj, -(HW + 76)), a0: A[mj] + Math.PI / 2, L: 2 * HW + 76, x: 0, y: 0, th: 0, last: 0 };
            seed = 31;
            var sp = spots(3, 420, 230);
            this.piano = sp[0]; this.drums = sp[1]; this.stand = sp[2];
            var staves = this.staves = [];
            for (var k = 0; k < 9; k++) staves.push({ y: (k + 0.5) * WH / 9 + (rnd() - 0.5) * 60, a: 30 + rnd() * 50, f: 0.002 + rnd() * 0.002, ph: rnd() * 7 });
            this.update(0);
        },
        paint: function (g) {
            var i, k, p, self = this;
            g.fillStyle = '#f6f0e4'; g.fillRect(0, 0, WW, WH);
            blotch(g, ['#efe2cc', '#fffaf0', '#ece4f7', '#fde7ef'], 140, 31, 0.8);
            g.strokeStyle = 'rgba(70,60,100,.28)'; g.lineWidth = 2;
            this.staves.forEach(function (s, n) {  /* sheet music: five lines, with notes sitting on them */
                for (k = 0; k < 5; k++) {
                    g.beginPath();
                    for (var x = 0; x <= WW; x += 20) { var y = s.y + Math.sin(x * s.f + s.ph) * s.a + k * 14; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
                    g.stroke();
                }
                seed = 50 + n;
                for (var x2 = 60 + rnd() * 80; x2 < WW; x2 += 70 + rnd() * 90) {
                    var st = Math.floor(rnd() * 9), y2 = s.y + Math.sin(x2 * s.f + s.ph) * s.a + st * 7, up = st > 4 ? -1 : 1;
                    g.fillStyle = '#3a3550'; g.save(); g.translate(x2, y2); g.rotate(-0.35); g.beginPath(); g.ellipse(0, 0, 8, 5.5, 0, 0, 7);
                    if (rnd() < 0.3) { g.lineWidth = 2.2; g.strokeStyle = '#3a3550'; g.stroke(); } else g.fill();
                    g.restore();
                    g.strokeStyle = '#3a3550'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x2 + 7 * up, y2); g.lineTo(x2 + 7 * up, y2 - 34 * up); g.stroke();
                    if (rnd() < 0.4) { g.lineWidth = 4; g.beginPath(); g.moveTo(x2 + 7 * up, y2 - 34 * up); g.quadraticCurveTo(x2 + 7 * up + 12, y2 - 24 * up, x2 + 7 * up + 9, y2 - 12 * up); g.stroke(); }
                    g.strokeStyle = 'rgba(70,60,100,.28)'; g.lineWidth = 2;
                }
            });
            [this.piano, this.drums, this.stand].forEach(function (q) { if (q) circle(g, q.x + 24, q.y + 30, 150, 'rgba(60,50,80,.12)'); });
            /* the xylophone bridge: two wooden rails and bars in rainbow colours, no sides to stop you */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 26, 'rgba(60,50,80,.18)');
            for (k = -1; k <= 1; k += 2) {
                g.beginPath();
                for (i = 0; i < ALT.n; i++) { p = altSide(i, k * (ALT.hw - 4)); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
                g.lineWidth = 8; g.strokeStyle = '#8a5a2b'; g.stroke();
            }
            var XC = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];
            for (i = 1; i < ALT.n - 1; i += 2) {
                g.save(); g.translate(ALT.x[i], ALT.y[i]); g.rotate(ALT.ang[i]);
                g.fillStyle = 'rgba(40,30,20,.3)'; rr(g, -ALT.step * 0.7 + 3, -ALT.hw - 4, ALT.step * 1.4, 2 * ALT.hw + 14, 5); g.fill();
                g.fillStyle = XC[(i >> 1) % 7]; rr(g, -ALT.step * 0.7, -ALT.hw - 8 + (i >> 1) % 3, ALT.step * 1.4, 2 * ALT.hw + 16 - ((i >> 1) % 3) * 2, 5); g.fill();
                g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-ALT.step * 0.5, -ALT.hw - 4, ALT.step * 0.35, 2 * ALT.hw + 8);
                circle(g, 0, -ALT.hw + 2, 2.5, '#d6d3d1'); circle(g, 0, ALT.hw - 2, 2.5, '#d6d3d1');
                g.restore();
            }
            road(g, { shadow: [5, 8, 'rgba(60,50,80,.22)'], edgeW: 14, edge: '#f2c14e', line: '#2d2a3a', rim: '#2a2638', col: '#3a3550', crown: 'rgba(255,255,255,.05)' });
            grain(g, 900, ['rgba(255,255,255,.12)'], 2.5, 0, HW - 8, 32);
            skids(g, 'rgba(0,0,0,.25)');
            strokeLoop(g, 0, N, 3, 'rgba(242,193,78,.7)', [6, 26]);  /* a dotted gold middle line */
            this.keys.forEach(function (s) {  /* stretches of piano keyboard: white keys across the road, black ones on the left half */
                for (i = s[0]; i < s[1]; i += 2) {
                    quad(g, side(i, -HW + 2), side(i, HW - 2), side(i + 2, HW - 2), side(i + 2, -HW + 2));
                    g.fillStyle = '#fbfaf7'; g.fill(); g.strokeStyle = '#9ca3af'; g.lineWidth = 1.5; g.stroke();
                    var sh = side(i + 2, HW - 2), sh2 = side(i + 2, HW - 12), sh3 = side(i, HW - 12), sh4 = side(i, HW - 2);
                    quad(g, sh4, sh, sh2, sh3); g.fillStyle = 'rgba(160,150,180,.25)'; g.fill();
                }
                for (i = s[0]; i < s[1] - 2; i += 2) {
                    var kk = ((i - s[0]) >> 1) % 7;
                    if (kk === 2 || kk === 6) continue;
                    var b = i + 2, l0 = -HW + 2, l1 = -HW + 2 + 1.25 * HW;
                    quad(g, lerp(side(b - 1, l0), side(b, l0), 0.45), lerp(side(b - 1, l1), side(b, l1), 0.45), lerp(side(b, l1), side(b + 1, l1), 0.55), lerp(side(b, l0), side(b + 1, l0), 0.55));
                    g.fillStyle = '#1f1d2b'; g.fill();
                    var hl = lerp(side(b - 1, l1 - 8), side(b, l1 - 8), 0.6), hl2 = lerp(side(b, l1 - 8), side(b + 1, l1 - 8), 0.4);
                    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(hl.x, hl.y); g.lineTo(hl2.x, hl2.y); g.stroke();
                }
            });
            self = null;
        },
        effect: function (c) {
            var i, h;
            if (!c.alt && c.z <= 0 && this.inKeys(c.idx) >= 0) c.loose = Math.max(c.loose, 0.06);  /* polished keys: a little slidey */
            if (c.z > 8) return;
            for (i = 0; i < this.hops.length; i++) {  /* the hopping notes: only when they touch down */
                h = this.hops[i];
                if (h.z < 7 && Math.hypot(c.x - h.x, c.y - h.y) < R + 13 && clock - (c.hopT || -9) > 1) { c.hopT = clock; stat('hop'); spinOut(c, 0.7, 'Bonk! A hopping note!'); }
            }
            var m = this.metro, dx = c.x - m.x, dy = c.y - m.y, d = Math.hypot(dx, dy);
            if (d < R + 17 && d > 0.1) {  /* the metronome weight knocks you aside */
                c.x = m.x + dx / d * (R + 17); c.y = m.y + dy / d * (R + 17);
                c.vx += dx / d * 120; c.vy += dy / d * 120;
                if (clock - (c.metT || -9) > 1) { c.metT = clock; stat('metronome'); spinOut(c, 0.6, 'Tick tock! The metronome got you!'); }
            }
        },
        update: function () {
            var i, h, self = this;
            for (i = 0; i < this.hops.length; i++) {  /* notes hop back and forth across the road, from the clock alone */
                h = this.hops[i];
                var p = side(h.j, Math.sin(clock * h.w * 0.6 + h.ph) * (HW + 16));
                h.x = p.x; h.y = p.y; h.z = Math.abs(Math.sin(clock * h.w * 2.2 + h.ph)) * 34;
            }
            var m = this.metro, th = Math.sin(clock * 1.7) * 0.95;
            m.th = th; m.x = m.p.x + Math.cos(m.a0 + th) * m.L; m.y = m.p.y + Math.sin(m.a0 + th) * m.L;
            var sg = Math.cos(clock * 1.7) > 0 ? 1 : -1;
            if (sg !== m.last) { m.last = sg; if (phase === 'race' || phase === 'count') hear(m.x, m.y, 520, 'tap'); }  /* tick, tock */
            if (phase !== 'race' && phase !== 'done') return;
            locals().forEach(function (c) {  /* the keys and the xylophone bars sing under the players' wheels */
                if (c.fall > 0 || c.z > 2) return;
                var k = -1, xy = false;
                if (c.alt && c.on) { k = 100 + (c.ai >> 1); xy = true; }
                else if (c.on) k = self.inKeys(c.idx);
                if (k >= 0 && k !== c.keyK && Math.abs(c.vf) > 20) note(xy ? k - 100 + 4 : k, xy ? 'sine' : 'triangle', xy ? 0.45 : 0.3, xy ? 0.5 : 0.42);
                c.keyK = k;
            });
        },
        under: function () {
            var i, c, k, self = this;
            for (i = 0; i < 4; i++) {  /* a key goes down under a kart */
                c = karts[i];
                if (c.alt || !c.on || !vis(c.x, c.y, 60)) continue;
                k = self.inKeys(c.idx);
                if (k < 0) continue;
                var j = c.idx - ((c.idx - self.keys[Math.floor(k / 40)][0]) % 2);
                quad(ctx, side(j, -HW + 2), side(j, HW - 2), side(j + 2, HW - 2), side(j + 2, -HW + 2)); ctx.fillStyle = 'rgba(120,110,160,.28)'; ctx.fill();
            }
            this.hops.forEach(function (h) {  /* shadows of the hopping notes, darker as they come down */
                if (!vis(h.x, h.y, 40)) return;
                ctx.fillStyle = 'rgba(30,20,50,' + (0.35 - h.z / 120).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 16 - h.z / 6, 9 - h.z / 10, 0, 0, 7); ctx.fill();
            });
            var m = this.metro;  /* where the metronome weight sweeps: a faint arc on the road */
            if (vis(m.p.x, m.p.y, m.L + 30)) {
                ctx.strokeStyle = 'rgba(245,158,11,.25)'; ctx.lineWidth = 34; ctx.lineCap = 'butt';
                ctx.beginPath(); ctx.arc(m.p.x, m.p.y, m.L, m.a0 - 0.95, m.a0 + 0.95); ctx.stroke(); ctx.lineCap = 'round';
            }
        },
        over: function () {
            var k, m = this.metro;
            this.hops.forEach(function (h, n) {  /* the hopping notes: a black head, a stem and a flag, with a face */
                if (!vis(h.x, h.y, 80)) return;
                var x = h.x, y = h.y - h.z;
                ctx.save(); ctx.translate(x, y);
                ctx.fillStyle = '#2d2a3a'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, -0.35, 0, 7); ctx.fill();
                ctx.strokeStyle = '#2d2a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(12, -44); ctx.stroke();
                ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(12, -44); ctx.quadraticCurveTo(28, -34, 24, -20); ctx.stroke();
                circle(ctx, -4, -2, 3, '#fff'); circle(ctx, 4, -4, 3, '#fff'); circle(ctx, -3.5, -1.5, 1.4, '#2d2a3a'); circle(ctx, 4.5, -3.5, 1.4, '#2d2a3a');
                ctx.fillStyle = n % 2 ? '#f472b6' : '#facc15'; ctx.beginPath(); ctx.ellipse(-8, 4, 3, 2, 0, 0, 7); ctx.fill();
                ctx.restore();
            });
            if (vis(m.p.x, m.p.y, m.L + 60)) {  /* the giant metronome beside the road: its body, the swinging arm and weight */
                var bx = m.p.x - Math.cos(m.a0) * 30, by = m.p.y - Math.sin(m.a0) * 30;
                ctx.save(); ctx.translate(bx, by); ctx.rotate(m.a0);
                ctx.fillStyle = 'rgba(30,20,50,.25)'; ctx.beginPath(); ctx.moveTo(-40, -44); ctx.lineTo(48, -16); ctx.lineTo(48, 16); ctx.lineTo(-40, 44); ctx.fill();
                ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.moveTo(-46, -40); ctx.lineTo(40, -14); ctx.lineTo(40, 14); ctx.lineTo(-46, 40); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#b07a43'; ctx.beginPath(); ctx.moveTo(-36, -28); ctx.lineTo(30, -8); ctx.lineTo(30, 8); ctx.lineTo(-36, 28); ctx.closePath(); ctx.fill();
                ctx.restore();
                ctx.strokeStyle = '#d6d3d1'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.p.x, m.p.y); ctx.lineTo(m.x, m.y); ctx.stroke();
                ctx.strokeStyle = '#78716c'; ctx.lineWidth = 2; ctx.stroke();
                circle(ctx, m.x + 4, m.y + 6, 17, 'rgba(30,20,50,.25)');
                ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a0 + m.th);
                ctx.fillStyle = '#f59e0b'; rrect(-14, -17, 28, 34, 6); ctx.fill(); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = '#fde68a'; ctx.fillRect(-10, -12, 6, 24);
                ctx.restore();
                circle(ctx, m.p.x, m.p.y, 8, '#57534e'); circle(ctx, m.p.x, m.p.y, 4, '#d6d3d1');
            }
            var q = this.piano;
            if (q && vis(q.x, q.y, 220)) {  /* a grand piano, its lid propped open */
                ctx.save(); ctx.translate(q.x, q.y);
                var top = { x: liftX(q.x, 0.05) - q.x, y: liftY(q.y, 0.05) - q.y }, lid = { x: liftX(q.x, 0.11) - q.x, y: liftY(q.y, 0.11) - q.y };
                function body(dx, dy, s) { ctx.beginPath(); ctx.moveTo(dx - 90 * s, dy - 60 * s); ctx.lineTo(dx + 90 * s, dy - 60 * s); ctx.lineTo(dx + 90 * s, dy + 20 * s); ctx.bezierCurveTo(dx + 90 * s, dy + 90 * s, dx + 10 * s, dy + 40 * s, dx - 20 * s, dy + 110 * s); ctx.lineTo(dx - 90 * s, dy + 110 * s); ctx.closePath(); }
                ctx.fillStyle = '#111018'; body(0, 0, 1); ctx.fill(); body(top.x, top.y, 1); ctx.fill();
                ctx.fillStyle = '#2d2a3a'; body(top.x, top.y, 0.92); ctx.fill();
                ctx.fillStyle = '#fbfaf7'; ctx.fillRect(top.x - 88, top.y - 82, 176, 22);
                ctx.fillStyle = '#1f1d2b'; for (k = 0; k < 15; k++) if (k % 7 !== 2 && k % 7 !== 6) ctx.fillRect(top.x - 80 + k * 11.5, top.y - 82, 6, 13);
                ctx.fillStyle = 'rgba(60,55,80,.85)'; body(lid.x, lid.y, 0.95); ctx.fill();
                ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 3; body(lid.x, lid.y, 0.95); ctx.stroke();
                ctx.restore();
            }
            q = this.drums;
            if (q && vis(q.x, q.y, 220)) {  /* a drum kit: drums and a cymbal standing up */
                [[0, 0, 62, 0.06, '#dc2626'], [-90, -40, 34, 0.08, '#2563eb'], [80, -50, 32, 0.08, '#2563eb'], [-70, 60, 30, 0.07, '#2563eb']].forEach(function (d) {
                    var t = pillar(q.x + d[0], q.y + d[1], d[2], d[3], d[4], '#f5f5f4');
                    ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(t.x, t.y, d[2] - 2, 0, 7); ctx.stroke();
                });
                var cy = pillar(q.x + 100, q.y + 50, 3, 0.14, '#78716c', null);
                circle(ctx, cy.x, cy.y, 40, '#eab308'); circle(ctx, cy.x, cy.y, 30, '#facc15'); circle(ctx, cy.x, cy.y, 6, '#a16207');
            }
            q = this.stand;
            if (q && vis(q.x, q.y, 200)) {  /* a big trumpet lying in the grass */
                ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(-0.5);
                ctx.fillStyle = 'rgba(60,50,80,.2)'; ctx.fillRect(-100, 12, 180, 20);
                ctx.fillStyle = '#eab308'; ctx.fillRect(-110, -8, 160, 16);
                ctx.beginPath(); ctx.moveTo(40, -8); ctx.lineTo(110, -50); ctx.lineTo(110, 50); ctx.lineTo(40, 8); ctx.fill();
                ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(110, 0, 14, 50, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(112, 0, 8, 38, 0, 0, 7); ctx.fill();
                for (k = 0; k < 3; k++) { circle(ctx, -40 + k * 22, -16, 7, '#ca8a04'); circle(ctx, -40 + k * 22, -16, 4, '#fde68a'); }
                ctx.restore();
            }
        },
        thumbDeco: function (g) { seed = 3; for (var i = 0; i < 12; i++) { g.fillStyle = '#3a3550'; g.fillRect(0, rnd() * WH, WW, 8); } }
    };
