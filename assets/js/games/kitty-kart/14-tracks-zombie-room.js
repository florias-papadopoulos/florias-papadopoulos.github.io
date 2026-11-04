    var ZOMBIE = {
        id: 'zombie', name: 'Zombie Town', blurb: 'Shuffling zombies, a graveyard gate, foggy cobbles',
        poly: [0, 0, 500, 0, 500, 220, 800, 220, 800, 0, 1300, 0, 1300, 500, 1000, 500, 1000, 720, 1300, 720, 1300, 1050, 650, 1050, 650, 720,
               330, 720, 330, 1050, 0, 1050], round: 95, scale: 0.95, start: 0.02,
        phys: { vmax: 335, vgrass: 95, acc: 365, grip: 6.8, gripOff: 4.5, coast: 0.7, turn: 3.15, care: 1.05 },
        col: { bg: '#20243a', edge: '#4b4a63', road: '#6b6880', panel: 'rgba(15,23,42,.72)', mini: '#c4b5fd', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 330, b: 420, hw: 28, vf: 0.9, gate: { at: 0.12, open: 3.4, shut: 2.6 } }, gate: 'iron',
        pads: [[60, 0.5], [250, -0.5]], picks: [25, 170, 300], padCol: ['#9333ea', '#f3e8ff'], gantry: ['#3b2f5c', '#f97316'],
        ZC: ['#7c3aed', '#0e7490', '#b45309', '#be185d', '#4d7c0f', '#1d4ed8'],
        reset: function () { this.zs.forEach(function (z, n) { z.s = z.s0; z.dir = n % 2 ? 1 : -1; z.down = 0; }); },
        prep: function () {
            var self = this;
            this.zs = [[40, 26], [95, 30], [140, 24], [205, 34], [262, 28], [300, 30], [445, 26]].map(function (d, n) {
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
            this.bats = [0, 1, 2, 3, 4].map(function (n) { return { cx: rnd() * WW, cy: rnd() * WH, r: 120 + rnd() * 160, w: 0.5 + rnd() * 0.4, ph: n * 1.3 }; });
            this.fog = [0, 1, 2, 3, 4, 5, 6].map(function () { return { x: rnd() * WW, y: rnd() * WH, r: 160 + rnd() * 120, sp: 8 + rnd() * 10 }; });
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
            for (i = 8; i < N; i += 30) { p = side(i, (i / 30 % 2 ? 1 : -1) * (HW + 22)); this.lamps.push(p); }
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
            this.graves.forEach(function (q) {  /* every 6 s: the ground shakes, a zombie climbs out, stands a while, goes back down */
                var t = (clock + q.ph) % 6;
                q.t = t; q.up = t < 1.2 ? 0 : t < 1.6 ? (t - 1.2) / 0.4 : t < 3.6 ? 1 : t < 4 ? (4 - t) / 0.4 : 0;
            });
        },
        under: function () {
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
    var MAPS = [MEADOW, CITY, REEF, MOON, VOLCANO, TREES, DESERT, SKY, MUSIC, RAINBOW, ZOMBIE, ROOM];

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
            else if (kind === 'leaf') { ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, p.t * 6 + i, 0, 7); ctx.fill(); }
            else if (kind === 'card') { ctx.fillStyle = '#c08a4f'; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
            else if (kind === 'spark') { circle(ctx, p.x, p.y, p.r * (1 - f * 0.5), p.c || '#fde047'); }
            else if (kind === 'lava') { circle(ctx, p.x, p.y, p.r * (1 - f * 0.4), f < 0.5 ? '#ffd166' : '#ff5a1f'); }
            else if (kind === 'petal') { ctx.fillStyle = '#ffb7d5'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.55, p.t * 5 + i, 0, 7); ctx.fill(); }
            else { ctx.globalAlpha = (1 - f) * 0.5; circle(ctx, p.x, p.y, p.r * (1 + f * 1.5), MAP.dustCol || '#cfd2da'); }
        }
        if (any) ctx.globalAlpha = 1;
    }

