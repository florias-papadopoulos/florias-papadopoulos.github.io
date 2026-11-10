/* Toolbox: evaluate an expression with + - * / ^ and parentheses modulo n. The expression is parsed into a tree, then
   evaluated from the inside out, every operation reduced mod n; division multiplies by the modular inverse, and
   exponents are whole numbers (not reduced mod n). */
(function () {
    'use strict';
    var PREC = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, pow: 4, num: 5 };
    var MAX_NODES = 300;

    /* parse into {t: 'num'|'neg'|'add'|'sub'|'mul'|'div'|'pow', v, l, r, x} */
    function parse(src) {
        var s = String(src).replace(/[\u2212\u2013\u2014]/g, '-').replace(/[×⋅·]/g, '*').replace(/÷/g, '/').replace(/\*\*/g, '^').replace(/ /g, ' ');
        var i = 0, count = 0;
        function node(o) { if (++count > MAX_NODES) Calc.fail('The expression is too long (at most ' + MAX_NODES + ' numbers and operations).', 'expr'); return o; }
        function ws() { while (i < s.length && /\s/.test(s.charAt(i))) i++; }
        function peek() { ws(); return s.charAt(i); }
        function where() { return ' at position ' + (i + 1) + '.'; }
        function primary() {
            var c = peek();
            if (c === '(' || c === '[') {
                var close = c === '(' ? ')' : ']';
                i++;
                var x = expr();
                if (peek() !== close) Calc.fail(i >= s.length ? 'A closing "' + close + '" is missing.' : 'Expected "' + close + '"' + where(), 'expr');
                i++;
                return x;
            }
            var m = /^0x[0-9a-f]+|^0b[01]+|^0o[0-7]+|^\d[\d_]*/i.exec(s.slice(i));
            if (!m) {
                if (i >= s.length) Calc.fail('The expression ends too early.', 'expr');
                if (/^mod\b/i.test(s.slice(i))) Calc.fail('Write the modulus in its own field, not in the expression.', 'expr');
                if (/[a-z]/i.test(c)) Calc.fail('Only numbers, + - * / ^ and parentheses are allowed (no names or variables)' + where().replace(/\.$/, '') + '.', 'expr');
                Calc.fail('Unexpected "' + c + '"' + where(), 'expr');
            }
            i += m[0].length;
            var t = m[0].replace(/_/g, '').toLowerCase();
            if (t.length > 5000) Calc.fail('A number in the expression is too long.', 'expr');
            var nx = node({ t: 'num', v: BigInt(t) });
            if (/^\d/.test(peek()) || peek() === '(') Calc.fail('Write * for multiplication' + where(), 'expr');
            return nx;
        }
        function power() {
            var b = primary();
            if (peek() === '^') { i++; return node({ t: 'pow', l: b, r: unary() }); }
            return b;
        }
        function unary() {
            var c = peek();
            if (c === '-') { i++; return node({ t: 'neg', x: unary() }); }
            if (c === '+') { i++; return unary(); }
            return power();
        }
        function term() {
            var x = unary();
            for (;;) {
                var c = peek();
                if (c === '*') { i++; x = node({ t: 'mul', l: x, r: unary() }); }
                else if (c === '/') { i++; x = node({ t: 'div', l: x, r: unary() }); }
                else return x;
            }
        }
        function expr() {
            var x = term();
            for (;;) {
                var c = peek();
                if (c === '+') { i++; x = node({ t: 'add', l: x, r: term() }); }
                else if (c === '-') { i++; x = node({ t: 'sub', l: x, r: term() }); }
                else return x;
            }
        }
        if (!s.trim()) Calc.fail('Please enter an expression.', 'expr');
        var x = expr();
        if (peek() !== '') Calc.fail((peek() === ')' ? 'There is a ")" without a matching "("' : 'Unexpected "' + Calc.chr(s, i) + '"') + where(), 'expr');
        return x;
    }

    /* the tree as TeX, with parentheses only where they are needed */
    function tex(x) {
        var T = Calc.tex;
        function wrap(c, need) { return need ? '\\left(' + tex(c) + '\\right)' : tex(c); }
        switch (x.t) {
            case 'num': return T(x.v);
            case 'neg': return '-' + wrap(x.x, PREC[x.x.t] < 3 || x.x.t === 'neg');
            case 'add': case 'sub':
                return tex(x.l) + (x.t === 'add' ? ' + ' : ' - ') + wrap(x.r, PREC[x.r.t] <= 1 || x.r.t === 'neg');
            case 'mul': return wrap(x.l, PREC[x.l.t] < 2) + ' \\cdot ' + wrap(x.r, PREC[x.r.t] < 2 || x.r.t === 'neg');
            case 'div': return '\\frac{' + tex(x.l) + '}{' + tex(x.r) + '}';
            case 'pow': return wrap(x.l, PREC[x.l.t] < 5) + '^{' + tex(x.r) + '}';
        }
        return '';
    }

    Calc.tool({
        id: 'modular-calculator',
        live: true,
        inputs: [
            { id: 'expr', type: 'text', label: 'Expression', width: 'l', placeholder: '3 * (5 + 4) / 2 - 2^10', maxLength: 3000, help: 'Whole numbers with + - * / ^ and parentheses. Division means multiplying by the inverse modulo $n$.' },
            { id: 'n', label: 'Modulus $n$', placeholder: '7', min: 2 }
        ],
        examples: [{ expr: '3 * (5 + 4) / 2 - 2^10', n: '7' }, { expr: '1/2 + 1/3', n: '11' }, { expr: '(17^-1 * 2753) ^ 3', n: '3120' }, { expr: '2^100 - 1', n: '1000000007' }, { expr: '(10 - 3*7) / 5', n: '26' }],
        run: function (v, S) {
            var nt = Calc.lib.nt, M = Calc.lib.modArith, T = Calc.tex, n = v.n;
            if (nt.bitLength(n) > 4096) Calc.fail('Please use a modulus below 2^4096.', 'n');
            var tree = parse(v.expr), rows = [], divs = [], exps = [], budget = 0;
            function row(op, val) { rows.push(['$' + (rows.length + 1) + '$', '$' + op + '$', '$\\equiv ' + T(val) + '$']); return val; }
            /* exponents are whole numbers: evaluated over the integers */
            function intval(x) {
                switch (x.t) {
                    case 'num': return x.v;
                    case 'neg': return -intval(x.x);
                    case 'add': return intval(x.l) + intval(x.r);
                    case 'sub': return intval(x.l) - intval(x.r);
                    case 'mul': { var p = intval(x.l) * intval(x.r); if (nt.bitLength(p) > 20000) Calc.fail('An exponent is too large.', 'expr'); return p; }
                    case 'div': Calc.fail('An exponent must be a whole number: division is not allowed inside an exponent.', 'expr'); break;
                    case 'pow': {
                        var b = intval(x.l), e = intval(x.r);
                        if (e < 0n) Calc.fail('An exponent must be a whole number: a negative power inside an exponent is not.', 'expr');
                        if (b === 0n || b === 1n || b === -1n) return e === 0n ? 1n : (b === -1n && e % 2n === 0n ? 1n : b);
                        if (BigInt(nt.bitLength(b)) * e > 20000n) Calc.fail('An exponent is too large.', 'expr');
                        return b ** e;
                    }
                }
                return 0n;
            }
            function inverse(y, where) {
                var inv = nt.inv(y, n);
                if (inv === null) Calc.fail('$' + T(y) + '$ has no inverse modulo $' + T(n) + '$ ($\\gcd(' + T(y) + ', ' + T(n) + ') = ' + T(nt.gcd(y, n)) + '$), so ' + where + ' is not defined.');
                return inv;
            }
            function ev(x) {
                switch (x.t) {
                    case 'num': {
                        var r0 = nt.mod(x.v, n);
                        return x.v === r0 ? r0 : row(T(x.v) + ' \\bmod ' + T(n) + ' = ' + T(r0), r0);
                    }
                    case 'neg': {
                        var u = ev(x.x), w = nt.mod(-u, n);
                        return row('-' + T(u), w);
                    }
                    case 'add': case 'sub': case 'mul': {
                        var a = ev(x.l), b = ev(x.r);
                        var val = x.t === 'add' ? a + b : x.t === 'sub' ? a - b : a * b;
                        var sym = x.t === 'add' ? ' + ' : x.t === 'sub' ? ' - ' : ' \\cdot ';
                        return row(T(a) + sym + T(b) + ' = ' + T(val), nt.mod(val, n));
                    }
                    case 'div': {
                        var p = ev(x.l), q = ev(x.r);
                        var iq = inverse(q, 'dividing by it');
                        row(T(q) + '^{-1}', iq);
                        var res = nt.mod(p * iq, n);
                        divs.push({ p: p, q: q, inv: iq, res: res });
                        return row('\\frac{' + T(p) + '}{' + T(q) + '} = ' + T(p) + ' \\cdot ' + T(iq) + ' = ' + T(p * iq), res);
                    }
                    case 'pow': {
                        var base = ev(x.l), e = intval(x.r);
                        budget += nt.bitLength(e);
                        if (budget > 100000) Calc.fail('The exponents are too large together.', 'expr');
                        if (x.r.t !== 'num' && !(x.r.t === 'neg' && x.r.x.t === 'num')) exps.push({ tex: tex(x.r), v: e });
                        if (e < 0n) {
                            var ib = inverse(base, 'a negative power of it');
                            row(T(base) + '^{-1}', ib);
                            if (e === -1n) return ib;
                            return row(T(ib) + '^{' + T(-e) + '}', nt.powmod(ib, -e, n));
                        }
                        return row(T(base) + '^{' + T(e) + '}', nt.powmod(base, e, n));
                    }
                }
                return 0n;
            }
            var s1 = S.step('Read the expression');
            s1.p('Powers first, then multiplication and division from left to right, then addition and subtraction:');
            s1.math(tex(tree) + ' \\pmod{' + T(n) + '}');
            var r = ev(tree);
            if (exps.length) s1.p('An exponent counts how many times to multiply, so it is a whole number and is not reduced modulo $' + T(n) + '$: ' + exps.map(function (x) { return '$' + x.tex + ' = ' + T(x.v) + '$'; }).join(', ') + '.');

            var s2 = S.step('Evaluate from the inside out, reducing modulo $' + T(n) + '$');
            if (!rows.length) s2.p('There is nothing to compute: $' + T(r) + '$ is already between $0$ and $' + T(n - 1n) + '$.');
            else {
                s2.p('Every intermediate value is replaced by its remainder modulo $' + T(n) + '$. This is allowed because sums, differences and products of congruent numbers are congruent, and it keeps the numbers small.' + (divs.length ? ' A division by $y$ is a multiplication by the inverse $y^{-1}$, the number with $y \\cdot y^{-1} \\equiv 1$.' : ''));
                s2.table(['', 'Operation', 'Modulo $' + T(n) + '$'], rows, { hl: rows.length - 1 });
            }

            if (divs.length) {
                var seen = {}, uniq = divs.filter(function (d) { var k = String(d.q); if (seen[k]) return false; seen[k] = 1; return true; });
                if (uniq.length <= 2 && nt.bitLength(n) <= 128) uniq.forEach(function (d) { M.inverseStep(S, d.q, n, 'The inverse of $' + T(d.q) + '$ modulo $' + T(n) + '$ (extended Euclid)'); });
                var s3 = S.step('Check the divisions');
                s3.p('Each quotient times the divisor must give back the dividend:');
                divs.slice(0, 12).forEach(function (d) {
                    s3.check(nt.mod(d.res * d.q, n) === d.p, '$' + T(d.res) + ' \\cdot ' + T(d.q) + ' = ' + T(d.res * d.q) + ' \\equiv ' + T(d.p) + '$');
                });
            }
            S.result('$' + tex(tree) + ' \\equiv ' + T(r) + ' \\pmod{' + T(n) + '}$', { copy: String(r) });
        }
    });
})();
