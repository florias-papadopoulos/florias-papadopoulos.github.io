/* Signal in two browsers, part 2: the protocol, as in Signal's public specifications (signal.org/docs):
   X3DH (the key agreement) and the Double Ratchet (the messages), plus Eve, the eavesdropper who steals one side's
   keys. Differences from the specs, all small: the identity key signs with its own Ed25519 key instead of XEdDSA,
   public keys are encoded raw (no type byte), and messages use AES-256-GCM (an AEAD, which the spec allows) with key
   and nonce from HKDF of the message key. */
(function (SG) {
    'use strict';
    var INFO = 'florias.signal.demo';
    var Z32 = new Uint8Array(32), FF = new Uint8Array(32).fill(255);
    SG.MAX_SKIP = 50;

    /* ---------- X3DH ---------- */
    /* Bob's keys: identity (for DH, and a signing key next to it), a signed prekey and one one-time prekey */
    SG.makeBob = async function () {
        var b = { ik: await SG.genDH(), sk: await SG.sig.gen(), spk: await SG.genDH(), opk: await SG.genDH() };
        b.spkSig = await SG.sig.sign(b.sk, b.spk.pub);
        return b;
    };
    SG.bundleOf = function (b) { return { ik: b.ik.pub, sk: b.sk.pub, spk: b.spk.pub, sig: b.spkSig, opk: b.opk.pub }; };
    async function x3dhKey(dhs) { return SG.hkdf(SG.cat(FF, dhs[0], dhs[1], dhs[2], dhs[3]), Z32, INFO + '.x3dh', 32); }

    /* Alice: checks the signature on the prekey, makes an ephemeral key, four DH, one shared key SK */
    SG.x3dhAlice = async function (ikA, bundle) {
        if (!(await SG.sig.verify(bundle.sk, bundle.sig, bundle.spk))) throw new Error('signature');
        var ek = await SG.genDH();
        var dhs = [await SG.dh(ikA, bundle.spk), await SG.dh(ek, bundle.ik), await SG.dh(ek, bundle.spk), await SG.dh(ek, bundle.opk)];
        return { sk: await x3dhKey(dhs), ad: SG.cat(ikA.pub, bundle.ik), ek: ek };
    };
    /* Bob, from Alice's identity and ephemeral public keys; he then deletes the one-time prekey */
    SG.x3dhBob = async function (b, ikA, ekA) {
        var dhs = [await SG.dh(b.spk, ikA), await SG.dh(b.ik, ekA), await SG.dh(b.spk, ekA), await SG.dh(b.opk, ekA)];
        return { sk: await x3dhKey(dhs), ad: SG.cat(ikA, b.ik.pub) };
    };
    /* a number both phones show, from both identity keys (Signal calls its version the safety number) */
    SG.safety = async function (ikA, ikB) {
        var h = await SG.sha256(SG.cat(ikA, ikB)), s = '';
        for (var i = 0; i < 3; i++) s += (i ? ' ' : '') + String(((h[2 * i] << 8) | h[2 * i + 1]) % 10000 + 10000).slice(1);
        return s;
    };

    /* ---------- the Double Ratchet ---------- */
    async function kdfRk(rk, dhOut) {
        var o = await SG.hkdf(dhOut, rk, INFO + '.ratchet', 64);
        return { rk: o.slice(0, 32), ck: o.slice(32) };
    }
    async function kdfCk(ck) {
        return { mk: await SG.hmac(ck, new Uint8Array([1])), ck: await SG.hmac(ck, new Uint8Array([2])) };
    }
    function headerBytes(h) { return SG.cat(h.dh, SG.u32(h.pn), SG.u32(h.n)); }
    async function seal(mk, pt, ad) {
        var o = await SG.hkdf(mk, Z32, INFO + '.message', 44);
        return SG.seal(o.slice(0, 32), o.slice(32), pt, ad);
    }
    async function open(mk, ct, ad) {
        var o = await SG.hkdf(mk, Z32, INFO + '.message', 44);
        return SG.open(o.slice(0, 32), o.slice(32), ct, ad);
    }
    SG.openWith = open;
    SG.headerBytes = headerBytes;
    SG.kdfRk = kdfRk;
    SG.kdfCk = kdfCk;

    function Ratchet() { this.DHs = null; this.DHr = null; this.RK = null; this.CKs = null; this.CKr = null; this.Ns = 0; this.Nr = 0; this.PN = 0; this.skipped = {}; this.AD = null; }
    SG.Ratchet = Ratchet;
    Ratchet.prototype.copy = function () {
        var r = new Ratchet();
        for (var k in this) if (Object.prototype.hasOwnProperty.call(this, k)) r[k] = this[k];
        r.skipped = Object.assign({}, this.skipped);
        return r;
    };
    Ratchet.prototype.restore = function (r) { for (var k in r) if (Object.prototype.hasOwnProperty.call(r, k)) this[k] = r[k]; };
    Ratchet.prototype.canSend = function () { return !!this.CKs; };

    /* Alice starts with a fresh ratchet key against Bob's signed prekey; Bob starts with that prekey */
    Ratchet.prototype.initAlice = async function (sk, ad, bobSpk) {
        this.AD = ad;
        this.DHs = await SG.genDH();
        this.DHr = bobSpk;
        var o = await kdfRk(sk, await SG.dh(this.DHs, this.DHr));
        this.RK = o.rk; this.CKs = o.ck;
    };
    Ratchet.prototype.initBob = function (sk, ad, spkPair) { this.AD = ad; this.DHs = spkPair; this.RK = sk; };

    /* -> {h: header, ct, mk}; the message key is returned only to be shown, the ratchet keeps nothing of it */
    Ratchet.prototype.encrypt = async function (text) {
        var o = await kdfCk(this.CKs);
        this.CKs = o.ck;
        var h = { dh: this.DHs.pub, pn: this.PN, n: this.Ns };
        this.Ns++;
        var ct = await seal(o.mk, SG.utf8(text), SG.cat(this.AD, headerBytes(h)));
        return { h: h, ct: ct, mk: o.mk };
    };

    /* -> {text, mk, step: true when this message turned the DH ratchet}; throws (and changes nothing) if it fails */
    Ratchet.prototype.decrypt = async function (h, ct) {
        var before = this.copy();
        try { return await this.decrypt1(h, ct); } catch (e) { this.restore(before); throw e; }
    };
    Ratchet.prototype.decrypt1 = async function (h, ct) {
        var ad = SG.cat(this.AD, headerBytes(h)), id = SG.hex(h.dh) + ':' + h.n, step = false;
        if (this.skipped[id]) {
            var mk0 = this.skipped[id];
            var pt0 = await open(mk0, ct, ad);
            delete this.skipped[id];
            return { text: SG.text(pt0), mk: mk0, step: false };
        }
        if (!this.DHr || !SG.same(h.dh, this.DHr)) {
            await this.skip(h.pn);
            this.PN = this.Ns; this.Ns = 0; this.Nr = 0;
            this.DHr = h.dh;
            var a = await kdfRk(this.RK, await SG.dh(this.DHs, this.DHr));
            this.RK = a.rk; this.CKr = a.ck;
            this.DHs = await SG.genDH();
            var b = await kdfRk(this.RK, await SG.dh(this.DHs, this.DHr));
            this.RK = b.rk; this.CKs = b.ck;
            step = true;
        }
        await this.skip(h.n);
        var o = await kdfCk(this.CKr);
        this.CKr = o.ck; this.Nr++;
        var pt = await open(o.mk, ct, ad);
        return { text: SG.text(pt), mk: o.mk, step: step };
    };
    Ratchet.prototype.skip = async function (until) {
        if (!this.CKr) return;
        if (this.Nr + SG.MAX_SKIP < until) throw new Error('too many skipped');
        while (this.Nr < until) {
            var o = await kdfCk(this.CKr);
            this.CKr = o.ck;
            this.skipped[SG.hex(this.DHr) + ':' + this.Nr] = o.mk;
            this.Nr++;
        }
    };
    /* what the page shows of a ratchet (and what Eve takes) */
    Ratchet.prototype.view = function () {
        return { dh: this.DHs && this.DHs.pub, rk: this.RK, cks: this.CKs, ckr: this.CKr, ns: this.Ns, nr: this.Nr };
    };

    /* the wire format of a message (also what the relay forwards) */
    SG.pack = function (m) { return { t: 'msg', dh: SG.b64u(m.h.dh), pn: m.h.pn, n: m.h.n, c: SG.b64u(m.ct) }; };
    SG.unpack = function (o) {
        if (!o || typeof o.dh !== 'string' || typeof o.c !== 'string' || !(o.pn >= 0) || !(o.n >= 0)) throw new Error('bad message');
        return { h: { dh: SG.unb64u(o.dh), pn: o.pn | 0, n: o.n | 0 }, ct: SG.unb64u(o.c) };
    };

    /* ---------- Eve ----------
       Eve reads every message on the wire. When she steals one side's state she has what that side's ratchet holds
       at that moment: the root key, the current sending and receiving chain keys, its current ratchet private key and
       any skipped message keys; nothing older, because the ratchet has already deleted it. She then follows the
       conversation like a third copy of the ratchet: a chain she knows she can run forward; a new ratchet key on the
       wire she can follow only if she holds the private key of one of the two public keys in that DH. */
    function Eve() { this.who = ''; this.rk = null; this.chains = {}; this.privs = {}; this.last = {}; this.skipped = {}; this.ad = null; }
    SG.Eve = Eve;
    /* side: 'A' or 'B'; r: that side's Ratchet */
    Eve.prototype.steal = function (side, r) {
        var other = side === 'A' ? 'B' : 'A';
        this.who = side; this.ad = r.AD; this.rk = r.RK;
        this.chains = {}; this.privs = {}; this.last = {};
        this.skipped = Object.assign({}, r.skipped);
        if (r.CKs) this.chains[SG.hex(r.DHs.pub)] = { ck: r.CKs, n: r.Ns };
        if (r.CKr && r.DHr) this.chains[SG.hex(r.DHr)] = { ck: r.CKr, n: r.Nr };
        this.privs[SG.hex(r.DHs.pub)] = r.DHs;
        this.last[side] = r.DHs.pub;
        this.last[other] = r.DHr;
        return { rk: r.RK, cks: r.CKs, ckr: r.CKr, dh: r.DHs.pub };
    };
    /* a message sent before the theft: only a skipped key she took could open it (in this demo there are none) */
    Eve.prototype.tryOld = async function (m) {
        var mk = this.skipped[SG.hex(m.h.dh) + ':' + m.h.n];
        if (!mk) return null;
        try { return SG.text(await open(mk, m.ct, SG.cat(this.ad, headerBytes(m.h)))); } catch (e) { return null; }
    };
    /* a message sent after the theft, by side "from"; -> the text, or null */
    Eve.prototype.follow = async function (from, m) {
        if (!this.who) return null;
        var key = SG.hex(m.h.dh), ad = SG.cat(this.ad, headerBytes(m.h)), mk = this.skipped[key + ':' + m.h.n];
        if (mk) { delete this.skipped[key + ':' + m.h.n]; return this.read(mk, m.ct, ad); }
        var ch = this.chains[key];
        if (!ch) {
            var other = from === 'A' ? 'B' : 'A', p = this.last[other], mine = p && this.privs[SG.hex(p)];
            this.last[from] = m.h.dh;
            if (!this.rk || !mine) { this.rk = null; return null; }
            var o = await kdfRk(this.rk, await SG.dh(mine, m.h.dh));
            this.rk = o.rk;
            ch = this.chains[key] = { ck: o.ck, n: 0 };
        }
        if (m.h.n < ch.n || m.h.n > ch.n + SG.MAX_SKIP) return null;
        while (ch.n <= m.h.n) {
            var k = await kdfCk(ch.ck);
            ch.ck = k.ck;
            if (ch.n === m.h.n) mk = k.mk; else this.skipped[key + ':' + ch.n] = k.mk;
            ch.n++;
        }
        return this.read(mk, m.ct, ad);
    };
    Eve.prototype.read = async function (mk, ct, ad) {
        try { return SG.text(await open(mk, ct, ad)); } catch (e) { return null; }
    };
})(window.SG);
