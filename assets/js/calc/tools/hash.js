/* Toolbox: SHA-256, SHA-1 and MD5 in plain JavaScript, with the padding, the message schedule and every round of the
   first block in a table (the other blocks summarized). The SHA-256 constants are computed exactly with integer roots. */
(function () {
    'use strict';
    var nt = Calc.lib.nt;
    function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
    function rotl(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }
    function add() { var s = 0; for (var i = 0; i < arguments.length; i++) s = (s + arguments[i]) >>> 0; return s; }
    function h8(x) { var s = (x >>> 0).toString(16); while (s.length < 8) s = '0' + s; return s; }

    /* the first 64 primes; SHA-256's constants are the first 32 bits of the fractional parts of their square roots
       (initial hash, first 8 primes) and cube roots (round constants): floor(2^32 * p^(1/k)) mod 2^32, exactly */
    var PR = [], c = 2;
    while (PR.length < 64) { if (nt.isPrime(BigInt(c))) PR.push(c); c++; }
    function frac32(p, k) { return Number(nt.iroot(BigInt(p) << BigInt(32 * k), BigInt(k)) & 0xFFFFFFFFn); }
    var K256 = PR.map(function (p) { return frac32(p, 3); });
    var H256 = PR.slice(0, 8).map(function (p) { return frac32(p, 2); });
    var MD5K = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
        0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
        0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
        0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391];
    var MD5S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];

    /* padding: 0x80, zeros up to 56 mod 64, then the length in bits in 8 bytes (big-endian for SHA, little for MD5) */
    function pad(bytes, little) {
        var out = bytes.slice(), bits = bytes.length * 8;
        out.push(0x80);
        while (out.length % 64 !== 56) out.push(0);
        var len = [], hi = Math.floor(bits / 4294967296), lo = bits >>> 0;
        for (var i = 3; i >= 0; i--) len.push((hi >>> (8 * i)) & 255);
        for (var j = 3; j >= 0; j--) len.push((lo >>> (8 * j)) & 255);
        if (little) len.reverse();
        return out.concat(len);
    }
    function words(block, little) {
        var w = [];
        for (var i = 0; i < 16; i++) {
            var b = block.slice(4 * i, 4 * i + 4);
            if (little) b.reverse();
            w.push(((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0);
        }
        return w;
    }

    /* one compression; trace (for the first block) gets the schedule and the rounds */
    var ALG = {
        sha256: {
            name: 'SHA-256', bits: 256, little: false, H0: H256, rounds: 64,
            block: function (H, M, tr) {
                var W = M.slice(), t;
                for (t = 16; t < 64; t++) {
                    var s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3), s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
                    W[t] = add(s1 >>> 0, W[t - 7], s0 >>> 0, W[t - 16]);
                    if (tr) tr.sched.push([t, h8(s1), h8(W[t - 7]), h8(s0), h8(W[t - 16]), { v: h8(W[t]), hl: true }]);
                }
                var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
                for (t = 0; t < 64; t++) {
                    var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0, ch = ((e & f) ^ (~e & g)) >>> 0;
                    var T1 = add(h, S1, ch, K256[t], W[t]);
                    var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0, maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
                    var T2 = add(S0, maj);
                    h = g; g = f; f = e; e = add(d, T1); d = c; c = b; b = a; a = add(T1, T2);
                    if (tr) tr.rounds.push([t, h8(W[t]), h8(K256[t]), h8(T1), h8(T2), { v: h8(a), hl: true }, h8(b), h8(c), h8(d), { v: h8(e), hl: true }, h8(f), h8(g), h8(h)]);
                }
                return [a, b, c, d, e, f, g, h];
            }
        },
        sha1: {
            name: 'SHA-1', bits: 160, little: false, H0: [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0], rounds: 80,
            block: function (H, M, tr) {
                var W = M.slice(), t;
                for (t = 16; t < 80; t++) {
                    var x = (W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16]) >>> 0;
                    W[t] = rotl(x, 1);
                    if (tr) tr.sched.push([t, h8(W[t - 3]), h8(W[t - 8]), h8(W[t - 14]), h8(W[t - 16]), h8(x), { v: h8(W[t]), hl: true }]);
                }
                var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4];
                for (t = 0; t < 80; t++) {
                    var f, k, st = Math.floor(t / 20);
                    if (st === 0) { f = (b & c) | (~b & d); k = 0x5A827999; }
                    else if (st === 1) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
                    else if (st === 2) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
                    else { f = b ^ c ^ d; k = 0xCA62C1D6; }
                    var tmp = add(rotl(a, 5), f >>> 0, e, k, W[t]);
                    e = d; d = c; c = rotl(b, 30); b = a; a = tmp;
                    if (tr) tr.rounds.push([t, ['Ch', 'Parity', 'Maj', 'Parity'][st], h8(W[t]), h8(k), { v: h8(a), hl: true }, h8(b), h8(c), h8(d), h8(e)]);
                }
                return [a, b, c, d, e];
            }
        },
        md5: {
            name: 'MD5', bits: 128, little: true, H0: [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476], rounds: 64,
            block: function (H, M, tr) {
                var A = H[0], B = H[1], C = H[2], D = H[3];
                for (var i = 0; i < 64; i++) {
                    var F, g, r = i >> 4;
                    if (r === 0) { F = (B & C) | (~B & D); g = i; }
                    else if (r === 1) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
                    else if (r === 2) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
                    else { F = C ^ (B | ~D); g = (7 * i) % 16; }
                    var s = MD5S[4 * r + (i % 4)];
                    var sum = add(F >>> 0, A, MD5K[i], M[g]);
                    A = D; D = C; C = B; B = add(B, rotl(sum, s));
                    if (tr) tr.rounds.push([i, 'FGHI'.charAt(r), g, s, h8(MD5K[i]), h8(M[g]), h8(A), { v: h8(B), hl: true }, h8(C), h8(D)]);
                }
                return [A, B, C, D];
            }
        }
    };
    /* the whole hash: {hex, H after each block, the padded message, trace of block 1} */
    function hash(alg, bytes, trace) {
        var P = ALG[alg], msg = pad(bytes, P.little), H = P.H0.slice(), after = [], tr = null, n = msg.length / 64;
        for (var k = 0; k < n; k++) {
            var M = words(msg.slice(64 * k, 64 * k + 64), P.little);
            var t = trace && k === 0 ? { M: M, sched: [], rounds: [], before: H.slice() } : null;
            var out = P.block(H, M, t);
            if (t) { t.out = out.slice(); tr = t; }
            H = H.map(function (x, i) { return add(x, out[i]); });
            after.push(H.slice());
        }
        var hex = P.little ? H.map(function (x) { return h8(x).match(/../g).reverse().join(''); }).join('') : H.map(h8).join('');
        return { hex: hex, after: after, padded: msg, trace: tr };
    }

    Calc.tool({
        id: 'hash',
        live: true,
        lib: { hash: function (alg, bytes) { return hash(alg, bytes, false).hex; }, K256: K256, H256: H256 },
        inputs: [
            { id: 'input', type: 'textarea', label: 'Message', rows: 3, optional: true, maxLength: 100000, placeholder: 'abc' },
            { id: 'form', type: 'select', label: 'Message is', value: 'text', options: [['text', 'Text (UTF-8)'], ['hex', 'Hex digits']] },
            { id: 'alg', type: 'select', label: 'Hash function', value: 'sha256', options: [['sha256', 'SHA-256'], ['sha1', 'SHA-1 (broken)'], ['md5', 'MD5 (broken)']] }
        ],
        examples: [{ input: 'abc', form: 'text', alg: 'sha256' }, { input: '', form: 'text', alg: 'sha256' }, { input: 'abc', form: 'text', alg: 'sha1' }, { input: 'The quick brown fox jumps over the lazy dog', form: 'text', alg: 'md5' },
            { input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', form: 'text', alg: 'sha256' }],
        run: function (v, S) {
            var E = Calc.lib.enc, P = ALG[v.alg];
            var bytes = E.bytesStep(S, v.input, v.form, 'input');
            var r = hash(v.alg, bytes, true), n = r.padded.length / 64, tr = r.trace, nw = P.H0.length;
            S.result('$\\mathtt{' + r.hex.match(/.{1,8}/g).join('\\,') + '}$', { copy: r.hex, label: P.name + ' (' + P.bits + ' bits)' });
            if (v.alg !== 'sha256') S.note(v.alg === 'md5' ? 'MD5 is broken: collisions (two messages with the same hash) take seconds to find. Fine as a checksum against accidents, never for security.' : 'SHA-1 is broken: a collision was published in 2017 (SHAttered). Use SHA-256 or SHA-3 for anything that matters.');

            var L = bytes.length, z = r.padded.length - L - 9;
            var s1 = S.step('Pad the message to a multiple of 512 bits');
            s1.p('The message has ' + L + ' byte' + (L === 1 ? '' : 's') + ' = ' + 8 * L + ' bits. Append one 1 bit (the byte 80), then ' + z + ' zero byte' + (z === 1 ? '' : 's') + ' until the length is 448 bits modulo 512, and finally the original length in bits as a 64-bit number' + (P.little ? ', least significant byte first (MD5 is little-endian).' : ', most significant byte first.'));
            s1.p('Result: ' + r.padded.length + ' bytes, ' + n + ' block' + (n === 1 ? '' : 's') + ' of 64 bytes.' + (n > 1 ? ' The last block:' : ''));
            var last = r.padded.slice(64 * (n - 1));
            s1.table(['Bytes', 'Hex', ''], [0, 1, 2, 3].map(function (q) {
                var off = 64 * (n - 1) + 16 * q, seg = last.slice(16 * q, 16 * q + 16);
                var note = off + 16 > L && off <= L ? 'the 80 marker is byte ' + (L + 1) : '';
                if (q === 3) note = (note ? note + '; ' : '') + 'last 8 bytes: the length';
                return [(off + 1) + ' to ' + (off + 16), E.hex(seg).toLowerCase(), note];
            }), { mono: true });

            var s2 = S.step('The initial hash value');
            s2.p(v.alg === 'sha256' ? 'Eight 32-bit words: the first 32 bits of the fractional parts of the square roots of the first 8 primes, $H_i = \\lfloor 2^{32} \\sqrt{p_i} \\rfloor \\bmod 2^{32}$ (computed here with exact integer square roots). For example $\\sqrt 2 = \\mathtt{1.6a09e667}\\ldots_{16}$.'
                : v.alg === 'sha1' ? 'Five fixed 32-bit words (the counting patterns 01 23 45 67, 89 AB CD EF, ... in a fixed order).' : 'Four fixed 32-bit words, the bytes 01 23 45 67 89 AB CD EF FE DC BA 98 76 54 32 10 read little-endian.');
            s2.table(P.H0.map(function (x, i) { return '$H_' + i + '$'; }), [P.H0.map(h8)], { mono: true });

            var s3 = S.step('Block 1: the 16 message words');
            s3.p('The 64 bytes are read as 16 words of 32 bits, ' + (P.little ? 'little-endian (the last byte of each group of 4 is the most significant).' : 'big-endian.'));
            s3.table(['$t$', '0', '1', '2', '3'], [0, 1, 2, 3].map(function (q) { return [4 * q + ' to ' + (4 * q + 3)].concat(tr.M.slice(4 * q, 4 * q + 4).map(h8)); }), { mono: true });
            if (v.alg === 'sha256') {
                var s4 = S.step('The message schedule $W_0, \\ldots, W_{63}$');
                s4.p('$W_0$ to $W_{15}$ are the message words; the others mix earlier words with rotations ($\\mathrm{ROTR}$) and shifts ($\\mathrm{SHR}$), all additions modulo $2^{32}$:');
                s4.lines(['W_t &= \\sigma_1(W_{t-2}) + W_{t-7} + \\sigma_0(W_{t-15}) + W_{t-16}', '\\sigma_0(x) &= \\mathrm{ROTR}^{7}(x) \\oplus \\mathrm{ROTR}^{18}(x) \\oplus \\mathrm{SHR}^{3}(x)', '\\sigma_1(x) &= \\mathrm{ROTR}^{17}(x) \\oplus \\mathrm{ROTR}^{19}(x) \\oplus \\mathrm{SHR}^{10}(x)']);
                s4.table(['$t$', '$\\sigma_1(W_{t-2})$', '$W_{t-7}$', '$\\sigma_0(W_{t-15})$', '$W_{t-16}$', '$W_t$'], tr.sched, { mono: true, max: 60 });
                var s5 = S.step('64 rounds of compression');
                s5.p('Eight working variables $a, \\ldots, h$ start as the hash value. Each round $t$ computes two temporary words and shifts the variables down by one; only $a$ and $e$ get new values:');
                s5.lines(['T_1 &= h + \\Sigma_1(e) + \\mathrm{Ch}(e, f, g) + K_t + W_t', 'T_2 &= \\Sigma_0(a) + \\mathrm{Maj}(a, b, c)', '(a, b, c, d, e, f, g, h) &\\leftarrow (T_1 + T_2,\\ a,\\ b,\\ c,\\ d + T_1,\\ e,\\ f,\\ g)']);
                s5.p('Here $\\mathrm{Ch}(e, f, g) = (e \\wedge f) \\oplus (\\lnot e \\wedge g)$ chooses bits of $f$ or $g$ by $e$, $\\mathrm{Maj}$ takes the majority of each bit position, $\\Sigma_0(a) = \\mathrm{ROTR}^{2} \\oplus \\mathrm{ROTR}^{13} \\oplus \\mathrm{ROTR}^{22}$ and $\\Sigma_1(e) = \\mathrm{ROTR}^{6} \\oplus \\mathrm{ROTR}^{11} \\oplus \\mathrm{ROTR}^{25}$. $K_t$ are the first 32 bits of the fractional parts of the cube roots of the first 64 primes.');
                s5.table(['$t$', '$W_t$', '$K_t$', '$T_1$', '$T_2$', '$a$', '$b$', '$c$', '$d$', '$e$', '$f$', '$g$', '$h$'], tr.rounds, { mono: true, max: 70 });
            } else if (v.alg === 'sha1') {
                var t4 = S.step('The message schedule $W_0, \\ldots, W_{79}$');
                t4.p('$W_0$ to $W_{15}$ are the message words, then $W_t = \\mathrm{ROTL}^{1}(W_{t-3} \\oplus W_{t-8} \\oplus W_{t-14} \\oplus W_{t-16})$. (The rotation by 1 is the only difference from SHA-0, which turned out weak.)');
                t4.table(['$t$', '$W_{t-3}$', '$W_{t-8}$', '$W_{t-14}$', '$W_{t-16}$', 'XOR', '$W_t$ (rotated)'], tr.sched, { mono: true, max: 70 });
                var t5 = S.step('80 rounds of compression');
                t5.p('Five working variables $a, \\ldots, e$; in four stages of 20 rounds the function $f$ is $\\mathrm{Ch}(b, c, d)$, $b \\oplus c \\oplus d$ (parity), $\\mathrm{Maj}(b, c, d)$ and parity again, each stage with its constant $K$ ($\\lfloor 2^{30} \\sqrt{2} \\rfloor$, $\\sqrt 3$, $\\sqrt 5$, $\\sqrt{10}$):');
                t5.lines(['T &= \\mathrm{ROTL}^{5}(a) + f(b, c, d) + e + K + W_t', '(a, b, c, d, e) &\\leftarrow (T,\\ a,\\ \\mathrm{ROTL}^{30}(b),\\ c,\\ d)']);
                t5.table(['$t$', '$f$', '$W_t$', '$K$', '$a$', '$b$', '$c$', '$d$', '$e$'], tr.rounds, { mono: true, max: 90 });
            } else {
                var m5 = S.step('64 rounds of compression');
                m5.p('Four variables $A, B, C, D$. There is no schedule: in round $i$ the message word $M_g$ is used, with $g$ running through the 16 words in a different order in each of the four stages. The stages use the functions');
                m5.lines(['F(B, C, D) &= (B \\wedge C) \\vee (\\lnot B \\wedge D) & g &= i', 'G(B, C, D) &= (D \\wedge B) \\vee (\\lnot D \\wedge C) & g &= (5i + 1) \\bmod 16', 'H(B, C, D) &= B \\oplus C \\oplus D & g &= (3i + 5) \\bmod 16', 'I(B, C, D) &= C \\oplus (B \\vee \\lnot D) & g &= 7i \\bmod 16']);
                m5.p('and each round does $(A, B, C, D) \\leftarrow (D,\\ B + \\mathrm{ROTL}^{s}(A + f(B, C, D) + K_i + M_g),\\ B,\\ C)$, with $K_i = \\lfloor 2^{32} |\\sin(i + 1)| \\rfloor$ and the rotation $s$ from a fixed table.');
                m5.table(['$i$', 'Stage', '$g$', '$s$', '$K_i$', '$M_g$', '$A$', '$B$', '$C$', '$D$'], tr.rounds, { mono: true, max: 70 });
            }
            var s6 = S.step('Add the result to the hash value');
            s6.p('Each word of the hash value gets the final working variable added, modulo $2^{32}$ (so the compression cannot simply be run backwards):');
            s6.table(['', 'Before', '+ working variable', '= new value'], P.H0.map(function (x, i) { return ['$H_' + i + '$', h8(tr.before[i]), h8(tr.out[i]), { v: h8(r.after[0][i]), hl: true }]; }), { mono: true });
            if (n > 1) {
                var s7 = S.step('The other ' + (n - 1) + ' block' + (n === 2 ? '' : 's'));
                s7.p('Each block is compressed the same way, starting from the hash value the previous block left (the Merkle-Damgård construction). The hash value after each block:');
                s7.table(['Block', 'Hash value after it'], r.after.map(function (H, k) { return [k + 1, k === n - 1 ? { v: H.map(h8).join(' '), hl: true } : H.map(h8).join(' ')]; }), { mono: true });
            }
            var s8 = S.step('The digest');
            s8.p(P.little ? 'The ' + nw + ' words are written out little-endian (each word\'s bytes in reverse order):' : 'The ' + nw + ' words written one after the other, in hex:');
            s8.pre(r.hex);
        }
    });
})();
