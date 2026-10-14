import { state, onSaveStatus } from './state.js';
import { byId } from './ui-dom.js';
import { renderLibrary } from './ui-library.js';
import { renderCalculator } from './ui-calculator.js';
import { renderTB } from './ui-tb.js';
import { renderLevain } from './ui-levain.js';
import { renderHydra } from './ui-hydra.js';
import { renderCroix } from './ui-cross.js';
import { setupDialogs } from './ui-dialogs.js';
import { showScreen } from './ui-auth.js';
import { loadCloud } from './cloud.js';
import { createSession } from './session.js';

const TABS = ['library', 'calculator', 'tb', 'levain', 'hydra', 'croix'];
const RENDERERS = {
  library: renderLibrary,
  calculator: renderCalculator,
  tb: renderTB,
  levain: renderLevain,
  hydra: renderHydra,
  croix: renderCroix,
};

function render() {
  document.querySelectorAll('.tabs [role=tab]').forEach((b) => {
    const active = b.dataset.tab === state.tab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', String(active));
    b.tabIndex = active ? 0 : -1;
  });
  TABS.forEach((t) => {
    byId(`panel-${t}`).hidden = t !== state.tab;
  });
  RENDERERS[state.tab]();
}

function setupTabs() {
  const buttons = [...document.querySelectorAll('.tabs [role=tab]')];
  buttons.forEach((b, i) => {
    b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
      render();
    });
    b.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let next = null;
      if (e.key in keys) next = (i + keys[e.key] + buttons.length) % buttons.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = buttons.length - 1;
      if (next === null) return;
      e.preventDefault();
      buttons[next].focus();
      buttons[next].click();
    });
  });
}

async function start() {
  onSaveStatus((ok) => {
    byId('rc-save-warn').hidden = ok;
  });
  setupTabs();
  setupDialogs(render);
  showScreen('loading');
  let cloud;
  try {
    cloud = await loadCloud();
  } catch {
    showScreen('fatal');
    return;
  }
  // Rien n'est affiché (ni lu) tant que personne n'est connecté.
  createSession({ cloud, render }).start();
}

start();
