// Trainer-Modus: Man steht an der Seitenlinie. Die eigene Mannschaft spielt selbst
// (KI), der Trainer gibt Befehle – wie gut sie umgesetzt werden, hängt an den Jungs
// (plan.js).
import { tr } from '../core/i18n.js';
import { orderOf, setOrder } from './plan.js';

// Schnellbefehle (Knöpfe 1–4): jeder schaltet einen dauerhaften Befehl an oder aus.
// Die Wirkung steht im Spielplan (plan.js) – hier nur Knopf und Zuordnung.
export const SHOUTS = {
  press: { label: tr('Geht drauf!', 'Press them!'), short: tr('Pressing', 'Press'), key: 'Digit1', order: ['press', 'hoch'] },
  back: { label: tr('Hinten dicht!', 'Shut up shop!'), short: tr('Hinten dicht', 'Defend'), key: 'Digit2', order: ['press', 'tief'] },
  forward: { label: tr('Rückt auf!', 'Push up!'), short: tr('Aufrücken', 'Push up'), key: 'Digit3', order: ['shape', 'aufruecken'] },
  wide: { label: tr('Über die Flügel!', 'Use the wings!'), short: tr('Flügel', 'Wings'), key: 'Digit4', order: ['route', 'aussen'] },
};
export const SHOUT_IDS = Object.keys(SHOUTS);
const COOLDOWN = 1.5; // Heiser wird man trotzdem

// team: welche Mannschaft man coacht (3D-Trainer: die eigene = Team 0; im Liveticker
// auch die Gäste). Die Schwierigkeit hängt weiter nur an humanTeam.
export function enableManager(m, team = m.humanTeam) {
  if (team === null || team === undefined) return m;
  m.manager = true;
  m.coachTeam = team;
  m.mentality ??= 'normal';
  if (m.humanTeam !== null) m.controlledId = null;
  m.shouts = {};
  m.lastShout = -9;
  return m;
}

// Reinrufen: Befehl an (oder, noch mal gerufen, wieder aus). Gibt false zurück, wenn
// man gerade erst gerufen hat. force: der Liveticker ruft ohne Heiserkeitspause und
// schaltet nur an, nie aus.
export function shout(m, type, { force = false } = {}) {
  if (typeof type === 'number') type = SHOUT_IDS[type - 1]; // Zifferntasten 1–4
  if (!m.manager || !SHOUTS[type] || (!force && m.time - m.lastShout < COOLDOWN)) return false;
  m.lastShout = m.time;
  const [group, value] = SHOUTS[type].order;
  const on = force || orderOf(m, m.coachTeam, group) !== value;
  setOrder(m, m.coachTeam, group, on ? value : null);
  // Gegenteile heben sich auf.
  if (on && type === 'back') setOrder(m, m.coachTeam, 'shape', null);
  if (on && type === 'forward' && orderOf(m, m.coachTeam, 'press') === 'tief') setOrder(m, m.coachTeam, 'press', null);
  m.events.push({ type: 'shout', shout: type, on });
  return true;
}

// Grundausrichtung aus der Kabine (Liveticker): gilt das ganze Spiel.
export function heeds(m, p, type) {
  if (!m.manager || p.team !== m.coachTeam) return false;
  if (type === 'back') return m.mentality === 'defensive';
  if (type === 'forward') return m.mentality === 'offensive';
  return false;
}

export const activeShouts = (m) => (m.manager ? SHOUT_IDS.filter((id) => orderOf(m, m.coachTeam, SHOUTS[id].order[0]) === SHOUTS[id].order[1]) : []);

export const MENTALITIES = {
  defensive: tr('defensiv', 'defensive'),
  normal: tr('normal', 'balanced'),
  offensive: tr('offensiv', 'attacking'),
};
export function setMentality(m, value) {
  if (MENTALITIES[value]) m.mentality = value;
}
