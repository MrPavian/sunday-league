import { tr } from '../core/i18n.js';
import { activeShouts } from '../sim/coach.js';
import { answerCard } from '../sim/coachfeed.js';
import { ORDERS } from '../sim/commands.js';
import { ORDER_GROUPS, orderOf } from '../sim/plan.js';
import { chanceStats } from '../sim/report.js';
import { tacticLabel } from '../sim/tactics.js';
import { button, esc, haptic, icon, Sheet, versus } from './ds.js';
import { halfLabel, matchMinute } from './Hud.js';
import { chatCount, coachChat } from './benchChat.js';

// Trainer-Modus (UI 2.0): Das Spielfeld steht im Vordergrund. Unten nur drei Knöpfe –
// TAKTIK (Blatt mit Tafel, Zurufen, Befehlen; das Spiel steht), WECHSEL (Wechseltafel) und
// INFO (Spielstand, Statistik, Tempo, Ton; das Spiel läuft weiter) – daneben als kleine Chips,
// welche Befehle gerade gelten. Darüber taucht ab und zu die Lagekarte des Co-Trainers auf.
// Tastatur unverändert: 1–4 Zurufe, bei offener Karte 1–3 die Antworten.
export class ShoutBar {
  constructor(root, input) {
    this.root = root;
    this.input = input;
    this.card = null;
    this.chipKey = '';
    root.innerHTML = `
      <p class="rotate-hint">${tr('Tipp: Handy quer halten – dann siehst du mehr vom Platz.', 'Tip: turn your phone sideways to see more of the pitch.')}</p>
      <section class="coach-card" hidden aria-live="polite"></section>
      <div class="hud-dock">
        <div class="hud-chips" aria-label="${tr('Aktive Befehle', 'Active orders')}"></div>
        <div class="hud-actions">
          <button class="hud-btn" data-tap="plan">${icon('team', 20)}<span>${tr('Taktik', 'Tactics')}</span></button>
          <button class="hud-btn" data-tap="sub">${icon('exit', 20)}<span>${tr('Wechsel', 'Subs')}</span></button>
          <button class="hud-btn" data-tap="info">${icon('season', 20)}<span>${tr('Info', 'Info')}</span></button>
          <button class="hud-btn comm" data-tap="comm" aria-label="${tr('Kommunikation: Co-Trainer', 'Communication: assistant')}">${icon('phone', 20)}<span>${tr('Co-Trainer', 'Assistant')}</span><b class="ui-badge" hidden></b></button>
          <button data-tap="restart" class="hud-btn end-only go">${tr('Weiter', 'Continue')}</button>
          <button data-tap="menu" class="hud-btn end-only">${tr('Menü', 'Menu')}</button>
        </div>
      </div>`;
    this.cardEl = root.querySelector('.coach-card');
    this.chipsEl = root.querySelector('.hud-chips');
    root.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.preventDefault();
      if (b.dataset.answer != null) {
        this.answer(b.dataset.answer === 'skip' ? null : Number(b.dataset.answer));
        haptic('confirm');
      } else if (b.dataset.tap === 'plan') this.onPlan?.();
      else if (b.dataset.tap === 'info') this.openInfo();
      else if (b.dataset.tap === 'comm') this.openComm();
      else if (b.dataset.tap) this.input.tap(b.dataset.tap);
    });
    this.info = typeof document !== 'undefined' ? new Sheet({ id: 'info-sheet', onClose: () => clearInterval(this.infoTimer) }) : null;
    // KOMMUNIKATION: Verlauf mit dem Co-Trainer. Das Spiel läuft weiter (wie INFO).
    this.comm = typeof document !== 'undefined' ? new Sheet({ id: 'comm-sheet', onClose: () => clearInterval(this.commTimer) }) : null;
    this.comm?.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-answer]');
      if (!b) return;
      this.answer(b.dataset.answer === 'skip' ? null : Number(b.dataset.answer));
      haptic('confirm');
      this.refreshComm();
    });
    this.titles = new Map();
    this.seen = 0;
    this.info?.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-info]');
      if (!b) return;
      this.input.tap(b.dataset.info); // Tempo / Ton laufen über die Eingabe wie die Tasten
      setTimeout(() => this.refreshInfo(), 250);
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
    this.info?.close();
    this.comm?.close();
  }

  answer(index) {
    const m = this.match;
    if (!m?.coachCard) return;
    answerCard(m, m.coachTeam, index);
  }

  // INFO: alles, was man nachschauen, aber nicht dauernd sehen muss. Wird beim Öffnen und
  // danach einmal pro Sekunde neu geschrieben – nie pro Bild.
  openInfo() {
    if (!this.info || !this.match) return;
    this.info.open({ title: tr('Spielinfo', 'Match info'), body: this.infoBody() });
    clearInterval(this.infoTimer);
    this.infoTimer = setInterval(() => (this.info.isOpen ? this.refreshInfo() : clearInterval(this.infoTimer)), 1000);
  }

  refreshInfo() {
    if (this.info?.isOpen && this.match) this.info.update(this.infoBody());
  }

  infoBody() {
    const m = this.match;
    const st = m.stats.teams;
    const poss = st[0].possession + st[1].possession || 1;
    const ch = m.log ? [chanceStats(m, 0), chanceStats(m, 1)] : null;
    const rows = [
      versus(st[0].shots, tr('Schüsse', 'Shots'), st[1].shots),
      ch ? versus(ch[0].onTarget, tr('Aufs Tor', 'On target'), ch[1].onTarget) : '',
      ch ? versus(ch[0].big, tr('Großchancen', 'Big chances'), ch[1].big) : '',
      versus(`${Math.round((st[0].possession / poss) * 100)} %`, tr('Ballbesitz', 'Possession'), `${Math.round((st[1].possession / poss) * 100)} %`),
      versus(st[0].fouls, tr('Fouls', 'Fouls'), st[1].fouls),
      m.pitch.boundary === 'lines' ? versus(st[0].corners, tr('Ecken', 'Corners'), st[1].corners) : '',
    ].join('');
    const team = m.coachTeam ?? 0;
    const orders = ORDER_GROUPS.map((g) => orderOf(m, team, g) && ORDERS[`${g}:${orderOf(m, team, g)}`]?.label).filter(Boolean);
    const [a, b] = m.teams;
    return `
      <div class="info-score"><span>${esc(a.short ?? a.name)}</span><b class="t-score">${m.score[0]} : ${m.score[1]}</b><span>${esc(b.short ?? b.name)}</span></div>
      <p class="t-2 info-sub">${halfLabel(m)} · ${matchMinute(m, m.time)}' · ${esc(m.pitch.name)} · ${esc(m.pitch.surface.name)}${m.referee ? ` · ${tr('Schiri', 'Referee')}: ${esc(m.referee.name)}` : ''}</p>
      <div class="ui-stack tight">${rows}</div>
      <p class="ui-section-title">${tr('Aufstellung & Befehle', 'Shape & orders')}</p>
      <p class="t-2">${m.teams.map((t, i) => `${esc(t.short ?? t.name)}: ${tacticLabel(m.plan?.[i], m.pitch.format)}`).join(' – ')}</p>
      <div class="ui-chips">${orders.length ? orders.map((o) => `<span class="ui-chip">${o}</span>`).join('') : `<span class="ui-chip plain">${tr('keine Befehle', 'no orders')}</span>`}</div>
      <p class="ui-section-title">${tr('Anzeige', 'Display')}</p>
      <div class="ui-row">${button(tr('Tempo wechseln', 'Change tempo'), { 'data-info': 'tempo' })}${button(tr('Ton an/aus', 'Sound on/off'), { 'data-info': 'mute' })}</div>`;
  }

  openComm() {
    if (!this.comm || !this.match) return;
    this.comm.open({ title: tr('Co-Trainer', 'Assistant coach'), body: this.commBody() });
    this.markSeen();
    this.scrollComm();
    clearInterval(this.commTimer);
    this.commTimer = setInterval(() => (this.comm.isOpen ? this.refreshComm() : clearInterval(this.commTimer)), 1000);
  }

  refreshComm() {
    if (!this.comm?.isOpen || !this.match) return;
    const last = this.commHtml;
    const html = this.commBody();
    if (html === last) return;
    this.comm.update(html);
    this.markSeen();
    this.scrollComm();
  }

  scrollComm() {
    const body = this.comm.el.querySelector('.body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  markSeen() {
    this.seen = chatCount(this.match);
    this.renderBadge();
  }

  renderBadge() {
    const n = this.match ? chatCount(this.match) - this.seen : 0;
    const badge = this.root.querySelector('.comm .ui-badge');
    if (!badge || badge.textContent === String(n)) return;
    badge.textContent = String(n);
    badge.hidden = n <= 0;
  }

  commBody() {
    const m = this.match;
    const list = coachChat(m, this.titles);
    const bubble = (e) => {
      if (e.kind === 'card')
        return `<div class="bc-msg co${e.pending ? ' pending' : ''}"><small>${e.min}' · ${tr('Co-Trainer', 'Assistant')}</small><b>${esc(e.title)}</b>${e.text ? `<span>${esc(e.text)}</span>` : ''}
          ${e.pending ? `<div class="bc-answers">${e.options.map((o, i) => `<button class="ui-btn${i === 0 ? ' primary' : ''}" data-answer="${i}">${esc(o)}</button>`).join('')}<button class="ui-btn ghost" data-answer="skip">${tr('Nichts ändern', 'No change')}</button></div>` : ''}</div>`;
      if (e.kind === 'answer') return `<div class="bc-msg me"><small>${e.min}' · ${tr('Du', 'You')}</small><span>${esc(e.text)}</span></div>`;
      if (e.kind === 'missed') return `<p class="bc-note">${tr('Keine Antwort – alles bleibt, wie es ist.', 'No answer – everything stays as it is.')}</p>`;
      return `<div class="bc-msg co follow ${e.result}"><small>${tr('Co-Trainer', 'Assistant')} · ${e.result === 'better' ? tr('besser', 'better') : tr('nicht besser', 'not better')}</small><span>${esc(e.text)}</span></div>`;
    };
    this.commHtml = `<div class="bc-chat" aria-live="polite">${list.length ? list.map(bubble).join('') : `<p class="bc-note">${tr('Noch ruhig an der Linie. Meldet sich der Co-Trainer, steht es hier.', 'Quiet on the touchline so far. When your assistant speaks up, it shows here.')}</p>`}</div>`;
    return this.commHtml;
  }

  renderCard(m, card) {
    this.card = card;
    this.cardEl.hidden = !card;
    if (!card) return;
    this.titles.set(card.t, { title: card.title, text: card.text });
    haptic('message');
    const minute = matchMinute(m, card.t);
    // Ebene 1: Lage (groß). Ebene 2: ein Satz. Dann die Entscheidung – große Knöpfe, Ignorieren klein.
    this.cardEl.innerHTML = `
      <header><span class="cc-min">${minute}'</span><span class="t-cap">${tr('Co-Trainer', 'Assistant')}</span>
        <button class="skip" data-answer="skip" aria-label="${tr('Nichts ändern', 'No change')}">${tr('Ignorieren', 'Ignore')}</button></header>
      <h3>${esc(card.title)}</h3>
      <p>${esc(card.text)}</p>
      <div class="answers" style="--n:${card.options.length}">${card.options.map((o, i) => `<button data-answer="${i}" class="${o.active ? 'active' : ''}${i === 0 ? ' first' : ''}"><kbd>${i + 1}</kbd>${esc(o.label)}</button>`).join('')}</div>
      <i class="timer"></i>`;
  }

  // Aktive Befehle als Chips – nur neu schreiben, wenn sich etwas geändert hat.
  renderChips(match) {
    const team = match.coachTeam ?? 0;
    const shouting = new Set(activeShouts(match));
    const labels = ORDER_GROUPS.map((g) => orderOf(match, team, g) && { g, label: ORDERS[`${g}:${orderOf(match, team, g)}`]?.label }).filter((x) => x?.label);
    const key = labels.map((x) => x.label).join('|') + [...shouting].join();
    if (key === this.chipKey) return;
    this.chipKey = key;
    this.chipsEl.innerHTML = labels.slice(0, 4).map((x) => `<span class="ui-chip">${esc(x.label)}</span>`).join('') + (labels.length > 4 ? `<span class="ui-chip plain">+${labels.length - 4}</span>` : '');
  }

  update(match) {
    if (this.root.hidden) return;
    if (match !== this.match) {
      this.titles = new Map();
      this.seen = 0;
    }
    this.match = match;
    const sec = Math.floor(match.time);
    if (sec !== this.badgeSec) {
      this.badgeSec = sec;
      this.renderBadge();
    }
    // Nach dem Abpfiff gibt es nichts mehr zu entscheiden – die Karte darf nicht über dem Endbildschirm stehen.
    const card = match.phase === 'ended' ? null : match.coachCard ?? null;
    if (card !== this.card) this.renderCard(match, card);
    if (this.card) {
      const life = Math.max(14, match.duration * 0.07);
      this.cardEl.style.setProperty('--left', `${Math.max(0, 1 - (match.time - this.card.t) / life) * 100}%`);
    }
    this.renderChips(match);
    const ended = match.phase === 'ended';
    if (ended !== this.ended) {
      this.ended = ended;
      this.root.classList.toggle('ended', ended);
      if (ended) {
        this.info?.close();
        this.comm?.close();
      }
    }
  }
}
