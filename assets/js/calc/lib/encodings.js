/* Toolbox: bytes, UTF-8, hex and bits for the encoding tools (Calc.lib.enc). Pure functions, no page code. Written
   by hand (no TextEncoder) so that it behaves the same in every browser and in node. */
(function (G) {
    'use strict';
    var Calc = G.Calc;
    var enc = Calc.lib.enc = {};

    /* the code points of a string, as [{cp, ch}]; a lone surrogate (invalid UTF-16) is kept with lone: true */
    enc.codePoints = function (s) {
        var out = [];
        s = String(s);
        for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
                var d = s.charCodeAt(i + 1);
                if (d >= 0xDC00 && d <= 0xDFFF) { out.push({ cp: (c - 0xD800) * 0x400 + (d - 0xDC00) + 0x10000, ch: s.charAt(i) + s.charAt(i + 1) }); i++; continue; }
            }
            out.push({ cp: c, ch: s.charAt(i), lone: c >= 0xD800 && c <= 0xDFFF });
        }
        return out;
    };
    enc.fromCodePoint = function (cp) {
        if (cp < 0x10000) return String.fromCharCode(cp);
        cp -= 0x10000;
        return String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
    };

    /* UTF-8 bytes of one code point (a surrogate becomes U+FFFD, as browsers do) */
    enc.utf8Char = function (cp) {
        if (cp >= 0xD800 && cp <= 0xDFFF) cp = 0xFFFD;
        if (cp < 0x80) return [cp];
        if (cp < 0x800) return [0xC0 | (cp >> 6), 0x80 | (cp & 63)];
        if (cp < 0x10000) return [0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
        return [0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
    };
    /* the UTF-8 bytes of a string */
    enc.utf8 = function (s) {
        var out = [];
        enc.codePoints(s).forEach(function (c) { Array.prototype.push.apply(out, enc.utf8Char(c.cp)); });
        return out;
    };
    /* per character: [{ch, cp, bytes}] */
    enc.utf8Chars = function (s) {
        return enc.codePoints(s).map(function (c) { return { ch: c.ch, cp: c.cp, lone: !!c.lone, bytes: enc.utf8Char(c.cp) }; });
    };

    /* UTF-8 decoding as the WHATWG Encoding standard does it: every invalid sequence (the longest start of a valid
       one, or one bad byte) becomes one U+FFFD. Returns {text, chars: [{start, bytes, cp, err}], errors}: err is null
       for a good character, else the reason. */
    enc.utf8Decode = function (bytes) {
        var chars = [], text = '', errors = 0, i = 0, n = bytes.length;
        function bad(start, end, why) { chars.push({ start: start, bytes: bytes.slice(start, end), cp: 0xFFFD, err: why }); text += '�'; errors++; }
        while (i < n) {
            var b = bytes[i], start = i, need, cp, lo = 0x80, hi = 0xBF;
            if (b < 0x80) { chars.push({ start: i, bytes: [b], cp: b, err: null }); text += String.fromCharCode(b); i++; continue; }
            if (b >= 0x80 && b <= 0xBF) { bad(i, i + 1, 'a continuation byte (10xxxxxx) without a lead byte'); i++; continue; }
            if (b === 0xC0 || b === 0xC1) { bad(i, i + 1, 'C0 and C1 never occur: they could only start an overlong 2-byte form'); i++; continue; }
            if (b >= 0xF5) { bad(i, i + 1, b >= 0xF8 ? 'no UTF-8 sequence starts with 11111xxx' : 'this lead byte would give a code point above U+10FFFF'); i++; continue; }
            if (b < 0xE0) { need = 1; cp = b & 0x1F; }
            else if (b < 0xF0) { need = 2; cp = b & 0x0F; if (b === 0xE0) lo = 0xA0; if (b === 0xED) hi = 0x9F; }
            else { need = 3; cp = b & 0x07; if (b === 0xF0) lo = 0x90; if (b === 0xF4) hi = 0x8F; }
            i++;
            var ok = true;
            for (var k = 0; k < need; k++) {
                if (i >= n) { bad(start, i, 'the sequence is cut off: ' + (need + 1) + ' bytes were announced, only ' + (i - start) + ' are there'); ok = false; break; }
                var c = bytes[i];
                if (c < lo || c > hi) {
                    var why = c < 0x80 || c > 0xBF ? 'byte ' + (k + 2) + ' should be a continuation byte 10xxxxxx'
                        : b === 0xE0 || b === 0xF0 ? 'overlong form: the code point fits in fewer bytes'
                        : b === 0xED ? 'this would be a surrogate (U+D800 to U+DFFF), which UTF-8 does not allow'
                        : 'this would be a code point above U+10FFFF';
                    bad(start, i, why);
                    ok = false;
                    break;
                }
                lo = 0x80; hi = 0xBF;
                cp = cp * 64 + (c & 63);
                i++;
            }
            if (ok) { chars.push({ start: start, bytes: bytes.slice(start, i), cp: cp, err: null }); text += enc.fromCodePoint(cp); }
        }
        return { text: text, chars: chars, errors: errors };
    };

    /* ---------- hex and bits ---------- */
    enc.hex2 = function (b, lower) { var h = (b < 16 ? '0' : '') + b.toString(16); return lower ? h : h.toUpperCase(); };
    enc.hex = function (bytes, sep, lower) { return bytes.map(function (b) { return enc.hex2(b, lower); }).join(sep == null ? ' ' : sep); };
    enc.bin = function (n, w) { var s = n.toString(2); while (s.length < (w || 8)) s = '0' + s; return s; };
    enc.pad = function (s, w, c) { s = String(s); while (s.length < w) s = (c || '0') + s; return s; };
    /* bytes from hex text: spaces, commas, colons, 0x and \x are ignored; field marks the input on error */
    enc.parseHex = function (src, field) {
        var s = String(src).replace(/0x/gi, ' ').replace(/\\x/gi, ' ').replace(/[\s,:;]+/g, '');
        var m = /[^0-9a-f]/i.exec(s);
        if (m) Calc.fail('"' + m[0] + '" is not a hex digit (only 0-9 and A-F).', field);
        if (s.length % 2) Calc.fail('An odd number of hex digits (' + s.length + '): every byte is two digits.', field);
        var out = [];
        for (var i = 0; i < s.length; i += 2) out.push(parseInt(s.substr(i, 2), 16));
        return out;
    };
    /* a string of 0 and 1 from binary text (spaces ignored) */
    enc.parseBits = function (src, field) {
        var s = String(src).replace(/0b/gi, ' ').replace(/[\s,_]+/g, '');
        var m = /[^01]/.exec(s);
        if (m) Calc.fail('"' + m[0] + '" is not a binary digit (only 0 and 1).', field);
        return s;
    };
    enc.bytesToBig = function (bytes) { var n = 0n; for (var i = 0; i < bytes.length; i++) n = (n << 8n) | BigInt(bytes[i]); return n; };
    /* big-endian bytes of n >= 0, at least len bytes */
    enc.bigToBytes = function (n, len) {
        var out = [];
        while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; }
        while (out.length < (len || 0)) out.unshift(0);
        return out;
    };
    /* read bytes as typed: form 'hex' (hex digits) or 'text' (UTF-8 of the text) */
    enc.readBytes = function (src, form, field) { return form === 'hex' ? enc.parseHex(src, field) : enc.utf8(src); };

    /* ---------- showing characters ---------- */
    var NAMES = { 0: 'NUL', 7: 'bell', 8: 'backspace', 9: 'tab', 10: 'line feed', 13: 'carriage return', 27: 'escape', 32: 'space', 127: 'DEL', 160: 'no-break space', 173: 'soft hyphen', 0x200B: 'zero width space', 0xFEFF: 'byte order mark', 0xFFFD: 'replacement character' };
    enc.uplus = function (cp) { return 'U+' + enc.pad(cp.toString(16).toUpperCase(), 4); };
    /* a rich string that shows one character safely: invisible ones by name, others as themselves (escaped) */
    enc.show = function (cp, ch) {
        if (NAMES[cp] && cp !== 0xFFFD) return '(' + NAMES[cp] + ')';
        if (cp < 32 || (cp >= 127 && cp < 160) || (cp >= 0xD800 && cp <= 0xDFFF) || (cp >= 0x300 && cp < 0x370) || (cp >= 0xFE00 && cp <= 0xFE0F) || cp === 0x200D) return '(' + enc.uplus(cp) + ')';
        return Calc.esc(ch != null ? ch : enc.fromCodePoint(cp));
    };
    /* a short rich preview of a byte as a character, for byte tables: printable ASCII as itself, else a dot */
    enc.ascii = function (b) { return b >= 33 && b < 127 ? Calc.esc(String.fromCharCode(b)) : b === 32 ? '(space)' : '.'; };
    /* the text, made safe for a rich string, and cut when long */
    enc.quote = function (s, max) {
        s = String(s);
        max = max || 60;
        var cps = enc.codePoints(s);
        if (cps.length > max) s = cps.slice(0, max).map(function (c) { return c.ch; }).join('') + '...';
        return Calc.esc(s);
    };
    /* bits in groups (a space every g bits, counted from the right when right is true) */
    enc.group = function (bits, g, right) {
        g = g || 8;
        var out = [];
        if (right) { for (var i = bits.length; i > 0; i -= g) out.unshift(bits.slice(Math.max(0, i - g), i)); }
        else for (var j = 0; j < bits.length; j += g) out.push(bits.slice(j, j + g));
        return out.join(' ');
    };

    /* ---------- steps shared by the tools ---------- */
    /* the step that turns the input into bytes (UTF-8 of the text, or hex digits read as bytes); returns the bytes */
    enc.bytesStep = function (S, src, form, field) {
        if (form === 'hex') {
            var bytes = enc.parseHex(src, field);
            var s = S.step('Read the hex digits as bytes');
            s.p(bytes.length ? 'Every two hex digits are one byte (16 times the first digit plus the second): ' + bytes.length + ' byte' + (bytes.length === 1 ? '' : 's') + '.' : 'There are no bytes.');
            if (bytes.length) s.table(['Byte', 'Hex', 'Decimal', 'Bits'], bytes.map(function (b, i) { return [i + 1, enc.hex2(b), b, enc.bin(b)]; }), { mono: true });
            return bytes;
        }
        var chars = enc.utf8Chars(src), out = [];
        var t = S.step('Encode the text as UTF-8 bytes');
        if (!chars.length) { t.p('The text is empty, so there are no bytes.'); return out; }
        chars.forEach(function (c) { Array.prototype.push.apply(out, c.bytes); });
        var ascii = chars.every(function (c) { return c.cp < 128; });
        t.p(ascii ? 'Every character here is ASCII, so each one is a single byte, its code: ' + out.length + ' byte' + (out.length === 1 ? '' : 's') + '.'
            : 'UTF-8 writes ASCII characters as one byte and other characters as 2 to 4 bytes: ' + chars.length + ' characters give ' + out.length + ' bytes.');
        t.table(['Character', 'Code point', 'UTF-8 bytes (hex)'], chars.map(function (c) { return [enc.show(c.cp, c.ch), enc.uplus(c.cp), enc.hex(c.bytes)]; }), { mono: true });
        return out;
    };
    /* the step that reads bytes back as UTF-8 text; returns the utf8Decode result */
    enc.textStep = function (S, bytes, title) {
        var d = enc.utf8Decode(bytes);
        var t = S.step(title || 'Read the bytes as UTF-8 text');
        if (!bytes.length) { t.p('There are no bytes, so the text is empty.'); return d; }
        t.p('A byte below 80 (hex) is an ASCII character by itself; a byte 110xxxxx, 1110xxxx or 11110xxx starts a character of 2, 3 or 4 bytes, and the next bytes are 10xxxxxx.');
        t.table(['Bytes (hex)', 'Code point', 'Character'], d.chars.map(function (c) {
            return c.err ? [{ v: enc.hex(c.bytes), hl: true }, { v: 'invalid', hl: true }, { v: Calc.esc(c.err), hl: true }] : [enc.hex(c.bytes), enc.uplus(c.cp), enc.show(c.cp)];
        }), { mono: true });
        if (d.errors) t.check(false, d.errors + ' invalid UTF-8 sequence' + (d.errors === 1 ? '' : 's') + ', shown as the replacement character (U+FFFD). The bytes are probably not text: choose hex output to see them as they are.');
        return d;
    };
})(typeof window !== 'undefined' ? window : globalThis);
