/* Toolbox: Euclidean division a = q·b + r: long division written out for small numbers, the signs fixed afterwards,
   and the four conventions for the remainder (Euclidean, floored, truncated, nearest). */
(function () {
    'use strict';
    var CONV = {
        euclid: { name: 'Euclidean', rule: '$0 \\le r < |b|$' },
        floor: { name: 'Floored', rule: '$r$ has the sign of $b$ (or is 0), $|r| < |b|$' },
        trunc: { name: 'Truncated', rule: '$r$ has the sign of $a$ (or is 0), $|r| < |b|$' },
        round: { name: 'Nearest', rule: '$-|b|/2 < r \\le |b|/2$' }
    };
    function abs(n) { return n < 0n ? -n : n; }
    /* quotient and remainder of a by b (b != 0) in a convention */
    function qr(a, b, conv) {
        var m = abs(b), q, r;
        if (conv === 'trunc') { q = a / b; return { q: q, r: a - q * b }; }
        if (conv === 'floor') { q = a / b; if (a % b !== 0n && ((a < 0n) !== (b < 0n))) q -= 1n; return { q: q, r: a - q * b }; }
        r = a % m;
        if (r < 0n) r += m;
        if (conv === 'round' && 2n * r > m) r -= m;
        return { q: (a - r) / b, r: r };
    }
    function inRange(r, a, b, conv) {
        var m = abs(b);
        if (conv === 'euclid') return r >= 0n && r < m;
        if (conv === 'round') return -m < 2n * r && 2n * r <= m;
        if (abs(r) >= m) return false;
        if (r === 0n) return true;
        return conv === 'trunc' ? (r < 0n) === (a < 0n) : (r < 0n) === (b < 0n);
    }
    /* schoolbook long division of A >= 0 by B > 0: rows {pos, cur, qd, prod, rem} and the quotient's digits */
    function longDivision(A, B) {
        var D = String(A), cur = 0n, rows = [], started = false, qs = '';
        for (var i = 0; i < D.length; i++) {
            cur = cur * 10n + BigInt(D.charAt(i));
            if (!started && cur < B && i < D.length - 1) continue;
            var qd = cur / B, prod = qd * B;
            rows.push({ pos: i, cur: cur, qd: qd, prod: prod, rem: cur - prod, first: !started });
            if (started || qd !== 0n) qs += String(qd);
            started = true;
            cur -= prod;
        }
        return { rows: rows, q: BigInt(qs || '0'), r: cur, D: D };
    }
    /* the written layout: 1234 : 7 = 176, then the subtractions under the digits */
    function layout(A, B, ld) {
        var D = ld.D, lines = [], R = ld.rows;
        function at(str, end) { var start = end - str.length + 1; return new Array(Math.max(0, start) + 1).join(' ') + str; }
        lines.push(' ' + D + ' : ' + B + ' = ' + ld.q + (ld.r ? '  remainder ' + ld.r : ''));
        for (var k = 0; k < R.length; k++) {
            var row = R[k], end = row.pos + 1, p = String(row.prod);
            if (k > 0) lines.push(at(String(R[k - 1].rem) + D.charAt(row.pos), end));
            lines.push(at('-' + p, end));
            lines.push(at(new Array(Math.max(p.length, String(row.cur).length) + 1).join('─'), end));
        }
        if (R.length) lines.push(at(String(R[R.length - 1].rem), R[R.length - 1].pos + 1));
        return lines.join('\n');
    }

    Calc.tool({
        id: 'euclidean-division',
        live: true,
        inputs: [
            { id: 'a', label: 'Dividend $a$', placeholder: '1234', help: 'Any whole number, also negative or huge, e.g. 2^64 + 1.' },
            { id: 'b', label: 'Divisor $b$', placeholder: '7' },
            { id: 'conv', type: 'select', label: 'Convention for the remainder', width: 'l', value: 'euclid', options: [
                ['euclid', 'Euclidean: 0 ≤ r < |b| (mathematics)'],
                ['floor', 'Floored: r has the sign of b (Python)'],
                ['trunc', 'Truncated: r has the sign of a (C, Java)'],
                ['round', 'Nearest: |r| at most |b|/2']
            ] }
        ],
        examples: [{ a: '1234', b: '7', conv: 'euclid' }, { a: '-17', b: '5', conv: 'euclid' }, { a: '17', b: '-5', conv: 'floor' }, { a: '-17', b: '5', conv: 'trunc' }, { a: '23', b: '7', conv: 'round' }, { a: '2^64', b: '1000003', conv: 'euclid' }],
        run: function (v, S) {
            var M = Calc.lib.modArith, T = Calc.tex, P = M.par, a = v.a, b = v.b, conv = v.conv;
            if (b === 0n) Calc.fail('The divisor cannot be 0: no number q gives q · 0 = a for a non-zero a, and for a = 0 every q does.', 'b');
            var A = abs(a), B = abs(b), res = qr(a, b, conv), q = res.q, r = res.r;
            var eq = T(a) + ' = ' + P(q) + ' \\cdot ' + P(b) + (r < 0n ? ' - ' + T(-r) : ' + ' + T(r));
            S.result(['$' + eq + '$', 'Quotient $q = ' + T(q) + '$, remainder $r = ' + T(r) + '$'], { copy: 'q = ' + q + '\nr = ' + r });
            if (conv === 'euclid') S.note('So $' + T(a) + ' \\bmod ' + T(B) + ' = ' + T(r) + '$ and $' + T(a) + ' \\equiv ' + T(r) + ' \\pmod{' + T(B) + '}$.');

            /* 1. divide the absolute values */
            var neg = a < 0n || b < 0n;
            var s1 = S.step(neg ? 'Divide the absolute values $' + T(A) + '$ and $' + T(B) + '$' : 'Divide $' + T(A) + '$ by $' + T(B) + '$');
            if (neg) s1.p('Signs are easier to handle at the end, so first divide $|a| = ' + T(A) + '$ by $|b| = ' + T(B) + '$.');
            var Q, R;
            if (A < 10n ** 30n && B < 10n ** 12n && A >= B) {
                var ld = longDivision(A, B);
                Q = ld.q; R = ld.r;
                s1.p('Long division: go through the digits of $' + T(A) + '$ from the left. Bring down the next digit, see how many times $' + T(B) + '$ fits into the number so far (that is the next digit of the quotient), and subtract.');
                s1.table(['Number so far', 'How often $' + T(B) + '$ fits', 'Subtract', 'Left over'], ld.rows.map(function (x, k) {
                    var how = x.first && x.pos > 0 && x.pos < ld.D.length - 1 ? ' (first ' + (x.pos + 1) + ' digits)' : (k > 0 ? ' (bring down ' + ld.D.charAt(x.pos) + ')' : '');
                    return ['$' + T(x.cur) + '$' + how, '$' + T(x.qd) + '$', '$' + T(x.qd) + ' \\cdot ' + T(B) + ' = ' + T(x.prod) + '$', '$' + T(x.rem) + '$'];
                }), { hl: ld.rows.length - 1 });
                s1.pre(layout(A, B, ld));
                s1.p('The quotient digits read from top to bottom give $' + T(Q) + '$; what is left at the end, $' + T(R) + '$, is the remainder.');
            } else {
                Q = A / B; R = A - Q * B;
                if (A < B) s1.p('$' + T(A) + '$ is smaller than $' + T(B) + '$, so $' + T(B) + '$ fits $0$ times and all of $' + T(A) + '$ is left over.');
                else {
                    s1.p('The quotient is the whole part of $' + T(A) + ' / ' + T(B) + '$, and the remainder is what the multiple of $' + T(B) + '$ leaves:');
                    s1.lines(['Q &= \\left\\lfloor \\frac{' + T(A) + '}{' + T(B) + '} \\right\\rfloor = ' + T(Q), 'R &= ' + T(A) + ' - ' + T(Q) + ' \\cdot ' + T(B) + ' = ' + T(R)]);
                }
            }
            s1.math(T(A) + ' = ' + T(Q) + ' \\cdot ' + T(B) + ' + ' + T(R) + ', \\qquad 0 \\le ' + T(R) + ' < ' + T(B));

            /* 2. put the signs back, then move into the range of the convention */
            var qt = (a < 0n) !== (b < 0n) ? -Q : Q, rt = a < 0n ? -R : R;
            var s2 = S.step('Signs and the convention: ' + CONV[conv].name);
            if (neg) {
                s2.p('Put the signs back' + (a < 0n ? ': multiplying by $-1$ makes both the quotient and the remainder negative' : '') + (b < 0n ? (a < 0n ? ', and ' : ': ') + 'dividing by a negative $b$ flips the sign of the quotient' : '') + '. This is the truncated division (the quotient rounded toward zero):');
                s2.math(T(a) + ' = ' + P(qt) + ' \\cdot ' + P(b) + (rt < 0n ? ' - ' + T(-rt) : ' + ' + T(rt)));
            }
            s2.p('The ' + CONV[conv].name + ' convention asks for ' + CONV[conv].rule + '.');
            if (qt === q) s2.check(true, 'The remainder $' + T(rt) + '$ already satisfies it.');
            else {
                var d = q - qt;   // +1 or -1
                s2.p('The remainder $' + T(rt) + '$ does not, so move one copy of $b$ between the two parts: ' + (d * b > 0n ? 'take $' + T(abs(b)) + '$ from the remainder' : 'add $' + T(abs(b)) + '$ to the remainder') + ' and change the quotient by $' + T(d) + '$.');
                s2.lines([T(a) + ' &= ' + P(qt) + ' \\cdot ' + P(b) + (rt < 0n ? ' - ' + T(-rt) : ' + ' + T(rt)),
                    '&= (' + T(qt) + (d < 0n ? ' - 1' : ' + 1') + ') \\cdot ' + P(b) + ' + (' + T(rt) + (d * b < 0n ? ' + ' : ' - ') + T(abs(b)) + ')',
                    '&= ' + P(q) + ' \\cdot ' + P(b) + (r < 0n ? ' - ' + T(-r) : ' + ' + T(r))]);
            }

            /* 3. check */
            var s3 = S.step('Check');
            s3.math(P(q) + ' \\cdot ' + P(b) + (r < 0n ? ' - ' + T(-r) : ' + ' + T(r)) + ' = ' + T(q * b) + (r < 0n ? ' - ' + T(-r) : ' + ' + T(r)) + ' = ' + T(q * b + r));
            s3.check(q * b + r === a, 'Quotient times divisor plus remainder gives back $a = ' + T(a) + '$');
            s3.check(inRange(r, a, b, conv), 'The remainder satisfies ' + CONV[conv].rule);

            /* 4. the conventions side by side */
            var rows = ['euclid', 'floor', 'trunc', 'round'].map(function (c) {
                var x = qr(a, b, c);
                return [CONV[c].name + ': ' + CONV[c].rule, { v: '$' + T(x.q) + '$', hl: c === conv }, { v: '$' + T(x.r) + '$', hl: c === conv }];
            });
            var same = rows.every(function (x) { return x[2].v === rows[0][2].v; });
            S.step('All four conventions').p(same
                ? 'Here every convention gives the same answer. They differ only when a sign is negative or the remainder is more than half of $|b|$.'
                : 'The conventions differ in how the quotient is rounded, so the remainder changes too:')
                .table(['Convention', 'Quotient $q$', 'Remainder $r$'], rows);
            if (A >= B && (A >= 10n ** 30n || B >= 10n ** 12n)) S.note('For numbers this long the digit by digit division is not drawn; the steps use the quotient directly.');
        }
    });
})();
