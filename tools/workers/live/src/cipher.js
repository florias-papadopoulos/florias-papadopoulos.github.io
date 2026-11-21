// Audience mode: the giant shared cipher (activity type "cipher"). Pure functions, tested by test/run.js.
// The presenter writes a message in the plan; when the activity first opens, the worker makes a random substitution
// key (from the CSPRNG; no letter stays itself) and the phones get only the ciphertext. Everyone guesses letters
// ("I think Q is E"). A guess counts while it is recent (FADE); a letter locks for everyone when enough phones agree
// on the right plain letter: at least MIN, and SHARE of the phones that are guessing. Wrong guesses never lock and
// fade away by themselves, and a phone hears nothing about a single guess, so no one can try letters until one
// sticks. Phones whose guess locked a letter get POINTS each (on the quiz ranking). The presenter can give a hint
// (lock the most frequent letter still open) or solve it all.

export const FADE = 90000;   // ms a guess keeps counting
export const SHARE = 0.25;   // of the phones guessing (in the last FADE) that must agree
export const MIN = 2;        // and at least this many
export const POINTS = 100;   // per locked letter, for each phone that guessed it right
export const TEXT_MIN = 10, TEXT_MAX = 240, LETTERS_MIN = 6;
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* the message as it is enciphered: accents removed, upper case, A to Z, digits, spaces and . , ! ? ' - : ; kept,
   anything else a space; runs of spaces made one */
export function normText(s) {
    if (typeof s !== 'string') return '';
    const t = s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'SS').toUpperCase()
        .replace(/[^A-Z0-9 .,!?'\-:;]/g, ' ').replace(/\s+/g, ' ').trim();
    return Array.from(t).slice(0, TEXT_MAX).join('').trim();
}
export function distinct(t) { return new Set(t.replace(/[^A-Z]/g, '').split('').filter(Boolean)).size; }

/* a random substitution: key[i] is the cipher letter of plain letter ABC[i]; no letter maps to itself. bytes(n):
   n random bytes from a CSPRNG (rejection sampling, so every shuffle is equally likely) */
export function makeKey(bytes) {
    for (;;) {
        const a = ABC.split('');
        for (let i = a.length - 1; i > 0; i--) {
            let r;
            do { r = bytes(1)[0]; } while (r >= 256 - (256 % (i + 1)));
            const j = r % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
        }
        if (a.every(function (c, i) { return c !== ABC[i]; })) return a.join('');
    }
}
export function keyOk(k) { return typeof k === 'string' && k.length === 26 && new Set(k.split('')).size === 26 && /^[A-Z]+$/.test(k); }
export function encrypt(text, key) { return text.replace(/[A-Z]/g, function (c) { return key[c.charCodeAt(0) - 65]; }); }
/* cipher letter -> plain letter */
export function plainOf(key, x) { const i = key.indexOf(x); return i < 0 ? '' : ABC[i]; }
/* the cipher letters in the ciphertext, most frequent first (ties alphabetical) */
export function cipherLetters(ct) {
    const n = {};
    for (const c of ct) if (c >= 'A' && c <= 'Z') n[c] = (n[c] || 0) + 1;
    return Object.keys(n).sort(function (x, y) { return n[y] - n[x] || (x < y ? -1 : 1); });
}

/* how many phones must agree, given how many are guessing */
export function need(active) { return Math.max(MIN, Math.ceil(SHARE * active)); }

/* from the guesses of one activity ({ id: { g: { X: [Y, t] }, p } }): the phones guessing now, and for each open
   cipher letter the plain letter most phones guess now, with how many: { active, lean: { X: [Y, n] } } */
export function crowd(by, lock, now) {
    let active = 0;
    const votes = {};
    for (const id of Object.keys(by)) {
        const g = by[id].g || {};
        let on = false;
        for (const x of Object.keys(g)) {
            if (now - g[x][1] >= FADE) continue;
            on = true;
            if (lock[x]) continue;
            const v = votes[x] || (votes[x] = {});
            v[g[x][0]] = (v[g[x][0]] || 0) + 1;
        }
        if (on) active++;
    }
    const lean = {};
    for (const x of Object.keys(votes)) {
        const v = votes[x];
        const y = Object.keys(v).sort(function (a, b) { return v[b] - v[a] || (a < b ? -1 : 1); })[0];
        lean[x] = [y, v[y]];
    }
    return { active: active, lean: lean };
}
/* the phones whose guess for x is y and still counts */
export function agreeing(by, x, y, now) {
    return Object.keys(by).filter(function (id) { const g = (by[id].g || {})[x]; return g && g[0] === y && now - g[1] < FADE; });
}
/* every cipher letter of the text locked? */
export function solved(ct, lock) { return cipherLetters(ct).every(function (x) { return !!lock[x]; }); }
