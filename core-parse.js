import { toGrams } from './core-units.js';
import { uid } from './core-text.js';

const LEADING_QTY = /^([\d]+(?:[.,]\d+)?)(?:\s*\/\s*([\d]+(?:[.,]\d+)?))?\s*(kg|gr|g|ml|cl|l)\b\.?\s*(.+)$/i;
const TRAILING_QTY = /^(.+?)\s+([\d]+(?:[.,]\d+)?)(?:\s*\/\s*([\d]+(?:[.,]\d+)?))?\s*(kg|gr|g|ml|cl|l)\b\.?$/i;

function toIngredient(name, qtyRaw, altRaw, unitRaw) {
  const qty = parseFloat(qtyRaw.replace(',', '.'));
  const unit = unitRaw.toLowerCase();
  const alt = altRaw ? altRaw.replace(',', '.') : null;
  let label = name.trim();
  if (alt) label += ` (ou ${alt}${unit})`;
  if (!label || Number.isNaN(qty)) return null;
  return { id: uid(), name: label, qtyG: toGrams(qty, unit) };
}

/**
 * Analyse un texte de recette collé ou extrait d'un PDF.
 * Les lignes « 500 g farine » ou « farine 500 g » deviennent des ingrédients,
 * les autres lignes sont gardées comme notes.
 */
export function parseRecipeText(text) {
  const lines = String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const ingredients = [];
  const notesLines = [];
  for (const line of lines) {
    let ing = null;
    let m = line.match(LEADING_QTY);
    if (m) ing = toIngredient(m[4], m[1], m[2], m[3]);
    if (!ing) {
      m = line.match(TRAILING_QTY);
      if (m) ing = toIngredient(m[1], m[2], m[3], m[4]);
    }
    if (ing) ingredients.push(ing);
    else notesLines.push(line);
  }
  return { ingredients, notes: notesLines.join('\n') };
}
