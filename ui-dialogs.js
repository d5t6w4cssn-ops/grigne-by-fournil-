// Boîtes de dialogue natives (<dialog>) : focus piégé, Échap et retour du focus gérés par le navigateur.
import { state, replaceAll, wipeAll } from './state.js';
import { sanitizeRecipes, sanitizeHistory } from './core-sanitize.js';
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
    const payload = {
      app: 'grigne',
      version: 1,
      exportedAt: new Date().toISOString(),
      recipes: state.recipes,
      history: state.history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grigne-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status(`Sauvegarde téléchargée : ${state.recipes.length} recette(s).`);
  });

  const importInput = byId('importFile');
  byId('importData').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    importInput.value = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('trop gros');
      const json = JSON.parse(await file.text());
      if (!json || json.app !== 'grigne') throw new Error('format');
      const recipes = sanitizeRecipes(json.recipes);
      const history = sanitizeHistory(json.history);
      if (!window.confirm(`Remplacer tes ${state.recipes.length} recette(s) actuelle(s) par les ${recipes.length} du fichier ?`)) return;
      replaceAll(recipes, history);
      onDataChanged();
      status(`Sauvegarde restaurée : ${recipes.length} recette(s).`);
    } catch {
      status("Ce fichier n'est pas une sauvegarde Grigne valide.");
    }
  });

  byId('wipeData').addEventListener('click', () => {
    if (!window.confirm('Effacer définitivement toutes tes recettes et ton historique, sur cet appareil et dans ton compte ?')) return;
    wipeAll();
    onDataChanged();
    status('Toutes tes données ont été effacées.');
  });
}
