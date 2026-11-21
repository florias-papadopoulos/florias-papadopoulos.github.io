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
