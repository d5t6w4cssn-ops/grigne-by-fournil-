// État partagé de l'application (un seul objet, modifié par les écrans).
import { loadAll, writeRecipes, writeHistory, clearAll } from './storage.js';
import { uid } from './core-text.js';

export const state = {
  recipes: [],
  history: [],
  loaded: false,
  tab: 'library',
  editingId: null,
  adding: false,
  calc: {
    recipeId: null,
    mode: 'total',
    totalQty: '',
    totalUnit: 'kg',
    pieceRows: [{ id: uid(), label: '', count: '', weight: '' }],
    flourQty: '',
    flourUnit: 'kg',
    notesVisible: false,
  },
  tb: { tb: '', labo: '', farine: '' },
  levain: { preset: '1-1-1', cLev: '1', cEau: '1', cFar: '1', mode: 'have', qty: '', unit: 'kg' },
  hydra: { farine: '', fUnit: 'kg', eau: '', eUnit: 'kg' },
  cross: { a: '', b: '', c: '' },
};

const listeners = new Set();
/** Appelé quand l'enregistrement réussit (true) ou échoue (false). */
export function onSaveStatus(fn) {
  listeners.add(fn);
}
function notify(ok) {
  listeners.forEach((fn) => fn(ok));
}

const changeListeners = new Set();
/** Appelé après chaque modification faite par l'utilisateur (pour la synchronisation). */
export function onLocalChange(fn) {
  changeListeners.add(fn);
}
const emitChange = () => changeListeners.forEach((fn) => fn());

export function init() {
  const { recipes, history } = loadAll();
  state.recipes = recipes;
  state.history = history;
  state.loaded = true;
}

export function saveRecipes() {
  if (!state.loaded) return;
  notify(writeRecipes(state.recipes));
  emitChange();
}
export function saveHistory() {
  if (!state.loaded) return;
  notify(writeHistory(state.history));
  emitChange();
}

/** Remplace les données par celles du cloud (ou d'une fusion), sans les renvoyer au cloud. */
export function applyRemote(recipes, history) {
  state.recipes = recipes;
  state.history = history;
  if (state.calc.recipeId && !recipes.some((r) => r.id === state.calc.recipeId)) state.calc.recipeId = null;
  notify(writeRecipes(recipes) && writeHistory(history));
}

/** Vide l'état en mémoire (déconnexion) sans toucher aux données enregistrées. */
export function resetMemory() {
  state.recipes = [];
  state.history = [];
  state.loaded = false;
  state.tab = 'library';
  state.editingId = null;
  state.adding = false;
  state.calc.recipeId = null;
}

/** Vrai quand l'utilisateur est en train de modifier une recette (on ne change pas la liste sous ses doigts). */
export const isEditing = () => state.adding || state.editingId !== null;

/** Remplace toutes les données (import) et enregistre. */
export function replaceAll(recipes, history) {
  state.recipes = recipes;
  state.history = history;
  state.editingId = null;
  state.adding = false;
  state.calc.recipeId = null;
  saveRecipes();
  saveHistory();
}

/** Efface tout (recettes et historique). */
export function wipeAll() {
  state.recipes = [];
  state.history = [];
  state.editingId = null;
  state.adding = false;
  state.calc.recipeId = null;
  notify(clearAll());
  emitChange();
}
