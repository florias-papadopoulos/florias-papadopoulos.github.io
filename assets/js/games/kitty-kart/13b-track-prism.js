    /* Prism Skyway: a ribbon of colour high over a sea of clouds at sunset. Fluffy cloud banks guard the bends, the
       straights have open edges, grumpy storm clouds drift over the road, and the shortcut is a crystal bridge that
       fades in and out, across the big lobe on the left. Rainbows arch over the clouds, flocks of birds fly by in a
       V, cats wave from the baskets of the hot air balloons, and a crowd cheers from little clouds at the start */
    var RAINBOW = {
        id: 'rainbow', name: 'Prism Skyway', blurb: 'Open edges, storm clouds, a fading crystal bridge',
        ctrl: [500, 300, 950, 250, 1400, 250, 1900, 300, 2200, 500, 2150, 800, 1900, 850, 1500, 760, 1150, 800, 900, 1000, 1100, 1220,
               1450, 1150, 1800, 1250, 1950, 1550, 1750, 1800, 1300, 1820, 800, 1780, 450, 1680, 170, 1420, 130, 1000, 330, 620], scale: 0.95, start: 0.044,
        phys: { vmax: 350, vgrass: 120, acc: 330, grip: 5.4, gripOff: 3.5, coast: 0.5, turn: 3.0, care: 1.25 },
        col: { bg: '#3b2f6b', edge: '#ffffff', road: '#c4b5fd', panel: 'rgba(15,23,42,.6)', mini: '#e9d5ff', grid: 'rgba(255,255,255,.85)' },
        sky: true, G: 300,
        alt: { a: 358, b: 444, hw: 30, vf: 1, gate: { at: 0.28, open: 4.4, shut: 2.4 }, via: [[358, 444, 0.33], [358, 444, 0.66]] }, gate: 'fade', gateSoft: true,
        fallSay: 'Off the edge! A cloud carries you back.',
        pads: [[16, 0.5], [236, -0.5]], picks: [20, 156, 331], padCol: ['#f472b6', '#fdf2f8'], gantry: ['#7c3aed', '#facc15'],
        BANDS: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#748ffc', '#b197fc'],
        altGood: function (c) { var T = ((ALT.a - c.idx + N) % N * SP + this.s1 * ALT.step) / Math.max(c.vf, 150); return gateOpen(clock + T) > 0.6; },
        prep: function () {
            var i, k, g = this.guard = new Uint8Array(N);
            for (i = 0; i < N; i++) if (Math.abs(K[i]) > 0.0045) for (k = -10; k <= 26; k++) g[ix(i + k)] = 1;  /* longer after the bend, where karts run wide */  /* cloud banks round the bends */
            this.s0 = Math.round(ALT.n * 0.3); this.s1 = Math.round(ALT.n * 0.72);
            this.storms = [[46, 0], [221, 2.2], [316, 4.1]].map(function (d) { return { j: d[0], ph: d[1], x: 0, y: 0, p: 0 }; });
            seed = 81;
            this.puffs = [];  /* the cloud banks: puffs along the outside of the guarded bends */
            for (i = 0; i < N; i += 2) if (g[i]) for (k = -1; k <= 1; k += 2) {
                var q = side(i, k * (HW + 22 + rnd() * 8)), o = { x: q.x, y: q.y }; nearest(o);
                if (o.dist > HW + 14) this.puffs.push({ x: q.x, y: q.y, r: 16 + rnd() * 10 });
            }
            this.balloons = spots(4, 600, 260);
            seed = 83;
            this.bows = spots(3, 900, 320, this.balloons).map(function (b) { return { x: b.x, y: b.y, r: 220 + rnd() * 120, a: (rnd() - 0.5) * 0.8 }; });
            this.flocks = [0, 1, 2].map(function (n) { return { y: WH * (0.2 + n * 0.3), a: (n % 2 ? Math.PI : 0) + (rnd() - 0.5) * 0.5, sp: 70 + n * 15, ph: n * 900 }; });
            this.fans = [crowd(N - 24, N - 5, -(HW + 36), 2), crowd(N - 24, N - 5, HW + 36, 2)];
            this.update(0);
        },
        paint: function (g) {
            var i, k, self = this;
            g.clearRect(0, 0, WW, WH);  /* see-through: the sky and the cloud sea are drawn behind */
            g.save(); g.translate(14, 26); strokeLoop(g, 0, N, 2 * HW + 12, 'rgba(40,20,80,.28)'); strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 8, 'rgba(40,20,80,.22)'); g.restore();
            [[0, this.s0], [this.s1, ALT.n - 1]].forEach(function (e) {
                strokeAlt(g, e[0], e[1], 2 * ALT.hw + 8, '#e0f2fe', []); strokeAlt(g, e[0], e[1], 2 * ALT.hw - 4, '#bae6fd', []);
                for (var j = e[0] + 1; j < e[1]; j += 3) { var a = altSide(j, -ALT.hw), b = altSide(j, ALT.hw); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
            });
            strokeLoop(g, 0, N, 2 * HW + 12, '#ffffff');  /* the ribbon: a white rim and seven bands of colour */
            var bw = (2 * HW - 4) / 7;
            for (k = 0; k < 7; k++) offLine(g, -HW + 2 + bw * (k + 0.5), bw + 0.8, this.BANDS[k]);
            for (k = 1; k < 7; k++) offLine(g, -HW + 2 + bw * k, 1.2, 'rgba(255,255,255,.35)');
            seed = 82;
            for (i = 0; i < 260; i++) {  /* sparkles */
                var p = side(Math.floor(rnd() * N), (rnd() - 0.5) * 1.8 * HW), r = 1 + rnd() * 1.8;
                g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(p.x, p.y - r * 2); g.lineTo(p.x + r * 0.6, p.y); g.lineTo(p.x, p.y + r * 2); g.lineTo(p.x - r * 0.6, p.y); g.fill();
            }
            strokeLoop(g, 0, N, 3, 'rgba(255,255,255,.7)', [10, 30]);
            this.puffs.forEach(function (q) { circle(g, q.x + 6, q.y + 10, q.r, 'rgba(60,40,110,.25)'); });
            this.puffs.forEach(function (q) { circle(g, q.x, q.y, q.r, '#f5f3ff'); });
            this.puffs.forEach(function (q) { circle(g, q.x - q.r * 0.3, q.y - q.r * 0.35, q.r * 0.55, '#ffffff'); });
            self = null;
        },
        effect: function (c) {
            if (c.z > 0 || c.fall > 0) return;
            nearest(c);
            if (c.alt) {
                if (c.ai >= this.s0 && c.ai <= this.s1 && gateOpen(clock) < 0.5) { stat('fade'); fallOff(c, ALT.a); }
                return;
            }
            if (c.dist <= HW + 6) return;
            if (!this.guard[c.idx]) { stat('edge'); fallOff(c, c.idx); return; }
            var rim = HW + 8, nx = (c.x - c.px) / c.dist, ny = (c.y - c.py) / c.dist, vn = c.vx * nx + c.vy * ny;  /* a soft cloud bank: it bounces you back */
            c.x = c.px + nx * rim; c.y = c.py + ny * rim;
            if (vn > 0) { c.vx -= nx * vn * 1.5; c.vy -= ny * vn * 1.5; if (mine(c) && vn > 60 && clock - c.hitAt > 0.5) { c.hitAt = clock; sfx(c, 'move'); } }
        },
        update: function () {
            var self = this;
            this.storms.forEach(function (s) {  /* storm clouds drift across the road and zap, all from the clock */
                var q = side(s.j + Math.round(Math.sin(clock * 0.21 + s.ph) * 6), Math.sin(clock * 0.45 + s.ph) * HW * 0.9);
                s.x = q.x; s.y = q.y;
                var was = s.p; s.p = (clock + s.ph * 1.7) % 5;
                if (phase !== 'race') return;
                if (was < 3.8 && s.p >= 3.8) {
                    hear(s.x, s.y, 520, 'hit');
                    if (!remote) karts.forEach(function (c) {
                        if (c.z < 20 && !(c.fall > 0) && Math.hypot(c.x - s.x, c.y - s.y) < 46) { stat('zap'); spinOut(c, 0.9, 'Zap! A grumpy storm cloud!'); }
                    });
                }
            });
            void self;
        },
        under: function () {
            this.fans.forEach(function (g) {  /* the crowd sits on little clouds */
                if (!vis(g.x, g.y, g.r)) return;
                g.fans.forEach(function (f, n) { if (vis(f.x, f.y, 20)) { circle(ctx, f.x + 4, f.y + 8, 15, 'rgba(60,40,110,.25)'); circle(ctx, f.x, f.y + 2, 15, n % 2 ? '#f5f3ff' : '#ffffff'); } });
            });
            var o = gateOpen(clock);
            if (o > 0) {  /* the middle of the crystal bridge, fading in and out (it flickers just before it goes) */
                var fl = o < 1 && o > 0.3 ? 0.75 + 0.25 * Math.sin(clock * 40) : 1;
                ctx.globalAlpha = o * fl;
                strokeAlt(ctx, this.s0, this.s1, 2 * ALT.hw + 8, '#e0f2fe', []); strokeAlt(ctx, this.s0, this.s1, 2 * ALT.hw - 4, '#bae6fd', []);
                ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath();
                for (var j = this.s0 + 1; j < this.s1; j += 3) { var a = altSide(j, -ALT.hw), b = altSide(j, ALT.hw); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
                ctx.stroke(); ctx.globalAlpha = 1;
            }
            if (o < 1) {  /* where it was: a dotted outline */
                ctx.globalAlpha = 0.6 * (1 - o); strokeAlt(ctx, this.s0, this.s1, 2 * ALT.hw + 8, 'rgba(255,255,255,.7)', [6, 10]); ctx.globalAlpha = 1; ctx.setLineDash([]);
            }
            this.storms.forEach(function (s) {  /* the storm's shadow, and a warning ring while it charges */
                if (!vis(s.x, s.y, 60)) return;
                ctx.fillStyle = 'rgba(40,30,80,.22)'; ctx.beginPath(); ctx.ellipse(s.x + 10, s.y + 14, 40, 26, 0, 0, 7); ctx.fill();
                if (s.p > 2.6 && s.p < 3.8) warnRing({ x: s.x, y: s.y, t: (s.p - 2.6) * 1.17 }, '#facc15');
            });
        },
        over: function () {
            this.storms.forEach(function (s, n) {  /* grumpy little storm clouds */
                if (!vis(s.x, s.y - 50, 90)) return;
                var x = s.x, y = s.y - 46 + Math.sin(clock * 2 + n) * 3, dark = s.p > 2.6 && s.p < 4.2, k;
                if (s.p >= 3.8 && s.p < 4.2) {  /* the bolt */
                    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x, y + 10);
                    ctx.lineTo(x - 10, y + 22); ctx.lineTo(x + 6, y + 28); ctx.lineTo(s.x - 4, s.y); ctx.stroke();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
                    circle(ctx, s.x, s.y, 30, 'rgba(253,224,71,.35)');
                }
                var col = dark ? (Math.floor(clock * 12) % 2 ? '#6b6890' : '#4c4970') : '#8f8cb0';
                [[-22, 4, 18], [0, -6, 24], [22, 2, 19], [8, 10, 18], [-10, 10, 16]].forEach(function (p) { circle(ctx, x + p[0], y + p[1], p[2], col); });
                circle(ctx, x - 6, y - 12, 10, 'rgba(255,255,255,.18)');
                ctx.strokeStyle = '#2b2440'; ctx.lineWidth = 2.5; ctx.beginPath();
                ctx.moveTo(x - 14, y - 4); ctx.lineTo(x - 5, y); ctx.moveTo(x + 14, y - 4); ctx.lineTo(x + 5, y); ctx.stroke();  /* frowning brows */
                circle(ctx, x - 8, y + 4, 2.4, '#2b2440'); circle(ctx, x + 8, y + 4, 2.4, '#2b2440');
                ctx.beginPath(); ctx.arc(x, y + 14, 5, 3.6, 5.8); ctx.stroke();
                for (k = 0; k < 3 && !dark; k++) { var dy = (clock * 60 + k * 13 + n * 7) % 30; ctx.fillStyle = 'rgba(147,197,253,.8)'; ctx.fillRect(x - 12 + k * 12, y + 18 + dy, 2, 6); }
            });
            var self = this, k;
            this.fans.forEach(fans);
            this.bows.forEach(function (b) {  /* rainbows arching over the cloud sea, far below the road's height but above the clouds */
                if (!vis(b.x, b.y, b.r + 200)) return;
                var x = liftX(b.x, 0.12), y = liftY(b.y, 0.12);
                ctx.globalAlpha = 0.5; ctx.lineCap = 'butt';
                for (k = 0; k < 7; k++) { ctx.strokeStyle = self.BANDS[k]; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(x, y, b.r - k * 10, Math.PI + b.a, 2 * Math.PI + b.a); ctx.stroke(); }
                ctx.globalAlpha = 1; ctx.lineCap = 'round';
            });
            this.balloons.forEach(function (b, n) {  /* hot air balloons floating far above, a cat waving from each basket */
                var bx = b.x + Math.sin(clock * 0.2 + n) * 40, by = b.y + Math.cos(clock * 0.17 + n) * 30;
                if (!vis(bx, by, 260)) return;
                var x = liftX(bx, 0.28), y = liftY(by, 0.28), x2 = liftX(bx, 0.2), y2 = liftY(by, 0.2);
                ctx.fillStyle = 'rgba(40,20,80,.18)'; ctx.beginPath(); ctx.ellipse(bx + 20, by + 30, 40, 30, 0, 0, 7); ctx.fill();
                ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x2 - 9, y2); ctx.lineTo(x - 30, y); ctx.moveTo(x2 + 9, y2); ctx.lineTo(x + 30, y); ctx.stroke();
                ctx.fillStyle = '#a16207'; rrect(x2 - 13, y2 - 11, 26, 22, 4); ctx.fill(); ctx.strokeStyle = '#7c2d12'; ctx.stroke();
                var fur = DOG ? '#c8843f' : ['#f6a23a', '#a3aab5', '#45424d', '#fbf7ef'][n % 4], wave = Math.sin(clock * 6 + n) * 4;
                circle(ctx, x2, y2 - 2, 7, fur); circle(ctx, x2 + 8, y2 - 8 + wave, 3, fur);
                if (DOG) { ctx.fillStyle = '#5b3a24'; ctx.beginPath(); ctx.ellipse(x2 - 6, y2 - 1, 2.5, 4, 0.3, 0, 7); ctx.ellipse(x2 + 6, y2 - 1, 2.5, 4, -0.3, 0, 7); ctx.fill(); }
                else { ctx.fillStyle = fur; ctx.beginPath(); ctx.moveTo(x2 - 6, y2 - 5); ctx.lineTo(x2 - 5, y2 - 12); ctx.lineTo(x2 - 1, y2 - 7); ctx.moveTo(x2 + 6, y2 - 5); ctx.lineTo(x2 + 5, y2 - 12); ctx.lineTo(x2 + 1, y2 - 7); ctx.fill(); }
                circle(ctx, x2 - 2.5, y2 - 1, 1.2, '#1f2937'); circle(ctx, x2 + 2.5, y2 - 1, 1.2, '#1f2937');
                var C = [self.BANDS[(n * 2) % 7], '#fff', self.BANDS[(n * 2 + 1) % 7]];
                for (k = 0; k < 6; k++) { ctx.fillStyle = C[k % 3]; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 52, k * 1.047, (k + 1) * 1.047); ctx.fill(); }
                circle(ctx, x, y, 16, '#fef3c7'); ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3; ctx.strokeRect(x - 9, y - 9, 18, 18);
            });
            this.flocks.forEach(function (f) {  /* a flock of birds in a V, flying straight across the sky and round again */
                var L = WW + WH + 800, u = ((clock * f.sp + f.ph) % L) - 400, ca = Math.cos(f.a), sa = Math.sin(f.a);
                var cx = (ca > 0 ? 0 : WW) + ca * u, cy = f.y + sa * u;
                if (!vis(liftX(cx, 0.22), liftY(cy, 0.22), 160)) return;
                for (var m = 0; m < 7; m++) {
                    var row = Math.ceil(m / 2), sd = m % 2 ? 1 : -1, bx = cx - ca * row * 26 - sa * sd * row * 22, by = cy - sa * row * 26 + ca * sd * row * 22;
                    var x = liftX(bx, 0.22), y = liftY(by, 0.22), fl = Math.sin(clock * 9 + m) * 5;
                    ctx.strokeStyle = '#4c3d7a'; ctx.lineWidth = 2.4; ctx.beginPath();
                    ctx.moveTo(x - sa * 10 - ca * 3 + fl * ca * 0.3, y + ca * 10 - sa * 3); ctx.quadraticCurveTo(x - ca * 2 - sa * 4, y - sa * 2 + ca * 4 + fl * 0.4, x, y);
                    ctx.quadraticCurveTo(x - ca * 2 + sa * 4, y - sa * 2 - ca * 4 - fl * 0.4, x + sa * 10 - ca * 3, y - ca * 10 - sa * 3); ctx.stroke();
                }
            });
        },
        drawSky: function (cw, ch, k) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            if (!this.grad || this.gh !== ch) {
                this.gh = ch; this.grad = ctx.createLinearGradient(0, 0, 0, ch);
                this.grad.addColorStop(0, '#5b4b9a'); this.grad.addColorStop(0.55, '#c084b8'); this.grad.addColorStop(1, '#ffb38a');
            }
            ctx.fillStyle = this.grad; ctx.fillRect(0, 0, cw, ch);
            if (!this.cl) {  /* two tiles of clouds, drawn once: far ones small and faint, near ones big */
                this.cl = [0, 1].map(function (L) {
                    var t = document.createElement('canvas'), g = t.getContext('2d'), s = 7 + L * 11, i, n = L ? 9 : 16;
                    t.width = t.height = 512;
                    for (i = 0; i < n; i++) {
                        s = (s * 16807) % 2147483647; var x = s % 512; s = (s * 16807) % 2147483647; var y = s % 512;
                        for (var j = 0; j < 6; j++) {
                            var r = (L ? 34 : 18) + (j % 3) * (L ? 12 : 6), dx = (j - 2.5) * (L ? 34 : 18), dy = (j % 2) * (L ? 14 : 8);
                            for (var ox = -512; ox <= 512; ox += 512) for (var oy = -512; oy <= 512; oy += 512) {
                                circle(g, x + dx + ox, y + dy + oy, r, L ? 'rgba(255,240,250,.75)' : 'rgba(255,230,245,.35)');
                            }
                        }
                    }
                    return ctx.createPattern(t, 'repeat');
                });
            }
            for (var L = 0; L < 2; L++) {  /* parallax: the far clouds move slower than the near ones */
                var f = L ? 0.5 : 0.25, ox = ((camX * k * f + (api.reducedMotion ? 0 : clock * (L ? 12 : 6))) % 512 + 512) % 512, oy = ((camY * k * f) % 512 + 512) % 512;
                ctx.save(); ctx.translate(-ox, -oy); ctx.fillStyle = this.cl[L]; ctx.fillRect(0, 0, cw + 512, ch + 512); ctx.restore();
            }
        },
        thumbDeco: function (g) { seed = 3; for (var i = 0; i < 30; i++) circle(g, rnd() * WW, rnd() * WH, 50, 'rgba(255,240,250,.6)'); }
    };
