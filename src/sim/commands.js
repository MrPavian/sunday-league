// Trainerbefehle für die Oberfläche: Beschriftung, kurze Erklärung, Gruppen. Die
// Wirkung steht in plan.js (ORDER_EFFECTS) – hier nur, wie man sie dem Trainer zeigt.
import { tr } from '../core/i18n.js';
import { orderOf, setOrder } from './plan.js';

export const GROUP_LABELS = {
  build: tr('Aufbau', 'Build-up'),
  route: tr('Angriff', 'Attack'),
  side: tr('Seite', 'Side'),
  press: tr('Pressing', 'Pressing'),
  guard: tr('Gegen den Ball', 'Out of possession'),
  cover: tr('Absichern', 'Cover'),
  shape: tr('Formation', 'Shape'),
  tempo: tr('Tempo', 'Tempo'),
  risk: tr('Risiko', 'Risk'),
};

// label: Knopf, hint: was es auf dem Platz bedeutet (ein Satz).
export const ORDERS = {
  'build:halten': { label: tr('Ball halten', 'Keep the ball'), hint: tr('Ruhig hinten rum, kaum Risiko – dafür weniger Torschüsse.', 'Patient passing at the back, little risk – but fewer shots.') },
  'build:kurz': { label: tr('Kurzpassspiel', 'Short passing'), hint: tr('Kurze Wege, flach, wenig lange Bälle.', 'Short distances, on the ground, few long balls.') },
  'build:direkt': { label: tr('Direkt spielen', 'Play direct'), hint: tr('Schnell nach vorne, auch mal lang.', 'Forward quickly, long if need be.') },
  'route:aussen': { label: tr('Über außen', 'Down the wings'), hint: tr('Breit machen, Flanken.', 'Stretch the pitch, cross.') },
  'route:mitte': { label: tr('Durch die Mitte', 'Through the middle'), hint: tr('Eng und zentral, kaum Flanken.', 'Narrow and central, few crosses.') },
  'route:tiefe': { label: tr('In die Tiefe', 'In behind'), hint: tr('Bälle hinter die Abwehr, die Spitze startet auf Höhe der letzten Linie.', 'Balls in behind, the striker runs off the last defender.') },
  'route:konter': { label: tr('Konter', 'Counter'), hint: tr('Tief stehen, Ball erobern, schnell und steil.', 'Sit deep, win it, go fast and direct.') },
  'side:left': { label: tr('Über links', 'Down the left'), hint: tr('Angriffe über die linke Seite.', 'Attacks down the left.') },
  'side:right': { label: tr('Über rechts', 'Down the right'), hint: tr('Angriffe über die rechte Seite.', 'Attacks down the right.') },
  'press:hoch': { label: tr('Hoch pressen', 'Press high'), hint: tr('Früh drauf, der Block schiebt nach – kostet Kraft, lässt Raum im Rücken.', 'Get in early, the block squeezes up – costs stamina, leaves space behind.') },
  'press:mittel': { label: tr('Mittleres Pressing', 'Mid-block'), hint: tr('Erst ab der Mittellinie drauf.', 'Engage from the halfway line.') },
  'press:tief': { label: tr('Tief stehen', 'Sit deep'), hint: tr('Kompakt vor dem eigenen Strafraum.', 'Compact in front of our box.') },
  'guard:aussen': { label: tr('Nach außen lenken', 'Show them wide'), hint: tr('Von innen anlaufen, der Gegner muss an die Linie.', 'Press from inside, force them to the touchline.') },
  'guard:zentrum': { label: tr('Zentrum zumachen', 'Close the middle'), hint: tr('Eng in der Mitte, außen darf er.', 'Narrow in the middle, let them go wide.') },
  'guard:konter': { label: tr('Konter absichern', 'Guard against the counter'), hint: tr('Zwei bleiben hinten, auch wenn wir angreifen.', 'Two stay back even when we attack.') },
  'cover:left': { label: tr('Links absichern', 'Cover the left'), hint: tr('Block schiebt nach links, der Außenverteidiger bleibt.', 'The block shifts left, the full-back stays home.') },
  'cover:right': { label: tr('Rechts absichern', 'Cover the right'), hint: tr('Block schiebt nach rechts, der Außenverteidiger bleibt.', 'The block shifts right, the full-back stays home.') },
  'shape:aufruecken': { label: tr('Mittelfeld rückt nach', 'Midfield push up'), hint: tr('Näher an die Spitze, mehr Leute vorne.', 'Closer to the striker, more bodies forward.') },
  'shape:kompakt': { label: tr('Kompakter', 'Stay compact'), hint: tr('Reihen eng zusammen, zweite Bälle gewinnen.', 'Lines tight together, win the second balls.') },
  'shape:stuermer_fallen': { label: tr('Stürmer lässt sich fallen', 'Striker drops deep'), hint: tr('Die Spitze kommt entgegen und verbindet.', 'The striker comes short and links play.') },
  'tempo:ruhig': { label: tr('Tempo raus', 'Slow it down'), hint: tr('Länger überlegen, Kraft sparen.', 'Take your time, save energy.') },
  'tempo:schnell': { label: tr('Tempo rein', 'Speed it up'), hint: tr('Schneller entscheiden.', 'Decide faster.') },
  'risk:sicher': { label: tr('Sicher', 'Safe'), hint: tr('Nur freie Mitspieler anspielen, weniger schießen.', 'Only find free team-mates, shoot less.') },
  'risk:aggressiv': { label: tr('Mehr Risiko', 'More risk'), hint: tr('Pässe in die Lücke, öfter abziehen.', 'Passes into gaps, shoot more often.') },
};

