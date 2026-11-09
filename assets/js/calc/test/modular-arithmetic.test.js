/* Tests for the Modular arithmetic tools and lib/nt.js (see run.js for the API). */
T.tool('modulo', [
    { in: { a: '123', n: '4', conv: 'euclid' }, copy: '3' },
    { in: { a: '-17', n: '5', conv: 'euclid' }, copy: '3' },
    { in: { a: '-17', n: '5', conv: 'trunc' }, copy: '-2' },
    { in: { a: '-17', n: '5', conv: 'floor' }, copy: '3' },
    { in: { a: '17', n: '-5', conv: 'floor' }, copy: '-3' },
    { in: { a: '17', n: '-5', conv: 'euclid' }, copy: '2' },
    { in: { a: '2^100', n: '97', conv: 'euclid' }, copy: String((2n ** 100n) % 97n) },
    { in: { a: '0', n: '7', conv: 'euclid' }, copy: '0' },
    { in: { a: '5', n: '0', conv: 'euclid' }, error: true },
    { in: { a: '5x', n: '3', conv: 'euclid' }, error: true }
]);
T.tool('gcd', [
    { in: { nums: '252, 105' }, copy: 'gcd = 21\nlcm = 1260' },
    { in: { nums: '12, 18, 30' }, copy: 'gcd = 6\nlcm = 180' },
    { in: { nums: '0, 5' }, copy: 'gcd = 5\nlcm = 0' },
    { in: { nums: '-12, 18' }, copy: 'gcd = 6\nlcm = 36' },
    { in: { nums: '0, 0' }, error: true },
    { in: { nums: '7' }, error: true }
]);
T.tool('modular-inverse', [
    { in: { a: '17', n: '3120' }, copy: '2753' },
    { in: { a: '3', n: '26' }, copy: '9' },
    { in: { a: '6', n: '15' }, copy: 'no inverse' },
    { in: { a: '-3', n: '26' }, copy: '17' },
    { in: { a: '0', n: '7' }, copy: 'no inverse' },
    { in: { a: '5', n: '1' }, error: true }
]);
T.prop('modulo random', 300, function (r) {
    var a = r.int(-(10n ** 30n), 10n ** 30n), n = r.int(1, 10n ** 20n) * (r.num(0, 1) ? 1n : -1n);
    return T.run('modulo', { a: String(a), n: String(n), conv: 'euclid' }).then(function (o) {
        var x = BigInt(o.copy), m = n < 0n ? -n : n;
        return x >= 0n && x < m && (a - x) % m === 0n ? true : 'a=' + a + ' n=' + n + ' got ' + x;
    });
});
T.prop('modular-inverse random', 300, function (r) {
    var n = r.int(2, 10n ** 25n), a = r.int(-(10n ** 25n), 10n ** 25n);
    return T.run('modular-inverse', { a: String(a), n: String(n) }).then(function (o) {
        var g = Calc.lib.nt.gcd(a, n);
        if (g !== 1n) return o.copy === 'no inverse' ? true : 'expected no inverse for a=' + a + ' n=' + n;
        var x = BigInt(o.copy);
        return Calc.lib.nt.mod(a * x, n) === 1n % n ? true : 'a=' + a + ' n=' + n + ' got ' + x;
    });
});
T.prop('gcd random', 200, function (r) {
    var a = r.int(0, 10n ** 30n), b = r.int(1, 10n ** 30n), k = r.int(1, 10n ** 6n);
    return T.run('gcd', { nums: (a * k) + ', ' + (b * k) }).then(function (o) {
        var g = BigInt(o.copy.split('\n')[0].replace('gcd = ', ''));
        return g % k === 0n && (a * k) % g === 0n && (b * k) % g === 0n && Calc.lib.nt.gcd(a * k / g, b * k / g) === 1n ? true : 'wrong gcd ' + g;
    });
});
/* the library */
T.prop('nt.isPrime against trial division', 1, function () {
    var nt = Calc.lib.nt;
    for (var n = 0n; n < 5000n; n++) {
        var p = n >= 2n;
        for (var d = 2n; d * d <= n; d++) if (n % d === 0n) { p = false; break; }
        if (nt.isPrime(n) !== p) return 'isPrime(' + n + ')';
    }
    var carmichael = [561n, 1105n, 1729n, 2465n, 2821n, 6601n, 8911n, 3215031751n, 3825123056546413051n];
    for (var i = 0; i < carmichael.length; i++) if (nt.isPrime(carmichael[i])) return 'pseudoprime ' + carmichael[i];
    if (!nt.isPrime(2n ** 127n - 1n) || nt.isPrime(2n ** 128n + 1n) || !nt.isPrime(2n ** 521n - 1n)) return 'Mersenne/Fermat';
    return true;
});
T.prop('nt.factor', 60, function (r) {
    var nt = Calc.lib.nt, n = r.int(2, 10n ** 24n), f = nt.factor(n);
    var prod = f.factors.reduce(function (a, x) { return a * x.p ** BigInt(x.e); }, 1n);
    if (prod !== n) return 'product ' + prod + ' != ' + n;
    if (f.complete && !f.factors.every(function (x) { return nt.isPrime(x.p); })) return 'non-prime factor of ' + n;
    return true;
});
T.prop('nt.crt', 300, function (r) {
    var nt = Calc.lib.nt, k = r.num(2, 4), rs = [], ms = [];
    var x = r.int(0, 10n ** 12n);
    for (var i = 0; i < k; i++) { var m = r.int(2, 10n ** 4n); ms.push(m); rs.push(x % m); }
    var c = nt.crt(rs, ms);
    if (!c) return 'no solution for a consistent system';
    return ms.every(function (m, i) { return nt.mod(c.x, m) === rs[i]; }) && c.x < c.m ? true : 'wrong CRT';
});
T.prop('nt.sqrtModPrime and jacobi', 200, function (r) {
    var nt = Calc.lib.nt, p = nt.nextPrime(r.int(3, 10n ** 15n)), a = r.int(0, p - 1n);
    var j = nt.jacobi(a, p), s = nt.sqrtModPrime(a, p);
    if (a === 0n) return s === 0n && j === 0 ? true : 'zero';
    if (j === 1) return s !== null && s * s % p === a ? true : 'sqrt of a residue';
    return s === null ? true : 'sqrt of a non-residue';
});
T.prop('nt.powmodRows', 200, function (r) {
    var nt = Calc.lib.nt, n = r.int(2, 10n ** 20n), a = r.int(0, n), e = r.int(0, 10n ** 20n);
    var t = nt.powmodRows(a, e, n);
    return t.value === nt.powmod(a, e, n) ? true : 'powmodRows';
});
T.prop('Calc.int expressions', 1, function () {
    var cases = [['2^10', 1024n], ['-2^2', -4n], ['(1+2)*3', 9n], ['10 % 3', 1n], ['-7 % 3', 2n], ['5!', 120n], ['0x1F + 0b11', 34n], ['1e6', 1000000n], ['gcd(12, 18)', 6n], ['2^3^2', 512n], ['1_000', 1000n], ['12/4', 3n]];
    for (var i = 0; i < cases.length; i++) if (Calc.int(cases[i][0]) !== cases[i][1]) return cases[i][0] + ' gave ' + Calc.int(cases[i][0]);
    var bad = ['', '1 +', '7/2', '2^-1', 'foo(2)', '(1', '1 2'];
    for (var j = 0; j < bad.length; j++) { try { Calc.int(bad[j]); return 'no error for "' + bad[j] + '"'; } catch (e) { if (!(e instanceof Calc.UserError)) return 'wrong error type for ' + bad[j]; } }
    return true;
});

