import { forgetPassword, getPassword, getProgress, resetProgress, saveResult, setPassword, starsFor } from './store.js';
import { decryptJson } from './vault.js';

const app = document.getElementById('app');
const cache = {};
const unlocked = {};

async function load(name) {
  if (!cache[name]) {
    cache[name] = fetch(`content/${name}.json`).then(r => {
      if (!r.ok) throw new Error(`${name}: ${r.status}`);
      return r.json();
    });
    cache[name].catch(() => { delete cache[name]; });
  }
  return cache[name];
}

// Returns the decrypted game, or null when the password is missing or wrong.
async function openGame(gameId, password = getPassword(gameId)) {
  if (unlocked[gameId]) return unlocked[gameId];
  if (!password) return null;
  const box = await load(`${gameId}.enc`);
  try {
    unlocked[gameId] = await decryptJson(box, password);
  } catch {
    forgetPassword(gameId);
    return null;
  }
  setPassword(gameId, password);
  return unlocked[gameId];
}

export function renderMath(el) {
  if (window.renderMathInElement) {
    window.renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }
}

function starsHtml(n) {
  return `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}">&#9733;</span>`).join('')}</span>`;
}

function allLevels(game) {
  return game.parts.flatMap(p => p.levels);
}

// A level is open when it is the first one or the previous one was passed.
function levelStates(game) {
  const progress = getProgress(game.id);
  let open = true;
  return allLevels(game).map(level => {
    const best = progress[level.id]?.best ?? 0;
    const stars = starsFor(best, game.passMark);
    const state = stars > 0 ? 'done' : open ? 'open' : 'locked';
    open = stars > 0;
    return { level, stars, state };
  });
}

// Views

const GLYPHS = ['🔑', '🔒', '0', '1', '⊕', 'mod', '∑', 'π', '#', 'λ', '🗝️', '✦', 'XOR', '≡', '🎲', 'φ(n)'];
const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@';

// The title "decrypts" from random characters, revealing one letter at a time.
function scramble(el) {
  const text = el.dataset.text;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = text; return; }
  let frame = 0;
  clearInterval(el._timer);
  el._timer = setInterval(() => {
    const shown = Math.floor(frame / 3);
    el.textContent = [...text].map((c, i) => i < shown ? c : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]).join('');
    if (shown >= text.length) clearInterval(el._timer);
    frame++;
  }, 35);
}

async function hub() {
  const games = await load('games');
  document.body.classList.add('on-hub');
  const floaters = Array.from({ length: 22 }, (_, i) => {
    const g = GLYPHS[i % GLYPHS.length];
    const size = 14 + Math.random() * 26;
    return `<span style="left:${(i * 4.6 + Math.random() * 3).toFixed(1)}%;font-size:${size.toFixed(0)}px;` +
      `animation-duration:${(16 + Math.random() * 14).toFixed(1)}s;animation-delay:${(-Math.random() * 30).toFixed(1)}s">${g}</span>`;
  }).join('');
  app.innerHTML = `
    <div class="hub-bg" aria-hidden="true">${floaters}</div>
    <section class="hub-hero">
      <h1 class="hub-title" data-text="CryptoGames">CryptoGames</h1>
      <p class="hub-lead">Short levels that follow the course, built from the lectures and the exercise solutions.</p>
    </section>
    <div class="games">
      ${games.map(g => g.status === 'open' ? `
        <a class="game-card game-${g.id}" href="#/${g.id}">
          <div class="card-art"><span class="art-emoji">${g.emoji}</span></div>
          <div class="card-body">
            <span class="tag">${g.degree}</span>
            <h2>${g.title}</h2>
            <p class="muted">Play through the course, one topic at a time.</p>
            <span class="btn">&#9654; Play</span>
          </div>
        </a>` : `
        <div class="game-card game-${g.id} soon">
          <span class="ribbon">Coming soon</span>
          <div class="card-art"><span class="art-emoji">${g.emoji}</span></div>
          <div class="card-body">
            <span class="tag">${g.degree}</span>
            <h2>${g.title}</h2>
            <p class="muted">Still being built.</p>
            <button class="btn" disabled>&#128274; Locked</button>
          </div>
        </div>`).join('')}
    </div>`;
  const title = app.querySelector('.hub-title');
  scramble(title);
  title.addEventListener('mouseenter', () => scramble(title));
}

