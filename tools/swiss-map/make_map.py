#!/usr/bin/env python3
"""Draws the Switzerland page's still map (static/switzerland/map.svg, shown behind the question before the live map
loads) and the canton outlines of the live map (static/switzerland/cantons.json) from open geodata, once.

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
from xml.sax.saxutils import escape   # names from the services are written into SVG text: escaped

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'switzerland', 'map.svg')
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
out.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">' % (W + 2 * PAD, round(VH)))
out.append('<title>Map of Switzerland with its 26 cantons and main lakes</title>')
out.append('<style>.ch-land{fill:#ecebe4}.ch-cantons path{fill:none;stroke:#fff;stroke-width:1.6}.ch-lakes path{fill:#a9cbe6}'
           '.ch-border{fill:none;stroke:#9aa3ad;stroke-width:1.2}.ch-labels text{font:600 13px sans-serif;fill:#8a94a0;'
           'text-anchor:middle;dominant-baseline:middle}</style>')
out.append('<defs><clipPath id="ch-clip"><path d="%s"/></clipPath></defs>' % country)
out.append('<path class="ch-land" d="%s"/>' % country)
out.append('<g class="ch-cantons">')
for ak, name, d, _ in cantons:
    out.append('<path data-canton="%s" d="%s"><title>%s</title></path>' % (escape(ak), d, escape(name)))
out.append('</g>')
out.append('<g class="ch-lakes" clip-path="url(#ch-clip)">')
for name, d in lakes:
    out.append('<path d="%s"><title>%s</title></path>' % (d, escape(name)))
out.append('</g>')
out.append('<path class="ch-border" d="%s"/>' % country)
out.append('<g class="ch-labels" aria-hidden="true">')
for ak, _, _, (cx, cy) in cantons:
    out.append('<text x="%.0f" y="%.0f">%s</text>' % (cx, cy, escape(ak)))
out.append('</g>')
out.append('</svg>')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write('\n'.join(out) + '\n')
print(OUT, os.path.getsize(OUT), 'bytes,', len(lakes), 'lakes')

# the cantons for the live map (assets/js/switzerland/map.js): outlines in longitude/latitude, simplified to about
# 100 m, with the canton's code, name and area (swissBOUNDARIES3D 'flaeche', in hectares) -> static/switzerland/cantons.json
GJ = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'switzerland', 'cantons.json')


def simplify_ll(ring, tol=0.0012):
    m = len(ring) // 2
    a = dp([tuple(p) for p in ring[:m + 1]], tol)[:-1] + dp([tuple(p) for p in ring[m:]], tol)
    return [[round(x, 4), round(y, 4)] for x, y in a]


feats = []
for i in range(1, 27):
    f = json.load(open(os.path.join(SRC, 'k%d.json' % i)))['feature']
    pp = []
    for p in polys(f['geometry']):
        rings = [simplify_ll(r) for r in p]
        rings = [r for r in rings if len(r) >= 4]
        if rings:
            pp.append(rings)
    feats.append({'type': 'Feature', 'properties': {'code': f['properties']['ak'], 'name': f['properties']['name'],
                  'area_ha': f['properties']['flaeche']}, 'geometry': {'type': 'MultiPolygon', 'coordinates': pp}})
os.makedirs(os.path.dirname(GJ), exist_ok=True)
json.dump({'type': 'FeatureCollection', 'features': feats}, open(GJ, 'w'), separators=(',', ':'), ensure_ascii=False)
print(GJ, os.path.getsize(GJ), 'bytes')

# the country border as a line for the live map (shown on the aerial photo and the relief), simplified to about 100 m
BJ = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'switzerland', 'border.json')
lines = [simplify_ll(r) for p in polys(land) for r in p]
json.dump({'type': 'Feature', 'properties': {}, 'geometry': {'type': 'MultiLineString', 'coordinates': [l for l in lines if len(l) >= 4]}},
          open(BJ, 'w'), separators=(',', ':'))
print(BJ, os.path.getsize(BJ), 'bytes')
