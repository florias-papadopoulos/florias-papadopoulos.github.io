/* Toolbox: elliptic curve Diffie-Hellman: both public keys by double and add, the shared point computed on both
   sides, and its x-coordinate as the shared secret. */
Calc.tool({
    id: 'ecdh',
    inputs: [
        { id: 'a', label: 'Coefficient $a$', placeholder: '2' },
        { id: 'b', label: 'Coefficient $b$', placeholder: '2' },
        { id: 'p', label: 'Prime $p$', placeholder: '17', width: 'l' },
        { id: 'G', type: 'text', label: 'Base point $G$', placeholder: '(5, 1)', width: 'l' },
        { id: 'n', type: 'text', label: 'Order $n$ of $G$', placeholder: '19', optional: true, width: 'l', help: 'Empty: computed (for $p$ up to $10^6$).' },
        { id: 'da', type: 'text', label: 'Alice\'s secret $d_A$', placeholder: '3', optional: true, width: 'l', help: 'Empty: drawn at random.' },
        { id: 'db', type: 'text', label: 'Bob\'s secret $d_B$', placeholder: '7', optional: true, width: 'l', help: 'Empty: drawn at random.' }
    ],
    examples: [
        { a: '2', b: '2', p: '17', G: '(5, 1)', n: '', da: '3', db: '7' },
        { a: '1', b: '6', p: '1009', G: '(2, 4)', n: '', da: '', db: '' },
        { a: '0', b: '7', p: '2^256 - 2^32 - 977', G: '(0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798, 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)', n: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141', da: '', db: '' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, ec = M.ec, T = Calc.lib.modern.tex, E = { a: v.a, b: v.b, p: v.p };
        ec.curveStep(S.step('The curve $y^2 = x^3 + ax + b$ over $\\mathbb{F}_{' + T(v.p) + '}$'), E);
        var p = E.p, G = ec.parse(v.G, 'G', 'G');
        if (G === null) Calc.fail('The base point cannot be the point at infinity.', 'G');
        var sg = S.step('The base point $G$');
        ec.onStep(sg, E, G, 'G', 'G');
        var n = M.optInt(v.n, 'n');
        if (n !== null) {
            if (n < 2n) Calc.fail('The order of G is at least 2.', 'n');
            var nG = ec.mul(E, n, G).R;
            sg.check(nG === null, '$n \\cdot G = ' + ec.tex(nG) + '$ for $n = ' + T(n) + '$');
            if (nG !== null) Calc.fail('n * G is not the point at infinity, so n is not a multiple of the order of G.', 'n');
            if (nt.isPrime(n)) sg.p('$n$ is prime, so it is exactly the order of $G$.');
        } else if (p <= 1000000n) {
            var N = ec.count(E), fac = nt.factor(N);
            n = ec.order(E, G, N, fac);
            sg.p('The curve has $\\#E = ' + T(N) + '$ points (counted over every $x$), and the order of $G$ divides it: $G$ has order $n = ' + T(n) + '$' + (n === N ? ', so it generates the whole group.' : '.'));
        } else Calc.fail('Please give the order n of G: for large p the number of points is not counted here.', 'n');
        if (n < 3n) Calc.fail('G has order ' + n + ': there is no room for secrets. Choose another base point.', 'G');
        if (!nt.isPrime(n)) sg.p('Warning: $n$ is not prime. Standard curves use a base point of large prime order, so that discrete logarithms cannot be split into small pieces (Pohlig-Hellman).');

        var da = M.optInt(v.da, 'da'), db = M.optInt(v.db, 'db'), drawn = [];
        if (da === null) { da = M.rand(1n, n - 1n); drawn.push('d_A = ' + T(da)); }
        if (db === null) { db = M.rand(1n, n - 1n); drawn.push('d_B = ' + T(db)); }
        if (da < 1n || da >= n) Calc.fail('Take a secret from 1 to n - 1.', 'da');
        if (db < 1n || db >= n) Calc.fail('Take a secret from 1 to n - 1.', 'db');
        if (drawn.length) S.step('Draw the secret' + (drawn.length > 1 ? 's' : '')).p('Drawn uniformly from $1 \\le d \\le n - 1$ with the browser\'s random generator: $' + drawn.join('$, $') + '$.');

        var QA = ec.mulStep(S.step('Alice\'s public key $Q_A = d_A \\cdot G$'), E, da, G, 'd_A', 'G');
        var QB = ec.mulStep(S.step('Bob\'s public key $Q_B = d_B \\cdot G$'), E, db, G, 'd_B', 'G');
        S.step('They exchange $Q_A$ and $Q_B$ in the open').p('$Q_A = ' + ec.tex(QA) + '$ and $Q_B = ' + ec.tex(QB) + '$. Each side should check that the point it receives is on the curve (invalid curve attacks).');
        var SA = ec.mulStep(S.step('Alice computes $d_A \\cdot Q_B$'), E, da, QB, 'd_A', 'Q_B');
        var SB = ec.mulStep(S.step('Bob computes $d_B \\cdot Q_A$'), E, db, QA, 'd_B', 'Q_A');
        var ok = ec.eq(SA, SB);
        S.step('Check').check(ok, 'Both get the same point, because $d_A (d_B G) = (d_A d_B) G = d_B (d_A G)$: $' + ec.tex(SA) + '$');
        if (SA === null) { S.result(['The shared point is $\\mathcal{O}$'], { copy: 'O', label: 'Shared secret' }); return; }
        S.result(['$x = ' + T(SA.x) + '$', 'Shared point $' + ec.tex(SA) + '$'], { copy: String(SA.x), label: 'Shared secret' });
        S.note('As in the standards, the shared secret is the $x$-coordinate of the shared point; it then goes through a key derivation function. Finding it from $Q_A$ and $Q_B$ alone is the elliptic curve Diffie-Hellman problem.');
    }
});
