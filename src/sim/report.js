// Spielbericht für den Trainer: Was hat funktioniert, was nicht, was macht der
// Gegner? Aus Protokoll (matchlog.js) und Situationschronik (situations.js) – in
// Sätzen, nicht in Zahlen. Für Halbzeit und Abpfiff.
import { tr } from '../core/i18n.js';
import { planMods } from './plan.js';
import { orderLabel } from './commands.js';

const laneWord = (lane) => (lane === 'left' ? tr('links', 'the left') : lane === 'right' ? tr('rechts', 'the right') : tr('durch die Mitte', 'the middle'));
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const surname = (p) => p?.name.split(' ').slice(-1)[0] ?? '';

// Kennzahlen einer Halbzeit (half = 1 | 2 | null für das ganze Spiel).
export function halfStats(m, team, half = null) {
  const L = m.log;
  if (!L) return null;
  const inHalf = (x) => half == null || x.half === half;
  const opp = 1 - team;
  const poss = L.poss.filter(inHalf);
  const ours = poss.filter((p) => p.team === team);
  const theirs = poss.filter((p) => p.team === opp);
  const byLane = (list) => {
    const out = { left: { n: 0, good: 0 }, centre: { n: 0, good: 0 }, right: { n: 0, good: 0 } };
    for (const p of list) if (p.entryLane) {
      out[p.entryLane].n++;
      if (p.shots || p.box) out[p.entryLane].good++;
    }
    return out;
  };
  const samples = L.samples.filter(inHalf);
  const turn = L.turnovers.filter(inHalf);
  const passes = L.passes.filter((p) => inHalf(p) && p.done !== null);
  return {
    ours: byLane(ours),
    theirs: byLane(theirs),
    shots: ours.reduce((s, p) => s + p.shots, 0),
    shotsAgainst: theirs.reduce((s, p) => s + p.shots, 0),
    box: ours.filter((p) => p.box).length,
    boxAgainst: theirs.filter((p) => p.box).length,
    possession: samples.length ? samples.filter((s) => s.poss === team).length / samples.filter((s) => s.poss != null).length : 0.5,
    winsHigh: turn.filter((t) => t.to === team && t.third === 'att').length,
    lostDeep: turn.filter((t) => t.to === opp && t.third === 'att').length,
    passOk: passes.filter((p) => p.team === team).length ? passes.filter((p) => p.team === team && p.done).length / passes.filter((p) => p.team === team).length : 0,
    through: passes.filter((p) => p.team === team && p.through).length,
    throughOk: passes.filter((p) => p.team === team && p.through && p.done).length,
    oppLine: mean(samples.filter((s) => s.poss === team).map((s) => s.line[opp])),
    stamina: samples.at(-1)?.stamina[team] ?? 1,
    oppStamina: samples.at(-1)?.stamina[opp] ?? 1,
  };
}

// Mirror: Die Seite, über die der Gegner kommt, ist aus unserer Sicht gespiegelt.
const mirror = (lane) => (lane === 'left' ? 'right' : lane === 'right' ? 'left' : lane);

