// Recettes d'exemple, proposées quand la bibliothèque est vide (jamais ajoutées toutes seules).
// Pourcentages de boulanger classiques, sur 1 kg de farine : faciles à relire et à adapter.
import { uid } from './core-text.js';

const EXAMPLES = [
  {
    name: 'Baguette de tradition (exemple)',
    tb: 56,
    // hydratation 70 %, sel 1,8 %, levure fraîche 0,4 % (pointage long)
    ingredients: [
      ['Farine de tradition T65', 1000],
      ['Eau', 700],
      ['Sel', 18],
      ['Levure fraîche', 4],
    ],
    notes: 'Autolyse 30 min (farine + eau).\nPétrissage lent, sel et levure en fin de frasage.\nPointage 2 h en bac, un rabat à 1 h.\nDivision à 350 g, détente 20 min, façonnage.\nApprêt 45 min à 1 h, cuisson 250 °C environ 22 min, avec buée.',
  },
  {
    name: 'Pain de campagne au levain (exemple)',
    tb: 56,
    // hydratation 70 %, levain liquide 20 %, sel 2 %, 20 % de seigle
    ingredients: [
      ['Farine T65', 800],
      ['Farine de seigle T170', 200],
      ['Eau', 700],
      ['Levain liquide', 200],
      ['Sel', 20],
    ],
    notes: 'Levain rafraîchi 4 à 6 h avant, bien actif.\nPétrissage lent, sel en fin.\nPointage 2 h 30 avec deux rabats.\nDivision, façonnage en boule ou en bâtard.\nApprêt 1 h 30 (ou une nuit au froid), cuisson 240 °C environ 40 min.',
  },
  {
    name: 'Brioche (exemple)',
    tb: 50,
    // œufs 60 %, beurre 50 %, sucre 12 %, levure 3 %, sel 2 %
    ingredients: [
      ['Farine T45', 1000],
      ['Œufs', 600],
      ['Beurre', 500],
      ['Sucre', 120],
      ['Levure fraîche', 30],
      ['Sel', 20],
    ],
    notes: "Pétrir farine, œufs, sucre, sel et levure jusqu'à décollement.\nIncorporer le beurre froid en morceaux, en fin de pétrissage.\nPointage 1 h, puis une nuit au froid.\nDivision, façonnage, apprêt 2 h à 26 °C.\nDorure, cuisson 170 °C environ 25 min (moule de 500 g).",
  },
];

/** Nouvelles recettes d'exemple, avec des identifiants neufs (au même format que les recettes saisies). */
export function makeExampleRecipes() {
  return EXAMPLES.map((r) => ({
    id: uid(),
    name: r.name,
    ingredients: r.ingredients.map(([name, qtyG]) => ({ id: uid(), name, qtyG })),
    notes: r.notes,
    tb: r.tb,
  }));
}
