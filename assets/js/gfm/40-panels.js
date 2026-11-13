/* The side of /phd/gfm/: the cost chart (one line, the chosen cost per r, with r* and the chosen r marked;
   r* glides to its new place when the choice changes; hover for the value, tap to choose), the counts, the answer
   per view, and the DASA strings of the rectangle that holds Bob. */
(function (G) {
    'use strict';
    var el = G.el;
    var W = 320, H = 132, ML = 44, MR = 10, MT = 18, MB = 22;

    function niceMax(v) {
        var e = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))), f = v / e;
        return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
    }
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
    G.fmt = fmt;

    /* svg: the chart; onPick(r) when a resolution is tapped */
    G.chart = function (svg, onPick) {
        var data = [], top = 1, best = 0, cur = 1, ymax = 1, vf = fmt;
        var gAxis = el('g', { 'class': 'gc-axis' }, svg);
        var area = el('path', { 'class': 'gc-area' }, svg);
        var line = el('path', { 'class': 'gc-line' }, svg);
        var curLine = el('path', { 'class': 'gc-cur' }, svg);
        /* r*: a group moved by a CSS transform, so a change of choice is seen as a move */
        var gBest = el('g', { 'class': 'gc-bestg' }, svg);
        var ping = el('circle', { r: 4.5, 'class': 'gc-ping' }, gBest);
        el('circle', { r: 4.5, 'class': 'gc-best' }, gBest);
        var bestLab = el('text', { 'class': 'gc-lab', 'text-anchor': 'middle' }, gBest);
        var curDot = el('circle', { r: 4.5, 'class': 'gc-curdot' }, svg);
        var tip = el('text', { x: W - MR, y: 10, 'class': 'gc-tip', 'text-anchor': 'end' }, svg);
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
            tip.textContent = d ? 'r = ' + r + ':  ' + vf(d.cost) : '';
        }
        hit.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') say(rAt(e)); });
        hit.addEventListener('pointerleave', function () { say(cur); });
        hit.addEventListener('click', function (e) { onPick(rAt(e)); });
        function axis() {
            while (gAxis.firstChild) gAxis.removeChild(gAxis.firstChild);
            el('path', { d: 'M' + ML + ' ' + Y(ymax) + 'H' + (W - MR) + 'M' + ML + ' ' + Y(ymax / 2) + 'H' + (W - MR), 'class': 'gc-grid' }, gAxis);
            el('path', { d: 'M' + ML + ' ' + (H - MB) + 'H' + (W - MR), 'class': 'gc-base' }, gAxis);
            [[0, Y(0)], [ymax / 2, Y(ymax / 2)], [ymax, Y(ymax)]].forEach(function (t) {
                var tx = el('text', { x: ML - 7, y: t[1] + 4, 'class': 'gc-tick', 'text-anchor': 'end' }, gAxis);
                tx.textContent = vf(t[0]);
            });
            var step = top > 20 ? 5 : top > 10 ? 2 : 1, ticks = [1];
            for (var r = step; r <= top; r += step) if (r - 1 >= step * 0.6) ticks.push(r);
            ticks.forEach(function (r) {
                var t = el('text', { x: X(r), y: H - MB + 15, 'class': 'gc-tick', 'text-anchor': 'middle' }, gAxis);
                t.textContent = r;
            });
            var lab = el('text', { x: ML - 7, y: H - MB + 15, 'class': 'gc-tick gc-r', 'text-anchor': 'end' }, gAxis);
            lab.textContent = 'r';
        }
        return {
            /* list: [{r, cost}], the value to show per resolution; format: how to write a value */
            set: function (list, rTop, rBest, format) {
                data = list.slice(0, rTop); top = rTop; vf = format || fmt;
                ymax = niceMax(Math.max.apply(null, data.map(function (d) { return d.cost; })));
                axis();
                var pts = data.map(function (d) { return X(d.r).toFixed(1) + ' ' + Y(d.cost).toFixed(1); });
                line.setAttribute('d', 'M' + pts.join('L'));
                area.setAttribute('d', 'M' + X(1) + ' ' + Y(0) + 'L' + pts.join('L') + 'L' + X(top) + ' ' + Y(0) + 'Z');
                var bx = X(rBest), by = Y(data[rBest - 1].cost);
                gBest.style.transform = 'translate(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px)';
                bestLab.setAttribute('x', (Math.min(W - MR - 20, Math.max(ML + 20, bx)) - bx).toFixed(1));
                bestLab.textContent = 'r* = ' + rBest;
                bestLab.setAttribute('y', by > H - MB - 26 ? -10 : 18);     /* above the dot when it sits low */
                if (best && rBest !== best) {           /* r* moved: a ring once around its new place */
                    ping.classList.remove('is-on');
                    void ping.getBBox();
                    ping.classList.add('is-on');
                }
                if (!best) gBest.classList.add('is-ready');
                best = rBest;
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
        list.forEach(function (x) { s.appendChild(h(x.s === match ? 'mark' : 'code', '', x.s)); });
        return s;
    }
    /* one axis: Alice's strings for [lo, hi] and Bob's for his value q, the common string marked */
    function axisRows(box, name, lo, hi, q, wmax) {
        var A = G.recStrings(lo, hi), B = G.sndStrings(q, wmax), match = null;
        B.forEach(function (b) { A.forEach(function (a) { if (a.s === b.s) match = a.s; }); });
        var row = h('div', 'gd-axis' + (match === null ? ' is-miss' : ''));
        row.appendChild(h('span', 'gd-name', name));
        var a = h('div', 'gd-side gd-alice');
        a.appendChild(h('span', 'gd-who', lo + ' to ' + hi));
        a.appendChild(strings(A, match));
        var b = h('div', 'gd-side gd-bob');
        b.appendChild(h('span', 'gd-who', q + ' = ' + G.bits(q, G.BITS)));
        b.appendChild(strings(B, match));
        row.appendChild(a); row.appendChild(b);
        row.appendChild(h('span', 'gd-ok', match === null ? 'no match' : 'match'));
        box.appendChild(row);
        return match !== null;
    }
    function head(box, title, sub) {
        var hd = h('div', 'gd-head');
        hd.appendChild(h('h2', 'gd-h', title));
        if (sub) hd.appendChild(h('span', 'gd-sub', sub));
        box.appendChild(hd);
    }
    G.dasa = function (box, view, part, hit, bob) {
        while (box.firstChild) box.removeChild(box.firstChild);
        if (!part.box) return;
        if (view !== 'god') {
            head(box, 'The strings (DASA)');
            box.appendChild(h('p', 'gd-line', view === 'alice' ? 'Alice cannot tell which rectangle matched: the answers come shuffled.' : 'Bob builds his strings from the rectangle sizes alone.'));
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
        if (hit && hit.res) {
            head(box, 'The strings (DASA)', 'a residual point');
            box.appendChild(h('p', 'gd-line', 'Alice lists the point whole, (' + bob.x + ', ' + bob.y + ') = ' +
                G.bits(bob.x, G.BITS) + ' ' + G.bits(bob.y, G.BITS) + ', and Bob looks up his own point: a match.'));
            return;
        }
        if (k < 0) {
            head(box, 'The strings (DASA)');
            box.appendChild(h('p', 'gd-line', 'No rectangle shares Bob’s x or y range, and he is on no residual point.'));
            return;
        }
        var r = part.rects[k];
        head(box, 'The strings (DASA)', 'rectangle ' + (k + 1) + ' of ' + part.K);
        var cols = h('div', 'gd-axis gd-cols');
        cols.appendChild(h('span', 'gd-name', ''));
        cols.appendChild(h('span', 'gd-col gd-alice', 'Alice: the interval'));
        cols.appendChild(h('span', 'gd-col gd-bob', 'Bob: his coordinate'));
        cols.appendChild(h('span', 'gd-ok', ''));
        box.appendChild(cols);
        var mx = axisRows(box, 'x', r.x0, r.x1, bob.x, c.wmax[0]);
        var my = axisRows(box, 'y', r.y0, r.y1, bob.y, c.wmax[1]);
        box.appendChild(h('p', 'gd-line', mx && my ? 'A common string in x and in y: Bob is inside this rectangle.' :
            'A match in ' + (mx ? 'x' : 'y') + ' but not in ' + (mx ? 'y' : 'x') + ': Bob is not in this rectangle.'));
    };

    /* the answer: what the chosen view shows */
    G.answer = function (els, view, part, hit) {
        var inside = !!hit;
        els.res.className = 'gfm-result' + (view === 'bob' ? ' is-none' : inside ? ' is-in' : ' is-out');
        if (!part.box) { els.k.textContent = ' '; els.res.textContent = ' '; els.learns.textContent = 'Pick or draw a region first.'; return; }
        if (view === 'bob') {
            els.k.textContent = 'Bob learns';
            els.res.textContent = 'Nothing';
            els.learns.textContent = 'He sees the rectangle sizes, not where they are, and no answer.';
        } else if (view === 'alice') {
            els.k.textContent = 'Alice learns';
            els.res.textContent = inside ? 'Inside' : 'Outside';
            els.learns.textContent = 'One bit. Not where Bob is, not even which rectangle.';
        } else {
            els.k.textContent = 'Bob is';
            els.res.textContent = inside ? 'Inside' : 'Outside';
            els.learns.textContent = inside ? (hit.res ? 'On a residual point.' : 'In rectangle ' + (hit.rect + 1) + ' of ' + part.K + '.') + ' Alice learns only this bit.'
                : 'In none of the pieces. Alice learns only this bit.';
        }
    };
})(GFM);
