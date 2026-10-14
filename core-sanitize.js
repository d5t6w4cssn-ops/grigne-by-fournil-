// Validation stricte des données lues dans le stockage local ou importées.
// Objectif : une donnée corrompue ou modifiée à la main ne doit ni casser l'application
// ni y introduire de contenu inattendu.

const MAX_NAME = 200;
const MAX_NOTES = 10000;
const MAX_ITEMS = 500;

function str(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}
function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function sanitizeRecipes(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const r of list.slice(0, MAX_ITEMS)) {
    if (!r || typeof r !== 'object') continue;
    const name = str(r.name, MAX_NAME).trim();
    if (!name || !Array.isArray(r.ingredients)) continue;
    let id = str(r.id, 64);
    if (!id || seen.has(id)) id = `r${out.length}${Math.random().toString(36).slice(2, 8)}`;
    seen.add(id);
    const ingredients = [];
    for (const i of r.ingredients.slice(0, MAX_ITEMS)) {
      if (!i || typeof i !== 'object') continue;
      const iname = str(i.name, MAX_NAME).trim();
      const qtyG = num(i.qtyG);
      if (!iname || qtyG === null || qtyG < 0) continue;
      ingredients.push({ id: str(i.id, 64) || `i${ingredients.length}`, name: iname, qtyG });
    }
    if (ingredients.length === 0) continue;
    out.push({ id, name, ingredients, notes: str(r.notes, MAX_NOTES), tb: num(r.tb) ?? '' });
  }
  return out;
}

export function sanitizeHistory(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const h of list.slice(0, 20)) {
    if (!h || typeof h !== 'object') continue;
    const targetG = num(h.targetG);
    const timestamp = num(h.timestamp);
    if (targetG === null || timestamp === null) continue;
    const breakdown = Array.isArray(h.breakdown)
      ? h.breakdown
          .map((b) => (b && typeof b === 'object' ? { name: str(b.name, MAX_NAME), grams: num(b.grams) } : null))
          .filter((b) => b && b.grams !== null)
      : [];
    out.push({
      id: str(h.id, 64) || `h${out.length}`,
      timestamp,
      recipeName: str(h.recipeName, MAX_NAME),
      label: typeof h.label === 'string' ? h.label.slice(0, MAX_NAME) : null,
      targetG,
      coefficient: num(h.coefficient),
      basis: h.basis === 'farine' ? 'farine' : 'total',
      breakdown,
    });
  }
  return out;
}
