// Configuration publique du projet Firebase. Ces valeurs ne sont pas secrètes : elles sont visibles
// dans tout site utilisant Firebase. La protection des données repose sur les règles de sécurité
// Firestore (fichier firestore.rules), pas sur le secret de ces valeurs.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAKpa9mxRh3odXdRXpUmJ1AaAitD3bqIFo',
  authDomain: 'grigne-by-fournil.firebaseapp.com',
  projectId: 'grigne-by-fournil',
  appId: '1:202483513491:web:05acfbee07e237d3bc3566',
};

/** Nombre d'appareils connectés en même temps avec un même compte. Le plus ancien est déconnecté au-delà. */
export const MAX_DEVICES = 3;

/** Chemin du paquet Firebase auto-hébergé (relatif à ce fichier). */
export const FIREBASE_SDK_URL = new URL('./firebase.min.js', import.meta.url).href;
