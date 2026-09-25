import { FORMATIONS } from '../sim/formation.js';

// Platzwahl. Pfeiltasten/Klick wählen, Enter startet. Im Hintergrund läuft
// auf dem gewählten Platz ein KI-Spiel als Vorschau.
export class Menu {
  constructor(root, venues, { onSelect, onStart, onPool, onCareer, onCareerNew }) {
    this.root = root;
    this.venues = venues;
    this.onSelect = onSelect;
    this.onStart = onStart;
    this.onPool = onPool;
    this.onCareer = onCareer;
    this.onCareerNew = onCareerNew;
    this.index = 0;
    root.innerHTML = `
      <div class="menu-panel">
        <h1>Sunday League</h1>
        <p class="sub">Kreisklasse-Fußball mit Vollamateuren</p>
        <div class="career"></div>
        <p class="section">Freundschaftsspiel – Platz wählen:</p>
        <div class="venues">${venues
          .map(
            (v, i) => `
          <button class="venue-card" data-i="${i}">
            <b>${v.pitch.name}</b>
            <span class="facts">${FORMATIONS[v.pitch.format].length} gegen ${FORMATIONS[v.pitch.format].length} · ${v.pitch.surface.name}</span>
            <span class="tag">${v.tagline}</span>
          </button>`,
          )
          .join('')}</div>
        <p class="hint">← → Platz wählen · <b>Enter</b> Anstoß · <b>K</b> Karriere · <b>P</b> Spielerpool</p>
        <button class="pool-link">Spielerpool ansehen</button>
      </div>`;
    root.querySelector('.pool-link').addEventListener('click', () => this.onPool());
    root.querySelectorAll('.venue-card').forEach((el) => {
      el.addEventListener('mouseenter', () => this.select(Number(el.dataset.i)));
      el.addEventListener('click', () => this.start());
    });
    window.addEventListener('keydown', (e) => {
      if (!this.visible || this.paused) return;
      if (e.code === 'KeyP') this.onPool();
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
      ? `<button data-c="continue">Karriere fortsetzen · ${saveInfo}</button><button data-c="new" class="secondary">Neue Karriere</button>`
      : '<button data-c="new">Karriere starten</button>';
    el.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => (b.dataset.c === 'continue' ? this.onCareer() : this.onCareerNew())),
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
