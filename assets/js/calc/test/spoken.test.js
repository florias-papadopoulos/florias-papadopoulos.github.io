/* Calc.spoken (core.js): the words screen readers get for fields, step titles and table headers with maths in them. */
(function () {
    var cases = [
        ['Prime $p$', 'Prime p'], ['Coefficients $a_1, \\ldots, a_{t-1}$', 'Coefficients a₁, …, a sub (t-1)'],
        ['public key $y \\equiv g^x \\pmod p$', 'public key y ≡ g to the x (mod p)'],
        ['$d \\equiv e^{-1} \\bmod \\lambda(n)$', 'd ≡ e⁻¹ mod λ(n)'], ['$\\gcd(a, n) = 1$', 'gcd(a, n) = 1'],
        ['$\\frac{a}{b}$', 'a/b'], ['in $\\mathbb{Z}_p^*$', 'in ℤ sub p *'], ['$\\text{key}$', 'key']
    ];
    cases.forEach(function (c, i) {
        T.prop('spoken ' + (i + 1) + ': ' + c[0], 1, function () {
            var got = Calc.spoken(c[0]);
            return got === c[1] ? true : 'got "' + got + '", wanted "' + c[1] + '"';
        });
    });
    /* no field label of any tool keeps a backslash or a brace in its spoken name */
    T.prop('spoken labels have no TeX left', 1, function () {
        var bad = [];
        Object.keys(Calc.tools || {}).forEach(function (id) {
            (Calc.tools[id].inputs || []).forEach(function (f) {
                if (f.label && /[\\{}$]/.test(Calc.spoken(f.label))) bad.push(id + ': ' + Calc.spoken(f.label));
            });
        });
        return bad.length ? bad.slice(0, 5).join('; ') : true;
    });
}());
