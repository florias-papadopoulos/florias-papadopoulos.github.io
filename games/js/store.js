// Progress lives in the browser only: { gameId: { levelId: { best: 0..1 } } }
const KEY = 'hsg-crypto-games-v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function writeAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* private mode: play without saving */ }
}

export function getProgress(gameId) {
  return readAll()[gameId] || {};
}

export function saveResult(gameId, levelId, score) {
  const all = readAll();
  const game = all[gameId] || (all[gameId] = {});
  if (!game[levelId] || score > game[levelId].best) game[levelId] = { best: score };
  writeAll(all);
}

export function resetProgress(gameId) {
  const all = readAll();
  delete all[gameId];
  writeAll(all);
}

// Passwords are kept per game so students type them once per device.
const PW_KEY = 'hsg-crypto-games-pw-v1';

function readPasswords() {
  try { return JSON.parse(localStorage.getItem(PW_KEY)) || {}; } catch { return {}; }
}

function writePasswords(pw) {
  try { localStorage.setItem(PW_KEY, JSON.stringify(pw)); } catch { /* not remembered */ }
}

export function getPassword(gameId) {
  return readPasswords()[gameId];
}

export function setPassword(gameId, password) {
  writePasswords({ ...readPasswords(), [gameId]: password });
}

export function forgetPassword(gameId) {
  const pw = readPasswords();
  delete pw[gameId];
  writePasswords(pw);
}

export function starsFor(score, passMark) {
  if (score >= 1) return 3;
  if (score >= (1 + passMark) / 2) return 2;
  return score >= passMark ? 1 : 0;
}
