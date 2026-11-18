// Input: mouse and keyboard, translated into game actions. The canvas is
// scaled by CSS, so pointer positions are mapped back to canvas coordinates
// with the bounding rect before anything is hit-tested.

import { plotAt, towerAt } from './towers.js';
import { selectedPanelRects, topBarButtons, towerCards, waveButtonRect } from './render.js';

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/**
 * Wire the canvas and the keyboard to the game's `actions` (startWave, togglePause,
 * toggleSpeed, toggleMute, place, select, upgrade, sell, begin, restart). The
 * `getState` callback returns the live state each time, so input never holds a
 * stale copy.
 */
export function attachInput(canvas, getState, actions) {
  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function fieldPoint(canvasPoint) {
    return { x: canvasPoint.x, y: canvasPoint.y - 40 };
  }

  canvas.addEventListener('pointermove', (event) => {
    const state = getState();
    const p = fieldPoint(toCanvas(event));
    state.hoverPlot = plotAt(p.x, p.y);
  });

  canvas.addEventListener('pointerdown', (event) => {
    const state = getState();
    actions.unlockAudio();
    const p = toCanvas(event);
    if (state.screen === 'title') {
      actions.begin();
      return;
    }
    if (state.screen === 'over' || state.screen === 'win') {
      actions.restart();
      return;
    }
    for (const b of topBarButtons(state)) {
      if (inRect(p.x, p.y, b)) {
        if (b.id === 'speed') actions.toggleSpeed();
        if (b.id === 'pause') actions.togglePause();
        if (b.id === 'mute') actions.toggleMute();
        return;
      }
    }
    for (const b of selectedPanelRects(state)) {
      if (inRect(p.x, p.y, b)) {
        if (b.id === 'upgrade') actions.upgradeSelected();
        if (b.id === 'sell') actions.sellSelected();
        return;
      }
    }
    for (const card of towerCards()) {
      if (inRect(p.x, p.y, card)) {
        actions.chooseBuild(card.type);
        return;
      }
    }
    if (inRect(p.x, p.y, waveButtonRect())) {
      actions.startWave();
      return;
    }
    const f = fieldPoint(p);
    const tower = towerAt(state, f.x, f.y);
    if (tower) {
      actions.selectTower(tower);
      return;
    }
    const plot = plotAt(f.x, f.y);
    if (plot >= 0) {
      actions.clickPlot(plot);
      return;
    }
    actions.selectTower(null);
  });

  window.addEventListener('keydown', (event) => {
    const state = getState();
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (state.screen === 'title' && (key === ' ' || key === 'enter')) {
      event.preventDefault();
      actions.begin();
      return;
    }
    if ((state.screen === 'over' || state.screen === 'win') && (key === ' ' || key === 'enter')) {
      event.preventDefault();
      actions.restart();
      return;
    }
    if (key === ' ') {
      event.preventDefault();
      actions.startWave();
      return;
    }
    if (key === 'p' || key === 'escape') {
      actions.togglePause();
      return;
    }
    if (key === 'f') {
      actions.toggleSpeed();
      return;
    }
    if (key === 'm') {
      actions.toggleMute();
      return;
    }
    const hotkeys = { 1: 'ember', 2: 'frost', 3: 'mortar', 4: 'prism' };
    if (hotkeys[key]) actions.chooseBuild(hotkeys[key]);
  });
}
