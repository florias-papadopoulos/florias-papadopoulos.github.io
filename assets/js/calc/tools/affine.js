/* Toolbox: affine cipher E(x) = a x + b mod 26: the key checked (gcd(a, 26) = 1), a^-1 mod 26 by the extended
   Euclidean algorithm for decryption, and a letter by letter table. */
Calc.tool({
    id: 'affine',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Affine cipher'),
        { id: 'a', label: 'Multiplier $a$', placeholder: '5', width: 's', help: 'Coprime to 26: 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23 or 25.' },
        { id: 'b', label: 'Shift $b$', placeholder: '8', width: 's' }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Affine cipher', a: '5', b: '8', keep: true, caseK: false, five: false },
        { text: 'IHHWVC SWFRCP', a: '5', b: '8', keep: true, caseK: false, five: false, _action: 'dec' },
        { text: 'Mathematics is the queen of the sciences.', a: '17', b: '20', keep: true, caseK: true, five: false }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, nt = Calc.lib.nt, enc = v._action !== 'dec', p = C.prep(v.text);
        var a = Number(nt.mod(v.a, 26n)), b = Number(nt.mod(v.b, 26n));
        if (C.gcd(a, 26) !== 1) {
            var ok = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25], lo = null, hi = null;
            ok.forEach(function (x) { if (x < a) lo = x; if (x > a && hi === null) hi = x; });
            var near = [lo, hi].filter(function (x) { return x !== null; }).join(' or ');
            Calc.fail((a === 0 ? 'a ≡ 0 (mod 26) sends every letter to the same letter' : 'gcd(' + a + ', 26) = ' + C.gcd(a, 26) + ' (' + (a % 2 === 0 ? 'both are even' : 'both are multiples of 13') + '), so two different letters would be encrypted to the same one and the text could not be decrypted') +
                '. The multiplier must be coprime to 26: 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23 or 25' + (near ? ' (the nearest: ' + near + ')' : '') + '.', 'a');
        }
        C.needLetters(p);
        var ai = C.inv(a, 26);
        function E(x) { return (a * x + b) % 26; }
        function D(y) { return C.mod(ai * (y - b), 26); }
        var out = '';
        for (var i = 0; i < p.L.length; i++) out += C.AZ.charAt((enc ? E : D)(C.idx(p.L.charAt(i))));
        C.result(S, C.put(p, out, v), enc);

        var s1 = S.step('The key');
        if (String(v.a) !== String(a) || String(v.b) !== String(b)) s1.p('Only the remainders modulo 26 matter: $a = ' + a + '$, $b = ' + b + '$.');
        s1.p('With A = 0, ..., Z = 25, encryption is')
            .math('E(x) = (' + a + ' \\cdot x + ' + b + ') \\bmod 26');
        s1.p('This can be undone only if multiplying by $a$ can be undone modulo 26, that is, when $\\gcd(a, 26) = 1$. Here $\\gcd(' + a + ', 26) = 1$, since $' + a + '$ is odd and not a multiple of 13. In all there are $12$ possible values of $a$ and $26$ of $b$: $312$ keys.');

        if (!enc) {
            var s2 = S.step('The inverse of $a$ modulo 26');
            s2.p('To undo $y = a x + b$, subtract $b$ and multiply by $a^{-1}$: $x = a^{-1} (y - b) \\bmod 26$.');
            C.invSteps(s2, a, 26);
            s2.p('So decryption is');
            s2.math('D(y) = ' + ai + ' \\cdot (y - ' + b + ') \\bmod 26');
        }

        var head = [], row = [];
        for (var j = 0; j < 26; j++) { head.push(C.AZ.charAt(j)); row.push(C.AZ.charAt(E(j))); }
        S.step('The substitution alphabet').p('Plain letters on top, their cipher letters below (from $E(x)$ for $x = 0, \\dots, 25$):').table(head, [row], { mono: true });

        var rows = [];
        for (var m = 0; m < p.L.length; m++) {
            var x = C.idx(p.L.charAt(m));
            rows.push([p.L.charAt(m), x, enc ? C.modCell(a + ' \\cdot ' + x + ' + ' + b, a * x + b) : C.modCell(ai + ' \\cdot (' + x + ' - ' + b + ')', ai * (x - b)), out.charAt(m)]);
        }
        S.step('Letter by letter').p('Other characters are ' + (v.keep && !v.five ? 'kept as they are.' : 'left out.'))
            .table([enc ? 'Plain' : 'Cipher', enc ? '$x$' : '$y$', enc ? '$' + a + 'x + ' + b + ' \\bmod 26$' : '$' + ai + '(y - ' + b + ') \\bmod 26$', enc ? 'Cipher' : 'Plain'], rows, { mono: true });

        var back = '';
        for (var k = 0; k < out.length; k++) back += C.AZ.charAt((enc ? D : E)(C.idx(out.charAt(k))));
        C.checkBack(S, enc, back, p.L, '(letters only)');
    }
});
