/* Part 80: the panels know when to step aside. While the map moves (a drag, a zoom, a flight to a search result or a
   glacier) the panels and corner buttons fade out, and they come back half a second after it stops. During Fly me
   somewhere they stay away for the whole flight and circle, until the visitor touches the map. Panels in use (the
   year, sun and profile docks) and messages stay. Styles: body.ch-hud-off in switzerland.css. */
let hudTimer = null;
function hud(off) { document.body.classList.toggle('ch-hud-off', off); }
function wireHud() {
    mapA.on('movestart', () => {
        if (orbiting) return;
        clearTimeout(hudTimer);
        // a short wait, so a tap or a nudge does not make the panels flicker
        hudTimer = setTimeout(() => hud(true), 180);
    });
    mapA.on('moveend', () => {
        if (orbiting) return;
        clearTimeout(hudTimer);
        hudTimer = setTimeout(() => hud(false), 500);
    });
    // typing or tabbing to a control brings everything back at once
    document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('.ch-panel, .corner-btn')) { clearTimeout(hudTimer); hud(false); } });
}
