    /* ---------- gate challenges, mirrors, ricochets, crystal hearts, magnets, bubbles ---------- */
    var locks = [];
    function lockHit(ls) {
        if (ls.done) return;
        if (ls.t < 0) ls.t = clock;
        if (!ls.panels.every(function (p) { return p.broken; })) return;
        ls.done = true;
        ls.gate.panels.forEach(function (p) { if (!p.broken) breakGlass(p, 1); });
        addYarn(3); points(80);
        say('Gate unlocked! +3 yarn', '#ffe08a'); chat('Open sesame!', 'wow', true); api.sfx('win');
    }
    function stepLocks() {
        for (var i = locks.length - 1; i >= 0; i--) {
            var ls = locks[i];
            if (ls.z < camZ) { locks.splice(i, 1); continue; }
            if (ls.t >= 0 && !ls.done && clock - ls.t > 2) {  /* too slow: the small panes grow back */
                ls.t = -1;
                ls.panels.forEach(function (p) { if (p.broken) { p.broken = false; p.crack = null; } });
                if (!tips.lockslow) { tips.lockslow = true; say('Too slow: all three within 2 s', '#cbd5e1'); }
                api.sfx('move');
            }
        }
    }
    function mirrorTest(b, az) {  /* a missed ball hitting an ice mirror bounces back once, onto the glass in front */
        if (b.bounced) return false;
        for (var i = 0; i < ents.length; i++) {
            var e = ents[i];
            if (e.type !== 'mirror' || !(az < e.z && b.z >= e.z)) continue;
            var a = Math.abs(b.x - cx(e.z)), y = b.y;
            if (!((a > e.hw + 0.05 && a < e.hw + 1.7 && y > 0 && y < 3.2) || (a < e.hw + 1.7 && y > 2.55 && y < 3.6))) continue;
            b.bounced = true; b.z = e.z - 0.02;
            var tg = b.ce && b.ce.type === 'glass' && !b.ce.broken && b.ce.g === e.g ? b.ce : null;
            if (!tg) e.g.panels.forEach(function (p) { if (!tg && !p.broken) tg = p; });
            if (tg) {
                pstate(tg, clock + 0.3);
                var T = 0.3, tx = QX, ty = (tg.y0 + tg.y1) / 2 + QY;
                b.vx = (tx - b.x) / T; b.vz = (tg.z - b.z) / T; b.vy = (ty - b.y) / T + 0.5 * G * T; b.ce = tg;
            } else { b.vz = -Math.abs(b.vz) * 0.5; b.vx *= -0.5; }
            popAt(b.x, b.y, e.z, [210, 245, 255], 0.9); e.flash = 0.35; api.sfx('move');
            if (!tips.mirrorhit) { tips.mirrorhit = true; say('Mirror bounce!', '#bff0ff'); }
            return true;
        }
        return false;
    }
    function ricochet(b, e, hx, hy, hz) {  /* the ball flies on to the next pane behind */
        var best = null, bd = 1e9;
        ents.forEach(function (o) {
            if (o.type !== 'glass' || o.broken || o === e || o.z < hz + 0.5 || o.z > hz + 18 || o.lockSet) return;
            pstate(o, clock);
            var d = o.z - hz + Math.abs(QX - hx) * 2;
            if (d < bd) { bd = d; best = o; }
        });
        if (!best) return;
        var T = Math.max(0.2, (best.z - hz) / 20);
        pstate(best, clock + T);
        b.x = hx; b.y = hy; b.z = hz + 0.05;
        b.vx = (QX - hx) / T; b.vz = (best.z - b.z) / T; b.vy = ((best.y0 + best.y1) / 2 + QY - hy) / T + 0.5 * G * T;
        b.rico--; b.again = true; b.ce = best;
        popAt(hx, hy, hz, [255, 214, 110], 1.1);
    }
    function releaseHeart(e) {  /* the crystal inside flies to the cat */
        pstate(e, clock);
        ents.push({ type: 'crystal', z: e.z + 0.2, lx: QX - cx(e.z), y: (e.y0 + e.y1) / 2 + QY - 0.2, ph: 0, gift: true });
        popAt(QX, (e.y0 + e.y1) / 2 + QY, e.z, [140, 255, 190], 1.3);
    }
    function stepHoming(dt) {  /* crystal hearts and, with the magnet, nearby crystals fly into the cat's paws */
        for (var i = 0; i < ents.length; i++) {
            var e = ents[i], dz = e.z - camZ;
            if (e.type !== 'crystal' || e.broken || !(e.gift || (magT > 0 && dz < 24))) continue;
            var k = Math.min(1, dt * 4);
            e.lx += (0 - e.lx) * k; e.y += (EYE - 0.3 - e.y) * k; e.z -= dt * 10;
            if (e.z - camZ < 1.3) {
                e.broken = true; addYarn(e.gift ? 2 : 3); points(10); api.sfx('point');
                popAt(cx(e.z) + e.lx, e.y, camZ + 1.4, [140, 255, 190], 0.6);
            }
        }
    }
    function stepBubbles() {
        for (var i = 0; i < ents.length; i++) {
            var e = ents[i];
            if (e.type !== 'bubble') continue;
            var dz = e.z - camZ;
            if (e.t0 < 0 && dz < e.trig) e.t0 = clock;
            if (e.broken) continue;
            pos(e, clock);
            if (SY > 14) { e.broken = true; continue; }
            if (!e.passed && dz < 0.45) {
                e.passed = true;
                if (SY - SR < 1.45 && Math.abs(camX - SX) < SR + 0.15 && phase === 'play') {
                    e.broken = true; burst(SX, SY, SZ + 0.6, 0.4, 12, ['rgba(255,200,240,', 'rgba(200,240,255,', 'rgba(255,255,255,'], 1);
                    crash('bubble');
                }
            }
        }
    }
    function endText(score) {
        var Z = ZONES[curZi % NZ], acc = throwsN ? Math.round(100 * hitsN / throwsN) : 0;
        return yt('Out of yarn!') + '\n' + Math.floor(camZ) + ' m run, world ' + (curZi % NZ + 1) + ': ' + Z.name + (curZi >= NZ ? ', lap ' + (Math.floor(curZi / NZ) + 1) : '') +
               '\n' + acc + '% hits, best combo ' + bestStreak;
    }

    /* ---------- motes: drifting petals, spores, sparks, snow, embers or stars, depending on the world ---------- */
    var MOTE = { petal: [255, 206, 222], spore: [110, 255, 222], spore2: [222, 140, 255], spark: [226, 200, 255], snow: [255, 255, 255], ember: [255, 186, 90], star: [255, 255, 255], fluff: [255, 214, 240], fluff2: [200, 236, 255] };
    function moteInit(m, far) {
        m.z = camZ + (far ? rnd(FAR - 12, FAR) : rnd(3, FAR));
        var Z = zoneOf(m.z);
        m.k = Z.mote;
        m.lx = rnd(-1, 1) * (m.k === 'star' ? 9 : m.k === 'spark' ? 2.3 : 5.5);
        m.y = m.k === 'star' ? rnd(-5, 7) : rnd(0.2, m.k === 'spark' ? 3.1 : 5.5);
        m.ph = rnd(0, 6); m.s = rnd(0.03, 0.07);
        m.c = m.k === 'spore' && Math.random() < 0.4 ? MOTE.spore2 : m.k === 'fluff' && Math.random() < 0.5 ? MOTE.fluff2 : MOTE[m.k];
    }
    function stepMotes(dt) {
        for (var i = 0; i < motes.length; i++) {
            var m = motes[i], sw = Math.sin(clock * 0.8 + m.ph);
            if (m.k === 'petal') { m.y -= 0.35 * dt; m.lx += sw * 0.5 * dt; }
            else if (m.k === 'spore' || m.k === 'ember' || m.k === 'fluff') { m.y += (m.k === 'ember' ? 0.55 : 0.3) * dt; m.lx += sw * 0.25 * dt; }
            else if (m.k === 'snow') { m.y -= 0.75 * dt; m.lx += sw * 0.35 * dt; }
            if (m.z < camZ + 0.8 || m.y < -8 || m.y > 9) moteInit(m, true);
        }
    }

    /* ---------- the loop ---------- */
    var rt = 0, prepQ = [];
    function update(rdt) {
        rt += rdt;
        if (slowT > 0) slowT -= rdt;
        if (bigT > 0) bigT -= rdt;
        if (magT > 0) magT -= rdt;
        if (boltT > 0) boltT -= rdt;
        if (freezeT > 0) freezeT -= rdt;
        if (graceT > 0) graceT -= rdt;
        if (ricoT > 0) ricoT -= rdt;
        if (rt - skinT > 1) { skinT = rt; readSkin(); }
        if (charge.id !== null) charge.v = clamp((rt - charge.t0 - 0.22) / 0.6, 0, 1);
        var dt = rdt * (slowT > 0 ? 0.5 : 1);
        clock += dt;
        if (phase === 'play') playT += dt;
        stumble += (1 - stumble) * Math.min(1, dt * 1.6);
        if (zoomT > 0) zoomT -= dt;
        var lap = Math.floor(zoneIdx(camZ) / NZ);
        var base = playT < 25 ? 4.1 + playT * 0.036 : Math.min(12, 5.0 + (playT - 25) * 0.07);  /* a friendly start, then faster and faster */
        var want = phase === 'play' ? (base + lap * 1.2) * stumble * (zoomT > 0 ? 1.6 : 1) : 0;
        speed += (want - speed) * Math.min(1, dt * (phase === 'play' ? 4 : 1.5));
        camZ += speed * dt;
        camX = cx(camZ); camS = (cx(camZ + 1) - cx(camZ - 1)) / 2;
        camHY = hy(camZ); camT = (hy(camZ + 5) - camHY) / 5; HOR = HY + camT * F;
        runPh += speed * dt * 1.6;
        env(camZ);
        var zi = zoneIdx(camZ), u = camZ - zi * ZL;
        var fu = u, vis = FAR;  /* behind the waterfall the view closes in */
        if (ZONES[zi % NZ].key === 'isles') vis = FAR - (FAR - 18) * Math.min(smooth((fu - 34) / 14), smooth((112 - fu) / 8));
        VISF = vis;
        if (zi !== curZi) {
            curZi = zi;
            banner.zi = zi; banner.t = 0; banner.dur = zi ? 2.6 : 4.4;
            if (zi > 0) { chat(SK.dog ? ZONES[zi % NZ].chat.replace('Mrrow', 'Awoo') : ZONES[zi % NZ].chat, 'wow', true); api.sfx('win'); }
        }
        if (u > 60 && prepZi !== zi) { prepZi = zi; prepWorld((zi + 1) % NZ, prepQ); }
        if (prepQ.length) prepQ.shift()();
        spawn();
        var i, e;
        for (i = 0; i < ents.length; i++) {
            e = ents[i];
            if (e.type === 'door' && e.open) e.a += (1.45 - e.a) * Math.min(1, dt * 7);
            if (e.type === 'door' && !e.passed && e.z - camZ < 0.45) {
                e.passed = true;
                if (!e.open && phase === 'play') { e.open = true; e.a = 1.45; crash('door'); }
            }
            if (e.tip && !tips[e.tip] && e.z - camZ < Math.min(30, VISF - 1) && e.z - camZ > 5 && toast.t > 2.2 && banner.t > banner.dur) { tips[e.tip] = true; say(TIPS[e.tip], '#ffffff'); }
        }
        for (i = 0; i < groups.length; i++) {
            var g = groups[i];
            if (g.passed || g.z - camZ > 0.45) continue;
            g.passed = true;
            var hurt = false;
            g.panels.forEach(function (p) { if (blocks(p)) { breakGlass(p, -1); hurt = true; } });
            if (hurt && phase === 'play') crash('glass');
        }
        for (i = ents.length - 1; i >= 0; i--) if (ents[i].z < camZ + 0.1) ents.splice(i, 1);
        for (i = groups.length - 1; i >= 0; i--) if (groups[i].passed && groups[i].z < camZ) groups.splice(i, 1);
        for (i = props.length - 1; i >= 0; i--) if (props[i].z < camZ + NEAR + 0.2) props.splice(i, 1);
        for (i = flying.length - 1; i >= 0; i--) if (!stepBall(flying[i], dt)) flying.splice(i, 1);
        for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i];
            q.vy -= G * 0.8 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.r += q.vr * dt; q.life -= dt;
            var fl = floorAt(q.x - cx(q.z), q.z);
            if (q.y < fl && q.y > fl - 0.5) { q.y = fl; q.vy *= -0.3; q.vx *= 0.6; q.vz *= 0.6; q.vr *= 0.5; }
            if (q.life <= 0 || q.z < camZ + NEAR) parts.splice(i, 1);
        }
        stepMotes(dt);
        if (!tips.charge && throwsN > 12 && toast.t > 2.2 && banner.t > banner.dur) { tips.charge = true; say(TIPS.charge, '#ffe08a'); }
        stepGuard(dt); stepLocks(); stepHoming(dt); stepBubbles(); stepCritters(); stepShots();
        for (i = 0; i < ents.length; i++) if (ents[i].flash) ents[i].flash = Math.max(0, ents[i].flash - rdt);
        for (i = rings.length - 1; i >= 0; i--) { rings[i].t += rdt; if (rings[i].t > 0.35) rings.splice(i, 1); }
        for (i = pops.length - 1; i >= 0; i--) { pops[i].t += rdt; if (pops[i].t > 0.32) pops.splice(i, 1); }
        paws[0] = Math.max(0, paws[0] - rdt * 4); paws[1] = Math.max(0, paws[1] - rdt * 4);
        shake = Math.max(0, shake - rdt * 40);
        flash = Math.max(0, flash - rdt * 2.5);
        banner.t += rdt; toast.t += rdt; yarnTick.t += rdt; ptsTick.t += rdt;
        var score = Math.floor(camZ) + bonus;
        if (score !== shownScore) { shownScore = score; api.score(score); }
        if (phase !== 'play') return;
        if (balls <= 3 && balls > 0 && !lowWarned) { lowWarned = true; chat('Low on yarn! Hit the green crystals.', 'think', true); }
        if (balls <= 0 && !flying.length) {
            phase = 'over';
            api.say(yt('Out of yarn. Nap time.'), 2400);
            var Z = ZONES[curZi % NZ];
            api.end({ score: score, win: false, text: endText(score) });
        }
    }

