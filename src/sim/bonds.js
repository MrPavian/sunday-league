// Beziehungen im Spiel: Welche Mitspieler sind Kumpels, welche Rivalen? Kommt aus
// dem Vereinsheim (team.rels, Schlüssel "poolA-poolB") und wirkt aufs Passspiel.
const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function bondOf(m, a, b) {
  if (!a || !b || a.team !== b.team || a.poolIndex == null || b.poolIndex == null) return null;
  return m.teams[a.team]?.rels?.[key(a.poolIndex, b.poolIndex)] ?? null;
}

export const isBad = (type) => type === 'rivalen' || type === 'feinde';
export const isGood = (type) => type === 'kumpel' || type === 'schulfreunde' || type === 'schwager';

// Aufschlag auf die Passwahl der KI: Kumpels sucht man, Rivalen übersieht man gern.
export const bondBonus = (type) => ({ kumpel: 0.15, schulfreunde: 0.18, schwager: 0.1, kollegen: 0.05, rivalen: -0.45, feinde: -0.8 })[type] ?? 0;

export function relsMap(pairs) {
  const out = {};
  for (const { a, b, type } of pairs) out[key(a, b)] = type;
  return out;
}
