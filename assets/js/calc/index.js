/* The Toolbox tab (layouts/toolbox/list.html), three ways in:
   - the box: typed words filter the tools (every word must appear in the title, description or keywords, accents
     ignored; small typos, other words for the same thing and the start of a word count too, see wordMatch());
     pasted input that looks like something (a calculation, a number, a modular expression, Base64, hex, binary,
     Morse, a ciphertext...) or a request in words ("factor 360", "is 97 prime", "255 in binary") is recognised by
     guess() below, which offers the right tools as links that open them already filled in (the tool pages read
     their inputs from the address, see core.js). A calculation is also worked out at once (answer()), with or
     without "mod n", and shown above the links. Enter opens the first link;
   - the "What do you want to do?" tiles: one task at a time narrows the list to its tools (data/toolbox_tasks.yaml);
   - the categories, with jump links.
   Exported as window.ToolboxGuess for the tests (assets/js/calc/test/run.js). */
(function () {
    'use strict';

    /* ---------- recognising pasted input ---------- */
    var INT = /^-?\s*\d[\d_]*$/;
    var EXPR = /^[\d\s+\-*\/^!().,_]+$/;
    function words(s) { return (s.toLowerCase().match(/[a-z]+/g) || []); }
    var COMMON = ['the', 'and', 'of', 'to', 'is', 'in', 'that', 'it', 'you', 'for', 'was', 'with', 'this', 'are', 'be', 'have', 'not', 'on', 'what', 'my'];
    function looksEnglish(s) {
        var w = words(s);
        if (w.length < 4) return false;
        var hits = w.filter(function (x) { return COMMON.indexOf(x) >= 0; }).length;
        return hits / w.length > 0.12;
    }
    /* a whole number or a parenthesised group (a base of a power) */
    var ATOM = /^(\d[\d_]*|\([^()]+\))$/;
    /* "expr mod n", "expr (mod n)", "expr modulo n", "expr % n": {expr, n} with the modulus a whole number (or a small
       expression of one, like 2^61 - 1), else null */
    function splitMod(one) {
        var m = /^(.+?)\s*(?:\(\s*(?:mod|modulo)\s+([^()]+?)\s*\)|\b(?:mod|modulo)\s+(.+?)|%\s*([\d_]+))\s*$/i.exec(one);
        if (!m) return null;
        var n = (m[2] || m[3] || m[4] || '').trim();
        if (!/^[\d\s_+\-*^()]+$/.test(n) || !/\d/.test(n) || /^[0_]*1?$/.test(n.replace(/\s/g, ''))) return null;   /* mod 0 or mod 1: not a modulus */
        return { expr: m[1].trim(), n: n };
    }

    /* ---------- the answer of a calculation, worked out at once ----------
       Whole numbers with + - * / ^ (or **), parentheses, n! and gcd(), lcm(), abs(); exact fractions without a modulus,
       and with "mod n" every step reduced mod n (division is the modular inverse, powers by square and multiply, so
       374^34 * 345^394 mod 29332 is instant). Results too large to be useful are refused, the tools say why. */
    var MAXB = 100000;              /* bits of an exact result */
    function bitsOf(x) { if (x < 0n) x = -x; return x === 0n ? 0 : x.toString(2).length; }
    function gcdB(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a; }
    function stop(msg) { var e = new Error(msg); e.calc = true; throw e; }
    function parseCalc(src) {
        var s = String(src).replace(/[−–—]/g, '-').replace(/[×⋅·]/g, '*').replace(/÷/g, '/').replace(/\*\*/g, '^').replace(/[   ]/g, ' ');
        var i = 0, count = 0;
        function node(o) { if (++count > 400) stop('too long'); return o; }
        function ws() { while (i < s.length && /\s/.test(s.charAt(i))) i++; }
        function peek() { ws(); return s.charAt(i); }
        function primary() {
            var c = peek(), m;
            if (c === '(') {
                i++; var x = sum();
                if (peek() !== ')') stop('unbalanced'); i++;
                return x;
            }
            if ((m = /^(gcd|lcm|abs)\s*\(/i.exec(s.slice(i)))) {
                i += m[0].length;
                var args = [sum()];
                while (peek() === ',') { i++; args.push(sum()); }
                if (peek() !== ')') stop('unbalanced'); i++;
                return node({ t: m[1].toLowerCase(), args: args });
            }
            m = /^0x[0-9a-f]+|^0b[01]+|^0o[0-7]+|^\d[\d_]*/i.exec(s.slice(i));
            if (!m) stop('not a calculation');
            i += m[0].length;
            return node({ t: 'num', v: BigInt(m[0].replace(/_/g, '').toLowerCase()) });
        }
        function postfix() {
            var x = primary();
            while (peek() === '!') { i++; x = node({ t: 'fact', x: x }); }
            /* 2(3 + 4) and (1 + 2)(3 + 4): multiplication without a sign */
            return x;
        }
        function power() {
            var b = postfix();
            if (peek() === '^') { i++; return node({ t: 'pow', l: b, r: unary() }); }
            return b;
        }
        function unary() {
            var c = peek();
            if (c === '-') { i++; return node({ t: 'neg', x: unary() }); }
            if (c === '+') { i++; return unary(); }
            return power();
        }
        function term() {
            var x = unary();
            for (;;) {
                var c = peek();
                if (c === '*') { i++; x = node({ t: 'mul', l: x, r: unary() }); }
                else if (c === '/') { i++; x = node({ t: 'div', l: x, r: unary() }); }
                else if (c === '(') x = node({ t: 'mul', l: x, r: unary() });
                else return x;
            }
        }
        function sum() {
            var x = term();
            for (;;) {
                var c = peek();
                if (c === '+') { i++; x = node({ t: 'add', l: x, r: term() }); }
                else if (c === '-') { i++; x = node({ t: 'sub', l: x, r: term() }); }
                else return x;
            }
        }
        var x = sum();
        if (peek() !== '') stop('not a calculation');
        return x;
    }
    /* exact: fractions {n, d} with d > 0, in lowest terms */
    function frac(n, d) {
        if (d === 0n) stop('Division by zero.');
        if (d < 0n) { n = -n; d = -d; }
        var g = gcdB(n, d);
        if (g > 1n) { n /= g; d /= g; }
        if (bitsOf(n) > MAXB || bitsOf(d) > MAXB) stop('The result is too large to show here.');
        return { n: n, d: d };
    }
    function whole(f, what) { if (f.d !== 1n) stop((what || 'This') + ' must be a whole number.'); return f.n; }
    function exact(x) {
        switch (x.t) {
            case 'num': return frac(x.v, 1n);
            case 'neg': var a = exact(x.x); return frac(-a.n, a.d);
            case 'add': case 'sub': case 'mul': case 'div':
                var l = exact(x.l), r = exact(x.r);
                if (x.t === 'add') return frac(l.n * r.d + r.n * l.d, l.d * r.d);
                if (x.t === 'sub') return frac(l.n * r.d - r.n * l.d, l.d * r.d);
                if (x.t === 'mul') return frac(l.n * r.n, l.d * r.d);
                return frac(l.n * r.d, l.d * r.n);
            case 'pow':
                var b = exact(x.l), e = whole(exact(x.r), 'An exponent'), neg = e < 0n;
                if (neg) e = -e;
                if (e > 0n && (b.n > 1n || b.n < -1n || b.d > 1n) && BigInt(Math.max(bitsOf(b.n), bitsOf(b.d)) - 1) * e > BigInt(MAXB)) stop('The result is too large to show here: add "mod n" to work modulo n.');
                var p = frac(b.n ** e, b.d ** e);
                return neg ? frac(p.d, p.n) : p;
            case 'fact':
                var k = whole(exact(x.x), 'A factorial');
                if (k < 0n) stop('A factorial needs a number from 0 up.');
                if (k > 5000n) stop('The factorial is too large to show here.');
                var f = 1n;
                for (var j = 2n; j <= k; j++) f *= j;
                return frac(f, 1n);
            case 'gcd': case 'lcm':
                var vs = x.args.map(function (y) { return whole(exact(y), 'A gcd or lcm argument'); });
                return frac(vs.reduce(function (p2, q) { return x.t === 'gcd' ? gcdB(p2, q) : (p2 === 0n || q === 0n ? 0n : (p2 / gcdB(p2, q) * q < 0n ? -(p2 / gcdB(p2, q) * q) : p2 / gcdB(p2, q) * q)); }), 1n);
            case 'abs': var v = exact(x.args[0]); return frac(v.n < 0n ? -v.n : v.n, v.d);
        }
        stop('not a calculation');
    }
    function inv(a, n) {
        var r0 = n, r1 = ((a % n) + n) % n, s0 = 0n, s1 = 1n;
        while (r1) { var q = r0 / r1, t = r0 - q * r1; r0 = r1; r1 = t; t = s0 - q * s1; s0 = s1; s1 = t; }
        if (r0 !== 1n) stop('Not invertible mod n: the numbers share the factor ' + r0 + ' with it.');
        return ((s0 % n) + n) % n;
    }
    function modular(x, n) {
        function red(v) { return ((v % n) + n) % n; }
        switch (x.t) {
            case 'num': return red(x.v);
            case 'neg': return red(-modular(x.x, n));
            case 'add': return red(modular(x.l, n) + modular(x.r, n));
            case 'sub': return red(modular(x.l, n) - modular(x.r, n));
            case 'mul': return red(modular(x.l, n) * modular(x.r, n));
            case 'div': return red(modular(x.l, n) * inv(modular(x.r, n), n));
            case 'pow':
                var b = modular(x.l, n), e = whole(exact(x.r), 'An exponent');
                if (e < 0n) { b = inv(b, n); e = -e; }
                var r = 1n % n;
                while (e > 0n) { if (e & 1n) r = r * b % n; b = b * b % n; e >>= 1n; }
                return r;
            case 'fact':
                var k = whole(exact(x.x), 'A factorial');
                if (k < 0n) stop('A factorial needs a number from 0 up.');
                if (k >= n) return 0n;                       /* n itself is one of the factors */
                if (k > 1000000n) stop('The factorial is too long to work out here.');
                var f = 1n % n;
                for (var j = 2n; j <= k; j++) f = f * j % n;
                return f;
            default: return red(whole(exact(x), 'The value'));
        }
    }
    function show(v) {
        var t = String(v);
        return t.length > 64 ? t.slice(0, 28) + '…' + t.slice(-12) + ' (' + t.replace('-', '').length + ' digits)' : t;
    }
    function decimal(f) {                           /* about 12 significant digits */
        var neg = f.n < 0n, n = neg ? -f.n : f.n, sc = 10n ** 14n, q = n * sc / f.d, t = q.toString();
        while (t.length < 15) t = '0' + t;
        var ip = t.slice(0, -14), fp = t.slice(-14).replace(/0+$/, '');
        if (ip.length > 12) return null;
        return (neg ? '-' : '') + ip + (fp ? '.' + fp.slice(0, Math.max(1, 12 - ip.length)) : '');
    }
    /* {expr, mod, text, copy} for a calculation (it needs an operation: a lone number is not one), else null */
    function answer(raw) {
        var one = String(raw || '').trim().replace(/\s+/g, ' ').replace(/\s*=\s*\??$/, '');
        if (!one || one.length > 3000 || !/\d/.test(one)) return null;
        var mod = splitMod(one), src = mod ? mod.expr : one;
        if (!/^[\d\s+\-*\/^().,!_a-fA-FxXoObB×⋅·÷−–—]+$|gcd|lcm|abs/i.test(src)) return null;
        if (!mod && !/[+\-*\/^!(]|gcd|lcm|abs/i.test(src.replace(/^-/, ''))) return null;
        var tree;
        try { tree = parseCalc(src); } catch (e) { return null; }
        try {
            if (mod) {
                var n = whole(exact(parseCalc(mod.n)), 'The modulus');
                if (n < 2n) return null;
                var r = modular(tree, n);
                return { expr: src, mod: mod.n, text: show(r), copy: String(r), n: show(n) };
            }
            var f = exact(tree);
            if (f.d === 1n) return { expr: src, text: show(f.n), copy: String(f.n) };
            var dec = decimal(f);
            return { expr: src, text: show(f.n) + '/' + show(f.d) + (dec ? ' ≈ ' + dec : ''), copy: f.n + '/' + f.d };
        } catch (e) {
            if (e && e.calc) return { expr: src, mod: mod ? mod.n : null, error: e.message };
            return null;
        }
    }

    /* ---------- requests in words ---------- */
    var BASES = { binary: '2', bin: '2', octal: '8', oct: '8', decimal: '10', dec: '10', hex: '16', hexadecimal: '16' };
    function numList(t) { return t.replace(/\band\b/gi, ',').split(/\s*[,;]\s*|\s+/).filter(Boolean); }
    function intent(one) {
        var m;
        if ((m = /^(?:factor(?:i[sz]e)?|prime\s+factors?\s+of|factors?\s+of|factori[sz]ation\s+of)\s+(.+)$/i.exec(one)) && EXPR.test(m[1]))
            return { what: 'Factor a number', tools: [['prime-factorization', 'Factor it', { n: m[1] }], ['divisors', 'All its divisors', { n: m[1] }]] };
        if ((m = /^is\s+(.+?)\s+(?:a\s+)?prime\s*\??$/i.exec(one)) && EXPR.test(m[1]))
            return { what: 'Is it prime?', tools: [['primality-test', 'Test it', { n: m[1] }], ['prime-factorization', 'Factor it', { n: m[1] }]] };
        if ((m = /^(?:gcd|hcf|greatest\s+common\s+divisor|lcm|least\s+common\s+multiple)\s*(?:of\s+)?\(?\s*([-\d\s,;_]+?(?:\s+and\s+[-\d_]+)?)\s*\)?$/i.exec(one)) && numList(m[1]).length >= 2)
            return { what: 'GCD and LCM', tools: [['gcd', 'GCD and LCM', { nums: numList(m[1]).join(', ') }]].concat(numList(m[1]).length === 2 ? [['extended-euclid', 'Bézout coefficients', { a: numList(m[1])[0], b: numList(m[1])[1] }]] : []) };
        if ((m = /^(?:phi|φ|totient|euler'?s?\s+(?:phi|totient)(?:\s+function)?)\s*(?:of\s+)?\(?\s*(\d[\d_]*)\s*\)?$/i.exec(one)))
            return { what: "Euler's totient", tools: [['euler-totient', 'φ(n)', { n: m[1] }], ['carmichael-function', 'λ(n)', { n: m[1] }]] };
        if ((m = /^(?:divisors|all\s+divisors)\s+(?:of\s+)?(\d[\d_]*)$/i.exec(one)))
            return { what: 'Divisors', tools: [['divisors', 'All its divisors', { n: m[1] }]] };
        if ((m = /^(?:convert\s+)?(0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d[\d_]*)\s+(?:in|to|into|as)\s+(binary|bin|octal|oct|decimal|dec|hex|hexadecimal|base\s*(\d+))$/i.exec(one))) {
            var from = /^0x/i.test(m[1]) ? '16' : /^0b/i.test(m[1]) ? '2' : /^0o/i.test(m[1]) ? '8' : '10';
            var to = m[3] || BASES[m[2].toLowerCase()];
            return { what: 'Convert a number', tools: [['base-conversion', 'Convert it', { num: m[1].replace(/^0[xbo]/i, ''), from: from, to: to }]] };
        }
        if ((m = /^(sha-?256|sha-?1|md5|hash)(?:\s+of)?(?:\s*[:(]\s*|\s+)(.+?)\)?$/i.exec(one))) {
            var alg = /md5/i.test(m[1]) ? 'md5' : /sha-?1$/i.test(m[1]) ? 'sha1' : 'sha256';
            return { what: 'Hash a text', tools: [['hash', alg.toUpperCase().replace('SHA', 'SHA-') + ' step by step', { input: m[2], alg: alg }]] };
        }
        if ((m = /^(?:rot\s*13|rot13)\s+(.+)$/i.exec(one)))
            return { what: 'ROT13', tools: [['rot13', 'ROT13 it', { text: m[1] }]] };
        if ((m = /^caesar\s+(?:shift\s+)?(-?\d+)\s+(.+)$/i.exec(one)) || (m = /^caesar\s+(.+?)\s+(?:shift|by)\s+(-?\d+)$/i.exec(one))) {
            var sh = /^-?\d+$/.test(m[1]) ? m[1] : m[2], tx = /^-?\d+$/.test(m[1]) ? m[2] : m[1];
            return { what: 'Caesar cipher', tools: [['caesar', 'Encrypt it with Caesar', { text: tx, shift: sh }], ['caesar-breaker', 'Try every shift', { text: tx }]] };
        }
        if ((m = /^(?:base64|b64)\s+(?:encode\s+)?(.+)$/i.exec(one)) || (m = /^encode\s+(.+?)\s+(?:in|to|as)\s+base\s*64$/i.exec(one)))
            return { what: 'Base64', tools: [['base64', 'Encode it in Base64', { input: m[1] }]] };
        if ((m = /^decode\s+(.+)$/i.exec(one))) {
            var g = guess(m[1]);
            if (g) return g;
            return { what: 'Decode', tools: [['decoder-guesser', 'Try every decoder', { text: m[1] }]] };
        }
        if ((m = /^(\d[\d_]*)\s*(?:choose|C)\s*(\d[\d_]*)$/.exec(one)) || (m = /^(?:binom(?:ial)?|nCr)\s*\(?\s*(\d+)\s*,\s*(\d+)\s*\)?$/i.exec(one)))
            return { what: 'Binomial coefficient', tools: [['binomial', 'n choose k', { n: m[1], k: m[2] }]] };
        if ((m = /^(?:order\s+of\s+)(\d+)\s+(?:mod|modulo)\s+(\d+)$/i.exec(one)))
            return { what: 'Multiplicative order', tools: [['multiplicative-order', 'Its order', { a: m[1], n: m[2] }]] };
        if ((m = /^(?:sqrt|square\s+root\s+of)\s*\(?\s*(\d+)\s*\)?\s+(?:mod|modulo)\s+(\d+)$/i.exec(one)))
            return { what: 'Square root mod n', tools: [['modular-square-root', 'Square roots mod n', { a: m[1], n: m[2] }]] };
        if ((m = /^(?:primitive\s+root|generator)s?\s+(?:of|mod|modulo)\s+(\d+)$/i.exec(one)))
            return { what: 'Primitive roots', tools: [['primitive-root', 'Primitive roots', { n: m[1] }]] };
        if ((m = /^(?:primes?\s+(?:up\s+to|below|under|to)|sieve\s+(?:of\s+)?(?:up\s+to\s+)?)\s*(\d+)$/i.exec(one)))
            return { what: 'Primes', tools: [['prime-sieve', 'Sieve of Eratosthenes', { mode: 'sieve', N: m[1] }]] };
        return null;
    }

    /* ---------- words: other words for the same thing, typos ---------- */
    var SAME = {
        factor: 'factorization factorisation factorize factorise factors', factorise: 'factorization', factorize: 'factorization',
        inverse: 'inverse invert inversion', invert: 'inverse', gcd: 'gcd greatest divisor hcf euclid', hcf: 'gcd', lcm: 'lcm multiple',
        totient: 'totient phi euler', phi: 'totient euler', power: 'exponentiation power exponent pow', pow: 'exponentiation',
        exponent: 'exponentiation exponent', modexp: 'exponentiation', prime: 'prime primality primes', primes: 'prime',
        sha: 'hash sha', sha256: 'hash sha', sha1: 'hash sha', md5: 'hash md5', digest: 'hash', checksum: 'hash',
        encrypt: 'encrypt encryption cipher', decrypt: 'decrypt decryption decipher', crack: 'breaker break crack solver solve',
        break: 'breaker break crack', solve: 'solver solve breaker', cipher: 'cipher encrypt', code: 'code cipher encoding',
        hex: 'hex hexadecimal', hexadecimal: 'hex', bin: 'binary', bits: 'binary bits', convert: 'conversion converter convert',
        base: 'base conversion', remainder: 'modulo remainder mod', mod: 'modulo modular mod', modulo: 'modulo mod',
        ec: 'elliptic curve', ecc: 'elliptic curve', curve: 'elliptic curve', signature: 'signature sign', sign: 'signature',
        dh: 'diffie hellman', rsa: 'rsa', aes: 'gf256 aes', xor: 'xor', crt: 'chinese remainder', chinese: 'chinese remainder',
        frequency: 'frequency letters', ascii: 'character codes ascii', unicode: 'character codes unicode utf8', utf: 'utf8',
        matrix: 'matrix matrices determinant', determinant: 'matrix determinant', lattice: 'lattice lll', lll: 'lattice lll',
        root: 'root square primitive', sqrt: 'square root', log: 'logarithm discrete', logarithm: 'logarithm discrete',
        secret: 'secret sharing shamir', sharing: 'shamir sharing', fraction: 'fractions fraction', fractions: 'fractions',
        big: 'big number', calculator: 'calculator', vigenere: 'vigenere', caesar: 'caesar shift', morse: 'morse'
    };
    var STOP = ['the', 'a', 'an', 'of', 'to', 'how', 'do', 'i', 'in', 'for', 'my', 'with', 'and', 'what', 'is', 'tool', 'tools', 'online', 'calculate', 'calculation', 'compute', 'find', 'get', 'me', 'please', 'step', 'by', 'message', 'text', 'number', 'numbers', 'it', 'this'];
    function near(a, b) {                           /* at most one letter added, dropped, changed or two swapped */
        if (Math.abs(a.length - b.length) > 1) return false;
        var i = 0, j = 0, edits = 0;
        while (i < a.length && j < b.length) {
            if (a.charAt(i) === b.charAt(j)) { i++; j++; continue; }
            if (++edits > 1) return false;
            if (a.length > b.length) i++;
            else if (b.length > a.length) j++;
            else if (a.charAt(i + 1) === b.charAt(j) && a.charAt(i) === b.charAt(j + 1)) { i += 2; j += 2; }
            else { i++; j++; }
        }
        return edits + (a.length - i) + (b.length - j) <= 1;
    }
    /* does word w (lower case, accents gone) match a tool's text q (same) with its words qw? */
    function wordMatch(w, q, qw) {
        if (q.indexOf(w) >= 0) return true;
        var alt = SAME[w];          /* other words count as whole words (or their start), not inside other words */
        if (alt && alt.split(' ').some(function (x) { return qw.some(function (y) { return y.indexOf(x) === 0; }); })) return true;
        if (w.length >= 4) return qw.some(function (x) { return x.length >= 4 && near(w, x); });
        return false;
    }

    /* Returns {what: 'Looks like Base64', tools: [[id, label, {param: value}], ...]} or null */
    function guess(raw) {
        var s = String(raw || '').trim();
        if (!s || s.length > 20000) return null;
        var one = s.replace(/\s+/g, ' '), m, nums;

        /* requests in words */
        var w = intent(one);
        if (w) return w;

        /* modular expressions */
        if ((m = /^(.+?)\s*(?:\^|\*\*)\s*\(?\s*-\s*1\s*\)?\s*(?:mod|%)\s*(\S+)$/i.exec(one)) && ATOM.test(m[1]))
            return { what: 'Looks like a modular inverse', tools: [['modular-inverse', 'Find the inverse', { a: m[1], n: m[2] }], ['extended-euclid', 'Extended Euclid', { a: m[1], b: m[2] }]] };
        if ((m = /^(?:the\s+)?inverse\s+of\s+(.+?)\s+(?:mod|modulo)\s+(\S+)$/i.exec(one)))
            return { what: 'Looks like a modular inverse', tools: [['modular-inverse', 'Find the inverse', { a: m[1], n: m[2] }]] };
        var mod = splitMod(one);
        /* one power, a^e mod n: square and multiply shows every step */
        if (mod && (m = /^(\d[\d_]*|\([^()]+\))\s*(?:\^|\*\*)\s*(\d[\d_]*|\([^()]+\))$/.exec(mod.expr)))
            return { what: 'Looks like a modular power', tools: [['modular-exponentiation', 'Square and multiply', { a: m[1], e: m[2], n: mod.n }], ['modular-calculator', 'Modular calculator', { expr: mod.expr, n: mod.n }]] };
        if ((m = /^(\d+)\s*\*?\s*x\s*(?:≡|=)\s*(-?\d+)\s*\(?\s*(?:mod|%)\s*(\d+)\s*\)?$/i.exec(one)))
            return { what: 'Looks like a linear congruence', tools: [['linear-congruence', 'Solve for x', { a: m[1], b: m[2], n: m[3] }]] };
        var lines = s.split(/\n|;/).map(function (l) { return l.trim(); }).filter(Boolean);
        if (lines.length >= 2 && lines.every(function (l) { return /(mod|≡|%)/i.test(l) && /\d/.test(l); }))
            return { what: 'Looks like a system of congruences', tools: [['chinese-remainder', 'Chinese remainder theorem', { form: 'lines', sys: lines.join('\n') }]] };
        /* any other calculation mod n: a plain remainder, or the modular calculator for a whole expression */
        if (mod && EXPR.test(mod.expr)) {
            if (/^[\d\s_]+$/.test(mod.expr) || !/[\^*\/]/.test(mod.expr))
                return { what: 'Looks like a remainder', tools: [['modulo', 'a mod n', { a: mod.expr, n: mod.n, conv: 'euclid' }], ['modular-calculator', 'Modular calculator', { expr: mod.expr, n: mod.n }]] };
            return { what: 'Looks like a calculation mod n', tools: [['modular-calculator', 'Every step, mod n', { expr: mod.expr, n: mod.n }], ['big-number', 'Without the modulus, exactly', { expr: mod.expr }]] };
        }

        /* numbers (binary first: 0s and 1s in groups of 8 are bytes, not a list of numbers) */
        var compact = s.replace(/\s+/g, '');
        if (/^[01]+$/.test(compact) && compact.length >= 8 && compact.length % 8 === 0)
            return { what: 'Looks like binary', tools: [['binary', 'Decode the bits as text', { input: s, 'do': 'dec' }], ['base-conversion', 'As a number', { num: compact, from: '2', to: '10' }]] };
        nums = one.split(/\s*[,;]\s*|\s+/).filter(Boolean);
        if (nums.length >= 2 && nums.length <= 12 && nums.every(function (x) { return INT.test(x); })) {
            var t = [['gcd', 'GCD and LCM', { nums: nums.join(', ') }]];
            if (nums.length === 2) t.push(['modular-inverse', 'Inverse of the first modulo the second', { a: nums[0], n: nums[1] }], ['extended-euclid', 'Bézout coefficients', { a: nums[0], b: nums[1] }]);
            return { what: 'Looks like whole numbers', tools: t };
        }
        if (INT.test(one)) {
            var n = one.replace(/[\s_]/g, '');
            return { what: 'Looks like a whole number', tools: [['prime-factorization', 'Factor it', { n: n }], ['primality-test', 'Is it prime?', { n: n }], ['base-conversion', 'In binary and other bases', { num: n, from: '10', to: '2' }], ['euler-totient', "Euler's totient", { n: n }]] };
        }
        if (/^-?\d*\.\d+(e[-+]?\d+)?$/i.test(one))
            return { what: 'Looks like a decimal number', tools: [['ieee754', 'How a computer stores it', { dir: 'dec', x: one }]] };
        if (/[\/]/.test(one) && /^[\d\s+\-*\/^().]+$/.test(one))
            return { what: 'Looks like a calculation with fractions', tools: [['fractions', 'Fraction calculator', { expr: one }], ['big-number', 'Exact big number calculator', { expr: one }]] };
        if (EXPR.test(one) && /[+\-*^!]/.test(one) && /\d/.test(one))
            return { what: 'Looks like a calculation', tools: [['big-number', 'Calculate it exactly', { expr: one }]] };
        if (/^\[\s*\[/.test(one) || (lines.length >= 2 && lines.every(function (l) { return /^[-\d\s,\/]+$/.test(l); })))
            return { what: 'Looks like a matrix', tools: [['matrix', 'Determinant, inverse, row reduction', { A: s, ring: 'q' }]] };

        /* codes */
        if (/^[.\-\/\s·•_]+$/.test(s) && /[.·•]/.test(s) && /[-_]/.test(s))
            return { what: 'Looks like Morse code', tools: [['morse', 'Decode the Morse code', { input: s, 'do': 'dec' }]] };
        if (/%[0-9a-f]{2}/i.test(s) && !/\s/.test(s.trim()))
            return { what: 'Looks URL-encoded', tools: [['url-encoding', 'Decode it', { input: s, 'do': 'dec' }]] };
        if ((/^(0x)?[0-9a-f]+$/i.test(compact) && compact.replace(/^0x/i, '').length % 2 === 0 && /[a-f]/i.test(compact) && compact.length >= 4) || /^([0-9a-f]{2}[\s:])+[0-9a-f]{2}$/i.test(s))
            return { what: 'Looks like hexadecimal', tools: [['hex', 'Decode the bytes as text', { input: s, 'do': 'dec' }], ['base-conversion', 'As a number', { num: compact.replace(/^0x/i, ''), from: '16', to: '10' }], ['decoder-guesser', 'Try every decoder', { text: s }]] };
        if (/^[A-Za-z0-9+\/_-]+={0,2}$/.test(compact) && compact.length >= 8 && (compact.length % 4 === 0 || /=$/.test(compact)) && /[a-z]/.test(compact) && /[A-Z]/.test(compact) && !looksEnglish(s))
            return { what: 'Looks like Base64', tools: [['base64', 'Decode it', { input: compact, 'do': 'dec' }], ['decoder-guesser', 'Try every decoder', { text: s }]] };

        /* text */
        var letters = s.replace(/[^A-Za-z]/g, '').length;
        if (letters >= 20 && letters / s.replace(/\s/g, '').length > 0.7) {
            if (looksEnglish(s)) return { what: 'Looks like English text', tools: [['vigenere', 'Encrypt it with Vigenère', { text: s, key: 'LEMON' }], ['caesar', 'Encrypt it with Caesar', { text: s, shift: '3' }], ['frequency-analysis', 'Count its letters', { text: s }], ['hash', 'Its SHA-256 hash', { input: s }]] };
            return { what: 'Looks like a ciphertext', tools: [['cipher-identifier', 'Which cipher is it?', { text: s }], ['caesar-breaker', 'Try every Caesar shift', { text: s }], ['vigenere-breaker', 'Break it as Vigenère', { text: s }], ['substitution-solver', 'Solve it as a substitution', { text: s }]] };
        }
        /* one short word with digits (sha256, md5, rot13, base64) is a search, not text to encode */
        if (s.length >= 2 && !/^[a-z\s]+$/i.test(s) && !/^[a-z0-9-]{1,14}$/i.test(s))
            return { what: 'Some text', tools: [['base64', 'Encode it in Base64', { input: s }], ['hex', 'Its bytes in hex', { input: s }], ['hash', 'Its SHA-256 hash', { input: s }], ['decoder-guesser', 'Try to decode it', { text: s }]] };
        return null;
    }
    /* the guess, with the answer of a calculation when there is one */
    function guessAll(raw) {
        var g = guess(raw), ans = null;
        try { ans = answer(raw); } catch (e) { ans = null; }
        if (ans && !g) g = { what: 'A calculation', tools: [['big-number', 'Every step, exactly', { expr: ans.expr }]] };
        if (g && ans) g.answer = ans;
        return g;
    }
    var api = { guess: guessAll, answer: answer, intent: intent, wordMatch: wordMatch, splitMod: splitMod };
    (typeof window !== 'undefined' ? window : globalThis).ToolboxGuess = api;
    /* the answer of a calculation, above the links (the Toolbox box and the lab's paste box): "374^34 * 345^394 mod 29332 = 17860", with Copy */
    function answerNode(ans, cls) {
        var d = document.createElement('div');
        d.className = cls;
        if (ans.error) { d.classList.add('is-bad'); d.textContent = ans.error; return d; }
        var q = document.createElement('span'); q.className = cls + '-q';
        q.textContent = ans.expr.replace(/\*/g, '·') + (ans.mod ? ' mod ' + ans.mod : '') + ' =';
        var r = document.createElement('output'); r.className = cls + '-r'; r.textContent = ans.text;
        var c = document.createElement('button'); c.type = 'button'; c.className = 'tb-copy ' + cls + '-copy'; c.textContent = 'Copy';
        c.addEventListener('click', function () {
            var done = function () { c.textContent = 'Copied'; setTimeout(function () { c.textContent = 'Copy'; }, 1500); };
            if (navigator.clipboard) navigator.clipboard.writeText(ans.copy).then(done, function () { /* not allowed: nothing */ });
        });
        d.appendChild(q); d.appendChild(r); d.appendChild(c);
        return d;
    }
    api.answerNode = answerNode;
    if (typeof document === 'undefined') return;

    /* ---------- the page ---------- */
    var box = document.getElementById('tb-search');
    if (!box) return;
    var tools = Array.prototype.slice.call(document.querySelectorAll('.tb-tool'));
    var cats = Array.prototype.slice.call(document.querySelectorAll('.tb-cat'));
    var none = document.getElementById('tb-nores'), out = document.getElementById('tb-guess');
    var tiles = Array.prototype.slice.call(document.querySelectorAll('.tb-task'));
    var bar = document.getElementById('tb-taskbar'), barText = document.getElementById('tb-tasktext');
    var titles = {}, task = '';
    /* "closest matches" note, when no tool has every word */
    var partial = document.createElement('p');
    partial.className = 'tb-partial';
    partial.setAttribute('role', 'status');
    partial.textContent = 'No tool has all of these words; these come closest.';
    partial.hidden = true;
    out.parentNode.insertBefore(partial, out.nextSibling);
    tools.forEach(function (t) {
        var a = t.querySelector('a');
        titles[t.getAttribute('data-id')] = { title: a.textContent, href: a.getAttribute('href') };
    });
    function flat(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    tools.forEach(function (t) {
        t._q = flat(t.getAttribute('data-q') || '');
        t._w = t._q.match(/[a-z0-9]+/g) || [];
        t._tasks = (t.getAttribute('data-tasks') || '').split(' ');
    });

    function link(id, label, params) {
        var t = titles[id];
        if (!t) return null;
        var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
        if (id === 'base64' || id === 'hex' || id === 'binary' || id === 'morse' || id === 'url-encoding') {
            var decode = !/^(Encode|Its bytes)/.test(label);
            q.push('do=' + (decode ? 'dec' : 'enc'));
        }
        if ((id === 'vigenere' || id === 'caesar') && /^Encrypt/.test(label)) q.push('do=enc');
        var a = document.createElement('a');
        a.href = t.href + (q.length ? '#' + q.join('&') : '');   /* after the #: never sent to a server */
        a.className = 'tb-guess-link';
        var b = document.createElement('b');
        b.textContent = label;
        var sp = document.createElement('span');
        sp.textContent = t.title;
        a.appendChild(b);
        a.appendChild(sp);
        return a;
    }
    function showGuess(g) {
        out.textContent = '';
        out.hidden = !g;
        if (!g) return;
        var h = document.createElement('p');
        h.className = 'tb-guess-what';
        h.textContent = g.what + ':';
        out.appendChild(h);
        if (g.answer) out.appendChild(answerNode(g.answer, 'tb-answer'));
        var list = document.createElement('div');
        list.className = 'tb-guess-list';
        g.tools.forEach(function (x) { var a = link(x[0], x[1], x[2]); if (a) list.appendChild(a); });
        out.appendChild(list);
    }
    function apply() {
        var raw = box.value, g = guessAll(raw);
        showGuess(g);
        /* pasted input that was recognised does not filter the list; plain words do: a tool shows when it has every
           word (or a typo of it, or another word for it); when none has them all, the tools with the most of them */
        var all = g ? [] : flat(raw).split(/[^a-z0-9]+/).filter(Boolean);
        var ws = all.filter(function (w) { return STOP.indexOf(w) < 0; });
        if (!ws.length) ws = all;
        var score = tools.map(function (t) {
            if (task && t._tasks.indexOf(task) < 0) return -1;
            return ws.filter(function (w) { return wordMatch(w, t._q, t._w); }).length;
        });
        var best = Math.max.apply(null, score.concat(0)), need = best === ws.length ? ws.length : Math.max(best, 1), shown = 0;
        tools.forEach(function (t, i) {
            var on = score[i] >= 0 && score[i] >= need;
            t.hidden = !on;
            if (on) shown++;
        });
        cats.forEach(function (c) { c.hidden = !c.querySelector('.tb-tool:not([hidden])'); });
        none.hidden = shown > 0 || !!g;
        partial.hidden = !(ws.length > 1 && best > 0 && best < ws.length);
    }
    /* Enter: the first suggested link, else the first tool shown */
    box.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var a = out.hidden ? null : out.querySelector('a.tb-guess-link');
        var first = a || (function () { var t = tools.filter(function (x) { return !x.hidden; })[0]; return t && t.querySelector('a'); })();
        if (first) { e.preventDefault(); location.href = first.getAttribute('href'); }
    });
    function setTask(id) {
        task = task === id ? '' : id;
        tiles.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-task') === task)); });
        bar.hidden = !task;
        if (task) {
            var b = tiles.filter(function (x) { return x.getAttribute('data-task') === task; })[0];
            barText.textContent = 'Showing the tools to ' + b.querySelector('b').textContent.toLowerCase().replace(/^see/, 'see') + '.';
        }
        apply();
        if (task) bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    tiles.forEach(function (b) { b.addEventListener('click', function () { setTask(b.getAttribute('data-task')); }); });
    document.getElementById('tb-taskall').addEventListener('click', function () { setTask(task); });
    box.addEventListener('input', apply);
    /* /toolbox/#q=... fills the box (links can point to a search or a pasted value; ?q= works too) */
    var q = /[#?&]q=([^&]*)/.exec(location.hash + '&' + location.search);
    if (q) { try { box.value = decodeURIComponent(q[1].replace(/\+/g, ' ')); } catch (e) { /* bad escape: ignore */ } }
    if (box.value) apply();
})();