export const orderKey = (group, value) => `${group}:${value}`;
export const orderLabel = (group, value) => (value == null ? tr('frei', 'free') : ORDERS[orderKey(group, value)]?.label ?? value);

// Einsteiger: sechs große Knöpfe, jeder setzt ein kleines Paket aus Befehlen.
export const SIMPLE = {
  angreifen: { label: tr('Angreifen', 'Attack'), orders: { shape: 'aufruecken', risk: 'aggressiv', guard: null, press: null } },
  absichern: { label: tr('Absichern', 'Stay solid'), orders: { press: 'tief', guard: 'konter', shape: null, risk: 'sicher' } },
  pressing: { label: tr('Pressing', 'Press'), orders: { press: 'hoch', guard: null } },
  konter: { label: tr('Konter', 'Counter'), orders: { route: 'konter', press: 'tief' } },
  halten: { label: tr('Ball halten', 'Keep the ball'), orders: { build: 'halten', tempo: 'ruhig', route: null } },
  fluegel: { label: tr('Flügel', 'Wings'), orders: { route: 'aussen' } },
};
export const SIMPLE_IDS = Object.keys(SIMPLE);

export function applySimple(m, team, id) {
  const pack = SIMPLE[id];
  if (!pack) return false;
  let changed = false;
  for (const [g, v] of Object.entries(pack.orders)) changed = setOrder(m, team, g, v) || changed;
  return changed;
}

// Ist dieses Paket gerade aktiv (alle gesetzten Befehle stimmen)?
export const simpleActive = (m, team, id) => Object.entries(SIMPLE[id].orders).every(([g, v]) => v == null || orderOf(m, team, g) === v);

// Knopf im Spiel: Befehl an- oder (noch mal) abschalten.
export function toggleOrder(m, team, group, value) {
  return setOrder(m, team, group, orderOf(m, team, group) === value ? null : value);
}

// Was ein Paket setzt, in Worten (für die Trainerkarten): nur die Befehle, die es einschaltet.
export const packLines = (id) =>
  Object.entries(SIMPLE[id]?.orders ?? {})
    .filter(([, v]) => v)
    .map(([g, v]) => ORDERS[orderKey(g, v)]?.label)
    .filter(Boolean);
