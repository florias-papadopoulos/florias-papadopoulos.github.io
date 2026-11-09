/* Toolbox: arithmetic on y^2 = x^3 + ax + b over F_p: the curve and the points checked, P + Q and 2P with the slope
   formulas and the inverses written out, k * P by double and add, and every case of the point at infinity. */
Calc.tool({
    id: 'elliptic-curve',
    live: true,
    inputs: [
        { id: 'a', label: 'Coefficient $a$', placeholder: '2' },
        { id: 'b', label: 'Coefficient $b$', placeholder: '2' },
        { id: 'p', label: 'Prime $p$', placeholder: '17', width: 'l' },
        { id: 'P', type: 'text', label: 'Point $P$', placeholder: '(5, 1)', width: 'l', help: 'Two numbers $x, y$, or O for the point at infinity.' },
        { id: 'Q', type: 'text', label: 'Point $Q$ (to add)', placeholder: '(6, 3)', optional: true, width: 'l' },
        { id: 'k', type: 'text', label: 'Scalar $k$ (to multiply)', placeholder: '9', optional: true }
    ],
    actions: [{ id: 'add', label: 'Add P + Q' }, { id: 'dbl', label: 'Double 2P' }, { id: 'mul', label: 'Multiply k P' }],
    examples: [
        { a: '2', b: '2', p: '17', P: '(5, 1)', Q: '(6, 3)', k: '9' },
        { a: '2', b: '2', p: '17', P: '(5, 1)', Q: '', k: '', _action: 'dbl' },
        { a: '2', b: '2', p: '17', P: '(5, 1)', Q: '', k: '9', _action: 'mul' },
        { a: '2', b: '2', p: '17', P: '(5, 1)', Q: '(5, 16)', k: '', _action: 'add' },
        { a: '0', b: '7', p: '2^256 - 2^32 - 977', P: '(0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798, 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)', Q: '', k: '2', _action: 'dbl' }
    ],
    run: function (v, S) {
        var nt = Calc.lib.nt, M = Calc.lib.modern, ec = M.ec, T = Calc.lib.modern.tex, E = { a: v.a, b: v.b, p: v.p };
        var m0 = v.p > 0n ? v.p : 1n;
        ec.curveStep(S.step('The curve $' + ec.eqTex({ a: nt.mod(v.a, m0), b: nt.mod(v.b, m0) }) + '$ over $\\mathbb{F}_{' + T(v.p) + '}$'), E);
        var p = E.p, P = ec.parse(v.P, 'P', 'P'), Q = null;
        if (v._action === 'add') {
            if (!String(v.Q || '').trim()) Calc.fail('Please enter the point Q to add.', 'Q');
            Q = ec.parse(v.Q, 'Q', 'Q');
        }
        if (v._action === 'dbl') Q = P;
        var sp = S.step('Check that the point' + (v._action === 'add' ? 's lie' : ' lies') + ' on the curve');
        ec.onStep(sp, E, P, 'P', 'P');
        if (v._action === 'add') ec.onStep(sp, E, Q, 'Q', 'Q');
        if (v._action === 'dbl') Q = P;

        if (v._action === 'mul') {
            var k = M.optInt(v.k, 'k');
            if (k === null) Calc.fail('Please enter the scalar k.', 'k');
            if (nt.bitLength(k) > 1024) Calc.fail('k has more than 1024 bits; take a smaller scalar.', 'k');
            var R = ec.mulStep(S.step('Double and add: $' + T(k) + ' \\cdot P$'), E, k, P, 'k', 'P');
            S.result(['$' + T(k) + ' \\cdot P = ' + ec.tex(R) + '$'], { copy: ec.plain(R) });
            S.step('Check').check(ec.on(E, R), 'The result ' + (R === null ? 'is the point at infinity' : 'lies on the curve'));
            if (p <= 1000000n && P !== null) {
                var N = ec.count(E), fac = nt.factor(N), n = ec.order(E, P, N, fac);
                S.note('The curve has $' + T(N) + '$ points and $P$ has order $' + T(n) + '$, so $k \\cdot P = (k \\bmod ' + T(n) + ') \\cdot P = ' + T(nt.mod(k, n)) + ' \\cdot P$.');
            }
            return;
        }

        var r = ec.add(E, P, Q), name = v._action === 'dbl' ? '2P' : 'P + Q';
        var sc = S.step('Which case applies');
        if (r.kind === 'O-left' || r.kind === 'O-right') {
            sc.p('The point at infinity $\\mathcal{O}$ is the neutral element: $\\mathcal{O} + R = R + \\mathcal{O} = R$ for every point $R$.');
        } else if (r.kind === 'opposite') {
            sc.p(v._action === 'dbl'
                ? '$y = 0$, so the tangent at $P$ is vertical: it meets the curve "at infinity", and $2P = \\mathcal{O}$ ($P$ has order 2).'
                : 'Same $x$ and opposite $y$ ($' + T(P.y) + ' + ' + T(Q.y) + ' \\equiv 0 \\pmod{' + T(p) + '}$): the line through them is vertical, so $Q = -P$ and $P + Q = \\mathcal{O}$.');
        } else {
            var x1 = P.x, y1 = P.y, x2 = Q.x;
            if (r.kind === 'double') {
                sc.p((v._action === 'add' ? '$P = Q$, so this is a doubling. ' : '') + 'The line is the tangent at $P$, with slope (by implicit differentiation of $y^2 = x^3 + ax + b$):');
                sc.math('\\lambda = \\frac{3x_1^2 + a}{2y_1} = \\frac{3 \\cdot ' + T(x1) + '^2 + ' + T(E.a) + '}{2 \\cdot ' + T(y1) + '} \\equiv \\frac{' + T(r.num) + '}{' + T(r.den) + '} \\pmod{' + T(p) + '}');
            } else {
                sc.p('Two different points with different $x$: the line through them has slope');
                sc.math('\\lambda = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{' + T(Q.y) + ' - ' + T(y1) + '}{' + T(x2) + ' - ' + T(x1) + '} \\equiv \\frac{' + T(r.num) + '}{' + T(r.den) + '} \\pmod{' + T(p) + '}');
            }
            sc.p('Division modulo $p$ is multiplication by an inverse.');
            if (r.den !== 1n) M.invStep(S.step('Invert the denominator $' + T(r.den) + '$ modulo $' + T(p) + '$'), r.den, p);
            S.step('The slope').math('\\lambda \\equiv ' + T(r.num) + ' \\cdot ' + T(r.inv) + ' = ' + T(r.num * r.inv) + ' \\equiv ' + T(r.lam) + ' \\pmod{' + T(p) + '}');
            var lam = r.lam, x3 = r.R.x;
            S.step('The new point').p('The line meets the curve in a third point; its mirror image in the $x$-axis is the sum:').lines([
                'x_3 &= \\lambda^2 - x_1 - x_2 = ' + T(lam) + '^2 - ' + T(x1) + ' - ' + T(x2) + ' = ' + T(lam * lam - x1 - x2) + ' \\equiv ' + T(x3),
                'y_3 &= \\lambda (x_1 - x_3) - y_1 = ' + T(lam) + ' \\cdot ' + M.par(x1 - x3) + ' - ' + T(y1) + ' = ' + T(lam * (x1 - x3) - y1) + ' \\equiv ' + T(r.R.y)
            ]);
        }
        S.result(['$' + name + ' = ' + ec.tex(r.R) + '$'], { copy: ec.plain(r.R) });
        S.step('Check').check(ec.on(E, r.R), r.R === null ? 'The result is the point at infinity, the neutral element' : 'The result $' + ec.tex(r.R) + '$ lies on the curve');
    }
});
