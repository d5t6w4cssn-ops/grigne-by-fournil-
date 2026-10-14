import { state, saveRecipes } from './state.js';
import { esc, uid } from './core-text.js';
import { formatGrams, toGrams, numVal } from './core-units.js';
import { getFlourWeightG, getTotalG } from './core-recipe-math.js';
import { parseRecipeText } from './core-parse.js';
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
    empty.innerHTML = `<p>Ta bibliothèque est vide. Ajoute une première recette pour commencer à convertir.</p>`;
    const btn = el('button', 'btn-dark');
    btn.type = 'button';
    btn.innerHTML = `${icons.plus()} Ajouter une recette`;
    btn.onclick = openAdd;
    empty.appendChild(btn);
    view.appendChild(empty);
    return;
  }

  const list = el('div', 'recipe-list');
  state.recipes.forEach((r) => {
    list.appendChild(state.editingId === r.id ? buildRecipeForm(r) : buildRecipeRow(r));
  });
  view.appendChild(list);

  if (state.adding) {
    view.appendChild(buildRecipeForm(null));
  } else {
    const addBtn = el('button', 'btn-link btn-link--top');
    addBtn.type = 'button';
    addBtn.innerHTML = `${icons.plus()} Ajouter une recette`;
    addBtn.onclick = openAdd;
    view.appendChild(addBtn);
  }
}

function buildRecipeRow(r) {
  const total = getTotalG(r);
  const flourG = getFlourWeightG(r);
  const scale1kg = flourG > 0 ? 1000 / flourG : null;
  const totalFor1kg = scale1kg ? total * scale1kg : null;
  const detailId = nextId('ing');
  const notesId = nextId('notes');
  const hasTb = r.tb !== undefined && r.tb !== '' && r.tb !== null;

  const row = el('div', 'recipe-row recipe-row--stack');
  const ingLines = (cols) =>
    r.ingredients
      .map(
        (ing) =>
          `<div class="line"><span>${esc(ing.name)}</span>${cols(ing)}</div>`,
      )
      .join('');

  row.innerHTML = `
    <div class="recipe-head">
      <div class="recipe-info">
        <h3><button type="button" class="row-toggle" aria-expanded="false" aria-controls="${detailId}">${esc(r.name)}</button></h3>
        <div class="meta">${r.ingredients.length} ingrédient${r.ingredients.length > 1 ? 's' : ''} · référence ${formatGrams(total)}${totalFor1kg ? ` · base 1 kg farine : ${formatGrams(totalFor1kg)}` : ''}${hasTb ? ` · TB ${esc(r.tb)} °C` : ''}</div>
      </div>
      <div class="row-actions">
        ${r.notes ? `<button type="button" class="icon-btn notes-btn" aria-label="Étapes de ${esc(r.name)}" aria-expanded="false" aria-controls="${notesId}">${icons.info()}</button>` : ''}
        <button type="button" class="icon-btn edit-btn" aria-label="Modifier ${esc(r.name)}">${icons.edit()}</button>
        <button type="button" class="icon-btn del-btn" aria-label="Supprimer ${esc(r.name)}">${icons.trash()}</button>
      </div>
    </div>
    <div class="ing-display" id="${detailId}" hidden>
      ${
        scale1kg
          ? `<div class="line line--head"><span>Ingrédient</span><span class="cols"><span class="col">Ta recette</span><span class="col">Base 1 kg farine</span></span></div>
             ${ingLines((ing) => `<span class="cols"><span class="col">${formatGrams(ing.qtyG)}</span><span class="col col--strong">${formatGrams(ing.qtyG * scale1kg)}</span></span>`)}
             <div class="line line--total"><span>Total</span><span class="cols"><span class="col">${formatGrams(total)}</span><span class="col">${formatGrams(totalFor1kg)}</span></span></div>`
          : ingLines((ing) => `<span class="strong">${formatGrams(ing.qtyG)}</span>`)
      }
    </div>
    ${r.notes ? `<div class="notes-display" id="${notesId}" hidden>${esc(r.notes)}</div>` : ''}
  `;

  const toggleBtn = row.querySelector('.row-toggle');
  const detail = row.querySelector('.ing-display');
  const toggleDetail = () => {
    detail.hidden = !detail.hidden;
    toggleBtn.setAttribute('aria-expanded', String(!detail.hidden));
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
  const wrap = el('div', 'card card--spaced');

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

  wrap.innerHTML = `
    <input id="${nameId}" class="name-input" aria-label="Nom de la recette" aria-describedby="${errId}" placeholder="Nom de la recette (ex. Pain complet)" value="${initial ? esc(initial.name) : ''}" maxlength="200">
    <label class="dropzone">
      <span class="dz-title"><strong>Dépose un PDF ici</strong> ou clique pour en choisir un</span>
      <span class="hint">Fonctionne si le PDF contient du texte sélectionnable. Pour un scan manuscrit, saisis les ingrédients à la main ci-dessous.</span>
      <input type="file" accept="application/pdf" class="dz-input" aria-label="Choisir un fichier PDF">
    </label>
    <div id="${statusId}" role="status" aria-live="polite"></div>
    <button type="button" class="btn-link paste-toggle-btn btn-link--gap" aria-expanded="false" aria-controls="${pasteId}">${icons.paste()} Coller le texte d'une recette</button>
    <div class="paste-area" id="${pasteId}" hidden>
      <textarea rows="6" aria-label="Texte de la recette à analyser" placeholder="500 g farine T65&#10;350 g eau&#10;10 g sel&#10;5 g levure"></textarea>
      <div class="paste-actions">
        <button type="button" class="btn-dark analyze-btn">Analyser le texte</button>
        <button type="button" class="btn-ghost cancel-paste-btn">Annuler</button>
      </div>
    </div>
    <div class="ing-list" role="group" aria-label="Ingrédients"></div>
    <button type="button" class="btn-link add-ing-btn btn-link--gap-lg">${icons.plus(14)} Ajouter un ingrédient</button>
    <button type="button" class="btn-link notes-toggle-btn btn-link--gap" aria-expanded="false">${icons.info(14)} <span class="notes-toggle-label">${notes ? 'Voir les étapes / temps' : 'Ajouter des étapes / temps (optionnel)'}</span></button>
    <div class="notes-area" hidden>
      <textarea id="${notesTaId}" class="notes-textarea" rows="4" aria-label="Étapes et temps" placeholder="Ex. 30min de pointage, division, façonnage…"></textarea>
    </div>
    <div class="tb-row">
      <label for="${tbId}">Température de base (TB)</label>
      <input id="${tbId}" type="number" inputmode="decimal" step="any" class="tb-input" placeholder="ex. 54" value="${esc(tb)}">
      <span class="tb-hint">°C, facultatif</span>
    </div>
    <div class="card-actions">
      <button type="button" class="btn-dark save-btn">${icons.check()} Enregistrer</button>
      <button type="button" class="btn-ghost cancel-btn">Annuler</button>
    </div>
    <p class="save-error" id="${errId}" role="alert" hidden></p>
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
