// A tiny seeded random generator (mulberry32) so the screenshot scenes and the
// autopilot play the same way every time for a given seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roll a number in [min, max) from a generator function. */
export function range(rand, min, max) {
  return min + rand() * (max - min);
}
