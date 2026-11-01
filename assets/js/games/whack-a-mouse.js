/* Whack-a-Mouse: mice pop out of nine holes, tap them before they hide. A 30 second round that speeds up;
   golden mice with cheese are worth more, the cat's friend must not be tapped. Keys 1 to 9 hit holes (numpad layout). */
Arcade.register('whack-a-mouse', function (api) {
    'use strict';
    api.css(
        '.wm { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }' +
        '.wm-top { width: var(--b); display: flex; align-items: center; gap: 10px; font-weight: 700; color: #475569; font-variant-numeric: tabular-nums; }' +
        '.wm-bar { flex: 1; height: 14px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }' +
        '.wm-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #f6a23a, #fbbf24); transform-origin: left; }' +
        '.wm-fill.low { background: #d6336c; }' +
        '.wm-field { position: relative; box-sizing: border-box; width: var(--b); height: var(--b); display: grid; grid-template-columns: repeat(3, 1fr);' +
        '  gap: calc(var(--b) * .03); padding: calc(var(--b) * .04); border-radius: 28px; background: #dcfce7; box-shadow: inset 0 -6px 0 #bbf7d0; touch-action: none; }' +
        '.wm-hole { position: relative; cursor: pointer; -webkit-tap-highlight-color: transparent; }' +
        '.wm-pit { position: absolute; left: 8%; right: 8%; top: 62%; height: 26%; border-radius: 50%;' +
        '  background: radial-gradient(ellipse at 50% 35%, #1f2937, #475569); box-shadow: 0 5px 0 #a7e3bb; }' +
        '.wm-win { position: absolute; left: 12%; right: 12%; top: 0; bottom: 25%; overflow: hidden; pointer-events: none; }' +
        '.wm-who { position: absolute; inset: 0; transform: translateY(105%); transition: transform .12s ease-in; }' +
        '.wm-hole.up .wm-who { transform: none; transition: transform .2s cubic-bezier(.3, 1.6, .5, 1); }' +
        '.wm-who > * { transform-origin: 50% 100%; }' +
        '.wm-who svg { display: block; width: 100%; height: 100%; }' +
        '.wm-who .cat { position: absolute; left: 0; top: 0; width: 100%; height: 100%; cursor: inherit; }' +
        '.wm-hole.hit .wm-who > * { animation: wm-bonk .28s ease-out; }' +
        '.wm-hole.miss .wm-pit { animation: wm-shake .2s; }' +
        '.wm-key { position: absolute; left: 4%; top: 2%; font-size: calc(var(--b) * .035); font-weight: 700; color: #86c59c; }' +
        '.wm .b { fill: #cbd5e1; stroke: #334155; stroke-width: 2.2; }' +
        '.wm .e { fill: #fbcfe8; } .wm .k { fill: #0f172a; } .wm .n { fill: #d6336c; }' +
        '.wm .w { stroke: #475569; stroke-width: 1.4; stroke-linecap: round; }' +
        '.wm .x { fill: none; stroke: #0f172a; stroke-width: 3; stroke-linecap: round; }' +
        '.wm .wm-ex, .wm-hole.hit .wm-eo { display: none; } .wm-hole.hit .wm-ex { display: inline; }' +
        '.wm-gold .b { fill: #fcd34d; stroke: #b45309; } .wm-gold .e { fill: #fde68a; }' +
        '.wm .c { fill: #fde047; stroke: #ca8a04; stroke-width: 2; } .wm .h { fill: #eab308; }' +
        '.wm .s { fill: #fff7c2; stroke: #f59e0b; stroke-width: 1.2; transform-box: fill-box; transform-origin: center; animation: wm-tw .45s infinite alternate; }' +
        '.wm-burst { position: absolute; left: 30%; top: 22%; width: 40%; aspect-ratio: 1; box-sizing: border-box; border-radius: 50%;' +
        '  border: 4px solid #f6a23a; pointer-events: none; animation: wm-burst .4s ease-out forwards; }' +
        '.wm-float { position: absolute; left: 0; right: 0; top: 4%; text-align: center; font-weight: 800; font-size: calc(var(--b) * .07);' +
        '  color: #1e3a8a; pointer-events: none; text-shadow: 0 2px 0 #fff; animation: wm-up .7s ease-out forwards; }' +
        '.wm-float.bad { color: #d6336c; } .wm-float.gold { color: #b45309; }' +
        '.wm-banner { position: absolute; inset: 0; display: grid; place-items: center; font-size: calc(var(--b) * .12); font-weight: 800;' +
        '  color: #1e3a8a; text-shadow: 0 3px 0 #fff; pointer-events: none; }' +
        '.wm-calm *, .wm-calm .wm-hole .wm-who { animation: none !important; transition: none !important; }' +
        '@keyframes wm-bonk { 0% { transform: none; } 30% { transform: scale(1.18, .72); } 100% { transform: none; } }' +
        '@keyframes wm-shake { 0%, 100% { transform: none; } 33% { transform: translateX(-4px); } 66% { transform: translateX(4px); } }' +
        '@keyframes wm-burst { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }' +
        '@keyframes wm-up { from { transform: none; opacity: 1; } to { transform: translateY(-60%); opacity: 0; } }' +
        '@keyframes wm-tw { from { transform: scale(.6) rotate(0); } to { transform: scale(1.1) rotate(20deg); } }');

    var ROUND = 30;                                   /* seconds */
    var POINTS = { mouse: 1, gold: 5, cat: -3 };
    /* keys 7 8 9 are the top row, like a numpad: key -> hole index */
    var KEYS = { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 };
    var MOUSE =
        '<path class="b" d="M20 100C20 74 80 74 80 100z"/>' +
        '<circle class="b" cx="25" cy="30" r="16"/><circle class="e" cx="25" cy="30" r="9"/>' +
        '<circle class="b" cx="75" cy="30" r="16"/><circle class="e" cx="75" cy="30" r="9"/>' +
        '<ellipse class="b" cx="50" cy="56" rx="27" ry="25"/>' +
        '<g class="wm-eo"><circle class="k" cx="40" cy="52" r="4.2"/><circle class="k" cx="60" cy="52" r="4.2"/>' +
        '<circle fill="#fff" cx="41.5" cy="50.5" r="1.4"/><circle fill="#fff" cx="61.5" cy="50.5" r="1.4"/></g>' +
        '<path class="wm-ex x" d="M36 48l8 8M44 48l-8 8M56 48l8 8M64 48l-8 8"/>' +
        '<ellipse class="n" cx="50" cy="65" rx="4.5" ry="3.5"/>' +
        '<path class="w" d="M38 66l-18-4M38 70l-18 3M62 66l18-4M62 70l18 3"/>';
    var CHEESE = '<path class="c" d="M26 99l46-14v15H26z"/><circle class="h" cx="44" cy="95" r="2.5"/><circle class="h" cx="60" cy="92" r="2"/>' +
        '<path class="s" d="M90 8l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>';
    function svg(inner) { return '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' + inner + '</svg>'; }

    var wrap = document.createElement('div');
    wrap.className = 'wm' + (api.reducedMotion ? ' wm-calm' : '');
    wrap.innerHTML = '<div class="wm-top"><div class="wm-bar"><div class="wm-fill"></div></div><span class="wm-time"></span></div>' +
        '<div class="wm-field"><div class="wm-banner"></div></div>';
    api.el.appendChild(wrap);
    var field = wrap.querySelector('.wm-field'), fill = wrap.querySelector('.wm-fill');
    var timeEl = wrap.querySelector('.wm-time'), banner = wrap.querySelector('.wm-banner');
    var catArt = document.querySelector('.arcade .mascot svg');
    var holes = [];
    for (var i = 0; i < 9; i++) {
        var h = document.createElement('div');
        h.className = 'wm-hole';
        h.dataset.i = i;
        h.innerHTML = '<div class="wm-pit"></div><div class="wm-win"><div class="wm-who"></div></div>' +
            (api.touch ? '' : '<span class="wm-key">' + [7, 8, 9, 4, 5, 6, 1, 2, 3][i] + '</span>');
        field.insertBefore(h, banner);
        /* kind: null, 'mouse', 'gold' or 'cat'; left: seconds until it hides; cool: seconds before the hole is used again */
        holes.push({ el: h, who: h.querySelector('.wm-who'), kind: null, hit: false, left: 0, cool: 0 });
    }
    function fit(s) { wrap.style.setProperty('--b', Math.max(180, Math.min(560, s.w - 32, s.h - 150)) + 'px'); }
    fit(api.size());
    api.onResize(fit);

    var phase = 'ready', ready = 1.6, t = 0, spawnIn = 0.3, score = 0, caught = 0, run = 0, lastSay = -9;

    function chat(text, mood) {                       /* the cat comments at most every few seconds */
        if (mood) api.cat(mood);
        if (t - lastSay < 4) return;
        lastSay = t;
        api.say(text, 1600);
    }
    function spawn() {
        var p = t / ROUND, free = [], up = 0;
        holes.forEach(function (o, k) { if (o.kind) up++; else if (o.cool <= 0) free.push(k); });
        if (!free.length || up >= (p < 0.35 ? 2 : 3)) return;
        var o = holes[free[Math.floor(Math.random() * free.length)]];
        var r = Math.random(), stay = 1.15 - 0.55 * p;
        o.kind = t > 3 && r < 0.12 ? 'cat' : t > 5 && r < 0.2 ? 'gold' : 'mouse';
        o.hit = false;
        o.left = o.kind === 'gold' ? stay * 0.75 : o.kind === 'cat' ? stay * 1.1 : stay;
        o.who.className = 'wm-who' + (o.kind === 'gold' ? ' wm-gold' : '');
        if (o.kind === 'cat') {
            o.who.innerHTML = '';
            var c = document.createElement('div');
            c.className = 'cat happy';
            if (catArt) {
                var art = catArt.cloneNode(true);
                art.setAttribute('viewBox', '34 0 64 64');      /* head and chest: the rest stays in the hole */
                art.setAttribute('preserveAspectRatio', 'xMidYMax meet');
                c.appendChild(art);
            } else c.innerHTML = svg('<text x="50" y="80" font-size="60" text-anchor="middle">🐱</text>');
            o.who.appendChild(c);
        } else {
            o.who.innerHTML = svg(MOUSE + (o.kind === 'gold' ? CHEESE : ''));
        }
        o.el.classList.remove('hit');
        void o.el.offsetWidth;                        /* restart the pop transition */
        o.el.classList.add('up');
    }
    function hide(o) {
        o.el.classList.remove('up');
        o.kind = null;
        o.cool = 0.25;
    }
    function effect(o, cls, text) {
        var f = document.createElement('div');
        f.className = 'wm-float ' + cls;
        f.textContent = text;
        o.el.appendChild(f);
        var b = document.createElement('div');
        b.className = 'wm-burst';
        if (cls === 'bad') b.style.borderColor = '#d6336c';
        o.el.appendChild(b);
        api.timeout(function () { f.remove(); b.remove(); }, 720);
    }
    function whack(k) {
        var o = holes[k];
        if (phase !== 'play') return;
        if (!o.kind || o.hit) {                       /* an empty hole: a little wobble, and the run of hits ends */
            run = 0;
            o.el.classList.remove('miss');
            void o.el.offsetWidth;
            o.el.classList.add('miss');
            return;
        }
        o.hit = true;
        o.left = Math.min(o.left, 0.3);               /* stays a moment to show the bonk, then hides */
        o.el.classList.add('hit');
        var pts = POINTS[o.kind];
        score = Math.max(0, score + pts);
        api.score(score);
        if (o.kind === 'cat') {
            run = 0;
            api.sfx('hit');
            effect(o, 'bad', String(pts));
            o.who.firstChild.classList.remove('happy');
            chat(['Hey! I am on your side!', 'Ouch! Mice only.', 'Not me!'][Math.floor(Math.random() * 3)], 'wow');
        } else {
            caught++;
            run++;
            api.sfx(o.kind === 'gold' ? 'point' : 'pop');
            effect(o, o.kind === 'gold' ? 'gold' : '', '+' + pts);
            if (o.kind === 'gold') chat('Golden cheese!', 'wow');
            else if (run % 8 === 0) chat(['Purrfect!', 'What a paw!', 'Keep going!'][run / 8 % 3], 'happy');
        }
    }
    function finish() {
        phase = 'over';
        holes.forEach(hide);
        fill.style.transform = 'scaleX(0)';
        timeEl.textContent = '0s';
        api.end({ score: score, win: score > 0,
            text: 'Time up!\n' + caught + (caught === 1 ? ' mouse' : ' mice') + ' caught, ' + score + (score === 1 ? ' point' : ' points') });
    }

    api.loop(function (dt) {
        if (phase === 'ready') {
            ready -= dt;
            banner.textContent = ready > 0.5 ? 'Ready?' : 'Go!';
            if (ready <= 0) { phase = 'play'; banner.textContent = ''; }
            return;
        }
        if (phase !== 'play') return;
        t += dt;
        holes.forEach(function (o) {
            if (o.kind) { o.left -= dt; if (o.left <= 0) hide(o); } else if (o.cool > 0) o.cool -= dt;
        });
        spawnIn -= dt;
        if (spawnIn <= 0) {
            spawn();
            spawnIn = (0.95 - 0.55 * t / ROUND) * (0.7 + Math.random() * 0.6);   /* faster and faster */
        }
        var left = Math.max(0, ROUND - t);
        fill.style.transform = 'scaleX(' + (left / ROUND) + ')';
        fill.classList.toggle('low', left < 5);
        timeEl.textContent = Math.ceil(left) + 's';
        if (left <= 0) finish();
    });

    api.on(field, 'pointerdown', function (e) {
        var h = e.target.closest('.wm-hole');
        if (!h) return;
        e.preventDefault();
        whack(+h.dataset.i);
    });
    api.on(document, 'keydown', function (e) {
        var k = /^Numpad(\d)$/.exec(e.code), d = k ? k[1] : e.key;
        if (e.repeat || !(d in KEYS) || e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        whack(KEYS[d]);
    });

    timeEl.textContent = ROUND + 's';
    api.score(0);
    api.say('Tap the mice, not my friend!', 2000);
});
