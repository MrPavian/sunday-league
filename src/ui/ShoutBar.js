import { tr } from '../core/i18n.js';
import { activeShouts, SHOUTS } from '../sim/coach.js';

// Trainer-Modus: Zurufe als große Knöpfe am unteren Rand – für Daumen gemacht,
// am PC gehen auch die Tasten 1–7. Dazu Auswechseln, Tempo und am Ende Weiter/Menü.
export class ShoutBar {
  constructor(root, input) {
    this.root = root;
    this.input = input;
    root.innerHTML = `
      <p class="rotate-hint">${tr('Tipp: Handy quer halten – dann siehst du mehr vom Platz.', 'Tip: turn your phone sideways to see more of the pitch.')}</p>
      <div class="shouts">${Object.entries(SHOUTS)
        .map(([id, s], i) => `<button data-shout="${id}"><kbd>${i + 1}</kbd>${s.short}</button>`)
        .join('')}</div>
      <div class="shout-tools">
        <button data-tap="sub">${tr('Wechsel', 'Sub')}</button>
        <button data-tap="tempo">${tr('Tempo', 'Tempo')}</button>
        <button data-tap="restart" class="end-only">${tr('Weiter', 'Continue')}</button>
        <button data-tap="menu" class="end-only">${tr('Menü', 'Menu')}</button>
      </div>`;
    root.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.preventDefault();
      if (b.dataset.shout) this.input.shoutNow(b.dataset.shout);
      else if (b.dataset.tap) this.input.tap(b.dataset.tap);
    });
    this.hide();
  }

  show() {
    this.root.hidden = false;
    document.body.classList.add('manager');
  }

  hide() {
    this.root.hidden = true;
    document.body.classList.remove('manager');
  }

  update(match) {
    if (this.root.hidden) return;
    const active = new Set(activeShouts(match));
    const hoarse = match.time - (match.lastShout ?? -9) < 1.5;
    for (const b of this.root.querySelectorAll('[data-shout]')) {
      b.classList.toggle('active', active.has(b.dataset.shout));
      b.classList.toggle('hoarse', hoarse);
    }
    this.root.classList.toggle('ended', match.phase === 'ended');
  }
}
