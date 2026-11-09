/* Toolbox: a mod n, with Euclidean division written out and the three sign conventions compared. */
Calc.tool({
    id: 'modulo',
    live: true,
    inputs: [
        { id: 'a', label: 'Number $a$', placeholder: '123', help: 'Any whole number, also negative or huge, e.g. 2^100 + 7.' },
        { id: 'n', label: 'Modulus $n$', placeholder: '4' },
        { id: 'conv', label: 'Sign of the result', type: 'select', width: 'l', value: 'euclid', options: [
            ['euclid', 'Never negative (mathematics)'],
            ['trunc', 'Sign of a (C, Java, JavaScript %)'],
            ['floor', 'Sign of n (Python %)']
        ] }
    ],
    examples: [{ a: '123', n: '4', conv: 'euclid' }, { a: '-17', n: '5', conv: 'euclid' }, { a: '2^100', n: '97', conv: 'euclid' }, { a: '-17', n: '5', conv: 'trunc' }],
    run: function (v, S) {
        var nt = Calc.lib.nt, a = v.a, n = v.n, T = Calc.tex;
        if (n === 0n) Calc.fail('The modulus cannot be 0: there is no remainder of a division by zero.', 'n');
        /* the quotient each convention uses */
        function quot(conv) {
            var q = a / n;   // BigInt division truncates toward zero
            var r = a - q * n;
            if (conv === 'floor' && r !== 0n && (r < 0n) !== (n < 0n)) q -= 1n;
            if (conv === 'euclid' && r < 0n) q += n > 0n ? -1n : 1n;
            return q;
        }
        var q = quot(v.conv), r = a - q * n;
        var small = nt.abs(a) < 10n ** 15n && nt.abs(n) < 10n ** 15n;
        var rule = { euclid: 'rounded down when $n > 0$ (up when $n < 0$), so that $0 \\le r < |n|$', trunc: 'rounded toward zero', floor: 'rounded down' }[v.conv];

        S.result('$' + T(a) + ' \\bmod ' + T(n) + ' = ' + T(r) + '$', { copy: String(r) });
        if (v.conv === 'euclid') S.note('In congruence notation: $' + T(a) + ' \\equiv ' + T(r) + ' \\pmod{' + T(nt.abs(n)) + '}$.');

        var s1 = S.step('Divide $a$ by $n$');
        if (small) {
            var dec = Number(a) / Number(n), shown = Math.abs(dec) >= 1e12 ? dec.toExponential(6) : String(+dec.toFixed(6));
            s1.math(T(a) + ' \\div ' + T(n) + ' \\approx ' + shown);
        }
        s1.p('The quotient is ' + rule + ':');
        s1.math('q = ' + T(q));
        S.step('Multiply back').math('q \\cdot n = ' + T(q) + ' \\cdot ' + (n < 0n ? '(' + T(n) + ')' : T(n)) + ' = ' + T(q * n));
        var s3 = S.step('Subtract to get the remainder');
        s3.math('r = a - q \\cdot n = ' + T(a) + ' - ' + (q * n < 0n ? '(' + T(q * n) + ')' : T(q * n)) + ' = ' + T(r));
        s3.p('So $' + T(a) + ' = ' + T(q) + ' \\cdot ' + (n < 0n ? '(' + T(n) + ')' : T(n)) + ' + ' + (r < 0n ? '(' + T(r) + ')' : T(r)) + '$.');
        var ok = v.conv === 'euclid' ? r >= 0n && r < nt.abs(n) : v.conv === 'trunc' ? (r === 0n || (r < 0n) === (a < 0n)) && nt.abs(r) < nt.abs(n) : (r === 0n || (r < 0n) === (n < 0n)) && nt.abs(r) < nt.abs(n);
        s3.check(ok, v.conv === 'euclid' ? '$0 \\le ' + T(r) + ' < ' + T(nt.abs(n)) + '$' : '$|r| < |n|$ and $r$ has the sign of ' + (v.conv === 'trunc' ? '$a$' : '$n$') + ' (or is 0)');

        /* the conventions only differ when a or n is negative and the division is not exact */
        var rows = [['Never negative (mathematics)', 'euclid'], ['Sign of $a$: C, C++, Java, JavaScript, Rust, Go', 'trunc'], ['Sign of $n$: Python, Ruby, Excel MOD', 'floor']].map(function (c) {
            var qq = quot(c[1]), rr = a - qq * n;
            return [c[0], '$' + T(qq) + '$', { v: '$' + T(rr) + '$', hl: c[1] === v.conv }];
        });
        var differ = rows.some(function (x) { return x[2].v !== rows[0][2].v; });
        S.step('Other conventions').p(differ
            ? 'With a negative number the answer depends on the convention. The three in use:'
            : 'Here all three conventions in use agree (they only differ when $a$ or $n$ is negative):')
            .table(['Convention', 'Quotient $q$', 'Remainder $r$'], rows);
    }
});
