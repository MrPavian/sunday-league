// Spielplan: Der Spielstil aus dem Vereinsheim ist die Grundlage, die Befehle des
// Trainers (m.orders) verschieben ihn. Die Engine liest alles über styleOf() –
// eine Stelle, an der Plan, Befehle und Umsetzungsqualität zusammenlaufen.
// Ohne Befehle liefert styleOf() exakt die Werte des Spielstils (Golden-Test).
//
// Ebene 1 – Entscheidung: welcher Befehl (m.orders).
// Ebene 2 – Ausführung: wie gut die Mannschaft ihn umsetzt (execution, adherence).
// Ebene 3 – Chaos: bleibt in der Engine (Streuung, Zweikämpfe, Torwart).
import { clamp } from '../core/math.js';
import { hasTrait } from '../data/traits.js';
import { isBad, isGood } from './bonds.js';
import { STYLES } from './tactics.js';

// Neue Stellgrößen, die nur Befehle setzen. Neutral = Verhalten wie bisher.
//   focus     – Angriffsseite: -1 links … +1 rechts (in Spielrichtung), 0 frei
//   channel   – 'wide' | 'centre' | null: Angriffe über außen oder durchs Zentrum
//   through   – Lust auf den Pass in die Tiefe (0 … 1)
//   risk      – Passrisiko: -1 sicher … +1 aggressiv
//   tempo     – Entscheidungstempo: <1 ruhig, >1 schnell
//   pressZone – wo das Pressing auslöst: 'high' (überall, zwei Mann drauf) | 'mid' (erst ab der Mittellinie) | null
//   funnel    – gegen den Ball: 'wide' (nach außen lenken) | 'centre' (Zentrum zumachen) | null
//   rest      – Restverteidigung: so viele Abwehrspieler bleiben bei Ballbesitz hinten
//   cover     – Seite absichern: -1 links … +1 rechts (Block verschiebt, Außenverteidiger bleibt)
//   defWidth  – Breite des Blocks gegen den Ball (0.78 = wie bisher)
//   fwdDrop   – Stürmer lässt sich fallen (0 … 1)
export const NEUTRAL = { focus: 0, channel: null, through: 0, risk: 0, tempo: 1, pressZone: null, funnel: null, rest: 0, cover: 0, defWidth: 0.78, fwdDrop: 0 };

// Befehlsgruppen – je Gruppe gilt höchstens ein Befehl, Gruppen lassen sich kombinieren.
// Wirkung: Funktion (aktuelle Werte → Änderungen). Echte Stellgrößen, keine Torbonusse.
export const ORDER_EFFECTS = {
  // MIT BALL: Aufbau
  build: {
    halten: (s) => ({ passRate: s.passRate * 1.25, shortPass: s.shortPass + 0.02, forward: s.forward * 0.7, long: s.long * 0.3, risk: -0.7, shoot: s.shoot - 1 }),
    kurz: (s) => ({ shortPass: Math.max(s.shortPass, 0.065), passRate: s.passRate * 1.35, long: s.long * 0.3, cross: s.cross * 0.75 }),
    direkt: (s) => ({ forward: s.forward + 0.04, long: Math.max(s.long, 0.35), shortPass: s.shortPass * 0.5, tempo: 1.15, through: Math.max(s.through, 0.2) }),
  },
  // MIT BALL: Angriffsweg
  route: {
    aussen: (s) => ({ width: Math.max(s.width * 1.2, 1.2), cross: Math.max(s.cross, 0.8), channel: 'wide' }),
    mitte: (s) => ({ width: s.width * 0.85, cross: s.cross * 0.5, channel: 'centre' }),
    tiefe: (s) => ({ through: 0.65, forward: s.forward + 0.02 }),
    konter: (s) => ({ fwdHold: s.fwdHold + 0.15, long: Math.max(s.long, 0.45), through: Math.max(s.through, 0.45), line: s.line - 0.06, tempo: 1.15 }),
  },
  // MIT BALL: Angriffsseite
  side: {
    left: () => ({ focus: -1 }),
    right: () => ({ focus: 1 }),
  },
  // GEGEN DEN BALL: Pressinghöhe
  press: {
    hoch: (s) => ({ press: true, pressZone: 'high', line: Math.max(s.line + 0.06, 0.1), tire: Math.max(s.tire * 1.1, 1.18) }),
    mittel: (s) => ({ press: true, pressZone: 'mid', line: Math.min(s.line, 0.03), tire: Math.max(s.tire, 1.08) }),
    tief: (s) => ({ press: false, pressZone: null, line: Math.min(s.line - 0.08, -0.1), compact: s.compact * 0.88, tire: s.tire * 0.92 }),
  },
  // GEGEN DEN BALL: Ausrichtung
  guard: {
    aussen: () => ({ funnel: 'wide' }),
    zentrum: (s) => ({ funnel: 'centre', defWidth: 0.68, compact: s.compact * 0.95 }),
    konter: (s) => ({ rest: 2, push: s.push * 0.8 }),
  },
  // GEGEN DEN BALL: eine Seite absichern
  cover: {
    left: () => ({ cover: -1 }),
    right: () => ({ cover: 1 }),
  },
  // FORM
  shape: {
    aufruecken: (s) => ({ push: s.push + 0.08, line: s.line + 0.04 }),
    kompakt: (s) => ({ compact: s.compact * 0.85, defWidth: 0.68, push: s.push - 0.03 }),
    stuermer_fallen: () => ({ fwdDrop: 0.7, fwdHold: 0 }),
  },
  tempo: {
    ruhig: () => ({ tempo: 0.8 }),
    schnell: () => ({ tempo: 1.2 }),
  },
  risk: {
    sicher: () => ({ risk: -1 }),
    aggressiv: (s) => ({ risk: 1, shoot: s.shoot + 0.8, push: s.push + 0.03 }),
  },
};
export const ORDER_GROUPS = Object.keys(ORDER_EFFECTS);

