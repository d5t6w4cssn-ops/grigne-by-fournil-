import { state } from './state.js';
import { LEVAIN_PRESETS, computeLevain } from './core-levain.js';
import { formatGrams } from './core-units.js';
import { byId, el, intro, nextId, qtyField, resultMount, singleResult } from './ui-dom.js';
import { esc } from './core-text.js';

export function renderLevain() {
  const view = byId('rc-levain-view');
  const s = state.levain;
  view.innerHTML = '';
  intro(
    view,
    'Choisis ton ratio de rafraîchi (levain / eau / farine), puis indique soit le levain que tu as, soit le poids total que tu veux obtenir.',
  );

  const lab = el('label', 'field-label', 'Ratio levain / eau / farine');
  lab.htmlFor = 'rc-levain-preset';
  view.appendChild(lab);
  const sel = el('select', 'recipe-select recipe-select--tight');
  sel.id = 'rc-levain-preset';
  LEVAIN_PRESETS.forEach((p) => {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.id === 'custom' ? 'Personnalisé…' : `${p.lev} / ${p.eau} / ${p.far}`;
    if (p.id === s.preset) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = (e) => {
    s.preset = e.target.value;
    renderLevain();
  };
  view.appendChild(sel);

  if (s.preset === 'custom') {
    const cr = el('div', 'qty-row qty-row--spaced-lg');
    const mk = (k, label, ph) =>
      `<input type="number" inputmode="decimal" step="any" min="0" aria-label="${label}" placeholder="${ph}" value="${esc(s[k])}" data-k="${k}">`;
    cr.innerHTML = `${mk('cLev', 'Part de levain', 'Levain')}<span class="times" aria-hidden="true">/</span>${mk('cEau', "Part d'eau", 'Eau')}<span class="times" aria-hidden="true">/</span>${mk('cFar', 'Part de farine', 'Farine')}`;
    cr.setAttribute('role', 'group');
    cr.setAttribute('aria-label', 'Ratio personnalisé levain, eau, farine');
    cr.querySelectorAll('input').forEach((i) => {
      i.oninput = (e) => {
        s[e.target.dataset.k] = e.target.value;
        renderLevainResult();
      };
    });
    view.appendChild(cr);
  }

  const modeRow = el('div', 'mode-row');
  modeRow.setAttribute('role', 'radiogroup');
  modeRow.setAttribute('aria-label', 'Ce que tu connais');
  const name = nextId('levain-mode');
  modeRow.innerHTML = `
    <label><input type="radio" name="${name}" value="have" ${s.mode === 'have' ? 'checked' : ''}> J'ai du levain</label>
    <label><input type="radio" name="${name}" value="total" ${s.mode === 'total' ? 'checked' : ''}> Je veux un poids total</label>`;
  modeRow.querySelectorAll('input').forEach((r) => {
    r.onchange = (e) => {
      s.mode = e.target.value;
      renderLevain();
    };
  });
  view.appendChild(modeRow);

  qtyField(
    view,
    s.mode === 'have' ? "Poids de levain que j'ai" : 'Poids total de levain voulu',
    s.qty,
    s.unit,
    (v) => {
      s.qty = v;
      renderLevainResult();
    },
    (u) => {
      s.unit = u;
      renderLevainResult();
    },
    'Ex. 1',
  );

  view.appendChild(resultMount('rc-levain-result'));
  renderLevainResult();
}

function renderLevainResult() {
  const wrap = byId('rc-levain-result');
  if (!wrap) return;
  const r = computeLevain(state.levain);
  if (r.status !== 'ok') {
    wrap.innerHTML = singleResult('Résultat', r.status === 'invalid' ? 'ratio invalide' : 'en attente du poids');
    return;
  }
  wrap.innerHTML = `
    <div class="result-table">
      <div class="result-row"><span>Levain (à garder)</span><span class="amt">${formatGrams(r.levG)}</span></div>
      <div class="result-row alt"><span>Eau</span><span class="amt">${formatGrams(r.eauG)}</span></div>
      <div class="result-row"><span>Farine</span><span class="amt">${formatGrams(r.farG)}</span></div>
      <div class="result-total"><span>Total de levain obtenu</span><span class="amt">${formatGrams(r.totG)}</span></div>
    </div>`;
}
