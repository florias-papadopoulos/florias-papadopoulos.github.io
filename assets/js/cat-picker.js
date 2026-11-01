/* The cat picker next to the paw in the top right corner (layouts/_default/baseof.html, styles in
   assets/css/common/paw.css): the choice goes to localStorage "cat-look", read early by assets/js/cat-look.js. */
(function () {
    var picker = document.getElementById('cat-picker');
    if (!picker) return;
    var btn = picker.querySelector('.cat-pick'), menu = picker.querySelector('.cat-menu');
    function mark() {
        var cur = document.documentElement.dataset.cat || 'ginger';
        Array.prototype.forEach.call(menu.querySelectorAll('.cat-opt'), function (o) { o.setAttribute('aria-checked', o.dataset.look === cur); });
    }
    function open(on) { menu.hidden = !on; btn.setAttribute('aria-expanded', on); if (on) mark(); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(menu.hidden); });
    menu.addEventListener('click', function (e) {
        var o = e.target.closest('.cat-opt');
        if (!o) return;
        document.documentElement.dataset.cat = o.dataset.look;
        try { localStorage.setItem('cat-look', o.dataset.look); } catch (err) {}
        mark();
        setTimeout(function () { open(false); }, 250);
    });
    document.addEventListener('click', function (e) { if (!picker.contains(e.target)) open(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
})();
