/* Crypto Heist: the cat is locked out of the Treat Vault and breaks in room by room. Every room is one idea of modern
   cryptography, played by hand with small numbers, mostly as the attacker: a one-time pad, a pad used twice, ECB
   leaking a picture, clock arithmetic, tiny RSA, a forged RSA signature, Diffie-Hellman and its man in the middle,
   ElGamal, a birthday collision, salted passwords, proof of work, a zero-knowledge cave, Shamir secret sharing, and
   on Hard a padding oracle and a reflection attack. (Classic ciphers are Cipher Cat's.)

   A run: 6 rooms on Easy, 8 on Normal, 10 on Hard, drawn at random from the pool (the Hard-only rooms only on Hard)
   and played in the order of the ideas (symmetric, public key, hashes, protocols). Each room has its own clock; a hint
   costs 10 seconds; a wrong answer costs 5 (not on Easy). Easy: the clock only sets the bonus and never ends the run,
   and the rooms use fixed, friendly numbers. Normal and Hard: a clock that runs out ends the run (the rooms already
   cleared keep their points), and the numbers are new every time. Score per room: a base (100, Hard-only rooms 150)
   plus 3 points per second left. After every room a card with a one-line fact about the real world.
   No text inputs: buttons, switches, dials and an on-screen number pad (the real keyboard works too).
   With a dog chosen (html[data-pet="dog"]) the texts say dog.

   This game is a folder of parts joined in name order into one script (layouts/_default/arcade.html; map in
   README.md). This part: the room kit (ctx, below) and the shared controls. The rooms are in 10-... to 50-...; the
   run itself (intro, clock, scoring, cards, the end) and Arcade.register are in 90-run.js.

   A room is   room({ id, name, tag, order, hardOnly, time: { easy, normal, hard }, build: function (ctx) {...} })
   build gets a ctx for this room and may return { destroy } for anything ctx does not clean up. ctx:
     ctx.el                    the room's area (a div); build fills it
     ctx.level, ctx.easy, ctx.hard
     ctx.dog, ctx.pet ('cat' or 'dog'), ctx.Pet ('Cat' or 'Dog')
     ctx.rnd(), ctx.ri(a, b) (integer in [a, b]), ctx.pick(list), ctx.shuffle(list)
     ctx.h(tag, cls, text)     a new element;  ctx.btn(label, cls, fn) a button
     ctx.tip(html)             the instruction line above the room (only the game's own strings, may hold <b>)
     ctx.hint(text)            what the hint button tells (set it again when the room moves on)
     ctx.wrong(text)           a wrong move: a shake, a sound, the cat says text, 5 seconds off (not on Easy)
     ctx.say(text, ms), ctx.mood('happy' | 'sad' | 'wow' | 'think' | 'idle'), ctx.sfx(name)
     ctx.solve(fact)           the room is cleared; fact: the one line for the card
     ctx.alive()               false once the room is over (check it in timeouts and promises)
     ctx.on(target, type, fn), ctx.later(fn, ms), ctx.key(fn(e))   cleaned up when the room ends
     ctx.numpad({ label, digits, onSubmit(n) })   a number pad: {el, value(), clear(), focus()}; keys 0-9, Backspace, Enter
     ctx.bits(n, { value, onChange(v), labels })  a row of n switches, high bit first: {el, get(), set(v), lock()}
     ctx.mod(a, n), ctx.powmod(b, e, m), ctx.inv(a, m), ctx.gcd(a, b), ctx.bin(v, n)
     ctx.hash8(text)           a toy 8-bit hash (0..255), the same everywhere in the game
     ctx.sha256(text)          a Promise of the real SHA-256 as hex (the browser's own), or null if there is none */
