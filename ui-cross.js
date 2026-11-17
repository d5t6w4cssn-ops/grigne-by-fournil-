import { state } from './state.js';
import { computeCross } from './core-simple-calcs.js';
import { fmtNum } from './core-units.js';
import { byId, el, intro, nextId, resultCard, resultMount, waitLine } from './ui-dom.js';
import { esc } from './core-text.js';

const ARROW =
  '<span class="cross-arrow" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M14 7l5 5-5 5"/></svg></span>';

export function renderCroix() {
  const view = byId('rc-croix-view');
  view.innerHTML = '';
  intro(
    view,
    "Produit en croix universel : si A correspond à B, alors C correspond à combien ? Marche pour n'importe quelle valeur, dans n'importe quelle unité (tant que A et C sont dans la même).",
  );

  const layout = el('div', 'tool');
  const grid = el('div', 'tool-controls cross-grid');
  layout.appendChild(grid);
  view.appendChild(layout);

  function box(prefix, key, placeholder) {
    const id = nextId('cross');
    const b = el('div', 'field-box field-box--cross');
    b.innerHTML = `<label class="field-box-k" for="${id}">${esc(prefix)}</label><div class="field-box-row"><input id="${id}" type="number" inputmode="decimal" step="any" aria-label="${esc(prefix)} ${esc(placeholder)}" placeholder="${esc(placeholder)}" value="${esc(state.cross[key])}"></div>`;
    b.querySelector('input').oninput = (e) => {
      state.cross[key] = e.target.value;
      renderCroixResult();
    };
    grid.appendChild(b);
  }
  box('Si', 'a', 'A');
  grid.insertAdjacentHTML('beforeend', ARROW);
  box('correspond à', 'b', 'B');
  box('alors', 'c', 'C');
  grid.insertAdjacentHTML('beforeend', `${ARROW}<div class="field-box field-box--cross field-box--ghost" aria-hidden="true"><span class="field-box-k">correspond à</span><span class="ghost-v">?</span></div>`);

  layout.appendChild(resultMount('rc-croix-result'));
  renderCroixResult();
}

function renderCroixResult() {
  const wrap = byId('rc-croix-result');
  if (!wrap) return;
  const r = computeCross(state.cross);
  const common = { stampLabel: 'Résultat', stampTop: 'RÉSULTAT', kicker: 'C correspond à', title: 'B × C ÷ A' };
  const ghost = byId('rc-croix-view').querySelector('.ghost-v');
  if (ghost) ghost.textContent = r.status === 'ok' ? fmtNum(r.value, 2) : '?';
  if (r.status === 'ok') wrap.innerHTML = resultCard({ ...common, value: fmtNum(r.value, 2) });
  else wrap.innerHTML = resultCard({ ...common, value: '', body: waitLine(r.status === 'a-zero' ? 'A ne peut pas être 0' : 'en attente des 3 valeurs', r.status === 'a-zero' ? 'err' : 'wait') });
}
