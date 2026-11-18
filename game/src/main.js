// Glowfall's core: the game state, the fixed-step simulation, and the browser
// wiring. The simulation (createGame + stepGame + startWave) touches no DOM,
// so the screenshot scenes and a headless balance check can drive it directly.

import { MAX_WAVE, START_GOLD, START_LIVES, VIEW, WAVES, waveClearBonus } from './config.js';
import { mulberry32, range } from './rng.js';
import { createEnemy, enemiesRemaining, updateEnemies } from './enemies.js';
import { placeTower, sellTower, updateTowers, upgradeTower } from './towers.js';
import { burst, updateProjectiles } from './projectiles.js';
import { attachInput } from './input.js';
import { render, CANVAS_HEIGHT, CANVAS_WIDTH } from './render.js';
import { Sfx } from './audio.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'glowfall-best-score';

/** A fresh game state. `seed` drives the stars and the spawn jitter. */
export function createGame(seed = 1) {
  const rand = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: rand() * VIEW.width, y: rand() * VIEW.height, size: rand() < 0.85 ? 1 : 2, phase: rand() * Math.PI * 2 });
  }
  return {
    seed,
    rand,
    time: 0,
    screen: 'title',
    gold: START_GOLD,
    lives: START_LIVES,
    wave: 0,
    score: 0,
    kills: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    spawnQueue: [],
    waveActive: false,
    waveTime: 0,
    selectedTower: null,
    placeType: null,
    hoverPlot: -1,
    speed: 1,
    paused: false,
    muted: false,
    banner: '',
    bannerUntil: 0,
    best: 0,
    stars,
    fired: 0,
    onShoot: null,
    onKill: null,
    onLeak: null,
  };
}

/** Begin the next wave, queuing its enemies with a little spawn jitter. */
export function startWave(state) {
  if (state.screen !== 'play' || state.waveActive || state.wave >= MAX_WAVE) return false;
  state.wave += 1;
  state.waveTime = 0;
  state.waveActive = true;
  state.spawnQueue = [];
  const def = WAVES[state.wave - 1];
  for (const group of def.groups) {
    for (let i = 0; i < group.count; i += 1) {
      state.spawnQueue.push({ type: group.type, at: group.delay + i * group.interval + range(state.rand, 0, 0.25) });
    }
  }
  state.spawnQueue.sort((a, b) => a.at - b.at);
  state.banner = `Wave ${state.wave}`;
  state.bannerUntil = state.time + 1.6;
  return true;
}

/** One fixed simulation step. Pure game logic: no DOM, no audio calls. */
export function stepGame(state, dt) {
  if (state.screen !== 'play' || state.paused) return;
  state.time += dt;
  if (state.waveActive) {
    state.waveTime += dt;
    while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.waveTime) {
      const next = state.spawnQueue.shift();
      state.enemies.push(createEnemy(next.type, state.wave, state.rand));
    }
  }
  // Towers fire first, then enemies walk, then shots land.
  updateTowers(state, dt);
  const leaks = updateEnemies(state, dt);
  for (const enemy of leaks) {
    state.lives -= 1;
    burst(state, 905, 300, '#ff6b6b', 14, 130);
    if (state.onLeak) state.onLeak();
    if (state.lives <= 0) break;
  }
  updateProjectiles(state, dt);
  for (const tower of state.towers) {
    if (tower.flash > 0) tower.flash -= dt;
  }
  if (state.lives <= 0) {
    state.lives = 0;
    state.screen = 'over';
    state.waveActive = false;
    state.banner = '';
    return;
  }
  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    const bonus = waveClearBonus(state.wave);
    state.gold += bonus;
    state.score += 100 * state.wave;
    state.banner = `Wave ${state.wave} cleared  +${bonus}g`;
    state.bannerUntil = state.time + 1.6;
    if (state.wave >= MAX_WAVE) {
      state.screen = 'win';
      state.score += state.lives * 50;
      state.banner = '';
    }
  }
}

/** Read the saved best score, tolerating browsers that block storage. */
export function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage unavailable: the best score simply is not kept.
  }
}

// --- Browser wiring. ---

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const sfx = new Sfx();
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') ?? 7) || 7;
  const state = createGame(seed);
  state.best = loadBest();

  state.onShoot = (kind) => sfx.shoot(kind);
  state.onKill = () => {
    sfx.pop();
    if (state.kills % 5 === 0) sfx.coin();
  };
  state.onLeak = () => sfx.leak();

  const actions = {
    unlockAudio: () => sfx.unlock(),
    begin: () => {
      sfx.unlock();
      state.screen = 'play';
      state.banner = 'Defend the lantern!';
      state.bannerUntil = state.time + 1.6;
    },
    restart: () => {
      const best = Math.max(state.best, state.score);
      if (best > state.best) saveBest(best);
      const fresh = createGame((Date.now() % 100000) + 1);
      fresh.best = best;
      // Keep the audio callbacks: a fresh state carries nulls for them.
      fresh.onShoot = state.onShoot;
      fresh.onKill = state.onKill;
      fresh.onLeak = state.onLeak;
      Object.assign(state, fresh);
      state.screen = 'play';
    },
    startWave: () => {
      if (state.screen !== 'play' || state.paused) return;
      if (startWave(state)) sfx.horn();
    },
    togglePause: () => {
      if (state.screen !== 'play') return;
      state.paused = !state.paused;
    },
    toggleSpeed: () => {
      state.speed = state.speed === 1 ? 2 : 1;
    },
    toggleMute: () => {
      state.muted = !state.muted;
      sfx.muted = state.muted;
    },
    chooseBuild: (type) => {
      if (state.screen !== 'play') return;
      state.placeType = state.placeType === type ? null : type;
      state.selectedTower = null;
    },
    clickPlot: (plot) => {
      if (state.screen !== 'play') return;
      if (state.placeType) {
        if (placeTower(state, plot, state.placeType)) {
          sfx.build();
          state.placeType = null;
        }
      } else {
        state.placeType = 'ember';
      }
    },
    selectTower: (tower) => {
      state.selectedTower = tower;
      state.placeType = null;
    },
    upgradeSelected: () => {
      const tower = state.selectedTower;
      if (tower && upgradeTower(state, tower)) sfx.upgrade();
    },
    sellSelected: () => {
      const tower = state.selectedTower;
      if (!tower) return;
      sellTower(state, tower);
      state.selectedTower = null;
      sfx.coin();
    },
  };

  attachInput(canvas, () => state, actions);

  if (shot) {
    // Screenshot mode: stage a deterministic scene, draw it once, and tell
    // the screenshot tool the frame is ready.
    const result = stageShot(shot, state, seed);
    state.best = result.best;
    render(ctx, state);
    window.__shotReady = true;
    window.__game = state;
    return;
  }

  window.__game = state;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += elapsed * state.speed;
    let guard = 0;
    while (acc >= STEP && guard < 8) {
      stepGame(state, STEP);
      acc -= STEP;
      guard += 1;
    }
    if (guard >= 8) acc = 0;
    render(ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') boot();

export { CANVAS_HEIGHT, CANVAS_WIDTH };
