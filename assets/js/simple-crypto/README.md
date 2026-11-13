# Simple Crypto (the lab's /simple-crypto/ tab)

Short animated stories without words: the cat sends a secret to the dog, and the fox sees everything sent. Made for
school visits (projected in a classroom) and visitors. The page is `layouts/simple-crypto/simple-crypto.html` (the
three stories, their titles and one-line captions, and a hidden copy of the cat drawing `cat-svg.html`), the styles
`assets/css/common/simple-crypto.css`. The files here are joined in name order into one script
(`resources.Match "js/simple-crypto/*.js"`, then minified and fingerprinted with SRI).

| File | What is in it |
| --- | --- |
| `00-core.js` | `SC`: the story registry and the drawing helpers `SC.H` (easing, colour mixing, arcs; the cat and the dog copied from the page's hidden drawing, the fox, pots, letters, paw prints, tick, cross, thought bubble, the room) |
| `10-player.js` | The player: big play button, scene back/forward, play/pause/replay, the scene track (click or drag), full screen, keys, reduced motion, one story at a time, pause when out of view |
| `20-key-exchange.js` | Story 1: key exchange as paint mixing (Diffie-Hellman), ending with a padlock in the shared colour |
| `30-signature.js` | Story 2: a paw stamp only the cat has, a see-through pattern everyone has, a fake seal, a changed letter |
| `40-hash.js` | Story 3: the grinder that turns a letter into six coloured blocks, and cannot turn them back |
| `90-boot.js` | Starts a player for each `.sc-player[data-story]` |

A story is `SC.story({ id, scenes: [seconds...], poster, keys, build })`. `build(svg, H)` draws everything once
and returns `render(t)`, which puts every part where it is at `t` seconds. Because `render` depends on `t` only,
playing, scrubbing and stepping are all the same call. `poster` is the picture shown before the first play; `keys`
(optional) is the still of each scene with reduced motion (default: the end of the scene). The stage is 800 x 450
with the floor at y 372; the cat stands at x 105, the dog at 695 (mirrored), the fox at 400.

Keys in a player: space plays or pauses, left and right go a scene back or forward, Home and End jump to the start or
the end, F toggles full screen. With `prefers-reduced-motion` a story plays as one still per scene, held a few
seconds each. The roaming pet keeps off the players (`assets/js/lab/cat-pages.js` counts them as places it must not
cover; the player sends `tl-change` when it starts, so a pet sitting there moves away).

The animations have no words on purpose (lesson from an earlier teaching page: too much text, no real insight).
Keep each file under about 600 lines; check the bundle with `cat assets/js/simple-crypto/*.js | node --check -`.
