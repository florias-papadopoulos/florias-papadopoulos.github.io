/* Toolbox: XOR of data with a repeating key, byte by byte with the bits, and the check that XOR twice gives the data back. */
Calc.tool({
    id: 'xor',
    live: true,
    inputs: [
        { id: 'data', type: 'textarea', label: 'Data', rows: 3, maxLength: 20000, placeholder: 'Hello' },
        { id: 'dform', type: 'select', label: 'Data is', value: 'text', options: [['text', 'Text (UTF-8)'], ['hex', 'Hex digits']] },
        { id: 'key', type: 'text', label: 'Key', width: 'l', placeholder: 'key', maxLength: 5000 },
        { id: 'kform', type: 'select', label: 'Key is', value: 'text', options: [['text', 'Text (UTF-8)'], ['hex', 'Hex digits']] },
        { id: 'out', type: 'select', label: 'Show the result as', value: 'hex', options: [['hex', 'Hex'], ['text', 'Text (UTF-8)']] }
    ],
    button: 'XOR',
    examples: [{ data: 'Hello', dform: 'text', key: 'key', kform: 'text', out: 'hex' }, { data: '23 00 15 07 0a', dform: 'hex', key: 'key', kform: 'text', out: 'text' },
        { data: 'attack at dawn', dform: 'text', key: 'ff', kform: 'hex', out: 'hex' }, { data: '1c0111001f010100061a024b53535009181c', dform: 'hex', key: '686974207468652062756c6c277320657965', kform: 'hex', out: 'hex' }],
    run: function (v, S) {
        var E = Calc.lib.enc;
        var data = E.readBytes(v.data, v.dform, 'data'), key = E.readBytes(v.key, v.kform, 'key');
        if (!data.length) Calc.fail('There are no data bytes.', 'data');
        if (!key.length) Calc.fail('The key has no bytes.', 'key');
        var res = data.map(function (b, i) { return b ^ key[i % key.length]; });
        var hex = E.hex(res, '').toLowerCase();
        if (v.out === 'text') {
            var d = E.utf8Decode(res);
            S.result(Calc.esc(d.text), { copy: d.text, label: 'Result (text)' });
            if (d.errors) S.note('The result is not valid UTF-8 text: as hex it is ' + hex + '.');
        } else S.result(hex, { copy: hex, label: 'Result (hex)' });

        var s1 = S.step('Write data and key as bytes');
        s1.p('Data, ' + data.length + ' byte' + (data.length === 1 ? '' : 's') + (v.dform === 'text' ? ' (the UTF-8 encoding of the text)' : '') + ':').pre(E.hex(data));
        s1.p('Key, ' + key.length + ' byte' + (key.length === 1 ? '' : 's') + ':').pre(E.hex(key));
        var s2 = S.step('Repeat the key to the length of the data');
        if (key.length >= data.length) s2.p(key.length === data.length ? 'The key is exactly as long as the data, so each key byte is used once.' : 'The key is longer than the data; only its first ' + data.length + ' byte' + (data.length === 1 ? ' is' : 's are') + ' used.');
        else s2.p('Byte $i$ of the data is combined with key byte $i \\bmod ' + key.length + '$; the key is used ' + (data.length / key.length).toFixed(2).replace(/\.00$/, '') + ' times.');
        s2.pre(E.hex(data.map(function (b, i) { return key[i % key.length]; })));
        var s3 = S.step('XOR bit by bit');
        s3.p('XOR gives 1 where the two bits differ and 0 where they agree: $0 \\oplus 0 = 0$, $0 \\oplus 1 = 1 \\oplus 0 = 1$, $1 \\oplus 1 = 0$.');
        s3.table(['$i$', 'Data', 'Key', 'Data bits', 'Key bits', 'XOR', 'Hex', 'As text'], data.map(function (b, i) {
            var k = key[i % key.length], r = res[i];
            return [i, E.hex2(b), E.hex2(k), E.bin(b), E.bin(k), { v: E.bin(r), hl: true }, E.hex2(r), E.ascii(r)];
        }), { mono: true });
        var back = res.map(function (b, i) { return b ^ key[i % key.length]; });
        var c = S.step('Check: XOR with the same key again');
        c.p('Since $(d \\oplus k) \\oplus k = d \\oplus (k \\oplus k) = d \\oplus 0 = d$, the same operation decrypts.');
        c.check(back.every(function (b, i) { return b === data[i]; }), 'The result XOR the key gives the data back: ' + E.hex(back.slice(0, 16)) + (back.length > 16 ? ' ...' : ''));
        if (key.length < data.length) S.note('A short repeating key is easy to break (the Vigenère idea on bytes). Only a truly random key as long as the data and used once, the one-time pad, is secure.');
    }
});
