// Taktik im Spiel umschalten (ROADMAP 11.17 #7, z. B. „ab Minute 70 mauern“): Vor dem Spiel legt der Trainer bis zu
// SWITCH_MAX Regeln fest – ab Minute X, wenn der Spielstand passt, auf eine gespeicherte Taktik-Vorlage umschalten. Im Spiel
// lässt sich jede Vorlage auch sofort ausspielen. Umgestellt wird mit denselben Werkzeugen wie von Hand (plan.js): Stil,
// System, Spielplan-Befehle. Kein Bonus, kein Zufall – ohne Regeln ändert sich am Spiel nichts (Golden-Test).
// Die Minute zählt auf 90 gerechnet (minute90), damit „ab 70“ auf jedem Platz dieselbe Spielphase meint.
import { footballMinute, minute90 } from './minute.js';
import { tr } from '../core/i18n.js';
import { ORDER_GROUPS, setOrder, setStyle, setSystem } from './plan.js';

export const SWITCH_MAX = 2; // Spielwert
export const SWITCH_MINUTES = [30, 45, 60, 65, 70, 75, 80, 85]; // Spielwert: Auswahl im Vereinsheim
export const SWITCH_WHEN = ['any', 'lead', 'draw', 'behind'];

export const whenLabel = (w) =>
  ({ any: tr('egal wie es steht', 'whatever the score'), lead: tr('bei Führung', 'when leading'), draw: tr('bei Unentschieden', 'when level'), behind: tr('bei Rückstand', 'when behind') })[w] ?? w;

// Passt der Spielstand zur Bedingung?
export function scoreHolds(m, team, when) {
  const d = m.score[team] - m.score[1 - team];
  if (when === 'lead') return d > 0;
  if (when === 'draw') return d === 0;
  if (when === 'behind') return d < 0;
  return true;
}

// Eine aufgelöste Vorlage ({ style, system, orders }) übernehmen. Befehle, die die Vorlage nicht hat, fallen weg.
export function applyTactic(m, team, t, by = 'switch') {
  if (t.style) setStyle(m, team, t.style);
  if (t.system) setSystem(m, team, t.system, { by });
  for (const g of ORDER_GROUPS) setOrder(m, team, g, t.orders?.[g] ?? null, { by });
}

// Regeln für ein Spiel vorbereiten (Kopie, nach Minute sortiert – die spätere Regel gewinnt, wenn beide gleichzeitig greifen).
export const prepareSwitches = (list) => (Array.isArray(list) ? list.filter((s) => s && Number.isFinite(s.minute)).map((s) => ({ ...s, done: false })).sort((a, b) => a.minute - b.minute) : []);

export function stepSwitches(m, team) {
  const list = m.switches?.[team];
  if (!list?.length || m.phase !== 'play') return;
  const min = minute90(m);
  for (const sw of list) {
    if (sw.done || min < sw.minute || !scoreHolds(m, team, sw.when)) continue;
    sw.done = true;
    applyTactic(m, team, sw, 'switch');
    m.events.push({ type: 'tactic_switch', team, name: sw.name, minute: footballMinute(m) });
  }
}

// Im Spiel: eine Regel streichen (sie greift dann nicht mehr).
export function cancelSwitch(m, team, i) {
  const sw = m.switches?.[team]?.[i];
  if (!sw || sw.done) return false;
  sw.done = true;
  sw.cancelled = true;
  return true;
}
