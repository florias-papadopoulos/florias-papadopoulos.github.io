/* Toolbox: continued fractions. Of a fraction a/b (Euclid's algorithm) or an exact decimal, with the table of
   convergents; of sqrt(n) with its period, and the solution of Pell's equation it gives. */
Calc.tool({
    id: 'continued-fraction',
    live: true,
    inputs: [
        { id: 'mode', type: 'select', label: 'Expand', width: 'l', value: 'frac', options: [['frac', 'A fraction a/b'], ['sqrt', 'A square root, sqrt(n)'], ['dec', 'A decimal number']] },
        { id: 'a', label: 'Numerator $a$', placeholder: '415', when: { mode: 'frac' } },
        { id: 'b', label: 'Denominator $b$', placeholder: '93', when: { mode: 'frac' } },
        { id: 'n', label: 'Number $n$ under the root', placeholder: '23', min: 0, when: { mode: 'sqrt' } },
        { id: 'x', type: 'text', label: 'Decimal number', placeholder: '3.14159265358979', maxLength: 400, when: { mode: 'dec' } }
    ],
    examples: [{ mode: 'frac', a: '415', b: '93' }, { mode: 'sqrt', n: '23' }, { mode: 'dec', x: '3.14159265358979' }, { mode: 'frac', a: '-17', b: '5' }, { mode: 'sqrt', n: '61' }, { mode: 'dec', x: '1.4142135623730951' }],
    run: function (v, S) {
        var nt = Calc.lib.nt, T = Calc.lib.primes.T;
        function convergents(as) {
            var rows = [], h1 = 1n, h2 = 0n, k1 = 0n, k2 = 1n;
            as.forEach(function (q, i) {
                var h = q * h1 + h2, k = q * k1 + k2;
                rows.push({ i: i, a: q, h: h, k: k });
                h2 = h1; h1 = h; k2 = k1; k1 = k;
            });
            return rows;
        }
        function convTable(st, rows, x) {
            st.p('With $h_{-1} = 1, h_{-2} = 0$ and $k_{-1} = 0, k_{-2} = 1$, each convergent is $\\frac{h_i}{k_i}$ with $h_i = a_i h_{i-1} + h_{i-2}$ and $k_i = a_i k_{i-1} + k_{i-2}$:');
            st.table(['$i$', '$a_i$', '$h_i$', '$k_i$', '$h_i / k_i$'], rows.map(function (r) {
                var val = Number(r.h * 1000000000000n / r.k) / 1e12, approx = '';
                if (Math.abs(val) < 1e12) approx = (r.h * 1000000000000n % r.k === 0n ? ' = ' : ' \\approx ') + val.toFixed(10).replace(/\.?0+$/, '');
                return [r.i, '$' + T(r.a) + '$', '$' + big(r.h) + '$', '$' + big(r.k) + '$', String(r.h).length + String(r.k).length < 60 ? '$\\frac{' + T(r.h) + '}{' + T(r.k) + '}' + approx + '$' : '$' + approx.replace(/^ /, '') + '$'];
            }), { mono: true });
        }
        function big(x) { var l = String(x).replace('-', '').length; return l <= 120 ? T(x) : '\\text{(' + l + ' digits)}'; }
        function U(as) { return as.length > 30 ? function (x) { return String(x); } : T; }
        function cfTex(as) { var u = U(as); return '[' + u(as[0]) + (as.length > 1 ? ';\\ ' + as.slice(1).map(u).join(',\\ ') : '') + ']'; }
        function cfPlain(as) { return '[' + as[0] + (as.length > 1 ? '; ' + as.slice(1).join(', ') : '') + ']'; }
        function fraction(a, b, src) {
            if (b === 0n) Calc.fail('The denominator cannot be 0.', 'b');
            if (b < 0n) { a = -a; b = -b; }
            if (nt.bitLength(a) > 20000 || nt.bitLength(b) > 20000) Calc.fail('The numbers are too large.');
            var rows = [], x = a, y = b, as = [];
            while (y !== 0n) {
                var d = nt.divmod(x, y);
                rows.push(['$' + T(x) + '$', '$=$', { v: '$' + T(d.q) + '$', hl: true }, '$\\cdot\\ ' + T(y) + '$', '$+\\ ' + T(d.r) + '$']);
                as.push(d.q); x = y; y = d.r;
                if (as.length > 5000) Calc.fail('More than 5000 terms.');
            }
            var g = x;
            var se = S.step('Euclid\'s algorithm on $' + T(a) + '$ and $' + T(b) + '$' + (src || ''));
            se.p('Take the integer part (rounded down), then continue with the reciprocal of what is left: $\\frac ab = q + \\frac rb = q + \\cfrac{1}{b / r}$. These are exactly the divisions of Euclid\'s algorithm, and the quotients are the terms:');
            se.table(['$a$', '$=$', '$q$', '$\\cdot\\, b$', '$+\\ r$'], rows, { mono: true });
            if (g !== 1n) se.p('$\\gcd = ' + T(g) + '$, so $\\frac{' + T(a) + '}{' + T(b) + '} = \\frac{' + T(a / g) + '}{' + T(b / g) + '}$ (same expansion).');
            var conv = convergents(as);
            var sc = S.step('Convergents');
            convTable(sc, conv, true);
            var last = conv[conv.length - 1];
            sc.check(last.h * b === last.k * a, 'The last convergent is the fraction itself, $\\frac{' + T(last.h) + '}{' + T(last.k) + '}$');
            if (conv.length > 1) {
                var pen = conv[conv.length - 2], det = last.h * pen.k - last.k * pen.h;
                S.step('A bonus: Bézout\'s identity').p('Consecutive convergents satisfy $h_i k_{i-1} - h_{i-1} k_i = (-1)^{i+1}$. With the last two:')
                    .math(T(last.h) + ' \\cdot ' + T(pen.k) + ' - ' + (pen.h < 0n ? '(' + T(pen.h) + ')' : T(pen.h)) + ' \\cdot ' + T(last.k) + ' = ' + T(det))
                    .p('This is the extended Euclidean algorithm in disguise' + (last.k > 1n ? ': modulo $' + T(last.k) + '$ it says $' + T(last.h) + ' \\cdot ' + T(pen.k) + ' \\equiv ' + T(det) + '$, so $' + T(nt.mod(det * pen.k, last.k)) + '$ is the inverse of $' + T(last.h) + '$ modulo $' + T(last.k) + '$.' : '.'));
            }
            S.result('$\\frac{' + T(a) + '}{' + T(b) + '} = ' + cfTex(as) + '$', { copy: cfPlain(as) });
            S.note('$[a_0; a_1, a_2, \\dots]$ stands for $a_0 + \\cfrac{1}{a_1 + \\cfrac{1}{a_2 + \\dotsb}}$.');
        }
        if (v.mode === 'frac') return fraction(v.a, v.b);
        if (v.mode === 'dec') {
            var t = String(v.x).trim().replace(/\s/g, '').replace(',', '.');
            var m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(t);
            if (!m || !(m[2] || m[3])) Calc.fail('Please enter a decimal number such as 3.14159 or -0.75.', 'x');
            var digits = m[3] || '', num = BigInt((m[2] || '0') + digits) * (m[1] === '-' ? -1n : 1n), den = 10n ** BigInt(digits.length);
            var g0 = nt.gcd(num, den);
            S.step('Write the decimal as a fraction').math(Calc.tt(t) + ' = \\frac{' + T(num) + '}{' + T(den) + '}' + (g0 > 1n ? ' = \\frac{' + T(num / g0) + '}{' + T(den / g0) + '}' : ''));
            fraction(num / g0, den / g0, '');
            S.note('A decimal is a fraction, so its expansion ends. If the decimal is a rounded irrational number, only the first terms belong to that number; the last ones come from the rounding.');
            return;
        }
        /* sqrt(n) */
        var n = v.n;
        if (n > 10n ** 30n) Calc.fail('At most 10^30.', 'n');
        var r = nt.isqrt(n);
        if (r * r === n) {
            S.result('$\\sqrt{' + T(n) + '} = ' + T(r) + ' = [' + T(r) + ']$', { copy: '[' + r + ']' });
            S.step('A perfect square').p('$' + T(n) + ' = ' + T(r) + '^2$, so the root is a whole number and the expansion is the single term $' + T(r) + '$. Only non-squares have an infinite (periodic) expansion.');
            return;
        }
        var mm = 0n, d = 1n, a0 = r, aa = r, rows = [], as = [a0];
        rows.push(['$0$', '$0$', '$1$', { v: '$' + T(a0) + '$', hl: true }]);
        for (var i = 1; ; i++) {
            mm = d * aa - mm; d = (n - mm * mm) / d; aa = (a0 + mm) / d;
            rows.push(['$' + i + '$', '$' + T(mm) + '$', '$' + T(d) + '$', { v: '$' + T(aa) + '$', hl: true }]);
            as.push(aa);
            if (aa === 2n * a0) break;
            if (i >= 5000) Calc.fail('The period of this square root is longer than 5000 terms.', 'n');
        }
        var per = as.slice(1), L = per.length;
        var s1 = S.step('The algorithm for $\\sqrt{' + T(n) + '}$');
        s1.p('Every remainder has the form $\\frac{\\sqrt n + m_i}{d_i}$ with whole $m_i, d_i$, so only whole numbers are needed. Start with $m_0 = 0$, $d_0 = 1$, $a_0 = \\lfloor \\sqrt n \\rfloor = ' + T(a0) + '$, then');
        s1.math('m_{i+1} = d_i a_i - m_i, \\qquad d_{i+1} = \\frac{n - m_{i+1}^2}{d_i}, \\qquad a_{i+1} = \\Bigl\\lfloor \\frac{a_0 + m_{i+1}}{d_{i+1}} \\Bigr\\rfloor');
        s1.table(['$i$', '$m_i$', '$d_i$', '$a_i$'], rows, { mono: true });
        s1.p('The period ends when $a_i = 2a_0 = ' + T(2n * a0) + '$ (Lagrange: the expansion of a quadratic irrational is periodic; for $\\sqrt n$ it repeats from $a_1$ on, and the period reads the same backwards apart from that last term).');
        var copy = '[' + a0 + '; (' + per.join(', ') + ')]';
        S.result('$\\sqrt{' + T(n) + '} = [' + T(a0) + ';\\ \\overline{' + per.map(U(per)).join(',\\ ') + '}\\,]$', { copy: copy });
        S.note('The bar marks the period, of length ' + L + '.');
        var take = as.slice();
        while (take.length < 12) take = take.concat(per);
        var conv = convergents(take.slice(0, Math.max(12, L)));
        var sc = S.step('Convergents');
        convTable(sc, conv.slice(0, 40), true);
        sc.p('They approach $\\sqrt{' + T(n) + '} \\approx ' + Math.sqrt(Number(n)).toFixed(10) + '$ alternately from below and above, each one the best approximation for its denominator size.');
        var c = conv[L - 1], pell = c.h * c.h - n * c.k * c.k;
        var sp = S.step('Pell\'s equation');
        sp.p('The convergent just before the end of the first period, $\\frac{' + T(c.h) + '}{' + T(c.k) + '}$, gives the smallest solution of $x^2 - ' + T(n) + ' y^2 = ' + (L % 2 ? '-1' : '1') + '$ (the sign is $(-1)^{\\text{period}}$):');
        sp.math(big(c.h) + '^2 - ' + T(n) + ' \\cdot ' + big(c.k) + '^2 = ' + big(c.h * c.h) + ' - ' + big(n * c.k * c.k) + ' = ' + T(pell));
        sp.check(pell === (L % 2 ? -1n : 1n), 'It is a solution');
        if (L % 2) sp.p('The period is odd, so this solves the negative equation; squaring, $(x + y\\sqrt n)^2$, gives the solution of $x^2 - ny^2 = 1$: $x = ' + big(c.h * c.h + n * c.k * c.k) + '$, $y = ' + big(2n * c.h * c.k) + '$.');
    }
});
