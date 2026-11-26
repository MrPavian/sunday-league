// Liveticker mit Bild (Gameplay 2.0, Punkt 38): Chancenqualität (xG), Bilder der gefährlichen Szenen und eine Druck-Leiste.
// Liest den Spielstand nur – kein Zufall, keine Wirkung aufs Spiel (gleicher Seed, gleiches Spiel, mit und ohne Ticker).
//
// XG – logistisches Modell, hergeleitet aus 160 Simulationsspielen (je 40 auf Rasen-, Park-, Asche- und Großfeld, Seeds
// 8100–8139; 3512 Schüsse und Kopfbälle aufs Tor, 429 Tore; 2026-11-25). Gemessen am Spiel selbst, nicht an echten Daten: Im
// Spiel gehen Schüsse aus 2 m kaum öfter rein als aus 14 m, entscheidend sind freie Schussbahn und Torwart. Merkmale: angle –
// Öffnungswinkel des Tors vom Schützen aus (Bogenmaß); dist – je 10 m Abstand zur Tormitte; head – Kopfball; block – je
// Gegenspieler (ohne Torwart) höchstens blockLane m neben der Schussbahn, höchstens blockMax; keeperOff – je Meter, den der
// Torwart neben der Schussbahn steht, höchstens keeperOffMax. Gegenprobe (Fünftel nach Vorhersage): vorhergesagt 0,05 / 0,08 /
// 0,11 / 0,15 / 0,22, getroffen 0,03 / 0,10 / 0,11 / 0,15 / 0,22. penalty – Elfmeter: 1019 von 1536 im Elfmeterschießen
// verwandelt (150 Schießen auf fünf Plätzen, Seeds 9000–9029). scene – ab so viel xG (oder bei jedem Tor) gibt es ein Bild der
// Szene (Spielwert); outcome – so lange (Spielsekunden) nach dem Schuss zählt ein Tor oder eine Parade noch dazu (Spielwert);
// assist – ein Pass höchstens so lange vor dem Schuss gilt als Vorlage (Spielwert); segments – so viele Abschnitte hat die
// Druck-Leiste über das ganze Spiel (Spielwert). Druck = Anteil der Zeit, in der die Mannschaft den Ball im letzten Drittel hat.
// pitch – Verschiebung je Platz (Logit), AFS Phase 3 (docs/ADVANCED-FOOTBALL-SYSTEM-03-VALIDATION.md, 2026-11-26): je Platz 60
// Spiele (Seeds 8200–8259) so verschoben, dass die Summe der xG den Toren aus Abschlüssen entspricht; nur übernommen, wo die
// Abweichung größer als ihr 95-%-Intervall war (Hinterhof −0,37 ± 0,15, Park −0,36 ± 0,18, Großfeld +0,30 ± 0,21; die übrigen
// fünf Plätze lagen innerhalb). Gilt auch für Stadion und Tribüne (Grundplatz `base`). Elfmeter bleiben fest.
import { attackDir } from './players.js';

export const XG = {
  on: true,
  base: -1.53, angle: 0.77, dist: -0.6, head: -0.89, block: -0.65, blockLane: 1.2, blockMax: 3, keeperOff: 0.36, keeperOffMax: 2,
  penalty: 0.66, scene: 0.15, outcome: 4, assist: 4, segments: 18,
  pitch: { hinterhof: -0.37, park: -0.36, grossfeld: 0.3 },
};

const sig = (x) => 1 / (1 + Math.exp(-x));

// Abstand von q zur Strecke a→b und wo q auf ihr liegt (0 … 1).
function toSegment(a, b, q) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len2 = Math.max(1e-6, dx * dx + dz * dz);
  const t = ((q.x - a.x) * dx + (q.z - a.z) * dz) / len2;
  const c = Math.max(0, Math.min(1, t));
  return { t, d: Math.hypot(q.x - (a.x + c * dx), q.z - (a.z + c * dz)) };
}

