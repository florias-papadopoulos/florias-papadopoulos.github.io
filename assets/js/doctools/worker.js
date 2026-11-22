/*! DocTools worker (c) 2026 Florias Papadopoulos. GNU AGPL 3 or later. Uses MuPDF (c) Artifex Software, AGPL 3. Source: https://github.com/florias-papadopoulos/florias-papadopoulos.github.io/tree/master/assets/js/doctools */
// DocTools worker: runs MuPDF away from the page, so the page stays responsive.
//
// Copyright (C) 2026 Florias Papadopoulos. Uses MuPDF, therefore licensed under the GNU Affero General Public
// License 3 or later (see LICENSE.md). Joined after compress.js into one module by layouts/doctools/single.html.
//
// page.js starts this worker from a blob: URL whose only line imports this file. A blob worker keeps the page's
// Content-Security-Policy; a worker started from its own URL would get the policy of its HTTP headers, and GitHub
// Pages sends none, so it could reach any server (tested 2026-11-22, see assets/js/doctools/README.md).
//
// Messages in:  { id, op: "compress", engine: URL of mupdf.js, bytes: ArrayBuffer, level: "lossless" | ... }
// Messages out: { ready: true } once, then { id, progress: [phase, done, total] } and
//               { id, ok: true, out: ArrayBuffer, st, net } or { id, ok: false, err, net }
//               net: the requests this worker made while doing the job (URL and bytes), shown on the page.

let mupdf = null;

function net(since) {
    return performance.getEntriesByType("resource")
        .filter((e) => e.startTime >= since)
        .map((e) => ({ url: e.name, bytes: e.transferSize || 0 }));
}

self.onmessage = async (e) => {
    const m = e.data;
    const since = performance.now();
    try {
        if (!mupdf) mupdf = await import(m.engine);
        if (m.op !== "compress") throw new Error("unknown job");
        const level = LEVELS[m.level];
        if (!level) throw new Error("unknown level");
        let last = 0;
        const { out, st } = compress(mupdf, new Uint8Array(m.bytes), level, (phase, done, total) => {
            const now = performance.now();
            if (now - last > 120 || done === total) { last = now; self.postMessage({ id: m.id, progress: [phase, done, total] }); }
        });
        self.postMessage({ id: m.id, ok: true, out: out.buffer, st, net: net(since) }, [out.buffer]);
    } catch (err) {
        self.postMessage({ id: m.id, ok: false, err: String((err && err.message) || err), net: net(since) });
    }
};

self.postMessage({ ready: true });
