/* Toolbox: binomial coefficients C(n, k): the product formula with the factors cancelled, the running product for
   larger k, Pascal's triangle with the entry highlighted and Pascal's rule as a check; modulo a prime p with
   Lucas' theorem (digits of n and k in base p). */
Calc.tool({
    id: 'binomial',
    live: true,
    inputs: [
        { id: 'n', label: '$n$ (the set size)', placeholder: '10', min: 0 },
        { id: 'k', label: '$k$ (how many are chosen)', placeholder: '3', min: 0 },
        { id: 'mode', type: 'select', label: 'Compute', width: 'l', value: 'exact', options: [['exact', 'The exact value'], ['mod', 'Modulo a prime p (Lucas)']] },
        { id: 'p', label: 'Prime $p$', placeholder: '7', min: 2, when: { mode: 'mod' } }
    ],
    examples: [
        { n: '10', k: '3', mode: 'exact' },
        { n: '49', k: '6', mode: 'exact' },
        { n: '1000', k: '500', mode: 'mod', p: '13' },
        { n: '52', k: '5', mode: 'exact' },
        { n: '10^20', k: '10^10', mode: 'mod', p: '7' },
        { n: '200', k: '100', mode: 'exact' }
    ],
    run: async function (v, S) {
        var gm = Calc.lib.gmath, nt = Calc.lib.nt, T = Calc.tex, B = gm.bigTex;
        var n = v.n, k = v.k;
        var C = '\\binom{' + T(n) + '}{' + T(k) + '}';
        /* exact C(n, k) by the running product, or null when too much work */
        function exact(n, k) {
            if (k > n) return 0n;
            if (n - k < k) k = n - k;
            if (k > 20000n) return null;
            var c = 1n;
            for (var i = 1n; i <= k; i++) c = c * (n - i + 1n) / i;
            return c;
        }

        if (v.mode === 'mod') {
            var p = v.p;
            if (p > 10n ** 18n) Calc.fail('A prime of at most 18 digits, please.', 'p');
            if (!nt.isPrime(p)) Calc.fail(p + ' is not prime. Lucas\' theorem needs a prime modulus.', 'p');
            var nd = [], kd = [], x = n, y = k;
            while (x > 0n || y > 0n) { nd.push(x % p); kd.push(y % p); x /= p; y /= p; if (nd.length > 3000) Calc.fail('n has too many digits in base p; use a larger p or a smaller n.', 'n'); }
            if (!nd.length) { nd.push(0n); kd.push(0n); }
            /* C(a, b) mod p for digits a, b < p */
            function small(a, b) {
                if (b > a) return { r: 0n, why: '$' + T(b) + ' > ' + T(a) + '$, so it is 0' };
                var bb = a - b < b ? a - b : b;
                if (bb > 100000n) Calc.fail('A digit of k in base p is too large to handle (over 100000 factors); use a smaller prime.', 'p');
                var num = 1n, den = 1n;
                for (var i = 1n; i <= bb; i++) { num = num * (a - i + 1n) % p; den = den * i % p; }
                var r = num * nt.inv(den, p) % p, ex = bb <= 40n ? exact(a, b) : null;
                return { r: r, why: ex !== null && ex < 10n ** 30n ? '$\\binom{' + T(a) + '}{' + T(b) + '} = ' + T(ex) + (ex === r ? '' : ' \\equiv ' + T(r)) + '$' : '$\\equiv ' + T(r) + '$ (product formula modulo $' + T(p) + '$)' };
            }
            var s1 = S.step('Write $n$ and $k$ in base $' + T(p) + '$');
            s1.p('Divide by $' + T(p) + '$ again and again; the remainders are the digits, the last digit first.');
            var digitsTex = function (d) { return d.slice().reverse().map(function (x) { return p < 10n ? String(x) : '(' + T(x) + ')'; }).join(p < 10n ? '' : '\\,'); };
            s1.math('n = ' + B(n) + ' = ' + digitsTex(nd) + '_{' + T(p) + '}').math('k = ' + B(k) + ' = ' + digitsTex(kd) + '_{' + T(p) + '}');
            var res = 1n, rows = [], zero = false, factors = [];
            for (var i = 0; i < nd.length; i++) {
                var sm = small(nd[i], kd[i]);
                if (sm.r === 0n) zero = true;
                res = res * sm.r % p;
                factors.push('\\binom{' + T(nd[i]) + '}{' + T(kd[i]) + '}');
                rows.push([i, '$' + T(nd[i]) + '$', '$' + T(kd[i]) + '$', sm.r === 0n ? { v: sm.why, hl: true } : sm.why]);
            }
            var s2 = S.step('Lucas\' theorem: one small binomial per digit');
            s2.p('For a prime $p$, $\\binom{n}{k} \\equiv \\prod_i \\binom{n_i}{k_i} \\pmod p$, where $n_i$ and $k_i$ are the base $p$ digits (and $\\binom{a}{b} = 0$ when $b > a$).');
            s2.table(['Position $i$', '$n_i$', '$k_i$', '$\\binom{n_i}{k_i} \\bmod ' + T(p) + '$'], rows.slice().reverse(), { mono: true });
            var s3 = S.step('Multiply');
            if (factors.length <= 12) s3.math(C + ' \\equiv ' + factors.slice().reverse().join(' \\cdot ') + ' \\equiv ' + T(res) + ' \\pmod{' + T(p) + '}');
            else s3.math(C + ' \\equiv ' + T(res) + ' \\pmod{' + T(p) + '}');
            if (zero) s3.p('A digit of $k$ is larger than the digit of $n$ at the same position, so the product is 0: $p$ divides $\\binom{n}{k}$ (by Kummer\'s theorem, adding $k$ and $n - k$ in base $p$ has a carry).');
            var ex2 = n <= 10n ** 6n ? exact(n, k) : null;
            if (ex2 !== null) s3.check(ex2 % p === res, 'Direct check: $' + C + ' = ' + B(ex2) + '$, and its remainder modulo $' + T(p) + '$ is $' + T(ex2 % p) + '$');
            S.result('$' + C + ' \\equiv ' + T(res) + ' \\pmod{' + T(p) + '}$', { copy: String(res) });
            return;
        }

        if (k > n) {
            S.result('$' + C + ' = 0$', { copy: '0' });
            S.step('More chosen than there are').p('There is no way to choose $' + T(k) + '$ things from only $' + T(n) + '$, so the coefficient is 0 (this is also what the formulas and Pascal\'s triangle give).');
            return;
        }
        var kk = n - k < k ? n - k : k;
        if (kk > 20000n) Calc.fail('That needs over 20000 factors; for huge n and k use the modulo p mode.', 'k');
        if (kk !== k) S.step('Use the symmetry').p('Choosing $' + T(k) + '$ to take is the same as choosing $' + T(n - k) + '$ to leave, so $\\binom{n}{k} = \\binom{n}{n-k}$ and the shorter product is enough:').math(C + ' = \\binom{' + T(n) + '}{' + T(kk) + '}');
        var val;
        if (kk === 0n) {
            val = 1n;
            S.step('Choosing none or all').p('There is exactly one way: take nothing (or take everything). $0! = 1$.').math('\\binom{' + T(n) + '}{0} = 1');
        } else if (kk <= 12n && n < 10n ** 12n) {
            var K = Number(kk), num = [], den = [];
            for (var i2 = 0; i2 < K; i2++) { num.push(n - BigInt(i2)); den.push(BigInt(K - i2)); }
            var s = S.step('The product formula');
            s.p('$\\binom{n}{k} = \\dfrac{n (n-1) \\cdots (n-k+1)}{k!}$: the first $k$ factors of $n!$ over $k!$.');
            s.math('\\binom{' + T(n) + '}{' + T(kk) + '} = \\frac{' + num.map(T).join(' \\cdot ') + '}{' + den.map(T).join(' \\cdot ') + '}');
            /* cancel every denominator factor against the numerator, by gcds */
            var top = num.slice(), rows = [];
            den.forEach(function (d) {
                if (d === 1n) return;
                var left = d, used = [];
                for (var j = 0; j < top.length && left > 1n; j++) {
                    var g = gm.gcd(left, top[j]);
                    if (g > 1n) { used.push('$' + T(top[j]) + ' \\to ' + T(top[j] / g) + '$'); top[j] /= g; left /= g; }
                }
                rows.push(['$' + T(d) + '$', used.join(', '), '$' + top.map(T).join(' \\cdot ') + '$']);
            });
            var s2b = S.step('Cancel the denominator');
            s2b.p('Every factor of the denominator divides out of the numerator (the result is a whole number), so cancel them one by one with gcds:');
            s2b.table(['Denominator factor', 'Cancelled in', 'Numerator left'], rows);
            val = top.reduce(function (a, b) { return a * b; }, 1n);
            s2b.math('\\binom{' + T(n) + '}{' + T(kk) + '} = ' + top.filter(function (x) { return x !== 1n; }).map(T).join(' \\cdot ') + ' = ' + T(val));
        } else {
            var rows2 = [], c = 1n;
            var s3b = S.step('The running product');
            s3b.p('Multiply by the next factor of the numerator and divide by the next factor of $k!$ at once: $\\binom{n}{i} = \\binom{n}{i-1} \\cdot \\dfrac{n - i + 1}{i}$. Each division is exact, because every intermediate value is itself a binomial coefficient.');
            for (var i3 = 1n; i3 <= kk; i3++) {
                c = c * (n - i3 + 1n) / i3;
                if (i3 <= 300n || i3 > kk - 60n) rows2.push(['$' + T(i3) + '$', '$\\cdot \\dfrac{' + T(n - i3 + 1n) + '}{' + T(i3) + '}$', '$\\binom{' + B(n) + '}{' + T(i3) + '} = ' + B(c) + '$']);
                if (i3 % 2000n === 0n) await S.tick();
            }
            s3b.table(['$i$', 'Factor', 'Value'], rows2, { mono: true, caption: kk > 360n ? 'Rows 1 to 300 and the last 60:' : '' });
            val = c;
        }
        S.result('$' + C + ' = ' + B(val) + '$', { copy: String(val) });
        if (String(val).length > 15) S.note('$' + C + '$ has ' + String(val).length + ' digits' + (String(val).length > 60 ? '; Copy gives all of them' : '') + '.');
        if (String(val).length > 60 && String(val).length <= 5000) S.step('All the digits').pre(gm.wrap(val));

        /* Pascal */
        if (n <= 16n) {
            var N = Number(n), K2 = Number(k), prow = [1n], trows = [];
            var head = ['$n$'];
            for (var j2 = 0; j2 <= N; j2++) head.push('$k=' + j2 + '$');
            for (var r = 0; r <= N; r++) {
                var cells = ['$' + r + '$'];
                for (var j3 = 0; j3 <= N; j3++) cells.push(j3 <= r ? (r === N && j3 === K2 ? { v: '$' + prow[j3] + '$', hl: true } : (r === N - 1 && (j3 === K2 || j3 === K2 - 1) ? { v: String(prow[j3]), hl: true } : String(prow[j3]))) : '');
                trows.push(cells);
                var next = [1n];
                for (var t = 1; t <= r; t++) next.push(prow[t - 1] + prow[t]);
                next.push(1n);
                prow = next;
            }
            S.step('Pascal\'s triangle').p('Each entry is the sum of the two above it. Row $' + N + '$, position $' + K2 + '$ is the answer' + (N ? '; the two entries it comes from are highlighted in the row above' : '') + '.').table(head, trows, { mono: true, max: 20 });
        }
        if (n >= 1n && k >= 1n && kk <= 5000n) {
            var a1 = exact(n - 1n, k - 1n), a2 = exact(n - 1n, k);
            if (a1 !== null && a2 !== null) S.step('Check with Pascal\'s rule').math(C + ' = \\binom{' + T(n - 1n) + '}{' + T(k - 1n) + '} + \\binom{' + T(n - 1n) + '}{' + T(k) + '} = ' + B(a1) + ' + ' + B(a2) + ' = ' + B(a1 + a2)).check(a1 + a2 === val, 'Pascal\'s rule gives the same number');
        }
    }
});
