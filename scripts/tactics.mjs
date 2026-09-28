// Was bewirken die Trainerbefehle? Team 0 bekommt einen Befehl, sonst alles gleich
// (gleiche Seeds, gleiche Gegner). node scripts/tactics.mjs [N] [pitch] [orders…]
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { setOrder } from '../src/sim/plan.js';

const N = Number(process.argv[2] ?? 20);
const pitch = PITCHES[process.argv[3] ?? 'ascheplatz'];
const list = process.argv.slice(4).length ? process.argv.slice(4) : ['-', 'side:left', 'side:right', 'route:aussen', 'route:mitte', 'route:tiefe', 'route:konter', 'press:hoch', 'press:mittel', 'press:tief', 'build:halten', 'build:kurz', 'build:direkt', 'risk:sicher', 'risk:aggressiv', 'shape:kompakt', 'shape:aufruecken', 'shape:stuermer_fallen', 'guard:konter', 'guard:aussen', 'cover:left', 'tempo:schnell'];

export function run(orders, seeds = N, pt = pitch, oppOrders = []) {
  const acc = { goals: 0, against: 0, shots: 0, shotsAgainst: 0, left: 0, right: 0, centre: 0, entries: 0, winsHigh: 0, stamina: 0, oppBuilds: 0, oppThrough: 0, passes: 0, done: 0, through: 0, throughDone: 0, box: 0, poss: 0, side: 0, sideN: 0 };
  for (let i = 0; i < seeds; i++) {
    const m = createMatch({ seed: 700 + i, pitch: pt, human: false, duration: matchDuration(pt) });
    for (const o of orders) if (o !== '-') setOrder(m, 0, ...o.split(':'));
    for (const o of oppOrders) setOrder(m, 1, ...o.split(':'));
    while (m.phase !== 'ended') { stepMatch(m, undefined, 1 / 60); m.events.length = 0; }
    const L = m.log;
    acc.goals += m.score[0]; acc.against += m.score[1];
    acc.shots += m.stats.teams[0].shots; acc.shotsAgainst += m.stats.teams[1].shots;
    for (const p of L.poss) if (p.team === 0 && p.entryLane) { acc[p.entryLane]++; acc.entries++; }
    for (const x of L.samples) if (x.poss === 0) { acc.side += x.ballSide[0]; acc.sideN++; }
    acc.box += L.poss.filter((p) => p.team === 0 && p.box).length;
    acc.poss += m.stats.teams[0].possession / (m.stats.teams[0].possession + m.stats.teams[1].possession);
    acc.winsHigh += L.turnovers.filter((t) => t.to === 0 && t.third === 'att').length;
    acc.stamina += m.players.filter((p) => p.team === 0 && p.role !== 'gk').reduce((s, p) => s + p.stamina, 0) / m.players.filter((p) => p.team === 0 && p.role !== 'gk').length;
    const ob = L.poss.filter((p) => p.team === 1 && p.startThird === 'def');
    acc.oppBuilds += ob.length; acc.oppThrough += ob.filter((p) => p.maxAdv > 0).length;
    const ps = L.passes.filter((p) => p.team === 0 && p.done !== null);
    acc.passes += ps.length; acc.done += ps.filter((p) => p.done).length;
    acc.through += ps.filter((p) => p.through).length; acc.throughDone += ps.filter((p) => p.through && p.done).length;
  }
  const n = seeds;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  return {
    Tore: `${(acc.goals / n).toFixed(2)}:${(acc.against / n).toFixed(2)}`,
    Schüsse: `${(acc.shots / n).toFixed(1)}:${(acc.shotsAgainst / n).toFixed(1)}`,
    'Besitz%': Math.round((acc.poss / n) * 100),
    'Ballseite': +(acc.side / (acc.sideN || 1)).toFixed(2),
    'L/M/R %': `${pct(acc.left, acc.entries)}/${pct(acc.centre, acc.entries)}/${pct(acc.right, acc.entries)}`,
    Strafraum: +(acc.box / n).toFixed(1),
    'Pass%': pct(acc.done, acc.passes),
    'Tiefe (ok)': `${(acc.through / n).toFixed(1)} (${pct(acc.throughDone, acc.through)}%)`,
    'Gewinne vorn': +(acc.winsHigh / n).toFixed(1),
    'Gegner durch%': pct(acc.oppThrough, acc.oppBuilds),
    Kraft: +(acc.stamina / n).toFixed(2),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = performance.now();
  const rows = {};
  for (const o of list) rows[o] = run(o.split('+'));
  console.table(rows);
  console.log(`${pitch.id}, ${N} Spiele je Zeile, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
}
