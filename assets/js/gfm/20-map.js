/* The map of /phd/gfm/: St. Gallen's old town from OpenStreetMap, rendered once into
   static/img/phd/gfm-stgallen.webp (never fetched live): 16 standard tiles at zoom 17 (x 68948 to 68951,
   y 45872 to 45875), cropped at pixel (290, 170) of that mosaic to 640 x 640, desaturated and lightened.
   The 128 x 128 lattice lies on it with 5 pixels per unit, one unit about 4.04 m (0.808 m per pixel at
   47.42 degrees north). The ready regions follow real places: the Kantonsschulpark (a polygon), the cathedral
   (Stiftskirche, a polygon) and 100 m around St. Laurenzen (a ball). Map data (c) OpenStreetMap contributors. */
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
    G.METRES = 4.04;            /* metres per lattice unit */

    var PARK = [[70, 17], [116, 17], [116, 23], [104, 33], [93, 44], [88, 41], [80, 31], [73, 22]];
    var CHURCH = [[29, 100.75], [41, 97.5], [44.5, 96.5], [53.25, 94.5], [54, 94], [55.5, 96.5], [56, 100], [56, 103.5],
        [52.5, 105.25], [41.25, 107.75], [31.5, 110], [29, 106]];
    var LAURENZEN = { x: 48, y: 68 };
    G.presets = {
        park: function () { return { kind: 'poly', pts: PARK.map(function (p) { return p.slice(); }) }; },
        church: function () { return { kind: 'poly', pts: CHURCH.map(function (p) { return p.slice(); }) }; },
        near: function () { return { kind: 'ball', cx: LAURENZEN.x, cy: LAURENZEN.y, R: 25, p: 2 }; }
    };
    G.presetName = { park: 'the Kantonsschulpark', church: 'the cathedral', near: '100 m around St. Laurenzen' };
    /* where Bob stands when a ready region is chosen */
    G.bobAt = { park: { x: 97, y: 25 }, church: { x: 43, y: 102 }, near: { x: 62, y: 78 } };
    G.bobStart = G.bobAt.park;

    /* the base map (its address from the svg's data-map) and a 100 m scale bar in the lower left corner */
    G.drawTown = function (g, src) {
        el('rect', { x: 0, y: 0, width: 128, height: 128, 'class': 'gm-ground' }, g);
        if (src) el('image', { href: src, x: 0, y: 0, width: 128, height: 128, preserveAspectRatio: 'none', 'class': 'gm-base' }, g);
    };
    G.drawLabels = function (g) {
        var w = 100 / G.METRES, x = 3.5, y = 124.5;
        el('rect', { x: x - 1.2, y: y - 4.4, width: w + 2.4, height: 5.6, rx: 0.6, 'class': 'gm-scale-bg' }, g);
        el('path', { d: 'M' + x + ' ' + (y - 1) + 'V' + y + 'H' + (x + w) + 'V' + (y - 1), 'class': 'gm-scale' }, g);
        var s = el('text', { x: x + w / 2, y: y - 1.4, 'class': 'gm-scale-t' }, g);
        s.textContent = '100 m';
    };
})(GFM);
