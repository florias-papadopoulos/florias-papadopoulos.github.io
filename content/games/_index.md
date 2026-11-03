---
title: "Games"
description: "Small games to play with the cat."
intro: "Testing the limits of Claude, one cat game at a time."
layout: arcade
# Each game is assets/js/games/<id>.js (loaded only when opened). group: complex, two or simple (the three tabs of the page:
# Best, 2 Player, More; Best opens first).
# levels: true shows the Easy/Normal/Hard picker while playing (the game reads it with api.level()).
# script: <file> runs a game from another game's file (assets/js/games/<file>.js registers both ids).
# restart: false hides the restart button (a two-player race would lose the other player).
# tracks: the sub-boards of a game's leaderboard (Kitty Kart tracks, Garden Defender gardens): the ids the game passes
# to api.end as board, with names for the picker on the Leaderboards tab (trackLabel names the picker, default Track).
games:
  - { id: night-prowl,    title: "Night Prowl",         emoji: "🌙", desc: "Sneak to the treat jar without being seen.", group: simple, levels: true }
  - { id: orbit-paws,     title: "Purrbit Patrol",      emoji: "🛰️", desc: "Steer cat satellites around space junk and zap debris with lasers.", group: simple, levels: true }
  - { id: paw-raiders,    title: "Paw Raiders",         emoji: "🚀", desc: "Fly a cardboard box rocket and throw yarn at ducks, drones and robot vacuums.", group: simple, levels: true }
  - { id: dino-valley,    title: "Dino Valley",         emoji: "🦕", desc: "Ride a baby dinosaur home with the cat on its back before the volcano blows.", group: simple, levels: true }
  - { id: long-cat,       title: "Long Cat",            emoji: "🐈", desc: "Eat fish, grow the longest cat, don't trip over your own tail.", group: simple, levels: true }
  - { id: whack-a-mouse,  title: "Whack-a-Mouse",       emoji: "🐭", desc: "Tap the mice before they hide.", group: simple, levels: true }
  - { id: paw-pairs,      title: "Paw Pairs",           emoji: "🃏",  desc: "Flip cards, find the matching cats.", group: simple, levels: true }
  - { id: four-in-a-row,  title: "Four in a Row",       emoji: "🔴",  desc: "Line up four, or five, paws before the cat does.", group: simple, levels: true }
  - { id: tic-tac-paw,    title: "Tic-Tac-Paw",         emoji: "🐾",  desc: "Three in a row against the cat.", group: simple, levels: true }
  - { id: sliding-kitten, title: "Sliding Kitten",      emoji: "🧩",  desc: "Slide the tiles back into a cat.", group: simple, levels: true }
  - { id: mouse-sweeper,  title: "Mouse Sweeper",       emoji: "🔎",  desc: "Find every hidden mouse.", group: simple, levels: true }
  - { id: brick-paw,      title: "Brick Paw",           emoji: "🧱", desc: "Bounce the yarn ball, clear the bricks.", group: simple, levels: true }
  - { id: cucumber-hop,   title: "Cucumber Hop",        emoji: "🥒", desc: "Jump the cucumbers, run as far as you can.", group: simple, levels: true }
  - { id: kitty-kart,     title: "Kitty Kart",          emoji: "🏎️",  desc: "Race the cats on eight tracks, from a volcano to the moon.", group: complex, levels: true }
  - { id: kitty-kart-duo, title: "Kitty Kart Duo",      emoji: "🏁", desc: "Race a friend on their own phone or computer, both on the same home wifi.", group: two, script: kitty-kart, restart: false }
  - { id: kitty-kart-split, title: "Kitty Kart Split Screen", emoji: "📱", desc: "Two players on one phone, one half each, or on one keyboard. No internet needed.", group: two, script: kitty-kart, levels: true }
  - { id: tic-tac-paw-2p, title: "Tic Tac Two",         emoji: "#️⃣", desc: "Two players on one phone or computer, taking turns. Paws against fish.", group: two, script: tic-tac-paw }
  - { id: four-in-a-row-2p, title: "Four for Two",        emoji: "🟠", desc: "Two players on one phone or computer, taking turns. Four or five in a row.", group: two, script: four-in-a-row }
  - { id: yarn-smash,     title: "Yarn Smash",          emoji: "🪟", desc: "Sky isles, crystal caves, a clockwork tower: smash the glass with yarn.", group: complex, levels: true }
  - { id: garden-defender, title: "Garden Defender",    emoji: "🐞", desc: "Keep the bugs, snails and wind up mice out of six gardens with a water pistol, and grab the power ups they drop.", group: complex, levels: true,
      trackLabel: Garden, tracks: [{ id: lawn, name: "Front Lawn" }, { id: patch, name: "Vegetable Patch" }, { id: pond, name: "Lily Pond" }, { id: orchard, name: "Apple Orchard" }, { id: court, name: "Hedge Court" }, { id: night, name: "Moonlit Garden" }, { id: tour, name: "Garden Tour" }] }
---
