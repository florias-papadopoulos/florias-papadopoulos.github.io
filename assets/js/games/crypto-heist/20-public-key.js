/* Crypto Heist, part 20: the public-key basics (see README.md and the header of 00-core.js for the room kit ctx).
     Clock Shop (modular arithmetic): a clock dial with n hours; turn the hand (or tap a number, or type on the pad for
       a big clock) to answer a few quick "mod" questions.
     Tiny RSA: one screen, step by step: lock a number with the public key, crack N into its primes (Normal and Hard),
       find phi and the secret key d, then open the vault's locked number with the power machine. */
(function () {
    'use strict';

    function style(ctx, text) { var s = document.createElement('style'); s.textContent = text; ctx.el.appendChild(s); }
    var BASE_CSS =
        '.chp-lab { font: 700 .72rem/1.2 system-ui, sans-serif; color: #7a7393; text-transform: uppercase; letter-spacing: .05em; }' +
        '.chp-q { font: 800 1.7rem/1.2 ui-monospace, Menlo, Consolas, monospace; text-align: center; }' +
        '.chp-q sup { font-size: .6em; }' +
        '.chp-sub { margin: 0; text-align: center; color: #423b5e; line-height: 1.4; }';

    /* ======================= Clock Shop ======================= */
    var CLOCK_CSS = BASE_CSS +
        '.chp-dial { position: relative; width: 250px; height: 250px; border: 3px solid #231f3a; border-radius: 50%; background: #fff; flex: none; }' +
        '.chp-dial .n { position: absolute; width: 38px; height: 38px; margin: -19px 0 0 -19px; padding: 0; border: 2px solid transparent;' +
        '  border-radius: 50%; background: transparent; font: 800 1.05rem/1 ui-monospace, Menlo, Consolas, monospace; z-index: 2; }' +
        '.chp-dial .n.on { background: #ffb400; border-color: #231f3a; }' +
        '.chp-dial .tick { position: absolute; left: 50%; top: 50%; font: 700 .8rem/1 ui-monospace, Menlo, Consolas, monospace; color: #7a7393;' +
        '  transform: translate(-50%, -50%); }' +
        '.chp-hand { position: absolute; left: 50%; bottom: 50%; width: 6px; height: 82px; margin-left: -3px; border-radius: 3px; background: #231f3a;' +
        '  transform-origin: 50% 100%; transition: transform .18s; }' +
        '.chp-hub { position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: #231f3a; }' +
        '.chp-dial .val { position: absolute; left: 50%; top: 62%; transform: translateX(-50%); font: 800 1.3rem/1 ui-monospace, Menlo, Consolas, monospace; color: #4a5bd4; }' +
        '.chp-ctl { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }' +
        '.chp-ctl[hidden], .chx-room .chx-pad[hidden] { display: none; }' +
        '.chp-ctl .chx-btn { min-width: 52px; font-size: 1.2rem; }' +
        '.chp-prog { display: flex; gap: 6px; justify-content: center; }' +
        '.chp-prog i { width: 26px; height: 8px; border-radius: 4px; background: #ddd8ee; }' +
        '.chp-prog i.done { background: #2f8a3a; } .chp-prog i.now { background: #ffb400; }' +
        '@media (max-width: 420px) { .chp-dial { width: 230px; height: 230px; } .chp-hand { height: 74px; } }';

    var SUPER = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷' };
    /* a question: { text (html), n, ans, hint } */
    function clockQ(ctx, type) {
        var mod = ctx.mod, n, a, b, k;
        if (type === 'plain' || type === 'plainBig') {
            n = ctx.ri(5, 12);
            do { a = type === 'plain' ? ctx.ri(13, 60) : ctx.ri(61, 150); } while (a % n === 0);
            k = Math.floor(a / n);
            return { text: a + ' mod ' + n, n: n, ans: a % n, hint: a + ' = ' + k + ' x ' + n + ' + ' + (a % n) + ': ' + k + ' full turns of the ' + n + ' hour clock and ' + (a % n) + ' left over.' };
        }
        if (type === 'neg') {
            n = ctx.ri(5, 12);
            do { a = ctx.ri(2, n + 6); } while (a % n === 0);
            return { text: '-' + a + ' mod ' + n, n: n, ans: mod(-a, n), hint: 'Walk ' + a + ' steps backwards from 0. Or add ' + n + ' until it is not negative: -' + a + ' + ' + (n * Math.ceil(a / n)) + ' = ' + mod(-a, n) + '.' };
        }
        if (type === 'prod') {
            n = ctx.ri(5, 12); a = ctx.ri(3, 12); b = ctx.ri(3, 12);
            return { text: a + ' x ' + b + ' mod ' + n, n: n, ans: (a * b) % n, hint: a + ' x ' + b + ' = ' + (a * b) + ' = ' + Math.floor(a * b / n) + ' x ' + n + ' + ' + ((a * b) % n) + '.' };
        }
        if (type === 'big') {
            /* a times (n + 1) or (n - 1) on a big clock: n + 1 counts as 1, n - 1 counts as -1 */
            n = ctx.pick([24, 50, 60, 99, 100]); a = ctx.ri(2, 9);
            if (ctx.rnd() < 0.5) return { text: a + ' x ' + (n + 1) + ' mod ' + n, n: n, ans: a, hint: (n + 1) + ' is ' + n + ' + 1, so on this clock it counts as 1: ' + a + ' x ' + (n + 1) + ' lands where ' + a + ' x 1 does.' };
            return { text: a + ' x ' + (n - 1) + ' mod ' + n, n: n, ans: n - a, hint: (n - 1) + ' is 1 short of ' + n + ', so on this clock it counts as -1: ' + a + ' x ' + (n - 1) + ' lands at -' + a + ', which is ' + (n - a) + '.' };
        }
        /* a small power, worked out one multiplication at a time in the hint */
        n = ctx.pick([5, 7, 11, 13]); b = ctx.ri(2, 5); var e = ctx.ri(3, 5), v = 1, steps = [];
        for (var i = 0; i < e; i++) { v = (v * b) % n; steps.push(v); }
        return { text: b + '<sup>' + e + '</sup> mod ' + n, n: n, ans: ctx.powmod(b, e, n), hint: 'Multiply by ' + b + ' one step at a time and wrap each time: ' + steps.join(', then ') + '.' };
    }

    room({
        id: 'clock-shop', name: 'Clock Shop', tag: 'Modular arithmetic', order: 40,
        time: { easy: 90, normal: 70, hard: 75 },
        build: function (ctx) {
            style(ctx, CLOCK_CSS);
            var qs;
            if (ctx.easy) qs = [
                { text: '23 mod 5', n: 5, ans: 3, hint: '23 = 4 x 5 + 3: four full turns of the 5 hour clock and 3 left over.' },
                { text: '-4 mod 11', n: 11, ans: 7, hint: 'Walk 4 steps backwards from 0: 10, 9, 8, 7. Or add 11: -4 + 11 = 7.' },
                { text: '2 x 100 mod 99', n: 99, ans: 2, hint: '100 is 99 + 1, so on a 99 clock it counts as 1: 2 x 100 lands where 2 x 1 does.' },
                { text: '122 mod 11', n: 11, ans: 1, hint: '122 = 11 x 11 + 1: eleven full turns and 1 left over.' }];
            else if (ctx.hard) qs = [clockQ(ctx, 'plainBig'), clockQ(ctx, 'neg'), clockQ(ctx, 'big'), clockQ(ctx, 'pow')];
            else qs = [clockQ(ctx, 'plain'), clockQ(ctx, 'neg'), clockQ(ctx, ctx.pick(['prod', 'big']))];

            var qi = 0, val = 0, mode = 'dial', busy = false;
            var prog = ctx.h('div', 'chp-prog'), progEls = qs.map(function () { var i = ctx.h('i'); prog.appendChild(i); return i; });
            var qEl = ctx.h('div', 'chp-q'), sub = ctx.h('p', 'chp-sub');
            var dial = ctx.h('div', 'chp-dial'), hand = ctx.h('div', 'chp-hand'), hub = ctx.h('div', 'chp-hub'), shown = ctx.h('div', 'val');
            var ctl = ctx.h('div', 'chp-ctl');
            var minus = ctx.btn('−', null, function () { turn(-1); }), plus = ctx.btn('+', null, function () { turn(1); });
            minus.setAttribute('aria-label', 'Turn back'); plus.setAttribute('aria-label', 'Turn on');
            var set = ctx.btn('Set', 'chx-go', function () { answer(val); });
            ctl.appendChild(minus); ctl.appendChild(plus); ctl.appendChild(set);
            var pad = ctx.numpad({ label: 'Where the hand stops', digits: 3, onSubmit: function (v) { if (mode === 'pad') answer(v); } });
            ctx.on(pad.el, 'click', function () { if (mode === 'pad') { var v = pad.value(); point(v == null ? 0 : v); } });
            ctx.key(function () { if (mode === 'pad') { var v = pad.value(); point(v == null ? 0 : v); } });
            [prog, qEl, sub, dial, ctl, pad.el].forEach(function (e) { ctx.el.appendChild(e); });
            var nums = [];

            function point(v) {
                var n = qs[qi].n;
                val = v;
                hand.style.transform = 'rotate(' + (360 * (mod(v, n)) / n) + 'deg)';
                nums.forEach(function (b, i) { b.classList.toggle('on', i === v); });
                shown.textContent = mode === 'pad' ? (v >= n ? v + '?' : String(v)) : '';
            }
            function mod(a, n) { return ctx.mod(a, n); }
            function show() {
                var q = qs[qi], n = q.n;
                progEls.forEach(function (e, i) { e.className = i < qi ? 'done' : i === qi ? 'now' : ''; });
                qEl.innerHTML = q.text + ' = ?';
                mode = n <= 13 ? 'dial' : 'pad';
                sub.textContent = mode === 'dial' ? 'A clock with ' + n + ' hours, 0 to ' + (n - 1) + '. Turn the hand to the answer.'
                    : 'A big clock with ' + n + ' hours, 0 to ' + (n - 1) + '. Type where the hand stops.';
                dial.innerHTML = ''; nums = [];
                var R = dial.offsetWidth ? dial.offsetWidth / 2 - 24 : 101;
                if (mode === 'dial') {
                    for (var i = 0; i < n; i++) (function (i) {
                        var ang = 2 * Math.PI * i / n, b = ctx.h('button', 'n', String(i));
                        b.type = 'button';
                        b.style.left = (50 + 50 * (R / (R + 24)) * Math.sin(ang)) + '%';
                        b.style.top = (50 - 50 * (R / (R + 24)) * Math.cos(ang)) + '%';
                        b.setAttribute('aria-label', String(i));
                        b.addEventListener('click', function () { if (ctx.alive() && !busy) { ctx.sfx('move'); point(i); } });
                        dial.appendChild(b); nums.push(b);
                    })(i);
                } else {
                    [0, n / 4, n / 2, 3 * n / 4].forEach(function (t, j) {
                        var ang = 2 * Math.PI * j / 4, s = ctx.h('div', 'tick', String(Math.round(t)));
                        s.style.left = (50 + 40 * Math.sin(ang)) + '%'; s.style.top = (50 - 40 * Math.cos(ang)) + '%';
                        dial.appendChild(s);
                    });
                }
                dial.appendChild(hand); dial.appendChild(hub); dial.appendChild(shown);
                ctl.hidden = mode !== 'dial';
                pad.el.hidden = mode !== 'pad';
                pad.clear();
                ctx.tip(mode === 'dial' ? 'Turn the hand with <b>−</b> and <b>+</b> (or tap a number), then press <b>Set</b>. <b>a mod n</b> is where the hand stops after a steps around a clock with n hours.'
                    : 'Type the answer on the pad and press <b>OK</b>. <b>a mod n</b> is where the hand stops after a steps around a clock with n hours.');
                ctx.hint(q.hint);
                point(0);
            }
            function turn(d) { if (busy || mode !== 'dial') return; ctx.sfx('move'); point(mod(val + d, qs[qi].n)); }
            function answer(v) {
                if (busy) return;
                var q = qs[qi];
                if (v !== q.ans) {
                    ctx.wrong(v >= q.n ? 'On this clock there is no ' + v + ': it only goes up to ' + (q.n - 1) + '.' : 'Not ' + v + '. Count again!');
                    pad.clear(); if (mode === 'pad') point(0);
                    return;
                }
                busy = true;
                progEls[qi].className = 'done';
                ctx.sfx('pop'); ctx.mood('happy');
                qEl.innerHTML = q.text + ' = <span class="chx-ok">' + q.ans + '</span>';
                ctx.later(function () {
                    busy = false;
                    if (qi === qs.length - 1) {
                        ctx.solve('Clock arithmetic is the stage of public-key cryptography: RSA, Diffie-Hellman and elliptic curves all compute on a clock with a number of hours hundreds of digits long.');
                        return;
                    }
                    qi++; show();
                }, 700);
            }
            ctx.key(function (e) {
                if (mode !== 'dial') return;
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === '-') { turn(-1); e.preventDefault(); }
                else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === '+') { turn(1); e.preventDefault(); }
                else if (e.key === 'Enter') { answer(val); e.preventDefault(); }
            });
            show();
        }
    });

    /* ======================= Tiny RSA ======================= */
    var PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
    /* one puzzle: p, q, N, phi, e1 (the lock of step 1), e (the vault's lock), d, m1 (to lock), c2 (the vault's number) and m2 */
    function rsaMake(level, ri, pick, shuffle, powmod, inv, gcd) {
        if (level === 'easy') return { p: 7, q: 11, N: 77, phi: 60, e1: 3, m1: 75, c1: 69, e: 7, d: 43, m2: 31, c2: powmod(31, 7, 77),
            phis: [60, 76, 77, 96], ds: [17, 43, 31, 53] };
        var lo = level === 'hard' ? 7 : 3, hi = level === 'hard' ? 29 : 19;
        var pool = PRIMES.filter(function (x) { return x >= lo && x <= hi; });
        for (;;) {
            var p = pick(pool), q = pick(pool);
            if (p === q) continue;
            if (p > q) { var t = p; p = q; q = t; }
            var N = p * q, phi = (p - 1) * (q - 1);
            if (N < 33) continue;
            var es = [3, 5, 7, 11].filter(function (e) { return gcd(e, phi) === 1 && e < phi; });
            es = es.filter(function (e) { return level === 'hard' ? e >= 5 : e <= 7; });   /* the lock step presses x m e times */
            if (!es.length) continue;
            var e = pick(es), d = inv(e, phi);
            if (d === null || d === e) continue;
            var m1 = ri(2, N - 2), m2 = ri(2, N - 2), c2 = powmod(m2, e, N);
            /* the wrong powers must not open it by chance */
            if (c2 === m2 || powmod(c2, e, N) === m2 || powmod(c2, phi, N) === m2 || powmod(c2, N, N) === m2) continue;
            var phis = [phi, N - 1, (p + 1) * (q + 1), N - p];
            if (phis.filter(function (v, i) { return phis.indexOf(v) === i; }).length < 4) continue;
            var ds = [d], want = level === 'hard' ? 5 : 4, guard = 0;
            while (ds.length < want && guard++ < 500) {
                var x = ri(2, phi - 1);
                if (ds.indexOf(x) < 0 && (e * x) % phi !== 1) ds.push(x);
            }
            if (ds.length < want) continue;
            return { p: p, q: q, N: N, phi: phi, e1: e, m1: m1, c1: powmod(m1, e, N), e: e, d: d, m2: m2, c2: c2, phis: shuffle(phis), ds: shuffle(ds) };
        }
    }

    var RSA_CSS = BASE_CSS +
        '.chp-rsa { width: 100%; display: flex; flex-direction: column; gap: 10px; }' +
        '.chp-rsa .chx-card { display: flex; flex-direction: column; gap: 8px; }' +
        '.chp-rsa .chx-card.done { border-color: #2f8a3a; }' +
        '.chp-rsa .chx-card.done .chp-act, .chp-rsa .chx-card.done > p:not(.chp-note), .chp-rsa .chx-card.done .chp-chain { display: none; }' +
        '.chp-rsa h4 { margin: 0; font-size: 1rem; }' +
        '.chp-rsa h4 small { color: #7a7393; font-weight: 700; margin-right: 6px; }' +
        '.chp-rsa p { margin: 0; line-height: 1.45; color: #423b5e; }' +
        '.chp-key { display: flex; flex-wrap: wrap; gap: 6px 16px; justify-content: center; font: 800 1.15rem/1.4 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chp-key span { white-space: nowrap; }' +
        '.chp-chain { font: 800 1.05rem/1.6 ui-monospace, Menlo, Consolas, monospace; text-align: center; word-break: break-word; }' +
        '.chp-chain i { font-style: normal; color: #7a7393; font-weight: 700; font-size: .85em; }' +
        '.chp-act { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }' +
        '.chp-act .chx-btn { min-width: 52px; }' +
        '.chp-res { text-align: center; font-weight: 800; }' +
        '.chp-note { padding: 8px 10px; border-radius: 8px; background: #ffe9a8; color: #231f3a !important; }';

    room({
        id: 'tiny-rsa', name: 'Tiny RSA', tag: 'RSA', order: 50,
        time: { easy: 150, normal: 120, hard: 110 },
        build: function (ctx) {
            style(ctx, RSA_CSS);
            var P = rsaMake(ctx.level, ctx.ri, ctx.pick, ctx.shuffle, ctx.powmod, ctx.inv, ctx.gcd);
            var N = P.N, steps = [], box = ctx.h('div', 'chp-rsa');
            ctx.el.appendChild(box);
            var keyCard = ctx.h('div', 'chx-card');
            var keyRow = ctx.h('div', 'chp-key');
            keyRow.innerHTML = '<span>N = ' + N + (ctx.easy ? ' = 7 x 11' : '') + '</span><span>e = ' + P.e1 + '</span>';
            keyCard.appendChild(ctx.h('div', 'chp-lab', 'The vault\'s public key (anyone may know it)'));
            keyCard.appendChild(keyRow);
            box.appendChild(keyCard);
            function addKey(html) { var s = ctx.h('span'); s.innerHTML = html; keyRow.appendChild(s); }

            function card(n, title) {
                var c = ctx.h('div', 'chx-card'), h = ctx.h('h4');
                h.innerHTML = '<small>Step ' + n + '</small>' + title;
                c.appendChild(h);
                box.appendChild(c);
                ctx.later(function () { try { c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* fine */ } }, 60);
                return c;
            }
            function para(c, html, cls) { var p = ctx.h('p', cls); p.innerHTML = html; c.appendChild(p); return p; }
            function finish(c, html) { c.classList.add('done'); var r = ctx.h('div', 'chp-res chx-ok'); r.innerHTML = html; c.appendChild(r); ctx.sfx('pop'); }
            var n = 0;

            /* step: lock m1 with e1 by pressing "x m" e1 times */
            function stepLock() {
                var c = card(++n, 'Lock a number');
                para(c, 'Locking is a power on the N clock: <b>c = m<sup>e</sup> mod ' + N + '</b>. Lock m = ' + P.m1 + ': press <b>x ' + P.m1 + '</b> ' + (P.e1 === 3 ? 'three' : P.e1) + ' times, then <b>Send</b>.');
                var chain = ctx.h('div', 'chp-chain'), v = 1, k = 0;
                chain.textContent = '1';
                c.appendChild(chain);
                var act = ctx.h('div', 'chp-act');
                var times = ctx.btn('x ' + P.m1, null, function () {
                    if (k >= 20) return;
                    v = (v * P.m1) % N; k++;
                    chain.innerHTML += ' <i>x' + P.m1 + '</i> ' + v;
                    ctx.sfx('move');
                });
                var again = ctx.btn('Start over', null, function () { v = 1; k = 0; chain.textContent = '1'; });
                var send = ctx.btn('Send', 'chx-go', function () {
                    if (k !== P.e1) { ctx.wrong(k === 0 ? 'Press x ' + P.m1 + ' first, ' + P.e1 + ' times.' : k < P.e1 ? 'Only ' + k + ' times so far, it takes ' + P.e1 + '.' : 'That is ' + k + ' times, it takes exactly ' + P.e1 + '.'); return; }
                    finish(c, P.m1 + '<sup>' + P.e1 + '</sup> mod ' + N + ' = ' + v + '. Locked! Anyone can do this.');
                    next();
                });
                act.appendChild(times); act.appendChild(again); act.appendChild(send);
                c.appendChild(act);
                ctx.hint(ctx.easy ? 'Press x 75 three times: 75 x 75 x 75 mod 77, wrapped around the 77 clock each time. (Trick: 75 is -2 on this clock, so the answer is -8, which is 69.)'
                    : 'Press x ' + P.m1 + ' exactly ' + P.e1 + ' times (that is ' + P.m1 + ' to the power ' + P.e1 + '), then Send.');
            }
            /* step (Normal, Hard): crack N into its two primes */
            function stepFactor() {
                var c = card(++n, 'Crack N');
                para(c, 'The secret key hides behind the two primes of N. <b>Which prime divides ' + N + '?</b>');
                var act = ctx.h('div', 'chp-act');
                PRIMES.forEach(function (pr) {
                    act.appendChild(ctx.btn(String(pr), null, function () {
                        if (N % pr) { ctx.wrong(N + ' / ' + pr + ' does not come out even.'); return; }
                        finish(c, N + ' = ' + P.p + ' x ' + P.q + '. Cracked!');
                        next();
                    }));
                });
                c.appendChild(act);
                ctx.hint('Try dividing ' + N + ' by the primes from small to big. One of them lies between ' + (P.p - 2 > 1 ? P.p - 2 : 2) + ' and ' + (P.p + 2) + '.');
            }
            function stepPhi() {
                var c = card(++n, 'Count phi');
                para(c, 'With the primes known, <b>phi = (p - 1) x (q - 1) = (' + P.p + ' - 1) x (' + P.q + ' - 1)</b>. Which is it?');
                ctx.hint('(' + P.p + ' - 1) x (' + P.q + ' - 1) = ' + (P.p - 1) + ' x ' + (P.q - 1) + '.');
                function good() {
                    finish(c, 'phi = ' + P.phi + '.');
                    addKey('phi = ' + P.phi);
                    if (ctx.easy) {
                        para(c, 'But e = 3 cannot be undone on this clock: 3 and 60 share the factor 3 (gcd(3, 60) = 3). So the vault locks its own notes with <b>e = 7</b> instead.', 'chp-note');
                        addKey('vault e = 7');
                    }
                    next();
                }
                if (ctx.hard) {
                    var pad = ctx.numpad({ label: 'phi', digits: 4, onSubmit: function (v) {
                        if (c.classList.contains('done')) return;
                        if (v !== P.phi) { ctx.wrong('Not ' + v + '. Multiply (p - 1) by (q - 1).'); pad.clear(); return; }
                        pad.el.remove(); good();
                    } });
                    pad.el.classList.add('chp-act');
                    c.appendChild(pad.el);
                    return;
                }
                var act = ctx.h('div', 'chp-act');
                P.phis.forEach(function (v) {
                    act.appendChild(ctx.btn(String(v), null, function () {
                        if (v !== P.phi) { ctx.wrong(v === N ? 'That is N itself.' : 'Not ' + v + '. Multiply (p - 1) by (q - 1).'); return; }
                        good();
                    }));
                });
                c.appendChild(act);
            }
            function stepD() {
                var c = card(++n, 'Find the secret key d');
                para(c, 'd undoes e: <b>' + P.e + ' x d mod ' + P.phi + ' = 1</b>. Tap a candidate to test it.');
                var out = ctx.h('div', 'chp-chain'); c.appendChild(out);
                var act = ctx.h('div', 'chp-act');
                P.ds.forEach(function (v) {
                    act.appendChild(ctx.btn(String(v), null, function () {
                        var prod = P.e * v, r = prod % P.phi;
                        out.innerHTML = P.e + ' x ' + v + ' = ' + prod + ' = ' + Math.floor(prod / P.phi) + ' x ' + P.phi + ' + <span class="' + (r === 1 ? 'chx-ok' : 'chx-bad') + '">' + r + '</span>';
                        if (r !== 1) { ctx.wrong('Leaves ' + r + ', not 1.'); return; }
                        finish(c, 'd = ' + v + ': the secret key.');
                        addKey('<span class="chx-ok">d = ' + v + '</span>');
                        next();
                    }));
                });
                c.appendChild(act);
                ctx.hint(ctx.easy ? 'Test them: 7 x 43 = 301 = 5 x 60 + 1, so it leaves 1.' : 'Tap each candidate: the right one gives ' + P.e + ' x d = (some number of ' + P.phi + 's) + 1.');
            }
            function stepOpen() {
                var c = card(++n, 'Open the vault');
                para(c, 'The vault\'s locked number is <b>c = ' + P.c2 + '</b> (locked with e = ' + P.e + '). Unlocking is a power too: which power opens it? The power machine does the big maths.');
                var out = ctx.h('div', 'chp-chain'); c.appendChild(out);
                var act = ctx.h('div', 'chp-act');
                ctx.shuffle([['e', P.e], ['d', P.d], ['phi', P.phi]]).forEach(function (o) {
                    act.appendChild(ctx.btn('power ' + o[0] + ' = ' + o[1], null, function () {
                        var v = ctx.powmod(P.c2, o[1], N);
                        out.innerHTML = P.c2 + '<sup>' + o[1] + '</sup> mod ' + N + ' = ' + v;
                        if (o[0] !== 'd') { ctx.wrong(o[0] === 'e' ? 'Locking again just scrambles it more.' : 'Gibberish. Try the secret key.'); return; }
                        finish(c, 'm = ' + v + '. The vault code! Check: ' + v + '<sup>' + P.e + '</sup> mod ' + N + ' = ' + P.c2 + '.');
                        ctx.say('Vault code ' + v + '!', 1600);
                        ctx.later(function () {
                            ctx.solve('RSA is easy one way: anyone can lock with N and e. Unlocking needs d, and d needs the primes of N. For a small N like this one that is quick, but a real N has over 600 digits and nobody can split it.');
                        }, 1200);
                    }));
                });
                c.appendChild(act);
                ctx.hint('Locking used the public power e. Unlocking uses the secret power d.');
            }
            var flow = ctx.easy ? [stepLock, stepPhi, stepD, stepOpen] : [stepLock, stepFactor, stepPhi, stepD, stepOpen];
            var at = 0;
            function next() { if (at < flow.length) flow[at++](); }
            ctx.tip(ctx.easy ? 'Break tiny RSA step by step: lock a number, then use the primes 7 and 11 to build the secret key and open the vault.'
                : 'Break tiny RSA step by step: lock a number, split N into its two primes, build the secret key and open the vault.');
            next();
        }
    });
})();
