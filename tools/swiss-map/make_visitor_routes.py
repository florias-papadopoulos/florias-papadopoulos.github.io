#!/usr/bin/env python3
"""The hike lines of the Switzerland page's Visitors places (static/switzerland/visitor-routes.json).

Each hike is a list of waypoints (lon, lat), taken from the research in __NotOnline/switzerland-guests/catalogue.md
(swisstopo names, OSM, the official route descriptions). BRouter (brouter.de, OpenStreetMap data, profile
hiking-mountain) joins them along the trails, and each stretch keeps its difficulty from OSM's sac_scale, as the
page's Route tool does: 1 = hiking (T1, yellow), 2 = mountain hiking (T2 to T3), 3 = alpine (T4 and up).
Run `python3 -I tools/swiss-map/make_visitor_routes.py [id ...]` (one request at a time, with pauses: a volunteer
server); with ids, only those hikes are made again and the others in the file are kept.
The page loads the file only when a hike's card opens; map data (c) OpenStreetMap contributors, ODbL.
"""
import json, os, time, urllib.request

HIKES = {
    'weieren': [(9.37020, 47.42320), (9.39048, 47.42264), (9.41390, 47.41837), (9.41537, 47.42259)],
    # across the Haggenbrücke (the Ganggelibrugg, OSM way 882503350) from its north end to its south end
    'haggen': [(9.35953, 47.40758), (9.35208, 47.40758), (9.33945, 47.40125), (9.33925, 47.39780)],
    'ebenalp': [(9.41221, 47.28482), (9.41362, 47.28305), (9.39172, 47.27635), (9.41221, 47.28482)],
    'seealpsee': [(9.42761, 47.28693), (9.41414, 47.27245)],
    'faelensee': [(9.45327, 47.26067), (9.42477, 47.24730), (9.42679, 47.25367), (9.45781, 47.27091),
                  (9.45682, 47.27382), (9.45681, 47.29669)],
    'flumserberg': [(9.25465, 47.06998), (9.24948, 47.06813), (9.22147, 47.06247), (9.22126, 47.05519),
                    (9.23210, 47.08502), (9.25041, 47.08406), (9.28130, 47.09414)],
    'pizol': [(9.41708, 46.97891), (9.42362, 46.97891), (9.39782, 46.97152), (9.39300, 46.97606),
              (9.39688, 46.98413), (9.40054, 46.99453), (9.41364, 46.99087)],
    'batoeni': [(9.34316, 46.98920), (9.35305, 46.95832)],
    'braunwald': [(8.99859, 46.93871), (9.00402, 46.95267), (8.99986, 46.96825), (9.01674, 46.97773),
                  (9.02277, 46.96998)],
    'flims': [(9.28116, 46.82491), (9.27474, 46.82666), (9.28320, 46.82124), (9.29288, 46.82114),
              (9.31980, 46.81264), (9.32456, 46.80522), (9.28872, 46.82592)],
    'lenzerheide': [(9.59736, 46.74255), (9.59767, 46.76666)],
    'joeriseen': [(9.94146, 46.76576), (9.96138, 46.76767), (9.96785, 46.77863), (9.95590, 46.78295),
                  (9.94146, 46.76576)],
    'corvatsch': [(9.82343, 46.43211), (9.83986, 46.42963), (9.82343, 46.43211), (9.78406, 46.42227)],
    'luenersee': [(9.75472, 47.05967), (9.76350, 47.05000), (9.75182, 47.03677), (9.74450, 47.05150),
                  (9.75472, 47.05967)],
    # not the Aare Gorge: its walkway is not routable in OSM, so BRouter takes the road above it
}
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'switzerland', 'visitor-routes.json')


def brouter(pts):
    ll = '|'.join(f'{x:.5f},{y:.5f}' for x, y in pts)
    url = 'https://brouter.de/brouter?lonlats=' + ll + '&profile=hiking-mountain&alternativeidx=0&format=geojson'
    req = urllib.request.Request(url, headers={'User-Agent': 'map-tools'})
    for attempt in range(4):
        text = urllib.request.urlopen(req, timeout=60).read().decode()
        if text.startswith('{'):
            return json.loads(text)['features'][0]
        time.sleep(5 + 5 * attempt)
    raise RuntimeError('BRouter busy: ' + text[:80])


def metres(a, b):
    import math
    k = math.pi / 180
    x = (b[0] - a[0]) * k * math.cos((a[1] + b[1]) / 2 * k)
    y = (b[1] - a[1]) * k
    return math.hypot(x, y) * 6371000


import sys
ONLY = set(sys.argv[1:])
features = []
if ONLY and os.path.exists(OUT):
    features = [f for f in json.load(open(OUT))['features'] if f['properties']['id'] not in ONLY]
for hid, pts in HIKES.items():
    if ONLY and hid not in ONLY:
        continue
    f = brouter(pts)
    coords = f['geometry']['coordinates']
    ends = []
    for m in f['properties'].get('messages', [])[1:]:
        tags = dict(t.split('=', 1) for t in str(m[9]).split(' ') if '=' in t)
        sc = tags.get('sac_scale', '')
        ends.append((int(m[0]) / 1e6, int(m[1]) / 1e6, 3 if 'alpine' in sc else 2 if 'mountain' in sc else 1))
    segs, cur, e, km, up, last_h = [], None, 0, 0.0, 0.0, None
    for i, c in enumerate(coords):
        if i:
            km += metres(coords[i - 1], c) / 1000
        h = c[2] if len(c) > 2 else None
        if h is not None and last_h is not None and h > last_h:
            up += h - last_h
        last_h = h if h is not None else last_h
        while i and e < len(ends) - 1 and abs(ends[e][0] - c[0]) < 2e-6 and abs(ends[e][1] - c[1]) < 2e-6:
            e += 1
        d = ends[min(e, len(ends) - 1)][2] if ends else 1
        p = [round(c[0], 5), round(c[1], 5)]
        if not cur or cur['d'] != d:
            if cur:
                cur['c'].append(p)
            cur = {'d': d, 'c': []}
            segs.append(cur)
        cur['c'].append(p)
    for g in segs:
        if len(g['c']) > 1:
            features.append({'type': 'Feature', 'properties': {'id': hid, 'diff': g['d']},
                             'geometry': {'type': 'LineString', 'coordinates': g['c']}})
    print(hid, round(km, 1), 'km', round(float(f['properties'].get('filtered ascend', up))), 'm up', len(segs), 'stretches')
    time.sleep(3)
json.dump({'type': 'FeatureCollection', 'features': features}, open(OUT, 'w'), separators=(',', ':'))
print(os.path.getsize(OUT) // 1024, 'KB ->', OUT)
