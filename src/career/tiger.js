// Tim „Der Tiger“: der Edelfan, der bei jedem Spiel am Zaun steht (Halbglatze, Vollbart, Bauch, Dose in der Hand).
// Zustand in c.tiger (alte Stände: tigerOf legt ihn an), Ereignisse in TIGER_EVENTS (in events.js an die Wochenauswahl gehängt).
//
// Zustand: loyal (0…1, langsam: wie sehr er zum Verein hält), mood (0…1, kurzfristig: Ergebnisse und deine Antworten),
// away (Wochen, die er dem Zaun fernbleibt – dann fehlt er auch im Bild), role (Fanbeauftragter), story (der lange Brief),
// links (Folge-Ereignisse nach Wochen, an die Wochenzählung wk gebunden – nicht an die Saison), cool (Wartezeit je Ereignis),
// gap (frühestens ab dieser Woche das nächste Tiger-Ereignis), big (der letzte große Auftritt: Kantersieg, Derbysieg, Pokalüberraschung).
// Alles läuft ohne den Zufallsstrom der Simulation: tigerWeek würfelt mit eigenem Samen, die Ereignisse mit dem rng der Wochenauswahl.
//
// Ereignisse (19, davon fünf bevorzugte: vier Folge-Ereignisse und tiger_runde; Wirkungsgrößen wie in localevents.js: Stimmung ±0,02 … 0,12, Kasse ±10 … 60 €):
//   tiger_runde (nach großen Spielen) · tiger_brief → tiger_stammtisch → tiger_urteil (Geschichte über mehrere Spieltage) ·
//   tiger_zurueck (nach einer Pause) · tiger_banner · tiger_gesang · tiger_gegnerfans · tiger_schiri · tiger_tipp → tiger_tipp_ergebnis ·
//   tiger_grill · tiger_heiser · tiger_tdm · tiger_geburtstag · tiger_glueckstrikot · tiger_bus · tiger_schlaf · tiger_fanaktion.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { clubById, humanClub } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { first, outcome } from './outcomes.js';
import { isDerbyFixture } from './derby.js';
import { POKAL_KINDS, pokalOf, tieWinner } from './pokal.js';
import { chronicle } from './sagas.js';
import { ROUND_PRICE } from './pub.js';
import { fixtureOf, level, neighbors, opponentName, rounds, some, squad, supporters, team } from './localevents.js';

export const TIGER_NAME = tr('Tim „Der Tiger“', 'Tim "The Tiger"');
const MAX_SEEN = 12;
const SPAN = 4; // Wochen, in denen ein Folge-Ereignis nach seinem Termin noch kommen darf
const GAP = 4; // zwischen zwei Tiger-Ereignissen vergehen mindestens so viele Wochen (Folge-Ereignisse ausgenommen)

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// --- Zustand -------------------------------------------------------------------------------------

const fresh = () => ({ v: 1, loyal: 0.6, mood: 0.6, away: 0, back: false, role: null, wk: 0, at: '', met: false, gap: 0, cool: {}, links: {}, story: null, storySeason: 0, big: null, streak: { w: 0, l: 0, d: 0 }, seen: [], voice: 0, jersey: null, bday: 0 });

// Stand holen oder anlegen; alte Spielstände ohne Tiger bekommen die Vorgaben (und fehlende Felder werden ergänzt).
export function tigerOf(c) {
  const base = fresh();
  if (!c.tiger || typeof c.tiger !== 'object') c.tiger = base;
  else for (const k of Object.keys(base)) if (c.tiger[k] === undefined) c.tiger[k] = base[k];
  return c.tiger;
}
export const initTiger = (c) => void tigerOf(c);

// Stimmung und Treue verschieben; die Treue folgt der Stimmung ein Stück (dl).
export function tigerShift(c, dm, dl = dm * 0.4) {
  const t = tigerOf(c);
  t.mood = clamp01(t.mood + dm);
  t.loyal = clamp01(t.loyal + dl);
}
const mood = (c) => tigerOf(c).mood;
export const tigerMoodLabel = (c) => {
  const m = tigerOf(c).mood;
  return m >= 0.75 ? tr('feiert', 'celebrating') : m >= 0.5 ? tr('zufrieden', 'content') : m >= 0.3 ? tr('grummelt', 'grumbling') : tr('sauer', 'furious');
};

// Fehlt Tim in dieser Woche am Zaun?
export const tigerAway = (c) => tigerOf(c).away > 0;
const stay = (c, weeks) => {
  const t = tigerOf(c);
  t.away = Math.max(t.away, weeks);
  t.back = false;
};

// --- Wochenlauf: Ergebnisse verarbeiten (einmal je Woche, idempotent) --------------------------------

// Das eigene Ligaspiel der Vorwoche.
function lastGame(c) {
  const me = humanClub(c).id;
  const f = c.fixtures?.[c.round - 1]?.find((x) => (x.home === me || x.away === me) && x.result);
  if (!f) return null;
  const home = f.home === me;
  const gf = home ? f.result.home : f.result.away;
  const ga = home ? f.result.away : f.result.home;
  return { gf, ga, home, opp: clubById(c, home ? f.away : f.home)?.name ?? '', derby: isDerbyFixture(c, f) };
}
export const lastScore = (c) => {
  const g = lastGame(c);
  return g ? `${g.gf}:${g.ga}` : null;
};

// Pokalspiele, die Tim noch nicht gesehen hat: Überraschung = Sieg gegen einen höherklassigen Gegner (überregional immer).
function cupNews(c, t) {
  const me = humanClub(c).id;
  let news = null;
  for (const kind of POKAL_KINDS) {
    const cup = pokalOf(c, kind);
    if (!cup) continue;
    for (const tie of cup.ties ?? []) {
      if (!tie.result || (tie.home !== me && tie.away !== me)) continue;
      const key = `${kind}${c.season}.${tie.round}`;
      if (t.seen.includes(key)) continue;
      t.seen.push(key);
      if (t.seen.length > MAX_SEEN) t.seen.shift();
      const won = tieWinner(tie) === me;
      const oppId = tie.home === me ? tie.away : tie.home;
      const upset = won && (kind === 'bund' || (cup.levels?.[oppId] ?? 0) > (c.level ?? 1));
      if (won) tigerShift(c, 0.05);
      else tigerShift(c, -0.03);
      if (upset) news = { kind: 'cup', score: tie.home === me ? `${tie.result.home}:${tie.result.away}` : `${tie.result.away}:${tie.result.home}`, opp: kind === 'bund' ? tr('den Profiverein', 'the professional side') : tr('den Favoriten', 'the favourites') };
    }
  }
  return news;
}

const CHAT = {
  intro: tr(
    ['<b>Tim „Der Tiger“</b> (Edelfan, seit 1998 kein Heimspiel verpasst) steht schon am Zaun: Halbglatze, Vollbart, Dose in der Hand. „Ich bin dann mal da.“'],
    ['<b>Tim "The Tiger"</b> (diehard fan, not missed a home game since 1998) is already at the fence: receding hairline, full beard, can in hand. "I\'m here, then."'],
  ),
  win: tr(
    ['Das war mein Spiel! Okay, ihr habt auch ein bisschen mitgeholfen.', 'Hab ich doch gesagt. Im Gefühl und im Kreuz.', 'Drei Punkte. Und das Bier schmeckt heute auch noch besser.', 'Ich hab die zweite Halbzeit nicht geatmet. Aber egal: SIEG!', 'Heute hat sogar die Dose gejubelt.', 'Wer Tiger sagt, muss auch Tor sagen. Gut gemacht, Jungs.'],
    ['That was my game! Well, you helped a bit too.', 'Told you so. In my gut and in my back.', 'Three points. And the beer tastes even better today.', 'I did not breathe all second half. But who cares: WIN!', 'Even the can cheered today.', 'Say Tiger, say goal. Well done, lads.'],
  ),
  big: tr(
    ['KANTERSIEG! Ich bin heiser, ich bin glücklich, ich bin ... heiser.', 'Davon erzähl ich noch meinen Enkeln. Ich hab keine. Aber ich such mir welche.', 'Heute geb ich einen aus! Ich weiß nur noch nicht, was.'],
    ['THRASHING! I am hoarse, I am happy, I am ... hoarse.', 'I will tell my grandchildren about this. I have none. But I will find some.', 'Today I am buying a round! I just don\'t know what yet.'],
  ),
  loss: tr(
    ['Das muss anders werden, Trainer. Ich sag nur: Sechser. Ich sag nur: Raute.', 'Ich geh jetzt eine Runde um den Platz. Allein. Mit Bier.', 'Nächste Woche gewinnen wir. Muss ja. Ich hab extra Urlaub genommen.', 'Nicht schlimm. Ich hab schon Schlimmeres gesehen – 2009, gegen Hohenfels.', 'Die Mannschaft kann nix dafür. Der Rasen war schief.', 'Der Schiri hat sein Pfeifchen im falschen Moment verschluckt.'],
    ['This has to change, gaffer. All I am saying: holding midfielder. All I am saying: diamond.', 'I am going for a walk round the pitch now. Alone. With beer.', 'Next week we win. We have to. I took the day off specially.', 'Not that bad. I have seen worse – 2009, against Hohenfels.', 'The team is not to blame. The pitch was crooked.', 'The ref swallowed his whistle at the wrong moment.'],
  ),
  draw: tr(
    ['Unentschieden – weder Fisch noch Fleisch. Wie alkoholfreies Bier.', 'Ein Punkt ist ein Punkt. Hab ich meiner Frau auch gesagt.', 'Hätte, hätte, Fahrradkette. Aber ihr wisst, was ich meine.', 'Ich hab es kommen sehen. Also, nicht gesehen. Aber gespürt.'],
    ['A draw – neither fish nor fowl. Like alcohol-free beer.', 'A point is a point. I told my wife the same.', 'Woulda, coulda, shoulda. But you know what I mean.', 'I saw it coming. Well, not saw. But felt it.'],
  ),
  away: tr(
    ['Am Zaun ist es seltsam leer. Wo ist eigentlich Tim „Der Tiger“?', 'Die Dose fehlt am Zaun. Und der Mann dazu.'],
    ['The fence looks strangely empty. Where is Tim "The Tiger", anyway?', 'The can is missing at the fence. And the man holding it.'],
  ),
  voice: tr(['Tim flüstert vom Zaun: „Wenn ich könnte, würde ich brüllen.“ Er kann nicht.'], ['Tim whispers from the fence: "If I could, I would roar." He can\'t.']),
};

function tigerChat(c, t, g, rng) {
  const chat = c.week?.chat;
  if (!chat) return;
  const push = (text) => chat.push({ from: null, text, time: rng.pick(['Mo 07:50', 'Mo 08:20', 'Mo 19:05']), tiger: true });
  const say = (text) => push(`<b>${TIGER_NAME}</b>: ${tr(`„${text}“`, `"${text}"`)}`);
  if (!t.met) {
    t.met = true;
    return push(CHAT.intro[0]);
  }
  if (t.away > 0) return rng.chance(0.3) ? push(rng.pick(CHAT.away)) : undefined;
  if (!g || !rng.chance(0.4)) return;
  if (t.voice > 0) return push(CHAT.voice[0]);
  if (t.big && t.big.wk === t.wk) return say(rng.pick(CHAT.big));
  say(rng.pick(g.gf > g.ga ? CHAT.win : g.gf < g.ga ? CHAT.loss : CHAT.draw));
}

