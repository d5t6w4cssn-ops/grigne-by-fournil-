// Conversions et formats numériques purs.

const UNIT_TO_GRAMS = { g: 1, kg: 1000, ml: 1, l: 1000, cl: 10, '': 1 };

/** Convertit une quantité en grammes (1 ml = 1 g). Unité inconnue : traitée comme des grammes. */
export function toGrams(qty, unit) {
  return qty * (UNIT_TO_GRAMS[unit] ?? 1);
}

/** Lit un nombre saisi (virgule ou point). Renvoie null si illisible. */
export function numVal(value) {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

/** Quantité saisie convertie en grammes ; null si vide, illisible ou négative. */
export function gramsOf(value, unit) {
  const n = numVal(value);
  return n !== null && n >= 0 ? toGrams(n, unit) : null;
}

/** « 1250 » → « 1.25 kg », « 350 » → « 350 g ». */
export function formatGrams(g) {
  if (g >= 1000) {
    const kg = g / 1000;
    const s = kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `${s} kg`;
  }
  return `${Math.round(g * 10) / 10} g`;
}

/** Arrondi à `dec` décimales (1 par défaut) ; « — » si le nombre est absent ou infini. */
export function fmtNum(n, dec) {
  if (n === null || !Number.isFinite(n)) return '—';
  const d = dec === undefined ? 1 : dec;
  return String(Math.round(n * 10 ** d) / 10 ** d);
}
