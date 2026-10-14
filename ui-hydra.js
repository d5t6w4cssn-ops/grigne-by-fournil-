import { state } from './state.js';
import { computeHydration } from './core-simple-calcs.js';
import { formatGrams, fmtNum } from './core-units.js';
import { byId, intro, qtyField, resultMount, singleResult } from './ui-dom.js';

export function renderHydra() {
  const view = byId('rc-hydra-view');
  const s = state.hydra;
  view.innerHTML = '';
  intro(
    view,
    "Indique la farine et l'eau utilisées : tu obtiens le total et le taux d'hydratation. Pour un produit en croix, utilise l'onglet Produit en croix.",
  );
  qtyField(
    view,
    'Farine utilisée',
    s.farine,
    s.fUnit,
    (v) => {
      s.farine = v;
      renderHydraResult();
    },
    (u) => {
      s.fUnit = u;
      renderHydraResult();
    },
    'Ex. 1',
  );
  qtyField(
    view,
    'Eau utilisée',
    s.eau,
    s.eUnit,
    (v) => {
      s.eau = v;
      renderHydraResult();
    },
    (u) => {
      s.eUnit = u;
      renderHydraResult();
    },
    'Ex. 0,7',
  );
  view.appendChild(resultMount('rc-hydra-result'));
  renderHydraResult();
}

function renderHydraResult() {
  const wrap = byId('rc-hydra-result');
  if (!wrap) return;
  const r = computeHydration(state.hydra);
  if (r.status === 'ok') {
    wrap.innerHTML = `
      <div class="result-table">
        <div class="result-row"><span>Total (farine + eau)</span><span class="amt">${formatGrams(r.totalG)}</span></div>
        <div class="result-total"><span>Hydratation</span><span class="amt">${fmtNum(r.percent, 1)} %</span></div>
      </div>`;
  } else {
    wrap.innerHTML = singleResult('Hydratation', r.status === 'flour-zero' ? 'farine à 0' : 'en attente farine + eau');
  }
}
