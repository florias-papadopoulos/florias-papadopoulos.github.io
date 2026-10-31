#!/usr/bin/env python3
"""Generate assets/journey-map.svg, the illustrated map on the home page.

    curl -o /tmp/countries-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json
    python3 tools/make_map.py /tmp/countries-50m.json

Country shapes: Natural Earth 1:50m (public domain) via world-atlas. Everything else
(mountains, lakes, rivers, volcanoes, journey) is placed by hand in lon/lat below.
Styling and animation live in assets/css/common/home-map.css.
"""
import json
import math
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "journey-map.svg"

LON0, LON1, LAT0, LAT1 = -18.0, 38.0, 34.0, 58.0
W = 1600
SX = W / (LON1 - LON0)
SY = SX / math.cos(math.radians(46))
H = round((LAT1 - LAT0) * SY)
HIGHLIGHT = {"300": "gr", "756": "ch"}  # Greece, Switzerland


def P(lon, lat):
    return ((lon - LON0) * SX, (LAT1 - lat) * SY)


def fmt(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


# --- TopoJSON decoding -------------------------------------------------------

def decode_arcs(topo):
    (sx, sy), (tx, ty) = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return arcs


def ring_coords(ring, arcs):
    pts = []
    for i in ring:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


def polygons(geom, arcs):
    if geom["type"] == "Polygon":
        return [[ring_coords(r, arcs) for r in geom["arcs"]]]
    if geom["type"] == "MultiPolygon":
        return [[ring_coords(r, arcs) for r in poly] for poly in geom["arcs"]]
    return []


# --- Geometry helpers --------------------------------------------------------

def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i]
        d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm if (dx or dy) else math.hypot(x0 - x1, y0 - y1)
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def area(pts):
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]))) / 2


def clip(pts, m=12):
    """Sutherland-Hodgman clip of a ring to the frame plus a margin m."""
    edges = [(lambda p: p[0] >= -m, lambda a, b: -m), (lambda p: p[0] <= W + m, lambda a, b: W + m),
             (lambda p: p[1] >= -m, None), (lambda p: p[1] <= H + m, None)]
    bounds = [("x", -m), ("x", W + m), ("y", -m), ("y", H + m)]
    for (inside, _), (axis, v) in zip(edges, bounds):
        if not pts:
            break
        res = []
        for i, cur in enumerate(pts):
            prev = pts[i - 1]
            if inside(cur):
                if not inside(prev):
                    res.append(cross(prev, cur, axis, v))
                res.append(cur)
            elif inside(prev):
                res.append(cross(prev, cur, axis, v))
        pts = res
    return pts


def cross(a, b, axis, v):
    (x0, y0), (x1, y1) = a, b
    if axis == "x":
        t = (v - x0) / (x1 - x0)
        return (v, y0 + t * (y1 - y0))
    t = (v - y0) / (y1 - y0)
    return (x0 + t * (x1 - x0), v)


def ring_path(lonlat, eps=0.8, min_area=2.0):
    if not any(LON0 - 12 < lon < LON1 + 12 and LAT0 - 8 < lat < LAT1 + 8 for lon, lat in lonlat):
        return ""
    pts = clip([P(lon, lat) for lon, lat in lonlat])
    if len(pts) < 3:
        return ""
    if area(pts) < min_area:
        return ""
    pts = rdp(pts, eps)
    if len(pts) < 3:
        return ""
    return "M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + "Z"


def smooth(lonlat, closed=False):
    """Catmull-Rom through the points, as cubic Bezier path data."""
    p = [P(*q) for q in lonlat]
    if closed:
        p = p[-1:] + p + p[:2]
    else:
        p = p[:1] + p + p[-1:]
    d = f"M{fmt(p[1][0])} {fmt(p[1][1])}"
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{fmt(c1[0])} {fmt(c1[1])} {fmt(c2[0])} {fmt(c2[1])} {fmt(p2[0])} {fmt(p2[1])}"
    return d + ("Z" if closed else "")


# --- Hand-placed features (lon, lat) -------------------------------------------

