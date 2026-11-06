// Turnier-Schub auf den Marktwert (nationalteams.js): Faktor auf Gehaltsforderung, Ablöse und Kaufpreis eines Spielers.
// Eigenes kleines Modul ohne Abhängigkeiten, damit contracts.js und transfers.js es ohne Kreisimport lesen können.
// Voll in der Saison der Vergabe und der nächsten, in der übernächsten halb, danach weg (Spielwert: „klingt über eine Saison ab“).
export function natBoostMul(c, idx) {
  const b = c?.players?.[idx]?.natBoost;
  if (!b?.v) return 1;
  const age = (c.season ?? 1) - b.season;
  const k = age <= 1 ? 1 : age === 2 ? 0.5 : 0;
  return 1 + b.v * k;
}
