/* Secret ballots: the cryptography (README.md in this folder, "Secret ballots").
   A ballot is a vote for exactly one of k answers (2 to 5), encrypted on the phone so that nobody but the holder of
   the ballot's secret key (the projector tab on the presenter's laptop) can read it, and that only for the sum of all
   ballots. Exponential ElGamal on the NIST curve P-256: the public key is Y = x G; a 0 or 1 is encrypted as
   (A, B) = (r G, m G + r Y). A ballot is one ciphertext per answer (a 1 for the chosen one, 0 for the others) with
     - for each answer, a proof that it encrypts 0 or 1 (a disjunctive Chaum-Pedersen proof: two Schnorr-like
       proofs, one of them simulated, so the verifier cannot tell which branch is real), and
     - a proof that the k ciphertexts together encrypt exactly 1 (a Chaum-Pedersen proof that sum(B) - G and sum(A)
       have the same discrete logarithm r to the bases Y and G).
   The proofs are made non-interactive with Fiat-Shamir (SHA-256, two calls give 512 bits, reduced mod n), and every
   hash includes a context (the session, the activity, the public key, the answer's index), so a proof made for one
   ballot cannot be reused for another activity. Adding the ciphertexts of all ballots answer by answer gives an
   encryption of the count for that answer; the projector decrypts only those sums (the counts are small, so the
   discrete logarithm is found by trying 0, 1, 2, ...).
   Plain BigInt arithmetic (Jacobian coordinates, 4 bit windows, tables for the fixed points G and Y). Not constant
   time: the secrets here are a vote on the voter's own phone and the tally key on the presenter's laptop, and timing
   is not observable from outside either. Tested against node's own P-256 and SHA-256 in
   tools/workers/live/test/ballot.test.js.
   Encodings: points as compressed SEC1 (33 bytes), scalars as 32 bytes, both in base64url without padding.
   A ballot on the wire: { c: [[A, B] x k], p: [[e0, e1, z0, z1] x k], s: [e, z] }. */
