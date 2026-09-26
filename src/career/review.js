// Saisonrückblick als Kreisblatt-Sonderheft: Schlagzeile, Torjäger, Spieler der
// Saison, höchster Sieg, bitterste Pleite, der Aufreger und das Zeugnis vom
// Vorstand. Am Saisonende live berechnet und beim Saisonwechsel archiviert.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { GOALS } from './board.js';
import { humanClub, playerOf, table } from './career.js';
import { yearOf } from './sagas.js';

function humanResults(c) {
  const me = humanClub(c).id;
  const out = [];
  for (const round of c.fixtures ?? [])
    for (const f of round) {
      if (!f.result || (f.home !== me && f.away !== me)) continue;
      const home = f.home === me;
      const opp = c.clubs.find((x) => x.id === (home ? f.away : f.home));
      out.push({ gf: home ? f.result.home : f.result.away, ga: home ? f.result.away : f.result.home, opp: opp?.name ?? '?', home });
    }
  return out;
}

function headline(c, pos, n, club) {
  const rng = createRng((c.seed * 29 + c.season * 7) >>> 0);
  if (pos === 1) return rng.pick(tr([`MEISTER! ${club} holt die Schale`, `${club} ist nicht zu stoppen: Meister!`], [`CHAMPIONS! ${club} lift the trophy`, `${club} unstoppable: champions!`]));
  if (pos === 2) return rng.pick(tr([`So nah dran: ${club} wird Vizemeister`, `Platz 2 – ${club} klopft oben an`], [`So close: ${club} finish runners-up`, `Second place – ${club} knocking on the door`]));
  if (pos === n) return rng.pick(tr([`Rote Laterne für ${club} – aber die Stimmung stimmt`, `${club}: Letzter, aber mit Haltung`], [`Wooden spoon for ${club} – but the spirit is right`, `${club}: bottom, but with dignity`]));
  if (pos <= Math.ceil(n / 2)) return rng.pick(tr([`${club} überwintert… äh, übersommert in der oberen Hälfte`, `Platz ${pos}: ${club} mit solider Saison`], [`${club} spend the summer in the top half`, `Place ${pos}: a solid season for ${club}`]));
  return rng.pick(tr([`Platz ${pos}: ${club} mit Luft nach oben`, `${club} und das Mittelmaß – eine Liebesgeschichte`], [`Place ${pos}: room for improvement at ${club}`, `${club} and mid-table – a love story`]));
}

export function seasonReview(c) {
  const club = humanClub(c);
  const rows = table(c);
  const pos = rows.findIndex((r) => r.club.human) + 1;
  const own = rows[pos - 1];
  const items = [];
  const name = (idx) => playerOf(c, idx).name;
  // Torjäger und Spieler der Saison (beste Durchschnittsnote, mindestens ein paar Einsätze).
  const squad = club.squad.filter((idx) => c.players[idx]);
  const scorer = [...squad].sort((a, b) => (c.players[b].goals ?? 0) - (c.players[a].goals ?? 0))[0];
  if (scorer != null && c.players[scorer].goals > 0) items.push({ label: tr('Torjäger', 'Top scorer'), text: tr(`${name(scorer)} mit ${c.players[scorer].goals} ${c.players[scorer].goals === 1 ? 'Tor' : 'Toren'}`, `${name(scorer)} with ${c.players[scorer].goals} ${c.players[scorer].goals === 1 ? 'goal' : 'goals'}`) });
  const minGames = Math.max(2, Math.floor((c.fixtures?.length ?? 10) * 0.3));
  const graded = squad.filter((idx) => (c.players[idx].graded ?? 0) >= minGames);
  const best = graded.sort((a, b) => c.players[a].gradeSum / c.players[a].graded - c.players[b].gradeSum / c.players[b].graded)[0];
  if (best != null) items.push({ label: tr('Spieler der Saison', 'Player of the season'), text: tr(`${name(best)} – Schnitt ${(c.players[best].gradeSum / c.players[best].graded).toFixed(1).replace('.', ',')}`, `${name(best)} – average ${(c.players[best].gradeSum / c.players[best].graded).toFixed(1)}`) });
  // Höchster Sieg, bitterste Pleite.
  const res = humanResults(c);
  const win = [...res].filter((r) => r.gf > r.ga).sort((a, b) => b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf)[0];
  const loss = [...res].filter((r) => r.gf < r.ga).sort((a, b) => b.ga - b.gf - (a.ga - a.gf))[0];
  if (win) items.push({ label: tr('Höchster Sieg', 'Biggest win'), text: tr(`${win.gf}:${win.ga} gegen ${win.opp}`, `${win.gf}-${win.ga} against ${win.opp}`) });
  if (loss) items.push({ label: tr('Bitterste Pleite', 'Worst defeat'), text: tr(`${loss.gf}:${loss.ga} gegen ${loss.opp}. Reden wir nicht drüber.`, `${loss.gf}-${loss.ga} against ${loss.opp}. Let us not talk about it.`) });
  // Der Aufreger: das Spannendste aus der Chronik dieser Saison.
  const notes = (c.saga?.chronicle ?? []).filter((e) => e.season === c.season).map((e) => e.text);
  const spicy = notes.find((t) => /Rudel|melee/i.test(t)) ?? notes.find((t) => /Ausgerechnet|Of all people|Ex-Verein|old club/i.test(t)) ?? notes.find((t) => /Sohn|son of/i.test(t)) ?? notes[0];
  if (spicy) items.push({ label: tr('Aufreger der Saison', 'Talking point of the season'), text: spicy });
  // Zeugnis vom Vorstand.
  const g = c.goal?.season === c.season ? c.goal : null;
  if (g) items.push({ label: tr('Zeugnis vom Vorstand', 'Board report'), text: `${GOALS[g.type].name}: ${pos <= g.target ? tr('erreicht ✔', 'achieved ✔') : tr('verfehlt ✘', 'missed ✘')}` });
  const sub = own ? tr(`${own.w} Siege, ${own.d} Remis, ${own.l} Niederlagen · ${own.gf}:${own.ga} Tore · ${own.pts} Punkte`, `${own.w} won, ${own.d} drawn, ${own.l} lost · goals ${own.gf}-${own.ga} · ${own.pts} points`) : '';
  return { season: c.season, year: yearOf(c), league: c.league, club: club.name, pos, headline: headline(c, pos, rows.length, club.name), sub, items };
}

// Beim Saisonwechsel ins Archiv (bevor die Saisonwerte zurückgesetzt werden).
export function archiveReview(c) {
  const r = seasonReview(c);
  c.reviews = [...(c.reviews ?? []).filter((x) => x.season !== r.season), r];
  return r;
}
