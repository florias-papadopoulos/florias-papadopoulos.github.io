/* Kitty Kart: a top-down kart race, the orange cat against three other cats. 3 laps; best score = fastest race time.
   Before the race you pick one of twelve tracks (Catnip Meadow, Night City, Coral Reef, Moon Rim, Lava Peak, Giant
   Grove, Red Canyon, Blossom Town, Melody Lane, Prism Skyway, Zombie Town, Living Room Rally). Each has its own
   layout, scenery and handling, a shortcut with a catch, boost pads and moving hazards. The cached track is painted
   in layers (soft ground, scenery, a shaded road with kerbs and tyre marks); things that stand up (buildings, trees,
   mesas, the volcano, furniture) are drawn each frame with their tops leaning away from the middle of the view, which
   reads as height (liftX, liftY). Melody Lane plays notes with its own small Web Audio context (note). Floating fish tins give an
   item (yarn ball, catnip, cardboard box, laser pointer, milk carton, nap bell); karts further back get better ones.
   Difficulty comes from api.level(): Easy keeps the simple computer driver, Normal and Hard race on a real racing
   line, time the shortcuts, use items with care and have personalities (aggressive, consistent, item-happy).
   A track is a closed path resampled into N evenly spaced points, plus a shortcut path whose points map onto the
   main ones; karts find their nearest point to know where they are, and a lap counts only after all checkpoints
   were passed in order. Shell API: arcade.js.
   The player drives in the look picked with the site's mascot (the CSS variables of cat.css); with a dog look
   (data-pet "dog") the player and the computer opponents are dogs (floppy ears, a snout, a dark nose) and the
   player's lines bark instead of meow (dogify), and the items turn doggy, the same in play: fish tins are bones,
   the yarn ball a tennis ball, catnip a squeaky toy, the milk carton a water bowl (drawBall, drawBone, drawIcon). Before the race the player picks one of eight kart skins above the
   tracks (SKINS: Classic, Cardboard Box, Fish, Rocket, Patrol, Retro Racer, Cheese Wedge, Sushi), kept in localStorage
   "kitty-kart-skin" ("kitty-kart-skin-2" for player 2 on split screen). The player's own kart has a bobbing "YOU"
   label ("P1" or "P2" on split screen), and its dot on the minimap is bigger, on top and ringed (marker, draw).
   No big shortcuts: a kart that goes too far off the road gets "Turn back!" with a flashing arrow, and if it stays
   out (or goes further) it is put back where it left the road, in a puff of smoke; so is a kart that hops across
   between two close parts of the road (offCheck, cutCheck, rescue).
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
        '.kk-narrow .kk-maps { grid-template-columns: repeat(3, 1fr); gap: 6px; }' +
        '.kk-narrow .kk-map { padding: 4px 4px 6px; border-radius: 12px; }' +
        '.kk-narrow .kk-map canvas { height: 64px; object-fit: cover; }' +
        '.kk-narrow .kk-map b { margin-top: 4px; font-size: .8rem; line-height: 1.15; }' +
        '.kk-narrow .kk-map small { font-size: .66rem; }' +
        '.kk-map { min-width: 0; padding: 6px 6px 8px; border: 2px solid #e2e8f0; border-radius: 14px; background: #fff; color: #0f172a;' +
        '  font: inherit; text-align: center; cursor: pointer; touch-action: manipulation; }' +
        '.kk-map:hover { border-color: #f3a5c0; }' +
        '.kk-map.kk-sel { border-color: #d6336c; box-shadow: 0 0 0 3px rgba(214,51,108,.22); }' +
        '.kk-map canvas { display: block; width: 100%; height: auto; border-radius: 10px; }' +
        '.kk-map b { display: block; margin-top: 6px; font-size: .92rem; font-weight: 800; }' +
        '.kk-map small { display: block; margin-top: 2px; color: #5b6b80; font-size: .74rem; line-height: 1.25; }' +
        '.kk-map .kk-mbest { color: #1e3a8a; font-weight: 700; min-height: 1.2em; }' +
        '.kk-pick-tip { margin: 10px 0 0; color: #5b6b80; font-size: .8rem; font-weight: 600; }' +
        /* the kart skins, above the tracks (and in the Duo join box) */
        '.kk-skins { margin: 0 0 10px; }' +
        '.kk-skin-lab { display: block; margin: 0 0 5px; color: #5b6b80; font-size: .82rem; font-weight: 700; }' +
        '.kk-skin-lab b { color: #0f172a; }' +
        '.kk-skin-row { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }' +
        '.kk-narrow .kk-skin-row { grid-template-columns: repeat(4, 1fr); gap: 5px; }' +
        '.kk-narrow.kk-split .kk-skin-row { grid-template-columns: repeat(8, 1fr); gap: 3px; }' +
        '.kk-skin { min-width: 0; padding: 2px; border: 2px solid #e2e8f0; border-radius: 10px; background: #fff; cursor: pointer; touch-action: manipulation; }' +
        '.kk-skin:hover { border-color: #f3a5c0; }' +
        '.kk-skin.kk-sel { border-color: #d6336c; box-shadow: 0 0 0 3px rgba(214,51,108,.22); }' +
        '.kk-skins.kk-sk2 .kk-skin.kk-sel { border-color: #1e3a8a; box-shadow: 0 0 0 3px rgba(30,58,138,.22); }' +
        '.kk-skin canvas { display: block; width: 100%; height: auto; }' +
        '.kk-lb .kk-skins { margin: 14px 0 0; text-align: center; }' +
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
        if (s.edge) { r.edge = true; r.ein = s.ein || 3; }  /* no falling in the first and last ein points, where it joins the road */
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

    /* ---------- shared looks for the cached track: soft ground, shaded roads, tyre marks, raised edges ---------- */
    function blotch(g, cols, cell, s, alpha) {  /* soft patches of colour: one soft round gradient per cell of a grid, like terrain */
        seed = s;
        for (var y = -cell; y < WH + cell; y += cell) for (var x = -cell; x < WW + cell; x += cell) {
            var cx = x + rnd() * cell, cy = y + rnd() * cell, r = cell * (0.8 + rnd() * 0.8), c = cols[Math.floor(rnd() * cols.length)];
            var gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.globalAlpha = rnd() * alpha; gr.addColorStop(0, c); gr.addColorStop(1, c.length === 7 ? c + '00' : 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        }
        g.globalAlpha = 1;
    }
    function grain(g, n, cols, r, minD, maxD, s) {  /* little specks: on the road (maxD set) or off it (minD set) */
        var o = { x: 0, y: 0 }, i;
        seed = s;
        for (i = 0; i < n; i++) {
            o.x = rnd() * WW; o.y = rnd() * WH;
            var c = cols[Math.floor(rnd() * cols.length)], rr2 = r * (0.5 + rnd());
            if (maxD) { var j = Math.floor(rnd() * N), p = side(j, (rnd() - 0.5) * 2 * maxD); o.x = p.x; o.y = p.y; }
            else { nearest(o); if (o.dist < minD) continue; }
            g.fillStyle = c; g.fillRect(o.x, o.y, rr2, rr2);
        }
    }
    function road(g, o) {  /* the road in layers: a shadow (raised roads), the edge, a darker rim, the surface and a lighter crown */
        if (o.shadow) { g.save(); g.translate(o.shadow[0], o.shadow[1]); strokeLoop(g, 0, N, 2 * HW + (o.edgeW || 0), o.shadow[2]); g.restore(); }
        if (o.edge) strokeLoop(g, 0, N, 2 * HW + o.edgeW, o.edge);
        if (o.kerb) kerbs(g, 2 * HW + o.kerb[2], o.kerb[0], o.kerb[1]);
        if (o.line) strokeLoop(g, 0, N, 2 * HW + 4, o.line);
        strokeLoop(g, 0, N, 2 * HW, o.rim || o.col);
        strokeLoop(g, 0, N, 2 * HW - 10, o.col);
        if (o.crown) strokeLoop(g, 0, N, 2 * HW - 34, o.crown);
    }
    function offLine(g, l, w, col, dash) {  /* a line along the whole road at l from the centre (l > 0: right) */
        g.beginPath();
        for (var i = 0; i <= N; i++) { var p = side(i, l); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
        g.lineWidth = w; g.strokeStyle = col; g.setLineDash(dash || []); g.lineCap = dash ? 'butt' : 'round'; g.stroke(); g.setLineDash([]);
    }
    function skids(g, col) {  /* tyre marks on the racing line through every real bend: outside, apex, outside */
        g.strokeStyle = col; g.lineWidth = 2.4; g.setLineDash([]); g.lineCap = 'round';
        for (var i = 0; i < N; i++) {
            if (Math.abs(K[i]) < 0.0055 || Math.abs(K[ix(i - 1)]) >= 0.0055) continue;
            for (var k = i; Math.abs(K[ix(k)]) >= 0.0055 && k < i + N; k++);
            if (k - i < 4) continue;
            var a = i - 10, b = k + 10, sg = K[ix((i + k) >> 1)] > 0 ? 1 : -1;
            for (var w = -1; w <= 1; w += 2) {
                g.beginPath();
                for (var j = a; j <= b; j++) {
                    var f = Math.sin(Math.PI * (j - a) / (b - a)), p = side(j, sg * HW * (0.6 * f - 0.4 * (1 - f)) + w * 7);
                    if (j === a) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
                }
                g.stroke();
            }
        }
    }
    function arrows(g, col, every) {  /* chevrons on the outside of the sharpest bends, pointing the way round */
        for (var i = 0; i < N; i++) {
            if (Math.abs(K[i]) < 0.008 || Math.abs(K[ix(i - 1)]) >= 0.008) continue;
            var sg = K[i] > 0 ? -1 : 1;
            for (var j = i - 4; j < i + (every || 18); j += 6) {
                var p = side(j, sg * (HW + 30));
                g.save(); g.translate(p.x, p.y); g.rotate(A[ix(j)]);
                g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-9, -10, 22, 24);
                g.fillStyle = col[0]; g.fillRect(-11, -12, 22, 24);
                g.strokeStyle = col[1]; g.lineWidth = 4; g.beginPath(); g.moveTo(-5, -7); g.lineTo(3, 0); g.lineTo(-5, 7); g.stroke();
                g.restore();
            }
        }
    }
    /* things that stand up out of the ground lean away from the middle of the view as it moves: their tops are drawn
       a little further out the taller they are, which reads as height (the base stays put on the cached track) */
    function rail(g, l, step, seg, post) {  /* a fence or wall at l from the centre line on both sides, left out where other road comes close */
        var o = { x: 0, y: 0 };
        for (var s = -1; s <= 1; s += 2) {
            var prev = null;
            for (var i = 0; i <= N; i += step) {
                var p = side(i, s * l);
                o.x = p.x; o.y = p.y; nearest(o);
                var ok = o.dist > l - 6 && p.x > 10 && p.y > 10 && p.x < WW - 10 && p.y < WH - 10;
                if (ok && prev && seg) seg(prev, p, i, s);
                if (ok && post) post(p, i, s);
                prev = ok ? p : null;
            }
        }
    }
    function spots(n, minSep, want, avoid) {  /* n open places at least want from the roads (close to that), apart from each other */
        var out = [], o = { x: 0, y: 0 };
        for (var q = 0; q < n; q++) {
            var cand = [];
            for (var gx = 120; gx < WW - 120; gx += 40) for (var gy = 120; gy < WH - 120; gy += 40) {
                var ok = true;
                for (var j = 0; j < out.length; j++) if (Math.hypot(out[j].x - gx, out[j].y - gy) < minSep) ok = false;
                (avoid || []).forEach(function (a) { if (Math.hypot(a.x - gx, a.y - gy) < minSep) ok = false; });
                if (!ok) continue;
                o.x = gx; o.y = gy; nearest(o);
                if (o.dist >= want) cand.push({ x: gx, y: gy, d: o.dist });
            }
            if (!cand.length) break;
            cand.sort(function (a, b) { return a.d - b.d; });
            out.push(cand[Math.floor(rnd() * Math.min(cand.length, 12))]);
        }
        return out;
    }
    function stand(g, j0, j1, l, cols) {  /* a grandstand along the road from j0 to j1, its front at l from the centre (sign: side) */
        var s = l > 0 ? 1 : -1, i, k;
        for (k = 0; k < 4; k++) {  /* four rows of seats, the back ones higher and darker */
            g.beginPath();
            for (i = j0; i <= j1; i++) { var p = side(i, l + s * (12 + k * 16)); if (i === j0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
            g.lineWidth = 16; g.strokeStyle = k % 2 ? cols[0] : cols[1]; g.lineCap = 'butt'; g.setLineDash([]); g.stroke();
        }
        var CAT = ['#f6a23a', '#a3aab5', '#45424d', '#fbf7ef', '#e8c9a0', '#8a5a3c'];
        seed = j0 * 7 + 3;
        for (k = 0; k < 4; k++) for (i = j0; i <= j1; i += 1) {  /* little cats watching */
            if (rnd() < 0.35) continue;
            var q = side(i, l + s * (12 + k * 16)), c = CAT[Math.floor(rnd() * CAT.length)];
            g.fillStyle = c; g.strokeStyle = 'rgba(40,30,20,.6)'; g.lineWidth = 1;
            g.beginPath(); g.arc(q.x, q.y, 5, 0, 7); g.fill(); g.stroke();
            var a = A[ix(i)] + (s > 0 ? -Math.PI / 2 : Math.PI / 2);  /* ears point away from the road */
            for (var e = -1; e <= 1; e += 2) {
                var ea = a + e * 0.55; g.beginPath(); g.moveTo(q.x + Math.cos(ea) * 3, q.y + Math.sin(ea) * 3);
                g.lineTo(q.x + Math.cos(ea) * 8, q.y + Math.sin(ea) * 8); g.lineTo(q.x + Math.cos(ea + e * 0.6) * 4, q.y + Math.sin(ea + e * 0.6) * 4); g.fill();
            }
        }
        g.lineCap = 'round';
    }
    function liftX(x, h) { return x + (x - (VX0 + VX1) / 2) * h; }
    function liftY(y, h) { return y + (y - (VY0 + VY1) / 2) * h; }

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

