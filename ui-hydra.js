import { state } from './state.js';
import { computeHydration } from './core-simple-calcs.js';
import { formatGrams, fmtNum } from './core-units.js';
import { amount, byId, el, intro, qtyField, resultCard, resultMount, waitLine } from './ui-dom.js';

export function renderHydra() {
  const view = byId('rc-hydra-view');
  const s = state.hydra;
  view.innerHTML = '';
  intro(
    view,
    "Indique la farine et l'eau utilisées : tu obtiens le total et le taux d'hydratation. Pour un produit en croix, utilise l'onglet Produit en croix.",
  );
  const layout = el('div', 'tool');
  const controls = el('div', 'tool-controls fields-2');
  layout.appendChild(controls);
  view.appendChild(layout);
  qtyField(
    controls,
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
    controls,
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
  layout.appendChild(resultMount('rc-hydra-result'));
  renderHydraResult();
}

function renderHydraResult() {
  const wrap = byId('rc-hydra-result');
  if (!wrap) return;
  const r = computeHydration(state.hydra);
  const common = { stampLabel: 'Hydratation', stampTop: 'HYDRATATION', kicker: 'Ta pâte', title: 'Eau ÷ farine' };
  if (r.status === 'ok') {
    wrap.innerHTML = resultCard({
      ...common,
      value: `${fmtNum(r.percent, 1)}\u202F%`,
      body: `<ol class="weigh"><li><span class="n">Total (farine + eau)</span><span class="q">${amount(formatGrams(r.totalG))}</span></li></ol>`,
    });
  } else {
    wrap.innerHTML = resultCard({
      ...common,
      value: '',
      body: waitLine(r.status === 'flour-zero' ? 'farine à 0 : impossible de calculer' : 'en attente farine + eau', r.status === 'flour-zero' ? 'err' : 'wait'),
    });
  }
}
