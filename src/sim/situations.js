// SituationEngine: Was passiert gerade taktisch? Wertet das Spielprotokoll über ein
// gleitendes Fenster aus und meldet Situationen – nie „jetzt fällt ein Tor", nur
// „hier gibt es eine Möglichkeit" oder „hier brennt es". Liest nur, zieht keinen
// Zufall und verändert nichts am Spiel. Beide Mannschaften werden gleich behandelt
// (derselbe Blick für den Trainer und die Gegner-KI).
//
// Eine Situation: { type, team, severity 0…1, confidence 0…1, lane?, evidence, options }
// options: Befehle als { group, value } (siehe plan.js / commands.js).
import { mirrorLane, since } from './matchlog.js';
import { planMods } from './plan.js';

export const SITUATION_TYPES = [
  'OPP_FLANK', // Gegner kommt immer wieder über eine Seite
  'OUR_SIDE_WORKS', // Unsere Angriffe über eine Seite funktionieren
  'SPACE_BEHIND', // Gegner steht hoch, unsere Spitze ist schnell
  'PRESS_BYPASSED', // Unser Pressing wird überspielt
  'PRESS_TIRING', // Das Pressing kostet sichtbar Kraft
  'STRIKER_ISOLATED', // Die Spitze hängt vorne allein
  'SECOND_BALLS', // Wir verlieren die zweiten Bälle
  'OPP_DEEP_BLOCK', // Gegner mauert, wir kommen nicht durch
  'UNDER_PRESSURE', // Gegner presst hoch und erobert bei uns hinten den Ball
  'OPP_TIRING', // Der Gegner wird müde
  'WE_TIRING', // Uns geht die Luft aus (ohne Pressing)
  'ENDGAME', // Schlussphase: knapp vorne oder hinten
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));
// Fenster: ein gutes Viertel des Spiels, mindestens 30 Spielsekunden.
export const windowOf = (m) => Math.max(30, Math.min(120, m.duration * 0.28));
const opposite = (lane) => (lane === 'left' ? 'right' : 'left');
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

