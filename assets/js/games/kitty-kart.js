/* Kitty Kart: a top-down kart race, the orange cat against three other cats. 3 laps; best score = fastest race time.
   Before the race you pick one of four tracks (Catnip Meadow, Night City, Coral Reef, Moon Rim). Each has its own
   layout, scenery and handling, a shortcut with a catch, boost pads and moving hazards. Floating fish tins give an
   item (yarn ball, catnip, cardboard box, laser pointer, milk carton, nap bell); karts further back get better ones.
   Difficulty comes from api.level(): Easy keeps the simple computer driver, Normal and Hard race on a real racing
   line, time the shortcuts, use items with care and have personalities (aggressive, consistent, item-happy).
   A track is a closed path resampled into N evenly spaced points, plus a shortcut path whose points map onto the
   main ones; karts find their nearest point to know where they are, and a lap counts only after all checkpoints
   were passed in order. Shell API: arcade.js.
   The same file is Kitty Kart Duo (id kitty-kart-duo): two players on two devices race each other and two computer
   cats; see the Duo part at the end. Single player is untouched by it: pal stays null, host and remote false.
   And it is Kitty Kart Split Screen (id kitty-kart-split): two players on one phone lying flat between them, one half
   of the screen each, turned to face its player, or on one keyboard, W A S D against the arrow keys; see the Split
   part at the very end. Nothing goes over the network there. */
