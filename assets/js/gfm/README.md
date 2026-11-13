# Geometric Fuzzy Matching, to play with (/phd/gfm/)

The page `layouts/phd/gfm.html` (content `content/phd/gfm/index.md`, styles `assets/css/phd/gfm.css`) joins
these files in this order into one script:

| File | What is in it |
| --- | --- |
| `10-core.js` | The geometry, no drawing: regions on a 128 x 128 lattice (l_p balls, polygons, unions of rectangles), the Partitioner / CutAndFuse with residual points (Section 3 of the paper), the cost of a resolution counted from the protocol (Section 4), DASA strings for Alice and Bob (Section 2) |
| `20-map.js` | The base map (St. Gallen's old town from OpenStreetMap, rendered once into `static/img/phd/gfm-stgallen.webp`: 16 tiles at zoom 17, cropped to 640 x 640, 5 pixels per lattice unit, about 4 m; how it was made is at the top of the file), the 100 m scale bar, and the three ready regions on real places (the Kantonsschulpark, the cathedral, 100 m around St. Laurenzen) |
| `30-draw.js` | The map's layers and their paths: region, the Partitioner's stages, the lit piece, Bob's pin (a navy pin with a cat's face, its tip on his lattice point) |
| `40-panels.js` | The cost chart, the answer in each view, the DASA strings of the rectangle holding Bob |
| `50-app.js` | State, drawing tools, the step-by-step animation, slider, views, Bob's dragging and arrow keys. On touch screens one finger on the map scrolls the page; only Bob's handle (an HTML element over his pin) and the drawing tools take it, and a tap puts Bob there |

Tests of the geometry: `node assets/js/gfm/test/run.js` (every lattice point of a region covered exactly once by
rectangles and residual points, rectangles disjoint, inside and fully fused; DASA strings exactly the maximal complete
subtries, and Bob's strings match exactly when he is in the interval). Syntax of the bundle:
`cat assets/js/gfm/{10-core,20-map,30-draw,40-panels,50-app}.js | node --check -`. Keep each file under about 600 lines.

Visitors' browsers never fetch map tiles: the image is part of the site, and its attribution ("© OpenStreetMap contributors") sits on the map and in the note under it.
