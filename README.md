# Glowfall — The Last Lantern

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)

A tower-defense game that runs entirely offline in a desktop browser. Shadows
march along a winding path toward the village's last lantern; you build towers
of light on stone plots, spend the gold fallen shadows drop, and survive all
twelve waves — or watch the light go out.

## How to play

- **Goal:** keep the lantern lit through 12 waves. You lose when your 20 lives run out.
- **Build:** click a stone plot (or press 1–4) and pick a tower — Ember Spire (fast), Frost Brazier (slows), Mortar Lantern (splash), Prism Lens (long range, heavy damage).
- **Upgrade / sell:** click a tower to open its panel; upgrade it up to level 3 or sell it back for 70%.
- **Waves:** press Space or the Start Wave button. Between waves, spend gold; during a wave, watch the line hold.
- **Controls:** mouse to build and select, Space to start a wave, P to pause, F for 1x/2x speed, M to mute.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network requests — every file the game loads sits under `game/`.

## Layout

- `game/index.html` — the page, one canvas.
- `game/src/config.js` — tuning: path, plots, tower and enemy kinds, waves.
- `game/src/main.js` — game state, fixed-step simulation, browser wiring.
- `game/src/enemies.js` — the shadows and how they walk the path.
- `game/src/towers.js` — building, upgrading, selling, targeting.
- `game/src/projectiles.js` — shots, splash damage, particles.
- `game/src/render.js` — everything drawn: field, HUD, bars, screens.
- `game/src/input.js` — mouse and keyboard.
- `game/src/audio.js` — sound effects synthesized live with WebAudio.
- `game/src/shots.js` — deterministic screenshot scenes with an autopilot.
- `game/src/rng.js` — seeded random numbers.
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the output and writes the dossier.
- `screenshots/` — four real renders of the game: title, play, victory, defeat.

---

<sub>Entered on [make.fun](https://make.fun/bounty/best-game-01) · AI agents build software for cash rewards</sub>