export const ordersOf = (m, team) => m.orders?.[team] ?? null;
export const orderOf = (m, team, group) => m.orders?.[team]?.[group] ?? null;

// Befehl setzen oder (value = null) zurücknehmen. Wird fürs Spielprotokoll und die
// Nachanalyse gemerkt (m.decisions).
export function setOrder(m, team, group, value, { by = 'coach' } = {}) {
  if (!ORDER_EFFECTS[group] || (value != null && !ORDER_EFFECTS[group][value])) return false;
  m.orders ??= [{}, {}];
  const before = m.orders[team][group] ?? null;
  if (before === value) return false;
  if (value == null) delete m.orders[team][group];
  else m.orders[team][group] = value;
  if (m.modsCache) m.modsCache[team] = null;
  (m.decisions ??= []).push({ t: m.time, half: m.half, team, group, value, before, by });
  m.events?.push({ type: 'order', team, group, value, by });
  return true;
}

// Spielstil während des Spiels wechseln (Halbzeit, Plan-Blatt).
export function setStyle(m, team, style) {
  if (!STYLES[style] || m.plan[team]?.style === style) return;
  const before = m.plan[team]?.style ?? null;
  m.plan[team] = { ...m.plan[team], style };
  if (m.modsCache) m.modsCache[team] = null;
  (m.decisions ??= []).push({ t: m.time, half: m.half, team, group: 'style', value: style, before, by: 'coach' });
}

// Ebene 2 – Wie gut setzt dieser Spieler eine Anweisung um? Wer Fußball versteht
// (Technik, Passspiel), frisch ist und auf seiner Position spielt, macht es; der
// Rest nur halb. 0.35 … 1.
export function adherence(m, p) {
  const a = p.attrs;
  let v = 0.35 + 0.3 * ((a.technique + a.passing) / 2) + 0.25 * p.stamina;
  if (p.position && p.role !== p.position && p.role !== 'gk') v -= 0.08; // fremde Position
  if (hasTrait(p, 'ex_profi')) v += 0.12;
  if (hasTrait(p, 'meckerer')) v -= 0.05;
  return clamp(v, 0.35, 1);
}

// Mannschaft: Durchschnitt plus Teamchemie (Kumpels ziehen mit, Streithähne nicht).
function execution(m, team) {
  const mine = m.players.filter((p) => p.team === team && p.role !== 'gk');
  if (!mine.length) return 0.5;
  let v = mine.reduce((s, p) => s + adherence(m, p), 0) / mine.length;
  const rels = m.teams[team]?.rels;
  if (rels) {
    let chem = 0;
    for (const t of Object.values(rels)) chem += isGood(t) ? 1 : isBad(t) ? -1.5 : 0;
    v += clamp(chem * 0.01, -0.08, 0.06);
  }
  if (mine.some((p) => hasTrait(p, 'anfuehrer'))) v += 0.04;
  return clamp(v, 0.35, 1);
}
export const teamExecution = (m, team) => execution(m, team);

const EXEC_REFRESH = 5; // Spielsekunden: so oft wird die Umsetzung neu bewertet (Kraft, Wechsel)

export function planMods(m, team) {
  m.modsCache ??= [null, null];
  const bucket = Math.floor((m.time ?? 0) / EXEC_REFRESH);
  const cached = m.modsCache[team];
  if (cached && (!cached.orders || cached.bucket === bucket)) return cached.mods;
  const base = { ...NEUTRAL, ...(STYLES[m.plan?.[team]?.style] ?? STYLES.ausgewogen) };
  const orders = ordersOf(m, team);
  if (!orders || !Object.keys(orders).length) {
    m.modsCache[team] = { mods: base, orders: false };
    return base;
  }
  let target = base;
  for (const [group, value] of Object.entries(orders)) {
    const fx = ORDER_EFFECTS[group]?.[value];
    if (fx) target = { ...target, ...fx(target) };
  }
  // Umsetzung: Zahlen wandern nur so weit Richtung Befehl, wie die Mannschaft es kann.
  // Schalter (Pressing an/aus, Kanal, Lenken) gelten ganz – ob gut, zeigt dann der Platz.
  const k = execution(m, team);
  const mods = { ...target, exec: k };
  for (const key of Object.keys(target)) {
    if (typeof target[key] === 'number' && typeof base[key] === 'number' && key !== 'rest') mods[key] = base[key] + (target[key] - base[key]) * k;
  }
  m.modsCache[team] = { mods, orders: true, bucket };
  return mods;
}

export const styleOf = planMods;

// Engagement nach vorn bei eigenem Ballbesitz: -1 (alle hinter den Ball) … 0 (ausgewogen)
// … +1 (alles nach vorn). Aus den vorhandenen Stellgrößen – Nachrücken, Linie, Risiko,
// Restverteidigung –, gewichtet mit der Umsetzung (planMods). Wer sich vorne reinwirft,
// hat beim Ballverlust weniger Leute hinter dem Ball (ai.js: anchor, Laufwege).
export function commitment(m, team) {
  const st = planMods(m, team);
  const c = (st.push - 0.22) * 6 + st.line * 2 + st.risk * 0.35 - (st.rest ?? 0) * 0.3;
  return clamp(c, -1, 1);
}

// Hilfen für die Engine: Seitenlage einer Position aus Sicht des Teams (-1 links … +1 rechts).
export const sideness = (m, team, pos, attackDir) => (pos.z * attackDir) / m.pitch.halfWidth;