RIVERS = {
    "Rhine": [(9.0, 46.65), (9.5, 47.1), (9.62, 47.47), (9.35, 47.62), (8.7, 47.68), (8.2, 47.6), (7.6, 47.56),
              (7.75, 48.3), (8.2, 49.0), (8.45, 49.5), (8.27, 50.0), (7.6, 50.36), (6.96, 50.94), (6.6, 51.5),
              (6.1, 51.85), (5.3, 51.9), (4.1, 51.97)],
    "Danube": [(8.5, 47.95), (10.0, 48.4), (11.4, 48.75), (12.1, 49.0), (13.4, 48.57), (14.3, 48.3), (16.37, 48.2),
               (17.1, 48.14), (18.9, 47.8), (19.05, 47.5), (18.9, 46.5), (19.3, 45.6), (20.5, 44.8), (21.5, 44.7),
               (22.5, 44.6), (22.9, 43.8), (24.5, 43.7), (26.0, 43.9), (27.9, 44.1), (28.2, 45.4), (29.6, 45.2)],
    "Rhone": [(8.4, 46.6), (7.5, 46.25), (6.9, 46.4), (6.14, 46.2), (5.8, 46.0), (4.85, 45.75), (4.8, 44.9),
              (4.7, 43.9), (4.6, 43.4)],
    "Po": [(7.0, 44.7), (7.7, 45.07), (9.1, 45.15), (10.2, 45.0), (11.5, 45.0), (12.5, 44.95)],
    "Axios": [(21.43, 42.0), (21.9, 41.6), (22.3, 41.1), (22.6, 40.6)],
}
LAKES = {
    "Constance": [(8.95, 47.80), (9.18, 47.73), (9.48, 47.58), (9.72, 47.52), (9.66, 47.46), (9.42, 47.53),
                  (9.15, 47.65), (8.98, 47.72)],
    "Geneva": [(6.15, 46.25), (6.40, 46.42), (6.62, 46.52), (6.88, 46.42), (6.75, 46.40), (6.50, 46.38), (6.25, 46.30)],
    "Zurich": [(8.55, 47.37), (8.75, 47.27), (8.86, 47.21), (8.80, 47.20), (8.62, 47.29), (8.52, 47.34)],
    "Balaton": [(17.25, 46.72), (17.7, 46.9), (18.15, 47.05), (18.1, 47.0), (17.6, 46.82), (17.3, 46.69)],
    "Ohrid": [(20.7, 41.15), (20.82, 41.12), (20.8, 40.9), (20.68, 40.92)],
    "Prespa": [(21.0, 41.0), (21.1, 40.98), (21.08, 40.8), (20.98, 40.82)],
}
MOUNTAINS = [  # (lon, lat, size)
    (6.86, 45.83, 1.3), (7.66, 45.98, 1.2), (8.0, 46.55, 1.15), (8.6, 46.6, 1.0), (9.3, 46.42, 1.0),
    (9.95, 46.62, 1.05), (10.6, 46.85, 1.0), (11.3, 46.98, 1.0), (12.1, 47.07, 1.05), (12.9, 47.1, 0.95),
    (13.8, 47.3, 0.9), (7.2, 46.2, 0.9),
    (-0.9, 42.85, 0.9), (0.1, 42.7, 1.0), (1.1, 42.6, 0.9),
    (19.9, 49.2, 0.9), (22.6, 48.9, 0.8), (24.6, 47.7, 0.85), (25.4, 46.6, 0.85), (25.2, 45.5, 0.9),
    (19.0, 43.1, 0.85), (17.6, 43.6, 0.8), (23.4, 42.15, 0.95), (24.6, 42.7, 0.8),
    (22.35, 40.08, 1.25), (21.15, 39.9, 0.9), (21.5, 39.2, 0.85),
    (13.6, 42.45, 0.85), (14.2, 41.8, 0.75), (15.8, 40.5, 0.75), (29.2, 40.07, 0.8),
]
VOLCANOES = [(25.43, 36.40, 1.0), (15.0, 37.75, 1.25), (14.43, 40.82, 0.95), (15.21, 38.79, 0.75)]
WAVES = [(25.0, 38.6), (24.2, 37.1), (19.2, 38.6), (11.6, 40.4), (5.0, 39.6), (2.6, 37.9), (-12.0, 45.0),
         (-14.0, 40.0), (-11.0, 50.5), (3.0, 55.5), (33.0, 43.2), (-5.0, 45.6), (18.0, 35.6), (30.5, 34.6)]
