/* Drawing on the map of /phd/gfm/: the layers (town, region, the Partitioner's stages, Bob) and the paths
   for them. Lattice point (x, y) is the unit square [x, x + 1] x [y, y + 1] of the drawing, its centre (x + .5, y + .5). */
(function (G) {
    'use strict';
    var N = G.N, el = G.el;
    var L = {};

    G.layers = function (svg) {
        ['town', 'region', 'box', 'grid', 'cells', 'runs', 'rects', 'lit', 'res', 'litres', 'outline', 'labels', 'draft', 'bob'].forEach(function (n) {
            L[n] = el('g', { 'class': 'g-' + n }, svg);
        });
        G.drawTown(L.town);
        G.drawLabels(L.labels);
        L.regionFill = el('path', { 'class': 'gr-fill' }, L.region);
        L.outlinePath = el('path', { 'class': 'gr-line' }, L.outline);
        L.boxPath = el('path', { 'class': 'gp-box' }, L.box);
        L.gridPath = el('path', { 'class': 'gp-grid' }, L.grid);
        L.cellsPath = el('path', { 'class': 'gp-cells' }, L.cells);
        L.runsPath = el('path', { 'class': 'gp-runs' }, L.runs);
        L.rectsPaths = [0, 1, 2].map(function (i) { return el('path', { 'class': 'gp-rects gp-tone' + i }, L.rects); });
        L.litPath = el('path', { 'class': 'gp-lit' }, L.lit);
        L.resPath = el('path', { 'class': 'gp-res' }, L.res);
        L.litResPath = el('path', { 'class': 'gp-litres' }, L.litres);
        L.draftPath = el('path', { 'class': 'gd-line' }, L.draft);
        L.draftDots = el('path', { 'class': 'gd-dots' }, L.draft);
        /* Bob: a cat's head, centred on his lattice point */
        L.bobG = el('g', { 'class': 'gb' }, L.bob);
        el('circle', { cx: 0, cy: 0, r: 5.2, 'class': 'gb-halo' }, L.bobG);
        el('path', { d: 'M-3.6-.6L-3.3-5.2-.9-2.6ZM3.6-.6L3.3-5.2.9-2.6Z', 'class': 'gb-cat' }, L.bobG);
        el('ellipse', { cx: 0, cy: 0, rx: 3.9, ry: 3.3, 'class': 'gb-cat' }, L.bobG);
        el('circle', { cx: -1.4, cy: -0.4, r: 0.55, 'class': 'gb-eye' }, L.bobG);
        el('circle', { cx: 1.4, cy: -0.4, r: 0.55, 'class': 'gb-eye' }, L.bobG);
        el('rect', { x: -0.5, y: -0.5, width: 1, height: 1, 'class': 'gb-dot' }, L.bob);
        return L;
    };
    G.show = function (name, on) { L[name].style.display = on ? '' : 'none'; };

    /* ---------- paths ---------- */
    function rectD(x, y, w, h) { return 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'z'; }
    function rectsD(list) {
        return list.map(function (h) { return rectD(h.x0, h.y0, h.x1 - h.x0 + 1, h.y1 - h.y0 + 1); }).join('');
    }
    function dotsD(idx, rad) {
        var d = [];
        idx.forEach(function (k) {
            var x = (k % N) + 0.5 - rad, y = Math.floor(k / N) + 0.5;
            d.push('M' + x.toFixed(2) + ' ' + y + 'a' + rad + ' ' + rad + ' 0 1 0 ' + 2 * rad + ' 0a' + rad + ' ' + rad + ' 0 1 0 ' + (-2 * rad) + ' 0');
        });
        return d.join('');
    }
    /* the outline of a set of lattice points: the sides of their squares that face a point outside */
    function maskOutlineD(m) {
        var d = [];
        function at(x, y) { return x >= 0 && y >= 0 && x < N && y < N && m[y * N + x]; }
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
            if (!m[y * N + x]) continue;
            if (!at(x, y - 1)) d.push('M' + x + ' ' + y + 'h1');
            if (!at(x, y + 1)) d.push('M' + x + ' ' + (y + 1) + 'h1');
            if (!at(x - 1, y)) d.push('M' + x + ' ' + y + 'v1');
            if (!at(x + 1, y)) d.push('M' + (x + 1) + ' ' + y + 'v1');
        }
        return d.join('');
    }
    function ballD(rg) {
        var cx = rg.cx + 0.5, cy = rg.cy + 0.5, R = rg.R, pts = [], n = 160;
        if (rg.p === Infinity) return rectD(cx - R, cy - R, 2 * R, 2 * R);
        for (var i = 0; i < n; i++) {
            var t = 2 * Math.PI * i / n, c = Math.cos(t), s = Math.sin(t), e = 2 / rg.p;
            pts.push((cx + R * Math.sign(c) * Math.pow(Math.abs(c), e)).toFixed(2) + ' ' + (cy + R * Math.sign(s) * Math.pow(Math.abs(s), e)).toFixed(2));
        }
        return 'M' + pts.join('L') + 'Z';
    }
    function polyD(pts, close) {
        if (!pts.length) return '';
        return 'M' + pts.map(function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('L') + (close ? 'Z' : '');
    }
    G.paths = { rectD: rectD, polyD: polyD };

    /* the region: its shape as drawn (ball, polygon) or the outline of its points (rectangles) */
    G.drawRegion = function (rg, m) {
        var fill, line;
        if (!rg) { fill = line = ''; }
        else if (rg.kind === 'ball') fill = line = ballD(rg);
        else if (rg.kind === 'poly') fill = line = polyD(rg.pts, true);
        else { fill = rectsD(rg.boxes.map(function (b) { return { x0: b.x0, y0: b.y0, x1: Math.min(N - 1, b.x1), y1: Math.min(N - 1, b.y1) }; })); line = maskOutlineD(m); }
        L.regionFill.setAttribute('d', fill);
        L.outlinePath.setAttribute('d', line);
    };

    /* the Partitioner's stages, all drawn at once and then shown one after the other */
    G.drawPartition = function (p) {
        var b = p.box, r = p.r;
        if (!b) { ['boxPath', 'gridPath', 'cellsPath', 'runsPath', 'resPath'].forEach(function (k) { L[k].setAttribute('d', ''); });
            L.rectsPaths.forEach(function (path) { path.setAttribute('d', ''); });
            return;
        }
        L.boxPath.setAttribute('d', rectD(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1));
        var g = [], w = p.cols * r, h = p.rows * r, i;
        for (i = 0; i <= p.cols; i++) g.push('M' + (b.x0 + i * r) + ' ' + b.y0 + 'v' + h);
        for (i = 0; i <= p.rows; i++) g.push('M' + b.x0 + ' ' + (b.y0 + i * r) + 'h' + w);
        L.gridPath.setAttribute('d', g.join(''));
        L.cellsPath.setAttribute('d', p.cells.map(function (c) { return rectD(c.x, c.y, r, r); }).join(''));
        L.runsPath.setAttribute('d', rectsD(p.runs));
        /* three tones, so that neighbouring rectangles can be told apart */
        L.rectsPaths.forEach(function (path, t) {
            path.setAttribute('d', rectsD(p.rects.filter(function (h, i) { return i % 3 === t; })));
        });
        L.resPath.setAttribute('d', dotsD(p.res, 0.36));
    };

    /* what holds Bob: one rectangle or one residual point, lit */
    G.drawLit = function (p, hit, bob) {
        L.litPath.setAttribute('d', hit && hit.rect !== undefined ? rectsD([p.rects[hit.rect]]) : '');
        L.litResPath.setAttribute('d', hit && hit.res ? dotsD([bob.y * N + bob.x], 0.5) : '');
    };
    G.drawBob = function (bob) {
        L.bobG.setAttribute('transform', 'translate(' + (bob.x + 0.5) + ' ' + (bob.y + 0.5 - 6.5) + ')');
        L.bob.lastChild.setAttribute('x', bob.x);
        L.bob.lastChild.setAttribute('y', bob.y);
    };
    /* a region being drawn: its outline so far and the corners placed */
    G.drawDraft = function (d, dots) {
        L.draftPath.setAttribute('d', d || '');
        L.draftDots.setAttribute('d', (dots || []).map(function (p) {
            return 'M' + (p[0] - 0.8) + ' ' + p[1] + 'a.8 .8 0 1 0 1.6 0a.8 .8 0 1 0-1.6 0';
        }).join(''));
    };
    G.ballD = ballD;
})(GFM);
