// Fusion de deux jeux de données (appareil / cloud) quand les deux ont changé depuis la dernière synchronisation.
// Règle : on garde tout ce qui n'existe que d'un côté ; pour une même recette, la version de CET appareil gagne.
// Limite connue : une recette supprimée d'un côté et conservée de l'autre réapparaît.
const MAX_HISTORY = 20;

export function mergeRecipes(local, remote) {
  const ids = new Set(local.map((r) => r.id));
  return [...local, ...remote.filter((r) => !ids.has(r.id))];
}

export function mergeHistory(local, remote) {
  const ids = new Set(local.map((h) => h.id));
  return [...local, ...remote.filter((h) => !ids.has(h.id))]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY);
}

/** Version monotone : toujours strictement supérieure aux versions déjà vues. */
export function nextVersion(now, ...seen) {
  return Math.max(now, ...seen.map((v) => (Number.isFinite(v) ? v + 1 : 0)));
}

/** Liste d'appareils : ajoute l'appareil courant, retire les doublons, garde les `max` plus récents. */
export function registerDevice(list, id, now, max) {
  const others = (Array.isArray(list) ? list : []).filter((d) => d && typeof d.id === 'string' && d.id !== id);
  const next = [...others, { id, at: now }].sort((a, b) => a.at - b.at);
  return next.slice(Math.max(0, next.length - max));
}
