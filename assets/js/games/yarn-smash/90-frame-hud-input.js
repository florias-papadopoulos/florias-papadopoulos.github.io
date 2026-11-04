    /* ---------- the frame ---------- */
    function drawItem(e) {
        ctx.globalAlpha = 1;
        if (!e.type) { FA = fogf(e.z - camZ) * 0.88; PROP[e.kind](e, fade(e.z - camZ)); FA = 0; ctx.globalAlpha = 1; return; }
        var t = e.type;
        if (t === 'glass') drawGlass(e);
        else if (t === 'frame') drawFrame(e);
        else if (t === 'portal') drawPortal(e);
        else if (t === 'door') drawDoor(e);
        else if (t === 'vase') drawVase(e);
        else if (t === 'ball') drawBall(e);
        else if (t === 'lamp') drawLamp(e);
        else if (t === 'mirror') drawMirror(e);
        else if (t === 'guard') { if (guard) drawGuard(); }
        else if (t === 'bubble') { if (!e.broken) drawBubble(e); }
        else if (t === 'critter') { if (!e.broken) drawCritter(e); }
        else if (t === 'shot') { if (!e.broken) drawShot(e); }
        else if (!e.broken) { if (t === 'crystal') drawCrystal(e); else if (t === 'dot') drawDot(e); else if (t === 'power') drawPower(e); }
        ctx.globalAlpha = 1;
    }
    var drawList = [];
    function drawWorld() {
        buildStrips();
        var list = drawList, j = 0, n = bz.length, i;
        list.length = 0;
        for (i = 0; i < ents.length; i++) list.push(ents[i]);
        for (i = 0; i < props.length; i++) list.push(props[i]);
        for (i = 0; i < flying.length; i++) list.push(flying[i]);
        if (guard) { guardPos(clock); GUARDITEM.z = GZ; list.push(GUARDITEM); }
        list.sort(function (a, b) { return b.z - a.z; });
        while (j < list.length && list[j].z > camZ + FAR + 2) j++;
        while (j < list.length && list[j].z >= bz[n - 1]) drawItem(list[j++]);
        for (i = n - 2; i >= 0; i--) {
            var zn = bz[i], zf = bz[i + 1], Z = zoneOf((zn + zf) / 2);
            setStrip(zn, zf, Z);
            Z.strip(zn, zf);
            while (j < list.length && list[j].z >= zn) drawItem(list[j++]);
            if (Z.front) { setStrip(zn, zf, Z); Z.front(zn); ctx.globalAlpha = 1; }
        }
        while (j < list.length) drawItem(list[j++]);
    }
    function drawParts() {
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p.z - camZ < 0.8 || !P(p.x, p.y, p.z)) continue;
            var s = Math.min(p.s * pk, 24);
            if (s < 0.6) continue;
            var a = Math.min(1, p.life / (p.max * 0.5)) * fade(p.z - camZ);
            ctx.fillStyle = p.solid || (p.c + (0.85 * a).toFixed(2) + ')');
            ctx.globalAlpha = p.solid ? a : 1;
            ctx.beginPath();
            ctx.moveTo(px + Math.cos(p.r) * s, py + Math.sin(p.r) * s);
            ctx.lineTo(px + Math.cos(p.r + 2.3) * s * 0.7, py + Math.sin(p.r + 2.3) * s * 0.7);
            ctx.lineTo(px + Math.cos(p.r + 4.1) * s * 0.85, py + Math.sin(p.r + 4.1) * s * 0.85);
            ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    function drawMotes() {
        for (var i = 0; i < motes.length; i++) {
            var m = motes[i], dz = m.z - camZ;
            if (!PL(m.lx, m.y, m.z)) continue;
            var a = fade(dz) * (1 - 0.5 * fogf(dz)) * (m.k === 'spark' || m.k === 'star' ? 0.55 + 0.45 * Math.sin(clock * 3 + m.ph * 5) : 0.85);
            if (m.k === 'star') {  /* streaks: the stars rush past */
                var x0 = px, y0 = py, k = pk;
                if (!PL(m.lx, m.y, m.z + clamp(speed * 0.1, 0.3, 2.5))) continue;
                ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = clamp(0.035 * k, 0.8, 3);
                ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(px, py); ctx.stroke();
            } else halo(px, py, clamp(m.s * pk * 2.4, 1.2, 16), m.c, a);
        }
        ctx.globalAlpha = 1;
    }
    function drawPaw(x, y, r, lift) {  /* in the colours of the chosen cat look: tuxedo paws are black with white toes; a dog's have claws and dark pads */
        ctx.lineWidth = 2.5; ctx.strokeStyle = SK.line; ctx.fillStyle = SK.toe; ctx.lineJoin = 'round';
        if (lift <= 0.25 && SK.dog) {  /* four chunky toes, each with a small dark claw */
            for (var d = 0; d < 4; d++) {
                var tx = x + (d - 1.5) * r * 0.42, ty = y - r * (d === 0 || d === 3 ? 0.5 : 0.66);
                ctx.fillStyle = SK.nose; ctx.beginPath(); ctx.ellipse(tx, ty - r * 0.3, r * 0.07, r * 0.12, (d - 1.5) * 0.25, 0, TAU); ctx.fill();
                ctx.fillStyle = SK.toe; ctx.beginPath(); ctx.arc(tx, ty, r * 0.27, 0, TAU); ctx.fill(); ctx.stroke();
            }
        } else if (lift <= 0.25) for (var t = 0; t < 3; t++) { ctx.beginPath(); ctx.arc(x + (t - 1) * r * 0.5, y - r * (t === 1 ? 0.68 : 0.58), r * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = SK.fur;
        ctx.beginPath(); ctx.moveTo(x - r * 0.72, H + 4); ctx.lineTo(x - r * 0.72, y + r * 0.55);
        ctx.quadraticCurveTo(x - r, y + r * 0.35, x - r, y);
        ctx.ellipse(x, y, r, r * 0.82, 0, Math.PI, TAU);
        ctx.quadraticCurveTo(x + r, y + r * 0.35, x + r * 0.72, y + r * 0.55); ctx.lineTo(x + r * 0.72, H + 4); ctx.closePath();
        ctx.fill(); ctx.stroke();
        var hg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.1);
        hg.addColorStop(0, SK.light); hg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.45; ctx.fillStyle = hg; ctx.fill(); ctx.globalAlpha = 1;
        if (!SK.dog) {  /* a dog has no stripes */
            ctx.strokeStyle = SK.stripe; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.6); ctx.quadraticCurveTo(x, y + r * 0.45, x + r * 0.5, y + r * 0.6);
            ctx.moveTo(x - r * 0.45, y + r * 1.05); ctx.quadraticCurveTo(x, y + r * 0.9, x + r * 0.45, y + r * 1.05); ctx.stroke();
        }
        if (lift > 0.25) {
            ctx.fillStyle = SK.dog ? '#4a3a38' : BEAN;
            ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.36, r * 0.28, 0, 0, TAU); ctx.fill();
            for (t = 0; t < 4; t++) { ctx.beginPath(); ctx.arc(x + (t - 1.5) * r * 0.36, y - r * (t === 0 || t === 3 ? 0.3 : 0.48), r * 0.13, 0, TAU); ctx.fill(); }
        }
    }

    /* ---------- the HUD: everything in a slim band at the top, nothing over the play area ---------- */
    var HUDBG = 'rgba(20,14,42,.6)';
    function pill(x, y, w, h, fill) { ctx.fillStyle = fill || HUDBG; rrect(x, y, w, h, h / 2); ctx.fill(); }
    function centrePill(text, sub, y, col, a, big) {
        ctx.globalAlpha = a;
        ctx.font = '800 ' + (big ? (W < 520 ? 17 : 19) : 13.5) + 'px ' + FONT;
        var tw = ctx.measureText(text).width, sw = 0;
        if (sub) { ctx.font = '700 12px ' + FONT; sw = ctx.measureText(sub).width; }
        var w = Math.min(W - 16, Math.max(tw, sw) + 30), h = sub ? 46 : 28;
        pill(CX - w / 2, y, w, h, 'rgba(20,14,42,.66)');
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '800 ' + (big ? (W < 520 ? 17 : 19) : 13.5) + 'px ' + FONT; ctx.fillStyle = col;
        ctx.fillText(text, CX, y + (sub ? 16 : h / 2 + 1));
        if (sub) { ctx.font = '700 12px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fillText(sub, CX, y + 34); }
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    function timerPill(x, y, label, frac, col) {
        ctx.font = '800 13px ' + FONT;
        var w = ctx.measureText(label).width + 22;
        pill(x, y, w, 32);
        ctx.fillStyle = col; ctx.fillText(label, x + 11, y + 14);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 11, y + 23, w - 22, 3);
        ctx.fillStyle = col; ctx.fillRect(x + 11, y + 23, (w - 22) * clamp(frac, 0, 1), 3);
        return w + 6;
    }
    function drawHud() {
        var y = 8, h = 32, x = 8;
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        ctx.font = '800 17px ' + FONT;
        var txt = String(balls), low = balls <= 3, w = ctx.measureText(txt).width + 46;
        pill(x, y, w, h, low && (RM || Math.sin(rt * 8) > 0) ? 'rgba(190,30,70,.8)' : null);
        wool(x + 17, y + h / 2, 9.5, 0, bigT > 0 ? 'violet' : 'pink');
        ctx.fillStyle = low ? '#ffd0d8' : '#ffffff'; ctx.fillText(txt, x + 32, y + h / 2 + 1);
        if (yarnTick.t < 1.2 && yarnTick.n) {  /* +3 or -3 under the yarn counter */
            ctx.globalAlpha = clamp((1.2 - yarnTick.t) / 0.4, 0, 1);
            ctx.font = '900 14px ' + FONT; ctx.fillStyle = yarnTick.n > 0 ? '#86f7b6' : '#ff8a9c';
            ctx.strokeStyle = 'rgba(20,14,42,.7)'; ctx.lineWidth = 3;
            var tick = (yarnTick.n > 0 ? '+' : '') + yarnTick.n + (!SK.dog ? ' yarn' : Math.abs(yarnTick.n) === 1 ? ' ball' : ' balls'), ty = y + h + 12 - Math.min(0.3, yarnTick.t) * 10;
            ctx.strokeText(tick, x + 6, ty); ctx.fillText(tick, x + 6, ty);
            ctx.globalAlpha = 1;
        }
        x += w + 6;
        ctx.font = '800 14px ' + FONT;
        if (multi > 1 || streak > 1) {
            var t2 = multi > 1 ? 'x' + multi + yt(' yarn') : 'Streak ' + streak, w2 = ctx.measureText(t2).width + 24;
            pill(x, y, w2, h, multi > 1 ? 'rgba(214,51,108,.9)' : null);
            ctx.fillStyle = multi > 1 ? '#ffffff' : '#d8d2f0'; ctx.fillText(t2, x + 12, y + h / 2 + 1);
            x += w2 + 6;
        }
        if (bigT > 0) x += timerPill(x, y, 'Giant', bigT / 7, '#d9b8ff');
        if (slowT > 0) x += timerPill(x, y, 'Slow', slowT / 5, '#a8d8ff');
        if (zoomT > 0) x += timerPill(x, y, 'Zoomies', zoomT / 4, '#ffd166');
        if (magT > 0) x += timerPill(x, y, 'Magnet', magT / 6, '#9ff5c4');
        if (ricoT > 0) x += timerPill(x, y, 'Ricochet', ricoT / 8, '#ffe08a');
        var Z = ZONES[curZi % NZ], prog = clamp((camZ - curZi * ZL) / ZL, 0, 1);  /* the world and how far to the next gate */
        ctx.font = '800 13px ' + FONT;
        var zt = Z.name, zw = ctx.measureText(zt).width + 24;
        if (W - zw - 8 > x + 4) {
            pill(W - zw - 8, y, zw, h);
            ctx.fillStyle = Z.accent; ctx.fillText(zt, W - zw + 4, y + 13);
            ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(W - zw + 4, y + 22, zw - 24, 3);
            ctx.fillStyle = Z.accent; ctx.fillRect(W - zw + 4, y + 22, (zw - 24) * prog, 3);
        }
        if (ptsTick.t < 1 && ptsTick.n) {  /* points, small, top right under the world chip */
            ctx.globalAlpha = clamp((1 - ptsTick.t) / 0.35, 0, 1);
            ctx.font = '800 13px ' + FONT; ctx.textAlign = 'right'; ctx.fillStyle = '#fff3c4';
            ctx.strokeStyle = 'rgba(20,14,42,.7)'; ctx.lineWidth = 3;
            ctx.strokeText('+' + ptsTick.n, W - 14, y + h + 12); ctx.fillText('+' + ptsTick.n, W - 14, y + h + 12);
            ctx.textAlign = 'left'; ctx.globalAlpha = 1;
        }
        var y2 = y + h + 6;  /* the second row: world banner, then short messages, then the how-to */
        if (banner.t < banner.dur) {
            var bt = banner.t, a = Math.min(1, bt / 0.3, (banner.dur - bt) / 0.6), Zb = ZONES[banner.zi % NZ], lap = Math.floor(banner.zi / NZ);
            var sub = banner.zi === 0 ? yt(api.touch ? 'Tap to throw yarn at the glass' : 'Click or press Space to throw yarn at the glass') : (lap ? 'Lap ' + (lap + 1) + ': faster now, same tricks' : Zb.sub);
            centrePill((lap ? '' : 'World ' + (banner.zi % NZ + 1) + ': ') + Zb.name, sub, y2, Zb.accent, a, true);
        } else if (toast.t < 1.8 && toast.text) {
            centrePill(toast.text, '', y2, toast.c, Math.min(1, toast.t / 0.15, (1.8 - toast.t) / 0.4));
        } else if (!thrown && phase === 'play') {
            centrePill(yt(api.touch ? 'Tap to throw yarn' : 'Click or press Space to throw yarn'), '', y2, '#ffffff', RM ? 0.9 : 0.75 + 0.25 * Math.sin(rt * 3));
        }
    }
    function drawOverlay() {
        if (!vignette) {
            vignette = document.createElement('canvas');
            vignette.width = Math.ceil(W); vignette.height = Math.ceil(H);
            var g = vignette.getContext('2d'), R = Math.max(W, H);
            var gr = g.createRadialGradient(CX, H * 0.48, R * 0.3, CX, H * 0.48, R * 0.85);
            gr.addColorStop(0, 'rgba(10,6,26,0)'); gr.addColorStop(1, 'rgba(10,6,26,.42)');
            g.fillStyle = gr; g.fillRect(0, 0, W, H);
            var tg = g.createLinearGradient(0, 0, 0, 70);
            tg.addColorStop(0, 'rgba(10,6,26,.32)'); tg.addColorStop(1, 'rgba(10,6,26,0)');
            g.fillStyle = tg; g.fillRect(0, 0, W, 70);
        }
        ctx.drawImage(vignette, 0, 0, W, H);
        if (slowT > 0) { ctx.fillStyle = 'rgba(120,170,255,' + (0.12 * Math.min(1, slowT)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
        if (bigT > 0) { ctx.fillStyle = 'rgba(190,140,255,' + (0.06 * Math.min(1, bigT)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
        if (boltT > 0) { ctx.fillStyle = 'rgba(235,245,255,' + (boltT * 1.2).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
        if (flash > 0) { ctx.fillStyle = 'rgba(255,150,170,' + (flash * 0.3).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    }
    function draw() {
        var ox = shake ? (Math.random() - 0.5) * shake : 0, oy = shake ? (Math.random() - 0.5) * shake : 0, i;
        ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        drawSky();
        drawWorld();
        drawParts();
        drawMotes();
        for (i = 0; i < pops.length; i++) {  /* rings of light where things break */
            var pp = pops[i];
            if (!P(pp.x, pp.y, pp.z)) continue;
            var u = pp.t / 0.32;
            ctx.globalAlpha = (1 - u) * 0.9; ctx.strokeStyle = rgba(pp.c); ctx.lineWidth = Math.max(1.5, 0.05 * pk * pp.s);
            ctx.beginPath(); ctx.arc(px, py, (0.12 + u * 0.55) * pk * pp.s, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < rings.length; i++) {
            var rg = rings[i];
            ctx.strokeStyle = 'rgba(255,120,170,' + (1 - rg.t / 0.35).toFixed(2) + ')'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(rg.x, rg.y, 6 + rg.t * 50, 0, TAU); ctx.stroke();
        }
        if (zoomT > 0 && !RM) {
            ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath();
            for (i = 0; i < 14; i++) {
                var an = Math.random() * TAU, r0 = rnd(0.3, 0.48) * Math.max(W, H), r1 = r0 + rnd(30, 90);
                ctx.moveTo(CX + Math.cos(an) * r0, HOR + Math.sin(an) * r0); ctx.lineTo(CX + Math.cos(an) * r1, HOR + Math.sin(an) * r1);
            }
            ctx.stroke();
        }
        var bob = RM ? 0 : Math.sin(runPh) * PAW * 0.08 * Math.min(1, speed / 4), wind = charge.v * PAW * 0.45;
        if (!(graceT > 0 && !RM && Math.sin(rt * 50) > 0.4)) {  /* just bumped: the paws flicker while nothing can hurt */
            drawPaw(W * 0.24, H - PAW * 0.3 - paws[0] * PAW * 1.1 + bob + wind, PAW, paws[0]);
            drawPaw(W * 0.76, H - PAW * 0.3 - paws[1] * PAW * 1.1 - bob + wind, PAW, paws[1]);
        }
        if (freezeT > 0) {  /* a frozen paw: a cap of ice on the left paw */
            var fx = W * 0.24, fy = H - PAW * 0.3 - paws[0] * PAW * 1.1 + bob + wind;
            ctx.globalAlpha = Math.min(1, freezeT) * 0.75; ctx.fillStyle = 'rgba(190,235,255,.85)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(fx, fy - PAW * 0.1, PAW * 1.05, PAW * 0.95, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (charge.id !== null && rt - charge.t0 > 0.22) {  /* the charge, a thin bar at the very bottom between the paws */
            var bw = Math.min(150, W * 0.3), bx0 = CX - bw / 2, by0 = H - 12, full = charge.v >= 1;
            ctx.fillStyle = 'rgba(20,14,42,.55)'; rrect(bx0 - 3, by0 - 3, bw + 6, 9, 4.5); ctx.fill();
            ctx.fillStyle = full ? '#ffd25c' : '#ffb3cf'; rrect(bx0, by0, Math.max(3, bw * charge.v), 3, 1.5); ctx.fill();
            if (full) { halo(CX, by0 + 1, 22, [255, 210, 90], RM ? 0.6 : 0.45 + 0.25 * Math.sin(rt * 10)); ctx.globalAlpha = 1; wool(CX, by0 - 12, 7, 0, 'gold'); }
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawOverlay();
        drawHud();
    }

    api.loop(function (dt) { update(Math.min(dt, 0.05)); draw(); });

    /* ---------- input: tap or click to throw, Space throws straight ahead ---------- */
    /* a tap throws when the finger lifts; holding charges a heavy ball (2 yarn) that goes straight through tough glass */
    function release(heavyOk) {
        var heavy = heavyOk && charge.v >= 1 && balls >= 2, x = charge.x, y = charge.y;
        charge.id = null; charge.v = 0; charge.key = false;
        throwAt(x, y, heavy);
    }
    function local(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    api.on(cv, 'pointerdown', function (e) {
        e.preventDefault();
        var p = local(e);
        if (charge.id !== null) { throwAt(p[0], p[1]); return; }  /* a second finger: a plain throw */
        charge.id = e.pointerId; charge.x = p[0]; charge.y = p[1]; charge.t0 = rt; charge.v = 0;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
    });
    api.on(cv, 'pointermove', function (e) { if (e.pointerId === charge.id) { var p = local(e); charge.x = p[0]; charge.y = p[1]; } });
    api.on(cv, 'pointerup', function (e) { if (e.pointerId === charge.id) { var p = local(e); charge.x = p[0]; charge.y = p[1]; release(true); } });
    api.on(cv, 'pointercancel', function (e) { if (e.pointerId === charge.id) { charge.id = null; charge.v = 0; } });
    api.on(cv, 'contextmenu', function (e) { e.preventDefault(); });
    api.on(window, 'keydown', function (e) {
        if (e.key !== ' ' && e.code !== 'Space') return;
        e.preventDefault();
        if (!e.repeat && charge.id === null) { charge.id = 'key'; charge.key = true; charge.x = CX; charge.y = HOR; charge.t0 = rt; charge.v = 0; }
    });
    api.on(window, 'keyup', function (e) {
        if ((e.key === ' ' || e.code === 'Space') && charge.id === 'key') { e.preventDefault(); release(true); }
    });

    fit(api.size());
    api.onResize(fit);
    readSkin();
    camX = cx(0); camS = (cx(1) - cx(-1)) / 2; camHY = hy(0); camT = (hy(5) - camHY) / 5; HOR = HY + camT * F;
    env(0);
    prepWorld(0);
    spawn();
    for (var mi = 0; mi < NMOTE; mi++) { motes.push({}); moteInit(motes[mi], false); }
});
