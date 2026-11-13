#!/usr/bin/env bash
# Downloads the satellite groups of the satellites page (/phd/satellites/) from CelesTrak, each group once,
# and installs the ones that pass check.py into the given folder (default static/data/sat). A group that fails to
# download or to check keeps the committed snapshot, so the site still builds. Run by .github/workflows/hugo.yml
# before the Hugo build (daily, so positions stay fresh); run it by hand to refresh the committed snapshot.
# CelesTrak updates GP data about every two hours and asks clients not to download the same data more often than
# that, so do not run this more than once every few hours.
set -u
cd "$(dirname "$0")/../.."
out=${1:-static/data/sat}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for g in $(python3 -I tools/sat-data/check.py --groups); do
    if ! curl -sS --fail --proto '=https' --max-time 90 -A "static-site-build (daily)" \
        -o "$tmp/$g.csv" "https://celestrak.org/NORAD/elements/gp.php?GROUP=$g&FORMAT=csv"; then
        echo "::warning::$g: download failed"
        rm -f "$tmp/$g.csv"
    fi
    sleep 2
done
python3 -I tools/sat-data/check.py --in "$tmp" --out "$out"
