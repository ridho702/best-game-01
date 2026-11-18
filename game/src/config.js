// Glowfall: The Last Lantern — every number that tunes the game lives here.
// The map is a fixed 960x600 night field. Shadows walk a winding path from the
// west edge to the lantern in the east; the player builds light-towers on stone
// plots beside the path and must survive all twelve waves.

export const VIEW = { width: 960, height: 600 };

export const START_GOLD = 180;
export const START_LIVES = 20;
export const MAX_WAVE = 12;

// The path shadows walk: waypoints from off the west edge to the lantern.
export const PATH_POINTS = [
  { x: -40, y: 110 },
  { x: 190, y: 110 },
  { x: 190, y: 290 },
  { x: 410, y: 290 },
  { x: 410, y: 490 },
  { x: 630, y: 490 },
  { x: 630, y: 170 },
  { x: 850, y: 170 },
  { x: 850, y: 300 },
  { x: 905, y: 300 },
];

// Stone plots where a tower may be built. Each sits clear of the path corridor.
export const PLOTS = [
  { x: 95, y: 210 }, { x: 300, y: 200 }, { x: 300, y: 390 }, { x: 100, y: 400 },
  { x: 520, y: 200 }, { x: 520, y: 390 }, { x: 520, y: 555 }, { x: 730, y: 270 },
  { x: 730, y: 390 }, { x: 730, y: 555 }, { x: 740, y: 80 }, { x: 95, y: 30 },
  { x: 300, y: 545 }, { x: 920, y: 90 }, { x: 920, y: 420 },
];

// Tower kinds. levels[0] is the base tower; levels[1] and [2] are its upgrades.
export const TOWER_TYPES = {
  ember: {
    name: 'Ember Spire',
    key: '1',
    color: '#ffb347',
    glow: '#ff7b1c',
    desc: 'Fast sparks. Cheap and quick, the workhorse of the line.',
    levels: [
      { cost: 50, range: 115, damage: 12, rate: 2.2, splash: 0, slow: 0 },
      { cost: 45, range: 125, damage: 20, rate: 2.6, splash: 0, slow: 0 },
      { cost: 75, range: 135, damage: 33, rate: 3.2, splash: 0, slow: 0 },
    ],
  },
  frost: {
    name: 'Frost Brazier',
    key: '2',
    color: '#8fd8ff',
    glow: '#3fa9f5',
    desc: 'Chills shadows, slowing them to a crawl.',
    levels: [
      { cost: 70, range: 105, damage: 6, rate: 1.2, splash: 0, slow: 0.45, slowTime: 1.6 },
      { cost: 60, range: 115, damage: 10, rate: 1.3, splash: 0, slow: 0.55, slowTime: 1.8 },
      { cost: 95, range: 125, damage: 17, rate: 1.5, splash: 0, slow: 0.65, slowTime: 2.0 },
    ],
  },
  mortar: {
    name: 'Mortar Lantern',
    key: '3',
    color: '#ff8a7a',
    glow: '#e5484d',
    desc: 'Lobs burning oil. Slow, but splashes whole packs.',
    levels: [
      { cost: 110, range: 150, damage: 30, rate: 0.7, splash: 55, slow: 0 },
      { cost: 95, range: 160, damage: 48, rate: 0.75, splash: 65, slow: 0 },
      { cost: 145, range: 170, damage: 76, rate: 0.85, splash: 80, slow: 0 },
    ],
  },
  prism: {
    name: 'Prism Lens',
    key: '4',
    color: '#d9a7ff',
    glow: '#9b5de5',
    desc: 'A focused beam. Long reach, heavy single-target damage.',
    levels: [
      { cost: 160, range: 205, damage: 46, rate: 0.9, splash: 0, slow: 0 },
      { cost: 135, range: 215, damage: 72, rate: 1.0, splash: 0, slow: 0 },
      { cost: 205, range: 230, damage: 112, rate: 1.1, splash: 0, slow: 0 },
    ],
  },
};

export const TOWER_ORDER = ['ember', 'frost', 'mortar', 'prism'];

