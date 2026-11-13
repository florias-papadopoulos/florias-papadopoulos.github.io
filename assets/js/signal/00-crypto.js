/* Signal in two browsers (/phd/signal/, README.md in this folder), part 1: the primitives, all from the
   browser's WebCrypto: X25519 (Diffie-Hellman), Ed25519 (signatures), HKDF and HMAC with SHA-256, AES-256-GCM.
   A browser whose WebCrypto has no X25519 (or gets the RFC 7748 test vector wrong) uses the small X25519 written
   below in plain JavaScript instead; one without Ed25519 signs with ECDSA P-256. SG.ready says which is in use. */
(function () {
    'use strict';
    var SG = window.SG = window.SG || {};
    var subtle = window.crypto && window.crypto.subtle;
    var enc = new TextEncoder(), dec = new TextDecoder();

    /* ---------- bytes ---------- */
    function u8(b) { return new Uint8Array(b); }
    SG.utf8 = function (s) { return enc.encode(s); };
    SG.text = function (b) { return dec.decode(b); };
    SG.rand = function (n) { var b = new Uint8Array(n); window.crypto.getRandomValues(b); return b; };
    SG.cat = function () {
        var n = 0, i, k = 0;
        for (i = 0; i < arguments.length; i++) n += arguments[i].length;
        var o = new Uint8Array(n);
        for (i = 0; i < arguments.length; i++) { o.set(arguments[i], k); k += arguments[i].length; }
        return o;
    };
    SG.hex = function (b) {
        var s = '';
        for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
        return s;
    };
    SG.unhex = function (s) {
        var b = new Uint8Array(s.length / 2);
        for (var i = 0; i < b.length; i++) b[i] = parseInt(s.substr(2 * i, 2), 16);
        return b;
    };
    /* the first bytes of a key, as shown on the page: "3fa19c02…" */
    SG.short = function (b, n) { return b ? SG.hex(b.subarray(0, n || 4)) + '…' : ''; };
    SG.b64u = function (b) {
        var s = '';
        for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };
    SG.unb64u = function (s) {
        if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64');
        var t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
        var b = new Uint8Array(t.length);
        for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
        return b;
    };
    SG.same = function (a, b) {
        if (!a || !b || a.length !== b.length) return false;
        var d = 0;
        for (var i = 0; i < a.length; i++) d |= a[i] ^ b[i];
        return d === 0;
    };
    SG.u32 = function (n) { return new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); };

    /* ---------- HKDF, HMAC, SHA-256, AES-GCM ---------- */
    SG.hkdf = async function (ikm, salt, info, len) {
        var k = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
        return u8(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: SG.utf8(info) }, k, len * 8));
    };
    SG.hmac = async function (key, data) {
        var k = await subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        return u8(await subtle.sign('HMAC', k, data));
    };
    SG.sha256 = async function (data) { return u8(await subtle.digest('SHA-256', data)); };
    SG.seal = async function (key, iv, pt, ad) {
        var k = await subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
        return u8(await subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: ad }, k, pt));
    };
    /* throws when the key is wrong or anything was changed */
    SG.open = async function (key, iv, ct, ad) {
        var k = await subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
        return u8(await subtle.decrypt({ name: 'AES-GCM', iv: iv, additionalData: ad }, k, ct));
    };

    /* ---------- X25519 in plain JavaScript (RFC 7748), for browsers without it in WebCrypto ----------
       The Montgomery ladder on BigInts. Not constant time: fine for a demo in one's own tab, not for real secrets. */
    var B = function (n) { return BigInt(n); };
    var P = (B(1) << B(255)) - B(19), A24 = B(121665), ZERO = B(0), ONE = B(1), BYTE = B(255), EIGHT = B(8);
    function md(a) { a %= P; return a < ZERO ? a + P : a; }
    function pw(b, e) {
        var r = ONE;
        b = md(b);
        while (e > ZERO) { if (e & ONE) r = r * b % P; b = b * b % P; e >>= ONE; }
        return r;
    }
    function le(b) { var n = ZERO; for (var i = b.length - 1; i >= 0; i--) n = (n << EIGHT) + B(b[i]); return n; }
    function bytes32(n) { var b = new Uint8Array(32); for (var i = 0; i < 32; i++) { b[i] = Number(n & BYTE); n >>= EIGHT; } return b; }
    function ladder(k32, u32) {
        var k = k32.slice(), u = u32.slice();
        k[0] &= 248; k[31] &= 127; k[31] |= 64;
        u[31] &= 127;
        var kn = le(k), x1 = md(le(u)), x2 = ONE, z2 = ZERO, x3 = x1, z3 = ONE, swap = ZERO, t, tmp;
        for (var i = 254; i >= 0; i--) {
            t = (kn >> B(i)) & ONE;
            swap ^= t;
            if (swap) { tmp = x2; x2 = x3; x3 = tmp; tmp = z2; z2 = z3; z3 = tmp; }
            swap = t;
            var a = md(x2 + z2), aa = a * a % P, b = md(x2 - z2), bb = b * b % P, e = md(aa - bb);
            var c = md(x3 + z3), d = md(x3 - z3), da = d * a % P, cb = c * b % P;
            x3 = md((da + cb) * (da + cb));
            z3 = md(x1 * md((da - cb) * (da - cb)));
            x2 = aa * bb % P;
            z2 = md(e * (aa + A24 * e));
        }
        if (swap) { x2 = x3; z2 = z3; }
        return bytes32(x2 * pw(z2, P - B(2)) % P);
    }
    var NINE = new Uint8Array(32); NINE[0] = 9;
    SG.x25519 = ladder;   // for the tests (test/x25519.cjs)

    var jsDH = {
        gen: async function () { var priv = SG.rand(32); return { priv: priv, pub: ladder(priv, NINE) }; },
        dh: async function (pair, pub) { return ladder(pair.priv, pub); }
    };
    var wcDH = {
        gen: async function () {
            var kp = await subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
            var j = await subtle.exportKey('jwk', kp.privateKey);
            return { priv: SG.unb64u(j.d), pub: SG.unb64u(j.x) };
        },
        dh: async function (pair, pub) {
            var k = await subtle.importKey('jwk', { kty: 'OKP', crv: 'X25519', d: SG.b64u(pair.priv), x: SG.b64u(pair.pub) },
                { name: 'X25519' }, false, ['deriveBits']);
            var p = await subtle.importKey('raw', pub, { name: 'X25519' }, false, []);
            return u8(await subtle.deriveBits({ name: 'X25519', public: p }, k, 256));
        }
    };
    var DH = jsDH;
    SG.genDH = function () { return DH.gen(); };
    /* the shared secret; an all-zero result (a low order point sent by a cheat) is refused, as RFC 7748 advises */
    SG.dh = async function (pair, pub) {
        if (!pub || pub.length !== 32) throw new Error('bad public key');
        var s = await DH.dh(pair, pub);
        if (SG.same(s, new Uint8Array(32))) throw new Error('bad public key');
        return s;
    };

    /* ---------- signatures: Ed25519, or ECDSA P-256 ---------- */
    function signer(alg, imp) {
        return {
            name: alg.name === 'Ed25519' ? 'Ed25519' : 'ECDSA P-256',
            gen: async function () {
                var kp = await subtle.generateKey(alg, true, ['sign', 'verify']);
                return { key: kp.privateKey, pub: u8(await subtle.exportKey('raw', kp.publicKey)) };
            },
            sign: async function (pair, data) { return u8(await subtle.sign(imp, pair.key, data)); },
            verify: async function (pub, sig, data) {
                try {
                    var k = await subtle.importKey('raw', pub, alg, false, ['verify']);
                    return await subtle.verify(imp, k, sig, data);
                } catch (e) { return false; }
            }
        };
    }
    SG.sig = signer({ name: 'ECDSA', namedCurve: 'P-256' }, { name: 'ECDSA', hash: 'SHA-256' });
    /* the signers this browser has, by name; a bundle says which one signed it (SG.sig is the best one here) */
    SG.sigs = { 'ECDSA P-256': SG.sig };

    /* ---------- what this browser can do ---------- */
    var V = {   // RFC 7748, section 6.1
        a: '77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a',
        A: '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a',
        Bp: 'de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f',
        K: '4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742'
    };
    async function tryWebCryptoDH() {
        try {
            var k = await wcDH.dh({ priv: SG.unhex(V.a), pub: SG.unhex(V.A) }, SG.unhex(V.Bp));
            if (SG.hex(k) !== V.K) return false;
            var p = await wcDH.gen(), q = await wcDH.gen();
            return SG.same(ladder(p.priv, NINE), p.pub) && SG.same(await wcDH.dh(p, q.pub), await wcDH.dh(q, p.pub));
        } catch (e) { return false; }
    }
    async function tryEd25519() {
        try {
            var s = signer({ name: 'Ed25519' }, { name: 'Ed25519' }), p = await s.gen(), m = SG.utf8('test');
            return (await s.verify(p.pub, await s.sign(p, m), m)) ? s : null;
        } catch (e) { return null; }
    }
    SG.ready = (async function () {
        if (!subtle || typeof BigInt !== 'function') throw new Error('no WebCrypto');
        if (await tryWebCryptoDH()) DH = wcDH;
        else if (SG.hex(ladder(SG.unhex(V.a), SG.unhex(V.Bp))) !== V.K) throw new Error('X25519 fails its test');
        var ed = await tryEd25519();
        if (ed) { SG.sig = ed; SG.sigs.Ed25519 = ed; }
        return { dh: DH === wcDH ? 'X25519 from WebCrypto' : 'X25519 in JavaScript (this browser\'s WebCrypto has none)', sig: SG.sig.name };
    })();
})();
