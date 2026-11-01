/* Purrbit Patrol (id orbit-paws): keep a constellation of cat satellites safe in low orbit. Space debris, dead
   satellites, meteor swarms and other operators' satellites cross the orbits. Every object follows a two body Kepler
   orbit (planet radius 1, four circular lanes from 1.55 to 2.75, lower orbits are faster); meteors fly straight.
   Twenty times a second the game propagates everything 8 s ahead and finds each conjunction (the closest approach of
   a cat and a hazard: time and miss distance). The miss distance becomes a collision risk whose uncertainty grows
   with the time to closest approach, with fresh (still fuzzy) tracks and during solar storms.
   The player dodges with fuel burns (raise or lower to the next lane, or a phase shift ahead or back along the orbit)
   and with the satellites' laser pointers: small junk is vaporised, a rocket body gets nudged onto a new orbit, and
   every shot heats the laser. Dog Corp only publishes a blurred zone around each of its satellites; a private
   proximity check (three per mission) answers "too close" or "safe" and never reveals where the satellite is.
   A collision of two big objects (or a cat and a big object) makes a cloud of fragments on their own orbits.
   Seven missions, then endless waves. Score: 1 per cat per second, 25 per zapped piece of junk (10 per meteor),
   15 per dodge, 30 per safe private check, 60 per docking; at the end of a mission 100 per cat, half the fuel left,
   200 for a surviving station and 150 for the bonus goal. Shell API: arcade.js. */
