/* Toolbox: monoalphabetic substitution with a keyed alphabet (keyword, then the rest) or a full 26-letter alphabet. */
Calc.tool({
    id: 'keyword-substitution',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Flee at once. We are discovered!'),
        { id: 'mode', type: 'select', label: 'Key', width: 'l', value: 'keyword', options: [['keyword', 'A keyword (keyed alphabet)'], ['alphabet', 'A full substitution alphabet']] },
        { id: 'key', type: 'text', label: 'Keyword', placeholder: 'ZEBRAS', when: { mode: 'keyword' } },
        { id: 'fill', type: 'select', label: 'Then', width: 'l', value: 'az', when: { mode: 'keyword' }, options: [['az', 'the rest of the alphabet from A'], ['after', 'the rest from the letter after the keyword']] },
        { id: 'alpha', type: 'text', label: 'Cipher alphabet (the letters that A, B, ..., Z become)', width: 'l', placeholder: 'QWERTYUIOPASDFGHJKLZXCVBNM', when: { mode: 'alphabet' } }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Flee at once. We are discovered!', mode: 'keyword', key: 'ZEBRAS', fill: 'az', keep: true, caseK: false, five: false },
        { text: 'SIAA ZQ LKBA. VA ZOA RFPBLUAOAR!', mode: 'keyword', key: 'ZEBRAS', fill: 'az', keep: true, caseK: false, five: false, _action: 'dec' },
        { text: 'The quick brown fox jumps over the lazy dog', mode: 'alphabet', alpha: 'QWERTYUIOPASDFGHJKLZXCVBNM', keep: true, caseK: true, five: true }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, tx = Calc.lib.text, enc = v._action !== 'dec', p = C.prep(v.text), alpha, how;
        if (v.mode === 'alphabet') {
            alpha = tx.letters(v.alpha || '');
            var cnt = {}, dup = [], miss = [];
            alpha.split('').forEach(function (c) { cnt[c] = (cnt[c] || 0) + 1; if (cnt[c] === 2) dup.push(c); });
            for (var q = 0; q < 26; q++) if (!cnt[C.AZ.charAt(q)]) miss.push(C.AZ.charAt(q));
            if (alpha.length !== 26 || dup.length) Calc.fail('The cipher alphabet must contain each of the 26 letters exactly once (it has ' + alpha.length + ' letters' + (dup.length ? '; repeated: ' + dup.join(', ') : '') + (miss.length ? '; missing: ' + miss.join(', ') : '') + ').', 'alpha');
            how = 'The key is the cipher alphabet itself: A becomes ' + alpha.charAt(0) + ', B becomes ' + alpha.charAt(1) + ', and so on.';
        } else {
            var kw = C.letterKey(v.key, 'key', 'The keyword'), head = '';
            kw.split('').forEach(function (c) { if (head.indexOf(c) < 0) head += c; });
            var rest = '';
            if (v.fill === 'after') {
                var st = C.idx(head.charAt(head.length - 1));
                for (var r = 1; r <= 26; r++) { var c = C.AZ.charAt((st + r) % 26); if (head.indexOf(c) < 0) rest += c; }
            } else C.AZ.split('').forEach(function (c) { if (head.indexOf(c) < 0) rest += c; });
            alpha = head + rest;
            how = 'Write the keyword ' + Calc.esc(kw) + ' without repeated letters: ' + head + '. Then add the letters it does not use, ' + (v.fill === 'after' ? 'starting after ' + head.charAt(head.length - 1) + ' and wrapping around from Z to A' : 'in alphabetical order') + ': ' + rest + '.';
        }
        C.needLetters(p);
        var invA = [];
        for (var i = 0; i < 26; i++) invA[C.idx(alpha.charAt(i))] = C.AZ.charAt(i);
        invA = invA.join('');
        var from = enc ? C.AZ : alpha, to = enc ? alpha : C.AZ;
        function map(L, f, t) { var o = ''; for (var j = 0; j < L.length; j++) o += t.charAt(f.indexOf(L.charAt(j))); return o; }
        var out = map(p.L, from, to);
        var fixed = [];
        for (var z = 0; z < 26; z++) if (alpha.charAt(z) === C.AZ.charAt(z)) fixed.push(C.AZ.charAt(z));
        C.result(S, C.put(p, out, v), enc, fixed.length ? 'With this key ' + fixed.join(', ') + (fixed.length > 1 ? ' stay' : ' stays') + ' unchanged.' : '');

        var hd = C.AZ.split('');
        S.step('The cipher alphabet').p(how).table(['Plain'].concat(hd), [['Cipher'].concat(alpha.split(''))], { mono: true });
        if (!enc) {
            S.step('Turn it around for decrypting').p('To decrypt, look each cipher letter up in the lower row and take the letter above it. Sorted by cipher letter:')
                .table(['Cipher'].concat(hd), [['Plain'].concat(invA.split(''))], { mono: true });
        }
        var rows = [];
        for (var m = 0; m < p.L.length; m++) rows.push([p.L.charAt(m), out.charAt(m)]);
        S.step('Letter by letter').p('Each letter is replaced by its partner; other characters are ' + (v.keep && !v.five ? 'kept as they are.' : 'left out.'))
            .table([enc ? 'Plain' : 'Cipher', enc ? 'Cipher' : 'Plain'], rows, { mono: true });
        C.checkBack(S, enc, map(out, to, from), p.L, '(letters only)');
    }
});
