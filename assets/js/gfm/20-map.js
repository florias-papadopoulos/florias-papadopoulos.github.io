/* The made-up town of /phd/gfm/ (128 x 128 drawing units, one unit = 4 m), drawn once into the map, and
   the three ready regions on it: the park (a polygon), the town hall (overlapping rectangles), the café (100 m). */
(function (G) {
    'use strict';
    var NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    G.el = el;

    var PARK = [[6, 7], [41, 4], [59, 17], [58, 50], [31, 56], [7, 45]];
    var HALL = [{ x0: 6, y0: 68, x1: 58, y1: 78 }, { x0: 6, y0: 76, x1: 20, y1: 99 }, { x0: 44, y0: 76, x1: 58, y1: 99 }, { x0: 19, y0: 84, x1: 45, y1: 93 }];
    var CAFE = { x: 98, y: 83 };
    G.presets = {
        park: function () { return { kind: 'poly', pts: PARK.map(function (p) { return p.slice(); }) }; },
        hall: function () { return { kind: 'boxes', boxes: HALL.map(function (b) { return { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }; }) }; },
        cafe: function () { return { kind: 'ball', cx: CAFE.x, cy: CAFE.y, R: 25, p: 2 }; }
    };
    /* where Bob stands when a ready region is chosen */
    G.bobAt = { park: { x: 30, y: 31 }, hall: { x: 13, y: 95 }, cafe: { x: 104, y: 96 } };
    G.bobStart = G.bobAt.park;

    /* x, y, width, height */
    var HOUSES = [
        [70, 4, 22, 16], [96, 4, 28, 12], [70, 24, 14, 32], [88, 24, 16, 14], [108, 20, 16, 18], [88, 42, 36, 14],
        [70, 66, 12, 12], [114, 66, 10, 14], [114, 92, 10, 12], [70, 96, 10, 8],
        [4, 120, 12, 6], [24, 121, 16, 5], [100, 121, 14, 5]
    ];
    var TREES = [[14, 14], [36, 10], [50, 22], [52, 42], [18, 40], [34, 48], [12, 28]];

    G.drawTown = function (g) {
        el('rect', { x: 0, y: 0, width: 128, height: 128, 'class': 'gm-ground' }, g);
        el('rect', { x: 46, y: 119, width: 46, height: 9, 'class': 'gm-field' }, g);
        /* streets */
        el('path', { d: 'M0 62H128M0 107H128M64 0V128', 'class': 'gm-street' }, g);
        /* the river and its bridge */
        el('path', { d: 'M-4 115C20 109 40 120 64 114S104 109 132 116', 'class': 'gm-river' }, g);
        el('path', { d: 'M64 108V122', 'class': 'gm-bridge' }, g);
        el('path', { d: 'M61.5 109V121M66.5 109V121', 'class': 'gm-rail' }, g);
        /* the park with its pond and trees */
        el('path', { d: 'M' + PARK.map(function (p) { return p.join(' '); }).join('L') + 'Z', 'class': 'gm-park' }, g);
        el('ellipse', { cx: 33, cy: 27, rx: 8, ry: 4.5, 'class': 'gm-pond' }, g);
        TREES.forEach(function (t) { el('circle', { cx: t[0], cy: t[1], r: 2.4, 'class': 'gm-tree' }, g); });
        HOUSES.forEach(function (h) { el('rect', { x: h[0], y: h[1], width: h[2], height: h[3], 'class': 'gm-house' }, g); });
        HALL.forEach(function (b) {
            el('rect', { x: b.x0, y: b.y0, width: b.x1 - b.x0 + 1, height: b.y1 - b.y0 + 1, 'class': 'gm-hall' }, g);
        });
        el('rect', { x: CAFE.x - 4.5, y: CAFE.y - 3, width: 10, height: 7, 'class': 'gm-cafe' }, g);
    };
    /* names and the scale, drawn above the region */
    G.drawLabels = function (g) {
        [['Park', 33, 37], ['Town hall', 32.5, 74.5], ['Café', 98.5, 78], ['River', 118, 120.5]].forEach(function (l) {
            var t = el('text', { x: l[1], y: l[2], 'class': 'gm-label' }, g);
            t.textContent = l[0];
        });
        el('path', { d: 'M4 124V125.5H29V124', 'class': 'gm-scale' }, g);
        var s = el('text', { x: 16.5, y: 122.8, 'class': 'gm-label gm-small' }, g);
        s.textContent = '100 m';
    };
})(GFM);
