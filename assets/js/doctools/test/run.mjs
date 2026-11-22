// DocTools tests: compress real PDFs from this site with the served MuPDF and check the results.
// Needs Node 20 or newer (MuPDF's module uses top-level await). Run from the repository root:
//   node assets/js/doctools/test/run.mjs [out-folder]
// With an out folder, the compressed files are written there (to look at them, e.g. with pdftoppm).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const cfg = fs.readFileSync(path.join(root, "config.yml"), "utf8").match(/mupdf:\s*"([^"]+)"/);
if (!cfg) throw new Error("params.doctools.mupdf not found in config.yml");
const mupdf = await import(pathToFileURL(path.join(root, "static", cfg[1])).href);
const { compress, LEVELS } = await import(pathToFileURL(path.join(root, "assets/js/doctools/compress.js")).href);

const files = [
    "_pages/projects/Master-Semester1/numerical_methods_for_ODE_and_PDE/chaotic_presentation.pdf",
    "_pages/projects/Master-Semester1/numerical_methods_for_ODE_and_PDE/solving_chaotic.pdf",
    "_pages/projects/Master-Semester3/master_thesis/msc-thesis.pdf",
    "_pages/projects/Bachelor/bachelor_thesis/cryptography_in_the_post_quantum_era_BCsThesis.pdf",
];
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });

let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log("  FAIL " + what); } };
const mb = (n) => (n / 1048576).toFixed(2) + " MB";

for (const f of files) {
    const bytes = fs.readFileSync(path.join(root, f));
    const name = path.basename(f, ".pdf");
    for (const [lv, level] of Object.entries(LEVELS)) {
        const t = performance.now();
        const { out, st } = compress(mupdf, bytes, level);
        const ms = Math.round(performance.now() - t);
        console.log(`${name} ${lv}: ${mb(bytes.length)} -> ${mb(out.length)} in ${ms} ms ${JSON.stringify(st)}`);
        check(out.length < bytes.length, "not smaller");
        const back = mupdf.Document.openDocument(out, "application/pdf");
        check(back.countPages() === st.pages, `page count ${back.countPages()} != ${st.pages}`);
        for (let i = 0; i < back.countPages(); i++) {
            try { const pg = back.loadPage(i); pg.toPixmap(mupdf.Matrix.scale(0.2, 0.2), mupdf.ColorSpace.DeviceRGB, false).destroy(); pg.destroy(); }
            catch (e) { check(false, `page ${i + 1} does not render: ${e}`); }
        }
        // the text is unchanged
        const text = (d, i) => d.loadPage(i).toStructuredText().asText().replace(/\s+/g, " ");
        const orig = mupdf.Document.openDocument(bytes, "application/pdf");
        for (const i of [0, Math.floor(st.pages / 2), st.pages - 1]) check(text(orig, i) === text(back, i), `text of page ${i + 1} changed`);
        // bookmarks and links are kept
        const marks = (o) => (o || []).reduce((n, x) => n + 1 + marks(x.down), 0);
        const links = (d) => { let n = 0; for (let i = 0; i < d.countPages(); i++) { const pg = d.loadPage(i); n += pg.getLinks().length; pg.destroy(); } return n; };
        check(marks(orig.loadOutline()) === marks(back.loadOutline()), "bookmarks changed");
        check(links(orig) === links(back), "links changed");
        orig.destroy(); back.destroy();
        if (outDir) fs.writeFileSync(path.join(outDir, `${name}_${lv}.pdf`), out);
    }
}

console.log(fails ? `${fails} check(s) failed` : "all checks passed");
process.exit(fails ? 1 : 0);
