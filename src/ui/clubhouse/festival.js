// Vereinsfest (Planung, Bericht) und Sommerturnier (Einladung) im Vereinsheim.
// Methoden des Vereinsheims (this = Clubhouse); die Regeln stehen in career/festival.js und career/tournament.js.
import { tr } from '../../core/i18n.js';
import { button, esc } from '../ds.js';
import { crewNeeded, FEST_ORDER, FEST_PARTS, festivalDue, festivalOf, festivalPlan, festivalPreview, festivalSkip, festivalToggle, holdFestival, partCost, volunteers } from '../../career/festival.js';
import { CUPS, cupOf, summerCupDue, summerCupRunning, summerOffer } from '../../career/tournament.js';
import { euro } from './shared.js';

export const festivalScreens = {
  // Planungsblatt. seasonEnd: im Sommer, wenn das Fest wirklich steigen kann; sonst nur vormerken.
  festivalCard({ seasonEnd = false } = {}) {
    const c = this.career;
    const f = festivalOf(c);
    if (f.status === 'done' && f.report) return this.festivalReport(f.report);
    if (f.status === 'skipped') return `<div class="fest-card"><h4>${tr('Vereinsfest', 'Club festival')}</h4><p class="t-2">${tr('Dieses Jahr fällt das Vereinsfest aus.', 'No club festival this year.')}</p></div>`;
    const pv = festivalPreview(c, f.plan);
    const rows = FEST_ORDER.map((id) => {
      const p = FEST_PARTS[id];
      const on = f.plan.includes(id);
      return `<button class="fest-part${on ? ' on' : ''}" data-action="festToggle" data-value="${id}" aria-pressed="${on}">
        <span class="fp-name"><b>${p.name}</b><small>${p.blurb}</small></span>
        <span class="fp-facts"><span class="ui-chip plain">${euro(partCost(c, id))}</span><span class="ui-chip plain" title="${tr('Ehrenamtliche', 'volunteers')}">${p.crew} ${tr('Helfer', 'helpers')}</span>${p.wet >= 1 ? `<span class="ui-chip plain warn">${tr('wetterfest: nein', 'weather: no')}</span>` : ''}</span></button>`;
    }).join('');
    const warn = pv.short > 0 ? `<p class="warn">${tr(`Es fehlen ${pv.short} Ehrenamtliche – manche Stände bleiben dann zeitweise dicht.`, `${pv.short} volunteers short – some stalls will stay shut for a while.`)}</p>` : '';
    const afford = c.cash >= pv.cost;
    const go = seasonEnd
      ? f.plan.length
        ? button(tr('Vereinsfest steigen lassen', 'Hold the club festival'), { kind: 'primary big block', action: 'festHold', disabled: !afford })
        : ''
      : `<p class="t-2">${tr('Das Fest steigt im Sommer, nach dem letzten Spieltag.', 'The festival takes place in summer, after the last matchday.')}</p>`;
    return `<div class="fest-card" data-testid="fest-plan">
      <h4>${tr('Vereinsfest', 'Club festival')} <small>${tr('Kasse', 'Kitty')}: ${euro(c.cash)}</small></h4>
      <p class="t-2">${tr('Einmal im Jahr feiert der Verein mit dem ganzen Viertel. Wähle Bausteine – jeder kostet Geld und braucht Ehrenamtliche; bei Regen leiden die Stände draußen.', 'Once a year the club celebrates with the whole neighbourhood. Pick the parts – each costs money and needs volunteers; outdoor stalls suffer in the rain.')}</p>
      <div class="fest-parts">${rows}</div>
      <div class="ui-chips fest-sum">
        <span class="ui-chip plain">${tr('Kosten', 'Costs')}: <b>${euro(pv.cost)}</b></span>
        <span class="ui-chip plain">${tr('Helfer', 'Helpers')}: <b>${pv.need}/${pv.have}</b></span>
        <span class="ui-chip plain">${tr('Besucher ca.', 'Visitors approx.')} <b>${pv.visitors}</b></span>
        <span class="ui-chip plain">${tr('Einnahmen ca.', 'Takings approx.')} <b>${euro(pv.expectedIncome)}</b></span>
      </div>
      ${warn}${!afford && f.plan.length && seasonEnd ? `<p class="warn">${tr('Die Kasse reicht für diese Auswahl nicht.', 'The kitty does not cover this selection.')}</p>` : ''}
      <div class="fest-go">${go}${seasonEnd ? button(tr('Dieses Jahr kein Fest', 'No festival this year'), { action: 'festSkip' }) : ''}</div>
    </div>`;
  },

  // Kreisblatt-Bericht und Ergebnis.
  festivalReport(r) {
    const line = (l) => `<li><span>${FEST_PARTS[l.id].name}${l.closed ? ` <small>(${tr('wegen Wetter zu', 'closed by weather')})</small>` : l.crew < 1 ? ` <small>(${tr('zu wenige Helfer', 'short of helpers')})</small>` : ''}</span><b>${euro(l.income - l.cost)}</b></li>`;
    return `<div class="fest-card fest-report" data-testid="fest-report">
      <p class="t-cap">${tr('Kreisblatt', 'District Gazette')} · ${tr('Lokales', 'Local')}</p>
      <h3>${r.headline}</h3>
      <p>${r.body}</p>
      <div class="ui-chips">
        <span class="ui-chip plain">${tr('Besucher', 'Visitors')}: <b>${r.visitors}</b></span>
        <span class="ui-chip plain">${tr('Ergebnis', 'Result')}: <b>${r.net >= 0 ? '+' : ''}${euro(r.net)}</b></span>
        <span class="ui-chip plain">${tr('Neue Fördermitglieder', 'New supporters')}: <b>${r.members}</b></span>
        <span class="ui-chip plain">${tr('Stimmung', 'Mood')}: <b>+${Math.round(r.mood * 100)}</b></span>
        ${r.sponsorsUp ? `<span class="ui-chip plain">${tr('Sponsoren zufrieden', 'Sponsors pleased')}: <b>${r.sponsorsUp}</b></span>` : ''}
      </div>
      <ul class="plain fest-lines">${r.lines.map(line).join('')}</ul>
    </div>`;
  },

  // Sommerturnier vor der Saison: Einladung annehmen, selbst ausrichten oder verzichten.
  summerCard() {
    const c = this.career;
    const cfg = CUPS.sommer;
    if (summerCupRunning(c)) return `<div class="winter-cup summer-cup"><p class="label">${cfg.name}</p><p>${tr('Das Turnier läuft. Der erste Ligaspieltag steigt danach.', 'The tournament is under way. The first league matchday follows.')}</p>${button(tr('Zum Sommerturnier', 'To the summer tournament'), { kind: 'primary big block', action: 'tab', value: 'cup' })}${button(tr('Turnier abbrechen', 'Call it off'), { action: 'onCupSkip', value: 'sommer' })}</div>`;
    if (!summerCupDue(c)) return '';
    const o = summerOffer(c);
    const host = [4, 6, 8].map((n) => button(tr(`Selbst ausrichten · ${n} Teams · ${euro(o.hostCosts[n])}`, `Host it yourselves · ${n} teams · ${euro(o.hostCosts[n])}`), { action: 'onSummerStart', value: `host:${n}`, disabled: c.cash < o.hostCosts[n] })).join('');
    return `<div class="winter-cup summer-cup" data-testid="summer-invite"><p class="label">${tr('Vor der Saison', 'Before the season')}</p>
      <p>${tr(`Einladung zum <b>${cfg.name}</b>${o.neighbour ? ` bei <b>${esc(o.neighbour.name)}</b>` : ''}: ${o.inviteSize} Teams, Gruppenphase und K.-o., kurze Spiele. Preisgeld bis ${cfg.prizes.winner} €. Oder richtet es selbst aus: Theke und Startgelder, aber auch Kosten.`, `Invitation to the <b>${cfg.name}</b>${o.neighbour ? ` at <b>${esc(o.neighbour.name)}</b>` : ''}: ${o.inviteSize} teams, group stage and knockout, short matches. Prize money up to €${cfg.prizes.winner}. Or host it yourselves: bar income and entry fees, but costs too.`)}</p>
      <div class="summer-actions">${button(tr('Einladung annehmen', 'Accept the invitation'), { kind: 'primary', action: 'onSummerStart', value: 'invite' })}${host}${button(tr('Diesmal nicht', 'Not this time'), { action: 'onCupSkip', value: 'sommer' })}</div></div>`;
  },

  festAction(action, value) {
    const c = this.career;
    if (action === 'festToggle') festivalToggle(c, value);
    else if (action === 'festSkip') festivalSkip(c);
    else if (action === 'festHold') {
      if (!festivalDue(c)) return;
      const f = festivalOf(c);
      if (c.cash < festivalPreview(c, f.plan).cost) return;
      holdFestival(c);
    }
    this.h.onChange();
  },
};
