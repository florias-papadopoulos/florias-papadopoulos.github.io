/* Crypto Heist, part 10: the symmetric rooms (see README.md and the header of 00-core.js for the room kit ctx).
     Pad Lock (one-time pad): flip the key bits so that the locked byte XOR the key reads a wanted letter. Any letter
       can come out for some key, which is why a one-time pad hides everything (perfect secrecy).
     Lazy Pad (two-time pad): two notes locked with the same pad. XORing the two locked notes cancels the pad; slide a
       guessed word along it until the other note shows a real word.
     Penguin Leak (ECB mode): a pixel picture locked with a toy block cipher in ECB, CBC and CTR. Equal blocks give
       equal locked blocks in ECB, so the picture still shows; the player spots the leak (and, on Normal and Hard, names
       the secret picture). */
(function () {
    'use strict';

    /* a room's own styles, put inside its area (which is emptied when the room ends) */
    function style(ctx, text) { var s = document.createElement('style'); s.textContent = text; ctx.el.appendChild(s); }
    function label(ctx, text) { return ctx.h('div', 'chs-lab', text); }
    var BASE_CSS =
        '.chs-lab { font: 700 .72rem/1.2 system-ui, sans-serif; color: #7a7393; text-transform: uppercase; letter-spacing: .05em; }' +
        '.chs-big { font: 800 1.6rem/1.2 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .08em; }' +
        '.chs-center { text-align: center; }';

    /* a seeded random generator (mulberry32), so a key always gives the same toy cipher */
    function seeded(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function charOf(v) { return v >= 65 && v <= 90 ? String.fromCharCode(v) : v === 32 ? ' ' : null; }

    /* ======================= Pad Lock ======================= */
    var PAD_CSS = BASE_CSS +
        '.chs-pl { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; width: 100%; }' +
        '.chs-pl .chx-card { width: auto; display: flex; flex-direction: column; gap: 4px; align-items: center; }' +
        '.chs-pl .chx-card.done { border-color: #2f8a3a; }' +
        '.chs-bitrow { display: flex; gap: 5px; justify-content: center; }' +
        '.chs-bitrow span { width: 38px; height: 30px; display: flex; align-items: center; justify-content: center;' +
        '  font: 800 1.2rem/1 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chs-bitrow.wanted span { color: #7a7393; font-size: 1rem; height: 22px; }' +
        '.chs-pl-res { display: flex; align-items: center; gap: 10px; }' +
        '.chs-pl-letter { min-width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: 2px solid #231f3a;' +
        '  border-radius: 8px; background: #fff; font: 800 1.5rem/1 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chs-pl-letter.ok { background: #2f8a3a; border-color: #2f8a3a; color: #fff; }' +
        '.chs-pl-xor { width: 100%; border-top: 2px dashed #ddd8ee; margin: 2px 0; }' +
        '.chs-goal { display: flex; gap: 6px; justify-content: center; align-items: center; }' +
        '.chs-goal b { width: 40px; height: 44px; display: flex; align-items: center; justify-content: center; border: 2px solid #231f3a;' +
        '  border-radius: 8px; background: #ffe9a8; font: 800 1.5rem/1 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chs-goal b.ok { background: #2f8a3a; border-color: #2f8a3a; color: #fff; }' +
        '@media (max-width: 420px) { .chs-bitrow span { width: 32px; } }';

    function popcount(v) { var c = 0; while (v) { c += v & 1; v >>= 1; } return c; }

    room({
        id: 'pad-lock', name: 'Pad Lock', tag: 'One-time pad', order: 10,
        time: { easy: 90, normal: 60, hard: 60 },
        build: function (ctx) {
            style(ctx, PAD_CSS);
            var WORDS = ctx.dog ? { 2: ['GO', 'UP', 'HI', 'OK', 'YO'], 3: ['DIG', 'PAW', 'SIT', 'BOW', 'RUN', 'FUR', 'WAG'] }
                : { 2: ['GO', 'UP', 'HI', 'OK', 'NO'], 3: ['NAP', 'PAW', 'FUR', 'BOX', 'MEW', 'PET', 'ZZZ'] };
            var target = ctx.easy ? 'C' : ctx.pick(WORDS[ctx.hard ? 3 : 2]);
            var lockedBytes = target.split('').map(function (ch, i) {
                if (ctx.easy) return 0xB6;   /* 10110110: the key that opens it to C is 11110101 */
                var c, t = ch.charCodeAt(0);
                do { c = ctx.ri(0, 255); } while (popcount(c ^ t) < 3);
                return c;
            });

            ctx.tip('Flip the key switches so that <b>locked XOR key</b> reads <b>' + target + '</b>. XOR rule: two equal bits give 0, two different bits give 1.');
            ctx.hint('Go column by column: where the locked bit and the wanted bit differ, switch the key bit to 1; where they are the same, leave it at 0.');

            var goal = ctx.h('div', 'chs-goal');
            goal.appendChild(label(ctx, 'Make it read'));
            var goalCells = target.split('').map(function (ch) { var b = ctx.h('b', null, ch); goal.appendChild(b); return b; });
            ctx.el.appendChild(goal);

            var wrapEl = ctx.h('div', 'chs-pl');
            ctx.el.appendChild(wrapEl);
            var rows = lockedBytes.map(function (c, i) {
                var t = target.charCodeAt(i), first = i === 0;
                var card = ctx.h('div', 'chx-card');
                function bitRow(v, cls) {
                    var r = ctx.h('div', 'chs-bitrow' + (cls ? ' ' + cls : ''));
                    ctx.bin(v, 8).split('').forEach(function (b) { r.appendChild(ctx.h('span', null, b)); });
                    return r;
                }
                card.appendChild(label(ctx, lockedBytes.length > 1 ? 'Letter ' + (i + 1) + ': locked byte' : 'Locked byte'));
                card.appendChild(bitRow(c));
                card.appendChild(label(ctx, first ? 'Your key (tap to flip)' : 'Your key'));
                var row = { t: t, c: c, card: card, done: false };
                row.sw = ctx.bits(8, { value: 0, onChange: function () { paint(); } });
                card.appendChild(row.sw.el);
                card.appendChild(ctx.h('div', 'chs-pl-xor'));
                var res = ctx.h('div', 'chs-pl-res');
                res.appendChild(label(ctx, 'Opens to'));
                row.letter = ctx.h('div', 'chs-pl-letter', '?');
                res.appendChild(row.letter);
                card.appendChild(res);
                row.out = bitRow(0);
                card.appendChild(row.out);
                card.appendChild(label(ctx, 'Wanted: ' + target[i]));
                card.appendChild(bitRow(t, 'wanted'));
                row.outSpans = row.out.children;
                wrapEl.appendChild(card);
                return row;
            });

            function paint() {
                var all = true;
                rows.forEach(function (r, i) {
                    var v = r.c ^ r.sw.get(), bits = ctx.bin(v, 8);
                    for (var k = 0; k < 8; k++) {
                        r.outSpans[k].textContent = bits[k];
                        /* Easy and Normal colour each bit against the wanted one; Hard leaves that to the player */
                        r.outSpans[k].className = ctx.hard ? '' : (bits[k] === ctx.bin(r.t, 8)[k] ? 'chx-ok' : 'chx-bad');
                    }
                    var ch = v >= 33 && v <= 126 ? String.fromCharCode(v) : '·';
                    r.letter.textContent = ch;
                    var ok = v === r.t;
                    r.letter.classList.toggle('ok', ok);
                    r.card.classList.toggle('done', ok);
                    goalCells[i].classList.toggle('ok', ok);
                    if (ok && !r.done) { r.done = true; if (rows.length > 1) ctx.sfx('pop'); }
                    if (!ok) { r.done = false; all = false; }
                });
                if (all) {
                    rows.forEach(function (r) { r.sw.lock(); });
                    ctx.say(target.length > 1 ? 'It reads ' + target + '!' : 'It reads C!', 1600);
                    ctx.solve('With a one-time pad every message is possible: for any guess there is a key that gives it, so the locked note alone tells a spy nothing. That is perfect secrecy, as long as the key is truly random, as long as the message, and never used twice.');
                }
            }
            paint();
            /* keys 1 to 8 flip the bits of the first letter that is not right yet */
            ctx.key(function (e) {
                if (!/^[1-8]$/.test(e.key)) return;
                var r = rows.filter(function (x) { return !x.done; })[0];
                if (!r) return;
                e.preventDefault();
                r.sw.el.children[+e.key - 1].click();
            });
        }
    });

    /* ======================= Lazy Pad ======================= */
    /* notes with the guessed word in them, and other notes; two of the same length make a puzzle */
    var LP = {
        cat: {
            cribs: ['FISH', 'TREAT', 'MOUSE', 'CATNIP'],
            withCrib: ['HIDE THE FISH', 'GET THE FISH', 'A FISH FOR ME', 'TREAT TIME NOW', 'ONE TREAT EACH',
                'GRAB A TREAT', 'THE MOUSE RAN', 'CHASE A MOUSE', 'MOUSE IN BOX', 'CATNIP IS OURS', 'MORE CATNIP',
                'FIND CATNIP', 'TREAT IN SOCK'],
            others: ['NAP TIME SOON', 'OPEN AT TEN', 'GO LEFT NOW', 'KEEP IT QUIET', 'MEET BY DOOR', 'DOOR CODE NINE',
                'BRING A BAG', 'WAIT FOR DARK', 'WATCH THE DOG', 'JUMP AT MIDNIGHT', 'SLEEP ALL DAY', 'RUN TO GATE',
                'PURR LIKE MAD', 'THE KEY IS BLUE', 'LOOK UP HIGH', 'ROOF IS CLEAR', 'TAKE THE STAIRS', 'CODE IS GREEN',
                'NOBODY KNOWS', 'ALL CLEAR NOW', 'GO AT MIDNIGHT', 'HOLD THE DOOR', 'USE THE WINDOW', 'BACK DOOR OPEN',
                'PAST THE GUARD', 'MEET ME AT TEN', 'WAKE ME AT SIX', 'CLIMB THE WALL', 'ON THE ROOF', 'UNDER THE RUG', 'LIGHTS GO OUT',
                'CAMERA IS OFF', 'QUIET AS SNOW', 'RUN WHEN I SAY', 'LOCK IS BROKEN', 'TOP SHELF LEFT']
        },
        dog: {
            cribs: ['BONE', 'TREAT', 'BALL', 'STICK'],
            withCrib: ['HIDE THE BONE', 'GET THE BONE', 'A BONE FOR ME', 'TREAT TIME NOW', 'ONE TREAT EACH',
                'GRAB A TREAT', 'THE BALL RAN', 'CATCH THE BALL', 'BALL IN BOX', 'STICK IS OURS', 'FETCH A STICK',
                'FIND THE BALL', 'TREAT IN SOCK'],
            others: ['NAP TIME SOON', 'OPEN AT TEN', 'GO LEFT NOW', 'KEEP IT QUIET', 'MEET BY DOOR', 'DOOR CODE NINE',
                'BRING A BAG', 'WAIT FOR DARK', 'WATCH THE CAT', 'JUMP AT MIDNIGHT', 'SLEEP ALL DAY', 'RUN TO GATE',
                'WOOF LIKE MAD', 'THE KEY IS BLUE', 'LOOK UP HIGH', 'ROOF IS CLEAR', 'TAKE THE STAIRS', 'CODE IS GREEN',
                'NOBODY KNOWS', 'ALL CLEAR NOW', 'GO AT MIDNIGHT', 'HOLD THE DOOR', 'USE THE WINDOW', 'BACK DOOR OPEN',
                'PAST THE GUARD', 'MEET ME AT TEN', 'WAKE ME AT SIX', 'CLIMB THE WALL', 'ON THE ROOF', 'UNDER THE RUG', 'LIGHTS GO OUT',
                'CAMERA IS OFF', 'QUIET AS SNOW', 'RUN WHEN I SAY', 'LOCK IS BROKEN', 'TOP SHELF LEFT']
        }
    };
    /* the letters a guess at position p shows of the other note */
    function lpShow(x, crib, p) {
        var s = '';
        for (var i = 0; i < crib.length; i++) { var c = charOf(crib.charCodeAt(i) ^ x[p + i]); s += c === null ? '?' : c; }
        return s;
    }
    /* a fair puzzle: the guess is in note 1 once, not in note 2, and every other position shows at least one '?' */
    function lpFair(m1, m2, crib) {
        if (m1.length !== m2.length || m1.indexOf(crib) < 0 || m1.indexOf(crib) !== m1.lastIndexOf(crib) || m2.indexOf(crib) >= 0) return false;
        var x = [], p;
        for (var i = 0; i < m1.length; i++) x.push(m1.charCodeAt(i) ^ m2.charCodeAt(i));
        for (p = 0; p + crib.length <= m1.length; p++) {
            if (m1.substr(p, crib.length) === crib) continue;
            if (lpShow(x, crib, p).indexOf('?') < 0) return false;
        }
        return true;
    }
    function lpMake(level, pet, rnd) {
        var d = LP[pet];
        if (level === 'easy') return { m1: 'HIDE THE ' + (pet === 'dog' ? 'BONE' : 'FISH'), m2: 'UNDER THE RUG', crib: pet === 'dog' ? 'BONE' : 'FISH', choices: null };
        for (var tries = 0; tries < 500; tries++) {
            var m1 = d.withCrib[Math.floor(rnd() * d.withCrib.length)];
            var crib = d.cribs.filter(function (c) { return m1.indexOf(c) >= 0; })[0];
            var mates = d.others.filter(function (o) { return lpFair(m1, o, crib); });
            if (!mates.length) continue;
            var m2 = mates[Math.floor(rnd() * mates.length)];
            if (rnd() < 0.5) { var t = m1; m1 = m2; m2 = t; }   /* the guessed word may sit in either note */
            var choices = null;
            if (level === 'hard') {
                var others = d.cribs.filter(function (c) { return c !== crib && m1.indexOf(c) < 0 && m2.indexOf(c) < 0 && c.length <= m1.length; });
                if (others.length < 2) continue;
                choices = [crib, others[0], others[1]];
            }
            return { m1: m1, m2: m2, crib: crib, choices: choices };
        }
        return lpMake('easy', pet, rnd);
    }

    var LP_CSS = BASE_CSS +
        '.chs-lp { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px; overflow: hidden; }' +
        '.chs-lp-row { display: flex; gap: 3px; justify-content: center; }' +
        '.chs-lp-row span { width: 34px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 6px;' +
        '  font: 800 1.05rem/1 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chs-lp-row.hex span { font-size: .8rem; color: #7a7393; height: 22px; }' +
        '.chs-lp-row.x span { background: #ece9f6; color: #231f3a; }' +
        '.chs-lp-row.guess span { cursor: pointer; border: 2px dashed #ddd8ee; box-sizing: border-box; }' +
        '.chs-lp-row.guess span.g { background: #ffe9a8; border: 2px solid #231f3a; }' +
        '.chs-lp-row.show span.s { background: #fff; border: 2px solid #231f3a; box-sizing: border-box; }' +
        '.chs-lp-row.show span.q { color: #d6336c; }' +
        '.chs-lp-row.plain span { background: #2f8a3a; color: #fff; }' +
        '.chs-lp-ctl { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }' +
        '@media (max-width: 560px) { .chs-lp-row { gap: 2px; } .chs-lp-row span { width: 19px; font-size: .95rem; } .chs-lp-row.hex span { font-size: .62rem; } }';

    room({
        id: 'lazy-pad', name: 'Lazy Pad', tag: 'Two-time pad', order: 20,
        time: { easy: 90, normal: 60, hard: 55 },
        build: function (ctx) {
            style(ctx, LP_CSS);
            var pz = lpMake(ctx.level, ctx.pet, ctx.rnd);
            var L = pz.m1.length, rng = seeded(ctx.easy ? 7 : Math.floor(ctx.rnd() * 1e9));
            var pad = [], c1 = [], c2 = [], x = [];
            for (var i = 0; i < L; i++) {
                pad.push(Math.floor(rng() * 256));
                c1.push(pz.m1.charCodeAt(i) ^ pad[i]); c2.push(pz.m2.charCodeAt(i) ^ pad[i]);
                x.push(c1[i] ^ c2[i]);
            }
            var crib = pz.choices ? null : pz.crib, pos = 0, done = false;

            ctx.tip('Two notes were locked with the <b>same</b> pad, so XORing them cancels the pad out. Slide your guessed word along until the row below it shows <b>real words</b>, then press <b>It reads!</b>');
            var at0 = Math.max(pz.m1.indexOf(pz.crib), pz.m2.indexOf(pz.crib)), part = at0 < L / 3 ? 'start' : at0 < 2 * L / 3 ? 'middle' : 'end';
            ctx.hint((pz.choices ? 'Only one of the three words is in the notes: try each. ' : '') + 'Slide one step at a time. Wrong places show red ? marks; at the right place the row shows only letters (and gaps) that make sense. The word sits near the ' + part + ' of a note.');

            function hex(v) { return ('0' + v.toString(16).toUpperCase()).slice(-2); }
            var box = ctx.h('div', 'chx-card chs-lp');
            function row(cls, vals) {
                var r = ctx.h('div', 'chs-lp-row ' + cls);
                for (var k = 0; k < L; k++) r.appendChild(ctx.h('span', null, vals ? vals[k] : ''));
                return r;
            }
            box.appendChild(label(ctx, 'Locked note 1'));
            var r1 = row('hex', c1.map(hex)); box.appendChild(r1);
            box.appendChild(label(ctx, 'Locked note 2'));
            var r2 = row('hex', c2.map(hex)); box.appendChild(r2);
            box.appendChild(label(ctx, 'Note 1 XOR note 2 (the pad is gone)'));
            box.appendChild(row('x hex', x.map(hex)));
            box.appendChild(label(ctx, 'Your guessed word'));
            var rg = row('guess'); box.appendChild(rg);
            box.appendChild(label(ctx, 'The other note then shows'));
            var rs = row('show'); box.appendChild(rs);
            ctx.el.appendChild(box);

            var picks = null;
            if (pz.choices) {
                picks = ctx.h('div', 'chs-lp-ctl');
                picks.appendChild(label(ctx, 'Guess a word:'));
                ctx.shuffle(pz.choices).forEach(function (w) {
                    var b = ctx.btn(w, null, function () {
                        crib = w; pos = 0;
                        Array.prototype.forEach.call(picks.querySelectorAll('button'), function (o) { o.classList.toggle('chx-sel', o === b); });
                        paint();
                    });
                    picks.appendChild(b);
                });
                ctx.el.appendChild(picks);
            }
            var ctl = ctx.h('div', 'chs-lp-ctl');
            var left = ctx.btn('◀', null, function () { move(-1); }), right = ctx.btn('▶', null, function () { move(1); });
            left.setAttribute('aria-label', 'Slide left'); right.setAttribute('aria-label', 'Slide right');
            var go = ctx.btn('It reads!', 'chx-go', check);
            ctl.appendChild(left); ctl.appendChild(right); ctl.appendChild(go);
            ctx.el.appendChild(ctl);

            Array.prototype.forEach.call(rg.children, function (cell, k) {
                ctx.on(cell, 'click', function () { if (crib && !done) { pos = Math.min(k, L - crib.length); ctx.sfx('move'); paint(); } });
            });
            function move(d) {
                if (!crib || done) return;
                var np = Math.max(0, Math.min(L - crib.length, pos + d));
                if (np !== pos) { pos = np; ctx.sfx('move'); paint(); }
            }
            function paint() {
                var shown = crib ? lpShow(x, crib, pos) : '';
                for (var k = 0; k < L; k++) {
                    var inG = crib && k >= pos && k < pos + crib.length, ch = inG ? crib[k - pos] : '';
                    rg.children[k].textContent = ch === ' ' ? '' : ch;
                    rg.children[k].className = inG ? 'g' : '';
                    var s = inG ? shown[k - pos] : '';
                    rs.children[k].textContent = s === ' ' ? '' : s;
                    rs.children[k].className = inG ? 's' + (s === '?' ? ' q' : '') : '';
                }
                left.disabled = right.disabled = go.disabled = !crib;
            }
            function check() {
                if (!crib || done) return;
                var at = pz.m1.substr(pos, crib.length) === crib || pz.m2.substr(pos, crib.length) === crib;
                if (!at) {
                    var junk = lpShow(x, crib, pos).indexOf('?') >= 0;
                    ctx.wrong(junk ? 'Those red ? marks are no letters. Slide on!' : (pz.choices && pz.m1.indexOf(crib) < 0 && pz.m2.indexOf(crib) < 0 ? 'That word is in neither note. Try another.' : 'That does not read right. Slide on!'));
                    return;
                }
                done = true;
                left.disabled = right.disabled = go.disabled = true;
                if (picks) Array.prototype.forEach.call(picks.querySelectorAll('button'), function (b) { b.disabled = true; });
                /* the whole story: both notes in plain letters */
                for (var k = 0; k < L; k++) {
                    r1.children[k].textContent = pz.m1[k] === ' ' ? '' : pz.m1[k];
                    r2.children[k].textContent = pz.m2[k] === ' ' ? '' : pz.m2[k];
                }
                r1.className = r2.className = 'chs-lp-row plain';
                box.children[0].textContent = 'Note 1'; box.children[2].textContent = 'Note 2';
                ctx.say('Both notes are out!', 1600);
                ctx.mood('wow');
                ctx.later(function () {
                    ctx.solve('Use a pad twice and it cancels out: the two locked notes XORed give the two plain notes XORed, and one good guess unpicks both. Soviet spies were caught this way (the Venona project), and the old Wi-Fi lock WEP fell to the same mistake.');
                }, 1400);
            }
            ctx.key(function (e) {
                if (e.key === 'ArrowLeft') { move(-1); e.preventDefault(); }
                else if (e.key === 'ArrowRight') { move(1); e.preventDefault(); }
                else if (e.key === 'Enter') { check(); e.preventDefault(); }
            });
            paint();
        }
    });

    /* ======================= Penguin Leak ======================= */
    /* 16 x 16 pictures: . background, # outline, o fill, x detail */
    var PICS = {
        cat: { name: 'A cat face', rows: [
            '................',
            '.#............#.',
            '.##..........##.',
            '.#o#........#o#.',
            '.#oo########oo#.',
            '.#oooooooooooo#.',
            '#oooooooooooooo#',
            '#ooxxooooooxxoo#',
            '#ooxxooooooxxoo#',
            '#oooooooooooooo#',
            '#oooooo##oooooo#',
            '#ooooo#oo#ooooo#',
            '.#oooooooooooo#.',
            '..#oooooooooo#..',
            '...##########...',
            '................'] },
        dog: { name: 'A dog face', rows: [
            '................',
            '...##########...',
            '.##oooooooooo##.',
            '#xx#oooooooo#xx#',
            '#xx#oooooooo#xx#',
            '#xx#ooxoooxo#xx#',
            '#xx#ooxoooxo#xx#',
            '#xx#oooooooo#xx#',
            '.##ooooxxooooo#.',
            '..#oooxxxxoooo#.',
            '..#ooooxxooooo#.',
            '..#oooo##oooo#..',
            '...#oooooooo#...',
            '....#oxxxxo#....',
            '.....######.....',
            '................'] },
        fish: { name: 'A fish', rows: [
            '................',
            '................',
            '................',
            '.....######.....',
            '...##oooooo##..#',
            '..#oooooooooo##.',
            '.#ooxooooooooo#.',
            '#oooooooooooooo#',
            '#oooooooooooooo#',
            '.#oooooooooooo#.',
            '..#oooooooooo##.',
            '...##oooooo##..#',
            '.....######.....',
            '................',
            '................',
            '................'] },
        bone: { name: 'A bone', rows: [
            '................',
            '................',
            '................',
            '.##..........##.',
            '#oo#........#oo#',
            '#ooo########ooo#',
            '.#oooooooooooo#.',
            '..#oooooooooo#..',
            '..#oooooooooo#..',
            '.#oooooooooooo#.',
            '#ooo########ooo#',
            '#oo#........#oo#',
            '.##..........##.',
            '................',
            '................',
            '................'] },
        heart: { name: 'A heart', rows: [
            '................',
            '..####....####..',
            '.#oooo#..#oooo#.',
            '#oooooo##oooooo#',
            '#ooxxoooooooooo#',
            '#ooxoooooooooooo',
            '#oooooooooooooo#',
            '.#oooooooooooo#.',
            '..#oooooooooo#..',
            '...#oooooooo#...',
            '....#oooooo#....',
            '.....#oooo#.....',
            '......#oo#......',
            '.......##.......',
            '................',
            '................'] },
        key: { name: 'A key', rows: [
            '................',
            '................',
            '..#####.........',
            '.#ooooo#........',
            '#oo###oo#.......',
            '#o#...#o#.......',
            '#o#...#o########',
            '#o#...#ooooooooo',
            '#oo###oo########',
            '.#ooooo#..#o#.#o',
            '..#####...#o#.#o',
            '..........###.##',
            '................',
            '................',
            '................',
            '................'] }
    };
    var PIX = { '.': 0, '#': 1, 'o': 2, 'x': 3 };
    /* the toy block cipher. The picture is drawn at 32 x 32 and cut into blocks of 2 x 2 pixels, 4 colours each: a
       block is 8 bits (here every block covers one pixel of the 16 x 16 drawing). The key picks a random reordering of
       the 256 block values. */
    function toyCipher(key) {
        var r = seeded(key), p = [];
        for (var i = 0; i < 256; i++) p.push(i);
        for (i = 255; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
        return p;
    }
    function blocksOf(pic) {
        var b = [];
        pic.rows.forEach(function (row) { for (var i = 0; i < 16; i++) b.push(PIX[row[i]] * 85); });
        return b;
    }
    /* mode: 'ecb', 'cbc' or 'ctr'; returns the 256 locked blocks */
    function lockPic(blocks, mode, key) {
        var P = toyCipher(key), prev = seeded(key ^ 0x5bd1e995)() * 256 | 0, out = [];
        blocks.forEach(function (v, i) {
            if (mode === 'ecb') out.push(P[v]);
            else if (mode === 'cbc') { prev = P[v ^ prev]; out.push(prev); }
            else {
                /* the counter i goes through the cipher after a keyed mix: a fresh-looking stream for every block */
                var h = Math.imul((i + 1) ^ key, 0x9E3779B1) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x85EBCA77) >>> 0; h ^= h >>> 13;
                out.push(v ^ P[h & 255]);
            }
        });
        return out;
    }
    /* how often equal plain blocks stay equal when locked (1 for ECB, near 1/256 for good noise) */
    function sameness(blocks, out) {
        var seen = {}, same = 0, pairs = 0;
        blocks.forEach(function (v, i) {
            var m = seen[v] || (seen[v] = {}), k;
            for (k in m) { pairs += m[k]; if (+k === out[i]) same += m[k]; }
            m[out[i]] = (m[out[i]] || 0) + 1;
        });
        return pairs ? same / pairs : 0;
    }
    /* a key whose CBC chain does not fall into a short loop on the plain background (a toy cipher is that small) */
    function goodKey(blocks, key) {
        for (var t = 0; t < 60; t++, key++) if (sameness(blocks, lockPic(blocks, 'cbc', key)) < 0.05 && sameness(blocks, lockPic(blocks, 'cbc', key + 77)) < 0.05) return key;
        return key;
    }
    var PLAIN_COLORS = { cat: ['#fffaf0', '#231f3a', '#f0a030', '#4a5bd4'], dog: ['#fffaf0', '#231f3a', '#c98b4f', '#5a3a22'] };
    var LOCK_COLORS = ['#231f3a', '#4a5bd4', '#d6336c', '#ffe9a8'];
    function drawBlocks(canvas, blocks, colors) {
        var g = canvas.getContext('2d'), s = canvas.width / 32;
        blocks.forEach(function (v, i) {
            var y = Math.floor(i / 16) * 2, x = (i % 16) * 2;
            for (var k = 0; k < 4; k++) { g.fillStyle = colors[(v >> (6 - 2 * k)) & 3]; g.fillRect((x + (k & 1)) * s, (y + (k >> 1)) * s, s, s); }
        });
    }

    var PL_CSS = BASE_CSS +
        '.chs-pk { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; width: 100%; }' +
        '.chs-pk-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }' +
        '.chs-pk-img { width: 150px; padding: 6px; border: 2px solid #231f3a; border-radius: 10px; background: #fff; box-shadow: 0 3px 0 #231f3a; }' +
        '.chs-pk-img canvas { display: block; width: 100%; height: auto; border-radius: 4px; }' +
        'button.chs-pk-img:active { transform: translateY(2px); box-shadow: 0 1px 0 #231f3a; }' +
        '.chs-pk-img.good { border-color: #2f8a3a; box-shadow: 0 3px 0 #2f8a3a; }' +
        '.chs-pk-img.plain { box-shadow: none; border-color: #ddd8ee; }' +
        '.chs-pk-tag { font: 800 .95rem/1.2 system-ui, sans-serif; min-height: 1.2em; }' +
        '.chs-pk-names { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }' +
        '@media (max-width: 560px) { .chs-pk.n3 .chs-pk-img { width: 96px; padding: 4px; } .chs-pk.n4 .chs-pk-img, .chs-pk.n2 .chs-pk-img { width: 128px; } }';

    room({
        id: 'penguin-leak', name: 'Penguin Leak', tag: 'ECB mode', order: 30,
        time: { easy: 60, normal: 50, hard: 45 },
        build: function (ctx) {
            style(ctx, PL_CSS);
            var face = ctx.dog ? 'dog' : 'cat', snack = ctx.dog ? 'bone' : 'fish';
            var secret = ctx.easy ? face : ctx.pick([face, snack, 'heart', 'key']);
            var names = ctx.hard ? [face, snack, 'heart', 'key'] : [secret].concat(ctx.shuffle([face, snack, 'heart', 'key'].filter(function (n) { return n !== secret; })).slice(0, 2));
            var modes = ctx.easy ? ['cbc', 'ecb'] : ctx.hard ? ctx.shuffle(['ecb', 'cbc', 'ctr', 'cbc']) : ctx.shuffle(['ecb', 'cbc', 'ctr']);
            var blocks = blocksOf(PICS[secret]), key = goodKey(blocks, ctx.easy ? 2027 : ctx.ri(1, 1e6));
            var step = 1;

            if (ctx.easy) ctx.tip('The vault camera sent this picture, locked two ways with the same key. <b>Tap the locked copy that still gives the picture away.</b>');
            else ctx.tip('A secret picture was locked ' + modes.length + ' ways. <b>Tap the locked copy that gives it away</b>, then say what the picture shows.');
            ctx.hint('Look for a shape, not for colours: in one copy the same plain pixels always turn into the same locked pixels, so the outline still shows through. The others look like pure noise.');

            if (ctx.easy) {
                var orig = ctx.h('div', 'chs-pk-item'), oi = ctx.h('div', 'chs-pk-img plain'), oc = document.createElement('canvas');
                oc.width = oc.height = 160; drawBlocks(oc, blocks, PLAIN_COLORS[ctx.pet]);
                oi.appendChild(oc); orig.appendChild(oi); orig.appendChild(ctx.h('div', 'chs-pk-tag', 'The picture'));
                var top = ctx.h('div', 'chs-pk n1'); top.appendChild(orig); ctx.el.appendChild(top);
            }
            var grid = ctx.h('div', 'chs-pk n' + modes.length);
            var items = modes.map(function (m, i) {
                var it = ctx.h('div', 'chs-pk-item');
                var b = ctx.h('button', 'chs-pk-img');
                b.type = 'button';
                b.setAttribute('aria-label', 'Locked copy ' + 'ABCD'[i]);
                var c = document.createElement('canvas');
                c.width = c.height = 160;
                drawBlocks(c, lockPic(blocks, m, m === 'cbc' && i > 0 && modes.indexOf('cbc') < i ? key + 77 : key), LOCK_COLORS);
                b.appendChild(c);
                var tag = ctx.h('div', 'chs-pk-tag', 'Copy ' + 'ABCD'[i]);
                it.appendChild(b); it.appendChild(tag);
                grid.appendChild(it);
                ctx.on(b, 'click', function () { pickImg(i); });
                return { b: b, tag: tag, mode: m };
            });
            ctx.el.appendChild(grid);
            var namesEl = ctx.h('div', 'chs-pk-names');
            ctx.el.appendChild(namesEl);

            function showModes() {
                items.forEach(function (it) {
                    it.tag.textContent = it.mode.toUpperCase() + (it.mode === 'ecb' ? ': leaks' : ': noise');
                    it.tag.className = 'chs-pk-tag ' + (it.mode === 'ecb' ? 'chx-bad' : 'chx-ok');
                    it.b.disabled = true;
                });
            }
            var FACT = 'ECB locks every block on its own, so equal blocks stay equal and pictures, forms and patterns shine through (the famous "ECB penguin"). Real systems use modes like CBC, CTR or GCM, which mix in a chain or a counter.';
            function pickImg(i) {
                if (step !== 1 || !ctx.alive()) return;
                if (items[i].mode !== 'ecb') { ctx.wrong('That one is pure noise.'); return; }
                items[i].b.classList.add('good');
                ctx.sfx('pop');
                showModes();
                if (ctx.easy) { step = 3; ctx.say('The face shows through!', 1600); ctx.solve(FACT); return; }
                step = 2;
                ctx.tip('Right, that copy is in <b>ECB</b> mode. <b>What does the secret picture show?</b>');
                ctx.hint('Look at the outline in the ECB copy: which shape is it?');
                names.forEach(function (n) {
                    namesEl.appendChild(ctx.btn(PICS[n].name, null, function () {
                        if (step !== 2) return;
                        if (n !== secret) { ctx.wrong('Look at the outline again.'); return; }
                        step = 3;
                        ctx.say('Spotted it: ' + PICS[n].name.toLowerCase() + '!', 1600);
                        ctx.solve(FACT);
                    }));
                });
            }
        }
    });
})();
