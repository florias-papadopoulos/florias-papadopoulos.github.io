    /* ---------- skies: one cached canvas per world, wider and taller than the screen, shifted as the path turns and rolls ---------- */
    function vgrad(g, y0, y1, stops) {
        var gr = g.createLinearGradient(0, y0, 0, y1);
        stops.forEach(function (s) { gr.addColorStop(clamp(s[0], 0, 1), rgba(s[1], s[2])); });
        return gr;
    }
    function glowAt(g, x, y, r, c, a, sy) {
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.45, rgba(c, a * 0.42)); gr.addColorStop(1, rgba(c, 0));
        g.save(); g.translate(x, y); g.scale(1, sy || 1); g.translate(-x, -y);
        g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        g.restore();
    }
    function starsAt(g, w, y0, y1, n, r, a) {
        g.fillStyle = '#ffffff';
        for (var i = 0; i < n; i++) {
            var s = r() < 0.07 ? 2.1 : r() < 0.4 ? 1.4 : 0.9, x = r() * w, y = y0 + r() * (y1 - y0);
            g.globalAlpha = a * (0.25 + 0.75 * r());
            g.fillRect(x, y, s, s);
            if (s > 2) { g.globalAlpha *= 0.5; g.fillRect(x - 3, y + 0.5, 8, 1); g.fillRect(x + 0.5, y - 3, 1, 8); }
        }
        g.globalAlpha = 1;
    }
    function gearPath(g, x, y, r, n, tooth) {
        g.beginPath();
        for (var i = 0; i < n * 4; i++) {
            var a = i / (n * 4) * TAU, rr = (i % 4 < 2) ? r : r - tooth;
            if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.closePath();
    }
    function puffRow(g, w, y, rad, top, low, r) {  /* a row of soft cloud puffs: shaded underneath, lit on top, feathered edges */
        for (var x = -rad; x < w + rad; x += rad * (0.9 + r() * 0.8)) {
            var rr = rad * (0.75 + r() * 0.7), yy = y + (r() - 0.5) * rad * 0.3, gl = g.createRadialGradient(x, yy + rr * 0.3, 0, x, yy + rr * 0.3, rr * 1.15);
            gl.addColorStop(0, rgba(low, 0.5)); gl.addColorStop(1, rgba(low, 0));
            g.fillStyle = gl; g.fillRect(x - rr * 1.2, yy - rr * 0.9, rr * 2.4, rr * 2.4);
            var gt = g.createRadialGradient(x - rr * 0.2, yy - rr * 0.3, 0, x, yy, rr);
            gt.addColorStop(0, rgba(top, 0.95)); gt.addColorStop(0.55, rgba(top, 0.55)); gt.addColorStop(1, rgba(top, 0));
            g.fillStyle = gt; g.fillRect(x - rr, yy - rr, rr * 2, rr * 2);
        }
    }
    var SKY = {
        isles: function (g, w, h, hor, r) {  /* a sunset above a sea of clouds, far islands with waterfalls */
            var Z = K.isles, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [40, 50, 128]], [hor * 0.4 / h, [96, 100, 190]], [hor * 0.74 / h, [214, 146, 182]],
                                          [(hor - 0.035 * u) / h, [255, 184, 168]], [hor / h, Z.fog], [(hor + 0.05 * u) / h, [255, 220, 210]], [1, [226, 170, 196]]]);
            g.fillRect(0, 0, w, h);
            starsAt(g, w, 0, hor * 0.32, 50, r, 0.55);
            var sx = w * 0.63, sy = hor - 0.075 * u;
            glowAt(g, sx, sy, 0.95 * u, [255, 196, 150], 0.5, 0.55);
            glowAt(g, sx, sy, 0.22 * u, [255, 238, 205], 0.9);
            g.fillStyle = '#fff7e6'; g.beginPath(); g.arc(sx, sy, 0.042 * u, 0, TAU); g.fill();
            g.globalCompositeOperation = 'lighter';
            for (var i = 0; i < 8; i++) {  /* soft sun rays */
                var a = -Math.PI / 2 + (i - 3.5) * 0.36 + (r() - 0.5) * 0.15, L = 1.3 * u, s = 0.035 + r() * 0.03;
                g.fillStyle = 'rgba(255,214,170,.045)';
                g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a - s) * L, sy + Math.sin(a - s) * L); g.lineTo(sx + Math.cos(a + s) * L, sy + Math.sin(a + s) * L); g.fill();
            }
            g.globalCompositeOperation = 'source-over';
            for (i = 0; i < 16; i++) {  /* high wisps */
                g.fillStyle = 'rgba(255,' + (180 + r() * 50 | 0) + ',' + (200 + r() * 30 | 0) + ',' + (0.12 + r() * 0.2).toFixed(2) + ')';
                g.beginPath(); g.ellipse(r() * w, hor * (0.12 + r() * 0.6), (0.06 + r() * 0.2) * u, (0.006 + r() * 0.012) * u, 0, 0, TAU); g.fill();
            }
            for (i = 0; i < 11; i++) {  /* far floating islands, the farther the paler */
                var x = r() * w, d = r(), y = hor - (0.04 + r() * 0.2) * u, s = (0.018 + (1 - d) * 0.05) * u;
                var col = lerpc([132, 104, 160], Z.fog, 0.35 + d * 0.5);
                var fg = g.createLinearGradient(0, y + s * 0.15, 0, y + 0.07 * u);
                fg.addColorStop(0, 'rgba(255,255,255,' + (0.55 - d * 0.3).toFixed(2) + ')'); fg.addColorStop(1, 'rgba(255,255,255,0)');
                g.fillStyle = fg; g.fillRect(x + s * 0.25, y + s * 0.1, Math.max(1.2, s * 0.12), 0.07 * u + hor - y);
                g.fillStyle = rgba(col);
                g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s * 0.3, y + s * 0.9, x + s * (r() - 0.5) * 0.4, y + s * 1.5);
                g.quadraticCurveTo(x + s * 0.4, y + s * 0.8, x + s, y); g.closePath(); g.fill();
                g.fillStyle = rgba(lerpc([140, 170, 130], Z.fog, 0.3 + d * 0.55));
                g.beginPath(); g.ellipse(x, y, s * 1.04, s * 0.22, 0, 0, TAU); g.fill();
                if (r() < 0.6) { g.beginPath(); g.arc(x + s * (r() - 0.5), y - s * 0.3, s * 0.35, 0, TAU); g.fill(); }
            }
            for (i = 0; i < 14; i++) {  /* the cloud sea, rows growing towards the viewer */
                var t = i / 13, yy = hor + Math.pow(t, 1.6) * (h - hor) * 1.05, rad = (0.016 + t * 0.11) * u;
                puffRow(g, w, yy, rad, lerpc([255, 244, 240], Z.fog, 0.5 * (1 - t)), lerpc([206, 150, 196], Z.fog, 0.55 * (1 - t)), r);
            }
        },
        glow: function (g, w, h, hor, r) {  /* night over the hollow: a green moon, giant glowing mushrooms far away */
            var Z = K.glow, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [4, 8, 24]], [hor * 0.55 / h, [12, 26, 58]], [hor / h, Z.fog], [(hor + 0.05 * u) / h, [18, 36, 60]], [1, [8, 16, 30]]]);
            g.fillRect(0, 0, w, h);
            starsAt(g, w, 0, hor * 0.7, 90, r, 0.6);
            var mx = w * 0.3, my = hor * 0.34;
            glowAt(g, mx, my, 0.3 * u, [150, 255, 220], 0.35);
            g.fillStyle = '#e4fff2'; g.beginPath(); g.arc(mx, my, 0.04 * u, 0, TAU); g.fill();
            g.fillStyle = 'rgba(160,220,200,.5)'; g.beginPath(); g.arc(mx + 0.012 * u, my - 0.008 * u, 0.009 * u, 0, TAU); g.fill();
            glowAt(g, w / 2, hor, 0.9 * u, [60, 220, 200], 0.22, 0.3);
            for (var row = 0; row < 2; row++) {
                for (var x = -20; x < w + 20; x += (0.05 + r() * 0.1) * u) {
                    var s = (row ? 0.07 : 0.035) * u * (0.6 + r() * 0.8), base = hor + (row ? 0.02 : 0.004) * u, top = base - s * (1.3 + r());
                    var col = lerpc(row ? [12, 26, 44] : [20, 40, 66], Z.fog, row ? 0.25 : 0.55), cap = r() < 0.5 ? [80, 255, 210] : r() < 0.5 ? [220, 110, 255] : [120, 180, 255];
                    glowAt(g, x, top + s * 0.1, s * 1.1, cap, row ? 0.22 : 0.14);
                    g.fillStyle = rgba(col);
                    g.fillRect(x - s * 0.09, top, s * 0.18, base - top + 2);
                    g.beginPath(); g.ellipse(x, top, s * 0.75, s * 0.42, 0, Math.PI, TAU); g.closePath(); g.fill();
                    g.fillStyle = rgba(cap, row ? 0.85 : 0.5);
                    for (var k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * s, top - r() * s * 0.3, Math.max(0.8, s * 0.06), 0, TAU); g.fill(); }
                }
            }
            g.fillStyle = vgrad(g, hor, h, [[0, [14, 30, 52], 0], [0.3, [10, 22, 40], 0.85], [1, [6, 14, 26], 1]]);
            g.fillRect(0, hor + 0.03 * u, w, h);
        },
        geode: function (g, w, h, hor, r) {  /* a vast cavern: giant crystals from the roof and the floor */
            var Z = K.geode, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [14, 6, 28]], [hor / h, Z.fog], [1, [16, 8, 28]]]);
            g.fillRect(0, 0, w, h);
            glowAt(g, w / 2, hor, 1.0 * u, [190, 110, 255], 0.38, 0.5);
            var cols = [[150, 100, 230], [90, 170, 240], [200, 110, 220], [120, 90, 210]];
            for (var i = 0; i < 34; i++) {
                var down = i % 2 === 0, x = r() * w, L = (0.08 + r() * 0.3) * u, wd = L * (0.12 + r() * 0.1), c = cols[(r() * 4) | 0], d = r();
                var y0 = down ? 0 : h, tip = down ? Math.min(hor - 0.02 * u, y0 + L) : Math.max(hor + 0.04 * u, y0 - L), lean = (r() - 0.5) * wd * 2;
                var cc = lerpc(c, Z.fog, 0.3 + d * 0.5);
                glowAt(g, x + lean, tip, wd * 2.2, c, 0.25);
                g.fillStyle = rgba(cc); g.beginPath(); g.moveTo(x - wd, y0); g.lineTo(x + lean, tip); g.lineTo(x, y0); g.fill();
                g.fillStyle = rgba(lerpc(cc, [255, 255, 255], 0.3)); g.beginPath(); g.moveTo(x, y0); g.lineTo(x + lean, tip); g.lineTo(x + wd, y0); g.fill();
            }
            g.fillStyle = '#ffffff';
            for (i = 0; i < 90; i++) { g.globalAlpha = 0.2 + r() * 0.6; g.fillRect(r() * w, r() * h, 1.3, 1.3); }
            g.globalAlpha = 1;
        },
        aurora: function (g, w, h, hor, r) {  /* polar night: stars, snowy peaks, the palace on the horizon, a snowfield */
            var Z = K.aurora, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [4, 8, 30]], [hor * 0.5 / h, [14, 30, 72]], [hor * 0.88 / h, [48, 84, 138]], [hor / h, Z.fog],
                                          [(hor + 0.02 * u) / h, [184, 208, 232]], [1, [142, 172, 212]]]);
            g.fillRect(0, 0, w, h);
            starsAt(g, w, 0, hor * 0.85, 170, r, 0.8);
            for (var layer = 0; layer < 2; layer++) {
                var col = layer ? [70, 98, 146] : lerpc([110, 140, 190], Z.fog, 0.4), base = hor + 2, x = -10;
                g.fillStyle = rgba(col); g.beginPath(); g.moveTo(-10, base);
                var peaks = [];
                while (x < w + 10) { var pw = (0.04 + r() * 0.08) * u, ph = (layer ? 0.04 : 0.07) * u * (0.4 + r()); g.lineTo(x + pw / 2, base - ph); peaks.push([x + pw / 2, base - ph, pw]); x += pw; g.lineTo(x, base - ph * 0.3 * r()); }
                g.lineTo(w + 10, base); g.closePath(); g.fill();
                g.fillStyle = layer ? 'rgba(235,245,255,.85)' : 'rgba(225,238,255,.5)';
                peaks.forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - p[2] * 0.16, p[1] + p[2] * 0.2); g.lineTo(p[0] + p[2] * 0.18, p[1] + p[2] * 0.22); g.fill(); });
            }
            var px0 = w * 0.36, pc = [58, 82, 130];  /* the palace: towers with onion domes and lit windows */
            glowAt(g, px0, hor - 0.05 * u, 0.25 * u, [140, 230, 255], 0.25);
            for (var i = -4; i <= 4; i++) {
                var tx = px0 + i * 0.022 * u, th = (0.05 + (4 - Math.abs(i)) * 0.022 + r() * 0.02) * u, tw = 0.012 * u;
                g.fillStyle = rgba(pc); g.fillRect(tx - tw / 2, hor - th, tw, th + 2);
                g.beginPath(); g.arc(tx, hor - th, tw * 0.75, Math.PI, TAU); g.lineTo(tx, hor - th - tw * 1.9); g.closePath(); g.fill();
                g.fillStyle = 'rgba(160,240,255,.9)';
                for (var k = 0; k < 3; k++) if (r() < 0.7) g.fillRect(tx - 0.8, hor - th + tw * (1 + k * 1.3), 1.6, 2.2);
            }
            g.fillStyle = 'rgba(255,255,255,.35)';
            for (i = 0; i < 40; i++) g.fillRect(r() * w, hor + 0.03 * u + r() * (h - hor), 1.4, 1.4);
        },
        clock: function (g, w, h, hor, r) {  /* inside the spire: warm haze, giant gears and chains far off */
            var Z = K.clock, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [30, 16, 10]], [hor * 0.6 / h, [86, 50, 28]], [hor / h, Z.fog], [(hor + 0.06 * u) / h, [88, 54, 30]], [1, [26, 16, 10]]]);
            g.fillRect(0, 0, w, h);
            glowAt(g, w / 2, hor, 0.9 * u, [255, 182, 96], 0.4, 0.6);
            for (var i = 0; i < 16; i++) {
                var x = r() * w, y = r() * h, s = (0.04 + r() * 0.2) * u, d = r(), col = lerpc([64, 38, 22], Z.fog, 0.25 + d * 0.6);
                g.fillStyle = rgba(col); gearPath(g, x, y, s, 10 + (r() * 10 | 0), s * 0.12); g.fill();
                g.fillStyle = rgba(lerpc(col, Z.fog, 0.4)); g.beginPath(); g.arc(x, y, s * 0.55, 0, TAU); g.fill();
                g.fillStyle = rgba(col); g.beginPath(); g.arc(x, y, s * 0.18, 0, TAU); g.fill();
                g.strokeStyle = rgba(lerpc([255, 200, 120], Z.fog, 0.4), 0.35); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, s * 0.9, -2.4, -0.8); g.stroke();
            }
            g.strokeStyle = 'rgba(40,24,14,.5)'; g.lineWidth = 2;
            for (i = 0; i < 9; i++) { var cxx = r() * w; g.beginPath(); g.moveTo(cxx, 0); g.lineTo(cxx + (r() - 0.5) * 20, h); g.stroke(); }
            for (i = 0; i < 40; i++) glowAt(g, r() * w, r() * h, 3 + r() * 6, [255, 200, 120], 0.6);
        },
        wool: function (g, w, h, hor, r) {  /* a pastel dream: button suns, cotton clouds, knitted hills */
            var Z = K.wool, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [146, 166, 238]], [hor * 0.5 / h, [204, 182, 242]], [hor * 0.86 / h, [255, 200, 228]], [hor / h, Z.fog],
                                          [(hor + 0.03 * u) / h, [196, 236, 214]], [1, [150, 210, 186]]]);
            g.fillRect(0, 0, w, h);
            buttonPaint(g, w * 0.7, hor - 0.17 * u, 0.075 * u, [255, 212, 110], true);
            buttonPaint(g, w * 0.2, hor - 0.28 * u, 0.034 * u, [255, 150, 196], true);
            for (var i = 0; i < 12; i++) {  /* cotton clouds */
                var cx0 = r() * w, cy0 = hor * (0.15 + r() * 0.6), s = (0.03 + r() * 0.05) * u;
                for (var k = 0; k < 5; k++) {
                    var x = cx0 + (k - 2) * s * 0.7, y = cy0 - Math.sin(k / 4 * Math.PI) * s * 0.4, rr = s * (0.5 + Math.sin(k / 4 * Math.PI) * 0.35);
                    var cg = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr);
                    cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(0.7, 'rgba(255,240,250,.75)'); cg.addColorStop(1, 'rgba(255,230,245,0)');
                    g.fillStyle = cg; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
                }
            }
            var cols = [[206, 190, 250], [255, 196, 222], [176, 228, 200]];
            for (var layer = 0; layer < 3; layer++) {  /* rolling knitted hills, back to front */
                var base = hor + (layer * 0.012 + 0.004) * u, amp = (0.03 + layer * 0.02) * u, col = lerpc(cols[layer], Z.fog, 0.55 - layer * 0.22), ph = r() * 6;
                g.save(); g.beginPath(); g.moveTo(-10, h);
                for (var x2 = -10; x2 <= w + 10; x2 += 8) g.lineTo(x2, base - amp * (0.6 + 0.4 * Math.sin(x2 / (0.12 * u) + ph)) * (0.7 + 0.3 * Math.sin(x2 / (0.05 * u) + ph * 2)));
                g.lineTo(w + 10, h); g.closePath();
                g.fillStyle = rgba(col); g.fill(); g.clip();
                knitRows(g, -10, base - amp * 1.2, w + 20, h - base + amp * 1.2, 4 + layer * 2, rgba(lerpc(col, [120, 80, 140], 0.14)));
                g.restore();
            }
        },
        stars: function (g, w, h, hor, r) {  /* deep space: nebulae, a ringed planet, a moon, stars above and below */
            var Z = K.stars, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [5, 3, 18]], [hor / h, Z.fog], [1, [6, 4, 20]]]);
            g.fillRect(0, 0, w, h);
            g.globalCompositeOperation = 'lighter';
            glowAt(g, w * 0.7, hor * 0.5, 0.6 * u, [255, 70, 170], 0.22, 0.6);
            glowAt(g, w * 0.2, hor * 0.8, 0.5 * u, [70, 130, 255], 0.2, 0.7);
            glowAt(g, w * 0.5, hor + 0.25 * u, 0.7 * u, [150, 70, 255], 0.16, 0.5);
            glowAt(g, w * 0.88, hor + 0.1 * u, 0.35 * u, [80, 220, 255], 0.14);
            g.globalCompositeOperation = 'source-over';
            starsAt(g, w, 0, h, 480, r, 0.95);
            var plx = w * 0.24, ply = hor - 0.17 * u, pr = 0.085 * u;
            function ring(front) {
                g.strokeStyle = 'rgba(255,214,170,.75)'; g.lineWidth = pr * 0.09;
                g.beginPath(); g.ellipse(plx, ply, pr * 1.9, pr * 0.42, -0.25, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
                g.strokeStyle = 'rgba(255,170,200,.4)'; g.lineWidth = pr * 0.05;
                g.beginPath(); g.ellipse(plx, ply, pr * 1.6, pr * 0.34, -0.25, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
            }
            glowAt(g, plx, ply, pr * 2, [255, 150, 120], 0.25);
            ring(false);
            var pg = g.createRadialGradient(plx - pr * 0.4, ply - pr * 0.4, pr * 0.1, plx, ply, pr);
            pg.addColorStop(0, '#ffd6a8'); pg.addColorStop(0.6, '#e8806e'); pg.addColorStop(1, '#5a2850');
            g.fillStyle = pg; g.beginPath(); g.arc(plx, ply, pr, 0, TAU); g.fill();
            g.save(); g.beginPath(); g.arc(plx, ply, pr, 0, TAU); g.clip();
            g.fillStyle = 'rgba(120,40,80,.25)';
            for (var i = 0; i < 4; i++) g.fillRect(plx - pr, ply - pr * 0.5 + i * pr * 0.32, pr * 2, pr * 0.1);
            g.restore();
            ring(true);
            var mx = w * 0.8, my = hor * 0.28, mr = 0.03 * u;
            var mg = g.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, 0, mx, my, mr);
            mg.addColorStop(0, '#e8f4ff'); mg.addColorStop(1, '#5a6aa0');
            g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
        }
    };
    function buttonPaint(g, x, y, rad, c, sun) {  /* a big sewing button: rim, dish, four holes, a cross of thread */
        if (sun) glowAt(g, x, y, rad * 3.2, c, 0.5);
        var bg = g.createRadialGradient(x - rad * 0.35, y - rad * 0.35, rad * 0.1, x, y, rad);
        bg.addColorStop(0, rgba(lerpc(c, [255, 255, 255], 0.6))); bg.addColorStop(0.7, rgba(c)); bg.addColorStop(1, rgba(lerpc(c, [120, 60, 40], 0.35)));
        g.fillStyle = bg; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
        g.strokeStyle = rgba(lerpc(c, [120, 60, 60], 0.3), 0.8); g.lineWidth = rad * 0.08; g.beginPath(); g.arc(x, y, rad * 0.78, 0, TAU); g.stroke();
        var hp = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = rad * 0.07; g.lineCap = 'round'; g.beginPath();
        g.moveTo(x - rad * 0.24, y - rad * 0.24); g.lineTo(x + rad * 0.24, y + rad * 0.24); g.moveTo(x + rad * 0.24, y - rad * 0.24); g.lineTo(x - rad * 0.24, y + rad * 0.24); g.stroke();
        g.fillStyle = rgba(lerpc(c, [90, 40, 40], 0.55));
        hp.forEach(function (p) { g.beginPath(); g.arc(x + p[0] * rad * 0.24, y + p[1] * rad * 0.24, rad * 0.1, 0, TAU); g.fill(); });
    }
    function knitRows(g, x0, y0, w, h, s, col) {  /* rows of little V stitches, the look of knitted wool */
        g.strokeStyle = col; g.lineWidth = Math.max(0.8, s * 0.22); g.lineCap = 'round'; g.beginPath();
        for (var y = y0; y < y0 + h; y += s * 0.9) for (var x = x0 + ((y / s) & 1) * s * 0.5; x < x0 + w; x += s) {
            g.moveTo(x - s * 0.38, y - s * 0.3); g.lineTo(x, y + s * 0.3); g.lineTo(x + s * 0.38, y - s * 0.3);
        }
        g.stroke();
    }
    function skyCanvas(k) {
        if (!skyCache[k]) {
            var c = document.createElement('canvas'), w = W + 2 * SKYM, h = H + 2 * SKYV;
            c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
            var g = c.getContext('2d');
            g.scale(SS, SS);
            SKY[ZONES[k].key](g, w, h, HY + SKYV, seeded(17 + k * 31));
            skyCache[k] = c;
        }
        return skyCache[k];
    }
    function auroraRibbons(a, sx, sy) {  /* live curtains of light over the ice palace */
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var cols = [[90, 255, 170], [120, 200, 255], [220, 120, 255]];
        for (var i = 0; i < 3; i++) {
            var y0 = HOR * (0.16 + i * 0.13) + sy * 0, amp = F * 0.05, th = F * (0.07 + i * 0.015), n = 14;
            var gr = ctx.createLinearGradient(0, y0 - amp - th, 0, y0 + amp + th);
            gr.addColorStop(0, rgba(cols[i], 0)); gr.addColorStop(0.55, rgba(cols[i], 0.3 * a)); gr.addColorStop(1, rgba(cols[i], 0));
            ctx.fillStyle = gr;
            ctx.beginPath();
            for (var j = 0; j <= n; j++) {
                var x = -SKYM + (W + 2 * SKYM) * j / n + sx, yy = y0 + Math.sin(j * 0.7 + clock * (0.25 + i * 0.07) + i * 2) * amp;
                if (j) ctx.lineTo(x, yy - th); else ctx.moveTo(x, yy - th);
            }
            for (j = n; j >= 0; j--) {
                x = -SKYM + (W + 2 * SKYM) * j / n + sx; yy = y0 + Math.sin(j * 0.7 + clock * (0.25 + i * 0.07) + i * 2 + 0.5) * amp;
                ctx.lineTo(x, yy + th * 0.5);
            }
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
    function drawSky() {
        var sx = clamp(-camS * F, -SKYM, SKYM), sy = clamp(camT * F, -SKYV, SKYV), ks = [envA % NZ, envB % NZ];
        for (var i = 0; i < (envW > 0.002 && ks[1] !== ks[0] ? 2 : 1); i++) {
            var a = i ? envW : 1;
            ctx.globalAlpha = a;
            ctx.drawImage(skyCanvas(ks[i]), sx - SKYM, sy - SKYV, W + 2 * SKYM, H + 2 * SKYV);
            ctx.globalAlpha = 1;
        }
        var au = (ks[0] === K.aurora.i ? 1 - envW : 0) + (ks[1] === K.aurora.i && ks[1] !== ks[0] ? envW : 0);
        if (au > 0.01) auroraRibbons(au, sx, sy);
    }

