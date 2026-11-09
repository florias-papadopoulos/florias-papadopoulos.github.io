/* Toolbox: Playfair cipher: the 5x5 square from the keyword, the text split into pairs (filler between doubled
   letters and at the end), and each pair with its rule (same row, same column, rectangle). */
Calc.tool({
    id: 'playfair',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Hide the gold in the tree stump'),
        { id: 'key', type: 'text', label: 'Keyword', placeholder: 'PLAYFAIR EXAMPLE', optional: true },
        { id: 'sq', type: 'select', label: 'Square', width: 'l', value: 'ij', options: Calc.lib.classic.squareOptions(false) },
        { id: 'pad', type: 'text', label: 'Filler letter', width: 's', value: 'X', placeholder: 'X', maxLength: 1, optional: true, help: 'Separates doubled letters and completes the last pair.' },
        { id: 'five', type: 'check', label: 'Output in groups of five', value: false }
    ],
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'Hide the gold in the tree stump', key: 'PLAYFAIR EXAMPLE', sq: 'ij', pad: 'X', five: false },
        { text: 'BMODZBXDNABEKUDMUIXMMOUVIF', key: 'PLAYFAIR EXAMPLE', sq: 'ij', pad: 'X', five: false, _action: 'dec' },
        { text: 'Meet me at the bookshop at noon', key: 'MONARCHY', sq: 'ij', pad: 'X', five: true }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, enc = v._action !== 'dec', sq = C.square(v.key || '', v.sq);
        var L = C.sqChars(v.text, v.sq);
        if (!L.length) Calc.fail('The text has no letters for the square.', 'text');
        var pad = C.sqChars(v.pad || 'X', v.sq);
        if (pad.length !== 1) Calc.fail('The filler must be one letter of the square.', 'pad');
        var alt = ['X', 'Q', 'Z', 'K'].filter(function (c) { return c !== pad && sq.pos[c]; })[0];
        var pairs = [], notes = [];
        if (enc) {
            for (var i = 0; i < L.length;) {
                var a = L.charAt(i), b = L.charAt(i + 1);
                if (!b) { var f = a === pad ? alt : pad; pairs.push(a + f); notes.push('last letter alone: add ' + f); i++; }
                else if (a === b) { var g = a === pad ? alt : pad; pairs.push(a + g); notes.push('doubled ' + a + ': insert ' + g); i++; }
                else { pairs.push(a + b); notes.push(''); i += 2; }
            }
        } else {
            if (L.length % 2) Calc.fail('A Playfair ciphertext has an even number of letters (this one has ' + L.length + ').', 'text');
            for (var j = 0; j < L.length; j += 2) {
                if (L.charAt(j) === L.charAt(j + 1)) Calc.fail('The pair ' + L.slice(j, j + 2) + ' has two equal letters, which Playfair never produces: this is not a Playfair ciphertext.', 'text');
                pairs.push(L.slice(j, j + 2));
            }
        }
        var n = sq.n, d = enc ? 1 : n - 1, rows = [], out = '';
        var RULE = { row: enc ? 'same row: one to the right' : 'same row: one to the left', col: enc ? 'same column: one down' : 'same column: one up', rect: 'rectangle: swap the columns' };
        function apply(pr, dd) {
            var A = sq.pos[pr.charAt(0)], B = sq.pos[pr.charAt(1)], kind, x, y;
            if (A[0] === B[0]) { kind = 'row'; x = sq.rows[A[0]][(A[1] + dd) % n]; y = sq.rows[B[0]][(B[1] + dd) % n]; }
            else if (A[1] === B[1]) { kind = 'col'; x = sq.rows[(A[0] + dd) % n][A[1]]; y = sq.rows[(B[0] + dd) % n][B[1]]; }
            else { kind = 'rect'; x = sq.rows[A[0]][B[1]]; y = sq.rows[B[0]][A[1]]; }
            return { kind: kind, out: x + y, A: A, B: B };
        }
        pairs.forEach(function (pr) {
            var r = apply(pr, d);
            out += r.out;
            rows.push([pr, '$(' + (r.A[0] + 1) + ',' + (r.A[1] + 1) + ')$, $(' + (r.B[0] + 1) + ',' + (r.B[1] + 1) + ')$', RULE[r.kind], r.out]);
        });
        var res = v.five ? Calc.lib.text.groups(out, 5) : out;
        var clean = '';
        if (!enc) {
            /* likely fillers: between two equal letters across a pair boundary, and at the very end */
            for (var k = 0; k < out.length; k++) {
                var c = out.charAt(k);
                if ((c === pad || c === alt) && k % 2 === 1 && ((k + 1 < out.length && out.charAt(k - 1) === out.charAt(k + 1)) || k === out.length - 1)) continue;
                clean += c;
            }
        }
        C.result(S, res, enc, !enc && clean !== out ? 'Without the likely filler letters: ' + Calc.esc(clean) + ' (check by reading: a filler can also be a real letter).' : '');

        var t = C.squareTable(sq);
        S.step('The square').p(C.squareWords(sq)).table(t.head, t.rows, { mono: true });

        var s2 = S.step(enc ? 'Split the text into pairs' : 'Split the ciphertext into pairs');
        if (enc) {
            s2.p('The letters are ' + C.short(L, 80) + (v.sq === 'ij' && /J/i.test(Calc.lib.text.deaccent(v.text)) ? ' (J written as I)' : '') + (v.sq === 'q' && /Q/i.test(Calc.lib.text.deaccent(v.text)) ? ' (Q left out)' : '') + '. A pair may not hold the same letter twice, so ' + pad + ' goes between doubled letters (' + alt + ' when the letter is ' + pad + ' itself), and a last letter alone gets a filler too.');
            var fx = [];
            notes.forEach(function (nt, i) { if (nt && fx.length < 12) fx.push(pairs[i] + ': ' + nt); });
            if (fx.length) s2.list(fx);
        }
        s2.pre(pairs.slice(0, 60).join(' ') + (pairs.length > 60 ? ' ...' : ''));

        S.step((enc ? 'Encrypt' : 'Decrypt') + ' each pair').p('Find both letters in the square (row, column). Three cases:')
            .list([enc ? 'Same row: each letter is replaced by the one to its right (wrapping around to the start of the row).' : 'Same row: each letter is replaced by the one to its left (wrapping around).',
                enc ? 'Same column: each letter is replaced by the one below it (wrapping around to the top).' : 'Same column: each letter is replaced by the one above it (wrapping around).',
                'Otherwise the two letters are opposite corners of a rectangle: each is replaced by the corner in its own row, the order kept.'])
            .table(['Pair', 'Positions', 'Rule', 'Result'], rows);

        var back = '';
        for (var q = 0; q < out.length; q += 2) back += apply(out.slice(q, q + 2), enc ? n - 1 : 1).out;
        C.checkBack(S, enc, back, pairs.join(''), enc ? '(the prepared pairs)' : '');
    }
});
