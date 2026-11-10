/* Bachelor, Master and Papers tabs (layouts/_default/timeline.html): entries open and close in place, #anchor opens
   an entry and scrolls to it, the BibTeX of a paper opens with a button and can be copied. */
(function () {
    'use strict';
    var list = document.getElementById('tl');
    if (!list) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var DUR = 300;

    /* tells the cat (assets/js/lab/cat-pages.js) that the page moved under it */
    function changed() { window.dispatchEvent(new Event('tl-change')); }

    function isOpen(entry) { return entry.querySelector('.tl-toggle').getAttribute('aria-expanded') === 'true'; }

    /* opening animates the height from 0 (or from where a closing left it) to the content, closing the other way */
    function setOpen(entry, open, instant) {
        var btn = entry.querySelector('.tl-toggle'), more = entry.querySelector('.tl-more');
        if (isOpen(entry) === open && more.hidden === !open) return;
        var from = more.hidden ? 0 : more.getBoundingClientRect().height;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        entry.classList.toggle('open', open);
        clearTimeout(more._t);
        more.hidden = false;
        if (reduce || instant) {
            more.classList.remove('tl-anim');
            more.style.height = '';
            more.hidden = !open;
            changed();
            return;
        }
        more.classList.add('tl-anim');
        more.style.height = from + 'px';
        void more.offsetHeight;
        more.style.height = (open ? more.scrollHeight : 0) + 'px';
        more._t = setTimeout(function () {
            more.classList.remove('tl-anim');
            more.style.height = '';
            if (!open) more.hidden = true;
            changed();
            if (open) reveal(entry);
        }, DUR + 20);
    }

    /* an opened entry that runs past the bottom of the window scrolls up, but never past its own title */
    function reveal(entry) {
        var r = entry.getBoundingClientRect(), over = r.bottom - window.innerHeight + 16;
        if (over > 0) window.scrollBy({ top: Math.min(over, r.top - 16), behavior: reduce ? 'auto' : 'smooth' });
    }

    list.addEventListener('click', function (e) {
        var btn = e.target.closest('.tl-toggle');
        if (btn) { var entry = btn.closest('.tl-entry'); setOpen(entry, !isOpen(entry)); return; }
        var bib = e.target.closest('.tl-bib-btn');
        if (bib) {
            var box = document.getElementById(bib.getAttribute('aria-controls')), on = bib.getAttribute('aria-expanded') !== 'true';
            bib.setAttribute('aria-expanded', on ? 'true' : 'false');
            box.hidden = !on;
            changed();
            return;
        }
        var copy = e.target.closest('.tl-copy');
        if (copy) copyBib(copy.closest('.tl-bib'));
    });

    function copyBib(box) {
        var text = box.querySelector('pre').textContent, note = box.querySelector('.tl-copied'), btn = box.querySelector('.tl-copy');
        function done(ok) {
            btn.textContent = ok ? 'Copied' : 'Select and copy';
            note.textContent = ok ? 'BibTeX copied to the clipboard' : '';
            clearTimeout(btn._t);
            btn._t = setTimeout(function () { btn.textContent = 'Copy'; note.textContent = ''; }, 2000);
        }
        function fallback() {
            var range = document.createRange(), sel = window.getSelection();
            range.selectNodeContents(box.querySelector('pre'));
            sel.removeAllRanges();
            sel.addRange(range);
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
            if (ok) sel.removeAllRanges();
            done(ok);
        }
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
        else fallback();
    }

    /* #anchor: open that entry and bring it into view */
    function fromHash(scroll, smooth) {
        var id = '';
        try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
        var entry = id && document.getElementById(id);
        if (!entry || !entry.classList.contains('tl-entry')) return;
        setOpen(entry, true, true);
        if (scroll) entry.scrollIntoView({ block: 'start', behavior: smooth && !reduce ? 'smooth' : 'auto' });
    }
    window.addEventListener('hashchange', function () { fromHash(true, true); });
    fromHash(false);
    /* after pictures and maths have their size, the entry is where the browser scrolled to before */
    if (location.hash) {
        if (document.readyState === 'complete') fromHash(true);
        else window.addEventListener('load', function () { setTimeout(function () { fromHash(true); }, 50); });
    }
})();
