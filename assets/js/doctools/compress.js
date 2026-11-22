/*! DocTools compression (c) 2026 Florias Papadopoulos. GNU AGPL 3 or later. Uses MuPDF (c) Artifex Software, AGPL 3. Source: https://github.com/florias-papadopoulos/florias-papadopoulos.github.io/tree/master/assets/js/doctools */
// DocTools: make a PDF smaller with MuPDF (static/engines/mupdf-*), in the visitor's browser.
//
// Copyright (C) 2026 Florias Papadopoulos.
// This file uses MuPDF and is therefore licensed under the GNU Affero General Public License 3 or later
// (see LICENSE.md and static/engines/mupdf-1.28.6/LICENSE). Its source is public in this site's repository.
//
// Levels:
//   lossless:    MuPDF rewrites the file (drops unused and duplicate objects, compresses every stream, packs
//                objects into object streams) and keeps only the letters each font really uses.
//   recommended: the same, and every picture is scaled down to 150 dpi at the largest size it is drawn on a page.
//   strong:      the same at 96 dpi, with stronger JPEG compression.
// Photos become JPEG. Pictures with few colours (screenshots, plots, logos) and pictures with transparency are
// scaled down but stay lossless, so text in them stays crisp and no halo appears around them. A picture is only
// replaced when the new one is clearly smaller. MuPDF's web build has no picture shrinking of its own (only its
// lossless options), which is why this file does it.
//
// compress(mupdf, bytes, level, onProgress) -> { out: Uint8Array, st: statistics }
// It throws Error("PASSWORD") for a PDF that needs a password to open.

export const LEVELS = {
    lossless: {},
    recommended: { dpi: 150, q: 75 },
    strong: { dpi: 96, q: 55 },
};

// a picture with at most this many colours in a sample of its pixels counts as graphics (kept lossless)
const GRAPHICS_COLOURS = 4096;
const SAMPLE = 40000;

function colourCount(pix) {
    const w = pix.getWidth(), h = pix.getHeight(), n = pix.getNumberOfComponents(), stride = pix.getStride();
    const px = pix.getPixels();
    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / SAMPLE)));
    const seen = new Set();
    for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
            const i = y * stride + x * n;
            seen.add(n === 1 ? px[i] : (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
            if (seen.size > GRAPHICS_COLOURS) return seen.size;
        }
    }
    return seen.size;
}

// the pixel rows without the padding MuPDF may add at the end of each row
function rows(pix) {
    const w = pix.getWidth(), h = pix.getHeight(), n = pix.getNumberOfComponents(), stride = pix.getStride();
    const px = pix.getPixels(), line = w * n;
    if (stride === line) return new Uint8Array(px.buffer.slice(px.byteOffset, px.byteOffset + line * h));
    const out = new Uint8Array(line * h);
    for (let y = 0; y < h; y++) out.set(px.subarray(y * stride, y * stride + line), y * line);
    return out;
}

// scale a pixmap down by letting MuPDF draw it at the new size: its drawing engine filters (averages) the pixels,
// where Pixmap.warp would only pick some of them (grainy text in screenshots)
let M = null; // the MuPDF module, set by compress()
function scaled(pix, nw, nh) {
    const w = pix.getWidth(), h = pix.getHeight();
    if (nw === w && nh === h) return pix;
    const out = new M.Pixmap(pix.getColorSpace(), [0, 0, nw, nh], false);
    out.clear(255);
    const img = new M.Image(pix), dev = new M.DrawDevice(M.Matrix.identity, out);
    try { dev.fillImage(img, [nw, 0, 0, nh, 0, 0], 1); dev.close(); } finally { free(dev, img); }
    return out;
}

// write pixels as a lossless image stream (MuPDF Flate-compresses it when saving)
function writeLossless(doc, ref, pix) {
    const gray = pix.getNumberOfComponents() === 1;
    ref.writeStream(rows(pix));
    ref.delete("Filter"); ref.delete("DecodeParms"); ref.delete("Decode");
    ref.put("Width", pix.getWidth()); ref.put("Height", pix.getHeight());
    ref.put("BitsPerComponent", 8);
    ref.put("ColorSpace", doc.newName(gray ? "DeviceGray" : "DeviceRGB"));
}

