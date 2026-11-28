#!/usr/bin/env python3
"""The Switzerland page's labels: the summits (name, height, rank) and the towns (name, class, rank) of swisstopo's vector
tiles (ch.swisstopo.base.vt, layers mountain_peak and place), read once at zoom 10 over Switzerland and written as two
small files the page loads instead of the vector tiles themselves (those carry every road, building and field, 80 to
180 KB a tile, which the browser had to download and decode for a few names):
  static/switzerland/peaks.json   [[lon, lat, name, height_m, rank], ...]
  static/switzerland/towns.json   [[lon, lat, name, class], ...]   (class: city, town or village)
Run: `PYTHONPATH=<mapbox-vector-tile> python3 tools/swiss-map/make_labels.py` (about 120 tiles, a few minutes).
"""
import gzip, json, math, os, sys, urllib.request
import mapbox_vector_tile as mvt

Z = 10
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'switzerland')
W, S, E, N = 5.90, 45.78, 10.55, 47.85
n = 2 ** Z


def tile_xy(lon, lat):
    return int((lon + 180) / 360 * n), int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)


def lonlat(x, y, gx, gy, ext):
    lon = (x + gx / ext) / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + (ext - gy) / ext) / n))))
    return round(lon, 5), round(lat, 5)


x0, y0 = tile_xy(W, N)
x1, y1 = tile_xy(E, S)
peaks, towns = {}, {}
for x in range(x0, x1 + 1):
    for y in range(y0, y1 + 1):
        url = 'https://vectortiles.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/%d/%d/%d.pbf' % (Z, x, y)
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers={'Accept-Encoding': 'gzip'}), timeout=60).read()
        except Exception as e:
            print('skip', x, y, e, file=sys.stderr)
            continue
        if d[:2] == b'\x1f\x8b':
            d = gzip.decompress(d)
        t = mvt.decode(d)
        L = t.get('mountain_peak') or {}
        ext = L.get('extent', 4096)
        for f in L.get('features', []):
            p = f['properties']
            name, ele = p.get('name:latin') or p.get('name'), p.get('ele')
            if not name or ele is None or f['geometry']['type'] != 'Point':
                continue
            lon, lat = lonlat(x, y, *f['geometry']['coordinates'], ext)
            if W <= lon <= E and S <= lat <= N:
                peaks[(name, round(lon, 3), round(lat, 3))] = [lon, lat, name, int(round(ele)), int(p.get('rank') or 99)]
        L = t.get('place') or {}
        ext = L.get('extent', 4096)
        for f in L.get('features', []):
            p = f['properties']
            name, cls = p.get('name:latin') or p.get('name'), p.get('class')
            if not name or cls not in ('city', 'town', 'village') or f['geometry']['type'] != 'Point':
                continue
            lon, lat = lonlat(x, y, *f['geometry']['coordinates'], ext)
            if W <= lon <= E and S <= lat <= N:
                towns[(name, round(lon, 3), round(lat, 3))] = [lon, lat, name, cls]
        print('.', end='', flush=True)
print()
P = sorted(peaks.values(), key=lambda r: (r[4], -r[3]))
T = sorted(towns.values(), key=lambda r: ('city', 'town', 'village').index(r[3]))
json.dump(P, open(os.path.join(OUT, 'peaks.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump(T, open(os.path.join(OUT, 'towns.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(P), 'summits,', len(T), 'towns;', os.path.getsize(os.path.join(OUT, 'peaks.json')) // 1024, 'KB and',
      os.path.getsize(os.path.join(OUT, 'towns.json')) // 1024, 'KB')
print('ranks:', {r: sum(1 for p in P if p[4] == r) for r in sorted(set(p[4] for p in P))})
