// Hochbälle messen: Wie viele Pässe/Befreiungsschläge/lange Bälle gehen hoch, wie viele Schüsse hoch (und von wo),
// wie oft fliegt der Ball über Bandenhöhe an die Wand. Gleiche Seeds vorher/nachher.
//   node scripts/flat-audit.mjs [Spiele=60] [Platz=halle]
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';

const N = Number(process.argv[2] ?? 60);
const venue = process.argv[3] ?? 'halle';
const pitch = PITCHES[venue];
const HIGH = 1.5; // Abwurfsteigung (m/s) ab der ein Ball „hoch" heißt
const BOARD = 0.9; // Bandenhöhe der Halle
const a = { passes: 0, passHigh: 0, passLong: 0, passLongHigh: 0, lofted: 0, cross: 0, shots: 0, shotHigh: 0, shotHighFar: 0, shotFar: 0, boardOver: 0, maxY: 0, maxYWall: 0, goals: 0, keeperRel: 0, keeperRelHigh: 0 };
const NEAR = 8; // „vorm Tor": Abstand zur Torlinie in x
for (let i = 0; i < N; i++) {
  const m = createMatch({ seed: 900 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
  const r = 0.11;
  let wasOver = false;
  while (m.phase !== 'ended') {
    stepMatch(m, undefined, 1 / 60);
    const b = m.ball;
    for (const e of m.events) {
      if (e.type === 'pass') {
        a.passes++;
        const high = b.vel.y > HIGH;
        const d = e.to && e.from ? Math.hypot(e.to.x - e.from.x, e.to.z - e.from.z) : 99;
        if (high) a.passHigh++;
        if (e.lofted) a.lofted++;
        if (e.cross) a.cross++;
        if (d > 12 || !e.to) {
          a.passLong++;
          if (high) a.passLongHigh++;
        }
      } else if (e.type === 'shot') {
        a.shots++;
        const pl = m.players.find((q) => q.id === e.playerId);
        const dx = Math.min(Math.abs(b.pos.x - pitch.halfLength), Math.abs(b.pos.x + pitch.halfLength));
        const far = dx > NEAR;
        if (far) a.shotFar++;
        if (b.vel.y > 2.5) {
          a.shotHigh++;
          if (far) a.shotHighFar++;
        }
      } else if (e.type === 'goal') a.goals++;
    }
    m.events.length = 0;
    a.maxY = Math.max(a.maxY, b.pos.y);
    const atWall = Math.abs(b.pos.z) >= pitch.halfWidth - r - 1e-3 || Math.abs(b.pos.x) >= pitch.wallX - r - 1e-3;
    const over = atWall && b.pos.y > BOARD;
    if (over && !wasOver) {
      a.boardOver++;
      a.maxYWall = Math.max(a.maxYWall, b.pos.y);
    }
    wasOver = over;
  }
}
const per = (x) => (x / N).toFixed(2);
const pc = (x, y) => `${Math.round((100 * x) / Math.max(1, y))} %`;
console.log(`${venue}, ${N} Spiele (Seeds 900+): Pässe ${per(a.passes)} · davon hoch (vy>${HIGH}) ${per(a.passHigh)} (${pc(a.passHigh, a.passes)}) · lofted-Flag ${per(a.lofted)} · Flanken ${per(a.cross)} · lange Pässe (>12 m/ohne Ziel) ${per(a.passLong)}, davon hoch ${per(a.passLongHigh)} (${pc(a.passLongHigh, a.passLong)})`);
console.log(`  Schüsse ${per(a.shots)} · hoch (vy>2,5) ${per(a.shotHigh)} (${pc(a.shotHigh, a.shots)}) · davon weiter als ${NEAR} m vom Tor ${per(a.shotHighFar)} (von ${per(a.shotFar)} Fernschüssen) · Tore ${per(a.goals)}`);
console.log(`  Ball an Wand über Bandenhöhe ${BOARD} m: ${per(a.boardOver)} je Spiel (höchste Stelle ${a.maxYWall.toFixed(2)} m) · höchster Ballpunkt ${a.maxY.toFixed(2)} m`);
