/* Toolbox: Bacon's cipher: every letter as five binary symbols (24 or 26 letter alphabet), written with two symbols
   or hidden in the upper and lower case letters of a cover text. */
Calc.tool({
    id: 'bacon',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Bacon'),
        { id: 'version', type: 'select', label: 'Alphabet', width: 'l', value: '24', options: [['24', '24 letters (I = J, U = V), as Bacon'], ['26', '26 letters, each its own code']] },
        { id: 'mode', type: 'select', label: 'Written as', width: 'l', value: 'symbols', options: [['symbols', 'Two symbols'], ['case', 'Lower and upper case of a cover text']] },
        { id: 'a', type: 'text', label: 'First symbol', width: 's', value: 'A', placeholder: 'A', maxLength: 1, optional: true, when: { mode: 'symbols' } },
        { id: 'b', type: 'text', label: 'Second symbol', width: 's', value: 'B', placeholder: 'B', maxLength: 1, optional: true, when: { mode: 'symbols' } },
        { id: 'cover', type: 'textarea', label: 'Cover text (for encrypting: five letters for each letter of the message)', rows: 3, maxLength: 20000, optional: true, when: { mode: 'case' } }
    ],
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Bacon', version: '24', mode: 'symbols', a: 'A', b: 'B' },
        { text: 'AAAAB AAAAA AAABA ABBAB ABBAA', version: '24', mode: 'symbols', a: 'A', b: 'B', _action: 'dec' },
        { text: 'Yes', version: '26', mode: 'case', cover: 'Meet me by the old oak tree at noon, and bring the map.' },
        { text: 'MEet me bY thE olD oak', version: '26', mode: 'case', cover: '', _action: 'dec' },
        { text: 'Run', version: '26', mode: 'symbols', a: '0', b: '1' }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, tx = Calc.lib.text, enc = v._action !== 'dec', V24 = v.version === '24';
        var alpha = V24 ? 'ABCDEFGHIKLMNOPQRSTUWXYZ' : C.AZ;
        var A = v.mode === 'case' ? 'a' : String(v.a || 'A'), B = v.mode === 'case' ? 'b' : String(v.b || 'B');
        if (A.toUpperCase() === B.toUpperCase()) Calc.fail('The two symbols must be different.', 'b');
        if (/\s/.test(A + B)) Calc.fail('A symbol cannot be a space.', /\s/.test(A) ? 'a' : 'b');
        function code(k) { var s = ''; for (var i = 4; i >= 0; i--) s += (k >> i) & 1 ? 'b' : 'a'; return s; }
        function sym(s) { return s.replace(/[ab]/g, function (c) { return c === 'a' ? A : B; }); }
        function norm(L) { return V24 ? L.replace(/J/g, 'I').replace(/V/g, 'U') : L; }
        var out = '', rows = [], ab = '';
        if (enc) {
            var L = norm(tx.letters(v.text));
            if (!L) Calc.fail('The text has no letters A to Z.', 'text');
            var groups = L.split('').map(function (c) { var k = alpha.indexOf(c), cd = code(k); rows.push([c, k, '$' + k.toString(2) + '_2$', cd, Calc.esc(sym(cd))]); return cd; });
            ab = groups.join('');
            if (v.mode === 'case') {
                var cv = tx.deaccent(v.cover || '');
                var nl = tx.letters(cv).length;
                if (nl < ab.length) Calc.fail('The cover text needs at least ' + ab.length + ' letters (5 for each of the ' + L.length + ' letters); it has ' + nl + '.', 'cover');
                var j = 0;
                for (var i = 0; i < cv.length && j < ab.length; i++) {
                    var c = cv.charAt(i);
                    if (tx.idx(c) >= 0) { out += ab.charAt(j) === 'a' ? c.toLowerCase() : c.toUpperCase(); j++; }
                    else out += c;
                }
                /* finish the word in lower case (fewer than five extra letters are ignored when reading) */
                for (var e = 0; i < cv.length && e < 4 && tx.idx(cv.charAt(i)) >= 0; i++, e++) out += cv.charAt(i).toLowerCase();
            } else out = groups.map(sym).join(' ');
        } else {
            var s = v.mode === 'case' ? tx.deaccent(v.text) : String(v.text);
            for (var q = 0; q < s.length; q++) {
                var ch = s.charAt(q);
                if (v.mode === 'case') { if (tx.idx(ch) >= 0) ab += ch === ch.toUpperCase() ? 'b' : 'a'; }
                else if (ch === A || ch === B) ab += ch === A ? 'a' : 'b';
                else if (ch.toUpperCase() === A.toUpperCase()) ab += 'a';
                else if (ch.toUpperCase() === B.toUpperCase()) ab += 'b';
            }
            if (ab.length < 5) Calc.fail(v.mode === 'case' ? 'The text needs at least five letters.' : 'The text needs at least five of the symbols ' + A + ' and ' + B + '.', 'text');
            for (var g = 0; g + 5 <= ab.length; g += 5) {
                var cd2 = ab.slice(g, g + 5), k2 = parseInt(cd2.replace(/a/g, '0').replace(/b/g, '1'), 2), letter = k2 < alpha.length ? alpha.charAt(k2) : '?';
                out += letter;
                rows.push([Calc.esc(v.mode === 'case' ? cd2 : sym(cd2)), cd2, '$' + k2.toString(2) + '_2 = ' + k2 + '$', letter === 'I' && V24 ? 'I/J' : letter === 'U' && V24 ? 'U/V' : letter]);
            }
        }
        var left = enc ? 0 : ab.length % 5;
        C.result(S, out, enc, !enc && /\?/.test(out) ? 'A ? is a group above ' + (alpha.length - 1) + ', which the ' + alpha.length + ' letter alphabet does not use.' : !enc && V24 && /[IU]/.test(out) ? 'In the 24 letter alphabet I also stands for J and U for V.' : '');
        if (left) S.note('The last ' + left + ' symbol' + (left > 1 ? 's do' : ' does') + ' not make a full group of five and ' + (left > 1 ? 'are' : 'is') + ' ignored.');

        var s1 = S.step('The code');
        s1.p('Number the ' + alpha.length + ' letters from 0' + (V24 ? ' (I and J share a number, so do U and V)' : '') + ' and write each number in binary with five digits: 0 becomes ' + (v.mode === 'case' ? 'a' : Calc.esc(A)) + ', 1 becomes ' + (v.mode === 'case' ? 'b' : Calc.esc(B)) + '. Five binary digits give $2^5 = 32$ codes, enough for the alphabet.');
        var tab = [];
        for (var r = 0; r < alpha.length; r += 2) tab.push([alpha.charAt(r), Calc.esc(sym(code(r))), alpha.charAt(r + 1), Calc.esc(sym(code(r + 1)))]);
        s1.table(['Letter', 'Code', 'Letter', 'Code'], tab, { mono: true, max: 13 });
        if (v.mode === 'case') s1.p('Here the symbols are hidden in a cover text: a lower case letter means a, an upper case letter means b. The other characters do not count.');
        if (enc) {
            S.step('Letter by letter').table(['Letter', 'Number', 'Binary', 'a/b', v.mode === 'case' ? 'Code' : 'Written'], rows, { mono: true });
            if (v.mode === 'case') S.step('Hide the code in the cover text').p('Go through the letters of the cover text and make each one lower case for a, upper case for b. The cover is cut after the ' + ab.length + ' letters needed (at the end of that word).').pre(out.length > 600 ? out.slice(0, 600) + '…' : out);
        } else {
            S.step('Read the groups of five').p(v.mode === 'case' ? 'The case of the letters, a for lower and b for upper, in groups of five:' : 'Only ' + Calc.esc(A) + ' and ' + Calc.esc(B) + ' are read (spaces and other characters are ignored), in groups of five:')
                .table(['Group', 'a/b', 'Number', 'Letter'], rows, { mono: true });
        }
        /* check: the other direction */
        if (enc) {
            var bk = '';
            for (var z = 0; z + 5 <= ab.length; z += 5) bk += alpha.charAt(parseInt(ab.slice(z, z + 5).replace(/a/g, '0').replace(/b/g, '1'), 2));
            C.checkBack(S, enc, bk, norm(tx.letters(v.text)), V24 && /[JV]/i.test(v.text) ? '(J written as I, V as U)' : '');
        } else {
            var re = out.split('').map(function (c, i) { var k = alpha.indexOf(c); return k < 0 ? ab.slice(5 * i, 5 * i + 5) : code(k); }).join('');
            C.checkBack(S, enc, re, ab.slice(0, ab.length - left), '(as a and b)');
        }
    }
});