/* ---------- the tools added with the category: every check block a tool draws must be a tick ---------- */
function checksOk(S) {
    for (var i = 0; i < S.steps.length; i++) {
        var b = S.steps[i].blocks;
        for (var j = 0; j < b.length; j++) if (b[j].t === 'check' && !b[j].ok) return 'failed check in step ' + (i + 1) + ': ' + b[j].v;
    }
    return true;
}
function okChecks(S) { return checksOk(S); }

T.tool('euclidean-division', [
    { in: { a: '1234', b: '7', conv: 'euclid' }, copy: 'q = 176\nr = 2', check: okChecks },
    { in: { a: '-17', b: '5', conv: 'euclid' }, copy: 'q = -4\nr = 3', check: okChecks },
    { in: { a: '-17', b: '5', conv: 'trunc' }, copy: 'q = -3\nr = -2', check: okChecks },
    { in: { a: '-17', b: '5', conv: 'floor' }, copy: 'q = -4\nr = 3', check: okChecks },
    { in: { a: '-17', b: '5', conv: 'round' }, copy: 'q = -3\nr = -2', check: okChecks },
    { in: { a: '17', b: '-5', conv: 'euclid' }, copy: 'q = -3\nr = 2', check: okChecks },
    { in: { a: '17', b: '-5', conv: 'floor' }, copy: 'q = -4\nr = -3', check: okChecks },
    { in: { a: '17', b: '-5', conv: 'trunc' }, copy: 'q = -3\nr = 2', check: okChecks },
    { in: { a: '-17', b: '-5', conv: 'euclid' }, copy: 'q = 4\nr = 3', check: okChecks },
    { in: { a: '26', b: '7', conv: 'round' }, copy: 'q = 4\nr = -2', check: okChecks },
    { in: { a: '7', b: '2', conv: 'round' }, copy: 'q = 3\nr = 1', check: okChecks },
    { in: { a: '-7', b: '2', conv: 'round' }, copy: 'q = -4\nr = 1', check: okChecks },
    { in: { a: '0', b: '5', conv: 'euclid' }, copy: 'q = 0\nr = 0' },
    { in: { a: '3', b: '7', conv: 'euclid' }, copy: 'q = 0\nr = 3' },
    { in: { a: '-3', b: '7', conv: 'euclid' }, copy: 'q = -1\nr = 4', check: okChecks },
    { in: { a: '1000000', b: '1', conv: 'euclid' }, copy: 'q = 1000000\nr = 0' },
    { in: { a: '10^40 + 3', b: '10^20', conv: 'euclid' }, copy: 'q = ' + 10n ** 20n + '\nr = 3', check: okChecks },
    { in: { a: '5', b: '0', conv: 'euclid' }, error: true },
    { in: { a: '5 +', b: '3', conv: 'euclid' }, error: true }
]);
T.prop('euclidean-division random, every convention', 300, function (r) {
    var a = r.int(-(10n ** 35n), 10n ** 35n), b = r.int(1, r.pick([10n, 10n ** 6n, 10n ** 14n])) * (r.num(0, 1) ? 1n : -1n);
    var conv = r.pick(['euclid', 'floor', 'trunc', 'round']), m = b < 0n ? -b : b;
    return T.run('euclidean-division', { a: String(a), b: String(b), conv: conv }).then(function (o) {
        var p = /^q = (-?\d+)\nr = (-?\d+)$/.exec(o.copy || '');
        if (!p) return 'bad copy ' + o.copy;
        var q = BigInt(p[1]), rr = BigInt(p[2]);
        if (q * b + rr !== a) return 'q*b + r != a for a=' + a + ' b=' + b;
        var ok = conv === 'euclid' ? rr >= 0n && rr < m : conv === 'round' ? -m < 2n * rr && 2n * rr <= m
            : (rr < 0n ? -rr : rr) < m && (rr === 0n || (rr < 0n) === ((conv === 'trunc' ? a : b) < 0n));
        if (!ok) return conv + ': remainder ' + rr + ' out of range for a=' + a + ' b=' + b;
        if (conv === 'euclid' && rr !== Calc.lib.nt.divmod(a, b).r) return 'differs from nt.divmod';
        return checksOk(o.S);
    });
});

