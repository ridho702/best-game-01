// Everything the player sees: the night field, the path, the lantern, towers,
// enemies, particles, the HUD, the build bar and the screens. The play field
// is 960x600 and sits between a 40px top bar and a 40px bottom bar, so the
// canvas is 960x680. All coordinates in the game state are field coordinates;
// rendering adds FIELD_Y.

import { MAX_WAVE, PATH_POINTS, PLOTS, TOWER_ORDER, TOWER_TYPES, VIEW } from './config.js';
import { sellValue, towerStats, upgradeCost } from './towers.js';

export const FIELD_Y = 40;
export const CANVAS_WIDTH = VIEW.width;
export const CANVAS_HEIGHT = VIEW.height + 80;

const LANTERN = { x: 905, y: 300 };

// --- Layout: the clickable rects, shared with input handling. ---

export function topBarButtons(state) {
  const y = 6;
  const h = 28;
  return [
    { id: 'speed', x: 762, y, w: 52, h, label: state.speed === 2 ? '2x' : '1x' },
    { id: 'pause', x: 820, y, w: 52, h, label: state.paused ? 'Resume' : 'Pause' },
    { id: 'mute', x: 878, y, w: 52, h, label: state.muted ? 'Muted' : 'Sound' },
  ];
}

export function towerCards() {
  return TOWER_ORDER.map((type, i) => ({
    id: `build:${type}`,
    type,
    x: 12 + i * 158,
    y: CANVAS_HEIGHT - 38,
    w: 150,
    h: 34,
  }));
}

export function waveButtonRect() {
  return { id: 'wave', x: 652, y: CANVAS_HEIGHT - 38, w: 296, h: 34 };
}

export function selectedPanelRects(state) {
  if (!state.selectedTower) return [];
  const x = CANVAS_WIDTH - 320;
  const y = FIELD_Y + 8;
  return [
    { id: 'upgrade', x: x + 12, y: y + 74, w: 140, h: 30 },
    { id: 'sell', x: x + 164, y: y + 74, w: 140, h: 30 },
  ];
}

// --- Drawing helpers. ---

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function pathTrace(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
}

// --- The field. ---

function drawBackground(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, '#0b0e24');
  g.addColorStop(0.6, '#10142e');
  g.addColorStop(1, '#0a0d20');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const s of state.stars) {
    ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(state.time * 0.7 + s.phase));
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
  // Soft moonlight pools.
  glowCircle(ctx, 200, 90, 180, 'rgba(120,140,255,0.10)', 1);
  glowCircle(ctx, 700, 500, 200, 'rgba(120,140,255,0.08)', 1);
}

function drawPath(ctx) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  pathTrace(ctx, PATH_POINTS);
  ctx.strokeStyle = '#2c2745';
  ctx.lineWidth = 46;
  ctx.stroke();
  pathTrace(ctx, PATH_POINTS);
  ctx.strokeStyle = '#453e63';
  ctx.lineWidth = 38;
  ctx.stroke();
  ctx.setLineDash([10, 16]);
  pathTrace(ctx, PATH_POINTS);
  ctx.strokeStyle = 'rgba(255,214,106,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawLantern(ctx, state) {
  const pulse = 1 + 0.06 * Math.sin(state.time * 2);
  glowCircle(ctx, LANTERN.x, LANTERN.y, 130 * pulse, 'rgba(255,183,77,0.30)', 1);
  glowCircle(ctx, LANTERN.x, LANTERN.y, 60 * pulse, 'rgba(255,214,106,0.55)', 1);
  ctx.fillStyle = '#2a2118';
  ctx.fillRect(LANTERN.x - 3, LANTERN.y - 34, 6, 68);
  ctx.fillStyle = '#ffd76a';
  roundRect(ctx, LANTERN.x - 16, LANTERN.y - 22, 32, 40, 6);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(LANTERN.x, LANTERN.y - 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2118';
  ctx.fillRect(LANTERN.x - 20, LANTERN.y - 28, 40, 6);
  ctx.fillRect(LANTERN.x - 20, LANTERN.y + 18, 40, 6);
}

function drawPlots(ctx, state) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    const p = PLOTS[i];
    const occupied = state.towers.some((t) => t.plot === i);
    if (occupied) continue;
    const hover = state.hoverPlot === i;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hover ? 28 : 24, 0, Math.PI * 2);
    ctx.fillStyle = hover ? 'rgba(255,214,106,0.28)' : 'rgba(120,110,160,0.20)';
    ctx.fill();
    ctx.strokeStyle = hover ? '#ffd76a' : 'rgba(160,150,200,0.45)';
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
  }
}

// --- Towers and enemies. ---

