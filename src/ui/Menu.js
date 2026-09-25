import { tr } from '../core/i18n.js';
import { FORMATIONS } from '../sim/formation.js';

// Platzwahl. Pfeiltasten/Klick wählen, Enter startet. Im Hintergrund läuft
// auf dem gewählten Platz ein KI-Spiel als Vorschau.
export class Menu {
  constructor(root, venues, { onSelect, onStart, onPool, onCareer, onCareerNew, onChallenges, onSettings }) {
    this.root = root;
    this.venues = venues;
    this.onSelect = onSelect;
    this.onStart = onStart;
    this.onPool = onPool;
    this.onCareer = onCareer;
    this.onCareerNew = onCareerNew;
    this.onChallenges = onChallenges;
    this.onSettings = onSettings;
    this.index = 0;
    root.innerHTML = `
      <div class="menu-panel">
        <h1>Sunday League</h1>
        <p class="sub">${tr('Kreisklasse-Fußball mit Vollamateuren', 'Grassroots football with real amateurs')}</p>
        <div class="career"></div>
        <p class="section">${tr('Freundschaftsspiel – Platz wählen:', 'Friendly – pick a pitch:')}</p>
        <div class="venues">${venues
          .map(
            (v, i) => `
          <button class="venue-card" data-i="${i}">
            <b>${v.pitch.name}</b>
            <span class="facts">${FORMATIONS[v.pitch.format].length} ${tr('gegen', 'v')} ${FORMATIONS[v.pitch.format].length} · ${v.pitch.surface.name}</span>
            <span class="tag">${v.tagline}</span>
          </button>`,
          )
          .join('')}</div>
        <p class="hint">${tr('← → Platz wählen · <b>Enter</b> Anstoß · <b>K</b> Karriere · <b>C</b> Challenges · <b>P</b> Spielerpool · <b>O</b> Einstellungen', '← → pick a pitch · <b>Enter</b> kick off · <b>K</b> career · <b>C</b> challenges · <b>P</b> player pool · <b>O</b> settings')}</p>
        <button class="pool-link">${tr('Spielerpool ansehen', 'Browse player pool')}</button>
        <button class="pool-link challenges-link">Challenges</button>
        <button class="pool-link settings-link">${tr('Einstellungen', 'Settings')}</button>
      </div>`;
    root.querySelector('.pool-link').addEventListener('click', () => this.onPool());
    root.querySelector('.challenges-link').addEventListener('click', () => this.onChallenges());
    root.querySelector('.settings-link').addEventListener('click', () => this.onSettings());
    root.querySelectorAll('.venue-card').forEach((el) => {
      el.addEventListener('mouseenter', () => this.select(Number(el.dataset.i)));
      el.addEventListener('click', () => this.start());
    });
    window.addEventListener('keydown', (e) => {
      if (!this.visible || this.paused) return;
      if (e.code === 'KeyP') this.onPool();
      else if (e.code === 'KeyC') this.onChallenges();
      else if (e.code === 'KeyO') this.onSettings();
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