T.tool('extended-euclid', [
    { in: { a: '240', b: '46' }, copy: 'gcd = 2\ns = -9\nt = 47', check: okChecks },
    { in: { a: '1071', b: '462' }, copy: 'gcd = 21\ns = -3\nt = 7', check: okChecks },
    { in: { a: '17', b: '3120' }, copy: 'gcd = 1\ns = -367\nt = 2', check: okChecks },
    { in: { a: '-56', b: '15' }, copy: 'gcd = 1\ns = 4\nt = 15', check: okChecks },
    { in: { a: '12', b: '4' }, copy: 'gcd = 4\ns = 0\nt = 1', check: okChecks },
    { in: { a: '0', b: '5' }, copy: 'gcd = 5\ns = 0\nt = 1', check: okChecks },
    { in: { a: '5', b: '0' }, copy: 'gcd = 5\ns = 1\nt = 0', check: okChecks },
    { in: { a: '-5', b: '0' }, copy: 'gcd = 5\ns = -1\nt = 0', check: okChecks },
    { in: { a: '7', b: '7' }, copy: 'gcd = 7\ns = 0\nt = 1', check: okChecks },
    { in: { a: '1', b: '1' }, copy: 'gcd = 1\ns = 0\nt = 1' },
    { in: { a: '0', b: '0' }, error: true },
    { in: { a: 'abc', b: '3' }, error: true }
]);
T.prop('extended-euclid random', 300, function (r) {
    var nt = Calc.lib.nt, k = r.int(1, r.pick([1n, 1000n])), a = r.int(-(10n ** 30n), 10n ** 30n) * k, b = r.int(-(10n ** 30n), 10n ** 30n) * k;
    if (a === 0n && b === 0n) b = 1n;
    return T.run('extended-euclid', { a: String(a), b: String(b) }).then(function (o) {
        var p = /^gcd = (\d+)\ns = (-?\d+)\nt = (-?\d+)$/.exec(o.copy || '');
        if (!p) return 'bad copy ' + o.copy;
        var g = BigInt(p[1]), s = BigInt(p[2]), t = BigInt(p[3]);
        if (g !== nt.gcd(a, b)) return 'wrong gcd for ' + a + ', ' + b;
        if (s * a + t * b !== g) return 'Bezout fails for ' + a + ', ' + b;
        /* the algorithm gives the small pair: |s| <= |b|/g and |t| <= |a|/g (or 1) */
        if (nt.abs(s) > nt.max(1n, nt.abs(b) / g) || nt.abs(t) > nt.max(1n, nt.abs(a) / g)) return 'coefficients not reduced for ' + a + ', ' + b;
        return checksOk(o.S);
    });
});

