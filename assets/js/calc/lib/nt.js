/* Toolbox: number theory on BigInt, shared by every tool (Calc.lib.nt). Pure functions, no page code, so the tests
   run them in node. The *Rows functions also return the rows of the procedure, so every tool that shows Euclid's
   algorithm or square and multiply shows it the same way. */
(function (G) {
    'use strict';
    var Calc = G.Calc;
    var nt = Calc.lib.nt = {};

    function abs(a) { return a < 0n ? -a : a; }
    nt.abs = abs;
    /* a mod n in 0..|n|-1 (the mathematician's modulo, also for negative a) */
    nt.mod = function (a, n) { if (n === 0n) Calc.fail('Modulo zero is not defined.'); var m = abs(n), r = a % m; return r < 0n ? r + m : r; };
    /* floor division and the matching remainder, so that a = q*n + r with 0 <= r < |n| (Euclidean division) */
    nt.divmod = function (a, n) {
        if (n === 0n) Calc.fail('Division by zero.');
        var r = nt.mod(a, n), q = (a - r) / n;
        return { q: q, r: r };
    };
    nt.gcd = function (a, b) { a = abs(a); b = abs(b); while (b) { var t = a % b; a = b; b = t; } return a; };
    nt.lcm = function (a, b) { if (!a || !b) return 0n; return abs(a / nt.gcd(a, b) * b); };
    nt.min = function (a, b) { return a < b ? a : b; };
    nt.max = function (a, b) { return a > b ? a : b; };
    nt.bitLength = function (n) { n = abs(n); return n === 0n ? 0 : n.toString(2).length; };
    /* integer square root: the largest r with r*r <= n */
    nt.isqrt = function (n) {
        if (n < 0n) Calc.fail('Square root of a negative number.');
        if (n < 2n) return n;
        var x = 1n << BigInt(Math.ceil(nt.bitLength(n) / 2)), y;
        for (;;) { y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
    };
    nt.isSquare = function (n) { if (n < 0n) return false; var r = nt.isqrt(n); return r * r === n; };
    /* integer k-th root (floor) */
    nt.iroot = function (n, k) {
        if (k === 1n) return n;
        if (n < 2n) return n;
        var hi = 1n << BigInt(Math.ceil(nt.bitLength(n) / Number(k)) + 1), lo = 0n;
        while (lo < hi) { var mid = (lo + hi + 1n) >> 1n; if (mid ** k <= n) lo = mid; else hi = mid - 1n; }
        return lo;
    };

    /* Euclid's algorithm: rows {a, b, q, r} with a = q*b + r, until r = 0. gcd = b of the last row (|a| if b = 0). */
    nt.euclidRows = function (a, b) {
        a = abs(a); b = abs(b);
        var rows = [];
        while (b !== 0n) { var q = a / b, r = a % b; rows.push({ a: a, b: b, q: q, r: r }); a = b; b = r; }
        return rows;
    };
    /* extended Euclid: g = gcd(a, b) = s*a + t*b. rows: {r, q, s, t} with r_i = s_i*a + t_i*b (the table form) */
    nt.egcdRows = function (a, b) {
        var r0 = a, r1 = b, s0 = 1n, s1 = 0n, t0 = 0n, t1 = 1n;
        var rows = [{ r: r0, q: null, s: s0, t: t0 }, { r: r1, q: null, s: s1, t: t1 }];
        while (r1 !== 0n) {
            var q = r0 / r1;   // truncating, fine for a, b >= 0
            var r2 = r0 - q * r1, s2 = s0 - q * s1, t2 = t0 - q * t1;
            rows[rows.length - 1].q = q;
            rows.push({ r: r2, q: null, s: s2, t: t2 });
            r0 = r1; r1 = r2; s0 = s1; s1 = s2; t0 = t1; t1 = t2;
        }
        var g = r0, s = s0, t = t0;
        if (g < 0n) { g = -g; s = -s; t = -t; }
        return { g: g, s: s, t: t, rows: rows };
    };
    nt.egcd = function (a, b) { var e = nt.egcdRows(abs(a), abs(b)); return { g: e.g, s: a < 0n ? -e.s : e.s, t: b < 0n ? -e.t : e.t }; };
    /* inverse of a mod n, or null when gcd(a, n) != 1 */
    nt.inv = function (a, n) {
        n = abs(n);
        if (n === 1n) return 0n;
        var e = nt.egcd(nt.mod(a, n), n);
        return e.g === 1n ? nt.mod(e.s, n) : null;
    };
    /* a^e mod n (e >= 0) */
    nt.powmod = function (a, e, n) {
        n = abs(n);
        if (n === 1n) return 0n;
        if (e < 0n) { var i = nt.inv(a, n); if (i === null) Calc.fail('The base has no inverse modulo n, so a negative exponent is not defined.'); a = i; e = -e; }
        var r = 1n, b = nt.mod(a, n);
        while (e > 0n) { if (e & 1n) r = r * b % n; b = b * b % n; e >>= 1n; }
        return r;
    };
    /* square and multiply, left to right over the bits of e: rows {bit, square, mul, acc} (acc after the bit) */
    nt.powmodRows = function (a, e, n) {
        n = abs(n);
        var b = nt.mod(a, n), acc = 1n % n, rows = [], bitsStr = e.toString(2);
        for (var i = 0; i < bitsStr.length; i++) {
            var sq = acc * acc % n, bit = bitsStr.charAt(i), out = bit === '1' ? sq * b % n : sq;
            rows.push({ bit: bit, before: acc, square: sq, mul: bit === '1', acc: out });
            acc = out;
        }
        return { bits: bitsStr, rows: rows, value: acc };
    };

    /* ---------- primes ---------- */
    var SMALL = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n, 59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n];
    nt.SMALL_PRIMES = SMALL;
    /* one Miller-Rabin round with base a: true when n passes (is a strong probable prime to base a) */
    nt.mrRound = function (n, a) {
        var d = n - 1n, s = 0;
        while ((d & 1n) === 0n) { d >>= 1n; s++; }
        var x = nt.powmod(a, d, n);
        if (x === 1n || x === n - 1n) return true;
        for (var i = 1; i < s; i++) { x = x * x % n; if (x === n - 1n) return true; if (x === 1n) return false; }
        return false;
    };
    /* deterministic below 3.3 * 10^24 (the first 13 primes as bases), and 13 + extra random-looking bases above,
       which is a probable-prime test with error far below 4^-20 */
    nt.isPrime = function (n) {
        if (n < 2n) return false;
        for (var i = 0; i < SMALL.length; i++) { if (n === SMALL[i]) return true; if (n % SMALL[i] === 0n) return false; }
        var bases = SMALL.slice(0, 13);
        if (n >= 3317044064679887385961981n) {
            var x = 0x9E3779B97F4A7C15n;
            for (var k = 0; k < 12; k++) { x = (x * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n); bases.push(2n + x % (n - 3n)); }
        }
        return bases.every(function (a) { return nt.mrRound(n, a); });
    };
    nt.nextPrime = function (n) { if (n < 2n) return 2n; var p = n + 1n; if (p > 2n && p % 2n === 0n) p++; while (!nt.isPrime(p)) p += 2n; return p; };
    nt.prevPrime = function (n) { if (n <= 2n) return null; var p = n - 1n; if (p > 2n && p % 2n === 0n) p--; while (p >= 2n && !nt.isPrime(p)) p -= p === 3n ? 1n : 2n; return p >= 2n ? p : null; };

    /* Pollard's rho (Brent's variant) for one non-trivial factor of an odd composite n; null if it gives up */
    nt.rho = function (n, maxIter) {
        if (n % 2n === 0n) return 2n;
        maxIter = maxIter || 2000000;
        for (var c = 1n; c < 30n; c++) {
            var y = 2n, m = 128n, g = 1n, r = 1n, q = 1n, x, ys, it = 0;
            var f = function (v) { return (v * v + c) % n; };
            do {
                x = y;
                for (var i = 0n; i < r; i++) y = f(y);
                var k = 0n;
                do {
                    ys = y;
                    var lim = nt.min(m, r - k);
                    for (var j = 0n; j < lim; j++) { y = f(y); q = q * abs(x - y) % n; }
                    g = nt.gcd(q, n);
                    k += m;
                    it += Number(lim);
                } while (k < r && g === 1n && it < maxIter);
                r *= 2n;
            } while (g === 1n && it < maxIter);
            if (g === n) { do { ys = f(ys); g = nt.gcd(abs(x - ys), n); } while (g === 1n); }
            if (g !== 1n && g !== n) return g;
            if (it >= maxIter) return null;
        }
        return null;
    };
    /* the factorization of n >= 1 as a sorted list [{p, e}]; complete is false when a composite part could not be
       split (then it is listed with composite: true). Trial division up to 10^5, then Pollard's rho. */
    nt.factor = function (n) {
        n = abs(n);
        var out = {}, complete = true, stack = [];
        function add(p, comp) { var k = String(p); if (!out[k]) out[k] = { p: p, e: 0, composite: !!comp }; out[k].e++; }
        if (n === 0n) Calc.fail('0 has no prime factorization.');
        for (var p = 2n; p * p <= n && p < 100000n; p += p === 2n ? 1n : 2n) { while (n % p === 0n) { add(p); n /= p; } }
        if (n > 1n) stack.push(n);
        while (stack.length) {
            var m = stack.pop();
            if (m === 1n) continue;
            if (nt.isPrime(m)) { add(m); continue; }
            var r = nt.iroot(m, 2n);
            if (r * r === m) { stack.push(r, r); continue; }
            var d = nt.rho(m);
            if (!d) { add(m, true); complete = false; continue; }
            stack.push(d, m / d);
        }
        var list = Object.keys(out).map(function (k) { return out[k]; });
        list.sort(function (a, b) { return a.p < b.p ? -1 : a.p > b.p ? 1 : 0; });
        return { factors: list, complete: complete };
    };
    nt.phi = function (n) {
        if (n < 1n) Calc.fail('Euler\'s totient is defined for n >= 1.');
        var f = nt.factor(n);
        if (!f.complete) Calc.fail('This number could not be fully factored, so its totient is unknown.');
        return f.factors.reduce(function (acc, x) { return acc * (x.p - 1n) * x.p ** BigInt(x.e - 1); }, 1n);
    };

    /* ---------- congruences ---------- */
    /* Chinese remainder theorem for x = r_i (mod m_i), also when the moduli share factors: {x, m} with x in 0..m-1,
       or null when the system has no solution */
    nt.crt = function (rs, ms) {
        var x = 0n, m = 1n;
        for (var i = 0; i < rs.length; i++) {
            var mi = abs(ms[i]), ri = nt.mod(rs[i], mi), g = nt.gcd(m, mi);
            if ((ri - x) % g !== 0n) return null;
            var e = nt.egcd(m / g, mi / g);
            var l = m / g * mi;
            x = nt.mod(x + m * nt.mod((ri - x) / g * e.s, mi / g), l);
            m = l;
        }
        return { x: x, m: m };
    };
    /* Jacobi symbol (a/n) for odd n > 0 (the Legendre symbol when n is prime) */
    nt.jacobi = function (a, n) {
        if (n <= 0n || n % 2n === 0n) Calc.fail('The Jacobi symbol needs an odd positive n.');
        a = nt.mod(a, n);
        var t = 1;
        while (a !== 0n) {
            while (a % 2n === 0n) { a /= 2n; var r = n % 8n; if (r === 3n || r === 5n) t = -t; }
            var tmp = a; a = n; n = tmp;
            if (a % 4n === 3n && n % 4n === 3n) t = -t;
            a %= n;
        }
        return n === 1n ? t : 0;
    };
    /* a square root of a mod an odd prime p (Tonelli-Shanks), or null when a is not a square mod p */
    nt.sqrtModPrime = function (a, p) {
        a = nt.mod(a, p);
        if (a === 0n) return 0n;
        if (p === 2n) return a;
        if (nt.powmod(a, (p - 1n) / 2n, p) !== 1n) return null;
        if (p % 4n === 3n) return nt.powmod(a, (p + 1n) / 4n, p);
        var q = p - 1n, s = 0n;
        while (q % 2n === 0n) { q /= 2n; s++; }
        var z = 2n;
        while (nt.powmod(z, (p - 1n) / 2n, p) !== p - 1n) z++;
        var m = s, c = nt.powmod(z, q, p), t = nt.powmod(a, q, p), r = nt.powmod(a, (q + 1n) / 2n, p);
        while (t !== 1n) {
            var i = 0n, t2 = t;
            while (t2 !== 1n) { t2 = t2 * t2 % p; i++; }
            var b = nt.powmod(c, 1n << (m - i - 1n), p);
            m = i; c = b * b % p; t = t * c % p; r = r * b % p;
        }
        return r;
    };
})(typeof window !== 'undefined' ? window : globalThis);
