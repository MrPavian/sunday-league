import { tr } from '../core/i18n.js';
import { applySimple, GROUP_LABELS, ORDERS, packLines, simpleActive, SIMPLE, SIMPLE_IDS } from '../sim/commands.js';
import { activeShouts, shout, SHOUTS } from '../sim/coach.js';
import { execution, ORDER_GROUPS, orderOf, planTarget, setOrder, setStyle } from '../sim/plan.js';
import { STYLES } from '../sim/tactics.js';
import { button, haptic } from './ds.js';
import { setCoachLevel } from './prefs.js';
import { TacticBoard } from './TacticBoard.js';
import { trainerCard } from './world.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Taktik-Blatt im Spiel (UI 2.0): Das Spiel steht, man stellt in Ruhe um. Links die Taktiktafel
// (zeigt, was die Befehle verstellen), rechts: aktive Befehle, die vier Zurufe, die sechs
// Schnellbefehle und – Fortgeschritten – jede Gruppe einzeln als Stufenregler plus Grundstil.
// Pausiert wie bisher: main.js hält die Uhr an, solange isOpen.
export class PlanPanel {
  constructor(root) {
    this.root = root;
    this.match = null;
    this.advanced = true;
    this.board = typeof document !== 'undefined' ? new TacticBoard() : null;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || !this.match || performance.now() - (this.openedAt ?? 0) < 350) return;
      const { action, group, value } = b.dataset;
      const m = this.match;
      if (action === 'simple') {
        applySimple(m, this.team, value);
        this.preview = { label: SIMPLE[value].label, text: packLines(value).join(' · ') };
        this.played = value;
      } else if (action === 'order') {
        const off = value === '' || orderOf(m, this.team, group) === value;
        setOrder(m, this.team, group, off ? null : value, { by: 'plan' });
        this.preview = off ? { label: GROUP_LABELS[group], text: tr('zurück auf den Grundstil', 'back to the base style') } : { label: ORDERS[`${group}:${value}`].label, text: ORDERS[`${group}:${value}`].hint };
      } else if (action === 'shout') {
        // Direkt setzen: Solange das Blatt offen ist, liest die Spielschleife keine Zurufe.
        const [g, v] = SHOUTS[value].order;
        const wasOn = orderOf(m, this.team, g) === v;
        if (wasOn) setOrder(m, this.team, g, null, { by: 'coach' });
        else shout(m, value, { force: true });
        this.preview = { label: SHOUTS[value].label, text: wasOn ? tr('aufgehoben', 'called off') : (ORDERS[`${g}:${v}`]?.hint ?? '') };
      } else if (action === 'style') {
        setStyle(m, this.team, value);
        this.preview = { label: STYLES[value].label, text: STYLES[value].desc };
      } else if (action === 'reset') {
        for (const g of ORDER_GROUPS) setOrder(m, this.team, g, null, { by: 'plan' });
        this.preview = { label: tr('Grundstil', 'Base style'), text: tr('Alle Befehle aufgehoben.', 'All orders cleared.') };
      } else if (action === 'level') {
        this.advanced = !this.advanced;
        setCoachLevel(this.advanced ? 'profi' : 'einsteiger');
      } else if (action === 'close') return this.close();
      if (action !== 'level') haptic('select');
      this.render();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || (e.code !== 'Escape' && e.code !== 'Enter')) return;
      e.preventDefault();
      this.close();
    });
    root.hidden = true;
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open(match, team, { advanced = true } = {}, onClose) {
    this.openedAt = performance.now(); // Tipp zum Öffnen soll nicht gleich einen Knopf im Blatt treffen
    this.match = match;
    this.team = team;
    this.advanced = advanced;
    this.onClose = onClose;
    this.preview = null;
    // Gerüst einmal pro Öffnen: die Tafel bleibt dasselbe Element, damit Änderungen gleiten.
    this.root.innerHTML = `
      <div class="plan-panel tp" role="dialog" aria-label="${tr('Taktik', 'Tactics')}">
        <header class="tp-head"><div><h3>${tr('Taktik', 'Tactics')}</h3><small>${tr('Das Spiel steht. Befehle gelten, bis du sie änderst.', 'The match is paused. Orders stay until you change them.')}</small></div>
          ${button('✕', { kind: 'ghost icon', action: 'close', 'aria-label': tr('Weiter', 'Resume') })}</header>
        <div class="tp-body"><div class="tp-board m-board"><span class="tray" aria-hidden="true"></span></div><div class="tp-controls"></div></div>
        <footer><button data-action="reset">${tr('Alles zurück auf den Grundstil', 'Back to the base style')}</button><button class="primary" data-action="close">${tr('Weiter (Enter)', 'Resume (Enter)')}</button></footer>
      </div>`;
    if (this.board) this.root.querySelector('.tp-board').appendChild(this.board.el);
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

  render() {
    const m = this.match;
    const team = this.team;
    const style = m.plan?.[team]?.style ?? 'ausgewogen';
    const active = ORDER_GROUPS.map((g) => orderOf(m, team, g) && ORDERS[`${g}:${orderOf(m, team, g)}`]?.label).filter(Boolean);
    const shouting = new Set(activeShouts(m));
    const shouts = Object.entries(SHOUTS)
      .map(([id, s], i) => `<button data-action="shout" data-value="${id}" aria-pressed="${shouting.has(id)}" class="${shouting.has(id) ? 'active' : ''}" title="${esc(s.label)}"><kbd>${i + 1}</kbd>${s.short}</button>`)
      .join('');
    // Schnellbefehle als Trainerkarten auf dem Tisch; die eben ausgespielte hebt sich einmal an.
    const played = this.played;
    this.played = null;
    const simple = SIMPLE_IDS.map((id) => trainerCard({ action: 'simple', value: id, title: SIMPLE[id].label, lines: packLines(id), active: simpleActive(m, team, id), played: played === id })).join('');
    // Fortgeschritten: jede Gruppe als Stufenregler – nur die vorhandenen Stufen, dazu „–" für aus.
    const groups = ORDER_GROUPS.map((g) => {
      const values = Object.keys(ORDERS).filter((k) => k.startsWith(`${g}:`)).map((k) => k.split(':')[1]);
      const cur = orderOf(m, team, g) ?? '';
      const seg = [['', '–'], ...values.map((v) => [v, ORDERS[`${g}:${v}`].label])]
        .map(([v, label]) => `<button data-action="order" data-group="${g}" data-value="${v}" aria-pressed="${cur === v}" title="${v ? esc(ORDERS[`${g}:${v}`].hint) : tr('aus', 'off')}">${label}</button>`)
        .join('');
      return `<div class="plan-group"><h4>${GROUP_LABELS[g]}</h4><div class="ui-seg">${seg}</div></div>`;
    }).join('');
    const styles = Object.entries(STYLES).map(([id, s]) => `<button data-action="style" data-value="${id}" aria-pressed="${style === id}" class="${style === id ? 'active' : ''}" title="${esc(s.desc)}">${s.label}</button>`).join('');
    this.root.querySelector('.tp-controls').innerHTML = `
      <p class="ui-section-title">${tr('Aktiv', 'Active')}</p>
      <div class="ui-chips">${active.length ? active.map((a) => `<span class="ui-chip">${a}</span>`).join('') : `<span class="ui-chip plain">${tr('nur der Grundstil', 'base style only')} · ${STYLES[style].label}</span>`}</div>
      ${this.preview ? `<p class="tp-preview" aria-live="polite"><b>${esc(this.preview.label)}</b> ${esc(this.preview.text)}</p>` : ''}
      <p class="ui-section-title">${tr('Zurufe', 'Shouts')}</p>
      <div class="chips shouts">${shouts}</div>
      <p class="ui-section-title">${tr('Trainerkarten', 'Coach cards')}</p>
      <div class="tcard-row compact">${simple}</div>
      ${this.advanced ? `<p class="ui-section-title">${tr('Alle Befehle', 'All orders')}</p><div class="plan-grid">${groups}</div><div class="plan-group"><h4>${tr('Grundstil', 'Base style')}</h4><div class="chips">${styles}</div></div>` : ''}
      <p class="hint"><button class="linkish" data-action="level">${this.advanced ? tr('Weniger Optionen', 'Fewer options') : tr('Alle Befehle zeigen', 'Show all orders')}</button></p>`;
    if (this.board) {
      const formation = m.players.filter((p) => p.team === team && p.formationEntry).map((p) => ({ role: p.role, x: p.formationEntry.x, z: p.formationEntry.z }));
      this.board.update(formation, planTarget(m, team), execution(m, team));
    }
  }
}
