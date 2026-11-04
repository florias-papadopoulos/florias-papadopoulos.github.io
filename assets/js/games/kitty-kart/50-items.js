    /* ---------- items: fish tins give one, the further back you are the better it is ---------- */
    var ITEMS = ['yarn', 'catnip', 'box', 'laser', 'milk', 'bell'];
    var WEIGHT = [[30, 10, 25, 0, 35, 0], [30, 20, 20, 10, 15, 5], [25, 30, 10, 20, 5, 10], [15, 35, 5, 25, 0, 20]];
    var NAMES = { yarn: 'Yarn ball', catnip: 'Catnip', box: 'Cardboard box', laser: 'Laser pointer', milk: 'Milk carton', bell: 'Nap bell' };
    var USE = { yarn: 'Fetch, everyone!', catnip: 'Catnip zoomies!', box: 'Safe in my box!', laser: 'Look, a red dot!', milk: 'Oops, spilt milk!', bell: 'Ding! Nap time up front!' };
    var USE_SFX = { yarn: 'jump', catnip: 'point', box: 'move', laser: 'tap', milk: 'move', bell: 'point' };
    function roll(place) {
        var w = WEIGHT[clamp(place, 1, 4) - 1], sum = 0, i, r;
        for (i = 0; i < 6; i++) sum += w[i];
        r = Math.random() * sum;
        for (i = 0; i < 6; i++) { r -= w[i]; if (r < 0) return ITEMS[i]; }
        return 'catnip';
    }
    function ahead(o, c) { return o !== c && (o.fin ? !c.fin || o.fin < c.fin : !c.fin && o.prog > c.prog); }
    function rankOf(c) { var p = 1; for (var i = 0; i < 4; i++) if (ahead(karts[i], c)) p++; return p; }
    function hit(c, why) {  /* an item or hazard hits c; a cardboard box takes the hit instead */
        if (c.shield > 0) {
            c.shield = 0; stat('blocked');
            for (var k = 0; k < 8; k++) puff('card', c.x, c.y, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, 0.6, 3);
            if (mine(c)) { sfx(c, 'pop'); say('The box saved you!', c); }
            return false;
        }
        if (mine(c) && why) { mood(c, 'sad'); sfx(c, 'hit'); say(why, c); }
        return true;
    }
    function spinOut(c, t, why, rate) {
        if (!hit(c, why)) return false;
        c.spin = Math.max(c.spin, t); c.spinK = rate === 0 ? 0 : Math.random() < 0.5 ? -9 : 9;
        return true;
    }
    function useItem(c) {
        var it = c.item, i, o, ca = Math.cos(c.a), sa = Math.sin(c.a);
        if (remote) { if (c === me && it && phase === 'race' && !c.fin) uses++; return; }  /* on the friend's device: the host uses it */
        if (!it || phase !== 'race' || c.fall > 0 || c.fin) return;
        c.item = null;
        stat('use-' + it);
        if (c === me) { stat('use-me'); slot(); }
        if (quiet(c, 1)) say(USE[it], c);
        near(c.x, c.y, 450, USE_SFX[it], c);
        if (it === 'yarn') {  /* thrown ahead, it follows the road and tangles the first cat it meets */
            var v = Math.max(c.vf, 0) + 430;
            yarns.push({ x: c.x + ca * 22, y: c.y + sa * 22, vx: ca * v, vy: sa * v, sp: v, owner: c, t: 0, roll: 0, trail: [], useAlt: c.useAlt });
        } else if (it === 'catnip') c.boost = 2.2;
        else if (it === 'box') c.shield = 12;
        else if (it === 'laser') {  /* the leader (or the closest rival when you lead) chases a red dot off the racing line */
            var tg = null;
            for (i = 0; i < 4; i++) { o = karts[i]; if (o !== c && !o.fin && (!tg || o.prog > tg.prog)) tg = o; }
            if (tg && hit(tg, 'Ooh, a red dot! Must chase it!')) { tg.laser = 1.8; tg.dotS = Math.random() < 0.5 ? -1 : 1; setDot(tg, 0); stat('hit-laser'); }
        } else if (it === 'milk') milks.push({ x: c.x - ca * 28, y: c.y - sa * 28, t: 0, owner: c, mask: 0 });
        else if (it === 'bell') {  /* everyone ahead gets sleepy for a moment */
            var any = false;
            for (i = 0; i < 4; i++) {
                o = karts[i];
                if (!ahead(o, c) || o.fin) continue;
                any = true;
                if (hit(o, 'Ding... so sleepy...')) { o.nap = 2.2; stat('hit-bell'); }
            }
            if (!any) for (i = 0; i < 4; i++) { o = karts[i]; if (o !== c && !o.fin && hit(o, 'Ding... so sleepy...')) o.nap = 1.2; }
            rings.push({ x: c.x, y: c.y, t: 0, who: c });
        }
    }
    function setDot(c, i) {  /* the red dot dances just off the kart's nose */
        var da = c.a + c.dotS * (0.9 + Math.sin(clock * 4 + i) * 0.4);
        c.dotx = c.x + Math.cos(da) * 80; c.doty = c.y + Math.sin(da) * 80;
    }
    function aiItem(c, dt) {  /* when the computer cats use what they hold */
        if (!c.item || phase !== 'race') return;
        c.itemT -= dt;
        if (c.itemT > 0) return;
        var it = c.item, go = false, i, o;
        if (it === 'box') go = true;
        else if (it === 'catnip') {  /* on a straight */
            go = true;
            for (i = 1; i < 30; i += 2) if (Math.abs(rK(routeAt(c, i))) > 0.004) { go = c.itemT < -6; break; }
        } else if (it === 'yarn') {
            go = c.itemT < -7;
            for (i = 0; i < 4; i++) {
                o = karts[i];
                if (o === c || o.fin || Math.abs(o.z - c.z) > 8) continue;
                var dx = o.x - c.x, dy = o.y - c.y;
                if (dx * dx + dy * dy < 420 * 420 && Math.abs(wrap(Math.atan2(dy, dx) - c.a)) < 0.3) go = true;
            }
        } else if (it === 'laser' || it === 'bell') go = rankOf(c) > 1 || c.itemT < -10;
        else if (it === 'milk') {
            go = c.itemT < -8;
            for (i = 0; i < 4; i++) { o = karts[i]; if (o !== c && !o.fin && c.prog - o.prog > 0 && c.prog - o.prog < SEG * 0.8) go = true; }
        }
        if (go) useItem(c);
    }
    function pickups(dt) {
        for (var i = 0; i < tins.length; i++) {
            var t = tins[i];
            if (t.t > 0) { t.t -= dt; continue; }
            for (var j = 0; j < 4; j++) {
                var c = karts[j];
                if (c.item || c.fall > 0 || c.z > 14 || Math.abs(c.x - t.x) > 26 || Math.abs(c.y - t.y) > 26 || Math.hypot(c.x - t.x, c.y - t.y) > R + 13) continue;
                t.t = 4; c.item = roll(rankOf(c)); c.itemT = (0.5 + Math.random() * 2) * (c.P ? c.P.hold : 1);
                for (var k = 0; k < 7; k++) puff('spark', t.x, t.y, (Math.random() - 0.5) * 170, (Math.random() - 0.5) * 170, 0.5, 2.6);
                stat('pick');
                if (mine(c)) { if (c === me) { stat('pick-me'); slot(); } sfx(c, 'pop'); mood(c, 'wow'); if (quiet(c, 1.5)) say(NAMES[c.item] + '!', c); }
                break;
            }
        }
    }
    function moveItems(dt) {
        var i, j, c;
        for (i = yarns.length - 1; i >= 0; i--) {
            var y = yarns[i];
            y.t += dt;
            nearest(y);
            var r = routeAt(y, 4), want = Math.atan2(rY(r) - y.y, rX(r) - y.x), cur = Math.atan2(y.vy, y.vx);
            cur += clamp(wrap(want - cur), -5 * dt, 5 * dt);
            y.vx = Math.cos(cur) * y.sp; y.vy = Math.sin(cur) * y.sp;
            y.x += y.vx * dt; y.y += y.vy * dt; y.roll += y.sp * dt / 9;
            y.trail.push(y.x, y.y);
            if (y.trail.length > 18) y.trail.splice(0, 2);
            var gone = y.t > 3 || y.x < 0 || y.y < 0 || y.x > WW || y.y > WH;
            for (j = 0; j < 4 && !gone; j++) {
                c = karts[j];
                if ((c === y.owner && y.t < 0.6) || c.fall > 0 || c.z > 12 || Math.hypot(c.x - y.x, c.y - y.y) > R + 9) continue;
                gone = true; stat('hit-yarn');
                if (spinOut(c, 1.3, 'Tangled in yarn!')) c.tangled = 1.3;
                if (mine(y.owner) && c !== y.owner) { sfx(y.owner, 'pop'); mood(y.owner, 'happy'); if (quiet(y.owner, 1)) say('Got them with the yarn!', y.owner); }
            }
            if (gone) {
                for (j = 0; j < 6; j++) { var q = puff('spark', y.x, y.y, (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140, 0.5, 2.4); if (q) q.c = DOG ? '#bef264' : '#f472b6'; }
                yarns.splice(i, 1);
            }
        }
        for (i = milks.length - 1; i >= 0; i--) {
            var m = milks[i];
            m.t += dt;
            if (m.t > 14) { milks.splice(i, 1); continue; }
            for (j = 0; j < 4; j++) {
                c = karts[j];
                if (m.mask & (1 << j) || c.z > 0 || (c === m.owner && m.t < 0.8) || Math.hypot(c.x - m.x, c.y - m.y) > 26) continue;
                m.mask |= 1 << j; stat('hit-milk');
                if (hit(c, 'Spilt milk! So slippery!')) { c.slip = 1; c.vx *= 0.75; c.vy *= 0.75; c.a += (Math.random() - 0.5) * 1.2; }
            }
        }
        for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 0.8) rings.splice(i, 1); }
        for (i = 0; i < 4; i++) {
            c = karts[i];
            if (c.laser > 0) setDot(c, i);
            if (c.boost > 0 && Math.random() < 0.6) puff('leaf', c.x - Math.cos(c.a) * 18, c.y - Math.sin(c.a) * 18, -c.vx * 0.2 + (Math.random() - 0.5) * 60, -c.vy * 0.2 + (Math.random() - 0.5) * 60, 0.5, 3);
            if (ALT && c.alt && c.ai > ALT.n / 2 && c.altLap !== laps(c)) { c.altLap = laps(c); stat('alt'); if (c === me) stat('alt-me'); }
        }
    }
    /* checkpoints: k counts the ones passed in order (the start line is the first); a lap is CP of them */
    function progress(c, dt) {
        nearest(c);
        if (cutCheck(c) || offCheck(c, dt || 0)) return;
        var next = (c.k % CP) * SEG;
        if ((c.idx - next + N) % N < SEG / 2 && c.dist < HW + 30) {
            c.k++;
            if (c.k > 1 && (c.k - 1) % CP === 0) lapDone(c);
        }
        var e = (c.idx - (((c.k - 1) % CP + CP) % CP) * SEG + N) % N;
        if (e > N / 2) e -= N;
        c.prog = c.k * SEG + clamp(e, -SEG, SEG * 1.5);
    }
    function laps(c) { return c.k > 0 ? Math.floor((c.k - 1) / CP) : 0; }
    function lapDone(c) {
        var l = laps(c);
        if (l >= LAPS && !c.fin) { c.fin = raceTime; finishers++; if (c === me || (split && c === pal)) finish(c); else if (host && c === pal && me.fin) phase = 'done'; return; }
        if (!mine(c)) return;
        sfx(c, 'pop');
        if (l === LAPS - 1) { mood(c, 'wow'); say('Final lap!', c); }
    }
    function ordinal(p) { return p + ['st', 'nd', 'rd', 'th'][Math.min(p, 4) - 1]; }
    /* Who hears what happens to a kart: the player on this device and, when hosting a race with a friend, the friend's
       kart too: its sounds, cat moods and speech bubbles are sent over (tell, in the Duo part below). */
    /* On split screen both players sit at this device: player 2 (pal) hears everything here too, and what is said to
       a player shows in their own half. */
    function mine(c) { return c === me || ((host || split) && c === pal); }
    function quiet(c, s) { return mine(c) && clock - (c === me ? lastSay : c.said) > s; }  /* nothing said to c for s seconds */
    function sfx(c, n) { if (c === me || (split && c === pal)) api.sfx(n); else if (host && c === pal) tell('s', n); }
    function mood(c, m) { if (c === me || (split && c === pal)) api.cat(m); else if (host && c === pal) tell('c', m); }
    function say(t, c) {
        if (split) {  /* nothing more for a player who is through */
            if (c === pal) { if (!c.fin) { c.said = clock; splitSay(1, t); } } else if ((!c || c === me) && !me.fin) { lastSay = clock; splitSay(0, t); }
            return;
        }
        if (!c || c === me) { lastSay = clock; api.say(dogify(t), 1800); }
        else if (host && c === pal) { c.said = clock; tell('t', t); }
    }
    function near(x, y, r, n, c) {  /* a sound for each player who drives c or is close to (x, y) */
        if (me === c || Math.hypot(me.x - x, me.y - y) < r) api.sfx(n);
        else if (split && (pal === c || Math.hypot(pal.x - x, pal.y - y) < r)) api.sfx(n);
        if (host && (pal === c || Math.hypot(pal.x - x, pal.y - y) < r)) sfx(pal, n);
    }
    function bump(c, v) {  /* a hard knock between karts: a sound, and the view shakes */
        if (!mine(c) || v <= 50 || clock - c.hitAt <= 0.5) return;
        c.hitAt = clock;
        if (c === me) { api.sfx('hit'); if (!api.reducedMotion) shake = Math.min(6, v / 25); }
        else if (split) { api.sfx('hit'); if (!api.reducedMotion) views[1].shake = Math.min(6, v / 25); }
        else tell('k', Math.round(v));
    }
    function finish(c) {
        if (duo) { duoFinish(); return; }
        if (split) { splitFinish(c); return; }
        phase = 'done';
        count('');
        place = finishers;
        var t = Math.round(raceTime * 10) / 10, old = saved.best[MAP.id];
        if (typeof old !== 'number' || t < old) { saved.best[MAP.id] = t; persist(); }
        show();
        if (place === 1) { api.cat('happy'); api.say(dogify('Purrfect! First place!'), 2400); }
        else api.say(dogify(place === 2 ? 'So close! Again?' : 'Meow. Next time!'), 2400);
        api.end({ score: t, lowerIsBetter: true, win: place === 1, board: MAP.id,
            text: 'You finished ' + ordinal(place) + ' on ' + MAP.name + '\nTime ' + t.toFixed(1) + ' s' });
    }
    function collide() {
        for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) {
            var a = karts[i], b = karts[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
            if (d2 >= 4 * R * R || d2 === 0 || Math.abs(a.z - b.z) > 8 || a.fall > 0 || b.fall > 0) continue;  /* a jumping kart flies over */
            var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, push = (2 * R - d) / 2;
            a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
            var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vn >= 0) continue;
            var imp = -vn * 0.7;  /* a soft bounce, both lose a little speed */
            a.vx -= nx * imp; a.vy -= ny * imp; b.vx += nx * imp; b.vy += ny * imp;
            a.vx *= 0.96; a.vy *= 0.96; b.vx *= 0.96; b.vy *= 0.96;
            bump(a, -vn); bump(b, -vn);
        }
    }