// Berichtspunkte: { tone: 'good' | 'bad' | 'opp', text }.
export function report(m, team, half = null) {
  const s = halfStats(m, team, half);
  if (!s) return { good: [], bad: [], opp: [] };
  const good = [];
  const bad = [];
  const opp = [];
  const mods = planMods(m, team);
  const oppMods = planMods(m, 1 - team);
  const chron = (m.situationLog ?? []).filter((e) => e.team === team && (half == null || e.half === half));
  const had = (type, lane) => chron.filter((e) => e.type === type && (lane === undefined || e.lane === lane)).reduce((x, e) => x + (e.until - e.from + 1), 0);

  // Unsere Seiten.
  for (const lane of ['left', 'right', 'centre']) {
    const l = s.ours[lane];
    if (l.good >= 2 && l.good >= l.n * 0.4) good.push(tr(`Angriffe über ${laneWord(lane)}`, `Attacks down ${laneWord(lane)}`));
    else if (l.n >= 3 && l.good === 0) bad.push(tr(`Über ${laneWord(lane)} geht nichts`, `Nothing working down ${laneWord(lane)}`));
  }
  if (s.winsHigh >= 3) good.push(mods.press ? tr('Pressing: Bälle vorne erobert', 'The press wins the ball high') : tr('Früh Bälle erobert', 'Winning the ball early'));
  if (s.through >= 2 && s.throughOk / s.through >= 0.4) good.push(tr('Bälle in die Tiefe kommen an', 'Balls in behind are finding their man'));
  else if (s.through >= 3 && s.throughOk === 0) bad.push(tr('Bälle in die Tiefe landen beim Gegner', 'Balls in behind keep going astray'));
  if (s.shots >= s.shotsAgainst + 3) good.push(tr('Wir kommen deutlich öfter zum Abschluss', 'We are getting far more shots away'));
  if (s.shotsAgainst >= s.shots + 3) bad.push(tr('Der Gegner kommt viel öfter zum Abschluss', 'They are getting far more shots away'));
  if (s.possession >= 0.58) good.push(tr('Wir haben das Spiel im Griff', 'We are controlling the game'));

  // Probleme aus der Situationschronik.
  const flank = ['left', 'right'].map((lane) => [lane, had('OPP_FLANK', lane)]).sort((a, b) => b[1] - a[1])[0];
  if (flank[1] >= 8) bad.push(tr(`Unsere ${flank[0] === 'left' ? 'linke' : 'rechte'} Seite bekommt keinen Zugriff`, `Our ${flank[0]} side can't get near them`));
  if (had('SECOND_BALLS') >= 8) bad.push(tr('Das Mittelfeld verliert die zweiten Bälle', 'Midfield is losing the second balls'));
  if (had('STRIKER_ISOLATED') >= 12) bad.push(tr('Die Spitze hängt allein', 'The striker is isolated'));
  if (had('UNDER_PRESSURE') >= 8 || s.lostDeep >= 4) bad.push(tr('Wir verlieren den Ball schon im Aufbau', 'We keep losing it in our own build-up'));
  if (had('PRESS_BYPASSED') >= 6) bad.push(tr('Das Pressing wird überspielt', 'The press is being played through'));
  if (had('PRESS_TIRING') >= 5 || (mods.tire > 1.1 && s.stamina < 0.6)) bad.push(tr('Das Pressing kostet sichtbar Kraft', 'The press is visibly draining us'));
  else if (s.stamina < 0.5) bad.push(tr('Die Kraft lässt nach', 'The legs are going'));

  // Was macht der Gegner?
  const theirBest = ['left', 'right', 'centre'].map((lane) => [lane, s.theirs[lane]]).sort((a, b) => b[1].good - a[1].good || b[1].n - a[1].n)[0];
  if (theirBest[1].n >= 3) opp.push(theirBest[0] === 'centre' ? tr('Angriffe durch die Mitte', 'Attacks through the middle') : tr(`Angriffe über unsere ${mirror(theirBest[0]) === 'left' ? 'linke' : 'rechte'} Seite`, `Attacks down our ${mirror(theirBest[0])}`));
  if (oppMods.press) opp.push(tr('Hohes Pressing', 'A high press'));
  if (s.oppLine > -0.4) opp.push(tr('Hohe Abwehrlinie', 'A high defensive line'));
  else if (s.oppLine < -0.6) opp.push(tr('Tief und kompakt', 'Deep and compact'));
  if (oppMods.long > 0.4) opp.push(tr('Lange Bälle auf die Spitze', 'Long balls up to the striker'));
  if (s.oppStamina < s.stamina - 0.08) opp.push(tr('Wird müde', 'Tiring'));
  // Umstellungen des gegnerischen Trainers.
  const changed = (m.decisions ?? []).filter((d) => d.team !== team && d.by === 'ai' && d.value != null && (half == null || d.half === half)).at(-1);
  if (changed) opp.unshift(tr(`Hat umgestellt: ${orderLabel(changed.group, changed.value)}`, `Has switched to: ${orderLabel(changed.group, changed.value)}`));
  return { good: good.slice(0, 3), bad: bad.slice(0, 3), opp: opp.slice(0, 3), stats: s };
}

// Hinweis, ob ein schneller Stürmer gegen die hohe Linie eine Idee wäre – als Tipp
// für die Halbzeit (Beispiel: „Müller gegen den langsamen Innenverteidiger").
export function matchupHint(m, team) {
  const opp = 1 - team;
  const fwd = m.players.filter((p) => p.team === team && p.role === 'fwd');
  const defs = m.players.filter((p) => p.team === opp && p.role === 'def');
  if (!fwd.length || !defs.length) return null;
  const quick = fwd.reduce((a, b) => (b.attrs.pace > a.attrs.pace ? b : a));
  const slow = defs.reduce((a, b) => (b.attrs.pace < a.attrs.pace ? b : a));
  if (quick.attrs.pace - slow.attrs.pace < 0.15) return null;
  return tr(`${surname(quick)} ist deutlich schneller als ${surname(slow)}`, `${surname(quick)} is much quicker than ${surname(slow)}`);
}
