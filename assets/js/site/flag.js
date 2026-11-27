/* The flag in the top right corner (baseof.html): the door to the Switzerland page. Its live maps come from swisstopo,
   so the first time it asks (layouts/partials/switzerland/consent.html); "Remember my choice in this browser" keeps the
   yes in localStorage 'ch-maps-ok', otherwise the yes holds for this tab only (sessionStorage), which map.js reads.
   Bundled after play.js. */
(function () {
    'use strict';
    var flag = document.querySelector('.flag-btn'), box = document.getElementById('ch-flag-consent');
    if (!flag || !box || flag.getAttribute('aria-current') === 'page') return;
    var back = box.parentNode;
    function ok() {
        try { return localStorage.getItem('ch-maps-ok') === '1'; } catch (e) { return false; }
    }
    function close() {
        back.hidden = true;
        document.removeEventListener('keydown', onKey);
        flag.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    flag.addEventListener('click', function (e) {
        if (ok()) return;
        e.preventDefault();
        back.hidden = false;
        document.addEventListener('keydown', onKey);
        box.querySelector('.ch-consent-yes').focus();
    });
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    box.querySelector('.ch-consent-no').addEventListener('click', close);
    box.querySelector('.ch-consent-yes').addEventListener('click', function () {
        try {
            if (box.querySelector('.ch-consent-remember').checked) localStorage.setItem('ch-maps-ok', '1');
            sessionStorage.setItem('ch-maps-ok', '1');
        } catch (e) { /* no storage: the page asks once more */ }
        location.href = flag.href;
    });
})();
