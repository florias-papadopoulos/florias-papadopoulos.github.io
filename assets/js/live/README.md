# Audience mode (the hidden /live/ pages)

Live polls, quiz, audience questions and reactions during talks. Hidden: no link anywhere on the site, not in the
sitemap, `noindex`. The audience reaches `/live/#<code>/<join secret>` (e.g. `/live/#pkc27/k3x9mn2p`) only through the
QR code or the link on the speaker's slides (the part after `#` never reaches any server). The join secret is made by
the worker when a talk is first saved (another one for its rehearsal); without it no phone can join, so knowing or
guessing a talk code is not enough. The worker is `tools/live-worker/` (its README has the setup, the design and the
cost per talk); the pages are `layouts/live/` (standalone pages: no menu, footer, corner buttons, visit counter or
pet), the styles `assets/css/common/live.css` (all under `.lv`). The worker address is `params.liveEndpoint` in
`config.yml`; while it is empty the pages say "not set up yet".

| Page | Address | Files (joined in this order into one script) |
| --- | --- | --- |
| Audience (phone first) | `/live/#pkc27/k3x9mn2p` | 00, 10, 30 |
| Projector and remote | `/live/present/#pkc27` | 00, 05, 10, vendor, 20, 40, 42 |
| Presenter page (plans) | `/live/admin/` | 00, 05, 10, vendor, 20, 50, 55 |

| File | What is in it |
| --- | --- |
| `00-common.js` | `LV`: settings from the page, the code and join secret from the address, DOM helper `LV.h`, localStorage, the browser token, the presenter key, `LV.api` (HTTP with the key), `LV.connect` (the WebSocket with gentle reconnects and pings), the privacy note |
| `05-key.js` | The presenter key box (kept in sessionStorage `live-key`: per tab, gone when the tab closes; never in localStorage, and an old copy there is deleted) |
| `10-render.js` | Drawing the worker's views: phone card, bars, timer, ranking, question list, projector screen; also used for the previews |
| `20-qr.js` | QR codes (SVG, PNG, `<img>`) from the vendored encoder |
| `vendor/qrcode-generator.js` | Kazuhiko Arase's QR encoder 1.4.4, MIT, unchanged (see `vendor/README.md`) |
| `30-audience.js` | The audience page |
| `40-present.js` | The projector view: keys, controls, reactions, QR overlay, quick poll |
| `42-remote.js` | The remote: big buttons, question and nickname moderation, jump to an activity |
| `50-admin.js` | The presenter page: talks, the plan form, saving |
| `55-admin-side.js` | Its side column: preview, QR code downloads, rehearsal, results export (CSV cells that start with `=`, `+`, `-`, `@`, a tab or a line break get a `'` first, so audience text cannot run as a spreadsheet formula) |

Keep each file under about 600 lines (as in `assets/js/games/README.md`). Check the syntax of a page's bundle with
e.g. `cat assets/js/live/{00-common,10-render,30-audience}.js | node --check -`. The limits in `LV.LIMITS` copy the
worker's (`tools/live-worker/src/plan.js`); `node tools/live-worker/test/run.js` checks that they agree.

Keys on the projector: right arrow or Page Down next (or start), left or Page Up back, R reveal (Shift+R hides), Q QR
code, L ranking, Escape close the activity, P quick poll, F full screen, ? help. The controls fade out after 3 s
without mouse movement. A quiz reveals itself on the projector when its time is up.

Nicknames (optional, for the quiz ranking) reach the projector and the other phones only once the presenter approves
them on the remote ("Approve", "Keep off", "Approve all"); until then, and when kept off, the ranking shows the guest
name ("Guest 123"). Each phone sees its own nickname.

Privacy (shown on the pages): no accounts, no cookies, no IP addresses stored (the worker counts connections per
address in memory only, against abuse); a random token in localStorage (`live-tok`) so a reload is not a second person
(the worker gives each phone its own random id and the token only finds it again); nicknames optional; everything about
a talk is deleted 24 hours after it ends, and nicknames given before a talk that does not start 24 hours after the last
one, or at once when its plan is deleted; Cloudflare carries the connection and may keep backups of stored data for a
limited time.
