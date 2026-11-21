    /* Giant Grove: a dirt road through a forest of giant trees. Vines swing across the road, a plank bridge crosses a
       drop, and the shortcut is a hollow log with sticky sap. Squirrels dash off when a kart comes, owls on the trunks
       turn their heads after you, a giant snail crawls along the long bend, leaves fall and fireflies blink */
    var TREES = {
        id: 'trees', name: 'Giant Grove', blurb: 'Swinging vines, squirrels, a hollow log',
        ctrl: [300, 350, 750, 250, 1150, 340, 1450, 220, 1850, 280, 2100, 520, 2150, 880, 1980, 1180, 1650, 1260, 1420, 1120, 1300, 880,
               1080, 820, 900, 980, 1100, 1200, 1200, 1450, 950, 1620, 600, 1560, 400, 1300, 520, 1050, 330, 820, 180, 600], scale: 1, start: 0.045,
        phys: { vmax: 330, vgrass: 95, acc: 360, grip: 8.5, gripOff: 5, coast: 0.7, turn: 3.15, care: 1 },
        col: { bg: '#18301f', edge: '#4b7a3a', road: '#9a6a3c', panel: 'rgba(15,23,42,.72)', mini: '#d9b48a', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 298, b: 360, hw: 26, vf: 0.92 }, bridge: { i0: 193, i1: 210, hw: 30 }, fallSay: 'Off the planks! Back you go.',
        pads: [[88, 0.5], [222, -0.5]], picks: [18, 166, 333], padCol: ['#65a30d', '#ecfccb'], dustCol: '#8a6a4a',
        prep: function () {
            var i;
            this.saps = [[0.3, -0.45], [0.55, 0.45], [0.8, -0.45]].map(function (s) { var j = Math.round(s[0] * (ALT.n - 1)), q = altSide(j, s[1] * ALT.hw); return { x: q.x, y: q.y, a: ALT.ang[j] }; });
            this.vines = [[50, 0], [138, 2.2], [393, 4.1]].map(function (v) { return { j: v[0], ph: v[1] }; });
            this.lanterns = [];
            var st = Math.round(480 / SP);
            for (i = 30; i < N - 40; i += st) if (!inZone(i, { i0: this.bridge.i0 - 4, i1: this.bridge.i1 + 4 })) this.lanterns.push(side(i, (Math.round(i / st) % 2 ? 1 : -1) * (HW + 20)));
            var trunks = this.trunks = [];
            seed = 92;
            scatter(140, HW + 150, function (x, y) {
                if (trunks.length >= 14) return;
                for (var q = 0; q < trunks.length; q++) if (Math.hypot(trunks[q].x - x, trunks[q].y - y) < 260) return;
                trunks.push({ x: x, y: y, r: 70 + rnd() * 50 });
            });
            seed = 91; this.flies = [];
            for (i = 0; i < 46; i++) this.flies.push({ x: rnd() * WW, y: rnd() * WH, ph: rnd() * 7, sp: 0.4 + rnd() * 0.6 });
            this.squirrels = critters([[33, -1], [116, -1], [178, 1], [250, -1], [318, -1], [380, -1], [434, 1]], HW + 62, 140);  /* each sits by the road and has a burrow to flee to */
            this.snail = { j0: 100, j1: 174, l: -(HW + 66), x: 0, y: 0, a: 0 };
            this.fans = [crowd(N - 30, N - 8, -(HW + 30), 2), crowd(6, 24, HW + 30, 2)];
            this.update(0);
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
            grain(g, 2400, ['#2c5232', '#10200f', '#4d6b2f'], 3.5, HW + 26, 0, 94);
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
            scatter(330, HW + 40, function (x, y, n) {  /* mushrooms and ferns */
                if (n % 3 === 0) {
                    var r = 6 + rnd() * 9, glow = n % 9 === 0;
                    circle(g, x + 2, y + 3, r, 'rgba(0,0,0,.3)'); circle(g, x, y, r, glow ? '#5eead4' : '#dc2626');
                    for (k = 0; k < 4; k++) circle(g, x + Math.cos(k * 1.6) * r * 0.5, y + Math.sin(k * 1.6) * r * 0.5, r * 0.18, glow ? '#ccfbf1' : '#fff7ed');
                } else if (n % 3 === 1) {
                    g.strokeStyle = n % 2 ? '#3f8f3a' : '#57a84a'; g.lineWidth = 3;
                    for (k = 0; k < 6; k++) { var a = k * 1.05 + n; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * 10, y + Math.sin(a + 0.4) * 10, x + Math.cos(a) * 18, y + Math.sin(a) * 18); g.stroke(); }
                }
            });
            this.squirrels.forEach(function (s) { circle(g, s.rx, s.ry, 13, '#2a1a0e'); circle(g, s.rx, s.ry, 9, '#120a05'); });  /* their burrows */
            var sn = this.snail;  /* the snail's shiny trail along the long bend */
            g.beginPath();
            for (i = sn.j0; i <= sn.j1; i++) { p = side(i, sn.l + Math.sin(i * 0.4) * 5); if (i === sn.j0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
            g.strokeStyle = 'rgba(200,230,255,.14)'; g.lineWidth = 12; g.stroke(); g.strokeStyle = 'rgba(230,245,255,.22)'; g.lineWidth = 3; g.stroke();
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 18, '#3d2614');  /* the hollow log shortcut: narrow, with sticky sap */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#6b4424');
            strokeAlt(g, 1, ALT.n - 2, 2, 'rgba(0,0,0,.25)', [8, 10]);
            this.saps.forEach(function (s) {
                g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.fillStyle = '#d97706'; g.beginPath(); g.ellipse(0, 0, 18, 11, 0, 0, 7); g.fill();
                g.fillStyle = 'rgba(255,240,180,.6)'; g.beginPath(); g.ellipse(-5, -3, 6, 3, 0, 0, 7); g.fill(); g.restore();
            });
            road(g, { shadow: [4, 7, 'rgba(0,0,0,.35)'], edgeW: 22, edge: '#4b7a3a', line: '#6d9a4a', rim: '#87592f', col: '#9a6a3c', crown: 'rgba(255,220,170,.08)' });
            grain(g, 2600, ['rgba(60,35,15,.4)', 'rgba(255,220,170,.25)'], 3, 0, HW - 6, 95);
            offLine(g, -HW * 0.38, 9, 'rgba(70,42,18,.16)'); offLine(g, HW * 0.38, 9, 'rgba(70,42,18,.16)');  /* two worn ruts */
            g.strokeStyle = '#5b3b22'; g.lineCap = 'round';  /* roots crossing the edges of the road */
            seed = 96;
            for (i = 3; i < N; i += 9) {
                if (inZone(i, { i0: this.bridge.i0 - 4, i1: this.bridge.i1 + 4 })) continue;
                var sd = rnd() < 0.5 ? -1 : 1, r0 = side(i, sd * (HW + 26)), r1 = side(i + 2, sd * (HW - 14 - rnd() * 14));
                g.lineWidth = 7; g.beginPath(); g.moveTo(r0.x, r0.y); g.quadraticCurveTo((r0.x + r1.x) / 2 + 6, (r0.y + r1.y) / 2 - 6, r1.x, r1.y); g.stroke();
            }
            skids(g, 'rgba(60,35,15,.25)');
            var b = this.bridge;
            strokeLoop(g, b.i0, b.i1, 2 * HW + 30, '#0b170e', []);  /* the plank bridge over a drop to the forest floor */
            strokeLoop(g, b.i0, b.i1, 2 * HW + 4, '#0b170e', []);
            for (i = b.i0; i <= b.i1; i++) for (k = 0; k < 2; k++) {  /* two planks per point: the points are further apart now */
                p = lerp(side(i, 0), side(i + 1, 0), k * 0.5); g.save(); g.translate(p.x, p.y); g.rotate(A[ix(i)]);
                g.fillStyle = (i * 2 + k) % 2 ? '#b98b55' : '#a87c49'; g.fillRect(-3.5, -b.hw, SP / 2 - 1, 2 * b.hw);
                g.restore();
            }
            for (k = -1; k <= 1; k += 2) {
                g.beginPath();
                for (i = b.i0; i <= b.i1; i++) { p = side(i, k * (b.hw + 4)); if (i === b.i0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
                g.strokeStyle = '#d6b98a'; g.lineWidth = 3; g.setLineDash([]); g.stroke();
                for (i = b.i0; i <= b.i1; i += 3) { p = side(i, k * (b.hw + 4)); circle(g, p.x, p.y, 3.5, '#5b3b22'); }
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
        update: function (dt) {
            scare(this.squirrels, dt, 170);
            var sn = this.snail, span = sn.j1 - sn.j0, u = (clock / 150) % 2, j = sn.j0 + span * (u < 1 ? u : 2 - u), j0 = Math.floor(j);  /* very slowly along the bend and back */
            var p = lerp(side(j0, sn.l), side(j0 + 1, sn.l), j - j0);
            sn.x = p.x; sn.y = p.y; sn.a = A[ix(j0)] + (u < 1 ? 0 : Math.PI);
        },
        under: function () {
            var k, sn = this.snail;
            this.squirrels.forEach(function (s) {  /* squirrels: a bushy tail, nibbling by the road or dashing home */
                if (!vis(s.x, s.y, 30) || s.f > 0.97) return;
                var run = s.f > 0.02 && s.f < 0.97, a = run ? Math.atan2(s.ry - s.hy, s.rx - s.hx) : s.a, hop = run ? Math.abs(Math.sin(clock * 22 + s.ph)) * 3 : 0;
                ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
                ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(-3, 3, 13, 6, 0, 0, 7); ctx.fill();
                var flick = Math.sin(clock * 6 + s.ph) * 0.3;
                ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.ellipse(-13 - hop, 0, 9, 6, flick, 0, 7); ctx.fill();
                ctx.fillStyle = '#ea8a3c'; ctx.beginPath(); ctx.ellipse(-15 - hop, 0, 5, 3, flick, 0, 7); ctx.fill();
                ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(-1 + hop, 0, 7, 5, 0, 0, 7); ctx.fill();
                var nib = run ? 0 : Math.max(0, Math.sin(clock * 9 + s.ph)) * 1.5;
                circle(ctx, 6 + hop + nib, 0, 4.2, '#b45309');
                circle(ctx, 4 + hop, -3.5, 1.6, '#7c2d12'); circle(ctx, 4 + hop, 3.5, 1.6, '#7c2d12');
                circle(ctx, 8.5 + hop + nib, -1.5, 0.9, '#111'); circle(ctx, 8.5 + hop + nib, 1.5, 0.9, '#111');
                if (!run) circle(ctx, 10 + nib, 0, 2, '#7c4a1e');  /* an acorn */
                ctx.restore();
            });
            if (vis(sn.x, sn.y, 60)) {  /* the giant snail: a long soft body, a swirly shell, eye stalks that wave about */
                ctx.save(); ctx.translate(sn.x, sn.y); ctx.rotate(sn.a);
                ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(-2, 6, 40, 16, 0, 0, 7); ctx.fill();
                var sq = Math.sin(clock * 1.5) * 2;
                ctx.fillStyle = '#d9c98f'; ctx.beginPath(); ctx.ellipse(0, 0, 40 + sq, 12, 0, 0, 7); ctx.fill();
                ctx.strokeStyle = '#b8a66a'; ctx.lineWidth = 2;
                for (k = -1; k <= 1; k += 2) { var e = Math.sin(clock * 2 + k) * 4; ctx.beginPath(); ctx.moveTo(32 + sq, k * 4); ctx.lineTo(48 + sq, k * 11 + e); ctx.stroke(); circle(ctx, 48 + sq, k * 11 + e, 3.2, '#2b2414'); circle(ctx, 48.6 + sq, k * 11 + e - 0.8, 1, '#fff'); }
                circle(ctx, -6, 0, 27, '#7c4a1e'); circle(ctx, -6, 0, 23, '#a8672e');
                ctx.strokeStyle = '#5b3412'; ctx.lineWidth = 3; ctx.beginPath();
                for (k = 0; k < 40; k++) { var r = 21 - k * 0.5, an = k * 0.42; ctx.lineTo(-6 + Math.cos(an) * r, Math.sin(an) * r); }
                ctx.stroke();
                circle(ctx, -12, -8, 5, 'rgba(255,230,180,.35)');
                ctx.restore();
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
                if (i % 3 === 0) this.owl(tx + t.r * 0.2, ty - t.r * 0.1, i);
            }
            ctx.lineCap = 'round';
            for (i = 4; i < ALT.n - 4; i += 4) {  /* the log over the shortcut, see-through so you can still see the karts */
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
            this.fans.forEach(fans);
            drift(3, 420, 16, 24, function (x, y, k) {  /* leaves floating down, turning over as they fall */
                var f = Math.sin(clock * 3 + k), w = 6 * Math.abs(f) + 1.5;
                ctx.fillStyle = ['#d97706', '#65a30d', '#ca8a04', '#b45309'][k & 3];
                ctx.beginPath(); ctx.ellipse(x, y, w, 3.2, clock * 0.8 + k, 0, 7); ctx.fill();
            });
            for (i = 0; i < this.flies.length; i++) {  /* fireflies */
                var f = this.flies[i], fx = f.x + Math.sin(clock * f.sp + f.ph) * 60, fy = f.y + Math.cos(clock * f.sp * 1.3 + f.ph) * 40;
                if (!vis(fx, fy, 10)) continue;
                var on = 0.5 + 0.5 * Math.sin(clock * 3 + f.ph);
                ctx.globalAlpha = on; circle(ctx, fx, fy, 6, 'rgba(250,255,150,.35)'); circle(ctx, fx, fy, 2, '#fbff9e'); ctx.globalAlpha = 1;
            }
        },
        owl: function (x, y, n) {  /* an owl on a trunk top: it turns its head to the closest kart, and blinks */
            var bx = 0, by = 0, d = 1e9;
            for (var i = 0; i < karts.length; i++) { var q = Math.hypot(karts[i].x - x, karts[i].y - y); if (q < d) { d = q; bx = karts[i].x; by = karts[i].y; } }
            var a = d < 700 ? Math.atan2(by - y, bx - x) : Math.sin(clock * 0.4 + n) * 1.2 + Math.PI / 2, blink = (clock + n * 1.3) % 4 < 0.15;
            circle(ctx, x + 3, y + 4, 12, 'rgba(0,0,0,.3)'); circle(ctx, x, y, 12, '#7a5a3a');
            ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2);
            circle(ctx, 0, 1, 10, '#a07a52');
            ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-10, -14); ctx.lineTo(-4, -8); ctx.moveTo(8, -6); ctx.lineTo(10, -14); ctx.lineTo(4, -8); ctx.fill();
            if (blink) { ctx.strokeStyle = '#3d2817'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-1, 2); ctx.moveTo(1, 2); ctx.lineTo(7, 2); ctx.stroke(); }
            else { circle(ctx, -4, 2, 4, '#fde047'); circle(ctx, 4, 2, 4, '#fde047'); circle(ctx, -4, 3.5, 2, '#111'); circle(ctx, 4, 3.5, 2, '#111'); }
            ctx.fillStyle = '#e0a030'; ctx.beginPath(); ctx.moveTo(-1.5, 6); ctx.lineTo(1.5, 6); ctx.lineTo(0, 9); ctx.fill();
            ctx.restore();
        }
    };
