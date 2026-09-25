// Vereinsleben: Ereignisse in der Chatgruppe mit Entscheidungen und Folgen,
// Teamstimmung, Tagesform und mehrwöchige Geschichten.
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { getPool, humanClub, joinSquad, playerOf, releasePlayer } from './career.js';
import { advanceStories, arcsOf, STORY_STARTS, storyDecision } from './stories.js';
import { CRISES, PERSONAL_EVENTS } from './personal.js';
import { SAGA_EVENTS } from './sagas.js';
import { SOCIAL_EVENTS } from './social.js';
import { DERBY_EVENTS, derbyThisWeek } from './derby.js';
import { canLose, joinRival, leaveTeam, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { setRelation } from './relations.js';

const EVENT_CHANCE = 0.65; // pro Woche
const NO_REPEAT = 4; // Wochen, bevor dasselbe Ereignis wiederkommen darf

// --- Stimmung & Form -------------------------------------------------------------

export const clamp1 = (v) => Math.max(-1, Math.min(1, v));
export const mood = (career) => career.mood ?? 0;
export function adjustMood(career, d) {
  career.mood = clamp1(mood(career) + d);
}
export function moodLabel(v) {
  if (v >= 0.45) return 'super';
  if (v >= 0.15) return 'gut';
  if (v > -0.15) return 'okay';
  if (v > -0.45) return 'angespannt';
  return 'mies';
}

// Tagesform eines Spielers (-1 … +1) für den nächsten Spieltag.
export function adjustForm(career, idx, d) {
  const rec = career.players[idx];
  if (rec) rec.form = clamp1((rec.form ?? 0) + d);
}

// Wirkung der Form auf die Werte im Match: ±8 %.
export function applyForm(p, rec, teamMood = 0) {
  const f = (rec?.form ?? 0) + teamMood * 0.3;
  if (!f) return p;
  for (const k of ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling']) p.attrs[k] = Math.max(0.05, Math.min(0.98, p.attrs[k] * (1 + 0.08 * f)));
  return p;
}

// Ende der Woche: Form und Stimmung klingen ab, Teamchemie-Typen heben die Laune.
export function weeklyMood(career) {
  const club = humanClub(career);
  const chemists = club.squad.filter((idx) => playerOf(career, idx).traits.includes('teamchemie')).length;
  career.mood = clamp1(mood(career) * 0.88 + Math.min(0.06, chemists * 0.02));
  for (const idx of club.squad) {
    const rec = career.players[idx];
    if (!rec) continue;
    rec.form = (rec.form ?? 0) * 0.5;
    if (rec.grumpy > 0) rec.grumpy--;
  }
  if (career.flags?.pressWeeks > 0) career.flags.pressWeeks--;
}

// Ergebnis schlägt auf die Laune.
export function resultMood(career, goalsFor, goalsAgainst) {
  if (goalsFor > goalsAgainst) adjustMood(career, 0.1);
  else if (goalsFor < goalsAgainst) adjustMood(career, -0.07);
}

// Absage-Faktor aus Stimmung und Frust eines Spielers.
export function absenceFactor(career, idx) {
  const rec = career.players[idx];
  return (1 - mood(career) * 0.3) * (rec?.grumpy > 0 ? 1.8 : 1) * (rec?.absenceMul ?? (rec?.movedAway ? 3 : 1)) * (rec?.loyal ? 0.8 : 1);
}

// --- Hilfen für die Ereignisse -----------------------------------------------------

const first = (career, idx) => playerOf(career, idx).name.split(' ')[0];
const squad = (career) => humanClub(career).squad;
const say = (career, from, text, time = 'Sa 11:20') => career.week.chat.push({ from, text, time });

function pickSubject(career, rng, filter = () => true) {
  const list = squad(career).filter((idx) => filter(idx, playerOf(career, idx), career.players[idx]));
  return list.length ? rng.pick(list) : null;
}

// --- Die Ereignisse ------------------------------------------------------------------
// needs(career, rng) → Kontext oder null (dann passt das Ereignis gerade nicht).
// options[i].effect(career, ctx, rng) → Ergebnistext.

export const EVENTS = {
  vereinsheim: {
    weight: 3,
    needs: () => ({}),
    text: () => 'Freitagabend im Vereinsheim? Die Zapfanlage ist frisch gereinigt.',
    options: [
      {
        label: 'Freibier – ich zahl die erste Runde (40 €)',
        effect: outcome([
          {
            w: 4,
            run: (c, ctx, rng) => {
              book(c, 'Freibier im Vereinsheim', -40);
              adjustMood(c, 0.25);
              const hung = [...squad(c)].sort(() => rng.next() - 0.5).slice(0, 2);
              for (const idx of hung) adjustForm(c, idx, -0.6);
              return `Legendärer Abend. ${hung.map((i) => first(c, i)).join(' und ')} sind Sonntag noch nicht ganz nüchtern.`;
            },
          },
          { w: 2, run: (c) => (book(c, 'Freibier im Vereinsheim', -40), adjustMood(c, 0.18), 'Schöner Abend, alle um Mitternacht zu Hause. Fast schon verdächtig vernünftig.') },
          {
            w: 1.5,
            run: (c, ctx, rng) => {
              book(c, 'Freibier im Vereinsheim', -65);
              adjustMood(c, 0.2);
              const s = rng.pick(squad(c));
              return `Aus einer Runde wurden sieben. 65 € weg, und ${first(c, s)} hat auf dem Tisch „Atemlos" gesungen. Es gibt Videos.`;
            },
          },
          {
            w: 1,
            run: (c, ctx, rng) => {
              book(c, 'Freibier im Vereinsheim', -40);
              const [a, b] = [...squad(c)].sort(() => rng.next() - 0.5);
              c.players[b].grumpy = 2;
              adjustMood(c, 0.05);
              return `Um eins geraten ${first(c, a)} und ${first(c, b)} über eine alte Schiri-Entscheidung aneinander. ${first(c, b)} geht wütend nach Hause.`;
            },
          },
          {
            w: (c) => (canLose(c) ? 0.4 : 0),
            run: (c, ctx, rng) => {
              book(c, 'Freibier im Vereinsheim', -40);
              const s = rng.pick(squad(c).filter((i) => !isCoach(c, i)));
              adjustMood(c, 0.1);
              if (leaveTeam(c, s)) return `Der Abend eskaliert. ${first(c, s)} beleidigt den Wirt, fliegt raus – und schreibt am Sonntag: „Ich hör auf. War eh nichts für mich."`;
              return 'Der Abend eskaliert kurz, dann entschuldigt sich jeder bei jedem.';
            },
          },
        ]),
      },
      {
        label: 'Jeder zahlt selbst',
        effect: outcome([
          { w: 4, run: (c) => (adjustMood(c, 0.08), 'Gemütliche Runde, alle pünktlich zu Hause.') },
          { w: 2, run: (c) => (adjustMood(c, 0.03), 'Nur fünf Leute da. Die fünf hatten es nett.') },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); adjustForm(c, s, 0.3); return `${first(c, s)} erzählt den ganzen Abend von seinem Urlaub und ist Sonntag top motiviert.`; } },
          { w: 1, run: (c) => (book(c, 'Spende vom Tresen', 15), adjustMood(c, 0.05), 'Ein Gast am Tresen findet euch sympathisch und wirft 15 € in die Mannschaftskasse.') },
        ]),
      },
      {
        label: 'Diese Woche nicht',
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.05), 'Ein paar sind enttäuscht – „früher war mehr los".') },
          { w: 2, run: () => 'Die Jungs gehen trotzdem, ohne dich. Hat keiner gemerkt.' },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); c.players[s].grumpy = 1; return `${first(c, s)} hatte extra seinen Geburtstag dort geplant. Jetzt ist er sauer.`; } },
        ]),
      },
    ],
  },

  arbeitseinsatz: {
    weight: 2,
    needs: () => ({}),
    text: () => 'Der Platz sieht aus wie ein Acker. Samstag Arbeitseinsatz: Löcher stopfen, Linien ziehen, Tore streichen?',
    options: [
      {
        label: 'Alle antreten, ich bring Brötchen mit',
        effect: outcome([
          {
            w: 4,
            run: (c) => {
              adjustMood(c, 0.12);
              for (const idx of squad(c)) adjustForm(c, idx, -0.15);
              book(c, 'Brötchen für den Arbeitseinsatz', -10);
              if ((c.level ?? 1) > 1) book(c, 'Rabatt Platzmiete für den Arbeitseinsatz', 20);
              return 'Der Platz glänzt, die Truppe ist zusammengewachsen – aber alle haben Muskelkater.';
            },
          },
          { w: 2, run: (c) => (book(c, 'Brötchen für den Arbeitseinsatz', -10), adjustMood(c, 0.06), 'Halbe Mannschaft da, halbe Arbeit gemacht. Die Tore sind jetzt zur Hälfte weiß.') },
          {
            w: 1,
            run: (c, ctx, rng) => {
              book(c, 'Brötchen für den Arbeitseinsatz', -10);
              const s = rng.pick(squad(c));
              c.players[s].injuryWeeks = Math.max(c.players[s].injuryWeeks, 1);
              sitOut(c, s);
              return `${first(c, s)} ist die Leiter runtergefallen. Nichts gebrochen, aber Sonntag fällt er aus.`;
            },
          },
          { w: 1, run: (c) => (book(c, 'Brötchen für den Arbeitseinsatz', -10), book(c, 'Farbe vom Baumarkt gesponsert', 25), adjustMood(c, 0.1), 'Der Baumarkt hat die Farbe gesponsert, als er von der Aktion gehört hat. 25 € gespart.') },
          { w: 0.7, run: (c) => (book(c, 'Brötchen für den Arbeitseinsatz', -10), adjustMood(c, 0.15), 'Beim Umgraben habt ihr eine Zeitkapsel von 1987 gefunden. Mit Mannschaftsfoto. Die Frisuren!') },
        ]),
      },
      {
        label: 'Wer Lust hat, kommt',
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.03), 'Drei Mann und ein Rasenmäher. Immerhin.') },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); c.players[s].loyal = true; return `Nur ${first(c, s)} kommt – und macht alles allein. Er verdient einen Orden.`; } },
          { w: 1, run: () => 'Keiner kommt. Der Platzwart macht es allein und erzählt es jedem.' },
        ]),
      },
      {
        label: 'Lassen wir',
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.04), 'Der Platzwart schüttelt den Kopf.') },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); adjustForm(c, s, -0.3); return `${first(c, s)} knickt im Maulwurfshügel um. Leicht, aber ärgerlich.`; } },
          { w: 1, run: () => 'Der Nachbarverein hat es fotografiert und in seine Gruppe gestellt: „Kartoffelacker FC".' },
        ]),
      },
    ],
  },

  streit: {
    weight: 2,
    needs: (c, rng) => {
      const a = pickSubject(c, rng, (idx) => !isCoach(c, idx));
      const b = pickSubject(c, rng, (idx) => idx !== a && !isCoach(c, idx));
      return a != null && b != null ? { a, b } : null;
    },
    text: (c, ctx) => `Zoff in der Gruppe: ${first(c, ctx.a)} wirft ${first(c, ctx.b)} vor, „immer nur zu labern und nie zu laufen". Es fliegen Sprachnachrichten.`,
    options: [
      {
        label: 'Beide anrufen und schlichten',
        effect: outcome([
          { w: 4, run: (c) => (adjustMood(c, 0.08), 'Handschlag beim Bäcker. Erledigt.') },
          { w: 2, run: (c, ctx) => ((c.players[ctx.b].grumpy = 2), `${first(c, ctx.b)} ist immer noch angefressen und sagt diese Woche lieber ab.`) },
          { w: 1.5, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.1), 'Das Gespräch dauert zwei Stunden. Am Ende gehen sie zusammen ein Bier trinken. Jetzt sind sie Kumpels.') },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), 'Du hörst dir beide Seiten an. Jetzt sind beide sauer – auch auf dich. Und aufeinander sowieso.') },
          { w: (c) => (canLose(c) ? 0.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? `${first(c, ctx.b)} hat genug: „Mit dem spiel ich nicht mehr." Er ist raus aus der Gruppe.` : 'Fast wäre einer gegangen. Fast.') },
        ]),
      },
      {
        label: 'Beide 10 € in die Kasse',
        effect: outcome([
          { w: 3, run: (c) => (book(c, 'Strafe: Streit in der Gruppe', 20), adjustMood(c, -0.08), 'Ruhe ist. Begeistert ist keiner.') },
          { w: 1.5, run: (c) => (book(c, 'Strafe: Streit in der Gruppe', 20), adjustMood(c, 0.04), 'Gezahlt, gelacht, vergessen. Einer schlägt vor, den Strafenkatalog zu erweitern.') },
          { w: 1, run: (c, ctx) => (book(c, 'Strafe: Streit in der Gruppe', 10), (c.players[ctx.a].grumpy = 3), `${first(c, ctx.a)} weigert sich zu zahlen: „Ich hab doch recht!" Nur 10 € in der Kasse.`) },
          { w: (c) => (canLose(c) ? 0.4 : 0), run: (c, ctx) => (leaveTeam(c, ctx.a) ? `${first(c, ctx.a)} zahlt – und tritt aus. „Für 10 € lass ich mich nicht erziehen."` : 'Beide zahlen. Zähneknirschend.') },
        ]),
      },
      {
        label: 'Raushalten',
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustMood(c, -0.12), sitOut(c, ctx.b), `${first(c, ctx.b)} hat die Gruppe auf stumm geschaltet und kommt Sonntag nicht.`) },
          { w: 2, run: (c) => (adjustMood(c, -0.03), 'Nach zwei Tagen redet keiner mehr darüber.') },
          { w: 1, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), adjustMood(c, -0.06), 'Die Sache gärt weiter. Die beiden gehen sich jetzt aus dem Weg.') },
          { w: 1, run: (c, ctx) => ((c.players[ctx.a].injuryWeeks = 1), sitOut(c, ctx.a), `Im Training geht es weiter. ${first(c, ctx.b)} grätscht ${first(c, ctx.a)} weg – eine Woche Pause.`) },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? `Ohne Trainer, der eingreift, zieht ${first(c, ctx.b)} die Konsequenz und geht.` : 'Es kracht, aber keiner geht.') },
        ]),
      },
    ],
  },

  nachbar: {
    weight: 2,
    needs: () => ({}),
    text: () => 'Der Nachbar vom Hinterhof hat drei Bälle einbehalten. „Die krieg ich erst wieder, wenn das Geballer aufhört!"',
    options: [
      {
        label: 'Neue Bälle kaufen (30 €)',
        effect: outcome([
          { w: 3, run: (c) => (book(c, 'Neue Bälle', -30), 'Neue Bälle, gleicher Nachbar.') },
          { w: 1, run: (c) => (book(c, 'Neue Bälle (Sonderangebot)', -18), 'Sonderangebot beim Sportgeschäft. Nur 18 €.') },
          { w: 1, run: (c) => (book(c, 'Neue Bälle', -30), adjustMood(c, -0.04), 'Die neuen Bälle sind steinhart. Alle meckern über das Material.') },
        ]),
      },
      {
        label: 'Klingeln und eine Flasche Wein mitbringen (8 €)',
        effect: outcome([
          { w: 3, run: (c) => (book(c, 'Flasche Wein für den Nachbarn', -8), adjustMood(c, 0.04), 'Der Nachbar ist eigentlich ganz nett. Bälle zurück, und er kommt Sonntag gucken.') },
          { w: 2, run: (c) => (book(c, 'Flasche Wein für den Nachbarn', -8), book(c, 'Neue Bälle', -30), 'Tür bleibt zu. Also doch neue Bälle.') },
          { w: 1, run: (c) => (book(c, 'Flasche Wein für den Nachbarn', -8), book(c, 'Spende vom Nachbarn', 20), adjustMood(c, 0.06), 'Er hat früher selbst gespielt, 1974 Kreismeister. Bälle zurück und 20 € für die Kasse.') },
          { w: 1, run: (c) => (book(c, 'Flasche Wein für den Nachbarn', -8), adjustMood(c, -0.03), 'Er nimmt den Wein, behält die Bälle und droht mit dem Ordnungsamt.') },
        ]),
      },
      {
        label: 'Mit alten Bällen weiterspielen',
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.05), 'Die Pille eiert. Alle meckern.') },
          { w: 1, run: (c) => (adjustMood(c, 0.03), 'Die alte Lederkugel von 1998 wird zum Kult. Jeder will mal damit schießen.') },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); adjustForm(c, s, -0.3); return `Der Ball platzt beim Schuss von ${first(c, s)}. Er nimmt es persönlich.`; } },
        ]),
      },
    ],
  },

  presse: {
    weight: 1,
    needs: (c) => (c.flags?.pressWeeks ? null : {}),
    text: () => 'Das Kreisblatt will ein Porträt über den Verein machen – mit Mannschaftsfoto und allem.',
    options: [
      {
        label: 'Gerne! Alle in Trikot zum Foto',
        effect: outcome([
          { w: 4, run: (c) => ((c.flags.pressWeeks = 4), adjustMood(c, 0.1), 'Halbe Seite im Kreisblatt! Mehr Zuschauer in den nächsten Wochen – ein Ex-Profi würde den Rummel aber meiden.') },
          { w: 1.5, run: (c) => ((c.flags.pressWeeks = 4), adjustMood(c, -0.04), 'Auf dem Foto hat einer die Augen zu und einer steht im falschen Trikot. Der Artikel ist trotzdem nett.') },
          { w: 1, run: (c, ctx, rng) => { c.flags.pressWeeks = 5; const s = rng.pick(squad(c)); adjustForm(c, s, 0.5); return `Das Kreisblatt macht ${first(c, s)} zum „Gesicht des Vereins". Er kauft zehn Exemplare.`; } },
          { w: 1, run: (c) => ((c.flags.pressWeeks = 3), book(c, 'Anfrage nach Artikel: Spende', 30), 'Nach dem Artikel ruft eine Firma an und spendet 30 €.') },
          { w: 0.7, run: (c) => ((c.flags.pressWeeks = 2), adjustMood(c, -0.08), 'Die Überschrift: „Die Chaoten vom Hinterhof". Der Reporter fand das witzig. Ihr nicht.') },
        ]),
      },
      { label: 'Lieber nicht', effect: outcome([{ w: 3, run: () => 'Wir bleiben der Geheimtipp.' }, { w: 1, run: () => 'Das Kreisblatt schreibt stattdessen über den Nachbarverein. Die zeigen den Artikel überall rum.' }, { w: 1, run: (c) => (adjustMood(c, -0.03), 'Ein paar Spieler hätten gern mal in der Zeitung gestanden.') }]) },
    ],
  },

  kater: {
    weight: 3,
    needs: (c, rng) => {
      const s = pickSubject(c, rng, (idx) => c.week.availability[idx] === 'yes' && !isCoach(c, idx));
      return s == null ? null : { s };
    },
    text: (c, ctx) => `${first(c, ctx.s)} hat Samstag in den Geburtstag reingefeiert. Laut Story bis 4 Uhr.`,
    options: [
      {
        label: 'Trotzdem spielen lassen',
        effect: outcome([
          { w: 4, run: (c, ctx) => (adjustForm(c, ctx.s, -0.8), `${first(c, ctx.s)} läuft Sonntag auf Restalkohol.`) },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), `Wider Erwarten ist ${first(c, ctx.s)} hellwach. „Das Adrenalin", sagt er.`) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), `${first(c, ctx.s)} verschläft komplett. Handy aus. Sonntag ohne ihn.`) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, -0.6), adjustMood(c, 0.05), `${first(c, ctx.s)} übergibt sich in der Halbzeit hinters Tor. Die Kabine hat eine neue Geschichte.`) },
        ]),
      },
      {
        label: 'Erste Halbzeit auf die Bank',
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), `${first(c, ctx.s)} kommt zur zweiten Halbzeit – mit Sonnenbrille.`) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), (c.players[ctx.s].grumpy = 1), `${first(c, ctx.s)} findet das übertrieben und schmollt auf der Bank.`) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s, 'late'), adjustForm(c, ctx.s, 0.4), `${first(c, ctx.s)} will sich rehabilitieren und kommt wie ein Tier aus der Kabine.`) },
        ]),
      },
      {
        label: '5 € in die Kasse, Thema durch',
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, `Strafe: Kater ${first(c, ctx.s)}`, 5), adjustForm(c, ctx.s, -0.5), 'Gezahlt, gelacht, gespielt.') },
          { w: 1, run: (c, ctx) => (book(c, `Strafe: Kater ${first(c, ctx.s)}`, 25), `${first(c, ctx.s)} zahlt freiwillig 25 € – für alle, die auch auf der Party waren.`) },
          { w: 1, run: (c, ctx) => (book(c, `Strafe: Kater ${first(c, ctx.s)}`, 5), adjustMood(c, -0.03), 'Jetzt wollen alle wissen, warum sie nicht eingeladen waren.') },
        ]),
      },
    ],
  },

  bankfrust: {
    weight: 3,
    needs: (c, rng) => {
      if (c.round < 3) return null;
      const s = pickSubject(c, rng, (idx, p, rec) => rec.apps <= Math.floor(c.round / 3) && !rec.grumpy && !isCoach(c, idx));
      return s == null ? null : { s };
    },
    text: (c, ctx) => `${first(c, ctx.s)} schreibt privat: „Warum spiel ich eigentlich nie? Dann kann ich sonntags auch ausschlafen."`,
    options: [
      {
        label: 'Einsatz am Sonntag versprechen',
        effect: outcome([
          { w: 4, run: (c, ctx) => ((c.flags.promise = { idx: ctx.s, round: c.round }), adjustForm(c, ctx.s, 0.4), `${first(c, ctx.s)} ist motiviert. Du solltest dein Versprechen halten.`) },
          { w: 1, run: (c, ctx) => ((c.flags.promise = { idx: ctx.s, round: c.round }), adjustForm(c, ctx.s, 0.8), `${first(c, ctx.s)} trainiert die ganze Woche wie ein Besessener. Halt dein Versprechen!`) },
          { w: 1, run: (c, ctx) => ((c.flags.promise = { idx: ctx.s, round: c.round }), adjustMood(c, -0.05), `Das spricht sich rum. Jetzt wollen noch zwei andere auch ein Versprechen.`) },
        ]),
      },
      {
        label: 'Ehrlich sein: Die anderen sind besser',
        effect: outcome([
          { w: 2, run: () => 'Er schluckt, bleibt aber. Respekt.' },
          { w: 1.5, run: (c, ctx) => (adjustForm(c, ctx.s, 0.5), 'Er nimmt es sportlich: „Dann zeig ich es euch halt im Training." Und das tut er.') },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? 'Er hat es verstanden – und sich einen anderen Verein gesucht.' : 'Er überlegt zu gehen, bleibt dann aber.') },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), (c.players[ctx.s].absenceMul = 1.5), 'Er bleibt, kommt aber nur noch, wenn er Lust hat.') },
          { w: (c) => (canLose(c) ? 0.5 : 0), run: (c, ctx) => (c.flags.derbyRival && joinRival(c, ctx.s, c.flags.derbyRival) ? `Schlimmer geht's nicht: ${first(c, ctx.s)} unterschreibt ausgerechnet beim Derby-Rivalen.` : 'Er schluckt, bleibt aber.') },
        ]),
      },
      {
        label: 'Nicht reagieren',
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].grumpy = 3), `${first(c, ctx.s)} ist beleidigt und sagt öfter ab.`) },
          { w: 1, run: () => 'Er fragt nie wieder. Du weißt nicht, ob das gut ist.' },
          { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? `Keine Antwort ist auch eine Antwort. ${first(c, ctx.s)} verlässt die Gruppe.` : 'Er grummelt.') },
        ]),
      },
    ],
  },

  trikots_eingelaufen: {
    weight: 1,
    needs: () => ({}),
    text: () => 'Katastrophe: Wer hat die Trikots auf 90 Grad gewaschen? Die passen jetzt der F-Jugend.',
    options: [
      {
        label: 'Neuer Satz (60 €)',
        effect: outcome([
          { w: 3, run: (c) => (book(c, 'Neuer Trikotsatz nach Waschunfall', -60), 'Neuer Satz bestellt. Waschzettel hängt jetzt in der Kabine.') },
          { w: 1, run: (c) => (book(c, 'Neuer Trikotsatz nach Waschunfall', -60), book(c, 'Alte Trikots an die F-Jugend verkauft', 20), 'Die F-Jugend kauft die alten Trikots für 20 €. Passen perfekt.') },
          { w: 1, run: (c) => (book(c, 'Neuer Trikotsatz (Expresslieferung)', -85), 'Nur noch mit Expresszuschlag lieferbar. 85 €.') },
        ]),
      },
      {
        label: 'Wir spielen in Leibchen',
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, -0.06), 'Sieht aus wie Training. Fühlt sich auch so an.') },
          { w: 1, run: (c) => (adjustMood(c, 0.04), 'Die neonorangen Leibchen werden zum Glücksbringer. Keiner will sie mehr hergeben.') },
          { w: 1, run: (c) => (book(c, 'Verbandsstrafe: falsche Spielkleidung', (c.level ?? 1) > 1 ? -15 : 0), (c.level ?? 1) > 1 ? 'Der Schiri notiert es im Spielbericht: 15 € Strafe.' : 'Der Gegner lacht, spielt aber trotzdem.') },
        ]),
      },
    ],
  },

  tombola: {
    weight: 1,
    needs: () => ({}),
    text: () => 'Die Bäckerei hat bei ihrer Tombola für euch gesammelt.',
    options: [
      {
        label: 'Danke!',
        effect: outcome([
          { w: 3, run: (c, ctx, rng) => { const n = rng.int(25, 60); book(c, 'Tombola der Bäckerei', n); return `${n} € für die Kasse.`; } },
          { w: 1, run: (c) => (book(c, 'Tombola der Bäckerei', 12), 'Nur 12 € – aber ein Gutschein für 30 Brötchen.') },
          { w: 1, run: (c) => (book(c, 'Tombola der Bäckerei', 90), adjustMood(c, 0.05), 'Rekord! 90 €. Die Bäckerin will jetzt Trikotsponsor werden.') },
        ]),
      },
    ],
  },

  kind_im_park: {
    weight: 1,
    needs: (c) => {
      const pool = getPool();
      const taken = new Set([...c.clubs.flatMap((x) => x.squad), ...(c.youth?.prospects ?? [])]);
      const kid = pool.everyone().find((p) => playerOf(c, p.poolIndex).age <= 17 && !taken.has(p.poolIndex) && p.tier !== 'ok');
      return kid ? { kid: kid.poolIndex } : null;
    },
    text: (c, ctx) => `Ein Junge aus der Nachbarschaft, ${first(c, ctx.kid)}, schaut jede Woche zu und kickt danach allein weiter. Richtig gut.`,
    options: [
      {
        label: 'In die A-Jugend holen',
        effect: outcome([
          { w: 3, run: (c, ctx) => (addProspect(c, ctx.kid), `${first(c, ctx.kid)} ist jetzt in der A-Jugend. Die Eltern haben zugestimmt.`) },
          { w: 1, run: (c, ctx) => (addProspect(c, ctx.kid), adjustForm(c, ctx.kid, 0.5), `${first(c, ctx.kid)} bringt gleich zwei Freunde mit zum Probetraining. Einer davon bleibt vielleicht auch.`) },
          { w: 1, run: () => 'Die Eltern sagen nein: „Erst das Abitur." Er kommt trotzdem jeden Sonntag gucken.' },
          { w: 0.6, run: (c, ctx) => (c.flags.derbyRival ? `Zu spät: Der Derby-Rivale hat ihn letzte Woche schon angesprochen. ${first(c, ctx.kid)} spielt jetzt dort.` : 'Zu spät, ein anderer Verein war schneller.') },
        ]),
      },
      { label: 'Er soll erstmal Schule machen', effect: outcome([{ w: 3, run: () => 'Vielleicht später.' }, { w: 1, run: () => 'Die Mutter bedankt sich. Du bekommst einen Kuchen.' }, { w: 1, run: () => 'Er ist enttäuscht und kommt nicht mehr gucken.' }]) },
    ],
  },

  allueren: {
    weight: 2,
    needs: (c, rng) => {
      const s = pickSubject(c, rng, (idx, p) => ['dorfstar', 'superstar', 'legende'].includes(p.tier) && !isCoach(c, idx));
      return s == null ? null : { s };
    },
    text: (c, ctx) => `${first(c, ctx.s)} will die Kapitänsbinde, nur noch vorne spielen und findet, dass die anderen „mal mehr laufen könnten".`,
    options: [
      {
        label: 'Nachgeben – er ist unser Bester',
        effect: outcome([
          { w: 3, run: (c, ctx) => (adjustForm(c, ctx.s, 0.5), adjustMood(c, -0.12), 'Er blüht auf. Der Rest der Truppe verdreht die Augen.') },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.7), adjustMood(c, 0.03), 'Er nimmt die Rolle ernst und reißt alle mit. Überraschend.') },
          { w: 1, run: (c, ctx, rng) => { const other = rng.pick(squad(c).filter((i) => i !== ctx.s && !isCoach(c, i))); setRelation(c, ctx.s, other, 'rivalen'); adjustMood(c, -0.1); return `Der bisherige Kapitän ${first(c, other)} fühlt sich übergangen. Die beiden reden nicht mehr miteinander.`; } },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx, rng) => { const other = rng.pick(squad(c).filter((i) => i !== ctx.s && !isCoach(c, i))); return leaveTeam(c, other) ? `${first(c, other)} hat genug vom Starkult und geht.` : 'Ein paar murren.'; } },
        ]),
      },
      {
        label: 'Klartext: Hier ist jeder gleich',
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.08), 'Er knurrt, bleibt aber – und läuft jetzt auch mal zurück.') },
          { w: (c) => (canLose(c) ? 1.5 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? (adjustMood(c, 0.05), 'Er ist weg. Die Stimmung ist trotzdem besser.') : 'Er knurrt, bleibt aber.') },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].grumpy = 3), 'Er bleibt, spielt aber mit angezogener Handbremse.') },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].loyal = true), adjustMood(c, 0.1), 'Er denkt drüber nach und entschuldigt sich vor der ganzen Mannschaft. Großer Moment.') },
          { w: (c) => (canLose(c) && c.flags.derbyRival ? 0.5 : 0), run: (c, ctx) => (joinRival(c, ctx.s, c.flags.derbyRival) ? `${first(c, ctx.s)} wechselt noch am selben Abend zum Derby-Rivalen. Das nächste Derby wird heiß.` : 'Er knurrt.') },
        ]),
      },
      {
        label: 'Kompromiss: Kapitän ja, sonst nichts',
        effect: outcome([
          { w: 3, run: (c, ctx) => ((c.players[ctx.s].grumpy = 1), 'Halb zufrieden. Mal sehen, wie lange.') },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.3), adjustMood(c, 0.03), 'Die Binde tut ihm gut. Er fängt an, sich um die Jungen zu kümmern.') },
          { w: 1, run: (c) => (adjustMood(c, -0.06), 'Der Rest der Truppe findet, der Kompromiss ist ein Einknicken.') },
        ]),
      },
    ],
  },

  sommerfest: {
    weight: 30, // nur an Spieltag 4 möglich – dann fast immer
    needs: (c) => (c.round === 4 && !c.flags.summerfest ? {} : null),
    text: () => 'Sommerfest steht an! Wie groß soll es werden?',
    options: [
      {
        label: 'Richtig groß: Hüpfburg, Grill, Tombola (50 €)',
        effect: outcome([
          {
            w: 3,
            run: (c, ctx, rng) => {
              c.flags.summerfest = true;
              book(c, 'Sommerfest: Hüpfburg & Grill', -50);
              const income = rng.int(80, 170);
              book(c, 'Sommerfest: Einnahmen', income);
              adjustMood(c, 0.15);
              return `Tolles Fest, ${income} € eingenommen.`;
            },
          },
          {
            w: 1,
            run: (c) => {
              c.flags.summerfest = true;
              book(c, 'Sommerfest: Hüpfburg & Grill', -50);
              book(c, 'Sommerfest: Einnahmen', 120);
              const p = getPool().everyone().find((q) => q.tier === 'gut' && !c.clubs.some((x) => x.squad.includes(q.poolIndex)) && q.poolIndex % 7 === c.round);
              if (p && joinSquad(c, p.poolIndex, 'War beim Sommerfest – ich will mitspielen!')) return `120 € eingenommen, und ${p.name} will mitspielen!`;
              return '120 € eingenommen. Und die Hüpfburg hat überlebt.';
            },
          },
          { w: 1, run: (c) => ((c.flags.summerfest = true), book(c, 'Sommerfest: Hüpfburg & Grill', -50), book(c, 'Sommerfest: Einnahmen', 40), adjustMood(c, 0.05), 'Um drei kommt der Regen. 40 € eingenommen, die Hüpfburg schwimmt.') },
          { w: 0.7, run: (c) => ((c.flags.summerfest = true), book(c, 'Sommerfest: Hüpfburg & Grill', -50), book(c, 'Sommerfest: Einnahmen', 210), adjustMood(c, 0.2), 'Das Fest des Jahres. 210 €, und der Bürgermeister hat ein Grußwort gehalten.') },
          { w: 0.5, run: (c) => ((c.flags.summerfest = true), book(c, 'Sommerfest: Hüpfburg & Grill', -50), book(c, 'Sommerfest: Schaden am Grill', -30), adjustMood(c, 0.08), 'Der Grill fängt Feuer. Die Feuerwehr kommt, isst mit und bleibt bis zum Schluss. 30 € Schaden.') },
        ]),
      },
      { label: 'Klein: Grill und Kasten Bier', effect: outcome([{ w: 3, run: (c) => ((c.flags.summerfest = true), book(c, 'Sommerfest (klein)', 30), adjustMood(c, 0.06), 'Gemütlich. 30 € übrig.') }, { w: 1, run: (c) => ((c.flags.summerfest = true), book(c, 'Sommerfest (klein)', 70), adjustMood(c, 0.1), 'Klein, aber fein – und viel mehr Leute als gedacht. 70 € übrig.') }, { w: 1, run: (c) => ((c.flags.summerfest = true), adjustMood(c, 0.02), 'Nach zwei Stunden ist das Bier alle. Plus minus null.') }]) },
      { label: 'Fällt dieses Jahr aus', effect: outcome([{ w: 3, run: (c) => ((c.flags.summerfest = true), adjustMood(c, -0.1), 'Die Spielerfrauen sind enttäuscht.') }, { w: 1, run: (c) => ((c.flags.summerfest = true), adjustMood(c, -0.03), 'Die Spieler organisieren selbst was im Park. Ohne dich.') }, { w: 1, run: (c) => ((c.flags.summerfest = true), adjustMood(c, -0.15), 'Der Derby-Rivale feiert ein riesiges Fest. Alle gehen dahin.') }]) },
    ],
  },

  firmenturnier: {
    weight: 1,
    needs: (c) => (c.sponsors?.length ? { sponsor: c.sponsors[0].name } : null),
    text: (c, ctx) => `${ctx.sponsor} lädt zum Firmen-Kleinfeldturnier am Samstag ein.`,
    options: [
      {
        label: 'Hinfahren und gewinnen',
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, `Turniersieg bei ${ctx.sponsor}`, 40), adjustMood(c, 0.1), 'Turniersieg! 40 € Preisgeld.') },
          { w: 2, run: () => 'Im Halbfinale raus. Aber die Bratwurst war gut.' },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); c.players[s].injuryWeeks = 1; sitOut(c, s); return `Im Finale verdreht sich ${first(c, s)} den Knöchel. Sonntag fehlt er.`; } },
          { w: 1, run: (c, ctx) => (book(c, `Sonderprämie von ${ctx.sponsor}`, 80), adjustMood(c, 0.12), `Turniersieg, und der Chef von ${ctx.sponsor} verdoppelt das Preisgeld: 80 €!`) },
          { w: 0.6, run: (c, ctx) => (adjustMood(c, -0.05), `Ihr verliert gegen die Buchhaltung von ${ctx.sponsor}. Das wird noch lange erzählt.`) },
        ]),
      },
      { label: 'Absagen – Sonntag ist wichtiger', effect: outcome([{ w: 3, run: () => 'Der Sponsor ist etwas enttäuscht.' }, { w: 1, run: (c) => (adjustMood(c, 0.03), 'Der Sponsor versteht es: „Liga geht vor. Gefällt mir."') }, { w: 1, run: (c) => (c.sponsors?.[0] && (c.sponsors[0].weekly = Math.max(1, c.sponsors[0].weekly - 2)), 'Der Sponsor kürzt die Wochenrate um 2 €. „Man sieht sich ja nie."') }]) },
    ],
  },

  schiri_beschwerde: {
    weight: 1,
    needs: (c) => ((c.level ?? 1) > 1 ? {} : null),
    text: () => 'Der Schiri vom letzten Spiel hat sich beim Kreis beschwert: „Unsportliches Meckern".',
    options: [
      { label: 'Offizielle Entschuldigung schreiben', effect: outcome([{ w: 3, run: (c) => (adjustMood(c, -0.03), 'Akzeptiert. Die Jungs finden es peinlich.') }, { w: 1, run: (c) => (adjustMood(c, 0.03), 'Der Schiri antwortet persönlich und kommt mal zum Training als Gast. Netter Kerl.') }, { w: 1, run: (c) => (book(c, 'Verbandsstrafe trotz Entschuldigung', -10), 'Die Entschuldigung kommt an, die Strafe trotzdem: 10 €.') }]) },
      { label: 'Verbandsstrafe zahlen (25 €)', effect: outcome([{ w: 3, run: (c) => (book(c, 'Verbandsstrafe', -25), 'Bezahlt. Einer schlägt vor, das Meckern teurer zu machen.') }, { w: 1, run: (c) => (book(c, 'Verbandsstrafe', -25), adjustMood(c, 0.04), 'Die Mannschaft legt zusammen. Solidarität!') }, { w: 1, run: (c) => (book(c, 'Verbandsstrafe + Gebühr', -40), 'Mit Bearbeitungsgebühr: 40 €. Bürokratie.') }]) },
    ],
  },
};

