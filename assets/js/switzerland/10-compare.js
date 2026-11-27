/* Part 10: Then and now. A second map on top of the first, clipped at a draggable line and following every move of
   the first: swisstopo's "Journey through time" (ch.swisstopo.zeitreihen), one national map for every year from 1844
   to 2021. */
function ensureB() {
    if (mapB) return mapB;
    $('ch-map-b').hidden = false;
    mapB = new ml.Map({
        container: 'ch-map-b', interactive: false, attributionControl: false, maxPitch: 80,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        style: { version: 8, sources: { b: oldSource(year) },
                 layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#e9edf1' } }, { id: 'b', type: 'raster', source: 'b' }] },
        center: mapA.getCenter(), zoom: mapA.getZoom(), bearing: mapA.getBearing(), pitch: mapA.getPitch()
    });
    return mapB;
}
function syncB() {
    if (!mapB || !compare) return;
    mapB.jumpTo({ center: mapA.getCenter(), zoom: mapA.getZoom(), bearing: mapA.getBearing(), pitch: mapA.getPitch() });
}
function setB(src) {
    const go = () => {
        if (mapB.getLayer('b')) mapB.removeLayer('b');
        if (mapB.getSource('b')) mapB.removeSource('b');
        mapB.addSource('b', src);
        mapB.addLayer({ id: 'b', type: 'raster', source: 'b' });
    };
    if (mapB.isStyleLoaded()) go(); else mapB.once('load', go);
}
function clip() {
    const w = $('ch-stage').clientWidth, x = Math.round(w * split);
    $('ch-map-b').style.clipPath = 'inset(0 0 0 ' + x + 'px)';
    $('ch-divider').style.left = x + 'px';
}
function setCompare(next) {
    compare = compare === next ? null : next;
    // the old maps are flat: in 3D the second map would have to build the terrain a second time, which is slow
    if (compare && threeD) { set3D(false); toast('Then and now shows the flat map.'); }
    if (compare === 'time') dock('years');
    $('ch-time').setAttribute('aria-pressed', String(compare === 'time'));
    $('ch-years').hidden = compare !== 'time';
    const on = !!compare;
    $('ch-divider').hidden = !on;
    $('ch-label-a').hidden = !on;
    $('ch-label-b').hidden = !on;
    if (!on) { $('ch-map-b').hidden = true; return; }
    ensureB();
    $('ch-map-b').hidden = false;
    setB(oldSource(year));
    labels();
    clip();
    mapB.resize();
    syncB();
}
function labels() {
    $('ch-label-a').textContent = 'Today';
    $('ch-label-b').textContent = String(year);
}
function setYear(y) {
    year = clamp(Math.round(y), FIRST_YEAR, LAST_YEAR);
    $('ch-year').value = year;
    $('ch-year-out').textContent = year;
    labels();
    if (compare === 'time') setB(oldSource(year));
}
docks.years = { open: () => compare === 'time', close: () => setCompare('time') };

function wireCompare() {
    $('ch-time').addEventListener('click', () => setCompare('time'));
    const range = $('ch-year'), out = $('ch-year-out');
    range.min = FIRST_YEAR; range.max = LAST_YEAR; range.value = year; out.textContent = year;
    let t = null;
    range.addEventListener('input', () => {
        year = +range.value; out.textContent = year; labels();
        clearTimeout(t);
        t = setTimeout(() => { if (compare === 'time') setB(oldSource(year)); }, 250);
    });
    // the divider: drag with mouse, finger or pen; arrow keys on the handle
    const stage = $('ch-stage'), handle = $('ch-handle');
    let drag = false;
    const moveTo = (clientX) => {
        const r = stage.getBoundingClientRect();
        split = clamp((clientX - r.left) / r.width, 0.05, 0.95);
        clip();
    };
    handle.addEventListener('pointerdown', (e) => { drag = true; handle.setPointerCapture(e.pointerId); e.preventDefault(); });
    handle.addEventListener('pointermove', (e) => { if (drag) moveTo(e.clientX); });
    handle.addEventListener('pointerup', () => { drag = false; });
    handle.addEventListener('pointercancel', () => { drag = false; });
    handle.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            split = clamp(split + (e.key === 'ArrowLeft' ? -0.05 : 0.05), 0.05, 0.95); clip(); e.preventDefault();
        }
    });
    addEventListener('resize', () => { if (compare) clip(); });
}
