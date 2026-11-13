#!/usr/bin/env python3
"""Checks downloaded CelesTrak GP data (CSV, OMM fields) and installs it for the satellites page.

Used by fetch.sh (run by .github/workflows/hugo.yml before the Hugo build, and by hand to refresh the committed
snapshot). For each group: if the downloaded file has the expected header, a sane number of rows, sane values and a
sane size, it replaces the file in the output folder; otherwise the file already there (the committed snapshot) stays
and a warning is printed, so the site always builds. meta.json records where each group came from and when.

    python3 -I tools/sat-data/check.py --groups              print the group names, one per line
    python3 -I tools/sat-data/check.py --in DIR --out DIR    check DIR/<group>.csv and install them into --out
"""
import csv
import io
import json
import os
import sys
from datetime import datetime, timezone

# group: (fewest rows, most rows, most bytes); a few small groups and one big one, so a run asks CelesTrak for
# eight files, each once
GROUPS = {
    "stations": (5, 300, 100_000),
    "weather": (20, 500, 150_000),
    "gnss": (80, 800, 250_000),
    "geo": (200, 2500, 700_000),
    "starlink": (3000, 25000, 3_800_000),
    "cosmos-2251-debris": (50, 3000, 500_000),
    "iridium-33-debris": (10, 1000, 200_000),
    "fengyun-1c-debris": (200, 5000, 800_000),
}
HEADER = ("OBJECT_NAME,OBJECT_ID,EPOCH,MEAN_MOTION,ECCENTRICITY,INCLINATION,RA_OF_ASC_NODE,ARG_OF_PERICENTER,"
          "MEAN_ANOMALY,EPHEMERIS_TYPE,CLASSIFICATION_TYPE,NORAD_CAT_ID,ELEMENT_SET_NO,REV_AT_EPOCH,BSTAR,"
          "MEAN_MOTION_DOT,MEAN_MOTION_DDOT").split(",")
NUMERIC = ["MEAN_MOTION", "ECCENTRICITY", "INCLINATION", "RA_OF_ASC_NODE", "ARG_OF_PERICENTER", "MEAN_ANOMALY",
           "BSTAR", "MEAN_MOTION_DOT", "MEAN_MOTION_DDOT"]


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def check(path, limits):
    """The cleaned text and its row count, or raises ValueError saying what is wrong."""
    fewest, most, most_bytes = limits
    size = os.path.getsize(path)
    if size > most_bytes:
        raise ValueError(f"{size} bytes, more than {most_bytes}")
    with open(path, "rb") as f:
        raw = f.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("not UTF-8")
    rows = list(csv.reader(io.StringIO(text.replace("\r\n", "\n"))))
    rows = [r for r in rows if r]
    if not rows or rows[0] != HEADER:
        raise ValueError("unexpected header: " + (",".join(rows[0])[:80] if rows else "empty file"))
    body = rows[1:]
    if not fewest <= len(body) <= most:
        raise ValueError(f"{len(body)} rows, expected {fewest} to {most}")
    newest = None
    for r in body:
        if len(r) != len(HEADER):
            raise ValueError(f"a row with {len(r)} fields")
        o = dict(zip(HEADER, r))
        for k in NUMERIC:
            float(o[k])
        if not 0 < int(o["NORAD_CAT_ID"]) < 1_000_000:
            raise ValueError("bad catalogue number " + o["NORAD_CAT_ID"])
        if not 0 < float(o["MEAN_MOTION"]) < 20 or not 0 <= float(o["ECCENTRICITY"]) < 1:
            raise ValueError("implausible elements for " + o["NORAD_CAT_ID"])
        epoch = datetime.fromisoformat(o["EPOCH"][:26])
        newest = epoch if newest is None or epoch > newest else newest
    # elements older than two months mean something is off at the source
    if (datetime.now() - newest).days > 60:
        raise ValueError("newest elements from " + newest.isoformat())
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerows(rows)
    return out.getvalue(), len(body)


def main(argv):
    if argv[1:] == ["--groups"]:
        print("\n".join(GROUPS))
        return 0
    args = dict(zip(argv[1::2], argv[2::2]))
    src, dst = args.get("--in"), args.get("--out")
    if not src or not dst:
        print(__doc__)
        return 2
    os.makedirs(dst, exist_ok=True)
    meta_path = os.path.join(dst, "meta.json")
    try:
        with open(meta_path) as f:
            old = json.load(f).get("groups", {})
    except (OSError, ValueError):
        old = {}
    meta = {"source": "CelesTrak GP data, https://celestrak.org/NORAD/elements/", "groups": {}}
    missing = 0
    for g, limits in GROUPS.items():
        path, target = os.path.join(src, g + ".csv"), os.path.join(dst, g + ".csv")
        try:
            if not os.path.exists(path):
                raise ValueError("not downloaded")
            text, n = check(path, limits)
            with open(target + ".tmp", "w", encoding="utf-8") as f:
                f.write(text)
            os.replace(target + ".tmp", target)
            meta["groups"][g] = {"rows": n, "fetched": now_iso()}
            print(f"{g}: {n} objects, {len(text.encode())} bytes")
        except (ValueError, OSError) as e:
            if os.path.exists(target):
                meta["groups"][g] = dict(old.get(g, {}), snapshot=True)
                print(f"::warning::{g}: {e}; using the committed snapshot")
            else:
                missing += 1
                print(f"::error::{g}: {e}; and no snapshot")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=1)
        f.write("\n")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
