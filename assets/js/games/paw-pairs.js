/* Paw Pairs: flip two cards at a time, matching pairs stay open. Easy 12 cards, normal 16, hard 30, with a move
   limit for each. Matches in a row build a combo (100 points times the combo, up to x5); moves left at the end are a
   bonus. Specials: the cat-eye pair reveals every card for a moment; on hard two zoomies kittens hide among the
   cards and shuffle the face-down ones when flipped. Score = points. Shell API: assets/js/games/arcade.js. */
Arcade.register('paw-pairs', function (api) {
    'use strict';
    api.css(
        '.pp { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }' +
        '.pp-hud { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; min-height: 27px; }' +
        '.pp-chip { padding: 3px 11px; border-radius: 999px; background: #fff; box-shadow: 0 2px 0 #e9dfcf; color: #475569;' +
        '  font-size: .86rem; font-weight: 700; font-variant-numeric: tabular-nums; transition: background-color .2s, color .2s; }' +
        '.pp-chip.low { background: #ffe3e3; color: #c92a2a; }' +
        '.pp-chip.combo { background: #fff1dc; color: #c2620a; }' +
        '.pp-chip.combo b { display: inline-block; animation: pp-pop .35s ease-out; }' +
        '.pp-board { position: relative; display: grid; grid-template-columns: repeat(var(--cols), var(--c)); grid-auto-rows: var(--c);' +
        '  gap: var(--g); perspective: 1000px; }' +
        '.pp-card { position: relative; padding: 0; border: none; border-radius: calc(var(--c) * .16); background: none; cursor: pointer;' +
        '  box-shadow: 0 5px 0 rgba(30, 58, 138, .16), 0 9px 16px rgba(30, 58, 138, .08); transition: box-shadow .3s;' +
        '  -webkit-tap-highlight-color: transparent; animation: pp-deal .45s cubic-bezier(.3, 1.4, .5, 1) both; }' +
        '.pp-card:focus-visible { outline: 3px solid #f6a23a; outline-offset: 3px; }' +
        '.pp-in { position: absolute; inset: 0; border-radius: inherit; transform-style: preserve-3d; transition: transform .42s cubic-bezier(.3, 1.35, .5, 1); }' +
        '.pp-card.open .pp-in, .pp-peek .pp-card .pp-in { transform: rotateY(180deg); }' +
        '.pp-side { position: absolute; inset: 0; display: grid; place-items: center; border-radius: inherit;' +
        '  backface-visibility: hidden; -webkit-backface-visibility: hidden; }' +
        '.pp-side svg { width: 78%; height: 78%; overflow: visible; }' +
        '.pp-back { background: radial-gradient(circle at 30% 22%, #c5d8fa, #8fb1ee 75%); }' +
        '.pp-back::before { content: ""; position: absolute; inset: 7%; border: 2px dashed rgba(255, 255, 255, .55); border-radius: calc(var(--c) * .11); }' +
        '.pp-back svg { width: 52%; height: 52%; fill: #fff8ec; opacity: .9; filter: drop-shadow(0 2px 0 rgba(30, 58, 138, .2)); }' +
        '@media (hover: hover) { .pp-board:not(.pp-peek) .pp-card:hover:not(.open) .pp-in { transform: translateY(-3px) rotateY(10deg); } }' +
        '.pp-face { background: var(--bg, #fff); transform: rotateY(180deg); }' +
        '.pp-face.special { background: radial-gradient(circle at 50% 40%, #fffbe6, #ffe8a3); box-shadow: 0 0 0 2px #fcd34d inset; }' +
        '.pp-face small { position: absolute; bottom: 5%; left: 0; right: 0; text-align: center; font-size: calc(var(--c) * .12); font-weight: 800;' +
        '  letter-spacing: .06em; color: #92400e; }' +
        '.pp-card.ok { box-shadow: 0 5px 0 #fcd34d, 0 0 18px rgba(250, 176, 5, .45); } .pp-card.ok .pp-face { box-shadow: 0 0 0 3px #fde68a inset; }' +
        '.pp-card.ok .pp-face svg { animation: pp-pop .5s ease-out .2s; }' +
        '.pp-card.bad .pp-in { animation: pp-shake .3s ease-in-out .3s; }' +
        '.pp-card.bad { box-shadow: 0 5px 0 #ffa8a8; } .pp-card.bad .pp-face { box-shadow: 0 0 0 3px #ffc9c9 inset; }' +
        '.pp-card.used .pp-face { background: #f1f3f5; box-shadow: none; } .pp-card.used .pp-face svg { opacity: .35; }' +
        '.pp-card.ok, .pp-card.used { cursor: default; }' +
        '.pp-zoom .pp-card:not(.open) .pp-in { animation: pp-zoom .6s ease-in-out; }' +
        '.pp-float { position: absolute; z-index: 2; transform: translate(-50%, -50%); font-weight: 800; font-size: 1.15rem; color: #c2620a;' +
        '  text-shadow: 0 2px 0 #fff, 0 0 6px #fff; pointer-events: none; white-space: nowrap; animation: pp-up .9s ease-out forwards; }' +
        '.pp-bit { position: absolute; z-index: 2; width: 8px; height: 8px; border-radius: 2px; pointer-events: none; animation: pp-bit 1s ease-out forwards; }' +
        '.pp-calm *, .pp-calm .pp-card { animation: none !important; transition: none !important; }' +
        '@keyframes pp-deal { from { transform: translateY(30px) scale(.6); opacity: 0; } }' +
        '@keyframes pp-pop { 50% { transform: scale(1.25) rotate(-8deg); } }' +
        '@keyframes pp-shake { 25% { transform: rotateY(180deg) translateX(5px); } 75% { transform: rotateY(180deg) translateX(-5px); } }' +
        '@keyframes pp-zoom { 30% { transform: translate(var(--dx), var(--dy)) rotate(var(--dr)); } 60% { transform: translate(calc(var(--dx) * -.5), calc(var(--dy) * -.5)); } }' +
        '@keyframes pp-up { to { transform: translate(-50%, -160%); opacity: 0; } }' +
        '@keyframes pp-bit { 55% { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 1; }' +
        '  100% { transform: translate(var(--x), calc(var(--y) + 70px)) rotate(var(--r)); opacity: 0; } }');

    /* a ball of wool: shaded sphere, four bands of wound strands clipped to it, a highlight and a loose thread.
       {id} becomes a number unique to each card, so the gradient and clip ids of several balls do not clash */
    function yarnBall() {
        var bands = [[-25, -9, '#ffdeeb'], [40, -4, '#c2255c'], [100, -10, '#fcc2d7'], [160, -2, '#d6336c']];   /* tilt, offset, strand colour */
        var svg = '<g transform="translate(-2.5 -2.5) scale(1.1)"><defs><radialGradient id="ppyg{id}" cx=".34" cy=".3" r=".78"><stop offset="0" stop-color="#ffd8e8"/>' +
            '<stop offset=".45" stop-color="#f783ac"/><stop offset="1" stop-color="#c2255c"/></radialGradient>' +
            '<clipPath id="ppyc{id}"><circle cx="28" cy="29" r="17"/></clipPath></defs>' +
            '<path d="M39 41c5 3 11 1 13 5s-3 7-6 5 1-6 5-4 4 6 6 7" stroke-width="1.8" ' + S + '"#e64980"/>' +
            '<circle cx="28" cy="29" r="17" fill="url(#ppyg{id})"/><g clip-path="url(#ppyc{id})" fill="none" stroke-width="1" stroke-linecap="round">';
        bands.forEach(function (b) {
            svg += '<g transform="rotate(' + b[0] + ' 28 29)" stroke="' + b[2] + '" opacity=".8">';
            for (var k = 0; k < 5; k++) {           /* the front half of a tilted loop around the ball */
                var y = 29 + b[1] + k * 2.3;
                svg += '<path d="M6 ' + y + 'A22 ' + (8 + k * 1.2) + ' 0 0 0 50 ' + y + '"/>';
            }
            svg += '</g>';
        });
        return svg + '</g><circle cx="28" cy="29" r="17" fill="none" stroke="#a61e4d" stroke-width="1.1"/>' +
            '<ellipse cx="21.5" cy="20.5" rx="4.5" ry="2.4" transform="rotate(-38 21.5 20.5)" fill="#fff" opacity=".55"/></g>';
    }

    /* card faces drawn in a 60 x 60 box: [name, card colour, svg] */
    var S = 'stroke-linecap="round" fill="none" stroke=';
    var FACES = [
        ['cat', '#fff4e6', '<path d="M13 22l2-15 12 9zM47 22l-2-15-12 9z" fill="#f59f3a"/><path d="M16 18l1-7 6 5zM44 18l-1-7-6 5z" fill="#ffc9a8"/>' +
            '<ellipse cx="30" cy="33" rx="19" ry="16" fill="#f59f3a"/><path d="M30 18v5M25 19l1.5 4.5M35 19l-1.5 4.5" stroke-width="2.2" ' + S + '"#d9771a"/>' +
            '<ellipse cx="23" cy="31" rx="2.6" ry="3.4" fill="#2b2b2b"/><ellipse cx="37" cy="31" rx="2.6" ry="3.4" fill="#2b2b2b"/>' +
            '<path d="M28 37h4l-2 2.5z" fill="#e8590c"/><path d="M30 39.5q-2 3-5 1.5M30 39.5q2 3 5 1.5M8 34l9 1M8 39l9-1M52 34l-9 1M52 39l-9-1" stroke-width="1.4" ' + S + '"#7a3e10"/>'],
        ['fish', '#e7f0ff', '<path d="M7 30c7-11 22-14 33-6l10-8v28l-10-8c-11 8-26 5-33-6z" fill="#5c7cfa"/>' +
            '<path d="M27 21q5 9 0 18M33 23q4 7 0 14" stroke-width="2.4" ' + S + '"#91a7ff"/><circle cx="16" cy="28" r="2.8" fill="#fff"/><circle cx="16.5" cy="28" r="1.4" fill="#1e3a8a"/>'],
        ['yarn', '#fff0f6', yarnBall()],
        ['mouse', '#f1f3f5', '<path d="M8 42c0-12 10-20 22-20 9 0 16 7 16 15 0 3-2 5-5 5z" fill="#adb5bd"/>' +
            '<circle cx="21" cy="23" r="7" fill="#adb5bd"/><circle cx="21" cy="23" r="4" fill="#fcc2d7"/><circle cx="16" cy="33" r="1.9" fill="#212529"/>' +
            '<circle cx="8.5" cy="40" r="2.2" fill="#f06595"/><path d="M46 38q9 0 7 8t-11 8" stroke-width="2.5" ' + S + '"#adb5bd"/>'],
        ['bird', '#fff9db', '<circle cx="31" cy="32" r="16" fill="#ffd43b"/><path d="M30 16q-2-6 3-9q-1 5 2 9" fill="#fab005"/>' +
            '<ellipse cx="37" cy="36" rx="8" ry="5.5" fill="#fcc419"/><circle cx="25" cy="28" r="2.4" fill="#212529"/><path d="M16 30l-8 3 8 3z" fill="#f76707"/>' +
            '<path d="M27 48v5M35 48v5" stroke-width="2.2" ' + S + '"#f76707"/>'],
        ['milk', '#e7f5ff', '<path d="M8 32h44c0 12-10 19-22 19S8 44 8 32z" fill="#74c0fc"/><ellipse cx="30" cy="32" rx="22" ry="5" fill="#fff" stroke="#4dabf7" stroke-width="2"/>' +
            '<path d="M21 45h18" stroke-width="2.5" ' + S + '"#a5d8ff"/><path d="M30 9c3 5 5 8 5 11a5 5 0 0 1-10 0c0-3 2-6 5-11z" fill="#fff" stroke="#74c0fc" stroke-width="1.6"/>'],
        ['butterfly', '#f3f0ff', '<path d="M30 30C20 12 6 14 8 26c1 6 10 8 22 4zM30 30C40 12 54 14 52 26c-1 6-10 8-22 4z" fill="#b197fc"/>' +
            '<path d="M30 31C22 40 12 46 14 50c3 4 12-2 16-12zM30 31C38 40 48 46 46 50c-3 4-12-2-16-12z" fill="#e599f7"/>' +
            '<rect x="28.5" y="20" width="3" height="24" rx="1.5" fill="#5f3dc4"/><path d="M29 21q-3-8-7-9M31 21q3-8 7-9" stroke-width="1.6" ' + S + '"#5f3dc4"/>'],
        ['box', '#fff4e6', '<path d="M10 26l-5-9h20l5 9zM50 26l5-9H35l-5 9z" fill="#c98b4b"/><path d="M20 27l4-10 6 8zM40 27l-4-10-6 8z" fill="#495057"/>' +
            '<path d="M10 26h40v24H10z" fill="#e0a96d"/><path d="M10 26h40" stroke="#b07636" stroke-width="2"/><path d="M24 37h12" stroke-width="2.5" ' + S + '"#b07636"/>'],
        ['bone', '#f8f9fa', '<path d="M14 30h30" stroke-width="3.2" ' + S + '"#868e96"/><path d="M22 21v18M29 20v20M36 21v18" stroke-width="2.6" ' + S + '"#868e96"/>' +
            '<circle cx="12" cy="30" r="7" fill="#ced4da"/><path d="M43 30l10-8v16z" fill="#ced4da"/><circle cx="10.5" cy="28.5" r="1.7" fill="#495057"/>'],
        ['bell', '#fff9db', '<circle cx="30" cy="13" r="4.5" fill="none" stroke="#f08c00" stroke-width="2.5"/><circle cx="30" cy="34" r="16" fill="#fcc419"/>' +
            '<path d="M14 32h32" stroke="#f08c00" stroke-width="2.5"/><circle cx="30" cy="41" r="3" fill="#e67700"/><path d="M30 44v5" stroke-width="2.5" ' + S + '"#e67700"/>' +
            '<path d="M21 26q3-4 7-5" stroke-width="2.5" ' + S + '"#fff3bf"/>'],
        ['feather', '#e6fcf5', '<path d="M12 52L40 19" stroke-width="2.6" ' + S + '"#a47148"/><path d="M40 19c2-9 10-12 14-10 1 6-3 13-12 14z" fill="#20c997"/>' +
            '<path d="M39 23c-8-1-13 5-13 10 6 1 12-3 13-10z" fill="#63e6be"/><path d="M41 20l11-10" stroke="#087f5b" stroke-width="1.2"/>'],
        ['catnip', '#ebfbee', '<path d="M30 53V30" stroke-width="2.6" ' + S + '"#2f9e44"/><path d="M30 33C18 33 12 23 14 12c10 0 17 8 16 21z" fill="#51cf66"/>' +
            '<path d="M30 30c2-11 10-17 18-15 1 10-7 17-18 15z" fill="#8ce99a"/><path d="M30 33L18 16M30 30l15-12" stroke-width="1.3" ' + S + '"#2b8a3e"/>'],
        ['laser', '#fff5f5', '<circle cx="35" cy="28" r="15" fill="#ffc9c9"/><circle cx="35" cy="28" r="8.5" fill="#ff8787"/><circle cx="35" cy="28" r="4" fill="#f03e3e"/>' +
            '<path d="M6 55l22-20" stroke-width="2.2" stroke-dasharray="3 4" ' + S + '"#ff6b6b"/>']
    ];
    var PEEK = ['peek', '', '<path d="M5 28Q30 6 55 28Q30 50 5 28z" fill="#fff" stroke="#1e3a8a" stroke-width="2.5"/><circle cx="30" cy="28" r="11" fill="#94d82d"/>' +
        '<ellipse cx="30" cy="28" rx="3" ry="9" fill="#212529"/><circle cx="34" cy="23" r="2.2" fill="#fff"/>', 'PEEK'];
    var ZOOM = ['zoom', '', '<path d="M35 3L17 31h12l-4 19 20-29H33z" fill="#7950f2"/><path d="M5 18h9M3 28h9M5 38h9" stroke-width="2.6" ' + S + '"#b197fc"/>', 'ZOOM'];
    var PAW = '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="26" rx="8" ry="6.8"/><circle cx="10.5" cy="17.5" r="3.4"/><circle cx="16.3" cy="11" r="3.4"/>' +
        '<circle cx="23.7" cy="11" r="3.4"/><circle cx="29.5" cy="17.5" r="3.4"/></svg>';

    var level = api.level();
    var CFG = {                                   /* plain pairs, zoomies cards, move limit, peek time (ms), board layouts [cols, rows] */
        easy: { pairs: 5, zoom: 0, limit: 18, peek: 2000, layouts: [[4, 3], [3, 4]] },
        normal: { pairs: 7, zoom: 0, limit: 26, peek: 1500, layouts: [[4, 4]] },
        hard: { pairs: 13, zoom: 2, limit: 48, peek: 1100, layouts: [[6, 5], [5, 6]] }
    }[level];
    var PAIRS = CFG.pairs + 1;                    /* the cat-eye pair counts too */

    var wrap = document.createElement('div');
    wrap.className = 'pp' + (api.reducedMotion ? ' pp-calm' : '');
    wrap.innerHTML = '<div class="pp-hud"></div><div class="pp-board" role="group" aria-label="Cards"></div>';
    api.el.appendChild(wrap);
    var board = wrap.querySelector('.pp-board'), hud = wrap.querySelector('.pp-hud');

    /* shuffled deck (Fisher-Yates): random plain faces, the cat-eye pair, the zoomies */
    function shuffle(a) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1)), t = a[i];
            a[i] = a[j]; a[j] = t;
        }
        return a;
    }
    var faces = shuffle(FACES.slice()).slice(0, CFG.pairs).concat([PEEK]);
    var deck = faces.concat(faces);
    for (var z = 0; z < CFG.zoom; z++) deck.push(ZOOM);
    shuffle(deck);
    var uid = 0;
    function faceHtml(f) {
        uid++;
        return '<div class="pp-side pp-face' + (f[3] ? ' special' : '') + '" style="--bg:' + f[1] + '"><svg viewBox="0 0 60 60">' +
            f[2].replace(/\{id\}/g, uid) + '</svg>' +
            (f[3] ? '<small>' + f[3] + '</small>' : '') + '</div>';
    }
    var cards = deck.map(function (f, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pp-card';
        b.dataset.i = k;
        b.setAttribute('aria-label', 'Card ' + (k + 1));
        b.style.animationDelay = (k * 0.025) + 's';
        b.innerHTML = '<div class="pp-in"><div class="pp-side pp-back">' + PAW + '</div>' + faceHtml(f) + '</div>';
        board.appendChild(b);
        return { f: f, el: b, open: false, done: false };
    });

    var open = [], found = 0, moves = 0, combo = 0, points = 0, closeTimer = null, done = false, busy = false, cols = 4;

    /* pick the layout that gives the biggest cards; when the board spans the width, keep the mascot corner free */
    function fit(s) {
        var best = null;
        CFG.layouts.forEach(function (l) {
            var c = Math.min((s.w - 24) / (l[0] + (l[0] - 1) * 0.1), (s.h - 70) / (l[1] + (l[1] - 1) * 0.1), 150);
            var w = c * (l[0] + (l[0] - 1) * 0.1);
            if ((s.w - w) / 2 < 100) c = Math.min(c, (s.h - 210) / (l[1] + (l[1] - 1) * 0.1));
            if (!best || c > best.c) best = { c: c, cols: l[0] };
        });
        cols = best.cols;
        var c = Math.max(40, Math.floor(best.c));
        wrap.style.setProperty('--c', c + 'px');
        wrap.style.setProperty('--g', Math.round(c * 0.1) + 'px');
        wrap.style.setProperty('--cols', cols);
    }
    fit(api.size());
    api.onResize(fit);

    function show() {
        var left = CFG.limit - moves;
        api.score(points, 'Points');
        hud.innerHTML = '<span class="pp-chip">Pairs ' + found + ' / ' + PAIRS + '</span>' +
            '<span class="pp-chip' + (left <= 5 ? ' low' : '') + '">Moves left ' + left + '</span>' +
            (combo > 1 ? '<span class="pp-chip combo">Combo <b>x' + Math.min(combo, 5) + '</b></span>' : '');
    }
    function setOpen(c, on) {
        c.open = on;
        c.el.classList.toggle('open', on);
        c.el.setAttribute('aria-label', on ? c.f[0] : 'Card ' + (+c.el.dataset.i + 1));
    }
    function closeMiss() {
        clearTimeout(closeTimer);
        open.forEach(function (k) { setOpen(cards[k], false); cards[k].el.classList.remove('bad'); });
        open = [];
    }
    /* little effects around a card: a floating text and a burst of bits */
    function burst(el, text, n, big) {
        if (api.reducedMotion && !text) return;
        var r = el.getBoundingClientRect(), o = wrap.getBoundingClientRect(), x = r.left - o.left + r.width / 2, y = r.top - o.top + r.height / 2;
        if (text) {
            var t = document.createElement('div');
            t.className = 'pp-float';
            t.textContent = text;
            t.style.left = x + 'px';
            t.style.top = y + 'px';
            wrap.appendChild(t);
            api.timeout(t.remove.bind(t), 950);
        }
        if (api.reducedMotion) return;
        var colors = ['#f6a23a', '#ffd43b', '#5c7cfa', '#f783ac', '#69db7c'];
        for (var k = 0; k < n; k++) {
            var p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = (big ? 80 : 25) + Math.random() * (big ? 160 : 45);
            p.className = 'pp-bit';
            p.style.cssText = 'left:' + x + 'px; top:' + y + 'px; background:' + colors[k % colors.length] + '; --x:' + Math.round(Math.cos(a) * d) +
                'px; --y:' + Math.round(Math.sin(a) * d - (big ? 70 : 20)) + 'px; --r:' + Math.round(Math.random() * 540) + 'deg';
            wrap.appendChild(p);
            api.timeout(p.remove.bind(p), 1050);
        }
    }
    /* the cat-eye pair: every card face up for a moment */
    function peek() {
        busy = true;
        api.say('Cat eyes! Look closely…', CFG.peek);
        api.timeout(function () {
            board.classList.add('pp-peek');
            api.sfx('pop');
            api.timeout(function () { board.classList.remove('pp-peek'); busy = false; }, CFG.peek);
        }, 450);
    }
    /* zoomies: the face-down cards swap places */
    function zoomies() {
        var hidden = cards.filter(function (c) { return !c.open && !c.done; });
        var fs = shuffle(hidden.map(function (c) { return c.f; }));
        hidden.forEach(function (c, n) {
            c.f = fs[n];
            c.el.querySelector('.pp-face').outerHTML = faceHtml(c.f);
            c.el.style.setProperty('--dx', Math.round(Math.random() * 30 - 15) + 'px');
            c.el.style.setProperty('--dy', Math.round(Math.random() * 30 - 15) + 'px');
            c.el.style.setProperty('--dr', Math.round(Math.random() * 40 - 20) + 'deg');
        });
        board.classList.remove('pp-zoom');
        void board.offsetWidth;
        board.classList.add('pp-zoom');
        api.timeout(function () { board.classList.remove('pp-zoom'); }, 700);
    }
    function outOfMoves() {
        if (done || moves < CFG.limit) return false;
        done = true;
        api.say('Out of moves!', 1600);
        api.end({ score: points, win: false, text: 'Out of moves.\n' + found + ' of ' + PAIRS + ' pairs, ' + points + ' points' });
        return true;
    }
    function flip(k) {
        var c = cards[k];
        if (done || busy || c.open || c.done) return;
        if (open.length === 2) closeMiss();          /* a third tap hides a missed pair at once */
        setOpen(c, true);
        api.sfx('tap');
        if (c.f === ZOOM) {                          /* a zoomies kitten: costs a move, breaks the combo, shuffles */
            c.done = true;
            c.el.classList.add('used');
            moves++;
            combo = 0;
            busy = true;
            show();
            api.sfx('hit');
            api.cat('wow');
            api.say('Zoomies! The cards are running around.', 1800);
            closeTimer = api.timeout(function () {
                closeMiss();
                zoomies();
                busy = false;
                outOfMoves();
            }, 800);
            return;
        }
        open.push(k);
        if (open.length < 2) return;
        moves++;
        var a = cards[open[0]], b = cards[open[1]];
        if (a.f === b.f) {
            a.done = b.done = true;
            a.el.classList.add('ok');
            b.el.classList.add('ok');
            open = [];
            found++;
            combo++;
            var gain = 100 * Math.min(combo, 5);
            points += gain;
            show();
            api.sfx(combo > 1 ? 'pop' : 'point');
            burst(b.el, '+' + gain + (combo > 1 ? ' x' + Math.min(combo, 5) : ''), 10);
            if (found === PAIRS) return win();
            if (a.f === PEEK) peek();
            else if (combo === 3 || combo === 5) { api.cat('happy'); api.say(combo === 3 ? 'Purrfect!' : 'On a roll!', 1400); }
            else if (found === Math.ceil(PAIRS / 2) && combo < 2) api.say('Halfway there!', 1400);
            outOfMoves();
        } else {
            combo = 0;
            a.el.classList.add('bad');
            b.el.classList.add('bad');
            show();
            if (!outOfMoves()) closeTimer = api.timeout(closeMiss, 950);
        }
    }
    function win() {
        done = true;
        var left = CFG.limit - moves, bonus = left * 20;
        points += bonus;
        show();
        burst(board, '', 60, true);
        var text = left >= CFG.limit / 2 ? 'What a memory!' : left >= CFG.limit / 4 ? 'All pairs found!' : 'Phew, just in time!';
        api.end({ score: points, win: true, text: text + '\n' + moves + ' moves, ' + left + ' left (+' + bonus + ')\n' + points + ' points' });
    }

    api.on(board, 'click', function (e) {
        var c = e.target.closest('.pp-card');
        if (c) flip(+c.dataset.i);
    });
    /* arrow keys move the focus between cards, Enter or Space flips (native button) */
    api.on(board, 'keydown', function (e) {
        var c = e.target.closest('.pp-card');
        var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
        if (!c || !d) return;
        e.preventDefault();
        var k = +c.dataset.i + d;
        if (k >= 0 && k < cards.length) cards[k].el.focus();
    });
    if (level === 'hard') api.say('Watch out for the zoomies kittens!', 2200);
    show();
});
