import { tr } from '../core/i18n.js';
import { MATCH_INJURIES } from '../sim/knocks.js';
import { POSITIONS } from '../sim/generator.js';
import { planSub, requestSub, subsLeft, usableBench } from '../sim/squad.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
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
      if (action === 'out') this.outId = value;
      else if (action === 'in') this.inId = value;
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
  outList() {
    const m = this.match;
    return m.players.filter((p) => p.team === this.team && !p.mustLeave).sort((a, b) => (a.role === 'gk') - (b.role === 'gk') || a.stamina - b.stamina);
  }

  inList() {
    return usableBench(this.match, this.team);
  }

  open(match, team, onClose) {
    this.openedAt = performance.now(); // Tipp zum Öffnen soll nicht gleich einen Knopf im Blatt treffen
    this.match = match;
    this.team = team;
    this.onClose = onClose;
    this.col = 'out';
    const outs = this.outList();
    const ins = this.inList();
    // Vorschlag: der Müdeste raus, dazu jemand für seine Position.
    const tired = outs.find((p) => p.role !== 'gk') ?? outs[0];
    this.outId = tired?.id ?? null;
    this.inId = (ins.find((b) => b.position === tired?.role) ?? ins.find((b) => b.position !== 'gk') ?? ins[0])?.id ?? null;
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
    if (this.outId && this.inId) planSub(this.match, this.team, this.outId, this.inId);
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
    const rule = m.subRule ?? { limit: Infinity, reentry: true };
    const outs = this.outList();
    const ins = this.inList();
    const hurt = m.players.filter((p) => p.team === this.team && p.mustLeave);
    const ruleText = Number.isFinite(rule.limit)
      ? tr(`Noch ${left} von ${rule.limit} Wechseln · raus ist raus`, `${left} of ${rule.limit} substitutions left · once off, stays off`)
      : tr('Fliegend wechseln · Rückwechsel erlaubt', 'Rolling substitutions · players may go back on');
    const row = (p, kind, selected) => {
      const knock = p.knock ? ` <em class="sub-knock">✚ ${esc(MATCH_INJURIES[p.knock.kind]?.label ?? '')}</em>` : '';
      const role = POSITIONS[kind === 'out' ? p.role : p.position] ?? '';
      return `<button class="sub-row${selected ? ' active' : ''}${this.col === kind ? ' col' : ''}" data-action="${kind}" data-value="${p.id}"><span class="sub-name">${esc(p.name)}${knock}</span><small>${esc(role)}</small>${bar(p.stamina)}</button>`;
    };
    const blocked = left <= 0 ? tr('Alle Wechsel aufgebraucht.', 'All substitutions used.') : !ins.length ? tr('Keiner mehr auf der Bank, der rein kann.', 'Nobody left on the bench who can come on.') : '';
    this.root.innerHTML = `
      <div class="sub-panel" role="dialog" aria-label="${tr('Auswechseln', 'Substitution')}">
        <header><h3>${tr('Auswechseln', 'Substitution')}</h3><small>${ruleText}</small></header>
        ${hurt.map((p) => `<p class="sub-hurt">✚ ${tr(`${esc(p.name)} ist verletzt und geht beim nächsten Stopp runter.`, `${esc(p.name)} is injured and comes off at the next stoppage.`)}</p>`).join('')}
        ${blocked ? `<p class="sub-blocked">${blocked}</p>` : `
        <div class="sub-cols">
          <div><h4>${tr('Raus', 'Off')}</h4>${outs.map((p) => row(p, 'out', p.id === this.outId)).join('')}</div>
          <div><h4>${tr('Rein', 'On')}</h4>${ins.map((p) => row(p, 'in', p.id === this.inId)).join('')}</div>
        </div>`}
        <footer>
          ${blocked ? '' : `<button class="primary" data-action="confirm" ${this.outId && this.inId ? '' : 'disabled'}>${tr('Wechseln (Enter)', 'Substitute (Enter)')}</button><button data-action="auto">${tr('Automatisch: der Müdeste', 'Automatic: the most tired')}</button>`}
          <button data-action="cancel">${tr('Zurück (Esc)', 'Back (Esc)')}</button>
        </footer>
        <p class="hint">${tr('Das Spiel steht, solange du hier bist. Gewechselt wird beim nächsten Stopp.', 'The match is paused while you are here. The change happens at the next stoppage.')}</p>
      </div>`;
  }
}
