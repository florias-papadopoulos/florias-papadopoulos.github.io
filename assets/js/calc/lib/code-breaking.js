/* Toolbox: code breaking helpers (Calc.lib.breaking). Pure functions, no page code. Small on purpose, since every
   tool page loads lib/*.js: the classical ciphers in both directions (so the breakers can decrypt and the tests can
   encrypt), English fitness by quadgrams (the table is data/english-quadgrams.js, loaded only by the tools that list
   it in needs), periodic IC, Kasiski repeats, a seeded random generator and a few minimal decoders. */
(function (G) {
    'use strict';
    var Calc = G.Calc;
    var B = Calc.lib.breaking = {};
    /* lib files load in alphabetical order, so text.js comes after this one: reach it at call time */
    var tx = {};
    ['letters', 'deaccent', 'mapLetters', 'chr'].forEach(function (k) { tx[k] = function () { return Calc.lib.text[k].apply(null, arguments); }; });
    Object.defineProperty(tx, 'EN', { get: function () { return Calc.lib.text.EN; } });

    /* ---------- letters as numbers ---------- */
    B.codes = function (s) { var l = tx.letters(s), a = new Array(l.length); for (var i = 0; i < l.length; i++) a[i] = l.charCodeAt(i) - 65; return a; };
    B.str = function (codes) { var s = ''; for (var i = 0; i < codes.length; i++) s += String.fromCharCode(65 + codes[i]); return s; };
    function mod26(k) { return ((k % 26) + 26) % 26; }
    B.mod26 = mod26;
    B.INV26 = { 1: 1, 3: 9, 5: 21, 7: 15, 9: 3, 11: 19, 15: 7, 17: 23, 19: 11, 21: 5, 23: 17, 25: 25 };
    B.AFFINE_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

    /* ---------- the ciphers (letters keep their case, other characters stay, unless said otherwise) ---------- */
    B.caesar = function (s, k) { return tx.mapLetters(s, function (x) { return x + k; }); };
    B.affine = function (s, a, b, dec) {
        var ai = B.INV26[mod26(a)];
        if (!ai) throw new Error('affine: a must be coprime to 26');
        return tx.mapLetters(s, dec ? function (y) { return ai * (y - b + 26); } : function (x) { return a * x + b; });
    };
    /* key: letters; the key advances on letters only */
    B.vigenere = function (s, key, dec) {
        var k = B.codes(key);
        if (!k.length) return String(s);
        return tx.mapLetters(s, function (x, n) { return dec ? x - k[n % k.length] : x + k[n % k.length]; });
    };
    /* key: the cipher alphabet, plain letter i becomes key[i] */
    B.subst = function (s, key, dec) {
        var f = B.codes(key), inv = [];
        f.forEach(function (c, i) { inv[c] = i; });
        return tx.mapLetters(s, function (x) { var y = dec ? inv[x] : f[x]; return y == null ? x : y; });
    };
    /* rail fence on the characters of s as given. offset shifts the start of the zigzag (0 = start on the top rail) */
    B.railPattern = function (n, rails, offset) {
        var per = 2 * (rails - 1), r = [];
        for (var i = 0; i < n; i++) { var m = (i + (offset || 0)) % per; r.push(m < rails ? m : per - m); }
        return r;
    };
    B.railFence = function (s, rails, offset, dec) {
        s = String(s);
        if (rails < 2) return s;
        var pat = B.railPattern(s.length, rails, offset), order = [];
        for (var r = 0; r < rails; r++) for (var i = 0; i < s.length; i++) if (pat[i] === r) order.push(i);
        var out = new Array(s.length);
        order.forEach(function (p, j) { if (dec) out[p] = s.charAt(j); else out[j] = s.charAt(p); });
        return out.join('');
    };
    /* columnar transposition: the text is written in rows of order.length columns, and the columns are read out in
       the order given (order[0] = the column read first, columns numbered from 0). The last row may be short. */
    B.columnar = function (s, order, dec) {
        s = String(s);
        var k = order.length, n = s.length, out = new Array(n), j = 0;
        order.forEach(function (c) {
            for (var p = c; p < n; p += k) { if (dec) out[p] = s.charAt(j++); else out[j++] = s.charAt(p); }
        });
        return out.join('');
    };
    /* the reading order of a keyword's columns (alphabetical, ties left to right): ZEBRA -> [4, 2, 1, 3, 0] */
    B.keyOrder = function (word) {
        var w = tx.letters(word), idx = [];
        for (var i = 0; i < w.length; i++) idx.push(i);
        return idx.sort(function (a, b) { return w.charCodeAt(a) - w.charCodeAt(b) || a - b; });
    };
    /* the number written above each column (1 = read first) for a reading order */
    B.ranks = function (order) { var r = []; order.forEach(function (c, i) { r[c] = i + 1; }); return r; };

    /* ---------- English fitness ---------- */
    var QT = null;
    B.hasQuad = function () { return !!(Calc.data && Calc.data.quadgrams); };
    B.quad = function () {
        if (QT) return QT;
        var d = Calc.data && Calc.data.quadgrams;
        if (!d) throw new Error('data/english-quadgrams.js is not loaded (add it to the tool\'s needs)');
        var t = new Float32Array(456976);
        t.fill(d.floor);
        d.levels.forEach(function (s, k) {
            var v = d.top - k * d.step;
            for (var i = 0; i + 3 < s.length; i += 4) t[(((s.charCodeAt(i) - 65) * 26 + s.charCodeAt(i + 1) - 65) * 26 + s.charCodeAt(i + 2) - 65) * 26 + s.charCodeAt(i + 3) - 65] = v;
        });
        QT = t;
        B.QFLOOR = d.floor;
        return t;
    };
    /* sum of log10 probabilities of the quadgrams of an array of letter codes (map: optional code -> code) */
    B.quadSum = function (c, map) {
        var t = B.quad(), n = c.length, s = 0, i, idx = 0;
        if (n < 4) return 0;
        if (map) {
            for (i = 0; i < 3; i++) idx = idx * 26 + map[c[i]];
            for (i = 3; i < n; i++) { idx = (idx % 17576) * 26 + map[c[i]]; s += t[idx]; }
        } else {
            for (i = 0; i < 3; i++) idx = idx * 26 + c[i];
            for (i = 3; i < n; i++) { idx = (idx % 17576) * 26 + c[i]; s += t[idx]; }
        }
        return s;
    };
    /* average log10 quadgram probability per quadgram: about -4.3 for English text, about -5.9 for random letters.
       Accepts a string (its letters) or an array of codes; null when there are fewer than 4 letters. */
    B.fitness = function (s) {
        var c = typeof s === 'string' ? B.codes(s) : s;
        return c.length < 4 ? null : B.quadSum(c) / (c.length - 3);
    };
    B.EN_FIT = -4.3;
    B.RANDOM_FIT = -5.9;
    /* chi-squared of letter counts against English (tx.EN) */
    B.chi2 = function (counts) {
        var n = 0, x = 0, i;
        for (i = 0; i < 26; i++) n += counts[i];
        if (!n) return Infinity;
        for (i = 0; i < 26; i++) { var e = tx.EN[i] / 100 * n; x += (counts[i] - e) * (counts[i] - e) / e; }
        return x;
    };
    B.countCodes = function (c) { var k = []; for (var i = 0; i < 26; i++) k.push(0); c.forEach(function (x) { k[x]++; }); return k; };
    B.icCounts = function (k) {
        var n = 0, s = 0;
        for (var i = 0; i < 26; i++) { n += k[i]; s += k[i] * (k[i] - 1); }
        return n < 2 ? 0 : s / (n * (n - 1));
    };
    Object.defineProperty(B, 'EN_IC', { get: function () { return tx.EN.reduce(function (a, p) { return a + p * p / 10000; }, 0); } });   // about 0.0655
    B.RANDOM_IC = 1 / 26;
    /* the columns of a period p: column j holds the letters at positions j, j+p, j+2p, ... */
    B.columns = function (c, p) { var cols = []; for (var j = 0; j < p; j++) cols.push([]); c.forEach(function (x, i) { cols[i % p].push(x); }); return cols; };
    B.periodIC = function (c, p) {
        var cols = B.columns(c, p), s = 0, n = 0;
        cols.forEach(function (col) { if (col.length > 1) { s += B.icCounts(B.countCodes(col)); n++; } });
        return n ? s / n : 0;
    };
    /* the likely period from average column ICs [{p, ic}]: the smallest period whose IC comes close to the best one
       (multiples of the true period score just as well). null when no period looks like English. */
    B.pickPeriod = function (rows) {
        var top = 0;
        rows.forEach(function (r) { if (r.ic > top) top = r.ic; });
        if (top < 0.052) return null;
        var thr = B.RANDOM_IC + 0.8 * (Math.min(top, B.EN_IC) - B.RANDOM_IC);
        for (var i = 0; i < rows.length; i++) if (rows[i].ic >= thr) return rows[i].p;
        return null;
    };

    /* ---------- Kasiski: repeated sequences (at least minLen letters, as long as they go) and their distances ------ */
    B.kasiski = function (c, minLen, maxM) {
        minLen = minLen || 3; maxM = maxM || 20;
        var s = B.str(c), n = s.length, at = {}, reps = {}, pairs = 0;
        for (var i = 0; i + minLen <= n; i++) { var g = s.substr(i, minLen); (at[g] = at[g] || []).push(i); }
        Object.keys(at).forEach(function (g) {
            var ps = at[g];
            for (var a = 0; a < ps.length && pairs < 20000; a++) for (var b = a + 1; b < ps.length && pairs < 20000; b++) {
                var i0 = ps[a], j0 = ps[b];
                if (i0 > 0 && s.charAt(i0 - 1) === s.charAt(j0 - 1)) continue;   // part of a longer repeat
                var len = minLen;
                while (j0 + len < n && s.charAt(i0 + len) === s.charAt(j0 + len)) len++;
                if (i0 + len > j0) len = j0 - i0;                                    // no overlap
                if (len < minLen) continue;
                var seq = s.substr(i0, len), r = reps[seq] || (reps[seq] = { seq: seq, pos: [], dists: [] });
                if (r.pos.indexOf(i0) < 0) r.pos.push(i0);
                if (r.pos.indexOf(j0) < 0) r.pos.push(j0);
                r.dists.push(j0 - i0);
                pairs++;
            }
        });
        var list = Object.keys(reps).map(function (k) { reps[k].pos.sort(function (x, y) { return x - y; }); return reps[k]; });
        list.sort(function (x, y) { return y.seq.length - x.seq.length || y.dists.length - x.dists.length || x.pos[0] - y.pos[0]; });
        var all = [];
        list.forEach(function (r) { all = all.concat(r.dists); });
        var tally = [], best = 0;
        for (var m = 2; m <= maxM; m++) {
            var k = all.filter(function (d) { return d % m === 0; }).length;
            tally.push({ m: m, count: k });
            if (k > best) best = k;
        }
        var likely = null;
        if (best >= 1) tally.forEach(function (t) { if (t.count >= 0.8 * best) likely = t.m; });
        return { repeats: list, dists: all, tally: tally, likely: likely, capped: pairs >= 20000 };
    };

    /* ---------- a seeded random generator (same input, same run) ---------- */
    B.hash = function (s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    B.rng = function (seed) {
        var a = (seed >>> 0) || 1;
        return function () { a ^= a << 13; a >>>= 0; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
    };

    /* ---------- display helpers ---------- */
    /* a bar of width cells for a fraction 0..1, in block characters */
    B.bar = function (f, width) {
        width = width || 12;
        var e = Math.max(0, Math.min(width * 8, Math.round(f * width * 8))), full = Math.floor(e / 8), part = e % 8;
        var s = new Array(full + 1).join('█') + (part ? '▏▎▍▌▋▊▉'.charAt(7 - part) : '');
        return s + new Array(width - full - (part ? 1 : 0) + 1).join('░');
    };
    /* a ciphertext written in equal groups (XKCDA PQRSL ...) says nothing about the words: then the plaintext letters
       are run together instead of keeping the groups */
    B.grouped = function (cipher) {
        var w = String(cipher).trim().split(/\s+/), k = w[0].length;
        if (w.length < 3 || k < 3 || k > 10 || w[w.length - 1].length > k) return false;
        return w.every(function (x, i) { return /^[A-Za-z]+$/.test(x) && (x.length === k || i === w.length - 1); });
    };
    B.layout = function (cipher, plain) { return B.grouped(cipher) ? String(plain).replace(/\s+/g, '') : plain; };
    /* the start of a text, on one line, safe as rich text */
    B.preview = function (s, n) {
        s = String(s).replace(/\s+/g, ' ');
        n = n || 40;
        return Calc.esc(s.length > n ? s.slice(0, n) + '…' : s);
    };
    B.f = function (x, d) { return x == null || !isFinite(x) ? '' : x.toFixed(d == null ? 3 : d); };

    /* ---------- minimal decoders: each returns the decoded text, or null when the input does not fit ---------- */
    function bytesToText(b) {
        if (!b || !b.length) return null;
        var esc = '';
        for (var i = 0; i < b.length; i++) esc += '%' + (b[i] < 16 ? '0' : '') + b[i].toString(16);
        try { return decodeURIComponent(esc); } catch (e) { return String.fromCharCode.apply(null, b); }   // not UTF-8: Latin-1
    }
    B.bytesToText = bytesToText;
    B.MORSE = {
        A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
        M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
        Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...',
        8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', '\'': '.----.', '!': '-.-.--', '/': '-..-.',
        '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-',
        '"': '.-..-.', '@': '.--.-.'
    };
    var UNMORSE = {};
    Object.keys(B.MORSE).forEach(function (k) { UNMORSE[B.MORSE[k]] = k; });
    B.decode = {
        base64: function (s) {
            var t = String(s).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
            if (!/^[A-Za-z0-9+/]+={0,2}$/.test(t) || t.length < 4) return null;
            t = t.replace(/=+$/, '');
            if (t.length % 4 === 1) return null;
            var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', bits = 0, acc = 0, out = [];
            for (var i = 0; i < t.length; i++) { acc = (acc << 6) | A.indexOf(t.charAt(i)); bits += 6; if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); } }
            return bytesToText(out);
        },
        base32: function (s) {
            var t = String(s).replace(/\s+/g, '').toUpperCase().replace(/=+$/, '');
            if (!/^[A-Z2-7]+$/.test(t) || t.length < 2 || [1, 3, 6].indexOf(t.length % 8) >= 0) return null;
            var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', bits = 0, acc = 0, out = [];
            for (var i = 0; i < t.length; i++) { acc = ((acc << 5) | A.indexOf(t.charAt(i))) & 0xffff; bits += 5; if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); } }
            return bytesToText(out);
        },
        hex: function (s) {
            var t = String(s).replace(/0x/gi, '').replace(/[\s:,\\x]+/g, '');
            if (!/^[0-9a-fA-F]+$/.test(t) || t.length % 2) return null;
            var out = [];
            for (var i = 0; i < t.length; i += 2) out.push(parseInt(t.substr(i, 2), 16));
            return bytesToText(out);
        },
        binary: function (s) {
            var t = String(s).trim();
            if (!/^[01\s]+$/.test(t)) return null;
            var parts = t.split(/\s+/);
            if (parts.length === 1 || parts.some(function (p) { return p.length > 8; })) {
                var all = t.replace(/\s+/g, '');
                if (all.length % 8) return null;
                parts = all.match(/.{8}/g);
            }
            return bytesToText(parts.map(function (p) { return parseInt(p, 2); }));
        },
        decimal: function (s) {
            var t = String(s).trim();
            if (!/^\d+([\s,;]+\d+)*$/.test(t)) return null;
            var n = t.split(/[\s,;]+/).map(Number);
            if (n.some(function (x) { return x > 0x10FFFF; })) return null;
            try { return n.map(function (x) { return String.fromCodePoint(x); }).join(''); } catch (e) { return null; }
        },
        a1z26: function (s) {
            var t = String(s).trim();
            if (!/^\d+([\s,;.\-/]+\d+)*$/.test(t)) return null;
            var words = t.split(/\s*[/;]\s*|\s{2,}/), bad = false;
            var out = words.map(function (w) {
                return w.split(/[\s,.\-]+/).filter(Boolean).map(function (x) { var k = Number(x); if (k < 1 || k > 26) bad = true; return tx.chr(k - 1); }).join('');
            }).join(' ');
            return bad ? null : out;
        },
        morse: function (s) {
            var t = String(s).replace(/[\u00B7\u2022*]/g, '.').replace(/[_\u2212\u2013\u2014]/g, '-').trim();
            if (!/^[.\-\s/|]+$/.test(t) || !/[.\-]/.test(t)) return null;
            var bad = 0, out = t.split(/\s*[/|]\s*|\s{3,}/).map(function (w) {
                return w.split(/\s+/).filter(Boolean).map(function (c) { var x = UNMORSE[c]; if (!x) { bad++; return '?'; } return x; }).join('');
            }).join(' ');
            return bad * 4 > out.length ? null : out;
        },
        url: function (s) {
            var t = String(s);
            if (!/%[0-9a-fA-F]{2}/.test(t)) return null;
            try { return decodeURIComponent(t.replace(/\+/g, ' ')); } catch (e) { return null; }
        },
        rot13: function (s) { return /[A-Za-z]/.test(s) ? B.caesar(s, 13) : null; },
        atbash: function (s) { return /[A-Za-z]/.test(s) ? tx.mapLetters(s, function (x) { return 25 - x; }) : null; },
        reverse: function (s) { return String(s).length > 1 ? String(s).split('').reverse().join('') : null; }
    };
    /* how much a decoded text looks like readable English, 0 to 100: printable characters, and the quadgram fitness
       of its letters. */
    B.readability = function (s) {
        s = String(s == null ? '' : s);
        if (!s.length) return { score: 0, printable: 0, letters: 0, fit: null };
        var pr = 0, le = 0;
        for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if ((c >= 32 && c < 127) || c === 9 || c === 10 || c === 13 || (c >= 160 && c < 0x2000)) pr++;
            if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) le++;
        }
        var p = pr / s.length, l = le / s.length, fit = le >= 4 ? B.fitness(s) : null;
        var f = fit == null ? 0.15 : Math.max(0, Math.min(1, (fit - B.RANDOM_FIT) / (B.EN_FIT - B.RANDOM_FIT)));
        var lw = Math.min(1, l / 0.6);
        return { score: 100 * Math.pow(p, 3) * f * (0.4 + 0.6 * lw), printable: p, letters: l, fit: fit };
    };
})(typeof window !== 'undefined' ? window : globalThis);
