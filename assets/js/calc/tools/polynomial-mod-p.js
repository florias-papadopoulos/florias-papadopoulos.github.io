/* Toolbox: polynomials over F_p: add, subtract, multiply, divide with remainder (long division table), gcd (Euclid)
   and the inverse modulo another polynomial (extended Euclid). Polynomials are arrays of BigInt, lowest degree first,
   without trailing zeros (the zero polynomial is []). */
Calc.tool({
    id: 'polynomial-mod-p',
    live: true,
    inputs: [
        { id: 'p', label: 'Prime $p$', placeholder: '7', width: 's' },
        { id: 'f', type: 'text', label: 'Polynomial $f(x)$', placeholder: 'x^4 + 3x^2 + 2x + 1', width: 'l', help: 'Like 3x^4 + 2x - 1, or the coefficients from the highest degree: 3, 0, 0, 2, -1.' },
        { id: 'g', type: 'text', label: 'Polynomial $g(x)$', placeholder: 'x^2 + 1', width: 'l' }
    ],
    actions: [{ id: 'div', label: 'Divide f by g' }, { id: 'mul', label: 'Multiply' }, { id: 'add', label: 'Add' }, { id: 'sub', label: 'Subtract' }, { id: 'gcd', label: 'GCD' }, { id: 'inv', label: 'Inverse of f mod g' }],
    examples: [
        { p: '7', f: 'x^4 + 3x^2 + 2x + 1', g: '2x^2 + 1' },
        { p: '5', f: 'x^2 + 3x + 2', g: '2x^3 + x + 4', _action: 'mul' },
        { p: '7', f: 'x^4 + 3x^3 + x^2 + 2x + 2', g: 'x^3 + 6x + 1', _action: 'gcd' },
        { p: '2', f: 'x^6 + x^4 + x^2 + x + 1', g: 'x^8 + x^4 + x^3 + x + 1', _action: 'inv' },
        { p: '13', f: '3x^3 + 5x + 9', g: '12x^3 + 4x^2 + 1', _action: 'add' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, T = Calc.lib.modern.tex, p = v.p, MAXDEG = 64;
        if (!nt.isPrime(p)) Calc.fail(Calc.lib.modern.notPrime(p, 'p') + ' The coefficients must form a field, so p must be prime.', 'p');
        if (nt.bitLength(p) > 256) Calc.fail('Take a prime of at most 256 bits.', 'p');
        function md(a) { return nt.mod(a, p); }
        function norm(a) { a = a.map(md); while (a.length && a[a.length - 1] === 0n) a.pop(); return a; }
        function deg(a) { return a.length - 1; }
        function lc(a) { return a[a.length - 1]; }
        function tex(a) {
            if (!a.length) return '0';
            var out = [];
            for (var i = a.length - 1; i >= 0; i--) {
                if (a[i] === 0n) continue;
                var x = i === 0 ? '' : i === 1 ? 'x' : 'x^{' + i + '}';
                out.push((a[i] === 1n && i > 0 ? '' : T(a[i])) + x);
            }
            return out.join(' + ');
        }
        function txt(a) {
            var out = [];
            for (var i = a.length - 1; i >= 0; i--) if (a[i] !== 0n) out.push((a[i] === 1n && i > 0 ? '' : String(a[i])) + (i === 0 ? '' : i === 1 ? 'x' : 'x^' + i));
            return out.length ? out.join(' + ') : '0';
        }
        function term(c, k) { var a = []; for (var i = 0; i < k; i++) a.push(0n); a.push(c); return norm(a); }
        function add(a, b) { var r = []; for (var i = 0; i < Math.max(a.length, b.length); i++) r.push((a[i] || 0n) + (b[i] || 0n)); return norm(r); }
        function scale(a, c) { return norm(a.map(function (x) { return x * c; })); }
        function sub(a, b) { return add(a, scale(b, -1n)); }
        function mul(a, b) {
            if (!a.length || !b.length) return [];
            var r = [];
            for (var i = 0; i < a.length + b.length - 1; i++) r.push(0n);
            a.forEach(function (x, i) { b.forEach(function (y, j) { r[i + j] += x * y; }); });
            return norm(r);
        }
        function divmod(a, b) {
            var q = [], r = a.slice(), li = nt.inv(lc(b), p), rows = [];
            while (r.length && deg(r) >= deg(b)) {
                var t = term(lc(r) * li, deg(r) - deg(b)), tb = mul(t, b), nr = sub(r, tb);
                rows.push({ r: r, t: t, tb: tb, nr: nr });
                q = add(q, t);
                r = nr;
            }
            return { q: q, r: r, rows: rows, li: li };
        }
        function parse(raw, field) {
            var s = String(raw == null ? '' : raw).replace(/[\u2212\u2013\u2014]/g, '-').replace(/\s+/g, '').replace(/X/g, 'x').replace(/\*\*/g, '^');
            if (!s) Calc.fail('Please enter a polynomial.', field);
            var c = [];
            if (!/x/.test(s)) {
                var l;
                try { l = Calc.list(String(raw).replace(/[\u2212\u2013\u2014]/g, '-')); } catch (e) { if (e instanceof Calc.UserError) Calc.fail(e.message, field); throw e; }
                if (l.length > MAXDEG + 1) Calc.fail('At most degree ' + MAXDEG + '.', field);
                return norm(l.reverse());
            }
            if (!/^[+-]/.test(s)) s = '+' + s;
            var re = /([+-])([^+-]+)/g, m, seen = 0;
            while ((m = re.exec(s))) {
                seen += m[0].length;
                var t = /^(\d+)?\*?(?:(x)(?:\^(\d+))?)?$/.exec(m[2]);
                if (!t || (!t[1] && !t[2])) Calc.fail('Cannot read the term "' + m[1] + m[2] + '": use terms like 3x^2, x and 5.', field);
                var coef = t[1] ? BigInt(t[1]) : 1n, e = t[2] ? (t[3] ? parseInt(t[3], 10) : 1) : 0;
                if (e > MAXDEG) Calc.fail('At most degree ' + MAXDEG + '.', field);
                while (c.length <= e) c.push(0n);
                c[e] += m[1] === '-' ? -coef : coef;
            }
            if (seen !== s.length) Calc.fail('Cannot read this polynomial.', field);
            return norm(c);
        }
        var f = parse(v.f, 'f'), g = parse(v.g, 'g'), P = '\\pmod{' + T(p) + '}';
        S.step('The polynomials over $\\mathbb{F}_{' + T(p) + '}$').p('Coefficients are reduced modulo $' + T(p) + '$ (to $0, \\ldots, ' + T(p - 1n) + '$):').lines(['f(x) &= ' + tex(f), 'g(x) &= ' + tex(g)]);
        var res, name;
        if (v._action === 'add' || v._action === 'sub') {
            var plus = v._action === 'add', rows = [];
            res = plus ? add(f, g) : sub(f, g);
            for (var k = Math.max(f.length, g.length) - 1; k >= 0; k--) {
                var a = f[k] || 0n, b = g[k] || 0n, raw = plus ? a + b : a - b;
                rows.push(['$x^{' + k + '}$', '$' + T(a) + '$', '$' + T(b) + '$', '$' + T(a) + (plus ? ' + ' : ' - ') + T(b) + ' = ' + T(raw) + ' \\equiv ' + T(md(raw)) + '$']);
            }
            S.step((plus ? 'Add' : 'Subtract') + ' the coefficients of each degree, modulo $' + T(p) + '$').table(['Degree', '$f$', '$g$', plus ? 'Sum' : 'Difference'], rows, { mono: true });
            name = plus ? 'f + g' : 'f - g';
        } else if (v._action === 'mul') {
            res = mul(f, g);
            var mrows = [];
            for (var kk = f.length + g.length - 2; kk >= 0; kk--) {
                var parts = [], sum = 0n;
                for (var i = 0; i < f.length; i++) { var j = kk - i; if (j < 0 || j >= g.length || f[i] === 0n || g[j] === 0n) continue; parts.push(T(f[i]) + ' \\cdot ' + T(g[j])); sum += f[i] * g[j]; }
                mrows.push(['$x^{' + kk + '}$', parts.length ? '$' + parts.join(' + ') + ' = ' + T(sum) + '$' : '$0$', '$' + T(md(sum)) + '$']);
            }
            if (!f.length || !g.length) S.step('Multiply').p('One factor is the zero polynomial, so the product is 0.');
            else S.step('Multiply: collect the coefficient of each degree').p('The coefficient of $x^k$ in $f \\cdot g$ is $\\sum_{i + j = k} f_i g_j$, reduced modulo $' + T(p) + '$:').table(['Degree', '$\\sum_{i+j=k} f_i g_j$', 'mod $' + T(p) + '$'], mrows, { mono: true });
            name = 'f \\cdot g';
        } else if (v._action === 'div') {
            if (!g.length) Calc.fail('Division by the zero polynomial is not defined.', 'g');
            var d = divmod(f, g), sd = S.step('Long division of $f$ by $g$');
            sd.p('The leading coefficient of $g$ is $' + T(lc(g)) + '$, with inverse $' + T(d.li) + '$ modulo $' + T(p) + '$. Repeatedly cancel the leading term of the remainder: divide it by the leading term of $g$ (multiply by $' + T(d.li) + '$), subtract that multiple of $g$, until the degree is below $\\deg g = ' + deg(g) + '$.');
            if (d.rows.length) sd.table(['Remainder so far', 'Quotient term', 'Subtract', 'New remainder'], d.rows.map(function (r) { return ['$' + tex(r.r) + '$', { v: '$' + tex(r.t) + '$', hl: true }, '$' + tex(r.tb) + '$', '$' + tex(r.nr) + '$']; }), { mono: true });
            else sd.p('$\\deg f < \\deg g$, so the quotient is 0 and the remainder is $f$ itself.');
            S.result(['$q(x) = ' + tex(d.q) + '$', '$r(x) = ' + tex(d.r) + '$'], { copy: 'q = ' + txt(d.q) + '\nr = ' + txt(d.r), label: 'Quotient and remainder' });
            var back = add(mul(d.q, g), d.r);
            S.step('Check').math('q \\cdot g + r = (' + tex(d.q) + ')(' + tex(g) + ') + ' + (d.r.length ? '(' + tex(d.r) + ')' : '0') + ' \\equiv ' + tex(back) + ' ' + P).check(back.join() === f.join(), 'This is $f$, and $\\deg r < \\deg g$');
            return;
        } else if (v._action === 'gcd') {
            if (!f.length && !g.length) Calc.fail('gcd(0, 0) is not defined.', 'f');
            var A = f, B = g, er = [];
            if (deg(A) < deg(B)) { var tmp = A; A = B; B = tmp; }
            while (B.length) { var dd = divmod(A, B); er.push(['$' + tex(A) + '$', '$(' + tex(dd.q) + ')$', '$(' + tex(B) + ')$', '$' + tex(dd.r) + '$']); A = B; B = dd.r; }
            var se = S.step('Euclid\'s algorithm');
            se.p('As for numbers: divide, keep the remainder, and repeat with the divisor and the remainder until the remainder is 0.');
            if (er.length) se.table(['$a$', '$= q \\cdot$', '$b$', '$+\\ r$'], er, { hl: er.length - 1, mono: true });
            var li2 = nt.inv(lc(A), p);
            res = scale(A, li2);
            S.step('Make it monic').p('The last non-zero remainder is $' + tex(A) + '$. A gcd is only defined up to a non-zero constant factor; the convention is the monic one (leading coefficient 1), so multiply by $' + T(lc(A)) + '^{-1} \\equiv ' + T(li2) + '$:').math('\\gcd(f, g) = ' + tex(res));
            if (res.length === 1) S.note('The gcd is 1: $f$ and $g$ are coprime, so $f$ has an inverse modulo $g$.');
            name = '\\gcd(f, g)';
        } else {
            if (deg(g) < 1) Calc.fail('The modulus g must have degree at least 1.', 'g');
            var f0 = divmod(f, g).r;
            if (f0.join() !== f.join()) S.step('Reduce $f$ modulo $g$').math('f \\bmod g = ' + tex(f0));
            if (!f0.length) Calc.fail('f is a multiple of g, so it is 0 modulo g and has no inverse.', 'f');
            var r0 = g, r1 = f0, t0 = [], t1 = [1n], tab = [['$0$', '$' + tex(r0) + '$', '', '$0$'], ['$1$', '$' + tex(r1) + '$', '', '$1$']], idx = 1;
            while (r1.length) {
                var dv = divmod(r0, r1), r2 = dv.r, t2 = sub(t0, mul(dv.q, t1));
                tab[tab.length - 1][2] = '$' + tex(dv.q) + '$';
                idx++;
                tab.push(['$' + idx + '$', '$' + tex(r2) + '$', '', '$' + tex(t2) + '$']);
                r0 = r1; r1 = r2; t0 = t1; t1 = t2;
            }
            var si = S.step('Extended Euclidean algorithm on $g$ and $f$');
            si.p('Every row keeps $r_i \\equiv t_i \\cdot f \\pmod g$; $q_i$ is the quotient of $r_{i-1}$ by $r_i$ and $t_{i+1} = t_{i-1} - q_i t_i$.');
            si.table(['$i$', '$r_i$', '$q_i$', '$t_i$'], tab, { hl: tab.length - 2, mono: true });
            if (deg(r0) > 0) {
                S.result(['$f$ has no inverse modulo $g$'], { copy: 'no inverse' });
                S.note('$\\gcd(f, g) = ' + tex(scale(r0, nt.inv(lc(r0), p))) + '$ is not a constant, so no inverse exists.');
                return;
            }
            var ci = nt.inv(r0[0], p);
            res = scale(t0, ci);
            S.step('Scale to get 1').p('The last non-zero remainder is the constant $' + T(r0[0]) + '$; multiply its $t$ by $' + T(r0[0]) + '^{-1} \\equiv ' + T(ci) + '$:').math('f^{-1} \\equiv ' + tex(res) + ' \\pmod{g}');
            var chk = divmod(mul(f0, res), g).r;
            S.step('Check').math('f \\cdot f^{-1} \\bmod g = ' + tex(chk)).check(chk.length === 1 && chk[0] === 1n, 'The product is 1 modulo $g$');
            S.result(['$f^{-1} \\equiv ' + tex(res) + ' \\pmod{g}$'], { copy: txt(res) });
            S.note('When $g$ is irreducible, $\\mathbb{F}_{' + T(p) + '}[x]/(g)$ is the field with $' + T(p) + '^{' + deg(g) + '}$ elements, and every non-zero $f$ has an inverse.');
            return;
        }
        S.result(['$' + name + ' = ' + tex(res) + '$'], { copy: txt(res) });
    }
});
