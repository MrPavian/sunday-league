// Kopf und Beine im Spielverlauf (vom Nutzer gewünscht, 2026-10-30):
//  - Ergebnisdruck: Wer knapp führt, wird in der Schlussphase nervöser – nach einem Anschlusstreffer in der zweiten Hälfte
//    schlagartig („das große Zittern“). Der Druck verstärkt die Streuung unter Gegnerdruck (profiles.js pressureChaos): Nervöse voll, normale halb,
//    Ruhepole gar nicht.
//  - Anschlusstreffer oder Ausgleich in der zweiten Hälfte setzt manchmal noch einmal Kräfte frei (nicht immer).
//  - Profil „Zweite Luft“: einmal je Spiel spät, wenn er müde ist, holt er sich Kraft zurück.
// Dass der Spielstand beeinflusst, wie viel gelaufen wird, ist belegt (Überblick: Lago-Peñas 2012,
// https://pmc.ncbi.nlm.nih.gov/articles/PMC3588697); feste Zahlen zu Anschlusstreffer und Zittern gibt es nicht. Alle Werte sind
// Spielwerte; Messung der Wirkung in docs/KONZEPT-SPIELERSTAERKE.md 11.5.
import { clamp } from '../core/math.js';

export const MENTAL = {
  pressFrom: 0.75, // Anteil der regulären Spielzeit, ab dem eine knappe Führung drückt
  twoGoals: 0.5, // bei zwei Toren Vorsprung halb so viel Druck
  jitterTime: 0.12, // so lange (Anteil der Spielzeit) klingt das Zittern nach dem Anschlusstreffer ab
  surgeChance: 0.6, // Anschlusstreffer/Ausgleich in der zweiten Hälfte: so oft gibt es einen Kraftschub
  surgeShare: 0.25, // … er bringt diesen Anteil der verlorenen Kraft zurück (am Spielende bis zum Anderthalbfachen)
  windFrom: 0.7, // Zweite Luft: ab diesem Anteil der Spielzeit …
  windBelow: 0.4, // … wenn die Kraft darunter liegt …
  windGain: 0.25, // … so viel Kraft zurück, einmal je Spiel
};

const progress = (m) => (m.extra && m.time > m.duration ? 1 : clamp(m.time / m.duration, 0, 1));

// Ergebnisdruck einer Mannschaft, 0 … 1.
export function resultPressure(m, team) {
  if (m.mentality === false) return 0;
  const lead = m.score[team] - m.score[1 - team];
  let p = 0;
  if (lead === 1 || lead === 2) p = clamp((progress(m) - MENTAL.pressFrom) / (1 - MENTAL.pressFrom), 0, 1) * (lead === 1 ? 1 : MENTAL.twoGoals);
  const j = m.jitters?.[team];
  if (j != null) p = Math.max(p, clamp(1 - (m.time - j) / (MENTAL.jitterTime * m.duration), 0, 1));
  return p;
}

// Nach einem Tor (match.js onGoal): Zittern beim Führenden, Kraftschub beim Aufholenden.
export function afterGoal(m, team) {
  if (m.mentality === false) return;
  const other = 1 - team;
  const lead = m.score[other] - m.score[team];
  if (lead === 1 && progress(m) > 0.5) {
    (m.jitters ??= [null, null])[other] = m.time; // Anschlusstreffer: der Führende zittert
    m.events.push({ type: 'jitters', team: other });
  }
  if (lead >= 0 && lead <= 1 && progress(m) > 0.5 && m.rng.chance(MENTAL.surgeChance)) {
    const k = MENTAL.surgeShare * (0.5 + progress(m));
    for (const p of m.players) if (p.team === team) p.stamina = Math.min(p.fitness ?? 1, p.stamina + (1 - p.stamina) * k);
    m.events.push({ type: 'surge', team });
  }
}

// Zweite Luft (actions.js movePlayer, jede Bewegung): einmal je Spiel.
export function secondWind(m, p) {
  if (p.secondWind || p.stamina >= MENTAL.windBelow || progress(m) < MENTAL.windFrom) return;
  p.secondWind = true;
  p.stamina = Math.min(p.fitness ?? 1, p.stamina + MENTAL.windGain);
  m.events.push({ type: 'second_wind', team: p.team, playerId: p.id });
}
