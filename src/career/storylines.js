// Kleine Geschichten im Spiel (Gameplay 2.0, Punkt 34): Vor dem Anpfiff sucht das Spiel die Anlässe dieser Partie heraus – Torflaute,
// Torserie, Jubiläen, Debüt, Wiedersehen mit dem alten Verein, Angstgegner, Form der Mannschaft, Revanche für das Hinspiel. Die Anlässe
// laufen als Laufschrift beim Anpfiff (Hud) und stehen im Liveticker; der Kommentar greift sie beim Tor auf (p.story, sim/commentary.js goalStoryLine).
// Nur Text: Die Simulation liest weder match.stories noch p.story (gleicher Seed, gleiches Spiel).
import { tr } from '../core/i18n.js';

// dry – so viele Spiele ohne Tor gelten als Flaute (nur wer sonst trifft: mindestens dryGoals Tore insgesamt); run – Tore in so
// vielen Spielen hintereinander gelten als Serie; goalMarks/appMarks – runde Tore/Spiele für den Verein; form – Siege bzw. Spiele ohne
// Sieg in Folge; max – höchstens so viele Anlässe je Spiel (die wichtigsten zuerst). Spielwerte.
export const STORY = { dry: 3, dryGoals: 3, run: 2, goalMarks: [10, 25, 50, 75, 100, 150, 200], appMarks: [50, 100, 150, 200, 250, 300], form: 3, max: 3 };

const surname = (p) => p?.name?.split(' ').slice(-1)[0] ?? '?';
const totalOf = (rec, key) => (rec?.total?.[key] ?? 0) + (rec?.[key] ?? 0);

// Nach dem Spiel (recordResult): Flaute und Serie je Spieler fortschreiben. goals – Tore in diesem Spiel.
export function trackScoring(rec, goals) {
  if (!rec) return;
  if (goals > 0) {
    rec.dry = 0;
    rec.run = (rec.run ?? 0) + 1;
  } else {
    rec.dry = (rec.dry ?? 0) + 1;
    rec.run = 0;
  }
}

// Ergebnisse des eigenen Vereins in dieser Saison bis jetzt (ältestes zuerst): { opp, gf, ga, round }.
function results(c, humanId) {
  const out = [];
  for (let r = 0; r < Math.min(c.round ?? 0, c.fixtures?.length ?? 0); r++) {
    const f = c.fixtures[r]?.find((x) => (x.home === humanId || x.away === humanId) && x.result);
    if (!f) continue;
    const home = f.home === humanId;
    out.push({ opp: home ? f.away : f.home, gf: home ? f.result.home : f.result.away, ga: home ? f.result.away : f.result.home, round: r });
  }
  return out;
}

// Anlässe für diese Partie. team – Index des eigenen Vereins im Spiel; oppId – Gegner. Setzt nebenbei p.story-Felder für den Kommentar.
export function matchStories(c, match, team, oppId) {
  if (team == null || team < 0) return [];
  const humanId = c.clubs.find((cl) => cl.human)?.id;
  const opp = c.clubs.find((cl) => cl.id === oppId);
  const oppShort = opp?.short ?? opp?.name ?? '';
  const out = [];
  const add = (w, kind, text, playerId = null) => out.push({ w, kind, text, playerId });
  const mine = match.players.filter((p) => p.team === team);
  for (const p of mine) {
    const rec = c.players[p.poolIndex];
    if (!rec || p.poolIndex == null) continue;
    const story = (p.story ??= {});
    const goals = totalOf(rec, 'goals');
    const apps = totalOf(rec, 'apps');
    if (apps === 0) {
      story.debut = true;
      add(5, 'debut', tr(`${p.name} gibt heute sein Debüt.`, `${p.name} makes his debut today.`), p.id);
    }
    const appMark = STORY.appMarks.find((n) => n === apps + 1);
    if (appMark) {
      story.appMark = appMark;
      add(4, 'apps', tr(`${p.name} bestreitet heute sein ${appMark}. Spiel für den Verein.`, `${p.name} plays his ${appMark}th game for the club today.`), p.id);
    }
    const goalMark = STORY.goalMarks.find((n) => n === goals + 1);
    if (goalMark) {
      story.goalMark = goalMark;
      add(4, 'goalmark', tr(`Noch ein Tor, dann hat ${surname(p)} ${goalMark} für den Verein.`, `One more and ${surname(p)} has ${goalMark} for the club.`), p.id);
    }
    if ((rec.dry ?? 0) >= STORY.dry && goals >= STORY.dryGoals && p.role !== 'gk' && p.role !== 'def') {
      story.dry = rec.dry;
      add(3 + rec.dry / 10, 'dry', tr(`${p.name} wartet seit ${rec.dry} Spielen auf ein Tor.`, `${p.name} has gone ${rec.dry} games without a goal.`), p.id);
    }
    if ((rec.run ?? 0) >= STORY.run) {
      story.run = rec.run;
      add(3 + rec.run / 10, 'run', tr(`${p.name} hat in den letzten ${rec.run} Spielen getroffen.`, `${p.name} has scored in each of his last ${rec.run} games.`), p.id);
    }
    if (story.exClub === oppId) add(4.5, 'exclub', tr(`${p.name} trifft heute auf seinen alten Verein.`, `${p.name} faces his old club today.`), p.id);
    if (!Object.keys(story).length) delete p.story;
  }
  // Beim Gegner: Ehemalige und Angstgegner (memory.js tagStories hat sie schon markiert).
  for (const p of match.players.filter((x) => x.team !== team)) {
    if (p.story?.former) add(4.5, 'former', tr(`Wiedersehen: ${p.name} spielt jetzt für ${oppShort}.`, `Reunion: ${p.name} now plays for ${oppShort}.`), p.id);
    else if (p.story?.nemesis >= 2) add(3.5, 'nemesis', tr(`Vorsicht vor ${p.name}: ${p.story.nemesis} Tore hat er uns schon eingeschenkt.`, `Watch out for ${p.name}: he has already put ${p.story.nemesis} past us.`), p.id);
  }
  // Form der Mannschaft und Hinspiel.
  const res = results(c, humanId);
  let wins = 0;
  let winless = 0;
  for (let i = res.length - 1; i >= 0 && res[i].gf > res[i].ga; i--) wins++;
  for (let i = res.length - 1; i >= 0 && res[i].gf <= res[i].ga; i--) winless++;
  if (wins >= STORY.form) add(3 + wins / 10, 'wins', tr(`${wins} Siege in Folge – hält die Serie?`, `${wins} wins on the bounce – can the run go on?`));
  else if (winless >= STORY.form) add(3 + winless / 10, 'winless', tr(`Seit ${winless} Spielen ohne Sieg – heute muss der Knoten platzen.`, `${winless} games without a win – today the knot has to come undone.`));
  const first = res.find((r) => r.opp === oppId);
  if (first) {
    const s = `${first.gf}:${first.ga}`;
    if (first.gf < first.ga) add(3.2, 'revenge', tr(`Das Hinspiel ging ${s} verloren – Zeit für die Revanche.`, `We lost the first meeting ${s} – time for revenge.`));
    else if (first.gf > first.ga) add(2.5, 'h2h', tr(`Das Hinspiel haben wir ${s} gewonnen.`, `We won the first meeting ${s}.`));
    else add(2.2, 'h2h', tr(`Das Hinspiel endete ${s}.`, `The first meeting ended ${s}.`));
  }
  return out.sort((a, b) => b.w - a.w).slice(0, STORY.max);
}
