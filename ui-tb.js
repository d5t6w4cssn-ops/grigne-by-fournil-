import { state } from './state.js';
import { computeWaterTemp } from './core-simple-calcs.js';
import { byId, el, intro, nextId, resultMount, singleResult } from './ui-dom.js';
import { esc } from './core-text.js';

export function renderTB() {
  const view = byId('rc-tb-view');
  view.innerHTML = '';
  intro(
    view,
    "Indique la température de base de la recette, la température du labo et celle de la farine : la température d'eau à utiliser se calcule automatiquement.",
  );

  function field(labelText, key, placeholder) {
    const id = nextId('tb');
    const label = el('label', 'field-label', labelText);
    label.htmlFor = id;
    view.appendChild(label);
    const row = el('div', 'qty-row');
    row.innerHTML = `<input id="${id}" type="number" inputmode="decimal" placeholder="${esc(placeholder)}" value="${esc(state.tb[key])}" step="0.1">`;
    row.querySelector('input').oninput = (e) => {
      state.tb[key] = e.target.value;
      renderTBResult();
    };
    view.appendChild(row);
  }
  field('Température de base (°C)', 'tb', 'Ex. 54');
  field('Température du labo (°C)', 'labo', 'Ex. 22');
  field('Température de la farine (°C)', 'farine', 'Ex. 20');

  view.appendChild(resultMount('rc-tb-result'));
  renderTBResult();
}

function renderTBResult() {
  const wrap = byId('rc-tb-result');
  if (!wrap) return;
  const eau = computeWaterTemp(state.tb);
  wrap.innerHTML = singleResult(
    "Température de l'eau à utiliser",
    eau !== null ? `${eau.toFixed(1)} °C` : 'en attente des 3 valeurs',
  );
}
