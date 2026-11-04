# Kitty Kart, in parts

Kitty Kart (also Kitty Kart Duo and Kitty Kart Split Screen) is one big game, kept here as numbered parts of
**one** script. `layouts/_default/arcade.html` joins every `*.js` file of this folder in name order into
`js/games/kitty-kart.js`, so visitors still get a single file. The parts are not scripts of their own: they
are cut at the section headings of that one file, and everything shares the scope of the `kart(api, duo, split)`
function that starts in `00-setup.js` and ends in `90-split.js`.

| Part | What is in it |
|---|---|
| `00-setup.js` | header comment (the whole game described), `Arcade.register` of the three ids, settings and track arrays, `nearest()` (where a kart is on the road), building a track (spline, streets, shortcut path), drawing helpers for the cached track, particles |
| `10-tracks-meadow-city-reef.js` | culling helpers, then Catnip Meadow, Night City, Coral Reef |
| `11-tracks-moon-volcano.js` | Moon Rim, Lava Peak |
| `12-tracks-trees-desert-sky.js` | Giant Grove, Red Canyon, Blossom Town |
| `13-tracks-music-rainbow.js` | Melody Lane, Prism Skyway |
| `14-tracks-zombie-room.js` | Zombie Town, Living Room Rally, the list of tracks |
| `20-page.js` | canvas, HUD, countdown, touch buttons, the track and kart skin picker |
| `30-karts.js` | karts (the player and three computer cats), the player's look (cat or dog, `LOOK`, `dogify()`), kart skins and `dress()`, physics, laps, the off-track warning and the rescues |
| `40-ai.js` | difficulty and the computer drivers |
| `50-items.js` | items (fish tins, yarn ball, catnip, milk...) and their dog versions |
| `60-draw.js` | drawing a frame: scenery, karts, drivers, markers, minimap |
| `70-loop-controls.js` | the game loop, keys and touch controls |
| `80-duo.js` | Kitty Kart Duo: the race with a friend on another device, signalling, the linked devices |
| `90-split.js` | Kitty Kart Split Screen, and the end of the game function |

To find something, search this folder (`grep -n name assets/js/games/kitty-kart/*.js`) and read only that part.
A part can be edited on its own, but syntax only makes sense for the whole, so check it joined:

```bash
cat assets/js/games/kitty-kart/*.js | node --check -
```

A new part gets a number that puts it in the right place (for example `55-...js` between items and drawing).
Keep each part under about 650 lines; split a part that grows past that at one of its section headings.
