// Liveticker mit Trainer: Ab und zu hält der Ticker an und will wissen, was du
// machst – Grundausrichtung, Reaktion aufs Gegentor, Halbzeitansprache, Wechsel,
// Schlussphase. Jede Antwort wirkt über die Zurufe bzw. die Grundausrichtung.
import { tr } from '../core/i18n.js';
import { tickerMinute } from './commentary.js';
import { enableManager, MENTALITIES, setMentality, shout } from './coach.js';
import { substitute } from './squad.js';

const LONG = (m) => m.duration * 0.12; // ein Zuruf im Ticker hält gut zehn Fußballminuten

const surname = (p) => p.name.split(' ').slice(-1)[0];

export function createTouchline(m, team) {
  enableManager(m, team);
  return { m, team, asked: new Set(), goalsSeen: 0, lastAsk: -99, open: null };
}

const diff = (tl) => tl.m.score[tl.team] - tl.m.score[1 - tl.team];

// Nach jedem Simulationsschritt (mit den Ereignissen dieses Schritts) fragen:
// Steht eine Entscheidung an? Gibt sie zurück oder null.
export function checkDecision(tl, events) {
  const { m, team } = tl;
  if (tl.open || m.phase === 'ended' || m.phase === 'shootout') return null;
  const minute = tickerMinute(m);
  const once = (id) => !tl.asked.has(id) && (tl.asked.add(id), true);
  const recent = m.time - tl.lastAsk < m.duration * 0.08;
  let d = null;

  if (minute >= 2 && once('start')) d = startDecision(tl);
  else if (events.some((e) => e.type === 'halftime') && once('halftime')) d = halftimeDecision(tl);
  else if (events.some((e) => e.type === 'goal' && e.team !== team) && !recent) d = concededDecision(tl);
  else if (minute >= 55 && !recent && !tl.asked.has('sub2')) d = subDecision(tl);
  else if (minute >= 78 && !recent && once('finale')) d = finaleDecision(tl);
  if (d) {
    tl.open = d;
    tl.lastAsk = m.time;
  }
  return d;
}

// Antwort anwenden. choice: Index der Option (Standard: 0).
export function answer(tl, choice = 0) {
  const d = tl.open;
  if (!d) return null;
  tl.open = null;
  const opt = d.options[Math.max(0, Math.min(d.options.length - 1, choice))];
  opt.apply?.(tl.m);
  return opt.line ?? null;
}

const call = (type, secsFactor = 1) => (m) => shout(m, type, { secs: LONG(m) * secsFactor, force: true });

function startDecision(tl) {
  const opp = tl.m.teams[1 - tl.team].name;
  const opt = (value, label, line) => ({ label, line, apply: (m) => setMentality(m, value) });
  return {
    id: 'start',
    question: tr(`Anpfiff gegen ${opp}. Wie gehen wir es an?`, `Kick-off against ${opp}. How do we approach it?`),
    options: [
      opt('normal', tr('Ganz normal – unser Spiel', 'As usual – our game'), tr('Der Trainer lässt es laufen: „Macht euer Spiel!"', 'The manager keeps it simple: "Play your game!"')),
      opt('offensive', tr('Offensiv – von Anfang an drauf', 'Attacking – go for it from the start'), tr('Der Trainer schickt alle nach vorne: „Wir wollen das erste Tor!"', 'The manager sends everyone forward: "We want the first goal!"')),
      opt('defensive', tr('Defensiv – erst mal sicher stehen', 'Defensive – stay solid first'), tr('Der Trainer mahnt: „Erst mal hinten sicher stehen."', 'The manager warns: "Stay solid at the back first."')),
    ],
  };
}

function halftimeDecision(tl) {
  const [a, b] = [tl.m.score[tl.team], tl.m.score[1 - tl.team]];
  const opt = (value, label, line, extra) => ({ label, line, apply: (m) => (setMentality(m, value), extra?.(m)) });
  return {
    id: 'halftime',
    question: tr(`Halbzeit, ${a}:${b}. Was sagst du in der Kabine?`, `Half-time, ${a}-${b}. What do you say in the dressing room?`),
    options: [
      opt(tl.m.mentality, tr('Weiter so', 'Keep it up'), tr('Kabinenansprache: „Weiter so, Jungs."', 'Team talk: "Keep it up, lads."')),
      opt('offensive', tr('Mehr nach vorne!', 'More going forward!'), tr('Kabinenansprache: „Jetzt mal Mut, raus da!"', 'Team talk: "Show some courage, get out there!"')),
      opt('defensive', tr('Hinten dichtmachen', 'Shut up shop'), tr('Kabinenansprache: „Nichts mehr zulassen!"', 'Team talk: "Don\'t let anything in!"')),
      opt(tl.m.mentality, tr('Anschreien (Pressing)', 'Give them a rollicking (press)'), tr('In der Kabine fliegt eine Trinkflasche. Die Jungs kommen wütend raus.', 'A water bottle flies across the dressing room. The lads come out fired up.'), call('press', 1.5)),
    ],
  };
}

