// Vereinsleben: Ereignisse in der Chatgruppe mit Entscheidungen und Folgen,
// Teamstimmung, Tagesform und mehrwöchige Geschichten.
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { getPool, humanClub, joinSquad, playerOf, releasePlayer } from './career.js';
import { advanceStories, arcsOf, STORY_STARTS, storyDecision } from './stories.js';

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
  return (1 - mood(career) * 0.3) * (rec?.grumpy > 0 ? 1.8 : 1) * (rec?.absenceMul ?? (rec?.movedAway ? 3 : 1));
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
        effect: (c, ctx, rng) => {
          book(c, 'Freibier im Vereinsheim', -40);
          adjustMood(c, 0.25);
          const hung = [...squad(c)].sort(() => rng.next() - 0.5).slice(0, 2);
          for (const idx of hung) adjustForm(c, idx, -0.6);
          return `Legendärer Abend. ${hung.map((i) => first(c, i)).join(' und ')} sind Sonntag noch nicht ganz nüchtern.`;
        },
      },
      { label: 'Jeder zahlt selbst', effect: (c) => (adjustMood(c, 0.08), 'Gemütliche Runde, alle pünktlich zu Hause.') },
      { label: 'Diese Woche nicht', effect: (c) => (adjustMood(c, -0.05), 'Ein paar sind enttäuscht – „früher war mehr los".') },
    ],
  },
  arbeitseinsatz: {
    weight: 2,
    needs: () => ({}),
    text: () => 'Der Platz sieht aus wie ein Acker. Samstag Arbeitseinsatz: Löcher stopfen, Linien ziehen, Tore streichen?',
    options: [
      {
        label: 'Alle antreten, ich bring Brötchen mit',
        effect: (c) => {
          adjustMood(c, 0.12);
          for (const idx of squad(c)) adjustForm(c, idx, -0.15);
          book(c, 'Brötchen für den Arbeitseinsatz', -10);
          if ((c.level ?? 1) > 1) book(c, 'Rabatt Platzmiete für den Arbeitseinsatz', 20);
          return 'Der Platz glänzt, die Truppe ist zusammengewachsen – aber alle haben Muskelkater.';
        },
      },
      { label: 'Wer Lust hat, kommt', effect: (c) => (adjustMood(c, 0.03), 'Drei Mann und ein Rasenmäher. Immerhin.') },
      { label: 'Lassen wir', effect: (c) => (adjustMood(c, -0.04), 'Der Platzwart schüttelt den Kopf.') },
    ],
  },
  streit: {
    weight: 2,
    needs: (c, rng) => {
      const a = pickSubject(c, rng);
      const b = pickSubject(c, rng, (idx) => idx !== a);
      return a != null && b != null ? { a, b } : null;
    },
    text: (c, ctx) => `Zoff in der Gruppe: ${first(c, ctx.a)} wirft ${first(c, ctx.b)} vor, „immer nur zu labern und nie zu laufen". Es fliegen Sprachnachrichten.`,
    options: [
      {
        label: 'Beide anrufen und schlichten',
        effect: (c, ctx, rng) => {
          if (rng.chance(0.6)) {
            adjustMood(c, 0.08);
            return 'Handschlag beim Bäcker. Erledigt.';
          }
          c.players[ctx.b].grumpy = 2;
          return `${first(c, ctx.b)} ist immer noch angefressen und sagt diese Woche lieber ab.`;
        },
      },
      {
        label: 'Beide 10 € in die Kasse',
        effect: (c) => (book(c, 'Strafe: Streit in der Gruppe', 20), adjustMood(c, -0.08), 'Ruhe ist. Begeistert ist keiner.'),
      },
      {
        label: 'Raushalten',
        effect: (c, ctx) => {
          adjustMood(c, -0.12);
          c.week.availability[ctx.b] = 'no';
          return `${first(c, ctx.b)} hat die Gruppe auf stumm geschaltet und kommt Sonntag nicht.`;
        },
      },
    ],
  },
  nachbar: {
    weight: 2,
    needs: () => ({}),
    text: () => 'Der Nachbar vom Hinterhof hat drei Bälle einbehalten. „Die krieg ich erst wieder, wenn das Geballer aufhört!"',
    options: [
      { label: 'Neue Bälle kaufen (30 €)', effect: (c) => (book(c, 'Neue Bälle', -30), 'Neue Bälle, gleicher Nachbar.') },
      {
        label: 'Klingeln und eine Flasche Wein mitbringen (8 €)',
        effect: (c, ctx, rng) => {
          book(c, 'Flasche Wein für den Nachbarn', -8);
          if (rng.chance(0.6)) return (adjustMood(c, 0.04), 'Der Nachbar ist eigentlich ganz nett. Bälle zurück, und er kommt Sonntag gucken.');
          book(c, 'Neue Bälle', -30);
          return 'Tür bleibt zu. Also doch neue Bälle.';
        },
      },
      { label: 'Mit alten Bällen weiterspielen', effect: (c) => (adjustMood(c, -0.05), 'Die Pille eiert. Alle meckern.') },
    ],
  },
  presse: {
    weight: 1,
    needs: (c) => (c.flags?.pressWeeks ? null : {}),
    text: () => 'Das Kreisblatt will ein Porträt über den Verein machen – mit Mannschaftsfoto und allem.',
    options: [
      {
        label: 'Gerne! Alle in Trikot zum Foto',
        effect: (c) => {
          c.flags.pressWeeks = 4;
          adjustMood(c, 0.1);
          return 'Halbe Seite im Kreisblatt! Mehr Zuschauer in den nächsten Wochen – ein Ex-Profi würde den Rummel aber meiden.';
        },
      },
      { label: 'Lieber nicht', effect: () => 'Wir bleiben der Geheimtipp.' },
    ],
  },
  kater: {
    weight: 3,
    needs: (c, rng) => {
      const s = pickSubject(c, rng, (idx) => c.week.availability[idx] === 'yes');
      return s == null ? null : { s };
    },
    text: (c, ctx) => `${first(c, ctx.s)} hat Samstag in den Geburtstag reingefeiert. Laut Story bis 4 Uhr.`,
    options: [
      { label: 'Trotzdem spielen lassen', effect: (c, ctx) => (adjustForm(c, ctx.s, -0.8), `${first(c, ctx.s)} läuft Sonntag auf Restalkohol.`) },
      {
        label: 'Erste Halbzeit auf die Bank',
        effect: (c, ctx) => {
          c.week.availability[ctx.s] = 'late';
          return `${first(c, ctx.s)} kommt zur zweiten Halbzeit – mit Sonnenbrille.`;
        },
      },
      { label: '5 € in die Kasse, Thema durch', effect: (c, ctx) => (book(c, `Strafe: Kater ${first(c, ctx.s)}`, 5), adjustForm(c, ctx.s, -0.5), 'Gezahlt, gelacht, gespielt.') },
    ],
  },
  bankfrust: {
    weight: 3,
    needs: (c, rng) => {
      if (c.round < 3) return null;
      const s = pickSubject(c, rng, (idx, p, rec) => rec.apps <= Math.floor(c.round / 3) && !rec.grumpy);
      return s == null ? null : { s };
    },
    text: (c, ctx) => `${first(c, ctx.s)} schreibt privat: „Warum spiel ich eigentlich nie? Dann kann ich sonntags auch ausschlafen."`,
    options: [
      {
        label: 'Einsatz am Sonntag versprechen',
        effect: (c, ctx) => {
          c.flags.promise = { idx: ctx.s, round: c.round };
          adjustForm(c, ctx.s, 0.4);
          return `${first(c, ctx.s)} ist motiviert. Du solltest dein Versprechen halten.`;
        },
      },
      {
        label: 'Ehrlich sein: Die anderen sind besser',
        effect: (c, ctx, rng) => {
          if (rng.chance(0.4) && releasePlayer(c, ctx.s)) return 'Er hat es verstanden – und sich einen anderen Verein gesucht.';
          return 'Er schluckt, bleibt aber. Respekt.';
        },
      },
      { label: 'Nicht reagieren', effect: (c, ctx) => ((c.players[ctx.s].grumpy = 3), `${first(c, ctx.s)} ist beleidigt und sagt öfter ab.`) },
    ],
  },
  trikots_eingelaufen: {
    weight: 1,
    needs: () => ({}),
    text: () => 'Katastrophe: Wer hat die Trikots auf 90 Grad gewaschen? Die passen jetzt der F-Jugend.',
    options: [
      { label: 'Neuer Satz (60 €)', effect: (c) => (book(c, 'Neuer Trikotsatz nach Waschunfall', -60), 'Neuer Satz bestellt. Waschzettel hängt jetzt in der Kabine.') },
      { label: 'Wir spielen in Leibchen', effect: (c) => (adjustMood(c, -0.06), 'Sieht aus wie Training. Fühlt sich auch so an.') },
    ],
  },
  tombola: {
    weight: 1,
    needs: () => ({}),
    text: () => 'Die Bäckerei hat bei ihrer Tombola für euch gesammelt.',
    options: [{ label: 'Danke!', effect: (c, ctx, rng) => { const n = rng.int(25, 60); book(c, 'Tombola der Bäckerei', n); return `${n} € für die Kasse.`; } }],
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
        effect: (c, ctx) => {
          c.youth.prospects.push(ctx.kid);
          c.players[ctx.kid] ??= { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
          return `${first(c, ctx.kid)} ist jetzt in der A-Jugend. Die Eltern haben zugestimmt.`;
        },
      },
      { label: 'Er soll erstmal Schule machen', effect: () => 'Vielleicht später.' },
    ],
  },
  allueren: {
    weight: 2,
    needs: (c, rng) => {
      const s = pickSubject(c, rng, (idx, p) => ['dorfstar', 'superstar', 'legende'].includes(p.tier));
      return s == null ? null : { s };
    },
    text: (c, ctx) => `${first(c, ctx.s)} will die Kapitänsbinde, nur noch vorne spielen und findet, dass die anderen „mal mehr laufen könnten".`,
    options: [
      { label: 'Nachgeben – er ist unser Bester', effect: (c, ctx) => (adjustForm(c, ctx.s, 0.5), adjustMood(c, -0.12), 'Er blüht auf. Der Rest der Truppe verdreht die Augen.') },
      {
        label: 'Klartext: Hier ist jeder gleich',
        effect: (c, ctx, rng) => {
          if (rng.chance(0.35) && releasePlayer(c, ctx.s)) return (adjustMood(c, 0.05), 'Er ist weg. Die Stimmung ist trotzdem besser.');
          adjustMood(c, 0.08);
          return 'Er knurrt, bleibt aber – und läuft jetzt auch mal zurück.';
        },
      },
      { label: 'Kompromiss: Kapitän ja, sonst nichts', effect: (c, ctx) => ((c.players[ctx.s].grumpy = 1), 'Halb zufrieden. Mal sehen, wie lange.') },
    ],
  },
  sommerfest: {
    weight: 30, // nur an Spieltag 4 möglich – dann fast immer
    needs: (c) => (c.round === 4 && !c.flags.summerfest ? {} : null),
    text: () => 'Sommerfest steht an! Wie groß soll es werden?',
    options: [
      {
        label: 'Richtig groß: Hüpfburg, Grill, Tombola (50 €)',
        effect: (c, ctx, rng) => {
          c.flags.summerfest = true;
          book(c, 'Sommerfest: Hüpfburg & Grill', -50);
          const income = rng.int(80, 170);
          book(c, 'Sommerfest: Einnahmen', income);
          adjustMood(c, 0.15);
          if (rng.chance(0.3)) {
            const p = getPool().everyone().find((q) => q.tier === 'gut' && !c.clubs.some((x) => x.squad.includes(q.poolIndex)) && q.poolIndex % 7 === c.round);
            if (p && joinSquad(c, p.poolIndex, 'War beim Sommerfest – ich will mitspielen!')) return `${income} € eingenommen, und ${p.name} will mitspielen!`;
          }
          return `Tolles Fest, ${income} € eingenommen.`;
        },
      },
      { label: 'Klein: Grill und Kasten Bier', effect: (c) => ((c.flags.summerfest = true), book(c, 'Sommerfest (klein)', 30), adjustMood(c, 0.06), 'Gemütlich. 30 € übrig.') },
      { label: 'Fällt dieses Jahr aus', effect: (c) => ((c.flags.summerfest = true), adjustMood(c, -0.1), 'Die Spielerfrauen sind enttäuscht.') },
    ],
  },
  firmenturnier: {
    weight: 1,
    needs: (c) => (c.sponsors?.length ? { sponsor: c.sponsors[0].name } : null),
    text: (c, ctx) => `${ctx.sponsor} lädt zum Firmen-Kleinfeldturnier am Samstag ein.`,
    options: [
      {
        label: 'Hinfahren und gewinnen',
        effect: (c, ctx, rng) => {
          const hurt = rng.chance(0.25) ? pickSubject(c, rng) : null;
          if (hurt != null) c.week.availability[hurt] = 'no';
          if (rng.chance(0.55)) {
            book(c, `Turniersieg bei ${ctx.sponsor}`, 40);
            adjustMood(c, 0.1);
            return `Turniersieg! 40 € Preisgeld.${hurt != null ? ` Aber ${first(c, hurt)} hat sich den Knöchel verdreht.` : ''}`;
          }
          return `Im Halbfinale raus.${hurt != null ? ` Und ${first(c, hurt)} humpelt.` : ''}`;
        },
      },
      { label: 'Absagen – Sonntag ist wichtiger', effect: () => 'Der Sponsor ist etwas enttäuscht.' },
    ],
  },
  schiri_beschwerde: {
    weight: 1,
    needs: (c) => ((c.level ?? 1) > 1 ? {} : null),
    text: () => 'Der Schiri vom letzten Spiel hat sich beim Kreis beschwert: „Unsportliches Meckern".',
    options: [
      { label: 'Offizielle Entschuldigung schreiben', effect: (c) => (adjustMood(c, -0.03), 'Akzeptiert. Die Jungs finden es peinlich.') },
      { label: 'Verbandsstrafe zahlen (25 €)', effect: (c) => (book(c, 'Verbandsstrafe', -25), 'Bezahlt. Einer schlägt vor, das Meckern teurer zu machen.') },
    ],
  },
};

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
  if (!rng.chance(EVENT_CHANCE)) return null;
  const recent = new Set(career.eventLog.filter((e) => e.season === career.season && career.round - e.round < NO_REPEAT).map((e) => e.id));
  const candidates = [];
  const storySeason = new Set(career.eventLog.filter((e) => e.season === career.season).map((e) => e.id));
  const storiesFull = arcsOf(career).length >= 3;
  for (const [id, ev] of [...Object.entries(EVENTS), ...Object.entries(STORY_STARTS)]) {
    if (recent.has(id)) continue;
    if (STORY_STARTS[id] && (storiesFull || storySeason.has(id))) continue; // jede Geschichte höchstens einmal pro Saison
    const ctx = ev.needs(career, rng);
    if (ctx) candidates.push({ id, ev, ctx });
  }
  if (!candidates.length) return null;
  let r = rng.next() * candidates.reduce((s, c) => s + c.ev.weight, 0);
  const chosen = candidates.find((c) => (r -= c.ev.weight) < 0) ?? candidates[0];
  const event = { id: chosen.id, ctx: chosen.ctx, text: chosen.ev.text(career, chosen.ctx), options: chosen.ev.options.map((o) => o.label), choice: null, result: null, story: STORY_STARTS[chosen.id] ? 'Neue Geschichte' : null };
  career.week.event = event;
  career.eventLog.push({ id: chosen.id, season: career.season, round: career.round });
  if (career.eventLog.length > 40) career.eventLog.shift();
  return event;
}

export function resolveEvent(career, choice) {
  const e = career.week?.event;
  if (!e || e.choice !== null) return null;
  const def = EVENTS[e.id] ?? STORY_STARTS[e.id] ?? storyDecision(career, e.id);
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

