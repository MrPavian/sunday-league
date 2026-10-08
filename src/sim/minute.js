// Anzeige in „Fußballminuten": die reguläre Spielzeit wird auf 90 Minuten hochgerechnet, die Verlängerung
// (m.extra, siehe match.js) auf 91–120. Ohne Verlängerung bleibt es bei höchstens 90.
export function footballMinute(m, t = m.time) {
  if (m.extra && t > m.duration) return 90 + Math.min(30, Math.floor(((t - m.duration) / m.extra.total) * 30) + 1);
  return Math.min(90, Math.floor((t / m.duration) * 90) + 1);
}
