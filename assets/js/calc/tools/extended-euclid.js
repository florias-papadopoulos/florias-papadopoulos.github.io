/* Toolbox: the extended Euclidean algorithm. Bézout coefficients s, t with s·a + t·b = gcd(a, b), found twice: with
   the table (forward) and by back-substitution through Euclid's divisions, then checked. */
(function () {
    'use strict';
    Calc.tool({
        id: 'extended-euclid',
        live: true,
        inputs: [
            { id: 'a', label: 'Number $a$', placeholder: '240', help: 'Whole numbers, also negative, e.g. 2^61 - 1.' },
            { id: 'b', label: 'Number $b$', placeholder: '46' }
        ],
        examples: [{ a: '240', b: '46' }, { a: '17', b: '3120' }, { a: '1071', b: '462' }, { a: '-56', b: '15' }, { a: '12', b: '4' }, { a: '2^61 - 1', b: '2^31 - 1' }],
        run: function (v, S) {
            var nt = Calc.lib.nt, M = Calc.lib.modArith, T = Calc.tex, P = M.par, a = v.a, b = v.b;
            if (a === 0n && b === 0n) Calc.fail('gcd(0, 0) is not defined: every number divides 0.', 'b');
            if (nt.bitLength(a) > 8192 || nt.bitLength(b) > 8192) Calc.fail('Please use numbers below 2^8192.', nt.bitLength(a) > 8192 ? 'a' : 'b');
            if (Math.min(nt.bitLength(a), nt.bitLength(b)) * Math.max(nt.bitLength(a), nt.bitLength(b)) > 4194304) Calc.fail('These numbers are too large together to show every row (two numbers of 2048 bits are fine).', 'b');
            var A = nt.abs(a), B = nt.abs(b), swap = A < B, x = swap ? B : A, y = swap ? A : B;
            var nx = swap ? '|b|' : '|a|', ny = swap ? '|a|' : '|b|';
            if (a >= 0n && b >= 0n) { nx = swap ? 'b' : 'a'; ny = swap ? 'a' : 'b'; }

            /* 0. preparation */
            if (swap || a < 0n || b < 0n) {
                var s0 = S.step('Prepare');
                var said = [];
                if (a < 0n || b < 0n) said.push('The gcd does not depend on signs, so work with $|a| = ' + T(A) + '$ and $|b| = ' + T(B) + '$; the signs go back into $s$ and $t$ at the end.');
                if (swap) said.push('Put the larger number first: $x = ' + T(x) + '$ and $y = ' + T(y) + '$ (otherwise the first division only swaps them).');
                s0.list(said);
            }

            /* 1. Euclid's divisions */
            var rows = nt.euclidRows(x, y), m = rows.length;
            var s1 = S.step('Euclid\'s algorithm on $' + T(x) + '$ and $' + T(y) + '$');
            var g;
            if (m === 0) {
                g = x;
                s1.p('The second number is 0, and every number divides 0, so $\\gcd = ' + T(x) + '$ right away.');
            } else {
                g = rows[m - 1].b;
                s1.p('Divide, then divide the divisor by the remainder, until the remainder is 0. The last non-zero remainder is the gcd.');
                s1.table(['$r_{i-1}$', '$=$', '$q_i$', '$\\cdot\\ r_i$', '$+\\ r_{i+1}$'], rows.map(function (r, k) {
                    return ['$' + T(r.a) + '$', '$=$', '$' + T(r.q) + '$', '$\\cdot\\ ' + T(r.b) + '$', { v: '$+\\ ' + T(r.r) + '$', hl: k === m - 2 }];
                }), { hl: m - 1 });
                s1.p('So $\\gcd(' + T(A) + ', ' + T(B) + ') = ' + T(g) + '$.');
            }

            /* 2. the table */
            var s2 = S.step('The extended table');
            s2.p('Run the same divisions with two more columns. Every row satisfies $r_i = s_i \\cdot ' + nx + ' + t_i \\cdot ' + ny + '$: the first two rows are $' + nx + ' = 1 \\cdot ' + nx + ' + 0 \\cdot ' + ny + '$ and $' + ny + ' = 0 \\cdot ' + nx + ' + 1 \\cdot ' + ny + '$, and each new row is the row two above minus $q_i$ times the row above, in every column.');
            var e = M.egcdTable(s2, x, y, nx, ny), sx = e.s, ty = e.t;
            s2.p('The highlighted row (the last non-zero remainder) gives $' + T(g) + ' = ' + M.term(sx, T(x), true) + M.term(ty, T(y)) + '$.');

            /* 3. back-substitution */
            var s3 = S.step('The same by back-substitution');
            var X, Y;
            if (m === 0) { X = 1n; Y = 0n; s3.p('There is no division to undo: $' + T(g) + ' = 1 \\cdot ' + T(x) + ' + 0 \\cdot 0$.'); }
            else if (m === 1) { X = 0n; Y = 1n; s3.p('The first division already has remainder 0, so the gcd is $y$ itself: $' + T(g) + ' = 0 \\cdot ' + T(x) + ' + 1 \\cdot ' + T(y) + '$.'); }
            else if (m > 41) {
                X = sx; Y = ty;
                s3.p('With ' + m + ' divisions this would be ' + 2 * (m - 2) + ' lines, so it is not written out; it gives exactly the coefficients of the table, which computes the same products of quotients in the other order.');
            } else {
                s3.p('Start from the division that gave the gcd, written as "gcd equals dividend minus quotient times divisor". Then replace the smaller number by its own division (remainder = dividend minus quotient times divisor), one line up at a time, and collect terms, until only $' + T(x) + '$ and $' + T(y) + '$ are left.');
                var j = m - 2, lines = [];
                X = 1n; Y = -rows[j].q;
                lines.push(T(g) + ' &= ' + T(rows[j].a) + ' - ' + T(rows[j].q) + ' \\cdot ' + T(rows[j].b));
                while (j > 0) {
                    var up = rows[j - 1];
                    lines.push('&= ' + M.term(X, T(rows[j].a), true) + M.term(Y, '(' + T(up.a) + ' - ' + T(up.q) + ' \\cdot ' + T(up.b) + ')'));
                    var nX = Y, nY = X - Y * up.q;
                    X = nX; Y = nY; j--;
                    lines.push('&= ' + M.term(X, T(up.a), true) + M.term(Y, T(up.b)));
                }
                s3.lines(lines);
                s3.check(X === sx && Y === ty, 'The same coefficients as the table: $' + T(X) + '$ and $' + T(Y) + '$');
            }

            /* 4. signs and order back */
            var sA = swap ? ty : sx, tB = swap ? sx : ty;
            var s = a < 0n ? -sA : sA, t = b < 0n ? -tB : tB;
            if (swap || a < 0n || b < 0n) {
                var s4 = S.step('Back to $a$ and $b$');
                var why = [];
                if (swap) why.push('The coefficient of $' + T(x) + '$ belongs to $b$ and the one of $' + T(y) + '$ to $a$: $' + T(g) + ' = ' + M.term(sA, T(A), true) + M.term(tB, T(B)) + '$.');
                if (a < 0n) why.push('$a$ is negative, and $s \\cdot a = (-s) \\cdot |a|$, so flip the sign: $s = ' + T(s) + '$.');
                if (b < 0n) why.push('$b$ is negative, so flip the sign of its coefficient: $t = ' + T(t) + '$.');
                s4.list(why);
            }

            /* 5. check */
            var s5 = S.step('Check');
            s5.math(P(s) + ' \\cdot ' + P(a) + ' + ' + P(t) + ' \\cdot ' + P(b) + ' = ' + T(s * a) + (t * b < 0n ? ' - ' + T(-t * b) : ' + ' + T(t * b)) + ' = ' + T(s * a + t * b));
            s5.check(s * a + t * b === g, 'This is $\\gcd(' + T(a) + ', ' + T(b) + ') = ' + T(g) + '$');

            S.result(['$\\gcd(' + T(a) + ', ' + T(b) + ') = ' + T(g) + '$', '$s = ' + T(s) + ', \\quad t = ' + T(t) + '$', '$' + P(s) + ' \\cdot ' + P(a) + ' + ' + P(t) + ' \\cdot ' + P(b) + ' = ' + T(g) + '$'], { copy: 'gcd = ' + g + '\ns = ' + s + '\nt = ' + t });

            /* 6. every solution, and what it is used for */
            var s6 = S.step('Other coefficients');
            var bg = b / g, ag = a / g;
            s6.p('Bézout coefficients are not unique. Adding $b / g$ to $s$ and subtracting $a / g$ from $t$ keeps the sum the same, and this gives all of them:');
            var kt = function (base, c) {
                if (c === 0n) return T(base);
                var m1 = c === 1n || c === -1n ? '' : T(nt.abs(c));
                return T(base) + (c < 0n ? ' - ' : ' + ') + m1 + 'k';
            };
            s6.math('s_k = ' + kt(s, bg) + ', \\qquad t_k = ' + kt(t, -ag) + ', \\qquad k \\in \\mathbb{Z}');
            if (g === 1n) {
                var notes = [];
                if (B > 1n) notes.push('Modulo $' + T(B) + '$ the identity reads $' + P(s) + ' \\cdot ' + P(a) + ' \\equiv 1$, so $a^{-1} \\equiv ' + T(nt.mod(s, B)) + ' \\pmod{' + T(B) + '}$.');
                if (A > 1n) notes.push('Modulo $' + T(A) + '$ it reads $' + P(t) + ' \\cdot ' + P(b) + ' \\equiv 1$, so $b^{-1} \\equiv ' + T(nt.mod(t, A)) + ' \\pmod{' + T(A) + '}$.');
                if (notes.length) { s6.p('The gcd is 1, so the coefficients are modular inverses:'); s6.list(notes); }
            }
        }
    });
})();
