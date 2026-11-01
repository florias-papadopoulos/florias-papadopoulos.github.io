# Yarn Smash: ideas to make it very nice and playable

Status of each idea: **[done]** means it is in the game (first pass: the November 2026 overhaul; second pass: the
twelve ideas the site owner picked right after), **[next]** means a good candidate for a later pass, everything else is
open. Effort: S (an hour or two), M (half a day), L (a day or more).

## Done in the first pass (the rest of the [done] items came in the second pass)

1. **[done] A clear play area.** All text (world banner, tips, combo and yarn changes, power-up timers, how-to) lives in
   a slim band at the top; hit feedback in the scene is a quick ring of light, never a word. Why: the targets are the
   game, nothing may hide them. Effort: M.
2. **[done] Fantastical worlds instead of real places**: Skyfall Isles, Glowcap Hollow, Geode Depths, Aurora
   Palace, Clockwork Spire, Starlight Road (and Woolly Dreamland, see 29), each with its own geometry (open causeway with rope bridges, open forest,
   faceted tunnel, wide ice causeway, walkway across a shaft, ribbon road in space), palette, sky, light and motes.
   Why: variety keeps an endless runner fresh. Effort: L.
3. **[done] One twist per world**: floating glass that rises and falls (run under it), ghost glass that fades in and
   out, tough geode glass (2 or 3 hits), sliding ice panes, spinning panes and gear hatches with a lever, airlocks plus
   every earlier trick in space. Why: each world asks for a slightly different skill. Effort: M.
4. **[done] Smooth transitions**: sky, fog and light crossfade over the last 38 m before each rift gate, the walls and
   scenery of a world grow out of the ground after a gate and sink back before the next one, bends and rolls ease over
   36 m, and everything fades in from the fog. The next world's sky and sprites are painted ahead of time, one per frame,
   so the gate never stutters. Effort: L.
5. **[done] Richer rendering**: gradient skies with parallax as the path turns and rolls, soft cloud seas, sprite
   scenery painted once with gradients and fogged with a silhouette pass, soft contact shadows, glow halos, a vignette.
   Effort: L.
6. **[done] Difficulty curve**: friendly first 25 s (slow, wide gaps, single panes, plenty of crystals), then speed
   rises to 11.5 m/s, gaps shrink, rows of 2 or 3 panes and twists become common, crystals get rarer, combos need 5 and
   12 hits, crashes cost more on later laps. Effort: S (tuning with bots).
7. **[done] Power-up orbs**: Giant yarn (7 s: every hit shatters the whole row) and Slow paws (5 s of half-speed time).
   Why: moments of power and relief in a run that keeps getting harder. Effort: M.
8. **[done] Rolling roads**: the path rises and falls (a projection warp, so physics stays simple), most in the sky
   and in space. Why: more sense of speed and place. Effort: M.

## Mechanics and power-ups

9. **[done] Yarn magnet orb**: for 6 s every crystal within 24 m flies into the cat's paws (3 yarn each). Why: a calm
   power-up for low-ammo moments. Effort: S.
10. **[done] Ricochet yarn**: an orb that lasts 8 s; each ball that breaks a pane flies on (golden trail) to the next pane
    within 18 m behind it and can break it too. Why: rewards lining up shots. Effort: M.
11. **[done] Charge throw**: hold (mouse, finger or Space) for about a second; a thin bar fills at the very bottom
    between the paws, which wind back. Release throws a golden heavy ball that goes straight through tough glass, for 2
    yarn. A tap throws on release. Why: a choice instead of spam, good on phones as a long press. Effort: M.
12. **[done] Glass with a heart**: about one row in ten has a pane with a glowing crystal set in it; breaking the pane
    frees the crystal, which flies to the cat for 2 yarn. Why: more decisions about where to spend yarn. Effort: S.
13. **[done] Mirror panes** in the Aurora Palace: some glass rows have an archway of ice mirrors 2 m behind them; a
    ball that misses wide or high bounces off once, back onto the glass. Effort: M.

## Set pieces and bosses

