// Gemeinsame Helfer der Vereinsheim-Bildschirme (aus Clubhouse.js herausgelöst, unverändert).
import { tr } from '../../core/i18n.js';
import { leagueOf } from '../../career/career.js';
import { leagueTitle } from '../../career/verband.js';
import { SHARES, tripShare } from '../../career/travel.js';
import { segmented } from '../ds.js';

export const STATUS = { yes: [tr('Zusage', 'In'), 'yes'], no: [tr('Absage', 'Out'), 'no'], late: [tr('Kommt später', 'Coming late'), 'late'], bench: [tr('Auf der Bank', 'On the bench'), 'bench'] };
export { hex } from '../ds.js';
export const first = (name) => name.split(' ')[0];
// Dart: je näher an der Mitte, desto mehr Punkte (max. 60 pro Wurf).
export const dartPoints = (x) => Math.round(60 * Math.max(0, 1 - Math.abs(x)) ** 1.4);
export const formArrow = (f = 0) => (f >= 0.25 ? ` <span class="form up" title="${tr('gut drauf', 'in form')}">▲</span>` : f <= -0.25 ? ` <span class="form down" title="${tr('nicht in Form', 'out of form')}">▼</span>` : '');
// Chat-Zeit „Mo 09:00" → „Mon 09:00".
export const timeLabel = (t) => tr(t, String(t ?? '').replace(/^(Mo|Di|Mi|Do|Fr|Sa|So)\b/, (d) => ({ Mo: 'Mon', Di: 'Tue', Mi: 'Wed', Do: 'Thu', Fr: 'Fri', Sa: 'Sat', So: 'Sun' })[d]));
export const leagueName = (c) => (c.verband ? leagueTitle(c, c.level ?? 1) : leagueOf(c)?.name ?? c.league);
export const euro = (n) => tr(`${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`, `€${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`);

// Zuschuss des Vereins für Abschlussfahrt und Trainingslager (travel.js): 0–100 % des Preises je Person.
export const shareChooser = (c) =>
  `<div class="trip-share" data-testid="trip-share"><small>${tr('Zuschuss des Vereins für Fahrten', 'Club subsidy for trips')}</small> ${segmented('tripShare', SHARES.map((s) => [String(s), `${Math.round(s * 100)} %`]), String(tripShare(c)), { action: 'tripShare' })}</div>`;
