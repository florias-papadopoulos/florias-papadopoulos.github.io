# Crypto Heist, in parts

One game, kept as numbered parts of **one** script: `layouts/_default/arcade.html` joins every `*.js` file of this
folder in name order into `js/games/crypto-heist.js`. The parts share one scope (the function opened in
`00-core.js` and closed in `90-run.js`); they are not scripts of their own.

| Part | What is in it |
|---|---|
| `00-core.js` | header comment (the game and the room kit `ctx` described), maths helpers, the toy hash, styles, `makeCtx` (number pad, bit switches...) |
| `10-symmetric.js` | Pad Lock (one-time pad), Lazy Pad (two-time pad), Penguin Leak (ECB) |
| `20-public-key.js` | Clock Shop (modular arithmetic), Tiny RSA |
| `30-signatures-exchange.js` | the shared machines (power, multiply, inverse) of this group of rooms, Copycat Signature (RSA forgery), Secret Handshake (Diffie-Hellman and the man in the middle), ElGamal Mailbox; it opens a scope that `35-oracle-echo.js` closes |
| `35-oracle-echo.js` | on Hard only: Yes-No Oracle (padding oracle) and Echo Trick (reflection attack) |
| `40-hashes.js` | Birthday Party (collisions), Password Bowl (salting), Treat Miner (proof of work) |
| `50-protocols.js` | Cave of Whiskers (zero knowledge), Three Paws (Shamir 2 of 3) |
| `90-run.js` | the run (picking rooms, the clock, hints, scoring, the cards between rooms, the end) and `Arcade.register` |

A room is one `room({...})` call (see the header of `00-core.js`); `order` sets where it comes in a run.
Check the whole, joined: `cat assets/js/games/crypto-heist/*.js | node --check -`
