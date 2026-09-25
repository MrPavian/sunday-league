import { getLang, LANGS, tr } from '../core/i18n.js';

// Einstellungen: Sprache, Ton, Grafikeffekte, Spieltempo. Beim allerersten Start
// erscheint nur die Sprachwahl – zweisprachig, weil noch keine Sprache feststeht.
export class Settings {
  constructor(root) {
    this.root = root;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const { action, value } = t.dataset;
      if (action === 'lang') this.h.onLang?.(value);
      else if (action === 'back') this.h.onBack?.();
      else {
        this.h.onChange?.(action, value);
        this.render();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (this.root.hidden || this.firstRun) return;
      if (e.code === 'Escape' || e.code === 'KeyO') {
        e.stopPropagation();
        this.h.onBack?.();
      }
    });
  }

  // state: () => ({ muted, effects, tempo, tempos: [{ id, label }] })
  show(handlers, { firstRun = false } = {}) {
    this.h = handlers;
    this.firstRun = firstRun;
    this.root.hidden = false;
    this.render();
  }

  hide() {
    this.root.hidden = true;
  }

  render() {
    const lang = getLang();
    const langButtons = Object.entries(LANGS)
      .map(([id, name]) => `<button class="${!this.firstRun && lang === id ? 'active' : ''}" data-action="lang" data-value="${id}">${name}</button>`)
      .join('');
    if (this.firstRun) {
      this.root.innerHTML = `
        <div class="settings-panel first-run">
          <h1>Sunday League</h1>
          <p>Sprache wählen · Choose your language</p>
          <div class="choice big">${langButtons}</div>
          <p class="hint">Später jederzeit in den Einstellungen änderbar · You can change this later in the settings</p>
        </div>`;
      return;
    }
    const s = this.h.state();
    const toggle = (action, on, labelOn, labelOff) =>
      `<button class="${on ? 'active' : ''}" data-action="${action}" data-value="on">${labelOn}</button><button class="${on ? '' : 'active'}" data-action="${action}" data-value="off">${labelOff}</button>`;
    this.root.innerHTML = `
      <div class="settings-panel">
        <header><h2>${tr('Einstellungen', 'Settings')}</h2><button data-action="back">${tr('Zurück (Esc)', 'Back (Esc)')}</button></header>
        <h4>${tr('Sprache', 'Language')}</h4>
        <div class="choice">${langButtons}</div>
        <p class="hint">${tr('Das Spiel lädt kurz neu, dein Spielstand bleibt erhalten. Bereits geschriebene Chat- und Chronik-Einträge bleiben in der alten Sprache.', 'The game reloads briefly; your save is kept. Chat and chronicle entries already written stay in the old language.')}</p>
        <h4>${tr('Ton', 'Sound')}</h4>
        <div class="choice">${toggle('sound', !s.muted, tr('An', 'On'), tr('Aus', 'Off'))}</div>
        <h4>${tr('Grafikeffekte', 'Graphics effects')}</h4>
        <div class="choice">${toggle('effects', s.effects, tr('An', 'On'), tr('Aus (schneller)', 'Off (faster)'))}</div>
        <p class="hint">${tr('Kontaktschatten, Glühen, Vignette und Dithering. Auf langsamen Rechnern lieber aus. Im Spiel: Taste G.', 'Contact shadows, glow, vignette and dithering. Better off on slow computers. In a match: key G.')}</p>
        <h4>${tr('Spieltempo', 'Match tempo')}</h4>
        <div class="choice">${s.tempos.map((t, i) => `<button class="${s.tempo === i ? 'active' : ''}" data-action="tempo" data-value="${i}">${t.label.split(': ')[1] ?? t.label}</button>`).join('')}</div>
        <p class="hint">${tr('Im Spiel: Taste C.', 'In a match: key C.')}</p>
      </div>`;
  }
}
