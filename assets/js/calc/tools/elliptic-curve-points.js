/* Toolbox: every point of y^2 = x^3 + ax + b over a small F_p: the table of x, f(x), square or not, y; the group order
   and the Hasse bound; the order of every point, the group structure and a generator when the group is cyclic. */
Calc.tool({
    id: 'elliptic-curve-points',
    inputs: [
        { id: 'a', label: 'Coefficient $a$', placeholder: '2' },
        { id: 'b', label: 'Coefficient $b$', placeholder: '2' },
        { id: 'p', label: 'Prime $p$', placeholder: '17', help: 'A prime from 5 to 2000.' }
    ],
    examples: [{ a: '2', b: '2', p: '17' }, { a: '-1', b: '0', p: '23' }, { a: '1', b: '1', p: '5' }, { a: '1', b: '6', p: '1009' }],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, ec = M.ec, T = Calc.lib.modern.tex, E = { a: v.a, b: v.b, p: v.p };
        if (v.p > 2000n) Calc.fail('This tool lists every point, so p is limited to 2000. For a single point use the elliptic curve arithmetic tool.', 'p');
        ec.curveStep(S.step('The curve $y^2 = x^3 + ax + b$ over $\\mathbb{F}_{' + T(v.p) + '}$'), E);
        var p = E.p, a = E.a, b = E.b, pts = [null];
        S.steps[0].p('With $a \\equiv ' + T(a) + '$ and $b \\equiv ' + T(b) + '$: $' + ec.eqTex(E) + '$.');

        /* the table of x values */
        var rows = [], half = (p - 1n) / 2n, nsq = 0;
        for (var x = 0n; x < p; x++) {
            var f = ec.f(E, x), leg = f === 0n ? 0 : nt.powmod(f, half, p) === 1n ? 1 : -1, ys = '';
            if (leg === 0) { pts.push({ x: x, y: 0n }); ys = '$0$'; }
            else if (leg === 1) {
                var y = nt.sqrtModPrime(f, p), y2 = p - y;
                if (y2 < y) { var t = y; y = y2; y2 = t; }
                pts.push({ x: x, y: y }, { x: x, y: y2 });
                ys = '$' + T(y) + ', ' + T(y2) + '$';
                nsq++;
            }
            rows.push(['$' + T(x) + '$', '$' + T(f) + '$', leg === 0 ? 'zero' : leg === 1 ? { v: 'yes', hl: true } : 'no', ys]);
        }
        var s1 = S.step('Go through every $x$ in $\\mathbb{F}_{' + T(p) + '}$');
        s1.p('For each $x$ compute $f(x) = ' + ec.eqTex(E).slice(6) + ' \\bmod ' + T(p) + '$. A point $(x, y)$ exists when $f(x)$ is a square modulo $p$. Euler\'s criterion decides: $f(x)^{(p-1)/2} \\equiv 1$ for a non-zero square, $\\equiv -1$ otherwise. A square has two roots $\\pm y$; $f(x) = 0$ gives one point with $y = 0$.');
        s1.table(['$x$', '$f(x)$', 'Square?', '$y$'], rows, { mono: true });
        var N = BigInt(pts.length);
        var s2 = S.step('Count the points');
        var zeros = pts.filter(function (P) { return P !== null && P.y === 0n; }).length;
        s2.math('\\#E(\\mathbb{F}_{' + T(p) + '}) = 1 + 2 \\cdot ' + nsq + (zeros ? ' + ' + zeros : '') + ' = ' + T(N));
        s2.p('The 1 is the point at infinity $\\mathcal{O}$; each non-zero square gives two points' + (zeros ? ', each root of $f$ one' : '') + '.');
        var r = nt.isqrt(4n * p), lo = p + 1n - r, hi = p + 1n + r;
        /* Hasse: |N - (p + 1)| <= 2 sqrt(p); r = floor(2 sqrt p) */
        s2.p('Hasse\'s theorem bounds the count: $|\\#E - (p + 1)| \\le 2\\sqrt{p}$, here $2\\sqrt{' + T(p) + '} \\approx ' + (2 * Math.sqrt(Number(p))).toFixed(2) + '$, so');
        s2.math(T(lo) + ' \\le \\#E \\le ' + T(hi));
        s2.check(N >= lo && N <= hi, '$' + T(N) + '$ is in the Hasse interval; the trace of Frobenius is $t = p + 1 - \\#E = ' + T(p + 1n - N) + '$');

        /* orders of the points */
        var fac = nt.factor(N), orders = pts.map(function (P) { return ec.order(E, P, N, fac); });
        var ftex = fac.factors.map(function (f) { return T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : ''); }).join(' \\cdot ');
        var s3 = S.step('The order of every point');
        s3.p('By Lagrange\'s theorem the order of a point divides $\\#E = ' + T(N) + (fac.factors.length > 1 || fac.factors[0].e > 1 ? ' = ' + ftex : '') + '$. Start from $\\#E$ and divide by a prime $r$ as long as $(n/r) \\cdot P$ is still $\\mathcal{O}$.');
        var maxO = orders.reduce(function (m, o) { return o > m ? o : m; }, 1n);
        s3.table(['Point', 'Order'], pts.map(function (P, i) { return ['$' + ec.tex(P) + '$', orders[i] === N ? { v: '$' + T(orders[i]) + '$', hl: true } : '$' + T(orders[i]) + '$']; }), { mono: true });
        var count = {};
        orders.forEach(function (o) { var k = String(o); count[k] = (count[k] || 0) + 1; });
        var ks = Object.keys(count).sort(function (x, y) { return Number(x) - Number(y); });
        s3.table(['Order', 'Number of points'], ks.map(function (k) { return ['$' + k + '$', count[k]]; }), { caption: 'How many points have each order:' });

        /* structure: E = Z_n1 x Z_n2 with n1 | n2; the exponent n2 is the largest order */
        var n2 = maxO, n1 = N / n2, gen = null;
        for (var i = 0; i < pts.length; i++) if (orders[i] === N) { gen = pts[i]; break; }
        var s4 = S.step('The group structure');
        s4.p('The points form a finite abelian group, which is always $\\mathbb{Z}_{n_1} \\times \\mathbb{Z}_{n_2}$ with $n_1 \\mid n_2$ (and $n_1 \\mid p - 1$). The largest order of a point is $n_2 = ' + T(n2) + '$, so $n_1 = ' + T(N) + ' / ' + T(n2) + ' = ' + T(n1) + '$.');
        if (gen) {
            s4.check(true, 'The group is cyclic: $' + ec.tex(gen) + '$ has order $' + T(N) + '$ and generates every point');
            s4.p('There are $\\varphi(' + T(N) + ') = ' + T(BigInt(count[String(N)])) + '$ generators.' + (fac.factors.length === 1 && fac.factors[0].e === 1 ? ' $\\#E$ is prime, so every point other than $\\mathcal{O}$ is a generator: the ideal case for cryptography.' : ''));
        } else s4.check(false, 'The group is not cyclic: $E \\cong \\mathbb{Z}_{' + T(n1) + '} \\times \\mathbb{Z}_{' + T(n2) + '}$, and no point has order $' + T(N) + '$');
        var lines = ['$\\#E(\\mathbb{F}_{' + T(p) + '}) = ' + T(N) + '$ points (with $\\mathcal{O}$)', gen ? 'Cyclic, generated by $' + ec.tex(gen) + '$' : 'Not cyclic: $\\mathbb{Z}_{' + T(n1) + '} \\times \\mathbb{Z}_{' + T(n2) + '}$'];
        S.result(lines, { copy: String(N), label: 'Group order' });
        if (N === p) S.note('$\\#E = p$: this curve is anomalous, and discrete logarithms on it are easy (Smart\'s attack). Never use such a curve.');
        else if (nt.mod(p + 1n - N, p) === 0n) S.note('The trace is $0 \\bmod p$: the curve is supersingular, and the MOV attack moves discrete logarithms to a small extension field.');
    }
});
