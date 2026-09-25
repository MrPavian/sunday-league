// Spielerentwicklung sichtbar machen: Formkurve (letzte Noten), Stärke-Verlauf über
// die Saisons und die Auszeichnungen vom Kreisblatt – Spieler des Monats (alle vier
// Spieltage) und Spieler der Saison. Bewertet wird die ganze Liga, nicht nur der
// eigene Verein.
import { tr } from '../core/i18n.js';
import { adjustForm, adjustMood } from './events.js';
import { chronicle } from './sagas.js';

export const MONTH = 4; // Spieltage pro „Monat"

const gradeText = (g) => tr(g.toFixed(1).replace('.', ','), g.toFixed(1));

// Nach jedem Spiel: Note mit Spieltag merken (höchstens die letzten acht).
export function logGrade(rec, round, grade) {
  rec.recent = [...(rec.recent ?? []), { round, grade: Math.round(grade * 10) / 10 }].slice(-8);
}

// Saisonende: Stärke und Zahlen der Saison in die Chronik des Spielers.
export function logSeason(career, idx, rating) {
  const rec = career.players[idx];
  if (!rec) return;
  rec.seasons = [...(rec.seasons ?? []), { season: career.season, rating, apps: rec.apps, goals: rec.goals, assists: rec.assists, avg: rec.graded ? Math.round((rec.gradeSum / rec.graded) * 10) / 10 : null }].slice(-12);
}

// Wer war im Zeitraum am besten? Kleine Note ist gut; Tore geben einen Bonus.
function best(career, from, to, minGames, playerOf, clubOfIdx) {
  let top = null;
  for (const [key, rec] of Object.entries(career.players)) {
    const games = (rec.recent ?? []).filter((g) => g.round >= from && g.round < to);
    if (games.length < minGames) continue;
    const avg = games.reduce((s, g) => s + g.grade, 0) / games.length;
    const score = avg - Math.min(0.6, (rec.goals ?? 0) * 0.02);
    if (!top || score < top.score) top = { idx: Number(key), avg, games: games.length, score };
  }
  if (!top) return null;
  const club = clubOfIdx(top.idx);
  return club ? { ...top, name: playerOf(top.idx).name, club } : null;
}

function announce(career, award, playerOf, post = true) {
  const rec = career.players[award.idx];
  rec.awards = [...(rec.awards ?? []), { kind: award.kind, season: award.season, round: award.round }];
  (career.awards ??= []).push(award);
  const mine = award.club.human;
  const who = `${award.name} (${award.club.short})`;
  const text =
    award.kind === 'season'
      ? tr(`Kreisblatt: Spieler der Saison ist ${who} – Ø Note ${gradeText(award.avg)}.`, `Kreisblatt: Player of the Season is ${who} – average grade ${gradeText(award.avg)}.`)
      : tr(`Kreisblatt: Spieler des Monats ist ${who} – Ø Note ${gradeText(award.avg)} in ${award.games} Spielen.`, `Kreisblatt: Player of the Month is ${who} – average grade ${gradeText(award.avg)} in ${award.games} games.`);
  const line = mine ? `${text} ${tr('Die Runde geht heute auf ihn.', 'The drinks are on him tonight.')}` : text;
  if (post) career.week?.chat.splice(1, 0, { from: null, text: line, time: 'Mo 08:15' });
  award.text = line;
  if (mine) {
    adjustMood(career, 0.05);
    adjustForm(career, award.idx, 0.3);
    chronicle(career, award.kind === 'season' ? tr(`${playerOf(award.idx).name} wird Spieler der Saison im Kreisblatt.`, `${playerOf(award.idx).name} is named Player of the Season by the Kreisblatt.`) : tr(`${playerOf(award.idx).name} ist Spieler des Monats (Spieltag ${award.round}).`, `${playerOf(award.idx).name} is Player of the Month (matchday ${award.round}).`));
  }
}

// Nach dem Spieltag: Alle vier Spieltage wird der Spieler des Monats gekürt.
export function monthlyAward(career, { playerOf, clubOfIdx }) {
  const done = career.round; // gespielte Spieltage
  if (done === 0 || done % MONTH !== 0) return null;
  const top = best(career, done - MONTH, done, 3, playerOf, clubOfIdx);
  if (!top) return null;
  const award = { kind: 'month', season: career.season, round: done, idx: top.idx, club: { id: top.club.id, short: top.club.short, name: top.club.name, human: !!top.club.human }, name: top.name, avg: top.avg, games: top.games };
  announce(career, award, playerOf);
  return award;
}

// Saisonende: Spieler der Saison – über die ganze Hinrunde und Rückrunde.
export function seasonAward(career, { playerOf, clubOfIdx }) {
  let top = null;
  for (const [key, rec] of Object.entries(career.players)) {
    if ((rec.graded ?? 0) < Math.max(4, Math.floor(career.fixtures.length * 0.5))) continue;
    const avg = rec.gradeSum / rec.graded;
    const score = avg - Math.min(0.8, (rec.goals ?? 0) * 0.03);
    if (!top || score < top.score) top = { idx: Number(key), avg, score, games: rec.graded };
  }
  if (!top) return null;
  const club = clubOfIdx(top.idx);
  if (!club) return null;
  const award = { kind: 'season', season: career.season, round: career.fixtures.length, idx: top.idx, club: { id: club.id, short: club.short, name: club.name, human: !!club.human }, name: playerOf(top.idx).name, avg: top.avg, games: top.games };
  announce(career, award, playerOf, false); // Text kommt nach dem Saisonwechsel in die Gruppe
  return award;
}

export const awardLabel = (a) =>
  a.kind === 'season' ? tr(`Spieler der Saison ${a.season}`, `Player of the Season ${a.season}`) : tr(`Spieler des Monats (S${a.season}, Spieltag ${a.round})`, `Player of the Month (S${a.season}, matchday ${a.round})`);
