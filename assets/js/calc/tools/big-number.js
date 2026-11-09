/* Toolbox: big number calculator. Exact whole-number expressions of any size (+ - * / with remainder, ^, !, mod,
   gcd, lcm, ...), every operation in the order it is evaluated, then the size of the result (digits and bits),
   its scientific form and its digit sum. */
Calc.tool({
    id: 'big-number',
    live: true,
    inputs: [
        { id: 'expr', type: 'text', width: 'full', label: 'Expression', placeholder: '2^127 - 1', maxLength: 2000,
            help: 'Whole numbers (also 0x.., 0b.., 1e30), + - * / (whole quotient), % or mod, ^, !, brackets, and gcd, lcm, abs, min, max, isqrt, binom(n, k), powmod(a, e, n).' }
    ],
    examples: [{ expr: '2^127 - 1' }, { expr: '100!' }, { expr: '(3^100 + 7) mod 1000003' }, { expr: '2^64 / 1000' }, { expr: 'gcd(2^60 - 1, 2^48 - 1) + 10! / 7!' }, { expr: 'powmod(65537, 2^20, 2^61 - 1)' }],
    run: function (v, S) {
        var gm = Calc.lib.gmath, nt = Calc.lib.nt, T = Calc.tex, B = function (x) { return gm.bigTex(x, 40); };
        var MAXBITS = 200000, src = String(v.expr).replace(/[\u2212\u2013\u2014]/g, '-').replace(/[×⋅·]/g, '*').replace(/÷/g, '/').replace(/\*\*/g, '^');
        var i = 0, log = [];
        function err(m) { Calc.fail(m, 'expr'); }
        function bits(x) { return nt.bitLength(x); }
        function chk(x) { if (bits(x) > MAXBITS) err('A result is too large (over ' + MAXBITS + ' bits).'); return x; }
        function ws() { while (i < src.length && /\s/.test(src.charAt(i))) i++; }
        function peek() { ws(); return src.charAt(i); }
        function rec(tex, val, note) { if (log.length > 300) err('At most 300 operations, please.'); log.push({ tex: tex, val: val, note: note || '' }); return val; }
        function P(x) { return x < 0n ? '(' + B(x) + ')' : B(x); }
        var FUN = {
            gcd: function (a) { if (a.length < 2) err('gcd needs at least two numbers.'); return rec('\\gcd(' + a.map(B).join(', ') + ')', a.reduce(nt.gcd)); },
            lcm: function (a) { if (a.length < 2) err('lcm needs at least two numbers.'); return rec('\\operatorname{lcm}(' + a.map(B).join(', ') + ')', chk(a.reduce(nt.lcm))); },
            abs: function (a) { if (a.length !== 1) err('abs takes one number.'); return rec('|' + B(a[0]) + '|', nt.abs(a[0])); },
            min: function (a) { return rec('\\min(' + a.map(B).join(', ') + ')', a.reduce(nt.min)); },
            max: function (a) { return rec('\\max(' + a.map(B).join(', ') + ')', a.reduce(nt.max)); },
            isqrt: function (a) { if (a.length !== 1) err('isqrt takes one number.'); if (a[0] < 0n) err('isqrt needs a number that is not negative.'); var r = nt.isqrt(a[0]); return rec('\\lfloor\\sqrt{' + B(a[0]) + '}\\rfloor', r, r * r === a[0] ? 'a perfect square' : '$' + B(r) + '^2 \\le ' + B(a[0]) + ' < ' + B(r + 1n) + '^2$'); },
            binom: function (a) {
                if (a.length !== 2) err('binom takes two numbers, binom(n, k).');
                var n = a[0], k = a[1];
                if (n < 0n || k < 0n) err('binom needs numbers that are not negative.');
                if (k > n) return rec('\\binom{' + B(n) + '}{' + B(k) + '}', 0n);
                if (n - k < k) k = n - k;
                if (k > 20000n) err('That binomial needs over 20000 factors.');
                var c = 1n;
                for (var j = 1n; j <= k; j++) c = c * (n - j + 1n) / j;
                return rec('\\binom{' + B(a[0]) + '}{' + B(a[1]) + '}', chk(c));
            },
            powmod: function (a) {
                if (a.length !== 3) err('powmod takes three numbers, powmod(a, e, n).');
                if (a[2] === 0n) err('powmod needs a modulus that is not 0.');
                if (a[1] < 0n && nt.inv(a[0], a[2]) === null) err('A negative exponent needs a base invertible modulo n.');
                return rec(B(a[0]) + '^{' + B(a[1]) + '} \\bmod ' + B(a[2]), nt.powmod(a[0], a[1], a[2]), 'square and multiply, never the full power');
            }
        };
        function number() {
            ws();
            var m = /^(0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+(?:e\d+)?)/i.exec(src.slice(i));
            if (!m) { if (i >= src.length) err('The expression ends too early.'); err('Unexpected "' + src.charAt(i) + '" at position ' + (i + 1) + '.'); }
            i += m[0].length;
            var t = m[0].toLowerCase();
            if (/^0[xbo]/.test(t)) return BigInt(t);
            var e = t.indexOf('e');
            if (e < 0) return BigInt(t);
            var ex = parseInt(t.slice(e + 1), 10);
            if (ex > 60000) err('That power of ten is too large.');
            return BigInt(t.slice(0, e)) * 10n ** BigInt(ex);
        }
        function primary() {
            var c = peek();
            if (c === '(') { i++; var x = expr(); if (peek() !== ')') err('A closing bracket ")" is missing.'); i++; return x; }
            var m = /^[a-z]+/i.exec(src.slice(i));
            if (m && !/^0x|^0b|^0o/i.test(src.slice(i))) {
                var name = m[0].toLowerCase();
                if (name === 'sqrt') name = 'isqrt';
                var f = FUN[name];
                if (!f) err('Unknown name "' + m[0] + '". Functions: gcd, lcm, abs, min, max, isqrt, binom, powmod.');
                i += m[0].length;
                if (peek() !== '(') err('"' + m[0] + '" needs brackets: ' + name + '(...).');
                i++;
                var args = [expr()];
                while (peek() === ',') { i++; args.push(expr()); }
                if (peek() !== ')') err('A closing bracket ")" is missing after the arguments of ' + name + '.');
                i++;
                return f(args);
            }
            return number();
        }
        function postfix() {
            var x = primary();
            while (peek() === '!') {
                i++;
                if (x < 0n) err('Factorial needs a number that is not negative.');
                if (x > 20000n) err('Factorials up to 20000!, please.');
                var r = 1n;
                for (var k = 2n; k <= x; k++) r *= k;
                x = rec(B(x) + '!', r, x > 2n ? '$= ' + (x <= 6n ? Array.apply(null, Array(Number(x))).map(function (_, j) { return x - BigInt(j); }).join(' \\cdot ') : B(x) + ' \\cdot ' + B(x - 1n) + ' \\cdots 2 \\cdot 1') + '$' : '');
            }
            return x;
        }
        function power() {
            var b = postfix();
            if (peek() === '^') {
                i++;
                var e = unary();
                if (e < 0n) err('Negative powers are not whole numbers.');
                var r;
                if (b === 0n || b === 1n || b === -1n) r = e === 0n ? 1n : (b === -1n && e % 2n === 0n ? 1n : b);
                else { if (BigInt(bits(b)) * e > BigInt(MAXBITS) + 64n) err('That power is too large (over ' + MAXBITS + ' bits).'); r = chk(b ** e); }
                return rec(P(b) + '^{' + B(e) + '}', r);
            }
            return b;
        }
        function unary() {
            var c = peek();
            if (c === '-') { i++; return -unary(); }
            if (c === '+') { i++; return unary(); }
            return power();
        }
        function term() {
            var x = unary();
            for (;;) {
                var c = peek(), word = /^mod\b/i.test(src.slice(i));
                if (c === '*') { i++; var y = unary(); x = rec(P(x) + ' \\cdot ' + P(y), chk(x * y)); }
                else if (c === '/') {
                    i++;
                    var d = unary();
                    if (d === 0n) err('Division by zero.');
                    var qr = nt.divmod(x, d);
                    x = rec(P(x) + ' \\div ' + P(d), qr.q, qr.r === 0n ? 'exact' : 'remainder $' + B(qr.r) + '$: $' + P(x) + ' = ' + P(qr.q) + ' \\cdot ' + P(d) + ' + ' + B(qr.r) + '$');
                } else if (c === '%' || word) {
                    i += word ? 3 : 1;
                    var n = unary();
                    if (n === 0n) err('Modulo zero is not defined.');
                    x = rec(P(x) + ' \\bmod ' + P(n), nt.mod(x, n));
                } else return x;
            }
        }
        function expr() {
            var x = term();
            for (;;) {
                var c = peek();
                if (c === '+') { i++; var y = term(); x = rec(P(x) + ' + ' + P(y), x + y); }
                else if (c === '-') { i++; var z = term(); x = rec(P(x) + ' - ' + P(z), x - z); }
                else return x;
            }
        }
        if (!src.trim()) err('Please type an expression.');
        var val = expr();
        if (peek() !== '') err('Unexpected "' + src.charAt(i) + '" at position ' + (i + 1) + '.');
        chk(val);

        var s1 = S.step('Order of evaluation');
        s1.p('Brackets and functions first, then ! (factorial), then ^ (powers, from the right: $2^{3^2} = 2^9$), then $\\cdot$, $\\div$ and $\\bmod$ from left to right, then $+$ and $-$ from left to right. Division of whole numbers keeps the quotient (rounded down) and notes the remainder.');
        if (log.length) s1.table(['#', 'Operation', 'Result', ''], log.map(function (o, k) { return [k + 1, '$' + o.tex + '$', '$' + B(o.val) + '$', o.note]; }));
        else s1.p('There is nothing to compute: the expression is a single number.');

        var a = nt.abs(val), str = String(a), nd = str.length, nb = bits(val);
        S.result('$' + B(val) + '$', { copy: String(val) });
        S.note(nd + ' digit' + (nd === 1 ? '' : 's') + ', ' + nb + ' bit' + (nb === 1 ? '' : 's') + (nd > 40 ? '. Copy gives every digit.' : '.'));
        if (nd > 40 && nd <= 30000) S.step('All the digits').pre((val < 0n ? '-' : '') + gm.wrap(a));

        var s2 = S.step('Size: digits and bits');
        if (a === 0n) s2.p('The number is 0: one digit, and 0 bits (nothing to store).');
        else {
            s2.p('A number $x$ has $d$ decimal digits when $10^{d-1} \\le |x| < 10^d$, and $b$ bits when $2^{b-1} \\le |x| < 2^b$. Here:');
            var xs = nd <= 25 ? B(a) : (val < 0n ? '|x|' : 'x');
            s2.math('10^{' + (nd - 1) + '} \\le ' + xs + ' < 10^{' + nd + '}, \\qquad 2^{' + (nb - 1) + '} \\le ' + xs + ' < 2^{' + nb + '}');
            s2.p('So $' + nd + '$ digit' + (nd === 1 ? '' : 's') + ' and $' + nb + '$ bit' + (nb === 1 ? '' : 's') + ' (' + Math.ceil(nb / 8) + ' byte' + (Math.ceil(nb / 8) === 1 ? '' : 's') + '; ' + Math.ceil(nb / 4) + ' hexadecimal digit' + (Math.ceil(nb / 4) === 1 ? '' : 's') + '). Roughly, every bit is $\\log_{10} 2 \\approx 0.301$ digits.');
            if (nb <= 64) s2.p('In binary: $' + a.toString(2) + '_2$, in hexadecimal: $\\texttt{' + a.toString(16).toUpperCase() + '}_{16}$.');
            else if (nb <= 4096) s2.p('In hexadecimal:').pre(gm.wrap(a.toString(16).toUpperCase(), 64));
        }

        if (nd > 3) {
            /* scientific form with 10 significant digits, rounded */
            var sig = Math.min(10, nd), head = BigInt(str.slice(0, sig + 1 > nd ? nd : sig + 1)), e10 = nd - 1;
            var m;
            if (nd > sig) { m = (head + 5n) / 10n; if (String(m).length > sig) { m /= 10n; e10++; } } else m = head;
            var ms = String(m), mant = ms.charAt(0) + (ms.length > 1 ? '.' + ms.slice(1).replace(/0+$/, '') : '');
            S.step('Scientific form').p('Put the decimal point behind the first digit; the power of ten counts the places it moved' + (nd > sig ? ' (here rounded to ' + sig + ' significant digits)' : '') + ':')
                .math((nd <= 25 ? B(val) : 'x') + (nd > sig ? ' \\approx ' : ' = ') + (val < 0n ? '-' : '') + mant + ' \\times 10^{' + e10 + '}');
        }

        var ds = 0;
        for (var k = 0; k < nd; k++) ds += str.charCodeAt(k) - 48;
        var root = a === 0n ? 0 : 1 + (ds - 1) % 9;
        var s4 = S.step('Digit sum');
        if (nd <= 30) s4.math(str.split('').join(' + ') + ' = ' + ds);
        else s4.p('Adding the ' + nd + ' digits gives $' + ds + '$.');
        s4.p('Since $10 \\equiv 1 \\pmod 9$, a number and its digit sum leave the same remainder modulo 9 (and modulo 3); repeating the digit sum down to one digit gives the digital root, $' + root + '$.');
        s4.check(Number(a % 9n) === ds % 9, '$' + (nd <= 25 ? B(a) : '|x|') + ' \\bmod 9 = ' + (a % 9n) + '$ and $' + ds + ' \\bmod 9 = ' + (ds % 9) + '$');
    }
});
