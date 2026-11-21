# florias-live: audience mode for talks

The Cloudflare Worker behind the site's hidden `/live/` pages. The audience scans a QR code on a slide and lands on
`https://florias-papadopoulos.github.io/live/#pkc27/k3x9mn2p` (the talk code, then its join secret); the presenter plans
talks on `/live/admin/` and runs them from
`/live/present/#pkc27` (projector, and the same page on his phone as a remote). Site code: `assets/js/live/`
(README there), `layouts/live/`, `assets/css/common/live.css`.

(It also ran a relay for a two-phone Signal demo until 2026-11-13; removed, see "The Signal relay (removed)" below.)

## One-time setup (on your own computer, not on the server)

Wrangler needs a recent Node (20 or later); the server's node is too old.

1. In this folder: `npm install` (installs wrangler locally).
2. `npx wrangler login`: opens the browser, log in to the Cloudflare account of the visit counter.
3. Make a presenter key in your own terminal, for example
   `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`
   and check that it has lower case, upper case and digits (at least 24 characters; run it again if not). Never paste
   it into a chat or a file in this repository.
4. `npx wrangler deploy`. It prints the address, e.g. `https://florias-live.floriaspapadopoulos.workers.dev`.
5. `npx wrangler secret put PRESENTER_KEY` and paste the key when asked. (Until then, or with a weak key, every
   presenter function stays locked.)
6. Check it: open that address in a browser. It should show
   `{"service":"florias-live","presenterKey":"set"}`.
7. Put the address (no trailing slash) into `config.yml` as `params.liveEndpoint`, build and push the site.
8. Open `https://florias-papadopoulos.github.io/live/admin/`, enter the key (kept in that tab until you close it, never
   in localStorage), create a talk, and try it with "Test on my phone". The projector view opened from there usually
   gets the key from that tab; a tab opened otherwise (and the remote on your phone) asks for it once.

Request logs stay off (`[observability] enabled = false`), so no audience IP address is kept anywhere. The Session
counts connections per address only in its memory (never in storage or a socket attachment), which is lost whenever the
object sleeps.

To change the key: run steps 3 and 5 again; open tabs that kept the old key ask for the new one.
Local development with wrangler: create `.dev.vars` (ignored by git) with `DEV=1` and a `PRESENTER_KEY=...`, run
`npx wrangler dev`, and build the site with `HUGO_PARAMS_LIVEENDPOINT=http://localhost:8787`.

## Design

- **Session** Durable Object, one per talk (`idFromName("pkc27")`; a rehearsal is `pkc27.test`). Every phone, the
  projector and the remote keep one WebSocket to it (Hibernation API: `ctx.acceptWebSocket`, `webSocketMessage`,
  `webSocketClose`). Between messages the object sleeps; all state is in its SQLite storage, per-connection data in
  the socket attachment. The object pushes every change; nobody polls. Storage keys: `meta`, `plan`, and one small key
  per phone (`ph:<token>`), vote (`v:<activity>:<id>`), question (`q:<n>`) and upvote (`u:<n>:<id>`), so no value
  grows with the audience (the counts are added up when the object wakes). Plans are limited to 64,000 bytes, so `meta`
  stays far below the 128 KiB a single value may safely have.
- **Plans** Durable Object (`idFromName("owner")`): the plans, quiz answers and join secrets included, never in the
  public repository. A save is pushed to the talk's Session and its rehearsal, so phones see the title before the
  start.
- **Join secrets**: the first save of a talk makes two random 8 character secrets (40 bits each, from the CSPRNG), one
  for the talk and one for its rehearsal. They go into the QR code and the link (`/live/#pkc27/k3x9mn2p`) and a phone
  must send the right one in its hello, so a talk code alone (easy to guess) lets nobody in. They stay the same when
  the plan is edited; the page cannot set them. A plan saved before secrets existed gets them on its next save.
- **Phones**: the worker gives each phone a random id (16 characters, CSPRNG) at its first hello; votes, questions,
  upvotes and nicknames are kept under that id. The browser's own token (`live-tok`) only finds the id again after a
  reload, and one connection cannot switch tokens (a second hello with another one closes it).
- **Nicknames** with rude words are refused (the leaderboards' word lists); the others are shown at once, and the
  presenter can hide one on the remote (it then shows as "Guest 123").
- **Alarms**: a started session ends by itself after 12 hours without a presenter command; 24 hours after a session
  ends, its audience data (votes, questions, nicknames) is deleted. Nicknames given while a talk waits to start are
  deleted 24 hours after the last one if it has not started by then, and at once when its plan is deleted. Plans stay
  until deleted on `/live/admin/`. Cloudflare may keep its own backups of deleted data for a limited time (point in
  time recovery, up to 30 days).
- **Logic** is in pure functions: `src/plan.js` (plan format and checks, codes, nicknames, the key, origins) and
  `src/session.js` (the state machine, scoring, views, what to store and send). `src/index.js` only connects them to
  Cloudflare. The message protocol is listed at the top of `src/session.js`, the HTTP routes at the top of
  `src/index.js`.

Limits against abuse: 2000 characters per message; a connection that has not said hello within 10 s is closed when
the next one arrives (pings alone, which the auto-response answers without waking the object, cannot hold a place);
500 joined phones per session, 600 audience connections in all (the oldest without a hello makes room), 150 from one
address (an IPv6 /64), 300 new phones from one address while the object is awake, 2000 phones that keep anything per
session; 6 presenter connections (the presenter always gets in: unauthenticated presenter sockets make room); a
message budget per connection (40 at once, then one a second; past it the connection is closed); one vote per
activity per connection and per phone id; questions at most one per 15 s and 5 per phone (300 per session);
reactions 5 at once then one per 1.2 s per phone and 12 a second for the whole room; nicknames through the
leaderboards' filter (Latin letters only, `SHORT` words as whole words, `LONG` ones anywhere: `nameOk` and its lists
copied unchanged from `tools/workers/stats/worker.js`; the test checks the copy on a list of names) and the presenter's approval. Only `https://florias-papadopoulos.github.io`
may connect (and localhost when `DEV` is `"1"`). The presenter key is compared in constant time and is only ever sent
in an `Authorization: Bearer` header or as the first WebSocket message, never in a URL.

