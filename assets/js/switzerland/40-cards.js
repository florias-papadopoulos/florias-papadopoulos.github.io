/* Part 40: what a tap on the map shows. A tool that takes the map's taps (the profile) comes first; then a summit,
   an avalanche region (when that layer is on), and last the canton under the tap. */
function card(build) {
    const body = $('ch-card-body');
    body.textContent = '';
    build(body);
    $('ch-card').hidden = false;
}
function closeCard() {
    $('ch-card').hidden = true;
    if (mapA) mapA.setFilter('canton-hi', ['==', ['get', 'code'], '']);
}
function visible(ids) {
    return ids.filter((l) => mapA.getLayer(l) && mapA.getLayoutProperty(l, 'visibility') !== 'none');
}
function onHover(e) {
    if (mode) { mapA.getCanvas().style.cursor = 'crosshair'; return; }
    const hit = mapA.queryRenderedFeatures(e.point, { layers: visible(PEAK_LAYERS) }).length;
    mapA.getCanvas().style.cursor = hit ? 'pointer' : '';
}
function onClick(e) {
    stopOrbit();
    if (mode === 'profile') { profileAdd(e.lngLat); return; }
    const peaks = mapA.queryRenderedFeatures(e.point, { layers: visible(PEAK_LAYERS) });
    if (peaks.length) {
        const p = peaks[0].properties;
        mapA.setFilter('canton-hi', ['==', ['get', 'code'], '']);
        card((b) => {
            b.append(el('p', 'ch-card-kind', 'Summit'), el('h2', null, p['name:latin'] || p.name || 'Summit'));
            const dl = el('dl', 'ch-card-facts');
            if (p.ele != null && isFinite(+p.ele)) row(dl, 'Height', fmt(+p.ele) + ' m');
            const c = cantonAt(e.point);
            if (c) row(dl, 'Canton', c.properties.name);
            b.appendChild(dl);
            b.appendChild(el('p', 'ch-card-src', 'Name and height: swisstopo'));
        });
        return;
    }
    if (layerOn.avalanche && avalanche) {
        const a = mapA.queryRenderedFeatures(e.point, { layers: ['avalanche'] });
        if (a.length && avalancheCard(a[0].properties.i)) { mapA.setFilter('canton-hi', ['==', ['get', 'code'], '']); return; }
    }
    if (layerOn.snow && snow) {
        const sn = mapA.queryRenderedFeatures(e.point, { layers: visible(['snow-dots']) });
        if (sn.length) {
            const p = sn[0].properties;
            mapA.setFilter('canton-hi', ['==', ['get', 'code'], '']);
            card((b) => {
                b.append(el('p', 'ch-card-kind', 'Snow station'), el('h2', null, p.name));
                const dl = el('dl', 'ch-card-facts');
                row(dl, 'Snow depth', p.cm + ' cm');
                if (+p.alt) row(dl, 'Altitude', fmt(+p.alt) + ' m');
                b.appendChild(dl);
                b.appendChild(el('p', 'ch-card-src', 'Measured by hand at 7:00. Source: MeteoSwiss, CC BY 4.0.'));
            });
            return;
        }
    }
    const c = cantonAt(e.point);
    if (!c) { closeCard(); return; }
    const pr = c.properties, f = facts.cantons[pr.code] || {};
    mapA.setFilter('canton-hi', ['==', ['get', 'code'], pr.code]);
    card((b) => {
        b.append(el('p', 'ch-card-kind', 'Canton ' + pr.code), el('h2', null, pr.name));
        const dl = el('dl', 'ch-card-facts');
        if (f.capital) row(dl, 'Capital', f.capital);
        if (f.languages) row(dl, f.languages.indexOf(',') > 0 ? 'Languages' : 'Language', f.languages);
        row(dl, 'Area', fmt(pr.area_ha / 100) + ' km²');
        if (f.joined) row(dl, 'Joined', String(f.joined));
        b.appendChild(dl);
        b.appendChild(el('p', 'ch-card-src', 'Outline and area: swisstopo. Capital, languages and year: checked against two sources each.'));
    });
}
function cantonAt(point) {
    const hits = mapA.queryRenderedFeatures(point, { layers: ['canton-fill'] });
    return hits[0] || null;
}
