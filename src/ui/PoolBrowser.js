import { tr } from '../core/i18n.js';
import { TRAITS } from '../data/traits.js';
import { jobName } from '../data/names.js';
import { TIERS, tierById } from '../data/tiers.js';
import { POSITIONS, createPlayerPool } from '../sim/generator.js';

const PAGE = 12;
const ATTR_LABELS = {
  pace: tr('Tempo', 'Pace'), stamina: tr('Ausdauer', 'Stamina'), technique: tr('Technik', 'Technique'), passing: tr('Passen', 'Passing'),
  shooting: tr('Schuss', 'Shooting'), tackling: tr('Zweikampf', 'Tackling'), heading: tr('Kopfball', 'Heading'), keeping: tr('Torwart', 'Goalkeeping'),
};

// Stöbern im großen Spielerpool – nach Klassen sortiert, beste zuerst.
export class PoolBrowser {
  constructor(root) {
    this.root = root;
    this.pool = null;
    this.tier = 'legende';
    this.page = 0;
    this.open = null;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const { action, value } = t.dataset;
      if (action === 'tier') {
        this.tier = value;
        this.page = 0;
        this.open = null;
      } else if (action === 'page') this.page = Math.max(0, this.page + Number(value));
      else if (action === 'row') this.open = this.open === value ? null : value;
      else if (action === 'close') return this.hide();
      this.render();
    });
    window.addEventListener('keydown', (e) => {
      if (this.root.hidden) return;
      if (e.code === 'Escape' || e.code === 'KeyP') this.hide();
    });
  }

  show(onClose) {
    this.onClose = onClose;
    this.pool ??= createPlayerPool();
    this.counts ??= this.pool.countByTier();
    this.lists ??= Object.fromEntries(TIERS.map((t) => [t.id, this.pool.byTier(t.id).sort((a, b) => b.rating - a.rating)]));
    this.root.hidden = false;
    this.render();
  }

  hide() {
    this.root.hidden = true;
    this.onClose?.();
  }

  render() {
    const tier = tierById(this.tier);
    const list = this.lists[this.tier];
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    this.page = Math.min(this.page, pages - 1);
    const rows = list.slice(this.page * PAGE, (this.page + 1) * PAGE);
    this.root.innerHTML = `
      <div class="pool-panel">
        <header>
          <h2>${tr('Spielerpool', 'Player pool')} <small>${this.pool.size.toLocaleString(tr('de-DE', 'en-GB'))} ${tr('Spieler in der Region', 'players in the region')}</small></h2>
          <button data-action="close">${tr('Zurück (Esc)', 'Back (Esc)')}</button>
        </header>
        <nav>${TIERS.map(
          (t) => `<button data-action="tier" data-value="${t.id}" class="${t.id === this.tier ? 'active' : ''}" style="--c:${t.color}">
            ${t.name} <span>${(this.counts[t.id] ?? 0).toLocaleString(tr('de-DE', 'en-GB'))}</span></button>`,
        ).join('')}</nav>
        <p class="tier-desc" style="--c:${tier.color}">${tier.desc}</p>
        <ul>${rows.map((p) => this.row(p, tier)).join('')}</ul>
        <footer>
          <button data-action="page" data-value="-1" ${this.page === 0 ? 'disabled' : ''}>◀</button>
          ${tr('Seite', 'Page')} ${this.page + 1} / ${pages}
          <button data-action="page" data-value="1" ${this.page >= pages - 1 ? 'disabled' : ''}>▶</button>
        </footer>
      </div>`;
  }

  row(p, tier) {
    const open = this.open === p.id;
    const traits = p.traits.map((t) => `<i title="${TRAITS[t].desc}">${TRAITS[t].name}</i>`).join('');
    const bars = Object.entries(ATTR_LABELS)
      .filter(([k]) => k !== 'keeping' || p.position === 'gk')
      .map(([k, label]) => `<div class="attr"><span>${label}</span><b style="width:${Math.round(p.attrs[k] * 100)}%"></b></div>`)
      .join('');
    return `<li data-action="row" data-value="${p.id}" class="${open ? 'open' : ''}" style="--c:${tier.color}">
      <div class="line">
        <span class="rating">${p.rating}</span>
        <span class="who"><b>${p.name}</b> ${p.title ? `<em>${p.title}</em>` : ''}
          <small>${p.age}${tr(' J.', ' yrs')} · ${POSITIONS[p.position]} · ${jobName(p.profession)}</small></span>
        <span class="traits">${traits}</span>
      </div>
      ${open ? `<div class="detail">${p.backstory ? `<p>${p.backstory}</p>` : ''}<div class="attrs">${bars}</div></div>` : ''}
    </li>`;
  }
}
