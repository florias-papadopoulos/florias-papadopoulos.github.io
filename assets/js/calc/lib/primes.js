/* Toolbox: primes and number theory helpers with a record of the procedure (Calc.lib.primes), shared by the tools of
   data/toolbox/primes.yaml. Pure functions on BigInt; factorize() is async (it calls S.tick() so the page stays
   responsive and Stop works) and has a time budget. */
(function (G) {
    'use strict';
    var Calc = G.Calc;
    var P = Calc.lib.primes = {};
    function nt() { return Calc.lib.nt; }

    /* primes up to lim (numbers), by the sieve of Eratosthenes */
    var sieveCache = null;
    P.primesUpTo = function (lim) {
        if (sieveCache && sieveCache.lim >= lim) return sieveCache.list.filter(function (p) { return p <= lim; });
        var comp = new Uint8Array(lim + 1), out = [];
        for (var i = 2; i <= lim; i++) {
            if (comp[i]) continue;
            out.push(i);
            for (var j = i * i; j <= lim; j += i) comp[j] = 1;
        }
        sieveCache = { lim: lim, list: out };
        return out.slice();
    };

    /* a number inside math: grouped in threes like Calc.tex, but only up to 48 digits. KaTeX allows about 330 thin
       spaces (\\,) per formula, so long numbers and long lists must not be grouped. */
    P.T = function (n) { var s = String(n); return s.replace('-', '').length > 48 ? s : Calc.tex(n); };
    /* a list of numbers as separate formulas: $1$, $2$, $3$ (one formula per number keeps KaTeX within its limits) */
    P.mlist = function (xs) { return xs.map(function (x) { return '$' + P.T(x) + '$'; }).join(', '); };

    /* ---------- prime powers: display and arithmetic functions ---------- */
    /* factors [{p, e}] as TeX, e.g. 2^{3} \cdot 3^{2} \cdot 5 */
    P.tex = function (fs) {
        if (!fs.length) return '1';
        return fs.map(function (f) { return P.T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : ''); }).join(' \\cdot ');
    };
    /* as plain text, e.g. 2^3 * 3^2 * 5 */
    P.plain = function (fs) {
        if (!fs.length) return '1';
        return fs.map(function (f) { return String(f.p) + (f.e > 1 ? '^' + f.e : ''); }).join(' * ');
    };
    P.value = function (fs) { return fs.reduce(function (a, f) { return a * f.p ** BigInt(f.e); }, 1n); };
    P.phi = function (fs) { return fs.reduce(function (a, f) { return a * (f.p - 1n) * f.p ** BigInt(f.e - 1); }, 1n); };
    /* lambda of one prime power */
    P.lambdaPP = function (p, e) {
        if (p === 2n) return e === 1 ? 1n : e === 2 ? 2n : 2n ** BigInt(e - 2);
        return (p - 1n) * p ** BigInt(e - 1);
    };
    P.lambda = function (fs) { return fs.reduce(function (a, f) { return nt().lcm(a, P.lambdaPP(f.p, f.e)); }, 1n); };
    P.tau = function (fs) { return fs.reduce(function (a, f) { return a * BigInt(f.e + 1); }, 1n); };
    P.sigma = function (fs) { return fs.reduce(function (a, f) { return a * (f.p ** BigInt(f.e + 1) - 1n) / (f.p - 1n); }, 1n); };
    /* all divisors, sorted (only call when tau is small) */
    P.divisors = function (fs) {
        var ds = [1n];
        fs.forEach(function (f) {
            var next = [], pk = 1n;
            for (var k = 0; k <= f.e; k++) { ds.forEach(function (d) { next.push(d * pk); }); pk *= f.p; }
            ds = next;
        });
        return ds.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
    };
    /* Z_n^* is cyclic: n = 1, 2, 4, p^k or 2p^k with p an odd prime */
    P.cyclic = function (fs) {
        if (!fs.length) return true;
        if (fs.length === 1) return fs[0].p !== 2n || fs[0].e <= 2;
        return fs.length === 2 && fs[0].p === 2n && fs[0].e === 1;
    };

    /* ---------- Miller-Rabin ---------- */
    /* bases that make the test exact below a bound (Jaeschke; Sorenson and Webster) */
    var MR_SETS = [
        [2047n, 1], [1373653n, 2], [25326001n, 3], [3215031751n, 4], [2152302898747n, 5], [3474749660383n, 6],
        [341550071728321n, 7], [3825123056546413051n, 9], [318665857834031151167461n, 12], [3317044064679887385961981n, 13]
    ];
    var FIRST = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n];
    P.MR_LIMIT = 3317044064679887385961981n;
    /* {bases, exact, bound}: the bases to use for n (odd, n > 3) */
    P.mrBases = function (n, rounds) {
        for (var i = 0; i < MR_SETS.length; i++) if (n < MR_SETS[i][0]) return { bases: FIRST.slice(0, MR_SETS[i][1]), exact: true, bound: MR_SETS[i][0] };
        var bases = FIRST.slice(), x = 0x9E3779B97F4A7C15n;
        while (bases.length < (rounds || 20)) { x = (x * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn; bases.push(2n + (x >> 7n) % (n - 3n)); }
        return { bases: bases, exact: false, bound: null };
    };
    /* the whole Miller-Rabin round for base a: n - 1 = 2^s d, seq = a^d, a^{2d}, ..., a^{2^s d} (mod n).
       pass: seq[0] = 1 or seq[j] = n - 1 for some j < s. When it fails: kind 'fermat' (a^{n-1} != 1) or 'root' (a
       square root y of 1 that is not +-1, which gives the factor gcd(y - 1, n)). */
    P.mr = function (n, a) {
        var d = n - 1n, s = 0;
        while ((d & 1n) === 0n) { d >>= 1n; s++; }
        var x = nt().powmod(a, d, n), seq = [x];
        for (var j = 1; j <= s; j++) { x = x * x % n; seq.push(x); }
        var pass = seq[0] === 1n, at = -1;
        for (var k = 0; k < s && !pass; k++) if (seq[k] === n - 1n) { pass = true; at = k; }
        var out = { a: a, s: s, d: d, seq: seq, pass: pass, at: at };
        if (!pass) {
            if (seq[s] !== 1n) out.kind = 'fermat';
            else {
                var j1 = seq.indexOf(1n);
                out.kind = 'root'; out.root = seq[j1 - 1]; out.rootIndex = j1 - 1;
                out.factor = nt().gcd(seq[j1 - 1] - 1n, n);
            }
        }
        return out;
    };

    /* ---------- factorization with a record ---------- */
    var TRIAL = 10000;
    /* Pollard's rho (Floyd's cycle finding, x <- x^2 + c, start 2) on an odd composite m that is not a perfect
       power. Products of 128 differences share one gcd; when that gcd is m the block is replayed step by step.
       Returns {d, c, steps, rows (the first steps), retries} or null when the deadline passes. */
    var SHOW = 8;
    async function rho(m, S, deadline) {
        var retries = [];
        for (var c = 1n; c < 64n; c++) {
            var f = function (v) { return (v * v + c) % m; };
            var x = 2n, y = 2n, i = 0, rows = [], q = 1n, bx = x, by = y, bi = 0, ticks = 0, g, res = null;
            for (;;) {
                x = f(x); y = f(f(y)); i++;
                var diff = x > y ? x - y : y - x;
                if (i <= SHOW) {
                    g = nt().gcd(diff, m);
                    rows.push({ i: i, x: x, y: y, g: g });
                    if (g !== 1n) { if (g !== m) res = { d: g, steps: i }; break; }
                    bx = x; by = y; bi = i;
                    continue;
                }
                q = q * diff % m;
                if (i - bi < 128) continue;
                g = nt().gcd(q, m);
                if (g === m) {   // replay the block one step at a time
                    var xx = bx, yy = by;
                    for (var k = bi + 1; k <= i; k++) {
                        xx = f(xx); yy = f(f(yy));
                        g = nt().gcd(xx > yy ? xx - yy : yy - xx, m);
                        if (g !== 1n) break;
                    }
                    if (g !== m) res = { d: g, steps: k };
                    break;
                }
                if (g !== 1n) {
                    var x2 = bx, y2 = by, g2 = g;
                    for (var k2 = bi + 1; k2 <= i; k2++) {
                        x2 = f(x2); y2 = f(f(y2));
                        g2 = nt().gcd(x2 > y2 ? x2 - y2 : y2 - x2, m);
                        if (g2 !== 1n) break;
                    }
                    res = { d: g2, steps: k2 };
                    break;
                }
                bx = x; by = y; bi = i; q = 1n;
                if (++ticks % 32 === 0) {
                    if (S && S.tick) await S.tick();
                    if (Date.now() > deadline) return null;
                }
            }
            if (res) { res.c = c; res.rows = rows; res.retries = retries; return res; }
            retries.push({ c: c, steps: i });
        }
        return null;
    }
    /* factorize(n, S, opts): n >= 1. Resolves to {factors: [{p, e}], events: [...]} with events in order:
       {t: 'trial', n, limit, rows: [{m, p, q}], tried (number of primes tried), last (largest tried), rest, proved},
       {t: 'prime', m, exact}, {t: 'composite', m, a (Miller-Rabin witness)}, {t: 'power', m, r, k},
       {t: 'rho', m, d, c, steps, rows, retries}. opts: {ms: time budget (default 5000)}. Fails (Calc.fail) when the
       budget runs out, with what was found so far in the message. */
    P.factorize = async function (n, S, opts) {
        opts = opts || {};
        var N = nt(), deadline = Date.now() + (opts.ms || 5000), found = {}, events = [];
        if (n < 1n) Calc.fail('Only whole numbers n >= 1 are factored here.');
        if (N.bitLength(n) > 2048) Calc.fail('At most 2048 bits (617 digits) are factored here.');
        function add(p, e) { var k = String(p); if (!found[k]) found[k] = { p: p, e: 0 }; found[k].e += e; }
        var m = n, rows = [], tried = 0, last = 0, primes = P.primesUpTo(TRIAL);
        for (var i = 0; i < primes.length; i++) {
            var p = BigInt(primes[i]);
            if (p * p > m) break;
            tried++; last = primes[i];
            while (m % p === 0n) { rows.push({ m: m, p: p, q: m / p }); m /= p; add(p, 1); }
        }
        /* the loop stopped at a prime p with p^2 > m (so m is 1 or prime), or ran out of primes */
        var proved = m === 1n || i < primes.length || BigInt(last + 1) * BigInt(last + 1) > m;
        events.push({ t: 'trial', n: n, limit: TRIAL, rows: rows, tried: tried, last: last, rest: m, proved: proved });
        if (m > 1n && proved) add(m, 1);
        var stack = m > 1n && !proved ? [{ m: m, e: 1 }] : [];
        while (stack.length) {
            var top = stack.pop(), x = top.m;
            if (N.isPrime(x)) { events.push({ t: 'prime', m: x, exact: x < P.MR_LIMIT }); add(x, top.e); continue; }
            var w = P.mrBases(x).bases.filter(function (a) { return !P.mr(x, a).pass; })[0];
            events.push({ t: 'composite', m: x, a: w });
            var pw = null;
            for (var k = Math.floor(N.bitLength(x) / 13); k >= 2; k--) {
                var r = N.iroot(x, BigInt(k));
                if (r ** BigInt(k) === x) { pw = { r: r, k: k }; break; }
            }
            if (pw) { events.push({ t: 'power', m: x, r: pw.r, k: pw.k }); stack.push({ m: pw.r, e: top.e * pw.k }); continue; }
            var sp = await rho(x, S, deadline);
            if (!sp) {
                var sofar = Object.keys(found).map(function (kk) { return found[kk]; }).sort(function (a, b) { return a.p < b.p ? -1 : 1; });
                Calc.fail('A composite part with ' + String(x).length + ' digits has no factor that Pollard\'s rho finds within a few seconds' +
                    (sofar.length ? ' (found so far: ' + P.plain(sofar) + ')' : '') + '. Large numbers without small prime factors are what RSA relies on being hard to factor.');
            }
            events.push({ t: 'rho', m: x, d: sp.d, c: sp.c, steps: sp.steps, rows: sp.rows, retries: sp.retries });
            stack.push({ m: x / sp.d, e: top.e }, { m: sp.d, e: top.e });
        }
        var list = Object.keys(found).map(function (kk) { return found[kk]; });
        list.sort(function (a, b) { return a.p < b.p ? -1 : a.p > b.p ? 1 : 0; });
        return { factors: list, events: events };
    };
    /* ---------- groups (the cyclic group tools) ---------- */
    /* Z_n^* split by the Chinese remainder theorem, one prime power at a time: [{f: {p, e}, orders: [...]}] with the
       orders of the cyclic factors of Z_{p^e}^*: odd p^e gives one, p^{e-1}(p-1); 2 gives none (the group {1});
       4 gives Z_2; 2^e with e >= 3 gives Z_2 x Z_{2^{e-2}} (generated by -1 and 5). */
    P.unitParts = function (fs) {
        return fs.map(function (f) {
            if (f.p !== 2n) return { f: f, orders: [(f.p - 1n) * f.p ** BigInt(f.e - 1)] };
            return { f: f, orders: f.e === 1 ? [] : f.e === 2 ? [2n] : [2n, 2n ** BigInt(f.e - 2)] };
        });
    };
    /* invariant factors n_1 | n_2 | ... | n_k of Z_{m_1} x ... x Z_{m_r}, from the factorizations of the m_i
       (facs: [[{p, e}], ...]). Returns {inv: [n_1, ..., n_k], primes: [{p, es: [exponents, largest first]}]};
       the empty list for the trivial group. */
    P.invariant = function (facs) {
        var by = {};
        facs.forEach(function (fs) { fs.forEach(function (f) { var k = String(f.p); if (!by[k]) by[k] = { p: f.p, es: [] }; by[k].es.push(f.e); }); });
        var primes = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.p < b.p ? -1 : 1; });
        primes.forEach(function (r) { r.es.sort(function (a, b) { return b - a; }); });
        var k = primes.reduce(function (m, r) { return Math.max(m, r.es.length); }, 0), inv = [];
        for (var i = 0; i < k; i++) inv.unshift(primes.reduce(function (a, r) { return i < r.es.length ? a * r.p ** BigInt(r.es[i]) : a; }, 1n));
        return { inv: inv, primes: primes };
    };
    /* Z_{n_1} x Z_{n_2} x ...: as TeX and as plain text (the trivial group is \{1\} or {1}) */
    P.zTex = function (inv, one) { return inv.length ? inv.map(function (m) { return '\\mathbb Z_{' + P.T(m) + '}'; }).join(' \\times ') : '\\{' + (one || '1') + '\\}'; };
    P.zPlain = function (inv, one) { return inv.length ? inv.map(function (m) { return 'Z_' + m; }).join(' x ') : '{' + (one || '1') + '}'; };
    /* the order of an element x with x^N = 1 (pw(k) = x^k, eq1(y): y is the identity), N with factorization nf:
       start with t = N and divide by each prime r as long as x^(t/r) is still the identity.
       Returns {ord, rows: [[r, t/r, x^(t/r), divided]]} */
    P.orderFrom = function (pw, eq1, N, nf) {
        var t = N, rows = [];
        nf.forEach(function (f) {
            for (var k = 0; k < f.e; k++) {
                var y = pw(t / f.p), one = eq1(y);
                rows.push({ r: f.p, k: t / f.p, y: y, one: one });
                if (!one) break;
                t /= f.p;
            }
        });
        return { ord: t, rows: rows };
    };

    /* the group of the generator tools, from the inputs group ('mul': Z_n^*, 'add': Z_n, 'sub': the subgroup of
       order q of Z_p^*), n, p, q. Shows the group as steps and returns {kind, name (TeX), N (its order), cyclic,
       mod, m (sub: (p-1)/q), one (the identity), pw(x, k) (x^k, or k times x), ptex(x, k) (TeX of that, from TeX strings), fs (mul: the
       factors of n)}. The factors of N are left to the tool (P.orderFactors). */
    P.group = async function (v, S) {
        var N = nt(), T = P.T, G = { kind: v.group };
        if (v.group === 'add') {
            var n = v.n;
            G.mod = n; G.N = n; G.cyclic = true; G.one = 0n; G.name = '\\mathbb Z_{' + T(n) + '}';
            G.pw = function (x, k) { return x * k % n; };
            G.ptex = function (x, k) { return k + ' \\cdot ' + x; };
            S.step('The group $' + G.name + '$')
                .p('The numbers $0, 1, \\dots, ' + T(n - 1n) + '$ with addition modulo $' + T(n) + '$. The identity is $0$, and the group has $' + T(n) + '$ elements. The role of a power $g^k$ is played by the multiple $k \\cdot g = g + g + \\dots + g$.')
                .p('This group is always cyclic: $1$ generates it, since every element is $1 + 1 + \\dots + 1$.');
            return G;
        }
        if (v.group === 'sub') {
            var p = v.p, q = v.q;
            if (N.bitLength(p) > 2048) Calc.fail('At most 2048 bits for p here.', 'p');
            if (!N.isPrime(p)) Calc.fail(String(p).length > 30 ? 'This p is not prime.' : p + ' is not prime.', 'p');
            if ((p - 1n) % q !== 0n) Calc.fail('q must divide p - 1 = ' + (String(p).length > 30 ? 'the prime minus one' : String(p - 1n)) + '.', 'q');
            G.mod = p; G.N = q; G.cyclic = true; G.one = 1n; G.m = (p - 1n) / q;
            G.name = 'G_{' + T(q) + '} \\subseteq \\mathbb Z_{' + T(p) + '}^*';
            G.pw = function (x, k) { return N.powmod(x, k, p); };
            G.ptex = function (x, k) { return x + '^{' + k + '}'; };
            var s = S.step('The subgroup of order $q = ' + T(q) + '$');
            s.p('$p = ' + T(p) + '$ is prime, so $\\mathbb Z_p^*$ is cyclic of order $p - 1$, and $q$ divides $p - 1$:');
            s.math('p - 1 = ' + T(G.m) + ' \\cdot ' + T(q));
            s.p('A cyclic group has exactly one subgroup of each order dividing its size. Here it is $G_q = \\{x : x^q \\equiv 1 \\pmod p\\}$, and every subgroup of a cyclic group is cyclic. Its elements are the powers $h^{(p-1)/q} = h^{' + T(G.m) + '}$ of the elements $h$ of $\\mathbb Z_p^*$.');
            if (q === p - 1n) s.p('Here $q = p - 1$: the subgroup is all of $\\mathbb Z_p^*$.');
            return G;
        }
        var r = await P.factorStep(S, v.n), fs = r.factors, n2 = v.n;
        G.mod = n2; G.N = P.phi(fs); G.cyclic = P.cyclic(fs); G.one = 1n; G.fs = fs; G.name = '\\mathbb Z_{' + T(n2) + '}^*';
        G.pw = function (x, k) { return N.powmod(x, k, n2); };
        G.ptex = function (x, k) { return x + '^{' + k + '}'; };
        var sg = S.step('The group $' + G.name + '$');
        sg.p('The numbers from $1$ to $' + T(n2 - 1n) + '$ that are coprime to $' + T(n2) + '$, with multiplication modulo $' + T(n2) + '$. There are $\\varphi(' + T(n2) + ') = ' + T(G.N) + '$ of them.');
        sg.p('Gauss: $\\mathbb Z_n^*$ is cyclic exactly for $n = 1, 2, 4, p^k$ and $2p^k$ with $p$ an odd prime.');
        var form = (fs.length > 1 || (fs.length && fs[0].e > 1)) ? ' = ' + P.tex(fs) : '';
        sg.check(G.cyclic, '$' + T(n2) + form + '$ ' + (G.cyclic ? 'is of that form, so the group is cyclic' : 'is not of that form, so the group is not cyclic'));
        return G;
    };
    /* the prime factors of the group order, as one step */
    P.orderFactors = async function (S, G) {
        var f = (await P.factorize(G.N, S)).factors;
        var s = S.step('The prime factors of the order $N = ' + P.T(G.N) + '$');
        s.math('N = ' + P.T(G.N) + (f.length > 1 || (f.length && f[0].e > 1) ? ' = ' + P.tex(f) : ''));
        var e = G.kind === 'add' ? '\\tfrac{N}{r} \\cdot g \\not\\equiv 0' : 'g^{N/r} \\not\\equiv 1';
        s.p('By Lagrange\'s theorem the order of $g$ divides $N$. If it were a proper divisor, it would divide $N/r$ for some prime $r$ dividing $N$. So $g$ generates the group exactly when');
        s.math(e + ' \\pmod{' + P.T(G.mod) + '} \\quad \\text{for } r = ' + f.map(function (x) { return P.T(x.p); }).join(', '));
        if (f.length === 1 && f[0].e === 1) s.p('$N$ is prime, so the only test is $' + (G.kind === 'add' ? 'g \\ne 0' : 'g \\ne 1') + '$: every element except the identity is a generator.');
        return f;
    };

    /* factor n for a tool that needs the factorization, and show it as one step */
    P.factorStep = async function (S, n, what) {
        var r = await P.factorize(n, S);
        var st = S.step('Factor ' + (what || '$n = ' + P.T(n) + '$'));
        var has = function (t) { return r.events.some(function (e) { return e.t === t; }); };
        var how = 'trial division' + (has('rho') ? ', Miller-Rabin and Pollard\'s rho' : has('prime') ? ' and Miller-Rabin' : '');
        var prime = r.factors.length === 1 && r.factors[0].e === 1;
        if (!prime) st.math(P.T(n) + ' = ' + P.tex(r.factors));
        st.p(n === 1n ? 'The number 1 has no prime factors (the empty product).'
            : prime ? '$' + P.T(n) + '$ is prime (shown by ' + how + ').'
                : 'Found by ' + how + '; the prime factorization tool shows every step.');
        r.step = st;
        return r;
    };
})(typeof window !== 'undefined' ? window : globalThis);