(function (root) {
    'use strict';
    var P = BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff');
    var N = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');
    var B3 = BigInt('0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b');
    var GX = BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296');
    var GY = BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5');
    var _0 = BigInt(0), _1 = BigInt(1), _2 = BigInt(2), _3 = BigInt(3), _4 = BigInt(4), _8 = BigInt(8), _15 = BigInt(15), _255 = BigInt(255);
    var SQRT_EXP = (P + _1) / _4;   // P = 3 mod 4

    function md(a, m) { var r = a % m; return r < _0 ? r + m : r; }
    function fp(a) { return md(a, P); }
    function pow(b, e, m) {
        var r = _1; b = md(b, m);
        while (e > _0) { if (e & _1) r = r * b % m; b = b * b % m; e >>= _1; }
        return r;
    }
    function inv(a, m) {   // extended Euclid
        var t = _0, nt = _1, r = m, nr = md(a, m), q, x;
        while (nr !== _0) { q = r / nr; x = t - q * nt; t = nt; nt = x; x = r - q * nr; r = nr; nr = x; }
        if (r !== _1) throw new Error('not invertible');
        return md(t, m);
    }

    /* ---------- points: [X, Y, Z] Jacobian; Z = 0 is the point at infinity ---------- */
    var INF = [_1, _1, _0];
    var G = [GX, GY, _1];
    function isInf(p) { return p[2] === _0; }
    function dbl(p) {   // dbl-2001-b, a = -3
        if (p[2] === _0 || p[1] === _0) return INF;
        var X = p[0], Y = p[1], Z = p[2];
        var d = Z * Z % P, g = Y * Y % P, be = X * g % P;
        var al = _3 * ((X - d) * (X + d) % P) % P;
        var X3 = fp(al * al - _8 * be);
        var Z3 = fp((Y + Z) * (Y + Z) - g - d);
        var Y3 = fp(al * (_4 * be - X3) - _8 * g * g);
        return [X3, Y3, Z3];
    }
    function add(p, q) {   // add-2007-bl
        if (p[2] === _0) return q;
        if (q[2] === _0) return p;
        var z1z1 = p[2] * p[2] % P, z2z2 = q[2] * q[2] % P;
        var u1 = p[0] * z2z2 % P, u2 = q[0] * z1z1 % P;
        var s1 = p[1] * q[2] % P * z2z2 % P, s2 = q[1] * p[2] % P * z1z1 % P;
        if (u1 === u2) return s1 === s2 ? dbl(p) : INF;
        var hh = fp(u2 - u1), i = _4 * hh * hh % P, j = hh * i % P, r = fp(_2 * (s2 - s1)), v = u1 * i % P;
        var X3 = fp(r * r - j - _2 * v);
        var Y3 = fp(r * (v - X3) - _2 * s1 * j);
        var Z3 = fp(((p[2] + q[2]) * (p[2] + q[2]) - z1z1 - z2z2) % P * hh);
        return [X3, Y3, Z3];
    }
    function neg(p) { return [p[0], fp(-p[1]), p[2]]; }
    function sub(p, q) { return add(p, neg(q)); }
    function affine(p) {
        if (p[2] === _0) return null;
        var zi = inv(p[2], P), zi2 = zi * zi % P;
        return [p[0] * zi2 % P, p[1] * zi2 % P * zi % P];
    }
    function eq(p, q) {
        if (p[2] === _0 || q[2] === _0) return p[2] === _0 && q[2] === _0;
        var z1z1 = p[2] * p[2] % P, z2z2 = q[2] * q[2] % P;
        return p[0] * z2z2 % P === q[0] * z1z1 % P && p[1] * q[2] % P * z2z2 % P === q[1] * p[2] % P * z1z1 % P;
    }
    /* k P for any point: 4 bit windows (256 doublings, 64 additions) */
    function mul(p, k) {
        k = md(k, N);
        if (k === _0 || isInf(p)) return INF;
        var t = [INF, p], i;
        for (i = 2; i < 16; i++) t.push(add(t[i - 1], p));
        var r = INF;
        for (i = 63; i >= 0; i--) {
            if (r[2] !== _0) r = dbl(dbl(dbl(dbl(r))));
            var w = Number((k >> BigInt(4 * i)) & _15);
            if (w) r = add(r, t[w]);
        }
        return r;
    }
    /* a table for a point used many times (G, the public key): T[i][w] = w 16^i P, then k P is 64 additions */
    function table(p) {
        var T = [], base = p;
        for (var i = 0; i < 64; i++) {
            var row = [INF, base];
            for (var w = 2; w < 16; w++) row.push(add(row[w - 1], base));
            T.push(row);
            base = add(row[15], base);
        }
        return T;
    }
    function mulT(T, k) {
        k = md(k, N);
        var r = INF;
        for (var i = 0; i < 64; i++) {
            var w = Number((k >> BigInt(4 * i)) & _15);
            if (w) r = add(r, T[i][w]);
        }
        return r;
    }
    var GT = null;
    function gT() { return GT || (GT = table(G)); }
    function mulG(k) { return mulT(gT(), k); }

    /* ---------- bytes ---------- */
    var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    function b64(bytes) {
        var s = '', i;
        for (i = 0; i + 2 < bytes.length; i += 3) {
            var v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
            s += B64[v >> 18] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + B64[v & 63];
        }
        if (bytes.length - i === 1) { var a = bytes[i] << 16; s += B64[a >> 18] + B64[(a >> 12) & 63]; }
        else if (bytes.length - i === 2) { var b = (bytes[i] << 16) | (bytes[i + 1] << 8); s += B64[b >> 18] + B64[(b >> 12) & 63] + B64[(b >> 6) & 63]; }
        return s;
    }
    function unb64(s, len) {
        if (typeof s !== 'string' || s.length !== Math.ceil(len * 4 / 3) || !/^[A-Za-z0-9_-]*$/.test(s)) return null;
        var out = new Uint8Array(len), bits = 0, acc = 0, j = 0;
        for (var i = 0; i < s.length; i++) {
            acc = (acc << 6) | B64.indexOf(s[i]); bits += 6;
            if (bits >= 8) { bits -= 8; if (j < len) out[j++] = (acc >> bits) & 255; acc &= (1 << bits) - 1; }
        }
        if (acc !== 0) return null;   // stray bits: one value, one spelling
        return out;
    }
    function toBytes(x, len) {
        var out = new Uint8Array(len);
        for (var i = len - 1; i >= 0; i--) { out[i] = Number(x & _255); x >>= _8; }
        return out;
    }
    function fromBytes(b) { var x = _0; for (var i = 0; i < b.length; i++) x = (x << _8) | BigInt(b[i]); return x; }

    function encP(p) {
        var a = affine(p);
        if (!a) throw new Error('infinity');
        var out = new Uint8Array(33);
        out[0] = (a[1] & _1) ? 3 : 2;
        out.set(toBytes(a[0], 32), 1);
        return b64(out);
    }
    /* a point from its encoding, or null when it is not one (wrong length, not on the curve, infinity) */
    function decP(s) {
        var b = unb64(s, 33);
        if (!b || (b[0] !== 2 && b[0] !== 3)) return null;
        var x = fromBytes(b.subarray(1));
        if (x >= P) return null;
        var rhs = fp(x * x % P * x - _3 * x + B3), y = pow(rhs, SQRT_EXP, P);
        if (y * y % P !== rhs) return null;
        if (Number(y & _1) !== (b[0] & 1)) y = P - y;
        return [x, y, _1];
    }
    function encS(k) { return b64(toBytes(md(k, N), 32)); }
    function decS(s) { var b = unb64(s, 32); if (!b) return null; var k = fromBytes(b); return k < N ? k : null; }

    /* ---------- SHA-256 (synchronous, so the same code runs on phones, laptops and in node) ---------- */
    var K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
        0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70,
        0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
        0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    function sha256(msg) {
        var l = msg.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n), i, j;
        m.set(msg); m[l] = 0x80;
        var bits = l * 8;
        for (i = 0; i < 8; i++) { m[n - 1 - i] = bits & 255; bits = Math.floor(bits / 256); }
        var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
        for (var off = 0; off < n; off += 64) {
            for (i = 0; i < 16; i++) w[i] = (m[off + 4 * i] << 24) | (m[off + 4 * i + 1] << 16) | (m[off + 4 * i + 2] << 8) | m[off + 4 * i + 3];
            for (i = 16; i < 64; i++) {
                var a0 = w[i - 15], a1 = w[i - 2];
                var s0 = ((a0 >>> 7) | (a0 << 25)) ^ ((a0 >>> 18) | (a0 << 14)) ^ (a0 >>> 3);
                var s1 = ((a1 >>> 17) | (a1 << 15)) ^ ((a1 >>> 19) | (a1 << 13)) ^ (a1 >>> 10);
                w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
            }
            var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
            for (j = 0; j < 64; j++) {
                var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
                var t1 = (hh + S1 + ((e & f) ^ (~e & g)) + K256[j] + w[j]) | 0;
                var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
                var t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
                hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
            h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
        }
        var out = new Uint8Array(32);
        for (i = 0; i < 8; i++) { out[4 * i] = h[i] >>> 24; out[4 * i + 1] = (h[i] >>> 16) & 255; out[4 * i + 2] = (h[i] >>> 8) & 255; out[4 * i + 3] = h[i] & 255; }
        return out;
    }
    function utf8(s) {
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
        return Uint8Array.from(Buffer.from(s, 'utf8'));
    }
    /* the Fiat-Shamir challenge: 512 bits from two hashes of the parts (joined with "|"), reduced mod n */
    function challenge(parts) {
        var m = utf8(parts.join('|')), x = new Uint8Array(m.length + 1);
        x.set(m, 1);
        x[0] = 0; var h0 = sha256(x);
        x[0] = 1; var h1 = sha256(x);
        return md((fromBytes(h0) << BigInt(256)) | fromBytes(h1), N);
    }

    /* ---------- randomness ---------- */
    /* a uniform scalar in [1, n-1] from 48 random bytes (the bias of reducing 384 bits mod n is below 2^-128) */
    var rnd = function (n) { var b = new Uint8Array(n); root.crypto.getRandomValues(b); return b; };
    function scalar() {
        for (;;) { var k = md(fromBytes(rnd(48)), N); if (k !== _0) return k; }
    }

    /* ---------- keys ---------- */
    function keyPair() {
        var x = scalar();
        return { sk: encS(x), pk: encP(mulG(x)) };
    }
    /* a context: what every challenge of one ballot starts with (session, activity, public key, number of answers) */
    function ctxOf(session, act, pk, k) { return ['florias-live-ballot-v1', session, act, pk, String(k)]; }

    /* ---------- making a ballot (on the phone) ---------- */
    /* pk: the public key (encoded), k: the number of answers, choice: 0..k-1. Answers the ballot as sent. */
    function makeBallot(pk, k, choice, session, act) {
        var Y = decP(pk);
        if (!Y) throw new Error('bad key');
        if (!(k >= 2 && k <= 5) || !(choice >= 0 && choice < k)) throw new Error('bad choice');
        var YT = table(Y), ctx = ctxOf(session, act, pk, k), c = [], p = [], R = _0, SA = INF, SB = INF;
        for (var j = 0; j < k; j++) {
            var m = j === choice ? 1 : 0, r = scalar();
            var A = mulG(r), Bp = add(mulT(YT, r), m ? G : INF);
            var Ae = encP(A), Be = encP(Bp);
            /* branch m is real (commitments w G, w Y), branch 1 - m is simulated (pick its challenge and answer first) */
            var w = scalar(), ef = scalar(), zf = scalar(), t = [null, null];
            t[m] = [mulG(w), mulT(YT, w)];
            var Bf = m ? Bp : sub(Bp, G);   // B - (1 - m) G: the statement of the fake branch
            t[1 - m] = [sub(mulG(zf), mul(A, ef)), sub(mulT(YT, zf), mul(Bf, ef))];
            var e = challenge(ctx.concat(['bit', String(j), Ae, Be, encP(t[0][0]), encP(t[0][1]), encP(t[1][0]), encP(t[1][1])]));
            var er = md(e - ef, N), zr = md(w + er * r, N);
            var es = m ? [ef, er] : [er, ef], zs = m ? [zf, zr] : [zr, zf];
            c.push([Ae, Be]);
            p.push([encS(es[0]), encS(es[1]), encS(zs[0]), encS(zs[1])]);
            R = md(R + r, N); SA = add(SA, A); SB = add(SB, Bp);
        }
        /* the sum encrypts 1: sum(A) = R G and sum(B) - G = R Y */
        var w2 = scalar(), T1 = mulG(w2), T2 = mulT(YT, w2);
        var e2 = challenge(ctx.concat(['sum', encP(SA), encP(SB), encP(T1), encP(T2)]));
        return { c: c, p: p, s: [encS(e2), encS(md(w2 + e2 * R, N))] };
    }

    /* ---------- checking a ballot (on the projector) ---------- */
    /* the shape only (cheap: the worker could do this too). Answers true or false. */
    function shapeOk(b, k) {
        if (!b || typeof b !== 'object' || !Array.isArray(b.c) || !Array.isArray(b.p) || !Array.isArray(b.s)) return false;
        if (b.c.length !== k || b.p.length !== k || b.s.length !== 2) return false;
        function s(x, len) { return typeof x === 'string' && x.length === len && /^[A-Za-z0-9_-]+$/.test(x); }
        for (var j = 0; j < k; j++) {
            if (!Array.isArray(b.c[j]) || b.c[j].length !== 2 || !s(b.c[j][0], 44) || !s(b.c[j][1], 44)) return false;
            if (!Array.isArray(b.p[j]) || b.p[j].length !== 4 || !b.p[j].every(function (x) { return s(x, 43); })) return false;
        }
        return s(b.s[0], 43) && s(b.s[1], 43);
    }
    /* a verifier for one public key (keeps the key's table): v.check(ballot) answers the decoded ciphertexts
       [[A, B] x k] when every proof holds, otherwise null */
    function verifier(pk, k, session, act) {
        var Y = decP(pk);
        if (!Y) throw new Error('bad key');
        var YT = table(Y), ctx = ctxOf(session, act, pk, k);
        return { check: function (b) {
            if (!shapeOk(b, k)) return null;
            var out = [], SA = INF, SB = INF;
            for (var j = 0; j < k; j++) {
                var A = decP(b.c[j][0]), Bp = decP(b.c[j][1]);
                var e0 = decS(b.p[j][0]), e1 = decS(b.p[j][1]), z0 = decS(b.p[j][2]), z1 = decS(b.p[j][3]);
                if (!A || !Bp || e0 === null || e1 === null || z0 === null || z1 === null) return null;
                var B1 = sub(Bp, G);
                var t00 = sub(mulG(z0), mul(A, e0)), t01 = sub(mulT(YT, z0), mul(Bp, e0));
                var t10 = sub(mulG(z1), mul(A, e1)), t11 = sub(mulT(YT, z1), mul(B1, e1));
                if (isInf(t00) || isInf(t01) || isInf(t10) || isInf(t11)) return null;
                var e = challenge(ctx.concat(['bit', String(j), b.c[j][0], b.c[j][1], encP(t00), encP(t01), encP(t10), encP(t11)]));
                if (md(e0 + e1, N) !== e) return null;
                out.push([A, Bp]);
                SA = add(SA, A); SB = add(SB, Bp);
            }
            var es = decS(b.s[0]), zs = decS(b.s[1]);
            if (es === null || zs === null || isInf(SA) || isInf(SB)) return null;
            var T1 = sub(mulG(zs), mul(SA, es)), T2 = sub(mulT(YT, zs), mul(sub(SB, G), es));
            if (isInf(T1) || isInf(T2)) return null;
            if (challenge(ctx.concat(['sum', encP(SA), encP(SB), encP(T1), encP(T2)])) !== es) return null;
            return out;
        } };
    }

    /* ---------- the tally (on the projector) ---------- */
    /* sums: a running sum of checked ballots, answer by answer */
    function sums(k) { var s = []; for (var j = 0; j < k; j++) s.push([INF, INF]); return { s: s, n: 0 }; }
    function addTo(sm, cts) { for (var j = 0; j < cts.length; j++) { sm.s[j][0] = add(sm.s[j][0], cts[j][0]); sm.s[j][1] = add(sm.s[j][1], cts[j][1]); } sm.n++; }
    /* the counts: for each answer, the t in 0..n with sum(B) - x sum(A) = t G (null when none is found: a wrong key) */
    function decrypt(sm, sk) {
        var x = decS(sk);
        if (x === null) throw new Error('bad key');
        return sm.s.map(function (ab) {
            var M = sub(ab[1], mul(ab[0], x)), Q = INF;
            for (var t = 0; t <= sm.n; t++) { if (eq(Q, M)) return t; Q = add(Q, G); }
            return null;
        });
    }
    var api = { keyPair: keyPair, makeBallot: makeBallot, verifier: verifier, shapeOk: shapeOk, sums: sums, addTo: addTo,
        decrypt: decrypt, MAX: 5,
        /* for the tests */
        _: { sha256: sha256, mulG: mulG, mul: mul, add: add, encP: encP, decP: decP, encS: encS, decS: decS, affine: affine, G: G, N: N, P: P,
            setRandom: function (f) { rnd = f; } } };
    if (root.LV) root.LV.ballot = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
