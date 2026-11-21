    /* Moon Rim: a dusty road on a slab of moon floating in space, low grip, ramps for long low gravity jumps */
    var MOON = {
        id: 'moon', name: 'Moon Rim', blurb: 'Low grip, meteors, a jump over a crack',
        ctrl: [250, 250, 800, 200, 1350, 250, 1600, 450, 1500, 700, 1150, 700, 950, 560, 700, 520, 520, 700, 700, 900,
               1150, 920, 1450, 1050, 1300, 1250, 700, 1300, 250, 1150, 150, 700], scale: 0.74, start: 0.09,
        phys: { vmax: 350, vgrass: 125, acc: 300, grip: 3.4, gripOff: 2.4, coast: 0.35, turn: 2.9, care: 1.4 },
        col: { bg: '#070b1c', edge: '#8d8f99', road: '#b8bbc5', panel: 'rgba(15,23,42,.72)', mini: '#cbd5e1', grid: 'rgba(255,255,255,.7)' },
        sky: true, RIM: HW + 84, G: 150,
        alt: { a: 142, b: 206, hw: 32, vf: 1, ramp: 0.3, gap: [0.4, 0.66] },
        pads: [[262, 0.5], [430, -0.5]], picks: [100, 300], padCol: ['#ca8a04', '#fef9c3'],
        altGood: function (c) { return c.vf > 170; },
        reset: function () { this.met = []; this.metT = 4; },
        prep: function () {
            this.ramps = [straightNear(0.12, -2, 30, 0.004), straightNear(0.47, -2, 30, 0.004), straightNear(0.8, -2, 30, 0.004)];
            seed = 77;
            this.blobs = [];
            for (var i = 0; i < 7; i++) {
                var j = Math.round(i * N / 7 + 20), sg = i % 2 ? 1 : -1, p = side(j, sg * (HW + 120)), o = { x: p.x, y: p.y };
                nearest(o);
                if (o.dist > HW + 100) this.blobs.push({ x: p.x, y: p.y, r: 80 + rnd() * 50 });
            }
            var far = { x: 0, y: 0, dist: 0 };  /* the Earth hangs in the emptiest bit of sky */
            for (var gx = 100; gx < WW - 100; gx += 40) for (var gy = 100; gy < WH - 100; gy += 40) {
                o = { x: gx, y: gy }; nearest(o);
                if (o.dist > far.dist) far = o;
            }
            this.ex = far.x; this.ey = far.y;
        },
        paint: function (g) {
            var i, k, p, b;
            g.clearRect(0, 0, WW, WH);  /* the space around stays see-through, the sky is drawn behind */
            var self = this;
            function slab(dx, dy, color) {
                g.save(); g.translate(dx, dy);
                strokeLoop(g, 0, N, 2 * (HW + 100), color);
                strokeAlt(g, 0, ALT.n - 1, 2 * (ALT.hw + 44), color);
                g.fillStyle = color; self.blobs.forEach(function (q) { g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); });
                g.restore();
            }
            slab(0, 26, '#2e3040'); slab(0, 13, '#4a4c5a'); slab(0, 0, '#9a9ca6');  /* the cliff edge, then the top */
            seed = 9;
            for (i = 0; i < N; i += 2) for (k = -1; k <= 1; k += 2) {  /* rocks along the rim */
                p = side(i, k * (HW + 96 + rnd() * 6)); var rr = 5 + rnd() * 9;
                circle(g, p.x, p.y + 3, rr, '#6e707c'); circle(g, p.x - rr * 0.2, p.y - rr * 0.2, rr * 0.7, '#a3a5af');
            }
            var o = { x: 0, y: 0 };
            for (i = 0; i < 1600; i++) {  /* dust texture and craters, only on the slab */
                o.x = rnd() * WW; o.y = rnd() * WH; nearest(o);
                if (o.dist > HW + 92) continue;
                if (i % 9) { circle(g, o.x, o.y, 1 + rnd() * 2.5, rnd() < 0.5 ? '#a9abb4' : '#8a8c96'); continue; }
                var cr = o.dist < HW + 4 ? 6 + rnd() * 6 : 10 + rnd() * 22;
                circle(g, o.x, o.y, cr, '#83858f'); circle(g, o.x + cr * 0.15, o.y + cr * 0.15, cr * 0.82, '#757783');
                g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1.5, cr * 0.14);
                g.beginPath(); g.arc(o.x, o.y, cr, 0.6, 2.6); g.stroke();
            }
            this.blobs.forEach(function (q, n) {
                for (k = 0; k < 4; k++) {
                    var a = rnd() * 7, d = rnd() * q.r * 0.6, x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d, r2 = 10 + rnd() * 18;
                    circle(g, x, y, r2, '#83858f'); circle(g, x + r2 * 0.15, y + r2 * 0.15, r2 * 0.82, '#757783');
                }
                if (n === 1) {  /* a little lander */
                    g.save(); g.translate(q.x, q.y);
                    g.strokeStyle = '#d1d5db'; g.lineWidth = 3;
                    for (k = 0; k < 4; k++) { var la = k * 1.571 + 0.785; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(la) * 26, Math.sin(la) * 26); g.stroke(); circle(g, Math.cos(la) * 26, Math.sin(la) * 26, 4, '#d1d5db'); }
                    circle(g, 4, 6, 15, 'rgba(0,0,0,.3)');
                    g.fillStyle = '#e0b84a'; g.fillRect(-13, -13, 26, 26);
                    circle(g, 0, 0, 9, '#f1f5f9'); circle(g, 2, -2, 3.5, '#60a5fa');
                    g.restore();
                }
                if (n === 3) {  /* a flag with a paw print */
                    g.save(); g.translate(q.x, q.y);
                    circle(g, 0, 0, 3, '#e5e7eb'); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(4, 4, 34, 22);
                    g.fillStyle = '#d6336c'; g.fillRect(0, -2, 34, 22);
                    circle(g, 17, 12, 4.5, '#fff'); circle(g, 11, 5, 2.2, '#fff'); circle(g, 15.5, 3, 2.2, '#fff'); circle(g, 20.5, 3, 2.2, '#fff'); circle(g, 25, 5, 2.2, '#fff');
                    g.restore();
                }
            });
            strokeAlt(g, ALT.g0, ALT.g1, 2 * ALT.hw + 96, '#3b3d4a', []);  /* the crack on the shortcut: jump it or fall into space */
            g.globalCompositeOperation = 'destination-out';
            strokeAlt(g, ALT.g0, ALT.g1, 2 * ALT.hw + 84, '#000', []);
            g.globalCompositeOperation = 'source-over';
            var ends = [[0, ALT.g0], [ALT.g1, ALT.n - 1]];
            ends.forEach(function (e) { strokeAlt(g, e[0], e[1], 2 * ALT.hw + 10, '#6f7280', []); });
            ends.forEach(function (e) { strokeAlt(g, e[0], e[1], 2 * ALT.hw, '#b8bbc5', []); });
            [ALT.g0, ALT.g1].forEach(function (j) {  /* hazard stripes at both edges of the crack */
                g.save(); g.translate(ALT.x[j], ALT.y[j]); g.rotate(ALT.ang[j]);
                for (b = -ALT.hw; b < ALT.hw; b += 8) { g.fillStyle = (b / 8) % 2 ? '#111827' : '#facc15'; g.fillRect(j === ALT.g0 ? -8 : 0, b, 8, 8); }
                g.restore();
            });
            strokeLoop(g, 0, N, 2 * HW + 10, '#6f7280');  /* the road */
            strokeLoop(g, 0, N, 2 * HW, '#b8bbc5');
            skids(g, 'rgba(70,72,85,.22)');
            strokeLoop(g, 0, N, 2, 'rgba(255,255,255,.45)', [16, 20]);
            for (i = 0; i < N; i += 4) for (k = -1; k <= 1; k += 2) {  /* runway lights along both edges */
                p = side(i, k * (HW + 2)); circle(g, p.x, p.y, 6, 'rgba(110,220,255,.25)'); circle(g, p.x, p.y, 2.6, '#bff3ff');
            }
            this.ramps.concat([-ALT.ramp - 1]).forEach(function (j) {  /* ramps: yellow plates with chevrons */
                g.save(); g.translate(rX(j), rY(j)); g.rotate(rA(j));
                var hw = j < 0 ? ALT.hw : HW;
                g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-14, -hw + 2, 34, 2 * hw - 4);
                g.fillStyle = '#e2b13c'; g.fillRect(-18, -hw + 4, 34, 2 * hw - 8);
                g.fillStyle = '#fde68a'; g.fillRect(12, -hw + 4, 4, 2 * hw - 8);
                g.strokeStyle = '#3b2a10'; g.lineWidth = 4;
                for (b = -hw + 18; b < hw - 10; b += 22) { g.beginPath(); g.moveTo(-10, b - 7); g.lineTo(4, b); g.lineTo(-10, b + 7); g.stroke(); }
                g.restore();
            });
        },
        jumpK: 0.22, jumpSay: 'Wheee! Low gravity!', fallSay: 'Lost in space! Back you go.',
        effect: function (c) {
            if (!c.z && c.dist > HW + 4 && Math.abs(c.vf) > 90 && Math.random() < 0.25) puff('dust', c.x, c.y, -c.vx * 0.1, -c.vy * 0.1, 0.7, 4 + Math.random() * 3);
            nearest(c);
            var rim = c.alt && c.ai > 3 && c.ai < ALT.n - 4 ? ALT.hw + 36 : this.RIM;
            if (c.dist > rim) {  /* the rocks on the rim stop you from driving into space */
                var px = c.px, py = c.py, nx = (c.x - px) / c.dist, ny = (c.y - py) / c.dist, vn = c.vx * nx + c.vy * ny;
                c.x = px + nx * rim; c.y = py + ny * rim;
                if (vn > 0) { c.vx -= nx * vn * 1.4; c.vy -= ny * vn * 1.4; if (mine(c) && vn > 60 && clock - c.hitAt > 0.5) { c.hitAt = clock; sfx(c, 'hit'); } }
            }
        },
        update: function (dt) {  /* meteor showers: a warning ring first, then the rock */
            if (phase !== 'race' || remote) return;
            var i, m, self = this;
            this.metT -= dt;
            if (this.metT <= 0) {
                this.metT = 2.6 + Math.random() * 2.6;
                var lead = me;
                karts.forEach(function (c) { if (!c.fin && c.prog > lead.prog) lead = c; });
                var p = side(lead.idx + 26 + Math.floor(Math.random() * 30), (Math.random() - 0.5) * 1.2 * HW);
                this.met.push({ x: p.x, y: p.y, t: 0 });
            }
            for (i = this.met.length - 1; i >= 0; i--) {
                m = this.met[i]; m.t += dt;
                if (m.t >= 1.5 && !m.hit) {
                    m.hit = true;
                    for (var k = 0; k < 10; k++) puff('dust', m.x, m.y, (Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220, 0.9, 6 + Math.random() * 6);
                    near(m.x, m.y, 500, 'hit');
                    karts.forEach(function (c) { if (c.z < 20 && !(c.fall > 0) && Math.hypot(c.x - m.x, c.y - m.y) < 50) { stat('meteor'); spinOut(c, 1, 'Meteor! Ouch!'); } });
                }
                if (m.t > 3.2) self.met.splice(i, 1);
            }
        },
        under: function () {
            this.met.forEach(function (m) {
                if (!vis(m.x, m.y, 60)) return;
                if (m.t < 1.5) {
                    var pulse = 0.5 + 0.5 * Math.sin(m.t * 18);
                    ctx.fillStyle = 'rgba(239,68,68,.14)'; ctx.beginPath(); ctx.arc(m.x, m.y, 50, 0, 7); ctx.fill();
                    ctx.strokeStyle = 'rgba(239,68,68,' + (0.5 + 0.4 * pulse).toFixed(2) + ')'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(m.x, m.y, 50 - m.t * 12, 0, 7); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(m.x - 12, m.y); ctx.lineTo(m.x + 12, m.y); ctx.moveTo(m.x, m.y - 12); ctx.lineTo(m.x, m.y + 12); ctx.stroke();
                } else {
                    var f = Math.max(0, 1 - (m.t - 1.5) / 1.7);
                    ctx.globalAlpha = f; circle(ctx, m.x, m.y, 30, '#3c3c46'); circle(ctx, m.x, m.y, 18, '#ff8c28'); ctx.globalAlpha = 1;
                }
            });
        },
        over: function () {  /* the falling rocks, coming in from the top right */
            this.met.forEach(function (m) {
                if (m.t < 1 || m.t >= 1.5) return;
                var f = (1.5 - m.t) / 0.5, x = m.x + f * 260, y = m.y - f * 380;
                if (!vis(x, y, 90)) return;
                ctx.strokeStyle = 'rgba(255,170,60,.6)'; ctx.lineWidth = 10; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y - 72); ctx.stroke();
                circle(ctx, x, y, 15, 'rgba(255,190,90,.35)'); circle(ctx, x, y, 12, '#78716c'); circle(ctx, x - 3, y - 3, 6, '#a8a29e');
            });
        },
        drawSky: function (cw, ch, k) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#060a1a'; ctx.fillRect(0, 0, cw, ch);
            if (!this.stars) {  /* a tile of stars, and the Earth, drawn once */
                var t = this.stars = document.createElement('canvas'); t.width = t.height = 300;
                var g = t.getContext('2d'), s = 99;
                for (var i = 0; i < 70; i++) {
                    s = (s * 16807) % 2147483647; var x = s % 300; s = (s * 16807) % 2147483647; var y = s % 300; s = (s * 16807) % 2147483647;
                    var b = s % 10;
                    circle(g, x, y, b > 8 ? 1.8 : b > 5 ? 1.2 : 0.7, b > 8 ? '#fff7d6' : b > 5 ? '#e2e8f0' : '#94a3b8');
                }
                this.pat = ctx.createPattern(t, 'repeat');
                var e = this.earth = document.createElement('canvas'); e.width = e.height = 180;
                g = e.getContext('2d');
                var gl = g.createRadialGradient(90, 90, 60, 90, 90, 90); gl.addColorStop(0, 'rgba(120,180,255,.5)'); gl.addColorStop(1, 'rgba(120,180,255,0)');
                g.fillStyle = gl; g.fillRect(0, 0, 180, 180);
                g.save(); g.beginPath(); g.arc(90, 90, 64, 0, 7); g.clip();
                g.fillStyle = '#2f6fd6'; g.fillRect(0, 0, 180, 180);
                g.fillStyle = '#4caf6a';
                [[70, 60, 22, 30], [105, 105, 26, 18], [60, 120, 14, 12], [118, 62, 12, 16]].forEach(function (c) { g.beginPath(); g.ellipse(c[0], c[1], c[2], c[3], 0.5, 0, 7); g.fill(); });
                g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 6; g.lineCap = 'round';
                [[40, 80, 90, 70], [80, 135, 130, 128], [95, 40, 135, 50]].forEach(function (c) { g.beginPath(); g.moveTo(c[0], c[1]); g.quadraticCurveTo((c[0] + c[2]) / 2, c[1] - 10, c[2], c[3]); g.stroke(); });
                var sh = g.createLinearGradient(50, 40, 150, 140); sh.addColorStop(0.45, 'rgba(6,10,26,0)'); sh.addColorStop(1, 'rgba(6,10,26,.85)');
                g.fillStyle = sh; g.fillRect(0, 0, 180, 180);
                g.restore();
            }
            var ox = (camX * k * 0.15) % 300, oy = (camY * k * 0.15) % 300;
            ctx.save(); ctx.translate(-ox, -oy); ctx.scale(dpr * 0.7, dpr * 0.7); ctx.fillStyle = this.pat; ctx.fillRect(0, 0, (cw + 600) / dpr / 0.7, (ch + 600) / dpr / 0.7); ctx.restore();
            var es = 230 * k, ex = (this.ex + (camX - this.ex) * 0.3) * k - VX0 * k, ey = (this.ey + (camY - this.ey) * 0.3) * k - VY0 * k;
            if (ex > -es && ex < cw + es && ey > -es && ey < ch + es) ctx.drawImage(this.earth, ex - es / 2, ey - es / 2, es, es);
        }
    };

