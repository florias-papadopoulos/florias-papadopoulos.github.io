/* The Toolbox tab (layouts/toolbox/list.html): filter the tools as you type. Every word must appear in the tool's
   title, description or keywords (accents ignored). */
(function () {
    'use strict';
    var box = document.getElementById('tb-search');
    if (!box) return;
    var tools = Array.prototype.slice.call(document.querySelectorAll('.tb-tool'));
    var cats = Array.prototype.slice.call(document.querySelectorAll('.tb-cat'));
    var none = document.getElementById('tb-nores');
    function flat(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    tools.forEach(function (t) { t._q = flat(t.getAttribute('data-q') || ''); });
    function apply() {
        var words = flat(box.value).split(/\s+/).filter(Boolean), shown = 0;
        tools.forEach(function (t) {
            var on = words.every(function (w) { return t._q.indexOf(w) >= 0; });
            t.hidden = !on;
            if (on) shown++;
        });
        cats.forEach(function (c) { c.hidden = !c.querySelector('.tb-tool:not([hidden])'); });
        none.hidden = shown > 0;
    }
    box.addEventListener('input', apply);
    if (box.value) apply();
})();
