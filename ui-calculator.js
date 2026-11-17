import { state, saveHistory } from './state.js';
import { esc, uid } from './core-text.js';
import { formatGrams, fixed, numVal, NNBSP } from './core-units.js';
import { getFlourWeightG, getTotalG, computeScaling, isFlour } from './core-recipe-math.js';
import { amount, byId, el, icons, nextId, resultMount, stamp } from './ui-dom.js';

/** Pas des boutons − / + selon l'unité. */
const STEP = { kg: 1, g: 100 };

/** Trait ondulé, dessiné à la main. */
const wave = (cls) =>
  `<svg class="wave ${cls}" viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M2 7c18-3 34 2 52-1s30-3 46 0 34 2 52-1 36-2 50 1 22 1 36-1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;

export function renderCalculator() {
  const view = byId('rc-calculator-view');
  const calc = state.calc;
  view.innerHTML = '';

  if (state.recipes.length === 0) {
    view.appendChild(el('p', 'intro', "Ajoute d'abord une recette dans l'onglet Bibliothèque pour pouvoir la convertir."));
    return;
  }
  if (!calc.recipeId || !state.recipes.find((r) => r.id === calc.recipeId)) {
    calc.recipeId = state.recipes[0].id;
  }

  const layout = el('div', 'calc');
  const controls = el('div', 'calc-controls');
  const output = el('div', 'calc-output');
  layout.append(controls, output);
  view.appendChild(layout);

  // recette : un grand sélecteur, l'étiquette dans le cadre
  const picker = el('div', 'picker');
  const label1 = el('label', 'picker-k', 'Recette');
  label1.htmlFor = 'rc-calc-recipe';
  const select = el('select', 'picker-v');
  select.id = 'rc-calc-recipe';
  state.recipes.forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.name;
    if (r.id === calc.recipeId) opt.selected = true;
    select.appendChild(opt);
  });
  select.onchange = (e) => {
    calc.recipeId = e.target.value;
    calc.notesVisible = false;
    renderCalculator();
  };
  picker.append(label1, select);
  picker.insertAdjacentHTML(
    'beforeend',
    '<svg class="picker-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg>',
  );
  controls.appendChild(picker);

  const recipe = state.recipes.find((r) => r.id === calc.recipeId);
  const usesFlour = getFlourWeightG(recipe) > 0;
  if (calc.mode === 'farine' && !usesFlour) calc.mode = 'total';

  if (recipe.notes) {
    const notesBtn = el('button', 'btn-link notes-btn');
    notesBtn.type = 'button';
    notesBtn.setAttribute('aria-expanded', String(calc.notesVisible));
    notesBtn.innerHTML = `${icons.info(16)} ${calc.notesVisible ? 'Masquer' : 'Voir'} les étapes / temps`;
    notesBtn.onclick = () => {
      calc.notesVisible = !calc.notesVisible;
      renderCalculator();
      byId('rc-calculator-view').querySelector('.btn-link')?.focus();
    };
    controls.appendChild(notesBtn);
    if (calc.notesVisible) controls.appendChild(el('div', 'notes-display notes-display--calc', recipe.notes));
  }

  const modeRow = el('div', 'modes');
  modeRow.setAttribute('role', 'radiogroup');
  modeRow.setAttribute('aria-label', 'Mode de calcul');
  const name = nextId('mode');
  modeRow.innerHTML = `
    <label><input type="radio" name="${name}" value="total" ${calc.mode === 'total' ? 'checked' : ''}><span>Poids total</span></label>
    <label><input type="radio" name="${name}" value="pieces" ${calc.mode === 'pieces' ? 'checked' : ''}><span>Pièces × poids</span></label>
    <label class="${usesFlour ? '' : 'disabled'}" ${usesFlour ? '' : 'title="Aucune farine identifiée dans cette recette"'}><input type="radio" name="${name}" value="farine" ${calc.mode === 'farine' ? 'checked' : ''} ${usesFlour ? '' : 'disabled'}><span>Poids de farine</span></label>
  `;
  modeRow.querySelectorAll('input').forEach((r) => {
    r.onchange = (e) => {
      calc.mode = e.target.value;
      renderCalculator();
      const again = byId('rc-calculator-view').querySelector(`input[type=radio][value="${calc.mode}"]`);
      if (again) again.focus();
    };
  });
  controls.appendChild(modeRow);

  if (calc.mode === 'total' || calc.mode === 'farine') {
    const isTotal = calc.mode === 'total';
    const qKey = isTotal ? 'totalQty' : 'flourQty';
    const uKey = isTotal ? 'totalUnit' : 'flourUnit';
    const id = nextId('calcqty');
    const stepper = el('div', 'stepper');
    const stepLabel = (sign) => `${sign} ${STEP[calc[uKey]]}${NNBSP}${calc[uKey]}`;
    stepper.innerHTML = `
      <button type="button" class="step" data-dir="-1" aria-label="${stepLabel('Moins')}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/></svg></button>
      <div class="stepper-mid">
        <label class="stepper-k" for="${id}">${isTotal ? 'Poids de pâte voulu' : 'Poids de farine voulu'}</label>
        <div class="stepper-val">
          <input id="${id}" type="number" inputmode="decimal" step="any" min="0" placeholder="${isTotal ? 'Ex. 15' : 'Ex. 2'}" value="${esc(calc[qKey])}">
          <select aria-label="Unité"><option value="kg" ${calc[uKey] === 'kg' ? 'selected' : ''}>kg</option><option value="g" ${calc[uKey] === 'g' ? 'selected' : ''}>g</option></select>
        </div>
      </div>
      <button type="button" class="step" data-dir="1" aria-label="${stepLabel('Plus')}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg></button>
    `;
    const input = stepper.querySelector('input');
    input.oninput = (e) => {
      calc[qKey] = e.target.value;
      renderResults();
    };
    stepper.querySelector('select').onchange = (e) => {
      calc[uKey] = e.target.value;
      stepper.querySelectorAll('.step').forEach((b) => {
        b.setAttribute('aria-label', stepLabel(b.dataset.dir === '1' ? 'Plus' : 'Moins'));
      });
      renderResults();
    };
    stepper.querySelectorAll('.step').forEach((b) => {
      b.onclick = () => {
        const next = Math.max(0, (numVal(calc[qKey]) ?? 0) + Number(b.dataset.dir) * STEP[calc[uKey]]);
        calc[qKey] = String(Math.round(next * 1000) / 1000);
        input.value = calc[qKey];
        renderResults();
      };
    });
    controls.appendChild(stepper);
  } else {
    const piecesWrap = el('div', 'pieces-wrap');
    piecesWrap.setAttribute('role', 'group');
    piecesWrap.setAttribute('aria-label', 'Pièces à tirer');
    controls.appendChild(piecesWrap);

    const renderPieceRows = () => {
      piecesWrap.innerHTML = '';
      calc.pieceRows.forEach((pr, idx) => {
        const n = idx + 1;
        const row = el('div', 'piece');
        row.innerHTML = `
          <input class="piece-type" type="text" aria-label="Type de pièce ${n}" placeholder="Type de pièce (ex. baguette)" value="${esc(pr.label)}" maxlength="100">
          <input class="piece-nb" type="number" inputmode="decimal" aria-label="Nombre de pièces ${n}" placeholder="Nb" value="${esc(pr.count)}">
          <span class="times" aria-hidden="true">×</span>
          <input class="piece-w" type="number" inputmode="decimal" aria-label="Poids par pièce ${n}, en grammes" placeholder="g / pièce" value="${esc(pr.weight)}">
          <button type="button" class="icon-btn rm" aria-label="Retirer le type de pièce ${n}">×</button>
        `;
        const inputs = row.querySelectorAll('input');
        inputs[0].oninput = (e) => (pr.label = e.target.value);
        inputs[1].oninput = (e) => {
          pr.count = e.target.value;
          renderResults();
        };
        inputs[2].oninput = (e) => {
          pr.weight = e.target.value;
          renderResults();
        };
        row.querySelector('.rm').onclick = () => {
          calc.pieceRows = calc.pieceRows.filter((x) => x.id !== pr.id);
          if (calc.pieceRows.length === 0) calc.pieceRows = [{ id: uid(), label: '', count: '', weight: '' }];
          renderPieceRows();
          renderResults();
          piecesWrap.querySelector('input')?.focus();
        };
        piecesWrap.appendChild(row);
      });
    };
    renderPieceRows();

    const addRowBtn = el('button', 'btn-link');
    addRowBtn.type = 'button';
    addRowBtn.innerHTML = `${icons.plus(16)} Ajouter un type de pièce`;
    addRowBtn.onclick = () => {
      calc.pieceRows.push({ id: uid(), label: '', count: '', weight: '' });
      renderPieceRows();
      renderResults();
      const inputs = piecesWrap.querySelectorAll('input[type=text]');
      inputs[inputs.length - 1].focus();
    };
    controls.appendChild(addRowBtn);
  }

  controls.insertAdjacentHTML('beforeend', wave('wave--sep'));
  output.appendChild(resultMount('rc-results-wrap'));
  const historyWrap = el('div', 'history-wrap');
  historyWrap.id = 'rc-history-wrap';
  output.appendChild(historyWrap);

  renderResults();
  renderHistory();
}

function renderResults() {
  const rroot = byId('rc-results-wrap');
  if (!rroot) return;
  const calc = state.calc;
  const recipe = state.recipes.find((r) => r.id === calc.recipeId);
  if (!recipe) return;

  const s = computeScaling(recipe, calc);
  const { referenceTotalG, usesFlourBasis, referenceBasisG, coefficient, targetG, factor } = s;

  const piecesSummary =
    calc.mode === 'pieces'
      ? calc.pieceRows
          .filter((pr) => parseFloat(pr.count) > 0 && parseFloat(pr.weight) > 0)
          .map((pr) => `${pr.count} ${pr.label || 'pièce(s)'}`)
          .join(' + ')
      : '';
  const flourSummary =
    calc.mode === 'farine' && coefficient
      ? `Farine visée : ${formatGrams(coefficient * 1000)} → ${formatGrams(targetG)} de pâte`
      : '';

  // la farine d'abord (c'est ce qu'on pèse en premier), puis le reste dans l'ordre de la recette
  const flours = recipe.ingredients.filter(isFlour);
  const others = recipe.ingredients.filter((ing) => !isFlour(ing));
  const line = (ing, lead, first) => `
        <li class="${lead ? 'lead' : ''}">
          <span class="n">${first ? '<span class="lead-k">En premier</span>' : ''}${esc(ing.name)}</span>
          <span class="q">${factor ? amount(formatGrams(ing.qtyG * factor)) : '—'}</span>
        </li>`;

  const n = recipe.ingredients.length;
  const hasTb = recipe.tb !== undefined && recipe.tb !== '' && recipe.tb !== null;
  const chips = [
    `${n} ingrédient${n > 1 ? 's' : ''}`,
    hasTb ? `TB ${String(recipe.tb).replace('.', ',')}${NNBSP}°C` : '',
    coefficient ? `×${fixed(coefficient, 2)}` : '',
  ].filter(Boolean);

  rroot.innerHTML = `
    <article class="result-card" aria-label="Résultat pour ${esc(recipe.name)}">
      ${stamp('Total pâte crue', 'TOTAL PÂTE', factor ? formatGrams(getTotalG(recipe) * factor) : '')}
      <p class="result-k">À peser</p>
      <h3 class="result-title">${esc(recipe.name)}</h3>
      <ul class="chips">${chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <ol class="weigh">
        ${flours.map((ing, i) => line(ing, true, i === 0)).join('')}
        ${others.map((ing) => line(ing, false, false)).join('')}
      </ol>
      <div class="ref-line">
        ${usesFlourBasis ? `Base 1${NNBSP}kg de farine : ${formatGrams(referenceBasisG)} de pâte` : `Référence : ${formatGrams(referenceTotalG)} (poids total — aucune farine repérée)`} · ${coefficient ? `coefficient ×${fixed(coefficient, 2)}${usesFlourBasis ? ` (soit ${formatGrams(coefficient * 1000)} de farine)` : ''}` : "en attente d'un poids"}
      </div>
      ${piecesSummary ? `<div class="ref-line">Tirée : ${esc(piecesSummary)} = ${formatGrams(targetG)}</div>` : ''}
      ${flourSummary ? `<div class="ref-line">${esc(flourSummary)}</div>` : ''}
      ${
        coefficient
          ? `<div class="save-calc-row">
              <input type="text" class="calc-label-input" aria-label="Nom de cette tirée (optionnel)" placeholder="Nom du calcul (optionnel)" maxlength="100">
              <button type="button" class="btn-dark save-calc-btn">${icons.check(18)} Enregistrer ce calcul</button>
            </div>`
          : ''
      }
    </article>
  `;
  if (coefficient) {
    rroot.querySelector('.save-calc-btn').onclick = () => {
      const labelInput = rroot.querySelector('.calc-label-input');
      const label = labelInput.value.trim();
      state.history.unshift({
        id: uid(),
        timestamp: Date.now(),
        recipeName: recipe.name,
        label: label || null,
        targetG,
        coefficient,
        basis: usesFlourBasis ? 'farine' : 'total',
        breakdown: recipe.ingredients.map((ing) => ({ name: ing.name, grams: ing.qtyG * factor })),
      });
      state.history = state.history.slice(0, 20);
      saveHistory();
      labelInput.value = '';
      renderHistory();
    };
  }
}

function renderHistory() {
  const hroot = byId('rc-history-wrap');
  if (!hroot) return;
  hroot.innerHTML = '';
  if (state.history.length === 0) return;

  hroot.insertAdjacentHTML('beforeend', wave('wave--soft'));
  hroot.appendChild(el('h3', 'section-title', 'Calculs enregistrés'));
  const list = el('div', 'history-list');
  state.history.forEach((h) => {
    const d = new Date(h.timestamp);
    const dateStr = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const title = h.label || h.recipeName;
    const detailId = nextId('hist');
    const row = el('div', 'recipe-row recipe-row--stack history-item');
    row.innerHTML = `
      <div class="recipe-head">
        <div class="recipe-info">
          <h4 class="history-title"><button type="button" class="row-toggle row-toggle--small" aria-expanded="false" aria-controls="${detailId}">${esc(title)}</button></h4>
          <div class="meta">${esc(h.recipeName)} · ${formatGrams(h.targetG)}${h.coefficient ? ` · ×${fixed(h.coefficient, 2)}` : ''} · ${dateStr}</div>
        </div>
        <div class="row-actions">
          <button type="button" class="icon-btn del-btn" aria-label="Supprimer le calcul ${esc(title)}">${icons.trash(14)}</button>
        </div>
      </div>
      <div class="calc-detail" id="${detailId}" hidden>
        ${h.coefficient ? `<div class="ref-line ref-line--bottom">Coefficient multiplicateur : ×${fixed(h.coefficient, 2)}</div>` : ''}
        ${(h.breakdown || []).map((b) => `<div class="line"><span>${esc(b.name)}</span><span class="strong">${formatGrams(b.grams)}</span></div>`).join('')}
        <div class="line line--total"><span>Total pâte crue</span><span>${formatGrams(h.targetG)}</span></div>
      </div>
    `;
    const toggle = row.querySelector('.row-toggle');
    const detail = row.querySelector('.calc-detail');
    const flip = () => {
      detail.hidden = !detail.hidden;
      toggle.setAttribute('aria-expanded', String(!detail.hidden));
    };
    toggle.onclick = flip;
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      flip();
    });
    row.querySelector('.del-btn').onclick = () => {
      state.history = state.history.filter((x) => x.id !== h.id);
      saveHistory();
      renderHistory();
    };
    list.appendChild(row);
  });
  hroot.appendChild(list);
}
