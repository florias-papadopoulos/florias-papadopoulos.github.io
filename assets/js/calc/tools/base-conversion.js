/* Toolbox: whole numbers between bases. Horner's scheme to read the digits of the source base, repeated division to
   write the digits of the target base, negative numbers by their sign. Bases 2 to 36 use 0-9 and A-Z, base 64 the
   Base64 alphabet, any other base (up to 2^32) a list of digit values such as 1 22 15. */
(function () {
    'use strict';
    var D36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var D64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var MAXDIG = 3000;
    function kind(b) { return b <= 36n ? 'chars' : b === 64n ? 'b64' : 'list'; }
    /* digit values (BigInt, most significant first) to text */
    function show(ds, b) {
        var kd = kind(b);
        if (kd === 'list') return ds.map(String).join(' ');
        var A = kd === 'b64' ? D64 : D36;
        return ds.map(function (d) { return A.charAt(Number(d)); }).join('');
    }
    function digitName(d, b) {
        var kd = kind(b);
        if (kd === 'list') return String(d);
        return (kd === 'b64' ? D64 : D36).charAt(Number(d));
    }
    function parse(src, b) {
        var s = String(src).trim(), neg = false, kd = kind(b);
        if (s.charAt(0) === '-' || s.charAt(0) === '\u2212') { neg = true; s = s.slice(1).trim(); }
        else if (s.charAt(0) === '+' && kd !== 'b64') s = s.slice(1).trim();
        var ds = [];
        if (kd === 'list') {
            var parts = s.split(/[\s,:;]+/).filter(Boolean);
            if (!parts.length) Calc.fail('Please enter the digits.', 'num');
            parts.forEach(function (p, i) {
                if (!/^\d+$/.test(p)) Calc.fail('In base ' + b + ' write the digits as decimal numbers separated by spaces (digit ' + (i + 1) + ' is "' + p + '").', 'num');
                var d = BigInt(p);
                if (d >= b) Calc.fail('Digit ' + (i + 1) + ' is ' + p + ', but base ' + b + ' only has the digits 0 to ' + (b - 1n) + '.', 'num');
                ds.push(d);
            });
        } else {
            s = s.replace(/[\s_]/g, '');
            if (kd === 'chars') {
                var pre = { 16: /^0x/i, 2: /^0b/i, 8: /^0o/i }[String(b)];
                if (pre) s = s.replace(pre, '');
            }
            if (!s) Calc.fail('Please enter a number.', 'num');
            for (var i = 0; i < s.length; i++) {
                var c = Calc.chr(s, i), d = kd === 'b64' ? D64.indexOf(c) : D36.indexOf(c.toUpperCase());
                if (d < 0) Calc.fail('"' + c + '" is not a digit' + (kd === 'b64' ? ' of Base64 (A-Z, a-z, 0-9, + and /).' : '.'), 'num');
                if (BigInt(d) >= b) Calc.fail('"' + c + '" is worth ' + d + ', too much for base ' + b + ' (digits 0 to ' + (b - 1n) + ').', 'num');
                ds.push(BigInt(d));
            }
        }
        if (ds.length > MAXDIG) Calc.fail('At most ' + MAXDIG + ' digits.', 'num');
        while (ds.length > 1 && ds[0] === 0n) ds.shift();
        return { neg: neg, ds: ds };
    }
    function toDigits(N, b) {
        if (N === 0n) return [0n];
        var ds = [];
        while (N > 0n) { ds.unshift(N % b); N /= b; }
        return ds;
    }
    /* digits inside math, in a monospaced font */
    function tt(s) { return Calc.tt(s).replace(/^\\text\{/, '\\texttt{'); }
    function value(ds, b) { return ds.reduce(function (acc, d) { return acc * b + d; }, 0n); }
    function texNum(ds, b, neg) {
        var txt = show(ds, b);
        if (txt.length > 70) return null;
        return (neg ? '-' : '') + '(' + tt(kind(b) === 'list' ? ds.map(String).join(', ') : txt) + ')_{' + b + '}';
    }

    Calc.tool({
        id: 'base-conversion',
        live: true,
        inputs: [
            { id: 'num', type: 'text', label: 'Number', width: 'l', placeholder: '2024', maxLength: 12000, help: 'Digits 0-9 and A-Z (case does not matter); in base 64 the Base64 alphabet; above base 36 otherwise, digit values separated by spaces (1 22 15).' },
            { id: 'from', label: 'From base', placeholder: '10', min: 2, max: 4294967296, width: 's' },
            { id: 'to', label: 'To base', placeholder: '2', min: 2, max: 4294967296, width: 's' }
        ],
        examples: [{ num: '2024', from: '10', to: '2' }, { num: 'FF', from: '16', to: '10' }, { num: '-1011010', from: '2', to: '16' }, { num: '5025', from: '10', to: '60' }, { num: '1 23 45', from: '60', to: '10' }, { num: 'TWFu', from: '64', to: '16' }, { num: 'ZZ', from: '36', to: '8' }],
        run: function (v, S) {
            var T = Calc.tex, nt = Calc.lib.nt, b = v.from, c = v.to;
            var inp = parse(v.num, b), ds = inp.ds, neg = inp.neg && !(ds.length === 1 && ds[0] === 0n);
            var N = value(ds, b);
            if (Math.max(ds.length, nt.bitLength(N) / Math.log2(Number(c))) * nt.bitLength(N) > 4194304) Calc.fail('This number is too long to show every step in these bases (2048 bits to base 2, or 4096 bits to base 16, are fine).', 'num');
            var out = toDigits(N, c), outTxt = (neg ? '-' : '') + show(out, c);
            var tin = texNum(ds, b, neg), tout = texNum(out, c, neg);
            if (tin && tout) S.result('$' + tin + ' = ' + tout + '$', { copy: outTxt });
            else S.result(['In base ' + c + ':', Calc.esc(outTxt)], { copy: outTxt });
            if (neg) S.note('The sign stays in front: only the digits of $|x|$ are converted.');

            if (neg) S.step('The sign').p('A minus sign means the same in every base, so convert $|x|$ and put the sign back at the end.');

            /* 1. digits of base b to the value */
            var s1 = S.step(b === 10n ? 'Read the number' : 'From base ' + b + ' to the value: Horner\'s scheme');
            if (b === 10n) s1.p('The number is given in base 10: $' + T(N) + '$.');
            else {
                var L = ds.length;
                if (kind(b) === 'b64' || (kind(b) === 'chars' && ds.some(function (d) { return d >= 10n; }))) {
                    var seen = {}, map = [];
                    ds.forEach(function (d) { var nm = digitName(d, b); if (!seen[nm] && (d >= 10n || kind(b) === 'b64')) { seen[nm] = 1; map.push('$' + tt(nm) + ' = ' + T(d) + '$'); } });
                    s1.p('The digit values: ' + map.slice(0, 40).join(', ') + (map.length > 40 ? ', ...' : '') + '.');
                }
                if (L <= 10) {
                    s1.p('Each digit counts a power of ' + b + ', by its place from the right (place 0):');
                    s1.math(T(N) + ' = ' + ds.map(function (d, i) { return T(d) + ' \\cdot ' + T(b) + '^{' + (L - 1 - i) + '}'; }).join(' + '));
                }
                s1.p('Horner\'s scheme computes the same with one multiplication per digit: start at 0, and for each digit from the left, multiply by ' + b + ' and add the digit.');
                var plainDigits = kind(b) === 'list' || b <= 10n;
                var acc = 0n, rows = ds.map(function (d) {
                    var prev = acc;
                    acc = acc * b + d;
                    var r1 = ['$' + T(d) + '$', '$' + T(prev) + ' \\cdot ' + T(b) + ' + ' + T(d) + ' = ' + T(acc) + '$'];
                    return plainDigits ? r1 : ['$' + tt(digitName(d, b)) + '$'].concat(r1);
                });
                s1.table(plainDigits ? ['Digit', 'Running value'] : ['Digit', 'Value', 'Running value'], rows, { hl: rows.length - 1 });
                s1.p('So the number is $' + T(N) + '$ (in base 10).');
            }

            /* 2. the value to base c */
            var s2 = S.step(c === 10n ? 'Write it in base 10' : 'From the value to base ' + c + ': repeated division');
            if (c === 10n) s2.p('Base 10 is how the value is written already: $' + T(N) + '$.');
            else if (N === 0n) s2.p('Zero is written $0$ in every base.');
            else {
                s2.p('Divide by ' + c + ' and keep the remainder: it is the last digit. Then divide the quotient again, until the quotient is 0. The remainders, read from the bottom up, are the digits.');
                var x = N, rr = [];
                while (x > 0n) {
                    var q = x / c, r = x % c;
                    rr.push(['$' + T(x) + ' \\div ' + T(c) + '$', '$' + T(q) + '$', '$' + T(r) + '$', '$' + tt(digitName(r, c)) + '$'].slice(0, kind(c) === 'list' || c <= 10n ? 3 : 4));
                    x = q;
                }
                s2.table(['Division', 'Quotient', 'Remainder', 'Digit'].slice(0, kind(c) === 'list' || c <= 10n ? 3 : 4), rr, { hl: rr.length - 1 });
                s2.p('Bottom to top: ' + (show(out, c).length <= 200 ? '$' + tt(show(out, c)) + '$' : Calc.esc(show(out, c).slice(0, 200)) + '...') + ' (' + out.length + ' digit' + (out.length === 1 ? '' : 's') + ').');
            }

            /* 3. check */
            var s3 = S.step('Check');
            var back = value(out, c);
            if (out.length <= 10 && c !== 10n) s3.math(out.map(function (d, i) { return T(d) + ' \\cdot ' + T(c) + '^{' + (out.length - 1 - i) + '}'; }).join(' + ') + ' = ' + T(back));
            s3.check(back === N, 'The new digits are worth $' + T(back) + '$, the same value' + (b === c ? ' (the base did not change)' : ''));

            /* 4. the usual bases */
            if (N < 2n ** 256n) {
                var sg = neg ? '-' : '';
                S.step('In the usual bases').table(['Base', 'Digits'], [[2, sg + toDigits(N, 2n).join('')], [8, sg + show(toDigits(N, 8n), 8n)], [10, sg + String(N)], [16, sg + show(toDigits(N, 16n), 16n)], [36, sg + show(toDigits(N, 36n), 36n)]].map(function (r) {
                    return [{ v: String(r[0]), hl: BigInt(r[0]) === b || BigInt(r[0]) === c }, Calc.esc(r[1])];
                }), { mono: true });
            }
        }
    });
})();
