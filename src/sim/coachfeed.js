// CoachFeed: Was sagt der Co-Trainer wann? Aus den Situationen wird selten und
// gezielt eine Karte mit drei Möglichkeiten – keine Zahlenflut, keine Dauer-Popups.
// Nach einer Entscheidung wird nachgehalten, ob sie gewirkt hat (Beobachten →
// Entscheiden → Wirkung sehen).
import { tr } from '../core/i18n.js';
import { orderLabel } from './commands.js';
import { orderOf, setOrder } from './plan.js';
import { detectSituations, windowOf } from './situations.js';

const laneName = (lane) => (lane === 'left' ? tr('links', 'the left') : tr('rechts', 'the right'));
const LaneName = (lane) => (lane === 'left' ? tr('Links', 'Left') : tr('Rechts', 'Right'));
const surname = (p) => p?.name.split(' ').slice(-1)[0] ?? '';

// Texte je Situation: Überschrift, ein Satz Erklärung, Beschriftung der drei Optionen.
const TEXTS = {
  OPP_FLANK: (s) => ({
    title: tr(`Gegner kommt über ${laneName(s.lane)}`, `They keep coming down ${laneName(s.lane)}`),
    text: tr(`Immer wieder über unsere ${s.lane === 'left' ? 'linke' : 'rechte'} Seite – dort bekommen wir keinen Zugriff.`, `Again and again down our ${s.lane} side – we can't get near them there.`),
  }),
  OUR_SIDE_WORKS: (s) => ({
    title: tr(`${LaneName(s.lane)} läuft's`, `The ${s.lane} is working`),
    text: tr(`Unsere Angriffe über ${laneName(s.lane)} bringen Chancen.`, `Our attacks down ${laneName(s.lane)} are creating chances.`),
    labels: [tr(`Weiter über ${laneName(s.lane)}`, `Keep going down ${laneName(s.lane)}`), null, tr('Frei spielen lassen', 'Let them play')],
  }),
  SPACE_BEHIND: (s, m) => {
    const p = m.players.find((q) => q.id === s.playerId);
    return {
      title: tr('Raum hinter der Abwehr', 'Space in behind'),
      text: tr(`Deren Abwehr steht hoch – und ${surname(p)} ist schneller.`, `Their back line is high – and ${surname(p)} is quicker.`),
      labels: [null, null, tr('Ball sichern', 'Keep it safe')],
    };
  },
  PRESS_BYPASSED: () => ({
    title: tr('Pressing läuft ins Leere', 'The press is being bypassed'),
    text: tr('Der Gegner spielt sich immer wieder durch unsere erste Reihe.', 'They keep playing through our first line.'),
    labels: [tr('Pressing beibehalten', 'Keep pressing'), null, null],
  }),
  PRESS_TIRING: () => ({
    title: tr('Das Pressing kostet Kraft', 'The press is costing energy'),
    text: tr('Die Jungs pumpen schon – lange geht das nicht mehr.', 'The lads are blowing – this won\'t last much longer.'),
  }),
  STRIKER_ISOLATED: (s, m) => {
    const fwd = m.players.filter((p) => p.team === s.team && p.role === 'fwd');
    return {
      title: tr(`${surname(fwd[0]) || 'Die Spitze'} hängt vorne allein`, `${surname(fwd[0]) || 'The striker'} is isolated`),
      text: tr('Kaum Unterstützung für die Spitze – die Bälle kommen nicht an.', 'Hardly any support up front – the balls aren\'t sticking.'),
    };
  },
  SECOND_BALLS: () => ({
    title: tr('Zweite Bälle gehen verloren', 'Losing the second balls'),
    text: tr('Nach Kopfbällen und Abprallern ist immer der Gegner zuerst dran.', 'After headers and knock-downs they always get there first.'),
  }),
  OPP_DEEP_BLOCK: () => ({
    title: tr('Der Gegner mauert', 'They\'ve parked the bus'),
    text: tr('Alles dicht in der Mitte – wir kommen nicht durch.', 'Everything\'s shut in the middle – we can\'t get through.'),
    labels: [tr('Über die Flügel', 'Go down the wings'), tr('Geduld – Ball halten', 'Patience – keep the ball'), tr('Mehr Risiko, Distanzschüsse', 'More risk, shoot from distance')],
  }),
  OPP_TIRING: () => ({
    title: tr('Der Gegner wird müde', 'They\'re tiring'),
    text: tr('Drüben gehen die Hände auf die Knie – wir haben mehr Luft.', 'Hands on knees over there – we\'ve got more in the tank.'),
    labels: [tr('Jetzt draufgehen', 'Get at them now'), null, null],
  }),
  WE_TIRING: () => ({
    title: tr('Uns geht die Luft aus', 'We\'re running out of steam'),
    text: tr('Die Beine werden schwer. Zeit, Kraft zu sparen – oder frische Leute zu bringen.', 'The legs are going. Time to save energy – or bring on fresh ones.'),
  }),
  ENDGAME: (s) => ({
    title: s.lead === 'lead' ? tr('Schlussphase – knapp vorne', 'Closing stages – just ahead') : s.lead === 'behind' ? tr('Schlussphase – ein Tor fehlt', 'Closing stages – one goal short') : tr('Schlussphase – alles offen', 'Closing stages – all square'),
    text: s.lead === 'lead' ? tr('Wie bringen wir das über die Zeit?', 'How do we see this out?') : tr('Noch ein paar Minuten. Mehr Risiko heißt mehr Abschlüsse – aber auch Konter gegen uns.', 'A few minutes left. More risk means more shots – but also counters against us.'),
    labels: s.lead === 'lead' ? [tr('Ball laufen lassen', 'Keep the ball moving'), tr('Auf Konter lauern', 'Wait for the counter')] : [tr('Mehr Risiko', 'More risk'), tr('So weiterspielen', 'Keep playing our game')],
  }),
  UNDER_PRESSURE: () => ({
    title: tr('Die pressen uns hinten zu', 'They\'re pressing us high'),
    text: tr('Wir verlieren den Ball schon im Aufbau.', 'We\'re losing the ball in our own build-up.'),
    labels: [tr('Kurz und sicher', 'Short and safe'), tr('Über außen lösen', 'Play out wide'), tr('Lang nach vorne', 'Go long')],
  }),
};

