/* Toolbox: matrix calculator over Q or Z_n: determinant (elimination, and cofactors up to 3x3), inverse by
   Gauss-Jordan on [A | I], product, transpose, rank, row echelon and reduced row echelon form. Every row operation
   is shown with the matrix after it (Calc.lib.gmath does the elimination). */
Calc.tool({
    id: 'matrix',
    live: true,
    inputs: [
        { id: 'A', type: 'textarea', rows: 4, label: 'Matrix $A$', placeholder: '2 -3 1\n2 0 -1\n1 4 5', help: 'One row per line, entries separated by spaces or commas. Fractions like 3/4 and decimals are fine.' },
        { id: 'B', type: 'textarea', rows: 3, optional: true, label: 'Matrix $B$ (only for the product $A \\cdot B$)', placeholder: '1 0\n0 1\n2 1' },
        { id: 'ring', type: 'select', label: 'Numbers', width: 'l', value: 'q', options: [['q', 'Rational numbers (fractions)'], ['mod', 'Integers modulo n']] },
        { id: 'n', label: 'Modulus $n$', placeholder: '26', min: 2, when: { ring: 'mod' } }
    ],
    actions: [
        { id: 'det', label: 'Determinant' }, { id: 'inv', label: 'Inverse' }, { id: 'mul', label: 'Product A·B' },
        { id: 'tr', label: 'Transpose' }, { id: 'rank', label: 'Rank' }, { id: 'ref', label: 'Echelon form' }, { id: 'rref', label: 'Reduced echelon form' }
    ],
    examples: [
        { A: '2 -3 1\n2 0 -1\n1 4 5', B: '', ring: 'q', _action: 'det' },
        { A: '2 1 1\n1 3 2\n1 0 0', B: '', ring: 'q', _action: 'inv' },
        { A: '3 3\n2 5', B: '', ring: 'mod', n: '26', _action: 'inv' },
        { A: '1 2 3\n4 5 6', B: '7 8\n9 10\n11 12', ring: 'q', _action: 'mul' },
        { A: '1 2 -1 3\n2 4 1 0\n3 6 0 3', B: '', ring: 'q', _action: 'rref' },
        { A: '6 24 1\n13 16 10\n20 17 15', B: '', ring: 'mod', n: '26', _action: 'det' },
        { A: '1/2 1/3\n1/4 1/5', B: '', ring: 'q', _action: 'inv' }
    ],
    run: function (v, S) {
        var gm = Calc.lib.gmath, nt = Calc.lib.nt, T = Calc.tex, act = v._action;
        var MAX = 8;
        var Aq = gm.parseMatrix(v.A, 'Matrix A', 'A');
        var R, modn = v.ring === 'mod', n = modn ? v.n : null, prime = modn && nt.isPrime(n);
        if (Aq.length > MAX || Aq[0].length > MAX) Calc.fail('At most ' + MAX + ' rows and ' + MAX + ' columns, so that every step stays readable.', 'A');
        Aq.forEach(function (r) { r.forEach(function (x) { if (String(x.n).length > 40 || String(x.d).length > 40) Calc.fail('Entries of at most 40 digits, please.', 'A'); }); });
        if (modn) {
            if (n > 10n ** 30n) Calc.fail('A modulus of at most 30 digits, please.', 'n');
            R = gm.ringMod(n, prime);
        } else R = gm.ringQ();
        var Rq = gm.ringQ();
        var mod = modn ? ' \\pmod{' + T(n) + '}' : '';
        var rows = Aq.length, cols = Aq[0].length, square = rows === cols;
        function mt(M, o) { return gm.mtex(R, M, o); }
        /* entries reduced modulo n */
        function toRing(Mq, name) {
            var M = gm.convert(R, Mq);
            if (modn) {
                var changed = Mq.some(function (r, i) { return r.some(function (x, j) { return x.d !== 1n || x.n !== M[i][j]; }); });
                if (changed) {
                    var s = S.step('Reduce the entries of $' + name + '$ modulo $' + T(n) + '$');
                    s.p('Modulo $n$ only the remainder matters' + (Mq.some(function (r) { return r.some(function (x) { return x.d !== 1n; }); }) ? '; a fraction $a/b$ means $a \\cdot b^{-1}$' : '') + ':');
                    s.math(gm.mtex(Rq, Mq) + ' \\equiv ' + mt(M) + mod);
                }
            }
            return M;
        }
        function needSquare(what) { if (!square) Calc.fail('The ' + what + ' needs a square matrix; this one has ' + rows + ' rows and ' + cols + ' columns.', 'A'); }
        function needField(what) {
            if (modn && !prime) Calc.fail(what + ' needs a field: modulo n that means n prime, and ' + n + ' is not prime (for a composite modulus the determinant and the inverse still work).', 'n');
        }
        /* one step per column of an elimination */
        var st = {};
        function showGroups(groups, o) { o = o || {}; o.state = st; gm.showSteps(S, R, groups, o); }

        if (act === 'tr') {
            var A0 = toRing(Aq, 'A'), At = gm.transpose(A0);
            S.result('$A^{T} = ' + mt(At) + '$', { copy: gm.mstr(R, At) });
            S.step('Turn rows into columns').p('The transpose has $(A^T)_{ij} = a_{ji}$: row $i$ of $A$ becomes column $i$ of $A^T$, so a ' + rows + ' by ' + cols + ' matrix becomes ' + cols + ' by ' + rows + '.')
                .math('A = ' + mt(A0) + ' \\quad\\Longrightarrow\\quad A^{T} = ' + mt(At));
            if (square && gm.mEq(R, A0, At)) S.note('$A^T = A$: this matrix is symmetric.');
            return;
        }

        if (act === 'mul') {
            if (!String(v.B || '').trim()) Calc.fail('Type a matrix B for the product.', 'B');
            var Bq = gm.parseMatrix(v.B, 'Matrix B', 'B');
            if (Bq.length > MAX || Bq[0].length > MAX) Calc.fail('At most ' + MAX + ' rows and ' + MAX + ' columns.', 'B');
            if (cols !== Bq.length) Calc.fail('A times B needs as many columns in A as rows in B: A is ' + rows + ' by ' + cols + ', B is ' + Bq.length + ' by ' + Bq[0].length + '.', 'B');
            var A1 = toRing(Aq, 'A'), B1 = toRing(Bq, 'B');
            /* over Q directly; modulo n with the representatives as integers, reduced at the end */
            var Ai = A1.map(function (r) { return r.map(function (x) { return modn ? gm.Q(x) : x; }); }), Bi = B1.map(function (r) { return r.map(function (x) { return modn ? gm.Q(x) : x; }); });
            var P = gm.mmul(R, A1, B1), p = Bq[0].length;
            S.result('$A \\cdot B = ' + mt(P) + mod + '$', { copy: gm.mstr(R, P) });
            S.step('Sizes').p('$A$ is ' + rows + ' by ' + cols + ' and $B$ is ' + cols + ' by ' + p + ', so $A \\cdot B$ is ' + rows + ' by ' + p + '.')
                .math(mt(A1) + ' \\cdot ' + mt(B1));
            var trows = [];
            for (var i = 0; i < rows; i++) for (var j = 0; j < p; j++) {
                var terms = [], sum = gm.Q(0n);
                for (var k = 0; k < cols; k++) { terms.push(Rq.texp(Ai[i][k]) + ' \\cdot ' + Rq.texp(Bi[k][j])); sum = gm.add(sum, gm.mul(Ai[i][k], Bi[k][j])); }
                var val = '$' + Rq.tex(sum) + (modn ? ' \\equiv ' + T(P[i][j]) : '') + '$';
                trows.push(['$c_{' + (i + 1) + (j + 1) + '}$', '$' + terms.join(' + ') + '$', val]);
            }
            S.step('Row times column').p('Entry $c_{ij}$ is row $i$ of $A$ times column $j$ of $B$: multiply entry by entry and add' + (modn ? ', then reduce modulo $' + T(n) + '$' : '') + '.')
                .table(['Entry', 'Row times column', 'Value'], trows);
            S.step('The product').math('A \\cdot B = ' + mt(P) + mod);
            return;
        }

        var A = toRing(Aq, 'A');

        if (act === 'det') {
            needSquare('determinant');
            var d, cof = null;
            if (rows <= 3) {
                /* cofactors over the integers (the representatives) or Q */
                var Ac = modn ? A.map(function (r) { return r.map(function (x) { return gm.Q(x); }); }) : A, q = Rq.tex, qp = Rq.texp;
                var sc = S.step(rows === 1 ? 'A 1 by 1 matrix' : rows === 2 ? 'The 2 by 2 formula' : 'Cofactor expansion along the first row');
                if (rows === 1) { cof = Ac[0][0]; sc.p('The determinant of a 1 by 1 matrix is its entry.').math('\\det A = ' + q(cof)); }
                else if (rows === 2) {
                    cof = gm.sub(gm.mul(Ac[0][0], Ac[1][1]), gm.mul(Ac[0][1], Ac[1][0]));
                    sc.p('For $\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$ the determinant is $a d - b c$:');
                    sc.lines(['\\det A &= ' + qp(Ac[0][0]) + ' \\cdot ' + qp(Ac[1][1]) + ' - ' + qp(Ac[0][1]) + ' \\cdot ' + qp(Ac[1][0]),
                        '&= ' + q(gm.mul(Ac[0][0], Ac[1][1])) + ' - ' + qp(gm.mul(Ac[0][1], Ac[1][0])) + ' = ' + q(cof) + (modn ? ' \\equiv ' + T(gm.mod(cof.n, n)) + mod : '')]);
                } else {
                    var parts = [], vals = [], minors = [];
                    cof = gm.Q(0n);
                    for (var jj = 0; jj < 3; jj++) {
                        var mn = Ac.slice(1).map(function (r) { return r.filter(function (_, kk) { return kk !== jj; }); });
                        var md = gm.sub(gm.mul(mn[0][0], mn[1][1]), gm.mul(mn[0][1], mn[1][0]));
                        var sign = jj === 1 ? ' - ' : jj ? ' + ' : '';
                        parts.push(sign + qp(Ac[0][jj]) + ' \\cdot \\begin{vmatrix} ' + q(mn[0][0]) + ' & ' + q(mn[0][1]) + ' \\\\ ' + q(mn[1][0]) + ' & ' + q(mn[1][1]) + ' \\end{vmatrix}');
                        minors.push(sign + qp(Ac[0][jj]) + ' \\cdot (' + qp(mn[0][0]) + ' \\cdot ' + qp(mn[1][1]) + ' - ' + qp(mn[0][1]) + ' \\cdot ' + qp(mn[1][0]) + ')');
                        vals.push(sign + qp(Ac[0][jj]) + ' \\cdot ' + qp(md));
                        var t = gm.mul(Ac[0][jj], md);
                        cof = jj === 1 ? gm.sub(cof, t) : gm.add(cof, t);
                    }
                    sc.p('Each entry of the first row times the 2 by 2 determinant left when its row and column are deleted, with the signs $+\\,-\\,+$:');
                    sc.lines(['\\det A &= ' + parts.join(''), '&= ' + minors.join(''), '&= ' + vals.join(''), '&= ' + q(cof) + (modn ? ' \\equiv ' + T(gm.mod(cof.n, n)) + mod : '')]);
                }
                if (modn) cof = gm.mod(cof.n, n);
            }
            var red = gm.reduce(R, A);
            if (rows > 1) {
                var si = S.step('Elimination: the plan');
                si.p('Bring $A$ to triangular form with row operations that keep track of the determinant: adding a multiple of one row to another does not change it, and a swap of two rows changes its sign. ' +
                    'The determinant of a triangular matrix is the product of its diagonal.');
                si.math('A = ' + mt(A));
                showGroups(red.groups);
            }
            d = gm.detFrom(R, red);
            var sf = S.step('Multiply the diagonal');
            if (red.pivots.length < rows) sf.p('A column without a pivot means the triangular form has a 0 on its diagonal, so the determinant is 0.').math('\\det A = 0' + mod);
            else if (rows > 1) {
                var diag = [];
                for (var ii = 0; ii < rows; ii++) diag.push(R.texp(red.M[ii][ii]));
                sf.p(red.swaps ? 'There ' + (red.swaps === 1 ? 'was 1 swap' : 'were ' + red.swaps + ' swaps') + ', so the sign is $(-1)^{' + red.swaps + '} = ' + (red.swaps % 2 ? '-1' : '1') + '$.' : 'There were no swaps, so the sign stays.');
                var prodQ = null;
                if (modn) { prodQ = 1n; for (var kk = 0; kk < rows; kk++) prodQ *= red.M[kk][kk]; if (red.swaps % 2) prodQ = -prodQ; }
                sf.math('\\det A = ' + (red.swaps % 2 ? '-' : '') + diag.join(' \\cdot ') + ' = ' + (modn ? T(prodQ) + ' \\equiv ' + T(d) + mod : R.tex(d)));
            } else sf.math('\\det A = ' + R.tex(d) + mod);
            if (cof !== null && rows > 1) sf.check(R.eq(cof, d), 'The cofactor expansion gives the same value');
            else if (rows <= 7) sf.check(R.eq(gm.detCofactor(R, A), d), 'The cofactor expansion (computed separately) gives the same value');
            S.result('$\\det A ' + (modn ? '\\equiv ' : '= ') + R.tex(d) + mod + '$', { copy: R.str(d) });
            if (modn) S.note(R.unit(d) ? '$\\gcd(' + T(d) + ', ' + T(n) + ') = 1$, so $A$ is invertible modulo $' + T(n) + '$.' : '$\\gcd(' + T(d) + ', ' + T(n) + ') = ' + T(gm.gcd(d, n)) + ' \\ne 1$, so $A$ has no inverse modulo $' + T(n) + '$.');
            else S.note(R.isZero(d) ? 'The determinant is 0: $A$ is singular (it has no inverse, and its rows are linearly dependent).' : 'The determinant is not 0, so $A$ is invertible.');
            return;
        }

        if (act === 'inv') {
            needSquare('inverse');
            var I = gm.identity(R, rows), AI = A.map(function (r, i) { return r.concat(I[i]); });
            var s0 = S.step('Write $[A \\mid I]$');
            s0.p('Put the identity matrix next to $A$. Row operations that turn the left half into $I$ turn the right half into $A^{-1}$ (Gauss-Jordan elimination).');
            s0.math(mt(AI, { bar: cols }));
            var rj = gm.reduce(R, AI, { cols: cols, jordan: true });
            var cut = rj.groups.length, firstZero = -1;
            rj.groups.forEach(function (g, i) { if (g.zero && firstZero < 0) firstZero = i; });
            if (firstZero >= 0) cut = firstZero + 1;
            showGroups(rj.groups.slice(0, cut), { bar: cols, jordan: true });
            if (firstZero >= 0 || rj.stuck) {
                var why = S.step('No inverse');
                if (rj.stuck) why.p('Column ' + (rj.stuck.col + 1) + ' has no invertible pivot: the determinant is then a multiple of $' + T(gm.gcd(rj.stuck.pivot, n)) + '$, which divides $' + T(n) + '$. A matrix is invertible modulo $n$ exactly when $\\gcd(\\det A, n) = 1$.');
                else why.p('The left half cannot become $I$: column ' + (rj.groups[firstZero].col + 1) + ' has no pivot. So the rows of $A$ are linearly dependent, $\\det A = 0' + mod + '$, and $A$ has no inverse.');
                var dd = gm.detFrom(R, gm.reduce(R, A));
                why.math('\\det A ' + (modn ? '\\equiv ' : '= ') + R.tex(dd) + mod);
                S.result('$A$ has no inverse' + (modn ? ' modulo $' + T(n) + '$' : ''), { copy: 'no inverse' });
                S.note(modn ? '$\\gcd(\\det A, n) = ' + T(gm.gcd(dd, n)) + ' \\ne 1$.' : 'The determinant is 0: $A$ is singular.');
                return;
            }
            var Inv = rj.M.map(function (r) { return r.slice(cols); });
            S.step('Read off the inverse').p('The left half is now $I$, so the right half is $A^{-1}$:').math('A^{-1} = ' + mt(Inv) + mod);
            var chk = gm.mmul(R, A, Inv);
            S.step('Check').math(mt(A) + ' \\cdot ' + mt(Inv) + (modn ? ' \\equiv ' : ' = ') + mt(chk) + mod).check(gm.isIdentity(R, chk), '$A \\cdot A^{-1} = I$');
            S.result('$A^{-1} = ' + mt(Inv) + mod + '$', { copy: gm.mstr(R, Inv) });
            return;
        }

        /* rank, echelon forms */
        needField(act === 'rank' ? 'The rank' : 'The echelon form');
        var rf = gm.reduce(R, A);
        var sp = S.step('Forward elimination');
        sp.p('Column by column, take a pivot (a non-zero entry, swapping rows if needed) and make every entry below it 0. Stop when the rows or the columns run out.');
        sp.math('A = ' + mt(A));
        showGroups(rf.groups);
        var rk = rf.pivots.length;
        if (act === 'rank') {
            S.step('Count the pivots').p('The echelon form has ' + rk + ' non-zero row' + (rk === 1 ? '' : 's') + ', one per pivot.').math(mt(rf.M, {}))
                .p('So $\\operatorname{rank} A = ' + rk + '$, and the null space has dimension ' + cols + ' - ' + rk + ' = ' + (cols - rk) + ' (rank-nullity).');
            S.result('$\\operatorname{rank} A = ' + rk + '$', { copy: String(rk) });
            S.note(rk === Math.min(rows, cols) ? 'Full rank: the ' + (rows <= cols ? 'rows' : 'columns') + ' are linearly independent.' : 'Not full rank: the rows are linearly dependent.');
            return;
        }
        if (act === 'ref') {
            S.step('Row echelon form').p('Every pivot is to the right of the one above, and below each pivot there are only zeros.').math(mt(rf.M) + mod);
            S.result('$' + mt(rf.M) + '$', { copy: gm.mstr(R, rf.M), label: 'Row echelon form' });
            S.note('A row echelon form is not unique (other row operations give other ones); the reduced form is. Rank ' + rk + '.');
            return;
        }
        var bk = gm.backward(R, rf.M, rf.pivots);
        if (bk.groups.length) {
            showGroups(bk.groups, { back: true, intro: 'Backward phase: from the last pivot up, scale each pivot to 1 and clear the entries above it.' });
        }
        S.step('Reduced row echelon form').p('Every pivot is 1 and is the only non-zero entry in its column.').math(mt(bk.M) + mod);
        S.result('$' + mt(bk.M) + '$', { copy: gm.mstr(R, bk.M), label: 'Reduced row echelon form' });
        S.note('Pivot columns: ' + rf.pivots.map(function (p) { return p.col + 1; }).join(', ') + (rk ? '' : 'none') + '. Rank ' + rk + '.');
    }
});
