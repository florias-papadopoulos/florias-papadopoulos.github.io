# DocTools

The lab tab `/doctools/`: tools for documents that run entirely in the visitor's browser. Files are never
uploaded. For now there is one tool, Compress PDF (`/doctools/compress-pdf/`). The plan with the tools for later
is kept outside the repository (`__NotOnline/file-tools/plan.md`).

Licence: the code in this folder uses MuPDF and is under the GNU Affero General Public License 3 or later
(LICENSE.md). MuPDF is served unchanged from `static/engines/` (see its README.md).

## Files

- `compress.js`: the compression (MuPDF). `compress(mupdf, bytes, level, onProgress)`, levels in `LEVELS`.
  Lossless = MuPDF's rewrite and font subsetting; recommended and strong also shrink every picture to 150 or
  96 dpi at the largest size it is drawn (measured by drawing each page through a MuPDF Device). Photos become
  JPEG; pictures with few colours or with transparency stay lossless (scaled by MuPDF's drawing engine, which
  averages pixels), soft masks are resized with their picture. MuPDF objects are freed as soon as possible:
  without that, a few big files run out of WebAssembly memory and everything gets slow.
- `worker.js`: the Web Worker around it. Joined after `compress.js` into one ES module by
  `layouts/doctools/single.html`; it loads MuPDF (`params.doctools.mupdf` in config.yml) on the first job.
- `page.js`: the page. Files, level, progress, results with a Download link (a blob: URL), and the
  "Where your files went" box listing every request made since the first file was chosen (the page's own,
  through PerformanceObserver, and the worker's, which it reports with each result).
- `test/run.mjs`: compresses four PDFs of this site at each level and checks: smaller, same page count, every
  page renders, text unchanged, bookmarks and links kept. Needs Node 20 or newer:
  `node assets/js/doctools/test/run.mjs [out-folder]`.

## Privacy rules (do not loosen)

- The page's Content-Security-Policy (`layouts/partials/head.html`, section `doctools`) is the site's policy plus
  `'wasm-unsafe-eval'` (compiling WebAssembly, no JavaScript eval) and `worker-src 'self' blob:`. Requests can only
  go to this site and the visit counter; the counter gets the page name, as on every page.
- **Workers are started from a blob: URL** whose only line imports the worker module. Tested in Firefox on
  2026-11-22: a worker created from its own URL gets the CSP of its HTTP headers, and GitHub Pages sends none,
  so such a worker could send requests anywhere; a blob worker inherits the page's policy and is blocked. Firefox
  checks the worker's imports against worker-src too, which is why `'self'` is in it.
- No file content is stored (no localStorage, IndexedDB or service worker); blob URLs are revoked when a file is
  removed or recompressed.

## Adding a tool

A page `content/doctools/<tool>.md` (title, `short`, the "How it works" text) and its code here. The single
layout is still written for Compress PDF; when a second tool comes, give each tool its own script and form.
Add the page to the counter's list (`PAGES` in tools/workers/stats/worker.js, re-pasted by the owner).