(function () {
Arcade.register('kitty-kart', function (api) { return kart(api, false); });
Arcade.register('kitty-kart-duo', function (api) { return kart(api, true); });
Arcade.register('kitty-kart-split', function (api) { return kart(api, false, true); });

function kart(api, duo, split) {
    'use strict';
    api.css(
        '.kk, .kk-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
        '.kk-hud { position: absolute; left: 10px; top: 10px; display: flex; gap: 6px; align-items: center; pointer-events: none; }' +
        '.kk-pill { padding: 4px 10px; border-radius: 12px; background: rgba(255,255,255,.92); box-shadow: 0 3px 10px rgba(15,23,42,.08);' +
        '  color: #0f172a; font-weight: 800; font-size: .9rem; white-space: nowrap; }' +
        '.kk-pill small { margin-right: 4px; color: #5b6b80; font-weight: 600; font-size: .75rem; }' +
        '.kk-pos { color: #d6336c; font-size: 1.25rem; padding: 2px 12px; }' +
        '.kk-time { font-family: ui-monospace, Menlo, Consolas, monospace; color: #1e3a8a; }' +
        '.kk-count { position: absolute; left: 50%; top: 24%; transform: translate(-50%, -50%); color: #1e3a8a; font-size: 5rem;' +
        '  font-weight: 800; line-height: 1; text-shadow: 0 4px 0 #fff; pointer-events: none; white-space: nowrap; }' +
        '.kk-count.kk-go { color: #d6336c; }' +
        '.kk-count.kk-warn { color: #d6336c; font-size: 2.2rem; }' +
        '.kk-pop { animation: kk-pop .35s cubic-bezier(.3, 1.6, .5, 1); }' +
        '.kk-hint { position: absolute; left: 50%; top: calc(24% + 56px); transform: translateX(-50%); max-width: 86%; padding: 6px 12px;' +
        '  border-radius: 12px; background: rgba(255,255,255,.92); color: #475569; font-size: .85rem; font-weight: 600; text-align: center; pointer-events: none; }' +
        '.kk-btn { position: absolute; display: none; width: 72px; height: 72px; padding: 0; border: none; border-radius: 50%;' +
        '  background: rgba(255,255,255,.88); box-shadow: 0 4px 0 #cbd5e1; color: #1e3a8a; font: 800 .95rem/1 inherit; touch-action: none; }' +
        '.kk-btn svg { width: 34px; height: 34px; fill: none; stroke: currentColor; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }' +
        '.kk.kk-touch .kk-btn { display: grid; place-items: center; }' +
        '.kk-btn.kk-on { transform: translateY(3px); box-shadow: 0 1px 0 #cbd5e1; background: #1e3a8a; color: #fff; }' +
        '.kk-left { left: 14px; bottom: 16px; } .kk-right { left: 100px; bottom: 16px; }' +
        '.kk-gas { right: 14px; bottom: 96px; width: 84px; height: 84px; background: #d6336c; color: #fff; box-shadow: 0 4px 0 #a61e4d; }' +
        '.kk-gas.kk-on { background: #a61e4d; }' +
        '.kk-brake { right: 108px; bottom: 16px; width: 64px; height: 64px; }' +
        /* the track picker shown before the race */
        '.kk.kk-picking .kk-hud, .kk.kk-picking .kk-btn, .kk.kk-picking .kk-hint, .kk.kk-picking .kk-count { display: none; }' +
        '.kk-pick { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; padding: 12px;' +
        '  background: rgba(15,23,42,.38); overflow-y: auto; }' +
        '.kk.kk-picking .kk-pick { display: flex; }' +
        '.kk-pick-box { width: 100%; max-width: 660px; margin: auto; padding: 14px; border-radius: 18px; background: rgba(255,255,255,.96);' +
        '  box-shadow: 0 10px 30px rgba(15,23,42,.25); text-align: center; }' +
        '.kk-pick-box h3 { margin: 0 0 10px; color: #1e3a8a; font-size: 1.15rem; font-weight: 800; }' +
        '.kk-maps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }' +
        '.kk-narrow .kk-maps { grid-template-columns: repeat(2, 1fr); gap: 8px; }' +
        '.kk-narrow .kk-map canvas { height: 92px; object-fit: cover; }' +
        '.kk-narrow .kk-map small { font-size: .7rem; }' +
        '.kk-map { min-width: 0; padding: 6px 6px 8px; border: 2px solid #e2e8f0; border-radius: 14px; background: #fff; color: #0f172a;' +
        '  font: inherit; text-align: center; cursor: pointer; touch-action: manipulation; }' +
        '.kk-map:hover { border-color: #f3a5c0; }' +
        '.kk-map.kk-sel { border-color: #d6336c; box-shadow: 0 0 0 3px rgba(214,51,108,.22); }' +
        '.kk-map canvas { display: block; width: 100%; height: auto; border-radius: 10px; }' +
        '.kk-map b { display: block; margin-top: 6px; font-size: .92rem; font-weight: 800; }' +
        '.kk-map small { display: block; margin-top: 2px; color: #5b6b80; font-size: .74rem; line-height: 1.25; }' +
        '.kk-map .kk-mbest { color: #1e3a8a; font-weight: 700; min-height: 1.2em; }' +
        '.kk-pick-tip { margin: 10px 0 0; color: #5b6b80; font-size: .8rem; font-weight: 600; }' +
        '.kk-slot { width: 42px; height: 36px; padding: 0; display: grid; place-items: center; }' +
        '.kk-slot canvas { width: 30px; height: 30px; display: block; }' +
        '.kk-use { left: 14px; bottom: 100px; width: 64px; height: 64px; background: #fff7d6; box-shadow: 0 4px 0 #e5c76b; }' +
        '.kk-use canvas { width: 40px; height: 40px; display: block; }' +
        '.kk-empty canvas { opacity: .45; }' +
        /* Kitty Kart Duo: the lobby, the host's level buttons and the results */
        '.kk-lobby, .kk-res { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; padding: 12px;' +
        '  background: rgba(15,23,42,.38); overflow-y: auto; }' +
        '.kk.kk-lobby-on .kk-lobby { display: flex; } .kk.kk-lobby-on .kk-pick { display: none; } .kk.kk-res-on .kk-res { display: flex; }' +
        '.kk-lb { max-width: 460px; } .kk-lb section { display: none; } .kk-lb section.kk-on { display: block; }' +
        '.kk-lb-p { margin: 0 0 14px; color: #475569; font-size: .92rem; line-height: 1.45; }' +
        '.kk-lb-row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }' +
        '.kk-lb-btn { padding: 9px 18px; border: 2px solid #e2e8f0; border-radius: 14px; background: #fff; color: #0f172a; font: inherit;' +
        '  font-weight: 800; cursor: pointer; touch-action: manipulation; }' +
        '.kk-lb-btn:hover { border-color: #f3a5c0; } .kk-lb-btn:disabled { opacity: .45; cursor: default; border-color: #e2e8f0; }' +
        '.kk-lb-btn[hidden] { display: none; }' +
        '.kk-lb-go { border-color: #d6336c; background: #d6336c; color: #fff; } .kk-lb-go:hover { border-color: #a61e4d; }' +
        '.kk-lb-big { flex: 1 1 150px; padding: 16px 12px; font-size: 1.05rem; }' +
        '.kk-lb-small { margin: 14px 0 0; color: #5b6b80; font-size: .76rem; line-height: 1.35; } .kk-lb-small a { color: #1e3a8a; }' +
        '.kk-lb-p b { color: #0f172a; } .kk-lb-wifi { font-size: .85rem; } .kk-lb-wifi a { color: #1e3a8a; font-weight: 700; }' +
        '.kk-code { margin: 2px 0 10px; color: #1e3a8a; font: 800 3.6rem/1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .16em; }' +
        '.kk-lb-wait { margin: 0 0 14px; color: #d6336c; font-weight: 800; }' +
        '.kk-in { width: 7.2em; padding: 7px 8px; border: 2px solid #e2e8f0; border-radius: 12px; background: #fff; color: #1e3a8a;' +
        '  font: 800 1.6rem/1.1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .18em; text-align: center; text-transform: uppercase;' +
        '  user-select: text; -webkit-user-select: text; touch-action: manipulation; }' +
        '.kk-in:focus { outline: none; border-color: #d6336c; }' +
        '.kk-lb-err { min-height: 1.3em; margin: 10px 0; color: #d6336c; font-size: .88rem; font-weight: 700; }' +
        '.kk-lvl { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; margin: 0 0 10px; color: #5b6b80; font-size: .85rem; font-weight: 700; }' +
        '.kk-lvl[hidden] { display: none; } .kk-lvl span { margin-right: 4px; }' +
        '.kk-lvl button { padding: 4px 12px; border: 2px solid #e2e8f0; border-radius: 999px; background: #fff; color: #0f172a; font: inherit; cursor: pointer; touch-action: manipulation; }' +
        '.kk-lvl button.kk-sel { border-color: #d6336c; color: #d6336c; }' +
        '.kk-pick-back { margin-top: 10px; } .kk-pick-back[hidden] { display: none; }' +
        '.kk-res-list { margin: 0 0 12px; padding: 0; list-style: none; text-align: left; }' +
        '.kk-res-list li { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; }' +
        '.kk-res-list li.kk-me { color: #d6336c; } .kk-res-list b { width: 1.2em; color: #5b6b80; }' +
        '.kk-res-list i { flex: none; width: 14px; height: 14px; border-radius: 50%; }' +
        '.kk-res-list em { margin-left: auto; color: #1e3a8a; font-family: ui-monospace, Menlo, Consolas, monospace; font-style: normal; white-space: nowrap; }' +
        '.kk-narrow .kk-code { font-size: 2.8rem; }' +
        /* Kitty Kart Split Screen: two views, each with its own HUD (and, on phones, its own buttons), the keys line in the
           picker; on phones the race fills the whole screen (kk-full), each half turned to face its player */
        '.kk.kk-split { background: #0f172a; }' +
        '.kk-split > .kk-cv, .kk-split > .kk-hud, .kk-split > .kk-count, .kk-split > .kk-hint, .kk-split > .kk-btn { display: none !important; }' +
        '.kk.kk-full { position: fixed; inset: 0; z-index: 50; width: auto; height: auto; touch-action: none; }' +
        '.kk-view { position: absolute; overflow: hidden; transform-origin: 50% 50%; -webkit-touch-callout: none; }' +
        '.kk-view .kk-btn { width: 60px; height: 60px; }' +
        '.kk-view .kk-left { left: 12px; bottom: calc(12px + var(--sb, 0px)); } .kk-view .kk-right { left: 84px; bottom: calc(12px + var(--sb, 0px)); }' +
        '.kk-view .kk-use { left: 12px; bottom: calc(84px + var(--sb, 0px)); width: 56px; height: 56px; } .kk-view .kk-use canvas { width: 36px; height: 36px; }' +
        '.kk-view .kk-gas { right: 12px; bottom: calc(80px + var(--sb, 0px)); width: 70px; height: 70px; }' +
        '.kk-view .kk-brake { right: 92px; bottom: calc(12px + var(--sb, 0px)); width: 56px; height: 56px; }' +
        '.kk-phone .kk-vhud .kk-slot, .kk-phone .kk-who small { display: none; }' +
        '.kk-close { display: none; width: 30px; height: 30px; padding: 0; border: none; border-radius: 50%; background: rgba(255,255,255,.92);' +
        '  color: #0f172a; font: 800 1.1rem/1 inherit; pointer-events: auto; cursor: pointer; touch-action: manipulation; }' +
        '.kk-full .kk-close { display: block; }' +
        '.kk-vres { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; padding: 8px; background: rgba(15,23,42,.38); overflow-y: auto; }' +
        '.kk.kk-phone.kk-res-on .kk-vres { display: flex; } .kk.kk-phone.kk-res-on > .kk-res { display: none; }' +
        '.kk-vres .kk-pick-box { padding: 10px 12px; } .kk-vres h3 { margin-bottom: 6px; } .kk-vres .kk-res-list { margin-bottom: 6px; }' +
        '.kk-vres .kk-res-list li { padding: 4px 8px; font-size: .88rem; } .kk-vres .kk-lb-p { margin-bottom: 8px; font-size: .82rem; }' +
        '.kk-vhud { position: absolute; left: 10px; top: 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; pointer-events: none; }' +
        '.kk.kk-picking .kk-vhud, .kk.kk-picking .kk-vsay { display: none; }' +
        '.kk-who { color: #fff; background: #d6336c; } .kk-v2 .kk-who { background: #1e3a8a; }' +
        '.kk-who small { margin: 0 0 0 4px; color: rgba(255,255,255,.85); }' +
        '.kk-v2 .kk-pos { color: #1e3a8a; }' +
        '.kk-vhud .kk-slot { width: auto; display: flex; gap: 4px; padding: 0 9px 0 6px; }' +
        '.kk-vhud .kk-slot small { margin: 0; }' +
        '.kk-count.kk-fin { color: #1e3a8a; font-size: 2.2rem; } .kk-v1 .kk-count.kk-fin { color: #d6336c; }' +
        '.kk-view .kk-count { font-size: 4rem; } .kk-view .kk-count.kk-warn, .kk-view .kk-count.kk-fin { font-size: 2rem; }' +
        '.kk-vsay { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); max-width: 90%; padding: 6px 12px; border-radius: 12px;' +
        '  background: rgba(255,255,255,.92); color: #0f172a; font-size: .88rem; font-weight: 700; text-align: center; pointer-events: none; }' +
        '.kk-vsay:empty { display: none; }' +
        '.kk-keys { display: flex; flex-wrap: wrap; gap: 6px 18px; justify-content: center; margin: 0 0 10px; color: #475569; font-size: .85rem; font-weight: 600; }' +
        '.kk-keys b { margin-right: 4px; color: #d6336c; font-weight: 800; } .kk-keys span + span b { color: #1e3a8a; }' +
        '.kk-phone-line { display: none; margin: 0 0 10px; color: #475569; font-size: .88rem; font-weight: 600; line-height: 1.4; }' +
        '.kk-phone-line b { color: #d6336c; } .kk-phone-line b + b { color: #1e3a8a; }' +
        '.kk-phone .kk-phone-line { display: block; } .kk-phone .kk-keys { display: none; }' +
        '.kk-res-list li.kk-p2 { color: #1e3a8a; }' +
        '@keyframes kk-pop { from { transform: translate(-50%, -50%) scale(.4); } to { transform: translate(-50%, -50%) scale(1); } }');

    var N = 480, CP = 12, SEG = N / CP, LAPS = 3, HW = 52, PAD = 380, BRAKE = 520, REV = 90, R = 12;
    var X = new Float32Array(N), Y = new Float32Array(N), A = new Float32Array(N), K = new Float32Array(N);
    var WW, WH, SP;
    var VMAX, VGRASS, ACC, GRIP, GRIPOFF, COAST, TURN, CARE;  /* handling, set by the track */
    function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    var ALT = null;  /* the shortcut of the current track, see buildAlt */
    function nearest(o) {  /* the closest track point to (o.x, o.y): idx, dist, px, py, ang, alt (on the shortcut), on (on a road) */
        var best = 1e12, bi = 0, i, dx, dy, q;
        for (i = 0; i < N; i++) {
            dx = X[i] - o.x; dy = Y[i] - o.y; q = dx * dx + dy * dy;
            if (q < best) { best = q; bi = i; }
        }
        var md = Math.sqrt(best);
        o.idx = bi; o.alt = false; o.px = X[bi]; o.py = Y[bi]; o.ang = A[bi];
        if (ALT) {
            var aj = -1;
            for (i = 1; i < ALT.n - 1; i++) {
                dx = ALT.x[i] - o.x; dy = ALT.y[i] - o.y; q = dx * dx + dy * dy;
                if (q < best) { best = q; aj = i; }
            }
            if (aj >= 0) {
                o.alt = true; o.ai = aj; o.idx = ix(ALT.a + Math.round(ALT.span * aj / (ALT.n - 1)));
                o.px = ALT.x[aj]; o.py = ALT.y[aj]; o.ang = ALT.ang[aj];
            }
        }
        o.dist = Math.sqrt(best);
        o.on = md <= HW + 4 || (o.alt && o.dist <= ALT.hw + 4);
    }
    var seed = 1;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function ix(i) { return ((i % N) + N) % N; }
    function side(i, l) { return { x: X[ix(i)] - Math.sin(A[ix(i)]) * l, y: Y[ix(i)] + Math.cos(A[ix(i)]) * l }; }  /* l > 0: right of the driving direction */

    /* ---------- building a track: a smooth spline or straight streets with rounded corners ---------- */
    function spline(C, s) {  /* Catmull-Rom through the control points */
        var n = C.length / 2, d = [], i, j, c;
        for (i = 0; i < n; i++) {
            var p = [(i + n - 1) % n, i, (i + 1) % n, (i + 2) % n];
            for (j = 0; j < 24; j++) {
                var t = j / 24, t2 = t * t, t3 = t2 * t;
                for (c = 0; c < 2; c++) {
                    var a = C[p[0] * 2 + c], b = C[p[1] * 2 + c], e = C[p[2] * 2 + c], f = C[p[3] * 2 + c];
                    d.push(s * 0.5 * (2 * b + (e - a) * t + (2 * a - 5 * b + 4 * e - f) * t2 + (3 * b - a - 3 * e + f) * t3));
                }
            }
        }
        return d;
    }
    function fillet(P, r, s) {  /* a polygon whose corners are arcs of radius r */
        var n = P.length / 2, d = [], i, k;
        for (i = 0; i < n; i++) {
            var a = (i + n - 1) % n, c = (i + 1) % n, bx = P[i * 2] * s, by = P[i * 2 + 1] * s;
            var ux = P[a * 2] * s - bx, uy = P[a * 2 + 1] * s - by, lu = Math.hypot(ux, uy);
            var vx = P[c * 2] * s - bx, vy = P[c * 2 + 1] * s - by, lv = Math.hypot(vx, vy);
            ux /= lu; uy /= lu; vx /= lv; vy /= lv;
            var ang = Math.acos(clamp(ux * vx + uy * vy, -1, 1)), t = r / Math.tan(ang / 2), h = r / Math.sin(ang / 2);
            var mx = ux + vx, my = uy + vy, lm = Math.hypot(mx, my), ox = bx + mx / lm * h, oy = by + my / lm * h;
            var a1 = Math.atan2(by + uy * t - oy, bx + ux * t - ox), da = wrap(Math.atan2(by + vy * t - oy, bx + vx * t - ox) - a1);
            var m = Math.max(2, Math.ceil(Math.abs(da) * r / 8));
            for (k = 0; k <= m; k++) d.push(ox + Math.cos(a1 + da * k / m) * r, oy + Math.sin(a1 + da * k / m) * r);
        }
        return d;
    }
    function build(map) {
        var d = map.ctrl ? spline(map.ctrl, map.scale) : fillet(map.poly, map.round, map.scale);
        var m = d.length / 2, len = [0], i, j;
        for (i = 1; i <= m; i++) len.push(len[i - 1] + Math.hypot(d[(i % m) * 2] - d[i * 2 - 2], d[(i % m) * 2 + 1] - d[i * 2 - 1]));
        SP = len[m] / N;
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, off = (map.start || 0) * len[m];
        for (i = 0, j = 0; i < N; i++) {  /* resample to evenly spaced points, the first one on the start line */
            var s = (i * SP + off) % len[m];
            if (s < len[j]) j = 0;
            while (len[j + 1] < s) j++;
            var u = (s - len[j]) / (len[j + 1] - len[j]), q = j * 2, r = ((j + 1) % m) * 2;
            X[i] = d[q] + (d[r] - d[q]) * u; Y[i] = d[q + 1] + (d[r + 1] - d[q + 1]) * u;
            x0 = Math.min(x0, X[i]); y0 = Math.min(y0, Y[i]); x1 = Math.max(x1, X[i]); y1 = Math.max(y1, Y[i]);
        }
        for (i = 0; i < N; i++) { X[i] += PAD - x0; Y[i] += PAD - y0; }
        WW = Math.ceil(x1 - x0 + 2 * PAD); WH = Math.ceil(y1 - y0 + 2 * PAD);
        for (i = 0; i < N; i++) A[i] = Math.atan2(Y[(i + 1) % N] - Y[(i + N - 1) % N], X[(i + 1) % N] - X[(i + N - 1) % N]);
        for (i = 0; i < N; i++) K[i] = wrap(A[(i + 1) % N] - A[(i + N - 1) % N]) / (2 * SP);
        var ph = map.phys;
        VMAX = ph.vmax; VGRASS = ph.vgrass; ACC = ph.acc; GRIP = ph.grip; GRIPOFF = ph.gripOff; COAST = ph.coast; TURN = ph.turn; CARE = ph.care;
        buildAlt(map.alt);
    }
    function straight(j, a, b, lim) {  /* is the track nearly straight from j + a to j + b? */
        for (var i = j + a; i <= j + b; i++) if (Math.abs(K[ix(i)]) > lim) return false;
        return true;
    }
    function straightNear(f, a, b, lim) {  /* the straight spot closest to a fraction f of the lap */
        var j0 = Math.round(f * N);
        for (var d = 0; d < N / 2; d++) {
            if (straight(j0 + d, a, b, lim)) return ix(j0 + d);
            if (straight(j0 - d, a, b, lim)) return ix(j0 - d);
        }
        return j0;
    }
    function inZone(i, z) { return (i - z.i0 + N) % N <= z.i1 - z.i0; }

    /* ---------- the shortcut: a path from main point a to main point b; its points map onto the main indices ---------- */
    function buildAlt(s) {
        ALT = null;
        if (!s) return;
        var a = s.a, b = s.b, C = [X[ix(a - 3)], Y[ix(a - 3)], X[a], Y[a]], d = [], i, j, c;
        (s.via || []).forEach(function (v) { C.push(X[v[0]] + (X[v[1]] - X[v[0]]) * v[2], Y[v[0]] + (Y[v[1]] - Y[v[0]]) * v[2]); });
        C.push(X[b], Y[b], X[ix(b + 3)], Y[ix(b + 3)]);
        var n = C.length / 2;
        for (i = 1; i < n - 2; i++) for (j = 0; j < 24; j++) {  /* an open Catmull-Rom that leaves and joins the track smoothly */
            var t = j / 24, t2 = t * t, t3 = t2 * t;
            for (c = 0; c < 2; c++) {
                var p0 = C[(i - 1) * 2 + c], p1 = C[i * 2 + c], p2 = C[(i + 1) * 2 + c], p3 = C[(i + 2) * 2 + c];
                d.push(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3));
            }
        }
        d.push(X[b], Y[b]);
        var m = d.length / 2, len = [0];
        for (i = 1; i < m; i++) len.push(len[i - 1] + Math.hypot(d[i * 2] - d[i * 2 - 2], d[i * 2 + 1] - d[i * 2 - 1]));
        var cnt = Math.max(3, Math.round(len[m - 1] / SP)), st = len[m - 1] / cnt;
        var r = { a: a, b: b, n: cnt + 1, x: [], y: [], ang: [], k: [], hw: s.hw, vf: s.vf || 1, step: st, span: (b - a + N) % N };
        for (i = 0, j = 0; i <= cnt; i++) {  /* resampled every st units */
            var at = Math.min(i * st, len[m - 1]);
            while (j < m - 2 && len[j + 1] < at) j++;
            var u = (at - len[j]) / ((len[j + 1] - len[j]) || 1);
            r.x.push(d[j * 2] + (d[j * 2 + 2] - d[j * 2]) * u); r.y.push(d[j * 2 + 1] + (d[j * 2 + 3] - d[j * 2 + 1]) * u);
        }
        for (i = 0; i <= cnt; i++) r.ang.push(Math.atan2(r.y[Math.min(cnt, i + 1)] - r.y[Math.max(0, i - 1)], r.x[Math.min(cnt, i + 1)] - r.x[Math.max(0, i - 1)]));
        for (i = 0; i <= cnt; i++) r.k.push(wrap(r.ang[Math.min(cnt, i + 1)] - r.ang[Math.max(0, i - 1)]) / (2 * st));
        if (s.gate) r.gate = { i: Math.round(s.gate.at * cnt), open: s.gate.open, cyc: s.gate.open + s.gate.shut };
        if (s.gap) { r.g0 = Math.round(s.gap[0] * cnt); r.g1 = Math.round(s.gap[1] * cnt); r.ramp = Math.round(s.ramp * cnt); }
        if (s.edge) r.edge = true;
        ALT = r;
    }
    function routeAt(c, look) {  /* look points ahead on the kart's route: >= 0 a main index, < 0 the shortcut point -r - 1 */
        if (ALT) {
            var j = -1;
            if (c.alt && (c.useAlt || c.ai > 4)) j = c.ai + look;
            else if (c.useAlt) { var s = (ALT.a - c.idx + N) % N; if (s < 40 && look > s) j = look - s; }
            if (j >= 0) return j < ALT.n ? -j - 1 : ix(ALT.b + j - ALT.n + 1);
        }
        return ix(c.idx + look);
    }
    function rX(r) { return r >= 0 ? X[r] : ALT.x[-r - 1]; }
    function rY(r) { return r >= 0 ? Y[r] : ALT.y[-r - 1]; }
    function rA(r) { return r >= 0 ? A[r] : ALT.ang[-r - 1]; }
    function rK(r) { return r >= 0 ? K[r] : ALT.k[-r - 1]; }
    function gateOpen(t) {  /* how open the shortcut gate is at time t: 0 shut, 1 open */
        var g = ALT.gate, p = ((t % g.cyc) + g.cyc) % g.cyc;
        return p >= g.open ? 0 : clamp(Math.min(p, g.open - p) / 0.45, 0, 1);
    }
    function toGate(c) {  /* distance along the kart's route to the gate, negative when there is none ahead */
        if (!ALT || !ALT.gate) return -1;
        if (c.alt && (c.useAlt || c.ai > 4)) return (ALT.gate.i - c.ai) * ALT.step;
        var s = (ALT.a - c.idx + N) % N;
        return c.useAlt && s < 40 ? s * SP + ALT.gate.i * ALT.step : -1;
    }
    function strokeAlt(g, from, to, width, color, dash) {
        g.beginPath();
        for (var i = from; i <= to; i++) { if (i === from) g.moveTo(ALT.x[i], ALT.y[i]); else g.lineTo(ALT.x[i], ALT.y[i]); }
        g.lineWidth = width; g.strokeStyle = color; g.setLineDash(dash || []); g.lineCap = dash ? 'butt' : 'round'; g.stroke();
    }
    function altSide(i, l) { return { x: ALT.x[i] - Math.sin(ALT.ang[i]) * l, y: ALT.y[i] + Math.cos(ALT.ang[i]) * l }; }

    /* ---------- drawing helpers for the cached track ---------- */
    function strokeLoop(g, from, to, width, color, dash) {
        g.beginPath();
        for (var i = from; i <= to; i++) { var k = ix(i); if (i === from) g.moveTo(X[k], Y[k]); else g.lineTo(X[k], Y[k]); }
        if (to - from >= N) g.closePath();
        g.lineWidth = width; g.strokeStyle = color; g.setLineDash(dash || []); g.lineCap = dash ? 'butt' : 'round'; g.stroke();
    }
    function kerbs(g, w, c1, c2) {  /* striped kerbs where the track bends */
        for (var i = 0; i < N; i++) {
            if (Math.abs(K[i]) < 0.0053 || Math.abs(K[(i + N - 1) % N]) >= 0.0053) continue;
            for (var k = i; Math.abs(K[k % N]) >= 0.0053 && k < i + N; k++);
            strokeLoop(g, i - 2, k + 2, w, c1, []);
            strokeLoop(g, i - 2, k + 2, w, c2, [12, 12]);
        }
    }
    function scatter(n, minDist, fn) {  /* n random spots at least minDist from the track centre line */
        var o = { x: 0, y: 0 };
        for (var i = 0; i < n; i++) {
            o.x = rnd() * WW; o.y = rnd() * WH; nearest(o);
            if (o.dist >= minDist) fn(o.x, o.y, i, o);
        }
    }
    function circle(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    function rr(g, x, y, w, h, r) {
        g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }

    /* ---------- particles: bubbles, splashes and moon dust ---------- */
    var parts = [];
    function puff(kind, x, y, vx, vy, life, r) {
        if (parts.length < 160) parts.push({ k: kind, x: x, y: y, vx: vx, vy: vy, t: 0, life: life, r: r });
        return parts[parts.length - 1];
    }
    function moveParts(dt) {
        for (var i = parts.length - 1; i >= 0; i--) {
            var p = parts[i];
            p.t += dt;
            if (p.t >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            var f = Math.max(0, 1 - 2 * dt); p.vx *= f; p.vy *= f;
        }
    }

    /* ---------- the tracks ---------- */
    var VX0 = 0, VY0 = 0, VX1 = 0, VY1 = 0, VB = null;  /* the visible part of the world, for culling; VB: the other view (split screen) */
    function vis(x, y, r) { return x + r > VX0 && x - r < VX1 && y + r > VY0 && y - r < VY1 || !!VB && x + r > VB[0] && x - r < VB[2] && y + r > VB[1] && y - r < VB[3]; }

    var MEADOW = {
        id: 'meadow', name: 'Catnip Meadow', blurb: 'A sprinkler and a farm gate shortcut',
        ctrl: [829, 969, 1211, 944, 1435, 829, 1466, 638, 1339, 510, 1116, 542, 925, 670, 734, 638, 670, 479, 797, 319,
               1084, 287, 1244, 160, 956, 109, 574, 128, 287, 224, 191, 446, 224, 701, 287, 892, 446, 956], scale: 1,
        phys: { vmax: 330, vgrass: 100, acc: 360, grip: 9, gripOff: 5, coast: 0.7, turn: 3.1, care: 1 },
        col: { bg: '#cdeac6', edge: '#bfe2b6', road: '#b4bcc6', panel: 'rgba(255,255,255,.85)' },
        alt: { a: 236, b: 286, hw: 30, vf: 0.8, gate: { at: 0.5, open: 3.4, shut: 2.6 } }, gate: 'farm',
        pads: [[140, 0.5], [380, -0.5]], picks: [30, 330], padCol: ['#f59e0b', '#fff7d6'],
        prep: function () { this.spr = side(410, HW + 34); },
        paint: function (g) {
            var i;
            g.fillStyle = '#cdeac6'; g.fillRect(0, 0, WW, WH);
            g.fillStyle = '#d7efd0';  /* mowing stripes */
            for (i = -WH; i < WW; i += 140) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 70, 0); g.lineTo(i + 70 + WH * 0.5, WH); g.lineTo(i + WH * 0.5, WH); g.fill(); }
            seed = 7;
            var o = { x: 0, y: 0 };
            for (i = 0; i < 260; i++) {  /* bushes and flowers, away from the track */
                o.x = rnd() * WW; o.y = rnd() * WH; nearest(o);
                var big = i < 70, rr = big ? 16 + rnd() * 14 : 3;
                if (o.dist < HW + (big ? 70 : 24)) continue;
                if (big) {
                    circle(g, o.x + 4, o.y + 6, rr, 'rgba(15,23,42,.08)');
                    circle(g, o.x, o.y, rr, '#97d08f');
                    circle(g, o.x - rr * 0.3, o.y - rr * 0.3, rr * 0.5, '#b4e2aa');
                } else circle(g, o.x, o.y, rr, i % 3 ? '#ffffff' : '#f9c6d9');
            }
            circle(g, this.spr.x, this.spr.y, 192, 'rgba(70,150,210,.12)');  /* the lawn the sprinkler keeps wet */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 20, '#bfe2b6');
            strokeLoop(g, 0, N, 2 * HW + 34, '#bfe2b6');  /* verge */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#c49a62');  /* the farm lane shortcut: muddy and slow, with a gate */
            strokeAlt(g, 2, ALT.n - 3, 3, 'rgba(110,72,35,.45)', [10, 9]);
            for (i = 3; i < ALT.n - 3; i += 2) { var mp = altSide(i, (i % 4 - 1.5) * 9); circle(g, mp.x, mp.y, 6, 'rgba(110,72,35,.3)'); }
            for (i = 1; i < ALT.n - 1; i += 2) for (var fk = -1; fk <= 1; fk += 2) {  /* fence posts along the lane */
                var fp = altSide(i, fk * (ALT.hw + 5)); circle(g, fp.x + 1, fp.y + 2, 3.5, 'rgba(15,23,42,.15)'); circle(g, fp.x, fp.y, 3.2, '#8b5a2b');
            }
            strokeLoop(g, 0, N, 2 * HW + 5, '#ffffff');  /* white edge lines */
            kerbs(g, 2 * HW + 16, '#ffffff', '#e8484f');
            strokeLoop(g, 0, N, 2 * HW, '#b4bcc6');  /* asphalt */
            strokeLoop(g, 0, N, 2, 'rgba(255,255,255,.55)', [18, 22]);  /* centre line */
        },
        effect: function (c, dt) {  /* the sprinkler: its jet sweeps round and makes the road wet */
            var s = this.spr, th = clock * 1.3, dx = c.x - s.x, dy = c.y - s.y, d = Math.hypot(dx, dy);
            if (c.z > 0 || d > 190 || d < 12 || Math.abs(wrap(Math.atan2(dy, dx) - th)) > 0.17) return;
            if (c.slip < 0.1) { stat('sprinkler'); if (quiet(c, 4)) say('Sprinkler! Wet paws!', c); }
            c.slip = Math.max(c.slip, 0.45);
            c.vx += Math.cos(th) * 150 * dt; c.vy += Math.sin(th) * 150 * dt;
        },
        under: function () {
            var s = this.spr, th = clock * 1.3, k;
            if (!vis(s.x, s.y, 200)) return;
            ctx.fillStyle = 'rgba(120,190,255,.22)'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, 188, th - 0.17, th + 0.17); ctx.fill();
            ctx.fillStyle = 'rgba(110,180,250,.75)';
            for (k = 1; k <= 13; k++) {
                var r = k * 14, w = Math.sin(clock * 20 + k) * 2;
                ctx.beginPath(); ctx.arc(s.x + Math.cos(th) * r - Math.sin(th) * w, s.y + Math.sin(th) * r + Math.cos(th) * w, 2.5 + k * 0.25, 0, 7); ctx.fill();
            }
            circle(ctx, s.x + 2, s.y + 3, 9, 'rgba(15,23,42,.2)'); circle(ctx, s.x, s.y, 8, '#64748b'); circle(ctx, s.x, s.y, 4, '#cbd5e1');
        }
    };

    /* Night City: street blocks with sharp corners, street lights, zebra crossings, puddles (slippery) and cones */
    var CITY = {
        id: 'city', name: 'Night City', blurb: 'Puddles, a tram, a gated building site',
        poly: [0, 250, 250, 0, 900, 0, 900, 300, 1200, 300, 1200, 900, 700, 900, 700, 600, 400, 600, 400, 900, 0, 900],
        round: 100, scale: 1.1, start: 0.94,
        phys: { vmax: 340, vgrass: 90, acc: 380, grip: 8, gripOff: 5, coast: 0.7, turn: 3.2, care: 1 },
        col: { bg: '#1a2030', edge: '#3b4253', road: '#4a5266', panel: 'rgba(15,23,42,.72)', mini: '#cbd5e1', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 312, b: 405, hw: 30, vf: 0.85, gate: { at: 0.5, open: 3.6, shut: 3 } }, gate: 'boom',
        pads: [[25, 0.5], [300, -0.5]], picks: [88, 240], padCol: ['#0891b2', '#a5f3fc'],
        prep: function () {
            var i, k, tj = 112;
            this.tram = { j: tj, x: X[tj], y: Y[tj], ux: -Math.sin(A[tj]), uy: Math.cos(A[tj]), tx: Math.cos(A[tj]), ty: Math.sin(A[tj]) };
            seed = 21;
            this.puddles = [];
            var fr = [0.13, 0.3, 0.46, 0.6, 0.77];
            for (i = 0; i < fr.length; i++) {
                var j = ix(Math.round(fr[i] * N) + Math.round(rnd() * 8)), p = side(j, (rnd() - 0.5) * HW);
                this.puddles.push({ x: p.x, y: p.y, a: A[j] + (rnd() - 0.5) * 0.6, rx: 30 + rnd() * 10, ry: 17 + rnd() * 6 });
            }
            this.cross = [straightNear(0.08, -6, 6, 0.002), straightNear(0.38, -6, 6, 0.002), straightNear(0.7, -6, 6, 0.002)];
            this.cones = [];
            for (i = 0; i < N; i++) {  /* a pair of cones on the inside of every corner: cut it and they fly */
                if (Math.abs(K[i]) < 0.006 || Math.abs(K[(i + N - 1) % N]) >= 0.006) continue;
                for (k = i; Math.abs(K[k % N]) >= 0.006 && k < i + N; k++);
                var mid = Math.round((i + k) / 2), sg = K[ix(mid)] > 0 ? 1 : -1;
                for (var c = -1; c <= 1; c += 2) {
                    var q = side(mid + c * 3, sg * (HW + 4));
                    this.cones.push({ x0: q.x, y0: q.y });
                }
            }
        },
        reset: function () {
            this.cones.forEach(function (c) { c.x = c.x0; c.y = c.y0; c.vx = c.vy = c.va = 0; c.a = 0.3; c.hit = -9; });
            this.tram.s = -620; this.tram.dir = 1; this.tram.wait = 2;
        },
        paint: function (g) {
            var i, k, p;
            g.fillStyle = '#1a2030'; g.fillRect(0, 0, WW, WH);
            g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2;  /* the back streets */
            for (i = 0; i < WW; i += 180) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, WH); g.stroke(); }
            for (i = 0; i < WH; i += 180) { g.beginPath(); g.moveTo(0, i); g.lineTo(WW, i); g.stroke(); }
            seed = 5;
            var o = { x: 0, y: 0 }, ROOF = ['#323b52', '#3b3452', '#2c4150', '#45383d', '#363f36', '#2f3346'];
            var tr = this.tram;
            function clear(x, y) {  /* away from the roads and from the tram line */
                if (Math.abs((x - tr.x) * tr.tx + (y - tr.y) * tr.ty) < 46) return false;
                o.x = x; o.y = y; nearest(o); return o.dist > HW + 36;
            }
            for (var gx = 0; gx < WW; gx += 180) for (var gy = 0; gy < WH; gy += 180) {  /* one block per street square */
                var w = 110 + rnd() * 50, h = 100 + rnd() * 60, x = gx + 12 + rnd() * (156 - w), y = gy + 12 + rnd() * (156 - h);
                if (!(clear(x, y) && clear(x + w, y) && clear(x, y + h) && clear(x + w, y + h) && clear(x + w / 2, y + h / 2) &&
                      clear(x + w / 2, y) && clear(x + w / 2, y + h) && clear(x, y + h / 2) && clear(x + w, y + h / 2))) continue;
                if (rnd() < 0.16) {  /* a little park */
                    g.fillStyle = '#1d3a2e'; g.fillRect(x, y, w, h);
                    for (k = 0; k < 5; k++) { var tx = x + 18 + rnd() * (w - 36), ty = y + 18 + rnd() * (h - 36); circle(g, tx + 3, ty + 4, 14, 'rgba(0,0,0,.3)'); circle(g, tx, ty, 14, '#2c5a40'); circle(g, tx - 4, ty - 4, 6, '#3b7352'); }
                    continue;
                }
                g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 9, y + 11, w, h);  /* shadow */
                g.fillStyle = ROOF[Math.floor(rnd() * ROOF.length)]; g.fillRect(x, y, w, h);
                g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
                g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 10, y + 10, w - 20, h - 20);
                for (k = 0; k < 2; k++) { g.fillStyle = '#5b6478'; g.fillRect(x + 16 + rnd() * (w - 46), y + 16 + rnd() * (h - 44), 16, 12); }
                if (rnd() < 0.5) { circle(g, x + w - 24, y + 24, 10, '#6b7488'); circle(g, x + w - 24, y + 24, 6, '#59627a'); }
                g.fillStyle = 'rgba(255,214,120,.85)';  /* lit skylights */
                for (k = x + 14; k < x + w - 14; k += 14) if (rnd() < 0.55) g.fillRect(k, y + h - 16, 7, 5);
                if (rnd() < 0.35) {  /* a neon sign on the roof edge */
                    g.strokeStyle = rnd() < 0.5 ? '#ff4fa3' : '#4fd1ff'; g.lineWidth = 3; g.shadowColor = g.strokeStyle; g.shadowBlur = 10;
                    g.beginPath(); g.moveTo(x + 8, y + 5); g.lineTo(x + w * 0.6, y + 5); g.stroke(); g.shadowBlur = 0;
                }
            }
            g.strokeStyle = '#4b5563'; g.lineWidth = 3;  /* tram rails across the top street */
            for (k = -1; k <= 1; k += 2) {
                g.beginPath(); g.moveTo(tr.x - tr.ux * 2000 + tr.tx * k * 11, tr.y - tr.uy * 2000 + tr.ty * k * 11);
                g.lineTo(tr.x + tr.ux * 2000 + tr.tx * k * 11, tr.y + tr.uy * 2000 + tr.ty * k * 11); g.stroke();
            }
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 22, '#5b5148');  /* the building site shortcut: narrow gravel behind a barrier */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#4a423a');
            seed = 13;
            for (i = 1; i < ALT.n - 1; i++) { p = altSide(i, (rnd() - 0.5) * 2 * ALT.hw); circle(g, p.x, p.y, 1.5 + rnd() * 2, 'rgba(255,255,255,.12)'); }
            for (i = 2; i < ALT.n - 2; i += 2) for (k = -1; k <= 1; k += 2) {
                p = altSide(i, k * (ALT.hw + 7));
                g.save(); g.translate(p.x, p.y); g.rotate(ALT.ang[i]); g.fillStyle = i % 4 ? '#f97316' : '#f8fafc'; g.fillRect(-9, -3, 18, 6); g.restore();
            }
            strokeLoop(g, 0, N, 2 * HW + 44, '#3b4253');  /* pavement */
            for (i = 0; i < N; i += 2) for (k = -1; k <= 1; k += 2) { p = side(i, k * (HW + 13)); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(p.x - 1, p.y - 1, 2, 2); }
            strokeLoop(g, 0, N, 2 * HW + 8, '#8e97a8');  /* kerb stones */
            strokeLoop(g, 0, N, 2 * HW, '#272d3b');  /* the road */
            strokeLoop(g, 0, N, 2 * HW - 8, 'rgba(255,255,255,.45)');
            strokeLoop(g, 0, N, 2 * HW - 12, '#272d3b');
            strokeLoop(g, 0, N, 3, '#e8c547', [22, 18]);  /* the yellow middle line */
            g.strokeStyle = '#6b7280'; g.lineWidth = 3;  /* the rails again, over the road */
            for (k = -1; k <= 1; k += 2) {
                g.beginPath(); g.moveTo(tr.x - tr.ux * (HW + 30) + tr.tx * k * 11, tr.y - tr.uy * (HW + 30) + tr.ty * k * 11);
                g.lineTo(tr.x + tr.ux * (HW + 30) + tr.tx * k * 11, tr.y + tr.uy * (HW + 30) + tr.ty * k * 11); g.stroke();
            }
            this.cross.forEach(function (j) {  /* zebra crossings */
                g.save(); g.translate(X[j], Y[j]); g.rotate(A[j]); g.fillStyle = '#272d3b'; g.fillRect(-18, -HW + 4, 36, 2 * HW - 8);
                g.fillStyle = 'rgba(255,255,255,.85)';
                for (var b = -HW + 8; b < HW - 10; b += 13) g.fillRect(-16, b, 32, 7);
                g.restore();
            });
            for (i = 30; i < N - 20; i += 57) {  /* manhole covers */
                p = side(i, (i % 2 ? 1 : -1) * HW * 0.5);
                circle(g, p.x, p.y, 9, '#1e2330'); g.strokeStyle = '#3d4456'; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, 6, 0, 7); g.stroke();
            }
            this.puddles.forEach(function (q) {
                g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.scale(1, q.ry / q.rx);
                var gr = g.createRadialGradient(-q.rx * 0.3, -q.rx * 0.3, 2, 0, 0, q.rx);
                gr.addColorStop(0, '#5f86b8'); gr.addColorStop(1, '#2d4466');
                g.fillStyle = gr; g.beginPath(); g.arc(0, 0, q.rx, 0, 7); g.fill();
                g.strokeStyle = 'rgba(190,215,255,.55)'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, q.rx * 0.65, 3.6, 4.6); g.stroke();
                g.beginPath(); g.arc(q.rx * 0.2, q.rx * 0.1, q.rx * 0.35, 0.2, 1); g.stroke();
                g.restore();
            });
            for (i = 12; i < N; i += 24) {  /* street lights, their warm glow on the road */
                p = side(i, ((i / 24) % 2 ? 1 : -1) * (HW + 20));
                var gl = g.createRadialGradient(p.x, p.y, 4, p.x, p.y, 110);
                gl.addColorStop(0, 'rgba(255,205,120,.32)'); gl.addColorStop(1, 'rgba(255,205,120,0)');
                g.fillStyle = gl; g.fillRect(p.x - 110, p.y - 110, 220, 220);
                circle(g, p.x + 2, p.y + 3, 5.5, 'rgba(0,0,0,.4)'); circle(g, p.x, p.y, 5, '#2a2f3c'); circle(g, p.x, p.y, 3.2, '#fff1c1');
            }
        },
        effect: function (c, dt) {
            var sp = Math.hypot(c.vx, c.vy), i, q, t = this.tram;
            var cx = t.x + t.ux * t.s, cy = t.y + t.uy * t.s, u = (c.x - cx) * t.ux + (c.y - cy) * t.uy, v = (c.x - cx) * t.tx + (c.y - cy) * t.ty;
            if (Math.abs(u) < 78 + R && Math.abs(v) < 22 + R && c.z <= 0) {  /* the tram pushes you out of its way */
                var push = (v < 0 ? -1 : 1) * (22 + R) - v, vn = c.vx * t.tx + c.vy * t.ty, move = t.wait > 0 ? 0 : 130 * t.dir;
                c.x += t.tx * push; c.y += t.ty * push;
                c.vx += t.ux * move - t.tx * vn * 1.4; c.vy += t.uy * move - t.ty * vn * 1.4;
                if (clock - (c.tramT || -9) > 1) { c.tramT = clock; stat('tram'); spinOut(c, 0.6, 'Ding ding! Mind the tram!'); }
            }
            for (i = 0; i < this.puddles.length; i++) {
                q = this.puddles[i];
                var dx = c.x - q.x, dy = c.y - q.y, ca = Math.cos(q.a), sa = Math.sin(q.a), u = (dx * ca + dy * sa) / q.rx, v = (dy * ca - dx * sa) / q.ry;
                if (u * u + v * v > 1 || sp < 40) continue;
                if (c.slip <= 0) {
                    for (var k = 0; k < 7; k++) puff('drop', c.x, c.y, c.vx * 0.3 + (Math.random() - 0.5) * 160, c.vy * 0.3 + (Math.random() - 0.5) * 160, 0.45, 2 + Math.random() * 2);
                    if (mine(c) && phase === 'race') { sfx(c, 'move'); if (quiet(c, 5)) say('Splash! Slippery!', c); }
                }
                c.slip = 0.55;
            }
            for (i = 0; i < this.cones.length; i++) {
                q = this.cones[i];
                var ex = q.x - c.x, ey = q.y - c.y, d2 = ex * ex + ey * ey;
                if (d2 > (R + 7) * (R + 7) || clock - q.hit < 0.3) continue;
                var d = Math.sqrt(d2) || 1;
                q.hit = clock; q.vx = c.vx * 0.9 + ex / d * 90; q.vy = c.vy * 0.9 + ey / d * 90; q.va = (Math.random() - 0.5) * 18;
                c.vx *= 0.9; c.vy *= 0.9;
                sfx(c, 'tap');
            }
        },
        wait: function (c) {  /* the computer cats stop for the tram */
            var t = this.tram, d = (t.j - c.idx + N) % N, p = t.s * t.dir;
            return !c.alt && d > 2 && d < 22 && t.wait < 0.6 && p > -330 && p < 135;
        },
        over: function () {
            var t = this.tram, cx = t.x + t.ux * t.s, cy = t.y + t.uy * t.s, p = t.s * t.dir, on = t.wait < 1.2 && p > -540 && p < 150, k;
            for (k = -1; k <= 1; k += 2) {  /* crossing lights that blink while the tram comes */
                var lx = t.x + t.ux * k * (HW + 20) - t.tx * 18 * k, ly = t.y + t.uy * k * (HW + 20) - t.ty * 18 * k;
                if (!vis(lx, ly, 20)) continue;
                var lit = on && Math.floor(clock * 4) % 2 === (k > 0 ? 0 : 1);
                circle(ctx, lx, ly, 7, '#111827'); circle(ctx, lx, ly, 4.2, lit ? '#ef4444' : '#4b1d1d');
                if (lit) circle(ctx, lx, ly, 13, 'rgba(239,68,68,.28)');
            }
            if (!vis(cx, cy, 110)) return;
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(t.uy, t.ux));
            ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(-72, -17, 156, 44, 10); ctx.fill();
            ctx.fillStyle = '#0f766e'; rrect(-78, -22, 156, 44, 10); ctx.fill();
            ctx.fillStyle = '#e2e8f0'; rrect(-70, -12, 140, 24, 6); ctx.fill();
            ctx.fillStyle = '#fde68a';
            for (k = -62; k < 60; k += 20) { ctx.fillRect(k, -17, 12, 3); ctx.fillRect(k, 14, 12, 3); }
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(4, -9); ctx.lineTo(26, 0); ctx.stroke();
            var fx = 74 * t.dir;
            circle(ctx, fx, -13, 3.5, '#fff7c2'); circle(ctx, fx, 13, 3.5, '#fff7c2'); circle(ctx, -fx, -13, 3, '#ef4444'); circle(ctx, -fx, 13, 3, '#ef4444');
            ctx.restore();
        },
        update: function (dt) {
            var t = this.tram;
            if (t.wait > 0) t.wait -= dt;
            else {  /* from far up the street down to its stop inside the block, and back */
                t.s += t.dir * 240 * dt;
                if (t.s >= 330 || t.s <= -620) { t.s = t.s > 0 ? 330 : -620; t.dir = -t.dir; t.wait = 3.2; }
            }
            this.cones.forEach(function (q) {
                if (!q.vx && !q.vy) return;
                q.x = clamp(q.x + q.vx * dt, 20, WW - 20); q.y = clamp(q.y + q.vy * dt, 20, WH - 20); q.a += q.va * dt;
                var f = Math.max(0, 1 - 2.4 * dt); q.vx *= f; q.vy *= f; q.va *= f;
                if (Math.abs(q.vx) + Math.abs(q.vy) < 4) q.vx = q.vy = 0;
            });
        },
        under: function () {
            var i, c;
            if (!this.beam) {  /* headlights: one gradient in kart space, reused for every kart */
                this.beam = ctx.createLinearGradient(14, 0, 120, 0);
                this.beam.addColorStop(0, 'rgba(255,240,190,.3)'); this.beam.addColorStop(1, 'rgba(255,240,190,0)');
            }
            for (i = 0; i < 4; i++) {
                c = karts[i];
                if (!vis(c.x, c.y, 130)) continue;
                ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.fillStyle = this.beam;
                ctx.beginPath(); ctx.moveTo(14, -7); ctx.lineTo(120, -44); ctx.lineTo(120, 44); ctx.lineTo(14, 7); ctx.fill();
                ctx.restore();
            }
            for (i = 0; i < this.cones.length; i++) {  /* traffic cones, seen from above */
                c = this.cones[i];
                if (!vis(c.x, c.y, 14)) continue;
                ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
                ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(-5, -4, 14, 14, 3); ctx.fill();
                ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.2; rrect(-7, -7, 14, 14, 3); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 7); ctx.fillStyle = '#fb923c'; ctx.fill();
                ctx.restore();
            }
            drawParts('drop');
        }
    };

    /* Coral Reef: a winding sand path on the sea floor, floaty handling and currents that carry you */
    var REEF = {
        id: 'reef', name: 'Coral Reef', blurb: 'Currents, a turtle, a tunnel with clams',
        ctrl: [200, 300, 500, 150, 800, 250, 1100, 150, 1400, 300, 1450, 600, 1250, 750, 1000, 650, 800, 800, 900, 1000,
               700, 1120, 400, 1020, 250, 800, 350, 600, 170, 470], scale: 1, start: 0,
        phys: { vmax: 325, vgrass: 135, acc: 310, grip: 4.2, gripOff: 3.2, coast: 0.45, turn: 2.8, care: 1.2 },
        col: { bg: '#3f98ad', edge: '#d9c48e', road: '#ecdcae', panel: 'rgba(255,255,255,.82)' },
        alt: { a: 228, b: 316, hw: 32, vf: 1 }, flow: 120,
        pads: [[70, 0.5], [440, -0.5]], picks: [30, 180], padCol: ['#0d9488', '#ccfbf1'],
        reset: function () { this.turtle.s = -250; this.turtle.dir = 1; this.clams.forEach(function (q) { q.open = 1; }); },
        altGood: function (c) {  /* the smarter cats only go in when neither clam will snap as they pass */
            if (!c.P) return true;
            var s = (ALT.a - c.idx + N) % N, v = Math.max(c.vf, 200) + this.flow, ok = true;
            this.clams.forEach(function (q) { var p = (clock + (s * SP + q.ci * ALT.step) / v + q.off) % 3.6; if (p > 1.95 && p < 2.75) ok = false; });
            return ok;
        },
        prep: function () {
            var i, tj = 372;
            this.clams = [0.33, 0.67].map(function (f, n) {  /* two giant clams in the tunnel, open and shut in turn */
                var ci = Math.round(f * (ALT.n - 1)), q = altSide(ci, n ? 11 : -11);
                return { x: q.x, y: q.y, a: ALT.ang[ci], ci: ci, off: n * 1.7, open: 1 };
            });
            this.turtle = { x0: X[tj], y0: Y[tj], ux: -Math.sin(A[tj]), uy: Math.cos(A[tj]), s: -250, dir: 1 };
            this.zones = [  /* side: push to the right (1) or left (-1) of the track; 0: a stream along the track */
                { i0: Math.round(0.2 * N), side: 1, f: 62 },
                { i0: Math.round(0.44 * N), side: 0, f: 85 },
                { i0: Math.round(0.66 * N), side: -1, f: 62 }];
            this.zones.forEach(function (z) { z.i1 = z.i0 + 38; });
            seed = 33;
            var kelp = this.kelp = [], fish = this.fish = [], vents = this.vents = [];
            scatter(160, HW + 46, function (x, y, k) { if (kelp.length < 46) kelp.push({ x: x, y: y, len: 40 + (k % 5) * 9, ph: k * 1.3 }); });
            scatter(30, HW + 60, function (x, y) { if (vents.length < 7) vents.push({ x: x, y: y, t: 0 }); });
            var FC = ['#ffb347', '#ff6f91', '#ffe066', '#7ad7f0', '#c49bff'];
            for (i = 0; i < 14; i++) fish.push({ x: rnd() * WW, y: rnd() * WH, a: rnd() * 7, sp: 40 + rnd() * 40, s: 0.8 + rnd() * 0.6, col: FC[i % FC.length], ph: rnd() * 7 });
        },
        paint: function (g) {
            var i, k;
            g.fillStyle = '#3f98ad'; g.fillRect(0, 0, WW, WH);
            seed = 41;
            for (i = 0; i < 40; i++) circle(g, rnd() * WW, rnd() * WH, 80 + rnd() * 140, rnd() < 0.5 ? 'rgba(255,240,200,.07)' : 'rgba(10,60,90,.08)');
            g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 3; g.lineCap = 'round';  /* sand ripples */
            for (i = 0; i < 260; i++) {
                var rx = rnd() * WW, ry = rnd() * WH; g.beginPath(); g.moveTo(rx, ry); g.quadraticCurveTo(rx + 18, ry - 8, rx + 36, ry); g.stroke();
            }
            var CO = ['#ff7f9e', '#ff9f5a', '#b88ae6', '#ffd166', '#ff6b6b'];
            scatter(200, HW + 40, function (x, y, n) {  /* coral, rocks, starfish */
                var t = n % 5, col = CO[n % CO.length], r = 10 + rnd() * 14;
                if (t === 0 || t === 1) {  /* branching coral */
                    circle(g, x + 4, y + 6, r * 0.9, 'rgba(8,40,60,.18)');
                    g.strokeStyle = col; g.lineCap = 'round';
                    for (k = 0; k < 6; k++) {
                        var a = k * 1.05 + rnd(), ex = x + Math.cos(a) * r * 1.3, ey = y + Math.sin(a) * r * 1.3;
                        g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
                        g.lineWidth = 3.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + Math.cos(a + 0.7) * r * 0.5, ey + Math.sin(a + 0.7) * r * 0.5);
                        g.moveTo(ex, ey); g.lineTo(ex + Math.cos(a - 0.7) * r * 0.5, ey + Math.sin(a - 0.7) * r * 0.5); g.stroke();
                    }
                    circle(g, x, y, 4, '#fff3');
                } else if (t === 2) {  /* brain coral */
                    circle(g, x + 4, y + 6, r, 'rgba(8,40,60,.2)'); circle(g, x, y, r, '#e9a27a');
                    g.strokeStyle = '#c97a55'; g.lineWidth = 2;
                    for (k = -r + 5; k < r - 3; k += 6) { g.beginPath(); g.moveTo(x - Math.sqrt(r * r - k * k) + 3, y + k); g.bezierCurveTo(x - 4, y + k - 4, x + 4, y + k + 4, x + Math.sqrt(r * r - k * k) - 3, y + k); g.stroke(); }
                } else if (t === 3) {  /* a rock with an anemone */
                    circle(g, x + 5, y + 7, r * 1.2, 'rgba(8,40,60,.22)'); circle(g, x, y, r * 1.2, '#5d7f8c'); circle(g, x - r * 0.3, y - r * 0.3, r * 0.6, '#7a9ba7');
                    g.strokeStyle = '#c084fc'; g.lineWidth = 2.5;
                    for (k = 0; k < 10; k++) { g.beginPath(); g.moveTo(x + r * 0.3, y + r * 0.2); g.lineTo(x + r * 0.3 + Math.cos(k * 0.63) * 9, y + r * 0.2 + Math.sin(k * 0.63) * 9); g.stroke(); }
                    circle(g, x + r * 0.3, y + r * 0.2, 3, '#f0abfc');
                } else {  /* starfish */
                    g.fillStyle = n % 2 ? '#ff8a5c' : '#ffd166'; g.beginPath();
                    for (k = 0; k < 10; k++) { var sr = k % 2 ? 4 : 11, sa = k * Math.PI / 5 + n; g.lineTo(x + Math.cos(sa) * sr, y + Math.sin(sa) * sr); }
                    g.closePath(); g.fill();
                }
            });
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 30, '#2a6c80');  /* the current tunnel shortcut: a deep trench */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#4d93a3');
            for (i = 1; i < ALT.n - 1; i += 2) for (k = -1; k <= 1; k += 2) {
                var tp = altSide(i, k * (ALT.hw + 7)); circle(g, tp.x, tp.y, 5 + (i % 3) * 2, (i + k) % 3 ? '#ff7f9e' : '#b88ae6');
            }
            strokeLoop(g, 0, N, 2 * HW + 30, '#d9c48e');  /* the sand path */
            strokeLoop(g, 0, N, 2 * HW, '#ecdcae');
            this.zones.forEach(function (z) { strokeLoop(g, z.i0, z.i1, 2 * HW, z.side ? 'rgba(80,190,235,.3)' : 'rgba(120,230,200,.32)', []); });
            for (i = 0; i < N; i += 3) for (k = -1; k <= 1; k += 2) {  /* shells along both edges */
                var p = side(i, k * (HW + 1)); circle(g, p.x, p.y, 3.3, (i / 3) % 2 ? '#fff8e7' : '#f9c6d9');
            }
            strokeLoop(g, 0, N, 2, 'rgba(150,120,70,.35)', [14, 22]);
        },
        effect: function (c, dt) {
            for (var i = 0; i < 3; i++) {  /* the water carries the kart, so steer against it */
                var z = this.zones[i];
                if (!inZone(c.idx, z) || c.dist > HW + 70 || c.alt) continue;
                var a = A[c.idx], d0 = (c.idx - z.i0 + N) % N, e = Math.min(1, Math.min(d0, z.i1 - z.i0 - d0) / 6 + 0.2);  /* weaker at the ends */
                var fx = z.side ? -Math.sin(a) * z.side : Math.cos(a), fy = z.side ? Math.cos(a) * z.side : Math.sin(a);
                c.x += fx * z.f * e * dt; c.y += fy * z.f * e * dt;
            }
            if (c.alt && c.ai > 0 && c.ai < ALT.n - 1) {  /* the tunnel current carries you forward */
                var fa = ALT.ang[c.ai]; c.x += Math.cos(fa) * this.flow * dt; c.y += Math.sin(fa) * this.flow * dt;
            }
            var t = this.turtle, tx = t.x0 + t.ux * t.s, ty = t.y0 + t.uy * t.s, ex = c.x - tx, ey = c.y - ty, ed = Math.hypot(ex, ey);
            if (ed < 30 + R && ed > 0.1) {  /* bumping into the turtle */
                var vn = (c.vx * ex + c.vy * ey) / ed;
                c.x = tx + ex / ed * (30 + R); c.y = ty + ey / ed * (30 + R);
                if (vn < 0) { c.vx -= ex / ed * vn * 1.5; c.vy -= ey / ed * vn * 1.5; }
                if (clock - (c.turtleT || -9) > 1) {
                    c.turtleT = clock; stat('turtle');
                    sfx(c, 'hit'); if (quiet(c, 3)) say('Oops, sorry Mr Turtle!', c);
                }
            }
            c.bt = (c.bt || 0) - dt;
            if (c.thr > 0 && c.bt <= 0 && vis(c.x, c.y, 40)) {  /* bubbles from the exhaust */
                c.bt = 0.12;
                puff('bub', c.x - Math.cos(c.a) * 17, c.y - Math.sin(c.a) * 17, -c.vx * 0.1 + (Math.random() - 0.5) * 20, -c.vy * 0.1 + (Math.random() - 0.5) * 20, 1.1, 2 + Math.random() * 2.5);
            }
        },
        update: function (dt) {
            var t = this.turtle;
            t.s += t.dir * 42 * dt;
            if (Math.abs(t.s) > 260) { t.s = 260 * t.dir; t.dir = -t.dir; }
            this.clams.forEach(function (q) {
                var p = (clock + q.off) % 3.6, was = q.open;
                q.open = p < 2.3 ? Math.min(1, p / 0.3) : p < 2.42 ? 1 - (p - 2.3) / 0.12 : 0;
                q.warn = p > 1.8 && p < 2.3;
                if (was > 0.5 && q.open <= 0.5 && phase !== 'pick' && !remote) karts.forEach(function (c) {
                    if (c.z <= 0 && Math.hypot(c.x - q.x, c.y - q.y) < 28) { stat('clam'); spinOut(c, 0.9, 'A clam nipped your tail!', 0); }
                });
            });
            this.fish.forEach(function (f) {
                f.a += Math.sin(clock * 0.7 + f.ph) * 0.5 * dt;
                f.x += Math.cos(f.a) * f.sp * dt; f.y += Math.sin(f.a) * f.sp * dt;
                if (f.x < -40) f.x = WW + 30; else if (f.x > WW + 40) f.x = -30;
                if (f.y < -40) f.y = WH + 30; else if (f.y > WH + 40) f.y = -30;
            });
            this.vents.forEach(function (v) {
                v.t -= dt;
                if (v.t <= 0 && vis(v.x, v.y, 60)) { v.t = 0.3 + Math.random() * 0.3; puff('bub', v.x + (Math.random() - 0.5) * 8, v.y, (Math.random() - 0.5) * 14, -14, 1.8, 2 + Math.random() * 4); }
            });
        },
        under: function () {
            var i, k, z;
            ctx.strokeStyle = 'rgba(235,252,255,.55)'; ctx.lineWidth = 3; ctx.lineCap = ctx.lineJoin = 'round';
            ctx.beginPath();
            for (i = 0; i < 3; i++) {  /* moving chevrons show where the water flows */
                z = this.zones[i];
                for (k = z.i0 + 2; k <= z.i1 - 2; k += 4) {
                    var j = ix(k);
                    if (!vis(X[j], Y[j], HW)) continue;
                    var a = A[j], ca = Math.cos(a), sa = Math.sin(a), sh = (clock * z.f * 0.5) % 34;
                    for (var l = -1; l <= 1; l++) {
                        var px, py, dx, dy;
                        if (z.side) { var lat = ((l + 1) * 34 + sh + k * 3) % 102 - 51; px = X[j] - sa * lat * z.side; py = Y[j] + ca * lat * z.side; dx = -sa * z.side; dy = ca * z.side; }
                        else { var fw = sh * 4 / 34 * SP; px = X[j] + ca * fw - sa * l * HW * 0.55; py = Y[j] + sa * fw + ca * l * HW * 0.55; dx = ca; dy = sa; }
                        ctx.moveTo(px - dx * 5 - dy * 6, py - dy * 5 + dx * 6); ctx.lineTo(px, py); ctx.lineTo(px - dx * 5 + dy * 6, py - dy * 5 - dx * 6);
                    }
                }
            }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(235,252,255,.7)'; ctx.beginPath();  /* the tunnel current */
            var fs = (clock * 2.5) % 3;
            for (k = 1; k < ALT.n - 4; k += 3) {
                var pos = k + fs, a0 = Math.floor(pos), uu = pos - a0, ax = ALT.x[a0] + (ALT.x[a0 + 1] - ALT.x[a0]) * uu, ay = ALT.y[a0] + (ALT.y[a0 + 1] - ALT.y[a0]) * uu;
                if (!vis(ax, ay, 20)) continue;
                var aa = ALT.ang[a0], dc = Math.cos(aa), ds = Math.sin(aa);
                ctx.moveTo(ax - dc * 6 - ds * 9, ay - ds * 6 + dc * 9); ctx.lineTo(ax, ay); ctx.lineTo(ax - dc * 6 + ds * 9, ay - ds * 6 - dc * 9);
            }
            ctx.stroke();
            this.clams.forEach(function (q) {  /* giant clams: the top shell folds back when open */
                if (!vis(q.x, q.y, 40)) return;
                ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a + (q.warn ? Math.sin(clock * 40) * 0.08 : 0));
                ctx.fillStyle = 'rgba(8,40,60,.25)'; ctx.beginPath(); ctx.ellipse(3, 5, 24, 18, 0, 0, 7); ctx.fill();
                ctx.fillStyle = '#d9c2e9'; ctx.strokeStyle = '#6b4a8a'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
                if (q.open > 0.05) { circle(ctx, 2, 0, 13 * q.open, '#fbe7f3'); circle(ctx, 4, 0, 5.5 * q.open, '#ffffff'); circle(ctx, 2.5, -1.5, 1.8 * q.open, '#e0f2fe'); }
                ctx.save(); ctx.translate(-q.open * 20, 0); ctx.scale(1 - q.open * 0.72, 1);
                ctx.fillStyle = '#c4a5dd'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = 'rgba(107,74,138,.6)'; ctx.lineWidth = 1.2;
                for (var r = -2; r <= 2; r++) { ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(18, r * 6.5); ctx.stroke(); }
                ctx.restore(); ctx.restore();
            });
            var tt = this.turtle, ttx = tt.x0 + tt.ux * tt.s, tty = tt.y0 + tt.uy * tt.s;
            if (vis(ttx, tty, 60)) {  /* the sea turtle, paddling slowly across */
                var fl = Math.sin(clock * 3) * 0.4, sd;
                ctx.save(); ctx.translate(ttx, tty); ctx.rotate(Math.atan2(tt.uy * tt.dir, tt.ux * tt.dir));
                ctx.fillStyle = 'rgba(8,40,60,.22)'; ctx.beginPath(); ctx.ellipse(6, 9, 32, 25, 0, 0, 7); ctx.fill();
                ctx.fillStyle = '#7bbf6a';
                for (sd = -1; sd <= 1; sd += 2) {
                    ctx.save(); ctx.translate(12, sd * 18); ctx.rotate(sd * (0.5 + fl)); ctx.beginPath(); ctx.ellipse(7, 0, 15, 6, 0, 0, 7); ctx.fill(); ctx.restore();
                    ctx.save(); ctx.translate(-16, sd * 15); ctx.rotate(sd * (-0.6 - fl * 0.6)); ctx.beginPath(); ctx.ellipse(-4, 0, 9, 5, 0, 0, 7); ctx.fill(); ctx.restore();
                }
                circle(ctx, 31, 0, 9, '#8fcf7c'); circle(ctx, 35, -4, 1.7, '#0f172a'); circle(ctx, 35, 4, 1.7, '#0f172a');
                ctx.fillStyle = '#6b4f2a'; ctx.strokeStyle = '#3f2d14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 26, 21, 0, 0, 7); ctx.fill(); ctx.stroke();
                circle(ctx, 0, 0, 8, '#9a7740');
                for (sd = 0; sd < 6; sd++) circle(ctx, Math.cos(sd * 1.047) * 15, Math.sin(sd * 1.047) * 12, 5, '#8a6a3a');
                ctx.restore();
            }
            ctx.lineWidth = 4; ctx.strokeStyle = '#2f8f5b';  /* kelp swaying in the water */
            for (i = 0; i < this.kelp.length; i++) {
                var q = this.kelp[i];
                if (!vis(q.x, q.y, q.len + 20)) continue;
                var sw = Math.sin(clock * 1.4 + q.ph) * 12, tx = q.x + sw, ty = q.y - q.len;
                ctx.strokeStyle = '#256f48'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.quadraticCurveTo(q.x - sw * 0.6, q.y - q.len * 0.5, tx, ty); ctx.stroke();
                ctx.fillStyle = '#3aa36a';
                for (k = 1; k <= 3; k++) {
                    var t = k / 3.4, lx = q.x + (tx - q.x) * t + Math.sin(clock * 1.4 + q.ph + k) * 3, ly = q.y + (ty - q.y) * t;
                    ctx.beginPath(); ctx.ellipse(lx + (k % 2 ? 7 : -7), ly, 8, 3.5, k % 2 ? -0.5 : 0.5, 0, 7); ctx.fill();
                }
            }
        },
        over: function () {
            ctx.lineCap = 'round';
            for (var ai = 4; ai < ALT.n - 4; ai += 7) {  /* coral arches over the tunnel */
                var a1 = altSide(ai, -ALT.hw - 10), a2 = altSide(ai, ALT.hw + 10);
                if (!vis(a1.x, a1.y, 90)) continue;
                ctx.strokeStyle = 'rgba(255,127,158,.78)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(a1.x, a1.y);
                ctx.quadraticCurveTo((a1.x + a2.x) / 2 + 8, (a1.y + a2.y) / 2 - 14, a2.x, a2.y); ctx.stroke();
                ctx.strokeStyle = 'rgba(255,214,226,.6)'; ctx.lineWidth = 3; ctx.stroke();
            }
            for (var i = 0; i < this.fish.length; i++) {  /* little fish swim over everything */
                var f = this.fish[i];
                if (!vis(f.x, f.y, 30)) continue;
                var w = Math.sin(clock * 9 + f.ph) * 0.35;
                ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.scale(f.s, f.s);
                ctx.fillStyle = 'rgba(8,40,60,.18)'; ctx.beginPath(); ctx.ellipse(6, 10, 11, 5, 0, 0, 7); ctx.fill();
                ctx.fillStyle = f.col; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-18, -6 + w * 6); ctx.lineTo(-18, 6 + w * 6); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, 7); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-3, -5, 2.5, 10);
                circle(ctx, 6, -1.5, 1.6, '#0f172a');
                ctx.restore();
            }
            drawParts('bub');
        },
        screen: function () {  /* sun rays through the water */
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (!this.ray || this.rayH !== H) {
                this.rayH = H; this.ray = ctx.createLinearGradient(0, 0, 0, H);
                this.ray.addColorStop(0, 'rgba(230,255,255,.16)'); this.ray.addColorStop(1, 'rgba(230,255,255,0)');
            }
            ctx.fillStyle = this.ray;
            for (var i = 0; i < 4; i++) {
                var x = W * (0.12 + i * 0.27) + Math.sin(clock * 0.25 + i * 2.1) * W * 0.05, w = 26 + (i % 2) * 24;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * 2.4 + H * 0.35, H); ctx.lineTo(x + H * 0.35, H); ctx.fill();
            }
        }
    };

    /* Moon Rim: a dusty road on a slab of moon floating in space, low grip, ramps for long low gravity jumps */
    var MOON = {
        id: 'moon', name: 'Moon Rim', blurb: 'Low grip, meteors, a jump over a crack',
        ctrl: [250, 250, 800, 200, 1350, 250, 1600, 450, 1500, 700, 1150, 700, 950, 560, 700, 520, 520, 700, 700, 900,
               1150, 920, 1450, 1050, 1300, 1250, 700, 1300, 250, 1150, 150, 700], scale: 0.74, start: 0.09,
        phys: { vmax: 350, vgrass: 125, acc: 300, grip: 3.4, gripOff: 2.4, coast: 0.35, turn: 2.9, care: 1.4 },
        col: { bg: '#070b1c', edge: '#8d8f99', road: '#b8bbc5', panel: 'rgba(15,23,42,.72)', mini: '#cbd5e1', grid: 'rgba(255,255,255,.7)' },
        sky: true, RIM: HW + 84, G: 150,
        alt: { a: 142, b: 206, hw: 32, vf: 1, ramp: 0.3, gap: [0.4, 0.66] },
        pads: [[262, 0.5], [430, -0.5]], picks: [100, 300], padCol: ['#ca8a04', '#fef9c3'],
        altGood: function (c) { return c.vf > 170; },
        reset: function () { this.met = []; this.metT = 4; },
        prep: function () {
            this.ramps = [straightNear(0.12, -2, 30, 0.004), straightNear(0.47, -2, 30, 0.004), straightNear(0.8, -2, 30, 0.004)];
            seed = 77;
            this.blobs = [];
            for (var i = 0; i < 7; i++) {
                var j = Math.round(i * N / 7 + 20), sg = i % 2 ? 1 : -1, p = side(j, sg * (HW + 120)), o = { x: p.x, y: p.y };
                nearest(o);
                if (o.dist > HW + 100) this.blobs.push({ x: p.x, y: p.y, r: 80 + rnd() * 50 });
            }
            var far = { x: 0, y: 0, dist: 0 };  /* the Earth hangs in the emptiest bit of sky */
            for (var gx = 100; gx < WW - 100; gx += 40) for (var gy = 100; gy < WH - 100; gy += 40) {
                o = { x: gx, y: gy }; nearest(o);
                if (o.dist > far.dist) far = o;
            }
            this.ex = far.x; this.ey = far.y;
        },
        paint: function (g) {
            var i, k, p, b;
            g.clearRect(0, 0, WW, WH);  /* the space around stays see-through, the sky is drawn behind */
            var self = this;
            function slab(dx, dy, color) {
                g.save(); g.translate(dx, dy);
                strokeLoop(g, 0, N, 2 * (HW + 100), color);
                strokeAlt(g, 0, ALT.n - 1, 2 * (ALT.hw + 44), color);
                g.fillStyle = color; self.blobs.forEach(function (q) { g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); });
                g.restore();
            }
            slab(0, 26, '#2e3040'); slab(0, 13, '#4a4c5a'); slab(0, 0, '#9a9ca6');  /* the cliff edge, then the top */
            seed = 9;
            for (i = 0; i < N; i += 2) for (k = -1; k <= 1; k += 2) {  /* rocks along the rim */
                p = side(i, k * (HW + 96 + rnd() * 6)); var rr = 5 + rnd() * 9;
                circle(g, p.x, p.y + 3, rr, '#6e707c'); circle(g, p.x - rr * 0.2, p.y - rr * 0.2, rr * 0.7, '#a3a5af');
            }
            var o = { x: 0, y: 0 };
            for (i = 0; i < 1600; i++) {  /* dust texture and craters, only on the slab */
                o.x = rnd() * WW; o.y = rnd() * WH; nearest(o);
                if (o.dist > HW + 92) continue;
                if (i % 9) { circle(g, o.x, o.y, 1 + rnd() * 2.5, rnd() < 0.5 ? '#a9abb4' : '#8a8c96'); continue; }
                var cr = o.dist < HW + 4 ? 6 + rnd() * 6 : 10 + rnd() * 22;
                circle(g, o.x, o.y, cr, '#83858f'); circle(g, o.x + cr * 0.15, o.y + cr * 0.15, cr * 0.82, '#757783');
                g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1.5, cr * 0.14);
                g.beginPath(); g.arc(o.x, o.y, cr, 0.6, 2.6); g.stroke();
            }
            this.blobs.forEach(function (q, n) {
                for (k = 0; k < 4; k++) {
                    var a = rnd() * 7, d = rnd() * q.r * 0.6, x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d, r2 = 10 + rnd() * 18;
                    circle(g, x, y, r2, '#83858f'); circle(g, x + r2 * 0.15, y + r2 * 0.15, r2 * 0.82, '#757783');
                }
                if (n === 1) {  /* a little lander */
                    g.save(); g.translate(q.x, q.y);
                    g.strokeStyle = '#d1d5db'; g.lineWidth = 3;
                    for (k = 0; k < 4; k++) { var la = k * 1.571 + 0.785; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(la) * 26, Math.sin(la) * 26); g.stroke(); circle(g, Math.cos(la) * 26, Math.sin(la) * 26, 4, '#d1d5db'); }
                    circle(g, 4, 6, 15, 'rgba(0,0,0,.3)');
                    g.fillStyle = '#e0b84a'; g.fillRect(-13, -13, 26, 26);
                    circle(g, 0, 0, 9, '#f1f5f9'); circle(g, 2, -2, 3.5, '#60a5fa');
                    g.restore();
                }
                if (n === 3) {  /* a flag with a paw print */
                    g.save(); g.translate(q.x, q.y);
                    circle(g, 0, 0, 3, '#e5e7eb'); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(4, 4, 34, 22);
                    g.fillStyle = '#d6336c'; g.fillRect(0, -2, 34, 22);
                    circle(g, 17, 12, 4.5, '#fff'); circle(g, 11, 5, 2.2, '#fff'); circle(g, 15.5, 3, 2.2, '#fff'); circle(g, 20.5, 3, 2.2, '#fff'); circle(g, 25, 5, 2.2, '#fff');
                    g.restore();
                }
            });
            strokeAlt(g, ALT.g0, ALT.g1, 2 * ALT.hw + 96, '#3b3d4a', []);  /* the crack on the shortcut: jump it or fall into space */
            g.globalCompositeOperation = 'destination-out';
            strokeAlt(g, ALT.g0, ALT.g1, 2 * ALT.hw + 84, '#000', []);
            g.globalCompositeOperation = 'source-over';
            var ends = [[0, ALT.g0], [ALT.g1, ALT.n - 1]];
            ends.forEach(function (e) { strokeAlt(g, e[0], e[1], 2 * ALT.hw + 10, '#6f7280', []); });
            ends.forEach(function (e) { strokeAlt(g, e[0], e[1], 2 * ALT.hw, '#b8bbc5', []); });
            [ALT.g0, ALT.g1].forEach(function (j) {  /* hazard stripes at both edges of the crack */
                g.save(); g.translate(ALT.x[j], ALT.y[j]); g.rotate(ALT.ang[j]);
                for (b = -ALT.hw; b < ALT.hw; b += 8) { g.fillStyle = (b / 8) % 2 ? '#111827' : '#facc15'; g.fillRect(j === ALT.g0 ? -8 : 0, b, 8, 8); }
                g.restore();
            });
            strokeLoop(g, 0, N, 2 * HW + 10, '#6f7280');  /* the road */
            strokeLoop(g, 0, N, 2 * HW, '#b8bbc5');
            strokeLoop(g, 0, N, 2, 'rgba(255,255,255,.45)', [16, 20]);
            for (i = 0; i < N; i += 4) for (k = -1; k <= 1; k += 2) {  /* runway lights along both edges */
                p = side(i, k * (HW + 2)); circle(g, p.x, p.y, 6, 'rgba(110,220,255,.25)'); circle(g, p.x, p.y, 2.6, '#bff3ff');
            }
            this.ramps.concat([-ALT.ramp - 1]).forEach(function (j) {  /* ramps: yellow plates with chevrons */
                g.save(); g.translate(rX(j), rY(j)); g.rotate(rA(j));
                var hw = j < 0 ? ALT.hw : HW;
                g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-14, -hw + 2, 34, 2 * hw - 4);
                g.fillStyle = '#e2b13c'; g.fillRect(-18, -hw + 4, 34, 2 * hw - 8);
                g.fillStyle = '#fde68a'; g.fillRect(12, -hw + 4, 4, 2 * hw - 8);
                g.strokeStyle = '#3b2a10'; g.lineWidth = 4;
                for (b = -hw + 18; b < hw - 10; b += 22) { g.beginPath(); g.moveTo(-10, b - 7); g.lineTo(4, b); g.lineTo(-10, b + 7); g.stroke(); }
                g.restore();
            });
        },
        jumpK: 0.22, jumpSay: 'Wheee! Low gravity!', fallSay: 'Lost in space! Back you go.',
        effect: function (c) {
            if (!c.z && c.dist > HW + 4 && Math.abs(c.vf) > 90 && Math.random() < 0.25) puff('dust', c.x, c.y, -c.vx * 0.1, -c.vy * 0.1, 0.7, 4 + Math.random() * 3);
            nearest(c);
            var rim = c.alt && c.ai > 3 && c.ai < ALT.n - 4 ? ALT.hw + 36 : this.RIM;
            if (c.dist > rim) {  /* the rocks on the rim stop you from driving into space */
                var px = c.px, py = c.py, nx = (c.x - px) / c.dist, ny = (c.y - py) / c.dist, vn = c.vx * nx + c.vy * ny;
                c.x = px + nx * rim; c.y = py + ny * rim;
                if (vn > 0) { c.vx -= nx * vn * 1.4; c.vy -= ny * vn * 1.4; if (mine(c) && vn > 60 && clock - c.hitAt > 0.5) { c.hitAt = clock; sfx(c, 'hit'); } }
            }
        },
        update: function (dt) {  /* meteor showers: a warning ring first, then the rock */
            if (phase !== 'race' || remote) return;
            var i, m, self = this;
            this.metT -= dt;
            if (this.metT <= 0) {
                this.metT = 2.6 + Math.random() * 2.6;
                var lead = me;
                karts.forEach(function (c) { if (!c.fin && c.prog > lead.prog) lead = c; });
                var p = side(lead.idx + 26 + Math.floor(Math.random() * 30), (Math.random() - 0.5) * 1.2 * HW);
                this.met.push({ x: p.x, y: p.y, t: 0 });
            }
            for (i = this.met.length - 1; i >= 0; i--) {
                m = this.met[i]; m.t += dt;
                if (m.t >= 1.5 && !m.hit) {
                    m.hit = true;
                    for (var k = 0; k < 10; k++) puff('dust', m.x, m.y, (Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220, 0.9, 6 + Math.random() * 6);
                    near(m.x, m.y, 500, 'hit');
                    karts.forEach(function (c) { if (c.z < 20 && !(c.fall > 0) && Math.hypot(c.x - m.x, c.y - m.y) < 50) { stat('meteor'); spinOut(c, 1, 'Meteor! Ouch!'); } });
                }
                if (m.t > 3.2) self.met.splice(i, 1);
            }
        },
        under: function () {
            this.met.forEach(function (m) {
                if (!vis(m.x, m.y, 60)) return;
                if (m.t < 1.5) {
                    var pulse = 0.5 + 0.5 * Math.sin(m.t * 18);
                    ctx.fillStyle = 'rgba(239,68,68,.14)'; ctx.beginPath(); ctx.arc(m.x, m.y, 50, 0, 7); ctx.fill();
                    ctx.strokeStyle = 'rgba(239,68,68,' + (0.5 + 0.4 * pulse).toFixed(2) + ')'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(m.x, m.y, 50 - m.t * 12, 0, 7); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(m.x - 12, m.y); ctx.lineTo(m.x + 12, m.y); ctx.moveTo(m.x, m.y - 12); ctx.lineTo(m.x, m.y + 12); ctx.stroke();
                } else {
                    var f = Math.max(0, 1 - (m.t - 1.5) / 1.7);
                    ctx.globalAlpha = f; circle(ctx, m.x, m.y, 30, '#3c3c46'); circle(ctx, m.x, m.y, 18, '#ff8c28'); ctx.globalAlpha = 1;
                }
            });
        },
        over: function () {  /* the falling rocks, coming in from the top right */
            this.met.forEach(function (m) {
                if (m.t < 1 || m.t >= 1.5) return;
                var f = (1.5 - m.t) / 0.5, x = m.x + f * 260, y = m.y - f * 380;
                if (!vis(x, y, 90)) return;
                ctx.strokeStyle = 'rgba(255,170,60,.6)'; ctx.lineWidth = 10; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y - 72); ctx.stroke();
                circle(ctx, x, y, 15, 'rgba(255,190,90,.35)'); circle(ctx, x, y, 12, '#78716c'); circle(ctx, x - 3, y - 3, 6, '#a8a29e');
            });
        },
        drawSky: function (cw, ch, k) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#060a1a'; ctx.fillRect(0, 0, cw, ch);
            if (!this.stars) {  /* a tile of stars, and the Earth, drawn once */
                var t = this.stars = document.createElement('canvas'); t.width = t.height = 300;
                var g = t.getContext('2d'), s = 99;
                for (var i = 0; i < 70; i++) {
                    s = (s * 16807) % 2147483647; var x = s % 300; s = (s * 16807) % 2147483647; var y = s % 300; s = (s * 16807) % 2147483647;
                    var b = s % 10;
                    circle(g, x, y, b > 8 ? 1.8 : b > 5 ? 1.2 : 0.7, b > 8 ? '#fff7d6' : b > 5 ? '#e2e8f0' : '#94a3b8');
                }
                this.pat = ctx.createPattern(t, 'repeat');
                var e = this.earth = document.createElement('canvas'); e.width = e.height = 180;
                g = e.getContext('2d');
                var gl = g.createRadialGradient(90, 90, 60, 90, 90, 90); gl.addColorStop(0, 'rgba(120,180,255,.5)'); gl.addColorStop(1, 'rgba(120,180,255,0)');
                g.fillStyle = gl; g.fillRect(0, 0, 180, 180);
                g.save(); g.beginPath(); g.arc(90, 90, 64, 0, 7); g.clip();
                g.fillStyle = '#2f6fd6'; g.fillRect(0, 0, 180, 180);
                g.fillStyle = '#4caf6a';
                [[70, 60, 22, 30], [105, 105, 26, 18], [60, 120, 14, 12], [118, 62, 12, 16]].forEach(function (c) { g.beginPath(); g.ellipse(c[0], c[1], c[2], c[3], 0.5, 0, 7); g.fill(); });
                g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 6; g.lineCap = 'round';
                [[40, 80, 90, 70], [80, 135, 130, 128], [95, 40, 135, 50]].forEach(function (c) { g.beginPath(); g.moveTo(c[0], c[1]); g.quadraticCurveTo((c[0] + c[2]) / 2, c[1] - 10, c[2], c[3]); g.stroke(); });
                var sh = g.createLinearGradient(50, 40, 150, 140); sh.addColorStop(0.45, 'rgba(6,10,26,0)'); sh.addColorStop(1, 'rgba(6,10,26,.85)');
                g.fillStyle = sh; g.fillRect(0, 0, 180, 180);
                g.restore();
            }
            var ox = (camX * k * 0.15) % 300, oy = (camY * k * 0.15) % 300;
            ctx.save(); ctx.translate(-ox, -oy); ctx.scale(dpr * 0.7, dpr * 0.7); ctx.fillStyle = this.pat; ctx.fillRect(0, 0, (cw + 600) / dpr / 0.7, (ch + 600) / dpr / 0.7); ctx.restore();
            var es = 230 * k, ex = (this.ex + (camX - this.ex) * 0.3) * k - VX0 * k, ey = (this.ey + (camY - this.ey) * 0.3) * k - VY0 * k;
            if (ex > -es && ex < cw + es && ey > -es && ey < ch + es) ctx.drawImage(this.earth, ex - es / 2, ey - es / 2, es, es);
        }
    };

    function mainDist(x, y) {  /* distance to the main road only, ignoring the shortcut */
        var best = 1e12;
        for (var i = 0; i < N; i += 2) { var dx = X[i] - x, dy = Y[i] - y, q = dx * dx + dy * dy; if (q < best) best = q; }
        return Math.sqrt(best);
    }
    function strikes(st, dt, every, hitFn) {  /* a warning ring ahead of the leader, then a hit 1.4 s later */
        st.t -= dt;
        if (st.t <= 0) {
            st.t = every[0] + Math.random() * every[1];
            var lead = me;
            karts.forEach(function (c) { if (!c.fin && c.prog > lead.prog) lead = c; });
            var q = side(lead.idx + 26 + Math.floor(Math.random() * 30), (Math.random() - 0.5) * 1.2 * HW);
            st.list.push({ x: q.x, y: q.y, t: 0 });
        }
        for (var i = st.list.length - 1; i >= 0; i--) {
            var m = st.list[i];
            m.t += dt;
            if (m.t >= 1.4 && !m.hit) { m.hit = true; hitFn(m); }
            if (m.t > 3) st.list.splice(i, 1);
        }
    }
    function warnRing(m, col) {
        var pulse = 0.5 + 0.5 * Math.sin(m.t * 18);
        ctx.globalAlpha = 0.16; circle(ctx, m.x, m.y, 48, col); ctx.globalAlpha = 0.5 + 0.4 * pulse;
        ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y, 48 - m.t * 12, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(m.x - 12, m.y); ctx.lineTo(m.x + 12, m.y); ctx.moveTo(m.x, m.y - 12); ctx.lineTo(m.x, m.y + 12); ctx.stroke();
        ctx.globalAlpha = 1;
    }

    /* Lava Peak: basalt road round a volcano, lava rivers, heat vents that toss you up, a bridge the lava floods */
    var VOLCANO = {
        id: 'volcano', name: 'Lava Peak', blurb: 'Lava bursts, heat vents, a flooding lava bridge',
        ctrl: [300, 600, 350, 300, 650, 150, 1000, 180, 1250, 350, 1450, 300, 1600, 500, 1500, 800, 1200, 850, 1000, 700,
               800, 750, 750, 1000, 500, 1100, 300, 950], scale: 1.12, start: 0,
        phys: { vmax: 330, vgrass: 80, acc: 350, grip: 7, gripOff: 4, coast: 0.7, turn: 3.1, care: 1.05 },
        col: { bg: '#1d1513', edge: '#4a3c38', road: '#3b3436', panel: 'rgba(15,23,42,.72)', mini: '#fdba74', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 200, b: 300, hw: 30, vf: 0.92, gate: { at: 0.5, open: 3.6, shut: 2.4 } }, gate: 'lava', gateSoft: true,
        pads: [[60, 0.5], [420, -0.5]], picks: [30, 250], padCol: ['#ea580c', '#fed7aa'], dustCol: '#7a6a66', G: 380,
        reset: function () { this.burst = { t: 3, list: [] }; },
        prep: function () {
            this.vents = [[120, 0.3], [170, -0.35], [380, 0.25]].map(function (v) { var q = side(v[0], v[1] * HW); return { x: q.x, y: q.y, a: A[v[0]], t: 0 }; });
            this.s0 = Math.round(ALT.n * 0.35); this.s1 = Math.round(ALT.n * 0.65);
            var rivers = this.rivers = [], mid = Math.round(ALT.n / 2), i, k;
            for (k = -1; k <= 1; k += 2) {  /* the river under the bridge, flowing out both ways until near the road */
                var pts = [ALT.x[mid], ALT.y[mid]], a = ALT.ang[mid] + Math.PI / 2 * k, x = pts[0], y = pts[1];
                for (i = 0; i < 30; i++) {
                    a += Math.sin(i * 1.7 + k) * 0.25; x += Math.cos(a) * 40; y += Math.sin(a) * 40;
                    if (i > 2 && mainDist(x, y) < HW + 50) break;
                    pts.push(x, y);
                }
                rivers.push(pts);
            }
            seed = 58;
            for (k = 0; k < 5; k++) {  /* more rivers out in the fields */
                var rx = rnd() * WW, ry = rnd() * WH, ra = rnd() * 7, rp = [];
                for (i = 0; i < 26; i++) {
                    if (mainDist(rx, ry) < HW + 70 || rx < 0 || ry < 0 || rx > WW || ry > WH) { if (rp.length > 4) break; rp = []; }
                    else rp.push(rx, ry);
                    ra += (rnd() - 0.5) * 0.6; rx += Math.cos(ra) * 45; ry += Math.sin(ra) * 45;
                }
                if (rp.length > 4) rivers.push(rp);
            }
        },
        paint: function (g) {
            var i, k, p;
            g.fillStyle = '#1d1513'; g.fillRect(0, 0, WW, WH);
            seed = 61;
            for (i = 0; i < 50; i++) circle(g, rnd() * WW, rnd() * WH, 60 + rnd() * 160, rnd() < 0.5 ? 'rgba(90,70,62,.18)' : 'rgba(0,0,0,.22)');
            g.lineCap = g.lineJoin = 'round';
            this.rivers.forEach(function (pts) {  /* lava rivers: dark crust, hot orange, a bright yellow core */
                [[52, '#5a1f0c'], [38, '#c2410c'], [24, '#fb923c'], [8, '#fde68a']].forEach(function (st) {
                    g.strokeStyle = st[1]; g.lineWidth = st[0]; g.beginPath(); g.moveTo(pts[0], pts[1]);
                    for (var q = 2; q < pts.length; q += 2) g.lineTo(pts[q], pts[q + 1]);
                    g.stroke();
                });
            });
            scatter(150, HW + 50, function (x, y, n) {  /* basalt boulders */
                var r = 10 + rnd() * 22;
                circle(g, x + 5, y + 7, r, 'rgba(0,0,0,.35)');
                g.fillStyle = n % 3 ? '#2b2422' : '#3a302d'; g.beginPath();
                for (k = 0; k < 7; k++) { var a = k * 0.9 + rnd() * 0.4, r2 = r * (0.75 + rnd() * 0.35); g.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); }
                g.closePath(); g.fill();
                circle(g, x - r * 0.3, y - r * 0.3, r * 0.35, 'rgba(255,255,255,.06)');
            });
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 18, '#2b2422');  /* the lava bridge shortcut: stone slabs */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#57504f');
            for (i = 2; i < ALT.n - 2; i += 2) {
                p = altSide(i, 0); g.save(); g.translate(p.x, p.y); g.rotate(ALT.ang[i]);
                g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -ALT.hw); g.lineTo(0, ALT.hw); g.stroke(); g.restore();
            }
            strokeLoop(g, 0, N, 2 * HW + 26, '#4a3c38');  /* rock shoulders, a glowing edge, then the basalt road */
            strokeLoop(g, 0, N, 2 * HW + 6, '#f97316');
            strokeLoop(g, 0, N, 2 * HW, '#3b3436');
            strokeLoop(g, 0, N, 2, 'rgba(255,170,90,.35)', [16, 22]);
            g.shadowColor = '#ff7a1a'; g.shadowBlur = 8; g.strokeStyle = '#ffa04d'; g.lineWidth = 2;
            for (i = 7; i < N; i += 23) {  /* glowing cracks in the road */
                p = side(i, (rnd() - 0.5) * HW * 1.2); g.beginPath(); g.moveTo(p.x, p.y);
                var cx = p.x, cy = p.y;
                for (k = 0; k < 4; k++) { cx += (rnd() - 0.5) * 26; cy += (rnd() - 0.5) * 26; g.lineTo(cx, cy); }
                g.stroke();
            }
            g.shadowBlur = 0;
            this.vents.forEach(function (v) { circle(g, v.x, v.y, 21, '#241c1a'); circle(g, v.x, v.y, 15, '#7c2d12'); circle(g, v.x, v.y, 8, '#fb923c'); circle(g, v.x, v.y, 3.5, '#fde68a'); });
        },
        effect: function (c) {
            var i;
            if (c.alt && c.z <= 0 && c.ai >= this.s0 && c.ai <= this.s1 && gateOpen(clock) < 0.5) {  /* the lava surge on the bridge */
                if (!(c.hot > 0)) { stat('surge'); if (mine(c)) { sfx(c, 'hit'); say('Hot paws! The lava is up!', c); } }
                c.hot = 0.5; c.slip = Math.max(c.slip, 0.3);
            }
            if (c.z > 0 || c.rampT > 0) return;
            for (i = 0; i < this.vents.length; i++) {  /* heat vents toss you up and to the side */
                var v = this.vents[i];
                if (Math.hypot(c.x - v.x, c.y - v.y) > 22) continue;
                c.vz = 80; c.z = 0.01; c.rampT = 0.9; stat('vent');
                var sd = i % 2 ? 1 : -1; c.vx += -Math.sin(v.a) * sd * 90; c.vy += Math.cos(v.a) * sd * 90;
                sfx(c, 'jump'); if (quiet(c, 4)) say('Whoosh! Hot air!', c);
            }
        },
        update: function (dt) {
            this.vents.forEach(function (v) {  /* steam and embers */
                v.t -= dt;
                if (v.t <= 0 && vis(v.x, v.y, 80)) { v.t = 0.12; puff(Math.random() < 0.3 ? 'lava' : 'dust', v.x, v.y, (Math.random() - 0.5) * 30, -40 - Math.random() * 40, 0.9, 2 + Math.random() * 4); }
            });
            if (phase !== 'race' || remote) return;
            strikes(this.burst, dt, [2.4, 2.4], function (m) {
                for (var k = 0; k < 14; k++) puff('lava', m.x, m.y, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 240, 0.9, 3 + Math.random() * 4);
                near(m.x, m.y, 500, 'hit');
                karts.forEach(function (c) {
                    if (c.z < 20 && !(c.fall > 0) && Math.hypot(c.x - m.x, c.y - m.y) < 48) { stat('burst'); if (spinOut(c, 0.9, 'Lava burst! Hot hot hot!')) c.hot = 0.8; }
                });
            });
        },
        under: function () {
            var o = gateOpen(clock), k;
            if (o < 1) {  /* the lava surge flooding the middle of the bridge, with a warning glow before it */
                ctx.globalAlpha = 1 - o;
                strokeAlt(ctx, this.s0, this.s1, 2 * ALT.hw + 8, '#ea580c', []);
                strokeAlt(ctx, this.s0, this.s1, 2 * ALT.hw - 16, '#fbbf24', []);
                ctx.globalAlpha = 1;
            }
            this.burst.list.forEach(function (m) {
                if (!vis(m.x, m.y, 60)) return;
                if (m.t < 1.4) warnRing(m, '#f97316');
                else { ctx.globalAlpha = Math.max(0, 1 - (m.t - 1.4) / 1.6); circle(ctx, m.x, m.y, 30, '#7c2d12'); circle(ctx, m.x, m.y, 20, '#f97316'); circle(ctx, m.x, m.y, 9, '#fde68a'); ctx.globalAlpha = 1; }
            });
            for (k = 0; k < this.vents.length; k++) {
                var v = this.vents[k];
                if (vis(v.x, v.y, 30)) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(clock * 6 + k); circle(ctx, v.x, v.y, 26, '#fb923c'); ctx.globalAlpha = 1; }
            }
        },
        over: function () {
            this.burst.list.forEach(function (m) {  /* the lava fountain */
                if (m.t < 1.4 || m.t > 2 || !vis(m.x, m.y, 80)) return;
                var f = (m.t - 1.4) / 0.6;
                for (var k = 0; k < 5; k++) circle(ctx, m.x + Math.sin(k * 2.1) * 10 * f, m.y - Math.sin(f * Math.PI) * (30 + k * 9), 9 - k, k % 2 ? '#fb923c' : '#fde68a');
            });
            drawParts('lava');
        }
    };

    /* Giant Grove: a bark road over the roots of huge trees, lanterns and fireflies, a plank bridge, a hollow log shortcut */
    var TREES = {
        id: 'trees', name: 'Giant Grove', blurb: 'Swinging vines, a plank bridge, a hollow log',
        ctrl: [200, 400, 450, 250, 700, 400, 950, 250, 1250, 300, 1350, 550, 1150, 700, 1300, 950, 1050, 1100, 800, 950,
               650, 1100, 400, 1050, 300, 850, 450, 650], scale: 1.15, start: 0.23,
        phys: { vmax: 330, vgrass: 95, acc: 360, grip: 8.5, gripOff: 5, coast: 0.7, turn: 3.15, care: 1 },
        col: { bg: '#18301f', edge: '#4b7a3a', road: '#9a6a3c', panel: 'rgba(15,23,42,.72)', mini: '#d9b48a', grid: 'rgba(255,255,255,.6)' },
        alt: { a: 340, b: 430, hw: 26, vf: 0.92 }, bridge: { i0: 240, i1: 266, hw: 30 }, fallSay: 'Off the planks! Back you go.',
        pads: [[100, 0.5], [200, -0.5]], picks: [20, 300], padCol: ['#65a30d', '#ecfccb'], dustCol: '#8a6a4a',
        prep: function () {
            this.saps = [[0.3, -0.45], [0.55, 0.45], [0.8, -0.45]].map(function (s) { var j = Math.round(s[0] * (ALT.n - 1)), q = altSide(j, s[1] * ALT.hw); return { x: q.x, y: q.y, a: ALT.ang[j] }; });
            this.vines = [[60, 0], [165, 2.2]].map(function (v) { return { j: v[0], ph: v[1] }; });
            this.lanterns = [];
            for (var i = 10; i < N; i += 34) if ((i - this.bridge.i0 + N) % N > this.bridge.i1 - this.bridge.i0) this.lanterns.push(side(i, (i / 34 % 2 ? 1 : -1) * (HW + 20)));
            seed = 91; this.flies = [];
            for (i = 0; i < 34; i++) this.flies.push({ x: rnd() * WW, y: rnd() * WH, ph: rnd() * 7, sp: 0.4 + rnd() * 0.6 });
        },
        vine: function (v) {  /* where the swinging vine is now */
            var l = Math.sin(clock * 1.7 + v.ph) * (HW + 8);
            return side(v.j, l);
        },
        paint: function (g) {
            var i, k, p;
            g.fillStyle = '#18301f'; g.fillRect(0, 0, WW, WH);
            seed = 93;
            for (i = 0; i < 60; i++) circle(g, rnd() * WW, rnd() * WH, 40 + rnd() * 120, rnd() < 0.5 ? 'rgba(255,240,170,.045)' : 'rgba(0,0,0,.18)');
            var trunks = [];
            scatter(60, HW + 150, function (x, y) { if (trunks.length < 9) trunks.push({ x: x, y: y, r: 70 + rnd() * 60 }); });
            g.lineCap = 'round';
            trunks.forEach(function (t) {  /* giant roots spreading out */
                for (k = 0; k < 6; k++) {
                    var a = k * 1.05 + rnd(), l = t.r + 80 + rnd() * 120, mx = t.x + Math.cos(a + 0.3) * l * 0.6, my = t.y + Math.sin(a + 0.3) * l * 0.6;
                    g.strokeStyle = '#3d2817'; g.lineWidth = 26 - k; g.beginPath(); g.moveTo(t.x, t.y); g.quadraticCurveTo(mx, my, t.x + Math.cos(a) * l, t.y + Math.sin(a) * l); g.stroke();
                    g.strokeStyle = 'rgba(255,220,170,.12)'; g.lineWidth = 6; g.stroke();
                }
            });
            trunks.forEach(function (t) {  /* huge trunks with growth rings */
                circle(g, t.x + 10, t.y + 14, t.r, 'rgba(0,0,0,.35)'); circle(g, t.x, t.y, t.r, '#5b3b22');
                g.strokeStyle = '#7a5232'; g.lineWidth = 3;
                for (k = t.r - 14; k > 8; k -= 14) { g.beginPath(); g.arc(t.x, t.y, k, 0, 7); g.stroke(); }
                circle(g, t.x - t.r * 0.35, t.y - t.r * 0.35, t.r * 0.2, 'rgba(120,200,90,.35)');
            });
            scatter(220, HW + 40, function (x, y, n) {  /* mushrooms and ferns */
                if (n % 3 === 0) {
                    var r = 6 + rnd() * 9, glow = n % 9 === 0;
                    circle(g, x + 2, y + 3, r, 'rgba(0,0,0,.3)'); circle(g, x, y, r, glow ? '#5eead4' : '#dc2626');
                    for (k = 0; k < 4; k++) circle(g, x + Math.cos(k * 1.6) * r * 0.5, y + Math.sin(k * 1.6) * r * 0.5, r * 0.18, glow ? '#ccfbf1' : '#fff7ed');
                } else if (n % 3 === 1) {
                    g.strokeStyle = n % 2 ? '#3f8f3a' : '#57a84a'; g.lineWidth = 3;
                    for (k = 0; k < 6; k++) { var a = k * 1.05 + n; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * 10, y + Math.sin(a + 0.4) * 10, x + Math.cos(a) * 18, y + Math.sin(a) * 18); g.stroke(); }
                }
            });
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 18, '#3d2614');  /* the hollow log shortcut: narrow, with sticky sap */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#6b4424');
            strokeAlt(g, 1, ALT.n - 2, 2, 'rgba(0,0,0,.25)', [8, 10]);
            this.saps.forEach(function (s) {
                g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.fillStyle = '#d97706'; g.beginPath(); g.ellipse(0, 0, 18, 11, 0, 0, 7); g.fill();
                g.fillStyle = 'rgba(255,240,180,.6)'; g.beginPath(); g.ellipse(-5, -3, 6, 3, 0, 0, 7); g.fill(); g.restore();
            });
            strokeLoop(g, 0, N, 2 * HW + 22, '#4b7a3a');  /* mossy edges and the bark road */
            strokeLoop(g, 0, N, 2 * HW, '#9a6a3c');
            for (k = -1; k <= 1; k++) { g.save(); strokeLoop(g, 0, N, 2 * HW - 30 + k * 26, k ? 'rgba(80,48,22,.35)' : 'rgba(255,220,170,.12)', [30, 24 + k * 6]); g.restore(); }
            var b = this.bridge;
            strokeLoop(g, b.i0, b.i1, 2 * HW + 30, '#0b170e', []);  /* the plank bridge over a drop to the forest floor */
            strokeLoop(g, b.i0, b.i1, 2 * HW + 4, '#0b170e', []);
            for (i = b.i0; i <= b.i1; i++) {
                p = side(i, 0); g.save(); g.translate(p.x, p.y); g.rotate(A[ix(i)]);
                g.fillStyle = i % 2 ? '#b98b55' : '#a87c49'; g.fillRect(-4.5, -b.hw, 8, 2 * b.hw);
                g.restore();
            }
            for (k = -1; k <= 1; k += 2) {
                g.beginPath();
                for (i = b.i0; i <= b.i1; i++) { p = side(i, k * (b.hw + 4)); if (i === b.i0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
                g.strokeStyle = '#d6b98a'; g.lineWidth = 3; g.setLineDash([]); g.stroke();
                for (i = b.i0; i <= b.i1; i += 4) { p = side(i, k * (b.hw + 4)); circle(g, p.x, p.y, 3.5, '#5b3b22'); }
            }
            this.lanterns.forEach(function (q) {  /* warm light from the lanterns */
                var gl = g.createRadialGradient(q.x, q.y, 3, q.x, q.y, 90);
                gl.addColorStop(0, 'rgba(255,200,110,.3)'); gl.addColorStop(1, 'rgba(255,200,110,0)');
                g.fillStyle = gl; g.fillRect(q.x - 90, q.y - 90, 180, 180);
            });
        },
        effect: function (c) {
            var i;
            if (c.alt) for (i = 0; i < this.saps.length; i++) if (Math.hypot(c.x - this.saps[i].x, c.y - this.saps[i].y) < 20) {
                if (!(c.sticky > 0)) { stat('sap'); if (quiet(c, 3)) say('Sticky sap!', c); }
                c.sticky = 0.35;
            }
            if (c.z > 0) return;
            for (i = 0; i < this.vines.length; i++) {
                var q = this.vine(this.vines[i]);
                if (Math.hypot(c.x - q.x, c.y - q.y) < R + 12 && clock - (c.vineT || -9) > 1.2) { c.vineT = clock; stat('vine'); spinOut(c, 0.7, 'Whoa! A swinging vine!'); }
            }
        },
        over: function () {
            var self = this, i, k;
            ctx.lineCap = 'round';
            for (i = 4; i < ALT.n - 4; i += 5) {  /* the log over the shortcut, see-through so you can still see the karts */
                var a1 = altSide(i, -ALT.hw - 9), a2 = altSide(i, ALT.hw + 9);
                if (!vis(a1.x, a1.y, 80)) continue;
                ctx.strokeStyle = 'rgba(92,58,30,.6)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(a1.x, a1.y);
                ctx.quadraticCurveTo((a1.x + a2.x) / 2, (a1.y + a2.y) / 2 - 10, a2.x, a2.y); ctx.stroke();
            }
            this.vines.forEach(function (v) {
                var q = self.vine(v);
                if (!vis(q.x, q.y, 140)) return;
                circle(ctx, q.x + 6, q.y + 10, 11, 'rgba(0,0,0,.3)');
                ctx.strokeStyle = '#2f6b2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.quadraticCurveTo(q.x + 10, q.y - 60, q.x, q.y - 130); ctx.stroke();
                circle(ctx, q.x, q.y, 12, '#3f8f3a'); circle(ctx, q.x - 4, q.y - 4, 6, '#6cc04a');
                for (k = 0; k < 4; k++) { ctx.fillStyle = '#4fa83f'; ctx.beginPath(); ctx.ellipse(q.x + Math.cos(k * 1.6) * 12, q.y + Math.sin(k * 1.6) * 12, 7, 3.5, k * 1.6, 0, 7); ctx.fill(); }
            });
            this.lanterns.forEach(function (q, n) {  /* paper lanterns hanging from the branches */
                if (!vis(q.x, q.y, 30)) return;
                var sw = Math.sin(clock * 2 + n) * 2;
                ctx.strokeStyle = '#3d2817'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x + sw, q.y - 8); ctx.lineTo(q.x, q.y - 30); ctx.stroke();
                circle(ctx, q.x + sw, q.y, 14, 'rgba(255,190,90,.25)');
                ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(q.x + sw, q.y, 7, 9, 0, 0, 7); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fde68a'; ctx.fillRect(q.x + sw - 1.5, q.y - 6, 3, 12);
            });
            for (i = 0; i < this.flies.length; i++) {  /* fireflies */
                var f = this.flies[i], fx = f.x + Math.sin(clock * f.sp + f.ph) * 60, fy = f.y + Math.cos(clock * f.sp * 1.3 + f.ph) * 40;
                if (!vis(fx, fy, 10)) continue;
                var on = 0.5 + 0.5 * Math.sin(clock * 3 + f.ph);
                ctx.globalAlpha = on; circle(ctx, fx, fy, 6, 'rgba(250,255,150,.35)'); circle(ctx, fx, fy, 2, '#fbff9e'); ctx.globalAlpha = 1;
            }
        }
    };

    /* Red Canyon: red rock, mesas and cacti, soft sand, tumbleweeds, sandstorms, a dry riverbed shortcut with a gorge jump */
    var DESERT = {
        id: 'desert', name: 'Red Canyon', blurb: 'Tumbleweeds, sandstorms, a gorge jump',
        poly: [0, 0, 700, 0, 1000, 300, 1400, 300, 1400, 800, 900, 800, 900, 1100, 300, 1100, 300, 600, 0, 600], round: 110, scale: 1.05, start: 0.95,
        phys: { vmax: 335, vgrass: 105, acc: 360, grip: 7.5, gripOff: 4, coast: 0.65, turn: 3.1, care: 1.05 },
        col: { bg: '#e6b27a', edge: '#c98a52', road: '#a8673a', panel: 'rgba(255,255,255,.82)' },
        alt: { a: 310, b: 400, hw: 30, vf: 0.9, ramp: 0.38, gap: [0.5, 0.66] },
        jumpK: 0.62, G: 420, jumpSay: 'Yee-haw!', fallSay: 'Down the gorge! Back you go.', aiSlow: 1,
        altGood: function (c) { return c.vf > 150; },
        pads: [[170, 0.5], [270, -0.5], [0.24, 0, true]], picks: [90, 420], padCol: ['#dc2626', '#fee2e2'], dustCol: '#d9a066',
        reset: function () { this.storm = { t: 12, on: 0 }; this.aiSlow = 1; this.weeds.forEach(function (w, n) { w.s = -320 + n * 200; }); },
        prep: function () {
            this.sand = [[80, 0.2], [150, -0.3], [230, 0.25], [440, 0]].map(function (d) { var q = side(d[0], d[1] * HW); return { x: q.x, y: q.y, a: A[d[0]] }; });
            this.weeds = [60, 215, 455].map(function (j, n) { return { x0: X[j], y0: Y[j], ux: -Math.sin(A[j]), uy: Math.cos(A[j]), s: 0, sp: 110 + n * 25, rot: 0 }; });
        },
        paint: function (g) {
            var i, k, p, self = this;
            g.fillStyle = '#e6b27a'; g.fillRect(0, 0, WW, WH);
            seed = 71;
            for (i = 0; i < 50; i++) circle(g, rnd() * WW, rnd() * WH, 70 + rnd() * 160, rnd() < 0.5 ? 'rgba(255,230,190,.25)' : 'rgba(170,90,40,.10)');
            g.strokeStyle = 'rgba(160,90,40,.18)'; g.lineWidth = 3; g.lineCap = 'round';
            for (i = 0; i < 240; i++) { var x = rnd() * WW, y = rnd() * WH; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 22, y - 9, x + 44, y); g.stroke(); }
            var mesas = [];
            scatter(80, HW + 170, function (x2, y2) { if (mesas.length < 7) mesas.push({ x: x2, y: y2, r: 80 + rnd() * 60, s: rnd() }); });
            mesas.forEach(function (m) {  /* flat-topped mesas with rock layers */
                var pts = [];
                for (k = 0; k < 9; k++) { var a = k * 0.7 + m.s, r = m.r * (0.75 + 0.3 * Math.sin(k * 2.3 + m.s * 9)); pts.push(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r * 0.85); }
                function poly(dx, dy, sc, col) { g.fillStyle = col; g.beginPath(); for (var q = 0; q < pts.length; q += 2) g.lineTo(m.x + (pts[q] - m.x) * sc + dx, m.y + (pts[q + 1] - m.y) * sc + dy); g.closePath(); g.fill(); }
                poly(16, 22, 1, 'rgba(90,40,20,.3)'); poly(0, 0, 1, '#9c3f22'); poly(-4, -6, 0.86, '#b44d2a'); poly(-7, -11, 0.7, '#c9643a');
                g.strokeStyle = 'rgba(80,30,10,.35)'; g.lineWidth = 2;
                for (k = 1; k < 4; k++) { g.beginPath(); g.ellipse(m.x - 4, m.y - 4, m.r * (0.9 - k * 0.12), m.r * (0.75 - k * 0.1), 0, 0, 7); g.stroke(); }
            });
            scatter(160, HW + 40, function (x2, y2, n) {  /* cacti and rocks */
                if (n % 2) {
                    circle(g, x2 + 4, y2 + 6, 9, 'rgba(90,50,20,.25)'); circle(g, x2, y2, 9, '#4d7c3a');
                    circle(g, x2 + 11, y2 - 2, 5, '#4d7c3a'); circle(g, x2 - 10, y2 + 3, 5, '#4d7c3a'); circle(g, x2 - 2, y2 - 2, 3, '#7bab5a');
                } else { circle(g, x2 + 3, y2 + 4, 7, 'rgba(90,50,20,.25)'); circle(g, x2, y2, 7, '#b5653d'); circle(g, x2 - 2, y2 - 2, 3, '#d7895f'); }
            });
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 30, '#e9cf9f');  /* the dry riverbed shortcut: cracked mud */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#d8b27c');
            g.strokeStyle = 'rgba(120,70,30,.35)'; g.lineWidth = 1.5;
            for (i = 1; i < ALT.n - 1; i++) { p = altSide(i, (rnd() - 0.5) * 2 * ALT.hw); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + (rnd() - 0.5) * 24, p.y + (rnd() - 0.5) * 24); g.lineTo(p.x + (rnd() - 0.5) * 30, p.y + (rnd() - 0.5) * 30); g.stroke(); }
            [[2 * ALT.hw + 70, '#7a3518'], [2 * ALT.hw + 50, '#4a1e0c'], [2 * ALT.hw + 28, '#1f0c05']].forEach(function (st) { strokeAlt(g, ALT.g0, ALT.g1, st[0], st[1], []); });
            g.save(); g.translate(ALT.x[ALT.ramp], ALT.y[ALT.ramp]); g.rotate(ALT.ang[ALT.ramp]);  /* a wooden ramp */
            g.fillStyle = 'rgba(60,30,10,.35)'; g.fillRect(-16, -ALT.hw + 3, 34, 2 * ALT.hw - 4);
            for (k = -ALT.hw + 4; k < ALT.hw - 4; k += 8) { g.fillStyle = (k / 8) % 2 ? '#c08a4f' : '#a8743f'; g.fillRect(-18, k, 34, 7); }
            g.restore();
            strokeLoop(g, 0, N, 2 * HW + 26, '#c98a52');  /* the red dirt road */
            strokeLoop(g, 0, N, 2 * HW, '#a8673a');
            strokeLoop(g, 0, N, 2 * HW - 40, 'rgba(90,45,20,.25)', [40, 16]);
            strokeLoop(g, 0, N, 2 * HW - 44, '#a8673a', [40, 16]);
            this.sand.forEach(function (s) {  /* soft sand drifts on the road */
                g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.fillStyle = '#f0cf9a'; g.beginPath(); g.ellipse(0, 0, 48, 26, 0, 0, 7); g.fill();
                g.strokeStyle = 'rgba(190,130,70,.45)'; g.lineWidth = 2;
                for (k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-30, k * 8); g.quadraticCurveTo(0, k * 8 - 5, 30, k * 8); g.stroke(); }
                g.restore();
            });
            self = null;
        },
        effect: function (c) {
            var i;
            if (c.z <= 0 && !c.alt) for (i = 0; i < this.sand.length; i++) {
                var s = this.sand[i], dx = c.x - s.x, dy = c.y - s.y, u = (dx * Math.cos(s.a) + dy * Math.sin(s.a)) / 48, v = (dy * Math.cos(s.a) - dx * Math.sin(s.a)) / 26;
                if (u * u + v * v > 1) continue;
                if (!(c.loose > 0)) { stat('sand'); if (quiet(c, 4)) say('Soft sand, slidey paws!', c); }
                c.loose = 0.25;
            }
            if (c.alt && c.on && c.z <= 0) c.loose = Math.max(c.loose, 0.1);  /* the riverbed is loose too */
            for (i = 0; i < 3; i++) {  /* tumbleweeds */
                var w = this.weeds[i], wx = w.x0 + w.ux * w.s, wy = w.y0 + w.uy * w.s;
                if (c.z > 10 || Math.hypot(c.x - wx, c.y - wy) > R + 16 || clock - (c.weedT || -9) < 1) continue;
                c.weedT = clock; c.vx *= 0.65; c.vy *= 0.65; c.a += (Math.random() - 0.5) * 0.5; stat('tumbleweed');
                sfx(c, 'hit'); if (quiet(c, 3)) say('Tumbleweed!', c);
            }
        },
        update: function (dt) {
            this.weeds.forEach(function (w) { w.s += w.sp * dt; w.rot += w.sp * dt / 16; if (w.s > 340) w.s = -340 - Math.random() * 200; });
            if (phase !== 'race' || remote) return;
            var st = this.storm;
            if (st.on > 0) { st.on -= dt; if (st.on <= 0) { st.t = 16 + Math.random() * 8; this.aiSlow = 1; } }
            else { st.t -= dt; if (st.t <= 0) { st.on = 5; this.aiSlow = 0.94; stat('storm'); if (quiet(me, 1)) say('Sandstorm! Hold on!'); if (quiet(pal, 1)) say('Sandstorm! Hold on!', pal); } }
        },
        under: function () {
            this.weeds.forEach(function (w) {
                var wx = w.x0 + w.ux * w.s, wy = w.y0 + w.uy * w.s;
                if (!vis(wx, wy, 30)) return;
                circle(ctx, wx + 4, wy + 8, 14, 'rgba(90,50,20,.25)');
                ctx.save(); ctx.translate(wx, wy); ctx.rotate(w.rot);
                ctx.strokeStyle = '#8a6239'; ctx.lineWidth = 1.6;
                for (var k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(0, 0, 15, 9, k * 0.45, 0, 7); ctx.stroke(); }
                ctx.strokeStyle = '#b08a5a'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.stroke();
                ctx.restore();
            });
        },
        screen: function () {  /* the sandstorm: warm haze and flying sand */
            var st = this.storm;
            if (!(st.on > 0)) return;
            var f = Math.min(1, (5 - st.on) / 0.8, st.on / 0.8), k;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = 'rgba(214,150,80,' + (0.62 * f).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(255,230,190,' + (0.6 * f).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.beginPath();
            for (k = 0; k < 40; k++) {
                var y = (k * 97.3 + clock * 23) % H, x = ((k * 211.7 + clock * 900) % (W + 200)) - 100;
                ctx.moveTo(x, y); ctx.lineTo(x + 40, y + 6);
            }
            ctx.stroke();
        }
    };

    /* Blossom Sky Town: an original bright cel-shaded town, petal whirlwinds, boost rings, a rooftop beam shortcut */
    var SKY = {
        id: 'sky', name: 'Blossom Town', blurb: 'Petal whirlwinds, boost rings, a rooftop beam',
        poly: [100, 0, 1300, 0, 1500, 200, 1500, 500, 1000, 500, 800, 700, 1200, 1000, 0, 1000, 0, 600, 400, 350, 0, 200], round: 120, scale: 1, start: 0.04,
        phys: { vmax: 340, vgrass: 100, acc: 380, grip: 8.5, gripOff: 5, coast: 0.7, turn: 3.2, care: 1 },
        col: { bg: '#fdf2e9', edge: '#2b2340', road: '#6b6fa8', panel: 'rgba(255,255,255,.85)', mini: '#8b8fc8' },
        alt: { a: 165, b: 255, hw: 22, vf: 1, edge: true }, fallSay: 'Off the roof! Back you go.',
        pads: [[90, 0.5], [300, -0.5]], picks: [60, 210], padCol: ['#ec4899', '#fce7f3'],
        reset: function () { this.whirls.forEach(function (w) { w.hitT = -9; }); },
        prep: function () {
            this.rings = [[25, 0], [330, 0.3], [430, -0.2]].map(function (d) { var q = side(d[0], d[1] * HW); return { x: q.x, y: q.y, a: A[d[0]] }; });
            this.whirls = [[70, 1], [320, -1]].map(function (d) { var q = side(d[0], 0); return { cx: q.x, cy: q.y, dir: d[1], x: q.x, y: q.y }; });
            this.gateAt = 8;
            this.strings = [140, 280, 380];
            var q2 = { x: WW / 2, y: WH / 2 }; this.balloon = q2;
        },
        paint: function (g) {
            var i, k, p, OLc = '#2b2340';
            g.fillStyle = '#fdf2e9'; g.fillRect(0, 0, WW, WH);
            g.strokeStyle = '#efe2d2'; g.lineWidth = 10;  /* the little streets */
            for (i = 0; i < WW; i += 160) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, WH); g.stroke(); }
            for (i = 0; i < WH; i += 160) { g.beginPath(); g.moveTo(0, i); g.lineTo(WW, i); g.stroke(); }
            seed = 17;
            var ROOF = ['#ffb3c7', '#9be3de', '#ffe08a', '#c7b8ff', '#a7e3a1', '#ffc59e'], o = { x: 0, y: 0 };
            function clear(x, y) { o.x = x; o.y = y; nearest(o); return o.dist > HW + 40; }
            for (var gx = 10; gx < WW; gx += 160) for (var gy = 10; gy < WH; gy += 160) {  /* houses with bold outlines, flat roofs */
                var w = 90 + rnd() * 40, h = 80 + rnd() * 50, x = gx + 8 + rnd() * (140 - w), y = gy + 8 + rnd() * (140 - h);
                if (!(clear(x, y) && clear(x + w, y) && clear(x, y + h) && clear(x + w, y + h) && clear(x + w / 2, y + h / 2))) continue;
                if (rnd() < 0.3) {  /* a cherry tree instead */
                    for (k = 0; k < 5; k++) {
                        var tx = x + w / 2 + Math.cos(k * 1.3) * 22, ty = y + h / 2 + Math.sin(k * 1.3) * 18;
                        circle(g, tx + 4, ty + 6, 22, 'rgba(43,35,64,.15)');
                    }
                    for (k = 0; k < 5; k++) {
                        tx = x + w / 2 + Math.cos(k * 1.3) * 22; ty = y + h / 2 + Math.sin(k * 1.3) * 18;
                        g.fillStyle = '#ffc4dd'; g.strokeStyle = OLc; g.lineWidth = 3; g.beginPath(); g.arc(tx, ty, 22, 0, 7); g.fill(); g.stroke();
                    }
                    for (k = 0; k < 5; k++) { tx = x + w / 2 + Math.cos(k * 1.3) * 22; ty = y + h / 2 + Math.sin(k * 1.3) * 18; circle(g, tx + 6, ty + 6, 12, '#ff9cc4'); circle(g, tx - 7, ty - 7, 5, '#fff0f6'); }
                    continue;
                }
                g.fillStyle = 'rgba(43,35,64,.22)'; g.fillRect(x + 10, y + 12, w, h);
                g.fillStyle = ROOF[Math.floor(rnd() * ROOF.length)]; g.strokeStyle = OLc; g.lineWidth = 4; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
                g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
                g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 4, y + 4, w - 8, 6);
                if (rnd() < 0.45) {  /* a neon sign with made-up glyphs */
                    var nc = rnd() < 0.5 ? '#ff4fa3' : '#36e2ff', sx = x + 10, sy = y + h - 30;
                    g.fillStyle = OLc; rr(g, sx, sy, 46, 20, 4); g.fill();
                    g.strokeStyle = nc; g.lineWidth = 2.5; g.shadowColor = nc; g.shadowBlur = 8; g.beginPath();
                    for (k = 0; k < 3; k++) {
                        var bx = sx + 6 + k * 13;
                        g.moveTo(bx, sy + 5); g.lineTo(bx + 8 * rnd(), sy + 10); g.moveTo(bx + 2, sy + 15); g.lineTo(bx + 9, sy + 15 - 6 * rnd());
                    }
                    g.stroke(); g.shadowBlur = 0;
                }
            }
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 50, 'rgba(43,35,64,.55)');  /* the rooftop beam shortcut over a deep street */
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 8, OLc);
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw, '#f4f1ff');
            strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw - 10, '#ff6b8b', [12, 12]);
            strokeLoop(g, 0, N, 2 * HW + 10, OLc);  /* the road, cel shaded */
            strokeLoop(g, 0, N, 2 * HW, '#6b6fa8');
            strokeLoop(g, 0, N, 2 * HW - 18, '#7c80b8');
            strokeLoop(g, 0, N, 4, '#ffffff', [26, 20]);
            for (i = 0; i < N; i += 3) for (k = -1; k <= 1; k += 2) {  /* petals on the road */
                if (rnd() < 0.5) continue;
                p = side(i, k * rnd() * HW); g.fillStyle = '#ffc4dd'; g.beginPath(); g.ellipse(p.x, p.y, 3, 1.8, rnd() * 3, 0, 7); g.fill();
            }
            this.rings.forEach(function (r) { g.fillStyle = 'rgba(43,35,64,.18)'; g.beginPath(); g.ellipse(r.x + 6, r.y + 10, 22, 12, r.a, 0, 7); g.fill(); });
        },
        effect: function (c) {
            var i, r;
            for (i = 0; i < this.rings.length; i++) {  /* boost rings */
                r = this.rings[i];
                if (Math.hypot(c.x - r.x, c.y - r.y) < 22 && clock - (c.ringT || -9) > 0.6) {
                    c.ringT = clock; c.boost = Math.max(c.boost, 1.1); stat('ring');
                    sfx(c, 'point');
                }
            }
            for (i = 0; i < this.whirls.length; i++) {  /* blossom whirlwinds spin you round */
                var w = this.whirls[i];
                if (c.z > 10 || Math.hypot(c.x - w.x, c.y - w.y) > R + 22 || clock - (c.whirlT || -9) < 1.5) continue;
                c.whirlT = clock; stat('whirl');
                if (spinOut(c, 0.8, 'Whirl! A blossom whirlwind!')) for (var k = 0; k < 8; k++) puff('petal', c.x, c.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, 0.9, 4);
            }
        },
        update: function (dt) {
            this.whirls.forEach(function (w, n) {  /* each whirlwind wanders back and forth across the road */
                w.x = w.cx + Math.cos(clock * 0.5 * w.dir + n) * 95; w.y = w.cy + Math.sin(clock * 0.7 * w.dir + n * 2) * 70;
                if (vis(w.x, w.y, 60) && Math.random() < 0.35) puff('petal', w.x + (Math.random() - 0.5) * 30, w.y + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 1, 3.5);
            });
            if (Math.random() < 0.3) puff('petal', VX0 + Math.random() * (VX1 - VX0), VY0 + Math.random() * (VY1 - VY0), 30 + Math.random() * 30, 20 + Math.random() * 20, 2.5, 3);
            var b = this.balloon;
            b.x = WW / 2 + Math.cos(clock * 0.06) * WW * 0.3; b.y = WH / 2 + Math.sin(clock * 0.08) * WH * 0.25;
        },
        under: function () {
            this.whirls.forEach(function (w) {
                if (!vis(w.x, w.y, 50)) return;
                ctx.strokeStyle = 'rgba(255,140,190,.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
                for (var k = 0; k < 3; k++) {
                    ctx.beginPath();
                    for (var t = 0; t < 1; t += 0.08) { var a = clock * 6 + k * 2.1 + t * 7, r = 6 + t * 26; ctx.lineTo(w.x + Math.cos(a) * r, w.y + Math.sin(a) * r * 0.8); }
                    ctx.stroke();
                }
            });
            drawParts('petal');
        },
        over: function () {
            var i, k, OLc = '#2b2340';
            this.rings.forEach(function (r, n) {  /* glowing boost rings, standing up over the road */
                if (!vis(r.x, r.y, 40)) return;
                ctx.save(); ctx.translate(r.x, r.y - 8); ctx.rotate(r.a + Math.PI / 2);
                ctx.lineWidth = 9; ctx.strokeStyle = OLc; ctx.beginPath(); ctx.ellipse(0, 0, 9, 26, 0, 0, 7); ctx.stroke();
                ctx.lineWidth = 5; ctx.strokeStyle = n % 2 ? '#36e2ff' : '#ff6bb5'; ctx.stroke();
                ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(clock * 8)).toFixed(2) + ')'; ctx.stroke();
                ctx.restore();
            });
            var g0 = this.gateAt, pl = side(g0, -HW - 14), pr = side(g0, HW + 14), ga = A[g0];
            if (vis(pl.x, pl.y, 160)) {  /* a big red gate over the start straight (an original design) */
                ctx.lineCap = 'round';
                [[pl, pr]].forEach(function (pp) {
                    var a = pp[0], b = pp[1], dx = Math.cos(ga) * 10, dy = Math.sin(ga) * 10;
                    ctx.strokeStyle = 'rgba(43,35,64,.25)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(a.x + 12, a.y + 16); ctx.lineTo(b.x + 12, b.y + 16); ctx.stroke();
                    ctx.strokeStyle = OLc; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(a.x - dx * 0.6, a.y - dy * 0.6); ctx.lineTo(b.x - dx * 0.6, b.y - dy * 0.6); ctx.stroke();
                    ctx.strokeStyle = '#e8452c'; ctx.lineWidth = 10; ctx.stroke();
                    ctx.strokeStyle = OLc; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(a.x + dx, a.y + dy); ctx.lineTo(b.x + dx, b.y + dy); ctx.stroke();
                    ctx.strokeStyle = '#ff6a4d'; ctx.lineWidth = 7; ctx.stroke();
                    [a, b].forEach(function (q) { circle(ctx, q.x, q.y, 10, OLc); circle(ctx, q.x, q.y, 7, '#e8452c'); circle(ctx, q.x - 2, q.y - 2, 2.5, '#ffb199'); });
                });
            }
            this.strings.forEach(function (j) {  /* strings of paper lanterns across the road */
                var a = side(j, -HW - 18), b = side(j, HW + 18);
                if (!vis(a.x, a.y, 140)) return;
                ctx.strokeStyle = OLc; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 14, b.x, b.y); ctx.stroke();
                for (k = 1; k < 6; k++) {
                    var t = k / 6, lx = a.x + (b.x - a.x) * t, ly = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 12;
                    ctx.fillStyle = k % 2 ? '#ff5a5f' : '#fff4e0'; ctx.strokeStyle = OLc; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.ellipse(lx, ly + 4, 5, 7, 0, 0, 7); ctx.fill(); ctx.stroke();
                }
            });
            var bl = this.balloon;  /* the giant star balloon floating over town (an original mascot) */
            if (vis(bl.x, bl.y, 200)) {
                ctx.fillStyle = 'rgba(43,35,64,.15)'; ctx.beginPath(); ctx.ellipse(bl.x + 60, bl.y + 90, 70, 40, 0, 0, 7); ctx.fill();
                ctx.save(); ctx.translate(bl.x, bl.y); ctx.rotate(Math.sin(clock * 0.8) * 0.08);
                ctx.strokeStyle = OLc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 60); ctx.quadraticCurveTo(14, 100, 0, 140); ctx.stroke();
                ctx.beginPath();
                for (i = 0; i < 10; i++) { var rr2 = i % 2 ? 40 : 82, aa = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); }
                ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = OLc; ctx.stroke(); ctx.lineWidth = 10; ctx.strokeStyle = '#ffd84d'; ctx.stroke(); ctx.fillStyle = '#ffd84d'; ctx.fill();
                ctx.fillStyle = '#ffeaa0'; ctx.beginPath(); ctx.ellipse(-18, -22, 16, 9, -0.5, 0, 7); ctx.fill();
                circle(ctx, -14, 2, 5, OLc); circle(ctx, 14, 2, 5, OLc); circle(ctx, -12, 0, 1.8, '#fff'); circle(ctx, 16, 0, 1.8, '#fff');
                circle(ctx, -26, 14, 6, '#ff9cc4'); circle(ctx, 26, 14, 6, '#ff9cc4');
                ctx.strokeStyle = OLc; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 10, 8, 0.3, Math.PI - 0.3); ctx.stroke();
                ctx.restore();
            }
        },
        screen: function () {  /* speed lines while you boost */
            if (!(me.boost > 0) || phase !== 'race') return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath();
            for (var k = 0; k < 26; k++) {
                var a = k * 0.2417 * Math.PI * 2 + clock * 0.3, r0 = Math.max(W, H) * (0.42 + 0.08 * Math.sin(clock * 30 + k)), r1 = Math.max(W, H) * 0.75;
                ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1);
            }
            ctx.stroke();
        }
    };
    var MAPS = [MEADOW, CITY, REEF, MOON, VOLCANO, TREES, DESERT, SKY];

    function drawParts(kind) {
        var any = false;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p.k !== kind || !vis(p.x, p.y, 20)) continue;
            var f = p.t / p.life;
            ctx.globalAlpha = 1 - f; any = true;
            if (kind === 'bub') {
                var r = p.r * (0.7 + f * 0.8);
                ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.fillRect(p.x - r * 0.45, p.y - r * 0.55, r * 0.35, r * 0.35);
            } else if (kind === 'drop') { circle(ctx, p.x, p.y, p.r, '#a9c8ff'); }
            else if (kind === 'leaf') { ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, p.t * 6 + i, 0, 7); ctx.fill(); }
            else if (kind === 'card') { ctx.fillStyle = '#c08a4f'; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
            else if (kind === 'spark') { circle(ctx, p.x, p.y, p.r * (1 - f * 0.5), p.c || '#fde047'); }
            else if (kind === 'lava') { circle(ctx, p.x, p.y, p.r * (1 - f * 0.4), f < 0.5 ? '#ffd166' : '#ff5a1f'); }
            else if (kind === 'petal') { ctx.fillStyle = '#ffb7d5'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.55, p.t * 5 + i, 0, 7); ctx.fill(); }
            else { ctx.globalAlpha = (1 - f) * 0.5; circle(ctx, p.x, p.y, p.r * (1 + f * 1.5), MAP.dustCol || '#cfd2da'); }
        }
        if (any) ctx.globalAlpha = 1;
    }

    /* ---------- page: canvas, HUD, countdown, touch buttons, track picker ---------- */
    function arrow(d) { return '<svg viewBox="0 0 24 24"><path d="' + d + '"/></svg>'; }
    var TOUCH_HINT = 'Hold Gas, steer with the arrows, tap the item button to use an item';
    var wrapEl = document.createElement('div');
    wrapEl.className = 'kk kk-picking' + (api.touch ? ' kk-touch' : '') + (duo ? ' kk-lobby-on' : '');
    wrapEl.innerHTML = '<canvas class="kk-cv"></canvas>' +
        '<div class="kk-hud"><span class="kk-pill kk-pos">4th</span><span class="kk-pill"><small>Lap</small><b class="kk-lap">1/3</b></span>' +
        '<span class="kk-pill kk-time">0.0</span><span class="kk-pill kk-slot kk-empty" title="Item"><canvas width="64" height="64"></canvas></span></div>' +
        '<div class="kk-count"></div><div class="kk-hint">' + (api.touch ? TOUCH_HINT : 'Arrows or WASD to drive and brake, Space or Shift to use an item') + '</div>' +
        '<button class="kk-btn kk-use kk-empty" aria-label="Use item"><canvas width="64" height="64"></canvas></button>' +
        '<button class="kk-btn kk-left" data-k="left" aria-label="Steer left">' + arrow('M15 5l-7 7 7 7') + '</button>' +
        '<button class="kk-btn kk-right" data-k="right" aria-label="Steer right">' + arrow('M9 5l7 7-7 7') + '</button>' +
        '<button class="kk-btn kk-brake" data-k="down">Brake</button><button class="kk-btn kk-gas" data-k="up">Gas</button>' +
        '<div class="kk-pick"><div class="kk-pick-box" role="dialog" aria-label="Pick a track"><h3>Pick a track</h3><div class="kk-maps"></div>' +
        '<p class="kk-pick-tip">' + (api.touch ? 'Tap a track to race' : 'Click a track, or arrows to choose and Enter to race') + '</p></div></div>';
    api.el.appendChild(wrapEl);
    var cv = wrapEl.querySelector('.kk-cv'), ctx = cv.getContext('2d', { alpha: false });
    var posEl = wrapEl.querySelector('.kk-pos'), lapEl = wrapEl.querySelector('.kk-lap'), timeEl = wrapEl.querySelector('.kk-time');
    var countEl = wrapEl.querySelector('.kk-count'), hintEl = wrapEl.querySelector('.kk-hint'), mapsEl = wrapEl.querySelector('.kk-maps');
    var slotEl = wrapEl.querySelector('.kk-slot'), useEl = wrapEl.querySelector('.kk-use');
    var slotG = slotEl.querySelector('canvas').getContext('2d'), useG = useEl.querySelector('canvas').getContext('2d');

    /* the last track and the best time on each track are remembered in this browser */
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('kitty-kart-maps')); } catch (e) { saved = null; }
    if (!saved || typeof saved !== 'object') saved = {};
    if (!saved.best || typeof saved.best !== 'object') saved.best = {};
    function persist() { try { localStorage.setItem('kitty-kart-maps', JSON.stringify(saved)); } catch (e) { /* private mode: fine */ } }
    var sel = 0;
    MAPS.forEach(function (m, i) { if (m.id === saved.map) sel = i; });
    var MAP = MAPS[sel];

    var tins = [], boosts = [], yarns = [], milks = [], rings = [];
    function load(m) {  /* build a track with its shortcut, fish tins and boost pads */
        build(m);
        if (m.prep) m.prep();
        tins = []; boosts = [];
        (m.picks || []).forEach(function (j) {
            [-0.55, 0, 0.55].forEach(function (l) { var q = side(j, l * HW); tins.push({ x: q.x, y: q.y, idx: j, lat: l * HW, t: 0 }); });
        });
        (m.pads || []).forEach(function (d) {  /* [main index, side] or [fraction of the shortcut, side, true] */
            var j = d[2] ? Math.round(d[0] * (ALT.n - 1)) : d[0], q = d[2] ? altSide(j, d[1] * ALT.hw) : side(j, d[1] * HW), a = d[2] ? ALT.ang[j] : A[j];
            boosts.push({ x: q.x, y: q.y, a: a, ca: Math.cos(a), sa: Math.sin(a) });
        });
    }
    var cards = MAPS.map(function (m, i) {
        load(m);
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'kk-map';
        b.innerHTML = '<canvas width="240" height="180"></canvas><b></b><small></small><small class="kk-mbest"></small>';
        b.querySelector('b').textContent = m.name;
        b.querySelector('small').textContent = m.blurb;
        thumb(b.querySelector('canvas').getContext('2d'), m);
        mapsEl.appendChild(b);
        api.on(b, 'click', function () { if (phase !== 'pick') return; choose(i); go(); });
        api.on(b, 'focus', function () { if (phase === 'pick' && sel !== i) choose(i); });
        return b;
    });
    function thumb(g, m) {  /* a small picture of the track for its button */
        var s = Math.min(220 / WW, 160 / WH), i;
        g.fillStyle = m.col.bg; g.fillRect(0, 0, 240, 180);
        g.save(); g.translate((240 - WW * s) / 2, (180 - WH * s) / 2); g.scale(s, s); g.lineJoin = 'round';
        if (m === MOON) { seed = 3; for (i = 0; i < 60; i++) circle(g, rnd() * WW, rnd() * WH, 6, '#cbd5e1'); }
        if (m === REEF) { seed = 3; for (i = 0; i < 26; i++) circle(g, rnd() * WW, rnd() * WH, 30, ['#ff7f9e', '#ffd166', '#b88ae6'][i % 3]); }
        if (m === CITY) { seed = 3; for (i = 0; i < 40; i++) { g.fillStyle = i % 4 ? '#323b52' : '#ffd27a'; g.fillRect(rnd() * WW, rnd() * WH, 90, 70); } }
        if (m === MEADOW) { seed = 3; for (i = 0; i < 40; i++) circle(g, rnd() * WW, rnd() * WH, 34, '#97d08f'); }
        if (m === VOLCANO) { seed = 3; for (i = 0; i < 30; i++) circle(g, rnd() * WW, rnd() * WH, 22, i % 3 ? '#3a302d' : '#f97316'); }
        if (m === TREES) { seed = 3; for (i = 0; i < 14; i++) circle(g, rnd() * WW, rnd() * WH, 70, '#5b3b22'); }
        if (m === DESERT) { seed = 3; for (i = 0; i < 10; i++) circle(g, rnd() * WW, rnd() * WH, 80, '#b44d2a'); }
        if (m === SKY) { seed = 3; for (i = 0; i < 40; i++) { g.fillStyle = ['#ffb3c7', '#9be3de', '#ffe08a', '#ffc4dd'][i % 4]; g.fillRect(rnd() * WW, rnd() * WH, 80, 70); } }
        strokeLoop(g, 0, N, 2 * HW + (m === MOON ? 200 : 60), m.col.edge);
        if (ALT) { strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 30, m.col.edge); strokeAlt(g, 1, ALT.n - 2, 2 * ALT.hw + 6, m.col.road, [26, 14]); }
        strokeLoop(g, 0, N, 2 * HW + 30, m.col.road);
        g.setLineDash([]);
        g.translate(X[0], Y[0]); g.rotate(A[0]); g.fillStyle = '#0f172a'; g.fillRect(-12, -HW - 15, 24, 2 * HW + 30);
        g.fillStyle = '#fff'; g.fillRect(-12, -HW - 15, 12, 2 * HW + 30);
        g.restore();
    }
    function showBests() {
        cards.forEach(function (b, i) {
            var t = duo || split ? null : saved.best[MAPS[i].id];  /* racing a friend keeps no best times */
            b.querySelector('.kk-mbest').textContent = typeof t === 'number' ? 'Best ' + t.toFixed(1) + ' s' : '';
            b.classList.toggle('kk-sel', i === sel);
            b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
        });
    }

    var dpr = 1, W = 0, H = 0, FW = 0, zoom = 1, res = 0, track = null, mini = null, MM = 110, mmK = 1, dirty = true;
    function fit(s) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);  /* sharp enough, and much lighter on phones */
        FW = s.w;  /* the whole play area, for the picker */
        if (split) s = layout(s);  /* split screen: W and H are one view's */
        W = s.w; H = s.h;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        zoom = clamp(Math.sqrt(W * H) / 760, 0.7, 1.4);
        MM = W < 600 ? 92 : 120;
        wrapEl.classList.toggle('kk-narrow', FW < 600);
        MAPS.forEach(function (m) { m.beam = m.ray = null; });  /* gradients belong to the old canvas state */
        var r = Math.min(zoom * dpr, Math.sqrt(9e6 / (WW * WH)));  /* cap the cached track at about 9 megapixels */
        if (Math.abs(r - res) > 0.01 || !track || dirty) { res = r; renderTrack(); dirty = false; }
        renderMini();
    }

    /* the static track, drawn once into an offscreen canvas in world units times res */
    function renderTrack() {
        track = track || document.createElement('canvas');
        track.width = Math.ceil(WW * res); track.height = Math.ceil(WH * res);
        var g = track.getContext('2d'), i, k;
        g.setTransform(res, 0, 0, res, 0, 0);
        g.lineJoin = g.lineCap = 'round';
        MAP.paint(g);
        g.setLineDash([]);
        boosts.forEach(function (b) {  /* boost pads */
            g.save(); g.translate(b.x, b.y); g.rotate(b.a);
            g.fillStyle = 'rgba(15,23,42,.25)'; rr(g, -20, -14, 44, 34, 6); g.fill();
            g.fillStyle = MAP.padCol[0]; rr(g, -22, -17, 44, 34, 6); g.fill();
            g.strokeStyle = MAP.padCol[1]; g.lineWidth = 4; g.lineCap = g.lineJoin = 'round';
            for (k = -10; k <= 14; k += 12) { g.beginPath(); g.moveTo(k - 6, -9); g.lineTo(k, 0); g.lineTo(k - 6, 9); g.stroke(); }
            g.restore();
        });
        g.save();  /* start/finish line, chequered */
        g.translate(X[0], Y[0]); g.rotate(A[0]);
        var q = HW / 5;
        for (i = 0; i < 10; i++) for (k = 0; k < 2; k++) { g.fillStyle = (i + k) % 2 ? '#0f172a' : '#ffffff'; g.fillRect(-q + k * q, -HW + i * q, q, q); }
        g.restore();
        for (i = 0; i < 4; i++) {  /* grid boxes */
            var j = N - 3 - i * 3, sd = (i % 2 ? 1 : -1) * HW * 0.45;
            g.save(); g.translate(X[j] - Math.sin(A[j]) * sd, Y[j] + Math.cos(A[j]) * sd); g.rotate(A[j]);
            g.strokeStyle = MAP.col.grid || 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.strokeRect(-14, -12, 32, 24);
            g.restore();
        }
    }
    function renderMini() {
        mini = mini || document.createElement('canvas');
        mmK = MM / Math.max(WW, WH);
        mini.width = Math.ceil(WW * mmK * dpr); mini.height = Math.ceil(WH * mmK * dpr);
        var g = mini.getContext('2d');
        g.setTransform(mmK * dpr, 0, 0, mmK * dpr, 0, 0);
        g.lineJoin = g.lineCap = 'round';
        if (ALT) strokeAlt(g, 0, ALT.n - 1, 2 * ALT.hw + 10, MAP.col.mini || '#b4bcc6', [40, 26]);
        strokeLoop(g, 0, N, 2 * HW, MAP.col.mini || '#b4bcc6');
        g.setLineDash([]);
        g.translate(X[0], Y[0]); g.rotate(A[0]);  /* the start line */
        g.fillStyle = MAP.col.mini ? '#d6336c' : '#0f172a'; g.fillRect(-1 / mmK, -HW, 2 / mmK, 2 * HW);
    }

    /* ---------- karts: the player (first) and three computer cats with their own fur ---------- */
    var karts = [
        { fur: '#f6a23a', stripe: '#cf7419', body: '#d6336c', skill: 1 },  /* you: orange tabby, pink kart */
        { fur: '#a3aab5', stripe: '#6b7280', body: '#1e3a8a', skill: 0.945 },  /* grey tabby */
        { fur: '#45424d', stripe: null, body: '#0f9d8a', skill: 0.925 },  /* black cat */
        { fur: '#fbf7ef', stripe: '#e8c9a0', body: '#8b5cf6', skill: 0.895 }];  /* white cat */
    karts.forEach(function (c, i) { c.phase = i * 1.7; c.lane = (i % 2 ? 1 : -1) * 0.3 * HW; });
    var me = karts[0], keys = {}, pads = {}, keys2 = {};  /* keys2: player 2 on split screen */
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
            nearest(c);
        });
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
        c.x += c.vx * dt; c.y += c.vy * dt;
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
                if (ALT.edge && c.ai > 3 && c.ai < ALT.n - 4 && c.dist > ALT.hw + 6) { fallOff(c, ALT.a); return; }
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
    function respawn(c) {  /* back on the road a little before where you fell */
        var j = ix(c.fallTo - 4);
        c.x = X[j]; c.y = Y[j]; c.a = A[j]; c.vx = c.vy = c.vf = c.z = c.vz = 0; c.useAlt = false; c.decided = laps(c);
        nearest(c);
    }

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
                for (j = 0; j < 6; j++) { var q = puff('spark', y.x, y.y, (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140, 0.5, 2.4); if (q) q.c = '#f472b6'; }
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
    function progress(c) {
        nearest(c);
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
        if (!c || c === me) { lastSay = clock; api.say(t, 1800); }
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
        if (place === 1) { api.cat('happy'); api.say('Purrfect! First place!', 2400); }
        else api.say(place === 2 ? 'So close! Again?' : 'Meow. Next time!', 2400);
        api.end({ score: t, lowerIsBetter: true, win: place === 1,
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

    /* ---------- drawing ---------- */
    function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    var OL = '#3b2a1e';
    function drawKart(c) {
        ctx.save(); ctx.translate(c.x, c.y);
        if (c.z > 0) {  /* in the air: the shadow stays on the ground, the kart grows a little */
            ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(c.z * 0.5, c.z * 0.8, 16, 11, c.a, 0, 7); ctx.fill();
            ctx.scale(1 + Math.min(c.z, 36) / 50, 1 + Math.min(c.z, 36) / 50);
        }
        if (c.fall > 0) { var fs = 0.15 + 0.85 * c.fall / 1.3; ctx.globalAlpha = c.fall / 1.3; ctx.scale(fs, fs); ctx.rotate((1.3 - c.fall) * 6); }
        ctx.rotate(c.a);
        if (c.boost > 0) {  /* catnip or a boost pad: a green flame */
            ctx.fillStyle = 'rgba(74,222,128,.75)'; ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(-27 - Math.random() * 9, 0); ctx.lineTo(-15, 5); ctx.fill();
        }
        ctx.fillStyle = 'rgba(15,23,42,.16)'; rrect(-14, -8, 32, 20, 8); ctx.fill();
        ctx.fillStyle = '#1f2937';
        rrect(-14, -13, 10, 6, 2); ctx.fill(); rrect(-14, 7, 10, 6, 2); ctx.fill();
        for (var s = -1; s <= 1; s += 2) { ctx.save(); ctx.translate(9, s * 10); ctx.rotate(c.steer * 0.45); rrect(-4.5, -2.5, 9, 5, 2); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = c.body; ctx.strokeStyle = 'rgba(15,23,42,.55)'; ctx.lineWidth = 1.4;
        rrect(-15, -8.5, 31, 17, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.4)'; rrect(11, -6, 4, 12, 2); ctx.fill();
        var wag = Math.sin(clock * 9 + c.phase) * 3;  /* the tail, over the back of the kart */
        ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(-17, 4 + wag, -21, 9 + wag);
        ctx.strokeStyle = OL; ctx.lineWidth = 5.6; ctx.stroke(); ctx.strokeStyle = c.fur; ctx.lineWidth = 3.4; ctx.stroke();
        ctx.fillStyle = c.fur; ctx.strokeStyle = OL; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(4, -9.5); ctx.lineTo(3.5, -2); ctx.closePath();  /* ears */
        ctx.moveTo(-3, 5); ctx.lineTo(4, 9.5); ctx.lineTo(3.5, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(-1, 0, 7, 0, 7); ctx.fill(); ctx.stroke();
        if (c.stripe) {
            ctx.strokeStyle = c.stripe; ctx.lineWidth = 1.6; ctx.beginPath();
            ctx.moveTo(-6.5, -3); ctx.lineTo(-2.5, -2.4); ctx.moveTo(-7.4, 0); ctx.lineTo(-2.5, 0); ctx.moveTo(-6.5, 3); ctx.lineTo(-2.5, 2.4); ctx.stroke();
        }
        if (c.shield > 0) {  /* sitting in a cardboard box, flaps open */
            ctx.fillStyle = '#d4a464'; ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = 1.2;
            for (var f = -1; f <= 1; f += 2) {
                ctx.beginPath(); ctx.moveTo(-19, f * 14); ctx.lineTo(-13, f * 23); ctx.lineTo(13, f * 23); ctx.lineTo(19, f * 14); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            ctx.strokeStyle = '#a26b35'; ctx.lineWidth = 4.5; ctx.strokeRect(-19, -14, 38, 28);
            ctx.fillStyle = '#ecd9b0'; ctx.fillRect(-3, -16.5, 6, 5); ctx.fillRect(-3, 11.5, 6, 5);
        }
        if (c.tangled > 0) {  /* wrapped in pink wool */
            ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 1.6;
            for (var w = 0; w < 3; w++) { ctx.beginPath(); ctx.ellipse(0, 0, 20, 9, w * 1.05 + clock * 3, 0, 7); ctx.stroke(); }
        }
        ctx.restore();
    }
    function drawYarn(g, r, rot, tail) {  /* a ball of pink wool: shading, wound strands at different tilts, outline, highlight, loose thread */
        var k, b;
        if (tail) {
            g.strokeStyle = '#db2777'; g.lineWidth = Math.max(1, r * 0.12); g.lineCap = 'round';
            g.beginPath(); g.moveTo(r * 0.55, r * 0.75); g.bezierCurveTo(r * 1.1, r * 1.15, r * 0.4, r * 1.35, r * 1.15, r * 1.3); g.stroke();
        }
        var gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        gr.addColorStop(0, '#ffd1e6'); gr.addColorStop(0.55, '#f472b6'); gr.addColorStop(1, '#be185d');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
        g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip();
        g.lineWidth = Math.max(0.7, r * 0.08);
        for (b = 0; b < 3; b++) {  /* three bands of strands, each wound at its own tilt */
            g.save(); g.rotate(rot + b * 1.05);
            g.strokeStyle = b === 1 ? 'rgba(255,214,232,.6)' : 'rgba(131,24,67,.5)';
            for (k = -2; k <= 2; k++) {
                var yy = k * r * 0.34, rx = r * Math.sqrt(Math.max(0.05, 1 - (yy / r) * (yy / r)));
                g.beginPath(); g.ellipse(0, yy, rx, r * 0.22, 0, 0, Math.PI); g.stroke();
            }
            g.restore();
        }
        g.restore();
        g.strokeStyle = '#831843'; g.lineWidth = Math.max(0.8, r * 0.1); g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.24, r * 0.13, -0.6, 0, 7); g.fill();
    }
    function drawIcon(g, it, r) {  /* the item pictures for the HUD slot and the touch button, centred on 0, 0 */
        var i;
        g.lineCap = g.lineJoin = 'round';
        if (it === 'yarn') { g.save(); g.translate(-r * 0.15, -r * 0.15); drawYarn(g, r * 0.7, 0.5, 1); g.restore(); }
        else if (it === 'catnip') {
            g.strokeStyle = '#15803d'; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(0, r * 0.95); g.quadraticCurveTo(r * 0.12, 0, 0, -r * 0.55); g.stroke();
            [[-0.42, 0.3, -0.8], [0.42, 0.1, 0.8], [-0.34, -0.3, -0.5], [0.34, -0.5, 0.5], [0, -0.78, 0]].forEach(function (l) {
                g.save(); g.translate(l[0] * r, l[1] * r); g.rotate(l[2]); g.fillStyle = '#22c55e'; g.strokeStyle = '#166534'; g.lineWidth = r * 0.06;
                g.beginPath(); g.ellipse(0, 0, r * 0.2, r * 0.34, 0, 0, 7); g.fill(); g.stroke(); g.restore();
            });
            circle(g, r * 0.7, -r * 0.75, r * 0.09, '#86efac'); circle(g, -r * 0.75, -r * 0.55, r * 0.07, '#86efac');
        } else if (it === 'box') {
            g.fillStyle = '#c8955a'; g.strokeStyle = '#7c4a1e'; g.lineWidth = r * 0.07;
            g.beginPath(); g.rect(-r * 0.7, -r * 0.2, r * 1.4, r * 0.95); g.fill(); g.stroke();
            g.fillStyle = '#deb07a';
            for (i = -1; i <= 1; i += 2) {
                g.beginPath(); g.moveTo(i * r * 0.7, -r * 0.2); g.lineTo(i * r * 0.98, -r * 0.68); g.lineTo(i * r * 0.12, -r * 0.68); g.lineTo(0, -r * 0.2); g.closePath(); g.fill(); g.stroke();
            }
            g.fillStyle = '#ecd9b0'; g.fillRect(-r * 0.12, -r * 0.2, r * 0.24, r * 0.95);
            circle(g, -r * 0.35, r * 0.3, r * 0.08, '#7c4a1e'); circle(g, r * 0.35, r * 0.3, r * 0.08, '#7c4a1e');
        } else if (it === 'laser') {
            g.save(); g.rotate(-0.7);
            g.fillStyle = '#475569'; rr(g, -r * 0.85, -r * 0.15, r * 1.25, r * 0.3, r * 0.12); g.fill();
            g.fillStyle = '#94a3b8'; g.fillRect(-r * 0.5, -r * 0.15, r * 0.22, r * 0.3);
            g.fillStyle = '#ef4444'; g.fillRect(r * 0.4, -r * 0.1, r * 0.1, r * 0.2);
            g.strokeStyle = 'rgba(239,68,68,.8)'; g.lineWidth = r * 0.07; g.beginPath(); g.moveTo(r * 0.5, 0); g.lineTo(r * 0.95, 0); g.stroke();
            g.restore();
            circle(g, r * 0.73, -r * 0.61, r * 0.22, 'rgba(239,68,68,.35)'); circle(g, r * 0.73, -r * 0.61, r * 0.11, '#ef4444');
        } else if (it === 'milk') {
            g.fillStyle = '#f8fafc'; g.strokeStyle = '#475569'; g.lineWidth = r * 0.07;
            g.beginPath(); g.moveTo(-r * 0.45, -r * 0.35); g.lineTo(-r * 0.1, -r * 0.8); g.lineTo(r * 0.1, -r * 0.8); g.lineTo(r * 0.45, -r * 0.35);
            g.lineTo(r * 0.45, r * 0.85); g.lineTo(-r * 0.45, r * 0.85); g.closePath(); g.fill(); g.stroke();
            g.beginPath(); g.moveTo(-r * 0.45, -r * 0.35); g.lineTo(r * 0.45, -r * 0.35); g.stroke();
            g.fillStyle = '#60a5fa'; g.fillRect(-r * 0.43, r * 0.02, r * 0.86, r * 0.48);
            circle(g, 0, r * 0.32, r * 0.1, '#fff');
            for (i = -1; i <= 1; i++) circle(g, i * r * 0.13, r * 0.14 - (i ? 0 : r * 0.04), r * 0.05, '#fff');
        } else if (it === 'bell') {
            g.fillStyle = '#ef4444'; g.fillRect(-r * 0.12, -r * 0.88, r * 0.24, r * 0.3);
            g.fillStyle = '#facc15'; g.strokeStyle = '#a16207'; g.lineWidth = r * 0.07;
            g.beginPath(); g.moveTo(-r * 0.62, r * 0.45); g.quadraticCurveTo(-r * 0.52, -r * 0.62, 0, -r * 0.64); g.quadraticCurveTo(r * 0.52, -r * 0.62, r * 0.62, r * 0.45); g.closePath(); g.fill(); g.stroke();
            circle(g, 0, r * 0.6, r * 0.15, '#a16207');
            g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = r * 0.09; g.beginPath(); g.arc(-r * 0.05, -r * 0.05, r * 0.38, 3.5, 4.3); g.stroke();
        }
    }
    function itemPic(g, it) {  /* an item, or a dashed ring for none, on a 64 x 64 canvas */
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 64, 64);
        g.setTransform(1, 0, 0, 1, 32, 32);
        if (it) drawIcon(g, it, 27);
        else { g.strokeStyle = '#94a3b8'; g.lineWidth = 3; g.setLineDash([5, 5]); g.beginPath(); g.arc(0, 0, 20, 0, 7); g.stroke(); g.setLineDash([]); }
    }
    function slot() {  /* the held item, in the HUD and on the touch button */
        itemPic(slotG, me.item); itemPic(useG, me.item);
        slotEl.classList.toggle('kk-empty', !me.item); useEl.classList.toggle('kk-empty', !me.item);
    }
    function drawGate() {
        var gi = ALT.gate.i, o = gateOpen(clock), w = ALT.hw + 8, k;
        if (!vis(ALT.x[gi], ALT.y[gi], 90)) return;
        ctx.save(); ctx.translate(ALT.x[gi], ALT.y[gi]); ctx.rotate(ALT.ang[gi]);
        if (MAP.gate === 'farm') {  /* a wooden farm gate in two halves that swing forward */
            for (k = -1; k <= 1; k += 2) {
                ctx.save(); ctx.translate(0, k * w); ctx.rotate(k * o * 1.45);
                ctx.strokeStyle = '#6b3f17'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -k * w); ctx.stroke();
                ctx.strokeStyle = '#c8955a'; ctx.lineWidth = 3.5; ctx.stroke();
                ctx.restore();
                circle(ctx, 0, k * w, 6, '#4a2a0e');
            }
        } else {  /* a striped barrier that lifts, with a blinking light */
            var len = 2 * w * (1 - o * 0.85);
            ctx.fillStyle = '#1f2937'; ctx.fillRect(-8, -w - 10, 16, 14);
            for (k = 0; k < len; k += 12) { ctx.fillStyle = (k / 12) % 2 ? '#f8fafc' : '#ef4444'; ctx.fillRect(-3.5, -w + k, 7, Math.min(12, len - k)); }
            var lit = o < 0.99 && Math.floor(clock * 4) % 2 === 0;
            circle(ctx, 0, -w - 3, 3.8, lit ? '#fbbf24' : '#78350f');
            if (lit) circle(ctx, 0, -w - 3, 10, 'rgba(251,191,36,.3)');
        }
        ctx.restore();
    }
    function drawUnder() {  /* pads, gate, spilt milk, fish tins and laser dots, under the karts */
        var i, b, t, c;
        for (i = 0; i < boosts.length; i++) {
            b = boosts[i];
            if (!vis(b.x, b.y, 30)) continue;
            ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(((clock * 2) % 1) * 36 - 22, -17, 8, 34); ctx.restore();
        }
        if (ALT && ALT.gate && !MAP.gateSoft) drawGate();
        for (i = 0; i < milks.length; i++) {
            var m = milks[i];
            if (!vis(m.x, m.y, 30)) continue;
            ctx.globalAlpha = Math.min(1, m.t * 4, (14 - m.t) / 1.5);
            circle(ctx, m.x, m.y, 22, 'rgba(100,116,139,.35)');
            circle(ctx, m.x, m.y, 20, '#f8fafc'); circle(ctx, m.x + 13, m.y + 7, 10, '#f8fafc'); circle(ctx, m.x - 11, m.y + 9, 9, '#f8fafc');
            circle(ctx, m.x - 6, m.y - 7, 5, '#ffffff'); circle(ctx, m.x + 4, m.y + 2, 6, '#eef2f7');
            ctx.globalAlpha = 1;
        }
        for (i = 0; i < tins.length; i++) {  /* fish tins floating in a bubble */
            t = tins[i];
            if (t.t > 0 || !vis(t.x, t.y, 30)) continue;
            var bob = Math.sin(clock * 3 + i) * 3, sc = 1 + Math.sin(clock * 5 + i) * 0.05;
            ctx.save(); ctx.translate(t.x, t.y);
            ctx.fillStyle = 'rgba(15,23,42,.2)'; ctx.beginPath(); ctx.ellipse(3, 8, 13, 6, 0, 0, 7); ctx.fill();
            ctx.translate(0, bob - 6); ctx.scale(sc, sc);
            circle(ctx, 0, 0, 17, 'rgba(255,255,255,.3)');
            ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.stroke();
            ctx.rotate(Math.sin(clock * 2 + i) * 0.3);
            ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(0, 1, 12, 8, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(0, -0.5, 11.5, 7.2, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#d6336c'; ctx.beginPath(); ctx.ellipse(0, -0.5, 8, 4.6, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-1.5, -0.5, 3.8, 2, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.moveTo(1.8, -0.5); ctx.lineTo(5.5, -3); ctx.lineTo(5.5, 2); ctx.fill();
            ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-8.5, -0.5, 2, 0, 7); ctx.stroke();
            circle(ctx, -6, -9, 2.2, 'rgba(255,255,255,.95)');
            ctx.restore();
        }
        for (i = 0; i < 4; i++) {
            c = karts[i];
            if (c.laser > 0 && c.dotx !== undefined) { circle(ctx, c.dotx, c.doty, 14, 'rgba(239,68,68,.25)'); circle(ctx, c.dotx, c.doty, 5, '#ef4444'); circle(ctx, c.dotx - 1.5, c.doty - 1.5, 1.8, '#fecaca'); }
        }
        drawParts('leaf'); drawParts('card'); drawParts('spark'); drawParts('dust');
    }
    function drawOver() {  /* flying yarn, sleepy Zs and the bell ring, over the karts */
        var i, c;
        for (i = 0; i < yarns.length; i++) {
            var y = yarns[i], h = y.trail;
            if (!vis(y.x, y.y, 60)) continue;
            ctx.strokeStyle = '#db2777'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(y.x, y.y - 4);
            for (var j = h.length - 2; j >= 0; j -= 2) ctx.lineTo(h[j] + Math.sin(j + clock * 20) * 2, h[j + 1] - 4 + Math.cos(j + clock * 20) * 2);
            ctx.stroke();
            circle(ctx, y.x + 2, y.y + 5, 8, 'rgba(15,23,42,.2)');
            ctx.save(); ctx.translate(y.x, y.y - 4); drawYarn(ctx, 9, y.roll, 0); ctx.restore();
        }
        ctx.font = '800 13px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#1e3a8a'; ctx.fillStyle = '#fde047';
        for (i = 0; i < 4; i++) {
            c = karts[i];
            if (!(c.nap > 0) || !vis(c.x, c.y, 40)) continue;
            for (var z = 0; z < 2; z++) {
                var b = (clock * 1.2 + c.phase + z * 0.5) % 1, zx = c.x + 4 + b * 10 - z * 8, zy = c.y - 14 - b * 18;
                ctx.strokeText(z ? 'Z' : 'z', zx, zy); ctx.fillText(z ? 'Z' : 'z', zx, zy);
            }
        }
        for (i = 0; i < rings.length; i++) {
            var rg = rings[i];
            ctx.globalAlpha = Math.max(0, 1 - rg.t / 0.8); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(rg.who.x, rg.who.y, 20 + rg.t * 480, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        }
    }
    function draw() {
        var k = dpr * zoom, cw = cv.width, ch = cv.height, i;
        var cx = camX + (shake ? (Math.random() - 0.5) * shake : 0), cy = camY + (shake ? (Math.random() - 0.5) * shake : 0);
        var ox = Math.round(cx * k - cw / 2), oy = Math.round(cy * k - ch / 2);   /* view offset in device pixels */
        VX0 = ox / k; VY0 = oy / k; VX1 = (ox + cw) / k; VY1 = (oy + ch) / k;
        if (MAP.sky) MAP.drawSky(cw, ch, k);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (Math.abs(res - k) < 0.01 && ox >= 0 && oy >= 0 && ox + cw <= track.width && oy + ch <= track.height) {
            ctx.drawImage(track, ox, oy, cw, ch, 0, 0, cw, ch);  /* the usual case: a plain copy, no scaling */
        } else {                                                 /* track cache capped, or the window is larger than the field */
            if (!MAP.sky) { ctx.fillStyle = MAP.col.bg; ctx.fillRect(0, 0, cw, ch); }
            var hw = cw / 2 / k, hh = ch / 2 / k, x0 = Math.max(0, Math.floor(cx - hw)), y0 = Math.max(0, Math.floor(cy - hh));
            var x1 = Math.min(WW, Math.ceil(cx + hw)), y1 = Math.min(WH, Math.ceil(cy + hh));
            ctx.setTransform(k, 0, 0, k, cw / 2 - cx * k, ch / 2 - cy * k);
            if (x1 > x0 && y1 > y0) ctx.drawImage(track, x0 * res, y0 * res, (x1 - x0) * res, (y1 - y0) * res, x0, y0, x1 - x0, y1 - y0);
        }
        ctx.setTransform(k, 0, 0, k, -ox, -oy);
        if (MAP.under) MAP.under();
        drawUnder();
        for (i = 3; i >= 0; i--) if (!(karts[i].z > 0)) drawKart(karts[i]);
        for (i = 3; i >= 0; i--) if (karts[i].z > 0) drawKart(karts[i]);
        if (split) { tag(karts[0], 'P1', '#d6336c'); tag(karts[1], 'P2', '#1e3a8a'); }  /* split screen: both players */
        else if (pal && vis(pal.x, pal.y, 40)) {  /* racing a friend: their kart has a name tag */
            ctx.font = '800 12px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#1e3a8a';
            ctx.strokeText('Friend', pal.x, pal.y - 22 - pal.z * 0.5); ctx.fillText('Friend', pal.x, pal.y - 22 - pal.z * 0.5);
        }
        drawOver();
        if (MAP.over) MAP.over();
        if (MAP.screen) MAP.screen();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);  /* minimap, top right */
        var mw = WW * mmK, mh = WH * mmK, mx = W - mw - 10, my = 10;
        ctx.fillStyle = MAP.col.panel; rrect(mx - 6, my - 6, mw + 12, mh + 12, 12); ctx.fill();
        ctx.drawImage(mini, mx, my, mw, mh);
        for (i = 3; i >= 0; i--) {
            var c = karts[i], you = c === me;
            ctx.beginPath(); ctx.arc(mx + c.x * mmK, my + c.y * mmK, you || (split && i < 2) ? 4.5 : 3.5, 0, 7);
            ctx.fillStyle = split ? c.body : you || c === pal ? c.fur : c.body; ctx.fill();
            ctx.strokeStyle = you ? OL : '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        }
    }
    function setText(el, key, v) { if (shown[key] !== v) { shown[key] = v; el.textContent = v; } }
    function show() {
        setText(posEl, 'pos', ordinal(place));
        setText(lapEl, 'lap', Math.min(LAPS, laps(me) + 1) + '/' + LAPS);
        var t = (me.fin || raceTime).toFixed(1);
        if (shown.time !== t) { setText(timeEl, 'time', t); api.score(t, 'Time'); }
    }
    function count(text, cls) {
        if (shown.count === text) return;
        shown.count = text;
        countEl.textContent = text;
        countEl.className = 'kk-count' + (cls ? ' ' + cls : '');
        if (text && !api.reducedMotion) { void countEl.offsetWidth; countEl.classList.add('kk-pop'); }
    }

    /* ---------- the loop ---------- */
    var test = window.__errors ? (window.__kk = { bot: false, steps: 1, alt: null, stats: {}, level: LEVEL }) : null;  /* only on the test page */
    if (test) test.state = function () { return { phase: phase, map: MAP.id, lap: laps(me), place: place, time: raceTime, item: me.item, idx: me.idx, alt: me.alt, ai: me.ai, altn: ALT ? ALT.n : 0, storm: !!(MAP.storm && MAP.storm.on > 1.2 && MAP.storm.on < 3.8), yarns: yarns.length, milks: milks.length, fx: yarns.concat(milks, karts.filter(function (c) { return c.shield > 0 || c.tangled > 0 || c.nap > 0 || c.laser > 0; })).filter(function (o) { return Math.hypot(o.x - me.x, o.y - me.y) < 300; }).length, met: MAP.met ? MAP.met.filter(function (m) { return m.t < 1.5 && Math.hypot(m.x - me.x, m.y - me.y) < 260; }).length : 0, fin: karts.map(function (c) { return c.fin; }) }; };
    function stat(k) { if (test) test.stats[k] = (test.stats[k] || 0) + 1; }
    function update(dt) {
        if (remote) { view(dt); return; }  /* the friend's device only shows the race (Duo part below) */
        clock += dt;
        if (MAP.update) MAP.update(dt);
        moveParts(dt);
        if (phase === 'pick') return;
        if (phase === 'count') {  /* 3, 2, 1, Go */
            var n = 3 - Math.floor(clock - 0.6);
            if (clock >= 0.6 && n >= 1 && shown.count !== String(n)) { count(String(n)); api.sfx('tap'); }
            if (n < 1) { phase = 'race'; count('Go!', 'kk-go'); api.sfx('point'); hintEl.style.display = 'none'; }
        } else {
            if (phase === 'done' && (test || duo || split) && finishers < 4) raceTime += dt;  /* test only, and racing a friend: time the others too */
            if (phase === 'race') {
                raceTime += dt;
                if (me.fin) autopilot(me, 0.45);  /* racing a friend: the race goes on after you finish */
                else if (test && test.bot) {  /* test only: the player bot, basic (the old driver) or perfect (the smart one) */
                    me.P = test.mode === 'perfect' ? PERFECT : null;
                    decide(me);
                    if (me.P) smart(me, PERFECT, 1); else autopilot(me, 0.98);
                    if (test.items !== false) { if (me.P) aiItemSmart(me, dt); else aiItem(me, dt); }
                    if (!me.on) test.stats.offT = (test.stats.offT || 0) + dt;
                }
                else {
                    me.thr = (keys.up || pads.up ? 1 : 0) - (keys.down || pads.down ? 1 : 0);
                    var want = (keys.right || pads.right ? 1 : 0) - (keys.left || pads.left ? 1 : 0);
                    me.steer += (want - me.steer) * Math.min(1, dt * 10);
                    if (me.laser > 0) me.steer = me.steer * 0.3 + 0.7 * clamp(wrap(Math.atan2(me.doty - me.y, me.dotx - me.x) - me.a) * 3, -1, 1);
                }
            } else autopilot(me, 0.45);  /* after the finish: a slow lap of honour */
            for (var i = 1; i < 4; i++) {
                var c = karts[i];  /* a little rubber band: the others ease off when far ahead and push when behind */
                if (c === pal) { steerPal(dt); continue; }
                decide(c);
                if (c.fin) autopilot(c, 0.6);
                else if (c.P) { smart(c, c.P, catchUp(c)); aiItemSmart(c, dt); }
                else { autopilot(c, c.skill * (1 + clamp((lead().prog - c.prog) / (SEG * 30), -0.07, 0.05))); aiItem(c, dt); }
            }
            for (i = 0; i < 4; i++) step(karts[i], dt);
            collide();
            for (i = 0; i < 4; i++) progress(karts[i]);
            pickups(dt);
            moveItems(dt);
            if (split) splitPlaces(dt);  /* each player's place and wrong way warning, in their own half */
            else if (phase === 'race' && !me.fin) {
                var p = 1;
                for (i = 1; i < 4; i++) if (karts[i].fin || karts[i].prog > me.prog) p++;
                if (p !== place && clock - lastSay > 6) {
                    if (p === 1) { api.cat('happy'); say('Purr! You took the lead!'); }
                    else if (p < place) { api.cat('wow'); say('Nice pass!'); }
                    else if (p === 2 && place === 1) { api.cat('sad'); say('Hiss! Catch them!'); }
                }
                place = p;
                var wrong = Math.abs(wrap(me.a - me.ang)) > 2.1 && me.vf > 20 && !(me.spin > 0) && !(me.fall > 0);
                wrongFor = wrong ? wrongFor + dt : 0;
                if (clock > 5) count(wrongFor > 0.8 ? 'Wrong way!' : '', 'kk-warn');
            }
            if (clock > 4.4 && shown.count === 'Go!') count('');
        }
        camX += (me.x + me.vx * 0.4 - camX) * Math.min(1, dt * 4);
        camY += (me.y + me.vy * 0.4 - camY) * Math.min(1, dt * 4);
        shake = Math.max(0, shake - dt * 20);
        if (split) {  /* player 2's view follows player 2 the same way */
            var v2 = views[1];
            v2.camX += (pal.x + pal.vx * 0.4 - v2.camX) * Math.min(1, dt * 4);
            v2.camY += (pal.y + pal.vy * 0.4 - v2.camY) * Math.min(1, dt * 4);
            v2.shake = Math.max(0, v2.shake - dt * 20);
        }
    }
    api.loop(function (dt, now) {
        for (var s = test ? test.steps : 1; s > 0; s--) update(dt);
        if (split) { splitFrame(); return; }  /* two views, two HUDs */
        var vw = W / 2 / zoom, vh = H / 2 / zoom;  /* keep the view inside the field */
        camX = vw * 2 < WW ? clamp(camX, vw, WW - vw) : WW / 2;
        camY = vh * 2 < WH ? clamp(camY, vh, WH - vh) : WH / 2;
        draw();
        show();
        if (duo) duoTick(now);
    });

    /* ---------- controls: keys on desktop, buttons on touch screens ---------- */
    var KEYMAP = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
    api.on(window, 'keydown', function (e) {
        if (split) { splitKey(e, true); return; }  /* two players: keys by where they sit on the keyboard */
        var key = (e.key || '').toLowerCase(), k = KEYMAP[key];
        if (duo && wrapEl.classList.contains('kk-lobby-on')) return;  /* typing a code, or reading the lobby */
        if (phase === 'pick') {  /* in the picker: arrows choose, Enter or Space races */
            if (k) {
                var cols = FW < 600 ? 2 : 4;
                choose(sel + (k === 'left' ? -1 : k === 'right' ? 1 : k === 'up' ? -cols : cols));
                if (wrapEl.contains(document.activeElement)) cards[sel].focus();
                e.preventDefault();
            }
            else if (key === 'enter' || key === ' ') { e.preventDefault(); go(); }
            return;
        }
        if (key === ' ' || key === 'shift') { e.preventDefault(); useItem(me); return; }
        if (k) { keys[k] = true; e.preventDefault(); }
    });
    api.on(window, 'keyup', function (e) { if (split) { splitKey(e, false); return; } var k = KEYMAP[(e.key || '').toLowerCase()]; if (k) keys[k] = false; });
    api.on(window, 'blur', function () { keys = {}; keys2 = {}; });
    api.on(useEl, 'pointerdown', function (e) { e.preventDefault(); useItem(me); });
    api.on(useEl, 'contextmenu', function (e) { e.preventDefault(); });
    Array.prototype.forEach.call(wrapEl.querySelectorAll('.kk-btn[data-k]'), function (b) {
        function set(on) { return function (e) { e.preventDefault(); pads[b.dataset.k] = on; b.classList.toggle('kk-on', on); }; }
        api.on(b, 'pointerdown', set(true));
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { api.on(b, t, set(false)); });
        api.on(b, 'contextmenu', function (e) { e.preventDefault(); });
    });
    api.on(wrapEl, 'pointerdown', function (e) {  /* a touch screen the media query missed */
        if (e.pointerType === 'touch' && !wrapEl.classList.contains('kk-touch')) {
            wrapEl.classList.add('kk-touch'); hintEl.textContent = TOUCH_HINT;
        }
    });

    /* ---------- Kitty Kart Duo: a race with a friend on another device ----------
       One player hosts and gets a four letter code from the site's counter (api.server, tools/stats-worker/worker.js);
       the friend types it in. The counter only passes the two WebRTC offers on, then forgets them; from then on the two
       devices talk directly over two data channels: "fast" (unordered, never resent) for the friend's keys and the
       host's snapshots, "sure" (reliable, in order) for what must arrive: start, go, sounds and speech, leaving.
       The host runs the race as if alone, with the friend's kart (pal, karts[1]) steered by the keys they send. The
       friend's device runs no race at all: it shows the host's snapshots (30 a second) LAG seconds late, blending the
       two around that moment so that everything moves smoothly. Nothing is saved: no best times, no last track. */
    var LAG = 0.1, SNAP_MS = 33, KF = 13, ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }], PH = ['pick', 'count', 'race', 'done'];
    var SERVER = (api.server || '').replace(/\/+$/, '');
    var pc = null, fast = null, sure = null, gen = 0, linked = false, role = '', roomCode = null, codeAt = 0, heard = 0;
    var raceNo = 0, ready = false, snapAt = 0, snapSeq = 0, yarnId = 0, doneAt = 0, myDone = false, palUsed = 0;
    var palIn = { thr: 0, want: 0, use: 0, seq: 0, at: 0 };
    var snaps = [], vclock = -1, lastSeq = 0, cd = -1, sinceGo = 0, uses = 0, inSeq = 0, sentAt = 0, heldItem = null, resKey = '';
    var duoLevel = 'normal', lobbyEl = null, resEl = null, pickBack = null, acts = [];
    var CAT_NAMES = [null, null, 'Black cat', 'White cat'];
    var FAIL = {
        nocode: ['Code not found', 'There is no race with that code, or it has expired (codes last two minutes). Check the letters, or ask your friend for a new code.'],
        taken: ['That race is taken', 'Someone already joined with this code. Ask your friend for a new one.'],
        direct: ['Could not connect', 'Your two devices could not reach each other directly. Kitty Kart Duo needs both on the same ' +
            'home wifi; a phone\'s hotspot, two mobile networks, VPNs and some university, hotel or café networks keep devices apart. ' +
            'To play on one phone, the two of you sharing it, use Kitty Kart Split Screen.'],
        server: ['Could not reach the server', 'Check your internet connection and try again.'],
        full: ['Too many races right now', 'Please try again in a minute.'],
        none: ['Not available here', 'Racing a friend needs the site\'s small server, which this copy of the site does not have.'],
        old: ['Not in this browser', 'Racing a friend needs WebRTC, which this browser does not offer. A current Firefox, Chrome or Safari has it.']
    };
    if (duo) {
        try { var pref = JSON.parse(localStorage.getItem('kitty-kart-duo')); if (pref && /^(easy|normal|hard)$/.test(pref.level)) duoLevel = pref.level; } catch (e) { /* none yet */ }
        lobbyEl = document.createElement('div');
        lobbyEl.className = 'kk-lobby';
        lobbyEl.innerHTML = '<div class="kk-pick-box kk-lb" role="dialog" aria-label="Race a friend">' +
            '<section data-s="menu"><h3>Race a friend</h3><p class="kk-lb-p">Open this game on two phones or computers, <b>both on the same home wifi</b>. ' +
            'One of you hosts and gets a code, the other joins with it, and the race runs straight between your two devices.</p>' +
            '<p class="kk-lb-p kk-lb-wifi">A phone\'s hotspot, two mobile networks, VPNs and some university, hotel or café networks will not work. ' +
            'To play on one phone, the two of you sharing it, use <a href="#play/kitty-kart-split">Kitty Kart Split Screen</a> instead: no network needed.</p>' +
            '<div class="kk-lb-row"><button type="button" class="kk-lb-btn kk-lb-big" data-a="host">Host a race</button>' +
            '<button type="button" class="kk-lb-btn kk-lb-big" data-a="join">Join a race</button></div>' +
            '<p class="kk-lb-small">Your two devices see each other\'s network address, as with any direct connection. <a href="/privacy/">Privacy</a></p></section>' +
            '<section data-s="code"><h3>Your race code</h3><p class="kk-code"></p>' +
            '<p class="kk-lb-p">Read it out to your friend. They open this game, tap Join a race and type it.</p>' +
            '<p class="kk-lb-wait">Waiting for your friend…</p><div class="kk-lb-row"><button type="button" class="kk-lb-btn" data-a="menu">Cancel</button></div></section>' +
            '<section data-s="join"><h3>Join a race</h3><p class="kk-lb-p">Type the code shown on your friend\'s screen.</p>' +
            '<div class="kk-lb-row"><input class="kk-in" type="text" maxlength="4" autocomplete="off" autocorrect="off" autocapitalize="characters" ' +
            'spellcheck="false" enterkeyhint="go" aria-label="Race code"><button type="button" class="kk-lb-btn kk-lb-go" data-a="go">Join</button></div>' +
            '<p class="kk-lb-err" role="alert"></p><div class="kk-lb-row"><button type="button" class="kk-lb-btn" data-a="menu">Back</button></div></section>' +
            '<section data-s="msg"><h3></h3><p class="kk-lb-p"></p><div class="kk-lb-row"></div></section></div>';
        wrapEl.appendChild(lobbyEl);
        resEl = document.createElement('div');
        resEl.className = 'kk-res';
        resEl.innerHTML = '<div class="kk-pick-box kk-lb" role="dialog" aria-label="Results"><h3>Results</h3><ol class="kk-res-list"></ol>' +
            '<p class="kk-lb-p kk-res-note"></p><div class="kk-lb-row"><button type="button" class="kk-lb-btn kk-lb-go" data-a="again">Rematch</button>' +
            '<button type="button" class="kk-lb-btn" data-a="new">New track</button><button type="button" class="kk-lb-btn" data-a="leave">Leave</button></div></div>';
        wrapEl.appendChild(resEl);
        /* the track picker, for the host: also the computer cats' level, and a way back */
        var pickBox = wrapEl.querySelector('.kk-pick-box'), lv = document.createElement('div');
        pickBox.querySelector('h3').textContent = 'Pick a track for your race';
        lv.className = 'kk-lvl';
        lv.innerHTML = '<span>Computer cats</span><button type="button" data-l="easy">Easy</button><button type="button" data-l="normal">Normal</button><button type="button" data-l="hard">Hard</button>';
        pickBox.insertBefore(lv, mapsEl);
        pickBack = document.createElement('button');
        pickBack.type = 'button'; pickBack.className = 'kk-lb-btn kk-pick-back'; pickBack.textContent = 'Back';
        pickBox.appendChild(pickBack);
        var levelBtns = function () { Array.prototype.forEach.call(lv.querySelectorAll('button'), function (b) { b.classList.toggle('kk-sel', b.dataset.l === duoLevel); }); };
        levelBtns();
        api.on(lv, 'click', function (e) { var b = e.target.closest('button'); if (b) { duoLevel = b.dataset.l; levelBtns(); } });
        api.on(pickBack, 'click', function () { menu(); });
        api.on(lobbyEl, 'click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            var a = b.dataset.a;
            if (a === 'host') {
                if (!SERVER) fail('none'); else if (!window.RTCPeerConnection) fail('old'); else showPicker();
            } else if (a === 'join') {
                if (!SERVER) fail('none'); else if (!window.RTCPeerConnection) fail('old'); else joinScreen();
            } else if (a === 'go') joinRoom();
            else if (a === 'menu') menu();
            else if (b.dataset.i) acts[+b.dataset.i]();
        });
        var codeIn = lobbyEl.querySelector('.kk-in');
        api.on(codeIn, 'input', function () {
            var v = codeIn.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
            if (v !== codeIn.value) codeIn.value = v;
            lobbyEl.querySelector('.kk-lb-err').textContent = '';
        });
        api.on(codeIn, 'keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); joinRoom(); } });
        api.on(resEl, 'click', function (e) {
            var b = e.target.closest('button');
            if (!b || b.disabled) return;
            if (b.dataset.a === 'again') startRace();
            else if (b.dataset.a === 'new') { send({ t: 'pick' }); showPicker(); }
            else if (b.dataset.a === 'leave') leave();
        });
        /* silence: no word from the friend for 5 s means they are gone (a little grace after this tab was hidden) */
        api.interval(function () {
            if (!linked) return;
            send({ t: 'ping' });
            if (performance.now() - heard > 5000) lost();
        }, 1000);
        api.on(document, 'visibilitychange', function () { if (!document.hidden) heard = Math.max(heard, performance.now() - 3000); });
        api.on(window, 'pagehide', function () { if (linked) send({ t: 'bye' }); if (roomCode) closeRoom(); });
        lobby('menu');
    }

    /* the lobby: one of its parts at a time (menu, code, join, msg), or none */
    function lobby(name) {
        wrapEl.classList.toggle('kk-lobby-on', !!name);
        Array.prototype.forEach.call(lobbyEl.querySelectorAll('section'), function (s) { s.classList.toggle('kk-on', s.dataset.s === name); });
    }
    function msg(title, text, list) {  /* a message with buttons: list of [label, action, main] */
        var s = lobbyEl.querySelector('[data-s="msg"]'), row = s.querySelector('.kk-lb-row');
        s.querySelector('h3').textContent = title;
        s.querySelector('p').textContent = text;
        row.innerHTML = '';
        acts = [];
        list.forEach(function (o, i) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'kk-lb-btn' + (o[2] ? ' kk-lb-go' : ''); b.textContent = o[0]; b.dataset.i = i;
            acts.push(o[1]); row.appendChild(b);
        });
        lobby('msg');
    }
    function menu() { teardown(true); lobby('menu'); }
    function joinScreen() {
        teardown(true);
        lobby('join');
        var inp = lobbyEl.querySelector('.kk-in');
        lobbyEl.querySelector('.kk-lb-err').textContent = '';
        try { inp.focus(); } catch (e) { /* fine */ }
    }
    function showPicker() {  /* the host picks a track (and, before a friend is there, the level of the computer cats) */
        phase = 'pick'; ready = false;
        wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
        lobby(null);
        wrapEl.querySelector('.kk-pick-tip').textContent = (api.touch ? 'Tap a track' : 'Click a track, or arrows and Enter') + (linked ? ' to race' : ' to get your code');
        pickBack.hidden = linked;
        wrapEl.querySelector('.kk-lvl').hidden = linked;
    }
    function picked() {
        try { localStorage.setItem('kitty-kart-duo', JSON.stringify({ level: duoLevel })); } catch (e) { /* private mode: fine */ }
        if (linked) startRace(); else hostRoom();
    }
    /* the ways to reach a device that its description offers, e.g. "2 local (hidden), 1 public": for the details line */
    function ways(d) {
        var n = { ip: 0, mdns: 0, srflx: 0, relay: 0 }, out = [];
        ((d && d.sdp) || '').split('\n').forEach(function (l) {
            var m = /^a=candidate:\S+ \d+ \S+ \d+ (\S+) \d+ typ (\w+)/.exec(l);
            if (!m) return;
            if (m[2] === 'host') n[/\.local$/.test(m[1]) ? 'mdns' : 'ip']++; else if (m[2] === 'srflx' || m[2] === 'prflx') n.srflx++; else n.relay++;
        });
        if (n.ip) out.push(n.ip + ' local');
        if (n.mdns) out.push(n.mdns + ' local (hidden)');
        if (n.srflx) out.push(n.srflx + ' public');
        if (n.relay) out.push(n.relay + ' relay');
        return out.length ? out.join(', ') : 'none';
    }
    function fail(kind) {
        var was = role, text = FAIL[kind][1];
        if (kind === 'direct' && pc) text += ' Details: this device offered ' + ways(pc.localDescription) + '; your friend\'s ' +
            ways(pc.remoteDescription) + '; state ' + pc.iceConnectionState + '.';
        teardown(true);
        var again = kind === 'none' || kind === 'old' ? [] : [[kind === 'nocode' || kind === 'taken' ? 'Try another code' : 'Try again', was === 'guest' ? joinScreen : was === 'host' ? hostRoom : menu, 1]];
        msg(FAIL[kind][0], text, again.concat([['Back to the lobby', menu]]));
    }
    function lost() {  /* the friend left, closed the game or lost the connection */
        teardown(true);
        msg('Your friend left', 'The connection to your friend has ended.', [['Back to the lobby', menu, 1]]);
    }
    function leave() { send({ t: 'bye' }); menu(); }

    /* ---------- signalling: the counter passes the offer and the answer on ---------- */
    function ask(method, path, body) {
        return fetch(SERVER + path, { method: method, cache: 'no-store', credentials: 'omit',
            headers: body ? { 'Content-Type': 'text/plain' } : {}, body: body ? JSON.stringify(body) : null })
            .then(function (r) {
                if (r.status !== 200) return { status: r.status };
                return r.json().then(function (d) { return { status: 200, data: d || {} }; });
            });
    }
    function closeRoom() {  /* the host stops waiting: the counter deletes the room now rather than after two minutes */
        var c = roomCode;
        roomCode = null;
        try { fetch(SERVER + '/room/' + c + '/close', { method: 'POST', keepalive: true, cache: 'no-store', credentials: 'omit' }).catch(function () {}); } catch (e) { /* offline */ }
    }
    function peer() {
        var p = new RTCPeerConnection({ iceServers: ICE }), g = gen;
        fast = p.createDataChannel('fast', { negotiated: true, id: 0, ordered: false, maxRetransmits: 0 });
        sure = p.createDataChannel('sure', { negotiated: true, id: 1 });
        fast.onmessage = function (e) { if (g === gen) { heard = performance.now(); onFast(e.data); } };
        sure.onmessage = function (e) { if (g === gen) { heard = performance.now(); onSure(e.data); } };
        sure.onopen = function () { if (g === gen) linkUp(); };
        sure.onclose = function () { if (g === gen && linked) lost(); };
        p.onconnectionstatechange = function () { if (g === gen && p.connectionState === 'failed') { if (linked) lost(); else fail('direct'); } };
        return p;
    }
    function gathered(p) {  /* the description is sent once, with every way to reach this device: wait for them (4 s at most) */
        return new Promise(function (done) {
            if (p.iceGatheringState === 'complete') { done(); return; }
            api.timeout(done, 4000);
            p.addEventListener('icegatheringstatechange', function () { if (p.iceGatheringState === 'complete') done(); });
        });
    }
    function linkWait(g) { api.timeout(function () { if (g === gen && !linked) fail('direct'); }, 15000); }
    function hostRoom() {
        teardown(true);
        var g = gen;
        role = 'host';
        msg('Getting a code', 'One moment…', [['Cancel', menu]]);
        pc = peer();
        pc.createOffer().then(function (o) { return g === gen ? pc.setLocalDescription(o) : null; })
            .then(function () { return g === gen ? gathered(pc) : null; })
            .then(function () { return g === gen ? ask('POST', '/room', { offer: pc.localDescription.sdp }) : null; })
            .then(function (r) {
                if (!r || g !== gen) return;
                if (r.status !== 200 || !/^[A-Z]{4}$/.test(r.data.code)) { fail(r.status === 503 ? 'full' : 'server'); return; }
                roomCode = r.data.code; codeAt = Date.now();
                lobbyEl.querySelector('.kk-code').textContent = roomCode;
                lobby('code');
                api.timeout(function () { waitAnswer(g); }, 1200);
            })
            .catch(function () { if (g === gen) fail('server'); });
    }
    function waitAnswer(g) {  /* the host asks every 1.2 s whether the friend has answered */
        if (g !== gen || !roomCode) return;
        if (Date.now() - codeAt > 115000) { expired(); return; }
        ask('GET', '/room/' + roomCode + '/answer').then(function (r) {
            if (g !== gen) return;
            if (r.status === 204) { api.timeout(function () { waitAnswer(g); }, 1200); return; }
            if (r.status !== 200 || typeof r.data.answer !== 'string') { roomCode = null; expired(); return; }
            roomCode = null;  /* the counter has deleted the room */
            msg('Connecting', 'Your friend is joining…', [['Cancel', menu]]);
            pc.setRemoteDescription({ type: 'answer', sdp: r.data.answer }).then(function () { linkWait(g); }, function () { if (g === gen) fail('direct'); });
        }, function () { if (g === gen) api.timeout(function () { waitAnswer(g); }, 2500); });  /* a hiccup: ask again */
    }
    function expired() {
        teardown(true);
        msg('Your code expired', 'Codes last two minutes. Get a new one when your friend is ready.', [['New code', hostRoom, 1], ['Back to the lobby', menu]]);
    }
    function joinRoom() {
        var c = lobbyEl.querySelector('.kk-in').value.toUpperCase().replace(/[^A-Z]/g, '');
        if (c.length !== 4) { lobbyEl.querySelector('.kk-lb-err').textContent = 'The code has four letters.'; return; }
        teardown(true);
        var g = gen;
        role = 'guest';
        msg('Joining', 'Looking for the race…', [['Cancel', joinScreen]]);
        ask('GET', '/room/' + c).then(function (r) {
            if (g !== gen) return null;
            if (r.status !== 200 || typeof r.data.offer !== 'string') { fail(r.status === 404 ? 'nocode' : 'server'); return null; }
            pc = peer();
            return pc.setRemoteDescription({ type: 'offer', sdp: r.data.offer })
                .then(function () { return pc.createAnswer(); })
                .then(function (a) { return pc.setLocalDescription(a); })
                .then(function () { return gathered(pc); })
                .then(function () { return g === gen ? ask('POST', '/room/' + c, { answer: pc.localDescription.sdp }) : null; })
                .then(function (r2) {
                    if (!r2 || g !== gen) return;
                    if (r2.status !== 204) { fail(r2.status === 404 ? 'nocode' : r2.status === 409 ? 'taken' : 'server'); return; }
                    msg('Connecting', 'Almost there…', [['Cancel', menu]]);
                    linkWait(g);
                });
        }).catch(function () { if (g === gen) fail('server'); });
    }
    /* back to no friend: closes the connection; fresh: also puts the track back as in the lobby (not when the game closes) */
    function teardown(fresh) {
        gen++;
        if (roomCode) closeRoom();
        var p = pc;
        linked = ready = false; pc = fast = sure = null; role = '';
        if (p) try { p.close(); } catch (e) { /* already closed */ }
        host = remote = false; pal = null; me = karts[0];
        snaps = []; vclock = -1; cd = -1; sinceGo = 0; myDone = false;
        if (!fresh) return;
        phase = 'pick'; keys = {}; pads = {}; raceTime = 0; place = 4;
        Array.prototype.forEach.call(wrapEl.querySelectorAll('.kk-on'), function (b) { if (b.dataset.k) b.classList.remove('kk-on'); });
        wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
        count(''); hintEl.style.display = '';
        choose(sel);
    }

    /* ---------- the two devices linked ---------- */
    function send(o) { if (sure && sure.readyState === 'open') try { sure.send(JSON.stringify(o)); } catch (e) { /* closing */ } }
    function tell(k, v) { send({ t: 'fx', k: k, v: v }); }
    function linkUp() {
        linked = true; heard = performance.now();
        if (role === 'host') { host = true; pal = karts[1]; startRace(); }
        else { remote = true; me = karts[1]; pal = karts[0]; slot(); msg('Connected', 'Your friend is starting the race…', [['Leave', leave]]); }
    }
    function startRace() {  /* the host: the picked track, for both */
        raceNo++; ready = false;
        LEVEL = duoLevel;
        choose(sel);
        phase = 'pick';
        wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
        send({ t: 'start', n: raceNo, map: MAP.id });
        msg('Get ready', 'Waiting for your friend\'s screen…', [['Leave', leave]]);
    }
    function begin() {  /* both: the countdown starts (the host's "go" reaches the friend a moment later) */
        raceTime = 0; finishers = 0; place = 4; wrongFor = 0; shake = 0; lastSay = -99; doneAt = 0; myDone = false; sinceGo = 0; resKey = '';
        phase = 'count'; clock = 0; keys = {};
        count(''); hintEl.style.display = '';
        lobby(null);
        wrapEl.classList.remove('kk-picking', 'kk-res-on');
        if (document.activeElement && wrapEl.contains(document.activeElement)) document.activeElement.blur();
        api.sfx('tap');
        if (host) { send({ t: 'go', n: raceNo }); ready = true; palIn = { thr: 0, want: 0, use: palIn.use, seq: 0, at: 0 }; palUsed = palIn.use; }
        else cd = 0;
    }
    function onSure(text) {
        var m, i;
        try { m = JSON.parse(text); } catch (e) { return; }
        if (!m || typeof m !== 'object') return;
        if (m.t === 'bye') { lost(); return; }
        if (host) { if (m.t === 'ready' && m.n === raceNo && phase === 'pick') begin(); return; }
        if (!remote) return;
        if (m.t === 'start' && typeof m.n === 'number') {
            for (i = 0; i < MAPS.length && MAPS[i].id !== m.map; i++);
            if (i === MAPS.length) return;
            raceNo = m.n; snaps = []; vclock = -1; lastSeq = 0; myDone = false; heldItem = null; cd = -1; sinceGo = 0;
            phase = 'pick';
            wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
            choose(i);
            msg('Get ready', MAP.name + ', three laps.', [['Leave', leave]]);
            send({ t: 'ready', n: raceNo });
        } else if (m.t === 'go' && m.n === raceNo) begin();
        else if (m.t === 'pick') {
            wrapEl.classList.remove('kk-res-on');
            msg('Your friend is picking a track', 'The next race starts as soon as they choose.', [['Leave', leave]]);
        } else if (m.t === 'fx') {
            if (m.k === 's' && /^(tap|pop|point|hit|jump|move)$/.test(m.v)) api.sfx(m.v);
            else if (m.k === 'c' && /^(happy|sad|wow)$/.test(m.v)) api.cat(m.v);
            else if (m.k === 't' && typeof m.v === 'string') say(m.v.slice(0, 80));
            else if (m.k === 'k' && typeof m.v === 'number') { api.sfx('hit'); if (!api.reducedMotion) shake = Math.min(6, m.v / 25); }
        }
    }
    function onFast(text) {
        var m;
        try { m = JSON.parse(text); } catch (e) { return; }
        if (!Array.isArray(m) || m[0] !== raceNo || typeof m[1] !== 'number') return;
        if (host) {  /* the friend's keys: [race, number, throttle, steering, items used so far] */
            if (m[1] <= palIn.seq) return;
            palIn.seq = m[1]; palIn.at = performance.now();
            palIn.thr = clamp(+m[2] || 0, -1, 1); palIn.want = clamp(+m[3] || 0, -1, 1);
            var u = Math.floor(+m[4] || 0);
            if (u > palIn.use) palIn.use = u;
        } else if (remote) {  /* a snapshot, see pack */
            if (m[1] <= lastSeq || m.length < 11 || !Array.isArray(m[6]) || m[6].length !== 4 * KF) return;
            lastSeq = m[1];
            snaps.push(m);
            if (snaps.length > 30) snaps.shift();
        }
    }
    function steerPal(dt) {  /* the host drives the friend's kart with the keys they send (none for a moment: let go) */
        var c = pal, fresh = performance.now() - palIn.at < 400;
        if (c.fin || phase !== 'race') { autopilot(c, 0.45); return; }
        if (split) { drive2(dt); return; }  /* split screen: player 2's keys on this keyboard */
        c.thr = fresh ? palIn.thr : 0;
        c.steer += ((fresh ? palIn.want : 0) - c.steer) * Math.min(1, dt * 10);
        if (c.laser > 0) c.steer = c.steer * 0.3 + 0.7 * clamp(wrap(Math.atan2(c.doty - c.y, c.dotx - c.x) - c.a) * 3, -1, 1);
        if (palIn.use > palUsed) { palUsed = palIn.use; useItem(c); }
    }
    function rd(v, k) { return Math.round(v * k) / k; }
    /* a snapshot: [race, number, clock, race time, phase, fish tins taken (bits), karts (KF numbers each), yarn balls
       (id, x, y, roll), spilt milk (x, y, age), bell rings (kart, age), the track's moving hazards (see hzPack)] */
    function pack() {
        var ks = [], ys = [], ms = [], rs = [], mask = 0, i, c;
        for (i = 0; i < 4; i++) {
            c = karts[i];
            ks.push(rd(c.x, 10), rd(c.y, 10), rd(wrap(c.a), 1000), rd(Math.max(0, c.z), 10), Math.round(c.vx), Math.round(c.vy), rd(c.steer, 100),
                (c.boost > 0 ? 1 : 0) | (c.shield > 0 ? 2 : 0) | (c.tangled > 0 ? 4 : 0) | (c.nap > 0 ? 8 : 0) | (c.laser > 0 ? 16 : 0) | (c.dotS > 0 ? 32 : 0) | (c.spin > 0 ? 64 : 0),
                c.fall > 0 ? rd(c.fall, 100) : 0, c.k, rd(c.prog, 10), rd(c.fin, 100), c.item ? ITEMS.indexOf(c.item) + 1 : 0);
        }
        for (i = 0; i < tins.length; i++) if (tins[i].t > 0) mask |= 1 << i;
        yarns.forEach(function (y) { if (!y.id) y.id = ++yarnId; ys.push(y.id, rd(y.x, 10), rd(y.y, 10), rd(y.roll % 6.2832, 100)); });
        milks.forEach(function (m) { ms.push(rd(m.x, 10), rd(m.y, 10), rd(m.t, 10)); });
        rings.forEach(function (g) { rs.push(karts.indexOf(g.who), rd(g.t, 100)); });
        return [raceNo, ++snapSeq, rd(clock, 1000), rd(raceTime, 100), PH.indexOf(phase), mask, ks, ys, ms, rs, hzPack()];
    }
    function hzPack() {  /* what moves on the track and is not worked out from the clock alone */
        var m = MAP, out = [];
        if (m === CITY) {
            out.push(rd(m.tram.s, 10), m.tram.dir, rd(m.tram.wait, 100));
            m.cones.forEach(function (q, i) { if (q.vx || q.vy || clock - q.hit < 3) out.push(i, rd(q.x, 10), rd(q.y, 10), rd(q.a, 100)); });
        } else if (m === REEF) out.push(rd(m.turtle.s, 10), m.turtle.dir);
        else if (m === MOON || m === VOLCANO) (m === MOON ? m.met : m.burst.list).forEach(function (q) { out.push(rd(q.x, 10), rd(q.y, 10), rd(q.t, 100)); });
        else if (m === DESERT) { out.push(rd(m.storm.on, 100)); m.weeds.forEach(function (w) { out.push(rd(w.s, 10), rd(w.rot, 100)); }); }
        return out;
    }
    function mix(u, v, f, jump) { return typeof u !== 'number' || Math.abs(v - u) > jump ? v : u + (v - u) * f; }
    function hzSet(a, b, f) {
        var m = MAP, i, j;
        if (!Array.isArray(a) || !Array.isArray(b)) return;
        if (m === CITY && b.length >= 3) {
            m.tram.s = mix(a[0], b[0], f, 60); m.tram.dir = b[1]; m.tram.wait = b[2];
            for (i = 3; i + 3 < b.length; i += 4) { var q = m.cones[b[i]]; if (q) { q.x = b[i + 1]; q.y = b[i + 2]; q.a = b[i + 3]; q.vx = q.vy = q.va = 0; } }
        } else if (m === REEF && b.length >= 2) { m.turtle.s = mix(a[0], b[0], f, 30); m.turtle.dir = b[1]; }
        else if (m === MOON || m === VOLCANO) {
            var old = m === MOON ? m.met : m.burst.list, list = [], at = m === MOON ? 1.5 : 1.4;
            for (i = 0; i + 2 < b.length; i += 3) {
                var o = null;
                for (j = 0; j < old.length; j++) if (old[j].x === b[i] && old[j].y === b[i + 1]) o = old[j];
                o = o || { x: b[i], y: b[i + 1] };
                o.t = b[i + 2];
                if (o.t >= at && !o.hit) {  /* the rock lands, or the lava bursts: the same puffs as on the host */
                    o.hit = true;
                    for (j = 0; j < 12; j++) puff(m === MOON ? 'dust' : 'lava', o.x, o.y, (Math.random() - 0.5) * 230, (Math.random() - 0.5) * 230, 0.9, m === MOON ? 6 + Math.random() * 6 : 3 + Math.random() * 4);
                }
                list.push(o);
            }
            if (m === MOON) m.met = list; else m.burst.list = list;
        } else if (m === DESERT && b.length >= 7) {
            m.storm.on = b[0];
            m.weeds.forEach(function (w, n) { w.s = mix(a[1 + n * 2], b[1 + n * 2], f, 60); w.rot = mix(a[2 + n * 2], b[2 + n * 2], f, 3); });
        }
    }
    /* the friend's device, every frame: the moment LAG behind the newest snapshot, blended from the two around it */
    function view(dt) {
        var i, j, c, n = snaps.length, s0 = null, s1 = null, f = 0;
        if (n) {
            var last = snaps[n - 1], aim = last[2] - LAG;
            vclock += dt;
            if (vclock < 0 || Math.abs(aim - vclock) > 0.5) vclock = aim; else vclock += (aim - vclock) * Math.min(1, dt * 2);
            s0 = s1 = snaps[0];
            for (i = 0; i < n; i++) { if (snaps[i][2] <= vclock) s0 = s1 = snaps[i]; else { s1 = snaps[i]; break; } }
            if (s1 !== s0) f = clamp((vclock - s0[2]) / (s1[2] - s0[2]), 0, 1);
            while (snaps.length > 2 && snaps[1][2] <= vclock) snaps.shift();
            clock = Math.max(0, Math.min(vclock, last[2]));
        } else clock += dt;
        if (MAP.update) MAP.update(dt);
        moveParts(dt);
        if (s0) {
            raceTime = s0[3] + (s1[3] - s0[3]) * f;
            phase = PH[s1[4]] || phase;
            var a = s0[6], b = s1[6];
            for (i = 0; i < 4; i++) {
                c = karts[i];
                var o = i * KF, fl = b[o + 7], wasZ = c.z;
                c.x = mix(a[o], b[o], f, 150); c.y = mix(a[o + 1], b[o + 1], f, 150);
                c.a = a[o + 2] + wrap(b[o + 2] - a[o + 2]) * f;
                c.z = mix(a[o + 3], b[o + 3], f, 1e9); c.vx = b[o + 4]; c.vy = b[o + 5]; c.steer = mix(a[o + 6], b[o + 6], f, 1e9);
                c.boost = fl & 1 ? 1 : 0; c.shield = fl & 2 ? 1 : 0; c.tangled = fl & 4 ? 1 : 0; c.nap = fl & 8 ? 1 : 0;
                c.laser = fl & 16 ? 1 : 0; c.dotS = fl & 32 ? 1 : -1; c.spin = fl & 64 ? 1 : 0;
                c.fall = b[o + 8] > 0 ? mix(a[o + 8] || b[o + 8], b[o + 8], f, 1e9) : 0;
                c.k = b[o + 9]; c.prog = b[o + 10]; c.fin = b[o + 11]; c.item = ITEMS[b[o + 12] - 1] || null;
                c.vf = c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);
                if (c.laser) setDot(c, i);
                if (wasZ > 0 && !(c.z > 0)) for (j = 0; j < 6; j++) puff('dust', c.x, c.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, 0.8, 5 + Math.random() * 5);
                if (c.boost && Math.random() < 0.6) puff('leaf', c.x - Math.cos(c.a) * 18, c.y - Math.sin(c.a) * 18, -c.vx * 0.2 + (Math.random() - 0.5) * 60, -c.vy * 0.2 + (Math.random() - 0.5) * 60, 0.5, 3);
                if (MAP === REEF && Math.abs(c.vf) > 40 && vis(c.x, c.y, 40) && (c.bt = (c.bt || 0) - dt) <= 0) {
                    c.bt = 0.12;
                    puff('bub', c.x - Math.cos(c.a) * 17, c.y - Math.sin(c.a) * 17, -c.vx * 0.1 + (Math.random() - 0.5) * 20, -c.vy * 0.1 + (Math.random() - 0.5) * 20, 1.1, 2 + Math.random() * 2.5);
                }
            }
            for (i = 0; i < tins.length; i++) {
                var gone = (s1[5] >> i) & 1;
                if (gone && !(tins[i].t > 0)) for (j = 0; j < 7; j++) puff('spark', tins[i].x, tins[i].y, (Math.random() - 0.5) * 170, (Math.random() - 0.5) * 170, 0.5, 2.6);
                tins[i].t = gone;
            }
            var had = {}, now = [], ya = s0[7], yb = s1[7];
            yarns.forEach(function (y) { had[y.id] = y; });
            for (i = 0; i + 3 < yb.length; i += 4) {
                var y = had[yb[i]] || { id: yb[i], trail: [] }, x = yb[i + 1], yy = yb[i + 2];
                for (j = 0; j + 3 < ya.length; j += 4) if (ya[j] === y.id) { x = ya[j + 1] + (x - ya[j + 1]) * f; yy = ya[j + 2] + (yy - ya[j + 2]) * f; break; }
                y.x = x; y.y = yy; y.roll = yb[i + 3];
                y.trail.push(x, yy);
                if (y.trail.length > 18) y.trail.splice(0, 2);
                delete had[y.id]; now.push(y);
            }
            Object.keys(had).forEach(function (k) {  /* a yarn ball that hit someone or rolled away */
                for (j = 0; j < 6; j++) { var q = puff('spark', had[k].x, had[k].y, (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140, 0.5, 2.4); if (q) q.c = '#f472b6'; }
            });
            yarns = now;
            milks = [];
            for (i = 0; i + 2 < s1[8].length; i += 3) milks.push({ x: s1[8][i], y: s1[8][i + 1], t: s1[8][i + 2] });
            rings = [];
            for (i = 0; i + 1 < s1[9].length; i += 2) rings.push({ who: karts[s1[9][i]] || karts[0], t: s1[9][i + 1] });
            hzSet(s0[10], s1[10], f);
        }
        nearest(me);
        if (cd >= 0) {  /* the countdown runs on this device's own clock, from the host's "go" */
            cd += dt;
            var left = 3 - Math.floor(cd - 0.6);
            if (cd >= 0.6 && left >= 1 && shown.count !== String(left)) { count(String(left)); api.sfx('tap'); }
            if (left < 1) { cd = -1; sinceGo = 0.001; count('Go!', 'kk-go'); api.sfx('point'); hintEl.style.display = 'none'; }
        }
        if (sinceGo > 0) {
            sinceGo += dt;
            if (sinceGo > 0.8 && shown.count === 'Go!') count('');
            if (!me.fin && phase === 'race') {
                var p = rankOf(me);
                if (p !== place && clock - lastSay > 6) {
                    if (p === 1) { api.cat('happy'); say('Purr! You took the lead!'); }
                    else if (p < place) { api.cat('wow'); say('Nice pass!'); }
                    else if (p === 2 && place === 1) { api.cat('sad'); say('Hiss! Catch them!'); }
                }
                place = p;
                var wrong = Math.abs(wrap(me.a - me.ang)) > 2.1 && me.vf > 20 && !me.spin && !me.fall;
                wrongFor = wrong ? wrongFor + dt : 0;
                if (sinceGo > 1.4) count(wrongFor > 0.8 ? 'Wrong way!' : '', 'kk-warn');
            }
        }
        if (me.fin && !myDone && sinceGo > 0) duoFinish();
        if (me.item !== heldItem) { heldItem = me.item; slot(); }
        camX += (me.x + me.vx * 0.4 - camX) * Math.min(1, dt * 4);
        camY += (me.y + me.vy * 0.4 - camY) * Math.min(1, dt * 4);
        shake = Math.max(0, shake - dt * 20);
    }
    function duoFinish() {  /* this player is through; the race goes on until both are (then the host can start another) */
        myDone = true; doneAt = clock; place = rankOf(me);
        count(''); show();
        var beat = !pal.fin || me.fin < pal.fin;
        api.cat(beat ? 'happy' : 'sad'); api.sfx(beat ? 'win' : 'lose');
        api.say(place === 1 ? 'Purrfect! First place!' : beat ? 'Ahead of your friend!' : 'Your friend was quicker. Rematch?', 2400);
        if (host && pal.fin) phase = 'done';
        resKey = '';
        api.timeout(function () { if (myDone) wrapEl.classList.add('kk-res-on'); }, 650);
    }
    function results() {  /* the results box, rebuilt when something in it changes */
        var order = karts.slice().sort(function (a, b) { return ahead(a, b) ? -1 : ahead(b, a) ? 1 : 0; });
        var again = host && (phase === 'done' || clock - doneAt > 30);
        var key = order.map(function (c) { return karts.indexOf(c) + ':' + c.fin; }).join() + again + host;
        if (key === resKey) return;
        resKey = key;
        var list = resEl.querySelector('.kk-res-list');
        list.innerHTML = '';
        order.forEach(function (c, i) {
            var li = document.createElement('li');
            li.innerHTML = '<b></b><i></i><span></span><em></em>';
            if (c === me) li.className = 'kk-me';
            li.querySelector('b').textContent = i + 1;
            li.querySelector('i').style.background = c.body;
            li.querySelector('span').textContent = c === me ? 'You' : c === pal ? 'Your friend' : CAT_NAMES[karts.indexOf(c)];
            li.querySelector('em').textContent = c.fin ? c.fin.toFixed(1) + ' s' : 'still racing';
            list.appendChild(li);
        });
        resEl.querySelector('.kk-res-note').textContent = host ? (phase === 'done' ? 'Race again on this track, or pick another.' : 'Waiting for your friend to finish…') :
            pal.fin ? 'Your friend picks what comes next.' : 'Your friend is still racing.';
        resEl.querySelector('[data-a="again"]').hidden = resEl.querySelector('[data-a="new"]').hidden = !host;
        resEl.querySelector('[data-a="again"]').disabled = resEl.querySelector('[data-a="new"]').disabled = !again;
    }
    function duoTick(now) {  /* after every frame: snapshots out (host), keys out (friend), the results box */
        if (myDone) results();
        if (!linked || !fast || fast.readyState !== 'open') return;
        if (host && ready && now - snapAt >= SNAP_MS - 4 && fast.bufferedAmount < 65536) {
            snapAt = now;
            var t = JSON.stringify(pack());
            if (test) test.snapBytes = Math.max(test.snapBytes || 0, t.length);
            fast.send(t);
        }
        if (remote && phase !== 'pick' && now - sentAt >= 15) {
            sentAt = now;
            var thr = (keys.up || pads.up ? 1 : 0) - (keys.down || pads.down ? 1 : 0), want = (keys.right || pads.right ? 1 : 0) - (keys.left || pads.left ? 1 : 0);
            if (test && test.bot && phase === 'race' && !me.fin) {  /* test only: the computer drives the friend's keys */
                autopilot(me, test.skill || 0.9); thr = me.thr; want = me.steer;
                if (me.item && Math.random() < 0.02) uses++;
            }
            fast.send(JSON.stringify([raceNo, ++inSeq, thr, rd(want, 100), uses]));
        }
    }
    if (test) test.duo = function () {
        return { role: host ? 'host' : remote ? 'guest' : role, linked: linked, code: roomCode, race: raceNo, phase: phase, place: place, time: raceTime,
            lobby: wrapEl.classList.contains('kk-lobby-on') ? (lobbyEl.querySelector('section.kk-on') || {}).dataset.s : null,
            title: (lobbyEl.querySelector('[data-s="msg"] h3') || {}).textContent, results: wrapEl.classList.contains('kk-res-on'),
            snaps: snaps.length, snapBytes: test.snapBytes || 0, map: MAP.id, uses: uses, palUsed: palUsed,
            karts: karts.map(function (c) { return [Math.round(c.x), Math.round(c.y), c.k, c.fin, c.item]; }), me: karts.indexOf(me) };
    };

    /* ---------- Kitty Kart Split Screen: two players on one phone, or on one keyboard ----------
       Player 1 drives the usual kart (me, karts[0]), player 2 the next one (pal, karts[1]); the two computer cats race as
       always. On a phone lying flat between the two, each player has half of the screen, turned to face them, with
       its own buttons, and the race fills the whole screen. On a keyboard player 1 has W A S D and player 2 the arrow
       keys, side by side. The play area is cut into two views, each a canvas of its own with its own camera and HUD. Before a view is drawn,
       cv, ctx, W, H, the camera and me point at it, so draw() and the tracks work unchanged. Keys are tracked by e.code
       (where the key sits, not what it types), so both players can hold keys at once. Nothing is saved, nothing is sent. */
    var GRID = [2, 3, 0, 1], views = null, splitNo = 0, splitResKey = '', frameNo = 0, sRes = null;
    var PKEYS = { KeyW: [0, 'up'], KeyS: [0, 'down'], KeyA: [0, 'left'], KeyD: [0, 'right'],
        ArrowUp: [1, 'up'], ArrowDown: [1, 'down'], ArrowLeft: [1, 'left'], ArrowRight: [1, 'right'] };
    var IKEYS = { KeyQ: 0, ShiftLeft: 0, Enter: 1, NumpadEnter: 1, ShiftRight: 1 };  /* use an item: 0 player 1, 1 player 2 */
    var WHO = [['Player 1', 'W A S D', 'Q', 'W A S D to drive and brake, Q or Left Shift to use an item'],
        ['Player 2', 'arrows', 'Enter', 'Arrow keys to drive and brake, Enter or Right Shift to use an item']];
    var SPLIT_NAMES = ['Player 1', 'Player 2', 'Black cat', 'White cat'];
    /* phone: two players share a touch screen lying flat between them (each half has its own buttons and is turned to
       face its player); otherwise a keyboard. full: the race fills the whole screen (and, where allowed, goes fullscreen). */
    var phone = !!api.touch, full = false, pads2 = {}, wake = null;
    if (split) {
        pal = karts[1];
        wrapEl.classList.add('kk-split');
        views = [0, 1].map(function (n) {
            var el = document.createElement('div');
            el.className = 'kk-view kk-v' + (n + 1);
            el.innerHTML = '<div class="kk-vhud"><button type="button" class="kk-close" aria-label="Stop the race">&times;</button>' +
                '<span class="kk-pill kk-who"></span><span class="kk-pill kk-pos">4th</span>' +
                '<span class="kk-pill"><small>Lap</small><b class="kk-vlap">1/3</b></span><span class="kk-pill kk-time">0.0</span>' +
                '<span class="kk-pill kk-slot kk-empty"><canvas width="64" height="64"></canvas><small></small></span></div>' +
                '<div class="kk-count"></div><div class="kk-hint"></div><div class="kk-vsay" role="status"></div>' +
                '<button type="button" class="kk-btn kk-use kk-empty" data-k="use" aria-label="Use item"><canvas width="64" height="64"></canvas></button>' +
                '<button type="button" class="kk-btn kk-left" data-k="left" aria-label="Steer left">' + arrow('M15 5l-7 7 7 7') + '</button>' +
                '<button type="button" class="kk-btn kk-right" data-k="right" aria-label="Steer right">' + arrow('M9 5l7 7-7 7') + '</button>' +
                '<button type="button" class="kk-btn kk-brake" data-k="down">Brake</button><button type="button" class="kk-btn kk-gas" data-k="up">Gas</button>' +
                '<div class="kk-vres"><div class="kk-pick-box kk-lb" role="dialog" aria-label="Results"><h3></h3><ol class="kk-res-list"></ol>' +
                '<p class="kk-lb-p kk-res-note"></p><div class="kk-lb-row"><button type="button" class="kk-lb-btn kk-lb-go" data-a="again">Race again</button>' +
                '<button type="button" class="kk-lb-btn" data-a="new">New track</button></div></div></div>';
            var c = n ? document.createElement('canvas') : cv;  /* player 1's view draws on the main canvas */
            c.className = 'kk-cv';
            el.insertBefore(c, el.firstChild);
            wrapEl.insertBefore(el, wrapEl.children[n]);
            el.querySelector('.kk-who').appendChild(document.createTextNode(WHO[n][0] + ' '));
            var keysEl = document.createElement('small'); keysEl.textContent = WHO[n][1];
            el.querySelector('.kk-who').appendChild(keysEl);
            el.querySelector('.kk-slot small').textContent = WHO[n][2];
            el.querySelector('.kk-slot').title = 'Item: ' + WHO[n][3].split(', ')[1];
            return { el: el, cv: c, g: n ? c.getContext('2d', { alpha: false }) : ctx, kart: karts[n], hud: el.querySelector('.kk-vhud'),
                pos: el.querySelector('.kk-pos'), lap: el.querySelector('.kk-vlap'), time: el.querySelector('.kk-time'),
                slot: el.querySelector('.kk-slot'), slotG: el.querySelector('.kk-slot canvas').getContext('2d'),
                use: el.querySelector('.kk-use'), useG: el.querySelector('.kk-use canvas').getContext('2d'), res: el.querySelector('.kk-vres'),
                count: el.querySelector('.kk-count'), hint: el.querySelector('.kk-hint'), say: el.querySelector('.kk-vsay'),
                fingers: {}, pads: n ? pads2 : null, rot: 0,
                camX: 0, camY: 0, shake: 0, place: 4, wrongFor: 0, held: undefined, sayAt: 0, shown: {}, r: [0, 0, 0, 0] };
        });
        /* the picker: who drives with which keys, or, on a phone, who holds which half */
        var sBox = wrapEl.querySelector('.kk-pick .kk-pick-box'), keyLine = document.createElement('p'), phoneLine = document.createElement('p');
        sBox.querySelector('h3').textContent = 'Pick a track for two players';
        keyLine.className = 'kk-keys';
        keyLine.innerHTML = '<span><b>Player 1</b>W A S D, item Q or Left Shift</span><span><b>Player 2</b>arrow keys, item Enter or Right Shift</span>';
        phoneLine.className = 'kk-phone-line';
        sBox.insertBefore(phoneLine, mapsEl);
        sBox.insertBefore(keyLine, mapsEl);
        sRes = document.createElement('div');
        sRes.className = 'kk-res';
        sRes.innerHTML = '<div class="kk-pick-box kk-lb" role="dialog" aria-label="Results"><h3>Results</h3><ol class="kk-res-list"></ol>' +
            '<p class="kk-lb-p kk-res-note"></p><div class="kk-lb-row"><button type="button" class="kk-lb-btn kk-lb-go" data-a="again">Race again</button>' +
            '<button type="button" class="kk-lb-btn" data-a="new">New track</button></div></div>';
        wrapEl.appendChild(sRes);
        var resClick = function (e) {
            var b = e.target.closest('button');
            if (!b || phase !== 'done') return;
            if (b.dataset.a === 'again') { GRID = [GRID[1], GRID[0], 0, 1]; phase = 'pick'; choose(sel); splitGo(); }  /* the two swap places on the grid */
            else if (b.dataset.a === 'new') splitPick();
        };
        api.on(sRes, 'click', resClick);
        views.forEach(function (v) {
            api.on(v.res, 'click', resClick);
            api.on(v.el.querySelector('.kk-close'), 'click', function () { splitPick(); });
            /* the buttons of this half: every finger is followed by its id, and only ever drives this half's player */
            api.on(v.el, 'pointerdown', function (e) {
                var b = e.target.closest && e.target.closest('.kk-btn');
                if (!b) return;
                e.preventDefault();
                if (b.dataset.k === 'use') { useItem(v.kart); return; }
                try { v.el.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
                v.fingers[e.pointerId] = b.dataset.k;
                press(v);
            });
            api.on(v.el, 'pointermove', function (e) {  /* a finger sliding from one button to another of the same half */
                if (!(e.pointerId in v.fingers)) return;
                var t = document.elementFromPoint(e.clientX, e.clientY), b = t && t.closest && t.closest('.kk-btn[data-k]');
                var k = b && v.el.contains(b) && b.dataset.k !== 'use' ? b.dataset.k : null;
                if (k !== v.fingers[e.pointerId]) { v.fingers[e.pointerId] = k; press(v); }
            });
            ['pointerup', 'pointercancel'].forEach(function (t) {
                api.on(v.el, t, function (e) { if (e.pointerId in v.fingers) { delete v.fingers[e.pointerId]; press(v); } });
            });
            api.on(v.el, 'contextmenu', function (e) { e.preventDefault(); });
        });
        api.on(wrapEl, 'pointerdown', function (e) {  /* a touch screen the media query missed: phone layout */
            if (e.pointerType === 'touch' && !phone) { phone = true; fit(api.size()); }
        });
        api.on(document, 'visibilitychange', function () { if (!document.hidden && full) keepAwake(); });
    }
    function press(v) {  /* which of a half's buttons are held, from its fingers */
        var on = {}, p = v.kart === me ? pads : pads2;
        for (var id in v.fingers) if (v.fingers[id]) on[v.fingers[id]] = true;
        ['up', 'down', 'left', 'right'].forEach(function (k) { p[k] = !!on[k]; });
        Array.prototype.forEach.call(v.el.querySelectorAll('.kk-btn[data-k]'), function (b) { b.classList.toggle('kk-on', !!on[b.dataset.k]); });
    }
    function layout(s) {  /* the two views of the play area s; returns one view's size (before turning it) */
        if (full) s = { w: wrapEl.clientWidth, h: wrapEl.clientHeight };
        wrapEl.classList.toggle('kk-phone', phone); wrapEl.classList.toggle('kk-touch', phone || api.touch);
        var gap = 2, wide = s.w >= s.h, rw = wide ? Math.floor((s.w - gap) / 2) : s.w, rh = wide ? s.h : Math.floor((s.h - gap) / 2);
        /* keyboard: player 1 left (or top), both upright. Phone: the halves face their players, who sit at the two short
           ends in portrait (player 1 at the bottom, player 2 at the top, turned half round) or at the left and right ends
           in landscape (each half turned a quarter towards its player) */
        var rects = wide ? [[0, 0], [s.w - rw, 0]] : phone ? [[0, s.h - rh], [0, 0]] : [[0, 0], [0, s.h - rh]];
        var rots = !phone ? [0, 0] : wide ? [90, -90] : [0, 180];
        var SB = wide ? ['left', 'right'] : ['bottom', 'top'];
        var w = rots[0] % 180 ? rh : rw, h = rots[0] % 180 ? rw : rh;
        views.forEach(function (v, n) {
            var st = v.el.style;
            st.left = (rects[n][0] + (rw - w) / 2) + 'px'; st.top = (rects[n][1] + (rh - h) / 2) + 'px'; st.width = w + 'px'; st.height = h + 'px';
            st.transform = rots[n] ? 'rotate(' + rots[n] + 'deg)' : '';
            st.setProperty('--sb', phone ? 'env(safe-area-inset-' + SB[n] + ', 0px)' : '0px');
            v.rot = rots[n];
            v.cv.width = Math.round(w * dpr); v.cv.height = Math.round(h * dpr);
            v.hud.style.right = ((w < 600 ? 92 : 120) + 30) + 'px';  /* clear of the minimap */
            v.hint.textContent = phone ? TOUCH_HINT : WHO[n][3];
        });
        phoneLine.innerHTML = 'Lay the phone flat between you. <b>Player 1</b> holds the ' + (wide ? 'left' : 'bottom') + ' half, <b>Player 2</b> the ' +
            (wide ? 'right' : 'top') + ' half; each half has its own Gas, Brake, steering and item buttons.';
        wrapEl.querySelector('.kk-pick-tip').textContent = phone ? 'Tap a track to race' : 'Click a track, or W A S D or arrows to choose and Enter to race';
        return { w: w, h: h };
    }
    /* the whole screen for the race on a phone: the page's bar and the cat go under it; fullscreen and keeping the
       screen on where the browser allows (iPhones do not do fullscreen for a page: the fixed layout covers that) */
    function enterFull() {
        if (!full) { full = true; wrapEl.classList.add('kk-full'); fit(api.size()); }
        if (!document.fullscreenElement && wrapEl.requestFullscreen) {
            try { var p = wrapEl.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(function () { /* not allowed: the fixed layout is enough */ }); } catch (e) { /* same */ }
        }
        keepAwake();
    }
    function keepAwake() {
        if (wake || !navigator.wakeLock) return;
        try { navigator.wakeLock.request('screen').then(function (l) { if (full) { wake = l; l.addEventListener('release', function () { if (wake === l) wake = null; }); } else l.release(); }, function () { /* fine */ }); } catch (e) { /* fine */ }
    }
    function leaveFull() {
        if (!full) return;
        full = false; wrapEl.classList.remove('kk-full');
        if (document.fullscreenElement === wrapEl && document.exitFullscreen) {
            try { var p = document.exitFullscreen(); if (p && p.catch) p.catch(function () { /* fine */ }); } catch (e) { /* fine */ }
        }
        if (wake) { try { wake.release(); } catch (e) { /* fine */ } wake = null; }
        fit(api.size());
    }
    function splitPick() {  /* back to the picker: after the results, or the close button during a race */
        phase = 'pick'; leaveFull(); choose(sel); count('');
        views.forEach(function (v) { v.fingers = {}; press(v); });
        wrapEl.classList.add('kk-picking'); wrapEl.classList.remove('kk-res-on');
        if (document.activeElement && wrapEl.contains(document.activeElement)) document.activeElement.blur();
    }
    function splitGo() {  /* the picked track: on to the countdown, for both */
        splitNo++;
        phase = 'count'; clock = 0; keys = {}; keys2 = {};
        raceTime = 0; finishers = 0; lastSay = -99; shake = 0; splitResKey = '';
        views.forEach(function (v) { v.place = 4; v.wrongFor = 0; v.shake = 0; v.held = undefined; v.sayAt = 0; v.say.textContent = ''; v.fingers = {}; press(v); });
        count('');
        wrapEl.classList.remove('kk-picking', 'kk-res-on');
        if (document.activeElement && wrapEl.contains(document.activeElement)) document.activeElement.blur();
        if (phone) enterFull();  /* a tap started it: fullscreen is allowed now */
        api.sfx('tap');
    }
    function drive2(dt) {  /* player 2 on the arrow keys or their half's buttons, just as player 1 drives */
        var c = pal, want = (keys2.right || pads2.right ? 1 : 0) - (keys2.left || pads2.left ? 1 : 0);
        c.thr = (keys2.up || pads2.up ? 1 : 0) - (keys2.down || pads2.down ? 1 : 0);
        c.steer += (want - c.steer) * Math.min(1, dt * 10);
        if (c.laser > 0) c.steer = c.steer * 0.3 + 0.7 * clamp(wrap(Math.atan2(c.doty - c.y, c.dotx - c.x) - c.a) * 3, -1, 1);
    }
    function splitKey(e, down) {
        var m = PKEYS[e.code], it = IKEYS[e.code];
        if (m) {
            e.preventDefault();  /* arrows never scroll the page */
            if (phase !== 'pick') (m[0] ? keys2 : keys)[m[1]] = down;
            else if (down) {  /* in the picker either player chooses */
                var cols = FW < 600 ? 2 : 4;
                choose(sel + (m[1] === 'left' ? -1 : m[1] === 'right' ? 1 : m[1] === 'up' ? -cols : cols));
                if (wrapEl.contains(document.activeElement)) cards[sel].focus();
            }
            return;
        }
        if (phase === 'pick') {
            if (down && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) { e.preventDefault(); go(); }
            return;
        }
        if (phase === 'done' && e.target && e.target.closest && e.target.closest('button')) return;  /* a results button has the focus */
        if (it !== undefined) { e.preventDefault(); if (down && !e.repeat) useItem(it ? pal : me); }
        else if (e.code === 'Space') e.preventDefault();  /* nor does the space bar */
    }
    function splitSay(n, t) {  /* what is said to a player shows at the bottom of their half */
        var v = views[n];
        v.say.textContent = t; v.sayAt = performance.now();
    }
    function splitPlaces(dt) {
        if (phase !== 'race') return;
        views.forEach(function (v) {
            var c = v.kart;
            if (c.fin) return;
            var p = rankOf(c);
            if (p !== v.place && quiet(c, 6)) {
                if (p === 1) { mood(c, 'happy'); say('Purr! You took the lead!', c); }
                else if (p < v.place) { mood(c, 'wow'); say('Nice pass!', c); }
                else if (p === 2 && v.place === 1) { mood(c, 'sad'); say('Hiss! Catch them!', c); }
            }
            v.place = p;
            var wrong = Math.abs(wrap(c.a - c.ang)) > 2.1 && c.vf > 20 && !(c.spin > 0) && !(c.fall > 0);
            v.wrongFor = wrong ? v.wrongFor + dt : 0;
        });
    }
    function splitFinish(c) {  /* one player is through: their half shows the place; both through: the results */
        var n = c === me ? 0 : 1, v = views[n], other = n ? me : pal, no = splitNo;
        v.place = rankOf(c);
        api.sfx(v.place === 1 ? 'win' : 'point');
        splitSay(n, v.place === 1 ? 'Purrfect! First place!' : !other.fin ? 'Ahead of ' + SPLIT_NAMES[1 - n] + '!' : 'Meow. Next time!');
        if (!me.fin || !pal.fin) return;
        phase = 'done';
        api.cat('happy');
        api.timeout(function () { if (no === splitNo && phase === 'done') wrapEl.classList.add('kk-res-on'); }, 900);
    }
    function splitResults() {  /* the results box, rebuilt when something in it changes (the cats may still be racing) */
        var order = karts.slice().sort(function (a, b) { return ahead(a, b) ? -1 : ahead(b, a) ? 1 : 0; });
        var key = order.map(function (c) { return karts.indexOf(c) + ':' + c.fin; }).join();
        if (key === splitResKey) return;
        splitResKey = key;
        var d = Math.abs(me.fin - pal.fin), note = d < 0.05 ? 'A dead heat between the two players!' :
            (me.fin < pal.fin ? 'Player 1 beat Player 2' : 'Player 2 beat Player 1') + ' by ' + d.toFixed(1) + ' s on ' + MAP.name + '.';
        [sRes].concat(views.map(function (v) { return v.res; })).forEach(function (box, b) {  /* the shared box, and one in each half */
            var list = box.querySelector('.kk-res-list');
            list.innerHTML = '';
            order.forEach(function (c, i) {
                var li = document.createElement('li'), n = karts.indexOf(c);
                li.innerHTML = '<b></b><i></i><span></span><em></em>';
                if (n < 2) li.className = n ? 'kk-p2' : 'kk-me';
                li.querySelector('b').textContent = i + 1;
                li.querySelector('i').style.background = c.body;
                li.querySelector('span').textContent = SPLIT_NAMES[n];
                li.querySelector('em').textContent = c.fin ? c.fin.toFixed(1) + ' s' : 'still racing';
                list.appendChild(li);
            });
            box.querySelector('.kk-res-note').textContent = note;
            if (b) box.querySelector('h3').textContent = SPLIT_NAMES[b - 1] + ': ' + ordinal(views[b - 1].place) + ' place';
        });
    }
    function tag(c, text, col) {  /* a name tag over a player's kart */
        if (!vis(c.x, c.y, 40)) return;
        ctx.font = '800 12px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.fillStyle = col;
        ctx.strokeText(text, c.x, c.y - 22 - c.z * 0.5); ctx.fillText(text, c.x, c.y - 22 - c.z * 0.5);
    }
    function vset(v, key, val) { if (v.shown[key] !== val) { v.shown[key] = val; v[key].textContent = val; } }
    function splitFrame() {  /* every frame: both views, then both HUDs */
        var c0 = cv, g0 = ctx, n, v;
        VB = null;
        for (n = 0; n < 2; n++) {
            v = views[n];
            cv = v.cv; ctx = v.g; me = v.kart;
            if (n) { camX = v.camX; camY = v.camY; shake = v.shake; }
            var vw = W / 2 / zoom, vh = H / 2 / zoom;  /* keep the view inside the field */
            camX = vw * 2 < WW ? clamp(camX, vw, WW - vw) : WW / 2;
            camY = vh * 2 < WH ? clamp(camY, vh, WH - vh) : WH / 2;
            draw();
            v.r = [VX0, VY0, VX1, VY1];
            if (n) { v.camX = camX; v.camY = camY; } else { views[0].camX = camX; views[0].camY = camY; views[0].shake = shake; }
        }
        cv = c0; ctx = g0; me = karts[0];
        camX = views[0].camX; camY = views[0].camY; shake = views[0].shake;
        /* until the next frame, "visible" means in either view (sparks, steam and petals near both players) */
        frameNo++;
        var a = views[frameNo & 1].r;
        VX0 = a[0]; VY0 = a[1]; VX1 = a[2]; VY1 = a[3]; VB = views[1 - (frameNo & 1)].r;
        for (n = 0; n < 2; n++) {
            v = views[n];
            var c = v.kart, text = '', cls = '';
            vset(v, 'pos', ordinal(v.place));
            vset(v, 'lap', Math.min(LAPS, laps(c) + 1) + '/' + LAPS);
            vset(v, 'time', (c.fin || raceTime).toFixed(1));
            if (c.item !== v.held) {
                v.held = c.item; itemPic(v.slotG, c.item); itemPic(v.useG, c.item);
                v.slot.classList.toggle('kk-empty', !c.item); v.use.classList.toggle('kk-empty', !c.item);
            }
            if (c.fin) { text = ordinal(v.place) + ' place, ' + c.fin.toFixed(1) + ' s'; cls = 'kk-fin'; }
            else if (phase === 'race' && clock > 5 && v.wrongFor > 0.8) { text = 'Wrong way!'; cls = 'kk-warn'; }
            else if (shown.count) { text = shown.count; cls = text === 'Go!' ? 'kk-go' : ''; }
            if (v.shown.count !== text) {
                v.shown.count = text;
                v.count.textContent = text;
                v.count.className = 'kk-count' + (cls ? ' ' + cls : '');
                if (text && !api.reducedMotion) { void v.count.offsetWidth; v.count.classList.add('kk-pop'); }
            }
            var hint = phase === 'count' ? '' : 'none';
            if (v.hint.style.display !== hint) v.hint.style.display = hint;
            if (v.sayAt && performance.now() - v.sayAt > 1800) { v.sayAt = 0; v.say.textContent = ''; }
        }
        if (phase === 'done') splitResults();
    }
    if (test && split) test.split = function () {  /* only on the test page: where each player is, and which keys a driver would hold */
        return { phase: phase, map: MAP.id, results: wrapEl.classList.contains('kk-res-on'), time: raceTime, finishers: finishers, phone: phone, full: full,
            fs: document.fullscreenElement === wrapEl, pads: [JSON.stringify(pads), JSON.stringify(pads2)],
            views: views.map(function (v) { var r = v.el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), v.rot, v.cv.width, v.cv.height]; }),
            karts: karts.map(function (c, i) {
                var look = Math.round((34 + Math.abs(c.vf) * 0.32) / SP), j = routeAt(c, look), km = 0;
                for (var q = 1; q < 26; q++) km = Math.max(km, Math.abs(rK(routeAt(c, q))));
                var vt = VMAX * 0.85 / (1 + km * 80 * CARE);
                return { x: Math.round(c.x), y: Math.round(c.y), lap: laps(c), k: c.k, fin: c.fin, item: c.item, vf: Math.round(c.vf),
                    place: i < 2 ? views[i].place : rankOf(c), thr: c.thr, cs: Math.round(c.steer * 100) / 100,
                    steer: clamp(wrap(Math.atan2(rY(j) - c.y, rX(j) - c.x) - c.a) * 3, -1, 1), want: c.vf < vt ? 1 : c.vf > vt + 30 ? -1 : 0 };
            }) };
    };

    load(MAP);
    reset();
    fit(api.size());
    api.onResize(fit);
    showBests();
    if (!split) show();
    return { destroy: function () {
        if (window.__kk === test) try { delete window.__kk; } catch (e) { window.__kk = undefined; }
        if (duo) { send({ t: 'bye' }); teardown(false); }
        if (split) leaveFull();
    } };
}
})();
