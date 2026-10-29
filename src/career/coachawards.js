// Trainer des Monats und Trainer der Saison im Kreisblatt (ROADMAP 11.10, vom Nutzer gewünscht: Trainerauszeichnung).
// Wie beim Spieler des Monats (awards.js) alle vier Spieltage; bewertet wird die ganze eigene Liga.
// Spielwerte: Monat = die meisten Punkte in den vier Spieltagen (dann Tordifferenz, dann Tore); Saison = wer im Verhältnis zur
// Stärke seines Kaders am weitesten vorn landet (Kaderrang minus Tabellenplatz), also der Trainer, der am meisten herausholt.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { personName } from '../data/origins.js';
import { MONTH } from './awards.js';
import { LEAGUES } from './clubs.js';
import { adjustMood } from './events.js';
import { chronicle } from './sagas.js';

const hashStr = (str) => [...str].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2545f491);

// Trainer eines Vereins: der eigene (angestellter Trainer oder du selbst), sonst ein fester Name je CPU-Verein (im Spielstand,
// damit er bleibt, auch wenn sich die Namensauflage ändert).
export function coachOf(c, club, ownName) {
  if (club.human) return c.hired?.name ?? ownName;
  c.cpuCoaches ??= {};
  return (c.cpuCoaches[club.id] ??= personName(createRng(hashStr(`${c.seed}:${club.id}:coach`)), 40 + (hashStr(club.id) % 20)));
}

function announce(c, award) {
  (c.coachAwards ??= []).push(award);
  const who = `${award.name} (${award.short})`;
  const text = award.kind === 'season'
    ? tr(`Kreisblatt: Trainer der Saison ist ${who} – mit dem ${award.squadRank}.-besten Kader auf Platz ${award.pos}.`, `District Gazette: Manager of the Season is ${who} – finished ${award.pos} with the ${award.squadRank}th-best squad.`)
    : tr(`Kreisblatt: Trainer des Monats ist ${who} – ${award.pts} Punkte aus ${award.games} Spielen.`, `District Gazette: Manager of the Month is ${who} – ${award.pts} points from ${award.games} games.`);
  award.text = text;
  if (award.human) {
    adjustMood(c, 0.04);
    if (c.hired) c.hired.happy = Math.min(100, (c.hired.happy ?? 50) + 5);
    chronicle(c, award.kind === 'season' ? tr(`${award.name} wird Trainer der Saison im Kreisblatt.`, `${award.name} is named Manager of the Season by the District Gazette.`) : tr(`${award.name} ist Trainer des Monats.`, `${award.name} is Manager of the Month.`));
  }
  return text;
}

// Nach dem Spieltag, alle vier Spieltage: die meisten Punkte im Zeitraum.
export function monthlyCoachAward(c, ownName) {
  const done = c.round;
  if (done === 0 || done % MONTH !== 0) return null;
  const rows = new Map(c.clubs.map((cl) => [cl.id, { club: cl, pts: 0, gd: 0, gf: 0, games: 0 }]));
  for (const round of c.fixtures.slice(done - MONTH, done))
    for (const f of round) {
      if (!f.result) continue;
      const h = rows.get(f.home);
      const a = rows.get(f.away);
      if (!h || !a) continue;
      const { home: gh, away: ga } = f.result;
      h.games++;
      a.games++;
      h.gf += gh;
      a.gf += ga;
      h.gd += gh - ga;
      a.gd += ga - gh;
      if (gh > ga) h.pts += 3;
      else if (gh < ga) a.pts += 3;
      else (h.pts++, a.pts++);
    }
  const top = [...rows.values()].filter((r) => r.games > 0).sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.club.id.localeCompare(y.club.id))[0];
  if (!top) return null;
  const award = { kind: 'month', season: c.season, round: done, club: top.club.id, short: top.club.short, human: !!top.club.human, name: coachOf(c, top.club, ownName), pts: top.pts, games: top.games };
  const text = announce(c, award);
  c.week?.chat.splice(1, 0, { from: null, text, time: 'Mo 08:20' });
  return award;
}

// Saisonende: Kaderrang (Ø der besten n im Format der Liga) gegen Tabellenplatz – der größte Sprung nach vorn gewinnt.
export function seasonCoachAward(c, tableRows, ratingOf, ownName) {
  const n = LEAGUES[c.level ?? 1]?.format ?? 5;
  const strength = (club) => {
    const top = club.squad.map(ratingOf).sort((a, b) => b - a).slice(0, n);
    return top.reduce((s, x) => s + x, 0) / Math.max(1, top.length);
  };
  const bySquad = [...tableRows].sort((x, y) => strength(y.club) - strength(x.club)).map((r) => r.club.id);
  const scored = tableRows.map((r, i) => ({ r, pos: i + 1, squadRank: bySquad.indexOf(r.club.id) + 1 }));
  const top = scored.sort((x, y) => y.squadRank - y.pos - (x.squadRank - x.pos) || x.pos - y.pos)[0];
  if (!top) return null;
  const award = { kind: 'season', season: c.season, club: top.r.club.id, short: top.r.club.short, human: !!top.r.club.human, name: coachOf(c, top.r.club, ownName), pos: top.pos, squadRank: top.squadRank };
  announce(c, award);
  return award;
}
