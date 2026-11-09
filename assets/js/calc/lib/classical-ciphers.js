/* Toolbox: helpers shared by the classical ciphers (Calc.lib.classic). Pure functions, no page code.
   - the form: the text box and the output options (keep spaces and punctuation, keep case, groups of five);
   - prep(text) reads the letters of a text, put(p, letters, v) puts new letters back into the text's shape;
   - keyed alphabets and Polybius squares (5x5 without J or without Q, 6x6 with digits);
   - column orders and columnar transposition (used by the columnar transposition and by ADFGVX).
   This file is loaded before lib/text.js on the page, so Calc.lib.text is only used inside functions. */
(function (G) {
    'use strict';
    var Calc = G.Calc;
    var C = Calc.lib.classic = {};
    var AZ = C.AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var DIG = '0123456789';
    function tx() { return Calc.lib.text; }
    C.mod = function (a, n) { return ((a % n) + n) % n; };
    C.idx = function (c) { return AZ.indexOf(c); };
    /* a table cell for a computation modulo n: $19 + 11 = 30 \equiv 4$ (the reduction only when it changes something) */
    C.modCell = function (expr, value, n) {
        var r = C.mod(value, n || 26);
        return '$' + expr + ' = ' + value + (r !== value ? ' \\equiv ' + r : '') + '$';
    };
    C.gcd = function (a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; };
    C.inv = function (a, n) { a = C.mod(a, n); for (var x = 1; x < n; x++) if (a * x % n === 1) return x; return n === 1 ? 0 : null; };
    /* the inverse of a modulo n (small numbers) written out on step s with the extended Euclidean algorithm */
    C.invSteps = function (s, a, n) {
        var nt = Calc.lib.nt, e = nt.egcdRows(BigInt(n), BigInt(C.mod(a, n))), rows = e.rows, last = rows.length - 2;
        s.p('The extended Euclidean algorithm on $' + n + '$ and $' + C.mod(a, n) + '$ keeps $r_i = s_i \\cdot ' + n + ' + t_i \\cdot ' + C.mod(a, n) + '$ in every row, with $q_i = \\lfloor r_{i-1} / r_i \\rfloor$ and $x_{i+1} = x_{i-1} - q_i \\cdot x_i$:');
        s.table(['$r_i$', '$q_i$', '$s_i$', '$t_i$'], rows.map(function (r, i) {
            return [i === last ? { v: String(r.r), hl: true } : String(r.r), r.q === null ? '' : String(r.q), String(r.s), i === last ? { v: String(r.t), hl: true } : String(r.t)];
        }), { mono: true });
        var t = Number(rows[last].t), x = C.mod(t, n);
        if (Number(rows[last].r) !== 1) return null;
        s.p('The row with remainder 1 says $' + rows[last].s + ' \\cdot ' + n + ' + ' + (t < 0 ? '(' + t + ')' : t) + ' \\cdot ' + C.mod(a, n) + ' = 1$, so the inverse is $' + t + (t < 0 ? ' + ' + n + ' = ' + x : '') + '$:');
        s.math(C.mod(a, n) + '^{-1} \\equiv ' + x + ' \\pmod{' + n + '} \\quad\\text{since}\\quad ' + C.mod(a, n) + ' \\cdot ' + x + ' = ' + (C.mod(a, n) * x) + ' \\equiv 1');
        return x;
    };

    /* ---------- the form ---------- */
    C.textInput = function (ph, label) { return { id: 'text', type: 'textarea', label: label || 'Text', rows: 4, maxLength: 20000, placeholder: ph || '' }; };
    /* the output options; o.keep / o.caseK / o.five false leaves one out, a string replaces its label */
    C.formatInputs = function (o) {
        o = o || {};
        var out = [];
        if (o.keep !== false) out.push({ id: 'keep', type: 'check', label: typeof o.keep === 'string' ? o.keep : 'Keep spaces and punctuation', value: true });
        if (o.caseK !== false) out.push({ id: 'caseK', type: 'check', label: typeof o.caseK === 'string' ? o.caseK : 'Keep upper and lower case', value: true });
        if (o.five !== false) out.push({ id: 'five', type: 'check', label: typeof o.five === 'string' ? o.five : 'Output in groups of five', value: false, when: o.fiveWhen });
        return out;
    };
    C.ACTIONS = [{ id: 'enc', label: 'Encrypt' }, { id: 'dec', label: 'Decrypt' }];

    /* ---------- reading a text and writing the output back ---------- */
    /* p.s: the text with accents removed, p.L: its letters in upper case, p.low[i]: letter i was lower case */
    C.prep = function (text) {
        var s = tx().deaccent(text), L = '', low = [];
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i), k = tx().idx(c);
            if (k < 0) continue;
            L += AZ.charAt(k);
            low.push(c !== c.toUpperCase());
        }
        return { s: s, L: L, low: low };
    };
    /* new letters (upper case string) into the shape of p: letter i takes the case of letter i (v.caseK), the other
       characters stay where they were (v.keep) or go; extra letters (padding) go right after the last letter. v.five: letters only,
       in groups of five. */
    C.put = function (p, out, v) {
        var lastLow = p.low.length ? p.low[p.low.length - 1] : false;
        function cs(j) { var c = out.charAt(j), lo = j < p.low.length ? p.low[j] : lastLow; return v.caseK && lo ? c.toLowerCase() : c; }
        var r = '', j = 0;
        if (v.five) {
            for (j = 0; j < out.length; j++) r += cs(j);
            return tx().groups(r, 5);
        }
        for (var i = 0; i < p.s.length; i++) {
            var c = p.s.charAt(i);
            if (tx().idx(c) >= 0) {
                if (j < out.length) r += cs(j);
                j++;
                /* extra letters (padding) right after the last letter of the text */
                if (j === p.low.length) for (; j < out.length; j++) r += cs(j);
            } else if (v.keep) r += c;
        }
        for (; j < out.length; j++) r += cs(j);
        return r;
    };
    C.needLetters = function (p) { if (!p.L.length) Calc.fail('The text has no letters A to Z.', 'text'); };
    /* a key made of letters */
    C.letterKey = function (key, field, what) {
        var k = tx().letters(key || '');
        if (!k) Calc.fail((what || 'The key') + ' needs at least one letter A to Z.', field || 'key');
        return k;
    };
    /* a long string shortened for a sentence (plain text, escaped) */
    C.short = function (s, n) { s = String(s); n = n || 60; return Calc.esc(s.length > n ? s.slice(0, n) + '…' : s); };
    C.result = function (S, out, enc, more) {
        S.result(Calc.esc(out) || '(empty)', { copy: out, label: enc ? 'Ciphertext' : 'Plaintext' });
        if (more) S.note(more);
    };
    /* the final check of a cipher: decrypting (or encrypting) the result gives back the letters of the input */
    C.checkBack = function (S, enc, back, want, why) {
        var s = S.step('Check: ' + (enc ? 'decrypt' : 'encrypt') + ' the result again');
        s.p((enc ? 'Decrypting' : 'Encrypting') + ' the output with the same key gives: ' + C.short(back, 80));
        s.check(back === want, back === want ? 'This is the input again' + (why ? ' ' + why : '') + '.' : 'This differs from the input' + (why ? ' ' + why : '') + '.');
        return s;
    };

    /* ---------- keyed alphabets and squares ---------- */
    /* the characters of key that belong to alphabet, without repeats, then the rest of alphabet */
    C.keyed = function (key, alphabet) {
        var seen = {}, out = '', ks = tx().deaccent(key || '').toUpperCase() + alphabet;
        for (var i = 0; i < ks.length; i++) { var c = ks.charAt(i); if (!seen[c] && alphabet.indexOf(c) >= 0) { seen[c] = 1; out += c; } }
        return out;
    };
    /* how a keyed alphabet was made, in words */
    C.keyedWords = function (key, keyed, alphabet) {
        var n = 0, seen = {};
        var ks = tx().deaccent(key || '').toUpperCase();
        for (var i = 0; i < ks.length; i++) { var c = ks.charAt(i); if (!seen[c] && alphabet.indexOf(c) >= 0) { seen[c] = 1; n++; } }
        var what = /\d/.test(alphabet) ? 'characters' : 'letters';
        if (!n) return 'There is no key, so the ' + what + ' stay in their usual order: ' + Calc.esc(keyed) + '.';
        if (n === alphabet.length) return 'The key holds every one of the ' + n + ' ' + what + ', so it is the whole square: ' + Calc.esc(keyed) + '.';
        return 'Write the key without repeated ' + what + ' (' + Calc.esc(keyed.slice(0, n)) + '), then the remaining ' + what + ' in their usual order (' + Calc.esc(keyed.slice(n)) + ').';
    };
    C.SQUARES = {
        ij: { label: '5 by 5, I and J share a cell', alpha: 'ABCDEFGHIKLMNOPQRSTUVWXYZ', n: 5 },
        q: { label: '5 by 5, without Q', alpha: 'ABCDEFGHIJKLMNOPRSTUVWXYZ', n: 5 },
        d36: { label: '6 by 6, letters and digits', alpha: AZ + DIG, n: 6 }
    };
    C.squareOptions = function (with36) {
        var o = [['ij', C.SQUARES.ij.label], ['q', C.SQUARES.q.label]];
        if (with36) o.push(['d36', C.SQUARES.d36.label]);
        return o;
    };
    /* the characters of a text the square can hold: upper case, J becomes I (ij), Q is left out (q), digits kept (d36) */
    C.sqChars = function (text, kind) {
        var s = tx().deaccent(text).toUpperCase();
        if (kind === 'd36') return s.replace(/[^A-Z0-9]/g, '');
        s = s.replace(/[^A-Z]/g, '');
        return kind === 'q' ? s.replace(/Q/g, '') : s.replace(/J/g, 'I');
    };
    /* a square from a key: {n, kind, alpha (all cells in reading order), rows [[c]], pos {c: [row, col]}} */
    C.square = function (key, kind) {
        var spec = C.SQUARES[kind] || C.SQUARES.ij;
        var k = kind === 'd36' ? tx().deaccent(key || '').toUpperCase() : C.sqChars(key || '', kind);
        var alpha = C.keyed(k, spec.alpha), rows = [], pos = {};
        for (var r = 0; r < spec.n; r++) {
            rows.push(alpha.slice(r * spec.n, (r + 1) * spec.n).split(''));
            for (var c = 0; c < spec.n; c++) pos[alpha.charAt(r * spec.n + c)] = [r, c];
        }
        if (kind === 'ij') pos.J = pos.I;
        return { n: spec.n, kind: kind, alpha: alpha, rows: rows, pos: pos, keyUsed: k };
    };
    /* the square as a table: labels for rows and columns (default 1..n); hl: {char: true} cells to highlight */
    C.squareTable = function (sq, labels, hl) {
        labels = labels || '123456'.slice(0, sq.n);
        var head = [''].concat(labels.split('').map(function (c) { return Calc.esc(c); }));
        var rows = sq.rows.map(function (row, r) {
            return [Calc.esc(labels.charAt(r))].concat(row.map(function (c) { var t = c === 'I' && sq.kind === 'ij' ? 'I/J' : c; return hl && hl[c] ? { v: t, hl: true } : t; }));
        });
        return { head: head, rows: rows };
    };
    C.squareWords = function (sq) {
        var spec = C.SQUARES[sq.kind];
        var cells = sq.kind === 'ij' ? 'The 25 cells hold the alphabet without J (J is written as I).' : sq.kind === 'q' ? 'The 25 cells hold the alphabet without Q (Q is left out of the text).' : 'The 36 cells hold the 26 letters and the 10 digits.';
        return cells + ' ' + C.keyedWords(sq.keyUsed, sq.alpha, spec.alpha) + ' Then fill the square row by row.';
    };

    /* ---------- transpositions ---------- */
    /* the column order of a key: a word (alphabetical order, equal letters from left to right) or numbers such as
       3 1 4 2 (the rank of each column). {labels: [shown above each column], rank: [rank of column c, from 0],
       read: [the columns in reading order]} */
    C.order = function (key, field) {
        var s = String(key || '').trim(), labels, rank = [];
        if (/\d/.test(s)) {
            var nums = s.split(/[^0-9]+/).filter(Boolean).map(Number);
            var seen = {};
            nums.forEach(function (x) {
                if (x < 1 || x > nums.length || seen[x]) Calc.fail('A numeric key must use each of the numbers 1 to ' + nums.length + ' once (for example 3 1 4 2).', field);
                seen[x] = 1;
            });
            labels = nums.map(String);
            rank = nums.map(function (x) { return x - 1; });
        } else {
            var L = tx().letters(s);
            if (!L) Calc.fail('The key needs letters (a word) or numbers such as 3 1 4 2.', field);
            labels = L.split('');
            var ix = labels.map(function (c, i) { return i; });
            ix.sort(function (a, b) { return labels[a] < labels[b] ? -1 : labels[a] > labels[b] ? 1 : a - b; });
            ix.forEach(function (c, r) { rank[c] = r; });
        }
        var read = [];
        rank.forEach(function (r, c) { read[r] = c; });
        return { labels: labels, rank: rank, read: read, n: labels.length };
    };
    /* write chars (array) in rows of n, read the columns in the order read: {grid [[c]], cols [[c]] in reading order, out} */
    C.colEnc = function (chars, read) {
        var n = read.length, grid = [];
        for (var i = 0; i < chars.length; i += n) grid.push(chars.slice(i, i + n));
        var cols = read.map(function (c) { var col = []; grid.forEach(function (row) { if (c < row.length) col.push(row[c]); }); return col; });
        return { grid: grid, cols: cols, out: [].concat.apply([], cols) };
    };
    /* the inverse: the columns are cut off the text in reading order (the first len % n columns are one longer) */
    C.colDec = function (chars, read) {
        var n = read.length, len = chars.length, rows = Math.ceil(len / n), full = len % n || n;
        var colsByIdx = [], at = 0, cols = [];
        read.forEach(function (c) {
            var h = rows - (len % n && c >= full ? 1 : 0);
            colsByIdx[c] = chars.slice(at, at + h);
            cols.push(colsByIdx[c]);
            at += h;
        });
        var grid = [], out = [];
        for (var r = 0; r < rows; r++) {
            var row = [];
            for (var c = 0; c < n; c++) if (r < colsByIdx[c].length) row.push(colsByIdx[c][r]);
            grid.push(row);
            out = out.concat(row);
        }
        return { grid: grid, cols: cols, out: out };
    };
    /* the characters a transposition moves: letters only (opts 'letters') or every character ('all') */
    C.transChars = function (text, v) {
        var s = v.chars === 'all' ? String(text).replace(/\r/g, '') : tx().deaccent(text).replace(/[^A-Za-z]/g, '');
        if (!v.caseK) s = s.toUpperCase();
        return Array.from(s);
    };
    C.transInputs = function () {
        return [
            { id: 'chars', type: 'select', label: 'Characters to move', width: 'l', value: 'letters', options: [['letters', 'Letters only (others are removed)'], ['all', 'All characters, spaces included']] },
            { id: 'caseK', type: 'check', label: 'Keep upper and lower case', value: true },
            { id: 'five', type: 'check', label: 'Output in groups of five', value: false, when: { chars: 'letters' } }
        ];
    };
    C.transOut = function (arr, v) { var s = arr.join(''); return v.five && v.chars !== 'all' ? tx().groups(s, 5) : s; };
    /* a character for a table cell: visible space, escaped */
    C.cell = function (c) { return c === ' ' ? '␣' : c === '\n' ? '↵' : c === '\t' ? '⇥' : Calc.esc(c); };
})(typeof window !== 'undefined' ? window : globalThis);