T.tool('modular-exponentiation', [
    { in: { a: '5', e: '117', n: '19', dir: 'ltr' }, copy: '1', check: okChecks },
    { in: { a: '4', e: '13', n: '497', dir: 'ltr' }, copy: '445', check: okChecks },
    { in: { a: '4', e: '13', n: '497', dir: 'rtl' }, copy: '445', check: okChecks },
    { in: { a: '65', e: '17', n: '3233', dir: 'ltr' }, copy: '2790', check: okChecks },
    { in: { a: '2790', e: '2753', n: '3233', dir: 'rtl' }, copy: '65', check: okChecks },
    { in: { a: '3', e: '-5', n: '7', dir: 'ltr' }, copy: '3', check: okChecks },
    { in: { a: '-2', e: '3', n: '7', dir: 'ltr' }, copy: '6', check: okChecks },
    { in: { a: '7', e: '560', n: '561', dir: 'ltr' }, copy: '1', check: okChecks },
    { in: { a: '2', e: '10^20', n: '101', dir: 'ltr' }, copy: String(Calc.lib.nt.powmod(2n, 10n ** 20n, 101n)), check: okChecks },
    { in: { a: '2', e: '-1', n: '4', dir: 'ltr' }, copy: 'undefined' },
    { in: { a: '10', e: '0', n: '7', dir: 'ltr' }, copy: '1' },
    { in: { a: '0', e: '0', n: '7', dir: 'rtl' }, copy: '1' },
    { in: { a: '0', e: '5', n: '7', dir: 'rtl' }, copy: '0' },
    { in: { a: '5', e: '3', n: '1', dir: 'ltr' }, copy: '0' },
    { in: { a: '3', e: '1', n: '7', dir: 'ltr' }, copy: '3' },
    { in: { a: '6', e: '100', n: '12', dir: 'ltr' }, copy: '0', check: okChecks },
    { in: { a: '3', e: '2^20001', n: '7', dir: 'ltr' }, error: true },
    { in: { a: '3', e: '5', n: '0', dir: 'ltr' }, error: true }
]);
T.prop('modular-exponentiation random against nt.powmod', 300, function (r) {
    var nt = Calc.lib.nt, n = r.int(1, r.pick([50n, 10n ** 12n, 10n ** 40n])), a = r.int(-(10n ** 20n), 10n ** 20n), e = r.int(-(10n ** 30n), 10n ** 30n);
    var dir = r.pick(['ltr', 'rtl']);
    return T.run('modular-exponentiation', { a: String(a), e: String(e), n: String(n), dir: dir }).then(function (o) {
        if (o.errors) return 'error ' + JSON.stringify(o.errors);
        if (e < 0n && n > 1n && nt.gcd(a, n) !== 1n) return o.copy === 'undefined' ? true : 'expected undefined';
        var want = nt.powmod(a, e, n);
        return o.copy === String(want) ? checksOk(o.S) : a + '^' + e + ' mod ' + n + ': got ' + o.copy + ', want ' + want;
    });
});

