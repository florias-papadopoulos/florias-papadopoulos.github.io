/* Toolbox: the birthday bound (collision probability among k values out of N, exact and approximated, the number
   of tries for 50%) and brute force time for a key size at a given rate, with the security levels of common keys. */
Calc.tool({
    id: 'birthday-bound',
    live: true,
    inputs: [
        { id: 'what', type: 'select', label: 'Compute', width: 'l', value: 'coll', options: [['coll', 'Collision probability (birthday bound)'], ['brute', 'Brute force time for a key']] },
        { id: 'N', label: 'Number of possible values $N$', placeholder: '365', width: 'l', min: 1, help: 'For example 365, or 2^64 for a 64-bit hash.', when: { what: 'coll' } },
        { id: 'k', label: 'Number of values drawn $k$', placeholder: '23', width: 'l', min: 0, when: { what: 'coll' } },
        { id: 'bits', label: 'Key size in bits', placeholder: '128', min: 1, max: 4096, when: { what: 'brute' } },
        { id: 'rate', type: 'num', label: 'Keys tried per second', placeholder: '1e12', when: { what: 'brute' }, help: 'For example 1e12; the whole Bitcoin network does about 1e21 hashes per second.' }
    ],
    examples: [
        { what: 'coll', N: '365', k: '23' },
        { what: 'coll', N: '2^64', k: '2^32' },
        { what: 'brute', bits: '128', rate: '1e12' },
        { what: 'brute', bits: '56', rate: '1e9' },
        { what: 'coll', N: '2^128', k: '1e12' }
    ],
    run: function (v, S) {
        var LN2 = Math.LN2;
        /* x as a TeX number: plain for moderate sizes, a \cdot 10^b otherwise */
        function num(x, dig) {
            dig = dig || 4;
            if (x === 0) return '0';
            if (!isFinite(x)) return '\\infty';
            var ax = Math.abs(x);
            if (ax >= 1e-4 && ax < 1e6) return String(+x.toPrecision(dig));
            var e = Math.floor(Math.log10(ax)), mant = x / Math.pow(10, e);
            if (Math.abs(mant) >= 9.9995) { mant /= 10; e++; }
            mant = +mant.toPrecision(dig);
            return (mant === 1 ? '' : mant === -1 ? '-' : mant + ' \\cdot ') + '10^{' + e + '}';
        }
        /* a number given as log10 */
        function numLog(l10, dig) {
            if (l10 < 300 && l10 > -300) return num(Math.pow(10, l10), dig);
            var e = Math.floor(l10);
            return (+Math.pow(10, l10 - e).toPrecision(dig || 4)) + ' \\cdot 10^{' + e + '}';
        }
        function log2Big(n) { var s = n.toString(2), top = s.slice(0, 53); return (s.length - top.length) + Math.log2(parseInt(top, 2)); }
        function pw(n) { var l = log2Big(n); return n > 1000n ? ' \\approx 2^{' + (+l.toFixed(2)) + '}' : ''; }
        var T = Calc.lib.modern.tex;

        if (v.what === 'coll') {
            var N = v.N, k = v.k;
            if (Calc.lib.nt.bitLength(N) > 1000) Calc.fail('N is limited to 2^1000 here.', 'N');
            if (k > N) {
                S.result(['$P = 1$'], { copy: '1', label: 'Collision probability' });
                S.step('Pigeonhole principle').p('$k = ' + T(k) + '$ values cannot all be different when there are only $N = ' + T(N) + '$ possibilities: a collision is certain.');
                return;
            }
            var Nf = Number(N), kf = Number(k), lnQ, exact;
            /* ln of the probability of no collision, prod_{i<k} (1 - i/N) */
            if (kf <= 1e6) {
                lnQ = 0;
                for (var i = 1; i < kf; i++) lnQ += Math.log1p(-i / Nf);
                exact = true;
            } else if (kf * kf / (2 * Nf) > 800) { lnQ = -Infinity; exact = false; }
            else {
                var r = kf / Nf, s1 = kf * (kf - 1) / 2, s2 = (kf - 1) * kf * (2 * kf - 1) / 6, s3 = s1 * s1;
                lnQ = -(s1 / Nf + s2 / (2 * Nf * Nf) + s3 / (3 * Nf * Nf * Nf));
                exact = r < 1e-3;
            }
            var P = -Math.expm1(lnQ), Q = Math.exp(lnQ);
            var s0 = S.step('No collision among $k$ values: multiply the chances');
            s0.p('Draw $k$ values uniformly from $N$ possibilities. The first is free; the second must avoid 1 value, the third 2 values, and so on. So');
            s0.math('\\Pr[\\text{no collision}] = \\prod_{i=1}^{k-1} \\left(1 - \\frac{i}{N}\\right) = \\frac{N}{N} \\cdot \\frac{N-1}{N} \\cdots \\frac{N-k+1}{N}');
            if (kf <= 2000 && Nf < 1e15) {
                var rows = [], run = 1;
                for (var j = 1; j < kf; j++) {
                    run *= 1 - j / Nf;
                    rows.push(['$' + (j + 1) + '$', '$\\frac{' + T(N - BigInt(j)) + '}{' + T(N) + '}$', '$' + num(run, 5) + '$', '$' + num(1 - run, 5) + '$']);
                }
                if (rows.length) s0.table(['Value number', 'Chance it avoids the earlier ones', 'No collision so far', 'Collision so far'], rows, { hl: rows.length - 1 });
            }
            s0.math('\\Pr[\\text{no collision}] = ' + (P < 1e-4 ? '1 - ' + num(P, 6) : num(Q, 6)) + ', \\qquad P = 1 - \\Pr[\\text{no collision}] = ' + (P > 0.9999 && Q > 0 ? '1 - ' + num(Q, 4) : num(P, 6)));
            if (!exact) s0.p(lnQ === -Infinity ? 'The product is far below any floating point number: a collision is certain for all practical purposes.' : 'For large $k$ the logarithm of the product is computed with the series $\\ln \\prod (1 - i/N) = -\\sum_i i/N - \\sum_i i^2/(2N^2) - \\ldots$, which is precise here because $k \\ll N$.');
            var x2 = kf * (kf - 1) / (2 * Nf), x1 = kf * kf / (2 * Nf);
            var sa = S.step('The birthday approximations');
            sa.p('Since $1 - x \\approx e^{-x}$ for small $x$, the product is about $e^{-(1 + 2 + \\cdots + (k-1))/N} = e^{-k(k-1)/(2N)}$:');
            sa.lines([
                'P &\\approx 1 - e^{-k(k-1)/(2N)} = ' + num(-Math.expm1(-x2), 6),
                'P &\\approx 1 - e^{-k^2/(2N)} = ' + num(-Math.expm1(-x1), 6),
                'P &\\le \\frac{k(k-1)}{2N} = ' + num(x2, 6) + ' \\quad \\text{(union bound over the } \\tbinom{k}{2} \\text{ pairs)}'
            ]);
            /* how many for 50 % */
            var half, halfExact = false;
            if (Nf <= 1e12) {
                var q = 1, c = 1;
                while (q > 0.5) { q *= 1 - c / Nf; c++; }
                half = c; halfExact = true;
            } else half = 0.5 + Math.sqrt(0.25 + 2 * Nf * LN2);
            var s2 = S.step('How many values for a 50% chance');
            s2.p('Setting $e^{-k^2/(2N)} = 1/2$ gives $k \\approx \\sqrt{2 \\ln 2 \\cdot N} \\approx 1.1774 \\sqrt{N}$:');
            s2.math('k_{50\\%} \\approx 1.1774 \\cdot \\sqrt{' + T(N) + '} \\approx ' + num(1.1774100225154747 * Math.sqrt(Nf), 5) + (Nf > 1000 ? ' \\approx 2^{' + (+(Math.log2(Nf) / 2 + 0.2357).toFixed(2)) + '}' : ''));
            if (halfExact) s2.p('Exactly, from the product: the smallest $k$ with $P \\ge 1/2$ is $k = ' + T(BigInt(half)) + '$.');
            s2.p('This square root is why an $n$-bit hash offers only $n/2$ bits of collision resistance: SHA-256 collisions take about $2^{128}$ evaluations, a 64-bit tag collides after about $2^{32}$ messages.');
            S.result(['$P = ' + (P > 0.9999 && Q > 0 ? '1 - ' + num(Q, 4) : num(P, 6)) + '$' + (P >= 1e-4 && P <= 0.9999 ? ' (' + (+(100 * P).toPrecision(4)) + '%)' : ''), 'A 50% chance needs about $' + (halfExact ? T(BigInt(half)) : num(half, 4)) + '$ values'], { copy: String(P), label: 'Collision probability' });
            S.note('$N = ' + T(N) + pw(N) + '$, $k = ' + T(k) + pw(k) + '$.');
            return;
        }

        /* brute force */
        var bits = Number(v.bits), rate = v.rate;
        if (!(rate > 0)) Calc.fail('The rate must be a positive number of keys per second.', 'rate');
        var l10keys = bits * Math.log10(2), l10s = l10keys - Math.log10(rate), l10avg = l10s - Math.log10(2);
        var YEAR = 365.25 * 86400, AGE = 1.38e10;
        /* a duration given as log10 of seconds, in the largest fitting unit: [value as log10, unit] */
        function unit(l10) {
            if (l10 < Math.log10(120)) return [l10, 'seconds'];
            if (l10 < Math.log10(7200)) return [l10 - Math.log10(60), 'minutes'];
            if (l10 < Math.log10(2 * 86400)) return [l10 - Math.log10(3600), 'hours'];
            if (l10 < Math.log10(2 * YEAR)) return [l10 - Math.log10(86400), 'days'];
            return [l10 - Math.log10(YEAR), 'years'];
        }
        function dur(l10) { var u = unit(l10); return numLog(u[0], 3) + '\\ \\text{' + u[1] + '}'; }
        function durPlain(l10) { var u = unit(l10), e = Math.floor(u[0]); return (u[0] < 6 ? String(+Math.pow(10, u[0]).toPrecision(3)) : (+Math.pow(10, u[0] - e).toPrecision(3)) + 'e' + e) + ' ' + u[1]; }
        var sb = S.step('Count the keys');
        sb.math('2^{' + bits + '} = ' + (bits <= 64 ? T(2n ** BigInt(bits)) : numLog(l10keys, 5)) + '\\ \\text{keys}');
        var st = S.step('Divide by the rate');
        st.p('Trying $' + num(rate, 4) + '$ keys per second, the whole key space takes');
        st.math('\\frac{2^{' + bits + '}}{' + num(rate, 4) + '\\ /\\text{s}} = ' + numLog(l10s, 4) + '\\ \\text{s} \\approx ' + dur(l10s));
        st.p('On average the key is found halfway, after $2^{' + (bits - 1) + '}$ tries: $' + dur(l10avg) + '$.');
        var ratio = l10s - Math.log10(YEAR) - Math.log10(AGE);
        if (ratio > 0) st.p('That is about $' + numLog(ratio, 3) + '$ times the age of the universe ($1.38 \\cdot 10^{10}$ years).');
        S.result(['Whole key space: $' + dur(l10s) + '$', 'On average: $' + dur(l10avg) + '$'], { copy: durPlain(l10avg), label: 'Brute force of a ' + bits + '-bit key' });
        S.step('Bits of security of common choices').p('Security levels in bits, as in NIST SP 800-57 and the post-quantum categories: $b$ bits means about $2^b$ operations for the best known attack.')
            .table(['Scheme', 'Classical attacker', 'Quantum attacker'], [
                ['DES (56-bit key)', '$56$', '$28$ (Grover)'],
                ['AES-128', '$128$', '$64$ (Grover)'],
                ['AES-256', '$256$', '$128$ (Grover)'],
                ['SHA-256, collisions', '$128$ (birthday bound)', 'about $128$ in practice'],
                ['RSA-2048', '$112$', 'broken (Shor)'],
                ['RSA-3072', '$128$', 'broken (Shor)'],
                ['Elliptic curves P-256, Curve25519', '$128$', 'broken (Shor)'],
                ['ML-KEM-768 (Kyber)', 'category 3, like AES-192', 'category 3, like AES-192']
            ]);
        S.note('Grover\'s algorithm needs about $2^{n/2}$ sequential quantum evaluations for an $n$-bit key, which is why 256-bit keys are recommended for long-term security.');
    }
});
