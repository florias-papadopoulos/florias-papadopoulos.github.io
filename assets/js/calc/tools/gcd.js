/* Toolbox: greatest common divisor (Euclid's algorithm, table) and least common multiple, for two or more numbers. */
Calc.tool({
    id: 'gcd',
    live: true,
    inputs: [
        { id: 'nums', type: 'list', label: 'Numbers', width: 'l', placeholder: '252, 105', help: 'Two or more whole numbers, separated by commas.' }
    ],
    examples: [{ nums: '252, 105' }, { nums: '1071, 462' }, { nums: '12, 18, 30' }, { nums: '2^64 - 1, 2^48 - 1' }],
    run: function (v, S) {
        var nt = Calc.lib.nt, T = Calc.tex, xs = v.nums.map(nt.abs);
        if (xs.length < 2) Calc.fail('Please enter at least two numbers.', 'nums');
        if (xs.length > 12) Calc.fail('At most 12 numbers.', 'nums');
        if (xs.every(function (x) { return x === 0n; })) Calc.fail('gcd(0, 0) is not defined: every number divides 0.', 'nums');
        var names = xs.map(T).join(', ');
        var g = xs[0], l = xs[0];
        for (var i = 1; i < xs.length; i++) {
            var b = xs[i], a = g, step = xs.length > 2 ? ' (' + (i === 1 ? 'first two numbers' : 'with ' + T(b)) + ')' : '';
            var s = S.step('Euclid\'s algorithm on $' + T(a) + '$ and $' + T(b) + '$' + step);
            var big = a > b ? a : b, small = a > b ? b : a;
            if (small === 0n) {
                s.p('One of them is 0, and every number divides 0, so the gcd is the other one: $' + T(big) + '$.');
                g = big;
            } else {
                var rows = nt.euclidRows(big, small);
                s.p('Divide the larger by the smaller and keep the remainder; then repeat with the divisor and the remainder until the remainder is 0. The last divisor is the gcd.');
                s.table(['$a$', '$=$', '$q$', '$\\cdot\\, b$', '$+\\ r$'], rows.map(function (r, k) {
                    return ['$' + T(r.a) + '$', '$=$', '$' + T(r.q) + '$', '$\\cdot\\ ' + T(r.b) + '$', k === rows.length - 1 ? '$+\\ 0$' : { v: '$+\\ ' + T(r.r) + '$', hl: k === rows.length - 2 }];
                }), { hl: rows.length - 1 });
                g = rows[rows.length - 1].b;
                s.p('The remainder became 0, so $\\gcd(' + T(a) + ', ' + T(b) + ') = ' + T(g) + '$.');
            }
            l = nt.lcm(l, b);
        }
        var lines = ['$\\gcd(' + names + ') = ' + T(g) + '$'];
        var zero = xs.some(function (x) { return x === 0n; });
        lines.push('$\\operatorname{lcm}(' + names + ') = ' + T(l) + '$');
        S.result(lines, { copy: 'gcd = ' + g + '\nlcm = ' + l });
        if (g === 1n) S.note('The gcd is 1: these numbers are coprime (they share no prime factor).');

        var sl = S.step('Least common multiple');
        if (zero) sl.p('One of the numbers is 0, and the only multiple of 0 is 0, so the lcm is 0.');
        else if (xs.length === 2) {
            sl.p('For two numbers, $\\operatorname{lcm}(a, b) = \\dfrac{a \\cdot b}{\\gcd(a, b)}$:');
            sl.math('\\operatorname{lcm}(' + T(xs[0]) + ', ' + T(xs[1]) + ') = \\frac{' + T(xs[0]) + ' \\cdot ' + T(xs[1]) + '}{' + T(g) + '} = \\frac{' + T(xs[0] * xs[1]) + '}{' + T(g) + '} = ' + T(l));
        } else {
            sl.p('Two at a time, with $\\operatorname{lcm}(a, b) = a \\cdot b / \\gcd(a, b)$:');
            var acc = xs[0], rows2 = [];
            for (var j = 1; j < xs.length; j++) {
                var gg = nt.gcd(acc, xs[j]), nl = acc / gg * xs[j];
                rows2.push('\\operatorname{lcm}(' + T(acc) + ', ' + T(xs[j]) + ') &= \\frac{' + T(acc) + ' \\cdot ' + T(xs[j]) + '}{' + T(gg) + '} = ' + T(nl));
                acc = nl;
            }
            sl.lines(rows2);
        }
        if (!zero) sl.check(xs.every(function (x) { return l % x === 0n; }), 'Every number divides $' + T(l) + '$');
    }
});
