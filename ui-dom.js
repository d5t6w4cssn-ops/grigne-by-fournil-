// Petits utilitaires d'interface partagés par les écrans.
import { esc } from './core-text.js';

const svg = (size, sw, path) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" aria-hidden="true" focusable="false">${path}</svg>`;

export const icons = {
  plus: (s = 16) => svg(s, 2, '<path d="M12 5v14M5 12h14"/>'),
  info: (s = 15) => svg(s, 1.8, '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  edit: (s = 15) => svg(s, 1.8, '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
  trash: (s = 15) =>
    svg(s, 1.8, '<path d="M3 6h18M8 6V4h8v2m-1 0v14a1 1 0 01-1 1H9a1 1 0 01-1-1V6h8z"/>'),
  check: (s = 15) => svg(s, 2, '<path d="M20 6L9 17l-5-5"/>'),
  paste: (s = 14) =>
    svg(
      s,
      1.8,
      '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>',
    ),
};

let idCounter = 0;
/** Identifiant unique pour relier une étiquette à son champ. */
export function nextId(prefix = 'f') {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function byId(id) {
  return document.getElementById(id);
}

/** Crée un élément avec une classe et un texte (texte inséré en tant que texte, jamais en HTML). */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Paragraphe d'introduction d'un onglet. */
export function intro(parent, text) {
  parent.appendChild(el('p', 'intro', text));
}

/**
 * Champ « quantité + unité kg/g » avec son étiquette.
 * onValue(v) et onUnit(u) sont appelés à chaque changement.
 */
export function qtyField(parent, labelText, value, unit, onValue, onUnit, placeholder) {
  const id = nextId('qty');
  const label = el('label', 'field-label', labelText);
  label.htmlFor = id;
  parent.appendChild(label);
  const row = el('div', 'qty-row qty-row--spaced');
  row.innerHTML =
    `<input id="${id}" type="number" inputmode="decimal" step="any" min="0" placeholder="${esc(placeholder || '')}" value="${esc(value)}">` +
    (unit
      ? `<select aria-label="Unité"><option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option><option value="g" ${unit === 'g' ? 'selected' : ''}>g</option></select>`
      : '');
  row.querySelector('input').oninput = (e) => onValue(e.target.value);
  if (unit) row.querySelector('select').onchange = (e) => onUnit(e.target.value);
  parent.appendChild(row);
}

/** Zone de résultat annoncée par les lecteurs d'écran à chaque mise à jour. */
export function resultMount(id) {
  const node = el('div', 'result-mount');
  node.id = id;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  return node;
}

/** Tableau à une seule ligne (titre + valeur). */
export function singleResult(title, value) {
  return `<div class="result-table"><div class="result-total"><span>${esc(title)}</span><span class="amt">${esc(value)}</span></div></div>`;
}
