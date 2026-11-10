---
title: "Games"
description: "Small games to play with the cat."
intro: "Testing the limits of Claude, one cat game at a time."
dogIntro: "Testing the limits of Claude, one dog game at a time."
layout: arcade
# Each game is assets/js/games/<id>.js, or for a big one a folder assets/js/games/<id>/ of parts (loaded only when opened;
# new games over about 600 lines are written as such a folder, see assets/js/games/README.md). group: complex, two or simple (the three tabs of the page:
# Best, 2 Player, More; Best opens first).
# levels: true shows the Easy/Normal/Hard picker while playing (the game reads it with api.level()).
# script: <file> runs a game from another game's file (assets/js/games/<file>.js registers both ids).
# dogTitle, dogDesc, dogEmoji: the name, text and icon shown instead when a dog is chosen (html[data-pet="dog"]); default the cat ones.
# restart: false hides the restart button and the end panel's "Play again" (a two-player race would lose the other player).
# tracks: the sub-boards of a game's leaderboard (Kitty Kart tracks, Garden Defender gardens): the ids the game passes
# to api.end as board, with names for the picker on the Leaderboards tab (trackLabel names the picker, default Track;
# with a single track the picker is not shown and that board is used).
games:
  - { id: cipher-cat,     title: "Cipher Cat",          emoji: "🔐", desc: "The cat hid a message. Crack the code before the clock runs out.", dogTitle: "Cipher Dog", dogDesc: "The dog hid a message. Crack the code before the clock runs out.", group: simple, levels: true }
  - { id: cat-tower,      title: "Cat Tower Stack",     emoji: "🗼", desc: "Drop the pieces, build the tallest wobbly cat tower.", dogTitle: "Dog Tower Stack", dogDesc: "Drop the pieces, build the tallest wobbly dog tower.", group: simple, levels: true }
  - { id: laser-chase,    title: "Laser Chase",         emoji: "💫", desc: "Steer the laser dot, the cat follows. Mind the vases.", dogDesc: "Steer the laser dot, the dog follows. Mind the vases.", group: simple, levels: true }
  - { id: night-prowl,    title: "Night Prowl",         emoji: "🌙", desc: "Sneak to the treat jar without being seen.", group: simple, levels: true }
  - { id: orbit-paws,     title: "Purrbit Patrol",      emoji: "🛰️", desc: "Steer cat satellites around space junk and zap debris with lasers.", dogTitle: "Woofbit Patrol", dogDesc: "Steer dog satellites around space junk and zap debris with lasers.", group: simple, levels: true }
  - { id: paw-raiders,    title: "Paw Raiders",         emoji: "🚀", desc: "Fly a cardboard box rocket and throw yarn at ducks, drones and robot vacuums.", group: simple, levels: true }
  - { id: dino-valley,    title: "Dino Valley",         emoji: "🦕", desc: "Ride a baby dinosaur home with the cat on its back before the volcano blows.", dogDesc: "Ride a baby dinosaur home with the dog on its back before the volcano blows.", group: simple, levels: true }
  - { id: long-cat,       title: "Long Cat",            emoji: "🐈", desc: "Eat fish, grow the longest cat, don't trip over your own tail.", dogTitle: "Long Dog", dogEmoji: "🐕", dogDesc: "Eat fish, grow the longest dog, don't trip over your own tail.", group: simple, levels: true }
  - { id: whack-a-mouse,  title: "Whack-a-Mouse",       emoji: "🐭", desc: "Tap the mice before they hide.", group: simple, levels: true }
  - { id: paw-pairs,      title: "Paw Pairs",           emoji: "🃏",  desc: "Flip cards, find the matching cats.", dogDesc: "Flip cards, find the matching dogs.", group: simple, levels: true }
  - { id: four-in-a-row,  title: "Four in a Row",       emoji: "🔴",  desc: "Line up four, or five, paws before the cat does.", dogDesc: "Line up four, or five, paws before the dog does.", group: simple, levels: true }
  - { id: tic-tac-paw,    title: "Tic-Tac-Paw",         emoji: "🐾",  desc: "Three in a row against the cat.", dogDesc: "Three in a row against the dog.", group: simple, levels: true }
  - { id: sliding-kitten, title: "Sliding Kitten",      emoji: "🧩",  desc: "Slide the tiles back into a cat.", dogTitle: "Sliding Puppy", dogDesc: "Slide the tiles back into a puppy.", group: simple, levels: true }
  - { id: mouse-sweeper,  title: "Mouse Sweeper",       emoji: "🔎",  desc: "Find every hidden mouse.", group: simple, levels: true }
  - { id: brick-paw,      title: "Brick Paw",           emoji: "🧱", desc: "Bounce the yarn ball, clear the bricks.", group: simple, levels: true }
  - { id: cucumber-hop,   title: "Cucumber Hop",        emoji: "🥒", desc: "Jump the cucumbers, run as far as you can.", group: simple, levels: true }
  - { id: kitty-kart,     title: "Kitty Kart",          emoji: "🏎️",  desc: "Race the cats on twelve tracks, from a volcano to a singing piano road.", dogTitle: "Puppy Kart", dogDesc: "Race the dogs on twelve tracks, from a volcano to a singing piano road.", group: complex, levels: true,
      tracks: [{ id: meadow, name: "Catnip Meadow" }, { id: city, name: "Night City" }, { id: reef, name: "Coral Reef" }, { id: moon, name: "Moon Rim" }, { id: volcano, name: "Lava Peak" }, { id: trees, name: "Giant Grove" }, { id: desert, name: "Red Canyon" }, { id: sky, name: "Blossom Town" }, { id: music, name: "Melody Lane" }, { id: rainbow, name: "Prism Skyway" }, { id: zombie, name: "Zombie Town" }, { id: room, name: "Living Room Rally" }] }
  - { id: kitty-kart-duo, title: "Kitty Kart Duo",      emoji: "🏁", desc: "Race a friend on their own phone or computer, both on the same home wifi.", dogTitle: "Puppy Kart Duo", group: two, script: kitty-kart, restart: false }
  - { id: kitty-kart-split, title: "Kitty Kart Split Screen", emoji: "📱", desc: "Two players on one phone, one half each, or on one keyboard. No internet needed.", dogTitle: "Puppy Kart Split Screen", group: two, script: kitty-kart, levels: true }
  - { id: tic-tac-paw-2p, title: "Tic Tac Two",         emoji: "#️⃣", desc: "Two players on one phone or computer, taking turns. Paws against fish.", group: two, script: tic-tac-paw }
  - { id: four-in-a-row-2p, title: "Four for Two",        emoji: "🟠", desc: "Two players on one phone or computer, taking turns. Four or five in a row.", group: two, script: four-in-a-row }
  - { id: crypto-heist,   title: "Crypto Heist",        emoji: "🗝️", desc: "Break into the Treat Vault room by room: one-time pads, RSA, hashes, Diffie-Hellman and zero knowledge, by hand.", group: simple, levels: true }
  - { id: yarn-smash,     title: "Yarn Smash",          emoji: "🪟", desc: "Sky isles, crystal caves, a clockwork tower: smash the glass with yarn.", group: complex, levels: true }
  - { id: garden-defender, title: "Garden Defender",    emoji: "🐞", desc: "Keep the bugs, snails and wind up mice out with a water pistol while the garden keeps changing, and grab the power ups they drop.", group: complex, levels: true,
      tracks: [{ id: tour, name: "Garden Tour" }] }
---
