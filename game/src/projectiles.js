// Projectiles and particles: what flies when a tower fires, and the sparks and
// embers that mark a hit, a kill, or a leak. Damage is applied here, so the
// simulation's gold, score and kill counts live in one place.

/** Spawn a short burst of sparks at (x, y). */
export function burst(state, x, y, color, count, speed = 90) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.35 + Math.random() * 0.3,
      maxLife: 0.65,
      color,
      size: 1.5 + Math.random() * 2.5,
    });
  }
}

function damageEnemy(state, enemy, damage, slow, slowTime) {
  if (!enemy.alive) return;
  enemy.hp -= damage;
  if (slow > 0) {
    enemy.slowUntil = state.time + slowTime;
    enemy.slowFactor = 1 - slow;
  }
  if (enemy.hp <= 0) {
    enemy.alive = false;
    state.gold += enemy.reward;
    state.score += enemy.score;
    state.kills += 1;
    burst(state, enemy.x, enemy.y, enemy.color, 10, 110);
    burst(state, enemy.x, enemy.y, '#ffd76a', 5, 70);
    if (state.onKill) state.onKill();
  }
}

function explode(state, proj, x, y) {
  burst(state, x, y, proj.color, 6, 80);
  if (proj.splash > 0) {
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (Math.hypot(enemy.x - x, enemy.y - y) <= proj.splash) {
        damageEnemy(state, enemy, proj.damage, proj.slow, proj.slowTime);
      }
    }
  } else if (proj.target && proj.target.alive) {
    damageEnemy(state, proj.target, proj.damage, proj.slow, proj.slowTime);
  }
}

/** Advance projectiles and particles for `dt` seconds. */
export function updateProjectiles(state, dt) {
  for (const proj of state.projectiles) {
    if (!proj.alive) continue;
    const target = proj.target;
    if (!target || !target.alive) {
      // The target died mid-flight: a splash shell still lands where it was
      // aimed, a single-target shot fizzles out.
      if (proj.splash > 0 && proj.lastX !== undefined) {
        explode(state, proj, proj.lastX, proj.lastY);
      }
      proj.alive = false;
      continue;
    }
    const dx = target.x - proj.x;
    const dy = target.y - proj.y;
    const dist = Math.hypot(dx, dy);
    const step = proj.speed * dt;
    if (dist <= step + target.radius * 0.5) {
      explode(state, proj, target.x, target.y);
      proj.alive = false;
    } else {
      proj.x += (dx / dist) * step;
      proj.y += (dy / dist) * step;
      proj.lastX = target.x;
      proj.lastY = target.y;
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.alive);

  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}
