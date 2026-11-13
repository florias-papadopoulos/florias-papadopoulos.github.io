# Geometric Fuzzy Matching, to play with (/phd/projects/gfm/)

The page `layouts/phd/gfm.html` (content `content/phd/projects/gfm/index.md`, styles `assets/css/phd/gfm.css`) joins
these files in this order into one script:

| File | What is in it |
| --- | --- |
| `10-core.js` | The geometry, no drawing: regions on a 128 x 128 lattice (l_p balls, polygons, unions of rectangles), the Partitioner / CutAndFuse with residual points (Section 3 of the paper), the cost of a resolution counted from the protocol (Section 4), DASA strings for Alice and Bob (Section 2) |
| `20-map.js` | The made-up town and the three ready regions (park, town hall, 100 m around the café) |
| `30-draw.js` | The map's layers and their paths: region, the Partitioner's stages, the lit piece, Bob |
| `40-panels.js` | The cost chart, the answer in each view, the DASA strings of the rectangle holding Bob |
| `50-app.js` | State, drawing tools, the step-by-step animation, slider, views, Bob's dragging and arrow keys |

Tests of the geometry: `node assets/js/gfm/test/run.js` (every lattice point of a region covered exactly once by
rectangles and residual points, rectangles disjoint, inside and fully fused; DASA strings exactly the maximal complete
subtries, and Bob's strings match exactly when he is in the interval). Syntax of the bundle:
`cat assets/js/gfm/{10-core,20-map,30-draw,40-panels,50-app}.js | node --check -`. Keep each file under about 600 lines.
