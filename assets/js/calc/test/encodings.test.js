/* Tests for the Encodings and converters tools and lib/encodings.js (see run.js for the API). Where node has a
   reference (Buffer, crypto, TextDecoder, encodeURIComponent, DataView), random inputs are checked against it. */
(function () {
    'use strict';
    var NODE = typeof process !== 'undefined' && process.mainModule ? process.mainModule.require : null;
    var CRYPTO = NODE ? NODE('crypto') : null, UTIL = NODE ? NODE('util') : null;
    var PIECES = ['a', 'Z', '0', ' ', '!', '$', '\\', '~', '%', '+', '&', '=', 'é', 'ß', 'Ж', 'π', '中', '€', '😀', '🇫🇷', '\n', ' '];
    T.ok('encodings: node references for the cross-checks (crypto, TextDecoder)', !!(CRYPTO && UTIL && UTIL.TextDecoder));
    function rtext(r, n) { var s = ''; for (var i = 0; i < n; i++) s += r.pick(PIECES); return s; }
    function rbytes(r, n) { var b = []; for (var i = 0; i < n; i++) b.push(r.num(0, 255)); return b; }
    function hexOf(b) { return Calc.lib.enc.hex(b); }
    function pres(S) { var out = []; S.steps.forEach(function (st) { st.blocks.forEach(function (b) { if (b.t === 'pre') out.push(b.v); }); }); return out.join('\n'); }

    /* ---------- lib/encodings.js ---------- */
    T.prop('enc.utf8 against Buffer', 300, function (r) {
        var s = rtext(r, r.num(0, 20)), a = Calc.lib.enc.utf8(s), b = Array.prototype.slice.call(Buffer.from(s, 'utf8'));
        return a.join(',') === b.join(',') ? true : 'utf8 of ' + JSON.stringify(s);
    });
    T.prop('enc.utf8Decode round trip', 300, function (r) {
        var s = rtext(r, r.num(0, 20)), d = Calc.lib.enc.utf8Decode(Calc.lib.enc.utf8(s));
        return d.text === s && d.errors === 0 ? true : 'decode of ' + JSON.stringify(s);
    });
    T.prop('enc.utf8Decode against TextDecoder (WHATWG replacement)', 1500, function (r) {
        if (!UTIL || !UTIL.TextDecoder) return true;
        var pool = [0x41, 0x80, 0xBF, 0xC0, 0xC1, 0xC2, 0xC3, 0xDF, 0xE0, 0xE1, 0xED, 0xEF, 0xF0, 0xF4, 0xF5, 0xFF, 0x9F, 0xA0, 0x90, 0x8F];
        var b = [];
        for (var i = r.num(0, 8); i > 0; i--) b.push(r.num(0, 3) ? r.pick(pool) : r.num(0, 255));
        var want = new UTIL.TextDecoder('utf-8').decode(Uint8Array.from(b)), got = Calc.lib.enc.utf8Decode(b).text;
        return got === want ? true : hexOf(b) + ': got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want);
    });
    T.ok('enc.bigToBytes', hexOf(Calc.lib.enc.bigToBytes(0x0102ffn, 4)) === '00 01 02 FF' && Calc.lib.enc.bytesToBig([1, 0]) === 256n);
    T.ok('enc.codePoints', Calc.lib.enc.codePoints('a😀').map(function (c) { return c.cp; }).join(',') === '97,128512');

    /* ---------- character codes ---------- */
    T.tool('character-codes', [
        { in: { input: 'Hé!', fmt: 'dec' }, copy: '72 233 33' },
        { in: { input: 'Hé!', fmt: 'hex' }, copy: '48 E9 21' },
        { in: { input: 'A', fmt: 'bin' }, copy: '1000001' },
        { in: { input: 'A', fmt: 'oct' }, copy: '101' },
        { in: { input: '😀€', fmt: 'u' }, copy: 'U+1F600 U+20AC' },
        { in: { input: '', fmt: 'dec' }, copy: '' },
        { in: { input: '72 101 108 108 111', fmt: 'dec' }, action: 'dec', copy: 'Hello' },
        { in: { input: 'U+1F600, 0x41 &#233; &#x20AC; 0b1000010', fmt: 'dec' }, action: 'dec', copy: '😀Aé€B' },
        { in: { input: '48 69', fmt: 'hex' }, action: 'dec', copy: 'Hi' },
        { in: { input: 'D800', fmt: 'hex' }, action: 'dec', error: true },
        { in: { input: '110000', fmt: 'hex' }, action: 'dec', error: true },
        { in: { input: '12a', fmt: 'dec' }, action: 'dec', error: true },
        { in: { input: '102', fmt: 'bin' }, action: 'dec', error: true }
    ]);
    T.prop('character-codes round trip', 200, function (r) {
        var s = rtext(r, r.num(1, 12)), f = r.pick(['dec', 'hex', 'bin', 'oct', 'u']);
        return T.run('character-codes', { input: s, fmt: f }, 'enc').then(function (o) {
            return T.run('character-codes', { input: o.copy, fmt: f }, 'dec');
        }).then(function (o) { return o.copy === s ? true : f + ': ' + JSON.stringify(s) + ' came back as ' + JSON.stringify(o.copy); });
    });

    /* ---------- hex, binary ---------- */
    T.tool('hex', [
        { in: { input: 'Hello', sep: 'space' }, copy: '48 65 6C 6C 6F' },
        { in: { input: 'Hello', sep: 'none', lower: true }, copy: '48656c6c6f' },
        { in: { input: 'Hi', sep: 'colon' }, copy: '48:69' },
        { in: { input: 'Hi', sep: '0x' }, copy: '0x48 0x69' },
        { in: { input: 'é😀', sep: 'space' }, copy: 'C3 A9 F0 9F 98 80' },
        { in: { input: '', sep: 'space' }, copy: '' },
        { in: { input: '48 c3 a9 21' }, action: 'dec', copy: 'Hé!' },
        { in: { input: '0x48,0x69' }, action: 'dec', copy: 'Hi' },
        { in: { input: 'ff' }, action: 'dec', copy: '�' },
        { in: { input: 'abc' }, action: 'dec', error: true },
        { in: { input: '4g' }, action: 'dec', error: true }
    ]);
    T.prop('hex round trip', 200, function (r) {
        var s = rtext(r, r.num(0, 15)), sep = r.pick(['space', 'none', 'colon', '0x']);
        return T.run('hex', { input: s, sep: sep, lower: !!r.num(0, 1) }, 'enc').then(function (o) {
            if (o.copy.replace(/0x|[ :]/g, '').toLowerCase() !== Buffer.from(s, 'utf8').toString('hex')) return 'hex of ' + JSON.stringify(s);
            return T.run('hex', { input: o.copy }, 'dec').then(function (p) { return p.copy === s ? true : 'back: ' + JSON.stringify(p.copy); });
        });
    });
    T.tool('binary', [
        { in: { input: 'Hi', sep: true }, copy: '01001000 01101001' },
        { in: { input: 'Hi', sep: false }, copy: '0100100001101001' },
        { in: { input: 'é', sep: true }, copy: '11000011 10101001' },
        { in: { input: '1001000 1101001' }, action: 'dec', copy: 'Hi' },
        { in: { input: '0100100001101001' }, action: 'dec', copy: 'Hi' },
        { in: { input: '' }, action: 'dec', copy: '' },
        { in: { input: '010' }, action: 'dec', error: true },
        { in: { input: '0102' }, action: 'dec', error: true },
        { in: { input: '111111111 0' }, action: 'dec', error: true }
    ]);
    T.prop('binary round trip', 150, function (r) {
        var s = rtext(r, r.num(0, 12)), sep = !!r.num(0, 1);
        return T.run('binary', { input: s, sep: sep }, 'enc').then(function (o) { return T.run('binary', { input: o.copy }, 'dec'); })
            .then(function (o) { return o.copy === s ? true : JSON.stringify(s) + ' came back as ' + JSON.stringify(o.copy); });
    });

    /* ---------- Base64, Base32 (RFC 4648 section 10), Base58 (Bitcoin Core vectors) ---------- */
    var RFC = ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar'];
    var B64 = ['', 'Zg==', 'Zm8=', 'Zm9v', 'Zm9vYg==', 'Zm9vYmE=', 'Zm9vYmFy'];
    var B32 = ['', 'MY======', 'MZXQ====', 'MZXW6===', 'MZXW6YQ=', 'MZXW6YTB', 'MZXW6YTBOI======'];
    var B32H = ['', 'CO======', 'CPNG====', 'CPNMU===', 'CPNMUOG=', 'CPNMUOJ1', 'CPNMUOJ1E8======'];
    T.tool('base64', RFC.map(function (s, i) { return { in: { input: s, form: 'text', variant: 'std', pad: true }, copy: B64[i] }; })
        .concat(RFC.map(function (s, i) { return { in: { input: B64[i], form: 'text', variant: 'std', pad: true }, action: 'dec', copy: s }; }))
        .concat([
            { in: { input: 'f', form: 'text', variant: 'std', pad: false }, copy: 'Zg' },
            { in: { input: 'Zg', form: 'text', variant: 'std', pad: true }, action: 'dec', copy: 'f' },
            { in: { input: 'fb ff fe', form: 'hex', variant: 'std', pad: true }, copy: '+//+' },
            { in: { input: 'fb ff fe', form: 'hex', variant: 'url', pad: false }, copy: '-__-' },
            { in: { input: '-__-', form: 'hex', variant: 'std', pad: true }, action: 'dec', copy: 'FB FF FE' },
            { in: { input: 'SGVs\nbG8=', form: 'text', variant: 'std', pad: true }, action: 'dec', copy: 'Hello' },
            { in: { input: 'Zh==', form: 'text', variant: 'std', pad: true }, action: 'dec', copy: 'f' },
            { in: { input: 'Zg=', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: 'Z', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: 'Zm9v!', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: 'Z=g=', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: 'Zg===', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: '+_', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: 'zz', form: 'hex', variant: 'std', pad: true }, error: true }
        ]));
    T.prop('base64 against Buffer', 300, function (r) {
        var b = rbytes(r, r.num(0, 40)), url = !!r.num(0, 1), pad = !!r.num(0, 1);
        var want = Buffer.from(b).toString('base64');
        if (url) want = want.replace(/\+/g, '-').replace(/\//g, '_');
        if (!pad) want = want.replace(/=+$/, '');
        return T.run('base64', { input: hexOf(b), form: 'hex', variant: url ? 'url' : 'std', pad: pad }, 'enc').then(function (o) {
            if (o.copy !== want) return hexOf(b) + ': got ' + o.copy + ' want ' + want;
            return T.run('base64', { input: o.copy, form: 'hex', variant: url ? 'url' : 'std', pad: pad }, 'dec').then(function (p) { return p.copy === hexOf(b) ? true : 'decode ' + o.copy; });
        });
    });
    T.prop('base64 text round trip', 100, function (r) {
        var s = rtext(r, r.num(0, 15));
        return T.run('base64', { input: s, form: 'text', variant: 'std', pad: true }, 'enc').then(function (o) {
            if (o.copy !== Buffer.from(s, 'utf8').toString('base64')) return 'encode ' + JSON.stringify(s);
            return T.run('base64', { input: o.copy, form: 'text', variant: 'std', pad: true }, 'dec');
        }).then(function (o) { return o === true || typeof o === 'string' ? o : o.copy === s ? true : 'back ' + JSON.stringify(o.copy); });
    });
    T.tool('base32', RFC.map(function (s, i) { return { in: { input: s, form: 'text', variant: 'std', pad: true }, copy: B32[i] }; })
        .concat(RFC.map(function (s, i) { return { in: { input: s, form: 'text', variant: 'hex', pad: true }, copy: B32H[i] }; }))
        .concat(RFC.map(function (s, i) { return { in: { input: B32[i], form: 'text', variant: 'std', pad: true }, action: 'dec', copy: s }; }))
        .concat(RFC.map(function (s, i) { return { in: { input: B32H[i], form: 'text', variant: 'hex', pad: true }, action: 'dec', copy: s }; }))
        .concat([
            { in: { input: 'foobar', form: 'text', variant: 'std', pad: false }, copy: 'MZXW6YTBOI' },
            { in: { input: 'mzxw6ytboi', form: 'text', variant: 'std', pad: true }, action: 'dec', copy: 'foobar' },
            { in: { input: 'MY=====', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: 'MZX', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: 'MY1', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true },
            { in: { input: 'M=Y', form: 'text', variant: 'std', pad: true }, action: 'dec', error: true }
        ]));
    T.prop('base32 round trip', 200, function (r) {
        var b = rbytes(r, r.num(0, 30)), variant = r.pick(['std', 'hex']), pad = !!r.num(0, 1);
        return T.run('base32', { input: hexOf(b), form: 'hex', variant: variant, pad: pad }, 'enc').then(function (o) {
            if (o.copy.replace(/=+$/, '').length !== Math.ceil(b.length * 8 / 5)) return 'length of ' + o.copy;
            if (pad && o.copy.length % 8) return 'padding of ' + o.copy;
            return T.run('base32', { input: o.copy, form: 'hex', variant: variant, pad: pad }, 'dec').then(function (p) { return p.copy === hexOf(b) ? true : 'decode ' + o.copy; });
        });
    });
    var B58 = [['', ''], ['61', '2g'], ['626262', 'a3gV'], ['636363', 'aPEr'], ['73696d706c792061206c6f6e6720737472696e67', '2cFupjhnEsSn59qHXstmK2ffpLv2'],
        ['00eb15231dfceb60925886b67d065299925915aeb172c06647', '1NS17iag9jJgTHD1VXjvLCEnZuQ3rJDE9L'], ['516b6fcd0f', 'ABnLTmg'], ['bf4f89001e670274dd', '3SEo3LWLoPntC'],
        ['572e4794', '3EFU7m'], ['ecac89cad93923c02321', 'EJDM8drfXA6uyA'], ['10c8511e', 'Rt5zm'], ['00000000000000000000', '1111111111'], ['00', '1'], ['0000287fb4cd', '11233QC4']];
    T.tool('base58', B58.map(function (c) { return { in: { input: c[0], form: 'hex' }, copy: c[1] }; })
        .concat(B58.map(function (c) { return { in: { input: c[1], form: 'hex' }, action: 'dec', copy: hexOf(Calc.lib.enc.parseHex(c[0])) }; }))
        .concat([
            { in: { input: 'Hello World!', form: 'text' }, copy: '2NEpo7TZRRrLZSi2U' },
            { in: { input: '2NEpo7TZRRrLZSi2U', form: 'text' }, action: 'dec', copy: 'Hello World!' },
            { in: { input: '10', form: 'hex' }, action: 'dec', error: true },
            { in: { input: 'abO', form: 'hex' }, action: 'dec', error: true },
            { in: { input: 'Il', form: 'hex' }, action: 'dec', error: true }
        ]));
    T.prop('base58 round trip', 150, function (r) {
        var b = rbytes(r, r.num(0, 40));
        for (var z = r.num(0, 3); z > 0; z--) b.unshift(0);
        return T.run('base58', { input: hexOf(b), form: 'hex' }, 'enc').then(function (o) { return T.run('base58', { input: o.copy, form: 'hex' }, 'dec'); })
            .then(function (o) { return o.copy === hexOf(b) ? true : hexOf(b) + ' came back as ' + o.copy; });
    });

    /* ---------- URL encoding, UTF-8 ---------- */
    T.tool('url-encoding', [
        { in: { input: 'a b&c=é', mode: 'component' }, copy: 'a%20b%26c%3D%C3%A9' },
        { in: { input: "a b!*'()~", mode: 'strict' }, copy: 'a%20b%21%2A%27%28%29~' },
        { in: { input: 'a b+c*', mode: 'form' }, copy: 'a+b%2Bc*' },
        { in: { input: 'https://x.org/a b?q=1&r=ü#t', mode: 'uri' }, copy: 'https://x.org/a%20b?q=1&r=%C3%BC#t' },
        { in: { input: 'caf%C3%A9%20%E2%82%AC5', mode: 'component' }, action: 'dec', copy: 'café €5' },
        { in: { input: 'a+b%2B', mode: 'form' }, action: 'dec', copy: 'a b+' },
        { in: { input: 'a+b', mode: 'component' }, action: 'dec', copy: 'a+b' },
        { in: { input: '%C3', mode: 'component' }, action: 'dec', copy: '�' },
        { in: { input: '100%', mode: 'component' }, action: 'dec', error: true },
        { in: { input: '%G1', mode: 'component' }, action: 'dec', error: true },
        { in: { input: '', mode: 'component' }, copy: '' }
    ]);
    T.prop('url-encoding against encodeURIComponent, encodeURI and URLSearchParams', 300, function (r) {
        var s = rtext(r, r.num(0, 15)) + r.pick(['', '#', '?', '/', ':', '@', "'", '(', '*']), mode = r.pick(['component', 'strict', 'form', 'uri']);
        var want = mode === 'component' ? encodeURIComponent(s) : mode === 'uri' ? encodeURI(s)
            : mode === 'strict' ? encodeURIComponent(s).replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); })
            : new URLSearchParams({ q: s }).toString().slice(2);
        return T.run('url-encoding', { input: s, mode: mode }, 'enc').then(function (o) {
            if (o.copy !== want) return mode + ' ' + JSON.stringify(s) + ': got ' + o.copy + ' want ' + want;
            return T.run('url-encoding', { input: o.copy, mode: mode }, 'dec').then(function (p) { return p.copy === s ? true : 'decode ' + o.copy; });
        });
    });
    T.tool('utf8', [
        { in: { input: 'aé€😀' }, copy: '61 C3 A9 E2 82 AC F0 9F 98 80' },
        { in: { input: 'A' }, copy: '41' },
        { in: { input: '߿ࠀ￿' }, copy: 'DF BF E0 A0 80 EF BF BF' },
        { in: { input: '􏿿' }, copy: 'F4 8F BF BF' },
        { in: { input: '\uD800x' }, copy: 'EF BF BD 78' },
        { in: { input: '' }, copy: '' },
        { in: { input: '61 C3 A9 E2 82 AC F0 9F 98 80' }, action: 'dec', copy: 'aé€😀' },
        { in: { input: '%C3%A9' }, action: 'dec', copy: 'é' },
        { in: { input: 'C3 28' }, action: 'dec', copy: '�(' },
        { in: { input: 'C0 AF' }, action: 'dec', copy: '��' },
        { in: { input: 'E0 80 AF' }, action: 'dec', copy: '���' },
        { in: { input: 'ED A0 80' }, action: 'dec', copy: '���' },
        { in: { input: 'F0 9F 98' }, action: 'dec', copy: '�' },
        { in: { input: 'F0 9F 98 41' }, action: 'dec', copy: '�A' },
        { in: { input: 'F4 90 80 80' }, action: 'dec', copy: '����' },
        { in: { input: '80 FF' }, action: 'dec', copy: '��' },
        { in: { input: 'C3' }, action: 'dec', check: function (S) { return S.notes.length ? true : 'no note about the error'; } },
        { in: { input: '4' }, action: 'dec', error: true }
    ]);
    T.prop('utf8 round trip', 200, function (r) {
        var s = rtext(r, r.num(1, 15));
        return T.run('utf8', { input: s }, 'enc').then(function (o) {
            if (o.copy.replace(/ /g, '').toLowerCase() !== Buffer.from(s, 'utf8').toString('hex')) return 'encode ' + JSON.stringify(s);
            return T.run('utf8', { input: o.copy }, 'dec').then(function (p) { return p.copy === s ? true : 'decode ' + o.copy; });
        });
    });

    /* ---------- Morse ---------- */
    T.tool('morse', [
        { in: { input: 'SOS', sep: 'slash' }, copy: '... --- ...' },
        { in: { input: 'Hello world', sep: 'slash' }, copy: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..' },
        { in: { input: 'a b', sep: 'spaces' }, copy: '.-   -...' },
        { in: { input: 'é1?', sep: 'slash' }, copy: '. .---- ..--..' },
        { in: { input: 'a#b', sep: 'slash' }, copy: '.- -...', check: function (S) { return S.notes.length ? true : 'no note for #'; } },
        { in: { input: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..' }, action: 'dec', copy: 'HELLO WORLD' },
        { in: { input: '-- --- .-. ... .   -.-. --- -.. .' }, action: 'dec', copy: 'MORSE CODE' },
        { in: { input: '·− −···' }, action: 'dec', copy: 'AB' },
        { in: { input: '.-.-.-.-.-' }, action: 'dec', error: true },
        { in: { input: '.- x' }, action: 'dec', error: true },
        { in: { input: '' }, action: 'dec', copy: '' }
    ]);
    T.prop('morse round trip', 200, function (r) {
        var w = [];
        for (var i = r.num(1, 4); i > 0; i--) w.push(r.text(r.num(1, 6), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?!/()&:;=+-_"$@\''));
        var s = w.join(' '), sep = r.pick(['slash', 'spaces']);
        return T.run('morse', { input: s, sep: sep }, 'enc').then(function (o) { return T.run('morse', { input: o.copy }, 'dec'); })
            .then(function (o) { return o.copy === s ? true : JSON.stringify(s) + ' came back as ' + JSON.stringify(o.copy); });
    });

    /* ---------- XOR, bitwise, two's complement, Gray code, Hamming distance ---------- */
    T.tool('xor', [
        { in: { data: 'Hello', dform: 'text', key: 'key', kform: 'text', out: 'hex' }, copy: '230015070a' },
        { in: { data: '23 00 15 07 0a', dform: 'hex', key: 'key', kform: 'text', out: 'text' }, copy: 'Hello' },
        { in: { data: '1c0111001f010100061a024b53535009181c', dform: 'hex', key: '686974207468652062756c6c277320657965', kform: 'hex', out: 'hex' }, copy: '746865206b696420646f6e277420706c6179' },
        { in: { data: 'AB', dform: 'text', key: '00', kform: 'hex', out: 'text' }, copy: 'AB' },
        { in: { data: 'abc', dform: 'text', key: '', kform: 'text', out: 'hex' }, error: true },
        { in: { data: 'xyz', dform: 'hex', key: 'k', kform: 'text', out: 'hex' }, error: true }
    ]);
    T.prop('xor twice gives the data back', 200, function (r) {
        var d = rbytes(r, r.num(1, 30)), k = rbytes(r, r.num(1, 8));
        var want = d.map(function (b, i) { return b ^ k[i % k.length]; });
        return T.run('xor', { data: hexOf(d), dform: 'hex', key: hexOf(k), kform: 'hex', out: 'hex' }).then(function (o) {
            if (o.copy !== hexOf(want).replace(/ /g, '').toLowerCase()) return 'xor of ' + hexOf(d);
            return T.run('xor', { data: o.copy, dform: 'hex', key: hexOf(k), kform: 'hex', out: 'hex' });
        }).then(function (o) { return typeof o === 'string' ? o : o.copy === hexOf(d).replace(/ /g, '').toLowerCase() ? true : 'not back'; });
    });
    T.tool('bitwise', [
        { in: { a: '12', op: 'and', b: '10', width: '' }, copy: '8' },
        { in: { a: '12', op: 'or', b: '10', width: '' }, copy: '14' },
        { in: { a: '12', op: 'xor', b: '10', width: '' }, copy: '6' },
        { in: { a: '0x5A', op: 'not', width: '8' }, copy: '165' },
        { in: { a: '5', op: 'not', width: '' }, copy: '250' },
        { in: { a: '-1', op: 'not', width: '' }, copy: '0' },
        { in: { a: '12', op: 'nand', b: '10', width: '4' }, copy: '7' },
        { in: { a: '12', op: 'nor', b: '10', width: '4' }, copy: '1' },
        { in: { a: '200', op: 'shl', k: '3', width: '8' }, copy: '64' },
        { in: { a: '200', op: 'shl', k: '3', width: '' }, copy: '1600' },
        { in: { a: '-20', op: 'shr', k: '2', width: '8' }, copy: '-5' },
        { in: { a: '-20', op: 'ushr', k: '2', width: '8' }, copy: '59' },
        { in: { a: '200', op: 'shr', k: '2', width: '8' }, copy: '242' },
        { in: { a: '200', op: 'shr', k: '2', width: '' }, copy: '50' },
        { in: { a: '-6', op: 'and', b: '7', width: '' }, copy: '2' },
        { in: { a: '2^100 + 5', op: 'or', b: '2^64', width: '' }, copy: String((1n << 100n) + 5n + (1n << 64n)) },
        { in: { a: '300', op: 'and', b: '1', width: '8' }, error: true },
        { in: { a: '1', op: 'and', b: '1', width: '0' }, error: true },
        { in: { a: '1', op: 'shl', k: '-1', width: '' }, error: true },
        { in: { a: 'x', op: 'not', width: '' }, error: true }
    ]);
    T.prop('bitwise against BigInt operators', 300, function (r) {
        var a = r.int(-(1n << 70n), 1n << 70n), b = r.int(-(1n << 70n), 1n << 70n), op = r.pick(['and', 'or', 'xor', 'shr']), k = r.num(0, 80);
        var want = op === 'and' ? a & b : op === 'or' ? a | b : op === 'xor' ? a ^ b : a >> BigInt(k);
        return T.run('bitwise', { a: String(a), op: op, b: String(b), k: String(k), width: '' }).then(function (o) { return o.copy === String(want) ? true : op + ' ' + a + ', ' + b + ': got ' + o.copy + ' want ' + want; });
    });
    T.prop('bitwise 32-bit against JavaScript', 300, function (r) {
        var a = r.num(-2147483648, 2147483647), b = r.num(-2147483648, 2147483647), k = r.num(0, 31), op = r.pick(['and', 'or', 'xor', 'not', 'shl', 'shr', 'ushr']);
        var x = { and: a & b, or: a | b, xor: a ^ b, not: ~a, shl: a << k, shr: a >> k, ushr: a >>> k }[op];
        var signed = a < 0 || (op !== 'not' && op.indexOf('sh') < 0 && b < 0);
        var want = signed ? (x | 0) : (x >>> 0);
        if (op === 'ushr' && signed) want = BigInt.asIntN(32, BigInt(a >>> k)).toString();
        return T.run('bitwise', { a: String(a), op: op, b: String(b), k: String(k), width: '32' }).then(function (o) { return o.copy === String(want) ? true : op + ' ' + a + ', ' + b + ', ' + k + ': got ' + o.copy + ' want ' + want; });
    });
    T.tool('twos-complement', [
        { in: { dir: 'to', x: '-42', w: '8' }, copy: '11010110' },
        { in: { dir: 'to', x: '100', w: '8' }, copy: '01100100' },
        { in: { dir: 'to', x: '-1', w: '16' }, copy: '1111111111111111' },
        { in: { dir: 'to', x: '-128', w: '8' }, copy: '10000000' },
        { in: { dir: 'to', x: '127', w: '8' }, copy: '01111111' },
        { in: { dir: 'to', x: '0', w: '1' }, copy: '0' },
        { in: { dir: 'to', x: '-1', w: '1' }, copy: '1' },
        { in: { dir: 'to', x: '128', w: '8' }, error: true },
        { in: { dir: 'to', x: '-129', w: '8' }, error: true },
        { in: { dir: 'to', x: '5', w: '0' }, error: true },
        { in: { dir: 'from', bits: '11010110' }, copy: '-42' },
        { in: { dir: 'from', bits: '0x80000000' }, copy: '-2147483648' },
        { in: { dir: 'from', bits: '0111 1111' }, copy: '127' },
        { in: { dir: 'from', bits: '1' }, copy: '-1' },
        { in: { dir: 'from', bits: '0xFF' }, copy: '-1' },
        { in: { dir: 'from', bits: '12' }, error: true },
        { in: { dir: 'from', bits: '0x' }, error: true }
    ]);
    T.prop('twos-complement round trip', 300, function (r) {
        var n = r.num(1, 100), lo = -(1n << BigInt(n - 1)), x = r.int(lo, -lo - 1n);
        return T.run('twos-complement', { dir: 'to', x: String(x), w: String(n) }).then(function (o) {
            if (o.copy.length !== n || BigInt.asIntN(n, BigInt('0b' + o.copy)) !== x) return x + ' in ' + n + ' bits gave ' + o.copy;
            return T.run('twos-complement', { dir: 'from', bits: o.copy });
        }).then(function (o) { return typeof o === 'string' ? o : o.copy === String(x) ? true : 'back ' + o.copy; });
    });
    T.tool('gray-code', [
        { in: { dir: 'b2g', x: '1011', fmt: 'bin' }, copy: '1110' },
        { in: { dir: 'g2b', x: '1110', fmt: 'bin' }, copy: '1011' },
        { in: { dir: 'b2g', x: '0001', fmt: 'bin' }, copy: '0001' },
        { in: { dir: 'b2g', x: '0', fmt: 'bin' }, copy: '0' },
        { in: { dir: 'table', n: '3' }, copy: '000 001 011 010 110 111 101 100' },
        { in: { dir: 'table', n: '1' }, copy: '0 1' },
        { in: { dir: 'b2g', x: '2026', fmt: 'dec' }, copy: String(2026 ^ 1013) },
        { in: { dir: 'g2b', x: '7', fmt: 'dec' }, copy: '5' },
        { in: { dir: 'b2g', x: '102', fmt: 'bin' }, error: true },
        { in: { dir: 'b2g', x: '-1', fmt: 'dec' }, error: true },
        { in: { dir: 'table', n: '11' }, error: true }
    ]);
    T.prop('gray-code round trip and one-bit steps', 200, function (r) {
        var x = r.int(0, 1n << 80n), s = x.toString(2);
        return T.run('gray-code', { dir: 'b2g', x: s, fmt: 'bin' }).then(function (o) {
            var g = BigInt('0b' + o.copy), g1 = (x + 1n) ^ ((x + 1n) >> 1n), d = g ^ g1;
            if (g !== (x ^ (x >> 1n)) || (d & (d - 1n)) !== 0n) return 'gray of ' + s;
            return T.run('gray-code', { dir: 'g2b', x: o.copy, fmt: 'bin' });
        }).then(function (o) { return typeof o === 'string' ? o : o.copy === s ? true : 'back ' + o.copy; });
    });
    T.tool('hamming-distance', [
        { in: { a: 'karolin', b: 'kathrin', mode: 'text' }, copy: '3' },
        { in: { a: '2173896', b: '2233796', mode: 'text' }, copy: '3' },
        { in: { a: 'a😀c', b: 'b😀c', mode: 'text' }, copy: '1' },
        { in: { a: '1011101', b: '1001001', mode: 'bits' }, copy: '2' },
        { in: { a: '0x2F', b: '0x3A', mode: 'hex' }, copy: '3' },
        { in: { a: 'this is a test', b: 'wokka wokka!!!', mode: 'textbits' }, copy: '37' },
        { in: { a: 'same', b: 'same', mode: 'text' }, copy: '0' },
        { in: { a: 'abc', b: 'ab', mode: 'text' }, error: true },
        { in: { a: 'ff', b: 'fff', mode: 'hex' }, error: true },
        { in: { a: '12', b: '10', mode: 'bits' }, error: true }
    ]);
    T.prop('hamming-distance is the popcount of the XOR', 200, function (r) {
        var a = rbytes(r, r.num(1, 20)), b = rbytes(r, a.length), want = 0;
        a.forEach(function (x, i) { for (var y = x ^ b[i]; y; y &= y - 1) want++; });
        return T.run('hamming-distance', { a: hexOf(a), b: hexOf(b), mode: 'hex' }).then(function (o) { return o.copy === String(want) ? true : 'got ' + o.copy + ' want ' + want; });
    });

    /* ---------- IEEE 754 ---------- */
    T.tool('ieee754', [
        { in: { dir: 'dec', x: '0.1', prec: 'single' }, copy: '3DCCCCCD', check: function (S) { return pres(S).indexOf('0.100000001490116119384765625') >= 0 && pres(S).indexOf('-0.000000001490116119384765625') >= 0 ? true : 'exact value or error missing'; } },
        { in: { dir: 'dec', x: '0.1', prec: 'double' }, copy: '3FB999999999999A', check: function (S) { return pres(S).indexOf('0.1000000000000000055511151231257827021181583404541015625') >= 0 ? true : 'exact double 0.1 missing'; } },
        { in: { dir: 'dec', x: '-2.5', prec: 'single' }, copy: 'C0200000' },
        { in: { dir: 'dec', x: '-2.5', prec: 'double' }, copy: 'C004000000000000' },
        { in: { dir: 'dec', x: '1', prec: 'single' }, copy: '3F800000' },
        { in: { dir: 'dec', x: '1e-45', prec: 'single' }, copy: '00000001' },
        { in: { dir: 'dec', x: '7e-46', prec: 'single' }, copy: '00000000' },
        { in: { dir: 'dec', x: '8e-46', prec: 'single' }, copy: '00000001' },
        { in: { dir: 'dec', x: '1.1754942e-38', prec: 'single' }, copy: '007FFFFF' },
        { in: { dir: 'dec', x: '1.17549435e-38', prec: 'single' }, copy: '00800000' },
        { in: { dir: 'dec', x: '3.4028235e38', prec: 'single' }, copy: '7F7FFFFF' },
        { in: { dir: 'dec', x: '3.4028236e38', prec: 'single' }, copy: '7F800000' },
        { in: { dir: 'dec', x: '1e39', prec: 'single' }, copy: '7F800000' },
        { in: { dir: 'dec', x: '-1e500', prec: 'double' }, copy: 'FFF0000000000000' },
        { in: { dir: 'dec', x: '1e-500', prec: 'double' }, copy: '0000000000000000' },
        { in: { dir: 'dec', x: '16777217', prec: 'single' }, copy: '4B800000' },
        { in: { dir: 'dec', x: '16777219', prec: 'single' }, copy: '4B800002' },
        { in: { dir: 'dec', x: '0.5', prec: 'single' }, copy: '3F000000' },
        { in: { dir: 'dec', x: '0.3', prec: 'single' }, copy: '3E99999A' },
        { in: { dir: 'dec', x: '6.02214076e23', prec: 'double' }, copy: '44DFE185CA57C517' },
        { in: { dir: 'dec', x: '5e-324', prec: 'double' }, copy: '0000000000000001' },
        { in: { dir: 'dec', x: '2.2250738585072014e-308', prec: 'double' }, copy: '0010000000000000' },
        { in: { dir: 'dec', x: '1.7976931348623157e308', prec: 'double' }, copy: '7FEFFFFFFFFFFFFF' },
        { in: { dir: 'dec', x: 'Infinity', prec: 'single' }, copy: '7F800000' },
        { in: { dir: 'dec', x: '-inf', prec: 'double' }, copy: 'FFF0000000000000' },
        { in: { dir: 'dec', x: 'NaN', prec: 'single' }, copy: '7FC00000' },
        { in: { dir: 'dec', x: 'NaN', prec: 'double' }, copy: '7FF8000000000000' },
        { in: { dir: 'dec', x: '0', prec: 'single' }, copy: '00000000' },
        { in: { dir: 'dec', x: '-0', prec: 'single' }, copy: '80000000' },
        { in: { dir: 'dec', x: '.5', prec: 'single' }, copy: '3F000000' },
        { in: { dir: 'dec', x: '1.2.3', prec: 'single' }, error: true },
        { in: { dir: 'dec', x: 'abc', prec: 'single' }, error: true },
        { in: { dir: 'bits', bits: '3DCCCCCD' }, copy: '0.1' },
        { in: { dir: 'bits', bits: '0x3E99999A' }, copy: '0.3' },
        { in: { dir: 'bits', bits: '00000001' }, copy: '1e-45' },
        { in: { dir: 'bits', bits: '7F7FFFFF' }, copy: '3.4028235e+38' },
        { in: { dir: 'bits', bits: '7F800000' }, copy: 'Infinity' },
        { in: { dir: 'bits', bits: 'FF800000' }, copy: '-Infinity' },
        { in: { dir: 'bits', bits: '7FC00000' }, copy: 'NaN' },
        { in: { dir: 'bits', bits: '7F800001' }, copy: 'NaN' },
        { in: { dir: 'bits', bits: '80000000' }, copy: '-0' },
        { in: { dir: 'bits', bits: 'C0200000' }, copy: '-2.5' },
        { in: { dir: 'bits', bits: '1100 0000 0010 0000 0000 0000 0000 0000' }, copy: '-2.5' },
        { in: { dir: 'bits', bits: '3FB999999999999A' }, copy: '0.1' },
        { in: { dir: 'bits', bits: '0000000000000001' }, copy: '5e-324' },
        { in: { dir: 'bits', bits: '7FEFFFFFFFFFFFFF' }, copy: '1.7976931348623157e+308' },
        { in: { dir: 'bits', bits: '12345' }, error: true },
        { in: { dir: 'bits', bits: '3DCCCCCG' }, error: true }
    ]);
    function f64bits(x) { var dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x); return (BigInt(dv.getUint32(0)) << 32n | BigInt(dv.getUint32(4))).toString(16).toUpperCase().padStart(16, '0'); }
    function f32bits(x) { var dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, x); return dv.getUint32(0).toString(16).toUpperCase().padStart(8, '0'); }
    T.prop('ieee754 double against the JavaScript parser, both ways', 400, function (r) {
        var w = r.int(0, (1n << 64n) - 1n), dv = new DataView(new ArrayBuffer(8));
        dv.setUint32(0, Number(w >> 32n)); dv.setUint32(4, Number(w & 0xFFFFFFFFn));
        var x = dv.getFloat64(0);
        if (x !== x) return true;
        var s = Object.is(x, -0) ? '-0' : String(x), hex = f64bits(x);
        return T.run('ieee754', { dir: 'dec', x: s, prec: 'double' }).then(function (o) {
            if (o.copy !== hex) return s + ': got ' + o.copy + ' want ' + hex;
            return T.run('ieee754', { dir: 'bits', bits: hex }).then(function (p) { return p.copy === s ? true : hex + ' printed as ' + p.copy + ', want ' + s; });
        });
    });
    T.prop('ieee754 single against Math.fround and shortest digits', 400, function (r) {
        var digits = r.num(1, 9), m = String(r.int(1, 10n ** BigInt(digits) - 1n)), e = r.num(-50, 40), s = (r.num(0, 1) ? '-' : '') + m + 'e' + e;
        var hex = f32bits(Math.fround(Number(s)));
        return T.run('ieee754', { dir: 'dec', x: s, prec: 'single' }).then(function (o) {
            if (o.copy !== hex) return s + ': got ' + o.copy + ' want ' + hex;
            return T.run('ieee754', { dir: 'bits', bits: hex }).then(function (p) {
                if (/Infinity/.test(p.copy)) return true;
                return f32bits(Math.fround(Number(p.copy))) === hex && p.copy.replace(/^-|e.*$|\./g, '').replace(/^0+|0+$/g, '').length <= 9 ? true : hex + ' printed as ' + p.copy;
            });
        });
    });
    T.ok('ieee754 lib: exact values', Calc.tools.ieee754.lib.exact(1n, -3) === '0.125' && Calc.tools.ieee754.lib.exact(3n, 4) === '48');

    /* ---------- hash functions: FIPS 180 and RFC 1321 test vectors, then random lengths against node's crypto ---------- */
    var M448 = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    var M896 = 'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu';
    T.tool('hash', [
        { in: { input: 'abc', form: 'text', alg: 'sha256' }, copy: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
        { in: { input: '', form: 'text', alg: 'sha256' }, copy: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
        { in: { input: M448, form: 'text', alg: 'sha256' }, copy: '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1' },
        { in: { input: M896, form: 'text', alg: 'sha256' }, copy: 'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1' },
        { in: { input: '616263', form: 'hex', alg: 'sha256' }, copy: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
        { in: { input: 'abc', form: 'text', alg: 'sha1' }, copy: 'a9993e364706816aba3e25717850c26c9cd0d89d' },
        { in: { input: '', form: 'text', alg: 'sha1' }, copy: 'da39a3ee5e6b4b0d3255bfef95601890afd80709' },
        { in: { input: M448, form: 'text', alg: 'sha1' }, copy: '84983e441c3bd26ebaae4aa1f95129e5e54670f1' },
        { in: { input: M896, form: 'text', alg: 'sha1' }, copy: 'a49b2446a02c645bf419f995b67091253a04a259' },
        { in: { input: '', form: 'text', alg: 'md5' }, copy: 'd41d8cd98f00b204e9800998ecf8427e' },
        { in: { input: 'abc', form: 'text', alg: 'md5' }, copy: '900150983cd24fb0d6963f7d28e17f72' },
        { in: { input: 'message digest', form: 'text', alg: 'md5' }, copy: 'f96b697d7cb7938d525a2f31aaf161d0' },
        { in: { input: 'The quick brown fox jumps over the lazy dog', form: 'text', alg: 'md5' }, copy: '9e107d9d372bb6826bd81d3542a419d6' },
        { in: { input: '12345678901234567890123456789012345678901234567890123456789012345678901234567890', form: 'text', alg: 'md5' }, copy: '57edf4a22be3c955ac49da2e2107b67a' },
        { in: { input: 'abc', form: 'hex', alg: 'sha256' }, error: true }
    ]);
    T.ok('hash: SHA-256 constants from the roots of the primes', (function () {
        var L = Calc.tools.hash.lib;
        return L.K256.length === 64 && L.K256[0] === 0x428a2f98 && L.K256[1] === 0x71374491 && L.K256[63] === 0xc67178f2 && L.H256[0] === 0x6a09e667 && L.H256[7] === 0x5be0cd19;
    })());
    T.prop('hash against node crypto', 240, function (r, i) {
        if (!CRYPTO) return true;
        var alg = ['sha256', 'sha1', 'md5'][i % 3], n = i < 150 ? Math.floor(i / 3) + 30 : r.num(0, 700), b = rbytes(r, n);
        var want = CRYPTO.createHash(alg).update(Buffer.from(b)).digest('hex'), got = Calc.tools.hash.lib.hash(alg, b);
        return got === want ? true : alg + ' of ' + n + ' bytes';
    });
    T.prop('hash tool on text against node crypto', 30, function (r, i) {
        if (!CRYPTO) return true;
        var s = rtext(r, r.num(0, 80)), alg = ['sha256', 'sha1', 'md5'][i % 3];
        return T.run('hash', { input: s, form: 'text', alg: alg }).then(function (o) { return o.copy === CRYPTO.createHash(alg).update(s, 'utf8').digest('hex') ? true : alg + ' of ' + JSON.stringify(s); });
    });

    /* ---------- number and text ---------- */
    T.tool('number-text', [
        { in: { input: 'Hi', out: 'dec' }, copy: '18537' },
        { in: { input: 'Hi', out: 'hex' }, copy: '0x4869' },
        { in: { input: '\u0001', out: 'hex' }, copy: '0x1' },
        { in: { input: '', out: 'dec' }, copy: '0' },
        { in: { input: '18537' }, action: 'toText', copy: 'Hi' },
        { in: { input: '0x4869' }, action: 'toText', copy: 'Hi' },
        { in: { input: '0x48656c6c6f2c20f09f8c8d' }, action: 'toText', copy: 'Hello, 🌍' },
        { in: { input: '0' }, action: 'toText', copy: '' },
        { in: { input: '255' }, action: 'toText', copy: '�' },
        { in: { input: '-5' }, action: 'toText', error: true },
        { in: { input: 'hello' }, action: 'toText', error: true },
        { in: { input: '' }, action: 'toText', error: true }
    ]);
    T.prop('number-text round trip', 200, function (r) {
        var s = rtext(r, r.num(1, 20));
        if (s.charAt(0) === '\u0000') return true;
        return T.run('number-text', { input: s, out: r.pick(['dec', 'hex']) }, 'toNum').then(function (o) {
            if (BigInt(o.copy) !== BigInt('0x' + Buffer.from(s, 'utf8').toString('hex'))) return 'number of ' + JSON.stringify(s);
            return T.run('number-text', { input: o.copy }, 'toText');
        }).then(function (o) { return typeof o === 'string' ? o : o.copy === s ? true : JSON.stringify(s) + ' came back as ' + JSON.stringify(o.copy); });
    });
})();
