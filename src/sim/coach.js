// Trainer-Modus: Man steht an der Seitenlinie und ruft rein. Die eigene Mannschaft
// spielt selbst (KI), die Zurufe schieben sie in eine Richtung – sofern die Jungs
// zuhören. Ballzurufe (Abspielen, Schießen) gelten für den nächsten Ballführer,
// taktische Zurufe ein paar Sekunden lang.
import { tr } from '../core/i18n.js';

export const SHOUTS = {
  pass: { label: tr('Abspielen!', 'Pass it!'), short: tr('Pass', 'Pass'), key: 'Digit1', secs: 4, ball: true },
  shoot: { label: tr('Hau drauf!', 'Shoot!'), short: tr('Schuss', 'Shoot'), key: 'Digit2', secs: 4, ball: true },
  press: { label: tr('Geht drauf!', 'Press them!'), short: tr('Pressing', 'Press'), key: 'Digit3', secs: 8 },
  mark: { label: tr('Mann decken!', 'Pick up your man!'), short: tr('Decken', 'Mark'), key: 'Digit4', secs: 10 },
  back: { label: tr('Hinten dicht!', 'Shut up shop!'), short: tr('Hinten dicht', 'Defend'), key: 'Digit5', secs: 10 },
  forward: { label: tr('Rückt auf!', 'Push up!'), short: tr('Aufrücken', 'Push up'), key: 'Digit6', secs: 10 },
  wide: { label: tr('Über die Flügel!', 'Use the wings!'), short: tr('Flügel', 'Wings'), key: 'Digit7', secs: 10 },
};
export const SHOUT_IDS = Object.keys(SHOUTS);
const COOLDOWN = 1.5; // Heiser wird man trotzdem

export function enableManager(m) {
  if (m.humanTeam === null) return m;
  m.manager = true;
  m.controlledId = null;
  m.shouts = {};
  m.lastShout = -9;
  return m;
}

// Reinrufen. Gibt false zurück, wenn man gerade erst gerufen hat.
export function shout(m, type) {
  if (typeof type === 'number') type = SHOUT_IDS[type - 1]; // Zifferntasten 1–7
  if (!m.manager || !SHOUTS[type] || m.time - m.lastShout < COOLDOWN) return false;
  m.lastShout = m.time;
  m.shouts[type] = m.time + SHOUTS[type].secs;
  // Gegenteile heben sich auf.
  if (type === 'back') delete m.shouts.forward;
  if (type === 'forward') delete m.shouts.back;
  m.events.push({ type: 'shout', shout: type });
  return true;
}

// Hört dieser Spieler gerade auf einen Zuruf? Wer gut Fußball spielt, setzt ihn eher um.
export function heeds(m, p, type) {
  if (!m.manager || p.team !== m.humanTeam) return false;
  const until = m.shouts?.[type];
  return until != null && m.time < until;
}

// Ballzurufe verbrauchen sich mit der Aktion.
export function consumeShout(m, type) {
  if (m.shouts) delete m.shouts[type];
}

export const activeShouts = (m) => (m.shouts ? SHOUT_IDS.filter((id) => m.time < (m.shouts[id] ?? -1)) : []);
