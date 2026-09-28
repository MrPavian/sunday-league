// Verletzungen im Spiel: Nach einem Foul bleibt einer liegen, manchmal zwickt es
// ohne Gegner im Oberschenkel. Kleinere Sachen („Prellung") spielt man humpelnd
// zu Ende, alles Ernstere heißt: runter. Die Diagnose danach in der Karriere passt
// dazu (gleiche Arten wie in career/injuries.js).
import { tr } from '../core/i18n.js';
import { clamp } from '../core/math.js';
import { hasTrait } from '../data/traits.js';

// leave: Wahrscheinlichkeit, dass er nicht weiterspielen kann. contact/noncontact: Gewichte.
export const MATCH_INJURIES = {
  prellung: { label: tr('Prellung', 'bruise'), leave: 0.15, contact: 40, noncontact: 0 },
  zerrung: { label: tr('Zerrung', 'strain'), leave: 0.55, contact: 12, noncontact: 55 },
  baender: { label: tr('umgeknickt', 'twisted ankle'), leave: 0.85, contact: 22, noncontact: 15 },
  muskelfaser: { label: tr('Muskelfaserriss', 'torn muscle fibre'), leave: 1, contact: 4, noncontact: 18 },
  meniskus: { label: tr('Knie verdreht', 'twisted knee'), leave: 1, contact: 4, noncontact: 6 },
  kreuzband: { label: tr('Knie – sieht nicht gut aus', 'knee – does not look good'), leave: 1, contact: 2.5, noncontact: 2 },
  achilles: { label: tr('Achillessehne', 'Achilles tendon'), leave: 1, contact: 0.5, noncontact: 2 },
};

// Wie oft? Pro Foul und – ohne Gegnereinwirkung – pro Spieler und Minute.
const FOUL_CHANCE = 0.07;
const NONCONTACT_PER_MINUTE = 0.0025;

function rollKind(rng, key) {
  const entries = Object.entries(MATCH_INJURIES);
  let r = rng.next() * entries.reduce((s, [, i]) => s + i[key], 0);
  for (const [id, i] of entries) if ((r -= i[key]) < 0) return id;
  return 'prellung';
}

function hurt(m, p, kind) {
  const def = MATCH_INJURIES[kind];
  const tough = hasTrait(p, 'hart_im_nehmen');
  const leave = m.rng.chance(def.leave * (tough ? 0.6 : 1));
  // Wer schon angeschlagen war, macht nicht zweimal weiter.
  const out = leave || !!p.knock;
  p.knock = { kind, out, time: m.time };
  p.state = 'down';
  p.stateTimer = out ? 4 : 2.2;
  p.pending = null;
  p.charging = false;
  p.charge = 0;
  if (out) p.mustLeave = true;
  m.events.push({ type: 'injury', playerId: p.id, team: p.team, kind, out });
  return out;
}

// Nach einem gepfiffenen Foul: Hat sich der Gefoulte wehgetan?
export function foulInjury(m, victim, { hard = false } = {}) {
  if (m.noKnocks || (victim.role === 'gk' && !hard)) return false;
  const chance = FOUL_CHANCE * (hard ? 2.2 : 1) * (m.derby ? 1.2 : 1) * (m.pitch.surface.hard ? 1.2 : 1);
  if (!m.rng.chance(chance)) return false;
  hurt(m, victim, rollKind(m.rng, 'contact'));
  return true;
}

// Harte Landung nach Fall- oder Seitfallzieher: meist eine Prellung, selten mehr.
// Gibt true zurück, wenn er liegen bleibt (dann unterbricht der Schiri gleich).
export function acroInjury(m, p) {
  if (m.noKnocks) return false;
  const r = m.rng.next();
  const kind = r < 0.75 ? 'prellung' : r < 0.9 ? 'zerrung' : 'baender';
  const out = hurt(m, p, kind);
  if (out) m.knockStop = m.time + 3;
  return true;
}

// Ohne Gegner: Zerrung beim Sprint, umgeknickt auf holprigem Boden. Müde Beine
// und ältere Knochen erwischt es öfter.
export function stepKnocks(m, dt) {
  if (m.phase !== 'play' || m.noKnocks) return;
  const perSec = NONCONTACT_PER_MINUTE / 60;
  for (const p of m.players) {
    if (p.state !== 'normal' || p.role === 'gk' || p.mustLeave) continue;
    const tired = 1 + clamp(0.6 - p.stamina, 0, 0.6) * 2;
    const old = p.age >= 33 ? 1.5 : 1;
    const bumpy = (m.pitch.surface.bumpiness ?? 0) > 0.3 ? 1.3 : 1;
    if (m.rng.chance(perSec * dt * tired * old * bumpy)) {
      if (hurt(m, p, rollKind(m.rng, 'noncontact'))) m.knockStop = m.time + 3; // Schiri unterbricht gleich
    }
  }
}

// Wie schnell läuft ein Angeschlagener noch?
export const knockSpeed = (p) => (p.mustLeave ? 0.45 : p.knock ? 0.9 : 1);
