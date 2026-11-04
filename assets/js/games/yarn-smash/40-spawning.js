    /* ---------- spawning: a blocker every gap, extras in between, scenery every 4 m, a rift gate at each world border ---------- */
    var TIPS = {
        bob: 'Floating glass: smash it or run under it', pulse: 'Ghost glass fades in and out', tough: 'Geode glass takes 2 hits',
        slide: 'Sliding ice: time it or smash it', spin: 'Spinning glass: hit it face on', door: 'Hit the glowing lever to open the hatch',
        lock: 'Airlocks open and close: time it or smash it', crystal: 'Green crystals give 3 yarn', dot: 'Catch the laser dot for zoomies',
        big: 'Giant yarn orb: smashes whole rows', slow: 'Slow paws orb: time slows down', lamp: 'Bonus lights give 2 yarn',
        magnet: 'Magnet orb: crystals fly to you', rico: 'Ricochet orb: balls break one more pane', bubble: 'Soap bubbles float up: pop them or let them rise',
        heart: 'A crystal heart in the glass: break it free', mirror: 'Ice mirrors bounce a missed ball back', lock: 'Hit all three small panes within 2 s',
        falls: 'Behind the waterfall the glass shows up late', guard: 'Break the glowing panel, then the next one',
        charge: 'Hold to charge a heavy ball (2 yarn, cracks tough glass)', critter: 'Glass critters: a red ring means one is about to attack'
    };
    function group(z, kind) { var g = { z: z, panels: [], kind: kind, passed: false }; groups.push(g); return g; }
    function glass(g, Z, lx, w, y0, y1, opt) {
        var e = { type: 'glass', z: g.z, lx: lx, w: w, y0: y0, y1: y1, hp: 1, g: g, st: Z.glass, mv: null, broken: false, seed: Math.random() * 99 };
        for (var k in opt) e[k] = opt[k];
        if (g.kind === 'gate' && !g.heart && (!e.mv || e.mv.k === 'bob' || e.mv.k === 'pulse') && Math.random() < 0.1) { e.heart = true; g.heart = true; e.tip = 'heart'; }
        ents.push(e); g.panels.push(e);
        return e;
    }
    function frame(z, Z, kind, half, y1) { ents.push({ type: 'frame', z: z + 0.04, kind: kind, half: half, y1: y1, Z: Z }); }
    var rowLoad = 0;  /* how busy the last row is: 0 a plain pane, up to 3 for three moving panes */
    function blocker(z, u, lvl, Z, zi, rest) {
        var g = group(z, 'gate'), k = Z.key, lap = Math.floor(zi / NZ), hw = Z.hw, ph = Z.paneH, i;
        rowLoad = 0;
        if (fallsAt(z)) { glass(g, Z, 0, 0.95, 0, ph, { tip: 'falls' }); frame(z, Z, 'posts', 1.0, ph); return; }
        if (k === 'aurora' && u > 20 && !rest && Math.random() < 0.4) ents.push({ type: 'mirror', z: z + 2.2, hw: Math.max(hw, 1.9), g: g, tip: 'mirror' });
        var twist = !rest && u > (zi ? 14 : 36) && Math.random() < clamp(0.3 + lvl * 0.55 + lap * 0.2, 0, 0.88);
        var nP = rest ? 1 : Math.random() < clamp(0.06 + 0.55 * lvl + 0.2 * lap, 0, 0.8) ? (Math.random() < 0.3 + 0.35 * lvl ? 3 : 2) : 1, wp = hw / nP;
        rowLoad = (twist ? 1 : 0) + nP - 1;
        if (k === 'stars' && twist && Math.random() < 0.55) k = pick(['isles', 'glow', 'aurora', 'clock', 'wool']);  /* the last world mixes every trick */
        function row(opt, h) { for (i = 0; i < nP; i++) glass(g, Z, -hw + wp * (2 * i + 1), wp, 0, h || ph, opt ? opt(i) : null); }
        if (!twist) { row(null); frame(z, Z, 'posts', hw + 0.04, ph); return; }
        if (k === 'isles') {
            var bw = rnd(1.0, 1.4) + lvl * 0.7, bp = rnd(0, 6);
            row(function (i) { return { mv: { k: 'bob', amp: 1.8, w: bw, ph: bp + i * (lvl > 0.35 ? 1.7 : 0) }, tip: 'bob' }; }, 1.95);
        } else if (k === 'wool') {  /* soap bubbles that float upwards once you come near */
            groups.pop();
            var rb = nP === 1 ? 0.95 : nP === 2 ? 0.8 : 0.62;
            for (i = 0; i < nP; i++) ents.push({ type: 'bubble', z: z + rnd(-0.5, 0.5), lx: nP === 1 ? 0 : -hw + (hw / nP) * (2 * i + 1), r: rb,
                                                 trig: rnd(9, 24) - lvl * 7, v: rnd(0.55, 0.9), t0: -1, ph: rnd(0, 6), tip: 'bubble' });
        } else if (k === 'glow') {
            var pw = rnd(1.3, 1.9) + lvl, pp = rnd(0, 6);
            row(function (i) { return { mv: { k: 'pulse', w: pw, ph: pp + i * 1.1 }, tip: 'pulse' }; });
            frame(z, Z, 'posts', hw + 0.04, ph);
        } else if (k === 'geode') {
            var hp = 2 + (lap > 0 && Math.random() < 0.4 ? 1 : 0);
            row(function (i) { return { hp: nP === 3 && i !== 1 ? 1 : hp, tip: 'tough' }; });
            frame(z, Z, 'posts', hw + 0.04, ph);
        } else if (k === 'aurora') {
            var sw = rnd(1.2, 1.7) + lvl * 0.8, sp = rnd(0, 6);
            if (nP > 1 && lvl > 0.25) {
                glass(g, Z, -hw * 0.5, hw * 0.5, 0, ph, { mv: { k: 'slide', amp: hw * 0.55, w: sw, ph: sp }, tip: 'slide' });
                glass(g, Z, hw * 0.5, hw * 0.5, 0, ph, { mv: { k: 'slide', amp: hw * 0.55, w: sw, ph: sp + Math.PI } });
            } else glass(g, Z, 0, 0.95, 0, ph, { mv: { k: 'slide', amp: 1.4, w: sw, ph: sp }, tip: 'slide' });
            frame(z, Z, 'rail', Math.max(hw, 2.3) + 0.1, ph);
        } else if (k === 'clock') {
            if (Z.key === 'clock' && z - lastDoorZ > 46 && Math.random() < 0.35) {
                groups.pop();
                ents.push({ type: 'door', z: z, a: 0, open: false, tip: 'door' });
                lastDoorZ = z;
                return;
            }
            var sv = rnd(1.1, 1.6) * (Math.random() < 0.5 ? -1 : 1), sph = rnd(0, 6);
            if (nP > 1) {
                glass(g, Z, -hw * 0.5, hw * 0.5 - 0.05, 0, ph, { mv: { k: 'spin', w: sv, ph: sph }, tip: 'spin' });
                glass(g, Z, hw * 0.5, hw * 0.5 - 0.05, 0, ph, { mv: { k: 'spin', w: -sv, ph: sph } });
            } else glass(g, Z, 0, hw - 0.1, 0, ph, { mv: { k: 'spin', w: sv, ph: sph }, tip: 'spin' });
            frame(z, Z, 'pivot', hw, ph);
        } else {  /* airlock doors */
            var dw = rnd(1.3, 1.8) + lvl * 0.6, dp = rnd(0, 6);
            glass(g, Z, -0.78, 0.78, 0, ph, { mv: { k: 'door', s: -1, w: dw, ph: dp }, tip: 'lock' });
            glass(g, Z, 0.78, 0.78, 0, ph, { mv: { k: 'door', s: 1, w: dw, ph: dp } });
            frame(z, Z, 'lock', hw + 0.1, ph);
        }
    }
    function addPortal(z, zi) {  /* the rift gate: two panes of glass in an arch, tinted with the next world's colours */
        var Zn = ZONES[zi % NZ], g = group(z, 'portal');
        var st = { frame: rgba(Zn.gate2), tint: lerpc(Zn.gate2, [255, 255, 255], 0.45), edge: Zn.gate, glow: Zn.gate, portal: true, shards: Zn.glass.shards };
        glass(g, Zn, -OW / 2, OW / 2, 0, OH + OW, { st: st, arch: true });
        glass(g, Zn, OW / 2, OW / 2, 0, OH + OW, { st: st, arch: true });
        ents.push({ type: 'portal', z: z - 0.03, zi: zi, gz: z });
        if (zi >= 2 && Math.random() < 0.55) {  /* a gate challenge: three small panes in front, all within 2 s opens the gate */
            var lg = { z: z - 2.2, panels: [], kind: 'lock', passed: true, gate: g, t: -1, done: false };
            var ls = { frame: rgba(Zn.gate2), tint: lerpc(Zn.gate, [255, 255, 255], 0.3), edge: Zn.gate2, glow: Zn.gate, shards: Zn.glass.shards };
            [[-0.95, 1.1], [0, 2.75], [0.95, 1.1]].forEach(function (p) { glass(lg, Zn, p[0], 0.3, p[1], p[1] + 0.6, { st: ls, lockSet: lg, tip: 'lock' }); });
            lg.gz = z; locks.push(lg);
        }
    }
    function lvlAt(z) { return clamp((z - 40) / 950, 0, 1); }
    var VASES = ['rgba(246,160,196,', 'rgba(140,214,190,', 'rgba(190,170,240,', 'rgba(150,200,240,'];
    function spawn() {
        while (nextZ < camZ + FAR + 6) {
            var z = nextZ, zi = zoneIdx(z), zs = zi * ZL, ze = zs + ZL, Z = ZONES[zi % NZ], u = z - zs, lvl = lvlAt(z), lap = Math.floor(zi / NZ);
            if (z > ze - 86) {  /* the guardian's stretch and the gate area: no glass, a few crystals for the fight */
                (zi ? [ze - 72, ze - 48] : [ze - 76, ze - 58, ze - 40]).forEach(function (cz) { if (cz >= z) ents.push({ type: 'crystal', z: cz, lx: rnd(-1, 1), y: rnd(1.2, 1.7), ph: rnd(0, 6) }); });
                nextZ = ze + 16; continue;
            }
            var falls = fallsAt(z), rest = u > 30 && ++rowN % 6 === 0;  /* every sixth row a breather: one plain pane, a longer gap, a crystal */
            blocker(z, u, lvl, Z, zi, rest);
            var gmin = Math.max(7.5, 0.8 * speed + 1.5);  /* never less than about 0.8 s between rows, however fast */
            var gap = Math.max(gmin, 17 - 8 * lvl - 1.6 * lap + rnd(0, 3.5)) + (rest ? 6 : 0) + (LVL === 'easy' ? 2 : LVL === 'hard' ? -1 : 0);
            if (z + gap > ze - 12) gap = Math.max(4, ze - 12 - z);
            var slots = [0.15, 0.4, 0.65, 0.9].sort(function () { return Math.random() - 0.5; });
            var spot = function () { return z + 2 + (slots.length ? slots.pop() : Math.random()) * Math.max(0.5, gap - 4); };
            var walk = falls ? 0.55 : Math.min(1.2, Z.hw - 0.3), pc = balls <= 3 || rest ? 0.9 : clamp(0.86 - 0.48 * lvl - 0.08 * lap, 0.3, 1);
            if (z < 30 || Math.random() < pc) ents.push({ type: 'crystal', z: spot(), lx: rnd(-walk, walk), y: rnd(1.1, 1.75), ph: rnd(0, 6), tip: 'crystal' });
            /* one threat at a time: critters only beside a light row, never two groups close together, never on a breather */
            var crit = u > 24 && !rest && !falls && rowLoad < 3 && z - lastCritZ > 34 &&
                       (lastCritZ < 0 && z > 116 || Math.random() < clamp(0.16 + 0.36 * lvl + 0.12 * lap + (zi % NZ) * 0.03, 0, 0.75) * (LVL === 'easy' ? 0.6 : LVL === 'hard' ? 1.25 : 1));
            if (crit) { spawnCritters(spot(), Z, zi, lvl); lastCritZ = z; }
            /* the side things (vases, lights) stay calm: one per gap at most, not next to critters, and the vase sits just
               behind the row the cat has passed, so it never stands in front of the next pane */
            var side1 = false;
            if (!falls && !crit && Math.random() < 0.35) {
                var sd = side();
                ents.push({ type: 'vase', z: z + 2.2 + rnd(0, 0.3) * Math.max(0.5, gap - 5), side: sd, lx: sd * Z.standX, stand: Z.stand, kind: (Math.random() * 3) | 0, col: pick(VASES), h: rnd(0.32, 0.46) });
                side1 = true;
            }
            if (u > 8 && !crit && !side1 && Math.random() < 0.3) ents.push({ type: 'lamp', z: spot(), ph: rnd(0, 6), Z: Z, tip: 'lamp' });
            if (z > 70 && !crit && z - lastDotZ > 60 && Math.random() < Z.dot * 2.5) { ents.push({ type: 'dot', z: spot(), ph: rnd(0, 6), tip: 'dot' }); lastDotZ = z; }
            if (z > 110 && z - lastPowZ > 150 && Math.random() < 0.5) {
                var kd = ['big', 'magnet', 'slow', 'rico'][powKind++ % 4];
                ents.push({ type: 'power', z: spot(), lx: rnd(-walk, walk) * 0.6, ph: rnd(0, 6), kind: kd, tip: kd });
                lastPowZ = z;
            }
            nextZ = z + gap;
        }
        while (nextGate * ZL < camZ + FAR + 6) { addPortal(nextGate * ZL, nextGate); nextGate++; }
        while (propZ < camZ + FAR + 6) { zoneOf(propZ + 2).props(propZ); propZ += 4; }
    }

    /* centre and radius of a round target at time t, into SX, SY, SZ, SR (world coordinates) */
    var STANDTOP = { plinth: 0.62, stump: 0.5, geo: 0.56, ice: 0.6, crate: 0.5, spool: 0.55, rock: 0.46 };
    function pos(e, t) {
        var a;
        if (e.type === 'critter') { critPos(e, t); return; }
        if (e.type === 'shot') { shotPos(e, t); return; }
        SZ = e.z;
        if (e.type === 'vase') { SX = cx(e.z) + e.lx; SY = STANDTOP[e.stand] + e.h * 0.5; SR = 0.2; }
        else if (e.type === 'crystal') { SX = cx(e.z) + e.lx; SY = e.y + Math.sin(t * 2 + e.ph) * 0.08; SR = 0.3; }
        else if (e.type === 'bubble') { SX = cx(e.z) + e.lx + Math.sin(t * 1.1 + e.ph) * 0.12; SY = e.r + 0.08 + (e.t0 >= 0 ? Math.max(0, t - e.t0) * e.v : 0); SR = e.r; }
        else if (e.type === 'power') { SX = cx(e.z) + e.lx + Math.sin(t * 1.3 + e.ph) * 0.4; SY = 1.75 + Math.sin(t * 2.4 + e.ph) * 0.12; SR = 0.36; }
        else if (e.type === 'lamp') {
            if (e.Z.lampY) { a = 0.75 * Math.sin(t * 2.1 + e.ph); SX = cx(e.z) + Math.sin(a) * e.Z.lampL; SY = e.Z.lampY - Math.cos(a) * e.Z.lampL; }
            else { SX = cx(e.z) + Math.sin(t * 1.1 + e.ph); SY = 2.5 + 0.22 * Math.sin(t * 2 + e.ph); }
            SR = 0.28;
        }
        else if (e.type === 'dot') { SX = cx(e.z) + 1.2 * Math.sin(t * 2.4 + e.ph) + 0.25 * Math.sin(t * 5.3 + e.ph); SY = 0.12; SR = 0.36; }
        else { SX = cx(e.z) + DW / 2 - 0.18; SY = 1.0; SZ = e.z - 0.06; SR = 0.17; }  /* the hatch lever */
    }
    function round(e) { return !e.broken && (e.type === 'vase' || e.type === 'crystal' || e.type === 'lamp' || e.type === 'dot' || e.type === 'power' || e.type === 'bubble' || e.type === 'critter' || e.type === 'shot'); }
    function pstate(e, t) {  /* a glass panel's world centre QX, turn QA and lift QY right now */
        var lx = e.lx, a = 0, m = e.mv;
        QY = 0;
        if (m) {
            if (m.k === 'slide') lx += m.amp * Math.sin(t * m.w + m.ph);
            else if (m.k === 'spin') a = t * m.w + m.ph;
            else if (m.k === 'door') lx += m.s * 1.75 * clamp(0.5 + 0.9 * Math.sin(t * m.w + m.ph), 0, 1);
            else if (m.k === 'bob') QY = m.amp * (0.5 + 0.5 * Math.sin(t * m.w + m.ph));
        }
        QX = cx(e.z) + lx; QA = a;
    }
    function ghostA(e, t) { var m = e.mv; if (!m || m.k !== 'pulse') return 1; var s = 0.5 + 0.5 * Math.sin(t * m.w + m.ph); return 0.08 + 0.92 * s * s; }
    function blocks(e) {  /* does this panel stand in the cat's way? */
        pstate(e, clock);
        var c = Math.abs(Math.cos(QA));
        return !e.broken && e.y0 + QY < 1.3 && c > 0.35 && Math.abs(camX - QX) < e.w * c + 0.22;
    }
    function inArch(lx, y) { return Math.abs(lx) < OW && (y < OH || lx * lx + (y - OH) * (y - OH) < OW * OW); }

