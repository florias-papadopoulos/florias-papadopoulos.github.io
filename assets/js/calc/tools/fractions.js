/* Toolbox: fraction calculator. Expressions with fractions, mixed numbers and decimals (+ - * / ^ and brackets),
   one step per operation with the common denominator and the simplification by the gcd, then the mixed number and
   the decimal expansion with its repeating part found by long division. Exact (Calc.lib.gmath fractions). */
Calc.tool({
    id: 'fractions',
    live: true,
    inputs: [
        { id: 'expr', type: 'text', width: 'full', label: 'Expression', placeholder: '1/2 + 3/4 - 2 1/3', maxLength: 500,
            help: 'Fractions like 3/4, mixed numbers like 2 1/3 (a space between), decimals like 0.25, operators + - * / ^ and brackets.' }
    ],
    examples: [{ expr: '1/2 + 3/4' }, { expr: '2 1/3 - 5/6' }, { expr: '(3/4) / (9/8) * 5' }, { expr: '1/7' }, { expr: '(2/3)^3 + 0.125' }, { expr: '5/12 + 7/18 - 1/4' }],
    run: function (v, S) {
        var gm = Calc.lib.gmath, T = Calc.tex, Q = gm.Q;
        var src = String(v.expr).replace(/[\u2212\u2013\u2014]/g, '-').replace(/[×·⋅]/g, '*').replace(/÷/g, ':').replace(/\*\*/g, '^');
        var i = 0, literals = [];
        function ws() { while (i < src.length && /\s/.test(src.charAt(i))) i++; }
        function peek() { ws(); return src.charAt(i); }
        function err(msg) { Calc.fail(msg, 'expr'); }
        function big(q) { if (String(q.n).length > 3000 || String(q.d).length > 3000) err('The numbers grow beyond 3000 digits; please use a smaller expression.'); return q; }
        function digits(s) { if (s.length > 60) err('Numbers of at most 60 digits, please.'); return BigInt(s); }
        /* the parser builds a tree: {t: 'num', q, tex} or {t: op, a, b} */
        function primary() {
            var c = peek();
            if (c === '(') { i++; var e = expr(); if (peek() !== ')') err('A closing bracket ")" is missing.'); i++; return { t: '()', a: e }; }
            var rest = src.slice(i), m;
            if ((m = /^(\d+)\s+(\d+)\/(\d+)(?![\d.])/.exec(rest))) {
                var w = digits(m[1]), a = digits(m[2]), b = digits(m[3]);
                if (b === 0n) err('A fraction with denominator 0 is not defined.');
                i += m[0].length;
                var node = { t: 'num', q: Q(w * b + a, b), tex: T(w) + '\\tfrac{' + T(a) + '}{' + T(b) + '}', kind: 'mixed', w: w, a: a, b: b };
                literals.push(node);
                return node;
            }
            if ((m = /^(\d+)\/(\d+)(?![\d.])/.exec(rest))) {
                var n1 = digits(m[1]), d1 = digits(m[2]);
                if (d1 === 0n) err('A fraction with denominator 0 is not defined.');
                i += m[0].length;
                var f = { t: 'num', q: Q(n1, d1), tex: '\\frac{' + T(n1) + '}{' + T(d1) + '}', kind: 'frac', a: n1, b: d1 };
                literals.push(f);
                return f;
            }
            if ((m = /^(\d*\.\d+|\d+\.)/.exec(rest))) {
                i += m[0].length;
                var parts = m[0].split('.'), dd = parts[1] || '';
                if (dd.length > 60) err('Decimals with at most 60 digits, please.');
                var dn = { t: 'num', q: Q(BigInt((parts[0] || '0') + dd), 10n ** BigInt(dd.length)), tex: m[0], kind: 'dec', raw: m[0], digits: dd.length };
                literals.push(dn);
                return dn;
            }
            if ((m = /^\d+/.exec(rest))) { i += m[0].length; var k = digits(m[0]); return { t: 'num', q: Q(k), tex: T(k), kind: 'int' }; }
            if (i >= src.length) err('The expression ends too early.');
            err('Unexpected "' + src.charAt(i) + '" at position ' + (i + 1) + '.');
        }
        function power() {
            var b = primary();
            if (peek() === '^') { i++; return { t: '^', a: b, b: unary() }; }
            return b;
        }
        function unary() {
            var c = peek();
            if (c === '-') { i++; return { t: 'neg', a: unary() }; }
            if (c === '+') { i++; return unary(); }
            return power();
        }
        function term() {
            var a = unary();
            for (;;) {
                var c = peek();
                if (c === '*' || c === '/' || c === ':') { i++; a = { t: c === '*' ? '*' : '/', a: a, b: unary() }; } else return a;
            }
        }
        function expr() {
            var a = term();
            for (;;) {
                var c = peek();
                if (c === '+' || c === '-') { i++; a = { t: c, a: a, b: term() }; } else return a;
            }
        }
        if (!src.trim()) err('Please type an expression.');
        var tree = expr();
        if (peek() !== '') err('Unexpected "' + src.charAt(i) + '" at position ' + (i + 1) + '.');

        /* TeX of the expression as typed */
        var PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4, num: 5, '()': 5 };
        function tex(n) {
            switch (n.t) {
                case 'num': return n.tex;
                case '()': return '\\left(' + tex(n.a) + '\\right)';
                case 'neg': return '-' + (PREC[n.a.t] < 3 ? '\\left(' + tex(n.a) + '\\right)' : tex(n.a));
                case '^': return (PREC[n.a.t] < 5 || n.a.kind === 'frac' || n.a.kind === 'mixed' ? '\\left(' + tex(n.a) + '\\right)' : tex(n.a)) + '^{' + tex(n.b) + '}';
                default: return tex(n.a) + { '+': ' + ', '-': ' - ', '*': ' \\cdot ', '/': ' \\div ' }[n.t] + tex(n.b);
            }
        }
        var F = gm.qtex, Fp = gm.qtexp;
        /* a fraction with a signed numerator (for intermediate lines): \frac{-3}{4} */
        function sf(n, d) { return d === 1n ? T(n) : '\\frac{' + T(n) + '}{' + T(d) + '}'; }
        function simplify(s, n, d) {
            var g = gm.gcd(n, d);
            if (g > 1n && d !== 0n) {
                s.p('Simplify: $\\gcd(' + T(gm.abs(n)) + ', ' + T(d) + ') = ' + T(g) + '$, so divide the numerator and the denominator by $' + T(g) + '$:');
                s.math(sf(n, d) + ' = \\frac{' + T(n) + ' \\div ' + T(g) + '}{' + T(d) + ' \\div ' + T(g) + '} = ' + F(Q(n, d)));
            }
            return big(Q(n, d));
        }
        var ops = 0;
        function multiply(s, x, y, lead) {
            var g1 = gm.gcd(x.n, y.d), g2 = gm.gcd(y.n, x.d);
            if (x.d === 1n && y.d === 1n) { s.math(lead + ' = ' + F(gm.mul(x, y))); return big(gm.mul(x, y)); }
            s.p('Multiply the numerators together and the denominators together.' + (g1 > 1n || g2 > 1n ? ' Cancel common factors across first, which keeps the numbers small:' : ''));
            var xn = x.n, xd = x.d, yn = y.n, yd = y.d, rows = [];
            if (g1 > 1n || g2 > 1n) {
                var cancel = [];
                if (g1 > 1n) cancel.push('$' + T(gm.abs(x.n)) + '$ and $' + T(y.d) + '$ share $' + T(g1) + '$');
                if (g2 > 1n) cancel.push('$' + T(gm.abs(y.n)) + '$ and $' + T(x.d) + '$ share $' + T(g2) + '$');
                s.list(cancel);
                xn /= g1; yd /= g1; yn /= g2; xd /= g2;
                rows.push(lead + ' &= ' + sf(xn, xd) + ' \\cdot ' + (yn < 0n ? '\\left(' + sf(yn, yd) + '\\right)' : sf(yn, yd)));
                rows.push('&= \\frac{' + T(xn) + ' \\cdot ' + (yn < 0n ? '(' + T(yn) + ')' : T(yn)) + '}{' + T(xd) + ' \\cdot ' + T(yd) + '} = ' + F(Q(xn * yn, xd * yd)));
                s.lines(rows);
                return big(Q(xn * yn, xd * yd));
            }
            s.math(lead + ' = \\frac{' + T(xn) + ' \\cdot ' + (yn < 0n ? '(' + T(yn) + ')' : T(yn)) + '}{' + T(xd) + ' \\cdot ' + T(yd) + '} = ' + sf(xn * yn, xd * yd));
            return simplify(s, xn * yn, xd * yd);
        }
        function ev(n) {
            if (n.t === 'num') return n.q;
            if (n.t === '()') return ev(n.a);
            if (n.t === 'neg') return gm.neg(ev(n.a));
            var x = ev(n.a), y = ev(n.b), s;
            if (++ops > 60) err('At most 60 operations, please.');
            if (n.t === '+' || n.t === '-') {
                var plus = n.t === '+', sym = plus ? ' + ' : ' - ';
                s = S.step((plus ? 'Add' : 'Subtract') + ' $' + F(x) + sym + Fp(y) + '$');
                if (x.d === 1n && y.d === 1n) { s.math(F(x) + sym + Fp(y) + ' = ' + F(plus ? gm.add(x, y) : gm.sub(x, y))); return plus ? gm.add(x, y) : gm.sub(x, y); }
                var L = gm.lcm(x.d, y.d), num;
                if (x.d === y.d) {
                    s.p('The denominators are equal, so ' + (plus ? 'add' : 'subtract') + ' the numerators:');
                    num = plus ? x.n + y.n : x.n - y.n;
                    s.math(sf(x.n, x.d) + sym + (y.n < 0n ? '\\left(' + sf(y.n, y.d) + '\\right)' : sf(y.n, y.d)) + ' = \\frac{' + T(x.n) + sym + (y.n < 0n ? '(' + T(y.n) + ')' : T(y.n)) + '}{' + T(L) + '} = ' + sf(num, L));
                } else {
                    var kx = L / x.d, ky = L / y.d;
                    s.p('Bring both to a common denominator, the least common multiple of the denominators: $\\operatorname{lcm}(' + T(x.d) + ', ' + T(y.d) + ') = ' + T(L) + '$.');
                    var lines = [];
                    if (kx > 1n) lines.push(sf(x.n, x.d) + ' &= \\frac{' + T(x.n) + ' \\cdot ' + T(kx) + '}{' + T(x.d) + ' \\cdot ' + T(kx) + '} = ' + sf(x.n * kx, L));
                    if (ky > 1n) lines.push(sf(y.n, y.d) + ' &= \\frac{' + T(y.n) + ' \\cdot ' + T(ky) + '}{' + T(y.d) + ' \\cdot ' + T(ky) + '} = ' + sf(y.n * ky, L));
                    s.lines(lines);
                    num = plus ? x.n * kx + y.n * ky : x.n * kx - y.n * ky;
                    s.p('Now ' + (plus ? 'add' : 'subtract') + ' the numerators:');
                    s.math(sf(x.n * kx, L) + sym + (y.n < 0n ? '\\left(' + sf(y.n * ky, L) + '\\right)' : sf(y.n * ky, L)) + ' = \\frac{' + T(x.n * kx) + sym + (y.n < 0n ? '(' + T(y.n * ky) + ')' : T(y.n * ky)) + '}{' + T(L) + '} = ' + sf(num, L));
                }
                return simplify(s, num, L);
            }
            if (n.t === '*') {
                s = S.step('Multiply $' + F(x) + ' \\cdot ' + Fp(y) + '$');
                return multiply(s, x, y, Fp(x) + ' \\cdot ' + Fp(y));
            }
            if (n.t === '/') {
                s = S.step('Divide $' + F(x) + ' \\div ' + Fp(y) + '$');
                if (y.n === 0n) err('Division by zero: the expression divides by ' + gm.qstr(y) + '.');
                var rec = Q(y.d, y.n);
                s.p('Dividing by a fraction is multiplying by its reciprocal (numerator and denominator swapped):');
                s.math(Fp(x) + ' \\div ' + Fp(y) + ' = ' + Fp(x) + ' \\cdot ' + Fp(rec));
                return multiply(s, x, rec, Fp(x) + ' \\cdot ' + Fp(rec));
            }
            /* power: whole exponent */
            if (y.d !== 1n) err('Exponents must be whole numbers (' + gm.qstr(y) + ' is not).');
            if (gm.abs(y.n) > 1000n) err('Exponents up to 1000, please.');
            var e = y.n, base = x;
            function pb(q) { return q.d !== 1n || q.n < 0n ? '\\left(' + F(q) + '\\right)' : F(q); }
            s = S.step('Power $' + pb(x) + '^{' + T(e) + '}$');
            if (e < 0n) {
                if (x.n === 0n) err('0 has no negative powers.');
                base = Q(x.d, x.n);
                s.p('A negative exponent means the reciprocal: $x^{-k} = (1/x)^k$.');
                s.math(pb(x) + '^{' + T(e) + '} = ' + pb(base) + '^{' + T(-e) + '}');
                e = -e;
            }
            var r = big(gm.pow(base, e));
            if (base.d === 1n) s.math(pb(base) + '^{' + T(e) + '} = ' + F(r));
            else {
                s.p('Raise the numerator and the denominator to the power separately:');
                s.math(pb(base) + '^{' + T(e) + '} = \\frac{' + (base.n < 0n ? '(' + T(base.n) + ')' : T(base.n)) + '^{' + T(e) + '}}{' + T(base.d) + '^{' + T(e) + '}} = ' + F(r));
            }
            return r;
        }

        /* 0. the numbers as fractions */
        var conv = literals.filter(function (l) { return l.kind === 'mixed' || l.kind === 'dec' || (l.kind === 'frac' && (l.q.n !== l.a || l.q.d !== l.b)); });
        var whole = tex(tree);
        if (conv.length) {
            var s0 = S.step('Write every number as a fraction in lowest terms');
            conv.forEach(function (l) {
                if (l.kind === 'mixed') s0.math(l.tex + ' = \\frac{' + T(l.w) + ' \\cdot ' + T(l.b) + ' + ' + T(l.a) + '}{' + T(l.b) + '} = ' + sf(l.w * l.b + l.a, l.b) + (gm.gcd(l.w * l.b + l.a, l.b) > 1n ? ' = ' + F(l.q) : ''));
                else if (l.kind === 'dec') { var rd = 10n ** BigInt(l.digits); s0.math(l.raw + ' = ' + sf(BigInt(l.raw.replace('.', '') || '0'), rd) + (l.q.d !== rd ? ' = ' + F(l.q) : '')); }
                else { var g = gm.gcd(l.a, l.b); s0.math(l.tex + ' = \\frac{' + T(l.a) + ' \\div ' + T(g) + '}{' + T(l.b) + ' \\div ' + T(g) + '} = ' + F(l.q)); }
            });
            s0.p('A mixed number $w\\tfrac{a}{b}$ is $w + \\frac{a}{b} = \\frac{w b + a}{b}$; a decimal with $k$ digits after the point is a fraction over $10^k$.');
        }
        var val = ev(tree);
        if (!ops) {
            var s1 = S.step('The value');
            s1.math(whole === F(val) ? F(val) : whole + ' = ' + F(val));
            if (!conv.length) s1.p(val.d === 1n ? 'A whole number.' : 'The fraction is already in lowest terms: $\\gcd(' + T(gm.abs(val.n)) + ', ' + T(val.d) + ') = 1$.');
        }

        /* result, mixed number */
        var lines = [whole === F(val) ? '$' + F(val) + '$' : '$' + whole + ' = ' + F(val) + '$'];
        var an = gm.abs(val.n), w0 = an / val.d, r0 = an % val.d;
        if (val.d !== 1n && w0 > 0n) {
            var mixed = (val.n < 0n ? '-' : '') + T(w0) + '\\tfrac{' + T(r0) + '}{' + T(val.d) + '}';
            lines.push('Mixed number: $' + mixed + '$');
            S.step('As a mixed number').p('Divide the numerator by the denominator: the quotient is the whole part, the remainder the new numerator.')
                .math(T(an) + ' = ' + T(w0) + ' \\cdot ' + T(val.d) + ' + ' + T(r0) + ' \\quad\\Longrightarrow\\quad ' + F(val) + ' = ' + mixed);
        }

        /* decimal expansion by long division */
        var D = val.d, rem = r0, seen = new Map(), digs = [], rows = [], LIMIT = 20000, start = -1;
        if (D !== 1n) {
            var d2 = D, v2 = 0, v5 = 0;
            while (d2 % 2n === 0n) { d2 /= 2n; v2++; }
            while (d2 % 5n === 0n) { d2 /= 5n; v5++; }
            while (rem !== 0n && digs.length < LIMIT) {
                var key = String(rem);
                if (seen.has(key)) { start = seen.get(key); break; }
                seen.set(key, digs.length);
                var x10 = rem * 10n, dg = x10 / D, nr = x10 % D;
                if (rows.length < 400) rows.push([digs.length + 1, '$' + T(rem) + '$', '$' + T(x10) + '$', '$' + T(x10) + ' = ' + T(dg) + ' \\cdot ' + T(D) + ' + ' + T(nr) + '$', { v: '$' + T(dg) + '$', hl: true }]);
                digs.push(String(dg));
                rem = nr;
            }
            var sign = val.n < 0n ? '-' : '', intp = String(w0), decTex;
            var sd = S.step('Decimal expansion by long division');
            sd.p('Divide $' + T(an) + '$ by $' + T(D) + '$: the whole part is $' + T(w0) + '$ with remainder $' + T(r0) + '$. Then again and again: multiply the remainder by 10, divide by $' + T(D) + '$, write the quotient as the next digit and keep the new remainder.' +
                (d2 === 1n ? ' The remainder reaches 0, so the expansion stops.' : ' A remainder can only be one of $1, \\dots, ' + T(D - 1n) + '$, so one must come back, and from there the digits repeat.'));
            sd.table(['Step', 'Remainder', '$\\times 10$', 'Division by $' + T(D) + '$', 'Digit'], rows, { mono: true, caption: rows.length < digs.length ? 'The first ' + rows.length + ' digits:' : '' });
            if (start >= 0) {
                var pre = digs.slice(0, start).join(''), per = digs.slice(start).join('');
                sd.p('The remainder $' + T(rem) + '$ appeared before, at digit ' + (start + 1) + ', so the digits from there on repeat: the period is ' + per.length + ' digit' + (per.length === 1 ? '' : 's') + ' long' + (pre ? ', after ' + pre.length + ' digit' + (pre.length === 1 ? '' : 's') + ' that do not repeat' : '') + '.');
                if (pre.length + per.length <= 120) {
                    decTex = sign + intp + '.' + pre + '\\overline{' + per + '}';
                } else decTex = sign + intp + '.' + (pre + per).slice(0, 80) + '\\ldots';
            } else if (rem === 0n) {
                decTex = sign + intp + '.' + digs.join('');
                if (digs.length > 200) decTex = sign + intp + '.' + digs.slice(0, 120).join('') + '\\ldots';
            } else {
                decTex = sign + intp + '.' + digs.slice(0, 80).join('') + '\\ldots';
                sd.p('The period is longer than ' + LIMIT + ' digits, so the division stops here.');
            }
            lines.push('Decimal: $' + decTex + '$');
            var why = S.step('Why it ' + (d2 === 1n ? 'terminates' : 'repeats'));
            var f25 = [];
            if (v2) f25.push(v2 > 1 ? '2^{' + v2 + '}' : '2');
            if (v5) f25.push(v5 > 1 ? '5^{' + v5 + '}' : '5');
            if (d2 === 1n) why.p('In lowest terms the denominator $' + T(D) + (f25.length > 1 || v2 > 1 || v5 > 1 ? ' = ' + f25.join(' \\cdot ') : '') + '$ has no prime factor other than 2 and 5, so it divides a power of ten ($10^{' + Math.max(v2, v5) + '}$) and the expansion ends after ' + Math.max(v2, v5) + ' digit' + (Math.max(v2, v5) === 1 ? '' : 's') + '.');
            else why.p('The denominator $' + T(D) + '$ has a prime factor other than 2 and 5 ($' + T(D) + (f25.length ? ' = ' + f25.join(' \\cdot ') + ' \\cdot ' + T(d2) : '') + '$), so no power of ten is a multiple of it and the expansion never ends; it repeats. ' +
                (v2 || v5 ? 'The factors 2 and 5 give ' + Math.max(v2, v5) + ' digit' + (Math.max(v2, v5) === 1 ? '' : 's') + ' before the period, and the' : 'The') + ' period length is the order of 10 modulo $' + T(d2) + '$, the smallest $k$ with $10^k \\equiv 1 \\pmod{' + T(d2) + '}$.');
            if (start >= 0 && (v2 || v5)) why.check(start === Math.max(v2, v5), 'The digits before the period: ' + start + ' = $\\max(' + v2 + ', ' + v5 + ')$');
        } else lines.push('A whole number.');
        S.result(lines, { copy: gm.qstr(val) });
        if (!val.n) S.note('The value is 0.');
    }
});
