/* The home page's "Work" strip (layouts/partials/index_profile.html): the filter chips show one group of projects
   (Papers, Bachelor, Master) or all of them, and the arrow scrolls the strip by about one screen width; the arrow
   hides at the end of the strip. Without JavaScript the strip still scrolls sideways with every project in it. */
(function () {
    'use strict';
    var strip = document.getElementById('hw-strip'), next = document.getElementById('hw-next');
    if (!strip) return;
    var chips = Array.prototype.slice.call(document.querySelectorAll('.hw-chip'));
    var tiles = Array.prototype.slice.call(strip.querySelectorAll('.hw-tile'));
    function atEnd() { return strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4; }
    function arrow() { if (next) next.hidden = atEnd(); }
    chips.forEach(function (c) {
        c.addEventListener('click', function () {
            var g = c.getAttribute('data-g');
            chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
            tiles.forEach(function (t) { t.hidden = !!g && t.getAttribute('data-g') !== g; });
            strip.scrollLeft = 0;
            arrow();
        });
    });
    if (next) next.addEventListener('click', function () {
        strip.scrollBy({ left: Math.max(200, strip.clientWidth * 0.8), behavior: 'smooth' });
    });
    strip.addEventListener('scroll', arrow, { passive: true });
    window.addEventListener('resize', arrow);
    arrow();
})();
