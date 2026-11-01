#!/usr/bin/env python3
"""Make entries of the home page "Latest" feed for LinkedIn posts (config.yml, params.profileMode.latest).

For each public post URL, fetches the page like a browser would and reads its Open Graph tags (og:description or
og:title for the text, og:image for the picture, article:published_time for the date), saves the picture as
static/img/linkedin/<slug>.jpg and prints a YAML entry (date, text, linkedin, image, alt) to paste into config.yml.
With --write the entries are added at the top of the latest list in config.yml instead (the rest of the file,
comments included, stays as it is). Posts whose link is already in config.yml (as a linkedin: or url: field) are
skipped. The text is the first sentence of the post, shortened to one line: edit it, and when the post is about
something with its own page (an event, an article, a paper), add that page as url: to the entry.

LinkedIn often answers scripts with a login page (or HTTP status 999). Then the script says so and prints a template
entry to fill in by hand; the date comes from the number in the post URL, which encodes when it was posted.

Standard library only. Examples:
    python3 tools/linkedin_post.py https://www.linkedin.com/posts/...-activity-7385012345678901234-AbCd
    python3 tools/linkedin_post.py --write URL1 URL2
"""
import argparse
import datetime
import hashlib
import html
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/130.0.0.0 Safari/537.36")
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MAX_TEXT = 110                      # characters of the post kept as the text (one line in the feed)
MAX_PAGE = 4 << 20                  # bytes read of a post page
MAX_IMAGE = 15 << 20                # bytes of a picture
IMAGE_EXT = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp",
             "image/gif": ".gif"}


class Blocked(Exception):
    """LinkedIn (or the site) did not hand out the post to a script."""


class MetaParser(HTMLParser):
    """Collects <meta property|name=... content=...> tags (the first value of each)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}

    def handle_starttag(self, tag, attrs):
        if tag != "meta":
            return
        a = dict(attrs)
        key = (a.get("property") or a.get("name") or "").strip().lower()
        if key and a.get("content") is not None and key not in self.meta:
            self.meta[key] = a["content"].strip()


def parse_meta(page):
    p = MetaParser()
    p.feed(page)
    p.close()
    return p.meta


def fetch(url, timeout, accept="text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", referer=None,
          limit=MAX_PAGE):
    """(final url, content type, body bytes); Blocked when the answer is a refusal or a login page."""
    headers = {"User-Agent": UA, "Accept": accept, "Accept-Language": "en-US,en;q=0.9"}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            final, ctype = r.geturl(), r.headers.get("Content-Type", "")
            body = r.read(limit + 1)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403, 429, 999):
            raise Blocked("HTTP %d (%s): LinkedIn refuses requests that do not come from a logged-in browser"
                          % (e.code, "rate limited" if e.code == 429 else "blocked"))
        raise Blocked("HTTP %d %s" % (e.code, e.reason))
    except urllib.error.URLError as e:
        raise Blocked("could not connect: %s" % e.reason)
    except OSError as e:                         # timeouts and the like
        raise Blocked("could not fetch: %s" % e)
    if len(body) > limit:
        raise Blocked("the answer is larger than %d MB" % (limit >> 20))
    if re.search(r"/(authwall|login|checkpoint|uas/login|signup)\b", urllib.parse.urlparse(final).path):
        raise Blocked("LinkedIn redirected to its login page (%s)" % final.split("?")[0])
    return final, ctype, body


def decode(body, ctype):
    m = re.search(r"charset=([\w-]+)", ctype or "", re.I)
    try:
        return body.decode(m.group(1) if m else "utf-8", errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def clean_url(url):
    """The post link without LinkedIn's tracking parameters (?utm_source=...&rcm=...)."""
    u = urllib.parse.urlparse(url)
    if u.netloc.lower().endswith("linkedin.com"):
        u = u._replace(query="", fragment="")
    return urllib.parse.urlunparse(u)