// Läuft zu Wochenbeginn (career.js startWeek, vor der Ereigniswahl): verarbeitet das Spiel der Vorwoche, zählt die Pause herunter.
export function tigerWeek(c) {
  const t = tigerOf(c);
  const key = `${c.season}:${c.round}`;
  if (t.at === key || !c.week) return;
  t.at = key;
  t.wk++;
  const rng = createRng((c.seed * 83 + c.season * 211 + c.round * 19 + 17) >>> 0);
  // Pause herunterzählen; wer zurückkommt, wird ein Ereignis (tiger_zurueck).
  if (t.away > 0 && --t.away === 0) t.back = true;
  if (t.voice > 0) t.voice--;
  const g = lastGame(c);
  if (g) {
    const win = g.gf > g.ga;
    const draw = g.gf === g.ga;
    t.streak = { w: win ? t.streak.w + 1 : 0, l: !win && !draw ? t.streak.l + 1 : 0, d: draw ? t.streak.d + 1 : 0 };
    tigerShift(c, win ? 0.06 : draw ? 0 : -0.07, win ? 0.02 : draw ? 0 : -0.02);
    if (win && (g.gf - g.ga >= 3 || g.derby || g.gf >= 5)) t.big = { kind: g.derby ? 'derby' : 'win', score: `${g.gf}:${g.ga}`, opp: g.opp, wk: t.wk };
    if (t.story) {
      t.story.pts += win ? 3 : draw ? 1 : 0;
      t.story.n++;
    }
    if (t.jersey === 'gewaschen' && !win && !draw) {
      t.jersey = null;
      tigerShift(c, -0.06, -0.03);
      if (c.week.chat) c.week.chat.push({ from: null, text: tr(`<b>${TIGER_NAME}</b>: „Hab ich gesagt: Trikot gewaschen, Glück weggespült.“`, `<b>${TIGER_NAME}</b>: "Told you: shirt washed, luck washed away."`), time: 'Mo 08:05', tiger: true });
    } else if (t.jersey === 'gewaschen' && win) t.jersey = null;
  }
  const cup = cupNews(c, t);
  if (cup) t.big = { ...cup, wk: t.wk };
  if (t.big && t.big.wk < t.wk - 1) t.big = null; // der große Auftritt gilt nur für die Woche danach
  // Treue und Stimmung finden langsam zueinander (Stimmung klingt Richtung Treue ab).
  t.mood = clamp01(t.mood + (t.loyal - t.mood) * 0.15);
  t.loyal = clamp01(t.loyal + (t.mood - t.loyal) * 0.03);
  // Abgelaufene Folge-Ereignisse und eine liegengebliebene Geschichte räumen sich auf.
  for (const [id, l] of Object.entries(t.links)) if (t.wk > l.due + SPAN) delete t.links[id];
  if (t.story && !Object.keys(t.links).some((id) => t.links[id].story)) t.story = null;
  tigerChat(c, t, g, rng);
}

// --- Auftritt im Spiel -----------------------------------------------------------------------------------

// Steht Tim bei diesem Spiel am Rand? Daheim immer (außer in einer Pause), auswärts nach Treue (Fanbeauftragter: immer).
// Eigener Würfel aus Saison und Spieltag, kein Strom der Simulation.
export function tigerAtMatch(c, { home = true } = {}) {
  const t = tigerOf(c);
  if (t.away > 0) return false;
  if (home || t.role === 'fanbeauftragter') return true;
  return createRng((c.seed * 29 + c.season * 71 + c.round * 13 + 5) >>> 0).chance(0.35 + 0.5 * t.loyal);
}

// Legt die Angaben für die Darstellung an das Spiel (nur für die Ansicht; die Simulation liest sie nicht).
export function tigerForMatch(c, match, { home = true } = {}) {
  if (!match || match.humanTeam == null || !tigerAtMatch(c, { home })) return null;
  const t = tigerOf(c);
  match.tiger = { team: match.humanTeam, home, mood: Math.round(t.mood * 100) / 100, hoarse: t.voice > 0, shirt: humanClub(c).kit?.shirt ?? 0xc0392b };
  return match.tiger;
}

// --- Bausteine für die Ereignisse ---------------------------------------------------------------------

// Auch ein gezeigtes, noch unbeantwortetes Tiger-Ereignis zählt für den Abstand (Ereignisprotokoll der Wochenauswahl).
const recentTiger = (c) => (c.eventLog ?? []).some((e) => e.season === c.season && c.round - e.round < GAP && e.id.startsWith('tiger_'));
const ready = (c, gap = true) => {
  const t = tigerOf(c);
  return t.away === 0 && t.wk >= 3 && (!gap || (t.wk >= t.gap && !recentTiger(c))) && c.round >= 1; // erst nach ein paar Wochen kennt man Tim
};
const cooled = (c, id) => tigerOf(c).wk >= (tigerOf(c).cool[id] ?? 0);
const isAwayThisWeek = (c) => fixtureOf(c)?.away === humanClub(c).id;
const home = (c) => !isAwayThisWeek(c);

// Eigenständiges Ereignis: Wartezeit je Ereignis, Mindestabstand zum nächsten Tiger-Ereignis, nur wenn Tim da ist.
function tigerEvent(id, def, { cool = 14, gap = true } = {}) {
  return {
    ...def,
    needs: (c, rng) => (ready(c, gap) && cooled(c, id) ? def.needs(c, rng) : null),
    options: def.options.map((o) => ({
      ...o,
      effect: (c, ctx, rng) => {
        const t = tigerOf(c);
        t.cool[id] = t.wk + cool;
        t.gap = t.wk + GAP;
        def.done?.(c, ctx);
        return o.effect(c, ctx, rng);
      },
    })),
  };
}

// Folge-Ereignis: kommt, wenn sein Termin (Woche wk) da ist; die Entscheidung beendet den Faden.
const link = (c, id) => {
  const t = tigerOf(c);
  const l = t.links[id];
  return l && t.wk >= l.due && t.wk <= l.due + SPAN ? l : null;
};
const startLink = (c, id, delay, data = {}) => {
  const t = tigerOf(c);
  t.links[id] = { due: t.wk + delay, ...data };
};
function tigerFollow(id, def) {
  return {
    ...def,
    weight: 1,
    followUp: true,
    options: def.options.map((o) => ({
      ...o,
      effect: (c, ctx, rng) => {
        delete tigerOf(c).links[id];
        def.done?.(c, ctx);
        return o.effect(c, ctx, rng);
      },
    })),
  };
}
// Gibt es ein fälliges Folge-Ereignis? Dann kommt es diese Woche sicher (siehe rollWeekEvent).
export function tigerChainDue(c) {
  const t = tigerOf(c);
  if (t.away > 0 || !c.week) return false;
  return Object.keys(t.links).some((id) => link(c, id)) || t.back; // Runde und Geburtstag haben Vorrang, erzwingen aber keine Ereigniswoche
}

const pickPlayer = (c, rng) => {
  const [s] = some(c, rng, 1);
  return s ?? null;
};
const nameOf = (c, s, fallback) => (s != null ? first(c, s) : fallback);
const theke = (c, n) => book(c, tr('Theke: Tims Runde', 'Bar: Tim\'s round'), Math.round(n * ROUND_PRICE));
const club = (c) => humanClub(c).name;

// Tims Tipp für das Wochenspiel: immer optimistisch, fest aus Saison und Spieltag.
const TIPS = [[2, 0], [3, 1], [2, 1], [3, 0], [4, 1], [2, 0]];
const tipFor = (c) => TIPS[(c.seed + c.season * 7 + c.round * 3) % TIPS.length];
const birthdayRound = (c) => 2 + ((c.seed >>> 3) % Math.max(1, rounds(c) - 5));

