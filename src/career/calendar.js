// Vereinskalender: Datum eines Spieltags – abgeleitet, nicht erfunden. Das Spiel kennt schon das
// Saisonjahr (Chronik: Saison 1 = 2026/27) und den Monat jedes Spieltags (Wetter: monthOf).
// Der n-te Spieltag in einem Monat liegt auf dem n-ten Sonntag; Anstoß wie auf der Spielkarte 10:30.
import { tr } from '../core/i18n.js';
import { yearOf } from './sagas.js';
import { MONTHS, monthOf } from './weather.js';

// Erster Sonntag eines Monats (1–7). month: 1–12.
function firstSunday(year, month) {
  const dow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sonntag
  return 1 + ((7 - dow) % 7);
}

const daysIn = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// { year, month, day } für einen Spieltag (round 0-basiert).
export function matchDate(c, round = c.round) {
  const month = monthOf(c, round);
  const year = yearOf(c) + (month <= 7 ? 1 : 0); // August–Dezember im ersten, Januar–Juli im zweiten Jahr
  let nth = 0;
  for (let r = 0; r < round; r++) if (monthOf(c, r) === month) nth++;
  const first = firstSunday(year, month);
  const last = daysIn(year, month);
  // Sollte ein Monat mehr Spieltage haben als Sonntage, bleibt es beim letzten Sonntag.
  let day = first + 7 * nth;
  while (day > last) day -= 7;
  return { year, month, day };
}

// „So., 13. Sept." bzw. „Sun 13 Sep" – kurz für Kalenderblatt und Spielkarte.
const SHORT = () => tr(['', 'Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'], ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
export function dateLabel(d, { year = false } = {}) {
  return tr(`So., ${d.day}. ${SHORT()[d.month]}${year ? ` ${d.year}` : ''}`, `Sun ${d.day} ${SHORT()[d.month]}${year ? ` ${d.year}` : ''}`);
}
export const monthLabel = (d) => `${MONTHS[d.month]} ${d.year}`;
