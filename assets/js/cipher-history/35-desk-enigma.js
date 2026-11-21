/* Cipher History desk tool: the Enigma machine (the German Army's Enigma I with rotors I to V and reflector B; the
   wirings and turnover letters are the published ones) and Rejewski's characteristic.

   CH.enigma.make({ order: ['II', 'I', 'III'], rings: 'AAA', pos: 'KQD', plugs: 'AB CD ...' }) returns a machine m:
     m.key(letter)      steps the rotors (with the middle rotor's double step), then sends the letter through the
                        plugboard, the three rotors, the reflector, back through the rotors and the plugboard
     m.text(s)          every letter of s in turn (other characters dropped)
     m.window()         the three letters in the windows, left to right; m.set('KQD') sets them
     m.trace(letter)    like key(), but also returns the letter after each part, for the lamp drawing
   CH.enigma.perms(order, pos)       the six permutations of the first six key presses from pos, no plugboard
   CH.enigma.characteristic(...)     the cycle lengths of AD, BE and CF, as Rejewski called them, e.g. '10 10 2 2 1 1'
   CH.enigma.cycles(map)             the cycles of a permutation given as an array of 26 letter codes
   CH.enigma.search(target, done)    every rotor order of I, II, III and every start position whose characteristic
                                     is target (Rejewski's catalogue, made on the fly), in chunks so the page stays
                                     responsive; done(list) gets [{ order, pos }]
   CH.desk.enigma(el, opt)           the machine on the page: rotor windows with arrows, the plugboard as text, the
                                     visitor's text in and out, and the path of the last letter. */
