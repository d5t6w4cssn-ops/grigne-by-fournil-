// Session : relie la connexion, les données de l'appareil, la synchronisation et l'affichage.
import { state, init, onLocalChange, applyRemote, replaceAll, resetMemory, isEditing } from './state.js';
import { setScope, takeLegacy, readSync, writeSync, deviceId } from './storage.js';
import { createSync } from './sync.js';
import { authMessage } from './cloud.js';
import { MAX_DEVICES } from './config.js';
import * as ui from './ui-auth.js';

export function createSession({ cloud, render }) {
  let current = null;
  let sync = null;
  let stopDevices = null;
  let notice = '';

  onLocalChange(() => sync?.localChanged());

  async function watchDevices(user) {
    const id = deviceId();
    try {
      await cloud.registerDevice(user.uid, id);
    } catch {
      return; // hors ligne : la limite sera appliquée à la prochaine connexion
    }
    if (current !== user) return;
    stopDevices = cloud.watchDevices(user.uid, id, () => {
      notice = `Ce compte vient d'être ouvert sur un autre appareil (${MAX_DEVICES} au maximum en même temps). Connecte-toi de nouveau pour reprendre ici.`;
      cloud.signOut();
    });
  }

  function enter(user) {
    current = user;
    setScope(user.uid);
    init();
    if (state.recipes.length === 0 && state.history.length === 0) {
      // Données de la bêta sans compte : reprises une seule fois, puis envoyées au compte.
      const legacy = takeLegacy();
      if (legacy) {
        replaceAll(legacy.recipes, legacy.history);
        writeSync({ version: 0, dirty: true });
      }
    }
    ui.setAccount(user.email);
    ui.setSyncStatus('');
    ui.setLoginMessage('');
    ui.clearPassword();
    ui.showScreen('app');
    render();
    sync = createSync({
      cloud,
      uid: user.uid,
      getData: () => ({ recipes: state.recipes, history: state.history }),
      applyData: (recipes, history) => {
        applyRemote(recipes, history);
        render();
      },
      readMeta: readSync,
      writeMeta: writeSync,
      isEditing,
      setStatus: ui.setSyncStatus,
    });
    sync.start();
    watchDevices(user);
  }

  function leave() {
    current = null;
    sync?.stop();
    sync = null;
    stopDevices?.();
    stopDevices = null;
    resetMemory();
    setScope('');
    ui.setSyncStatus('');
    ui.setAccount('');
    ui.showScreen('login');
    ui.setLoginMessage(notice);
    notice = '';
    ui.focusLogin();
  }

  async function login(email, password) {
    if (!email || !password) {
      ui.setLoginMessage('Saisis ton adresse e-mail et ton mot de passe.');
      return;
    }
    ui.setBusy(true);
    ui.setLoginMessage('');
    try {
      await cloud.signIn(email, password);
    } catch (err) {
      ui.setLoginMessage(authMessage(err));
    } finally {
      ui.setBusy(false);
      ui.clearPassword();
    }
  }

  async function forgot(email) {
    if (!email) {
      ui.setLoginMessage("Saisis d'abord ton adresse e-mail dans le champ ci-dessus.");
      return;
    }
    ui.setBusy(true);
    try {
      await cloud.resetPassword(email);
      ui.setLoginMessage("Si cette adresse correspond à un compte, un e-mail pour choisir un nouveau mot de passe vient d'être envoyé.", 'ok');
    } catch (err) {
      const generic = !['auth/invalid-email', 'auth/network-request-failed', 'auth/too-many-requests'].includes(err?.code);
      ui.setLoginMessage(
        generic ? "Si cette adresse correspond à un compte, un e-mail pour choisir un nouveau mot de passe vient d'être envoyé." : authMessage(err),
        generic ? 'ok' : 'error',
      );
    } finally {
      ui.setBusy(false);
    }
  }

  async function signOut() {
    // On laisse 3 secondes à l'envoi des dernières modifications, sans bloquer la déconnexion.
    await Promise.race([sync?.flush() ?? Promise.resolve(), new Promise((r) => setTimeout(r, 3000))]);
    await cloud.signOut();
  }

  ui.bindAuth({ onLogin: login, onForgot: forgot, onSignOut: signOut, onRetry: () => window.location.reload() });
  window.addEventListener('online', () => sync?.retryNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sync?.flush();
  });
  window.addEventListener('pagehide', () => sync?.flush());

  return {
    start() {
      cloud.onUser((user) => {
        if (user && current?.uid === user.uid) return;
        if (!user) {
          leave();
          return;
        }
        if (current) leave();
        enter(user);
      });
    },
  };
}
