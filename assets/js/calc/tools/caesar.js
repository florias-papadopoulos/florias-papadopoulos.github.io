/* Toolbox: Caesar cipher (any shift, ROT-n): the shift reduced mod 26, both alphabets, a letter by letter table. */
Calc.tool({
    id: 'caesar',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Veni, vidi, vici.'),
        { id: 'shift', label: 'Shift $k$', placeholder: '3', width: 's', help: 'Any whole number; only $k \\bmod 26$ matters. ROT13 is a shift of 13.' }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Veni, vidi, vici.', shift: '3', keep: true, caseK: true, five: false },
        { text: 'The quick brown fox jumps over the lazy dog', shift: '23', keep: true, caseK: false, five: false },
        { text: 'WKH GLH LV FDVW', shift: '3', keep: true, caseK: true, five: false, _action: 'dec' }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', p = C.prep(v.text);
        C.needLetters(p);
        var k = Number(Calc.lib.nt.mod(v.shift, 26n)), d = enc ? k : C.mod(-k, 26);
        var out = '';
        for (var i = 0; i < p.L.length; i++) out += C.AZ.charAt((C.idx(p.L.charAt(i)) + d) % 26);
        var res = C.put(p, out, v);
        C.result(S, res, enc, k === 0 ? 'A shift of 0 leaves every letter as it is.' : k === 13 ? 'A shift of 13 is ROT13: encrypting and decrypting are the same.' : '');

        var s1 = S.step('The shift');
        if (String(v.shift) !== String(k)) s1.p('Shifting by 26 brings every letter back to itself, so only the remainder counts:').math(Calc.tex(v.shift) + ' \\bmod 26 = ' + k);
        if (enc) s1.p('Each letter $x$ (A = 0, B = 1, ..., Z = 25) becomes $E(x) = (x + ' + k + ') \\bmod 26$.');
        else s1.p('Decrypting shifts back: $D(y) = (y - ' + k + ') \\bmod 26$, which is the same as shifting forward by $' + d + '$.');
        if (enc && k > 13) s1.p('Moving forward by ' + k + ' is the same as moving back by $26 - ' + k + ' = ' + (26 - k) + '$.');

        var head = [], row = [];
        for (var j = 0; j < 26; j++) { head.push(C.AZ.charAt(j)); row.push(C.AZ.charAt((j + d) % 26)); }
        S.step('The two alphabets').p((enc ? 'Plain' : 'Cipher') + ' alphabet on top, the letter it becomes below:').table(head, [row], { mono: true });

        var rows = [];
        for (var m = 0; m < p.L.length; m++) {
            var x = C.idx(p.L.charAt(m));
            rows.push([p.L.charAt(m), x, C.modCell(x + (enc ? ' + ' + k : ' - ' + k), enc ? x + k : x - k), out.charAt(m)]);
        }
        S.step('Letter by letter').p('Other characters (spaces, digits, punctuation) are ' + (v.keep && !v.five ? 'kept as they are.' : 'left out.'))
            .table([enc ? 'Plain' : 'Cipher', '$x$', enc ? '$x + ' + k + ' \\bmod 26$' : '$x - ' + k + ' \\bmod 26$', enc ? 'Cipher' : 'Plain'], rows, { mono: true });

        var back = '';
        for (var b = 0; b < out.length; b++) back += C.AZ.charAt((C.idx(out.charAt(b)) - d + 26) % 26);
        C.checkBack(S, enc, back, p.L, '(letters only)');
    }
});
