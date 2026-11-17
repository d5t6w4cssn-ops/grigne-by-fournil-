import { state, saveRecipes } from './state.js';
import { esc, uid } from './core-text.js';
import { formatGrams, toGrams, numVal } from './core-units.js';
import { getFlourWeightG, getTotalG, isFlour } from './core-recipe-math.js';
import { parseRecipeText } from './core-parse.js';
import { makeExampleRecipes } from './core-examples.js';
import { extractPdfText } from './pdf.js';
import { byId, el, icons, nextId } from './ui-dom.js';

export function renderLibrary() {
  const view = byId('rc-library-view');
  view.innerHTML = '';

  const openAdd = () => {
    state.adding = true;
    renderLibrary();
    view.querySelector('.name-input')?.focus();
  };

  if (state.recipes.length === 0 && !state.adding) {
    const empty = el('div', 'empty');
    empty.innerHTML = `
      <span class="empty-badge" aria-hidden="true">${icons.wheat(34)}</span>
      <p class="empty-title">Ton carnet de recettes t'attend</p>
      <p>Ta bibliothèque est vide. Ajoute une première recette pour commencer à convertir : à la main, en collant un texte ou depuis un PDF. Ou pars de nos exemples.</p>`;
    const btn = el('button', 'btn-dark');
    btn.type = 'button';
    btn.innerHTML = `${icons.plus(18)} Ajouter une recette`;
    btn.onclick = openAdd;
    const examplesBtn = el('button', 'btn-soft');
    examplesBtn.type = 'button';
    examplesBtn.innerHTML = `${icons.wheat(18)} Ajouter 3 recettes d'exemple`;
    examplesBtn.onclick = () => {
      state.recipes.push(...makeExampleRecipes());
      saveRecipes();
      renderLibrary();
      byId('rc-library-view').querySelector('.lib-add')?.focus();
    };
    const actions = el('div', 'empty-actions');
    actions.append(btn, examplesBtn);
    empty.appendChild(actions);
    empty.appendChild(el('p', 'empty-hint', 'Baguette de tradition, pain de campagne au levain et brioche : tu pourras les modifier ou les supprimer comme les autres.'));
    view.appendChild(empty);
    return;
  }

  const n = state.recipes.length;
  const head = el('div', 'lib-head');
  head.appendChild(el('p', 'lib-count', n ? `${n} recette${n > 1 ? 's' : ''}` : 'Ta première recette'));
  if (!state.adding) {
    const addBtn = el('button', 'btn-dark lib-add');
    addBtn.type = 'button';
    addBtn.innerHTML = `${icons.plus(18)} Ajouter une recette`;
    addBtn.onclick = openAdd;
    head.appendChild(addBtn);
  }
  view.appendChild(head);

  const list = el('div', 'recipe-list');
  state.recipes.forEach((r) => {
    list.appendChild(state.editingId === r.id ? buildRecipeForm(r) : buildRecipeRow(r));
  });
  view.appendChild(list);

  if (state.adding) view.appendChild(buildRecipeForm(null));
}

/** Ouvre le Calculateur sur cette recette. */
function openInCalculator(r) {
  state.calc.recipeId = r.id;
  state.calc.notesVisible = false;
  byId('tab-calculator').click();
}