function lockScreen(meta) {
  app.innerHTML = `
    <a class="back" href="#/">&larr; All games</a>
    <div class="card lock">
      <span class="tag">${meta.degree}</span>
      <h1>${meta.title}</h1>
      <p class="muted">This game is for students of the course. Enter the password you received in class.</p>
      <form class="numrow" id="pwform">
        <input id="pw" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password">
        <button class="btn" type="submit">Unlock</button>
      </form>
      <p class="error" id="pwerr" role="alert"></p>
    </div>`;
  const input = app.querySelector('#pw');
  const button = app.querySelector('#pwform button');
  const err = app.querySelector('#pwerr');
  input.focus();
  app.querySelector('#pwform').onsubmit = async e => {
    e.preventDefault();
    if (!input.value) return;
    button.disabled = true;
    button.textContent = 'Unlocking...';
    err.textContent = '';
    try {
      if (await openGame(meta.id, input.value)) return route();
      err.textContent = 'Wrong password.';
    } catch {
      err.textContent = 'Could not load the game. Check your connection and try again.';
    }
    button.disabled = false;
    button.textContent = 'Unlock';
    input.select();
  };
}

function map(game) {
  const gameId = game.id;
  const states = levelStates(game);
  const earned = states.reduce((s, x) => s + x.stars, 0);
  const max = states.length * 3;
  let i = 0;
  app.innerHTML = `
    <a class="back" href="#/">&larr; All games</a>
    <div class="map-head">
      <div><span class="tag">${game.degree}</span><h1>${game.title}</h1></div>
      <div class="total">&#9733; ${earned} / ${max}</div>
    </div>
    <div class="bar"><span style="width:${100 * earned / max}%"></span></div>
    ${game.parts.map(part => `
      <section class="part">
        <h2><b>${part.label}</b> &middot; ${part.title}</h2>
        <ol class="levels">
          ${part.levels.map(() => {
            const { level, stars, state } = states[i++];
            const inner = `
              <span class="num">${state === 'locked' ? '&#128274;' : i}</span>
              <span class="level-text"><strong>${level.title}</strong><span>${level.source} &middot; ${level.questions.length} questions</span></span>
              ${starsHtml(stars)}`;
            return `<li>${state === 'locked'
              ? `<div class="level locked" aria-disabled="true">${inner}</div>`
              : `<a class="level ${state}" href="#/${game.id}/${level.id}">${inner}</a>`}</li>`;
          }).join('')}
        </ol>
      </section>`).join('')}
    <div class="map-foot">
      <button class="linklike" id="reset">Reset progress</button>
      <button class="linklike" id="lock">Lock on this device</button>
    </div>`;
  app.querySelector('#reset').onclick = () => {
    if (confirm('Reset all progress for this game?')) { resetProgress(gameId); map(game); }
  };
  app.querySelector('#lock').onclick = () => {
    forgetPassword(gameId);
    delete unlocked[gameId];
    route();
  };
}

const TYPE_LABEL = { choice: 'Multiple choice', truefalse: 'True or false', number: 'Compute' };

