import { tr } from '../core/i18n.js';
import { FORMATIONS } from '../sim/formation.js';
import { crestSVG } from './logo.js';

// Farbe des Untergrunds für den Kopfstreifen der Platzkarten.
const SURFACE_COLORS = { asphalt: '#4d4d4b', concrete: '#8a877f', parkGrass: '#5a8f40', ash: '#b0603c', grass: '#3f8a3c', hall: '#c89d62', artificial: '#2f7d3a' };
const kbd = (k) => `<kbd>${k}</kbd>`;

// Platzwahl. Pfeiltasten/Klick wählen, Enter startet. Im Hintergrund läuft
// auf dem gewählten Platz ein KI-Spiel als Vorschau.
export class Menu {
  constructor(root, venues, { onSelect, onStart, onPool, onCareer, onCareerNew, onChallenges, onSettings, onSaves, onStyle }) {
    this.onStyle = onStyle;
    this.root = root;
    this.venues = venues;
    this.onSelect = onSelect;
    this.onStart = onStart;
    this.onPool = onPool;
    this.onCareer = onCareer;
    this.onCareerNew = onCareerNew;
    this.onChallenges = onChallenges;
    this.onSettings = onSettings;
    this.onSaves = onSaves;
    this.index = 0;
    root.innerHTML = `
      <div class="menu-panel">
        <header class="hero">
          ${crestSVG(84)}
          <div>
            <h1>Sunday League</h1>
            <p class="sub">${tr('Kreisklasse-Fußball mit Vollamateuren', 'Grassroots football with real amateurs')}</p>
          </div>
        </header>
        <div class="career"></div>
        <p class="section">${tr('Freundschaftsspiel – Platz wählen', 'Friendly – pick a pitch')} <button class="style-toggle"></button></p>
        <div class="venues">${venues
          .map((v, i) => {
            const n = FORMATIONS[v.pitch.format].length;
            return `
          <button class="venue-card" data-i="${i}" style="--surf:${SURFACE_COLORS[v.pitch.surface.id] ?? '#3f8a3c'}">
            <span class="strip surf-${v.pitch.surface.id}"><em class="format">${n} ${tr('gegen', 'v')} ${n}</em></span>
            <b>${v.pitch.name}</b>
            <span class="facts">${v.pitch.surface.name}</span>
            <span class="tag">${v.tagline}</span>
          </button>`;
          })
          .join('')}</div>
        <p class="hint">${tr(
          `${kbd('←')}${kbd('→')} Platz · ${kbd('Enter')} Anstoß · ${kbd('K')} Karriere · ${kbd('C')} Challenges · ${kbd('P')} Spielerpool · ${kbd('L')} Spielstände · ${kbd('O')} Einstellungen · ${kbd('T')} Spielmodus`,
          `${kbd('←')}${kbd('→')} pitch · ${kbd('Enter')} kick off · ${kbd('K')} career · ${kbd('C')} challenges · ${kbd('P')} player pool · ${kbd('L')} saves · ${kbd('O')} settings · ${kbd('T')} play mode`,
        )}</p>
        <nav class="menu-links">
          <button class="pool-link">${tr('Spielerpool', 'Player pool')}</button>
          <button class="pool-link challenges-link">Challenges</button>
          <button class="pool-link saves-link">${tr('Spielstände', 'Saves')}</button>
          <button class="pool-link settings-link">${tr('Einstellungen', 'Settings')}</button>
        </nav>
      </div>`;
    root.querySelector('.pool-link').addEventListener('click', () => this.onPool());
    root.querySelector('.style-toggle').addEventListener('click', () => this.onStyle?.());
    root.querySelector('.challenges-link').addEventListener('click', () => this.onChallenges());
    root.querySelector('.settings-link').addEventListener('click', () => this.onSettings());
    root.querySelector('.saves-link').addEventListener('click', () => this.onSaves());
    root.querySelectorAll('.venue-card').forEach((el) => {
      el.addEventListener('mouseenter', () => this.select(Number(el.dataset.i)));
      el.addEventListener('click', () => this.start());
    });
    window.addEventListener('keydown', (e) => {
      if (!this.visible || this.paused) return;
      // Hotkeys öffnen Formulare – der Buchstabe soll nicht im ersten Eingabefeld landen.
      if (['KeyP', 'KeyC', 'KeyO', 'KeyK', 'KeyL', 'KeyT'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyT') this.onStyle?.();
      else if (e.code === 'KeyP') this.onPool();
      else if (e.code === 'KeyC') this.onChallenges();
      else if (e.code === 'KeyO') this.onSettings();
      else if (e.code === 'KeyL') this.onSaves();
      else if (e.code === 'KeyK') (this.saveInfo ? this.onCareer : this.onCareerNew)();
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.select(this.index - 1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.select(this.index + 1);
      else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.start();
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

  // Selbst spielen oder Trainer – gilt fürs Freundschaftsspiel (Taste T).
  setStyle(manager, touch = false) {
    const b = this.root.querySelector('.style-toggle');
    b.innerHTML = `${manager ? tr('Als Trainer an der Seitenlinie', 'As manager on the touchline') : tr('Selbst spielen', 'Play yourself')}${touch ? '' : ' <kbd>T</kbd>'}`;
    b.classList.toggle('manager', manager);
    b.hidden = touch; // auf dem Handy gibt es nur den Trainer
  }

  get visible() {
    return !this.root.hidden;
  }

  show(id) {
    this.root.hidden = false;
    const i = this.venues.findIndex((v) => v.id === id);
    this.select(i < 0 ? 0 : i, true);
  }

  hide() {
    this.root.hidden = true;
  }

  select(i, force = false) {
    const n = this.venues.length;
    const next = (i + n) % n;
    if (next === this.index && !force) return;
    this.index = next;
    this.root.querySelectorAll('.venue-card').forEach((el, k) => el.classList.toggle('active', k === next));
    this.onSelect(this.venues[next].id);
  }

  start() {
    // Das Enter, das das Menü schließt, darf nicht sofort im Spiel landen.
    requestAnimationFrame(() => this.onStart(this.venues[this.index].id));
  }
}