// ================================================================================================
export const TIGER_EVENTS = {
  // === Nach großen Spielen: Tim schmeißt eine Runde ====================================================
  tiger_runde: tigerEvent(
    'tiger_runde',
    {
      weight: 9,
      followUp: true, // der große Auftritt gilt nur für die Woche danach
      needs: (c) => {
        const b = tigerOf(c).big;
        return b ? { kind: b.kind, score: b.score, opp: b.opp } : null;
      },
      done: (c) => (tigerOf(c).big = null),
      text: (c, ctx) =>
        ctx.kind === 'derby'
          ? tr(`Derbysieg, ${ctx.score}! Tim „Der Tiger“ hängt über der Theke im Vereinsheim, hat die Dose gegen ein Weizenglas getauscht und ruft über die Theke: „Die Runde geht auf mich! Heute zahl ich – morgen vielleicht nicht mehr.“`, `Derby win, ${ctx.score}! Tim "The Tiger" is hanging over the bar in the clubhouse, has swapped the can for a wheat-beer glass and shouts over the counter: "This round is on me! I pay today – tomorrow maybe not."`)
          : ctx.kind === 'cup'
            ? tr(`Pokalüberraschung gegen ${ctx.opp}, ${ctx.score}! Tim „Der Tiger“ steht auf einem Bierkasten und singt allein den Schlachtruf. „Eine Runde für alle! Ich hab das schon seit der Auslosung gewusst!“`, `Cup upset against ${ctx.opp}, ${ctx.score}! Tim "The Tiger" is standing on a beer crate singing the battle cry all by himself. "A round for everyone! I knew it from the draw!"`)
            : tr(`${ctx.score} gegen ${ctx.opp}! Tim „Der Tiger“ ist so glücklich, dass er die Dose vergessen hat. Er legt einen Zwanziger auf die Theke: „Die Runde geht auf mich. Aber nur, wenn alle mittrinken!“`, `${ctx.score} against ${ctx.opp}! Tim "The Tiger" is so happy he forgot his can. He puts a twenty on the bar: "This round is on me. But only if everyone drinks along!"`),
      options: [
        {
          label: tr('Annehmen – die ganze Mannschaft trinkt mit', 'Accept – the whole squad drinks along'),
          effect: outcome([
            { w: 3, run: (c) => (theke(c, squad(c).length + 4), adjustMood(c, 0.1), team(c, -0.12), tigerShift(c, 0.12), tr('Ein langer Abend: Tim zahlt, der Wirt zapft, der Torwart singt. Am Dienstag ist das Training eine Wanderung.', 'A long evening: Tim pays, the landlord taps, the keeper sings. On Tuesday training is more of a hike.')) },
            { w: 1.5, run: (c) => (theke(c, squad(c).length), book(c, tr('Tims Deckel (Rest)', 'Tim\'s tab (the rest)'), -15), adjustMood(c, 0.06), team(c, -0.08), tigerShift(c, 0.06), tr('Nach der dritten Runde stellt Tim fest, dass sein Zwanziger nur für zwei reicht. „Schreibt es an“, sagt er. Ihr schreibt es an – bei euch.', 'After the third round Tim realises his twenty only covers two. "Put it on the slate," he says. You put it on the slate – yours.')) },
            { w: 1, run: (c, ctx, rng) => { theke(c, squad(c).length + 2); adjustMood(c, 0.12); tigerShift(c, 0.14); const s = pickPlayer(c, rng); if (s != null) adjustForm(c, s, -0.25); return tr(`Um elf stimmt ${nameOf(c, s, 'einer')} auf dem Tisch „You'll Never Walk Alone“ an. Der Chor kann es nicht. Es ist wunderschön.`, `At eleven ${nameOf(c, s, 'someone')} climbs on a table and starts "You'll Never Walk Alone". The choir cannot sing it. It is beautiful.`); } },
          ]),
        },
        {
          label: tr('Die Runde auf den Verein drehen (20 €)', 'Turn it into the club\'s round (€20)'),
          effect: outcome([
            { w: 3, run: (c) => (book(c, tr('Runde für Tim und die Mannschaft', 'Round for Tim and the squad'), -20), adjustMood(c, 0.12), tigerShift(c, 0.16), tr('„Der Verein zahlt?“, flüstert Tim. Zum ersten Mal an diesem Abend ist er sprachlos. Dann hebt er das Glas auf die „Mannschaft, den Verein, und das Wetter“.', '"The club is paying?" whispers Tim. For the first time tonight he is speechless. Then he raises his glass to "the team, the club and the weather".')) },
            { w: 1, run: (c) => (book(c, tr('Runde für Tim und die Mannschaft', 'Round for Tim and the squad'), -20), adjustMood(c, 0.08), supporters(c, 1), tigerShift(c, 0.12), tr('Tim ist so gerührt, dass er sofort in den Förderverein eintritt. Mit Beitrag und Handschlag.', 'Tim is so moved that he joins the supporters\' club on the spot. Fee and handshake included.')) },
          ]),
        },
        {
          label: tr('Nur Limo und Würstchen – morgen ist Training', 'Just lemonade and sausages – training tomorrow'),
          effect: outcome([
            { w: 2, run: (c) => (adjustMood(c, 0.04), team(c, 0.05), tigerShift(c, -0.03), tr('Tim nimmt es sportlich: „Auch Limo kann man feiern.“ Er feiert sie mit so viel Hingabe, dass es peinlich wird.', 'Tim takes it sportingly: "You can celebrate with lemonade too." He does it with so much dedication it gets embarrassing.')) },
            { w: 1, run: (c) => (adjustMood(c, 0.02), team(c, 0.08), tigerShift(c, -0.08), tr('Tim starrt auf die Limo. „Das ist kein Bier“, sagt er langsam. „Das ist ein Missverständnis.“ Er zieht gekränkt ab, die Mannschaft trainiert dafür wie die Weltmeister.', 'Tim stares at the lemonade. "That is not beer," he says slowly. "That is a misunderstanding." He leaves offended, the squad trains like world champions.')) },
          ]),
        },
      ],
    },
    { cool: 6, gap: false },
  ),

  // === Die lange Geschichte: der Brief des Tigers (Brief → Stammtisch → Urteil) ============================
  tiger_brief: tigerEvent(
    'tiger_brief',
    {
      weight: 6,
      needs: (c) => {
        const t = tigerOf(c);
        const quiet = t.streak.l + t.streak.d >= 1 || t.mood < 0.5;
        return c.round >= 2 && c.round <= rounds(c) - 4 && !t.story && t.storySeason !== c.season && quiet ? { loyal: t.loyal } : null;
      },
      text: () => tr('Im Kreisblatt steht ein Leserbrief. Überschrift: „Wer stellt hier eigentlich auf?“ Unterzeichnet mit „T. aus dem Block hinterm Tor, Edelfan seit 1998“. Der Brief fordert dreimal „die Raute“, zweimal „mehr Dampf auf den Flügeln“ und einmal, dass der Trainer „sich mal das Spiel anschauen soll, nicht nur die Tabelle“. Jeder weiß, wer T. ist.', 'There is a letter to the editor in the district paper. Headline: "Who actually picks the team here?" Signed "T. from the end behind the goal, diehard fan since 1998". The letter demands "the diamond" three times, "more steam on the wings" twice and once that the manager "should watch the game, not just the table". Everybody knows who T. is.'),
      options: [
        {
          label: tr('Zum Stammtisch einladen (Runde 10 €)', 'Invite him to the regulars\' table (round €10)'),
          effect: outcome([
            { w: 3, run: (c) => (book(c, tr('Stammtisch mit Tim', 'Regulars\' table with Tim'), -10), openStory(c, 'listen', 2), tigerShift(c, 0.08), tr('Tim kommt in seinem besten Vereinsschal und mit drei Bierdeckeln voller Skizzen. „Ich wollte nie kritisieren“, sagt er. „Ich wollte nur, dass ihr’s besser macht.“', 'Tim arrives in his best club scarf with three beer mats full of sketches. "I never wanted to criticise," he says. "I just wanted you to do it better."')) },
            { w: 1, run: (c) => (book(c, tr('Stammtisch mit Tim', 'Regulars\' table with Tim'), -10), openStory(c, 'listen', 2), tigerShift(c, 0.05), supporters(c, 1), tr('Der Stammtisch hört zu und nickt, bis die Hälfte ihm zustimmt. Einer tritt zur Feier in den Förderverein ein.', 'The regulars\' table listens and nods until half of them agree with him. One joins the supporters\' club to celebrate.')) },
          ]),
        },
        {
          label: tr('Zum Training einladen – er soll selbst sehen, wie es läuft', 'Invite him to training – let him see how it goes'),
          effect: outcome([
            { w: 2, run: (c) => (openStory(c, 'training', 2), team(c, 0.06), tigerShift(c, 0.07), tr('Tim kommt in Jeans und Hallenschuhen von 1996. Nach zehn Minuten schnauft er wie ein Walross, hat aber erstaunlich gute Ideen zu den Laufwegen. Die Jungs pressen ihm zuliebe.', 'Tim turns up in jeans and indoor shoes from 1996. After ten minutes he wheezes like a walrus but has surprisingly good ideas about runs. The lads press for his benefit.')) },
            { w: 1.5, run: (c) => (openStory(c, 'training', 2), adjustMood(c, 0.05), tigerShift(c, 0.05), tr('Beim Dehnen zieht er sich die Wade. „Das ist die Dose, die zieht“, klagt er. Seitdem redet er nur noch von „Verantwortung“ und „Pausen“ – und von Respekt.', 'He pulls a calf while stretching. "It\'s the can pulling," he complains. Since then he only talks about "responsibility" and "rest" – and respect.')) },
          ]),
        },
        {
          label: tr('Ihm ein Amt geben: Fanbeauftragter', 'Give him a job: fan liaison officer'),
          effect: outcome([
            { w: 3, run: (c) => (openStory(c, 'amt', 4, 2), (tigerOf(c).role = 'fanbeauftragter'), tigerShift(c, 0.18), adjustMood(c, 0.04), tr('Tim bekommt eine Armbinde, eine Visitenkarte und den Schlüssel zum Fanschrank. „Ich bin sprachlos“, sagt er. Es hält zwei Sekunden.', 'Tim gets an armband, a business card and the key to the supporters\' cupboard. "I am speechless," he says. It lasts two seconds.')) },
            { w: 1, run: (c) => (openStory(c, 'amt', 4, 2), (tigerOf(c).role = 'fanbeauftragter'), tigerShift(c, 0.14), supporters(c, 1), tr('Kaum im Amt, verteilt Tim Visitenkarten an die Gästefans. Eine Familie meldet sich zur Mitgliedschaft an.', 'Barely in the job, Tim hands business cards to the away fans. One family signs up as members.')) },
          ]),
        },
        {
          label: tr('Ignorieren – morgen ist der Brief Fischpapier', 'Ignore it – tomorrow the letter is chip paper'),
          effect: outcome([
            { w: 2, run: (c) => (openStory(c, 'ignore', 2, -1), tigerShift(c, -0.1), tr('Tim bekommt Wind davon. Seit Sonntag steht er demonstrativ auf der Gegengerade, Arme verschränkt, Dose fest im Griff.', 'Tim gets wind of it. Since Sunday he stands demonstratively on the far side, arms crossed, can gripped tight.')) },
            { w: 1, run: (c) => (openStory(c, 'ignore', 2, -1), tigerShift(c, -0.14), adjustMood(c, -0.03), tr('Der zweite Leserbrief kommt schon am Donnerstag. Diesmal mit Skizze. Und mit dem Satz: „Wer nicht hören will ...“', 'The second letter arrives by Thursday. This time with a sketch. And with the sentence: "Those who won\'t listen ..."')) },
          ]),
        },
      ],
    },
    { cool: 20 },
  ),

  tiger_stammtisch: tigerFollow('tiger_stammtisch', {
    needs: (c) => {
      const l = link(c, 'tiger_stammtisch');
      return l ? { path: l.path } : null;
    },
    text: (c, ctx) =>
      ctx.path === 'listen'
        ? tr('Der Stammtisch im Vereinsheim. Tim hat die Bierdeckel ausgebreitet: drei Systeme, zwei Pfeile und eine Skizze, die aussieht wie ein Hund. „Das ist der Sechser“, sagt er und tippt auf den Hund. Der Wirt hört mit offenem Mund zu, der Rest mit geschlossenem.', 'The regulars\' table in the clubhouse. Tim has spread out his beer mats: three systems, two arrows and a sketch that looks like a dog. "That is the holding midfielder," he says, tapping the dog. The landlord listens with his mouth open, everyone else with theirs shut.')
        : ctx.path === 'training'
          ? tr('Nach dem Training sitzt Tim auf der Bank und kühlt die Wade mit einer Bierdose. „Ich hab was gesehen“, sagt er. „Euer Linksaußen läuft nur nach vorn, nie zurück. Das merkt man von draußen. Von innen merkt man das nicht.“', 'After training Tim sits on the bench cooling his calf with a beer can. "I saw something," he says. "Your left winger only runs forward, never back. You can see it from outside. From inside you can\'t."')
          : tr('Tim steht jetzt jeden Sonntag auf der Gegengerade, Arme verschränkt, und telefoniert laut mit seinem Kumpel Jürgen über „Trainerentscheidungen, die man nicht mehr verstehen muss“. Der Wirt bittet dich, das mit dem Zaun zu klären.', 'Tim now stands on the far side every Sunday, arms crossed, loudly phoning his mate Jurgen about "managerial decisions that no longer need to be understood". The landlord asks you to sort things out at the fence.'),
    options: [
      {
        label: tr('Ernsthaft zuhören und eine Idee von ihm ausprobieren', 'Listen properly and try one of his ideas'),
        effect: outcome([
          { w: 2, run: (c, ctx, rng) => { const s = pickPlayer(c, rng); if (s != null) adjustForm(c, s, 0.3); stance(c, 1); startLink(c, 'tiger_urteil', 3, { story: true }); tigerShift(c, 0.1); return tr(`Tims Tipp: ${nameOf(c, s, 'der Rechtsverteidiger')} soll öfter nach vorn gehen. Im Training klappt es tatsächlich. Tim sagt „Hab ich gesagt“ siebenmal in einer Minute.`, `Tim's tip: ${nameOf(c, s, 'the right-back')} should push forward more. In training it actually works. Tim says "Told you" seven times in a minute.`); } },
          { w: 1.5, run: (c) => (stance(c, 1), startLink(c, 'tiger_urteil', 3, { story: true }), team(c, -0.08), adjustMood(c, 0.04), tigerShift(c, 0.08), tr('Die Idee mit der Dreierkette klappt im Training gar nicht, die Jungs laufen sich gegenseitig um. Tim ist trotzdem stolz: „Man muss ja mal was probieren.“', 'The three-at-the-back idea does not work in training at all, the lads keep running into each other. Tim is proud anyway: "You have to try something."')) },
          { w: 1, run: (c) => (stance(c, 1), startLink(c, 'tiger_urteil', 3, { story: true }), tigerShift(c, 0.06), tr('Ihr probiert nichts davon aus, aber ihr hört zu. Allein das ist für Tim neu.', 'You try none of it, but you listen. That alone is new for Tim.')) },
        ]),
      },
      {
        label: tr('Danken, aber klarmachen: Aufgestellt wird im Verein, nicht am Zaun', 'Thank him, but make clear: the team is picked at the club, not at the fence'),
        effect: outcome([
          { w: 2, run: (c) => (stance(c, 0), startLink(c, 'tiger_urteil', 3, { story: true }), tigerShift(c, 0.02), tr('Tim nickt langsam. „Verstanden. Ich bin der Fan. Ich darf lauter sein, nicht klüger.“ Er sagt es ohne Bitterkeit – fast.', 'Tim nods slowly. "Understood. I\'m the fan. I may be louder, not smarter." He says it without bitterness – almost.')) },
          { w: 1.5, run: (c) => (stance(c, 0), startLink(c, 'tiger_urteil', 3, { story: true }), tigerShift(c, -0.06), tr('Tim schaut in sein Glas. „Das hat mir noch keiner so deutlich gesagt“, brummt er. Er geht früh heim, die Dose bleibt halb voll auf dem Tisch.', 'Tim looks into his glass. "Nobody has put it that plainly before," he mutters. He goes home early, the can left half full on the table.')) },
        ]),
      },
      {
        label: tr('Ihm das Amt des Fanbeauftragten anbieten', 'Offer him the job of fan liaison officer'),
        effect: outcome([
          { w: 3, run: (c) => (setRole(c), stance(c, 2), startLink(c, 'tiger_urteil', 3, { story: true }), tigerShift(c, 0.2), supporters(c, 1), tr('Tims Augen werden feucht. „Fanbeauftragter“, sagt er, „das klingt ja fast wie Vorstand.“ Ihm fällt auf, dass er sich dann auch mal rasieren müsste. Er verwirft den Gedanken.', 'Tim\'s eyes go moist. "Fan liaison officer," he says, "that sounds almost like the board." It occurs to him he might have to shave then. He drops the thought.')) },
          { w: 1, run: (c) => (setRole(c), stance(c, 2), startLink(c, 'tiger_urteil', 3, { story: true }), tigerShift(c, 0.16), adjustMood(c, 0.05), tr('Er nimmt sofort an – und lässt sich dafür gleich Visitenkarten drucken. Mit Tiger-Pfote.', 'He accepts immediately – and has business cards printed at once. With a tiger paw.')) },
        ]),
      },
      {
        label: tr('Abwimmeln – du hast leider einen Termin', 'Fob him off – you have an appointment, sadly'),
        effect: outcome([
          { w: 2, run: (c) => (stance(c, -2), startLink(c, 'tiger_urteil', 3, { story: true }), tigerShift(c, -0.12), tr('Tim sieht dir nach, wie du das Vereinsheim verlässt. „Termin“, murmelt er. „Sonntagnachmittag ist der einzige Termin, den ich kenne.“', 'Tim watches you leave the clubhouse. "Appointment," he mutters. "Sunday afternoon is the only appointment I know."')) },
          { w: 1, run: (c) => (stance(c, -2), startLink(c, 'tiger_urteil', 3, { story: true }), tigerShift(c, -0.16), adjustMood(c, -0.03), tr('Der Stammtisch hat alles mitbekommen. Zwei Rentner schütteln den Kopf, einer stellt dir das Bier hin, ohne dich anzusehen.', 'The regulars saw everything. Two pensioners shake their heads, one puts your beer down without looking at you.')) },
        ]),
      },
    ],
  }),

  tiger_urteil: tigerFollow('tiger_urteil', {
    needs: (c) => {
      const l = link(c, 'tiger_urteil');
      if (!l) return null;
      const s = tigerOf(c).story;
      const ppg = s && s.n ? s.pts / s.n : 1.3;
      return { res: ppg >= 1.7 ? 'good' : ppg <= 0.9 ? 'bad' : 'mid', st: (s?.stance ?? 0) >= 1 ? 'hi' : (s?.stance ?? 0) <= -1 ? 'lo' : 'mid', pts: s?.pts ?? 0, n: s?.n ?? 0 };
    },
    text: (c, ctx) => {
      const head = tr(`Seit Tims Brief hat die Mannschaft ${ctx.pts} Punkte aus ${ctx.n} Spielen geholt. `, `Since Tim's letter the team has taken ${ctx.pts} points from ${ctx.n} games. `);
      if (ctx.res === 'good') return head + tr('Tim kommt mit zerknittertem Zettel ins Vereinsheim. „Ich muss etwas sagen“, beginnt er. „Ich hab mich geirrt. Also, nicht komplett. Zu neunzig Prozent.“', 'Tim comes into the clubhouse with a crumpled slip of paper. "I have to say something," he begins. "I was wrong. Well, not completely. Ninety per cent."');
      if (ctx.res === 'bad') return ctx.st === 'lo' ? head + tr('Tim steht an der Tür, Mütze in der Hand. „Ich hab gesagt, was ich sagen musste. Jetzt brauch ich Abstand.“ Der Wirt hat die Dose, die er stehen gelassen hat, schon beiseitegestellt.', 'Tim stands at the door, cap in hand. "I said what I had to say. Now I need distance." The landlord has already put aside the can he left behind.') : head + tr('Tim sitzt an seinem Stammplatz und rührt in seinem Glas. „Läuft nicht, was?“, sagt er. „Aber ich hab euch nie hängen lassen. Ich fang jetzt auch nicht damit an.“', 'Tim sits at his usual spot stirring his glass. "Not going well, is it?" he says. "But I never let you down. I\'m not starting now."');
      return head + tr('Tim hat sich eine Meinung gebildet und sie in Stichpunkte aufgeteilt: „Erstens ...“ Du kommst bis „Fünftens“, dann holt der Wirt ein neues Fass.', 'Tim has formed an opinion and split it into bullet points: "First ..." You get as far as "fifth", then the landlord fetches a new barrel.');
    },
    options: [
      urteilOption(tr('Handschlag vor der ganzen Mannschaft', 'Handshake in front of the whole squad'), tr('Der Handschlag dauert etwas länger als nötig, die Mannschaft klatscht. ', 'The handshake lasts longer than necessary, the squad applauds. '), 0.03),
      urteilOption(tr('Gemeinsam ein Bier am Zaun – aber nur eins', 'A beer together at the fence – but only one'), tr('Ihr stoßt am Zaun an, die Dose gegen dein Glas. ', 'You clink at the fence, his can against your glass. '), 0),
      urteilOption(tr('Thema abhaken, Blick auf Sonntag', 'Draw a line under it, eyes on Sunday'), tr('Du klopfst ihm auf die Schulter und sprichst über Sonntag. ', 'You pat him on the shoulder and talk about Sunday. '), -0.02),
    ],
  }),

  tiger_zurueck: tigerFollow('tiger_zurueck', {
      needs: (c) => (tigerOf(c).back && tigerOf(c).away === 0 ? {} : null),
      done: (c) => (tigerOf(c).back = false),
      text: () => tr('Tim ist zurück am Zaun. Mit einem selbstgemalten Schild, auf dem „TROTZDEM“ steht. Die Farbe ist noch nass, das T rinnt ein bisschen. Er steht da, als wäre nichts gewesen, nur die Dose ist neu.', 'Tim is back at the fence. With a hand-painted sign saying "ANYWAY". The paint is still wet, the A is running a little. He stands there as if nothing had happened, only the can is new.'),
      options: [
        {
          label: tr('Das erste Bier geht aufs Haus (3 €)', 'The first beer is on the house (€3)'),
          effect: outcome([
            { w: 3, run: (c) => (book(c, tr('Willkommensbier für Tim', 'Welcome-back beer for Tim'), -3), tigerShift(c, 0.14), adjustMood(c, 0.04), tr('„Ich hab’s nicht ausgehalten ohne euch“, gesteht Tim. „Zu Hause schaue ich nur Skispringen.“', '"I couldn\'t stand it without you," Tim confesses. "At home I only watch ski jumping."')) },
            { w: 1, run: (c) => (book(c, tr('Willkommensbier für Tim', 'Welcome-back beer for Tim'), -3), tigerShift(c, 0.12), supporters(c, 1), tr('Tim bedankt sich so laut, dass sich zwei Zuschauer entscheiden, ebenfalls im Förderverein mitzumachen.', 'Tim thanks you so loudly that two spectators decide to join the supporters\' club as well.')) },
          ]),
        },
        {
          label: tr('Kurz nicken – kein großes Aufheben', 'A short nod – no fuss'),
          effect: outcome([
            { w: 2, run: (c) => (tigerShift(c, 0.07), tr('Ein Nicken von dir, ein Nicken von ihm. Männerfreundschaft in Reinform. Er trinkt seine Dose still aus.', 'A nod from you, a nod from him. Male friendship in its purest form. He finishes his can in silence.')) },
            { w: 1, run: (c) => (tigerShift(c, 0.02), tr('Er hätte sich mehr gewünscht. Man sieht es an der Art, wie er die Dose öffnet.', 'He had hoped for more. You can tell by the way he opens his can.')) },
          ]),
        },
        {
          label: tr('Sein Schild im Vereinsheim aufhängen', 'Hang his sign in the clubhouse'),
          effect: outcome([
            { w: 3, run: (c) => (tigerShift(c, 0.16), adjustMood(c, 0.06), tr('Das Schild hängt jetzt neben dem Pokal von 1987. Darunter, in Tims Handschrift: „Auch zu Hause. Immer.“', 'The sign now hangs next to the 1987 trophy. Underneath, in Tim\'s handwriting: "Home too. Always."')) },
            { w: 1, run: (c) => (tigerShift(c, 0.1), neighbors(c, -1), tr('Das Schild tropft noch auf den Teppich. Die Vereinsheim-Putzfrau seufzt hörbar.', 'The sign is still dripping on the carpet. The clubhouse cleaner sighs audibly.')) },
          ]),
        },
      ],
  }),

  // === Kleine Auftritte ===================================================================================
  tiger_banner: tigerEvent('tiger_banner', {
    weight: 6,
    needs: (c) => (home(c) ? {} : null),
    text: () => tr('Tim hat ein Betttuch zum Banner gemacht: „TIGER BRÜLLT – FÜR IMMER DER VEREIN“. Die Farbe ist noch feucht, die Buchstaben werden nach rechts immer kleiner, und das Laken gehört eigentlich seiner Frau.', 'Tim has turned a bed sheet into a banner: "THE TIGER ROARS – CLUB FOREVER". The paint is still wet, the letters get smaller towards the right, and the sheet actually belongs to his wife.'),
    options: [
      {
        label: tr('Am Zaun aufhängen', 'Hang it on the fence'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.06), tigerShift(c, 0.1), tr('Das Banner hängt, der Wind spielt mit. Im Hintergrund hört man, wie Tims Frau „Das war Omas“ murmelt.', 'The banner hangs, the wind plays with it. In the background you hear Tim\'s wife mutter "That was Grandma\'s".')) },
          { w: 1.5, run: (c) => (adjustMood(c, 0.03), tigerShift(c, 0.06), tr('Das letzte Drittel des Banners klappt um und liest sich nun „FÜR IMMER DER VER“. Die Gästefans finden es wunderbar.', 'The last third of the banner folds over and now reads "CLUB FOR". The away fans think it is wonderful.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.05), supporters(c, 1), tr('Ein Fotograf vom Kreisblatt knipst das Banner. Auf dem Bild steht Tim davor, mit Dose. Er schneidet es aus und rahmt es.', 'A photographer from the district paper snaps the banner. In the picture Tim stands in front, with can. He cuts it out and frames it.')) },
        ]),
      },
      {
        label: tr('Am Vereinsheim, wo es keiner übersieht (8 € für Farbe und Nägel)', 'On the clubhouse where nobody can miss it (€8 for paint and nails)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Farbe und Nägel fürs Banner', 'Paint and nails for the banner'), -8), adjustMood(c, 0.08), tigerShift(c, 0.12), tr('Das Banner über dem Eingang gibt dem Vereinsheim etwas Stadionhaftes. Zumindest bis zum ersten Regen.', 'The banner over the entrance gives the clubhouse a stadium feel. At least until the first rain.')) },
          { w: 1, run: (c) => (book(c, tr('Farbe und Nägel fürs Banner', 'Paint and nails for the banner'), -8), neighbors(c, 1), adjustMood(c, 0.04), tigerShift(c, 0.1), tr('Die Nachbarn bleiben stehen, lesen und lächeln. Einer fragt, ob er auch eins bekommt.', 'The neighbours stop, read and smile. One asks whether he can have one too.')) },
        ]),
      },
      {
        label: tr('Erst kürzen – so wird das nichts', 'Shorten it first – this will never work'),
        effect: outcome([
          { w: 2, run: (c) => (tigerShift(c, -0.04), tr('Tim schneidet widerwillig ab, was zu lang ist. „Kunst muss leiden“, sagt er. Das Banner liest sich jetzt „TIGER BRÜLL“. Es passt zur Lautstärke.', 'Tim reluctantly cuts off what is too long. "Art has to suffer," he says. The banner now reads "TIGER ROA". It matches the volume.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.02), tigerShift(c, 0.02), tr('Seine Frau übernimmt: Mit Schere und Nähmaschine macht sie aus dem Laken ein richtiges Banner. Tim ist beeindruckt und leise.', 'His wife takes over: with scissors and sewing machine she turns the sheet into a proper banner. Tim is impressed and quiet.')) },
        ]),
      },
    ],
  }),

  tiger_gesang: tigerEvent('tiger_gesang', {
    weight: 6,
    needs: (c) => (home(c) && mood(c) >= 0.4 ? {} : null),
    text: () => tr('Tim hat eine Tröte, einen Schal und einen neuen Schlachtruf mitgebracht. Er geht „Wir sind ... der Verein! – und ihr nicht!“ Der halbe Zaun singt mit, die andere Hälfte hält sich die Ohren zu. Die Nachbarn öffnen die Fenster.', 'Tim has brought a horn, a scarf and a new battle cry. It goes "We are ... the club! – and you are not!" Half the fence sings along, the other half holds its ears. The neighbours open their windows.'),
    options: [
      {
        label: tr('Mitsingen lassen – Fahne raus', 'Let the singing go – flags out'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.08), tigerShift(c, 0.1), tr('Spätestens nach der zweiten Strophe singt der Schiri unhörbar mit. Die Mannschaft läuft, als hätte man ihr Rückenwind geschenkt.', 'By the second verse even the ref is humming along inaudibly. The team runs as if somebody had given them a tailwind.')) },
          { w: 1.5, run: (c) => (adjustMood(c, 0.04), neighbors(c, -1), tigerShift(c, 0.08), tr('Hinter dem Zaun beschwert sich Frau Albers über die Tröte. Das Fenster bleibt aber offen.', 'Behind the fence Mrs Albers complains about the horn. The window stays open, though.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.06), supporters(c, 1), tr('Ein Grundschüler lernt den Schlachtruf in zwei Minuten und singt ihn am Montag in der Pause. Das spricht sich herum.', 'A primary-school child learns the chant in two minutes and sings it at break on Monday. Word gets around.')) },
        ]),
      },
      {
        label: tr('Bitten, es bei einem Lied zu belassen', 'Ask him to stick to one song'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), neighbors(c, 1), tigerShift(c, -0.02), tr('Tim singt ein Lied, danach hält er sich an die Dose. Frau Albers winkt dankbar durchs Fenster.', 'Tim sings one song, then sticks to his can. Mrs Albers waves gratefully through the window.')) },
          { w: 1.5, run: (c) => (tigerShift(c, -0.06), tr('„Ein Lied?“ Tim wiegt den Kopf. „Dann nehm ich das mit sechzehn Strophen.“', '"One song?" Tim tilts his head. "Then I\'ll take the one with sixteen verses."')) },
        ]),
      },
      {
        label: tr('Die Tröte bis zum Anpfiff kassieren', 'Confiscate the horn until kick-off'),
        effect: outcome([
          { w: 2, run: (c) => (tigerShift(c, -0.1), neighbors(c, 1), tr('Tim übergibt die Tröte, als ginge es um seinen Pass. Danach ruft er alles, was sonst die Tröte ruft, mit eigener Lunge.', 'Tim hands over the horn as if it were his passport. Afterwards he shouts everything the horn usually shouts, with his own lungs.')) },
          { w: 1, run: (c) => (tigerShift(c, -0.05), adjustMood(c, -0.02), tr('Ohne Tröte ist es erstaunlich ruhig. Zu ruhig. Nach zehn Minuten fragen die Ersten, ob Tim krank ist.', 'Without the horn it is astonishingly quiet. Too quiet. After ten minutes the first people ask whether Tim is ill.')) },
        ]),
      },
    ],
  }),

  tiger_gegnerfans: tigerEvent('tiger_gegnerfans', {
    weight: 3,
    needs: (c) => (opponentName(c) ? { opp: opponentName(c) } : null),
    text: (c, ctx) => tr(`Am Zaun hat sich Tim mit zwei Fans von ${ctx.opp} festgequatscht. Es geht um die Frage, wer die schlechtere Bratwurst hat. Es wird laut, aber es wird dabei gegrinst. Der Wirt steht mit verschränkten Armen daneben und sieht aus wie jemand, der gleich Bier nachschenkt.`, `At the fence Tim has got into a long argument with two ${ctx.opp} fans. The question: whose bratwurst is worse. It gets loud, but everybody is grinning. The landlord stands beside them with folded arms looking like somebody about to refill glasses.`),
    options: [
      {
        label: tr('Dazwischengehen und Frieden stiften', 'Step in and keep the peace'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.03), tigerShift(c, -0.02), tr('Du lächelst, Tim lächelt zurück, die Gästefans prosten dir zu. Die Bratwurst ist übrigens bei beiden gut.', 'You smile, Tim smiles back, the away fans raise a toast to you. The bratwurst is good at both clubs, by the way.')) },
          { w: 1, run: (c) => (tigerShift(c, -0.06), tr('Tim fühlt sich gebremst. „Wir haben nur diskutiert“, sagt er mit gequetschter Würde. Danach trinkt er einsam am anderen Ende des Zauns.', 'Tim feels held back. "We were only debating," he says with squashed dignity. Then he drinks alone at the other end of the fence.')) },
        ]),
      },
      {
        label: tr('Laufen lassen – ist harmlos', 'Let it run – it is harmless'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Theke: Gästefans und Tim', 'Bar: away fans and Tim'), 18), adjustMood(c, 0.05), tigerShift(c, 0.06), tr('Nach dem Abpfiff sitzen Tim und die Gästefans zusammen am Tresen. Der Streit endet 3:3 und mit sechs Bier.', 'After the final whistle Tim and the away fans sit together at the bar. The argument ends 3-3 and with six beers.')) },
          { w: 1, run: (c) => (tigerOf(c).voice = 2, adjustMood(c, 0.03), tigerShift(c, 0.04), tr('Tim redet sich so heiß, dass er in der zweiten Halbzeit nur noch flüstern kann. Der Zaun ist ungewohnt leise.', 'Tim argues himself so hoarse that in the second half he can only whisper. The fence is unusually quiet.')) },
          { w: 1, run: (c) => (supporters(c, 1), adjustMood(c, 0.04), tr('Aus der Fan-Fehde wird eine Fan-Freundschaft: Die Gäste kommen im nächsten Jahr mit eigener Bratwurst. Das Kreisblatt nennt es „Fußballromantik“.', 'The fan feud turns into a fan friendship: next year the visitors come with their own bratwurst. The district paper calls it "football romance".')) },
        ]),
      },
      {
        label: tr('Wette: Wer verliert, zahlt die Bratwürste', 'Bet: the loser pays for the bratwursts'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Bratwurst-Wette gewonnen', 'Bratwurst bet won'), 14), adjustMood(c, 0.05), tigerShift(c, 0.04), tr('Tim verliert die Wette und zahlt. Mit Würde, Münzgeld und einem Seufzer.', 'Tim loses the bet and pays. With dignity, loose change and a sigh.')) },
          { w: 1.5, run: (c) => (book(c, tr('Bratwurst-Wette verloren', 'Bratwurst bet lost'), -14), adjustMood(c, 0.03), tigerShift(c, 0.1), tr('Tim gewinnt die Wette und teilt die Würste großzügig mit den Gästefans, bis nichts mehr übrig ist. Das Geld kommt trotzdem von dir.', 'Tim wins the bet and generously shares the sausages with the away fans until none are left. The money still comes from you.')) },
        ]),
      },
    ],
  }),

  tiger_schiri: tigerEvent('tiger_schiri', {
    weight: 5,
    needs: (c) => (level(c) >= 2 && home(c) ? {} : null),
    text: () => tr('Tim hat den Schiri heute dreimal zum Optiker geschickt. Zur Halbzeit kam der Unparteiische zum Zaun, ganz ruhig: „Noch ein Wort in dieser Lautstärke, und ich lass den Zaun räumen.“ Tim hat sich sofort hingesetzt – auf den Bierkasten.', 'Today Tim sent the ref to the optician three times. At half-time the official came to the fence, perfectly calm: "One more word at that volume and I clear the fence." Tim sat down at once – on the beer crate.'),
    options: [
      {
        label: tr('Tim zur Seite nehmen und beruhigen', 'Take Tim aside and calm him down'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.03), tigerShift(c, 0.03), tr('Du erklärst ihm in drei Sätzen, dass der Schiri auch ein Hobby hat. Tim murmelt: „Ein schlechtes.“ Aber er ist leiser.', 'You explain in three sentences that the ref has a hobby too. Tim mutters: "A poor one." But he is quieter.')) },
          { w: 1, run: (c) => (tigerShift(c, -0.05), tr('Tim fühlt sich vom eigenen Trainer gemaßregelt. Die Dose knackt, der Blick bleibt beleidigt.', 'Tim feels told off by his own manager. The can clicks, the gaze stays offended.')) },
        ]),
      },
      {
        label: tr('Beim Schiri entschuldigen (mit Bratwurst)', 'Apologise to the ref (with a bratwurst)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Bratwurst für den Schiri', 'Bratwurst for the ref'), -3), adjustMood(c, 0.04), tr('Der Schiri nimmt die Bratwurst an und die Entschuldigung auch. „Richten Sie ihm aus: Brille hab ich selbst“, sagt er.', 'The ref accepts the bratwurst and the apology. "Tell him: I have glasses myself," he says.')) },
          { w: 1, run: (c) => (book(c, tr('Bratwurst für den Schiri', 'Bratwurst for the ref'), -3), tigerShift(c, -0.08), stay(c, 1), tr('Tim erfährt davon und ist tief gekränkt: „Du schmierst den Schiri!“ Er bleibt ein Wochenende zu Hause. Mit Skispringen.', 'Tim hears about it and is deeply hurt: "You are bribing the ref!" He stays home for a weekend. With ski jumping.')) },
        ]),
      },
      {
        label: tr('Lachen – so unrecht hat Tim nicht', 'Laugh – Tim is not entirely wrong'),
        effect: outcome([
          { w: 2, run: (c) => (tigerShift(c, 0.1), adjustMood(c, 0.02), tr('Tim strahlt: „Endlich einer, der mich versteht.“ Er verspricht, ab sofort „nur noch konstruktiv“ zu brüllen.', 'Tim beams: "Finally somebody who understands me." He promises to roar "constructively only" from now on.')) },
          { w: 1.5, run: (c) => (book(c, tr('Verwarnung vom Verband', 'Warning from the association'), -10), tigerShift(c, 0.06), tr('Der Schiri vermerkt „Zuschauerverhalten“ im Bericht. Der Verband schickt eine Ermahnung samt 10 € Gebühr.', 'The ref notes "spectator behaviour" in his report. The association sends a reminder with a €10 fee.')) },
        ]),
      },
    ],
  }),

  tiger_tipp: tigerEvent('tiger_tipp', {
    weight: 4,
    needs: (c) => (fixtureOf(c) && opponentName(c) ? { tip: tipFor(c), opp: opponentName(c) } : null),
    text: (c, ctx) => tr(`Tim hat auf einem Bierdeckel getippt: ${ctx.tip[0]}:${ctx.tip[1]} gegen ${ctx.opp}. „Sicher wie das Amen in der Kirche“, sagt er. Er bietet an: Liegt er daneben, zahlt er die Bratwürste, trifft er, zahlst du.`, `Tim has put a tip on a beer mat: ${ctx.tip[0]}-${ctx.tip[1]} against ${ctx.opp}. "Safe as houses," he says. He offers: if he is wrong he pays for the bratwursts, if he is right you pay.`),
    options: [
      {
        label: tr('Einschlagen – die Wette gilt', 'Shake on it – the bet is on'),
        effect: outcome([
          { w: 1, run: (c, ctx) => (startLink(c, 'tiger_tipp_ergebnis', 1, { tip: ctx.tip, bet: 1 }), tigerShift(c, 0.04), tr('Handschlag, Bierdeckel, Unterschrift. Tim steckt den Deckel in die Hemdtasche, über dem Herzen.', 'Handshake, beer mat, signature. Tim tucks the mat into his shirt pocket, over his heart.')) },
        ]),
      },
      {
        label: tr('Lieber nicht – Tippen bringt Unglück', 'Better not – tipping brings bad luck'),
        effect: outcome([
          { w: 1, run: (c, ctx) => (startLink(c, 'tiger_tipp_ergebnis', 1, { tip: ctx.tip, bet: 0 }), tigerShift(c, -0.02), tr('Tim runzelt die Stirn. „Aberglaube ist Sache des Trainers“, sagt er, „also gut.“ Er tippt trotzdem. Im Stillen.', 'Tim frowns. "Superstition is the manager\'s business," he says, "fine." He tips anyway. Silently.')) },
        ]),
      },
      {
        label: tr('Gegentipp: 0:0 – du kennst dein Team', 'Counter-tip: 0-0 – you know your team'),
        effect: outcome([
          { w: 1, run: (c, ctx) => (startLink(c, 'tiger_tipp_ergebnis', 1, { tip: ctx.tip, bet: 2 }), tigerShift(c, -0.02), tr('„Null zu null?“ Tim ist fassungslos. „Das glaubt nicht mal dein Torwart!“ Der Wettschein wird trotzdem geschrieben.', '"Nil-nil?" Tim is stunned. "Not even your keeper believes that!" The betting slip is written anyway.')) },
        ]),
      },
    ],
  }),

  tiger_tipp_ergebnis: tigerFollow('tiger_tipp_ergebnis', {
    needs: (c) => {
      const l = link(c, 'tiger_tipp_ergebnis');
      const g = l ? lastGame(c) : null;
      if (!l || !g) return null;
      const exact = g.gf === l.tip[0] && g.ga === l.tip[1];
      const tendency = g.gf > g.ga;
      return { tip: l.tip, bet: l.bet, score: `${g.gf}:${g.ga}`, exact, tendency, zero: g.gf === 0 && g.ga === 0 };
    },
    text: (c, ctx) => {
      const tip = `${ctx.tip[0]}:${ctx.tip[1]}`;
      if (ctx.exact) return tr(`Ergebnis ${ctx.score}. Tims Tipp war ${tip}. Genau. Auf den Punkt. Tim steht auf dem Bierkasten, hält den Bierdeckel hoch und wartet auf Applaus. Er bekommt ihn.`, `Result ${ctx.score}. Tim's tip was ${tip}. Exactly. Spot on. Tim stands on the beer crate holding up the beer mat and waits for applause. He gets it.`);
      if (ctx.tendency) return tr(`Ergebnis ${ctx.score}. Tims Tipp war ${tip}. „Tendenz richtig!“, ruft Tim. „Das zählt! Das zählt immer!“ Der Wirt widerspricht, aber leise.`, `Result ${ctx.score}. Tim's tip was ${tip}. "Tendency correct!" shouts Tim. "That counts! That always counts!" The landlord disagrees, but quietly.`);
      return tr(`Ergebnis ${ctx.score}. Tims Tipp war ${tip}. Tim betrachtet den Bierdeckel lange. „Der Platz war schief“, sagt er schließlich. „Das war nicht einkalkuliert.“`, `Result ${ctx.score}. Tim's tip was ${tip}. Tim studies the beer mat for a long time. "The pitch was crooked," he says at last. "That was not factored in."`);
    },
    options: [
      {
        label: tr('Den Gewinn einlösen, wie vereinbart', 'Settle the bet as agreed'),
        effect: (c, ctx) => {
          // Einsatz 1: trifft Tim genau, zahlst du, sonst er. Einsatz 2 (Gegentipp 0:0): bei 0:0 zahlt Tim, trifft er genau, du.
          if (ctx.bet === 1 && ctx.exact) return book(c, tr('Wette an Tim verloren', 'Lost the bet to Tim'), -14), adjustMood(c, 0.03), tigerShift(c, 0.16), tr('Du zahlst die Bratwürste. Tim isst die erste im Stehen, die zweite auf dem Bierkasten und die dritte als Sieger.', 'You pay for the bratwursts. Tim eats the first standing, the second on the beer crate and the third as a winner.');
          if (ctx.bet === 1) return book(c, tr('Tims Bratwürste (Wette gewonnen)', 'Tim\'s bratwursts (won bet)'), 14), adjustMood(c, 0.05), tigerShift(c, 0.05), tr('Tim zahlt die Bratwürste mit einem Gesicht, als ginge er zum Zahnarzt. Die Mannschaft isst dafür besonders langsam.', 'Tim pays for the bratwursts with a face as if going to the dentist. The squad eats especially slowly.');
          if (ctx.bet === 2 && ctx.zero) return book(c, tr('Gegentipp-Wette gewonnen', 'Counter-tip bet won'), 14), adjustMood(c, 0.04), tigerShift(c, 0.06), tr('0:0! Tim sieht aus, als hätte man ihn mit einem Kaltwasserschlauch abgespritzt. „Das ist kein Fußball“, murmelt er und zahlt.', '0-0! Tim looks as if somebody had sprayed him with a cold hose. "That is not football," he mutters and pays up.');
          if (ctx.bet === 2 && ctx.exact) return book(c, tr('Gegentipp-Wette verloren', 'Counter-tip bet lost'), -14), adjustMood(c, 0.02), tigerShift(c, 0.14), tr('Tim trifft genau, du zahlst. Er nimmt es gnädig an und teilt die erste Bratwurst mit dem Verlierer.', 'Tim is spot on, you pay. He accepts graciously and shares the first bratwurst with the loser.');
          if (ctx.bet === 2) return adjustMood(c, 0.02), tigerShift(c, 0.04), tr('Dein 0:0 war falsch, Tims Tipp auch. Ihr einigt euch auf „beide daneben“ und teilt euch eine Bratwurst.', 'Your 0-0 was wrong, so was Tim\'s tip. You agree on "both off" and share one bratwurst.');
          return adjustMood(c, ctx.exact ? 0.05 : 0.02), tigerShift(c, ctx.exact ? 0.1 : 0.03), tr('Ohne Wette bleibt es beim Ruhm. Tim steckt den Bierdeckel ein, für das Familienalbum.', 'Without a bet there is only glory. Tim pockets the beer mat for the family album.');
        },
      },
      {
        label: tr('Ihn zum „Tippkönig“ der Saison ausrufen', 'Name him "tipping king" of the season'),
        effect: outcome([
          { w: (c, ctx) => (ctx.exact ? 4 : 1), run: (c) => (adjustMood(c, 0.05), tigerShift(c, 0.14), tr('Ein Kronen-Pappschild ist schnell gebastelt. Tim trägt es am Zaun stolz zur Schau, bis es regnet.', 'A cardboard crown is quickly made. Tim wears it proudly at the fence until it rains.')) },
          { w: (c, ctx) => (ctx.exact ? 0.2 : 3), run: (c) => (adjustMood(c, 0.04), tigerShift(c, 0.06), tr('Als Tippkönig mit Fehlschuss wird er „Trostkönig“ genannt. Das nimmt er mit Humor – und einer weiteren Dose.', 'As a tipping king with a miss he gets called the "consolation king". He takes it with humour – and another can.')) },
        ]),
      },
    ],
  }),

  tiger_grill: tigerEvent('tiger_grill', {
    weight: 5,
    needs: (c) => (home(c) && !['regen', 'schnee', 'wind'].includes(c.week?.weather?.id) ? {} : null),
    text: () => tr('Tim ist mit seinem Kugelgrill und einer Kühlbox am Zaun aufgekreuzt. „Hab auch Steaks dabei“, sagt er und winkt mit der Zange. Der Wirt hinter der Theke bekommt einen Gesichtsausdruck, als hätte jemand seinen Parkplatz besetzt.', 'Tim has turned up at the fence with his kettle barbecue and a cool box. "Brought steaks too," he says, waving the tongs. The landlord behind the bar gets a look on his face as if someone had taken his parking space.'),
    options: [
      {
        label: tr('Hinter dem Zaun erlauben – Ertrag teilen', 'Allow it behind the fence – share the takings'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Tims Grill: Anteil für den Verein', 'Tim\'s barbecue: the club\'s share'), 28), adjustMood(c, 0.07), tigerShift(c, 0.1), tr('Tims Würstchen sind besser, als der Wirt es zugeben möchte. Der Verein bekommt einen Anteil, Tim den Ruhm.', 'Tim\'s sausages are better than the landlord would like to admit. The club gets a share, Tim the glory.')) },
          { w: 1.5, run: (c) => (book(c, tr('Tims Grill: Anteil für den Verein', 'Tim\'s barbecue: the club\'s share'), 18), neighbors(c, -1), tigerShift(c, 0.08), tr('Der Rauch zieht in Frau Albers’ frische Wäsche. Sie schickt eine Beschwerde und den Duft gratis dazu.', 'The smoke drifts into Mrs Albers\' fresh washing. She sends a complaint and the smell for free.')) },
          { w: 1, run: (c) => (book(c, tr('Feuerlöscher nachgefüllt', 'Fire extinguisher refilled'), -12), adjustMood(c, 0.03), tigerShift(c, 0.06), tr('Eine Fettflamme sorgt für Aufregung, der Feuerlöscher von 1994 funktioniert tadellos. Tim klatscht, dann frisst er den Rest der Würste auf.', 'A grease flame causes excitement, the fire extinguisher from 1994 works flawlessly. Tim claps, then eats the rest of the sausages.')) },
        ]),
      },
      {
        label: tr('Nur mit dem Wirt zusammen (Zutaten 15 €)', 'Only together with the landlord (ingredients €15)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Zutaten für das Doppelgrillen', 'Ingredients for the joint barbecue'), -15), book(c, tr('Doppelgrillen: Theke', 'Joint barbecue: bar takings'), 45), adjustMood(c, 0.06), tigerShift(c, 0.06), tr('Tim und der Wirt grillen Seite an Seite und streiten über jede Wende. Die Zuschauer essen mehr, als sie wollten.', 'Tim and the landlord grill side by side and argue about every turn. The spectators eat more than they meant to.')) },
          { w: 1, run: (c) => (book(c, tr('Zutaten für das Doppelgrillen', 'Ingredients for the joint barbecue'), -15), tigerShift(c, -0.02), tr('Der Wirt und Tim reden vier Tage nicht miteinander. Die Würstchen schmecken trotzdem.', 'The landlord and Tim do not talk for four days. The sausages taste good anyway.')) },
        ]),
      },
      {
        label: tr('Verbieten – Brandschutz geht vor', 'Ban it – fire safety comes first'),
        effect: outcome([
          { w: 2, run: (c) => (neighbors(c, 1), tigerShift(c, -0.1), tr('Tim packt den Grill wieder ein, mit der Würde eines Tigers, den man aus dem Käfig lässt. Die Nachbarn atmen auf.', 'Tim packs the barbecue away with the dignity of a tiger being let out of a cage. The neighbours breathe a sigh of relief.')) },
          { w: 1, run: (c) => (tigerShift(c, -0.14), stay(c, 1), tr('Tim fühlt sich kaltgestellt, der Grill bleibt ausgekühlt zu Hause – und Tim mit ihm. Ein Wochenende lang.', 'Tim feels frozen out, the barbecue stays cold at home – and Tim with it. For one weekend.')) },
        ]),
      },
    ],
  }),

  tiger_heiser: tigerEvent('tiger_heiser', {
    weight: 5,
    needs: (c) => {
      const t = tigerOf(c);
      return home(c) && t.voice === 0 && t.mood >= 0.55 && (t.big || t.streak.w >= 2) ? {} : null;
    },
    text: () => tr('Tim hat nach dem Spiel keine Stimme mehr. Er versucht, „Tor“ zu rufen, und es klingt wie eine Kreissäge, die einen Schnupfen hat. Die Dose hält er tapfer fest, als sei das alles, was ihm geblieben ist.', 'Tim has no voice left after the game. He tries to shout "goal" and it sounds like a circular saw with a cold. He holds on bravely to the can as if it were all he had left.'),
    options: [
      {
        label: tr('Honigtee vom Wirt (3 €)', 'Honey tea from the landlord (€3)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Honigtee für Tim', 'Honey tea for Tim'), -3), tigerOf(c).voice = 1, tigerShift(c, 0.08), tr('Tim trinkt den Tee mit einem Gesicht wie bei einer Impfung. Zum Spiel nächste Woche ist er wieder da.', 'Tim drinks the tea with a face as if being vaccinated. By next week\'s game he is back.')) },
          { w: 1, run: (c) => (book(c, tr('Honigtee für Tim', 'Honey tea for Tim'), -3), tigerOf(c).voice = 1, tigerShift(c, 0.1), adjustMood(c, 0.03), tr('Der Tee wirkt Wunder. Tim bedankt sich so laut, dass der Wirt die Tür hinter sich zuzieht.', 'The tea works wonders. Tim thanks you so loudly that the landlord closes the door behind him.')) },
        ]),
      },
      {
        label: tr('Ruhe verordnen – zwei Wochen nur klatschen', 'Prescribe rest – only clapping for two weeks'),
        effect: outcome([
          { w: 2, run: (c) => (tigerOf(c).voice = 2, tigerShift(c, 0.02), team(c, 0.04), tr('Zwei Wochen klatscht Tim im Takt, mit der Dose als Zusatzinstrument. Die Mannschaft sagt, es habe ihnen noch nie so gut zugehört.', 'For two weeks Tim claps in rhythm, with the can as an extra instrument. The squad says nobody has ever listened to them so well.')) },
          { w: 1, run: (c) => (tigerOf(c).voice = 2, tigerShift(c, -0.04), tr('Tim hält zwei Tage durch. Dann schreit er bei einem Einwurf „Aus!“ – und flüstert den Rest der Woche.', 'Tim lasts two days. Then he shouts "Out!" at a throw-in – and whispers for the rest of the week.')) },
        ]),
      },
      {
        label: tr('Kehlenbonbons und Megafon vom Förderverein', 'Throat sweets and a megaphone from the supporters\' club'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Megafon fürs Wochenende', 'Megaphone for the weekend'), -8), tigerOf(c).voice = 1, adjustMood(c, 0.04), tigerShift(c, 0.07), tr('Mit Megafon klingt Tims Flüstern wie ein Notruf. Die Gästefans halten sich die Ohren zu. Erlaubt ist es.', 'With the megaphone Tim\'s whisper sounds like an emergency call. The away fans cover their ears. It is allowed.')) },
          { w: 1, run: (c) => (book(c, tr('Megafon fürs Wochenende', 'Megaphone for the weekend'), -8), neighbors(c, -1), tigerShift(c, 0.06), tr('Das Megafon ist lauter als gedacht. Zwei Nachbarn kommen nachfragen, ob heute das Pokalfinale ist.', 'The megaphone is louder than expected. Two neighbours come over to ask whether today is the cup final.')) },
        ]),
      },
    ],
  }),

  tiger_tdm: tigerEvent(
    'tiger_tdm',
    {
      weight: 3,
      needs: (c) => (c.round >= 3 && squad(c).length >= 5 ? {} : null),
      text: () => tr('Tim stiftet einen Kasten Bier für das „Tor des Monats“. Er hat dafür extra ein Formular gemalt: „Nur für richtige Tore! Kein Abstauber, kein Dropkick, keine Verlegenheit.“ Der Wirt fragt, ob der Kasten auch als Pfand zählt.', 'Tim is donating a crate of beer for the "goal of the month". He drew a special form: "Real goals only! No tap-ins, no scuffs, no embarrassment." The landlord asks whether the crate counts as a deposit too.'),
      options: [
        {
          label: tr('Die Mannschaft stimmt ab – der schönste Treffer gewinnt', 'The squad votes – the best strike wins'),
          effect: outcome([
            { w: 3, run: (c, ctx, rng) => { const s = pickPlayer(c, rng); if (s != null) adjustForm(c, s, 0.3); adjustMood(c, 0.07); tigerShift(c, 0.08); return tr(`${nameOf(c, s, 'Einer')} gewinnt mit einem Treffer, der in der Erinnerung jedes Mal weiter fliegt. Der Kasten wird in der Kabine gestemmt.`, `${nameOf(c, s, 'Someone')} wins with a goal that flies a little further each time it is remembered. The crate is hoisted in the dressing room.`); } },
            { w: 1, run: (c) => (adjustMood(c, 0.04), tigerShift(c, 0.05), tr('Die Abstimmung endet 5:5 zwischen zwei Toren, von denen eines ein Eigentor war. Tim erklärt beide zu Siegern und stellt zwei Kästen.', 'The vote ends 5-5 between two goals, one of which was an own goal. Tim declares both winners and supplies two crates.')) },
          ]),
        },
        {
          label: tr('Der Kasten geht an den Torjäger der Saison', 'The crate goes to the season\'s top scorer'),
          effect: outcome([
            { w: 2, run: (c) => { const top = [...squad(c)].sort((a, b) => (c.players[b]?.goals ?? 0) - (c.players[a]?.goals ?? 0))[0]; if (top != null) adjustForm(c, top, 0.25); adjustMood(c, 0.05); tigerShift(c, 0.06); return tr(`${nameOf(c, top, 'Der Torjäger')} trägt den Kasten nach Hause wie einen Pokal. Der Nachbar bekommt auch eine Flasche, aus Prinzip.`, `${nameOf(c, top, 'The striker')} carries the crate home like a trophy. The neighbour gets a bottle too, on principle.`); } },
            { w: 1, run: (c) => (adjustMood(c, 0.02), tigerShift(c, 0.04), tr('Die Mannschaft meckert: „Er trifft ja eh jede Woche.“ Der Torjäger verteilt den Kasten gleich weiter.', 'The squad grumbles: "He scores every week anyway." The striker hands the crate round immediately.')) },
          ]),
        },
        {
          label: tr('Kasten im Vereinsheim verlosen (Erlös für die Kasse)', 'Raffle the crate in the clubhouse (proceeds to the kitty)'),
          effect: outcome([
            { w: 2, run: (c) => (book(c, tr('Verlosung: Tims Kasten', 'Raffle: Tim\'s crate'), 36), tigerShift(c, 0.02), tr('Die Lose gehen weg wie warme Brötchen. Gewonnen hat – natürlich – Tim. Er erklärt es für Schicksal.', 'The tickets sell like hot cakes. The winner is – naturally – Tim. He declares it fate.')) },
            { w: 1, run: (c) => (book(c, tr('Verlosung: Tims Kasten', 'Raffle: Tim\'s crate'), 24), supporters(c, 1), tigerShift(c, -0.02), tr('Der Gewinner ist der Nachbar von Frau Albers. Er löst das Los zum Anlass, im Förderverein zu bleiben.', 'The winner is Mrs Albers\' neighbour. He takes it as a reason to join the supporters\' club.')) },
          ]),
        },
      ],
    },
    { cool: 20 },
  ),

  tiger_geburtstag: tigerEvent(
    'tiger_geburtstag',
    {
      weight: 7,
      needs: (c) => (c.round === birthdayRound(c) || c.round === birthdayRound(c) + 1 ? { age: 41 + Math.max(0, c.season - 1) } : null),
      text: (c, ctx) => tr(`Tim „Der Tiger“ wird heute ${ctx.age}. Er hat eine Torte mit Vereinswappen bestellt, die Bäckerei hat aus dem Wappen aber ein anderes gemacht. „Egal, schmeckt gleich“, sagt er und zeigt auf einen Marzipanball: „Das ist ein Fußball. Glaub ich.“`, `Tim "The Tiger" turns ${ctx.age} today. He ordered a cake with the club crest, but the bakery made a different crest. "Never mind, tastes the same," he says, pointing at a marzipan ball: "That is a football. I think."`),
      options: [
        {
          label: tr('Ständchen von der ganzen Mannschaft', 'A serenade from the whole squad'),
          effect: outcome([
            { w: 3, run: (c) => (adjustMood(c, 0.08), tigerShift(c, 0.14), tr('Die Mannschaft singt. Falsch, aber laut. Tim summt mit und wischt sich mit dem Ärmel übers Gesicht. „Staub im Auge“, behauptet er.', 'The squad sings. Off-key, but loudly. Tim hums along and wipes his face on his sleeve. "Dust in my eye," he claims.')) },
            { w: 1, run: (c, ctx, rng) => { const s = pickPlayer(c, rng); adjustMood(c, 0.06); tigerShift(c, 0.12); return tr(`${nameOf(c, s, 'Einer')} setzt eine Strophe zu früh ein. Tim lacht so sehr, dass die Torte wackelt.`, `${nameOf(c, s, 'Someone')} starts a verse too early. Tim laughs so hard the cake wobbles.`); } },
          ]),
        },
        {
          label: tr('Geschenk: Trikot mit der Nummer 12 (20 €)', 'Gift: a shirt with the number 12 (€20)'),
          effect: outcome([
            { w: 3, run: (c) => (book(c, tr('Geschenk für Tim: Trikot Nr. 12', 'Gift for Tim: shirt No. 12'), -20), tigerShift(c, 0.22), adjustMood(c, 0.08), tr('„Der zwölfte Mann“, flüstert Tim, hält das Trikot hoch und riecht daran. Er wird es zwei Wochen nicht ausziehen. Gewaschen wird es nie.', '"The twelfth man," whispers Tim, holds up the shirt and smells it. He will not take it off for two weeks. It will never be washed.')) },
            { w: 1, run: (c) => (book(c, tr('Geschenk für Tim: Trikot Nr. 12', 'Gift for Tim: shirt No. 12'), -20), tigerShift(c, 0.18), supporters(c, 1), tr('Das Trikot ist eine Nummer zu klein. Tim trägt es trotzdem. Das Bauchfreie führt zu einem neuen Mitglied im Förderverein, dem es auch gefällt.', 'The shirt is one size too small. Tim wears it anyway. The crop-top effect brings a new member to the supporters\' club, who also likes it.')) },
          ]),
        },
        {
          label: tr('Nur eine Karte unterschreiben lassen', 'Just have a card signed'),
          effect: outcome([
            { w: 2, run: (c) => (tigerShift(c, 0.06), tr('Die Karte macht die Runde, sieben Unterschriften, ein Bierfleck. Tim hängt sie über den Fernseher.', 'The card goes round, seven signatures, one beer stain. Tim hangs it above the TV.')) },
            { w: 1, run: (c) => (tigerShift(c, -0.02), tr('Die Karte kommt erst nach dem Anstoß an. Tim liest sie in der Halbzeit zweimal. Er sagt nichts, aber die Dose bleibt lange geschlossen.', 'The card only arrives after kick-off. Tim reads it twice at half-time. He says nothing, but the can stays closed for a long time.')) },
          ]),
        },
      ],
    },
    { cool: 5 },
  ),

  tiger_glueckstrikot: tigerEvent('tiger_glueckstrikot', {
    weight: 4,
    needs: (c) => (tigerOf(c).streak.w >= 2 && !tigerOf(c).jersey ? { w: tigerOf(c).streak.w } : null),
    text: (c, ctx) => tr(`Seit dem ${ctx.w}. Sieg in Folge trägt Tim dasselbe Vereinstrikot. Gewaschen? „Niemals! Das ist ein laufendes System!“ Der Zaun riecht nach Erfolg und einigem anderen. Der Wirt hat angefangen, Tim eine eigene Ecke zu geben.`, `Since the ${ctx.w}${ctx.w === 2 ? 'nd' : ctx.w === 3 ? 'rd' : 'th'} win in a row Tim has been wearing the same club shirt. Washed? "Never! It is a running system!" The fence smells of success and a few other things. The landlord has started giving Tim a corner of his own.`),
    options: [
      {
        label: tr('Heimlich waschen lassen', 'Have it washed in secret'),
        effect: outcome([
          { w: 2, run: (c) => (tigerOf(c).jersey = 'gewaschen', tigerShift(c, 0.02), neighbors(c, 1), tr('Das Trikot ist über Nacht gewaschen und riecht nach Lavendel. Tim merkt es sofort. „Wo ist der Geruch?!“, ruft er. Er trägt es trotzdem.', 'The shirt is washed overnight and smells of lavender. Tim notices at once. "Where did the smell go?!" he cries. He wears it anyway.')) },
          { w: 1, run: (c) => (tigerOf(c).jersey = 'gewaschen', tigerShift(c, -0.04), adjustMood(c, 0.02), tr('Tim verdächtigt zuerst den Wirt, dann seine Frau, dann das Wetter. Dir kommt er nicht auf die Schliche.', 'Tim first suspects the landlord, then his wife, then the weather. He does not get on your trail.')) },
        ]),
      },
      {
        label: tr('Als Maskottchen in die Kabine hängen', 'Hang it in the dressing room as a mascot'),
        effect: outcome([
          { w: 2, run: (c) => (team(c, 0.08), adjustMood(c, 0.06), tigerShift(c, 0.12), tr('Das Trikot hängt im Gang zur Kabine. Jeder berührt es im Vorbeigehen. Der Torwart spricht leise mit ihm.', 'The shirt hangs in the corridor to the dressing room. Everyone touches it in passing. The keeper talks to it quietly.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), team(c, -0.05), tigerShift(c, 0.08), tr('Nach einer Woche steht die Kabine unter Verdacht: Es riecht, als hätten sie verloren. Das Trikot kommt wieder raus.', 'After a week the dressing room is under suspicion: it smells as if they had lost. The shirt comes back out.')) },
        ]),
      },
      {
        label: tr('Behalten, aber zwei Meter Abstand', 'Let him keep it, but two metres distance'),
        effect: outcome([
          { w: 2, run: (c) => (tigerShift(c, 0.04), adjustMood(c, 0.02), tr('Tim hält den Abstand ein, indem er sich einfach auf die andere Seite des Zauns stellt. Die Aussicht dort ist ohnehin besser.', 'Tim keeps his distance by simply standing on the other side of the fence. The view there is better anyway.')) },
          { w: 1, run: (c) => (tigerShift(c, -0.06), tr('„Zwei Meter“, wiederholt Tim beleidigt. „Der Wirt hat nur einen!“ Dann grinst er, geht aber auf Abstand.', '"Two metres," Tim repeats, offended. "The landlord only has one!" Then he grins but keeps his distance.')) },
        ]),
      },
    ],
  }),

  tiger_bus: tigerEvent('tiger_bus', {
    weight: 4,
    needs: (c) => (isAwayThisWeek(c) && opponentName(c) ? { opp: opponentName(c) } : null),
    text: (c, ctx) => tr(`Auswärts bei ${ctx.opp}. Tim hat Pläne: „Ich organisier den Fanbus! Mein Cousin hat einen Sprinter mit Anhängerkupplung. Ohne Anhänger, aber mit Kupplung.“ Er hält eine Liste in der Hand. Es stehen fünf Namen drauf, davon einer doppelt.`, `Away at ${ctx.opp}. Tim has plans: "I'll organise the fan bus! My cousin has a van with a tow bar. No trailer, but a tow bar." He holds a list. It has five names on it, one of them twice.`),
    options: [
      {
        label: tr('Den Sprinter mieten (35 €)', 'Hire the van (€35)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Fanbus: Sprinter', 'Fan bus: van'), -35), team(c, 0.1), adjustMood(c, 0.07), tigerShift(c, 0.12), tr('Der Bus ist voll, der Gesang ab Ortsausgang auch. Auf dem Gästeparkplatz klingt es wie ein Heimspiel.', 'The bus is full, the singing too from the edge of town. In the visitors\' car park it sounds like a home game.')) },
          { w: 1.5, run: (c) => (book(c, tr('Fanbus: Sprinter', 'Fan bus: van'), -35), team(c, 0.05), tigerShift(c, 0.08), tr('Der Bus fährt zweimal falsch ab. Die Fans kommen zur Halbzeit an, mit Gesang, den keiner mehr braucht.', 'The bus takes two wrong exits. The fans arrive at half-time, with songs nobody needs any more.')) },
        ]),
      },
      {
        label: tr('Fahrgemeinschaften – Tim koordiniert', 'Car shares – Tim coordinates'),
        effect: outcome([
          { w: 2, run: (c) => (team(c, 0.05), tigerShift(c, 0.08), tr('Tim telefoniert zwei Tage lang. Am Ende fahren sechs Autos im Konvoi, und er sitzt im ersten, mit Warnblinker.', 'Tim phones for two days. In the end six cars drive in convoy, and he is in the first one, with hazard lights.')) },
          { w: 1, run: (c) => (tigerShift(c, 0.04), tr('Zwei Wagen kommen in einem Kreisverkehr abhanden. Die Insassen haben später ein nettes Eis gegessen.', 'Two cars get lost in a roundabout. Their occupants later had a nice ice cream.')) },
        ]),
      },
      {
        label: tr('Absagen – Auswärtsfahrten sind Sache der Mannschaft', 'Decline – away trips are the squad\'s business'),
        effect: outcome([
          { w: 2, run: (c) => (tigerShift(c, -0.08), tr('Tim fährt dann eben mit der Bahn, mit Dose und Schal. Man sieht ihn bei der Ankunft schon von Weitem.', 'Tim takes the train, then, with can and scarf. You can spot him from far away on arrival.')) },
          { w: 1, run: (c) => (tigerShift(c, -0.12), adjustMood(c, -0.02), tr('Tim bleibt zu Hause. „Dann schau ich eben im Radio“, murmelt er. Es gibt kein Radio.', 'Tim stays home. "I\'ll listen on the radio, then," he mutters. There is no radio.')) },
        ]),
      },
    ],
  }),

  tiger_schlaf: tigerEvent('tiger_schlaf', {
    weight: 6,
    needs: (c) => {
      const g = lastGame(c);
      return g && g.gf === 0 && g.ga === 0 ? {} : null;
    },
    text: () => tr('0:0. Tim ist in der zweiten Halbzeit auf der Tribünenbank eingeschlafen, die Dose im Arm, den Schal als Kissen. Zwei Jugendspieler stehen davor und überlegen laut, ob er noch lebt. Er schnarcht im Takt der Fahnenstange.', '0-0. Tim fell asleep on the stand bench in the second half, can in his arm, scarf as a pillow. Two youth players stand in front of him wondering aloud if he is still alive. He snores in time with the flagpole.'),
    options: [
      {
        label: tr('Mit der Tröte wecken', 'Wake him with the horn'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.05), tigerShift(c, -0.02), tr('Tim fährt hoch und ruft „TOR!“. Es ist niemand mehr auf dem Platz. Die Heimfahrt spielt sich im Lachen ab.', 'Tim shoots up and cries "GOAL!" There is nobody left on the pitch. The journey home is all laughter.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.03), tigerShift(c, -0.06), tr('Tim ist nicht erfreut: „Ich hab gerade ein Tor geträumt.“ Er verlangt, dass es zählt.', 'Tim is not pleased: "I was dreaming a goal." He demands that it counts.')) },
        ]),
      },
      {
        label: tr('Schlafen lassen, Jacke drüberlegen', 'Let him sleep, put a jacket over him'),
        effect: outcome([
          { w: 3, run: (c) => (tigerShift(c, 0.1), adjustMood(c, 0.03), tr('Tim wacht um sechs auf, findet die Jacke und fragt: „Wer war das?“ Sein Gesicht sagt: nie wieder allein einschlafen.', 'Tim wakes at six, finds the jacket and asks: "Who did that?" His face says: never fall asleep alone again.')) },
          { w: 1, run: (c) => (neighbors(c, -1), tigerShift(c, 0.06), tr('Der Hausmeister schließt das Tor und Tim ist über Nacht im Sportplatz. Morgens frühstückt er mit dem Platzwart. Beide sind glücklich.', 'The caretaker closes the gate and Tim spends the night at the ground. In the morning he has breakfast with the groundsman. Both are happy.')) },
        ]),
      },
      {
        label: tr('Foto für die Vereinsheimwand', 'A photo for the clubhouse wall'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.06), supporters(c, 1), tigerShift(c, 0.04), tr('Das Foto hängt gerahmt unter „Fan des Monats“. Tim ist stolz – und sagt, er habe nur die Augen ausgeruht.', 'The photo hangs framed under "Fan of the Month". Tim is proud – and says he was only resting his eyes.')) },
          { w: 1, run: (c) => (tigerShift(c, -0.06), tr('Tim erfährt es und ist sauer. „Ich hab nur die Augen ausgeruht!“ Das Foto bleibt trotzdem hängen.', 'Tim finds out and is cross. "I was only resting my eyes!" The photo stays up anyway.')) },
        ]),
      },
    ],
  }),

  tiger_fanaktion: tigerEvent(
    'tiger_fanaktion',
    {
      weight: 6,
      needs: (c) => (tigerOf(c).role === 'fanbeauftragter' && c.round >= 2 ? {} : null),
      text: () => tr('Fanbeauftragter Tim hat eine Mappe mitgebracht. Titel: „Aktion Tiger-Schal“. Er möchte 40 Schals in Vereinsfarben drucken lassen, 3 € das Stück im Einkauf. Daneben hat er eine Tabelle gemalt, die vor allem aus Pfeilen besteht.', 'Fan liaison officer Tim has brought a folder. Title: "Operation Tiger Scarf". He wants 40 scarves printed in club colours, €3 each wholesale. Next to it he drew a table that consists mainly of arrows.'),
      options: [
        {
          label: tr('Alle 40 bestellen (60 €)', 'Order all 40 (€60)'),
          effect: outcome([
            { w: 3, run: (c) => (book(c, tr('Tiger-Schals (40 Stück)', 'Tiger scarves (40)'), -60), book(c, tr('Verkauf der Tiger-Schals', 'Tiger scarf sales'), 84), supporters(c, 2), adjustMood(c, 0.07), tigerShift(c, 0.1), tr('Die Schals sind in drei Wochen weg. Sonntag sieht der Zaun aus wie ein Stadion in klein.', 'The scarves are gone in three weeks. On Sunday the fence looks like a stadium in miniature.')) },
            { w: 1, run: (c) => (book(c, tr('Tiger-Schals (40 Stück)', 'Tiger scarves (40)'), -60), book(c, tr('Verkauf der Tiger-Schals', 'Tiger scarf sales'), 45), supporters(c, 1), tigerShift(c, 0.06), tr('Die Hälfte der Schals bleibt liegen. Tim erklärt, das sei Absicht gewesen: „Ein Schal fürs Archiv.“', 'Half the scarves stay unsold. Tim says it was deliberate: "One scarf for the archive."')) },
          ]),
        },
        {
          label: tr('Nur 20 Stück (30 €)', 'Only 20 (€30)'),
          effect: outcome([
            { w: 2, run: (c) => (book(c, tr('Tiger-Schals (20 Stück)', 'Tiger scarves (20)'), -30), book(c, tr('Verkauf der Tiger-Schals', 'Tiger scarf sales'), 42), supporters(c, 1), adjustMood(c, 0.04), tigerShift(c, 0.05), tr('Alle 20 sind weg, bevor Tim die Mappe zuklappt. Er will sofort nachbestellen, „damit es nicht ausgeht“.', 'All 20 are gone before Tim closes the folder. He wants to reorder at once, "so it doesn\'t run out".')) },
            { w: 1, run: (c) => (book(c, tr('Tiger-Schals (20 Stück)', 'Tiger scarves (20)'), -30), tigerShift(c, 0.02), tr('Die Schals sind da, Tims Tabelle auch. Beides kann man nicht lesen.', 'The scarves are here, so is Tim\'s table. Neither can be read.')) },
          ]),
        },
        {
          label: tr('Absagen – die Kasse ist knapp', 'Decline – the kitty is tight'),
          effect: outcome([
            { w: 2, run: (c) => (tigerShift(c, -0.08), tr('Tim nickt tapfer und rollt die Tabelle zusammen. Man sieht, dass er schon die Farben der Schals ausgesucht hatte.', 'Tim nods bravely and rolls up the table. You can see he had already picked the colour of the scarves.')) },
            { w: 1, run: (c) => (adjustMood(c, 0.02), tigerShift(c, -0.04), tr('Er findet, das sei vernünftig. Er fürchtet nur um sein Amt, wenn er nichts vorweisen kann.', 'He finds it sensible. He only fears for his post if he has nothing to show.')) },
          ]),
        },
      ],
    },
    { cool: 16 },
  ),
};

