/* Yarn Smash: an endless cat run through seven fantastical worlds, throwing yarn to shatter the glass on the way.
   Pseudo-3D: x across, y up, z forward. The path bends (centre line cx(z), the camera looks along its tangent camS) and
   rolls up and down (hy(z), applied as a projection warp, so the physics stays flat): a world point projects to
   sx = CX + (x - camX - camS dz) F / dz, sy = HOR - (y - EYE + hy(z) - camHY) F / dz, with HOR the horizon line.
   The world is painted far to near in strips (one world per strip); glass, targets and scenery are drawn between the
   strips they stand in. Every ZL metres a rift gate leads into the next world. Nothing is ever cut: sky, fog and light
   crossfade over the last metres before a gate, each world's walls and scenery grow out of the ground after a gate and
   sink back before the next one, and everything fades in from the fog. All text sits in a slim band at the top.
   Yarn is the ammo, the game ends at 0. Glass critters hover ahead and take turns to attack after a red wind-up ring;
   rows are spaced by speed, every sixth is a breather, and a short grace after any hit stops hits piling up.
   With a dog look (data-pet "dog") the paws are a dog's (claws, dark pads, no stripes) and the lines say woof;
   the yarn balls become tennis balls (same sizes and tones, the plain pink one yellow-green) and every text says
   balls instead of yarn (yt).
   Shell API: arcade.js. */
