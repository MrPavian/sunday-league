// Andere Vereine werben um deine Spieler – und ganz selten holt ein Profiverein einen.
//
// Abwerbeversuch: Wer bei dir wenig spielt, grummelt oder zu den Besten gehört, bekommt ein
// Angebot – oft vom Derby-Rivalen. Du erfährst es unter der Woche und entscheidest bis Sonntag:
// reden, Einsatz versprechen (gebrochene Versprechen haben Folgen, siehe advanceArcs),
// Fahrgeld aus der Kasse oder ziehen lassen. Wer geht, spielt danach beim anderen Verein
// (Ex-Spieler-Geschichten, Derby-Brisanz).
//
// Profivertrag: Für Amateure praktisch ausgeschlossen. Recherche: Von allen Kindern, die mit
// Fußball anfangen, wird etwa jedes zehntausendste Profi (0,01 %); selbst von U19-Spielern aus
// Nachwuchsleistungszentren schaffen es nur 3,5 % in einen Profikader. Die DFL zahlte in einem
// Jahr an 107 Amateurvereine Ausbildungsentschädigung – bei rund 24.000 Vereinen etwa einmal in
// 200 Jahren je Verein, Jugendjahre eingerechnet. Hier: nur Spieler bis 21 Jahre mit
// Ausnahmestärke (ab 68 – das oberste Prozent der jungen Amateure); gemessen etwa einmal in
// rund 300 Saisons je Verein. Der Profiverein zahlt eine Ausbildungsentschädigung
// nach dem Muster der DFL-Regel: 5.400 € je Ausbildungsjahr im Alter von 12 bis 21 Jahren beim
// Verein. Profivereine tragen ausgedachte Namen.
import { tr } from '../core/i18n.js';
import { book } from './finances.js';
import { clubById, humanClub, playerOf, releasePlayer, table } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { canLose, first, joinRival, outcome } from './outcomes.js';
import { isCoach } from './personal.js';
import { chronicle } from './sagas.js';

const POACH_GATE = 0.6; // so oft wird überhaupt ein Kandidat gesucht (je Ereigniswoche)
export const PRO_MIN_RATING = 68;
export const PRO_MAX_AGE = 21;
export const COMPENSATION_PER_YEAR = 5400;

export const PRO_CLUBS = ['FC Rheinstadt 1899', 'SV Hanseatica Nordhafen', 'Sportverein Elbtal 1904', 'Union Weserland', '1. FC Südbergen', 'Viktoria Lindenhof 07', 'Eintracht Bergmark', 'Athletik-Club Moorhausen', 'Fortuna Sternfeld 1911', 'Rot-Weiß Kaltenbach'];

const euro = (v) => v.toLocaleString('de-DE');

// Wer kommt für ein Angebot in Frage – und warum?
function poachCandidates(c) {
  const club = humanClub(c);
  const played = table(c).find((r) => r.club.human)?.played ?? 0;
  const ratings = club.squad.map((i) => playerOf(c, i).rating).sort((a, b) => b - a);
  const top = ratings[1] ?? ratings[0] ?? 0;
  const out = [];
  for (const idx of club.squad) {
    const rec = c.players[idx];
    if (!rec || isCoach(c, idx) || rec.injuryWeeks > 0 || c.flags?.poached?.[idx] === c.season) continue;
    const p = playerOf(c, idx);
    if (rec.grumpy > 0) out.push({ idx, why: 'grumpy', w: 2 });
    else if (played >= 3 && (rec.playShare ?? rec.apps) <= played * 0.45) out.push({ idx, why: 'bench', w: 2 }); // Spielzeit, nicht Einsätze
    else if (p.rating >= top && (rec.form ?? 0) >= 0) out.push({ idx, why: 'star', w: 1.2 });
  }
  return out;
}

