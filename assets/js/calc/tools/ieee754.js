/* Toolbox: IEEE 754 binary32 and binary64. A decimal number to sign, biased exponent and mantissa (with exact rounding
   on BigInt, ties to even), the exact stored value and the rounding error; and bits or hex back to the number. */
(function () {
    'use strict';
    /* exact arithmetic for both directions (also used by the tests, as Calc.tools.ieee754.lib) */
    function makeLib() {
        var L = {}, E = Calc.lib.enc, nt = Calc.lib.nt;
        L.parse = function (src) {
            var s = String(src).trim().replace(/\s+/g, '').replace(/−/g, '-');
            var neg = /^-/.test(s), b = s.replace(/^[+-]/, '').toLowerCase();
            if (b === 'nan') return { special: 'nan', neg: neg };
            if (b === 'inf' || b === 'infinity' || b === '∞') return { special: 'inf', neg: neg };
            var m = /^(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/.exec(b);
            if (!m || !(m[1] + (m[2] || '')).length) Calc.fail('Not a decimal number. Write it like 0.1, -2.5, 6.02e23, Infinity or NaN.', 'x');
            var ds = (m[1] + (m[2] || '')).replace(/^0+/, '');
            if (ds.length > 800) Calc.fail('At most 800 digits.', 'x');
            var ex = m[3] ? parseInt(m[3], 10) : 0, Ex = ex - (m[2] || '').length;
            if (!ds) return { neg: neg, D: 0n, E: 0 };
            var order = ds.length + Ex;
            if (order > 400) return { neg: neg, D: 1n, E: 400, huge: true };
            if (order < -400) return { neg: neg, D: 1n, E: -400, tiny: true };
            return { neg: neg, D: BigInt(ds), E: Ex };
        };
        L.rational = function (p) { return p.E >= 0 ? { N: p.D * 10n ** BigInt(p.E), Dn: 1n } : { N: p.D, Dn: 10n ** BigInt(-p.E) }; };
        /* round N/Dn > 0 to the format: {bits (no sign), kind, e, q, M, ...} */
        L.encode = function (N, Dn, F) {
            var e = nt.bitLength(N) - nt.bitLength(Dn);
            if (e >= 0 ? N < (Dn << BigInt(e)) : (N << BigInt(-e)) < Dn) e--;
            var emin = 1 - F.bias, sub = e < emin, q = (sub ? emin : e) - F.mb;
            var num = q < 0 ? N << BigInt(-q) : N, den = q > 0 ? Dn << BigInt(q) : Dn;
            var M = num / den, rem = num % den;
            /* the digits for the steps: mb + 1 kept bits (or the subnormal fraction) and 8 more */
            var more = (rem << 8n) / den, kept = sub ? E.bin(M, F.mb) : M.toString(2).slice(1);
            var guard = 2n * rem >= den ? 1 : 0, sticky = guard ? 2n * rem > den : rem > 0n;
            var up = guard && (sticky || (M & 1n) === 1n);
            var out = { e: e, kept: kept, guard: guard, sticky: sticky, up: !!up, inexact: rem > 0n, wasSub: sub, carry: false };
            out.digits = (sub ? E.bin(M, F.mb) : M.toString(2)) + E.bin(more, 8);
            if (up) M += 1n;
            if (!sub && M === (1n << BigInt(F.mb + 1))) { M >>= 1n; e++; q++; out.carry = true; out.e = e; }
            if (!sub && e > F.bias) { out.kind = 'inf'; out.bits = ((1n << BigInt(F.eb)) - 1n) << BigInt(F.mb); return out; }
            var biased, frac;
            if (sub) {
                if (M === 0n) { out.kind = 'zero'; biased = 0; frac = 0n; }
                else if (M === (1n << BigInt(F.mb))) { out.kind = 'normal'; biased = 1; frac = 0n; }
                else { out.kind = 'sub'; biased = 0; frac = M; }
            } else { out.kind = 'normal'; biased = e + F.bias; frac = M - (1n << BigInt(F.mb)); }
            out.biased = biased; out.M = M; out.q = q;
            out.bits = (BigInt(biased) << BigInt(F.mb)) | frac;
            return out;
        };
        L.decode = function (word, F) {
            var s = Number(word >> BigInt(F.w - 1)), be = Number((word >> BigInt(F.mb)) & ((1n << BigInt(F.eb)) - 1n)), f = word & ((1n << BigInt(F.mb)) - 1n);
            var top = (1 << F.eb) - 1;
            if (be === top) return { s: s, be: be, f: f, kind: f ? 'nan' : 'inf' };
            if (be === 0) return f ? { s: s, be: be, f: f, kind: 'sub', M: f, q: 1 - F.bias - F.mb } : { s: s, be: be, f: f, kind: 'zero', M: 0n, q: 0 };
            return { s: s, be: be, f: f, kind: 'normal', M: f + (1n << BigInt(F.mb)), q: be - F.bias - F.mb };
        };
        /* the exact decimal of M * 2^q */
        L.exact = function (M, q) {
            if (q >= 0) return (M << BigInt(q)).toString();
            var k = -q, s = (M * 5n ** BigInt(k)).toString();
            s = E.pad(s, k + 1);
            var r = (s.slice(0, s.length - k) + '.' + s.slice(s.length - k)).replace(/0+$/, '').replace(/\.$/, '');
            return r;
        };
        /* typed value minus stored value (both positive): exact text, scientific, relative error */
        L.diff = function (q, M, e2) {
            var Ld = q.Dn.toString().length - 1, Ls = e2 < 0 ? -e2 : 0, Lc = Math.max(Ld, Ls);
            var a = q.N * 10n ** BigInt(Lc - Ld);
            var b = e2 >= 0 ? (M << BigInt(e2)) * 10n ** BigInt(Lc) : M * 5n ** BigInt(-e2) * 10n ** BigInt(Lc - Ls);
            var d = a - b;
            if (d === 0n) return { zero: true };
            var neg = d < 0n, ad = neg ? -d : d, ds = E.pad(ad.toString(), Lc + 1);
            var text = (neg ? '-' : '') + (ds.slice(0, ds.length - Lc) + (Lc ? '.' + ds.slice(ds.length - Lc) : '')).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
            return { text: text, sci: L.sci(ad, Lc, neg), rel: L.sci(ad * 10n ** 40n / a, 40, neg) };
        };
        /* n / 10^k in scientific notation with 6 significant digits, as TeX */
        L.sci = function (n, k, neg) {
            if (n === 0n) return '0';
            var s = n.toString(), exp = s.length - 1 - k;
            var mant = s.charAt(0) + (s.length > 1 ? '.' + s.slice(1, 6) : '');
            mant = mant.replace(/\.?0+$/, '');
            return (neg ? '-' : '') + mant + ' \\cdot 10^{' + exp + '}';
        };
        /* the shortest decimal string that reads back to the same bits */
        L.shortest = function (word, F) {
            var d = L.decode(word, F);
            if (d.kind === 'nan') return 'NaN';
            if (d.kind === 'inf') return (d.s ? '-' : '') + 'Infinity';
            if (d.kind === 'zero') return d.s ? '-0' : '0';
            var dv = new DataView(new ArrayBuffer(8)), x;
            if (F.w === 64) { dv.setUint32(0, Number(word >> 32n) & 0x7FFFFFFF); dv.setUint32(4, Number(word & 0xFFFFFFFFn)); x = dv.getFloat64(0); }
            else { dv.setUint32(0, Number(word) & 0x7FFFFFFF); x = dv.getFloat32(0); }
            var sg = d.s ? '-' : '';
            if (F.w === 64) return sg + String(x);
            for (var p = 1; p <= 9; p++) {
                var cands = [String(Number(x.toPrecision(p))), x.toPrecision(p)];
                for (var c = 0; c < cands.length; c++) {
                    var pp = L.parse(cands[c]), r = L.rational(pp), en = L.encode(r.N, r.Dn, F);
                    if (en.bits === (word & ((1n << BigInt(F.w - 1)) - 1n))) return sg + cands[c];
                }
            }
            return sg + String(x);
        };
        return L;
    }
    var IEEE = makeLib();

    Calc.tool({
        id: 'ieee754',
        lib: IEEE,
        live: true,
        inputs: [
            { id: 'dir', type: 'select', label: 'Direction', value: 'dec', options: [['dec', 'Decimal to IEEE 754'], ['bits', 'Bits or hex to decimal']] },
            { id: 'x', type: 'text', label: 'Decimal number', width: 'l', placeholder: '0.1', when: { dir: 'dec' }, help: 'Like 0.1, -2.5, 6.02e23, 1e-45, -0, Infinity or NaN.' },
            { id: 'prec', type: 'select', label: 'Format', value: 'single', when: { dir: 'dec' }, options: [['single', 'Single precision (32 bits)'], ['double', 'Double precision (64 bits)']] },
            { id: 'bits', type: 'text', label: 'Hex or bits', width: 'l', placeholder: '3DCCCCCD', when: { dir: 'bits' }, help: '8 hex digits or 32 bits for single, 16 hex digits or 64 bits for double.' }
        ],
        examples: [{ dir: 'dec', x: '0.1', prec: 'single' }, { dir: 'dec', x: '-2.5', prec: 'double' }, { dir: 'bits', bits: '3DCCCCCD' }, { dir: 'dec', x: '1e-45', prec: 'single' },
            { dir: 'dec', x: '0.1', prec: 'double' }, { dir: 'bits', bits: '7FF8000000000000' }, { dir: 'dec', x: '1e39', prec: 'single' }],
        run: function (v, S) {
            var E = Calc.lib.enc, T = Calc.tex, nt = Calc.lib.nt;
            var FMT = { single: { name: 'single precision (binary32)', w: 32, eb: 8, mb: 23, bias: 127 }, double: { name: 'double precision (binary64)', w: 64, eb: 11, mb: 52, bias: 1023 } };
            var C = IEEE;
            if (v.dir === 'bits') return fromBits();

            var F = FMT[v.prec], p = C.parse(v.x);
            var s0 = S.step('The sign');
            s0.p(p.neg ? 'The number is negative: the sign bit is 1 and the rest encodes $|x|$.' : 'The number is not negative: the sign bit is 0.');
            if (p.special === 'nan') return special(F, 0n, (1n << BigInt(F.mb - 1)) | (((1n << BigInt(F.eb)) - 1n) << BigInt(F.mb)), 'NaN (not a number) has all exponent bits 1 and a fraction that is not 0. The usual quiet NaN sets the top fraction bit.');
            if (p.special === 'inf') return special(F, p.neg ? 1n : 0n, ((1n << BigInt(F.eb)) - 1n) << BigInt(F.mb), 'Infinity has all exponent bits 1 and fraction 0.');
            if (p.D === 0n) return special(F, p.neg ? 1n : 0n, 0n, 'Zero cannot be normalized (it has no leading 1), so it has its own pattern: exponent and fraction all 0. The sign bit still counts: +0 and -0 are two patterns that compare equal.');
            if (p.huge || p.tiny) {
                S.step(p.huge ? 'Far too large' : 'Far too small').p(p.huge ? 'The number has more than 400 digits before the point, far above the largest finite value, so it overflows to infinity.' : 'The number is below $10^{-400}$, far below the smallest subnormal number, so it rounds to zero (underflow).');
                return assemble(F, p.neg ? 1n : 0n, ((p.neg ? 1n : 0n) << BigInt(F.w - 1)) | (p.huge ? ((1n << BigInt(F.eb)) - 1n) << BigInt(F.mb) : 0n), p.huge);
            }
            var q = C.rational(p), enc = C.encode(q.N, q.Dn, F);
            var signBit = p.neg ? 1n : 0n, word = (signBit << BigInt(F.w - 1)) | enc.bits;
            binaryStep(q, F, enc);
            if (enc.kind === 'inf') {
                var so = S.step('Too large: overflow to infinity');
                so.p('The exponent would be $' + enc.e + '$, but the largest one in ' + F.name + ' is $' + F.bias + '$. The largest finite number is $(2 - 2^{-' + F.mb + '}) \\cdot 2^{' + F.bias + '} \\approx ' + (v.prec === 'single' ? '3.4028235 \\cdot 10^{38}' : '1.7976931348623157 \\cdot 10^{308}') + '$, and everything that rounds above it becomes infinity.');
                return assemble(F, signBit, word, true);
            }
            roundStep(F, enc);
            expStep(F, enc);
            assemble(F, signBit, word, false);
            storedStep(F, p, q, enc, word);

            /* ---------- the steps ---------- */
            function binaryStep(q, F, enc) {
                var I = q.N / q.Dn, r = q.N % q.Dn, s = S.step('Write $|x|$ in binary');
                var ib = I > 0n ? I.toString(2) : '0';
                if (I > 0n && I < (1n << 20n)) {
                    var rows = [], m = I;
                    while (m > 0n) { rows.push([String(m), String(m / 2n), { v: String(m % 2n), hl: true }]); m /= 2n; }
                    s.p('The integer part, ' + I + ', by repeated division by 2 (the remainders, read from the bottom up, are the bits): $' + T(I) + ' = ' + ib + '_2$.');
                    s.table(['Number', 'Half', 'Remainder'], rows, { mono: true, max: 24 });
                } else if (I > 0n) s.p('The integer part in binary has ' + ib.length + ' bits: ' + E.group(ib, 4, true) + '.');
                else s.p('The integer part is 0.');
                if (r === 0n) { s.p('There is no fractional part.'); return; }
                /* bits of the fraction by doubling, until enough significant bits are known */
                var sig = I > 0n ? ib.length : 0, want = F.mb + 4, rows2 = [], seen = {}, rep = -1, repAt = -1, k = 0, fb = '';
                var dl = q.Dn.toString().length - 1;   // Dn = 10^dl
                function dec(x) { return x === 0n ? '0' : '0.' + E.pad(x.toString(), dl).replace(/0+$/, ''); }
                var cap = (enc.kind === 'sub' || enc.kind === 'zero') ? F.bias + F.mb + 8 : 1200;
                while (r !== 0n && k < cap && (sig < want || sig === 0)) {
                    var key = r.toString();
                    if (seen[key] != null && rep < 0) { rep = seen[key]; repAt = k; }
                    seen[key] = k;
                    var d = 2n * r, bit = d >= q.Dn ? 1 : 0;
                    rows2.push([k + 1, dec(r) + ' × 2 = ' + (bit ? '1' + (d > q.Dn ? dec(d - q.Dn).slice(1) : '') : dec(d)), { v: String(bit), hl: bit === 1 }]);
                    r = bit ? d - q.Dn : d;
                    fb += bit;
                    if (sig || bit) sig++;
                    k++;
                }
                s.p('The fractional part, by repeated doubling: each time the integer part (0 or 1) is the next bit after the point, and only the fraction is kept.');
                s.table(['Position', 'Doubling', 'Bit'], rows2, { mono: true });
                if (rep >= 0) s.p('Row ' + (repAt + 1) + ' starts with the same fraction as row ' + (rep + 1) + ', so from there the bits repeat forever: the binary expansion never ends, and this number cannot be stored exactly in binary.');
                else if (r !== 0n) s.p('Enough bits for rounding; the expansion goes on.');
                else s.p('The fraction became 0: the expansion is finite.');
                s.math('|x| = ' + ib + '.' + fb + (r !== 0n ? '\\ldots' : '') + '_2');
            }
            function roundStep(F, enc) {
                var s = S.step(enc.kind === 'sub' ? 'Too small to normalize: a subnormal number' : 'Normalize: binary scientific notation');
                var all = enc.digits;   // the significant bits from the leading 1 (or from 2^(emin-1) for subnormals), mb + 1 kept and more
                if (enc.kind === 'sub' || enc.kind === 'zero') {
                    s.p('Normalizing would need the exponent $' + enc.e + '$, below the smallest one, $' + (1 - F.bias) + '$. So the exponent stays at $' + (1 - F.bias) + '$ and the number is written $0.f \\cdot 2^{' + (1 - F.bias) + '}$, without the hidden 1 (a subnormal number, with less precision).');
                    s.math('|x| = 0.' + all.slice(0, F.mb) + '\\,' + all.slice(F.mb, F.mb + 6) + '\\ldots_2 \\cdot 2^{' + (1 - F.bias) + '}');
                } else {
                    s.p('Move the point behind the first 1. That 1 is never stored (the hidden bit); the ' + F.mb + ' bits after the point are the fraction (mantissa).');
                    s.math('|x| = 1.' + all.slice(1, F.mb + 1) + '\\,' + all.slice(F.mb + 1, F.mb + 7) + '\\ldots_2 \\cdot 2^{' + enc.e + '}');
                }
                var r = S.step('Round to ' + F.mb + ' bits of fraction');
                r.p('Round to nearest, ties to even: look at the first bit that does not fit (the guard bit) and whether anything after it is non-zero (sticky).');
                r.table(['Kept bits', 'Guard bit', 'After it'], [[E.group(enc.kept, 4), enc.guard, enc.sticky ? 'not all 0' : 'all 0']], { mono: true });
                var how = enc.guard === 0 ? 'The guard bit is 0: round down, keep the bits as they are.'
                    : enc.sticky ? 'The guard bit is 1 and more follows: above the halfway point, round up (add 1 to the last kept bit).'
                    : enc.up ? 'Exactly halfway, and the last kept bit is 1: round up, to make it even.' : 'Exactly halfway, and the last kept bit is 0 (even): round down.';
                r.p(how);
                if (enc.carry) r.p('Rounding up carries all the way to a new leading bit, so the exponent grows by one.');
                if (!enc.inexact) r.check(true, 'Nothing is lost: the number is stored exactly.');
            }
            function expStep(F, enc) {
                var s = S.step('The exponent, with the bias');
                var be = enc.biased, eb = E.bin(be, F.eb);
                if (enc.kind === 'sub' || enc.kind === 'zero') s.p('Subnormal numbers (and zero) have the exponent field 0, which stands for $2^{' + (1 - F.bias) + '}$ with no hidden bit.' + (enc.kind === 'zero' ? ' Here even the subnormal precision is not enough: the number rounds to zero (underflow).' : ''));
                else if (be === 1 && enc.wasSub) s.p('Rounding made it reach the smallest normal number: the exponent field is 1.');
                else {
                    s.p('The exponent is stored as an unsigned ' + F.eb + '-bit number with a bias of ' + F.bias + ' added, so that negative exponents need no sign:');
                    s.math(enc.e + ' + ' + F.bias + ' = ' + be + ' = ' + eb + '_2');
                }
            }
            function assemble(F, sb, word, isInf) {
                var bits = E.bin(word, F.w), hex = E.pad(word.toString(16).toUpperCase(), F.w / 4);
                var sgn = bits.slice(0, 1), ex = bits.slice(1, 1 + F.eb), fr = bits.slice(1 + F.eb);
                S.result(['$\\mathtt{' + hex + '}$ (hex)', '$\\mathtt{' + sgn + '\\ ' + ex + '\\ ' + E.group(fr, 4).replace(/ /g, '\\,') + '}$'], { copy: hex, label: F.name });
                if (isInf) S.note('Overflow: the number is too large for ' + F.name + ' and becomes ' + (sb ? '-' : '+') + 'Infinity.');
                var s = S.step('Put the fields together');
                s.p('Sign (1 bit), exponent (' + F.eb + ' bits), fraction (' + F.mb + ' bits); then 4 bits per hex digit.');
                s.table(['Sign', 'Exponent', 'Fraction'], [[sgn, ex, E.group(fr, 4)]], { mono: true });
                s.math('\\mathtt{' + E.group(bits, 4).replace(/ /g, '\\ ') + '}_2 = \\mathtt{' + hex + '}_{16}');
            }
            function storedStep(F, p, q, enc, word) {
                var val = C.exact(enc.M, enc.q), s = S.step('The value actually stored');
                var sgn = p.neg ? '-' : '';
                s.p('The bits stand exactly for $' + (enc.kind === 'zero' ? '0' : T(enc.M) + ' \\cdot 2^{' + enc.q + '}') + '$, which in decimal is:');
                s.pre(sgn + val);
                var err = C.diff(q, enc.M, enc.q);
                if (err.zero) { s.check(true, 'No rounding error: ' + Calc.esc(v.x.trim()) + ' is exactly representable.'); return; }
                s.p('The rounding error, typed value minus stored value' + (p.neg ? ' (for $|x|$)' : '') + ':');
                s.pre(err.text);
                s.p('About $' + err.sci + '$, a relative error of $' + err.rel + '$. The worst case is half a unit in the last place, $2^{-' + (F.mb + 1) + '} \\approx ' + (F.mb === 23 ? '5.96 \\cdot 10^{-8}' : '1.11 \\cdot 10^{-16}') + '$ for normal numbers.');
                var sh = C.shortest(word, F);
                S.note('Stored value: ' + Calc.esc(sh) + ' when printed with the fewest digits that read back to the same bits; exactly ' + Calc.esc(sgn + (val.length > 40 ? val.slice(0, 40) + '...' : val)) + '.');
            }
            function special(F, sb, rest, why) {
                var word = (sb << BigInt(F.w - 1)) | rest;
                S.step('A special value').p(why);
                assemble(F, sb, word, false);
            }

            /* ---------- bits to number ---------- */
            function fromBits() {
                var src = String(v.bits).trim().replace(/^0x/i, '').replace(/[\s_]/g, ''), bits;
                if (/^[01]+$/.test(src) && (src.length === 32 || src.length === 64)) bits = src;
                else if (/^[0-9a-f]+$/i.test(src) && (src.length === 8 || src.length === 16)) bits = src.split('').map(function (d) { return E.bin(parseInt(d, 16), 4); }).join('');
                else Calc.fail('Give 8 hex digits or 32 bits (single precision), or 16 hex digits or 64 bits (double precision).', 'bits');
                var F = bits.length === 32 ? FMT.single : FMT.double, word = BigInt('0b' + bits);
                var d = C.decode(word, F), hex = E.pad(word.toString(16).toUpperCase(), F.w / 4);
                var s1 = S.step('Split the ' + F.w + ' bits into the three fields');
                s1.p(F.w + ' bits: ' + F.name + '. Sign 1 bit, exponent ' + F.eb + ' bits, fraction ' + F.mb + ' bits.');
                s1.table(['Field', 'Bits', 'Value'], [['Sign', bits.charAt(0), d.s], ['Exponent', bits.slice(1, 1 + F.eb), d.be], ['Fraction', E.group(bits.slice(1 + F.eb), 4), '$' + T(d.f) + '$']], { mono: true });
                var s2 = S.step('What the exponent field says');
                var sh = C.shortest(word, F), lines;
                if (d.kind === 'nan') {
                    s2.p('All exponent bits are 1 and the fraction is not 0: NaN, not a number. ' + (d.f >> BigInt(F.mb - 1) ? 'The top fraction bit is 1: a quiet NaN.' : 'The top fraction bit is 0: a signaling NaN.') + ' The other fraction bits are a payload that programs rarely use.');
                    S.result('NaN', { copy: 'NaN', label: F.name + ' ' + hex });
                    return;
                }
                if (d.kind === 'inf') {
                    s2.p('All exponent bits are 1 and the fraction is 0: infinity.');
                    S.result((d.s ? '-' : '+') + 'Infinity', { copy: (d.s ? '-' : '') + 'Infinity', label: F.name + ' ' + hex });
                    return;
                }
                if (d.kind === 'zero') {
                    s2.p('Exponent and fraction are all 0: zero, with sign ' + (d.s ? 'minus' : 'plus') + '.');
                    S.result(d.s ? '-0' : '0', { copy: d.s ? '-0' : '0', label: F.name + ' ' + hex });
                    return;
                }
                var fb = bits.slice(1 + F.eb);
                if (d.kind === 'sub') {
                    s2.p('The exponent field is 0 but the fraction is not: a subnormal number, $0.f \\cdot 2^{' + (1 - F.bias) + '}$ with no hidden 1.');
                    s2.math('x = ' + (d.s ? '-' : '') + '0.' + fb + '_2 \\cdot 2^{' + (1 - F.bias) + '}');
                } else {
                    s2.p('A normal number: the exponent is the field minus the bias, $' + d.be + ' - ' + F.bias + ' = ' + (d.be - F.bias) + '$, and a hidden 1 comes before the fraction.');
                    s2.math('x = ' + (d.s ? '-' : '') + '1.' + fb.replace(/0+$/, '') + (/1/.test(fb) ? '' : '0') + '_2 \\cdot 2^{' + (d.be - F.bias) + '}');
                }
                var s3 = S.step('As an exact fraction');
                s3.p('The significand as a whole number is $' + (d.kind === 'sub' ? 'f' : '2^{' + F.mb + '} + f') + ' = ' + T(d.M) + '$, so');
                s3.math('x = ' + (d.s ? '-' : '') + T(d.M) + ' \\cdot 2^{' + d.q + '}');
                var ex = C.exact(d.M, d.q);
                s3.p('Exactly, in decimal (every binary fraction has a finite decimal expansion):');
                s3.pre((d.s ? '-' : '') + ex);
                S.step('The shortest decimal that gives these bits').p('Printed with the fewest significant digits that convert back to exactly ' + hex + ', as programming languages print numbers:').pre(sh);
                S.result([Calc.esc(sh)], { copy: sh, label: F.name + ' ' + hex });
                if (ex.replace(/^0\.|\./, '').replace(/^0+/, '').length > 20) S.note('Exactly ' + Calc.esc((d.s ? '-' : '') + (ex.length > 60 ? ex.slice(0, 60) + '...' : ex)) + '.');
            }

        }
    });
})();
