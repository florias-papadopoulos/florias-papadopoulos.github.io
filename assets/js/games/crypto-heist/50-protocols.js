/* Crypto Heist, part 50: the protocol rooms. Cave of Whiskers (a zero-knowledge proof: the ring cave with the magic
   door, a bluffer survives n rounds only 1 time in 2^n) and Three Paws (Shamir secret sharing mod 11: Easy rebuilds a
   curve through three shares, Normal and Hard a line through two of three). The puzzle makers (gen) are kept apart
   so a test can run them without a page. */
(function () {
    'use strict';

    var CAT_NAMES = ['Luna', 'Felix', 'Nala', 'Milo', 'Cleo', 'Simba', 'Oliver', 'Mochi', 'Pepper', 'Ziggy'];
    var DOG_NAMES = ['Rex', 'Buddy', 'Bella', 'Rocky', 'Daisy', 'Cooper', 'Bailey', 'Duke', 'Rosie', 'Teddy'];
    var COLORS = ['#ffb400', '#4a5bd4', '#2f8a3a', '#d6336c'];

    function m11(a) { return ((a % 11) + 11) % 11; }
    function inv11(a) { a = m11(a); for (var i = 1; i < 11; i++) if ((a * i) % 11 === 1) return i; return null; }
    function shuffleWith(rnd, l) {
        l = l.slice();
        for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; }
        return l;
    }

    var CSS =
        /* Cave of Whiskers */
        '.chp-cave { position: relative; width: 100%; max-width: 280px; aspect-ratio: 1 / 1; }' +
        '@media (max-width: 480px) { .chp-cave { max-width: 220px; } }' +
        '.chp-cave svg { position: absolute; inset: 0; width: 100%; height: 100%; }' +
        '.chp-cave .tun { stroke: #fff; transition: stroke .3s; }' +
        '.chp-cave.dark .tun { stroke: #4a4466; }' +
        '.chp-cave .tunf { fill: #fff; transition: fill .3s; } .chp-cave.dark .tunf { fill: #4a4466; }' +
        '.chp-cave .door { fill: #b8742a; transition: fill .2s; }' +
        '.chp-cave.open .door { fill: #ffe9a8; }' +
        '.chp-cave .q { opacity: 0; transition: opacity .2s; }' +
        '.chp-cave.dark .q { opacity: 1; }' +
        '.chp-tok { position: absolute; left: 50%; top: 97%; width: 40px; height: 40px; margin: -20px 0 0 -20px; border: 2px solid #231f3a;' +
        '  border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; line-height: 1; opacity: 0; }' +
        '.chp-tok.move { transition: left .3s linear, top .3s linear, opacity .2s; }' +
        '.chp-tok.bad { box-shadow: 0 0 0 4px #d6336c; }' +
        '.chp-sus { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; width: 100%; }' +
        '.chp-s { flex: 1 1 150px; max-width: 230px; display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 2px solid #ddd8ee;' +
        '  border-radius: 10px; background: #fff; }' +
        '.chp-s.on { border-color: #231f3a; box-shadow: 0 3px 0 #231f3a; }' +
        '.chp-s.caught { background: #fde6ee; border-color: #d6336c; }' +
        '.chp-s.trust { background: #e3f4e5; border-color: #2f8a3a; }' +
        '.chp-s-top { display: flex; align-items: center; gap: 8px; font-weight: 800; }' +
        '.chp-s-top i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #231f3a; flex: none; }' +
        '.chp-dots { display: flex; flex-wrap: wrap; gap: 3px; min-height: 12px; }' +
        '.chp-dots i { width: 10px; height: 10px; border-radius: 50%; background: #2f8a3a; }' +
        '.chp-dots i.x { background: #d6336c; }' +
        '.chp-odds { font-size: .85rem; color: #423b5e; font-weight: 700; }' +
        '.chp-s .chx-btn { min-height: 36px; padding: 4px 10px; font-size: .92rem; }' +
        '.chp-s-btns { display: flex; gap: 6px; } .chp-s-btns .chx-btn { flex: 1 1 0; }' +
        /* Three Paws */
        '.chp-grid { display: grid; grid-template-columns: 20px repeat(11, minmax(0, 30px)); gap: 1px; justify-content: center; }' +
        '.chp-grid .ax { font: 700 .72rem/1 ui-monospace, Menlo, Consolas, monospace; color: #7a7393; display: flex; align-items: center; justify-content: center; }' +
        '.chp-c { aspect-ratio: 1 / 1; padding: 0; border: 0; border-radius: 3px; background: #fff; position: relative; min-width: 0; }' +
        '.chp-c.x0 { background: #fff4d1; }' +
        '.chp-c.pt::after { content: ""; position: absolute; left: 30%; top: 30%; width: 40%; height: 40%; border-radius: 50%; background: #4a5bd4; }' +
        '.chp-c.ghost::after { content: ""; position: absolute; left: 34%; top: 34%; width: 32%; height: 32%; border-radius: 50%; background: #b9b2d6; }' +
        '.chp-c.sh { z-index: 1; }' +
        '.chp-c.sh span { position: absolute; inset: 6%; border-radius: 50%; border: 2px solid #231f3a; display: flex; align-items: center;' +
        '  justify-content: center; font: 800 .72rem/1 system-ui, sans-serif; color: #231f3a; z-index: 1; }' +
        '.chp-c.sh.pt span { box-shadow: 0 0 0 2px #4a5bd4; }' +
        '.chp-c.win { background: #2f8a3a; } .chp-c.win::after { background: #fff; }' +
        '.chp-gbox { box-sizing: border-box; width: 100%; max-width: 384px; padding: 8px 6px; background: #ddd8ee; border: 2px solid #231f3a; border-radius: 10px; }' +
        '.chp-cap { font-size: .8rem; color: #7a7393; font-weight: 700; text-align: center; margin-top: 6px; }' +
        '.chp-owners { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }' +
        '.chp-own { display: inline-flex; align-items: center; gap: 6px; } .chp-own[hidden] { display: none; }' +
        '.chp-own i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #231f3a; display: inline-block; }' +
        '.chp-own code { font: 800 .95rem ui-monospace, Menlo, Consolas, monospace; }' +
        '.chp-formula { font-weight: 800; line-height: 1.4; text-align: center; min-height: 1.4em; }';

    function addCss() {
        if (document.getElementById('chp-css')) return;
        var s = document.createElement('style');
        s.id = 'chp-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* ================= Cave of Whiskers ================= */
    function genCave(o) {
        var names = o.dog ? DOG_NAMES : CAT_NAMES, n = o.hard ? 3 : 2;
        var who = o.easy ? names.slice(0, 2) : shuffleWith(o.rnd, names).slice(0, n);
        var honest = o.easy ? 0 : Math.floor(o.rnd() * n);
        return {
            need: o.easy ? 3 : o.hard ? 6 : 5,
            sus: who.map(function (nm, i) { return { name: nm, honest: i === honest, color: COLORS[i], passes: 0, rounds: 0, caught: false }; })
        };
    }
    /* does a bluffer who went in by side `side` come out where the checker shouts? */
    function bluffPasses(side, shout) { return side === shout; }

    room({
        id: 'cave-of-whiskers', name: 'Cave of Whiskers', tag: 'Zero knowledge', order: 120,
        time: { easy: 100, normal: 75, hard: 85 },
        gen: genCave, bluffPasses: bluffPasses,
        build: function (ctx) {
            addCss();
            var P = genCave({ easy: ctx.easy, hard: ctx.hard, dog: ctx.dog, rnd: ctx.rnd });
            var S = P.sus, K = P.need, cur = -1, side = null, state = 'idle';
            var face = ctx.dog ? '🐶' : '🐱';

            ctx.tip('One of these ' + ctx.pet + 's knows the magic word that opens the door inside the cave. Press <b>Test</b>: the ' + ctx.pet +
                ' goes in by a path you cannot see, then you <b>shout which side</b> it must come out. Find the one who really knows it and press <b>Trust</b>.');
            ctx.hint('A bluffer who went in on the other side is stuck behind the door, so half the time it fails. Trust a ' + ctx.pet + ' only after ' + K +
                ' rounds in a row: a bluffer gets that far just 1 time in ' + Math.pow(2, K) + '.');

            var cave = ctx.h('div', 'chp-cave');
            cave.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">' +
                '<rect x="1" y="1" width="98" height="98" rx="14" fill="#c9c2df" stroke="#231f3a" stroke-width="2"/>' +
                '<rect x="42" y="80" width="16" height="20" fill="#231f3a"/>' +
                '<circle cx="50" cy="50" r="36" fill="none" stroke="#231f3a" stroke-width="17"/>' +
                '<rect x="44" y="82" width="12" height="19" class="tunf"/>' +
                '<circle cx="50" cy="50" r="36" fill="none" class="tun" stroke-width="13"/>' +
                '<rect x="46.5" y="5" width="7" height="17" rx="1.5" class="door" stroke="#231f3a" stroke-width="1.5"/>' +
                '<text x="50" y="29" text-anchor="middle" font-size="5" font-weight="800" fill="#231f3a">DOOR</text>' +
                '<text x="33" y="52" text-anchor="middle" font-size="5.5" font-weight="800" fill="#231f3a">LEFT</text>' +
                '<text x="67" y="52" text-anchor="middle" font-size="5.5" font-weight="800" fill="#231f3a">RIGHT</text>' +
                '<text x="50" y="66" text-anchor="middle" font-size="12" font-weight="800" fill="#231f3a" class="q">?</text>' +
                '</svg>';
            var tok = ctx.h('div', 'chp-tok', face);
            cave.appendChild(tok);
            ctx.el.appendChild(cave);

            var shoutRow = ctx.h('div', 'chx-row');
            var bL = ctx.btn('← Out LEFT', null, function () { shout('L'); });
            var bR = ctx.btn('Out RIGHT →', null, function () { shout('R'); });
            shoutRow.appendChild(bL); shoutRow.appendChild(bR);
            ctx.el.appendChild(shoutRow);
            var status = ctx.h('div', 'chh-news', '');
            status.style.cssText = 'font-weight:800;text-align:center;min-height:1.4em';
            ctx.el.appendChild(status);

            var box = ctx.h('div', 'chp-sus');
            S.forEach(function (s, i) {
                var c = ctx.h('div', 'chp-s');
                var top = ctx.h('div', 'chp-s-top'), dot = ctx.h('i');
                dot.style.background = s.color;
                top.appendChild(dot); top.appendChild(document.createTextNode(face + ' ' + s.name));
                c.appendChild(top);
                s.dots = ctx.h('div', 'chp-dots'); c.appendChild(s.dots);
                s.odds = ctx.h('div', 'chp-odds'); c.appendChild(s.odds);
                var btns = ctx.h('div', 'chp-s-btns');
                s.test = ctx.btn('Test', null, function () { testOne(i); });
                s.trustB = ctx.btn('Trust', 'chx-go', function () { trust(i); });
                btns.appendChild(s.test); btns.appendChild(s.trustB);
                c.appendChild(btns);
                s.card = c;
                box.appendChild(c);
            });
            ctx.el.appendChild(box);

            var POS = { out: [50, 97], entry: [50, 84], L: [14, 50], R: [86, 50], LL: [22, 77], LR: [78, 77] };
            function put(p, move) {
                tok.classList.toggle('move', !!move);
                tok.style.left = POS[p][0] + '%'; tok.style.top = POS[p][1] + '%';
            }
            function paintCards() {
                S.forEach(function (s, i) {
                    s.card.classList.toggle('on', i === cur && !s.caught);
                    s.card.classList.toggle('caught', s.caught);
                    s.dots.innerHTML = '';
                    for (var k = 0; k < s.passes; k++) s.dots.appendChild(ctx.h('i'));
                    if (s.caught) s.dots.appendChild(ctx.h('i', 'x'));
                    s.odds.textContent = s.caught ? 'Caught bluffing!' : s.passes === 0 ? 'Not tested yet' :
                        s.passes + ' in a row. A bluffer does that 1 time in ' + Math.pow(2, s.passes) + '.';
                    s.test.disabled = s.caught || state === 'busy';
                    s.trustB.disabled = state === 'busy';
                });
                bL.disabled = bR.disabled = state !== 'wait';
            }
            function testOne(i) {
                if (state === 'busy' || S[i].caught) return;
                cur = i;
                var s = S[i];
                tok.style.background = s.color;
                tok.classList.remove('bad');
                state = 'busy';
                cave.classList.remove('dark');
                put('out', false); tok.style.opacity = '1';
                status.textContent = s.name + ' walks into the cave...';
                paintCards();
                ctx.later(function () { put('entry', true); }, 40);
                ctx.later(function () {
                    side = ctx.rnd() < 0.5 ? 'L' : 'R';
                    tok.style.opacity = '0';
                    cave.classList.add('dark');
                    state = 'wait';
                    status.textContent = s.name + ' is inside, on a path you cannot see. Shout a side!';
                    paintCards();
                    ctx.sfx('move');
                }, 420);
            }
            function shout(dir) {
                if (state !== 'wait') return;
                var s = S[cur];
                state = 'busy';
                if (!s.honest && ctx.easy) side = s.rounds === 0 ? dir : (dir === 'L' ? 'R' : 'L');   /* Easy: the bluffer fails its second round */
                var pass = s.honest || bluffPasses(side, dir);
                var outSide = pass ? dir : side, needDoor = s.honest && side !== dir;
                s.rounds++;
                paintCards();
                ctx.sfx('tap');
                status.textContent = 'You shout: ' + (dir === 'L' ? 'LEFT' : 'RIGHT') + '!';
                var t = 0;
                if (needDoor) {
                    ctx.later(function () { cave.classList.add('open'); ctx.sfx('pop'); status.textContent = 'The magic word opens the door!'; }, 150);
                    ctx.later(function () { cave.classList.remove('open'); }, 750);
                    t = 650;
                }
                ctx.later(function () {
                    cave.classList.remove('dark');
                    put(outSide, false); tok.style.opacity = '1';
                    if (!pass) tok.classList.add('bad');
                }, t + 200);
                ctx.later(function () { put(outSide === 'L' ? 'LL' : 'LR', true); }, t + 260);
                ctx.later(function () { put('entry', true); }, t + 580);
                ctx.later(function () { put('out', true); }, t + 900);
                ctx.later(function () {
                    if (pass) {
                        s.passes++;
                        status.textContent = s.name + ' came out on the ' + (dir === 'L' ? 'left' : 'right') + '. Passed!';
                        ctx.sfx('point');
                    } else {
                        s.caught = true;
                        status.textContent = s.name + ' came out on the WRONG side: a bluffer!';
                        ctx.mood('wow'); ctx.sfx('hit');
                        cur = -1;
                    }
                    state = 'idle';
                    paintCards();
                    if (pass) ctx.later(function () { if (state === 'idle' && cur >= 0 && !S[cur].caught) testOne(cur); }, 650);
                }, t + 1150);
            }
            function trust(i) {
                if (state === 'busy') return;
                var s = S[i];
                if (s.caught) { ctx.wrong(s.name + ' was caught bluffing!'); return; }
                if (s.passes < K) {
                    ctx.wrong(s.passes === 0 ? 'Test ' + s.name + ' first!' : 'Too soon: a bluffer passes ' + s.passes + ' round' + (s.passes > 1 ? 's' : '') +
                        ' 1 time in ' + Math.pow(2, s.passes) + '.');
                    return;
                }
                if (!s.honest) {
                    s.caught = true; cur = -1; state = 'idle';
                    tok.style.opacity = '0'; cave.classList.remove('dark');
                    ctx.wrong(s.name + ' bluffed and got lucky, a 1 in ' + Math.pow(2, s.passes) + ' chance!');
                    paintCards();
                    return;
                }
                state = 'done';
                s.card.classList.add('trust');
                tok.style.opacity = '0'; cave.classList.remove('dark');
                status.textContent = s.name + ' knows the magic word, and never said it.';
                paintCards();
                bL.disabled = bR.disabled = true;
                ctx.solve('Zero-knowledge proofs: you can prove you know a secret without revealing it. Each round halves a bluffer’s luck, so 20 rounds leave 1 chance in a million.');
            }
            ctx.key(function (e) {
                if (e.key === 'ArrowLeft') { e.preventDefault(); shout('L'); }
                else if (e.key === 'ArrowRight') { e.preventDefault(); shout('R'); }
            });
            paintCards();
        }
    });

    /* ================= Three Paws ================= */
    function evalPoly(c, x) { var y = 0; for (var i = c.length - 1; i >= 0; i--) y = m11(y * x + c[i]); return y; }   /* c[0] + c[1] x + ... */
    function lineThrough(a, b) {
        var m = m11((b.y - a.y) * inv11(b.x - a.x));
        return [m11(a.y - m * a.x), m];
    }
    function genShamir(o) {
        var names = o.dog ? DOG_NAMES : CAT_NAMES;
        if (o.easy) {
            var f = [6, 3, 1];   /* f(x) = x^2 + 3x + 6 mod 11: f(3) = 2, f(4) = 1, f(5) = 2, the secret f(0) = 6 */
            var shares = [3, 4, 5].map(function (x, i) { return { x: x, y: evalPoly(f, x), name: names[i], color: COLORS[i] }; });
            /* two decoys that each go through two of the shares: f + (x-3)(x-4) and f + (x-4)(x-5) */
            var d1 = [m11(6 + 12), m11(3 - 7), m11(1 + 1)], d2 = [m11(6 + 20), m11(3 - 9), m11(1 + 1)];
            return { k: 3, poly: f, secret: f[0], shares: shares, curves: [d1, f, d2], right: 1 };
        }
        var s = Math.floor(o.rnd() * 11), m = 1 + Math.floor(o.rnd() * 10);
        var xs = shuffleWith(o.rnd, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3).sort(function (a, b) { return a - b; });
        var who = shuffleWith(o.rnd, names).slice(0, 3);
        return { k: 2, poly: [s, m], secret: s,
            shares: xs.map(function (x, i) { return { x: x, y: evalPoly([s, m], x), name: who[i], color: COLORS[i] }; }) };
    }

    room({
        id: 'three-paws', name: 'Three Paws', tag: 'Secret sharing', order: 130,
        time: { easy: 100, normal: 70, hard: 75 },
        gen: genShamir, evalPoly: evalPoly, lineThrough: lineThrough,
        build: function (ctx) {
            addCss();
            var P = genShamir({ easy: ctx.easy, dog: ctx.dog, rnd: ctx.rnd });
            var cells = [], step, picked = [], curve = null, prev = -1;
            var Pets = ctx.Pet + 's';

            /* the grid: x from 0 to 10 left to right, y from 0 to 10 bottom to top; every number wraps around at 11 */
            var gbox = ctx.h('div', 'chp-gbox'), grid = ctx.h('div', 'chp-grid');
            for (var y = 10; y >= 0; y--) {
                grid.appendChild(ctx.h('div', 'ax', String(y)));
                for (var x = 0; x <= 10; x++) (function (x, y) {
                    var c = ctx.h('button', 'chp-c' + (x === 0 ? ' x0' : ''));
                    c.type = 'button';
                    c.setAttribute('aria-label', 'Point x ' + x + ', y ' + y);
                    if (x !== 0) c.tabIndex = -1;
                    c.addEventListener('click', function () { if (ctx.alive()) tapCell(x, y); });
                    (cells[x] = cells[x] || [])[y] = c;
                    grid.appendChild(c);
                })(x, y);
            }
            grid.appendChild(ctx.h('div', 'ax', ''));
            for (var xx = 0; xx <= 10; xx++) grid.appendChild(ctx.h('div', 'ax', String(xx)));
            gbox.appendChild(grid);
            gbox.appendChild(ctx.h('div', 'chp-cap', 'x along the bottom, y up the side. The secret sits on the yellow edge, at x = 0.'));

            var owners = ctx.h('div', 'chp-owners');
            P.shares.forEach(function (s, i) {
                var b = ctx.btn('', 'chp-own', function () { pickShare(i); });
                var dot = ctx.h('i'); dot.style.background = s.color;
                b.appendChild(dot);
                b.appendChild(document.createTextNode(s.name + ' '));
                b.appendChild(ctx.h('code', null, '(' + s.x + ', ' + s.y + ')'));
                s.btn = b;
                owners.appendChild(b);
                var cell = cells[s.x][s.y], mark = ctx.h('span', null, s.name.charAt(0));
                mark.style.background = s.color;
                cell.classList.add('sh'); cell.appendChild(mark);
            });
            var info = ctx.h('div', 'chp-formula', '');
            var row = ctx.h('div', 'chx-row');

            ctx.el.appendChild(owners);
            ctx.el.appendChild(gbox);
            ctx.el.appendChild(info);
            ctx.el.appendChild(row);

            function clearMarks() {
                for (var x = 0; x <= 10; x++) for (var y = 0; y <= 10; y++) cells[x][y].classList.remove('pt', 'ghost');
            }
            function draw(c, cls) { for (var x = 0; x <= 10; x++) cells[x][evalPoly(c, x)].classList.add(cls || 'pt'); }
            function onCurve(c) { return P.shares.map(function (s) { return evalPoly(c, s.x) === s.y; }); }
            function fmt(c) {
                var t = [];
                if (c[2]) t.push((c[2] === 1 ? '' : c[2]) + 'x²');
                if (c[1]) t.push((c[1] === 1 ? '' : c[1]) + 'x');
                t.push(String(c[0]));
                return 'f(x) = ' + t.join(' + ') + ' (wraps at 11)';
            }

            function tapCell(x, y) {
                if (P.k === 2 && (step === 'pick' || step === 'read')) {
                    for (var i = 0; i < P.shares.length; i++) if (P.shares[i].x === x && P.shares[i].y === y) { pickShare(i); return; }
                }
                if (step !== 'read') {
                    if (step === 'pick' || step === 'curve') ctx.say(P.k === 3 ? 'First choose the curve through all three paws.' : 'First pick two shares.', 1800);
                    return;
                }
                if (x !== 0) { ctx.wrong('The secret is on the yellow edge, at x = 0.'); return; }
                var want = evalPoly(curve, 0);
                if (y !== want) { ctx.wrong('Follow the dots: at x = 0 the curve is not at ' + y + '.'); return; }
                cells[0][y].classList.add('win');
                step = 'done';
                info.textContent = 'The secret is ' + want + '!';
                ctx.mood('happy');
                ctx.solve('Shamir secret sharing: any ' + (P.k === 3 ? 'three' : 'two') + ' shares rebuild the secret, fewer say nothing at all. It guards real master keys, such as the backup of the internet’s DNSSEC root key.');
            }

            /* ---- Easy: which of three curves goes through all three shares? ---- */
            function easyStart() {
                step = 'curve';
                ctx.tip('Three ' + ctx.pet + 's each hold one point of a secret curve. Tap the curves to see them, <b>use the one through all three paws</b>, ' +
                    'then tap where it meets the <b>yellow edge</b> (x = 0): that is the secret.');
                ctx.hint('Curve B goes through all three paws. Then look at the yellow column on the left: tap the dot there.');
                var bs = [];
                P.curves.forEach(function (c, i) {
                    var b = ctx.btn('Curve ' + 'ABC'.charAt(i), null, function () {
                        if (step !== 'curve') return;
                        prev = i;
                        bs.forEach(function (o, j) { o.classList.toggle('chx-sel', j === i); });
                        clearMarks(); draw(c);
                        var hits = onCurve(c), n = hits.filter(Boolean).length;
                        info.textContent = 'Through ' + n + ' of 3 paws' + (n < 3 ? ' (misses ' + P.shares.filter(function (s, k) { return !hits[k]; }).map(function (s) { return s.name; }).join(', ') + ')' : '!');
                        use.disabled = false;
                        ctx.sfx('tap');
                    });
                    bs.push(b); row.appendChild(b);
                });
                var use = ctx.btn('Use this curve', 'chx-go', function () {
                    if (step !== 'curve' || prev < 0) return;
                    var c = P.curves[prev];
                    if (onCurve(c).indexOf(false) >= 0) { ctx.wrong('That curve misses a paw!'); return; }
                    curve = c; step = 'read';
                    bs.forEach(function (o) { o.disabled = true; });
                    use.disabled = true;
                    info.textContent = fmt(c);
                    ctx.tip('That curve fits all three paws. Now tap the dot on the <b>yellow edge</b> (x = 0): the secret.');
                    ctx.hint('In the yellow column on the left, one square has a dot. Tap it.');
                    ctx.sfx('point');
                });
                use.disabled = true;
                row.appendChild(use);
            }

            /* ---- Normal and Hard: two of three shares fix the line ---- */
            function pickShare(i) {
                if (P.k === 3) return;
                if (step !== 'pick' && step !== 'read') return;
                var at = picked.indexOf(i);
                if (at >= 0) picked.splice(at, 1);
                else { if (picked.length === 2) picked.shift(); picked.push(i); }
                P.shares.forEach(function (s, j) { s.btn.classList.toggle('chx-sel', picked.indexOf(j) >= 0); });
                clearMarks();
                ctx.sfx('tap');
                if (picked.length < 2) {
                    curve = null; step = 'pick';
                    info.textContent = picked.length ? 'One share alone fits every secret. Pick a second one.' : '';
                    return;
                }
                var a = P.shares[picked[0]], b = P.shares[picked[1]];
                curve = lineThrough(a, b);
                draw(curve);
                step = 'read';
                var third = P.shares.filter(function (s, j) { return picked.indexOf(j) < 0; })[0];
                info.textContent = 'The line through ' + a.name + ' and ' + b.name + ' (wrapping at 11). ' +
                    (evalPoly(curve, third.x) === third.y ? third.name + ' is on it too!' : '');
                ctx.tip('Two paws fix the line. Now tap where the dots meet the <b>yellow edge</b> (x = 0): that is the secret.');
                ctx.hint('Look at the yellow column on the left: exactly one of its squares has a dot. Tap it.');
            }
            function normalStart() {
                step = 'pick';
                ctx.tip('The vault code is split among three ' + ctx.pet + 's: any <b>two</b> can open it. <b>Tap two of them</b> to draw the line through their points, ' +
                    'then tap where it meets the <b>yellow edge</b> (x = 0).');
                ctx.hint('Tap two names at the top. The dots of the line wrap around at 11, like a clock. Then tap the dot in the yellow column.');
            }
            function hardStart() {
                step = 'quiz';
                var s = P.shares[0];
                P.shares.forEach(function (o, j) { if (j) { o.btn.hidden = true; cells[o.x][o.y].classList.remove('sh'); cells[o.x][o.y].innerHTML = ''; } });
                ctx.tip('A spy got only <b>' + s.name + '</b>’s share (' + s.x + ', ' + s.y + '). Any two shares rebuild the code on a line. ' +
                    '<b>How many codes are still possible</b> for the spy?');
                ctx.hint('Through one point and ANY point of the yellow edge there is a line. So how many secrets fit?');
                [['Just one', false], ['Two or three', false], ['All 11 (0 to 10)', true]].forEach(function (c) {
                    row.appendChild(ctx.btn(c[0], null, function () {
                        if (step !== 'quiz') return;
                        if (!c[1]) { ctx.wrong('Try it: a line through the share fits any point on the yellow edge.'); return; }
                        step = 'show';
                        row.innerHTML = '';
                        info.textContent = 'Every secret from 0 to 10 has its own line through this share. One share says nothing.';
                        var t = 0;
                        (function fan() {
                            if (!ctx.alive()) return;
                            clearMarks();
                            if (t <= 10) { draw(lineThrough({ x: 0, y: t }, s), 'ghost'); t++; ctx.later(fan, 170); return; }
                            P.shares.forEach(function (o, j) {
                                if (!j) return;
                                o.btn.hidden = false;
                                var mark = ctx.h('span', null, o.name.charAt(0));
                                mark.style.background = o.color;
                                cells[o.x][o.y].classList.add('sh'); cells[o.x][o.y].appendChild(mark);
                            });
                            ctx.say('Now all three ' + Pets.toLowerCase() + ' came. Use two!', 1800);
                            normalStart();
                        })();
                        ctx.sfx('point');
                    }));
                });
            }

            if (P.k === 3) easyStart();
            else if (ctx.hard) hardStart();
            else normalStart();
        }
    });
})();