// Wer wirbt? Oft der Derby-Rivale, sonst ein Verein aus der Liga – lieber einer von oben.
function suitor(c, rng) {
  const rival = c.flags?.derbyRival;
  if (rival && clubById(c, rival) && rng.chance(0.5)) return rival;
  const rows = table(c).filter((r) => !r.club.human);
  if (!rows.length) return null;
  const pick = rows[Math.floor(rng.next() * Math.min(rows.length, 3))]; // eher die oberen drei
  return pick.club.id;
}

const mark = (c, idx) => ((c.flags.poached ??= {})[idx] = c.season);
const leaveFor = (c, ctx) => {
  mark(c, ctx.s);
  return joinRival(c, ctx.s, ctx.club);
};

export const POACH_EVENTS = {
  abwerbeversuch: {
    weight: 30,
    needs(c, rng) {
      if (!rng.chance(POACH_GATE)) return null;
      const cands = poachCandidates(c);
      if (!cands.length || !canLose(c)) return null;
      let r = rng.next() * cands.reduce((s, x) => s + x.w, 0);
      const hit = cands.find((x) => (r -= x.w) < 0) ?? cands[0];
      const club = suitor(c, rng);
      return club ? { s: hit.idx, why: hit.why, club } : null;
    },
    text(c, ctx) {
      const n = first(c, ctx.s);
      const club = clubById(c, ctx.club)?.name ?? '?';
      const rival = ctx.club === c.flags?.derbyRival;
      const tail = rival ? tr(' Ausgerechnet der Derby-Rivale.', ' Your derby rivals, of all clubs.') : '';
      if (ctx.why === 'bench') return tr(`${n} hat ein Angebot von ${club}: „Bei uns spielst du jeden Sonntag." Bei dir sitzt er oft draußen. Bis Sonntag will er sich entscheiden.${tail}`, `${n} has an offer from ${club}: "With us you play every Sunday." With you he is often on the bench. He wants to decide by Sunday.${tail}`);
      if (ctx.why === 'grumpy') return tr(`${n} grummelt ohnehin schon – und jetzt hat ${club} angerufen. Er überlegt ernsthaft zu wechseln.${tail}`, `${n} is already sulking – and now ${club} have called. He is seriously thinking about switching.${tail}`);
      return tr(`${club} wirbt um ${n}: Der Trainer drüben hat ihn beim letzten Duell beobachtet. Er fühlt sich geschmeichelt.${tail}`, `${club} are courting ${n}: their manager watched him in the last meeting. He is flattered.${tail}`);
    },
    options: [
      {
        label: tr('Unter vier Augen reden', 'Have a word in private'),
        effect: outcome([
          { w: (c, ctx) => (ctx.why === 'star' ? 3 : 2) + 2 * (c.mood ?? 0), run: (c, ctx) => (mark(c, ctx.s), adjustForm(c, ctx.s, 0.3), tr(`${first(c, ctx.s)} bleibt: „Hier sind meine Jungs." Er geht mit Schwung in die Woche.`, `${first(c, ctx.s)} stays: "My lads are here." He goes into the week with fresh energy.`)) },
          { w: 1, run: (c, ctx) => (mark(c, ctx.s), (c.players[ctx.s].grumpy = 1), tr(`${first(c, ctx.s)} bleibt – aber überzeugt klingt anders.`, `${first(c, ctx.s)} stays – but he does not sound convinced.`)) },
          { w: (c, ctx) => (canLose(c) ? (ctx.why === 'grumpy' ? 2 : 1) : 0), run: (c, ctx) => (leaveFor(c, ctx) ? tr(`Das Gespräch hilft nicht. ${first(c, ctx.s)} wechselt zu ${clubById(c, ctx.club)?.name}.`, `The talk does not help. ${first(c, ctx.s)} joins ${clubById(c, ctx.club)?.name}.`) : tr('Er bleibt. Vorerst.', 'He stays. For now.')) },
        ]),
      },
      {
        label: tr('Einsatz am Sonntag versprechen', 'Promise him a game on Sunday'),
        effect: outcome([
          { w: (c, ctx) => (ctx.why === 'star' ? 2 : 5), run: (c, ctx) => (mark(c, ctx.s), (c.flags.promise = { idx: ctx.s, round: c.round }), tr(`${first(c, ctx.s)} sagt ${clubById(c, ctx.club)?.name} ab. Jetzt musst du dein Versprechen halten.`, `${first(c, ctx.s)} turns down ${clubById(c, ctx.club)?.name}. Now you have to keep your promise.`)) },
          { w: 1, run: (c, ctx) => (mark(c, ctx.s), (c.flags.promise = { idx: ctx.s, round: c.round }), adjustMood(c, -0.04), tr('Er bleibt. Aber das spricht sich rum – jetzt wollen noch zwei andere ein Versprechen.', 'He stays. But word gets round – now two others want a promise too.')) },
          { w: (c) => (canLose(c) ? 0.7 : 0), run: (c, ctx) => (leaveFor(c, ctx) ? tr(`${first(c, ctx.s)} glaubt dir nicht und unterschreibt drüben.`, `${first(c, ctx.s)} does not believe you and signs over there.`) : tr('Er bleibt. Vorerst.', 'He stays. For now.')) },
        ]),
      },
      {
        label: tr('Fahrgeld aus der Kasse (30 €)', 'Petrol money from the kitty (€30)'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (mark(c, ctx.s), book(c, tr(`Fahrgeld ${first(c, ctx.s)}`, `Petrol money ${first(c, ctx.s)}`), -30), tr(`${first(c, ctx.s)} bleibt. „Für die Spritkosten – okay."`, `${first(c, ctx.s)} stays. "For the petrol – fair enough."`)) },
          { w: 1, run: (c, ctx) => (mark(c, ctx.s), book(c, tr(`Fahrgeld ${first(c, ctx.s)}`, `Petrol money ${first(c, ctx.s)}`), -30), adjustMood(c, -0.03), tr('Er bleibt – aber in der Kabine wird gefragt, wer sonst noch Fahrgeld bekommt.', 'He stays – but in the dressing room people are asking who else gets petrol money.')) },
          { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => (book(c, tr(`Fahrgeld ${first(c, ctx.s)}`, `Petrol money ${first(c, ctx.s)}`), -30), leaveFor(c, ctx) ? tr(`${first(c, ctx.s)} nimmt das Geld – und wechselt trotzdem. Die 30 € sind weg.`, `${first(c, ctx.s)} takes the money – and switches anyway. The €30 is gone.`) : tr('Er bleibt.', 'He stays.')) },
        ]),
      },
      {
        label: tr('Ziehen lassen', 'Let him go'),
        effect: outcome([
          { w: (c) => (canLose(c) ? 4 : 0), run: (c, ctx) => (leaveFor(c, ctx) ? (adjustMood(c, -0.02), tr(`${first(c, ctx.s)} wechselt zu ${clubById(c, ctx.club)?.name}. Das nächste Duell wird pikant.`, `${first(c, ctx.s)} joins ${clubById(c, ctx.club)?.name}. The next meeting will be spicy.`)) : tr('Er bleibt.', 'He stays.')) },
          { w: 1, run: (c, ctx) => (mark(c, ctx.s), tr(`Am Ende war es nur Gerede: ${first(c, ctx.s)} bleibt.`, `In the end it was just talk: ${first(c, ctx.s)} stays.`)) },
        ]),
      },
    ],
  },

  profivertrag: {
    weight: 1000, // wenn es passiert, ist es das Thema der Woche
    needs(c, rng) {
      const rounds = Math.max(1, c.fixtures?.length ?? 14);
      for (const idx of humanClub(c).squad) {
        const p = playerOf(c, idx);
        const rec = c.players[idx];
        if (!rec || isCoach(c, idx) || rec.injuryWeeks > 0 || p.age > PRO_MAX_AGE || p.rating < PRO_MIN_RATING) continue;
        // Je Saison: ab 68 rund 10 %, je Punkt mehr 5 % dazu, höchstens 50 %. Pro Woche verteilt
        // (Ereigniswochen kommen mit 65 % – das gleicht der Nenner aus).
        if (!rng.chance(proSeasonChance(p) / rounds / 0.65)) continue;
        const club = PRO_CLUBS[(c.seed + c.season * 7 + idx) % PRO_CLUBS.length];
        return { s: idx, club, amount: compensation(c, idx) };
      }
      return null;
    },
    text: (c, ctx) =>
      tr(
        `Das gibt es im Kreis vielleicht alle paar Jahrzehnte einmal: ${playerOf(c, ctx.s).name} (${playerOf(c, ctx.s).age}) unterschreibt bei ${ctx.club} seinen ersten Profivertrag! Für seine Ausbildungsjahre bei euch zahlt ${ctx.club} eine Ausbildungsentschädigung von ${euro(ctx.amount)} €.`,
        `This happens in the district maybe once every few decades: ${playerOf(c, ctx.s).name} (${playerOf(c, ctx.s).age}) signs his first professional contract with ${ctx.club}! For his development years with you, ${ctx.club} pay training compensation of €${euro(ctx.amount)}.`,
      ),
    options: [
      { label: tr('Abschiedsfeier im Vereinsheim (60 €)', 'Farewell party at the clubhouse (€60)'), effect: (c, ctx) => (turnPro(c, ctx), book(c, tr(`Abschiedsfeier ${first(c, ctx.s)}`, `Farewell party ${first(c, ctx.s)}`), -60), adjustMood(c, 0.15), tr('Die halbe Stadt kommt. Er verspricht, im Sommer mal zum Training vorbeizuschauen.', 'Half the town turns up. He promises to drop by training in the summer.')) },
      { label: tr('Trikot einrahmen und im Vereinsheim aufhängen', 'Frame his shirt and hang it in the clubhouse'), effect: (c, ctx) => (turnPro(c, ctx), adjustMood(c, 0.1), tr('Das Trikot hängt jetzt neben dem Wimpel von 1987. Jeder Neue wird davor gestellt.', 'The shirt now hangs next to the pennant from 1987. Every new player gets shown it.')) },
      { label: tr('Kurz gratulieren – Sonntag ist Spiel', 'Quick congratulations – there is a game on Sunday'), effect: (c, ctx) => (turnPro(c, ctx), adjustMood(c, 0.05), tr('„Mach uns stolz." Dann geht es weiter, Kreisliga wartet nicht.', '"Make us proud." Then it is back to business – the district league waits for no one.')) },
    ],
  },
};