Arcade.register('yarn-smash', function (api) {
    'use strict';
    api.css(
        '.ys, .ys-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
        '.ys { overflow: hidden; background: #241c3c; }' +
        '.ys-cv { touch-action: none; cursor: crosshair; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }');

    /* ---------- constants and small helpers ---------- */
    var EYE = 1.2, NEAR = 0.3, FAR = 46, G = 9, BALL_V = 24, BR = 0.11, ZL = 200, GROW = 18;
    var RM = !!api.reducedMotion, MAXP = RM ? 110 : 220, NMOTE = RM ? 14 : 44;
    var DW = 1.3, DH = 2.15, OW = 1.35, OH = 2.1;            /* hatch door; rift gate arch (half width, height of the sides) */
    var FUR = '#f6a23a', STRIPE = '#cf7419', OL = '#3b2a1e', BEAN = '#f7a6bf', TAU = Math.PI * 2;
    var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
    function lerpc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')'; }
    function fogf(dz) { var x = clamp((dz - 2) / (Math.min(FAR, VISF + 12) - 2), 0, 1); return x * (1.4 - 0.4 * x); }
    function fade(dz) { return smooth((VISF - dz) / (5 + 7 * (VISF - 18) / (FAR - 18))); }  /* things appear out of the fog over the last 12 m (5 m behind the waterfall) */
    function mixc(c, fog, f, k) {
        k = k || 1;
        var r = Math.min(255, c[0] * k), g = Math.min(255, c[1] * k), b = Math.min(255, c[2] * k);
        return 'rgb(' + ((r + (fog[0] - r) * f) | 0) + ',' + ((g + (fog[1] - g) * f) | 0) + ',' + ((b + (fog[2] - b) * f) | 0) + ')';
    }
    function mixa(c, fog, f, a) {
        return 'rgba(' + ((c[0] + (fog[0] - c[0]) * f) | 0) + ',' + ((c[1] + (fog[1] - c[1]) * f) | 0) + ',' + ((c[2] + (fog[2] - c[2]) * f) | 0) + ',' + a + ')';
    }
    function seeded(n) { var s = n; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

    /* ---------- page ---------- */
    var wrapEl = document.createElement('div');
    wrapEl.className = 'ys';
    wrapEl.innerHTML = '<canvas class="ys-cv"></canvas>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.ys-cv'), ctx = cv.getContext('2d', { alpha: false });
    var dpr = 1, W = 1, H = 1, F = 1, CX = 0, HY = 0, PAW = 50, SKYM = 100, SKYV = 40, SS = 1, skyCache = {}, sprCache = {}, glowCache = {}, vignette = null;

    /* ---------- state ---------- */
    var camZ = 0, camX = 0, camS = 0, camHY = 0, camT = 0, HOR = 0, speed = 0, clock = 0, playT = 0, phase = 'play', balls = 15, bonus = 0;
    var smashed = 0, shownScore = -1, streak = 0, multi = 1, lastThrow = -9, stumble = 1, zoomT = 0, slowT = 0, bigT = 0, shake = 0, flash = 0;
    var runPh = 0, curZi = -1, thrown = false, firstPane = true, lowWarned = false, lastSay = -99, tips = {};
    var boltT = 0, VISF = 46, magT = 0, ricoT = 0, throwsN = 0, hitsN = 0, bestStreak = 0, guard = null, lockT = -1;
    var charge = { id: null, x: 0, y: 0, t0: 0, v: 0, key: false };
    var ents = [], groups = [], props = [], flying = [], parts = [], rings = [], pops = [], motes = [], paws = [0, 0];
    var nextZ = 18, propZ = -4, nextGate = 1, lastDoorZ = -99, lastDotZ = -99, lastCritZ = -99, rowN = 0, lastPowZ = 40, powKind = 0, prepZi = -1;
    var envA = 0, envB = 0, envW = 0, FOG = [0, 0, 0];
    var toast = { text: '', c: '#fff', t: 9 }, banner = { zi: 0, t: 0, dur: 4.2 }, yarnTick = { n: 0, t: 9 }, ptsTick = { n: 0, t: 9 };
    var px = 0, py = 0, pk = 0, SX = 0, SY = 0, SZ = 0, SR = 0, QX = 0, QA = 0, QY = 0, HIT = null, QD = [0, 0, 0, 0, 0, 0, 0, 0];

    /* ---------- the six worlds ---------- */
    function shardCols(cs) { return cs.map(function (c) { return 'rgba(' + c.join(',') + ','; }); }
    var ZONES = [
        { key: 'isles', name: 'Skyfall Isles', sub: 'Floating glass rises and falls: smash it or run under it', accent: '#ff8a5c', chat: 'Islands in the sky!',
          fog: [255, 205, 188], amb: 1, bend: 1.0, hill: 1.15, hw: 1.6, paneH: 2.0, top: 4.6, lampY: 0, dot: 0.14, stand: 'plinth', standX: 1.32, mote: 'petal',
          glass: { frame: '#fff1d8', tint: [255, 240, 234], edge: [255, 178, 140], shards: shardCols([[255, 214, 196], [255, 244, 236], [255, 255, 255]]) },
          gate: [255, 150, 100], gate2: [255, 232, 170], post: [214, 200, 186] },
        { key: 'glow', name: 'Glowcap Hollow', sub: 'Ghost glass fades in and out with the glow', accent: '#3fe3c4', chat: 'Glowing mushrooms!',
          fog: [26, 46, 80], amb: 0.6, bend: 0.6, hill: 0.6, hw: 1.5, paneH: 2.3, top: 4.2, lampY: 4.4, lampL: 1.4, dot: 0.12, stand: 'stump', standX: 1.48, mote: 'spore',
          glass: { frame: '#8cf8e0', tint: [120, 255, 222], edge: [80, 255, 210], glow: [70, 255, 205], shards: shardCols([[120, 255, 222], [200, 150, 255], [230, 255, 250]]) },
          gate: [63, 227, 196], gate2: [206, 130, 255], post: [222, 214, 190] },
        { key: 'geode', name: 'Geode Depths', sub: 'Geode glass is tough: it takes 2 hits', accent: '#b98cff', chat: 'A sparkly cave!',
          fog: [56, 28, 86], amb: 0.82, bend: 1.15, hill: 0, hw: 2.0, paneH: 2.4, top: 3.0, lampY: 0, dot: 0.1, stand: 'geo', standX: 1.62, mote: 'spark',
          glass: { frame: '#e6ccff', tint: [206, 172, 255], edge: [200, 150, 255], glow: [180, 120, 255], shards: shardCols([[214, 180, 255], [150, 230, 255], [255, 255, 255]]) },
          gate: [185, 140, 255], gate2: [120, 232, 255], post: [150, 110, 210] },
        { key: 'aurora', name: 'Aurora Palace', sub: 'Ice panes slide: time it or smash it', accent: '#72d6ff', chat: 'Brr, an ice palace!',
          fog: [92, 128, 178], amb: 0.92, bend: 0.35, hill: 0.3, hw: 2.0, paneH: 2.3, top: 4.4, lampY: 0, dot: 0.12, stand: 'ice', standX: 2.06, mote: 'snow',
          glass: { frame: '#f0fbff', tint: [214, 242, 255], edge: [170, 230, 255], shards: shardCols([[214, 242, 255], [240, 252, 255], [180, 255, 220]]) },
          gate: [120, 220, 255], gate2: [170, 255, 205], post: [226, 244, 255] },
        { key: 'clock', name: 'Clockwork Spire', sub: 'Spinning panes and gear hatches', accent: '#f2a73c', chat: 'Tick tock, gears!',
          fog: [126, 80, 46], amb: 0.86, bend: 0.8, hill: 0, hw: 1.55, paneH: 2.3, top: 4.3, lampY: 4.6, lampL: 1.5, dot: 0.1, stand: 'crate', standX: 1.18, mote: 'ember',
          glass: { frame: '#dba04a', tint: [255, 216, 160], edge: [255, 196, 110], shards: shardCols([[255, 216, 160], [255, 240, 210], [255, 255, 255]]) },
          gate: [242, 167, 60], gate2: [255, 232, 176], post: [196, 140, 64] },
        { key: 'wool', name: 'Woolly Dreamland', sub: 'Soap bubbles float up: pop them or let them rise', accent: '#ff8fd0', chat: 'So soft! So fluffy!',
          fog: [255, 222, 238], amb: 0.97, bend: 0.7, hill: 1.3, hw: 1.6, paneH: 2.2, top: 4.6, lampY: 0, dot: 0.12, stand: 'spool', standX: 1.3, mote: 'fluff',
          glass: { frame: '#ffffff', tint: [255, 232, 248], edge: [196, 170, 255], shards: shardCols([[255, 200, 232], [200, 236, 255], [255, 255, 255]]) },
          gate: [255, 150, 212], gate2: [170, 240, 255], post: [244, 238, 252] },
        { key: 'stars', name: 'Starlight Road', sub: 'Airlocks, and every trick at once', accent: '#ff7fd8', chat: 'Space! Mrrow!',
          fog: [42, 28, 80], amb: 0.68, bend: 1.0, hill: 1.35, hw: 1.5, paneH: 2.3, top: 4.6, lampY: 0, dot: 0.12, stand: 'rock', standX: 1.24, mote: 'star',
          glass: { frame: '#aaf4ff', tint: [190, 210, 255], edge: [140, 220, 255], glow: [120, 220, 255], shards: shardCols([[190, 210, 255], [255, 170, 230], [255, 255, 255]]) },
          gate: [255, 127, 216], gate2: [140, 232, 255], post: [120, 110, 190] }
    ];
    var NZ = ZONES.length, K = {};
    ZONES.forEach(function (Z, i) { K[Z.key] = Z; Z.i = i; });

    /* the cat's colours follow the look picked with the corner mascot (CSS variables of cat.css), ginger if missing */
    var SK = { fur: FUR, light: '#ffc06e', stripe: STRIPE, toe: FUR, line: OL, dog: false, ear: '#b97a33', nose: '#2b2220' }, skinT = -9;
    function readSkin() {
        var cs = null;
        try { cs = getComputedStyle(document.documentElement); } catch (e) { /* ginger */ }
        function v(name, dflt) { var s = cs && cs.getPropertyValue(name).trim(); return s || dflt; }
        var look = document.documentElement.getAttribute('data-cat') || 'ginger';
        SK.fur = v('--fur-bot', FUR); SK.light = v('--fur-top', '#ffc06e'); SK.stripe = v('--stripe', STRIPE);
        SK.toe = look === 'tuxedo' ? v('--cream', '#f6f6f4') : SK.fur;
        SK.line = look === 'tuxedo' || look === 'bat' || look === 'dog-bat' || look === 'hacker' ? '#17181c' : OL;
        SK.dog = document.documentElement.getAttribute('data-pet') === 'dog';   /* a dog: --ear and --nose too */
        SK.ear = v('--ear', '#b97a33'); SK.nose = v('--nose', '#2b2220');
        if (SK.dog) { SK.toe = SK.fur; SK.line = OL; }
    }

    /* ---------- path ---------- */
    function zoneIdx(z) { return Math.max(0, Math.floor(z / ZL)); }
    function zoneOf(z) { return ZONES[zoneIdx(z) % NZ]; }
    function eased(z, key) {  /* a world's bend or roll, eased in from the previous world's over 36 m */
        var zi = zoneIdx(z), u = z - zi * ZL, a = ZONES[zi % NZ][key];
        if (u < 36 && zi > 0) { var p = ZONES[(zi - 1) % NZ][key]; return p + (a - p) * smooth(u / 36); }
        return a;
    }
    function cx(z) { return eased(z, 'bend') * (2.4 * Math.sin(z / 26) + 1.1 * Math.sin(z / 11.3 + 1.3)); }
    function hy(z) { return eased(z, 'hill') * (0.9 * Math.sin(z / 31 + 0.7) + 0.45 * Math.sin(z / 13.7 + 2)); }
    function growAt(z) {  /* 0 at the gates, 1 inside a world: walls and scenery grow out of the ground */
        var zi = zoneIdx(z), u = z - zi * ZL;
        return smooth(Math.min(zi > 0 ? (u - 4) / GROW : 1, (ZL - 4 - u) / GROW));
    }
    function env(z) {  /* which worlds the camera sees, and how far it is blended into the next one */
        var zi = zoneIdx(z), u = z - zi * ZL, TA = 38, TB = 8;
        if (u > ZL - TA) { envA = zi; envB = zi + 1; envW = smooth((u - (ZL - TA)) / (TA + TB)); }
        else if (u < TB && zi > 0) { envA = zi - 1; envB = zi; envW = smooth((u + TA) / (TA + TB)); }
        else { envA = envB = zi; envW = 0; }
        FOG = lerpc(ZONES[envA % NZ].fog, ZONES[envB % NZ].fog, envW);
    }

    function P(x, y, z) {  /* project a world point into px, py; pk = pixels per metre there */
        var dz = z - camZ;
        if (dz < NEAR) return false;
        pk = F / dz; px = CX + (x - camX - camS * dz) * pk; py = HOR - (y - EYE + hy(z) - camHY) * pk;
        return true;
    }
    function PL(lx, y, z) { return P(cx(z) + lx, y, z); }

    function fit(s) {
        W = Math.max(1, s.w); H = Math.max(1, s.h);
        dpr = Math.min(window.devicePixelRatio || 1, 2, Math.max(0.75, Math.sqrt(2.4e6 / (W * H))));
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        F = Math.min(W * (W < H ? 1.12 : 0.92), H * 0.95);  /* portrait phones: a closer view, bigger targets */
        CX = W / 2; HY = H * (W < H ? 0.46 : 0.43);
        PAW = clamp(Math.min(W, H) * 0.1, 34, 68);
        SKYM = Math.ceil(F * 0.32); SKYV = Math.ceil(F * 0.11) + 4;
        var ss = Math.min(dpr, 1.5);
        if (ss !== SS) { SS = ss; sprCache = {}; glowCache = {}; }
        skyCache = {}; vignette = null;
    }

    /* ---------- a ball of wool (same look as the other games): drawn once per size, then rotated for the spin ---------- */
    var WOOL = {
        pink:   { base: '#f783ac', light: '#ffd0e0', dark: '#c2255c', lo: 'rgba(255, 228, 238, .7)', hi: 'rgba(166, 30, 77, .38)' },
        orange: { base: '#fb9a4b', light: '#ffe0bf', dark: '#c2410c', lo: 'rgba(255, 237, 213, .7)', hi: 'rgba(154, 52, 18, .38)' },
        violet: { base: '#b08cff', light: '#efe4ff', dark: '#6a3fd0', lo: 'rgba(240, 232, 255, .7)', hi: 'rgba(80, 40, 160, .38)' },
        mint:   { base: '#7fd8b4', light: '#e2fff2', dark: '#2f9a74', lo: 'rgba(230, 255, 244, .7)', hi: 'rgba(30, 110, 80, .38)' },
        gold:   { base: '#ffc24a', light: '#fff1c4', dark: '#c27a0c', lo: 'rgba(255, 246, 214, .7)', hi: 'rgba(150, 90, 10, .4)' }
    };
    var woolCache = {};
    function woolImg(r, tone) {
        r = r < 10 ? Math.max(2, Math.round(r * 2) / 2) : Math.round(r);
        var key = r + tone + dpr;
        if (woolCache[key]) return woolCache[key];
        var C = WOOL[tone], S = Math.ceil(r * 2.4 + 2), o = S / 2, cvs = document.createElement('canvas');
        cvs.width = cvs.height = Math.ceil(S * dpr);
        var c = cvs.getContext('2d'), small = r < 10, lw = small ? Math.max(0.8, r * 0.1) : Math.max(0.7, r * 0.04);
        c.scale(dpr, dpr);
        c.lineCap = 'round';
        var gr = c.createRadialGradient(o - r * 0.4, o - r * 0.45, r * 0.1, o, o, r * 1.05);
        gr.addColorStop(0, C.light); gr.addColorStop(0.45, C.base); gr.addColorStop(1, C.dark);
        c.fillStyle = gr;
        c.beginPath(); c.arc(o, o, r, 0, TAU); c.fill();
        c.save();
        c.beginPath(); c.arc(o, o, r, 0, TAU); c.clip();
        var bands = small ? [[0.5, 0.55, -0.25], [-1.0, 0.7, 0.2]] : [[0.45, 0.5, -0.35], [-1.05, 0.65, 0.15], [2.0, 0.45, -0.05], [3.6, 0.7, 0.4]];
        for (var b = 0; b < bands.length; b++) {
            var a = bands[b][0], k = bands[b][1], n = small ? 4 : 5, gapS = r * (small ? 0.16 : 0.085);
            var nx = -Math.sin(a), ny = Math.cos(a);
            c.fillStyle = C.hi; c.globalAlpha = 0.3;
            c.beginPath(); c.ellipse(o + nx * bands[b][2] * r, o + ny * bands[b][2] * r, r * 1.05, r * k + gapS * n / 2, a, 0, Math.PI);
            c.ellipse(o + nx * bands[b][2] * r, o + ny * bands[b][2] * r, r * 1.05, Math.max(0, r * k - gapS * n / 2), a, Math.PI, 0, true);
            c.fill();
            c.globalAlpha = 1;
            for (var i = 0; i < n; i++) {
                var d = (i - (n - 1) / 2) * gapS + bands[b][2] * r;
                c.strokeStyle = i % 2 ? C.hi : C.lo; c.lineWidth = lw;
                c.beginPath(); c.ellipse(o + nx * d, o + ny * d, r * 1.05, r * k, a, 0, Math.PI); c.stroke();
            }
        }
        var sh = c.createRadialGradient(o - r * 0.3, o - r * 0.35, r * 0.3, o, o, r);
        sh.addColorStop(0, 'rgba(255, 255, 255, 0)'); sh.addColorStop(0.7, 'rgba(0, 0, 0, 0)'); sh.addColorStop(1, 'rgba(90, 20, 50, .28)');
        c.fillStyle = sh; c.fillRect(o - r, o - r, r * 2, r * 2);
        c.restore();
        var hl = c.createRadialGradient(o - r * 0.42, o - r * 0.45, 0, o - r * 0.42, o - r * 0.45, r * 0.42);
        hl.addColorStop(0, 'rgba(255, 255, 255, .65)'); hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
        c.fillStyle = hl; c.beginPath(); c.arc(o - r * 0.42, o - r * 0.45, r * 0.42, 0, TAU); c.fill();
        c.strokeStyle = C.dark; c.lineWidth = Math.max(0.8, r * 0.07);
        c.beginPath(); c.arc(o, o, r - c.lineWidth / 2, 0, TAU); c.stroke();
        woolCache[key] = { cv: cvs, s: S };
        return woolCache[key];
    }
    /* dog mode: a tennis ball in the same size and tone (the plain pink one is the classic yellow-green), two white seams */
    var TENNIS = { base: '#d4e85a', light: '#f4ffb0', dark: '#8aa21c' };
    function tennisImg(r, tone) {
        r = r < 10 ? Math.max(2, Math.round(r * 2) / 2) : Math.round(r);
        var key = 't' + r + tone + dpr;
        if (woolCache[key]) return woolCache[key];
        var C = tone === 'pink' ? TENNIS : WOOL[tone], S = Math.ceil(r * 2.4 + 2), o = S / 2, cvs = document.createElement('canvas');
        cvs.width = cvs.height = Math.ceil(S * dpr);
        var c = cvs.getContext('2d');
        c.scale(dpr, dpr);
        var gr = c.createRadialGradient(o - r * 0.4, o - r * 0.45, r * 0.1, o, o, r * 1.05);
        gr.addColorStop(0, C.light); gr.addColorStop(0.5, C.base); gr.addColorStop(1, C.dark);
        c.fillStyle = gr;
        c.beginPath(); c.arc(o, o, r, 0, TAU); c.fill();
        c.save();
        c.beginPath(); c.arc(o, o, r, 0, TAU); c.clip();
        c.strokeStyle = 'rgba(255, 255, 255, .92)'; c.lineWidth = Math.max(0.9, r * 0.14);
        c.beginPath(); c.arc(o - r * 1.3, o, r * 0.95, -1.2, 1.2); c.stroke();   /* the two seams */
        c.beginPath(); c.arc(o + r * 1.3, o, r * 0.95, Math.PI - 1.2, Math.PI + 1.2); c.stroke();
        c.restore();
        var hl = c.createRadialGradient(o - r * 0.42, o - r * 0.45, 0, o - r * 0.42, o - r * 0.45, r * 0.42);
        hl.addColorStop(0, 'rgba(255, 255, 255, .5)'); hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
        c.fillStyle = hl; c.beginPath(); c.arc(o - r * 0.42, o - r * 0.45, r * 0.42, 0, TAU); c.fill();
        c.strokeStyle = C.dark; c.lineWidth = Math.max(0.8, r * 0.07);
        c.beginPath(); c.arc(o, o, r - c.lineWidth / 2, 0, TAU); c.stroke();
        woolCache[key] = { cv: cvs, s: S };
        return woolCache[key];
    }
    /* dog mode texts: tennis balls instead of yarn */
    function yt(s) {
        if (!SK.dog || !s) return s;
        return s.replace('Triple yarn! Mrrow!', 'Triple balls! Woof!').replace('Catnip!', 'Fetch!').replace(/a ball of yarn/g, 'a tennis ball')
            .replace(/ball of yarn/g, 'tennis ball').replace(/Giant yarn/g, 'Giant ball').replace(/\byarn\b/g, 'balls').replace(/\bYarn\b/g, 'Balls');
    }
    function wool(x, y, r, a, tone) {
        var w = (SK.dog ? tennisImg : woolImg)(r, tone || 'pink');
        ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a);
        ctx.drawImage(w.cv, -w.s / 2, -w.s / 2, w.s, w.s);
        ctx.restore();
    }

    /* ---------- skies: one cached canvas per world, wider and taller than the screen, shifted as the path turns and rolls ---------- */
    function vgrad(g, y0, y1, stops) {
        var gr = g.createLinearGradient(0, y0, 0, y1);
        stops.forEach(function (s) { gr.addColorStop(clamp(s[0], 0, 1), rgba(s[1], s[2])); });
        return gr;
    }
    function glowAt(g, x, y, r, c, a, sy) {
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.45, rgba(c, a * 0.42)); gr.addColorStop(1, rgba(c, 0));
        g.save(); g.translate(x, y); g.scale(1, sy || 1); g.translate(-x, -y);
        g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        g.restore();
    }
    function starsAt(g, w, y0, y1, n, r, a) {
        g.fillStyle = '#ffffff';
        for (var i = 0; i < n; i++) {
            var s = r() < 0.07 ? 2.1 : r() < 0.4 ? 1.4 : 0.9, x = r() * w, y = y0 + r() * (y1 - y0);
            g.globalAlpha = a * (0.25 + 0.75 * r());
            g.fillRect(x, y, s, s);
            if (s > 2) { g.globalAlpha *= 0.5; g.fillRect(x - 3, y + 0.5, 8, 1); g.fillRect(x + 0.5, y - 3, 1, 8); }
        }
        g.globalAlpha = 1;
    }
    function gearPath(g, x, y, r, n, tooth) {
        g.beginPath();
        for (var i = 0; i < n * 4; i++) {
            var a = i / (n * 4) * TAU, rr = (i % 4 < 2) ? r : r - tooth;
            if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.closePath();
    }
    function puffRow(g, w, y, rad, top, low, r) {  /* a row of soft cloud puffs: shaded underneath, lit on top, feathered edges */
        for (var x = -rad; x < w + rad; x += rad * (0.9 + r() * 0.8)) {
            var rr = rad * (0.75 + r() * 0.7), yy = y + (r() - 0.5) * rad * 0.3, gl = g.createRadialGradient(x, yy + rr * 0.3, 0, x, yy + rr * 0.3, rr * 1.15);
            gl.addColorStop(0, rgba(low, 0.5)); gl.addColorStop(1, rgba(low, 0));
            g.fillStyle = gl; g.fillRect(x - rr * 1.2, yy - rr * 0.9, rr * 2.4, rr * 2.4);
            var gt = g.createRadialGradient(x - rr * 0.2, yy - rr * 0.3, 0, x, yy, rr);
            gt.addColorStop(0, rgba(top, 0.95)); gt.addColorStop(0.55, rgba(top, 0.55)); gt.addColorStop(1, rgba(top, 0));
            g.fillStyle = gt; g.fillRect(x - rr, yy - rr, rr * 2, rr * 2);
        }
    }
    var SKY = {
        isles: function (g, w, h, hor, r) {  /* a sunset above a sea of clouds, far islands with waterfalls */
            var Z = K.isles, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [40, 50, 128]], [hor * 0.4 / h, [96, 100, 190]], [hor * 0.74 / h, [214, 146, 182]],
                                          [(hor - 0.035 * u) / h, [255, 184, 168]], [hor / h, Z.fog], [(hor + 0.05 * u) / h, [255, 220, 210]], [1, [226, 170, 196]]]);
            g.fillRect(0, 0, w, h);
            starsAt(g, w, 0, hor * 0.32, 50, r, 0.55);
            var sx = w * 0.63, sy = hor - 0.075 * u;
            glowAt(g, sx, sy, 0.95 * u, [255, 196, 150], 0.5, 0.55);
            glowAt(g, sx, sy, 0.22 * u, [255, 238, 205], 0.9);
            g.fillStyle = '#fff7e6'; g.beginPath(); g.arc(sx, sy, 0.042 * u, 0, TAU); g.fill();
            g.globalCompositeOperation = 'lighter';
            for (var i = 0; i < 8; i++) {  /* soft sun rays */
                var a = -Math.PI / 2 + (i - 3.5) * 0.36 + (r() - 0.5) * 0.15, L = 1.3 * u, s = 0.035 + r() * 0.03;
                g.fillStyle = 'rgba(255,214,170,.045)';
                g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a - s) * L, sy + Math.sin(a - s) * L); g.lineTo(sx + Math.cos(a + s) * L, sy + Math.sin(a + s) * L); g.fill();
            }
            g.globalCompositeOperation = 'source-over';
            for (i = 0; i < 16; i++) {  /* high wisps */
                g.fillStyle = 'rgba(255,' + (180 + r() * 50 | 0) + ',' + (200 + r() * 30 | 0) + ',' + (0.12 + r() * 0.2).toFixed(2) + ')';
                g.beginPath(); g.ellipse(r() * w, hor * (0.12 + r() * 0.6), (0.06 + r() * 0.2) * u, (0.006 + r() * 0.012) * u, 0, 0, TAU); g.fill();
            }
            for (i = 0; i < 11; i++) {  /* far floating islands, the farther the paler */
                var x = r() * w, d = r(), y = hor - (0.04 + r() * 0.2) * u, s = (0.018 + (1 - d) * 0.05) * u;
                var col = lerpc([132, 104, 160], Z.fog, 0.35 + d * 0.5);
                var fg = g.createLinearGradient(0, y + s * 0.15, 0, y + 0.07 * u);
                fg.addColorStop(0, 'rgba(255,255,255,' + (0.55 - d * 0.3).toFixed(2) + ')'); fg.addColorStop(1, 'rgba(255,255,255,0)');
                g.fillStyle = fg; g.fillRect(x + s * 0.25, y + s * 0.1, Math.max(1.2, s * 0.12), 0.07 * u + hor - y);
                g.fillStyle = rgba(col);
                g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s * 0.3, y + s * 0.9, x + s * (r() - 0.5) * 0.4, y + s * 1.5);
                g.quadraticCurveTo(x + s * 0.4, y + s * 0.8, x + s, y); g.closePath(); g.fill();
                g.fillStyle = rgba(lerpc([140, 170, 130], Z.fog, 0.3 + d * 0.55));
                g.beginPath(); g.ellipse(x, y, s * 1.04, s * 0.22, 0, 0, TAU); g.fill();
                if (r() < 0.6) { g.beginPath(); g.arc(x + s * (r() - 0.5), y - s * 0.3, s * 0.35, 0, TAU); g.fill(); }
            }
            for (i = 0; i < 14; i++) {  /* the cloud sea, rows growing towards the viewer */
                var t = i / 13, yy = hor + Math.pow(t, 1.6) * (h - hor) * 1.05, rad = (0.016 + t * 0.11) * u;
                puffRow(g, w, yy, rad, lerpc([255, 244, 240], Z.fog, 0.5 * (1 - t)), lerpc([206, 150, 196], Z.fog, 0.55 * (1 - t)), r);
            }
        },
        glow: function (g, w, h, hor, r) {  /* night over the hollow: a green moon, giant glowing mushrooms far away */
            var Z = K.glow, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [4, 8, 24]], [hor * 0.55 / h, [12, 26, 58]], [hor / h, Z.fog], [(hor + 0.05 * u) / h, [18, 36, 60]], [1, [8, 16, 30]]]);
            g.fillRect(0, 0, w, h);
            starsAt(g, w, 0, hor * 0.7, 90, r, 0.6);
            var mx = w * 0.3, my = hor * 0.34;
            glowAt(g, mx, my, 0.3 * u, [150, 255, 220], 0.35);
            g.fillStyle = '#e4fff2'; g.beginPath(); g.arc(mx, my, 0.04 * u, 0, TAU); g.fill();
            g.fillStyle = 'rgba(160,220,200,.5)'; g.beginPath(); g.arc(mx + 0.012 * u, my - 0.008 * u, 0.009 * u, 0, TAU); g.fill();
            glowAt(g, w / 2, hor, 0.9 * u, [60, 220, 200], 0.22, 0.3);
            for (var row = 0; row < 2; row++) {
                for (var x = -20; x < w + 20; x += (0.05 + r() * 0.1) * u) {
                    var s = (row ? 0.07 : 0.035) * u * (0.6 + r() * 0.8), base = hor + (row ? 0.02 : 0.004) * u, top = base - s * (1.3 + r());
                    var col = lerpc(row ? [12, 26, 44] : [20, 40, 66], Z.fog, row ? 0.25 : 0.55), cap = r() < 0.5 ? [80, 255, 210] : r() < 0.5 ? [220, 110, 255] : [120, 180, 255];
                    glowAt(g, x, top + s * 0.1, s * 1.1, cap, row ? 0.22 : 0.14);
                    g.fillStyle = rgba(col);
                    g.fillRect(x - s * 0.09, top, s * 0.18, base - top + 2);
                    g.beginPath(); g.ellipse(x, top, s * 0.75, s * 0.42, 0, Math.PI, TAU); g.closePath(); g.fill();
                    g.fillStyle = rgba(cap, row ? 0.85 : 0.5);
                    for (var k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * s, top - r() * s * 0.3, Math.max(0.8, s * 0.06), 0, TAU); g.fill(); }
                }
            }
            g.fillStyle = vgrad(g, hor, h, [[0, [14, 30, 52], 0], [0.3, [10, 22, 40], 0.85], [1, [6, 14, 26], 1]]);
            g.fillRect(0, hor + 0.03 * u, w, h);
        },
        geode: function (g, w, h, hor, r) {  /* a vast cavern: giant crystals from the roof and the floor */
            var Z = K.geode, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [14, 6, 28]], [hor / h, Z.fog], [1, [16, 8, 28]]]);
            g.fillRect(0, 0, w, h);
            glowAt(g, w / 2, hor, 1.0 * u, [190, 110, 255], 0.38, 0.5);
            var cols = [[150, 100, 230], [90, 170, 240], [200, 110, 220], [120, 90, 210]];
            for (var i = 0; i < 34; i++) {
                var down = i % 2 === 0, x = r() * w, L = (0.08 + r() * 0.3) * u, wd = L * (0.12 + r() * 0.1), c = cols[(r() * 4) | 0], d = r();
                var y0 = down ? 0 : h, tip = down ? Math.min(hor - 0.02 * u, y0 + L) : Math.max(hor + 0.04 * u, y0 - L), lean = (r() - 0.5) * wd * 2;
                var cc = lerpc(c, Z.fog, 0.3 + d * 0.5);
                glowAt(g, x + lean, tip, wd * 2.2, c, 0.25);
                g.fillStyle = rgba(cc); g.beginPath(); g.moveTo(x - wd, y0); g.lineTo(x + lean, tip); g.lineTo(x, y0); g.fill();
                g.fillStyle = rgba(lerpc(cc, [255, 255, 255], 0.3)); g.beginPath(); g.moveTo(x, y0); g.lineTo(x + lean, tip); g.lineTo(x + wd, y0); g.fill();
            }
            g.fillStyle = '#ffffff';
            for (i = 0; i < 90; i++) { g.globalAlpha = 0.2 + r() * 0.6; g.fillRect(r() * w, r() * h, 1.3, 1.3); }
            g.globalAlpha = 1;
        },
        aurora: function (g, w, h, hor, r) {  /* polar night: stars, snowy peaks, the palace on the horizon, a snowfield */
            var Z = K.aurora, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [4, 8, 30]], [hor * 0.5 / h, [14, 30, 72]], [hor * 0.88 / h, [48, 84, 138]], [hor / h, Z.fog],
                                          [(hor + 0.02 * u) / h, [184, 208, 232]], [1, [142, 172, 212]]]);
            g.fillRect(0, 0, w, h);
            starsAt(g, w, 0, hor * 0.85, 170, r, 0.8);
            for (var layer = 0; layer < 2; layer++) {
                var col = layer ? [70, 98, 146] : lerpc([110, 140, 190], Z.fog, 0.4), base = hor + 2, x = -10;
                g.fillStyle = rgba(col); g.beginPath(); g.moveTo(-10, base);
                var peaks = [];
                while (x < w + 10) { var pw = (0.04 + r() * 0.08) * u, ph = (layer ? 0.04 : 0.07) * u * (0.4 + r()); g.lineTo(x + pw / 2, base - ph); peaks.push([x + pw / 2, base - ph, pw]); x += pw; g.lineTo(x, base - ph * 0.3 * r()); }
                g.lineTo(w + 10, base); g.closePath(); g.fill();
                g.fillStyle = layer ? 'rgba(235,245,255,.85)' : 'rgba(225,238,255,.5)';
                peaks.forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - p[2] * 0.16, p[1] + p[2] * 0.2); g.lineTo(p[0] + p[2] * 0.18, p[1] + p[2] * 0.22); g.fill(); });
            }
            var px0 = w * 0.36, pc = [58, 82, 130];  /* the palace: towers with onion domes and lit windows */
            glowAt(g, px0, hor - 0.05 * u, 0.25 * u, [140, 230, 255], 0.25);
            for (var i = -4; i <= 4; i++) {
                var tx = px0 + i * 0.022 * u, th = (0.05 + (4 - Math.abs(i)) * 0.022 + r() * 0.02) * u, tw = 0.012 * u;
                g.fillStyle = rgba(pc); g.fillRect(tx - tw / 2, hor - th, tw, th + 2);
                g.beginPath(); g.arc(tx, hor - th, tw * 0.75, Math.PI, TAU); g.lineTo(tx, hor - th - tw * 1.9); g.closePath(); g.fill();
                g.fillStyle = 'rgba(160,240,255,.9)';
                for (var k = 0; k < 3; k++) if (r() < 0.7) g.fillRect(tx - 0.8, hor - th + tw * (1 + k * 1.3), 1.6, 2.2);
            }
            g.fillStyle = 'rgba(255,255,255,.35)';
            for (i = 0; i < 40; i++) g.fillRect(r() * w, hor + 0.03 * u + r() * (h - hor), 1.4, 1.4);
        },
        clock: function (g, w, h, hor, r) {  /* inside the spire: warm haze, giant gears and chains far off */
            var Z = K.clock, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [30, 16, 10]], [hor * 0.6 / h, [86, 50, 28]], [hor / h, Z.fog], [(hor + 0.06 * u) / h, [88, 54, 30]], [1, [26, 16, 10]]]);
            g.fillRect(0, 0, w, h);
            glowAt(g, w / 2, hor, 0.9 * u, [255, 182, 96], 0.4, 0.6);
            for (var i = 0; i < 16; i++) {
                var x = r() * w, y = r() * h, s = (0.04 + r() * 0.2) * u, d = r(), col = lerpc([64, 38, 22], Z.fog, 0.25 + d * 0.6);
                g.fillStyle = rgba(col); gearPath(g, x, y, s, 10 + (r() * 10 | 0), s * 0.12); g.fill();
                g.fillStyle = rgba(lerpc(col, Z.fog, 0.4)); g.beginPath(); g.arc(x, y, s * 0.55, 0, TAU); g.fill();
                g.fillStyle = rgba(col); g.beginPath(); g.arc(x, y, s * 0.18, 0, TAU); g.fill();
                g.strokeStyle = rgba(lerpc([255, 200, 120], Z.fog, 0.4), 0.35); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, s * 0.9, -2.4, -0.8); g.stroke();
            }
            g.strokeStyle = 'rgba(40,24,14,.5)'; g.lineWidth = 2;
            for (i = 0; i < 9; i++) { var cxx = r() * w; g.beginPath(); g.moveTo(cxx, 0); g.lineTo(cxx + (r() - 0.5) * 20, h); g.stroke(); }
            for (i = 0; i < 40; i++) glowAt(g, r() * w, r() * h, 3 + r() * 6, [255, 200, 120], 0.6);
        },
        wool: function (g, w, h, hor, r) {  /* a pastel dream: button suns, cotton clouds, knitted hills */
            var Z = K.wool, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [146, 166, 238]], [hor * 0.5 / h, [204, 182, 242]], [hor * 0.86 / h, [255, 200, 228]], [hor / h, Z.fog],
                                          [(hor + 0.03 * u) / h, [196, 236, 214]], [1, [150, 210, 186]]]);
            g.fillRect(0, 0, w, h);
            buttonPaint(g, w * 0.7, hor - 0.17 * u, 0.075 * u, [255, 212, 110], true);
            buttonPaint(g, w * 0.2, hor - 0.28 * u, 0.034 * u, [255, 150, 196], true);
            for (var i = 0; i < 12; i++) {  /* cotton clouds */
                var cx0 = r() * w, cy0 = hor * (0.15 + r() * 0.6), s = (0.03 + r() * 0.05) * u;
                for (var k = 0; k < 5; k++) {
                    var x = cx0 + (k - 2) * s * 0.7, y = cy0 - Math.sin(k / 4 * Math.PI) * s * 0.4, rr = s * (0.5 + Math.sin(k / 4 * Math.PI) * 0.35);
                    var cg = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr);
                    cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(0.7, 'rgba(255,240,250,.75)'); cg.addColorStop(1, 'rgba(255,230,245,0)');
                    g.fillStyle = cg; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
                }
            }
            var cols = [[206, 190, 250], [255, 196, 222], [176, 228, 200]];
            for (var layer = 0; layer < 3; layer++) {  /* rolling knitted hills, back to front */
                var base = hor + (layer * 0.012 + 0.004) * u, amp = (0.03 + layer * 0.02) * u, col = lerpc(cols[layer], Z.fog, 0.55 - layer * 0.22), ph = r() * 6;
                g.save(); g.beginPath(); g.moveTo(-10, h);
                for (var x2 = -10; x2 <= w + 10; x2 += 8) g.lineTo(x2, base - amp * (0.6 + 0.4 * Math.sin(x2 / (0.12 * u) + ph)) * (0.7 + 0.3 * Math.sin(x2 / (0.05 * u) + ph * 2)));
                g.lineTo(w + 10, h); g.closePath();
                g.fillStyle = rgba(col); g.fill(); g.clip();
                knitRows(g, -10, base - amp * 1.2, w + 20, h - base + amp * 1.2, 4 + layer * 2, rgba(lerpc(col, [120, 80, 140], 0.14)));
                g.restore();
            }
        },
        stars: function (g, w, h, hor, r) {  /* deep space: nebulae, a ringed planet, a moon, stars above and below */
            var Z = K.stars, u = F;
            g.fillStyle = vgrad(g, 0, h, [[0, [5, 3, 18]], [hor / h, Z.fog], [1, [6, 4, 20]]]);
            g.fillRect(0, 0, w, h);
            g.globalCompositeOperation = 'lighter';
            glowAt(g, w * 0.7, hor * 0.5, 0.6 * u, [255, 70, 170], 0.22, 0.6);
            glowAt(g, w * 0.2, hor * 0.8, 0.5 * u, [70, 130, 255], 0.2, 0.7);
            glowAt(g, w * 0.5, hor + 0.25 * u, 0.7 * u, [150, 70, 255], 0.16, 0.5);
            glowAt(g, w * 0.88, hor + 0.1 * u, 0.35 * u, [80, 220, 255], 0.14);
            g.globalCompositeOperation = 'source-over';
            starsAt(g, w, 0, h, 480, r, 0.95);
            var plx = w * 0.24, ply = hor - 0.17 * u, pr = 0.085 * u;
            function ring(front) {
                g.strokeStyle = 'rgba(255,214,170,.75)'; g.lineWidth = pr * 0.09;
                g.beginPath(); g.ellipse(plx, ply, pr * 1.9, pr * 0.42, -0.25, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
                g.strokeStyle = 'rgba(255,170,200,.4)'; g.lineWidth = pr * 0.05;
                g.beginPath(); g.ellipse(plx, ply, pr * 1.6, pr * 0.34, -0.25, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
            }
            glowAt(g, plx, ply, pr * 2, [255, 150, 120], 0.25);
            ring(false);
            var pg = g.createRadialGradient(plx - pr * 0.4, ply - pr * 0.4, pr * 0.1, plx, ply, pr);
            pg.addColorStop(0, '#ffd6a8'); pg.addColorStop(0.6, '#e8806e'); pg.addColorStop(1, '#5a2850');
            g.fillStyle = pg; g.beginPath(); g.arc(plx, ply, pr, 0, TAU); g.fill();
            g.save(); g.beginPath(); g.arc(plx, ply, pr, 0, TAU); g.clip();
            g.fillStyle = 'rgba(120,40,80,.25)';
            for (var i = 0; i < 4; i++) g.fillRect(plx - pr, ply - pr * 0.5 + i * pr * 0.32, pr * 2, pr * 0.1);
            g.restore();
            ring(true);
            var mx = w * 0.8, my = hor * 0.28, mr = 0.03 * u;
            var mg = g.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, 0, mx, my, mr);
            mg.addColorStop(0, '#e8f4ff'); mg.addColorStop(1, '#5a6aa0');
            g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
        }
    };
    function buttonPaint(g, x, y, rad, c, sun) {  /* a big sewing button: rim, dish, four holes, a cross of thread */
        if (sun) glowAt(g, x, y, rad * 3.2, c, 0.5);
        var bg = g.createRadialGradient(x - rad * 0.35, y - rad * 0.35, rad * 0.1, x, y, rad);
        bg.addColorStop(0, rgba(lerpc(c, [255, 255, 255], 0.6))); bg.addColorStop(0.7, rgba(c)); bg.addColorStop(1, rgba(lerpc(c, [120, 60, 40], 0.35)));
        g.fillStyle = bg; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
        g.strokeStyle = rgba(lerpc(c, [120, 60, 60], 0.3), 0.8); g.lineWidth = rad * 0.08; g.beginPath(); g.arc(x, y, rad * 0.78, 0, TAU); g.stroke();
        var hp = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = rad * 0.07; g.lineCap = 'round'; g.beginPath();
        g.moveTo(x - rad * 0.24, y - rad * 0.24); g.lineTo(x + rad * 0.24, y + rad * 0.24); g.moveTo(x + rad * 0.24, y - rad * 0.24); g.lineTo(x - rad * 0.24, y + rad * 0.24); g.stroke();
        g.fillStyle = rgba(lerpc(c, [90, 40, 40], 0.55));
        hp.forEach(function (p) { g.beginPath(); g.arc(x + p[0] * rad * 0.24, y + p[1] * rad * 0.24, rad * 0.1, 0, TAU); g.fill(); });
    }
    function knitRows(g, x0, y0, w, h, s, col) {  /* rows of little V stitches, the look of knitted wool */
        g.strokeStyle = col; g.lineWidth = Math.max(0.8, s * 0.22); g.lineCap = 'round'; g.beginPath();
        for (var y = y0; y < y0 + h; y += s * 0.9) for (var x = x0 + ((y / s) & 1) * s * 0.5; x < x0 + w; x += s) {
            g.moveTo(x - s * 0.38, y - s * 0.3); g.lineTo(x, y + s * 0.3); g.lineTo(x + s * 0.38, y - s * 0.3);
        }
        g.stroke();
    }
    function skyCanvas(k) {
        if (!skyCache[k]) {
            var c = document.createElement('canvas'), w = W + 2 * SKYM, h = H + 2 * SKYV;
            c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
            var g = c.getContext('2d');
            g.scale(SS, SS);
            SKY[ZONES[k].key](g, w, h, HY + SKYV, seeded(17 + k * 31));
            skyCache[k] = c;
        }
        return skyCache[k];
    }
    function auroraRibbons(a, sx, sy) {  /* live curtains of light over the ice palace */
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var cols = [[90, 255, 170], [120, 200, 255], [220, 120, 255]];
        for (var i = 0; i < 3; i++) {
            var y0 = HOR * (0.16 + i * 0.13) + sy * 0, amp = F * 0.05, th = F * (0.07 + i * 0.015), n = 14;
            var gr = ctx.createLinearGradient(0, y0 - amp - th, 0, y0 + amp + th);
            gr.addColorStop(0, rgba(cols[i], 0)); gr.addColorStop(0.55, rgba(cols[i], 0.3 * a)); gr.addColorStop(1, rgba(cols[i], 0));
            ctx.fillStyle = gr;
            ctx.beginPath();
            for (var j = 0; j <= n; j++) {
                var x = -SKYM + (W + 2 * SKYM) * j / n + sx, yy = y0 + Math.sin(j * 0.7 + clock * (0.25 + i * 0.07) + i * 2) * amp;
                if (j) ctx.lineTo(x, yy - th); else ctx.moveTo(x, yy - th);
            }
            for (j = n; j >= 0; j--) {
                x = -SKYM + (W + 2 * SKYM) * j / n + sx; yy = y0 + Math.sin(j * 0.7 + clock * (0.25 + i * 0.07) + i * 2 + 0.5) * amp;
                ctx.lineTo(x, yy + th * 0.5);
            }
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
    function drawSky() {
        var sx = clamp(-camS * F, -SKYM, SKYM), sy = clamp(camT * F, -SKYV, SKYV), ks = [envA % NZ, envB % NZ];
        for (var i = 0; i < (envW > 0.002 && ks[1] !== ks[0] ? 2 : 1); i++) {
            var a = i ? envW : 1;
            ctx.globalAlpha = a;
            ctx.drawImage(skyCanvas(ks[i]), sx - SKYM, sy - SKYV, W + 2 * SKYM, H + 2 * SKYV);
            ctx.globalAlpha = 1;
        }
        var au = (ks[0] === K.aurora.i ? 1 - envW : 0) + (ks[1] === K.aurora.i && ks[1] !== ks[0] ? envW : 0);
        if (au > 0.01) auroraRibbons(au, sx, sy);
    }

    /* ---------- sprites: scenery painted once with gradients, then drawn scaled (bottom-centre anchored unless said) ---------- */
    function spr(key, w, h, wk, paint) {  /* also keeps a silhouette in the world's fog colour, laid over the sprite as it recedes */
        var s = sprCache[key];
        if (s) return s;
        var c = document.createElement('canvas');
        c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
        var g = c.getContext('2d');
        g.scale(SS, SS);
        paint(g, w, h);
        var fg = document.createElement('canvas');
        fg.width = c.width; fg.height = c.height;
        var gf = fg.getContext('2d');
        gf.drawImage(c, 0, 0); gf.globalCompositeOperation = 'source-in'; gf.fillStyle = rgba(K[wk].fog); gf.fillRect(0, 0, fg.width, fg.height);
        s = sprCache[key] = { cv: c, fg: fg, w: w, h: h };
        return s;
    }
    function glowSpr(c) {  /* a soft round light for motes and halos */
        var key = c.join(',');
        if (glowCache[key]) return glowCache[key];
        var cvs = document.createElement('canvas'); cvs.width = cvs.height = 32;
        var g = cvs.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(0.25, rgba(c, 0.75)); gr.addColorStop(0.6, rgba(c, 0.18)); gr.addColorStop(1, rgba(c, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
        return (glowCache[key] = cvs);
    }
    function halo(x, y, r, c, a) { if (r < 0.5) return; ctx.globalAlpha = a; ctx.drawImage(glowSpr(c), x - r, y - r, 2 * r, 2 * r); }
    function crystalPaint(g, w, h, cols, n, tall, seed) {  /* a cluster of hexagonal prisms, lit from the left */
        var r = seeded(seed);
        glowAt(g, w / 2, h * 0.92, w * 0.5, cols[1], 0.45, 0.5);
        for (var i = 0; i < n; i++) {
            var t = n === 1 ? 0.5 : i / (n - 1), a = (t - 0.5) * 1.1 + (r() - 0.5) * 0.3, L = h * (0.45 + r() * 0.45) * (1 - Math.abs(t - 0.5) * (tall ? 0.6 : 0.9));
            var wd = w * (0.07 + r() * 0.05), bx = w / 2 + (t - 0.5) * w * 0.5, by = h - 2;
            var dx = Math.sin(a), dy = -Math.cos(a), nx = -dy, ny = dx;
            var tx = bx + dx * L, ty = by + dy * L, sx2 = bx + dx * (L - wd * 1.6), sy2 = by + dy * (L - wd * 1.6);
            var c = cols[(r() * cols.length) | 0];
            g.fillStyle = rgba(lerpc(c, [20, 10, 40], 0.35));
            g.beginPath(); g.moveTo(bx + nx * wd, by + ny * wd); g.lineTo(sx2 + nx * wd, sy2 + ny * wd); g.lineTo(tx, ty); g.lineTo(sx2, sy2); g.lineTo(bx, by); g.fill();
            var lg = g.createLinearGradient(bx, by, tx, ty);
            lg.addColorStop(0, rgba(c)); lg.addColorStop(1, rgba(lerpc(c, [255, 255, 255], 0.55)));
            g.fillStyle = lg;
            g.beginPath(); g.moveTo(bx - nx * wd, by - ny * wd); g.lineTo(sx2 - nx * wd, sy2 - ny * wd); g.lineTo(tx, ty); g.lineTo(sx2, sy2); g.lineTo(bx, by); g.fill();
            g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1, wd * 0.12);
            g.beginPath(); g.moveTo(bx, by); g.lineTo(sx2, sy2); g.lineTo(tx, ty); g.stroke();
        }
    }
    var SPR = {
        islet: function (v) {
            return spr('islet' + v, 200, 270, 'isles', function (g, w, h) {
                var r = seeded(5 + v * 13), top = 52;
                var rg = g.createLinearGradient(0, top, 0, h);
                rg.addColorStop(0, '#a87a66'); rg.addColorStop(0.45, '#7a5468'); rg.addColorStop(1, 'rgba(150,120,180,.2)');
                g.fillStyle = rg;
                g.beginPath(); g.moveTo(6, top);
                g.quadraticCurveTo(40, top + 90, 90 + v * 8, h - 6); g.quadraticCurveTo(150, top + 100, 194, top); g.closePath(); g.fill();
                g.strokeStyle = 'rgba(70,40,60,.35)'; g.lineWidth = 2;
                for (var i = 0; i < 5; i++) { g.beginPath(); g.moveTo(30 + r() * 40, top + 20 + i * 24); g.quadraticCurveTo(100, top + 30 + i * 26, 160 - r() * 30, top + 18 + i * 24); g.stroke(); }
                var gg = g.createLinearGradient(0, top - 22, 0, top + 18);
                gg.addColorStop(0, '#b8e08a'); gg.addColorStop(0.6, '#6fb46a'); gg.addColorStop(1, '#3f7f58');
                g.fillStyle = gg; g.beginPath(); g.ellipse(100, top, 97, 22, 0, 0, TAU); g.fill();
                g.fillStyle = '#4f9460';
                for (i = 0; i < 14; i++) { var x = 12 + i * 13 + r() * 4; g.beginPath(); g.moveTo(x - 5, top + 8); g.lineTo(x, top + 18 + r() * 14); g.lineTo(x + 5, top + 8); g.fill(); }
                if (v !== 1) {  /* a tree, rim lit by the sunset */
                    var tx = 70 + r() * 60;
                    g.fillStyle = '#6b4a3a'; g.fillRect(tx - 4, top - 46, 8, 46);
                    [[0, -62, 30], [-20, -50, 22], [20, -48, 24]].forEach(function (b) {
                        var cg = g.createRadialGradient(tx + b[0] + b[2] * 0.4, top + b[1] - b[2] * 0.4, 2, tx + b[0], top + b[1], b[2]);
                        cg.addColorStop(0, '#ffd59a'); cg.addColorStop(0.35, '#8fcf78'); cg.addColorStop(1, '#3f8a58');
                        g.fillStyle = cg; g.beginPath(); g.arc(tx + b[0], top + b[1], b[2], 0, TAU); g.fill();
                    });
                } else {
                    g.fillStyle = '#d8cbb8'; g.fillRect(120, top - 28, 14, 28); g.fillRect(60, top - 18, 10, 18);
                    g.fillStyle = '#f3e9da'; g.fillRect(118, top - 32, 18, 5);
                }
            });
        },
        cloud: function (v) {
            return spr('cloud' + v, 260, 120, 'isles', function (g, w, h) {
                var r = seeded(9 + v * 7);
                for (var pass = 0; pass < 2; pass++) for (var i = 0; i < 9; i++) {
                    var x = 30 + i * 25 + r() * 10, rr = 22 + r() * 26 + (1 - Math.abs(i - 4) / 4) * 18, y = h - 18 - rr * 0.5;
                    var cg = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
                    cg.addColorStop(0, pass ? 'rgba(255,250,246,.95)' : 'rgba(230,180,210,.7)');
                    cg.addColorStop(0.75, pass ? 'rgba(255,226,226,.85)' : 'rgba(214,160,200,.5)'); cg.addColorStop(1, 'rgba(255,220,230,0)');
                    g.fillStyle = cg; g.beginPath(); g.arc(x, y + (pass ? 0 : 8), rr, 0, TAU); g.fill();
                }
            });
        },
        tree: function () {
            return spr('tree', 110, 150, 'isles', function (g, w, h) {
                g.fillStyle = '#6b4a3a'; g.fillRect(w / 2 - 5, h - 60, 10, 60);
                [[0, -88, 34], [-24, -70, 26], [24, -66, 27], [0, -60, 26]].forEach(function (b) {
                    var cg = g.createRadialGradient(w / 2 + b[0] + b[2] * 0.45, h + b[1] - b[2] * 0.45, 2, w / 2 + b[0], h + b[1], b[2]);
                    cg.addColorStop(0, '#ffd8a0'); cg.addColorStop(0.3, '#93d07a'); cg.addColorStop(1, '#3c8256');
                    g.fillStyle = cg; g.beginPath(); g.arc(w / 2 + b[0], h + b[1], b[2], 0, TAU); g.fill();
                });
            });
        },
        post: function (v) {  /* a lantern on a pole: 0 warm (isles), 1 brass gas lamp, 2 pink beacon, 3 cyan beacon, 4 ice lantern */
            return spr('post' + v, 50, 190, ['isles', 'clock', 'stars', 'stars', 'aurora'][v], function (g, w, h) {
                var light = [[255, 200, 120], [255, 190, 100], [255, 120, 220], [120, 230, 255], [170, 240, 255]][v];
                var pole = ['#7a5a46', '#c08a3c', '#5a4a9a', '#4a5aa0', '#e6f6ff'][v];
                glowAt(g, w / 2, 30, 25, light, 0.75);
                g.fillStyle = pole; g.fillRect(w / 2 - 2.5, 34, 5, h - 34);
                if (v >= 2 && v <= 3) { g.fillStyle = rgba(light); g.beginPath(); g.arc(w / 2, 30, 7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2 - 2, 28, 2.5, 0, TAU); g.fill(); return; }
                g.fillStyle = pole; g.fillRect(w / 2 - 9, 18, 18, 4); g.fillRect(w / 2 - 8, 42, 16, 4);
                g.fillStyle = rgba(lerpc(light, [255, 255, 255], 0.5)); g.fillRect(w / 2 - 7, 22, 14, 20);
            });
        },
        shroom: function (v) {  /* a giant glowing mushroom: 0 teal, 1 violet, 2 blue */
            return spr('shroom' + v, 230, 300, 'glow', function (g, w, h) {
                var c = [[60, 240, 200], [200, 110, 255], [90, 160, 255]][v], r = seeded(3 + v * 5), capY = 70;
                glowAt(g, w / 2, capY + 30, 115, c, 0.35, 0.7);
                var sg = g.createLinearGradient(w / 2 - 20, 0, w / 2 + 20, 0);
                sg.addColorStop(0, '#9fb8b4'); sg.addColorStop(0.5, '#e8f4ee'); sg.addColorStop(1, '#7e9a9a');
                g.fillStyle = sg;
                g.beginPath(); g.moveTo(w / 2 - 14, capY + 20); g.quadraticCurveTo(w / 2 - 24 + v * 8, h * 0.65, w / 2 - 22, h);
                g.lineTo(w / 2 + 22, h); g.quadraticCurveTo(w / 2 + 20 + v * 8, h * 0.65, w / 2 + 14, capY + 20); g.fill();
                g.fillStyle = rgba(c, 0.7);
                for (var i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2 + (r() - 0.5) * 24, capY + 50 + r() * (h - capY - 60), 1.5 + r() * 2, 0, TAU); g.fill(); }
                g.fillStyle = rgba(lerpc(c, [255, 255, 255], 0.55), 0.9);  /* glowing gills underneath */
                g.beginPath(); g.ellipse(w / 2, capY + 18, 104, 18, 0, 0, TAU); g.fill();
                var cg = g.createLinearGradient(0, capY - 64, 0, capY + 22);
                cg.addColorStop(0, rgba(lerpc(c, [20, 20, 60], 0.55))); cg.addColorStop(0.7, rgba(lerpc(c, [30, 20, 70], 0.2))); cg.addColorStop(1, rgba(lerpc(c, [255, 255, 255], 0.3)));
                g.fillStyle = cg;
                g.beginPath(); g.moveTo(w / 2 - 110, capY + 16); g.bezierCurveTo(w / 2 - 100, capY - 70, w / 2 + 100, capY - 70, w / 2 + 110, capY + 16);
                g.quadraticCurveTo(w / 2, capY + 26, w / 2 - 110, capY + 16); g.fill();
                for (i = 0; i < 9; i++) {
                    var sx = w / 2 + (r() - 0.5) * 170, sy = capY - 10 - r() * 34 + Math.abs(sx - w / 2) * 0.25, sr = 3 + r() * 6;
                    glowAt(g, sx, sy, sr * 2.6, [255, 255, 255], 0.35);
                    g.fillStyle = rgba(lerpc(c, [255, 255, 255], 0.7)); g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
                }
            });
        },
        sprouts: function () {
            return spr('sprouts', 130, 80, 'glow', function (g, w, h) {
                var r = seeded(41);
                for (var i = 0; i < 6; i++) {
                    var x = 12 + i * 21 + r() * 6, hh = 20 + r() * 40, c = r() < 0.5 ? [80, 255, 210] : [220, 130, 255];
                    glowAt(g, x, h - hh, 18, c, 0.5);
                    g.fillStyle = '#d8eee6'; g.fillRect(x - 2, h - hh, 4, hh);
                    g.fillStyle = rgba(c); g.beginPath(); g.ellipse(x, h - hh, 10, 7, 0, Math.PI, TAU); g.fill();
                }
            });
        },
        crystals: function (v) {  /* 0 violet floor cluster, 1 teal, 2 pink, 3 ice spire */
            var sets = [[[150, 100, 240], [200, 140, 255], [120, 80, 220]], [[90, 200, 250], [140, 240, 255], [70, 150, 230]],
                        [[240, 120, 220], [255, 170, 240], [190, 90, 210]], [[200, 236, 255], [240, 252, 255], [150, 210, 245]]];
            return spr('crys' + v, 160, v === 3 ? 280 : 200, v === 3 ? 'aurora' : 'geode', function (g, w, h) { crystalPaint(g, w, h, sets[v], v === 3 ? 5 : 6, v === 3, 7 + v * 11); });
        },
        stalactite: function (v) {
            return spr('stal' + v, 160, 200, 'geode', function (g, w, h) {
                g.translate(0, h); g.scale(1, -1);
                crystalPaint(g, w, h, v ? [[90, 200, 250], [140, 240, 255]] : [[160, 110, 245], [210, 160, 255]], 5, false, 23 + v);
            });
        },
        pine: function () {
            return spr('pine', 110, 180, 'aurora', function (g, w, h) {
                g.fillStyle = '#3a4a66'; g.fillRect(w / 2 - 5, h - 26, 10, 26);
                for (var i = 0; i < 4; i++) {
                    var y = h - 24 - i * 34, hw = 50 - i * 10;
                    g.fillStyle = '#2f5470'; g.beginPath(); g.moveTo(w / 2 - hw, y); g.lineTo(w / 2, y - 56); g.lineTo(w / 2 + hw, y); g.fill();
                    g.fillStyle = 'rgba(240,248,255,.92)'; g.beginPath(); g.moveTo(w / 2 - hw * 0.55, y - 22); g.lineTo(w / 2, y - 56); g.lineTo(w / 2 + hw * 0.6, y - 24);
                    g.quadraticCurveTo(w / 2, y - 30, w / 2 - hw * 0.55, y - 22); g.fill();
                }
            });
        },
        gear: function (v) {  /* centred, rotated live */
            return spr('gear' + v, 220, 220, 'clock', function (g, w, h) {
                var c = w / 2, R = 104, n = v ? 12 : 16, base = v ? [196, 120, 70] : [214, 160, 70];
                var gg = g.createRadialGradient(c - 30, c - 40, 10, c, c, R);
                gg.addColorStop(0, rgba(lerpc(base, [255, 245, 210], 0.6))); gg.addColorStop(0.6, rgba(base)); gg.addColorStop(1, rgba(lerpc(base, [40, 20, 10], 0.5)));
                g.fillStyle = gg; gearPath(g, c, c, R, n, 16); g.fill();
                g.globalCompositeOperation = 'destination-out';
                for (var i = 0; i < (v ? 5 : 6); i++) { var a = i / (v ? 5 : 6) * TAU; g.beginPath(); g.arc(c + Math.cos(a) * 52, c + Math.sin(a) * 52, v ? 20 : 17, 0, TAU); g.fill(); }
                g.globalCompositeOperation = 'source-over';
                g.strokeStyle = rgba(lerpc(base, [60, 30, 10], 0.5)); g.lineWidth = 5; g.beginPath(); g.arc(c, c, 80, 0, TAU); g.stroke();
                g.fillStyle = rgba(lerpc(base, [60, 30, 10], 0.45)); g.beginPath(); g.arc(c, c, 20, 0, TAU); g.fill();
                g.fillStyle = rgba(lerpc(base, [255, 240, 200], 0.4)); g.beginPath(); g.arc(c - 4, c - 4, 9, 0, TAU); g.fill();
            });
        },
        rock: function (v) {  /* an asteroid, centred, rotated live */
            return spr('rock' + v, 170, 150, 'stars', function (g, w, h) {
                var r = seeded(61 + v * 9), cxr = w / 2, cyr = h / 2, pts = [];
                for (var i = 0; i < 11; i++) { var a = i / 11 * TAU, rr = 58 + r() * 18; pts.push(cxr + Math.cos(a) * rr * 1.1, cyr + Math.sin(a) * rr * 0.85); }
                var rg = g.createRadialGradient(cxr - 30, cyr - 30, 5, cxr, cyr, 85);
                rg.addColorStop(0, v ? '#d8c4f0' : '#c8b8d8'); rg.addColorStop(0.6, v ? '#7a64a8' : '#6c6080'); rg.addColorStop(1, '#2a2040');
                g.fillStyle = rg; g.beginPath(); g.moveTo(pts[0], pts[1]);
                for (i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
                g.closePath(); g.fill();
                for (i = 0; i < 6; i++) {
                    var x = cxr + (r() - 0.5) * 80, y = cyr + (r() - 0.5) * 60, cr = 5 + r() * 10;
                    g.fillStyle = 'rgba(30,20,50,.35)'; g.beginPath(); g.arc(x, y, cr, 0, TAU); g.fill();
                    g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(x - cr * 0.25, y - cr * 0.25, cr * 0.6, 0, TAU); g.fill();
                }
                g.strokeStyle = 'rgba(140,220,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(cxr, cyr, 70, 3.6, 5.2); g.stroke();
            });
        },
        knit: function (v) {  /* a knitted hill: striped rows of stitches */
            return spr('knit' + v, 300, 150, 'wool', function (g, w, h) {
                var c = [[180, 230, 204], [255, 200, 224], [206, 192, 252]][v], c2 = [[255, 240, 200], [255, 255, 255], [190, 236, 255]][v];
                g.save(); g.beginPath(); g.moveTo(0, h); g.bezierCurveTo(w * 0.1, h * 0.05, w * 0.9, h * 0.05, w, h); g.closePath();
                g.fillStyle = rgba(c); g.fill(); g.clip();
                for (var b = 0; b < 6; b++) if (b % 2) { g.fillStyle = rgba(lerpc(c, c2, 0.6)); g.fillRect(0, h * (0.1 + b * 0.15), w, h * 0.075); }
                knitRows(g, 0, 0, w, h, 9, rgba(lerpc(c, [110, 70, 120], 0.18)));
                var sh = g.createLinearGradient(0, 0, w, 0);
                sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(90,60,120,.22)');
                g.fillStyle = sh; g.fillRect(0, 0, w, h);
                g.restore();
            });
        },
        ytree: function (v) {  /* a knitting needle with a ball of wool on top */
            return spr('ytree' + v, 120, 220, 'wool', function (g, w, h) {
                var ng = g.createLinearGradient(w / 2 - 4, 0, w / 2 + 4, 0);
                ng.addColorStop(0, '#c99a6a'); ng.addColorStop(0.5, '#f4d8b0'); ng.addColorStop(1, '#a8784a');
                g.fillStyle = ng; g.fillRect(w / 2 - 4, 70, 8, h - 70);
                var wl = woolImg(46, v ? 'mint' : 'violet');
                g.drawImage(wl.cv, w / 2 - wl.s / 2, 64 - wl.s / 2, wl.s, wl.s);
            });
        },
        button: function (v) {
            return spr('button' + v, 160, 160, 'wool', function (g, w, h) { buttonPaint(g, w / 2, h / 2, 74, v ? [140, 200, 255] : [255, 160, 200], false); });
        },
        pompom: function () {
            return spr('pompom', 120, 100, 'wool', function (g, w, h) {
                var cols = [[255, 160, 210], [255, 230, 140], [160, 220, 255], [200, 170, 255]];
                for (var i = 0; i < 4; i++) {
                    var x = 18 + i * 28, hh = 40 + (i % 2) * 22;
                    g.strokeStyle = '#7cc89c'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x - 6, h - hh / 2, x, h - hh); g.stroke();
                    var pg = g.createRadialGradient(x - 4, h - hh - 4, 1, x, h - hh, 14);
                    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.4, rgba(cols[i])); pg.addColorStop(1, rgba(cols[i], 0.2));
                    g.fillStyle = pg; g.beginPath(); g.arc(x, h - hh, 14, 0, TAU); g.fill();
                }
            });
        },
        planet: function (v) {
            return spr('planet' + v, 200, 200, 'stars', function (g, w, h) {
                var c = w / 2, col = v ? ['#bfffe8', '#3cb8a0', '#0c3a48'] : ['#ffe0f4', '#c066c8', '#3a1450'];
                glowAt(g, c, c, 100, v ? [100, 255, 220] : [255, 120, 230], 0.25);
                var pg = g.createRadialGradient(c - 25, c - 25, 5, c, c, 62);
                pg.addColorStop(0, col[0]); pg.addColorStop(0.6, col[1]); pg.addColorStop(1, col[2]);
                g.fillStyle = pg; g.beginPath(); g.arc(c, c, 62, 0, TAU); g.fill();
            });
        }
    };
    function drawSpr(s, x, y, z, ww, alpha, ay, rot) {  /* a sprite ww metres wide at world point x, y, z; ay: anchor (1 bottom, 0.5 centre) */
        if (!P(x, y, z) || alpha <= 0.01) return;
        var wd = ww * pk, ht = wd * s.h / s.w;
        if (wd < 1 || wd > W * 4) return;
        if (ay === undefined) ay = 1;
        if (rot === undefined && (px + wd < 0 || px - wd > W || py - ht * ay > H || py + ht * (1 - ay) < 0)) return;
        var fa = FA > 0.02 && s.fg;
        ctx.globalAlpha = alpha;
        if (rot !== undefined) {
            ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.drawImage(s.cv, -wd / 2, -ht * ay, wd, ht);
            if (fa) { ctx.globalAlpha = alpha * FA; ctx.drawImage(s.fg, -wd / 2, -ht * ay, wd, ht); }
            ctx.restore();
        } else {
            ctx.drawImage(s.cv, px - wd / 2, py - ht * ay, wd, ht);
            if (fa) { ctx.globalAlpha = alpha * FA; ctx.drawImage(s.fg, px - wd / 2, py - ht * ay, wd, ht); }
        }
        ctx.globalAlpha = 1;
    }
    var FA = 0;  /* how much fog lies over the scenery being drawn */
    var PREP = {
        isles: [['islet', 0], ['islet', 1], ['islet', 2], ['cloud', 0], ['cloud', 1], ['tree'], ['post', 0]],
        glow: [['shroom', 0], ['shroom', 1], ['shroom', 2], ['sprouts']],
        geode: [['crystals', 0], ['crystals', 1], ['crystals', 2], ['stalactite', 0], ['stalactite', 1]],
        aurora: [['crystals', 3], ['pine'], ['post', 4]],
        clock: [['gear', 0], ['gear', 1], ['post', 1]],
        wool: [['knit', 0], ['knit', 1], ['knit', 2], ['ytree', 0], ['ytree', 1], ['button', 0], ['button', 1], ['pompom']],
        stars: [['rock', 0], ['rock', 1], ['planet', 0], ['planet', 1], ['post', 2], ['post', 3]]
    };
    function prepWorld(k, q) {  /* paint a world's sky and sprites ahead of time (one job per frame) so the gate never stutters */
        var jobs = [function () { skyCanvas(k); }];
        PREP[ZONES[k].key].forEach(function (s) { jobs.push(function () { SPR[s[0]](s[1]); }); });
        if (q) { for (var i = 0; i < jobs.length; i++) q.push(jobs[i]); }
        else jobs.forEach(function (j) { j(); });
    }

    /* ---------- strips: the ground, walls and roofs of each world ---------- */
    var bz = [], nK, nS, nY, fK, fS, fY, SF, SL, SDZ, SPAR, SNEAR, SZN, SZF, SGN, SGF, SCN, SCF;
    function buildStrips() {
        bz.length = 0;
        var z = camZ + NEAR, end = camZ + FAR;
        bz.push(z);
        while (z < end - 1e-6) {
            var d = z - camZ, st = d < 12 ? 1 : d < 24 ? 2 : 4;
            z = Math.min(end, (Math.floor(z / st + 1e-7) + 1) * st);
            bz.push(z);
        }
    }
    function setStrip(zn, zf, Z) {
        var zx = zf + (zf - zn) * 0.05, dn = zn - camZ, dx = zx - camZ;  /* the far edge overlaps a little: no seams */
        nK = F / dn; nS = CX + (cx(zn) - camX - camS * dn) * nK; nY = HOR + (EYE - hy(zn) + camHY) * nK;
        fK = F / dx; fS = CX + (cx(zx) - camX - camS * dx) * fK; fY = HOR + (EYE - hy(zx) + camHY) * fK;
        SDZ = (zn + zf) / 2 - camZ; SF = fogf(SDZ); SZN = zn; SZF = zf;
        SPAR = (Math.floor(zn + 1e-6) & 1); SNEAR = Math.max(0, 1 - SDZ / 16);
        SL = Z.light ? Z.light((zn + zf) / 2) : 1;
        if (envW > 0) SL *= Math.pow((ZONES[envA % NZ].amb + (ZONES[envB % NZ].amb - ZONES[envA % NZ].amb) * envW) / Z.amb, 0.85);  /* light blends with the sky */
        SGN = growAt(zn); SGF = growAt(zx); SCN = 1 + (1 - SGN) * 3.2; SCF = 1 + (1 - SGF) * 3.2;
    }
    function QQ(xan, yan, xbn, ybn, xaf, yaf, xbf, ybf, fill) {
        ctx.beginPath();
        ctx.moveTo(nS + xan * nK, nY - yan * nK); ctx.lineTo(nS + xbn * nK, nY - ybn * nK);
        ctx.lineTo(fS + xbf * fK, fY - ybf * fK); ctx.lineTo(fS + xaf * fK, fY - yaf * fK);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function Q(xa, ya, xb, yb, fill) { QQ(xa, ya, xb, yb, xa, ya, xb, yb, fill); }
    function QS(xa, ya, xb, yb, fill) { QQ(xa * SCN, ya * SCN, xb * SCN, yb * SCN, xa * SCF, ya * SCF, xb * SCF, yb * SCF, fill); }  /* scaled out near the gates */
    function QF(t0, t1, xa, xb, y, fill) {  /* a piece of floor from t0 to t1 of the way to the strip's far edge */
        var k0 = nK + (fK - nK) * t0, s0 = nS + (fS - nS) * t0, b0 = nY + (fY - nY) * t0;
        var k1 = nK + (fK - nK) * t1, s1 = nS + (fS - nS) * t1, b1 = nY + (fY - nY) * t1;
        ctx.beginPath();
        ctx.moveTo(s0 + xa * k0, b0 - y * k0); ctx.lineTo(s0 + xb * k0, b0 - y * k0);
        ctx.lineTo(s1 + xb * k1, b1 - y * k1); ctx.lineTo(s1 + xa * k1, b1 - y * k1);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function wallSeg(x, za, zb, y0, y1, fill) {  /* a piece of a (scaled) side wall between za and zb, like a window */
        var L = SZF - SZN, t0 = clamp((za - SZN) / L, 0, 1), t1 = clamp((zb - SZN) / L, 0, 1);
        if (t1 <= t0) return;
        var k0 = nK + (fK - nK) * t0, s0 = nS + (fS - nS) * t0, b0 = nY + (fY - nY) * t0, c0 = SCN + (SCF - SCN) * t0;
        var k1 = nK + (fK - nK) * t1, s1 = nS + (fS - nS) * t1, b1 = nY + (fY - nY) * t1, c1 = SCN + (SCF - SCN) * t1;
        ctx.beginPath();
        ctx.moveTo(s0 + x * c0 * k0, b0 - y0 * k0); ctx.lineTo(s0 + x * c0 * k0, b0 - y1 * k0);
        ctx.lineTo(s1 + x * c1 * k1, b1 - y1 * k1); ctx.lineTo(s1 + x * c1 * k1, b1 - y0 * k1);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function edgeLine(x, y, col, w) {  /* a line running along the strip, like a rope or a rail */
        ctx.beginPath(); ctx.moveTo(nS + x * nK, nY - y * nK); ctx.lineTo(fS + x * fK, fY - y * fK);
        ctx.strokeStyle = col; ctx.lineWidth = clamp(w * (nK + fK) / 2, 0.6, 9); ctx.stroke();
    }
    function dots(seed, n, x0, x1, col) {  /* small glowing specks on the floor of this strip */
        for (var i = 0; i < n; i++) { var h = hash(seed + i * 7.3), h2 = hash(seed * 1.7 + i), x = x0 + (x1 - x0) * h; QF(h2 * 0.8, h2 * 0.8 + 0.12, x, x + 0.06, 0.002, col); }
    }
    function C(c, k) { return mixc(c, FOG, SF, (k || 1) * SL); }
    function CP(c, k) { return C(c, (k || 1) * (1 - 0.06 * SPAR * SNEAR)); }  /* checkered by metre, fading with distance */
    function CE(c, k) { return mixc(c, FOG, SF * 0.55, k); }                    /* glowing: the fog dims it less */
    function CA(c, a) { return mixa(c, FOG, SF, a); }
    function at(z, step) { return Math.abs(z / step - Math.round(z / step)) < 1e-4; }
    function nearLine(pts, col, w, close) {  /* a polyline in the plane of the strip's near edge */
        ctx.beginPath();
        for (var i = 0; i < pts.length; i += 2) { var x = nS + pts[i] * nK, y = nY - pts[i + 1] * nK; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        if (close) { ctx.closePath(); ctx.fillStyle = col; ctx.fill(); return; }
        ctx.strokeStyle = col; ctx.lineWidth = clamp(w * nK, 1, 14); ctx.stroke();
    }
    function nearRect(x0, x1, y0, y1, col) { ctx.fillStyle = col; ctx.fillRect(nS + x0 * nK, nY - y1 * nK, (x1 - x0) * nK, (y1 - y0) * nK); }

    /* Skyfall Isles: grassy floating islands joined by rope bridges, the cloud sea far below */
    function bridgeAt(z) { var u = z - zoneIdx(z) * ZL, m = ((z % 28) + 28) % 28; return u > 16 && u < ZL - 16 && m >= 16 && hash(Math.floor(z / 28) + 3.7) > 0.25; }
    function fallsAt(z) {  /* the waterfall run: a narrow bridge behind curtains of falling water, from 52 to 108 m into the isles */
        var zi = zoneIdx(z), u = z - zi * ZL;
        return ZONES[zi % NZ].key === 'isles' && u >= 52 && u < 108;
    }
    K.isles.strip = function () {
        if (fallsAt(SZN + 0.01)) {
            Q(-0.9, -0.1, -0.8, -0.1, C([70, 50, 52])); Q(0.8, -0.1, 0.9, -0.1, C([70, 50, 52]));
            if (SZF - SZN < 1.5) QF(0, 0.72, -0.95, 0.95, 0, C([146, 104, 84], SPAR ? 0.93 : 1)); else Q(-0.95, 0, 0.95, 0, C([136, 98, 80]));
            var wc = CA([238, 248, 255], 0.5), wf = CA([255, 255, 255], 0.3);
            Q(-1.45, -10, -1.45, 3.0, wc); Q(1.45, -10, 1.45, 3.0, wc);
            Q(-1.45, 3.0, 0, 3.6, wf); Q(0, 3.6, 1.45, 3.0, wf);
            if (SDZ < 30) { var rc2 = C([226, 190, 140]); edgeLine(-1.0, 0.9, rc2, 0.03); edgeLine(1.0, 0.9, rc2, 0.03); }
            return;
        }
        if (bridgeAt(SZN + 0.01)) {
            Q(-0.96, -0.12, -0.84, -0.12, C([92, 62, 54])); Q(0.84, -0.12, 0.96, -0.12, C([92, 62, 54]));
            if (SZF - SZN < 1.5) { QF(0, 0.64, -1, 1, 0, C([196, 140, 96], SPAR ? 0.95 : 1)); QF(0.64, 0.7, -1, 1, 0, C([120, 82, 62])); }
            else Q(-1, 0, 1, 0, C([168, 120, 86]));
            if (SDZ < 34) {
                var rc = C([226, 190, 140]);
                edgeLine(-1.08, 0.95, rc, 0.03); edgeLine(1.08, 0.95, rc, 0.03); edgeLine(-1.08, 0.48, rc, 0.02); edgeLine(1.08, 0.48, rc, 0.02);
            }
            return;
        }
        var g1 = [86, 158, 92], g2 = [116, 182, 104], p = [232, 206, 160];
        Q(-1.84, -0.06, -1.74, 0, C([62, 116, 76])); Q(1.74, 0, 1.84, -0.06, C([62, 116, 76]));
        Q(-1.74, 0, -1.08, 0, CP(g1)); Q(1.08, 0, 1.74, 0, CP(g1, 1.05));
        Q(-1.08, 0, -0.62, 0, CP(g2)); Q(0.62, 0, 1.08, 0, CP(g2, 1.05));
        Q(-0.62, 0, -0.48, 0, C([170, 194, 132])); Q(0.48, 0, 0.62, 0, C([176, 198, 136]));
        Q(-0.48, 0, 0.48, 0, CP(p));
    };
    K.isles.front = function (zn) {
        if (fallsAt(zn + 0.01)) {
            if (SDZ < 0.8) return;
            var a = (0.35 + 0.3 * (RM ? 0.3 : Math.sin(clock * 9 + zn * 1.7))) * (1 - SF);
            nearLine([-1.44, 3.0, -1.44, -6], 'rgba(255,255,255,' + a.toFixed(2) + ')', 0.05);
            nearLine([1.44, 3.0, 1.44, -6], 'rgba(255,255,255,' + (a * 0.8).toFixed(2) + ')', 0.05);
            if (at(zn, 2)) { var pc2 = C([110, 78, 60]); nearLine([-1.0, 0, -1.0, 0.98], pc2, 0.06); nearLine([1.0, 0, 1.0, 0.98], pc2, 0.06); }
            return;
        }
        if (bridgeAt(zn + 0.01)) {
            if (at(zn, 2) && SDZ > 0.8) {
                var pc = C([120, 84, 62]);
                nearLine([-1.08, 0, -1.08, 1.05], pc, 0.07); nearLine([1.08, 0, 1.08, 1.05], pc, 0.07);
            }
        } else if (bridgeAt(zn - 0.5) && SDZ > 0.6) {  /* the rocky face where an island begins after a bridge */
            nearLine([-1.84, 0, 1.84, 0, 1.3, -0.8, 0.5, -2.6, -0.4, -2.0, -1.3, -0.9], C([150, 100, 104]), 0, true);
            nearLine([-1.84, 0, 1.84, 0, 1.6, -0.25, -1.6, -0.25], C([86, 150, 90]), 0, true);
        }
    };
    K.isles.inside = function (lx, y, z) {
        var a = Math.abs(lx);
        if (fallsAt(z)) return a < 1.45 && y < 3.2 && y > (a < 1.0 ? 0 : -6);
        return a < 16 && y < 12 && y > (a < 1.8 ? 0 : -6);
    };
    K.isles.floor = function (lx, z) { return Math.abs(lx) < (fallsAt(z) ? 1.0 : 1.8) ? 0 : -60; };

    /* Glowcap Hollow: a mossy trail under giant glowing mushrooms */
    K.glow.light = function (z) { var u = ((z % 9) + 9) % 9 - 4.5; return 0.8 + 0.4 * Math.exp(-u * u / 5); };
    K.glow.strip = function () {
        var gr = [26, 54, 66], pa = [40, 80, 92];
        Q(-10, 0, -1.36, 0, CP(gr)); Q(1.36, 0, 10, 0, CP(gr, 1.04));
        Q(-1.36, 0, -0.55, 0, CP(pa)); Q(0.55, 0, 1.36, 0, CP(pa, 1.04));
        Q(-0.55, 0, 0.55, 0, CP([50, 98, 110]));
        Q(-1.44, 0.002, -1.32, 0.002, CE([80, 240, 200], 0.8)); Q(1.32, 0.002, 1.44, 0.002, CE([200, 120, 255], 0.75));
        if (SDZ < 30) { var zs = Math.floor(SZN + 1e-6); dots(zs * 3.1, SZF - SZN < 1.5 ? 3 : 5, -2.6, 2.6, CE(zs % 3 ? [120, 255, 220] : [255, 140, 230])); }
    };
    K.glow.inside = function (lx, y) { return Math.abs(lx) < 10 && y > 0 && y < 10; };

    /* Geode Depths: a faceted crystal tunnel that opens into a huge cavern near the gates */
    var GEO = [-2.35, 0, -2.85, 1.0, -2.75, 2.2, -2.1, 3.05, -1.0, 3.5, 0, 3.62, 1.0, 3.5, 2.1, 3.05, 2.75, 2.2, 2.85, 1.0, 2.35, 0];
    var FACET = [[78, 52, 140], [60, 70, 148], [98, 60, 150], [52, 92, 142], [116, 70, 158], [70, 48, 124]];
    K.geode.light = function (z) { var u = ((z % 11) + 11) % 11 - 5.5; return (0.8 + 0.32 * Math.exp(-u * u / 7)) * (0.72 + 0.28 * Math.min(1, (z - camZ) / 9)); };
    K.geode.strip = function () {
        var blk = Math.floor(SZN / 2 + 1e-6);
        QS(-2.35, 0, 2.35, 0, CP([46, 34, 68]));
        Q(-0.8, 0.001, 0.8, 0.001, CP([60, 46, 84]));
        if (SDZ < 30) dots(Math.floor(SZN + 1e-6) * 5.3, 2, -2.1, 2.1, CE(blk % 2 ? [255, 130, 230] : [130, 220, 255]));
        for (var i = 0; i < GEO.length - 2; i += 2) {
            var hh = hash(blk * 11 + i), up = (GEO[i + 1] + GEO[i + 3]) / 2 > 2.9;
            QS(GEO[i], GEO[i + 1], GEO[i + 2], GEO[i + 3], C(FACET[(hh * FACET.length) | 0], (up ? 0.74 : 0.96) * (0.92 + 0.16 * hh) * (GEO[i + 1] + GEO[i + 3] < 1.5 ? 0.82 : 1)));
            if (hh > 0.8 && SDZ < 26) QS(GEO[i] * 0.98, GEO[i + 1] * 0.98 + 0.05, GEO[i + 2] * 0.98, GEO[i + 3] * 0.98 + 0.05, CA([210, 160, 255], 0.28));
        }
    };
    K.geode.front = function (zn) {
        if (!at(zn, 2) || SDZ < 1.2 || SDZ > 32) return;
        var s = SCN, pts = [];
        for (var i = 0; i < GEO.length; i += 2) pts.push(GEO[i] * s, GEO[i + 1] * s);
        ctx.globalAlpha = Math.min(1, (SDZ - 1.2) / 2) * (1 - SDZ / 32);
        nearLine(pts, 'rgba(226,200,255,.55)', 0.035);
        ctx.globalAlpha = 1;
    };
    K.geode.inside = function (lx, y, z) { var s = 1 + (1 - growAt(z)) * 3.2, u = lx / (2.95 * s), v = y / (3.62 * s); return y > 0 && u * u + v * v < 1; };

    /* Aurora Palace: a polished ice causeway between snowfields, ice arches overhead */
    var ARCHI = [];
    for (var ai = 0; ai <= 20; ai++) { var aa = Math.PI * (1 - ai / 20); ARCHI.push(Math.cos(aa) * 2.78, 3.0 + Math.sin(aa) * 1.55); }
    K.aurora.strip = function () {
        Q(-16, 0, -2.62, 0, CP([206, 224, 244])); Q(2.62, 0, 16, 0, CP([214, 230, 248]));
        Q(-2.62, 0, -1.3, 0, CP([138, 184, 222])); Q(1.3, 0, 2.62, 0, CP([144, 190, 226]));
        Q(-1.3, 0, 1.3, 0, CP([164, 206, 238]));
        Q(-0.4, 0.002, 0.4, 0.002, CA([150, 255, 210], 0.09 + 0.05 * Math.sin(SZN * 0.35 + clock * 0.8)));
        var hn = 0.66 * SGN, hf = 0.66 * SGF;
        if (hn > 0.02 || hf > 0.02) {
            QQ(-2.62, 0, -2.62, hn, -2.62, 0, -2.62, hf, CA([196, 232, 255], 0.6)); QQ(2.62, 0, 2.62, hn, 2.62, 0, 2.62, hf, CA([206, 238, 255], 0.6));
            QQ(-2.74, hn, -2.56, hn, -2.74, hf, -2.56, hf, C([246, 252, 255])); QQ(2.56, hn, 2.74, hn, 2.56, hf, 2.74, hf, C([246, 252, 255]));
        }
    };
    K.aurora.front = function (zn) {
        if (!at(zn, 8) || SDZ < 1 || SGN < 0.03) return;
        var g = SGN, pts = [];
        for (var i = 0; i < ARCHI.length; i += 2) pts.push(ARCHI[i], ARCHI[i + 1] * g);
        ctx.globalAlpha = Math.min(1, (SDZ - 1) / 2) * (1 - 0.6 * SF);
        nearRect(-2.98, -2.58, 0, 3.0 * g, C([214, 240, 255])); nearRect(2.58, 2.98, 0, 3.0 * g, C([200, 232, 252]));
        nearRect(-2.98, -2.86, 0, 3.0 * g, 'rgba(255,255,255,.55)'); nearRect(2.58, 2.68, 0, 3.0 * g, 'rgba(255,255,255,.55)');
        nearLine(pts, CA([140, 230, 255], 0.3), 0.42);
        nearLine(pts, C([232, 248, 255]), 0.16);
        ctx.globalAlpha = 1;
    };
    K.aurora.inside = function (lx, y) { return Math.abs(lx) < 12 && y > 0 && y < 10; };

    /* Clockwork Spire: a brass walkway across the shaft of a giant clock tower */
    var PANEL = [[118, 74, 42], [104, 66, 40], [128, 84, 46]];
    K.clock.light = function (z) { var u = ((z % 12) + 12) % 12 - 6; return 0.84 + 0.32 * Math.exp(-u * u / 8); };
    K.clock.strip = function () {
        var blk = Math.floor(SZN / 4 + 1e-6), pc = PANEL[(hash(blk) * 3) | 0];
        QS(-4.2, -6, -4.2, 7.5, C(pc, 0.86)); QS(4.2, -6, 4.2, 7.5, C(pc));
        QS(-4.2, -6, -4.2, -1.2, C([40, 26, 18])); QS(4.2, -6, 4.2, -1.2, C([46, 30, 20]));
        QS(-4.2, 2.6, -4.2, 2.78, C([226, 170, 90])); QS(4.2, 2.6, 4.2, 2.78, C([232, 176, 92]));
        if (SDZ < 34) for (var wz = Math.floor(SZN / 8) * 8; wz < SZF; wz += 8) for (var sd = -1; sd <= 1; sd += 2) {  /* tall lit windows */
            var lit = hash(wz * 0.37 + sd) > 0.3;
            wallSeg(sd * 4.19, wz + 2, wz + 4.2, 1.7, 4.6, C([60, 36, 22]));
            if (lit) { wallSeg(sd * 4.18, wz + 2.2, wz + 4.0, 1.85, 4.45, CE([255, 190, 100], 0.95)); wallSeg(sd * 4.17, wz + 3.02, wz + 3.18, 1.85, 4.45, C([90, 56, 30])); wallSeg(sd * 4.17, wz + 2.2, wz + 4.0, 3.1, 3.2, C([90, 56, 30])); }
        }
        if (SDZ < 32) { var pp = C([196, 140, 70]); QS(-4.18, 1.3, -4.18, 1.48, pp); QS(4.18, 1.3, 4.18, 1.48, pp); QS(-4.18, 3.6, -4.18, 3.72, C([170, 120, 60])); QS(4.18, 3.6, 4.18, 3.72, C([170, 120, 60])); }
        Q(-1.62, 0, 1.62, 0, CP([116, 80, 50]));
        Q(-0.62, 0.001, 0.62, 0.001, CP([158, 114, 62]));
        Q(-1.72, -0.16, -1.62, 0, C([214, 162, 82])); Q(1.62, 0, 1.72, -0.16, C([214, 162, 82]));
        if (SDZ < 36) { var rc = C([236, 186, 96]); edgeLine(-1.66, 1.0, rc, 0.05); edgeLine(1.66, 1.0, rc, 0.05); }
    };
    K.clock.front = function (zn) {
        if (SDZ < 0.8) return;
        if (at(zn, 2)) { var pc = C([190, 140, 70]); nearLine([-1.66, 0, -1.66, 1.0], pc, 0.06); nearLine([1.66, 0, 1.66, 1.0], pc, 0.06); }
        if (at(zn, 4) && SDZ < 30) { var s = SCN, lc = C([70, 44, 26]); nearLine([-4.2 * s, -1.2, -4.2 * s, 7.5], lc, 0.08); nearLine([4.2 * s, -1.2, 4.2 * s, 7.5], lc, 0.08); }
        if (at(zn, 16) && SGN > 0.4) {
            ctx.globalAlpha = (SGN - 0.4) / 0.6;
            nearRect(-4.2 * SCN, 4.2 * SCN, 5.0, 5.35, C([150, 104, 56]));
            nearRect(-4.2 * SCN, 4.2 * SCN, 5.0, 5.07, C([230, 176, 92]));
            ctx.globalAlpha = 1;
        }
    };
    K.clock.inside = function (lx, y, z) { var a = Math.abs(lx), s = 1 + (1 - growAt(z)) * 3.2; return a < 4.2 * s && y < 9 && y > (a < 1.7 ? 0 : -6); };
    K.clock.floor = function (lx) { return Math.abs(lx) < 1.7 ? 0 : -60; };

    /* Starlight Road: a glowing glass ribbon through space */
    K.stars.strip = function () {
        Q(-1.55, 0, 1.55, 0, CP([30, 26, 72]));
        Q(-0.9, 0.001, 0.9, 0.001, CP([38, 32, 88]));
        if (SDZ < 36 && Math.floor(SZN + 1e-6) % 3 === 0) Q(-0.05, 0.002, 0.05, 0.002, CE([130, 232, 255]));
        Q(-1.63, 0.01, -1.5, 0.01, CE([255, 112, 214])); Q(1.5, 0.01, 1.63, 0.01, CE([130, 222, 255]));
    };
    K.stars.front = function (zn) {
        if (SDZ < 1) return;
        if (at(zn, 4) && SDZ < 34) nearLine([-1.5, 0.003, 1.5, 0.003], CA([180, 160, 255], 0.35), 0.025);
        if (at(zn, 24) && SGN > 0.3) {  /* neon hoops over the road */
            var pts = [];
            for (var i = 0; i <= 24; i++) { var a = Math.PI * (1 - i / 24); pts.push(Math.cos(a) * 2.3, Math.sin(a) * 3.3 * SGN); }
            ctx.globalAlpha = Math.min(1, (SDZ - 1) / 2) * (SGN - 0.3) / 0.7;
            nearLine(pts, CA(zn % 48 < 1 ? [255, 120, 220] : [120, 220, 255], 0.3), 0.4);
            nearLine(pts, CE([255, 240, 255]), 0.08);
            ctx.globalAlpha = 1;
        }
    };
    K.stars.inside = function (lx, y) { var a = Math.abs(lx); return a < 16 && y < 12 && y > (a < 1.6 ? 0 : -8); };
    K.stars.floor = function (lx) { return Math.abs(lx) < 1.6 ? 0 : -60; };

    /* Woolly Dreamland: a striped knitted scarf for a road across rolling knitted meadows */
    var SCARF = [[255, 184, 216], [255, 236, 194], [186, 226, 255], [208, 192, 255], [192, 240, 212]];
    K.wool.light = function (z) { return 0.94 + 0.08 * Math.sin(z * 0.21); };
    K.wool.strip = function () {
        Q(-16, 0, -1.72, 0, CP([180, 230, 204])); Q(1.72, 0, 16, 0, CP([188, 234, 208]));
        var band = SCARF[((Math.floor(SZN / 2 + 1e-6) % 5) + 5) % 5];
        Q(-1.62, 0, 1.62, 0, C(band));
        if (SDZ < 30) { var rc = C(band, 0.85); for (var x = -1.2; x <= 1.21; x += 0.4) edgeLine(x, 0.002, rc, 0.03); }
        Q(-1.74, 0.03, -1.62, 0.03, C([255, 255, 255])); Q(1.62, 0.03, 1.74, 0.03, C([255, 255, 255]));
    };
    K.wool.front = function (zn) {  /* tassels on the scarf's edges */
        if (!at(zn, 2) || SDZ < 1 || SDZ > 26) return;
        var tc = C(SCARF[((Math.floor(zn / 2 + 1e-6) % 5) + 5) % 5], 0.9);
        nearLine([-1.74, 0.03, -1.95, 0.0], tc, 0.06); nearLine([1.74, 0.03, 1.95, 0.0], tc, 0.06);
    };
    K.wool.inside = function (lx, y) { return Math.abs(lx) < 14 && y > 0 && y < 12; };
    K.wool.props = function (z) {
        var g = growAt(z);
        if (Math.random() < 0.55) prop('knit', z + rnd(0, 4), { lx: side() * rnd(5, 18), s: rnd(5, 11) * (0.4 + 0.6 * g), v: (Math.random() * 3) | 0 });
        if (Math.random() < 0.45 * g) prop('ytree', z + rnd(0, 4), { lx: side() * rnd(2.3, 6), s: rnd(1.0, 1.6), v: Math.random() < 0.5 ? 0 : 1 });
        if (Math.random() < 0.18 * g) prop('button', z + rnd(0, 4), { lx: side() * rnd(3.2, 9), s: rnd(1.2, 2.4), v: Math.random() < 0.5 ? 0 : 1 });
        if (Math.random() < 0.5) prop('pompom', z + rnd(0, 4), { lx: side() * rnd(1.85, 2.8), s: rnd(0.6, 0.9) });
    };
    function floorAt(lx, z) { var Z = zoneOf(z); return Z.floor ? Z.floor(lx, z) : 0; }

    /* ---------- scenery props (every 4 m), drawn as sprites or live ---------- */
    function prop(kind, z, o) { var p = { kind: kind, z: z, ph: rnd(0, 6) }; for (var k in o) p[k] = o[k]; props.push(p); }
    function side() { return Math.random() < 0.5 ? -1 : 1; }
    K.isles.props = function (z) {
        var g = growAt(z), s = rnd(1.6, 3.6);
        if (Math.random() < 0.6) prop('islet', z + rnd(0, 4), { lx: side() * (3.2 + s + rnd(0, 9)), y: rnd(-4.5, 3.5), s: s, v: (Math.random() * 3) | 0, fall: Math.random() < 0.75 });
        if (Math.random() < 0.85) prop('cloud', z + rnd(0, 4), { lx: side() * rnd(3, 24), y: rnd(-15, -8), s: rnd(6, 13), v: Math.random() < 0.5 ? 0 : 1 });
        if (!bridgeAt(z + 2) && !fallsAt(z + 2)) {
            if (Math.random() < 0.3 * g) prop('tree', z + rnd(0, 4), { lx: side() * rnd(1.45, 1.65), s: rnd(0.9, 1.3) });
            if (Math.random() < 0.55) prop('flowers', z + rnd(0, 4), { lx: side() * rnd(0.75, 1.6) });
            if (at(z, 12) && g > 0.5) prop('post', z + 1, { lx: (at(z, 24) ? -1 : 1) * 1.62, v: 0, h: 1.9 });
        }
        if (Math.random() < 0.05) prop('birds', z + 30, { lx: rnd(-10, 10), y: rnd(5, 9) });
    };
    K.glow.props = function (z) {
        var g = growAt(z);
        if (Math.random() < 0.9) { var hgt = rnd(3, 7.5) * (0.3 + 0.7 * g); prop('shroom', z + rnd(0, 4), { lx: side() * (1.9 + hgt * 0.32 + rnd(0, 3)), h: hgt, v: (Math.random() * 3) | 0 }); }
        if (Math.random() < 0.65) prop('sprouts', z + rnd(0, 4), { lx: side() * rnd(1.5, 2.4), s: rnd(0.8, 1.3) });
    };
    K.geode.props = function (z) {
        var g = growAt(z), sc = 1 + (1 - g) * 3.2;
        if (Math.random() < 0.6) prop('crystals', z + rnd(0, 4), { lx: side() * rnd(1.75, 2.25) * sc, s: rnd(0.8, 1.5) * (0.6 + 0.4 * g), v: (Math.random() * 3) | 0 });
        if (Math.random() < 0.4 * g) prop('stal', z + rnd(0, 4), { lx: side() * rnd(1.0, 1.9), y: 3.4, s: rnd(0.6, 1.0), v: Math.random() < 0.5 ? 0 : 1 });
    };
    K.aurora.props = function (z) {
        var g = growAt(z);
        if (Math.random() < 0.6) prop('spire', z + rnd(0, 4), { lx: side() * rnd(3.4, 10), s: rnd(1.2, 3.4) * (0.4 + 0.6 * g) });
        if (Math.random() < 0.5) prop('pine', z + rnd(0, 4), { lx: side() * rnd(4.5, 14), s: rnd(1.6, 3) });
        if (at(z, 8) && g > 0.3) prop('post', z + 4, { lx: (at(z, 16) ? -1 : 1) * 2.66, v: 4, h: 1.1, y: 0.66 });
    };
    K.clock.props = function (z) {
        var g = growAt(z), sc = 1 + (1 - g) * 3.2;
        if (Math.random() < 0.75) { var s = rnd(1.4, 3.4); prop('gear', z + rnd(0, 4), { lx: side() * Math.min(4.0 * sc - s * 0.4, 1.9 + s * 0.5 + rnd(0, 1.5)), y: rnd(-3, 6), s: s, v: Math.random() < 0.5 ? 0 : 1, w: rnd(0.25, 0.8) * side() }); }
        if (Math.random() < 0.08 * g) prop('pendulum', z + rnd(0, 4), { lx: side() * rnd(2.5, 3.2) });
        if (at(z, 12) && g > 0.4) prop('post', z + 2, { lx: (at(z, 24) ? -1 : 1) * 1.66, v: 1, h: 1.9 });
    };
    K.stars.props = function (z) {
        var g = growAt(z);
        if (Math.random() < 0.6) prop('rock', z + rnd(0, 4), { lx: side() * rnd(3, 15), y: rnd(-6, 6), s: rnd(0.6, 2.6), v: Math.random() < 0.5 ? 0 : 1, w: rnd(-0.6, 0.6) });
        if (Math.random() < 0.05) prop('planet', z + rnd(0, 4), { lx: side() * rnd(16, 28), y: rnd(-6, 8), s: rnd(5, 10), v: Math.random() < 0.5 ? 0 : 1 });
        if (at(z, 8) && g > 0.3) prop('post', z + 1, { lx: (at(z, 16) ? -1 : 1) * 1.72, v: at(z, 16) ? 2 : 3, h: 1.9 });
    };
    var PROP = {
        islet: function (p, a) {
            var x = cx(p.z) + p.lx, s = p.s;
            if (p.fall && P(x + s * 0.45 * (p.lx > 0 ? -1 : 1), p.y - 0.15, p.z)) {  /* a waterfall pouring into the clouds */
                var tx = px, ty = py, k = pk;
                P(x + s * 0.45 * (p.lx > 0 ? -1 : 1), p.y - 14, p.z);
                var wd = Math.max(1.5, 0.22 * s * k), gr = ctx.createLinearGradient(0, ty, 0, py);
                gr.addColorStop(0, 'rgba(255,255,255,' + (0.85 * a).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,240,245,0)');
                ctx.fillStyle = gr; ctx.fillRect(tx - wd / 2, ty, wd, py - ty);
                if (!RM) {
                    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * a).toFixed(2) + ')';
                    for (var i = 0; i < 3; i++) { var u = ((clock * 0.6 + i / 3 + p.ph) % 1); ctx.fillRect(tx - wd * 0.3, ty + (py - ty) * u * 0.6, wd * 0.6, Math.max(2, 0.4 * k)); }
                }
            }
            drawSpr(SPR.islet(p.v), x, p.y, p.z, 2 * s, a, 52 / 270);
        },
        cloud: function (p, a) { drawSpr(SPR.cloud(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a * 0.9, 0.6); },
        tree: function (p, a) { drawSpr(SPR.tree(), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        flowers: function (p, a) {
            if (!PL(p.lx, 0.05, p.z)) return;
            var k = pk, cols = ['#ff9fb8', '#ffd36b', '#ffffff', '#c7a4ff'];
            ctx.globalAlpha = a;
            for (var i = 0; i < 5; i++) { ctx.fillStyle = cols[(i + Math.floor(p.ph)) % 4]; ctx.beginPath(); ctx.arc(px + (i - 2) * 0.1 * k, py - (i % 2) * 0.06 * k, Math.max(0.8, 0.045 * k), 0, TAU); ctx.fill(); }
        },
        post: function (p, a) {
            var s = SPR.post(p.v);
            drawSpr(s, cx(p.z) + p.lx, p.y || 0, p.z, p.h * s.w / s.h, a);
            if (P(cx(p.z) + p.lx, (p.y || 0) + p.h * 0.84, p.z)) halo(px, py, 0.9 * pk, [[255, 200, 120], [255, 190, 100], [255, 120, 220], [120, 230, 255], [170, 240, 255]][p.v], a * 0.35);
        },
        birds: function (p, a) {
            if (!PL(p.lx, p.y, p.z)) return;
            var k = pk; ctx.strokeStyle = 'rgba(90,60,100,' + (0.7 * a).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, 0.05 * k); ctx.beginPath();
            for (var i = 0; i < 4; i++) {
                var bx = px + (i - 1.5) * 0.7 * k + Math.sin(i * 2.1) * 0.3 * k, by = py + Math.abs(i - 1.5) * 0.35 * k, fl = Math.sin(clock * 7 + i) * 0.12 * k;
                ctx.moveTo(bx - 0.25 * k, by - fl); ctx.quadraticCurveTo(bx - 0.1 * k, by - 0.08 * k, bx, by); ctx.quadraticCurveTo(bx + 0.1 * k, by - 0.08 * k, bx + 0.25 * k, by - fl);
            }
            ctx.stroke();
        },
        shroom: function (p, a) { drawSpr(SPR.shroom(p.v), cx(p.z) + p.lx, 0, p.z, p.h * 230 / 300 * 1.25, a * (0.85 + 0.15 * Math.sin(clock * 1.3 + p.ph))); },
        sprouts: function (p, a) { drawSpr(SPR.sprouts(), cx(p.z) + p.lx, 0, p.z, p.s, a * (0.8 + 0.2 * Math.sin(clock * 2 + p.ph))); },
        crystals: function (p, a) { drawSpr(SPR.crystals(p.v), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        stal: function (p, a) { drawSpr(SPR.stalactite(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a, 0); },
        spire: function (p, a) { drawSpr(SPR.crystals(3), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        pine: function (p, a) { drawSpr(SPR.pine(), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        gear: function (p, a) { drawSpr(SPR.gear(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a, 0.5, RM ? 0 : clock * p.w + p.ph); },
        pendulum: function (p, a) {
            var sw = Math.sin(clock * 1.4 + p.ph) * 0.5, x = cx(p.z) + p.lx;
            if (!P(x, 9, p.z)) return;
            var ax = px, ay = py; P(x + Math.sin(sw) * 6, 9 - Math.cos(sw) * 6, p.z);
            ctx.globalAlpha = a; ctx.strokeStyle = '#b8873e'; ctx.lineWidth = Math.max(1, 0.06 * pk);
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
            var gr = ctx.createRadialGradient(px - 0.15 * pk, py - 0.15 * pk, 0, px, py, 0.5 * pk);
            gr.addColorStop(0, '#ffe2a0'); gr.addColorStop(1, '#8a5a24');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, 0.5 * pk, 0, TAU); ctx.fill();
        },
        rock: function (p, a) { drawSpr(SPR.rock(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a, 0.5, RM ? 0 : clock * p.w + p.ph); },
        planet: function (p, a) { drawSpr(SPR.planet(p.v), cx(p.z) + p.lx, p.y, p.z, p.s, a, 0.5); },
        knit: function (p, a) { drawSpr(SPR.knit(p.v), cx(p.z) + p.lx, -0.3, p.z, p.s, a); },
        ytree: function (p, a) { drawSpr(SPR.ytree(p.v), cx(p.z) + p.lx, 0, p.z, p.s, a); },
        button: function (p, a) { drawSpr(SPR.button(p.v), cx(p.z) + p.lx, p.s * 0.4, p.z, p.s, a, 0.5, RM ? 0 : Math.sin(clock * 0.5 + p.ph) * 0.3); },
        pompom: function (p, a) { drawSpr(SPR.pompom(), cx(p.z) + p.lx, 0, p.z, p.s, a); }
    };

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

    /* ---------- drawing helpers ---------- */
    function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function quadW(a) {  /* a path through 4 world points [x, y, z, ...]; false if any is behind the camera */
        var s = [];
        for (var i = 0; i < 12; i += 3) { if (!P(a[i], a[i + 1], a[i + 2])) return false; s.push(px, py); }
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.lineTo(s[4], s[5]); ctx.lineTo(s[6], s[7]); ctx.closePath();
        return true;
    }
    function box(lx, z, w, d, y0, y1, cf, cs, ct) {  /* a box standing at local x lx; draws the faces the camera sees */
        var za = z - d / 2, zb = z + d / 2;
        if (za - camZ < NEAR + 0.05) return;
        var ca = cx(za), cb = cx(zb), xl = lx - w / 2, xr = lx + w / 2, X = ca + lx - camX - camS * (za - camZ);
        if (X > w / 2 && quadW([ca + xl, y0, za, cb + xl, y0, zb, cb + xl, y1, zb, ca + xl, y1, za])) { ctx.fillStyle = cs; ctx.fill(); }
        else if (X < -w / 2 && quadW([ca + xr, y0, za, cb + xr, y0, zb, cb + xr, y1, zb, ca + xr, y1, za])) { ctx.fillStyle = cs; ctx.fill(); }
        if (y1 < EYE && quadW([ca + xl, y1, za, ca + xr, y1, za, cb + xr, y1, zb, cb + xl, y1, zb])) { ctx.fillStyle = ct; ctx.fill(); }
        if (quadW([ca + xl, y0, za, ca + xr, y0, za, ca + xr, y1, za, ca + xl, y1, za])) { ctx.fillStyle = cf; ctx.fill(); }
    }
    function rectW(lx0, lx1, y0, y1, z) {  /* screen rect of a local rectangle in the plane z */
        if (!PL(lx0, y1, z)) return null;
        var x = px, y = py; PL(lx1, y0, z);
        return [x, y, px - x, py - y];
    }
    function archPath(sx, sy, k) {
        ctx.moveTo(sx - OW * k, sy); ctx.lineTo(sx - OW * k, sy - OH * k);
        ctx.arc(sx, sy - OH * k, OW * k, Math.PI, TAU); ctx.lineTo(sx + OW * k, sy); ctx.closePath();
    }
    function shadow(x, z, rw, a) {  /* a soft contact shadow on the floor */
        if (!P(x, floorAt(x - cx(z), z), z) || a <= 0.01) return;
        var dz = z - camZ, sq = clamp(EYE / dz, 0.08, 0.7);
        ctx.save(); ctx.translate(px, py); ctx.scale(1, sq);
        ctx.globalAlpha = a; ctx.drawImage(glowSpr([10, 6, 24]), -rw * pk, -rw * pk, 2 * rw * pk, 2 * rw * pk);
        ctx.restore();
    }

    /* ---------- glass, frames, gates and hatches ---------- */
    function drawGlass(e) {
        if (!paneQuad(e, clock)) return;
        var ax = QD[0], ay = QD[1], bx = QD[2], by = QD[3], cx2 = QD[4], cy2 = QD[5], dx = QD[6], dy = QD[7];
        var dz = e.z - camZ, k = Math.min(F / Math.max(NEAR, dz), 160), st = e.st, f = fogf(dz) * (st.portal ? 0.45 : 1), ca = Math.cos(QA), ga = ghostA(e, clock), A = fade(dz) * clamp((dz - 0.4) / 1.6, 0.35, 1);
        function qp(u, v) {  /* u: -1..1 across the panel, v: 0..1 up */
            var s = (u + 1) / 2, lx = ax + (dx - ax) * s, ly = ay + (dy - ay) * s, ux = bx + (cx2 - bx) * s, uy = by + (cy2 - by) * s;
            return [lx + (ux - lx) * v, ly + (uy - ly) * v];
        }
        function cell(u0, u1, v0, v1) {
            var a = qp(u0, v0), b = qp(u1, v0), c = qp(u1, v1), d = qp(u0, v1);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        }
        if (!e.broken && !e.arch) shadow(QX, e.z, e.w * Math.max(0.3, Math.abs(ca)) * 1.1, A * 0.3 * (1 - Math.min(1, QY / 1.8)) * (0.4 + 0.6 * ga));
        ctx.save();
        if (e.arch && PL(0, 0, e.z)) { ctx.beginPath(); archPath(px, py, pk); ctx.clip(); }
        ctx.globalAlpha = A;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (!e.broken) {
            var tint = st.tint, edge = st.edge || tint, gr = ctx.createLinearGradient(bx, by, dx, dy);
            gr.addColorStop(0, mixa(tint, FOG, f, 0.6 * ga)); gr.addColorStop(0.42, mixa(tint, FOG, f, 0.26 * ga));
            gr.addColorStop(0.5, mixa([255, 255, 255], FOG, f, 0.5 * ga)); gr.addColorStop(0.58, mixa(tint, FOG, f, 0.22 * ga));
            gr.addColorStop(1, mixa(edge, FOG, f, 0.55 * ga));
            cell(-1, 1, 0, 1); ctx.fillStyle = gr; ctx.fill();
            if (st.glow) {
                ctx.strokeStyle = mixa(st.glow, FOG, f * 0.6, 0.32 * ga); ctx.lineWidth = Math.max(3, 0.16 * k);
                cell(-1, 1, 0, 1); ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * ga).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, 0.05 * k * Math.abs(ca));
            ctx.beginPath();
            var h1 = qp(-0.6, 0.9), h2 = qp(-0.88, 0.62), h3 = qp(-0.32, 0.9), h4 = qp(-0.8, 0.42), h5 = qp(0.8, 0.38), h6 = qp(0.6, 0.18);
            ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.moveTo(h3[0], h3[1]); ctx.lineTo(h4[0], h4[1]); ctx.moveTo(h5[0], h5[1]); ctx.lineTo(h6[0], h6[1]);
            ctx.stroke();
            if (e.hp > 1) {  /* geode glass: thick, faceted, glowing rim */
                ctx.strokeStyle = 'rgba(236,214,255,.85)'; ctx.lineWidth = Math.max(2, 0.08 * k); cell(-0.93, 0.93, 0.04, 0.96); ctx.stroke();
                if (e.hp > 2) { ctx.lineWidth = Math.max(1.5, 0.05 * k); cell(-0.8, 0.8, 0.1, 0.9); ctx.stroke(); }
                ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, 0.025 * k); ctx.beginPath();
                var fa = qp(-0.93, 0.3), fb = qp(0, 0.04), fc2 = qp(0.93, 0.5), fd = qp(0, 0.96);
                ctx.moveTo(fa[0], fa[1]); ctx.lineTo(fb[0], fb[1]); ctx.lineTo(fc2[0], fc2[1]); ctx.lineTo(fd[0], fd[1]); ctx.closePath(); ctx.stroke();
            }
            if (e.crack) {
                ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1, 0.022 * k);
                ctx.beginPath();
                e.crack.forEach(function (c) { for (var n = 0; n < c.length; n += 2) { var q = qp(clamp(c[n], -1, 1), clamp(c[n + 1], 0, 1)); if (n) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } });
                ctx.stroke();
            }
            if (e.heart) {  /* a crystal heart set in the glass */
                var hc = qp(0, 0.55), hs = Math.max(3, 0.2 * k);
                halo(hc[0], hc[1], hs * 2.4, [120, 255, 180], A * 0.6 * ga); ctx.globalAlpha = A * ga;
                ctx.fillStyle = '#7ce8b0'; ctx.beginPath(); ctx.moveTo(hc[0], hc[1] - hs); ctx.lineTo(hc[0] + hs * 0.6, hc[1]); ctx.lineTo(hc[0], hc[1] + hs); ctx.lineTo(hc[0] - hs * 0.6, hc[1]); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#d8ffe9'; ctx.beginPath(); ctx.moveTo(hc[0], hc[1] - hs); ctx.lineTo(hc[0] + hs * 0.6, hc[1]); ctx.lineTo(hc[0], hc[1]); ctx.closePath(); ctx.fill();
            }
            ctx.globalAlpha = A * (0.3 + 0.7 * ga);
            ctx.strokeStyle = st.frame; ctx.lineWidth = Math.max(1.5, 0.045 * k);
            cell(-1, 1, 0, 1); ctx.stroke();
        } else {
            ctx.fillStyle = mixa(st.tint, FOG, f, 0.55);
            [[-1, 0, 1, 1], [1, 0, -1, 1], [-1, 1, 1, -1], [1, 1, -1, -1]].forEach(function (c, n) {
                var l = 0.25 + hash(e.seed + n) * 0.3, a = qp(c[0], c[1]), b = qp(c[0] + c[2] * l, c[1]), m = qp(c[0] + c[2] * l * 0.3, c[1] + c[3] * l * 0.3), d = qp(c[0], c[1] + c[3] * l * 0.8);
                ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(m[0], m[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
            });
        }
        ctx.restore();
    }
    function drawFrame(e) {
        var dz = e.z - camZ;
        if (dz < NEAR + 0.05) return;
        var Z = e.Z, f = fogf(dz), A = fade(dz), t = 0.1, r, glow = Z.gate;
        ctx.globalAlpha = A; ctx.fillStyle = mixc(Z.post, FOG, f);
        if (e.kind === 'pivot') {
            r = rectW(-0.04, 0.04, 0, e.y1 + 0.55, e.z); if (r) ctx.fillRect(r[0], r[1], r[2], r[3]);
            if (PL(0, e.y1 + 0.55, e.z)) { ctx.fillStyle = mixc([240, 190, 100], FOG, f); ctx.beginPath(); ctx.arc(px, py, Math.max(2, 0.14 * pk), 0, TAU); ctx.fill(); }
            ctx.globalAlpha = 1; return;
        }
        var tops = [];
        r = rectW(-e.half - t, -e.half + t * 0.4, 0, e.y1 + t, e.z); if (r) { ctx.fillRect(r[0], r[1], r[2], r[3]); tops.push(-e.half - t * 0.3); }
        r = rectW(e.half - t * 0.4, e.half + t, 0, e.y1 + t, e.z); if (r) { ctx.fillRect(r[0], r[1], r[2], r[3]); tops.push(e.half + t * 0.3); }
        if (e.kind === 'rail' || e.kind === 'lock') {
            r = rectW(-e.half - t, e.half + t, e.y1, e.y1 + (e.kind === 'lock' ? 0.36 : t), e.z); if (r) ctx.fillRect(r[0], r[1], r[2], r[3]);
            if (e.kind === 'lock' && r) {  /* warning lights over the airlock */
                for (var i = 0; i < 5; i++) {
                    var on = Math.sin(clock * 4 + i * 1.3) > 0 || RM, lc = i % 2 ? [255, 120, 220] : [120, 230, 255];
                    if (PL(-e.half + (i + 0.5) * e.half * 2 / 5, e.y1 + 0.18, e.z)) {
                        ctx.globalAlpha = A; ctx.fillStyle = rgba(on ? lc : [60, 50, 90]); ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, 0.07 * pk), 0, TAU); ctx.fill();
                        if (on) halo(px, py, 0.3 * pk, lc, A * 0.5);
                    }
                }
            }
        }
        tops.forEach(function (x) { if (PL(x, e.y1 + t + 0.08, e.z)) { halo(px, py, 0.32 * pk, glow, A * 0.55); ctx.globalAlpha = A; ctx.fillStyle = rgba(lerpc(glow, [255, 255, 255], 0.5)); ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, 0.07 * pk), 0, TAU); ctx.fill(); } });
        ctx.globalAlpha = 1;
    }
    function drawPortal(e) {
        if (!PL(0, 0, e.z)) return;
        var k = pk, sx = px, sy = py, Zn = ZONES[e.zi % NZ], dz = e.z - camZ, A = fade(dz), c1 = Zn.gate, c2 = Zn.gate2, Hh = (OH + OW + 1.5) * k;
        ctx.save();
        ctx.translate(sx, sy); ctx.scale(1, clamp(EYE / dz, 0.06, 0.6));  /* a pool of light on the ground */
        ctx.globalAlpha = A * 0.55; ctx.drawImage(glowSpr(c1), -3.4 * k, -3.4 * k, 6.8 * k, 6.8 * k);
        ctx.restore();
        ctx.globalAlpha = A;
        [-1, 1].forEach(function (sd) {  /* two tapering pylons with glowing runes */
            var x0 = sx + sd * (OW + 0.55) * k, bw = 0.34 * k, tw = 0.16 * k;
            var gr = ctx.createLinearGradient(0, sy - Hh, 0, sy);
            gr.addColorStop(0, rgba(lerpc(c1, [40, 30, 70], 0.35))); gr.addColorStop(1, rgba(lerpc(c1, [30, 20, 50], 0.75)));
            ctx.fillStyle = gr;
            ctx.beginPath(); ctx.moveTo(x0 - bw, sy); ctx.lineTo(x0 - tw, sy - Hh); ctx.lineTo(x0 + tw, sy - Hh); ctx.lineTo(x0 + bw, sy); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = rgba(c2, 0.9); ctx.lineWidth = Math.max(1, 0.04 * k);
            ctx.beginPath();
            for (var i = 0; i < 4; i++) { var yy = sy - (0.6 + i * 0.95) * k; ctx.moveTo(x0 - 0.08 * k, yy); ctx.lineTo(x0, yy - 0.18 * k); ctx.lineTo(x0 + 0.08 * k, yy); }
            ctx.stroke();
            var bob = RM ? 0 : Math.sin(clock * 2 + sd) * 0.12 * k, cyy = sy - Hh - 0.45 * k + bob;
            halo(x0, cyy, 0.9 * k, c2, A * 0.6);
            ctx.globalAlpha = A; ctx.fillStyle = rgba(lerpc(c2, [255, 255, 255], 0.5));
            ctx.beginPath(); ctx.moveTo(x0, cyy - 0.28 * k); ctx.lineTo(x0 + 0.13 * k, cyy); ctx.lineTo(x0, cyy + 0.28 * k); ctx.lineTo(x0 - 0.13 * k, cyy); ctx.closePath(); ctx.fill();
        });
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var widths = [[0.55, rgba(c1, 0.25)], [0.2, rgba(c1, 0.95)], [0.07, rgba(lerpc(c2, [255, 255, 255], 0.4))]];
        widths.forEach(function (wc) {
            ctx.strokeStyle = wc[1]; ctx.lineWidth = Math.max(1, wc[0] * k);
            ctx.beginPath(); ctx.moveTo(sx - OW * k, sy); ctx.lineTo(sx - OW * k, sy - OH * k); ctx.arc(sx, sy - OH * k, OW * k, Math.PI, TAU); ctx.lineTo(sx + OW * k, sy); ctx.stroke();
        });
        locks.forEach(function (ls) {  /* the 2 s window of a gate challenge, as a shrinking arc of light */
            if (ls.gz !== e.gz || ls.t < 0 || ls.done) return;
            var left = clamp(1 - (clock - ls.t) / 2, 0, 1);
            ctx.globalAlpha = A; ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = Math.max(2, 0.12 * k);
            ctx.beginPath(); ctx.arc(sx, sy - OH * k, (OW + 0.6) * k, Math.PI, Math.PI + Math.PI * left); ctx.stroke();
        });
        for (var i = 0; i < 9; i++) {  /* sparks running round the arch */
            var an = Math.PI + (((RM ? 0 : clock * 0.22) + i / 9) % 1) * Math.PI, rr2 = (OW + 0.28) * k;
            halo(sx + Math.cos(an) * rr2, sy - OH * k + Math.sin(an) * rr2, 0.16 * k, c2, A * 0.9);
        }
        ctx.globalAlpha = 1;
    }
    function drawDoor(e) {  /* a brass bulkhead across the walkway with a hatch that opens when its lever is hit */
        if (!PL(0, 0, e.z)) return;
        var k = pk, dz = e.z - camZ, c0 = cx(e.z), sx = px, B = py, hw = 4.3, L = sx - hw * k, R = sx + hw * k, T = B - 7.5 * k, Bb = B + 1.2 * k;
        var dl = sx - DW / 2 * k, dr = sx + DW / 2 * k, dt = B - DH * k, f = fogf(dz);
        ctx.globalAlpha = fade(dz);
        var ca = Math.cos(e.a), sa = Math.sin(e.a), hx = -DW / 2;
        function leaf(u0, u1, v0, v1) {
            return quadW([c0 + hx + DW * ca * u0, DH * v0, e.z + DW * sa * u0, c0 + hx + DW * ca * u1, DH * v0, e.z + DW * sa * u1,
                          c0 + hx + DW * ca * u1, DH * v1, e.z + DW * sa * u1, c0 + hx + DW * ca * u0, DH * v1, e.z + DW * sa * u0]);
        }
        if (leaf(0, 1, 0, 1)) { ctx.fillStyle = mixc([176, 120, 60], FOG, f); ctx.fill(); }
        ctx.fillStyle = mixc([140, 92, 46], FOG, f);
        if (leaf(0.14, 0.86, 0.55, 0.9)) ctx.fill();
        if (leaf(0.14, 0.86, 0.1, 0.45)) ctx.fill();
        ctx.beginPath(); ctx.rect(L, T, R - L, Bb - T);
        ctx.moveTo(dl, B); ctx.lineTo(dl, dt); ctx.lineTo(dr, dt); ctx.lineTo(dr, B); ctx.closePath();
        var gr = ctx.createLinearGradient(0, T, 0, Bb);
        gr.addColorStop(0, mixc([92, 60, 34], FOG, f)); gr.addColorStop(0.6, mixc([150, 102, 52], FOG, f)); gr.addColorStop(1, mixc([70, 44, 26], FOG, f));
        ctx.fillStyle = gr; ctx.fill('evenodd');
        ctx.fillStyle = mixc([230, 176, 92], FOG, f);
        ctx.fillRect(L, B - 2.7 * k, dl - L, 0.12 * k); ctx.fillRect(dr, B - 2.7 * k, R - dr, 0.12 * k); ctx.fillRect(L, B - 5.2 * k, R - L, 0.12 * k);
        for (var i = 0; i < 2; i++) {  /* two big gears set into the wall */
            var gx = sx + (i ? 1 : -1) * 2.6 * k, gy = B - 1.4 * k;
            ctx.save(); ctx.translate(gx, gy); ctx.rotate((i ? 1 : -1) * (RM ? 0 : clock * 0.6));
            ctx.drawImage(SPR.gear(i).cv, -1.1 * k, -1.1 * k, 2.2 * k, 2.2 * k); ctx.restore();
        }
        ctx.strokeStyle = '#ffd38a'; ctx.lineWidth = Math.max(2, 0.08 * k); ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(dl, B); ctx.lineTo(dl, dt); ctx.lineTo(dr, dt); ctx.lineTo(dr, B); ctx.stroke();
        if (!e.open || e.a < 0.3) {
            pos(e, clock);
            if (P(SX, SY, SZ)) {
                var rr = 0.08 * pk;
                if (!e.open) {
                    halo(px, py, rr * 5, [255, 200, 90], RM ? 0.75 : 0.6 + 0.3 * Math.sin(clock * 6));
                    ctx.globalAlpha = fade(dz);
                    ctx.strokeStyle = 'rgba(255,220,140,.9)'; ctx.lineWidth = Math.max(1.5, 0.025 * pk);
                    ctx.beginPath(); ctx.arc(px, py, rr * (2.2 + (RM ? 0 : Math.sin(clock * 6) * 0.5)), 0, TAU); ctx.stroke();
                }
                ctx.fillStyle = '#ffd25c'; ctx.strokeStyle = '#b07a1e'; ctx.lineWidth = Math.max(1, 0.02 * pk);
                gearPath(ctx, px, py, rr * 1.3, 8, rr * 0.35); ctx.fill(); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

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
