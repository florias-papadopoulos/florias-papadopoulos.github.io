/* Toolbox: polynomial long division over Q. Each round (divide the leading terms, multiply back, subtract), the
   classic layout as a table with one column per power, synthetic division (Horner) when the divisor is x - c, and
   the check q*d + r = p. Exact fractions from Calc.lib.gmath. */
Calc.tool({
    id: 'polynomial-division',
    live: true,
    inputs: [
        { id: 'p', type: 'text', width: 'l', label: 'Dividend $p(x)$', placeholder: 'x^3 - 2x^2 - 4', maxLength: 600, help: 'Like 2x^3 - x + 1/2 or 3/4 x^2; or the coefficients from the highest power, separated by commas: 2, 0, -1, 1/2.' },
        { id: 'd', type: 'text', width: 'l', label: 'Divisor $d(x)$', placeholder: 'x - 3', maxLength: 300 }
    ],
    examples: [
        { p: 'x^3 - 2x^2 - 4', d: 'x - 3' },
        { p: '2x^4 + 3x^3 - x + 5', d: 'x^2 - x + 1' },
        { p: 'x^5 - 1', d: 'x - 1' },
        { p: '6x^3 + 5x^2 - 2', d: '2x + 3' },
        { p: '1, 0, 0, 0, 1', d: '1, 0, 1' }
    ],
    run: function (v, S) {
        var gm = Calc.lib.gmath, T = Calc.tex, Q = gm.Q, MAXDEG = 40, X = null;
        /* parse into an array of coefficients, index = power */
        function parse(src, field) {
            var s = String(src).replace(/[\u2212\u2013\u2014]/g, '-').replace(/[×·⋅]/g, '*').replace(/\*\*/g, '^').replace(/²/g, '^2').replace(/³/g, '^3').trim();
            if (!s) Calc.fail('Please type a polynomial.', field);
            var c = [];
            function add(pw, q) { if (pw > MAXDEG) Calc.fail('Degrees up to ' + MAXDEG + ', please.', field); while (c.length <= pw) c.push(Q(0n)); c[pw] = gm.add(c[pw], q); }
            if (!/[a-z]/i.test(s) && /,/.test(s)) {
                var parts = s.split(',').map(function (t) { return t.trim(); });
                if (parts.length > MAXDEG + 1) Calc.fail('Degrees up to ' + MAXDEG + ', please.', field);
                parts.forEach(function (t, i) {
                    var q = gm.parseQ(t);
                    if (!q) Calc.fail('"' + t + '" is not a number.', field);
                    add(parts.length - 1 - i, q);
                });
            } else {
                s = s.replace(/\s+/g, '');
                var re = /^([+-]?)((?:\d+(?:\.\d*)?|\.\d+)(?:\/\d+)?)?\*?(?:([a-z])(?:\^(\d+))?)?/i, pos = 0, first = true;
                while (pos < s.length) {
                    var m = re.exec(s.slice(pos));
                    if (!m || (!m[2] && !m[3])) Calc.fail('Cannot read "' + s.slice(pos) + '". Write terms like 3x^2, -1/2x or 7.', field);
                    if (!first && !m[1]) Calc.fail('Expected + or - before "' + s.slice(pos) + '".', field);
                    var q = m[2] ? gm.parseQ(m[2]) : Q(1n);
                    if (m[1] === '-') q = gm.neg(q);
                    if (m[3]) {
                        if (X && m[3] !== X) Calc.fail('Use one variable only (found ' + X + ' and ' + m[3] + ').', field);
                        X = m[3];
                    } else if (m[4]) Calc.fail('A power needs a variable.', field);
                    add(m[3] ? (m[4] ? Number(m[4]) : 1) : 0, q);
                    pos += m[0].length;
                    first = false;
                }
            }
            return trim(c);
        }
        function trim(c) { c = c.slice(); while (c.length > 1 && gm.isZero(c[c.length - 1])) c.pop(); if (!c.length) c.push(Q(0n)); return c; }
        function deg(c) { return c.length === 1 && gm.isZero(c[0]) ? -1 : c.length - 1; }
        var P = parse(v.p, 'p'), D = parse(v.d, 'd');
        X = X || 'x';
        if (deg(D) < 0) Calc.fail('The divisor cannot be the zero polynomial.', 'd');
        [P, D].forEach(function (c, i) { c.forEach(function (q) { if (String(q.n).length > 30 || String(q.d).length > 30) Calc.fail('Coefficients of at most 30 digits, please.', i ? 'd' : 'p'); }); });
        /* a monomial and a polynomial in TeX (and plain) */
        function mono(q, pw, lead) {
            var neg = q.n < 0n, a = neg ? gm.neg(q) : q, one = a.n === 1n && a.d === 1n;
            var body = (one && pw > 0 ? '' : gm.qtex(a)) + (pw > 0 ? X + (pw > 1 ? '^{' + pw + '}' : '') : '');
            return lead ? (neg ? '-' : '') + body : (neg ? ' - ' : ' + ') + body;
        }
        function ptex(c) {
            var out = '';
            for (var pw = c.length - 1; pw >= 0; pw--) if (!gm.isZero(c[pw])) out += mono(c[pw], pw, !out);
            return out || '0';
        }
        function pstr(c) {
            var out = '';
            for (var pw = c.length - 1; pw >= 0; pw--) {
                var q = c[pw];
                if (gm.isZero(q)) continue;
                var neg = q.n < 0n, a = neg ? gm.neg(q) : q, one = a.n === 1n && a.d === 1n;
                var co = one && pw > 0 ? '' : (a.d !== 1n && pw > 0 ? '(' + gm.qstr(a) + ')' : gm.qstr(a));
                var t = co + (pw > 0 ? X + (pw > 1 ? '^' + pw : '') : '');
                out += out ? (neg ? ' - ' : ' + ') + t : (neg ? '-' : '') + t;
            }
            return out || '0';
        }
        function sub(a, b) { var r = [], n = Math.max(a.length, b.length); for (var i = 0; i < n; i++) r.push(gm.sub(a[i] || Q(0n), b[i] || Q(0n))); return trim(r); }
        function addp(a, b) { var r = [], n = Math.max(a.length, b.length); for (var i = 0; i < n; i++) r.push(gm.add(a[i] || Q(0n), b[i] || Q(0n))); return trim(r); }
        function mulp(a, b) { var r = []; for (var i = 0; i < a.length + b.length - 1; i++) r.push(Q(0n)); a.forEach(function (x, i) { b.forEach(function (y, j) { r[i + j] = gm.add(r[i + j], gm.mul(x, y)); }); }); return trim(r); }
        function shift(q, pw) { var r = []; for (var i = 0; i < pw; i++) r.push(Q(0n)); r.push(q); return r; }
        var px = 'p(' + X + ')', dx = 'd(' + X + ')', qx = 'q(' + X + ')', rx = 'r(' + X + ')';

        var dp = deg(P), dd = deg(D), quo = [Q(0n)], rem = P, rounds = [];
        S.step('Set up').p('Divide $' + px + ' = ' + ptex(P) + '$ by $' + dx + ' = ' + ptex(D) + '$. Write both from the highest power down' + (dp > 0 && P.some(function (q) { return gm.isZero(q); }) ? ', with 0 for the missing powers so that the columns line up' : '') + '. Each round divides the leading terms, multiplies the divisor by the result and subtracts; it stops when the remainder has a smaller degree than the divisor (' + dd + ').');
        while (deg(rem) >= dd) {
            var lr = rem[rem.length - 1], ld = D[D.length - 1], pw = deg(rem) - dd, t = gm.div(lr, ld);
            var term = shift(t, pw), prod = mulp(term, D), next = sub(rem, prod);
            /* the subtraction cancels the leading term exactly; keep the degree going down */
            rounds.push({ rem: rem, t: t, pw: pw, prod: prod, next: next });
            quo = addp(quo, term);
            rem = next;
            if (rounds.length > MAXDEG + 2) break;
        }
        rounds.forEach(function (r, i) {
            var s = S.step('Round ' + (i + 1) + ': the ' + (r.pw > 1 ? '$' + X + '^{' + r.pw + '}$' : r.pw === 1 ? '$' + X + '$' : 'constant') + ' term of the quotient');
            var lt = mono(r.rem[r.rem.length - 1], deg(r.rem), true), ldt = mono(D[D.length - 1], dd, true), tt = mono(r.t, r.pw, true);
            s.lines([
                '\\text{divide:} \\quad & \\frac{' + lt + '}{' + ldt + '} = ' + tt,
                '\\text{multiply:} \\quad & ' + (deg(D) > 0 && D.filter(function (q) { return !gm.isZero(q); }).length > 1 ? tt + ' \\cdot \\left(' + ptex(D) + '\\right)' : tt + ' \\cdot ' + ptex(D)) + ' = ' + ptex(r.prod),
                '\\text{subtract:} \\quad & \\left(' + ptex(r.rem) + '\\right) - \\left(' + ptex(r.prod) + '\\right) = ' + ptex(r.next)
            ]);
        });
        if (!rounds.length) S.step('Nothing to divide').p('The dividend has degree ' + (dp < 0 ? '$-\\infty$ (it is 0)' : dp) + ', smaller than the divisor\'s ' + dd + ', so the quotient is 0 and the remainder is the dividend itself.');

        /* the layout: one column per power */
        if (rounds.length && dp <= 12) {
            var colHead = function (c) { return '$' + (c > 1 ? X + '^{' + c + '}' : c === 1 ? X : '1') + '$'; };
            var head = [''], rows = [], c;
            for (c = dp; c >= 0; c--) head.push(colHead(c));
            var rowOf = function (poly, from, to, label) {
                var cells = [label];
                for (var cc = dp; cc >= 0; cc--) cells.push(cc > from || cc < to ? '' : '$' + mono(poly[cc] || Q(0n), cc, cc === from) + '$');
                return cells;
            };
            var qrow = ['Quotient'];
            for (c = dp; c >= 0; c--) qrow.push(c <= deg(quo) && !gm.isZero(quo[c]) ? { v: '$' + mono(quo[c], c, c === deg(quo)) + '$', hl: true } : '');
            rows.push(qrow);
            rows.push(rowOf(P, dp, 0, '$' + px + '$'));
            rounds.forEach(function (r, i) {
                var top = deg(r.rem);
                rows.push(rowOf(r.prod, top, top - dd, '$-\\,' + mono(r.t, r.pw, true) + ' \\cdot d$'));
                rows.push(rowOf(r.next, Math.max(top - 1, 0), 0, i === rounds.length - 1 ? 'Remainder' : 'Left'));
            });
            S.step('The long division layout').p('The same rounds as on paper, one column per power of $' + X + '$: the quotient on top, the dividend, and under it each product to subtract and what is left.').table(head, rows, { mono: true, max: 60 });
        }

        /* synthetic division when the divisor is x - c */
        if (dd === 1 && D[1].n === 1n && D[1].d === 1n) {
            var cval = gm.neg(D[0]), coef = [], sums = [], prods = [''], acc = Q(0n);
            for (var k = dp; k >= 0; k--) coef.push(P[k] || Q(0n));
            coef.forEach(function (a, i) {
                if (i > 0) { var pr = gm.mul(acc, cval); prods.push('$' + gm.qtex(pr) + '$'); acc = gm.add(a, pr); } else acc = a;
                sums.push(i === coef.length - 1 ? { v: '$' + gm.qtex(acc) + '$', hl: true } : '$' + gm.qtex(acc) + '$');
            });
            if (dp >= 1) {
                var sy = S.step('Shortcut: synthetic division by $' + X + ' - ' + gm.qtexp(cval) + '$');
                sy.p('For a divisor $' + X + ' - c$ (here $c = ' + gm.qtex(cval) + '$), Horner\'s scheme does the same work on the coefficients alone: bring down the first one, then repeatedly multiply by $c$, write the product under the next coefficient and add.');
                sy.table(['$c = ' + gm.qtex(cval) + '$'].concat(coef.map(function (_, i) { var pw3 = dp - i; return '$' + (pw3 > 1 ? X + '^{' + pw3 + '}' : pw3 === 1 ? X : '1') + '$'; })), [
                    ['Coefficients'].concat(coef.map(function (a) { return '$' + gm.qtex(a) + '$'; })),
                    ['$\\times c$'].concat(prods),
                    ['Sum'].concat(sums)
                ], { mono: true });
                sy.p('The sums are the coefficients of the quotient (one degree lower), and the last one is the remainder. It equals $p(c)$ (the remainder theorem):');
                var pc = Q(0n);
                for (var k2 = dp; k2 >= 0; k2--) pc = gm.add(gm.mul(pc, cval), P[k2] || Q(0n));
                sy.check(gm.eq(pc, rem[0] || Q(0n)), '$p(' + gm.qtex(cval) + ') = ' + gm.qtex(pc) + '$' + (gm.isZero(pc) ? ', so $' + gm.qtex(cval) + '$ is a root and $' + X + ' - ' + gm.qtexp(cval) + '$ divides $p$' : ''));
            }
        }

        /* the check */
        var back = addp(mulp(quo, D), rem);
        S.step('Check: $q \\cdot d + r = p$').math('\\left(' + ptex(quo) + '\\right) \\cdot \\left(' + ptex(D) + '\\right) + ' + (deg(rem) >= 0 && rem.some(function (q) { return q.n < 0n; }) ? '\\left(' + ptex(rem) + '\\right)' : ptex(rem)) + ' = ' + ptex(back))
            .check(back.length === P.length && back.every(function (q, i) { return gm.eq(q, P[i]); }), 'This is $' + px + '$ again, and $\\deg r < \\deg d$');
        S.result(['$' + qx + ' = ' + ptex(quo) + '$', '$' + rx + ' = ' + ptex(rem) + '$'], { copy: 'q = ' + pstr(quo) + '\nr = ' + pstr(rem) });
        S.note(deg(rem) < 0 ? 'The remainder is 0: $' + dx + '$ divides $' + px + '$ exactly, $' + px + ' = ' + (deg(quo) > 0 ? '\\left(' + ptex(quo) + '\\right)' : ptex(quo)) + ' \\cdot \\left(' + ptex(D) + '\\right)$.' : 'So $\\dfrac{' + px + '}{' + dx + '} = ' + qx + ' + \\dfrac{' + rx + '}{' + dx + '}$.');
    }
});
