import { numVal, gramsOf } from './core-units.js';

/** Température de l'eau = base − (labo + farine). */
export function computeWaterTemp(state) {
  const tb = numVal(state.tb);
  const labo = numVal(state.labo);
  const farine = numVal(state.farine);
  if (tb === null || labo === null || farine === null) return null;
  return tb - (labo + farine);
}

/** Hydratation = eau ÷ farine × 100. */
export function computeHydration(state) {
  const f = gramsOf(state.farine, state.fUnit);
  const e = gramsOf(state.eau, state.eUnit);
  if (f !== null && f > 0 && e !== null) return { status: 'ok', totalG: f + e, percent: (e / f) * 100 };
  if (f !== null && f <= 0) return { status: 'flour-zero' };
  return { status: 'waiting' };
}

/** Produit en croix : si A correspond à B, C correspond à B × C ÷ A. */
export function computeCross(state) {
  const a = numVal(state.a);
  const b = numVal(state.b);
  const c = numVal(state.c);
  if (a === null || b === null || c === null) return { status: 'waiting' };
  if (a === 0) return { status: 'a-zero' };
  return { status: 'ok', value: (b * c) / a };
}