// Karte aus einer Situation bauen.
export function cardFor(m, s) {
  const t = TEXTS[s.type](s, m);
  const options = s.options.map((o, i) => ({ ...o, label: t.labels?.[i] ?? (o.value == null ? tr('Frei spielen lassen', 'Let them play') : orderLabel(o.group, o.value)), active: o.value != null && orderOf(m, s.team, o.group) === o.value }));
  return { type: s.type, lane: s.lane ?? null, team: s.team, title: t.title, text: t.text, options, severity: s.severity, t: m.time };
}

const gapOf = (m) => Math.max(20, m.duration * 0.14);

// Jede Spielsekunde: neue Karte fällig? Setzt m.coachCard (oder lässt die alte stehen).
export function stepCoachFeed(m, team) {
  if (team == null || m.phase !== 'play') return null;
  const f = (m.feed ??= { shown: [], followUps: [], lastCard: -99, nextCheck: 0 });
  if (m.time < f.nextCheck) return null;
  f.nextCheck = m.time + 1;
  // Alte Karte läuft ab.
  if (m.coachCard && m.time - m.coachCard.t > Math.max(14, m.duration * 0.07)) m.coachCard = null;
  checkFollowUps(m, team, f);
  if (m.coachCard || m.time < m.duration * 0.12 || m.time - f.lastCard < gapOf(m)) return null;
  const perHalf = f.shown.filter((c) => c.half === m.half).length;
  if (perHalf >= 3) return null;
  const list = m.situations?.[team] ?? detectSituations(m, team);
  // Abwechslung: Was schon gezeigt wurde, muss deutlicher sein, um wieder zu kommen.
  const weight = (s) => s.severity * s.confidence * 0.6 ** f.shown.filter((c) => c.type === s.type).length;
  const ranked = [...list].sort((a, b) => weight(b) - weight(a));
  const pick = ranked.find((s) => {
    if (weight(s) < 0.2) return false;
    // Dieselbe Lage nicht gleich wieder melden.
    if (f.shown.some((c) => c.type === s.type && c.lane === (s.lane ?? null) && m.time - c.t < m.duration * 0.35)) return false;
    // Schon so eingestellt, wie die erste Option es will? Dann nichts zu sagen – außer bei Rückfragen.
    const first = s.options[0];
    return !(first.value != null && orderOf(m, team, first.group) === first.value && s.type !== 'PRESS_BYPASSED');
  });
  if (!pick) return null;
  const card = cardFor(m, pick);
  m.coachCard = card;
  f.lastCard = m.time;
  f.shown.push({ type: card.type, lane: card.lane, t: m.time, half: m.half });
  m.events.push({ type: 'coach_card', team, situation: card.type });
  return card;
}