// Chancenqualität eines Abschlusses von p in dieser Lage (0 … 1).
export function shotXg(m, p, { head = false, penalty = false } = {}) {
  if (penalty) return XG.penalty;
  const goal = { x: attackDir(m, p.team) * m.pitch.halfLength, z: 0 };
  const dx = Math.abs(goal.x - p.pos.x), z = p.pos.z, w = m.pitch.goalHalfWidth;
  const angle = Math.abs(Math.atan2(z + w, dx) - Math.atan2(z - w, dx));
  const dist = Math.hypot(dx, z);
  let block = 0;
  let keeper = XG.keeperOffMax;
  for (const q of m.players) {
    if (q.team === p.team) continue;
    const s = toSegment(p.pos, goal, q.pos);
    if (q.role === 'gk') keeper = Math.min(XG.keeperOffMax, s.d);
    else if (s.t >= 0 && s.t <= 1 && s.d < XG.blockLane) block++;
  }
  const x = (XG.pitch[m.pitch.base ?? m.pitch.id] ?? 0) + XG.base + XG.angle * angle + XG.dist * (dist / 10) + (head ? XG.head : 0) + XG.block * Math.min(block, XG.blockMax) + XG.keeperOff * keeper;
  return sig(x);
}

export function createChanceLog(m) {
  const n = XG.segments;
  return { shots: [], scenes: [], xg: [0, 0], press: [Array(n).fill(0), Array(n).fill(0)], seen: Array(n).fill(0), lastPass: null, open: null };
}

const team = (m, id) => m.players.find((p) => p.id === id)?.team ?? null;

// Nach jedem Schritt mit den Ereignissen dieses Schritts (vor dem Leeren) – wie der Kommentator.
export function feedChances(log, m, events = m.events, minute = null) {
  if (!XG.on) return;
  // Druck: Wer hat den Ball im letzten Drittel?
  if (m.phase === 'play' && m.duration > 0) {
    const seg = Math.min(XG.segments - 1, Math.floor((m.time / m.duration) * XG.segments));
    log.seen[seg]++;
    const id = m.ball.holder ?? m.ball.lastTouch;
    const t = id == null ? null : team(m, id);
    if (t !== null && (m.ball.pos.x * attackDir(m, t)) / m.pitch.halfLength > 1 / 3) log.press[t][seg]++;
  }
  for (const e of events) {
    if (e.type === 'pass') log.lastPass = { id: e.playerId, team: team(m, e.playerId), from: e.from, t: m.time };
    else if ((e.type === 'shot' || (e.type === 'header' && e.onGoal)) && m.phase !== 'shootout') {
      const p = m.players.find((q) => q.id === e.playerId);
      if (!p) continue;
      const penalty = e.type === 'shot' && m.penaltyKick === m.time;
      const xg = shotXg(m, p, { head: e.type === 'header', penalty });
      const lp = log.lastPass;
      const assist = lp && lp.team === p.team && lp.id !== p.id && m.time - lp.t <= XG.assist && lp.from ? { id: lp.id, from: { ...lp.from } } : null;
      const shot = {
        team: p.team, dir: attackDir(m, p.team), id: p.id, name: p.name, xg, head: e.type === 'header', penalty, t: m.time, minute: minute ?? null, from: { x: p.pos.x, z: p.pos.z }, assist,
        result: 'missed', players: m.players.map((q) => ({ x: q.pos.x, z: q.pos.z, team: q.team, id: q.id, gk: q.role === 'gk' })),
      };
      log.shots.push(shot);
      log.xg[p.team] += xg;
      log.open = shot;
      if (xg >= XG.scene) log.scenes.push(shot);
    } else if (e.type === 'save' && log.open && m.time - log.open.t <= XG.outcome) {
      log.open.result = 'saved';
    } else if (e.type === 'goal') {
      const s = log.open;
      if (s && !e.ownGoal && s.team === e.team && m.time - s.t <= XG.outcome) {
        s.result = 'goal';
        if (!log.scenes.includes(s)) log.scenes.push(s);
      }
      log.open = null;
    }
  }
  if (log.open && m.time - log.open.t > XG.outcome) log.open = null;
}

// Druck je Abschnitt (0 … 1) für beide Mannschaften; leere Abschnitte (noch nicht gespielt) sind null.
export const pressureOf = (log) => log.seen.map((n, i) => (n ? [log.press[0][i] / n, log.press[1][i] / n] : null));
