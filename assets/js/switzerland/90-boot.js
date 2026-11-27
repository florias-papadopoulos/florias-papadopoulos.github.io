/* Part 90: wiring and start. The controls are wired once the map exists (start() in part 00 calls wire()); the
   facts drawer works without the map. Last, the question: the map starts only once the visitor said yes (now, or
   earlier through the flag). */
function wire() {
    document.querySelectorAll('.ch-base').forEach((b) => b.addEventListener('click', () => setBase(b.dataset.base)));
    $('ch-card-close').addEventListener('click', closeCard);
    wireCompare();
    wireTerrain();
    wireLayers();
    wireProfile();
    wireFly();
    wireSearch();
    wireHud();
    addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!$('ch-card').hidden) closeCard();
        else if (!$('ch-layers').hidden) $('ch-layers-close').click();
    });
}

(function factsDrawer() {
    const btn = $('ch-facts-btn'), box = $('ch-facts');
    const set = (open) => { box.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(box.hidden));
    $('ch-facts-close').addEventListener('click', () => { set(false); btn.focus(); });
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
