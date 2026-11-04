    room({
        id: 'yes-no-oracle', name: 'Yes-No Oracle', tag: 'Padding oracle', order: 55, hardOnly: true,
        time: { easy: 130, normal: 110, hard: 100 }, make: makeOracle, span: span,
        build: function (ctx) {
            setup(ctx);
            var P = makeOracle(ctx), N = P.N, e = P.e, big = (N + 1) / 2;
            var j = 0, k = 0, cur = P.c, phase = 'ask', ans = null;
            ctx.el.appendChild(card(ctx, 'The vault\'s public key and a locked secret', kv(['N = ' + N, 'e = ' + e, 'c = ' + P.c]) +
                '<p class="chb-txt chx-dim" style="font-size:.88rem">Find the secret number m inside c (m<sup>e</sup> mod N = c).</p>' +
                '<p class="chb-txt" style="margin-top:8px;padding-top:8px;border-top:1px dashed #ddd8ee">The server answers only yes or no: ' +
                '"Does your number decrypt to something <b>big</b>, ' + big + ' or more?"</p><p class="chb-txt" style="margin-top:4px">Trick: multiply by <b class="chb-mono">2<sup>e</sup> mod N = ' + P.t +
                '</b> and the hidden number doubles (mod N), since (2<sup>e</sup>)<sup>d</sup> = 2.</p>'));
            var rc = card(ctx, 'Where the secret can be'), bar = H(ctx, 'div', 'chb-bar', '<i></i><b hidden></b>'), ends = H(ctx, 'div', 'chb-ends');
            var rtxt = H(ctx, 'div', 'chb-c'), log = H(ctx, 'ul', 'chb-log chb-c');
            log.style.fontSize = '.92rem';
            var ctl = ctx.h('div', 'chx-row'), ansEl = H(ctx, 'div', 'chb-big');
            ctl.style.margin = '8px 0';
            rc.appendChild(rtxt); rc.appendChild(bar); rc.appendChild(ends); rc.appendChild(ansEl); rc.appendChild(ctl); rc.appendChild(log);
            ctx.el.appendChild(rc);
            function rng(a) { return a[0] > a[1] ? 'nothing' : a[0] === a[1] ? '' + a[0] : a[0] + ' to ' + a[1]; }
            function paint() {
                var s = span(N, j, k), z = Math.pow(2, k);
                rtxt.innerHTML = 'm is between <b class="chb-mono">' + s[0] + '</b> and <b class="chb-mono">' + s[1] + '</b> <span class="chx-dim">(' + (s[1] - s[0] + 1) + ' numbers left)</span>';
                var i = bar.firstChild, mid = bar.lastChild;
                i.style.left = (100 * j / z) + '%'; i.style.width = (100 / z) + '%';
                mid.hidden = phase !== 'half'; mid.style.left = (100 * (2 * j + 1) / (2 * z)) + '%';
                ends.innerHTML = '<span>0</span><span>' + (N - 1) + '</span>';
                ctl.innerHTML = '';
                if (phase === 'ask') {
                    ansEl.innerHTML = '';
                    if (k === 0) ctl.appendChild(ctx.btn('Ask: is c big?', 'chx-go', function () { ask(); }));
                    else {
                        ctl.appendChild(ctx.btn('× 2, then ask', null, function () {
                            ctx.wrong('Times 2 doubles the lock, not the number inside. Multiply by 2 to the power e!');
                        }));
                        ctl.appendChild(ctx.btn('× ' + P.t + ' (2^e), then ask', 'chx-go', function () { cur = cur * P.t % N; ask(); }));
                    }
                } else {
                    var lo = span(N, 2 * j, k + 1), hi = span(N, 2 * j + 1, k + 1);
                    ctl.appendChild(ctx.btn('Keep the lower half: ' + rng(lo), null, function () { half(0); }));
                    ctl.appendChild(ctx.btn('Keep the upper half: ' + rng(hi), null, function () { half(1); }));
                }
            }
            function ask() {
                var v = ctx.powmod(cur, P.d, N);                 /* the server decrypts: v = 2^k m mod N */
                ans = 2 * v >= N + 1 ? 1 : 0;
                ctx.sfx('move');
                log.appendChild(H(ctx, 'li', null, '<span class="chb-mono">' + cur + '</span>' + (k ? ' (hides ' + (k === 1 ? '2' : '2<sup>' + k + '</sup>') + ' × m mod N)' : ' (hides m)') +
                    ': big? <b class="' + (ans ? 'chx-ok' : 'chx-bad') + '">' + (ans ? 'YES' : 'NO') + '</b>'));
                phase = 'half';
                ansEl.innerHTML = 'Server: <span class="' + (ans ? 'chx-ok' : 'chx-bad') + '">' + (ans ? 'YES' : 'NO') + '</span>';
                ctx.tip(ans ? 'The server said <b>yes</b>: keep the <b>upper</b> half of the range.' : 'The server said <b>no</b>: keep the <b>lower</b> half of the range.');
                paint();
            }
            function half(h) {
                if (h !== ans) { ctx.wrong(ans ? 'Yes, big: the secret is in the upper half.' : 'No, small: the secret is in the lower half.'); return; }
                j = 2 * j + h; k++;
                phase = 'ask'; ctx.sfx('tap');
                var s = span(N, j, k);
                if (s[0] === s[1]) {
                    paint(); ctl.innerHTML = '';
                    ansEl.innerHTML = 'm = <span class="chx-ok">' + s[0] + '</span>';
                    rtxt.innerHTML = 'Check: <b class="chb-mono">' + s[0] + '<sup>' + e + '</sup> mod ' + N + ' = ' + ctx.powmod(s[0], e, N) + ' = c</b>';
                    ctx.solve('A server that only says yes or no can leak a whole secret, one question at a time. Bleichenbacher did this to real RSA padding in 1998; the fixes are OAEP padding and the same error message for every failure.');
                    return;
                }
                ctx.tip('Now <b>double the hidden number</b> (multiply by 2<sup>e</sup>) and ask again: its answer splits the range in half.');
                paint();
            }
            ctx.tip('The server answers only "is it big?". <b>Ask</b>, keep the half it points to, then <b>double</b> the hidden number and ask again until one number is left.');
            ctx.hint('Each answer halves the range: yes keeps the upper half, no the lower half. Always multiply by ' + P.t + ' (2 to the power e), never by 2.');
            paint();
        }
    });

    /* ================= 15. Echo Trick (Hard) ================= */
    function makeEcho(ctx) {
        for (;;) {
            var key = 'k' + ctx.ri(100000, 999999), r = ctx.ri(1000, 9999), n = ctx.ri(1000, 9999), r2 = ctx.ri(1000, 9999);
            if (!distinct([r, n, r2])) continue;
            var mac = function (x) {
                var a = ctx.hash8(key + '|' + x), b = ctx.hash8(x + '|' + key);
                return ('0' + a.toString(16)).slice(-2).toUpperCase() + ' ' + ('0' + b.toString(16)).slice(-2).toUpperCase();
            };
            if (!distinct([mac(r), mac(n), mac(r2)])) continue;
            return { r: r, n: n, r2: r2, mac: mac };
        }
    }
    room({
        id: 'echo-trick', name: 'Echo Trick', tag: 'Reflection attack', order: 125, hardOnly: true,
        time: { easy: 90, normal: 80, hard: 70 }, make: makeEcho,
        build: function (ctx) {
            setup(ctx);
            var P = makeEcho(ctx), sel = null, ghost = null, drag = null, eat = 0, done = false;
            var MK = 'MAC<sub>k</sub>';
            ctx.tip('The guard wants <b>' + MK + '(r)</b> for its challenge r, and you do not have the key k. <b>Open a second session</b> and get the guard to answer its own challenge. Drag or tap the cards.');
            ctx.hint('In session 2 send the guard\'s own challenge ' + P.r + ' as your challenge. It answers MAC(' + P.r + '): carry that back to session 1.');
            ctx.el.appendChild(card(ctx, null, '<p class="chb-txt">The guard and its partners share a secret key k. Partners prove themselves by ' +
                'answering a challenge number x with ' + MK + '(x), a code only the key can make. Either side may challenge the other.</p>'));
            function select(t) {
                if (sel) sel.el.classList.remove('chx-sel');
                sel = sel === t ? null : t;
                if (sel) { sel.el.classList.add('chx-sel'); ctx.sfx('tap'); }
            }
            function token(t) {
                var b = ctx.btn('', 'chb-token' + (t.mac ? ' mac' : ''), function () { if (Date.now() - eat < 400) return; select(t); });   /* a drag just ended: not a tap */
                b.innerHTML = t.html; t.el = b;
                ctx.on(b, 'pointerdown', function (ev) {
                    if (!ctx.alive() || done) return;
                    drag = { t: t, x: ev.clientX, y: ev.clientY };
                    try { b.setPointerCapture(ev.pointerId); } catch (er) { /* fine */ }
                });
                ctx.on(b, 'pointermove', function (ev) {
                    if (!drag || drag.t !== t) return;
                    if (!ghost && Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 8) {
                        ghost = b.cloneNode(true); ghost.classList.add('chb-ghost'); ghost.classList.remove('chx-sel');
                        (ctx.el.closest('.chx') || document.body).appendChild(ghost);
                    }
                    if (ghost) {
                        ghost.style.left = (ev.clientX - ghost.offsetWidth / 2) + 'px'; ghost.style.top = (ev.clientY - ghost.offsetHeight / 2) + 'px';
                        hot(ev.clientX, ev.clientY);
                        ev.preventDefault();
                    }
                });
                function end(ev, drop) {
                    if (!drag || drag.t !== t) return;
                    drag = null;
                    if (!ghost) return;
                    ghost.remove(); ghost = null; eat = Date.now();
                    var slot = drop ? slotAt(ev.clientX, ev.clientY) : null;
                    hot(-1, -1);
                    if (slot) slot._drop(t);
                }
                ctx.on(b, 'pointerup', function (ev) { end(ev, true); });
                ctx.on(b, 'pointercancel', function (ev) { end(ev, false); });
                return b;
            }
            var slots = [];
            function slotAt(x, y) { var el = document.elementFromPoint(x, y); el = el && el.closest ? el.closest('.chb-slot') : null; return slots.indexOf(el) >= 0 ? el : null; }
            function hot(x, y) { var s = slotAt(x, y); slots.forEach(function (z) { z.classList.toggle('hot', z === s); }); }
            function slot(label, drop) {
                var s = ctx.btn(label, 'chb-slot', function () {
                    if (!sel) { ctx.say('Pick a card first, then tap here.', 1600); return; }
                    var t = sel; select(t); s._drop(t);
                });
                s._drop = function (t) { if (!ctx.alive() || done) return; drop(t, s); };
                slots.push(s);
                return s;
            }
            function num(v, who) { return { v: v, html: (who ? who + ' ' : '') + v }; }
            function macTok(x) { return { mac: true, x: x, v: P.mac(x), html: MK + '(' + x + ') = ' + P.mac(x) }; }

            var wrap = ctx.h('div', 'chb-sessions'), w1 = ctx.h('div', 'chb-win'), w2 = ctx.h('div', 'chb-win off');
            w1.innerHTML = '<header>Session 1: the front door</header>';
            w2.innerHTML = '<header>Session 2: the side door</header>';
            var b1 = ctx.h('div'), b2 = ctx.h('div');
            w1.appendChild(b1); w2.appendChild(b2);
            wrap.appendChild(w1); wrap.appendChild(w2);
            ctx.el.appendChild(wrap);

            b1.appendChild(H(ctx, 'div', 'chb-say', 'Guard: "Prove you are a partner. My challenge:"'));
            b1.appendChild(token(num(P.r, 'r =')));
            b1.appendChild(H(ctx, 'div', 'chb-say', 'Guard: "Send me ' + MK + '(' + P.r + ')."'));
            var answer = slot('Your answer: drop here', function (t, s) {
                if (t.mac && t.x === P.r) {
                    done = true;
                    s.innerHTML = t.html; s.classList.add('full'); s.disabled = true;
                    b1.appendChild(H(ctx, 'div', 'chb-say chx-ok', '<b>Guard: "Correct, partner. Come in!"</b>'));
                    ctx.el.appendChild(card(ctx, 'The fix, in one line', '<p class="chb-txt">Put the sender\'s name inside the code, ' + MK +
                        '(guard, r), or have both sides add a nonce, so an answer from the guard is never a valid answer to the guard.</p>', 'chb-done'));
                    ctx.solve('A reflection attack: the guard answered its own challenge in a second session. Real protocols put the sender\'s name (or both sides\' nonces) inside the MAC so answers cannot be bounced back.');
                    return;
                }
                if (t.mac) ctx.wrong('That is MAC(' + t.x + '), but the guard asked about ' + P.r + '.');
                else if (t.v === P.r) ctx.wrong('Echoing r back is not MAC(r). You need the key, or someone who has it.');
                else ctx.wrong('A plain number is no proof. You need MAC(' + P.r + ').');
            });
            b1.appendChild(answer);

            var opened = false, asked = {};
            b2.appendChild(ctx.btn('Open a second session', 'chx-go', function () {
                if (opened) return;
                opened = true; ctx.sfx('move');
                w2.classList.remove('off'); b2.innerHTML = '';
                b2.appendChild(H(ctx, 'div', 'chb-say', 'You: "I am a partner too. Prove that <b>you</b> know k. My challenge:"'));
                var replies = ctx.h('div');
                replies.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:flex-start';
                b2.appendChild(slot('Your challenge: drop here', function (t) {
                    if (t.mac) { ctx.wrong('A challenge is a plain number, not a MAC.'); return; }
                    if (asked[t.v]) { ctx.say('The guard already answered that one.'); return; }
                    asked[t.v] = true; ctx.sfx('move');
                    replies.appendChild(H(ctx, 'div', 'chb-say', 'Guard: "Easy. Here is my proof:"'));
                    replies.appendChild(token(macTok(t.v)));
                    if (!asked.r2) {
                        asked.r2 = true;
                        replies.appendChild(H(ctx, 'div', 'chb-say', 'Guard: "Your turn. Challenge:"'));
                        replies.appendChild(token(num(P.r2, 'r\' =')));
                    }
                }));
                b2.appendChild(replies);
                ctx.tip('Good. Now <b>send the guard\'s own challenge ' + P.r + '</b> as yours in session 2, and carry its answer back to session 1.');
            }));
            var pocket = card(ctx, 'Your own cards');
            var pr = ctx.h('div', 'chb-pocket');
            pr.appendChild(token(num(P.n, 'n =')));
            pocket.appendChild(pr);
            ctx.el.appendChild(pocket);
            return { destroy: function () { if (ghost) ghost.remove(); ghost = null; } };
        }
    });
})();
