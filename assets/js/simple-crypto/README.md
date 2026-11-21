# Simple Crypto (the lab's /simple-crypto/ tab)

Short animated stories, told step by step: the cat sends a secret to the dog, and the fox sees everything sent. Made
for an 18 year old alone with the page (and for school visits, projected in a classroom). Each story has, from top to
bottom: the problem it solves in real life (one or two lines), the player (the picture, the caption of the current
step under it, the steps track and Back / replay / Next), a "Try it" box, and an "In real life" box that names the
real thing and links the picture to the real maths.

The page is `layouts/simple-crypto/simple-crypto.html`; all its texts (title, problem, one caption per step, the
picture's alt text, the real-life box) are in `data/simple_crypto.yaml`, in page order. The styles are
`assets/css/common/simple-crypto.css`. The files here are joined in name order into one script
(`resources.Match "js/simple-crypto/*.js"`, then minified and fingerprinted with SRI).

| File (the page order of the stories is the order in `data/simple_crypto.yaml`) | What is in it |
| --- | --- |
| `00-core.js` | `SC`: the story registry, the drawing helpers `SC.H` (easing, colour mixing, arcs; the cat and the dog copied from the page's hidden drawing, the fox, pots, letters, paw prints, tick, cross, thought bubble, the room, short labels, fingerprint strips), and `SC.sha256` / `SC.colours` (a real SHA-256 and its first hex digits as coloured blocks, for the "Try it" boxes) |
| `10-player.js` | The player: one step per scene, each played once and held at its end; the caption of the step under the picture; the steps track, Back, pause / go on / replay, Next, full screen; keys; reduced motion; one story at a time; pause when out of view |
| `15-try.js` | `SC.tryBox(id, fill)`: the "Try it" boxes, and their small DOM helpers |
| `20-key-exchange.js` | Key exchange as paint mixing (Diffie-Hellman), with a panel showing why the fox's mix is wrong (one yellow too many), ending with a padlock in the shared colour |
| `21-key-exchange-try.js` | Try it: un-mix the paint with a colour slider (paint lets you get warmer), then the real thing with small numbers (5 on a 23 hour clock: no warmer or colder) |
| `30-hash.js` | Fingerprint (hash): the grinder that turns a letter into six coloured blocks, and cannot turn them back |
| `31-hash-try.js` | Try it: type a text, see its real SHA-256 as blocks and 64 hex digits, the digits that changed marked |
| `40-signature.js` | Signature: the cat's paw stamped over the letter's fingerprint is the seal; the dog checks the paw with a see-through sheet everyone has and the colours with its own fingerprint; the fox's own paw, a moved seal and a changed word all fail |
| `41-signature-try.js` | Try it: edit the signed letter or use the fox's paw, and see the dog's two checks live |
| `50-one-time-pad.js` | Secret sheets (the one-time pad). A picture of 10 x 10 squares, the key a see-through sheet of random dots that flips the squares under them (XOR); the fox's bubble tries pictures; reusing the key lets the fox lay two sent sheets on each other and see both pictures |
| `51-one-time-pad-try.js` | Try it: draw a picture, see the key and what is sent; then reuse the key for a second picture and see the fox's overlay |
| `60-padlock.js` | Open padlocks (public-key encryption): the dog hands out open padlocks and keeps the key; the cat snaps one shut on a box (and then cannot open it itself); the fox shakes the box and tries its own open padlock; the dog's key opens it |
| `61-padlock-try.js` | Try it: the padlock as small numbers (RSA with 33 and 3, the key 7): lock a number and open it again; then be the fox and split 8051 into two factors |
| `90-boot.js` | Starts a player for each `.sc-player[data-story]` and fills each `.sc-try[data-try]` |

A story is `SC.story({ id, scenes: [seconds...], poster, keys, build })`. `build(svg, H)` draws everything once
and returns `render(t)`, which puts every part where it is at `t` seconds. Because `render` depends on `t` only,
playing, stepping and jumping are all the same call. Each scene is one step: its caption is the step's entry in
`data/simple_crypto.yaml` (keep the counts equal). A step stops 0.02 s before the next scene starts, so what a step
shows at its end must still be there at that time (things leave at the start of the next scene, not at the end of
their own). `poster` is the picture shown before the first play; `keys` (optional) is the still of each step with
reduced motion (default: the end of the step). The stage is 800 x 450 with the floor at y 372; the cat stands at x
105, the dog at 695 (mirrored), the fox at 400. Labels in the picture (`H.label`) are a few words at most and are
drawn larger on phones (the CSS sets their size).

The characters are always the cat, the dog and the fox, whatever look the visitor chose for the roaming pet: the
stories copy the cat drawing and draw it in their own flat colours (`.sc-cat`, `.sc-dog` in the CSS), so the dog
looks (`html[data-pet="dog"]`) change nothing inside the pictures.

Keys in a player: space or Enter pauses, goes on, or plays the next step when this one is done; right arrow Next,
left arrow Back, R replays the step, Home the first step, F full screen. With `prefers-reduced-motion` each step is
one still. The roaming pet keeps off the players and the boxes (`assets/js/lab/cat-pages.js` counts them as places
it must not cover; the player sends `tl-change` when a step starts, so a pet sitting there moves away).

Lesson from an earlier teaching page (a text-heavy game the owner removed as boring): show, do not lecture. One or
two short sentences per step, labels of a few words, and something to try rather than more text.
Keep each file under about 600 lines; check the bundle with `cat assets/js/simple-crypto/*.js | node --check -`.
