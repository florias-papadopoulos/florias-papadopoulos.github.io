/* Toolbox: Shamir secret sharing over F_p: split a secret into n shares with threshold t (a random polynomial of
   degree t - 1, shown or given), and reconstruct by Lagrange interpolation at 0 with every basis coefficient. */
Calc.tool({
    id: 'shamir-secret-sharing',
    inputs: [
        { id: 'p', label: 'Prime $p$ (the field)', placeholder: '1613' },
        { id: 's', type: 'text', label: 'Secret $s$ (to split)', placeholder: '1234', optional: true },
        { id: 'n', type: 'text', label: 'Number of shares $n$', placeholder: '6', optional: true, width: 's' },
        { id: 't', type: 'text', label: 'Threshold $t$', placeholder: '3', optional: true, width: 's' },
        { id: 'coef', type: 'text', label: 'Coefficients $a_1, \\ldots, a_{t-1}$', placeholder: '166, 94', optional: true, width: 'l', help: 'Empty: drawn at random.' },
        { id: 'shares', type: 'textarea', label: 'Shares $(x, y)$ (to reconstruct)', placeholder: '(1, 1494), (2, 329), (3, 965)', optional: true, rows: 2 }
    ],
    actions: [{ id: 'split', label: 'Split' }, { id: 'join', label: 'Reconstruct' }],
    examples: [
        { p: '1613', s: '1234', n: '6', t: '3', coef: '166, 94', shares: '' },
        { p: '1613', s: '', n: '', t: '', coef: '', shares: '(2, 329), (4, 176), (6, 775)', _action: 'join' },
        { p: '2^127 - 1', s: '31415926535897932384626433832795', n: '5', t: '3', coef: '', shares: '' },
        { p: '101', s: '42', n: '4', t: '2', coef: '', shares: '' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, T = Calc.lib.modern.tex, p = v.p;
        M.needPrime(p, 'p', 'p');
        if (nt.bitLength(p) > 1024) Calc.fail('p has more than 1024 bits; this walkthrough stops there.', 'p');

        /* Lagrange interpolation at 0 through the points (x_i, y_i), written into step s; returns the value */
        function lagrange(s, pts, detail) {
            var lams = [];
            var rows = pts.map(function (P, i) {
                var num = 1n, den = 1n, nf = [], df = [];
                pts.forEach(function (Q, j) { if (j === i) return; num *= Q.x; den *= Q.x - P.x; nf.push(T(Q.x)); df.push('(' + T(Q.x) + ' - ' + T(P.x) + ')'); });
                var dm = nt.mod(den, p), inv = nt.inv(dm, p), lam = nt.mod(num, p) * inv % p;
                lams.push(lam);
                return ['$' + (i + 1) + '$', nf.length ? '$\\frac{' + nf.join(' \\cdot ') + '}{' + df.join('') + '} = \\frac{' + T(num) + '}{' + T(den) + '}$' : '$1$ (empty product)', '$' + T(dm) + '^{-1} \\equiv ' + T(inv) + '$', { v: '$\\lambda_{' + (i + 1) + '} \\equiv ' + T(lam) + '$', hl: true }];
            });
            if (detail) {
                s.p('The polynomial of degree below $k = ' + pts.length + '$ through the $k$ points is $f(x) = \\sum_i y_i \\ell_i(x)$, where the basis polynomial $\\ell_i$ is 1 at $x_i$ and 0 at every other $x_j$. Only $f(0)$ is needed, so each basis polynomial is evaluated at 0:');
                s.math('\\lambda_i = \\ell_i(0) = \\prod_{j \\ne i} \\frac{0 - x_j}{x_i - x_j} = \\prod_{j \\ne i} \\frac{x_j}{x_j - x_i} \\pmod p');
            }
            s.table(['$i$', '$\\prod x_j \\,/\\, \\prod (x_j - x_i)$', 'Inverse of the denominator mod $p$', 'Coefficient'], rows, { mono: true });
            var sum = 0n, terms = [];
            pts.forEach(function (P, i) { sum += P.y * lams[i]; terms.push(T(P.y) + ' \\cdot ' + T(lams[i])); });
            var val = nt.mod(sum, p);
            s.math('f(0) = \\sum_i y_i \\lambda_i = ' + terms.join(' + ') + ' = ' + T(sum) + ' \\equiv ' + T(val) + ' \\pmod{' + T(p) + '}');
            return val;
        }

        if (v._action === 'split') {
            var sec = M.optInt(v.s, 's'), n = M.optInt(v.n, 'n'), t = M.optInt(v.t, 't');
            if (sec === null) Calc.fail('Please enter the secret.', 's');
            if (n === null) Calc.fail('Please enter the number of shares.', 'n');
            if (t === null) Calc.fail('Please enter the threshold.', 't');
            if (sec < 0n || sec >= p) Calc.fail('The secret must be a number from 0 to p - 1 = ' + (p - 1n) + '.', 's');
            if (n < 2n || n > 40n) Calc.fail('Take from 2 to 40 shares.', 'n');
            if (n >= p) Calc.fail('The shares are the points x = 1, ..., n, so n must be smaller than p.', 'n');
            if (t < 1n || t > n) Calc.fail('The threshold must be from 1 to n.', 't');
            var co = M.optList(v.coef, 'coef'), drawn = co === null;
            if (drawn) { co = []; for (var i = 1n; i < t; i++) co.push(M.rand(0n, p - 1n)); }
            if (BigInt(co.length) !== t - 1n) Calc.fail('Give t - 1 = ' + (t - 1n) + ' coefficients (or none to draw them).', 'coef');
            co = co.map(function (c) { return nt.mod(c, p); });
            var cs = [sec].concat(co);
            var poly = cs.map(function (c, i) { return i === 0 ? T(c) : T(c) + (i === 1 ? 'x' : 'x^{' + i + '}'); }).join(' + ');
            var s1 = S.step('A random polynomial of degree $t - 1 = ' + (t - 1n) + '$ with $f(0) = s$');
            s1.p((drawn ? 'The coefficients $a_1, \\ldots, a_{t-1}$ are drawn uniformly from $\\mathbb{F}_{' + T(p) + '}$ with the browser\'s random generator' : 'The given coefficients') + '; the constant term is the secret:');
            s1.math('f(x) = ' + (t === 1n ? T(sec) : poly) + ' \\pmod{' + T(p) + '}');
            if (t === 1n) s1.p('With $t = 1$ the polynomial is constant: every share is the secret itself.');
            var shares = [], rows = [];
            for (var x = 1n; x <= n; x++) {
                var y = 0n, parts = [];
                cs.forEach(function (c, i) { y += c * x ** BigInt(i); parts.push(i === 0 ? T(c) : T(c) + ' \\cdot ' + T(x) + (i > 1 ? '^{' + i + '}' : '')); });
                var ym = nt.mod(y, p);
                shares.push({ x: x, y: ym });
                rows.push(['$' + T(x) + '$', '$' + parts.join(' + ') + ' = ' + T(y) + '$', { v: '$(' + T(x) + ', ' + T(ym) + ')$', hl: true }]);
            }
            S.step('Evaluate $f$ at $x = 1, \\ldots, ' + T(n) + '$').p('Share $i$ is the point $(i, f(i))$, reduced modulo $p$:').table(['$x$', '$f(x)$', 'Share'], rows, { mono: true });
            var sc = S.step('Check: reconstruct from the first $t = ' + T(t) + '$ shares');
            var back = lagrange(sc, shares.slice(0, Number(t)), false);
            sc.check(back === sec, 'Lagrange interpolation gives the secret back: $' + T(back) + ' = s$');
            var list = shares.map(function (P) { return '(' + P.x + ', ' + P.y + ')'; }).join(', ');
            S.result(['$' + shares.map(function (P) { return '(' + T(P.x) + ', ' + T(P.y) + ')'; }).join(',\\ ') + '$'], { copy: list, label: 'Shares' });
            S.note('Any $' + T(t) + '$ shares give the secret; $' + T(t - 1n) + '$ or fewer reveal nothing about it, since for every candidate secret exactly one polynomial of degree $' + T(t - 1n) + '$ fits them.');
            return;
        }

        var raw = String(v.shares || '').replace(/[()[\]{}]/g, ' ').trim();
        if (!raw) Calc.fail('Please enter the shares to reconstruct, as (x, y) pairs.', 'shares');
        var nums = raw.split(/[\s,;]+/).filter(Boolean).map(function (w) { var r = M.optInt(w, 'shares'); return r; });
        if (nums.length % 2) Calc.fail('The shares are pairs (x, y): an even number of numbers.', 'shares');
        if (nums.length > 80) Calc.fail('At most 40 shares.', 'shares');
        var pts = [], seen = {};
        for (var k = 0; k < nums.length; k += 2) {
            var P = { x: nt.mod(nums[k], p), y: nt.mod(nums[k + 1], p) };
            if (P.x === 0n) Calc.fail('A share with x = 0 (mod p) would be the secret itself; shares have x from 1 to p - 1.', 'shares');
            if (seen[String(P.x)]) Calc.fail('Two shares have the same x = ' + P.x + '.', 'shares');
            seen[String(P.x)] = 1;
            pts.push(P);
        }
        var sj = S.step('Lagrange interpolation at $x = 0$ through the ' + pts.length + ' share' + (pts.length > 1 ? 's' : ''));
        var sv = lagrange(sj, pts, true);
        S.result(['$s = ' + T(sv) + '$'], { copy: String(sv), label: 'Secret' });
        S.note('This is the secret if the threshold was at most ' + pts.length + '. With fewer shares than the threshold the same computation gives a value unrelated to the secret, and nothing shows that it is wrong.');
    }
});
