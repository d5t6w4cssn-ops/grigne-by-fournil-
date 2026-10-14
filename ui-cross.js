import { state } from './state.js';
import { computeCross } from './core-simple-calcs.js';
import { fmtNum } from './core-units.js';
import { byId, el, intro, nextId, resultMount, singleResult } from './ui-dom.js';
import { esc } from './core-text.js';

export function renderCroix() {
  const view = byId('rc-croix-view');
  view.innerHTML = '';
  intro(
    view,
    "Produit en croix universel : si A correspond à B, alors C correspond à combien ? Marche pour n'importe quelle valeur, dans n'importe quelle unité (tant que A et C sont dans la même).",
  );

  function line(prefix, key, placeholder) {
    const id = nextId('cross');
    const row = el('div', 'qty-row qty-row--spaced-sm');
    row.innerHTML = `<label class="times times--label" for="${id}">${esc(prefix)}</label><input id="${id}" type="number" inputmode="decimal" step="any" aria-label="${esc(prefix)} ${esc(placeholder)}" placeholder="${esc(placeholder)}" value="${esc(state.cross[key])}">`;
    row.querySelector('input').oninput = (e) => {
      state.cross[key] = e.target.value;
      renderCroixResult();
    };
    view.appendChild(row);
  }
  line('Si', 'a', 'A');
  line('correspond à', 'b', 'B');
  line('alors', 'c', 'C');

  view.appendChild(el('p', 'cross-arrow', 'correspond à :'));
  view.appendChild(resultMount('rc-croix-result'));
  renderCroixResult();
}

function renderCroixResult() {
  const wrap = byId('rc-croix-result');
  if (!wrap) return;
  const r = computeCross(state.cross);
  let right;
  if (r.status === 'waiting') right = 'en attente des 3 valeurs';
  else if (r.status === 'a-zero') right = 'A ne peut pas être 0';
  else right = fmtNum(r.value, 2);
  wrap.innerHTML = singleResult('Résultat', right);
}
