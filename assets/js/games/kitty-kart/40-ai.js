    /* ---------- difficulty: Easy keeps the old simple driver; Normal and Hard race properly ---------- */
    var LEVEL = (window.__errors && window.__kkLevel) || api.level();  /* the override exists only on the test page */
    if (LEVEL !== 'easy' && LEVEL !== 'hard') LEVEL = 'normal';
    var PACE = { normal: [0.8, 0.79, 0.77], hard: [0.995, 0.985, 0.975] };
    var KIND = [null,  /* grey tabby: aggressive; black cat: consistent; white cat: item-happy */
        { cm: 1.04, dec: 1.1, alt: 1, gamble: 0.3, tins: 0.3, hold: 0.6, aim: 1, wob: 1 },
        { cm: 1, dec: 1, alt: 0.6, gamble: 0, tins: 0.3, hold: 1, aim: 1, wob: 0 },
        { cm: 0.97, dec: 0.95, alt: 0.6, gamble: 0.1, tins: 1, hold: 0.25, aim: 1.4, wob: 0.6 }];
    var CM = 0.9, DEC = 350;
    var PERFECT = { top: 1, cm: 1, dec: 1, alt: 1, gamble: 0, tins: 0.5, hold: 0.5, aim: 1, wob: 0 };
    function persona(i) {
        if (!i || LEVEL === 'easy') return null;
        var k = KIND[i], pace = PACE[LEVEL][i - 1], o = {};
        for (var key in k) o[key] = k[key];
        o.top = pace; o.cm = k.cm * pace * pace; o.dec = k.dec * pace;
        if (LEVEL === 'hard') o.wob = 0;
        return o;
    }
    function gripFactor() { return Math.min(1, (GRIP + 1.5) / 10.5); }
    function smart(c, P, f) {  /* racing line: aim at the inside of bends, brake as late as the bend allows */
        var look = Math.round((30 + Math.abs(c.vf) * 0.3) / SP), j = routeAt(c, look), i, ks = 0;
        for (i = look - 3; i <= look + 8; i++) ks += rK(routeAt(c, Math.max(1, i)));
        var hw = j < 0 ? ALT.hw : HW, lane = clamp(ks / 12 * 75, -0.6, 0.6) * hw;
        if (P.wob) lane += Math.sin(clock * 0.5 + c.phase) * 8 * P.wob;
        if (!c.on) lane = 0;
        else if (!c.item && j >= 0 && (P.tins > 0.5 || Math.abs(lane) < hw * 0.2)) lane = tinLane(c, lane);
        var ca = Math.cos(c.a), sa = Math.sin(c.a);
        for (i = 0; i < 4; i++) {  /* a slower kart just ahead: go round it on the side with more room */
            var o = karts[i], ox = o.x - c.x, oy = o.y - c.y, u = ox * ca + oy * sa, w = oy * ca - ox * sa;
            if (o === c || u < 0 || u > 75 || Math.abs(w) > 28 || o.vf > c.vf + 25 || Math.abs(o.z - c.z) > 8) continue;
            lane = clamp(lane + (w > 0 ? -1 : 1) * (34 - Math.abs(w)) * 1.4, -0.75 * hw, 0.75 * hw);
        }
        lane = narrow(c, j, lane);
        var tx = rX(j) - Math.sin(rA(j)) * lane, ty = rY(j) + Math.cos(rA(j)) * lane;
        c.steer = clamp(wrap(Math.atan2(ty - c.y, tx - c.x) - c.a) * 3, -1, 1);
        var cm = (test && test.cm ? test.cm : CM) * P.cm * f * gripFactor(), dec = (test && test.dec ? test.dec : DEC) * P.dec;
        var vt = VMAX * P.top * f * (c.alt && c.on ? ALT.vf : 1) * (c.boost > 0 ? 1.3 : 1) * (c.nap > 0 ? 0.55 : 1) * (c.sticky > 0 ? 0.5 : 1) * (MAP.aiSlow || 1);
        for (i = 1; i <= 44; i++) {
            var k = Math.abs(rK(routeAt(c, i))) + 1e-6, vc = TURN * cm / (k + 0.25 * TURN * cm / VMAX), v = Math.sqrt(vc * vc + 2 * dec * i * SP);
            if (v < vt) vt = v;
        }
        c.thr = c.vf < vt ? 1 : c.vf > vt + 12 ? -1 : 0;
        obey(c, c === me && test && test.rash);
    }
    function lead() { return pal && pal.prog > me.prog ? pal : me; }  /* the player the computer cats measure themselves by */
    function catchUp(c) {  /* only a little help when far behind; on Normal they ease off a touch when far ahead */
        var gap = lead().prog - c.prog;
        return 1 + clamp((gap - SEG * 3) / (SEG * 25), 0, LEVEL === 'hard' ? 0.03 : 0.04) - (LEVEL === 'normal' ? clamp((-gap - SEG * 8) / (SEG * 30), 0, 0.03) : 0);
    }
    function aiItemSmart(c, dt) {  /* Normal and Hard: hold items for the right moment */
        if (!c.item || phase !== 'race') return;
        c.itemT -= dt;
        if (c.itemT > 0) return;
        var it = c.item, P = c.P, go = false, i, o, rank = rankOf(c), late = c.itemT < -15, ca = Math.cos(c.a), sa = Math.sin(c.a);
        if (it === 'catnip') {  /* on a long straight or on the shortcut */
            go = true;
            for (i = 1; i < 30; i += 2) if (Math.abs(rK(routeAt(c, i))) > 0.003) { go = c.alt || late; break; }
        } else if (it === 'yarn') {  /* only when the target is close and right in line */
            for (i = 0; i < 4; i++) {
                o = karts[i];
                if (o === c || o.fin || o.shield > 0 || o.fall > 0 || Math.abs(o.z - c.z) > 8) continue;
                var dx = o.x - c.x, dy = o.y - c.y, u = dx * ca + dy * sa, w = dy * ca - dx * sa;
                if (u > 25 && u < 300 * P.aim && Math.abs(w) < 20 * P.aim) go = true;
            }
            go = go || late;
        } else if (it === 'box') {  /* when a yarn ball or a meteor is coming */
            for (i = 0; i < yarns.length; i++) {
                var y = yarns[i];
                if (y.owner !== c && Math.hypot(c.x - y.x, c.y - y.y) < 240 && (c.x - y.x) * y.vx + (c.y - y.y) * y.vy > 0) go = true;
            }
            if (MAP.met) MAP.met.forEach(function (m) { if (m.t > 0.5 && m.t < 1.5 && Math.hypot(c.x - m.x, c.y - m.y) < 110) go = true; });
            go = go || c.itemT < -20;
        } else if (it === 'milk') {  /* dropped on the racing line just ahead of a close follower */
            for (i = 0; i < 4; i++) { o = karts[i]; if (o !== c && !o.fin && c.prog - o.prog > 0 && c.prog - o.prog < SEG * 0.4 && Math.hypot(o.x - c.x, o.y - c.y) < 220) go = true; }
            go = go || late;
        } else go = rank > 1 || late;  /* laser and bell: only when someone is ahead */
        if (go) useItem(c);
    }
    function narrow(c, j, lane) {  /* stay in the middle of plank bridges */
        if (!MAP.bridge || c.alt || !(inBridge(c.idx) || (j >= 0 && inBridge(j)))) return lane;
        return clamp(lane, -MAP.bridge.hw * 0.3, MAP.bridge.hw * 0.3);
    }
    function tinLane(c, lane) {  /* steer for a fish tin ahead when holding nothing */
        var best = lane, bd = 1e9;
        for (var i = 0; i < tins.length; i++) {
            var t = tins[i], d = (t.idx - c.idx + N) % N;
            if (t.t > 0 || d < 3 || d > 30 || Math.abs(t.lat - lane) >= bd) continue;
            bd = Math.abs(t.lat - lane); best = t.lat;
        }
        return best;
    }
    function decide(c) {  /* the computer cats pick the shortcut sometimes, when the gate or their speed allows */
        if (!ALT) return;
        var s = (ALT.a - c.idx + N) % N, lap = laps(c);
        if (!c.alt && s > 8 && s < 36 && c.decided !== lap) {
            c.decided = lap;
            var rash = c === me && test && test.rash, ok = rash || !MAP.altGood || MAP.altGood(c), P = c.P;
            if (ok && ALT.gate) {  /* worth it when the gate will be open, sometimes they gamble and wait */
                var T = (s * SP + ALT.gate.i * ALT.step) / Math.max(c.vf, 150);
                ok = gateOpen(clock + T) > 0.6 && gateOpen(clock + T + 0.5) > 0.6 || Math.random() < (P ? P.gamble : 0.3) || (c === me && test && test.alt === 1 && !P);
            }
            c.useAlt = ok && Math.random() < (c === me && test && test.alt != null ? test.alt : P ? P.alt : c === me ? 0.5 : 0.45);
        } else if (c.useAlt && !c.alt && (c.idx - ALT.b + N) % N < 40) c.useAlt = false;
    }
    function inBridge(i) { return (i - MAP.bridge.i0 + N) % N <= MAP.bridge.i1 - MAP.bridge.i0; }
    function fallOff(c, j) {
        c.fall = 1.3; c.fallTo = j; c.vx = c.vy = 0; c.z = c.vz = 0; stat('fall');
        if (mine(c)) { sfx(c, 'hit'); mood(c, 'sad'); say(MAP.fallSay || 'Oops! Back you go.', c); }
    }
    function respawn(c) {  /* back on the road a little before where you fell, or where you left it (rescue) */
        var j = ix(c.fallTo - 4), b = c.back;
        if (b) { c.x = b.x; c.y = b.y; c.a = b.a; } else { c.x = X[j]; c.y = Y[j]; c.a = A[j]; }
        c.vx = c.vy = c.vf = c.z = c.vz = 0; c.useAlt = !!(b && b.alt); c.decided = laps(c); c.back = null; c.poof = 0;
        nearest(c); keep(c);
        if (b) for (var i = 0; i < 8; i++) puff('spark', c.x, c.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, 0.5, 2.6);
    }

