// CausalTrace: Warum ist das Tor gefallen? Aus dem Spielprotokoll wird für jedes Tor
// die Kette rekonstruiert – vom Ballgewinn über die Seite bis zum Abschluss – und mit
// den Trainerentscheidungen verknüpft, die dabei eine Rolle spielten. Dazu die
// Frage, ob eine Entscheidung das Spiel sichtbar verändert hat (vorher/nachher).
// Nur Auswertung, keine Wirkung aufs Spiel.
import { tr } from '../core/i18n.js';
import { footballMinute } from './minute.js';
import { orderLabel } from './commands.js';
import { hasProfile, PROFILES } from './profiles.js';
import { findAnyPlayer } from './squad.js';
import { windowOf } from './situations.js';

const minuteOf = (m, t) => footballMinute(m, t);
const surname = (p) => p?.name.split(' ').slice(-1)[0] ?? '?';
const laneWord = (lane) => (lane === 'left' ? tr('über links', 'down the left') : lane === 'right' ? tr('über rechts', 'down the right') : tr('durch die Mitte', 'through the middle'));
const HOW = {
  tackle: tr('Ballgewinn im Zweikampf', 'Won the ball in a challenge'),
  intercept: tr('Pass abgefangen', 'Intercepted a pass'),
  keeper: tr('Aus den Händen des Torwarts', 'Out of the keeper\'s hands'),
  restart: tr('Nach einem Standard', 'From a restart'),
  loose: tr('Zweiter Ball erobert', 'Picked up a loose ball'),
};
const THIRD = { def: tr('in der eigenen Hälfte', 'in our own half'), mid: tr('im Mittelfeld', 'in midfield'), att: tr('weit vorne', 'high up the pitch') };

// Welche Befehle galten zum Zeitpunkt t (und seit wann)?
export function ordersAt(m, team, t) {
  const now = {};
  for (const d of m.decisions ?? []) {
    if (d.team !== team || d.t > t || d.group === 'style') continue;
    if (d.value == null) delete now[d.group];
    else now[d.group] = { value: d.value, since: d.t, by: d.by };
  }
  return now;
}

// Kette für ein Tor.
export function traceGoal(m, goal) {
  const L = m.log;
  if (!L) return null;
  const team = goal.team;
  // Die Ballbesitzphase, in der das Tor fiel.
  const poss = [...L.poss].reverse().find((p) => p.team === team && p.start <= goal.time + 0.01) ?? null;
  const passes = poss ? L.passes.filter((p) => p.team === team && p.t >= poss.start && p.t <= goal.time) : [];
  const scorer = goal.scorerId && findAnyPlayer(m, goal.scorerId);
  const assist = goal.assistId && findAnyPlayer(m, goal.assistId);
  const orders = ordersAt(m, team, goal.time);
  const steps = [];
  const causes = []; // Trainerentscheidungen, die in dieser Kette sichtbar werden
  const add = (group, value) => {
    const o = orders[group];
    if (o && o.value === value && o.by !== 'ai') causes.push({ group, value, since: o.since });
    else if (o && o.value === value) causes.push({ group, value, since: o.since, ai: true });
  };
  if (goal.ownGoal) steps.push(tr('Eigentor – Pech für den Gegner', 'Own goal – bad luck for them'));
  if (poss) {
    const quick = goal.time - poss.start < 8 && poss.startThird !== 'att';
    steps.push(`${HOW[poss.how] ?? HOW.loose} ${THIRD[poss.startThird]}`);
    if (poss.how === 'tackle' && poss.startThird === 'att') add('press', 'hoch');
    if (quick && poss.startThird === 'def') {
      steps.push(tr('Schnell umgeschaltet – Konter', 'Quick transition – on the counter'));
      add('route', 'konter');
    }
    if (poss.entryLane) {
      steps.push(tr(`Angriff ${laneWord(poss.entryLane)}`, `Attack ${laneWord(poss.entryLane)}`));
      if (poss.entryLane !== 'centre') add('side', poss.entryLane);
      if (poss.entryLane !== 'centre') add('route', 'aussen');
      else add('route', 'mitte');
    }
    if (passes.length >= 4) {
      steps.push(tr(`${passes.length} Pässe in Folge`, `${passes.length} passes in a row`));
      add('build', 'kurz');
      add('build', 'halten');
    }
  }
  const combo = passes.findLast((p) => p.combo && p.done);
  if (combo) {
    const k = findAnyPlayer(m, combo.kicker);
    const r = findAnyPlayer(m, combo.targetId);
    steps.push(combo.combo === 'layoff' ? tr(`Ablage, ${surname(r)} startet, ${surname(k)} spielt ihn in die Tiefe`, `Lay-off, ${surname(r)} spins, ${surname(k)} plays it in behind`) : tr(`Doppelpass ${surname(r)} – ${surname(k)}`, `One-two ${surname(r)} – ${surname(k)}`));
    add('route', 'kombi');
  }
  const through = passes.find((p) => p.through && p.done);
  if (through) {
    const k = findAnyPlayer(m, through.kicker);
    steps.push(tr(`Pass in die Tiefe von ${surname(k)}`, `Ball in behind from ${surname(k)}`));
    add('route', 'tiefe');
  }
  const cross = passes.findLast((p) => p.lofted && p.third === 'att');
  if (cross && !through) steps.push(tr('Hoher Ball in den Strafraum', 'High ball into the box'));
  if (assist && !through) steps.push(tr(`Vorlage ${surname(assist)}`, `Set up by ${surname(assist)}`));
  if (scorer && !goal.ownGoal) {
    const prof = ['sprinter', 'spielmacher', 'solist', 'kaempfer'].find((id) => hasProfile(scorer, id));
    const sub = !(L.starters ?? []).includes(scorer.id) && (L.subsIn ?? []).includes(scorer.id);
    steps.push(tr(`Abschluss ${surname(scorer)}${goal.via === 'header' ? ' per Kopf' : ''}${prof ? ` (${PROFILES[prof].label})` : ''}${sub ? ', eingewechselt' : ''}`, `Finished by ${surname(scorer)}${goal.via === 'header' ? ' with a header' : ''}${prof ? ` (${PROFILES[prof].label})` : ''}${sub ? ', off the bench' : ''}`));
  }
  steps.push(goal.ownGoal ? tr('Tor durch Eigentor', 'Goal – own goal') : tr('Tor', 'Goal'));
  return { team, time: goal.time, minute: minuteOf(m, goal.time), steps, causes, how: poss?.how ?? null, lane: poss?.entryLane ?? null, through: !!through };
}

