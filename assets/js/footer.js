/* From the theme's footer (themes/PaperMod/layouts/partials/footer.html), moved out of the page for the
   Content-Security-Policy: keep the menu's scroll position, scroll smoothly to #anchors. Also the email links. */
(function () {
    var menu = document.getElementById('menu');
    if (menu) {
        menu.scrollLeft = localStorage.getItem("menu-scroll-position");
        menu.onscroll = function () {
            localStorage.setItem("menu-scroll-position", menu.scrollLeft);
        }
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            var id = this.getAttribute("href").substr(1);
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                document.querySelector(`[id='${decodeURIComponent(id)}']`).scrollIntoView({
                    behavior: "smooth"
                });
            } else {
                document.querySelector(`[id='${decodeURIComponent(id)}']`).scrollIntoView();
            }
            if (id === "top") {
                history.replaceState(null, null, " ");
            } else {
                history.pushState(null, null, `#${id}`);
            }
        });
    });
})();

/* Email links: a page holds the address only as two reversed halves (data-u, data-d, from params.contactMail), so
   robots that collect addresses find nothing; here the link (and, with data-show, its text) is put together. */
(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-u][data-d]'), function (a) {
        var back = function (s) { return s.split('').reverse().join(''); }, m = back(a.getAttribute('data-u')) + '@' + back(a.getAttribute('data-d'));
        if (a.tagName === 'A') a.href = 'mailto:' + m;
        if (a.hasAttribute('data-show')) a.textContent = m;
    });
})();
