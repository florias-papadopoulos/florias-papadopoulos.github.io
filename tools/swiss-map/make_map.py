#!/usr/bin/env python3
"""Draws the Switzerland page's map (layouts/partials/switzerland/map.svg) from open geodata, once; the page then
serves it as part of its HTML, so visitors' browsers contact no map server.

Sources (download into a folder, then run `python3 -I tools/swiss-map/make_map.py <folder>`):
  land.json     swisstopo swissBOUNDARIES3D, country border:
                https://api3.geo.admin.ch/rest/services/api/MapServer/ch.swisstopo.swissboundaries3d-land-flaeche.fill/CH?geometryFormat=geojson&sr=4326
  k1..k26.json  the same for the 26 cantons (layer ch.swisstopo.swissboundaries3d-kanton-flaeche.fill, ids 1 to 26)
  seen/<id>.json the lakes of at least 0.8 km2 from FOEN/BAFU's VECTOR25 lakes (layer ch.bafu.vec25-seen): the ids
                from .../MapServer/identify?geometry=2480000,1070000,2840000,1300000&geometryType=esriGeometryEnvelope
                &layers=all:ch.bafu.vec25-seen&tolerance=0&returnGeometry=false&sr=2056&limit=200 (attribute
                seeflaeche_km2), each from .../MapServer/ch.bafu.vec25-seen/<id>?geometryFormat=geojson&sr=4326
Federal geodata (geo.admin.ch) is free to use with the source named is free to use with the source named (credited on the page and in LICENSE.md).
"""
import json, math, os, sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'layouts', 'partials', 'switzerland', 'map.svg')
W = 1000.0                       # viewBox width; height follows the country's shape
LAT0 = 46.8                      # projection: plain equirectangular, longitudes scaled by cos(46.8 deg)
K = math.cos(math.radians(LAT0))
TOL = 0.55                       # simplification tolerance in viewBox units
MINW, MAXW, MINN, MAXN = 5.9564, 10.4921, 45.818, 47.8085  # bounding box of Switzerland, a little wider
X0, X1 = MINW * K, MAXW * K
S = W / (X1 - X0)
H = (MAXN - MINN) * S
PAD = 12


def xy(lon, lat):
    return ((lon * K - X0) * S + PAD, (MAXN - lat) * S + PAD)


def dp(pts, tol):
    """Douglas-Peucker on a list of (x, y), iterative."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-9
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / L
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack.append((a, idx)); stack.append((idx, b))
    return [p for p, k in zip(pts, keep) if k]


def ring_path(ring, tol=TOL):
    raw = [xy(lon, lat) for lon, lat in ring]
    # a closed ring has the same first and last point, so split it at its middle and simplify both halves
    m = len(raw) // 2
    pts = dp(raw[:m + 1], tol)[:-1] + dp(raw[m:], tol)
    if len(pts) < 4:
        return ''
    return 'M' + 'L'.join('%.1f %.1f' % p for p in pts) + 'Z'


def polys(geom):
    return geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]


def area(ring):
    return 0.5 * sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))


def label_point(ring):
    """area centroid of the largest ring, in viewBox units"""
    pts = [xy(lon, lat) for lon, lat in ring]
    A = area(pts) or 1e-9
    cx = sum((x1 + x2) * (x1 * y2 - x2 * y1) for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1])) / (6 * A)
    cy = sum((y1 + y2) * (x1 * y2 - x2 * y1) for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1])) / (6 * A)
    return cx, cy


land = json.load(open(os.path.join(SRC, 'land.json')))['feature']['geometry']
country = ''.join(ring_path(r) for p in polys(land) for r in p)

cantons = []
for i in range(1, 27):
    f = json.load(open(os.path.join(SRC, 'k%d.json' % i)))['feature']
    rings = [r for p in polys(f['geometry']) for r in p]
    d = ''.join(ring_path(r) for r in rings)
    big = max((p[0] for p in polys(f['geometry'])), key=lambda r: abs(area([xy(*c) for c in r])))
    cantons.append((f['properties']['ak'], f['properties']['name'], d, label_point(big)))

lakes = []
for fn in sorted(os.listdir(os.path.join(SRC, 'seen'))):
    f = json.load(open(os.path.join(SRC, 'seen', fn)))['feature']
    d = ''.join(ring_path(r, 0.35) for p in polys(f['geometry']) for r in p)
    if d:
        lakes.append((f['properties'].get('label') or f['properties'].get('name') or '', d))

VH = H + 2 * PAD
out = []
out.append('<svg class="ch-map" viewBox="0 0 %d %d" role="img" aria-labelledby="ch-map-title">' % (W + 2 * PAD, round(VH)))
out.append('<title id="ch-map-title">Map of Switzerland with its 26 cantons and main lakes</title>')
out.append('<defs><clipPath id="ch-clip"><path d="%s"/></clipPath></defs>' % country)
out.append('<path class="ch-land" d="%s"/>' % country)
out.append('<g class="ch-cantons">')
for ak, name, d, _ in cantons:
    out.append('<path data-canton="%s" d="%s"><title>%s</title></path>' % (ak, d, name))
out.append('</g>')
out.append('<g class="ch-lakes" clip-path="url(#ch-clip)">')
for name, d in lakes:
    out.append('<path d="%s"><title>%s</title></path>' % (d, name))
out.append('</g>')
out.append('<path class="ch-border" d="%s"/>' % country)
out.append('<g class="ch-labels" aria-hidden="true">')
for ak, _, _, (cx, cy) in cantons:
    out.append('<text x="%.0f" y="%.0f">%s</text>' % (cx, cy, ak))
out.append('</g>')
out.append('</svg>')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write('\n'.join(out) + '\n')
print(OUT, os.path.getsize(OUT), 'bytes,', len(lakes), 'lakes')
