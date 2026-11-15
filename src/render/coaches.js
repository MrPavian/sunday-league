// Trainer an der Seitenlinie (ROADMAP 11.18 Punkt 16, vom Nutzer gewünscht 2026-11-15) – nur Darstellung, ohne three.js und DOM
// (tests/coaches.test.js). Beide Trainer stehen in ihrer Coaching-Zone an der oberen Seitenlinie (z > 0): Die untere liegt im
// Querformat hinter der Bedienleiste (Screenshot 2026-11-15). Nur auf den kleinen Plätzen; auf Sportplatz und Großfeld liegt keine
// Seitenlinie im Bild. Sie rufen
// rein, zeigen Laufwege, jubeln und ärgern sich. Je heißer die Rivalität der Trainer (match.coachHeat, 0–5), desto wilder; beim
// Zusammenstoß (sim/coachclash.js: Ereignis coachclash) gehen beide aufeinander zu und brüllen sich Nase an Nase an.
// Abstände, Tempo und Dauer sind Spielwerte.

// Abstand hinter der Seitenlinie (m): Coaching-Zone, vor Linienrichter (1,7 m) und Bande.
// Nur auf den Vereinsplätzen (Rasen- und Ascheplatz): Park und Parkplatz haben keine Trainerbänke.
const ZONE = { rasenplatz: 0.9, ascheplatz: 0.9 };
// Die Mannschaftsbank steht 1 m hinter dem Trainer (vom Nutzer: Trainer stehen vor ihren Bänken, 2026-11-15).
export const BENCH_BEHIND = 1.0;
export const coachVenues = () => Object.keys(ZONE);
export const COACH = { x: 0.2, walk: 2.6, gap: 0.7, clash: 5.5 };

// Ort je Mannschaft: Mannschaft 0 links (x < 0), 1 rechts – auf Höhe der eigenen Hälfte, nah an der Mittellinie.
export function coachSpots(match) {
  const pitch = match?.pitch;
  if (!pitch || !(pitch.id in ZONE)) return null;
  const z = pitch.halfWidth + ZONE[pitch.id]; // obere Seitenlinie: die untere verdeckt im Querformat die Bedienleiste
  return [0, 1].map((team) => ({ team, x: (team === 0 ? -1 : 1) * pitch.halfLength * COACH.x, z }));
}

const hash = (...parts) => parts.reduce((h, x) => (Math.imul(h ^ (Number(x) | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x1b873593);
const SKINS = [0xf1d0b5, 0xe6b894, 0xd29f7a, 0xb57c55, 0x8d5a3b];
const HAIRS = [0x2a1d14, 0x4a3222, 0x7a5230, 0x8a8a8a, 0x1a1a1a];
// Aussehen fest aus Spiel und Mannschaft (oder aus der Karriere: match.coachLooks[team]).
export function coachLook(match, team) {
  const given = match?.coachLooks?.[team];
  if (given) return { height: 1, belly: 0.2, ...given };
  const h = hash(match?.seed ?? 1, team, 77);
  return { skin: SKINS[h % SKINS.length], hair: HAIRS[(h >>> 4) % HAIRS.length], bald: (h >>> 8) % 10 < 3, beard: (h >>> 12) % 10 < 4, belly: 0.1 + ((h >>> 16) % 30) / 100, height: 0.97 + ((h >>> 20) % 6) / 100 };
}
// Trainingsanzug in der Trikotfarbe, lange Hose.
export const coachKit = (shirt = 0x2f6fb5) => ({ shirt, shorts: 0x232a33, socks: 0x1c1c1c, trousers: true });

// Ruhe: rufen, zeigen, scheuchen, dazwischen still. Ab Hitze 2 auch abwinken und reklamieren.
const IDLE = [[2.2, 'call'], [6, null], [8, 'zeigen'], [12, null], [14, 'scheuchen'], [20, null]];
const IDLE_HOT = [[2.2, 'call'], [4.5, 'abwinken'], [7, null], [9, 'zeigen'], [11, 'reklamieren'], [15, null]];
export function coachIdle(t, heat = 0) {
  const list = heat >= 2 ? IDLE_HOT : IDLE;
  const len = list[list.length - 1][0];
  const u = ((t % len) + len) % len;
  return list.find(([end]) => u < end)[1];
}

// Reaktion auf ein Ereignis des Spiels (Geste, Dauer, Vorrang). teamOf: Spieler-ID → Mannschaft.
export function coachCue(team, e, teamOf, heat = 0) {
  const cue = (gesture, time, prio, face) => ({ gesture, time, prio, ...(face ? { face } : {}) });
  switch (e.type) {
    case 'goal': {
      const sc = e.ownGoal ? 1 - e.team : e.team;
      return sc === team ? cue('faust', 3, 3, 'happy') : heat >= 2 ? cue('abwinken', 2.5, 3, 'angry') : cue('kopfschuetteln', 2.5, 3, 'sad');
    }
    case 'foul':
      if (teamOf(e.victimId) === team) return heat >= 3 ? cue('schimpfen', 2.2, 2, 'angry') : cue('reklamieren', 2, 2, 'angry');
      return teamOf(e.playerId) === team ? cue('unschuld', 1.6, 1) : null;
    case 'card':
      return teamOf(e.playerId) === team ? cue('reklamieren', 2.2, 2, 'angry') : null;
    case 'coachclash':
      return cue('schimpfen', COACH.clash, 4, 'angry');
    case 'coachcard':
      return e.team === team ? cue(e.color === 'red' ? 'abgang' : 'unschuld', 2.5, 5, 'angry') : null;
    default:
      return null;
  }
}

// Ziel des Trainers: seine Zone – oder beim Zusammenstoß die Mitte zwischen beiden Zonen, Nase an Nase.
export function coachTarget(spot, team, clashing) {
  if (!clashing) return { x: spot.x, z: spot.z };
  return { x: (team === 0 ? -1 : 1) * COACH.gap / 2, z: spot.z };
}

// Spielertrainer: Seine Figur an der Seitenlinie gibt es nur, solange er nicht auf dem Platz steht (Bank, ausgewechselt). Vom Platz
// gestellt geht er ganz (match.sentOff).
export function coachOnTouchline(match, team) {
  const pc = match?.playerCoach;
  if (!pc || pc.team !== team) return true;
  const here = (list) => (list ?? []).some((p) => p.team === team && p.poolIndex === pc.idx);
  return !here(match.players) && !here(match.sentOff);
}