export const traceGoals = (m) => (m.stats?.goals ?? []).map((g) => traceGoal(m, g)).filter(Boolean);

// Hat eine Entscheidung das Spiel verändert? Gefahr für und gegen uns im gleich
// langen Fenster davor und danach (Strafraumaktionen, Schüsse, Tore).
export function evaluateDecision(m, d) {
  const L = m.log;
  if (!L) return null;
  const w = Math.min(windowOf(m), d.t, m.duration - d.t);
  if (w < m.duration * 0.08) return null; // zu früh oder zu spät, um etwas zu sagen
  const span = (a, b, team) => {
    const ps = L.poss.filter((p) => p.team === team && p.start >= a && p.start < b);
    return ps.reduce((s, p) => s + (p.box ? 1 : 0) + p.shots * 0.5 + (p.goal ? 2 : 0), 0);
  };
  const us = d.team;
  const them = 1 - us;
  const before = { us: span(d.t - w, d.t, us), them: span(d.t - w, d.t, them) };
  const after = { us: span(d.t, d.t + w, us), them: span(d.t, d.t + w, them) };
  const swing = after.us - before.us - (after.them - before.them);
  return { ...d, before, after, swing, window: w };
}

// Der entscheidende Moment: die Entscheidung mit der größten sichtbaren Wirkung.
export function decisiveMoment(m, team) {
  const own = (m.decisions ?? []).filter((d) => d.team === team && d.by !== 'ai' && d.value != null);
  const rated = own.map((d) => evaluateDecision(m, d)).filter(Boolean);
  if (!rated.length) return null;
  const best = rated.reduce((a, b) => (Math.abs(b.swing) > Math.abs(a.swing) ? b : a));
  if (Math.abs(best.swing) < 1.5) return null;
  const label = best.group === 'style' ? best.value : orderLabel(best.group, best.value);
  const minute = minuteOf(m, best.t);
  const dangerDrop = best.before.them - best.after.them;
  const text = best.swing > 0
    ? dangerDrop >= 1.5
      ? tr(`In der ${minute}. Minute: „${label}". Danach kam der Gegner deutlich seltener gefährlich vor unser Tor.`, `Minute ${minute}: “${label}”. After that they got into dangerous positions far less often.`)
      : tr(`In der ${minute}. Minute: „${label}". Danach kamen wir deutlich öfter gefährlich vors Tor.`, `Minute ${minute}: “${label}”. After that we got into dangerous positions far more often.`)
    : tr(`In der ${minute}. Minute: „${label}". Danach kippte das Spiel – der Gegner wurde gefährlicher.`, `Minute ${minute}: “${label}”. After that the game turned – they became more dangerous.`);
  return { ...best, minute, label, text, positive: best.swing > 0 };
}