function drawTowerGlyph(ctx, type, x, y, level, angle, flash) {
  const def = TOWER_TYPES[type];
  ctx.save();
  ctx.translate(x, y);
  // Stone base.
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#3d3657';
  ctx.fill();
  ctx.strokeStyle = '#6b6390';
  ctx.lineWidth = 2;
  ctx.stroke();
  glowCircle(ctx, 0, 0, 26, def.glow, flash > 0 ? 0.55 : 0.25);
  ctx.rotate(angle);
  if (type === 'ember') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -8);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3c4';
    ctx.fill();
  } else if (type === 'frost') {
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -11, Math.sin(a) * -11);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#eaf7ff';
    ctx.fill();
  } else if (type === 'mortar') {
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1420';
    ctx.fill();
  } else {
    ctx.rotate(-angle);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = def.color;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-3, -3, 6, 6);
  }
  ctx.restore();
  // Level pips.
  ctx.fillStyle = '#ffd76a';
  for (let i = 0; i <= level; i += 1) {
    ctx.beginPath();
    ctx.arc(x - 10 + i * 10, y + 26, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemy(ctx, enemy) {
  const hpFrac = Math.max(0, enemy.hp / enemy.maxHp);
  glowCircle(ctx, enemy.x, enemy.y, enemy.radius + 10, enemy.color, 0.35);
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fillStyle = enemy.color;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Eyes give each shadow a face.
  ctx.fillStyle = '#14101f';
  const ex = enemy.radius * 0.35;
  const ey = -enemy.radius * 0.15;
  ctx.beginPath();
  ctx.arc(enemy.x - ex, enemy.y + ey, 2.2, 0, Math.PI * 2);
  ctx.arc(enemy.x + ex, enemy.y + ey, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Health bar.
  if (hpFrac < 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(enemy.x - 14, enemy.y - enemy.radius - 9, 28, 4);
    ctx.fillStyle = hpFrac > 0.5 ? '#7ee787' : hpFrac > 0.25 ? '#ffd76a' : '#ff6b6b';
    ctx.fillRect(enemy.x - 14, enemy.y - enemy.radius - 9, 28 * hpFrac, 4);
  }
}

// --- HUD, bars and panels. ---

function drawTopBar(ctx, state) {
  ctx.fillStyle = '#12152e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, FIELD_Y);
  ctx.fillStyle = '#2c3157';
  ctx.fillRect(0, FIELD_Y - 1, CANVAS_WIDTH, 1);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('GLOWFALL', 12, FIELD_Y / 2 + 1);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#e8e6f5';
  ctx.fillText(`Gold ${state.gold}`, 130, FIELD_Y / 2);
  ctx.fillText(`Lives ${state.lives}`, 230, FIELD_Y / 2);
  ctx.fillText(`Wave ${state.wave}/${MAX_WAVE}`, 330, FIELD_Y / 2);
  ctx.fillText(`Score ${state.score}`, 440, FIELD_Y / 2);
  if (state.waveActive) ctx.fillText(`Shadows ${state.enemies.length + state.spawnQueue.length}`, 540, FIELD_Y / 2);
  for (const b of topBarButtons(state)) {
    ctx.fillStyle = '#232847';
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#4a5180';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e8e6f5';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
  ctx.textAlign = 'left';
}

function drawBottomBar(ctx, state) {
  const y = CANVAS_HEIGHT - 40;
  ctx.fillStyle = '#12152e';
  ctx.fillRect(0, y, CANVAS_WIDTH, 40);
  ctx.fillStyle = '#2c3157';
  ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  for (const card of towerCards()) {
    const def = TOWER_TYPES[card.type];
    const afford = state.gold >= def.levels[0].cost;
    const active = state.placeType === card.type;
    ctx.fillStyle = active ? '#3a2f14' : '#232847';
    roundRect(ctx, card.x, card.y, card.w, card.h, 6);
    ctx.fill();
    ctx.strokeStyle = active ? '#ffd76a' : '#4a5180';
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = afford ? def.color : '#777';
    ctx.beginPath();
    ctx.arc(card.x + 16, card.y + card.h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e6f5';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name, card.x + 28, card.y + 11);
    ctx.fillStyle = afford ? '#ffd76a' : '#888';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${def.levels[0].cost}g  [${def.key}]`, card.x + 28, card.y + 25);
  }
  const wave = waveButtonRect();
  const running = state.waveActive;
  const done = state.wave >= MAX_WAVE && !running;
  ctx.fillStyle = done ? '#2c3157' : running ? '#3d3657' : '#7a5a12';
  roundRect(ctx, wave.x, wave.y, wave.w, wave.h, 6);
  ctx.fill();
  ctx.strokeStyle = done ? '#4a5180' : '#ffd76a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = done ? '#888' : '#ffe9a8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    done ? 'All waves cleared' : running ? 'Wave in progress…' : state.wave === 0 ? 'Start Wave 1  [Space]' : `Start Wave ${state.wave + 1}  [Space]`,
    wave.x + wave.w / 2,
    wave.y + wave.h / 2 + 1,
  );
  ctx.textAlign = 'left';
}

function drawSelectedPanel(ctx, state) {
  const tower = state.selectedTower;
  if (!tower) return;
  const def = TOWER_TYPES[tower.type];
  const stats = towerStats(tower.type, tower.level);
  const x = CANVAS_WIDTH - 320;
  const y = FIELD_Y + 8;
  const w = 308;
  const h = 112;
  ctx.fillStyle = 'rgba(18,21,46,0.94)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#4a5180';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = def.color;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${def.name}  ·  Level ${tower.level + 1}`, x + 12, y + 18);
  ctx.fillStyle = '#e8e6f5';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Damage ${stats.damage}   Range ${stats.range}   Rate ${stats.rate}/s`, x + 12, y + 40);
  ctx.fillText(`Kills ${tower.kills}`, x + 12, y + 58);
  const cost = upgradeCost(tower.type, tower.level);
  for (const b of selectedPanelRects(state)) {
    const isUpgrade = b.id === 'upgrade';
    const afford = isUpgrade ? cost !== null && state.gold >= cost : true;
    ctx.fillStyle = isUpgrade ? (afford ? '#7a5a12' : '#2c3157') : '#40202a';
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#4a5180';
    ctx.stroke();
    ctx.fillStyle = afford ? '#ffe9a8' : '#888';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isUpgrade ? (cost === null ? 'Max level' : `Upgrade ${cost}g`) : `Sell +${sellValue(tower)}g`,
      b.x + b.w / 2,
      b.y + b.h / 2 + 1,
    );
  }
  ctx.textAlign = 'left';
}

function drawRangePreview(ctx, state) {
  if (state.placeType) {
    const def = TOWER_TYPES[state.placeType];
    const stats = def.levels[0];
    const plot = state.hoverPlot >= 0 ? PLOTS[state.hoverPlot] : null;
    if (plot) {
      ctx.beginPath();
      ctx.arc(plot.x, plot.y, stats.range, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,214,106,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,106,0.5)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (state.selectedTower) {
    const t = state.selectedTower;
    const stats = towerStats(t.type, t.level);
    ctx.beginPath();
    ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,214,106,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,106,0.45)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(t.x, t.y, 28, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawWaveBanner(ctx, state) {
  if (!state.banner || state.bannerUntil < state.time) return;
  const alpha = Math.min(1, (state.bannerUntil - state.time) / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.shadowColor = '#ff7b1c';
  ctx.shadowBlur = 24;
  ctx.fillText(state.banner, VIEW.width / 2, VIEW.height / 2 - 40);
  ctx.restore();
}

function drawOverlay(ctx, state) {
  const cx = VIEW.width / 2;
  if (state.screen === 'title') {
    ctx.fillStyle = 'rgba(8,10,26,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    glowCircle(ctx, cx, 170, 150, 'rgba(255,183,77,0.25)', 1);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.shadowColor = '#ff7b1c';
    ctx.shadowBlur = 30;
    ctx.fillText('GLOWFALL', cx, 150);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8e6f5';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('The Last Lantern', cx, 200);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#c9c6e0';
    ctx.fillText('Shadows march on the village lantern. Build towers of light on the stone plots,', cx, 260);
    ctx.fillText('spend gold from fallen shadows, and survive all twelve waves.', cx, 284);
    ctx.fillText('Click a plot, pick a tower — keys 1-4 build, Space starts a wave, F speeds up.', cx, 308);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('Click anywhere to begin', cx, 380);
    if (state.best > 0) {
      ctx.fillStyle = '#8fd8ff';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Best score: ${state.best}`, cx, 420);
    }
    ctx.textAlign = 'left';
    return;
  }
  if (state.screen === 'over' || state.screen === 'win') {
    const won = state.screen === 'win';
    ctx.fillStyle = won ? 'rgba(20,26,10,0.72)' : 'rgba(26,8,12,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = won ? '#ffd76a' : '#ff8a7a';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText(won ? 'The dawn returns!' : 'The lantern has fallen', cx, 200);
    ctx.fillStyle = '#e8e6f5';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`Score ${state.score}   ·   Waves cleared ${state.wave}   ·   Shadows felled ${state.kills}`, cx, 270);
    if (state.best > 0) ctx.fillText(`Best score: ${state.best}`, cx, 300);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('Click to play again', cx, 370);
    ctx.textAlign = 'left';
    return;
  }
  if (state.paused) {
    ctx.fillStyle = 'rgba(8,10,26,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8e6f5';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText('Paused', cx, VIEW.height / 2 - 20);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Press P or click Resume to continue', cx, VIEW.height / 2 + 20);
    ctx.textAlign = 'left';
  }
}

/** Draw the whole game for the current state. */
export function render(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#0b0e24';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.save();
  ctx.translate(0, FIELD_Y);
  drawBackground(ctx, state);
  drawPath(ctx);
  drawPlots(ctx, state);
  drawLantern(ctx, state);
  drawRangePreview(ctx, state);
  for (const tower of state.towers) {
    drawTowerGlyph(ctx, tower.type, tower.x, tower.y, tower.level, tower.angle, tower.flash ?? 0);
  }
  for (const proj of state.projectiles) {
    glowCircle(ctx, proj.x, proj.y, 10, proj.color, 0.8);
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  for (const enemy of state.enemies) drawEnemy(ctx, enemy);
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawWaveBanner(ctx, state);
  drawOverlay(ctx, state);
  ctx.restore();
  drawSelectedPanel(ctx, state);
  drawTopBar(ctx, state);
  drawBottomBar(ctx, state);
}
