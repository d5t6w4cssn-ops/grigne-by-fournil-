import { state } from './state.js';
import { LEVAIN_PRESETS, computeLevain } from './core-levain.js';
import { formatGrams } from './core-units.js';
import { amount, byId, el, intro, nextId, qtyField, resultCard, resultMount, waitLine } from './ui-dom.js';
import { esc } from './core-text.js';

const CHEVRON =
  '<svg class="picker-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg>';

export function renderLevain() {
  const view = byId('rc-levain-view');
  const s = state.levain;
  view.innerHTML = '';
  intro(
    view,
    'Choisis ton ratio de rafraîchi (levain / eau / farine), puis indique soit le levain que tu as, soit le poids total que tu veux obtenir.',
  );

  const layout = el('div', 'tool');
  const controls = el('div', 'tool-controls');
  layout.appendChild(controls);
  view.appendChild(layout);

  // ratio : grand sélecteur, l'étiquette dans le cadre
  const picker = el('div', 'picker');
  const lab = el('label', 'picker-k', 'Ratio levain / eau / farine');
  lab.htmlFor = 'rc-levain-preset';
  const sel = el('select', 'picker-v');
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
  picker.append(lab, sel);
  picker.insertAdjacentHTML('beforeend', CHEVRON);
  controls.appendChild(picker);

  if (s.preset === 'custom') {
    const cr = el('div', 'ratio-row');
    const mk = (k, label, ph) =>
      `<span class="ratio-part"><span class="ratio-k" aria-hidden="true">${ph}</span><input type="number" inputmode="decimal" step="any" min="0" aria-label="${label}" placeholder="${ph[0]}" value="${esc(s[k])}" data-k="${k}"></span>`;
    cr.innerHTML = `${mk('cLev', 'Part de levain', 'Levain')}<span class="times" aria-hidden="true">/</span>${mk('cEau', "Part d'eau", 'Eau')}<span class="times" aria-hidden="true">/</span>${mk('cFar', 'Part de farine', 'Farine')}`;
    cr.setAttribute('role', 'group');
    cr.setAttribute('aria-label', 'Ratio personnalisé levain, eau, farine');
    cr.querySelectorAll('input').forEach((i) => {
      i.oninput = (e) => {
        s[e.target.dataset.k] = e.target.value;
        renderLevainResult();
      };
    });
    controls.appendChild(cr);
  }

  const modeRow = el('div', 'modes modes--2');
  modeRow.setAttribute('role', 'radiogroup');
  modeRow.setAttribute('aria-label', 'Ce que tu connais');
  const name = nextId('levain-mode');
  modeRow.innerHTML = `
    <label><input type="radio" name="${name}" value="have" ${s.mode === 'have' ? 'checked' : ''}><span>J'ai du levain</span></label>
    <label><input type="radio" name="${name}" value="total" ${s.mode === 'total' ? 'checked' : ''}><span>Je veux un poids total</span></label>`;
  modeRow.querySelectorAll('input').forEach((r) => {
    r.onchange = (e) => {
      s.mode = e.target.value;
      renderLevain();
      byId('rc-levain-view').querySelector(`input[type=radio][value="${s.mode}"]`)?.focus();
    };
  });
  controls.appendChild(modeRow);

  qtyField(
    controls,
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

  layout.appendChild(resultMount('rc-levain-result'));
  renderLevainResult();
}

function ratioText() {
  const s = state.levain;
  if (s.preset !== 'custom') return s.preset.split('-').join(' / ');
  return [s.cLev, s.cEau, s.cFar].map((v) => String(v || '?').replace('.', ',')).join(' / ');
}

function renderLevainResult() {
  const wrap = byId('rc-levain-result');
  if (!wrap) return;
  const r = computeLevain(state.levain);
  const common = { stampLabel: 'Total de levain obtenu', stampTop: 'TOTAL LEVAIN', kicker: 'Ton rafraîchi', title: `Ratio ${ratioText()}` };
  if (r.status !== 'ok') {
    wrap.innerHTML = resultCard({
      ...common,
      value: '',
      body: waitLine(r.status === 'invalid' ? 'ratio invalide : chaque part doit être plus grande que 0' : 'en attente du poids', r.status === 'invalid' ? 'err' : 'wait'),
    });
    return;
  }
  const line = (n, g, cls = '') => `<li class="${cls}"><span class="n">${n}</span><span class="q">${amount(formatGrams(g))}</span></li>`;
  wrap.innerHTML = resultCard({
    ...common,
    value: formatGrams(r.totG),
    body: `<ol class="weigh">
        ${line('Levain (à garder)', r.levG)}
        ${line('Eau', r.eauG, 'lead lead--soft')}
        ${line('Farine', r.farG, 'lead lead--soft')}
      </ol>`,
  });
}
