// Monte-Carlo-Audit der Match-Engine (Trainermodus & Spielgefühl). Nur Messung – die
// Simulation wird nicht verändert, nur Teams/Befehle vorab eingestellt.
//   node scripts/audit.mjs <serie> [spiele] [platz]      z. B.  node scripts/audit.mjs strong 1000
//   node scripts/audit.mjs list                          alle Serien
// Seeds: Spiel i nutzt seed = 10000 + i (Teams: createRng(seed * 7919)), damit jede Serie
// mit denselben Paarungen läuft und nur die Einstellung sich unterscheidet.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { createRng } from '../src/core/rng.js';
import { TEAM_PRESETS } from '../src/data/teams.js';
import { generateTeam, ratePlayer } from '../src/sim/generator.js';
import { systemFormation } from '../src/sim/tactics.js';
import { setOrder } from '../src/sim/plan.js';
import { dist2d } from '../src/core/math.js';
import { attackDir } from '../src/sim/players.js';

// Einstellungen je Serie: str = Zielstärke (Ø Spielerbewertung) je Team, style, orders
// ab Anpfiff, late = { at: Anteil der Spielzeit, orders: { team: [[gruppe, wert], …] }, score? },
// stamina = Startkraft je Team, keeper = Torwartwert je Team, aiCoach.
const O = {
  def: [['press', 'tief'], ['guard', 'konter'], ['risk', 'sicher']],
  off: [['shape', 'aufruecken'], ['risk', 'aggressiv']],
  press: [['press', 'hoch']],
  allin: [['shape', 'aufruecken'], ['risk', 'aggressiv'], ['press', 'hoch']],
};
export const SERIES = {
  natural: {},
  equal: { str: [70, 70] },
  strong: { str: [80, 60] },
  weak: { str: [60, 80] },
  mild: { str: [74, 66] },
  // gleiche Stärke, verschiedene Stile gegen ausgewogen
  st_offensiv: { str: [70, 70], style: ['offensiv', 'ausgewogen'] },
  st_konter: { str: [70, 70], style: ['konter', 'ausgewogen'] },
  st_pressing: { str: [70, 70], style: ['pressing', 'ausgewogen'] },
  st_mauern: { str: [70, 70], style: ['mauern', 'ausgewogen'] },
  st_kurzpass: { str: [70, 70], style: ['kurzpass', 'ausgewogen'] },
  st_fluegel: { str: [70, 70], style: ['fluegel', 'ausgewogen'] },
  // stark mit „schlechter" Taktik (passiv), schwach mit aktiver
  strong_bad: { str: [76, 64], style: ['mauern', 'ausgewogen'], orders: [[['build', 'halten'], ['risk', 'sicher']], []] },
  weak_good: { str: [64, 76], style: ['pressing', 'ausgewogen'] },
  // Schlussphase ab 60 %: Führung/Rückstand + Befehle (Spielstand wird gesetzt)
  lead_none: { str: [70, 70], late: { at: 0.6, score: [1, 0], orders: [[], []] } },
  lead_def: { str: [70, 70], late: { at: 0.6, score: [1, 0], orders: [O.def, []] } },
  lead_off: { str: [70, 70], late: { at: 0.6, score: [1, 0], orders: [O.off, []] } },
  lead_push: { str: [70, 70], late: { at: 0.6, score: [1, 0], orders: [[['shape', 'aufruecken']], []] } },
  lead_aggr: { str: [70, 70], late: { at: 0.6, score: [1, 0], orders: [[['risk', 'aggressiv']], []] } },
  lead_press: { str: [70, 70], late: { at: 0.6, score: [1, 0], orders: [O.press, []] } },
  lead_deep: { str: [70, 70], late: { at: 0.6, score: [1, 0], orders: [[['press', 'tief']], []] } },
  behind_none_k: { str: [70, 70], style: ['ausgewogen', 'konter'], late: { at: 0.6, score: [0, 1], orders: [[], []] } },
  behind_off_k: { str: [70, 70], style: ['ausgewogen', 'konter'], late: { at: 0.6, score: [0, 1], orders: [O.allin, []] } },
  behind_none_o: { str: [70, 70], style: ['ausgewogen', 'offensiv'], late: { at: 0.6, score: [0, 1], orders: [[], []] } },
  behind_off_o: { str: [70, 70], style: ['ausgewogen', 'offensiv'], late: { at: 0.6, score: [0, 1], orders: [O.allin, []] } },
  behind_none: { str: [70, 70], late: { at: 0.6, score: [0, 1], orders: [[], []] } },
  behind_off: { str: [70, 70], late: { at: 0.6, score: [0, 1], orders: [O.allin, []] } },
  behind_def: { str: [70, 70], late: { at: 0.6, score: [0, 1], orders: [O.def, []] } },
  // 0:0 in der „80. Minute" (Rest 11 %)
  late00_none: { str: [70, 70], late: { at: 0.89, score: [0, 0], orders: [[], []] } },
  late00_risk: { str: [70, 70], late: { at: 0.89, score: [0, 0], orders: [O.allin, []] } },
  // Situationskarte „Schlussphase" (78–95 % der Spielzeit): jede Option einzeln ab 80 %
  ...Object.fromEntries([['lead80', [1, 0], [['none'], ['press', 'tief'], ['route', 'konter'], ['build', 'halten'], ['guard', 'konter'], ['tempo', 'ruhig']]],
    ['behind80', [0, 1], [['none'], ['shape', 'aufruecken'], ['risk', 'aggressiv'], ['route', 'tiefe'], ['press', 'hoch'], ['tempo', 'schnell']]],
    ['level80', [0, 0], [['none'], ['shape', 'aufruecken'], ['risk', 'aggressiv'], ['route', 'tiefe'], ['press', 'hoch'], ['tempo', 'schnell']]]].flatMap(([k, score, opts]) =>
    opts.map(([g, v]) => [`${k}_${g === 'guard' ? 'absichern' : g === 'tempo' ? `tempo_${v}` : g === 'press' && v === 'hoch' ? 'pressing' : v ?? g}`, { str: [70, 70], late: { at: 0.8, score, orders: [g === 'none' ? [] : [[g, v]], []] } }]))),
  // Kraft und Torwart
  tired: { str: [70, 70], stamina: [0.55, 1] },
  keeper_good: { str: [70, 70], keeper: [0.9, 0.5] },
  keeper_bad: { str: [70, 70], keeper: [0.3, 0.5] },
  // Kontrollierte Spielerwerte: alle Feldspieler von Team 0 auf einen Wert (Gegner Ø 70)
  ...Object.fromEntries(['passing', 'technique', 'tackling', 'shooting', 'pace', 'stamina'].flatMap((a) => [
    [`${a}_lo`, { str: [70, 70], set: [{ [a]: 0.3 }, null] }],
    [`${a}_mid`, { str: [70, 70], set: [{ [a]: 0.55 }, null] }],
    [`${a}_hi`, { str: [70, 70], set: [{ [a]: 0.8 }, null] }],
  ])),
  // mit KI-Trainern auf beiden Seiten (sonst aus, damit nur die Einstellung wirkt)
  equal_ai: { str: [70, 70], aiCoach: true },
};

