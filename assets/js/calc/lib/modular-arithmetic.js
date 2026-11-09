/* Toolbox: small helpers shared by the Modular arithmetic tools (Calc.lib.modArith): signed terms for formulas and
   the extended Euclidean table that several tools show (inverse, linear congruence, CRT). Pure, no page code. */
(function (G) {
    'use strict';
    var Calc = G.Calc;
    var M = Calc.lib.modArith = {};

    /* a number for a product or a sum: in parentheses when negative */
    M.par = function (n) { return n < 0n ? '(' + Calc.tex(n) + ')' : Calc.tex(n); };
    /* c * x as the first term of a sum ("-9 \cdot 240") or as a later one (" - 9 \cdot 240", " + 47 \cdot 46") */
    M.term = function (c, x, first) {
        var neg = c < 0n, a = neg ? -c : c, body = Calc.tex(a) + ' \\cdot ' + x;
        if (first) return (neg ? '-' : '') + body;
        return (neg ? ' - ' : ' + ') + body;
    };
    /* sign of a BigInt as -1n, 0n or 1n */
    M.sign = function (n) { return n < 0n ? -1n : n > 0n ? 1n : 0n; };

    /* The extended Euclidean algorithm on x >= 0, y >= 0 as a table added to step st. nx, ny: TeX names of x and y
       for the invariant r_i = s_i x + t_i y. Returns {g, s, t} with s*x + t*y = g (the highlighted row). */
    M.egcdTable = function (st, x, y, nx, ny) {
        var T = Calc.tex, e = Calc.lib.nt.egcdRows(x, y), rows = e.rows, k = rows.length - 2;
        var showInv = x < 10n ** 12n && y < 10n ** 12n;
        var head = ['$i$', '$r_i$', '$q_i$', '$s_i$', '$t_i$'];
        if (showInv) head.push('$r_i = s_i \\cdot ' + nx + ' + t_i \\cdot ' + ny + '$');
        st.table(head, rows.map(function (r, i) {
            var row = [i, '$' + T(r.r) + '$', r.q === null ? '' : '$' + T(r.q) + '$', '$' + T(r.s) + '$', '$' + T(r.t) + '$'];
            if (showInv) row.push('$' + T(r.r) + ' = ' + M.par(r.s) + ' \\cdot ' + T(x) + ' + ' + M.par(r.t) + ' \\cdot ' + T(y) + '$');
            return row;
        }), { hl: k, mono: true });
        return { g: rows[k].r, s: rows[k].s, t: rows[k].t };
    };

    /* The inverse of a (0 <= a < n, n >= 2) modulo n, written out in a new step of S. Returns the inverse or null. */
    M.inverseStep = function (S, a, n, title) {
        var T = Calc.tex, nt = Calc.lib.nt;
        var st = S.step(title || 'Inverse of $' + T(a) + '$ modulo $' + T(n) + '$');
        st.p('Run the extended Euclidean algorithm on $' + T(n) + '$ and $' + T(a) + '$. Every row keeps $r_i = s_i \\cdot ' + T(n) + ' + t_i \\cdot ' + T(a) + '$; each new row is the row two above minus $q_i$ times the row above.');
        var e = M.egcdTable(st, n, a, T(n), T(a));
        if (e.g !== 1n) {
            st.p('The last non-zero remainder is $\\gcd = ' + T(e.g) + ' \\ne 1$, so $' + T(a) + '$ has no inverse modulo $' + T(n) + '$.');
            return null;
        }
        var inv = nt.mod(e.t, n);
        st.p('The highlighted row says $' + M.par(e.s) + ' \\cdot ' + T(n) + ' + ' + M.par(e.t) + ' \\cdot ' + T(a) + ' = 1$; modulo $' + T(n) + '$ the first term vanishes, so $' + T(a) + '^{-1} \\equiv ' + (e.t === inv ? T(inv) : T(e.t) + ' \\equiv ' + T(inv)) + '$.');
        st.check(a * inv % n === 1n, '$' + T(a) + ' \\cdot ' + T(inv) + ' = ' + T(a * inv) + ' \\equiv 1 \\pmod{' + T(n) + '}$');
        return inv;
    };
})(typeof window !== 'undefined' ? window : globalThis);
