/* Toolbox: lattice basis reduction with exact rational arithmetic: Lagrange-Gauss in dimension 2, and LLL (size
   reduction and the Lovász condition, one table row per step) for up to 6 vectors. Gram-Schmidt data are computed
   from the Gram matrix, so no floating point is involved anywhere. */
Calc.tool({
    id: 'lattice-reduction',
    inputs: [
        { id: 'basis', type: 'textarea', label: 'Basis vectors (one per line)', placeholder: '1, 1, 1\n-1, 0, 2\n3, 5, 6', rows: 4, help: 'Integer coordinates separated by commas or spaces. The vectors must be linearly independent.' },
        { id: 'delta', type: 'text', label: 'LLL parameter $\\delta$', value: '3/4', optional: true, placeholder: '3/4', width: 'm', help: 'A fraction with $1/4 < \\delta \\le 1$.' }
    ],
    actions: [{ id: 'lll', label: 'LLL' }, { id: 'gauss', label: 'Lagrange-Gauss (2 vectors)' }],
    examples: [
        { basis: '1, 1, 1\n-1, 0, 2\n3, 5, 6', delta: '3/4' },
        { basis: '66586820, 65354729\n6513996, 6393464', delta: '3/4', _action: 'gauss' },
        { basis: '19, 2, 32, 46, 3, 33\n15, 42, 11, 0, 3, 24\n43, 15, 0, 24, 4, 16\n20, 44, 44, 0, 18, 15\n0, 48, 35, 16, 31, 31\n48, 33, 32, 9, 1, 29', delta: '99/100' },
        { basis: '1, 0, 0, 0, 0, 1234\n0, 1, 0, 0, 0, 2468\n0, 0, 1, 0, 0, 3703\n0, 0, 0, 1, 0, 4937\n0, 0, 0, 0, 1, 6175', delta: '3/4' },
        { basis: '201, 37\n1648, 297', delta: '3/4', _action: 'gauss' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, T = Calc.lib.modern.tex;
        /* ---------- exact rationals ---------- */
        function Q(n, d) {
            if (d === undefined) d = 1n;
            if (d < 0n) { n = -n; d = -d; }
            var g = nt.gcd(n, d);
            if (g > 1n) { n /= g; d /= g; }
            return { n: n, d: d };
        }
        function add(a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); }
        function sub(a, b) { return Q(a.n * b.d - b.n * a.d, a.d * b.d); }
        function mul(a, b) { return Q(a.n * b.n, a.d * b.d); }
        function div(a, b) { return Q(a.n * b.d, a.d * b.n); }
        function cmp(a, b) { var x = a.n * b.d - b.n * a.d; return x < 0n ? -1 : x > 0n ? 1 : 0; }
        function floorDiv(a, b) { var q = a / b; if (a % b !== 0n && (a < 0n) !== (b < 0n)) q -= 1n; return q; }
        function round(a) { return floorDiv(2n * a.n + a.d, 2n * a.d); }   // nearest integer, halves rounded up
        function qabs(a) { return a.n < 0n ? Q(-a.n, a.d) : a; }
        function qt(a) { return a.d === 1n ? T(a.n) : (a.n < 0n ? '-' : '') + '\\tfrac{' + T(a.n < 0n ? -a.n : a.n) + '}{' + T(a.d) + '}'; }
        var HALF = Q(1n, 2n);
        /* ---------- vectors ---------- */
        function dot(a, b) { var s = 0n; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
        function vsub(a, b, c) { return a.map(function (x, i) { return x - c * b[i]; }); }
        function vt(a) { return '(' + a.map(T).join(', ') + ')'; }
        function vplain(a) { return a.join(', '); }
        /* Gram-Schmidt from the Gram matrix: mu[i][j] (j < i) and B[i] = |b*_i|^2 */
        function gso(b) {
            var m = b.length, mu = [], B = [], r = [];
            for (var i = 0; i < m; i++) {
                mu.push([]); r.push([]);
                for (var j = 0; j <= i; j++) {
                    var x = Q(dot(b[i], b[j]));
                    for (var k = 0; k < j; k++) x = sub(x, mul(mu[j][k], r[i][k]));
                    r[i][j] = x;
                    if (j < i) mu[i][j] = div(x, B[j]);
                    else { if (x.n === 0n) return null; B[i] = x; }
                }
            }
            return { mu: mu, B: B };
        }
        /* the determinant of a square integer matrix (Bareiss, fraction free) */
        function det(a) {
            var n = a.length, m = a.map(function (r) { return r.slice(); }), sign = 1n, prev = 1n;
            for (var k = 0; k < n - 1; k++) {
                if (m[k][k] === 0n) {
                    var s = k + 1;
                    while (s < n && m[s][k] === 0n) s++;
                    if (s === n) return 0n;
                    var t = m[k]; m[k] = m[s]; m[s] = t; sign = -sign;
                }
                for (var i = k + 1; i < n; i++) for (var j = k + 1; j < n; j++) m[i][j] = (m[i][j] * m[k][k] - m[i][k] * m[k][j]) / prev;
                prev = m[k][k];
            }
            return sign * m[n - 1][n - 1];
        }
        /* ---------- input ---------- */
        var lines = String(v.basis).split(/[\n;]+/).map(function (l) { return l.replace(/[()[\]{}]/g, ' ').trim(); }).filter(Boolean);
        var b = lines.map(function (l, i) {
            return l.split(/[\s,]+/).filter(Boolean).map(function (w) {
                try { return Calc.int(w); } catch (e) { if (e instanceof Calc.UserError) Calc.fail('Vector ' + (i + 1) + ': ' + e.message, 'basis'); throw e; }
            });
        });
        var m = b.length, dim = b.length ? b[0].length : 0;
        if (m < 2) Calc.fail('Please enter at least two vectors, one per line.', 'basis');
        if (m > 6) Calc.fail('At most 6 vectors: the steps of larger reductions do not fit on a page.', 'basis');
        if (!b.every(function (x) { return x.length === dim; })) Calc.fail('All vectors must have the same number of coordinates.', 'basis');
        if (dim > 10) Calc.fail('At most 10 coordinates per vector.', 'basis');
        if (m > dim) Calc.fail(m + ' vectors in dimension ' + dim + ' are always linearly dependent.', 'basis');
        if (b.some(function (x) { return x.some(function (c) { return nt.abs(c) > 10n ** 15n; }); })) Calc.fail('Coordinates up to 10^15, please.', 'basis');
        var g0 = gso(b);
        if (!g0) Calc.fail('The vectors are linearly dependent, so they are not a basis.', 'basis');
        var square = m === dim, vol0 = square ? nt.abs(det(b)) : g0.B.reduce(function (a, x) { return mul(a, x); }, Q(1n));
        function volTex(g, bb) { return square ? '|\\det| = ' + T(nt.abs(det(bb))) : '\\det(B B^T) = ' + qt(g.B.reduce(function (a, x) { return mul(a, x); }, Q(1n))); }
        function names(i) { return 'b_{' + (i + 1) + '}'; }

        if (v._action === 'gauss') {
            if (m !== 2) Calc.fail('Lagrange-Gauss reduction works on exactly two vectors; use LLL for more.', 'basis');
            var v1 = b[0], v2 = b[1], rows = [], it = 0;
            for (;;) {
                if (++it > 2000) Calc.fail('Too many steps.', 'basis');
                var n1 = dot(v1, v1), n2 = dot(v2, v2), swapped = false;
                if (n2 < n1) { var t = v1; v1 = v2; v2 = t; t = n1; n1 = n2; n2 = t; swapped = true; }
                var mu = Q(dot(v1, v2), n1), r = round(mu);
                var nv2 = r === 0n ? v2 : vsub(v2, v1, r);
                rows.push(['$' + it + '$', swapped ? 'swap' : '', '$' + vt(v1) + '$', '$' + vt(v2) + '$', '$' + qt(mu) + '$', r === 0n ? { v: '$0$: stop', hl: true } : '$' + T(r) + '$', r === 0n ? '' : '$' + vt(nv2) + '$']);
                if (r === 0n) break;
                v2 = nv2;
            }
            var sg = S.step('Lagrange-Gauss reduction');
            sg.p('Keep $v_1$ the shorter vector (swap when needed), and subtract from $v_2$ the integer multiple $m = \\lfloor v_1 \\cdot v_2 / |v_1|^2 \\rceil$ of $v_1$ that makes it as short as possible: the Gram-Schmidt coefficient, rounded. Stop when $m = 0$.');
            sg.table(['Step', '', '$v_1$', '$v_2$', '$\\dfrac{v_1 \\cdot v_2}{|v_1|^2}$', '$m$', '$v_2 - m v_1$'], rows, { mono: true });
            var sc = S.step('Check: a reduced basis of the same lattice');
            var a1 = dot(v1, v1), a2 = dot(v2, v2), a12 = dot(v1, v2);
            sc.check(a1 <= a2, '$|v_1|^2 = ' + T(a1) + ' \\le |v_2|^2 = ' + T(a2) + '$');
            sc.check(2n * nt.abs(a12) <= a1, '$|v_1 \\cdot v_2| = ' + T(nt.abs(a12)) + ' \\le |v_1|^2 / 2$');
            var g1 = gso([v1, v2]), vol1 = square ? nt.abs(det([v1, v2])) : mul(g1.B[0], g1.B[1]);
            sc.check(square ? vol1 === vol0 : cmp(vol1, vol0) === 0, 'Same volume: ' + '$' + volTex(g1, [v1, v2]) + '$, as for the input basis');
            sc.p('Each step adds an integer multiple of one vector to the other, which is invertible over the integers, so the lattice is unchanged. With these two conditions, $v_1$ is a shortest non-zero vector of the lattice, and $v_1, v_2$ realize both successive minima.');
            S.result(['$v_1 = ' + vt(v1) + '$, $|v_1| = \\sqrt{' + T(a1) + '} \\approx ' + Math.sqrt(Number(a1)).toPrecision(6) + '$', '$v_2 = ' + vt(v2) + '$'], { copy: vplain(v1) + '\n' + vplain(v2), label: 'Reduced basis' });
            return;
        }

        /* ---------- LLL ---------- */
        var ds = String(v.delta == null ? '' : v.delta).trim() || '3/4', delta;
        var dm = /^(\d+)\s*\/\s*(\d+)$/.exec(ds), dd = /^(\d*)\.(\d+)$/.exec(ds);
        if (dm) delta = Q(BigInt(dm[1]), BigInt(dm[2]));
        else if (dd) delta = Q(BigInt((dd[1] || '0') + dd[2]), 10n ** BigInt(dd[2].length));
        else if (/^1$/.test(ds)) delta = Q(1n);
        else Calc.fail('Write delta as a fraction like 3/4 or a decimal like 0.99.', 'delta');
        if (delta.d === 0n || cmp(delta, Q(1n, 4n)) <= 0 || cmp(delta, Q(1n)) > 0) Calc.fail('LLL needs 1/4 < delta <= 1.', 'delta');

        function gsTable(s, bb, g) {
            var head = ['$i$', '$b_i$', '$|b_i^*|^2$'];
            for (var j = 0; j < bb.length - 1; j++) head.push('$\\mu_{i,' + (j + 1) + '}$');
            s.table(head, bb.map(function (x, i) {
                var row = ['$' + (i + 1) + '$', '$' + vt(x) + '$', '$' + qt(g.B[i]) + '$'];
                for (var j = 0; j < bb.length - 1; j++) row.push(j < i ? (cmp(qabs(g.mu[i][j]), HALF) > 0 ? { v: '$' + qt(g.mu[i][j]) + '$', hl: true } : '$' + qt(g.mu[i][j]) + '$') : '');
                return row;
            }), { mono: true });
        }
        var s0 = S.step('The input basis and its Gram-Schmidt data');
        s0.p('Gram-Schmidt orthogonalization: $b_i^* = b_i - \\sum_{j < i} \\mu_{i,j} b_j^*$ with $\\mu_{i,j} = \\dfrac{b_i \\cdot b_j^*}{|b_j^*|^2}$. All values are exact fractions. Coefficients with $|\\mu_{i,j}| > 1/2$ are highlighted: they are what size reduction removes.');
        gsTable(s0, b, g0);
        s0.p('The volume of the lattice, which reduction keeps: $' + volTex(g0, b) + '$.');

        var k = 1, iter = 0, rows2 = [], swaps = 0;
        while (k < m) {
            if (++iter > 5000) Calc.fail('More than 5000 LLL steps: try a smaller basis.', 'basis');
            var ops = [], g = gso(b), k0 = k + 1;
            for (var j = k - 1; j >= 0; j--) {
                var mkj = g.mu[k][j];
                if (cmp(qabs(mkj), HALF) > 0) {
                    var rr = round(mkj);
                    b[k] = vsub(b[k], b[j], rr);
                    var ra = rr < 0n ? -rr : rr;
                    ops.push('$' + names(k) + ' \\leftarrow ' + names(k) + (rr < 0n ? ' + ' : ' - ') + (ra === 1n ? '' : T(ra)) + names(j) + '$');
                    g = gso(b);
                }
            }
            var mu1 = g.mu[k][k - 1], rhs = mul(sub(delta, mul(mu1, mu1)), g.B[k - 1]), ok = cmp(g.B[k], rhs) >= 0;
            var lov = '$' + qt(g.B[k]) + (ok ? ' \\ge ' : ' < ') + '(' + qt(delta) + ' - (' + qt(mu1) + ')^2) \\cdot ' + qt(g.B[k - 1]) + ' = ' + qt(rhs) + '$';
            var act;
            if (ok) { act = '$k \\to ' + (k + 2) + '$'; k++; }
            else {
                var tmp = b[k]; b[k] = b[k - 1]; b[k - 1] = tmp; swaps++;
                act = { v: 'swap $' + names(k - 1) + ', ' + names(k) + '$', hl: true };
                k = Math.max(k - 1, 1);
            }
            rows2.push(['$' + iter + '$', '$' + k0 + '$', ops.length ? ops.join(', ') : 'none', lov, act, '$' + b.map(vt).join(',\\ ') + '$']);
        }
        var sl = S.step('LLL, step by step');
        sl.p('The counter $k$ starts at 2. In each step: size reduce $b_k$ (for $j = k - 1$ down to 1, subtract $\\lfloor \\mu_{k,j} \\rceil \\, b_j$ whenever $|\\mu_{k,j}| > 1/2$), then test the Lovász condition');
        sl.math('|b_k^*|^2 \\ge (\\delta - \\mu_{k,k-1}^2) \\, |b_{k-1}^*|^2 \\qquad \\text{with } \\delta = ' + qt(delta));
        sl.p('If it holds, move on to $k + 1$; if not, swap $b_{k-1}$ and $b_k$ and go back to $k - 1$ (but not below 2). LLL stops when $k$ passes the last vector.');
        sl.table(['Step', '$k$', 'Size reduction', 'Lovász condition', 'Then', 'Basis after the step'], rows2, { mono: true });

        var gf = gso(b), sf = S.step('Check the result');
        gsTable(sf, b, gf);
        var sized = true, lovOk = true;
        for (var i = 1; i < m; i++) {
            for (var jj = 0; jj < i; jj++) if (cmp(qabs(gf.mu[i][jj]), HALF) > 0) sized = false;
            if (cmp(gf.B[i], mul(sub(delta, mul(gf.mu[i][i - 1], gf.mu[i][i - 1])), gf.B[i - 1])) < 0) lovOk = false;
        }
        sf.check(sized, 'Size reduced: every $|\\mu_{i,j}| \\le 1/2$');
        sf.check(lovOk, 'The Lovász condition holds for every $k$');
        var volF = square ? nt.abs(det(b)) : gf.B.reduce(function (a, x) { return mul(a, x); }, Q(1n));
        sf.check(square ? volF === vol0 : cmp(volF, vol0) === 0, 'Same lattice volume: $' + volTex(gf, b) + '$ (the operations are unimodular, so the lattice is the same)');
        var best = 0;
        for (var t2 = 1; t2 < m; t2++) if (dot(b[t2], b[t2]) < dot(b[best], b[best])) best = t2;
        var nb = dot(b[best], b[best]), alpha = div(Q(1n), sub(delta, Q(1n, 4n)));
        sf.p('The shortest vector of the reduced basis is $' + names(best) + ' = ' + vt(b[best]) + '$ with $|' + names(best) + '|^2 = ' + T(nb) + '$. LLL guarantees $|b_1|^2 \\le \\alpha^{n-1} \\lambda_1^2$ with $\\alpha = 1/(\\delta - 1/4) = ' + qt(alpha) + '$ and $\\lambda_1$ the length of a shortest non-zero lattice vector; in practice it usually finds a shortest vector in small dimension, but it does not prove it.');
        S.result(b.map(function (x, i) { return '$' + names(i) + ' = ' + vt(x) + '$'; }), { copy: b.map(vplain).join('\n'), label: 'LLL-reduced basis' });
        S.note(iter + ' steps, ' + swaps + ' swap' + (swaps === 1 ? '' : 's') + '. Shortest vector found: $' + vt(b[best]) + '$, $|v| = \\sqrt{' + T(nb) + '} \\approx ' + Math.sqrt(Number(nb)).toPrecision(6) + '$.');
    }
});