(function () {
    'use strict';
    var ROOMS = [];
    function room(def) { ROOMS.push(def); }

    function mod(a, n) { return ((a % n) + n) % n; }
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
    function powmod(b, e, m) { var r = 1; b = mod(b, m); while (e > 0) { if (e & 1) r = (r * b) % m; b = (b * b) % m; e >>= 1; } return r; }
    function inv(a, m) {   /* extended Euclid; null when there is none */
        var t = 0, nt = 1, r = m, nr = mod(a, m);
        while (nr) { var q = Math.floor(r / nr), x; x = t - q * nt; t = nt; nt = x; x = r - q * nr; r = nr; nr = x; }
        return r === 1 ? mod(t, m) : null;
    }
    function bin(v, n) { var s = (v >>> 0).toString(2); while (s.length < n) s = '0' + s; return s; }
    /* the toy hash: FNV-1a folded down to 8 bits, so it looks random but is small enough to collide by hand */
    function hash8(text) {
        var h = 2166136261;
        for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 255;
    }
    function sha256(text) {
        var s = window.crypto && window.crypto.subtle;
        if (!s || !window.TextEncoder) return null;
        return s.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        });
    }

    var CSS =
        '.chx { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; touch-action: pan-y; background: #f3f1fa;' +
        '  color: #231f3a; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }' +
        'html[data-pet="dog"] .chx { background: #faf4ea; }' +
        '.chx-in { box-sizing: border-box; max-width: 760px; min-height: 100%; margin: 0 auto; padding: 14px 16px 84px;' +
        '  display: flex; flex-direction: column; gap: 12px; }' +
        '.chx button { font: inherit; color: inherit; cursor: pointer; touch-action: manipulation; }' +
        '.chx button:focus-visible { outline: 3px solid #4a5bd4; outline-offset: 2px; }' +
        '.chx-btn { min-height: 40px; padding: 6px 16px; border: 2px solid #231f3a; border-radius: 8px; background: #fff;' +
        '  box-shadow: 0 3px 0 #231f3a; font-weight: 800; }' +
        '.chx-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #231f3a; }' +
        '.chx-btn:disabled { opacity: .4; cursor: default; transform: none; box-shadow: 0 3px 0 #231f3a; }' +
        '.chx-go { background: #4a5bd4; color: #fff !important; }' +
        '.chx-sel { background: #ffe9a8; }' +
        '.chx-head { display: flex; align-items: center; gap: 10px; }' +
        '.chx-title span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
        '@media (max-width: 480px) { .chx-head { gap: 8px; } .chx-hint small { display: none; } .chx-clock { font-size: 1.1rem; } }' +
        '.chx-title { flex: 1 1 auto; min-width: 0; font-weight: 800; font-size: 1.08rem; }' +
        '.chx-title small { display: block; color: #7a7393; font-size: .78rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }' +
        '.chx-clock { flex: none; white-space: nowrap; font: 800 1.25rem/1 ui-monospace, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }' +
        '.chx-clock.low { color: #d6336c; } .chx-clock.over { color: #7a7393; }' +
        '.chx-hint { flex: none; white-space: nowrap; min-height: 36px; padding: 4px 12px; font-size: .9rem; }' +
        '.chx-tip { margin: 0; line-height: 1.45; color: #423b5e; font-size: .98rem; }' +
        '.chx-tip b { color: #231f3a; }' +
        '.chx-room { display: flex; flex-direction: column; align-items: center; gap: 14px; }' +
        '.chx-room.shake { animation: chx-shake .35s; }' +
        '@keyframes chx-shake { 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }' +
        /* a box for numbers and bits: monospace, on white */
        '.chx-card { box-sizing: border-box; width: 100%; padding: 12px 14px; background: #fff; border: 2px solid #ddd8ee; border-radius: 10px; }' +
        '.chx-mono { font: 800 1.1rem/1.5 ui-monospace, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; letter-spacing: .03em; }' +
        '.chx-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 12px; }' +
        '.chx-ok { color: #2f8a3a; } .chx-bad { color: #d6336c; } .chx-dim { color: #7a7393; }' +
        /* number pad */
        '.chx-pad { display: flex; flex-direction: column; align-items: center; gap: 8px; }' +
        '.chx-pad-show { min-width: 150px; padding: 6px 12px; border: 2px solid #231f3a; border-radius: 8px; background: #fff; text-align: center;' +
        '  font: 800 1.4rem/1.3 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chx-pad-show small { display: block; font: 700 .72rem/1.2 system-ui, sans-serif; color: #7a7393; text-transform: uppercase; letter-spacing: .05em; }' +
        '.chx-keys { display: grid; grid-template-columns: repeat(6, 46px); gap: 6px; }' +
        '.chx-keys button { height: 42px; padding: 0; border: 2px solid #231f3a; border-radius: 8px; background: #fff; box-shadow: 0 2px 0 #231f3a; font-weight: 800; font-size: 1.05rem; }' +
        '.chx-keys button:active { transform: translateY(2px); box-shadow: none; }' +
        '.chx-keys .chx-k-ok { grid-column: span 2; background: #4a5bd4; color: #fff; }' +
        /* bit switches */
        '.chx-bits { display: flex; gap: 5px; justify-content: center; flex-wrap: wrap; }' +
        '.chx-bit { width: 38px; height: 46px; padding: 0; border: 2px solid #231f3a; border-radius: 8px; background: #fff; box-shadow: 0 3px 0 #231f3a;' +
        '  font: 800 1.3rem/1 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chx-bit.on { background: #231f3a; color: #fff !important; }' +
        '.chx-bit:disabled { cursor: default; }' +
        '.chx-bit small { display: block; font: 700 .6rem/1 system-ui, sans-serif; opacity: .7; }' +
        /* the screens between rooms */
        '.chx-cover { position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center; padding: 16px;' +
        '  background: rgba(243, 241, 250, .92); }' +
        '.chx-cover[hidden] { display: none; }' +
        'html[data-pet="dog"] .chx-cover { background: rgba(250, 244, 234, .92); }' +
        '.chx-cover-box { max-width: 460px; padding: 22px 22px 18px; border: 2px solid #231f3a; border-radius: 14px; background: #fff;' +
        '  box-shadow: 0 6px 0 #231f3a; text-align: center; }' +
        '.chx-cover-box h3 { margin: 0 0 6px; font-size: 1.35rem; }' +
        '.chx-cover-box p { margin: 0 0 14px; line-height: 1.45; color: #423b5e; }' +
        '.chx-fact { font-style: italic; }' +
        '.chx-steps { display: flex; gap: 4px; justify-content: center; margin-bottom: 10px; }' +
        '.chx-steps i { width: 12px; height: 12px; border-radius: 50%; background: #ddd8ee; }' +
        '.chx-steps i.done { background: #4a5bd4; } .chx-steps i.now { background: #ffb400; }' +
        '@media (max-width: 420px) { .chx-keys { grid-template-columns: repeat(6, 40px); } .chx-bit { width: 32px; } }' +
        '@media (pointer: coarse) { .chx button { font-size: 16px; } }';

    /* ---------- the room kit: one ctx per room, everything it registers goes away when the room ends ---------- */
    function makeCtx(api, run, roomDef, host) {
        var dog = document.documentElement.dataset.pet === 'dog', level = run.level, live = true;
        var offs = [], keyFns = [];
        var ctx = {
            el: host.room, level: level, easy: level === 'easy', hard: level === 'hard',
            dog: dog, pet: dog ? 'dog' : 'cat', Pet: dog ? 'Dog' : 'Cat',
            rnd: Math.random,
            ri: function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
            pick: function (l) { return l[Math.floor(Math.random() * l.length)]; },
            shuffle: function (l) { l = l.slice(); for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; } return l; },
            h: function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; },
            btn: function (label, cls, fn) {
                var b = ctx.h('button', 'chx-btn' + (cls ? ' ' + cls : ''), label);
                b.type = 'button';
                if (fn) b.addEventListener('click', function (e) { if (live) fn(e); });
                return b;
            },
            tip: function (html) { host.tip.innerHTML = html; },
            hint: function (text) { run.hintText = text; host.hintBtn.disabled = !text; },
            wrong: function (text) {
                if (!live) return;
                api.sfx('hit');
                host.room.classList.remove('shake'); void host.room.offsetWidth; host.room.classList.add('shake');
                if (text) api.say(text, 1800);
                api.cat('sad');
                run.penalty(5);
            },
            say: function (t, ms) { api.say(t, ms || 2200); },
            mood: function (m) { api.cat(m); },
            sfx: function (n) { api.sfx(n); },
            solve: function (fact) { if (!live) return; live = false; run.solved(fact); },
            alive: function () { return live; },
            on: function (t, type, fn) { t.addEventListener(type, fn); offs.push(function () { t.removeEventListener(type, fn); }); },
            later: function (fn, ms) { var id = setTimeout(function () { if (live) fn(); }, ms); offs.push(function () { clearTimeout(id); }); },
            key: function (fn) { keyFns.push(fn); },
            mod: mod, powmod: powmod, inv: inv, gcd: gcd, bin: bin, hash8: hash8, sha256: sha256,
            numpad: function (o) {
                o = o || {};
                var digits = o.digits || 3, val = '';
                var box = ctx.h('div', 'chx-pad'), show = ctx.h('div', 'chx-pad-show');
                var lab = ctx.h('small', null, o.label || 'Your answer'), num = ctx.h('span', null, '_');
                show.appendChild(lab); show.appendChild(num); box.appendChild(show);
                var keys = ctx.h('div', 'chx-keys');
                function paint() { num.textContent = val || '_'; }
                function press(k) {
                    if (!live) return;
                    if (k === 'del') val = val.slice(0, -1);
                    else if (k === 'ok') { if (val !== '' && o.onSubmit) o.onSubmit(parseInt(val, 10)); return; }
                    else if (val.length < digits) val = (val === '0' ? '' : val) + k;
                    api.sfx('tap'); paint();
                }
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'del', 'ok'].forEach(function (k) {
                    var b = ctx.h('button', k === 'ok' ? 'chx-k-ok' : null, k === 'del' ? '⌫' : k === 'ok' ? 'OK' : k);
                    b.type = 'button';
                    if (k === 'del') b.setAttribute('aria-label', 'Delete');
                    b.addEventListener('click', function () { press(k); });
                    keys.appendChild(b);
                });
                box.appendChild(keys);
                ctx.key(function (e) {
                    if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
                    else if (e.key === 'Backspace') { press('del'); e.preventDefault(); }
                    else if (e.key === 'Enter') { press('ok'); e.preventDefault(); }
                });
                return { el: box, value: function () { return val === '' ? null : parseInt(val, 10); }, clear: function () { val = ''; paint(); }, focus: function () {} };
            },
            bits: function (n, o) {
                o = o || {};
                var v = o.value || 0, row = ctx.h('div', 'chx-bits'), btns = [];
                function paint() {
                    btns.forEach(function (b, i) {
                        var on = (v >> (n - 1 - i)) & 1;
                        b.classList.toggle('on', !!on);
                        b.firstChild.textContent = on ? '1' : '0';
                        b.setAttribute('aria-pressed', on ? 'true' : 'false');
                    });
                }
                for (var i = 0; i < n; i++) (function (i) {
                    var b = ctx.h('button', 'chx-bit');
                    b.type = 'button';
                    b.appendChild(document.createTextNode('0'));
                    if (o.labels) b.appendChild(ctx.h('small', null, o.labels[i]));
                    b.setAttribute('aria-label', 'Bit ' + (i + 1));
                    b.addEventListener('click', function () {
                        if (!live || b.disabled) return;
                        v ^= 1 << (n - 1 - i); api.sfx('move'); paint();
                        if (o.onChange) o.onChange(v);
                    });
                    btns.push(b); row.appendChild(b);
                })(i);
                paint();
                return { el: row, get: function () { return v; }, set: function (x) { v = x; paint(); }, lock: function () { btns.forEach(function (b) { b.disabled = true; }); } };
            }
        };
        ctx._end = function () { live = false; offs.forEach(function (f) { f(); }); offs = []; keyFns = []; };
        ctx._key = function (e) { if (live) keyFns.forEach(function (f) { f(e); }); };
        return ctx;
    }
