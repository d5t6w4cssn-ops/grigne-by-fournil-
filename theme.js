// Préférences d'affichage, mémorisées sur cet appareil :
// - thème clair / sombre : suit le téléphone par défaut ; le bouton lune / soleil impose un choix ;
// - « Lecture facile » : police OpenDyslexic et espacements plus grands.
// Script classique chargé dans <head> (sans defer) : le bon affichage est posé avant
// le premier rendu, sans flash.
(() => {
  const THEME_KEY = 'grigne-theme';
  const READ_KEY = 'grigne-lecture';
  const COLORS = { light: '#F5F0E6', dark: '#17130F' };
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const read = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null; // stockage indisponible (navigation privée stricte) : valeurs par défaut
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // le choix vaut au moins jusqu'au rechargement
    }
  };

  const savedTheme = read(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  if (read(READ_KEY) === 'facile') root.dataset.lecture = 'facile';

  const current = () => root.dataset.theme || (media.matches ? 'dark' : 'light');

  function sync() {
    const theme = current();
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    const readBtn = document.getElementById('readToggle');
    if (readBtn) readBtn.setAttribute('aria-pressed', String(root.dataset.lecture === 'facile'));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', COLORS[theme]);
  }

  media.addEventListener('change', sync);
  document.addEventListener('DOMContentLoaded', () => {
    sync();
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      write(THEME_KEY, next);
      sync();
    });
    document.getElementById('readToggle')?.addEventListener('click', () => {
      const on = root.dataset.lecture !== 'facile';
      if (on) root.dataset.lecture = 'facile';
      else delete root.dataset.lecture;
      write(READ_KEY, on ? 'facile' : 'standard');
      sync();
    });
  });
})();
