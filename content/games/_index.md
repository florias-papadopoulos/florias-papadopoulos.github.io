---
title: "Games"
description: "Small games to play with the cat."
layout: arcade
# Each game is assets/js/games/<id>.js (loaded only when opened). group: simple or complex (the two sections of the page).
# levels: true shows the Easy/Normal/Hard picker while playing (the game reads it with api.level()).
games:
  - { id: yarn-trail,     title: "Long Cat",            emoji: "🐈", desc: "Eat fish, grow the longest cat, don't trip over your own tail.", group: simple, levels: true }
  - { id: whack-a-mouse,  title: "Whack-a-Mouse",       emoji: "🐭", desc: "Tap the mice before they hide.", group: simple, levels: true }
  - { id: paw-pairs,      title: "Paw Pairs",           emoji: "🃏",  desc: "Flip cards, find the matching cats.", group: simple, levels: true }
  - { id: four-in-a-row,  title: "Four in a Row",       emoji: "🔴",  desc: "Line up four paws before the cat does.", group: simple, levels: true }
  - { id: tic-tac-paw,    title: "Tic-Tac-Paw",         emoji: "🐾",  desc: "Three in a row against the cat.", group: simple, levels: true }
  - { id: sliding-kitten, title: "Sliding Kitten",      emoji: "🧩",  desc: "Slide the tiles back into a cat.", group: simple, levels: true }
  - { id: mouse-sweeper,  title: "Mouse Sweeper",       emoji: "🔎",  desc: "Find every hidden mouse.", group: simple, levels: true }
  - { id: brick-paw,      title: "Brick Paw",           emoji: "🧱", desc: "Bounce the yarn ball, clear the bricks.", group: simple, levels: true }
  - { id: cucumber-hop,   title: "Cucumber Hop",        emoji: "🥒", desc: "Jump the cucumbers, run as far as you can.", group: simple, levels: true }
  - { id: kitty-kart,     title: "Kitty Kart",          emoji: "🏎️",  desc: "Race the cats on four tracks, from the city to the moon.", group: complex }
  - { id: yarn-smash,     title: "Yarn Smash",          emoji: "🪟", desc: "Rooftops, a greenhouse, an aquarium: smash the glass with yarn.", group: complex }
  - { id: night-prowl,    title: "Night Prowl",         emoji: "🌙", desc: "Sneak to the treat jar without being seen.", group: complex }
---
