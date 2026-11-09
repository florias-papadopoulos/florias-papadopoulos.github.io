    /* ---------- Zero Knowledge, part 60: the number levels, played on a chalkboard between the pet and Hoot.
       Square Root Club (square roots mod n, the one-bit round of Fiat-Shamir identification) and Bell Tower (Schnorr
       identification), each with an impostor part, and in Bell Tower a careless prover who used the same r twice. ---------- */
    /* the chalkboard scene: lines [{ t: text, c: colour }] (c: 'ok', 'bad', 'dim' or a colour), shout: Hoot's bubble */
    function boardScene(K, S) {
        return function (g, W, H, t) {
            g.fillStyle = K.dog ? '#efe2cc' : '#e8e2f0'; g.fillRect(0, 0, W, H);
            var wide = W > 760, cs = wide ? clamp(H * 0.5, 80, 170) : clamp(H * 0.27, 48, 84);
            var bw = wide ? Math.min(600, W - 2 * Math.min(220, W * 0.22)) : W - 16;
            var bh = wide ? H - 16 : H - cs - 14, bx = (W - bw) / 2, by = 8;
            rr(g, bx, by, bw, bh, 10); fillStroke(g, '#2f4a3a', '#6b4a2b', 6);
            var lines = S.lines || [], n = Math.max(lines.length, 5);
            /* the font: as big as fits both the number of lines and the longest line */
            g.font = '700 20px ui-monospace, Menlo, Consolas, monospace';
            var longest = 1;
            lines.forEach(function (ln) { longest = Math.max(longest, g.measureText(ln.t).width); });
            var fs = clamp(Math.min(bh / (n * 1.5 + 0.6), 20 * (bw - 24) / longest), 9, 21);
            g.font = '700 ' + fs.toFixed(1) + 'px ui-monospace, Menlo, Consolas, monospace';
            g.textAlign = 'left'; g.textBaseline = 'middle';
            lines.forEach(function (ln, i) {
                var c = ln.c === 'ok' ? '#9fe0a6' : ln.c === 'bad' ? '#ff9db3' : ln.c === 'dim' ? '#a9c2b2' : ln.c === 'hi' ? '#ffe08a' : ln.c || '#f2f5ef';
                g.fillStyle = c;
                g.fillText(ln.t, bx + 12, by + fs * 1.2 + i * fs * 1.5);
            });
            if (wide) {
                drawPet(g, K.C, bx / 2, H - 6, cs, { t: t, look: 1, mood: S.mood || null });
                drawOwl(g, W - bx / 2, H - 6, cs, { shout: S.shout || '', look: -1, frown: !!S.frown });
            } else {
                drawPet(g, K.C, cs * 0.5, H - 2, cs, { t: t, look: 1, mood: S.mood || null });
                drawOwl(g, W - cs * 0.55, H - 2, cs, { look: -1, frown: !!S.frown });
                if (S.shout) bubble(g, W - cs * 1.05, H - cs * 0.55, S.shout, 13);
            }
        };
    }

    /* ================= Square Root Club ================= */
    level({
        id: 'roots', name: 'Square Root Club', tag: 'Square roots mod n', role: 'honest', toolbox: true,
        intro: function (K) {
            return 'The club password is a square root. Everyone knows n and v; only members know s, a number with s × s = v (mod n). ' +
                'Finding s from v is as hard as splitting n into its two primes.\n' +
                'A round: you pick a random r and send x = r² mod n. Hoot asks for c = 0 or c = 1. For 0 you send y = r, for 1 you send y = r × s mod n. ' +
                'Hoot checks y² = x (for 0) or y² = x × v (for 1). You compute y; the clock is running.';
        },
        build: function (K) {
            var P = LOGIC.genSq(K.rnd, K.lv), HON = K.hard ? 4 : 3, BLUFF = 3;
            var S = { lines: [], shout: '' }, phase = 'honest', round = 0, passes = 0, r = 0, x = 0, c = 0, timer = null, helped = false, ready = 0;
            K.draw = boardScene(K, S);
            function odds() { K.odds('A cheater gets this far: ' + (passes ? oneIn(Math.pow(2, passes)) : 'always'), Math.pow(0.5, passes)); }
            function head() {
                return [{ t: 'Public: n = ' + P.n + ', v = ' + P.v, c: 'dim' },
                    phase === 'honest' ? { t: 'Your secret: s = ' + P.s + ' (s² = ' + (P.s * P.s) + ' = v mod n)', c: 'hi' } : { t: 'Your secret: none! (impostor)', c: 'bad' }];
            }
            function startHonest() {
                helped = false;
                r = LOGIC.sqR(K.rnd, P.n, K.lv); x = mulmod(r, r, P.n);
                S.lines = head().concat([{ t: 'You pick r = ' + r + ', send x = r² mod n' }, { t: '  x = ' + (r * r) + ' mod ' + P.n + ' = ' + x }]);
                S.shout = ''; S.mood = null; S.frown = false;
                K.msg('Round ' + (round + 1) + ' of ' + HON + '. You sent x. Hoot flips his coin...');
                K.ctrl();
                K.later(function () {
                    c = K.rnd() < 0.5 ? 0 : 1;
                    S.shout = 'c = ' + c + '!';
                    S.lines.push({ t: 'Hoot asks c = ' + c + ': send y = ' + (c ? 'r × s mod n' : 'r'), c: 'hi' });
                    if (c && !K.hard) S.lines.push({ t: '  r × s = ' + r + ' × ' + P.s + ' = ' + (r * P.s) + ', now mod ' + P.n, c: 'dim' });
                    K.sfx('pop');
                    K.msg(c ? 'Send <b>y = r × s mod ' + P.n + '</b>.' : 'Easy one: send <b>y = r</b>.');
                    var ctl = K.ctrl(), pad = K.numpad({ label: 'y', digits: 3, onSubmit: answer });
                    ctl.appendChild(pad.el);
                    if (c && K.hard) ctl.appendChild(K.btn('Help (no speed bonus)', null, function (e) {
                        if (helped) return; helped = true; e.target.disabled = true;
                        S.lines.push({ t: '  r × s = ' + (r * P.s) + ', now mod ' + P.n, c: 'dim' });
                    }));
                    timer = K.timer(c ? (K.hard ? 40 : 45) : 15, function () { answer(null); });
                }, 900);
            }
            function answer(y) {
                if (!timer) return;
                var left = helped ? 0 : timer.frac(); timer.stop(); timer = null;
                K.ctrl();
                if (y === null) { S.shout = 'Too slow.'; if (K.strike('Too slow!')) K.later(next, 1300); return; }
                var ok = LOGIC.sqCheck(P, x, c, y);
                S.lines.push({ t: 'Check: y² = ' + mulmod(y, y, P.n) + ', ' + (c ? 'x × v = ' + mulmod(x, P.v, P.n) : 'x = ' + x) + (ok ? '  ✓' : '  ✗'), c: ok ? 'ok' : 'bad' });
                if (ok) {
                    passes++; odds();
                    S.shout = 'Correct.'; S.mood = 'happy';
                    K.sfx('point'); K.points(20 + Math.round(20 * left));
                    K.msg('Right! Hoot saw x and y, two numbers that look random, and one check that works.');
                    K.later(next, 1300);
                } else {
                    S.shout = 'Wrong!'; S.frown = true;
                    K.msg('Not quite: the answer was y = ' + LOGIC.sqAnswer(P, r, c) + '.');
                    if (K.strike('That check failed.')) K.later(next, 1900);
                }
            }
            function startBluff() {
                S.lines = head().concat([{ t: 'Trick: pick r, then get ready', c: 'dim' }, { t: ' for 0: send x = r², answer y = r', c: 'dim' }, { t: ' for 1: send x = r² / v, answer y = r', c: 'dim' }]);
                S.shout = ''; S.mood = null; S.frown = false;
                K.msg('Round ' + (round + 1) + ' of ' + BLUFF + ' without s. Both tricks send an x that looks like any other. <b>Which challenge do you get ready for?</b>');
                var ctl = K.ctrl();
                ctl.appendChild(K.btn('Ready for 0', null, function () { bluff(0); }));
                ctl.appendChild(K.btn('Ready for 1', null, function () { bluff(1); }));
            }
            function bluff(b) {
                ready = b;
                r = LOGIC.sqR(K.rnd, P.n, K.lv); x = LOGIC.sqCheat(P, r, b);
                S.lines = head().concat([{ t: 'r = ' + r + ', ready for ' + b + ': send x = ' + x }]);
                K.ctrl();
                K.msg('You sent x = ' + x + '. Hoot flips his coin...');
                K.later(function () {
                    c = K.rnd() < 0.5 ? 0 : 1;
                    S.shout = 'c = ' + c + '!';
                    S.lines.push({ t: 'Hoot asks c = ' + c, c: 'hi' });
                    if (c === ready) {
                        var ok = LOGIC.sqCheck(P, x, c, r);
                        S.lines.push({ t: 'You send y = ' + r + '. Check: ' + (ok ? '✓' : '✗'), c: 'ok' });
                        passes++; odds();
                        K.sfx('point'); K.points(5);
                        K.msg('He asked for the one you were ready for. Passed, by luck.');
                        K.later(nextBluff, 1400);
                    } else {
                        S.lines.push({ t: c ? 'Need y with y² = x × v: no way!' : 'Need y with y² = x: no way!', c: 'bad' });
                        S.shout = 'Caught you!'; S.frown = true;
                        K.sfx('hit');
                        K.msg('You were ready for the other one. Without s (or the primes of n) there is no way to find that square root. Caught.');
                        end();
                    }
                }, 900);
            }
            function next() {
                round++;
                if (round < HON) { startHonest(); return; }
                phase = 'bluff'; round = 0; passes = 0;
                K.role('cheat'); odds();
                S.lines = head(); S.shout = '';
                K.msg('Now pretend you are an impostor who does not know s. There is a trick that answers <b>one</b> of the two challenges...');
                var ctl = K.ctrl();
                ctl.appendChild(K.btn('Show the trick', 'zk-go', startBluff));
            }
            function nextBluff() {
                round++;
                if (round >= BLUFF) { K.msg('Three lucky rounds in a row (1 in 8). Real logins run 20 to 40 rounds, or many secrets at once.'); end(); return; }
                startBluff();
            }
            function end() {
                var ctl = K.ctrl();
                ctl.appendChild(K.btn('Next gate', 'zk-go', function () {
                    K.done('The impostor can prepare for c = 0 or for c = 1, never both: answering both for one x would mean knowing a square root of v. ' +
                        'This is the idea behind Fiat-Shamir identification, and turned into a signature it needs no Hoot at all.');
                }));
            }
            odds();
            startHonest();
        }
    });

    /* ================= Bell Tower ================= */
    level({
        id: 'bell', name: 'Bell Tower', tag: 'Schnorr identification', role: 'honest', toolbox: true,
        intro: function (K) {
            var G = LOGIC.GROUPS[K.lv];
            return 'The tower door knows a public number y = g^x mod p. Your secret is x. Here g = ' + G.g + ', p = ' + G.p + ', and exponents count modulo q = ' + G.q + '.\n' +
                'A round: you pick a random r and ring the bell with t = g^r mod p. Hoot calls out a challenge c. You answer s = r + c × x mod ' + G.q + '. ' +
                'Hoot checks g^s = t × y^c mod p. You compute s; the board shows the numbers.' + (K.easy ? '' : ' After that: what if someone uses the same r twice?');
        },
        build: function (K) {
            var Sc = LOGIC.genSchnorr(K.rnd, K.lv), q = Sc.q, HON = K.hard ? 4 : 3, BLUFF = K.easy ? 1 : 2;
            var S = { lines: [], shout: '' }, phase = 'honest', round = 0, passes = 0, r = 0, t = 0, c = 0, timer = null, tries = 0, guess = 0;
            K.draw = boardScene(K, S);
            function odds() {
                var p = Math.pow(1 / (q - 1), passes);
                K.odds('A cheater gets this far: ' + (passes ? oneIn(1 / p) : 'always'), p);
            }
            function head(secret) {
                return [{ t: 'Public: g = ' + Sc.g + ', p = ' + Sc.p + ', q = ' + q + ', y = ' + Sc.y, c: 'dim' },
                    secret ? { t: 'Your secret: x = ' + Sc.x + ' (g^x = y)', c: 'hi' } : { t: 'Your secret: none! (impostor)', c: 'bad' }];
            }
            function startHonest() {
                r = ri(K.rnd, 1, q - 1); t = powmod(Sc.g, r, Sc.p);
                S.lines = head(true).concat([{ t: 'You pick r = ' + r + ', ring t = g^r = ' + t }]);
                S.shout = ''; S.mood = null; S.frown = false;
                K.msg('Round ' + (round + 1) + ' of ' + HON + '. Ding! Hoot thinks of a challenge...');
                K.ctrl();
                K.later(function () {
                    c = ri(K.rnd, 1, q - 1);
                    S.shout = 'c = ' + c + '!';
                    S.lines.push({ t: 'Hoot: c = ' + c, c: 'hi' });
                    S.lines.push({ t: 's = r + c × x = ' + r + ' + ' + c + ' × ' + Sc.x + (K.easy ? ' = ' + (r + c * Sc.x) : '') + ', mod ' + q, c: 'dim' });
                    K.sfx('pop');
                    K.msg('Send <b>s = r + c × x mod ' + q + '</b>.');
                    var ctl = K.ctrl();
                    ctl.appendChild(K.numpad({ label: 's', digits: 2, onSubmit: answer }).el);
                    timer = K.timer(K.hard ? 25 : 30, function () { answer(null); });
                }, 800);
            }
            function answer(s) {
                if (!timer) return;
                var left = timer.frac(); timer.stop(); timer = null;
                K.ctrl();
                if (s === null) { S.shout = 'Too slow.'; if (K.strike('Too slow!')) K.later(next, 1300); return; }
                var ok = s < q && LOGIC.schCheck(Sc, t, c, s);
                S.lines.push({ t: 'Check: g^s = ' + powmod(Sc.g, s, Sc.p) + ', t × y^c = ' + mulmod(t, powmod(Sc.y, c, Sc.p), Sc.p) + (ok ? '  ✓' : '  ✗'), c: ok ? 'ok' : 'bad' });
                if (ok) {
                    passes++; odds();
                    S.shout = 'Correct.'; S.mood = 'happy';
                    K.sfx('point'); K.points(20 + Math.round(20 * left));
                    K.msg('Right! Because r is random and fresh, s looks random too: it tells Hoot nothing about x.');
                    K.later(next, 1300);
                } else {
                    S.shout = 'Wrong!'; S.frown = true;
                    K.msg('Not quite: s = ' + LOGIC.schAnswer(Sc, r, c) + (s >= q ? ' (answers count mod ' + q + ', so below ' + q + ')' : '') + '.');
                    if (K.strike('That check failed.')) K.later(next, 1900);
                }
            }
            function startBluff() {
                S.lines = head(false).concat([{ t: 'Trick: bet on a challenge c\', pick any s,', c: 'dim' }, { t: 'and ring t = g^s × y^(-c\') backwards', c: 'dim' }]);
                S.shout = ''; S.mood = null; S.frown = false;
                K.msg('Without x you can still bluff: bet on the challenge Hoot will call. <b>Pick your bet</b> (Hoot picks from 1 to ' + (q - 1) + ').');
                var ctl = K.ctrl();
                if (q <= 11) for (var i = 1; i < q; i++) (function (v) { ctl.appendChild(K.btn(String(v), 'zk-sym', function () { bluff(v); })); })(i);
                else ctl.appendChild(K.numpad({ label: 'Your bet', digits: 2, onSubmit: function (v) { if (v >= 1 && v < q) bluff(v); else K.say('From 1 to ' + (q - 1) + '!'); } }).el);
            }
            function bluff(b) {
                guess = b;
                var s = ri(K.rnd, 0, q - 1);
                t = LOGIC.schFake(Sc, b, s);
                S.lines = head(false).concat([{ t: 'Bet c\' = ' + b + ', s = ' + s + ': ring t = ' + t }]);
                K.ctrl();
                K.msg('Ding! You rang t = ' + t + ', made to fit your bet. Hoot calls...');
                K.later(function () {
                    c = ri(K.rnd, 1, q - 1);
                    S.shout = 'c = ' + c + '!';
                    S.lines.push({ t: 'Hoot: c = ' + c, c: 'hi' });
                    if (c === guess) {
                        S.lines.push({ t: 'You send s = ' + s + '. Check ✓', c: 'ok' });
                        passes++; odds();
                        K.sfx('point'); K.points(5);
                        K.msg('Your bet was right, a ' + oneIn(q - 1) + ' chance!');
                    } else {
                        S.lines.push({ t: 'No s fits this t for c = ' + c + ' without x.', c: 'bad' });
                        S.shout = 'Caught you!'; S.frown = true;
                        K.sfx('hit');
                        K.msg('Wrong bet. Here one round already stops a cheater ' + (q - 2) + ' times in ' + (q - 1) + '.');
                    }
                    round++;
                    var ctl = K.ctrl();
                    if (c === guess && round < BLUFF) ctl.appendChild(K.btn('Bet again', 'zk-go', startBluff));
                    else ctl.appendChild(K.btn(K.easy ? 'Next gate' : 'Go on', 'zk-go', K.easy ? fact : startLeak));
                }, 900);
            }
            /* a prover who rang the same t twice gives two answers to one t, and with them x */
            var leak = null;
            function startLeak() {
                K.role('check');
                var r0 = ri(K.rnd, 1, q - 1), d = K.hard ? 2 : 1, c2 = ri(K.rnd, 1, q - 1 - d), c1 = c2 + d;
                leak = { t: powmod(Sc.g, r0, Sc.p), c1: c1, c2: c2, s1: LOGIC.schAnswer(Sc, r0, c1), s2: LOGIC.schAnswer(Sc, r0, c2), d: d };
                tries = 0;
                S.lines = [{ t: 'Public: g = ' + Sc.g + ', p = ' + Sc.p + ', q = ' + q + ', y = ' + Sc.y, c: 'dim' },
                    { t: 'A careless prover rang t = ' + leak.t + ' twice:' },
                    { t: ' c = ' + c1 + ' answered s = ' + leak.s1 },
                    { t: ' c = ' + c2 + ' answered s = ' + leak.s2 },
                    { t: 's1 - s2 = (c1 - c2) × x  (mod ' + q + ')', c: 'hi' }];
                if (d === 2) S.lines.push({ t: 'Hint: dividing by 2 mod ' + q + ' = times ' + inv(2, q), c: 'dim' });
                S.shout = ''; S.mood = 'wow';
                K.msg('Same r, two challenges: subtract the answers and r cancels out. <b>Find the secret x</b> of this careless prover.');
                var ctl = K.ctrl();
                ctl.appendChild(K.numpad({ label: 'x', digits: 2, onSubmit: leakAnswer }).el);
            }
            function leakAnswer(v) {
                var x = LOGIC.schExtract(Sc, leak.c1, leak.s1, leak.c2, leak.s2);
                if (v === x) {
                    K.ctrl();
                    S.lines.push({ t: 'x = ' + x + '. Check: g^x = ' + powmod(Sc.g, x, Sc.p) + ' = y  ✓', c: 'ok' });
                    K.sfx('point'); K.points(30, 'secret found');
                    K.msg('Got it: x = ' + x + '. Two answers to one t give the secret away. That is also why the proof is sound: whoever can answer two challenges for one t must know x.');
                    end();
                    return;
                }
                tries++;
                K.sfx('hit');
                if (tries === 1) {
                    S.lines.push({ t: 's1 - s2 = ' + mod(leak.s1 - leak.s2, q) + ' (mod ' + q + '), c1 - c2 = ' + leak.d, c: 'dim' });
                    K.msg('Not that. Subtract: s1 - s2 (mod ' + q + ') ' + (leak.d === 1 ? 'is already x, as c1 - c2 = 1.' : 'and then divide by 2 (times ' + inv(2, q) + ', mod ' + q + ').'));
                } else {
                    K.ctrl();
                    S.lines.push({ t: 'x = ' + x, c: 'bad' });
                    if (K.strike('The secret was ' + x + '.')) end();
                }
            }
            function next() {
                round++;
                if (round < HON) { startHonest(); return; }
                phase = 'bluff'; round = 0; passes = 0;
                K.role('cheat'); odds();
                startBluff();
            }
            function fact() {
                K.done('Schnorr identification: one round with a big group already stops cheaters, since c can take almost q values. ' +
                    'With q near 2^256 and a hash in place of Hoot, it becomes the Schnorr signature used by many modern systems. Never reuse r!');
            }
            function end() { var ctl = K.ctrl(); ctl.appendChild(K.btn('Next gate', 'zk-go', fact)); }
            odds();
            startHonest();
        }
    });
