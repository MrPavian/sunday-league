import { tr } from '../core/i18n.js';
import { MATCH_INJURIES } from '../sim/knocks.js';
import { POSITIONS } from '../sim/generator.js';
import { oopInfo, oopText } from '../sim/position.js';
import { PROFILES, profilesOf } from '../sim/profiles.js';
import { trickLine } from '../sim/tricks.js';
import { planSubs, plannedSubs, requestSub, subsLeft, windowsLeft } from '../sim/squad.js';
import { benchAdvice, outAdvice } from '../sim/subadvice.js';
import { esc } from './ds.js';

const hex = (n) => (typeof n === 'number' ? `#${n.toString(16).padStart(6, '0')}` : '#2f6f3a');
const bar = (v) => `<span class="sub-stamina" style="--v:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></span>`;

// Auswechseln: Wer raus, wer rein? Das Spiel steht, solange die Tafel offen ist.
// Getauscht wird bei der nächsten Unterbrechung. Tastatur: ←/→ Spalte, ↑/↓ Spieler,
// Enter oder noch mal die Wechseltaste bestätigt, Esc bricht ab.
export class SubPanel {
  constructor(root) {
    this.root = root;
    this.match = null;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t || !this.match || performance.now() - (this.openedAt ?? 0) < 350) return;
      const { action, value } = t.dataset;
      if (action === 'out') {
        if (this.queue.some((q) => q.outId === value)) return; // schon eingeplant
        this.outId = value;
        this.inList();
        this.inId = this.bestIn ?? this.inId; // neuer Kandidat raus – neuer Vorschlag rein
      }
      else if (action === 'in') {
        if (this.queue.some((q) => q.inId === value)) return;
        this.inId = value;
      } else if (action === 'add') this.add();
      else if (action === 'unqueue') this.queue.splice(Number(value), 1);
      else if (action === 'confirm') return this.confirm();
      else if (action === 'auto') return this.auto();
      else if (action === 'cancel') return this.close();
      this.render();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      const lists = { out: this.outList(), in: this.inList() };
      if (e.code === 'Escape') this.close();
      else if (e.code === 'Enter') this.confirm();
      else if (e.code === 'Space' || e.code === 'NumpadAdd') this.add();
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') this.col = this.col === 'out' ? 'in' : 'out';
      else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        const list = lists[this.col];
        const key = this.col === 'out' ? 'outId' : 'inId';
        const i = list.findIndex((p) => p.id === this[key]);
        const next = list[(i + (e.code === 'ArrowUp' ? -1 : 1) + list.length) % list.length];
        if (next) this[key] = next.id;
      } else return;
      e.preventDefault();
      e.stopPropagation();
      if (this.isOpen) this.render();
    });
    root.hidden = true;
  }

  get isOpen() {
    return !this.root.hidden;
  }

  // Auswechseln dürfen nur Feldspieler, die nicht ohnehin verletzt runter müssen.
  // Reihenfolge nach Rat: Wer am ehesten raus sollte, wer jetzt am besten passt.
  outList() {
    this.outTips = new Map(outAdvice(this.match, this.team).map((a) => [a.player.id, a.reasons]));
    const queued = new Set((this.queue ?? []).map((q) => q.outId));
    return outAdvice(this.match, this.team).map((a) => a.player).filter((p) => !queued.has(p.id));
  }

  inList() {
    const out = this.match.players.find((p) => p.id === this.outId) ?? null;
    const queued = new Set((this.queue ?? []).map((q) => q.inId));
    const advice = benchAdvice(this.match, this.team, out).filter((a) => !queued.has(a.player.id));
    this.inTips = new Map(advice.map((a) => [a.player.id, a.reasons]));
    this.bestIn = advice[0]?.player.id ?? null;
    return advice.map((a) => a.player);
  }

  // Mehrere Wechsel auf einmal (vom Nutzer gewünscht 2026-11-05): das gewählte Paar in die Liste, dann das nächste wählen.
  // Alle gehen bei der nächsten Unterbrechung zusammen – in den Profiligen eine Wechselgelegenheit.
  room() {
    return subsLeft(this.match, this.team) - this.queue.length;
  }
  add() {
    if (!this.outId || !this.inId || this.room() <= 0) return;
    this.queue.push({ outId: this.outId, inId: this.inId });
    const outs = this.outList();
    this.outId = (outs.find((p) => p.role !== 'gk') ?? outs[0])?.id ?? null;
    this.inList();
    this.inId = this.bestIn;
  }

  open(match, team, onClose) {
    this.openedAt = performance.now(); // Tipp zum Öffnen soll nicht gleich einen Knopf im Blatt treffen
    this.match = match;
    this.team = team;
    this.onClose = onClose;
    this.col = 'out';
    this.queue = plannedSubs(match, team).map((q) => ({ ...q })); // schon angemeldete Wechsel bleiben in der Liste
    const outs = this.outList();
    // Vorschlag: wer am ehesten raus sollte, dazu der, der jetzt am besten passt.
    this.outId = (outs.find((p) => p.role !== 'gk') ?? outs[0])?.id ?? null;
    this.inList();
    this.inId = this.bestIn;
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.root.hidden = true;
    this.match = null;
    const done = this.onClose;
    this.onClose = null;
    done?.();
  }

  confirm() {
    if (!this.match) return;
    const pairs = [...this.queue];
    if (this.outId && this.inId && this.room() > 0) pairs.push({ outId: this.outId, inId: this.inId });
    if (pairs.length) planSubs(this.match, this.team, pairs);
    this.close();
  }

  auto() {
    if (!this.match) return;
    requestSub(this.match, this.team);
    this.close();
  }

  render() {
    const m = this.match;
    const left = subsLeft(m, this.team);
    const rule = m.subRule ?? { limit: Infinity, reentry: false };
    const outs = this.outList();
    const ins = this.inList();
    const hurt = m.players.filter((p) => p.team === this.team && p.mustLeave);
    const win = windowsLeft(m, this.team);
    const winText = Number.isFinite(win) ? tr(` · noch ${win} von ${rule.windows} Gelegenheiten (Halbzeit zählt nicht)`, ` · ${win} of ${rule.windows} windows left (half-time does not count)`) : '';
    const ruleText = Number.isFinite(rule.limit)
      ? tr(`Noch ${left} von ${rule.limit} Wechseln${winText} · raus ist raus`, `${left} of ${rule.limit} substitutions left${winText} · once off, stays off`)
      : tr('Beliebig oft wechseln · raus ist raus', 'Unlimited substitutions · once off, stays off');
    const swapOutRole = outs.find((p) => p.id === this.outId)?.role ?? null;
    const row = (p, kind, selected) => {
      const knock = p.knock ? ` <em class="sub-knock">✚ ${esc(MATCH_INJURIES[p.knock.kind]?.label ?? '')}</em>` : '';
      const role = POSITIONS[kind === 'out' ? p.role : p.position] ?? '';
      const prof = [...profilesOf(p).map((id) => PROFILES[id].label), trickLine(p)].filter(Boolean).join(' · ');
      // Positionsfremd: draußen gilt die aktuelle Rolle, auf der Bank die Rolle des Ausgewählten.
      const target = kind === 'out' ? p.role : swapOutRole;
      const info = kind === 'out' ? p.oop : target ? oopInfo(p, target, p.posFam?.[target] ?? 0) : null;
      const oop = info ? `<small class="sub-oop" title="${esc(oopText(info))}">⚠ ${esc(oopText(info))}</small>` : '';
      const tips = (kind === 'out' ? this.outTips : this.inTips)?.get(p.id) ?? [];
      const tip = tips.length ? `<small class="sub-tip ${kind}">${kind === 'in' ? tr('Passt jetzt', 'Good call now') : tr('Raus?', 'Take off?')}: ${esc(tips.join(', '))}</small>` : '';
      // Als Spielerkarte: Kopf in Vereinsfarbe, Name, Position, Kraftbalken; gewählt = Stempel.
      const mark = selected ? `<span class="m-stamp sub-mark${kind === 'in' ? ' ok' : ''}" style="--tilt:-8deg">${kind === 'in' ? tr('Rein', 'On') : tr('Raus', 'Off')}</span>` : '';
      return `<button class="sub-row sub-card${selected ? ' active' : ''}${this.col === kind ? ' col' : ''}" data-action="${kind}" data-value="${p.id}" aria-pressed="${selected}"><span class="sub-name">${esc(p.name)}${knock}</span><small>${esc(role)}</small>${prof ? `<small class="sub-prof">${esc(prof)}</small>` : ''}${oop}${tip}${bar(p.stamina)}${mark}</button>`;
    };
    const swapOut = outs.find((p) => p.id === this.outId);
    const swapIn = ins.find((p) => p.id === this.inId);
    const swap = swapOut && swapIn ? { out: swapOut, in: swapIn } : null;
    const noWindow = win <= 0 && m.phase !== 'halftime';
    const blocked = left <= 0 ? tr('Alle Wechsel aufgebraucht.', 'All substitutions used.') : noWindow ? tr('Alle Wechselgelegenheiten aufgebraucht – nur noch in der Halbzeit.', 'All substitution windows used – only at half-time now.') : !ins.length && !this.queue.length ? tr('Keiner mehr auf der Bank, der rein kann.', 'Nobody left on the bench who can come on.') : '';
    const byId = (id) => m.players.find((p) => p.id === id) ?? m.bench[this.team].find((p) => p.id === id);
    const queueHtml = this.queue.length ? `<ul class="sub-queue" aria-live="polite">${this.queue.map((q, i) => `<li>⇄ <b>${esc(byId(q.outId)?.name ?? '')}</b> ${tr('raus', 'off')} · <b>${esc(byId(q.inId)?.name ?? '')}</b> ${tr('rein', 'on')} <button class="linkish" data-action="unqueue" data-value="${i}" aria-label="${tr('Entfernen', 'Remove')}">✕</button></li>`).join('')}</ul>` : '';
    const canAdd = !!(this.outId && this.inId) && this.room() > 1;
    const total = this.queue.length + (this.outId && this.inId && this.room() > 0 ? 1 : 0);
    this.root.innerHTML = `
      <div class="sub-panel" role="dialog" aria-label="${tr('Auswechseln', 'Substitution')}" style="--kit:${hex(m.teams[this.team].kit?.shirt)}">
        <header><h3>${tr('Auswechseln', 'Substitution')}</h3><small>${ruleText}</small></header>
        ${hurt.map((p) => `<p class="sub-hurt">✚ ${tr(`${esc(p.name)} ist verletzt und geht beim nächsten Stopp runter.`, `${esc(p.name)} is injured and comes off at the next stoppage.`)}</p>`).join('')}
        ${blocked ? `<p class="sub-blocked">${blocked}</p>` : `
        <div class="sub-cols">
          <div><h4>${tr('Raus', 'Off')}</h4>${outs.map((p) => row(p, 'out', p.id === this.outId)).join('')}</div>
          <div><h4>${tr('Rein', 'On')}</h4>${ins.map((p) => row(p, 'in', p.id === this.inId)).join('')}</div>
        </div>
        ${swap ? `<p class="sub-swap" aria-live="polite">⇄ <b>${esc(swap.out.name)}</b> ${tr('raus', 'off')} · <b>${esc(swap.in.name)}</b> ${tr('rein', 'on')}</p>` : ''}`}
        ${queueHtml}
        <footer>
          ${blocked ? '' : `<button class="primary" data-action="confirm" data-testid="sub-confirm" ${total ? '' : 'disabled'}>${total > 1 ? tr(`${total} Wechsel (Enter)`, `${total} substitutions (Enter)`) : tr('Wechseln (Enter)', 'Substitute (Enter)')}</button><button data-action="add" data-testid="sub-add" ${canAdd ? '' : 'disabled'}>${tr('+ Weiterer Wechsel (Leertaste)', '+ Another change (Space)')}</button><button data-action="auto">${tr('Automatisch: der Müdeste', 'Automatic: the most tired')}</button>`}
          <button data-action="cancel">${tr('Zurück (Esc)', 'Back (Esc)')}</button>
        </footer>
        <p class="hint">${tr('Das Spiel steht, solange du hier bist. Gewechselt wird beim nächsten Stopp.', 'The match is paused while you are here. The change happens at the next stoppage.')}</p>
      </div>`;
  }
}
