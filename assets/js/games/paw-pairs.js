/* Paw Pairs: flip two cards at a time, matching pairs stay open. Score = moves (one move per pair of flips),
   best = fewest moves. Shell API: assets/js/games/arcade.js. */
Arcade.register('paw-pairs', function (api) {
    'use strict';
    api.css(
        '.pp { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }' +
        '.pp-info { font-weight: 700; color: #475569; }' +
        '.pp-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(var(--s) / 36); width: var(--s); height: var(--s); perspective: 900px; }' +
        '.pp-card { position: relative; padding: 0; border: none; border-radius: 14px; background: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }' +
        '.pp-card:focus-visible { outline: 3px solid #f6a23a; outline-offset: 2px; }' +
        '.pp-in { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform .38s cubic-bezier(.3, 1.35, .5, 1); }' +
        '.pp-card.open .pp-in { transform: rotateY(180deg); }' +
        '.pp-side { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 14px; line-height: 1;' +
        '  backface-visibility: hidden; -webkit-backface-visibility: hidden; }' +
        '.pp-back { background: radial-gradient(circle at 30% 25%, #3b5bdb, #1e3a8a 70%); box-shadow: 0 4px 0 #172554; font-size: calc(var(--s) / 11); }' +
        '.pp-back span { filter: grayscale(1) brightness(3); opacity: .3; }' +
        '.pp-card:hover:not(.open) .pp-back { background: radial-gradient(circle at 30% 25%, #4c6ef5, #1e3a8a 70%); }' +
        '.pp-face { background: #fff; box-shadow: 0 4px 0 #e2e8f0; transform: rotateY(180deg); font-size: calc(var(--s) / 7.5); }' +
        '.pp-card.ok .pp-face { background: #fef3c7; box-shadow: 0 4px 0 #fcd34d; }' +
        '.pp-card.ok .pp-face span { animation: pp-pop .45s ease-out .2s; }' +
        '.pp-card.bad .pp-face { background: #ffe4ec; box-shadow: 0 4px 0 #fbcfe8; }' +
        '.pp-still .pp-in { transition: none; }' +
        '.pp-still .pp-card.ok .pp-face span { animation: none; }' +
        '@keyframes pp-pop { 50% { transform: scale(1.3) rotate(-8deg); } }');

    var FACES = ['🐱', '🐟', '🧶', '🐦', '🐭', '🥛', '🦋', '📦'];   /* cat, fish, yarn, bird, mouse, milk, butterfly, box (the paw is the card back) */
    var COLS = 4, PAIRS = FACES.length;
    var wrap = document.createElement('div');
    wrap.className = 'pp' + (api.reducedMotion ? ' pp-still' : '');
    wrap.innerHTML = '<div class="pp-info"></div><div class="pp-board" role="group" aria-label="Cards"></div>';
    api.el.appendChild(wrap);
    var board = wrap.querySelector('.pp-board'), info = wrap.querySelector('.pp-info');

    /* shuffled deck (Fisher-Yates), one button per card with a back and a face side */
    var deck = FACES.concat(FACES);
    for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = deck[i];
        deck[i] = deck[j]; deck[j] = t;
    }
    var cards = deck.map(function (face, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pp-card';
        b.dataset.i = k;
        b.setAttribute('aria-label', 'Card ' + (k + 1));
        b.innerHTML = '<div class="pp-in"><div class="pp-side pp-back"><span>🐾</span></div>' +
            '<div class="pp-side pp-face"><span>' + face + '</span></div></div>';
        board.appendChild(b);
        return { face: face, el: b, open: false };
    });

    var open = [], found = 0, moves = 0, combo = 0, closeTimer = null, done = false;

    /* the board is square; when it spans the width, keep the mascot corner below it free */
    function fit(s) {
        var size = Math.min(560, s.w - 24, s.h - 60);
        if ((s.w - size) / 2 < 100) size = Math.min(size, s.h - 200);
        wrap.style.setProperty('--s', Math.max(150, size) + 'px');
    }
    fit(api.size());
    api.onResize(fit);

    function show() {
        api.score(moves, 'Moves');
        info.textContent = 'Pairs ' + found + ' / ' + PAIRS;
    }
    function setOpen(c, on) {
        c.open = on;
        c.el.classList.toggle('open', on);
        c.el.setAttribute('aria-label', on ? c.face : 'Card ' + (+c.el.dataset.i + 1));
    }
    function closeMiss() {
        clearTimeout(closeTimer);
        open.forEach(function (k) { setOpen(cards[k], false); cards[k].el.classList.remove('bad'); });
        open = [];
    }
    function flip(k) {
        var c = cards[k];
        if (done || c.open) return;
        if (open.length === 2) closeMiss();          /* a third tap hides a missed pair at once */
        setOpen(c, true);
        open.push(k);
        api.sfx('tap');
        if (open.length < 2) return;
        moves++;
        var a = cards[open[0]], b = cards[open[1]];
        if (a.face === b.face) {
            a.el.classList.add('ok');
            b.el.classList.add('ok');
            open = [];
            found++;
            combo++;
            show();
            api.sfx('point');
            if (found === PAIRS) return win();
            if (combo === 2 || combo === 4) { api.cat('happy'); api.say(combo === 2 ? 'Purrfect!' : 'On a roll!', 1400); }
            else if (found === PAIRS / 2 && combo < 2) api.say('Halfway there!', 1400);
        } else {
            combo = 0;
            a.el.classList.add('bad');
            b.el.classList.add('bad');
            show();
            closeTimer = api.timeout(closeMiss, 900);
        }
    }
    function win() {
        done = true;
        var text = moves <= 12 ? 'What a memory!' : moves <= 20 ? 'All pairs found!' : 'Got them all!';
        api.end({ score: moves, win: true, lowerIsBetter: true, text: text + '\n' + moves + ' moves' });
    }

    api.on(board, 'click', function (e) {
        var c = e.target.closest('.pp-card');
        if (c) flip(+c.dataset.i);
    });
    /* arrow keys move the focus between cards, Enter or Space flips (native button) */
    api.on(board, 'keydown', function (e) {
        var c = e.target.closest('.pp-card');
        var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS }[e.key];
        if (!c || !d) return;
        e.preventDefault();
        var k = +c.dataset.i + d;
        if (k >= 0 && k < cards.length) cards[k].el.focus();
    });
    show();
});
