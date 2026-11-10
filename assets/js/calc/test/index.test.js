/* The Toolbox tab's paste recognition (assets/js/calc/index.js): what is recognised, and that every suggested link
   really runs its tool (the parameters are the tool's input ids, select values exist, no input error). */
(function () {
    var G = global.ToolboxGuess;
    var cases = [
        ['3^200 mod 7', 'modular-exponentiation'], ['17^-1 mod 3120', 'modular-inverse'], ['inverse of 17 mod 3120', 'modular-inverse'],
        ['123 mod 4', 'modulo'], ['-17 % 5', 'modulo'], ['14x ≡ 30 (mod 100)', 'linear-congruence'],
        ['x = 2 mod 3\nx = 3 mod 5\nx = 2 mod 7', 'chinese-remainder'], ['252, 105', 'gcd'], ['12 18 30', 'gcd'],
        ['1000000007', 'prime-factorization'], ['0.1', 'ieee754'], ['1/3 + 1/6', 'fractions'], ['2^127 - 1', 'big-number'],
        ['[[1,2],[3,4]]', 'matrix'], ['01001000 01101001', 'binary'], ['.... . .-.. .-.. ---', 'morse'],
        ['hello%20world%21', 'url-encoding'], ['48 65 6c 6c 6f', 'hex'], ['deadbeef', 'hex'], ['SGVsbG8gd29ybGQ=', 'base64'],
        ['LXFOPVEFRNHR LXFOPVEFRNHR QWERT', 'cipher-identifier'],
        ['The cat is on the mat and it is happy to be there with you', 'vigenere'], ['héllo wörld!', 'base64'],
        /* calculations with a modulus: one power is square and multiply, anything longer the modular calculator */
        ['374^34 * 345^394 mod 29332', 'modular-calculator'], ['2^(10^100) mod 1000007', 'modular-exponentiation'],
        ['3/4 mod 7', 'modular-calculator'], ['(5 + 9) (mod 4)', 'modulo'], ['17 ** -1 mod 3120', 'modular-inverse'],
        /* requests in words */
        ['factor 360', 'prime-factorization'], ['is 97 prime?', 'primality-test'], ['gcd of 12 and 18', 'gcd'], ['lcm(4, 6, 10)', 'gcd'],
        ['255 in binary', 'base-conversion'], ['0xff to decimal', 'base-conversion'], ['sha256 hello', 'hash'], ['md5 of hello', 'hash'],
        ['rot13 hello', 'rot13'], ['caesar 3 hello world', 'caesar'], ['10 choose 3', 'binomial'], ['primes up to 100', 'prime-sieve'],
        ['phi(36)', 'euler-totient'], ['decode SGVsbG8gd29ybGQ=', 'base64'], ['order of 3 mod 7', 'multiplicative-order']
    ];
    cases.forEach(function (c, i) {
        T.prop('paste guess ' + (i + 1) + ': ' + c[0].slice(0, 30), 1, function () {
            var g = G.guess(c[0]);
            if (!g) return 'nothing recognised';
            if (g.tools[0][0] !== c[1]) return 'first suggestion ' + g.tools[0][0] + ', wanted ' + c[1];
            /* every suggestion runs */
            return Promise.all(g.tools.map(function (t) {
                var def = Calc.tools[t[0]];
                if (!def) return 'unknown tool ' + t[0];
                var ids = def.inputs.map(function (f) { return f.id; });
                /* "do" picks the button (the action), as in a tool's address */
                var bad = Object.keys(t[2]).filter(function (k) { return k !== 'do' && ids.indexOf(k) < 0; });
                if (bad.length) return t[0] + ' has no input ' + bad.join(', ');
                if (t[2]['do'] && !(def.actions || []).some(function (a) { return a.id === t[2]['do']; })) return t[0] + ' has no action ' + t[2]['do'];
                var vals = {};
                Object.keys(t[2]).forEach(function (k) { if (k !== 'do') vals[k] = t[2][k]; });
                var action = t[2]['do'] || (def.actions ? (/^(Encode|Its bytes|Encrypt)/.test(t[1]) ? def.actions[0].id : (def.actions[1] || def.actions[0]).id) : undefined);
                return Calc.run(def, vals, action).then(function (o) { return o.errors ? t[0] + ' errors ' + JSON.stringify(o.errors) : true; });
            })).then(function (rs) { var b = rs.filter(function (r) { return r !== true; }); return b.length ? b.join('; ') : true; });
        });
    });
    /* the instant answer agrees with the tools: random sums mod n against the modular calculator, without a modulus
       against the big number calculator */
    T.prop('instant answer mod n = modular calculator', 40, function (r) {
        var ops = ['+', '-', '*'], e = '';
        for (var k = 0; k < 4; k++) e += (k ? ' ' + r.pick(ops) + ' ' : '') + r.int(1, 999) + '^' + r.int(0, 400);
        var n = String(r.int(2, 99999)), ans = G.answer(e + ' mod ' + n);
        if (!ans || ans.error) return 'no answer for ' + e;
        return T.run('modular-calculator', { expr: e, n: n }).then(function (o) {
            return o.copy && o.copy.split(/\D+/).indexOf(ans.copy) >= 0 ? true : e + ' mod ' + n + ': answer ' + ans.copy + ', tool ' + o.copy;
        });
    });
    T.prop('instant answer = big number calculator', 30, function (r) {
        var e = r.int(1, 99999) + ' * (' + r.int(1, 999) + ' + ' + r.int(1, 999) + ')^' + r.int(0, 30) + ' - ' + r.int(1, 9999);
        var ans = G.answer(e);
        if (!ans || ans.error) return 'no answer for ' + e;
        return T.run('big-number', { expr: e }).then(function (o) {
            return o.copy && o.copy.replace(/\D/g, '').indexOf(ans.copy.replace('-', '')) >= 0 ? true : e + ': answer ' + ans.copy + ', tool ' + o.copy;
        });
    });
    [['1/3 + 1/6', '1/2'], ['2^-2', '1/4'], ['(2+3)(4+5)', '45'], ['10!', '3628800'], ['gcd(12, 18) + lcm(4, 6)', '18'], ['-7 mod 5', '3'],
     ['3^-1 mod 7', '5'], ['2 / 4 mod 9', '5'], ['20! mod 19', '0'], ['0x10 + 0b11', '19']].forEach(function (c) {
        T.eq('instant answer ' + c[0], (G.answer(c[0]) || {}).copy, c[1]);
    });
    ['2^10000000', '2/0', '4/2 mod 6', '(-1)!'].forEach(function (c) {
        T.ok('instant answer refuses ' + c, (G.answer(c) || {}).error, 'no error message for ' + c + ': ' + JSON.stringify(G.answer(c)));
    });
    ['42', 'hello', '12 18', 'vigenere'].forEach(function (c) {
        T.ok('no instant answer for ' + c, !G.answer(c), 'answered ' + c);
    });
    /* words: typos and other words */
    [['factorisation', 'prime factorization of n'], ['exponentation', 'modular exponentiation'], ['sha256', 'hash sha md5'], ['inverse', 'modular inverse']].forEach(function (c) {
        T.ok('word match ' + c[0], G.wordMatch(c[0], c[1], c[1].split(' ')), c[0] + ' does not match ' + c[1]);
    });
    ['', 'vigenere', 'rsa', 'base', 'mod', 'sha256', 'md5', 'rot13', 'base64'].forEach(function (w) {
        T.prop('paste guess leaves search words alone: ' + JSON.stringify(w), 1, function () { return G.guess(w) === null ? true : 'recognised ' + JSON.stringify(G.guess(w).what); });
    });
})();