(function () {
    'use strict';
    var A = CH.ALPHA;
    var ROTORS = {
        I: { w: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', turn: 'Q' },
        II: { w: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', turn: 'E' },
        III: { w: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', turn: 'V' },
        IV: { w: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', turn: 'J' },
        V: { w: 'VZBRGITYUPSDNHLXAWMJQOFECK', turn: 'Z' }
    };
    var REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';
    var FWD = {}, BWD = {}, TURN = {};
    Object.keys(ROTORS).forEach(function (r) {
        var f = [], b = [];
        for (var i = 0; i < 26; i++) { f[i] = A.indexOf(ROTORS[r].w.charAt(i)); b[f[i]] = i; }
        FWD[r] = f; BWD[r] = b; TURN[r] = A.indexOf(ROTORS[r].turn);
    });
    var REF = [];
    for (var i = 0; i < 26; i++) REF[i] = A.indexOf(REFLECTOR_B.charAt(i));
    function code(c) { return A.indexOf(String(c).toUpperCase()); }
    function mod(x) { return ((x % 26) + 26) % 26; }

    /* the plugboard: 'AB CD' swaps A with B and C with D; letters used twice are ignored the second time */
    function plugMap(text) {
        var p = [];
        for (var i = 0; i < 26; i++) p[i] = i;
        String(text || '').toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).forEach(function (pair) {
            if (pair.length !== 2) return;
            var a = code(pair.charAt(0)), b = code(pair.charAt(1));
            if (a === b || p[a] !== a || p[b] !== b) return;
            p[a] = b; p[b] = a;
        });
        return p;
    }

    function make(cfg) {
        var order = (cfg.order || ['I', 'II', 'III']).slice();
        var rings = String(cfg.rings || 'AAA').toUpperCase().split('').map(code);
        var pos = String(cfg.pos || 'AAA').toUpperCase().split('').map(code);
        var plug = plugMap(cfg.plugs);
        function through(c, r, p, ring, back) {
            var t = back ? BWD[r] : FWD[r];
            return mod(t[mod(c + p - ring)] - p + ring);
        }
        function step() {
            var mid = pos[1] === TURN[order[1]], right = pos[2] === TURN[order[2]];
            if (mid) { pos[0] = mod(pos[0] + 1); pos[1] = mod(pos[1] + 1); }
            else if (right) pos[1] = mod(pos[1] + 1);
            pos[2] = mod(pos[2] + 1);
        }
        function run(c, path) {
            c = plug[c]; if (path) path.push(c);
            for (var k = 2; k >= 0; k--) { c = through(c, order[k], pos[k], rings[k], false); if (path) path.push(c); }
            c = REF[c]; if (path) path.push(c);
            for (k = 0; k < 3; k++) { c = through(c, order[k], pos[k], rings[k], true); if (path) path.push(c); }
            c = plug[c]; if (path) path.push(c);
            return c;
        }
        var m = {
            key: function (L) { var c = code(L); if (c < 0) return ''; step(); return A.charAt(run(c)); },
            trace: function (L) { var c = code(L), path = [c]; step(); run(c, path); return path.map(function (x) { return A.charAt(x); }); },
            text: function (s) { return String(s).toUpperCase().replace(/[^A-Z]/g, '').split('').map(m.key).join(''); },
            window: function () { return pos.map(function (x) { return A.charAt(x); }).join(''); },
            set: function (w) { pos = String(w).toUpperCase().split('').map(code); },
            order: order
        };
        return m;
    }

    /* the six permutations of the first six key presses from pos (no plugboard, rings at A), as code arrays */
    function perms(order, pos) {
        var p = typeof pos === 'string' ? pos.split('').map(code) : pos.slice();
        var f0 = FWD[order[0]], f1 = FWD[order[1]], f2 = FWD[order[2]], b0 = BWD[order[0]], b1 = BWD[order[1]], b2 = BWD[order[2]];
        var out = [];
        for (var k = 0; k < 6; k++) {
            /* the rotors step before each key press, as in make() */
            var mid = p[1] === TURN[order[1]], right = p[2] === TURN[order[2]];
            if (mid) { p[0] = (p[0] + 1) % 26; p[1] = (p[1] + 1) % 26; } else if (right) p[1] = (p[1] + 1) % 26;
            p[2] = (p[2] + 1) % 26;
            var q0 = p[0], q1 = p[1], q2 = p[2], row = [];
            for (var c = 0; c < 26; c++) {
                var x = (f2[(c + q2) % 26] - q2 + 26) % 26;
                x = (f1[(x + q1) % 26] - q1 + 26) % 26;
                x = (f0[(x + q0) % 26] - q0 + 26) % 26;
                x = REF[x];
                x = (b0[(x + q0) % 26] - q0 + 26) % 26;
                x = (b1[(x + q1) % 26] - q1 + 26) % 26;
                row[c] = (b2[(x + q2) % 26] - q2 + 26) % 26;
            }
            out.push(row);
        }
        return out;
    }
    function cycles(map) {
        var seen = [], out = [];
        for (var s = 0; s < 26; s++) {
            if (seen[s]) continue;
            var cyc = [], x = s;
            while (!seen[x]) { seen[x] = true; cyc.push(x); x = map[x]; }
            out.push(cyc);
        }
        return out;
    }
    function lengths(map) { return cycles(map).map(function (c) { return c.length; }).sort(function (a, b) { return b - a; }).join(' '); }
    /* AD maps the first letter of a doubled key to the fourth: x = A(k), y = D(k), so AD(x) = D(A(x)) since A undoes itself */
    function product(P, Q) { var r = []; for (var c = 0; c < 26; c++) r[c] = Q[P[c]]; return r; }
    function characteristic(order, pos) {
        var p = perms(order, pos);
        return [lengths(product(p[0], p[3])), lengths(product(p[1], p[4])), lengths(product(p[2], p[5]))];
    }

    /* a faster version for the search: the six permutations at all 17576 positions of one rotor order */
    var ORDERS = [['I', 'II', 'III'], ['I', 'III', 'II'], ['II', 'I', 'III'], ['II', 'III', 'I'], ['III', 'I', 'II'], ['III', 'II', 'I']];
    function search(target, done, progress) {
        var found = [], o = 0, n = 0;
        function chunk() {
            var stop = n + 1500;
            for (; n < 17576 && n < stop; n++) {
                var pos = A.charAt(Math.floor(n / 676)) + A.charAt(Math.floor(n / 26) % 26) + A.charAt(n % 26);
                var p = perms(ORDERS[o], pos);
                if (lengths(product(p[0], p[3])) !== target[0]) continue;
                if (lengths(product(p[1], p[4])) + '|' + lengths(product(p[2], p[5])) === target[1] + '|' + target[2]) found.push({ order: ORDERS[o].slice(), pos: pos });
            }
            if (n >= 17576) { o++; n = 0; }
            if (progress) progress((o * 17576 + n) / (6 * 17576));
            if (o >= 6) { done(found); return; }
            if (typeof setTimeout === 'function' && progress) setTimeout(chunk, 0); else chunk();
        }
        chunk();
    }

    CH.enigma = { make: make, perms: perms, cycles: cycles, lengths: lengths, product: product, characteristic: characteristic, search: search, plugMap: plugMap, ORDERS: ORDERS, ROTORS: ROTORS };

    /* ---------- the machine on the page ---------- */
    var NAMES = ['I', 'II', 'III', 'IV', 'V'];
    CH.desk.enigma = function (el, opt) {
        opt = opt || {};
        var state = { order: (opt.order || ['I', 'II', 'III']).slice(), pos: opt.pos || 'AAA', plugs: opt.plugs || '' };
        var rotorRow = CH.el('div', { class: 'ch-en-rotors' });
        el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'The rotors (left to right) and their start letters' }));
        el.appendChild(rotorRow);
        var plugIn = CH.input(state.plugs, { 'aria-label': 'Plugboard pairs' });
        el.appendChild(CH.field('Plugboard: pairs of letters that swap', plugIn, 'Up to 10 pairs, for example AB CD EF. The army used 6 at first.'));
        var input = CH.textarea(opt.text || 'Attack at dawn', 2);
        el.appendChild(CH.field('Your text', input));
        var out = CH.pre('', 'is-cipher');
        el.appendChild(CH.el('p', { class: 'ch-out-h', text: 'Enigma\'s output' }));
        el.appendChild(out);
        var path = CH.el('p', { class: 'ch-en-path', 'aria-live': 'polite' });
        el.appendChild(path);
        var check = CH.el('p', { class: 'ch-help' });
        el.appendChild(check);

        var windows = [];
        function drawRotors() {
            CH.clear(rotorRow);
            windows = [];
            [0, 1, 2].forEach(function (k) {
                var sel = CH.el('select', { class: 'ch-en-sel', 'aria-label': 'Rotor in slot ' + (k + 1) });
                NAMES.forEach(function (n) { var o = CH.el('option', { value: n, text: n }); if (state.order[k] === n) o.selected = true; sel.appendChild(o); });
                sel.addEventListener('change', function () {
                    var other = state.order.indexOf(sel.value);
                    if (other >= 0 && other !== k) state.order[other] = state.order[k];
                    state.order[k] = sel.value;
                    drawRotors(); draw();
                });
                var win = CH.el('b', { class: 'ch-en-win', text: state.pos.charAt(k) });
                windows.push(win);
                var turn = function (d) { return function () { var p = state.pos.split(''); p[k] = A.charAt(mod(code(p[k]) + d)); state.pos = p.join(''); win.textContent = p[k]; draw(); }; };
                rotorRow.appendChild(CH.el('div', { class: 'ch-en-rotor' }, [
                    sel,
                    CH.el('button', { type: 'button', class: 'ch-btn ch-en-arrow', 'aria-label': 'Rotor ' + (k + 1) + ' back', text: '▲', on: { click: turn(-1) } }),
                    win,
                    CH.el('button', { type: 'button', class: 'ch-btn ch-en-arrow', 'aria-label': 'Rotor ' + (k + 1) + ' on', text: '▼', on: { click: turn(1) } })
                ]));
            });
        }
        function draw() {
            state.plugs = plugIn.value;
            var m = make({ order: state.order, pos: state.pos, plugs: state.plugs });
            var letters = String(input.value).toUpperCase().replace(/[^A-Z]/g, ''), res = '', last = null;
            for (var i = 0; i < letters.length; i++) { if (i === letters.length - 1) last = m.trace(letters.charAt(i)); else res += m.key(letters.charAt(i)); }
            if (last) res += last[last.length - 1];
            out.textContent = res.replace(/(.{5})/g, '$1 ').trim() || ' ';
            if (last) path.textContent = 'Last letter: ' + last[0] + ', plugboard ' + last[1] + ', rotors ' + last.slice(2, 5).join(' ') + ', reflector ' + last[5] + ', back ' + last.slice(6, 9).join(' ') + ', plugboard ' + last[10] + '. Windows now: ' + m.window() + '.';
            else path.textContent = '';
            var back = make({ order: state.order, pos: state.pos, plugs: state.plugs }).text(res);
            check.textContent = res ? 'Type the output into a machine set the same way and you get ' + back.slice(0, 30) + (back.length > 30 ? '...' : '') + ' back: the same machine deciphers. No letter ever becomes itself.' : '';
            if (opt.onChange) opt.onChange(state);
        }
        input.addEventListener('input', draw);
        plugIn.addEventListener('input', draw);
        drawRotors();
        draw();
        return { state: state, redraw: function () { drawRotors(); draw(); } };
    };
})();
