# Audience mode (the hidden /live/ pages)

Live polls, quiz, audience questions and reactions during talks. Hidden: no link anywhere on the site, not in the
sitemap, `noindex`. The audience reaches `/live/#<code>/<join secret>` (e.g. `/live/#pkc27/k3x9mn2p`) only through the
QR code or the link on the speaker's slides (the part after `#` never reaches any server). The join secret is made by
the worker when a talk is first saved (another one for its rehearsal); without it no phone can join, so knowing or
guessing a talk code is not enough. The worker is `tools/workers/live/` (its README has the setup, the design and the
cost per talk); the pages are `layouts/live/` (standalone pages: no menu, footer, corner buttons, visit counter or
pet), the styles `assets/css/common/live.css` (all under `.lv`). The worker address is `params.liveEndpoint` in
`config.yml`; while it is empty the pages say "not set up yet".

| Page | Address | Files (joined in this order into one script) |
| --- | --- | --- |
| Audience (phone first) | `/live/#pkc27/k3x9mn2p` | 00, 10, 15, 30 |
| Projector and remote | `/live/present/#pkc27` | 00, 05, 10, 15, vendor, 20, 40, 42 |
| Presenter page (plans) | `/live/admin/` | 00, 05, 10, vendor, 20, 50, 55 |

| File | What is in it |
| --- | --- |
| `00-common.js` | `LV`: settings from the page, the code and join secret from the address, DOM helper `LV.h`, localStorage, the browser token, the presenter key, `LV.api` (HTTP with the key), `LV.connect` (the WebSocket with gentle reconnects and pings), the privacy note |
| `05-key.js` | The presenter key box (kept in sessionStorage `live-key`: per tab, gone when the tab closes; never in localStorage, and an old copy there is deleted) |
| `10-render.js` | Drawing the worker's views: phone card, bars, timer, ranking, question list, projector screen; also used for the previews |
| `15-ballot.js` | Secret ballots, the cryptography: P-256 and SHA-256 in plain BigInt, exponential ElGamal, the proofs that a ballot is one vote for one answer, checking, adding up and decrypting the sums (`LV.ballot`; tested by `tools/workers/live/test/ballot.test.cjs`) |
| `20-qr.js` | QR codes (SVG, PNG, `<img>`) from the vendored encoder |
| `vendor/qrcode-generator.js` | Kazuhiko Arase's QR encoder 1.4.4, MIT, unchanged (see `vendor/README.md`) |
| `30-audience.js` | The audience page |
| `40-present.js` | The projector view: keys, controls, reactions, QR overlay, quick poll |
| `42-remote.js` | The remote: big buttons, question and nickname moderation, jump to an activity |
| `50-admin.js` | The presenter page: talks, the plan form, saving |
| `55-admin-side.js` | Its side column: preview, QR code downloads, rehearsal, results export (CSV cells that start with `=`, `+`, `-`, `@`, a tab or a line break get a `'` first, so audience text cannot run as a spreadsheet formula) |

**Secret ballots** (activity type `ballot`, 2 to 5 answers). When a ballot opens, the projector page (never the
remote) makes a key pair, keeps the secret key in this browser's localStorage (`live-bsk:<session>:<activity>`,
deleted after two days) and sends the public key; while no ballot is in, a projector without the key takes over with
a new one. Each phone encrypts a 1 for its answer and a 0 for the others, with a zero knowledge proof that every
ciphertext holds 0 or 1 and that they add up to 1, and sends that; it keeps its own answer in sessionStorage only. The
worker keeps the ballots as they are (one per phone, no copies of another's ciphertexts) and forwards each to the
projector, which checks the proofs as they arrive (about 25 ms each on a laptop) and adds the valid ones up while
encrypted. "Close and count" (R) closes the ballot; the projector then decrypts only the sums and sends the counts and
the number of rejected ballots, which the worker checks add up to the ballots it holds. The trust: the worker never
sees a vote; the projector's browser could decrypt a single ballot (it holds the key), but its code only ever
decrypts the sums. A second, independent key holder (threshold decryption) would remove that; not built.

**Shared cipher** (activity type `cipher`): the presenter writes a message (10 to 240 characters, accents dropped);
when it first opens, the worker makes a random substitution key (CSPRNG, no letter stays itself) and phones get only
the ciphertext (capitals) and the locked letters. A phone taps a capital and picks a small letter; a guess counts for
90 s. A letter locks for everyone when at least 2 phones, and a quarter of those guessing, agree on the right letter;
wrong guesses never lock and fade by themselves, and a phone hears nothing about a single guess. The projector shows
the crowd's leading guess for each open letter in grey. Each phone that helps lock a letter gets 100 points on the
quiz ranking. Keys: H a hint (the most frequent open letter), R solve it all. Logic: `tools/workers/live/src/cipher.js`.

Keep each file under about 600 lines (as in `assets/js/games/README.md`). Check the syntax of a page's bundle with
e.g. `cat assets/js/live/{00-common,10-render,30-audience}.js | node --check -`. The limits in `LV.LIMITS` copy the
worker's (`tools/workers/live/src/plan.js`); `node tools/workers/live/test/run.js` checks that they agree.

Keys on the projector: right arrow or Page Down next (or start), left or Page Up back, R reveal (Shift+R hides), Q QR
code, L ranking, Escape close the activity, P quick poll, F full screen, ? help. The controls fade out after 3 s
without mouse movement. A quiz reveals itself on the projector when its time is up.

Nicknames (optional, for the quiz ranking) are refused when they contain rude words (the word lists shared with the
leaderboards) and are otherwise shown at once on the projector and the other phones; the presenter can hide one on the
remote ("Hide", "Show again"), and a hidden one shows as the guest name ("Guest 123"). Each phone sees its own nickname.

Privacy (shown on the pages): no accounts, no cookies, no IP addresses stored (the worker counts connections per
address in memory only, against abuse); a random token in localStorage (`live-tok`) so a reload is not a second person
(the worker gives each phone its own random id and the token only finds it again); nicknames optional; everything about
a talk is deleted 24 hours after it ends, and nicknames given before a talk that does not start 24 hours after the last
one, or at once when its plan is deleted; Cloudflare carries the connection and may keep backups of stored data for a
limited time.
