    /* ---------- the tracks ---------- */
    var VX0 = 0, VY0 = 0, VX1 = 0, VY1 = 0, VB = null;  /* the visible part of the world, for culling; VB: the other view (split screen) */
    function vis(x, y, r) { return x + r > VX0 && x - r < VX1 && y + r > VY0 && y - r < VY1 || !!VB && x + r > VB[0] && x - r < VB[2] && y + r > VB[1] && y - r < VB[3]; }

    var MEADOW = {
        id: 'meadow', name: 'Catnip Meadow', blurb: 'A sprinkler and a farm gate shortcut',
        ctrl: [829, 969, 1211, 944, 1435, 829, 1466, 638, 1339, 510, 1116, 542, 925, 670, 734, 638, 670, 479, 797, 319,
               1084, 287, 1244, 160, 956, 109, 574, 128, 287, 224, 191, 446, 224, 701, 287, 892, 446, 956], scale: 1,
        phys: { vmax: 330, vgrass: 100, acc: 360, grip: 9, gripOff: 5, coast: 0.7, turn: 3.1, care: 1 },
        col: { bg: '#cdeac6', edge: '#bfe2b6', road: '#b4bcc6', panel: 'rgba(255,255,255,.85)' },
        alt: { a: 236, b: 286, hw: 30, vf: 0.8, gate: { at: 0.5, open: 3.4, shut: 2.6 } }, gate: 'farm',
        pads: [[140, 0.5], [380, -0.5]], picks: [30, 330], padCol: ['#f59e0b', '#fff7d6'],
        prep: function () {
            this.spr = side(410, HW + 34);
            seed = 4;
            var sp = spots(3, 420, 235, [this.spr]);
            this.pond = sp[0]; this.barn = sp[1]; this.hay = sp[2];
            var trees = this.trees = [], self = this;
            seed = 12;
            scatter(400, HW + 80, function (x, y) {
                if (trees.length >= 46) return;
                for (var k = 0; k < 3; k++) if (sp[k] && Math.hypot(x - sp[k].x, y - sp[k].y) < 150) return;
                if (Math.hypot(x - self.spr.x, y - self.spr.y) < 210) return;
                for (k = 0; k < trees.length; k++) if (Math.hypot(x - trees[k].x, y - trees[k].y) < 70) return;
                trees.push({ x: x, y: y, r: 22 + rnd() * 16, c: rnd() < 0.2 ? 1 : 0 });
            });
        },
        paint: function (g) {
            var i, k, p, self = this;
            g.fillStyle = '#c4e5b8'; g.fillRect(0, 0, WW, WH);
            blotch(g, ['#a9d69b', '#d8f1cd', '#b7dfa6'], 150, 3, 0.75);
            g.fillStyle = 'rgba(255,255,255,.13)';  /* mowing stripes */
            for (i = -WH; i < WW; i += 140) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 70, 0); g.lineTo(i + 70 + WH * 0.5, WH); g.lineTo(i + WH * 0.5, WH); g.fill(); }
            grain(g, 1400, ['#9ccb8d', '#e4f6dc', '#8fc480'], 4, HW + 24, 0, 5);  /* grass tufts */
            seed = 7;
            scatter(240, HW + 26, function (x, y, n) { circle(g, x, y, 3, n % 3 ? '#ffffff' : '#f9c6d9'); circle(g, x, y, 1.2, '#facc15'); });
            var q = this.pond;  /* a duck pond with reeds */
            if (q) {
                g.fillStyle = '#9fcf8f'; g.beginPath(); g.ellipse(q.x, q.y, 150, 104, 0.3, 0, 7); g.fill();
                g.fillStyle = '#5fb3d9'; g.beginPath(); g.ellipse(q.x, q.y, 134, 90, 0.3, 0, 7); g.fill();
                g.fillStyle = '#7cc5e6'; g.beginPath(); g.ellipse(q.x - 12, q.y - 10, 106, 64, 0.3, 0, 7); g.fill();
                g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3;
                for (k = 0; k < 4; k++) { g.beginPath(); g.arc(q.x - 40 + k * 26, q.y - 20 + k * 12, 14, 3.6, 5.6); g.stroke(); }
                circle(g, q.x + 50, q.y + 30, 18, '#5aa64a'); circle(g, q.x + 46, q.y + 26, 4, '#f9a8d4');  /* a lily pad */
                g.strokeStyle = '#4d8a3a'; g.lineWidth = 3;
                for (k = 0; k < 14; k++) { var ra = 3.6 + k * 0.12; g.beginPath(); g.moveTo(q.x + Math.cos(ra) * 140, q.y + Math.sin(ra) * 96); g.lineTo(q.x + Math.cos(ra) * 128, q.y + Math.sin(ra) * 80 - 18); g.stroke(); }
            }
            q = this.barn;  /* a red barn and a little yard */
            if (q) {
                g.fillStyle = '#d8c49a'; rr(g, q.x - 120, q.y - 80, 240, 170, 20); g.fill();
                g.fillStyle = 'rgba(40,30,20,.22)'; g.fillRect(q.x - 66, q.y - 36, 140, 100);
                g.fillStyle = '#c0392b'; g.fillRect(q.x - 76, q.y - 50, 140, 100);
                g.fillStyle = '#a93226'; g.fillRect(q.x - 76, q.y - 50, 140, 50);
                g.strokeStyle = '#7b241c'; g.lineWidth = 3; g.strokeRect(q.x - 76, q.y - 50, 140, 100);
                g.strokeStyle = '#f5e6c8'; g.lineWidth = 4; g.beginPath(); g.moveTo(q.x - 76, q.y); g.lineTo(q.x + 64, q.y); g.stroke();
                g.fillStyle = '#f5e6c8'; g.fillRect(q.x - 18, q.y - 50, 20, 100);
                circle(g, q.x + 92, q.y + 40, 13, '#e2b84a'); circle(g, q.x + 92, q.y + 40, 6, '#c99a2e');  /* a hay roll */
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
            circle(g, this.spr.x, this.spr.y, 192, 'rgba(70,150,210,.12)');  /* the lawn the sprinkler keeps wet */
            this.trees.forEach(function (t) { g.fillStyle = 'rgba(30,60,30,.18)'; g.beginPath(); g.ellipse(t.x + t.r * 0.5, t.y + t.r * 0.6, t.r * 1.05, t.r * 0.8, 0.5, 0, 7); g.fill(); });
            rail(g, HW + 64, 3, function (a, b) {  /* a white picket fence where there is room */
                g.strokeStyle = '#f8fafc'; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
            }, function (pt) { circle(g, pt.x + 1, pt.y + 2, 3.6, 'rgba(15,23,42,.15)'); circle(g, pt.x, pt.y, 3.4, '#ffffff'); });
            stand(g, 4, 22, HW + 44, ['#7c8aa0', '#a3b1c4']);
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
            grain(g, 1600, ['rgba(255,255,255,.35)', 'rgba(60,70,90,.18)'], 2.5, 0, HW - 6, 9);
            skids(g, 'rgba(60,66,80,.16)');
            strokeLoop(g, 0, N, 2, 'rgba(255,255,255,.6)', [18, 22]);  /* centre line */
            self = null;
        },
        over: function () {  /* tree tops and the barn roof, standing up off the ground */
            var i, t, x, y;
            for (i = 0; i < this.trees.length; i++) {
                t = this.trees[i];
                if (!vis(t.x, t.y, t.r + 60)) continue;
                x = liftX(t.x, 0.07); y = liftY(t.y, 0.07);
                circle(ctx, x, y, t.r, t.c ? '#e58fb0' : '#5fae57');
                circle(ctx, x - t.r * 0.18, y - t.r * 0.2, t.r * 0.72, t.c ? '#f4b6cc' : '#7cc46f');
                circle(ctx, x - t.r * 0.35, y - t.r * 0.38, t.r * 0.32, t.c ? '#fbd5e3' : '#9ad68a');
            }
            var q = this.barn;
            if (q && vis(q.x, q.y, 140)) {
                var h = 0.05, x0 = liftX(q.x - 76, h), y0 = liftY(q.y - 50, h), x1 = liftX(q.x + 64, h), y1 = liftY(q.y + 50, h);
                ctx.fillStyle = '#8e2a20'; ctx.beginPath(); ctx.moveTo(q.x - 76, q.y + 50); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.lineTo(q.x + 64, q.y + 50); ctx.fill();
                ctx.fillStyle = '#b03a2e'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
                ctx.fillStyle = '#c94a3c'; ctx.fillRect(x0, y0, x1 - x0, (y1 - y0) / 2);
                ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
                ctx.beginPath(); ctx.moveTo(x0, (y0 + y1) / 2); ctx.lineTo(x1, (y0 + y1) / 2); ctx.stroke();
                circle(ctx, (x0 + x1) / 2, y0 + 12, 6, '#f5e6c8');
            }
        },
        effect: function (c, dt) {  /* the sprinkler: its jet sweeps round and makes the road wet */
            var s = this.spr, th = clock * 1.3, dx = c.x - s.x, dy = c.y - s.y, d = Math.hypot(dx, dy);
            if (c.z > 0 || d > 190 || d < 12 || Math.abs(wrap(Math.atan2(dy, dx) - th)) > 0.17) return;
            if (c.slip < 0.1) { stat('sprinkler'); if (quiet(c, 4)) say('Sprinkler! Wet paws!', c); }
            c.slip = Math.max(c.slip, 0.45);
            c.vx += Math.cos(th) * 150 * dt; c.vy += Math.sin(th) * 150 * dt;
        },
        under: function () {
            var s = this.spr, th = clock * 1.3, k;
            if (!vis(s.x, s.y, 200)) return;
            ctx.fillStyle = 'rgba(120,190,255,.22)'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, 188, th - 0.17, th + 0.17); ctx.fill();
            ctx.fillStyle = 'rgba(110,180,250,.75)';
            for (k = 1; k <= 13; k++) {
                var r = k * 14, w = Math.sin(clock * 20 + k) * 2;
                ctx.beginPath(); ctx.arc(s.x + Math.cos(th) * r - Math.sin(th) * w, s.y + Math.sin(th) * r + Math.cos(th) * w, 2.5 + k * 0.25, 0, 7); ctx.fill();
            }
            circle(ctx, s.x + 2, s.y + 3, 9, 'rgba(15,23,42,.2)'); circle(ctx, s.x, s.y, 8, '#64748b'); circle(ctx, s.x, s.y, 4, '#cbd5e1');
        }
    };

