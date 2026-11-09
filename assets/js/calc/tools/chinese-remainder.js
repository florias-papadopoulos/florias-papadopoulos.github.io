/* Toolbox: the Chinese remainder theorem. A system x ≡ r_i (mod m_i), given as two lists or as lines; Gauss's
   formula with M_i and inverses when the moduli are pairwise coprime, and successive substitution in general (also
   when there is no solution, with the reason). Every congruence is checked at the end. */
(function () {
    'use strict';
    var MAXK = 20;
    /* one congruence per line: x = 2 mod 3, x ≡ 2 (mod 3), 2 mod 3, x mod 3 = 2, x % 3 = 2 */
    function parseLines(src) {
        var out = [];
        String(src).split(/[\n;]+/).forEach(function (line, k) {
            var l = line.replace(/[≡≣]/g, '=').replace(/==/g, '=').replace(/[\u2212\u2013\u2014]/g, '-').trim();
            if (!l) return;
            var m = /^x\s*(?:modulo|mod|%)\s*(.+?)\s*=\s*(.+)$/i.exec(l), r, mod;
            if (m) { mod = m[1]; r = m[2]; }
            else {
                m = /^(?:x\s*=\s*)?(.+?)\s*\(?\s*(?:modulo|mod|%)\s*(.+?)\s*\)?\s*$/i.exec(l);
                if (!m || /x/i.test(m[1])) {
                    if (/^\d*\s*\*?\s*x\s*[=]/i.test(l) && !/^x/i.test(l)) Calc.fail('Line ' + (k + 1) + ': a coefficient in front of x is not supported here. Solve that congruence for x first (linear congruence tool).', 'sys');
                    Calc.fail('Line ' + (k + 1) + ' should look like "x = 2 mod 3" or "x ≡ 2 (mod 3)".', 'sys');
                }
                r = m[1]; mod = m[2];
            }
            try { out.push({ r: Calc.int(r), m: Calc.int(mod) }); }
            catch (e) { if (e instanceof Calc.UserError) Calc.fail('Line ' + (k + 1) + ': ' + e.message, 'sys'); throw e; }
        });
        return out;
    }

    Calc.tool({
        id: 'chinese-remainder',
        live: true,
        inputs: [
            { id: 'form', type: 'select', label: 'Input', value: 'lists', options: [['lists', 'Two lists'], ['lines', 'One congruence per line']] },
            { id: 'method', type: 'select', label: 'Method', width: 'l', value: 'auto', options: [['auto', 'Formula when the moduli are coprime'], ['subst', 'Successive substitution']] },
            { id: 'rs', type: 'list', label: 'Remainders $r_i$', width: 'l', placeholder: '2, 3, 2', when: { form: 'lists' } },
            { id: 'ms', type: 'list', label: 'Moduli $m_i$', width: 'l', placeholder: '3, 5, 7', when: { form: 'lists' } },
            { id: 'sys', type: 'textarea', label: 'Congruences', rows: 4, placeholder: 'x = 2 mod 3\nx = 3 mod 5\nx = 2 mod 7', help: 'One per line, as x = 2 mod 3, x ≡ 2 (mod 3) or x mod 3 = 2.', when: { form: 'lines' } }
        ],
        examples: [
            { form: 'lists', method: 'auto', rs: '2, 3, 2', ms: '3, 5, 7' },
            { form: 'lines', method: 'auto', sys: 'x ≡ 1 (mod 4)\nx ≡ 3 (mod 6)' },
            { form: 'lists', method: 'auto', rs: '1, 2', ms: '4, 6' },
            { form: 'lists', method: 'subst', rs: '2, 3, 2', ms: '3, 5, 7' },
            { form: 'lines', method: 'auto', sys: 'x = 3 mod 10\nx = 8 mod 15\nx = 5 mod 84' },
            { form: 'lists', method: 'auto', rs: '1234, 5678', ms: '2^31 - 1, 2^61 - 1' }
        ],
        run: function (v, S) {
            var nt = Calc.lib.nt, M = Calc.lib.modArith, T = Calc.tex, P = M.par;
            var sys;
            if (v.form === 'lines') sys = parseLines(v.sys);
            else {
                if (v.rs.length !== v.ms.length) Calc.fail('There are ' + v.rs.length + ' remainders but ' + v.ms.length + ' moduli: give one remainder per modulus.', v.rs.length < v.ms.length ? 'rs' : 'ms');
                sys = v.rs.map(function (r, i) { return { r: r, m: v.ms[i] }; });
            }
            var fld = v.form === 'lines' ? 'sys' : 'ms';
            if (sys.length < 2) Calc.fail('Please enter at least two congruences.', fld);
            if (sys.length > MAXK) Calc.fail('At most ' + MAXK + ' congruences.', fld);
            sys.forEach(function (c, i) {
                if (c.m < 1n) Calc.fail('Congruence ' + (i + 1) + ': a modulus must be at least 1.', fld);
                if (nt.bitLength(c.m) > 4096) Calc.fail('Congruence ' + (i + 1) + ': please use moduli below 2^4096.', fld);
            });
            if (sys.reduce(function (t, c) { return t + nt.bitLength(c.m); }, 0) > 20000) Calc.fail('The moduli are too large together (their product must stay below 2^20000).', fld);
            var k = sys.length, orig = sys.map(function (c) { return { r: c.r, m: c.m }; });
            function cong(r, m) { return 'x \\equiv ' + T(r) + ' \\pmod{' + T(m) + '}'; }

            /* 1. the system, reduced */
            var s0 = S.step('The system');
            sys.forEach(function (c) { c.r0 = c.r; c.r = nt.mod(c.r, c.m); });
            var changed = sys.some(function (c) { return c.r !== c.r0; });
            s0.lines(sys.map(function (c) { return 'x &\\equiv ' + T(c.r) + ' \\pmod{' + T(c.m) + '}'; }));
            if (changed) s0.p('Remainders outside $0, \\dots, m_i - 1$ were reduced first: ' + sys.filter(function (c) { return c.r !== c.r0; }).map(function (c) { return '$' + T(c.r0) + ' \\equiv ' + T(c.r) + ' \\pmod{' + T(c.m) + '}$'; }).join(', ') + '.');

            /* pairwise coprime? */
            var bad = null;
            for (var i = 0; i < k && !bad; i++) for (var j = i + 1; j < k; j++) { var gg = nt.gcd(sys[i].m, sys[j].m); if (gg !== 1n) { bad = { i: i, j: j, g: gg }; break; } }
            var coprime = !bad, X, Mod, ok = true;

            if (coprime && v.method === 'auto') {
                var sc = S.step('The moduli are pairwise coprime');
                sc.p(k === 2 ? '$\\gcd(' + T(sys[0].m) + ', ' + T(sys[1].m) + ') = 1$.' : 'Every pair has $\\gcd(m_i, m_j) = 1$ (' + (k * (k - 1) / 2) + ' pairs checked).');
                sc.p('So by the Chinese remainder theorem there is exactly one solution modulo the product $M = ' + sys.map(function (c) { return T(c.m); }).join(' \\cdot ') + '$.');
                Mod = sys.reduce(function (p, c) { return p * c.m; }, 1n);
                sc.math('M = ' + T(Mod));
                var sf = S.step('Gauss\'s formula');
                sf.p('For each $i$ let $M_i = M / m_i$ (the product of the other moduli) and $y_i$ the inverse of $M_i$ modulo $m_i$. The term $r_i M_i y_i$ is $\\equiv r_i \\pmod{m_i}$ (because $M_i y_i \\equiv 1$) and $\\equiv 0$ modulo every other $m_j$ (because $m_j$ divides $M_i$). So their sum solves every congruence at once.');
                var sum = 0n, rows = sys.map(function (c, idx) {
                    var Mi = Mod / c.m, red = Mi % c.m, y = c.m === 1n ? 0n : nt.inv(red, c.m), term = c.r * Mi * y;
                    sum += term;
                    return ['$' + (idx + 1) + '$', '$' + T(c.r) + '$', '$' + T(c.m) + '$', '$' + T(Mi) + '$', '$' + T(red) + '$', '$' + T(y) + '$', '$' + T(term) + '$'];
                });
                sf.table(['$i$', '$r_i$', '$m_i$', '$M_i = M / m_i$', '$M_i \\bmod m_i$', '$y_i = M_i^{-1} \\bmod m_i$', '$r_i M_i y_i$'], rows, { mono: true });
                sf.p('Each $y_i$ comes from the extended Euclidean algorithm on $m_i$ and $M_i \\bmod m_i$ (see the modular inverse tool).');
                X = nt.mod(sum, Mod);
                sf.math('x \\equiv ' + sys.map(function (c, idx) { return rows[idx][6].slice(1, -1); }).join(' + ') + ' = ' + T(sum) + ' \\equiv ' + T(X) + ' \\pmod{' + T(Mod) + '}');
            } else {
                if (!coprime) {
                    S.step('The moduli are not pairwise coprime').p('$\\gcd(' + T(sys[bad.i].m) + ', ' + T(sys[bad.j].m) + ') = ' + T(bad.g) + '$, so the formula with inverses of $M_i$ does not apply. Successive substitution works in every case: it merges the congruences one at a time and finds out whether they agree.');
                }
                X = sys[0].r; Mod = sys[0].m;
                var st0 = S.step('Start with the first congruence');
                st0.p('$' + cong(X, Mod) + '$ means $x = ' + T(X) + ' + ' + T(Mod) + ' k$ for some integer $k$.');
                for (var t = 1; t < k && ok; t++) {
                    var c = sys[t], A = Mod % c.m, B = nt.mod(c.r - X, c.m), g = nt.gcd(A, c.m);
                    var st = S.step('Add $' + cong(c.r, c.m) + '$');
                    st.p('Put $x = ' + T(X) + ' + ' + T(Mod) + ' k$ into it and solve for $k$:');
                    st.lines([T(X) + ' + ' + T(Mod) + ' k &\\equiv ' + T(c.r) + ' \\pmod{' + T(c.m) + '}',
                        T(A) + ' k &\\equiv ' + T(c.r) + ' - ' + P(X) + ' \\equiv ' + T(B) + ' \\pmod{' + T(c.m) + '}']);
                    if (B % g !== 0n) {
                        st.check(false, '$\\gcd(' + T(Mod) + ', ' + T(c.m) + ') = ' + T(g) + '$ does not divide $' + T(B) + '$, so there is no $k$.');
                        st.p('The reason: so far $' + cong(X, Mod) + '$, which forces $x \\equiv ' + T(X % g) + ' \\pmod{' + T(g) + '}$, but this congruence forces $x \\equiv ' + T(c.r % g) + ' \\pmod{' + T(g) + '}$. Both moduli are multiples of $' + T(g) + '$, so the two conditions contradict each other.');
                        ok = false;
                        break;
                    }
                    var m1 = c.m / g, A1 = A / g, B1 = B / g, k0;
                    if (m1 === 1n) {
                        k0 = 0n;
                        st.p('Here $' + T(c.m) + '$ divides $' + T(Mod) + '$ and the remainders agree, so this congruence adds nothing new: every $k$ works.');
                    } else {
                        if (g > 1n) st.p('$g = \\gcd(' + T(A) + ', ' + T(c.m) + ') = ' + T(g) + '$ divides $' + T(B) + '$; divide by it: $' + T(A1) + ' k \\equiv ' + T(B1) + ' \\pmod{' + T(m1) + '}$.');
                        var inv = nt.inv(A1, m1);
                        k0 = nt.mod(B1 * inv, m1);
                        st.p('The inverse of $' + T(A1) + '$ modulo $' + T(m1) + '$ is $' + T(inv) + '$ (extended Euclid; check: $' + T(A1) + ' \\cdot ' + T(inv) + ' = ' + T(A1 * inv) + ' \\equiv 1$), so');
                        st.math('k \\equiv ' + T(B1) + ' \\cdot ' + T(inv) + ' \\equiv ' + T(k0) + ' \\pmod{' + T(m1) + '}');
                    }
                    var L = Mod * m1, nX = nt.mod(X + Mod * k0, L);
                    st.p('With $k = ' + T(k0) + ' + ' + T(m1) + ' j$:');
                    st.math('x = ' + T(X) + ' + ' + T(Mod) + ' \\cdot (' + T(k0) + ' + ' + T(m1) + ' j) = ' + T(X + Mod * k0) + ' + ' + T(L) + ' j');
                    st.p('So now $' + cong(nX, L) + '$' + (g > 1n ? ' (the new modulus is $\\operatorname{lcm}(' + T(Mod) + ', ' + T(c.m) + ') = ' + T(L) + '$)' : '') + '.');
                    X = nX; Mod = L;
                }
            }

            if (!ok) {
                S.result('The system has no solution', { copy: 'no solution' });
                S.note('Two of the congruences contradict each other modulo a common factor of their moduli.');
                return;
            }
            var ck = S.step('Check every congruence');
            orig.forEach(function (c) {
                var got = nt.mod(X, c.m);
                ck.check(got === nt.mod(c.r, c.m), '$' + T(X) + ' = ' + T(X / c.m) + ' \\cdot ' + T(c.m) + ' + ' + T(got) + ' \\equiv ' + T(c.r) + ' \\pmod{' + T(c.m) + '}$');
            });
            S.result('$' + cong(X, Mod) + '$', { copy: X + ' mod ' + Mod });
            S.note('The smallest non-negative solution is $' + T(X) + '$; all solutions are $' + T(X) + ' + ' + T(Mod) + ' j$ for integers $j$.');
        }
    });
})();
