    function mainDist(x, y) {  /* distance to the main road only, ignoring the shortcut */
        var best = 1e12;
        for (var i = 0; i < N; i += 2) { var dx = X[i] - x, dy = Y[i] - y, q = dx * dx + dy * dy; if (q < best) best = q; }
        return Math.sqrt(best);
    }
    function strikes(st, dt, every, hitFn) {  /* a warning ring ahead of the leader, then a hit 1.4 s later */
        st.t -= dt;
        if (st.t <= 0) {
            st.t = every[0] + Math.random() * every[1];
            var lead = me;
            karts.forEach(function (c) { if (!c.fin && c.prog > lead.prog) lead = c; });
            var q = side(lead.idx + 26 + Math.floor(Math.random() * 30), (Math.random() - 0.5) * 1.2 * HW);
            st.list.push({ x: q.x, y: q.y, t: 0 });
        }
        for (var i = st.list.length - 1; i >= 0; i--) {
            var m = st.list[i];
            m.t += dt;
            if (m.t >= 1.4 && !m.hit) { m.hit = true; hitFn(m); }
            if (m.t > 3) st.list.splice(i, 1);
        }
    }
    function warnRing(m, col) {
        var pulse = 0.5 + 0.5 * Math.sin(m.t * 18);
        ctx.globalAlpha = 0.16; circle(ctx, m.x, m.y, 48, col); ctx.globalAlpha = 0.5 + 0.4 * pulse;
        ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y, 48 - m.t * 12, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(m.x - 12, m.y); ctx.lineTo(m.x + 12, m.y); ctx.moveTo(m.x, m.y - 12); ctx.lineTo(m.x, m.y + 12); ctx.stroke();
        ctx.globalAlpha = 1;
    }

    /* Lava Peak: basalt road round a volcano, lava rivers, heat vents that toss you up, a bridge the lava floods; a long
       sweeper, a hairpin with the bridge across it, wiggles; the volcano erupts now and then, the lava flows and bubbles,
       embers rise, ravens fly off, and fans in hard hats cheer at the start */
    var VOLCANO = {
        id: 'volcano', name: 'Lava Peak', blurb: 'Lava bursts, heat vents, a flooding lava bridge',
        ctrl: [300, 700, 350, 350, 650, 150, 950, 260, 1250, 120, 1600, 200, 1900, 380, 1980, 620, 1720, 700, 1450, 640, 1330, 800,
               1560, 920, 1900, 1000, 1880, 1250, 1550, 1350, 1250, 1300, 1050, 1530, 700, 1450, 450, 1550, 250, 1300, 380, 1000], scale: 1, start: 0,
        phys: { vmax: 330, vgrass: 80, acc: 350, grip: 7, gripOff: 4, coast: 0.7, turn: 3.1, care: 1.05 },
        col: { bg: '#1d1513', edge: '#4a3c38', road: '#3b3436', panel: 'rgba(15,23,42,.72)', mini: '#fdba74', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 200, b: 248, hw: 30, vf: 0.92, gate: { at: 0.5, open: 3.6, shut: 2.4 } }, gate: 'lava', gateSoft: true,
        pads: [[20, 0.5], [140, -0.5], [330, 0.5]], picks: [40, 175, 370], padCol: ['#ea580c', '#fed7aa'], dustCol: '#7a6a66', G: 380,
        reset: function () { this.burst = { t: 3, list: [] }; this.boom = -1; },
        prep: function () {
            var far = { x: 0, y: 0, dist: 0 }, o, gx, gy;  /* the volcano stands in the emptiest spot inside the loop */
            for (gx = 300; gx < WW - 300; gx += 40) for (gy = 300; gy < WH - 300; gy += 40) {
                o = { x: gx, y: gy }; nearest(o);
                if (o.dist > far.dist) far = o;
            }
            this.peak = { x: far.x, y: far.y };
            this.vents = [[115, 0.3], [310, -0.35], [395, 0.25]].map(function (v) { var q = side(v[0], v[1] * HW); return { x: q.x, y: q.y, a: A[v[0]], t: 0 }; });
            this.s0 = Math.round(ALT.n * 0.35); this.s1 = Math.round(ALT.n * 0.65);
            var rivers = this.rivers = [], mid = Math.round(ALT.n / 2), i, k;
            for (k = -1; k <= 1; k += 2) {  /* the river under the bridge, flowing out both ways until near the road */
                var pts = [ALT.x[mid], ALT.y[mid]], a = ALT.ang[mid] + Math.PI / 2 * k, x = pts[0], y = pts[1];
                for (i = 0; i < 30; i++) {
                    a += Math.sin(i * 1.7 + k) * 0.25; x += Math.cos(a) * 40; y += Math.sin(a) * 40;
                    if (i > 2 && mainDist(x, y) < HW + 50) break;
                    pts.push(x, y);
                }
                rivers.push(pts);
            }
            seed = 58;
            for (k = 0; k < 12; k++) {  /* more rivers out in the fields */
                var rx = rnd() * WW, ry = rnd() * WH, ra = rnd() * 7, rp = [];
                for (i = 0; i < 26; i++) {
                    if (mainDist(rx, ry) < HW + 70 || rx < 0 || ry < 0 || rx > WW || ry > WH) { if (rp.length > 4) break; rp = []; }
                    else rp.push(rx, ry);
                    ra += (rnd() - 0.5) * 0.6; rx += Math.cos(ra) * 45; ry += Math.sin(ra) * 45;
                }
                if (rp.length > 4) rivers.push(rp);
            }
            this.box = rivers.map(function (pts) {  /* each river's bounds, for culling the moving lava */
                var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
                for (var q = 0; q < pts.length; q += 2) { x0 = Math.min(x0, pts[q]); x1 = Math.max(x1, pts[q]); y0 = Math.min(y0, pts[q + 1]); y1 = Math.max(y1, pts[q + 1]); }
                return [(x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) / 2 + 40];
            });
            this.fans = fanRow(466, 490, -(HW + 34), 2, ['#f97316', '#facc15', '#ef4444'], 59);
            this.birds = flock(12, HW + 40, HW + 100, 60);
        },
        paint: function (g) {
            var i, k, p;
            g.fillStyle = '#211816'; g.fillRect(0, 0, WW, WH);
            blotch(g, ['#3a2a25', '#120c0b', '#4a2a1c', '#2b201d'], 120, 61, 0.8);
            grain(g, 1500, ['#3b2e2a', '#161010', '#5a3a2a'], 3.5, HW + 30, 0, 62);
            g.lineCap = g.lineJoin = 'round';
            this.rivers.forEach(function (pts) {  /* lava rivers: dark crust, hot orange, a bright yellow core */
                [[52, '#5a1f0c'], [38, '#c2410c'], [24, '#fb923c'], [8, '#fde68a']].forEach(function (st) {
                    g.strokeStyle = st[1]; g.lineWidth = st[0]; g.beginPath(); g.moveTo(pts[0], pts[1]);
                    for (var q = 2; q < pts.length; q += 2) g.lineTo(pts[q], pts[q + 1]);
                    g.stroke();
                });
            });
            var pk = this.peak;
            if (pk) {  /* the foot of the volcano and its glow; the cone stands up in over() */
                var gl = g.createRadialGradient(pk.x, pk.y, 120, pk.x, pk.y, 360);
                gl.addColorStop(0, 'rgba(255,120,40,.25)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
                g.fillStyle = gl; g.fillRect(pk.x - 360, pk.y - 360, 720, 720);
                circle(g, pk.x + 30, pk.y + 40, 245, 'rgba(0,0,0,.35)');
            }
            scatter(260, HW + 50, function (x, y, n) {  /* basalt boulders */
                if (pk && Math.hypot(x - pk.x, y - pk.y) < 270) return;
                var r = 10 + rnd() * 22;
                circle(g, x + 5, y + 7, r, 'rgba(0,0,0,.35)');
                g.fillStyle = n % 3 ? '#2b2422' : '#3a302d'; g.beginPath();
                for (k = 0; k < 7; k++) { var a = k * 0.9 + rnd() * 0.4, r2 = r * (0.75 + rnd() * 0.35); g.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); }
                g.closePath(); g.fill();
                circle(g, x - r * 0.3, y - r * 0.3, r * 0.35, 'rgba(255,255,255,.06)');
            });
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 18, '#2b2422');  /* the lava bridge shortcut: stone slabs */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#57504f');
            for (i = 2; i < ALT.n - 2; i += 2) {
                p = altSide(i, 0); g.save(); g.translate(p.x, p.y); g.rotate(ALT.ang[i]);
                g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -ALT.hw); g.lineTo(0, ALT.hw); g.stroke(); g.restore();
            }
            road(g, { shadow: [5, 8, 'rgba(0,0,0,.4)'], edgeW: 26, edge: '#4a3c38', kerb: ['#1c1917', '#f97316', 20], line: '#f97316', rim: '#2e282a', col: '#3b3436', crown: 'rgba(255,255,255,.03)' });
            grain(g, 1500, ['rgba(255,255,255,.08)', 'rgba(0,0,0,.25)'], 3, 0, HW - 6, 63);
            skids(g, 'rgba(0,0,0,.28)');
            strokeLoop(g, 0, N, 2, 'rgba(255,170,90,.35)', [16, 22]);
            g.shadowColor = '#ff7a1a'; g.shadowBlur = 8; g.strokeStyle = '#ffa04d'; g.lineWidth = 2;
            for (i = 7; i < N; i += 23) {  /* glowing cracks in the road */
                p = side(i, (rnd() - 0.5) * HW * 1.2); g.beginPath(); g.moveTo(p.x, p.y);
                var cx = p.x, cy = p.y;
                for (k = 0; k < 4; k++) { cx += (rnd() - 0.5) * 26; cy += (rnd() - 0.5) * 26; g.lineTo(cx, cy); }
                g.stroke();
            }
            g.shadowBlur = 0;
            this.vents.forEach(function (v) { circle(g, v.x, v.y, 21, '#241c1a'); circle(g, v.x, v.y, 15, '#7c2d12'); circle(g, v.x, v.y, 8, '#fb923c'); circle(g, v.x, v.y, 3.5, '#fde68a'); });
        },
        effect: function (c) {
            var i;
            if (c.alt && c.z <= 0 && c.ai >= this.s0 && c.ai <= this.s1 && gateOpen(clock) < 0.5) {  /* the lava surge on the bridge */
                if (!(c.hot > 0)) { stat('surge'); if (mine(c)) { sfx(c, 'hit'); say('Hot paws! The lava is up!', c); } }
                c.hot = 0.5; c.slip = Math.max(c.slip, 0.3);
            }
            if (c.z > 0 || c.rampT > 0) return;
            for (i = 0; i < this.vents.length; i++) {  /* heat vents toss you up and to the side */
                var v = this.vents[i];
                if (Math.hypot(c.x - v.x, c.y - v.y) > 22) continue;
                c.vz = 80; c.z = 0.01; c.rampT = 0.9; stat('vent');
                var sd = i % 2 ? 1 : -1; c.vx += -Math.sin(v.a) * sd * 90; c.vy += Math.cos(v.a) * sd * 90;
                sfx(c, 'jump'); if (quiet(c, 4)) say('Whoosh! Hot air!', c);
            }
        },
        update: function (dt) {
            this.vents.forEach(function (v) {  /* steam and embers */
                v.t -= dt;
                if (v.t <= 0 && vis(v.x, v.y, 80)) { v.t = 0.12; puff(Math.random() < 0.3 ? 'lava' : 'dust', v.x, v.y, (Math.random() - 0.5) * 30, -40 - Math.random() * 40, 0.9, 2 + Math.random() * 4); }
            });
            var bt = (clock + 6) % 24;  /* the volcano erupts every 24 s: the view shakes when you are close */
            if (phase === 'race' && bt < 0.1 && Math.abs(clock - this.boom) > 1) {
                this.boom = clock;
                if (!api.reducedMotion && Math.hypot(me.x - this.peak.x, me.y - this.peak.y) < 1100) shake = Math.max(shake, 5);
                near(this.peak.x, this.peak.y, 900, 'hit');
            }
            if (phase !== 'race' || remote) return;
            strikes(this.burst, dt, [2.4, 2.4], function (m) {
                for (var k = 0; k < 14; k++) puff('lava', m.x, m.y, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 240, 0.9, 3 + Math.random() * 4);
                near(m.x, m.y, 500, 'hit');
                karts.forEach(function (c) {
                    if (c.z < 20 && !(c.fall > 0) && Math.hypot(c.x - m.x, c.y - m.y) < 48) { stat('burst'); if (spinOut(c, 0.9, 'Lava burst! Hot hot hot!')) c.hot = 0.8; }
                });
            });
        },
        under: function () {
            var o = gateOpen(clock), k, i, pts;
            ctx.lineCap = ctx.lineJoin = 'round';
            for (i = 0; i < this.rivers.length; i++) {  /* the lava flowing: bright streaks moving down each river, bubbles popping */
                var bx = this.box[i];
                if (!vis(bx[0], bx[1], bx[2])) continue;
                pts = this.rivers[i];
                ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
                for (k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
                ctx.strokeStyle = 'rgba(255,240,170,.75)'; ctx.lineWidth = 6; ctx.setLineDash([14, 30]); ctx.lineDashOffset = -clock * 40; ctx.stroke();
                ctx.setLineDash([]); ctx.lineDashOffset = 0;
                for (k = 4; k < pts.length; k += 6) {
                    var bp = (clock * 0.7 + k * 0.37) % 1.6;
                    if (bp < 1) { ctx.globalAlpha = 1 - bp; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pts[k] + Math.sin(k) * 8, pts[k + 1] + Math.cos(k) * 6, 3 + bp * 7, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
                }
            }
            if (o < 1) {  /* the lava surge flooding the middle of the bridge, with a warning glow before it */
                ctx.globalAlpha = 1 - o;
                strokeAlt(ctx, this.s0, this.s1, 2 * ALT.hw + 8, '#ea580c', []);
                strokeAlt(ctx, this.s0, this.s1, 2 * ALT.hw - 16, '#fbbf24', []);
                ctx.globalAlpha = 1;
            }
            this.burst.list.forEach(function (m) {
                if (!vis(m.x, m.y, 60)) return;
                if (m.t < 1.4) warnRing(m, '#f97316');
                else { ctx.globalAlpha = Math.max(0, 1 - (m.t - 1.4) / 1.6); circle(ctx, m.x, m.y, 30, '#7c2d12'); circle(ctx, m.x, m.y, 20, '#f97316'); circle(ctx, m.x, m.y, 9, '#fde68a'); ctx.globalAlpha = 1; }
            });
            for (k = 0; k < this.vents.length; k++) {
                var v = this.vents[k];
                if (vis(v.x, v.y, 30)) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(clock * 6 + k); circle(ctx, v.x, v.y, 26, '#fb923c'); ctx.globalAlpha = 1; }
            }
        },
        over: function () {
            var pk = this.peak, k, i;
            for (i = 0; i < this.rivers.length; i++) {  /* embers rising off the lava */
                var bx = this.box[i], pts = this.rivers[i];
                if (!vis(bx[0], bx[1], bx[2] + 60)) continue;
                for (k = 2; k < pts.length; k += 8) {
                    var et = (clock * 0.6 + k * 0.29) % 1.5;
                    if (et > 1) continue;
                    ctx.globalAlpha = 1 - et; circle(ctx, pts[k] + Math.sin(clock * 2 + k) * 10, pts[k + 1] - et * 70, 2.2, et < 0.5 ? '#fde68a' : '#fb923c');
                }
                ctx.globalAlpha = 1;
            }
            var er = (clock + 6) % 24, boom = er < 4 ? er / 4 : -1;  /* the eruption: 4 s of lava bombs and a big glow */
            if (pk && vis(pk.x, pk.y, 420)) {  /* the volcano: rings of rock, each a little higher, a glowing crater, lava running down and smoke */
                var RING = ['#3a2c27', '#45332c', '#523b31', '#5e4336', '#6b4a3a'];
                for (k = 0; k < 5; k++) {
                    var r = 240 - k * 40, h = 0.02 + k * 0.03, x = liftX(pk.x, h), y = liftY(pk.y, h);
                    ctx.fillStyle = RING[k]; ctx.beginPath();
                    for (var a = 0; a < 16; a++) { var rr2 = r * (0.9 + 0.1 * Math.sin(a * 2.7 + k)); ctx.lineTo(x + Math.cos(a * 0.3927) * rr2, y + Math.sin(a * 0.3927) * rr2); }
                    ctx.closePath(); ctx.fill();
                }
                var cx = liftX(pk.x, 0.2), cy = liftY(pk.y, 0.2), fl = 0.8 + 0.2 * Math.sin(clock * 3) + (boom >= 0 ? 0.25 * (1 - boom) : 0);
                ctx.lineCap = 'round';
                for (k = 0; k < 3; k++) {  /* three lava streams running down the cone */
                    var la = 0.6 + k * 2.1, fx = liftX(pk.x + Math.cos(la) * 230, 0.02), fy = liftY(pk.y + Math.sin(la) * 230, 0.02), mx = (cx + fx) / 2 + Math.cos(la + 1.4) * 30, my = (cy + fy) / 2 + Math.sin(la + 1.4) * 30;
                    ctx.beginPath(); ctx.moveTo(cx + Math.cos(la) * 40, cy + Math.sin(la) * 40); ctx.quadraticCurveTo(mx, my, fx, fy);
                    ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 14; ctx.setLineDash([]); ctx.stroke();
                    ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 5; ctx.setLineDash([10, 18]); ctx.lineDashOffset = -clock * 30; ctx.stroke();
                }
                ctx.setLineDash([]); ctx.lineDashOffset = 0;
                circle(ctx, cx, cy, 66, '#2a1d19'); circle(ctx, cx, cy, 52 * fl, '#c2410c'); circle(ctx, cx, cy, 36 * fl, '#fb923c'); circle(ctx, cx, cy, 16 * fl, '#fde68a');
                for (k = 0; k < 6; k++) {  /* smoke drifting up out of the crater, thick and dark while it erupts */
                    var t = (clock * 0.25 + k / 6) % 1, sx = liftX(pk.x, 0.2 + t * 0.15) + t * 90, sy = liftY(pk.y, 0.2 + t * 0.15) - t * 140;
                    ctx.globalAlpha = (boom >= 0 ? 0.7 : 0.45) * (1 - t); circle(ctx, sx, sy, 30 + t * (boom >= 0 ? 90 : 50), boom >= 0 ? '#3f3a36' : '#57534e'); ctx.globalAlpha = 1;
                }
                if (boom >= 0) {  /* lava bombs flying out in arcs */
                    ctx.globalAlpha = 0.35 * (1 - boom); circle(ctx, cx, cy, 120 + boom * 60, '#fb923c'); ctx.globalAlpha = 1;
                    for (k = 0; k < 10; k++) {
                        var ba = k * 0.63 + Math.floor(clock / 24) * 1.3, bf = Math.min(1, boom * 1.6 + (k % 3) * 0.1), bd = bf * (260 + (k % 4) * 60), bz = Math.sin(bf * Math.PI) * 160;
                        var bx2 = liftX(pk.x + Math.cos(ba) * bd, 0.2 * (1 - bf)), by2 = liftY(pk.y + Math.sin(ba) * bd, 0.2 * (1 - bf)) - bz;
                        if (bf < 1) { circle(ctx, bx2, by2, 9, '#c2410c'); circle(ctx, bx2 - 2, by2 - 2, 5, '#fde68a'); }
                        else { ctx.globalAlpha = Math.max(0, 1 - (boom - 0.6) * 2.5); circle(ctx, bx2, by2, 12, '#7c2d12'); circle(ctx, bx2, by2, 6, '#fb923c'); ctx.globalAlpha = 1; }
                    }
                }
            }
            drawFlock(this.birds, ['#1c1917', '#292524'], '#1c1917');
            drawFans(this.fans, function (f, fx, fy) { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(fx, fy - 1, 5.6, Math.PI, 0); ctx.fill(); ctx.fillRect(fx - 7, fy - 1.5, 14, 2); });  /* hard hats */
            this.burst.list.forEach(function (m) {  /* the lava fountain */
                if (m.t < 1.4 || m.t > 2 || !vis(m.x, m.y, 80)) return;
                var f = (m.t - 1.4) / 0.6;
                for (var k = 0; k < 5; k++) circle(ctx, m.x + Math.sin(k * 2.1) * 10 * f, m.y - Math.sin(f * Math.PI) * (30 + k * 9), 9 - k, k % 2 ? '#fb923c' : '#fde68a');
            });
            drawParts('lava');
        },
        thumbDeco: function (g) {  /* the picker: the lava rivers and the volcano with its glowing crater */
            g.lineCap = g.lineJoin = 'round';
            this.rivers.forEach(function (pts) {
                g.strokeStyle = '#f97316'; g.lineWidth = 40; g.beginPath(); g.moveTo(pts[0], pts[1]);
                for (var q = 2; q < pts.length; q += 2) g.lineTo(pts[q], pts[q + 1]);
                g.stroke();
            });
            var pk = this.peak;
            circle(g, pk.x, pk.y, 240, '#4a3229'); circle(g, pk.x, pk.y, 150, '#6b4a3a'); circle(g, pk.x, pk.y, 80, '#f97316'); circle(g, pk.x, pk.y, 40, '#fde68a');
        }
    };

    /* Giant Grove: a bark road over the roots of huge trees, lanterns and fireflies, a plank bridge, a hollow log shortcut */
