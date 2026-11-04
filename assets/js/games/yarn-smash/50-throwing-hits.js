    /* ---------- throwing: pick what is under the tap on screen (so the rolling road needs no special case), then lob ---------- */
    function claims(e) { var n = 0; for (var i = 0; i < flying.length; i++) if (flying[i].ce === e) n++; return n; }
    function inside(x, y, z) { return zoneOf(z).inside(x - cx(z), y, z); }
    var RX = 0, RY = 0, RZ = 0;
    function rayAt(dx, dyp, t) { RZ = camZ + t; RX = camX + (camS + dx) * t; RY = EYE + camHY - hy(RZ) + dyp * t; }
    function march(dx, dyp) {  /* distance along the tap ray to the first wall, floor or roof */
        var t = 0.6, prev = 0.6;
        while (t < FAR) {
            rayAt(dx, dyp, t);
            if (!inside(RX, RY, RZ)) {
                for (var i = 0; i < 6; i++) { var m = (prev + t) / 2; rayAt(dx, dyp, m); if (inside(RX, RY, RZ)) prev = m; else t = m; }
                return t;
            }
            prev = t; t += 0.25 + t * 0.07;
        }
        return FAR;
    }
    function paneQuad(e, t) {  /* the panel's corners on screen into QD: bottom left, top left, top right, bottom right */
        pstate(e, t);
        var ca = Math.cos(QA), sa = Math.sin(QA), w = e.w, y0 = e.y0 + QY, y1 = e.y1 + QY;
        var x0 = QX - w * ca, z0 = e.z - w * sa, x1 = QX + w * ca, z1 = e.z + w * sa;
        if (!P(x0, y0, z0)) return false;
        QD[0] = px; QD[1] = py; P(x0, y1, z0); QD[2] = px; QD[3] = py;
        if (!P(x1, y1, z1)) return false;
        QD[4] = px; QD[5] = py; P(x1, y0, z1); QD[6] = px; QD[7] = py;
        return true;
    }
    function paneHit(e, t, sx, sy) {  /* world point of the panel under the screen point at time t, or null */
        if (!paneQuad(e, t)) return null;
        function sideAt(s) {
            var bx = QD[0] + (QD[6] - QD[0]) * s, by = QD[1] + (QD[7] - QD[1]) * s, tx = QD[2] + (QD[4] - QD[2]) * s, ty = QD[3] + (QD[5] - QD[3]) * s;
            return (tx - bx) * (sy - by) - (ty - by) * (sx - bx);
        }
        var s0 = sideAt(0), s1 = sideAt(1);
        if (s0 * s1 > 0) return null;
        var lo = 0, hi = 1;
        for (var i = 0; i < 14; i++) { var m = (lo + hi) / 2; if (sideAt(m) * s0 > 0) lo = m; else hi = m; }
        var s = (lo + hi) / 2, bx = QD[0] + (QD[6] - QD[0]) * s, by = QD[1] + (QD[7] - QD[1]) * s, tx = QD[2] + (QD[4] - QD[2]) * s, ty = QD[3] + (QD[5] - QD[3]) * s;
        var L = (tx - bx) * (tx - bx) + (ty - by) * (ty - by), v = L > 0 ? ((sx - bx) * (tx - bx) + (sy - by) * (ty - by)) / L : -1;
        if (v < 0 || v > 1) return null;
        var u = (s * 2 - 1) * e.w, y = e.y0 + QY + v * (e.y1 - e.y0);
        if (e.arch && !inArch(QX - cx(e.z) + u, y)) return null;
        return [QX + u * Math.cos(QA), y, e.z + u * Math.sin(QA), u, v];
    }
    function aim(sx, sy) {
        var dx = (sx - CX) / F, dyp = (HOR - sy) / F, t = march(dx, dyp), best = null, bestD = t + 0.3, skipped = false, rr = api.touch ? 30 : 24;
        function consider(d, tg, e, need) {
            if (d >= bestD) return;
            bestD = d;
            if (e && claims(e) >= (need || 1)) { skipped = true; best = null; return; }
            best = tg;
        }
        function near(r) { return (px - sx) * (px - sx) + (py - sy) * (py - sy) < r * r; }
        ents.forEach(function (e) {
            var d;
            if (round(e)) {
                pos(e, clock);
                if (!P(SX, SY, SZ)) return;
                d = SZ - camZ;
                var cr = e.type === 'critter' || e.type === 'shot', hr = cr ? Math.max(SR * 1.9 * pk, rr + 8) : Math.max(SR * 1.3 * pk, rr);  /* small movers get a bigger tap area */
                var now = near(hr);
                pos(e, clock + flightT(SX - camX, SY - EYE + 0.45, d));  /* lead moving targets */
                var lead = P(SX, SY, SZ) && near(hr);
                if (now || lead) consider(d, [SX, SY, SZ, e], e.type === 'vase' || e.type === 'crystal' || e.type === 'bubble' || cr ? e : null);
                return;
            }
            if (e.type === 'glass' && !e.broken) {
                d = e.z - camZ;
                if (d < 0.6) return;
                var h = paneHit(e, clock, sx, sy);
                if (e.mv && e.mv.k !== 'pulse') {  /* moving glass: aim where it will be when the ball gets there */
                    var lt = clock + flightT(e.lx + cx(e.z) - camX, (e.y0 + e.y1) / 2 - EYE + 0.45, d), hl = paneHit(e, lt, sx, sy);
                    if (hl) h = hl;
                    else if (h) {
                        pstate(e, lt);
                        var cu = clamp(h[3], -e.w * 0.5, e.w * 0.5);
                        h = [QX + cu * Math.cos(QA), e.y0 + QY + h[4] * (e.y1 - e.y0), e.z + cu * Math.sin(QA)];
                    }
                }
                if (h) consider(d, [h[0], h[1], h[2], e], e, e.hp);
                return;
            }
            if (e.type === 'door') {
                d = e.z - camZ;
                if (d < 0.6) return;
                if (!e.open) { pos(e, clock); if (P(SX, SY, SZ) && near(Math.max(SR * 1.8 * pk, rr))) consider(d - 0.05, [SX, SY, SZ, e], e); }
                rayAt(dx, dyp, d);
                var lx = RX - cx(e.z);
                if ((!e.open || Math.abs(lx) > DW / 2 || RY > DH) && Math.abs(lx) < 4.3 && RY < 7.5) consider(d, [RX, RY, RZ], null);
            }
        });
        if (guard && guard.state === 'fight') {  /* the guardian drifts ahead: aim where it will be */
            var gh = guardPick(sx, sy, clock);  /* the panel point under the tap now, sent to where it will be when the ball arrives */
            if (gh && GZ - camZ < bestD) {
                var gd = GZ - camZ, gT = flightT(GX + gh[0] - camX, GY + gh[1] - EYE + 0.45, gd + speed * 0.6);
                gT = flightT(GX + gh[0] - camX, GY + gh[1] - EYE + 0.45, gd + speed * gT);
                guardPos(clock + gT);
                consider(gd, [GX + gh[0], GY + gh[1], GZ], null);
            }
        }
        if (!best && skipped) return null;  /* only something a ball is already flying to: no need to throw again */
        if (!best) {  /* nothing under the tap: snap to a round target or lever close to it */
            var bd = Math.pow(api.touch ? 48 : 40, 2);
            ents.forEach(function (e) {
                if (!round(e) && !(e.type === 'door' && !e.open)) return;
                if ((e.type === 'vase' || e.type === 'crystal' || e.type === 'door' || e.type === 'critter' || e.type === 'shot') && claims(e)) return;
                pos(e, clock);
                if (SZ - camZ < 1 || SZ - camZ > t + 1 || !P(SX, SY, SZ)) return;
                var q = (px - sx) * (px - sx) + (py - sy) * (py - sy);
                if (q >= bd) return;
                bd = q;
                if (e.type === 'lamp' || e.type === 'dot' || e.type === 'power' || e.type === 'critter' || e.type === 'shot') pos(e, clock + flightT(SX - camX, SY - EYE + 0.45, SZ - camZ));
                best = [SX, SY, SZ, e];
            });
        }
        if (best) return best;
        rayAt(dx, dyp, t);
        return [RX, RY, RZ];
    }
    function throwAt(sx, sy, heavy) {
        if (phase !== 'play' || balls < (heavy ? 2 : 1) || rt - lastThrow < (freezeT > 0 ? 0.5 : 0.1)) return;
        var tg = aim(sx, sy);
        rings.push({ x: sx, y: sy, t: 0 });
        if (!tg) return;
        lastThrow = rt;
        balls -= heavy ? 2 : 1;
        thrown = true; throwsN++;
        if (heavy) {
            var hb = launch(0.3 * (sx < CX ? -1 : 1), tg[0], tg[1], tg[2], { left: 1, hits: 0 });
            hb.heavy = true; if (tg[3]) hb.ce = tg[3];
            paws[0] = paws[1] = 1; api.sfx('jump');
            return;
        }
        var sd = sx < CX ? -1 : 1, th = { left: multi, hits: 0 }, lx = tg[0] - cx(tg[2]);
        for (var i = 0; i < multi; i++) {  /* the first ball goes where you aimed, playful extras to the sides */
            var off = i === 0 ? 0 : (i === 1 ? -1 : 1) * (lx > 0 ? 1 : -1) * 0.45, from = i === 1 ? -sd : sd;
            var b = launch(from * 0.3, tg[0] + off, tg[1] + (i ? 0.12 : 0), tg[2], th);
            if (i === 0 && tg[3]) b.ce = tg[3];
        }
        paws[sd < 0 ? 0 : 1] = 1;
        if (multi > 1) paws[sd < 0 ? 1 : 0] = 0.8;
        api.sfx('tap');
    }
    function flightT(dx, dy, dz) {  /* flight time: faster for far throws, and not so high it hits a roof */
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz), T = Math.max(0.15, d / (BALL_V + d * 0.5)), top = zoneOf(camZ + dz * 0.5).top;
        for (var i = 0; i < 8; i++) {
            var vy = dy / T + 0.5 * G * T;
            if (vy <= 0 || EYE - 0.45 + vy * vy / (2 * G) < Math.max(top, EYE - 0.45 + dy) - 0.1) break;
            T *= 0.85;
        }
        return T;
    }
    function launch(lx0, tx, ty, tz, th) {
        var b = { type: 'ball', x: camX + lx0, y: EYE - 0.45, z: camZ + 0.25, th: th, age: 0, spin: rnd(0, 6), trail: [], big: bigT > 0, rico: ricoT > 0 ? 1 : 0 };
        var dx = tx - b.x, dy = ty - b.y, dz = tz - b.z, T = flightT(dx, dy, dz);
        b.vx = dx / T; b.vy = dy / T + 0.5 * G * T; b.vz = dz / T;
        flying.push(b);
        return b;
    }

    /* swept hit tests: the fraction s of the segment a..b where it meets e, or -1; HIT says what was hit */
    function segSphere(ax, ay, az, bx, by, bz2, r) {
        var ux = bx - ax, uy = by - ay, uz = bz2 - az, L = ux * ux + uy * uy + uz * uz;
        var s = L > 0 ? clamp(((SX - ax) * ux + (SY - ay) * uy + (SZ - az) * uz) / L, 0, 1) : 0;
        var ex = ax + ux * s - SX, ey = ay + uy * s - SY, ez = az + uz * s - SZ;
        return ex * ex + ey * ey + ez * ez < r * r ? s : -1;
    }
    function hitTest(e, ax, ay, az, bx, by, bz2, big) {
        if (round(e)) { pos(e, clock); HIT = 'ball'; return segSphere(ax, ay, az, bx, by, bz2, SR + (big ? 0.34 : BR) + (e.type === 'critter' || e.type === 'shot' ? 0.1 : 0)); }
        if (e.type === 'glass') {
            if (e.broken) return -1;
            pstate(e, clock);
            var ca = Math.cos(QA), sa = Math.sin(QA);
            var da = -(ax - QX) * sa + (az - e.z) * ca, db = -(bx - QX) * sa + (bz2 - e.z) * ca;
            if ((da < 0) === (db < 0)) return -1;
            var s = da / (da - db), x = ax + (bx - ax) * s, y = ay + (by - ay) * s, z = az + (bz2 - az) * s;
            var u = (x - QX) * ca + (z - e.z) * sa;
            if (Math.abs(u) > e.w + (big ? 0.2 : 0) || y < e.y0 + QY || y > e.y1 + QY) return -1;
            if (e.arch && !inArch(x - cx(e.z), y)) return -1;
            HIT = [clamp(u, -e.w, e.w), y - QY]; return s;
        }
        if (e.type !== 'door') return -1;
        if (!e.open) {
            pos(e, clock);
            var k = segSphere(ax, ay, az, bx, by, bz2, SR + (big ? 0.3 : BR));
            if (k >= 0) { HIT = 'knob'; return k; }
        }
        if (!(az < e.z && bz2 >= e.z)) return -1;
        var s2 = (e.z - az) / (bz2 - az), lx = ax + (bx - ax) * s2 - cx(e.z), ly = ay + (by - ay) * s2;
        if (Math.abs(lx) < DW / 2 && ly < DH) { if (e.open) return -1; HIT = 'door'; }
        else if (Math.abs(lx) < 4.3 && ly < 7.5) HIT = 'wall';
        else return -1;
        return s2;
    }
    function stepBall(b, dt) {
        var ax = b.x, ay = b.y, az = b.z;
        b.age += dt; b.spin += dt * 9;
        b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        b.trail.unshift(ax, ay, az);
        if (b.trail.length > 18) b.trail.length = 18;
        var best = 2, be = null, what = null;
        for (var i = 0; i < ents.length; i++) {
            var s = hitTest(ents[i], ax, ay, az, b.x, b.y, b.z, b.big);
            if (s >= 0 && s < best) { best = s; be = ents[i]; what = HIT; }
        }
        var gs = guardTest(ax, ay, az, b.x, b.y, b.z);
        if (gs >= 0 && gs < best) return done(b, guardSmash(GI, ax + (b.x - ax) * gs, ay + (b.y - ay) * gs, az + (b.z - az) * gs, b));
        if (be) {
            var res = smash(be, what, ax + (b.x - ax) * best, ay + (b.y - ay) * best, az + (b.z - az) * best, b);
            if (b.again) { b.again = false; b.th.hits++; return true; }  /* ricochet: on to the next pane */
            return done(b, res);
        }
        if (mirrorTest(b, az)) return true;
        if (!inside(b.x, b.y, b.z) || b.z > camZ + FAR + 4 || (b.age > 0.1 && b.z < camZ + 0.2)) {
            if (b.y > -1) puff(b.x, Math.max(0, b.y), b.z, 5);
            return done(b, false);
        }
        return true;
    }
    function done(b, hit) {  /* a throw counts as a hit if any of its balls hit something */
        var th = b.th;
        th.left--;
        if (hit) th.hits++;
        if (th.left === 0) {
            if (th.hits) { streak++; hitsN++; bestStreak = Math.max(bestStreak, streak); }
            else {
                if (multi > 1) say('Combo lost', '#cbd5e1');
                streak = 0;
            }
            var m = streak >= 12 ? 3 : streak >= 5 ? 2 : 1;
            if (m > multi) {
                say(m === 2 ? 'Double yarn: two balls per throw' : 'Triple yarn!', '#ff9ccf');
                chat(m === 2 ? 'Double yarn!' : 'Triple yarn! Mrrow!', 'wow', true);
                api.sfx('point');
            }
            multi = m;
        }
        return false;
    }

    /* ---------- what happens when something gets hit ---------- */
    function smash(e, what, hx, hy, hz, ball) {
        if (what === 'wall' || what === 'door') { puff(hx, hy, hz - 0.05, 6); api.sfx('move'); return false; }
        if (what === 'knob') {
            e.open = true; points(20); popAt(hx, hy, hz, [255, 200, 110]);
            api.sfx('point');
            if (Math.random() < 0.4) chat('Door? What door?', 'happy');
            return true;
        }
        if (e.type === 'glass') {
            if (ball && ball.big && !e.lockSet) {  /* giant yarn: the whole row goes */
                var n = 0;
                e.g.panels.forEach(function (p) { if (!p.broken) { breakGlass(p, 1); n++; } });
                points(12 * n); popAt(hx, hy, hz, [210, 170, 255], 1.6);
                api.sfx('pop'); api.sfx('hit');
                shake = Math.max(shake, RM ? 0 : 5);
                return true;
            }
            if (e.hp > 1 && ball && ball.heavy) { e.hp = 1; popAt(hx, hy, hz, [255, 200, 90], 1.5); shake = Math.max(shake, RM ? 0 : 4); }  /* a heavy ball goes straight through */
            if (e.hp > 1) {  /* tough glass: crack it first */
                e.hp--; e.crack = (e.crack || []).concat(crackAt(what[0] / e.w, (what[1] - e.y0) / (e.y1 - e.y0)));
                points(5);
                shards(e, 5, 0.6);
                popAt(hx, hy, hz, e.st.edge || [255, 255, 255], 0.7);
                api.sfx('move');
                return true;
            }
            breakGlass(e, 1);
            points(e.g.kind === 'portal' ? 25 : e.lockSet ? 15 : 10);
            popAt(hx, hy, hz, e.st.edge || [255, 255, 255]);
            api.sfx('pop');
            if (e.lockSet) lockHit(e.lockSet);
            if (ball && ball.rico > 0) ricochet(ball, e, hx, hy, hz);
            if (firstPane) { firstPane = false; chat(SK.dog ? 'Pawfect aim!' : 'Purrfect aim!', 'happy', true); }
            return true;
        }
        e.broken = true; smashed++;
        pos(e, clock);
        if (e.type === 'shot') {
            burst(SX, SY, SZ, 0.15, 10, ['rgba(255,240,200,', 'rgba(200,230,255,', 'rgba(255,255,255,'], 0.8);
            popAt(SX, SY, SZ, [255, 236, 180], 1); points(10); api.sfx('pop');
        } else if (e.type === 'critter') {
            var CC = CRIT[e.kind];
            burst(SX, SY, SZ, 0.12, 10, [rgba(CC.c, 1).replace(/,1\)$/, ','), rgba(CC.g, 1).replace(/,1\)$/, ','), 'rgba(255,255,255,'], 0.8);
            popAt(SX, SY, SZ, CC.g, 0.8); points(15); api.sfx('pop');
            if (e.st === 'tele' || e.st === 'go') { points(10); popAt(SX, SY, SZ, [255, 255, 255], 1.4); if (!tips.critstop) { tips.critstop = true; say('Stopped it mid attack!', '#bff0ff'); } }
            e.grp.left--;
            if (e.grp.left === 0 && e.grp.n >= 2 && e.grp.n === e.grp.hits + 1) { addYarn(1); popAt(SX, SY, SZ, [255, 160, 210], 1.5); }  /* the whole group: a ball of yarn */
            else if (Math.random() < 0.1) addYarn(1);
            e.grp.hits = (e.grp.hits || 0) + 1;
        } else if (e.type === 'bubble') {
            burst(SX, SY, SZ, SR * 0.8, 14, ['rgba(255,200,240,', 'rgba(200,240,255,', 'rgba(255,250,200,', 'rgba(255,255,255,'], 0.6);
            popAt(SX, SY, SZ, [255, 210, 245], 1.6); points(10); api.sfx('pop');
        } else if (e.type === 'vase') {
            burst(SX, SY, SZ, 0.18, 12, [e.col], 1);
            points(15); addYarn(1);
            api.sfx('pop');
            if (Math.random() < 0.3) chat(Math.random() < 0.5 ? 'Oops. Not sorry.' : 'It was in the way.', 'happy');
        } else if (e.type === 'crystal') {
            burst(SX, SY, SZ, 0.2, 12, ['rgba(150,236,192,', 'rgba(205,250,225,', 'rgba(255,255,255,'], 0.6);
            popAt(SX, SY, SZ, [140, 255, 190]);
            points(10); addYarn(3);
            api.sfx('point');
            if (Math.random() < 0.35) chat(Math.random() < 0.5 ? 'More yarn!' : 'Catnip!', 'happy');
        } else if (e.type === 'lamp') {
            burst(SX, SY, SZ, 0.2, 14, ['rgba(255,214,165,', 'rgba(255,240,200,', 'rgba(255,255,255,'], 1);
            popAt(SX, SY, SZ, [255, 220, 150]);
            points(40); addYarn(2);
            api.sfx('pop'); api.sfx('point');
            chat('Shiny!', 'wow');
        } else if (e.type === 'dot') {
            zoomT = 4;
            burst(SX, 0.05, SZ, 0.2, 10, ['rgba(255,90,120,', 'rgba(255,190,200,'], 0.5);
            points(30);
            say('Zoomies! Glass cannot hurt you', '#ffd166');
            api.sfx('point');
            chat('ZOOMIES!', 'wow', true);
        } else if (e.type === 'power') {
            burst(SX, SY, SZ, 0.25, 16, e.kind === 'big' ? ['rgba(200,160,255,', 'rgba(255,255,255,'] : ['rgba(150,200,255,', 'rgba(255,255,255,'], 0.8);
            popAt(SX, SY, SZ, e.kind === 'big' ? [200, 160, 255] : [150, 200, 255], 1.4);
            points(30);
            if (e.kind === 'magnet') { magT = 6; say('Magnet: crystals fly to you', '#9ff5c4'); chat('Come here, crystals!', 'happy', true); }
            else if (e.kind === 'rico') { ricoT = 8; say('Ricochet: each ball breaks one more pane', '#ffe08a'); chat('Bank shot!', 'wow', true); }
            else if (e.kind === 'big') { bigT = 7; say('Giant yarn: whole rows shatter', '#d9b8ff'); chat('Giant yarn!', 'wow', true); }
            else { slowT = 5; say('Slow paws: time slows down', '#a8d8ff'); chat('Slooow paaaws...', 'think', true); }
            api.sfx('jump');
        }
        return true;
    }
    function crackAt(u, v) {  /* a few jagged rays from where the ball hit, in panel coordinates (-1..1, 0..1) */
        var c = [];
        for (var i = 0; i < 7; i++) {
            var a = i / 7 * TAU + rnd(-0.3, 0.3), l = rnd(0.35, 0.7), pts = [u, v];
            for (var j = 1; j <= 3; j++) pts.push(u + Math.cos(a + rnd(-0.3, 0.3)) * l * j / 3, v + Math.sin(a + rnd(-0.3, 0.3)) * l * j / 3 * 0.8);
            c.push(pts);
        }
        return c;
    }
    function shards(e, n, toward) {
        pstate(e, clock);
        var ca = Math.cos(QA), sa = Math.sin(QA), st = e.st;
        if (RM) n = Math.ceil(n / 2);
        if (parts.length > MAXP - 30) n = Math.ceil(n / 2);
        for (var i = 0; i < n; i++) {
            var u = rnd(-e.w + 0.1, e.w - 0.1), y = rnd(e.y0 + 0.05, e.y1 - 0.1) + QY;
            addPart(QX + u * ca, y, e.z + u * sa, u * 1.2 + rnd(-1, 1), rnd(-0.5, 2.5),
                    toward < 0 ? speed * rnd(0.85, 1.05) + rnd(-0.5, 0.5) : rnd(1.5, 4.5) * toward, rnd(0.1, 0.3), st.shards[i % st.shards.length], rnd(1, 1.8));
        }
    }
    function breakGlass(e, dir) {
        e.broken = true; smashed++;
        if (e.heart && dir > 0) releaseHeart(e);
        shards(e, Math.round((e.g.kind === 'portal' ? 22 : 16) * Math.min(1.4, e.w)), dir);
    }
    function burst(x, y, z, spread, n, cols, up) {
        if (RM) n = Math.ceil(n / 2);
        if (parts.length > MAXP - 20) n = Math.ceil(n / 2);
        for (var i = 0; i < n; i++) addPart(x + rnd(-spread, spread), y + rnd(-spread, spread), z, rnd(-2.2, 2.2), rnd(0.5, 3) * up, rnd(0.5, 2.5), rnd(0.05, 0.13), cols[i % cols.length], rnd(0.8, 1.4));
    }
    function puff(x, y, z, n) { for (var i = 0; i < n; i++) addPart(x, y, z, rnd(-1, 1), rnd(0, 1.5), rnd(-0.5, 0.5), 0.04, 'rgba(255,255,255,', 0.4, '#f783ac'); }
    function addPart(x, y, z, vx, vy, vz, s, col, life, solid) {
        if (parts.length >= MAXP) parts.shift();
        parts.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, s: s, c: col, solid: solid, r: rnd(0, 6), vr: rnd(-8, 8), life: life, max: life });
    }
    function popAt(x, y, z, c, s) { pops.push({ x: x, y: y, z: z, c: c, s: s || 1, t: 0 }); }  /* a quick ring of light where something broke */
    function points(n) { bonus += n; if (ptsTick.t > 0.9) ptsTick.n = 0; ptsTick.n += n; ptsTick.t = 0; }
    function addYarn(n) {
        balls += n;
        if (balls >= 6) lowWarned = false;
        if (yarnTick.t > 0.9 || yarnTick.n < 0) yarnTick.n = 0;
        yarnTick.n += n; yarnTick.t = 0;
    }
    function say(text, col, delay) { toast.text = yt(text); toast.c = col || '#ffffff'; toast.t = -(delay || 0); }
    function chat(text, mood, force) {
        if (!force && clock - lastSay < 5) return;
        lastSay = clock;
        if (mood) api.cat(mood);
        api.say(yt(text), 1700);
    }
    function crash(kind) {
        if (zoomT > 0) { bonus += 10; api.sfx('pop'); return; }
        if (graceT > 0) { api.sfx('move'); return; }  /* just after a bump the cat is still braced: the next pane bounces off */
        graceT = 1.4;
        var lost = Math.min(balls, 3 + Math.min(2, Math.floor(curZi / NZ)));
        balls -= lost;
        stumble = 0.35; flash = RM ? 0 : 1; shake = RM ? 0 : 14;
        if (multi > 1) say('Combo lost', '#cbd5e1');
        streak = 0; multi = 1;
        yarnTick.n = -lost; yarnTick.t = 0;
        api.sfx('hit');
        api.cat('sad');
        chat(kind === 'door' ? 'Bonk! My nose!' : (Math.random() < 0.5 ? (SK.dog ? 'Ouch, my ears!' : 'Ouch, my whiskers!') : (SK.dog ? 'Arf! Glass!' : 'Mrrp! Glass!')), 'sad');
    }



