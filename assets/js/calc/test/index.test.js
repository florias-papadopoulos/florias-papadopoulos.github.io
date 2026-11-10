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
        ['The cat is on the mat and it is happy to be there with you', 'vigenere'], ['héllo wörld!', 'base64']
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
    ['', 'vigenere', 'rsa', 'base', 'mod'].forEach(function (w) {
        T.prop('paste guess leaves search words alone: ' + JSON.stringify(w), 1, function () { return G.guess(w) === null ? true : 'recognised ' + JSON.stringify(G.guess(w).what); });
    });
})();
