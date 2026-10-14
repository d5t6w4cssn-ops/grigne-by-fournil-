// Écrans de connexion et barre de compte.
import { byId } from './ui-dom.js';

const SCREENS = ['screenLoading', 'screenLogin', 'screenFatal'];

/** Affiche un seul écran : 'loading' | 'login' | 'fatal' | 'app'. */
export function showScreen(name) {
  SCREENS.forEach((id) => {
    byId(id).hidden = id !== `screen${name[0].toUpperCase()}${name.slice(1)}`;
  });
  const app = name === 'app';
  byId('appArea').hidden = !app;
  byId('headerLinks').hidden = !app;
  byId('accountBar').hidden = !app;
}

export function setLoginMessage(text, kind = 'error') {
  const el = byId('loginMsg');
  el.textContent = text;
  el.dataset.kind = kind;
}

export function setBusy(busy) {
  byId('loginSubmit').disabled = busy;
  byId('forgotBtn').disabled = busy;
}

export function setAccount(email) {
  byId('accountEmail').textContent = email;
}

const STATUS_TEXT = {
  syncing: 'Synchronisation…',
  synced: 'Synchronisé',
  offline: 'Hors ligne : tes changements sont gardés sur cet appareil',
  error: 'Erreur de synchronisation : nouvel essai en cours',
  toolarge: 'Trop de données pour la synchronisation : supprime quelques recettes',
};
export function setSyncStatus(status) {
  const el = byId('syncStatus');
  el.textContent = STATUS_TEXT[status] || '';
  el.dataset.state = status || '';
}

export function bindAuth({ onLogin, onForgot, onSignOut, onRetry }) {
  byId('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    onLogin(byId('loginEmail').value.trim(), byId('loginPassword').value);
  });
  byId('forgotBtn').addEventListener('click', () => onForgot(byId('loginEmail').value.trim()));
  byId('signOutBtn').addEventListener('click', onSignOut);
  byId('retryLoad').addEventListener('click', onRetry);
}

export function clearPassword() {
  byId('loginPassword').value = '';
}
export function focusLogin() {
  const email = byId('loginEmail');
  (email.value ? byId('loginPassword') : email).focus();
}
