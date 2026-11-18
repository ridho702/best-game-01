// Enemies: the shadows that walk the path. Each one tracks how far it has
// travelled along the path (dist), so its position is always derived from the
// waypoints and never drifts.

import { PATH_POINTS, scaledEnemyStats } from './config.js';
import { range } from './rng.js';

let nextId = 1;

// Precompute the path's segment lengths once, for dist -> position lookups.
const SEGMENTS = [];
let PATH_LENGTH = 0;
for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
  const a = PATH_POINTS[i];
  const b = PATH_POINTS[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  SEGMENTS.push({ a, b, len, start: PATH_LENGTH });
  PATH_LENGTH += len;
}

export function pathLength() {
  return PATH_LENGTH;
}

/** The (x, y) of a point `dist` along the path, plus the segment's direction. */
export function pointAt(dist) {
  const d = Math.max(0, Math.min(PATH_LENGTH - 0.001, dist));
  for (const seg of SEGMENTS) {
    if (d <= seg.start + seg.len) {
      const t = (d - seg.start) / seg.len;
      return {
        x: seg.a.x + (seg.b.x - seg.a.x) * t,
        y: seg.a.y + (seg.b.y - seg.a.y) * t,
        dx: (seg.b.x - seg.a.x) / seg.len,
        dy: (seg.b.y - seg.a.y) / seg.len,
      };
    }
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return { x: last.b.x, y: last.b.y, dx: 0, dy: 0 };
}

export function createEnemy(type, wave, rand) {
  const stats = scaledEnemyStats(type, wave);
  const pos = pointAt(0);
  return {
    id: nextId,
    type,
    name: stats.name,
    x: pos.x,
    y: pos.y,
    dist: range(rand, -24, 0),
    hp: stats.hp,
    maxHp: stats.hp,
    speed: stats.speed,
    reward: stats.reward,
    radius: stats.radius,
    color: stats.color,
    regen: stats.regen,
    score: stats.score,
    slowUntil: 0,
    slowFactor: 1,
    alive: true,
    wobble: rand() * Math.PI * 2,
  };
}

/**
 * Move every enemy along the path for `dt` seconds. Returns the enemies that
 * reached the lantern (leaks), so the caller can take lives for them.
 */
export function updateEnemies(state, dt) {
  const leaks = [];
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const slowed = state.time < enemy.slowUntil;
    const speed = enemy.speed * (slowed ? enemy.slowFactor : 1);
    enemy.dist += speed * dt;
    if (enemy.regen > 0 && enemy.hp < enemy.maxHp) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.regen * dt);
    }
    const pos = pointAt(enemy.dist);
    enemy.x = pos.x + Math.sin(state.time * 3 + enemy.wobble) * 2;
    enemy.y = pos.y + Math.cos(state.time * 2.4 + enemy.wobble) * 2;
    if (enemy.dist >= PATH_LENGTH) {
      enemy.alive = false;
      leaks.push(enemy);
    }
  }
  state.enemies = state.enemies.filter((e) => e.alive);
  return leaks;
}

/** How many enemies are still to come, on the field, or queued to spawn. */
export function enemiesRemaining(state) {
  return state.enemies.length + state.spawnQueue.length;
}
