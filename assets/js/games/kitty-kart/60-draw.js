    /* ---------- drawing ---------- */
    function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    var OL = '#3b2a1e';
    function drawKart(c) {
        ctx.save(); ctx.translate(c.x, c.y);
        if (c.z > 0) {  /* in the air: the shadow stays on the ground, the kart grows a little */
            ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(c.z * 0.5, c.z * 0.8, 16, 11, c.a, 0, 7); ctx.fill();
            ctx.scale(1 + Math.min(c.z, 36) / 50, 1 + Math.min(c.z, 36) / 50);
        }
        if (c.fall > 0 && c.poof) {  /* put back on the track: a cartoon puff of smoke, the kart fades inside it */
            var pt = 1 - c.fall / 1.1, pr = 10 + pt * 16, q;
            ctx.globalAlpha = Math.max(0, 1 - pt * 1.6);
            for (q = 0; q < 6; q++) circle(ctx, Math.cos(q * 1.05 + pt * 2) * pr * 0.55, Math.sin(q * 1.05 + pt * 2) * pr * 0.55, pr * 0.55, q % 2 ? '#f8fafc' : '#e2e8f0');
            ctx.globalAlpha = Math.max(0, 0.9 - pt * 3);
        } else if (c.fall > 0) { var fs = 0.15 + 0.85 * c.fall / 1.3; ctx.globalAlpha = c.fall / 1.3; ctx.scale(fs, fs); ctx.rotate((1.3 - c.fall) * 6); }
        ctx.rotate(c.a);
        if (c.boost > 0) {  /* catnip or a boost pad: a green flame */
            ctx.fillStyle = 'rgba(74,222,128,.75)'; ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(-27 - Math.random() * 9, 0); ctx.lineTo(-15, 5); ctx.fill();
        }
        ctx.fillStyle = 'rgba(15,23,42,.16)'; rrect(-14, -8, 32, 20, 8); ctx.fill();
        ctx.fillStyle = '#1f2937';
        rrect(-14, -13, 10, 6, 2); ctx.fill(); rrect(-14, 7, 10, 6, 2); ctx.fill();
        for (var s = -1; s <= 1; s += 2) { ctx.save(); ctx.translate(9, s * 10); ctx.rotate(c.steer * 0.45); rrect(-4.5, -2.5, 9, 5, 2); ctx.fill(); ctx.restore(); }
        (SKIN_BY[c.skin] || SKINS[0]).draw(c);  /* the body: the kart's skin */
        var wag = Math.sin(clock * (c.dog ? 16 : 9) + c.phase) * 3;  /* the tail, over the back of the kart (a dog wags faster) */
        ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, 3);
        if (c.dog) ctx.quadraticCurveTo(-12, 3 + wag, -15, 5 + wag * 1.3); else ctx.quadraticCurveTo(-17, 4 + wag, -21, 9 + wag);
        ctx.strokeStyle = OL; ctx.lineWidth = 5.6; ctx.stroke(); ctx.strokeStyle = c.tail || c.fur; ctx.lineWidth = 3.4; ctx.stroke();
        ctx.fillStyle = c.fur; ctx.strokeStyle = OL; ctx.lineWidth = 1.3;
        if (c.dog) {  /* a dog: round head, a snout with a dark nose, floppy ears hanging down the sides, a tongue out at speed */
            ctx.beginPath(); ctx.arc(-1, 0, 7, 0, 7); ctx.fill(); ctx.stroke();
            if (c.boost > 0 || c.vf > VMAX * 0.8) { ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.ellipse(9.4, 2.2, 2.6, 1.6, 0.5, 0, 7); ctx.fill(); }
            ctx.fillStyle = c.cream; ctx.beginPath(); ctx.ellipse(5.4, 0, 3.9, 3.1, 0, 0, 7); ctx.fill(); ctx.stroke();
            ctx.fillStyle = c.nose; ctx.beginPath(); ctx.ellipse(8.6, 0, 1.6, 2.4, 0, 0, 7); ctx.fill();
            circle(ctx, 1.6, -3.3, 1.15, '#1f1a17'); circle(ctx, 1.6, 3.3, 1.15, '#1f1a17');  /* eyes */
            ctx.fillStyle = c.ear; ctx.strokeStyle = OL; ctx.lineWidth = 1.1;
            for (s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.ellipse(-3, s * 6.6, 5.2, 2.7, -s * 0.38, 0, 7); ctx.fill(); ctx.stroke(); }
        } else {
            ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(4, -9.5); ctx.lineTo(3.5, -2); ctx.closePath();  /* ears */
            ctx.moveTo(-3, 5); ctx.lineTo(4, 9.5); ctx.lineTo(3.5, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(-1, 0, 7, 0, 7); ctx.fill(); ctx.stroke();
            if (c.stripe) {
                ctx.strokeStyle = c.stripe; ctx.lineWidth = 1.6; ctx.beginPath();
                ctx.moveTo(-6.5, -3); ctx.lineTo(-2.5, -2.4); ctx.moveTo(-7.4, 0); ctx.lineTo(-2.5, 0); ctx.moveTo(-6.5, 3); ctx.lineTo(-2.5, 2.4); ctx.stroke();
            }
        }
        if (c.shield > 0) {  /* sitting in a cardboard box, flaps open */
            ctx.fillStyle = '#d4a464'; ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = 1.2;
            for (var f = -1; f <= 1; f += 2) {
                ctx.beginPath(); ctx.moveTo(-19, f * 14); ctx.lineTo(-13, f * 23); ctx.lineTo(13, f * 23); ctx.lineTo(19, f * 14); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            ctx.strokeStyle = '#a26b35'; ctx.lineWidth = 4.5; ctx.strokeRect(-19, -14, 38, 28);
            ctx.fillStyle = '#ecd9b0'; ctx.fillRect(-3, -16.5, 6, 5); ctx.fillRect(-3, 11.5, 6, 5);
        }
        if (c.tangled > 0) {  /* wrapped in pink wool (dogs: dizzy fuzzy green rings from the tennis ball) */
            ctx.strokeStyle = DOG ? '#a3e635' : '#f472b6'; ctx.lineWidth = 1.6;
            for (var w = 0; w < 3; w++) { ctx.beginPath(); ctx.ellipse(0, 0, 20, 9, w * 1.05 + clock * 3, 0, 7); ctx.stroke(); }
        }
        ctx.restore();
    }
    function drawYarn(g, r, rot, tail) {  /* a ball of pink wool: shading, wound strands at different tilts, outline, highlight, loose thread */
        var k, b;
        if (tail) {
            g.strokeStyle = '#db2777'; g.lineWidth = Math.max(1, r * 0.12); g.lineCap = 'round';
            g.beginPath(); g.moveTo(r * 0.55, r * 0.75); g.bezierCurveTo(r * 1.1, r * 1.15, r * 0.4, r * 1.35, r * 1.15, r * 1.3); g.stroke();
        }
        var gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        gr.addColorStop(0, '#ffd1e6'); gr.addColorStop(0.55, '#f472b6'); gr.addColorStop(1, '#be185d');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
        g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip();
        g.lineWidth = Math.max(0.7, r * 0.08);
        for (b = 0; b < 3; b++) {  /* three bands of strands, each wound at its own tilt */
            g.save(); g.rotate(rot + b * 1.05);
            g.strokeStyle = b === 1 ? 'rgba(255,214,232,.6)' : 'rgba(131,24,67,.5)';
            for (k = -2; k <= 2; k++) {
                var yy = k * r * 0.34, rx = r * Math.sqrt(Math.max(0.05, 1 - (yy / r) * (yy / r)));
                g.beginPath(); g.ellipse(0, yy, rx, r * 0.22, 0, 0, Math.PI); g.stroke();
            }
            g.restore();
        }
        g.restore();
        g.strokeStyle = '#831843'; g.lineWidth = Math.max(0.8, r * 0.1); g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.24, r * 0.13, -0.6, 0, 7); g.fill();
    }
    function drawBall(g, r, rot) {  /* dog mode: a tennis ball, yellow green felt and its white curved seam */
        var gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        gr.addColorStop(0, '#f7fee7'); gr.addColorStop(0.5, '#d9f99d'); gr.addColorStop(1, '#84cc16');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
        g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip(); g.rotate(rot);
        g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, r * 0.14);
        g.beginPath(); g.arc(-r * 1.25, 0, r * 0.95, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
        g.restore();
        g.strokeStyle = '#4d7c0f'; g.lineWidth = Math.max(0.8, r * 0.09); g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    }
    function drawBone(g, r) {  /* dog mode: a bone, centred on 0, 0, r long from the middle to an end */
        g.fillStyle = '#fffbeb'; g.strokeStyle = '#a16207'; g.lineWidth = Math.max(1, r * 0.1);
        g.beginPath(); g.rect(-r * 0.7, -r * 0.18, r * 1.4, r * 0.36); g.fill(); g.stroke();
        for (var e = -1; e <= 1; e += 2) for (var f = -1; f <= 1; f += 2) { g.beginPath(); g.arc(e * r * 0.75, f * r * 0.2, r * 0.27, 0, 7); g.fill(); g.stroke(); }
        g.fillRect(-r * 0.72, -r * 0.13, r * 1.44, r * 0.26);
    }
    function drawIcon(g, it, r) {  /* the item pictures for the HUD slot and the touch button, centred on 0, 0 */
        var i;
        g.lineCap = g.lineJoin = 'round';
        if (it === 'yarn' && DOG) drawBall(g, r * 0.72, 0.5);
        else if (it === 'yarn') { g.save(); g.translate(-r * 0.15, -r * 0.15); drawYarn(g, r * 0.7, 0.5, 1); g.restore(); }
        else if (it === 'catnip' && DOG) {  /* a squeaky toy: a rubber duck */
            g.fillStyle = '#facc15'; g.strokeStyle = '#a16207'; g.lineWidth = r * 0.07;
            g.beginPath(); g.ellipse(-r * 0.05, r * 0.3, r * 0.7, r * 0.45, 0, 0, 7); g.fill(); g.stroke();
            g.beginPath(); g.arc(r * 0.25, -r * 0.3, r * 0.36, 0, 7); g.fill(); g.stroke();
            g.fillStyle = '#f97316'; g.beginPath(); g.moveTo(r * 0.55, -r * 0.36); g.lineTo(r * 0.92, -r * 0.24); g.lineTo(r * 0.55, -r * 0.14); g.closePath(); g.fill();
            circle(g, r * 0.32, -r * 0.4, r * 0.07, '#1f2937');
            g.strokeStyle = '#a16207'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(-r * 0.2, r * 0.28, r * 0.32, 0.2, 1.6); g.stroke();  /* wing */
            g.strokeStyle = '#38bdf8'; g.lineWidth = r * 0.07;  /* squeak lines */
            for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-r * 0.55 - i * r * 0.12, -r * 0.35 - i * r * 0.15); g.lineTo(-r * 0.75 - i * r * 0.12, -r * 0.5 - i * r * 0.15); g.stroke(); }
        } else if (it === 'catnip') {
            g.strokeStyle = '#15803d'; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(0, r * 0.95); g.quadraticCurveTo(r * 0.12, 0, 0, -r * 0.55); g.stroke();
            [[-0.42, 0.3, -0.8], [0.42, 0.1, 0.8], [-0.34, -0.3, -0.5], [0.34, -0.5, 0.5], [0, -0.78, 0]].forEach(function (l) {
                g.save(); g.translate(l[0] * r, l[1] * r); g.rotate(l[2]); g.fillStyle = '#22c55e'; g.strokeStyle = '#166534'; g.lineWidth = r * 0.06;
                g.beginPath(); g.ellipse(0, 0, r * 0.2, r * 0.34, 0, 0, 7); g.fill(); g.stroke(); g.restore();
            });
            circle(g, r * 0.7, -r * 0.75, r * 0.09, '#86efac'); circle(g, -r * 0.75, -r * 0.55, r * 0.07, '#86efac');
        } else if (it === 'box') {
            g.fillStyle = '#c8955a'; g.strokeStyle = '#7c4a1e'; g.lineWidth = r * 0.07;
            g.beginPath(); g.rect(-r * 0.7, -r * 0.2, r * 1.4, r * 0.95); g.fill(); g.stroke();
            g.fillStyle = '#deb07a';
            for (i = -1; i <= 1; i += 2) {
                g.beginPath(); g.moveTo(i * r * 0.7, -r * 0.2); g.lineTo(i * r * 0.98, -r * 0.68); g.lineTo(i * r * 0.12, -r * 0.68); g.lineTo(0, -r * 0.2); g.closePath(); g.fill(); g.stroke();
            }
            g.fillStyle = '#ecd9b0'; g.fillRect(-r * 0.12, -r * 0.2, r * 0.24, r * 0.95);
            circle(g, -r * 0.35, r * 0.3, r * 0.08, '#7c4a1e'); circle(g, r * 0.35, r * 0.3, r * 0.08, '#7c4a1e');
        } else if (it === 'laser') {
            g.save(); g.rotate(-0.7);
            g.fillStyle = '#475569'; rr(g, -r * 0.85, -r * 0.15, r * 1.25, r * 0.3, r * 0.12); g.fill();
            g.fillStyle = '#94a3b8'; g.fillRect(-r * 0.5, -r * 0.15, r * 0.22, r * 0.3);
            g.fillStyle = '#ef4444'; g.fillRect(r * 0.4, -r * 0.1, r * 0.1, r * 0.2);
            g.strokeStyle = 'rgba(239,68,68,.8)'; g.lineWidth = r * 0.07; g.beginPath(); g.moveTo(r * 0.5, 0); g.lineTo(r * 0.95, 0); g.stroke();
            g.restore();
            circle(g, r * 0.73, -r * 0.61, r * 0.22, 'rgba(239,68,68,.35)'); circle(g, r * 0.73, -r * 0.61, r * 0.11, '#ef4444');
        } else if (it === 'milk' && DOG) {  /* a water bowl */
            g.fillStyle = '#ef4444'; g.strokeStyle = '#7f1d1d'; g.lineWidth = r * 0.07;
            g.beginPath(); g.moveTo(-r * 0.85, -r * 0.05); g.lineTo(r * 0.85, -r * 0.05); g.lineTo(r * 0.6, r * 0.6); g.lineTo(-r * 0.6, r * 0.6); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = '#60a5fa'; g.beginPath(); g.ellipse(0, -r * 0.05, r * 0.85, r * 0.28, 0, 0, 7); g.fill(); g.stroke();
            g.fillStyle = '#bfdbfe'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.1, r * 0.3, r * 0.09, 0, 0, 7); g.fill();
            circle(g, r * 0.1, -r * 0.6, r * 0.1, '#60a5fa'); circle(g, r * 0.35, -r * 0.82, r * 0.07, '#60a5fa');
        } else if (it === 'milk') {
            g.fillStyle = '#f8fafc'; g.strokeStyle = '#475569'; g.lineWidth = r * 0.07;
            g.beginPath(); g.moveTo(-r * 0.45, -r * 0.35); g.lineTo(-r * 0.1, -r * 0.8); g.lineTo(r * 0.1, -r * 0.8); g.lineTo(r * 0.45, -r * 0.35);
            g.lineTo(r * 0.45, r * 0.85); g.lineTo(-r * 0.45, r * 0.85); g.closePath(); g.fill(); g.stroke();
            g.beginPath(); g.moveTo(-r * 0.45, -r * 0.35); g.lineTo(r * 0.45, -r * 0.35); g.stroke();
            g.fillStyle = '#60a5fa'; g.fillRect(-r * 0.43, r * 0.02, r * 0.86, r * 0.48);
            circle(g, 0, r * 0.32, r * 0.1, '#fff');
            for (i = -1; i <= 1; i++) circle(g, i * r * 0.13, r * 0.14 - (i ? 0 : r * 0.04), r * 0.05, '#fff');
        } else if (it === 'bell') {
            g.fillStyle = '#ef4444'; g.fillRect(-r * 0.12, -r * 0.88, r * 0.24, r * 0.3);
            g.fillStyle = '#facc15'; g.strokeStyle = '#a16207'; g.lineWidth = r * 0.07;
            g.beginPath(); g.moveTo(-r * 0.62, r * 0.45); g.quadraticCurveTo(-r * 0.52, -r * 0.62, 0, -r * 0.64); g.quadraticCurveTo(r * 0.52, -r * 0.62, r * 0.62, r * 0.45); g.closePath(); g.fill(); g.stroke();
            circle(g, 0, r * 0.6, r * 0.15, '#a16207');
            g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = r * 0.09; g.beginPath(); g.arc(-r * 0.05, -r * 0.05, r * 0.38, 3.5, 4.3); g.stroke();
        }
    }
    function itemPic(g, it) {  /* an item, or a dashed ring for none, on a 64 x 64 canvas */
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 64, 64);
        g.setTransform(1, 0, 0, 1, 32, 32);
        if (it) drawIcon(g, it, 27);
        else { g.strokeStyle = '#94a3b8'; g.lineWidth = 3; g.setLineDash([5, 5]); g.beginPath(); g.arc(0, 0, 20, 0, 7); g.stroke(); g.setLineDash([]); }
    }
    function slot() {  /* the held item, in the HUD and on the touch button */
        itemPic(slotG, me.item); itemPic(useG, me.item);
        slotEl.classList.toggle('kk-empty', !me.item); useEl.classList.toggle('kk-empty', !me.item);
    }
    function drawGate() {
        var gi = ALT.gate.i, o = gateOpen(clock), w = ALT.hw + 8, k;
        if (!vis(ALT.x[gi], ALT.y[gi], 90)) return;
        ctx.save(); ctx.translate(ALT.x[gi], ALT.y[gi]); ctx.rotate(ALT.ang[gi]);
        if (MAP.gate === 'farm') {  /* a wooden farm gate in two halves that swing forward */
            for (k = -1; k <= 1; k += 2) {
                ctx.save(); ctx.translate(0, k * w); ctx.rotate(k * o * 1.45);
                ctx.strokeStyle = '#6b3f17'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -k * w); ctx.stroke();
                ctx.strokeStyle = '#c8955a'; ctx.lineWidth = 3.5; ctx.stroke();
                ctx.restore();
                circle(ctx, 0, k * w, 6, '#4a2a0e');
            }
        } else if (MAP.gate === 'iron') {  /* a creaky iron graveyard gate in two halves, spikes on top */
            for (k = -1; k <= 1; k += 2) {
                ctx.save(); ctx.translate(0, k * w); ctx.rotate(k * o * 1.4);
                ctx.strokeStyle = '#111018'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -k * w); ctx.stroke();
                ctx.lineWidth = 2;
                for (var b = 6; b < w; b += 8) { ctx.beginPath(); ctx.moveTo(-5, -k * b); ctx.lineTo(5, -k * b); ctx.stroke(); }
                circle(ctx, 0, -k * w * 0.5, 4, '#7c6f9a');
                ctx.restore();
                circle(ctx, 0, k * w, 7, '#2b2440'); circle(ctx, 0, k * w, 3.5, '#7c6f9a');
            }
        } else {  /* a striped barrier that lifts, with a blinking light */
            var len = 2 * w * (1 - o * 0.85);
            ctx.fillStyle = '#1f2937'; ctx.fillRect(-8, -w - 10, 16, 14);
            for (k = 0; k < len; k += 12) { ctx.fillStyle = (k / 12) % 2 ? '#f8fafc' : '#ef4444'; ctx.fillRect(-3.5, -w + k, 7, Math.min(12, len - k)); }
            var lit = o < 0.99 && Math.floor(clock * 4) % 2 === 0;
            circle(ctx, 0, -w - 3, 3.8, lit ? '#fbbf24' : '#78350f');
            if (lit) circle(ctx, 0, -w - 3, 10, 'rgba(251,191,36,.3)');
        }
        ctx.restore();
    }
    function drawUnder() {  /* pads, gate, spilt milk, fish tins and laser dots, under the karts */
        var i, b, t, c;
        for (i = 0; i < boosts.length; i++) {
            b = boosts[i];
            if (!vis(b.x, b.y, 30)) continue;
            ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(((clock * 2) % 1) * 36 - 22, -17, 8, 34); ctx.restore();
        }
        if (ALT && ALT.gate && !MAP.gateSoft) drawGate();
        for (i = 0; i < milks.length; i++) {
            var m = milks[i];
            if (!vis(m.x, m.y, 30)) continue;
            ctx.globalAlpha = Math.min(1, m.t * 4, (14 - m.t) / 1.5);
            circle(ctx, m.x, m.y, 22, 'rgba(100,116,139,.35)');
            var mc = DOG ? ['#7dd3fc', '#e0f2fe', '#bae6fd'] : ['#f8fafc', '#ffffff', '#eef2f7'];  /* milk, or a dog's spilt water */
            circle(ctx, m.x, m.y, 20, mc[0]); circle(ctx, m.x + 13, m.y + 7, 10, mc[0]); circle(ctx, m.x - 11, m.y + 9, 9, mc[0]);
            circle(ctx, m.x - 6, m.y - 7, 5, mc[1]); circle(ctx, m.x + 4, m.y + 2, 6, mc[2]);
            ctx.globalAlpha = 1;
        }
        for (i = 0; i < tins.length; i++) {  /* fish tins floating in a bubble */
            t = tins[i];
            if (t.t > 0 || !vis(t.x, t.y, 30)) continue;
            var bob = Math.sin(clock * 3 + i) * 3, sc = 1 + Math.sin(clock * 5 + i) * 0.05;
            ctx.save(); ctx.translate(t.x, t.y);
            ctx.fillStyle = 'rgba(15,23,42,.2)'; ctx.beginPath(); ctx.ellipse(3, 8, 13, 6, 0, 0, 7); ctx.fill();
            ctx.translate(0, bob - 6); ctx.scale(sc, sc);
            circle(ctx, 0, 0, 17, 'rgba(255,255,255,.3)');
            ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.stroke();
            ctx.rotate(Math.sin(clock * 2 + i) * 0.3);
            if (DOG) { drawBone(ctx, 12); circle(ctx, -6, -9, 2.2, 'rgba(255,255,255,.95)'); ctx.restore(); continue; }  /* a dog finds bones */
            ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(0, 1, 12, 8, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(0, -0.5, 11.5, 7.2, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#d6336c'; ctx.beginPath(); ctx.ellipse(0, -0.5, 8, 4.6, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-1.5, -0.5, 3.8, 2, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.moveTo(1.8, -0.5); ctx.lineTo(5.5, -3); ctx.lineTo(5.5, 2); ctx.fill();
            ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-8.5, -0.5, 2, 0, 7); ctx.stroke();
            circle(ctx, -6, -9, 2.2, 'rgba(255,255,255,.95)');
            ctx.restore();
        }
        for (i = 0; i < 4; i++) {
            c = karts[i];
            if (c.laser > 0 && c.dotx !== undefined) { circle(ctx, c.dotx, c.doty, 14, 'rgba(239,68,68,.25)'); circle(ctx, c.dotx, c.doty, 5, '#ef4444'); circle(ctx, c.dotx - 1.5, c.doty - 1.5, 1.8, '#fecaca'); }
        }
        drawParts('leaf'); drawParts('card'); drawParts('spark'); drawParts('dust');
    }
    function drawOver() {  /* flying yarn, sleepy Zs and the bell ring, over the karts */
        var i, c;
        for (i = 0; i < yarns.length; i++) {
            var y = yarns[i], h = y.trail;
            if (!vis(y.x, y.y, 60)) continue;
            if (!DOG) {  /* the loose thread (a tennis ball has none) */
                ctx.strokeStyle = '#db2777'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(y.x, y.y - 4);
                for (var j = h.length - 2; j >= 0; j -= 2) ctx.lineTo(h[j] + Math.sin(j + clock * 20) * 2, h[j + 1] - 4 + Math.cos(j + clock * 20) * 2);
                ctx.stroke();
            }
            circle(ctx, y.x + 2, y.y + 5, 8, 'rgba(15,23,42,.2)');
            ctx.save(); ctx.translate(y.x, y.y - 4); if (DOG) drawBall(ctx, 8, y.roll); else drawYarn(ctx, 9, y.roll, 0); ctx.restore();
        }
        ctx.font = '800 13px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#1e3a8a'; ctx.fillStyle = '#fde047';
        for (i = 0; i < 4; i++) {
            c = karts[i];
            if (!(c.nap > 0) || !vis(c.x, c.y, 40)) continue;
            for (var z = 0; z < 2; z++) {
                var b = (clock * 1.2 + c.phase + z * 0.5) % 1, zx = c.x + 4 + b * 10 - z * 8, zy = c.y - 14 - b * 18;
                ctx.strokeText(z ? 'Z' : 'z', zx, zy); ctx.fillText(z ? 'Z' : 'z', zx, zy);
            }
        }
        for (i = 0; i < rings.length; i++) {
            var rg = rings[i];
            ctx.globalAlpha = Math.max(0, 1 - rg.t / 0.8); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(rg.who.x, rg.who.y, 20 + rg.t * 480, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        }
    }
    function gantry() {  /* the start and finish arch: two posts and a chequered banner, standing up over the road */
        if (MAP.noGantry || !vis(X[0], Y[0], HW + 140)) return;
        var a = side(0, -HW - 20), b = side(0, HW + 20), h = 0.06, col = MAP.gantry || ['#1e3a8a', '#d6336c'], k;
        var ax = liftX(a.x, h), ay = liftY(a.y, h), bx = liftX(b.x, h), by = liftY(b.y, h);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(15,23,42,.2)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(a.x + 12, a.y + 16); ctx.lineTo(b.x + 12, b.y + 16); ctx.stroke();
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ax, ay); ctx.moveTo(b.x, b.y); ctx.lineTo(bx, by); ctx.stroke();
        ctx.save(); ctx.translate((ax + bx) / 2, (ay + by) / 2); ctx.rotate(Math.atan2(by - ay, bx - ax));
        var L = Math.hypot(bx - ax, by - ay);
        ctx.fillStyle = col[0]; rrect(-L / 2 - 8, -11, L + 16, 22, 7); ctx.fill();
        for (k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#0f172a' : '#ffffff'; ctx.fillRect(-24 + (k % 4) * 12, k < 4 ? -8 : 0, 12, 8); }
        ctx.fillStyle = col[1]; ctx.fillRect(-L / 2 + 6, -5, L / 2 - 36, 10); ctx.fillRect(30, -5, L / 2 - 36, 10);
        ctx.restore();
        circle(ctx, ax, ay, 7, col[1]); circle(ctx, bx, by, 7, col[1]);
    }
    function draw() {
        var k = dpr * zoom, cw = cv.width, ch = cv.height, i;
        var cx = camX + (shake ? (Math.random() - 0.5) * shake : 0), cy = camY + (shake ? (Math.random() - 0.5) * shake : 0);
        var ox = Math.round(cx * k - cw / 2), oy = Math.round(cy * k - ch / 2);   /* view offset in device pixels */
        VX0 = ox / k; VY0 = oy / k; VX1 = (ox + cw) / k; VY1 = (oy + ch) / k;
        if (MAP.sky) MAP.drawSky(cw, ch, k);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (Math.abs(res - k) < 0.01 && ox >= 0 && oy >= 0 && ox + cw <= track.width && oy + ch <= track.height) {
            ctx.drawImage(track, ox, oy, cw, ch, 0, 0, cw, ch);  /* the usual case: a plain copy, no scaling */
        } else {                                                 /* track cache capped, or the window is larger than the field */
            if (!MAP.sky) { ctx.fillStyle = MAP.col.bg; ctx.fillRect(0, 0, cw, ch); }
            var hw = cw / 2 / k, hh = ch / 2 / k, x0 = Math.max(0, Math.floor(cx - hw)), y0 = Math.max(0, Math.floor(cy - hh));
            var x1 = Math.min(WW, Math.ceil(cx + hw)), y1 = Math.min(WH, Math.ceil(cy + hh));
            ctx.setTransform(k, 0, 0, k, cw / 2 - cx * k, ch / 2 - cy * k);
            if (x1 > x0 && y1 > y0) ctx.drawImage(track, x0 * res, y0 * res, (x1 - x0) * res, (y1 - y0) * res, x0, y0, x1 - x0, y1 - y0);
        }
        ctx.setTransform(k, 0, 0, k, -ox, -oy);
        if (MAP.under) MAP.under();
        drawUnder();
        for (i = 3; i >= 0; i--) if (!(karts[i].z > 0)) drawKart(karts[i]);
        for (i = 3; i >= 0; i--) if (karts[i].z > 0) drawKart(karts[i]);
        if (split) { if (me === karts[0]) tag(karts[1], 'P2', '#1e3a8a'); else tag(karts[0], 'P1', '#d6336c'); }  /* split screen: the other player */
        else if (pal && vis(pal.x, pal.y, 40)) {  /* racing a friend: their kart has a name tag */
            ctx.font = '800 12px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#1e3a8a';
            ctx.strokeText('Friend', pal.x, pal.y - 22 - pal.z * 0.5); ctx.fillText('Friend', pal.x, pal.y - 22 - pal.z * 0.5);
        }
        drawOver();
        gantry();
        if (MAP.over) MAP.over();
        if (MAP.screen) MAP.screen();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var mc = youCol(), bob = api.reducedMotion ? 0 : Math.sin(clock * 5) * 2.5;
        marker((me.x * k - ox) / dpr, (me.y * k - oy) / dpr - (14 + Math.max(0, me.z) * 0.6) * zoom + bob, split ? (me === karts[0] ? 'P1' : 'P2') : 'YOU', mc);
        if (offWarn(me) > 0) turnBack((me.x * k - ox) / dpr, (me.y * k - oy) / dpr, Math.atan2(me.py - me.y, me.px - me.x));
        var mw = WW * mmK, mh = WH * mmK, mx = W - mw - 10, my = 10;  /* minimap, top right */
        ctx.fillStyle = MAP.col.panel; rrect(mx - 6, my - 6, mw + 12, mh + 12, 12); ctx.fill();
        ctx.drawImage(mini, mx, my, mw, mh);
        for (i = 3; i >= 0; i--) {
            var c = karts[i];
            if (c === me) continue;
            ctx.beginPath(); ctx.arc(mx + c.x * mmK, my + c.y * mmK, c === pal ? 4 : 3.5, 0, 7);
            ctx.fillStyle = split && c === pal ? (c === karts[0] ? '#d6336c' : '#1e3a8a') : kartCol(c); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        var px = mx + me.x * mmK, py = my + me.y * mmK;  /* you: on top, bigger, in your marker's colour, with a pulsing ring */
        ctx.beginPath(); ctx.arc(px, py, 7.5 + bob * 0.6, 0, 7); ctx.strokeStyle = mc; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fillStyle = mc; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
    function turnBack(x, y, ang) {  /* too far off the road: "Turn back!" and a flashing arrow from the kart to the road */
        var on = api.reducedMotion || Math.floor(clock * 6) % 2 === 0;
        ctx.save(); ctx.translate(x + Math.cos(ang) * 40, y + Math.sin(ang) * 40); ctx.rotate(ang);
        ctx.globalAlpha = on ? 1 : 0.35;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-2, -13); ctx.lineTo(-2, -6); ctx.lineTo(-14, -6); ctx.lineTo(-14, 6); ctx.lineTo(-2, 6); ctx.lineTo(-2, 13); ctx.closePath();
        ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill();
        ctx.restore();
        ctx.font = '800 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var w = ctx.measureText('Turn back!').width + 28, ty = Math.round(H * 0.3);
        ctx.fillStyle = on ? '#d6336c' : '#a61e4d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; rrect(W / 2 - w / 2, ty - 18, w, 36, 18); ctx.stroke(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText('Turn back!', W / 2, ty + 1);
        ctx.textBaseline = 'alphabetic';
    }
    function youCol() { return split && me === karts[1] ? '#1e3a8a' : '#d6336c'; }  /* split screen: player 2 is blue */
    function marker(x, y, text, col) {  /* the player's own kart: a bobbing label with a pointer, in screen pixels, over everything */
        ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var w = Math.ceil(ctx.measureText(text).width) + 14, h = 17;
        ctx.fillStyle = 'rgba(15,23,42,.25)'; rrect(x - w / 2 + 1, y - 26 + 2, w, h, 8.5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 6, y - 10); ctx.lineTo(x, y - 2); ctx.lineTo(x + 6, y - 10); ctx.closePath();
        ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill();
        rrect(x - w / 2, y - 26, w, h, 8.5); ctx.stroke(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(text, x, y - 17.2);
        ctx.textBaseline = 'alphabetic';
    }
    function setText(el, key, v) { if (shown[key] !== v) { shown[key] = v; el.textContent = v; } }
    function show() {
        setText(posEl, 'pos', ordinal(place));
        setText(lapEl, 'lap', Math.min(LAPS, laps(me) + 1) + '/' + LAPS);
        var t = (me.fin || raceTime).toFixed(1);
        if (shown.time !== t) { setText(timeEl, 'time', t); api.score(t, 'Time'); }
    }
    function count(text, cls) {
        if (shown.count === text) return;
        shown.count = text;
        countEl.textContent = text;
        countEl.className = 'kk-count' + (cls ? ' ' + cls : '');
        if (text && !api.reducedMotion) { void countEl.offsetWidth; countEl.classList.add('kk-pop'); }
    }

