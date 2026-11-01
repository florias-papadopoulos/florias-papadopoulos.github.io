/* Yarn Smash: an endless cat run through five very different places, throwing yarn to shatter the glass on the way.
   Pseudo-3D: x across, y up, z forward. The path bends: its centre line is cx(z) and the camera looks along the
   tangent (slope camS), so a world point projects with X = x - camX - camS dz, sx = CX + X F / dz, sy = HY - (y - EYE) F / dz.
   The world is painted far to near in strips (one zone per strip); glass, targets and props are drawn between the
   strips they stand in, so bends and walls hide what is behind them. Every ZONE_LEN metres a glass gate leads into the
   next zone; after the last one the tour starts again, faster. Yarn is the ammo, the game ends at 0. Shell API: arcade.js. */
Arcade.register('yarn-smash', function (api) {
    'use strict';
    api.css(
        '.ys, .ys-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
        '.ys { overflow: hidden; }' +
        '.ys-cv { touch-action: none; cursor: crosshair; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }' +
        '.ys-hint { position: absolute; left: 50%; bottom: 24%; transform: translateX(-50%); width: max-content; max-width: 84%; padding: 8px 14px;' +
        '  border-radius: 14px; background: rgba(255,255,255,.94); box-shadow: 0 4px 14px rgba(15,23,42,.12); color: #475569; font-weight: 700;' +
        '  font-size: .95rem; line-height: 1.35; text-align: center; pointer-events: none; transition: opacity .4s; }' +
        '.ys-hint.ys-gone { opacity: 0; }' +
        '.ys-card { position: absolute; left: 50%; top: 27%; transform: translate(-50%, -50%) scale(.85); width: max-content; max-width: 88%;' +
        '  text-align: center; pointer-events: none; opacity: 0; transition: opacity .45s, transform .45s cubic-bezier(.3, 1.5, .5, 1); }' +
        '.ys-card.ys-show { opacity: 1; transform: translate(-50%, -50%) scale(1); }' +
        '.ys-card small { display: block; margin-bottom: 6px; color: #fff; font-weight: 800; font-size: .8rem; letter-spacing: .14em;' +
        '  text-transform: uppercase; text-shadow: 0 1px 3px rgba(15,23,42,.45); }' +
        '.ys-card b { display: inline-block; padding: 6px 20px; border-radius: 20px; background: rgba(255,255,255,.95); color: var(--c, #d6336c);' +
        '  font-size: clamp(1.5rem, 6.5vw, 2.6rem); font-weight: 900; line-height: 1.15; box-shadow: 0 6px 22px rgba(15,23,42,.18); }' +
        '.ys-card span { display: block; margin: 8px auto 0; width: max-content; max-width: 100%; padding: 5px 12px; border-radius: 12px;' +
        '  background: rgba(255,255,255,.9); color: #475569; font-weight: 700; font-size: .9rem; }');

    /* ---------- constants ---------- */
    var EYE = 1.2, NEAR = 0.3, FAR = 46, G = 9, BALL_V = 24, BR = 0.11, MAXP = 240, ZONE_LEN = 220;
    var DW = 1.3, DH = 2.15, OW = 1.35, OH = 2.1;          /* library door; zone gate arch (half width, height of the sides) */
    var FUR = '#f6a23a', STRIPE = '#cf7419', OL = '#3b2a1e', BEAN = '#f7a6bf', TAU = Math.PI * 2;

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    function fogf(dz) { return Math.pow(clamp((dz - 4) / (FAR - 4), 0, 1), 1.3); }
    function fade(dz) { return clamp((FAR + 2 - dz) / 8, 0, 1) * (1 - 0.75 * fogf(dz)); }
    function mixc(c, fog, f, k) {
        k = k || 1;
        var r = Math.min(255, c[0] * k), g = Math.min(255, c[1] * k), b = Math.min(255, c[2] * k);
        return 'rgb(' + ((r + (fog[0] - r) * f) | 0) + ',' + ((g + (fog[1] - g) * f) | 0) + ',' + ((b + (fog[2] - b) * f) | 0) + ')';
    }
    function mixa(c, fog, f, a) {
        return 'rgba(' + ((c[0] + (fog[0] - c[0]) * f) | 0) + ',' + ((c[1] + (fog[1] - c[1]) * f) | 0) + ',' + ((c[2] + (fog[2] - c[2]) * f) | 0) + ',' + a + ')';
    }

    /* ---------- page ---------- */
    var wrapEl = document.createElement('div');
    wrapEl.className = 'ys';
    wrapEl.innerHTML = '<canvas class="ys-cv"></canvas><div class="ys-card"><small></small><b></b><span></span></div><div class="ys-hint">' +
        (api.touch ? 'Tap to throw yarn.' : 'Click (or press Space) to throw yarn.') + ' Shatter the glass before you reach it.</div>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.ys-cv'), ctx = cv.getContext('2d', { alpha: false });
    var hintEl = wrapEl.querySelector('.ys-hint'), cardEl = wrapEl.querySelector('.ys-card');
    var dpr = 1, W = 1, H = 1, F = 1, CX = 0, HY = 0, PAW = 50, SKYM = 100, skyCache = {};

    /* ---------- state ---------- */
    var camZ = 0, camX = 0, camS = 0, speed = 0, clock = 0, playT = 0, phase = 'play', balls = 15, bonus = 0, smashed = 0, shownScore = -1;
    var streak = 0, multi = 1, lastThrow = -9, stumble = 1, zoomT = 0, shake = 0, flash = 0, runPh = 0, curZi = -1, cardTimer = null;
    var ents = [], groups = [], props = [], flying = [], parts = [], floats = [], rings = [], paws = [0, 0];
    var nextZ = 14, propZ = 0, nextGate = 1, lastDoorZ = -99, lastDotZ = -99, labels = {}, lastSay = -99, lowWarned = false, firstPane = true, hinted = false;
    var px = 0, py = 0, pk = 0, SX = 0, SY = 0, SZ = 0, SR = 0, QX = 0, QA = 0, HIT = null;

    /* ---------- the five zones ---------- */
    function libHw(z) { var s = Math.max(0, Math.sin(z * 0.05)); return 2.1 - 0.75 * s * s; }   /* library aisles narrow and widen */
    function roofY(lx) { var a = Math.abs(lx); return a < 1.5 ? 0 : -(a - 1.5) * 0.49; }
    var ZONES = [
        { name: 'Moonlit Rooftops', hint: 'Sliding glass: smash it or slip past', accent: '#7c6fd6', chat: 'Ooh, rooftops at night!',
          fog: [150, 126, 188], bend: 0.9, stand: 'crate', standX: 1.08, lampY: 0, dot: 0.14,
          glass: { frame: '#5d6199', tint: [200, 216, 255], shards: ['rgba(205,220,255,', 'rgba(235,240,255,', 'rgba(255,255,255,'] },
          gate: { wall: [92, 80, 140], trim: '#ffd98a', banner: '#2f2b5e', text: '#ffd98a' },
          inside: function (lx, y) { return Math.abs(lx) < 6.5 && y > roofY(lx) && y < 9; } },
        { name: 'The Greenhouse', hint: 'Tough glass cracks first, then shatters', accent: '#2f9e44', chat: 'So many plants!',
          fog: [226, 242, 230], bend: 0.25, stand: 'bench', standX: 1.5, lampY: 3.95, lampL: 1.25, dot: 0.1,
          glass: { frame: '#ffffff', tint: [214, 245, 228], shards: ['rgba(214,245,228,', 'rgba(240,255,248,', 'rgba(255,255,255,'] },
          gate: { wall: [246, 244, 236], trim: '#7fbf7f', banner: '#ffffff', text: '#2f9e44' },
          inside: function (lx, y) { var a = Math.abs(lx); return a < 2.7 && y > 0 && y < 2.7 + (2.7 - a) * 0.52; } },
        { name: 'Aquarium Tunnel', hint: 'Spinning panes: hit them face on', accent: '#1c7ed6', chat: 'Fish! So many fish!',
          fog: [84, 164, 200], bend: 1.15, stand: 'rock', standX: 1.55, lampY: 0, dot: 0.1,
          glass: { frame: '#eaf8ff', tint: [184, 236, 255], shards: ['rgba(184,236,255,', 'rgba(220,248,255,', 'rgba(255,255,255,'] },
          gate: { wall: [60, 130, 176], trim: '#bff1ff', banner: '#eaf8ff', text: '#1c7ed6' },
          inside: function (lx, y) { var u = lx / 2.4, v = y / 2.8; return y > 0 && u * u + v * v < 1; } },
        { name: 'Neon Night Market', hint: 'Shop doors open and close: time it or smash', accent: '#e64980', chat: 'Neon lights, nice.',
          fog: [96, 80, 140], bend: 0.35, stand: 'stall', standX: 3.45, lampY: 4.7, lampL: 1.5, dot: 0.3,
          glass: { frame: '#ff8fc8', tint: [200, 180, 255], glow: true, shards: ['rgba(255,170,215,', 'rgba(200,180,255,', 'rgba(255,255,255,'] },
          gate: { wall: [58, 50, 96], trim: '#ff8fc8', banner: '#241f45', text: '#7ff0e0' },
          inside: function (lx, y) { var a = Math.abs(lx); return a < 4.3 && y > (a > 3 ? 0.15 : 0) && y < 12; } },
        { name: 'The Midnight Library', hint: 'Hit the door handles, mind the narrow aisles', accent: '#9c36b5', chat: 'Shh, this is a library.',
          fog: [238, 208, 162], bend: 0, stand: 'table', standX: -1, lampY: 5.2, lampL: 1.9, dot: 0.1,
          glass: { frame: '#4a2f26', stained: true, tint: [255, 230, 180],
                   shards: ['rgba(240,110,130,', 'rgba(110,170,240,', 'rgba(250,210,90,', 'rgba(130,210,150,'] },
          gate: { wall: [128, 82, 60], trim: '#f2c46b', banner: '#5a3424', text: '#f2c46b' },
          inside: function (lx, y, z) { return Math.abs(lx) < libHw(z) && y > 0 && y < 5.2; } }
    ];
    var NZ = ZONES.length;
    function zoneIdx(z) { return Math.max(0, Math.floor(z / ZONE_LEN)); }
    function zoneOf(z) { return ZONES[zoneIdx(z) % NZ]; }
    function amp(z) {  /* how much the path bends here, eased across zone borders */
        var zi = zoneIdx(z), u = z - zi * ZONE_LEN, a = ZONES[zi % NZ].bend;
        if (u < 30 && zi > 0) { var p = ZONES[(zi - 1) % NZ].bend, s = u / 30; s = s * s * (3 - 2 * s); return p + (a - p) * s; }
        return a;
    }
    function cx(z) { return amp(z) * (2.4 * Math.sin(z / 26) + 1.1 * Math.sin(z / 11.3 + 1.3)); }
    function standX(Z, z) { return Z.standX > 0 ? Z.standX : libHw(z) - 0.42; }

    function P(x, y, z) {  /* project a world point into px, py; pk = pixels per metre there */
        var dz = z - camZ;
        if (dz < NEAR) return false;
        pk = F / dz; px = CX + (x - camX - camS * dz) * pk; py = HY - (y - EYE) * pk;
        return true;
    }
    function PL(lx, y, z) { return P(cx(z) + lx, y, z); }

    function fit(s) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, s.w); H = Math.max(1, s.h);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        F = Math.min(W * (W < H ? 1.1 : 0.92), H * 0.95);  /* portrait phones: a closer view, bigger targets */
        CX = W / 2; HY = H * (W < H ? 0.45 : 0.42);
        PAW = clamp(Math.min(W, H) * 0.1, 34, 68);
        SKYM = Math.ceil(F * 0.3);
        skyCache = {};
    }

    /* ---------- a ball of wool (same look as the other games): drawn once per size, then rotated for the spin ---------- */
    var WOOL = {
        pink:   { base: '#f783ac', light: '#ffd0e0', dark: '#c2255c', lo: 'rgba(255, 228, 238, .7)', hi: 'rgba(166, 30, 77, .38)' },
        orange: { base: '#fb9a4b', light: '#ffe0bf', dark: '#c2410c', lo: 'rgba(255, 237, 213, .7)', hi: 'rgba(154, 52, 18, .38)' }
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
        /* bands of wound strands: tilt, roundness, offset; each strand is the front half of an ellipse */
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
        var sh = c.createRadialGradient(o - r * 0.3, o - r * 0.35, r * 0.3, o, o, r);  /* round it off again */
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
    function wool(x, y, r, a, tone) {
        var w = woolImg(r, tone || 'pink');
        ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a);
        ctx.drawImage(w.cv, -w.s / 2, -w.s / 2, w.s, w.s);
        ctx.restore();
    }

    /* ---------- skies and backdrops: one cached canvas per zone, wider than the screen, shifted as the path turns ---------- */
    function vgrad(g, h, stops) {
        var gr = g.createLinearGradient(0, 0, 0, h);
        stops.forEach(function (s) { gr.addColorStop(clamp(s[0], 0, 1), 'rgb(' + s[1].join(',') + ')'); });
        return gr;
    }
    function seeded(n) { var s = n; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
    function skyline(g, w, base, hmin, hmax, col, win, r) {
        g.fillStyle = col;
        for (var x = -10; x < w; ) {
            var bw = (14 + r() * 40) * F / 700, bh = (hmin + r() * (hmax - hmin)) * F / 700;
            g.fillStyle = col; g.fillRect(x, base - bh, bw + 1, bh + H);
            if (r() < 0.3) g.fillRect(x + bw * 0.4, base - bh - 8 * F / 700, 2, 8 * F / 700);  /* antenna */
            if (win) for (var wy = base - bh + 5; wy < base - 3; wy += 6) for (var wx = x + 3; wx < x + bw - 3; wx += 5) {
                if (r() < 0.22) { g.fillStyle = win[Math.floor(r() * win.length)]; g.fillRect(wx, wy, 2, 2.5); }
            }
            x += bw + r() * 6;
        }
    }
    var SKY = [
        function (g, w) {  /* rooftops: twilight sky, stars, a lit city below the horizon */
            var r = seeded(7);
            g.fillStyle = vgrad(g, H, [[0, [40, 42, 92]], [HY * 0.55 / H, [86, 78, 152]], [HY * 0.92 / H, [214, 150, 196]], [HY / H, [246, 182, 196]],
                                       [HY / H + 0.02, [104, 90, 160]], [1, [60, 52, 106]]]);
            g.fillRect(0, 0, w, H);
            for (var i = 0; i < 110; i++) {
                g.globalAlpha = 0.35 + r() * 0.6; g.fillStyle = '#fff';
                var sz = r() < 0.12 ? 2 : 1.2; g.fillRect(r() * w, r() * HY * 0.8, sz, sz);
            }
            g.globalAlpha = 1;
            skyline(g, w, HY + 4, 10, 46, '#6a5fa8', ['rgba(255,217,138,.6)'], r);
            skyline(g, w, HY + 10, 16, 70, '#4c4386', ['#ffd98a', '#ffc2d9'], r);
            for (i = 0; i < 260; i++) {  /* streets of light far below */
                g.fillStyle = r() < 0.5 ? 'rgba(255,217,138,.55)' : 'rgba(255,194,217,.45)';
                g.fillRect(r() * w, HY + 14 + r() * (H - HY), 1.6, 1.6);
            }
        },
        function (g, w) {  /* greenhouse: a bright day, trees and a lawn outside */
            var r = seeded(11);
            g.fillStyle = vgrad(g, H, [[0, [160, 214, 240]], [HY / H, [236, 248, 240]], [HY / H + 0.01, [176, 214, 160]], [1, [150, 196, 138]]]);
            g.fillRect(0, 0, w, H);
            var sg = g.createRadialGradient(w * 0.25, HY * 0.2, 0, w * 0.25, HY * 0.2, HY);
            sg.addColorStop(0, 'rgba(255,250,220,.9)'); sg.addColorStop(1, 'rgba(255,250,220,0)');
            g.fillStyle = sg; g.fillRect(0, 0, w, HY * 1.3);
            for (var x = -20; x < w; x += 14 + r() * 26) {
                var rr = (14 + r() * 30) * F / 700;
                g.fillStyle = r() < 0.5 ? '#9fcf96' : '#8cc287';
                g.beginPath(); g.arc(x, HY - rr * 0.4, rr, 0, TAU); g.fill();
            }
            g.fillStyle = '#b9dca8'; g.fillRect(0, HY, w, 6);
        },
        function (g, w) {  /* aquarium: water, light rays from above, rocks far away */
            var r = seeded(5);
            g.fillStyle = vgrad(g, H, [[0, [150, 222, 238]], [HY / H, [84, 164, 200]], [1, [36, 100, 146]]]);
            g.fillRect(0, 0, w, H);
            for (var i = 0; i < 9; i++) {
                var x = r() * w, bw = 20 + r() * 50;
                g.fillStyle = 'rgba(255,255,255,' + (0.05 + r() * 0.07).toFixed(2) + ')';
                g.beginPath(); g.moveTo(x, 0); g.lineTo(x + bw, 0); g.lineTo(x + bw * 0.4 + 120, H); g.lineTo(x + 120 - bw * 0.3, H); g.fill();
            }
            g.fillStyle = 'rgba(40,104,140,.6)';
            for (x = -30; x < w; x += 30 + r() * 60) { g.beginPath(); g.ellipse(x, HY + 8, 30 + r() * 60, 12 + r() * 24, 0, Math.PI, 0); g.fill(); }
            g.fillStyle = 'rgba(255,255,255,.5)';
            for (i = 0; i < 60; i++) { g.beginPath(); g.arc(r() * w, r() * H, 1 + r() * 2.5, 0, TAU); g.fill(); }
        },
        function (g, w) {  /* night market: city towers, pink haze */
            var r = seeded(3);
            g.fillStyle = vgrad(g, H, [[0, [30, 28, 66]], [HY * 0.85 / H, [100, 78, 146]], [HY / H, [214, 130, 176]], [HY / H + 0.01, [80, 66, 120]], [1, [52, 44, 88]]]);
            g.fillRect(0, 0, w, H);
            for (var i = 0; i < 50; i++) { g.globalAlpha = 0.3 + r() * 0.5; g.fillStyle = '#fff'; g.fillRect(r() * w, r() * HY * 0.6, 1.2, 1.2); }
            g.globalAlpha = 1;
            skyline(g, w, HY + 6, 40, 200, '#3e3574', ['#ff8fc8', '#7ff0e0', '#ffe08a'], r);
        },
        function (g, w) {  /* library: golden haze at the end of the aisle */
            g.fillStyle = vgrad(g, H, [[0, [150, 104, 96]], [HY / H, [244, 216, 170]], [1, [176, 120, 86]]]);
            g.fillRect(0, 0, w, H);
            var gl = g.createRadialGradient(w / 2, HY, 0, w / 2, HY, F * 0.6);
            gl.addColorStop(0, 'rgba(255,240,200,.9)'); gl.addColorStop(1, 'rgba(255,240,200,0)');
            g.fillStyle = gl; g.fillRect(0, 0, w, H);
        }
    ];
    function sky(zi, shift) {
        var k = zi % NZ;
        if (!skyCache[k]) {
            var c = document.createElement('canvas');
            c.width = W + 2 * SKYM; c.height = H;
            SKY[k](c.getContext('2d'), c.width);
            skyCache[k] = c;
        }
        ctx.drawImage(skyCache[k], shift - SKYM, 0, W + 2 * SKYM, H);
        if (k === 0) {  /* the moon, drawn live so it stays crisp */
            var mx = W * 0.74 + shift, my = HY * 0.3, mr = clamp(Math.min(W, H) * 0.075, 22, 58);
            var hg = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 2.6);
            hg.addColorStop(0, 'rgba(255,240,210,.45)'); hg.addColorStop(1, 'rgba(255,240,210,0)');
            ctx.fillStyle = hg; ctx.fillRect(mx - mr * 2.6, my - mr * 2.6, mr * 5.2, mr * 5.2);
            ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(230,214,180,.7)';
            [[-0.3, -0.2, 0.18], [0.35, 0.25, 0.12], [0.05, 0.5, 0.08]].forEach(function (c) { ctx.beginPath(); ctx.arc(mx + c[0] * mr, my + c[1] * mr, c[2] * mr, 0, TAU); ctx.fill(); });
        }
    }

    /* ---------- strips: the ground, walls and roofs of each zone ---------- */
    var bz = [], nK, nS, nY, fK, fS, fY, SF, SFOG, SL, SDZ, SPAR, SNEAR, SZN, SZF;
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
        nK = F / dn; nS = CX + (cx(zn) - camX - camS * dn) * nK; nY = HY + EYE * nK;
        fK = F / dx; fS = CX + (cx(zx) - camX - camS * dx) * fK; fY = HY + EYE * fK;
        SDZ = (zn + zf) / 2 - camZ; SF = fogf(SDZ); SFOG = Z.fog; SZN = zn; SZF = zf;
        SPAR = (Math.floor(zn + 1e-6) & 1); SNEAR = Math.max(0, 1 - SDZ / 14);
        SL = Z.light ? Z.light((zn + zf) / 2) : 1;
    }
    function QQ(xan, yan, xbn, ybn, xaf, yaf, xbf, ybf, fill) {
        ctx.beginPath();
        ctx.moveTo(nS + xan * nK, nY - yan * nK); ctx.lineTo(nS + xbn * nK, nY - ybn * nK);
        ctx.lineTo(fS + xbf * fK, fY - ybf * fK); ctx.lineTo(fS + xaf * fK, fY - yaf * fK);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function Q(xa, ya, xb, yb, fill) { QQ(xa, ya, xb, yb, xa, ya, xb, yb, fill); }
    function QT(t0, t1, x0, x1, y0, y1, fill) {  /* a piece of a wall strip, from t0 to t1 of the way to its far edge */
        var k0 = nK + (fK - nK) * t0, s0 = nS + (fS - nS) * t0, b0 = nY + (fY - nY) * t0;
        var k1 = nK + (fK - nK) * t1, s1 = nS + (fS - nS) * t1, b1 = nY + (fY - nY) * t1;
        ctx.beginPath();
        ctx.moveTo(s0 + x0 * k0, b0 - y0 * k0); ctx.lineTo(s0 + x0 * k0, b0 - y1 * k0);
        ctx.lineTo(s1 + x1 * k1, b1 - y1 * k1); ctx.lineTo(s1 + x1 * k1, b1 - y0 * k1);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    }
    function C(c, k) { return mixc(c, SFOG, SF, (k || 1) * SL); }
    function CP(c, k) { return C(c, (k || 1) * (1 - 0.07 * SPAR * SNEAR)); }  /* checkered by metre, fading with distance */
    function CA(c, a) { return mixa(c, SFOG, SF, a); }
    function at(z, step) { return Math.abs(z / step - Math.round(z / step)) < 1e-4; }
    function nearLine(pts, col, w) {  /* a polyline in the plane of the strip's near edge */
        ctx.beginPath();
        for (var i = 0; i < pts.length; i += 2) { var x = nS + pts[i] * nK, y = nY - pts[i + 1] * nK; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.strokeStyle = col; ctx.lineWidth = clamp(w * nK, 1, 7); ctx.stroke();
    }
    var ARCH = [];
    for (var ai = 0; ai <= 8; ai++) { var aa = Math.PI * (1 - ai / 8); ARCH.push(Math.cos(aa) * 2.4, Math.sin(aa) * 2.8); }
    var BOOKS = [[200, 92, 104], [92, 132, 176], [222, 182, 92], [112, 164, 122], [162, 112, 176], [232, 142, 112], [90, 160, 170]];
    var FACADE = [[150, 110, 168], [110, 128, 184], [178, 128, 150], [96, 146, 160]];

    ZONES[0].strip = function () {  /* a narrow ridge walkway between two moonlit roof slopes */
        Q(-6.5, -2.45, -1.5, 0, C([132, 82, 120]));
        Q(1.5, 0, 6.5, -2.45, CP([186, 116, 150]));
        if (SDZ < 30) for (var r = 1; r < 5; r++) {  /* rows of tiles */
            var a = 1.5 + r, b = 1.5 + r + 0.08;
            Q(-a, -(a - 1.5) * 0.49, -b, -(b - 1.5) * 0.49, CA([90, 50, 86], 0.35));
            Q(a, -(a - 1.5) * 0.49, b, -(b - 1.5) * 0.49, CA([120, 66, 100], 0.35));
        }
        Q(-1.5, 0, 1.5, 0, CP([128, 132, 192]));
        Q(-0.07, 0.001, 0.07, 0.001, C([150, 154, 208]));
        Q(-1.58, -0.04, -1.5, 0, C([230, 206, 236])); Q(1.5, 0, 1.58, -0.04, C([230, 206, 236]));
    };
    ZONES[1].strip = function () {  /* stone path, flower beds, brick base, glass walls and a pitched glass roof */
        Q(-2.7, 0, -1, 0, CP([128, 184, 112])); Q(1, 0, 2.7, 0, CP([128, 184, 112]));
        Q(-1, 0, 1, 0, CP([236, 226, 204]));
        Q(-1, 0, -1, 0.14, C([192, 146, 108])); Q(1, 0, 1, 0.14, C([192, 146, 108]));
        Q(-2.7, 0, -2.7, 0.8, C([206, 136, 108], 0.92)); Q(2.7, 0, 2.7, 0.8, C([206, 136, 108]));
        Q(-2.7, 0.8, -2.7, 0.86, C([255, 255, 255])); Q(2.7, 0.8, 2.7, 0.86, C([255, 255, 255]));
        if (SDZ < 32) {
            var t = CA([230, 250, 240], 0.16);
            Q(-2.7, 0.86, -2.7, 2.7, t); Q(2.7, 0.86, 2.7, 2.7, t);
            Q(-2.7, 2.7, 0, 4.1, t); Q(0, 4.1, 2.7, 2.7, t);
        }
        Q(-0.05, 4.1, 0.05, 4.1, C([255, 255, 255]));
    };
    ZONES[1].front = function (zn) {
        if (!at(zn, 2) || SDZ > 30 || SDZ < 2) return;
        ctx.globalAlpha = Math.min(1 - SDZ / 30, (SDZ - 2) / 2);
        nearLine([-2.7, 0.8, -2.7, 2.7, 0, 4.1, 2.7, 2.7, 2.7, 0.8], '#ffffff', 0.05);
        ctx.globalAlpha = 1;
    };
    ZONES[2].strip = function () {  /* the seabed outside, sand and a lit walkway inside a glass arch */
        var out = Math.min(1, SF + 0.3);
        Q(-12, -0.05, -2.4, 0, mixc([206, 190, 150], SFOG, out)); Q(2.4, 0, 12, -0.05, mixc([206, 190, 150], SFOG, out));
        Q(-2.4, 0, -1.3, 0, CP([238, 218, 168])); Q(1.3, 0, 2.4, 0, CP([238, 218, 168]));
        Q(-1.3, 0, 1.3, 0, CP([116, 150, 188]));
        Q(-1.34, 0.002, -1.24, 0.002, C([214, 246, 255], 1.1)); Q(1.24, 0.002, 1.34, 0.002, C([214, 246, 255], 1.1));
        if (SDZ < 26) for (var i = 0; i < 16; i += 2) Q(ARCH[i], ARCH[i + 1], ARCH[i + 2], ARCH[i + 3], CA([210, 246, 255], 0.07));
    };
    ZONES[2].light = function (z) { return 1 + 0.06 * Math.sin(z * 1.3 + clock * 2.2); };  /* caustic shimmer */
    ZONES[2].front = function (zn) {
        if (!at(zn, 4) || SDZ < 1.5) return;
        ctx.globalAlpha = Math.min(1 - SF, (SDZ - 1.5) / 2);
        nearLine(ARCH, '#e8f9ff', 0.07);
        ctx.globalAlpha = 1;
    };
    ZONES[3].strip = function (zn) {  /* a wet street, sidewalks, shop fronts with striped awnings, lit windows above */
        Q(-3, 0, 3, 0, CP([78, 72, 112]));
        if (SDZ < 30 && (Math.floor(zn + 1e-6) % 2 === 0)) Q(-0.07, 0.001, 0.07, 0.001, C([240, 214, 150]));
        Q(-3, 0, -3, 0.15, C([160, 150, 196])); Q(3, 0, 3, 0.15, C([160, 150, 196]));
        Q(-4.3, 0.15, -3, 0.15, CP([122, 114, 160])); Q(3, 0.15, 4.3, 0.15, CP([122, 114, 160]));
        var blk = Math.floor(zn / 8);
        for (var s = -1; s <= 1; s += 2) {
            var h = hash(blk * 2 + (s > 0 ? 1 : 0)), fc = FACADE[Math.floor(h * 4)], x = s * 4.3;
            Q(x, 0.15, x, 9, C(fc, s < 0 ? 0.92 : 1));
            if (SDZ < 30) {
                if (h > 0.25 && (Math.floor(zn + 1e-6) % 4 !== 0)) Q(x, 0.35, x, 2.15, C([255, 214, 168], 1));
                Q(x, 2.75, s * 3.55, 2.35, C(SPAR ? [255, 255, 255] : (h > 0.5 ? [244, 140, 182] : [120, 220, 210])));
                if (SPAR === 0 && SDZ < 26) for (var wy = 3.6; wy < 8.5; wy += 1.6) {
                    var lit = hash(zn * 3.1 + wy * 7 + s) > 0.45;
                    Q(x, wy, x, wy + 0.8, C(lit ? (hash(zn + wy) > 0.5 ? [255, 226, 150] : [255, 190, 220]) : [64, 58, 104]));
                }
            }
        }
    };
    ZONES[4].strip = function () {  /* tall bookshelves, a wooden floor with a carpet runner, a dark beamed ceiling */
        var hn = libHw(SZN), hf = libHw(SZF);
        QQ(-hn, 0, hn, 0, -hf, 0, hf, 0, CP([168, 116, 80]));
        Q(-0.72, 0.001, 0.72, 0.001, C([186, 90, 112]));
        Q(-0.78, 0.001, -0.7, 0.001, C([236, 196, 112])); Q(0.7, 0.001, 0.78, 0.001, C([236, 196, 112]));
        QQ(-hn, 0, -hn, 5.2, -hf, 0, -hf, 5.2, C([116, 74, 56], 0.92)); QQ(hn, 0, hn, 5.2, hf, 0, hf, 5.2, C([116, 74, 56]));
        if (SDZ < 26) for (var r = 0; r < 7; r++) {
            var y0 = 0.22 + r * 0.68, zi = Math.floor(SZN + 1e-6);
            for (var s = -1; s <= 1; s += 2) {
                var hh = hash(zi * 13 + r * 3 + s), top = y0 + 0.4 + 0.16 * hh;
                if (SDZ < 10) {  /* close by: two books per metre */
                    var h2 = hash(zi * 17 + r * 5 + s), t2 = y0 + 0.38 + 0.18 * h2, hm = (hn + hf) / 2;
                    QT(0, 0.5, s * hn, s * hm, y0, top, C(BOOKS[Math.floor(hh * 7)], s < 0 ? 0.88 : 1));
                    QT(0.5, 1, s * hm, s * hf, y0, t2, C(BOOKS[Math.floor(h2 * 7)], s < 0 ? 0.84 : 0.96));
                } else QQ(s * hn, y0, s * hn, top, s * hf, y0, s * hf, top, C(BOOKS[Math.floor(hh * 7)], s < 0 ? 0.88 : 1));
            }
        }
        QQ(-hn, 5.2, hn, 5.2, -hf, 5.2, hf, 5.2, C([116, 76, 82]));
    };
    ZONES[4].light = function (z) { var u = ((z % 12) + 12) % 12 - 6; return 0.86 + 0.26 * Math.exp(-u * u / 10); };  /* pools of light */
    ZONES[4].front = function (zn) {
        if (!at(zn, 2) || SDZ > 28) return;
        var h = libHw(zn);
        ctx.globalAlpha = 1 - SDZ / 28;
        nearLine([-h, 0, -h, 5.2], '#5a3826', 0.06); nearLine([h, 0, h, 5.2], '#5a3826', 0.06);
        if (at(zn, 4)) nearLine([-h, 5.12, h, 5.12], '#6a4636', 0.16);
        ctx.globalAlpha = 1;
    };

    /* ---------- spawning: a blocker every gap, extras in between, props every 4 m, a glass gate at each zone border ---------- */
    function label(type, text) { if (labels[type]) return null; labels[type] = true; return text; }
    function group(z, kind) { var g = { z: z, panels: [], kind: kind, passed: false }; groups.push(g); return g; }
    function glass(g, Z, lx, w, y0, y1, opt) {
        var e = { type: 'glass', z: g.z, lx: lx, w: w, y0: y0, y1: y1, hp: 1, g: g, st: Z.glass, mv: null, broken: false, seed: Math.random() * 99 };
        for (var k in opt) e[k] = opt[k];
        ents.push(e); g.panels.push(e);
        return e;
    }
    function frame(z, Z, kind, half, y1) { ents.push({ type: 'frame', z: z + 0.04, kind: kind, half: half, y1: y1, Z: Z }); }
    function blocker(z, u, lvl, Z, zi) {
        var g = group(z, 'gate'), r = Math.random(), k = zi % NZ, e;
        if (k === 0) {
            if (u > 40 && r < 0.4) {
                e = glass(g, Z, 0, 0.95, 0, 2.2, { mv: { k: 'slide', amp: 1.05, w: 1.3 + lvl, ph: rnd(0, 6) }, label: label('slide', 'Time it or smash it!') });
                frame(z, Z, 'rail', 1.6, 2.32);
            } else if (u > 110 && r < 0.75) { glass(g, Z, -0.75, 0.75, 0, 2.3); glass(g, Z, 0.75, 0.75, 0, 2.3); frame(z, Z, 'posts', 1.55, 2.3); }
            else { glass(g, Z, 0, 1.5, 0, 2.3); frame(z, Z, 'posts', 1.55, 2.3); }
        } else if (k === 1) {
            var tough = u > 12 && r < 0.55, n = u > 100 && Math.random() < 0.5 ? 2 : 1;
            for (var i = 0; i < n; i++) glass(g, Z, n === 1 ? 0 : (i ? 1.35 : -1.35), 2.7 / n, 0, 2.7,
                                               { hp: tough ? 2 : 1, label: tough ? label('tough', 'Tough glass: 2 hits') : null });
        } else if (k === 2) {
            if (u > 12 && r < 0.55) {
                var ph = rnd(0, 6), sp = rnd(1.1, 1.6) * (Math.random() < 0.5 ? -1 : 1);
                if (u > 90 && Math.random() < 0.5) {
                    glass(g, Z, -0.66, 0.64, 0, 2.2, { mv: { k: 'spin', w: sp, ph: ph }, label: label('spin', 'Hit it face on!') });
                    glass(g, Z, 0.66, 0.64, 0, 2.2, { mv: { k: 'spin', w: -sp, ph: ph } });
                } else glass(g, Z, 0, 1.25, 0, 2.25, { mv: { k: 'spin', w: sp, ph: ph }, label: label('spin', 'Hit it face on!') });
                frame(z, Z, 'pivot', 0, 2.3);
            } else glass(g, Z, 0, 1.3, 0, 2.3);
        } else if (k === 3) {
            if (u > 12 && r < 0.6) {
                var dp = rnd(0, 6), dw = rnd(1.3, 1.8) + lvl * 0.5;
                glass(g, Z, -0.9, 0.9, 0, 2.6, { mv: { k: 'door', s: -1, w: dw, ph: dp }, label: label('doors', 'Doors open and close') });
                glass(g, Z, 0.9, 0.9, 0, 2.6, { mv: { k: 'door', s: 1, w: dw, ph: dp } });
                glass(g, Z, -2.4, 0.6, 0, 2.6); glass(g, Z, 2.4, 0.6, 0, 2.6);
                frame(z, Z, 'shop', 3.02, 2.62);
            } else {
                glass(g, Z, 0, 1.0, 0, 2.6); glass(g, Z, -2, 1.0, 0, 2.6); glass(g, Z, 2, 1.0, 0, 2.6);
                frame(z, Z, 'posts', 3.02, 2.62);
            }
        } else {
            var hw = libHw(z);
            if (u > 12 && z - lastDoorZ > 40 && r < 0.4) {
                groups.pop();
                ents.push({ type: 'door', z: z, a: 0, open: false, blocker: true, label: label('door', 'Hit the handle!') });
                lastDoorZ = z;
                return;
            }
            var m = hw < 1.6 || u < 60 ? 1 : (Math.random() < 0.5 ? 2 : 3);
            for (i = 0; i < m; i++) glass(g, Z, -hw + hw / m * (2 * i + 1), hw / m, 0, 3.2);
            frame(z, Z, 'posts', hw, 3.2);
        }
    }
    function addPortal(z, zi) {  /* the zone gate: a big wall with an arched window of glass */
        var Zn = ZONES[zi % NZ], g = group(z, 'portal');
        var st = { frame: Zn.accent, tint: [255, 255, 255], portal: true, shards: Zn.glass.shards };
        glass(g, Zn, -OW / 2, OW / 2, 0, OH + OW, { st: st });
        glass(g, Zn, OW / 2, OW / 2, 0, OH + OW, { st: st });
        ents.push({ type: 'portal', z: z - 0.03, zi: zi });
    }
    function lvlAt(z) { return clamp(z / 900, 0, 1); }
    function spawn() {
        while (nextZ < camZ + FAR + 6) {
            var z = nextZ, zi = zoneIdx(z), zs = zi * ZONE_LEN, ze = zs + ZONE_LEN, Z = ZONES[zi % NZ], u = z - zs, lvl = lvlAt(z), lap = Math.floor(zi / NZ);
            if (z > ze - 12) { nextZ = ze + 14; continue; }  /* keep the gate area clear */
            blocker(z, u, lvl, Z, zi);
            var gap = Math.max(8, 17 - 5 * lvl - lap + rnd(0, 4));
            if (z + gap > ze - 10) gap = ze - 10 - z;  /* extras stay out of the gate area too */
            var slots = [0.15, 0.4, 0.65, 0.9].sort(function () { return Math.random() - 0.5; });
            var spot = function () { return z + 2 + slots.pop() * Math.max(0.5, gap - 4); };
            var walk = Math.min(1.25, (zi % NZ === 4 ? libHw(z) : 1.4) - 0.25);
            if (z < 15 || Math.random() < (balls <= 4 ? 0.95 : zi === 0 ? 0.8 : 0.7)) {
                ents.push({ type: 'crystal', z: spot(), lx: rnd(-walk, walk), y: rnd(1.1, 1.75), ph: rnd(0, 6), label: label('crystal', '+3 yarn') });
            }
            if (Math.random() < 0.55) {
                var vz = spot(), side = Math.random() < 0.5 ? -1 : 1;
                ents.push({ type: 'vase', z: vz, side: side, lx: side * standX(Z, vz), stand: Z.stand, kind: Math.floor(Math.random() * 3),
                            col: pick(['rgba(246,160,196,', 'rgba(140,214,190,', 'rgba(190,170,240,', 'rgba(150,200,240,']), h: rnd(0.32, 0.46) });
            }
            if (Z.lampY && u > 6 && Math.random() < 0.3) ents.push({ type: 'lamp', z: spot(), ph: rnd(0, 6), Z: Z, label: label('lamp', 'Bonus!') });
            if (z > 60 && z - lastDotZ > 55 && Math.random() < Z.dot * 2.5) {
                ents.push({ type: 'dot', z: spot(), ph: rnd(0, 6), label: label('dot', 'Catch the dot!') });
                lastDotZ = z;
            }
            nextZ = z + gap;
        }
        while (nextGate * ZONE_LEN < camZ + FAR + 6) { addPortal(nextGate * ZONE_LEN, nextGate); nextGate++; }
        while (propZ < camZ + FAR + 6) { zoneOf(propZ).props(propZ); propZ += 4; }
    }
    function prop(kind, z, o) { var p = { kind: kind, z: z, ph: rnd(0, 6) }; for (var k in o) p[k] = o[k]; props.push(p); }
    function side() { return Math.random() < 0.5 ? -1 : 1; }
    ZONES[0].props = function (z) {
        if (Math.random() < 0.45) prop('chimney', z + rnd(0, 3), { lx: side() * rnd(2.3, 4.6), h: rnd(1.2, 2.2), w: rnd(0.6, 0.9) });
        if (Math.random() < 0.15) prop('antenna', z + rnd(0, 3), { lx: side() * rnd(2.1, 4) });
        if (at(z, 12)) prop('farroof', z + 2, { lx: (at(z, 24) ? -1 : 1) * rnd(9, 14), w: rnd(4, 6.5), h: rnd(2.5, 5) });
        if (at(z, 28) && z % ZONE_LEN > 8) prop('lights', z + 1, {});
    };
    ZONES[1].props = function (z) {
        if (Math.random() < 0.7) prop('fern', z + rnd(0, 3), { lx: side() * rnd(1.5, 2.4), s: rnd(0.8, 1.3) });
        if (Math.random() < 0.4) prop('hang', z + rnd(0, 3), { lx: side() * rnd(0.9, 1.8) });
        if (Math.random() < 0.4) prop('flowers', z + rnd(0, 3), { lx: side() * rnd(1.2, 2.5) });
    };
    ZONES[2].props = function (z) {
        if (Math.random() < 0.6) prop('weed', z + rnd(0, 3), { lx: side() * rnd(2.8, 6), h: rnd(1.4, 3) });
        if (Math.random() < 0.4) prop('coral', z + rnd(0, 3), { lx: side() * rnd(3, 7), c: pick(['#ff9fb8', '#ffb37a', '#c7a4ff']) });
        if (Math.random() < 0.5) prop('fish', z + rnd(0, 3), { lx: side() * rnd(3.2, 6.5), y: rnd(0.6, 3.4), c: pick([[255, 170, 110], [250, 150, 190], [255, 220, 120], [130, 226, 214]]) });
        if (at(z, 48)) prop('manta', z + 30, { z0: z + 30, t0: clock, lx: rnd(-1, 1) });
    };
    ZONES[3].props = function (z) {
        if (Math.random() < 0.5) prop('sign', z + rnd(0, 3), { lx: side() * 3.85, y: rnd(3.1, 4.2), sym: Math.floor(Math.random() * 5), c: pick(['#ff8fc8', '#7ff0e0', '#ffe08a', '#b9a4ff']) });
        if (at(z, 16)) prop('lanterns', z + 1, {});
        if (at(z, 12)) prop('post', z + 2, { lx: (at(z, 24) ? -1 : 1) * 3.35 });
    };
    ZONES[4].props = function (z) {
        if (Math.random() < 0.55) prop('candle', z + rnd(0, 3), { lx: rnd(-1.4, 1.4), y: rnd(2.7, 4) });
        if (Math.random() < 0.12) prop('ladder', z + rnd(0, 3), { s: side() });
    };

    /* centre and radius of a round target at time t, into SX, SY, SZ, SR (world coordinates) */
    var STANDTOP = { crate: 0.5, bench: 0.72, rock: 0.42, stall: 0.87, table: 0.74 };
    function pos(e, t) {
        var a;
        SZ = e.z;
        if (e.type === 'vase') { SX = cx(e.z) + e.lx; SY = STANDTOP[e.stand] + e.h * 0.5; SR = 0.2; }
        else if (e.type === 'crystal') { SX = cx(e.z) + e.lx; SY = e.y + Math.sin(t * 2 + e.ph) * 0.08; SR = 0.3; }
        else if (e.type === 'lamp') { a = 0.75 * Math.sin(t * 2.1 + e.ph); SX = cx(e.z) + Math.sin(a) * e.Z.lampL; SY = e.Z.lampY - Math.cos(a) * e.Z.lampL; SR = 0.27; }
        else if (e.type === 'dot') { SX = cx(e.z) + 1.2 * Math.sin(t * 2.4 + e.ph) + 0.25 * Math.sin(t * 5.3 + e.ph); SY = 0.12; SR = 0.36; }
        else { SX = cx(e.z) + DW / 2 - 0.16; SY = 1.0; SZ = e.z - 0.06; SR = 0.16; }  /* door handle */
    }
    function round(e) { return !e.broken && (e.type === 'vase' || e.type === 'crystal' || e.type === 'lamp' || e.type === 'dot'); }
    function pstate(e, t) {  /* a glass panel's world centre QX and turn QA right now */
        var lx = e.lx, a = 0, m = e.mv;
        if (m) {
            if (m.k === 'slide') lx += m.amp * Math.sin(t * m.w + m.ph);
            else if (m.k === 'spin') a = t * m.w + m.ph;
            else lx += m.s * 1.75 * clamp(0.5 + 0.9 * Math.sin(t * m.w + m.ph), 0, 1);
        }
        QX = cx(e.z) + lx; QA = a;
    }
    function blocks(e) {  /* does this panel stand in the cat's way? */
        pstate(e, clock);
        var c = Math.abs(Math.cos(QA));
        return !e.broken && c > 0.35 && Math.abs(camX - QX) < e.w * c + 0.22;
    }
    function inArch(lx, y) { return Math.abs(lx) < OW && (y < OH || lx * lx + (y - OH) * (y - OH) < OW * OW); }

    /* ---------- throwing: aim along the tapped ray at the first thing it meets, then lob the ball there ---------- */
    function claimed(e) {
        for (var i = 0; i < flying.length; i++) if (flying[i].ce === e) return true;
        return false;
    }
    function inside(x, y, z) { return zoneOf(z).inside(x - cx(z), y, z); }
    function march(dx, dy) {  /* distance along the ray to the first wall, floor or roof */
        var ox = camX, sxd = camS + dx, t = 0.6, prev = 0.6;
        while (t < FAR) {
            if (!inside(ox + sxd * t, EYE + dy * t, camZ + t)) {
                for (var i = 0; i < 6; i++) { var m = (prev + t) / 2; if (inside(ox + sxd * m, EYE + dy * m, camZ + m)) prev = m; else t = m; }
                return t;
            }
            prev = t; t += 0.25 + t * 0.07;
        }
        return FAR;
    }
    function aim(sx, sy) {
        var dx = (sx - CX) / F, dy = -(sy - HY) / F, Dx = camS + dx, t = march(dx, dy), tg = null, skipped = false;
        var dd = Dx * Dx + dy * dy + 1;
        function onRay() {
            var ox = SX - camX, oy = SY - EYE, oz = SZ - camZ, tt = (ox * Dx + oy * dy + oz) / dd;
            var ex = ox - Dx * tt, ey = oy - dy * tt, ez = oz - tt, rr = Math.max(SR * 1.4, 26 * oz / F);  /* at least 26 px to tap */
            return tt >= 0.6 && tt < t && ex * ex + ey * ey + ez * ez < rr * rr ? tt : -1;
        }
        function sphere(e, isKnob) {
            pos(e, clock);
            var now = onRay();
            if (!isKnob) pos(e, clock + flightT(SX - camX, SY - EYE + 0.45, SZ - camZ));  /* lead moving targets */
            var tt = onRay();
            if (tt < 0) tt = now;
            if (tt < 0) return;
            if ((isKnob || e.type === 'vase' || e.type === 'crystal') && claimed(e)) skipped = true;
            else { t = tt; tg = [SX, SY, SZ, e]; }
        }
        ents.forEach(function (e) {
            if (round(e)) return sphere(e);
            if (e.type === 'door' && !e.open) sphere(e, true);
            var tz, x, y;
            if (e.type === 'glass' && !e.broken) {
                var hitAt = function (time) {  /* where the ray meets the panel as it is at that time, or null */
                    pstate(e, time);
                    var ca = Math.cos(QA), sa = Math.sin(QA), vD = -Dx * sa + ca;
                    if (Math.abs(vD) < 1e-4) return null;
                    var tt = -(-(camX - QX) * sa + (camZ - e.z) * ca) / vD, xx = camX + Dx * tt, yy = EYE + dy * tt;
                    var uu = (xx - QX) * ca + (camZ + tt - e.z) * sa;
                    return tt >= 0.6 && tt < t && Math.abs(uu) <= e.w && yy >= e.y0 && yy <= e.y1 ? [xx, yy, camZ + tt, uu] : null;
                };
                var h = hitAt(clock);
                if (e.mv) {  /* moving glass: aim where it will be when the ball gets there */
                    var lead = clock + flightT(e.lx + cx(e.z) - camX, (e.y0 + e.y1) / 2 - EYE + 0.45, e.z - camZ), hl = hitAt(lead);
                    if (hl) h = hl;
                    else if (h) {
                        pstate(e, lead);
                        var cu = clamp(h[3], -e.w * 0.5, e.w * 0.5);
                        h = [QX + cu * Math.cos(QA), h[1], e.z + cu * Math.sin(QA)];
                    }
                }
                if (!h) return;
                if (claimed(e)) skipped = true; else { t = h[2] - camZ; tg = [h[0], h[1], h[2], e]; }
                return;
            }
            if (e.type !== 'door' && e.type !== 'portal') return;
            tz = e.z - camZ;
            if (tz < 0.6 || tz >= t) return;
            x = camX + Dx * tz - cx(e.z); y = EYE + dy * tz;
            if (e.type === 'portal' ? !inArch(x, y) : (!e.open || Math.abs(x) > DW / 2 || y > DH)) { t = tz; tg = [camX + Dx * tz, y, e.z]; }
        });
        if (!tg && skipped) return null;  /* only something a ball is already flying to: no need to throw again */
        if (!tg) {  /* nothing on the ray: snap to a round target or handle within 40 px of the tap */
            var bd = 40 * 40;
            ents.forEach(function (e) {
                if (!round(e) && !(e.type === 'door' && !e.open)) return;
                if (e.type !== 'lamp' && e.type !== 'dot' && claimed(e)) return;
                pos(e, clock);
                if (SZ - camZ < 1 || SZ - camZ > t + 1 || !P(SX, SY, SZ)) return;
                var q = (px - sx) * (px - sx) + (py - sy) * (py - sy);
                if (q >= bd) return;
                bd = q;
                if (e.type === 'lamp' || e.type === 'dot') pos(e, clock + flightT(SX - camX, SY - EYE + 0.45, SZ - camZ));
                tg = [SX, SY, SZ, e];
            });
        }
        return tg || [camX + Dx * t, EYE + dy * t, camZ + t];
    }
    function throwAt(sx, sy) {
        if (phase !== 'play' || balls <= 0 || clock - lastThrow < 0.12) return;
        var tg = aim(sx, sy);
        rings.push({ x: sx, y: sy, t: 0 });
        if (!tg) return;
        lastThrow = clock;
        balls--;
        if (!hinted) { hinted = true; hintEl.classList.add('ys-gone'); }
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
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz), T = Math.max(0.15, d / (BALL_V + d * 0.5)), top = Math.min(4.6, zoneOf(camZ + dz * 0.5).lampY || 4.6);
        if (zoneOf(camZ + dz * 0.5) === ZONES[2]) top = 2.5;
        if (zoneOf(camZ + dz * 0.5) === ZONES[1]) top = 2.6;
        for (var i = 0; i < 8; i++) {
            var vy = dy / T + 0.5 * G * T;
            if (vy <= 0 || EYE - 0.45 + vy * vy / (2 * G) < Math.max(top, EYE - 0.45 + dy) - 0.1) break;
            T *= 0.85;
        }
        return T;
    }
    function launch(lx0, tx, ty, tz, th) {
        var b = { type: 'ball', x: camX + lx0, y: EYE - 0.45, z: camZ + 0.25, th: th, age: 0, spin: rnd(0, 6), trail: [] };
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
    function hitTest(e, ax, ay, az, bx, by, bz2) {
        if (round(e)) { pos(e, clock); HIT = 'ball'; return segSphere(ax, ay, az, bx, by, bz2, SR + BR); }
        if (e.type === 'glass') {
            if (e.broken) return -1;
            pstate(e, clock);
            var ca = Math.cos(QA), sa = Math.sin(QA);
            var da = -(ax - QX) * sa + (az - e.z) * ca, db = -(bx - QX) * sa + (bz2 - e.z) * ca;
            if ((da < 0) === (db < 0)) return -1;
            var s = da / (da - db), x = ax + (bx - ax) * s, y = ay + (by - ay) * s, z = az + (bz2 - az) * s;
            var u = (x - QX) * ca + (z - e.z) * sa;
            if (Math.abs(u) > e.w || y < e.y0 || y > e.y1) return -1;
            HIT = [u, y]; return s;
        }
        if (e.type === 'door' && !e.open) {
            pos(e, clock);
            var k = segSphere(ax, ay, az, bx, by, bz2, SR + BR);
            if (k >= 0) { HIT = 'knob'; return k; }
        }
        if (e.type !== 'door' && e.type !== 'portal') return -1;
        if (!(az < e.z && bz2 >= e.z)) return -1;
        var s2 = (e.z - az) / (bz2 - az), lx = ax + (bx - ax) * s2 - cx(e.z), ly = ay + (by - ay) * s2;
        if (e.type === 'portal') { if (inArch(lx, ly)) return -1; HIT = 'wall'; return s2; }
        if (Math.abs(lx) < DW / 2 && ly < DH) { if (e.open) return -1; HIT = 'door'; } else HIT = 'wall';
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
            var s = hitTest(ents[i], ax, ay, az, b.x, b.y, b.z);
            if (s >= 0 && s < best) { best = s; be = ents[i]; what = HIT; }
        }
        if (be) return done(b, smash(be, what, ax + (b.x - ax) * best, ay + (b.y - ay) * best, az + (b.z - az) * best));
        if (!inside(b.x, b.y, b.z) || b.z > camZ + FAR + 4 || (b.age > 0.1 && b.z < camZ + 0.2)) {
            puff(b.x, Math.max(0, b.y), b.z, 5);
            return done(b, false);
        }
        return true;
    }
    function done(b, hit) {  /* a throw counts as a hit if any of its balls hit something */
        var th = b.th;
        th.left--;
        if (hit) th.hits++;
        if (th.left === 0) {
            if (th.hits) streak++;
            else {
                if (multi > 1) addFloat(camX, EYE + 0.4, camZ + 3, 'Combo lost', '#94a3b8');
                streak = 0;
            }
            var m = streak >= 10 ? 3 : streak >= 4 ? 2 : 1;
            if (m > multi) {
                addFloat(camX, EYE + 0.5, camZ + 3.5, m === 2 ? 'Double yarn!' : 'Triple yarn!', '#d6336c', true);
                chat(m === 2 ? 'Double yarn!' : 'Triple yarn! Mrrow!', 'wow', true);
                api.sfx('point');
            }
            multi = m;
        }
        return false;
    }

    /* ---------- what happens when something gets hit ---------- */
    function smash(e, what, hx, hy, hz) {
        if (what === 'wall' || what === 'door') { puff(hx, hy, hz - 0.05, 6); api.sfx('move'); return false; }
        if (what === 'knob') {
            e.open = true; points(20, cx(e.z) + 0.4, 1.4, e.z);
            api.sfx('point');
            if (Math.random() < 0.4) chat('Door? What door?', 'happy');
            return true;
        }
        if (e.type === 'glass') {
            if (e.hp > 1) {  /* tough glass: crack it first */
                e.hp--; e.crack = crackAt(what[0] / e.w, (what[1] - e.y0) / (e.y1 - e.y0));
                points(5, hx, hy + 0.3, hz);
                shards(e, 5, 0.6);
                api.sfx('move');
                return true;
            }
            breakGlass(e, 1);
            points(e.g.kind === 'portal' ? 25 : 10, hx, hy + 0.3, hz);
            api.sfx('pop');
            if (firstPane) { firstPane = false; chat('Purrfect aim!', 'happy', true); }
            return true;
        }
        e.broken = true; smashed++;
        pos(e, clock);
        if (e.type === 'vase') {
            burst(SX, SY, SZ, 0.18, 12, [e.col], 1);
            points(15, SX, SY + 0.35, SZ); addYarn(1, SX, SY + 0.6, SZ);
            api.sfx('pop');
            if (Math.random() < 0.3) chat(Math.random() < 0.5 ? 'Oops. Not sorry.' : 'It was in the way.', 'happy');
        } else if (e.type === 'crystal') {
            burst(SX, SY, SZ, 0.2, 12, ['rgba(150,226,192,', 'rgba(205,245,225,', 'rgba(255,255,255,'], 0.6);
            points(10, SX, SY + 0.35, SZ); addYarn(3, SX, SY + 0.65, SZ);
            api.sfx('point');
            if (Math.random() < 0.35) chat(Math.random() < 0.5 ? 'More yarn!' : 'Catnip!', 'happy');
        } else if (e.type === 'lamp') {
            burst(SX, SY, SZ, 0.2, 14, ['rgba(255,214,165,', 'rgba(255,240,200,', 'rgba(255,255,255,'], 1);
            points(40, SX, SY - 0.3, SZ); addYarn(2, SX, SY - 0.6, SZ);
            api.sfx('pop'); api.sfx('point');
            chat('Shiny!', 'wow');
        } else if (e.type === 'dot') {
            zoomT = 4;
            burst(SX, 0.05, SZ, 0.2, 10, ['rgba(255,90,120,', 'rgba(255,190,200,'], 0.5);
            points(30, SX, 0.6, SZ);
            addFloat(camX, EYE + 0.6, camZ + 4, 'Zoomies!', '#d6336c', true);
            api.sfx('point');
            chat('ZOOMIES!', 'wow', true);
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
        if (parts.length > MAXP - 30) n = Math.ceil(n / 2);
        for (var i = 0; i < n; i++) {
            var u = rnd(-e.w + 0.1, e.w - 0.1), y = rnd(e.y0 + 0.05, e.y1 - 0.1);
            addPart(QX + u * ca, y, e.z + u * sa, u * 1.2 + rnd(-1, 1), rnd(-0.5, 2.5),
                    toward < 0 ? speed * rnd(0.85, 1.05) + rnd(-0.5, 0.5) : rnd(1.5, 4.5) * toward, rnd(0.1, 0.3), st.shards[i % st.shards.length], rnd(1, 1.8));
        }
    }
    function breakGlass(e, dir) {
        e.broken = true; smashed++;
        shards(e, Math.round((e.g.kind === 'portal' ? 22 : 16) * Math.min(1.4, e.w)), dir);
    }
    function burst(x, y, z, spread, n, cols, up) {
        if (parts.length > MAXP - 20) n = Math.ceil(n / 2);
        for (var i = 0; i < n; i++) addPart(x + rnd(-spread, spread), y + rnd(-spread, spread), z, rnd(-2.2, 2.2), rnd(0.5, 3) * up, rnd(0.5, 2.5), rnd(0.05, 0.13), cols[i % cols.length], rnd(0.8, 1.4));
    }
    function puff(x, y, z, n) { for (var i = 0; i < n; i++) addPart(x, y, z, rnd(-1, 1), rnd(0, 1.5), rnd(-0.5, 0.5), 0.04, 'rgba(255,255,255,', 0.4, '#f783ac'); }
    function addPart(x, y, z, vx, vy, vz, s, col, life, solid) {
        if (parts.length >= MAXP) parts.shift();
        parts.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, s: s, c: col, solid: solid, r: rnd(0, 6), vr: rnd(-8, 8), life: life, max: life });
    }
    function points(n, x, y, z) { bonus += n; addFloat(x, y, z, '+' + n, '#1e3a8a'); }
    function addYarn(n, x, y, z) {
        balls += n;
        if (balls >= 6) lowWarned = false;
        addFloat(x, y, z, '+' + n + ' yarn', '#d6336c');
    }
    function addFloat(x, y, z, text, col, big) { floats.push({ x: x, y: y, z: z, text: text, c: col, big: big, t: 0 }); }
    function chat(text, mood, force) {
        if (!force && clock - lastSay < 5) return;
        lastSay = clock;
        if (mood) api.cat(mood);
        api.say(text, 1700);
    }
    function crash(kind) {
        if (zoomT > 0) { bonus += 10; api.sfx('pop'); return; }
        var lost = Math.min(balls, 3);
        balls -= lost;
        stumble = 0.35; flash = 1; shake = api.reducedMotion ? 3 : 16;
        if (multi > 1) addFloat(camX, EYE + 0.2, camZ + 3, 'Combo lost', '#94a3b8');
        streak = 0; multi = 1;
        addFloat(camX, EYE - 0.1, camZ + 2.5, '-' + lost + ' yarn', '#e8484f', true);
        api.sfx('hit');
        api.cat('sad');
        chat(kind === 'door' ? 'Bonk! My nose!' : (Math.random() < 0.5 ? 'Ouch, my whiskers!' : 'Mrrp! Glass!'), 'sad');
    }
    function showCard(zi) {
        var Z = ZONES[zi % NZ], lap = Math.floor(zi / NZ);
        cardEl.style.setProperty('--c', Z.accent);
        cardEl.querySelector('small').textContent = lap ? 'Lap ' + (lap + 1) + ', zone ' + (zi % NZ + 1) : 'Zone ' + (zi % NZ + 1) + ' of ' + NZ;
        cardEl.querySelector('b').textContent = Z.name;
        cardEl.querySelector('span').textContent = (lap ? 'Faster now! ' : '') + Z.hint;
        cardEl.classList.add('ys-show');
        if (cardTimer) clearTimeout(cardTimer);
        cardTimer = api.timeout(function () { cardEl.classList.remove('ys-show'); }, 2800);
    }

    /* ---------- the loop ---------- */
    function update(dt) {
        clock += dt;
        if (phase === 'play') playT += dt;
        stumble += (1 - stumble) * Math.min(1, dt * 1.6);
        if (zoomT > 0) zoomT -= dt;
        var lap = Math.floor(zoneIdx(camZ) / NZ);
        var want = phase === 'play' ? (Math.min(9.5, 3.8 + playT * 0.05) + lap * 1.3) * stumble * (zoomT > 0 ? 1.7 : 1) : 0;
        speed += (want - speed) * Math.min(1, dt * (phase === 'play' ? 4 : 1.5));
        camZ += speed * dt;
        camX = cx(camZ); camS = (cx(camZ + 1) - cx(camZ - 1)) / 2;
        runPh += speed * dt * 1.6;
        var zi = zoneIdx(camZ);
        if (zi !== curZi) {
            curZi = zi;
            showCard(zi);
            if (zi > 0) { chat(ZONES[zi % NZ].chat, 'wow', true); api.sfx('point'); }
        }
        spawn();
        var i, e;
        for (i = 0; i < ents.length; i++) {
            e = ents[i];
            if (e.type === 'door' && e.open) e.a += (1.45 - e.a) * Math.min(1, dt * 7);
            if (e.type === 'door' && !e.passed && e.z - camZ < 0.45) {
                e.passed = true;
                if (!e.open && phase === 'play') { e.open = true; e.a = 1.45; crash('door'); }
            }
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
        for (i = props.length - 1; i >= 0; i--) {
            var p = props[i];
            if (p.kind === 'manta') p.z = p.z0 + (clock - p.t0) * 1.6;
            if (p.z < camZ + NEAR + 0.2) props.splice(i, 1);
        }
        for (i = flying.length - 1; i >= 0; i--) if (!stepBall(flying[i], dt)) flying.splice(i, 1);
        for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i];
            q.vy -= G * 0.8 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.r += q.vr * dt; q.life -= dt;
            var fl = zoneOf(q.z) === ZONES[0] ? roofY(q.x - cx(q.z)) : 0;
            if (q.y < fl) { q.y = fl; q.vy *= -0.3; q.vx *= 0.6; q.vz *= 0.6; q.vr *= 0.5; }
            if (q.life <= 0 || q.z < camZ + NEAR) parts.splice(i, 1);
        }
        for (i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.1) floats.splice(i, 1); }
        for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 0.35) rings.splice(i, 1); }
        paws[0] = Math.max(0, paws[0] - dt * 4); paws[1] = Math.max(0, paws[1] - dt * 4);
        shake = Math.max(0, shake - dt * 40);
        flash = Math.max(0, flash - dt * 2.5);
        var score = Math.floor(camZ) + bonus;
        if (score !== shownScore) { shownScore = score; api.score(score); }
        if (phase !== 'play') return;
        if (balls <= 3 && balls > 0 && !lowWarned) { lowWarned = true; chat('Low on yarn! Hit the crystals.', 'think', true); }
        if (balls <= 0 && !flying.length) {
            phase = 'over';
            api.say('Out of yarn. Nap time.', 2400);
            var Z = ZONES[curZi % NZ];
            api.end({ score: score, win: false,
                text: 'Out of yarn!\n' + Math.floor(camZ) + ' m run, zone ' + (curZi % NZ + 1) + ': ' + Z.name + (curZi >= NZ ? ', lap ' + (Math.floor(curZi / NZ) + 1) : '') });
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
    function fc(c, z, k) { return mixc(c, zoneOf(z).fog, fogf(z - camZ), k); }

    /* ---------- glass, frames, gates and doors ---------- */
    function drawGlass(e) {
        pstate(e, clock);
        var ca = Math.cos(QA), sa = Math.sin(QA), w = e.w, st = e.st;
        var x0 = QX - w * ca, z0 = e.z - w * sa, x1 = QX + w * ca, z1 = e.z + w * sa;
        if (!P(x0, e.y0, z0)) return; var ax = px, ay = py;
        P(x0, e.y1, z0); var bx = px, by = py;
        if (!P(x1, e.y1, z1)) return; var cx2 = px, cy2 = py;
        P(x1, e.y0, z1); var dx = px, dy = py;
        var k = F / Math.max(NEAR, e.z - camZ), dz = e.z - camZ, f = fogf(dz), fog = zoneOf(e.z).fog;
        function qp(u, v) {  /* u: -1..1 across the panel, v: 0..1 up */
            var s = (u + 1) / 2, lx = ax + (dx - ax) * s, ly = ay + (dy - ay) * s, ux = bx + (cx2 - bx) * s, uy = by + (cy2 - by) * s;
            return [lx + (ux - lx) * v, ly + (uy - ly) * v];
        }
        function cell(u0, u1, v0, v1) {
            var a = qp(u0, v0), b = qp(u1, v0), c = qp(u1, v1), d = qp(u0, v1);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        }
        ctx.globalAlpha = fade(dz);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (!e.broken) {
            if (st.stained) {  /* leaded cells of coloured glass */
                for (var i = 0; i < 3; i++) for (var j = 0; j < 5; j++) {
                    cell(-1 + i * 2 / 3, -1 + (i + 1) * 2 / 3, j / 5, (j + 1) / 5);
                    ctx.fillStyle = mixa(BOOKS[Math.floor(hash(e.seed + i * 5 + j) * 7)], fog, f, 0.62); ctx.fill();
                }
                ctx.strokeStyle = st.frame; ctx.lineWidth = Math.max(1, 0.035 * k);
                ctx.beginPath();
                for (i = 1; i < 3; i++) { var p0 = qp(-1 + i * 2 / 3, 0), p1 = qp(-1 + i * 2 / 3, 1); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); }
                for (j = 1; j < 5; j++) { p0 = qp(-1, j / 5); p1 = qp(1, j / 5); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); }
                ctx.stroke();
                var c0 = qp(0, 0.62);
                ctx.fillStyle = mixa([255, 236, 170], fog, f, 0.85); ctx.beginPath(); ctx.arc(c0[0], c0[1], Math.max(2, 0.22 * w * k), 0, TAU); ctx.fill(); ctx.stroke();
            } else {
                cell(-1, 1, 0, 1);
                ctx.fillStyle = mixa(st.tint, fog, f, st.portal ? 0.32 : 0.4); ctx.fill();
            }
            ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1, 0.06 * k * Math.abs(ca));
            ctx.beginPath();
            var h1 = qp(-0.6, 0.9), h2 = qp(-0.88, 0.62), h3 = qp(-0.32, 0.9), h4 = qp(-0.8, 0.42), h5 = qp(0.8, 0.38), h6 = qp(0.6, 0.18);
            ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.moveTo(h3[0], h3[1]); ctx.lineTo(h4[0], h4[1]); ctx.moveTo(h5[0], h5[1]); ctx.lineTo(h6[0], h6[1]);
            ctx.stroke();
            if (e.crack) {
                ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1, 0.02 * k);
                ctx.beginPath();
                e.crack.forEach(function (c) { for (var n = 0; n < c.length; n += 2) { var q = qp(clamp(c[n], -1, 1), clamp(c[n + 1], 0, 1)); if (n) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } });
                ctx.stroke();
            }
            if (e.hp > 1) {  /* tough glass looks thicker */
                ctx.strokeStyle = 'rgba(120,190,160,.7)'; ctx.lineWidth = Math.max(2, 0.07 * k); cell(-0.96, 0.96, 0.03, 0.97); ctx.stroke();
            }
            if (st.glow) { ctx.strokeStyle = 'rgba(255,143,200,.3)'; ctx.lineWidth = Math.max(3, 0.14 * k); cell(-1, 1, 0, 1); ctx.stroke(); }
            ctx.strokeStyle = st.frame; ctx.lineWidth = Math.max(1.5, 0.045 * k);
            cell(-1, 1, 0, 1); ctx.stroke();
        } else {
            ctx.fillStyle = mixa(st.tint, fog, f, 0.55);
            [[-1, 0, 1, 1], [1, 0, -1, 1], [-1, 1, 1, -1], [1, 1, -1, -1]].forEach(function (c, n) {
                var l = 0.25 + hash(e.seed + n) * 0.3, a = qp(c[0], c[1]), b = qp(c[0] + c[2] * l, c[1]), m = qp(c[0] + c[2] * l * 0.3, c[1] + c[3] * l * 0.3), d = qp(c[0], c[1] + c[3] * l * 0.8);
                ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(m[0], m[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
            });
        }
        ctx.globalAlpha = 1;
    }
    function rectW(lx0, lx1, y0, y1, z) {  /* screen rect of a local rectangle in the plane z */
        if (!PL(lx0, y1, z)) return null;
        var x = px, y = py; PL(lx1, y0, z);
        return [x, y, px - x, py - y];
    }
    function drawFrame(e) {
        var dz = e.z - camZ, col = fc(e.Z === ZONES[3] ? [255, 143, 200] : e.Z === ZONES[4] ? [96, 62, 46] : e.Z === ZONES[2] ? [232, 248, 255] : [96, 100, 156], e.z);
        if (dz < NEAR + 0.05) return;
        ctx.globalAlpha = fade(dz); ctx.fillStyle = col;
        var r, t = 0.1;
        if (e.kind === 'pivot') {
            r = rectW(-0.035, 0.035, 0, e.y1 + 0.5, e.z); if (r) ctx.fillRect(r[0], r[1], r[2], r[3]);
            ctx.globalAlpha = 1; return;
        }
        if (e.kind === 'rail' || e.kind === 'posts' || e.kind === 'shop') {
            r = rectW(-e.half - t, -e.half + t * 0.4, 0, e.y1 + t, e.z); if (r) ctx.fillRect(r[0], r[1], r[2], r[3]);
            r = rectW(e.half - t * 0.4, e.half + t, 0, e.y1 + t, e.z); if (r) ctx.fillRect(r[0], r[1], r[2], r[3]);
            r = rectW(-e.half - t, e.half + t, e.y1, e.y1 + (e.kind === 'shop' ? 0.5 : t), e.z); if (r) ctx.fillRect(r[0], r[1], r[2], r[3]);
            if (e.kind === 'shop' && r) {  /* a neon OPEN sign over the shop doors */
                ctx.font = '900 ' + Math.max(6, 0.32 * F / dz) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#7ff0e0'; ctx.fillText('OPEN', r[0] + r[2] / 2, r[1] + r[3] / 2);
            }
        }
        ctx.globalAlpha = 1;
    }
    function archPath(sx, sy, k) {
        ctx.moveTo(sx - OW * k, sy); ctx.lineTo(sx - OW * k, sy - OH * k);
        ctx.arc(sx, sy - OH * k, OW * k, Math.PI, TAU); ctx.lineTo(sx + OW * k, sy); ctx.closePath();
    }
    function drawPortal(e) {
        if (!PL(0, 0, e.z)) return;
        var k = pk, sx = px, sy = py, Zn = ZONES[e.zi % NZ], gs = Zn.gate, dz = e.z - camZ, f = fogf(dz), fog = zoneOf(e.z - 1).fog;
        f *= 0.45;  /* a landmark: it stays clear in the fog */
        ctx.globalAlpha = clamp((FAR + 2 - dz) / 8, 0, 1);
        var top = sy - 7 * k;
        ctx.beginPath();  /* a facade with a pointed pediment and the arch cut out */
        ctx.moveTo(sx - 18 * k, sy + 3 * k); ctx.lineTo(sx - 18 * k, top); ctx.lineTo(sx - 4.5 * k, top); ctx.lineTo(sx, top - 2.2 * k);
        ctx.lineTo(sx + 4.5 * k, top); ctx.lineTo(sx + 18 * k, top); ctx.lineTo(sx + 18 * k, sy + 3 * k); ctx.closePath();
        archPath(sx, sy, k);
        ctx.fillStyle = mixc(gs.wall, fog, f); ctx.fill('evenodd');
        ctx.fillStyle = mixc(gs.wall, fog, f, 0.86);
        for (var b = 0; b < 3; b++) ctx.fillRect(sx - 18 * k, sy - (0.9 + b * 2.1) * k, 36 * k, 0.18 * k);  /* bands */
        ctx.fillStyle = gs.trim; ctx.globalAlpha *= 0.85;
        ctx.fillRect(sx - 18 * k, top, 36 * k, 0.2 * k);
        ctx.beginPath(); ctx.moveTo(sx - 4.5 * k, top); ctx.lineTo(sx, top - 2.2 * k); ctx.lineTo(sx + 4.5 * k, top); ctx.lineTo(sx + 3.9 * k, top); ctx.lineTo(sx, top - 1.8 * k); ctx.lineTo(sx - 3.9 * k, top); ctx.fill();
        ctx.globalAlpha = clamp((FAR + 2 - dz) / 8, 0, 1);
        ctx.fillStyle = mixc(gs.wall, fog, f, 0.7);  /* pillars with caps */
        [-1, 1].forEach(function (sd) {
            var x0 = sx + sd * (OW + 0.2) * k - (sd < 0 ? 0.6 * k : 0);
            ctx.fillRect(x0, sy - (OH + OW + 0.3) * k, 0.6 * k, (OH + OW + 0.3) * k);
            ctx.fillStyle = gs.trim; ctx.fillRect(x0 - 0.1 * k, sy - (OH + OW + 0.45) * k, 0.8 * k, 0.18 * k);
            ctx.beginPath(); ctx.arc(x0 + 0.3 * k, sy - (OH + OW + 0.65) * k, 0.2 * k, 0, TAU); ctx.fill();
            ctx.fillStyle = mixc(gs.wall, fog, f, 0.7);
        });
        ctx.strokeStyle = gs.trim; ctx.lineWidth = Math.max(2, 0.2 * k);
        ctx.beginPath(); ctx.moveTo(sx - OW * k, sy); ctx.lineTo(sx - OW * k, sy - OH * k); ctx.arc(sx, sy - OH * k, OW * k, Math.PI, TAU); ctx.lineTo(sx + OW * k, sy); ctx.stroke();
        if (k < 700) {
            var lap = Math.floor(e.zi / NZ), title = Zn.name, fs = 0.42 * k;
            ctx.font = '900 ' + fs + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            var tw = ctx.measureText(title).width + fs * 1.4, by = sy - (OH + OW + 0.95) * k;
            ctx.fillStyle = gs.banner; rrect(sx - tw / 2, by - fs * 0.8, tw, fs * 1.6, fs * 0.5); ctx.fill();
            ctx.strokeStyle = gs.trim; ctx.lineWidth = Math.max(1, 0.06 * k); ctx.stroke();
            ctx.fillStyle = gs.text; ctx.fillText(title, sx, by + fs * 0.05);
            ctx.font = '800 ' + fs * 0.5 + 'px system-ui, sans-serif'; ctx.fillStyle = gs.trim;
            ctx.fillText((lap ? 'LAP ' + (lap + 1) + ' . ' : '') + 'ZONE ' + (e.zi % NZ + 1), sx, by - fs * 1.25);
        }
        ctx.globalAlpha = 1;
    }
    function drawDoor(e) {
        if (!PL(0, 0, e.z)) return;
        var k = pk, dz = e.z - camZ, hw = libHw(e.z) + 0.05, c0 = cx(e.z), sx = px, B = py, L = sx - hw * k, R = sx + hw * k, T = B - 5.2 * k;
        var dl = sx - DW / 2 * k, dr = sx + DW / 2 * k, dt = B - DH * k, f = fogf(dz), fog = ZONES[4].fog;
        ctx.globalAlpha = fade(dz);
        var ca = Math.cos(e.a), sa = Math.sin(e.a), hx = -DW / 2;
        function leaf(u0, u1, v0, v1) {
            return quadW([c0 + hx + DW * ca * u0, DH * v0, e.z + DW * sa * u0, c0 + hx + DW * ca * u1, DH * v0, e.z + DW * sa * u1,
                          c0 + hx + DW * ca * u1, DH * v1, e.z + DW * sa * u1, c0 + hx + DW * ca * u0, DH * v1, e.z + DW * sa * u0]);
        }
        if (leaf(0, 1, 0, 1)) { ctx.fillStyle = mixc([196, 132, 86], fog, f); ctx.fill(); }
        ctx.fillStyle = mixc([170, 110, 70], fog, f);
        if (leaf(0.16, 0.84, 0.55, 0.9)) ctx.fill();
        if (leaf(0.16, 0.84, 0.1, 0.45)) ctx.fill();
        ctx.beginPath(); ctx.rect(L, T, R - L, B - T);  /* a bookshelf wall around the doorway */
        ctx.moveTo(dl, B); ctx.lineTo(dl, dt); ctx.lineTo(dr, dt); ctx.lineTo(dr, B); ctx.closePath();
        ctx.fillStyle = mixc([116, 74, 56], fog, f); ctx.fill('evenodd');
        for (var r = 0; r < 7; r++) {  /* rows of books */
            var y0 = B - (0.22 + r * 0.68) * k, y1 = B - (0.62 + r * 0.68) * k;
            ctx.fillStyle = mixc(BOOKS[(r * 3 + 2) % 7], fog, f);
            if (0.22 + r * 0.68 >= DH) ctx.fillRect(L, y1, R - L, y0 - y1);
            else { ctx.fillRect(L, y1, dl - L, y0 - y1); ctx.fillRect(dr, y1, R - dr, y0 - y1); }
        }
        ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = Math.max(2, 0.08 * k); ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(dl, B); ctx.lineTo(dl, dt); ctx.lineTo(dr, dt); ctx.lineTo(dr, B); ctx.stroke();
        if (!e.open || e.a < 0.3) {
            pos(e, clock);
            if (P(SX, SY, SZ)) {
                var rr = 0.07 * pk;
                if (!e.open) {
                    ctx.strokeStyle = 'rgba(214,51,108,.8)'; ctx.lineWidth = Math.max(1.5, 0.025 * pk);
                    ctx.beginPath(); ctx.arc(px, py, rr * (2.2 + Math.sin(clock * 6) * 0.5), 0, TAU); ctx.stroke();
                }
                ctx.fillStyle = '#f5c84c'; ctx.strokeStyle = '#c99a1e'; ctx.lineWidth = Math.max(1, 0.02 * pk);
                ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.fill(); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

    /* ---------- targets ---------- */
    function drawStand(e) {
        var z = e.z, s = e.side, lx = e.lx, f = fogf(z - camZ), fog = zoneOf(z).fog;
        function m(c, k) { return mixc(c, fog, f, k); }
        if (e.stand === 'crate') box(lx, z, 0.56, 0.56, 0, 0.5, m([206, 156, 110]), m([170, 124, 86]), m([226, 184, 140]));
        else if (e.stand === 'rock') {
            if (!PL(lx, 0.2, z)) return;
            ctx.fillStyle = m([126, 150, 172]); ctx.beginPath(); ctx.ellipse(px, py, 0.42 * pk, 0.26 * pk, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = m([168, 190, 206]); ctx.beginPath(); ctx.ellipse(px - 0.08 * pk, py - 0.1 * pk, 0.26 * pk, 0.12 * pk, 0, 0, TAU); ctx.fill();
        } else if (e.stand === 'stall') {
            box(lx, z, 0.8, 0.6, 0.15, 0.87, m([244, 150, 186]), m([200, 110, 150]), m([255, 236, 214]));
            if (quadW([cx(z - 0.3) + lx - 0.13, 0.15, z - 0.3, cx(z - 0.3) + lx + 0.13, 0.15, z - 0.3, cx(z - 0.3) + lx + 0.13, 0.87, z - 0.3, cx(z - 0.3) + lx - 0.13, 0.87, z - 0.3])) { ctx.fillStyle = m([255, 255, 255]); ctx.fill(); }
        } else {
            var wood = e.stand === 'table' ? [140, 92, 64] : [246, 232, 210];
            box(lx - s * 0.24, z - 0.22, 0.06, 0.06, 0, 0.66, m(wood, 0.8), m(wood, 0.7), m(wood));
            box(lx + s * 0.24, z - 0.22, 0.06, 0.06, 0, 0.66, m(wood, 0.8), m(wood, 0.7), m(wood));
            box(lx, z, 0.62, 0.56, 0.66, STANDTOP[e.stand], m(wood, 0.9), m(wood, 0.8), m(wood, 1.08));
        }
    }
    function drawVase(e) {
        var dz = e.z - camZ;
        if (dz < NEAR + 0.32) return;
        ctx.globalAlpha = fade(dz);
        drawStand(e);
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
            ctx.fillStyle = col + '.8)'; ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-0.05, -h * 0.55); ctx.lineTo(-0.06, -h * 0.2); ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }
    function drawCrystal(e) {
        pos(e, clock);
        if (!P(SX, SY, SZ)) return;
        var sp = Math.cos(clock * 2.2 + e.ph), w = 0.2 * (0.3 + 0.7 * Math.abs(sp));
        ctx.globalAlpha = fade(SZ - camZ);
        ctx.save(); ctx.translate(px, py); ctx.scale(pk, pk);
        ctx.fillStyle = 'rgba(150,226,192,.3)'; ctx.beginPath(); ctx.arc(0, 0, 0.36 + Math.sin(clock * 4 + e.ph) * 0.03, 0, TAU); ctx.fill();
        ctx.lineJoin = 'round'; ctx.lineWidth = 0.02; ctx.strokeStyle = '#4fae86';
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(-w, -0.07); ctx.lineTo(0, 0.3); ctx.closePath(); ctx.fillStyle = sp > 0 ? '#8edcb8' : '#c8f2dd'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(w, -0.07); ctx.lineTo(0, 0.3); ctx.closePath(); ctx.fillStyle = sp > 0 ? '#c8f2dd' : '#8edcb8'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -0.32); ctx.lineTo(w, -0.07); ctx.lineTo(0, 0.3); ctx.lineTo(-w, -0.07); ctx.closePath();
        ctx.moveTo(-w, -0.07); ctx.lineTo(w, -0.07); ctx.stroke();
        var tw = 0.06 + 0.04 * Math.sin(clock * 7 + e.ph);
        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(0.1, -0.2 - tw); ctx.lineTo(0.115, -0.215); ctx.lineTo(0.1 + tw, -0.2); ctx.lineTo(0.115, -0.185);
        ctx.lineTo(0.1, -0.2 + tw); ctx.lineTo(0.085, -0.185); ctx.lineTo(0.1 - tw, -0.2); ctx.lineTo(0.085, -0.215); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    function drawLamp(e) {
        var Z = e.Z;
        if (!PL(0, Z.lampY, e.z)) return;
        var ax = px, ay = py, a = 0.75 * Math.sin(clock * 2.1 + e.ph), lib = Z === ZONES[4], mk = Z === ZONES[3];
        pos(e, clock); P(SX, SY, SZ);
        ctx.globalAlpha = fade(e.z - camZ);
        ctx.strokeStyle = lib ? '#c9a56a' : '#9b8a77'; ctx.lineWidth = Math.max(1, 0.015 * pk);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
        ctx.save(); ctx.translate(px, py); ctx.scale(pk, pk); ctx.rotate(-a);
        if (!e.broken) {
            ctx.fillStyle = 'rgba(255,240,180,.5)'; ctx.beginPath(); ctx.arc(0, 0.08, 0.32, 0, TAU); ctx.fill();
            if (lib) {  /* a little crystal chandelier */
                ctx.strokeStyle = '#e8c27a'; ctx.lineWidth = 0.03;
                ctx.beginPath(); ctx.ellipse(0, 0.05, 0.26, 0.07, 0, 0, TAU); ctx.stroke();
                ctx.fillStyle = 'rgba(220,240,255,.9)';
                for (var i = 0; i < 6; i++) { var t = i / 6 * TAU, x = Math.cos(t) * 0.26; ctx.beginPath(); ctx.moveTo(x, 0.06); ctx.lineTo(x + 0.03, 0.14); ctx.lineTo(x, 0.22); ctx.lineTo(x - 0.03, 0.14); ctx.fill(); }
                ctx.fillStyle = '#fff3b0'; for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc((i - 1) * 0.16, -0.04, 0.035, 0, TAU); ctx.fill(); }
            } else if (mk) {  /* a paper lantern */
                ctx.fillStyle = 'rgba(255,150,170,.9)'; ctx.beginPath(); ctx.ellipse(0, 0.08, 0.2, 0.24, 0, 0, TAU); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.015;
                ctx.beginPath(); ctx.ellipse(0, 0.08, 0.1, 0.24, 0, 0, TAU); ctx.moveTo(-0.2, 0.08); ctx.lineTo(0.2, 0.08); ctx.stroke();
                ctx.fillStyle = '#7a3d4d'; ctx.fillRect(-0.08, -0.18, 0.16, 0.04); ctx.fillRect(-0.08, 0.32, 0.16, 0.04);
            } else {  /* a glass lantern */
                ctx.fillStyle = '#6b8f71'; ctx.fillRect(-0.12, -0.14, 0.24, 0.05); ctx.fillRect(-0.14, 0.28, 0.28, 0.05);
                ctx.fillStyle = 'rgba(214,245,228,.75)'; ctx.fillRect(-0.12, -0.09, 0.24, 0.37);
                ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(0, 0.1, 0.06, 0, TAU); ctx.fill();
                ctx.strokeStyle = '#6b8f71'; ctx.lineWidth = 0.02; ctx.strokeRect(-0.12, -0.09, 0.24, 0.37);
            }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    function drawDot(e) {
        pos(e, clock);
        if (!P(SX, 0.005, SZ)) return;
        var dz = SZ - camZ, sq = clamp(EYE / dz, 0.12, 1), r = 0.12 * pk * (1 + 0.15 * Math.sin(clock * 12));
        ctx.globalAlpha = fade(dz);
        ctx.fillStyle = 'rgba(255,80,110,.28)'; ctx.beginPath(); ctx.ellipse(px, py, r * 2.6, r * 2.6 * sq, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,60,95,.92)'; ctx.beginPath(); ctx.ellipse(px, py, r, r * sq, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(px, py, r * 0.4, r * 0.4 * sq, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
    }
    function drawBall(b) {
        var dz = b.z - camZ;
        if (dz < 0.9) return;  /* still in the paw */
        var fl = zoneOf(b.z) === ZONES[0] ? roofY(b.x - cx(b.z)) : 0;
        if (P(b.x, fl, b.z)) {
            var sq = clamp(EYE / dz, 0.1, 1);
            ctx.fillStyle = 'rgba(40,20,40,.16)'; ctx.beginPath(); ctx.ellipse(px, py, BR * pk * 1.2, BR * pk * sq, 0, 0, TAU); ctx.fill();
        }
        if (!P(b.x, b.y, b.z)) return;
        var r = Math.min(BR * pk * 1.35, PAW * 0.5), bx = px, by = py;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#e8739f'; ctx.lineWidth = clamp(r * 0.16, 1, 3);
        ctx.beginPath(); ctx.moveTo(bx, by);  /* the loose thread trailing behind */
        for (var i = 0; i < b.trail.length; i += 3) {
            if (b.trail[i + 2] - camZ > 0.9 && P(b.trail[i], b.trail[i + 1] + Math.sin(i * 0.9 + b.spin) * 0.03, b.trail[i + 2])) ctx.lineTo(px, py);
        }
        ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
        wool(bx, by, r, api.reducedMotion ? 0 : b.spin, zoomT > 0 ? 'orange' : 'pink');
    }
    function drawLabel(e) {
        if (!e.label || e.broken || e.open || (e.g && e.g.passed) || e.passed) return;
        var dz = e.z - camZ;
        if (dz > 30 || dz < 2) return;
        var y, x;
        if (e.type === 'glass') { pstate(e, clock); x = QX; y = e.y1 + 0.35; }
        else if (e.type === 'door') { x = cx(e.z); y = DH + 0.3; }
        else { pos(e, clock); x = SX; y = e.type === 'lamp' ? SY + 0.5 : e.type === 'dot' ? 0.6 : SY + 0.5; }
        if (!P(x, y, e.z)) return;
        ctx.globalAlpha = clamp((30 - dz) / 5, 0, 1);
        ctx.font = '800 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var w = ctx.measureText(e.label).width + 18;
        ctx.fillStyle = 'rgba(255,255,255,.95)'; rrect(px - w / 2, py - 14, w, 28, 14); ctx.fill();
        ctx.fillStyle = '#d6336c'; ctx.fillText(e.label, px, py + 1);
        ctx.globalAlpha = 1;
    }

    /* ---------- props: the scenery of each zone ---------- */
    var PROP = {
        chimney: function (p) {
            var y0 = roofY(Math.abs(p.lx) + p.w / 2) - 0.1, top = y0 + p.h, f = fogf(p.z - camZ), fog = ZONES[0].fog;
            box(p.lx, p.z, p.w, p.w, y0, top, mixc([200, 116, 120], fog, f), mixc([150, 86, 100], fog, f), mixc([110, 70, 86], fog, f));
            box(p.lx, p.z, p.w + 0.16, p.w + 0.16, top, top + 0.14, mixc([112, 104, 150], fog, f), mixc([90, 84, 128], fog, f), mixc([80, 74, 116], fog, f));
            for (var i = 0; i < 3; i++) {  /* smoke */
                var u = (clock * 0.35 + i / 3 + p.ph) % 1;
                if (!PL(p.lx + u * 0.4, top + 0.3 + u * 1.4, p.z)) return;
                ctx.globalAlpha = fade(p.z - camZ) * (1 - u) * 0.35;
                ctx.fillStyle = '#d9d2f5'; ctx.beginPath(); ctx.arc(px, py, Math.min(60, (0.1 + u * 0.18) * pk), 0, TAU); ctx.fill();
            }
        },
        antenna: function (p) {
            var y0 = roofY(Math.abs(p.lx));
            if (!PL(p.lx, y0, p.z)) return;
            var bx = px, by = py; PL(p.lx, y0 + 1.6, p.z);
            ctx.strokeStyle = fc([70, 64, 112], p.z); ctx.lineWidth = Math.max(1, 0.04 * pk);
            ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py);
            for (var i = 0; i < 3; i++) { var w = (0.5 - i * 0.12) * pk, yy = py + (0.15 + i * 0.25) * pk; ctx.moveTo(px - w, yy); ctx.lineTo(px + w, yy); }
            ctx.stroke();
        },
        farroof: function (p) {
            if (!PL(p.lx - p.w / 2, -6, p.z)) return;
            var l = px, b = py; PL(p.lx + p.w / 2, -6 + 6 + p.h - 2.5, p.z);
            var r = px, t = py, k = pk, apex = t - 1.6 * k;
            ctx.fillStyle = fc([88, 76, 140], p.z);
            ctx.beginPath(); ctx.moveTo(l, b); ctx.lineTo(l, t); ctx.lineTo((l + r) / 2, apex); ctx.lineTo(r, t); ctx.lineTo(r, b); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,217,138,.75)';
            for (var i = 0; i < 4; i++) if (hash(p.z + i) > 0.35) ctx.fillRect(l + (0.15 + i * 0.22) * (r - l), t + 0.6 * k, 0.35 * k, 0.5 * k);
        },
        lights: function (p) {
            var pts = [], n = 12;
            for (var i = 0; i <= n; i++) {
                var u = i / n, lx = -2.2 + 4.4 * u;
                if (!PL(lx, 2.75 - 0.6 * 4 * u * (1 - u), p.z)) return;
                pts.push(px, py);
            }
            var k = pk, poleL = [], poleR = [];
            PL(-2.2, 0, p.z); poleL = [px, py]; PL(2.2, 0, p.z); poleR = [px, py];
            ctx.strokeStyle = fc([60, 56, 100], p.z); ctx.lineWidth = Math.max(1, 0.05 * k);
            ctx.beginPath(); ctx.moveTo(poleL[0], poleL[1]); ctx.lineTo(pts[0], pts[1]); ctx.moveTo(poleR[0], poleR[1]); ctx.lineTo(pts[n * 2], pts[n * 2 + 1]); ctx.stroke();
            ctx.lineWidth = Math.max(1, 0.015 * k); ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
            for (i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.stroke();
            var cols = ['#ffd98a', '#ffb3cf', '#a9f0e4', '#c8b6ff'];
            for (i = 1; i < n; i++) {
                ctx.fillStyle = cols[i % 4]; ctx.globalAlpha = fade(p.z - camZ) * 0.3;
                ctx.beginPath(); ctx.arc(pts[i * 2], pts[i * 2 + 1] + 0.06 * k, 0.14 * k, 0, TAU); ctx.fill();
                ctx.globalAlpha = fade(p.z - camZ);
                ctx.beginPath(); ctx.arc(pts[i * 2], pts[i * 2 + 1] + 0.06 * k, Math.max(1, 0.05 * k), 0, TAU); ctx.fill();
            }
        },
        fern: function (p) {
            if (!PL(p.lx, 0, p.z)) return;
            var k = pk * p.s;
            for (var i = 0; i < 7; i++) {
                var a = -Math.PI / 2 + (i - 3) * 0.38 + Math.sin(clock * 1.2 + p.ph + i) * 0.04;
                ctx.fillStyle = fc(i % 2 ? [92, 168, 98] : [120, 190, 112], p.z);
                ctx.save(); ctx.translate(px, py); ctx.rotate(a);
                ctx.beginPath(); ctx.ellipse(0.3 * k, 0, 0.32 * k, 0.08 * k, 0, 0, TAU); ctx.fill();
                ctx.restore();
            }
        },
        flowers: function (p) {
            if (!PL(p.lx, 0.12, p.z)) return;
            var k = pk, cols = ['#ff9fb8', '#ffd36b', '#ffffff', '#c7a4ff'];
            for (var i = 0; i < 5; i++) { ctx.fillStyle = cols[(i + Math.floor(p.ph)) % 4]; ctx.beginPath(); ctx.arc(px + (i - 2) * 0.12 * k, py - (i % 2) * 0.1 * k, Math.max(1, 0.06 * k), 0, TAU); ctx.fill(); }
        },
        hang: function (p) {
            var top = 2.7 + (2.7 - Math.abs(p.lx)) * 0.52, sw = Math.sin(clock * 1.1 + p.ph) * 0.05;
            if (!PL(p.lx, top, p.z)) return;
            var ax = px, ay = py; PL(p.lx + sw, 2.45, p.z);
            var k = pk;
            ctx.strokeStyle = fc([150, 130, 110], p.z); ctx.lineWidth = Math.max(1, 0.012 * k);
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
            ctx.fillStyle = fc([206, 120, 90], p.z);
            ctx.beginPath(); ctx.moveTo(px - 0.18 * k, py); ctx.lineTo(px + 0.18 * k, py); ctx.lineTo(px + 0.13 * k, py + 0.22 * k); ctx.lineTo(px - 0.13 * k, py + 0.22 * k); ctx.fill();
            for (var i = 0; i < 9; i++) {
                ctx.fillStyle = fc(i % 2 ? [96, 170, 100] : [130, 196, 116], p.z);
                var side2 = i % 3 - 1, d = (i / 3 | 0);
                ctx.beginPath(); ctx.ellipse(px + side2 * 0.16 * k, py + (0.05 + d * 0.18) * k, 0.07 * k, 0.11 * k, side2 * 0.4, 0, TAU); ctx.fill();
            }
        },
        weed: function (p) {
            if (!PL(p.lx, 0, p.z)) return;
            var k = pk; ctx.strokeStyle = mixc([96, 196, 156], ZONES[2].fog, Math.min(1, fogf(p.z - camZ) + 0.25)); ctx.lineWidth = Math.max(1.5, 0.08 * k); ctx.lineCap = 'round';
            for (var j = -1; j <= 1; j++) {
                ctx.beginPath(); ctx.moveTo(px + j * 0.15 * k, py);
                for (var i = 1; i <= 6; i++) { var u = i / 6; ctx.lineTo(px + (j * 0.15 + Math.sin(clock * 1.5 + i * 0.7 + p.ph + j) * 0.18 * u) * k, py - p.h * u * (1 - Math.abs(j) * 0.25) * k); }
                ctx.stroke();
            }
        },
        coral: function (p) {
            if (!PL(p.lx, 0, p.z)) return;
            var k = pk; ctx.fillStyle = p.c; ctx.globalAlpha = fade(p.z - camZ) * (1 - Math.min(1, fogf(p.z - camZ) + 0.25));
            for (var i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(px + (i - 2) * 0.16 * k, py - (0.15 + (i % 3) * 0.16) * k, 0.14 * k, 0, TAU); ctx.fill(); }
        },
        fish: function (p) {
            var u = Math.sin(clock * 0.35 + p.ph), dir = Math.cos(clock * 0.35 + p.ph) > 0 ? 1 : -1, f = Math.min(1, fogf(p.z - camZ) + 0.2);
            for (var i = 0; i < 4; i++) {
                if (!PL(p.lx + u * 1.6 + (i % 2) * 0.4, p.y + (i - 1.5) * 0.28 + Math.sin(clock * 2 + i) * 0.04, p.z + i * 0.3)) continue;
                var k = pk;
                ctx.fillStyle = mixc(p.c, ZONES[2].fog, f);
                ctx.beginPath(); ctx.ellipse(px, py, 0.2 * k, 0.1 * k, 0, 0, TAU); ctx.fill();
                ctx.beginPath(); ctx.moveTo(px - dir * 0.16 * k, py); ctx.lineTo(px - dir * 0.32 * k, py - 0.09 * k); ctx.lineTo(px - dir * 0.32 * k, py + 0.09 * k); ctx.fill();
                ctx.fillStyle = 'rgba(30,40,60,.7)'; ctx.beginPath(); ctx.arc(px + dir * 0.11 * k, py - 0.02 * k, Math.max(0.6, 0.02 * k), 0, TAU); ctx.fill();
            }
        },
        manta: function (p) {
            if (!PL(p.lx, 4.0, p.z)) return;
            var k = pk, fl = Math.sin(clock * 1.6) * 0.35;
            ctx.fillStyle = mixc([62, 112, 158], ZONES[2].fog, Math.min(1, fogf(p.z - camZ) + 0.15));
            ctx.beginPath(); ctx.moveTo(px, py - 0.5 * k); ctx.quadraticCurveTo(px + 0.9 * k, py - (0.3 + fl) * k, px + 1.6 * k, py + fl * k);
            ctx.quadraticCurveTo(px + 0.6 * k, py + 0.2 * k, px, py + 0.6 * k); ctx.quadraticCurveTo(px - 0.6 * k, py + 0.2 * k, px - 1.6 * k, py + fl * k);
            ctx.quadraticCurveTo(px - 0.9 * k, py - (0.3 + fl) * k, px, py - 0.5 * k); ctx.fill();
            ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, 0.04 * k);
            ctx.beginPath(); ctx.moveTo(px, py + 0.55 * k); ctx.lineTo(px, py + 1.4 * k); ctx.stroke();
        },
        sign: function (p) {
            if (!PL(p.lx, p.y, p.z)) return;
            var k = pk, x = px, y = py, s = p.lx > 0 ? 1 : -1, w = 0.95 * k, h = 0.62 * k, cxs = x - s * 0.55 * k;
            ctx.strokeStyle = fc([70, 64, 100], p.z); ctx.lineWidth = Math.max(1, 0.03 * k);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cxs, y); ctx.stroke();
            ctx.fillStyle = 'rgba(30,26,60,.75)'; rrect(cxs - w / 2, y - h / 2, w, h, h * 0.25); ctx.fill();
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            for (var pass = 0; pass < 2; pass++) {
                ctx.strokeStyle = p.c; ctx.globalAlpha = fade(p.z - camZ) * (pass ? 1 : 0.3); ctx.lineWidth = Math.max(1, (pass ? 0.035 : 0.12) * k);
                rrect(cxs - w / 2, y - h / 2, w, h, h * 0.25); ctx.stroke();
                ctx.beginPath();
                if (p.sym === 0) { ctx.ellipse(cxs - 0.05 * k, y, 0.22 * k, 0.12 * k, 0, 0, TAU); ctx.moveTo(cxs + 0.17 * k, y); ctx.lineTo(cxs + 0.32 * k, y - 0.1 * k); ctx.lineTo(cxs + 0.32 * k, y + 0.1 * k); ctx.closePath(); }
                else if (p.sym === 1) { ctx.arc(cxs, y + 0.07 * k, 0.1 * k, 0, TAU); for (var i = 0; i < 4; i++) { ctx.moveTo(cxs + (i - 1.5) * 0.1 * k + 0.045 * k, y - 0.1 * k); ctx.arc(cxs + (i - 1.5) * 0.1 * k, y - 0.1 * k - (i === 0 || i === 3 ? 0 : 0.04 * k), 0.045 * k, 0, TAU); } }
                else if (p.sym === 2) { ctx.moveTo(cxs, y + 0.16 * k); ctx.bezierCurveTo(cxs - 0.34 * k, y - 0.06 * k, cxs - 0.12 * k, y - 0.28 * k, cxs, y - 0.1 * k); ctx.bezierCurveTo(cxs + 0.12 * k, y - 0.28 * k, cxs + 0.34 * k, y - 0.06 * k, cxs, y + 0.16 * k); }
                else if (p.sym === 3) { ctx.moveTo(cxs - 0.14 * k, y - 0.12 * k); ctx.lineTo(cxs + 0.14 * k, y - 0.12 * k); ctx.lineTo(cxs + 0.1 * k, y + 0.14 * k); ctx.lineTo(cxs - 0.1 * k, y + 0.14 * k); ctx.closePath(); ctx.moveTo(cxs + 0.14 * k, y - 0.06 * k); ctx.arc(cxs + 0.16 * k, y - 0.02 * k, 0.05 * k, -1.2, 1.4); }
                else { ctx.stroke(); ctx.font = '900 ' + 0.24 * k + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = p.c; if (pass) ctx.fillText('MEOW', cxs, y); continue; }
                ctx.stroke();
            }
            if (PL(p.lx - s * 0.55, 0.001, p.z)) {  /* its reflection on the wet street */
                ctx.globalAlpha = fade(p.z - camZ) * 0.2; ctx.fillStyle = p.c;
                ctx.fillRect(px - 0.25 * pk, py, 0.5 * pk, 1.6 * pk);
            }
        },
        lanterns: function (p) {
            var pts = [], n = 10;
            for (var i = 0; i <= n; i++) { var u = i / n; if (!PL(-4.3 + 8.6 * u, 4.9 - 0.7 * 4 * u * (1 - u), p.z)) return; pts.push(px, py); }
            var k = pk;
            ctx.strokeStyle = fc([40, 36, 70], p.z); ctx.lineWidth = Math.max(1, 0.015 * k);
            ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke();
            var cols = ['#ff9fb8', '#ffb37a', '#ffd98a', '#ff8fc8'];
            for (i = 1; i < n; i++) {
                ctx.fillStyle = cols[i % 4];
                ctx.globalAlpha = fade(p.z - camZ) * 0.3; ctx.beginPath(); ctx.arc(pts[i * 2], pts[i * 2 + 1] + 0.18 * k, 0.28 * k, 0, TAU); ctx.fill();
                ctx.globalAlpha = fade(p.z - camZ); ctx.beginPath(); ctx.ellipse(pts[i * 2], pts[i * 2 + 1] + 0.18 * k, 0.12 * k, 0.15 * k, 0, 0, TAU); ctx.fill();
            }
        },
        post: function (p) {
            if (!PL(p.lx, 0.15, p.z)) return;
            var bx = px, by = py; PL(p.lx, 3.7, p.z);
            var k = pk;
            ctx.strokeStyle = fc([60, 54, 96], p.z); ctx.lineWidth = Math.max(1, 0.06 * k);
            ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.lineTo(px - (p.lx > 0 ? 0.4 : -0.4) * k, py); ctx.stroke();
            var hx = px - (p.lx > 0 ? 0.4 : -0.4) * k;
            ctx.globalAlpha = fade(p.z - camZ) * 0.25; ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(hx, py + 0.1 * k, 0.45 * k, 0, TAU); ctx.fill();
            ctx.globalAlpha = fade(p.z - camZ); ctx.beginPath(); ctx.arc(hx, py + 0.1 * k, 0.12 * k, 0, TAU); ctx.fill();
        },
        candle: function (p) {
            if (!PL(p.lx, p.y + Math.sin(clock * 1.4 + p.ph) * 0.08, p.z)) return;
            var k = pk;
            ctx.globalAlpha = fade(p.z - camZ) * 0.3; ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(px, py - 0.12 * k, 0.2 * k, 0, TAU); ctx.fill();
            ctx.globalAlpha = fade(p.z - camZ);
            ctx.fillStyle = '#fff6e4'; ctx.fillRect(px - 0.03 * k, py - 0.06 * k, 0.06 * k, 0.2 * k);
            ctx.fillStyle = '#ffc94d'; ctx.beginPath(); ctx.ellipse(px, py - 0.11 * k, 0.025 * k, 0.05 * k, 0, 0, TAU); ctx.fill();
        },
        ladder: function (p) {
            var h = libHw(p.z), x0 = p.s * (h - 0.35), x1 = p.s * (h - 0.04), c = cx(p.z);
            ctx.strokeStyle = fc([150, 100, 66], p.z); ctx.lineWidth = Math.max(1, 0.035 * F / Math.max(1, p.z - camZ));
            ctx.beginPath();
            for (var j = 0; j < 2; j++) { var z = p.z + j * 0.45; if (!P(c + x0, 0, z)) return; ctx.moveTo(px, py); P(c + x1, 4.2, z); ctx.lineTo(px, py); }
            for (var i = 1; i < 10; i++) {
                var u = i / 10, x = c + x0 + (x1 - x0) * u;
                if (!P(x, 4.2 * u, p.z)) return; ctx.moveTo(px, py); P(x, 4.2 * u, p.z + 0.45); ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
    };

    /* ---------- the frame ---------- */
    function drawItem(e) {
        ctx.globalAlpha = 1;
        if (!e.type) { ctx.globalAlpha = fade(e.z - camZ); PROP[e.kind](e); ctx.globalAlpha = 1; return; }
        var t = e.type;
        if (t === 'glass') drawGlass(e);
        else if (t === 'frame') drawFrame(e);
        else if (t === 'portal') drawPortal(e);
        else if (t === 'door') drawDoor(e);
        else if (t === 'vase') drawVase(e);
        else if (t === 'ball') drawBall(e);
        else if (!e.broken || t === 'lamp') { if (t === 'crystal') drawCrystal(e); else if (t === 'lamp') drawLamp(e); else if (t === 'dot') drawDot(e); }
    }
    function drawWorld() {
        buildStrips();
        var list = ents.concat(props, flying), j = 0, n = bz.length;
        list.sort(function (a, b) { return b.z - a.z; });
        while (j < list.length && list[j].z > camZ + FAR + 2) j++;
        while (j < list.length && list[j].z >= bz[n - 1]) drawItem(list[j++]);
        for (var i = n - 2; i >= 0; i--) {
            var zn = bz[i], zf = bz[i + 1], Z = zoneOf((zn + zf) / 2);
            setStrip(zn, zf, Z);
            Z.strip(zn, zf);
            while (j < list.length && list[j].z >= zn) drawItem(list[j++]);
            if (Z.front) { setStrip(zn, zf, Z); Z.front(zn); }
        }
        while (j < list.length) drawItem(list[j++]);
    }
    function drawPaw(x, y, r, lift) {
        ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.fillStyle = FUR; ctx.lineJoin = 'round';
        if (lift <= 0.25) for (var t = 0; t < 3; t++) { ctx.beginPath(); ctx.arc(x + (t - 1) * r * 0.5, y - r * (t === 1 ? 0.68 : 0.58), r * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x - r * 0.72, H + 4); ctx.lineTo(x - r * 0.72, y + r * 0.55);
        ctx.quadraticCurveTo(x - r, y + r * 0.35, x - r, y);
        ctx.ellipse(x, y, r, r * 0.82, 0, Math.PI, TAU);
        ctx.quadraticCurveTo(x + r, y + r * 0.35, x + r * 0.72, y + r * 0.55); ctx.lineTo(x + r * 0.72, H + 4); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = STRIPE; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.6); ctx.quadraticCurveTo(x, y + r * 0.45, x + r * 0.5, y + r * 0.6);
        ctx.moveTo(x - r * 0.45, y + r * 1.05); ctx.quadraticCurveTo(x, y + r * 0.9, x + r * 0.45, y + r * 1.05); ctx.stroke();
        if (lift > 0.25) {
            ctx.fillStyle = BEAN;
            ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.36, r * 0.28, 0, 0, TAU); ctx.fill();
            for (t = 0; t < 4; t++) { ctx.beginPath(); ctx.arc(x + (t - 1.5) * r * 0.36, y - r * (t === 0 || t === 3 ? 0.3 : 0.48), r * 0.13, 0, TAU); ctx.fill(); }
        }
    }
    function pill(x, y, w, fill) { ctx.fillStyle = fill || 'rgba(255,255,255,.92)'; rrect(x, y, w, 34, 17); ctx.fill(); }
    function drawHud() {
        ctx.font = '800 18px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        var txt = String(balls), w = ctx.measureText(txt).width + 50, low = balls <= 3, x = 10;
        pill(x, 10, w, low && Math.sin(clock * 10) > 0 ? 'rgba(255,228,232,.95)' : null);
        wool(x + 19, 27, 10, 0, 'pink');
        ctx.fillStyle = low ? '#e8484f' : '#0f172a'; ctx.fillText(txt, x + 35, 28);
        x += w + 6;
        ctx.font = '800 15px system-ui, sans-serif';
        if (multi > 1 || streak > 0) {
            var t2 = multi > 1 ? 'x' + multi + ' yarn' : 'Streak ' + streak, w2 = ctx.measureText(t2).width + 24;
            pill(x, 10, w2, multi > 1 ? '#d6336c' : null);
            ctx.fillStyle = multi > 1 ? '#ffffff' : '#64748b'; ctx.fillText(t2, x + 12, 28);
            x += w2 + 6;
        }
        if (zoomT > 0) {
            pill(x, 10, 100, '#fff3c4');
            ctx.fillStyle = '#b45309'; ctx.fillText('Zoomies!', x + 12, 25);
            ctx.fillStyle = '#f59e0b'; ctx.fillRect(x + 12, 35, 76 * clamp(zoomT / 4, 0, 1), 3);
        }
        var Z = ZONES[curZi % NZ], zt = Z.name, prog = clamp((camZ - curZi * ZONE_LEN) / ZONE_LEN, 0, 1);  /* the zone and how far to the next gate */
        ctx.font = '800 13px system-ui, sans-serif';
        var zw = ctx.measureText(zt).width + 24;
        if (W - zw - 10 > x + 10) {
            pill(W - zw - 10, 10, zw);
            ctx.fillStyle = Z.accent; ctx.fillText(zt, W - zw + 2, 24);
            ctx.fillStyle = 'rgba(15,23,42,.12)'; ctx.fillRect(W - zw + 2, 32, zw - 24, 3);
            ctx.fillStyle = Z.accent; ctx.fillRect(W - zw + 2, 32, (zw - 24) * prog, 3);
        }
    }
    function draw() {
        var ox = shake ? (Math.random() - 0.5) * shake : 0, oy = shake ? (Math.random() - 0.5) * shake : 0, i;
        ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
        var shift = clamp(-camS * F, -SKYM, SKYM);
        sky(curZi, shift);
        for (i = 0; i < ents.length; i++) {  /* through a zone gate: the next zone's sky */
            var e = ents[i];
            if (e.type !== 'portal' || e.z - camZ > FAR + 2 || !PL(0, 0, e.z)) continue;
            ctx.save(); ctx.beginPath(); archPath(px, py, pk); ctx.clip(); sky(e.zi, shift); ctx.restore();
        }
        drawWorld();
        for (i = 0; i < parts.length; i++) {
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
        for (i = 0; i < ents.length; i++) drawLabel(ents[i]);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        for (i = 0; i < floats.length; i++) {
            var f = floats[i];
            if (!P(f.x, f.y, f.z)) continue;
            ctx.globalAlpha = clamp((1.1 - f.t) / 0.4, 0, 1);
            ctx.font = '800 ' + (f.big ? 26 : 18) + 'px system-ui, sans-serif';
            var fy = py - f.t * 46;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.strokeText(f.text, px, fy);
            ctx.fillStyle = f.c; ctx.fillText(f.text, px, fy);
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < rings.length; i++) {
            var rg = rings[i];
            ctx.strokeStyle = 'rgba(214,51,108,' + (1 - rg.t / 0.35).toFixed(2) + ')'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(rg.x, rg.y, 6 + rg.t * 50, 0, TAU); ctx.stroke();
        }
        if (zoomT > 0 && !api.reducedMotion) {
            ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath();
            for (i = 0; i < 14; i++) {
                var an = Math.random() * TAU, r0 = rnd(0.25, 0.45) * Math.max(W, H), r1 = r0 + rnd(30, 90);
                ctx.moveTo(CX + Math.cos(an) * r0, HY + Math.sin(an) * r0); ctx.lineTo(CX + Math.cos(an) * r1, HY + Math.sin(an) * r1);
            }
            ctx.stroke();
        }
        var bob = api.reducedMotion ? 0 : Math.sin(runPh) * PAW * 0.08 * Math.min(1, speed / 4);
        drawPaw(W * 0.24, H - PAW * 0.3 - paws[0] * PAW * 1.1 + bob, PAW, paws[0]);
        drawPaw(W * 0.76, H - PAW * 0.3 - paws[1] * PAW * 1.1 - bob, PAW, paws[1]);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (flash > 0) { ctx.fillStyle = 'rgba(255,170,190,' + (flash * 0.35).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
        drawHud();
    }

    api.loop(function (dt) { update(dt); draw(); });

    /* ---------- input: tap or click to throw, Space throws straight ahead ---------- */
    api.on(cv, 'pointerdown', function (e) {
        e.preventDefault();
        var r = cv.getBoundingClientRect();
        throwAt(e.clientX - r.left, e.clientY - r.top);
    });
    api.on(cv, 'contextmenu', function (e) { e.preventDefault(); });
    api.on(window, 'keydown', function (e) {
        if (e.key !== ' ' && e.code !== 'Space') return;
        e.preventDefault();
        if (!e.repeat) throwAt(CX, HY);
    });

    fit(api.size());
    api.onResize(fit);
    camX = cx(0); camS = (cx(1) - cx(-1)) / 2;
    spawn();
});
