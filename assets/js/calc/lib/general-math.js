/* Toolbox: exact fractions on BigInt, matrices over Q and over Z_n, and row reduction that records every row
   operation (Calc.lib.gmath). Pure functions, no page code. Used by the General maths tools (matrix, linear-system,
   fractions, polynomial-division). Loaded before nt.js, so nothing here relies on Calc.lib.nt. */
(function (G) {
    'use strict';
    var Calc = G.Calc;
    var gm = Calc.lib.gmath = {};

    function abs(a) { return a < 0n ? -a : a; }
    function gcd(a, b) { a = abs(a); b = abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
    function mod(a, n) { var r = a % n; return r < 0n ? r + n : r; }
    /* inverse of a modulo n > 1, or null when gcd(a, n) != 1 */
    function invMod(a, n) {
        var r0 = n, r1 = mod(a, n), t0 = 0n, t1 = 1n;
        while (r1 !== 0n) { var q = r0 / r1, r2 = r0 - q * r1, t2 = t0 - q * t1; r0 = r1; r1 = r2; t0 = t1; t1 = t2; }
        return r0 === 1n ? mod(t0, n) : null;
    }
    gm.abs = abs;
    gm.gcd = gcd;
    gm.lcm = function (a, b) { if (!a || !b) return 0n; return abs(a / gcd(a, b) * b); };
    gm.mod = mod;
    gm.invMod = invMod;

    /* ---------- fractions: {n, d} in lowest terms with d > 0 ---------- */
    function Q(n, d) {
        n = BigInt(n);
        d = d === undefined ? 1n : BigInt(d);
        if (d === 0n) Calc.fail('Division by zero.');
        if (d < 0n) { n = -n; d = -d; }
        var g = gcd(n, d);
        if (g > 1n) { n /= g; d /= g; }
        return { n: n, d: d };
    }
    gm.Q = Q;
    gm.add = function (a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); };
    gm.sub = function (a, b) { return Q(a.n * b.d - b.n * a.d, a.d * b.d); };
    gm.mul = function (a, b) { return Q(a.n * b.n, a.d * b.d); };
    gm.div = function (a, b) { if (b.n === 0n) Calc.fail('Division by zero.'); return Q(a.n * b.d, a.d * b.n); };
    gm.neg = function (a) { return { n: -a.n, d: a.d }; };
    gm.isZero = function (a) { return a.n === 0n; };
    gm.isInt = function (a) { return a.d === 1n; };
    gm.eq = function (a, b) { return a.n === b.n && a.d === b.d; };
    gm.cmp = function (a, b) { var x = a.n * b.d, y = b.n * a.d; return x < y ? -1 : x > y ? 1 : 0; };
    /* a^e for a whole e (negative e: the reciprocal) */
    gm.pow = function (a, e) {
        if (e < 0n) { if (a.n === 0n) Calc.fail('0 has no negative powers.'); a = Q(a.d, a.n); e = -e; }
        return Q(a.n ** e, a.d ** e);
    };
    /* plain text: 3/4, -2 */
    gm.qstr = function (a) { return a.d === 1n ? String(a.n) : a.n + '/' + a.d; };
    /* TeX: \frac{3}{4}, -\frac{3}{4}, 7 */
    gm.qtex = function (a) {
        if (a.d === 1n) return Calc.tex(a.n);
        return (a.n < 0n ? '-' : '') + '\\frac{' + Calc.tex(abs(a.n)) + '}{' + Calc.tex(a.d) + '}';
    };
    /* TeX in brackets when negative (as a factor or after an operator) */
    gm.qtexp = function (a) { return a.n < 0n ? '\\left(' + gm.qtex(a) + '\\right)' : gm.qtex(a); };
    /* a decimal string like 12.375 as a fraction */
    function decQ(s) {
        var m = /^(\d*)(?:\.(\d*))?$/.exec(s);
        if (!m || (!m[1] && !m[2])) return null;
        var f = m[2] || '';
        return Q(BigInt((m[1] || '0') + f), 10n ** BigInt(f.length));
    }
    /* "3/4", "-2", "+0.5", "1.5/2": a fraction, or null when s is not a number */
    gm.parseQ = function (s) {
        s = String(s).trim().replace(/[\u2212\u2013\u2014]/g, '-');
        var m = /^([+-]?)([\d.]+)(?:\/([\d.]+))?$/.exec(s);
        if (!m) return null;
        var a = decQ(m[2]), b = m[3] != null ? decQ(m[3]) : Q(1n);
        if (!a || !b) return null;
        if (b.n === 0n) Calc.fail('"' + s + '": division by zero.');
        var q = gm.div(a, b);
        return m[1] === '-' ? gm.neg(q) : q;
    };

    /* ---------- rings: Q, or Z_n (elements 0..n-1). Same interface, so one elimination serves both ---------- */
    gm.ringQ = function () {
        return {
            q: true, field: true, name: '\\mathbb{Q}', zero: Q(0n), one: Q(1n),
            add: gm.add, sub: gm.sub, mul: gm.mul, neg: gm.neg, div: gm.div,
            isZero: gm.isZero, eq: gm.eq,
            isOne: function (a) { return a.n === 1n && a.d === 1n; },
            unit: function (a) { return a.n !== 0n; },
            inv: function (a) { return Q(a.d, a.n); },
            isNeg: function (a) { return a.n < 0n; },
            from: function (q) { return q; },
            tex: gm.qtex, texp: gm.qtexp, str: gm.qstr
        };
    };
    gm.ringMod = function (n, isPrime) {
        n = BigInt(n);
        var R = {
            q: false, n: n, field: !!isPrime, name: '\\mathbb{Z}_{' + Calc.tex(n) + '}', zero: 0n, one: 1n % n,
            add: function (a, b) { return mod(a + b, n); },
            sub: function (a, b) { return mod(a - b, n); },
            mul: function (a, b) { return mod(a * b, n); },
            neg: function (a) { return mod(-a, n); },
            div: function (a, b) { var i = invMod(b, n); if (i === null) Calc.fail(b + ' has no inverse modulo ' + n + '.'); return mod(a * i, n); },
            isZero: function (a) { return a === 0n; },
            eq: function (a, b) { return a === b; },
            isOne: function (a) { return a === 1n; },
            unit: function (a) { return a !== 0n && gcd(a, n) === 1n; },
            inv: function (a) { return invMod(a, n); },
            isNeg: function () { return false; },
            from: function (q) {
                var di = invMod(q.d, n);
                if (di === null) Calc.fail('The fraction ' + gm.qstr(q) + ' has no value modulo ' + n + ': ' + q.d + ' has no inverse modulo ' + n + '.');
                return mod(mod(q.n, n) * di, n);
            },
            tex: function (a) { return Calc.tex(a); },
            texp: function (a) { return Calc.tex(a); },
            str: function (a) { return String(a); }
        };
        return R;
    };

    /* ---------- matrices: arrays of rows ---------- */
    /* parse a matrix typed in a textarea: one row per line (or rows separated by ;), entries separated by spaces or
       commas, fractions and decimals allowed; brackets are ignored, so [[1, 2], [3, 4]] works too. Rows of Q. */
    gm.parseMatrix = function (text, name, field) {
        name = name || 'The matrix';
        var s = String(text || '').replace(/[\u2212\u2013\u2014]/g, '-').replace(/\]\s*,?\s*\[/g, '\n').replace(/[\[\]()|]/g, ' ');
        var lines = s.split(/[\n;]+/).map(function (l) { return l.trim(); }).filter(Boolean);
        if (!lines.length) Calc.fail(name + ' is empty: type one row per line.', field);
        var rows = lines.map(function (l, i) {
            var parts = l.split(/[\s,]+/).filter(Boolean);
            return parts.map(function (p) {
                var q = gm.parseQ(p);
                if (!q) Calc.fail(name + ', row ' + (i + 1) + ': "' + p + '" is not a number (use whole numbers, fractions like 3/4 or decimals).', field);
                return q;
            });
        }).filter(function (r) { return r.length; });
        var w = rows[0].length;
        rows.forEach(function (r, i) { if (r.length !== w) Calc.fail(name + ': row ' + (i + 1) + ' has ' + r.length + ' entries but row 1 has ' + w + '.', field); });
        return rows;
    };
    gm.convert = function (R, M) { return M.map(function (r) { return r.map(R.from); }); };
    gm.copy = function (M) { return M.map(function (r) { return r.slice(); }); };
    gm.identity = function (R, n) { var I = []; for (var i = 0; i < n; i++) { I.push([]); for (var j = 0; j < n; j++) I[i].push(i === j ? R.one : R.zero); } return I; };
    gm.transpose = function (M) { return M[0].map(function (_, j) { return M.map(function (r) { return r[j]; }); }); };
    gm.mmul = function (R, A, B) {
        return A.map(function (r) { return B[0].map(function (_, j) { var s = R.zero; for (var k = 0; k < r.length; k++) s = R.add(s, R.mul(r[k], B[k][j])); return s; }); });
    };
    gm.mEq = function (R, A, B) { return A.length === B.length && A.every(function (r, i) { return r.length === B[i].length && r.every(function (x, j) { return R.eq(x, B[i][j]); }); }); };
    gm.isIdentity = function (R, M) { return gm.mEq(R, M, gm.identity(R, M.length)); };
    /* TeX of a matrix. o.bar: number of columns left of a vertical bar ([A | I]); o.box: [i, j] boxes one entry */
    gm.mtex = function (R, M, o) {
        o = o || {};
        var w = M[0].length, spec = '';
        for (var j = 0; j < w; j++) spec += (o.bar && j === o.bar ? '|' : '') + 'c';
        /* fractions need more room between the rows */
        var tall = R.q && M.some(function (r) { return r.some(function (x) { return x.d !== 1n; }); });
        return (tall ? '{\\def\\arraystretch{1.6}' : '') + '\\left[\\begin{array}{' + spec + '}' + M.map(function (r, i) {
            return r.map(function (x, j) { var t = R.tex(x); return o.box && o.box[0] === i && o.box[1] === j ? '\\boxed{' + t + '}' : t; }).join(' & ');
        }).join(' \\\\ ') + '\\end{array}\\right]' + (tall ? '}' : '');
    };
    /* plain text: entries separated by spaces, rows by new lines */
    gm.mstr = function (R, M) { return M.map(function (r) { return r.map(R.str).join(' '); }).join('\n'); };

    /* ---------- row operations ---------- */
    function rowName(i) { return 'R_{' + (i + 1) + '}'; }
    /* TeX of one operation: swap R_i <-> R_j, scale R_i <- c R_i, sub R_i <- R_i - c R_j */
    gm.opTex = function (R, op) {
        if (op.kind === 'swap') return rowName(op.i) + ' \\leftrightarrow ' + rowName(op.j);
        if (op.kind === 'scale') return rowName(op.i) + ' \\leftarrow ' + R.texp(op.c) + ' \\cdot ' + rowName(op.i);
        var c = op.c, minus = true;
        if (R.isNeg(c)) { c = R.neg(c); minus = false; }
        return rowName(op.i) + ' \\leftarrow ' + rowName(op.i) + (minus ? ' - ' : ' + ') + (R.isOne(c) ? '' : R.tex(c) + ' \\cdot ') + rowName(op.j);
    };
    function apply(R, M, op) {
        if (op.kind === 'swap') { var t = M[op.i]; M[op.i] = M[op.j]; M[op.j] = t; return; }
        if (op.kind === 'scale') { M[op.i] = M[op.i].map(function (x) { return R.mul(op.c, x); }); return; }
        var src = M[op.j];
        M[op.i] = M[op.i].map(function (x, k) { return R.sub(x, R.mul(op.c, src[k])); });
    }
    /* Gaussian elimination that records every row operation and the matrix after it.
       o.cols: pivots are looked for in the first cols columns only (for [A | b] and [A | I]); default all.
       o.jordan: Gauss-Jordan in one pass (each pivot scaled to 1, its column cleared above and below). Otherwise
       forward elimination: zeros below the pivots, no scaling, so the determinant only changes sign with swaps.
       Pivot: the entry in place when it is non-zero (invertible in Z_n), else the first such entry below.
       In Z_n with composite n a column can have non-zero entries but no invertible one. Then Euclid's algorithm
       runs on the column (R_i <- R_i - q R_j with whole q, valid in any Z_n) until one entry is left: the group gets
       euclid: true, and nonunit: true if that entry is still not invertible. In jordan mode that ends the run
       (stuck: the group). Returns {M, groups, pivots: [{row, col}], swaps, stuck}, where a group is
       {col, row, ops: [{kind, i, j, c, M}], zero (no pivot in this column), euclid, nonunit}. */
    gm.reduce = function (R, A, o) {
        o = o || {};
        var M = gm.copy(A), m = M.length, cols = o.cols || M[0].length, groups = [], pivots = [], swaps = 0, r = 0;
        function rec(g, op) { apply(R, M, op); op.M = gm.copy(M); g.ops.push(op); if (op.kind === 'swap') swaps++; }
        for (var c = 0; c < cols && r < m; c++) {
            var g = { col: c, row: r, ops: [] }, p = -1, i;
            for (i = r; i < m; i++) if (R.unit(M[i][c])) { p = i; break; }
            if (p < 0) {
                var any = false;
                for (i = r; i < m; i++) if (!R.isZero(M[i][c])) any = true;
                if (!any) { g.zero = true; groups.push(g); continue; }
                /* Z_n, composite n: Euclid on the column */
                g.euclid = true;
                for (var guard = 0; guard < 10000; guard++) {
                    var nz = [];
                    for (i = r; i < m; i++) if (!R.isZero(M[i][c])) nz.push(i);
                    if (nz.length < 2) break;
                    var s = nz[0];
                    nz.forEach(function (k) { if (M[k][c] < M[s][c]) s = k; });
                    for (var t = 0; t < nz.length; t++) {
                        var k = nz[t];
                        if (k === s) continue;
                        rec(g, { kind: 'sub', i: k, j: s, c: M[k][c] / M[s][c] });
                    }
                }
                for (i = r; i < m; i++) if (!R.isZero(M[i][c])) p = i;
                if (!R.unit(M[p][c])) g.nonunit = true;
            }
            if (p !== r) rec(g, { kind: 'swap', i: r, j: p });
            g.pivot = M[r][c];
            if (g.nonunit) {
                groups.push(g);
                if (o.jordan) return { M: M, groups: groups, pivots: pivots, swaps: swaps, stuck: g };
                pivots.push({ row: r, col: c });
                r++;
                continue;
            }
            if (o.jordan && !R.isOne(M[r][c])) rec(g, { kind: 'scale', i: r, c: R.inv(M[r][c]), from: M[r][c] });
            for (i = o.jordan ? 0 : r + 1; i < m; i++) {
                if (i === r || R.isZero(M[i][c])) continue;
                rec(g, { kind: 'sub', i: i, j: r, c: R.div(M[i][c], M[r][c]) });
            }
            groups.push(g);
            pivots.push({ row: r, col: c });
            r++;
        }
        return { M: M, groups: groups, pivots: pivots, swaps: swaps, stuck: null };
    };
    /* the second half of Gauss-Jordan after gm.reduce (a field): from the last pivot up, scale it to 1 and clear its
       column above. Returns {M, groups} like gm.reduce. */
    gm.backward = function (R, A, pivots) {
        var M = gm.copy(A), groups = [];
        function rec(g, op) { apply(R, M, op); op.M = gm.copy(M); g.ops.push(op); }
        for (var t = pivots.length - 1; t >= 0; t--) {
            var r = pivots[t].row, c = pivots[t].col, g = { col: c, row: r, ops: [], pivot: M[r][c] };
            if (!R.isOne(M[r][c])) rec(g, { kind: 'scale', i: r, c: R.inv(M[r][c]), from: M[r][c] });
            for (var i = 0; i < r; i++) if (!R.isZero(M[i][c])) rec(g, { kind: 'sub', i: i, j: r, c: M[i][c] });
            if (g.ops.length) groups.push(g);
        }
        return { M: M, groups: groups };
    };
    /* the determinant from a forward elimination of a square matrix */
    gm.detFrom = function (R, red) {
        var n = red.M.length;
        if (red.pivots.length < n) return R.zero;
        var d = R.one;
        for (var i = 0; i < n; i++) d = R.mul(d, red.M[i][i]);
        return red.swaps % 2 ? R.neg(d) : d;
    };
    /* the determinant by cofactor expansion (for checks; n! terms, so small n only) */
    gm.detCofactor = function (R, M) {
        var n = M.length;
        if (n === 1) return M[0][0];
        var d = R.zero;
        for (var j = 0; j < n; j++) {
            if (R.isZero(M[0][j])) continue;
            var minor = M.slice(1).map(function (r) { return r.filter(function (_, k) { return k !== j; }); });
            var t = R.mul(M[0][j], gm.detCofactor(R, minor));
            d = j % 2 ? R.sub(d, t) : R.add(d, t);
        }
        return d;
    };

    /* the steps of an elimination (gm.reduce or gm.backward), one per column, every row operation with the matrix
       after it. o: {bar: columns left of the bar, jordan, back, intro: rich text at the top of the first step,
       state: {} shared between calls of one run} */
    gm.showSteps = function (S, R, groups, o) {
        o = o || {};
        var T = Calc.tex, modn = !R.q, n = R.n, st = o.state || {}, mod = modn ? ' \\pmod{' + T(n) + '}' : '';
        groups.forEach(function (g, gi) {
            var c = g.col + 1, r = g.row + 1;
            if (g.zero) {
                var z = S.step('Column ' + c + ': no pivot');
                if (gi === 0 && o.intro) z.p(o.intro);
                z.p('From row ' + r + ' down, column ' + c + ' has only zeros, so there is no pivot here. Move on to the next column.');
                return;
            }
            var s = S.step((o.back ? 'Back up from the pivot in row ' : 'Column ' + c + ': pivot in row ') + r);
            if (gi === 0 && o.intro) s.p(o.intro);
            if (g.euclid && g.ops.some(function (op) { return op.kind === 'sub'; })) {
                s.p('No entry of column ' + c + ' from row ' + r + ' down is invertible modulo $' + T(n) + '$ (each non-zero one shares a factor with $' + T(n) + '$), so we cannot divide by any of them. Instead run Euclid\'s algorithm on the column: subtract whole multiples of the row with the smallest entry from the others, until one non-zero entry is left. This needs no division and works modulo any $n$.');
            } else if (g.euclid) s.p('From row ' + r + ' down, column ' + c + ' has one non-zero entry, and it is not invertible modulo $' + T(n) + '$, so it cannot be scaled to 1. There is nothing below it to clear, though.');
            var first = true;
            g.ops.forEach(function (op) {
                var box = g.euclid ? null : [g.row, g.col];
                if (op.kind === 'swap' && !g.euclid) s.p('The entry in row ' + r + ' is ' + (modn && !R.field ? 'not invertible' : '0') + ', so swap with row ' + (op.j + 1) + ', which has ' + (modn && !R.field ? 'an invertible entry' : 'a non-zero entry') + ' there.');
                if (op.kind === 'scale') {
                    if (modn) s.p('Make the pivot 1 by multiplying its row with $' + T(op.from) + '^{-1} \\equiv ' + T(op.c) + mod + '$ (check: $' + T(op.from) + ' \\cdot ' + T(op.c) + ' = ' + T(op.from * op.c) + ' \\equiv 1$).');
                    else s.p('Make the pivot 1: divide its row by $' + R.tex(op.from) + '$.');
                } else if (op.kind === 'sub' && first && !g.euclid) {
                    var where = o.jordan ? 'above and below' : o.back ? 'above' : 'below';
                    if (!st.explained) {
                        s.p('Clear the entries ' + where + ' the pivot: to remove an entry, subtract $\\tfrac{\\text{entry}}{\\text{pivot}}$ times the pivot row' + (modn ? ' (modulo $' + T(n) + '$, dividing by the pivot means multiplying by its inverse)' : '') + '.');
                        st.explained = true;
                    } else s.p('Clear the entries ' + where + ' the pivot.');
                }
                if (op.kind !== 'swap') first = false;
                s.math('\\xrightarrow{\\;' + gm.opTex(R, op) + '\\;} ' + gm.mtex(R, op.M, { bar: o.bar, box: box }));
            });
            if (!g.ops.length) s.p('The pivot is $' + R.tex(g.pivot) + '$ and the column ' + (o.jordan ? 'already has zeros everywhere else' : 'is already 0 below it') + ': nothing to do.');
            if (g.nonunit) s.p('The pivot $' + T(g.pivot) + '$ has $\\gcd(' + T(g.pivot) + ', ' + T(n) + ') = ' + T(gcd(g.pivot, n)) + ' \\ne 1$: it is not invertible modulo $' + T(n) + '$.' + (o.jordan ? '' : ' It stays on the diagonal; the determinant does not need it to be invertible.'));
        });
    };

    /* ---------- big whole numbers for display ---------- */
    /* TeX of a whole number, shortened when it has more than max digits (default 60): 123...789 (5000 digits) */
    gm.bigTex = function (n, max) {
        var s = String(abs(n)), neg = n < 0n ? '-' : '';
        if (s.length <= (max || 60)) return Calc.tex(n);
        return neg + s.slice(0, 20) + '\\ldots' + s.slice(-20) + '\\;(' + s.length + '\\text{ digits})';
    };
    /* a long number cut into lines of 60 digits (for a .pre block) */
    gm.wrap = function (n, w) { return (String(n).match(new RegExp('.{1,' + (w || 60) + '}', 'g')) || ['']).join('\n'); };

    /* ---------- a linear expression c + sum a_i t_i (for solutions in parametric form) ---------- */
    /* terms: [{c, tex, str}] for the parameters (zero coefficients are skipped). Returns {tex, str} */
    gm.linExpr = function (R, c0, terms) {
        var tex = '', str = '';
        if (!R.isZero(c0) || !terms.some(function (t) { return !R.isZero(t.c); })) { tex = R.tex(c0); str = R.str(c0); }
        terms.forEach(function (t) {
            if (R.isZero(t.c)) return;
            var c = t.c, neg = R.isNeg(c);
            if (neg) c = R.neg(c);
            var one = R.isOne(c);
            var ct = one ? '' : R.tex(c), cs = one ? '' : (R.q && c.d !== 1n ? '(' + R.str(c) + ')' : R.str(c));
            if (!tex) { tex = (neg ? '-' : '') + ct + t.tex; str = (neg ? '-' : '') + cs + t.str; }
            else { tex += (neg ? ' - ' : ' + ') + ct + t.tex; str += (neg ? ' - ' : ' + ') + cs + t.str; }
        });
        return { tex: tex, str: str };
    };
})(typeof window !== 'undefined' ? window : globalThis);