BOATS = [(24.6, 38.1), (-10.5, 47.6)]
CLOUDS = [(-6.0, 55.5, 1.2), (14.0, 53.6, 1.0), (30.0, 50.0, 0.9), (2.0, 49.0, 0.8)]
LABELS = [("Aegean Sea", 25.0, 39.4, "sea"), ("Mediterranean Sea", 5.5, 38.4, "sea"),
          ("Atlantic Ocean", -14.0, 43.0, "sea"), ("Alps", 11.2, 46.25, "range"), ("Olympus", 22.35, 39.75, "range")]
STOPS = {"gr": ("Thessaloniki", 22.94, 40.64), "ch": ("St. Gallen", 9.37, 47.42)}


def mountain(x, y, s):
    w, h = 10 * s, 15 * s
    body = f'<path class="jm-mtn" d="M{fmt(x - w)} {fmt(y)}L{fmt(x)} {fmt(y - h)}L{fmt(x + w)} {fmt(y)}Z"/>'
    sw, sh = w * 0.38, h * 0.38
    snow = (f'<path class="jm-snow" d="M{fmt(x - sw)} {fmt(y - h + sh)}L{fmt(x)} {fmt(y - h)}L{fmt(x + sw)} {fmt(y - h + sh)}'
            f'L{fmt(x + sw * 0.4)} {fmt(y - h + sh * 0.75)}L{fmt(x)} {fmt(y - h + sh)}L{fmt(x - sw * 0.4)} {fmt(y - h + sh * 0.75)}Z"/>')
    return body + snow


def volcano(x, y, s, i):
    w, h, t = 12 * s, 14 * s, 3.5 * s
    cone = f'<path class="jm-volc" d="M{fmt(x - w)} {fmt(y)}L{fmt(x - t)} {fmt(y - h)}L{fmt(x + t)} {fmt(y - h)}L{fmt(x + w)} {fmt(y)}Z"/>'
    lava = f'<ellipse class="jm-lava" cx="{fmt(x)}" cy="{fmt(y - h)}" rx="{fmt(t)}" ry="{fmt(1.4 * s)}"/>'
    puffs = "".join(f'<circle class="jm-puff jm-p{k}" style="animation-delay:{-(i * 1.3 + k * 2.6):.1f}s" '
                    f'cx="{fmt(x)}" cy="{fmt(y - h - 3)}" r="{fmt(4.5 * s)}"/>' for k in range(3))
    return f'<g class="jm-volcano">{puffs}{cone}{lava}</g>'


def wave(x, y):
    return f'<path class="jm-wave" d="M{fmt(x - 14)} {fmt(y)}q3.5-4 7 0t7 0t7 0t7 0"/>'


def boat(x, y, i):
    return (f'<g class="jm-boat" style="animation-delay:{-i * 2.1:.1f}s"><path class="jm-hull" d="M{fmt(x - 11)} {fmt(y)}h22l-5 5h-12z"/>'
            f'<path class="jm-sail" d="M{fmt(x)} {fmt(y - 1)}v-17l10 15z"/></g>')


def cloud(x, y, s, i):
    c = [(0, 0, 13), (14, -6, 15), (30, 0, 12), (15, 4, 12)]
    circles = "".join(f'<circle cx="{fmt(x + dx * s)}" cy="{fmt(y + dy * s)}" r="{fmt(r * s)}"/>' for dx, dy, r in c)
    return f'<g class="jm-cloud" style="animation-delay:{-i * 37}s">{circles}</g>'


