// Liveticker mit Trainer: Ab und zu hält der Ticker an und will wissen, was du
// machst – Grundausrichtung, Reaktion aufs Gegentor, Halbzeitansprache, Wechsel,
// Schlussphase. Jede Antwort wirkt über die Zurufe bzw. die Grundausrichtung.
import { tr } from '../core/i18n.js';
import { matchMinutes, minute90 } from './minute.js';
import { enableManager, MENTALITIES, setMentality, shout } from './coach.js';
import { canSubNow, substitute, subsLeft, usableBench } from './squad.js';
import { answerCard } from './coachfeed.js';


const surname = (p) => p.name.split(' ').slice(-1)[0];
// Textvielfalt (ROADMAP 11.18 Punkt 9): Fragen und Antwortsätze haben mehrere Fassungen. Gewählt wird ohne den Zufall des
// Spiels (Startwert, Frage und Minute gestreut), damit kein Spielverlauf sich ändert. Liste von tr()-Paaren.
const vary = (tl, key, list) => {
  const h = [...key].reduce((a, ch) => (Math.imul(a ^ ch.charCodeAt(0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, ((tl.m.seed ?? 1) * 2654435761 + Math.floor(tl.m.time)) >>> 0);
  return list[h % list.length];
};

export function createTouchline(m, team) {
  enableManager(m, team);
  return { m, team, asked: new Set(), goalsSeen: 0, lastAsk: -99, open: null };
}

const diff = (tl) => tl.m.score[tl.team] - tl.m.score[1 - tl.team];
// Spielstand aus unserer Sicht (eigene Tore zuerst), wie man es an der Linie sagt: „wir führen 3:1".
const board = (tl) => tr(`${tl.m.score[tl.team]}:${tl.m.score[1 - tl.team]}`, `${tl.m.score[tl.team]}-${tl.m.score[1 - tl.team]}`);

// Nach jedem Simulationsschritt (mit den Ereignissen dieses Schritts) fragen:
// Steht eine Entscheidung an? Gibt sie zurück oder null.
export function checkDecision(tl, events) {
  const { m, team } = tl;
  if (tl.open || m.phase === 'ended' || m.phase === 'shootout') return null;
  const minute = minute90(m); // Schwellen auf 90 gerechnet, auch in der Halle
  const once = (id) => !tl.asked.has(id) && (tl.asked.add(id), true);
  const recent = m.time - tl.lastAsk < m.duration * 0.08;
  let d = null;

  if (minute >= 2 && once('start')) d = startDecision(tl);
  else if (events.some((e) => e.type === 'halftime') && once('halftime')) d = halftimeDecision(tl);
  else if (events.some((e) => e.type === 'goal' && e.team !== team) && !recent) d = concededDecision(tl);
  else if (minute >= 55 && !recent && !tl.asked.has('sub2')) d = subDecision(tl);
  else if (minute >= 78 && !recent && once('finale')) d = finaleDecision(tl);
  else if (m.coachCard && m.coachCard.team === team && m.coachCard !== tl.lastCard) d = cardDecision(tl, m.coachCard);
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

const call = (type) => (m) => shout(m, type, { force: true });

function startDecision(tl) {
  const opp = tl.m.teams[1 - tl.team].name;
  const opt = (value, label, line) => ({ label, line, apply: (m) => setMentality(m, value) });
  return {
    id: 'start',
    question: vary(tl, 'start', [
      tr(`Anpfiff gegen ${opp}. Wie gehen wir es an?`, `Kick-off against ${opp}. How do we approach it?`),
      tr(`Gleich geht's los gegen ${opp}. Was gibst du den Jungs mit?`, `About to start against ${opp}. What do you tell the lads?`),
      tr(`${opp} steht bereit, der Schiri schaut auf die Uhr. Welche Marschroute?`, `${opp} are ready, the ref checks his watch. What's the plan?`),
      tr(`Letzte Worte vor dem Anpfiff gegen ${opp}?`, `Last words before kick-off against ${opp}?`),
    ]),
    options: [
      opt('normal', tr('Ganz normal – unser Spiel', 'As usual – our game'), vary(tl, 'start-n', [tr('Der Trainer lässt es laufen: „Macht euer Spiel!"', 'The manager keeps it simple: "Play your game!"'), tr('„Wie im Training, Jungs. Nicht mehr, nicht weniger."', '"Like in training, lads. No more, no less."'), tr('Der Trainer nickt nur und setzt sich auf die Bank.', 'The manager just nods and sits down on the bench.')])),
      opt('offensive', tr('Offensiv – von Anfang an drauf', 'Attacking – go for it from the start'), tr('Der Trainer schickt alle nach vorne: „Wir wollen das erste Tor!"', 'The manager sends everyone forward: "We want the first goal!"')),
      opt('defensive', tr('Defensiv – erst mal sicher stehen', 'Defensive – stay solid first'), vary(tl, 'start-d', [tr('Der Trainer mahnt: „Erst mal hinten sicher stehen."', 'The manager warns: "Stay solid at the back first."'), tr('„Die ersten zwanzig Minuten: null hinten. Dann sehen wir weiter."', '"First twenty minutes: nothing conceded. Then we\'ll see."'), tr('Der Trainer klopft dem Innenverteidiger auf die Schulter: „Du hältst den Laden zusammen."', 'The manager pats the centre-back on the shoulder: "You hold it all together."')])),
    ],
  };
}

function halftimeDecision(tl) {
  const opt = (value, label, line, extra) => ({ label, line, apply: (m) => (setMentality(m, value), extra?.(m)) });
  return {
    id: 'halftime',
    question: diff(tl) > 0
      ? vary(tl, 'ht+', [
          tr(`Halbzeit, wir führen ${board(tl)}. Was sagst du in der Kabine?`, `Half-time, we lead ${board(tl)}. What do you say in the dressing room?`),
          tr(`${board(tl)} zur Pause. Die Jungs grinsen – zu früh?`, `${board(tl)} at the break. The lads are grinning – too early?`),
          tr(`Halbzeit, ${board(tl)}. In der Kabine ist gute Stimmung. Was jetzt?`, `Half-time, ${board(tl)}. Good mood in the dressing room. What now?`),
        ])
      : diff(tl) < 0
        ? vary(tl, 'ht-', [
            tr(`Halbzeit, ${board(tl)}. Was sagst du in der Kabine?`, `Half-time, ${board(tl)}. What do you say in the dressing room?`),
            tr(`${board(tl)} zur Pause. Alle schauen auf den Boden. Deine Worte?`, `${board(tl)} at the break. Everyone stares at the floor. Your words?`),
            tr(`Halbzeit, wir liegen ${board(tl)} hinten. Die Kabinentür ist zu – was jetzt?`, `Half-time, we trail ${board(tl)}. The door is shut – what now?`),
          ])
        : vary(tl, 'ht0', [
            tr(`Halbzeit, ${board(tl)}. Was sagst du in der Kabine?`, `Half-time, ${board(tl)}. What do you say in the dressing room?`),
            tr(`${board(tl)} zur Pause, alles offen. Was sagst du?`, `${board(tl)} at the break, all to play for. What do you say?`),
            tr(`Halbzeit, ${board(tl)}. Der Tee ist heiß, die Köpfe auch. Deine Ansage?`, `Half-time, ${board(tl)}. The tea is hot, so are the heads. Your call?`),
          ]),
    options: [
      opt(tl.m.mentality, tr('Weiter so', 'Keep it up'), vary(tl, 'ht-k', [tr('Kabinenansprache: „Weiter so, Jungs."', 'Team talk: "Keep it up, lads."'), tr('Kabinenansprache: „Genau so weitermachen. Keiner wird jetzt leichtsinnig."', 'Team talk: "Exactly the same again. Nobody gets careless now."'), tr('Der Trainer verteilt Tee und sagt nur: „Passt schon."', 'The manager hands out tea and just says: "That\'ll do."')])),
      opt('offensive', tr('Mehr nach vorne!', 'More going forward!'), vary(tl, 'ht-o', [tr('Kabinenansprache: „Jetzt mal Mut, raus da!"', 'Team talk: "Show some courage, get out there!"'), tr('Kabinenansprache: „Die wackeln. Wir gehen jetzt drauf!"', 'Team talk: "They\'re wobbling. We go for them now!"'), tr('Der Trainer malt drei Pfeile nach vorne auf die Taktiktafel.', 'The manager draws three arrows pointing forward on the tactics board.')])),
      opt('defensive', tr('Hinten dichtmachen', 'Shut up shop'), vary(tl, 'ht-d', [tr('Kabinenansprache: „Nichts mehr zulassen!"', 'Team talk: "Don\'t let anything in!"'), tr('Kabinenansprache: „Kompakt, eng, kein Risiko. Verstanden?"', 'Team talk: "Compact, tight, no risks. Understood?"'), tr('Der Trainer zeigt auf das eigene Tor: „Da kommt keiner mehr rein."', 'The manager points at our goal: "Nobody gets in there again."')])),
      opt(tl.m.mentality, tr('Anschreien (Pressing)', 'Give them a rollicking (press)'), tr('In der Kabine fliegt eine Trinkflasche. Die Jungs kommen wütend raus.', 'A water bottle flies across the dressing room. The lads come out fired up.'), call('press', 1.5)),
    ],
  };
}

function concededDecision(tl) {
  return {
    id: 'conceded',
    question: vary(tl, 'conc', [
      tr(`Gegentor, jetzt ${board(tl)}. Was rufst du rein?`, `Conceded, now ${board(tl)}. What do you shout?`),
      tr(`Drin. ${board(tl)}. Die Köpfe gehen runter – was rufst du?`, `It's in. ${board(tl)}. Heads drop – what do you shout?`),
      tr(`Der Ball liegt im eigenen Netz, ${board(tl)}. Deine Ansage von der Linie?`, `The ball is in our net, ${board(tl)}. Your call from the touchline?`),
    ]),
    options: [
      { label: tr('„Ruhig bleiben!"', '"Stay calm!"'), line: vary(tl, 'conc-r', [tr('Der Trainer klatscht in die Hände: „Ruhig bleiben, weiter!"', 'The manager claps his hands: "Stay calm, keep going!"'), tr('„Abhaken! Mund abputzen, weiter!"', '"Forget it! Wipe your mouths, go again!"'), tr('Der Trainer hebt beide Hände: „Ganz ruhig. Wir sind noch da."', 'The manager raises both hands: "Easy. We\'re still in this."')]) },
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
  const bench = subsLeft(m, team) > 0 ? usableBench(m, team).slice(0, 3) : [];
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
          if (mm.players.includes(tired) && usableBench(mm, team).includes(b) && canSubNow(mm, team)) substitute(mm, tired, b);
        },
      })),
    ],
  };
}

