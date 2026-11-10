/* The two pickers next to the paw in the top right corner, the cat looks and the dogs (layouts/_default/baseof.html,
   styles in assets/css/common/paw.css): the choice goes to localStorage "cat-look", read early by
   assets/js/lab/cat-look.js. A dog also sets data-pet="dog" (warm site colours, the games draw a dog). On the games page,
   switching between a cat and a dog reloads the page, since the games read the look when they start. */
(function () {
    var root = document.documentElement;
    ['cat-picker', 'dog-picker'].forEach(function (id) {
        var picker = document.getElementById(id);
        if (!picker) return;
        var btn = picker.querySelector('.cat-pick'), menu = picker.querySelector('.cat-menu');
        function mark() {
            var cur = root.dataset.cat || 'calico';
            Array.prototype.forEach.call(menu.querySelectorAll('.cat-opt'), function (o) { o.setAttribute('aria-checked', o.dataset.look === cur); });
        }
        function open(on) { menu.hidden = !on; btn.setAttribute('aria-expanded', on); if (on) mark(); }
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var other = document.querySelector('.cat-picker:not(#' + id + ') .cat-menu');
            if (other) other.hidden = true;
            open(menu.hidden);
        });
        menu.addEventListener('click', function (e) {
            var o = e.target.closest('.cat-opt');
            if (!o) return;
            var look = o.dataset.look, dog = look.indexOf('dog-') === 0, wasDog = root.dataset.pet === 'dog';
            root.dataset.cat = look;
            if (dog) root.dataset.pet = 'dog'; else delete root.dataset.pet;
            try { localStorage.setItem('cat-look', look); } catch (err) {}
            mark();
            /* cat to dog or back: the page's pet and the games were drawn for the other one */
            if (dog !== wasDog && document.querySelector('.arcade')) setTimeout(function () { location.reload(); }, 250);
            else setTimeout(function () { open(false); }, 250);
        });
        document.addEventListener('click', function (e) { if (!picker.contains(e.target)) open(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
    });
})();