T.tool('modular-calculator', [
    { in: { expr: '3 * (5 + 4) / 2 - 2^10', n: '7' }, copy: '1', check: okChecks },
    { in: { expr: '1/2 + 1/3', n: '11' }, copy: '10', check: okChecks },
    { in: { expr: '5/6', n: '11' }, copy: '10' },
    { in: { expr: '2^100 - 1', n: '1000000007' }, copy: String(Calc.lib.nt.mod(2n ** 100n - 1n, 1000000007n)) },
    { in: { expr: '(17^-1 * 2753) ^ 3', n: '3120' }, copy: String(Calc.lib.nt.mod(2753n * 2753n, 3120n) ** 3n % 3120n) },
    { in: { expr: '-3', n: '7' }, copy: '4' },
    { in: { expr: '10', n: '7' }, copy: '3' },
    { in: { expr: '2^-1', n: '7' }, copy: '4' },
    { in: { expr: '2^(1+2)', n: '5' }, copy: '3' },
    { in: { expr: '2^3^2', n: '1000' }, copy: '512' },
    { in: { expr: '-2^2', n: '10' }, copy: '6' },
    { in: { expr: '0^0', n: '5' }, copy: '1' },
    { in: { expr: '3 × 4 − 1', n: '5' }, copy: '1' },
    { in: { expr: '[2 + 3] * 2', n: '7' }, copy: '3' },
    { in: { expr: '0x10 + 0b11', n: '100' }, copy: '19' },
    { in: { expr: '2^(10 - 3*4)', n: '7' }, copy: '2' },
    { in: { expr: '2/4', n: '26' }, error: true },
    { in: { expr: '1/0', n: '7' }, error: true },
    { in: { expr: '2^(1/2)', n: '7' }, error: true },
    { in: { expr: '2 +', n: '7' }, error: true },
    { in: { expr: '(1 + 2', n: '7' }, error: true },
    { in: { expr: '1 + 2)', n: '7' }, error: true },
    { in: { expr: '2 3', n: '7' }, error: true },
    { in: { expr: 'x + 1', n: '7' }, error: true },
    { in: { expr: '', n: '7' }, error: true },
    { in: { expr: '1 + 1', n: '1' }, error: true }
]);
T.prop('modular-calculator random against Calc.int', 300, function (r) {
    var nt = Calc.lib.nt, n = r.int(2, r.pick([30n, 10n ** 9n, 10n ** 30n]));
    function gen(d) {
        if (d === 0 || r.num(0, 3) === 0) return String(r.int(0, 10n ** 12n));
        var k = r.num(0, 5);
        if (k === 0) return '(' + gen(d - 1) + ')';
        if (k === 1) return '-' + gen(d - 1);
        if (k === 2) return '(' + gen(d - 1) + ')^' + r.num(0, 6);
        return gen(d - 1) + ' ' + r.pick(['+', '-', '*']) + ' ' + gen(d - 1);
    }
    var ex = gen(4), want = nt.mod(Calc.int(ex), n);
    return T.run('modular-calculator', { expr: ex, n: String(n) }).then(function (o) {
        return o.copy === String(want) ? checksOk(o.S) : '"' + ex + '" mod ' + n + ': got ' + o.copy + ', want ' + want + ' ' + JSON.stringify(o.errors);
    });
});
T.prop('modular-calculator division', 200, function (r) {
    var nt = Calc.lib.nt, n = r.int(2, 10n ** 15n), a = r.int(-(10n ** 15n), 10n ** 15n), b = r.int(1, 10n ** 15n);
    return T.run('modular-calculator', { expr: a + ' / ' + b, n: String(n) }).then(function (o) {
        if (nt.gcd(b, n) !== 1n) return o.errors ? true : 'expected an error for ' + a + '/' + b + ' mod ' + n;
        var x = BigInt(o.copy);
        return nt.mod(x * b - a, n) === 0n ? checksOk(o.S) : 'x*b != a for ' + a + '/' + b + ' mod ' + n;
    });
});

