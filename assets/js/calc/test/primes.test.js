/* Tests for the Primes and number theory tools and lib/primes.js (see run.js for the API). */
(function () {
    var nt = Calc.lib.nt, P = Calc.lib.primes;
    function brutePrime(n) { if (n < 2) return false; for (var d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; }
    function gcdN(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
    function bruteOrder(a, n) { if (gcdN(a, n) !== 1) return 0; var x = a % n, k = 1; while (x !== 1 % n) { x = x * a % n; k++; } return k; }
    function bruteLambda(n) { var l = 1; for (var a = 1; a < n; a++) if (gcdN(a, n) === 1) { var o = bruteOrder(a, n); l = l / gcdN(l, o) * o; } return l; }
    function bruteSigma(n) { var s = 0; for (var d = 1; d <= n; d++) if (n % d === 0) s += d; return s; }
    function bruteDivs(n) { var out = []; for (var d = 1; d <= n; d++) if (n % d === 0) out.push(d); return out; }
    function lines(copy) { var o = {}; copy.split('\n').forEach(function (l) { var i = l.indexOf(' = '); o[l.slice(0, i)] = l.slice(i + 3); }); return o; }
    function product(copy) {
        if (copy === '1') return 1n;
        return copy.split(' * ').reduce(function (acc, t) { var pe = t.split('^'); return acc * BigInt(pe[0]) ** BigInt(pe[1] || 1); }, 1n);
    }

    /* ---------- prime factorization ---------- */
    T.tool('prime-factorization', [
        { in: { n: '360' }, copy: '2^3 * 3^2 * 5' },
        { in: { n: '1001' }, copy: '7 * 11 * 13' },
        { in: { n: '97' }, copy: '97' },
        { in: { n: '2' }, copy: '2' },
        { in: { n: '1' }, copy: '1' },
        { in: { n: '-12' }, copy: '-1 * 2^2 * 3' },
        { in: { n: '-1' }, copy: '-1' },
        { in: { n: '2^64 + 1' }, copy: '274177 * 67280421310721' },
        { in: { n: '2^67 - 1' }, copy: '193707721 * 761838257287' },
        { in: { n: '600851475143' }, copy: '71 * 839 * 1471 * 6857' },
        { in: { n: '10^12 + 39' }, copy: '1000000000039' },
        { in: { n: '1000000016000000063' }, copy: '1000000007 * 1000000009' },
        { in: { n: '10007^5' }, copy: '10007^5' },
        { in: { n: '(2^31 - 1)^3 * (2^61 - 1)^2' }, copy: '2147483647^3 * 2305843009213693951^2' },
        { in: { n: '2^127 - 1' }, copy: '170141183460469231731687303715884105727' },
        { in: { n: '2^128' }, copy: '2^128' },
        { in: { n: '30!' }, copy: '2^26 * 3^14 * 5^7 * 7^4 * 11^2 * 13^2 * 17 * 19 * 23 * 29' },
        { in: { n: '0' }, error: true },
        { in: { n: 'abc' }, error: true },
        { in: { n: '2^2049' }, error: true },
        { in: { n: '2^2047' }, copy: '2^2047' },
        /* two 20-digit primes: far beyond Pollard's rho in a few seconds, so it must refuse cleanly */
        { in: { n: String(nt.nextPrime(10n ** 19n) * nt.nextPrime(10n ** 20n)) }, error: true }
    ]);
    T.prop('prime-factorization random', 60, function (r) {
        var n = r.int(2, 10n ** 22n);
        return T.run('prime-factorization', { n: String(n) }).then(function (o) {
            if (o.errors) return 'error for ' + n;
            var parts = o.copy.split(' * '), ok = parts.every(function (t) { return nt.isPrime(BigInt(t.split('^')[0])); });
            return product(o.copy) === n && ok ? true : n + ' gave ' + o.copy;
        });
    });
    T.prop('prime-factorization semiprimes (rho)', 15, function (r) {
        var p = nt.nextPrime(r.int(10n ** 6n, 10n ** 9n)), q = nt.nextPrime(r.int(10n ** 8n, 10n ** 10n));
        return T.run('prime-factorization', { n: String(p * q) }).then(function (o) {
            var want = p === q ? p + '^2' : (p < q ? p + ' * ' + q : q + ' * ' + p);
            return o.copy === want ? true : p + '*' + q + ' gave ' + o.copy;
        });
    });

    /* ---------- primality test ---------- */
    T.tool('primality-test', [
        { in: { n: '97' }, copy: 'prime' },
        { in: { n: '2' }, copy: 'prime' },
        { in: { n: '3' }, copy: 'prime' },
        { in: { n: '1' }, copy: 'not prime' },
        { in: { n: '0' }, copy: 'not prime' },
        { in: { n: '-7' }, copy: 'not prime' },
        { in: { n: '561' }, copy: 'composite', check: function (S) { return S.notes.some(function (x) { return /Carmichael/.test(x); }) || 'no Carmichael note'; } },
        { in: { n: '1729' }, copy: 'composite' },
        { in: { n: '2047', bases: '2' }, copy: 'composite', check: function (S) { return S.notes.some(function (x) { return /strong pseudoprime/.test(x); }) || 'no pseudoprime note'; } },
        { in: { n: '3215031751' }, copy: 'composite' },
        /* the smallest strong pseudoprime to the 9 prime bases 2..23: caught by the larger exact set */
        { in: { n: '3825123056546413051' }, copy: 'composite' },
        { in: { n: '318665857834031151167461' }, copy: 'composite' },
        { in: { n: '3317044064679887385961981' }, copy: 'composite' },
        { in: { n: '2^61 - 1' }, copy: 'prime' },
        { in: { n: '2^89 - 1' }, copy: 'probable prime' },
        { in: { n: '10^24 + 7' }, copy: nt.isPrime(10n ** 24n + 7n) ? 'prime' : 'composite' },
        { in: { n: '2^127 - 1' }, copy: 'probable prime' },
        { in: { n: '2^521 - 1' }, copy: 'probable prime' },
        { in: { n: '2^128 + 1' }, copy: 'composite' },
        { in: { n: '2^67 - 1' }, copy: 'composite' },
        { in: { n: '2^4423 - 1' }, error: true },
        { in: { n: '1000003', bases: '2, 3' }, copy: 'prime' },
        { in: { n: '2^89 - 1', bases: '2, 3' }, copy: 'probable prime' },
        { in: { n: '2^89 - 1', bases: '1, -1' }, copy: 'not decided' },
        { in: { n: '1009', bases: '1' }, copy: 'prime' },
        { in: { n: '561', bases: 'x' }, error: true }
    ]);
    T.prop('primality-test against trial division', 1, function () {
        var chain = Promise.resolve(), bad = null;
        for (var n = 0; n < 400; n++) (function (n) {
            chain = chain.then(function () {
                return T.run('primality-test', { n: String(n) }).then(function (o) { if ((o.copy === 'prime') !== brutePrime(n) && !bad) bad = n + ' gave ' + o.copy; });
            });
        })(n);
        return chain.then(function () { return bad || true; });
    });
    T.prop('primality-test Carmichael numbers are composite', 1, function () {
        var cs = ['561', '1105', '1729', '2465', '2821', '6601', '8911', '41041', '825265', '321197185', '5394826801', '232250619601', '9746347772161'];
        return Promise.all(cs.map(function (c) { return T.run('primality-test', { n: c }); })).then(function (os) {
            for (var i = 0; i < os.length; i++) if (os[i].copy !== 'composite') return cs[i] + ' gave ' + os[i].copy;
            return true;
        });
    });
    T.prop('primality-test Mersenne exponents', 1, function () {
        var prime = [2, 3, 5, 7, 13, 17, 19, 31, 61, 89, 107, 127, 521, 607], comp = [11, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71, 73, 79, 83, 97, 101, 103, 109, 113];
        var all = prime.map(function (p) { return [p, true]; }).concat(comp.map(function (p) { return [p, false]; }));
        return Promise.all(all.map(function (x) { return T.run('primality-test', { n: '2^' + x[0] + ' - 1' }); })).then(function (os) {
            for (var i = 0; i < os.length; i++) if (/prime$/.test(os[i].copy) !== all[i][1] || os[i].copy === 'not prime') return '2^' + all[i][0] + '-1 gave ' + os[i].copy;
            return true;
        });
    });
    T.prop('lib mr: strong liars are rare', 1, function () {
        /* Rabin: an odd composite n > 9 has at most phi(n)/4 strong liars */
        for (var n = 11; n < 700; n += 2) {
            if (brutePrime(n)) continue;
            var liars = 0, phi = 0;
            for (var a = 1; a < n; a++) if (gcdN(a, n) === 1) { phi++; if (P.mr(BigInt(n), BigInt(a)).pass) liars++; }
            if (4 * liars > phi) return n + ' has ' + liars + ' liars of ' + phi;
        }
        return true;
    });

    /* ---------- totient, Carmichael, divisors ---------- */
    T.tool('euler-totient', [
        { in: { n: '36' }, copy: '12' },
        { in: { n: '1' }, copy: '1' },
        { in: { n: '2' }, copy: '1' },
        { in: { n: '97' }, copy: '96' },
        { in: { n: '3233' }, copy: '3120' },
        { in: { n: '10!' }, copy: '829440' },
        { in: { n: '2^64 - 1' }, copy: '9208981628670443520' },
        { in: { n: '0' }, error: true },
        { in: { n: '-5' }, error: true }
    ]);
    T.tool('carmichael-function', [
        { in: { n: '561' }, copy: '80' },
        { in: { n: '1' }, copy: '1' },
        { in: { n: '2' }, copy: '1' },
        { in: { n: '4' }, copy: '2' },
        { in: { n: '8' }, copy: '2' },
        { in: { n: '2^32' }, copy: String(2n ** 30n) },
        { in: { n: '15' }, copy: '4' },
        { in: { n: '3233' }, copy: '780' },
        { in: { n: '1000' }, copy: '100' },
        { in: { n: '0' }, error: true }
    ]);
    T.tool('divisors', [
        { in: { n: '12' }, copy: '1, 2, 3, 4, 6, 12' },
        { in: { n: '28' }, copy: '1, 2, 4, 7, 14, 28', check: function (S) { return /perfect/.test(S.res.lines[1]) || 'not called perfect'; } },
        { in: { n: '12' }, check: function (S) { return /abundant/.test(S.res.lines[1]) || 'not abundant'; } },
        { in: { n: '97' }, copy: '1, 97', check: function (S) { return /deficient/.test(S.res.lines[1]) || 'not deficient'; } },
        { in: { n: '1' }, copy: '1' },
        { in: { n: '-12' }, copy: '1, 2, 3, 4, 6, 12' },
        { in: { n: '36' }, copy: '1, 2, 3, 4, 6, 9, 12, 18, 36' },
        { in: { n: '2^88 * (2^89 - 1)' }, check: function (S, c) { return c.split(', ').length === 178 || 'count'; } },
        { in: { n: '30!' }, check: function (S, c) { var o = lines(c); return o.tau === '2332800' || 'tau ' + o.tau; } },
        { in: { n: '0' }, error: true }
    ]);
    T.prop('totient, lambda, divisors against brute force', 1, function () {
        var chain = Promise.resolve(), bad = null;
        for (var n = 1; n <= 150; n++) (function (n) {
            chain = chain.then(function () {
                return Promise.all([T.run('euler-totient', { n: String(n) }), T.run('carmichael-function', { n: String(n) }), T.run('divisors', { n: String(n) })]).then(function (os) {
                    var phi = 0;
                    for (var k = 1; k <= n; k++) if (gcdN(k, n) === 1) phi++;
                    if (os[0].copy !== String(phi) && !bad) bad = 'phi(' + n + ') gave ' + os[0].copy;
                    var lam = n <= 2 ? 1 : bruteLambda(n);
                    if (os[1].copy !== String(lam) && !bad) bad = 'lambda(' + n + ') gave ' + os[1].copy;
                    if (os[2].copy !== bruteDivs(n).join(', ') && !bad) bad = 'divisors(' + n + ') gave ' + os[2].copy;
                    if (os[2].S.res.lines[1].indexOf('\\sigma = ' + bruteSigma(n) + '$') < 0 && !bad) bad = 'sigma(' + n + ')';
                });
            });
        })(n);
        return chain.then(function () { return bad || true; });
    });
    T.prop('lib phi and lambda multiplicative', 100, function (r) {
        var a = r.int(1, 10n ** 9n), b = r.int(1, 10n ** 9n);
        return Promise.all([P.factorize(a), P.factorize(b), P.factorize(a * b)]).then(function (f) {
            if (nt.gcd(a, b) === 1n && P.phi(f[2].factors) !== P.phi(f[0].factors) * P.phi(f[1].factors)) return 'phi(' + a + '*' + b + ')';
            if (nt.gcd(a, b) === 1n && P.lambda(f[2].factors) !== nt.lcm(P.lambda(f[0].factors), P.lambda(f[1].factors))) return 'lambda';
            var lam = P.lambda(f[2].factors), phi = P.phi(f[2].factors), w = r.int(2, 10n ** 6n);
            if (phi % lam !== 0n) return 'lambda does not divide phi';
            if (nt.gcd(w, a * b) === 1n && nt.powmod(w, lam, a * b) !== 1n % (a * b)) return 'w^lambda != 1';
            return P.value(f[2].factors) === a * b ? true : 'value';
        });
    });

    /* ---------- multiplicative order and primitive roots ---------- */
    T.tool('multiplicative-order', [
        { in: { a: '3', n: '7' }, copy: '6' },
        { in: { a: '2', n: '7' }, copy: '3' },
        { in: { a: '2', n: '35' }, copy: '12' },
        { in: { a: '10', n: '49' }, copy: '42' },
        { in: { a: '10', n: '7' }, copy: '6' },
        { in: { a: '1', n: '5' }, copy: '1' },
        { in: { a: '-1', n: '5' }, copy: '2' },
        { in: { a: '1', n: '2' }, copy: '1' },
        { in: { a: '6', n: '15' }, copy: 'none' },
        { in: { a: '0', n: '7' }, copy: 'none' },
        { in: { a: '2', n: '2^89 - 1' }, copy: '89' },
        { in: { a: '2', n: '2^61 - 1' }, copy: '61' },
        { in: { a: '3', n: '1' }, error: true }
    ]);
    T.prop('multiplicative-order against brute force', 300, function (r) {
        var n = r.num(2, 3000), a = r.num(0, n - 1);
        return T.run('multiplicative-order', { a: String(a), n: String(n) }).then(function (o) {
            var want = bruteOrder(a, n);
            return o.copy === (want ? String(want) : 'none') ? true : 'ord_' + n + '(' + a + ') gave ' + o.copy + ', want ' + want;
        });
    });
    T.prop('multiplicative-order large: a^ord = 1 and minimal', 40, function (r) {
        var n = r.int(2, 10n ** 18n), a = r.int(2, n);
        if (nt.gcd(a, n) !== 1n) a = 1n;
        return T.run('multiplicative-order', { a: String(a), n: String(n) }).then(function (o) {
            if (o.errors) return 'error ' + JSON.stringify(o.errors);
            var k = BigInt(o.copy);
            if (nt.powmod(a, k, n) !== 1n % n) return 'a^ord != 1 for ' + a + ', ' + n;
            return P.factorize(k).then(function (f) {
                return f.factors.every(function (x) { return nt.powmod(a, k / x.p, n) !== 1n; }) ? true : 'not minimal: ' + a + ' mod ' + n;
            });
        });
    });
    T.tool('primitive-root', [
        { in: { n: '23' }, copy: '5' },
        { in: { n: '7' }, copy: '3' },
        { in: { n: '2' }, copy: '1' },
        { in: { n: '4' }, copy: '3' },
        { in: { n: '8' }, copy: 'none' },
        { in: { n: '15' }, copy: 'none' },
        { in: { n: '50' }, copy: '3' },
        { in: { n: '41' }, copy: '6' },
        { in: { n: '9' }, copy: '2' },
        { in: { n: '1000003' }, copy: '2' },
        { in: { n: '2^127 - 1' }, copy: '43' },
        { in: { n: '191' }, copy: '19' },
        { in: { n: '1' }, error: true }
    ]);
    T.prop('primitive-root against brute force', 1, function () {
        var chain = Promise.resolve(), bad = null;
        for (var n = 2; n <= 300; n++) (function (n) {
            chain = chain.then(function () {
                return T.run('primitive-root', { n: String(n) }).then(function (o) {
                    var phi = 0, g = 0;
                    for (var k = 1; k <= n; k++) if (gcdN(k, n) === 1) phi++;
                    for (var c = 1; c < n && !g; c++) if (bruteOrder(c, n) === phi) g = c;
                    var want = g ? String(g) : 'none';
                    if (o.copy !== want && !bad) bad = n + ' gave ' + o.copy + ', want ' + want;
                    /* the number of primitive roots stated is phi(phi(n)), and the list (when shown) has that many */
                    if (g && n > 2 && !bad) {
                        var cnt = 0;
                        for (var c2 = 1; c2 < n; c2++) if (bruteOrder(c2, n) === phi) cnt++;
                        if (!o.S.notes.some(function (x) { return x.indexOf('= ' + cnt + '$ primitive') >= 0; })) bad = n + ': count ' + cnt;
                    }
                });
            });
        })(n);
        return chain.then(function () { return bad || true; });
    });

    /* ---------- Legendre and Jacobi ---------- */
    T.tool('legendre-jacobi', [
        { in: { a: '1001', n: '9907' }, copy: '-1' },
        { in: { a: '2', n: '15' }, copy: '1' },
        { in: { a: '19', n: '45' }, copy: '1' },
        { in: { a: '-1', n: '13' }, copy: '1' },
        { in: { a: '-1', n: '7' }, copy: '-1' },
        { in: { a: '12', n: '35' }, copy: '1' },
        { in: { a: '3', n: '35' }, copy: String(nt.jacobi(3n, 5n) * nt.jacobi(3n, 7n)) },
        { in: { a: '5', n: '1' }, copy: '1' },
        { in: { a: '0', n: '7' }, copy: '0' },
        { in: { a: '21', n: '15' }, copy: '0' },
        { in: { a: '2', n: '7' }, copy: '1' },
        { in: { a: '2', n: '11' }, copy: '-1' },
        { in: { a: '7', n: '2^127 - 1' }, copy: String(nt.jacobi(7n, 2n ** 127n - 1n)) },
        { in: { a: '3', n: '8' }, error: true },
        { in: { a: '3', n: '0' }, error: true },
        { in: { a: '3', n: '-7' }, error: true }
    ]);
    T.prop('legendre-jacobi against nt.jacobi and Euler', 200, function (r) {
        var n = r.int(1, 10n ** 20n) * 2n + 1n, a = r.int(-(10n ** 22n), 10n ** 22n);
        return T.run('legendre-jacobi', { a: String(a), n: String(n) }).then(function (o) {
            var want = nt.jacobi(a, n);
            if (o.copy !== String(want)) return '(' + a + '/' + n + ') gave ' + o.copy + ', want ' + want;
            if (nt.isPrime(n) && n > 2n) { var e = nt.powmod(a, (n - 1n) / 2n, n); if ((e === 1n ? 1 : e === 0n ? 0 : -1) !== want) return 'Euler'; }
            return true;
        });
    });
    T.prop('legendre counts squares mod small primes', 1, function () {
        var ps = [3, 5, 7, 11, 13, 101];
        return Promise.all(ps.map(function (p) {
            var sq = {};
            for (var x = 1; x < p; x++) sq[x * x % p] = 1;
            return Promise.all(Array.apply(null, Array(p - 1)).map(function (_, i) { return T.run('legendre-jacobi', { a: String(i + 1), n: String(p) }).then(function (o) { return o.copy === (sq[i + 1] ? '1' : '-1'); }); }))
                .then(function (oks) { return oks.every(Boolean) ? true : 'p = ' + p; });
        })).then(function (rs) { return rs.filter(function (x) { return x !== true; })[0] || true; });
    });

    /* ---------- modular square roots ---------- */
    function bruteRoots(a, n) { var out = []; for (var x = 0; x < n; x++) if (x * x % n === a) out.push(x); return out; }
    T.tool('modular-square-root', [
        { in: { a: '10', n: '13' }, copy: '6, 7' },
        { in: { a: '5', n: '41' }, copy: '13, 28' },
        { in: { a: '2', n: '113' }, copy: '51, 62' },
        { in: { a: '3', n: '7' }, copy: 'no solution' },
        { in: { a: '0', n: '7' }, copy: '0' },
        { in: { a: '1', n: '2' }, copy: '1' },
        { in: { a: '-1', n: '13' }, copy: '5, 8' },
        { in: { a: '58', n: '77' }, copy: '17, 38, 39, 60' },
        { in: { a: '1', n: '120' }, check: function (S, c) { return c.split(', ').length === 16 || c; } },
        { in: { a: '9', n: '27' }, copy: '3, 6, 12, 15, 21, 24' },
        { in: { a: '17', n: '2^10' }, check: function (S, c) { return c.split(', ').length === 4 || c; } },
        { in: { a: '5', n: '8' }, copy: 'no solution' },
        { in: { a: '0', n: '2^30' }, error: true },
        { in: { a: '3', n: '1' }, error: true },
        { in: { a: '2', n: '2^127 - 1' }, check: function (S, c) { var p = 2n ** 127n - 1n; return c.split(', ').every(function (x) { return BigInt(x) ** 2n % p === 2n; }) && c.split(', ').length === 2 || c; } }
    ]);
    T.prop('modular-square-root against brute force', 1, function () {
        var chain = Promise.resolve(), bad = null, rnd = new T.Rnd(7);
        for (var k = 0; k < 250; k++) (function () {
            var n = rnd.num(2, 400), a = rnd.num(0, n - 1);
            chain = chain.then(function () {
                return T.run('modular-square-root', { a: String(a), n: String(n) }).then(function (o) {
                    var want = bruteRoots(a, n);
                    var got = o.copy === 'no solution' ? '' : o.copy;
                    if (got !== want.join(', ') && !bad) bad = 'sqrt(' + a + ') mod ' + n + ' gave ' + o.copy + ', want ' + want.join(', ');
                });
            });
        })();
        return chain.then(function () { return bad || true; });
    });
    T.prop('modular-square-root large primes (Tonelli-Shanks)', 60, function (r) {
        /* primes p = 1 (mod 2^k) exercise the Tonelli-Shanks loop */
        var p = nt.nextPrime(r.int(10n ** 12n, 10n ** 25n)), x = r.int(1, p - 1n), a = x * x % p;
        return T.run('modular-square-root', { a: String(a), n: String(p) }).then(function (o) {
            var rs = o.copy.split(', ').map(BigInt);
            return rs.length === 2 && rs.every(function (y) { return y * y % p === a; }) && rs.some(function (y) { return y === x || y === p - x; }) ? true : 'p=' + p + ' a=' + a + ' got ' + o.copy;
        });
    });
    T.prop('modular-square-root composite: roots square to a', 40, function (r) {
        var p = nt.nextPrime(r.int(3n, 10n ** 6n)), q = nt.nextPrime(r.int(3n, 10n ** 6n)), n = p * q * 4n, x = r.int(1, n - 1n), a = x * x % n;
        if (nt.gcd(a, n) !== 1n) return true;
        return T.run('modular-square-root', { a: String(a), n: String(n) }).then(function (o) {
            var rs = o.copy.split(', ').map(BigInt);
            return rs.every(function (y) { return y * y % n === a; }) && rs.some(function (y) { return y === x; }) ? true : 'n=' + n + ' a=' + a + ' got ' + o.copy;
        });
    });

    /* ---------- discrete logarithm ---------- */
    T.tool('discrete-logarithm', [
        { in: { g: '3', h: '13', n: '17' }, copy: '4' },
        { in: { g: '2', h: '1000', n: '1019' }, copy: '33' },
        { in: { g: '5', h: '2', n: '23' }, copy: '2' },
        { in: { g: '5', h: '1', n: '23' }, copy: '0' },
        { in: { g: '2', h: '3', n: '7' }, copy: 'no solution' },
        { in: { g: '2', h: '7', n: '14' }, error: true },
        { in: { g: '3', h: '7', n: '14' }, copy: 'no solution' },
        { in: { g: '3', h: '5', n: '14' }, copy: '5' },
        { in: { g: '9', h: '13', n: '14' }, copy: 'no solution' },
        { in: { g: '3', h: '0', n: '17' }, copy: 'no solution' },
        { in: { g: '3', h: '5', n: '2^127 - 1' }, error: true },
        { in: { g: '2', h: '2^100', n: '2^127 - 1' }, copy: '100' }
    ]);
    T.prop('discrete-logarithm round trip', 60, function (r) {
        var p = nt.nextPrime(r.int(100n, 10n ** 9n)), g = r.int(2, p - 1n), x = r.int(0, p - 2n), h = nt.powmod(g, x, p);
        return T.run('discrete-logarithm', { g: String(g), h: String(h), n: String(p) }).then(function (o) {
            if (o.errors) return 'error ' + JSON.stringify(o.errors);
            var y = BigInt(o.copy);
            if (nt.powmod(g, y, p) !== h) return 'g^x != h for p=' + p;
            return y <= x ? true : 'not the smallest solution';
        });
    });

    /* ---------- continued fractions ---------- */
    T.tool('continued-fraction', [
        { in: { mode: 'frac', a: '415', b: '93' }, copy: '[4; 2, 6, 7]' },
        { in: { mode: 'frac', a: '-17', b: '5' }, copy: '[-4; 1, 1, 2]' },
        { in: { mode: 'frac', a: '17', b: '-5' }, copy: '[-4; 1, 1, 2]' },
        { in: { mode: 'frac', a: '7', b: '1' }, copy: '[7]' },
        { in: { mode: 'frac', a: '0', b: '5' }, copy: '[0]' },
        { in: { mode: 'frac', a: '3', b: '8' }, copy: '[0; 2, 1, 2]' },
        { in: { mode: 'frac', a: '1', b: '0' }, error: true },
        { in: { mode: 'sqrt', n: '23' }, copy: '[4; (1, 3, 1, 8)]' },
        { in: { mode: 'sqrt', n: '2' }, copy: '[1; (2)]' },
        { in: { mode: 'sqrt', n: '61' }, copy: '[7; (1, 4, 3, 1, 2, 2, 1, 3, 4, 1, 14)]' },
        { in: { mode: 'sqrt', n: '16' }, copy: '[4]' },
        { in: { mode: 'sqrt', n: '0' }, copy: '[0]' },
        { in: { mode: 'sqrt', n: '-3' }, error: true },
        { in: { mode: 'dec', x: '3.14159265358979' }, check: function (S, c) { return c.indexOf('[3; 7, 15, 1, 292,') === 0 || c; } },
        { in: { mode: 'dec', x: '-0.75' }, copy: '[-1; 4]' },
        { in: { mode: 'dec', x: '0,5' }, copy: '[0; 2]' },
        { in: { mode: 'dec', x: '2' }, copy: '[2]' },
        { in: { mode: 'dec', x: '1.2.3' }, error: true },
        { in: { mode: 'dec', x: '.' }, error: true }
    ]);
    T.prop('continued-fraction of a/b evaluates back', 150, function (r) {
        var a = r.int(-(10n ** 20n), 10n ** 20n), b = r.int(1, 10n ** 18n);
        return T.run('continued-fraction', { mode: 'frac', a: String(a), b: String(b) }).then(function (o) {
            var m = /^\[(.*?)(?:; (.*))?\]$/.exec(o.copy), terms = [BigInt(m[1])].concat(m[2] ? m[2].split(', ').map(BigInt) : []);
            if (terms.slice(1).some(function (t) { return t < 1n; })) return 'non-positive term';
            var h = 1n, k = 0n;
            for (var i = terms.length - 1; i >= 0; i--) { var nh = terms[i] * h + k; k = h; h = nh; }
            var g = nt.gcd(a, b);
            return h === a / g && k === b / g ? true : a + '/' + b + ' gave ' + o.copy;
        });
    });
    T.prop('continued-fraction of sqrt(n) solves Pell', 40, function (r) {
        var n = r.int(2, 100000);
        return T.run('continued-fraction', { mode: 'sqrt', n: String(n) }).then(function (o) {
            if (nt.isSquare(n)) return o.copy === '[' + nt.isqrt(n) + ']' ? true : 'square';
            var pell = o.S.steps.filter(function (s) { return /Pell/.test(s.title); })[0];
            return pell && pell.blocks.some(function (b) { return b.t === 'check' && b.ok; }) ? true : 'Pell check for ' + n;
        });
    });

    /* ---------- sieve and next prime ---------- */
    T.tool('prime-sieve', [
        { in: { mode: 'sieve', N: '30' }, copy: '2, 3, 5, 7, 11, 13, 17, 19, 23, 29' },
        { in: { mode: 'sieve', N: '2' }, copy: '2' },
        { in: { mode: 'sieve', N: '100' }, check: function (S, c) { return c.split(', ').length === 25 || c; } },
        { in: { mode: 'sieve', N: '1000' }, check: function (S, c) { return c.split(', ').length === 168 || c; } },
        { in: { mode: 'sieve', N: '3000' }, check: function (S, c) { return c.split(', ').length === 430 || c; } },
        { in: { mode: 'sieve', N: '1' }, error: true },
        { in: { mode: 'sieve', N: '3001' }, error: true },
        { in: { mode: 'near', n: '100' }, copy: 'previous = 97\nnext = 101' },
        { in: { mode: 'near', n: '97' }, copy: 'previous = 89\nnext = 101' },
        { in: { mode: 'near', n: '2' }, copy: 'previous = none\nnext = 3' },
        { in: { mode: 'near', n: '3' }, copy: 'previous = 2\nnext = 5' },
        { in: { mode: 'near', n: '1' }, copy: 'previous = none\nnext = 2' },
        { in: { mode: 'near', n: '-10' }, copy: 'previous = none\nnext = 2' },
        { in: { mode: 'near', n: '2^64' }, copy: 'previous = ' + (2n ** 64n - 59n) + '\nnext = ' + (2n ** 64n + 13n) },
        { in: { mode: 'near', n: '2^3000' }, error: true }
    ]);
    T.prop('prime-sieve matches trial division', 1, function () {
        return T.run('prime-sieve', { mode: 'sieve', N: '2999' }).then(function (o) {
            var want = [];
            for (var n = 2; n <= 2999; n++) if (brutePrime(n)) want.push(n);
            return o.copy === want.join(', ') ? true : 'sieve';
        });
    });
    T.prop('prime-sieve next and previous', 40, function (r) {
        var n = r.int(3, 10n ** 30n);
        return T.run('prime-sieve', { mode: 'near', n: String(n) }).then(function (o) {
            var l = lines(o.copy), up = BigInt(l.next), dn = BigInt(l.previous);
            if (!(dn < n && n < up && nt.isPrime(up) && nt.isPrime(dn))) return 'not primes around ' + n;
            for (var c = dn + 1n; c < up; c++) if (nt.isPrime(c) && c !== n) return 'missed ' + c;
            return true;
        });
    });

    /* ---------- the library ---------- */
    T.prop('lib factorize: product, primes, sorted', 80, function (r) {
        var n = r.int(1, 10n ** 26n);
        return P.factorize(n).then(function (f) {
            for (var i = 1; i < f.factors.length; i++) if (f.factors[i - 1].p >= f.factors[i].p) return 'not sorted';
            return P.value(f.factors) === n && f.factors.every(function (x) { return nt.isPrime(x.p); }) ? true : 'factorize ' + n;
        });
    });
    T.prop('lib divisors, tau, sigma', 100, function (r) {
        var n = r.int(1, 10n ** 12n);
        return P.factorize(n).then(function (f) {
            var ds = P.divisors(f.factors), s = ds.reduce(function (a, b) { return a + b; }, 0n);
            return BigInt(ds.length) === P.tau(f.factors) && s === P.sigma(f.factors) && ds.every(function (d) { return n % d === 0n; }) ? true : 'n=' + n;
        });
    });
    T.prop('lib mrBases exact below the bounds', 1, function () {
        /* the known strong pseudoprimes just at the bounds are caught */
        var cases = [2047n, 1373653n, 25326001n, 3215031751n, 2152302898747n, 3474749660383n, 341550071728321n, 3825123056546413051n, 318665857834031151167461n, 3317044064679887385961981n];
        for (var i = 0; i < cases.length; i++) {
            var b = P.mrBases(cases[i]).bases;
            if (b.every(function (a) { return P.mr(cases[i], a).pass; })) return cases[i] + ' passes its bases';
            if (i > 0 && P.mrBases(cases[i] - 2n).bases.length >= b.length) return 'bases do not grow at ' + cases[i];
        }
        /* and each of these is a strong pseudoprime to the previous set (that is why the bound is where it is) */
        for (var j = 0; j < cases.length - 1; j++) {
            var prev = P.mrBases(cases[j] - 2n).bases;
            if (!prev.every(function (a) { return P.mr(cases[j], a).pass; })) return cases[j] + ' is not a pseudoprime to the smaller set';
        }
        return true;
    });
    T.ok('lib cyclic', [1n, 2n, 4n, 9n, 18n, 50n, 97n].every(function (n) { return P.cyclic(n === 1n ? [] : nt.factor(n).factors); }) && [8n, 12n, 15n, 16n, 21n, 100n].every(function (n) { return !P.cyclic(nt.factor(n).factors); }));
    T.eq('lib T keeps long numbers ungrouped', P.T(10n ** 60n), String(10n ** 60n));
    T.eq('lib T groups short numbers', P.T(1234567n), '1\\,234\\,567');
})();