14. **[done] Glass guardians**: in the last stretch of every world a creature of glass panels swoops in and drifts
    ahead: storm roc (beating crystal wings, a glowing core, lightning between its panels, its own storm cloud), moth,
    golem, frost owl, clock beetle, bubble sheep, star ray. Only the glowing panel can break; then the next one lights
    up (3 panels in the first world, up to 5 on later laps). Shatter it for 3 yarn and 150 points; if it reaches the
    gate it swoops and takes 3 yarn. Why: a climax in every world. Effort: L.
14b. **[done] Guardian attacks**, each telegraphed by a shrinking red ring and a sound, more often in later worlds and
    laps: the roc dives at the cat (hit it to interrupt) or drops lightning on marked spots (shoot the storm orbs);
    the moth scatters dust that clings to the view (pop it); the golem hurls crystal boulders (shatter them in the
    air); the owl fires a fan of ice shards (a hit freezes a paw: slower throws); the beetle rolls gear wheels down
    the road; the sheep puffs bubble shields over its panels and lobs soap bubbles; the ray sweeps a beam (hit the
    ray to cut it off). A hit costs 1 or 2 yarn, never the run. Effort: L.
15. **[done] Gate challenges**: from the third gate on, about every other rift gate has three small panes in front; hit
    all three within 2 s (a golden arc shows the time) and the gate opens by itself for 3 yarn and 80 points. Too slow
    and they grow back; the gate can still be broken the normal way. Effort: S.
16. **[done] Waterfall run** in Skyfall Isles: from 52 to 108 m into the world, a narrow plank bridge between walls of
    falling water, where the view closes in to about 18 m so panes appear late. Effort: M.

## Progression and scoring

17. **[removed] Medals per world**: built in the second pass, then taken out at the owner's request (no medal toasts,
    no medal lines on the game over card, nothing stored).
18. **[done] Accuracy and best combo** on the game over card ("72% hits, best combo 18"). Effort: S.
19. **Daily seed**: one fixed layout per day (seeded random), same for everyone, with its own best. Why: a reason to
    come back and compare. Effort: M (replace Math.random in spawning with a seeded generator).
20. **Start from a reached world** after you have reached it twice. Why: lets good players see later worlds sooner.
    Effort: S.

## Juice and feel

21. **[next] Sounds per event** using the existing api.sfx set more richly: 'jump' for power-ups (done), 'win' at gates
    (done), a short double 'pop' for full-row shatters, 'move' clicks for tough glass cracks. Effort: S.
22. **Hit stop**: freeze 40 ms when a whole row shatters. Effort: S.
23. **Glass shards that land and twinkle** on the floor for a few seconds. Effort: S.
24. **Cat reactions**: the paws grip faster at high speed, and a happy paw wave after a perfect gate. Effort: S.

## Accessibility and phone controls

25. **Colour-blind safe glass outlines**: a pattern (dashes) on twist glass, not only colour. Effort: S.
26. **[next] Left or right handed paws** and a bigger tap snap radius setting for small phones. Effort: S.
27. **Pause when the tab is hidden** and a tap-to-continue card. Effort: S (needs a visibilitychange listener through
    api.on).
28. **Reduced motion mode** already removes shake, flashing, spinning sprites and halves particles; next step: an
    optional calmer speed curve. Effort: S.

## Content

31. **[done] Glass critters**: little groups of small glass creatures in every world (sparrows that swoop, beetles that
    hop, crystal bats that zigzag, frost wisps that spiral, wind-up mice that scurry, bumblebees that wobble, drones
    that dart). One hit each, 15 points, a ball of yarn for a whole group; one that reaches the cat nips a ball of
    yarn away. Few in the first world, more later and on later laps; bigger tap area for fair aiming. Effort: M.

29. **[done] Seventh world, Woolly Dreamland** (between Clockwork Spire and Starlight Road): a striped knitted scarf for
    a road across knitted meadows, button suns, cotton clouds, knitting needle trees, giant buttons, pompom flowers.
    Its twist: glass soap bubbles that start floating up as you come near; pop them or let them rise. Effort: L.
30. **[done] Cat skins**: the paws follow the site's cat look picker (CSS variables of the corner mascot): ginger,
    silver tabby grey, Halloween bat dark grey, tuxedo black with white toes. Effort: S.
