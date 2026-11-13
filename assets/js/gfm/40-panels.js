/* The side of /phd/projects/gfm/: the cost chart (one line, Cost(r), with r* and the chosen r marked; hover for the
   value, tap to choose), the counts, the answer per view, and the DASA strings of the rectangle that holds Bob. */
(function (G) {
    'use strict';
    var el = G.el;
    var W = 300, H = 120, ML = 40, MR = 10, MT = 12, MB = 24;

    function niceMax(v) {
        var e = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))), f = v / e;
        return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
    }
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
    G.fmt = fmt;

    /* svg: the chart; onPick(r) when a resolution is tapped */
    G.chart = function (svg, onPick) {
        var data = [], top = 1, best = 1, cur = 1, ymax = 1;
        var gAxis = el('g', { 'class': 'gc-axis' }, svg);
        var line = el('path', { 'class': 'gc-line' }, svg);
        var curLine = el('path', { 'class': 'gc-cur' }, svg);
        var bestDot = el('circle', { r: 4, 'class': 'gc-best' }, svg);
        var bestLab = el('text', { 'class': 'gc-lab', 'text-anchor': 'middle' }, svg);
        var curDot = el('circle', { r: 4, 'class': 'gc-curdot' }, svg);
        var tip = el('text', { x: W - MR, y: MT - 1, 'class': 'gc-tip', 'text-anchor': 'end' }, svg);
        var hit = el('rect', { x: ML - 6, y: 0, width: W - ML - MR + 12, height: H, 'class': 'gc-hit' }, svg);
        function X(r) { return ML + (top > 1 ? (r - 1) / (top - 1) : 0) * (W - ML - MR); }
        function Y(c) { return H - MB - c / ymax * (H - MT - MB); }
        function rAt(e) {
            var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
            var v = pt.matrixTransform(svg.getScreenCTM().inverse());
            return Math.max(1, Math.min(top, Math.round(1 + (v.x - ML) / (W - ML - MR) * (top - 1))));
        }
        function say(r) {
            var d = data[r - 1];
            tip.textContent = d ? 'r = ' + r + ': cost ' + fmt(d.cost) : '';
        }
        hit.addEventListener('pointermove', function (e) { say(rAt(e)); });
        hit.addEventListener('pointerleave', function () { say(cur); });
        hit.addEventListener('click', function (e) { onPick(rAt(e)); });
        function axis() {
            while (gAxis.firstChild) gAxis.removeChild(gAxis.firstChild);
            el('path', { d: 'M' + ML + ' ' + (H - MB) + 'H' + (W - MR), 'class': 'gc-base' }, gAxis);
            el('path', { d: 'M' + ML + ' ' + Y(ymax) + 'H' + (W - MR) + 'M' + ML + ' ' + Y(ymax / 2) + 'H' + (W - MR), 'class': 'gc-grid' }, gAxis);
            [[0, Y(0)], [ymax / 2, Y(ymax / 2)], [ymax, Y(ymax)]].forEach(function (t) {
                var tx = el('text', { x: ML - 6, y: t[1] + 4, 'class': 'gc-tick', 'text-anchor': 'end' }, gAxis);
                tx.textContent = fmt(t[0]);
            });
            var step = top > 20 ? 5 : top > 10 ? 2 : 1, ticks = [1];
            for (var r = step; r <= top; r += step) if (r - 1 >= step * 0.6) ticks.push(r);
            ticks.forEach(function (r) {
                var t = el('text', { x: X(r), y: H - MB + 15, 'class': 'gc-tick', 'text-anchor': 'middle' }, gAxis);
                t.textContent = r;
            });
            var lab = el('text', { x: W - MR, y: H - 1, 'class': 'gc-tick gc-r', 'text-anchor': 'end' }, gAxis);
            lab.textContent = 'r';
        }
        return {
            set: function (list, rTop, rBest) {
                data = list.slice(0, rTop); top = rTop; best = rBest;
                ymax = niceMax(Math.max.apply(null, data.map(function (d) { return d.cost; })));
                axis();
                line.setAttribute('d', 'M' + data.map(function (d) { return X(d.r).toFixed(1) + ' ' + Y(d.cost).toFixed(1); }).join('L'));
                bestDot.setAttribute('cx', X(best)); bestDot.setAttribute('cy', Y(data[best - 1].cost));
                bestLab.setAttribute('x', Math.min(W - MR - 20, Math.max(ML + 20, X(best))));
                bestLab.setAttribute('y', Y(data[best - 1].cost) + 16);
                bestLab.textContent = 'r* = ' + best;
            },
            cur: function (r) {
                cur = r;
                var d = data[r - 1];
                curLine.setAttribute('d', 'M' + X(r) + ' ' + MT + 'V' + (H - MB));
                curDot.setAttribute('cx', X(r)); curDot.setAttribute('cy', d ? Y(d.cost) : 0);
                say(r);
            }
        };
    };

    /* ---------- the DASA strings ---------- */
    function h(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }
    function strings(list, match) {
        var s = h('span', 'gd-strs');
        list.forEach(function (x) { s.appendChild(h(x.s === match ? 'mark' : 'code', x.s === match ? 'gd-m' : '', x.s)); });
        return s;
    }
    /* one axis: Alice's strings for [lo, hi] and Bob's for his value q, the common string marked */
    function axisRows(box, name, lo, hi, q, wmax) {
        var A = G.recStrings(lo, hi), B = G.sndStrings(q, wmax), match = null;
        B.forEach(function (b) { A.forEach(function (a) { if (a.s === b.s) match = a.s; }); });
        var row = h('div', 'gd-axis');
        row.appendChild(h('span', 'gd-name', name));
        var a = h('div', 'gd-side');
        a.appendChild(h('span', 'gd-who', 'Alice, ' + lo + ' to ' + hi + ':'));
        a.appendChild(strings(A, match));
        var b = h('div', 'gd-side');
        b.appendChild(h('span', 'gd-who', 'Bob, ' + q + ' = ' + G.bits(q, G.BITS) + ':'));
        b.appendChild(strings(B, match));
        row.appendChild(a); row.appendChild(b);
        box.appendChild(row);
        return match !== null;
    }
    G.dasa = function (box, view, part, hit, bob) {
        while (box.firstChild) box.removeChild(box.firstChild);
        if (view !== 'god' || !part.box) {
            if (part.box) box.appendChild(h('p', 'gd-line', view === 'alice' ? 'Alice cannot tell which rectangle matched: the answers come shuffled.' : 'Bob builds his strings from the rectangle sizes alone.'));
            return;
        }
        var c = G.cost(part), k = -1;
        if (hit && hit.rect !== undefined) k = hit.rect;
        else if (!hit) {           /* outside: a rectangle that matches in one axis, if there is one */
            part.rects.some(function (r, i) {
                if ((bob.x >= r.x0 && bob.x <= r.x1) || (bob.y >= r.y0 && bob.y <= r.y1)) { k = i; return true; }
                return false;
            });
        }
        box.appendChild(h('h2', 'gd-h', 'The strings (DASA)'));
        if (hit && hit.res) {
            box.appendChild(h('p', 'gd-line', 'Bob stands on a residual point. Alice lists it whole, (' + bob.x + ', ' + bob.y + ') = ' +
                G.bits(bob.x, G.BITS) + ' ' + G.bits(bob.y, G.BITS) + ', and Bob looks up his own point: a match.'));
            return;
        }
        if (k < 0) { box.appendChild(h('p', 'gd-line', 'No rectangle shares Bob’s x or y range, and he is on no residual point.')); return; }
        var r = part.rects[k];
        var mx = axisRows(box, 'x', r.x0, r.x1, bob.x, c.wmax[0]);
        var my = axisRows(box, 'y', r.y0, r.y1, bob.y, c.wmax[1]);
        box.appendChild(h('p', 'gd-line', mx && my ? 'A common string in x and in y for this rectangle: Bob is inside it.' :
            'Rectangle ' + (k + 1) + ': a match in ' + (mx ? 'x' : 'y') + ' but not in ' + (mx ? 'y' : 'x') + ', so no.'));
    };

    G.answer = function (res, learns, view, part, hit) {
        var inside = !!hit;
        res.className = 'gfm-result' + (view === 'bob' ? '' : inside ? ' is-in' : ' is-out');
        if (!part.box) { res.textContent = ' '; learns.textContent = 'Draw a region first.'; return; }
        if (view === 'bob') {
            res.textContent = 'Bob learns nothing';
            learns.textContent = 'He sees his own spot and the rectangle sizes, not where they are, and no answer.';
        } else if (view === 'alice') {
            res.textContent = inside ? 'Alice learns: inside' : 'Alice learns: outside';
            learns.textContent = 'One bit. Not where Bob is, not even which rectangle matched.';
        } else {
            res.textContent = inside ? (hit.res ? 'Inside, on a residual point' : 'Inside, rectangle ' + (hit.rect + 1) + ' of ' + part.K) : 'Outside';
            learns.textContent = 'You see everything. Alice gets only inside or outside; Bob gets nothing.';
        }
    };
})(GFM);
