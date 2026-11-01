// Game content is published only as AES-256-GCM ciphertext (see tools/build.py).
// The key is derived from the game's password with PBKDF2-SHA256.
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export async function decryptJson(box, password) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64(box.salt), iterations: box.iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}
