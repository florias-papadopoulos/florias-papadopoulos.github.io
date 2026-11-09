/* Toolbox: text helpers for ciphers, encodings and code breaking (Calc.lib.text). Pure functions, no page code. */
(function (G) {
    'use strict';
    var Calc = G.Calc;
    var tx = Calc.lib.text = {};

    tx.ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    /* letters with accents become plain letters (é -> e, Ä -> A); ß -> ss */
    tx.deaccent = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss'); };
    /* only the letters A-Z, upper case (accents removed) */
    tx.letters = function (s) { return tx.deaccent(s).toUpperCase().replace(/[^A-Z]/g, ''); };
    tx.isLetter = function (c) { return /^[A-Za-z]$/.test(c); };
    /* index 0-25 of a letter (either case), or -1 */
    tx.idx = function (c) { var k = c.toUpperCase().charCodeAt(0) - 65; return k >= 0 && k < 26 && c.length === 1 ? k : -1; };
    tx.chr = function (k, lower) { var c = tx.ALPHA.charAt(((k % 26) + 26) % 26); return lower ? c.toLowerCase() : c; };
    /* map every letter of s through f(index, position among letters) -> new index, keeping case, accents removed
       first; other characters stay as they are (or are dropped when keep is false). Returns the new string. */
    tx.mapLetters = function (s, f, keep) {
        s = tx.deaccent(s);
        var out = '', n = 0;
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i), k = tx.idx(c);
            if (k < 0) { if (keep !== false) out += c; continue; }
            out += tx.chr(f(k, n++), c !== c.toUpperCase());
        }
        return out;
    };
    /* a keyed alphabet: the key's letters without repeats, then the rest of the alphabet (KEYWORD -> KEYWORDABCF...) */
    tx.keyedAlphabet = function (key, alphabet) {
        alphabet = alphabet || tx.ALPHA;
        var seen = {}, out = '';
        (tx.letters(key) + alphabet).split('').forEach(function (c) { if (!seen[c] && alphabet.indexOf(c) >= 0) { seen[c] = 1; out += c; } });
        return out;
    };
    /* split into groups of n characters (for display) */
    tx.groups = function (s, n) { return (String(s).match(new RegExp('.{1,' + (n || 5) + '}', 'g')) || []).join(' '); };

    /* ---------- statistics ---------- */
    /* English letter frequencies in percent (A..Z), from a large general corpus */
    tx.EN = [8.17, 1.49, 2.78, 4.25, 12.70, 2.23, 2.02, 6.09, 6.97, 0.15, 0.77, 4.03, 2.41, 6.75, 7.51, 1.93, 0.10, 5.99, 6.33, 9.06, 2.76, 0.98, 2.36, 0.15, 1.97, 0.07];
    /* counts of A..Z in s */
    tx.counts = function (s) { var c = []; for (var i = 0; i < 26; i++) c.push(0); tx.letters(s).split('').forEach(function (ch) { c[ch.charCodeAt(0) - 65]++; }); return c; };
    /* index of coincidence: about 0.066 for English, 0.038 for random letters */
    tx.ic = function (s) {
        var c = tx.counts(s), n = c.reduce(function (a, b) { return a + b; }, 0);
        if (n < 2) return 0;
        return c.reduce(function (a, k) { return a + k * (k - 1); }, 0) / (n * (n - 1));
    };
    /* chi-squared distance of s's letters from English (lower is more English-like) */
    tx.chi2 = function (s, freq) {
        freq = freq || tx.EN;
        var c = tx.counts(s), n = c.reduce(function (a, b) { return a + b; }, 0);
        if (!n) return Infinity;
        var x = 0;
        for (var i = 0; i < 26; i++) { var e = freq[i] / 100 * n; x += (c[i] - e) * (c[i] - e) / e; }
        return x;
    };
})(typeof window !== 'undefined' ? window : globalThis);