// Antwort auf die Karte (Index der Option, oder null = „egal").
export function answerCard(m, team, index) {
  const card = m.coachCard;
  if (!card) return null;
  m.coachCard = null;
  const opt = index == null ? null : card.options[index];
  if (opt) setOrder(m, team, opt.group, opt.value, { by: 'card' });
  const f = (m.feed ??= { shown: [], followUps: [], lastCard: -99, nextCheck: 0 });
  // Nachhalten: Ist die Lage in einer Weile besser?
  f.followUps.push({ type: card.type, lane: card.lane, decidedAt: m.time, choice: opt ? `${opt.group}:${opt.value}` : null, label: opt?.label ?? null, severity: card.severity, done: false });
  m.events.push({ type: 'coach_answer', team, situation: card.type, choice: opt?.label ?? null });
  return opt;
}

const FOLLOW_TEXTS = {
  better: {
    OPP_FLANK: (fu) => tr(`${LaneName(fu.lane)} ist jetzt dichter – der Gegner kommt dort kaum noch durch.`, `The ${fu.lane} is tighter now – they hardly get through there.`),
    PRESS_BYPASSED: () => tr('Seit der Umstellung kommt der Gegner nicht mehr so leicht durch.', 'Since the change they don\'t get through so easily.'),
    PRESS_TIRING: () => tr('Die Jungs haben wieder Luft.', 'The lads have their breath back.'),
    SECOND_BALLS: () => tr('Jetzt sind wir bei den zweiten Bällen da.', 'Now we\'re winning the second balls.'),
    UNDER_PRESSURE: () => tr('Wir kommen jetzt sauberer raus.', 'We\'re playing out more cleanly now.'),
    STRIKER_ISOLATED: () => tr('Die Spitze bekommt jetzt Unterstützung.', 'The striker has support now.'),
    OPP_DEEP_BLOCK: () => tr('Wir finden jetzt Wege durch den Abwehrriegel.', 'We\'re finding ways through the wall now.'),
  },
  worse: {
    OPP_FLANK: (fu) => tr(`Über ${laneName(fu.lane)} brennt es weiter.`, `Still burning down ${laneName(fu.lane)}.`),
    PRESS_BYPASSED: () => tr('Der Gegner spielt sich weiter durch.', 'They\'re still playing through us.'),
    PRESS_TIRING: () => tr('Die Kraft wird trotzdem weniger.', 'The legs are still going.'),
    SECOND_BALLS: () => tr('Die zweiten Bälle gehen weiter weg.', 'Still losing the second balls.'),
    UNDER_PRESSURE: () => tr('Wir verlieren den Ball weiter hinten.', 'Still losing it at the back.'),
    STRIKER_ISOLATED: () => tr('Die Spitze hängt weiter allein.', 'The striker is still on his own.'),
    OPP_DEEP_BLOCK: () => tr('Weiter kein Durchkommen.', 'Still no way through.'),
  },
};

function checkFollowUps(m, team, f) {
  const wait = windowOf(m) * 0.8;
  for (const fu of f.followUps) {
    if (fu.done || m.time - fu.decidedAt < wait) continue;
    fu.done = true;
    const now = (m.situations?.[team] ?? []).find((s) => s.type === fu.type && (s.lane ?? null) === fu.lane);
    fu.result = !now ? 'better' : now.severity < fu.severity * 0.8 ? 'better' : 'worse';
    const text = FOLLOW_TEXTS[fu.result][fu.type]?.(fu);
    if (text) m.events.push({ type: 'coach_followup', team, situation: fu.type, result: fu.result, text });
    fu.text = text ?? null;
  }
}
