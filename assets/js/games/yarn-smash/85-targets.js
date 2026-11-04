    /* ---------- targets ---------- */
    function drawStand(e) {
        var z = e.z, lx = e.lx, f = fogf(z - camZ), st = e.stand, T = STANDTOP[st];
        function m(c, k) { return mixc(c, FOG, f, k); }
        shadow(cx(z) + lx, z, 0.42, 0.3 * fade(z - camZ));
        ctx.globalAlpha = fade(z - camZ);
        if (st === 'plinth') { box(lx, z, 0.48, 0.48, 0, T - 0.08, m([214, 198, 184]), m([170, 150, 142]), m([230, 216, 202])); box(lx, z, 0.58, 0.58, T - 0.08, T, m([132, 186, 110]), m([96, 150, 90]), m([150, 204, 120])); }
        else if (st === 'stump') { box(lx, z, 0.5, 0.5, 0, T, m([96, 72, 74]), m([70, 52, 58]), m([150, 255, 220], 0.85)); }
        else if (st === 'geo') { box(lx, z, 0.5, 0.5, 0, T, m([104, 70, 170]), m([74, 48, 128]), m([226, 190, 255])); }
        else if (st === 'ice') { box(lx, z, 0.56, 0.56, 0, T, mixa([206, 238, 255], FOG, f, 0.8), mixa([170, 214, 245], FOG, f, 0.8), m([246, 252, 255])); }
        else if (st === 'crate') { box(lx, z, 0.5, 0.5, 0, T, m([192, 134, 66]), m([150, 100, 50]), m([220, 166, 88])); box(lx, z, 0.52, 0.52, T * 0.45, T * 0.55, m([110, 70, 36]), m([90, 58, 30]), m([110, 70, 36])); }
        else if (st === 'spool') { box(lx, z, 0.56, 0.56, 0, 0.08, m([236, 214, 186]), m([206, 184, 156]), m([246, 228, 204])); box(lx, z, 0.42, 0.42, 0.08, T - 0.08, m([255, 160, 206]), m([226, 130, 180]), m([255, 190, 222])); box(lx, z, 0.56, 0.56, T - 0.08, T, m([236, 214, 186]), m([206, 184, 156]), m([250, 234, 212])); }
        else { box(lx, z, 0.5, 0.5, 0.14, T, m([100, 88, 150]), m([72, 62, 114]), m([156, 136, 210])); if (P(cx(z) + lx, 0.05, z)) halo(px, py, 0.4 * pk, [130, 220, 255], 0.4 * fade(z - camZ)); }
    }
    function drawVase(e) {
        var dz = e.z - camZ;
        if (dz < NEAR + 0.32) return;
        drawStand(e);
        ctx.globalAlpha = fade(dz);
        var top = STANDTOP[e.stand];
        if (!e.broken && PL(e.lx, top, e.z)) {
            ctx.save(); ctx.translate(px, py); ctx.scale(pk, pk);
            var h = e.h, col = e.col;
            ctx.lineWidth = 0.018; ctx.strokeStyle = col + '1)';
            ctx.beginPath();
            if (e.kind === 0) {
                ctx.strokeStyle = '#7fb77e'; ctx.lineWidth = 0.02;
                ctx.moveTo(-0.02, -h * 0.75); ctx.lineTo(-0.08, -h - 0.12); ctx.moveTo(0.02, -h * 0.75); ctx.lineTo(0.09, -h - 0.08); ctx.stroke();
                ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-0.08, -h - 0.13, 0.045, 0, TAU); ctx.fill();
                ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(0.09, -h - 0.09, 0.04, 0, TAU); ctx.fill();
                ctx.lineWidth = 0.018; ctx.strokeStyle = col + '1)';
                ctx.beginPath(); ctx.ellipse(0, -h * 0.36, 0.15, h * 0.36, 0, 0, TAU);
                ctx.rect(-0.055, -h, 0.11, h * 0.35);
            } else if (e.kind === 1) { rrect(-0.09, -h * 0.68, 0.18, h * 0.68, 0.05); ctx.rect(-0.035, -h - 0.06, 0.07, h * 0.4); }
            else { ctx.moveTo(-0.1, -h - 0.04); ctx.lineTo(0.1, -h - 0.04); ctx.lineTo(0.06, 0); ctx.lineTo(-0.06, 0); ctx.closePath(); }
            ctx.fillStyle = col + '.85)'; ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-0.05, -h * 0.55); ctx.lineTo(-0.06, -h * 0.2); ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }
    function drawCrystal(e) {
        pos(e, clock);
        if (!P(SX, SY, SZ)) return;
        var sp = Math.cos(clock * 2.2 + e.ph), w = 0.2 * (0.3 + 0.7 * Math.abs(sp)), A = fade(SZ - camZ);
        halo(px, py, 0.6 * pk, [120, 255, 180], A * 0.55);
        ctx.globalAlpha = A;
        ctx.save(); ctx.translate(px, py); ctx.scale(pk, pk);
        ctx.lineJoin = 'round'; ctx.lineWidth = 0.02; ctx.strokeStyle = '#2f9e6e';
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(-w, -0.07); ctx.lineTo(0, 0.3); ctx.closePath(); ctx.fillStyle = sp > 0 ? '#6fe0a8' : '#c4f7dc'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(w, -0.07); ctx.lineTo(0, 0.3); ctx.closePath(); ctx.fillStyle = sp > 0 ? '#c4f7dc' : '#6fe0a8'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(w, -0.07); ctx.lineTo(0, 0.3); ctx.lineTo(-w, -0.07); ctx.closePath();
        ctx.moveTo(-w, -0.07); ctx.lineTo(w, -0.07); ctx.stroke();
        var tw = 0.06 + 0.04 * Math.sin(clock * 7 + e.ph);
        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(0.1, -0.2 - tw); ctx.lineTo(0.115, -0.215); ctx.lineTo(0.1 + tw, -0.2); ctx.lineTo(0.115, -0.185);
        ctx.lineTo(0.1, -0.2 + tw); ctx.lineTo(0.085, -0.185); ctx.lineTo(0.1 - tw, -0.2); ctx.lineTo(0.085, -0.215); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    var LAMPC = { isles: [255, 190, 110], glow: [120, 255, 220], geode: [210, 160, 255], aurora: [190, 240, 255], clock: [255, 210, 120], wool: [255, 190, 230], stars: [255, 240, 160] };
    function drawLamp(e) {
        var Z = e.Z, A = fade(e.z - camZ), key = Z.key, lc = LAMPC[key];
        pos(e, clock);
        if (!P(SX, SY, SZ)) return;
        var bx = px, by = py, k = pk;
        if (Z.lampY && PL(0, Z.lampY, e.z)) {  /* the cord of a swinging pod or bell */
            var ax = px, ay = py; PL(0, Z.lampY + 6, e.z);
            ctx.globalAlpha = A; ctx.strokeStyle = key === 'clock' ? '#c9a05a' : '#5fd0b0'; ctx.lineWidth = Math.max(1, 0.015 * k);
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
        if (e.broken) { ctx.globalAlpha = 1; return; }
        halo(bx, by, 0.75 * k, lc, A * 0.55);
        ctx.globalAlpha = A;
        ctx.save(); ctx.translate(bx, by); ctx.scale(k, k);
        var t = clock + e.ph;
        if (key === 'isles') {  /* a paper sky lantern */
            var g = ctx.createLinearGradient(0, -0.25, 0, 0.2); g.addColorStop(0, '#ffe2a8'); g.addColorStop(1, '#ff8a4c');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-0.15, -0.24); ctx.lineTo(0.15, -0.24); ctx.lineTo(0.11, 0.18); ctx.lineTo(-0.11, 0.18); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(0, 0.12, 0.04, 0, TAU); ctx.fill();
        } else if (key === 'glow') {
            var g2 = ctx.createRadialGradient(-0.06, -0.06, 0.02, 0, 0, 0.2); g2.addColorStop(0, '#eafff8'); g2.addColorStop(0.5, '#5ff0cc'); g2.addColorStop(1, '#8a4cd8');
            ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(0, 0, 0.17, 0.21, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ffffff'; [[-0.06, -0.05], [0.07, 0.02], [-0.02, 0.1]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0], s[1], 0.025, 0, TAU); ctx.fill(); });
        } else if (key === 'geode') {
            var w = 0.17 * Math.abs(Math.cos(t * 1.5)) + 0.04;
            ctx.fillStyle = '#c9a2ff'; ctx.beginPath(); ctx.moveTo(0, -0.26); ctx.lineTo(w, -0.04); ctx.lineTo(0, 0.24); ctx.lineTo(-w, -0.04); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#f1e4ff'; ctx.beginPath(); ctx.moveTo(0, -0.26); ctx.lineTo(w * 0.5, -0.04); ctx.lineTo(0, 0.1); ctx.closePath(); ctx.fill();
        } else if (key === 'aurora') {
            ctx.rotate(RM ? 0 : t * 0.6); ctx.strokeStyle = '#f2fcff'; ctx.lineWidth = 0.035; ctx.lineCap = 'round'; ctx.beginPath();
            for (var i = 0; i < 6; i++) { var a = i / 6 * TAU, c = Math.cos(a), s = Math.sin(a); ctx.moveTo(0, 0); ctx.lineTo(c * 0.22, s * 0.22); ctx.moveTo(c * 0.13 - s * 0.06, s * 0.13 + c * 0.06); ctx.lineTo(c * 0.17, s * 0.17); ctx.lineTo(c * 0.13 + s * 0.06, s * 0.13 - c * 0.06); }
            ctx.stroke();
        } else if (key === 'clock') {
            var g3 = ctx.createLinearGradient(-0.18, 0, 0.18, 0); g3.addColorStop(0, '#9a6a24'); g3.addColorStop(0.4, '#ffe08a'); g3.addColorStop(1, '#a8742a');
            ctx.fillStyle = g3; ctx.beginPath(); ctx.moveTo(-0.07, -0.2); ctx.quadraticCurveTo(-0.13, -0.15, -0.13, 0); ctx.lineTo(-0.2, 0.12); ctx.lineTo(0.2, 0.12); ctx.lineTo(0.13, 0); ctx.quadraticCurveTo(0.13, -0.15, 0.07, -0.2); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#7a5020'; ctx.beginPath(); ctx.arc(0, 0.15, 0.04, 0, TAU); ctx.fill();
        } else if (key === 'wool') {
            ctx.rotate(RM ? 0 : Math.sin(t) * 0.4); buttonPaint(ctx, 0, 0, 0.21, [255, 176, 220], false);
        } else {
            ctx.rotate(RM ? 0 : t * 0.8); ctx.fillStyle = '#fff6c2'; ctx.beginPath();
            for (i = 0; i < 10; i++) { var r = i % 2 ? 0.09 : 0.23, b = i / 10 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r); }
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    function drawDot(e) {
        pos(e, clock);
        if (!P(SX, 0.005, SZ)) return;
        var dz = SZ - camZ, sq = clamp(EYE / dz, 0.12, 1), r = 0.12 * pk * (1 + (RM ? 0 : 0.15 * Math.sin(clock * 12)));
        ctx.globalAlpha = fade(dz);
        ctx.fillStyle = 'rgba(255,80,110,.3)'; ctx.beginPath(); ctx.ellipse(px, py, r * 2.6, r * 2.6 * sq, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,60,95,.95)'; ctx.beginPath(); ctx.ellipse(px, py, r, r * sq, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(px, py, r * 0.4, r * 0.4 * sq, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
    }
    function drawPower(e) {  /* a bubble with a giant yarn ball or a stopwatch inside */
        pos(e, clock);
        if (!P(SX, SY, SZ)) return;
        var A = fade(SZ - camZ), r = SR * pk * (1 + (RM ? 0 : 0.05 * Math.sin(clock * 5))), c = { big: [200, 150, 255], slow: [130, 200, 255], magnet: [110, 240, 170], rico: [255, 206, 90] }[e.kind];
        halo(px, py, r * 2.6, c, A * 0.6);
        ctx.globalAlpha = A;
        var g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
        g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(0.75, rgba(c, 0.25)); g.addColorStop(1, rgba(c, 0.85));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
        if (e.kind === 'big') wool(px, py, r * 0.55, RM ? 0 : clock * 2, 'violet');
        else if (e.kind === 'magnet') {  /* a horseshoe magnet */
            ctx.lineCap = 'butt'; ctx.lineWidth = r * 0.24;
            ctx.strokeStyle = '#ff5a6e'; ctx.beginPath(); ctx.arc(px, py - r * 0.05, r * 0.32, Math.PI, TAU); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px - r * 0.32, py - r * 0.06); ctx.lineTo(px - r * 0.32, py + r * 0.2); ctx.moveTo(px + r * 0.32, py - r * 0.06); ctx.lineTo(px + r * 0.32, py + r * 0.2); ctx.stroke();
            ctx.strokeStyle = '#eef4fb'; ctx.beginPath(); ctx.moveTo(px - r * 0.32, py + r * 0.2); ctx.lineTo(px - r * 0.32, py + r * 0.4); ctx.moveTo(px + r * 0.32, py + r * 0.2); ctx.lineTo(px + r * 0.32, py + r * 0.4); ctx.stroke();
        } else if (e.kind === 'rico') {  /* a zigzag arrow */
            ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(px - r * 0.45, py + r * 0.3); ctx.lineTo(px - r * 0.12, py - r * 0.2); ctx.lineTo(px + r * 0.1, py + r * 0.15); ctx.lineTo(px + r * 0.42, py - r * 0.32);
            ctx.moveTo(px + r * 0.18, py - r * 0.34); ctx.lineTo(px + r * 0.42, py - r * 0.32); ctx.lineTo(px + r * 0.4, py - r * 0.08); ctx.stroke();
        } else {
            ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.arc(px, py, r * 0.52, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#3b5b9a'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(px, py, r * 0.52, 0, TAU);
            ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(clock * 0.7) * r * 0.36, py + Math.sin(clock * 0.7) * r * 0.36);
            ctx.moveTo(px, py); ctx.lineTo(px, py - r * 0.42); ctx.stroke();
            ctx.fillStyle = '#3b5b9a'; ctx.fillRect(px - r * 0.1, py - r * 0.72, r * 0.2, r * 0.14);
        }
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, r * 0.07);
        ctx.beginPath(); ctx.arc(px, py, r * 0.8, 3.6, 4.5); ctx.stroke();
        ctx.globalAlpha = 1;
    }
    function drawBall(b) {
        var dz = b.z - camZ;
        if (dz < 0.9) return;  /* still in the paw */
        var fl = floorAt(b.x - cx(b.z), b.z), big = b.big ? 2.6 : b.heavy ? 1.6 : 1;
        if (fl > -1 && P(b.x, fl, b.z)) {
            var sq = clamp(EYE / dz, 0.1, 1);
            ctx.fillStyle = 'rgba(30,14,40,.18)'; ctx.beginPath(); ctx.ellipse(px, py, BR * big * pk * 1.2, BR * big * pk * sq, 0, 0, TAU); ctx.fill();
        }
        if (!P(b.x, b.y, b.z)) return;
        var r = Math.min(BR * big * pk * 1.35, PAW * 0.5 * big), bx = px, by = py;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = b.big ? '#b98cff' : b.heavy || b.rico ? '#ffc94a' : SK.dog ? '#c5dc4a' : '#e8739f'; ctx.lineWidth = clamp(r * 0.16, 1, 4);
        ctx.beginPath(); ctx.moveTo(bx, by);  /* the loose thread trailing behind (a faint streak behind a tennis ball) */
        for (var i = 0; i < b.trail.length; i += 3) {
            if (b.trail[i + 2] - camZ > 0.9 && P(b.trail[i], b.trail[i + 1] + Math.sin(i * 0.9 + b.spin) * 0.03, b.trail[i + 2])) ctx.lineTo(px, py);
        }
        ctx.globalAlpha = SK.dog ? 0.45 : 0.85; ctx.stroke(); ctx.globalAlpha = 1;
        if (b.big) halo(bx, by, r * 2, [200, 150, 255], 0.45);
        ctx.globalAlpha = 1;
        if (b.heavy || b.rico) halo(bx, by, r * 1.9, [255, 200, 90], b.heavy ? 0.6 : 0.35);
        ctx.globalAlpha = 1;
        wool(bx, by, r, RM ? 0 : b.spin, b.big ? 'violet' : b.heavy ? 'gold' : zoomT > 0 ? 'orange' : 'pink');
    }

    function drawBubble(e) {  /* a soap bubble: clear in the middle, rainbow sheen on the rim */
        pos(e, clock);
        if (!P(SX, SY, SZ)) return;
        var A = fade(SZ - camZ), r = SR * pk, x = px, y = py, a0 = clock * 0.6 + e.ph;
        shadow(SX, SZ, SR * 0.9, A * 0.25 * clamp(1 - (SY - SR) / 2.5, 0, 1));
        ctx.globalAlpha = A;
        var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(0.68, 'rgba(225,232,255,.12)'); g.addColorStop(0.9, 'rgba(255,190,240,.45)'); g.addColorStop(1, 'rgba(170,232,255,.8)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.lineWidth = Math.max(1, r * 0.07); ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,150,220,.55)'; ctx.beginPath(); ctx.arc(x, y, r * 0.84, a0, a0 + 1.3); ctx.stroke();
        ctx.strokeStyle = 'rgba(130,230,255,.55)'; ctx.beginPath(); ctx.arc(x, y, r * 0.84, a0 + 2.2, a0 + 3.1); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,240,150,.45)'; ctx.beginPath(); ctx.arc(x, y, r * 0.84, a0 + 4.0, a0 + 4.7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.42, r * 0.17, r * 0.09, -0.7, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
    }
    function drawMirror(e) {  /* an archway of ice mirrors behind a row of glass */
        var dz = e.z - camZ;
        if (dz < NEAR + 0.1) return;
        var A = fade(dz), f = fogf(dz), hw = e.hw;
        ctx.globalAlpha = A;
        [[-(hw + 1.7), -(hw + 0.05), 0, 3.2], [hw + 0.05, hw + 1.7, 0, 3.2], [-(hw + 1.7), hw + 1.7, 2.55, 3.6]].forEach(function (q) {
            var r = rectW(q[0], q[1], q[2], q[3], e.z);
            if (!r) return;
            var g = ctx.createLinearGradient(r[0], r[1], r[0] + r[2], r[1] + r[3]);
            g.addColorStop(0, mixa([34, 54, 116], FOG, f, 0.8)); g.addColorStop(0.36, mixa([150, 210, 246], FOG, f, 0.75));
            g.addColorStop(0.5, mixa([250, 255, 255], FOG, f, 0.9)); g.addColorStop(0.62, mixa([140, 200, 240], FOG, f, 0.75)); g.addColorStop(1, mixa([60, 92, 164], FOG, f, 0.8));
            ctx.fillStyle = g; ctx.fillRect(r[0], r[1], r[2], r[3]);
            if (e.flash) { ctx.fillStyle = 'rgba(255,255,255,' + (e.flash * 2).toFixed(2) + ')'; ctx.fillRect(r[0], r[1], r[2], r[3]); }
            ctx.strokeStyle = mixc([240, 252, 255], FOG, f); ctx.lineWidth = Math.max(1.5, Math.min(8, 0.06 * pk)); ctx.strokeRect(r[0], r[1], r[2], r[3]);
        });
        ctx.globalAlpha = 1;
    }
    function drawCritter(e) {  /* small glass creatures, one design per world, with a soft halo so they read on phones */
        critPos(e, clock);
        if (!P(SX, SY, SZ)) return;
        var C = CRIT[e.kind], dz = SZ - camZ, A = fade(dz), k = pk, x = px, y = py, t = clock * (RM ? 0.35 : 1) + e.ph, fl = Math.sin(t * 16), kd = e.kind;
        if (k * C.r < 1.2) return;
        if (e.st === 'leave') A *= clamp(1 - (clock - e.s0) / 1.6, 0, 1);
        if (e.st === 'tele') critTele(e, x, y, k, A);
        if (kd === 'glow' || kd === 'clock') shadow(SX, SZ, C.r * 0.9, A * 0.3);
        halo(x, y, Math.max(7, C.r * 2.7 * k), C.g, A * 0.55);
        ctx.globalAlpha = A;
        ctx.save(); ctx.translate(x, y); ctx.scale(k * 1.25, k * 1.25); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(0.01, 1.1 / k); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.fillStyle = rgba(C.c, 0.62);
        function eyes(ex, ey, r) { ctx.fillStyle = '#2a2140'; ctx.beginPath(); ctx.arc(-ex, ey, r, 0, TAU); ctx.arc(ex, ey, r, 0, TAU); ctx.fill(); }
        if (kd === 'isles') {  /* a glass sparrow, wings beating */
            for (var s = -1; s <= 1; s += 2) {
                ctx.beginPath(); ctx.moveTo(s * 0.05, -0.02); ctx.quadraticCurveTo(s * 0.2, -0.13 - fl * 0.1, s * 0.33, -0.03 - fl * 0.17); ctx.lineTo(s * 0.08, 0.06); ctx.closePath();
                ctx.fillStyle = rgba(C.c, 0.55); ctx.fill(); ctx.stroke();
            }
            ctx.fillStyle = rgba(C.c, 0.75); ctx.beginPath(); ctx.ellipse(0, 0.02, 0.1, 0.13, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, -0.12, 0.07, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffb066'; ctx.beginPath(); ctx.moveTo(-0.025, -0.1); ctx.lineTo(0.025, -0.1); ctx.lineTo(0, -0.06); ctx.fill();
            eyes(0.03, -0.13, 0.012);
        } else if (kd === 'glow') {  /* a glass beetle with glowing spots */
            ctx.strokeStyle = rgba(C.g, 0.9);
            ctx.beginPath(); for (var l = -1; l <= 1; l++) { ctx.moveTo(-0.12, l * 0.06); ctx.lineTo(-0.22, l * 0.08 + 0.05); ctx.moveTo(0.12, l * 0.06); ctx.lineTo(0.22, l * 0.08 + 0.05); }
            ctx.moveTo(-0.04, -0.12); ctx.lineTo(-0.1, -0.22); ctx.moveTo(0.04, -0.12); ctx.lineTo(0.1, -0.22); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.fillStyle = rgba(C.c, 0.6);
            ctx.beginPath(); ctx.ellipse(0, 0, 0.16, 0.13, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -0.13); ctx.lineTo(0, 0.13); ctx.stroke();
            ctx.fillStyle = '#ffffff'; [[-0.07, -0.03], [0.08, 0.02], [-0.05, 0.07], [0.06, -0.06]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 0.022, 0, TAU); ctx.fill(); });
        } else if (kd === 'geode') {  /* a crystal bat */
            ctx.beginPath(); ctx.moveTo(0, -0.05);
            [[-0.12, -0.12], [-0.21, -0.03 - fl * 0.1], [-0.31, -0.15 - fl * 0.15], [-0.27, 0.04], [-0.17, 0], [-0.1, 0.08], [0, 0.04], [0.1, 0.08], [0.17, 0], [0.27, 0.04], [0.31, -0.15 - fl * 0.15], [0.21, -0.03 - fl * 0.1], [0.12, -0.12]]
                .forEach(function (p) { ctx.lineTo(p[0], p[1]); });
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = rgba(C.c, 0.85); ctx.beginPath(); ctx.moveTo(0, -0.13); ctx.lineTo(0.06, 0); ctx.lineTo(0, 0.1); ctx.lineTo(-0.06, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff6b0'; ctx.beginPath(); ctx.arc(-0.025, -0.04, 0.014, 0, TAU); ctx.arc(0.025, -0.04, 0.014, 0, TAU); ctx.fill();
        } else if (kd === 'aurora') {  /* a frost wisp: a star of ice with a curl of light */
            var a0 = t * 2.6;
            for (var j = 3; j >= 1; j--) { ctx.fillStyle = rgba(C.g, 0.18 * (4 - j) / 3); ctx.beginPath(); ctx.arc(-Math.cos(a0 - j * 0.35) * 0.06 * j, -Math.sin(a0 - j * 0.35) * 0.06 * j, 0.1 - j * 0.015, 0, TAU); ctx.fill(); }
            ctx.rotate(RM ? 0 : t * 1.5); ctx.fillStyle = rgba(C.c, 0.85); ctx.beginPath();
            for (var q = 0; q < 8; q++) { var rr = q % 2 ? 0.05 : 0.17, b = q / 8 * TAU; ctx.lineTo(Math.cos(b) * rr, Math.sin(b) * rr); }
            ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (kd === 'clock') {  /* a wind-up glass mouse */
            ctx.beginPath(); ctx.moveTo(0.12, 0.04); ctx.quadraticCurveTo(0.3, 0.02, 0.26, -0.1); ctx.strokeStyle = rgba(C.g, 0.9); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.95)';
            ctx.beginPath(); ctx.ellipse(0, 0, 0.16, 0.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(-0.1, -0.09, 0.05, 0, TAU); ctx.arc(-0.02, -0.11, 0.05, 0, TAU); ctx.fill(); ctx.stroke();
            var kw = Math.abs(Math.cos(t * 8)) * 0.07 + 0.01;
            ctx.fillStyle = '#e0a24a'; ctx.fillRect(0.02, -0.17, 0.02, 0.07); ctx.beginPath(); ctx.ellipse(0.03, -0.19, kw, 0.035, 0, 0, TAU); ctx.fill();
            eyes(0, 0, 0); ctx.fillStyle = '#2a2140'; ctx.beginPath(); ctx.arc(-0.11, -0.02, 0.016, 0, TAU); ctx.fill();
        } else if (kd === 'wool') {  /* a glass bumblebee */
            ctx.fillStyle = 'rgba(255,255,255,.5)';
            var wy = 0.5 + 0.5 * Math.abs(fl);
            ctx.beginPath(); ctx.ellipse(-0.08, -0.13, 0.07, 0.11 * wy, -0.5, 0, TAU); ctx.ellipse(0.08, -0.13, 0.07, 0.11 * wy, 0.5, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 0.13, 0, TAU); ctx.fillStyle = rgba(C.c, 0.75); ctx.fill(); ctx.clip();
            ctx.fillStyle = 'rgba(255,150,206,.75)'; ctx.fillRect(-0.15, -0.03, 0.3, 0.04); ctx.fillRect(-0.15, 0.06, 0.3, 0.04);
            ctx.restore(); ctx.beginPath(); ctx.arc(0, 0, 0.13, 0, TAU); ctx.stroke();
            eyes(0.045, -0.06, 0.016);
        } else {  /* a tiny glass drone with a blinking light */
            ctx.fillStyle = rgba(C.g, 0.35); ctx.beginPath(); ctx.ellipse(0, 0.09, 0.08, 0.04, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = rgba(C.c, 0.6); ctx.beginPath(); ctx.ellipse(0, 0, 0.2, 0.07, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = rgba(C.c, 0.8); ctx.beginPath(); ctx.arc(0, -0.03, 0.09, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = RM || Math.sin(t * 9) > 0 ? '#ff7bd5' : '#5a4a8a'; ctx.beginPath(); ctx.arc(0, 0.04, 0.025, 0, TAU); ctx.fill();
        }
        ctx.restore(); ctx.globalAlpha = 1;
    }
    function critTele(e, x, y, k, A) {  /* the wind-up: a red ring closing in, and a hint of what is coming */
        var C = CRIT[e.kind], u = clamp((clock - e.s0) / e.td, 0, 1), a = CATK[e.kind].k, pu = RM ? 0.85 : 0.6 + 0.4 * Math.sin(clock * 16);
        if (a === 'swoop' || a === 'dash' || a === 'zap') {  /* where it is headed: a mark on the road in front of the cat, or a thin aiming line */
            if (P(camX, 0.02, camZ + 2.2)) {
                var mx = px, my = py;
                ctx.globalAlpha = A * pu * 0.9; ctx.strokeStyle = a === 'zap' ? 'rgba(255,90,170,.9)' : '#ff5a5a'; ctx.lineCap = 'round';
                if (a === 'zap') {
                    ctx.globalAlpha = A * 0.35; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(CX, H - PAW * 1.4); ctx.stroke();
                    ctx.globalAlpha = A * pu; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(CX, H - PAW * 1.4); ctx.stroke(); ctx.setLineDash([]);
                }
                else {
                    ctx.lineWidth = Math.max(2, 0.06 * pk); ctx.beginPath(); ctx.ellipse(mx, my, 0.6 * pk, 0.6 * pk * clamp(EYE / 2.2, 0.1, 0.6), 0, 0, TAU); ctx.stroke();
                    if (a === 'dash') { ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(x, y + C.r * k * 0.5); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]); }
                }
            }
        }
        if (a === 'screech') {  /* sound rings spreading from the bat */
            ctx.strokeStyle = 'rgba(214,170,255,.8)'; ctx.lineWidth = Math.max(1.5, 0.03 * k);
            for (var j = 0; j < 3; j++) { var q = (u * 2 + j / 3) % 1; ctx.globalAlpha = A * (1 - q) * 0.8; ctx.beginPath(); ctx.arc(x, y, (0.3 + q * 0.8) * k, 0, TAU); ctx.stroke(); }
        }
        halo(x, y, (0.6 + 0.4 * u) * k, [255, 120, 90], A * 0.45 * u);
        ctx.globalAlpha = A * pu; ctx.strokeStyle = 'rgba(255,110,90,.95)'; ctx.lineWidth = Math.max(2.5, 0.05 * k);
        ctx.beginPath(); ctx.arc(x, y, Math.max(10, (1.1 - u * 0.7) * k), 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
    }
    function drawShot(e) {  /* guardian projectiles, and the critters' */
        shotPos(e, clock);
        if (!P(SX, SY, SZ)) return;
        var x = px, y = py, k = pk, A = e.cling ? Math.min(1, (7 - (clock - e.clT)) / 0.8) : fade(SZ - camZ), r = SR * k, st = e.style, t = clock - e.t0;
        if (st === 'orb') {  /* a crackling storm orb above a warning ring on the road */
            if (P(SX, 0.02, SZ)) {
                var mk = px, my = py, sq = clamp(EYE / Math.max(0.5, SZ - camZ), 0.1, 0.8), pu = RM ? 0.8 : 0.6 + 0.4 * Math.sin(clock * 10);
                ctx.globalAlpha = A; ctx.strokeStyle = 'rgba(255,90,90,' + pu.toFixed(2) + ')'; ctx.lineWidth = Math.max(2, 0.06 * pk);
                ctx.beginPath(); ctx.ellipse(mk, my, 0.75 * pk, 0.75 * pk * sq, 0, 0, TAU); ctx.stroke();
                ctx.strokeStyle = 'rgba(200,230,255,.5)'; ctx.lineWidth = Math.max(1, 0.025 * k); ctx.beginPath(); ctx.moveTo(x, y);
                for (var s = 1; s <= 5; s++) ctx.lineTo(x + (hash(Math.floor(clock * 12) + s) - 0.5) * 0.25 * k * (s < 5 ? 1 : 0), y + (my - y) * s / 5);
                ctx.stroke();
            }
            halo(x, y, r * 3, [150, 210, 255], A * 0.8);
            ctx.globalAlpha = A; ctx.fillStyle = '#eaf6ff'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
        } else if (st === 'mote') {  /* glowing moth dust: small in flight, a big blur once it clings */
            halo(x, y, e.cling ? r * 2.4 : r * 2.6, e.cling ? [190, 140, 255] : [120, 255, 220], A * (e.cling ? 0.85 : 0.75));
            ctx.globalAlpha = A * (e.cling ? 0.55 : 1); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * (e.cling ? 0.22 : 0.4), 0, TAU); ctx.fill();
        } else if (st === 'boulder') {  /* a spinning crystal boulder */
            halo(x, y, r * 2, [190, 130, 255], A * 0.5);
            ctx.globalAlpha = A; ctx.save(); ctx.translate(x, y); ctx.rotate(RM ? 0 : t * e.spin);
            ctx.fillStyle = '#8a62d0'; ctx.beginPath();
            for (var i = 0; i < 7; i++) { var a = i / 7 * TAU, rr = r * (0.8 + 0.25 * hash(i + 3)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d6c2ff'; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.3); ctx.lineTo(r * 0.1, -r * 0.7); ctx.lineTo(r * 0.3, -r * 0.1); ctx.closePath(); ctx.fill();
            ctx.restore();
        } else if (st === 'shard') {  /* an ice shard */
            halo(x, y, r * 2.2, [160, 230, 255], A * 0.6);
            ctx.globalAlpha = A; ctx.fillStyle = '#e8faff'; ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = Math.max(1, r * 0.12);
            ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 0.45, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r * 0.45, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (st === 'gear') {  /* a rolling gear wheel */
            shadow(SX, SZ, SR, A * 0.3);
            ctx.globalAlpha = A; ctx.save(); ctx.translate(x, y); ctx.rotate(RM ? 0 : -t * 7);
            ctx.drawImage(SPR.gear(1).cv, -r, -r, 2 * r, 2 * r); ctx.restore();
        } else if (st === 'spore') {  /* a puff of glowing spores */
            halo(x, y, r * 3, [90, 255, 210], A * 0.8);
            ctx.globalAlpha = A; ctx.fillStyle = '#eafff8';
            for (var sp = 0; sp < 5; sp++) { var sa2 = sp / 5 * TAU + (RM ? 0 : t * 2); ctx.beginPath(); ctx.arc(x + Math.cos(sa2) * r * 0.5, y + Math.sin(sa2) * r * 0.5, r * 0.22, 0, TAU); ctx.fill(); }
            ctx.fillStyle = '#7dffd8'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.fill();
        } else if (st === 'flake') {  /* a spinning snowflake */
            halo(x, y, r * 2.6, [170, 230, 255], A * 0.7);
            ctx.globalAlpha = A; ctx.save(); ctx.translate(x, y); ctx.rotate(RM ? 0 : t * 3);
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.lineCap = 'round'; ctx.beginPath();
            for (var fk = 0; fk < 6; fk++) {
                var fa2 = fk / 6 * TAU, c1 = Math.cos(fa2), s1 = Math.sin(fa2);
                ctx.moveTo(0, 0); ctx.lineTo(c1 * r, s1 * r);
                ctx.moveTo(c1 * r * 0.55, s1 * r * 0.55); ctx.lineTo(c1 * r * 0.55 + Math.cos(fa2 + 0.8) * r * 0.3, s1 * r * 0.55 + Math.sin(fa2 + 0.8) * r * 0.3);
                ctx.moveTo(c1 * r * 0.55, s1 * r * 0.55); ctx.lineTo(c1 * r * 0.55 + Math.cos(fa2 - 0.8) * r * 0.3, s1 * r * 0.55 + Math.sin(fa2 - 0.8) * r * 0.3);
            }
            ctx.stroke(); ctx.restore();
        } else if (st === 'honey') {  /* a honey drop, with its landing spot marked on the road */
            if (P(camX, 0.02, camZ + 2.6)) {
                ctx.globalAlpha = A * (RM ? 0.6 : 0.4 + 0.3 * Math.sin(clock * 12)); ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = Math.max(2, 0.05 * pk);
                ctx.beginPath(); ctx.ellipse(px, py, 0.5 * pk, 0.5 * pk * 0.45, 0, 0, TAU); ctx.stroke();
            }
            halo(x, y, r * 2.4, [255, 190, 70], A * 0.6);
            ctx.globalAlpha = A; ctx.fillStyle = '#ffbf3c'; ctx.strokeStyle = '#c97a12'; ctx.lineWidth = Math.max(1, r * 0.1);
            ctx.beginPath(); ctx.moveTo(x, y - r * 1.25); ctx.quadraticCurveTo(x + r, y - r * 0.1, x + r * 0.75, y + r * 0.45);
            ctx.arc(x, y + r * 0.3, r * 0.78, 0.2, Math.PI - 0.2); ctx.quadraticCurveTo(x - r, y - r * 0.1, x, y - r * 1.25); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.1, r * 0.16, 0, TAU); ctx.fill();
        } else if (st === 'zap') {  /* a little pink bolt of light */
            halo(x, y, r * 3, [255, 110, 210], A * 0.85);
            ctx.globalAlpha = A; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#ff7bd5'; ctx.lineWidth = Math.max(1.5, r * 0.15); ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, TAU); ctx.stroke();
        } else {  /* a little soap bubble */
            ctx.globalAlpha = A; ctx.strokeStyle = 'rgba(255,170,230,.8)'; ctx.lineWidth = Math.max(1, r * 0.1);
            ctx.fillStyle = 'rgba(220,240,255,.18)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.15, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    function drawAttack(ox, oy, k, d, A) {  /* the wind-up warning, the roc's dive marker, the ray's beam, the sheep's shields */
        var a = guard.atk;
        guard.panels.forEach(function (p) {
            if (!p.shield || p.broken) return;
            var q = panelPts(p), mx = 0, my = 0, n = q.length / 2, rr = 0;
            for (var j = 0; j < q.length; j += 2) { mx += q[j] / n; my += q[j + 1] / n; }
            for (j = 0; j < q.length; j += 2) rr = Math.max(rr, Math.sqrt((q[j] - mx) * (q[j] - mx) + (q[j + 1] - my) * (q[j + 1] - my)));
            ctx.globalAlpha = A; ctx.fillStyle = 'rgba(220,240,255,.22)'; ctx.strokeStyle = 'rgba(255,170,230,.9)'; ctx.lineWidth = Math.max(2, 0.06 * k);
            ctx.beginPath(); ctx.arc(ox + mx * k, oy - my * k, (rr + 0.15) * k, 0, TAU); ctx.fill(); ctx.stroke();
        });
        if (!a) return;
        if (a.phase === 'tele') {
            var u = a.t / a.dur, pu = RM ? 0.8 : 0.55 + 0.45 * Math.sin(clock * 18);
            ctx.globalAlpha = A * pu; ctx.strokeStyle = 'rgba(255,110,90,.9)'; ctx.lineWidth = Math.max(3, 0.12 * k);
            ctx.beginPath(); ctx.arc(ox, oy, (3.2 - u * 1.6) * k, 0, TAU); ctx.stroke();
            halo(ox, oy, 2.2 * k, [255, 120, 90], A * 0.35 * u);
        }
        if (a.kind === 'dive' && P(camX, 0.02, camZ + 3)) {  /* where it will land */
            ctx.globalAlpha = A * (RM ? 0.7 : 0.5 + 0.5 * Math.sin(clock * 14)); ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = Math.max(2, 0.07 * pk);
            ctx.beginPath(); ctx.ellipse(px, py, 1.1 * pk, 1.1 * pk * clamp(EYE / 3, 0.1, 0.6), 0, 0, TAU); ctx.stroke();
        }
        if (a.kind === 'beam') {  /* a thin warning line, then the sweeping beam */
            var sw = a.phase === 'tele' ? -2.6 : -2.6 + 5.2 * clamp(a.t / 1.6, 0, 1);
            if (P(camX + sw, 0.02, camZ + 2.5)) {
                ctx.lineCap = 'round';
                if (a.phase === 'tele') { ctx.globalAlpha = A * 0.8; ctx.strokeStyle = 'rgba(255,90,120,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px, py); ctx.stroke(); }
                else {
                    ctx.globalAlpha = A; ctx.strokeStyle = 'rgba(255,120,220,.35)'; ctx.lineWidth = Math.max(10, 0.5 * k); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px, py); ctx.stroke();
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, 0.12 * k); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px, py); ctx.stroke();
                    halo(px, py, 0.9 * pk, [255, 140, 230], A * 0.8);
                }
            }
        }
        ctx.globalAlpha = 1;
    }
    var GUARDITEM = { type: 'guard', z: 0 };
    function drawGuard() {
        guardPos(clock);
        if (!P(GX, GY, GZ)) return;
        var d = GDES[guard.key], k = pk * gscale(), ox = px, oy = py, f = fogf(GZ - camZ) * 0.5;
        var A = fade(GZ - camZ) * (guard.state === 'dead' ? Math.max(0, 1 - guard.dead / 1.1) : 1);
        function path(p) { ctx.beginPath(); for (var i = 0; i < p.length; i += 2) { var X = ox + p[i] * k, Y = oy - p[i + 1] * k; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } }
        if (guard.state === 'dead') {  /* a shock ring as it shatters */
            ctx.globalAlpha = Math.max(0, 1 - guard.dead / 1.1); ctx.strokeStyle = rgba(d.c2, 0.8); ctx.lineWidth = Math.max(2, 0.12 * k);
            ctx.beginPath(); ctx.arc(ox, oy, (0.5 + guard.dead * 4) * k, 0, TAU); ctx.stroke();
        }
        if (d.roc) {  /* the roc rides a little storm cloud of its own */
            for (var sc = 0; sc < 7; sc++) {
                var sa = sc / 7 * TAU + (RM ? 0 : clock * 0.4), sr = 1.5 + 0.4 * Math.sin(sc * 2.3);
                halo(ox + Math.cos(sa) * sr * k, oy - (Math.sin(sa) * sr * 0.55 + 0.3) * k, 1.5 * k, [52, 58, 120], A * 0.42);
            }
        }
        halo(ox, oy, 3.4 * k, d.c, A * 0.42);
        ctx.globalAlpha = A; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (d.body) { path(d.body); ctx.closePath(); ctx.fillStyle = mixa([44, 30, 74], FOG, f, 0.8); ctx.fill(); }
        ctx.strokeStyle = mixa(d.c, FOG, f, 0.9); ctx.lineWidth = Math.max(1.5, Math.min(10, 0.07 * k));
        d.lines.forEach(function (l) { path(l); ctx.stroke(); });
        var gr = ctx.createLinearGradient(ox - 2 * k, oy - 2 * k, ox + 2 * k, oy + 2 * k);
        if (d.roc) { gr.addColorStop(0, rgba(d.c, 0.75)); gr.addColorStop(0.45, rgba([70, 120, 230], 0.55)); gr.addColorStop(0.55, 'rgba(255,255,255,.7)'); gr.addColorStop(1, rgba(d.c, 0.7)); }
        else gr.addColorStop(0, rgba(d.c2, 0.6));
        if (!d.roc) { gr.addColorStop(0.45, rgba(d.c, 0.28)); gr.addColorStop(0.55, 'rgba(255,255,255,.5)'); gr.addColorStop(1, rgba(d.c, 0.45)); }
        guard.panels.forEach(function (p, i) {
            if (p.broken) return;
            var act = i === guard.idx && guard.state !== 'dead';
            var pts = panelPts(p);
            path(pts); ctx.closePath();
            ctx.globalAlpha = A; ctx.fillStyle = gr; ctx.fill();
            if (p.flap) {  /* feathers across a beating wing */
                ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, Math.min(4, 0.03 * k)); ctx.beginPath();
                for (var fq = 4; fq < pts.length - 2; fq += 2) { ctx.moveTo(ox + pts[0] * k, oy - pts[1] * k); ctx.lineTo(ox + pts[fq] * k, oy - pts[fq + 1] * k); }
                ctx.stroke(); path(pts); ctx.closePath();
            }
            if (p.flash > 0) { ctx.fillStyle = 'rgba(255,80,110,' + Math.min(0.6, p.flash * 1.4).toFixed(2) + ')'; ctx.fill(); }
            if (act) {
                var pu = RM ? 0.85 : 0.6 + 0.4 * Math.sin(clock * 7);
                ctx.strokeStyle = rgba(d.c2, 0.5 * pu); ctx.lineWidth = Math.max(4, Math.min(30, 0.34 * k)); ctx.stroke();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, Math.min(8, 0.07 * k)); ctx.stroke();
                var mx = 0, my = 0, n = pts.length / 2;
                for (var j = 0; j < pts.length; j += 2) { mx += pts[j] / n; my += pts[j + 1] / n; }
                var an = RM ? 0 : clock * 3;
                halo(ox + (mx + Math.cos(an) * 0.35) * k, oy - (my + Math.sin(an) * 0.35) * k, 0.2 * k, [255, 255, 255], A);
                ctx.globalAlpha = A;
            } else { ctx.strokeStyle = rgba(d.c, 0.3); ctx.lineWidth = Math.max(3, Math.min(16, 0.16 * k)); ctx.stroke(); ctx.strokeStyle = rgba(d.c, 0.95); ctx.lineWidth = Math.max(1.5, Math.min(8, 0.05 * k)); ctx.stroke(); }
        });
        d.eyes.forEach(function (eY) { halo(ox + eY[0] * k, oy - eY[1] * k, (d.roc ? 0.22 : 0.16) * k, d.c2, A); });
        if (guard.state !== 'dead') drawAttack(ox, oy, k, d, A);
        if (d.roc) {  /* a golden hooked beak */
            ctx.globalAlpha = A; ctx.fillStyle = '#ffcf5a';
            ctx.beginPath(); ctx.moveTo(ox - 0.09 * k, oy - 0.92 * k); ctx.lineTo(ox + 0.09 * k, oy - 0.92 * k); ctx.quadraticCurveTo(ox + 0.04 * k, oy - 0.72 * k, ox, oy - 0.66 * k); ctx.closePath(); ctx.fill();
        }
        if (d.roc && guard.state !== 'dead') {  /* a glowing core, and lightning crackling between the unbroken panels */
            var cs = [], core = [0, 0];
            guard.panels.forEach(function (p) {
                if (p.broken) return;
                var q = panelPts(p), mx = 0, my = 0, n = q.length / 2;
                for (var j = 0; j < q.length; j += 2) { mx += q[j] / n; my += q[j + 1] / n; }
                cs.push([mx, my]);
            });
            halo(ox, oy, (0.7 + 0.15 * Math.sin(clock * 6)) * k, [255, 240, 160], A * 0.85);
            var seed = RM ? 1 : Math.floor(clock * 14);
            ctx.lineJoin = 'miter';
            for (var b = 0; b < 2; b++) {
                ctx.strokeStyle = b ? 'rgba(255,255,255,' + (RM ? 0.5 : 0.95) + ')' : rgba([150, 210, 255], RM ? 0.25 : 0.45);
                ctx.lineWidth = b ? Math.max(1, 0.03 * k) : Math.max(3, 0.12 * k);
                ctx.beginPath();
                cs.forEach(function (c, ci) {
                    if (Math.abs(c[0]) < 0.4 && Math.abs(c[1]) < 0.4) return;
                    ctx.moveTo(ox + core[0] * k, oy - core[1] * k);
                    for (var s2 = 1; s2 <= 6; s2++) {
                        var u = s2 / 6, jx = s2 < 6 ? (hash(seed + ci * 7 + s2) - 0.5) * 0.35 : 0, jy = s2 < 6 ? (hash(seed * 1.3 + ci * 5 + s2) - 0.5) * 0.35 : 0;
                        ctx.lineTo(ox + (c[0] * u + jx) * k, oy - (c[1] * u + jy) * k);
                    }
                });
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

