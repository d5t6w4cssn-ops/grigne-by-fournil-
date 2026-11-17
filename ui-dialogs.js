// Boîtes de dialogue natives (<dialog>) : focus piégé, Échap et retour du focus gérés par le navigateur.
import { state, replaceAll, wipeAll } from './state.js';
import { exportFileName, exportText, mergeImport, parseExport, MAX_IMPORT_BYTES } from './core-export.js';
import { uid } from './core-text.js';
import { byId } from './ui-dom.js';

function openModal(dialog) {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function wireDialog(dialog) {
  // Un clic sur le fond (hors de la feuille) ferme la boîte.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelectorAll('[data-close]').forEach((b) => {
    b.addEventListener('click', () => dialog.close());
  });
}

/** « 0 recette ajoutée », « 1 recette ajoutée », « 3 recettes ajoutées ». */
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export function setupDialogs(onDataChanged) {
  const guide = byId('guideDialog');
  const data = byId('dataDialog');
  wireDialog(guide);
  wireDialog(data);
  byId('openGuide').addEventListener('click', () => openModal(guide));
  byId('openData').addEventListener('click', () => {
    byId('dataStatus').textContent = '';
    openModal(data);
  });

  const status = (msg) => {
    byId('dataStatus').textContent = msg;
  };

  byId('exportData').addEventListener('click', () => {
    // Fichier fabriqué dans le navigateur : aucune requête réseau.
    const now = new Date();
    const blob = new Blob([exportText(state.recipes, state.history, now)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status(`Fichier téléchargé : ${plural(state.recipes.length, 'recette exportée', 'recettes exportées')}.`);
  });

  const importInput = byId('importFile');
  byId('importData').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    importInput.value = '';
    if (!file) return;
    const parsed = file.size > MAX_IMPORT_BYTES ? { error: 'format' } : parseExport(await file.text());
    if (parsed.error === 'version') {
      status("Ce fichier vient d'une version plus récente de Grigne : mets l'application à jour, puis réessaie.");
      return;
    }
    if (parsed.error) {
      status("Ce fichier n'est pas un fichier Grigne valide.");
      return;
    }
    const merged = mergeImport({ recipes: state.recipes, history: state.history }, parsed, uid);
    const historyChanged = merged.history.length !== state.history.length || merged.history.some((h, k) => h !== state.history[k]);
    if (merged.added > 0 || historyChanged) {
      replaceAll(merged.recipes, merged.history);
      onDataChanged();
    }
    const skipped = merged.skipped ? `, ${plural(merged.skipped, 'déjà présente (ignorée)', 'déjà présentes (ignorées)')}` : '';
    status(`Import terminé : ${plural(merged.added, 'recette ajoutée', 'recettes ajoutées')}${skipped}. Aucune recette existante n'a été remplacée.`);
  });

  byId('wipeData').addEventListener('click', () => {
    if (!window.confirm('Effacer définitivement toutes tes recettes et ton historique, sur cet appareil et dans ton compte ?')) return;
    wipeAll();
    onDataChanged();
    status('Toutes tes données ont été effacées.');
  });
}
