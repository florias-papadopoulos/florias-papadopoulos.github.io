# Satellites, live (/phd/satellites/)

A globe with every object of a few CelesTrak groups, moved in time with SGP4 in the browser, and a rough screening
for close approaches. Page: `content/phd/satellites/index.md` (text and sources), layout `layouts/phd/satellites.html`
(groups, colours, controls), styles `assets/css/phd/satellites.css`.

| Bundle | Files (joined in this order by the layout) |
| --- | --- |
| Page script | `sgp4-entry.js` (through `js.Build`), `00-core.js`, `10-globe.js`, `20-page.js`, `30-approach.js` |
| Worker (`data-worker`) | `sgp4-entry.js` (through `js.Build`), `00-core.js`, `50-worker.js` |

| File | What is in it |
| --- | --- |
| `sgp4-entry.js` | Imports the parts of satellite.js the page needs and sets `self.SATJS`; Hugo's `js.Build` bundles it (IIFE) |
| `vendor/satellite.js/` | satellite.js 7.1.0 (MIT), the needed files of its `dist/` unchanged; see its `README.md` |
| `00-core.js` | `SAT`: CelesTrak CSV, SGP4 records and states (TEME, km), sidereal time, Sun direction, orbit facts, Hermite interpolation |
| `10-globe.js` | `GLOBE`: plain WebGL 1, the Earth (Blue Marble, lit by the Sun), one points buffer, thick orbit lines, rings, camera, picking |
| `20-page.js` | `SATPAGE`: loading, the clock (pause, 1x to 3600x, now), sampled propagation with interpolation, the picked object's panel |
| `30-approach.js` | `SATCA`: the close approaches panel, talks to the worker, shows a pair at its closest moment |
| `50-worker.js` | The screening (grid of cells every 15 s between SGP4 samples 5 min apart, then refined with SGP4) |

Data: `static/data/sat/<group>.csv` and `meta.json`, written by `tools/sat-data/fetch.sh` (with `check.py`), which the
GitHub workflow runs daily before the build; the committed files are the snapshot used locally and whenever a download
fails. Visitors' browsers load only files of this site.

Keep each file under about 600 lines. Check the syntax with `node --check assets/js/sat/00-core.js` (and so on for the
numbered parts).
