import { tr } from '../core/i18n.js';
import { stepMatch } from '../sim/match.js';
import { createCommentator, tickerMinute } from '../sim/commentary.js';

const hex = (n) => `#${(n ?? 0x888888).toString(16).padStart(6, '0')}`;
// Tempo: Spielsekunden pro echter Sekunde (1× ≈ eine Minute für das ganze Spiel).
const SPEEDS = [1, 3];

// Liveticker: Das eigene Spiel läuft simuliert im Zeitraffer, ein Kommentator
// beschreibt die Szenen. Wer keine Geduld hat, springt direkt zum Ergebnis.
export class Ticker {
  constructor(root) {
    this.root = root;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      if (t.dataset.action === 'speed') this.toggleSpeed();
      else if (t.dataset.action === 'skip') this.skip();
      else if (t.dataset.action === 'done') this.finish();
    });
    window.addEventListener('keydown', (e) => {
      if (this.root.hidden) return;
      if (e.code === 'Enter') {
        e.preventDefault();
        if (this.match?.phase === 'ended') this.finish();
        else this.skip();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.toggleSpeed();
      }
    });
  }

  // prepared: { match, home, away } aus prepareMatch; onDone wird nach „Weiter" gerufen.
  show(prepared, { title = '', onDone }) {
    this.match = prepared.match;
    this.onDone = onDone;
    this.title = title;
    this.speed = 0;
    this.acc = 0;
    this.shown = 0;
    this.commentator = createCommentator(this.match, (Math.random() * 1e6) | 0); // nicht m.rng – das Ergebnis bleibt unverändert
    this.root.hidden = false;
    this.render();
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  hide() {
    cancelAnimationFrame(this.raf);
    this.root.hidden = true;
  }

  toggleSpeed() {
    this.speed = (this.speed + 1) % SPEEDS.length;
    this.updateControls();
  }

  // Alles auf einmal durchrechnen – der Ticker zeigt danach das ganze Spiel.
  skip() {
    const m = this.match;
    while (m.phase !== 'ended') this.step();
    this.update();
  }

  finish() {
    if (this.match?.phase !== 'ended') return;
    const done = this.onDone;
    this.onDone = null;
    this.hide();
    done?.();
  }

  step() {
    const m = this.match;
    stepMatch(m, undefined, 1 / 60);
    this.commentator.feed(m.events);
    m.events.length = 0;
  }

  frame(now) {
    const m = this.match;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    // Ganzes Spiel in etwa 60 s bei 1×, 20 s bei 3×.
    this.acc += dt * (m.duration / 60) * SPEEDS[this.speed] * 60;
    while (this.acc >= 1 && m.phase !== 'ended') {
      this.step();
      this.acc -= 1;
    }
    this.update();
    if (m.phase !== 'ended') this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  render() {
    const m = this.match;
    const side = (t) => `<span class="team" style="--kit:${hex(m.teams[t].kit?.shirt)}"><i></i>${m.teams[t].name}</span>`;
    this.root.innerHTML = `
      <div class="ticker-panel">
        <header>
          <small>${this.title}</small>
          <div class="board">${side(0)}<b class="score">0 : 0</b>${side(1)}</div>
          <div class="clock"></div>
        </header>
        <ol class="lines" aria-live="polite"></ol>
        <footer></footer>
      </div>`;
    this.updateControls();
  }

  update() {
    const m = this.match;
    const lines = this.commentator.lines;
    const list = this.root.querySelector('.lines');
    // Neue Zeilen oben einfügen – das Neueste steht immer ganz oben.
    for (; this.shown < lines.length; this.shown++) {
      const l = lines[this.shown];
      const li = document.createElement('li');
      li.className = l.kind;
      li.innerHTML = `<span class="min">${l.minute}'</span><span class="txt"></span>`;
      li.querySelector('.txt').textContent = l.text;
      list.prepend(li);
    }
    this.root.querySelector('.score').textContent = `${m.score[0]} : ${m.score[1]}`;
    const clock = m.phase === 'ended' ? tr('Abpfiff', 'Full time') : m.phase === 'halftime' ? tr('Halbzeit', 'Half-time') : `${m.half}${tr('. HZ', 'H')} · ${tickerMinute(m)}'`;
    this.root.querySelector('.clock').textContent = clock;
    if (m.phase === 'ended' && !this.endShown) this.updateControls();
  }

  updateControls() {
    const m = this.match;
    const foot = this.root.querySelector('footer');
    if (!foot) return;
    this.endShown = m.phase === 'ended';
    if (this.endShown) {
      const st = m.stats.teams;
      const poss = st[0].possession + st[1].possession || 1;
      foot.innerHTML = `
        <p class="stats">${tr('Schüsse', 'Shots')} ${st[0].shots}:${st[1].shots} · ${tr('Ballbesitz', 'Possession')} ${Math.round((st[0].possession / poss) * 100)}:${Math.round((st[1].possession / poss) * 100)} % · ${tr('Fouls', 'Fouls')} ${st[0].fouls}:${st[1].fouls}</p>
        <button class="go" data-action="done">${tr('Weiter (Enter)', 'Continue (Enter)')}</button>`;
      return;
    }
    foot.innerHTML = `
      <button data-action="speed">${tr('Tempo', 'Speed')}: ${SPEEDS[this.speed]}× <small>(${tr('Leertaste', 'Space')})</small></button>
      <button data-action="skip">${tr('Zum Ergebnis (Enter)', 'Skip to result (Enter)')}</button>`;
  }
}
