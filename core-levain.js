import { numVal, gramsOf } from './core-units.js';

export const LEVAIN_PRESETS = [
  { id: '1-1-1', lev: 1, eau: 1, far: 1 },
  { id: '1-2-2', lev: 1, eau: 2, far: 2 },
  { id: '1-3-3', lev: 1, eau: 3, far: 3 },
  { id: '1-5-5', lev: 1, eau: 5, far: 5 },
  { id: '1-10-10', lev: 1, eau: 10, far: 10 },
  { id: 'custom', lev: null, eau: null, far: null },
];

/** Ratio levain / eau / farine choisi, ou null s'il est invalide. */
export function levainRatio(state) {
  if (state.preset === 'custom') {
    const l = numVal(state.cLev);
    const e = numVal(state.cEau);
    const f = numVal(state.cFar);
    if (l === null || e === null || f === null || l <= 0 || e < 0 || f < 0) return null;
    return { lev: l, eau: e, far: f };
  }
  const p = LEVAIN_PRESETS.find((x) => x.id === state.preset) ?? LEVAIN_PRESETS[0];
  return { lev: p.lev, eau: p.eau, far: p.far };
}

/**
 * Résultat d'un rafraîchi.
 * Renvoie { status: 'invalid' | 'waiting' } ou { status: 'ok', levG, eauG, farG, totG }.
 */
export function computeLevain(state) {
  const r = levainRatio(state);
  if (!r) return { status: 'invalid' };
  const q = gramsOf(state.qty, state.unit);
  if (q === null || q <= 0) return { status: 'waiting' };
  const sum = r.lev + r.eau + r.far;
  const levG = state.mode === 'have' ? q : (q * r.lev) / sum;
  const eauG = (levG * r.eau) / r.lev;
  const farG = (levG * r.far) / r.lev;
  return { status: 'ok', levG, eauG, farG, totG: levG + eauG + farG };
}
