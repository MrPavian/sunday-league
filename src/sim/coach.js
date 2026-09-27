// Trainer-Modus: Man steht an der Seitenlinie und ruft rein. Die eigene Mannschaft
// spielt selbst (KI), die Zurufe schieben sie in eine Richtung – sofern die Jungs
// zuhören. Ballzurufe (Abspielen, Schießen) gelten für den nächsten Ballführer,
// taktische Zurufe ein paar Sekunden lang.
import { tr } from '../core/i18n.js';

export const SHOUTS = {
  // Nur echte Ansagen, die ein paar Minuten wirken – keine Ballmomente („Hau drauf!"),
  // die vorbei sind, bevor der Ruf ankommt.
  press: { label: tr('Geht drauf!', 'Press them!'), short: tr('Pressing', 'Press'), key: 'Digit1', secs: 10 },
  back: { label: tr('Hinten dicht!', 'Shut up shop!'), short: tr('Hinten dicht', 'Defend'), key: 'Digit2', secs: 12 },
  forward: { label: tr('Rückt auf!', 'Push up!'), short: tr('Aufrücken', 'Push up'), key: 'Digit3', secs: 12 },
  wide: { label: tr('Über die Flügel!', 'Use the wings!'), short: tr('Flügel', 'Wings'), key: 'Digit4', secs: 12 },
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

// Reinrufen. Gibt false zurück, wenn man gerade erst gerufen hat.
// secs/force: der Liveticker ruft länger und ohne Heiserkeitspause.
export function shout(m, type, { secs = null, force = false } = {}) {
  if (typeof type === 'number') type = SHOUT_IDS[type - 1]; // Zifferntasten 1–4
  if (!m.manager || !SHOUTS[type] || (!force && m.time - m.lastShout < COOLDOWN)) return false;
  m.lastShout = m.time;
  m.shouts[type] = m.time + (secs ?? SHOUTS[type].secs);
  // Gegenteile heben sich auf.
  if (type === 'back') delete m.shouts.forward;
  if (type === 'forward') delete m.shouts.back;
  m.events.push({ type: 'shout', shout: type });
  return true;
}

// Hört dieser Spieler gerade auf einen Zuruf? Wer gut Fußball spielt, setzt ihn eher um.
export function heeds(m, p, type) {
  if (!m.manager || p.team !== m.coachTeam) return false;
  // Grundausrichtung aus der Kabine gilt das ganze Spiel.
  if (type === 'back' && m.mentality === 'defensive' && !(m.shouts?.forward > m.time)) return true;
  if (type === 'forward' && m.mentality === 'offensive' && !(m.shouts?.back > m.time)) return true;
  const until = m.shouts?.[type];
  return until != null && m.time < until;
}

export const activeShouts = (m) => (m.shouts ? SHOUT_IDS.filter((id) => m.time < (m.shouts[id] ?? -1)) : []);

export const MENTALITIES = {
  defensive: tr('defensiv', 'defensive'),
  normal: tr('normal', 'balanced'),
  offensive: tr('offensiv', 'attacking'),
};
export function setMentality(m, value) {
  if (MENTALITIES[value]) m.mentality = value;
}
