/* The lab bench on the lab's home page (layouts/_default/lab.html): whatever is typed or pasted in the box is shown to
   the Toolbox's recogniser (window.ToolboxGuess, assets/js/calc/index.js, bundled before this file), and the tools it
   suggests appear as links that open them already filled in (inputs after the #, never sent to a server). Text it does
   not recognise becomes a search of the Toolbox. Enter opens the first suggestion right here, under the box: the
   tool's own page (/toolbox/<id>/) is fetched from this site, its form, result, procedure and explanation are put in
   place of the suggestions and the most used tools, and its scripts (the shared engine, the tool, KaTeX for the
   formulas) are loaded once; the inputs go after the # of this page, where the tool reads them. Nothing leaves the
   browser. */
(function () {
    'use strict';
    var box = document.getElementById('lab-paste'), out = document.getElementById('lab-guess');
    var runBox = document.getElementById('lab-run'), more = document.getElementById('lab-more');
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
            var a = link(base + t[0] + '/' + (q ? '#' + q : ''), t[1]);
            a.addEventListener('click', function (ev) {
                if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button) return;   /* a new tab: the tool's own page */
                ev.preventDefault();
                run(t[0], t[2], t[1]);
            });
            list.appendChild(a);
        });
        list.appendChild(link(base + '#q=' + encodeURIComponent(v), g ? 'Other tools' : 'Find tools for "' + (v.length > 30 ? v.slice(0, 30) + '...' : v) + '"'));
        out.appendChild(list);
        out.hidden = false;
    }
    var t = null;
    box.addEventListener('input', function () { clearTimeout(t); t = setTimeout(show, 150); });
    /* ---------- a tool, opened under the box ---------- */
    function loadScript(src, integrity) {
        return new Promise(function (ok, bad) {
            var e = document.createElement('script');
            e.src = src;
            if (integrity) e.integrity = integrity;
            e.onload = ok;
            e.onerror = bad;
            document.body.appendChild(e);
        });
    }
    function has(sel, attr, val) {
        return Array.prototype.some.call(document.querySelectorAll(sel), function (e) { return e.getAttribute(attr) === val; });
    }
    function clearRun() {
        runBox.textContent = '';
        runBox.hidden = true;
        if (more) more.hidden = false;
        try { history.replaceState(null, '', location.pathname); } catch (e) { /* old browsers */ }
    }
    var running = false;
    function run(id, params, title) {
        if (running || !runBox) return;
        running = true;
        var page = base + id + '/', q = enc(params || {});
        fetch(page, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) throw new Error(r.status);
            return r.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var tool = doc.getElementById('tb-tool');
            if (!tool) throw new Error('no tool');
            /* not needed here: the way back to the Toolbox, the title (in the bar instead), the no-JavaScript notice */
            Array.prototype.forEach.call(tool.querySelectorAll('.tb-crumbs, .tl-h1, noscript'), function (x) { x.remove(); });
            /* the inputs, where the tool reads them (and keeps them) */
            try { history.replaceState(null, '', location.pathname + (q ? '#' + q : '')); } catch (e) { /* old browsers */ }
            runBox.textContent = '';
            var bar = document.createElement('div');
            bar.className = 'lab-run-bar';
            var h = document.createElement('h2'); h.textContent = title || doc.title.split(' | ')[0]; bar.appendChild(h);
            var right = document.createElement('span');
            var full = document.createElement('a'); full.href = page + (q ? '#' + q : ''); full.textContent = 'Full page';
            var x = document.createElement('button'); x.type = 'button'; x.textContent = 'Close';
            x.addEventListener('click', function () { clearRun(); box.focus(); });
            right.appendChild(full); right.appendChild(document.createTextNode('  ·  ')); right.appendChild(x);
            bar.appendChild(right);
            runBox.appendChild(bar);
            runBox.appendChild(document.importNode(tool, true));
            out.hidden = true;
            if (more) more.hidden = true;
            runBox.hidden = false;
            /* KaTeX's stylesheet, then the page's scripts in their order, each only once */
            Array.prototype.forEach.call(doc.querySelectorAll('link[rel~="stylesheet"]'), function (l) {
                var href = l.getAttribute('href');
                if (href && !has('link[rel~="stylesheet"]', 'href', href)) {
                    var n = document.createElement('link'); n.rel = 'stylesheet'; n.href = href;
                    if (l.integrity) n.integrity = l.integrity;
                    if (l.crossOrigin) n.crossOrigin = l.crossOrigin;
                    document.head.appendChild(n);
                }
            });
            var scripts = Array.prototype.filter.call(doc.querySelectorAll('script[src]'), function (e) {
                var src = e.getAttribute('src');
                return /\/js\/calc\/|katex|math-render/.test(src);
            });
            var fresh = false, chain = Promise.resolve();
            scripts.forEach(function (e) {
                var src = e.getAttribute('src');
                if (has('script[src]', 'src', src)) return;
                if (/\/js\/calc\/[^\/]*\.bundle/.test(src)) fresh = true;
                chain = chain.then(function () { return loadScript(src, e.getAttribute('integrity')); });
            });
            return chain.then(function () {
                /* a tool opened before: its script ran already, so build its form again here */
                if (!fresh && window.Calc && window.Calc.mount) window.Calc.mount();
                if (window.renderMathInElement) {
                    try { window.renderMathInElement(runBox, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) { /* plain text stays */ }
                }
            });
        }).catch(function () {
            location.href = page + (q ? '#' + q : '');      /* anything odd: the tool's own page */
        }).then(function () { running = false; });
    }

    box.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            var v = box.value.trim();
            if (!v) return;
            var g = null;
            try { g = window.ToolboxGuess.guess(v); } catch (err) { g = null; }
            if (g && g.tools.length) run(g.tools[0][0], g.tools[0][2], g.tools[0][1]);
            else location.href = base + '#q=' + encodeURIComponent(v);
        }
    });
    box.addEventListener('input', function () { if (!runBox.hidden) clearRun(); });
})();