// Enemy kinds. hp and speed scale a little with the wave that spawns them.
export const ENEMY_TYPES = {
  wisp: { name: 'Wisp', hp: 30, speed: 56, reward: 4, radius: 10, color: '#9fe8ff', score: 10 },
  shade: { name: 'Shade', hp: 72, speed: 38, reward: 7, radius: 13, color: '#b388ff', score: 15 },
  swarmlet: { name: 'Swarmlet', hp: 15, speed: 76, reward: 2, radius: 7, color: '#ffb347', score: 5 },
  brute: { name: 'Brute', hp: 230, speed: 24, reward: 15, radius: 17, color: '#ff6b6b', score: 30 },
  wraith: { name: 'Wraith', hp: 125, speed: 60, reward: 12, radius: 12, color: '#e8f4ff', regen: 4, score: 25 },
};

// Twelve waves. Each group spawns `count` enemies of one kind, `interval` seconds
// apart, starting `delay` seconds into the wave.
export const WAVES = [
  { groups: [{ type: 'wisp', count: 8, interval: 0.9, delay: 0.5 }] },
  { groups: [{ type: 'wisp', count: 12, interval: 0.7, delay: 0.5 }, { type: 'shade', count: 4, interval: 1.4, delay: 4 }] },
  { groups: [{ type: 'wisp', count: 10, interval: 0.6, delay: 0.5 }, { type: 'shade', count: 8, interval: 1.1, delay: 3 }] },
  { groups: [{ type: 'shade', count: 14, interval: 0.9, delay: 0.5 }, { type: 'swarmlet', count: 6, interval: 0.35, delay: 6 }] },
  { groups: [{ type: 'wisp', count: 8, interval: 0.5, delay: 0.5 }, { type: 'shade', count: 10, interval: 0.8, delay: 2 }, { type: 'brute', count: 2, interval: 3.0, delay: 8 }] },
  { groups: [{ type: 'swarmlet', count: 20, interval: 0.3, delay: 0.5 }, { type: 'shade', count: 10, interval: 0.9, delay: 4 }] },
  { groups: [{ type: 'shade', count: 12, interval: 0.7, delay: 0.5 }, { type: 'brute', count: 6, interval: 2.2, delay: 5 }, { type: 'wisp', count: 6, interval: 0.5, delay: 9 }] },
  { groups: [{ type: 'wraith', count: 10, interval: 1.0, delay: 0.5 }, { type: 'shade', count: 12, interval: 0.8, delay: 3 }] },
  { groups: [{ type: 'swarmlet', count: 24, interval: 0.28, delay: 0.5 }, { type: 'brute', count: 8, interval: 2.0, delay: 6 }] },
  { groups: [{ type: 'wraith', count: 14, interval: 0.9, delay: 0.5 }, { type: 'shade', count: 10, interval: 0.7, delay: 3 }, { type: 'brute', count: 4, interval: 2.4, delay: 8 }] },
  { groups: [{ type: 'shade', count: 20, interval: 0.6, delay: 0.5 }, { type: 'wraith', count: 10, interval: 0.9, delay: 4 }, { type: 'brute', count: 6, interval: 2.0, delay: 9 }] },
  { groups: [{ type: 'swarmlet', count: 30, interval: 0.25, delay: 0.5 }, { type: 'shade', count: 16, interval: 0.6, delay: 3 }, { type: 'wraith', count: 10, interval: 0.8, delay: 7 }, { type: 'brute', count: 8, interval: 1.8, delay: 10 }] },
];

// Gold handed out when a wave is cleared, on top of kill rewards.
export function waveClearBonus(wave) {
  return 12 + wave * 3;
}

// Enemy health and speed grow with the wave, so late waves stay dangerous.
export function scaledEnemyStats(type, wave) {
  const base = ENEMY_TYPES[type];
  const growth = 1 + 0.28 * (wave - 1);
  return {
    hp: Math.round(base.hp * growth),
    speed: base.speed * (1 + 0.012 * (wave - 1)),
    reward: base.reward,
    radius: base.radius,
    color: base.color,
    regen: base.regen ?? 0,
    score: base.score,
    name: base.name,
  };
}
