# Zero Knowledge, in parts

One game, kept as numbered parts of **one** script: `layouts/_default/arcade.html` joins every `*.js` file of this
folder in name order into `js/games/zero-knowledge.js`. The parts share one scope (the function opened in
`00-setup.js` and closed in `90-run.js`); they are not scripts of their own.

| Part | What is in it |
|---|---|
| `00-setup.js` | header comment (the levels, roles, trust and scoring), helpers, the maths and protocol logic in `LOGIC` (cave, map colouring, graph isomorphism, square roots mod n, Schnorr, the bluffer and fence cheater strategies), the pet's colours, the paints, the styles |
| `10-draw.js` | the drawing kit: the pet (cat or dog), Hoot the guard owl, speech bubbles, yarn and tennis balls, paw and bone, envelopes, the map of gardens |
| `20-cave.js` | the ring cave scene (walks, the door, Hoot at the entrance; also used by Fake Video and Night Watch) and the Moon Cave level |
| `30-balls.js` | Two Yarn Balls (Two Tennis Balls with a dog): the colour-blind guard |
| `40-envelopes.js` | Sealed Envelopes: the 3-colouring proof, with the map scene helpers also used by Fence Inspector |
| `50-twins.js` | Twin Maps: graph isomorphism |
| `60-numbers.js` | the chalkboard scene, Square Root Club (square roots mod n) and Bell Tower (Schnorr, the impostor's bet, the reused r) |
| `70-video.js` | Fake Video: the simulator (rewinding the cave, the premiere, faking Schnorr rounds backwards) |
| `80-verifier.js` | the other provers' looks, Night Watch (you guard the cave) and Fence Inspector (Hard: you guard the envelope proof) |
| `90-run.js` | the level kit `K` (documented at the top), the order of levels per difficulty, the cards between levels, trust, score, the clock, input and `Arcade.register` |

A level is one `level({...})` call (see the top of `90-run.js`); `ORDER` in `90-run.js` sets which levels a run plays.
For testing in a page: `window.__zkOnly = ['bell']` plays just those levels.

Check the whole, joined: `cat assets/js/games/zero-knowledge/*.js | node --check -`

The logic can be loaded in node without a page (the joined file exports `{ LOGIC, LEVELS, ORDER }` when `module`
exists, and stops before `Arcade.register`):

```
cat assets/js/games/zero-knowledge/*.js > /some/dir/zk.js
node -e "global.window={};global.document={documentElement:{dataset:{}}};var L=require('/some/dir/zk.js').LOGIC;console.log(L.GROUPS)"
```