const ATTRS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

// Team auf eine Ø-Bewertung schieben: alle Werte um dasselbe Stück (Profil bleibt erhalten).
function setStrength(team, target) {
  for (let k = 0; k < 4; k++) {
    const d = (target - mean(team.players.map(ratePlayer))) / 100;
    for (const p of team.players) for (const a of ATTRS) p.attrs[a] = clamp(p.attrs[a] + d, 0.05, 0.99);
  }
  for (const p of team.players) p.rating = ratePlayer(p);
  return mean(team.players.map((p) => p.rating));
}

function teamsFor(seed, pitch, cfg) {
  const rng = createRng(seed * 7919);
  const roles = [...systemFormation(pitch.format ?? 5).map((f) => f.role), 'def', 'mid', 'fwd'];
  return [0, 1].map((i) => {
    const t = { ...generateTeam(rng, TEAM_PRESETS[i], roles), tactic: { style: cfg.style?.[i] ?? 'ausgewogen' } };
    t.rating = cfg.str ? setStrength(t, cfg.str[i]) : mean(t.players.map(ratePlayer));
    if (cfg.set?.[i]) for (const p of t.players) if (p.position !== 'gk') Object.assign(p.attrs, cfg.set[i]);
    if (cfg.keeper?.[i] != null) for (const p of t.players) if (p.position === 'gk') p.attrs.keeping = cfg.keeper[i];
    return t;
  });
}

const SIX = 6; // Zeitabschnitte (je 15 „Minuten")

