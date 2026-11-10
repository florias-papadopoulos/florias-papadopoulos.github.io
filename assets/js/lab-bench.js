/* The lab bench on the lab's home page (layouts/_default/lab.html): whatever is typed or pasted in the box is shown to
   the Toolbox's recogniser (window.ToolboxGuess, assets/js/calc/index.js, bundled before this file), and the tools it
   suggests appear as links that open them already filled in (inputs after the #, never sent to a server). Text it does
   not recognise becomes a search of the Toolbox. Nothing leaves the browser. */
(function () {
    'use strict';
    var box = document.getElementById('lab-paste'), out = document.getElementById('lab-guess');
    if (!box || !out || !window.ToolboxGuess) return;
    var base = box.getAttribute('data-toolbox');
    function enc(o) {
        return Object.keys(o).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&');
    }
    function link(href, title, note) {
        var a = document.createElement('a');
        a.className = 'lab-guess-link';
        a.href = href;
        var b = document.createElement('b'); b.textContent = title; a.appendChild(b);
        if (note) { var s = document.createElement('span'); s.textContent = note; a.appendChild(s); }
        return a;
    }
    function show() {
        var v = box.value.trim();
        out.textContent = '';
        if (!v) { out.hidden = true; return; }
        var g = null;
        try { g = window.ToolboxGuess.guess(v); } catch (e) { g = null; }
        var what = document.createElement('p');
        what.className = 'lab-guess-what';
        what.textContent = g ? g.what : 'Search the Toolbox';
        out.appendChild(what);
        var list = document.createElement('div');
        list.className = 'lab-guess-list';
        if (g) g.tools.forEach(function (t) {
            var q = enc(t[2] || {});
            list.appendChild(link(base + t[0] + '/' + (q ? '#' + q : ''), t[1]));
        });
        list.appendChild(link(base + '#q=' + encodeURIComponent(v), g ? 'Other tools' : 'Find tools for "' + (v.length > 30 ? v.slice(0, 30) + '...' : v) + '"'));
        out.appendChild(list);
        out.hidden = false;
    }
    var t = null;
    box.addEventListener('input', function () { clearTimeout(t); t = setTimeout(show, 150); });
    box.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            show();
            var first = out.querySelector('a');
            if (first) location.href = first.href;
        }
    });
})();