function concededDecision(tl) {
  const [a, b] = [tl.m.score[tl.team], tl.m.score[1 - tl.team]];
  return {
    id: 'conceded',
    question: tr(`Gegentor, jetzt ${a}:${b}. Was rufst du rein?`, `Conceded, now ${a}-${b}. What do you shout?`),
    options: [
      { label: tr('„Ruhig bleiben!"', '"Stay calm!"'), line: tr('Der Trainer klatscht in die Hände: „Ruhig bleiben, weiter!"', 'The manager claps his hands: "Stay calm, keep going!"') },
      { label: tr('„Rückt auf!"', '"Push up!"'), line: tr('Von der Seitenlinie: „Rückt auf!"', 'From the touchline: "Push up!"'), apply: call('forward') },
      { label: tr('„Geht drauf!"', '"Press them!"'), line: tr('Von der Seitenlinie: „Geht drauf, lasst die nicht spielen!"', 'From the touchline: "Press them, don\'t let them play!"'), apply: call('press') },
      { label: tr('„Über die Flügel!"', '"Use the wings!"'), line: tr('Von der Seitenlinie: „Über außen, über außen!"', 'From the touchline: "Out wide, out wide!"'), apply: call('wide') },
    ],
  };
}

function subDecision(tl) {
  const { m, team } = tl;
  const onPitch = m.players.filter((p) => p.team === team && p.role !== 'gk');
  const tired = onPitch.reduce((x, y) => (y.stamina < x.stamina ? y : x), onPitch[0]);
  const bench = m.bench[team].filter((b) => !(b.late && m.half === 1)).slice(0, 3);
  if (!tired || tired.stamina > 0.45 || !bench.length) return null;
  tl.asked.add(tl.asked.has('sub1') ? 'sub2' : 'sub1');
  return {
    id: 'sub',
    question: tr(`${tired.name} pfeift aus dem letzten Loch. Wechseln?`, `${tired.name} is running on empty. Make a change?`),
    options: [
      { label: tr('Nein, der beißt sich durch', 'No, he\'ll grit his teeth'), line: tr(`${surname(tired)} bleibt drin. Er winkt ab: „Geht schon."`, `${surname(tired)} stays on. He waves it off: "I'm fine."`) },
      ...bench.map((b) => ({
        label: tr(`${b.name} bringen`, `Bring on ${b.name}`),
        line: tr(`Wechsel: ${b.name} kommt für ${surname(tired)}.`, `Substitution: ${b.name} replaces ${surname(tired)}.`),
        apply: (mm) => {
          if (mm.players.includes(tired) && mm.bench[team].includes(b)) substitute(mm, tired, b);
        },
      })),
    ],
  };
}

function finaleDecision(tl) {
  const d = diff(tl);
  const [a, b] = [tl.m.score[tl.team], tl.m.score[1 - tl.team]];
  const opt = (value, label, line, extra) => ({ label, line, apply: (m) => (setMentality(m, value), extra?.(m)) });
  return {
    id: 'finale',
    question: d > 0 ? tr(`Noch zehn Minuten, ${a}:${b}. Wie bringen wir das über die Zeit?`, `Ten minutes left, ${a}-${b}. How do we see it out?`) : tr(`Noch zehn Minuten, ${a}:${b}. Alles oder nichts?`, `Ten minutes left, ${a}-${b}. All or nothing?`),
    options: d > 0
      ? [
          opt('defensive', tr('Hinten dicht – Bus parken', 'Park the bus'), tr('Der Trainer zeigt nach hinten: „Alle zurück!"', 'The manager points backwards: "Everyone back!"')),
          opt(tl.m.mentality, tr('Weiter so – Konter fahren', 'Keep going – hit them on the break'), tr('Von der Seitenlinie: „Weiter so, auf Konter lauern!"', 'From the touchline: "Keep going, wait for the break!"'), call('wide')),
          opt('offensive', tr('Den Deckel draufmachen – drittes Tor!', 'Finish them off – one more goal!'), tr('Der Trainer will mehr: „Macht den Sack zu!"', 'The manager wants more: "Kill the game off!"')),
        ]
      : [
          opt('offensive', tr('Alles nach vorne!', 'Everyone forward!'), tr('Schlussoffensive! Sogar der Libero geht mit nach vorne.', 'All-out attack! Even the sweeper joins in.'), (m) => (call('press')(m), call('shoot', 0.8)(m))),
          opt(tl.m.mentality, tr('Geduld – die Chance kommt', 'Patience – the chance will come'), tr('Der Trainer bleibt ruhig auf der Bank sitzen.', 'The manager stays calmly on the bench.')),
          opt('defensive', tr(d === 0 ? 'Den Punkt sichern' : 'Nicht noch höher verlieren', d === 0 ? 'Settle for the point' : 'Avoid a heavier defeat'), tr('Der Trainer macht die Geste fürs Zurückziehen.', 'The manager signals to drop back.')),
        ],
  };
}

export const mentalityLabel = (m) => MENTALITIES[m.mentality ?? 'normal'];
