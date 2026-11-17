import { state } from './state.js';
import { computeWaterTemp } from './core-simple-calcs.js';
import { byId, el, intro, nextId, resultCard, resultMount, waitLine } from './ui-dom.js';
import { esc } from './core-text.js';
import { fixed } from './core-units.js';

export function renderTB() {
  const view = byId('rc-tb-view');
  view.innerHTML = '';
  intro(
    view,
    "Indique la température de base de la recette, la température du labo et celle de la farine : la température d'eau à utiliser se calcule automatiquement.",
  );

  const layout = el('div', 'tool');
  const eq = el('div', 'tool-controls tb-eq');
  eq.setAttribute('role', 'group');
  eq.setAttribute('aria-label', 'Base moins labo moins farine');
  layout.appendChild(eq);
  view.appendChild(layout);

  // l'étiquette visible est courte (« base »), le nom complet reste lu par les lecteurs d'écran
  function field(before, short, key, placeholder) {
    const id = nextId('tb');
    const box = el('div', 'field-box field-box--temp');
    box.innerHTML = `
      <label class="field-box-k" for="${id}"><span class="sr-only">${esc(before)}</span>${esc(short)}<span class="sr-only"> (°C)</span></label>
      <div class="field-box-row"><input id="${id}" type="number" inputmode="decimal" placeholder="${esc(placeholder)}" value="${esc(state.tb[key])}" step="0.1"><span class="suffix" aria-hidden="true">°C</span></div>`;
    box.querySelector('input').oninput = (e) => {
      state.tb[key] = e.target.value;
      renderTBResult();
    };
    eq.appendChild(box);
  }
  const minus = () => eq.insertAdjacentHTML('beforeend', '<span class="eq-op" aria-hidden="true">−</span>');
  field('Température de ', 'base', 'tb', '54');
  minus();
  field('Température du ', 'labo', 'labo', '22');
  minus();
  field('Température de la ', 'farine', 'farine', '20');

  layout.appendChild(resultMount('rc-tb-result'));
  renderTBResult();
}

function renderTBResult() {
  const wrap = byId('rc-tb-result');
  if (!wrap) return;
  const eau = computeWaterTemp(state.tb);
  wrap.innerHTML = resultCard({
    stampLabel: "Température de l'eau à utiliser",
    stampTop: 'EAU DE COULAGE',
    value: eau !== null ? `${fixed(eau, 1)}\u202F°C` : '',
    kicker: "Ton eau",
    title: 'Base − labo − farine',
    body: eau !== null ? '' : waitLine('en attente des 3 valeurs'),
  });
}
