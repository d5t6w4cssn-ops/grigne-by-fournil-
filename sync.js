// Synchronisation entre la copie de l'appareil et le cloud.
// Principe : la copie locale reste utilisable hors ligne ; chaque modification est envoyée au cloud
// après un court délai ; les changements venant d'un autre appareil sont repris automatiquement.
// Toutes les dépendances sont injectées : le module est testable sans navigateur ni Firebase.
import { mergeRecipes, mergeHistory, nextVersion } from './core-merge.js';
import { isNetworkError } from './cloud.js';

export const DEBOUNCE_MS = 800;
export const RETRY_MS = [5000, 15000, 60000];
/** Le document cloud est limité à 1 Mio : on s'arrête avant. */
export const MAX_BYTES = 900_000;

export function createSync({ cloud, uid, getData, applyData, readMeta, writeMeta, isEditing = () => false, setStatus = () => {}, now = Date.now, timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) } }) {
  let meta = readMeta();
  let changeGen = 0;
  let pushing = false;
  let stopped = false;
  let pulled = false;
  let timer = null;
  let editTimer = null;
  let retries = 0;
  let pendingRemote = null;
  let unwatch = null;

  const hasData = () => {
    const d = getData();
    return d.recipes.length > 0 || d.history.length > 0;
  };
  const save = (m) => {
    meta = m;
    writeMeta(m);
  };
  const clearTimer = () => {
    if (timer) timers.clear(timer);
    timer = null;
  };
  const schedule = (ms) => {
    if (stopped) return;
    clearTimer();
    timer = timers.set(() => {
      timer = null;
      push();
    }, ms);
  };
  const failed = (err) => {
    setStatus(isNetworkError(err) ? 'offline' : 'error');
    if (stopped) return;
    clearTimer();
    const wait = RETRY_MS[Math.min(retries, RETRY_MS.length - 1)];
    retries += 1;
    timer = timers.set(() => {
      timer = null;
      retry();
    }, wait);
  };

  async function push() {
    if (stopped || pushing) return;
    clearTimer();
    const d = getData();
    const data = { recipes: d.recipes, history: d.history };
    if (JSON.stringify(data).length > MAX_BYTES) {
      setStatus('toolarge');
      return;
    }
    pushing = true;
    setStatus('syncing');
    const gen = changeGen;
    const version = nextVersion(now(), meta.version);
    try {
      await cloud.push(uid, { ...data, updatedMs: version });
      const again = changeGen !== gen;
      save({ version, dirty: again });
      retries = 0;
      if (again) schedule(DEBOUNCE_MS);
      else setStatus('synced');
    } catch (err) {
      failed(err);
    } finally {
      pushing = false;
    }
  }

  function takeRemote(remote) {
    if (isEditing()) {
      // On ne change pas la liste pendant que l'utilisateur modifie une recette : on réessaie juste après.
      pendingRemote = remote;
      if (!editTimer) {
        editTimer = timers.set(() => {
          editTimer = null;
          const r = pendingRemote;
          pendingRemote = null;
          if (r && !stopped) takeRemote(r);
        }, 3000);
      }
      return;
    }
    if (meta.dirty) {
      const local = getData();
      applyData(mergeRecipes(local.recipes, remote.recipes), mergeHistory(local.history, remote.history));
      save({ version: remote.version, dirty: true });
      push();
    } else {
      applyData(remote.recipes, remote.history);
      save({ version: remote.version, dirty: false });
      setStatus('synced');
    }
  }

  /** Compare le cloud et l'appareil au démarrage. */
  async function reconcile() {
    setStatus('syncing');
    let remote;
    try {
      remote = await cloud.pull(uid);
    } catch (err) {
      failed(err);
      return;
    }
    pulled = true;
    retries = 0;
    if (remote === null) {
      if (meta.dirty || hasData()) {
        save({ version: meta.version, dirty: true });
        push();
      } else setStatus('synced');
    } else if (remote.version > meta.version || (!meta.dirty && !hasData() && (remote.recipes.length > 0 || remote.history.length > 0))) {
      // Cloud plus récent, ou copie de l'appareil vide/perdue alors que le cloud a des données : on reprend le cloud.
      takeRemote(remote);
    } else if (meta.dirty || remote.version < meta.version) {
      save({ version: meta.version, dirty: true });
      push();
    } else setStatus('synced');
  }

  function retry() {
    if (stopped) return;
    if (pulled) push();
    else reconcile();
  }

  return {
    async start() {
      await reconcile();
      if (stopped) return;
      unwatch = cloud.watch(
        uid,
        (remote, info) => {
          if (stopped || info.pending || info.fromCache || !remote || remote.version <= meta.version) return;
          takeRemote(remote);
        },
        () => {},
      );
    },
    /** À appeler après chaque modification faite par l'utilisateur. */
    localChanged() {
      if (stopped) return;
      changeGen += 1;
      save({ version: meta.version, dirty: true });
      setStatus('syncing');
      schedule(DEBOUNCE_MS);
    },
    /** Envoie tout de suite ce qui attend (fermeture de l'onglet, déconnexion). */
    flush() {
      if (meta.dirty && pulled) return push();
      return Promise.resolve();
    },
    /** Retour du réseau : on réessaie sans attendre. */
    retryNow() {
      if (meta.dirty || !pulled) retry();
    },
    stop() {
      stopped = true;
      clearTimer();
      if (editTimer) timers.clear(editTimer);
      if (unwatch) unwatch();
    },
    get meta() {
      return meta;
    },
  };
}
