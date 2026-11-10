# Games: how they are built

Every game on the Games page is listed in `content/games/_index.md` and run by the shell `arcade.js` (its header
documents the `api` a game gets). The layout `layouts/_default/arcade.html` loads a game's script only when it is
opened.

## Write new games in parts, not as one huge file

A game is either one file `assets/js/games/<id>.js` or a **folder** `assets/js/games/<id>/` of numbered parts
(`00-setup.js`, `10-...js`, ..., `90-...js`). The layout joins a folder's `*.js` files in name order into the same
single script, so visitors still download one file. Examples: `kitty-kart/`, `yarn-smash/`, `crypto-heist/`.

**Rule:** a new game that will be more than about 600 lines starts as a folder from day one, and a single-file game
that grows past about 1500 lines is split. Big single files are hard to work on: a helper has to read most of the
file to change one part, and runs out of room on files of thousands of lines.

How to do it:

- Cut at section headings (`/* ---------- ... ---------- */`), one job per part (setup, levels or tracks, drawing,
  physics or rules, items, the loop and controls, two-player code...), each part under about 650 lines. Leave gaps
  in the numbers (10, 20, 30) so a part can be added in between.
- The parts are pieces of one script that share one scope (the game function opens in the first part and closes in
  the last); they are not scripts of their own.
- Put a `README.md` in the folder with a table: part, what is in it. Keep it up to date when parts change.
- Check the syntax of the whole, joined: `cat assets/js/games/<id>/*.js | node --check -`
- When splitting an existing file, change no code: the joined parts must be byte-identical to the old file. Compare
  the `integrity` of the game in the built `games/index.html` before and after (the same hash means the same file).

## Also for every game

- Dog mode (`html[data-pet="dog"]`): draw a dog with dog items (bones, tennis balls), and give dog names and texts
  in `content/games/_index.md` (`dogTitle`, `dogDesc`, `dogEmoji`) where the name mentions the cat.
- Sound only through `api.sfx` (it follows the Effects volume); a game with sounds of its own reads
  `Arcade.sfxLevel()`.
- A game with a leaderboard needs its id in `BOARDS` in `tools/workers/stats/worker.js`, with a `max` (the best real
  score, worked out from the game's scoring; `min` too when lower is better) and its `tracks` when it passes a `board`
  to `api.end` (the worker refuses any other track). Then run `node tools/workers/stats/test/run.js` and paste the
  worker into Cloudflare again.
- Original designs only, no clones of existing games.