// Kennzahlen aus dem Spielprotokoll ab Zeitpunkt t0 (für Schlussphasen-Szenarien).
//   gezielt/gezieltOk – flache Pässe mit Adressat; abgefangen – Pass endet beim Gegner
//   flanken – hohe Bälle im letzten Drittel; aussen – Anteil der Angriffe, die über
//   außen ins letzte Drittel kommen; konterChancen – Schuss ≤ 8 s nach Ballgewinn im eigenen
//   Drittel; verlusteVorne – Ballverlust im letzten Drittel (Gegner gewinnt ihn in seinem).
function windowStats(m, t0) {
  const L = m.log;
  const team = (id) => m.players.find((p) => p.id === id)?.team ?? m.bench.flat().find((p) => p.id === id)?.team;
  const out = {};
  for (const t of [0, 1]) {
    const ps = L.passes.filter((p) => p.team === t && p.t >= t0 && p.done !== null);
    const aimed = ps.filter((p) => p.targetId && !p.lofted);
    const poss = L.poss.filter((p) => p.team === t && p.start >= t0);
    const entries = poss.filter((p) => p.entryLane);
    const shots = L.shots.filter((x) => x.team === t && x.t >= t0);
    const counter = shots.filter((x) => { const q = L.poss[x.possIndex]; return q && q.team === t && q.startThird === 'def' && x.t - q.start < 8; });
    out[t] = {
      paesse: ps.length, gezielt: aimed.length, gezieltOk: aimed.filter((p) => p.done).length,
      abgefangen: ps.filter((p) => !p.done && p.receiver && team(p.receiver) !== t).length,
      tiefe: ps.filter((p) => p.through).length, tiefeOk: ps.filter((p) => p.through && p.done).length,
      flanken: ps.filter((p) => p.lofted && p.third === 'att').length,
      angriffe: entries.length, aussen: entries.filter((p) => p.entryLane !== 'centre').length, strafraum: poss.filter((p) => p.box).length,
      phasen: poss.length, paesseJePhase: poss.length ? poss.reduce((a, p) => a + p.passes, 0) / poss.length : 0,
      schuesse: shots.length, konterChancen: counter.length,
      verlusteVorne: L.turnovers.filter((x) => x.to === 1 - t && x.t >= t0 && x.third === 'def').length,
    };
  }
  return out;
}