const DETECTORS = {
  OPP_FLANK(m, team, w) {
    const attacks = w.poss.filter((p) => p.team !== team && p.entryLane);
    if (attacks.length < 3) return null;
    // Unsere Seite = die gespiegelte Seite des Gegners.
    const by = { left: [], right: [] };
    for (const a of attacks) {
      const lane = mirrorLane(a.entryLane);
      if (by[lane]) by[lane].push(a);
    }
    const lane = by.left.length >= by.right.length ? 'left' : 'right';
    const share = by[lane].length / attacks.length;
    if (share < 0.5 || by[lane].length < 3) return null;
    const danger = by[lane].filter((a) => a.shots || a.box).length / by[lane].length;
    return {
      lane,
      severity: clamp01((share - 0.4) * 1.5 + danger * 0.4),
      confidence: clamp01(attacks.length / 7),
      evidence: { attacks: attacks.length, fromLane: by[lane].length, dangerous: by[lane].filter((a) => a.shots || a.box).length },
      options: [{ group: 'cover', value: lane }, { group: 'side', value: opposite(lane) }, { group: 'shape', value: 'kompakt' }],
    };
  },

  OUR_SIDE_WORKS(m, team, w) {
    const ours = w.poss.filter((p) => p.team === team && (p.entryLane === 'left' || p.entryLane === 'right'));
    if (ours.length < 2) return null;
    let best = null;
    for (const lane of ['left', 'right']) {
      const list = ours.filter((p) => p.entryLane === lane);
      const good = list.filter((p) => p.shots || p.box).length;
      if (list.length >= 2 && good >= 2 && (!best || good > best.good)) best = { lane, list, good };
    }
    if (!best) return null;
    const other = ours.filter((p) => p.entryLane === opposite(best.lane));
    const otherGood = other.filter((p) => p.shots || p.box).length;
    if (otherGood >= best.good) return null;
    return {
      lane: best.lane,
      severity: clamp01(0.3 + best.good * 0.15 - otherGood * 0.1),
      confidence: clamp01(ours.length / 6),
      evidence: { attacks: best.list.length, chances: best.good, otherChances: otherGood },
      options: [{ group: 'side', value: best.lane }, { group: 'route', value: 'aussen' }, { group: 'side', value: null }],
    };
  },

  SPACE_BEHIND(m, team, w) {
    const opp = 1 - team;
    const ours = w.samples.filter((s) => s.poss === team);
    if (ours.length < 8) return null;
    // Wie hoch steht die letzte Linie des Gegners, während wir den Ball haben?
    const line = avg(ours.map((s) => s.line[opp]));
    if (line < -0.4) return null;
    const fwd = m.players.filter((p) => p.team === team && p.role === 'fwd');
    const defs = m.players.filter((p) => p.team === opp && p.role === 'def');
    if (!fwd.length || !defs.length) return null;
    const fastest = fwd.reduce((a, b) => (b.attrs.pace > a.attrs.pace ? b : a));
    const slowest = Math.min(...defs.map((d) => d.attrs.pace));
    const edge = fastest.attrs.pace * (0.72 + 0.28 * fastest.stamina) - slowest;
    if (edge < 0.05) return null;
    return {
      severity: clamp01((line + 0.4) * 1.4 + edge * 1.5),
      confidence: clamp01(ours.length / 30),
      playerId: fastest.id,
      evidence: { line, edge },
      options: [{ group: 'route', value: 'tiefe' }, { group: 'build', value: 'direkt' }, { group: 'build', value: 'halten' }],
    };
  },

  PRESS_BYPASSED(m, team, w) {
    const mods = planMods(m, team);
    if (!mods.press && mods.pressZone !== 'high') return null;
    // Gegnerische Angriffe, die hinten beginnen: Wie viele kommen über die Mittellinie?
    const builds = w.poss.filter((p) => p.team !== team && p.startThird === 'def');
    if (builds.length < 3) return null;
    const through = builds.filter((p) => p.maxAdv > 0).length;
    const won = w.turnovers.filter((t) => t.to === team && t.third === 'att').length;
    const share = through / builds.length;
    if (share < 0.45) return null;
    return {
      severity: clamp01((share - 0.3) * 1.6 - won * 0.08),
      confidence: clamp01(builds.length / 6),
      evidence: { builds: builds.length, through, wonHigh: won },
      options: [{ group: 'press', value: 'hoch' }, { group: 'press', value: 'mittel' }, { group: 'press', value: 'tief' }],
    };
  },

  PRESS_TIRING(m, team, w) {
    const mods = planMods(m, team);
    const pressing = mods.press || mods.pressZone === 'high' || mods.tire > 1.1;
    const last = w.samples.at(-1);
    if (!pressing || !last) return null;
    const stamina = last.stamina[team];
    if (stamina > 0.62) return null;
    return {
      severity: clamp01((0.68 - stamina) * 2.5),
      confidence: 0.9,
      evidence: { stamina },
      options: [{ group: 'press', value: 'mittel' }, { group: 'press', value: 'tief' }, { group: 'tempo', value: 'ruhig' }],
    };
  },

  STRIKER_ISOLATED(m, team, w) {
    const ours = w.samples.filter((s) => s.poss === team);
    if (ours.length < 8) return null;
    const gap = avg(ours.map((s) => s.fwdGap[team]));
    const fwdIds = new Set(m.players.filter((p) => p.team === team && p.role === 'fwd').map((p) => p.id));
    if (!fwdIds.size) return null;
    const toFwd = w.passes.filter((p) => p.team === team && p.done && fwdIds.has(p.receiver)).length;
    const attacks = w.poss.filter((p) => p.team === team).length;
    if (gap < 0.38 || attacks < 4 || toFwd > attacks * 0.35) return null;
    return {
      severity: clamp01((gap - 0.3) * 2 + (1 - toFwd / attacks) * 0.3),
      confidence: clamp01(ours.length / 30),
      evidence: { gap, toFwd, attacks },
      options: [{ group: 'shape', value: 'aufruecken' }, { group: 'route', value: 'kombi' }, { group: 'shape', value: 'stuermer_fallen' }],
    };
  },

  SECOND_BALLS(m, team, w) {
    const loose = w.turnovers.filter((t) => t.how === 'loose' && t.third === 'mid');
    if (loose.length < 6) return null;
    const lost = loose.filter((t) => t.to !== team).length;
    const share = lost / loose.length;
    if (share < 0.66) return null;
    return {
      severity: clamp01((share - 0.55) * 2.5),
      confidence: clamp01(loose.length / 10),
      evidence: { loose: loose.length, lost },
      options: [{ group: 'shape', value: 'kompakt' }, { group: 'build', value: 'kurz' }, { group: 'press', value: 'tief' }],
    };
  },

  OPP_DEEP_BLOCK(m, team, w) {
    const opp = 1 - team;
    const ours = w.samples.filter((s) => s.poss === team);
    if (ours.length < 8) return null;
    const line = avg(ours.map((s) => s.line[opp]));
    const attacks = w.poss.filter((p) => p.team === team);
    const into = attacks.filter((p) => p.box || p.shots).length;
    if (line > -0.6 || attacks.length < 4 || into > attacks.length * 0.4) return null;
    return {
      severity: clamp01((-0.55 - line) * 2 + (1 - into / attacks.length) * 0.4),
      confidence: clamp01(ours.length / 30),
      evidence: { line, attacks: attacks.length, into },
      options: [{ group: 'route', value: 'aussen' }, { group: 'route', value: 'kombi' }, { group: 'risk', value: 'aggressiv' }],
    };
  },

  UNDER_PRESSURE(m, team, w) {
    // Nur wenn der Gegner wirklich vorne draufgeht – Ballverluste hinten gibt es sonst immer.
    const oppMods = planMods(m, 1 - team);
    const oppHigh = oppMods.press || oppMods.pressZone === 'high' || oppMods.line > 0.05;
    const lostDeep = w.turnovers.filter((t) => t.to !== team && t.third === 'att' && t.how !== 'keeper').length;
    const ours = w.poss.filter((p) => p.team === team && p.startThird === 'def').length;
    if (lostDeep < 3 || ours < 3 || lostDeep / ours < (oppHigh ? 0.4 : 0.7)) return null;
    return {
      severity: clamp01(((lostDeep / ours) * 1.2 - 0.2) * (oppHigh ? 1 : 0.7)),
      confidence: clamp01(ours / 6),
      evidence: { lostDeep, builds: ours },
      options: [{ group: 'build', value: 'kurz' }, { group: 'route', value: 'aussen' }, { group: 'build', value: 'direkt' }],
    };
  },
};

