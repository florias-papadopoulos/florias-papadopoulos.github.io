/* Toolbox: bitwise AND, OR, XOR, NOT, NAND, NOR and shifts on whole numbers of any size, bits aligned in a grid. */
Calc.tool({
    id: 'bitwise',
    live: true,
    inputs: [
        { id: 'a', type: 'text', label: 'Number $a$', placeholder: '12', help: 'Decimal, 0x hex or 0b binary; negative numbers are taken in two\'s complement.' },
        { id: 'op', type: 'select', label: 'Operation', value: 'and', options: [['and', 'a AND b'], ['or', 'a OR b'], ['xor', 'a XOR b'], ['not', 'NOT a'], ['nand', 'a NAND b'], ['nor', 'a NOR b'], ['shl', 'a << k (shift left)'], ['shr', 'a >> k (arithmetic shift right)'], ['ushr', 'a >>> k (logical shift right)']] },
        { id: 'b', type: 'text', label: 'Number $b$', placeholder: '10', when: { op: ['and', 'or', 'xor', 'nand', 'nor'] } },
        { id: 'k', type: 'text', label: 'Shift by $k$ bits', placeholder: '2', when: { op: ['shl', 'shr', 'ushr'] } },
        { id: 'width', type: 'text', label: 'Width in bits', optional: true, placeholder: 'as needed', help: 'Empty: as many bits as needed (a multiple of 8 for NOT and negative numbers).' }
    ],
    examples: [{ a: '12', op: 'and', b: '10', width: '' }, { a: '0b1010', op: 'xor', b: '0b0110', width: '' }, { a: '0x5A', op: 'not', width: '8' }, { a: '-20', op: 'shr', k: '2', width: '8' }, { a: '2^100 + 5', op: 'or', b: '2^64', width: '' }, { a: '200', op: 'shl', k: '3', width: '8' }],
    run: function (v, S) {
        var nt = Calc.lib.nt, E = Calc.lib.enc, T = Calc.tex, op = v.op;
        var binary = ['and', 'or', 'xor', 'nand', 'nor'].indexOf(op) >= 0, shift = ['shl', 'shr', 'ushr'].indexOf(op) >= 0;
        function num(s, f) { try { return Calc.int(s); } catch (e) { if (e instanceof Calc.UserError) Calc.fail(e.message, f); throw e; } }
        var a = num(v.a, 'a'), b = binary ? num(v.b, 'b') : null, k = 0;
        if (shift) {
            var kk = num(v.k, 'k');
            if (kk < 0n) Calc.fail('The shift must not be negative.', 'k');
            if (kk > 4096n) Calc.fail('At most 4096 bits of shift.', 'k');
            k = Number(kk);
        }
        var ops = binary ? [a, b] : [a], neg = ops.some(function (x) { return x < 0n; });
        function need(x) { return x < 0n ? nt.bitLength(-x - 1n) + 1 : nt.bitLength(x) + (neg ? 1 : 0); }
        var W, auto = !String(v.width).trim();
        if (!auto) {
            var w = num(v.width, 'width');
            if (w < 1n || w > 4096n) Calc.fail('The width must be between 1 and 4096 bits.', 'width');
            W = Number(w);
            ops.forEach(function (x, i) {
                if (x >= (1n << BigInt(W)) || x < -(1n << BigInt(W - 1))) Calc.fail((i ? 'b' : 'a') + ' = ' + x + ' does not fit in ' + W + ' bits (from ' + (-(1n << BigInt(W - 1))) + ' to ' + ((1n << BigInt(W)) - 1n) + ').', i ? 'b' : 'a');
            });
        } else {
            W = Math.max.apply(null, ops.map(need).concat([1]));
            if (op === 'shl') W += k;
            if (neg || op === 'not' || op === 'nand' || op === 'nor' || op === 'ushr') W = Math.max(8, Math.ceil(W / 8) * 8);
            if (W > 4096) Calc.fail('The numbers are too large (over 4096 bits).', 'a');
        }
        var BW = BigInt(W), M = (1n << BW) - 1n, TOP = 1n << (BW - 1n);
        function u(x) { return x < 0n ? x + (1n << BW) : x; }
        function sg(x) { return x >= TOP ? x - (1n << BW) : x; }
        var ua = u(a), ub = binary ? u(b) : null, r;
        switch (op) {
            case 'and': r = ua & ub; break;
            case 'or': r = ua | ub; break;
            case 'xor': r = ua ^ ub; break;
            case 'nand': r = M ^ (ua & ub); break;
            case 'nor': r = M ^ (ua | ub); break;
            case 'not': r = M ^ ua; break;
            case 'shl': r = (ua << BigInt(k)) & M; break;
            case 'ushr': r = ua >> BigInt(k); break;
            case 'shr': r = u((neg || !auto ? sg(ua) : ua) >> BigInt(k)); break;
        }
        var signed = neg, val = signed ? sg(r) : r;
        var SYM = { and: '\\mathbin{\\&}', or: '\\mid', xor: '\\oplus', nand: '\\uparrow', nor: '\\downarrow' };
        var expr = binary ? T(a) + ' ' + SYM[op] + ' ' + (b < 0n ? '(' + T(b) + ')' : T(b)) : op === 'not' ? '\\lnot\\, ' + T(a) : T(a) + (op === 'shl' ? ' \\ll ' : op === 'shr' ? ' \\gg ' : ' \\ggg ') + k;
        var lines = ['$' + expr + ' = ' + T(val) + '$', '$\\text{hex } \\mathtt{' + r.toString(16).toUpperCase() + '}$, binary $\\mathtt{' + E.group(E.bin(r, W), 4, true).replace(/ /g, '\\ ') + '}$'];
        if (!signed && r >= TOP && !auto) lines.push('$= ' + T(sg(r)) + '$ read as a signed ' + W + '-bit number');
        S.result(lines, { copy: String(val), label: 'Result' });

        var s0 = S.step('Write the numbers in binary with ' + W + ' bits');
        s0.p(auto ? (neg || op === 'not' || op === 'nand' || op === 'nor' || op === 'ushr' ? 'No width was given; ' + W + ' bits (a multiple of 8) are enough for these numbers.' : 'No width was given, so the numbers keep all their bits (' + W + ' are enough' + (op === 'shl' ? ', including the ' + k + ' shifted in' : '') + ').') : 'The width is ' + W + ' bits: everything is computed modulo $2^{' + W + '}$.');
        if (neg) s0.p('A negative number $x$ is stored in two\'s complement, as $2^{' + W + '} + x$: ' + ops.filter(function (x) { return x < 0n; }).map(function (x) { return '$' + T(x) + ' \\to ' + T(u(x)) + '$'; }).join(', ') + '.');
        var grid = [['$a$', ua]];
        if (binary) grid.push(['$b$', ub]);
        grid.push([{ v: binary || op === 'not' ? 'Result' : 'Shifted', hl: true }, r]);
        if (W <= 32) {
            var head = [''];
            for (var i = W - 1; i >= 0; i--) head.push(String(i));
            s0.table(head, grid.map(function (g, gi) {
                var bits = E.bin(g[1], W).split('');
                return [g[0]].concat(gi === grid.length - 1 ? bits.map(function (c) { return { v: c, hl: c === '1' }; }) : bits);
            }), { mono: true, hl: grid.length - 1, caption: 'Bit positions, from bit ' + (W - 1) + ' (left) down to bit 0:' });
        } else {
            s0.table(['', 'Binary (groups of 4 bits)', 'Hex'], grid.map(function (g) { return [g[0], E.group(E.bin(g[1], W), 4, true), g[1].toString(16).toUpperCase()]; }), { mono: true, hl: grid.length - 1 });
        }

        var s1 = S.step(binary || op === 'not' ? 'Apply the rule to every column' : 'Move the bits');
        if (binary) {
            var f = { and: function (x, y) { return x & y; }, or: function (x, y) { return x | y; }, xor: function (x, y) { return x ^ y; }, nand: function (x, y) { return 1 - (x & y); }, nor: function (x, y) { return 1 - (x | y); } }[op];
            var say = { and: 'AND is 1 only when both bits are 1', or: 'OR is 1 when at least one bit is 1', xor: 'XOR is 1 when the bits differ', nand: 'NAND is NOT AND: 0 only when both bits are 1', nor: 'NOR is NOT OR: 1 only when both bits are 0' }[op];
            s1.p(say + '. Each column is computed on its own, with no carries:');
            s1.table(['$a_i$', '$b_i$', 'Result'], [[0, 0], [0, 1], [1, 0], [1, 1]].map(function (p) { return [p[0], p[1], { v: f(p[0], p[1]), hl: true }]; }), { mono: true });
            var ones = r.toString(2).split('').filter(function (c) { return c === '1'; }).length;
            s1.p('The result has ' + ones + ' bit' + (ones === 1 ? '' : 's') + ' set.');
        } else if (op === 'not') {
            s1.p('NOT flips every bit: 0 becomes 1 and 1 becomes 0. Within ' + W + ' bits that is $(2^{' + W + '} - 1) - a$:');
            s1.math(T(M) + ' - ' + T(ua) + ' = ' + T(r));
            s1.p('Read as a signed number, NOT $a$ is always $-a - 1$: here $' + T(sg(r)) + '$.');
        } else if (op === 'shl') {
            s1.p('Every bit moves ' + k + ' place' + (k === 1 ? '' : 's') + ' to the left and zeros come in on the right. That multiplies by $2^{' + k + '}$' + (auto ? ':' : ', and bits that leave the ' + W + ' bits are lost (modulo $2^{' + W + '}$):'));
            s1.math(T(ua) + ' \\cdot 2^{' + k + '} = ' + T(ua << BigInt(k)) + (auto ? '' : ' \\equiv ' + T(r) + ' \\pmod{2^{' + W + '}}'));
        } else {
            var arith = op === 'shr' && (neg || !auto) && ua >= TOP;
            s1.p('Every bit moves ' + k + ' place' + (k === 1 ? '' : 's') + ' to the right and the last ' + k + ' bit' + (k === 1 ? ' falls' : 's fall') + ' off. ' + (op === 'ushr' ? 'A logical shift brings in zeros on the left, so it divides the unsigned value by $2^{' + k + '}$ (rounding down).' : arith ? 'An arithmetic shift copies the sign bit (here 1) into the new places, so the number stays negative: it divides by $2^{' + k + '}$ rounding down.' : 'The number is not negative, so zeros come in on the left: it divides by $2^{' + k + '}$, rounding down.'));
            var x = op === 'ushr' ? ua : arith ? sg(ua) : ua;
            s1.math('\\left\\lfloor \\frac{' + T(x) + '}{2^{' + k + '}} \\right\\rfloor = ' + T(op === 'ushr' ? r : arith ? sg(r) : r));
        }
        if (signed || (!auto && r >= TOP)) {
            S.step('Read the result').p('Unsigned, the bits are $' + T(r) + '$; as a signed ' + W + '-bit number (top bit worth $-2^{' + (W - 1) + '}$) they are $' + T(sg(r)) + '$.');
        }
    }
});
