/* Tests for the General maths tools and lib/general-math.js (see run.js for the API). */
(function () {
    var gm = Calc.lib.gmath, nt = Calc.lib.nt;
    /* every check block a tool produced must be a tick */
    function checksOk(S) {
        for (var i = 0; i < S.steps.length; i++) {
            var b = S.steps[i].blocks;
            for (var j = 0; j < b.length; j++) if (b[j].t === 'check' && !b[j].ok) return 'failed check in step ' + (i + 1) + ': ' + b[j].v;
        }
        return true;
    }
    function okAll(S) { return checksOk(S); }
    function matStr(M) { return M.map(function (r) { return r.map(String).join(' '); }).join('\n'); }
    /* a copied matrix back into rows of fractions */
    function readMat(s) { return s.split('\n').map(function (l) { return l.split(' ').map(gm.parseQ); }); }
    function randMat(r, rows, cols, lo, hi) { var M = []; for (var i = 0; i < rows; i++) { M.push([]); for (var j = 0; j < cols; j++) M[i].push(r.int(lo, hi)); } return M; }
    function qMat(M) { return M.map(function (row) { return row.map(function (x) { return gm.Q(x); }); }); }
    function fact(n) { var f = 1n; for (var i = 2n; i <= n; i++) f *= i; return f; }
    function binom(n, k) { if (k < 0n || k > n) return 0n; var c = 1n; for (var i = 1n; i <= k; i++) c = c * (n - i + 1n) / i; return c; }

    /* ---------- matrix ---------- */
    T.tool('matrix', [
        { in: { A: '2 -3 1\n2 0 -1\n1 4 5', ring: 'q' }, action: 'det', copy: '49', check: okAll },
        { in: { A: '1 2\n3 4', ring: 'q' }, action: 'det', copy: '-2' },
        { in: { A: '1 0 2 -1\n3 0 0 5\n2 1 4 -3\n1 0 5 0', ring: 'q' }, action: 'det', copy: '30', check: okAll },
        { in: { A: '0 1\n1 0', ring: 'q' }, action: 'det', copy: '-1' },
        { in: { A: '1 2 3\n4 5 6\n7 8 9', ring: 'q' }, action: 'det', copy: '0' },
        { in: { A: '7', ring: 'q' }, action: 'det', copy: '7' },
        { in: { A: '1/2 1/3\n1/4 1/5', ring: 'q' }, action: 'det', copy: '1/60' },
        { in: { A: '6 24 1\n13 16 10\n20 17 15', ring: 'mod', n: '26' }, action: 'det', copy: '25', check: okAll },
        { in: { A: '2 4 1\n4 2 3\n0 3 5', ring: 'mod', n: '6' }, action: 'det', copy: '0', check: okAll },
        { in: { A: '[[2, 1], [5, 3]]', ring: 'q' }, action: 'inv', copy: '3 -1\n-5 2', check: okAll },
        { in: { A: '2 1 1\n1 3 2\n1 0 0', ring: 'q' }, action: 'inv', copy: '0 0 1\n-2 1 3\n3 -1 -5', check: okAll },
        { in: { A: '3 3\n2 5', ring: 'mod', n: '26' }, action: 'inv', copy: '15 17\n20 9', check: okAll },
        { in: { A: '6 24 1\n13 16 10\n20 17 15', ring: 'mod', n: '26' }, action: 'inv', copy: '8 5 10\n21 8 21\n21 12 8', check: okAll },
        { in: { A: '2 3\n3 2', ring: 'mod', n: '6' }, action: 'inv', copy: '2 3\n3 2', check: okAll },
        { in: { A: '2 4\n4 2', ring: 'mod', n: '6' }, action: 'inv', copy: 'no inverse' },
        { in: { A: '1 2\n2 4', ring: 'q' }, action: 'inv', copy: 'no inverse' },
        { in: { A: '0 0\n0 0', ring: 'q' }, action: 'inv', copy: 'no inverse' },
        { in: { A: '2 4\n1 3', ring: 'mod', n: '2' }, action: 'inv', copy: 'no inverse' },
        { in: { A: '1 2 3\n4 5 6', B: '7 8\n9 10\n11 12', ring: 'q' }, action: 'mul', copy: '58 64\n139 154' },
        { in: { A: '1 2 3\n4 5 6', B: '7 8\n9 10\n11 12', ring: 'mod', n: '7' }, action: 'mul', copy: '2 1\n6 0' },
        { in: { A: '1 2 3\n4 5 6', ring: 'q' }, action: 'tr', copy: '1 4\n2 5\n3 6' },
        { in: { A: '1 2 -1 3\n2 4 1 0\n3 6 0 3', ring: 'q' }, action: 'rank', copy: '2' },
        { in: { A: '1 2 -1 3\n2 4 1 0\n3 6 0 3', ring: 'q' }, action: 'rref', copy: '1 2 0 1\n0 0 1 -2\n0 0 0 0' },
        { in: { A: '0 0\n0 0', ring: 'q' }, action: 'rank', copy: '0' },
        { in: { A: '1 2\n3 4', ring: 'mod', n: '5' }, action: 'rref', copy: '1 0\n0 1' },
        { in: { A: '1 2\n2 4', ring: 'mod', n: '5' }, action: 'rank', copy: '1' },
        { in: { A: '1 2\n3 4', ring: 'q' }, action: 'ref', copy: '1 2\n0 -2' },
        { in: { A: '1 2\n3', ring: 'q' }, action: 'det', error: true },
        { in: { A: '1 2 3\n4 5 6', ring: 'q' }, action: 'det', error: true },
        { in: { A: '1 x\n3 4', ring: 'q' }, action: 'det', error: true },
        { in: { A: '', ring: 'q' }, action: 'det', error: true },
        { in: { A: '1 2\n3 4', B: '1 2 3', ring: 'q' }, action: 'mul', error: true },
        { in: { A: '1 2\n3 4', B: '', ring: 'q' }, action: 'mul', error: true },
        { in: { A: '1 2\n3 4', ring: 'mod', n: '6' }, action: 'rank', error: true },
        { in: { A: '1/2 1\n3 4', ring: 'mod', n: '6' }, action: 'det', error: true },
        { in: { A: '1/3 1\n3 4', ring: 'mod', n: '7' }, action: 'det', copy: '3' },
        { in: { A: '1/2 1/3\n1/4 1/5', ring: 'q' }, action: 'inv', copy: '12 -20\n-15 30', check: okAll }
    ]);
    T.prop('matrix: A times its inverse over Q', 80, function (r) {
        var n = r.num(1, 5), A = randMat(r, n, n, -9, 9);
        return T.run('matrix', { A: matStr(A), ring: 'q' }, 'inv').then(function (o) {
            var R = gm.ringQ(), Aq = qMat(A), d = gm.detCofactor(R, Aq);
            var ok = checksOk(o.S);
            if (ok !== true) return ok;
            if (gm.isZero(d)) return o.copy === 'no inverse' ? true : 'singular matrix got an inverse';
            if (o.copy === 'no inverse') return 'invertible matrix got no inverse: ' + matStr(A);
            return gm.isIdentity(R, gm.mmul(R, Aq, readMat(o.copy))) ? true : 'A * A^-1 != I for ' + matStr(A);
        });
    });
    T.prop('matrix: determinant over Q against cofactors', 80, function (r) {
        var n = r.num(1, 6), A = randMat(r, n, n, -20, 20);
        return T.run('matrix', { A: matStr(A), ring: 'q' }, 'det').then(function (o) {
            var d = gm.detCofactor(gm.ringQ(), qMat(A));
            return o.copy === gm.qstr(d) ? checksOk(o.S) : 'det ' + o.copy + ' != ' + gm.qstr(d);
        });
    });
    T.prop('matrix: inverse and determinant modulo n', 150, function (r) {
        var n = r.pick([2n, 3n, 5n, 7n, 26n, 6n, 12n, 30n, 101n, 256n, 1000003n]), k = r.num(1, 4), A = randMat(r, k, k, 0, n - 1n);
        var R = gm.ringMod(n, nt.isPrime(n)), d = gm.detCofactor(R, A);
        return T.run('matrix', { A: matStr(A), ring: 'mod', n: String(n) }, 'det').then(function (o) {
            if (o.copy !== String(d)) return 'det mod ' + n + ' of ' + matStr(A) + ': ' + o.copy + ' != ' + d;
            var c = checksOk(o.S);
            if (c !== true) return c;
            return T.run('matrix', { A: matStr(A), ring: 'mod', n: String(n) }, 'inv').then(function (o2) {
                var unit = R.unit(d) || (n === 1n);
                if (!unit) return o2.copy === 'no inverse' ? true : 'mod ' + n + ': non-invertible got an inverse';
                if (o2.copy === 'no inverse') return 'mod ' + n + ': invertible ' + matStr(A) + ' got no inverse';
                var Inv = o2.copy.split('\n').map(function (l) { return l.split(' ').map(BigInt); });
                return gm.isIdentity(R, gm.mmul(R, A, Inv)) && gm.isIdentity(R, gm.mmul(R, Inv, A)) ? checksOk(o2.S) : 'A * A^-1 != I mod ' + n;
            });
        });
    });
    T.prop('matrix: reduced echelon form spans the same rows', 80, function (r) {
        var rows = r.num(1, 5), cols = r.num(1, 5), A = randMat(r, rows, cols, -3, 3);
        if (r.num(0, 2) === 0 && rows > 1) A[rows - 1] = A[0].map(function (x, j) { return x * 2n - A[1 % rows][j]; });
        return T.run('matrix', { A: matStr(A), ring: 'q' }, 'rref').then(function (o) {
            var E = readMat(o.copy), piv = [];
            /* the shape of a reduced row echelon form */
            for (var i = 0; i < E.length; i++) {
                var j = E[i].findIndex(function (x) { return !gm.isZero(x); });
                if (j < 0) { if (E.slice(i).some(function (row) { return row.some(function (x) { return !gm.isZero(x); }); })) return 'zero row above a non-zero row'; break; }
                if (piv.length && j <= piv[piv.length - 1]) return 'pivots not moving right';
                if (!gm.eq(E[i][j], gm.Q(1n))) return 'pivot not 1';
                for (var i2 = 0; i2 < E.length; i2++) if (i2 !== i && !gm.isZero(E[i2][j])) return 'pivot column not clear';
                piv.push(j);
            }
            /* every row of A is a combination of the rows of E (coefficients: A's entries in the pivot columns) */
            var ok = qMat(A).every(function (a) {
                var comb = a.map(function () { return gm.Q(0n); });
                piv.forEach(function (pc, t) { comb = comb.map(function (x, c) { return gm.add(x, gm.mul(a[pc], E[t][c])); }); });
                return comb.every(function (x, c) { return gm.eq(x, a[c]); });
            });
            if (!ok) return 'a row of A is not in the row space of the RREF';
            return T.run('matrix', { A: matStr(A), ring: 'q' }, 'rank').then(function (o2) { return o2.copy === String(piv.length) ? true : 'rank ' + o2.copy + ' but ' + piv.length + ' pivots'; });
        });
    });

    /* ---------- linear-system ---------- */
    T.tool('linear-system', [
        { in: { form: 'eq', eqs: '2x + y - z = 8\n-3x - y + 2z = -11\n-2x + y + 2z = -3', field: 'q' }, copy: 'x = 2, y = 3, z = -1', check: okAll },
        { in: { form: 'eq', eqs: 'x + 2y - z = 3\n2x + 4y + z = 9\n3x + 6y = 12', field: 'q' }, copy: 'x = 4 - 2y, z = 1, y free', check: okAll },
        { in: { form: 'eq', eqs: 'x + y = 1\nx + y = 2', field: 'q' }, copy: 'no solution' },
        { in: { form: 'aug', aug: '3 1 4 1\n2 5 1 0\n1 1 1 6', field: 'mod', p: '7' }, copy: 'x1 = 5, x2 = 6, x3 = 2', check: okAll },
        { in: { form: 'eq', eqs: '1/2 a + 1/3 b = 1\n1/4 a - b = 1/2', field: 'q' }, copy: 'a = 2, b = 0' },
        { in: { form: 'eq', eqs: 'x = 3 - y\ny = x - 1', field: 'q' }, copy: 'x = 2, y = 1' },
        { in: { form: 'eq', eqs: '0.5x + 0.25y = 1\nx - y = -1', field: 'q' }, copy: 'x = 1, y = 2' },
        { in: { form: 'eq', eqs: 'x + y + z = 1', field: 'q' }, copy: 'x = 1 - y - z, y, z free' },
        { in: { form: 'eq', eqs: 'x + y = 0\n2x + 2y = 0', field: 'q' }, copy: 'x = -y, y free' },
        { in: { form: 'eq', eqs: 'x + y = 1\nx - y = 1\n2x = 3', field: 'q' }, copy: 'no solution' },
        { in: { form: 'eq', eqs: 'x + y = 1\nx - y = 1\n2x = 2', field: 'q' }, copy: 'x = 1, y = 0' },
        { in: { form: 'eq', eqs: '2x + 3y = 1\nx + 4y = 2', field: 'mod', p: '7' }, copy: 'x = 1, y = 2', check: okAll },
        { in: { form: 'eq', eqs: '2x + 3y = 1\nx + 4y = 2', field: 'mod', p: '5' }, copy: 'no solution' },
        { in: { form: 'eq', eqs: 'x + y = 1\n2x + 2y = 2', field: 'mod', p: '3' }, copy: 'x = 1 + 2y, y free' },
        { in: { form: 'aug', aug: '1 2 | 3\n4 5 | 6', field: 'q' }, copy: 'x1 = -1, x2 = 2' },
        { in: { form: 'eq', eqs: 'x + y = 1', field: 'mod', p: '6' }, error: true },
        { in: { form: 'eq', eqs: 'x + = 3', field: 'q' }, error: true },
        { in: { form: 'eq', eqs: '2x + y', field: 'q' }, error: true },
        { in: { form: 'eq', eqs: 'x = 1 = 2', field: 'q' }, error: true },
        { in: { form: 'eq', eqs: '1 = 2', field: 'q' }, error: true },
        { in: { form: 'eq', eqs: '', field: 'q' }, error: true },
        { in: { form: 'aug', aug: '1\n2', field: 'q' }, error: true }
    ]);
    T.prop('linear-system: random systems over Q', 150, function (r) {
        var m = r.num(1, 4), k = r.num(1, 4), A = randMat(r, m, k, -4, 4), x0 = [];
        for (var j = 0; j < k; j++) x0.push(r.int(-5, 5));
        if (r.num(0, 3) === 0 && m > 1) A[m - 1] = A[0].map(function (x, c) { return x + A[1 % m][c]; });
        var consistent = r.num(0, 2) > 0;
        var b = A.map(function (row) { return consistent ? row.reduce(function (s, a, c) { return s + a * x0[c]; }, 0n) : r.int(-9, 9); });
        var aug = A.map(function (row, i) { return row.concat([b[i]]).join(' '); }).join('\n');
        return T.run('linear-system', { form: 'aug', aug: aug, field: 'q' }).then(function (o) {
            var c = checksOk(o.S);
            if (c !== true) return c + ' for ' + aug;
            var R = gm.ringQ(), Ab = qMat(A.map(function (row, i) { return row.concat([b[i]]); }));
            var rA = gm.reduce(R, qMat(A)).pivots.length, rAb = gm.reduce(R, Ab).pivots.length;
            if (o.copy === 'no solution') return rA < rAb ? true : 'no solution reported for a consistent system ' + aug;
            if (rA < rAb) return 'solution reported for an inconsistent system ' + aug;
            var free = / free$/.test(o.copy);
            if (free !== (rA < k)) return 'free variables wrong for ' + aug;
            if (!free) {
                var xs = o.copy.split(', ').map(function (p) { return gm.parseQ(p.split(' = ')[1]); });
                return Ab.every(function (row) { var s = gm.Q(0n); for (var cc = 0; cc < k; cc++) s = gm.add(s, gm.mul(row[cc], xs[cc])); return gm.eq(s, row[k]); }) ? true : 'wrong solution for ' + aug;
            }
            return true;
        });
    });
    T.prop('linear-system: random systems modulo p', 120, function (r) {
        var p = r.pick([2n, 3n, 5n, 7n, 11n, 13n, 101n]), m = r.num(1, 4), k = r.num(1, 4), A = randMat(r, m, k, 0, p - 1n), b = [];
        for (var i = 0; i < m; i++) b.push(r.int(0, p - 1n));
        var aug = A.map(function (row, i2) { return row.concat([b[i2]]).join(' '); }).join('\n');
        return T.run('linear-system', { form: 'aug', aug: aug, field: 'mod', p: String(p) }).then(function (o) {
            var c = checksOk(o.S);
            if (c !== true) return c + ' for ' + aug + ' mod ' + p;
            /* count the solutions by brute force when the space is small */
            if (p ** BigInt(k) > 20000n) return true;
            var count = 0, sol = null, total = Number(p ** BigInt(k));
            for (var t = 0; t < total; t++) {
                var x = [], u = BigInt(t);
                for (var j = 0; j < k; j++) { x.push(u % p); u /= p; }
                if (A.every(function (row, i3) { return row.reduce(function (s, a, cc) { return s + a * x[cc]; }, 0n) % p === b[i3]; })) { count++; sol = x; }
            }
            if (o.copy === 'no solution') return count === 0 ? true : 'missed solutions';
            if (/ free$/.test(o.copy)) return count > 1 ? true : 'free variables but ' + count + ' solutions';
            return count === 1 && o.copy === sol.map(function (x, j) { return 'x' + (j + 1) + ' = ' + x; }).join(', ') ? true : 'unique solution wrong: ' + o.copy;
        });
    });

    /* ---------- fractions ---------- */
    T.tool('fractions', [
        { in: { expr: '1/2 + 3/4' }, copy: '5/4' },
        { in: { expr: '2 1/3 - 5/6' }, copy: '3/2' },
        { in: { expr: '(3/4) / (9/8) * 5' }, copy: '10/3' },
        { in: { expr: '5/12 + 7/18 - 1/4' }, copy: '5/9' },
        { in: { expr: '0.125' }, copy: '1/8' },
        { in: { expr: '-2 1/2 * 2' }, copy: '-5' },
        { in: { expr: '2^-2' }, copy: '1/4' },
        { in: { expr: '(2/3)^3' }, copy: '8/27' },
        { in: { expr: '6/8' }, copy: '3/4' },
        { in: { expr: '1/3 + 1/6' }, copy: '1/2' },
        { in: { expr: '1/2 - 1/2' }, copy: '0' },
        { in: { expr: '7 ÷ 3/4' }, copy: '28/3' },
        { in: { expr: '1/7' }, copy: '1/7', check: function (S) { return S.res.lines.join(' ').indexOf('0.\\overline{142857}') >= 0 ? true : 'expansion of 1/7: ' + S.res.lines.join(' | '); } },
        { in: { expr: '1/12' }, copy: '1/12', check: function (S) { return S.res.lines.join(' ').indexOf('0.08\\overline{3}') >= 0 ? checksOk(S) : 'expansion of 1/12'; } },
        { in: { expr: '-22/7' }, copy: '-22/7', check: function (S) { return S.res.lines.join(' ').indexOf('-3.\\overline{142857}') >= 0 ? true : 'expansion of -22/7'; } },
        { in: { expr: '3/8' }, copy: '3/8', check: function (S) { return S.res.lines.join(' ').indexOf('0.375') >= 0 ? true : 'expansion of 3/8'; } },
        { in: { expr: '1/0' }, error: true },
        { in: { expr: '1/2 / 0' }, error: true },
        { in: { expr: '(1/2' }, error: true },
        { in: { expr: '2^(1/2)' }, error: true },
        { in: { expr: '' }, error: true },
        { in: { expr: '1/2 x' }, error: true }
    ]);
    T.prop('fractions: random arithmetic', 300, function (r) {
        var a = r.int(-50, 50), b = r.int(1, 60), c = r.int(-50, 50), d = r.int(1, 60), op = r.pick(['+', '-', '*', '/']);
        if (op === '/' && c === 0n) c = 1n;
        var x = gm.Q(a, b), y = gm.Q(c, d), want = op === '+' ? gm.add(x, y) : op === '-' ? gm.sub(x, y) : op === '*' ? gm.mul(x, y) : gm.div(x, y);
        /* independent of the library: cross multiplication and the gcd */
        var wn = op === '+' ? a * d + c * b : op === '-' ? a * d - c * b : op === '*' ? a * c : a * d, wd = op === '/' ? b * c : b * d;
        if (wd < 0n) { wn = -wn; wd = -wd; }
        var g = nt.gcd(wn, wd);
        var exp = String(wn / g) + (wd / g === 1n ? '' : '/' + (wd / g));
        var src = '(' + a + '/' + b + ') ' + op + ' (' + c + '/' + d + ')';
        return T.run('fractions', { expr: src }).then(function (o) {
            if (o.copy !== exp || gm.qstr(want) !== exp) return src + ' gave ' + o.copy + ', expected ' + exp;
            return checksOk(o.S);
        });
    });
    T.prop('fractions: the decimal expansion gives the fraction back', 200, function (r) {
        var p = r.int(1, 999), q = r.int(2, 400);
        return T.run('fractions', { expr: p + '/' + q }).then(function (o) {
            var line = o.S.res.lines.filter(function (l) { return /^Decimal/.test(l); })[0];
            var v = gm.Q(p, q);
            if (v.d === 1n) return line ? 'whole number with a decimal line' : true;
            if (!line) return 'no decimal for ' + p + '/' + q;
            var cut = /^Decimal: \$(\d+)\.(\d+)\\ldots\$$/.exec(line);
            if (cut) {
                /* a long period: the digits shown must be the start of the long division */
                var rr = p % q, dg = '';
                for (var t = 0; t < cut[2].length; t++) { rr *= 10n; dg += String(rr / q); rr %= q; }
                return cut[1] === String(p / q) && dg === cut[2] ? checksOk(o.S) : 'wrong digits ' + line;
            }
            var m = /\$(-?)(\d+)\.(\d*)(?:\\overline\{(\d+)\})?\$/.exec(line);
            if (!m) return 'unreadable decimal ' + line;
            var pre = m[3], per = m[4] || '';
            var val = gm.add(gm.Q(BigInt(m[2])), gm.Q(BigInt(pre || '0'), 10n ** BigInt(pre.length)));
            if (per) val = gm.add(val, gm.Q(BigInt(per), (10n ** BigInt(per.length) - 1n) * 10n ** BigInt(pre.length)));
            if (!gm.eq(val, v)) return p + '/' + q + ': ' + line + ' is ' + gm.qstr(val);
            return checksOk(o.S);
        });
    });

    /* ---------- binomial ---------- */
    T.tool('binomial', [
        { in: { n: '10', k: '3', mode: 'exact' }, copy: '120', check: okAll },
        { in: { n: '10', k: '7', mode: 'exact' }, copy: '120' },
        { in: { n: '49', k: '6', mode: 'exact' }, copy: '13983816', check: okAll },
        { in: { n: '52', k: '5', mode: 'exact' }, copy: '2598960' },
        { in: { n: '0', k: '0', mode: 'exact' }, copy: '1' },
        { in: { n: '5', k: '0', mode: 'exact' }, copy: '1' },
        { in: { n: '5', k: '7', mode: 'exact' }, copy: '0' },
        { in: { n: '200', k: '100', mode: 'exact' }, copy: String(binom(200n, 100n)), check: okAll },
        { in: { n: '10', k: '3', mode: 'mod', p: '7' }, copy: '1' },
        { in: { n: '1000', k: '500', mode: 'mod', p: '13' }, copy: '0', check: okAll },
        { in: { n: '10^20', k: '10^10', mode: 'mod', p: '7' }, check: okAll },
        { in: { n: '10', k: '3', mode: 'mod', p: '8' }, error: true },
        { in: { n: '-1', k: '3', mode: 'exact' }, error: true },
        { in: { n: '10^9', k: '10^8', mode: 'exact' }, error: true }
    ]);
    T.prop('binomial: against Pascal\'s triangle', 1, function () {
        var row = [1n], chain = Promise.resolve(), bad = null;
        var rows = [];
        for (var n = 0; n <= 40; n++) { rows.push(row); var next = [1n]; for (var t = 1; t <= n; t++) next.push(row[t - 1] + row[t]); next.push(1n); row = next; }
        var cases = [[0, 0], [1, 1], [7, 3], [16, 8], [20, 13], [33, 1], [40, 20], [40, 39], [12, 12], [25, 0]];
        cases.forEach(function (c) {
            chain = chain.then(function () {
                return T.run('binomial', { n: String(c[0]), k: String(c[1]), mode: 'exact' }).then(function (o) {
                    if (o.copy !== String(rows[c[0]][c[1]])) bad = 'C(' + c[0] + ', ' + c[1] + ') = ' + o.copy;
                    else { var ck = checksOk(o.S); if (ck !== true) bad = ck; }
                });
            });
        });
        return chain.then(function () { return bad || true; });
    });
    T.prop('binomial: Lucas against the exact value', 200, function (r) {
        var p = r.pick([2n, 3n, 5n, 7n, 11n, 13n, 101n, 1009n]), n = r.int(0, 3000), k = r.int(0, n + 3n);
        return T.run('binomial', { n: String(n), k: String(k), mode: 'mod', p: String(p) }).then(function (o) {
            var want = binom(n, k) % p;
            return o.copy === String(want) ? checksOk(o.S) : 'C(' + n + ', ' + k + ') mod ' + p + ' = ' + o.copy + ', expected ' + want;
        });
    });

    /* ---------- combinatorics ---------- */
    T.tool('combinatorics', [
        { in: { kind: 'comb', n: '5', k: '3' }, copy: '10' },
        { in: { kind: 'comb', n: '49', k: '6' }, copy: '13983816' },
        { in: { kind: 'comb', n: '3', k: '5' }, copy: '0' },
        { in: { kind: 'arr', n: '4', k: '2' }, copy: '12' },
        { in: { kind: 'arr', n: '10', k: '0' }, copy: '1' },
        { in: { kind: 'arr', n: '3', k: '4' }, copy: '0' },
        { in: { kind: 'perm', n: '4' }, copy: '24' },
        { in: { kind: 'perm', n: '0' }, copy: '1' },
        { in: { kind: 'perm', n: '26' }, copy: String(fact(26n)) },
        { in: { kind: 'arrrep', n: '10', k: '4' }, copy: '10000' },
        { in: { kind: 'arrrep', n: '2', k: '128' }, copy: String(2n ** 128n) },
        { in: { kind: 'combrep', n: '3', k: '2' }, copy: '6' },
        { in: { kind: 'combrep', n: '0', k: '0' }, copy: '1' },
        { in: { kind: 'combrep', n: '0', k: '2' }, copy: '0' },
        { in: { kind: 'combrep', n: '10', k: '3' }, copy: '220' },
        { in: { kind: 'multi', ks: '1, 4, 4, 2' }, copy: '34650' },
        { in: { kind: 'multi', ks: '2, 1' }, copy: '3' },
        { in: { kind: 'multi', ks: '0' }, copy: '1' },
        { in: { kind: 'circ', n: '5' }, copy: '24' },
        { in: { kind: 'circ', n: '1' }, copy: '1' },
        { in: { kind: 'derange', n: '0' }, copy: '1' },
        { in: { kind: 'derange', n: '1' }, copy: '0' },
        { in: { kind: 'derange', n: '4' }, copy: '9' },
        { in: { kind: 'derange', n: '10' }, copy: '1334961' },
        { in: { kind: 'multi', ks: '2, -1' }, error: true },
        { in: { kind: 'perm', n: '10^6' }, error: true },
        { in: { kind: 'circ', n: '0' }, error: true }
    ]);
    T.prop('combinatorics: derangements by inclusion and exclusion', 1, function () {
        var chain = Promise.resolve(), bad = null;
        [2, 3, 5, 8, 13, 21, 30].forEach(function (n) {
            chain = chain.then(function () {
                var N = BigInt(n), s = 0n;
                for (var i = 0n; i <= N; i++) s += (i % 2n ? -1n : 1n) * fact(N) / fact(i);
                return T.run('combinatorics', { kind: 'derange', n: String(n) }).then(function (o) { if (o.copy !== String(s)) bad = '!' + n + ' = ' + o.copy + ', expected ' + s; });
            });
        });
        return chain.then(function () { return bad || true; });
    });
    T.prop('combinatorics: the four counts against enumeration', 60, function (r) {
        var n = r.num(1, 5), k = r.num(0, 4), kind = r.pick(['arr', 'arrrep', 'comb', 'combrep']);
        var ordered = kind === 'arr' || kind === 'arrrep', rep = kind === 'arrrep' || kind === 'combrep', count = 0;
        (function go(len, start, used) {
            if (len === k) { count++; return; }
            for (var i = ordered ? 0 : start; i < n; i++) { if (!rep && used[i]) continue; used[i] = 1; go(len + 1, rep ? i : i + 1, used); used[i] = 0; }
        })(0, 0, {});
        return T.run('combinatorics', { kind: kind, n: String(n), k: String(k) }).then(function (o) { return o.copy === String(count) ? true : kind + ' n=' + n + ' k=' + k + ': ' + o.copy + ' != ' + count; });
    });
    T.prop('combinatorics: multinomial as a product of binomials', 60, function (r) {
        var m = r.num(1, 5), ks = [], tot = 0n, prod = 1n;
        for (var i = 0; i < m; i++) { var x = r.int(0, 6); ks.push(x); tot += x; prod *= binom(tot, x); }
        return T.run('combinatorics', { kind: 'multi', ks: ks.join(', ') }).then(function (o) { return o.copy === String(prod) ? true : ks.join(',') + ': ' + o.copy + ' != ' + prod; });
    });

    /* ---------- polynomial-division ---------- */
    T.tool('polynomial-division', [
        { in: { p: 'x^3 - 2x^2 - 4', d: 'x - 3' }, copy: 'q = x^2 + x + 3\nr = 5', check: okAll },
        { in: { p: 'x^5 - 1', d: 'x - 1' }, copy: 'q = x^4 + x^3 + x^2 + x + 1\nr = 0', check: okAll },
        { in: { p: '6x^3 + 5x^2 - 2', d: '2x + 3' }, copy: 'q = 3x^2 - 2x + 3\nr = -11' },
        { in: { p: '1, 0, 0, 0, 1', d: '1, 0, 1' }, copy: 'q = x^2 - 1\nr = 2' },
        { in: { p: '2x^4 + 3x^3 - x + 5', d: 'x^2 - x + 1' }, copy: 'q = 2x^2 + 5x + 3\nr = -3x + 2', check: okAll },
        { in: { p: 'x', d: 'x^2 + 1' }, copy: 'q = 0\nr = x' },
        { in: { p: 'x^2 + 1', d: '2' }, copy: 'q = (1/2)x^2 + 1/2\nr = 0' },
        { in: { p: 't^2 - 1/4', d: 't + 1/2' }, copy: 'q = t - 1/2\nr = 0' },
        { in: { p: '0', d: 'x + 1' }, copy: 'q = 0\nr = 0' },
        { in: { p: 'x^2 + 2*x + 1', d: 'x + 1' }, copy: 'q = x + 1\nr = 0' },
        { in: { p: 'x^2', d: '0' }, error: true },
        { in: { p: 'x^2 + y', d: 'x' }, error: true },
        { in: { p: 'x^2 +', d: 'x' }, error: true },
        { in: { p: 'x^99', d: 'x' }, error: true },
        { in: { p: '', d: 'x' }, error: true }
    ]);
    /* read a polynomial written like the copy text: 3x^2 - (1/2)x + 4 */
    function readPoly(s) {
        var c = [];
        s.replace(/ /g, '').replace(/-/g, '+-').split('+').filter(Boolean).forEach(function (t) {
            var m = /^(-?)(?:\(?(\d+(?:\/\d+)?)\)?)?(x(?:\^(\d+))?)?$/.exec(t);
            if (!m) throw new Error('cannot read ' + t);
            var q = m[2] ? gm.parseQ(m[2]) : gm.Q(1n), pw = m[3] ? (m[4] ? Number(m[4]) : 1) : 0;
            if (m[1]) q = gm.neg(q);
            while (c.length <= pw) c.push(gm.Q(0n));
            c[pw] = gm.add(c[pw], q);
        });
        return c;
    }
    function polyEq(a, b) { var n = Math.max(a.length, b.length); for (var i = 0; i < n; i++) if (!gm.eq(a[i] || gm.Q(0n), b[i] || gm.Q(0n))) return false; return true; }
    T.prop('polynomial-division: q d + r = p', 200, function (r) {
        function rp(deg, lead) { var c = []; for (var i = 0; i <= deg; i++) c.push(gm.Q(r.int(-6, 6), r.pick([1n, 1n, 1n, 2n, 3n]))); if (lead && gm.isZero(c[deg])) c[deg] = gm.Q(1n); return c; }
        var dd = r.num(0, 3), qd = r.num(0, 4), d = rp(dd, true), q = rp(qd, false), rem = dd ? rp(dd - 1, false) : [gm.Q(0n)];
        var p = [];
        for (var i = 0; i < d.length + q.length - 1; i++) p.push(gm.Q(0n));
        q.forEach(function (x, i2) { d.forEach(function (y, j) { p[i2 + j] = gm.add(p[i2 + j], gm.mul(x, y)); }); });
        rem.forEach(function (x, i3) { p[i3] = gm.add(p[i3], x); });
        var list = function (c) { return c.slice().reverse().map(gm.qstr).join(', '); };
        return T.run('polynomial-division', { p: list(p), d: list(d) }).then(function (o) {
            if (o.errors) return 'error ' + JSON.stringify(o.errors) + ' for ' + list(p) + ' / ' + list(d);
            var m = /^q = (.*)\nr = (.*)$/.exec(o.copy);
            if (!m) return 'copy ' + o.copy;
            if (!polyEq(readPoly(m[1]), q) || !polyEq(readPoly(m[2]), rem)) return list(p) + ' / ' + list(d) + ' gave ' + o.copy;
            return checksOk(o.S);
        });
    });

    /* ---------- big-number ---------- */
    T.tool('big-number', [
        { in: { expr: '2^127 - 1' }, copy: String(2n ** 127n - 1n), check: okAll },
        { in: { expr: '100!' }, copy: String(fact(100n)), check: okAll },
        { in: { expr: '7 / 2' }, copy: '3' },
        { in: { expr: '-7 / 2' }, copy: '-4' },
        { in: { expr: '-7 mod 3' }, copy: '2' },
        { in: { expr: '-7 % 3' }, copy: '2' },
        { in: { expr: '2^3^2' }, copy: '512' },
        { in: { expr: '-2^2' }, copy: '-4' },
        { in: { expr: '(1+2)*3!' }, copy: '18' },
        { in: { expr: 'gcd(12, 18) + lcm(4, 6)' }, copy: '18' },
        { in: { expr: 'isqrt(10^20 + 1)' }, copy: '10000000000' },
        { in: { expr: 'binom(52, 5)' }, copy: '2598960' },
        { in: { expr: 'powmod(3, 200, 1000007)' }, copy: String(nt.powmod(3n, 200n, 1000007n)) },
        { in: { expr: '0x1F + 0b101 + 1e3' }, copy: '1036' },
        { in: { expr: '0' }, copy: '0' },
        { in: { expr: '1/0' }, error: true },
        { in: { expr: '2^-1' }, error: true },
        { in: { expr: '10^1000000' }, error: true },
        { in: { expr: 'foo(1)' }, error: true },
        { in: { expr: '(1 + 2' }, error: true },
        { in: { expr: '' }, error: true }
    ]);
    T.prop('big-number: random expressions against BigInt', 200, function (r) {
        function gen(depth) {
            if (depth === 0 || r.num(0, 2) === 0) { var x = r.int(0, 10n ** BigInt(r.num(1, 40))); return { s: String(x), v: x }; }
            var a = gen(depth - 1), b = gen(depth - 1), op = r.pick(['+', '-', '*', '/', 'mod']);
            if ((op === '/' || op === 'mod') && b.v === 0n) op = '+';
            var v = op === '+' ? a.v + b.v : op === '-' ? a.v - b.v : op === '*' ? a.v * b.v : op === '/' ? nt.divmod(a.v, b.v).q : nt.mod(a.v, b.v);
            return { s: '(' + a.s + ' ' + op + ' ' + b.s + ')', v: v };
        }
        var e = gen(4);
        return T.run('big-number', { expr: e.s }).then(function (o) { return o.copy === String(e.v) ? checksOk(o.S) : e.s + ' gave ' + o.copy + ', expected ' + e.v; });
    });

    /* ---------- bits-and-sizes ---------- */
    T.tool('bits-and-sizes', [
        { in: { mode: 'num', n: '2^128' }, copy: 'bits 129, digits 39' },
        { in: { mode: 'num', n: '2^128 - 1' }, copy: 'bits 128, digits 39' },
        { in: { mode: 'num', n: '255' }, copy: 'bits 8, digits 3' },
        { in: { mode: 'num', n: '256' }, copy: 'bits 9, digits 3' },
        { in: { mode: 'num', n: '1' }, copy: 'bits 1, digits 1' },
        { in: { mode: 'num', n: '0' }, copy: 'bits 0, digits 1' },
        { in: { mode: 'num', n: '-1000' }, copy: 'bits 10, digits 4' },
        { in: { mode: 'num', n: '10^80' }, copy: 'bits 266, digits 81' },
        { in: { mode: 'bits', k: '56' }, copy: '72057594037927936', check: okAll },
        { in: { mode: 'bits', k: '0' }, copy: '1' },
        { in: { mode: 'bits', k: '2048' }, copy: String(2n ** 2048n), check: function (S) { return S.res.lines.join(' ').indexOf('617') >= 0 ? checksOk(S) : 'digits of 2^2048'; } },
        { in: { mode: 'bits', k: '-1' }, error: true },
        { in: { mode: 'bits', k: '200001' }, error: true }
    ]);
    T.prop('bits-and-sizes: bit and digit counts', 200, function (r) {
        var n = r.int(1, 10n ** BigInt(r.num(1, 300)));
        if (r.num(0, 3) === 0) n = 10n ** BigInt(r.num(0, 200)) - BigInt(r.num(0, 1));
        if (r.num(0, 3) === 0) n = 2n ** BigInt(r.num(0, 900)) - BigInt(r.num(0, 1));
        if (n === 0n) n = 1n;
        return T.run('bits-and-sizes', { mode: 'num', n: String(n) }).then(function (o) {
            var want = 'bits ' + n.toString(2).length + ', digits ' + String(n).length;
            return o.copy === want ? checksOk(o.S) : n + ': ' + o.copy + ' != ' + want;
        });
    });
    T.prop('bits-and-sizes: digits of 2^k', 120, function (r) {
        var k = r.num(0, 20000);
        return T.run('bits-and-sizes', { mode: 'bits', k: String(k) }).then(function (o) { return checksOk(o.S); });
    });

    /* ---------- the library ---------- */
    T.prop('gmath fractions and parsing', 1, function () {
        var Q = gm.Q;
        var cases = [['3/4', '3/4'], ['-6/8', '-3/4'], ['+0.5', '1/2'], ['1.25', '5/4'], ['.5', '1/2'], ['7', '7'], ['−2/4', '-1/2'], ['1.5/3', '1/2'], ['0/5', '0']];
        for (var i = 0; i < cases.length; i++) { var q = gm.parseQ(cases[i][0]); if (!q || gm.qstr(q) !== cases[i][1]) return 'parseQ ' + cases[i][0]; }
        if (gm.parseQ('x') !== null || gm.parseQ('1/2/3') !== null || gm.parseQ('') !== null) return 'parseQ accepts junk';
        if (gm.qstr(Q(4n, -6n)) !== '-2/3') return 'sign normalisation';
        if (gm.qstr(gm.add(Q(1n, 6n), Q(1n, 3n))) !== '1/2' || gm.qstr(gm.div(Q(3n, 4n), Q(9n, 8n))) !== '2/3') return 'arithmetic';
        if (gm.qtex(Q(-3n, 4n)) !== '-\\frac{3}{4}') return 'qtex';
        var M = gm.parseMatrix('[[1, 2], [3, 4]]');
        if (M.length !== 2 || gm.qstr(M[1][1]) !== '4') return 'bracket matrix';
        var M2 = gm.parseMatrix('1 2; 3 4');
        if (M2.length !== 2 || gm.qstr(M2[1][0]) !== '3') return 'semicolon matrix';
        try { gm.parseMatrix('1 2\n3'); return 'ragged matrix accepted'; } catch (e) { if (!(e instanceof Calc.UserError)) return 'wrong error'; }
        var R = gm.ringMod(26n, false);
        if (R.from(Q(1n, 3n)) !== 9n || R.unit(13n) || !R.unit(5n)) return 'ring mod 26';
        if (gm.invMod(17n, 3120n) !== 2753n || gm.invMod(6n, 15n) !== null) return 'invMod';
        var L = gm.linExpr(gm.ringQ(), Q(2n), [{ c: Q(-3n), tex: 'z', str: 'z' }, { c: Q(1n, 2n), tex: 'y', str: 'y' }]);
        if (L.str !== '2 - 3z + (1/2)y') return 'linExpr ' + L.str;
        return true;
    });
})();
