/* Toolbox: a system of linear equations A x = b solved by Gaussian elimination over Q or Z_p: forward elimination,
   the consistency test, back substitution to the reduced form, the solution (unique, none, or a parametric family)
   and a check by substitution. Row reduction from Calc.lib.gmath. */
Calc.tool({
    id: 'linear-system',
    live: true,
    inputs: [
        { id: 'form', type: 'select', label: 'Input', width: 'l', value: 'eq', options: [['eq', 'Equations'], ['aug', 'Augmented matrix [A | b]']] },
        { id: 'eqs', type: 'textarea', rows: 4, label: 'Equations', when: { form: 'eq' }, placeholder: '2x + y - z = 8\n-3x - y + 2z = -11\n-2x + y + 2z = -3', help: 'One equation per line, with a number or fraction in front of a variable: 3x - 1/2 y + z = 4.' },
        { id: 'aug', type: 'textarea', rows: 4, label: 'Augmented matrix $[A \\mid b]$', when: { form: 'aug' }, placeholder: '2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3', help: 'One equation per line: the coefficients, then the right side last.' },
        { id: 'field', type: 'select', label: 'Numbers', width: 'l', value: 'q', options: [['q', 'Rational numbers (fractions)'], ['mod', 'Integers modulo a prime p']] },
        { id: 'p', label: 'Prime $p$', placeholder: '7', min: 2, when: { field: 'mod' } }
    ],
    examples: [
        { form: 'eq', eqs: '2x + y - z = 8\n-3x - y + 2z = -11\n-2x + y + 2z = -3', field: 'q' },
        { form: 'eq', eqs: 'x + 2y - z = 3\n2x + 4y + z = 9\n3x + 6y = 12', field: 'q' },
        { form: 'eq', eqs: 'x + y = 1\nx + y = 2', field: 'q' },
        { form: 'aug', aug: '3 1 4 1\n2 5 1 0\n1 1 1 6', field: 'mod', p: '7' },
        { form: 'eq', eqs: '1/2 a + 1/3 b = 1\n1/4 a - b = 1/2', field: 'q' }
    ],
    run: function (v, S) {
        var gm = Calc.lib.gmath, nt = Calc.lib.nt, T = Calc.tex, MAX = 8;
        var modp = v.field === 'mod', p = modp ? v.p : null;
        if (modp) {
            if (p > 10n ** 30n) Calc.fail('A prime of at most 30 digits, please.', 'p');
            if (!nt.isPrime(p)) Calc.fail(p + ' is not prime. Modulo a composite number some non-zero numbers have no inverse, so elimination can get stuck; use a prime.', 'p');
        }
        var R = modp ? gm.ringMod(p, true) : gm.ringQ();
        var mod = modp ? ' \\pmod{' + T(p) + '}' : '';
        var names = [], texNames = [], Aq = [], bq = [], field = v.form === 'eq' ? 'eqs' : 'aug';

        function vtex(nm) {
            var m = /^([A-Za-z]+)_?(\d+)$/.exec(nm);
            if (m) return (m[1].length > 1 ? '\\mathit{' + m[1] + '}' : m[1]) + '_{' + m[2] + '}';
            return nm.length > 1 ? '\\mathit{' + nm.replace(/_/g, '\\_') + '}' : nm;
        }
        if (v.form === 'eq') {
            var lines = String(v.eqs).replace(/[\u2212\u2013\u2014]/g, '-').replace(/[×·⋅]/g, '*').split(/[\n;]+/).map(function (l) { return l.trim(); }).filter(Boolean);
            if (!lines.length) Calc.fail('Please type at least one equation.', 'eqs');
            if (lines.length > MAX) Calc.fail('At most ' + MAX + ' equations.', 'eqs');
            var parsed = lines.map(function (l, li) {
                var sides = l.split('=');
                if (sides.length !== 2) Calc.fail('Line ' + (li + 1) + ' needs exactly one "=".', 'eqs');
                return sides.map(function (side) {
                    var s = side.replace(/\s+/g, ''), pos = 0, first = true, out = { c: gm.Q(0n), v: {} };
                    if (!s) Calc.fail('Line ' + (li + 1) + ': one side of "=" is empty.', 'eqs');
                    var re = /^([+-]?)((?:\d+(?:\.\d*)?|\.\d+)(?:\/(?:\d+(?:\.\d*)?|\.\d+))?)?\*?([A-Za-z][A-Za-z0-9_]*)?/;
                    while (pos < s.length) {
                        var m = re.exec(s.slice(pos));
                        if (!m || (!m[2] && !m[3])) Calc.fail('Line ' + (li + 1) + ': cannot read "' + s.slice(pos) + '". Write terms like 3x, -1/2 y or 7.', 'eqs');
                        if (!first && !m[1]) Calc.fail('Line ' + (li + 1) + ': expected + or - before "' + s.slice(pos) + '".', 'eqs');
                        var c = m[2] ? gm.parseQ(m[2]) : gm.Q(1n);
                        if (m[1] === '-') c = gm.neg(c);
                        if (m[3]) {
                            if (names.indexOf(m[3]) < 0) names.push(m[3]);
                            out.v[m[3]] = gm.add(out.v[m[3]] || gm.Q(0n), c);
                        } else out.c = gm.add(out.c, c);
                        pos += m[0].length;
                        first = false;
                    }
                    return out;
                });
            });
            if (!names.length) Calc.fail('No variables found: write equations like 2x + y = 3.', 'eqs');
            if (names.length > MAX) Calc.fail('At most ' + MAX + ' variables.', 'eqs');
            parsed.forEach(function (e) {
                Aq.push(names.map(function (nm) { return gm.sub(e[0].v[nm] || gm.Q(0n), e[1].v[nm] || gm.Q(0n)); }));
                bq.push(gm.sub(e[1].c, e[0].c));
            });
        } else {
            var M0 = gm.parseMatrix(v.aug, 'The augmented matrix', 'aug');
            if (M0[0].length < 2) Calc.fail('Each row needs at least one coefficient and the right side.', 'aug');
            if (M0.length > MAX || M0[0].length > MAX + 1) Calc.fail('At most ' + MAX + ' equations and ' + MAX + ' variables.', 'aug');
            for (var j = 1; j < M0[0].length; j++) names.push('x' + j);
            M0.forEach(function (r) { Aq.push(r.slice(0, -1)); bq.push(r[r.length - 1]); });
        }
        texNames = names.map(vtex);
        Aq.concat([bq]).forEach(function (r) { r.forEach(function (x) { if (String(x.n).length > 40 || String(x.d).length > 40) Calc.fail('Numbers of at most 40 digits, please.', field); }); });
        var A = gm.convert(R, Aq), b = bq.map(R.from), m = A.length, k = names.length;

        function eqTex(row, rhs, RR) {
            RR = RR || R;
            var terms = row.map(function (c, j) { return { c: c, tex: texNames[j], str: names[j] }; });
            var lhs = gm.linExpr(RR, RR.zero, terms).tex;
            return lhs + ' &' + (modp ? '\\equiv' : '=') + ' ' + RR.tex(rhs);
        }

        /* 1. the system and its matrix */
        var s1 = S.step('Write the system as an augmented matrix');
        s1.p('Each row holds the coefficients of ' + names.map(function (nm, j) { return '$' + texNames[j] + '$'; }).join(', ') + ' and, after the bar, the right side.' + (modp ? ' Everything is reduced modulo $' + T(p) + '$ (a fraction $a/b$ means $a \\cdot b^{-1}$).' : ''));
        s1.lines(A.map(function (r, i) { return eqTex(r, b[i]); }));
        var Ab = A.map(function (r, i) { return r.concat([b[i]]); });
        s1.math(gm.mtex(R, Ab, { bar: k }));

        /* 2. forward elimination */
        var st = {};
        var red = gm.reduce(R, Ab, { cols: k });
        gm.showSteps(S, R, red.groups, { bar: k, state: st, intro: 'Forward elimination, column by column: take a pivot (a non-zero entry, swapping rows if needed) and make the entries below it 0. Row operations do not change the solutions.' });
        var rank = red.pivots.length;

        /* 3. consistency */
        var bad = -1;
        for (var i = rank; i < m; i++) if (!R.isZero(red.M[i][k])) { bad = i; break; }
        if (bad >= 0) {
            S.step('A contradiction').p('Row ' + (bad + 1) + ' has only zeros on the left but not on the right, so it says')
                .math(names.map(function (nm, j) { return '0 \\cdot ' + texNames[j]; }).join(' + ') + (modp ? ' \\equiv ' : ' = ') + R.tex(red.M[bad][k]) + mod)
                .p('which no values satisfy. The system has no solution (it is inconsistent: the rank of $A$ is ' + rank + ', the rank of $[A \\mid b]$ is ' + (rank + 1) + ').');
            S.result('No solution', { copy: 'no solution' });
            S.note('The equations contradict each other.');
            return;
        }
        if (rank < m) S.step('Zero rows').p((m - rank) + ' row' + (m - rank === 1 ? ' became' : 's became') + ' $0 = 0$: ' + (m - rank === 1 ? 'that equation was' : 'those equations were') + ' a combination of the others and can be dropped.');

        /* 4. back substitution: the reduced form */
        var bk = gm.backward(R, red.M, red.pivots);
        if (bk.groups.length) {
            gm.showSteps(S, R, bk.groups, { bar: k, back: true, state: st, intro: 'Back substitution, done on the matrix: from the last pivot up, divide each pivot row by its pivot, then clear the column above it.' });
        }
        var E = bk.M, pivCol = {}, free = [];
        red.pivots.forEach(function (pv) { pivCol[pv.col] = pv.row; });
        for (var c = 0; c < k; c++) if (pivCol[c] === undefined) free.push(c);

        /* 5. read off */
        var sol = [], expr = [];   // sol: constant part; dirs[f]: direction vector of free variable f
        var dirs = free.map(function () { return names.map(function () { return R.zero; }); });
        for (c = 0; c < k; c++) {
            if (pivCol[c] === undefined) { sol.push(R.zero); continue; }
            sol.push(E[pivCol[c]][k]);
        }
        free.forEach(function (f, t) {
            dirs[t][f] = R.one;
            for (var c2 = 0; c2 < k; c2++) if (pivCol[c2] !== undefined) dirs[t][c2] = R.neg(E[pivCol[c2]][f]);
        });
        for (c = 0; c < k; c++) {
            var terms = free.map(function (f, t) { return { c: dirs[t][c], tex: texNames[f], str: names[f] }; });
            expr.push(pivCol[c] === undefined ? null : gm.linExpr(R, sol[c], terms));
        }
        var s5 = S.step('Read off the solution');
        s5.math(gm.mtex(R, E, { bar: k }));
        if (!free.length) {
            s5.p('Every variable has a pivot, so each row gives one variable directly:');
            s5.lines(names.map(function (nm, c3) { return texNames[c3] + ' &' + (modp ? '\\equiv' : '=') + ' ' + R.tex(sol[c3]); }));
            S.result('$' + names.map(function (nm, c3) { return texNames[c3] + ' = ' + R.tex(sol[c3]); }).join(',\\; ') + '$' + (modp ? ' (mod $' + T(p) + '$)' : ''), { copy: names.map(function (nm, c3) { return nm + ' = ' + R.str(sol[c3]); }).join(', ') });
            S.note('Exactly one solution: the rank ' + rank + ' equals the number of variables.');
        } else {
            var fn = free.map(function (f) { return '$' + texNames[f] + '$'; }).join(', ');
            s5.p('The columns without a pivot belong to free variables (' + fn + '): they can take any value' + (modp ? ' modulo $' + T(p) + '$' : '') + '. Move them to the right side and each pivot row gives one pivot variable:');
            s5.lines(names.map(function (nm, c3) { return texNames[c3] + ' &' + (pivCol[c3] === undefined ? '\\text{ is free}' : (modp ? '\\equiv ' : '= ') + expr[c3].tex); }));
            s5.p('In vector form, a particular solution plus every combination of the directions:');
            var vec = function (col) { return '\\begin{pmatrix}' + col.map(R.tex).join(' \\\\ ') + '\\end{pmatrix}'; };
            s5.math('\\begin{pmatrix}' + texNames.join(' \\\\ ') + '\\end{pmatrix} = ' + vec(sol) + free.map(function (f, t) { return ' + ' + texNames[f] + ' ' + vec(dirs[t]); }).join(''));
            var line = names.map(function (nm, c3) { return pivCol[c3] === undefined ? null : texNames[c3] + ' = ' + expr[c3].tex; }).filter(Boolean);
            S.result(['Infinitely many solutions' + (modp ? ' ($' + T(p) + '^{' + free.length + '}' + (p ** BigInt(free.length) < 10n ** 12n ? ' = ' + T(p ** BigInt(free.length)) : '') + '$ of them)' : ''), '$' + line.join(',\\; ') + '$, with ' + fn + ' free'],
                { copy: names.map(function (nm, c3) { return pivCol[c3] === undefined ? null : nm + ' = ' + expr[c3].str; }).filter(Boolean).join(', ') + ', ' + free.map(function (f) { return names[f]; }).join(', ') + ' free' });
            S.note('Rank ' + rank + ' and ' + k + ' variables: ' + free.length + ' free variable' + (free.length === 1 ? '' : 's') + (modp ? '. Each free variable takes $' + T(p) + '$ values, so there are $' + T(p) + '^{' + free.length + '}$ solutions.' : ', so a ' + (free.length === 1 ? 'line' : free.length === 2 ? 'plane' : free.length + '-dimensional family') + ' of solutions.'));
        }

        /* 6. check by substitution, in the original equations */
        var s6 = S.step('Check by substitution');
        function dot(row, x) { var s = R.zero; row.forEach(function (a, j) { s = R.add(s, R.mul(a, x[j])); }); return s; }
        function subst(row, x) {
            var parts = [];
            row.forEach(function (a, j) { if (!R.isZero(a)) parts.push((R.isOne(a) ? '' : R.texp(a) + ' \\cdot ') + R.texp(x[j])); });
            return parts.length ? parts.join(' + ') : '0';
        }
        if (!free.length) s6.p('Put the values into the original equations:');
        else s6.p('With every free variable 0 the particular solution must satisfy each equation, and each direction must give 0 on the left (then any combination works):');
        A.forEach(function (r, i2) {
            var lhs = dot(r, sol);
            var whole = '';
            if (modp) { var zs = 0n; r.forEach(function (a, j) { zs += a * sol[j]; }); if (zs !== lhs) whole = ' = ' + T(zs); }
            s6.check(R.eq(lhs, b[i2]), 'Equation ' + (i2 + 1) + ': $' + subst(r, sol) + whole + (modp ? ' \\equiv ' : ' = ') + R.tex(lhs) + '$' + (R.eq(lhs, b[i2]) ? '' : ', not $' + R.tex(b[i2]) + '$'));
        });
        free.forEach(function (f, t) {
            var z = gm.mmul(R, A, dirs[t].map(function (x) { return [x]; }));
            s6.check(z.every(function (x) { return R.isZero(x[0]); }), 'Direction of $' + texNames[f] + '$: $A \\cdot ' + '\\begin{pmatrix}' + dirs[t].map(R.tex).join(' \\\\ ') + '\\end{pmatrix} = 0$');
        });
    }
});