T.tool('linear-congruence', [
    { in: { a: '14', b: '30', n: '100' }, copy: '45 mod 50', check: okChecks },
    { in: { a: '3', b: '4', n: '7' }, copy: '6 mod 7', check: okChecks },
    { in: { a: '6', b: '4', n: '9' }, copy: 'no solution' },
    { in: { a: '-5', b: '17', n: '26' }, copy: '7 mod 26', check: okChecks },
    { in: { a: '0', b: '0', n: '6' }, copy: '0 mod 1', check: okChecks },
    { in: { a: '0', b: '3', n: '6' }, copy: 'no solution' },
    { in: { a: '12', b: '0', n: '6' }, copy: '0 mod 1', check: okChecks },
    { in: { a: '5', b: '3', n: '1' }, copy: '0 mod 1' },
    { in: { a: '4', b: '6', n: '10' }, copy: '4 mod 5', check: okChecks },
    { in: { a: '1', b: '-1', n: '10' }, copy: '9 mod 10' },
    { in: { a: '3', b: '4', n: '0' }, error: true },
    { in: { a: '3', b: '', n: '7' }, error: true }
]);
T.prop('linear-congruence against brute force', 400, function (r) {
    var nt = Calc.lib.nt, n = r.int(1, 120), a = r.int(-300, 300), b = r.int(-300, 300);
    return T.run('linear-congruence', { a: String(a), b: String(b), n: String(n) }).then(function (o) {
        var sols = [];
        for (var x = 0n; x < n; x++) if (nt.mod(a * x - b, n) === 0n) sols.push(x);
        if (!sols.length) return o.copy === 'no solution' ? true : 'expected no solution for ' + a + 'x = ' + b + ' mod ' + n;
        var p = /^(\d+) mod (\d+)$/.exec(o.copy || '');
        if (!p) return 'bad copy ' + o.copy;
        var x0 = BigInt(p[1]), m = BigInt(p[2]);
        if (x0 !== sols[0] || n / m !== BigInt(sols.length) || !sols.every(function (s) { return s % m === x0; })) return 'wrong solutions for ' + a + 'x = ' + b + ' mod ' + n + ': ' + o.copy;
        return checksOk(o.S);
    });
});

