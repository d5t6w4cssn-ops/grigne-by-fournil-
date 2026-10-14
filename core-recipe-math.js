import { toGrams, numVal } from './core-units.js';

/** Poids total de farine : additionne tous les ingrédients dont le nom contient « farine ». */
export function getFlourWeightG(recipe) {
  return recipe.ingredients
    .filter((ing) => ing.name.toLowerCase().includes('farine'))
    .reduce((s, ing) => s + ing.qtyG, 0);
}

/** Poids total de la recette de référence. */
export function getTotalG(recipe) {
  return recipe.ingredients.reduce((s, i) => s + i.qtyG, 0);
}

/** Poids de pâte voulu en mode « poids total » ou « pièces × poids ». null si rien d'exploitable. */
export function computeTargetG(calc) {
  if (calc.mode === 'total') {
    const q = numVal(calc.totalQty);
    return q !== null && q > 0 ? toGrams(q, calc.totalUnit) : null;
  }
  let sum = 0;
  let any = false;
  for (const pr of calc.pieceRows) {
    const c = numVal(pr.count);
    const w = numVal(pr.weight);
    if (c !== null && w !== null && c > 0 && w > 0) {
      sum += c * w;
      any = true;
    }
  }
  return any ? sum : null;
}

/**
 * Calcule le coefficient et le multiplicateur d'une recette.
 * Avec farine : base = recette ramenée à 1 kg de farine, coefficient = nombre de « recettes 1 kg farine ».
 * Sans farine : base = poids total de la recette.
 */
export function computeScaling(recipe, calc) {
  const referenceTotalG = getTotalG(recipe);
  const flourG = getFlourWeightG(recipe);
  const usesFlourBasis = flourG > 0;
  const scale1kg = usesFlourBasis ? 1000 / flourG : 1;
  const referenceBasisG = referenceTotalG * scale1kg;

  let coefficient;
  let targetG;
  if (calc.mode === 'farine') {
    const q = numVal(calc.flourQty);
    const flourInputG = q !== null && q > 0 ? toGrams(q, calc.flourUnit) : null;
    coefficient = flourInputG && usesFlourBasis ? flourInputG / 1000 : null;
    targetG = coefficient ? coefficient * referenceBasisG : null;
  } else {
    targetG = computeTargetG(calc);
    coefficient = targetG && referenceBasisG ? targetG / referenceBasisG : null;
  }
  const factor = coefficient ? coefficient * scale1kg : null;
  return { referenceTotalG, flourG, usesFlourBasis, scale1kg, referenceBasisG, coefficient, targetG, factor };
}
