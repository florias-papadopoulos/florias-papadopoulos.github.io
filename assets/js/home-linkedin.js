/* The LinkedIn posts on the home page (markup: layouts/partials/linkedin.html, styles: assets/css/common/linkedin.css).
   On wide desktops the card sits in the right margin: its width is measured here, without the scrollbar.
   With two posts or more, one is shown at a time: arrows, dots, a swipe on touch screens (or a mouse drag) and the
   arrow keys while the carousel has focus move between them, wrapping around at the ends. */
(function () {
    'use strict';
    var box = document.getElementById('linkedin');
    if (!box) return;

    function fit() {
        box.style.removeProperty('--li-free');
        if (getComputedStyle(box).position !== 'absolute' || !box.offsetParent) return;
        var right = box.offsetParent.getBoundingClientRect().right;
        box.style.setProperty('--li-free', Math.max(0, document.documentElement.clientWidth - right) + 'px');
    }
    fit();
    window.addEventListener('resize', fit);

    var track = box.querySelector('.li-track');
    var view = box.querySelector('.li-viewport');
    var slides = box.querySelectorAll('.li-slide');
    var dots = box.querySelectorAll('.li-dot');
    var status = box.querySelector('.li-sr');
    var n = slides.length, cur = 0;
    if (n < 2) return;

    function show(i, announce) {
        cur = (i + n) % n;
        track.style.transform = 'translateX(' + (-100 * cur) + '%)';
        Array.prototype.forEach.call(slides, function (s, k) {
            var on = k === cur;
            s.classList.toggle('is-active', on);
            if (on) { s.removeAttribute('aria-hidden'); s.inert = false; }
            else { s.setAttribute('aria-hidden', 'true'); s.inert = true; }
        });
        Array.prototype.forEach.call(dots, function (d, k) {
            if (k === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
        });
        /* the next picture loads before it is needed */
        var img = slides[(cur + 1) % n].querySelector('img[loading="lazy"]');
        if (img) img.loading = 'eager';
        if (announce && status) status.textContent = 'Post ' + (cur + 1) + ' of ' + n;
    }

    box.querySelector('.li-prev').addEventListener('click', function () { show(cur - 1, true); });
    box.querySelector('.li-next').addEventListener('click', function () { show(cur + 1, true); });
    Array.prototype.forEach.call(dots, function (d, k) { d.addEventListener('click', function () { show(k, true); }); });

    box.addEventListener('keydown', function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        var to = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: n - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        show(to, true);
        /* keep the focus on a dot when it was on one, so the arrows keep working from there */
        if (document.activeElement && document.activeElement.classList.contains('li-dot')) dots[cur].focus();
    });

    /* swipe: the post follows the finger, and goes to the next one past a fifth of the width (or a quick flick) */
    var start = null, dx = 0, moved = false;
    view.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
        dx = 0; moved = false;
    });
    view.addEventListener('pointermove', function (e) {
        if (!start || e.pointerId !== start.id) return;
        var mx = e.clientX - start.x, my = e.clientY - start.y;
        if (!moved) {
            if (Math.abs(mx) < 8 || Math.abs(mx) < Math.abs(my)) return;
            moved = true;
            box.classList.add('dragging');
            try { view.setPointerCapture(e.pointerId); } catch (err) { /* the swipe still works without */ }
        }
        dx = mx;
        track.style.transform = 'translateX(calc(' + (-100 * cur) + '% + ' + dx + 'px))';
    });
    function end(e) {
        if (!start || e.pointerId !== start.id) return;
        var w = view.clientWidth || 1, fast = Math.abs(dx) > 30 && performance.now() - start.t < 300;
        box.classList.remove('dragging');
        start = null;
        if (!moved) return;
        if (Math.abs(dx) > w / 5 || fast) show(cur + (dx < 0 ? 1 : -1), true);
        else show(cur, false);
    }
    view.addEventListener('dragstart', function (e) { e.preventDefault(); });
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    /* a swipe that started on the picture or a link does not also open the post */
    view.addEventListener('click', function (e) {
        if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
})();
