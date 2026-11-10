/* The light switch (the corner button #theme-btn, layouts/_default/baseof.html): light or dark, whatever the browser says.
   Loaded in the head right after the page's <style>, without defer, so the chosen look is there before the first paint.

   The dark styles are written as @media (prefers-color-scheme: dark) blocks (palette: assets/css/common/color-scheme.css).
   A choice made with the switch rewrites the condition of those blocks: always true for dark, never true for light; with
   no choice they follow the browser as written. The choice is kept in this browser (localStorage "theme") and is
   forgotten again when it matches the browser's own setting, so the site goes back to following the browser.
   html[data-theme] always says which look is showing (the switch's rocker uses it). */
(function () {
    'use strict';
    var root = document.documentElement, KEY = 'theme', mem = null;
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    var FEATURE = /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g;
    var rules = [];                 /* [rule, its condition as written] for every dark block */
    function collect(list) {
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            if (r.media && r.media.mediaText && /prefers-color-scheme/.test(r.media.mediaText)) rules.push([r, r.media.mediaText]);
            if (r.cssRules) collect(r.cssRules);
        }
    }
    for (var s = 0; s < document.styleSheets.length; s++) {
        try { collect(document.styleSheets[s].cssRules); } catch (e) { /* a sheet from elsewhere: not ours */ }
    }
    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return mem; }
    }
    function store(v) {
        mem = v;
        try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* kept for this page only */ }
    }
    function system() { return mq && mq.matches ? 'dark' : 'light'; }
    function apply() {
        var want = stored();
        if (want !== 'dark' && want !== 'light') want = null;
        rules.forEach(function (x) {
            var t = want ? x[1].replace(FEATURE, want === 'dark' ? '(min-width: 0px)' : '(max-width: -1px)') : x[1];
            if (x[0].media.mediaText !== t) x[0].media.mediaText = t;
        });
        root.style.colorScheme = want || '';
        var now = want || system();
        root.setAttribute('data-theme', now);
        var b = document.getElementById('theme-btn');
        if (b) {
            var label = now === 'dark' ? 'Lights on: light mode' : 'Lights off: dark mode';
            b.setAttribute('aria-pressed', now === 'dark' ? 'true' : 'false');
            b.title = label;
        }
    }
    apply();
    if (mq && mq.addEventListener) mq.addEventListener('change', apply);
    window.addEventListener('storage', function (e) { if (e.key === KEY) apply(); });     /* other tabs of the site */
    function bind() {
        var b = document.getElementById('theme-btn');
        if (!b) return;
        b.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            store(next === system() ? null : next);
            apply();
        });
        apply();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
}());
