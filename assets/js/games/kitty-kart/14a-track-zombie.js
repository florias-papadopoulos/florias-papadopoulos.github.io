    /* Zombie Town: cobbled lanes through a sleepy, spooky village at night. Friendly, clumsy zombies shuffle across the
       road; bump one and you both go spinning. The shortcut runs through the graveyard, behind an iron gate, where
       zombies pop up out of the graves now and then. More zombies stroll the pavements, crows on the walls flap off
       when a kart comes, some street lamps flicker, a little ghost floats over the graves, bats flit about, fog drifts,
       and a crowd of zombies cheers at the start, arms up */
    var ZOMBIE = {
        id: 'zombie', name: 'Zombie Town', blurb: 'Shuffling zombies, a graveyard gate, foggy cobbles',
        poly: [0, 0, 550, 0, 550, 270, 850, 270, 850, 0, 1550, 0, 1550, 520, 1200, 520, 1200, 800, 1550, 800, 1550, 1280, 1080, 1280,
               1080, 960, 720, 960, 720, 1280, 0, 1280, 0, 820, 260, 640, 260, 420, 0, 260], round: 95, scale: 1, start: 0.041,
        phys: { vmax: 335, vgrass: 95, acc: 365, grip: 6.8, gripOff: 4.5, coast: 0.7, turn: 3.15, care: 1.05 },
        col: { bg: '#20243a', edge: '#4b4a63', road: '#6b6880', panel: 'rgba(15,23,42,.72)', mini: '#c4b5fd', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 252, b: 330, hw: 28, vf: 0.9, gate: { at: 0.12, open: 3.4, shut: 2.6 } }, gate: 'iron',
        pads: [[80, 0.5], [218, -0.5]], picks: [12, 160, 350], padCol: ['#9333ea', '#f3e8ff'], gantry: ['#3b2f5c', '#f97316'],
        ZC: ['#7c3aed', '#0e7490', '#b45309', '#be185d', '#4d7c0f', '#1d4ed8'],
        reset: function () { this.zs.forEach(function (z, n) { z.s = z.s0; z.dir = n % 2 ? 1 : -1; z.down = 0; }); },
        prep: function () {
            var self = this;
            this.zs = [[14, 26], [88, 30], [130, 24], [205, 34], [290, 28], [352, 30], [388, 26], [442, 28]].map(function (d, n) {
                return { j: d[0], sp: d[1], s0: ((n * 37) % 90) - 45, s: 0, dir: 1, down: 0, x: 0, y: 0, col: self.ZC[n % self.ZC.length] };
            });
            this.graves = [0.36, 0.55, 0.76].map(function (f, n) { var ci = Math.round(f * (ALT.n - 1)); return { ci: ci, l: (n % 2 ? 1 : -1) * ALT.hw * 0.35, ph: n * 2.3, x: 0, y: 0, up: 0 }; });
            this.graves.forEach(function (q) { var p = altSide(q.ci, q.l); q.x = p.x; q.y = p.y; });
            seed = 61;
            var houses = this.houses = [], o = { x: 0, y: 0 };
            function clear(x, y) { o.x = x; o.y = y; nearest(o); return o.dist > HW + 44; }
            for (var gx = 20; gx < WW; gx += 170) for (var gy = 20; gy < WH; gy += 170) {
                var w = 80 + rnd() * 50, h = 70 + rnd() * 50, x = gx + 8 + rnd() * (150 - w), y = gy + 8 + rnd() * (150 - h);
                if (!(clear(x, y) && clear(x + w, y) && clear(x, y + h) && clear(x + w, y + h) && clear(x + w / 2, y + h / 2) && clear(x + w / 2, y) && clear(x + w / 2, y + h) && clear(x, y + h / 2) && clear(x + w, y + h / 2))) continue;
                if (rnd() < 0.25) continue;
                houses.push({ x: x, y: y, w: w, h: h, col: ['#5b4a6e', '#4a5568', '#6b4f4f', '#4f5d4a'][Math.floor(rnd() * 4)], hi: 0.04 + rnd() * 0.04, sky: [], ac: false, neon: null, roof: rnd() < 0.5 });
            }
            this.walkers = [[20, 60, -1], [90, 140, 1], [195, 240, -1], [335, 385, 1], [410, 460, -1]].map(function (d, n) { return { j0: d[0], j1: d[1], l: d[2] * (HW + 36), ph: n * 7.3, x: 0, y: 0, a: 0, col: self.ZC[(n + 2) % 6] }; });
            this.crows = critters([[50, 1], [120, -1], [180, 1], [275, -1], [320, 1], [420, -1]], HW + 40, 170);
            this.ghost = { x: 0, y: 0 };
            this.fans = [crowd(N - 13, N - 3, -(HW + 36), 2, { zombie: true }), crowd(N - 13, N - 3, HW + 36, 2, { zombie: true })];
            this.bats = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return { cx: rnd() * WW, cy: rnd() * WH, r: 120 + rnd() * 160, w: 0.5 + rnd() * 0.4, ph: n * 1.3 }; });
            this.fog = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function () { return { x: rnd() * WW, y: rnd() * WH, r: 160 + rnd() * 120, sp: 8 + rnd() * 10 }; });
            this.update(0);
        },
        paint: function (g) {
            var i, k, p, self = this;
            g.fillStyle = '#1e2a2a'; g.fillRect(0, 0, WW, WH);
            blotch(g, ['#2a3a32', '#161c24', '#30283f', '#25352c'], 120, 64, 0.85);
            grain(g, 1500, ['#33473a', '#12161c', '#3d3550'], 3, HW + 30, 0, 65);
            this.houses.forEach(function (b) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(b.x + 6, b.y + 8, b.w + 10, b.h + 10); g.fillStyle = '#2a2236'; g.fillRect(b.x, b.y, b.w, b.h); });
            /* the graveyard round the shortcut: darker grass, tombstones, crooked crosses, an iron fence */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 170, 'rgba(10,16,14,.45)');
            seed = 66;
            for (i = 3; i < ALT.n - 3; i += 2) for (k = -1; k <= 1; k += 2) {
                var t = altSide(i, k * (ALT.hw + 26 + rnd() * 40)), o2 = { x: t.x, y: t.y }; nearest(o2);
                if (mainDist(t.x, t.y) < HW + 30) continue;
                g.save(); g.translate(t.x, t.y); g.rotate(ALT.ang[i] + (rnd() - 0.5) * 0.4);
                g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, -7, -12, 20, 28, 8); g.fill();
                if (rnd() < 0.7) { g.fillStyle = '#8b8fa3'; rr(g, -10, -14, 20, 28, 9); g.fill(); g.fillStyle = '#a9adbf'; rr(g, -10, -14, 7, 28, 6); g.fill(); g.strokeStyle = '#5b5f70'; g.lineWidth = 2; g.beginPath(); g.moveTo(-4, -2); g.lineTo(4, -2); g.moveTo(0, -7); g.lineTo(0, 4); g.stroke(); }
                else { g.fillStyle = '#6b6f80'; g.fillRect(-3, -14, 6, 28); g.fillRect(-10, -6, 20, 6); }
                g.fillStyle = '#3a2a1e'; g.fillRect(-9, 16, 18, 14);
                g.restore();
            }
            for (k = -1; k <= 1; k += 2) {  /* the graveyard fence along the path */
                g.strokeStyle = '#151320'; g.lineWidth = 3; g.beginPath();
                for (i = 2; i < ALT.n - 2; i++) { p = altSide(i, k * (ALT.hw + 80)); if (i > 2) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
                g.stroke();
                for (i = 2; i < ALT.n - 2; i += 1) { p = altSide(i, k * (ALT.hw + 80)); if (mainDist(p.x, p.y) > HW + 20) { g.fillStyle = '#151320'; g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); } }
            }
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 10, '#3a2f28');  /* the muddy graveyard path */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw - 6, '#4a3c30');
            strokeAlt(g, 2, ALT.n - 3, 3, 'rgba(0,0,0,.3)', [8, 10]);
            this.graves.forEach(function (q) {  /* open graves on the path itself */
                g.save(); g.translate(q.x, q.y); g.rotate(ALT.ang[q.ci]);
                g.fillStyle = '#2a2018'; rr(g, -16, -10, 32, 20, 6); g.fill(); g.fillStyle = '#1a130e'; rr(g, -12, -6, 24, 12, 4); g.fill();
                g.restore();
            });
            rail(g, HW + 40, 2, null, function (pt, j) {  /* a low stone wall along the lanes */
                g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(pt.x - 6, pt.y - 3, 14, 12);
                g.fillStyle = j % 4 ? '#5f5a6e' : '#6e6880'; rr(g, pt.x - 8, pt.y - 6, 15, 12, 3); g.fill();
            });
            road(g, { shadow: [4, 7, 'rgba(0,0,0,.4)'], edgeW: 18, edge: '#4b4a63', line: '#7d7a90', rim: '#555268', col: '#615e76' });
            seed = 67;
            var SC = ['#6b6880', '#5e5b73', '#77748c', '#57546b'];
            for (i = 0; i < N; i += 1) {  /* cobblestones */
                var a = A[i];
                for (var l = -HW + 8; l < HW - 6; l += 13) {
                    var q = side(i, l + ((i % 2) ? 6 : 0));
                    if (Math.hypot(q.x - X[i], q.y - Y[i]) > HW - 7) continue;
                    g.save(); g.translate(q.x, q.y); g.rotate(a + (rnd() - 0.5) * 0.3);
                    g.fillStyle = SC[Math.floor(rnd() * 4)]; rr(g, -5, -5, 10 + rnd() * 2, 10, 3.5); g.fill();
                    g.restore();
                }
            }
            skids(g, 'rgba(0,0,0,.28)');
            this.lamps = [];
            var ls = Math.round(420 / SP);
            for (i = 8; i < N - 26; i += ls) { p = side(i, (Math.round(i / ls) % 2 ? 1 : -1) * (HW + 22)); this.lamps.push(p); }
            this.lamps.forEach(function (q) {  /* street lamps: a warm pool of light */
                var gl = g.createRadialGradient(q.x, q.y, 4, q.x, q.y, 120);
                gl.addColorStop(0, 'rgba(255,190,110,.32)'); gl.addColorStop(1, 'rgba(255,190,110,0)');
                g.fillStyle = gl; g.fillRect(q.x - 120, q.y - 120, 240, 240);
                circle(g, q.x + 2, q.y + 3, 6, 'rgba(0,0,0,.5)'); circle(g, q.x, q.y, 5.5, '#1c1a26'); circle(g, q.x, q.y, 3.4, '#ffd8a0');
            });
            seed = 68;
            scatter(160, HW + 34, function (x, y, n) {  /* jack-o-lanterns, dead shrubs */
                for (var h = 0; h < self.houses.length; h++) { var b = self.houses[h]; if (x > b.x - 30 && x < b.x + b.w + 30 && y > b.y - 30 && y < b.y + b.h + 30) return; }
                if (mainDist(x, y) < HW + 30) return;
                if (n % 4 === 0) {
                    var gl = g.createRadialGradient(x, y, 2, x, y, 34); gl.addColorStop(0, 'rgba(255,150,40,.35)'); gl.addColorStop(1, 'rgba(255,150,40,0)');
                    g.fillStyle = gl; g.fillRect(x - 34, y - 34, 68, 68);
                    circle(g, x + 2, y + 3, 11, 'rgba(0,0,0,.4)'); g.fillStyle = '#f97316'; g.beginPath(); g.ellipse(x, y, 12, 10, 0, 0, 7); g.fill();
                    g.strokeStyle = '#c2410c'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 5, 10, 0, 0, 7); g.stroke();
                    g.fillStyle = '#fde68a'; g.beginPath(); g.moveTo(x - 6, y - 2); g.lineTo(x - 3, y - 5); g.lineTo(x - 1, y - 2); g.fill(); g.beginPath(); g.moveTo(x + 6, y - 2); g.lineTo(x + 3, y - 5); g.lineTo(x + 1, y - 2); g.fill();
                    g.fillRect(x - 5, y + 3, 10, 2); g.fillStyle = '#4d7c0f'; g.fillRect(x - 1, y - 13, 3, 4);
                } else if (n % 4 === 1) {
                    g.strokeStyle = '#3d3427'; g.lineWidth = 2.5;
                    for (var k2 = 0; k2 < 5; k2++) { var a2 = k2 * 1.26 + n; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a2) * 14, y + Math.sin(a2) * 14); g.lineTo(x + Math.cos(a2 + 0.4) * 20, y + Math.sin(a2 + 0.4) * 20); g.stroke(); }
                }
            });
            self = null;
        },
        effect: function (c) {
            var i, z;
            if (c.z > 8 || c.fall > 0) return;
            for (i = 0; i < this.zs.length; i++) {  /* bump a zombie: it topples over, you spin */
                z = this.zs[i];
                if (z.down > 0 || Math.hypot(c.x - z.x, c.y - z.y) > R + 12) continue;
                z.down = 3.2; c.vx *= 0.6; c.vy *= 0.6; stat('zombie');
                spinOut(c, 0.7, 'Oops! Sorry, Mr Zombie!');
                near(z.x, z.y, 400, 'pop', c);
            }
            if (c.alt) for (i = 0; i < this.graves.length; i++) {  /* and the ones climbing out of the graves */
                z = this.graves[i];
                if (z.up > 0.5 && Math.hypot(c.x - z.x, c.y - z.y) < R + 14 && clock - (c.graveT || -9) > 1) { c.graveT = clock; stat('grave'); spinOut(c, 0.8, 'Boo! A zombie from the grave!'); }
            }
        },
        update: function (dt) {
            this.zs.forEach(function (z) {  /* shuffle across the road and back, a little pause at each side */
                if (z.down > 0) z.down -= dt;
                else {
                    z.s += z.dir * z.sp * dt;
                    if (Math.abs(z.s) > HW + 54) { z.s = (HW + 54) * (z.s > 0 ? 1 : -1); z.dir = -z.dir; }
                }
                var p = side(z.j, z.s); z.x = p.x; z.y = p.y;
            });
            this.walkers.forEach(function (w) {  /* zombies strolling the pavement, very slowly, from the clock */
                var span = w.j1 - w.j0, u = ((clock * 0.7 + w.ph) / span) % 2, j = w.j0 + span * (u < 1 ? u : 2 - u), j0 = Math.floor(j);
                var q = lerp(side(j0, w.l), side(j0 + 1, w.l), j - j0); w.x = q.x; w.y = q.y; w.a = A[ix(j0)] + (u < 1 ? 0 : Math.PI);
            });
            scare(this.crows, dt, 150);
            var gh = this.ghost, gi = Math.round(ALT.n / 2), gp = altSide(gi, 0);  /* the ghost drifts over the graveyard */
            gh.x = gp.x + Math.sin(clock * 0.31) * 150; gh.y = gp.y + Math.sin(clock * 0.47 + 1) * 110;
            this.graves.forEach(function (q) {  /* every 6 s: the ground shakes, a zombie climbs out, stands a while, goes back down */
                var t = (clock + q.ph) % 6;
                q.t = t; q.up = t < 1.2 ? 0 : t < 1.6 ? (t - 1.2) / 0.4 : t < 3.6 ? 1 : t < 4 ? (4 - t) / 0.4 : 0;
            });
        },
        under: function () {
            var k, self = this;
            if (!this.dark) { this.dark = ctx.createRadialGradient(0, 0, 4, 0, 0, 120); this.dark.addColorStop(0, 'rgba(12,10,30,.42)'); this.dark.addColorStop(1, 'rgba(12,10,30,0)'); }
            this.lamps.forEach(function (q, n) {  /* every third lamp flickers: now and then its light drops out for a moment */
                if (n % 3 || !vis(q.x, q.y, 120) || hash(Math.floor(clock * 9), n) < 0.82 && hash(Math.floor(clock * 0.7), n) > 0.25) return;
                ctx.save(); ctx.translate(q.x, q.y); ctx.fillStyle = self.dark; ctx.fillRect(-120, -120, 240, 240); ctx.restore();
            });
            this.walkers.forEach(function (w, n) { if (vis(w.x, w.y, 40)) self.zombie(w.x, w.y, w.a, w.col, 0, 1, n + 3); });
            this.crows.forEach(function (c) {  /* crows on the wall: off they flap when a kart comes */
                if (!vis(c.x, c.y, 30)) return;
                var fly = c.f > 0.02 && c.f < 0.98, a = fly ? Math.atan2(c.ry - c.hy, c.rx - c.hx) : c.a + Math.sin(clock * 0.5 + c.ph) * 0.5;
                ctx.save(); ctx.translate(c.x, c.y - (fly ? Math.sin(Math.PI * c.f) * 16 : 0)); ctx.rotate(a);
                if (fly) { var fw = Math.sin(clock * 26 + c.ph) * 8; ctx.fillStyle = '#0b0a12'; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-4, -12 - fw); ctx.lineTo(-8, 0); ctx.lineTo(-4, 12 + fw); ctx.fill(); }
                ctx.fillStyle = '#15131f'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.5, 0, 0, 7); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-13, -4); ctx.lineTo(-13, 4); ctx.fill();
                circle(ctx, 7, 0, 3.6, '#15131f'); ctx.fillStyle = '#d6a43a'; ctx.beginPath(); ctx.moveTo(10, -1.2); ctx.lineTo(14, 0); ctx.lineTo(10, 1.2); ctx.fill();
                circle(ctx, 8, -1.5, 0.9, '#fde047');
                ctx.restore();
            });
            void k;
            this.graves.forEach(function (q) {  /* the telegraph: dirt shakes and a hand pokes out before a zombie comes up */
                if (!vis(q.x, q.y, 40) || q.t > 1.4) return;
                var sh = Math.sin(clock * 50) * 2;
                ctx.fillStyle = '#5a4632';
                for (var k = 0; k < 4; k++) circle(ctx, q.x + Math.cos(k * 1.6) * 12 + sh, q.y + Math.sin(k * 1.6) * 7, 3, '#5a4632');
                if (q.t > 0.6) { circle(ctx, q.x + sh, q.y, 5, '#9bd17a'); ctx.strokeStyle = '#9bd17a'; ctx.lineWidth = 2.5; ctx.beginPath(); for (var f = -1; f <= 1; f++) { ctx.moveTo(q.x + sh + f * 3, q.y - 3); ctx.lineTo(q.x + sh + f * 4, q.y - 9); } ctx.stroke(); }
            });
        },
        zombie: function (x, y, a, col, down, rise, n) {  /* a friendly cartoon zombie, seen from above: arms out, eyes forward */
            ctx.save(); ctx.translate(x, y); ctx.rotate(a);
            if (rise < 1) ctx.scale(0.5 + rise * 0.5, 0.5 + rise * 0.5);
            if (down > 0) {  /* knocked over: lying on its back with little stars */
                ctx.rotate(Math.PI / 2);
                ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(3, 4, 18, 11, 0, 0, 7); ctx.fill();
                ctx.fillStyle = col; rrect(-14, -9, 22, 18, 7); ctx.fill();
                circle(ctx, 12, 0, 9, '#9bd17a'); ctx.strokeStyle = '#2b2440'; ctx.lineWidth = 1.6;
                ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(16, -1); ctx.moveTo(16, -4); ctx.lineTo(12, -1); ctx.moveTo(12, 1); ctx.lineTo(16, 4); ctx.moveTo(16, 1); ctx.lineTo(12, 4); ctx.stroke();
                ctx.restore();
                for (var s = 0; s < 3; s++) { var sa = clock * 4 + s * 2.1; circle(ctx, x + Math.cos(sa) * 16, y - 12 + Math.sin(sa) * 6, 2.6, '#fde047'); }
                return;
            }
            var w = Math.sin(clock * 5 + n) * 0.15;
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(3, 5, 14, 16, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = '#7fb35f'; ctx.lineWidth = 5; ctx.lineCap = 'round';  /* arms reaching forward */
            ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(20, -10 + w * 20); ctx.moveTo(0, 9); ctx.lineTo(20, 9 - w * 20); ctx.stroke();
            circle(ctx, 21, -10 + w * 20, 3.5, '#9bd17a'); circle(ctx, 21, 9 - w * 20, 3.5, '#9bd17a');
            ctx.fillStyle = col; rrect(-9, -12, 16, 24, 7); ctx.fill();  /* the shirt, with a patch */
            ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-6, 3, 6, 5);
            circle(ctx, 1, 0, 9, '#9bd17a');  /* the head, a tuft of hair, big eyes */
            ctx.fillStyle = '#3f3a2a'; ctx.beginPath(); ctx.ellipse(-3, -1, 5, 6, 0, 0, 7); ctx.fill();
            circle(ctx, 5, -3.5, 3.2, '#fff'); circle(ctx, 5, 3.5, 3.2, '#fff'); circle(ctx, 6.4, -3.3, 1.5, '#2b2440'); circle(ctx, 6.4, 3.7, 1.5, '#2b2440');
            ctx.restore();
        },
        over: function () {
            var self = this, i;
            for (i = 0; i < this.houses.length; i++) {  /* crooked little houses with glowing windows */
                var b = this.houses[i];
                block(b, ['#2e2740', '#241f33'], 'rgba(255,170,70,.95)');
                if (b.roof && vis(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) {  /* a pointy roof ridge and a chimney */
                    var x0 = liftX(b.x, b.hi), y0 = liftY(b.y, b.hi), x1 = liftX(b.x + b.w, b.hi), y1 = liftY(b.y + b.h, b.hi), ym = (y0 + y1) / 2;
                    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x0, ym, x1 - x0, y1 - ym);
                    ctx.strokeStyle = '#1a1626'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, ym); ctx.lineTo(x1, ym); ctx.stroke();
                }
            }
            this.zs.forEach(function (z, n) {
                if (!vis(z.x, z.y, 40)) return;
                self.zombie(z.x, z.y, A[z.j] + (z.dir > 0 ? Math.PI / 2 : -Math.PI / 2), z.col, z.down, 1, n);
            });
            this.graves.forEach(function (q, n) {
                if (q.up <= 0 || !vis(q.x, q.y, 40)) return;
                self.zombie(q.x, q.y, ALT.ang[q.ci] + Math.PI, self.ZC[(n + 3) % 6], 0, q.up, n);
            });
            this.lamps.forEach(function (q) {  /* the lamp heads stand above the road */
                if (!vis(q.x, q.y, 60)) return;
                var t = pillar(q.x, q.y, 2.5, 0.06, '#1c1a26', null);
                circle(ctx, t.x, t.y, 13, 'rgba(255,200,120,.25)'); circle(ctx, t.x, t.y, 6, '#1c1a26'); circle(ctx, t.x, t.y, 4, '#ffd8a0');
            });
            this.fans.forEach(fans);
            var gh = this.ghost;
            if (vis(gh.x, gh.y, 60)) {  /* a little ghost: see-through, bobbing, waving */
                var bob = Math.sin(clock * 2.2) * 5, gx = liftX(gh.x, 0.08), gy = liftY(gh.y, 0.08) + bob;
                ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(gh.x, gh.y + 14, 16, 7, 0, 0, 7); ctx.fill();
                ctx.globalAlpha = 0.78; ctx.fillStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(gx, gy - 6, 16, Math.PI, 0);
                for (var w = 0; w <= 4; w++) ctx.lineTo(gx + 16 - w * 8, gy + 14 + (w % 2 ? -4 : 2) + Math.sin(clock * 6 + w) * 2);
                ctx.closePath(); ctx.fill();
                circle(ctx, gx + 17, gy - 2 + Math.sin(clock * 7) * 5, 4, '#eef2ff');
                ctx.globalAlpha = 1;
                circle(ctx, gx - 5, gy - 8, 2.6, '#1e1b4b'); circle(ctx, gx + 5, gy - 8, 2.6, '#1e1b4b');
                ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.ellipse(gx, gy, 3, 4 + Math.sin(clock * 3) * 1.5, 0, 0, 7); ctx.fill();
            }
            this.bats.forEach(function (b) {  /* bats flitting about */
                var x = b.cx + Math.cos(clock * b.w + b.ph) * b.r, y = b.cy + Math.sin(clock * b.w * 1.7 + b.ph) * b.r * 0.5;
                if (!vis(x, y, 30)) return;
                var f = Math.sin(clock * 18 + b.ph) * 6;
                ctx.fillStyle = '#120f18'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 10, y - 6 - f, x - 18, y - f); ctx.quadraticCurveTo(x - 10, y + 2, x, y + 4);
                ctx.quadraticCurveTo(x + 10, y + 2, x + 18, y - f); ctx.quadraticCurveTo(x + 10, y - 6 - f, x, y); ctx.fill();
                circle(ctx, x - 2, y, 1, '#fde047'); circle(ctx, x + 2, y, 1, '#fde047');
            });
            ctx.fillStyle = 'rgba(200,210,240,.07)';  /* drifting fog */
            this.fog.forEach(function (f, n) {
                var x = ((f.x + (api.reducedMotion ? 0 : clock * f.sp)) % (WW + 400)) - 200;
                if (!vis(x, f.y, f.r)) return;
                ctx.beginPath(); ctx.ellipse(x, f.y, f.r, f.r * 0.45, 0, 0, 7); ctx.fill();
                ctx.beginPath(); ctx.ellipse(x + f.r * 0.4, f.y + 10, f.r * 0.6, f.r * 0.3, 0, 0, 7); ctx.fill();
                void n;
            });
        },
        screen: function () {  /* moonlight: darker towards the edges of the view */
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (!this.vig || this.vw !== W || this.vh !== H) {
                this.vw = W; this.vh = H; this.vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
                this.vig.addColorStop(0, 'rgba(10,8,30,0)'); this.vig.addColorStop(1, 'rgba(10,8,30,.55)');
            }
            ctx.fillStyle = this.vig; ctx.fillRect(0, 0, W, H);
        },
        thumbDeco: function (g) { seed = 3; for (var i = 0; i < 30; i++) { g.fillStyle = i % 3 ? '#3a3346' : '#f97316'; g.fillRect(rnd() * WW, rnd() * WH, 70, 60); } }
    };