def main():
    topo = json.load(open(sys.argv[1]))
    arcs = decode_arcs(topo)
    land, hl = [], {"gr": [], "ch": []}
    for g in topo["objects"]["countries"]["geometries"]:
        d = "".join(ring_path(r) for poly in polygons(g, arcs) for r in poly)
        if not d:
            continue
        (hl[HIGHLIGHT[g.get("id")]] if g.get("id") in HIGHLIGHT else land).append(d)

    out = [f'<svg class="jm" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" '
           f'role="img" aria-label="Map of Europe: from Thessaloniki, Greece, to St. Gallen, Switzerland">',
           f'<rect class="jm-sea" width="{W}" height="{H}"/>']
    grat = "".join(f"M{fmt(P(lon, LAT0)[0])} 0V{H}" for lon in range(-15, 40, 5))
    grat += "".join(f"M0 {fmt(P(LON0, lat)[1])}H{W}" for lat in range(35, 60, 5))
    out.append(f'<path class="jm-grat" d="{grat}"/>')
    out += [wave(*P(*w)) for w in WAVES]
    out.append(f'<path class="jm-land" d="{"".join(land)}"/>')
    out += [f'<path class="jm-land jm-hl jm-hl-{k}" data-stop="{k}" d="{"".join(v)}"/>' for k, v in hl.items()]
    out.append('<g class="jm-rivers">' + "".join(f'<path d="{smooth(r)}"/>' for r in RIVERS.values()) + "</g>")
    out.append('<g class="jm-flow">' + "".join(f'<path d="{smooth(r)}"/>' for r in RIVERS.values()) + "</g>")
    out.append('<g class="jm-lakes">' + "".join(f'<path d="{smooth(l, closed=True)}"/>' for l in LAKES.values()) + "</g>")
    for lon, lat, s in sorted(MOUNTAINS, key=lambda m: -m[1]):
        out.append(mountain(*P(lon, lat), s))
    out += [volcano(*P(lon, lat), s, i) for i, (lon, lat, s) in enumerate(VOLCANOES)]
    out += [boat(*P(*b), i) for i, b in enumerate(BOATS)]
    for text, lon, lat, cls in LABELS:
        x, y = P(lon, lat)
        out.append(f'<text class="jm-label jm-{cls}" x="{fmt(x)}" y="{fmt(y)}">{text}</text>')

    (ax, ay), (bx, by) = P(*STOPS["gr"][1:]), P(*STOPS["ch"][1:])
    mx, my = (ax + bx) / 2, (ay + by) / 2
    nx, ny = -(by - ay), bx - ax
    k = 0.22
    cx, cy = mx - nx * k, my - ny * k
    route = f"M{fmt(ax)} {fmt(ay)}Q{fmt(cx)} {fmt(cy)} {fmt(bx)} {fmt(by)}"
    out.append(f'<path class="jm-route-bg" d="{route}"/><path id="jm-route" class="jm-route" d="{route}"/>')
    out.append(f'<circle class="jm-traveller" r="4"><animateMotion dur="7s" repeatCount="indefinite" path="{route}"/></circle>')
    for key, (name, lon, lat) in STOPS.items():
        x, y = P(lon, lat)
        anchor, dx = ("start", 14) if key == "gr" else ("end", -14)
        out.append(f'<g class="jm-stop" data-stop="{key}" tabindex="0" role="button" aria-label="{name}">'
                   f'<circle class="jm-pulse" cx="{fmt(x)}" cy="{fmt(y)}" r="9"/>'
                   f'<circle class="jm-dot" cx="{fmt(x)}" cy="{fmt(y)}" r="7"/>'
                   f'<text class="jm-city" x="{fmt(x + dx)}" y="{fmt(y + 5)}" text-anchor="{anchor}">{name}</text></g>')
    out += [cloud(*P(lon, lat), s, i) for i, (lon, lat, s) in enumerate(CLOUDS)]
    out.append("</svg>")
    OUT.write_text("\n".join(out) + "\n")
    print(f"{OUT}: {OUT.stat().st_size // 1024} KB, viewBox 0 0 {W} {H}")


if __name__ == "__main__":
    main()
