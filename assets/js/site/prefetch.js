/* Pages before the click: when a pointer rests on a link to another page of this site (65 ms), or a finger touches
   it, the page is fetched quietly, so that the click opens it from the browser's cache (GitHub Pages lets browsers
   keep pages for 10 minutes). Only this site's own pages (no files like the CV, no #jumps on the same page, no links
   opening a new tab); each page once; nothing when the visitor asked to save data. Bundled with footer.js
   (layouts/partials/footer.html). */
(function () {
    'use strict';
    var c = navigator.connection;
    if (!window.fetch || (c && (c.saveData || /2g/.test(c.effectiveType || '')))) return;
    var done = {}, timer = null;
    function target(e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin) return null;
        if (a.pathname === location.pathname && a.search === location.search) return null;   /* a jump on this page */
        if (/\.[a-z0-9]{2,5}$/i.test(a.pathname) && !/\.html$/i.test(a.pathname)) return null; /* a file */
        return a.origin + a.pathname + a.search;
    }
    function get(url) {
        if (!url || done[url]) return;
        done[url] = true;
        fetch(url, { credentials: 'same-origin', priority: 'low' }).catch(function () { delete done[url]; });
    }
    document.addEventListener('mouseover', function (e) {
        var url = target(e);
        clearTimeout(timer);
        if (url) timer = setTimeout(function () { get(url); }, 65);
    }, { passive: true });
    document.addEventListener('touchstart', function (e) { get(target(e)); }, { passive: true });
    document.addEventListener('focusin', function (e) { get(target(e)); });
})();
