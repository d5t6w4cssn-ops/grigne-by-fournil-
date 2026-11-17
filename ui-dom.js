// Petits utilitaires d'interface partagés par les écrans.
import { esc } from './core-text.js';
import { NNBSP } from './core-units.js';

const svg = (size, sw, path) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" aria-hidden="true" focusable="false">${path}</svg>`;

export const icons = {
  plus: (s = 16) => svg(s, 2, '<path d="M12 5v14M5 12h14"/>'),
  info: (s = 15) => svg(s, 1.8, '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  edit: (s = 15) => svg(s, 1.8, '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
  trash: (s = 15) =>
    svg(s, 1.8, '<path d="M3 6h18M8 6V4h8v2m-1 0v14a1 1 0 01-1 1H9a1 1 0 01-1-1V6h8z"/>'),
  check: (s = 15) => svg(s, 2, '<path d="M20 6L9 17l-5-5"/>'),
  file: (s = 18) =>
    svg(s, 1.6, '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  chevron: (s = 18) => svg(s, 1.8, '<path d="M6 9l6 6 6-6"/>'),
  scale: (s = 18) =>
    svg(
      s,
      1.6,
      '<path d="M4 21h16l-1.4-9.2A2 2 0 0 0 16.6 10H7.4a2 2 0 0 0-2 1.8z"/><circle cx="12" cy="15.5" r="2.6"/><path d="M12 15.5l1.2-1.2"/><path d="M7 10V8.5A1.5 1.5 0 0 1 8.5 7h7A1.5 1.5 0 0 1 17 8.5V10M9 4h6"/>',
    ),
  wheat: (s = 24) =>
    svg(
      s,
      1.5,
      '<path d="M12 22V7"/><path d="M12 7c0-2 .8-3.6 2-4.6M12 7c0-2-.8-3.6-2-4.6"/><path d="M12 11.5c-2.6 0-4.2-1.6-4.6-4 2.6 0 4.2 1.5 4.6 4zM12 11.5c2.6 0 4.2-1.6 4.6-4-2.6 0-4.2 1.5-4.6 4z"/><path d="M12 15.5c-2.6 0-4.2-1.6-4.6-4 2.6 0 4.2 1.5 4.6 4zM12 15.5c2.6 0 4.2-1.6 4.6-4-2.6 0-4.2 1.5-4.6 4z"/><path d="M12 19.5c-2.6 0-4.2-1.6-4.6-4 2.6 0 4.2 1.5 4.6 4zM12 19.5c2.6 0 4.2-1.6 4.6-4-2.6 0-4.2 1.5-4.6 4z"/>',
    ),
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

/** « 7,89 kg » → nombre et unité séparés (unité en plus petit), texte échappé. */
export function amount(text) {
  const i = text.lastIndexOf(NNBSP);
  if (i < 0) return esc(text);
  return `${esc(text.slice(0, i))}<small>${NNBSP}${esc(text.slice(i + 1))}</small>`;
}

/**
 * Le tampon : la signature de Grigne, pour le résultat principal d'un écran.
 * label : lu par les lecteurs d'écran avant la valeur ; top : texte en arc (majuscules) ;
 * value : texte affiché au centre, vide = en attente.
 */
export function stamp(label, top, value) {
  // plus le nombre est long, plus il est petit, pour rester dans l'anneau intérieur
  const digits = value ? value.split(NNBSP)[0].length : 1;
  const size = digits <= 2 ? '' : digits === 3 ? ' tampon--3' : digits === 4 ? ' tampon--4' : ' tampon--5';
  return `
    <div class="tampon${value ? size : ' tampon--vide'}">
      <span class="sr-only">${esc(label)}</span>
      <span class="tampon-v"><span>${value ? amount(value) : '—'}</span></span>
      <span class="tampon-fond" aria-hidden="true"></span>
      <svg class="tampon-anneaux" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle class="anneau anneau--fort" cx="60" cy="60" r="57"/>
        <circle class="anneau" cx="60" cy="60" r="53.5"/>
        <circle class="anneau" cx="60" cy="60" r="38"/>
        <circle class="etoile" cx="13.5" cy="60" r="1.8"/><circle class="etoile" cx="106.5" cy="60" r="1.8"/>
      </svg>
      <svg class="tampon-texte" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <defs>
          <path id="tamponHaut" d="M16 60a44 44 0 0 1 88 0"/>
          <path id="tamponBas" d="M10 60a50 50 0 0 0 100 0"/>
        </defs>
        <text><textPath href="#tamponHaut" startOffset="50%" text-anchor="middle">${esc(top)}</textPath></text>
        <text><textPath href="#tamponBas" startOffset="50%" text-anchor="middle">GRIGNE</textPath></text>
      </svg>
    </div>`;
}

/** Carte résultat des outils : tampon sur le coin, petit titre, titre, puis le contenu (HTML déjà échappé). */
export function resultCard({ stampLabel, stampTop, value, kicker, title, body = '' }) {
  return `
    <div class="result-card result-card--tool">
      ${stamp(stampLabel, stampTop, value)}
      <p class="result-k">${esc(kicker)}</p>
      <p class="result-title result-title--tool">${esc(title)}</p>
      ${body}
    </div>`;
}

/** Message d'attente ou d'erreur sous le titre d'une carte résultat. */
export function waitLine(text, kind = 'wait') {
  return `<p class="result-wait result-wait--${kind}">${esc(text)}</p>`;
}

/**
 * Champ « quantité + unité kg/g » : un grand cadre avec l'étiquette en haut,
 * la valeur en grand et l'unité à droite.
 * onValue(v) et onUnit(u) sont appelés à chaque changement.
 */
export function qtyField(parent, labelText, value, unit, onValue, onUnit, placeholder) {
  const id = nextId('qty');
  const box = el('div', 'field-box');
  box.innerHTML =
    `<label class="field-box-k" for="${id}">${esc(labelText)}</label>` +
    `<div class="field-box-row"><input id="${id}" type="number" inputmode="decimal" step="any" min="0" placeholder="${esc(placeholder || '')}" value="${esc(value)}">` +
    (unit
      ? `<select aria-label="Unité"><option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option><option value="g" ${unit === 'g' ? 'selected' : ''}>g</option></select>`
      : '') +
    `</div>`;
  box.querySelector('input').oninput = (e) => onValue(e.target.value);
  if (unit) box.querySelector('select').onchange = (e) => onUnit(e.target.value);
  parent.appendChild(box);
}

/** Zone de résultat annoncée par les lecteurs d'écran à chaque mise à jour. */
export function resultMount(id) {
  const node = el('div', 'result-mount');
  node.id = id;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  return node;
}