const DETECTORS_MORE = {
  OPP_TIRING(m, team, w) {
    const last = w.samples.at(-1);
    if (!last || m.time < m.duration * 0.35) return null;
    const opp = last.stamina[1 - team];
    const ours = last.stamina[team];
    if (opp > 0.58 || ours - opp < 0.06) return null;
    return {
      severity: clamp01((0.62 - opp) * 3 + (ours - opp)),
      confidence: 0.85,
      evidence: { opp, ours },
      options: [{ group: 'press', value: 'hoch' }, { group: 'tempo', value: 'schnell' }, { group: 'route', value: 'tiefe' }],
    };
  },

  WE_TIRING(m, team, w) {
    const mods = planMods(m, team);
    if (mods.press || mods.tire > 1.1) return null; // das meldet PRESS_TIRING
    const last = w.samples.at(-1);
    if (!last || m.time < m.duration * 0.4) return null;
    const ours = last.stamina[team];
    if (ours > 0.46) return null;
    return {
      severity: clamp01((0.55 - ours) * 3),
      confidence: 0.85,
      evidence: { stamina: ours },
      options: [{ group: 'tempo', value: 'ruhig' }, { group: 'press', value: 'tief' }, { group: 'build', value: 'halten' }],
    };
  },

  // Keine Hilfe fürs Ergebnis – nur die Frage, die sich jeder Trainer an der Linie stellt.
  // Angeboten wird nur, was in der Simulation nachweislich wirkt (Monte-Carlo, je 1000 Spiele,
  // Befehl ab 80 % der Spielzeit, scripts/audit.mjs lead80_* / behind80_* / level80_*):
  //   knapp vorne:   Ball halten und Konter halten die Führung öfter; „Tief stehen", „Tempo
  //                  raus" und „Konter absichern" allein nicht (tief stehen sogar schlechter).
  //   hinten/offen:  Kein Befehl bringt in der kurzen Restzeit messbar mehr Punkte. Mehr Risiko
  //                  bringt ~25 % mehr Abschlüsse bei gleich vielen Toren und etwas mehr Gegentoren;
  //                  In die Tiefe kostet sogar Tore. Die Karte bietet deshalb ehrlich „Mehr Risiko"
  //                  oder „So weiterspielen" (Risiko zurück auf normal) an.
  ENDGAME(m, team) {
    if (m.time < m.duration * 0.78 || m.time > m.duration * 0.95) return null;
    const d = m.score[team] - m.score[1 - team];
    if (Math.abs(d) > 1) return null;
    const lead = d > 0 ? 'lead' : d < 0 ? 'behind' : 'level';
    const options = lead === 'lead'
      ? [{ group: 'build', value: 'halten' }, { group: 'route', value: 'konter' }]
      : [{ group: 'risk', value: 'aggressiv' }, { group: 'risk', value: null }];
    return { lead, severity: 0.6, confidence: 1, evidence: { score: [...m.score] }, options };
  },
};
Object.assign(DETECTORS, DETECTORS_MORE);

// Alle aktuellen Situationen für ein Team, die stärksten zuerst.
export function detectSituations(m, team) {
  const log = m.log;
  if (!log) return [];
  const secs = windowOf(m);
  const w = {
    poss: since(log.poss, m, secs),
    turnovers: since(log.turnovers, m, secs),
    passes: since(log.passes, m, secs),
    samples: since(log.samples, m, secs),
  };
  const out = [];
  for (const type of SITUATION_TYPES) {
    const s = DETECTORS[type](m, team, w);
    if (s && s.severity > 0.15) out.push({ type, team, t: m.time, ...s });
  }
  return out.sort((a, b) => b.severity * b.confidence - a.severity * a.confidence);
}

// Einmal pro Spielsekunde: aktuelle Lage beider Teams merken, dazu eine kleine
// Chronik (für Halbzeit und Nachanalyse): wann welche Situation wie stark war.
export function stepSituations(m) {
  if (m.phase !== 'play' || m.time < (m.nextSituationCheck ?? 0)) return;
  m.nextSituationCheck = m.time + 1;
  m.situations = [detectSituations(m, 0), detectSituations(m, 1)];
  m.situationLog ??= [];
  for (const list of m.situations) {
    for (const s of list) {
      const last = m.situationLog.findLast((e) => e.type === s.type && e.team === s.team && e.lane === (s.lane ?? null));
      if (last && m.time - last.until < 5) {
        last.until = m.time;
        last.peak = Math.max(last.peak, s.severity);
      } else m.situationLog.push({ type: s.type, team: s.team, lane: s.lane ?? null, from: m.time, until: m.time, half: m.half, peak: s.severity });
    }
  }
}
