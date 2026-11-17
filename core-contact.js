// Formulaire de contact : construit le lien mailto. Logique pure, sans DOM.

/** Sujets proposés : valeur du champ → début de l'objet du mail. */
export const CONTACT_SUBJECTS = {
  probleme: 'Un problème',
  question: 'Une question',
  idee: 'Une idée',
};

/** Vrai si l'adresse ressemble à une adresse e-mail (contrôle simple, pas une validation complète). */
export function isEmailSet(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Lien mailto pré-rempli. Renvoie null si l'adresse n'est pas configurée ou si le message est vide.
 * L'objet et le corps sont encodés : aucun caractère du message ne peut casser le lien.
 */
export function buildMailto(email, subjectKey, message) {
  const text = String(message ?? '').trim();
  if (!isEmailSet(email) || !text) return null;
  const subject = `Grigne : ${(CONTACT_SUBJECTS[subjectKey] || CONTACT_SUBJECTS.question).toLowerCase()}`;
  const body = `${text}\n\n—\nEnvoyé depuis Grigne`;
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
