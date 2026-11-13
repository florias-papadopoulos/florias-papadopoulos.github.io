# Signal in two browsers (/phd/signal/)

The Signal protocol (X3DH, then the Double Ratchet, as in signal.org/docs) with real keys in the visitor's browser.
Page: `content/phd/signal/index.md` (its text is the "What is happening" part), layout `layouts/phd/signal.html`,
styles `assets/css/phd/signal.css`. It builds on the Master project "Overview of the Signal Protocol" (/master/#signal-protocol).

Two modes:

- **One device** (default, no server): Alice and Bob side by side, Eve under them reading the wire. Steal one side's
  keys: earlier messages stay locked (forward secrecy); Eve reads on until that side makes a fresh ratchet key, then
  she is locked out again (post-compromise security).
- **Two phones**: the first phone (Bob) shows a QR code with a link to this page ending in `#<room>/<secret>` (12
  letters a-z, 2-7, then 16 random bytes in base64url). The other phone opens it and is Alice; it removes the secret
  from the address bar at once. The relay of the audience-mode worker (`tools/workers/live`, route `/relay/<room>`)
  forwards public keys and ciphertexts and keeps nothing; the secret never reaches it, and each phone authenticates the
  keys it sends with an HMAC under a key from that secret, so the relay cannot swap them. Both phones show the same
  number from both identity keys. Without `params.liveEndpoint`, or with a worker deployed before the relay existed
  (`GET /relay` does not answer `{"relay": true}`), the page says so in one line and stays on one device.

| File | What is in it |
| --- | --- |
| `00-crypto.js` | Bytes helpers, HKDF, HMAC, SHA-256, AES-GCM, X25519 and signatures, all WebCrypto; X25519 in plain JavaScript (BigInt, RFC 7748) where WebCrypto has none or fails the RFC test vector; ECDSA P-256 where there is no Ed25519. `SG.ready` says which |
| `10-ratchet.js` | X3DH, the Double Ratchet (skipped message keys, state rolled back when a message fails), the wire format, Eve |
| `20-view.js` | A person's card (keys with the old value struck through, chat, input) and the wire list |
| `30-local.js` | One device |
| `40-pair.js` | Two phones, through the relay |
| `50-main.js` | The start: mode switch, fallbacks |

The page's script is these files after `assets/js/live/vendor/qrcode-generator.js` and `assets/js/live/20-qr.js` (the
QR code of audience mode), joined in that order. Check with
`cat assets/js/live/vendor/qrcode-generator.js assets/js/live/20-qr.js assets/js/signal/*.js | node --check -`
and test the JavaScript X25519 with `node assets/js/signal/test/x25519.cjs`. Keep each file under about 600 lines.

Differences from the specifications, all small: the identity key signs with a separate Ed25519 key (not XEdDSA),
public keys are encoded raw (no type byte), messages use AES-256-GCM with key and nonce from HKDF of the message key.
