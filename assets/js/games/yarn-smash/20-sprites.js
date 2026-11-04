    /* ---------- sprites: scenery painted once with gradients, then drawn scaled (bottom-centre anchored unless said) ---------- */
    function spr(key, w, h, wk, paint) {  /* also keeps a silhouette in the world's fog colour, laid over the sprite as it recedes */
        var s = sprCache[key];
        if (s) return s;
        var c = document.createElement('canvas');
        c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
        var g = c.getContext('2d');
        g.scale(SS, SS);
        paint(g, w, h);
        var fg = document.createElement('canvas');
        fg.width = c.width; fg.height = c.height;
        var gf = fg.getContext('2d');
        gf.drawImage(c, 0, 0); gf.globalCompositeOperation = 'source-in'; gf.fillStyle = rgba(K[wk].fog); gf.fillRect(0, 0, fg.width, fg.height);
        s = sprCache[key] = { cv: c, fg: fg, w: w, h: h };
        return s;
    }
    function glowSpr(c) {  /* a soft round light for motes and halos */
        var key = c.join(',');
        if (glowCache[key]) return glowCache[key];
        var cvs = document.createElement('canvas'); cvs.width = cvs.height = 32;
        var g = cvs.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(0.25, rgba(c, 0.75)); gr.addColorStop(0.6, rgba(c, 0.18)); gr.addColorStop(1, rgba(c, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
        return (glowCache[key] = cvs);
    }
    function halo(x, y, r, c, a) { if (r < 0.5) return; ctx.globalAlpha = a; ctx.drawImage(glowSpr(c), x - r, y - r, 2 * r, 2 * r); }
    function crystalPaint(g, w, h, cols, n, tall, seed) {  /* a cluster of hexagonal prisms, lit from the left */
        var r = seeded(seed);
        glowAt(g, w / 2, h * 0.92, w * 0.5, cols[1], 0.45, 0.5);
        for (var i = 0; i < n; i++) {
            var t = n === 1 ? 0.5 : i / (n - 1), a = (t - 0.5) * 1.1 + (r() - 0.5) * 0.3, L = h * (0.45 + r() * 0.45) * (1 - Math.abs(t - 0.5) * (tall ? 0.6 : 0.9));
            var wd = w * (0.07 + r() * 0.05), bx = w / 2 + (t - 0.5) * w * 0.5, by = h - 2;
            var dx = Math.sin(a), dy = -Math.cos(a), nx = -dy, ny = dx;
            var tx = bx + dx * L, ty = by + dy * L, sx2 = bx + dx * (L - wd * 1.6), sy2 = by + dy * (L - wd * 1.6);
            var c = cols[(r() * cols.length) | 0];
            g.fillStyle = rgba(lerpc(c, [20, 10, 40], 0.35));
            g.beginPath(); g.moveTo(bx + nx * wd, by + ny * wd); g.lineTo(sx2 + nx * wd, sy2 + ny * wd); g.lineTo(tx, ty); g.lineTo(sx2, sy2); g.lineTo(bx, by); g.fill();
            var lg = g.createLinearGradient(bx, by, tx, ty);
            lg.addColorStop(0, rgba(c)); lg.addColorStop(1, rgba(lerpc(c, [255, 255, 255], 0.55)));
            g.fillStyle = lg;
            g.beginPath(); g.moveTo(bx - nx * wd, by - ny * wd); g.lineTo(sx2 - nx * wd, sy2 - ny * wd); g.lineTo(tx, ty); g.lineTo(sx2, sy2); g.lineTo(bx, by); g.fill();
            g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1, wd * 0.12);
            g.beginPath(); g.moveTo(bx, by); g.lineTo(sx2, sy2); g.lineTo(tx, ty); g.stroke();
        }
    }
    var SPR = {
        islet: function (v) {
            return spr('islet' + v, 200, 270, 'isles', function (g, w, h) {
                var r = seeded(5 + v * 13), top = 52;
                var rg = g.createLinearGradient(0, top, 0, h);
                rg.addColorStop(0, '#a87a66'); rg.addColorStop(0.45, '#7a5468'); rg.addColorStop(1, 'rgba(150,120,180,.2)');
                g.fillStyle = rg;
                g.beginPath(); g.moveTo(6, top);
                g.quadraticCurveTo(40, top + 90, 90 + v * 8, h - 6); g.quadraticCurveTo(150, top + 100, 194, top); g.closePath(); g.fill();
                g.strokeStyle = 'rgba(70,40,60,.35)'; g.lineWidth = 2;
                for (var i = 0; i < 5; i++) { g.beginPath(); g.moveTo(30 + r() * 40, top + 20 + i * 24); g.quadraticCurveTo(100, top + 30 + i * 26, 160 - r() * 30, top + 18 + i * 24); g.stroke(); }
                var gg = g.createLinearGradient(0, top - 22, 0, top + 18);
                gg.addColorStop(0, '#b8e08a'); gg.addColorStop(0.6, '#6fb46a'); gg.addColorStop(1, '#3f7f58');
                g.fillStyle = gg; g.beginPath(); g.ellipse(100, top, 97, 22, 0, 0, TAU); g.fill();
                g.fillStyle = '#4f9460';
                for (i = 0; i < 14; i++) { var x = 12 + i * 13 + r() * 4; g.beginPath(); g.moveTo(x - 5, top + 8); g.lineTo(x, top + 18 + r() * 14); g.lineTo(x + 5, top + 8); g.fill(); }
                if (v !== 1) {  /* a tree, rim lit by the sunset */
                    var tx = 70 + r() * 60;
                    g.fillStyle = '#6b4a3a'; g.fillRect(tx - 4, top - 46, 8, 46);
                    [[0, -62, 30], [-20, -50, 22], [20, -48, 24]].forEach(function (b) {
                        var cg = g.createRadialGradient(tx + b[0] + b[2] * 0.4, top + b[1] - b[2] * 0.4, 2, tx + b[0], top + b[1], b[2]);
                        cg.addColorStop(0, '#ffd59a'); cg.addColorStop(0.35, '#8fcf78'); cg.addColorStop(1, '#3f8a58');
                        g.fillStyle = cg; g.beginPath(); g.arc(tx + b[0], top + b[1], b[2], 0, TAU); g.fill();
                    });
                } else {
                    g.fillStyle = '#d8cbb8'; g.fillRect(120, top - 28, 14, 28); g.fillRect(60, top - 18, 10, 18);
                    g.fillStyle = '#f3e9da'; g.fillRect(118, top - 32, 18, 5);
                }
            });
        },
        cloud: function (v) {
            return spr('cloud' + v, 260, 120, 'isles', function (g, w, h) {
                var r = seeded(9 + v * 7);
                for (var pass = 0; pass < 2; pass++) for (var i = 0; i < 9; i++) {
                    var x = 30 + i * 25 + r() * 10, rr = 22 + r() * 26 + (1 - Math.abs(i - 4) / 4) * 18, y = h - 18 - rr * 0.5;
                    var cg = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
                    cg.addColorStop(0, pass ? 'rgba(255,250,246,.95)' : 'rgba(230,180,210,.7)');
                    cg.addColorStop(0.75, pass ? 'rgba(255,226,226,.85)' : 'rgba(214,160,200,.5)'); cg.addColorStop(1, 'rgba(255,220,230,0)');
                    g.fillStyle = cg; g.beginPath(); g.arc(x, y + (pass ? 0 : 8), rr, 0, TAU); g.fill();
                }
            });
        },
        tree: function () {
            return spr('tree', 110, 150, 'isles', function (g, w, h) {
                g.fillStyle = '#6b4a3a'; g.fillRect(w / 2 - 5, h - 60, 10, 60);
                [[0, -88, 34], [-24, -70, 26], [24, -66, 27], [0, -60, 26]].forEach(function (b) {
                    var cg = g.createRadialGradient(w / 2 + b[0] + b[2] * 0.45, h + b[1] - b[2] * 0.45, 2, w / 2 + b[0], h + b[1], b[2]);
                    cg.addColorStop(0, '#ffd8a0'); cg.addColorStop(0.3, '#93d07a'); cg.addColorStop(1, '#3c8256');
                    g.fillStyle = cg; g.beginPath(); g.arc(w / 2 + b[0], h + b[1], b[2], 0, TAU); g.fill();
                });
            });
        },
        post: function (v) {  /* a lantern on a pole: 0 warm (isles), 1 brass gas lamp, 2 pink beacon, 3 cyan beacon, 4 ice lantern */
            return spr('post' + v, 50, 190, ['isles', 'clock', 'stars', 'stars', 'aurora'][v], function (g, w, h) {
                var light = [[255, 200, 120], [255, 190, 100], [255, 120, 220], [120, 230, 255], [170, 240, 255]][v];
                var pole = ['#7a5a46', '#c08a3c', '#5a4a9a', '#4a5aa0', '#e6f6ff'][v];
                glowAt(g, w / 2, 30, 25, light, 0.75);
                g.fillStyle = pole; g.fillRect(w / 2 - 2.5, 34, 5, h - 34);
                if (v >= 2 && v <= 3) { g.fillStyle = rgba(light); g.beginPath(); g.arc(w / 2, 30, 7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2 - 2, 28, 2.5, 0, TAU); g.fill(); return; }
                g.fillStyle = pole; g.fillRect(w / 2 - 9, 18, 18, 4); g.fillRect(w / 2 - 8, 42, 16, 4);
                g.fillStyle = rgba(lerpc(light, [255, 255, 255], 0.5)); g.fillRect(w / 2 - 7, 22, 14, 20);
            });
        },
        shroom: function (v) {  /* a giant glowing mushroom: 0 teal, 1 violet, 2 blue */
            return spr('shroom' + v, 230, 300, 'glow', function (g, w, h) {
                var c = [[60, 240, 200], [200, 110, 255], [90, 160, 255]][v], r = seeded(3 + v * 5), capY = 70;
                glowAt(g, w / 2, capY + 30, 115, c, 0.35, 0.7);
                var sg = g.createLinearGradient(w / 2 - 20, 0, w / 2 + 20, 0);
                sg.addColorStop(0, '#9fb8b4'); sg.addColorStop(0.5, '#e8f4ee'); sg.addColorStop(1, '#7e9a9a');
                g.fillStyle = sg;
                g.beginPath(); g.moveTo(w / 2 - 14, capY + 20); g.quadraticCurveTo(w / 2 - 24 + v * 8, h * 0.65, w / 2 - 22, h);
                g.lineTo(w / 2 + 22, h); g.quadraticCurveTo(w / 2 + 20 + v * 8, h * 0.65, w / 2 + 14, capY + 20); g.fill();
                g.fillStyle = rgba(c, 0.7);
                for (var i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2 + (r() - 0.5) * 24, capY + 50 + r() * (h - capY - 60), 1.5 + r() * 2, 0, TAU); g.fill(); }
                g.fillStyle = rgba(lerpc(c, [255, 255, 255], 0.55), 0.9);  /* glowing gills underneath */
                g.beginPath(); g.ellipse(w / 2, capY + 18, 104, 18, 0, 0, TAU); g.fill();
                var cg = g.createLinearGradient(0, capY - 64, 0, capY + 22);
                cg.addColorStop(0, rgba(lerpc(c, [20, 20, 60], 0.55))); cg.addColorStop(0.7, rgba(lerpc(c, [30, 20, 70], 0.2))); cg.addColorStop(1, rgba(lerpc(c, [255, 255, 255], 0.3)));
                g.fillStyle = cg;
                g.beginPath(); g.moveTo(w / 2 - 110, capY + 16); g.bezierCurveTo(w / 2 - 100, capY - 70, w / 2 + 100, capY - 70, w / 2 + 110, capY + 16);
                g.quadraticCurveTo(w / 2, capY + 26, w / 2 - 110, capY + 16); g.fill();
                for (i = 0; i < 9; i++) {
                    var sx = w / 2 + (r() - 0.5) * 170, sy = capY - 10 - r() * 34 + Math.abs(sx - w / 2) * 0.25, sr = 3 + r() * 6;
                    glowAt(g, sx, sy, sr * 2.6, [255, 255, 255], 0.35);
                    g.fillStyle = rgba(lerpc(c, [255, 255, 255], 0.7)); g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
                }
            });
        },
        sprouts: function () {
            return spr('sprouts', 130, 80, 'glow', function (g, w, h) {
                var r = seeded(41);
                for (var i = 0; i < 6; i++) {
                    var x = 12 + i * 21 + r() * 6, hh = 20 + r() * 40, c = r() < 0.5 ? [80, 255, 210] : [220, 130, 255];
                    glowAt(g, x, h - hh, 18, c, 0.5);
                    g.fillStyle = '#d8eee6'; g.fillRect(x - 2, h - hh, 4, hh);
                    g.fillStyle = rgba(c); g.beginPath(); g.ellipse(x, h - hh, 10, 7, 0, Math.PI, TAU); g.fill();
                }
            });
        },
        crystals: function (v) {  /* 0 violet floor cluster, 1 teal, 2 pink, 3 ice spire */
            var sets = [[[150, 100, 240], [200, 140, 255], [120, 80, 220]], [[90, 200, 250], [140, 240, 255], [70, 150, 230]],
                        [[240, 120, 220], [255, 170, 240], [190, 90, 210]], [[200, 236, 255], [240, 252, 255], [150, 210, 245]]];
            return spr('crys' + v, 160, v === 3 ? 280 : 200, v === 3 ? 'aurora' : 'geode', function (g, w, h) { crystalPaint(g, w, h, sets[v], v === 3 ? 5 : 6, v === 3, 7 + v * 11); });
        },
        stalactite: function (v) {
            return spr('stal' + v, 160, 200, 'geode', function (g, w, h) {
                g.translate(0, h); g.scale(1, -1);
                crystalPaint(g, w, h, v ? [[90, 200, 250], [140, 240, 255]] : [[160, 110, 245], [210, 160, 255]], 5, false, 23 + v);
            });
        },
        pine: function () {
            return spr('pine', 110, 180, 'aurora', function (g, w, h) {
                g.fillStyle = '#3a4a66'; g.fillRect(w / 2 - 5, h - 26, 10, 26);
                for (var i = 0; i < 4; i++) {
                    var y = h - 24 - i * 34, hw = 50 - i * 10;
                    g.fillStyle = '#2f5470'; g.beginPath(); g.moveTo(w / 2 - hw, y); g.lineTo(w / 2, y - 56); g.lineTo(w / 2 + hw, y); g.fill();
                    g.fillStyle = 'rgba(240,248,255,.92)'; g.beginPath(); g.moveTo(w / 2 - hw * 0.55, y - 22); g.lineTo(w / 2, y - 56); g.lineTo(w / 2 + hw * 0.6, y - 24);
                    g.quadraticCurveTo(w / 2, y - 30, w / 2 - hw * 0.55, y - 22); g.fill();
                }
            });
        },
        gear: function (v) {  /* centred, rotated live */
            return spr('gear' + v, 220, 220, 'clock', function (g, w, h) {
                var c = w / 2, R = 104, n = v ? 12 : 16, base = v ? [196, 120, 70] : [214, 160, 70];
                var gg = g.createRadialGradient(c - 30, c - 40, 10, c, c, R);
                gg.addColorStop(0, rgba(lerpc(base, [255, 245, 210], 0.6))); gg.addColorStop(0.6, rgba(base)); gg.addColorStop(1, rgba(lerpc(base, [40, 20, 10], 0.5)));
                g.fillStyle = gg; gearPath(g, c, c, R, n, 16); g.fill();
                g.globalCompositeOperation = 'destination-out';
                for (var i = 0; i < (v ? 5 : 6); i++) { var a = i / (v ? 5 : 6) * TAU; g.beginPath(); g.arc(c + Math.cos(a) * 52, c + Math.sin(a) * 52, v ? 20 : 17, 0, TAU); g.fill(); }
                g.globalCompositeOperation = 'source-over';
                g.strokeStyle = rgba(lerpc(base, [60, 30, 10], 0.5)); g.lineWidth = 5; g.beginPath(); g.arc(c, c, 80, 0, TAU); g.stroke();
                g.fillStyle = rgba(lerpc(base, [60, 30, 10], 0.45)); g.beginPath(); g.arc(c, c, 20, 0, TAU); g.fill();
                g.fillStyle = rgba(lerpc(base, [255, 240, 200], 0.4)); g.beginPath(); g.arc(c - 4, c - 4, 9, 0, TAU); g.fill();
            });
        },
        rock: function (v) {  /* an asteroid, centred, rotated live */
            return spr('rock' + v, 170, 150, 'stars', function (g, w, h) {
                var r = seeded(61 + v * 9), cxr = w / 2, cyr = h / 2, pts = [];
                for (var i = 0; i < 11; i++) { var a = i / 11 * TAU, rr = 58 + r() * 18; pts.push(cxr + Math.cos(a) * rr * 1.1, cyr + Math.sin(a) * rr * 0.85); }
                var rg = g.createRadialGradient(cxr - 30, cyr - 30, 5, cxr, cyr, 85);
                rg.addColorStop(0, v ? '#d8c4f0' : '#c8b8d8'); rg.addColorStop(0.6, v ? '#7a64a8' : '#6c6080'); rg.addColorStop(1, '#2a2040');
                g.fillStyle = rg; g.beginPath(); g.moveTo(pts[0], pts[1]);
                for (i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
                g.closePath(); g.fill();
                for (i = 0; i < 6; i++) {
                    var x = cxr + (r() - 0.5) * 80, y = cyr + (r() - 0.5) * 60, cr = 5 + r() * 10;
                    g.fillStyle = 'rgba(30,20,50,.35)'; g.beginPath(); g.arc(x, y, cr, 0, TAU); g.fill();
                    g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(x - cr * 0.25, y - cr * 0.25, cr * 0.6, 0, TAU); g.fill();
                }
                g.strokeStyle = 'rgba(140,220,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(cxr, cyr, 70, 3.6, 5.2); g.stroke();
            });
        },
        knit: function (v) {  /* a knitted hill: striped rows of stitches */
            return spr('knit' + v, 300, 150, 'wool', function (g, w, h) {
                var c = [[180, 230, 204], [255, 200, 224], [206, 192, 252]][v], c2 = [[255, 240, 200], [255, 255, 255], [190, 236, 255]][v];
                g.save(); g.beginPath(); g.moveTo(0, h); g.bezierCurveTo(w * 0.1, h * 0.05, w * 0.9, h * 0.05, w, h); g.closePath();
                g.fillStyle = rgba(c); g.fill(); g.clip();
                for (var b = 0; b < 6; b++) if (b % 2) { g.fillStyle = rgba(lerpc(c, c2, 0.6)); g.fillRect(0, h * (0.1 + b * 0.15), w, h * 0.075); }
                knitRows(g, 0, 0, w, h, 9, rgba(lerpc(c, [110, 70, 120], 0.18)));
                var sh = g.createLinearGradient(0, 0, w, 0);
                sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(90,60,120,.22)');
                g.fillStyle = sh; g.fillRect(0, 0, w, h);
                g.restore();
            });
        },
        ytree: function (v) {  /* a knitting needle with a ball of wool on top */
            return spr('ytree' + v, 120, 220, 'wool', function (g, w, h) {
                var ng = g.createLinearGradient(w / 2 - 4, 0, w / 2 + 4, 0);
                ng.addColorStop(0, '#c99a6a'); ng.addColorStop(0.5, '#f4d8b0'); ng.addColorStop(1, '#a8784a');
                g.fillStyle = ng; g.fillRect(w / 2 - 4, 70, 8, h - 70);
                var wl = woolImg(46, v ? 'mint' : 'violet');
                g.drawImage(wl.cv, w / 2 - wl.s / 2, 64 - wl.s / 2, wl.s, wl.s);
            });
        },
        button: function (v) {
            return spr('button' + v, 160, 160, 'wool', function (g, w, h) { buttonPaint(g, w / 2, h / 2, 74, v ? [140, 200, 255] : [255, 160, 200], false); });
        },
        pompom: function () {
            return spr('pompom', 120, 100, 'wool', function (g, w, h) {
                var cols = [[255, 160, 210], [255, 230, 140], [160, 220, 255], [200, 170, 255]];
                for (var i = 0; i < 4; i++) {
                    var x = 18 + i * 28, hh = 40 + (i % 2) * 22;
                    g.strokeStyle = '#7cc89c'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x - 6, h - hh / 2, x, h - hh); g.stroke();
                    var pg = g.createRadialGradient(x - 4, h - hh - 4, 1, x, h - hh, 14);
                    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.4, rgba(cols[i])); pg.addColorStop(1, rgba(cols[i], 0.2));
                    g.fillStyle = pg; g.beginPath(); g.arc(x, h - hh, 14, 0, TAU); g.fill();
                }
            });
        },
        planet: function (v) {
            return spr('planet' + v, 200, 200, 'stars', function (g, w, h) {
                var c = w / 2, col = v ? ['#bfffe8', '#3cb8a0', '#0c3a48'] : ['#ffe0f4', '#c066c8', '#3a1450'];
                glowAt(g, c, c, 100, v ? [100, 255, 220] : [255, 120, 230], 0.25);
                var pg = g.createRadialGradient(c - 25, c - 25, 5, c, c, 62);
                pg.addColorStop(0, col[0]); pg.addColorStop(0.6, col[1]); pg.addColorStop(1, col[2]);
                g.fillStyle = pg; g.beginPath(); g.arc(c, c, 62, 0, TAU); g.fill();
            });
        }
    };
    function drawSpr(s, x, y, z, ww, alpha, ay, rot) {  /* a sprite ww metres wide at world point x, y, z; ay: anchor (1 bottom, 0.5 centre) */
        if (!P(x, y, z) || alpha <= 0.01) return;
        var wd = ww * pk, ht = wd * s.h / s.w;
        if (wd < 1 || wd > W * 4) return;
        if (ay === undefined) ay = 1;
        if (rot === undefined && (px + wd < 0 || px - wd > W || py - ht * ay > H || py + ht * (1 - ay) < 0)) return;
        var fa = FA > 0.02 && s.fg;
        ctx.globalAlpha = alpha;
        if (rot !== undefined) {
            ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.drawImage(s.cv, -wd / 2, -ht * ay, wd, ht);
            if (fa) { ctx.globalAlpha = alpha * FA; ctx.drawImage(s.fg, -wd / 2, -ht * ay, wd, ht); }
            ctx.restore();
        } else {
            ctx.drawImage(s.cv, px - wd / 2, py - ht * ay, wd, ht);
            if (fa) { ctx.globalAlpha = alpha * FA; ctx.drawImage(s.fg, px - wd / 2, py - ht * ay, wd, ht); }
        }
        ctx.globalAlpha = 1;
    }
    var FA = 0;  /* how much fog lies over the scenery being drawn */
    var PREP = {
        isles: [['islet', 0], ['islet', 1], ['islet', 2], ['cloud', 0], ['cloud', 1], ['tree'], ['post', 0]],
        glow: [['shroom', 0], ['shroom', 1], ['shroom', 2], ['sprouts']],
        geode: [['crystals', 0], ['crystals', 1], ['crystals', 2], ['stalactite', 0], ['stalactite', 1]],
        aurora: [['crystals', 3], ['pine'], ['post', 4]],
        clock: [['gear', 0], ['gear', 1], ['post', 1]],
        wool: [['knit', 0], ['knit', 1], ['knit', 2], ['ytree', 0], ['ytree', 1], ['button', 0], ['button', 1], ['pompom']],
        stars: [['rock', 0], ['rock', 1], ['planet', 0], ['planet', 1], ['post', 2], ['post', 3]]
    };
    function prepWorld(k, q) {  /* paint a world's sky and sprites ahead of time (one job per frame) so the gate never stutters */
        var jobs = [function () { skyCanvas(k); }];
        PREP[ZONES[k].key].forEach(function (s) { jobs.push(function () { SPR[s[0]](s[1]); }); });
        if (q) { for (var i = 0; i < jobs.length; i++) q.push(jobs[i]); }
        else jobs.forEach(function (j) { j(); });
    }

