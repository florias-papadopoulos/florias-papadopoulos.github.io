---
aliases: [/phd/projects/signal/]
title: "Signal's Double Ratchet"
blurb: "Watch the Signal ratchet turn, steal a key, and see the session heal."
lede: "The Signal protocol running in your browser with real keys: watch the ratchet turn, steal a key, and see the session heal."
preview: "img/phd/signal.svg"
weight: 2
# not yet approved by the owner: shows a 🚧 next to the title everywhere (remove the line once approved)
wip: true
layout: signal
---

- **Agreeing a key (X3DH).** Bob publishes an identity key, a signed prekey and a one-time prekey. Alice checks the signature, makes an ephemeral key and combines four Diffie-Hellman results into one shared key. Bob computes the same key from Alice's two public keys. The one-time prekey and the ephemeral key are deleted.
- **The two ratchets (Double Ratchet).** The small gears are the symmetric ratchets: each click is one KDF step of a chain (HMAC), which gives the next chain key and one message key (a1, a2, ...), used once and shredded. The big gear is the DH ratchet: when the direction of the chat changes, the receiver makes a new DH key pair, and a new Diffie-Hellman result turns the root chain, which starts fresh sending and receiving chains. Tap a gear or a key to see its chain with the real values.
- **Late messages.** A message delivered later is skipped by the receiver's gear, which keeps its key (dashed) until the message arrives.
- **Forward secrecy.** Stolen keys cannot open earlier messages: the chain only runs forward, and the old keys are gone.
- **Healing.** With one side's keys Eve can follow the chat until that side makes a fresh ratchet key. Its private half was never stolen, so Eve loses the root key and is locked out again.
- **Close to the specification.** Messages use AES-256-GCM with key and nonce from HKDF; the identity key signs with a separate Ed25519 key instead of XEdDSA. Everything else follows [X3DH](https://signal.org/docs/specifications/x3dh/) and [the Double Ratchet](https://signal.org/docs/specifications/doubleratchet/).
