// Trainer an der Seitenlinie geraten aneinander (ROADMAP 11.18 Punkt 16, vom Nutzer gewünscht 2026-11-15). Nur wenn die
// Karriere ein hitziges Duell meldet (m.coachHeat, aus coachrival.js: Hitze 0–5). Gezählt werden Fouls: Je heißer die
// Rivalität, desto früher stehen die beiden Nase an Nase. Der Schiri trennt sie; beim zweiten Mal gibt es Gelb für beide,
// wer schon Gelb hat, muss auf die Tribüne (IFAB Spielregeln Regel 12: Verwarnung und Feldverweis auch für Teamoffizielle).
// Beim dritten Mal Gelb-Rot. Ohne Spielzufall (nur Zähler), damit Spiele ohne Rivalen genau so laufen wie vorher. Schwellen und Anzahl: Spielwerte.
export const CLASH = { from: 3, max: 3, fouls: (heat) => Math.max(2, 7 - heat) };

export function coachFoul(m) {
  const heat = m.coachHeat ?? 0;
  if (heat < CLASH.from) return;
  const s = (m.clash ??= { fouls: 0, n: 0, cards: [0, 0], banned: [false, false] });
  if (s.n >= CLASH.max) return;
  if (++s.fouls < CLASH.fouls(heat)) return;
  s.fouls = 0;
  s.n++;
  m.events.push({ type: 'coachclash', n: s.n });
  if (s.n < 2) return;
  for (const team of [0, 1]) {
    if (s.banned[team]) continue;
    s.cards[team]++;
    const red = s.cards[team] >= 2;
    if (red) s.banned[team] = true;
    m.events.push({ type: 'coachcard', team, color: red ? 'red' : 'yellow' });
  }
}
