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
