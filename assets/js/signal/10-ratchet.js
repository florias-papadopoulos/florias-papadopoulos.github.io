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
    /* signer: one of SG.sigs (default the best this browser has); its name goes into the bundle */
    SG.makeBob = async function (signer) {
        signer = signer || SG.sig;
        var b = { ik: await SG.genDH(), sk: await signer.gen(), spk: await SG.genDH(), opk: await SG.genDH(), alg: signer.name };
        b.spkSig = await signer.sign(b.sk, b.spk.pub);
        return b;
    };
    SG.bundleOf = function (b) { return { ik: b.ik.pub, sk: b.sk.pub, spk: b.spk.pub, sig: b.spkSig, opk: b.opk.pub, alg: b.alg }; };
    async function x3dhKey(dhs) { return SG.hkdf(SG.cat(FF, dhs[0], dhs[1], dhs[2], dhs[3]), Z32, INFO + '.x3dh', 32); }

    /* Alice: checks the signature on the prekey, makes an ephemeral key, four DH, one shared key SK */
    SG.x3dhAlice = async function (ikA, bundle) {
        var s = SG.sigs[bundle.alg];
        if (!s) throw new Error('alg');
        if (!(await s.verify(bundle.sk, bundle.sig, bundle.spk))) throw new Error('signature');
        var ek = await SG.genDH();
        var dhs = [await SG.dh(ikA, bundle.spk), await SG.dh(ek, bundle.ik), await SG.dh(ek, bundle.spk), await SG.dh(ek, bundle.opk)];
        return { sk: await x3dhKey(dhs), ad: SG.cat(ikA.pub, bundle.ik), ek: ek, dhs: dhs };
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

    /* Every step is also written to this.tr, a list of events the page draws (the gears, 22-gears.js):
         {k: 'init', rk}                       the first root key (from X3DH)
         {k: 'gen', pub}                       a new DH key pair (the old private key is deleted)
         {k: 'their', pub}                     the other side's new DH public key
         {k: 'root', chain, dh, mine, theirs, rkIn, rk, ck, pn}   the DH ratchet: one KDF step of the root chain
                                               starts a new sending or receiving chain (pn: length of the one before)
         {k: 'ck', chain, ckIn, ck, mk, n, id} the symmetric ratchet: one KDF step of a chain, message key number n
         {k: 'skip', ...as ck}                 a step for a message that has not arrived: its key is kept
         {k: 'useSkip', id, mk}                a late message opens with a kept key
       id is "<chain's DH public key in hex>:<n>", the same on both sides. */
    Ratchet.prototype.t = function (ev) { if (this.tr) this.tr.push(ev); };
    async function rootStep(r, chain, pn) {
        var dh = await SG.dh(r.DHs, r.DHr), rkIn = r.RK, o = await kdfRk(r.RK, dh);
        r.RK = o.rk;
        if (chain === 'send') r.CKs = o.ck; else r.CKr = o.ck;
        r.t({ k: 'root', chain: chain, dh: dh, mine: r.DHs.pub, theirs: r.DHr, rkIn: rkIn, rk: o.rk, ck: o.ck, pn: pn });
    }

    /* Alice starts with a fresh ratchet key against Bob's signed prekey; Bob starts with that prekey. Both -> trace */
    Ratchet.prototype.initAlice = async function (sk, ad, bobSpk) {
        this.tr = [];
        this.AD = ad; this.RK = sk;
        this.t({ k: 'init', rk: sk });
        this.DHs = await SG.genDH();
        this.t({ k: 'gen', pub: this.DHs.pub });
        this.DHr = bobSpk;
        this.t({ k: 'their', pub: bobSpk });
        await rootStep(this, 'send', 0);
        return this.tr;
    };
    Ratchet.prototype.initBob = function (sk, ad, spkPair) {
        this.tr = [];
        this.AD = ad; this.DHs = spkPair; this.RK = sk;
        this.t({ k: 'init', rk: sk });
        this.t({ k: 'gen', pub: spkPair.pub, prekey: true });
        return this.tr;
    };

    /* -> {h: header, ct, mk, trace}; the message key is returned only to be shown, the ratchet keeps nothing of it */
    Ratchet.prototype.encrypt = async function (text) {
        this.tr = [];
        var ckIn = this.CKs, o = await kdfCk(this.CKs);
        this.CKs = o.ck;
        var h = { dh: this.DHs.pub, pn: this.PN, n: this.Ns };
        this.t({ k: 'ck', chain: 'send', ckIn: ckIn, ck: o.ck, mk: o.mk, n: this.Ns, id: SG.hex(h.dh) + ':' + this.Ns });
        this.Ns++;
        var ct = await seal(o.mk, SG.utf8(text), SG.cat(this.AD, headerBytes(h)));
        return { h: h, ct: ct, mk: o.mk, trace: this.tr };
    };

    /* -> {text, mk, step: true when this message turned the DH ratchet, trace}; throws (and changes nothing) if it fails */
    Ratchet.prototype.decrypt = async function (h, ct) {
        var before = this.copy();
        this.tr = [];
        try { var r = await this.decrypt1(h, ct); r.trace = this.tr; return r; } catch (e) { this.restore(before); throw e; }
    };
    Ratchet.prototype.decrypt1 = async function (h, ct) {
        var ad = SG.cat(this.AD, headerBytes(h)), id = SG.hex(h.dh) + ':' + h.n, step = false;
        if (this.skipped[id]) {
            var mk0 = this.skipped[id];
            var pt0 = await open(mk0, ct, ad);
            delete this.skipped[id];
            this.t({ k: 'useSkip', id: id, mk: mk0 });
            return { text: SG.text(pt0), mk: mk0, step: false, id: id };
        }
        if (!this.DHr || !SG.same(h.dh, this.DHr)) {
            await this.skip(h.pn);
            this.PN = this.Ns; this.Ns = 0; this.Nr = 0;
            this.DHr = h.dh;
            this.t({ k: 'their', pub: h.dh });
            await rootStep(this, 'recv', h.pn);
            this.DHs = await SG.genDH();
            this.t({ k: 'gen', pub: this.DHs.pub });
            await rootStep(this, 'send', this.PN);
            step = true;
        }
        await this.skip(h.n);
        var ckIn = this.CKr, o = await kdfCk(this.CKr);
        this.CKr = o.ck;
        this.t({ k: 'ck', chain: 'recv', ckIn: ckIn, ck: o.ck, mk: o.mk, n: this.Nr, id: id });
        this.Nr++;
        var pt = await open(o.mk, ct, ad);
        return { text: SG.text(pt), mk: o.mk, step: step, id: id };
    };
    Ratchet.prototype.skip = async function (until) {
        if (!this.CKr) return;
        if (this.Nr + SG.MAX_SKIP < until) throw new Error('too many skipped');
        while (this.Nr < until) {
            var ckIn = this.CKr, o = await kdfCk(this.CKr), id = SG.hex(this.DHr) + ':' + this.Nr;
            this.CKr = o.ck;
            this.skipped[id] = o.mk;
            this.t({ k: 'skip', chain: 'recv', ckIn: ckIn, ck: o.ck, mk: o.mk, n: this.Nr, id: id });
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
       wire she can follow only if she holds the private key of one of the two public keys in that DH. Her steps are
       events for her red copy of the gears ("send" and "recv" are the robbed side's chains); 'jam' is the DH she
       cannot compute. this.known holds every key she has, in hex, so the page can outline them. */
    function Eve() { this.who = ''; this.rk = null; this.chains = {}; this.privs = {}; this.last = {}; this.skipped = {}; this.ad = null; this.known = {}; this.jammed = false; }
    SG.Eve = Eve;
    Eve.prototype.knows = function (b) { if (b) this.known[SG.hex(b)] = true; };
    /* side: 'A' or 'B'; r: that side's Ratchet. -> trace for her copy of the gears */
    Eve.prototype.steal = function (side, r) {
        var other = side === 'A' ? 'B' : 'A';
        this.who = side; this.ad = r.AD; this.rk = r.RK; this.jammed = false;
        this.chains = {}; this.privs = {}; this.last = {}; this.known = {};
        this.skipped = Object.assign({}, r.skipped);
        if (r.CKs) this.chains[SG.hex(r.DHs.pub)] = { ck: r.CKs, n: r.Ns };
        if (r.CKr && r.DHr) this.chains[SG.hex(r.DHr)] = { ck: r.CKr, n: r.Nr };
        this.privs[SG.hex(r.DHs.pub)] = r.DHs;
        this.last[side] = r.DHs.pub;
        this.last[other] = r.DHr;
        [r.RK, r.CKs, r.CKr, r.DHs.pub].forEach(this.knows, this);
        for (var id in this.skipped) this.knows(this.skipped[id]);
        return [{ k: 'stolen', rk: r.RK, pub: r.DHs.pub, cks: r.CKs, ckr: r.CKr, ns: r.Ns, nr: r.Nr }];
    };
    /* a message sent before the theft: only a skipped key she took could open it */
    Eve.prototype.tryOld = async function (m) {
        var mk = this.skipped[SG.hex(m.h.dh) + ':' + m.h.n];
        if (!mk) return null;
        try { return SG.text(await open(mk, m.ct, SG.cat(this.ad, headerBytes(m.h)))); } catch (e) { return null; }
    };
    /* a message sent after the theft, by side "from"; -> {text (or null), trace} */
    Eve.prototype.follow = async function (from, m) {
        var tr = [];
        if (!this.who) return { text: null, trace: tr };
        var chain = from === this.who ? 'send' : 'recv';
        var key = SG.hex(m.h.dh), id = key + ':' + m.h.n, ad = SG.cat(this.ad, headerBytes(m.h)), mk = this.skipped[id];
        if (mk) { delete this.skipped[id]; tr.push({ k: 'useSkip', id: id, mk: mk }); return { text: await this.read(mk, m.ct, ad), trace: tr }; }
        var ch = this.chains[key];
        if (!ch) {
            var other = from === 'A' ? 'B' : 'A', p = this.last[other], mine = p && this.privs[SG.hex(p)];
            this.last[from] = m.h.dh;
            if (!this.rk || !mine) {
                if (this.rk) tr.push({ k: 'jam', chain: chain, theirs: m.h.dh });
                this.rk = null; this.jammed = true;
                return { text: null, trace: tr };
            }
            var dh = await SG.dh(mine, m.h.dh), rkIn = this.rk, o = await kdfRk(this.rk, dh);
            this.rk = o.rk;
            [dh, o.rk, o.ck].forEach(this.knows, this);
            tr.push({ k: 'root', chain: chain, dh: dh, mine: mine.pub, theirs: m.h.dh, rkIn: rkIn, rk: o.rk, ck: o.ck, pn: m.h.pn });
            ch = this.chains[key] = { ck: o.ck, n: 0 };
        }
        if (m.h.n < ch.n || m.h.n > ch.n + SG.MAX_SKIP) return { text: null, trace: tr };
        while (ch.n <= m.h.n) {
            var ckIn = ch.ck, k = await kdfCk(ch.ck);
            ch.ck = k.ck;
            this.knows(k.ck); this.knows(k.mk);
            var ev = { k: ch.n === m.h.n ? 'ck' : 'skip', chain: chain, ckIn: ckIn, ck: k.ck, mk: k.mk, n: ch.n, id: key + ':' + ch.n };
            if (ch.n === m.h.n) mk = k.mk; else this.skipped[ev.id] = k.mk;
            tr.push(ev);
            ch.n++;
        }
        return { text: await this.read(mk, m.ct, ad), trace: tr };
    };
    Eve.prototype.read = async function (mk, ct, ad) {
        try { return SG.text(await open(mk, ct, ad)); } catch (e) { return null; }
    };
})(window.SG);
