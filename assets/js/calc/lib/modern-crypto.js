/* Toolbox: helpers of the Modern cryptography tools (Calc.lib.modern). Pure functions and step writers (they only fill
   a recorder step, no page code), so the tests run them in node. lib/nt.js loads after this file, so Calc.lib.nt is
   only looked up inside the functions. Contents: random numbers (the browser's crypto, and a seeded generator for
   reproducible demos), UTF-8 and bytes as big integers, SHA-256, elliptic curve arithmetic over F_p, and the step
   writers shared by several tools (square and multiply, inverse by extended Euclid, order of g mod p, RSA keys). */
(function (G) {
    'use strict';
    var Calc = G.Calc, L = Calc.lib;
    var M = L.modern = {};
    /* Calc.tex with the thin spaces written as \mkern3mu: KaTeX counts every \, as three macro expansions and stops
       at 1000, so a formula with a few long numbers (2048-bit RSA) would not render; \mkern is not a macro */
    M.tex = function (n) { return Calc.tex(n).replace(/\\,/g, '\\mkern3mu '); };
    function T(n) { return M.tex(n); }
    /* a number in a product or sum: negative ones in parentheses */
    M.par = function (n) { return n < 0n ? '(' + T(n) + ')' : T(n); };

    /* ---------- reading optional fields ---------- */
    /* a text field holding a whole number expression: null when empty, else the BigInt (an error marks the field) */
    M.optInt = function (raw, field) {
        var s = raw == null ? '' : String(raw).trim();
        if (!s) return null;
        try { return Calc.int(s); } catch (e) { if (e instanceof Calc.UserError) Calc.fail(e.message, field); throw e; }
    };
    M.optList = function (raw, field) {
        var s = raw == null ? '' : String(raw).trim();
        if (!s) return null;
        try { return Calc.list(s.replace(/[()[\]{}]/g, ' ')); } catch (e) { if (e instanceof Calc.UserError) Calc.fail(e.message, field); throw e; }
    };

    /* ---------- randomness ---------- */
    function word() {
        var c = G.crypto;
        if (c && c.getRandomValues) { var a = new Uint32Array(1); c.getRandomValues(a); return a[0]; }
        return Math.floor(Math.random() * 4294967296);
    }
    /* a uniform BigInt in [lo, hi] (64 extra bits make the bias of the final reduction negligible) */
    M.rand = function (lo, hi) {
        lo = BigInt(lo); hi = BigInt(hi);
        var span = hi - lo + 1n, need = span.toString(2).length + 64, r = 0n;
        for (var i = 0; i < need; i += 32) r = (r << 32n) | BigInt(word());
        return lo + r % span;
    };
    /* a seeded generator (splitmix64), so that a link reproduces the same "random" choices */
    M.prng = function (seed) {
        var s = BigInt.asUintN(64, BigInt(seed));
        function next() {
            s = BigInt.asUintN(64, s + 0x9E3779B97F4A7C15n);
            var z = s;
            z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n);
            z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94D049BB133111EBn);
            return z ^ (z >> 31n);
        }
        return { int: function (lo, hi) { lo = BigInt(lo); hi = BigInt(hi); var r = (next() << 64n) | next(); return lo + r % (hi - lo + 1n); } };
    };

    /* ---------- bytes ---------- */
    M.utf8 = function (s) {
        var out = [];
        for (var i = 0; i < s.length; i++) {
            var c = s.codePointAt(i);
            if (c > 0xffff) i++;
            if (c < 0x80) out.push(c);
            else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | (c & 63));
            else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | (c >> 6 & 63), 0x80 | (c & 63));
            else out.push(0xf0 | c >> 18, 0x80 | (c >> 12 & 63), 0x80 | (c >> 6 & 63), 0x80 | (c & 63));
        }
        return out;
    };
    /* the text of UTF-8 bytes, or null when they are not valid UTF-8 */
    M.fromUtf8 = function (b) {
        try { return decodeURIComponent(b.map(function (x) { return '%' + (x < 16 ? '0' : '') + x.toString(16); }).join('')); } catch (e) { return null; }
    };
    M.hex = function (b) { return b.map(function (x) { return (x < 16 ? '0' : '') + x.toString(16).toUpperCase(); }).join(''); };
    /* bytes as one big-endian integer, and back (the shortest byte string) */
    M.bytesToInt = function (b) { var n = 0n; b.forEach(function (x) { n = (n << 8n) | BigInt(x); }); return n; };
    M.intToBytes = function (n, len) {
        var out = [];
        while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; }
        while (len && out.length < len) out.unshift(0);
        return out;
    };
    /* a step that turns text into a number: the UTF-8 bytes of every character, then the bytes as one number */
    M.textStep = function (s, text, name) {
        var rows = [], all = [];
        Array.from(text).forEach(function (ch) {
            var b = M.utf8(ch);
            all = all.concat(b);
            rows.push([ch === ' ' ? '(space)' : Calc.esc(ch), M.hex(b).replace(/(..)(?=.)/g, '$1 '), b.join(', ')]);
        });
        var n = M.bytesToInt(all);
        s.p('Every character becomes its UTF-8 bytes (one byte for plain ASCII letters):');
        s.table(['Character', 'Bytes (hex)', 'Bytes (decimal)'], rows, { mono: true });
        s.p('Read the ' + all.length + ' byte' + (all.length === 1 ? '' : 's') + ' as one number in base 256 (big-endian):');
        s.math(name + ' = \\texttt{0x' + M.hex(all) + '} = ' + T(n));
        return n;
    };

    /* ---------- SHA-256 (FIPS 180-4) on an array of bytes; the constants are computed exactly with integer roots ---------- */
    var KH = null;
    function consts() {
        var nt = L.nt, pr = [], k = [], h = [];
        for (var c = 2n; pr.length < 64; c++) if (nt.isPrime(c)) pr.push(c);
        pr.forEach(function (p, i) {
            k.push(Number(nt.iroot(p << 96n, 3n) & 0xffffffffn));
            if (i < 8) h.push(Number(nt.isqrt(p << 64n) & 0xffffffffn));
        });
        return { k: k, h: h };
    }
    M.sha256 = function (msg) {
        KH = KH || consts();
        var K = KH.k, H = KH.h.slice(), bytes = msg.slice(), l = msg.length;
        bytes.push(0x80);
        while (bytes.length % 64 !== 56) bytes.push(0);
        var hi = Math.floor(l / 0x20000000), lo = (l * 8) >>> 0;
        bytes.push(hi >>> 24 & 255, hi >>> 16 & 255, hi >>> 8 & 255, hi & 255, lo >>> 24 & 255, lo >>> 16 & 255, lo >>> 8 & 255, lo & 255);
        function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
        var W = new Array(64);
        for (var o = 0; o < bytes.length; o += 64) {
            for (var t = 0; t < 64; t++) {
                if (t < 16) W[t] = (bytes[o + 4 * t] << 24) | (bytes[o + 4 * t + 1] << 16) | (bytes[o + 4 * t + 2] << 8) | bytes[o + 4 * t + 3];
                else {
                    var x = W[t - 15], y = W[t - 2];
                    W[t] = (W[t - 16] + (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) + W[t - 7] + (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10))) | 0;
                }
            }
            var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
            for (t = 0; t < 64; t++) {
                var t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) | 0;
                var t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
                h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
        }
        var out = [];
        H.forEach(function (w) { out.push(w >>> 24 & 255, w >>> 16 & 255, w >>> 8 & 255, w & 255); });
        return out;
    };

    /* ---------- step writers ---------- */
    /* a^e mod n by square and multiply (left to right), as a table in step s; returns the value */
    M.powStep = function (s, a, e, n, opts) {
        var nt = L.nt, o = opts || {}, t = nt.powmodRows(a, e, n), b = nt.mod(a, n);
        var bits = t.bits.length <= 64 ? ' = ' + t.bits + '_2' : '';
        if (o.explain !== false) s.p('Square and multiply: go through the ' + t.bits.length + ' bit' + (t.bits.length === 1 ? '' : 's') + ' of the exponent $' + T(e) + bits + '$ from the left. For every bit, square the value; when the bit is 1, also multiply by $' + T(b) + '$. Everything is reduced modulo $' + T(n) + '$.');
        s.table(['Bit', 'Square', 'Multiply'], t.rows.map(function (r, i) {
            return [r.bit, '$' + T(r.before) + '^2 \\equiv ' + T(r.square) + '$', r.mul ? '$' + T(r.square) + ' \\cdot ' + T(b) + ' \\equiv ' + T(r.acc) + '$' : ''];
        }), { hl: t.rows.length - 1 });
        s.math((o.name || T(b) + '^{' + T(e) + '}') + ' \\equiv ' + T(t.value) + ' \\pmod{' + T(n) + '}');
        return t.value;
    };
    /* the inverse of a mod n by the extended Euclidean algorithm, as a table in step s; null when there is none */
    M.invStep = function (s, a, n, name) {
        var nt = L.nt, a0 = nt.mod(a, n), e = nt.egcdRows(n, a0), rows = e.rows, last = rows.length - 2;
        if (a0 === 0n) { s.p('$' + T(a) + ' \\equiv 0 \\pmod{' + T(n) + '}$ has no inverse.'); return null; }
        s.p('Extended Euclidean algorithm on $' + T(n) + '$ and $' + T(a0) + '$: every row keeps $r_i = s_i \\cdot ' + T(n) + ' + t_i \\cdot ' + T(a0) + '$, with $q_i = \\lfloor r_{i-1} / r_i \\rfloor$ and $x_{i+1} = x_{i-1} - q_i \\cdot x_i$ in every column.');
        s.table(['$i$', '$r_i$', '$q_i$', '$s_i$', '$t_i$'], rows.map(function (r, i) {
            var h = i === last;
            return [i, h ? { v: '$' + T(r.r) + '$', hl: true } : '$' + T(r.r) + '$', r.q === null ? '' : '$' + T(r.q) + '$', '$' + T(r.s) + '$', h ? { v: '$' + T(r.t) + '$', hl: true } : '$' + T(r.t) + '$'];
        }), { mono: true });
        if (rows[last].r !== 1n) { s.p('The gcd is $' + T(rows[last].r) + ' \\ne 1$, so there is no inverse.'); return null; }
        var inv = nt.mod(rows[last].t, n);
        s.p('The last non-zero remainder is 1, so $' + M.par(rows[last].t) + ' \\cdot ' + T(a0) + ' \\equiv 1$' + (rows[last].t < 0n ? ' and, made positive,' : ',') + ' $' + (name || T(a0) + '^{-1}') + ' \\equiv ' + T(inv) + ' \\pmod{' + T(n) + '}$.');
        s.check(nt.mod(a0 * inv, n) === 1n, '$' + T(a0) + ' \\cdot ' + T(inv) + ' = ' + T(a0 * inv) + ' \\equiv 1 \\pmod{' + T(n) + '}$');
        return inv;
    };
    /* "p = 62 is not prime (62 = 2 * 31)" */
    M.notPrime = function (n, name) {
        var nt = L.nt;
        if (n < 2n) return name + ' = ' + n + ' is not a prime (primes are at least 2).';
        if (n < 10n ** 24n) {
            var f = nt.factor(n).factors;
            return name + ' = ' + n + ' is not a prime: ' + n + ' = ' + f.map(function (x) { return x.p + (x.e > 1 ? '^' + x.e : ''); }).join(' * ') + '.';
        }
        return name + ' = ' + n + ' is not a prime (it fails the Miller-Rabin test).';
    };
    M.needPrime = function (n, name, field) { if (!L.nt.isPrime(n)) Calc.fail(M.notPrime(n, name), field); };

    /* the order of g in the multiplicative group mod a prime p: {order, primes, complete}. p - 1 is factored fully
       below 2^64; above, only small factors are split off and the rest must be prime (true for safe primes). */
    M.factorPm1 = function (p) {
        var nt = L.nt, n = p - 1n;
        if (p < 2n ** 64n) return nt.factor(n);
        var out = {}, m = n, complete = true, stack = [];
        function add(q, comp) { var k = String(q); if (!out[k]) out[k] = { p: q, e: 0, composite: !!comp }; out[k].e++; }
        for (var r = 2n; r < 20000n && r * r <= m; r += r === 2n ? 1n : 2n) while (m % r === 0n) { m /= r; add(r); }
        if (m > 1n) stack.push(m);
        while (stack.length) {
            var x = stack.pop();
            if (nt.isPrime(x)) { add(x); continue; }
            var d = nt.rho(x, 30000);   // bounded effort: factors up to about 2^30 are found quickly
            if (!d) { add(x, true); complete = false; continue; }
            stack.push(d, x / d);
        }
        var list = Object.keys(out).map(function (k) { return out[k]; });
        list.sort(function (a, b) { return a.p < b.p ? -1 : a.p > b.p ? 1 : 0; });
        return { factors: list, complete: complete };
    };
    M.orderModP = function (g, p, fac) {
        var nt = L.nt, o = p - 1n;
        fac = fac || M.factorPm1(p);
        if (!fac.complete) return { order: null, fac: fac };
        fac.factors.forEach(function (f) { while (o % f.p === 0n && nt.powmod(g, o / f.p, p) === 1n) o /= f.p; });
        return { order: o, fac: fac };
    };
    /* a step about g in Z_p^*: the factors of p - 1, the test g^((p-1)/r) != 1, the order; returns {order, safe, q} */
    M.groupStep = function (s, g, p, gname) {
        var nt = L.nt, gn = gname || 'g', fac = M.factorPm1(p), q = (p - 1n) / 2n, safe = p > 5n && nt.isPrime(q);
        var ftex = fac.factors.map(function (f) { return T(f.p) + (f.e > 1 ? '^{' + f.e + '}' : ''); }).join(' \\cdot ');
        s.p('The group $\\mathbb{Z}_{' + T(p) + '}^*$ has $p - 1 = ' + T(p - 1n) + (fac.factors.length > 1 || (fac.factors[0] && fac.factors[0].e > 1) ? ' = ' + ftex : '') + '$ elements. The order of $' + gn + '$ divides $p - 1$; it is $p - 1$ exactly when $' + gn + '^{(p-1)/r} \\not\\equiv 1$ for every prime $r$ dividing $p - 1$.');
        if (!fac.complete) {
            s.p('$p - 1$ has a large factor that could not be split here, so the order of $' + gn + '$ is not computed.');
            return { order: null, safe: safe, q: q, fac: fac };
        }
        var rows = fac.factors.map(function (f) {
            var v = nt.powmod(g, (p - 1n) / f.p, p);
            return ['$' + T(f.p) + '$', '$' + gn + '^{' + T((p - 1n) / f.p) + '} \\equiv ' + T(v) + '$', v === 1n ? { v: 'yes', hl: true } : 'no'];
        });
        s.table(['Prime $r$', '$' + gn + '^{(p-1)/r} \\bmod p$', 'Equal to 1?'], rows);
        var o = M.orderModP(g, p, fac).order;
        s.p(o === p - 1n ? 'None is 1, so $' + gn + '$ is a generator: its order is $p - 1 = ' + T(o) + '$.' : 'So $' + gn + '$ is not a generator. Its order (the size of the subgroup it generates) is $' + T(o) + '$.');
        return { order: o, safe: safe, q: q, fac: fac };
    };

    /* RSA key generation from p, q, e as steps; returns {N, phi, d} */
    M.rsaKeySteps = function (S, p, q, e) {
        var nt = L.nt;
        if (p === q) Calc.fail('p and q must be two different primes (with p = q, N = p^2 is easy to factor and the formula for phi(N) changes).', 'q');
        var s1 = S.step('Check that $p$ and $q$ are prime');
        s1.check(nt.isPrime(p), '$p = ' + T(p) + '$ is prime').check(nt.isPrime(q), '$q = ' + T(q) + '$ is prime');
        M.needPrime(p, 'p', 'p');
        M.needPrime(q, 'q', 'q');
        var N = p * q, phi = (p - 1n) * (q - 1n);
        if (nt.bitLength(N) > 2048) Calc.fail('N = p * q has ' + nt.bitLength(N) + ' bits; this walkthrough goes up to 2048 bits.', 'p');
        if (N < 6n) Calc.fail('N is too small; take larger primes.', 'p');
        S.step('Modulus $N$ and Euler\'s totient $\\varphi(N)$').lines([
            'N &= p \\cdot q = ' + T(p) + ' \\cdot ' + T(q) + ' = ' + T(N),
            '\\varphi(N) &= (p - 1)(q - 1) = ' + T(p - 1n) + ' \\cdot ' + T(q - 1n) + ' = ' + T(phi)
        ]).p('$N$ has ' + nt.bitLength(N) + ' bits. $\\varphi(N)$ counts the numbers below $N$ coprime to $N$, and $m^{\\varphi(N)} \\equiv 1 \\pmod N$ for each of them (Euler).');
        if (e <= 1n || e >= phi) Calc.fail('The public exponent must satisfy 1 < e < phi(N) = ' + phi + '.', 'e');
        var g = nt.gcd(e, phi);
        if (g !== 1n) {
            var sug = 3n;
            while (nt.gcd(sug, phi) !== 1n) sug += 2n;
            Calc.fail('gcd(e, phi(N)) = gcd(' + e + ', ' + phi + ') = ' + g + ', not 1, so e has no inverse modulo phi(N). The smallest valid e here is ' + sug + '.', 'e');
        }
        var s3 = S.step('Check that $\\gcd(e, \\varphi(N)) = 1$');
        var er = nt.euclidRows(phi, e);
        s3.table(['$a$', '$=$', '$q$', '$\\cdot\\, b$', '$+\\ r$'], er.map(function (r) { return ['$' + T(r.a) + '$', '$=$', '$' + T(r.q) + '$', '$\\cdot\\ ' + T(r.b) + '$', '$+\\ ' + T(r.r) + '$']; }), { hl: er.length - 1 });
        s3.check(true, '$\\gcd(' + T(e) + ', ' + T(phi) + ') = 1$, so $e$ is invertible modulo $\\varphi(N)$');
        var d = M.invStep(S.step('Private exponent $d \\equiv e^{-1} \\pmod{\\varphi(N)}$'), e, phi, 'd');
        S.step('The keys').list([
            'Public key: $(N, e) = (' + T(N) + ', ' + T(e) + ')$',
            'Private key: $d = ' + T(d) + '$ (and $p$, $q$, $\\varphi(N)$ stay secret too: any of them reveals $d$)'
        ]);
        return { N: N, phi: phi, d: d };
    };

    /* ---------- elliptic curves y^2 = x^3 + ax + b over F_p (p > 3 prime); points {x, y} or null for O ---------- */
    var ec = M.ec = {};
    ec.mod = function (x, p) { return L.nt.mod(x, p); };
    ec.f = function (E, x) { var p = E.p; return ec.mod(x * x % p * x + E.a * x + E.b, p); };
    ec.disc = function (E) { return ec.mod(4n * E.a ** 3n + 27n * E.b * E.b, E.p); };
    ec.on = function (E, P) { return P === null || ec.mod(P.y * P.y, E.p) === ec.f(E, P.x); };
    ec.eq = function (P, Q) { return P === null || Q === null ? P === Q : P.x === Q.x && P.y === Q.y; };
    ec.neg = function (E, P) { return P === null ? null : { x: P.x, y: ec.mod(-P.y, E.p) }; };
    /* the curve's equation in TeX, without zero terms */
    ec.eqTex = function (E) { return 'y^2 = x^3' + (E.a === 0n ? '' : ' + ' + (E.a === 1n ? '' : T(E.a)) + 'x') + (E.b === 0n ? '' : ' + ' + T(E.b)); };
    ec.tex = function (P) { return P === null ? '\\mathcal{O}' : '(' + T(P.x) + ', ' + T(P.y) + ')'; };
    ec.plain = function (P) { return P === null ? 'O' : '(' + P.x + ', ' + P.y + ')'; };
    /* P + Q with the case that applies: {R, kind: 'O-left' | 'O-right' | 'opposite' | 'double' | 'add', lam, num, den} */
    ec.add = function (E, P, Q) {
        var p = E.p, nt = L.nt;
        if (P === null) return { R: Q, kind: 'O-left' };
        if (Q === null) return { R: P, kind: 'O-right' };
        var num, den, kind;
        if (P.x === Q.x) {
            if (ec.mod(P.y + Q.y, p) === 0n) return { R: null, kind: 'opposite' };
            num = ec.mod(3n * P.x * P.x + E.a, p); den = ec.mod(2n * P.y, p); kind = 'double';
        } else { num = ec.mod(Q.y - P.y, p); den = ec.mod(Q.x - P.x, p); kind = 'add'; }
        var inv = nt.inv(den, p), lam = num * inv % p;
        var x = ec.mod(lam * lam - P.x - Q.x, p), y = ec.mod(lam * (P.x - x) - P.y, p);
        return { R: { x: x, y: y }, kind: kind, lam: lam, num: num, den: den, inv: inv };
    };
    /* k * P by double and add (left to right); rows {bit, op: 'double' | 'add', R, lam, kind} */
    ec.mul = function (E, k, P, wantRows) {
        if (k < 0n) { k = -k; P = ec.neg(E, P); }
        var R = null, rows = [], bits = k.toString(2);
        if (k === 0n || P === null) return { R: null, rows: rows, bits: bits };
        for (var i = 0; i < bits.length; i++) {
            if (R !== null) { var d = ec.add(E, R, R); if (wantRows) rows.push({ bit: bits.charAt(i), op: 'double', from: R, R: d.R, lam: d.lam, kind: d.kind }); R = d.R; }
            if (bits.charAt(i) === '1') { var a = ec.add(E, R, P); if (wantRows) rows.push({ bit: bits.charAt(i), op: R === null ? 'start' : 'add', from: R, R: a.R, lam: a.lam, kind: a.kind }); R = a.R; }
        }
        return { R: R, rows: rows, bits: bits };
    };
    /* a point from text: "(5, 1)", "5, 1", "5 1", or O / inf / infinity for the point at infinity */
    ec.parse = function (raw, field, name) {
        var s = String(raw == null ? '' : raw).trim();
        if (/^(o|inf|infinity|∞|0)$/i.test(s)) return null;
        var l;
        try { l = Calc.list(s.replace(/[()[\]]/g, ' ')); } catch (e) { if (e instanceof Calc.UserError) Calc.fail(name + ': ' + e.message, field); throw e; }
        if (l.length !== 2) Calc.fail(name + ' must be two numbers x, y like (5, 1), or O for the point at infinity.', field);
        return { x: l[0], y: l[1] };
    };
    /* check the curve: p prime above 3, discriminant not 0. Steps into s; fails on a bad curve */
    ec.curveStep = function (s, E) {
        var nt = L.nt, p = E.p;
        if (p <= 3n) Calc.fail('Take a prime p > 3 (the short form y^2 = x^3 + ax + b does not cover characteristic 2 and 3).', 'p');
        M.needPrime(p, 'p', 'p');
        if (nt.bitLength(p) > 521) Calc.fail('p has more than 521 bits; this walkthrough stops there (the size of the curve P-521).', 'p');
        var a = ec.mod(E.a, p), b = ec.mod(E.b, p), d = ec.disc(E);
        s.check(true, '$p = ' + T(p) + '$ is a prime larger than 3');
        s.p('The curve is non-singular (no cusps or self-crossings) exactly when the cubic $x^3 + ax + b$ has no repeated root, that is when $4a^3 + 27b^2 \\not\\equiv 0 \\pmod p$:');
        s.math('4 \\cdot ' + T(a) + '^3 + 27 \\cdot ' + T(b) + '^2 \\equiv ' + T(d) + ' \\pmod{' + T(p) + '}');
        s.check(d !== 0n, d !== 0n ? 'Not 0: the curve is an elliptic curve' : 'It is 0: the curve is singular, not an elliptic curve');
        if (d === 0n) Calc.fail('4a^3 + 27b^2 = 0 (mod p): this curve is singular (the cubic has a repeated root), so its points do not form the usual group. Change a or b.', 'b');
        E.a = a; E.b = b;
    };
    /* the check that a point lies on the curve, as a step block; fails when it does not */
    ec.onStep = function (s, E, P, name, field) {
        if (P === null) { s.p('$' + name + ' = \\mathcal{O}$, the point at infinity, belongs to every curve.'); return; }
        var p = E.p;
        P.x = ec.mod(P.x, p); P.y = ec.mod(P.y, p);
        var l = P.y * P.y % p, r = ec.f(E, P.x);
        s.math('y^2 = ' + T(P.y) + '^2 \\equiv ' + T(l) + ', \\quad x^3 + ax + b = ' + T(P.x) + '^3 + ' + T(E.a) + ' \\cdot ' + T(P.x) + ' + ' + T(E.b) + ' \\equiv ' + T(r) + ' \\pmod{' + T(p) + '}');
        s.check(l === r, '$' + name + ' = ' + ec.tex(P) + '$ ' + (l === r ? 'is' : 'is not') + ' on the curve');
        if (l !== r) Calc.fail(name + ' = ' + ec.plain(P) + ' is not on the curve: y^2 = ' + l + ' but x^3 + ax + b = ' + r + ' (mod ' + p + ').', field);
    };
    /* k * P as a table of doublings and additions in step s; returns k * P */
    ec.mulStep = function (s, E, k, P, kname, pname) {
        var r = ec.mul(E, k, P, true), kk = k < 0n ? -k : k;
        if (k < 0n) { s.p('$' + kname + '$ is negative: $' + T(k) + ' \\cdot ' + pname + ' = ' + T(kk) + ' \\cdot (-' + pname + ')$ with $-' + pname + ' = ' + ec.tex(ec.neg(E, P)) + '$.'); pname = '(-' + pname + ')'; }
        if (kk === 0n || P === null) { s.p('$' + T(k) + ' \\cdot ' + (P === null ? '\\mathcal{O}' : pname) + ' = \\mathcal{O}$.'); return null; }
        s.p('Double and add over the bits of $' + (k < 0n ? '|' + kname + '|' : kname) + ' = ' + T(kk) + (r.bits.length <= 64 ? ' = ' + r.bits + '_2' : '') + '$ from the left: double the running point for every bit after the first, and add $' + pname + '$ when the bit is 1. The slope $\\lambda$ of each operation is shown.');
        var acc = 0n;
        s.table(['Bit', 'Operation', '$\\lambda$', 'Result'], r.rows.map(function (x) {
            var before = acc;
            acc = x.op === 'double' ? 2n * acc : acc + 1n;
            var opTex = x.op === 'start' ? 'start with $' + pname + '$' : x.op === 'double' ? 'double: $2 \\cdot ' + T(before) + pname + '$' : 'add: $' + T(before) + pname + ' + ' + pname + '$';
            return [x.op === 'add' ? '' : x.bit, opTex, x.lam != null ? '$' + T(x.lam) + '$' : (x.kind === 'opposite' ? 'vertical' : ''), '$' + T(acc) + pname + ' = ' + ec.tex(x.R) + '$'];
        }), { hl: r.rows.length - 1 });
        return r.R;
    };
    /* the number of points of E (p up to 10^6), with a square table of numbers below p */
    ec.count = function (E) {
        var p = Number(E.p), a = Number(E.a), b = Number(E.b), sq = new Uint8Array(p), n = 1;
        for (var y = 0; y < p; y++) sq[y * y % p] = y === 0 ? 1 : 2;
        for (var x = 0; x < p; x++) { var f = ((x * x % p) * x + a * x + b) % p; if (sq[f]) n += sq[f]; }
        return BigInt(n);
    };
    /* the order of P when the group order N (with its factorization fac) is known */
    ec.order = function (E, P, N, fac) {
        if (P === null) return 1n;
        var o = N;
        fac.factors.forEach(function (f) { while (o % f.p === 0n && ec.mul(E, o / f.p, P).R === null) o /= f.p; });
        return o;
    };
})(typeof window !== 'undefined' ? window : globalThis);
