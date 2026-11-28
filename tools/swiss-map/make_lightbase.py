#!/usr/bin/env python3
"""The Switzerland page's "Map": swisstopo's light base map (vector, drawn in the browser), from its official style.
Run `python3 -I tools/swiss-map/make_lightbase.py` to fetch the style and write static/switzerland/lightbase.json:
its sources renamed lb-base and lb-relief, its layers prefixed lb- (so they never clash with the page's own), the
sprite and glyph addresses kept. The page inserts these layers as its base map (assets/js/switzerland/00-core.js).
Style: https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json (federal geodata, free with
the source named: swisstopo)."""
import json, os, urllib.request
URL = 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'switzerland', 'lightbase.json')
s = json.load(urllib.request.urlopen(URL, timeout=60))
names = {}
for k in s['sources']:
    names[k] = 'lb-relief' if k.startswith('relief') else 'lb-base'
sources = {names[k]: {kk: vv for kk, vv in v.items() if kk in ('type', 'url', 'tiles', 'minzoom', 'maxzoom', 'bounds')} for k, v in s['sources'].items()}
layers = []
for l in s['layers']:
    l = dict(l)
    l['id'] = 'lb-' + l['id']
    if 'source' in l:
        l['source'] = names[l['source']]
    layers.append(l)
# the site's choices (2026-11-28, by the owner): names in normal letters (no capitals); when zoomed out only the
# cities of 50,000 people or more, plus the tourist towns visitors look for; towns from zoom 9, villages from 11; no
# country name across the map
KEEP = ['Lugano', 'Interlaken', 'Zermatt', 'St. Moritz', 'Davos', 'Grindelwald']
pop = ['to-number', ['get', 'population'], 0]
kept = []
for l in layers:
    lay = l.get('layout') or {}
    if 'text-transform' in lay:
        lay['text-transform'] = 'none'
    if l['id'] == 'lb-place_country':
        continue
    if l['id'] == 'lb-place_city':
        l['filter'] = ['all', ['==', ['get', 'class'], 'city'], ['step', ['zoom'], ['>=', pop, 50000], 8, ['>=', pop, 15000], 9, True]]
    if l['id'] == 'lb-place_town_village':
        l['filter'] = ['all', ['match', ['get', 'class'], ['town', 'village'], True, False],
                       ['any', ['in', ['get', 'name:latin'], ['literal', KEEP]],
                        ['step', ['zoom'], False, 9, ['==', ['get', 'class'], 'town'], 11, True]]]
    kept.append(l)
layers = kept
out = {'version': s.get('metadata', {}).get('version') or s.get('name'), 'sprite': s['sprite'], 'glyphs': s['glyphs'],
       'sources': sources, 'layers': layers}
json.dump(out, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(layers), 'layers', os.path.getsize(OUT) // 1024, 'KB ->', OUT, '| sprite', s['sprite'])
