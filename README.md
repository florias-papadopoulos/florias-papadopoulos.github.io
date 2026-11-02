# florias-papadopoulos.github.io

Personal website of Florias Papadopoulos, built with [Hugo](https://gohugo.io) and the
[hugo-website](https://github.com/pmichaillat/hugo-website) template (PaperMod based, vendored in `themes/`).
Live at https://florias-papadopoulos.github.io/.

## Where things are

- **Home page:** text, tagline, route card, "Selected news" feed, menu and social links all in `config.yml`
  (`params.profileMode`). Layout `layouts/partials/index_profile.html`, styles `assets/css/common/home.css`.
- **Bachelor, Master, Papers tabs:** one page each in `content/` (`bachelor/`, `master/`, `papers/`), all drawn by
  `layouts/_default/timeline.html`: a rail of semesters (or years) and entries that open in place.
- **Projects:** one Markdown file per project in `_pages/projects/<semester>/`, with its files next to it. The front
  matter `context` ("Master, Semester 2 · Course") decides the tab and group. Projects have no pages of their own: old
  project addresses forward to their entry on the tab (`layouts/projects/single.html`). The folder keeps its old name
  so that file addresses (`/_pages/projects/...`) and GitHub links keep working; `config.yml` mounts the `.md` files as
  content and everything else as static files.
- **Papers:** `content/projects/<paper>.md` with venue, abstract, keywords, links and BibTeX in the front matter.
- **CV:** `static/files/resume.pdf` (served at `/files/resume.pdf`; `/cv/` forwards to it).
- **Games:** `/games/`, reached by the paw button. List and groups in `content/games/_index.md`, shell
  `assets/js/games/arcade.js` (its header documents the API), one file per game in `assets/js/games/`.
- **The cat:** `layouts/partials/cat.html`, engine `assets/js/cat-core.js`, worlds `assets/js/home-lab.js` (home) and
  `assets/js/cat-pages.js` (tabs), looks in `assets/css/common/cat.css`.
- **Visit counter:** a Cloudflare Worker with a D1 database, code in `tools/stats-worker/` (pasted into the Cloudflare
  dashboard by hand; `schema.sql` holds the table). The site side is `assets/js/stats-hit.js`, the public numbers are
  `/stats/`, and `/you/` shows a visitor what is recorded about their visit. Totals only, no cookies, no IP addresses.
- **Privacy notice:** `content/privacy/_index.md`, linked from the footer.
- **Security:** a Content Security Policy on every page (`layouts/partials/csp.html`); no inline scripts, every script
  is a bundled asset with an integrity hash.

## Tools

- `tools/linkedin_post.py URL [URL ...]`: fetches a public LinkedIn post's text and picture and prints an entry for the
  news feed in `config.yml` (the picture is saved small under `static/img/linkedin/`).
- `tools/stats-worker/`: the visit counter (see above).

## Preview and deploy

Preview locally with `hugo server`, then open http://localhost:1313 (the visit counter skips local previews).

GitHub Actions (`.github/workflows/hugo.yml`) builds and publishes on every push to `master`; in the repository
settings, Pages must use "GitHub Actions" as the source.

## Licence

See `LICENSE.md`: the template and theme code is MIT; my own content is not.
