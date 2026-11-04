    /* ---------- karts: the player (first) and three computer cats with their own fur ---------- */
    var karts = [
        { fur: '#f6a23a', stripe: '#cf7419', ear: '#b97a33', cream: '#ffe9c9', body: '#d6336c', skill: 1 },  /* you: orange tabby, pink kart */
        { fur: '#a3aab5', stripe: '#6b7280', ear: '#6b7280', cream: '#e5e7eb', body: '#1e3a8a', skill: 0.945 },  /* grey tabby */
        { fur: '#45424d', stripe: null, ear: '#26242b', cream: '#6b6874', body: '#0f9d8a', skill: 0.925 },  /* black cat */
        { fur: '#fbf7ef', stripe: '#e8c9a0', ear: '#e3c9a4', cream: '#ffffff', body: '#8b5cf6', skill: 0.895 }];  /* white cat */
    karts.forEach(function (c, i) {
        c.phase = i * 1.7; c.lane = (i % 2 ? 1 : -1) * 0.3 * HW;
        c.base = { fur: c.fur, stripe: c.stripe, tail: c.fur, ear: c.ear, cream: c.cream, nose: '#2b2220' };
    });
    var me = karts[0], keys = {}, pads = {}, keys2 = {};  /* keys2: player 2 on split screen */

    /* The player's own look: the cat or dog picked with the mascot (the CSS variables of cat.css, data-pet "dog" for a
       dog), ginger if missing. With a dog look the player drives as a dog (floppy ears, a snout, no whiskers) and so do
       the computer opponents, as dogs in their own fur. */
    var LOOK = (function () {
        var cs = null, de = document.documentElement, dog = de.dataset.pet === 'dog';
        try { cs = getComputedStyle(de); } catch (e) { /* ginger */ }
        function v(n, d) { var s = cs && cs.getPropertyValue(n).trim(); return /^#[0-9a-f]{3,8}$/i.test(s || '') ? s : d; }
        return { dog: dog, fur: v('--fur-bot', '#f0932c'), stripe: v('--stripe', '#cf7419'), tail: v('--tail', '#f5a03c'),
            cream: v('--cream', '#ffe9c9'), ear: v('--ear', dog ? '#b97a33' : '#de8a2c'), nose: v('--nose', '#2b2220') };
    })();
    var DOG = LOOK.dog;
    function dogify(t) {  /* what is said to a dog: woofs, not meows */
        return !DOG || typeof t !== 'string' ? t : t.replace(/Catnip zoomies!/g, 'Squeak! Zoomies!').replace(/Catnip/g, 'Squeaky toy')
            .replace(/Yarn ball/g, 'Tennis ball').replace(/Tangled in yarn!/g, 'Bonk! A tennis ball!').replace(/the yarn/g, 'the ball')
            .replace(/Milk carton/g, 'Water bowl').replace(/spilt milk/g, 'spilt water').replace(/Spilt milk/g, 'Spilt water')
            .replace(/Purrfect/g, 'Pawsome').replace(/Purr!/g, 'Woof!').replace(/Hiss!/g, 'Grr!')
            .replace(/Meow\./g, 'Arf.').replace(/[Mm]eow/g, 'Woof').replace(/ cat\b/g, ' dog').replace(/ cats\b/g, ' dogs');
    }
    /* Kart skins: the player picks one before the race (kept in localStorage "kitty-kart-skin", player 2 on split screen
       "kitty-kart-skin-2"). Each paints the body between the wheels and the driver, in kart units (nose at +x); col is
       its colour on the minimap and in the results. The computer cats keep the classic kart in their own colours. */
    var SKINS = [
        { id: 'classic', name: 'Classic', col: null, draw: function (c) {
            ctx.fillStyle = c.body; ctx.strokeStyle = 'rgba(15,23,42,.55)'; ctx.lineWidth = 1.4;
            rrect(-15, -8.5, 31, 17, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.4)'; rrect(11, -6, 4, 12, 2); ctx.fill();
        } },
        { id: 'box', name: 'Cardboard Box', col: '#c8955a', draw: function () {
            ctx.fillStyle = '#c8955a'; ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = 1.3;
            rrect(-15, -9, 31, 18, 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#a26b35'; ctx.lineWidth = 1; ctx.beginPath();  /* the folds of the lid */
            ctx.moveTo(-15, -9); ctx.lineTo(-9, -3); ctx.moveTo(-15, 9); ctx.lineTo(-9, 3); ctx.moveTo(16, -9); ctx.lineTo(10, -3); ctx.moveTo(16, 9); ctx.lineTo(10, 3); ctx.stroke();
            ctx.fillStyle = '#ecd9b0'; ctx.fillRect(9, -9, 3.5, 18);  /* tape */
            ctx.fillStyle = '#c0392b'; ctx.fillRect(-14, -1.5, 3, 3);  /* a little "this way up" mark */
        } },
        { id: 'fish', name: 'Fish', col: '#3fa7d6', draw: function () {
            ctx.fillStyle = '#2b7fae'; ctx.strokeStyle = '#1e4f6e'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-22, -8); ctx.quadraticCurveTo(-19, 0, -22, 8); ctx.closePath(); ctx.fill(); ctx.stroke();  /* tail fin */
            ctx.fillStyle = '#3fa7d6'; ctx.beginPath(); ctx.ellipse(1, 0, 16, 9, 0, 0, 7); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#a5dcf2'; ctx.beginPath(); ctx.ellipse(3, 0, 11, 3.2, 0, 0, 7); ctx.fill();  /* a pale belly line */
            ctx.strokeStyle = 'rgba(30,79,110,.5)'; ctx.lineWidth = 1;
            for (var k = -9; k <= -3; k += 3) { ctx.beginPath(); ctx.arc(k, -5, 2.6, -1.2, 1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(k, 5, 2.6, -1.2, 1.2); ctx.stroke(); }  /* scales */
            circle(ctx, 12, -4.6, 2.4, '#fff'); circle(ctx, 12, 4.6, 2.4, '#fff'); circle(ctx, 12.8, -4.6, 1.2, '#0f172a'); circle(ctx, 12.8, 4.6, 1.2, '#0f172a');
        } },
        { id: 'rocket', name: 'Rocket', col: '#ef4444', draw: function () {
            ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-21 - Math.random() * 4, 0); ctx.lineTo(-15, 4); ctx.fill();  /* the flame, always lit */
            ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(-18, -13); ctx.lineTo(-15, -7); ctx.closePath(); ctx.moveTo(-9, 7); ctx.lineTo(-18, 13); ctx.lineTo(-15, 7); ctx.closePath(); ctx.fill(); ctx.stroke();  /* fins */
            ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.moveTo(-15, -7.5); ctx.lineTo(7, -7.5); ctx.quadraticCurveTo(17, -6, 20, 0); ctx.quadraticCurveTo(17, 6, 7, 7.5); ctx.lineTo(-15, 7.5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(11, -6.6); ctx.quadraticCurveTo(17, -5.2, 20, 0); ctx.quadraticCurveTo(17, 5.2, 11, 6.6); ctx.closePath(); ctx.fill();  /* nose cone */
            circle(ctx, 8, 0, 2.6, '#38bdf8'); circle(ctx, 7.4, -0.7, 0.9, '#e0f2fe');  /* porthole */
        } },
        { id: 'patrol', name: 'Patrol', col: '#1e293b', draw: function () {
            ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.4;
            rrect(-15, -8.5, 31, 17, 5); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1e293b'; ctx.fillRect(10, -8, 5.5, 16); ctx.fillRect(-14.5, -8, 5, 16);  /* dark bonnet and boot */
            var blink = Math.floor(clock * 6) % 2;  /* the light bar */
            ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d'; rrect(6, -7, 3.2, 6, 1); ctx.fill();
            ctx.fillStyle = blink ? '#1e3a8a' : '#3b82f6'; rrect(6, 1, 3.2, 6, 1); ctx.fill();
        } },
        { id: 'retro', name: 'Retro Racer', col: '#15803d', draw: function () {
            ctx.fillStyle = '#14532d'; ctx.fillRect(-19, -9, 4, 18);  /* the wing at the back */
            ctx.fillStyle = '#15803d'; ctx.strokeStyle = '#052e16'; ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.moveTo(-15, -7.5); ctx.lineTo(9, -6.5); ctx.quadraticCurveTo(19, -4, 19, 0); ctx.quadraticCurveTo(19, 4, 9, 6.5); ctx.lineTo(-15, 7.5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#f8fafc'; ctx.fillRect(-15, -3.6, 33, 2); ctx.fillRect(-15, 1.6, 33, 2);  /* racing stripes */
            circle(ctx, 12, 0, 3.6, '#f8fafc'); ctx.fillStyle = '#052e16'; ctx.fillRect(11.4, -2, 1.3, 4);  /* a number roundel */
        } },
        { id: 'cheese', name: 'Cheese Wedge', col: '#facc15', draw: function () {
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(19, 0); ctx.lineTo(-16, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(-12, -9); ctx.lineTo(-12, 9); ctx.lineTo(-16, 10); ctx.closePath(); ctx.fill();  /* the rind */
            circle(ctx, -11, -5.5, 1.9, '#eab308'); circle(ctx, -10, 6, 1.5, '#eab308'); circle(ctx, 9, -1.4, 1.6, '#eab308'); circle(ctx, 13, 1.2, 1, '#eab308');
        } },
        { id: 'sushi', name: 'Sushi', col: '#fb7d4b', draw: function () {
            ctx.fillStyle = '#fffdf7'; ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 1.2;
            rrect(-15, -9, 31, 18, 8); ctx.fill(); ctx.stroke();  /* the rice */
            ctx.fillStyle = '#fb7d4b'; rrect(-13.5, -7, 28, 14, 6); ctx.fill();  /* a slice of salmon */
            ctx.strokeStyle = '#ffd7c2'; ctx.lineWidth = 1.2; ctx.beginPath();
            for (var k = -10; k <= 12; k += 5) { ctx.moveTo(k, -6.5); ctx.lineTo(k + 3, 6.5); }
            ctx.stroke();
            ctx.fillStyle = '#1c2b22'; ctx.fillRect(-7, -9.6, 11, 19.2);  /* the seaweed band */
        } }];
    var SKIN_BY = {};
    SKINS.forEach(function (s) { SKIN_BY[s.id] = s; });
    function kartCol(c) { var s = SKIN_BY[c.skin]; return s && s.col ? s.col : c.body; }
    var mySkin = [0, 1].map(function (n) {
        var s = null;
        try { s = localStorage.getItem(n ? 'kitty-kart-skin-2' : 'kitty-kart-skin'); } catch (e) { /* private mode */ }
        return SKIN_BY[s] ? s : 'classic';
    });
    var palKit = null;  /* racing a friend: their skin and look, as their device sent them (null: the defaults) */
    function myKit() {  /* this player's skin and look, for the friend's device */
        return { s: mySkin[0], l: { d: DOG ? 1 : 0, f: LOOK.fur, s: LOOK.stripe, t: LOOK.tail, e: LOOK.ear, c: LOOK.cream, n: LOOK.nose } };
    }
    function cleanKit(o) {  /* what the friend's device sent, checked: an unknown skin is the classic one, odd colours the defaults */
        if (!o || typeof o !== 'object') return null;
        var l = o.l && typeof o.l === 'object' ? o.l : null;
        function hex(v) { return typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : null; }
        var look = l && hex(l.f) ? { dog: l.d === 1, fur: hex(l.f), stripe: hex(l.s), tail: hex(l.t), ear: hex(l.e), cream: hex(l.c), nose: hex(l.n) } : null;
        return { skin: typeof o.s === 'string' && SKIN_BY[o.s] ? o.s : 'classic', look: look };
    }
    function dress(c, look, skin) {  /* a kart's driver (a look, or null for its own fur) and its skin */
        var b = c.base, L = look || b;
        c.fur = L.fur; c.stripe = look ? L.stripe : b.stripe; c.tail = L.tail || L.fur;
        c.ear = L.ear || b.ear; c.cream = L.cream || b.cream; c.nose = L.nose || '#2b2220';
        c.dog = look ? !!look.dog : DOG;
        c.skin = SKIN_BY[skin] ? skin : 'classic';
    }
    function kits() {  /* who drives what: the player's look and skin, player 2's skin, the friend's kit */
        karts.forEach(function (c) { dress(c, null, 'classic'); });
        dress(me, LOOK, mySkin[0]);
        if (split) dress(karts[1], null, mySkin[1]);
        else if (pal && palKit) dress(pal, palKit.look, palKit.skin);
    }
    /* the skin chooser: a row of little karts above the tracks (two rows on split screen, one in the Duo join box) */
    var skinRows = [];
    function skinPic(cnv, n, id) {  /* a kart with this skin and its driver on a button's canvas */
        var keepCtx = ctx, f = { x: 0, y: 0, a: 0, z: 0, vf: 0, steer: 0, phase: 1, body: karts[n].body, base: karts[n].base };
        dress(f, n ? null : LOOK, id);
        ctx = cnv.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cnv.width, cnv.height);
        ctx.setTransform(2.05, 0, 0, 2.05, cnv.width / 2 + 2, cnv.height / 2);
        drawKart(f);
        ctx = keepCtx;
    }
    function skinRow(n, into, before) {
        var box = document.createElement('div');
        box.className = 'kk-skins' + (n ? ' kk-sk2' : '');
        box.innerHTML = '<span class="kk-skin-lab"></span><div class="kk-skin-row"></div>';
        var row = box.querySelector('.kk-skin-row');
        var btns = SKINS.map(function (sk) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'kk-skin'; b.title = sk.name; b.setAttribute('aria-label', (n ? 'Player 2 kart: ' : 'Kart: ') + sk.name);
            b.innerHTML = '<canvas width="96" height="64"></canvas>';
            skinPic(b.firstChild, n, sk.id);
            api.on(b, 'click', function () { pickSkin(n, sk.id); });
            row.appendChild(b);
            return b;
        });
        into.insertBefore(box, before || null);
        skinRows.push({ n: n, lab: box.querySelector('.kk-skin-lab'), btns: btns });
    }
    function pickSkin(n, id) {
        mySkin[n] = id;
        try { localStorage.setItem(n ? 'kitty-kart-skin-2' : 'kitty-kart-skin', id); } catch (e) { /* private mode: fine */ }
        kits(); showSkins(); api.sfx('tap');
    }
    function showSkins() {
        skinRows.forEach(function (r) {
            var who = split ? (r.n ? 'Player 2 kart: ' : 'Player 1 kart: ') : 'Your kart: ';
            r.lab.innerHTML = '';
            r.lab.appendChild(document.createTextNode(who));
            r.lab.appendChild(document.createElement('b')).textContent = SKIN_BY[mySkin[r.n]].name;
            r.btns.forEach(function (b, i) { var on = SKINS[i].id === mySkin[r.n]; b.classList.toggle('kk-sel', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        });
    }
    function buildSkins() {
        var into = wrapEl.querySelector('.kk-skin-box');
        skinRow(0, into);
        if (split) skinRow(1, into);
        if (duo) { var js = lobbyEl.querySelector('[data-s="join"]'); skinRow(0, js, js.querySelector('.kk-lb-err')); }  /* the friend never sees the track picker */
        showSkins();
    }
    var phase = 'pick', clock = 0, raceTime = 0, finishers = 0, place = 4, camX = 0, camY = 0, shake = 0;
    var shown = { pos: '', lap: '', time: '', count: '' }, lastSay = -99, wrongFor = 0;
    var pal = null, host = false, remote = false;  /* a race with a friend: their kart, and whether this device hosts it or only shows it */

    function reset() {
        karts.forEach(function (c, i) {
            var slot = split ? GRID[i] : (i + 3) % 4, j = N - 3 - slot * 3, sd = slot % 2 ? 1 : -1;  /* you start at the back */
            c.x = X[j] - Math.sin(A[j]) * sd * HW * 0.45; c.y = Y[j] + Math.cos(A[j]) * sd * HW * 0.45;
            c.a = A[j]; c.vx = c.vy = c.vf = c.steer = c.thr = 0;
            c.k = 0; c.fin = 0; c.prog = 0; c.z = c.vz = c.slip = c.rampT = 0;
            c.item = null; c.itemT = 0; c.boost = c.shield = c.spin = c.nap = c.laser = c.fall = c.tangled = c.loose = c.sticky = c.hot = 0;
            c.useAlt = false; c.decided = -1; c.altLap = -1; c.P = persona(i); c.said = c.hitAt = -99;
            c.poof = 0; c.back = null; c.offT = 0;
            nearest(c);
            keep(c);
        });
        kits();
        parts.length = yarns.length = milks.length = rings.length = 0;
        tins.forEach(function (t) { t.t = 0; });
        slot();
        if (MAP.reset) MAP.reset();
        camX = me.x; camY = me.y;
        if (split) { views[1].camX = pal.x; views[1].camY = pal.y; }
    }
    function choose(i) {  /* switch the track shown behind the picker */
        sel = (i + MAPS.length) % MAPS.length;
        MAP = MAPS[sel];
        load(MAP);
        reset();
        dirty = true;
        fit(api.size());
        showBests();
        if (!duo && !split) { saved.map = MAP.id; persist(); }
    }
    function go() {  /* the picked track: on to the countdown */
        if (phase !== 'pick') return;
        if (duo) { picked(); return; }  /* racing a friend: the host's pick (Duo part below) */
        if (split) { splitGo(); return; }  /* two players on one phone or keyboard (Split part below) */
        phase = 'count'; clock = 0; keys = {};
        wrapEl.classList.remove('kk-picking');
        if (document.activeElement && wrapEl.contains(document.activeElement)) document.activeElement.blur();
        saved.map = MAP.id; persist();
        api.sfx('tap');
    }

    /* driving: same simple physics for everybody, the inputs come from keys, touch or the computer */
    function step(c, dt) {
        if (c.fall > 0) { c.fall -= dt; if (c.fall <= 0) respawn(c); return; }
        var ca = Math.cos(c.a), sa = Math.sin(c.a), i;
        var vf = c.vx * ca + c.vy * sa, vr = c.vy * ca - c.vx * sa, air = c.z > 0, spin = c.spin > 0;
        var off = !c.on && !air, vmax = (off ? VGRASS : c.alt ? VMAX * ALT.vf : VMAX) * (c.boost > 0 ? 1.3 : 1) * (c.nap > 0 ? 0.55 : 1) *
            (c.sticky > 0 ? 0.5 : 1) * (c.loose > 0 ? 0.85 : 1) * (c.hot > 0 ? 0.4 : 1);
        var acc = ACC * (c.boost > 0 ? 1.8 : 1), thr = air || spin ? 0 : c.thr;
        if (thr > 0) vf += (vf < 0 ? BRAKE : acc * Math.max(0, 1 - vf / vmax)) * thr * dt;
        else if (thr < 0) vf += (vf > 0 ? BRAKE : ACC * 0.5 * Math.max(0, 1 + vf / REV)) * thr * dt;
        else if (!air) vf -= vf * (spin ? 2.4 : COAST) * dt;
        if (vf > vmax) vf -= (vf - vmax) * 2.6 * dt;  /* the grass (or a nap) slows you down */
        if (!air) vr *= Math.max(0, 1 - (off ? GRIPOFF : GRIP) * (c.slip > 0 ? 0.12 : 1) * (c.loose > 0 ? 0.35 : 1) * dt);  /* grip: a little slide, not much */
        var sp = Math.abs(vf), turn = air || spin ? 0 : c.steer * TURN * Math.min(1, sp / 60) * (1 - 0.25 * Math.min(1, sp / VMAX));
        c.a += (vf < 0 ? -turn : turn) * dt + (spin ? c.spinK * dt : 0);
        ca = Math.cos(c.a); sa = Math.sin(c.a);
        c.vx = ca * vf - sa * vr; c.vy = sa * vf + ca * vr; c.vf = vf;
        c.x += c.vx * dt; c.y += c.vy * dt; c.odo += Math.hypot(c.vx, c.vy) * dt;  /* odo: the way driven since the kart was last by the road */
        c.slip -= dt; c.boost -= dt; c.nap -= dt; c.spin -= dt; c.shield -= dt; c.laser -= dt; c.tangled -= dt;
        c.loose -= dt; c.sticky -= dt; c.hot -= dt; c.rampT -= dt;
        if (MAP.effect) MAP.effect(c, dt);
        if (c.fall > 0) return;
        if (c.z > 0 || c.vz > 0) {  /* in the air: ramps, heat vents */
            c.z += c.vz * dt; c.vz -= (MAP.G || 420) * dt;
            if (c.z <= 0) {
                c.z = c.vz = 0;
                for (i = 0; i < 6; i++) puff('dust', c.x, c.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, 0.8, 5 + Math.random() * 5);
                sfx(c, 'tap');
            }
        } else {
            if (c.rampT <= 0 && c.vf > 110) {  /* ramps on the road and on the shortcut */
                var rp = MAP.ramps || [], up = ALT && ALT.ramp !== undefined && c.alt && Math.abs(c.ai - ALT.ramp) <= 1;
                for (i = 0; i < rp.length && !up; i++) if (!c.alt && (c.idx - rp[i] + N) % N <= 1 && c.dist < HW) up = true;
                if (up) {
                    c.vz = c.vf * (MAP.jumpK || 0.22); c.z = 0.01; c.rampT = 1.5;
                    sfx(c, 'jump'); if (quiet(c, 6) && MAP.jumpSay) say(MAP.jumpSay, c);
                }
            }
            if (!(c.z > 0) && ALT && c.alt) {  /* falling into a gap, or off a narrow shortcut */
                if (ALT.g0 !== undefined && c.ai >= ALT.g0 && c.ai <= ALT.g1) { fallOff(c, ALT.a); return; }
                if (ALT.edge && c.ai > ALT.ein && c.ai < ALT.n - 1 - ALT.ein && c.dist > ALT.hw + 6 && mainDist(c.x, c.y) > HW + 40) { fallOff(c, ALT.a); return; }  /* on or by the main road: no fall */
            }
            if (MAP.bridge && !c.alt && inBridge(c.idx) && c.dist > MAP.bridge.hw + 4) { fallOff(c, MAP.bridge.i0); return; }  /* off the planks */
        }
        if (!air) for (i = 0; i < boosts.length; i++) {  /* boost pads */
            var b = boosts[i], dx = c.x - b.x, dy = c.y - b.y;
            if (Math.abs(dx * b.ca + dy * b.sa) < 24 && Math.abs(dy * b.ca - dx * b.sa) < 20) {
                if (c.boost < 0.5) { stat('pad'); sfx(c, 'point'); }
                c.boost = Math.max(c.boost, 1);
            }
        }
        if (ALT && ALT.gate && !MAP.gateSoft && gateOpen(clock) < 0.5) {  /* the shortcut gate is shut: it is a wall */
            var gi = ALT.gate.i, gc = Math.cos(ALT.ang[gi]), gs = Math.sin(ALT.ang[gi]), gx = c.x - ALT.x[gi], gy = c.y - ALT.y[gi];
            var gu = gx * gc + gy * gs, gw = gy * gc - gx * gs;
            if (Math.abs(gw) < ALT.hw + 14 && Math.abs(gu) < 10) {
                var vn = c.vx * gc + c.vy * gs, back = vn > 0 ? -10 : 10;
                c.x += gc * (back - gu); c.y += gs * (back - gu);
                c.vx -= gc * vn * 1.3; c.vy -= gs * vn * 1.3;
                if (Math.abs(vn) > 40 && clock - (c.gateT || -9) > 0.6) {
                    c.gateT = clock; stat('gate');
                    sfx(c, 'hit'); if (quiet(c, 3)) say(MAP.gate === 'boom' ? 'Barrier down! Wait for it.' : 'Bonk! The gate is shut.', c);
                }
            }
        }
        if (c.x < 30 || c.x > WW - 30) { c.x = clamp(c.x, 30, WW - 30); c.vx *= -0.3; }  /* the fence around the field */
        if (c.y < 30 || c.y > WH - 30) { c.y = clamp(c.y, 30, WH - 30); c.vy *= -0.3; }
    }
    /* ---------- no big shortcuts: a kart that leaves the road is put back on it ----------
       Every kart remembers the last place it was by the road (keep) and how far it drove since (odo). Too far from the
       road (more than OFF past its edge, the nearest road being the main road or the shortcut): the player sees
       "Turn back!" with a flashing arrow to the road (offWarn, in draw); still out after OFFT seconds, or more than
       OFF2 past the edge, the kart is put back where it left the road, facing forward, with a puff of smoke (rescue).
       Only karts driven by people (mine: the player, both players on split screen, the friend when hosting); the
       computer cats keep to the road on their own and only get the cut check.
       And where two parts of the road run close together a kart could hop across without going far: back by the
       road, if the route from where it left to here is more than CUT longer than the way it drove, it cut across and
       is put back the same way (cutCheck). Not in the air (ramp jumps) and not while falling. */
    var CUT = 300, OFF = 55, OFF2 = 150, OFFT = 1;
    function keep(c) { c.sIdx = c.idx; c.sAlt = !!c.alt; c.sAi = c.ai || 0; c.odo = 0; }
    function skipped(c) {  /* how far along the route the kart got since it was last by the road; -1 when it went back */
        var d;
        if (!c.sAlt && !c.alt) { d = (c.idx - c.sIdx + N) % N; return d < N / 2 ? d * SP : -1; }
        if (!c.sAlt) { d = (ALT.a - c.sIdx + N) % N; return d < N / 2 ? d * SP + c.ai * ALT.step : -1; }
        if (!c.alt) { d = (c.idx - ALT.b + N) % N; return d < N / 2 ? (ALT.n - 1 - c.sAi) * ALT.step + d * SP : -1; }
        return (c.ai - c.sAi) * ALT.step;
    }
    function cutCheck(c) {  /* after nearest(c): true while the kart is being put back (its progress waits) */
        if (c.fall > 0) return c.poof > 0;
        if (c.z > 0 || c.dist > (c.alt ? ALT.hw : HW) + 40) return false;
        if (skipped(c) - c.odo > CUT) { rescue(c); return true; }
        keep(c);
        return false;
    }
    function offCheck(c, dt) {  /* after nearest(c): true when the kart was too far out and is being put back (people only) */
        if (!mine(c) || c.fall > 0 || c.z > 0) return false;
        var out = c.dist - (c.alt ? ALT.hw : HW);
        c.offT = out > OFF ? (c.offT || 0) + dt : 0;
        if (c.offT > OFFT || out > OFF2) { rescue(c, 'Too far off the track! Back you go.'); return true; }
        return false;
    }
    function offWarn(c) {  /* how far out the player is, for the warning: > 0 means past OFF (works on the friend's device too) */
        if (phase !== 'race' || c.fin || c.fall > 0 || c.z > 0) return 0;
        return c.dist - (c.alt ? ALT.hw : HW) - OFF;
    }
    function rescue(c, why) {
        var i, a = c.sAlt && ALT;
        c.back = { x: a ? ALT.x[c.sAi] : X[c.sIdx], y: a ? ALT.y[c.sAi] : Y[c.sIdx], a: a ? ALT.ang[c.sAi] : A[c.sIdx], alt: !!a };
        c.fall = 1.1; c.poof = 1; c.offT = 0; c.vx = c.vy = c.vf = 0; c.z = c.vz = 0; stat((why ? 'off' : 'cut') + (mine(c) ? '-me' : '-ai'));
        for (i = 0; i < 10; i++) puff('dust', c.x, c.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, 0.8, 6 + Math.random() * 6);
        if (mine(c)) { sfx(c, 'move'); mood(c, 'sad'); say(why || 'No cutting across! Back to the track.', c); }
    }
    function autopilot(c, skill) {
        var look = Math.round((34 + Math.abs(c.vf) * 0.32) / SP), j = routeAt(c, look), lane = c.lane * Math.sin(clock * 0.35 + c.phase);
        if (j < 0) lane *= 0.3;
        else if (!c.item) lane = tinLane(c, lane);
        lane = narrow(c, j, lane);
        var tx = rX(j) - Math.sin(rA(j)) * lane, ty = rY(j) + Math.cos(rA(j)) * lane;
        c.steer = clamp(wrap(Math.atan2(ty - c.y, tx - c.x) - c.a) * 3, -1, 1);
        var km = 0;
        for (var i = 1; i < 26; i++) km = Math.max(km, Math.abs(rK(routeAt(c, i))));
        var vt = VMAX * skill / (1 + km * 80 * CARE), rash = c === me && test && test.rash;
        if (rash && test.slowAlt && (c.useAlt || c.alt)) vt = 110;  /* test only: too slow for the moon crack */
        c.thr = c.vf < vt ? 1 : c.vf > vt + 30 ? -0.7 : 0;
        obey(c, rash);
    }
    function obey(c, rash) {  /* what every computer cat does: chase a red dot, wait for gates and trams */
        if (c.laser > 0) { c.steer = clamp(wrap(Math.atan2(c.doty - c.y, c.dotx - c.x) - c.a) * 3, -1, 1); c.thr = 0.6; }
        var dg = toGate(c);
        if (rash) return;  /* test only: drive into gates and trams */
        if (dg > 0 && dg < 170 && gateOpen(clock + dg / Math.max(c.vf, 80)) < 0.6) c.thr = c.vf > 15 ? -1 : 0;
        if (MAP.wait && MAP.wait(c)) c.thr = c.vf > 10 ? -1 : 0;
    }