function finaleDecision(tl) {
  const d = diff(tl);
  const opt = (value, label, line, extra) => ({ label, line, apply: (m) => (setMentality(m, value), extra?.(m)) });
  // Restzeit in Minuten der Anzeige (90 → zehn, Halle 40 → vier).
  const left = Math.round((matchMinutes(tl.m) * 10) / 90);
  const [de, en] = { 4: ['vier', 'Four'], 10: ['zehn', 'Ten'] }[left] ?? [String(left), String(left)];
  return {
    id: 'finale',
    question: d > 0
      ? tr(`Noch ${de} Minuten, wir führen ${board(tl)}. Wie bringen wir das über die Zeit?`, `${en} minutes left, we lead ${board(tl)}. How do we see it out?`)
      : d < 0
        ? tr(`Noch ${de} Minuten, wir liegen ${board(tl)} hinten. Alles oder nichts?`, `${en} minutes left, we trail ${board(tl)}. All or nothing?`)
        : tr(`Noch ${de} Minuten, ${board(tl)}. Alles oder nichts?`, `${en} minutes left, ${board(tl)}. All or nothing?`),
    options: d > 0
      ? [
          opt('defensive', tr('Hinten dicht – Bus parken', 'Park the bus'), tr('Der Trainer zeigt nach hinten: „Alle zurück!"', 'The manager points backwards: "Everyone back!"')),
          opt(tl.m.mentality, tr('Weiter so – Konter fahren', 'Keep going – hit them on the break'), tr('Von der Seitenlinie: „Weiter so, auf Konter lauern!"', 'From the touchline: "Keep going, wait for the break!"'), call('wide')),
          opt('offensive', tr('Den Deckel draufmachen – noch ein Tor!', 'Finish them off – one more goal!'), tr('Der Trainer will mehr: „Macht den Sack zu!"', 'The manager wants more: "Kill the game off!"')),
        ]
      : [
          opt('offensive', tr('Alles nach vorne!', 'Everyone forward!'), tr('Schlussoffensive! Sogar der Libero geht mit nach vorne.', 'All-out attack! Even the sweeper joins in.'), (m) => (call('press')(m), call('forward')(m))),
          opt(tl.m.mentality, tr('Geduld – die Chance kommt', 'Patience – the chance will come'), tr('Der Trainer bleibt ruhig auf der Bank sitzen.', 'The manager stays calmly on the bench.')),
          opt('defensive', tr(d === 0 ? 'Den Punkt sichern' : 'Nicht noch höher verlieren', d === 0 ? 'Settle for the point' : 'Avoid a heavier defeat'), tr('Der Trainer macht die Geste fürs Zurückziehen.', 'The manager signals to drop back.')),
        ],
  };
}

// Lagekarte des Co-Trainers (coachfeed.js) als Ticker-Frage.
function cardDecision(tl, card) {
  tl.lastCard = card;
  return {
    id: `card:${card.type}`,
    question: `${card.title}. ${card.text}`,
    options: [
      ...card.options.map((o, i) => ({ label: o.label, line: tr(`Von der Seitenlinie: „${o.label}!“`, `From the touchline: “${o.label}!”`), apply: (m) => answerCard(m, tl.team, i) })),
      { label: tr('Nichts ändern', 'No change'), line: tr('Der Trainer schaut sich das noch an.', 'The manager keeps watching.'), apply: (m) => answerCard(m, tl.team, null) },
    ],
  };
}

export const mentalityLabel = (m) => MENTALITIES[m.mentality ?? 'normal'];
