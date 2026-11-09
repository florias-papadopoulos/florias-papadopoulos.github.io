/* Tests for the Code breaking tools and lib/code-breaking.js (see run.js for the API). Every breaker gets English
   paragraphs (written for these tests) enciphered with random keys by the library, and must give the key or the
   plaintext back. */
(function () {
    var B = Calc.lib.breaking, tx = Calc.lib.text;
    var P = [
        'The old lighthouse keeper climbed the narrow stairs every evening before the sun went down. He trimmed the wick, polished the great lens until it shone like water, and wrote the weather in a small book with a green cover. Ships passed far out at sea, and none of the sailors ever knew his name, yet each of them trusted the light he kept burning through the long winter nights.',
        'On market days the square filled with carts long before dawn. Farmers brought apples, cheese and baskets of brown eggs, while the baker sold warm bread from a window that opened onto the street. Children ran between the stalls with their dogs, and the musicians played the same three songs until even the pigeons seemed to know the words. By noon everything was sold and the square was quiet again.',
        'A secret message is only as strong as the method that hides it. For centuries clerks and soldiers trusted simple ciphers that shifted or replaced letters, and for centuries patient readers broke them by counting. The most common letter in a long English text is almost always E, followed by T and A, and that single fact undid many kings and generals who believed their letters were safe.',
        'The night train left the city at a quarter past eleven and rolled slowly through the sleeping towns of the valley. In the dining car a tired waiter poured coffee for two travellers who had never met before, and by the time the first grey light appeared over the hills they had told each other the stories of their lives, which neither of them had ever told anyone else.',
        'Every spring the river rose over its banks and covered the low meadows with a sheet of brown water. The farmers had learned long ago to keep their sheep on the hill until June, and the old stone bridge, built by monks who could not have imagined a motor car, still carried the morning bus across without complaint, although it shook a little whenever a heavy lorry followed close behind.'
    ];
    function randKey(r, n) { var s = ''; for (var i = 0; i < n; i++) s += tx.chr(r.num(0, 25)); return s; }
    function randPerm(r, n) { var a = []; for (var i = 0; i < n; i++) a.push(i); for (i = n - 1; i > 0; i--) { var j = r.num(0, i), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function distinctKey(r, n) { return randPerm(r, 26).slice(0, n).map(function (k) { return tx.chr(k); }).join(''); }
    function randAlphabet(r) { return randPerm(r, 26).map(function (k) { return tx.chr(k); }).join(''); }
    function share(a, b) { var n = 0, m = Math.min(a.length, b.length); for (var i = 0; i < m; i++) if (a.charAt(i) === b.charAt(i)) n++; return a.length === b.length && m ? n / m : 0; }

    /* ---------- the library ---------- */
    T.eq('breaking.caesar', B.caesar('Hello, World!', 3), 'Khoor, Zruog!');
    T.eq('breaking.affine', B.affine('AFFINE cipher', 5, 8), 'IHHWVC swfrcp');
    T.eq('breaking.affine dec', B.affine('IHHWVC swfrcp', 5, 8, true), 'AFFINE cipher');
    T.eq('breaking.vigenere', B.vigenere('Attack at dawn', 'LEMON'), 'Lxfopv ef rnhr');
    T.eq('breaking.vigenere dec', B.vigenere('Lxfopv ef rnhr', 'LEMON', true), 'Attack at dawn');
    T.eq('breaking.railFence', B.railFence('WEAREDISCOVEREDFLEEATONCE', 3, 0), 'WECRLTEERDSOEEFEAOCAIVDEN');
    T.eq('breaking.keyOrder', B.keyOrder('ZEBRAS').join(','), '4,2,1,3,5,0');
    T.eq('breaking.columnar', B.columnar('WEAREDISCOVEREDFLEEATONCE', B.keyOrder('ZEBRAS')), 'EVLNACDTESEAROFODEECWIREE');
    T.eq('breaking.ranks', B.ranks(B.keyOrder('ZEBRAS')).join(' '), '6 3 2 4 1 5');
    T.eq('breaking.subst', B.subst('flee at once', 'ZEBRASCDFGHIJKLMNOPQTUVWXY'), 'siaa zq lkba');
    T.eq('breaking.base64', B.decode.base64('Zm9vYg=='), 'foob');
    T.eq('breaking.base64 utf8', B.decode.base64(Buffer.from('café ✓').toString('base64')), 'café ✓');
    T.eq('breaking.base32', B.decode.base32('MZXW6YTBOI======'), 'foobar');
    T.eq('breaking.hex', B.decode.hex('48 65 6c 6c 6f'), 'Hello');
    T.eq('breaking.binary', B.decode.binary('01001000 01101001'), 'Hi');
    T.eq('breaking.morse', B.decode.morse('... --- ... / ... --- ...'), 'SOS SOS');
    T.eq('breaking.a1z26', B.decode.a1z26('8 5 12 12 15'), 'HELLO');
    T.eq('breaking.url', B.decode.url('a%20b%2Bc+d'), 'a b+c d');
    T.ok('breaking.base64 rejects', B.decode.base64('abc$') === null && B.decode.hex('abc') === null && B.decode.morse('hello') === null);
    T.ok('breaking.fitness', B.fitness(P[0]) > -4.6 && B.fitness(B.caesar(P[0], 5)) < -5.4 && B.fitness('abc') === null);
    T.prop('breaking round trips', 200, function (r) {
        var s = r.text(r.num(0, 80)), k = r.num(0, 25), a = r.pick(B.AFFINE_A), key = randKey(r, r.num(1, 9)), alpha = randAlphabet(r);
        var rails = r.num(2, 9), off = r.num(0, 2 * rails - 3), order = randPerm(r, r.num(1, 12));
        if (B.caesar(B.caesar(s, k), 26 - k) !== s) return 'caesar ' + k;
        if (B.affine(B.affine(s, a, k), a, k, true) !== s) return 'affine ' + a + ',' + k;
        if (B.vigenere(B.vigenere(s, key), key, true) !== s) return 'vigenere ' + key;
        if (B.subst(B.subst(s, alpha), alpha, true) !== s) return 'subst ' + alpha;
        if (B.railFence(B.railFence(s, rails, off), rails, off, true) !== s) return 'rail ' + rails + ',' + off;
        if (B.columnar(B.columnar(s, order), order, true) !== s) return 'columnar ' + order;
        return true;
    });

    /* ---------- frequency analysis ---------- */
    T.tool('frequency-analysis', [
        { in: { text: 'AAB', sort: 'count' }, copy: 'A\t2\t66.67\nB\t1\t33.33\nIC\t0.3333' },
        { in: { text: 'b, a! A?', sort: 'alpha' }, copy: 'A\t2\t66.67\nB\t1\t33.33\nIC\t0.3333' },
        { in: { text: 'Été', sort: 'count' }, copy: 'E\t2\t66.67\nT\t1\t33.33\nIC\t0.3333' },
        { in: { text: P[0], sort: 'count' }, check: function (S, c) { return /^E\t/.test(c) || c; } },
        { in: { text: '12345 !!', sort: 'count' }, error: true },
        { in: { text: '', sort: 'count' }, error: true }
    ]);

    /* ---------- index of coincidence ---------- */
    T.tool('index-of-coincidence', [
        { in: { text: 'AAAAA BBBBB', maxp: '20' }, copy: 'IC 0.4444\nperiod 1' },
        { in: { text: 'AABB', maxp: '20' }, copy: 'IC 0.3333\nperiod none' },
        { in: { text: P[0] + P[1], maxp: '20' }, check: function (S, c) { return /period 1$/.test(c) || c; } },
        { in: { text: 'A', maxp: '20' }, error: true },
        { in: { text: P[0], maxp: '0' }, error: true },
        { in: { text: P[0], maxp: '2.5' }, error: true }
    ]);
    /* keys of distinct letters: a key such as EPZIUIMI is partly periodic (I every 4 letters) and fools both tests a little */
    T.prop('index-of-coincidence finds the Vigenere period', 16, function (r, i) {
        var L = 3 + (i % 8), key = distinctKey(r, L), ct = B.vigenere(P[i % 5] + ' ' + P[(i + 1) % 5], key);
        return T.run('index-of-coincidence', { text: ct, maxp: '20' }).then(function (o) { return o.copy.split('\n')[1] === 'period ' + L ? true : 'key ' + key + ': ' + o.copy; });
    });

    /* ---------- Kasiski ---------- */
    T.tool('kasiski', [
        { in: { text: 'ABCDEABCDE', min: '3', maxm: '20' }, copy: '5' },
        { in: { text: 'ABCDEFGHIJ', min: '3', maxm: '20' }, copy: 'none' },
        { in: { text: 'ABC', min: '3', maxm: '20' }, error: true },
        { in: { text: P[0], min: '3', maxm: '1' }, error: true }
    ]);
    T.prop('kasiski finds the key length', 10, function (r, i) {
        var L = 3 + (i % 6), key = distinctKey(r, L), ct = B.vigenere(P[i % 5] + P[(i + 1) % 5] + P[(i + 2) % 5], key);
        return T.run('kasiski', { text: ct, min: '3', maxm: '20' }).then(function (o) { return o.copy === String(L) ? true : 'key ' + key + ' gave ' + o.copy; });
    });

    /* ---------- Caesar ---------- */
    T.tool('caesar-breaker', [
        { in: { text: 'Aol xbpjr iyvdu mve qbtwz vcly aol shgf kvn.', rank: 'quad' }, copy: 'The quick brown fox jumps over the lazy dog.' },
        { in: { text: B.caesar(P[2], 13), rank: 'chi' }, copy: P[2] },
        { in: { text: P[1], rank: 'quad' }, copy: P[1] },
        { in: { text: 'ab', rank: 'quad' }, check: function (S, c) { return c.length === 2 || c; } },
        { in: { text: tx.groups(tx.letters(B.caesar(P[0], 4)), 5), rank: 'quad' }, copy: tx.letters(P[0]) },   // groups of 5: letters run together
        { in: { text: '2024!', rank: 'quad' }, error: true }
    ]);
    T.prop('caesar-breaker every shift', 26, function (r, k) {
        var p = P[k % 5];
        return T.run('caesar-breaker', { text: B.caesar(p, k), rank: k % 2 ? 'chi' : 'quad' }).then(function (o) { return o.copy === p ? true : 'shift ' + k; });
    });

    /* ---------- affine ---------- */
    T.tool('affine-breaker', [
        { in: { text: B.affine(P[3], 25, 25) }, copy: P[3], check: function (S) { return /Atbash/.test(S.notes.join(' ')) || 'Atbash not named'; } },
        { in: { text: 'abc' }, error: true }
    ]);
    T.prop('affine-breaker random keys', 30, function (r, i) {
        var a = r.pick(B.AFFINE_A), b = r.num(0, 25), p = P[i % 5];
        return T.run('affine-breaker', { text: B.affine(p, a, b) }).then(function (o) { return o.copy === p ? true : 'key ' + a + ',' + b; });
    });

    /* ---------- Vigenere ---------- */
    T.prop('vigenere-breaker key lengths 3 to 10 on one paragraph', 24, function (r, i) {
        var L = 3 + (i % 8), key = randKey(r, L), p = P[i % 5];
        return T.run('vigenere-breaker', { text: B.vigenere(p, key), len: 'auto' }).then(function (o) { return o.copy === p ? true : 'key ' + key + ' (' + tx.letters(p).length + ' letters): got ' + o.S.notes[0]; });
    });
    T.tool('vigenere-breaker', [
        { in: { text: B.vigenere(P[0], 'LANTERN'), len: '7' }, copy: P[0] },
        { in: { text: B.vigenere(P[1], 'KEY'), len: '6' }, copy: P[1], check: function (S) { return /Key: KEY /.test(S.notes[0]) || S.notes[0]; } },
        { in: { text: B.caesar(P[2], 9), len: 'auto' }, copy: P[2] },
        { in: { text: 'ABCDEFGHIJ', len: '6' }, error: true },
        { in: { text: 'short', len: 'auto' }, error: true }
    ]);

    /* ---------- substitution ---------- */
    T.prop('substitution-solver random keys', 8, function (r, i) {
        var alpha = randAlphabet(r), p = i % 2 ? P[i % 5] + ' ' + P[(i + 1) % 5] : P[i % 5] + ' ' + P[(i + 1) % 5].slice(0, 140);
        return T.run('substitution-solver', { text: B.subst(p, alpha), fixed: '', time: '10' }).then(function (o) {
            var got = tx.letters(o.copy), want = tx.letters(p), q = share(got, want);
            return q >= 0.99 ? true : 'only ' + (100 * q).toFixed(1) + ' percent right (' + want.length + ' letters)';
        });
    });
    var subKey = 'QWERTYUIOPASDFGHJKLZXCVBNM', subCt = B.subst(P[4], subKey);
    T.tool('substitution-solver', [
        { in: { text: subCt, fixed: 'Z=T, i = h', time: '10' }, copy: P[4] },
        /* a wrong letter fixed by hand stays as it is: ciphertext T (plain E) is forced to X */
        { in: { text: subCt, fixed: 'T=X', time: '10' }, check: function (S, c) { var e = tx.letters(P[4]), g = tx.letters(c); for (var i = 0; i < e.length; i++) if (e.charAt(i) === 'E' && g.charAt(i) !== 'X') return 'fixed letter not kept'; return true; } },
        { in: { text: subCt, fixed: 'Q=T, Q=H', time: '10' }, error: true },
        { in: { text: subCt, fixed: 'A=T, B=T', time: '10' }, error: true },
        { in: { text: subCt, fixed: 'QT', time: '10' }, error: true },
        { in: { text: 'too short', fixed: '', time: '10' }, error: true }
    ]);

    /* ---------- transposition ---------- */
    T.prop('transposition-breaker rail fence', 14, function (r, i) {
        var rails = 2 + (i % 7), off = i % 2 ? r.num(1, 2 * rails - 3) : 0, p = tx.letters(P[i % 5]);
        return T.run('transposition-breaker', { text: B.railFence(p, rails, off), kind: i % 2 ? 'rail' : 'both', maxc: '7' }).then(function (o) {
            if (o.copy === p) return true;
            /* other offsets give the plaintext turned by a few letters, which scores almost the same: a genuine tie, which
               the tool settles for offset 0. Accept such a turn when the rail count is right. */
            var turned = false;
            for (var t = 1; t < 2 * rails; t++) if (o.copy === p.slice(t) + p.slice(0, t) || o.copy === p.slice(-t) + p.slice(0, -t)) turned = true;
            return turned && o.S.notes[0].indexOf(rails + ' rails') >= 0 ? true : rails + ' rails, offset ' + off + ': ' + o.S.notes[0];
        });
    });
    T.prop('transposition-breaker columnar 5 to 7 columns', 6, function (r, i) {
        var k = 5 + (i % 3), order = randPerm(r, k), p = tx.letters(P[i % 5]);
        return T.run('transposition-breaker', { text: B.columnar(p, order), kind: 'col', maxc: '8' }).then(function (o) { return o.copy === p ? true : 'key ' + B.ranks(order).join(' ') + ' gave ' + o.S.notes[0]; });
    });
    T.prop('transposition-breaker columnar 10 columns by hill climbing', 2, function (r, i) {
        var order = randPerm(r, 10), p = tx.letters(P[i] + P[i + 1]);
        return T.run('transposition-breaker', { text: B.columnar(p, order), kind: 'col', maxc: '10' }).then(function (o) { return o.copy === p ? true : 'key ' + B.ranks(order).join(' ') + ' gave ' + o.S.notes[0]; });
    });
    T.tool('transposition-breaker', [
        { in: { text: 'WECRLTEERDSOEEFEAOCAIVDEN', kind: 'rail', maxc: '8' }, copy: 'WEAREDISCOVEREDFLEEATONCE' },
        { in: { text: 'abc', kind: 'both', maxc: '8' }, error: true }
    ]);

    /* ---------- cipher identifier ---------- */
    function playfair(s, key) {
        var sq = tx.keyedAlphabet(key, 'ABCDEFGHIKLMNOPQRSTUVWXYZ'), L = tx.letters(s).replace(/J/g, 'I'), pairs = [], i = 0;
        while (i < L.length) { var a = L.charAt(i), b = L.charAt(i + 1); if (!b || a === b) { pairs.push(a + (a === 'X' ? 'Q' : 'X')); i++; } else { pairs.push(a + b); i += 2; } }
        return pairs.map(function (p) {
            var x = sq.indexOf(p.charAt(0)), y = sq.indexOf(p.charAt(1)), rx = Math.floor(x / 5), cx = x % 5, ry = Math.floor(y / 5), cy = y % 5;
            if (rx === ry) return sq.charAt(rx * 5 + (cx + 1) % 5) + sq.charAt(ry * 5 + (cy + 1) % 5);
            if (cx === cy) return sq.charAt(((rx + 1) % 5) * 5 + cx) + sq.charAt(((ry + 1) % 5) * 5 + cy);
            return sq.charAt(rx * 5 + cy) + sq.charAt(ry * 5 + cx);
        }).join('');
    }
    var bacon = tx.letters(P[2]).slice(0, 40).split('').map(function (c) { var k = tx.idx(c), s = ''; for (var b = 4; b >= 0; b--) s += (k >> b) & 1 ? 'B' : 'A'; return s; }).join(' ');
    var polyb = tx.letters(P[1]).replace(/J/g, 'I').split('').map(function (c) { var k = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'.indexOf(c); return (Math.floor(k / 5) + 1) + '' + (k % 5 + 1); }).join(' ');
    var adfgx = tx.letters(P[0]).slice(0, 120).split('').map(function (c, i) { return 'ADFGX'.charAt(c.charCodeAt(0) % 5) + 'ADFGX'.charAt(i % 5); }).join('');
    var morse = tx.letters(P[3]).slice(0, 60).split('').map(function (c) { return B.MORSE[c]; }).join(' ');
    var bin = Buffer.from('Binary is only a way of writing bytes').toString('hex').match(/../g).map(function (h) { return ('0000000' + parseInt(h, 16).toString(2)).slice(-8); }).join(' ');
    var ids = [
        ['plain', P[0], /^Not enciphered/],
        ['caesar', B.caesar(P[1], 7), /^Caesar/],
        ['rot13', B.caesar(P[1], 13), /^ROT13/],
        ['affine', B.affine(P[2], 11, 4), /^Affine/],
        ['atbash', B.affine(P[2], 25, 25), /^Atbash/],
        ['reversed', P[3].split('').reverse().join(''), /^Reversed/],
        ['substitution', B.subst(P[0] + P[1], 'QWERTYUIOPASDFGHJKLZXCVBNM'), /^Monoalphabetic substitution/],
        ['vigenere', B.vigenere(P[0] + P[3], 'ORCHARD'), /^Vigen/],
        ['columnar', B.columnar(tx.letters(P[4]), [3, 0, 4, 2, 1]), /^Transposition/],
        ['rail', B.railFence(tx.letters(P[1]), 3, 0), /^Transposition/],
        ['playfair', playfair(P[0] + P[1], 'MONARCHY'), /^Playfair/],
        ['bacon', bacon, /^Baconian/],
        ['polybius', polyb, /^Polybius/],
        ['adfgx', adfgx, /^ADFGX/],
        ['morse', morse, /^Morse/],
        ['binary', bin, /^Binary/],
        ['base64', Buffer.from(P[2]).toString('base64'), /^Base64/],
        ['hex', Buffer.from(P[3]).toString('hex'), /^Hexadecimal/],
        ['base32', 'KRUGKIDOMFWWKIDPMYQHI2DFEBZWQ2LQEB3WC4ZAINQXE4DBORUGSYJAJBSXEZI=', /^Base32/],
        ['url', 'Meet%20me%20at%20the%20caf%C3%A9%20at%20noon%3F', /^URL/],
        ['decimal', '72 101 108 108 111 32 116 104 101 114 101', /^Decimal/]
    ];
    T.tool('cipher-identifier', ids.map(function (x) {
        return { in: { text: x[1] }, check: function (S, c) { return x[2].test(c) || x[0] + ': got ' + c; } };
    }).concat([{ in: { text: '   ' }, error: true }]));

    /* ---------- decoder guesser ---------- */
    var msg = 'Meet me by the old oak tree after the rain stops';
    var hexOfMsg = Buffer.from(msg).toString('hex');
    T.tool('decoder-guesser', [
        { in: { text: Buffer.from(msg).toString('base64'), chain: true }, copy: msg },
        { in: { text: hexOfMsg, chain: true }, copy: msg },
        { in: { text: hexOfMsg.match(/../g).join(' ').toUpperCase(), chain: false }, copy: msg },
        { in: { text: tx.letters(msg).split('').map(function (c) { return B.MORSE[c]; }).join(' '), chain: true }, copy: tx.letters(msg) },
        { in: { text: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..', chain: true }, copy: 'HELLO WORLD' },
        { in: { text: Buffer.from(msg).toString('hex').match(/../g).map(function (h) { return ('0000000' + parseInt(h, 16).toString(2)).slice(-8); }).join(''), chain: true }, copy: msg },
        { in: { text: encodeURIComponent(msg), chain: true }, copy: msg },
        { in: { text: B.caesar(msg, 13), chain: true }, copy: msg },
        { in: { text: msg.split('').reverse().join(''), chain: true }, copy: msg },
        { in: { text: Buffer.from(hexOfMsg).toString('base64'), chain: true }, copy: msg, check: function (S) { return S.res.label === 'Base64, then Hexadecimal bytes' || S.res.label; } },
        { in: { text: msg, chain: true }, copy: msg },
        { in: { text: 'xq zv kj wq', chain: true }, copy: 'none' },
        { in: { text: ' ', chain: true }, error: true }
    ]);
})();
