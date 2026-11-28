/* Part 90: wiring and start. The controls are wired once the map exists (start() in part 00 calls wire()); the
   facts drawer works without the map. Last, the question: the map starts only once the visitor said yes (now, or
   earlier through the flag). */
function wire() {
    document.querySelectorAll('.ch-base').forEach((b) => b.addEventListener('click', () => setBase(b.dataset.base)));
    $('ch-card-close').addEventListener('click', closeCard);
    wireControls();
    wireCompare();
    wireTerrain();
    wireLayers();
    wireProfile();
    wireSearch();
    wireHud();
    forgetOffline();
    wireVisitors();
    wireGrips();
    tools();
    addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!$('ch-card').hidden) closeCard();
        else if (!$('ch-layers').hidden) $('ch-layers-close').click();
        else if (!$('ch-facts').hidden) $('ch-facts-close').click();
        else if ($('ch-visitors') && !$('ch-visitors').hidden) $('ch-visitors-close').click();
    });
}

(function factsDrawer() {
    const btn = $('ch-facts-btn'), box = $('ch-facts');
    btn.addEventListener('click', () => sheet('ch-facts', box.hidden));
    $('ch-facts-close').addEventListener('click', () => { sheet('ch-facts', false); btn.focus(); });
    $('ch-forget').addEventListener('click', () => {
        try { localStorage.removeItem('ch-maps-ok'); sessionStorage.removeItem('ch-maps-ok'); } catch (e) { /* no storage */ }
        toast('Done: the site will ask again next time.');
    });
})();

(function gate() {
    let ok = false;
    try { ok = localStorage.getItem('ch-maps-ok') === '1' || sessionStorage.getItem('ch-maps-ok') === '1'; } catch (e) { /* no storage */ }
    if (ok) { start(); return; }
    const g = $('ch-gate'), box = $('ch-gate-box');
    g.hidden = false;
    app.classList.add('ch-asking');
    box.querySelector('.ch-consent-yes').addEventListener('click', () => {
        try {
            if (box.querySelector('.ch-consent-remember').checked) localStorage.setItem('ch-maps-ok', '1');
            sessionStorage.setItem('ch-maps-ok', '1');
        } catch (e) { /* no storage */ }
        g.hidden = true;
        app.classList.remove('ch-asking');
        start();
    });
    box.querySelector('.ch-consent-no').addEventListener('click', () => {
        location.href = app.dataset.home || '/';
    });
    box.querySelector('.ch-consent-yes').focus();
})();

/* the Offline feature was removed (2026-11-28): a browser that saved areas with it drops them and its helper */
function forgetOffline() {
    try {
        if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => { if (/\/switzerland\/$/.test(r.scope)) r.unregister(); })).catch(() => {});
        if ('caches' in window) caches.keys().then((ks) => ks.forEach((k) => { if (k.indexOf('ch-area-') === 0 || k === 'ch-shell-v1') caches.delete(k); })).catch(() => {});
    } catch (e) { /* nothing to forget */ }
}