## What this cannot stop (security review, 2026-11-21)

A phone's identity is a random token, so one person with a script can act as many phones: vote several times in a
poll, quiz or secret ballot (the proofs show one vote per ballot, not one ballot per person), fill the session caps,
brute force a shared cipher letter by letter (a letter locks when 2 phones agree, so two scripted phones can try
letters until one locks) or outvote the room on it. Counting per address would stop that, but a conference Wi-Fi puts
the whole room behind one address, so it would break honest use, and storing addresses would break the privacy
promise. Audience mode is for fun polls and games in a talk, not for anything that must be fair against a scripted
attacker; the join secret keeps everyone without the QR code out. The Origin check stops browsers on other sites only;
a script can send any Origin, so the join secret and the presenter key are the real gates.

## Secret ballots

Activity type `ballot` (2 to 5 answers; `LIMITS.ballotOpts`). The cryptography is in the site's
`assets/js/live/15-ballot.js` (exponential ElGamal on P-256 with proofs that a ballot is one vote for one answer); its
README describes the flow. This worker only stores and forwards: a phone's `vote` carries the encrypted ballot
(`ballotShape` checks its form, about 1,550 characters for 5 answers), kept under `b:<activity>:<id>`, one per phone,
copies of another ballot's ciphertexts refused; the projector sends the public key (`bkey`, fixed once a ballot uses
it), fetches all ballots (`bget`, 100 to a message), checks the proofs and sends the decrypted counts (`tally`, only
after `reveal` closed the ballot, and only if counts plus rejected ballots equal the ballots stored). The proofs are not
checked here: one 5 answer ballot takes some 25 ms of CPU, more than the Free plan allows a request. Ballots are
audience data: deleted with the rest 24 hours after the talk.

## Shared cipher

Activity type `cipher`, the room cracks a substitution cipher together. Logic in `src/cipher.js` (key, encryption,
the crowd, the lock rule), wired into `src/session.js` (`guess`, `hint`, `reveal` solves it). Each phone's guesses and
points are one small key `g:<activity>:<id>`; the key and the locked letters are in `meta`. The message itself stays
in the plan and reaches phones only once every letter is locked. Guesses are audience data: deleted with the rest.

## The Signal relay (removed)

A relay for a two-phone version of the Signal demo (`/relay/<room>`, a `Relay` Durable Object, migration `v2`) ran here
from 2026-11-13 and was removed the same day: the Signal page now runs on one device only. Migration `v3` deletes the
`Relay` class and anything it held; the next `npx wrangler deploy` applies it. Audience mode is not affected.

## What a talk costs (Workers Free plan)

The Free plan has 100,000 Worker requests a day for the whole account (shared with the visit counter) and, separately,
100,000 Durable Object requests, 100,000 SQLite rows written and 5 million rows read a day.

A 45 minute talk with 100 phones:

- **Worker requests**: one per WebSocket connection, plus reconnects when a phone was locked: about 100 to 300, plus a
  handful for the projector and remote, plus a few for the presenter page (each save is 1 request and, at most once a
  day per browser, a CORS preflight).
- **Durable Object requests**: the same connections, plus incoming messages at 20 messages per request: votes,
  questions and reactions are a few hundred to a few thousand messages, so tens to about a hundred requests. Phones
  send "ping" every 50 s while their screen is on (answered by the auto-response, without waking the object); if
  Cloudflare counts those, add at most 270. In all about 300 to 700.
- **Rows written**: about one per vote, question, upvote or nickname, one per phone that keeps anything, and one per
  presenter command: 1,000 to 3,000.
- **Rows read**: every key of the session each time the object wakes (about one key per vote, upvote and phone: some
  2,000 for 100 phones), and it wakes after each quiet spell of about 10 s: up to about 200,000 rows for a talk, 4% of the
  daily 5 million.

So a talk uses at most a few percent of the daily limits. Phones reconnect gently (1.5 s, then doubling up to 30 s, giving up
after 12 failures in a row or 60 connections per page view), so a network problem cannot turn into a request storm.

## Tests

```
node test/run.js                       # the pure logic (node 12 or later)
node test/ballot.test.cjs              # the secret ballot cryptography, against node's own P-256 and SHA-256 (BENCH=1: timings)
node test/qr.cjs OUT_DIR [PYLIB]       # the site's QR codes; with a folder holding zxing-cpp for Python, they are decoded
LIVE_DEV_KEY=... HIBERNATE=1 SCRATCH=DIR node test/devserver.js
```

`test/devserver.js` runs the real `src/index.js` on node with small emulations of the Durable Object APIs and a minimal
WebSocket server; with `HIBERNATE=1` each Session is rebuilt from storage after every event, as on Cloudflare. It
shows that the code is consistent with the documented APIs; it is not Cloudflare itself.

## Later (not built)

- **Threshold decryption for secret ballots** (built: the `ballot` activity, see below): the key split between the
  projector and this worker, so that neither alone could open a single ballot.
- A **zero-knowledge guard** activity.
- **More presenters** with invite-only accounts: one Plans object per presenter (`idFromName("presenter:<id>")`), a
  small registry object mapping talk codes to presenters, and a key per presenter instead of the single
  `PRESENTER_KEY`.
