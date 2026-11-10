/* The CV page (layouts/_default/cv.html): each .cv-ln is one line of the PDF, kept on one line on screens wide enough
   for the PDF's layout (cv.css sets white-space: nowrap there). TeX fits a line that is slightly too long by narrowing
   its spaces (by up to a third of a space); browsers cannot, so this does it: for every line wider than its column the
   spaces get a negative word-spacing, at most 0.11em, as much as the line needs. Run at once, again when the fonts are in
   and after a resize; on phones (lines wrap normally) it takes the spacing off again. */
(function () {
    'use strict';
    var lines = document.querySelectorAll('.cv-page .cv-ln');
    function fit() {
        for (var i = 0; i < lines.length; i++) {
            var el = lines[i];
            el.style.wordSpacing = '';
            if (getComputedStyle(el).whiteSpace !== 'nowrap') continue;
            var over = el.scrollWidth - el.clientWidth;
            if (over < 0.5) continue;
            var spaces = (el.textContent.trim().match(/ +/g) || []).length;
            if (!spaces) continue;
            var max = 0.11 * parseFloat(getComputedStyle(el).fontSize);
            el.style.wordSpacing = '-' + Math.min(max, (over + 0.5) / spaces).toFixed(3) + 'px';
        }
    }
    var t = 0;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 120); });
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
