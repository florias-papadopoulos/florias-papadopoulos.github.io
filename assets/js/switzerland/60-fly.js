/* Part 60: Fly me somewhere. A flight in 3D to a famous summit, glacier, lake or waterfall picked at random, then a
   slow circle around it until the visitor touches the map. Positions from swisstopo's place names (swissNAMES3D,
   looked up once through api3.geo.admin.ch); a few summits use the summit's own position. */
const PLACES = [
    ['Matterhorn', 7.6586, 45.9764, 12.4], ['Eiger', 8.0053, 46.5776, 12.6], ['Jungfrau', 7.9625, 46.5367, 12.4],
    ['Dufourspitze', 7.8668, 45.9369, 12.2], ['Piz Bernina', 9.9081, 46.3824, 12.2], ['Piz Palü', 9.9602, 46.3788, 12.4],
    ['Titlis', 8.4378, 46.772, 12.4], ['Pilatus', 8.2564, 46.9797, 12.6], ['Rigi Kulm', 8.4853, 47.0568, 12.6],
    ['Säntis', 9.3433, 47.2493, 12.6], ['Aletschhorn', 7.9936, 46.4652, 12.2], ['Finsteraarhorn', 8.1261, 46.5374, 12.2],
    ['Weisshorn', 7.7161, 46.1014, 12.2], ['Dom', 7.8586, 46.0939, 12.2], ['Grand Combin', 7.2992, 45.9376, 12.2],
    ['Tödi', 8.9219, 46.8104, 12.2], ['Piz Linard', 10.0714, 46.7989, 12.4], ['Brienzer Rothorn', 8.0469, 46.7871, 12.6],
    ['Great Aletsch Glacier', 8.0651, 46.4595, 11.6], ['Rhône Glacier', 8.3982, 46.6251, 12.6], ['Morteratsch Glacier', 9.935, 46.42, 12.4],
    ['Oeschinensee', 7.7267, 46.4984, 13], ['Lej da Segl', 9.7329, 46.4193, 12.4], ['Seealpsee', 9.4008, 47.2684, 13.2],
    ['Lauterbrunnen valley', 7.9051, 46.5896, 12.8], ['Creux du Van', 6.7275, 46.9368, 13.2], ['Rhine Falls', 8.6157, 47.6777, 14.6],
    ['Lac de Moiry', 7.5708, 46.1285, 12.8], ['Lake Lugano', 8.9743, 45.9755, 11.6], ['Caumasee', 9.2959, 46.8215, 14]
];
let orbiting = false, orbitFrame = 0, lastPlace = -1;
function stopOrbit() {
    if (!orbiting) return;
    orbiting = false;
    cancelAnimationFrame(orbitFrame);
    hud(false);
    $('ch-fly-label').hidden = true;
    $('ch-fly').setAttribute('aria-pressed', 'false');
}
function orbit() {
    if (!orbiting) return;
    mapA.setBearing(mapA.getBearing() + 0.08);
    orbitFrame = requestAnimationFrame(orbit);
}
async function flySomewhere() {
    if (orbiting) { stopOrbit(); return; }
    if (mode) setProfile(false);
    if (!threeD && !(await set3D(true, { fly: false }))) return;
    let i;
    do { i = Math.floor(Math.random() * PLACES.length); } while (i === lastPlace && PLACES.length > 1);
    lastPlace = i;
    const [name, lon, lat, zoom] = PLACES[i];
    closeCard();
    const label = $('ch-fly-label');
    label.textContent = '';
    label.append(el('strong', null, name), el('span', null, reduced ? '' : 'Tap the map to stop'));
    label.hidden = false;
    $('ch-fly').setAttribute('aria-pressed', 'true');
    orbiting = true;
    hud(true);
    mapA.flyTo({ center: [lon, lat], zoom, pitch: 68, bearing: Math.round(Math.random() * 360), duration: reduced ? 0 : 5200, essential: true });
    mapA.once('moveend', () => { if (orbiting && !reduced) orbit(); });
}
function wireFly() {
    $('ch-fly').addEventListener('click', flySomewhere);
    // any touch of the map ends the circling (wheel, drag, pinch, keys)
    ['mousedown', 'touchstart', 'wheel', 'keydown'].forEach((t) => mapA.getContainer().addEventListener(t, stopOrbit, { passive: true }));
}
