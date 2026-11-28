# The Switzerland page's script

The map of /switzerland/ (layouts/switzerland/list.html) runs one ES module made of these parts, joined in this order
by the template (the list is written out there; add a new part to it). They share one scope, so a function of one part
can call another's. Check after a change: `cat assets/js/switzerland/[0-9]*.js > /tmp/ch.mjs && node --check /tmp/ch.mjs`.

| Part | What it does |
|---|---|
| 00-core | constants, shared state, helpers (cards' small builders, LV95 formulas), the first map's style, start(), the three base maps, the modes (one at a time), the left sheets, the map controls |
| 10-compare | Then and now (a second map with an old national map, clipped at the divider) |
| 20-terrain | 3D (swisstopo terrain) and the sun (sun position, hillshade from that direction) |
| 30-layers | the Layers panel: summits, trails, slopes, ski and snowshoe routes, glaciers (with Go to), avalanche bulletin (SLF) |
| 40-cards | what a tap shows: profile point, summit, avalanche region, snow station, canton |
| 50-profile | the elevation profile (swisstopo profile service) with distance, climb, descent and DIN 33466 walking time |
| 60-live | Weather now (MeteoSwiss stations, a station's 10-minute values on a tap), snow cover from space (NASA GIBS, recoloured through chsnow://) and the nearest public transport stop on summit and cave cards |
| 62-visitors | Visitors (St. Gallen guests): places with pins and cards, Ostwind tickets and area, next departures and weather |
| 70-search-share | place search (swisstopo search service) and the view in the address (#lat,lon,zoom,bearing,pitch,map[,3d]), so a copied link reopens it |
| 80-hud | the panels fade out while the map moves and come back when it stops |
| 90-boot | wiring of the controls, the facts drawer, and the question before anything loads |

Not a part: `terrain-worker.js`, a worker of its own (started by 20-terrain), which turns swisstopo's terrain into the
height images of 3D off the main thread. Check it with `node --check assets/js/switzerland/terrain-worker.js`.

Every host the parts contact is listed in the page's Content-Security-Policy (layouts/partials/head.html, section
switzerland); a new host needs a line there, in the question (layouts/partials/switzerland/consent.html) and on the
privacy page. Text from these services is always set with textContent, never as HTML.

Known and accepted (security review 2026-11-28): MapLibre runs its worker from its own file (worker-src 'self'), and a
page's meta CSP does not reach such a worker (the same holds for terrain-worker.js, which fetches only swisstopo's
terrain host and checks that the tile addresses stay on it); nothing that reaches the worker comes from outside (all its URLs are this
site's or fixed hosts). To close it, start the worker from a blob: module and allow worker-src blob:.
