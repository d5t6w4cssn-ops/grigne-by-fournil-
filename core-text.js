// Fonctions de texte pures (aucun accès au DOM).

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Échappe une valeur pour l'insérer dans du HTML ou dans un attribut entre guillemets. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

let counter = 0;
/** Identifiant court, unique pendant la session. */
export function uid() {
  counter += 1;
  return Math.random().toString(36).slice(2, 8) + counter.toString(36);
}
