    /* ---------- the tracks ---------- */
    var VX0 = 0, VY0 = 0, VX1 = 0, VY1 = 0, VB = null;  /* the visible part of the world, for culling; VB: the other view (split screen) */
    function vis(x, y, r) { return x + r > VX0 && x - r < VX1 && y + r > VY0 && y - r < VY1 || !!VB && x + r > VB[0] && x - r < VB[2] && y + r > VB[1] && y - r < VB[3]; }

    /* Lively scenery shared by the tracks: fans that cheer, birds that fly off, all moved by the clock and culled */
    function kartWithin(x, y, r) {  /* the closest kart within r of (x, y), or null (kartNear in 12-tracks-shared.js gives the distance instead) */
        var best = null, bd = r * r;
        for (var i = 0; i < 4; i++) {
            var c = karts[i], dx = c.x - x, dy = c.y - y, q = dx * dx + dy * dy;
            if (q < bd) { bd = q; best = c; }
        }
        return best;
    }
    var FANFUR = ['#f6a23a', '#a3aab5', '#45424d', '#fbf7ef', '#e8c9a0', '#8a5a3c', '#d9822b'];
    function fanRow(j0, j1, l, rows, flags, s0) {  /* fans standing along the road from j0 to j1, rows deep, at l from the centre (sign: side) */
        var out = [], s = l > 0 ? 1 : -1, i, k;
        seed = s0;
        for (k = 0; k < rows; k++) for (i = j0; i <= j1; i++) {
            if (rnd() < 0.3) continue;
            var p = side(i, l + s * (k * 17 + rnd() * 5)), f = rnd();
            out.push({ x: p.x, y: p.y, a: A[ix(i)] + (s > 0 ? -Math.PI / 2 : Math.PI / 2), c: FANFUR[Math.floor(rnd() * FANFUR.length)],
                ph: rnd() * 7, flag: f < 0.35 ? flags[Math.floor(f * 100) % flags.length] : null });
        }
        return out;
    }
    function drawFans(list, gear) {  /* cats (dogs in dog mode) that bounce and wave, wildly when a kart goes by; gear(f, x, y) adds a hat or helmet */
        var all = phase === 'count' || phase === 'done', i, f, j;
        for (i = 0; i < list.length; i++) {
            f = list[i];
            if (!vis(f.x, f.y, 30)) continue;
            var hot = all || !!kartWithin(f.x, f.y, 240), sp = hot ? 11 : 2.5, b = Math.abs(Math.sin(clock * sp + f.ph)) * (hot ? 5 : 1.2);
            var ca = Math.cos(f.a), sa = Math.sin(f.a), x = f.x - ca * b * 0.4, y = f.y - b;  /* the head faces the road (away is f.a) */
            circle(ctx, f.x + 2, f.y + 3, 6, 'rgba(15,23,42,.18)');
            var wv = Math.sin(clock * (hot ? 14 : 3) + f.ph) * (hot ? 0.9 : 0.3);
            ctx.strokeStyle = f.c; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
            for (j = -1; j <= 1; j += 2) {  /* arms up, waving */
                var aa = f.a + Math.PI + j * (0.9 + (j > 0 ? wv : -wv) * 0.5);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(aa) * 9, y + Math.sin(aa) * 9 - (hot ? 3 : 0)); ctx.stroke();
                if (f.flag && j > 0) {
                    var fx = x + Math.cos(aa) * 9, fy = y + Math.sin(aa) * 9 - (hot ? 3 : 0);
                    ctx.fillStyle = f.flag; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 9 + wv * 3, fy - 3); ctx.lineTo(fx, fy - 7); ctx.fill();
                }
            }
            circle(ctx, x, y, 5.2, f.c);
            ctx.fillStyle = f.c;
            for (j = -1; j <= 1; j += 2) {
                var ea = f.a + j * 0.75;
                if (DOG) { ctx.beginPath(); ctx.ellipse(x + Math.cos(ea) * 4.5, y + Math.sin(ea) * 4.5, 2.4, 4, ea, 0, 7); ctx.fillStyle = '#7a4a2a'; ctx.fill(); }
                else { ctx.beginPath(); ctx.moveTo(x + Math.cos(ea - j * 0.3) * 3.5, y + Math.sin(ea - j * 0.3) * 3.5); ctx.lineTo(x + Math.cos(ea) * 8, y + Math.sin(ea) * 8); ctx.lineTo(x + Math.cos(ea + j * 0.4) * 4.5, y + Math.sin(ea + j * 0.4) * 4.5); ctx.fill(); }
            }
            if (DOG) circle(ctx, x - ca * 4, y - sa * 4, 1.6, '#1f2937');
            if (gear) gear(f, x, y);
        }
    }
    function flock(n, d0, d1, s0) {  /* n birds sitting between d0 and d1 from the road */
        var out = [], o = { x: 0, y: 0 };
        seed = s0;
        for (var i = 0; i < n * 12 && out.length < n; i++) {
            var j = Math.floor(rnd() * N), p = side(j, (rnd() < 0.5 ? -1 : 1) * (d0 + rnd() * (d1 - d0)));
            o.x = p.x; o.y = p.y; nearest(o);
            if (o.dist < d0 - 4 || p.x < 20 || p.y < 20 || p.x > WW - 20 || p.y > WH - 20) continue;
            out.push({ x: p.x, y: p.y, t: -1, a: 0, ph: rnd() * 7 });
            if (rnd() < 0.6) { out.push({ x: p.x + 14, y: p.y + 6, t: -1, a: 0, ph: rnd() * 7 }); out.push({ x: p.x - 8, y: p.y + 12, t: -1, a: 0, ph: rnd() * 7 }); }
        }
        return out;
    }
    function drawFlock(list, col, wing) {  /* they peck about, fly off from a kart that comes close and come back a few seconds later */
        for (var i = 0; i < list.length; i++) {
            var b = list[i], f = b.t < 0 ? -1 : clock - b.t;
            if (f < -0.01 || f > 7) { b.t = -1; f = -1; }
            if (!vis(b.x, b.y, f < 0 ? 20 : 420)) continue;
            if (f < 0) {
                var k = kartWithin(b.x, b.y, 130);
                if (k) { b.t = clock; b.a = Math.atan2(b.y - k.y, b.x - k.x) + (Math.random() - 0.5); f = 0; }
            }
            if (f < 0 || f > 6.2) {  /* sitting (fading back in after a flight), now and then pecking */
                ctx.globalAlpha = f > 6.2 ? Math.min(1, (f - 6.2) / 0.6) : 1;
                var pk = Math.sin(clock * 3 + b.ph) > 0.85 ? 2 : 0;
                circle(ctx, b.x, b.y, 4, col[0]); circle(ctx, b.x + 3.5, b.y - 1 + pk, 2.6, col[1]);
                ctx.globalAlpha = 1;
                continue;
            }
            if (f > 3) continue;  /* gone, out of sight */
            var d = f * (90 + f * 60), x = b.x + Math.cos(b.a) * d, y = b.y + Math.sin(b.a) * d, h = Math.min(0.25, f * 0.12);
            x = liftX(x, h); y = liftY(y, h);
            var fl = Math.sin(clock * 22 + b.ph) * 6, sc = 1 + f * 0.35;
            ctx.globalAlpha = f > 2.4 ? (3 - f) / 0.6 : 1;
            ctx.strokeStyle = wing; ctx.lineWidth = 2.2 * sc; ctx.lineCap = 'round';
            var ca = Math.cos(b.a), sa = Math.sin(b.a);
            ctx.beginPath(); ctx.moveTo(x - sa * 9 * sc + ca * fl * 0.2, y + ca * 9 * sc + sa * fl * 0.2 - fl * 0.6); ctx.lineTo(x, y); ctx.lineTo(x + sa * 9 * sc + ca * fl * 0.2, y - ca * 9 * sc + sa * fl * 0.2 - fl * 0.6); ctx.stroke();
            circle(ctx, x, y, 3.2 * sc, col[0]);
            ctx.globalAlpha = 1;
        }
    }

    /* Catnip Meadow: a long sweeper, a hairpin with a farm lane across it, a wiggle and a chicane; a farm full of life */
    var MEADOW = {
        id: 'meadow', name: 'Catnip Meadow', blurb: 'A sprinkler and a farm gate shortcut',
        ctrl: [700, 1300, 1150, 1310, 1550, 1270, 1820, 1120, 1930, 860, 1920, 560, 1860, 330, 1740, 220, 1620, 300, 1600, 560,
               1600, 830, 1440, 1030, 1240, 930, 1050, 1060, 860, 940, 780, 680, 900, 450, 840, 220, 560, 150, 300, 250,
               180, 480, 320, 700, 200, 930, 300, 1180], scale: 1,
        phys: { vmax: 330, vgrass: 100, acc: 360, grip: 9, gripOff: 5, coast: 0.7, turn: 3.1, care: 1 },
        col: { bg: '#cdeac6', edge: '#bfe2b6', road: '#b4bcc6', panel: 'rgba(255,255,255,.85)' },
        alt: { a: 135, b: 182, hw: 30, vf: 0.8, gate: { at: 0.5, open: 3.4, shut: 2.6 } }, gate: 'farm',
        pads: [[92, 0.5], [345, -0.5], [262, 0.4]], picks: [30, 228, 398], padCol: ['#f59e0b', '#fff7d6'],
        prep: function () {
            this.spr = side(410, HW + 34);
            seed = 4;
            var sp = spots(6, 330, 230, [this.spr]);
            this.pond = sp[0]; this.barn = sp[1]; this.hay = sp[2]; this.mill = sp[3]; this.field = sp[4]; this.pen = sp[5];
            var trees = this.trees = [], self = this;
            seed = 12;
            scatter(700, HW + 80, function (x, y) {
                if (trees.length >= 64) return;
                for (var k = 0; k < sp.length; k++) if (sp[k] && Math.hypot(x - sp[k].x, y - sp[k].y) < 160) return;
                if (Math.hypot(x - self.spr.x, y - self.spr.y) < 210) return;
                for (k = 0; k < trees.length; k++) if (Math.hypot(x - trees[k].x, y - trees[k].y) < 70) return;
                trees.push({ x: x, y: y, r: 22 + rnd() * 16, c: rnd() < 0.2 ? 1 : 0, ph: rnd() * 7 });
            });
            this.fans = fanRow(468, 490, -(HW + 30), 2, ['#d6336c', '#1e3a8a', '#facc15'], 31);
            this.birds = flock(14, HW + 40, HW + 110, 32);
            var bf = this.flies = [], o = { x: 0, y: 0 };
            seed = 33;
            for (var i = 0; bf.length < 26 && i < 400; i++) {  /* butterflies over the flowers, by the road */
                var p = side(Math.floor(rnd() * N), (rnd() < 0.5 ? -1 : 1) * (HW + 40 + rnd() * 140));
                o.x = p.x; o.y = p.y; nearest(o);
                if (o.dist > HW + 30) bf.push({ x: p.x, y: p.y, ph: rnd() * 7, c: ['#f9a8d4', '#fde047', '#93c5fd', '#fdba74', '#ffffff'][i % 5] });
            }
            var q = this.pen;
            this.sheep = [];
            if (q) for (i = 0; i < 6; i++) this.sheep.push({ x: q.x - 60 + (i % 3) * 55 + rnd() * 14, y: q.y - 34 + Math.floor(i / 3) * 60 + rnd() * 10, ph: rnd() * 7 });
        },
        paint: function (g) {
            var i, k, self = this;
            g.fillStyle = '#c4e5b8'; g.fillRect(0, 0, WW, WH);
            blotch(g, ['#a9d69b', '#d8f1cd', '#b7dfa6'], 150, 3, 0.75);
            g.fillStyle = 'rgba(255,255,255,.13)';  /* mowing stripes */
            for (i = -WH; i < WW; i += 140) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 70, 0); g.lineTo(i + 70 + WH * 0.5, WH); g.lineTo(i + WH * 0.5, WH); g.fill(); }
            grain(g, 2000, ['#9ccb8d', '#e4f6dc', '#8fc480'], 4, HW + 24, 0, 5);  /* grass tufts */
            seed = 7;
            scatter(360, HW + 26, function (x, y, n) { circle(g, x, y, 3, n % 3 ? '#ffffff' : '#f9c6d9'); circle(g, x, y, 1.2, '#facc15'); });
            var q = this.pond;  /* a duck pond with reeds */
            if (q) {
                g.fillStyle = '#9fcf8f'; g.beginPath(); g.ellipse(q.x, q.y, 150, 104, 0.3, 0, 7); g.fill();
                g.fillStyle = '#5fb3d9'; g.beginPath(); g.ellipse(q.x, q.y, 134, 90, 0.3, 0, 7); g.fill();
                g.fillStyle = '#7cc5e6'; g.beginPath(); g.ellipse(q.x - 12, q.y - 10, 106, 64, 0.3, 0, 7); g.fill();
                circle(g, q.x + 50, q.y + 30, 18, '#5aa64a'); circle(g, q.x + 46, q.y + 26, 4, '#f9a8d4');  /* a lily pad */
                circle(g, q.x - 70, q.y + 10, 13, '#5aa64a');
                g.strokeStyle = '#4d8a3a'; g.lineWidth = 3;
                for (k = 0; k < 14; k++) { var ra = 3.6 + k * 0.12; g.beginPath(); g.moveTo(q.x + Math.cos(ra) * 140, q.y + Math.sin(ra) * 96); g.lineTo(q.x + Math.cos(ra) * 128, q.y + Math.sin(ra) * 80 - 18); g.stroke(); }
            }
            q = this.barn;  /* a red barn and a little yard; the roof stands up in over() */
            if (q) {
                g.fillStyle = '#d8c49a'; rr(g, q.x - 120, q.y - 80, 240, 170, 20); g.fill();
                g.fillStyle = 'rgba(40,30,20,.22)'; g.fillRect(q.x - 66, q.y - 36, 140, 100);
                g.fillStyle = '#c0392b'; g.fillRect(q.x - 76, q.y - 50, 140, 100);
                circle(g, q.x + 92, q.y + 40, 13, '#e2b84a'); circle(g, q.x + 92, q.y + 40, 6, '#c99a2e');  /* hay rolls */
                circle(g, q.x + 92, q.y + 8, 13, '#e2b84a'); circle(g, q.x + 92, q.y + 8, 6, '#c99a2e');
            }
            q = this.hay;  /* a flower garden */
            if (q) {
                var FL = ['#f472b6', '#facc15', '#ffffff', '#c084fc', '#fb923c'];
                for (k = 0; k < 5; k++) {
                    var bx = q.x + Math.cos(k * 1.26) * 70, by = q.y + Math.sin(k * 1.26) * 50;
                    g.fillStyle = '#8a6a4a'; g.beginPath(); g.ellipse(bx, by, 46, 26, k, 0, 7); g.fill();
                    seed = 40 + k;
                    for (i = 0; i < 26; i++) { var fa = rnd() * 7, fr = rnd() * 0.9; circle(g, bx + Math.cos(fa) * 40 * fr, by + Math.sin(fa) * 22 * fr, 4, FL[(k + i) % 5]); }
                }
            }
            q = this.field;  /* a field of sunflowers in rows: brown earth, the flowers sway in over() */
            if (q) {
                g.fillStyle = '#a07850'; rr(g, q.x - 130, q.y - 90, 260, 180, 26); g.fill();
                g.strokeStyle = '#8a6440'; g.lineWidth = 6;
                for (k = -70; k <= 70; k += 35) { g.beginPath(); g.moveTo(q.x - 115, q.y + k); g.lineTo(q.x + 115, q.y + k); g.stroke(); }
            }
            q = this.pen;  /* a sheep pen: a wooden fence round some greener grass */
            if (q) {
                g.fillStyle = '#b6e3a4'; rr(g, q.x - 110, q.y - 80, 220, 160, 30); g.fill();
                g.strokeStyle = '#8b5a2b'; g.lineWidth = 4; rr(g, q.x - 110, q.y - 80, 220, 160, 30); g.stroke();
                for (k = 0; k < 16; k++) { var pa = k * 0.3927; circle(g, q.x + Math.cos(pa) * 112, q.y + Math.sin(pa) * 82, 4, '#6b4423'); }
            }
            q = this.mill;  /* the windmill's round stone base; the sails turn in over() */
            if (q) { circle(g, q.x + 8, q.y + 12, 46, 'rgba(30,60,30,.22)'); circle(g, q.x, q.y, 42, '#c9b48e'); circle(g, q.x, q.y, 30, '#d9c7a3'); }
            circle(g, this.spr.x, this.spr.y, 192, 'rgba(70,150,210,.12)');  /* the lawn the sprinkler keeps wet */
            this.trees.forEach(function (t) { g.fillStyle = 'rgba(30,60,30,.18)'; g.beginPath(); g.ellipse(t.x + t.r * 0.5, t.y + t.r * 0.6, t.r * 1.05, t.r * 0.8, 0.5, 0, 7); g.fill(); });
            rail(g, HW + 64, 3, function (a, b) {  /* a white picket fence where there is room */
                g.strokeStyle = '#f8fafc'; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
            }, function (pt) { circle(g, pt.x + 1, pt.y + 2, 3.6, 'rgba(15,23,42,.15)'); circle(g, pt.x, pt.y, 3.4, '#ffffff'); });
            stand(g, 4, 24, HW + 44, ['#7c8aa0', '#a3b1c4']);
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 20, '#b2d9a5');
            strokeLoop(g, 0, N, 2 * HW + 34, '#b4dba6');  /* verge */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#b98c56');  /* the farm lane shortcut: muddy and slow, with a gate */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw - 12, '#c79d68');
            for (i = 3; i < ALT.n - 3; i += 2) { var mp = altSide(i, (i % 4 - 1.5) * 9); circle(g, mp.x, mp.y, 6, 'rgba(110,72,35,.3)'); }
            strokeAlt(g, 2, ALT.n - 3, 4, 'rgba(110,72,35,.35)', [14, 6]);
            for (i = 1; i < ALT.n - 1; i += 2) for (var fk = -1; fk <= 1; fk += 2) {  /* fence posts along the lane */
                var fp = altSide(i, fk * (ALT.hw + 5)); circle(g, fp.x + 1, fp.y + 2, 3.5, 'rgba(15,23,42,.15)'); circle(g, fp.x, fp.y, 3.2, '#8b5a2b');
            }
            road(g, { shadow: [3, 5, 'rgba(40,70,40,.18)'], edgeW: 6, kerb: ['#ffffff', '#e8484f', 18], line: '#ffffff', rim: '#a6aeb9', col: '#b8c0ca', crown: 'rgba(255,255,255,.07)' });
            grain(g, 2200, ['rgba(255,255,255,.35)', 'rgba(60,70,90,.18)'], 2.5, 0, HW - 6, 9);
            skids(g, 'rgba(60,66,80,.16)');
            strokeLoop(g, 0, N, 2, 'rgba(255,255,255,.6)', [18, 22]);  /* centre line */
            self = null;
        },
        under: function () {
            var s = this.spr, th = clock * 1.3, k, q = this.pond;
            if (q && vis(q.x, q.y, 160)) {  /* ducks paddling round the pond, ripples behind them */
                for (k = 0; k < 3; k++) {
                    var da = clock * 0.35 + k * 2.1, dx = q.x - 12 + Math.cos(da) * 70, dy = q.y - 10 + Math.sin(da) * 40, dh = da + Math.PI / 2;
                    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.arc(dx - Math.cos(dh) * 8, dy - Math.sin(dh) * 8, 6 + (clock * 6 + k) % 6, dh + 2.2, dh + 4.1); ctx.stroke();
                    circle(ctx, dx, dy, 7, k ? '#fefce8' : '#78716c'); circle(ctx, dx + Math.cos(dh) * 6, dy + Math.sin(dh) * 6, 4.5, k ? '#fefce8' : '#166534');
                    circle(ctx, dx + Math.cos(dh) * 10, dy + Math.sin(dh) * 10, 2, '#f59e0b');
                }
            }
            q = this.pen;
            if (q && vis(q.x, q.y, 140)) {  /* sheep grazing, wandering a little */
                for (k = 0; k < this.sheep.length; k++) {
                    var sh = this.sheep[k], sx = sh.x + Math.sin(clock * 0.3 + sh.ph) * 10, sy = sh.y + Math.cos(clock * 0.23 + sh.ph) * 6, hd = Math.sin(clock * 0.3 + sh.ph) > 0 ? 1 : -1;
                    circle(ctx, sx + 3, sy + 4, 13, 'rgba(15,23,42,.15)');
                    circle(ctx, sx - 6, sy, 8, '#f8fafc'); circle(ctx, sx + 4, sy - 3, 8, '#f8fafc'); circle(ctx, sx + 2, sy + 5, 8, '#f1f5f9');
                    var bob = Math.sin(clock * 2 + sh.ph) > 0.6 ? 2 : 0;
                    circle(ctx, sx + hd * 13, sy + bob, 5, '#334155');
                }
            }
            if (!vis(s.x, s.y, 200)) return;
            ctx.fillStyle = 'rgba(120,190,255,.22)'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, 188, th - 0.17, th + 0.17); ctx.fill();
            ctx.fillStyle = 'rgba(110,180,250,.75)';
            for (k = 1; k <= 13; k++) {
                var r = k * 14, w = Math.sin(clock * 20 + k) * 2;
                ctx.beginPath(); ctx.arc(s.x + Math.cos(th) * r - Math.sin(th) * w, s.y + Math.sin(th) * r + Math.cos(th) * w, 2.5 + k * 0.25, 0, 7); ctx.fill();
            }
            circle(ctx, s.x + 2, s.y + 3, 9, 'rgba(15,23,42,.2)'); circle(ctx, s.x, s.y, 8, '#64748b'); circle(ctx, s.x, s.y, 4, '#cbd5e1');
        },
        over: function () {  /* tree tops swaying, the barn roof, the windmill, sunflowers, the farmer, butterflies, birds and fans */
            var i, t, x, y, k, q;
            for (i = 0; i < this.trees.length; i++) {
                t = this.trees[i];
                if (!vis(t.x, t.y, t.r + 60)) continue;
                var sw = Math.sin(clock * 0.9 + t.ph) * 2;
                x = liftX(t.x, 0.07) + sw; y = liftY(t.y, 0.07);
                circle(ctx, x, y, t.r, t.c ? '#e58fb0' : '#5fae57');
                circle(ctx, x - t.r * 0.18 + sw * 0.4, y - t.r * 0.2, t.r * 0.72, t.c ? '#f4b6cc' : '#7cc46f');
                circle(ctx, x - t.r * 0.35 + sw * 0.6, y - t.r * 0.38, t.r * 0.32, t.c ? '#fbd5e3' : '#9ad68a');
            }
            q = this.barn;
            if (q && vis(q.x, q.y, 160)) {
                var h = 0.05, x0 = liftX(q.x - 76, h), y0 = liftY(q.y - 50, h), x1 = liftX(q.x + 64, h), y1 = liftY(q.y + 50, h);
                ctx.fillStyle = '#8e2a20'; ctx.beginPath(); ctx.moveTo(q.x - 76, q.y + 50); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.lineTo(q.x + 64, q.y + 50); ctx.fill();
                ctx.fillStyle = '#b03a2e'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
                ctx.fillStyle = '#c94a3c'; ctx.fillRect(x0, y0, x1 - x0, (y1 - y0) / 2);
                ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
                ctx.beginPath(); ctx.moveTo(x0, (y0 + y1) / 2); ctx.lineTo(x1, (y0 + y1) / 2); ctx.stroke();
                circle(ctx, (x0 + x1) / 2, y0 + 12, 6, '#f5e6c8');
                var fx = q.x + 20, fy = q.y + 72, wave = Math.sin(clock * (kartWithin(fx, fy, 420) ? 9 : 2.5)) * 0.7;  /* the farmer in a straw hat, waving */
                circle(ctx, fx + 2, fy + 3, 8, 'rgba(15,23,42,.2)'); circle(ctx, fx, fy, 7, '#3b82f6');
                ctx.strokeStyle = '#f6a23a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(fx + 4, fy - 2); ctx.lineTo(fx + 8 + Math.cos(-1.2 + wave) * 10, fy - 2 + Math.sin(-1.2 + wave) * 10); ctx.stroke();
                circle(ctx, fx, fy - 6, 6, DOG ? '#c08a4f' : '#f6a23a');
                if (DOG) { circle(ctx, fx - 6, fy - 4, 2.6, '#7a4a2a'); circle(ctx, fx + 6, fy - 4, 2.6, '#7a4a2a'); }
                circle(ctx, fx, fy - 9, 8.5, 'rgba(234,196,90,.95)'); circle(ctx, fx, fy - 9, 4.5, '#d4a53c');
            }
            q = this.field;
            if (q && vis(q.x, q.y, 160)) {  /* sunflowers swaying in the wind, a wave running along the rows */
                for (k = -70; k <= 70; k += 35) for (i = -100; i <= 100; i += 25) {
                    var bx = q.x + i, by = q.y + k, s2 = Math.sin(clock * 1.6 - i * 0.02 + k * 0.03) * 4, hx = liftX(bx, 0.05) + s2, hy = liftY(by, 0.05);
                    ctx.strokeStyle = '#4d7c3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(hx, hy); ctx.stroke();
                    circle(ctx, hx, hy, 8, '#facc15'); circle(ctx, hx, hy, 3.6, '#78350f');
                }
            }
            q = this.mill;
            if (q && vis(q.x, q.y, 150)) {  /* the windmill: its cap stands up, the four sails turn */
                var mx = liftX(q.x, 0.1), my = liftY(q.y, 0.1), ra = clock * 1.4;
                ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(q.x - 26, q.y); ctx.lineTo(mx - 18, my); ctx.lineTo(mx + 18, my); ctx.lineTo(q.x + 26, q.y); ctx.fill();
                circle(ctx, mx, my, 20, '#92400e'); circle(ctx, mx, my, 12, '#b45309');
                for (k = 0; k < 4; k++) {
                    var sa = ra + k * Math.PI / 2;
                    ctx.save(); ctx.translate(mx, my); ctx.rotate(sa);
                    ctx.fillStyle = 'rgba(15,23,42,.14)'; ctx.fillRect(14, 2, 66, 16);
                    ctx.fillStyle = '#f8fafc'; ctx.fillRect(10, -2, 66, 16); ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.strokeRect(10, -2, 66, 16);
                    ctx.beginPath(); ctx.moveTo(10, 6); ctx.lineTo(76, 6); ctx.stroke();
                    ctx.restore();
                }
                circle(ctx, mx, my, 6, '#7c2d12');
            }
            for (i = 0; i < this.flies.length; i++) {  /* butterflies, fluttering about */
                var b = this.flies[i], bx2 = b.x + Math.sin(clock * 0.7 + b.ph) * 46, by2 = b.y + Math.sin(clock * 1.1 + b.ph * 2) * 28;
                if (!vis(bx2, by2, 12)) continue;
                var wf = 1.5 + Math.abs(Math.sin(clock * 13 + b.ph)) * 4.5, ba = Math.cos(clock * 0.7 + b.ph) * 0.8;
                ctx.save(); ctx.translate(bx2, by2 - 10); ctx.rotate(ba); ctx.fillStyle = b.c;
                ctx.beginPath(); ctx.ellipse(-3, 0, wf, 4, 0, 0, 7); ctx.ellipse(3, 0, wf, 4, 0, 0, 7); ctx.fill();
                ctx.fillStyle = '#1f2937'; ctx.fillRect(-0.8, -3.5, 1.6, 7);
                ctx.restore();
            }
            drawFlock(this.birds, ['#78716c', '#57534e'], '#57534e');
            drawFans(this.fans, function (f, fx, fy) { if (f.c === '#fbf7ef') { circle(ctx, fx, fy - 2, 4, '#ef4444'); } });  /* a few in red caps */
        },
        effect: function (c, dt) {  /* the sprinkler: its jet sweeps round and makes the road wet */
            var s = this.spr, th = clock * 1.3, dx = c.x - s.x, dy = c.y - s.y, d = Math.hypot(dx, dy);
            if (c.z > 0 || d > 190 || d < 12 || Math.abs(wrap(Math.atan2(dy, dx) - th)) > 0.17) return;
            if (c.slip < 0.1) { stat('sprinkler'); if (quiet(c, 4)) say('Sprinkler! Wet paws!', c); }
            c.slip = Math.max(c.slip, 0.45);
            c.vx += Math.cos(th) * 150 * dt; c.vy += Math.sin(th) * 150 * dt;
        },
        thumbDeco: function (g) {  /* the picker: trees, the pond, the barn and the sunflowers */
            this.trees.forEach(function (t) { circle(g, t.x, t.y, t.r * 1.5, t.c ? '#f4b6cc' : '#6fbf62'); });
            var q = this.pond;
            if (q) { g.fillStyle = '#5fb3d9'; g.beginPath(); g.ellipse(q.x, q.y, 140, 96, 0.3, 0, 7); g.fill(); }
            q = this.barn;
            if (q) { g.fillStyle = '#c0392b'; g.fillRect(q.x - 76, q.y - 50, 140, 100); }
            q = this.field;
            if (q) { g.fillStyle = '#facc15'; g.fillRect(q.x - 110, q.y - 80, 220, 160); }
        }
    };
