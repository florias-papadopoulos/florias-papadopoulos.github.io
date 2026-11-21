    /* Blossom Sky Town: an original bright cel-shaded town, petal whirlwinds, boost rings, a rooftop beam shortcut. A little
       tram rattles along its rails, koi circle in a pond (and dash about when a kart comes close), pigeons on the
       pavement flutter up as you pass, lanterns sway over the road and a crowd cheers at the start */
    var SKY = {
        id: 'sky', name: 'Blossom Town', blurb: 'Petal whirlwinds, a koi pond, a rooftop beam',
        poly: [200, 0, 1300, 0, 1650, 350, 1650, 700, 1200, 700, 1200, 960, 1650, 960, 1650, 1380, 1120, 1380, 870, 1130, 600, 1130,
               350, 1380, 0, 1380, 0, 870, 350, 620, 0, 370], round: 120, scale: 1, start: 0.035,
        phys: { vmax: 340, vgrass: 100, acc: 380, grip: 8.5, gripOff: 5, coast: 0.7, turn: 3.2, care: 1 },
        col: { bg: '#fdf2e9', edge: '#2b2340', road: '#6b6fa8', panel: 'rgba(255,255,255,.85)', mini: '#8b8fc8' },
        alt: { a: 255, b: 335, hw: 22, vf: 1, edge: true }, fallSay: 'Off the roof! Back you go.', noGantry: true,
        pads: [[48, 0.5], [205, -0.5]], picks: [30, 180, 350], padCol: ['#ec4899', '#fce7f3'],
        reset: function () { this.whirls.forEach(function (w) { w.hitT = -9; }); },
        prep: function () {
            var o = { x: 0, y: 0 }, self = this;
            this.rings = [[22, 0], [212, 0.3], [372, -0.2]].map(function (d) { var q = side(d[0], d[1] * HW); return { x: q.x, y: q.y, a: A[d[0]] }; });
            this.whirls = [[90, 1], [295, -1]].map(function (d) { var q = side(d[0], 0); return { cx: q.x, cy: q.y, dir: d[1], x: q.x, y: q.y }; });
            this.gateAt = 8;
            this.strings = [40, 160, 240, 395];
            var q2 = { x: WW / 2, y: WH / 2 }; this.balloon = q2;
            seed = 18;
            var sp = [inner()];
            this.pond = sp[0].d > 300 ? { x: sp[0].x, y: sp[0].y, rx: Math.min(170, sp[0].d - 150), ry: Math.min(115, sp[0].d - 190), s: 0 } : null;
            this.koi = [0, 1, 2, 3, 4, 5].map(function (n) { return { r: 0.35 + (n % 3) * 0.2, w: (n % 2 ? 1 : -1) * (0.5 + n * 0.08), a: n * 1.1, c: ['#f97316', '#fff7ed', '#ef4444', '#fbbf24'][n % 4] }; });
            function free(x, y, d) { o.x = x; o.y = y; nearest(o); return o.dist > d && (!self.pond || Math.hypot((x - self.pond.x) / 1.4, y - self.pond.y) > 200); }
            this.tram = null;
            seed = 19;
            (this.pond ? [{ x: this.pond.x, y: this.pond.y - 250 }, { x: this.pond.x, y: this.pond.y + 250 }] : []).concat(spots(6, 300, 240, this.pond ? [this.pond] : [])).forEach(function (c) {  /* a straight run of rails clear of the roads and the pond, next to the pond if there is room */
                if (self.tram) return;
                for (var L = 300; L >= 200; L -= 50) {
                    if (free(c.x - L, c.y, HW + 70) && free(c.x + L, c.y, HW + 70) && free(c.x - L / 2, c.y, HW + 70) && free(c.x + L / 2, c.y, HW + 70) && free(c.x, c.y, HW + 70)) { self.tram = { x: c.x, y: c.y, L: L, u: 0, ding: 0 }; return; }
                }
            });
            this.pigeons = critters([[30, -1], [118, 1], [198, -1], [290, 1], [362, -1], [430, 1]], HW + 44, 150);
            this.fans = [crowd(N - 24, N - 5, -(HW + 34), 2), crowd(N - 24, N - 5, HW + 34, 2)];
            this.update(0);
        },
        paint: function (g) {
            var i, k, p, OLc = '#2b2340';
            g.fillStyle = '#fdf2e9'; g.fillRect(0, 0, WW, WH);
            g.strokeStyle = '#efe2d2'; g.lineWidth = 10;  /* the little streets */
            for (i = 0; i < WW; i += 160) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, WH); g.stroke(); }
            for (i = 0; i < WH; i += 160) { g.beginPath(); g.moveTo(0, i); g.lineTo(WW, i); g.stroke(); }
            seed = 17;
            var ROOF = ['#ffb3c7', '#9be3de', '#ffe08a', '#c7b8ff', '#a7e3a1', '#ffc59e'], o = { x: 0, y: 0 }, houses = this.houses = [];
            var pd = this.pond, tr = this.tram;
            function clear(x, y) {  /* away from the roads, the pond and the tram rails */
                o.x = x; o.y = y; nearest(o);
                if (pd && Math.hypot((x - pd.x) / pd.rx, (y - pd.y) / pd.ry) < 1.35) return false;
                if (tr && Math.abs(y - tr.y) < 50 && Math.abs(x - tr.x) < tr.L + 60) return false;
                return o.dist > HW + 40;
            }
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
            if (pd) {  /* the koi pond: a stone rim, deep water, lily pads */
                g.fillStyle = 'rgba(43,35,64,.15)'; g.beginPath(); g.ellipse(pd.x + 8, pd.y + 10, pd.rx + 22, pd.ry + 22, 0, 0, 7); g.fill();
                g.fillStyle = '#d8d0c4'; g.strokeStyle = OLc; g.lineWidth = 3; g.beginPath(); g.ellipse(pd.x, pd.y, pd.rx + 18, pd.ry + 18, 0, 0, 7); g.fill(); g.stroke();
                g.fillStyle = '#5ec3d6'; g.beginPath(); g.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, 7); g.fill(); g.stroke();
                g.fillStyle = '#3aa5bf'; g.beginPath(); g.ellipse(pd.x + 10, pd.y + 8, pd.rx * 0.7, pd.ry * 0.62, 0, 0, 7); g.fill();
                for (k = 0; k < 7; k++) {
                    var la = k * 0.9 + 0.4, lx = pd.x + Math.cos(la) * pd.rx * 0.72, ly = pd.y + Math.sin(la) * pd.ry * 0.7;
                    g.fillStyle = '#7cc46a'; g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, 13, la + 0.3, la + 6); g.closePath(); g.fill();
                    if (k % 3 === 0) { circle(g, lx + 3, ly - 2, 4.5, '#ffb3c7'); circle(g, lx + 3, ly - 2, 2, '#fff0f6'); }
                }
                for (k = 0; k < 18; k++) { var ra = k * 0.35; circle(g, pd.x + Math.cos(ra) * (pd.rx + 18), pd.y + Math.sin(ra) * (pd.ry + 18), 7 + (k % 3) * 2, k % 2 ? '#bfb6a8' : '#cfc7ba'); }
            }
            if (tr) {  /* the tram rails and its two little stops */
                g.strokeStyle = '#9a8f86'; g.lineWidth = 3;
                for (k = -1; k <= 1; k += 2) { g.beginPath(); g.moveTo(tr.x - tr.L - 40, tr.y + k * 9); g.lineTo(tr.x + tr.L + 40, tr.y + k * 9); g.stroke(); }
                g.fillStyle = '#8a6a4a';
                for (k = -tr.L - 36; k <= tr.L + 36; k += 16) g.fillRect(tr.x + k - 2, tr.y - 13, 4, 26);
                g.strokeStyle = '#9a8f86'; g.lineWidth = 3;
                for (k = -1; k <= 1; k += 2) { g.beginPath(); g.moveTo(tr.x - tr.L - 40, tr.y + k * 9); g.lineTo(tr.x + tr.L + 40, tr.y + k * 9); g.stroke(); }
                for (k = -1; k <= 1; k += 2) { g.fillStyle = OLc; g.fillRect(tr.x + k * (tr.L + 10) - 26, tr.y - 44, 52, 18); g.fillStyle = k > 0 ? '#ffb3c7' : '#9be3de'; g.fillRect(tr.x + k * (tr.L + 10) - 23, tr.y - 41, 46, 12); }
            }
            this.pigeons.forEach(function (q) { g.fillStyle = 'rgba(43,35,64,.12)'; g.beginPath(); g.ellipse(q.rx, q.ry, 16, 10, 0, 0, 7); g.fill(); });
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
            scare(this.pigeons, dt, 160);
            var pd = this.pond;
            if (pd) {  /* the koi circle slowly; a kart close to the pond startles them for a while */
                pd.s = clamp(pd.s + (kartNear(pd.x, pd.y) < pd.rx + 140 ? 2 : -0.4) * dt, 0, 1);
                this.koi.forEach(function (k) { k.a += k.w * (1 + 3 * pd.s) * dt; });
            }
            var tr = this.tram;
            if (tr) {  /* the tram, from the clock: along the rails, a wait at the stop, back again */
                var T = 2 * tr.L / 80, cyc = 2 * T + 5, t = clock % cyc;
                tr.u = t < T ? -tr.L + 80 * t : t < T + 2.5 ? tr.L : t < 2 * T + 2.5 ? tr.L - 80 * (t - T - 2.5) : -tr.L;
                tr.dir = t < T ? 1 : t < T + 2.5 ? 0 : t < 2 * T + 2.5 ? -1 : 0;
            }
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
            var pd = this.pond, self = this;
            if (pd && vis(pd.x, pd.y, pd.rx + 30)) {  /* koi: orange, white and red fish with flicking tails */
                this.koi.forEach(function (k, n) {
                    var x = pd.x + Math.cos(k.a) * pd.rx * k.r * 1.6, y = pd.y + Math.sin(k.a) * pd.ry * k.r * 1.5, a = k.a + (k.w > 0 ? Math.PI / 2 : -Math.PI / 2);
                    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
                    var fl = Math.sin(clock * (6 + 10 * pd.s) + n) * 0.5;
                    ctx.fillStyle = k.c; ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.5, 0, 0, 7); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-17, -5 + fl * 4); ctx.lineTo(-17, 5 + fl * 4); ctx.fill();
                    if (n % 2) circle(ctx, 2, 0, 2.6, '#ef4444');
                    ctx.restore();
                });
            }
            var tr = this.tram;
            if (tr && vis(tr.x + tr.u, tr.y, 90)) {  /* the tram: a cream and pink car with windows, a pole to the wire, a light that blinks at the stops */
                var x0 = tr.x + tr.u, OLc = '#2b2340';
                ctx.fillStyle = 'rgba(43,35,64,.2)'; ctx.fillRect(x0 - 52, tr.y - 12, 112, 34);
                ctx.fillStyle = OLc; rrect(x0 - 58, tr.y - 22, 116, 44, 12); ctx.fill();
                ctx.fillStyle = '#fff4ea'; rrect(x0 - 55, tr.y - 19, 110, 38, 10); ctx.fill();
                ctx.fillStyle = '#ff8fab'; ctx.fillRect(x0 - 55, tr.y - 4, 110, 8);
                ctx.fillStyle = '#8fd3f4'; for (var w = -44; w <= 34; w += 20) ctx.fillRect(x0 + w, tr.y - 15, 12, 8);
                ctx.strokeStyle = OLc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, tr.y); ctx.lineTo(x0 - 18 * (tr.dir || 1), tr.y - 30); ctx.stroke();
                circle(ctx, x0 + 52 * (tr.dir || 1), tr.y, 4, tr.dir || Math.floor(clock * 3) % 2 ? '#fde047' : '#f59e0b');
            }
            this.pigeons.forEach(function (q) {  /* pigeons peck about on the pavement and flutter off when a kart comes */
                if (!vis(q.x, q.y, 30)) return;
                var fly = q.f > 0.02 && q.f < 0.98, a = fly ? Math.atan2(q.ry - q.hy, q.rx - q.hx) : q.a + Math.sin(clock * 0.8 + q.ph) * 0.8;
                for (var m = 0; m < 3; m++) {
                    var px = q.x + Math.cos(m * 2.1 + q.ph) * 12, py = q.y + Math.sin(m * 2.1 + q.ph) * 9 - (fly ? Math.sin(Math.PI * q.f) * 14 : 0);
                    ctx.save(); ctx.translate(px, py); ctx.rotate(a);
                    if (fly) { var fw = Math.sin(clock * 30 + m) * 7; ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.ellipse(0, -5, 4, 7 + fw * 0.4, 0, 0, 7); ctx.ellipse(0, 5, 4, 7 - fw * 0.4, 0, 0, 7); ctx.fill(); }
                    var pk = fly ? 0 : Math.max(0, Math.sin(clock * 7 + m + q.ph)) * 2;
                    ctx.fillStyle = '#a1a1aa'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, 7); ctx.fill();
                    circle(ctx, 5 + pk, 0, 2.8, '#6b7280'); circle(ctx, 7.5 + pk, 0, 1, '#f59e0b');
                    ctx.restore();
                }
            });
            void self;
            drawParts('petal');
        },
        over: function () {
            var i, k, OLc = '#2b2340';
            for (i = 0; i < this.houses.length; i++) block(this.houses[i], ['#fff4ea', '#f1dfd0'], '#8fd3f4');
            this.fans.forEach(fans);
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
                    var t = k / 6, sw = Math.sin(clock * 1.8 + j + k * 0.7) * 3, lx = a.x + (b.x - a.x) * t + sw, ly = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 12;
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
