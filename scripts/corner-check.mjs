// Wo kommen Ecken an? Je Platz N KI-Spiele: nach jeder Ecke (Pass des Schützen) bis zur nächsten Ballberührung oder zum Aus.
// Kennzahlen: Anteil, der von einem Mitspieler/Gegner im Strafraum (penaltyBox, sonst Torwartraum) berührt wird; Anteil ins Aus
// (Seitenaus = über die gegenüberliegende Seitenlinie bzw. hinter die Grundlinie); Tore nach Ecke.
//   node scripts/corner-check.mjs [N=40] [Plätze=ascheplatz,rasenplatz,sportplatz,park]
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { inPenaltyBox } from '../src/sim/actions.js';

const N = Number(process.argv[2] ?? 40);
const venues = (process.argv[3] ?? 'ascheplatz,rasenplatz,sportplatz,park').split(',');
for (const v of venues) {
  const pitch = PITCHES[v];
  const s = { corners: 0, boxTouch: 0, otherTouch: 0, outSide: 0, outEnd: 0, goals: 0, landZ: [], peakY: 0 };
  for (let i = 0; i < N; i++) {
    const m = createMatch({ seed: 500 + i, pitch, human: false });
    let track = null;
    let corner = null; // angesetzte Ecke: { taker, t }
    let kicked = -99; // Zeitpunkt der letzten ausgeführten Ecke (für Tore nach Ecke, auch nach einem Kopfball)
    let kickTeam = null; // Team, das sie ausgeführt hat – nur dessen Tore zählen
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        if (e.type === 'setpiece') corner = e.kind === 'corner' ? { taker: e.playerId, t: m.time } : null;
        if (e.type === 'pass' && corner && e.playerId === corner.taker && !track) {
          track = { t: m.time, kicker: e.playerId, peak: 0 };
          kicked = m.time;
          kickTeam = m.players.find((q) => q.id === e.playerId)?.team ?? null;
          corner = null;
          continue;
        }
        if (e.type === 'goal' && e.team === kickTeam && m.time - kicked < 8) s.goals++; // Tor des ausführenden Teams bis 8 s nach der Ecke
        if (!track) continue;
        if (e.type === 'out') {
          (Math.abs(m.ball.pos.z) > pitch.halfWidth - 0.5 ? s.outSide++ : s.outEnd++);
          s.corners++;
          track = null;
        }
      }
      if (track && m.ball.lastTouch && m.ball.lastTouch !== track.kicker && m.time > track.t + 0.05) {
        const p = m.players.find((q) => q.id === m.ball.lastTouch);
        const goalX = Math.sign(m.ball.pos.x) * pitch.halfLength;
        (inPenaltyBox(pitch, m.ball.pos, goalX, 0.5) ? s.boxTouch++ : s.otherTouch++);
        s.landZ.push(+m.ball.pos.z.toFixed(1));
        s.corners++;
        track = null;
      }
      if (track) track.peak = Math.max(track.peak, m.ball.pos.y);
      m.events.length = 0;
    }
  }
  const pc = (x) => `${Math.round((100 * x) / (s.corners || 1))} %`;
  console.log(`${v}: ${s.corners} Ecken · im Strafraum berührt ${pc(s.boxTouch)} · woanders berührt ${pc(s.otherTouch)} · Seitenaus ${pc(s.outSide)} · Grundlinie ${pc(s.outEnd)} · Tore nach Ecke ${s.goals} (${(100 * s.goals / (s.corners || 1)).toFixed(1)} %)`);
}
