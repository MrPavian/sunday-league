// Abseits (nur auf dem Großfeld, pitch.offside): Entscheidend ist die Stellung im Moment des
// Passes. Wer dann in der gegnerischen Hälfte näher an der Torlinie steht als Ball und
// vorletzter Gegner und den Ball als Nächster spielt, ist abseits – indirekter Freistoß
// dort, wo er stand. Kein Abseits nach Einwurf, Abstoß und Ecke.
//
// In der Bezirksliga gibt es keine Schiedsrichter-Assistenten: Der Schiri allein sieht
// nicht alles (MISS) – mal läuft einer durch, der klar drüber war.
import { attackDir } from './players.js';
import { clampToPitch } from './players.js';

export const LEVEL_TOL = 0.3; // „gleiche Höhe ist kein Abseits" – plus Augenmaß
export const MISS = 0.15; // so oft übersieht der Schiri ohne Assistenten ein Abseits
const NO_OFFSIDE = new Set(['throwin', 'goalkick', 'corner']);

export function markOffside(m, kicker, restart) {
  m.offside = null;
  if (!m.pitch.offside || NO_OFFSIDE.has(restart)) return;
  const s = attackDir(m, kicker.team);
  const bx = m.ball.pos.x * s;
  const opp = m.players.filter((o) => o.team !== kicker.team).map((o) => o.pos.x * s).sort((a, b) => b - a);
  const second = opp[1] ?? m.pitch.halfLength;
  const line = Math.max(second, bx, 0);
  const ids = m.players
    .filter((p) => p.team === kicker.team && p.id !== kicker.id && p.pos.x * s > line + LEVEL_TOL)
    .map((p) => ({ id: p.id, x: p.pos.x, z: p.pos.z }));
  if (ids.length) m.offside = { team: kicker.team, kicker: kicker.id, at: m.time, ids };
}

// Nach den Ballberührungen eines Schritts: Spielt einer aus der Abseitsstellung den Ball?
export function checkOffside(m, startSetPiece) {
  const o = m.offside;
  if (!o) return false;
  const t = m.ball.lastTouch;
  if (m.time - o.at > 6) return !!(m.offside = null);
  if (t === o.kicker) return false;
  const hit = o.ids.find((e) => e.id === t);
  m.offside = null;
  if (!hit) return false; // ein anderer war zuerst am Ball – Abseits erledigt
  if (m.rng.chance(MISS)) {
    m.events.push({ type: 'offside_missed', playerId: t, team: o.team });
    return false;
  }
  m.events.push({ type: 'offside', playerId: t, team: o.team });
  startSetPiece(m, { type: 'freekick', team: 1 - o.team, spot: clampToPitch(m.pitch, hit.x, hit.z, 1) });
  return true;
}