T.tool('chinese-remainder', [
    { in: { form: 'lists', method: 'auto', rs: '2, 3, 2', ms: '3, 5, 7' }, copy: '23 mod 105', check: okChecks },
    { in: { form: 'lists', method: 'subst', rs: '2, 3, 2', ms: '3, 5, 7' }, copy: '23 mod 105', check: okChecks },
    { in: { form: 'lines', method: 'auto', sys: 'x ≡ 1 (mod 4)\nx ≡ 3 (mod 6)' }, copy: '9 mod 12', check: okChecks },
    { in: { form: 'lists', method: 'auto', rs: '1, 2', ms: '4, 6' }, copy: 'no solution' },
    { in: { form: 'lines', method: 'auto', sys: 'x = 3 mod 10\nx = 8 mod 15\nx = 5 mod 84' }, copy: '173 mod 420', check: okChecks },
    { in: { form: 'lines', method: 'auto', sys: 'x mod 3 = 2\n3 (mod 5)\nx % 7 = 2\n\n' }, copy: '23 mod 105', check: okChecks },
    { in: { form: 'lines', method: 'subst', sys: 'x = 2 modulo 3; x == 3 mod 5' }, copy: '8 mod 15', check: okChecks },
    { in: { form: 'lists', method: 'auto', rs: '-1, -1', ms: '3, 5' }, copy: '14 mod 15', check: okChecks },
    { in: { form: 'lists', method: 'auto', rs: '0, 5', ms: '1, 7' }, copy: '5 mod 7', check: okChecks },
    { in: { form: 'lists', method: 'auto', rs: '3, 3', ms: '6, 6' }, copy: '3 mod 6', check: okChecks },
    { in: { form: 'lists', method: 'auto', rs: '3, 1', ms: '6, 3' }, copy: 'no solution' },
    { in: { form: 'lists', method: 'auto', rs: '1, 2, 3', ms: '3, 5' }, error: true },
    { in: { form: 'lists', method: 'auto', rs: '1, 2', ms: '3, 0' }, error: true },
    { in: { form: 'lists', method: 'auto', rs: '1', ms: '3' }, error: true },
    { in: { form: 'lines', method: 'auto', sys: 'x = 2 mod 3\nhello' }, error: true },
    { in: { form: 'lines', method: 'auto', sys: '3x = 2 mod 5\nx = 1 mod 3' }, error: true },
    { in: { form: 'lines', method: 'auto', sys: '' }, error: true }
]);
T.prop('chinese-remainder random consistent systems', 300, function (r) {
    var nt = Calc.lib.nt, k = r.num(2, 6), x = r.int(0, 10n ** 18n), rs = [], ms = [], L = 1n;
    for (var i = 0; i < k; i++) { var m = r.int(1, r.pick([12n, 1000n, 10n ** 6n])); ms.push(m); rs.push(nt.mod(x, m) + m * r.int(-3, 3)); L = nt.lcm(L, m); }
    var method = r.pick(['auto', 'subst']);
    return T.run('chinese-remainder', { form: 'lists', method: method, rs: rs.join(', '), ms: ms.join(', ') }).then(function (o) {
        var p = /^(\d+) mod (\d+)$/.exec(o.copy || '');
        if (!p) return 'bad copy ' + o.copy + ' ' + JSON.stringify(o.errors);
        var X = BigInt(p[1]), M = BigInt(p[2]);
        if (M !== L || X >= M || nt.mod(X - x, M) !== 0n) return 'wrong solution ' + o.copy + ' for ' + rs + ' / ' + ms;
        return checksOk(o.S);
    });
});
T.prop('chinese-remainder against brute force', 300, function (r) {
    var nt = Calc.lib.nt, k = r.num(2, 4), rs = [], ms = [], L = 1n;
    for (var i = 0; i < k; i++) { var m = r.int(1, 15); ms.push(m); rs.push(r.int(0, 20)); L = nt.lcm(L, m); }
    var first = null;
    for (var x = 0n; x < L && first === null; x++) if (ms.every(function (m, j) { return nt.mod(x - rs[j], m) === 0n; })) first = x;
    return T.run('chinese-remainder', { form: 'lines', method: 'auto', sys: rs.map(function (rr, j) { return 'x = ' + rr + ' mod ' + ms[j]; }).join('\n') }).then(function (o) {
        if (first === null) return o.copy === 'no solution' ? true : 'expected no solution for ' + rs + ' / ' + ms;
        return o.copy === first + ' mod ' + L ? checksOk(o.S) : 'got ' + o.copy + ', want ' + first + ' mod ' + L;
    });
});

