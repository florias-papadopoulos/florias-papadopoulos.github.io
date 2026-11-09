/* Toolbox: Hill cipher with a 2x2 or 3x3 key matrix: the determinant and the inverse matrix modulo 26 (keys that
   cannot be inverted are refused with the reason), then the text in blocks multiplied by the matrix. */
Calc.tool({
    id: 'hill',
    live: true,
    inputs: [
        Calc.lib.classic.textInput('Act'),
        { id: 'key', type: 'text', label: 'Key matrix', width: 'l', placeholder: 'GYBNQKURP', help: '4 or 9 letters (GYBNQKURP), or 4 or 9 numbers row by row (3 3 2 5).' },
        { id: 'conv', type: 'select', label: 'Vectors', width: 'l', value: 'col', options: [['col', 'Columns: c = K p'], ['row', 'Rows: c = p K']] },
        { id: 'pad', type: 'text', label: 'Filler letter', width: 's', value: 'X', placeholder: 'X', maxLength: 1, optional: true, help: 'Completes the last block.' }
    ].concat(Calc.lib.classic.formatInputs()),
    actions: Calc.lib.classic.ACTIONS,
    examples: [
        { text: 'ACT', key: 'GYBNQKURP', conv: 'col', pad: 'X', keep: true, caseK: true, five: false },
        { text: 'Help', key: '3 3 2 5', conv: 'col', pad: 'X', keep: true, caseK: true, five: false },
        { text: 'POH', key: 'GYBNQKURP', conv: 'col', pad: 'X', keep: true, caseK: true, five: false, _action: 'dec' },
        { text: 'Short example, with punctuation!', key: 'HILL', conv: 'row', pad: 'X', keep: true, caseK: true, five: false }
    ],
    run: function (v, S) {
        var C = Calc.lib.classic, tx = Calc.lib.text, enc = v._action !== 'dec', raw = String(v.key).trim(), nums;
        if (/\d/.test(raw)) {
            if (/[A-Za-z]/.test(raw)) Calc.fail('Give the key as letters or as numbers, not both.', 'key');
            nums = (raw.match(/-?\d+/g) || []).map(Number);
        } else nums = tx.letters(raw).split('').map(C.idx);
        if (nums.length !== 4 && nums.length !== 9) Calc.fail('The key needs 4 entries (a 2 by 2 matrix) or 9 entries (3 by 3); this one has ' + nums.length + '.', 'key');
        var n = nums.length === 4 ? 2 : 3, K = [];
        for (var r = 0; r < n; r++) K.push(nums.slice(r * n, r * n + n).map(function (x) { return C.mod(x, 26); }));
        var M = v.conv === 'row' ? K.map(function (row, i) { return row.map(function (x, j) { return K[j][i]; }); }) : K;
        function mt(A) { return '\\begin{pmatrix}' + A.map(function (row) { return row.join(' & '); }).join(' \\\\ ') + '\\end{pmatrix}'; }
        function col(x) { return '\\begin{pmatrix}' + x.join(' \\\\ ') + '\\end{pmatrix}'; }
        function paren(x) { return x < 0 ? '(' + x + ')' : String(x); }
        /* determinant, with its computation in TeX */
        var a = M, det, detTex;
        if (n === 2) { det = a[0][0] * a[1][1] - a[0][1] * a[1][0]; detTex = a[0][0] + ' \\cdot ' + a[1][1] + ' - ' + a[0][1] + ' \\cdot ' + a[1][0]; }
        else {
            var m0 = a[1][1] * a[2][2] - a[1][2] * a[2][1], m1 = a[1][0] * a[2][2] - a[1][2] * a[2][0], m2 = a[1][0] * a[2][1] - a[1][1] * a[2][0];
            det = a[0][0] * m0 - a[0][1] * m1 + a[0][2] * m2;
            detTex = a[0][0] + ' \\cdot ' + paren(m0) + ' - ' + a[0][1] + ' \\cdot ' + paren(m1) + ' + ' + a[0][2] + ' \\cdot ' + paren(m2);
        }
        var dm = C.mod(det, 26), g = C.gcd(dm, 26);
        if (g !== 1) {
            Calc.fail('This key cannot be used: the determinant of the matrix is ' + det + (dm !== det ? ', which is ' + dm + ' modulo 26' : '') + ', and ' + (dm === 0 ? 'that is 0' : 'gcd(' + dm + ', 26) = ' + g + ' (it is ' + (g === 2 ? 'even' : g === 13 ? 'a multiple of 13' : 'a multiple of 26') + ')') +
                '. So the matrix has no inverse modulo 26, and different plaintexts would give the same ciphertext. Change one entry of the key until the determinant is odd and not a multiple of 13.', 'key');
        }
        /* adjugate and inverse modulo 26 */
        var adj;
        if (n === 2) adj = [[a[1][1], -a[0][1]], [-a[1][0], a[0][0]]];
        else {
            var cof = [];
            for (var i = 0; i < 3; i++) {
                cof.push([]);
                for (var j = 0; j < 3; j++) {
                    var rr = [0, 1, 2].filter(function (x) { return x !== i; }), cc = [0, 1, 2].filter(function (x) { return x !== j; });
                    var mi = a[rr[0]][cc[0]] * a[rr[1]][cc[1]] - a[rr[0]][cc[1]] * a[rr[1]][cc[0]];
                    cof[i].push((i + j) % 2 ? -mi : mi);
                }
            }
            adj = [0, 1, 2].map(function (i) { return [0, 1, 2].map(function (j) { return cof[j][i]; }); });
        }
        var di = C.inv(dm, 26);
        var adjm = adj.map(function (row) { return row.map(function (x) { return C.mod(x, 26); }); });
        var Inv = adjm.map(function (row) { return row.map(function (x) { return C.mod(di * x, 26); }); });
        function mul(A, x) { return A.map(function (row) { return row.reduce(function (s, y, k) { return s + y * x[k]; }, 0); }); }

        var p = C.prep(v.text);
        C.needLetters(p);
        var L = p.L, padded = 0;
        if (L.length % n) {
            if (!enc) Calc.fail('The ciphertext must have a multiple of ' + n + ' letters (it has ' + L.length + ').', 'text');
            var pad = tx.letters(v.pad || 'X');
            if (pad.length !== 1) Calc.fail('The filler must be one letter.', 'pad');
            while (L.length % n) { L += pad; padded++; }
        }
        var use = enc ? M : Inv, out = '', rows = [];
        for (var b = 0; b < L.length; b += n) {
            var x = L.slice(b, b + n).split('').map(C.idx), y = mul(use, x), z = y.map(function (t) { return C.mod(t, 26); });
            var o = z.map(function (t) { return C.AZ.charAt(t); }).join('');
            out += o;
            rows.push([L.slice(b, b + n), '$(' + x.join(', ') + ')$', '$(' + y.join(', ') + ')$', '$(' + z.join(', ') + ')$', o]);
        }
        C.result(S, C.put(p, out, v), enc, padded ? 'The last block was completed with ' + padded + ' filler letter' + (padded > 1 ? 's' : '') + '.' : '');

        var s1 = S.step('The key matrix');
        if (/\d/.test(raw)) s1.p('The ' + nums.length + ' numbers, row by row' + (nums.some(function (x) { return x < 0 || x > 25; }) ? ', reduced modulo 26' : '') + ':');
        else s1.p('The letters ' + Calc.esc(tx.letters(raw)) + ' as numbers (A = 0, ..., Z = 25), row by row:');
        s1.math('K = ' + mt(K));
        if (v.conv === 'row') {
            s1.p('With row vectors, $c = p\\,K$. Transposing gives $c^{T} = K^{T} p^{T}$, so this is the column method with the transposed matrix, used from here on:');
            s1.math('K^{T} = ' + mt(M));
        }
        var nm = v.conv === 'row' ? '(K^{T})' : 'K';
        var s2 = S.step('The determinant modulo 26');
        s2.p(n === 2 ? 'For a 2 by 2 matrix, $\\det = ad - bc$:' : 'Expanding along the first row, with the 2 by 2 minors:');
        s2.math('\\det ' + nm + ' = ' + detTex + ' = ' + det + (dm !== det ? ' \\equiv ' + dm : '') + ' \\pmod{26}');
        s2.p('$\\gcd(' + dm + ', 26) = 1$, so the determinant can be inverted modulo 26 and so can the matrix.');
        var s3 = S.step('The inverse of the determinant');
        C.invSteps(s3, dm, 26);
        var s4 = S.step('The inverse matrix modulo 26');
        if (n === 2) s4.p('For $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$ the adjugate is $\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}$, and $' + nm + '^{-1} = (\\det ' + nm + ')^{-1} \\cdot \\operatorname{adj} ' + nm + '$:');
        else s4.p('The adjugate is the transposed matrix of cofactors $(-1)^{i+j} M_{ij}$ ($M_{ij}$ is the determinant left after deleting row $i$ and column $j$), and $' + nm + '^{-1} = (\\det ' + nm + ')^{-1} \\cdot \\operatorname{adj} ' + nm + '$:');
        s4.lines([
            '\\operatorname{adj} ' + nm + ' &= ' + mt(adj) + (adj.some(function (row) { return row.some(function (x) { return x < 0 || x > 25; }); }) ? ' \\equiv ' + mt(adjm) : ''),
            nm + '^{-1} &\\equiv ' + di + ' \\cdot ' + mt(adjm) + ' \\equiv ' + mt(Inv) + ' \\pmod{26}'
        ]);
        var I = M.map(function (row, i) { return Inv[0].map(function (q, j) { return C.mod(row.reduce(function (s, y, k) { return s + y * Inv[k][j]; }, 0), 26); }); });
        var isI = I.every(function (row, i) { return row.every(function (q, j) { return q === (i === j ? 1 : 0); }); });
        s4.math(nm + ' \\cdot ' + nm + '^{-1} \\equiv ' + mt(I) + ' \\pmod{26}');
        s4.check(isI, 'The product is the identity matrix');

        var s5 = S.step((enc ? 'Encrypt' : 'Decrypt') + ' block by block');
        s5.p('Cut the letters into blocks of ' + n + (padded ? ' (the last one completed with the filler)' : '') + ', turn each block into a column vector and multiply by ' + (enc ? '$' + nm + '$' : '$' + nm + '^{-1}$') + ' modulo 26.' + (v.keep || v.caseK ? ' Spaces, punctuation and case are put back afterwards.' : ''));
        var x0 = L.slice(0, n).split('').map(C.idx), y0 = mul(use, x0);
        var sums = use.map(function (row) { return row.map(function (q, k) { return q + ' \\cdot ' + x0[k]; }).join(' + '); });
        s5.p('The first block, ' + L.slice(0, n) + ':');
        s5.math(mt(use) + col(x0) + ' = ' + col(sums) + ' = ' + col(y0) + ' \\equiv ' + col(y0.map(function (t) { return C.mod(t, 26); })));
        s5.table(['Block', 'Vector', 'Product', 'mod 26', 'Result'], rows, { mono: true });

        var back = '', other = enc ? Inv : M;
        for (var q = 0; q < out.length; q += n) back += mul(other, out.slice(q, q + n).split('').map(C.idx)).map(function (t) { return C.AZ.charAt(C.mod(t, 26)); }).join('');
        C.checkBack(S, enc, back, L, padded ? '(with the filler)' : '(letters only)');
    }
});
