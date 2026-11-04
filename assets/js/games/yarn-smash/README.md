# Yarn Smash, in parts

Yarn Smash is one big game, kept here as numbered parts of **one** script. `layouts/_default/arcade.html` joins
every `*.js` file of this folder in name order into `js/games/yarn-smash.js`, so visitors still get a single file.
The parts are not scripts of their own: they are cut at the section headings of that one file and share one scope
(the game function that starts in `00-setup.js` and ends in `90-frame-hud-input.js`).

| Part | What is in it |
|---|---|
| `00-setup.js` | header comment (the whole game described, including the projection), constants and small helpers, the cat or dog look, page, state, the worlds, the path, the ball of wool (or tennis ball) |
| `10-skies.js` | the cached sky of each world |
| `20-sprites.js` | scenery sprites painted once |
| `30-strips-props.js` | ground, walls and roofs of each world; scenery props |
| `40-spawning.js` | blockers, extras, scenery and rift gates appearing ahead |
| `50-throwing-hits.js` | throwing (what is under the tap), and what happens when something is hit |
| `60-critters-guardians.js` | glass critters, guardian attacks, glass guardians |
| `70-gates-motes-loop.js` | gate challenges, mirrors, ricochets, hearts, magnets, bubbles; drifting motes; the game loop |
| `80-draw-glass.js` | drawing helpers; glass, frames, gates and hatches |
| `85-targets.js` | the targets |
| `90-frame-hud-input.js` | drawing a frame, the HUD band at the top, input, and the end of the game function |

To find something, search this folder (`grep -n name assets/js/games/yarn-smash/*.js`) and read only that part.
Check the syntax of the whole, joined:

```bash
cat assets/js/games/yarn-smash/*.js | node --check -
```

A new part gets a number that puts it in the right place. Keep each part under about 650 lines; split a part
that grows past that at one of its section headings.
