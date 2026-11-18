// Towers: the light the player builds. A tower sits on a stone plot, picks the
// enemy furthest along the path inside its range, and fires projectiles at it.
// Each tower has three levels; upgrading is cheaper than building a new one.

import { PLOTS, TOWER_TYPES } from './config.js';

let nextId = 1;

export function towerStats(type, level) {
  return TOWER_TYPES[type].levels[level];
}

export function towerCost(type) {
  return TOWER_TYPES[type].levels[0].cost;
}

export function upgradeCost(type, level) {
  const levels = TOWER_TYPES[type].levels;
  if (level + 1 >= levels.length) return null;
  return levels[level + 1].cost;
}

/** Sell value: 70% of everything sunk into the tower, rounded down. */
export function sellValue(tower) {
  let spent = 0;
  const levels = TOWER_TYPES[tower.type].levels;
  for (let i = 0; i <= tower.level; i += 1) spent += levels[i].cost;
  return Math.floor(spent * 0.7);
}

export function plotAt(x, y) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    const p = PLOTS[i];
    if (Math.hypot(p.x - x, p.y - y) <= 30) return i;
  }
  return -1;
}

export function towerAt(state, x, y) {
  for (const tower of state.towers) {
    if (Math.hypot(tower.x - x, tower.y - y) <= 30) return tower;
  }
  return null;
}

/** Build a tower of `type` on plot `plotIndex`. Returns false when not allowed. */
export function placeTower(state, plotIndex, type) {
  if (plotIndex < 0 || plotIndex >= PLOTS.length) return false;
  if (state.towers.some((t) => t.plot === plotIndex)) return false;
  const cost = towerCost(type);
  if (state.gold < cost) return false;
  const plot = PLOTS[plotIndex];
  state.gold -= cost;
  state.towers.push({
    id: nextId,
    type,
    level: 0,
    plot: plotIndex,
    x: plot.x,
    y: plot.y,
    cooldown: 0,
    angle: -Math.PI / 2,
    kills: 0,
  });
  return true;
}

/** Upgrade a tower one level. Returns false when maxed or unaffordable. */
export function upgradeTower(state, tower) {
  const cost = upgradeCost(tower.type, tower.level);
  if (cost === null || state.gold < cost) return false;
  state.gold -= cost;
  tower.level += 1;
  return true;
}

/** Sell a tower back for 70% of its sunk cost. */
export function sellTower(state, tower) {
  state.gold += sellValue(tower);
  state.towers = state.towers.filter((t) => t.id !== tower.id);
}

/**
 * Let every tower fire at the enemy furthest along the path within range.
 * Firing appends projectiles to state.projectiles; the muzzle flash and the
 * sound are the caller's job, so a headless simulation stays silent.
 */
export function updateTowers(state, dt) {
  for (const tower of state.towers) {
    const stats = towerStats(tower.type, tower.level);
    tower.cooldown -= dt;
    let target = null;
    let bestDist = -1;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const d = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
      if (d <= stats.range && enemy.dist > bestDist) {
        bestDist = enemy.dist;
        target = enemy;
      }
    }
    if (!target) continue;
    tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    if (tower.cooldown > 0) continue;
    tower.cooldown = 1 / stats.rate;
    tower.flash = 0.08;
    state.projectiles.push({
      x: tower.x,
      y: tower.y,
      target,
      speed: tower.type === 'mortar' ? 320 : 520,
      damage: stats.damage,
      splash: stats.splash,
      slow: stats.slow ?? 0,
      slowTime: stats.slowTime ?? 0,
      kind: tower.type,
      color: TOWER_TYPES[tower.type].color,
      alive: true,
    });
    state.fired = (state.fired ?? 0) + 1;
    if (state.onShoot) state.onShoot(tower.type);
  }
}
