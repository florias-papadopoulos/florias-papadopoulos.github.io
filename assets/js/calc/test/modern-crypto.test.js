/* Tests for the Modern cryptography tools and lib/modern-crypto.js (see run.js for the API). */
(function () {
    var nt = Calc.lib.nt, M = Calc.lib.modern, ec = M.ec;
    /* every check mark a run produced must be a tick */
    function checksOk(S) {
        for (var i = 0; i < S.steps.length; i++) {
            var b = S.steps[i].blocks;
            for (var j = 0; j < b.length; j++) if (b[j].t === 'check' && !b[j].ok) return 'failed check in step ' + (i + 1) + ': ' + b[j].v;
        }
        return true;
    }
    function okAnd(f) { return function (S, copy) { var c = checksOk(S); return c !== true ? c : f ? f(S, copy) : true; }; }
    function prime(r, lo, hi) { return nt.nextPrime(r.int(lo, hi)); }
    function noteHas(s) { return function (S) { return S.notes.join(' ').indexOf(s) >= 0 ? true : 'note without ' + s + ': ' + S.notes.join(' | '); }; }

    /* ---------- the library ---------- */
    T.eq('modern sha256 abc', M.hex(M.sha256(M.utf8('abc'))), 'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD');
    T.eq('modern sha256 empty', M.hex(M.sha256([])), 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855');
    T.eq('modern sha256 two blocks', M.hex(M.sha256(M.utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))), '248D6A61D20638B8E5C026930C3E6039A33CE45964FF2167F6ECEDD419DB06C1');
    T.eq('modern utf8', M.hex(M.utf8('é€😀')), 'C3A9E282ACF09F9880');
    T.prop('modern utf8 and bytes round trip', 200, function (r) {
        var ch = Array.from('abcXYZ 019éüß€😀!?'), s = '';
        for (var i = r.num(1, 20); i > 0; i--) s += r.pick(ch);
        var n = M.bytesToInt(M.utf8(s)), back = M.fromUtf8(M.intToBytes(n));
        return back === s ? true : JSON.stringify(s) + ' came back as ' + JSON.stringify(back);
    });
    T.prop('modern prng is deterministic', 1, function () {
        var a = M.prng(42), b = M.prng(42), c = M.prng(43), x = [], y = [], z = [];
        for (var i = 0; i < 20; i++) { x.push(a.int(0, 1000)); y.push(b.int(0, 1000)); z.push(c.int(0, 1000)); }
        return x.join() === y.join() && x.join() !== z.join() && x.every(function (v) { return v >= 0n && v <= 1000n; }) ? true : 'prng';
    });
    T.prop('modern rand range', 300, function (r) {
        var lo = r.int(-1000, 1000), hi = lo + r.int(0, 10n ** 30n), x = M.rand(lo, hi);
        return x >= lo && x <= hi ? true : 'out of range';
    });

    /* ---------- RSA ---------- */
    var rsa = { p: '61', q: '53', e: '17', fmt: 'num' };
    function w(base, extra) { var o = {}; Object.keys(base).forEach(function (k) { o[k] = base[k]; }); Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return o; }
    T.tool('rsa', [
        { in: w(rsa, { m: '65', c: '' }), copy: '2790', check: okAnd(noteHas('d = 2753')) },
        { in: w(rsa, { m: '', c: '2790' }), action: 'dec', copy: '65', check: okAnd() },
        { in: w(rsa, { m: '0', c: '' }), copy: '0' },
        { in: w(rsa, { m: '1', c: '' }), copy: '1' },
        { in: w(rsa, { m: '3232', c: '' }), copy: '3232', check: okAnd() },
        { in: { p: '2^61 - 1', q: '2^89 - 1', e: '65537', fmt: 'text', text: 'Hi', c: '' }, check: okAnd(function (S, copy) { return /^\d+$/.test(copy) ? true : copy; }) },
        { in: w(rsa, { m: '3233', c: '' }), error: true },
        { in: w(rsa, { m: '-5', c: '' }), error: true },
        { in: w(rsa, { m: '', c: '' }), error: true },
        { in: w(rsa, { m: '5', c: '' }), action: 'dec', error: true },
        { in: w(rsa, { m: '', c: '4000' }), action: 'dec', error: true },
        { in: { p: '62', q: '53', e: '17', fmt: 'num', m: '5', c: '' }, error: true },
        { in: { p: '61', q: '61', e: '17', fmt: 'num', m: '5', c: '' }, error: true },
        { in: { p: '61', q: '53', e: '3', fmt: 'num', m: '5', c: '' }, error: true },
        { in: { p: '61', q: '53', e: '1', fmt: 'num', m: '5', c: '' }, error: true },
        { in: { p: '61', q: '53', e: '17', fmt: 'text', text: 'Hello', c: '' }, error: true }
    ]);
    T.prop('rsa text round trip', 10, function (r) {
        var text = r.text(r.num(1, 12)), base = { p: '2^127 - 1', q: '2^89 - 1', e: '65537', fmt: 'text' };
        return T.run('rsa', w(base, { text: text, c: '' }), 'enc').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            return T.run('rsa', w(base, { text: '', c: o.copy }), 'dec').then(function (d) { return d.copy === text ? true : 'got ' + d.copy + ' for ' + text; });
        });
    });
    T.prop('rsa random round trip', 30, function (r) {
        var p = prime(r, 1000, 10n ** 12n), q = prime(r, 1000, 10n ** 12n);
        if (p === q) return true;
        var phi = (p - 1n) * (q - 1n), e = r.pick([3n, 17n, 65537n]);
        if (nt.gcd(e, phi) !== 1n) return true;
        var m = r.int(0, p * q - 1n);
        return T.run('rsa', { p: String(p), q: String(q), e: String(e), fmt: 'num', m: String(m), c: '' }, 'enc').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            var c = checksOk(o.S);
            if (c !== true) return c;
            if (BigInt(o.copy) !== nt.powmod(m, e, p * q)) return 'wrong ciphertext';
            return T.run('rsa', { p: String(p), q: String(q), e: String(e), fmt: 'num', m: '', c: o.copy }, 'dec').then(function (d) {
                return d.copy === String(m) && checksOk(d.S) === true ? true : 'decrypted to ' + d.copy + ', not ' + m;
            });
        });
    });

    /* ---------- RSA signatures ---------- */
    T.tool('rsa-signature', [
        { in: w(rsa, { m: '65', hash: 'none', sig: '' }), copy: '588', check: okAnd() },
        { in: w(rsa, { m: '65', hash: 'none', sig: '588' }), action: 'verify', copy: 'valid' },
        { in: w(rsa, { m: '65', hash: 'none', sig: '589' }), action: 'verify', copy: 'invalid' },
        { in: w(rsa, { m: '66', hash: 'none', sig: '588' }), action: 'verify', copy: 'invalid' },
        { in: w(rsa, { m: '65', hash: 'none', sig: '' }), action: 'verify', error: true },
        { in: w(rsa, { m: '4000', hash: 'none', sig: '' }), error: true },
        { in: w(rsa, { fmt: 'text', text: 'Hello', hash: 'sha', sig: '' }), check: okAnd() }
    ]);
    T.prop('rsa-signature sign, verify, tamper', 40, function (r) {
        var p = prime(r, 10n ** 6n, 10n ** 15n), q = prime(r, 10n ** 6n, 10n ** 15n);
        if (p === q || nt.gcd(65537n, (p - 1n) * (q - 1n)) !== 1n) return true;
        var text = r.text(r.num(1, 30)), base = { p: String(p), q: String(q), e: '65537', fmt: 'text', text: text, hash: 'sha' };
        return T.run('rsa-signature', w(base, { sig: '' }), 'sign').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            return Promise.all([
                T.run('rsa-signature', w(base, { sig: o.copy }), 'verify'),
                T.run('rsa-signature', w(base, { sig: o.copy, text: text + 'x' }), 'verify'),
                T.run('rsa-signature', w(base, { sig: String((BigInt(o.copy) + 1n) % (p * q)) }), 'verify')
            ]).then(function (v) { return v[0].copy === 'valid' && v[1].copy === 'invalid' && v[2].copy === 'invalid' ? true : v.map(function (x) { return x.copy; }).join(); });
        });
    });

    /* ---------- Diffie-Hellman ---------- */
    T.tool('diffie-hellman', [
        { in: { p: '23', g: '5', a: '6', b: '15' }, copy: '2', check: okAnd(noteHas('A = 8')) },
        { in: { p: '23', g: '5', a: '4', b: '3' }, copy: '18' },
        { in: { p: '1019', g: '4', a: '', b: '' }, check: okAnd() },
        { in: { p: '41', g: '10', a: '7', b: '11' }, check: function (S) { return JSON.stringify(S.steps[0].blocks).indexOf('not a generator') >= 0 ? true : 'no warning'; } },
        { in: { p: '22', g: '5', a: '6', b: '15' }, error: true },
        { in: { p: '23', g: '1', a: '6', b: '15' }, error: true },
        { in: { p: '23', g: '22', a: '6', b: '15' }, error: true },
        { in: { p: '23', g: '5', a: '0', b: '15' }, error: true },
        { in: { p: '23', g: '5', a: '22', b: '15' }, error: true }
    ]);
    T.prop('diffie-hellman both sides agree', 40, function (r) {
        var p = prime(r, 5, r.pick([10n ** 6n, 10n ** 20n, 2n ** 100n])), g = r.int(2, p - 2n), a = r.int(1, p - 2n), b = r.int(1, p - 2n);
        if (g >= p - 1n) return true;
        return T.run('diffie-hellman', { p: String(p), g: String(g), a: String(a), b: String(b) }).then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            var c = checksOk(o.S.steps.length ? { steps: o.S.steps.slice(1) } : o.S);   // step 1 may hold the safe prime cross
            return c !== true ? c : o.copy === String(nt.powmod(g, a * b, p)) ? true : 'wrong key';
        });
    });

    /* ---------- ElGamal ---------- */
    var eg = { p: '23', g: '5', x: '6' };
    T.tool('elgamal', [
        { in: w(eg, { m: '10', k: '3', ct: '' }), copy: '10, 14', check: okAnd() },
        { in: w(eg, { m: '', k: '', ct: '10, 14' }), action: 'dec', copy: '10' },
        { in: w(eg, { m: '10', k: '', ct: '' }), check: okAnd() },
        { in: w(eg, { m: '0', k: '3', ct: '' }), error: true },
        { in: w(eg, { m: '23', k: '3', ct: '' }), error: true },
        { in: w(eg, { m: '5', k: '0', ct: '' }), error: true },
        { in: w(eg, { m: '', k: '', ct: '10' }), action: 'dec', error: true },
        { in: { p: '23', g: '5', x: '0', m: '5', k: '3', ct: '' }, error: true }
    ]);
    T.prop('elgamal round trip', 40, function (r) {
        var p = prime(r, 5, r.pick([10n ** 6n, 2n ** 100n])), g = r.int(2, p - 2n), x = r.int(1, p - 2n), m = r.int(1, p - 1n);
        if (g >= p - 1n) return true;
        var base = { p: String(p), g: String(g), x: String(x) };
        return T.run('elgamal', w(base, { m: String(m), k: '', ct: '' }), 'enc').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            if (checksOk(o.S) !== true) return checksOk(o.S);
            return T.run('elgamal', w(base, { m: '', k: '', ct: o.copy }), 'dec').then(function (d) { return d.copy === String(m) ? true : 'decrypted to ' + d.copy; });
        });
    });

    /* ---------- Schnorr ---------- */
    var sch = { p: '607', q: '101', g: '64', x: '37', text: 'Hello' };
    T.tool('schnorr-signature', [
        { in: w(sch, { hash: 'toy', k: '25', sig: '' }), copy: '89, 65', check: okAnd() },
        { in: w(sch, { hash: 'toy', k: '', sig: '89, 65' }), action: 'verify', copy: 'valid' },
        { in: w(sch, { hash: 'toy', k: '', sig: '89, 66' }), action: 'verify', copy: 'invalid' },
        { in: w(sch, { text: 'Hellp', hash: 'toy', k: '', sig: '89, 65' }), action: 'verify', copy: 'invalid' },
        { in: w(sch, { hash: 'sha', k: '25', sig: '' }), check: okAnd() },
        { in: w(sch, { g: '2', hash: 'toy', k: '25', sig: '' }), error: true },
        { in: w(sch, { g: '1', hash: 'toy', k: '25', sig: '' }), error: true },
        { in: w(sch, { q: '103', hash: 'toy', k: '25', sig: '' }), error: true },
        { in: w(sch, { x: '101', hash: 'toy', k: '25', sig: '' }), error: true },
        { in: w(sch, { hash: 'toy', k: '101', sig: '' }), error: true },
        { in: w(sch, { hash: 'toy', k: '', sig: '89' }), action: 'verify', error: true }
    ]);
    T.prop('schnorr sign, verify, tamper', 40, function (r) {
        /* a random group: q prime, p = kq + 1 prime, g = h^k */
        var q = prime(r, 100, 10n ** 9n), k = 2n, p;
        while (!nt.isPrime(p = k * q + 1n)) k += 2n;
        var g = 1n, h = 2n;
        while (g === 1n) { g = nt.powmod(h, k, p); h++; }
        var text = r.text(r.num(1, 25)), hash = r.pick(['sha', 'toy']), base = { p: String(p), q: String(q), g: String(g), x: String(r.int(1, q - 1n)), text: text, hash: hash };
        return T.run('schnorr-signature', w(base, { k: '', sig: '' }), 'sign').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            if (checksOk(o.S) !== true) return checksOk(o.S);
            var es = o.copy.split(', ').map(BigInt);
            return Promise.all([
                T.run('schnorr-signature', w(base, { k: '', sig: o.copy }), 'verify'),
                T.run('schnorr-signature', w(base, { k: '', sig: es[0] + ', ' + (es[1] + 1n) % q }), 'verify'),
                T.run('schnorr-signature', w(base, { text: text + '!', k: '', sig: o.copy }), 'verify')
            ]).then(function (v) { return v[0].copy === 'valid' && v[1].copy === 'invalid' && (v[2].copy === 'invalid' || hash === 'toy') ? true : v.map(function (x) { return x.copy; }).join(); });
        });
    });

    /* ---------- elliptic curves ---------- */
    var E17 = { a: '2', b: '2', p: '17' };
    var secG = '(0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798, 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)';
    T.tool('elliptic-curve', [
        { in: w(E17, { P: '(5, 1)', Q: '(6, 3)', k: '' }), action: 'add', copy: '(10, 6)', check: okAnd() },
        { in: w(E17, { P: '(5, 1)', Q: '', k: '' }), action: 'dbl', copy: '(6, 3)', check: okAnd() },
        { in: w(E17, { P: '(5, 1)', Q: '(5, 1)', k: '' }), action: 'add', copy: '(6, 3)' },
        { in: w(E17, { P: '(5, 1)', Q: '', k: '9' }), action: 'mul', copy: '(7, 6)', check: okAnd() },
        { in: w(E17, { P: '(5, 1)', Q: '', k: '19' }), action: 'mul', copy: 'O' },
        { in: w(E17, { P: '(5, 1)', Q: '', k: '18' }), action: 'mul', copy: '(5, 16)' },
        { in: w(E17, { P: '(5, 1)', Q: '', k: '-1' }), action: 'mul', copy: '(5, 16)' },
        { in: w(E17, { P: '(5, 1)', Q: '', k: '0' }), action: 'mul', copy: 'O' },
        { in: w(E17, { P: '(5, 1)', Q: '(5, 16)', k: '' }), action: 'add', copy: 'O' },
        { in: w(E17, { P: 'O', Q: '(5, 16)', k: '' }), action: 'add', copy: '(5, 16)' },
        { in: w(E17, { P: '(5, 1)', Q: 'O', k: '' }), action: 'add', copy: '(5, 1)' },
        { in: w(E17, { P: 'inf', Q: '', k: '' }), action: 'dbl', copy: 'O' },
        { in: w(E17, { P: '(5, -16)', Q: '(23, 3)', k: '' }), action: 'add', copy: '(10, 6)' },
        { in: { a: '0', b: '7', p: '2^256 - 2^32 - 977', P: secG, Q: '', k: '' }, action: 'dbl', copy: '(89565891926547004231252920425935692360644145829622209833684329913297188986597, 12158399299693830322967808612713398636155367887041628176798871954788371653930)' },
        { in: { a: '0', b: '7', p: '2^256 - 2^32 - 977', P: secG, Q: '', k: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141' }, action: 'mul', copy: 'O' },
        { in: { a: '-1', b: '0', p: '23', P: '(0, 0)', Q: '', k: '' }, action: 'dbl', copy: 'O' },
        { in: { a: '0', b: '0', p: '17', P: '(1, 1)', Q: '', k: '' }, action: 'dbl', error: true },
        { in: { a: '-3', b: '2', p: '17', P: '(1, 0)', Q: '', k: '' }, action: 'dbl', error: true },
        { in: w(E17, { P: '(5, 2)', Q: '', k: '' }), action: 'dbl', error: true },
        { in: w(E17, { P: '(5, 1)', Q: '', k: '' }), action: 'add', error: true },
        { in: w(E17, { P: '(5, 1)', Q: '', k: '' }), action: 'mul', error: true },
        { in: w(E17, { P: '5', Q: '', k: '' }), action: 'dbl', error: true },
        { in: { a: '2', b: '2', p: '3', P: '(1, 1)', Q: '', k: '' }, action: 'dbl', error: true },
        { in: { a: '2', b: '2', p: '21', P: '(1, 1)', Q: '', k: '' }, action: 'dbl', error: true }
    ]);
    /* a random curve over a random prime, and random points on it */
    function randCurve(r, hi) {
        for (;;) {
            var p = prime(r, 5, hi), E = { a: r.int(0, p - 1n), b: r.int(0, p - 1n), p: p };
            if (ec.disc(E) !== 0n) return E;
        }
    }
    function randPoint(r, E) {
        for (;;) {
            var x = r.int(0, E.p - 1n), y = nt.sqrtModPrime(ec.f(E, x), E.p);
            if (y !== null) return { x: x, y: r.num(0, 1) ? y : nt.mod(-y, E.p) };
        }
    }
    T.prop('ec group law: associative, commutative, inverse', 300, function (r) {
        var E = randCurve(r, r.pick([100n, 10n ** 6n, 2n ** 127n])), P = randPoint(r, E), Q = randPoint(r, E), R = randPoint(r, E);
        function add(A, B) { return ec.add(E, A, B).R; }
        if (!ec.eq(add(add(P, Q), R), add(P, add(Q, R)))) return 'not associative';
        if (!ec.eq(add(P, Q), add(Q, P))) return 'not commutative';
        if (add(P, ec.neg(E, P)) !== null) return 'P + (-P) is not O';
        if (!ec.on(E, add(P, Q)) || !ec.on(E, add(P, P))) return 'result not on the curve';
        var k = r.int(0, 10n ** 6n), l = r.int(0, 10n ** 6n);
        return ec.eq(ec.mul(E, k + l, P).R, add(ec.mul(E, k, P).R, ec.mul(E, l, P).R)) ? true : '(k + l)P != kP + lP';
    });
    T.prop('ec count by brute force, n P = O', 60, function (r) {
        var E = randCurve(r, 400n), p = Number(E.p), n = 1;
        for (var x = 0; x < p; x++) for (var y = 0; y < p; y++) if ((y * y - (x * x * x + Number(E.a) * x + Number(E.b))) % p === 0) n++;
        var N = ec.count(E);
        if (N !== BigInt(n)) return 'count ' + N + ' != ' + n;
        var P = randPoint(r, E);
        return ec.mul(E, N, P).R === null ? true : 'N P is not O';
    });
    T.prop('elliptic-curve tool matches the library', 60, function (r) {
        var E = randCurve(r, r.pick([1000n, 2n ** 64n])), P = randPoint(r, E), Q = randPoint(r, E), k = r.int(-1000, 10n ** 9n);
        var base = { a: String(E.a), b: String(E.b), p: String(E.p), P: ec.plain(P), Q: ec.plain(Q), k: String(k) };
        return Promise.all([T.run('elliptic-curve', base, 'add'), T.run('elliptic-curve', base, 'dbl'), T.run('elliptic-curve', base, 'mul')]).then(function (o) {
            var want = [ec.add(E, P, Q).R, ec.add(E, P, P).R, ec.mul(E, k, P).R].map(ec.plain);
            for (var i = 0; i < 3; i++) { if (o[i].errors) return JSON.stringify(o[i].errors); if (o[i].copy !== want[i]) return 'op ' + i + ': ' + o[i].copy + ' != ' + want[i]; if (checksOk(o[i].S) !== true) return checksOk(o[i].S); }
            return true;
        });
    });

    T.tool('elliptic-curve-points', [
        { in: { a: '2', b: '2', p: '17' }, copy: '19', check: okAnd(function (S) { return S.res.lines[1].indexOf('Cyclic') === 0 ? true : 'not cyclic?'; }) },
        { in: { a: '-1', b: '0', p: '23' }, copy: '24', check: function (S) { return S.res.lines[1].indexOf('\\mathbb{Z}_{2} \\times \\mathbb{Z}_{12}') >= 0 ? true : S.res.lines[1]; } },
        { in: { a: '1', b: '1', p: '5' }, copy: '9' },
        { in: { a: '0', b: '0', p: '17' }, error: true },
        { in: { a: '1', b: '1', p: '2003' }, error: true },
        { in: { a: '1', b: '1', p: '15' }, error: true }
    ]);
    T.prop('elliptic-curve-points: Hasse, orders divide #E', 30, function (r) {
        var E = randCurve(r, 300n);
        return T.run('elliptic-curve-points', { a: String(E.a), b: String(E.b), p: String(E.p) }).then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            var N = BigInt(o.copy);
            if (N !== ec.count(E)) return 'count';
            if (checksOk({ steps: o.S.steps.slice(0, 3) }) !== true) return 'Hasse check failed';
            var P = randPoint(r, E), fac = nt.factor(N), ord = ec.order(E, P, N, fac);
            return N % ord === 0n && ec.mul(E, ord, P).R === null ? true : 'order';
        });
    });

    T.tool('ecdh', [
        { in: { a: '2', b: '2', p: '17', G: '(5, 1)', n: '', da: '3', db: '7' }, copy: '6', check: okAnd() },
        { in: { a: '2', b: '2', p: '17', G: '(5, 1)', n: '19', da: '3', db: '7' }, copy: '6' },
        { in: { a: '0', b: '7', p: '2^256 - 2^32 - 977', G: secG, n: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141', da: '', db: '' }, check: okAnd() },
        { in: { a: '2', b: '2', p: '17', G: '(5, 1)', n: '18', da: '3', db: '7' }, error: true },
        { in: { a: '2', b: '2', p: '17', G: '(5, 1)', n: '', da: '19', db: '7' }, error: true },
        { in: { a: '2', b: '2', p: '17', G: 'O', n: '', da: '3', db: '7' }, error: true },
        { in: { a: '0', b: '7', p: '2^256 - 2^32 - 977', G: secG, n: '', da: '3', db: '7' }, error: true }
    ]);
    T.prop('ecdh both sides agree', 40, function (r) {
        var E = randCurve(r, 20000n), G = randPoint(r, E), N = ec.count(E), n = ec.order(E, G, N, nt.factor(N));
        if (n < 3n) return true;
        var da = r.int(1, n - 1n), db = r.int(1, n - 1n);
        return T.run('ecdh', { a: String(E.a), b: String(E.b), p: String(E.p), G: ec.plain(G), n: '', da: String(da), db: String(db) }).then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            var Sh = ec.mul(E, da * db, G).R, want = Sh === null ? 'O' : String(Sh.x);
            return checksOk(o.S) === true && o.copy === want ? true : 'got ' + o.copy + ', want ' + want;
        });
    });

    /* ---------- Shamir ---------- */
    T.tool('shamir-secret-sharing', [
        { in: { p: '1613', s: '1234', n: '6', t: '3', coef: '166, 94', shares: '' }, copy: '(1, 1494), (2, 329), (3, 965), (4, 176), (5, 1188), (6, 775)', check: okAnd() },
        { in: { p: '1613', s: '', n: '', t: '', coef: '', shares: '(2, 329), (4, 176), (6, 775)' }, action: 'join', copy: '1234' },
        { in: { p: '1613', s: '', n: '', t: '', coef: '', shares: '1 1494\n5 1188\n3 965\n6 775' }, action: 'join', copy: '1234' },
        { in: { p: '1613', s: '', n: '', t: '', coef: '', shares: '(1, 1494)' }, action: 'join', copy: '1494' },
        { in: { p: '101', s: '42', n: '4', t: '1', coef: '', shares: '' }, copy: '(1, 42), (2, 42), (3, 42), (4, 42)' },
        { in: { p: '1613', s: '1613', n: '6', t: '3', coef: '', shares: '' }, error: true },
        { in: { p: '1613', s: '5', n: '6', t: '7', coef: '', shares: '' }, error: true },
        { in: { p: '1613', s: '5', n: '6', t: '3', coef: '1', shares: '' }, error: true },
        { in: { p: '7', s: '5', n: '7', t: '3', coef: '', shares: '' }, error: true },
        { in: { p: '1600', s: '5', n: '6', t: '3', coef: '', shares: '' }, error: true },
        { in: { p: '1613', s: '', n: '', t: '', coef: '', shares: '(1, 2), (1, 3)' }, action: 'join', error: true },
        { in: { p: '1613', s: '', n: '', t: '', coef: '', shares: '(0, 2), (1, 3)' }, action: 'join', error: true },
        { in: { p: '1613', s: '', n: '', t: '', coef: '', shares: '(1, 2), (3)' }, action: 'join', error: true },
        { in: { p: '1613', s: '', n: '', t: '', coef: '', shares: '' }, action: 'join', error: true }
    ]);
    T.prop('shamir reconstruct from random t-subsets', 80, function (r) {
        var p = prime(r, 50, r.pick([10n ** 4n, 2n ** 127n])), n = r.num(2, Math.min(12, Number(p) - 1)), t = r.num(1, n), s = r.int(0, p - 1n);
        return T.run('shamir-secret-sharing', { p: String(p), s: String(s), n: String(n), t: String(t), coef: '', shares: '' }, 'split').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            if (checksOk(o.S) !== true) return checksOk(o.S);
            var shares = o.copy.match(/\(\d+, \d+\)/g), pick = [];
            if (shares.length !== n) return 'wrong number of shares';
            var idx = shares.map(function (_, i) { return i; });
            for (var i = 0; i < t; i++) { var j = r.num(i, n - 1), tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; pick.push(shares[idx[i]]); }
            return T.run('shamir-secret-sharing', { p: String(p), s: '', n: '', t: '', coef: '', shares: pick.join(', ') }, 'join').then(function (d) { return d.copy === String(s) ? true : 'reconstructed ' + d.copy + ', secret ' + s; });
        });
    });

    /* ---------- GF(2^8) ---------- */
    T.tool('gf256', [
        { in: { a: '57', b: '83' }, action: 'mul', copy: 'C1', check: okAnd() },
        { in: { a: '57', b: '13' }, action: 'mul', copy: 'FE' },
        { in: { a: 'x^6 + x^4 + x^2 + x + 1', b: '0b10000011' }, action: 'mul', copy: 'C1' },
        { in: { a: '{57}', b: '0x83' }, action: 'mul', copy: 'C1' },
        { in: { a: '57', b: '83' }, action: 'add', copy: 'D4' },
        { in: { a: '53', b: '' }, action: 'inv', copy: 'CA', check: okAnd(noteHas('ED')) },
        { in: { a: '01', b: '' }, action: 'inv', copy: '01' },
        { in: { a: '00', b: '' }, action: 'inv', error: true },
        { in: { a: '100', b: '' }, action: 'inv', error: true },
        { in: { a: 'x^8', b: '' }, action: 'inv', error: true },
        { in: { a: 'zz', b: '' }, action: 'inv', error: true },
        { in: { a: '57', b: '' }, action: 'mul', error: true },
        { in: { a: '80', b: '02' }, action: 'mul', copy: '1B' },
        { in: { a: '00', b: 'FF' }, action: 'mul', copy: '00' }
    ]);
    T.prop('gf256: a * a^-1 = 1, commutative, distributive', 120, function (r) {
        var a = r.num(1, 255), b = r.num(0, 255), c = r.num(0, 255);
        function hx(n) { return (n < 16 ? '0' : '') + n.toString(16).toUpperCase(); }
        return T.run('gf256', { a: hx(a), b: '' }, 'inv').then(function (o) {
            return Promise.all([T.run('gf256', { a: hx(a), b: o.copy }, 'mul'), T.run('gf256', { a: hx(a), b: hx(b) }, 'mul'), T.run('gf256', { a: hx(b), b: hx(a) }, 'mul'),
                T.run('gf256', { a: hx(a), b: hx(b ^ c) }, 'mul'), T.run('gf256', { a: hx(a), b: hx(c) }, 'mul')]).then(function (v) {
                if (v[0].copy !== '01') return hx(a) + ' * inverse ' + o.copy + ' = ' + v[0].copy;
                if (v[1].copy !== v[2].copy) return 'not commutative';
                if (parseInt(v[3].copy, 16) !== (parseInt(v[1].copy, 16) ^ parseInt(v[4].copy, 16))) return 'not distributive';
                return checksOk(v[1].S);
            });
        });
    });

    /* ---------- polynomials ---------- */
    T.tool('polynomial-mod-p', [
        { in: { p: '7', f: 'x^4 + 3x^2 + 2x + 1', g: '2x^2 + 1' }, action: 'div', copy: 'q = 4x^2 + 3\nr = 2x + 5', check: okAnd() },
        { in: { p: '5', f: 'x^2 + 3x + 2', g: '2x^3 + x + 4' }, action: 'mul', copy: '2x^5 + x^4 + 2x^2 + 4x + 3' },
        { in: { p: '7', f: 'x^4 + 3x^3 + x^2 + 2x + 2', g: 'x^3 + 6x + 1' }, action: 'gcd', copy: 'x^2 + 2x + 3' },
        { in: { p: '2', f: 'x^6 + x^4 + x^2 + x + 1', g: 'x^8 + x^4 + x^3 + x + 1' }, action: 'inv', copy: 'x^7 + x^5 + x^4 + x^3 + x^2 + x + 1', check: okAnd() },
        { in: { p: '13', f: '3x^3 + 5x + 9', g: '12x^3 + 4x^2 + 1' }, action: 'add', copy: '2x^3 + 4x^2 + 5x + 10' },
        { in: { p: '13', f: '3x^3 + 5x + 9', g: '3x^3 + 5x + 9' }, action: 'sub', copy: '0' },
        { in: { p: '7', f: '1, 0, 3, 2, 1', g: '2, 0, 1' }, action: 'div', copy: 'q = 4x^2 + 3\nr = 2x + 5' },
        { in: { p: '7', f: '-x^2 - 1', g: 'x' }, action: 'add', copy: '6x^2 + x + 6' },
        { in: { p: '7', f: 'x', g: 'x^2' }, action: 'div', copy: 'q = 0\nr = x' },
        { in: { p: '7', f: 'x^2 + 1', g: 'x^2 - 1' }, action: 'inv', copy: '4' },
        { in: { p: '7', f: 'x + 1', g: 'x^2 - 1' }, action: 'inv', copy: 'no inverse' },
        { in: { p: '7', f: 'x + 1', g: '0' }, action: 'div', error: true },
        { in: { p: '8', f: 'x + 1', g: 'x' }, action: 'div', error: true },
        { in: { p: '7', f: 'x + y', g: 'x' }, action: 'div', error: true },
        { in: { p: '7', f: 'x^100', g: 'x' }, action: 'div', error: true },
        { in: { p: '7', f: 'x^2', g: 'x' }, action: 'inv', error: true }
    ]);
    function polyText(c) { var t = []; for (var i = c.length - 1; i >= 0; i--) if (c[i]) t.push(c[i] + (i ? 'x^' + i : '')); return t.length ? t.join(' + ') : '0'; }
    T.prop('polynomials: division, gcd and inverse verify themselves', 120, function (r) {
        var p = prime(r, 2, r.pick([10n, 1000n, 2n ** 61n])), f = [], g = [];
        for (var i = 0, df = r.num(0, 9); i <= df; i++) f.push(r.int(0, p - 1n));
        for (i = 0, df = r.num(1, 6); i <= df; i++) g.push(r.int(0, p - 1n));
        g[g.length - 1] = g[g.length - 1] || 1n;
        var inp = { p: String(p), f: polyText(f), g: polyText(g) };
        return Promise.all([T.run('polynomial-mod-p', inp, 'div'), T.run('polynomial-mod-p', inp, 'gcd'), T.run('polynomial-mod-p', inp, 'inv'), T.run('polynomial-mod-p', inp, 'mul')]).then(function (o) {
            for (var k = 0; k < 3; k++) {
                if (o[k].errors && !(k === 2 && /multiple|degree/.test(JSON.stringify(o[k].errors))) && !(k === 1 && f.every(function (x) { return !x; }))) return 'op ' + k + ': ' + JSON.stringify(o[k].errors);
                if (!o[k].errors && checksOk(o[k].S) !== true) return 'op ' + k + ': ' + checksOk(o[k].S);
            }
            /* the product: compare with a direct computation at a random point */
            var x0 = r.int(0, p - 1n);
            function ev(c) { var v = 0n; for (var j = c.length - 1; j >= 0; j--) v = (v * x0 + c[j]) % p; return v; }
            var prodText = o[3].copy, terms = prodText === '0' ? [] : prodText.split(' + '), pv = 0n;
            terms.forEach(function (tm) { var mm = /^(\d*)(x(?:\^(\d+))?)?$/.exec(tm), c = mm[1] ? BigInt(mm[1]) : 1n, e = mm[2] ? (mm[3] ? BigInt(mm[3]) : 1n) : 0n; pv = (pv + c * nt.powmod(x0, e, p)) % p; });
            return pv === ev(f) * ev(g) % p ? true : 'product wrong at x = ' + x0;
        });
    });

    /* ---------- Paillier ---------- */
    T.tool('paillier', [
        { in: { p: '17', q: '19', m1: '42', m2: '100', r1: '23', r2: '81', c: '' }, copy: 'c1 = 35763\nc2 = 8725\nc1*c2 = 88465\nm1 + m2 = 142', check: okAnd() },
        { in: { p: '17', q: '19', m1: '', m2: '', r1: '', r2: '', c: '88465' }, action: 'dec', copy: '142' },
        { in: { p: '17', q: '19', m1: '', m2: '', r1: '', r2: '', c: '35763' }, action: 'dec', copy: '42' },
        { in: { p: '17', q: '19', m1: '300', m2: '100', r1: '', r2: '', c: '' }, check: okAnd(function (S, copy) { return /m1 \+ m2 = 77$/.test(copy) ? true : copy; }) },
        { in: { p: '17', q: '19', m1: '323', m2: '1', r1: '', r2: '', c: '' }, error: true },
        { in: { p: '17', q: '19', m1: '3', m2: '1', r1: '17', r2: '', c: '' }, error: true },
        { in: { p: '17', q: '17', m1: '3', m2: '1', r1: '', r2: '', c: '' }, error: true },
        { in: { p: '3', q: '7', m1: '3', m2: '1', r1: '', r2: '', c: '' }, error: true },
        { in: { p: '17', q: '19', m1: '', m2: '', r1: '', r2: '', c: '17' }, action: 'dec', error: true }
    ]);
    T.prop('paillier homomorphism and decryption', 25, function (r) {
        var p = prime(r, 1000, 10n ** 9n), q = prime(r, 1000, 10n ** 9n);
        if (p === q || nt.gcd(p * q, (p - 1n) * (q - 1n)) !== 1n) return true;
        var n = p * q, m1 = r.int(0, n - 1n), m2 = r.int(0, n - 1n);
        return T.run('paillier', { p: String(p), q: String(q), m1: String(m1), m2: String(m2), r1: '', r2: '', c: '' }, 'add').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            if (checksOk(o.S) !== true) return checksOk(o.S);
            var lines = o.copy.split('\n'), sum = lines[3].replace('m1 + m2 = ', ''), c1 = lines[0].replace('c1 = ', '');
            if (sum !== String((m1 + m2) % n)) return 'sum ' + sum;
            return T.run('paillier', { p: String(p), q: String(q), m1: '', m2: '', r1: '', r2: '', c: c1 }, 'dec').then(function (d) { return d.copy === String(m1) ? true : 'decrypted c1 to ' + d.copy; });
        });
    });

    /* ---------- lattices ---------- */
    T.tool('lattice-reduction', [
        { in: { basis: '1, 1, 1\n-1, 0, 2\n3, 5, 6', delta: '3/4' }, action: 'lll', copy: '0, 1, 0\n1, 0, 1\n-1, 0, 2', check: okAnd() },
        { in: { basis: '66586820, 65354729\n6513996, 6393464', delta: '' }, action: 'gauss', copy: '2280, -1001\n-1324, -2376', check: okAnd() },
        { in: { basis: '(1, 0)\n(0, 1)', delta: '0.75' }, action: 'lll', copy: '1, 0\n0, 1' },
        { in: { basis: '1 2 3; 4 5 6; 7 8 10', delta: '0.99' }, action: 'lll', check: okAnd() },
        { in: { basis: '1, 2\n2, 4', delta: '3/4' }, action: 'lll', error: true },
        { in: { basis: '1, 2\n2, 4', delta: '3/4' }, action: 'gauss', error: true },
        { in: { basis: '1, 2, 3', delta: '3/4' }, action: 'lll', error: true },
        { in: { basis: '1, 2\n3, 4\n5, 7', delta: '3/4' }, action: 'lll', error: true },
        { in: { basis: '1, 2\n3', delta: '3/4' }, action: 'lll', error: true },
        { in: { basis: '1, 0, 0\n0, 1, 0\n0, 0, 1', delta: '1/4' }, action: 'lll', error: true },
        { in: { basis: '1, 0, 0\n0, 1, 0\n0, 0, 1', delta: '2' }, action: 'lll', error: true },
        { in: { basis: '1, 0, 0\n0, 1, 0\n0, 0, 1', delta: '' }, action: 'gauss', error: true }
    ]);
    /* exact checks in the test: |det| and that the new basis is an integer combination of the old one */
    function detQ(a) {
        var n = a.length, m = a.map(function (r) { return r.slice(); }), sign = 1n, prev = 1n;
        for (var k = 0; k < n - 1; k++) {
            if (m[k][k] === 0n) { var s = k + 1; while (s < n && m[s][k] === 0n) s++; if (s === n) return 0n; var t = m[k]; m[k] = m[s]; m[s] = t; sign = -sign; }
            for (var i = k + 1; i < n; i++) for (var j = k + 1; j < n; j++) m[i][j] = (m[i][j] * m[k][k] - m[i][k] * m[k][j]) / prev;
            prev = m[k][k];
        }
        return sign * m[n - 1][n - 1];
    }
    function inLattice(B, v) {
        /* Cramer: v = x B with x_i = det(B with row i replaced by v) / det(B); integral for every i */
        var d = detQ(B);
        for (var i = 0; i < B.length; i++) { var C = B.slice(); C[i] = v; if (detQ(C) % d !== 0n) return false; }
        return true;
    }
    T.prop('LLL: reduced, same lattice, b1 short', 60, function (r) {
        var n = r.num(2, 5), B = [], d = 0n;
        while (d === 0n) {
            B = [];
            for (var i = 0; i < n; i++) { var row = []; for (var j = 0; j < n; j++) row.push(r.int(-60, 60)); B.push(row); }
            d = detQ(B);
        }
        var delta = r.pick(['3/4', '0.99', '1/2']);
        return T.run('lattice-reduction', { basis: B.map(function (x) { return x.join(', '); }).join('\n'), delta: delta }, 'lll').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            if (checksOk(o.S) !== true) return checksOk(o.S);
            var R = o.copy.split('\n').map(function (l) { return l.split(', ').map(BigInt); });
            var dr = detQ(R);
            if (nt.abs(dr) !== nt.abs(d)) return 'det ' + dr + ' != ' + d;
            if (!R.every(function (v) { return inLattice(B, v); })) return 'not in the lattice';
            if (!B.every(function (v) { return inLattice(R, v); })) return 'old basis not in the new lattice';
            var n1 = R[0].reduce(function (a, x) { return a + x * x; }, 0n), m0 = B.reduce(function (a, v) { var s = v.reduce(function (t, x) { return t + x * x; }, 0n); return s < a ? s : a; }, n1);
            return n1 <= m0 * (2n ** BigInt(n)) ? true : 'b1 too long';
        });
    });
    T.prop('Lagrange-Gauss: reduced and same lattice', 80, function (r) {
        var B = [[r.int(-(10n ** 9n), 10n ** 9n), r.int(-(10n ** 9n), 10n ** 9n)], [r.int(-(10n ** 9n), 10n ** 9n), r.int(-(10n ** 9n), 10n ** 9n)]], d = detQ(B);
        if (d === 0n) return true;
        return T.run('lattice-reduction', { basis: B.map(function (x) { return x.join(', '); }).join('\n'), delta: '' }, 'gauss').then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            var R = o.copy.split('\n').map(function (l) { return l.split(', ').map(BigInt); });
            if (nt.abs(detQ(R)) !== nt.abs(d) || !R.every(function (v) { return inLattice(B, v); })) return 'not the same lattice';
            return checksOk(o.S);
        });
    });

    /* ---------- LWE ---------- */
    T.tool('lwe', [
        { in: { n: '4', q: '97', m: '8', B: '2', bit: '1', seed: '2024' }, check: okAnd(function (S, copy) { return /decrypts to 1$/.test(copy) ? true : copy; }) },
        { in: { n: '4', q: '97', m: '8', B: '2', bit: '0', seed: '2024' }, check: okAnd(function (S, copy) { return /decrypts to 0$/.test(copy) ? true : copy; }) },
        { in: { n: '4', q: '97', m: '16', B: '8', bit: '1', seed: '21' }, check: function (S, copy) { return /decrypts to 0$/.test(copy) ? true : 'expected a decryption error: ' + copy; } },
        { in: { n: '4', q: '97', m: '8', B: '0', bit: '1', seed: '5' }, check: okAnd() },
        { in: { n: '4', q: '97', m: '8', B: '49', bit: '1', seed: '5' }, error: true },
        { in: { n: '17', q: '97', m: '8', B: '2', bit: '1', seed: '5' }, error: true },
        { in: { n: '4', q: '97', m: '65', B: '2', bit: '1', seed: '5' }, error: true },
        { in: { n: '4', q: '97', m: '8', B: '2', bit: '1', seed: 'abc' }, error: true }
    ]);
    T.prop('lwe: small errors always decrypt', 40, function (r) {
        var n = r.num(1, 8), q = r.int(17, 100000), m = r.num(1, 30), B = r.int(0, (q - 1n) / (4n * BigInt(m)));
        if (BigInt(m) * B * 4n >= q) return true;
        var inp = { n: String(n), q: String(q), m: String(m), B: String(B), bit: String(r.num(0, 1)), seed: String(r.num(1, 1000000)) };
        return T.run('lwe', inp).then(function (o) {
            if (o.errors) return JSON.stringify(o.errors);
            return checksOk(o.S) === true && new RegExp('decrypts to ' + inp.bit + '$').test(o.copy) ? true : JSON.stringify(inp) + ' ' + checksOk(o.S);
        });
    });

    /* ---------- birthday bound ---------- */
    function near(x, tol) { return function (S, copy) { return Math.abs(Number(copy) - x) <= tol ? true : 'got ' + copy + ', expected about ' + x; }; }
    T.tool('birthday-bound', [
        { in: { what: 'coll', N: '365', k: '23' }, check: near(0.507297, 1e-6) },
        { in: { what: 'coll', N: '365', k: '22' }, check: near(0.475695, 1e-6) },
        { in: { what: 'coll', N: '365', k: '366' }, copy: '1' },
        { in: { what: 'coll', N: '365', k: '0' }, copy: '0' },
        { in: { what: 'coll', N: '365', k: '1' }, copy: '0' },
        { in: { what: 'coll', N: '2^64', k: '2^32' }, check: near(1 - Math.exp(-0.5), 1e-9) },
        { in: { what: 'coll', N: '2^128', k: '10^12' }, check: near(1e24 / 2 / Math.pow(2, 128), 1e-20) },
        { in: { what: 'coll', N: '10^6', k: '10^5' }, check: near(1, 1e-12) },
        { in: { what: 'coll', N: '2^40', k: '2^21' }, check: near(1 - Math.exp(-2), 1e-6) },
        { in: { what: 'brute', bits: '56', rate: '1e9' }, copy: '417 days' },
        { in: { what: 'brute', bits: '128', rate: '1e12' }, copy: '5.39e18 years' },
        { in: { what: 'brute', bits: '20', rate: '1e6' }, copy: '0.524 seconds' },
        { in: { what: 'brute', bits: '4096', rate: '1e30' }, check: function (S, copy) { return /e1\d\d\d years$/.test(copy) ? true : copy; } },
        { in: { what: 'brute', bits: '128', rate: '0' }, error: true },
        { in: { what: 'brute', bits: '0', rate: '1e9' }, error: true },
        { in: { what: 'coll', N: '0', k: '3' }, error: true },
        { in: { what: 'coll', N: '2^1001', k: '3' }, error: true }
    ]);
    T.prop('birthday: 50% point is right', 30, function (r) {
        var N = r.int(2, 10n ** 7n);
        return T.run('birthday-bound', { what: 'coll', N: String(N), k: '2' }).then(function (o) {
            var k = BigInt(/about \$(\d+)\$/.exec(o.S.res.lines[1])[1]), q = 1, Nf = Number(N);
            for (var i = 1n; i < k; i++) q *= 1 - Number(i) / Nf;
            var qPrev = q / (1 - Number(k - 1n) / Nf);
            return q <= 0.5 && qPrev > 0.5 ? true : 'N=' + N + ' k=' + k;
        });
    });
})();