Arcade.register('orbit-paws', function (api) {
    'use strict';
    api.css(
        '.op { position: absolute; inset: 0; overflow: hidden; background: #060a1c; color: #e8edff; }' +
        '.op-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: crosshair; }' +
        '.op-hud { position: absolute; left: 8px; top: 8px; right: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; pointer-events: none; }' +
        '.op-wide .op-hud { right: 262px; }' +
        '.op-pill { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; background: rgba(16,22,58,.84);' +
        '  border: 1px solid rgba(150,175,255,.22); color: #eef2ff; font-weight: 800; font-size: .82rem; line-height: 1.25; white-space: nowrap; }' +
        '.op-pill small { color: #9fb0e6; font-weight: 700; font-size: .7rem; }' +
        '.op-pill svg { width: 15px; height: 15px; flex: none; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }' +
        '.op-mis { min-width: 0; max-width: 100%; } .op-mist { overflow: hidden; text-overflow: ellipsis; }' +
        '.op-time b { font-variant-numeric: tabular-nums; min-width: 2.3em; }' +
        '.op-goal { color: #ffd66b; } .op-goal.op-done { color: #7dffb5; }' +
        '.op-head { position: relative; display: inline-block; width: 13px; height: 11px; margin: 4px 1px 0; border-radius: 45% 45% 50% 50%; background: currentColor; }' +
        '.op-head:before, .op-head:after { content: ""; position: absolute; top: -4px; border-left: 3px solid transparent; border-right: 3px solid transparent;' +
        '  border-bottom: 6px solid currentColor; }' +
        '.op-head:before { left: -1px; } .op-head:after { right: -1px; }' +
        '.op-head.op-spare { background: transparent; box-shadow: inset 0 0 0 1.6px currentColor; color: #7f8cc0 !important; }' +
        '.op-head.op-hurt { opacity: .55; }' +
        '.op-head.op-launch { animation: op-blink .5s steps(2) infinite; }' +
        '.op-st { color: #ffd66b; letter-spacing: 1px; } .op-st i { color: #4a5384; font-style: normal; }' +
        '.op-alerts { position: absolute; right: 8px; top: 8px; width: 246px; display: flex; flex-direction: column; gap: 4px; pointer-events: none; }' +
        '.op-alerts-h { color: #9fb0e6; font-size: .66rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; padding: 0 4px; }' +
        '.op-alert { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 10px; background: rgba(16,22,58,.86);' +
        '  border-left: 4px solid #ff4d6d; color: #eef2ff; font-size: .74rem; font-weight: 700; line-height: 1.25; white-space: nowrap; overflow: hidden; }' +
        '.op-alert i { width: 9px; height: 9px; border-radius: 50%; flex: none; }' +
        '.op-alert em { font-style: normal; color: #b9c4ee; overflow: hidden; text-overflow: ellipsis; min-width: 0; }' +
        '.op-alert .op-t { margin-left: auto; font-variant-numeric: tabular-nums; }' +
        '.op-alert .op-r { min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums; }' +
        '.op-alert.op-mid { border-left-color: #ffb347; } .op-alert.op-lo { border-left-color: #8d9bd0; }' +
        '.op-alert.op-zone { border-left-color: #b48cff; } .op-alert.op-safe { border-left-color: #3ddc97; }' +
        '.op-alert.op-pair { border-left-color: #ff8a3d; background: rgba(70,24,30,.88); }' +
        '.op-alert.op-ok { border-left-color: #3ddc97; color: #9fe8c4; }' +
        '.op-ctl { position: absolute; left: 8px; bottom: 8px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; max-width: calc(100% - 112px); }' +
        '.op-sel { display: flex; align-items: center; gap: 7px; padding: 4px 10px; border-radius: 12px; background: rgba(16,22,58,.86); color: #eef2ff;' +
        '  font-size: .76rem; font-weight: 800; pointer-events: none; white-space: nowrap; }' +
        '.op-sel small { color: #9fb0e6; font-weight: 700; font-size: .68rem; }' +
        '.op-bar { width: 50px; height: 7px; border-radius: 4px; background: rgba(255,255,255,.14); overflow: hidden; }' +
        '.op-bar i { display: block; height: 100%; width: 0; border-radius: 4px; background: #5ad1ff; }' +
        '.op-heat i { background: #ff9a5a; } .op-heat.op-hot i { background: #ff3b5c; }' +
        '.op-btns { display: flex; flex-wrap: wrap; gap: 6px; }' +
        '.op-btn { width: 54px; height: 54px; padding: 0; border: none; border-radius: 14px; background: rgba(232,238,255,.94); box-shadow: 0 3px 0 #7d8cc6;' +
        '  color: #1d2a6b; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font: 800 .6rem/1 system-ui, sans-serif;' +
        '  cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }' +
        '.op-btn svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }' +
        '.op-btn.op-half { width: 44px; }' +
        '.op-btn.op-off { opacity: .42; }' +
        '.op-btn.op-on { transform: translateY(2px); box-shadow: 0 1px 0 #7d8cc6; }' +
        '.op-btn.op-laser { background: #ff5d8f; color: #fff; box-shadow: 0 3px 0 #b02f5c; }' +
        '.op-btn.op-check { background: #a77dff; color: #fff; box-shadow: 0 3px 0 #6b45c2; }' +
        '.op-keys { color: #8f9ccc; font-size: .68rem; font-weight: 600; pointer-events: none; }' +
        '.op-touch .op-keys { display: none; }' +
        '.op-toast { position: absolute; left: 50%; top: 48px; transform: translateX(-50%); max-width: calc(100% - 24px); padding: 6px 14px; border-radius: 12px;' +
        '  background: rgba(255,214,102,.96); color: #3a2a00; font-weight: 800; font-size: .84rem; line-height: 1.3; text-align: center; pointer-events: none;' +
        '  transition: opacity .3s; box-shadow: 0 6px 18px rgba(0,0,0,.35); }' +
        '.op-toast.op-info { background: rgba(200,215,255,.96); color: #1d2a6b; }' +
        '.op-toast.op-good { background: rgba(125,255,181,.95); color: #0b3b22; }' +
        '.op-toast.op-hide { opacity: 0; }' +
        '.op-card { position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%); width: min(90%, 430px); padding: 16px 20px 14px;' +
        '  border-radius: 18px; background: rgba(14,20,54,.94); border: 1px solid rgba(150,175,255,.35); box-shadow: 0 14px 40px rgba(0,0,0,.5);' +
        '  text-align: center; pointer-events: none; transition: opacity .3s; }' +
        '.op-card b { display: block; color: #9fb0e6; font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; }' +
        '.op-card strong { display: block; color: #fff; font-size: 1.45rem; line-height: 1.2; margin: 3px 0 6px; }' +
        '.op-card span { display: block; color: #cdd6fa; font-size: .88rem; font-weight: 600; line-height: 1.4; white-space: pre-line; }' +
        '.op-card em { display: block; margin-top: 9px; white-space: pre-line; color: #ffd66b; font-style: normal; font-size: .8rem; font-weight: 800; }' +
        '.op-card.op-hide { opacity: 0; }' +
        '.op-card.op-good strong { color: #7dffb5; }' +
        '.op-narrow .op-pill { padding: 3px 8px; font-size: .78rem; }' +
        '.op-narrow .op-alerts { left: 8px; right: 8px; width: auto; }' +
        '.op-narrow .op-alerts-h { display: none; }' +
        '.op-narrow .op-btn { width: 50px; height: 50px; } .op-narrow .op-btn.op-half { width: 42px; }' +
        '.op-narrow .op-toast { font-size: .78rem; }' +
        '@keyframes op-blink { 50% { opacity: .25; } }');

    /* constants: world units, planet radius 1 */
    var TAU = Math.PI * 2;
    var LANES = [1.55, 1.95, 2.35, 2.75];
    var VIEW = 3.15;                                   /* world radius that must fit on screen */
    var R0 = 1.55, W0 = TAU / 13, MU = W0 * W0 * R0 * R0 * R0;   /* lowest lane: one orbit in 13 s */
    var KS = 64, DTP = 0.125, HOR = KS * DTP;           /* prediction: 64 steps of 1/8 s = 8 s */
    var HIT = { cat: 0.09, station: 0.22, debris: 0.045, frag: 0.035, big: 0.085, rogue: 0.09, dog: 0.08, fuzzy: 0.08, meteor: 0.05 };
    var BIG = { big: 1, rogue: 1, dog: 1, fuzzy: 1 };
    var HNAME = { debris: 'debris', frag: 'fragment', big: 'rocket body', rogue: 'dead sat', dog: 'Woof Co sat', fuzzy: 'private zone', meteor: 'meteor' };
    var PATHCOL = { debris: '#a3afc9', frag: '#ffb37a', big: '#e6e9f2', rogue: '#b3a9c9', dog: '#7fb3ff', meteor: '#ffb347', fuzzy: '#c39bff' };
    var ZR = 0.28, RANGE = 1.15, RANGE_ST = 1.4, DOCK_D = 0.3;
    var MAXH = 72, MAXP = api.reducedMotion ? 60 : 200;
    var COST = { up: 16, down: 16, ahead: 8, back: 8 };
    var CATS = [
        { name: 'Mittens', body: '#f4a259', dark: '#7a3f14', ear: '#ffb3c1' },
        { name: 'Luna', body: '#aab4c8', dark: '#434b60', ear: '#ffc2d1' },
        { name: 'Miso', body: '#f2dcae', dark: '#836b3b', ear: '#ffb3c1' },
        { name: 'Pixel', body: '#5c5872', dark: '#1d1b29', ear: '#f7a1b8' },
        { name: 'Tofu', body: '#f5f2ea', dark: '#7d786b', ear: '#ffb3c1' },
        { name: 'Nori', body: '#d9824b', dark: '#6a3311', ear: '#ffc2d1' },
        { name: 'Biscuit', body: '#e7c27d', dark: '#76551a', ear: '#ffb3c1' },
        { name: 'Sushi', body: '#9fb0a6', dark: '#3f4b45', ear: '#ffc2d1' }];
    var LVL = api.level();
    var DIFF = LVL === 'easy' ? { threat: 1.4, spares: 4, fuel: 0.8, heat: 0.85, fill: 0.75, swarm: 0.75, lead: 5.5 } :
               LVL === 'hard' ? { threat: 0.75, spares: 2, fuel: 1.15, heat: 1.15, fill: 1.25, swarm: 1.3, lead: 4 } :
                                { threat: 1, spares: 3, fuel: 1, heat: 1, fill: 1, swarm: 1, lead: 4.5 };

    var MISSIONS = [
        { title: 'First Orbit', sats: 2, lanes: [0, 2], T: 45, filler: 3, threat: [6.5, 'debris'], styles: ['cross'],
          goal: { type: 'dodge', n: 3 },
          brief: 'Two cat satellites circle the planet. When a red ring shows up, a piece of junk is on a collision course: ' +
                 'select the cat and Raise or Lower its orbit (lower orbits are faster) before the countdown ends.' },
        { title: 'Laser Pointer', sats: 3, lanes: [0, 1, 3], T: 50, filler: 7, bigs: 1, threat: [5.2, 'debris'], styles: ['cross', 'cross', 'retro'],
          goal: { type: 'zap', n: 6 },
          brief: 'Every cat has a laser pointer. Tap small junk near a cat (or press Laser) to vaporise it. ' +
                 'A rocket body is too big: the laser only nudges it onto a new orbit. Each shot heats the laser.' },
        { title: 'Private Neighbours', sats: 3, lanes: [0, 1, 2], T: 55, filler: 4, dogs: 1, fuzzy: 2, threat: [5.6, 'mixed'], fuzzyThreat: 0.45,
          goal: { type: 'check', n: 2 },
          brief: 'Dog Corp keeps its orbits secret and only shares a blurry zone. Steer around the whole zone, or run a Private check: ' +
                 'it answers only too close or safe, never where their satellite is.' },
        { title: 'Meteor Shower', sats: 3, lanes: [0, 2, 3], T: 55, filler: 5, threat: [6, 'debris'], events: [[9, 'swarm'], [27, 'swarm'], [43, 'swarm']],
          goal: { type: 'meteor', n: 5 },
          brief: 'Meteor swarms fly straight through the orbits. Their tracks show up seconds before they arrive: dodge them or zap them.' },
        { title: 'Kessler Syndrome', sats: 4, lanes: [0, 1, 2, 3], T: 60, filler: 5, bigs: 2, rogues: 2, threat: [5, 'mixed'], events: [[5, 'kessler']],
          goal: { type: 'prevent' },
          brief: 'A dead satellite and a rocket body are on a collision course. If they crash, the cloud of fragments threatens every orbit. ' +
                 'Nudge the rocket body with a laser before it happens!' },
        { title: 'Solar Storm', sats: 4, lanes: [0, 1, 2, 3], T: 60, filler: 6, bigs: 1, fuzzy: 1, threat: [5, 'mixed'], fuzzyThreat: 0.2,
          events: [[7, 'storm'], [22, 'swarm'], [36, 'storm']],
          goal: { type: 'safe' },
          brief: 'A solar storm puffs up the air: drag pulls the orbits down, gusts push the cats around and predictions get fuzzy. ' +
                 'Raise your cats back up when the storm ends.' },
        { title: 'Purr Station', sats: 3, lanes: [0, 1, 3], station: true, T: 70, filler: 6, bigs: 1, rogues: 1, fuzzy: 1, threat: [4.6, 'mixed'], fuzzyThreat: 0.2,
          events: [[14, 'swarm'], [30, 'kessler'], [48, 'storm']],
          goal: { type: 'dock', n: 2 },
          brief: 'Protect the Purr Station. To dock, bring a courier cat onto the station lane and line it up inside the green ring: ' +
                 'the station refuels it and sends a spare cat.' }];

    function waveDef(n) {
        var ev = [[7 + Math.random() * 5, ['swarm', 'storm', 'kessler'][(n - 1) % 3]]];
        if (n >= 2) ev.push([22 + Math.random() * 6, pick(['swarm', 'kessler', 'swarm', 'storm'])]);
        return { title: 'Endless orbit', wave: n, sats: 4, lanes: [0, 1, 2, 3], T: 40, filler: Math.min(13, 5 + n), bigs: 1 + (n >> 1), rogues: 1,
            dogs: 1, fuzzy: n % 2 ? 1 : 2, threat: [Math.max(2.3, 4.6 - n * 0.35), 'mixed'], fuzzyThreat: 0.2, events: ev, goal: { type: 'safe' },
            brief: 'Wave ' + n + '. The junk keeps coming and every wave is busier. How long can your cats keep their whiskers clean?' };
    }

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
    function sgn() { return Math.random() < 0.5 ? -1 : 1; }
    function wrapA(a) { a = a % TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; }
    function omega(r) { return W0 * Math.pow(r / R0, -1.5); }
    function vcirc(r) { return Math.sqrt(MU / r); }
    var seed = 1;
    function srnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

    /* orbits: {a, e, w (argument of periapsis), M (mean anomaly), dir (+1 counterclockwise), n (mean motion)} */
    function kepler(M, e) {
        M = wrapA(M);
        var E = e < 0.8 ? M : Math.PI, i;
        for (i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        return E;
    }
    function ellPos(o, M, out) {
        var e = o.e, E = kepler(M, e), c = Math.cos(E), s = Math.sin(E);
        var r = o.a * (1 - e * c), nu = Math.atan2(Math.sqrt(1 - e * e) * s, c - e), an = o.dir * (o.w + nu);
        out[0] = r * Math.cos(an); out[1] = r * Math.sin(an);
    }
    function circOrb(r, th, dir) { return { a: r, e: 0, w: 0, M: dir * th, dir: dir, n: Math.sqrt(MU / (r * r * r)) }; }
    function toOrbit(x, y, vx, vy) {   /* state vector to orbit; null if it escapes or is too eccentric */
        var h = x * vy - y * vx, dir = h >= 0 ? 1 : -1;
        if (dir < 0) { y = -y; vy = -vy; }
        var r = Math.hypot(x, y), v2 = vx * vx + vy * vy, en = v2 / 2 - MU / r;
        if (en >= -1e-4) return null;
        var a = -MU / (2 * en), rv = x * vx + y * vy;
        var ex = ((v2 - MU / r) * x - rv * vx) / MU, ey = ((v2 - MU / r) * y - rv * vy) / MU, e = Math.hypot(ex, ey);
        if (e > 0.9) return null;
        var w = e < 1e-6 ? 0 : Math.atan2(ey, ex), nu = Math.atan2(y, x) - w;
        var E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
        return { a: a, e: e, w: w, M: E - e * Math.sin(E), dir: dir, n: Math.sqrt(MU / (a * a * a)) };
    }
    function orbOk(o, lo, hi) { return o && o.a * (1 - o.e) >= lo && o.a * (1 + o.e) <= hi; }

    /* page: canvas, HUD, alert list, controls, toast and card */
    var IC = {
        up: '<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>',
        down: '<path d="M12 5v14M5.5 12.5L12 19l6.5-6.5"/>',
        back: '<path d="M14 6l-6 6 6 6M20 6l-6 6 6 6"/>',
        ahead: '<path d="M10 6l6 6-6 6M4 6l6 6-6 6"/>',
        laser: '<path d="M3 21l8.5-8.5"/><circle cx="15.5" cy="8.5" r="2.4"/><path d="M15.5 2.5v2M15.5 12.5v2M9.5 8.5h2M19.5 8.5h2"/>',
        check: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>'
    };
    function btn(act, label, cls) {
        return '<button class="op-btn ' + (cls || '') + '" type="button" data-act="' + act + '" title="' + label + '"><svg viewBox="0 0 24 24">' +
            IC[act] + '</svg><span>' + label + '</span></button>';
    }
    var root = document.createElement('div');
    root.className = 'op' + (api.touch ? ' op-touch' : '');
    root.innerHTML = '<canvas class="op-cv"></canvas>' +
        '<div class="op-hud"><span class="op-pill op-mis"><small class="op-misn"></small><b class="op-mist"></b></span>' +
        '<span class="op-pill op-time"><svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg><b></b></span>' +
        '<span class="op-pill op-cats"></span><span class="op-pill op-goal"></span></div>' +
        '<div class="op-alerts"></div><div class="op-toast op-hide"></div>' +
        '<div class="op-ctl"><div class="op-sel"></div><div class="op-btns">' +
        btn('up', 'Raise') + btn('down', 'Lower') + btn('back', 'Back', 'op-half') + btn('ahead', 'Ahead', 'op-half') +
        btn('laser', 'Laser', 'op-laser') + btn('check', 'Check', 'op-check') + '</div>' +
        '<div class="op-keys">W S raise, lower &middot; A D phase &middot; Space laser &middot; C check &middot; Tab next cat</div></div>' +
        '<div class="op-card op-hide"><b></b><strong></strong><span></span><em></em></div>';
    api.el.appendChild(root);
    var cv = root.querySelector('.op-cv'), ctx = cv.getContext('2d', { alpha: false });
    var hudEl = root.querySelector('.op-hud'), misN = root.querySelector('.op-misn'), misT = root.querySelector('.op-mist');
    var timeEl = root.querySelector('.op-time b'), catsEl = root.querySelector('.op-cats'), goalEl = root.querySelector('.op-goal');
    var alertsEl = root.querySelector('.op-alerts'), toastEl = root.querySelector('.op-toast'), ctlEl = root.querySelector('.op-ctl');
    var selEl = root.querySelector('.op-sel'), cardEl = root.querySelector('.op-card'), checkBtn = root.querySelector('[data-act="check"]');
    var btnEls = {};
    Array.prototype.forEach.call(root.querySelectorAll('.op-btn'), function (b) { btnEls[b.dataset.act] = b; });
    var touchy = api.touch;

    /* game state */
    var sats = [], hazards = [], parts = [], texts = [], beams = [], pings = [], flashes = [], uplinks = [], bits = [];
    var alerts = [], watch = {}, results = {}, awarded = {}, ghost = null, launches = [];
    var mission = 0, endless = 0, cleared = 0, phase = 'brief', phaseT = 0, clock = 0, mt = 0, score = 0, spares = DIFF.spares, selId = 0;
    var mstat = null, totals = { zaps: 0, meteors: 0, dodges: 0, safe: 0, docks: 0, lost: 0 };
    var checksLeft = 0, pending = null, nextThreat = 99, fillT = 3, events = [], storm = 0, stormWarn = 0, stormKick = 0, kess = null;
    var predAge = 0, lastPred = 0, needPredict = true, scoreAcc = 0, planetRot = 0, shake = 0, redFlash = 0, swarmWarn = null;
    var uid = 0, catIdx = 0, waveCache = null, lastSay = -9, ended = false, tutorial = {};
    var tmp = [0, 0], tmp2 = [0, 0], tmp3 = [0, 0];
    var GU = new Float32Array(2 * KS + 2), GD = new Float32Array(2 * KS + 2), GB = new Float32Array(2 * KS + 2), GH = new Float32Array(2 * KS + 2);
    var test = null;

    function curDef() { return endless ? waveCache : MISSIONS[mission]; }

    /* satellites (cats and the station) move on lanes; transfers and phase shifts are scripted burns */
    function makeSat(kind, r, th) {
        var c = CATS[catIdx % CATS.length];
        if (kind === 'cat') catIdx += 1;
        return { id: ++uid, kind: kind, name: kind === 'station' ? 'Purr Station' : c.name, look: kind === 'station' ? CATS[4] : c,
            r: r, th: th, tr: null, ph: null, drag: storm > 0 ? (kind === 'station' ? -0.006 : -0.012) : 0, kick: null,
            fuel: 100, heat: 0, hot: false, hp: kind === 'station' ? 4 : 2, maxHp: kind === 'station' ? 4 : 2, hr: HIT[kind],
            plan: 0, x: r * Math.cos(th), y: r * Math.sin(th), alive: true, launch: 0, dock: 0, dockCd: 0, blink: Math.random() * 4, hurt: 0,
            P: new Float32Array(2 * KS + 2), bx0: 0, bx1: 0, by0: 0, by1: 0 };
    }
    function cloneSat(s) {
        return { r: s.r, th: s.th, drag: s.drag, tr: s.tr ? { r0: s.tr.r0, r1: s.tr.r1, t: s.tr.t, T: s.tr.T } : null,
            ph: s.ph ? { mul: s.ph.mul, t: s.ph.t, T: s.ph.T } : null };
    }
    function stepSatK(o, dt) {   /* the kinematics, shared by the game and the predictions */
        if (o.tr) {
            o.tr.t += dt;
            var u = Math.min(1, o.tr.t / o.tr.T);
            u = u * u * (3 - 2 * u);
            o.r = o.tr.r0 + (o.tr.r1 - o.tr.r0) * u;
            if (o.tr.t >= o.tr.T) o.tr = null;
        } else o.r += o.drag * dt;
        var m = 1;
        if (o.ph) { m = o.ph.mul; o.ph.t += dt; if (o.ph.t >= o.ph.T) o.ph = null; }
        o.th += omega(o.r) * m * dt;
    }
    function sampleSat(c, out, o) {
        var k, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (k = 0; k <= KS; k++) {
            if (k) stepSatK(c, DTP);
            var x = c.r * Math.cos(c.th), y = c.r * Math.sin(c.th);
            out[2 * k] = x; out[2 * k + 1] = y;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (o) { o.bx0 = x0; o.bx1 = x1; o.by0 = y0; o.by1 = y1; }
    }
    function satAtTime(s, T, out) {
        var c = cloneSat(s), t = 0;
        while (t < T - 1e-6) { var d = Math.min(DTP, T - t); stepSatK(c, d); t += d; }
        out[0] = c.r * Math.cos(c.th); out[1] = c.r * Math.sin(c.th);
        return c;
    }
    function laneFrom(r, d) {
        var i;
        if (d > 0) { for (i = 0; i < 4; i++) if (LANES[i] > r + 0.06) return LANES[i]; return null; }
        for (i = 3; i >= 0; i -= 1) if (LANES[i] < r - 0.06) return LANES[i];
        return null;
    }
    function setBurn(o, type, heavy) {
        if (type === 'up' || type === 'down') {
            var r1 = laneFrom(o.r, type === 'up' ? 1 : -1);
            if (r1 === null) return false;
            o.tr = { r0: o.r, r1: r1, t: 0, T: heavy ? 2.4 : 1.4 };
            return true;
        }
        o.ph = { mul: type === 'ahead' ? (heavy ? 1.35 : 1.55) : (heavy ? 0.65 : 0.45), t: 0, T: 1.2 };
        return true;
    }
    function cost(s, type) { return Math.round(COST[type] * DIFF.fuel * (s.kind === 'station' ? 1.6 : 1)); }
    function canAct(s) { return s && s.alive && s.launch <= 0 && !s.tr && !s.ph && phase === 'play'; }
    function aliveCats() { var n = 0; for (var i = 0; i < sats.length; i++) if (sats[i].alive && sats[i].kind === 'cat') n++; return n; }
    function station() { for (var i = 0; i < sats.length; i++) if (sats[i].kind === 'station') return sats[i]; return null; }
    function selSat() { for (var i = 0; i < sats.length; i++) if (sats[i].id === selId && sats[i].alive) return sats[i]; return null; }

    /* hazards: an orbit (or a straight line for meteors), an estimated position error and drawing data */
    var SHAPES = [];
    (function () {
        seed = 4242;
        for (var i = 0; i < 6; i++) {
            var n = 5 + Math.floor(srnd() * 4), pts = [];
            for (var j = 0; j < n; j++) { var a = j / n * TAU + (srnd() - 0.5) * 0.6; pts.push([Math.cos(a) * (0.6 + srnd() * 0.5), Math.sin(a) * (0.6 + srnd() * 0.5)]); }
            SHAPES.push(pts);
        }
    })();
    function newHaz(kind, orb, lin) {
        return { id: ++uid, kind: kind, orb: orb, lin: lin || null, x: 0, y: 0, r: HIT[kind], err: 0, rot: Math.random() * TAU,
            spin: rnd(-1.6, 1.6), shape: Math.floor(Math.random() * SHAPES.length), age: 0, nudges: 0, dead: false, grace: 0,
            P: new Float32Array(2 * KS + 2), Z: kind === 'fuzzy' ? new Float32Array(2 * KS + 2) : null, offR: 0, offA: 0,
            bx0: 0, bx1: 0, by0: 0, by1: 0, zx: 0, zy: 0, blink: Math.random() * 3 };
    }
    function zoneOf(h, x, y, out) {   /* the published zone centre: the true position shifted by a secret offset */
        var r = Math.hypot(x, y) - h.offR, a = Math.atan2(y, x) - h.offA;
        out[0] = r * Math.cos(a); out[1] = r * Math.sin(a);
    }
    function hazPos(h, t, est, out) {
        if (h.lin) { out[0] = h.lin.x + h.lin.vx * t; out[1] = h.lin.y + h.lin.vy * t; return; }
        ellPos(h.orb, h.orb.M + h.orb.n * t + (est ? h.err : 0), out);
    }
    function place(h) {
        hazPos(h, 0, false, tmp); h.x = tmp[0]; h.y = tmp[1];
        if (h.Z) { zoneOf(h, h.x, h.y, tmp); h.zx = tmp[0]; h.zy = tmp[1]; }
    }
    function sampleHaz(h) {
        var P = h.P, Z = h.Z, k, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (k = 0; k <= KS; k++) {
            hazPos(h, k * DTP, true, tmp);
            var x = tmp[0], y = tmp[1];
            P[2 * k] = x; P[2 * k + 1] = y;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            if (Z) {
                zoneOf(h, x, y, tmp2); Z[2 * k] = tmp2[0]; Z[2 * k + 1] = tmp2[1];
                if (tmp2[0] < x0) x0 = tmp2[0]; if (tmp2[0] > x1) x1 = tmp2[0]; if (tmp2[1] < y0) y0 = tmp2[1]; if (tmp2[1] > y1) y1 = tmp2[1];
            }
        }
        h.bx0 = x0; h.bx1 = x1; h.by0 = y0; h.by1 = y1;
    }
    function hazVel(h, out) {
        if (h.lin) { out[0] = h.lin.vx; out[1] = h.lin.vy; return; }
        var o = h.orb, d = 0.004;
        ellPos(o, o.M - d, tmp2); var ax = tmp2[0], ay = tmp2[1];
        ellPos(o, o.M + d, tmp2);
        out[0] = (tmp2[0] - ax) / (2 * d / o.n); out[1] = (tmp2[1] - ay) / (2 * d / o.n);
    }
    function satVel(s, out) { var w = omega(s.r) * (s.ph ? s.ph.mul : 1); out[0] = -w * s.y; out[1] = w * s.x; }
    function laserKind(h) { return h.kind === 'debris' || h.kind === 'frag' || h.kind === 'meteor' ? 'zap' : h.kind === 'big' ? 'nudge' : null; }
    function countKind(k) { var n = 0; for (var i = 0; i < hazards.length; i++) if (!hazards[i].dead && hazards[i].kind === k) n++; return n; }

    /* conjunctions: closest approach of two sampled paths (linear between samples) */
    var CL = { d: 0, t: 0 };
    function closest(A, B, kmax) {
        var best = 1e9, bt = 0, k, n = kmax || KS;
        var dx0 = B[0] - A[0], dy0 = B[1] - A[1];
        for (k = 0; k < n; k++) {
            var dx1 = B[2 * k + 2] - A[2 * k + 2], dy1 = B[2 * k + 3] - A[2 * k + 3];
            var ex = dx1 - dx0, ey = dy1 - dy0, ee = ex * ex + ey * ey, s = 0;
            if (ee > 1e-12) s = clamp(-(dx0 * ex + dy0 * ey) / ee, 0, 1);
            var qx = dx0 + ex * s, qy = dy0 + ey * s, q = qx * qx + qy * qy;
            if (q < best) { best = q; bt = k + s; }
            dx0 = dx1; dy0 = dy1;
        }
        CL.d = Math.sqrt(best); CL.t = bt * DTP;
        return CL;
    }
    function atT(A, t, out) {
        var f = clamp(t / DTP, 0, KS), k = Math.min(KS - 1, Math.floor(f)), s = f - k;
        out[0] = A[2 * k] + (A[2 * k + 2] - A[2 * k]) * s; out[1] = A[2 * k + 1] + (A[2 * k + 3] - A[2 * k + 1]) * s;
    }
    function near(a, b, m) { return !(a.bx0 - m > b.bx1 || b.bx0 - m > a.bx1 || a.by0 - m > b.by1 || b.by0 - m > a.by1); }
    function posErr(h) { return h.orb ? Math.abs(h.err) * h.orb.a : 0; }
    function riskOf(d, hs, t, pe) {   /* miss distance to a risk: a Gaussian whose width grows with time and track error */
        if (d <= hs) return 0.99;
        var sg = (0.03 + 0.014 * t + pe) * (storm > 0 ? 1.7 : 1), m = d - hs;
        return Math.exp(-0.5 * m * m / (sg * sg));
    }
    function validRes(s, h) {
        var r = results[s.id + ':' + h.id];
        return r && r.plan === s.plan && clock < r.until ? r : null;
    }
    function worstFor(s, A) {
        var worst = 0, j, h;
        for (j = 0; j < hazards.length; j++) {
            h = hazards[j];
            if (h.dead) continue;
            if (h.kind === 'fuzzy') { closest(A, h.Z); if (CL.d < ZR + s.hr) worst = Math.max(worst, 0.6); continue; }
            closest(A, h.P);
            worst = Math.max(worst, riskOf(CL.d, s.hr + h.r, CL.t, posErr(h)));
        }
        return worst;
    }
    function optionEval(s, type, out) {
        var c = cloneSat(s);
        if (!setBurn(c, type, s.kind === 'station')) return null;
        sampleSat(c, out);
        return worstFor(s, out);
    }

    function predict() {
        needPredict = false;
        var gone = clock - lastPred, i, j, s, h, list = [];
        lastPred = clock; predAge = 0;
        for (i = 0; i < sats.length; i++) { s = sats[i]; if (s.alive) sampleSat(cloneSat(s), s.P, s); }
        for (i = 0; i < hazards.length; i++) if (!hazards[i].dead) sampleHaz(hazards[i]);
        for (i = 0; i < sats.length; i++) {
            s = sats[i];
            if (!s.alive || s.launch > 0) continue;
            for (j = 0; j < hazards.length; j++) {
                h = hazards[j];
                if (h.dead) continue;
                var hs = s.hr + h.r;
                if (h.kind === 'fuzzy') {
                    if (!near(s, h, ZR + s.hr)) continue;
                    closest(s.P, h.Z);
                    if (CL.d >= ZR + s.hr) continue;
                    var res = validRes(s, h);
                    list.push({ key: s.id + ':' + h.id, s: s, h: h, zone: true, res: res, tca: CL.t, d: CL.d, risk: res ? (res.close ? 0.99 : 0) : 0.6 });
                } else {
                    if (!near(s, h, hs + 0.45)) continue;
                    closest(s.P, h.P);
                    var rk = riskOf(CL.d, hs, CL.t, posErr(h));
                    if (rk < 0.12 || (CL.t > 6 && rk < 0.3)) continue;
                    list.push({ key: s.id + ':' + h.id, s: s, h: h, zone: false, tca: CL.t, d: CL.d, risk: rk });
                }
            }
        }
        for (i = 0; i < hazards.length; i++) {   /* big objects on a collision course with each other */
            h = hazards[i];
            if (h.dead || !BIG[h.kind]) continue;
            for (j = i + 1; j < hazards.length; j++) {
                var h2 = hazards[j];
                if (h2.dead || !BIG[h2.kind] || !near(h, h2, h.r + h2.r + 0.3)) continue;
                closest(h.P, h2.P);
                var pr = riskOf(CL.d, h.r + h2.r, CL.t, posErr(h) + posErr(h2));
                if (pr >= 0.5) list.push({ key: 'p' + h.id + ':' + h2.id, h: h, h2: h2, pair: true, tca: CL.t, d: CL.d, risk: pr });
            }
        }
        list.sort(function (p, q) { return p.tca - q.tca; });
        alerts = list;

        /* dodge bookkeeping: a high risk conjunction that went away after a burn or a nudge */
        var seen = {};
        list.forEach(function (a) {
            if (a.pair) return;
            seen[a.key] = 1;
            var w = watch[a.key];
            if (!w) w = watch[a.key] = { s: a.s, h: a.h, armed: false, plan: 0, nudges: 0, gone: 0 };
            w.gone = 0;
            if (!w.armed && a.risk >= 0.5 && !(a.res && !a.res.close)) { w.armed = true; w.plan = a.s.plan; w.nudges = a.h.nudges; }
        });
        for (var key in watch) {
            if (seen[key]) continue;
            var w = watch[key];
            w.gone += gone;
            if (w.gone < 0.35) continue;
            delete watch[key];
            if (w.armed && w.s.alive && !w.h.dead && (w.s.plan !== w.plan || w.h.nudges !== w.nudges) && !awarded[key]) { awarded[key] = 1; dodged(w); }
        }

        ghost = null;
        var sel = selSat();
        if (sel && canAct(sel)) ghost = { up: optionEval(sel, 'up', GU), down: optionEval(sel, 'down', GD) };
    }

    /* spawning */
    function addHaz(h) { place(h); hazards.push(h); return h; }
    function safeSpawn(h, secs, dist) {   /* not too close to a cat now and no conjunction in the first seconds */
        place(h); sampleHaz(h);
        var kmax = Math.round(secs / DTP);
        for (var i = 0; i < sats.length; i++) {
            var s = sats[i];
            if (!s.alive) continue;
            if (Math.hypot(h.x - s.x, h.y - s.y) < dist) return false;
            closest(s.P, h.Z || h.P, kmax);
            if (CL.d < s.hr + (h.Z ? ZR : h.r) + 0.25) return false;
        }
        return true;
    }
    function ping(x, y, col) { pings.push({ x: x, y: y, t: 0, col: col || '#5af2d6' }); }
    function spawnFiller(kind, quiet) {
        for (var tr = 0; tr < 10; tr++) {
            var orb, h;
            if (kind === 'dog') orb = circOrb(pick([1.75, 2.15, 2.55]) + rnd(-0.03, 0.03), rnd(0, TAU), 1);
            else {
                var a = rnd(1.6, 2.95), e = kind === 'fuzzy' ? rnd(0.06, 0.1) : rnd(0, 0.17);
                var dir = kind === 'debris' && mission > 0 && Math.random() < 0.15 ? -1 : 1;
                orb = { a: a, e: e, w: rnd(0, TAU), M: rnd(0, TAU), dir: dir, n: Math.sqrt(MU / (a * a * a)) };
                if (!orbOk(orb, 1.3, 3.3)) continue;
            }
            h = newHaz(kind, orb);
            if (kind === 'fuzzy') { h.offR = rnd(-0.2, 0.2); h.offA = rnd(-0.03, 0.03); }
            if (!safeSpawn(h, 4, 0.7)) continue;
            hazards.push(h);
            if (!quiet) { h.err = rnd(0.02, 0.04) * sgn(); ping(h.x, h.y); }
            if (test) test.seen[kind] = (test.seen[kind] || 0) + 1;
            return h;
        }
        return null;
    }
    /* a designed threat: a hazard whose orbit passes through a cat's predicted position T seconds from now */
    function makeThreat() {
        var def = curDef(), cands = sats.filter(function (s) {
            if (!s.alive || s.launch > 0) return false;
            for (var i = 0; i < alerts.length; i++) if (alerts[i].s === s && alerts[i].risk > 0.3) return false;
            return true;
        });
        if (!cands.length || hazards.length >= MAXH) return null;
        var s = pick(cands), kind = def.threat[1];
        if (kind === 'mixed') kind = pick(['debris', 'debris', 'debris', 'big', 'rogue', 'dog']);
        if (def.fuzzyThreat && Math.random() < def.fuzzyThreat && countKind('fuzzy') < 4) kind = 'fuzzy';
        var styles = def.styles || ['cross', 'cross', 'retro', 'steep'];
        for (var tr = 0; tr < 12; tr++) {
            var T = rnd(5.2, 7.6), c = satAtTime(s, T, tmp3), px = tmp3[0], py = tmp3[1];
            var r = Math.hypot(px, py), vc = vcirc(r), urx = px / r, ury = py / r, utx = -ury, uty = urx;
            var st = pick(styles), vt, vr;
            if (st === 'retro') { vt = -vc * rnd(0.95, 1.05); vr = vc * rnd(-0.12, 0.12); }
            else if (st === 'steep') { vt = -vc * rnd(0.72, 0.92); vr = vc * rnd(0.25, 0.4) * sgn(); }
            else { vt = vc * rnd(0.86, 1.06); vr = vc * rnd(0.22, 0.42) * sgn(); }
            if (kind === 'fuzzy') { vt = vc * rnd(0.88, 1.04); vr = vc * rnd(0.25, 0.4) * sgn(); }
            var vx = urx * vr + utx * vt, vy = ury * vr + uty * vt, qx = px, qy = py;
            var close = true;
            if (kind === 'fuzzy') {   /* aim the true orbit at the cat (too close) or just past it (safe), across the relative motion */
                var w = omega(c.r), rvx = vx + w * py, rvy = vy - w * px, rl = Math.hypot(rvx, rvy) || 1;
                close = Math.random() < 0.45;
                var off = (close ? rnd(-0.05, 0.05) : rnd(0.2, 0.22) * sgn());
                qx = px - rvy / rl * off; qy = py + rvx / rl * off;
            }
            var orb = toOrbit(qx, qy, vx, vy);
            if (!orbOk(orb, 1.22, 3.6)) continue;
            orb.M -= orb.n * T;
            var h = newHaz(kind, orb);
            if (kind === 'fuzzy') {
                h.offR = clamp(Math.hypot(qx, qy) - r + rnd(-0.03, 0.03), -0.24, 0.24);
                h.offA = clamp(wrapA(Math.atan2(qy, qx) - Math.atan2(py, px)) + rnd(-0.015, 0.015), -0.04, 0.04);
            }
            if (!safeSpawn(h, 3, 0.75)) continue;
            if (kind !== 'fuzzy') h.err = rnd(0.02, 0.045) * sgn();
            hazards.push(h);
            ping(h.x, h.y, kind === 'fuzzy' ? '#c39bff' : null);
            if (test) { test.seen[kind] = (test.seen[kind] || 0) + 1; test.threats++; }
            needPredict = true;
            return h;
        }
        return null;
    }
    function compass(a) {
        var i = ((Math.round(wrapA(a) / (Math.PI / 4)) % 8) + 8) % 8;
        return ['east', 'north east', 'north', 'north west', 'west', 'south west', 'south', 'south east'][i];
    }
    function swarmEvent() {
        var ang = rnd(0, TAU), V = 1.6, ux = -Math.cos(ang), uy = -Math.sin(ang), px = -uy, py = ux, lead = DIFF.lead;
        var n = Math.round((endless ? 6 + Math.min(6, endless) : 5 + Math.min(4, mission)) * DIFF.swarm);
        var live = sats.filter(function (s) { return s.alive && s.launch <= 0; });
        for (var i = 0; i < n && hazards.length < MAXH; i++) {
            var sx, sy, sp = V * rnd(0.95, 1.05);
            if (i < 2 && live.length) {
                var T = lead + rnd(0.3, 1.6);
                satAtTime(live[(i + Math.floor(Math.random() * live.length)) % live.length], T, tmp3);
                sp = V; sx = tmp3[0] - ux * V * T; sy = tmp3[1] - uy * V * T;
            } else {
                var off = rnd(-2.5, 2.5), lag = lead + rnd(0, 2);
                sx = -ux * V * lag + px * off; sy = -uy * V * lag + py * off;
            }
            var h = newHaz('meteor', null, { x: sx, y: sy, vx: ux * sp, vy: uy * sp });
            h.r = HIT.meteor * rnd(0.85, 1.2);
            addHaz(h);
        }
        swarmWarn = { ang: ang, t: lead + 1 };
        toast('Meteor swarm from the ' + compass(ang) + ' in ' + Math.round(lead) + ' s!', 3200, 'warn');
        say(pick(['Meteors! Shiny, but rude.', 'Incoming rocks! Watch the tracks.', 'Meteor swarm! Zap or dodge!']), 'wow');
        if (test) test.swarms++;
        needPredict = true;
    }
    function kesslerEvent(T) {
        T = T || 15;
        var live = sats.filter(function (s) { return s.alive && s.kind === 'cat' && s.launch <= 0; });
        for (var tr = 0; tr < 24; tr++) {
            var phi, rc;
            if (live.length && tr < 16) {
                var s = pick(live), c = satAtTime(s, T - 2, tmp3);
                phi = c.th + rnd(0.3, 0.7);
                rc = clamp(c.r + pick([-0.2, 0.2]), 1.75, 2.55);
            } else { phi = rnd(0, TAU); rc = pick([1.75, 2.15, 2.55]); }
            var A = newHaz('rogue', circOrb(rc, 0, 1));
            A.orb.M = phi - A.orb.n * T;
            var vc = vcirc(rc), vt = vc * rnd(0.86, 0.95), vr = vc * rnd(0.3, 0.42) * sgn();
            var cx0 = Math.cos(phi), cy0 = Math.sin(phi);
            var orb = toOrbit(rc * cx0, rc * cy0, cx0 * vr - cy0 * vt, cy0 * vr + cx0 * vt);
            if (!orbOk(orb, 1.25, 3.4)) continue;
            orb.M -= orb.n * T;
            var B = newHaz('big', orb);
            if (!safeSpawn(A, 2.5, 0.6) || !safeSpawn(B, 2.5, 0.6)) continue;
            hazards.push(A, B);
            ping(A.x, A.y, '#ff8a3d'); ping(B.x, B.y, '#ff8a3d');
            kess = { a: A, b: B, hit: false };
            toast('Kessler alert: a dead sat and a rocket body collide in ' + Math.round(T) + ' s!', 3800, 'warn');
            say('Nudge the rocket body with a laser!', 'think');
            if (test) test.kess++;
            needPredict = true;
            return true;
        }
        return false;
    }
    function startStorm() {
        storm = 14; stormKick = 1;
        sats.forEach(function (s) { s.drag = s.kind === 'station' ? -0.006 : -0.012; });
        toast('Solar storm! Drag pulls the orbits down', 3000, 'warn');
        say('Solar storm! Hold on to your whiskers.', 'wow');
        api.sfx('hit');
        if (test) test.storms++;
        needPredict = true;
    }
    function endStorm() {
        storm = 0;
        sats.forEach(function (s) { s.drag = 0; });
        toast('Storm over: raise your cats back up', 2600, 'info');
        needPredict = true;
    }
    function runEvent(name) {
        if (name === 'swarm') swarmEvent();
        else if (name === 'kessler') kesslerEvent();
        else if (name === 'storm') {
            if (storm > 0) storm += 8;
            else if (stormWarn <= 0) { stormWarn = 3; toast('Solar flare! A storm hits in 3 s', 2800, 'warn'); }
        }
    }

    /* effects */
    function burst(x, y, n, cols, sp, life) {
        if (api.reducedMotion) n = Math.ceil(n / 3);
        for (var i = 0; i < n && parts.length < MAXP; i++) {
            var a = Math.random() * TAU, v = sp * (0.3 + Math.random());
            parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: (life || 0.8) * (0.6 + Math.random() * 0.6),
                col: pick(cols), sz: 1.5 + Math.random() * 2 });
        }
    }
    function addText(x, y, text, col) { texts.push({ x: x, y: y, text: text, col: col || '#fff', t: 0 }); if (texts.length > 12) texts.shift(); }
    function boom(x, y, size) {
        flashes.push({ x: x, y: y, t: 0, max: 0.55, size: size });
        burst(x, y, Math.round(26 * size), ['#fff4c2', '#ffb347', '#ff6b4a', '#9aa3b5'], 0.9 * size, 1);
        if (!api.reducedMotion) shake = Math.max(shake, 5 * size);
    }
    var lastToast = 0;
    function toast(text, ms, kind) {
        toastEl.textContent = text;
        toastEl.className = 'op-toast' + (kind === 'info' ? ' op-info' : kind === 'good' ? ' op-good' : '');
        lastToast = clock + (ms || 2500) / 1000;
    }
    function say(text, mood, force) {
        if (!force && clock - lastSay < 2.6) return;
        lastSay = clock;
        if (mood) api.cat(mood);
        api.say(text, 2000);
    }

    /* collisions, explosions and fragment clouds */
    function fragments(x, y, vx, vy, n) {
        var made = 0;
        for (var i = 0; i < n; i++) {
            if (hazards.length >= MAXH) break;
            var a = Math.random() * TAU, dv = vcirc(Math.hypot(x, y)) * rnd(0.03, 0.13);
            var fx = x + rnd(-0.03, 0.03), fy = y + rnd(-0.03, 0.03);
            var orb = toOrbit(fx, fy, vx + Math.cos(a) * dv, vy + Math.sin(a) * dv);
            if (!orbOk(orb, 1.06, 4)) {   /* this one falls into the atmosphere: a streak */
                burst(fx, fy, 3, ['#ffb347', '#ff6b4a'], 0.6, 0.7);
                continue;
            }
            var h = newHaz('frag', orb);
            h.err = rnd(-0.035, 0.035); h.grace = 0.45; h.hot = 1; h.life = rnd(24, 40);   /* small, low fragments re-enter after a while */
            addHaz(h);
            made++;
        }
        if (test) test.frags += made;
        needPredict = true;
        return made;
    }
    function killHaz(h, how) {
        if (h.dead) return;
        h.dead = true;
        if (how === 'zap') burst(h.x, h.y, 14, ['#ff7ab6', '#ffe1f0', '#ffd66b'], 0.6, 0.6);
        else if (how === 'burn') burst(h.x, h.y, 10, ['#ffb347', '#ff6b4a', '#fff4c2'], 0.5, 0.7);
        else burst(h.x, h.y, 8, ['#c9d2e8', '#ffd66b'], 0.5, 0.5);
        if (kess && (h === kess.a || h === kess.b) && how === 'crash') kess.hit = true;
        needPredict = true;
    }
    function crash(h1, h2) {   /* two big objects: a Kessler cascade */
        var x = (h1.x + h2.x) / 2, y = (h1.y + h2.y) / 2;
        hazVel(h1, tmp); var ax = tmp[0], ay = tmp[1];
        hazVel(h2, tmp); var bx = tmp[0], by = tmp[1];
        killHaz(h1, 'crash'); killHaz(h2, 'crash');
        fragments(x, y, ax, ay, 7); fragments(x, y, bx, by, 7);
        boom(x, y, 1.6);
        addText(x, y, 'KESSLER CASCADE!', '#ff8a3d');
        if (h1.kind === 'fuzzy' || h2.kind === 'fuzzy') addText(x, y - 0.2, 'secret orbit revealed', '#c39bff');
        toast('Cascade! A new debris cloud is spreading', 3000, 'warn');
        say(pick(['Kessler cascade! So much junk.', 'Oh no, a debris cloud!', 'Hiss! That made a mess.']), 'sad', true);
        api.sfx('hit');
        if (test) test.cascades++;
    }
    function hitSat(s, h) {
        var small = h.kind === 'debris' || h.kind === 'frag' || h.kind === 'meteor';
        if (test) test.hits++;
        redFlash = 1;
        if (small) {
            killHaz(h, 'hit');
            s.hp -= 1; s.hurt = 0.7;
            api.sfx('hit');
            if (s.hp <= 0) destroySat(s, h);
            else { addText(s.x, s.y, 'Ouch! Hull dented', '#ff8fab'); say(s.name + ' got dented! One more hit and it is lost.', 'sad', true); }
            return;
        }
        if (s.kind === 'station') {
            s.hp -= 2; s.hurt = 0.9;
            hazVel(h, tmp); killHaz(h, 'crash'); fragments(h.x, h.y, tmp[0], tmp[1], 5); boom(h.x, h.y, 1.1);
            api.sfx('hit');
            if (s.hp <= 0) destroySat(s, h);
            else say('The station took a big hit!', 'sad', true);
            return;
        }
        hazVel(h, tmp); var hx = tmp[0], hy = tmp[1];
        killHaz(h, 'crash');
        fragments(h.x, h.y, hx, hy, 5);
        if (h.kind === 'fuzzy') addText(h.x, h.y + 0.2, 'secret orbit revealed', '#c39bff');
        if (test) test.cascades++;
        destroySat(s, h);
    }
    function destroySat(s, h, why) {
        if (!s.alive) return;
        s.alive = false;
        mstat.lost++; totals.lost++;
        if (why === 'burn') {
            burst(s.x, s.y, 20, ['#ffb347', '#ff6b4a', '#fff4c2'], 0.6, 1);
            addText(s.x, s.y, s.name + ' burned up', '#ffb347');
        } else {
            satVel(s, tmp);
            fragments(s.x, s.y, tmp[0], tmp[1], s.kind === 'station' ? 10 : 6);
            boom(s.x, s.y, s.kind === 'station' ? 2 : 1.3);
            addText(s.x, s.y, s.name + ' lost!', '#ff6b8b');
        }
        api.sfx('hit');
        if (pending && pending.s === s) pending = null;
        if (s.kind === 'station') { gameOver('The Purr Station was destroyed.'); return; }
        if (spares > 0) {
            spares -= 1;
            launches.push({ t: 2.4, r: LANES[0] });
            say(pick(['Noooo, ' + s.name + '! Launching a spare cat.', 'We lost ' + s.name + '. Spare cat on the pad!']), 'sad', true);
        } else say('We lost ' + s.name + '!', 'sad', true);
        if (selId === s.id) selectNext(1);
        if (!aliveCats() && !launches.length) gameOver('Every cat satellite is gone.');
    }
    function launchSat(r) {
        var best = rnd(0, TAU), bw = 9;
        for (var i = 0; i < 6; i++) {   /* pick a quiet spot for the launch */
            var th = rnd(0, TAU), w = 0;
            for (var j = 0; j < hazards.length; j++) if (!hazards[j].dead) { var d = Math.hypot(hazards[j].x - r * Math.cos(th), hazards[j].y - r * Math.sin(th)); if (d < 0.8) w += 0.8 - d; }
            if (w < bw) { bw = w; best = th; }
        }
        var s = makeSat('cat', 1.02, best - omega(1.3) * 2.2);
        s.tr = { r0: 1.02, r1: r, t: 0, T: 2.2 }; s.launch = 2.2;
        sats.push(s);
        if (!selSat()) selId = s.id;
        toast(s.name + ' is launching!', 2200, 'info');
        api.sfx('jump');
        needPredict = true;
    }

    /* player actions */
    function uplink(s) { uplinks.push({ s: s, t: 0 }); }
    function burnSat(s, type) {
        if (!canAct(s)) {
            if (s && s.alive && (s.tr || s.ph)) say(s.name + ' is still burning.', 'think');
            return false;
        }
        var c = cost(s, type);
        if (s.fuel < c) { toast(s.name + ' is out of fuel: use the laser!', 2200, 'warn'); api.sfx('lose'); return false; }
        if (!setBurn(s, type, s.kind === 'station')) {
            toast(type === 'up' ? 'Already on the highest lane' : 'Already on the lowest lane', 1800, 'info');
            return false;
        }
        s.fuel -= c; s.plan++;
        api.sfx(type === 'up' ? 'jump' : 'move');
        uplink(s);
        if (test) test.burns++;
        needPredict = true;
        return true;
    }
    function los(x0, y0, x1, y1) {   /* the planet blocks the beam? */
        var dx = x1 - x0, dy = y1 - y0, ll = dx * dx + dy * dy, t = ll ? clamp(-(x0 * dx + y0 * dy) / ll, 0, 1) : 0;
        return Math.hypot(x0 + dx * t, y0 + dy * t) > 1.04;
    }
    function inRange(s, h) {
        return s.alive && s.launch <= 0 && Math.hypot(h.x - s.x, h.y - s.y) <= (s.kind === 'station' ? RANGE_ST : RANGE) && los(s.x, s.y, h.x, h.y);
    }
    function shooterFor(h) {
        var sel = selSat(), best = null, bd = 9;
        if (sel && !sel.hot && inRange(sel, h)) return sel;
        for (var i = 0; i < sats.length; i++) {
            var s = sats[i];
            if (s.hot || !inRange(s, h)) continue;
            var d = Math.hypot(h.x - s.x, h.y - s.y);
            if (d < bd) { bd = d; best = s; }
        }
        return best;
    }
    function fireLaser(s, h) {
        var k = laserKind(h);
        if (!k || h.dead || s.hot) return false;
        s.heat += (k === 'zap' ? 30 : 45) * DIFF.heat;
        if (s.heat >= 100) { s.heat = 100; s.hot = true; say(s.name + '\'s laser is too hot. Cooling down!', 'think'); }
        beams.push({ x0: s.x, y0: s.y, x1: h.x, y1: h.y, t: 0, nudge: k === 'nudge' });
        if (test) test.shots++;
        if (k === 'zap') {
            killHaz(h, 'zap');
            var pts = h.kind === 'meteor' ? 10 : 25;
            score += pts;
            addText(h.x, h.y, '+' + pts, '#ff9ccd');
            if (h.kind === 'meteor') { mstat.meteors++; totals.meteors++; if (test) test.meteorZaps++; }
            else { mstat.zaps++; totals.zaps++; if (test) test.zaps++; }
            api.sfx('pop');
            if (Math.random() < 0.3) say(pick(['Pew pew!', 'Red dot got it!', 'Zap! Vaporised.', 'Mrrp, laser time.']), 'happy');
        } else {
            nudge(h);
            addText(h.x, h.y, 'nudged', '#ffd66b');
            api.sfx('point');
            if (test) test.nudges++;
        }
        needPredict = true;
        return true;
    }
    function nudge(h) {   /* small push on a rocket body: pick the push that makes its worst conjunction miss by the most */
        var target = null, i, a;
        for (i = 0; i < alerts.length; i++) {
            a = alerts[i];
            if (a.pair && (a.h === h || a.h2 === h)) { target = (a.h === h ? a.h2 : a.h).P; break; }
            if (!a.pair && a.h === h) { target = a.s.P; break; }
        }
        hazVel(h, tmp);
        var vx = tmp[0], vy = tmp[1], r = Math.hypot(h.x, h.y), m = vcirc(r) * 0.13, best = null, bs = -1;
        var dirs = [[h.x / r, h.y / r], [-h.x / r, -h.y / r], [-h.y / r, h.x / r], [h.y / r, -h.x / r]];
        var saveOrb = h.orb, saveErr = h.err;
        for (i = 0; i < 4; i++) {
            var orb = toOrbit(h.x, h.y, vx + dirs[i][0] * m, vy + dirs[i][1] * m);
            if (!orbOk(orb, 1.18, 3.8)) continue;
            h.orb = orb; h.err = 0;
            sampleHaz(h);
            var sc = target ? closest(target, h.P).d : Math.random();
            for (var j = 0; j < sats.length; j++) if (sats[j].alive && sats[j].P !== target) { closest(sats[j].P, h.P); if (CL.d < 0.25) sc -= 0.25 - CL.d; }
            if (sc > bs) { bs = sc; best = orb; }
        }
        h.orb = best || saveOrb; h.err = best ? saveErr * 0.5 : saveErr;
        if (best) h.nudges++;
    }
    function laserAuto(s) {
        if (!s || !s.alive) return;
        if (s.hot) { toast(s.name + '\'s laser is cooling down', 1600, 'info'); api.sfx('tap'); return; }
        var best = null, bd = 99, i, a;
        for (i = 0; i < alerts.length; i++) {   /* the most urgent threat first */
            a = alerts[i];
            var h = a.pair ? (a.h.kind === 'big' ? a.h : a.h2.kind === 'big' ? a.h2 : null) : (a.s === s ? a.h : null);
            if (h && laserKind(h) && inRange(s, h) && a.tca < bd) { bd = a.tca; best = h; }
        }
        if (!best) {
            for (i = 0; i < hazards.length; i++) {
                var hz = hazards[i];
                if (hz.dead || laserKind(hz) !== 'zap' || !inRange(s, hz)) continue;
                var d = Math.hypot(hz.x - s.x, hz.y - s.y) + 50;
                if (d < bd) { bd = d; best = hz; }
            }
        }
        if (best) fireLaser(s, best);
        else { toast('Nothing to zap in ' + s.name + '\'s range', 1600, 'info'); api.sfx('tap'); }
    }
    function tapHaz(h) {
        var k = laserKind(h);
        if (!k) {
            addText(h.x, h.y, h.kind === 'dog' ? 'not ours!' : 'too big, dodge it', '#ffd66b');
            say(h.kind === 'dog' ? 'That belongs to Woof Co. No zapping!' : 'Too big to zap. Dodge it!', 'think');
            return;
        }
        var s = shooterFor(h);
        if (!s) {
            var anyHot = sats.some(function (q) { return q.hot && inRange(q, h); });
            addText(h.x, h.y, anyHot ? 'laser too hot' : 'out of range', '#ffd66b');
            api.sfx('tap');
            return;
        }
        fireLaser(s, h);
    }
    function privCheck(s, h) {
        if (pending) return;
        if (checksLeft <= 0) { toast('No private checks left this mission', 2000, 'info'); return; }
        checksLeft -= 1;
        pending = { s: s, h: h, t: 1.1 };
        api.sfx('tap'); api.cat('think');
        if (test) test.checks++;
    }
    function checkAuto(s, h) {
        if (!s || !s.alive) return;
        if (!h) {
            for (var i = 0; i < alerts.length; i++) if (alerts[i].zone && alerts[i].s === s && !alerts[i].res) { h = alerts[i].h; break; }
        }
        if (!h) { toast('No private zone on ' + s.name + '\'s path', 1800, 'info'); api.sfx('tap'); return; }
        privCheck(s, h);
    }
    function resolveCheck() {
        var s = pending.s, h = pending.h;
        pending = null;
        sampleSat(cloneSat(s), s.P, s); sampleHaz(h);
        closest(s.P, h.P);
        var close = CL.d < s.hr + h.r + 0.02;
        results[s.id + ':' + h.id] = { close: close, plan: s.plan, until: clock + HOR };
        if (close) {
            addText(s.x, s.y, 'TOO CLOSE', '#ff6b8b');
            api.sfx('move');
            say('Private check: too close! Move ' + s.name + '!', 'wow', true);
        } else {
            score += 30; mstat.safe++; totals.safe++;
            addText(s.x, s.y, 'SAFE +30', '#7dffb5');
            api.sfx('point');
            say(pick(['Private check says safe. No fuel wasted!', 'Safe! And their secret stays secret.']), 'happy', true);
        }
        if (test) test.results.push(close ? 'close' : 'safe');
        needPredict = true;
    }
    function dodged(w) {
        score += 15; mstat.dodges++; totals.dodges++;
        addText(w.s.x, w.s.y, 'Dodged! +15', '#7dffb5');
        api.sfx('point');
        say(pick(['Purrfect dodge!', 'Whiskers intact!', 'Close call, nice burn!', 'Mrrp, missed us!']), 'happy');
        if (test) test.dodges++;
    }
    function select(s) {
        if (!s || !s.alive) return;
        if (selId !== s.id) api.sfx('tap');
        selId = s.id;
        needPredict = true;
    }
    function selectNext(d) {
        var live = sats.filter(function (s) { return s.alive; });
        if (!live.length) { selId = 0; return; }
        var i = 0;
        for (var j = 0; j < live.length; j++) if (live[j].id === selId) i = j;
        select(live[(i + d + live.length) % live.length]);
        if (!selSat()) selId = live[0].id;
    }
    function act(type) {
        if (phase === 'brief') { begin(); return; }
        if (phase === 'done' && phaseT > 1) { nextMission(); return; }
        if (phase !== 'play') return;
        var s = selSat();
        if (!s) { toast('Tap a cat satellite first', 1600, 'info'); return; }
        if (type === 'laser') laserAuto(s);
        else if (type === 'check') checkAuto(s);
        else if (s.launch > 0) toast(s.name + ' is still launching', 1500, 'info');
        else burnSat(s, type);
    }

    /* missions */
    function startMission(n) {
        if (n >= 0) mission = n;
        var def;
        if (endless) waveCache = waveDef(endless);
        def = curDef();
        hazards = []; parts = []; texts = []; beams = []; pings = []; flashes = []; uplinks = []; bits = [];
        alerts = []; watch = {}; results = {}; launches = []; ghost = null;
        pending = null; kess = null; storm = 0; stormWarn = 0; swarmWarn = null; catIdx = 0; lastToast = 0;
        mstat = { zaps: 0, meteors: 0, dodges: 0, safe: 0, docks: 0, lost: 0 };
        sats = [];
        var i, base = Math.random() * TAU;
        if (def.station) sats.push(makeSat('station', LANES[2], base + Math.PI));
        for (i = 0; i < def.sats; i++) sats.push(makeSat('cat', LANES[def.lanes[i % def.lanes.length]], base + i * TAU / def.sats + rnd(-0.25, 0.25)));
        for (i = 0; i < sats.length; i++) sampleSat(cloneSat(sats[i]), sats[i].P, sats[i]);
        var fill = Math.round(def.filler * DIFF.fill);
        for (i = 0; i < fill; i++) spawnFiller('debris', true);
        for (i = 0; i < (def.bigs || 0); i++) spawnFiller('big', true);
        for (i = 0; i < (def.rogues || 0); i++) spawnFiller('rogue', true);
        for (i = 0; i < (def.dogs || 0); i++) spawnFiller('dog', true);
        for (i = 0; i < (def.fuzzy || 0); i++) spawnFiller('fuzzy', true);
        checksLeft = def.fuzzy || def.fuzzyThreat ? 3 : 0;
        checkBtn.style.display = checksLeft ? '' : 'none';
        events = (def.events || []).map(function (e) { return [e[0], e[1]]; }).sort(function (a, b) { return a[0] - b[0]; });
        nextThreat = def.threat ? def.threat[0] * DIFF.threat * 0.7 : 99;
        fillT = 3; mt = 0; scoreAcc = 0;
        phase = 'brief'; phaseT = 0;
        var st = station();
        selId = sats[st ? 1 : 0].id;
        var g = goalInfo();
        showCard(endless ? 'Endless orbit' : 'Mission ' + (mission + 1) + ' of ' + MISSIONS.length,
            endless ? 'Wave ' + endless : def.title, def.brief,
            (g ? 'Bonus: ' + g.label + '\n' : '') + (touchy ? 'Tap to start' : 'Click or press Space to start'), '');
        hud(true);
        fit(api.size());
        predict();
        hud(true);
    }
    function begin() {
        if (phase !== 'brief') return;
        phase = 'play'; phaseT = 0;
        hideCard();
        if (!endless && mission === 0) say('Tap a cat, then Raise or Lower when the red ring shows!', 'happy', true);
        else say(pick(['Eyes on the conjunction list!', 'Keep those whiskers clean!', 'Ground control to cat satellite...']), 'happy', true);
    }
    function goalInfo() {
        var g = curDef().goal;
        if (!g) return null;
        var n = g.n || 0;
        switch (g.type) {
            case 'dodge': return { label: 'dodge ' + n + ' close calls', text: 'Dodge ' + Math.min(n, mstat.dodges) + '/' + n, done: mstat.dodges >= n };
            case 'zap': return { label: 'zap ' + n + ' pieces of junk', text: 'Zap ' + Math.min(n, mstat.zaps) + '/' + n, done: mstat.zaps >= n };
            case 'check': return { label: n + ' safe private checks', text: 'Safe checks ' + Math.min(n, mstat.safe) + '/' + n, done: mstat.safe >= n };
            case 'meteor': return { label: 'zap ' + n + ' meteors', text: 'Meteors ' + Math.min(n, mstat.meteors) + '/' + n, done: mstat.meteors >= n };
            case 'prevent': return { label: 'stop the crash', text: kess && kess.hit ? 'Crash happened' : 'Stop the crash', done: !!kess && !kess.hit };
            case 'safe': return { label: 'lose no cat', text: mstat.lost ? 'A cat was lost' : 'No cat lost', done: !mstat.lost };
            case 'dock': return { label: 'dock ' + n + ' couriers', text: 'Docked ' + Math.min(n, mstat.docks) + '/' + n, done: mstat.docks >= n };
        }
        return null;
    }
    function missionDone() {
        phase = 'done'; phaseT = 0;
        var def = curDef(), cats = sats.filter(function (s) { return s.alive && s.kind === 'cat'; });
        var fuel = 0;
        cats.forEach(function (s) { fuel += s.fuel; });
        var g = goalInfo(), bonus = g && g.done ? 150 : 0, st = station(), stB = st && st.alive ? 200 : 0;
        var add = cats.length * 100 + Math.round(fuel / 2) + bonus + stB;
        score += add;
        if (!endless) cleared = mission + 1;
        var extra = '';
        if ((!endless && (mission === 1 || mission === 3 || mission === 5)) || (endless && endless % 2 === 0)) {
            if (spares < 5) { spares += 1; extra = '\nA spare cat joins the team.'; }
        }
        showCard(endless ? 'Wave ' + endless + ' cleared' : 'Mission ' + (mission + 1) + ' complete',
            pick(['Purrfect orbit!', 'Whiskers intact!', 'Clean skies!', 'Mission meowcomplished!']),
            cats.length + ' cats safe: ' + cats.length * 100 + '.  Fuel left: ' + Math.round(fuel / 2) +
            (stB ? '.  Station: 200' : '') + (bonus ? '.  Bonus: 150' : '') + '.' + extra,
            '+' + add + ' points', 'op-good');
        api.sfx('win'); api.cat('happy');
        say(pick(['Ground control is proud of you!', 'All paws on deck for the next one!', 'Mrrrp! Next orbit!']), 'happy', true);
        pending = null;
        if (test) test.missions++;
    }
    function nextMission() {
        if (phase !== 'done') return;
        if (!endless && mission + 1 < MISSIONS.length) startMission(mission + 1);
        else { endless += 1; startMission(-1); }
    }
    function gameOver(text) {
        if (phase === 'over') return;
        phase = 'over'; phaseT = 0;
        gameOver.text = text;
        hideCard();
    }
    function finish() {
        if (ended) return;
        ended = true;
        var win = cleared >= MISSIONS.length, def = curDef();
        api.end({ score: score, win: win,
            text: gameOver.text + '\n' + (win ? 'You reached endless wave ' + endless + '!' :
                'Missions cleared: ' + cleared + ' of ' + MISSIONS.length + ' (lost in ' + def.title + ').') +
                '\nJunk zapped ' + totals.zaps + ', dodges ' + totals.dodges + ', safe checks ' + totals.safe + '.\nScore ' + score });
    }

    /* the simulation */
    function sim(dt) {
        var def = curDef(), i, j, s, h;
        mt += dt;
        while (events.length && events[0][0] <= mt) runEvent(events.shift()[1]);
        if (def.threat) {
            nextThreat -= dt;
            if (nextThreat <= 0) { makeThreat(); nextThreat = def.threat[0] * DIFF.threat * rnd(0.8, 1.2); }
        }
        fillT -= dt;
        if (fillT <= 0) { fillT = 3; if (countKind('debris') < Math.round(def.filler * DIFF.fill)) spawnFiller('debris'); }
        if (stormWarn > 0) { stormWarn -= dt; if (stormWarn <= 0) startStorm(); }
        if (storm > 0) {
            storm -= dt; stormKick -= dt;
            if (stormKick <= 0) {   /* gusts nobody can predict */
                stormKick = rnd(0.9, 1.6);
                var live = sats.filter(function (q) { return q.alive && q.kind === 'cat' && q.launch <= 0; });
                if (live.length) { var q = pick(live); q.kick = { v: rnd(-0.12, 0.05), t: 0.7 }; burst(q.x, q.y, 6, ['#7dffb5', '#b48cff'], 0.4, 0.6); }
            }
            if (storm <= 0) endStorm();
        }
        if (swarmWarn) { swarmWarn.t -= dt; if (swarmWarn.t <= 0) swarmWarn = null; }
        var st = station();
        for (i = 0; i < sats.length; i++) {
            s = sats[i];
            if (!s.alive) continue;
            if (s.launch > 0) s.launch -= dt;
            stepSatK(s, dt);
            if (s.kick) { s.r += s.kick.v * dt; s.kick.t -= dt; if (s.kick.t <= 0) s.kick = null; }
            if (s.r > 3) s.r = 3;
            s.heat = Math.max(0, s.heat - dt * (storm > 0 ? 13 : 22));
            if (s.hot && s.heat < 30) s.hot = false;
            s.hurt = Math.max(0, s.hurt - dt);
            s.x = s.r * Math.cos(s.th); s.y = s.r * Math.sin(s.th);
            if (s.r < 1.2 && s.launch <= 0) { destroySat(s, null, 'burn'); continue; }
            if (st && st.alive && s.kind === 'cat') {   /* docking with the station */
                s.dockCd -= dt;
                if (s.dockCd <= 0 && !s.tr && !s.ph && !st.tr && s.launch <= 0 && Math.hypot(s.x - st.x, s.y - st.y) < DOCK_D) {
                    s.dock += dt;
                    if (s.dock >= 1) docked(s, st);
                } else s.dock = 0;
            }
        }
        for (i = 0; i < hazards.length; i++) {
            h = hazards[i];
            if (h.dead) continue;
            h.age += dt; h.grace -= dt;
            h.rot += h.spin * dt * (api.reducedMotion ? 0.3 : 1);
            h.err *= Math.exp(-dt / 2.2);
            if (h.hot) h.hot = Math.max(0, h.hot - dt * 0.4);
            if (h.life && h.age > h.life) { killHaz(h, 'burn'); continue; }
            if (h.orb) {
                h.orb.M += h.orb.n * dt;
                if (storm > 0 && h.kind !== 'dog' && h.kind !== 'fuzzy') {
                    h.orb.a -= 0.006 * dt; h.orb.n = Math.sqrt(MU / (h.orb.a * h.orb.a * h.orb.a));
                    if (h.orb.a * (1 - h.orb.e) < 1.06) { place(h); killHaz(h, 'burn'); addText(h.x, h.y, 'burned up', '#ffb347'); continue; }
                }
            } else { h.lin.x += h.lin.vx * dt; h.lin.y += h.lin.vy * dt; }
            place(h);
            if (h.kind === 'meteor') {
                var mr = Math.hypot(h.x, h.y);
                if (mr < 1.04) { killHaz(h, 'burn'); flashes.push({ x: h.x, y: h.y, t: 0, max: 0.35, size: 0.5 }); }
                else if (mr > 8 && h.x * h.lin.vx + h.y * h.lin.vy > 0) h.dead = true;
            }
        }
        /* collisions: cats against everything, big objects against each other */
        for (i = 0; i < sats.length; i++) {
            s = sats[i];
            if (!s.alive || s.launch > 0) continue;
            for (j = 0; j < hazards.length; j++) {
                h = hazards[j];
                if (h.dead || h.grace > 0) continue;
                var dx = h.x - s.x, dy = h.y - s.y, rr = s.hr + h.r;
                if (dx * dx + dy * dy < rr * rr) {
                    if (test && test.dbg.god) continue;
                    hitSat(s, h);
                    if (!s.alive || phase !== 'play') break;
                }
            }
            if (phase !== 'play') return;
        }
        for (i = 0; i < hazards.length; i++) {
            h = hazards[i];
            if (h.dead || !BIG[h.kind]) continue;
            for (j = i + 1; j < hazards.length; j++) {
                var h2 = hazards[j];
                if (h2.dead || !BIG[h2.kind]) continue;
                var ex = h2.x - h.x, ey = h2.y - h.y, r2 = h.r + h2.r;
                if (ex * ex + ey * ey < r2 * r2) { crash(h, h2); break; }
            }
        }
        if (pending) {
            pending.t -= dt;
            if (!pending.s.alive || pending.h.dead) pending = null;
            else if (pending.t <= 0) resolveCheck();
        }
        for (i = launches.length - 1; i >= 0; i -= 1) {
            launches[i].t -= dt;
            if (launches[i].t <= 0) { var L = launches.splice(i, 1)[0]; launchSat(L.r); }
        }
        scoreAcc += dt;
        while (scoreAcc >= 1) { scoreAcc -= 1; score += aliveCats(); }
        if (hazards.some(function (q) { return q.dead; })) hazards = hazards.filter(function (q) { return !q.dead; });
        predAge += dt;
        if (needPredict || predAge >= 0.05) predict();
        if (!tutorial.ring && !endless && mission === 0 && alerts.some(function (a) { return !a.pair && a.risk >= 0.5; })) {
            tutorial.ring = true;
            toast('Red ring: a conjunction! Select that cat and Raise or Lower it.', 4000, 'warn');
        }
        if (test && test.bot) { test.botT -= dt; if (test.botT <= 0) { test.botT = 0.2; botStep(); } }
        if (mt >= def.T && phase === 'play') missionDone();
    }
    function docked(s, st) {
        s.dock = 0; s.dockCd = 8;
        s.fuel = 100; s.hp = s.maxHp; st.hp = Math.min(st.maxHp, st.hp + 1);
        s.ph = { mul: 0.5, t: 0, T: 1.4 }; s.plan++;
        score += 60; mstat.docks++; totals.docks++;
        if (spares < 5) spares += 1;
        addText(s.x, s.y, 'Docked! +60', '#7dffb5');
        burst(s.x, s.y, 16, ['#7dffb5', '#fff4c2'], 0.4, 0.8);
        api.sfx('win');
        say(pick(['Docked! The station sends a spare cat.', 'Delivery complete. Purr!']), 'happy', true);
        if (test) test.docks++;
        needPredict = true;
    }

    /* the bot, only on the test page: dodge, zap, nudge and check like a careful player */
    function botStep() {
        if (phase !== 'play') return;
        var i, a, s, sh;
        for (i = 0; i < alerts.length; i++) {
            a = alerts[i];
            if (!a.pair) continue;
            var tg = a.h.kind === 'big' ? a.h : a.h2.kind === 'big' ? a.h2 : null;
            if (tg && (sh = shooterFor(tg))) { fireLaser(sh, tg); return; }
        }
        for (i = 0; i < alerts.length; i++) {
            a = alerts[i];
            if (a.pair) continue;
            s = a.s;
            if (!s.alive || s.launch > 0) continue;
            if (a.zone) {
                if (a.res && !a.res.close) continue;
                if (!a.res && checksLeft > 0 && !pending && a.tca < 7) { selId = s.id; privCheck(s, a.h); return; }
                if (!a.res && pending && pending.s === s) continue;
            } else if (a.risk < 0.25) continue;
            if (!a.zone && laserKind(a.h) && (sh = shooterFor(a.h))) { fireLaser(sh, a.h); return; }
            if (a.tca < 5 && canAct(s)) {
                var best = null, bw = a.zone ? 0.6 : a.risk;
                ['up', 'down', 'ahead', 'back'].forEach(function (t) {
                    if (s.fuel < cost(s, t)) return;
                    var w = optionEval(s, t, GB);
                    if (w !== null && w < bw - 0.05) { bw = w; best = t; }
                });
                if (best) { selId = s.id; burnSat(s, best); return; }
            }
        }
        for (i = 0; i < hazards.length; i++) {
            var h = hazards[i];
            if (h.dead || laserKind(h) !== 'zap') continue;
            sh = shooterFor(h);
            if (sh && sh.heat < 35) { fireLaser(sh, h); return; }
        }
    }

    /* layout */
    var dpr = 1, W = 0, H = 0, S = 60, cx = 0, cy = 0, US = 6, narrow = false;
    var bgc = document.createElement('canvas');
    var surf = document.createElement('canvas'), lightsC = document.createElement('canvas'), cloudC = document.createElement('canvas');
    var nightC = document.createElement('canvas'), maskC = document.createElement('canvas'), pc = document.createElement('canvas'), lc = document.createElement('canvas');
    var PD = 2, lastRot = -9;
    function X(x) { return cx + x * S; }
    function Y(y) { return cy - y * S; }
    function fit(sz) {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, sz.w); H = Math.max(1, sz.h);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        narrow = W < 560 || (H > W * 1.1 && W < 760);
        root.classList.toggle('op-narrow', narrow);
        root.classList.toggle('op-wide', !narrow);
        var hudH = hudEl.offsetHeight || 28;
        var top = narrow ? 8 + hudH + 6 + 58 : 8 + hudH + 6;
        var bot = narrow ? ctlEl.offsetHeight + 12 : 10;
        alertsEl.style.top = narrow ? (8 + hudH + 6) + 'px' : '8px';
        toastEl.style.top = (narrow ? 8 + hudH + 6 + 62 : 8 + hudH + 8) + 'px';
        var avW = W - 12, avH = Math.max(120, H - top - bot), rad = Math.max(60, Math.min(avW, avH) / 2);
        S = rad / VIEW;
        cx = W / 2; cy = top + avH / 2;
        if (!narrow) cx = Math.max(rad * 0.85, Math.min(W / 2, W - 258 - rad * 0.88));
        US = Math.max(5.5, S * 0.092);
        cardEl.style.top = Math.round(cy) + 'px';
        cardEl.style.left = Math.round(cx) + 'px';
        buildStatic();
    }

    /* static art: background, glow, lanes and the planet textures */
    var CONT = [], LIGHTS = [], CLOUDS = [], STARS = [];
    (function () {
        seed = 90210;
        var i, j;
        for (i = 0; i < 8; i++) {
            var a = srnd() * TAU, rd = 0.42 + srnd() * 0.42, n = 4 + Math.floor(srnd() * 6), blob = [];
            for (j = 0; j < n; j++) blob.push([Math.cos(a) * rd + (srnd() - 0.5) * 0.4, Math.sin(a) * rd + (srnd() - 0.5) * 0.4, 0.07 + srnd() * 0.15]);
            CONT.push(blob);
            for (j = 0; j < n * 3; j++) {
                var c = blob[Math.floor(srnd() * n)], la = srnd() * TAU, lr = srnd() * c[2];
                var lx = c[0] + Math.cos(la) * lr, ly = c[1] + Math.sin(la) * lr, ll = Math.hypot(lx, ly);
                if (ll > 0.27 && ll < 0.96) LIGHTS.push([lx, ly, 0.5 + srnd()]);
            }
        }
        for (i = 0; i < 16; i++) CLOUDS.push([0.3 + srnd() * 0.66, srnd() * TAU, 0.25 + srnd() * 0.8, 0.03 + srnd() * 0.06, 0.18 + srnd() * 0.28]);
        for (i = 0; i < 80; i++) STARS.push([srnd(), srnd(), 0.3 + srnd() * 0.7, srnd() * TAU, srnd() < 0.15]);
    })();
    function buildStatic() {
        bgc.width = cv.width; bgc.height = cv.height;
        var g = bgc.getContext('2d'), i, R = S;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var bg = g.createLinearGradient(0, 0, W * 0.3, H);
        bg.addColorStop(0, '#0b1030'); bg.addColorStop(0.6, '#070b22'); bg.addColorStop(1, '#0a0820');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        seed = 777;
        var neb = [['rgba(120,70,200,', 0.13], ['rgba(40,140,190,', 0.1], ['rgba(200,80,150,', 0.07]];
        for (i = 0; i < 3; i++) {
            var nx = srnd() * W, ny = srnd() * H, nr = (0.35 + srnd() * 0.4) * Math.max(W, H), ng = g.createRadialGradient(nx, ny, 0, nx, ny, nr);
            ng.addColorStop(0, neb[i][0] + neb[i][1] + ')'); ng.addColorStop(1, neb[i][0] + '0)');
            g.fillStyle = ng; g.fillRect(0, 0, W, H);
        }
        var nst = Math.round(W * H / 2600);
        for (i = 0; i < nst; i++) {
            g.fillStyle = 'rgba(220,228,255,' + (0.15 + srnd() * 0.45).toFixed(2) + ')';
            var ss = srnd() < 0.9 ? 1 : 1.6;
            g.fillRect(srnd() * W, srnd() * H, ss, ss);
        }
        var sun = g.createRadialGradient(0, cy, 0, 0, cy, Math.max(W, H) * 0.55);   /* the sun is off to the left */
        sun.addColorStop(0, 'rgba(255,236,190,.22)'); sun.addColorStop(1, 'rgba(255,236,190,0)');
        g.fillStyle = sun; g.fillRect(0, 0, W, H);
        var shc = document.createElement('canvas'), sg = shc.getContext('2d');   /* the planet's shadow (eclipse zone), soft edged */
        shc.width = Math.max(1, Math.ceil((W - cx) * dpr)); shc.height = Math.ceil(2.4 * R * dpr);
        sg.scale(dpr, dpr);
        var sh = sg.createLinearGradient(0, 0, W - cx, 0);
        sh.addColorStop(0, 'rgba(0,0,12,.34)'); sh.addColorStop(1, 'rgba(0,0,12,0)');
        sg.fillStyle = sh; sg.fillRect(0, 0, W - cx, 2.4 * R);
        sg.globalCompositeOperation = 'destination-in';
        var sv = sg.createLinearGradient(0, 0, 0, 2.4 * R);
        sv.addColorStop(0, 'rgba(0,0,0,0)'); sv.addColorStop(0.2, 'rgba(0,0,0,1)'); sv.addColorStop(0.8, 'rgba(0,0,0,1)'); sv.addColorStop(1, 'rgba(0,0,0,0)');
        sg.fillStyle = sv; sg.fillRect(0, 0, W - cx, 2.4 * R);
        g.drawImage(shc, cx, cy - 1.2 * R, W - cx, 2.4 * R);
        var at = g.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.3);
        at.addColorStop(0, 'rgba(110,180,255,.55)'); at.addColorStop(0.35, 'rgba(90,150,255,.18)'); at.addColorStop(1, 'rgba(90,150,255,0)');
        g.fillStyle = at; g.beginPath(); g.arc(cx, cy, R * 1.3, 0, TAU); g.fill();
        g.lineWidth = 1.2;
        for (i = 0; i < LANES.length; i++) {
            g.strokeStyle = 'rgba(170,190,255,.13)';
            g.beginPath(); g.arc(cx, cy, LANES[i] * S, 0, TAU); g.stroke();
            g.fillStyle = 'rgba(170,190,255,.35)'; g.font = '700 9px system-ui, sans-serif'; g.textAlign = 'center';
            g.fillText('L' + (i + 1), cx, cy - LANES[i] * S - 3);
        }
        /* the planet textures, in device pixels */
        PD = Math.ceil(2 * S * dpr) + 2;
        [surf, lightsC, cloudC, nightC, maskC, pc, lc].forEach(function (c) { c.width = PD; c.height = PD; });
        var pr = PD / 2 - 1, h = PD / 2;
        g = surf.getContext('2d');
        var oc = g.createRadialGradient(h - pr * 0.3, h - pr * 0.3, 0, h, h, pr);
        oc.addColorStop(0, '#4aa3e8'); oc.addColorStop(1, '#1d4a96');
        g.fillStyle = oc; g.beginPath(); g.arc(h, h, pr, 0, TAU); g.fill();
        CONT.forEach(function (blob, bi) {
            g.fillStyle = '#4f9a58';
            blob.forEach(function (c) { g.beginPath(); g.arc(h + c[0] * pr, h + c[1] * pr, c[2] * pr, 0, TAU); g.fill(); });
            g.fillStyle = bi % 3 === 0 ? '#d4bf7f' : '#72b866';
            blob.forEach(function (c) { g.beginPath(); g.arc(h + c[0] * pr + c[2] * pr * 0.2, h + c[1] * pr, c[2] * pr * 0.55, 0, TAU); g.fill(); });
        });
        g.fillStyle = '#eef6ff';   /* we look down on the north pole: the ice cap is in the middle */
        g.beginPath(); g.arc(h, h, pr * 0.2, 0, TAU); g.fill();
        for (i = 0; i < 7; i++) { var ia = i / 7 * TAU; g.beginPath(); g.arc(h + Math.cos(ia) * pr * 0.19, h + Math.sin(ia) * pr * 0.19, pr * 0.07, 0, TAU); g.fill(); }
        g = lightsC.getContext('2d');
        LIGHTS.forEach(function (l) {
            g.fillStyle = 'rgba(255,214,130,.35)'; g.beginPath(); g.arc(h + l[0] * pr, h + l[1] * pr, 2.6 * l[2] * dpr, 0, TAU); g.fill();
            g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(h + l[0] * pr, h + l[1] * pr, 0.9 * l[2] * dpr, 0, TAU); g.fill();
        });
        g = cloudC.getContext('2d');
        g.lineCap = 'round';
        CLOUDS.forEach(function (c) {
            g.strokeStyle = 'rgba(255,255,255,' + c[4].toFixed(2) + ')'; g.lineWidth = c[3] * pr;
            g.beginPath(); g.arc(h, h, c[0] * pr, c[1], c[1] + c[2]); g.stroke();
        });
        g = nightC.getContext('2d');
        g.save(); g.beginPath(); g.arc(h, h, pr + 0.5, 0, TAU); g.clip();
        var ngr = g.createLinearGradient(h - pr * 0.2, 0, h + pr * 0.45, 0);
        ngr.addColorStop(0, 'rgba(3,6,26,0)'); ngr.addColorStop(1, 'rgba(3,6,26,.86)');
        g.fillStyle = ngr; g.fillRect(0, 0, PD, PD);
        var hl = g.createRadialGradient(h - pr * 0.55, h - pr * 0.25, 0, h - pr * 0.55, h - pr * 0.25, pr * 0.9);
        hl.addColorStop(0, 'rgba(255,255,255,.22)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = hl; g.fillRect(0, 0, PD, PD);
        var limb = g.createRadialGradient(h, h, pr * 0.7, h, h, pr);
        limb.addColorStop(0, 'rgba(10,20,60,0)'); limb.addColorStop(1, 'rgba(10,20,60,.35)');
        g.fillStyle = limb; g.fillRect(0, 0, PD, PD);
        g.restore();
        g = maskC.getContext('2d');
        var mk = g.createLinearGradient(h - pr * 0.02, 0, h + pr * 0.4, 0);
        mk.addColorStop(0, 'rgba(0,0,0,0)'); mk.addColorStop(1, 'rgba(0,0,0,1)');
        g.fillStyle = mk; g.fillRect(0, 0, PD, PD);
        lastRot = -9;
    }
    function composePlanet() {
        lastRot = planetRot;
        var g = pc.getContext('2d'), h = PD / 2, pr = PD / 2 - 1;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, PD, PD);
        g.save(); g.beginPath(); g.arc(h, h, pr, 0, TAU); g.clip();
        g.translate(h, h); g.rotate(-planetRot); g.drawImage(surf, -h, -h);
        g.rotate(-planetRot * 0.4); g.drawImage(cloudC, -h, -h);
        g.restore();
        g.drawImage(nightC, 0, 0);
        var l = lc.getContext('2d');
        l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, PD, PD);
        l.translate(h, h); l.rotate(-planetRot); l.drawImage(lightsC, -h, -h); l.setTransform(1, 0, 0, 1, 0, 0);
        l.globalCompositeOperation = 'destination-in'; l.drawImage(maskC, 0, 0); l.globalCompositeOperation = 'source-over';
        g.globalCompositeOperation = 'lighter'; g.drawImage(lc, 0, 0); g.globalCompositeOperation = 'source-over';
    }

    /* drawing */
    function rrect(x0, y0, x1, y1, r) {
        ctx.beginPath(); ctx.moveTo(x0 + r, y0);
        ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r); ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r);
        ctx.closePath();
    }
    function polyline(A, k0, k1) {
        ctx.beginPath(); ctx.moveTo(X(A[2 * k0]), Y(A[2 * k0 + 1]));
        for (var k = k0 + 1; k <= k1; k++) ctx.lineTo(X(A[2 * k]), Y(A[2 * k + 1]));
        ctx.stroke();
    }
    function drawStars() {
        var t = api.reducedMotion ? 0 : clock;
        for (var i = 0; i < STARS.length; i++) {
            var s = STARS[i], d = s[2];
            var x = ((s[0] * W - t * 2.2 * d + Math.sin(t * 0.05) * 8 * d) % W + W) % W, y = s[1] * H + Math.cos(t * 0.04) * 5 * d;
            var a = 0.35 + 0.45 * d * (api.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(t * 2 + s[3]));
            ctx.fillStyle = s[4] ? 'rgba(255,220,190,' + a.toFixed(2) + ')' : 'rgba(225,232,255,' + a.toFixed(2) + ')';
            var sz = d > 0.8 ? 2 : 1.3;
            ctx.fillRect(x, y, sz, sz);
            if (s[4] && d > 0.6) { ctx.fillRect(x - 2, y + 0.5, 5.5, 0.6); ctx.fillRect(x + 0.6, y - 2, 0.6, 5.5); }
        }
    }
    function drawWind() {
        var a = storm > 0 ? 1 : 0.4, t = api.reducedMotion ? 0 : clock, n = api.reducedMotion ? 10 : 28;
        ctx.strokeStyle = 'rgba(255,214,140,' + (0.22 * a).toFixed(2) + ')'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (var i = 0; i < n; i++) {
            var y = ((i * 97.3) % H), x = ((i * 53.1 + t * (220 + (i % 5) * 40)) % (W + 80)) - 40;
            ctx.moveTo(x, y); ctx.lineTo(x + 26 + (i % 3) * 10, y);
        }
        ctx.stroke();
        var gl = ctx.createLinearGradient(0, 0, W * 0.4, 0);
        gl.addColorStop(0, 'rgba(255,170,90,' + (0.16 * a + (api.reducedMotion ? 0 : 0.05 * Math.sin(t * 3))).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,170,90,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, W * 0.4, H);
    }
    function drawPlanet() {
        if (Math.abs(planetRot - lastRot) > 0.004) composePlanet();
        var d = PD / dpr;
        ctx.drawImage(pc, cx - d / 2, cy - d / 2, d, d);
        var ga = planetRot + 2.2, gx = X(Math.cos(ga) * 0.96), gy = Y(Math.sin(ga) * 0.96);   /* the ground station: a cat with a dish */
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(-ga + Math.PI / 2);
        var u = Math.max(3, S * 0.035);
        ctx.fillStyle = '#e9edf7'; ctx.beginPath(); ctx.arc(0, 0, u * 1.3, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-u * 1.2, -u * 0.6); ctx.lineTo(-u * 0.9, -u * 1.7); ctx.lineTo(-u * 0.3, -u * 1.1); ctx.fill();
        ctx.beginPath(); ctx.moveTo(u * 1.2, -u * 0.6); ctx.lineTo(u * 0.9, -u * 1.7); ctx.lineTo(u * 0.3, -u * 1.1); ctx.fill();
        ctx.strokeStyle = '#e9edf7'; ctx.lineWidth = Math.max(1, u * 0.35);
        ctx.beginPath(); ctx.moveTo(0, -u * 1.2); ctx.lineTo(0, -u * 2.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -u * 2.9, u * 1.1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.fillStyle = (clock % 1.2) < 0.6 || api.reducedMotion ? '#5af2d6' : '#1e6b5f';
        ctx.beginPath(); ctx.arc(0, -u * 2.4, u * 0.35, 0, TAU); ctx.fill();
        ctx.restore();
        drawPlanet.gx = gx; drawPlanet.gy = gy;
    }
    function drawAurora() {
        var t = api.reducedMotion ? 0 : clock, a = Math.min(1, storm / 2);
        ctx.lineCap = 'round';
        for (var i = 0; i < 3; i++) {
            ctx.strokeStyle = i === 1 ? 'rgba(180,120,255,' + (0.3 * a).toFixed(2) + ')' : 'rgba(110,255,170,' + (0.35 * a).toFixed(2) + ')';
            ctx.lineWidth = S * (0.05 + i * 0.02);
            ctx.beginPath(); ctx.arc(cx, cy, S * (1.07 + i * 0.05 + 0.015 * Math.sin(t * 2 + i)), t * 0.3 + i * 2, t * 0.3 + i * 2 + 2.4 + Math.sin(t + i)); ctx.stroke();
        }
        ctx.lineCap = 'butt';
    }
    function drawZone(h) {
        var x = X(h.zx), y = Y(h.zy), r = ZR * S, t = api.reducedMotion ? 0 : clock;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.15);
        g.addColorStop(0, 'rgba(190,150,255,.42)'); g.addColorStop(0.7, 'rgba(160,120,255,.2)'); g.addColorStop(1, 'rgba(160,120,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(205,175,255,.75)'; ctx.lineWidth = 1.3; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 10;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        for (var i = 0; i < 5; i++) {   /* shimmering blur: we see where it might be, never where it is */
            var a = t * 0.9 + i * 1.7 + h.id, d = r * (0.25 + 0.5 * ((i * 0.37 + t * 0.13) % 1));
            ctx.fillStyle = 'rgba(230,215,255,.35)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(1.5, S * 0.025), 0, TAU); ctx.fill();
        }
        var u = Math.max(3.5, S * 0.05);
        ctx.fillStyle = '#efe6ff'; rrect(x - u, y - u * 0.2, x + u, y + u * 1.3, u * 0.3); ctx.fill();
        ctx.strokeStyle = '#efe6ff'; ctx.lineWidth = Math.max(1.2, u * 0.32);
        ctx.beginPath(); ctx.arc(x, y - u * 0.25, u * 0.62, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#6b45c2'; ctx.beginPath(); ctx.arc(x, y + u * 0.5, u * 0.25, 0, TAU); ctx.fill();
        if (test && test.dbg.reveal) { ctx.fillStyle = '#f0f'; ctx.beginPath(); ctx.arc(X(h.x), Y(h.y), 3, 0, TAU); ctx.fill(); }
    }
    function drawPaths() {
        var i, h, s, a;
        ctx.lineWidth = 1.2;
        for (i = 0; i < hazards.length; i++) {
            h = hazards[i];
            if (h.dead || h.kind === 'fuzzy') continue;
            ctx.strokeStyle = PATHCOL[h.kind];
            ctx.globalAlpha = h.kind === 'meteor' ? 0.22 : 0.2;
            polyline(h.P, 0, h.kind === 'meteor' ? KS : 20);
            if (h.err && Math.abs(h.err) > 0.008) {   /* a fresh track: the position is still uncertain */
                ctx.globalAlpha = Math.min(0.6, Math.abs(h.err) * 12);
                ctx.setLineDash([2, 3]);
                ctx.beginPath(); ctx.arc(X(h.P[0]), Y(h.P[1]), Math.abs(h.err) * h.orb.a * S + h.r * S + 3, 0, TAU); ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        ctx.globalAlpha = 1;
        var sel = selSat();
        for (i = 0; i < sats.length; i++) {
            s = sats[i];
            if (!s.alive) continue;
            ctx.strokeStyle = s.look.body;
            if (s === sel) { ctx.globalAlpha = 0.75; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6; polyline(s.P, 0, KS); ctx.setLineDash([]); }
            else { ctx.globalAlpha = 0.3; ctx.lineWidth = 1.2; polyline(s.P, 0, 24); }
        }
        ctx.globalAlpha = 1;
        if (ghost && sel) {   /* where a raise or a lower would take the selected cat: green if it is clear */
            [[GU, ghost.up], [GD, ghost.down]].forEach(function (gp) {
                if (gp[1] === null) return;
                ctx.fillStyle = gp[1] < 0.3 ? 'rgba(125,255,181,.6)' : 'rgba(255,120,140,.55)';
                for (var k = 4; k <= KS; k += 4) { ctx.beginPath(); ctx.arc(X(gp[0][2 * k]), Y(gp[0][2 * k + 1]), 1.6, 0, TAU); ctx.fill(); }
            });
        }
        var vis = alerts.filter(function (q) { return q.pair || (q.zone ? !(q.res && !q.res.close) : q.risk >= 0.3); });
        vis.sort(function (p, q) { return (q.risk >= 0.5) - (p.risk >= 0.5) || p.tca - q.tca; });
        var perCat = {}, drawn = 0, pairs = 0;   /* only the most urgent ones, so a busy sky stays readable */
        for (i = 0; i < vis.length && drawn < 6; i++) {
            a = vis[i];
            if (a.pair) { if (pairs >= 2) continue; pairs++; }
            else { perCat[a.s.id] = (perCat[a.s.id] || 0) + 1; if (perCat[a.s.id] > 2) continue; }
            drawn++;
            var kt = Math.min(KS, Math.ceil((a.tca + 0.6) / DTP));
            if (a.pair) {
                ctx.strokeStyle = '#ff8a3d'; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.8; ctx.setLineDash([6, 4]);
                polyline(a.h.P, 0, kt); polyline(a.h2.P, 0, kt); ctx.setLineDash([]);
                atT(a.h.P, a.tca, tmp); cross(X(tmp[0]), Y(tmp[1]), '#ff8a3d', 'crash ' + a.tca.toFixed(1) + 's');
                continue;
            }
            var col = a.zone && !a.res ? '#c39bff' : a.risk >= 0.5 ? '#ff4d6d' : '#ffb347';
            ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.8; ctx.setLineDash([6, 4]);
            polyline(a.zone ? a.h.Z : a.h.P, 0, kt);
            ctx.setLineDash([]);
            ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
            polyline(a.s.P, 0, Math.min(KS, Math.ceil(a.tca / DTP)));
            atT(a.s.P, a.tca, tmp); atT(a.zone ? a.h.Z : a.h.P, a.tca, tmp2);
            ctx.globalAlpha = 0.8; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(X(tmp[0]), Y(tmp[1])); ctx.lineTo(X(tmp2[0]), Y(tmp2[1])); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(tmp[0]), Y(tmp[1]), 3, 0, TAU); ctx.fill();
            cross(X(tmp2[0]), Y(tmp2[1]), col, null);
        }
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    function cross(x, y, col, label) {
        var c = 5;
        ctx.strokeStyle = col; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x - c, y - c); ctx.lineTo(x + c, y + c); ctx.moveTo(x + c, y - c); ctx.lineTo(x - c, y + c); ctx.stroke();
        if (label) {
            ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(6,10,30,.85)'; ctx.strokeText(label, x, y - 8);
            ctx.fillStyle = col; ctx.fillText(label, x, y - 8);
        }
    }
    function drawHaz(h) {
        var x = X(h.x), y = Y(h.y), r = Math.max(3, h.r * S * 1.45), i, pts;
        ctx.globalAlpha = Math.min(1, h.age / 0.4 + 0.15);
        if (h.kind === 'debris' || h.kind === 'frag') {
            pts = SHAPES[h.shape];
            ctx.save(); ctx.translate(x, y); ctx.rotate(h.rot);
            var hot = h.hot || 0;
            ctx.fillStyle = hot > 0.4 ? '#ffb067' : h.kind === 'frag' ? '#b9a593' : '#8f99ae';
            ctx.strokeStyle = hot > 0.4 ? '#fff0c9' : '#d5dcec'; ctx.lineWidth = 1;
            ctx.beginPath();
            for (i = 0; i < pts.length; i++) ctx[i ? 'lineTo' : 'moveTo'](pts[i][0] * r, pts[i][1] * r);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(30,30,50,.35)'; ctx.fillRect(-r * 0.3, -r * 0.1, r * 0.4, r * 0.25);
            ctx.restore();
        } else if (h.kind === 'big') {
            ctx.save(); ctx.translate(x, y); ctx.rotate(h.rot * 0.4);
            var L = r * 1.7, Wd = r * 0.62;
            ctx.fillStyle = '#6b7286'; ctx.beginPath(); ctx.moveTo(L * 0.85, -Wd * 0.6); ctx.lineTo(L * 1.25, -Wd); ctx.lineTo(L * 1.25, Wd); ctx.lineTo(L * 0.85, Wd * 0.6); ctx.fill();
            ctx.fillStyle = '#e3e7f1'; rrect(-L, -Wd, L * 0.9, Wd, Wd * 0.7); ctx.fill();
            ctx.strokeStyle = '#8c93a8'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#e8577e'; ctx.fillRect(-L * 0.25, -Wd, L * 0.22, Wd * 2);
            ctx.fillStyle = '#9aa3b8'; ctx.fillRect(L * 0.4, -Wd, L * 0.1, Wd * 2);
            ctx.restore();
        } else if (h.kind === 'rogue') {
            ctx.save(); ctx.translate(x, y); ctx.rotate(h.rot * 0.5);
            var u = r * 0.75;
            ctx.strokeStyle = '#8d93a6'; ctx.lineWidth = Math.max(1, u * 0.2);
            ctx.beginPath(); ctx.moveTo(u, 0); ctx.lineTo(u * 1.5, u * 0.4); ctx.stroke();
            ctx.fillStyle = '#3c4568'; ctx.save(); ctx.translate(u * 1.5, u * 0.4); ctx.rotate(0.7); ctx.fillRect(0, -u * 0.45, u * 1.6, u * 0.9); ctx.restore();
            ctx.fillStyle = '#7a8095';
            ctx.beginPath(); ctx.moveTo(-u * 0.9, -u * 0.6); ctx.lineTo(-u * 0.7, -u * 1.45); ctx.lineTo(-u * 0.15, -u * 0.8); ctx.fill();
            rrect(-u, -u * 0.85, u, u * 0.85, u * 0.35); ctx.fill();
            ctx.strokeStyle = '#2b2f40'; ctx.lineWidth = Math.max(1, u * 0.16);
            for (i = -1; i <= 1; i += 2) {
                ctx.beginPath(); ctx.moveTo(i * u * 0.4 - u * 0.15, -u * 0.25); ctx.lineTo(i * u * 0.4 + u * 0.15, u * 0.05);
                ctx.moveTo(i * u * 0.4 + u * 0.15, -u * 0.25); ctx.lineTo(i * u * 0.4 - u * 0.15, u * 0.05); ctx.stroke();
            }
            if (!api.reducedMotion && ((clock + h.blink) % 1.1) < 0.12) { ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.arc(u * 1.5, u * 0.4, u * 0.35, 0, TAU); ctx.fill(); }
            ctx.restore();
        } else if (h.kind === 'dog') {
            var ang = Math.atan2(-h.y, h.x);
            ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
            var d = r * 0.72;
            ctx.fillStyle = '#9db4d8';
            ctx.fillRect(-d * 3, -d * 0.5, d * 1.8, d); ctx.fillRect(d * 1.2, -d * 0.5, d * 1.8, d);
            ctx.fillStyle = '#7fb3ff'; rrect(-d, -d, d, d, d * 0.4); ctx.fill();
            ctx.fillStyle = '#8a5a3c';
            ctx.beginPath(); ctx.ellipse(-d * 1.05, -d * 0.1, d * 0.35, d * 0.75, 0.25, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.ellipse(d * 1.05, -d * 0.1, d * 0.35, d * 0.75, -0.25, 0, TAU); ctx.fill();
            ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.ellipse(0, d * 0.35, d * 0.5, d * 0.36, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(0, d * 0.2, d * 0.17, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(-d * 0.38, -d * 0.3, d * 0.12, 0, TAU); ctx.arc(d * 0.38, -d * 0.3, d * 0.12, 0, TAU); ctx.fill();
            ctx.restore();
        } else if (h.kind === 'meteor') {
            var vl = Math.hypot(h.lin.vx, h.lin.vy), tx = -h.lin.vx / vl, ty = h.lin.vy / vl, tl = S * 0.4;
            var tg = ctx.createLinearGradient(x, y, x + tx * tl, y + ty * tl);
            tg.addColorStop(0, 'rgba(255,190,110,.85)'); tg.addColorStop(1, 'rgba(255,120,60,0)');
            ctx.strokeStyle = tg; ctx.lineWidth = r * 1.4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tx * tl, y + ty * tl); ctx.stroke(); ctx.lineCap = 'butt';
            ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, TAU); ctx.fill();
            ctx.fillStyle = '#a0603a'; ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.15, r * 0.35, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    function drawCat(s) {
        var x = X(s.x), y = Y(s.y), u = US, ang = Math.atan2(-s.y, s.x), night = s.x > 0 && Math.abs(s.y) < 1, L = s.look, i, sd;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
        if (s.launch > 0 && !api.reducedMotion) ctx.globalAlpha = 0.65 + 0.35 * Math.sin(clock * 14);
        if (s.hurt > 0 && !api.reducedMotion) ctx.translate(Math.sin(clock * 60) * u * 0.15, 0);
        if (s.tr || s.ph) {   /* thruster puff opposite to the burn */
            var fx = 0, fy = 0;
            if (s.tr) fy = s.tr.r1 > s.tr.r0 ? 1 : -1; else fx = s.ph.mul > 1 ? 1 : -1;
            var fl = u * (1.3 + (api.reducedMotion ? 0 : 0.4 * Math.sin(clock * 40)));
            ctx.fillStyle = 'rgba(255,200,120,.85)';
            ctx.beginPath(); ctx.moveTo(fx * u * 0.9 - fy * u * 0.4, fy * u * 0.9 - fx * u * 0.4); ctx.lineTo(fx * (u + fl) * 1.2, fy * (u + fl) * 1.2);
            ctx.lineTo(fx * u * 0.9 + fy * u * 0.4, fy * u * 0.9 + fx * u * 0.4); ctx.fill();
        }
        ctx.strokeStyle = L.dark; ctx.lineWidth = Math.max(1.2, u * 0.2); ctx.lineCap = 'round';   /* tail antenna */
        ctx.beginPath(); ctx.moveTo(0, u * 0.8); ctx.quadraticCurveTo(-u * 0.1, u * 2.0, u * 0.9, u * 1.9); ctx.quadraticCurveTo(u * 1.6, u * 1.8, u * 1.45, u * 1.15); ctx.stroke();
        var on = api.reducedMotion || ((clock + s.blink) % 1.4) < 0.7;
        ctx.fillStyle = on ? '#ff5d7a' : '#6b2a3a'; ctx.beginPath(); ctx.arc(u * 1.45, u * 1.15, u * 0.27, 0, TAU); ctx.fill();
        var pcol = night ? '#24356b' : '#3d6fd6', pl = night ? '#3a4c8a' : '#9cc0ff';
        for (sd = -1; sd <= 1; sd += 2) {   /* solar panel paws */
            ctx.strokeStyle = '#c9d2e8'; ctx.lineWidth = Math.max(1, u * 0.18);
            ctx.beginPath(); ctx.moveTo(sd * u * 0.9, 0); ctx.lineTo(sd * u * 1.45, 0); ctx.stroke();
            var x0 = sd > 0 ? u * 1.4 : -u * 2.85, x1 = sd > 0 ? u * 2.85 : -u * 1.4;
            ctx.fillStyle = pcol; rrect(x0, -u * 0.62, x1, u * 0.62, u * 0.32); ctx.fill();
            for (i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(sd * u * 3.02, i * u * 0.42, u * 0.21, 0, TAU); ctx.fill(); }
            ctx.strokeStyle = pl; ctx.lineWidth = Math.max(0.6, u * 0.08);
            ctx.beginPath();
            ctx.moveTo(x0 + (x1 - x0) / 3, -u * 0.5); ctx.lineTo(x0 + (x1 - x0) / 3, u * 0.5);
            ctx.moveTo(x0 + (x1 - x0) * 2 / 3, -u * 0.5); ctx.lineTo(x0 + (x1 - x0) * 2 / 3, u * 0.5);
            ctx.moveTo(x0 + u * 0.15, 0); ctx.lineTo(x1 - u * 0.15, 0); ctx.stroke();
        }
        ctx.fillStyle = L.body; ctx.strokeStyle = L.dark; ctx.lineWidth = Math.max(1, u * 0.14); ctx.lineJoin = 'round';
        for (sd = -1; sd <= 1; sd += 2) {   /* ears */
            ctx.fillStyle = L.body;
            ctx.beginPath(); ctx.moveTo(sd * u * 0.95, -u * 0.45); ctx.lineTo(sd * u * 0.8, -u * 1.6); ctx.lineTo(sd * u * 0.1, -u * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = L.ear;
            ctx.beginPath(); ctx.moveTo(sd * u * 0.78, -u * 0.7); ctx.lineTo(sd * u * 0.72, -u * 1.3); ctx.lineTo(sd * u * 0.35, -u * 0.88); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = L.body; rrect(-u, -u * 0.95, u, u * 0.9, u * 0.5); ctx.fill(); ctx.stroke();
        var blink = !api.reducedMotion && ((clock + s.blink * 1.7) % 3.6) < 0.13;
        ctx.fillStyle = '#1b1530'; ctx.strokeStyle = '#1b1530'; ctx.lineWidth = Math.max(1, u * 0.12);
        for (sd = -1; sd <= 1; sd += 2) {
            if (blink || s.hurt > 0) { ctx.beginPath(); ctx.moveTo(sd * u * 0.4 - u * 0.17, -u * 0.12); ctx.lineTo(sd * u * 0.4 + u * 0.17, -u * 0.12); ctx.stroke(); }
            else {
                ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.ellipse(sd * u * 0.4, -u * 0.12, u * 0.15, u * 0.21, 0, 0, TAU); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sd * u * 0.4 + u * 0.05, -u * 0.2, u * 0.055, 0, TAU); ctx.fill();
            }
        }
        ctx.fillStyle = '#ff8fab';
        ctx.beginPath(); ctx.moveTo(-u * 0.12, u * 0.17); ctx.lineTo(u * 0.12, u * 0.17); ctx.lineTo(0, u * 0.32); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = L.dark; ctx.lineWidth = Math.max(0.6, u * 0.07); ctx.globalAlpha *= 0.8;
        ctx.beginPath();
        for (sd = -1; sd <= 1; sd += 2) { ctx.moveTo(sd * u * 0.32, u * 0.3); ctx.lineTo(sd * u * 1.25, u * 0.18); ctx.moveTo(sd * u * 0.32, u * 0.38); ctx.lineTo(sd * u * 1.2, u * 0.52); }
        ctx.stroke();
        if (s.hp < s.maxHp) {   /* a bandage */
            ctx.globalAlpha = 1; ctx.fillStyle = '#fff3d6'; ctx.save(); ctx.rotate(-0.5);
            ctx.fillRect(-u * 0.95, -u * 0.95, u * 0.8, u * 0.28); ctx.restore();
        }
        if (night) { ctx.globalAlpha = 0.32; ctx.fillStyle = '#060a28'; rrect(-u, -u * 0.95, u, u * 0.9, u * 0.5); ctx.fill(); }
        ctx.restore();
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    }
    function drawStation(s) {
        var x = X(s.x), y = Y(s.y), su = S * 0.105, ang = Math.atan2(-s.y, s.x), sp = api.reducedMotion ? 0 : clock * 0.4, i;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
        if (s.hurt > 0 && !api.reducedMotion) ctx.translate(Math.sin(clock * 50) * su * 0.1, 0);
        ctx.fillStyle = '#3d6fd6';
        for (i = -1; i <= 1; i += 2) {
            ctx.fillRect(i > 0 ? su * 2.3 : -su * 4.4, -su * 0.7, su * 2.1, su * 1.4);
            for (var t = -1; t <= 1; t++) { ctx.beginPath(); ctx.arc(i * su * 4.5, t * su * 0.48, su * 0.25, 0, TAU); ctx.fill(); }
        }
        ctx.strokeStyle = '#cfd8ee'; ctx.lineWidth = su * 0.5;
        ctx.beginPath(); ctx.arc(0, 0, su * 2, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#8f9bbb'; ctx.lineWidth = Math.max(1, su * 0.16);
        ctx.beginPath(); ctx.arc(0, 0, su * 2.25, 0, TAU); ctx.stroke();
        ctx.lineWidth = Math.max(1, su * 0.22); ctx.strokeStyle = '#b9c3dc';
        ctx.beginPath();
        for (i = 0; i < 4; i++) { var a = sp + i * Math.PI / 2; ctx.moveTo(Math.cos(a) * su, Math.sin(a) * su); ctx.lineTo(Math.cos(a) * su * 1.8, Math.sin(a) * su * 1.8); }
        ctx.stroke();
        for (i = 0; i < 6; i++) { var b = sp + i * TAU / 6; ctx.fillStyle = i % 2 ? '#ffd66b' : '#7dffb5'; ctx.globalAlpha = api.reducedMotion || ((clock * 2 + i) % 2) < 1 ? 1 : 0.35; ctx.beginPath(); ctx.arc(Math.cos(b) * su * 2, Math.sin(b) * su * 2, su * 0.14, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f5f2ea'; ctx.strokeStyle = '#7d786b'; ctx.lineWidth = Math.max(1, su * 0.12);
        for (i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(i * su * 0.95, -su * 0.45); ctx.lineTo(i * su * 0.85, -su * 1.5); ctx.lineTo(i * su * 0.15, -su * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, su * 1.05, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1b1530';
        for (i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.ellipse(i * su * 0.4, -su * 0.1, su * 0.14, su * 0.2, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.moveTo(-su * 0.12, su * 0.2); ctx.lineTo(su * 0.12, su * 0.2); ctx.lineTo(0, su * 0.34); ctx.fill();
        if (s.x > 0 && Math.abs(s.y) < 1) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#060a28'; ctx.beginPath(); ctx.arc(0, 0, su * 2.4, 0, TAU); ctx.fill(); }
        ctx.restore();
    }
    function drawSats() {
        var sel = selSat(), st = station(), i, s;
        if (st && st.alive) {   /* the docking ring */
            ctx.strokeStyle = 'rgba(125,255,181,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]);
            ctx.beginPath(); ctx.arc(X(st.x), Y(st.y), DOCK_D * S, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        }
        for (i = 0; i < sats.length; i++) {
            s = sats[i];
            if (!s.alive) continue;
            var x = X(s.x), y = Y(s.y);
            if (s === sel) {
                ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
                var rr = s.kind === 'station' ? S * 0.32 : US * 3.4;
                ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
                ctx.setLineDash([4, 4]); ctx.lineDashOffset = api.reducedMotion ? 0 : -clock * 8; ctx.stroke(); ctx.setLineDash([]);
                ctx.strokeStyle = 'rgba(255,92,143,.22)'; ctx.lineWidth = 1;   /* laser range */
                ctx.beginPath(); ctx.arc(x, y, (s.kind === 'station' ? RANGE_ST : RANGE) * S, 0, TAU); ctx.stroke();
            }
            if (s.kind === 'station') drawStation(s); else drawCat(s);
            if (s.dock > 0) {
                ctx.strokeStyle = '#7dffb5'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(x, y, US * 2.8, -Math.PI / 2, -Math.PI / 2 + s.dock * TAU); ctx.stroke();
            }
            if (s === sel || s.hurt > 0) label(x, y + (s.kind === 'station' ? S * 0.34 : US * 3.4) + 10, s.name, '#fff');
        }
        /* warning rings: the most urgent conjunction of each cat */
        var worst = {};
        alerts.forEach(function (a) {
            if (a.pair || (a.res && !a.res.close) || a.risk < 0.35) return;
            var w = worst[a.s.id];
            if (!w || a.tca < w.tca) worst[a.s.id] = a;
        });
        for (i = 0; i < sats.length; i++) {
            s = sats[i];
            var a = worst[s.id];
            if (!a || !s.alive) continue;
            var col = a.zone && !a.res ? '#c39bff' : a.risk >= 0.5 ? '#ff4d6d' : '#ffb347';
            var base = s.kind === 'station' ? S * 0.3 : US * 2.6, pr = base + US * 3.2 * Math.min(1, a.tca / 6);
            var pulse = api.reducedMotion ? 0 : 0.25 * Math.sin(clock * (6 + 8 * (1 - Math.min(1, a.tca / 6))));
            ctx.strokeStyle = col; ctx.globalAlpha = 0.75 + pulse; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.arc(X(s.x), Y(s.y), pr, 0, TAU); ctx.stroke();
            ctx.globalAlpha = 1;
            var txt = a.tca.toFixed(1) + 's' + (a.zone ? (a.res ? ' TOO CLOSE' : ' ?') : ' ' + Math.min(99, Math.round(a.risk * 100)) + '%');
            label(X(s.x), Y(s.y) - pr - 8, txt, col);
        }
    }
    function label(x, y, text, col) {
        ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var hw = ctx.measureText(text).width / 2 + 4;
        x = clamp(x, hw, Math.max(hw, W - hw));
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(6,10,30,.88)'; ctx.strokeText(text, x, y);
        ctx.fillStyle = col; ctx.fillText(text, x, y);
    }
    function drawFx(dt) {
        var i, p;
        for (i = 0; i < beams.length; i++) {
            var b = beams[i], a = 1 - b.t / 0.32;
            var x0 = X(b.x0), y0 = Y(b.y0), x1 = X(b.x1), y1 = Y(b.y1);
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(255,60,130,' + (0.28 * a).toFixed(3) + ')'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,90,150,' + (0.8 * a).toFixed(3) + ')'; ctx.lineWidth = 3.4; ctx.stroke();
            ctx.strokeStyle = 'rgba(255,240,248,' + a.toFixed(3) + ')'; ctx.lineWidth = 1.3; ctx.stroke();
            ctx.lineCap = 'butt';
            var g = ctx.createRadialGradient(x1, y1, 0, x1, y1, 12);   /* the red dot */
            g.addColorStop(0, 'rgba(255,40,90,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,40,90,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x1, y1, 12, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x1, y1, 2.5, 0, TAU); ctx.fill();
            if (b.nudge) { ctx.strokeStyle = 'rgba(255,214,107,' + a.toFixed(3) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x1, y1, 6 + b.t * 60, 0, TAU); ctx.stroke(); }
        }
        for (i = 0; i < flashes.length; i++) {
            var f = flashes[i], k = f.t / f.max, rr = f.size * S * (0.15 + 0.5 * k);
            var fg = ctx.createRadialGradient(X(f.x), Y(f.y), 0, X(f.x), Y(f.y), rr);
            fg.addColorStop(0, 'rgba(255,250,220,' + (1 - k).toFixed(3) + ')'); fg.addColorStop(0.4, 'rgba(255,170,80,' + (0.7 * (1 - k)).toFixed(3) + ')'); fg.addColorStop(1, 'rgba(255,90,60,0)');
            ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), rr, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(255,220,180,' + (0.6 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), rr * 1.6, 0, TAU); ctx.stroke();
        }
        for (i = 0; i < parts.length; i++) {
            p = parts[i];
            ctx.globalAlpha = Math.max(0, 1 - p.t / p.max);
            ctx.fillStyle = p.col;
            ctx.fillRect(X(p.x) - p.sz / 2, Y(p.y) - p.sz / 2, p.sz, p.sz);
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < pings.length; i++) {
            var pg = pings[i], pk = pg.t / 1.2;
            ctx.strokeStyle = pg.col; ctx.globalAlpha = 0.8 * (1 - pk); ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(X(pg.x), Y(pg.y), 4 + pk * S * 0.45, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (drawPlanet.gx !== undefined) for (i = 0; i < uplinks.length; i++) {   /* commands from the ground station */
            var ul = uplinks[i], s = ul.s;
            if (!s.alive) continue;
            var q = Math.min(1, ul.t / 0.5), sx = drawPlanet.gx, sy = drawPlanet.gy, ex = X(s.x), ey = Y(s.y);
            ctx.strokeStyle = 'rgba(90,242,214,' + (0.5 * (1 - ul.t / 0.8)).toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#5af2d6'; ctx.beginPath(); ctx.arc(sx + (ex - sx) * q, sy + (ey - sy) * q, 2.5, 0, TAU); ctx.fill();
        }
        if (pending) {   /* the private check: encrypted bits travel, nothing is revealed */
            var ps = pending.s, ph = pending.h, ax = X(ps.x), ay = Y(ps.y), bx = X(ph.zx), by = Y(ph.zy);
            ctx.font = '800 10px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (i = 0; i < 4; i++) {
                var bt = ((clock * 1.4 + i / 4) % 1), back = i % 2;
                var px = back ? bx + (ax - bx) * bt : ax + (bx - ax) * bt, py = back ? by + (ay - by) * bt : ay + (by - ay) * bt;
                ctx.fillStyle = back ? '#c39bff' : '#5af2d6'; ctx.fillText(((i * 37 + Math.floor(clock * 6)) % 2) ? '1011' : '0110', px, py);
            }
            label(ax, ay - US * 4, 'private check...', '#c39bff');
        }
        ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        for (i = 0; i < texts.length; i++) {
            var t = texts[i], ta = 1 - t.t / 1.6;
            ctx.globalAlpha = Math.max(0, Math.min(1, ta * 1.5));
            label(X(t.x), Y(t.y) - 18 - (api.reducedMotion ? 0 : t.t * 22), t.text, t.col);
        }
        ctx.globalAlpha = 1;
    }
    function drawEdges() {   /* arrows for meteors still off screen */
        if (!swarmWarn) return;
        var m = 16;
        for (var i = 0; i < hazards.length; i++) {
            var h = hazards[i];
            if (h.dead || h.kind !== 'meteor') continue;
            var x = X(h.x), y = Y(h.y);
            if (x > 0 && x < W && y > 0 && y < H) continue;
            var ax = clamp(x, m, W - m), ay = clamp(y, m + 30, H - m), an = Math.atan2(-h.lin.vy, h.lin.vx);
            if (ax > W - 110 && ay > H - 96) ay = H - 96;   /* keep the mascot corner clear */
            ctx.save(); ctx.translate(ax, ay); ctx.rotate(an);
            ctx.fillStyle = 'rgba(255,179,71,' + (api.reducedMotion ? 0.9 : 0.6 + 0.4 * Math.sin(clock * 10)).toFixed(2) + ')';
            ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
    function draw(dt) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bgc, 0, 0);
        var sx = 0, sy = 0;
        if (shake > 0 && !api.reducedMotion) { sx = rnd(-shake, shake); sy = rnd(-shake, shake); }
        ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
        drawStars();
        if (storm > 0 || stormWarn > 0) drawWind();
        var sel = selSat();
        if (sel) { ctx.strokeStyle = sel.look.body; ctx.globalAlpha = 0.25; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, sel.r * S, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
        drawPlanet();
        if (storm > 0) drawAurora();
        var i;
        for (i = 0; i < hazards.length; i++) if (!hazards[i].dead && hazards[i].kind === 'fuzzy') drawZone(hazards[i]);
        drawPaths();
        for (i = 0; i < hazards.length; i++) if (!hazards[i].dead && hazards[i].kind !== 'fuzzy') drawHaz(hazards[i]);
        drawSats();
        drawFx(dt);
        drawEdges();
        if (redFlash > 0) { ctx.fillStyle = 'rgba(255,60,90,' + (redFlash * (api.reducedMotion ? 0.1 : 0.22)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    /* HUD (DOM), updated a few times a second */
    var shown = {};
    function setHTML(el, key, v) { if (shown[key] !== v) { shown[key] = v; el.innerHTML = v; } }
    function setText(el, key, v) { if (shown[key] !== v) { shown[key] = v; el.textContent = v; } }
    function setCls(el, key, v) { if (shown[key] !== v) { shown[key] = v; el.className = v; } }
    function hud(force) {
        if (force) shown = {};
        var def = curDef(), i, s;
        setText(misN, 'misn', endless ? 'Wave' : (mission + 1) + '/' + MISSIONS.length);
        setText(misT, 'mist', endless ? String(endless) : def.title);
        var rem = Math.max(0, Math.ceil(def.T - mt));
        setText(timeEl, 'time', Math.floor(rem / 60) + ':' + ('0' + rem % 60).slice(-2));
        var h = '', st = station();
        for (i = 0; i < sats.length; i++) {
            s = sats[i];
            if (!s.alive || s.kind !== 'cat') continue;
            h += '<i class="op-head' + (s.hp < s.maxHp ? ' op-hurt' : '') + (s.launch > 0 ? ' op-launch' : '') + '" style="color:' + s.look.body + '"></i>';
        }
        for (i = 0; i < launches.length; i++) h += '<i class="op-head op-launch" style="color:#9fb0e6"></i>';
        for (i = 0; i < spares; i++) h += '<i class="op-head op-spare"></i>';
        if (!h) h = '<small>no cats left</small>';
        if (st) {
            h += '<small>&nbsp;Station</small><span class="op-st">';
            for (i = 0; i < st.maxHp; i++) h += i < (st.alive ? st.hp : 0) ? '&#9632;' : '<i>&#9632;</i>';
            h += '</span>';
        }
        setHTML(catsEl, 'cats', h);
        var g = goalInfo();
        setText(goalEl, 'goal', g ? g.text : '');
        setCls(goalEl, 'goalc', 'op-pill op-goal' + (g && g.done && g.text.indexOf('No cat') < 0 && g.text.indexOf('Stop') < 0 ? ' op-done' : ''));
        if (shown.score !== score) { shown.score = score; api.score(score); }
        var sel = selSat();
        if (sel) {
            var status = sel.launch > 0 ? 'launching' : sel.tr ? (sel.tr.r1 > sel.tr.r0 ? 'raising' : 'lowering') : sel.ph ? 'phasing' : sel.dock > 0 ? 'docking' : '';
            setHTML(selEl, 'sel', '<i class="op-head" style="color:' + sel.look.body + ';margin:3px 0 0"></i>' + sel.name +
                ' <small>L' + laneLabel(sel.r) + (status ? ' ' + status : '') + '</small>' +
                ' <small>Fuel</small><span class="op-bar"><i style="width:' + Math.round(sel.fuel) + '%"></i></span>' +
                ' <small>Heat</small><span class="op-bar op-heat' + (sel.hot ? ' op-hot' : '') + '"><i style="width:' + Math.round(sel.heat) + '%"></i></span>');
        } else setHTML(selEl, 'sel', '<small>Tap a cat satellite to select it</small>');
        var ok = canAct(sel);
        setCls(btnEls.up, 'bu', 'op-btn' + (ok && laneFrom(sel.r, 1) !== null && sel.fuel >= cost(sel, 'up') ? '' : ' op-off'));
        setCls(btnEls.down, 'bd', 'op-btn' + (ok && laneFrom(sel.r, -1) !== null && sel.fuel >= cost(sel, 'down') ? '' : ' op-off'));
        setCls(btnEls.back, 'bb', 'op-btn op-half' + (ok && sel.fuel >= cost(sel, 'back') ? '' : ' op-off'));
        setCls(btnEls.ahead, 'ba', 'op-btn op-half' + (ok && sel.fuel >= cost(sel, 'ahead') ? '' : ' op-off'));
        setCls(btnEls.laser, 'bl', 'op-btn op-laser' + (sel && sel.alive && !sel.hot && phase === 'play' ? '' : ' op-off'));
        setCls(checkBtn, 'bc', 'op-btn op-check' + (checksLeft > 0 && !pending && phase === 'play' ? '' : ' op-off'));
        setText(checkBtn.querySelector('span'), 'cl', 'Check ' + checksLeft);
        alertsUI();
        if (clock > lastToast) toastEl.classList.add('op-hide'); else toastEl.classList.remove('op-hide');
    }
    function laneLabel(r) { var b = 0; for (var i = 1; i < 4; i++) if (Math.abs(LANES[i] - r) < Math.abs(LANES[b] - r)) b = i; return b + 1; }
    function alertsUI() {
        var h = '', n = 0, max = narrow ? 2 : 4;
        if (phase === 'play') {
            var list = alerts.slice().sort(function (p, q) {
                var pp = p.res && !p.res.close ? 1 : 0, qq = q.res && !q.res.close ? 1 : 0;
                return pp - qq || (q.risk >= 0.5) - (p.risk >= 0.5) || p.tca - q.tca;
            });
            for (var i = 0; i < list.length && n < max; i++) {
                var a = list[i], cls, who, what, rk;
                if (a.pair) { cls = 'op-pair'; who = '<b>' + HNAME[a.h.kind] + '</b>'; what = HNAME[a.h2.kind]; rk = 'crash'; }
                else {
                    who = '<i style="background:' + a.s.look.body + '"></i><b>' + a.s.name + '</b>'; what = HNAME[a.h.kind];
                    if (a.zone) { cls = a.res ? (a.res.close ? '' : 'op-safe') : 'op-zone'; rk = a.res ? (a.res.close ? 'close!' : 'safe') : '?'; }
                    else { cls = a.risk >= 0.5 ? '' : a.risk >= 0.25 ? 'op-mid' : 'op-lo'; rk = Math.min(99, Math.round(a.risk * 100)) + '%'; }
                }
                h += '<div class="op-alert ' + cls + '">' + who + '<em>&times; ' + what + '</em><span class="op-t">' + a.tca.toFixed(1) + ' s</span><span class="op-r">' + rk + '</span></div>';
                n++;
            }
            if (!n) h = '<div class="op-alert op-ok">No conjunctions in the next 8 s</div>';
            if (!narrow) h = '<div class="op-alerts-h">Conjunction alerts</div>' + h;
        }
        setHTML(alertsEl, 'alerts', h);
    }
    function showCard(kicker, title, text, sub, cls) {
        cardEl.querySelector('b').textContent = kicker;
        cardEl.querySelector('strong').textContent = title;
        cardEl.querySelector('span').textContent = text;
        cardEl.querySelector('em').textContent = sub || '';
        cardEl.className = 'op-card' + (cls ? ' ' + cls : '');
    }
    function hideCard() { cardEl.classList.add('op-hide'); }

    /* the loop */
    var hudT = 0;
    function update(dt) {
        clock += dt; phaseT += dt;
        if (!api.reducedMotion) planetRot += dt * 0.045;
        shake = Math.max(0, shake - dt * 18);
        redFlash = Math.max(0, redFlash - dt * 2.5);
        var i;
        for (i = parts.length - 1; i >= 0; i -= 1) {
            var p = parts[i];
            p.t += dt;
            if (p.t >= p.max) { parts.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97;
        }
        texts = texts.filter(function (t) { t.t += dt; return t.t < 1.6; });
        beams = beams.filter(function (b) { b.t += dt; return b.t < 0.32; });
        pings = pings.filter(function (q) { q.t += dt; return q.t < 1.2; });
        flashes = flashes.filter(function (f) { f.t += dt; return f.t < f.max; });
        uplinks = uplinks.filter(function (u) { u.t += dt; return u.t < 0.8; });
        if (phase === 'play') sim(dt);
        else if (phase === 'brief') { if (phaseT > 9) begin(); }
        else if (phase === 'done') { if (phaseT > 4) nextMission(); }
        else if (phase === 'over') { if (phaseT > 1.6) finish(); }
    }
    var fpsN = 0, fpsT = 0;
    api.loop(function (dt) {
        if (test) { dt *= test.dbg.speed; fpsN++; fpsT += dt / test.dbg.speed; if (fpsT >= 1) { test.fps = fpsN / fpsT; fpsN = 0; fpsT = 0; } }
        var n = Math.max(1, Math.ceil(dt / 0.02));
        for (var i = 0; i < n; i++) update(dt / n);
        draw(dt);
        hudT -= dt;
        if (hudT <= 0) { hudT = 0.15; hud(); }
    });

    /* controls: tap a cat to select it, tap junk to zap it, tap a zone for a private check; drag a cat to burn; buttons; keys */
    function satAt(px, py) {
        var best = null, bd = 1e9;
        for (var i = 0; i < sats.length; i++) {
            var s = sats[i];
            if (!s.alive) continue;
            var d = Math.hypot(X(s.x) - px, Y(s.y) - py), lim = s.kind === 'station' ? Math.max(26, S * 0.3) : Math.max(24, US * 3.4);
            if (d < lim && d < bd) { bd = d; best = s; }
        }
        return best;
    }
    function hazAt(px, py) {
        var best = null, bd = 1e9, zone = null, zd = 1e9;
        for (var i = 0; i < hazards.length; i++) {
            var h = hazards[i];
            if (h.dead) continue;
            if (h.kind === 'fuzzy') { var dz = Math.hypot(X(h.zx) - px, Y(h.zy) - py); if (dz < ZR * S && dz < zd) { zd = dz; zone = h; } continue; }
            var d = Math.hypot(X(h.x) - px, Y(h.y) - py);
            if (d < Math.max(20, h.r * S + 12) && d < bd) { bd = d; best = h; }
        }
        return best || zone;
    }
    var drag = null;
    api.on(cv, 'pointerdown', function (e) {
        if (e.pointerType === 'touch' && !touchy) { touchy = true; root.classList.add('op-touch'); }
        e.preventDefault();
        if (phase === 'brief') { begin(); return; }
        if (phase === 'done') { if (phaseT > 1) nextMission(); return; }
        if (phase !== 'play') return;
        var b = cv.getBoundingClientRect(), px = e.clientX - b.left, py = e.clientY - b.top;
        var s = satAt(px, py);
        if (s) {
            select(s);
            drag = { id: s.id, x: px, y: py, used: false };
            try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not every pointer can be captured */ }
            return;
        }
        var h = hazAt(px, py);
        if (h) {
            if (h.kind === 'fuzzy') {
                var sel = selSat();
                if (!sel) { toast('Select a cat first, then tap the zone to check it privately', 2200, 'info'); return; }
                closest(sel.P, h.Z);
                if (CL.d >= ZR + sel.hr) { toast('That zone is not on ' + sel.name + '\'s path', 1800, 'info'); return; }
                checkAuto(sel, h);
            } else tapHaz(h);
        }
    });
    api.on(cv, 'pointermove', function (e) {
        if (!drag || drag.used) return;
        var b = cv.getBoundingClientRect(), px = e.clientX - b.left, py = e.clientY - b.top, dx = px - drag.x, dy = py - drag.y;
        if (Math.hypot(dx, dy) < 24) return;
        var s = null;
        for (var i = 0; i < sats.length; i++) if (sats[i].id === drag.id && sats[i].alive) s = sats[i];
        drag.used = true;
        if (!s) return;
        var rx = X(s.x) - cx, ry = Y(s.y) - cy, rl = Math.hypot(rx, ry) || 1;
        rx /= rl; ry /= rl;
        var rad = dx * rx + dy * ry, tan = dx * ry - dy * rx;   /* (ry, -rx) is the direction of motion on screen */
        if (Math.abs(rad) > Math.abs(tan)) act(rad > 0 ? 'up' : 'down');
        else act(tan > 0 ? 'ahead' : 'back');
    });
    ['pointerup', 'pointercancel'].forEach(function (t) { api.on(cv, t, function () { drag = null; }); });
    api.on(cv, 'contextmenu', function (e) { e.preventDefault(); });
    Object.keys(btnEls).forEach(function (k) {
        var b = btnEls[k];
        api.on(b, 'pointerdown', function (e) {
            e.preventDefault(); e.stopPropagation();
            b.classList.add('op-on');
            act(k);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) { api.on(b, t, function () { b.classList.remove('op-on'); }); });
        api.on(b, 'click', function (e) { e.preventDefault(); });
    });
    var KEYS = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'back', a: 'back', arrowright: 'ahead', d: 'ahead',
        ' ': 'laser', l: 'laser', f: 'laser', c: 'check', p: 'check' };
    api.on(window, 'keydown', function (e) {
        if (phase === 'over') return;
        var k = (e.key || '').toLowerCase();
        if (k === 'tab' || k === 'e' || k === 'q') { e.preventDefault(); if (phase === 'play') selectNext(k === 'q' || (k === 'tab' && e.shiftKey) ? -1 : 1); return; }
        if (/^[1-9]$/.test(k)) {
            var live = sats.filter(function (s) { return s.alive; });
            if (live[+k - 1]) select(live[+k - 1]);
            return;
        }
        if (k === 'enter' && phase !== 'play') { e.preventDefault(); act('laser'); return; }
        var m = KEYS[k];
        if (!m) return;
        e.preventDefault();
        if (e.repeat) return;
        act(m);
    });

    /* a hook for the standalone test page only (it defines window.__errors) */
    if (window.__errors) {
        test = window.__op = {
            dbg: { speed: 1, god: false, reveal: false }, bot: false, botT: 0, fps: 0,
            seen: {}, threats: 0, swarms: 0, storms: 0, kess: 0, cascades: 0, frags: 0, hits: 0, shots: 0, zaps: 0, nudges: 0,
            meteorZaps: 0, checks: 0, results: [], dodges: 0, burns: 0, docks: 0, missions: 0,
            state: function () {
                var kinds = {};
                hazards.forEach(function (h) { kinds[h.kind] = (kinds[h.kind] || 0) + 1; });
                return { mission: mission, endless: endless, cleared: cleared, phase: phase, mt: mt, score: score, spares: spares, cats: aliveCats(),
                    station: station() ? station().hp : null, hazards: hazards.length, kinds: kinds, alerts: alerts.length,
                    top: alerts[0] ? { tca: alerts[0].tca, risk: alerts[0].risk, zone: !!alerts[0].zone, pair: !!alerts[0].pair } : null,
                    checksLeft: checksLeft, storm: storm, narrow: narrow, S: S, cx: cx, cy: cy, sel: selId, particles: parts.length,
                    sats: sats.filter(function (s) { return s.alive; }).map(function (s) { return { id: s.id, kind: s.kind, r: s.r, fuel: s.fuel, heat: s.heat, hot: s.hot, hp: s.hp, x: X(s.x), y: Y(s.y) }; }) };
            },
            go: function (n) { endless = 0; ended = false; startMission(n); },
            wave: function (n) { endless = n; cleared = MISSIONS.length; startMission(-1); },
            meteorsIn: function () { return hazards.filter(function (h) { return !h.dead && h.kind === 'meteor' && Math.hypot(h.x, h.y) < 3; }).length; },
            begin: begin, act: act, event: runEvent, threat: makeThreat, kessler: kesslerEvent, finish: function () { mt = curDef().T; },
            select: function (i) { var live = sats.filter(function (s) { return s.alive; }); if (live[i]) select(live[i]); },
            screenOfHaz: function (kind) {
                for (var i = 0; i < hazards.length; i++) { var h = hazards[i]; if (!h.dead && h.kind === kind) return h.kind === 'fuzzy' ? [X(h.zx), Y(h.zy)] : [X(h.x), Y(h.y)]; }
                return null;
            },
            zapNear: function () {   /* move a piece of debris next to the selected cat (for a laser screenshot) */
                var s = selSat(); if (!s) return false;
                var a = s.th + 0.35, r = s.r + 0.25, h = newHaz('debris', circOrb(r, a, 1));
                addHaz(h); needPredict = true; return [X(h.x), Y(h.y)];
            },
            dock: function () {   /* put the first courier on the station lane, just behind it */
                var st = station(), c = sats.filter(function (q) { return q.alive && q.kind === 'cat'; })[0];
                if (!st || !c) return false;
                c.r = st.r; c.th = st.th - 0.05; c.tr = null; c.ph = null; needPredict = true; return true;
            },
            ram: function (kind) {   /* send a big object straight into a cat: a collision and a fragment cloud */
                var live = sats.filter(function (s) { return s.alive && s.kind === 'cat' && s.launch <= 0; });
                if (!live.length) return false;
                var s = live[0], T = 1.2, c = satAtTime(s, T, tmp3), r = Math.hypot(tmp3[0], tmp3[1]), vc = vcirc(r);
                var orb = toOrbit(tmp3[0], tmp3[1], (tmp3[1] / r) * vc, -(tmp3[0] / r) * vc);
                orb.M -= orb.n * T;
                var h = newHaz(kind || 'big', orb); addHaz(h); needPredict = true; return true;
            }
        };
    }

    fit(api.size());
    api.onResize(function (s) { fit(s); predict(); });
    startMission(0);
    return { destroy: function () { if (window.__op === test) delete window.__op; } };
});
