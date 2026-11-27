# Engines

Third-party programs that run in the visitor's browser, served unchanged from this folder (Hugo copies
`static/` as it is). Each one sits in a folder named with its version, so a new version is a new folder
and no browser keeps an old cached copy. Never edit these files: replace the whole folder.

## mupdf-1.28.6

MuPDF, the PDF engine of DocTools (/doctools/), compiled to WebAssembly by its makers.

- Source of these files: the npm package `mupdf` 1.28.6, `dist/` folder, files copied unchanged
  (tarball checked against the registry's integrity hash
  `sha512-LsNqk3a9TNJGjJKWVOUK1YMlWJNxFh8bIf+SSxGI+A+WXDlkwc4R2PW/n1qINb4YpqZfOazjPdRqw95WpmCrfw==`).
- Made by Artifex Software, Inc. Licence: GNU Affero General Public License 3 or later (`LICENSE`).
- Source code: https://cgit.ghostscript.com/mupdf.git/ (tag 1.28.x), JavaScript library:
  https://github.com/ArtifexSoftware/mupdf.js
- SHA-256 of the served files:

```
5d237eadcb9640584e0050f6f958e547887b7a54d80a04043e12be9420931076  mupdf.js
44048fd1374dc17677947d8434338d0620f9e2581ab5f371904a931388dc531b  mupdf-wasm.js
931bc5fd7bda904582289e4f1428d0c89d95a90d2bba0be99a773cdbb446e027  mupdf-wasm.wasm
```

Check: `cd static/engines/mupdf-1.28.6 && sha256sum mupdf.js mupdf-wasm.js mupdf-wasm.wasm`

To update: `npm pack mupdf@<version>` in a scratch folder, check `npm view mupdf@<version> dist.integrity`
against the tarball, copy `dist/mupdf.js`, `dist/mupdf-wasm.js`, `dist/mupdf-wasm.wasm` and `LICENSE`
into a new folder `mupdf-<version>`, update `params.doctools.mupdf` in config.yml and this file, run the
DocTools tests (assets/js/doctools/README.md), then delete the old folder.

## maplibre-gl-6.16.0, maplibre-gl-3dtiles-terrain-0.1.0, quantized-mesh-decoder-1.2.8

The map engine of the Switzerland page (/switzerland/, assets/js/switzerland/map.js), loaded only after the visitor
agreed to load swisstopo's maps (folder names in `params.switzerland`, config.yml).

- MapLibre GL JS 6.16.0: the npm package `maplibre-gl`, `dist/maplibre-gl.mjs`, `dist/maplibre-gl-worker.mjs`,
  `dist/maplibre-gl.css` and `LICENSE.txt`, copied unchanged (registry integrity
  `sha512-gApO66EMtoDZuio680RUBvskR7ahFd/NNhLN4tBAs+Y7FeT4gQV8zVFgYVMRmFxQznOEzecW19w6xOd9XjZjiA==`, matched).
  Licence: BSD 3-Clause. Source: https://github.com/maplibre/maplibre-gl-js
- maplibre-gl-3dtiles-terrain 0.1.0 (turns swisstopo's quantized-mesh terrain into MapLibre terrain): `src/index.js`
  and `LICENSE` (registry integrity
  `sha512-LNP5Hee7Ev6cktNrjyJThJVInDM15TxcdlWIRKXaSzZIysmr9CHkBg2OEmKBN29su8s7G3L47xCFr6u7z0vwlA==`, matched).
  Licence: BSD 3-Clause.
- @here/quantized-mesh-decoder 1.2.8: `src/index.js` and `LICENSE` (registry integrity
  `sha512-fYOgpANVVMT38cHlCAIqzUun0cvhWGjpTI+jCbFtdfWgE24+sHtoCqPFvue6UhC9LA64j//lrdMKtryUvskqiA==`, matched).
  Licence: MIT, © HERE Europe B.V.
- SHA-256 of the served files:

```
fbbdf8ddd9a48e49059a4be6795a4f214a711314bb5809f72d3730b48e7897e3  maplibre-gl-6.16.0/maplibre-gl.mjs
0bf06492bdb7ba3d4132b78e435621bfba60d5250967991c02b1a73affea8cd5  maplibre-gl-6.16.0/maplibre-gl-worker.mjs
a90798a1953017790e590f7e1bd35ff103a8a4263972cb47290b78adf86f8c20  maplibre-gl-6.16.0/maplibre-gl.css
009a1291f5ee3e62fed989b3b9a2a668a7ab4bbd9fcc76b7f699fac03bb40358  maplibre-gl-3dtiles-terrain-0.1.0/index.js
a6ec1aa35ffe71025a70a701f5c7f1e9730d3ee3407c1114ffb7b37827cc80fc  quantized-mesh-decoder-1.2.8/index.js
```

To update one: `npm pack <name>@<version>` in a scratch folder, check `npm view <name>@<version> dist.integrity`
against the tarball, copy the same files into a new folder, change `params.switzerland` in config.yml and this file,
check the page (3D, Swipe, Then and now), then delete the old folder.
