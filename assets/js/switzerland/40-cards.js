/* Part 40: what a tap on the map shows. A tool that takes the map's taps (the profile) comes first; then a summit,
   a weather station, an avalanche region (when that layer is on), and last the canton under the tap. */
/* fit: the card as wide as its words (a canton's), not the usual fixed width */
function card(build, fit) {
    const body = $('ch-card-body');
    body.textContent = '';
    build(body);
    $('ch-card').classList.toggle('ch-card-fit', !!fit);
    $('ch-card').hidden = false;
}
function closeCard() {
    $('ch-card').hidden = true;
    if (mapA) hiCanton('');
}
function visible(ids) {
    return ids.filter((l) => mapA.getLayer(l) && mapA.getLayoutProperty(l, 'visibility') !== 'none');
}
let hoverFrame = 0, hoverEvent = null;
function onHover(e) {
    if (mode) { mapA.getCanvas().style.cursor = 'crosshair'; return; }
    if ((e.originalEvent && e.originalEvent.buttons) || mapA.isMoving()) return;
    hoverEvent = e;
    if (!hoverFrame) hoverFrame = requestAnimationFrame(() => { hoverFrame = 0; hoverCheck(hoverEvent); });
}
function hoverCheck(e) {
    const hit = mapA.queryRenderedFeatures(e.point, { layers: visible(PEAK_LAYERS.concat('peaks-hit', 'airports', 'caves', 'wx-dots', 'guests-dot')) }).length;
    mapA.getCanvas().style.cursor = hit ? 'pointer' : '';
}
function onClick(e) {
    if (mode === 'profile') { profileAdd(e.lngLat); return; }
    const gp = visitorsOn ? mapA.queryRenderedFeatures(e.point, { layers: visible(['guests-dot']) }) : [];
    if (gp.length && gp[0].properties.point_count) {
        // a bubble of several places: zoom in to where they part
        mapA.getSource('guests').getClusterExpansionZoom(gp[0].properties.cluster_id)
            .then((z) => mapA.easeTo({ center: gp[0].geometry.coordinates, zoom: z + 0.3, duration: reduced ? 0 : 700 })).catch(() => {});
        return;
    }
    if (gp.length && guestCard(gp[0].properties.i)) { hiCanton(''); return; }
    const peaks = mapA.queryRenderedFeatures(e.point, { layers: visible(PEAK_LAYERS.concat('peaks-hit')) });
    if (peaks.length) {
        const p = peaks[0].properties;
        hiCanton('');
        card((b) => {
            b.append(el('p', 'ch-card-kind', 'Summit'), el('h2', null, p.name || 'Summit'));
            const dl = el('dl', 'ch-card-facts');
            if (p.ele != null && isFinite(+p.ele)) row(dl, 'Height', fmt(+p.ele) + ' m');
            const c = cantonAt(e.point);
            if (c) row(dl, 'Canton', c.properties.name);
            b.appendChild(dl);
            b.appendChild(el('p', 'ch-card-src', 'Name and height: swisstopo. Stops: Federal Office of Transport.'));
            const g = peaks[0].geometry && peaks[0].geometry.coordinates;
            nearestStop(g ? g[0] : e.lngLat.lng, g ? g[1] : e.lngLat.lat, dl);
        });
        return;
    }
    const cv = mapA.getLayer('caves') ? mapA.queryRenderedFeatures(e.point, { layers: visible(['caves']) }) : [];
    if (cv.length) {
        const c = (facts.caves || [])[cv[0].properties.i];
        if (c) {
            hiCanton('');
            card((b) => {
                b.append(el('p', 'ch-card-kind', 'Cave'), el('h2', null, String(c.name)));
                const dl = el('dl', 'ch-card-facts');
                (c.facts || []).forEach((x) => row(dl, String(x.label), String(x.value)));
                b.appendChild(dl);
                nearestStop(+c.lon, +c.lat, dl);
                if (c.note) b.appendChild(el('p', 'ch-card-note', String(c.note)));
                if (typeof c.link === 'string' && c.link.indexOf('https://') === 0) {
                    const a = el('a', 'ch-card-link', 'Official website');
                    a.href = c.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
                    b.appendChild(a);
                }
                if (c.source) b.appendChild(el('p', 'ch-card-src', 'Facts: ' + String(c.source)));
            });
            return;
        }
    }
    const air = mapA.getLayer('airports') ? mapA.queryRenderedFeatures(e.point, { layers: ['airports'] }) : [];
    if (air.length) {
        const p = air[0].properties;
        hiCanton('');
        card((b) => { b.append(el('p', 'ch-card-kind', 'Airport ' + p.code), el('h2', null, p.name)); });
        return;
    }
    if (layerOn.weather && wx) {
        const w = mapA.queryRenderedFeatures(e.point, { layers: visible(['wx-dots']) });
        if (w.length) { hiCanton(''); weatherCard(w[0].properties); return; }
    }
    if (layerOn.avalanche && avalanche) {
        const a = mapA.queryRenderedFeatures(e.point, { layers: ['avalanche'] });
        if (a.length && avalancheCard(a[0].properties.i)) { hiCanton(''); return; }
    }
    const c = cantonAt(e.point);
    if (!c) { closeCard(); return; }
    const pr = c.properties, f = facts.cantons[pr.code] || {};
    hiCanton(pr.code);
    // minimal: the name, the capital and the languages
    card((b) => {
        b.append(el('p', 'ch-card-kind', 'Canton'), el('h2', null, pr.name));
        const bits = [f.capital, f.languages].filter(Boolean).map(String);
        b.appendChild(el('p', 'ch-card-line', bits.join(' · ')));
    }, true);
}
function cantonAt(point) {
    const hits = mapA.queryRenderedFeatures(point, { layers: ['canton-fill'] });
    return hits[0] || null;
}