function buildRecipeRow(r) {
  const total = getTotalG(r);
  const flourG = getFlourWeightG(r);
  const scale1kg = flourG > 0 ? 1000 / flourG : null;
  const totalFor1kg = scale1kg ? total * scale1kg : null;
  const detailId = nextId('ing');
  const notesId = nextId('notes');
  const hasTb = r.tb !== undefined && r.tb !== '' && r.tb !== null;
  const count = r.ingredients.length;

  const chips = [
    `${count} ingrédient${count > 1 ? 's' : ''}`,
    `Référence ${formatGrams(total)}`,
    totalFor1kg ? `Base 1\u202Fkg farine : ${formatGrams(totalFor1kg)}` : '',
    hasTb ? `TB ${String(r.tb).replace('.', ',')}\u202F°C` : '',
  ].filter(Boolean);

  const row = el('article', 'recipe-row recipe-card');
  const ingLines = (cols) =>
    r.ingredients
      .map(
        (ing) =>
          `<div class="line${isFlour(ing) ? ' line--flour' : ''}"><span class="line-name">${esc(ing.name)}</span>${cols(ing)}</div>`,
      )
      .join('');

  row.innerHTML = `
    <div class="recipe-head">
      <h3><button type="button" class="row-toggle" aria-expanded="false" aria-controls="${detailId}">${esc(r.name)}</button></h3>
      <div class="row-actions">
        ${r.notes ? `<button type="button" class="icon-btn notes-btn" aria-label="Étapes de ${esc(r.name)}" aria-expanded="false" aria-controls="${notesId}">${icons.info(18)}</button>` : ''}
        <button type="button" class="icon-btn edit-btn" aria-label="Modifier ${esc(r.name)}">${icons.edit(18)}</button>
        <button type="button" class="icon-btn del-btn" aria-label="Supprimer ${esc(r.name)}">${icons.trash(18)}</button>
      </div>
    </div>
    <ul class="meta chips">${chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    ${r.notes ? `<div class="notes-display" id="${notesId}" hidden>${esc(r.notes)}</div>` : ''}
    <div class="ing-display" id="${detailId}" hidden>
      ${
        scale1kg
          ? `<div class="line line--head"><span class="line-name">Ingrédient</span><span class="cols"><span class="col">Ta recette</span><span class="col">Base 1\u202Fkg farine</span></span></div>
             ${ingLines((ing) => `<span class="cols"><span class="col">${formatGrams(ing.qtyG)}</span><span class="col col--strong">${formatGrams(ing.qtyG * scale1kg)}</span></span>`)}
             <div class="line line--total"><span class="line-name">Total</span><span class="cols"><span class="col">${formatGrams(total)}</span><span class="col">${formatGrams(totalFor1kg)}</span></span></div>`
          : `${ingLines((ing) => `<span class="cols"><span class="col col--strong">${formatGrams(ing.qtyG)}</span></span>`)}
             <div class="line line--total"><span class="line-name">Total</span><span class="cols"><span class="col">${formatGrams(total)}</span></span></div>`
      }
    </div>
    <div class="recipe-foot">
      <span class="recipe-more" aria-hidden="true">${icons.chevron(18)}<span class="recipe-more-t">Ingrédients</span></span>
      <button type="button" class="btn-soft calc-btn" aria-label="Calculer ${esc(r.name)}">${icons.scale(18)} Calculer</button>
    </div>
  `;

  const toggleBtn = row.querySelector('.row-toggle');
  const detail = row.querySelector('.ing-display');
  const toggleDetail = () => {
    detail.hidden = !detail.hidden;
    toggleBtn.setAttribute('aria-expanded', String(!detail.hidden));
    row.classList.toggle('is-open', !detail.hidden);
  };
  toggleBtn.onclick = toggleDetail;
  row.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    toggleDetail();
  });

  if (r.notes) {
    const nb = row.querySelector('.notes-btn');
    const nd = row.querySelector('.notes-display');
    nb.onclick = () => {
      nd.hidden = !nd.hidden;
      nb.setAttribute('aria-expanded', String(!nd.hidden));
    };
  }
  row.querySelector('.calc-btn').onclick = () => openInCalculator(r);
  row.querySelector('.edit-btn').onclick = () => {
    state.editingId = r.id;
    renderLibrary();
    byId('rc-library-view').querySelector('.name-input')?.focus();
  };
  row.querySelector('.del-btn').onclick = () => {
    if (!window.confirm(`Supprimer la recette « ${r.name} » ?`)) return;
    state.recipes = state.recipes.filter((rec) => rec.id !== r.id);
    saveRecipes();
    renderLibrary();
  };
  return row;
}