function writeJPEG(doc, ref, pix, jpg) {
    const gray = pix.getNumberOfComponents() === 1;
    ref.writeRawStream(jpg);
    ref.put("Filter", doc.newName("DCTDecode"));
    ref.delete("DecodeParms"); ref.delete("Decode");
    ref.put("Width", pix.getWidth()); ref.put("Height", pix.getHeight());
    ref.put("BitsPerComponent", 8);
    ref.put("ColorSpace", doc.newName(gray ? "DeviceGray" : "DeviceRGB"));
}

function isName(obj, name) { return obj.isName() && obj.asName() === name; }

// MuPDF's objects live in WebAssembly memory (at most 2 to 4 GB, less on phones) until freed: free them as soon as
// they are done with, or a few big files in a row run out of memory.
const free = (...xs) => { for (const x of xs) if (x && x.destroy) try { x.destroy(); } catch (e) { /* already freed */ } };

export function compress(mupdf, bytes, level, onProgress) {
    M = mupdf;
    const doc = mupdf.Document.openDocument(bytes, "application/pdf");
    try {
        return run(mupdf, doc, level, onProgress || (() => {}));
    } finally {
        free(doc);
    }
}

function run(mupdf, doc, level, progress) {
    if (doc.needsPassword()) throw new Error("PASSWORD");
    const pdf = doc.asPDF();
    if (!pdf) throw new Error("NOT_PDF");
    const st = { pages: pdf.countPages(), images: 0, jpeg: 0, lossless: 0, masks: 0, kept: 0 };
    // a digital signature covers the exact bytes of the file, so any rewrite breaks it: the page warns
    const form = pdf.getTrailer().get("Root").get("AcroForm");
    const fields = form.isNull() ? null : form.get("Fields");
    st.form = !!fields && fields.isArray() && fields.length > 0;
    const sigFlags = form.isNull() ? null : form.get("SigFlags");
    st.signed = !!sigFlags && sigFlags.isNumber() && (sigFlags.asNumber() & 1) === 1;

    if (level.dpi) {
        // 1. the largest size (in points) at which each picture is drawn, from MuPDF drawing every page
        const drawn = new Map(), hold = [];
        let maxPt = 0;
        for (let i = 0; i < st.pages; i++) {
            const page = pdf.loadPage(i);
            const b = page.getBounds();
            maxPt = Math.max(maxPt, b[2] - b[0], b[3] - b[1]);
            const dev = new mupdf.Device({
                fillImage(img, m) {
                    const d = drawn.get(img.pointer) || [0, 0];
                    drawn.set(img.pointer, [Math.max(d[0], Math.hypot(m[0], m[1])), Math.max(d[1], Math.hypot(m[2], m[3]))]);
                    hold.push(img); // keeps MuPDF's copy alive, so its pointer stays the same below
                },
            });
            try { page.run(dev, mupdf.Matrix.identity); } catch (e) { /* a broken page: its pictures get the page cap */ }
            dev.close(); free(dev, page);
            progress("measure", i + 1, st.pages);
        }

        // 2. every picture, except soft masks (they follow their picture)
        const n = pdf.countObjects(), masks = new Set(), todo = [];
        for (let num = 1; num < n; num++) {
            const sm = pdf.newIndirect(num).get("SMask");
            if (sm.isIndirect()) masks.add(sm.asIndirect());
        }
        for (let num = 1; num < n; num++) {
            const ref = pdf.newIndirect(num);
            if (!ref.isStream() || !isName(ref.get("Subtype"), "Image") || masks.has(num)) continue;
            todo.push(ref);
        }
        st.images = todo.length;

        // 3. shrink them
        todo.forEach((ref, k) => {
            progress("images", k + 1, todo.length);
            const tmp = [];
            const keep = (x) => { tmp.push(x); return x; };
            try {
                const im = ref.get("ImageMask"), bpc = ref.get("BitsPerComponent");
                if ((!im.isNull() && im.asBoolean()) || (!bpc.isNull() && bpc.asNumber() === 1)) { st.kept++; return; }
                const img = keep(pdf.loadImage(ref));
                const w = img.getWidth(), h = img.getHeight();
                const d = drawn.get(img.pointer);
                // pictures not seen being drawn (only in an annotation, say) are capped at the page size
                const s = d ? Math.min(1, Math.max((d[0] / 72) * level.dpi / w, (d[1] / 72) * level.dpi / h))
                            : Math.min(1, (maxPt / 72) * level.dpi / Math.max(w, h));
                const shrink = s < 0.95;
                const nw = shrink ? Math.max(1, Math.round(w * s)) : w, nh = shrink ? Math.max(1, Math.round(h * s)) : h;
                const raw = ref.readRawStream().getLength();
                const wasJPEG = isName(ref.get("Filter"), "DCTDecode");
                if (!shrink && wasJPEG) { st.kept++; return; }

                let pix = keep(img.toPixmap());
                const sm = ref.get("SMask");
                if (pix.getAlpha()) {
                    // decode the colour part alone: take the mask off for a moment
                    ref.delete("SMask");
                    try { const bare = keep(pdf.loadImage(ref)); pix = keep(bare.toPixmap()); } finally { if (!sm.isNull()) ref.put("SMask", sm); }
                    if (pix.getAlpha()) { st.kept++; return; }
                }
                // only plain gray and RGB keep their pixels as they are; anything else (CMYK, Separation, DeviceN,
                // Lab...) is converted to RGB, since the rewritten picture is labelled DeviceGray or DeviceRGB
                const cs = pix.getColorSpace();
                if (!cs || !(cs.isGray() || cs.isRGB())) pix = keep(pix.convertToColorSpace(mupdf.ColorSpace.DeviceRGB, false));

                // a soft mask must get exactly the new pixel size: check first that it can be rewritten
                const hasMask = sm.isIndirect();
                let maskPix = null;
                if (hasMask && shrink) {
                    maskPix = keep(keep(pdf.loadImage(sm)).toPixmap());
                    if (maskPix.getAlpha() || !maskPix.getColorSpace() || maskPix.getColorSpace().getNumberOfComponents() !== 1) { st.kept++; return; }
                }
                const graphics = !wasJPEG && (hasMask || colourCount(pix) <= GRAPHICS_COLOURS);
                if (graphics) {
                    if (!shrink) { st.kept++; return; } // already lossless at its size: MuPDF's save recompresses it
                    pix = keep(scaled(pix, nw, nh));
                    writeLossless(pdf, ref, pix);
                    st.lossless++;
                } else {
                    pix = keep(scaled(pix, nw, nh));
                    const jpg = pix.asJPEG(level.q);
                    if (jpg.length >= raw * 0.9) { st.kept++; return; }
                    writeJPEG(pdf, ref, pix, jpg);
                    st.jpeg++;
                }
                if (maskPix && (pix.getWidth() !== w || pix.getHeight() !== h)) {
                    writeLossless(pdf, sm, keep(scaled(maskPix, pix.getWidth(), pix.getHeight())));
                    st.masks++;
                }
            } catch (e) {
                st.kept++;
            } finally {
                free(...new Set(tmp));
            }
        });
        free(...hold);
    }

    progress("save", 0, 1);
    // fonts of a fillable form may be needed for letters typed later: keep them whole then
    if (st.form) st.fontsKept = true;
    else try { pdf.subsetFonts(); } catch (e) { st.fontsKept = true; }
    const opts = "garbage=deduplicate,compress,compress-fonts,compress-images,objstms=yes";
    const out = pdf.saveToBuffer(opts).asUint8Array().slice();
    progress("save", 1, 1);
    return { out, st };
}