function addProspect(c, idx) {
  if (!c.youth.prospects.includes(idx)) c.youth.prospects.push(idx);
  c.players[idx] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
}

// --- Mehrwöchige Geschichten ------------------------------------------------------------

// Läuft zu Wochenbeginn: bringt laufende Geschichten weiter.
export function advanceArcs(career) {
  advanceStories(career, createRng((career.seed * 5 + career.season * 71 + career.round * 29 + 1) >>> 0));
  // Gebrochenes Versprechen aus dem Bankfrust?
  const pr = career.flags?.promise;
  if (pr && career.round > pr.round) {
    if ((career.players[pr.idx]?.lastApp ?? -1) < pr.round) {
      adjustMood(career, -0.1);
      if (career.players[pr.idx]) career.players[pr.idx].grumpy = 3;
      if (squad(career).includes(pr.idx)) say(career, pr.idx, 'Versprochen ist versprochen, dachte ich. Egal.', 'Mo 08:15');
    }
    career.flags.promise = null;
  }
}

// Zu Wochenbeginn höchstens ein Ereignis ziehen.
export function rollWeekEvent(career) {
  career.flags ??= {};
  career.eventLog ??= [];
  const rng = createRng((career.seed * 7 + career.season * 131 + career.round * 17 + 3) >>> 0);
  if (career.week.event) return null; // eine Geschichte verlangt schon eine Entscheidung
  if (!rng.chance(EVENT_CHANCE) && !derbyThisWeek(career)) return null; // Derby-Woche kommt immer
  const recent = new Set(career.eventLog.filter((e) => e.season === career.season && career.round - e.round < NO_REPEAT).map((e) => e.id));
  const candidates = [];
  const storySeason = new Set(career.eventLog.filter((e) => e.season === career.season).map((e) => e.id));
  const storiesFull = arcsOf(career).length >= 3;
  for (const [id, ev] of [...Object.entries(EVENTS), ...Object.entries(STORY_STARTS), ...Object.entries(PERSONAL_EVENTS), ...Object.entries(SAGA_EVENTS), ...Object.entries(SOCIAL_EVENTS), ...Object.entries(DERBY_EVENTS)]) {
    if (recent.has(id)) continue;
    if (STORY_STARTS[id] && (storiesFull || storySeason.has(id))) continue; // jede Geschichte höchstens einmal pro Saison
    const ctx = ev.needs(career, rng);
    if (ctx) candidates.push({ id, ev, ctx });
  }
  if (!candidates.length) return null;
  let r = rng.next() * candidates.reduce((s, c) => s + c.ev.weight, 0);
  const chosen = candidates.find((c) => (r -= c.ev.weight) < 0) ?? candidates[0];
  const event = { id: chosen.id, ctx: chosen.ctx, text: chosen.ev.text(career, chosen.ctx), options: chosen.ev.options.map((o) => o.label), choice: null, result: null, story: STORY_STARTS[chosen.id] ? 'Neue Geschichte' : PERSONAL_EVENTS[chosen.id] ? 'Privat' : SAGA_EVENTS[chosen.id] ? 'Vereinsgeschichte' : null };
  career.week.event = event;
  career.eventLog.push({ id: chosen.id, season: career.season, round: career.round });
  if (career.eventLog.length > 40) career.eventLog.shift();
  return event;
}

export function resolveEvent(career, choice) {
  const e = career.week?.event;
  if (!e || e.choice !== null) return null;
  const def = EVENTS[e.id] ?? STORY_STARTS[e.id] ?? PERSONAL_EVENTS[e.id] ?? SAGA_EVENTS[e.id] ?? SOCIAL_EVENTS[e.id] ?? DERBY_EVENTS[e.id] ?? CRISES[e.id] ?? storyDecision(career, e.id);
  const option = def?.options[choice];
  if (!option) return null;
  const rng = createRng((career.seed * 13 + career.round * 7 + choice + e.id.length) >>> 0);
  e.choice = choice;
  e.result = option.effect(career, e.ctx, rng);
  return e.result;
}

// Unbeantwortet bis zum Spieltag? Dann nimmt sich die Gruppe die letzte Option.
export function autoResolve(career) {
  const e = career.week?.event;
  if (e && e.choice === null) resolveEvent(career, e.options.length - 1);
}

