/* Toolbox: the sieve of Eratosthenes up to N, drawn as a grid of crossed-out numbers (round by round for small N),
   the list and count of the primes; and the next and previous prime of any number, candidate by candidate. */
Calc.tool({
    id: 'prime-sieve',
    live: true,
    inputs: [
        { id: 'mode', type: 'select', label: 'Find', width: 'l', value: 'sieve', options: [['sieve', 'All primes up to N (sieve)'], ['near', 'The next and previous prime of n']] },
        { id: 'N', label: 'Up to $N$', placeholder: '100', min: 2, max: 3000, when: { mode: 'sieve' }, help: 'At most 3000.' },
        { id: 'n', label: 'Number $n$', width: 'l', placeholder: '2^64', when: { mode: 'near' }, help: 'Any whole number up to 2048 bits.' }
    ],
    examples: [{ mode: 'sieve', N: '100' }, { mode: 'near', n: '100' }, { mode: 'sieve', N: '30' }, { mode: 'sieve', N: '1000' }, { mode: 'near', n: '2^64' }, { mode: 'near', n: '1' }],
    run: async function (v, S) {
        var nt = Calc.lib.nt, P = Calc.lib.primes, T = Calc.lib.primes.T;
        if (v.mode === 'near') return near(v.n);
        var N = Number(v.N), COLS = 10, crossed = new Int32Array(N + 1);   // crossed[k] = the prime that crossed k out first
        function grid(newBy, final) {
            var rows = [];
            for (var r0 = 0; r0 * COLS < N; r0++) {
                var row = [];
                for (var c = 1; c <= COLS; c++) {
                    var k = r0 * COLS + c;
                    if (k > N) { row.push(''); continue; }
                    if (k === 1) row.push('$1$');
                    else if (crossed[k]) row.push(crossed[k] === newBy ? { v: '$\\cancel{' + k + '}$', hl: true } : '$\\cancel{' + k + '}$');
                    else row.push(final ? { v: '$\\mathbf{' + k + '}$', hl: true } : '$' + k + '$');
                }
                rows.push(row);
            }
            return rows;
        }
        var head = [];
        S.step('Write down the numbers from 2 to $' + N + '$').p('1 is not prime, so it stays out of the game. The first number not crossed out, 2, is prime. Then repeat: take the next number that is not crossed out, which is the next prime $p$, and cross out its multiples.');
        var small = N <= 150, rounds = [];
        for (var p = 2; p * p <= N; p++) {
            if (crossed[p]) continue;
            var fresh = [];
            for (var m = p * p; m <= N; m += p) if (!crossed[m]) { crossed[m] = p; fresh.push(m); }
            rounds.push({ p: p, fresh: fresh });
            var st = S.step('Cross out the multiples of $' + p + '$');
            st.p('Start at $' + p + '^2 = ' + (p * p) + '$' + (p > 2 ? ' (the smaller multiples $k \\cdot ' + p + '$ with $k < ' + p + '$ are already crossed out, as multiples of a smaller prime)' : '') + ' and go up in steps of $' + p + '$. New: ' + fresh.length + ' number' + (fresh.length === 1 ? '' : 's') + (fresh.length ? ' ($' + fresh.slice(0, 16).join(', ') + (fresh.length > 16 ? ', \\dots' : '') + '$)' : '') + '.');
            if (small) st.table(head, grid(p, false), { mono: true });
        }
        var last = rounds.length ? rounds[rounds.length - 1].p : 1;
        var primes = [];
        for (var k = 2; k <= N; k++) if (!crossed[k]) primes.push(k);
        var nextP = primes.filter(function (q) { return q > last; })[0];
        var sf = S.step('Stop: what is left is prime');
        sf.p(nextP && nextP * nextP > N ? 'The next prime, $' + nextP + '$, has $' + nextP + '^2 = ' + (nextP * nextP) + ' > ' + N + '$, so it has no multiples left to cross out: every composite up to $' + N + '$ has a prime factor at most $\\sqrt{' + N + '} \\approx ' + Math.sqrt(N).toFixed(2) + '$, and those are done.' : 'Every composite up to $' + N + '$ has a prime factor at most $\\sqrt{' + N + '}$, and those are done.');
        sf.table(head, grid(-1, true), { mono: true, max: 30, caption: 'Highlighted: the primes. Crossed out: the composites.' });
        S.result(['$\\pi(' + N + ') = ' + primes.length + '$ primes up to ' + N, P.mlist(primes)], { copy: primes.join(', '), label: primes.length + ' primes' });
        S.note('The prime number theorem predicts about $N / \\ln N \\approx ' + Math.round(N / Math.log(N)) + '$ (a slight underestimate).');
        S.step('Count by tens and hundreds').table(['range', 'primes'], (function () {
            var out = [], step = N <= 200 ? 10 : N <= 1000 ? 100 : 500;
            for (var lo = 1; lo <= N; lo += step) {
                var hi = Math.min(N, lo + step - 1), c = primes.filter(function (q) { return q >= lo && q <= hi; }).length;
                out.push(['$' + lo + '$ to $' + hi + '$', '$' + c + '$']);
            }
            return out;
        })(), { max: 12 });

        async function near(n) {
            if (nt.bitLength(n) > 2048) Calc.fail('At most 2048 bits.', 'n');
            var SMALLP = P.primesUpTo(1000).map(BigInt);
            function why(c) {
                for (var i = 0; i < SMALLP.length && SMALLP[i] < c; i++) if (c % SMALLP[i] === 0n) return { prime: false, text: 'divisible by $' + SMALLP[i] + '$' };
                if (c < 1000000n) return { prime: true, text: 'prime (no prime factor up to $\\sqrt{' + T(c) + '}$)' };
                var bs = P.mrBases(c).bases;
                for (var j = 0; j < bs.length; j++) if (!P.mr(c, bs[j]).pass) return { prime: false, text: 'Miller-Rabin witness $' + bs[j] + '$' };
                return { prime: true, text: c < P.MR_LIMIT ? 'prime (Miller-Rabin, exact bases)' : 'probable prime (Miller-Rabin, ' + bs.length + ' bases)' };
            }
            async function walk(dir) {
                var rows = [], c = n + BigInt(dir), res = null, count = 0;
                if (dir > 0 && c < 2n) c = 2n;
                while (c >= 2n) {
                    if (c > 2n && c % 2n === 0n) { c += BigInt(dir); continue; }
                    var w = why(c);
                    if (rows.length < 400) rows.push(['$' + T(c) + '$', w.prime ? { v: w.text, hl: true } : w.text]);
                    if (w.prime) { res = { p: c, how: w.text }; break; }
                    c += BigInt(2 * dir);
                    if (++count % 20 === 0) await S.tick();
                }
                return { rows: rows, res: res };
            }
            var self = why(n < 2n ? 2n : n);
            S.step('Is $n = ' + T(n) + '$ itself prime?').p(n < 2n ? 'No, primes start at 2.' : self.prime ? 'Yes: ' + self.text + '. Its neighbours are searched below.' : 'No: ' + self.text + '.');
            var up = await walk(1), dn = n > 2n ? await walk(-1) : { rows: [], res: null };
            var s1 = S.step('Search upwards from $' + T(n + 1n) + '$');
            s1.p('Even numbers above 2 are skipped. Each odd candidate is divided by the small primes, and survivors go through Miller-Rabin:');
            s1.table(['candidate', 'verdict'], up.rows, { mono: true, max: 20 });
            var s2 = S.step('Search downwards from $' + T(n - 1n) + '$');
            if (n <= 2n) s2.p('There is no prime below $' + T(n) + '$: the smallest prime is 2.');
            else s2.table(['candidate', 'verdict'], dn.rows, { mono: true, max: 20 });
            var lines = [], copy = [];
            lines.push('Previous prime: ' + (dn.res ? '$' + T(dn.res.p) + '$' : 'none'));
            lines.push('Next prime: $' + T(up.res.p) + '$');
            copy.push('previous = ' + (dn.res ? dn.res.p : 'none'), 'next = ' + up.res.p);
            S.result(lines, { copy: copy.join('\n') });
            if (dn.res) S.note('The gap between them is $' + T(up.res.p - dn.res.p) + '$; near $n$ the average gap is about $\\ln n \\approx ' + Math.round(nt.bitLength(n) * Math.LN2) + '$.');
        }
    }
});
