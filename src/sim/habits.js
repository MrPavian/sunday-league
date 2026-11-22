// Spielerpersönlichkeit auf dem Platz (Gameplay 2.0, Punkt 29): feste Gewohnheiten, an denen man die eigenen Leute erkennt.
// Abgeleitet aus Name und Werten wie die Profile (profiles.js) – keine neuen Spielstandsdaten, derselbe Spieler hat immer dieselben.
//   Fuß        – rechts oder links (21 % Linksfüße; Carey u. a. 2001, WM 1998: 79 % rechts, kaum Beidfüßer). Die Figur schießt mit
//                ihrem starken Fuß (render/reactions.js kickFoot); Wirkung auf die Treffsicherheit gibt es nicht (dieselbe Studie:
//                mit dem schwachen Fuß selten, aber nicht schlechter).
//   nachinnen  – zieht nach innen: Außen auf der „falschen“ Seite (Rechtsfuß links, Linksfuß rechts) dribbelt er im letzten
//                Drittel zur Mitte, statt zur Grundlinie zu gehen.
//   (abschluss – „sucht den Abschluss“: gebaut und gemessen, kaum zu erkennen – Schüsse je Spieler +10 % auf dem Rasenplatz,
//    −6 % auf dem Großfeld; wieder entfernt, 2026-11-21.)
// „Reklamiert jeden Pfiff“ ist die Eigenschaft Meckerer (data/traits.js, fouls.js) und wird hier nur mit angezeigt.
import { tr } from '../core/i18n.js';
import { hasTrait } from '../data/traits.js';

// left – Anteil Linksfüße; inside – Anteil mit „zieht nach innen“ (unter den Technischen, Mittelfeld/Sturm); insideFrom – ab dieser
// Nähe zum Tor (Anteil der halben Platzlänge) zieht er rein; insideAim – Ziel quer (Anteil der jetzigen Seitenposition);
// insideChance – so oft entscheidet er sich dafür (je Anlauf, neu nach insideHold Sekunden; sonst geht er wie alle anderen
// außen weiter – immer nach innen nahm dem Spiel die Flanken: Kopfballtore Großfeld 5–8 % → 2,7 % der Tore). Bis auf left Spielwerte.
export const HABITS = { on: true, left: 0.21, inside: 0.4, insideTech: 0.45, insideFrom: 0.45, insideAim: 0.15, insideChance: 0.6, insideHold: 3 };

export const HABIT_INFO = {
  nachinnen: { label: tr('Zieht nach innen', 'Cuts inside'), desc: tr('Außen auf der falschen Seite: geht im letzten Drittel mit dem starken Fuß zur Mitte.', 'On the opposite wing: cuts inside onto his stronger foot in the final third.') },
  meckert: { label: tr('Reklamiert jeden Pfiff', 'Disputes every call'), desc: tr('Bleibt nach Pfiffen stehen und diskutiert.', 'Stops after every whistle to argue.') },
};

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
const roll = (p, salt) => (hash(`${p.name ?? p.id}:${salt}`) % 1000) / 1000;

// Starker Fuß: 1 rechts, -1 links. Gilt auch bei abgeschalteter Schicht (der Fuß ist keine Spielwirkung).
export const footOf = (p) => (roll(p, 'fuss') < HABITS.left ? -1 : 1);
export const footLabel = (p) => (footOf(p) === -1 ? tr('Linksfuß', 'Left-footed') : tr('Rechtsfuß', 'Right-footed'));

// Gewohnheiten (ohne Fuß), fest je Spieler.
export function habitsOf(p) {
  const a = p.attrs ?? {};
  const pos = p.position ?? p.role;
  const out = [];
  if ((pos === 'mid' || pos === 'fwd') && (a.technique ?? 0) >= HABITS.insideTech && roll(p, 'innen') < HABITS.inside) out.push('nachinnen');
  if (hasTrait(p, 'meckerer')) out.push('meckert');
  return out;
}
export const hasHabit = (p, id) => HABITS.on && habitsOf(p).includes(id);

// Zieht er gerade nach innen? s – Spielrichtung, wideLane – ab dieser Seitenposition gilt „außen“ (Anteil der halben Breite).
// Rechts vom Angreifer ist z·s < 0: Ein Rechtsfuß steht links „falsch“ (z·s > 0), ein Linksfuß rechts.
export function cutsInside(m, p, s, goalX, wideLane) {
  if (!hasHabit(p, 'nachinnen')) return false;
  const { pitch } = m;
  if (Math.abs(p.pos.z) < pitch.halfWidth * wideLane) return false;
  if (Math.abs(goalX - p.pos.x) > pitch.halfLength * HABITS.insideFrom) return false;
  if (Math.sign(p.pos.z * s) !== footOf(p)) return false;
  // Je Anlauf einmal entscheiden (eigener Zufall der Partie).
  if (!(m.time - (p.cutAt ?? -99) < HABITS.insideHold)) {
    p.cutAt = m.time;
    p.cutNow = m.rng.chance(HABITS.insideChance);
  }
  return p.cutNow;
}