function buildRecipeForm(initial) {
  const key = initial ? initial.id : 'new';
  const wrap = el('div', 'card card--spaced recipe-form');

  let ingredients =
    initial && initial.ingredients.length
      ? initial.ingredients.map((i) => ({ id: i.id, name: i.name, qty: i.qtyG, unit: 'g' }))
      : [{ id: uid(), name: '', qty: '', unit: 'g' }];
  let notes = initial?.notes || '';
  let tb = initial?.tb ?? '';

  const nameId = nextId('name');
  const statusId = `rc-dz-status-${key}`;
  const tbId = nextId('tb');
  const pasteId = nextId('paste');
  const notesTaId = nextId('notesta');
  const errId = nextId('err');

  const titleId = nextId('formtitle');
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-labelledby', titleId);
  wrap.innerHTML = `
    <h3 class="form-title" id="${titleId}">${initial ? 'Modifier la recette' : 'Nouvelle recette'}</h3>
    <input id="${nameId}" class="name-input" aria-label="Nom de la recette" aria-describedby="${errId}" placeholder="Nom de la recette" value="${initial ? esc(initial.name) : ''}" maxlength="200">

    <div class="import-tiles">
      <label class="dropzone tile">
        <span class="tile-icon" aria-hidden="true">${icons.file(22)}</span>
        <span class="tile-text">
          <span class="dz-title"><strong>Importer un PDF</strong></span>
          <span class="hint">Dépose-le ici ou touche pour le choisir. Il doit contenir du texte sélectionnable : pour un scan, saisis à la main.</span>
        </span>
        <input type="file" accept="application/pdf" class="dz-input" aria-label="Choisir un fichier PDF">
      </label>
      <button type="button" class="tile paste-toggle-btn" aria-expanded="false" aria-controls="${pasteId}">
        <span class="tile-icon" aria-hidden="true">${icons.paste(22)}</span>
        <span class="tile-text">
          <strong>Coller le texte d'une recette</strong>
          <span class="hint" aria-hidden="true">Une ligne par ingrédient : «\u202F500\u202Fg farine\u202F»</span>
        </span>
      </button>
    </div>
    <div id="${statusId}" role="status" aria-live="polite"></div>
    <div class="paste-area" id="${pasteId}" hidden>
      <textarea rows="6" aria-label="Texte de la recette à analyser" placeholder="500 g farine T65&#10;350 g eau&#10;10 g sel&#10;5 g levure"></textarea>
      <div class="paste-actions">
        <button type="button" class="btn-dark analyze-btn">Analyser le texte</button>
        <button type="button" class="btn-ghost cancel-paste-btn">Annuler</button>
      </div>
    </div>

    <h4 class="form-section">Ingrédients</h4>
    <p class="form-hint">La farine sert de base aux calculs : garde le mot «\u202Ffarine\u202F» dans son nom.</p>
    <div class="ing-list" role="group" aria-label="Ingrédients"></div>
    <button type="button" class="add-row add-ing-btn">${icons.plus(18)} Ajouter un ingrédient</button>

    <h4 class="form-section">Pour le fournil</h4>
    <div class="tb-row">
      <label for="${tbId}">Température de base (TB)</label>
      <span class="suffix-field">
        <input id="${tbId}" type="number" inputmode="decimal" step="any" class="tb-input" placeholder="ex. 54" value="${esc(tb)}">
        <span class="suffix" aria-hidden="true">°C</span>
      </span>
      <span class="tb-hint">facultatif</span>
    </div>
    <button type="button" class="btn-link notes-toggle-btn" aria-expanded="false">${icons.info(16)} <span class="notes-toggle-label">${notes ? 'Voir les étapes / temps' : 'Ajouter des étapes / temps (optionnel)'}</span></button>
    <div class="notes-area" hidden>
      <textarea id="${notesTaId}" class="notes-textarea" rows="4" aria-label="Étapes et temps" placeholder="Ex. 30 min de pointage, division, façonnage…"></textarea>
    </div>

    <p class="save-error" id="${errId}" role="alert" hidden></p>
    <div class="card-actions">
      <button type="button" class="btn-dark save-btn">${icons.check(18)} Enregistrer</button>
      <button type="button" class="btn-ghost cancel-btn">Annuler</button>
    </div>
  `;
  wrap.querySelector('.notes-textarea').value = notes;

  const nameInput = wrap.querySelector('.name-input');
  const errorEl = wrap.querySelector('.save-error');

  function renderIngList() {
    const list = wrap.querySelector('.ing-list');
    list.innerHTML = '';
    ingredients.forEach((ing, idx) => {
      const n = idx + 1;
      const row = el('div', 'ing-row');
      row.innerHTML = `
        <input type="text" aria-label="Ingrédient ${n}" placeholder="Ingrédient" value="${esc(ing.name)}" maxlength="200">
        <input type="number" inputmode="decimal" step="any" aria-label="Quantité de l'ingrédient ${n}" placeholder="Qté" value="${esc(ing.qty)}">
        <select aria-label="Unité de l'ingrédient ${n}">
          ${['g', 'kg', 'ml', 'cl', 'l'].map((u) => `<option value="${u}" ${ing.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
        <button type="button" class="icon-btn rm" aria-label="Retirer l'ingrédient ${n}">×</button>
      `;
      row.querySelector('input[type=text]').oninput = (e) => (ing.name = e.target.value);
      row.querySelector('input[type=number]').oninput = (e) => (ing.qty = e.target.value);
      row.querySelector('select').onchange = (e) => (ing.unit = e.target.value);
      row.querySelector('.rm').onclick = () => {
        ingredients = ingredients.filter((i) => i.id !== ing.id);
        renderIngList();
        (list.querySelector('input[type=text]') || wrap.querySelector('.add-ing-btn')).focus();
      };
      list.appendChild(row);
    });
  }
  renderIngList();

  wrap.querySelector('.add-ing-btn').onclick = () => {
    ingredients.push({ id: uid(), name: '', qty: '', unit: 'g' });
    renderIngList();
    const inputs = wrap.querySelectorAll('.ing-list input[type=text]');
    inputs[inputs.length - 1].focus();
  };

  const notesBtn = wrap.querySelector('.notes-toggle-btn');
  const notesArea = wrap.querySelector('.notes-area');
  const notesTextarea = wrap.querySelector('.notes-textarea');
  notesBtn.onclick = () => {
    notesArea.hidden = !notesArea.hidden;
    notesBtn.setAttribute('aria-expanded', String(!notesArea.hidden));
  };
  notesTextarea.oninput = (e) => (notes = e.target.value);
  wrap.querySelector('.tb-input').oninput = (e) => (tb = e.target.value);

  const pasteBtn = wrap.querySelector('.paste-toggle-btn');
  const pasteArea = wrap.querySelector('.paste-area');
  const pasteText = pasteArea.querySelector('textarea');
  const closePaste = () => {
    pasteArea.hidden = true;
    pasteBtn.hidden = false;
    pasteBtn.setAttribute('aria-expanded', 'false');
  };
  pasteBtn.onclick = () => {
    pasteArea.hidden = false;
    pasteBtn.hidden = true;
    pasteBtn.setAttribute('aria-expanded', 'true');
    pasteText.focus();
  };
  wrap.querySelector('.cancel-paste-btn').onclick = () => {
    closePaste();
    pasteBtn.focus();
  };

  function applyParsed(parsed) {
    if (parsed.ingredients.length) {
      ingredients = parsed.ingredients.map((p) => ({ id: p.id, name: p.name, qty: p.qtyG, unit: 'g' }));
      renderIngList();
    }
    if (parsed.notes) {
      notes = notes ? `${notes}\n${parsed.notes}` : parsed.notes;
      notesTextarea.value = notes;
      notesBtn.querySelector('.notes-toggle-label').textContent = 'Voir les étapes / temps';
    }
  }

  wrap.querySelector('.analyze-btn').onclick = () => {
    applyParsed(parseRecipeText(pasteText.value));
    closePaste();
    pasteText.value = '';
    pasteBtn.focus();
  };

  const dz = wrap.querySelector('.dropzone');
  const fileInput = wrap.querySelector('input[type=file]');
  const statusEl = wrap.querySelector(`#${CSS.escape(statusId)}`);
  const setStatus = (kind, text) => {
    statusEl.innerHTML = `<div class="dropzone-status ${kind}">${esc(text)}</div>`;
  };

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('drag');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('drag');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  async function handleFile(file) {
    if (file.type !== 'application/pdf') {
      setStatus('warn', "Ce fichier n'est pas un PDF.");
      return;
    }
    setStatus('ok', `Lecture de « ${file.name} »…`);
    if (!nameInput.value.trim()) {
      const guess = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
      if (guess) nameInput.value = guess.charAt(0).toUpperCase() + guess.slice(1);
    }
    try {
      const parsed = parseRecipeText(await extractPdfText(file));
      if (parsed.ingredients.length) {
        const n = parsed.ingredients.length;
        setStatus('ok', `${n} ingrédient${n > 1 ? 's' : ''} détecté${n > 1 ? 's' : ''} depuis « ${file.name} ». Vérifie les quantités ci-dessous.`);
      } else {
        setStatus('warn', 'Aucun texte exploitable trouvé dans ce PDF — probablement un scan ou une photo. Saisis les ingrédients à la main ci-dessous.');
      }
      applyParsed(parsed);
    } catch {
      setStatus('warn', 'Impossible de lire ce PDF. Saisis les ingrédients à la main ci-dessous.');
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  wrap.querySelector('.save-btn').onclick = () => {
    const name = nameInput.value.trim();
    const cleaned = ingredients
      .filter((i) => i.name.trim() && i.qty !== '' && numVal(i.qty) !== null)
      .map((i) => ({ id: i.id, name: i.name.trim(), qtyG: toGrams(numVal(i.qty), i.unit) }));

    if (!name) {
      showError("Indique un nom pour la recette avant d'enregistrer.");
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }
    if (cleaned.length === 0) {
      showError("Aucun ingrédient valide — vérifie qu'un nom et une quantité sont bien renseignés pour chaque ligne.");
      return;
    }
    errorEl.hidden = true;
    nameInput.removeAttribute('aria-invalid');
    const tbParsed = numVal(tb);
    const tbValue = tbParsed === null ? '' : tbParsed;
    if (initial) {
      const idx = state.recipes.findIndex((r) => r.id === initial.id);
      state.recipes[idx] = { ...state.recipes[idx], name, ingredients: cleaned, notes, tb: tbValue };
      state.editingId = null;
    } else {
      state.recipes.push({ id: uid(), name, ingredients: cleaned, notes, tb: tbValue });
      state.adding = false;
    }
    saveRecipes();
    renderLibrary();
  };
  wrap.querySelector('.cancel-btn').onclick = () => {
    if (initial) state.editingId = null;
    else state.adding = false;
    renderLibrary();
  };

  return wrap;
}
