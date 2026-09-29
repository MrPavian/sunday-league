import { tr } from '../core/i18n.js';
import { activeShouts, SHOUTS } from '../sim/coach.js';
import { answerCard } from '../sim/coachfeed.js';
import { matchMinute } from './Hud.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Trainer-Modus: unten vier Schnellbefehle (bleiben an, bis man sie wieder abschaltet),
// dazu Wechsel, Plan und Tempo. Darüber taucht ab und zu die Lagekarte des
// Co-Trainers auf: was gerade passiert und drei Möglichkeiten – große Knöpfe, ein
// Tipp genügt. Am PC: 1–4 Schnellbefehle, bei offener Karte 1–3 die Antworten.
export class ShoutBar {
  constructor(root, input) {
    this.root = root;
    this.input = input;
    this.card = null;
    root.innerHTML = `
      <p class="rotate-hint">${tr('Tipp: Handy quer halten – dann siehst du mehr vom Platz.', 'Tip: turn your phone sideways to see more of the pitch.')}</p>
      <section class="coach-card" hidden aria-live="polite"></section>
      <div class="shouts">${Object.entries(SHOUTS)
        .map(([id, s], i) => `<button data-shout="${id}" title="${esc(s.label)}"><kbd>${i + 1}</kbd>${s.short}</button>`)
        .join('')}</div>
      <div class="shout-tools">
        <button data-tap="sub">${tr('Wechsel', 'Sub')}</button>
        <button data-tap="plan">${tr('Plan', 'Plan')}</button>
        <button data-tap="tempo">${tr('Tempo', 'Tempo')}</button>
        <button data-tap="restart" class="end-only">${tr('Weiter', 'Continue')}</button>
        <button data-tap="menu" class="end-only">${tr('Menü', 'Menu')}</button>
      </div>`;
    this.cardEl = root.querySelector('.coach-card');
    root.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.preventDefault();
      if (b.dataset.answer != null) this.answer(b.dataset.answer === 'skip' ? null : Number(b.dataset.answer));
      else if (b.dataset.shout) this.input.shoutNow(b.dataset.shout);
      else if (b.dataset.tap === 'plan') this.onPlan?.();
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

  answer(index) {
    const m = this.match;
    if (!m?.coachCard) return;
    answerCard(m, m.coachTeam, index);
  }

  renderCard(m, card) {
    this.card = card;
    this.cardEl.hidden = !card;
    if (!card) return;
    const minute = matchMinute(m, card.t);
    this.cardEl.innerHTML = `
      <header><small>${tr(`${minute}. Minute`, `Minute ${minute}`)}</small><button class="skip" data-answer="skip" aria-label="${tr('Nichts ändern', 'No change')}">✕</button></header>
      <h3>⚠ ${esc(card.title)}</h3>
      <p>${esc(card.text)}</p>
      <div class="answers">${card.options.map((o, i) => `<button data-answer="${i}" class="${o.active ? 'active' : ''}"><kbd>${i + 1}</kbd>${esc(o.label)}</button>`).join('')}</div>
      <i class="timer"></i>`;
  }

  update(match) {
    if (this.root.hidden) return;
    this.match = match;
    // Nach dem Abpfiff gibt es nichts mehr zu entscheiden – die Karte darf nicht über dem Endbildschirm stehen.
    const card = match.phase === 'ended' ? null : match.coachCard ?? null;
    if (card !== this.card) this.renderCard(match, card);
    if (this.card) {
      const life = Math.max(14, match.duration * 0.07);
      this.cardEl.style.setProperty('--left', `${Math.max(0, 1 - (match.time - this.card.t) / life) * 100}%`);
    }
    const active = new Set(activeShouts(match));
    const hoarse = match.time - (match.lastShout ?? -9) < 1.5;
    for (const b of this.root.querySelectorAll('[data-shout]')) {
      b.classList.toggle('active', active.has(b.dataset.shout));
      b.classList.toggle('hoarse', hoarse);
    }
    this.root.classList.toggle('ended', match.phase === 'ended');
  }
}
