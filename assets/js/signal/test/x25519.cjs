// The plain JavaScript X25519 of 00-crypto.js (used where WebCrypto has none) against RFC 7748:
//   node assets/js/signal/test/x25519.cjs
// (node 12 or later; WebCrypto's own X25519 is checked in the browser, where the page compares the two.)
const fs = require('fs'), path = require('path'), vm = require('vm'), util = require('util'), assert = require('assert');
const box = { window: {}, TextEncoder: util.TextEncoder, TextDecoder: util.TextDecoder, BigInt: BigInt, Uint8Array: Uint8Array };
box.window.crypto = null;
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../00-crypto.js'), 'utf8'), box);
const SG = box.window.SG, h = SG.unhex, x = SG.x25519;
SG.ready.catch(function () { /* no WebCrypto in this box: expected */ });
let n = 0;
function eq(a, b, what) { assert.strictEqual(SG.hex(a), b, what); n++; }
eq(x(h('a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4'), h('e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c')),
    'c3da55379de9c6908e94ea4df28d084f32eccf03491c71f754b4075577a28552', 'RFC 7748 5.2 first');
eq(x(h('4b66e9d4d1b4673c5ad22691957d6af5c11b6421e0ea01d42ca4169e7918ba0d'), h('e5210f12786811d3f4b7959d0538ae2c31dbe7106fc03c3efc4cd549c715a413')),
    '95cbde9476e8907d7aade45cb4b873f88b595a68799fa152e6f8f7647aac7957', 'RFC 7748 5.2 second');
const nine = new Uint8Array(32); nine[0] = 9;
const a = h('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a'), b = h('5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb');
eq(x(a, nine), '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a', 'Alice public');
eq(x(b, nine), 'de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f', 'Bob public');
eq(x(a, x(b, nine)), '4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742', 'shared');
/* 1000 iterations (RFC 7748 5.2) */
let k = nine.slice(), u = nine.slice();
for (let i = 0; i < 1000; i++) { const r = x(k, u); u = k; k = r; }
eq(k, '684cf59ba83309552800ef566f2f4d3c1c3887c49360e3875f2eb94d99532c51', '1000 iterations');
console.log(n + ' passed, 0 failed');
