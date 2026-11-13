---
aliases: [/phd/projects/signal/]
title: "Signal in two browsers"
blurb: "Watch the Signal ratchet turn, steal a key, and see the session heal."
lede: "The Signal protocol running in your browser with real keys: watch the ratchet turn, steal a key, and see the session heal."
preview: "img/phd/signal.svg"
weight: 2
layout: signal
---

- **Agreeing a key (X3DH).** Bob publishes an identity key, a signed prekey and a one-time prekey. Alice checks the signature, makes an ephemeral key and combines four Diffie-Hellman results into one shared key. Bob computes the same key from Alice's two public keys. The one-time prekey and the ephemeral key are deleted.
- **The ratchet (Double Ratchet).** Each message key comes from a chain key through HMAC, and the chain moves on, so every message has its own key, deleted right after use. When the direction of the chat changes, the receiver makes a new ratchet key pair and a new Diffie-Hellman result goes into the root key: that is the "new ratchet keys" line.
- **Forward secrecy.** Stolen keys cannot open earlier messages: the chain only runs forward, and the old keys are gone.
- **Healing.** With one side's keys Eve can follow the chat until that side makes a fresh ratchet key. Its private half was never stolen, so Eve loses the root key and is locked out again.
- **Two phones.** The relay sees only public keys and ciphertext. The secret in the QR code stays on the phones (the part of a link after `#` is never sent to a server); each phone uses it to authenticate the keys it sends, so the relay cannot slip in its own.
- **Close to the specification.** Messages use AES-256-GCM with key and nonce from HKDF; the identity key signs with a separate Ed25519 key instead of XEdDSA. Everything else follows [X3DH](https://signal.org/docs/specifications/x3dh/) and [the Double Ratchet](https://signal.org/docs/specifications/doubleratchet/).
