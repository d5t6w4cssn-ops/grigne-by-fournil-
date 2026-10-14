import { state, saveHistory } from './state.js';
import { esc, uid } from './core-text.js';
import { formatGrams } from './core-units.js';
import { getFlourWeightG, getTotalG, computeScaling } from './core-recipe-math.js';
import { byId, el, icons, nextId, resultMount } from './ui-dom.js';

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

  const label1 = el('label', 'field-label', 'Recette');
  label1.htmlFor = 'rc-calc-recipe';
  view.appendChild(label1);

  const select = el('select', 'recipe-select');
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
  view.appendChild(select);

  const recipe = state.recipes.find((r) => r.id === calc.recipeId);
  const usesFlour = getFlourWeightG(recipe) > 0;
  if (calc.mode === 'farine' && !usesFlour) calc.mode = 'total';

  if (recipe.notes) {
    const notesBtn = el('button', 'btn-link btn-link--gap-lg');
    notesBtn.type = 'button';
    notesBtn.setAttribute('aria-expanded', String(calc.notesVisible));
    notesBtn.innerHTML = `${icons.info(14)} ${calc.notesVisible ? 'Masquer' : 'Voir'} les étapes / temps`;
    notesBtn.onclick = () => {
      calc.notesVisible = !calc.notesVisible;
      renderCalculator();
      byId('rc-calculator-view').querySelector('.btn-link')?.focus();
    };
    view.appendChild(notesBtn);
    if (calc.notesVisible) view.appendChild(el('div', 'notes-display notes-display--calc', recipe.notes));
  }

  const modeRow = el('div', 'mode-row');
  modeRow.setAttribute('role', 'radiogroup');
  modeRow.setAttribute('aria-label', 'Mode de calcul');
  const name = nextId('mode');
  modeRow.innerHTML = `
    <label><input type="radio" name="${name}" value="total" ${calc.mode === 'total' ? 'checked' : ''}> Poids total</label>
    <label><input type="radio" name="${name}" value="pieces" ${calc.mode === 'pieces' ? 'checked' : ''}> Pièces × poids</label>
    <label class="${usesFlour ? '' : 'disabled'}" ${usesFlour ? '' : 'title="Aucune farine identifiée dans cette recette"'}><input type="radio" name="${name}" value="farine" ${calc.mode === 'farine' ? 'checked' : ''} ${usesFlour ? '' : 'disabled'}> Poids de farine</label>
  `;
  modeRow.querySelectorAll('input').forEach((r) => {
    r.onchange = (e) => {
      calc.mode = e.target.value;
      renderCalculator();
      const again = byId('rc-calculator-view').querySelector(`input[type=radio][value="${calc.mode}"]`);
      if (again) again.focus();
    };
  });
  view.appendChild(modeRow);

  if (calc.mode === 'total' || calc.mode === 'farine') {
    const isTotal = calc.mode === 'total';
    const qKey = isTotal ? 'totalQty' : 'flourQty';
    const uKey = isTotal ? 'totalUnit' : 'flourUnit';
    const id = nextId('calcqty');
    const lab = el('label', 'field-label', isTotal ? 'Poids de pâte voulu' : 'Poids de farine voulu');
    lab.htmlFor = id;
    view.appendChild(lab);
    const qtyRow = el('div', 'qty-row qty-row--spaced-lg');
    qtyRow.innerHTML = `
      <input id="${id}" type="number" inputmode="decimal" step="any" placeholder="${isTotal ? 'Ex. 15' : 'Ex. 2'}" value="${esc(calc[qKey])}">
      <select aria-label="Unité"><option value="kg" ${calc[uKey] === 'kg' ? 'selected' : ''}>kg</option><option value="g" ${calc[uKey] === 'g' ? 'selected' : ''}>g</option></select>
    `;
    qtyRow.querySelector('input').oninput = (e) => {
      calc[qKey] = e.target.value;
      renderResults();
    };
    qtyRow.querySelector('select').onchange = (e) => {
      calc[uKey] = e.target.value;
      renderResults();
    };
    view.appendChild(qtyRow);
  } else {
    const piecesWrap = el('div', 'pieces-wrap');
    piecesWrap.setAttribute('role', 'group');
    piecesWrap.setAttribute('aria-label', 'Pièces à tirer');
    view.appendChild(piecesWrap);

    const renderPieceRows = () => {
      piecesWrap.innerHTML = '';
      calc.pieceRows.forEach((pr, idx) => {
        const n = idx + 1;
        const row = el('div', 'qty-row qty-row--spaced-sm');
        row.innerHTML = `
          <input class="grow-13" type="text" aria-label="Type de pièce ${n}" placeholder="Type de pièce (ex. baguette)" value="${esc(pr.label)}" maxlength="100">
          <input class="grow-06" type="number" inputmode="decimal" aria-label="Nombre de pièces ${n}" placeholder="Nb" value="${esc(pr.count)}">
          <span class="times" aria-hidden="true">×</span>
          <input class="grow-08" type="number" inputmode="decimal" aria-label="Poids par pièce ${n}, en grammes" placeholder="g / pièce" value="${esc(pr.weight)}">
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

    const addRowBtn = el('button', 'btn-link btn-link--gap-lg');
    addRowBtn.type = 'button';
    addRowBtn.innerHTML = `${icons.plus(14)} Ajouter un type de pièce`;
    addRowBtn.onclick = () => {
      calc.pieceRows.push({ id: uid(), label: '', count: '', weight: '' });
      renderPieceRows();
      renderResults();
      const inputs = piecesWrap.querySelectorAll('input[type=text]');
      inputs[inputs.length - 1].focus();
    };
    view.appendChild(addRowBtn);
  }

  view.appendChild(resultMount('rc-results-wrap'));
  const historyWrap = el('div', 'history-wrap');
  historyWrap.id = 'rc-history-wrap';
  view.appendChild(historyWrap);

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

  rroot.innerHTML = `
    <div class="ref-line">
      ${usesFlourBasis ? `Base 1 kg de farine : ${formatGrams(referenceBasisG)} de pâte` : `Référence : ${formatGrams(referenceTotalG)} (poids total — aucune farine repérée)`} · ${coefficient ? `coefficient ×${coefficient.toFixed(2)}${usesFlourBasis ? ` (soit ${formatGrams(coefficient * 1000)} de farine)` : ''}` : "en attente d'un poids"}
    </div>
    ${piecesSummary ? `<div class="ref-line ref-line--tight">Tirée : ${esc(piecesSummary)} = ${formatGrams(targetG)}</div>` : ''}
    ${flourSummary ? `<div class="ref-line ref-line--tight">${esc(flourSummary)}</div>` : ''}
    <div class="result-table">
      ${recipe.ingredients
        .map(
          (ing, idx) => `
        <div class="result-row ${idx % 2 === 1 ? 'alt' : ''}">
          <span>${esc(ing.name)}</span>
          <span class="amt">${factor ? formatGrams(ing.qtyG * factor) : '—'}</span>
        </div>`,
        )
        .join('')}
      <div class="result-total">
        <span>Total pâte crue</span>
        <span class="amt">${factor ? formatGrams(getTotalG(recipe) * factor) : '—'}</span>
      </div>
    </div>
    ${
      coefficient
        ? `<div class="save-calc-row">
            <input type="text" class="calc-label-input" aria-label="Nom de cette tirée (optionnel)" placeholder="Nom (optionnel)" maxlength="100">
            <button type="button" class="btn-dark save-calc-btn">Enregistrer ce calcul</button>
          </div>`
        : ''
    }
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

  hroot.appendChild(el('h3', 'section-title', 'Calculs enregistrés'));
  const list = el('div', 'history-list');
  state.history.forEach((h) => {
    const d = new Date(h.timestamp);
    const dateStr = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const title = h.label || h.recipeName;
    const detailId = nextId('hist');
    const row = el('div', 'recipe-row recipe-row--stack');
    row.innerHTML = `
      <div class="recipe-head">
        <div class="recipe-info">
          <h4 class="history-title"><button type="button" class="row-toggle row-toggle--small" aria-expanded="false" aria-controls="${detailId}">${esc(title)}</button></h4>
          <div class="meta">${esc(h.recipeName)} · ${formatGrams(h.targetG)}${h.coefficient ? ` · ×${h.coefficient.toFixed(2)}` : ''} · ${dateStr}</div>
        </div>
        <div class="row-actions">
          <button type="button" class="icon-btn del-btn" aria-label="Supprimer le calcul ${esc(title)}">${icons.trash(14)}</button>
        </div>
      </div>
      <div class="calc-detail" id="${detailId}" hidden>
        ${h.coefficient ? `<div class="ref-line ref-line--bottom">Coefficient multiplicateur : ×${h.coefficient.toFixed(2)}</div>` : ''}
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
