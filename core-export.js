// Fichier d'export des recettes Grigne (format décrit dans docs/format-export.md).
// Sert à la fois de sauvegarde (restaurer, changer d'appareil) et de passerelle vers Fournil.
// Logique pure, sans DOM : testée unitairement.
import { sanitizeRecipes, sanitizeHistory } from './core-sanitize.js';

export const EXPORT_APP = 'grigne';
export const EXPORT_VERSION = 2;
/** Taille maximale d'un fichier importé. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** « grigne-recettes-AAAA-MM-JJ.json », date locale de l'appareil. */
export function exportFileName(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `grigne-recettes-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`;
}

/** Objet exporté : en-tête, toutes les recettes (quantités en grammes), historique des calculs. */
export function buildExport(recipes, history, date = new Date()) {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: date.toISOString(),
    recipeCount: recipes.length,
    recipes: recipes.map((r) => ({
      id: r.id,
      name: r.name,
      ingredients: r.ingredients.map((i) => ({ id: i.id, name: i.name, qtyG: i.qtyG, unit: 'g' })),
      notes: r.notes || '',
      tb: typeof r.tb === 'number' ? r.tb : null,
    })),
    history,
  };
}

/** Texte du fichier (JSON indenté, lisible à l'œil). */
export const exportText = (recipes, history, date) => JSON.stringify(buildExport(recipes, history, date), null, 2);

/**
 * Lit le texte d'un fichier Grigne. Renvoie { recipes, history } nettoyés par sanitizeRecipes / sanitizeHistory,
 * ou { error } : 'json' (illisible), 'format' (pas un fichier Grigne), 'version' (fichier d'une version plus récente).
 */
export function parseExport(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: 'json' };
  }
  if (!json || typeof json !== 'object' || json.app !== EXPORT_APP || !Array.isArray(json.recipes)) return { error: 'format' };
  const version = json.version ?? 1;
  if (typeof version !== 'number' || version > EXPORT_VERSION) return { error: 'version' };
  return { recipes: sanitizeRecipes(json.recipes), history: sanitizeHistory(json.history) };
}

// Empreinte du contenu d'une recette (nom, ingrédients, étapes, TB), sans les identifiants.
const fingerprint = (r) =>
  JSON.stringify([r.name.trim().toLowerCase(), r.ingredients.map((i) => [i.name.trim().toLowerCase(), i.qtyG]), (r.notes || '').trim(), typeof r.tb === 'number' ? r.tb : null]);

/**
 * Ajoute les recettes importées à celles qui existent, sans jamais en écraser une :
 * - une recette identique (même nom, mêmes ingrédients et quantités, mêmes étapes, même TB) est ignorée ;
 * - une recette dont l'identifiant est déjà pris reçoit un nouvel identifiant ;
 * - une recette différente qui porte un nom déjà pris est renommée « Nom (importée) ».
 * L'historique importé est ajouté (sans doublon d'identifiant), du plus récent au plus ancien, 20 au plus.
 */
export function mergeImport(current, imported, makeId) {
  const prints = new Set(current.recipes.map(fingerprint));
  const ids = new Set(current.recipes.map((r) => r.id));
  const names = new Set(current.recipes.map((r) => r.name.trim().toLowerCase()));
  const added = [];
  let skipped = 0;
  for (const r of imported.recipes) {
    const print = fingerprint(r);
    if (prints.has(print)) {
      skipped++;
      continue;
    }
    prints.add(print);
    let id = r.id;
    while (ids.has(id)) id = makeId();
    ids.add(id);
    let name = r.name;
    if (names.has(name.trim().toLowerCase())) {
      const base = `${name} (importée)`;
      name = base;
      for (let n = 2; names.has(name.trim().toLowerCase()); n++) name = `${base.slice(0, -1)} ${n})`;
    }
    names.add(name.trim().toLowerCase());
    added.push({ ...r, id, name });
  }
  const histIds = new Set(current.history.map((h) => h.id));
  const history = [...current.history, ...imported.history.filter((h) => !histIds.has(h.id))]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);
  return { recipes: [...current.recipes, ...added], history, added: added.length, skipped };
}