function play(seed, pitch, cfg) {
  const m = createMatch({ seed, pitch, teams: teamsFor(seed, pitch, cfg), human: false, aiCoach: !!cfg.aiCoach, duration: matchDuration(pitch) });
  for (const [t, list] of (cfg.orders ?? []).entries()) for (const [g, v] of list) setOrder(m, t, g, v);
  if (cfg.stamina) for (const p of m.players) p.stamina = cfg.stamina[p.team];
  const r = {
    goals: [0, 0], shots: [0, 0], onTarget: [0, 0], saves: [0, 0], blocks: [0, 0], woodwork: [0, 0], near: [0, 0], nearGoals: [0, 0],
    passes: [0, 0], passOk: [0, 0], tackles: [0, 0], fouls: [0, 0], cards: [0, 0], corners: [0, 0], tricks: [0, 0], trickOk: [0, 0],
    acro: [0, 0], turnovers: [0, 0], poss: [0, 0], counterGoals: [0, 0], goalsBy: Array.from({ length: SIX }, () => [0, 0]),
    late: null, whiffs: [0, 0], miscontrol: [0, 0], injuries: [0, 0],
  };
  const pl = {}; // Spieler-Auswertung: Werte + Aktionen
  const P = (id) => (pl[id] ??= { shots: 0, goals: 0, tricks: 0, trickOk: 0, tackles: 0, fouls: 0, touches: 0, miscontrol: 0, whiffs: 0, passes: 0, passOk: 0 });
  const teamOf = (id) => m.players.find((p) => p.id === id)?.team ?? m.bench.flat().find((p) => p.id === id)?.team;
  let lateDone = !cfg.late;
  let lateBase = null;
  let lastShot = [null, null];
  while (m.phase !== 'ended') {
    if (!lateDone && m.phase === 'play' && m.time >= m.duration * cfg.late.at) {
      lateDone = true;
      m.score = [...cfg.late.score];
      for (const [t, list] of cfg.late.orders.entries()) for (const [g, v] of list) setOrder(m, t, g, v);
      lateBase = { goals: [...m.score], shots: [...r.shots], near: [...r.near], t: m.time, counter: [...r.counterGoals] };
    }
    stepMatch(m, undefined, 1 / 60);
    for (const e of m.events) {
      const team = e.playerId ? teamOf(e.playerId) : e.team;
      switch (e.type) {
        case 'shot': {
          r.shots[team]++;
          P(e.playerId).shots++;
          if (e.acro) r.acro[team]++;
          const p = m.players.find((q) => q.id === e.playerId);
          const d = p ? dist2d(p.pos, { x: attackDir(m, team) * m.pitch.halfLength, z: 0 }) : 99;
          // „Nahdistanz-Chance": Abschluss aus höchstens 7 m (Großchance im Kleinfeld).
          const near = d <= 7;
          if (near) r.near[team]++;
          lastShot[team] = { near, t: m.time };
          break;
        }
        case 'save': case 'catch': {
          const shooter = 1 - team;
          if (lastShot[shooter] && m.time - lastShot[shooter].t < 3) { r.onTarget[shooter]++; r.saves[team]++; }
          break;
        }
        case 'block': r.blocks[team]++; break;
        case 'post': case 'bar': { const s = m.lastTouchTeam ?? 0; r.woodwork[s]++; break; }
        case 'pass': r.passes[team]++; P(e.playerId).passes++; break;
        case 'tackle': case 'poke_won': r.tackles[team]++; P(e.playerId).tackles++; break;
        case 'foul': r.fouls[team]++; P(e.playerId).fouls++; break;
        case 'card': r.cards[team]++; break;
        case 'out': if (e.restart === 'corner') r.corners[e.team]++; break;
        case 'trick': r.tricks[team]++; P(e.playerId).tricks++; if (e.ok) { r.trickOk[team]++; P(e.playerId).trickOk++; } break;
        case 'touch': P(e.playerId).touches++; break;
        case 'miscontrol': r.miscontrol[team]++; P(e.playerId).miscontrol++; break;
        case 'whiff': r.whiffs[team]++; P(e.playerId).whiffs++; break;
        case 'injury': r.injuries[team]++; break;
        case 'goal': {
          const g = e.team;
          r.goals[g]++;
          if (!e.ownGoal) {
            r.onTarget[g]++;
            if (lastShot[g]?.near && m.time - lastShot[g].t < 3) r.nearGoals[g]++;
            if (e.scorerId) P(e.scorerId).goals++;
          }
          r.goalsBy[Math.min(SIX - 1, Math.floor((m.time / m.duration) * SIX))][g]++;
          // Konter: Ballgewinn in der eigenen Hälfte/Drittel, Tor binnen 8 s.
          const poss = [...(m.log?.poss ?? [])].reverse().find((q) => q.team === g && q.start <= m.time + 0.01);
          if (poss && poss.startThird === 'def' && m.time - poss.start < 8) r.counterGoals[g]++;
          break;
        }
      }
    }
    m.events.length = 0;
  }
  const L = m.log;
  for (const t of [0, 1]) {
    const ps = L.passes.filter((p) => p.team === t && p.done !== null);
    r.passOk[t] = ps.filter((p) => p.done).length;
    const aimed = ps.filter((p) => p.targetId && !p.lofted);
    r.aimed ??= [0, 0];
    r.aimedOk ??= [0, 0];
    r.aimed[t] = aimed.length;
    r.aimedOk[t] = aimed.filter((p) => p.done).length;
    r.passes[t] = ps.length;
    r.turnovers[t] = L.turnovers.filter((x) => x.to === 1 - t).length;
  }
  for (const p of L.passes) if (p.done !== null) { const q = P(p.kicker); q.passOk += p.done ? 1 : 0; }
  const st = m.stats.teams;
  const tot = st[0].possession + st[1].possession;
  r.poss = [st[0].possession / tot, st[1].possession / tot];
  // Endstand ohne den gesetzten Spielstand (nur die echten Tore zählen fürs Ergebnis).
  r.score = [...m.score];
  if (lateBase) {
    r.late = {
      goals: [m.score[0] - lateBase.goals[0], m.score[1] - lateBase.goals[1]],
      shots: [r.shots[0] - lateBase.shots[0], r.shots[1] - lateBase.shots[1]],
      near: [r.near[0] - lateBase.near[0], r.near[1] - lateBase.near[1]],
      counter: [r.counterGoals[0] - lateBase.counter[0], r.counterGoals[1] - lateBase.counter[1]],
      final: [...m.score],
    };
  }
  r.win = windowStats(m, 0);
  if (lateBase) r.lateWin = windowStats(m, lateBase.t);
  // Spielerwerte mitgeben (nur Feldspieler/Torwart des Spiels)
  const players = [...m.players, ...m.bench.flat()].filter((p) => pl[p.id]).map((p) => ({ team: p.team, role: p.position ?? p.role, attrs: p.attrs, ...pl[p.id] }));
  const keepers = m.players.filter((p) => p.role === 'gk').map((p) => ({ team: p.team, keeping: p.attrs.keeping }));
  return { r, players, keepers, rating: m.teams.map((t) => t.rating ?? null) };
}

