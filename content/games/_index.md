---
title: "Games"
description: "Small games to play with the cat."
layout: arcade
# Each game is assets/js/games/<id>.js (loaded only when opened). group: complex or simple (the two sections of the page).
# levels: true shows the Easy/Normal/Hard picker while playing (the game reads it with api.level()).
# script: <file> runs a game from another game's file (assets/js/games/<file>.js registers both ids).
# restart: false hides the restart button (a two-player race would lose the other player).
games:
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
  - { id: kitty-kart-duo, title: "Kitty Kart Duo",      emoji: "🏁", desc: "Race a friend on their own phone or computer, with two computer cats in the field.", group: complex, script: kitty-kart, restart: false }
  - { id: yarn-smash,     title: "Yarn Smash",          emoji: "🪟", desc: "Sky isles, crystal caves, a clockwork tower: smash the glass with yarn.", group: complex }
  - { id: night-prowl,    title: "Night Prowl",         emoji: "🌙", desc: "Sneak to the treat jar without being seen.", group: complex, levels: true }
  - { id: orbit-paws,     title: "Purrbit Patrol",      emoji: "🛰️", desc: "Steer cat satellites around space junk and zap debris with lasers.", group: complex, levels: true }
---
