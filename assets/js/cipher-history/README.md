# Cipher History (the lab's /cipher-history/ tab)

Stories of real ciphers and the people who broke them. The front page is a corridor of eras with a card per story;
each story page has four parts: **the story** (4 to 5 sentences, more behind "Read more", an optional primary source),
**the machine** (the cipher working live on the visitor's text), **Your turn** (break a real or faithful message with
the method of the time, three hints, a check that says when it is solved) and **What really happened** (the facts,
"Historians disagree" boxes, a myth box, the sources with links). Solved stories get a stamp in the visitor's
"detective's notebook" (localStorage `ch-notebook`, this browser only).

## Files

| File | What |
| --- | --- |
| `content/cipher-history/_index.md` | The tab: title, intro, the list of eras (`eras:` id, name, span) |
| `content/cipher-history/<id>.md` | One story: all its text, in front matter (see below) |
| `layouts/cipher-history/list.html` | The front page (corridor, cards, stamps) |
| `layouts/cipher-history/single.html` | A story page (the four parts) |
| `layouts/partials/cipher-history/script.html` | The script: `00-core.js`, the Toolbox's `calc/lib/text.js`, `calc/lib/code-breaking.js` and `calc/data/english-quadgrams.js` (unchanged), then the other parts here in name order. One file for every page of the tab |
| `assets/css/common/cipher-history.css` | Styles (light colours only) |
| `00-core.js` | `CH`: the registry, DOM helpers, the notebook, `CH.print` (answer fingerprints), a minimal `Calc` for the Toolbox libraries |
| `10-desk-wheel.js` | Desk tool: the cipher wheel, `CH.desk.shift`, the list of all 25 shifts |
| `15-desk-climb.js` | Desk tool: the hill climber for a homophonic cipher (`CH.climb.make`, `CH.desk.climber`): one step with its reason, or climb with a chart of the best English quadgram score; random restarts when stuck |
| `20-desk-bench.js` | Desk tool: the frequency bench (English bars, a card per sign with its count and a box for its letter or word, the message with the letters found so far; letters swap, nulls and a doubling sign are supported; `many: true` lets several signs share a letter, `setAll` fills a whole key) |
| `30-desk-kasiski.js` | Desk tools: Kasiski repeats (coloured, gaps, divisors, key length buttons) and the column splitter (one slider per key letter, bars against English) |
| `40-desk-turn.js` | The frame of Your turn: hints one at a time, the status line, the stamp |
| `45-front.js` | The front page: stamps and the notebook line |
| `51-caesar.js` ... `55-mary-2023.js` | The stories (machine and puzzle): Caesar, al-Kindi, Bellaso and Kasiski, Babington, Mary Stuart's lost letters (2023) |
| `90-boot.js` | Starts the front page or the story on the page |
| `test/run.js` | Tests: `node assets/js/cipher-history/test/run.js` (must end with `ok`) |

Reused from the Toolbox (imported as they are, nothing changed there): `Calc.lib.text` (letters, English letter
frequencies), `Calc.lib.breaking` (Caesar, Vigenère and substitution in both directions, Kasiski repeats, columns,
chi-squared, the quadgram score, the seeded random generator and the FNV hash) and `Calc.data.quadgrams` (English
quadgram counts, about 50 kB, for the hill climber).

## Adding a story

1. **Check the facts first.** Every fact needs at least two reputable sources (primary texts, archives, peer-reviewed
   papers, academic books); dates and numbers only where they agree. Disputed points go into a "Historians disagree"
   box, a contested story gets `label: "Contested"`. If a detail cannot be checked, leave it out. Quote primary sources
   only from public domain translations, with the translation named. Scans only when their licence allows it;
   otherwise transcribe or redraw and give the archive reference. Notes: `__NotOnline/historic-crypto/` (not in git).
2. **Write `content/cipher-history/<id>.md`.** Front matter (Markdown allowed in the long texts):

   ```yaml
   title: "Short title"
   order: 50                 # place on the corridor (10, 20, 30... leave gaps)
   era: ww1                  # an id from _index.md's eras
   when: "January 1917"      # shown on the card and above the title
   place: "Berlin, London, Washington"
   line: "One sentence for the card."
   description: "One sentence for search engines and link previews."
   label: "Contested"        # optional; labelnote: optional words after it
   story: |                  # 4 to 5 short sentences
   quote:                    # optional primary source: text, original (optional), lang, source
   more: |                   # behind "Read more"
   machine: |                # one or two sentences over the machine
   task: |                   # what to do in Your turn
   hints: ["...", "...", "..."]   # three levels: a nudge, a big step, (nearly) the answer
   truth: |                  # What really happened (end with a "Then and now" line linking the Toolbox)
   disagree: ["**Question?** Who says what."]   # optional, one box each
   myth: { claim: "...", text: "..." }          # optional
   sources:                  # at least 2; url optional
     - text: "Author, *Title*, publisher, year."
       url: "https://..."
   ```

3. **Write `assets/js/cipher-history/5x-<id>.js`** (56 to 89 are free; keep each file under about 600 lines):

   ```js
   (function () {
       'use strict';
       var MSG = '...';          // the puzzle's ciphertext
       var ANSWER = '...';       // CH.print(plaintext): computed in the test, so the plaintext is not in the page
       CH.story({
           id: '<id>',           // = the .md file name
           msg: MSG, answer: ANSWER,   // anything the tests need
           machine: function (el) { /* draw the live cipher into el; use CH.el, CH.field, CH.desk.* */ },
           puzzle: function (el, turn) {
               /* draw the puzzle into el; on every change: */
               if (CH.print(visitorsPlaintext) === ANSWER) turn.solved('Solved: ...');
               else turn.say('A neutral line about the progress.');
           }
       });
   })();
   ```

   Ready tools: `CH.desk.wheel`, `CH.desk.allShifts`, `CH.desk.bench` (letters, or signs with `words`, `special`,
   `nulls`, `many`), `CH.desk.repeats`, `CH.desk.columns`, `CH.desk.climber`; write a new desk tool as its own numbered file (10 to 49) when a
   story needs one (a codebook rebuilder, a rotor, a crib dragger...) so later stories can reuse it.
4. **Test it** in `test/stories.test.js`: keep the plaintext there, check that the ciphertext is the plaintext
   enciphered with the key, that the answer fingerprint matches, and that the method of the time really finds the
   key. `test/run.js` also checks that every page has a script and the other way round, the required front matter,
   two sources at least, and no em or en dash or double hyphen used as a dash anywhere in the tab's texts.
5. **Look at it**: `hugo`, then the story at desktop size and at 390 x 844 and 375 x 667 (no sideways scrolling, form
   fields 16 px), no console errors, every step of the puzzle until it says solved.

Writing style: an 18 year old with no background must follow it alone. Short sentences, plain English, show rather
than tell, no em dashes. Plain, typographic look: no gradients, glows or pills.
