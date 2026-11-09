/* Toolbox: percent-encoding (URL encoding) of each UTF-8 byte, and decoding, with the different safe sets. */
Calc.tool({
    id: 'url-encoding',
    live: true,
    inputs: [
        { id: 'input', type: 'textarea', label: 'Text, or encoded text to decode', rows: 3, optional: true, maxLength: 20000, placeholder: 'a b&c=é' },
        { id: 'mode', type: 'select', label: 'Rules', width: 'l', value: 'component', options: [
            ['component', 'A part of a URL (like encodeURIComponent)'],
            ['strict', 'RFC 3986 strict (only A-Z a-z 0-9 - . _ ~ kept)'],
            ['form', 'HTML form data (space as +)'],
            ['uri', 'A whole URL (like encodeURI)']
        ] }
    ],
    actions: [{ id: 'enc', label: 'Encode' }, { id: 'dec', label: 'Decode' }],
    examples: [{ input: 'a b&c=é', mode: 'component' }, { input: 'caf%C3%A9%20%E2%82%AC5', mode: 'component', _action: 'dec' },
        { input: 'name=Jean Dupont & fils', mode: 'form' }, { input: 'https://example.org/a path/?q=1&r=ü#top', mode: 'uri' }],
    run: function (v, S) {
        var E = Calc.lib.enc, AN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var KEEP = { component: AN + "-_.!~*'()", strict: AN + '-._~', form: AN + '*-._', uri: AN + "-_.!~*'();,/?:@&=+$#" }[v.mode];
        var EXTRA0 = { component: "- _ . ! ~ * ' ( )", strict: '- . _ ~', form: '* - . _', uri: "- _ . ! ~ * ' ( ) and the URL separators ; , / ? : @ & = + $ #" }[v.mode], EXTRA = Calc.esc(EXTRA0);
        if (v._action === 'dec') return decode();

        var chars = E.utf8Chars(v.input), out = '', rows = [], nEnc = 0;
        chars.forEach(function (c) {
            var o, how;
            if (c.cp < 128 && KEEP.indexOf(c.ch) >= 0) { o = c.ch; how = 'kept'; }
            else if (v.mode === 'form' && c.cp === 32) { o = '+'; how = 'space becomes +'; nEnc++; }
            else { o = c.bytes.map(function (b) { return '%' + E.hex2(b); }).join(''); how = c.bytes.length === 1 ? 'one byte' : c.bytes.length + ' UTF-8 bytes'; nEnc++; }
            out += o;
            rows.push([E.show(c.cp, c.ch), how, how === 'kept' ? '' : E.hex(c.bytes), how === 'kept' ? Calc.esc(o) : { v: Calc.esc(o), hl: true }]);
        });
        S.result(chars.length ? Calc.esc(out) : '(empty)', { copy: out, label: 'Encoded' });
        if (!chars.length) return;
        var s1 = S.step('Which characters stay as they are');
        s1.p('Letters A-Z and a-z, digits 0-9 and ' + EXTRA + ' are kept. Every other character is replaced by its UTF-8 bytes, each written as % and two hex digits.' + (v.mode === 'form' ? ' In form data a space becomes +.' : ''));
        if (v.mode === 'uri') s1.p('The separators are kept so that the URL keeps its structure; use the rules for a part of a URL to encode a value that contains & or =.');
        var s2 = S.step('Encode character by character');
        s2.p(nEnc ? nEnc + ' of the ' + chars.length + ' characters are encoded.' : 'Nothing needs to be encoded.');
        s2.table(['Character', 'Rule', 'Bytes (hex)', 'Output'], rows, { mono: true });
        S.step('Join the pieces').pre(out);

        function decode() {
            var src = v.input, bytes = [], rows2 = [], i = 0;
            while (i < src.length) {
                var c = src.charAt(i);
                if (c === '%') {
                    var h = src.substr(i + 1, 2);
                    if (!/^[0-9a-f]{2}$/i.test(h)) Calc.fail('At position ' + (i + 1) + ', % must be followed by two hex digits (found "' + src.substr(i, 3) + '"). A literal % is written %25.', 'input');
                    var b = parseInt(h, 16);
                    bytes.push(b);
                    rows2.push(['%' + h.toUpperCase(), { v: E.hex2(b), hl: true }, 'one byte']);
                    i += 3;
                    continue;
                }
                var cp = E.codePoints(src.slice(i, i + 2))[0];
                if (c === '+' && v.mode === 'form') { bytes.push(32); rows2.push(['+', '20', 'space']); i++; continue; }
                var bs = E.utf8Char(cp.cp);
                Array.prototype.push.apply(bytes, bs);
                rows2.push([E.show(cp.cp, cp.ch), E.hex(bs), 'literal']);
                i += cp.ch.length;
            }
            var s = S.step('Turn every %XX into a byte');
            if (!src.length) s.p('The text is empty.');
            else {
                s.p('Each % with two hex digits is one byte; any other character stands for its own UTF-8 bytes' + (v.mode === 'form' ? ', and + is a space (form data).' : '. (A + stays a +; choose form data if + means a space.)'));
                s.table(['Piece', 'Bytes (hex)', 'Kind'], rows2, { mono: true });
            }
            var d = E.textStep(S, bytes, 'Read the bytes as UTF-8');
            S.result(src.length ? Calc.esc(d.text) : '(empty)', { copy: d.text, label: 'Decoded' });
            if (d.errors) S.note('The bytes are not valid UTF-8 (' + d.errors + ' invalid sequence' + (d.errors === 1 ? '' : 's') + '): perhaps the text was encoded with Latin-1. JavaScript\'s decodeURIComponent would refuse it.');
        }
    }
});
