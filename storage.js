// Copie de travail sur l'appareil (localStorage), séparée par compte : chaque compte a ses propres clés.
// Le cloud (Firestore) est la référence ; cette copie permet de travailler hors ligne.
import { sanitizeRecipes, sanitizeHistory } from './core-sanitize.js';

const BASE_RECIPES = 'grigne-recettes-v1';
const BASE_HISTORY = 'grigne-calc-history-v1';
const BASE_SYNC = 'grigne-sync-v1';
const DEVICE_KEY = 'grigne-device-v1';

let scope = '';
const keys = () => ({
  recipes: `${BASE_RECIPES}:${scope}`,
  history: `${BASE_HISTORY}:${scope}`,
  sync: `${BASE_SYNC}:${scope}`,
});

/** Choisit le compte dont on lit/écrit les données ('' = aucun compte, rien n'est lu ni écrit). */
export function setScope(uid) {
  scope = typeof uid === 'string' ? uid : '';
}
export const hasScope = () => scope !== '';

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadAll() {
  if (!scope) return { recipes: [], history: [] };
  const k = keys();
  return { recipes: sanitizeRecipes(readJson(k.recipes)), history: sanitizeHistory(readJson(k.history)) };
}

/** Écrit une valeur ; renvoie false si le navigateur refuse (stockage plein ou bloqué). */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export const writeRecipes = (v) => hasScope() && write(keys().recipes, v);
export const writeHistory = (v) => hasScope() && write(keys().history, v);

/** État de synchronisation : version cloud connue + modifications non envoyées. */
export function readSync() {
  const m = scope ? readJson(keys().sync) : null;
  return { version: Number.isFinite(m?.version) ? m.version : 0, dirty: m?.dirty === true };
}
export function writeSync(meta) {
  if (scope) write(keys().sync, { version: meta.version, dirty: meta.dirty });
}

/** Efface les données du compte courant sur cet appareil. */
export function clearAll() {
  if (!scope) return false;
  try {
    const k = keys();
    localStorage.removeItem(k.recipes);
    localStorage.removeItem(k.history);
    return true;
  } catch {
    return false;
  }
}

/**
 * Données de la version sans compte (bêta antérieure) : reprises une seule fois par le premier compte
 * qui se connecte sur cet appareil, puis supprimées.
 */
export function takeLegacy() {
  const recipes = sanitizeRecipes(readJson(BASE_RECIPES));
  const history = sanitizeHistory(readJson(BASE_HISTORY));
  if (recipes.length === 0 && history.length === 0) return null;
  try {
    localStorage.removeItem(BASE_RECIPES);
    localStorage.removeItem(BASE_HISTORY);
  } catch {
    /* ignoré */
  }
  return { recipes, history };
}

/** Identifiant aléatoire de cet appareil (pour la limite d'appareils). */
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || id.length < 16) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, '');
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `volatile-${Math.random().toString(36).slice(2)}${Date.now()}`;
  }
}
