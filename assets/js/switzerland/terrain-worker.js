/* The Switzerland page's terrain worker (started by part 20; not one of the joined parts). It turns swisstopo's
   terrain (quantized mesh: triangles, 3d.geo.admin.ch) into the height images MapLibre's 3D needs (terrarium
   raster-dem), off the page's main thread, so the buttons and the map stay responsive while the mountains load.
   Each triangle is filled row by row onto the image (its heights are a plane), instead of searching the triangles
   for every pixel as the maplibre-gl-3dtiles-terrain plugin did; the finest terrain tile that covers a pixel wins.
   Pixels without terrain (beyond swisstopo's coverage) get one fixed height, as with the plugin.
   Messages in: {type:'init', decoder, layer, bounds, maxZoom, size, fallback}, {type:'tile', id, z, x, y},
   {type:'abort', id}. Out: {type:'ready', minZoom, maxZoom}, {id, bitmap} or {id, rgba}, {id, error}.
   The choice of terrain tiles (covering) and the tile arithmetic are adapted from maplibre-gl-3dtiles-terrain 0.1.0:
   Copyright (c) 2026, Clement IGONET. BSD 3-Clause License: redistribution and use in source and binary forms, with
   or without modification, are permitted provided that the conditions of that licence are met (retain this notice;
   do not use the name of the copyright holder to endorse derived products); the software is provided "as is",
   without any warranty. */
let decode = null, available = null, template = '', version = '1.0.0', bounds = null, SIZE = 256, FALLBACK = 300;
const meshes = new Map();   // url -> Promise<mesh | null>, the most recent 150 kept (phones' memory)
const aborted = new Set();

function qmTileBounds(z, x, y) {
    const w = 360 / (2 * 2 ** z), h = 180 / 2 ** z;
    return { west: -180 + x * w, south: -90 + y * h, east: -180 + (x + 1) * w, north: -90 + (y + 1) * h };
}
function mercLat(yy, n) { return (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - 2 * yy / n))); }
function mercatorTileBounds(z, x, y) {
    const n = 2 ** z;
    return { west: x / n * 360 - 180, east: (x + 1) / n * 360 - 180, north: mercLat(y, n), south: mercLat(y + 1, n) };
}
function overlap(a, b) { return a.west < b.east && a.east > b.west && a.south < b.north && a.north > b.south; }
function qmRange(z, b) {
    const tx = 2 * 2 ** z, ty = 2 ** z;
    return { xMin: Math.max(0, Math.floor((b.west + 180) / 360 * tx)), xMax: Math.min(tx - 1, Math.floor((b.east + 180) / 360 * tx)),
             yMin: Math.max(0, Math.floor((b.south + 90) / 180 * ty)), yMax: Math.min(ty - 1, Math.floor((b.north + 90) / 180 * ty)) };
}
/* the terrain tiles under an image, finest first; a zoom that would need more than 6 of them is skipped */
function covering(mb) {
    const out = [];
    let coarsest = -1;
    for (let qz = available.length - 1; qz >= 0; qz--) {
        const rects = available[qz] || [];
        if (!rects.length) continue;
        coarsest = qz;
        const r = qmRange(qz, mb);
        if ((r.xMax - r.xMin + 1) * (r.yMax - r.yMin + 1) > 6) continue;
        let full = true;
        for (let x = r.xMin; x <= r.xMax; x++) for (let y = r.yMin; y <= r.yMax; y++) {
            const b = qmTileBounds(qz, x, y);
            if (!overlap(b, mb)) continue;
            if (rects.some((q) => x >= q.startX && x <= q.endX && y >= q.startY && y <= q.endY)) out.push({ z: qz, x, y, b });
            else full = false;
        }
        if (full && out.length) return out;
    }
    if (!out.length && coarsest >= 0) {
        const r = qmRange(coarsest, mb);
        for (let x = r.xMin; x <= r.xMax; x++) for (let y = r.yMin; y <= r.yMax; y++) {
            const b = qmTileBounds(coarsest, x, y);
            if (overlap(b, mb)) out.push({ z: coarsest, x, y, b });
        }
    }
    return out;
}
function mesh(z, x, y) {
    const url = template.replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{version}', version);
    let p = meshes.get(url);
    if (p) { meshes.delete(url); meshes.set(url, p); return p; }
    p = fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' }).then(async (res) => {
        // tiles the service does not have: no terrain there (swisstopo answers 403)
        if (res.status === 403 || res.status === 404) return null;
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return decode(await res.arrayBuffer());
    });
    p.catch(() => meshes.delete(url));
    meshes.set(url, p);
    if (meshes.size > 150) meshes.delete(meshes.keys().next().value);
    return p;
}