T.tool('base-conversion', [
    { in: { num: '2024', from: '10', to: '2' }, copy: '11111101000', check: okChecks },
    { in: { num: 'FF', from: '16', to: '10' }, copy: '255' },
    { in: { num: 'ff', from: '16', to: '2' }, copy: '11111111' },
    { in: { num: '0x1f', from: '16', to: '10' }, copy: '31' },
    { in: { num: '-1011010', from: '2', to: '16' }, copy: '-5A', check: okChecks },
    { in: { num: '5025', from: '10', to: '60' }, copy: '1 23 45' },
    { in: { num: '1 23 45', from: '60', to: '10' }, copy: '5025' },
    { in: { num: '1:23:45', from: '60', to: '60' }, copy: '1 23 45' },
    { in: { num: 'TWFu', from: '64', to: '16' }, copy: '4D616E' },
    { in: { num: '255', from: '10', to: '64' }, copy: 'D/' },
    { in: { num: 'ZZ', from: '36', to: '8' }, copy: '2417' },
    { in: { num: '0', from: '10', to: '2' }, copy: '0' },
    { in: { num: '-0', from: '10', to: '7' }, copy: '0' },
    { in: { num: '000101', from: '2', to: '10' }, copy: '5' },
    { in: { num: '1 000 000', from: '10', to: '16' }, copy: 'F4240' },
    { in: { num: '256', from: '10', to: '256' }, copy: '1 0' },
    { in: { num: '12', from: '2', to: '10' }, error: true },
    { in: { num: 'G', from: '16', to: '10' }, error: true },
    { in: { num: '', from: '10', to: '2' }, error: true },
    { in: { num: '5', from: '1', to: '2' }, error: true },
    { in: { num: 'A', from: '40', to: '10' }, error: true },
    { in: { num: '60', from: '60', to: '10' }, error: true },
    { in: { num: 'A=', from: '64', to: '10' }, error: true }
]);
T.prop('base-conversion round trip', 300, function (r) {
    var N = r.int(-(10n ** 40n), 10n ** 40n), c = BigInt(r.pick([2, 3, 7, 8, 16, 36, 64, 60, 256, 1000, r.num(2, 36)]));
    return T.run('base-conversion', { num: String(N), from: '10', to: String(c) }).then(function (o) {
        if (o.errors) return 'error ' + JSON.stringify(o.errors);
        if (c <= 36n && o.copy !== N.toString(Number(c)).toUpperCase()) return 'base ' + c + ': got ' + o.copy + ' for ' + N;
        return T.run('base-conversion', { num: o.copy, from: String(c), to: '10' }).then(function (o2) {
            return o2.copy === String(N) ? checksOk(o2.S) : 'round trip base ' + c + ': ' + N + ' -> ' + o.copy + ' -> ' + o2.copy;
        });
    });
});

T.tool('zn-tables', [
    { in: { n: '12', show: 'all' }, copy: 'units: 1, 5, 7, 11\nzero divisors: 2, 3, 4, 6, 8, 9, 10\ngenerators: none', check: okChecks },
    { in: { n: '7', show: 'all' }, copy: 'units: 1, 2, 3, 4, 5, 6\nzero divisors: none\ngenerators: 3, 5', check: okChecks },
    { in: { n: '9', show: 'pow' }, copy: 'units: 1, 2, 4, 5, 7, 8\nzero divisors: 3, 6\ngenerators: 2, 5' },
    { in: { n: '2', show: 'mul' }, copy: 'units: 1\nzero divisors: none\ngenerators: 1' },
    { in: { n: '8', show: 'units' }, copy: 'units: 1, 3, 5, 7\nzero divisors: 2, 4, 6\ngenerators: none' },
    { in: { n: '31', show: 'all' }, error: true },
    { in: { n: '1', show: 'all' }, error: true }
]);
T.prop('zn-tables for every n', 1, function () {
    var nt = Calc.lib.nt, chain = Promise.resolve(true);
    function cyclic(n) {
        if (n === 2 || n === 4) return true;
        var m = n % 2 === 0 ? n / 2 : n;
        if (m % 2 === 0 || m === 1) return false;
        var f = nt.factor(BigInt(m)).factors;
        return f.length === 1;
    }
    for (var n = 2; n <= 30; n++) (function (n) {
        chain = chain.then(function (prev) {
            if (prev !== true) return prev;
            return T.run('zn-tables', { n: String(n), show: 'all' }).then(function (o) {
                var units = o.copy.split('\n')[0].replace('units: ', '').split(', ');
                if (BigInt(units.length) !== nt.phi(BigInt(n))) return 'phi(' + n + ')';
                if ((o.copy.indexOf('generators: none') < 0) !== cyclic(n)) return 'cyclic(' + n + ')';
                return checksOk(o.S);
            });
        });
    })(n);
    return chain;
});