// --- Geschichte: Zustand der Brief-Kette --------------------------------------------------------------

// Eröffnet die Geschichte: Weg (listen, training, amt, ignore), Haltung (stance) und das nächste Ereignis in `delay` Wochen.
function openStory(c, path, delay, stanceStart = path === 'amt' ? 2 : 1) {
  const t = tigerOf(c);
  t.story = { path, stance: stanceStart, start: t.wk, pts: 0, n: 0 };
  t.storySeason = c.season;
  if (path === 'amt') startLink(c, 'tiger_urteil', delay, { story: true });
  else startLink(c, 'tiger_stammtisch', delay, { path, story: true });
}
function stance(c, d) {
  const s = tigerOf(c).story;
  if (s) s.stance += d;
}
function setRole(c) {
  tigerOf(c).role = 'fanbeauftragter';
}

// Eine Antwort im Urteil: Der Ausgang hängt an Ergebnissen (res) und Haltung (st), die Antwort färbt ihn.
function urteilOption(label, lead, bonus) {
  const close = (c) => {
    const t = tigerOf(c);
    t.story = null;
    t.storySeason = c.season;
  };
  return {
    label,
    effect: outcome([
      { w: (c, ctx) => (ctx.res === 'good' ? 5 : 0.4), run: (c) => (close(c), tigerShift(c, 0.16 + bonus), adjustMood(c, 0.08), supporters(c, 1), chronicle(c, tr('Tim „Der Tiger“ nimmt seinen Leserbrief zurück – zu 90 Prozent.', 'Tim "The Tiger" withdraws his letter to the editor – 90 per cent of it.')), lead + tr('„Ich hab mich geirrt. Zu neunzig Prozent.“ Tim bringt zwei Kumpels mit, die er für den Förderverein anwirbt. „Die haben auch die Raute vermisst.“', '"I was wrong. Ninety per cent." Tim brings two mates he recruits for the supporters\' club. "They missed the diamond too."')) },
      { w: (c, ctx) => (ctx.res === 'bad' && ctx.st === 'hi' ? 5 : 0.4), run: (c) => (close(c), tigerShift(c, 0.1 + bonus), adjustMood(c, 0.04), lead + tr('Tim hebt sein Glas. „Die Ergebnisse sind schlecht, die Leute sind gut. Ich bin dabei.“ Wer so etwas sagt, steht auch in zehn Jahren noch am Zaun.', 'Tim raises his glass. "The results are poor, the people are good. I\'m in." Anyone who says that will still be at the fence in ten years.')) },
      { w: (c, ctx) => (ctx.res === 'bad' && ctx.st === 'lo' ? 5 : 0), run: (c) => (close(c), tigerShift(c, -0.12 + bonus), adjustMood(c, -0.05), stay(c, 3), lead + tr('Tim setzt die Mütze auf. „Ich brauch Abstand“, sagt er, „drei Wochen, vielleicht vier.“ Er zieht ab Richtung Segelflugplatz. Am Zaun fehlt etwas Gelbes: die Dose.', 'Tim puts on his cap. "I need some distance," he says, "three weeks, maybe four." He walks off towards the gliding field. Something yellow is missing from the fence: the can.')) },
      { w: (c, ctx) => (ctx.res === 'mid' ? 4 : 0.6), run: (c) => (close(c), tigerShift(c, 0.04 + bonus), lead + tr('Tim zuckt die Schultern. „Mal sehen“, sagt er. Das ist für ihn eine feierliche Erklärung. Der Brief bleibt im Archiv, mit Bierfleck.', 'Tim shrugs. "We\'ll see," he says. For him that is a solemn declaration. The letter stays in the archive, with a beer stain.')) },
    ]),
  };
}

export const TIGER_EVENT_IDS = Object.keys(TIGER_EVENTS);
