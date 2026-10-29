// PRÄSIDIUM (ROADMAP 11.9): Nach dem Traineramt sitzt man im Vereinsbüro. Hier steht der eingestellte Trainer,
// hier setzt man die Saisonziele, entlässt oder verpflichtet Trainer und springt zu Kasse und Ausbau.
// Methoden des Vereinsheims (this = Clubhouse).
import { tr } from '../../core/i18n.js';
import { STYLES } from '../../sim/tactics.js';
import { GOALS } from '../../career/board.js';
import { humanClub, table } from '../../career/career.js';
import { legacy } from '../../career/legacy.js';
import { isPresident } from '../../career/personal.js';
import { canSetGoal, hiredAge, happyLabel, severance, weeklySalary } from '../../career/president.js';
import { esc, meter } from '../ds.js';
import { portraitSVG } from '../portrait.js';
import { agedLook } from '../../data/origins.js';
import { euro } from './shared.js';

const stars = (rep) => '★'.repeat(Math.max(1, Math.round(rep / 20))) + '☆'.repeat(5 - Math.max(1, Math.round(rep / 20)));

export const officeScreens = {
  // Kurzer Hinweis über Taktik/Aufstellung: wer hier entscheidet.
  coachBanner(note = '') {
    const h = this.career.hired;
    return `<p class="coach-note">${h ? `${tr('Trainer', 'Manager')}: <b>${esc(h.name)}</b> · ${STYLES[h.style].label}` : tr('Trainerstelle vakant', 'Manager post vacant')}${note ? ` – ${note}` : ''}</p>`;
  },

  tab_office() {
    const c = this.career;
    const h = c.hired;
    const club = humanClub(c);
    if (!isPresident(c)) return `<p class="empty">${tr('Das Präsidium gibt es erst, wenn du einen Trainer engagiert hast.', 'The president\'s office only exists once you have hired a manager.')}</p>`;
    const place = table(c).findIndex((r) => r.club.human) + 1;
    const g = c.goal?.season === c.season ? c.goal : null;
    const coach = h
      ? `<div class="office-coach">
          ${portraitSVG(agedLook(h.look, h.age, hiredAge(c), h.seed), { size: 72, shirt: club.kit.shirt, label: h.name })}
          <div class="cand-info">
            <h3>${esc(h.name)}</h3>
            <p class="t-2">${hiredAge(c)}${tr(' J.', ' yrs')} · ${STYLES[h.style].label} · <span class="stars">${stars(h.reputation)}</span> · <b>${euro(weeklySalary(c))}</b> ${tr('pro Woche', 'a week')}</p>
            ${meter(h.happy / 100, `${tr('Zufriedenheit', 'Morale')}: ${happyLabel(h.happy)}`)}
            <p class="t-2">${tr('Versprach', 'Promised')}: ${GOALS[h.promise].name}</p>
            ${this.confirmFire
              ? `<button type="button" class="danger" data-action="fireCoach">${tr(`Wirklich entlassen? Abfindung ${euro(severance(c))}`, `Really sack him? Severance ${euro(severance(c))}`)}</button>`
              : `<button type="button" data-action="fireCoach" ${c.cash < severance(c) ? 'disabled' : ''}>${tr(`Trainer entlassen (${euro(severance(c))})`, `Sack the manager (${euro(severance(c))})`)}</button>`}
            ${c.cash < severance(c) ? `<small class="warn">${tr('Die Kasse reicht für die Abfindung nicht.', 'The kitty does not cover the severance.')}</small>` : ''}
          </div>
        </div>`
      : `<div class="vacant"><p><b>${tr('Trainerstelle vakant', 'Manager post vacant')}</b></p><p class="t-2">${tr('Bis ein neuer Trainer da ist, stellt der Kapitän auf. Drei Bewerber warten auf ein Gespräch.', 'Until a new manager is in, the captain picks the team. Three applicants are waiting for an interview.')}</p><button type="button" class="primary" data-action="hireCoach">${tr('Neuen Trainer verpflichten', 'Hire a new manager')}</button></div>`;
    const goals = g
      ? `<p class="t-2">${tr('Saisonziel', 'Season target')}: <b>${GOALS[g.type].name}</b> · ${tr('jetzt Platz', 'now place')} ${place} <small>(${tr('Ziel: bis Platz', 'target: top')} ${g.target})</small>${g.byPresident ? tr(' · von dir gesetzt', ' · set by you') : tr(' · Vorschlag des Vorstands', ' · board proposal')}</p>
         ${canSetGoal(c) ? `<div class="goal-row" role="group" aria-label="${tr('Saisonziel', 'Season target')}">${Object.entries(GOALS).map(([id, gd]) => `<button type="button" class="${g.type === id ? 'on' : ''}" data-action="presidentGoal" data-value="${id}" aria-pressed="${g.type === id}">${gd.name}</button>`).join('')}</div><small>${tr('Ein Ziel, das der Trainer verfehlt, drückt seine Laune.', 'A target the manager misses dents his morale.')}</small>` : `<small>${tr('Das Ziel steht bis zum Zwischenzeugnis fest.', 'The target is fixed from the half-term report on.')}</small>`}`
      : `<p class="empty">${tr('Zurzeit läuft kein Saisonziel.', 'No season target at the moment.')}</p>`;
    const log = legacy(c).hiredLog ?? [];
    const why = { fired: tr('entlassen', 'sacked'), quit: tr('hingeworfen', 'quit'), unpaid: tr('nicht bezahlt', 'unpaid'), poached: tr('abgeworben', 'poached') };
    return `<div class="office ui-stack">
      <p class="lead">${tr(`Du bist Präsident von ${esc(club.name)}. Du entscheidest über Geld, Ausbau, Sponsoren und Saisonziele – der Trainer über Aufstellung und Taktik. Die Spiele schaust du von der Tribüne oder im Liveticker.`, `You are president of ${esc(club.name)}. You decide on money, expansion, sponsors and season targets – the manager decides on line-up and tactics. You watch the games from the stand or on the live ticker.`)}</p>
      <h4>${tr('Trainer', 'Manager')}</h4>
      ${coach}
      <h4>${tr('Saisonziel', 'Season target')}</h4>
      ${goals}
      <h4>${tr('Geld und Ausbau', 'Money and expansion')}</h4>
      <p class="t-2">${tr('Kasse', 'Kitty')}: <b>${euro(c.cash)}</b>${h ? tr(` · Trainerlohn ${euro(weeklySalary(c))} pro Woche`, ` · manager wages ${euro(weeklySalary(c))} a week`) : ''}</p>
      <div class="ui-row"><button type="button" data-action="tab" data-value="cash">${tr('Kasse und Sponsoren', 'Kitty and sponsors')}</button><button type="button" data-action="tab" data-value="club">${tr('Ausbau im Verein', 'Club expansion')}</button></div>
      ${log.length ? `<h4>${tr('Frühere Trainer', 'Former managers')}</h4><ul class="plain">${log.map((l) => `<li>${esc(l.name)} (${tr('Saison', 'season')} ${l.from}–${l.to}, ${why[l.why] ?? l.why})</li>`).join('')}</ul>` : ''}
    </div>`;
  },
};

