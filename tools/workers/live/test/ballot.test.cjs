// The secret ballot cryptography (assets/js/live/15-ballot.js), checked against node's own P-256 and SHA-256:
//   node test/ballot.test.cjs          (node 12 or later; BENCH=1 also prints timings)
'use strict';
const crypto = require('crypto');
const path = require('path');
if (!global.crypto) global.crypto = { getRandomValues: function (b) { return crypto.randomFillSync(b); } };   // node 12 has none; newer node has one that cannot be replaced
const B = require(path.join(__dirname, '../../../../assets/js/live/15-ballot.js'));
const _ = B._;
let fails = 0, checks = 0;
function ok(c, what) { checks++; if (!c) { fails++; console.log('FAIL', what); } }

/* SHA-256 */
for (const len of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
    const m = crypto.randomBytes(len);
    ok(Buffer.from(_.sha256(new Uint8Array(m))).toString('hex') === crypto.createHash('sha256').update(m).digest('hex'), 'sha256 len ' + len);
}
/* k G against node's ECDH (its public key is k G, uncompressed) */
for (let i = 0; i < 20; i++) {
    const e = crypto.createECDH('prime256v1'); e.generateKeys();
    const k = BigInt('0x' + e.getPrivateKey('hex'));
    const pub = e.getPublicKey(null, 'compressed');
    const mine = Buffer.from(_.encP(_.mulG(k)).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    ok(mine.equals(pub), 'kG ' + i);
    ok(_.encP(_.mul(_.G, k)) === _.encP(_.mulG(k)), 'mul vs table ' + i);
    /* k P for another point: ECDH shared secret is the x of k P */
    const f = crypto.createECDH('prime256v1'); f.generateKeys();
    const Pt = _.decP(Buffer.from(f.getPublicKey(null, 'compressed')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
    const x = _.affine(_.mul(Pt, k))[0];
    ok(x.toString(16).padStart(64, '0') === e.computeSecret(f.getPublicKey()).toString('hex'), 'kP ' + i);
}
ok(_.decP('A' + 'A'.repeat(43)) === null, 'bad point refused');
ok(_.decS(_.encS(_.N - BigInt(1))) === _.N - BigInt(1), 'scalar round trip');

/* ballots */
const kp = B.keyPair();
for (const k of [2, 3, 5]) {
    const v = B.verifier(kp.pk, k, 'pkc27', 'abc123');
    const sm = B.sums(k), want = new Array(k).fill(0);
    for (let i = 0; i < 7; i++) {
        const c = i % k, b = B.makeBallot(kp.pk, k, c, 'pkc27', 'abc123');
        ok(JSON.stringify(b).length < 1900, 'size ' + JSON.stringify(b).length);
        const cts = v.check(b);
        ok(!!cts, 'valid ballot k=' + k);
        if (cts) { B.addTo(sm, cts); want[c]++; }
    }
    ok(JSON.stringify(B.decrypt(sm, kp.sk)) === JSON.stringify(want), 'tally k=' + k + ' ' + B.decrypt(sm, kp.sk) + ' vs ' + want);
    const b = B.makeBallot(kp.pk, k, 0, 'pkc27', 'abc123');
    ok(!B.verifier(kp.pk, k, 'pkc27', 'other1').check(b), 'other activity refused');
    ok(!B.verifier(kp.pk, k, 'pkc27.test', 'abc123').check(b), 'other session refused');
    ok(!B.verifier(B.keyPair().pk, k, 'pkc27', 'abc123').check(b), 'other key refused');
    /* swap two ciphertexts: proofs no longer fit */
    const sw = JSON.parse(JSON.stringify(b)); const t = sw.c[0]; sw.c[0] = sw.c[1]; sw.c[1] = t;
    ok(!v.check(sw), 'swapped ciphertexts refused');
    /* a tampered scalar */
    const tz = JSON.parse(JSON.stringify(b)); tz.p[0][2] = b.p[1][2];
    ok(!v.check(tz), 'tampered proof refused');
    ok(!v.check({ c: [], p: [], s: [] }), 'empty refused');
}
/* a cheater: +5 for answer 0. Encrypt 5 honestly with a fake proof: the bit proof fails */
(function () {
    const k = 2, Y = _.decP(kp.pk), v = B.verifier(kp.pk, k, 's', 'a');
    const good = B.makeBallot(kp.pk, k, 0, 's', 'a');
    const r = BigInt(12345), five = _.add(_.mul(Y, r), _.mulG(BigInt(5)));
    const bad = JSON.parse(JSON.stringify(good)); bad.c[0] = [_.encP(_.mulG(r)), _.encP(five)];
    ok(!v.check(bad), '+5 ballot refused');
    /* two ones (both answers): each bit proof is fine, the sum proof is not */
    const one0 = B.makeBallot(kp.pk, k, 0, 's', 'a'), one1 = B.makeBallot(kp.pk, k, 1, 's', 'a');
    const both = { c: [one0.c[0], one1.c[1]], p: [one0.p[0], one1.p[1]], s: one0.s };
    ok(!v.check(both), 'two ones refused');
})();

if (process.env.BENCH) {
    let t = Date.now(); const bs = [];
    for (let i = 0; i < 10; i++) bs.push(B.makeBallot(kp.pk, 5, i % 5, 's', 'a'));
    console.log('make, 5 answers:', (Date.now() - t) / 10, 'ms');
    const v = B.verifier(kp.pk, 5, 's', 'a');
    t = Date.now(); bs.forEach(function (b) { v.check(b); });
    console.log('check, 5 answers:', (Date.now() - t) / 10, 'ms');
    const sm = B.sums(5); bs.forEach(function (b) { B.addTo(sm, v.check(b)); });
    t = Date.now(); B.decrypt(sm, kp.sk); console.log('decrypt:', Date.now() - t, 'ms');
}
console.log(checks + ' checks, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
