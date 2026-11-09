/* Toolbox: counting. Permutations, arrangements with and without repetition, combinations with and without
   repetition, multinomial coefficients, circular arrangements and derangements: the formula, the numbers put in,
   what the formula counts, a list of all cases when there are few, and the four basic counts side by side. */
Calc.tool({
    id: 'combinatorics',
    live: true,
    inputs: [
        { id: 'kind', type: 'select', label: 'What to count', width: 'full', value: 'comb', options: [
            ['perm', 'Permutations: orderings of all n objects (n!)'],
            ['arr', 'Arrangements: ordered choice of k of n, no repetition'],
            ['arrrep', 'Arrangements with repetition: sequences of length k from n symbols'],
            ['comb', 'Combinations: unordered choice of k of n, no repetition'],
            ['combrep', 'Combinations with repetition: k from n kinds, repeats allowed'],
            ['multi', 'Multinomial: orderings of objects with repeats (like the letters of a word)'],
            ['circ', 'Circular arrangements: n objects around a round table'],
            ['derange', 'Derangements: orderings where nothing stays in its place']
        ] },
        { id: 'n', label: '$n$', placeholder: '5', min: 0, when: { kind: ['perm', 'arr', 'arrrep', 'comb', 'combrep', 'circ', 'derange'] } },
        { id: 'k', label: '$k$', placeholder: '3', min: 0, when: { kind: ['arr', 'arrrep', 'comb', 'combrep'] } },
        { id: 'ks', type: 'list', label: 'Group sizes $k_1, k_2, \\dots$', width: 'l', placeholder: '1, 4, 4, 2', when: { kind: 'multi' }, help: 'How many copies of each kind of object: MISSISSIPPI is 1, 4, 4, 2 (M, I, S, P).' }
    ],
    examples: [
        { kind: 'comb', n: '5', k: '3' },
        { kind: 'arr', n: '4', k: '2' },
        { kind: 'perm', n: '4' },
        { kind: 'arrrep', n: '10', k: '4' },
        { kind: 'combrep', n: '3', k: '2' },
        { kind: 'multi', ks: '1, 4, 4, 2' },
        { kind: 'derange', n: '4' },
        { kind: 'circ', n: '5' }
    ],
    run: function (v, S) {
        var gm = Calc.lib.gmath, T = Calc.tex, B = gm.bigTex, kind = v.kind;
        var n = v.n, k = v.k;
        var LIM = 20000n;
        function fact(m) { if (m > LIM) Calc.fail('That needs more than ' + LIM + ' factors; please use smaller numbers.', 'n'); var r = 1n; for (var i = 2n; i <= m; i++) r *= i; return r; }
        function falling(a, b) { if (b > LIM) Calc.fail('That needs more than ' + LIM + ' factors; please use a smaller k.', 'k'); var r = 1n; for (var i = 0n; i < b; i++) r *= a - i; return r; }
        function binom(a, b) { if (b < 0n || b > a) return 0n; if (a - b < b) b = a - b; return falling(a, b) / fact(b); }
        /* a product written out: 5 \cdot 4 \cdot 3, shortened when long */
        function prodTex(from, count) {
            if (count === 0n) return '1';
            if (count <= 8n) { var t = []; for (var i = 0n; i < count; i++) t.push(T(from - i)); return t.join(' \\cdot '); }
            return T(from) + ' \\cdot ' + T(from - 1n) + ' \\cdots ' + T(from - count + 1n);
        }
        var LET = 'ABCDEFGHIJKLMNOP';
        /* all the cases, when there are few: sequences of length len over n letters */
        function enumerate(nn, len, ordered, rep) {
            var out = [];
            (function go(prefix, start, used) {
                if (out.length > 40) return;
                if (prefix.length === len) { out.push(prefix); return; }
                for (var i = ordered ? 0 : start; i < nn; i++) {
                    if (!rep && used[i]) continue;
                    used[i] = true;
                    go(prefix + LET.charAt(i), rep ? i : i + 1, used);
                    used[i] = false;
                }
            })('', 0, {});
            return out;
        }
        function listStep(items, what) {
            if (!items || items.length > 36 || !items.length) return;
            S.step('All of them').p(what).pre(items.join('  '));
        }
        var val, s = S.step('The formula'), label, copyTex;
        var big = function (x) { return B(x); };

        if (kind === 'perm') {
            val = fact(n);
            label = T(n) + '!';
            s.p('Put $' + T(n) + '$ different objects in a row: $' + T(n) + '$ choices for the first place, one fewer for the next, and so on.');
            s.math(T(n) + '! = ' + (n === 0n ? '1' : prodTex(n, n)) + ' = ' + big(val));
            S.step('What it counts').p('The number of ways to order $n$ different objects, all of them, each used once: the shuffles of a deck, the possible rankings of $n$ runners.');
            if (n <= 4n) listStep(enumerate(Number(n), Number(n), true, false), 'With the objects called ' + LET.slice(0, Number(n)).split('').join(', ') + ':');
            if (n === 0n) S.note('$0! = 1$: there is exactly one way to arrange nothing (the empty arrangement).');
        } else if (kind === 'arr') {
            if (k > n) { val = 0n; s.p('There are not enough objects: $k = ' + T(k) + ' > n = ' + T(n) + '$, so no arrangement without repetition exists.').math('P(' + T(n) + ', ' + T(k) + ') = 0'); }
            else {
                val = falling(n, k);
                s.p('$n$ choices for the first place, $n - 1$ for the second, down to $n - k + 1$ for the $k$-th: $P(n, k) = n (n-1) \\cdots (n-k+1) = \\dfrac{n!}{(n-k)!}$.');
                s.math('P(' + T(n) + ', ' + T(k) + ') = \\frac{' + T(n) + '!}{' + T(n - k) + '!} = ' + prodTex(n, k) + ' = ' + big(val));
            }
            label = 'P(' + T(n) + ', ' + T(k) + ')';
            S.step('What it counts').p('Ordered choices of $k$ out of $n$ different objects, each used at most once: gold, silver and bronze among $n$ runners, or a $k$-letter word with no letter twice.');
            if (k <= n && val <= 36n) listStep(enumerate(Number(n), Number(k), true, false), 'With the objects called ' + LET.slice(0, Number(n)).split('').join(', ') + ':');
        } else if (kind === 'arrrep') {
            if (gm.abs(n) > 1n && BigInt(n.toString(2).length) * k > 200000n) Calc.fail('The result would have over 200000 bits.', 'k');
            val = n ** k;
            label = T(n) + '^{' + T(k) + '}';
            s.p('Each of the $k$ positions takes any of the $n$ symbols, independently: multiply $n$ by itself $k$ times.');
            s.math(T(n) + '^{' + T(k) + '} = ' + (k <= 8n && k > 0n ? Array(Number(k) + 1).join(T(n) + ' \\cdot ').slice(0, -7) + ' = ' : '') + big(val));
            S.step('What it counts').p('Sequences of length $k$ over an alphabet of $n$ symbols, repeats allowed and order mattering: PIN codes ($10^4$), passwords, or keys of $k$ bits ($2^k$). This is the size of a key space to search by brute force.');
            if (n <= 6n && val <= 36n && k > 0n) listStep(enumerate(Number(n), Number(k), true, true), 'With the symbols ' + LET.slice(0, Number(n)).split('').join(', ') + ':');
        } else if (kind === 'comb') {
            val = binom(n, k);
            label = '\\binom{' + T(n) + '}{' + T(k) + '}';
            if (k > n) s.p('$k > n$: there are not enough objects, so the count is 0.').math(label + ' = 0');
            else {
                s.p('Arrangements count every choice $k!$ times (once per order of the $k$ chosen objects), so divide: $\\binom{n}{k} = \\dfrac{P(n, k)}{k!} = \\dfrac{n!}{k! \\, (n-k)!}$.');
                var kk = n - k < k ? n - k : k;
                s.math(label + ' = \\frac{' + T(n) + '!}{' + T(k) + '! \\cdot ' + T(n - k) + '!} = \\frac{' + prodTex(n, kk) + '}{' + T(kk) + '!} = \\frac{' + big(falling(n, kk)) + '}{' + big(fact(kk)) + '} = ' + big(val));
            }
            S.step('What it counts').p('Unordered choices of $k$ out of $n$ different objects, each at most once: lottery draws (6 of 49), committees, hands of cards, subsets of size $k$.');
            if (k <= n && val <= 36n && n <= 8n) listStep(enumerate(Number(n), Number(k), false, false), 'With the objects called ' + LET.slice(0, Number(n)).split('').join(', ') + ':');
        } else if (kind === 'combrep') {
            if (n === 0n) { val = k === 0n ? 1n : 0n; s.p('With no kinds to choose from, only the empty choice exists.').math('\\left(\\!\\binom{0}{' + T(k) + '}\\!\\right) = ' + T(val)); }
            else {
                val = binom(n + k - 1n, k);
                s.p('Stars and bars: a choice is $k$ stars (the objects) separated by $n - 1$ bars (the borders between kinds). Choose which $k$ of the $n + k - 1$ places are stars:');
                s.math('\\left(\\!\\binom{' + T(n) + '}{' + T(k) + '}\\!\\right) = \\binom{n + k - 1}{k} = \\binom{' + T(n + k - 1n) + '}{' + T(k) + '} = ' + big(val));
                if (n <= 4n && k <= 4n && k > 0n) {
                    var ex = enumerate(Number(n), Number(k), false, true)[0];
                    var sb = '';
                    for (var i = 0; i < Number(n); i++) { sb += Array(ex.split(LET.charAt(i)).length).join('*'); if (i < Number(n) - 1) sb += '|'; }
                    s.p('For example ' + ex + ' is ' + sb + ' (stars for the objects, a bar between kinds).');
                }
            }
            label = '\\left(\\!\\binom{' + T(n) + '}{' + T(k) + '}\\!\\right)';
            S.step('What it counts').p('Unordered choices of $k$ objects from $n$ kinds when a kind may be taken several times: $k$ scoops from $n$ flavours, or the ways to write $k$ as a sum of $n$ numbers $\\ge 0$ in order.');
            if (n <= 6n && val <= 36n && k > 0n) listStep(enumerate(Number(n), Number(k), false, true), 'With the kinds called ' + LET.slice(0, Number(n)).split('').join(', ') + ':');
        } else if (kind === 'multi') {
            var ks = v.ks;
            if (ks.some(function (x) { return x < 0n; })) Calc.fail('Group sizes cannot be negative.', 'ks');
            if (ks.length > 30) Calc.fail('At most 30 groups.', 'ks');
            var tot = ks.reduce(function (a, b) { return a + b; }, 0n);
            if (tot > LIM) Calc.fail('The groups add up to more than ' + LIM + '.', 'ks');
            var den = ks.reduce(function (a, b) { return a * fact(b); }, 1n);
            val = fact(tot) / den;
            label = '\\binom{' + T(tot) + '}{' + ks.map(T).join(',\\,') + '}';
            s.p('Order all $n = ' + ks.map(T).join(' + ') + ' = ' + T(tot) + '$ objects as if they were different ($n!$ ways), then divide by the orders inside each group, which give the same row:');
            s.math(label + ' = \\frac{' + T(tot) + '!}{' + ks.map(function (x) { return T(x) + '!'; }).join(' \\cdot ') + '} = \\frac{' + big(fact(tot)) + '}{' + ks.map(function (x) { return big(fact(x)); }).join(' \\cdot ') + '} = ' + big(val));
            S.step('What it counts').p('The distinct orderings of $n$ objects of which $k_1$ are alike, $k_2$ are alike, and so on: the anagrams of a word with repeated letters, or the ways to split $n$ people into labelled groups of sizes $k_1, k_2, \\dots$. It is also the coefficient of $x_1^{k_1} x_2^{k_2} \\cdots$ in $(x_1 + x_2 + \\cdots)^n$.');
            if (val <= 36n && tot > 0n && ks.length <= 16) {
                var word = ks.map(function (x, i) { return Array(Number(x) + 1).join(LET.charAt(i)); }).join(''), seen = {}, out = [];
                (function go(pre, rest) {
                    if (!rest) { seen[pre] = 1; return; }
                    for (var j = 0; j < rest.length; j++) go(pre + rest.charAt(j), rest.slice(0, j) + rest.slice(j + 1));
                })('', word.length <= 8 ? word : '');
                out = Object.keys(seen).sort();
                if (word.length <= 8) listStep(out, 'The distinct orderings of ' + word + ':');
            }
        } else if (kind === 'circ') {
            if (n === 0n) Calc.fail('Please give at least one object.', 'n');
            val = fact(n - 1n);
            label = '(' + T(n) + ' - 1)!';
            s.p('Of the $n!$ orders in a row, every $n$ rotations give the same seating around a table, so divide by $n$: $\\dfrac{n!}{n} = (n-1)!$. (Equivalently: fix one person and order the others.)');
            s.math('(' + T(n) + ' - 1)! = ' + T(n - 1n) + '! = ' + (n - 1n <= 1n ? '1' : prodTex(n - 1n, n - 1n) + ' = ' + big(val)));
            S.step('What it counts').p('Arrangements in a circle where only the neighbours matter, not the seat: guests around a round table. If turning the circle over also counts as the same (a necklace), divide by 2 more, for $n \\ge 3$.');
        } else {
            if (n > 5000n) Calc.fail('At most 5000, please.', 'n');
            var d0 = 1n, d1 = 0n, rows = [['$0$', '', '$1$'], ['$1$', '', '$0$']];
            for (var m = 2n; m <= n; m++) {
                var dn = (m - 1n) * (d1 + d0);
                if (rows.length < 30) rows.push(['$' + T(m) + '$', '$' + T(m - 1n) + ' \\cdot (' + big(d1) + ' + ' + big(d0) + ')$', '$' + big(dn) + '$']);
                d0 = d1; d1 = dn;
            }
            val = n === 0n ? 1n : n === 1n ? 0n : d1;
            label = '!' + T(n);
            s.p('By inclusion and exclusion over the objects that do stay in place, $!n = n! \\sum_{i=0}^{n} \\frac{(-1)^i}{i!}$. Easier to compute is the recurrence $!n = (n - 1)\\,\\bigl(!(n-1) + !(n-2)\\bigr)$ with $!0 = 1$ and $!1 = 0$:');
            s.table(['$m$', '$(m - 1)\\,(!(m-1) + !(m-2))$', '$!m$'], rows.slice(0, Number(n) + 1), { mono: true, caption: n > 28n ? 'The first rows:' : '' });
            if (n >= 1n) {
                var f = fact(n);
                s.p('So about $1/e \\approx 36.8\\%$ of all orders are derangements: here $' + big(val) + ' / ' + big(f) + ' \\approx ' + (n <= 150n ? (Number(val) / Number(f) * 100).toFixed(4) : '36.7879') + '\\%$.');
            }
            S.step('What it counts').p('Orderings of $n$ objects where no object is in its original place: secret Santa draws where nobody draws their own name, or letters all put into wrong envelopes.');
            if (n <= 4n && n > 0n) {
                var all = enumerate(Number(n), Number(n), true, false).filter(function (w) { return w.split('').every(function (c, i) { return LET.indexOf(c) !== i; }); });
                listStep(all, 'With ' + LET.slice(0, Number(n)).split('').join(', ') + ' in that order at the start, the orders where no letter is in its place:');
            }
        }
        copyTex = label;
        S.result('$' + copyTex + ' = ' + big(val) + '$', { copy: String(val) });
        if (String(val).length > 60) S.note('The number has ' + String(val).length + ' digits; Copy gives all of them.');

        /* the four basic counts side by side */
        if (['arr', 'arrrep', 'comb', 'combrep'].indexOf(kind) >= 0 && n <= 100000n && k <= 2000n) {
            var cell = function (id, tex, x) { return { v: '$' + tex + ' = ' + big(x) + '$', hl: id === kind }; };
            var nr = n === 0n ? (k === 0n ? 1n : 0n) : binom(n + k - 1n, k);
            S.step('Which formula? Order and repetition').p('Choosing $k = ' + T(k) + '$ from $n = ' + T(n) + '$: does the order matter, and may an object be chosen again? The four answers:')
                .table(['', 'No repetition', 'Repetition allowed'], [
                    ['Order matters', cell('arr', 'P(' + T(n) + ', ' + T(k) + ')', k > n ? 0n : falling(n, k)), cell('arrrep', T(n) + '^{' + T(k) + '}', n ** k)],
                    ['Order does not matter', cell('comb', '\\binom{' + T(n) + '}{' + T(k) + '}', binom(n, k)), cell('combrep', '\\binom{' + T(n + k - 1n) + '}{' + T(k) + '}', nr)]
                ]);
        }
    }
});
