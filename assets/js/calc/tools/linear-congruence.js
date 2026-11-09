/* Toolbox: a·x ≡ b (mod n), all solutions: the gcd condition, division by g, the inverse of a/g mod n/g, the list
   of solutions modulo n and a check. */
(function () {
    'use strict';
    var LIST = 64;
    Calc.tool({
        id: 'linear-congruence',
        live: true,
        inputs: [
            { id: 'a', label: 'Coefficient $a$', placeholder: '14' },
            { id: 'b', label: 'Right side $b$', placeholder: '30' },
            { id: 'n', label: 'Modulus $n$', placeholder: '100', min: 1 }
        ],
        examples: [{ a: '14', b: '30', n: '100' }, { a: '3', b: '4', n: '7' }, { a: '6', b: '4', n: '9' }, { a: '-5', b: '17', n: '26' }, { a: '0', b: '0', n: '6' }],
        run: function (v, S) {
            var nt = Calc.lib.nt, M = Calc.lib.modArith, T = Calc.tex, n = v.n;
            if (nt.bitLength(n) > 8192) Calc.fail('Please use a modulus below 2^8192.', 'n');
            var a = nt.mod(v.a, n), b = nt.mod(v.b, n);
            if (nt.bitLength(a) * nt.bitLength(n) > 4194304) Calc.fail('These numbers are too large together to show every row (a modulus of 2048 bits is fine).', 'n');
            var title = T(v.a) + ' \\cdot x \\equiv ' + T(v.b) + ' \\pmod{' + T(n) + '}';
            if (a !== v.a || b !== v.b) {
                S.step('Reduce the coefficients').p('Only the remainders modulo $' + T(n) + '$ matter:').math(title + ' \\iff ' + T(a) + ' x \\equiv ' + T(b) + ' \\pmod{' + T(n) + '}');
            }

            /* gcd */
            var g = nt.gcd(a, n);
            var s1 = S.step('The gcd of $a = ' + T(a) + '$ and $n = ' + T(n) + '$');
            if (a === 0n) s1.p('$a \\equiv 0$, and every number divides 0, so $g = \\gcd(0, ' + T(n) + ') = ' + T(n) + '$.');
            else {
                var rows = nt.euclidRows(n, a);
                s1.p('Euclid\'s algorithm (divide, then divide the divisor by the remainder, until it is 0):');
                s1.lines(rows.map(function (r) { return T(r.a) + ' &= ' + T(r.q) + ' \\cdot ' + T(r.b) + ' + ' + T(r.r); }));
                s1.p('The last non-zero remainder: $g = ' + T(g) + '$.');
            }

            /* solvability */
            var s2 = S.step('Is there a solution?');
            s2.p('For any $x$, the number $a x - k n$ is a multiple of $g$ (both $a$ and $n$ are). So $a x \\equiv b$ can only hold if $g$ divides $b$, and when it does, there are exactly $g$ solutions modulo $n$.');
            if (b % g !== 0n) {
                s2.check(false, '$' + T(g) + '$ does not divide $' + T(b) + '$: $' + T(b) + ' = ' + T(b / g) + ' \\cdot ' + T(g) + ' + ' + T(b % g) + '$');
                S.result('$' + title + '$ has no solution', { copy: 'no solution' });
                S.note('$\\gcd(' + T(a) + ', ' + T(n) + ') = ' + T(g) + '$ does not divide $' + T(b) + '$.');
                return;
            }
            s2.check(true, '$' + T(g) + '$ divides $' + T(b) + '$' + (g === 1n ? ' ($g = 1$ divides everything): exactly one solution modulo $' + T(n) + '$' : ': $' + T(b) + ' = ' + T(b / g) + ' \\cdot ' + T(g) + '$, so there are $' + T(g) + '$ solutions modulo $' + T(n) + '$'));

            /* divide by g */
            var a1 = a / g, b1 = b / g, n1 = n / g;
            if (g > 1n) {
                var sd = S.step('Divide everything by $g = ' + T(g) + '$').p('$a x - b$ is a multiple of $n$ exactly when $(a x - b) / g$ is a multiple of $n / g$, so the congruence is equivalent to:')
                    .math(T(a1) + ' x \\equiv ' + T(b1) + ' \\pmod{' + T(n1) + '}');
                if (n1 > 1n) sd.p('Now $\\gcd(' + T(a1) + ', ' + T(n1) + ') = 1$, so $' + T(a1) + '$ has an inverse modulo $' + T(n1) + '$.');
            }

            /* the inverse and x0 */
            var x0;
            if (n1 === 1n) {
                x0 = 0n;
                S.step('Modulo 1').p('Modulo 1 every number is congruent to 0, so every $x$ works: $x \\equiv 0 \\pmod 1$.');
            } else {
                var inv = M.inverseStep(S, a1, n1, 'Invert $' + T(a1) + '$ modulo $' + T(n1) + '$');
                x0 = nt.mod(b1 * inv, n1);
                S.step('Multiply both sides by the inverse').p('Multiplying $' + T(a1) + ' x \\equiv ' + T(b1) + '$ by $' + T(inv) + '$ leaves $x$ alone on the left:')
                    .math('x \\equiv ' + T(b1) + ' \\cdot ' + T(inv) + ' = ' + T(b1 * inv) + ' \\equiv ' + T(x0) + ' \\pmod{' + T(n1) + '}');
            }

            /* all solutions modulo n */
            var sols = [], shown = g <= BigInt(LIST) ? Number(g) : LIST;
            for (var k = 0; k < shown; k++) sols.push(x0 + BigInt(k) * n1);
            if (g > 1n) {
                var s5 = S.step('All solutions modulo $' + T(n) + '$');
                if (n1 === 1n) s5.p('Every $x$ is a solution, so all ' + T(g) + ' remainders modulo $' + T(n) + '$ are:');
                else s5.p('Adding multiples of $' + T(n1) + '$ to $' + T(x0) + '$ gives the ' + T(g) + ' solutions between $0$ and $' + T(n - 1n) + '$:');
                if (n1 > 1n) s5.math('x = ' + T(x0) + ' + ' + T(n1) + ' k, \\quad k = ' + (g <= 3n ? (g === 2n ? '0, 1' : '0, 1, 2') : '0, 1, \\dots, ' + T(g - 1n)));
                s5.p(sols.map(function (x) { return '$' + T(x) + '$'; }).join(', ') + (g > BigInt(LIST) ? ', and so on (' + T(g) + ' in all).' : '.'));
            }

            /* check */
            var c = S.step('Check');
            var prod = a * x0;
            c.math(T(a) + ' \\cdot ' + T(x0) + ' = ' + T(prod) + ' = ' + T(prod / n) + ' \\cdot ' + T(n) + ' + ' + T(prod % n));
            c.check(prod % n === b, 'The remainder is $b = ' + T(b) + '$');
            if (g > 1n) c.p('The other solutions work too: $a (x_0 + ' + T(n1) + ' k) = a x_0 + ' + T(a1) + ' \\cdot ' + T(n) + ' k \\equiv a x_0$, because $a \\cdot ' + T(n1) + ' = ' + T(a1) + ' \\cdot ' + T(g) + ' \\cdot ' + T(n1) + '$ is a multiple of $n$.');

            var lines = ['$x \\equiv ' + T(x0) + ' \\pmod{' + T(n1) + '}$'];
            if (g > 1n) lines.push(g <= 16n ? 'Modulo $' + T(n) + '$: $x \\in \\{' + sols.map(T).join(', ') + '\\}$' : '$' + T(g) + '$ solutions modulo $' + T(n) + '$');
            S.result(lines, { copy: x0 + ' mod ' + n1 });
        }
    });
})();