def date_from_id(url):
    """LinkedIn post ids (activity, ugcPost, share) carry the posting time: the top 41 bits are milliseconds."""
    m = re.search(r"(?:activity|ugcPost|share)(?::|-|%3A)(\d{17,20})", url, re.I)
    if not m:
        return None
    try:
        d = datetime.datetime.fromtimestamp((int(m.group(1)) >> 22) / 1000, tz=datetime.timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None
    return d.date() if 2003 <= d.year <= datetime.date.today().year + 1 else None


def parse_date(s):
    if not s:
        return None
    try:
        return datetime.datetime.fromisoformat(s.strip().replace("Z", "+00:00")[:25]).date()
    except ValueError:
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s.strip())
        return datetime.date(*map(int, m.groups())) if m else None


def show_date(d):
    """As the feed writes dates: "Sep 2026"."""
    return "%s %d" % (MONTHS[d.month - 1], d.year) if d else ""


def excerpt(meta):
    """The start of the post from og:description (or og:title without "Name on LinkedIn: "): its first sentence,
    shortened at a word when that is still too long."""
    text = meta.get("og:description") or meta.get("description") or ""
    title = meta.get("og:title") or meta.get("twitter:title") or ""
    if not text and title:
        text = title
    text = re.sub(r"^.{0,80}? on LinkedIn:\s*", "", text)
    text = re.sub(r"\s*\|\s*[\d,.]+\s+comments?\s+on\s+LinkedIn\s*$", "", text, flags=re.I)
    text = re.sub(r"\s+", " ", html.unescape(text)).strip()
    first = re.match(r"(.{20,}?[.!?])(?=\s|$)", text)
    if first:
        text = first.group(1).rstrip(".")
    if len(text) > MAX_TEXT:
        cut = text[:MAX_TEXT + 1]
        text = (cut[:cut.rfind(" ")] if " " in cut[MAX_TEXT // 2:] else cut[:MAX_TEXT]).rstrip(" ,;:.") + "…"
    return text


def slugify(text, d, url):
    words = re.findall(r"[a-z0-9]+", text.lower().encode("ascii", "ignore").decode())[:6]
    parts = ([d.isoformat()] if d else []) + words
    if not parts:
        m = re.search(r"(\d{17,20})", url)
        parts = [m.group(1) if m else hashlib.sha1(url.encode()).hexdigest()[:10]]
    return "-".join(parts)[:80].strip("-")


def save_image(img_url, page_url, slug, site, timeout):
    """Downloads the picture to static/img/linkedin/; returns its path under static/ (or None, with a warning)."""
    try:
        _, ctype, body = fetch(img_url, timeout, accept="image/avif,image/webp,image/*,*/*;q=0.8",
                               referer=page_url, limit=MAX_IMAGE)
    except Blocked as e:
        warn("  picture not downloaded: %s" % e)
        return None
    ctype = ctype.split(";")[0].strip().lower()
    if not ctype.startswith("image/"):
        warn("  picture not downloaded: the answer is %s, not an image" % (ctype or "of unknown type"))
        return None
    ext = IMAGE_EXT.get(ctype, ".jpg")
    rel = "img/linkedin/%s%s" % (slug, ext)
    dest = site / "static" / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(body)
    note = "" if ext == ".jpg" else " (the picture is %s, so it keeps its own extension)" % ctype
    print("  picture saved: %s (%d kB)%s" % (dest, (len(body) + 1023) // 1024, note), file=sys.stderr)
    return rel


def ystr(s):
    """A YAML scalar: plain when that is safe, otherwise double quoted."""
    if re.fullmatch(r"[A-Za-z0-9/][\w.~:/?&=%+@!,;()\-]*", s) and ": " not in s and not s.endswith(":"):
        return s
    return '"%s"' % s.replace("\\", "\\\\").replace('"', '\\"')


def quoted(s):
    return '"%s"' % s.replace("\\", "\\\\").replace('"', '\\"')


def entry_lines(e, ind):
    """The YAML lines of one entry of the latest list, items indented by ind."""
    lines = ["%s- date: %s" % (ind, quoted(e["date"]))]
    lines.append("%s  text: %s" % (ind, quoted(e["text"])))
    lines.append("%s  linkedin: %s" % (ind, ystr(e["url"])))
    if e.get("image"):
        lines.append("%s  image: %s" % (ind, ystr(e["image"])))
    elif e.get("image_hint"):
        lines.append("%s  # image: %s   (optional: save the picture there)" % (ind, e["image_hint"]))
    if e.get("alt"):
        lines.append("%s  alt: %s" % (ind, quoted(e["alt"])))
    return lines


def process(url, site, timeout, want_image):
    """An entry for url: {date, text, image?, alt?, url, ok}; ok is False for a template to fill in by hand."""
    url = url.strip()
    if not re.match(r"https?://", url, re.I):
        raise SystemExit("not a web address: %s" % url)
    link = clean_url(url)
    if not urllib.parse.urlparse(url).netloc.lower().endswith("linkedin.com"):
        warn("  note: %s is not a linkedin.com address, reading it anyway" % url)
    id_date = date_from_id(url)
    try:
        final, ctype, body = fetch(url, timeout)
        meta = parse_meta(decode(body, ctype))
        text = excerpt(meta)
        if not text:
            raise Blocked("the page has no Open Graph text (most likely a login page)")
    except Blocked as e:
        warn("  LinkedIn did not hand out this post: %s" % e)
        warn("  Fill in the template below by hand (open the post in your browser and sum it up in one short line).")
        d = id_date
        return {"ok": False, "date": show_date(d) or "FILL IN, e.g. Oct 2026",
                "text": "FILL IN: one short line about the post", "url": link,
                "image_hint": "img/linkedin/%s.jpg" % slugify("", d, url)}
    d = parse_date(meta.get("article:published_time") or meta.get("og:article:published_time")) or id_date
    e = {"ok": True, "date": show_date(d), "text": text, "url": clean_url(meta.get("og:url") or "") or link}
    if not urllib.parse.urlparse(e["url"]).netloc:
        e["url"] = link
    img = meta.get("og:image") or meta.get("og:image:url") or meta.get("og:image:secure_url") or meta.get("twitter:image")
    if img and want_image:
        e["image"] = save_image(urllib.parse.urljoin(final, html.unescape(img)), final, slugify(text, d, url), site, timeout)
        if e["image"] and meta.get("og:image:alt"):
            e["alt"] = re.sub(r"\s+", " ", meta["og:image:alt"]).strip()
    if not e["date"]:
        warn("  no date found: fill it in")
        e["date"] = "FILL IN"
    return e


def norm_url(u):
    """A link as compared for duplicates: no quotes, tracking parameters or trailing slash, any case of the host."""
    u = clean_url(u.strip().strip("'\""))
    return u.rstrip("/").lower()


def known_urls(raw):
    """The links already in config.yml as linkedin: or url: fields (the latest list and the rest of the file)."""
    return {norm_url(m.group(2)) for m in re.finditer(r"(?m)^[ \t]*(?:-[ \t]+)?(linkedin|url):[ \t]*(\S+)", raw)
            if re.match(r"[\"']?https?://", m.group(2))}


def write_config(path, entries):
    """Adds the entries at the top of params.profileMode.latest in config.yml, touching nothing else."""
    raw = path.read_bytes().decode("utf-8")
    nl = "\r\n" if "\r\n" in raw else "\n"
    lines = raw.split(nl)
    keys = [i for i, l in enumerate(lines) if re.match(r"[ \t]*latest:([ \t]|$)", l)]
    if len(keys) != 1:
        raise SystemExit("%s: expected one 'latest:' line under params.profileMode, found %d (add 'latest: []')"
                         % (path, len(keys)))
    k = keys[0]
    m = re.match(r"([ \t]*)latest:[ \t]*(.*?)[ \t]*$", lines[k])
    ind, rest = m.group(1), m.group(2)
    comment = re.search(r"#.*$", rest)
    value = rest[:comment.start()].strip() if comment else rest
    if value == "[]":
        lines[k] = ind + "latest:" + (" " + comment.group(0) if comment else "")
        item_ind = ind + "  "
    elif value == "":
        nxt = next((l for l in lines[k + 1:] if l.strip() and not l.lstrip().startswith("#")), "")
        mi = re.match(r"([ \t]*)- ", nxt)
        item_ind = mi.group(1) if mi and len(mi.group(1)) >= len(ind) else ind + "  "
    else:
        raise SystemExit("%s: 'latest: %s' is written inline; turn it into a list of '- date: ...' items first"
                         % (path, value))
    new, have = [], known_urls(raw)
    for e in entries:
        if norm_url(e["url"]) in have:
            warn("  already in %s, skipped: %s" % (path.name, e["url"]))
            continue
        new += entry_lines(e, item_ind)
        have.add(norm_url(e["url"]))
    if not new:
        return 0
    lines[k + 1:k + 1] = new
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".config-", suffix=".yml")
    with os.fdopen(fd, "wb") as f:
        f.write(nl.join(lines).encode("utf-8"))
    os.chmod(tmp, path.stat().st_mode & 0o777)
    os.replace(tmp, path)
    return sum(1 for l in new if l.lstrip().startswith("- date:"))


def warn(msg):
    print(msg, file=sys.stderr)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog="The Latest list on the home page is newest first; new entries go on top. When a post is about "
                                        "something with its own page, add that page as url: to the entry.")
    ap.add_argument("urls", nargs="+", metavar="URL", help="public LinkedIn post link (Share > Copy link)")
    ap.add_argument("--write", action="store_true", help="add the entries to config.yml instead of only printing them")
    ap.add_argument("--site", type=Path, default=Path(__file__).resolve().parent.parent,
                    help="the site folder with config.yml and static/ (default: the one this script is in)")
    ap.add_argument("--no-image", action="store_true", help="do not download the pictures")
    ap.add_argument("--timeout", type=float, default=20, help="seconds to wait for LinkedIn (default 20)")
    args = ap.parse_args(argv)
    config = args.site / "config.yml"
    if args.write and not config.is_file():
        raise SystemExit("no config.yml in %s" % args.site)

    known = known_urls(config.read_text(encoding="utf-8")) if config.is_file() else set()
    entries = []
    for url in args.urls:
        warn("%s" % url)
        if norm_url(url) in known:
            warn("  already in config.yml, not fetched again")
            continue
        entries.append(process(url, args.site, args.timeout, not args.no_image))
    good = [e for e in entries if e["ok"]]
    # newest first among the new ones (posts with a date before those without)
    good.sort(key=lambda e: parse_date_shown(e["date"]) or datetime.date.min, reverse=True)
    templates = [e for e in entries if not e["ok"]]

    if args.write and good:
        n = write_config(config, good)
        warn("added %d post%s at the top of the latest list in %s" % (n, "" if n == 1 else "s", config))
    if good and not args.write:
        print("# at the top of params.profileMode.latest in config.yml (newest first):")
        for e in good:
            print("\n".join(entry_lines(e, "      ")))
    if templates:
        print("# to fill in by hand%s:" % (" (not written to config.yml)" if args.write else ""))
        for e in templates:
            print("\n".join(entry_lines(e, "      ")))
    return 0 if not templates else 1


def parse_date_shown(s):
    """The date of "Sep 2026" (or "28 Sep 2026") for sorting, None for anything else."""
    m = re.fullmatch(r"(?:(\d{1,2}) )?(\w{3}) (\d{4})", s or "")
    if m and m.group(2) in MONTHS:
        return datetime.date(int(m.group(3)), MONTHS.index(m.group(2)) + 1, int(m.group(1) or 1))
    return None


if __name__ == "__main__":
    sys.exit(main())
