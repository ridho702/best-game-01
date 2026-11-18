// The screenshot scenes behind ?shot=start|play|win|lose. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot that buys and upgrades towers between waves, so every
// frame is what a real game looks like — and the same seed always gives the
// same frame.

import { MAX_WAVE, PLOTS, TOWER_TYPES } from './config.js';
import { pathLength, pointAt } from './enemies.js';
import { placeTower, upgradeCost, upgradeTower } from './towers.js';
import { createGame, startWave, stepGame } from './main.js';

const STEP = 1 / 60;

// How good a plot is: how much of the path sits inside a tower's reach.
const PLOT_QUALITY = PLOTS.map((plot) => {
  let covered = 0;
  const len = pathLength();
  for (let d = 0; d < len; d += 12) {
    const p = pointAt(d);
    if (Math.hypot(p.x - plot.x, p.y - plot.y) <= 130) covered += 1;
  }
  return covered;
});

/** The best empty plot, best coverage first. */
function bestEmptyPlot(state) {
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < PLOTS.length; i += 1) {
    if (state.towers.some((t) => t.plot === i)) continue;
    if (PLOT_QUALITY[i] > bestScore) {
      bestScore = PLOT_QUALITY[i];
      best = i;
    }
  }
  return best;
}

/** Which tower the autopilot buys at this point in the game. */
function pickTowerType(state) {
  if (state.wave < 2) return 'ember';
  if (state.wave < 4) return state.towers.filter((t) => t.type === 'mortar').length < 2 ? 'mortar' : 'ember';
  if (state.wave < 7) return state.towers.filter((t) => t.type === 'frost').length < 2 ? 'frost' : 'prism';
  return state.towers.filter((t) => t.type === 'prism').length < 3 ? 'prism' : 'mortar';
}

/**
 * Spend gold between waves: upgrade the cheapest tower first when the game
 * is past wave 2, then fill the best empty plot with the right tower.
 */
function autopilotBuild(state) {
  for (let guard = 0; guard < 40; guard += 1) {
    let acted = false;
    if (state.wave >= 3) {
      let cheapest = null;
      let cheapestCost = Infinity;
      for (const tower of state.towers) {
        const cost = upgradeCost(tower.type, tower.level);
        if (cost !== null && cost < cheapestCost) {
          cheapest = tower;
          cheapestCost = cost;
        }
      }
      if (cheapest && state.gold >= cheapestCost + 40) {
        upgradeTower(state, cheapest);
        acted = true;
      }
    }
    if (!acted) {
      const plot = bestEmptyPlot(state);
      if (plot < 0) return;
      const type = pickTowerType(state);
      if (state.gold < TOWER_TYPES[type].levels[0].cost) return;
      if (placeTower(state, plot, type)) acted = true;
    }
    if (!acted) return;
  }
}

/** Step the world `seconds` forward, starting a new wave whenever idle. */
function runWaves(state, seconds, build) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.screen !== 'play') break;
    if (!state.waveActive && state.wave < MAX_WAVE) {
      if (build) autopilotBuild(state);
      startWave(state);
    }
    stepGame(state, STEP);
  }
}

/** Step until `until(state)` is true (or `seconds` pass), starting waves as needed. */
function runUntil(state, seconds, build, until) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.screen !== 'play') break;
    if (until(state)) break;
    if (!state.waveActive && state.wave < MAX_WAVE) {
      if (build) autopilotBuild(state);
      startWave(state);
    }
    stepGame(state, STEP);
  }
}

/**
 * Set `state` to the named scene (start, play, win or lose) and return the
 * best score to show. The state is reset first; the caller renders it.
 */
export function stageShot(name, state, seed) {
  const fresh = createGame(seed);
  fresh.best = 0;
  Object.assign(state, fresh);
  state.screen = 'play';
  state.onShoot = null;
  state.onKill = null;
  state.onLeak = null;

  if (name === 'start') {
    autopilotBuild(state);
    autopilotBuild(state);
    runWaves(state, 4, false);
    state.screen = 'title';
    state.banner = '';
    return { screen: 'title', best: 0 };
  }
  if (name === 'play') {
    // Stop eight seconds into wave 4, while the field is still busy.
    runUntil(state, 150, true, (s) => s.wave >= 4 && s.waveTime >= 8);
    return { screen: state.screen, best: state.score };
  }
  if (name === 'win') {
    runWaves(state, 60 * 60, true);
    return { screen: state.screen, best: state.score };
  }
  // lose: one lonely ember spire, no upgrades, no more building.
  placeTower(state, bestEmptyPlot(state), 'ember');
  runWaves(state, 60 * 60, false);
  return { screen: state.screen, best: state.score };
}
