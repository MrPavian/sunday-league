// Positionsfremd in der Karriere: Gewöhnung (Spiele je fremder Position) und Murren.
// Die Rechnung selbst steht in sim/position.js; hier wird nur gezählt und erzählt.
//
// Gewöhnung: rec.posXp = { rolle: Spiele } je Spieler (alte Stände: leer, siehe migratePositions).
// Gezählt wird ein Spiel, wenn er mindestens POS_MIN_SHARE der Spielzeit auf der fremden Rolle stand.
// Murren: Nur in der eigenen Mannschaft, nur bei weit entfernter Position (far, Tor), nur solange er sich
// kaum gewöhnt hat (fam < GRUMBLE_FAM). Pro Spieler höchstens alle GRUMBLE_COOLDOWN Spieltage, pro Woche
// höchstens eine Meldung; die Stimmung leidet dagegen bei jedem solchen Spiel ein wenig.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { familiarity, GRUMBLE_FAM, posGrade } from '../sim/position.js';
import { adjustMood } from './events.js';

export const POS_MIN_SHARE = 0.3;
export const GRUMBLE_COOLDOWN = 5; // Spieltage Ruhe pro Spieler
export const GRUMBLE_CHANCE = 0.55; // wird gewürfelt, sobald nichts im Weg steht
export const GRUMBLE_MOOD = -0.012; // je murrendem Spieler und Spiel (Teamstimmung −1 … 1)
export const GRUMBLE_MOOD_MAX = -0.03; // Deckel je Spiel

const FAR = new Set(['far', 'gkIn', 'gkOut']);
const weekNo = (c) => (c.season ?? 1) * 1000 + (c.round ?? 0);
const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

// Alte Spielstände: ohne posXp gilt „nirgends gewöhnt" (wird beim ersten fremden Einsatz angelegt);
// Kaputtes (kein Objekt) wird verworfen. Keine leeren Tabellen auf Vorrat, damit Spielstände unverändert bleiben.
export function migratePositions(career) {
  for (const rec of Object.values(career.players ?? {})) if (rec && rec.posXp != null && (typeof rec.posXp !== 'object' || Array.isArray(rec.posXp))) delete rec.posXp;
  career.pendingGrumble ??= [];
}

// { rolle: Gewöhnung 0…1 } für die Simulation (p.posFam).
export function posFamOf(career, idx) {
  const xp = career.players[idx]?.posXp;
  if (!xp) return {};
  return Object.fromEntries(Object.entries(xp).map(([role, n]) => [role, familiarity(n)]));
}
export const famAt = (career, idx, role) => familiarity(career.players[idx]?.posXp?.[role]);

const NOUN = () => tr({ gk: 'Torwart', def: 'Verteidiger', mid: 'Mittelfeldspieler', fwd: 'Stürmer', fan: 'Zuschauer' }, { gk: 'a keeper', def: 'a defender', mid: 'a midfielder', fwd: 'a striker', fan: 'a spectator' });

function grumbleText(rng, position, role) {
  const n = NOUN();
  if (role === 'gk') return rng.pick([tr('Ich im Tor? Ich hab nicht mal Handschuhe!', 'Me in goal? I haven’t even got gloves!'), tr('Im Tor? Wirklich? Das geht schief.', 'In goal? Really? This will go wrong.')]);
  if (position === 'gk') return rng.pick([tr('Ich bin Torwart, kein Feldspieler!', 'I’m a keeper, not an outfield player!'), tr('Was soll ich da draußen? Ich gehöre ins Tor.', 'What am I doing out there? I belong in goal.')]);
  return rng.pick([
    tr(`Ich bin ${n[position]}, kein ${n[role]}!`, `I’m ${n[position]}, not ${n[role]}!`),
    tr(`Wieder ${n[role]}? Ich bin doch ${n[position]}.`, `${n[role][0].toUpperCase()}${n[role].slice(1)} again? I’m ${n[position]}.`),
    tr('Auf der Position fühl ich mich nicht wohl, Trainer.', 'I don’t feel comfortable in that spot, gaffer.'),
  ]);
}

// Nach dem Spiel (nur eigener Verein): Gewöhnung zählen, Stimmung, Murren vormerken.
// m = Match, humanIdx = Pool-Nummern des eigenen Kaders.
export function afterMatchPositions(career, m, humanSquad) {
  const squad = new Set(humanSquad);
  const rng = createRng(hash(career.seed ?? 0, career.season ?? 0, career.round ?? 0, 91));
  let mood = 0;
  const queued = new Set((career.pendingGrumble ??= []).map((g) => g.idx));
  for (const p of [...m.players, ...m.bench[0], ...m.bench[1], ...(m.sentOff ?? [])]) {
    const idx = p.poolIndex;
    const rec = career.players[idx];
    const st = m.stats.players[p.id];
    if (!rec || !squad.has(idx) || !st || st.seconds <= 0) continue;
    if (st.seconds / (m.duration || st.seconds) < POS_MIN_SHARE) continue;
    const grade = posGrade(p.position, p.role);
    if (grade === 'own') continue;
    rec.posXp ??= {};
    const fam = familiarity(rec.posXp[p.role]); // Gewöhnung vor diesem Spiel
    rec.posXp[p.role] = (rec.posXp[p.role] ?? 0) + 1;
    if (!FAR.has(grade) || fam >= GRUMBLE_FAM) continue;
    mood += GRUMBLE_MOOD;
    const cool = weekNo(career) - (rec.grumbleAt ?? -1e9) >= GRUMBLE_COOLDOWN;
    if (cool && !queued.size && rng.chance(GRUMBLE_CHANCE)) {
      rec.grumbleAt = weekNo(career);
      queued.add(idx);
      career.pendingGrumble.push({ idx, position: p.position, role: p.role, seed: rng.int(1, 1e9) });
    }
  }
  if (mood) adjustMood(career, Math.max(GRUMBLE_MOOD_MAX, mood));
}

// Wochenbeginn: Murren in den Mannschaftschat.
export function deliverGrumbles(career, chat) {
  for (const g of career.pendingGrumble ?? []) chat.push({ from: g.idx, text: grumbleText(createRng(g.seed), g.position, g.role), time: 'Mo 08:20' });
  career.pendingGrumble = [];
}