function play(game, levelId) {
  const gameId = game.id;
  const states = levelStates(game);
  const idx = states.findIndex(s => s.level.id === levelId);
  if (idx < 0 || states[idx].state === 'locked') { location.hash = `#/${gameId}`; return; }
  const level = states[idx].level;
  const qs = level.questions;
  let n = 0;
  let correct = 0;

  function showQuestion() {
    const q = qs[n];
    const options = q.type === 'truefalse' ? ['True', 'False'] : q.options;
    app.innerHTML = `
      <div class="quiz-top">
        <a class="close" href="#/${gameId}" aria-label="Leave level">&times;</a>
        <div class="bar"><span style="width:${100 * n / qs.length}%"></span></div>
        <span class="count">${n + 1} / ${qs.length}</span>
      </div>
      <div class="card">
        <div class="qtype">${TYPE_LABEL[q.type]}</div>
        <div class="prompt">${q.prompt}</div>
        ${q.type === 'number' ? `
          <form class="numrow" id="numform">
            <input id="num" inputmode="numeric" autocomplete="off" placeholder="Your answer" aria-label="Your answer">
            <button class="btn" type="submit">Check</button>
          </form>` : `
          <div class="options ${options.length === 2 ? 'two' : ''}">
            ${options.map((o, k) => `<button class="option" data-k="${k}">${o}</button>`).join('')}
          </div>`}
      </div>
      <div id="fb"></div>`;
    renderMath(app);

    if (q.type === 'number') {
      const input = app.querySelector('#num');
      input.focus();
      app.querySelector('#numform').onsubmit = e => {
        e.preventDefault();
        if (input.value.trim() === '') return;
        const ok = Number(input.value.trim()) === q.answer;
        input.disabled = true;
        input.classList.add(ok ? 'correct' : 'wrong');
        app.querySelector('#numform button').disabled = true;
        answered(q, ok);
      };
    } else {
      const right = q.type === 'truefalse' ? (q.answer ? 0 : 1) : q.answer;
      app.querySelectorAll('.option').forEach(b => {
        b.onclick = () => {
          const k = Number(b.dataset.k);
          app.querySelectorAll('.option').forEach(x => { x.disabled = true; });
          app.querySelector(`.option[data-k="${right}"]`).classList.add('correct');
          if (k !== right) b.classList.add('wrong');
          answered(q, k === right);
        };
      });
    }
  }

  function answered(q, ok) {
    if (ok) correct++;
    const fb = app.querySelector('#fb');
    const shown = q.type === 'number' ? `<p>The answer is <b>${q.answer}</b>.</p>` : '';
    fb.innerHTML = `
      <div class="feedback ${ok ? 'good' : 'bad'}">
        <h3>${ok ? 'Correct!' : 'Not quite'}</h3>
        ${ok ? '' : shown}
        <p>${q.explanation}</p>
        <div class="source">Source: ${q.source}</div>
        <button class="btn" id="next">${n + 1 < qs.length ? 'Continue' : 'See result'}</button>
      </div>`;
    renderMath(fb);
    const next = fb.querySelector('#next');
    next.focus();
    next.onclick = () => { n++; n < qs.length ? showQuestion() : showResult(); };
  }

  function showResult() {
    const score = correct / qs.length;
    saveResult(gameId, levelId, score);
    const stars = starsFor(score, game.passMark);
    const nextLevel = states[idx + 1]?.level;
    app.innerHTML = `
      <div class="card result">
        <div class="qtype">${level.title}</div>
        <div class="big">${correct} / ${qs.length}</div>
        ${starsHtml(stars)}
        <p class="muted">${stars > 0
          ? (nextLevel ? 'Level passed. The next level is unlocked.' : 'Level passed. You finished the course!')
          : `You need ${Math.round(game.passMark * 100)}% to pass. Try again!`}</p>
        <div class="actions">
          <a class="btn ghost" href="#/${gameId}">World map</a>
          <button class="btn ghost" id="retry">Retry</button>
          ${stars > 0 && nextLevel ? `<a class="btn" href="#/${gameId}/${nextLevel.id}">Next level</a>` : ''}
        </div>
      </div>`;
    app.querySelector('#retry').onclick = () => play(game, levelId);
  }

  showQuestion();
}

// Routes: #/  |  #/<game>  |  #/<game>/<level>
async function route() {
  const [gameId, levelId] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  document.body.classList.remove('on-hub');
  try {
    if (!gameId) return await hub();
    const meta = (await load('games')).find(g => g.id === gameId && g.status === 'open');
    if (!meta) { location.hash = '#/'; return; }
    const game = await openGame(gameId);
    if (!game) return lockScreen(meta);
    return levelId ? play(game, levelId) : map(game);
  } catch {
    app.innerHTML = '<p class="muted">Could not load the game. Check your connection and reload the page.</p>';
  }
}

window.addEventListener('hashchange', route);
route();
