// Hobby-Schiri: läuft dem Spiel hinterher, sieht nicht alles und hat so
// seine Eigenheiten. Ohne Schiri (Parkplatz & Co.) entscheiden die Spieler.
import { tr } from '../core/i18n.js';
import { clamp, dist2d, len, norm } from '../core/math.js';
import { SKIN_TONES } from '../data/names.js';
import { personIdentity, skinIndex } from '../data/origins.js';
import { hasTrait } from '../data/traits.js';
import { switchToNearestOnTeam } from './players.js';

// sees: Sichtchance, cards: Gelbe-Karten-Strenge, dissent: Meckern-Karten, red: Strenge bei groben Fouls (direkte Rote),
// advantage: Neigung zum Vorteil (Faktor auf FOUL.advantage in fouls.js). Alle Faktoren gewählt, nicht gemessen:
// Reihenfolge der Strenge stimmt mit dem Namen überein; Messung der Wirkung steht im Bericht (scripts/foul-audit.mjs).
export const REF_TRAITS = {
  pingelig: { name: tr('pingelig', 'fussy'), sees: 0.97, cards: 1.5, dissent: 0.25, red: 1.4, advantage: 0.4 },
  laesst_laufen: { name: tr('lässt gern laufen', 'lets it flow'), sees: 0.7, cards: 0.5, dissent: 0.05, red: 0.7, advantage: 1.5 },
  kurzsichtig: { name: tr('kurzsichtig', 'short-sighted'), sees: 0.55, cards: 1, dissent: 0.1, red: 1, advantage: 0.9 },
  souveraen: { name: tr('souverän', 'in control'), sees: 0.9, cards: 1, dissent: 0.12, red: 1, advantage: 1.15 },
  zuschauer: { name: tr('Zuschauer mit Pfeife', 'spectator with a whistle'), sees: 0.6, cards: 0.7, dissent: 0.3, red: 0.6, advantage: 0.6 }, // springt nur ein
};

export function createReferee(rng) {
  const trait = rng.pick(Object.keys(REF_TRAITS).filter((k) => k !== 'zuschauer'));
  const id = personIdentity(rng, rng.int(28, 62));
  return {
    name: id.name,
    trait,
    look: { skin: SKIN_TONES[skinIndex(rng, id.origin)], hair: 0x3a3a3a, bald: rng.chance(0.6), beard: rng.chance(0.4), belly: rng.range(0.3, 0.9), height: rng.range(0.95, 1.05) },
    pos: { x: -3, z: -4 },
    vel: { x: 0, z: 0 },
    facing: { x: 1, z: 0 },
    cardAnim: 0,
  };
}

// Er läuft schräg hinter dem Ball her, auf der Kameraseite gegenüber.
export function stepReferee(m, dt) {
  const r = m.referee;
  if (!r) return;
  r.cardAnim = Math.max(0, r.cardAnim - dt);
  const { ball, pitch } = m;
  const tx = clamp(ball.pos.x - Math.sign(ball.vel.x || 1) * 5, -pitch.halfLength + 2, pitch.halfLength - 2);
  const tz = clamp(ball.pos.z - 5, -pitch.halfWidth + 1, pitch.halfWidth - 1);
  const dx = tx - r.pos.x;
  const dz = tz - r.pos.z;
  const d = len(dx, dz);
  const speed = Math.min(5.5, d * 1.5);
  const dir = norm(dx, dz);
  r.vel.x = d > 0.3 ? dir.x * speed : r.vel.x * 0.8;
  r.vel.z = d > 0.3 ? dir.z * speed : r.vel.z * 0.8;
  r.pos.x += r.vel.x * dt;
  r.pos.z += r.vel.z * dt;
  r.facing = norm(ball.pos.x - r.pos.x, ball.pos.z - r.pos.z);
}

// Hat er das Foul gesehen? Je weiter weg, desto unsicherer.
export function refereeSees(m, spot) {
  const r = m.referee;
  if (!r) return true;
  const t = REF_TRAITS[r.trait];
  const d = dist2d(r.pos, spot);
  return m.rng.chance(clamp(t.sees - Math.max(0, d - 12) * 0.02, 0.2, 0.99));
}

// Karte nach einem gepfiffenen Foul. severity: 0..1
export function judgeFoul(m, offender, severity) {
  const card = decideCard(m, offender, severity);
  if (card) showCard(m, offender, card);
}

// Welche Karte gibt es für dieses Foul? Gibt null (keine) oder { color: 'yellow' | 'red', reason } zurück.
// opts.dogso: Notbremse (letzter Mann, klare Torchance); opts.attempt: Versuch, den Ball zu spielen (im Strafraum wird die
// Notbremse dann nur Gelb – IFAB Regel 12); opts.penalty: Foul im Strafraum; opts.serious: Wahrscheinlichkeit grobes Foulspiel.
// Der Wurf für „grob" nutzt rng.next(), damit er unabhängig vom Gelb-Wurf (rng.chance) bleibt.
export function decideCard(m, offender, severity, opts = {}) {
  const r = m.referee;
  if (!r) return null;
  const t = REF_TRAITS[r.trait];
  // Notbremse: Der Schiri bewertet die Lage (Abstand, Richtung, Ballkontrolle) nicht immer als klare Torchance.
  if (opts.dogso && !(opts.penalty && opts.attempt) && m.rng.next() < clamp(0.85 * t.red, 0, 1)) return { color: 'red', reason: 'dogso' };
  if (opts.serious && m.rng.next() < opts.serious * t.red * (m.derby ? 1.3 : 1)) return { color: 'red', reason: 'serious' };
  if (m.rng.chance(clamp(severity * t.cards * (m.derby ? 1.3 : 1) * (opts.dogso ? 2 : 1), 0, 0.95))) return { color: 'yellow', reason: 'foul' };
  return null;
}

// Karte zeigen. late: erst nach dem Vorteil gezeigt.
export function showCard(m, p, card, late = false) {
  if (!m.players.includes(p)) return;
  if (card.color === 'red') redCard(m, p, card.reason, late);
  else book(m, p, card.reason, late);
}

// Meckern beim Schiri kann teuer werden.
export function judgeDissent(m, p) {
  const r = m.referee;
  if (!r) return;
  const t = REF_TRAITS[r.trait];
  if (m.rng.chance(t.dissent * (hasTrait(p, 'meckerer') ? 1 : 0.5))) book(m, p, 'meckern');
}

function book(m, p, reason, late = false) {
  const r = m.referee;
  r.cardAnim = 1.2;
  p.yellow = (p.yellow ?? 0) + 1;
  if (p.yellow >= 2) {
    m.events.push({ type: 'card', color: 'yellowred', playerId: p.id, reason, late });
    sendOff(m, p);
  } else {
    m.events.push({ type: 'card', color: 'yellow', playerId: p.id, reason, late });
  }
}

// Direkte Rote Karte: reason 'dogso' (Notbremse), 'serious' (grobes Foulspiel).
export function redCard(m, p, reason, late = false) {
  const r = m.referee;
  if (r) r.cardAnim = 1.2;
  m.events.push({ type: 'card', color: 'red', playerId: p.id, reason, late });
  sendOff(m, p);
}

export function sendOff(m, p) {
  const i = m.players.indexOf(p);
  if (i < 0) return;
  m.players.splice(i, 1);
  m.sentOff.push(p);
  p.pending = null;
  if (m.ball.holder === p.id) m.ball.holder = null;
  if (m.controlledId === p.id) switchToNearestOnTeam(m, p.team);
}
