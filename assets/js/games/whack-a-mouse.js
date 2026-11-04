/* Whack-a-Mouse: mice pop out of the holes, tap them before they hide. A run is a few short rounds that get faster.
   Mice: plain (1), sporty fast mice (2), mice in acorn helmets that need two taps (3), golden mice with cheese (5).
   Quick hits in a row build a combo multiplier. A sleeping kitten sometimes curls up in a hole: tapping it costs a heart,
   and the run ends when the hearts are gone; hearts left at the end give a bonus. Difficulty (api.level()) sets the
   board (3x3 or 4x4), speed, hearts and how often the tricky ones show up.
   Keys: 1 to 9 like a numpad on 3x3, the rows 1234 / QWER / ASDF / ZXCV on 4x4. */
Arcade.register('whack-a-mouse', function (api) {
    'use strict';
    api.css(
        '.wm { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;' +
        '  -webkit-user-select: none; user-select: none; }' +
        '.wm-top { width: var(--b); display: flex; align-items: center; gap: 10px; font-weight: 800; color: #475569; font-variant-numeric: tabular-nums; }' +
        '.wm-hearts { display: flex; gap: 2px; }' +
        '.wm-hearts svg { width: 20px; height: 20px; display: block; transition: transform .25s, opacity .25s; }' +
        '.wm-hearts .off { opacity: .28; transform: scale(.75); filter: grayscale(1); }' +
        '.wm-hearts .lost { animation: wm-lost .5s ease-out; }' +
        '.wm-round { padding: 3px 10px; border-radius: 999px; background: #fff; box-shadow: 0 2px 8px rgba(15, 23, 42, .08); color: #1e3a8a; font-size: .85rem; white-space: nowrap; }' +
        '.wm-bar { flex: 1; min-width: 40px; height: 12px; border-radius: 999px; background: #e2e8f0; overflow: hidden; box-shadow: inset 0 1px 2px rgba(15, 23, 42, .12); }' +
        '.wm-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #f6a23a, #fbbf24); transform-origin: left; }' +
        '.wm-fill.low { background: linear-gradient(90deg, #e8590c, #f6a23a); }' +
        '.wm-time { min-width: 2.2em; text-align: right; }' +
        '.wm-field { position: relative; box-sizing: border-box; width: var(--b); height: var(--b); display: grid; grid-template-columns: repeat(var(--n), 1fr);' +
        '  gap: calc(var(--b) * .02); padding: calc(var(--b) * .04); border-radius: 28px; touch-action: none;' +
        '  background: radial-gradient(circle at 18% 22%, rgba(255, 251, 235, .7) 0 1.5px, transparent 2.5px) 0 0 / 52px 52px,' +
        '    radial-gradient(circle at 70% 64%, rgba(253, 230, 138, .8) 0 2px, transparent 3px) 0 0 / 74px 74px,' +
        '    radial-gradient(ellipse at 50% 0, #ecfccb, #bbf7d0 70%, #a7f3d0);' +
        '  box-shadow: inset 0 -7px 0 #86efac, 0 10px 26px rgba(21, 128, 61, .14); }' +
        '.wm-hole { position: relative; cursor: pointer; -webkit-tap-highlight-color: transparent; }' +
        '.wm-mound { position: absolute; left: 2%; right: 2%; top: 56%; height: 38%; border-radius: 50%;' +
        '  background: radial-gradient(ellipse at 50% 30%, #f3d9b1, #e3b98a 70%); box-shadow: 0 4px 0 #cf9f6c; }' +
        '.wm-pit { position: absolute; left: 12%; right: 12%; top: 62%; height: 24%; border-radius: 50%;' +
        '  background: radial-gradient(ellipse at 50% 30%, #3f2d22, #6b4a33 85%); box-shadow: inset 0 4px 6px rgba(0, 0, 0, .35); }' +
        '.wm-win { position: absolute; left: 7%; right: 7%; top: -8%; bottom: 26%; overflow: hidden; pointer-events: none; }' +
        '.wm-who { position: absolute; inset: 0; transform: translateY(105%); transition: transform .12s ease-in; }' +
        '.wm-hole.up .wm-who { transform: none; transition: transform .2s cubic-bezier(.3, 1.6, .5, 1); }' +
        '.wm-who > * { transform-origin: 50% 100%; }' +
        '.wm-who svg { display: block; width: 100%; height: 100%; } .wm-who > svg { overflow: visible; }' +
        '.wm-who .cat { position: absolute; left: 0; top: 0; width: 100%; height: 100%; cursor: inherit; }' +
        '.wm-hole.hit .wm-who > * { animation: wm-bonk .28s ease-out; }' +
        '.wm-hole.miss .wm-mound, .wm-hole.miss .wm-pit { animation: wm-shake .2s; }' +
        '.wm-key { position: absolute; left: 6%; top: 3%; font-size: calc(var(--b) / var(--n) * .12); font-weight: 800; color: #65a30d; opacity: .7; }' +
        /* the mice */
        '.wm .b { fill: #d6dce5; stroke: #3f4a5a; stroke-width: 2.2; }' +
        '.wm .bl { fill: #f1f5f9; }' +
        '.wm .e { fill: #fbcfe8; } .wm .k { fill: #0f172a; } .wm .n { fill: #e8618c; }' +
        '.wm .w { stroke: #64748b; stroke-width: 1.4; stroke-linecap: round; }' +
        '.wm .x { fill: none; stroke: #0f172a; stroke-width: 3; stroke-linecap: round; }' +
        '.wm .wm-ex, .wm-hole.hit .wm-eo { display: none; } .wm-hole.hit .wm-ex { display: inline; }' +
        '.wm-fast .b { fill: #e9cba7; stroke: #6b4a33; } .wm-fast .bl { fill: #fbecd9; }' +
        '.wm .band { fill: #f87171; stroke: #b91c1c; stroke-width: 1.4; }' +
        '.wm .zip { stroke: #93c5fd; stroke-width: 3; stroke-linecap: round; animation: wm-zip .3s linear infinite alternate; }' +
        '.wm-gold .b { fill: #fcd34d; stroke: #b45309; } .wm-gold .bl { fill: #fef3c7; } .wm-gold .e { fill: #fde68a; }' +
        '.wm .c { fill: #fde047; stroke: #ca8a04; stroke-width: 2; } .wm .h { fill: #eab308; }' +
        '.wm .s { fill: #fff7c2; stroke: #f59e0b; stroke-width: 1.2; transform-box: fill-box; transform-origin: center; animation: wm-tw .45s infinite alternate; }' +
        '.wm .cap { fill: #c08348; stroke: #6b4a33; stroke-width: 2; } .wm .capx { fill: none; stroke: #8a5a2f; stroke-width: 1.3; }' +
        '.wm .stem { fill: none; stroke: #6b4a33; stroke-width: 3; stroke-linecap: round; }' +
        '.wm .wm-capg { transform-box: fill-box; transform-origin: 50% 100%; }' +
        '.wm-bare .wm-capg { animation: wm-capoff .5s ease-in forwards; }' +
        '.wm .daze { display: none; fill: #fbbf24; } .wm-bare .daze { display: inline; }' +
        '.wm .zz { font: 800 14px ui-rounded, system-ui, sans-serif; fill: #60a5fa; animation: wm-zz 1.6s ease-in-out infinite; }' +
        /* feedback */
        '.wm-burst { position: absolute; left: 30%; top: 20%; width: 40%; aspect-ratio: 1; box-sizing: border-box; border-radius: 50%;' +
        '  border: 4px solid #f6a23a; pointer-events: none; animation: wm-burst .4s ease-out forwards; }' +
        '.wm-dot { position: absolute; left: 50%; top: 38%; width: 9px; height: 9px; margin: -4.5px; border-radius: 50%; pointer-events: none;' +
        '  animation: wm-fly .55s cubic-bezier(.2, .7, .4, 1) forwards; }' +
        '.wm-paw { position: absolute; left: 50%; top: 40%; width: 34%; margin-left: -17%; pointer-events: none; fill: rgba(30, 58, 138, .22);' +
        '  animation: wm-stamp .45s ease-out forwards; }' +
        '.wm-float { position: absolute; left: 0; right: 0; top: 2%; text-align: center; font-weight: 800; font-size: calc(var(--b) / var(--n) * .22);' +
        '  color: #1e3a8a; pointer-events: none; text-shadow: 0 2px 0 #fff, 0 0 6px #fff; animation: wm-up .75s ease-out forwards; white-space: nowrap; }' +
        '.wm-float.bad { color: #d6336c; } .wm-float.gold { color: #b45309; } .wm-float.fast { color: #2563eb; } .wm-float.clank { color: #8a5a2f; }' +
        '.wm-combo { position: absolute; right: 14px; top: -14px; padding: 4px 12px; border-radius: 999px; background: #1e3a8a; color: #fff;' +
        '  font-weight: 800; font-size: .9rem; box-shadow: 0 4px 10px rgba(30, 58, 138, .25); pointer-events: none; opacity: 0; transition: opacity .25s; }' +
        '.wm-combo.on { opacity: 1; } .wm-combo.x2 { background: #f6a23a; } .wm-combo.x3 { background: #e8590c; } .wm-combo.x4 { background: #d6336c; }' +
        '.wm-combo.bump { animation: wm-bump .25s ease-out; }' +
        '.wm-banner { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; pointer-events: none; z-index: 2; }' +
        '.wm-banner b { display: block; font-size: calc(var(--b) * .12); font-weight: 800; color: #1e3a8a; text-shadow: 0 3px 0 #fff, 0 0 12px #fff; }' +
        '.wm-banner small { display: block; margin-top: 4px; font-size: calc(var(--b) * .045); font-weight: 800; color: #475569; text-shadow: 0 2px 0 #fff; }' +
        '.wm-banner.pop b { animation: wm-in .4s cubic-bezier(.3, 1.6, .5, 1); }' +
        '.wm-calm *, .wm-calm .wm-hole .wm-who { animation: none !important; transition: none !important; }' +
        '.wm-calm .wm-bare .wm-capg { display: none; }' +
        '@keyframes wm-bonk { 0% { transform: none; } 30% { transform: scale(1.18, .72); } 100% { transform: none; } }' +
        '@keyframes wm-shake { 0%, 100% { transform: none; } 33% { transform: translateX(-4px); } 66% { transform: translateX(4px); } }' +
        '@keyframes wm-burst { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }' +
        '@keyframes wm-fly { from { transform: none; opacity: 1; } to { transform: translate(var(--dx), var(--dy)) scale(.4); opacity: 0; } }' +
        '@keyframes wm-stamp { 0% { transform: scale(1.5); opacity: 0; } 30% { transform: scale(1); opacity: 1; } 100% { opacity: 0; } }' +
        '@keyframes wm-up { from { transform: none; opacity: 1; } to { transform: translateY(-60%); opacity: 0; } }' +
        '@keyframes wm-tw { from { transform: scale(.6) rotate(0); } to { transform: scale(1.1) rotate(20deg); } }' +
        '@keyframes wm-zip { from { opacity: .3; } to { opacity: 1; } }' +
        '@keyframes wm-capoff { to { transform: translate(40%, -120%) rotate(70deg); opacity: 0; } }' +
        '@keyframes wm-zz { 0% { opacity: 0; transform: translate(0, 4px); } 40% { opacity: 1; } 100% { opacity: 0; transform: translate(6px, -10px); } }' +
        '@keyframes wm-lost { 0% { transform: scale(1.5); } 100% { transform: scale(.75); } }' +
        '@keyframes wm-bump { 50% { transform: scale(1.25); } }' +
        '@keyframes wm-in { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }');

    /* difficulty: board size, hearts, rounds of dur seconds; [start, end] values ramp over the whole run */
    var LEVELS = {
        easy:   { n: 3, hearts: 5, rounds: 3, dur: 18, stay: [1.7, 1.15], gap: [1.05, 0.7], up: [1.5, 3], window: 1.6,
                  kit: 0.06, fast: 0.08, armor: 0.07, gold: 0.08 },
        normal: { n: 3, hearts: 3, rounds: 3, dur: 16, stay: [1.2, 0.75], gap: [0.85, 0.48], up: [2, 4], window: 1.2,
                  kit: 0.12, fast: 0.15, armor: 0.12, gold: 0.07 },
        hard:   { n: 4, hearts: 3, rounds: 4, dur: 15, stay: [0.95, 0.55], gap: [0.6, 0.3], up: [3, 6], window: 1,
                  kit: 0.17, fast: 0.22, armor: 0.16, gold: 0.06 }
    };
    var L = LEVELS[api.level()] || LEVELS.normal, N = L.n;
    var POINTS = { mouse: 1, fast: 2, armor: 3, gold: 5 };
    var HEART_BONUS = 5;
    /* 3x3: keys 7 8 9 are the top row, like a numpad; 4x4: four rows of the keyboard */
    var KEYS = N === 3 ? { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 } : {};
    var LABELS = N === 3 ? ['7', '8', '9', '4', '5', '6', '1', '2', '3'] : '1234QWERASDFZXCV'.split('');
    if (N === 4) LABELS.forEach(function (c, k) { KEYS[c.toLowerCase()] = k; });

    var BODY = '<path class="b" d="M20 100C20 74 80 74 80 100z"/><path class="bl" d="M38 100c0-12 24-12 24 0z"/>' +
        '<circle class="b" cx="25" cy="30" r="16"/><circle class="e" cx="25" cy="30" r="9"/>' +
        '<circle class="b" cx="75" cy="30" r="16"/><circle class="e" cx="75" cy="30" r="9"/>' +
        '<ellipse class="b" cx="50" cy="56" rx="27" ry="25"/><ellipse class="bl" cx="50" cy="66" rx="15" ry="10"/>';
    var FACE = '<g class="wm-eo"><circle class="k" cx="40" cy="52" r="4.2"/><circle class="k" cx="60" cy="52" r="4.2"/>' +
        '<circle fill="#fff" cx="41.5" cy="50.5" r="1.4"/><circle fill="#fff" cx="61.5" cy="50.5" r="1.4"/></g>' +
        '<path class="wm-ex x" d="M36 48l8 8M44 48l-8 8M56 48l8 8M64 48l-8 8"/>' +
        '<ellipse class="n" cx="50" cy="63" rx="4.5" ry="3.5"/><path class="w" d="M38 65l-18-4M38 69l-18 3M62 65l18-4M62 69l18 3"/>' +
        '<circle fill="#fda4af" opacity=".6" cx="33" cy="61" r="3.5"/><circle fill="#fda4af" opacity=".6" cx="67" cy="61" r="3.5"/>';
    var ART = {
        mouse: BODY + FACE,
        fast: '<path class="zip" d="M2 46h12M-2 58h14M2 70h10M86 46h12M88 58h14M90 70h10"/>' + BODY + FACE +
            '<path class="band" d="M25 42q25-9 50 0v6q-25-9-50 0z"/>',
        armor: BODY + FACE + '<g class="wm-capg"><path class="cap" d="M22 44C22 18 78 18 78 44c-9 4-47 4-56 0z"/>' +
            '<path class="capx" d="M30 30l10 12M42 24l10 18M56 23l8 18M68 28l6 12M34 41l8-14M48 42l8-18M62 42l6-14"/>' +
            '<path class="stem" d="M50 21c0-6 3-9 7-10"/></g>' +
            '<g class="daze"><path d="M24 30l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z"/><path d="M76 26l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z"/></g>',
        gold: BODY + FACE + '<path class="c" d="M26 99l46-14v15H26z"/><circle class="h" cx="44" cy="95" r="2.5"/><circle class="h" cx="60" cy="92" r="2"/>' +
            '<path class="s" d="M90 8l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path class="s" d="M8 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>'
    };
    var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#f472b6" stroke="#be185d" stroke-width="1.6" d="M12 21s-8-5.2-8-11.2C4 6.6 6.4 4.5 9 4.5c1.4 0 2.4.7 3 1.6.6-.9 1.6-1.6 3-1.6 2.6 0 5 2.1 5 5.3C20 15.8 12 21 12 21z"/>' +
        '<path fill="#fff" opacity=".55" d="M7.5 8.2c.4-1.3 1.6-1.9 2.6-1.6-1 .6-1.6 1.4-1.8 2.3z"/></svg>';
    var PAW = '<svg class="wm-paw" viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="27" rx="10" ry="8.5"/>' +
        '<ellipse cx="8" cy="15" rx="4" ry="5"/><ellipse cx="16" cy="9" rx="4" ry="5"/><ellipse cx="24" cy="9" rx="4" ry="5"/><ellipse cx="32" cy="15" rx="4" ry="5"/></svg>';
    function svg(inner) { return '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' + inner + '</svg>'; }

    var wrap = document.createElement('div');
    wrap.className = 'wm' + (api.reducedMotion ? ' wm-calm' : '');
    wrap.style.setProperty('--n', N);
    wrap.innerHTML = '<div class="wm-top"><span class="wm-hearts" aria-label="Hearts"></span><span class="wm-round"></span>' +
        '<div class="wm-bar"><div class="wm-fill"></div></div><span class="wm-time"></span></div>' +
        '<div class="wm-field"><div class="wm-banner"></div><div class="wm-combo"></div></div>';
    api.el.appendChild(wrap);
    var field = wrap.querySelector('.wm-field'), fill = wrap.querySelector('.wm-fill'), comboEl = wrap.querySelector('.wm-combo');
    var timeEl = wrap.querySelector('.wm-time'), banner = wrap.querySelector('.wm-banner');
    var heartsEl = wrap.querySelector('.wm-hearts'), roundEl = wrap.querySelector('.wm-round');
    var catArt = document.querySelector('.arcade .mascot svg');
    /* dog mode (a dog look, data-pet="dog"): the cloned mascot is a dog (cat.css), so a puppy naps in the hole */
    var DOG = document.documentElement.dataset.pet === 'dog', KIT = DOG ? 'puppy' : 'kitten';
    var holes = [], i;
    for (i = 0; i < N * N; i++) {
        var h = document.createElement('div');
        h.className = 'wm-hole';
        h.dataset.i = i;
        h.innerHTML = '<div class="wm-mound"></div><div class="wm-pit"></div><div class="wm-win"><div class="wm-who"></div></div>' +
            (api.touch ? '' : '<span class="wm-key">' + LABELS[i] + '</span>');
        field.insertBefore(h, banner);
        /* kind: null, 'mouse', 'fast', 'armor', 'gold' or 'kit'; hp: taps still needed; left: seconds until it hides;
           cool: seconds before the hole is used again */
        holes.push({ el: h, who: h.querySelector('.wm-who'), kind: null, hp: 0, hit: false, left: 0, cool: 0 });
    }
    for (i = 0; i < L.hearts; i++) heartsEl.insertAdjacentHTML('beforeend', HEART);
    function fit(s) { wrap.style.setProperty('--b', Math.max(200, Math.min(560, s.w - 28, s.h - 130)) + 'px'); }
    fit(api.size());
    api.onResize(fit);

    var phase = 'ready', wait = 1.6, round = 1, rt = 0, t = 0, spawnIn = 0.3, score = 0, caught = 0;
    var hearts = L.hearts, combo = 0, bestCombo = 0, sinceHit = 99, lastSay = -9;

    function lerp(a, p) { return a[0] + (a[1] - a[0]) * p; }
    function progress() { return Math.min(1, ((round - 1) + rt / L.dur) / L.rounds); }   /* 0 to 1 over the whole run */
    function mult() { return Math.min(4, 1 + Math.floor(Math.max(0, combo - 1) / 4)); }
    function chat(text, mood) {                       /* the cat comments at most every few seconds */
        if (mood) api.cat(mood);
        if (t - lastSay < 4) return;
        lastSay = t;
        api.say(text, 1600);
    }
    function showBanner(big, small) {
        banner.innerHTML = big ? '<b>' + big + '</b>' + (small ? '<small>' + small + '</small>' : '') : '';
        banner.classList.remove('pop');
        void banner.offsetWidth;
        banner.classList.add('pop');
    }
    function showRound() { roundEl.textContent = 'Round ' + round + '/' + L.rounds; }
    function showCombo(bump) {
        var m = mult();
        comboEl.className = 'wm-combo' + (combo >= 3 ? ' on' : '') + (m > 1 ? ' x' + m : '') + (bump && combo >= 3 ? ' bump' : '');
        comboEl.textContent = 'Combo ' + combo + (m > 1 ? '  x' + m : '');
    }
    function breakCombo() { if (combo) { combo = 0; showCombo(); } }

    function pick() {
        var r = Math.random(), p = progress();
        if (t > 2.5 && (r -= L.kit) < 0) return 'kit';
        if (t > 4 && (r -= L.gold) < 0) return 'gold';
        if ((round > 1 || L.n > 3) && (r -= L.armor * (0.6 + p)) < 0) return 'armor';
        if ((round > 1 || L !== LEVELS.easy) && (r -= L.fast * (0.6 + p)) < 0) return 'fast';
        return 'mouse';
    }
    function spawn() {
        var p = progress(), free = [], up = 0;
        holes.forEach(function (o, k) { if (o.kind) up++; else if (o.cool <= 0) free.push(k); });
        if (!free.length || up >= Math.round(lerp(L.up, p))) return;
        var o = holes[free[Math.floor(Math.random() * free.length)]];
        var stay = lerp(L.stay, p) * (0.85 + Math.random() * 0.3);
        o.kind = pick();
        o.hit = false;
        o.hp = o.kind === 'armor' ? 2 : 1;
        o.left = stay * { mouse: 1, fast: 0.6, armor: 1.35, gold: 0.7, kit: 1.6 }[o.kind];
        o.who.className = 'wm-who wm-' + o.kind;
        if (o.kind === 'kit') {
            o.who.innerHTML = '';
            var c = document.createElement('div');
            c.className = 'cat sleep';
            if (catArt) {
                var art = catArt.cloneNode(true);
                art.setAttribute('viewBox', '14 42 88 50');            /* the curled up sleeping pose */
                art.setAttribute('preserveAspectRatio', 'xMidYMax meet');
                c.appendChild(art);
                c.insertAdjacentHTML('beforeend', svg('<text class="zz" x="78" y="40">z</text><text class="zz" x="86" y="26" style="animation-delay:.6s">z</text>'));
                c.lastChild.style.cssText = 'position:absolute;inset:0';
            } else c.innerHTML = svg('<text x="50" y="90" font-size="56" text-anchor="middle">' + (DOG ? '🐶' : '😺') + '</text>');
            o.who.appendChild(c);
        } else o.who.innerHTML = svg(ART[o.kind]);
        o.el.classList.remove('hit');
        void o.el.offsetWidth;                        /* restart the pop transition */
        o.el.classList.add('up');
    }
    function hide(o) {
        if (o.kind && o.kind !== 'kit' && !o.hit && phase === 'play') breakCombo();   /* a mouse got away */
        o.el.classList.remove('up');
        o.kind = null;
        o.cool = 0.25;
    }
    function effect(o, cls, text, colors) {
        var f = document.createElement('div');
        f.className = 'wm-float ' + cls;
        f.textContent = text;
        o.el.appendChild(f);
        var bits = [f];
        if (!api.reducedMotion) {
            var b = document.createElement('div');
            b.className = 'wm-burst';
            b.style.borderColor = colors[0];
            o.el.appendChild(b);
            bits.push(b);
            for (var j = 0; j < 8; j++) {
                var d = document.createElement('div'), a = j / 8 * Math.PI * 2 + Math.random() * 0.5, r = 30 + Math.random() * 26;
                d.className = 'wm-dot';
                d.style.background = colors[j % colors.length];
                d.style.setProperty('--dx', Math.cos(a) * r + 'px');
                d.style.setProperty('--dy', Math.sin(a) * r - 10 + 'px');
                o.el.appendChild(d);
                bits.push(d);
            }
        }
        api.timeout(function () { bits.forEach(function (x) { x.remove(); }); }, 780);
    }
    function stamp(o) {
        if (api.reducedMotion) return;
        o.el.insertAdjacentHTML('beforeend', PAW);
        var p = o.el.lastChild;
        api.timeout(function () { p.remove(); }, 460);
    }
    function loseHeart() {
        hearts--;
        var hs = heartsEl.children, el = hs[hearts];
        if (el) { el.classList.add('off', 'lost'); }
    }
    function whack(k) {
        var o = holes[k];
        if (phase !== 'play' || !o) return;
        stamp(o);
        if (!o.kind || o.hit) {                       /* an empty hole: a little wobble, and the combo ends */
            breakCombo();
            o.el.classList.remove('miss');
            void o.el.offsetWidth;
            o.el.classList.add('miss');
            api.sfx('tap');
            return;
        }
        if (o.kind === 'kit') {                       /* the sleeping kitten wakes up, and a heart is gone */
            o.hit = true;
            o.left = Math.min(o.left, 0.5);
            o.el.classList.add('hit');
            var c = o.who.firstChild, art = c && c.querySelector('svg');
            if (c) { c.className = 'cat'; if (art) art.setAttribute('viewBox', '34 0 64 64'); if (c.lastChild !== art) c.lastChild.remove(); }
            breakCombo();
            loseHeart();
            api.sfx('hit');
            effect(o, 'bad', '-1 ♥', ['#f472b6', '#d6336c']);
            chat(['Hey! Let the ' + KIT + ' sleep!', 'Shh, mice only.', 'Not the ' + KIT + '!'][Math.floor(Math.random() * 3)], 'wow');
            if (hearts <= 0) api.timeout(function () { finish(false); }, 350);
            return;
        }
        if (o.kind === 'armor' && o.hp > 1) {        /* first tap knocks the acorn helmet off */
            o.hp--;
            o.who.classList.add('wm-bare');
            o.left = Math.max(o.left, 0.7);
            sinceHit = 0;
            api.sfx('tap');
            effect(o, 'clank', 'Clank!', ['#c08348', '#fbbf24']);
            return;
        }
        o.hit = true;
        o.left = Math.min(o.left, 0.3);               /* stays a moment to show the bonk, then hides */
        o.el.classList.add('hit');
        combo = sinceHit <= L.window ? combo + 1 : 1;
        sinceHit = 0;
        bestCombo = Math.max(bestCombo, combo);
        var m = mult(), pts = POINTS[o.kind] * m;
        score += pts;
        caught++;
        api.score(score);
        showCombo(true);
        api.sfx(o.kind === 'gold' ? 'point' : 'pop');
        var col = { mouse: ['#f6a23a', '#93c5fd', '#fde68a'], fast: ['#60a5fa', '#f87171', '#bfdbfe'],
                    armor: ['#c08348', '#fbbf24', '#fde68a'], gold: ['#fbbf24', '#fde047', '#fff7c2'] }[o.kind];
        effect(o, o.kind === 'mouse' ? '' : o.kind === 'armor' ? 'clank' : o.kind, '+' + pts, col);
        if (o.kind === 'gold') chat('Golden cheese!', 'wow');
        else if (combo === 8 || combo === 16 || combo === 24) chat([DOG ? 'Pawsome!' : 'Purrfect!', 'What a paw!', 'Unstoppable!'][combo / 8 - 1], 'happy');
    }
    function finish(win) {
        if (phase === 'over') return;
        phase = 'over';
        holes.forEach(hide);
        breakCombo();
        var bonus = win ? hearts * HEART_BONUS : 0;
        score += bonus;
        api.score(score);
        fill.style.transform = 'scaleX(0)';
        timeEl.textContent = '0s';
        var mice = caught + (caught === 1 ? ' mouse' : ' mice');
        api.end({ score: score, win: win && score > 0,
            text: (win ? 'All rounds done!\n' : 'Out of hearts!\n') + mice + ', best combo ' + bestCombo +
                (bonus ? ', heart bonus +' + bonus : '') + '\n' + score + (score === 1 ? ' point' : ' points') });
    }

    api.loop(function (dt) {
        if (phase === 'over') return;
        sinceHit += dt;
        if (combo && sinceHit > L.window + 0.4 && comboEl.classList.contains('on')) comboEl.classList.remove('on');
        if (phase === 'ready' || phase === 'break') {
            wait -= dt;
            if (phase === 'ready' && wait <= 0.5 && banner.textContent === 'Ready?') showBanner('Go!');
            if (wait <= 0) { phase = 'play'; showBanner(''); }
            return;
        }
        t += dt;
        rt += dt;
        holes.forEach(function (o) {
            if (o.kind) { o.left -= dt; if (o.left <= 0) hide(o); } else if (o.cool > 0) o.cool -= dt;
        });
        spawnIn -= dt;
        if (spawnIn <= 0) {
            spawn();
            spawnIn = lerp(L.gap, progress()) * (0.7 + Math.random() * 0.6);   /* faster and faster */
        }
        var left = Math.max(0, L.dur - rt);
        fill.style.transform = 'scaleX(' + (left / L.dur) + ')';
        fill.classList.toggle('low', left < 4);
        timeEl.textContent = Math.ceil(left) + 's';
        if (left <= 0) {
            if (round >= L.rounds) { finish(true); return; }
            round++;
            rt = 0;
            phase = 'break';
            wait = 1.6;
            holes.forEach(function (o) { o.kind = null; o.el.classList.remove('up'); o.cool = 0; });
            showRound();
            showBanner('Round ' + round, round === L.rounds ? 'Last round, fastest yet!' : 'Faster now!');
            api.sfx('point');
            spawnIn = 0.4;
        }
    });

    api.on(field, 'pointerdown', function (e) {
        var hl = e.target.closest('.wm-hole');
        if (!hl) return;
        e.preventDefault();
        whack(+hl.dataset.i);
    });
    api.on(document, 'keydown', function (e) {
        var k = /^Numpad(\d)$/.exec(e.code), d = k ? k[1] : e.key.toLowerCase();
        if (e.repeat || !(d in KEYS) || e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        whack(KEYS[d]);
    });

    showRound();
    showBanner('Ready?');
    timeEl.textContent = L.dur + 's';
    api.score(0);
    api.say(N === 4 ? 'Big lawn! Mice only, let the ' + KIT + ' sleep.' : 'Tap the mice, let the ' + KIT + ' sleep!', 2200);
});
