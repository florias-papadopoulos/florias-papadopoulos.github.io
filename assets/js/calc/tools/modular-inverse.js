/* Toolbox: the inverse of a modulo n with the extended Euclidean algorithm (table), Bézout's identity and a check. */
Calc.tool({
    id: 'modular-inverse',
    live: true,
    inputs: [
        { id: 'a', label: 'Number $a$', placeholder: '17' },
        { id: 'n', label: 'Modulus $n$', placeholder: '3120', min: 2 }
    ],
    examples: [{ a: '17', n: '3120' }, { a: '3', n: '26' }, { a: '6', n: '15' }, { a: '65537', n: '(2^61-2)*(2^31-2)' }],
    run: function (v, S) {
        var nt = Calc.lib.nt, T = Calc.tex, n = v.n, a0 = v.a, a = nt.mod(a0, n);
        if (a !== a0) {
            S.step('Reduce $a$ modulo $n$').p('Only $a \\bmod n$ matters:').math(T(a0) + ' \\bmod ' + T(n) + ' = ' + T(a));
        }
        var e = nt.egcdRows(n, a), rows = e.rows;
        var s = S.step('Extended Euclidean algorithm on $n = ' + T(n) + '$ and $a = ' + T(a) + '$');
        s.p('Each row keeps $r_i = s_i \\cdot n + t_i \\cdot a$. Start with the rows for $n$ and $a$; then $q_i = \\lfloor r_{i-1} / r_i \\rfloor$ and every column follows $x_{i+1} = x_{i-1} - q_i \\cdot x_i$, until $r = 0$.');
        s.table(['$i$', '$r_i$', '$q_i$', '$s_i$', '$t_i$'], rows.map(function (r, i) {
            var last = i === rows.length - 2;
            return [i, last ? { v: '$' + T(r.r) + '$', hl: true } : '$' + T(r.r) + '$', r.q === null ? '' : '$' + T(r.q) + '$', '$' + T(r.s) + '$', last ? { v: '$' + T(r.t) + '$', hl: true } : '$' + T(r.t) + '$'];
        }), { mono: true });
        var g = rows[rows.length - 2].r, sB = rows[rows.length - 2].s, tB = rows[rows.length - 2].t;
        if (g !== 1n) {
            S.result('$' + T(a0) + '$ has no inverse modulo $' + T(n) + '$', { copy: 'no inverse' });
            S.note('$\\gcd(' + T(a) + ', ' + T(n) + ') = ' + T(g) + ' \\ne 1$. An inverse exists only when $a$ and $n$ are coprime.');
            S.step('Why there is none').p('The last non-zero remainder is $\\gcd = ' + T(g) + '$. Every multiple $a \\cdot x$ minus a multiple of $n$ is divisible by $' + T(g) + '$, so $a \\cdot x$ can never leave remainder 1.');
            return;
        }
        var inv = nt.mod(tB, n);
        S.result('$' + T(a0) + '^{-1} \\equiv ' + T(inv) + ' \\pmod{' + T(n) + '}$', { copy: String(inv) });
        var sb = S.step('Read off Bézout\'s identity');
        sb.p('The last non-zero remainder is $\\gcd(' + T(n) + ', ' + T(a) + ') = 1$, and its row says:');
        sb.math((sB < 0n ? '(' + T(sB) + ')' : T(sB)) + ' \\cdot ' + T(n) + ' + ' + (tB < 0n ? '(' + T(tB) + ')' : T(tB)) + ' \\cdot ' + T(a) + ' = 1');
        sb.p('Modulo $n$ the first term vanishes, so $' + (tB < 0n ? '(' + T(tB) + ')' : T(tB)) + ' \\cdot ' + T(a) + ' \\equiv 1 \\pmod{' + T(n) + '}$.');
        if (tB < 0n) S.step('Make it positive').math(T(tB) + ' + ' + T(n) + ' = ' + T(inv));
        var c = S.step('Check');
        var prod = a0 * inv, k = (prod - nt.mod(prod, n)) / n;
        c.math(T(a0) + ' \\cdot ' + T(inv) + ' = ' + T(prod) + ' = ' + T(k) + ' \\cdot ' + T(n) + ' + ' + T(nt.mod(prod, n)));
        c.check(nt.mod(prod, n) === 1n, 'The remainder is 1');
        if (nt.isPrime(n)) S.note('$n$ is prime, so Fermat\'s little theorem gives the same answer: $a^{-1} \\equiv a^{n-2} \\pmod n$.');
    }
});
