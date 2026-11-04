    /* ---------- glass critters: little groups that dart at the cat, one hit each; one that gets through nips a yarn ball ---------- */
    var CRIT = {
        isles: { c: [255, 238, 228], g: [255, 186, 150], r: 0.28, v: 2.2, y: 2.3 },   /* glass sparrows that swoop */
        glow: { c: [140, 255, 222], g: [80, 255, 210], r: 0.26, v: 1.6, y: 0.3 },     /* glass beetles that hop */
        geode: { c: [214, 176, 255], g: [190, 130, 255], r: 0.28, v: 2.4, y: 1.9 },   /* crystal bats that zigzag */
        aurora: { c: [226, 246, 255], g: [150, 230, 255], r: 0.26, v: 1.8, y: 1.6 },  /* frost wisps that spiral */
        clock: { c: [255, 222, 172], g: [255, 190, 100], r: 0.25, v: 3.0, y: 0.18 },  /* wind-up glass mice that scurry */
        wool: { c: [255, 236, 170], g: [255, 170, 222], r: 0.27, v: 1.7, y: 1.5 },    /* glass bumblebees that wobble */
        stars: { c: [196, 224, 255], g: [130, 230, 255], r: 0.26, v: 2.6, y: 1.8 }    /* tiny drones that dart */
    };
    function tri(x) { return Math.asin(Math.sin(x)) * 2 / Math.PI; }
    /* Each critter group flies in, hovers a few metres ahead of the cat, and its critters take turns to attack, one at a
       time across the whole road (a single attack token): a red ring closes around the one winding up, then it attacks in
       its own way. Hitting it during the wind-up stops the attack; most attacks also send something that can be shot. */
    var CATK = {
        isles: { k: 'swoop', tip: 'A sparrow winds up to swoop: hit it before it reaches you' },
        glow: { k: 'spore', tip: 'Beetles puff glowing spores: pop the spore' },
        geode: { k: 'screech', tip: 'A bat rings up a screech: hit it before the ring closes', tele: 0.35 },
        aurora: { k: 'flake', tip: 'Wisps blow snowflakes: pop them, or a paw freezes' },
        clock: { k: 'dash', tip: 'A mouse winds its key, then dashes: hit it on the floor' },
        wool: { k: 'honey', tip: 'Bees lob honey drops: pop them in the air' },
        stars: { k: 'zap', tip: 'A drone takes aim: hit it or its bolt' }
    };
    var LVL = (api.level && api.level()) || 'normal', LVT = LVL === 'easy' ? 1.35 : LVL === 'hard' ? 0.82 : 1;  /* the difficulty stretches or shortens every wind-up */
    var critTok = null, critNext = 0, graceT = 0;
    function camAt(t) { return camZ + speed * (t - clock); }
    function critPos(e, t) {
        var C = CRIT[e.kind], a = e.t0 >= 0 ? Math.max(0, t - e.t0) : 0, z = e.z0 - C.v * a, ph = e.ph + t, k = e.kind, st = e.st;
        var calm = st === 'tele' ? 1 - 0.75 * smooth((t - e.s0) / 0.3) : 1, lx = 0, y = C.y + e.dy;  /* it holds still while it winds up: an easy target */
        if (k === 'isles') { lx = Math.sin(ph * 1.3) * 0.7; y += 0.4 - Math.abs(Math.sin(ph * 0.9)) * 1.1 * calm; }
        else if (k === 'glow') { y = 0.22 + Math.abs(Math.sin(ph * 3.2)) * 0.75 * calm; lx = Math.sin(ph * 0.8) * 0.4; }
        else if (k === 'geode') { lx = tri(ph * 0.9) * 1.1; y += Math.sin(ph * 2.1) * 0.35; }
        else if (k === 'aurora') { lx = Math.cos(ph * 2.6) * 0.55; y += Math.sin(ph * 2.6) * 0.55; }
        else if (k === 'clock') { y = 0.16 + Math.abs(Math.sin(ph * 6)) * 0.12; lx = Math.sin(ph * 1.7) * 0.25; }
        else if (k === 'wool') { lx = Math.sin(ph * 2.3) * 0.8; y += Math.sin(ph * 4.7) * 0.25; }
        else {
            var sg = Math.floor(ph * 1.3), fr = smooth((ph * 1.3 - sg) * 2.5), s0 = e.ph * 13;
            lx = ((hash(sg + s0) * 2 - 1) * (1 - fr) + (hash(sg + 1 + s0) * 2 - 1) * fr) * 0.9;
            y += ((hash(sg * 1.7 + s0) - 0.5) * (1 - fr) + (hash((sg + 1) * 1.7 + s0) - 0.5) * fr) * 0.8;
        }
        lx = e.lx + lx * calm;
        if (st && st !== 'come') z = camAt(t) + e.D;  /* hovering ahead, keeping pace with the cat */
        else z = Math.max(z, camAt(t) + e.D);
        if (st === 'go') {  /* a swoop or a dash: straight at the cat */
            var u = Math.max(0, t - e.s0), gz = e.D - e.vr * u, w = smooth(1 - gz / e.D);
            z = camAt(t) + gz;
            lx = e.gx + (0 - e.gx) * w; y = k === 'clock' ? 0.16 : e.gy + (1.35 - e.gy) * w;
        } else if (st === 'leave') {  /* off and away, up into the sky */
            var v = Math.max(0, t - e.s0);
            z = camAt(t) + e.D + v * 3; lx = e.gx + e.gx * v; y = e.gy + v * v * 2.5;
        }
        SX = cx(z) + lx; SY = y; SZ = z; SR = C.r;
    }
    function spawnCritters(z, Z, zi, lvl) {
        var lap = Math.floor(zi / NZ), n = Math.min(3, 2 + (Math.random() < 0.2 + lvl * 0.45 ? 1 : 0) + (lap ? 1 : 0)), base = rnd(-0.5, 0.5), grp = { left: n, n: n }, ph0 = rnd(0, 6), trig = rnd(22, 30);
        for (var i = 0; i < n; i++) {
            ents.push({ type: 'critter', kind: Z.key, z0: z + i * 0.9, z: z + i * 0.9, lx: base + (i - (n - 1) / 2) * 0.7, dy: rnd(-0.15, 0.15),
                        ph: ph0 + i * 0.45, t0: -1, trig: trig + i * 0.9, grp: grp, tip: 'critter', st: 'come', D: 7.2 + i * 1.1, i: i, lvl: lvl, lap: lap });
        }
    }
    function teleDur(e) { return clamp((1.05 - 0.22 * e.lvl - 0.1 * e.lap + (CATK[e.kind].tele || 0)) * LVT, 0.62, 1.8); }
    function rowNear(d) {  /* an unbroken pane that will block the cat within d metres */
        for (var i = 0; i < ents.length; i++) { var o = ents[i]; if (o.type === 'glass' && !o.broken && o.z - camZ > 0.5 && o.z - camZ < d && o.g.kind !== 'lock' && blocks(o)) return true; }
        return false;
    }
    function foeShots() { var n = 0; for (var i = 0; i < ents.length; i++) if (ents[i].type === 'shot' && ents[i].foe && !ents[i].broken) n++; return n; }
    function critLeave(e) { critPos(e, clock); e.gx = SX - cx(SZ); e.gy = SY; e.st = 'leave'; e.s0 = clock; if (critTok === e) { critTok = null; critNext = clock + 0.6; } }
    function critFire(e) {  /* the wind-up is over: the attack itself */
        var a = CATK[e.kind].k;
        critPos(e, clock);
        var lx = SX - cx(SZ), y = SY, T;
        api.sfx('jump');
        if (a === 'swoop' || a === 'dash') { e.gx = lx; e.gy = y; e.st = 'go'; e.s0 = clock; e.vr = a === 'dash' ? 6.5 : 6; return; }
        if (a === 'screech') {  /* nothing to shoot any more: the ring closes on the cat */
            pops.push({ x: SX, y: SY, z: SZ, c: [200, 150, 255], s: 3, t: 0 });
            critHurt(1, 'The bat screeched: a yarn ball fell out');
        } else {
            var vr = a === 'zap' ? 8 : a === 'honey' ? 5 : 5.5;  /* how fast it closes in on the cat */
            T = (SZ - camZ - 0.4) / vr;
            var o = { foe: true, z0: SZ, lx0: lx, y0: y, vz: speed - vr, vx: -lx / T, r: a === 'honey' ? 0.26 : 0.24 };
            if (a === 'honey') { o.g = 5; o.vy = (1.35 - y + 0.5 * 5 * T * T) / T; }  /* a lob that comes down on the cat */
            else o.vy = (1.35 - y) / T;
            shot(a, o);
        }
        critLeave(e);
        e.st = 'leave'; e.s0 = clock + 0.35;
    }
    function critHurt(n, text, frost) {  /* a critter's attack got through: a yarn ball, or a frozen paw */
        if (graceT > 0 || zoomT > 0 || phase !== 'play') return;
        graceT = 0.8;
        if (frost) { freezeT = 1.8; api.sfx('hit'); flash = RM ? 0 : 0.35; }
        else {
            if (balls > 0) { balls--; if (yarnTick.t > 0.9 || yarnTick.n > 0) yarnTick.n = 0; yarnTick.n--; yarnTick.t = 0; }
            flash = RM ? 0 : 0.35; shake = Math.max(shake, RM ? 0 : 4); api.sfx('hit');
        }
        api.cat('sad');
        if (text && !tips['ch' + text]) { tips['ch' + text] = true; say(text, '#ffb3c0'); }
    }
    function stepCritters() {
        if (critTok && (critTok.broken || critTok.st !== 'tele' && critTok.st !== 'go' || ents.indexOf(critTok) < 0)) { critTok = null; critNext = clock + 0.6; }
        for (var i = 0; i < ents.length; i++) {
            var e = ents[i];
            if (e.type !== 'critter' || e.broken) continue;
            if (e.t0 < 0 && e.z0 - camZ < e.trig) e.t0 = clock;
            critPos(e, clock); e.z = SZ;
            if (e.st === 'come' && e.t0 >= 0 && SZ - camZ <= e.D + 0.05) { e.st = 'perch'; e.pt = clock; }
            if ((e.st === 'perch' || e.st === 'tele') && (guard || phase !== 'play')) { critLeave(e); continue; }
            if (e.st === 'perch') {
                if (clock - e.pt > 6.5) { critLeave(e); continue; }  /* tired of waiting: it flies off, no harm done */
                if (!critTok && clock > critNext && clock - e.pt > 0.5 + e.i * 0.35 && !foeShots() && !rowNear(Math.max(5, speed * 0.55)) && graceT <= 0) {
                    critTok = e; e.st = 'tele'; e.s0 = clock; e.td = teleDur(e);
                    api.sfx('move');
                    var ck = CATK[e.kind].k;
                    if (!tips['catk' + ck] && banner.t > banner.dur) { tips['catk' + ck] = true; tips.critter = true; say(CATK[e.kind].tip, '#ffd0a0'); }
                }
            } else if (e.st === 'tele') {
                if (clock - e.s0 >= e.td) critFire(e);
            } else if (e.st === 'go') {
                if (SZ - camZ < 0.5) {
                    e.broken = true; e.grp.left--; critTok = null; critNext = clock + 0.6;
                    if (Math.abs(SX - camX) < 0.95 && SY < 2.7) critHurt(1, e.kind === 'clock' ? 'The mouse nipped a ball of yarn' : 'The sparrow snatched a ball of yarn');
                }
            } else if (e.st === 'leave') {
                if (clock - e.s0 > 1.6) { e.broken = true; e.grp.left--; }
            }
        }
    }


    /* ---------- guardian attacks: each guardian winds up (a red ring of warning and a sound), then attacks in its own way ---------- */
    var ATK = { isles: ['dive', 'bolts'], glow: ['dust'], geode: ['boulder'], aurora: ['shards'], clock: ['gears'], wool: ['shield'], stars: ['beam'] };
    var freezeT = 0, blurN = 0;
    function atkGap() { return clamp(6.2 - (guard.zi % NZ) * 0.45 - Math.floor(guard.zi / NZ) * 0.7, 2.4, 6.5); }
    function guardHurt(n, text) {  /* an attack got through: it costs yarn, never the run */
        if (graceT > 0) return;
        graceT = 0.9;
        var lost = Math.min(balls, n);
        balls -= lost; if (lost) { yarnTick.n = -lost; yarnTick.t = 0; }
        flash = RM ? 0 : 0.6; shake = Math.max(shake, RM ? 0 : 6);
        api.sfx('hit'); api.cat('sad');
        if (text && !tips['hurt' + text]) { tips['hurt' + text] = true; say(text, '#ffb3c0'); }
    }
    function shot(style, o) {  /* a guardian's projectile: a small round target that can be shot down */
        var e = { type: 'shot', style: style, t0: clock, vx: 0, vy: 0, vz: 0, g: 0, r: 0.3 };
        for (var k in o) e[k] = o[k];
        e.z = e.z0; ents.push(e);
        return e;
    }
    function shotPos(e, t) {
        var a = Math.max(0, t - e.t0);
        if (e.cling) { SZ = camZ + 2.6; SX = camX + camS * 2.6 + e.cx; SY = EYE + camHY - hy(SZ) + e.cy; SR = 0.55; return; }
        SZ = e.z0 + e.vz * a; SX = cx(SZ) + e.lx0 + e.vx * a; SY = e.y0 + e.vy * a - 0.5 * e.g * a * a; SR = e.r;
        if (e.style === 'gear') SY = e.r;
    }
    function startAttack() {
        var list = ATK[guard.key], kind = list[(guard.na || 0) % list.length];
        guard.na = (guard.na || 0) + 1;
        guard.atk = { kind: kind, phase: 'tele', t: 0, dur: kind === 'beam' ? 1.3 : kind === 'shield' ? 0.8 : 1.05 };
        api.sfx('move');
        if (!tips['atk' + kind]) { tips['atk' + kind] = true; say(ATKTIP[kind], '#ffd0a0'); }
    }
    var ATKTIP = { dive: 'It winds up to dive: hit its glowing panel to stop it', bolts: 'Storm orbs: shoot them before the lightning strikes',
                   dust: 'Glowing dust: pop the motes that cling to your view', boulder: 'Boulder! Shatter it in the air',
                   shards: 'Ice shards: a hit freezes a paw for a moment', gears: 'Gear wheels rolling at you: break them',
                   shield: 'Bubble shields: pop them first', beam: 'Star beam: hit the ray to cut it off' };
    function fireAttack(a) {
        guardPos(clock);
        var k = a.kind, i, gz = GZ, gx = GX - cx(GZ), gy = GY;
        api.sfx('jump');
        if (k === 'bolts') {
            for (i = 0; i < 3; i++) shot('orb', { z0: camZ + 8.5 + i * 2.5, lx0: (i - 1) * 1.2 + rnd(-0.2, 0.2), y0: 2.3, r: 0.32 });
        } else if (k === 'dust') {
            for (i = 0; i < 4; i++) shot('mote', { z0: gz, lx0: gx + rnd(-1, 1), y0: gy + rnd(-0.6, 0.6), vz: -rnd(4, 6), vx: rnd(-0.4, 0.4), vy: rnd(-0.35, 0), r: 0.28, vol: a });
        } else if (k === 'boulder') {
            var T = (gz - camZ) / (8 + speed);
            shot('boulder', { z0: gz, lx0: gx, y0: gy + 0.6, vz: -8, vx: -gx / T, vy: (1.3 - gy - 0.6 + 4.5 * T * T) / T, g: 9, r: 0.42, spin: rnd(2, 4) });
        } else if (k === 'shards') {
            for (i = 0; i < 5; i++) shot('shard', { z0: gz, lx0: gx, y0: gy, vz: -9, vx: (i - 2) * 0.55 - gx / 2.2, vy: (1.4 - gy) / 1.3, r: 0.2, vol: a });
        } else if (k === 'gears') {
            for (i = 0; i < 2; i++) shot('gear', { z0: gz - 1, lx0: (i ? 0.6 : -0.6) + gx * 0.3, y0: 0.4, vz: -5.5, r: 0.4 });
        } else if (k === 'shield') {
            var n = 0;
            guard.panels.forEach(function (p, j) { if (!p.broken && n < 2 && j >= guard.idx) { p.shield = 1; n++; } });
            for (i = 0; i < 2; i++) shot('soap', { z0: gz, lx0: gx + (i ? 0.7 : -0.7), y0: gy - 0.4, vz: -4.5, vy: -0.3, r: 0.3 });
        }
    }
    function stepAttack(dt) {  /* called during the fight */
        if (!guard.atk) { guard.atkT = (guard.atkT === undefined ? 2.2 : guard.atkT) - dt; if (guard.atkT <= 0) { startAttack(); guard.atkT = atkGap(); } return; }
        var a = guard.atk;
        a.t += dt;
        if (a.phase === 'tele') {
            if (a.t >= a.dur) { a.phase = 'act'; a.t = 0; if (a.kind !== 'dive' && a.kind !== 'beam') { fireAttack(a); guard.atk = null; } else api.sfx('jump'); }
            return;
        }
        if (a.kind === 'dive') {  /* the roc dives at the cat */
            guard.dv = Math.min(11, a.t * 13);
            if (guard.dv >= 11) { if (zoomT <= 0) guardHurt(2, 'The roc dived into you'); guard.atk = null; }
        } else if (a.kind === 'beam') {  /* the star ray sweeps its beam across the road */
            if (a.t >= 1.6) { if (zoomT <= 0) guardHurt(2, 'The star beam got you'); guard.atk = null; }
        }
    }
    function interrupt() {  /* a hit on the guardian while it winds up or dives cancels the attack */
        var a = guard.atk;
        if (!a || !(a.kind === 'dive' || a.kind === 'beam' || a.phase === 'tele')) return;
        guard.atk = null;
        guardPos(clock); popAt(GX, GY, GZ, [255, 255, 255], 2.2); api.sfx('point');
        if (!tips.interrupt) { tips.interrupt = true; say('Interrupted!', '#bff0ff'); }
    }
    var FOEHIT = { spore: 'A spore burst on your nose: pop them in the air', flake: 'A snowflake froze a paw for a moment',
                   honey: 'Sticky honey: a ball of yarn got stuck', zap: 'Zapped! Hit the drone while it aims' };
    function stepShots() {
        for (var i = 0; i < ents.length; i++) {
            var e = ents[i];
            if (e.type !== 'shot' || e.broken) continue;
            shotPos(e, clock); e.z = SZ;
            if (e.cling) { if (clock - e.clT > 7) e.broken = true; continue; }
            var dz = SZ - camZ;
            if (e.style === 'mote' && dz < 2.9) {  /* the dust sticks to the view */
                e.cling = true; e.clT = clock; e.cx = rnd(-0.75, 0.75); e.cy = rnd(-0.55, 0.45);
                if (!e.vol.hurt) { e.vol.hurt = true; guardHurt(1, 'Dust in your eyes: pop it'); }
                continue;
            }
            if (e.style === 'orb' && dz < 1.3) {  /* lightning strikes the marked spot */
                e.broken = true; e.struck = clock;
                pops.push({ x: SX, y: 0.05, z: SZ, c: [200, 230, 255], s: 2.5, t: 0 }); boltT = RM ? 0 : 0.2;
                if (zoomT <= 0) guardHurt(1, 'Lightning! Shoot the storm orbs');
                continue;
            }
            if (dz < 0.5 && e.foe) {  /* a critter's spore, snowflake, honey drop or bolt */
                e.broken = true;
                if (Math.abs(SX - camX) < 1.0 && SY < 2.8) critHurt(1, FOEHIT[e.style], e.style === 'flake');
                continue;
            }
            if (dz < 0.5) {
                e.broken = true;
                if (Math.abs(SX - camX) < (e.style === 'shard' ? 0.75 : 1.0) && SY < 2.8 && zoomT <= 0) {
                    if (e.style === 'shard') { if (!e.vol.hurt) { e.vol.hurt = true; freezeT = 2.5; guardHurt(1, 'A frozen paw: slower throws for a moment'); } }
                    else guardHurt(e.style === 'boulder' ? 2 : 1, e.style === 'boulder' ? 'The boulder hit you' : e.style === 'gear' ? 'A gear wheel ran you over' : (SK.dog ? 'Soap in your fur' : 'Soap in your whiskers'));
                }
            }
        }
    }

    /* ---------- glass guardians: a creature of glass panels drifts ahead before each gate; break the glowing panel, then the next ---------- */
    var GDES = {
        isles: { roc: true, c: [120, 200, 255], c2: [255, 236, 150], eyes: [[-0.11, 1.02], [0.11, 1.02]],  /* the storm roc: beating crystal wings, a glowing core, lightning */
                 body: [-0.42, 0.55, -0.17, 1.18, 0, 1.32, 0.17, 1.18, 0.42, 0.55, 0.34, -0.55, 0, -0.78, -0.34, -0.55],
                 panels: [[-0.36, 0.38, -1.15, 1.25, -2.65, 1.6, -2.3, 0.9, -2.85, 0.35, -1.45, -0.12, -0.42, -0.22],
                          [0.36, 0.38, 1.15, 1.25, 2.65, 1.6, 2.3, 0.9, 2.85, 0.35, 1.45, -0.12, 0.42, -0.22],
                          [-0.26, -0.6, 0.26, -0.6, 0.75, -1.7, 0, -1.4, -0.75, -1.7], [0, 0.48, 0.33, 0, 0, -0.52, -0.33, 0]],
                 flap: [1, 1, 0, 0], order3: [0, 1, 3],
                 lines: [[-0.09, 1.28, -0.4, 1.78, -0.18, 1.5], [0.09, 1.28, 0.4, 1.78, 0.18, 1.5], [-0.07, 0.9, 0, 0.72, 0.07, 0.9]] },
        glow: { c: [70, 240, 200], c2: [220, 150, 255], eyes: [[-0.1, 0.45], [0.1, 0.45]],
                panels: [[-0.2, 0.25, -2.1, 1.45, -2.5, 0.45, -0.3, -0.05], [0.2, 0.25, 2.1, 1.45, 2.5, 0.45, 0.3, -0.05], [0.25, -0.15, 1.7, -0.45, 1.35, -1.4, 0.2, -0.6], [-0.25, -0.15, -1.7, -0.45, -1.35, -1.4, -0.2, -0.6]],
                lines: [[-0.08, 0.5, -0.4, 1.1, -0.8, 1.5], [0.08, 0.5, 0.4, 1.1, 0.8, 1.5], [0, 0.55, 0, -1.0]] },
        geode: { c: [190, 140, 255], c2: [130, 230, 255], eyes: [[-0.15, 1.45], [0.15, 1.45]], body: [-1.0, 1.0, 1.0, 1.0, 1.1, -0.8, 0.7, -2.0, -0.7, -2.0, -1.1, -0.8],
                 panels: [[-1.9, 0.95, -1.1, 0.8, -1.15, -1.15, -2.0, -0.9], [1.9, 0.95, 1.1, 0.8, 1.15, -1.15, 2.0, -0.9], [-0.9, 0.9, 0.9, 0.9, 0.7, -0.7, -0.7, -0.7], [-0.42, 1.05, 0.42, 1.05, 0.36, 1.75, -0.36, 1.75]],
                 lines: [[-1.0, 1.0, -1.3, 1.5], [1.0, 1.0, 1.3, 1.5]] },
        aurora: { c: [140, 220, 255], c2: [190, 255, 220], eyes: [[-0.2, 1.1], [0.2, 1.1]],
                  panels: [[-0.7, 0.6, -1.9, 0.2, -1.6, -1.2, -0.7, -0.9], [0.7, 0.6, 1.9, 0.2, 1.6, -1.2, 0.7, -0.9], [-0.65, 0.5, 0.65, 0.5, 0.5, -1.1, -0.5, -1.1], octo(0, 1.05, 0.55)],
                  lines: [[-0.35, 1.5, -0.55, 1.95], [0.35, 1.5, 0.55, 1.95]] },
        clock: { c: [240, 170, 70], c2: [255, 236, 180], eyes: [[-0.12, 1.7], [0.12, 1.7]],
                 panels: [half(-1), half(1), [-0.45, 1.45, 0.45, 1.45, 0.3, 2.0, -0.3, 2.0], octo(0, 0, 0.45)],
                 lines: [[-1.2, -0.6, -1.9, -1.2], [1.2, -0.6, 1.9, -1.2], [-1.4, 0.1, -2.1, 0.1], [1.4, 0.1, 2.1, 0.1], [-0.2, 2.0, -0.5, 2.5], [0.2, 2.0, 0.5, 2.5]] },
        wool: { c: [255, 150, 210], c2: [200, 240, 255], eyes: [[1.65, 0.7], [1.88, 0.7]],
                panels: [octo(-0.9, 0.25, 0.55), octo(0, 0.65, 0.6), octo(0.9, 0.25, 0.55), octo(0, -0.3, 0.55), octo(1.75, 0.6, 0.4)],
                lines: [[-0.7, -0.7, -0.7, -1.4], [0.6, -0.7, 0.6, -1.4], [1.55, 0.95, 1.4, 1.25], [1.95, 0.95, 2.1, 1.25]] },
        stars: { c: [255, 130, 220], c2: [140, 232, 255], eyes: [[-0.14, 0.55], [0.14, 0.55]],
                 panels: [[-0.4, 0.6, -2.6, -0.2, -0.5, -0.7], [0.4, 0.6, 2.6, -0.2, 0.5, -0.7], [0, 1.1, 0.45, 0.2, 0, -0.8, -0.45, 0.2], [-0.1, -0.8, 0.1, -0.8, 0, -2.2]],
                 lines: [[-0.25, 1.0, -0.5, 1.4], [0.25, 1.0, 0.5, 1.4]] }
    };
    function octo(x, y, r) { var p = []; for (var i = 0; i < 8; i++) { var a = (i + 0.5) / 8 * TAU; p.push(x + Math.cos(a) * r, y + Math.sin(a) * r); } return p; }
    function half(s) { var p = [0.04 * s, 1.4]; for (var i = 1; i < 8; i++) { var a = Math.PI / 2 + i / 8 * Math.PI; p.push(s * Math.abs(Math.cos(a)) * 1.5, Math.sin(a) * 1.4); } p.push(0.04 * s, -1.4); return p; }
    var GX = 0, GY = 0, GZ = 0, GI = -1, guardDone = -1;
    function gscale() { return guard.key === 'geode' ? 1.15 : 1.45; }
    function guardPos(t) {  /* it swoops in from high up and to one side, then hovers ahead (the roc dives and banks) */
        var e = 1 - guard.ent, roc = GDES[guard.key].roc;
        GZ = camZ + speed * (t - clock) + guard.D - (guard.dv || 0);
        GX = cx(GZ) + Math.sin(t * 0.7) * (roc ? 1.25 : 0.8) + e * e * guard.side * 7;
        GY = (guard.key === 'geode' ? 1.95 : 2.6) + Math.sin(t * 1.3) * 0.22 + (roc ? Math.sin(t * 0.9) * 0.35 : 0) + e * e * 5.5 +
             (guard.atk && guard.atk.kind === 'dive' ? (guard.atk.phase === 'tele' ? guard.atk.t / guard.atk.dur * 1.3 : 1.3 - (guard.dv || 0) * 0.15) : 0);
    }
    function panelPts(p) {  /* wing panels beat: their tips rise and fall */
        if (!p.flap) return p.pts;
        var f = guard.fl, out = [];
        for (var i = 0; i < p.pts.length; i += 2) { var ax = Math.abs(p.pts[i]) / 2.7; out.push(p.pts[i] * (1 - 0.1 * Math.abs(f) * ax), p.pts[i + 1] + f * 0.6 * ax); }
        return out;
    }
    function inPoly(p, x, y) {
        var c = false;
        for (var i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
            if ((p[i + 1] > y) !== (p[j + 1] > y) && x < (p[j] - p[i]) * (y - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) c = !c;
        }
        return c;
    }
    function startGuard(zi) {
        var key = ZONES[zi % NZ].key, d = GDES[key], lap = Math.floor(zi / NZ), n = Math.min(d.panels.length, 3 + (zi > 0 ? 1 : 0) + lap);
        var ids = n === 3 && d.order3 ? d.order3 : [0, 1, 2, 3, 4].slice(0, n);
        guard = { zi: zi, key: key, D: FAR + 6, state: 'in', idx: 0, n: n, dead: 0, ent: 0, t: 0, fl: 0, side: Math.random() < 0.5 ? -1 : 1,
                  panels: ids.map(function (i) { return { pts: d.panels[i], flap: d.flap ? d.flap[i] : 0, broken: false, flash: 0 }; }) };
        if (!tips.guard) { tips.guard = true; say(TIPS.guard, '#ffffff'); }
        chat(d.roc ? 'A storm roc! Look at those wings!' : 'A glass guardian!', 'wow', true); api.sfx('jump');
    }
    function stepGuard(dt) {
        var zi = zoneIdx(camZ), u = camZ - zi * ZL;
        if (!guard && phase === 'play' && u > ZL - 84 && u < ZL - 40 && guardDone !== zi) { guardDone = zi; startGuard(zi); }
        if (!guard) return;
        for (var i = 0; i < guard.panels.length; i++) guard.panels[i].flash = Math.max(0, guard.panels[i].flash - dt);
        guard.t += dt; guard.fl = RM ? Math.sin(guard.t * 1.4) * 0.5 : Math.sin(guard.t * 3.4);
        if (guard.state === 'in') { guard.ent = Math.min(1, guard.ent + dt / 1.8); guard.D += (12.5 - guard.D) * Math.min(1, dt * 1.1); if (guard.D < 17 && guard.ent >= 1) guard.state = 'fight'; }
        else if (guard.state === 'fight') {
            guard.D += (12.5 - guard.D) * Math.min(1, dt);
            if (!guard.atk || guard.atk.kind !== 'dive') guard.dv = Math.max(0, (guard.dv || 0) - dt * 9);
            stepAttack(dt);
            if (u > ZL - 22 || zi !== guard.zi) { guard.state = 'swoop'; guard.atk = null; guard.dv = 0; }
        }
        else if (guard.state === 'swoop') {
            guard.D -= dt * 24;
            if (guard.D < 1.2) {
                if (zoomT <= 0 && phase === 'play' && guard.zi > 0) {  /* the first guardian only flies off */
                    var lost = Math.min(balls, 3);
                    balls -= lost; yarnTick.n = -lost; yarnTick.t = 0; flash = RM ? 0 : 0.7; shake = RM ? 0 : 8;
                    api.sfx('hit'); api.cat('sad'); say('The guardian swooped and got away', '#cbd5e1');
                }
                guard = null;
            }
        } else { guard.D += dt * 3; guard.dead += dt; if (guard.dead > 1.1) guard = null; }
    }
    function guardTest(ax, ay, az, bx, by, bz2) {  /* where a ball segment meets an unbroken guardian panel, or -1 (GI: which) */
        if (!guard || (guard.state !== 'fight' && guard.state !== 'swoop')) return -1;
        guardPos(clock);
        if ((az < GZ) === (bz2 < GZ)) return -1;
        var s = (GZ - az) / (bz2 - az), gs = gscale(), x = (ax + (bx - ax) * s - GX) / gs, y = (ay + (by - ay) * s - GY) / gs;
        for (var i = 0; i < guard.panels.length; i++) if (!guard.panels[i].broken && inPoly(panelPts(guard.panels[i]), x, y)) { GI = i; return s; }
        return -1;
    }
    function guardPick(sx, sy, t) {  /* the world point on a guardian panel under the screen point, at time t */
        guardPos(t);
        var dz = GZ - camZ;
        if (dz < 1) return null;
        var k = F / dz, lx = (sx - CX) / k + camX + camS * dz - GX, ly = EYE - hy(GZ) + camHY + (HOR - sy) / k - GY;
        var gs = gscale();
        for (var i = 0; i < guard.panels.length; i++) if (!guard.panels[i].broken && inPoly(panelPts(guard.panels[i]), lx / gs, ly / gs)) return [lx, ly];
        return null;
    }
    function guardSmash(i, hx, hy, hz, ball) {
        var p = guard.panels[i], d = GDES[guard.key];
        interrupt();
        if (p.shield) { p.shield = 0; p.flash = 0.2; popAt(hx, hy, hz, [255, 210, 245], 1.6); api.sfx('pop'); return true; }  /* a bubble shield pops first */
        if (i !== guard.idx && !(ball && ball.big)) { p.flash = 0.45; puff(hx, hy, hz - 0.05, 6); api.sfx('move'); return false; }
        p.broken = true; guard.idx++;
        while (guard.idx < guard.n && guard.panels[guard.idx].broken) guard.idx++;
        burst(hx, hy, hz, 0.4, 16, [rgba(d.c, 1).replace(/,1\)$/, ','), rgba(d.c2, 1).replace(/,1\)$/, ','), 'rgba(255,255,255,'], 1);
        popAt(hx, hy, hz, d.c2, 1.4); points(30); api.sfx('pop');
        if (guard.idx >= guard.n) {
            guard.state = 'dead'; guardPos(clock);
            burst(GX, GY, GZ, 1.4, 40, [rgba(d.c, 1).replace(/,1\)$/, ','), rgba(d.c2, 1).replace(/,1\)$/, ','), 'rgba(255,255,255,'], 1.5);
            if (d.roc) {  /* the roc goes out with a thunderclap: wing shards both sides, rings of light */
                burst(GX - 2.2, GY + 0.6, GZ, 0.9, 22, ['rgba(150,215,255,', 'rgba(255,240,170,', 'rgba(255,255,255,'], 1.8);
                burst(GX + 2.2, GY + 0.6, GZ, 0.9, 22, ['rgba(150,215,255,', 'rgba(255,240,170,', 'rgba(255,255,255,'], 1.8);
                popAt(GX, GY, GZ, [255, 255, 255], 4.5); popAt(GX, GY, GZ, [140, 210, 255], 6);
                boltT = RM ? 0 : 0.35; api.sfx('hit');
            }
            addYarn(3); points(150); popAt(GX, GY, GZ, d.c2, 3);
            say('Guardian shattered! +3 yarn', '#ffe08a'); chat('We beat the guardian!', 'wow', true); api.sfx('win');
            shake = Math.max(shake, RM ? 0 : 6);
        }
        return true;
    }

