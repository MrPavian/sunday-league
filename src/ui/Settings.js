import { getLang, LANGS, tr } from '../core/i18n.js';
import { ACTION_LABELS, REBINDABLE, bindingOf, keyName, resetBindings, setBinding } from '../input/Input.js';

// Einstellungen: Sprache, Ton, Grafik, Tempo, Trikots, Tastenbelegung. Beim allerersten Start
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
      else if (action === 'bind') {
        this.capturing = value;
        this.render();
      } else if (action === 'resetkeys') {
        resetBindings();
        this.h.onChange?.('keys');
        this.render();
      } else {
        this.h.onChange?.(action, value);
        this.render();
      }
    });
    root.addEventListener('input', (e) => {
      if (e.target.dataset.action === 'volume') this.h.onChange?.('volume', Number(e.target.value));
    });
    window.addEventListener('keydown', (e) => {
      if (this.root.hidden || this.firstRun) return;
      // Neue Taste abwarten: die nächste gedrückte Taste wird die Belegung.
      if (this.capturing) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.code !== 'Escape' && !['KeyO', 'KeyH', 'KeyM', 'KeyN', 'KeyG', 'KeyC', 'Enter', 'F2'].includes(e.code)) {
          setBinding(this.capturing, e.code);
          this.h.onChange?.('keys');
        }
        this.capturing = null;
        this.render();
        return;
      }
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
        <h4>${tr('Lautstärke', 'Volume')}</h4>
        <div class="choice"><input type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" data-action="volume" aria-label="${tr('Lautstärke', 'Volume')}"></div>
        <h4>${tr('Trikots', 'Kits')}</h4>
        <div class="choice">${toggle('safekits', !s.safeKits, tr('Vereinsfarben', 'Club colours'), tr('Farbenblind-sicher', 'Colour-blind safe'))}</div>
        <p class="hint">${tr('Blau gegen Orange mit hellen und dunklen Hosen – gut unterscheidbar auch bei Rot-Grün-Schwäche. Nur die Anzeige ändert sich.', 'Blue against orange with light and dark shorts – easy to tell apart even with red-green colour blindness. Only the display changes.')}</p>
        <h4>${tr('Tastenbelegung', 'Key bindings')}</h4>
        <div class="keys">${REBINDABLE.map((a) => `<span>${ACTION_LABELS[a]}</span><button class="${this.capturing === a ? 'active' : ''}" data-action="bind" data-value="${a}">${this.capturing === a ? tr('Taste drücken …', 'Press a key …') : [...new Set(bindingOf(a).map(keyName))].join(' / ')}</button>`).join('')}</div>
        <p class="hint">${tr('Klicken, dann die neue Taste drücken (Esc bricht ab). Ist die Taste schon belegt, tauschen beide. Gamepad bleibt unverändert.', 'Click, then press the new key (Esc cancels). If the key is already used, the two swap. The gamepad stays as it is.')} <button data-action="resetkeys">${tr('Standard wiederherstellen', 'Restore defaults')}</button></p>
      </div>`;
  }
}
