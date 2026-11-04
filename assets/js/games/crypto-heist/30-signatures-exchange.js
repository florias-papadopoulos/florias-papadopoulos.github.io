/* Crypto Heist, part 30: signatures and key exchange.
     Copycat Signature   textbook RSA signatures multiply: two signed notes give a forged third one
     Secret Handshake    Diffie-Hellman by hand, then the cat sits in the middle of a second handshake
     ElGamal Mailbox     decrypting an ElGamal letter with a key found under the doormat
     Yes-No Oracle       (Hard) a one-bit "is it big?" oracle plus the RSA homomorphism: a binary search
     Echo Trick          (Hard) a reflection attack on challenge and response, with two session windows
   Private helpers (a chip calculator, small number theory, drag and tap cards) live in the closure below. Each room
   has a make(ctx) that draws its numbers (fixed on Easy), kept apart from build so the maths can be tested alone. */
(function () {
    var CSS =
        '.chb-label { font-size: .84rem; font-weight: 800; color: #7a7393; margin: 0 0 6px; }' +
        '.chb-c { text-align: center; }' +
        '.chb-kv { display: flex; flex-wrap: wrap; gap: 2px 20px; justify-content: center; }' +
        '.chb-kv > span { white-space: nowrap; }' +
        '.chb-txt { margin: 0; line-height: 1.45; color: #423b5e; text-align: center; }' +
        '.chx .chb-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }' +
        '.chx .chb-chip { min-width: 58px; min-height: 50px; padding: 4px 10px; border: 2px solid #231f3a; border-radius: 8px; background: #fff;' +
        '  box-shadow: 0 3px 0 #231f3a; font: 800 1.15rem/1.15 ui-monospace, Menlo, Consolas, monospace; }' +
        '.chx .chb-chip small { display: block; font: 700 .74rem/1.25 system-ui, sans-serif; color: #7a7393; }' +
        '.chx .chb-chip.chx-sel { background: #ffe9a8; }' +
        '.chx .chb-chip:active { transform: translateY(2px); box-shadow: 0 1px 0 #231f3a; }' +
        '.chb-tool { display: flex; flex-direction: column; gap: 10px; }' +
        '.chb-sub { font-size: .82rem; font-weight: 700; color: #7a7393; text-align: center; margin-bottom: 4px; }' +
        '.chb-formula { text-align: center; font: 800 1.35rem/1.5 ui-monospace, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }' +
        '.chb-formula sup, .chb-mono sup { font-size: .62em; }' +
        '.chb-names { text-align: center; font-size: .85rem; color: #7a7393; margin-top: -6px; min-height: 1.2em; }' +
        '.chb-q { display: inline-block; min-width: 1.3em; color: #b3acc9; }' +
        '.chb-res { color: #4a5bd4; }' +
        '.chb-mono { font: 800 1.08rem/1.6 ui-monospace, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }' +
        '.chb-log { margin: 0; padding: 0; list-style: none; line-height: 1.5; }' +
        '.chb-log li { padding: 2px 0; }' +
        '.chb-log li + li { border-top: 1px dashed #ddd8ee; }' +
        '.chb-part { font-weight: 800; font-size: 1rem; text-align: center; }' +
        '.chb-done { background: #eef7ec; border-color: #9cc996; }' +
        '.chb-grid { display: grid; grid-template-columns: 1fr auto auto; gap: 4px 14px; align-items: center; max-width: 360px; margin: 0 auto; }' +
        '.chb-grid > .h { font-size: .84rem; font-weight: 800; color: #7a7393; }' + '.chb-grid > span { text-align: left; }' +
        '.chb-grid > .n { text-align: right; }' +
        '.chb-want { border-color: #231f3a; }' +
        '.chb-grid2 { grid-template-columns: auto auto; max-width: 440px; gap: 2px 14px; }' +
        '.chb-grid2 > span { color: #7a7393; font-weight: 700; font-size: .88rem; }' +
        '.chb-grid2 > .chb-kv { justify-content: flex-start; }' +
        '.chb-steps { margin: 0 auto; padding-left: 1.4em; line-height: 1.6; max-width: 360px; }' +
        '.chb-steps li.now { font-weight: 800; } .chb-steps li.ok { color: #2f8a3a; }' +
        /* the range bar of the oracle */
        '.chb-bar { position: relative; height: 30px; border: 2px solid #231f3a; border-radius: 8px; background: repeating-linear-gradient(90deg, #f3f1fa 0 6px, #fff 6px 12px); overflow: hidden; }' +
        '.chb-bar i { position: absolute; top: 0; bottom: 0; background: #ffe9a8; border-left: 2px solid #231f3a; border-right: 2px solid #231f3a; transition: left .35s, width .35s; }' +
        '.chb-bar b { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px dashed #4a5bd4; }' +
        '.chb-ends { display: flex; justify-content: space-between; font: 700 .8rem ui-monospace, Menlo, Consolas, monospace; color: #7a7393; margin-top: 2px; }' +
        '.chb-big { font-size: 1.4rem; font-weight: 800; text-align: center; }' + '.chb-big:empty { display: none; }' +
        /* echo trick: two session windows, cards to drag or tap */
        '.chb-sessions { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }' +
        '.chb-win { flex: 1 1 260px; min-width: 0; box-sizing: border-box; border: 2px solid #231f3a; border-radius: 10px; background: #fff; overflow: hidden; }' +
        '.chb-win > header { padding: 6px 10px; background: #231f3a; color: #fff; font-weight: 800; font-size: .9rem; }' +
        '.chb-win > div { padding: 10px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }' +
        '.chb-win.off > div { align-items: center; justify-content: center; min-height: 120px; }' +
        '.chb-say { line-height: 1.4; }' +
        '.chx .chb-token { min-height: 40px; padding: 4px 12px; border: 2px solid #231f3a; border-radius: 18px; background: #fff; box-shadow: 0 3px 0 #231f3a;' +
        '  font: 800 1rem/1.2 ui-monospace, Menlo, Consolas, monospace; touch-action: none; }' +
        '.chx .chb-token.chx-sel { background: #ffe9a8; }' +
        '.chx .chb-token.mac { background: #e6e9ff; } .chx .chb-token.mac.chx-sel { background: #ffe9a8; }' +
        '.chb-ghost { position: fixed; z-index: 60; pointer-events: none; margin: 0; opacity: .9; transform: rotate(-3deg); }' +
        '.chx .chb-slot { min-height: 44px; min-width: 150px; padding: 4px 12px; border: 2px dashed #7a7393; border-radius: 18px; background: #f3f1fa;' +
        '  color: #7a7393; font-weight: 700; }' +
        '.chx .chb-slot.full { border-style: solid; border-color: #2f8a3a; background: #eef7ec; color: #2f8a3a; }' +
        '.chx .chb-slot.hot { border-color: #4a5bd4; background: #e6e9ff; }' +
        '.chb-pocket { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; }';

    function setup(ctx) { var s = document.createElement('style'); s.textContent = CSS; ctx.el.appendChild(s); }
    function H(ctx, tag, cls, html) { var e = ctx.h(tag, cls); if (html != null) e.innerHTML = html; return e; }
    function isPrime(n) { if (n < 2) return false; for (var i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
    function primes(a, b) { var l = []; for (var n = a; n <= b; n++) if (isPrime(n)) l.push(n); return l; }
    function isGen(g, p) { var x = 1; for (var k = 1; k < p - 1; k++) { x = x * g % p; if (x === 1) return false; } return true; }
    function gens(p) { var l = []; for (var g = 2; g < p; g++) if (isGen(g, p)) l.push(g); return l; }
    function distinct(l) { for (var i = 0; i < l.length; i++) for (var j = i + 1; j < l.length; j++) if (l[i] === l[j]) return false; return true; }
    /* a small RSA key: two different primes from ps with lo <= N <= hi, an e that is not its own inverse */
    function rsa(ctx, ps, lo, hi) {
        for (;;) {
            var p = ctx.pick(ps), q = ctx.pick(ps);
            if (p === q || p * q < lo || p * q > hi) continue;
            var phi = (p - 1) * (q - 1);
            var es = [3, 5, 7, 11, 13, 17].filter(function (e) { return ctx.gcd(e, phi) === 1 && ctx.inv(e, phi) !== e; });
            if (!es.length) continue;
            var e = ctx.pick(es);
            return { p: p, q: q, N: p * q, phi: phi, e: e, d: ctx.inv(e, phi) };
        }
    }

    /* the chip calculator: rows of number chips, slots that take a chip from a given row, a live formula and actions.
       o: { title, rows: [{ label, items: [{ key, name (html), v }] }], slots: [row index per slot], calc(values),
            show(values, items, result) -> { f, n } (html), actions: [{ label, fn(result, items) }] } */
    function tool(ctx, o) {
        var box = ctx.h('div', 'chx-card chb-tool'), vals = o.slots.map(function () { return null; }), chips = [];
        if (o.title) box.appendChild(H(ctx, 'div', 'chb-label chb-c', o.title));
        o.rows.forEach(function (row, ri) {
            var w = ctx.h('div');
            if (row.label) w.appendChild(H(ctx, 'div', 'chb-sub', row.label));
            var c = ctx.h('div', 'chb-chips');
            row.items.forEach(function (it) {
                var b = ctx.btn('', 'chb-chip', function () { tap(ri, it); });
                b.innerHTML = '<small>' + it.name + '</small>' + it.v;
                chips.push({ el: b, it: it });
                c.appendChild(b);
            });
            w.appendChild(c);
            box.appendChild(w);
        });
        var f = H(ctx, 'div', 'chb-formula'), n = H(ctx, 'div', 'chb-names'), acts = ctx.h('div', 'chx-row');
        box.appendChild(f); box.appendChild(n); box.appendChild(acts);
        var abtn = (o.actions || []).map(function (a) {
            var b = ctx.btn(a.label, a.cls || 'chx-go', function () { if (full()) a.fn(o.calc(vals.map(function (x) { return x.v; })), vals.slice()); });
            acts.appendChild(b);
            return b;
        });
        function full() { return vals.every(function (x) { return x; }); }
        function slotsOf(ri) { var l = []; o.slots.forEach(function (r, i) { if (r === ri) l.push(i); }); return l; }
        function tap(ri, it) {
            var idx = slotsOf(ri), i;
            for (i = idx.length - 1; i >= 0; i--) if (vals[idx[i]] === it) { vals[idx[i]] = null; ctx.sfx('tap'); paint(); return; }
            var free = idx.filter(function (k) { return !vals[k]; });
            if (free.length) vals[free[0]] = it;
            else if (idx.length === 1) vals[idx[0]] = it;
            else { idx.forEach(function (k) { vals[k] = null; }); vals[idx[0]] = it; }
            ctx.sfx('tap'); paint();
        }
        function paint() {
            chips.forEach(function (c) { c.el.classList.toggle('chx-sel', vals.indexOf(c.it) >= 0); });
            var v = vals.map(function (x) { return x ? x.v : null; });
            var r = full() ? o.calc(v) : null, s = o.show(v.map(function (x) { return x == null ? '<span class="chb-q">?</span>' : x; }), vals,
                r == null ? '<span class="chb-q">?</span>' : '<span class="chb-res">' + r + '</span>');
            f.innerHTML = s.f; n.innerHTML = s.n || '&nbsp;';
            abtn.forEach(function (b) { b.disabled = !full(); });
        }
        function prefill() {
            vals = o.slots.map(function () { return null; });
            o.rows.forEach(function (row, ri) { var idx = slotsOf(ri); if (row.items.length === 1 && idx.length === 1) vals[idx[0]] = row.items[0]; });
            paint();
        }
        prefill();
        return { el: box, clear: prefill };
    }
    function nm(it) { return it ? it.name : '?'; }
    function powTool(ctx, mod, bases, exps, actions, title) {
        return tool(ctx, {
            title: title || 'Power machine', rows: [{ label: 'Tap a base', items: bases }, { label: 'Tap a power', items: exps }], slots: [0, 1],
            calc: function (v) { return ctx.powmod(v[0], v[1], mod); },
            show: function (v, it, r) { return { f: v[0] + '<sup>' + v[1] + '</sup> mod ' + mod + ' = ' + r, n: '(' + nm(it[0]) + ' to the power ' + nm(it[1]) + ')' }; },
            actions: actions
        });
    }
    function mulTool(ctx, mod, items, actions, title) {
        return tool(ctx, {
            title: title || 'Multiply machine', rows: [{ label: 'Tap two numbers', items: items }], slots: [0, 0],
            calc: function (v) { return v[0] * v[1] % mod; },
            show: function (v, it, r) { return { f: v[0] + ' × ' + v[1] + ' mod ' + mod + ' = ' + r, n: '(' + nm(it[0]) + ' times ' + nm(it[1]) + ')' }; },
            actions: actions
        });
    }
    function card(ctx, label, html, cls) {
        var c = ctx.h('div', 'chx-card' + (cls ? ' ' + cls : ''));
        if (label) c.appendChild(H(ctx, 'div', 'chb-label chb-c', label));
        if (html != null) c.appendChild(H(ctx, 'div', 'chb-c', html));
        return c;
    }
    /* bring a new step into view (the room scrolls inside .chx) */
    function reveal(ctx, el) { ctx.later(function () { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* fine */ } }, 40); }
    function kv(pairs) { return '<div class="chb-kv chb-mono">' + pairs.map(function (p) { return '<span>' + p + '</span>'; }).join('') + '</div>'; }
    var S1 = '<sub>1</sub>', S2 = '<sub>2</sub>', S3 = '<sub>3</sub>';

    /* ================= 6. Copycat Signature ================= */
    function makeCopy(ctx) {
        if (ctx.easy) {
            var N0 = 77, e0 = 7, d0 = 43;
            return { N: N0, e: e0, d: d0, ms: [2, 3], sigs: [ctx.powmod(2, d0, N0), ctx.powmod(3, d0, N0)], m: 6 };
        }
        for (;;) {
            var k = ctx.hard ? rsa(ctx, primes(7, 31), 100, 900) : rsa(ctx, primes(5, 19), 35, 250), N = k.N;
            var ms = ctx.hard ? [ctx.ri(2, N - 1), ctx.ri(2, N - 1), ctx.ri(2, N - 1)] : [ctx.ri(2, 9), ctx.ri(2, 9)];
            var m = ms[0] * ms[1] % N;
            if (m < 2 || (!ctx.hard && ms[0] * ms[1] >= N)) continue;
            if (!distinct(ms.concat([m])) || ms.concat([m]).some(function (x) { return ctx.gcd(x, N) !== 1; })) continue;
            var sigs = ms.map(function (x) { return ctx.powmod(x, k.d, N); });
            if (!distinct(ms.concat(sigs, [m]))) continue;
            if (ctx.powmod(m, k.e, N) === m) continue;          /* the plain product must not pass by luck */
            return { N: N, e: k.e, d: k.d, ms: ms, sigs: sigs, m: m };
        }
    }
    room({
        id: 'copycat-signature', name: 'Copycat Signature', tag: 'RSA signatures', order: 60,
        time: { easy: 90, normal: 60, hard: 45 }, make: makeCopy,
        build: function (ctx) {
            setup(ctx);
            var P = makeCopy(ctx), N = P.N, e = P.e, m = P.m, m1 = P.ms[0], m2 = P.ms[1];
            var notes = ['Water the plants', 'Feed the fish', 'Brush the ' + ctx.pet];
            ctx.tip('The owner signed two harmless notes but will never sign note <b>' + m + '</b>, "Open the vault". ' +
                'Forge its signature: <b>multiply two numbers</b> in the machine, then show the result to the door.');
            ctx.hint('Signatures multiply: (signature of ' + m1 + ') × (signature of ' + m2 + ') is the signature of ' + m1 + ' × ' + m2 +
                (m1 * m2 >= N ? ' mod ' + N : '') + ' = ' + m + '. Tap the two signatures σ' + '.');
            var g = '<div class="chb-grid"><span class="h">Signed note</span><span class="h n">m</span><span class="h n">σ</span>';
            P.ms.forEach(function (x, i) { g += '<span>' + notes[i] + '</span><b class="chb-mono n">' + x + '</b><b class="chb-mono n">' + P.sigs[i] + '</b>'; });
            var kc = card(ctx, 'The owner\'s public key', kv(['N = ' + N, 'e = ' + e]));
            kc.appendChild(H(ctx, 'div', 'chb-label chb-c', 'Notes the owner signed (σ = m to the secret power d, mod N)'));
            kc.lastChild.style.marginTop = '10px';
            kc.appendChild(H(ctx, 'div', null, g + '</div>'));
            ctx.el.appendChild(kc);
            ctx.el.appendChild(card(ctx, 'Wanted', 'a signature σ on note <b class="chb-mono">' + m + '</b>, "Open the vault"' +
                (m1 * m2 >= N ? '<br><span class="chx-dim">(' + m1 + ' × ' + m2 + ' mod ' + N + ' = ' + m + ')</span>' : ''), 'chb-want'));
            var items = [];
            P.ms.forEach(function (x, i) {
                var s = '<sub>' + (i + 1) + '</sub>';
                items.push({ key: 'm' + i, name: 'm' + s, v: x });
                items.push({ key: 's' + i, name: 'σ' + s, v: P.sigs[i] });
            });
            var door = H(ctx, 'div', 'chb-c', '<div class="chb-label">The door checks: σ to the power e, mod N, must be ' + m + '</div><div class="chx-dim">waiting for a signature</div>'), mt;
            ctx.el.appendChild((mt = mulTool(ctx, N, items, [{
                label: 'Show it to the door', fn: function (r, it) {
                    var v = ctx.powmod(r, e, N), line = '<span class="chb-mono">' + r + '<sup>' + e + '</sup> mod ' + N + ' = ';
                    if (v === m) {
                        door.lastChild.innerHTML = line + '<span class="chx-ok">' + v + '</span></span><br><b class="chx-ok">The owner\'s signature on ' + m + '. The door opens!</b>';
                        ctx.solve('Textbook RSA signatures multiply, so two signed notes give a third for free. That is why real schemes sign a hash of the message (hash-and-sign, as in RSA-PSS), never the raw number.');
                    } else {
                        door.lastChild.innerHTML = line + '<span class="chx-bad">' + v + '</span></span> <span class="chx-dim">(wants ' + m + ')</span>';
                        var plain = it[0].key.charAt(0) === 'm' && it[1].key.charAt(0) === 'm';
                        ctx.wrong(plain ? 'That is the note itself, not a signature. Multiply signatures!' : 'The door got ' + v + ', not ' + m + '.');
                        mt.clear();
                    }
                }
            }], 'Multiply machine (mod ' + N + ')')).el);
            mt.el.appendChild(door);
        }
    });

    /* ================= 7. Secret Handshake ================= */
    function makeDH(ctx) {
        var p, g, a, b, x, y, c;
        for (;;) {
            if (ctx.easy) { p = 13; g = 6; a = 3; b = 6; x = 4; y = 5; c = 2; }
            else {
                p = ctx.pick(ctx.hard ? primes(23, 47) : primes(11, 23)); g = ctx.pick(gens(p));
                a = ctx.ri(2, p - 2); b = ctx.ri(2, p - 2); x = ctx.ri(2, p - 2); y = ctx.ri(2, p - 2); c = ctx.ri(2, p - 2);
            }
            var pw = function (u, v) { return ctx.powmod(u, v, p); };
            var P = { p: p, g: g, a: a, b: b, x: x, y: y, c: c, A: pw(g, a), B: pw(g, b), A2: pw(g, x), B2: pw(g, y), C: pw(g, c) };
            P.K = pw(P.B, a); P.K1 = pw(P.A2, c); P.K2 = pw(P.B2, c);
            if (ctx.easy) return P;
            if (!distinct([g, P.B]) || !distinct([P.A, P.K, P.B]) || P.K === 1) continue;
            if (!distinct([g, P.A2, P.B2, P.C])) continue;
            if (!distinct([pw(g, c), P.K1, P.K2, pw(P.C, c)]) || P.K1 === 1 || P.K2 === 1) continue;
            return P;
        }
    }
    room({
        id: 'secret-handshake', name: 'Secret Handshake', tag: 'Diffie-Hellman', order: 70,
        time: { easy: 150, normal: 110, hard: 90 }, make: makeDH,
        build: function (ctx) {
            setup(ctx);
            var P = makeDH(ctx), p = P.p, Pet = ctx.Pet;
            var code = ctx.easy ? 4711 : ctx.ri(1000, 9999);
            var top = card(ctx, 'Public, everyone hears it', kv(['p = ' + p, 'g = ' + P.g])), mine = H(ctx, 'div', 'chb-c');
            mine.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px dashed #ddd8ee';
            top.appendChild(mine);
            ctx.el.appendChild(top);
            var stage = ctx.h('div', 'chx-room');
            stage.style.width = '100%';
            ctx.el.appendChild(stage);
            function G(key, name, v) { return { key: key, name: name, v: v }; }

            /* part 1: an honest handshake */
            stage.appendChild(H(ctx, 'div', 'chb-part', 'Part 1 of 2: shake paws with the guard'));
            mine.innerHTML = kv(['your secret a = ' + P.a, 'guard sent B = ' + P.B]) +
                '<p class="chb-txt chx-dim" style="font-size:.88rem">The guard keeps its own secret b to itself.</p>';
            var log1 = H(ctx, 'ul', 'chb-log chb-c'), slot = ctx.h('div');
            slot.style.width = '100%';
            stage.appendChild(slot);
            var logCard = card(ctx, null, null); logCard.appendChild(log1);
            function say1(html) { log1.appendChild(H(ctx, 'li', null, html)); if (!logCard.parentNode) stage.appendChild(logCard); }
            var bases1 = [G('g', 'g', P.g), G('B', 'B', P.B)], exps1 = [G('a', 'a', P.a)];
            function step1() {
                ctx.tip('Make your public value <b>A = g to the power a</b> with the machine and send it to the guard.');
                ctx.hint('Tap base g (' + P.g + '): the machine shows ' + P.g + ' to the power ' + P.a + ' mod ' + p + ' = ' + P.A + '. Then send it.');
                slot.innerHTML = '';
                slot.appendChild(powTool(ctx, p, bases1, exps1, [{
                    label: 'Send it to the guard', fn: function (r, it) {
                        if (it[0].key !== 'g') { ctx.wrong('That one mixes in the guard\'s B: it is the secret key. Never send it!'); return; }
                        ctx.sfx('move');
                        say1('You send <b class="chb-mono">A = ' + r + '</b> to the guard.');
                        step2();
                    }
                }], 'Power machine (mod ' + p + ')').el);
            }
            function step2() {
                ctx.tip('Now work out the <b>shared key K = B to the power a</b>. The guard gets the same K from your A.');
                ctx.hint('Tap base B (' + P.B + '): ' + P.B + ' to the power ' + P.a + ' mod ' + p + ' = ' + P.K + '. Both sides reach g to the power ab.');
                slot.innerHTML = '';
                reveal(ctx, slot);
                slot.appendChild(powTool(ctx, p, bases1, exps1, [{
                    label: 'This is our key', fn: function (r, it) {
                        if (it[0].key !== 'B') { ctx.wrong('That is A again, which everyone heard. Mix the guard\'s B with your a.'); return; }
                        ctx.sfx('point'); ctx.mood('happy');
                        say1('Your key <b class="chb-mono">K = ' + r + '</b>. Guard: "' + P.A + ' to the power b gives ' + P.K + ' here too. Hello, friend!"');
                        slot.innerHTML = '';
                        ctx.later(part2, 1100);
                    }
                }], 'Power machine (mod ' + p + ')').el);
            }

            /* part 2: the cat in the middle */
            var keys = { o: null, g: null };
            function part2() {
                stage.innerHTML = '';
                stage.appendChild(card(ctx, null, '<b class="chx-ok">Part 1 done:</b> you and the guard share K = ' + P.K + '.', 'chb-done'));
                stage.appendChild(H(ctx, 'div', 'chb-part', 'Part 2 of 2: the ' + ctx.pet + ' in the middle'));
                mine.innerHTML = kv(['your secret c = ' + P.c, 'your C = g<sup>c</sup> = ' + P.C]);
                stage.appendChild(H(ctx, 'p', 'chb-txt', 'The owner now sends the guard the door code, after a fresh handshake. ' +
                    'You sit on the wire and catch both values.'));
                var sc = ctx.el.closest ? ctx.el.closest('.chx') : null;
                if (sc) sc.scrollTop = 0;
                var wire = card(ctx, 'On the wire'), rows = {};
                [['o', 'Owner sent you A = ' + P.A2 + '. Pass on to the guard:', 'A', P.A2], ['g', 'Guard sent you B = ' + P.B2 + '. Pass on to the owner:', 'B', P.B2]].forEach(function (w) {
                    var r = ctx.h('div');
                    r.style.margin = '6px 0';
                    r.appendChild(H(ctx, 'p', 'chb-txt', w[1]));
                    var row = ctx.h('div', 'chx-row');
                    row.style.marginTop = '6px';
                    var real = ctx.btn(w[2] + ' = ' + w[3] + ' (as it is)', null, function () {
                        ctx.wrong('Then the owner and the guard share a key you cannot work out. Send your own C!');
                    });
                    var mineB = ctx.btn('your C = ' + P.C, null, function () {
                        if (rows[w[0]]) return;
                        rows[w[0]] = true; ctx.sfx('move');
                        row.innerHTML = '<b class="chx-ok">The ' + (w[0] === 'o' ? 'guard' : 'owner') + ' gets your C = ' + P.C + ' instead.</b>';
                        if (rows.o && rows.g) keysStep();
                    });
                    row.appendChild(real); row.appendChild(mineB); r.appendChild(row);
                    wire.appendChild(r);
                });
                stage.appendChild(wire);
                ctx.tip('Do not pass the values on: <b>send your own C to both sides</b>, so each of them shakes paws with you.');
                ctx.hint('Tap "your C = ' + P.C + '" in both rows. Each side then mixes your C with its own secret.');
                var tslot = ctx.h('div'), kcard = card(ctx, 'Your two keys', '');
                tslot.style.width = '100%';
                stage.appendChild(tslot);
                function paintKeys() {
                    kcard.lastChild.innerHTML = kv(['with the owner: ' + (keys.o == null ? '?' : keys.o), 'with the guard: ' + (keys.g == null ? '?' : keys.g)]);
                }
                function keysStep() {
                    ctx.tip('Now work out <b>both keys</b>: the one you share with the owner and the one you share with the guard.');
                    ctx.hint('Key with the owner: A (' + P.A2 + ') to the power c. Key with the guard: B (' + P.B2 + ') to the power c.');
                    paintKeys();
                    stage.insertBefore(kcard, tslot);
                    reveal(ctx, tslot);
                    var bases = [G('g', 'g', P.g), G('A', 'owner\'s A', P.A2), G('B', 'guard\'s B', P.B2), G('C', 'your C', P.C)];
                    function take(side, want, who) {
                        return function (r, it) {
                            if (keys[side] != null) { ctx.say('You have that key already.'); return; }
                            if (it[0].key !== want) { ctx.wrong('The ' + who + ' mixes your C with its secret. You mix the ' + who + '\'s value with your c.'); return; }
                            keys[side] = r; ctx.sfx('move'); paintKeys();
                            if (keys.o != null && keys.g != null) noteStep();
                        };
                    }
                    tslot.appendChild(powTool(ctx, p, bases, [G('c', 'c', P.c)], [
                        { label: 'Key with the owner', fn: take('o', 'A', 'owner') },
                        { label: 'Key with the guard', fn: take('g', 'B', 'guard') }
                    ], 'Power machine (mod ' + p + ')').el);
                }
                function noteStep() {
                    tslot.innerHTML = '';
                    ctx.tip('The owner sends the code in a note locked with <b>its</b> key. Which of your keys opens it?');
                    ctx.hint('The owner thinks it shares a key with the guard, but really it shares ' + P.K1 + ' with you.');
                    var nc = card(ctx, 'A locked note from the owner', '');
                    var row = ctx.h('div', 'chx-row');
                    row.appendChild(ctx.btn('Open with ' + P.K1 + ' (owner key)', null, function () {
                        ctx.sfx('point');
                        nc.lastChild.innerHTML = '<p class="chb-txt">The note: <b>"The door code is ' + code + '."</b> You lock it again with ' + P.K2 +
                            ' and pass it to the guard. Nobody noticed a thing!</p>';
                        nc.classList.add('chb-done');
                        ctx.solve('Plain Diffie-Hellman cannot tell who is on the other end, so a man in the middle runs two handshakes at once. Real protocols (TLS, Signal) sign the exchange so the values cannot be swapped.');
                    }));
                    row.appendChild(ctx.btn('Open with ' + P.K2 + ' (guard key)', null, function () {
                        ctx.wrong('That is the key you share with the guard. The note came from the owner.');
                    }));
                    nc.lastChild.appendChild(row);
                    tslot.appendChild(nc);
                    reveal(ctx, nc);
                }
            }
            step1();
        }
    });

    /* ================= 8. ElGamal Mailbox ================= */
    function makeEG(ctx) {
        for (;;) {
            var q, g, sk, r, m, r2;
            if (ctx.easy) { q = 11; g = 2; sk = 3; r = 6; m = 10; r2 = 4; }
            else {
                q = ctx.pick(ctx.hard ? primes(29, 97) : primes(11, 29)); g = ctx.pick(gens(q));
                sk = ctx.ri(2, q - 2); r = ctx.ri(2, q - 2); m = ctx.ri(2, q - 1); r2 = ctx.ri(2, q - 2);
            }
            var pw = function (u, v) { return ctx.powmod(u, v, q); };
            var h = pw(g, sk), c1 = pw(g, r), c2 = m * pw(h, r) % q, s = pw(c1, sk), si = ctx.inv(s, q);
            var P = { q: q, g: g, sk: sk, h: h, r: r, m: m, c1: c1, c2: c2, s: s, si: si, y1: pw(g, r2), y2: m * pw(h, r2) % q };
            if (ctx.easy) return P;
            if (r2 === r || s === 1 || !distinct([g, h, c1, c2])) continue;
            if ([g, h, c2].some(function (x) { return pw(x, sk) === s; })) continue;
            if (!distinct([c1, c2, s, si])) continue;
            var l = [c1, c2, s, si], bad = false;
            for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (!(i === 1 && j === 3) && l[i] * l[j] % q === m) bad = true;
            if (bad) continue;
            return P;
        }
    }
    room({
        id: 'elgamal-mailbox', name: 'ElGamal Mailbox', tag: 'ElGamal', order: 80,
        time: { easy: 120, normal: 80, hard: 60 }, make: makeEG,
        build: function (ctx) {
            setup(ctx);
            var P = makeEG(ctx), q = P.q;
            var g3 = '<div class="chb-grid chb-grid2"><span>Owner\'s public key</span>' + kv(['q = ' + q, 'g = ' + P.g, 'h = ' + P.h]) +
                '<span>Under the doormat</span>' + kv(['sk = ' + P.sk]) + '<span>Letter in the mailbox</span>' + kv(['c' + S1 + ' = ' + P.c1, 'c' + S2 + ' = ' + P.c2]) + '</div>' +
                '<p class="chb-txt chx-dim" style="font-size:.88rem;margin-top:4px">c' + S1 + ' = g<sup>r</sup> and c' + S2 + ' = m × h<sup>r</sup>, with a random r that is never sent</p>';
            ctx.el.appendChild(card(ctx, null, g3));
            var steps = H(ctx, 'ol', 'chb-steps'), found = H(ctx, 'div');
            ['Mask: s = c' + S1 + ' to the power sk', 'Undo the mask: s<sup>-1</sup>, the inverse of s', 'Message: m = c' + S2 + ' × s<sup>-1</sup>'].forEach(function (t) { steps.appendChild(H(ctx, 'li', null, t)); });
            var sc = card(ctx, 'Open it in three steps'); sc.appendChild(steps); sc.appendChild(found);
            ctx.el.appendChild(sc);
            var slot = ctx.h('div'); slot.style.width = '100%';
            ctx.el.appendChild(slot);
            var it = {
                g: { key: 'g', name: 'g', v: P.g }, h: { key: 'h', name: 'h', v: P.h }, c1: { key: 'c1', name: 'c' + S1, v: P.c1 },
                c2: { key: 'c2', name: 'c' + S2, v: P.c2 }, sk: { key: 'sk', name: 'sk', v: P.sk }, s: { key: 's', name: 's', v: P.s }, si: { key: 'si', name: 's<sup>-1</sup>', v: P.si }
            };
            function at(k, got) {
                Array.prototype.forEach.call(steps.children, function (li, i) { li.className = i < k ? 'ok' : i === k ? 'now' : ''; });
                if (got) found.innerHTML = '<div class="chb-c chb-mono" style="margin-top:6px">' + got + '</div>';
            }
            function put(t) { var first = !slot.firstChild; slot.innerHTML = ''; slot.appendChild(t.el); if (!first) reveal(ctx, slot); }
            function s1() {
                at(0);
                ctx.tip('You have the secret key. Step 1: find the mask <b>s = c' + S1 + ' to the power sk</b> with the power machine.');
                ctx.hint('Tap base c1 (' + P.c1 + '): ' + P.c1 + ' to the power ' + P.sk + ' mod ' + q + ' = ' + P.s + '.');
                put(powTool(ctx, q, [it.g, it.h, it.c1, it.c2], [it.sk], [{
                    label: 'That is the mask s', fn: function (r, x) {
                        if (x[0].key !== 'c1') { ctx.wrong('The mask comes from c1, the part made with the random r.'); return; }
                        ctx.sfx('move'); s2();
                    }
                }], 'Power machine (mod ' + q + ')'));
            }
            function s2() {
                at(1, 's = ' + P.s);
                ctx.tip('Step 2: <b>undo the mask</b>. Pick the number whose inverse you need.');
                ctx.hint('Tap s (' + P.s + '): its inverse is ' + P.si + ', because ' + P.s + ' × ' + P.si + ' mod ' + q + ' = 1.');
                put(tool(ctx, {
                    title: 'Inverse machine (mod ' + q + ')', rows: [{ label: 'Tap a number', items: [it.c1, it.c2, it.s] }], slots: [0],
                    calc: function (v) { return ctx.inv(v[0], q); },
                    show: function (v, x, r) {
                        return { f: v[0] + '<sup>-1</sup> mod ' + q + ' = ' + r, n: x[0] ? '(because ' + x[0].v + ' × ' + ctx.inv(x[0].v, q) + ' mod ' + q + ' = 1)' : '' };
                    },
                    actions: [{
                        label: 'That undoes the mask', fn: function (r, x) {
                            if (x[0].key !== 's') { ctx.wrong('You need the inverse of the mask s, not of the letter.'); return; }
                            ctx.sfx('move'); s3();
                        }
                    }]
                }));
            }
            function s3() {
                at(2, 's = ' + P.s + ' &nbsp; s<sup>-1</sup> = ' + P.si);
                ctx.tip('Step 3: <b>take the mask off</b>: multiply c' + S2 + ' by s<sup>-1</sup> to read the message.');
                ctx.hint('Tap c2 (' + P.c2 + ') and s-1 (' + P.si + '): ' + P.c2 + ' × ' + P.si + ' mod ' + q + ' = ' + P.m + '.');
                var mt = mulTool(ctx, q, [it.c1, it.c2, it.s, it.si], [{
                    label: 'Read the letter', fn: function (r, x) {
                        var k = [x[0].key, x[1].key].sort().join();
                        if (k !== 'c2,si') { ctx.wrong('That reads as nonsense. Multiply c2 by the inverse of s.'); mt.clear(); return; }
                        at(3, 'The letter says <b class="chx-ok">m = ' + P.m + '</b>');
                        slot.innerHTML = '';
                        slot.appendChild(card(ctx, null, '<p class="chb-txt">Yesterday\'s letter was (' + P.y1 + ', ' + P.y2 + '): the same ' + P.m +
                            ', with a new r. It never looks the same twice.</p>', 'chb-done'));
                        ctx.solve('ElGamal mixes in a fresh random r every time, so the same message never encrypts the same way twice. Textbook RSA always gives the same ciphertext, which lets anyone spot repeats.');
                    }
                }], 'Multiply machine (mod ' + q + ')');
                put(mt);
            }
            s1();
        }
    });

    /* ================= 14. Yes-No Oracle (Hard) =================
       The server answers only "is the decryption at least half of N?". Query k sends c times (2^e)^k, which decrypts to
       2^k m mod N; that is big exactly when binary digit k+1 of m/N is 1. So each answer keeps one half of the range. */
    var ORACLE_N = [33, 35, 39, 51, 55, 57];
    function makeOracle(ctx) {
        for (;;) {
            var N = ctx.pick(ORACLE_N), p = 2;
            while (N % p) p++;
            var q = N / p, phi = (p - 1) * (q - 1);
            var es = [3, 5, 7, 11, 13].filter(function (e) { return ctx.gcd(e, phi) === 1 && ctx.inv(e, phi) !== e; });
            if (!es.length) continue;
            var e = ctx.pick(es), d = ctx.inv(e, phi), m = ctx.ri(2, N - 1), c = ctx.powmod(m, e, N), t = ctx.powmod(2, e, N);
            if (c === m || t === 2) continue;
            return { N: N, e: e, d: d, m: m, c: c, t: t };
        }
    }
    /* the integers in [N j / 2^k, N (j+1) / 2^k) */
    function span(N, j, k) { var z = Math.pow(2, k); return [Math.ceil(N * j / z), Math.ceil(N * (j + 1) / z) - 1]; }
