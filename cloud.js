// Pont entre l'application et Firebase (connexion e-mail / mot de passe + Firestore).
// Le paquet Firebase est auto-hébergé avec le site : aucun script chargé depuis un serveur tiers.
// Firestore : users/{uid}/data/main = { recipes, history, updatedMs } ; users/{uid}/data/devices = { list }.
import { FIREBASE_CONFIG, FIREBASE_SDK_URL, MAX_DEVICES } from './config.js';
import { sanitizeRecipes, sanitizeHistory } from './core-sanitize.js';
import { registerDevice } from './core-merge.js';

const toRemote = (d) => ({
  recipes: sanitizeRecipes(d?.recipes),
  history: sanitizeHistory(d?.history),
  version: Number.isFinite(d?.updatedMs) ? d.updatedMs : 0,
});
const toUser = (u) => (u ? { uid: u.uid, email: u.email || '' } : null);

export async function loadCloud(sdkOverride) {
  const s = sdkOverride || (await import(FIREBASE_SDK_URL));
  const app = s.initializeApp(FIREBASE_CONFIG);
  // Sans « popupRedirectResolver » : pas de connexion Google/Apple, donc aucun cadre ni script externe.
  const auth = s.initializeAuth(app, { persistence: [s.indexedDBLocalPersistence, s.browserLocalPersistence] });
  const db = s.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  const mainRef = (uid) => s.doc(db, 'users', uid, 'data', 'main');
  const devicesRef = (uid) => s.doc(db, 'users', uid, 'data', 'devices');

  return {
    onUser: (cb) => s.onAuthStateChanged(auth, (u) => cb(toUser(u))),
    signIn: (email, password) => s.signInWithEmailAndPassword(auth, email, password),
    signOut: () => s.signOut(auth),
    resetPassword: (email) => s.sendPasswordResetEmail(auth, email),

    /** Données du cloud, ou null s'il n'y en a pas encore. Lève une erreur si le cloud est injoignable. */
    async pull(uid) {
      const snap = await s.getDoc(mainRef(uid));
      return snap.exists() ? toRemote(snap.data()) : null;
    },
    push: (uid, data) => s.setDoc(mainRef(uid), JSON.parse(JSON.stringify(data))),
    /** Écoute les changements venant d'ailleurs. Renvoie la fonction d'arrêt. */
    watch(uid, onData, onError) {
      return s.onSnapshot(
        mainRef(uid),
        (snap) => onData(snap.exists() ? toRemote(snap.data()) : null, { pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache }),
        onError,
      );
    },

    /** Inscrit cet appareil ; au-delà de MAX_DEVICES, le plus ancien est écarté. */
    registerDevice(uid, id) {
      const ref = devicesRef(uid);
      return s.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        tx.set(ref, { list: registerDevice(snap.exists() ? snap.data().list : [], id, Date.now(), MAX_DEVICES) });
      });
    },
    /** Appelle onKicked si cet appareil n'est plus dans la liste (autre appareil connecté depuis). */
    watchDevices(uid, id, onKicked) {
      return s.onSnapshot(
        devicesRef(uid),
        (snap) => {
          if (snap.metadata.fromCache || snap.metadata.hasPendingWrites || !snap.exists()) return;
          const list = snap.data().list;
          if (Array.isArray(list) && !list.some((d) => d && d.id === id)) onKicked();
        },
        () => {},
      );
    },
  };
}

/** Message lisible pour une erreur de connexion. */
export function authMessage(err) {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'E-mail ou mot de passe incorrect.';
    case 'auth/invalid-email':
      return "Cette adresse e-mail n'est pas valide.";
    case 'auth/user-disabled':
      return "Ce compte est désactivé. Contacte la personne qui t'a donné l'accès.";
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Patiente quelques minutes puis réessaie.';
    case 'auth/network-request-failed':
      return 'Pas de connexion à internet. Réessaie une fois en ligne.';
    default:
      return 'Connexion impossible pour le moment. Réessaie dans un instant.';
  }
}

export const isNetworkError = (err) =>
  ['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(err?.code) ||
  (typeof navigator !== 'undefined' && navigator.onLine === false);
