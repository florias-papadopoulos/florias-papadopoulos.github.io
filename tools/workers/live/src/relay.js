// The relay of the site's Signal demo (/phd/projects/signal/): the pure rules, tested by test/run.js; the Durable
// Object that applies them is Relay in index.js. Two phones meet in a room (12 letters from the QR code) and the
// relay forwards what one sends to the other, unchanged. It reads nothing and keeps nothing: the phones send only
// public keys and ciphertext, and the room's secret never reaches it.
//
// Messages from the relay are plain words, never JSON, so a phone cannot fake them: "peers:1", "peers:2".
// Messages between the phones must be JSON objects (start with "{"); anything else is dropped.
// Close codes: 4003 the room already has two phones, 4008 the room's time is up, 4029 too many messages,
// 1009 a message too long.

export const RELAY = {
    peers: 2,            // phones per room
    msg: 4096,           // characters per message
    burst: 30,           // messages at once ...
    perSec: 2,           // ... then this many a second
    life: 30 * 60 * 1000 // a room is closed 30 minutes after its first phone came
};

export function roomOk(r) { return typeof r === 'string' && /^[a-z2-7]{12}$/.test(r); }

/* what a phone's socket carries through hibernation: its message budget */
export function fresh(now) { return { ok: true, b: RELAY.burst, t: now }; }

/* one message spent: -> {ok, att} (att is the new attachment) */
export function spend(att, now) {
    const t = typeof att.t === 'number' ? att.t : now;
    const b = Math.min(RELAY.burst, (typeof att.b === 'number' ? att.b : RELAY.burst) + Math.max(0, now - t) / 1000 * RELAY.perSec);
    if (b < 1) return { ok: false, att: att };
    return { ok: true, att: { ok: true, b: b - 1, t: now } };
}

/* -> 'forward', 'drop' or 'big' */
export function judge(msg) {
    if (typeof msg !== 'string') return 'drop';
    if (msg.length > RELAY.msg) return 'big';
    return msg.charAt(0) === '{' ? 'forward' : 'drop';
}
