/* Toolbox: Diffie-Hellman key exchange in Z_p^*: the parameters checked (prime, order of g, safe prime), both
   public values and the shared key computed on both sides. */
Calc.tool({
    id: 'diffie-hellman',
    inputs: [
        { id: 'p', label: 'Prime $p$', placeholder: '23' },
        { id: 'g', label: 'Base $g$', placeholder: '5' },
        { id: 'a', type: 'text', label: 'Alice\'s secret $a$', placeholder: '6', optional: true, help: 'Empty: drawn at random.' },
        { id: 'b', type: 'text', label: 'Bob\'s secret $b$', placeholder: '15', optional: true, help: 'Empty: drawn at random.' }
    ],
    examples: [
        { p: '23', g: '5', a: '6', b: '15' },
        { p: '2^127 - 1', g: '3', a: '', b: '' },
        { p: '1019', g: '4', a: '123', b: '456' },
        { p: '41', g: '10', a: '7', b: '11' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, T = Calc.lib.modern.tex, p = v.p;
        M.needPrime(p, 'p', 'p');
        if (p < 5n) Calc.fail('Take a prime p of at least 5.', 'p');
        if (nt.bitLength(p) > 4096) Calc.fail('p has more than 4096 bits; this walkthrough stops there.', 'p');
        var g = nt.mod(v.g, p);
        if (g <= 1n || g === p - 1n) Calc.fail('g = ' + g + ' (mod p) generates only {1' + (g === p - 1n ? ', p - 1' : '') + '}: take 1 < g < p - 1.', 'g');
        var a = M.optInt(v.a, 'a'), b = M.optInt(v.b, 'b'), drawn = [];
        if (a === null) { a = M.rand(2n, p - 2n); drawn.push('a'); }
        if (b === null) { b = M.rand(2n, p - 2n); drawn.push('b'); }
        if (a < 1n || a > p - 2n) Calc.fail('Take a secret from 1 to p - 2.', 'a');
        if (b < 1n || b > p - 2n) Calc.fail('Take a secret from 1 to p - 2.', 'b');

        var s0 = S.step('Public parameters: the prime $p = ' + T(p) + '$ and the base $g = ' + T(g) + '$');
        s0.check(true, '$p$ is prime');
        var gi = M.groupStep(s0, g, p, 'g'), warn = [];
        if (gi.safe) s0.check(true, '$p$ is a safe prime: $(p - 1)/2 = ' + T(gi.q) + '$ is prime too');
        else s0.check(false, '$p$ is not a safe prime: $(p - 1)/2 = ' + T(gi.q) + '$ is not prime');
        if (gi.order !== null) {
            var big = gi.fac.factors[gi.fac.factors.length - 1].p, lo = gi.fac.factors.filter(function (f) { return gi.order % f.p === 0n; }).map(function (f) { return f.p; }).pop();
            if (gi.order !== p - 1n) warn.push('$g$ is not a generator: the keys live in a subgroup of order $' + T(gi.order) + '$' + (gi.order < 1000n ? ', so the shared key takes at most ' + gi.order + ' values and can simply be guessed.' : '.'));
            if (lo < big || !gi.safe) warn.push('Discrete logarithms are only as hard as the largest prime factor of the order of $g$ (Pohlig-Hellman): here $' + T(lo) + '$. Use a safe prime, or a subgroup of large prime order.');
            if (gi.safe && gi.order === gi.q) s0.p('$g$ has prime order $q = (p - 1)/2$: it generates the subgroup of squares, the recommended choice.');
            if (gi.safe && gi.order === p - 1n) s0.p('Note: a generator of all of $\\mathbb{Z}_p^*$ leaks one bit of the secret (whether it is even, through the Legendre symbol); $g^2$ would generate the subgroup of prime order $(p - 1)/2$.');
        }
        warn.forEach(function (w) { s0.p('Warning: ' + w); });
        if (drawn.length) S.step('Draw the secret' + (drawn.length > 1 ? 's' : '')).p('Drawn uniformly from $1 \\le x \\le p - 2$ with the browser\'s random generator: ' + drawn.map(function (x) { return '$' + x + ' = ' + T(x === 'a' ? a : b) + '$'; }).join(', ') + '.');

        var A = M.powStep(S.step('Alice computes her public value $A \\equiv g^a \\pmod p$'), g, a, p, { name: 'A \\equiv ' + T(g) + '^{' + T(a) + '}' });
        var B = M.powStep(S.step('Bob computes his public value $B \\equiv g^b \\pmod p$'), g, b, p, { name: 'B \\equiv ' + T(g) + '^{' + T(b) + '}', explain: false });
        S.step('They exchange $A$ and $B$ in the open').p('An eavesdropper sees $p = ' + T(p) + '$, $g = ' + T(g) + '$, $A = ' + T(A) + '$ and $B = ' + T(B) + '$, but not $a$ or $b$.');
        var KA = M.powStep(S.step('Alice computes $K \\equiv B^a \\pmod p$'), B, a, p, { name: 'K \\equiv ' + T(B) + '^{' + T(a) + '}', explain: false });
        var KB = M.powStep(S.step('Bob computes $K \\equiv A^b \\pmod p$'), A, b, p, { name: 'K \\equiv ' + T(A) + '^{' + T(b) + '}', explain: false });
        S.step('Check').check(KA === KB, 'Both get the same key, because $B^a \\equiv (g^b)^a = g^{ab} = (g^a)^b \\equiv A^b$: $K = ' + T(KA) + '$');
        S.result(['$K = ' + T(KA) + '$'], { copy: String(KA), label: 'Shared key' });
        S.note('Public values $A = ' + T(A) + '$ and $B = ' + T(B) + '$. Finding $K$ from them is the computational Diffie-Hellman problem; it is easy for small $p$. Plain Diffie-Hellman is also open to a man in the middle unless $A$ and $B$ are authenticated.');
    }
});
