// Hobby-Schiri: läuft dem Spiel hinterher, sieht nicht alles und hat so
// seine Eigenheiten. Ohne Schiri (Parkplatz & Co.) entscheiden die Spieler.
import { tr } from '../core/i18n.js';
import { clamp, dist2d, len, norm } from '../core/math.js';
import { FIRST_NAMES, LAST_NAMES, SKIN_TONES } from '../data/names.js';
import { hasTrait } from '../data/traits.js';
import { switchToNearestOnTeam } from './players.js';

export const REF_TRAITS = {
  pingelig: { name: tr('pingelig', 'fussy'), sees: 0.97, cards: 1.5, dissent: 0.25 },
  laesst_laufen: { name: tr('lässt gern laufen', 'lets it flow'), sees: 0.7, cards: 0.5, dissent: 0.05 },
  kurzsichtig: { name: tr('kurzsichtig', 'short-sighted'), sees: 0.55, cards: 1, dissent: 0.1 },
  souveraen: { name: tr('souverän', 'in control'), sees: 0.9, cards: 1, dissent: 0.12 },
  zuschauer: { name: tr('Zuschauer mit Pfeife', 'spectator with a whistle'), sees: 0.6, cards: 0.7, dissent: 0.3 }, // springt nur ein
};

export function createReferee(rng) {
  const trait = rng.pick(Object.keys(REF_TRAITS).filter((k) => k !== 'zuschauer'));
  return {
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    trait,
    look: { skin: rng.pick(SKIN_TONES), hair: 0x3a3a3a, bald: rng.chance(0.6), beard: rng.chance(0.4), belly: rng.range(0.3, 0.9), height: rng.range(0.95, 1.05) },
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
  const r = m.referee;
  if (!r) return;
  const t = REF_TRAITS[r.trait];
  if (m.rng.chance(clamp(severity * t.cards * (m.derby ? 1.3 : 1), 0, 0.95))) book(m, offender, 'foul');
}

// Meckern beim Schiri kann teuer werden.
export function judgeDissent(m, p) {
  const r = m.referee;
  if (!r) return;
  const t = REF_TRAITS[r.trait];
  if (m.rng.chance(t.dissent * (hasTrait(p, 'meckerer') ? 1 : 0.5))) book(m, p, 'meckern');
}

function book(m, p, reason) {
  const r = m.referee;
  r.cardAnim = 1.2;
  p.yellow = (p.yellow ?? 0) + 1;
  if (p.yellow >= 2) {
    m.events.push({ type: 'card', color: 'yellowred', playerId: p.id, reason });
    sendOff(m, p);
  } else {
    m.events.push({ type: 'card', color: 'yellow', playerId: p.id, reason });
  }
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
