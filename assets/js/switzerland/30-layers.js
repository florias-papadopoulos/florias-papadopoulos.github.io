/* Part 30: the Layers panel. Each entry turns map layers on or off and shows its legend (the legends are those of
   swisstopo's own layer descriptions, and the European avalanche danger scale). The avalanche bulletin is fetched
   from SLF only when its entry is first turned on; the glacier entry also offers three glaciers to fly to. */
const LAYERS = [
    { id: 'peaks', name: 'Summits', ids: PEAK_LAYERS, on: true, minzoom: 9, note: 'Name and height in metres, shown from closer in. Tap a summit for its card.' },
    { id: 'guests', name: 'Visitor places', ids: ['guests-dot', 'guests-ring', 'guests-name'], on: true, note: 'The places of the Visitors sheet. Tap one for its card.' },
    { id: 'caves', name: 'Big caves', ids: ['caves', 'caves-label'], note: 'The longest cave systems and the caves you can visit. Tap one for its card.' },
    { id: 'trails', name: 'Hiking trails', ids: ['trails'], minzoom: 10, lines: true,
      legend: [['#fdc200', 'Hiking trail (yellow signs, T1)'], ['#ff0000', 'Mountain trail (white-red-white, T2 to T3)'], ['#0000fd', 'Alpine trail (white-blue-white, T4 to T5)']],
      note: 'The colour is the trail\'s level, as on the signs. Shown from closer in.' },
    { id: 'slopes', name: 'Slopes over 30°', ids: ['slopes'],
      legend: [['#f0e208', '30 to 35°'], ['#f16d23', '35 to 40°'], ['#dc045a', '40 to 45°'], ['#c688b9', '45 to 50°'], ['#4a4a4a', 'over 50°']],
      note: 'Classes as recommended by SLF for avalanche terrain. A guide, not a safety check.' },
    { id: 'ski', name: 'Ski touring routes', ids: ['ski'], lines: true,
      legend: [['#0033ff', 'Ski route'], ['#0033ff', 'Dashed: take extra care', 'dash'], ['#0033ff', 'Dotted: on foot', 'dot']],
      note: 'Routes with a white edge have more information in swisstopo\'s winter map.' },
    { id: 'snowshoe', name: 'Snowshoe routes', ids: ['snowshoe'], lines: true,
      legend: [['#008a79', 'Snowshoe route'], ['#008a79', 'Dashed: take extra care', 'dash']] },
    { id: 'glaciers', name: 'Glaciers 1850 to 2016', ids: ['glaciers'],
      legend: [['#004ba6', '1850'], ['#0076fd', '1973'], ['#72dcfd', '2010'], ['#bcfde5', '2016'], ['#cb8864', 'Debris on the ice, 2016']],
      note: 'Each colour is where ice lay in that year (GLAMOS inventories).', glaciers: true },
    { id: 'avalanche', name: 'Avalanche danger today', ids: ['avalanche'],
      legend: [['#ccff66', '1 Low'], ['#ffff00', '2 Moderate'], ['#ff9900', '3 Considerable'], ['#ff0000', '4 High'], ['#7a0000', '5 Very high']],
      note: 'The official bulletin of the WSL Institute for Snow and Avalanche Research SLF (CC BY 4.0), loaded from slf.ch when you turn this on. Tap a region for details.' },
];
/* the Weather sheet's entries (parts 60 and 64), built the same way into their own list */
const WEATHER = [
    { id: 'rain', name: 'Rain radar', ids: ['rain'],
      legend: [['#5caaff', 'light'], ['#0050dc', '1 mm/h'], ['#00a546', '2 mm/h'], ['#ffcd00', '5 mm/h'], ['#ff7d00', '10 mm/h'], ['#e11919', '20 mm/h'], ['#9b00b9', '50 mm/h and more']] },
    { id: 'temp', name: 'Temperature now', ids: ['field-temp'],
      legend: [['#4575b4', '−10 °C'], ['#e0f3f8', '0 °C'], ['#fdae61', '10 °C'], ['#f46d43', '20 °C'], ['#d73027', '30 °C']] },
    { id: 'cloud', name: 'Cloud cover now', ids: ['field-cloud'],
      legend: [['rgba(90,100,115,0.25)', 'a few clouds'], ['rgba(90,100,115,0.6)', 'cloudy'], ['rgba(90,100,115,0.85)', 'overcast']] },
    { id: 'snowcover', name: 'Snow cover from space', ids: ['snowcover'],
      legend: [['#b8e5fd', 'A little snow'], ['#5192ef', 'Mostly snow'], ['#246ee9', 'Fully covered']],
      note: 'Where snow lay yesterday, seen by the NOAA-20 satellite (NASA GIBS, open data), about 400 m a pixel. Not how deep it is; clouds leave gaps.' },
    { id: 'weather', name: 'Weather stations', ids: ['wx-dots', 'wx-text'],
      legend: [['#3b82f6', 'below −5 °C'], ['#e0f2fe', 'around 0 °C'], ['#fde68a', 'around 10 °C'], ['#f97316', 'around 20 °C']],
      note: 'Temperatures of the last 10 minutes at about 160 automatic stations of MeteoSwiss (CC BY 4.0), loaded when you turn this on. Tap a station for wind, gusts, rain and sunshine.' }
];
const layerOn = {};
const LAYER_ICONS = {"guests": "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "peaks": "M3 19l6-10 4 6 2-3 6 7z", "caves": "M4 20v-7a8 8 0 0 1 16 0v7M9 20v-4a3 3 0 0 1 6 0v4", "trails": "M12 3v18M12 5h6l2 2-2 2h-6M12 11H6l-2 2 2 2h6", "slopes": "M3 20h18M3 20L18 6M10 20a8 8 0 0 0-2.3-5.7", "ski": "M6 21L19 4M10 21L21 7M4 17l3 1", "snowshoe": "M12 3c3 0 5 3.5 5 9s-2 9-5 9-5-3.5-5-9 2-9 5-9zM7 12h10M8.5 7h7M8.5 17h7", "glaciers": "M3 19l5-10 3 4 3-7 7 13zM8 9l1 4M14 6l1.5 5", "avalanche": "M12 3l10 18H2zM12 10v5M12 18h.01", "weather": "M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 9v7", "snowcover": "M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2 3-2M9 20.5l3-2 3 2", "rain": "M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3", "temp": "M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z", "cloud": "M7 19h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 19z"};
const ALL_LAYERS = () => LAYERS.concat(WEATHER);
/* the credits under the title name every source on the map (as the CC BY licences of SLF and MeteoSwiss and the ODbL of OpenStreetMap ask) */
function credits() {
    $('ch-credits').textContent = '© swisstopo' + (layerOn.avalanche ? ' · SLF' : '') + (layerOn.weather || layerOn.rain || layerOn.temp || layerOn.cloud ? ' · MeteoSwiss' : '') + (layerOn.temp || layerOn.cloud ? ' · Open-Meteo' : '') + (layerOn.snowcover ? ' · NASA' : '') + (routes.length || (typeof vRouteId !== 'undefined' && vRouteId) ? ' · Routes © OpenStreetMap, BRouter' : '');
}

function setLayer(def, on, opts) {
    layerOn[def.id] = on;
    if (def.id === 'guests' && on && styleReady) visitorsLayers();   // made on first use
    if (def.id === 'guests') {
        if ($('ch-v-pins')) $('ch-v-pins').checked = on;
        if (!on) { closePlace(); clearTrip(); }   // the place panel, its path and a train go with the pins
    }
    if (def.id === 'peaks') peakVisibility();
    else def.ids.forEach((id) => mapA.getLayer(id) && mapA.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
    const box = $('ch-ly-' + def.id);
    if (box) box.checked = on;
    const more = $('ch-ly-more-' + def.id);
    if (more) more.hidden = !on;
    // a layer seen only from closer in: a word, not a jump of the map
    if (on && !(opts && opts.restore) && def.minzoom && mapA.getZoom() < def.minzoom) toast('Zoom in to see the ' + def.name.toLowerCase() + '.', 3000);
    if (on && def.id === 'avalanche') loadAvalanche();
    if (on && def.id === 'weather') loadWeather();
    if (on && def.id === 'snowcover') snowCoverOn();
    if (on && def.id === 'rain') rainOn();
    if (on && (def.id === 'temp' || def.id === 'cloud')) fieldOn(def.id);
    if (!on && def.id === 'rain' && rainTimer) rainPlay();
    credits();
    $('ch-layers-btn').classList.toggle('ch-has', LAYERS.some((d) => d.id !== 'peaks' && d.id !== 'guests' && layerOn[d.id]));
    $('ch-weather-btn').classList.toggle('ch-has', WEATHER.some((d) => layerOn[d.id]));
}

/* Then and now shows a map of its own: the Layers button is off while they are on, the extra layers are
   hidden, and they come back as they were afterwards */
let layersSaved = null;
function lockLayers(lock) {
    const btn = $('ch-layers-btn');
    if (lock && !layersSaved) {
        layersSaved = { ...layerOn };
        ALL_LAYERS().forEach((d) => { if (d.id !== 'peaks' && layerOn[d.id]) setLayer(d, false); });
        if (!$('ch-layers').hidden || !$('ch-weather').hidden) sheet('ch-layers', false);
        btn.disabled = true;
        btn.title = 'Layers are off in this mode';
        $('ch-weather-btn').disabled = true;
        if ($('ch-v-pins')) $('ch-v-pins').disabled = true;
        if (typeof closePlace === 'function') { closePlace(); clearTrip(); }
        if (typeof showOstwind === 'function') showOstwind();
        $('ch-weather-btn').title = 'Weather maps are off in this mode';
    } else if (!lock && layersSaved) {
        const saved = layersSaved;
        layersSaved = null;
        btn.disabled = false;
        btn.title = 'Summits, caves, trails, slopes, glaciers and avalanches';
        $('ch-weather-btn').disabled = false;
        if ($('ch-v-pins')) $('ch-v-pins').disabled = false;
        if (typeof showOstwind === 'function') showOstwind();
        $('ch-weather-btn').title = 'Rain radar, temperature, clouds, weather stations, snow cover';
        ALL_LAYERS().forEach((d) => { if (d.id !== 'peaks' && saved[d.id]) setLayer(d, true, { restore: true }); });
    }
}
function buildLayers() {
    buildList(LAYERS, $('ch-layers-list'));
    buildList(WEATHER, $('ch-weather-list'));
}
function buildList(defs, list) {
    defs.forEach((def) => {
        const li = el('li', 'ch-ly');
        const label = el('label', 'ch-ly-row');
        const box = el('input');
        box.type = 'checkbox'; box.id = 'ch-ly-' + def.id; box.checked = !!def.on;
        box.addEventListener('change', () => setLayer(def, box.checked));
        const ic = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        ic.setAttribute('viewBox', '0 0 24 24'); ic.setAttribute('aria-hidden', 'true'); ic.setAttribute('class', 'ch-ly-icon');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', LAYER_ICONS[def.id] || '');
        ic.appendChild(path);
        label.append(ic, el('span', 'ch-ly-name', def.name), box);
        li.appendChild(label);
        const more = el('div', 'ch-ly-more');
        more.id = 'ch-ly-more-' + def.id;
        more.hidden = !def.on;
        if (def.legend) {
            const ul = el('ul', 'ch-legend');
            def.legend.forEach(([c, t, kind]) => {
                const k = el('li'), sw = el('span', def.lines ? 'ch-swatch ch-swatch-line' + (kind ? ' ch-swatch-' + kind : '') : 'ch-swatch');
                if (def.lines) sw.style.color = c; else sw.style.background = c;
                k.append(sw, el('span', null, t));
                ul.appendChild(k);
            });
            more.appendChild(ul);
        }
        if (def.note) more.appendChild(el('p', 'ch-ly-note', def.note));
        if (['avalanche', 'weather', 'snowcover', 'rain', 'temp', 'cloud'].includes(def.id)) { const s = el('p', 'ch-ly-note ch-ly-state'); s.id = 'ch-' + def.id + '-state'; more.appendChild(s); }
        if (def.id === 'rain') {
            // the last hour: a slider and a play button
            const row = el('div', 'ch-rain-row'); row.id = 'ch-rain-play-row'; row.hidden = true;
            const play = el('button', 'ch-chip', 'Play'); play.type = 'button'; play.id = 'ch-rain-play';
            const sl = el('input'); sl.type = 'range'; sl.id = 'ch-rain-slider'; sl.min = '0'; sl.max = '0'; sl.step = '1'; sl.setAttribute('aria-label', 'Time of the radar picture');
            const t = el('output', 'ch-rain-time'); t.id = 'ch-rain-time';
            row.append(play, sl, t);
            more.appendChild(row);
        }
        if (def.id === 'avalanche') {
            const a = el('a', 'ch-ly-link', 'Report an observation to SLF');
            a.href = 'https://pro.slf.ch/reply/public/#/'; a.target = '_blank'; a.rel = 'noopener noreferrer';
            more.appendChild(a);
        }
        if (def.glaciers) {
            const go = el('div', 'ch-ly-go');
            go.appendChild(el('span', null, 'Go to:'));
            Object.keys(GLACIERS).forEach((k) => {
                const b = el('button', 'ch-chip', GLACIERS[k].name);
                b.type = 'button';
                b.addEventListener('click', () => goGlacier(k));
                go.appendChild(b);
            });
            more.appendChild(go);
        }
        li.appendChild(more);
        list.appendChild(li);
        layerOn[def.id] = !!def.on;
    });
}

/* ---------- avalanches (SLF) ---------- */
const LEVELS = { low: 1, moderate: 2, considerable: 3, high: 4, very_high: 5 };
const LEVEL_NAMES = ['No rating', 'Low', 'Moderate', 'Considerable', 'High', 'Very high'];
const PROBLEMS = { new_snow: 'New snow', wind_slab: 'Wind slabs', persistent_weak_layers: 'Persistent weak layers',
                   wet_snow: 'Wet snow', gliding_snow: 'Gliding snow', cornices: 'Cornices',
                   no_distinct_avalanche_problem: 'No distinct avalanche problem', favourable_situation: 'Favourable situation' };
let avalanche = null, avalancheLoading = false;
async function loadAvalanche() {
    if (avalanche || avalancheLoading) return;
    avalancheLoading = true;
    const state = $('ch-avalanche-state');
    state.textContent = 'Loading the bulletin…';
    try {
        const res = await fetch('https://aws.slf.ch/api/bulletin/caaml/en/geojson', { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        const feats = (data && Array.isArray(data.features) ? data.features : []).filter((f) => f && f.geometry && f.properties);
        avalanche = feats.map((f, i) => {
            const p = f.properties || {};
            const lvl = Math.max(0, ...(Array.isArray(p.dangerRatings) ? p.dangerRatings : []).map((r) => (r && own(LEVELS, r.mainValue) ? LEVELS[r.mainValue] : 0)));
            return { type: 'Feature', geometry: f.geometry, properties: { i, level: lvl }, bulletin: p };
        });
        mapA.getSource('avalanche').setData({ type: 'FeatureCollection', features: avalanche.map((f) => ({ type: f.type, geometry: f.geometry, properties: f.properties })) });
        if (!avalanche.length) state.textContent = 'No bulletin right now: SLF publishes it in the snow season.';
        else {
            const v = avalanche[0].bulletin.validTime || {};
            state.textContent = 'Valid ' + when(v.startTime) + ' to ' + when(v.endTime) + '.';
        }
    } catch (e) {
        avalanche = null;
        state.textContent = 'The bulletin could not be loaded. Try again later.';
    }
    avalancheLoading = false;
}
function when(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '?';
    try {
        return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
    } catch (e) { return d.toUTCString(); }
}
function avalancheCard(i) {
    const f = avalanche && avalanche[i];
    if (!f) return false;
    const p = f.bulletin, lvl = f.properties.level;
    card((b) => {
        b.append(el('p', 'ch-card-kind', 'Avalanche danger'), el('h2', null, (p.regions || []).map((r) => r.name).join(', ') || 'Region'));
        const badge = el('p', 'ch-danger ch-danger-' + lvl, lvl ? lvl + ' ' + LEVEL_NAMES[lvl] : LEVEL_NAMES[0]);
        b.appendChild(badge);
        const ul = el('ul', 'ch-problems');
        (p.avalancheProblems || []).slice(0, 4).forEach((pr) => {
            const li = el('li');
            li.appendChild(el('strong', null, own(PROBLEMS, pr.problemType) ? PROBLEMS[pr.problemType] : String(pr.problemType || '').replace(/_/g, ' ')));
            const bits = [];
            const ev = pr.elevation || {};
            if (ev.lowerBound) bits.push('above ' + ev.lowerBound + ' m');
            if (ev.upperBound) bits.push('below ' + ev.upperBound + ' m');
            if (Array.isArray(pr.aspects) && pr.aspects.length) bits.push(pr.aspects.length >= 8 ? 'all aspects' : 'aspects ' + pr.aspects.join(' '));
            if (bits.length) li.appendChild(el('span', null, ' · ' + bits.join(', ')));
            ul.appendChild(li);
        });
        if (ul.childNodes.length) b.appendChild(ul);
        const v = p.validTime || {};
        b.appendChild(el('p', 'ch-card-src', 'Valid ' + when(v.startTime) + ' to ' + when(v.endTime) + '. Source: WSL Institute for Snow and Avalanche Research SLF, CC BY 4.0.'));
        const a = el('a', 'ch-card-link', 'Full bulletin at slf.ch');
        a.href = 'https://www.slf.ch/en/avalanche-bulletin-and-snow-situation/';
        a.target = '_blank'; a.rel = 'noopener noreferrer';
        b.appendChild(a);
    });
    return true;
}

/* ---------- glaciers ---------- */
const GLACIERS = {
    aletsch: { name: 'Aletsch', center: [8.03, 46.48], zoom: 11.3, bearing: 200 },
    rhone: { name: 'Rhône', center: [8.385, 46.6], zoom: 12.6, bearing: 10 },
    morteratsch: { name: 'Morteratsch', center: [9.935, 46.42], zoom: 12.4, bearing: 170 }
};
function goGlacier(k) {
    const g = GLACIERS[k], f = (facts.glaciers || {})[k] || {};
    if (!layerOn.glaciers) setLayer(LAYERS.find((d) => d.id === 'glaciers'), true);
    const cam = threeD ? { pitch: 60, bearing: g.bearing } : { pitch: 0, bearing: 0 };
    mapA.flyTo({ center: g.center, zoom: g.zoom, ...cam, duration: reduced ? 0 : 2600, essential: true });
    card((b) => {
        b.append(el('p', 'ch-card-kind', 'Glacier'), el('h2', null, f.title || g.name + ' Glacier'));
        const dl = el('dl', 'ch-card-facts');
        (f.facts || []).forEach((x) => row(dl, x.label, x.value));
        if (dl.childNodes.length) b.appendChild(dl);
        if (f.note) b.appendChild(el('p', 'ch-card-note', f.note));
        if (facts.glacier_loss) b.appendChild(el('p', 'ch-card-note', facts.glacier_loss));
        const btn = el('button', 'ch-card-btn', 'Compare with the map of 1880');
        btn.type = 'button';
        if (threeD || mode === 'profile') { btn.disabled = true; btn.title = threeD ? 'Not in 3D: turn 3D off first' : 'Not while drawing a route: close it first'; }
        btn.addEventListener('click', () => { if (compare !== 'time') setCompare('time'); setYear(1880); });
        b.appendChild(btn);
        b.appendChild(el('p', 'ch-card-src', f.source || 'Extents: GLAMOS inventories via swisstopo.'));
    });
}

function wireLayers() {
    buildLayers();
    const btn = $('ch-layers-btn'), panel = $('ch-layers');
    btn.addEventListener('click', () => sheet('ch-layers', panel.hidden));
    $('ch-layers-close').addEventListener('click', () => { sheet('ch-layers', false); btn.focus(); });
}