if (!isMainThread) {
  const { seeds, pitchId, cfg } = workerData;
  const out = seeds.map((s) => play(s, PITCHES[pitchId], cfg));
  parentPort.postMessage(out);
} else {
  const [name = 'equal', nArg = '1000', pitchId = 'ascheplatz'] = process.argv.slice(2);
  if (name === 'list') {
    console.log(Object.keys(SERIES).join(' '));
    process.exit(0);
  }
  const cfg = SERIES[name];
  if (!cfg) throw new Error(`unbekannte Serie ${name}`);
  const N = +nArg;
  const seeds = Array.from({ length: N }, (_, i) => 10000 + i);
  const W = Math.min(cpus().length, 4);
  const parts = Array.from({ length: W }, (_, w) => seeds.filter((_, i) => i % W === w));
  const t0 = Date.now();
  const results = (await Promise.all(parts.map((ps) => new Promise((res, rej) => {
    const wk = new Worker(fileURLToPath(import.meta.url), { workerData: { seeds: ps, pitchId, cfg } });
    wk.on('message', res);
    wk.on('error', rej);
  })))).flat();
  const sum = (f) => results.reduce((s, x) => s + f(x), 0);
  const avg = (f) => +(sum(f) / N).toFixed(2);
  const pair = (k) => [avg((x) => x.r[k][0]), avg((x) => x.r[k][1])];
  const win = sum((x) => (x.r.score[0] > x.r.score[1] ? 1 : 0));
  const draw = sum((x) => (x.r.score[0] === x.r.score[1] ? 1 : 0));
  const out = {
    serie: name, spiele: N, platz: pitchId, seeds: `${seeds[0]}–${seeds.at(-1)}`, cfg,
    staerke: [avg((x) => x.rating[0] ?? 0), avg((x) => x.rating[1] ?? 0)],
    sieg: +(win / N).toFixed(3), remis: +(draw / N).toFixed(3), niederlage: +((N - win - draw) / N).toFixed(3),
    tore: pair('goals'), schuesse: pair('shots'), aufsTor: pair('onTarget'), nahchancen: pair('near'), nahTore: pair('nearGoals'),
    paraden: pair('saves'), geblockt: pair('blocks'), gebaelk: pair('woodwork'), konterTore: pair('counterGoals'),
    paesse: pair('passes'), passquote: [+(sum((x) => x.r.passOk[0]) / Math.max(1, sum((x) => x.r.passes[0]))).toFixed(3), +(sum((x) => x.r.passOk[1]) / Math.max(1, sum((x) => x.r.passes[1]))).toFixed(3)],
    passquoteGezielt: [0, 1].map((t) => +(sum((x) => x.r.aimedOk[t]) / Math.max(1, sum((x) => x.r.aimed[t]))).toFixed(3)),
    ballbesitz: [avg((x) => x.r.poss[0]), avg((x) => x.r.poss[1])], ballverluste: pair('turnovers'), zweikaempfe: pair('tackles'),
    fouls: pair('fouls'), karten: pair('cards'), ecken: pair('corners'), tricks: pair('tricks'), trickOk: pair('trickOk'), akrobatik: pair('acro'),
    luftloecher: pair('whiffs'), verspringen: pair('miscontrol'), verletzungen: pair('injuries'),
    toreJeAbschnitt: Array.from({ length: SIX }, (_, i) => +(sum((x) => x.r.goalsBy[i][0] + x.r.goalsBy[i][1]) / N).toFixed(3)),
    torProSchuss: +(sum((x) => x.r.goals[0] + x.r.goals[1]) / Math.max(1, sum((x) => x.r.shots[0] + x.r.shots[1]))).toFixed(3),
    null0: +(sum((x) => (x.r.score[0] + x.r.score[1] === 0 ? 1 : 0)) / N).toFixed(3),
    sekunden: +((Date.now() - t0) / 1000).toFixed(0),
  };
  const detail = (key) => {
    const keys = Object.keys(results[0].r[key][0]);
    return Object.fromEntries(keys.map((k) => [k, [0, 1].map((t) => +(results.reduce((a, x) => a + x.r[key][t][k], 0) / N).toFixed(3))]));
  };
  out.detail = detail('win');
  out.detail.gezieltQuote = [0, 1].map((t) => +(results.reduce((a, x) => a + x.r.win[t].gezieltOk, 0) / Math.max(1, results.reduce((a, x) => a + x.r.win[t].gezielt, 0))).toFixed(3));
  out.detail.aussenAnteil = [0, 1].map((t) => +(results.reduce((a, x) => a + x.r.win[t].aussen, 0) / Math.max(1, results.reduce((a, x) => a + x.r.win[t].angriffe, 0))).toFixed(3));
  if (cfg.late) out.lateDetail = detail('lateWin');
  if (cfg.late) {
    const L = (f) => results.reduce((s, x) => s + f(x.r.late), 0) / N;
    out.schlussphase = {
      ab: cfg.late.at, stand: cfg.late.score,
      toreFuer: +L((l) => l.goals[0]).toFixed(3), toreGegen: +L((l) => l.goals[1]).toFixed(3),
      schuesseFuer: +L((l) => l.shots[0]).toFixed(2), schuesseGegen: +L((l) => l.shots[1]).toFixed(2),
      nahFuer: +L((l) => l.near[0]).toFixed(2), nahGegen: +L((l) => l.near[1]).toFixed(2),
      konterGegen: +L((l) => l.counter[1]).toFixed(3),
      endSieg: +(results.filter((x) => x.r.late.final[0] > x.r.late.final[1]).length / N).toFixed(3),
      endRemis: +(results.filter((x) => x.r.late.final[0] === x.r.late.final[1]).length / N).toFixed(3),
      endNiederlage: +(results.filter((x) => x.r.late.final[0] < x.r.late.final[1]).length / N).toFixed(3),
    };
  }
  if (process.env.PLAYERS) {
    // Spielerunterschiede: Aktionen nach Wertebereich (Quartile) gebündelt.
    const ps = results.flatMap((x) => x.players).filter((p) => p.role !== 'gk');
    const bucket = (attr, f, g) => {
      const sorted = [...ps].sort((a, b) => a.attrs[attr] - b.attrs[attr]);
      const q = 4;
      return Array.from({ length: q }, (_, i) => {
        const part = sorted.slice(Math.floor((i * sorted.length) / q), Math.floor(((i + 1) * sorted.length) / q));
        const num = part.reduce((s, p) => s + f(p), 0);
        const den = part.reduce((s, p) => s + g(p), 0);
        return { von: +part[0].attrs[attr].toFixed(2), bis: +part.at(-1).attrs[attr].toFixed(2), wert: +(num / Math.max(1, den)).toFixed(3), n: den };
      });
    };
    out.spieler = {
      'Schuss→Tor nach Schusswert': bucket('shooting', (p) => p.goals, (p) => p.shots),
      'Tricks je Spieler nach Technik': bucket('technique', (p) => p.tricks, () => 1),
      'Trick gelingt nach Technik': bucket('technique', (p) => p.trickOk, (p) => p.tricks),
      'Verspringen je Ballkontakt nach Technik': bucket('technique', (p) => p.miscontrol, (p) => p.touches),
      'Luftloch je Ballkontakt nach Technik': bucket('technique', (p) => p.whiffs, (p) => p.touches),
      'Passquote nach Passwert': bucket('passing', (p) => p.passOk, (p) => p.passes),
      'Ballgewinne je Spieler nach Zweikampf': bucket('tackling', (p) => p.tackles, () => 1),
      'Fouls je Ballgewinn nach Zweikampf': bucket('tackling', (p) => p.fouls, (p) => p.tackles),
      'Schüsse je Spieler nach Tempo (Stürmer)': (() => { const f = ps.filter((p) => p.role === 'fwd'); const s = [...f].sort((a, b) => a.attrs.pace - b.attrs.pace); return [0, 1, 2, 3].map((i) => { const part = s.slice(Math.floor((i * s.length) / 4), Math.floor(((i + 1) * s.length) / 4)); return { von: +part[0].attrs.pace.toFixed(2), bis: +part.at(-1).attrs.pace.toFixed(2), wert: +(part.reduce((a, p) => a + p.shots, 0) / part.length).toFixed(3), n: part.length }; }); })(),
    };
  }
  console.log(JSON.stringify(out));
}
