/* Toolbox: Atbash, the alphabet read backwards (x -> 25 - x), with the pairs and a letter by letter table. */
Calc.tool({
    id: 'atbash',
    live: true,
    inputs: [Calc.lib.classic.textInput('Wizard of Oz')].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Wizard of Oz', keep: true, caseK: true, five: false },
        { text: 'GSV JFRXP YILDM ULC', keep: true, caseK: true, five: false, _action: 'dec' }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', p = C.prep(v.text);
        C.needLetters(p);
        function at(L) { var o = ''; for (var i = 0; i < L.length; i++) o += C.AZ.charAt(25 - C.idx(L.charAt(i))); return o; }
        var out = at(p.L);
        C.result(S, C.put(p, out, v), enc, 'Atbash has no key, and encrypting and decrypting are the same operation.');

        var s1 = S.step('The rule');
        s1.p('Write the alphabet backwards under itself: A and Z swap, B and Y, and so on. With A = 0, ..., Z = 25, the letter $x$ becomes')
            .math('E(x) = 25 - x');
        s1.p('Applying it twice gives $25 - (25 - x) = x$, so the same rule decrypts. (Atbash is the affine cipher with $a = 25$, $b = 25$.)');
        var head = [], row = [];
        for (var j = 0; j < 26; j++) { head.push(C.AZ.charAt(j)); row.push(C.AZ.charAt(25 - j)); }
        s1.table(head, [row], { mono: true });

        var rows = [];
        for (var m = 0; m < p.L.length; m++) { var x = C.idx(p.L.charAt(m)); rows.push([p.L.charAt(m), x, '$25 - ' + x + ' = ' + (25 - x) + '$', out.charAt(m)]); }
        S.step('Letter by letter').p('Other characters are ' + (v.keep && !v.five ? 'kept as they are.' : 'left out.'))
            .table([enc ? 'Plain' : 'Cipher', '$x$', '$25 - x$', enc ? 'Cipher' : 'Plain'], rows, { mono: true });
        C.checkBack(S, enc, at(out), p.L, '(letters only)');
    }
});
