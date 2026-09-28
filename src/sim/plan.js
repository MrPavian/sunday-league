// Spielplan: Der Spielstil aus dem Vereinsheim ist die Grundlage, die Befehle des
// Trainers (m.orders) verschieben ihn. Die Engine liest alles über styleOf() –
// eine Stelle, an der Plan, Befehle und später die Umsetzungsqualität zusammenlaufen.
// Ohne Befehle liefert styleOf() exakt die Werte des Spielstils (Golden-Test).
import { STYLES } from './tactics.js';

// Neue Stellgrößen, die nur Befehle setzen. Neutral = Verhalten wie bisher.
//   focus    – Angriffsseite: -1 links … +1 rechts (aus Sicht der eigenen Spielrichtung), 0 frei
//   channel  – 'wide' | 'centre' | null: Angriffe eher über außen oder durchs Zentrum
//   through  – Lust auf den Pass in die Tiefe (0 … 1)
//   risk     – Passrisiko: -1 sicher … +1 aggressiv
//   tempo    – Entscheidungstempo: <1 ruhig, >1 schnell
//   pressZone – wo das Pressing auslöst: 'high' | 'mid' | null (Spielstil entscheidet)
//   funnel   – gegen den Ball: 'wide' (nach außen lenken) | 'centre' (Zentrum zu) | null
//   rest     – Restverteidigung: wie viele Abwehrspieler bei Ballbesitz hinten bleiben
export const NEUTRAL = { focus: 0, channel: null, through: 0, risk: 0, tempo: 1, pressZone: null, funnel: null, rest: 0 };

export const ordersOf = (m, team) => m.orders?.[team] ?? null;

// Befehl setzen oder (value = null) zurücknehmen. Die Wirkung steht in ORDER_EFFECTS.
export function setOrder(m, team, group, value) {
  m.orders ??= [{}, {}];
  if (value == null) delete m.orders[team][group];
  else m.orders[team][group] = value;
  if (m.modsCache) m.modsCache[team] = null;
}

// Spielstil oder System während des Spiels wechseln (Halbzeit, Plan-Blatt).
export function setStyle(m, team, style) {
  if (!STYLES[style]) return;
  m.plan[team] = { ...m.plan[team], style };
  if (m.modsCache) m.modsCache[team] = null;
}

// Wirkung der Befehle auf die Stellgrößen: Funktionen (Grundwerte → Änderungen).
export const ORDER_EFFECTS = {};

export function planMods(m, team) {
  m.modsCache ??= [null, null];
  const cached = m.modsCache[team];
  if (cached) return cached;
  const base = STYLES[m.plan?.[team]?.style] ?? STYLES.ausgewogen;
  const orders = ordersOf(m, team);
  let mods = { ...NEUTRAL, ...base };
  if (orders) {
    for (const [group, value] of Object.entries(orders)) {
      const fx = ORDER_EFFECTS[group]?.[value];
      if (fx) mods = { ...mods, ...fx(mods) };
    }
  }
  m.modsCache[team] = mods;
  return mods;
}

export const styleOf = planMods;
