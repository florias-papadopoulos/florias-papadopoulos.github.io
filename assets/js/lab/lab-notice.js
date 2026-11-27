/* The lab's home page (layouts/_default/lab.html): a small notice that the lab is still under development, shown
   once per tab (sessionStorage 'lab-notice'); OK, Escape or a click outside closes it. */
(function () {
    'use strict';
    var box = document.getElementById('lab-notice'), ok = document.getElementById('lab-notice-ok');
    if (!box || !ok) return;
    try { if (sessionStorage.getItem('lab-notice')) return; } catch (e) { /* no storage: show it */ }
    function close() {
        box.hidden = true;
        try { sessionStorage.setItem('lab-notice', '1'); } catch (e) { /* no storage */ }
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('pointerdown', onOutside);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function onOutside(e) { if (!box.contains(e.target)) close(); }
    ok.addEventListener('click', close);
    box.hidden = false;
    document.addEventListener('keydown', onKey);
    setTimeout(function () { document.addEventListener('pointerdown', onOutside); }, 0);
    try { ok.focus({ preventScroll: true }); } catch (e) { ok.focus(); }
})();
