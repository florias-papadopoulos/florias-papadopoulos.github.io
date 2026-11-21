/* The "Try it" boxes under the players (.sc-try[data-try], filled by 90-boot.js). A story registers its box with
   SC.tryBox(id, function (box, U) { ... }); box is the empty .sc-try element, U the small helpers below. */
(function () {
    'use strict';
    var boxes = {};
    /* an element: h('p', 'cls', 'html', parent) or h('input', 'cls', { attrs }, parent) */
    function h(tag, cls, x, parent) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (typeof x === 'string') n.innerHTML = x;
        else if (x) for (var k in x) n.setAttribute(k, x[k]);
        if (parent) parent.appendChild(n);
        return n;
    }
    /* a coloured square; sw.set(colour) */
    function swatch(parent, colour, cls) {
        var n = h('span', 'sc-sw' + (cls ? ' ' + cls : ''), null, parent);
        n.set = function (c) { n.style.background = c; };
        n.set(colour);
        return n;
    }
    /* a fingerprint as a row of blocks; row.set(colours) */
    function blocks(parent, n, cls) {
        var row = h('span', 'sc-blocks' + (cls ? ' ' + cls : ''), null, parent), bs = [];
        for (var i = 0; i < (n || 6); i++) bs.push(h('span', '', null, row));
        row.set = function (cs) { cs.forEach(function (c, i) { if (bs[i]) bs[i].style.background = c; }); };
        return row;
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    /* a number with thin gaps between groups of three digits */
    function big(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
    SC.tryU = { h: h, swatch: swatch, blocks: blocks, esc: esc, big: big };
    SC.tryBox = function (id, fill) { boxes[id] = fill; };
    SC.fillTry = function (box) {
        var fill = boxes[box.dataset.try];
        if (!fill) return;
        h('h3', '', 'Try it', box);
        fill(box, SC.tryU);
        box.hidden = false;
    };
})();
