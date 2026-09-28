import { tr } from '../core/i18n.js';
import { applySimple, GROUP_LABELS, ORDERS, simpleActive, SIMPLE, SIMPLE_IDS } from '../sim/commands.js';
import { ORDER_GROUPS, orderOf, setOrder, setStyle } from '../sim/plan.js';
import { STYLES } from '../sim/tactics.js';
import { setCoachLevel } from './prefs.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Plan-Blatt im Spiel: Das Spiel steht, man stellt in Ruhe um. Oben die sechs
// einfachen Pakete, darunter (Fortgeschritten) jede Gruppe einzeln und der Spielstil.
export class PlanPanel {
  constructor(root) {
    this.root = root;
    this.match = null;
    this.advanced = true;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || !this.match || performance.now() - (this.openedAt ?? 0) < 350) return;
      const { action, group, value } = b.dataset;
      const m = this.match;
      if (action === 'simple') applySimple(m, this.team, value);
      else if (action === 'order') setOrder(m, this.team, group, orderOf(m, this.team, group) === value ? null : value, { by: 'plan' });
      else if (action === 'style') setStyle(m, this.team, value);
      else if (action === 'reset') for (const g of ORDER_GROUPS) setOrder(m, this.team, g, null, { by: 'plan' });
      else if (action === 'level') {
        this.advanced = !this.advanced;
        setCoachLevel(this.advanced ? 'profi' : 'einsteiger');
      } else if (action === 'close') return this.close();
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
    const style = m.plan?.[this.team]?.style ?? 'ausgewogen';
    const simple = SIMPLE_IDS.map((id) => `<button data-action="simple" data-value="${id}" class="${simpleActive(m, this.team, id) ? 'active' : ''}">${SIMPLE[id].label}</button>`).join('');
    const groups = ORDER_GROUPS.map((g) => {
      const values = Object.keys(ORDERS).filter((k) => k.startsWith(`${g}:`)).map((k) => k.split(':')[1]);
      const cur = orderOf(m, this.team, g);
      return `<div class="plan-group"><h4>${GROUP_LABELS[g]}</h4><div class="chips">${values
        .map((v) => `<button data-action="order" data-group="${g}" data-value="${v}" class="${cur === v ? 'active' : ''}" title="${esc(ORDERS[`${g}:${v}`].hint)}">${ORDERS[`${g}:${v}`].label}</button>`)
        .join('')}</div></div>`;
    }).join('');
    const styles = Object.entries(STYLES).map(([id, s]) => `<button data-action="style" data-value="${id}" class="${style === id ? 'active' : ''}" title="${esc(s.desc)}">${s.label}</button>`).join('');
    this.root.innerHTML = `
      <div class="plan-panel" role="dialog" aria-label="${tr('Spielplan', 'Game plan')}">
        <header><h3>${tr('Spielplan', 'Game plan')}</h3><small>${tr('Das Spiel steht. Befehle gelten, bis du sie änderst.', 'The match is paused. Orders stay until you change them.')}</small></header>
        <div class="chips simple">${simple}</div>
        ${this.advanced ? `<div class="plan-grid">${groups}</div><div class="plan-group"><h4>${tr('Grundstil', 'Base style')}</h4><div class="chips">${styles}</div></div>` : ''}
        <p class="hint"><button class="linkish" data-action="level">${this.advanced ? tr('Weniger Optionen', 'Fewer options') : tr('Alle Befehle zeigen', 'Show all orders')}</button></p>
        <footer><button data-action="reset">${tr('Alles zurück auf den Grundstil', 'Back to the base style')}</button><button class="primary" data-action="close">${tr('Weiter (Enter)', 'Resume (Enter)')}</button></footer>
      </div>`;
  }
}
