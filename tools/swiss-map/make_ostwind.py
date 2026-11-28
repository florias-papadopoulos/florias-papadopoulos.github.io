#!/usr/bin/env python3
"""The area of the OSTWIND fare network for the Switzerland page's Visitors sheet (static/switzerland/ostwind.json).

Source: SBB's "Tarifverbundkarte" (one polygon per municipality, field partners), open data on opendata.swiss:
  https://sbb.opendatasoft.com/api/v2/catalog/datasets/tarifverbundkarte/exports/geojson   (about 4.5 MB)
Download it, then run `python3 -I tools/swiss-map/make_ostwind.py <file.geojson> [<liechtenstein.json>]`. The
municipalities whose partners include Ostwind (some shared with ZVV) are merged into one outline: a border two of them
share cancels out, the others are chained into rings, which are then simplified to about 50 m.

Liechtenstein (LIEmobil, Ostwind zones 301 to 307) is not in SBB's dataset. Its outline comes from swisstopo's
swissBOUNDARIES3D, through api3 (the answer saved as a file):
  https://api3.geo.admin.ch/rest/services/api/MapServer/identify?geometryType=esriGeometryPoint&geometry=9.52,47.14&sr=4326&layers=all:ch.swisstopo.swissboundaries3d-land-flaeche.fill&tolerance=0&returnGeometry=true&geometryFormat=geojson
The two datasets draw the Rhine border with different points, so it is joined loosely: Liechtenstein is a part of
its own in the shaded area, and on the outline the stretches of either border that lie within 120 m of the other are
left out, so no line runs between St. Gallen and Liechtenstein.
"""
import collections, json, os, sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'switzerland', 'ostwind.json')
d = json.load(open(SRC))
sel = [f for f in d['features'] if f.get('geometry') and 'Ostwind' in str(f['properties'].get('partners') or '').split(',')]


def rings(g):
    return g['coordinates'] if g['type'] == 'Polygon' else [r for p in g['coordinates'] for r in p]


R = lambda p: (round(p[0], 6), round(p[1], 6))
count = collections.Counter()
for f in sel:
    for r in rings(f['geometry']):
        for a, b in zip(r, r[1:]):
            a, b = R(a), R(b)
            if a != b:
                count[frozenset((a, b))] += 1
outer = [tuple(e) for e, n in count.items() if n == 1]
nbr = collections.defaultdict(list)
for a, b in outer:
    nbr[a].append(b)
    nbr[b].append(a)
used, loops = set(), []
for a, b in outer:
    if frozenset((a, b)) in used:
        continue
    ring, prev, cur = [a], a, b
    used.add(frozenset((a, b)))
    while cur != a:
        ring.append(cur)
        nxt = next((n for n in nbr[cur] if frozenset((cur, n)) not in used), None)
        if nxt is None:
            break
        used.add(frozenset((cur, nxt)))
        prev, cur = cur, nxt
    ring.append(a)
    if len(ring) >= 4:
        loops.append(ring)


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    L = (dx * dx + dy * dy) ** 0.5 or 1e-12
    i, dmax = 0, -1
    for k in range(1, len(pts) - 1):
        x, y = pts[k]
        dd = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L
        if dd > dmax:
            i, dmax = k, dd
    if dmax <= tol:
        return [pts[0], pts[-1]]
    return dp(pts[:i + 1], tol)[:-1] + dp(pts[i:], tol)


def simplify(ring, tol=0.0006):
    m = len(ring) // 2
    a = dp(ring[:m + 1], tol)[:-1] + dp(ring[m:], tol)
    return [[round(x, 5), round(y, 5)] for x, y in a]


def area(r):
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(r, r[1:])) / 2


loops = [simplify(r) for r in loops]
loops = [r for r in loops if len(r) >= 4 and abs(area(r)) > 1e-6]
def inside(pt, r):
    x, y = pt
    c = False
    for (x1, y1), (x2, y2) in zip(r, r[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


# a ring inside another is a hole (the German enclave Buesingen; the Walensee, whose boats need their own ticket),
# the others are parts of their own (Schaffhausen's Ruedlingen and Buchberg)
loops.sort(key=lambda r: -abs(area(r)))
parts = []
for r in loops:
    host = next((p for p in parts if inside(r[0], p[0])), None)
    if host:
        host.append(r)
    else:
        parts.append([r])
if len(sys.argv) > 2:
    import math
    li = json.load(open(sys.argv[2]))['results'][0]['geometry']
    li_rings = [simplify([tuple(c) for c in poly[0]]) for poly in li['coordinates']]
    K = math.pi / 180

    def metres(p, a, b):
        cx, cy = math.cos(p[1] * K) * 6371000 * K, 6371000 * K
        ax, ay, bx, by = (a[0] - p[0]) * cx, (a[1] - p[1]) * cy, (b[0] - p[0]) * cx, (b[1] - p[1]) * cy
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, -(ax * dx + ay * dy) / ((dx * dx + dy * dy) or 1)))
        return math.hypot(ax + t * dx, ay + t * dy)

    def near(p, rings, tol=120):
        return any(metres(p, a, b) < tol for r in rings for a, b in zip(r, r[1:])
                   if min(a[0], b[0]) - 0.003 < p[0] < max(a[0], b[0]) + 0.003 and min(a[1], b[1]) - 0.003 < p[1] < max(a[1], b[1]) + 0.003)

    def cut(r, other):
        # the ring as lines, without the stretches that run along the other outline
        out, cur = [], []
        for a, b in zip(r, r[1:]):
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            if near(mid, other):
                if len(cur) > 1:
                    out.append(cur)
                cur = []
            else:
                cur = cur or [a]
                cur.append(b)
        if len(cur) > 1:
            out.append(cur)
        return out

    edges = [l for r in loops for l in cut(r, li_rings)] + [l for r in li_rings for l in cut(r, loops)]
    parts += [[r] for r in li_rings]
else:
    edges = loops
geo = {'type': 'FeatureCollection', 'features': [
    {'type': 'Feature', 'properties': {'kind': 'area'}, 'geometry': {'type': 'MultiPolygon', 'coordinates': parts}},
    {'type': 'Feature', 'properties': {'kind': 'edge'}, 'geometry': {'type': 'MultiLineString', 'coordinates': [[list(c) for c in l] for l in edges]}}]}
json.dump(geo, open(OUT, 'w'), separators=(',', ':'))
print(len(sel), 'municipalities,', len(loops), 'rings,', os.path.getsize(OUT) // 1024, 'KB ->', OUT)