/* fill one terrain tile's triangles into the image; done[] marks pixels a finer tile already set */
function fill(dec, b, z, x, y, heights, done) {
    const S = SIZE, n = 2 ** z, last = S - 1;
    const vd = dec.vertexData, tri = dec.triangleIndices, vc = vd.length / 3;
    const lo = dec.header.minHeight, k = (dec.header.maxHeight - dec.header.minHeight) / 32767;
    // image column and row of a mesh coordinate (u: west to east, v: south to north, both 0..32767)
    const lonOf = (u) => b.west + u / 32767 * (b.east - b.west);
    const latOf = (v) => b.south + v / 32767 * (b.north - b.south);
    const colOf = (u) => (((lonOf(u) + 180) / 360) * n - x) * last;
    const rowOf = (v) => {
        const r = latOf(v) * Math.PI / 180;
        return (((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n - y) * last;
    };
    // mesh coordinates of the image's columns and rows (exact for every pixel, so neighbouring images agree)
    const U = new Float64Array(S), V = new Float64Array(S);
    for (let c = 0; c < S; c++) U[c] = (((x + c / last) / n * 360 - 180) - b.west) / (b.east - b.west) * 32767;
    for (let r = 0; r < S; r++) V[r] = (mercLat(y + r / last, n) - b.south) / (b.north - b.south) * 32767;
    const E = 1e-6;
    for (let t = 0; t < tri.length; t += 3) {
        const i0 = tri[t], i1 = tri[t + 1], i2 = tri[t + 2];
        const u0 = vd[i0], v0 = vd[i0 + vc], h0 = vd[i0 + 2 * vc];
        const u1 = vd[i1], v1 = vd[i1 + vc], h1 = vd[i1 + 2 * vc];
        const u2 = vd[i2], v2 = vd[i2 + vc], h2 = vd[i2 + 2 * vc];
        const den = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2);
        if (den === 0) continue;
        const vMin = Math.min(v0, v1, v2), vMax = Math.max(v0, v1, v2);
        // rows grow southward: the top row is at vMax
        let rA = Math.ceil(rowOf(vMax) - E), rB = Math.floor(rowOf(vMin) + E);
        if (rB < 0 || rA > last) continue;
        rA = Math.max(rA, 0); rB = Math.min(rB, last);
        const uMin = Math.min(u0, u1, u2), uMax = Math.max(u0, u1, u2);
        let cA = Math.ceil(colOf(uMin) - E), cB = Math.floor(colOf(uMax) + E);
        if (cB < 0 || cA > last) continue;
        cA = Math.max(cA, 0); cB = Math.min(cB, last);
        for (let r = rA; r <= rB; r++) {
            const v = V[r];
            for (let c = cA; c <= cB; c++) {
                const i = r * S + c;
                if (done[i]) continue;
                const u = U[c];
                const w0 = ((v1 - v2) * (u - u2) + (u2 - u1) * (v - v2)) / den;
                if (w0 < -E) continue;
                const w1 = ((v2 - v0) * (u - u2) + (u0 - u2) * (v - v2)) / den;
                if (w1 < -E) continue;
                const w2 = 1 - w0 - w1;
                if (w2 < -E) continue;
                heights[i] = lo + (w0 * h0 + w1 * h1 + w2 * h2) * k;
                done[i] = 1;
            }
        }
    }
}

async function tile(id, z, x, y) {
    const mb = mercatorTileBounds(z, x, y);
    const list = covering(mb);
    const got = await Promise.all(list.map((t) => mesh(t.z, t.x, t.y).catch(() => null)));
    if (aborted.delete(id)) return { id, error: 'aborted' };
    const S = SIZE, heights = new Float32Array(S * S), done = new Uint8Array(S * S);
    list.forEach((t, j) => { if (got[j]) fill(got[j], t.b, z, x, y, heights, done); });
    const rgba = new Uint8ClampedArray(S * S * 4);
    for (let i = 0; i < S * S; i++) {
        // terrarium: height = R*256 + G + B/256 - 32768
        const v = Math.round(((done[i] ? heights[i] : FALLBACK) + 32768) * 256);
        rgba[i * 4] = (v >> 16) & 255; rgba[i * 4 + 1] = (v >> 8) & 255; rgba[i * 4 + 2] = v & 255; rgba[i * 4 + 3] = 255;
    }
    if (typeof createImageBitmap === 'function' && typeof ImageData === 'function') {
        try { return { id, bitmap: await createImageBitmap(new ImageData(rgba, S, S)) }; } catch (e) { /* send the pixels */ }
    }
    return { id, rgba };
}

self.onmessage = async (e) => {
    const m = e.data || {};
    if (m.type === 'abort') { aborted.add(m.id); return; }
    if (m.type === 'init') {
        try {
            // only this site's decoder and swisstopo's terrain
            if (new URL(m.decoder).origin !== self.location.origin || String(m.layer).indexOf('https://3d.geo.admin.ch/') !== 0) throw new Error('source');
            decode = (await import(m.decoder)).default;
            const res = await fetch(m.layer, { credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const layer = await res.json();
            if (layer.format !== 'quantized-mesh-1.0' || !Array.isArray(layer.tiles) || typeof layer.tiles[0] !== 'string') throw new Error('format');
            SIZE = m.size; FALLBACK = m.fallback; bounds = m.bounds; version = String(layer.version || '1.0.0');
            // only this host's tiles: a relative template on the same server
            template = m.layer.replace(/[^/]*$/, '') + layer.tiles[0].replace(/^\.?\//, '');
            if (new URL(template.replace(/[{}]/g, '')).origin !== new URL(m.layer).origin) throw new Error('host');
            available = Array.isArray(layer.available) && layer.available.length ? layer.available : [];
            if (!available.length) {
                for (let z = layer.minzoom || 0; z <= Math.min(layer.maxzoom, m.maxZoom); z++) {
                    const r = qmRange(z, bounds);
                    available[z] = [{ startX: r.xMin, startY: r.yMin, endX: r.xMax, endY: r.yMax }];
                }
            }
            const zs = available.map((r, z) => (r && r.length ? z : -1)).filter((z) => z >= 0);
            self.postMessage({ type: 'ready', minZoom: Math.min(...zs), maxZoom: Math.max(...zs) });
        } catch (err) {
            self.postMessage({ type: 'ready', error: String(err && err.message || err) });
        }
        return;
    }
    if (m.type === 'tile') {
        let out;
        try { out = await tile(m.id, m.z, m.x, m.y); } catch (err) { out = { id: m.id, error: String(err && err.message || err) }; }
        aborted.delete(m.id);   // an abort that came after the tile was made
        self.postMessage(out, out.bitmap ? [out.bitmap] : out.rgba ? [out.rgba.buffer] : []);
    }
};
