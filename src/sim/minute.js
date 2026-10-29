// Anzeige der Spielminute: die reguläre Spielzeit wird auf die Minuten des Platzes hochgerechnet (pitch.minutes, sonst
// 90; Halle 40 = Futsal 2 × 20), die Verlängerung (m.extra, siehe match.js) auf die Verlängerungsminuten (pitch.extraMinutes,
// sonst 30; Halle 2 × 5). Ohne Verlängerung bleibt es bei höchstens der vollen Spielzeit.
export const matchMinutes = (m) => m.pitch?.minutes ?? 90;
export const extraMinutes = (m) => m.pitch?.extraMinutes ?? 30;
const scaled = (m, t, full, extra) => {
  if (m.extra && t > m.duration) return full + Math.min(extra, Math.floor(((t - m.duration) / m.extra.total) * extra) + 1);
  return Math.min(full, Math.floor((t / m.duration) * full) + 1);
};
export const footballMinute = (m, t = m.time) => scaled(m, t, matchMinutes(m), extraMinutes(m));
// Für Spiellogik mit festen Schwellen (Seitenlinie: Wechsel ab 55, Schlussphase ab 78): immer auf 90 gerechnet.
export const minute90 = (m, t = m.time) => scaled(m, t, 90, 30);
