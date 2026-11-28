#!/usr/bin/env python3
"""The area of the OSTWIND fare network for the Switzerland page's Visitors sheet (static/switzerland/ostwind.json).

Source: SBB's "Tarifverbundkarte" (one polygon per municipality, field partners), open data on opendata.swiss:
  https://sbb.opendatasoft.com/api/v2/catalog/datasets/tarifverbundkarte/exports/geojson   (about 4.5 MB)
Download it, then run `python3 -I tools/swiss-map/make_ostwind.py <file.geojson>`. The municipalities whose partners
include Ostwind (some shared with ZVV) are merged into one outline: a border two of them share cancels out, the
others are chained into rings, which are then simplified to about 50 m. Liechtenstein, also in Ostwind, is not in the
dataset (the page says so).
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
geo = {'type': 'FeatureCollection', 'features': [
    {'type': 'Feature', 'properties': {'kind': 'area'}, 'geometry': {'type': 'MultiPolygon', 'coordinates': parts}},
    {'type': 'Feature', 'properties': {'kind': 'edge'}, 'geometry': {'type': 'MultiLineString', 'coordinates': loops}}]}
json.dump(geo, open(OUT, 'w'), separators=(',', ':'))
print(len(sel), 'municipalities,', len(loops), 'rings,', os.path.getsize(OUT) // 1024, 'KB ->', OUT)
