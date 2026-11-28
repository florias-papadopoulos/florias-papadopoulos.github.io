/* Part 80: the panels know when to step aside. While the map moves (a drag, a zoom, a flight to a search result or a
   glacier) the panels and corner buttons fade out, and they come back half a second after it stops. The docks in use
   (year, sun, profile), the map controls and messages stay. Styles: body.ch-hud-off in switzerland.css. */
let hudTimer = null;
function hud(off) { document.body.classList.toggle('ch-hud-off', off); }
function wireHud() {
    mapA.on('movestart', () => {
        clearTimeout(hudTimer);
        // a short wait, so a tap or a nudge does not make the panels flicker
        hudTimer = setTimeout(() => hud(true), 180);
    });
    mapA.on('moveend', () => {
        clearTimeout(hudTimer);
        hudTimer = setTimeout(() => hud(false), 500);
    });
    // typing or tabbing to a control brings everything back at once
    document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('.ch-panel, .corner-btn')) { clearTimeout(hudTimer); hud(false); } });
}

/* phones: the bottom sheet (a sheet, the card or a dock) has a grip at its top. Drag it down a little and the sheet
   gets smaller (a third of the screen); drag it far, or flick it, and it closes (its × button); drag it up, or tap the
   grip, and it is full size again. */
const PHONE = matchMedia('(max-width: 900px)');
function wireGrips() {
    document.querySelectorAll('.ch-app .ch-sheet, .ch-app .ch-card, .ch-app .ch-dock').forEach((panel) => {
        const grip = document.createElement('div');
        grip.className = 'ch-grip';
        grip.setAttribute('aria-hidden', 'true');
        panel.prepend(grip);
        const close = panel.querySelector('.ch-close');
        if (close) close.addEventListener('click', () => panel.classList.remove('ch-small'));
        let y0 = 0, t0 = 0, dy = 0, id = null;
        const end = (e) => {
            if (id !== e.pointerId) return;
            id = null;
            const h = panel.offsetHeight, fast = dy > 60 && dy / Math.max(1, performance.now() - t0) > 0.8;
            panel.style.transition = '';
            panel.style.transform = '';
            if (e.type === 'pointercancel') return;
            if (close && (dy > Math.min(220, h * 0.6) || fast)) { panel.classList.remove('ch-small'); close.click(); }
            else if (dy > 40) panel.classList.add('ch-small');
            else if (dy < -30) panel.classList.remove('ch-small');
            else if (Math.abs(dy) < 6) panel.classList.toggle('ch-small');
        };
        grip.addEventListener('pointerdown', (e) => {
            if (!PHONE.matches || id !== null) return;
            id = e.pointerId; y0 = e.clientY; t0 = performance.now(); dy = 0;
            grip.setPointerCapture(e.pointerId);
            panel.style.transition = 'none';
            e.preventDefault();
        });
        grip.addEventListener('pointermove', (e) => {
            if (id !== e.pointerId) return;
            dy = e.clientY - y0;
            // down follows the finger; up only a little (it springs back to full size on release)
            panel.style.transform = 'translateY(' + (dy > 0 ? dy : dy / 4) + 'px)';
        });
        grip.addEventListener('pointerup', end);
        grip.addEventListener('pointercancel', end);
    });
}