export function proSeasonChance(p) {
  if (p.age > PRO_MAX_AGE || p.rating < PRO_MIN_RATING) return 0;
  return Math.min(0.5, 0.1 + (p.rating - PRO_MIN_RATING) * 0.05) * (p.age <= 19 ? 1.2 : 1);
}

// Ausbildungsjahre beim Verein im Alter von 12 bis 21 (mindestens eins) × 5.400 €.
export function compensation(c, idx) {
  const p = playerOf(c, idx);
  const seasons = (c.players[idx]?.seasons?.length ?? 0) + 1;
  const from = Math.max(12, p.age - seasons + 1);
  const to = Math.min(21, p.age);
  return Math.max(1, to - from + 1) * COMPENSATION_PER_YEAR;
}

// Wechsel zum Profiverein: verlässt den Kader auch bei knapper Besetzung (Aushilfen füllen auf),
// Geld in die Kasse, Eintrag in die Vereinschronik; als Ehemaliger bleibt er „Profi bei …".
function turnPro(c, ctx) {
  const name = playerOf(c, ctx.s).name;
  if (!releasePlayer(c, ctx.s, { force: true })) return false;
  if (c.formers?.[ctx.s]) c.formers[ctx.s].pro = ctx.club;
  book(c, tr(`Ausbildungsentschädigung ${ctx.club}`, `Training compensation ${ctx.club}`), ctx.amount);
  chronicle(c, tr(`${name} wird Profi bei ${ctx.club}. Ausbildungsentschädigung: ${euro(ctx.amount)} €.`, `${name} turns professional with ${ctx.club}. Training compensation: €${euro(ctx.amount)}.`));
  return true;
}
