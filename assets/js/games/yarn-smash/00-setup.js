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

