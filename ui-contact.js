// Boîte « Nous écrire » : ouvre l'application mail avec un message pré-rempli.
// Aucune requête réseau : tout passe par un lien mailto.
import { CONTACT_EMAIL } from './config.js';
import { buildMailto, isEmailSet } from './core-contact.js';
import { byId } from './ui-dom.js';

export function setupContact() {
  const dialog = byId('contactDialog');
  const form = byId('contactForm');
  const message = byId('contactMessage');
  const status = byId('contactStatus');

  const open = () => {
    status.textContent = '';
    status.dataset.kind = '';
    message.removeAttribute('aria-invalid');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };
  document.querySelectorAll('[data-open-contact]').forEach((b) => b.addEventListener('click', open));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const say = (text, kind) => {
      status.textContent = text;
      status.dataset.kind = kind;
    };
    if (!message.value.trim()) {
      message.setAttribute('aria-invalid', 'true');
      say("Écris ton message avant de l'envoyer.", 'err');
      message.focus();
      return;
    }
    message.removeAttribute('aria-invalid');
    if (!isEmailSet(CONTACT_EMAIL)) {
      say("L'adresse de contact n'est pas encore configurée : ton message n'a pas été envoyé. Garde-le sous la main, on pourra bientôt le recevoir.", 'err');
      return;
    }
    const subject = form.querySelector('input[name="contactSubject"]:checked')?.value;
    const link = buildMailto(CONTACT_EMAIL, subject, message.value);
    say("Ton application mail s'ouvre avec le message prêt : il ne reste qu'à l'envoyer.", 'ok');
    window.location.href = link;
  });
}
