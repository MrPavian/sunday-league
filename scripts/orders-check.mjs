// Kommt jeder Trainerbefehl an – und wirkt er? Team 0 wird gecoacht (enableManager), bekommt einen Befehl, einen
// einfachen Befehl (SIMPLE) oder eine Grundausrichtung; gleiche Seeds wie ohne Befehl. Je Befehl die Kennzahl, die er
// verändern soll (siehe EXPECT), dazu Tore. Ausgabe: Wert ohne → mit Befehl und Bewertung (richtige Richtung, kaum, falsch).
//   node scripts/orders-check.mjs [N=40] [pitch=rasenplatz] [Teil=0/1]   (Teil k/n: nur jede n-te Zeile ab k, für parallele Läufe)
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { ORDER_GROUPS, setOrder } from '../src/sim/plan.js';
import { ORDERS, SIMPLE, applySimple } from '../src/sim/commands.js';
import { enableManager, setMentality } from '../src/sim/coach.js';
import { attackDir } from '../src/sim/players.js';
import { mirrorLane } from '../src/sim/matchlog.js';

const N = Number(process.argv[2] ?? 40);
const pitchId = process.argv[3] ?? 'rasenplatz';
const pitch = PITCHES[pitchId];
const [part, parts] = (process.argv[4] ?? '0/1').split('/').map(Number);

import { EXPECT } from './orders-check-expect.mjs';

const configs = ['-', ...Object.keys(EXPECT)].filter((_, i) => i === 0 || (i - 1) % parts === part);
// Jede Gruppe aus ORDERS muss hier geprüft werden (sonst fehlt ein Befehl in der Prüfung).
const missing = Object.keys(ORDERS).filter((k) => !EXPECT[k]);
if (missing.length) throw new Error(`Befehle ohne Prüfung: ${missing.join(', ')}`);
if (ORDER_GROUPS.some((g) => !Object.keys(ORDERS).some((k) => k.startsWith(g + ':')))) throw new Error('Gruppe ohne Befehl');

function run(cfg) {
  const a = { goals: 0, against: 0, shots: 0, passes: 0, possMin: 0, passLenSum: 0, long: 0, through: 0, crosses: 0, combos: 0, own: { left: 0, centre: 0, right: 0 }, opp: { left: 0, centre: 0, right: 0 }, wins: 0, winsHigh: 0, countersAg: 0, defX: 0, defN: 0, midX: 0, midN: 0, len: 0, lenN: 0, fwd: 0, fwdN: 0, stamina: 0 };
  for (let i = 0; i < N; i++) {
    const m = createMatch({ seed: 700 + i, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
    enableManager(m, 0);
    if (cfg.startsWith('simple:')) applySimple(m, 0, cfg.slice(7));
    else if (cfg.startsWith('mentality:')) setMentality(m, cfg.slice(10));
    else if (cfg !== '-') setOrder(m, 0, ...cfg.split(':'));
    let tS = 0;
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      for (const e of m.events) {
        const p = e.playerId != null ? m.players.find((x) => x.id === e.playerId) : null;
        if (!p || p.team !== 0) continue;
        if (e.type === 'shot') a.shots++;
        else if (e.type === 'pass') {
          a.passes++;
          if (e.to) {
            const d = Math.hypot(e.to.x - e.from.x, e.to.z - e.from.z);
            a.passLenSum += d;
            if (d > pitch.halfLength * 0.7) a.long++;
          }
          if (e.through) a.through++;
          if (e.cross) a.crosses++;
        } else if (e.type === 'combo') a.combos++;
      }
      m.events.length = 0;
      if (m.phase === 'play' && m.time >= tS) {
        tS = m.time + 1;
        const s = attackDir(m, 0); // je Probe: zur Halbzeit werden die Seiten getauscht
        const own = m.players.filter((p) => p.team === 0 && p.role !== 'gk');
        const ours = m.log?.cur?.team === 0;
        if (!ours) for (const p of own.filter((q) => q.role === 'def')) { a.defX += p.pos.x * s; a.defN++; }
        if (ours) {
          for (const p of own.filter((q) => q.role === 'mid')) { a.midX += p.pos.x * s; a.midN++; }
          for (const p of own.filter((q) => q.role === 'fwd')) { a.fwd += (p.pos.x - m.ball.pos.x) * s; a.fwdN++; }
        }
        const xs = own.map((p) => p.pos.x);
        a.len += Math.max(...xs) - Math.min(...xs);
        a.lenN++;
      }
    }
    a.goals += m.score[0];
    a.against += m.score[1];
    a.stamina += m.players.filter((p) => p.team === 0).reduce((t, p) => t + p.stamina, 0) / m.players.filter((p) => p.team === 0).length;
    for (const p of m.log.poss) {
      if (p.team === 0) {
        a.possMin += (p.end ?? m.time) - p.start;
        if (p.how !== 'kickoff') { a.wins++; if (p.startThird === 'att') a.winsHigh++; }
        if (p.entryLane) a.own[p.entryLane]++;
      } else {
        if (p.entryLane) a.opp[mirrorLane(p.entryLane)]++; // aus unserer Sicht
        if (p.box && (p.startThird === 'def' || p.startThird === 'mid') && (p.end ?? m.time) - p.start < 10 && p.how !== 'kickoff') a.countersAg++;
      }
    }
  }
  const sum = (o) => o.left + o.centre + o.right || 1;
  return {
    goals: a.goals / N, against: a.against / N, shots: a.shots / N,
    pPerMin: a.passes / (a.possMin / 60), passLen: a.passLenSum / a.passes, longShare: a.long / a.passes, through: a.through / N, crosses: a.crosses / N, combos: a.combos / N,
    ownWide: (a.own.left + a.own.right) / sum(a.own), ownLeft: a.own.left / sum(a.own), ownRight: a.own.right / sum(a.own),
    oppWide: (a.opp.left + a.opp.right) / sum(a.opp), oppLeft: a.opp.left / sum(a.opp), oppRight: a.opp.right / sum(a.opp),
    winsHigh: a.winsHigh / (a.wins || 1), countersAg: a.countersAg / N, defX: a.defX / a.defN, midX: a.midX / a.midN, teamLen: a.len / a.lenN, fwdAhead: a.fwd / a.fwdN, stamina: a.stamina / N,
  };
}

const res = Object.fromEntries(configs.map((c) => [c, run(c)]));
console.log(JSON.stringify({ pitch: pitchId, N, res }));
