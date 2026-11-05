// Verdeckte Boni im Spiel (career/bonuses.js vergibt sie, nur Stärkemodell 3; ohne p.bonus ändert sich nichts – Golden bleibt).
//  - Weltklasse: in der Schlussphase eines knappen Spiels genauer (Pass und Schuss) und unbeirrt wie ein Ruhepol.
//  - Führungsspieler: Aura wie ein Anführer (actions.js), beruhigt Mitspieler unter Druck wie ein Ruhepol in der Nähe,
//    und seine Mannschaft zittert weniger bei knapper Führung.
//  - Star der Liga: Gegner decken ihn enger (ai.js).
// Alle Werte sind Spielwerte; die Wirkung ist gemessen (docs/KONZEPT-SPIELERSTAERKE.md 12.9).
import { clamp } from '../core/math.js';

export const BONUS_SIM = {
  clutchFrom: 0.75, // ab diesem Anteil der Spielzeit …
  clutchMargin: 1, // … bei höchstens so vielen Toren Abstand ist es „eng“
  clutchAim: 0.75, // Weltklasse: Streuung von Pass und Schuss in engen Schlussphasen
  leaderRange: 12, // Führungsspieler beruhigt Mitspieler in diesem Umkreis (m)
  leaderJitter: 0.5, // … und halbiert das Zittern der Mannschaft
  starMark: 0.7, // Star der Liga: Abstand des Gegenspielers in der Deckung
};

export const hasBonus = (p, id) => !!p?.bonus?.includes(id);

// Enge Schlussphase?
export function clutch(m) {
  const t = m.extra && m.time > m.duration ? 1 : clamp(m.time / m.duration, 0, 1);
  return t >= BONUS_SIM.clutchFrom && Math.abs(m.score[0] - m.score[1]) <= BONUS_SIM.clutchMargin;
}

// Streuungsfaktor für Pass und Schuss.
export const clutchAim = (m, p) => (hasBonus(p, 'weltklasse') && clutch(m) ? BONUS_SIM.clutchAim : 1);
