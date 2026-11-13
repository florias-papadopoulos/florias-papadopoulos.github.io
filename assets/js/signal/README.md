# Signal in two browsers (/phd/signal/)

The Signal protocol (X3DH, then the Double Ratchet, as in signal.org/docs) with real keys in the visitor's browser.
Page: `content/phd/signal/index.md` (its text is the "What is happening" part), layout `layouts/phd/signal.html`,
styles `assets/css/phd/signal.css`. It builds on the Master project "Overview of the Signal Protocol" (/master/#signal-protocol).

Alice and Bob side by side in this tab (stacked on phones), each with a machine of ratchet gears, Eve on the network
reading the wire. Steal one side's keys: earlier messages stay locked (forward secrecy); Eve reads on until that side
makes a fresh ratchet key, then she is locked out again (post-compromise security). Nothing leaves the tab: no server,
no third-party request. The steps play by themselves (chat) or one per click (step by step), each with a one line
caption.

The look, in short (assets/css/phd/signal.css has the details): Alice blue and Bob violet for what they write and for
their sending chains (a1, a2 ... and b1, b2 ...; a small gear has the colour of its chain, so Alice's sending gear and
Bob's receiving gear match), amber for the DH ratchet and its root keys, red for Eve, green for the same key on both
sides and for Eve locked out. Every key is a chip with 6 hex digits (the whole value in its title); a shredded key stays
in place, grey and struck through.

| File | What is in it |
| --- | --- |
| `00-crypto.js` | Bytes helpers, HKDF, HMAC, SHA-256, AES-GCM, X25519 and signatures, all WebCrypto; X25519 in plain JavaScript (BigInt, RFC 7748) where WebCrypto has none or fails the RFC test vector; ECDSA P-256 where there is no Ed25519. `SG.ready` says which |
| `10-ratchet.js` | X3DH, the Double Ratchet (skipped message keys, state rolled back when a message fails), the wire format, Eve |
| `20-view.js` | A person's card (chat, input, a slot for the gears), the wire list, the key chip (`SG.hexCode`) |
| `22-gears.js` | The machine of each person: the big DH gear (root chain) and the send and recv gears (symmetric ratchets), each step one tooth, with columns of numbered keys; Eve's red copy that jams. Driven by the ratchet's events (10-ratchet.js) |
| `24-chain.js` | The chain view: a tapped gear or key as a KDF ladder with the real values |
| `26-x3dh.js` | The X3DH picture (four DH lines into one KDF), and `SG.Lines`, curves between elements, placed again on scroll and resize |
| `28-player.js` | Plays the steps with one line captions: by themselves (chat) or one per click (step by step); the speed; the flying key |
| `30-local.js` | The demo: Alice, Bob, Eve and the wire, the player's controls |
| `50-main.js` | The start: the bar with the controls and "Start again", the fallback without WebCrypto |

The page's script is these files joined in that order. Check with `cat assets/js/signal/*.js | node --check -`
and test the JavaScript X25519 with `node assets/js/signal/test/x25519.cjs`. Keep each file under about 600 lines.

Differences from the specifications, all small: the identity key signs with a separate Ed25519 key (not XEdDSA),
public keys are encoded raw (no type byte), messages use AES-256-GCM with key and nonce from HKDF of the message key.
