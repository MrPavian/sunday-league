import { tr } from '../core/i18n.js';
import { crestSVG } from './logo.js';

const kbd = (k) => `<kbd>${k}</kbd>`;

// Hauptmenü des Managerspiels: Karriere (fortsetzen / neu), Spielstände, Einstellungen.
// Im Hintergrund läuft auf einem Platz ein KI-Spiel als Kulisse.
export class Menu {
  constructor(root, { onCareer, onCareerNew, onSettings, onSaves }) {
    this.root = root;
    this.onCareer = onCareer;
    this.onCareerNew = onCareerNew;
    this.onSettings = onSettings;
    this.onSaves = onSaves;
    root.innerHTML = `
      <div class="menu-panel">
        <header class="hero">
          ${crestSVG(84)}
          <div>
            <h1>Sunday League</h1>
            <p class="sub">${tr('Kreisklasse-Fußball mit Vollamateuren – du bist der Trainer', 'Grassroots football with real amateurs – you are the manager')}</p>
          </div>
        </header>
        <div class="career"></div>
        <nav class="menu-links">
          <button class="pool-link saves-link">${tr('Spielstände', 'Saves')}</button>
          <button class="pool-link settings-link">${tr('Einstellungen', 'Settings')}</button>
        </nav>
        <p class="hint">${tr(
          `${kbd('Enter')} / ${kbd('K')} Karriere · ${kbd('L')} Spielstände · ${kbd('O')} Einstellungen`,
          `${kbd('Enter')} / ${kbd('K')} career · ${kbd('L')} saves · ${kbd('O')} settings`,
        )}</p>
      </div>`;
    root.querySelector('.settings-link').addEventListener('click', () => this.onSettings());
    root.querySelector('.saves-link').addEventListener('click', () => this.onSaves());
    window.addEventListener('keydown', (e) => {
      if (!this.visible || this.paused) return;
      // Hotkeys öffnen Formulare – der Buchstabe soll nicht im ersten Eingabefeld landen.
      if (['KeyO', 'KeyK', 'KeyL'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyO') this.onSettings();
      else if (e.code === 'KeyL') this.onSaves();
      else if (e.code === 'KeyK' || e.code === 'Enter') {
        e.preventDefault();
        // Das Enter, das das Menü schließt, darf nicht sofort im nächsten Bildschirm landen.
        requestAnimationFrame(() => (this.saveInfo ? this.onCareer : this.onCareerNew)());
      }
    });
  }

  // Karriere-Buttons: fortsetzen (wenn gespeichert) oder neu anfangen.
  setCareer(saveInfo) {
    this.saveInfo = saveInfo;
    const el = this.root.querySelector('.career');
    el.innerHTML = saveInfo
      ? `<button data-c="continue">${tr('Karriere fortsetzen', 'Continue career')} · ${saveInfo}</button><button data-c="new" class="secondary">${tr('Neue Karriere', 'New career')}</button>`
      : `<button data-c="new">${tr('Karriere starten', 'Start career')}</button>`;
    el.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.c === 'continue') return this.onCareer();
        // Mit Spielstand erst nachfragen – direkt im Button, ohne Browser-Dialog.
        if (saveInfo && b.dataset.c === 'new') {
          b.dataset.c = 'new-confirm';
          b.textContent = tr('Wirklich? Alter Spielstand wird überschrieben', 'Sure? Your old save will be overwritten');
          b.classList.add('danger');
          return;
        }
        this.onCareerNew();
      }),
    );
  }

  get visible() {
    return !this.root.hidden;
  }

  show() {
    this.root.hidden = false;
  }

  hide() {
    this.root.hidden = true;
  }
}
