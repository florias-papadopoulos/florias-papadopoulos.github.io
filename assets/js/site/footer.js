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
            /* only links to something on this page (the email links become mailto: below) */
            var href = this.getAttribute("href") || "", id = href.substr(1), to = null;
            if (href.charAt(0) !== "#") return;
            try { to = document.querySelector(`[id='${decodeURIComponent(id)}']`); } catch (err) { /* not a valid id */ }
            if (!to) return;
            e.preventDefault();
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                to.scrollIntoView({
                    behavior: "smooth"
                });
            } else {
                to.scrollIntoView();
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
   robots that collect addresses find nothing; here the link (and, with data-show, its text) is put together.
   The email icon opens a small box with the address, Copy and "Write an email" instead of going straight to mailto:,
   which does nothing on a device without a mail app. */
(function () {
    var pop = null;
    function close() {
        if (!pop) return;
        pop.remove(); pop = null;
        document.removeEventListener('click', outside, true);
        document.removeEventListener('keydown', esc);
    }
    function outside(e) { if (pop && !pop.contains(e.target)) close(); }
    function esc(e) { if (e.key === 'Escape') close(); }
    function open(a, m) {
        pop = document.createElement('div');
        pop.className = 'mail-pop';
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-label', 'Email address');
        var addr = document.createElement('span'), row = document.createElement('span'), copy = document.createElement('button'), write = document.createElement('a');
        addr.className = 'mail-pop-addr'; addr.textContent = m;
        row.className = 'mail-pop-row';
        copy.type = 'button'; copy.textContent = 'Copy';
        copy.addEventListener('click', function () {
            var done = function () { copy.textContent = 'Copied'; };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m).then(done, function () { pick(addr); });
            else pick(addr);
        });
        write.href = 'mailto:' + m; write.textContent = 'Write an email';
        row.appendChild(copy); row.appendChild(write);
        pop.appendChild(addr); pop.appendChild(row);
        document.body.appendChild(pop);
        /* under the icon, or above it when there is no room below; never past the sides */
        var r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
        var left = Math.max(8, Math.min(document.documentElement.clientWidth - w - 8, r.left + r.width / 2 - w / 2));
        var top = r.bottom + 8 + h > window.innerHeight ? r.top - h - 8 : r.bottom + 8;
        pop.style.left = (left + window.pageXOffset) + 'px';
        pop.style.top = (top + window.pageYOffset) + 'px';
        copy.focus();
        setTimeout(function () { document.addEventListener('click', outside, true); document.addEventListener('keydown', esc); }, 0);
    }
    function pick(el) {   /* no clipboard access: select the address so it can be copied by hand */
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-u][data-d]'), function (a) {
        var back = function (s) { return s.split('').reverse().join(''); }, m = back(a.getAttribute('data-u')) + '@' + back(a.getAttribute('data-d'));
        if (a.tagName === 'A') a.href = 'mailto:' + m;
        if (a.hasAttribute('data-show')) { a.textContent = m; return; }
        a.addEventListener('click', function (e) {
            e.preventDefault();
            if (pop) close(); else open(a, m);
        });
    });
})();
