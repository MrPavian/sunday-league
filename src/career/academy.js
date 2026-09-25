// Jugendabteilung mit Jahrgängen: E-, D-, C- und B-Jugend. Kinder haben Talent
// (das man nur so genau sieht, wie der Jugendtrainer gut ist) und Spaß am
// Fußball. Zu viel Drill vergrault sie, zu wenig lässt Talent liegen. Mit 16
// wechseln sie in die A-Jugend und werden zu richtigen Spielern.
import { createRng } from '../core/rng.js';
import { FIRST_NAMES, LAST_NAMES } from '../data/names.js';
import { generatePlayer, ratePlayer } from '../sim/generator.js';
import { book } from './finances.js';
import { addCustomPlayer, humanClub, playerOf } from './career.js';
import { adjustMood } from './events.js';
import { outcome } from './outcomes.js';
import { adjustEnergy, childAge } from './personal.js';
import { chronicle } from './sagas.js';

export const TEAMS = [
  { id: 'E', name: 'E-Jugend', ages: [8, 10] },
  { id: 'D', name: 'D-Jugend', ages: [11, 12] },
  { id: 'C', name: 'C-Jugend', ages: [13, 14] },
  { id: 'B', name: 'B-Jugend', ages: [15, 15] },
];
export const teamOfAge = (age) => TEAMS.find((t) => age >= t.ages[0] && age <= t.ages[1]) ?? null;
const GIRL_NAMES = ['Lena', 'Mia', 'Emma', 'Hannah', 'Lea', 'Sophie', 'Ela', 'Zoe', 'Ida', 'Merve'];

export const FOCUS = {
  spass: { name: 'Spaß & Spiel', desc: 'Kleine Spiele, viel lachen. Kaum Fortschritt, aber keiner hört auf.', growth: 0.004, joy: 0.05 },
  technik: { name: 'Technik', desc: 'Ballgefühl, Passen, Annehmen. Gute Entwicklung, etwas zäh.', growth: 0.012, joy: -0.02 },
  kondition: { name: 'Kondition', desc: 'Laufen, laufen, laufen. Bringt was, macht aber keinen Spaß.', growth: 0.009, joy: -0.05 },
  turnier: { name: 'Turniervorbereitung', desc: 'Spielzüge und Ehrgeiz. Gut für die Besten, Frust für die anderen.', growth: 0.008, joy: -0.01, elite: true },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Neues Kind für die Jugend (Schnuppertraining, Talentsichtung, Nachbarschaft).
function makeKid(c, rng, age, bonus = 0) {
  const girl = rng.chance(0.25);
  const q = c.youth.coach.quality;
  return {
    id: `k${c.season}-${Math.floor(rng.next() * 1e9)}`,
    name: `${rng.pick(girl ? GIRL_NAMES : FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    girl,
    age,
    position: rng.pick(['def', 'mid', 'mid', 'fwd', 'gk']),
    talent: clamp01(rng.range(0.15, 0.75) + rng.gauss() * 0.08 + bonus + q * 0.05),
    joy: rng.range(0.55, 0.9),
    parent: rng.chance(0.15) ? 'ehrgeizig' : rng.chance(0.1) ? 'engagiert' : null,
  };
}

export function initAcademy(c) {
  c.youth.kids ??= [];
  c.youth.results ??= [];
  if (c.youth.kidsInit) return c.youth;
  c.youth.kidsInit = true;
  const rng = createRng((c.seed * 53 + 11) >>> 0);
  for (let i = 0; i < 11; i++) c.youth.kids.push(makeKid(c, rng, 8 + (i % 8)));
  return c.youth;
}

// Die eigenen Kinder des Spielertrainers spielen ab 6 mit (sie stehen in coach.children).
export function ownKids(c) {
  return (c.coach?.children ?? [])
    .filter((ch) => childAge(c, ch) >= 6 && childAge(c, ch) < 16)
    .map((ch) => {
      ch.talent ??= clamp01(0.35 + ((ch.name.length * 37) % 40) / 100);
      ch.joy ??= 0.85;
      return { own: true, ref: ch, name: `${ch.name} ${c.coach.last ?? ''}`.trim(), girl: ch.sex === 'w', age: childAge(c, ch), talent: ch.talent, joy: ch.joy, position: 'mid' };
    });
}

// Was der Jugendtrainer über das Talent sagt – je besser er ist, desto genauer.
export function talentGuess(c, kid) {
  const q = c.youth.coach.quality;
  const noise = ((kid.name.length * 13 + kid.age * 7) % 21) / 100 - 0.1;
  const est = clamp01(kid.talent + noise * (1.4 - q * 1.2));
  return Math.max(1, Math.min(5, Math.round(est * 5)));
}

export function setYouthFocus(c, id) {
  if (!c.week || !FOCUS[id]) return false;
  c.week.youthFocus = id;
  return true;
}

// Jede Woche: Training nach Schwerpunkt, Spaß steigt oder sinkt.
export function weeklyAcademy(c) {
  if (!c.youth?.kids) return;
  const f = FOCUS[c.week?.youthFocus ?? 'spass'];
  const q = c.youth.coach.quality;
  const all = [...c.youth.kids, ...ownKids(c)];
  const top = [...all].sort((a, b) => b.talent - a.talent).slice(0, Math.ceil(all.length / 3));
  for (const k of all) {
    const target = k.own ? k.ref : k;
    let joy = f.joy;
    if (f.elite) joy += top.includes(k) ? 0.04 : -0.04;
    if (k.parent === 'ehrgeizig') joy -= 0.01;
    target.joy = clamp01(target.joy + joy);
    target.talent = clamp01(target.talent + f.growth * (0.5 + q) * (0.4 + target.joy));
  }
  if (c.week?.youthFocus && c.week.youthFocus !== 'spass') adjustEnergy(c, -0.5);
}

// Saisonwechsel: ein Jahr älter, wer 16 wird, geht in die A-Jugend, wer keine
// Lust mehr hat, hört auf, und im Sommer kommen neue Kinder zum Schnuppertraining.
export function seasonAcademy(c) {
  initAcademy(c);
  const y = c.youth;
  const rng = createRng((c.seed * 71 + c.season * 389) >>> 0);
  const notes = [];
  // Saisonbilanz der Jugendteams
  const results = [];
  for (const t of TEAMS) {
    const kids = [...y.kids, ...ownKids(c)].filter((k) => teamOfAge(k.age)?.id === t.id);
    if (!kids.length) continue;
    const avg = kids.reduce((s, k) => s + k.talent, 0) / kids.length;
    const pos = Math.max(1, Math.min(8, Math.round(8.5 - avg * 9 + rng.range(-1.5, 1.5) - y.coach.quality * 2)));
    results.push({ team: t.id, pos });
    if (pos === 1) chronicle(c, `Die ${t.name} wird Kreismeister!`);
  }
  if (results.length) {
    y.results.push({ season: c.season, results });
    notes.push(`Jugend: ${results.map((r) => `${r.team}-Jugend ${r.pos}. Platz`).join(', ')}.`);
  }
  // Aufhören: wer den Spaß verloren hat (und ab und zu einfach so)
  const quit = y.kids.filter((k) => k.joy < 0.3 || rng.chance(0.06));
  if (quit.length) notes.push(`Aufgehört: ${quit.map((k) => k.name.split(' ')[0]).join(', ')}${quit.some((k) => k.joy < 0.3) ? ' – zu viel Drill, zu wenig Spaß' : ''}.`);
  y.kids = y.kids.filter((k) => !quit.includes(k));
  for (const k of y.kids) k.age++;
  // 16 → A-Jugend (Mädchen ins Frauenteam, wenn es eins gibt)
  const grads = y.kids.filter((k) => k.age >= 16);
  y.kids = y.kids.filter((k) => k.age < 16);
  for (const k of grads) {
    if (k.girl) {
      if (c.saga?.frauen) {
        c.saga.frauen.strength = Math.min(0.9, c.saga.frauen.strength + k.talent * 0.05);
        notes.push(`${k.name} wechselt aus der Jugend ins Frauenteam.`);
      }
      continue;
    }
    const idx = graduate(c, k, rng);
    notes.push(`${playerOf(c, idx).name} kommt aus der eigenen B-Jugend in die A-Jugend (Stärke ${playerOf(c, idx).rating}).`);
  }
  // Schnuppertraining im Sommer: 3–5 Neue, mit gutem Trainer und Talentsichtung mehr Talent
  const count = 3 + (y.coach.quality >= 0.6 ? 1 : 0) + (c.flags?.talentScout ? 1 : 0);
  for (let i = 0; i < count; i++) y.kids.push(makeKid(c, rng, rng.int(8, 10), c.flags?.talentScout ? 0.08 : 0));
  if (c.flags) c.flags.talentScout = false;
  notes.push(`Schnuppertraining: ${count} neue Kinder in der E-Jugend.`);
  return notes;
}

// Aus dem Kind wird ein Spieler mit 16 – Talent entscheidet über die Stufe.
function graduate(c, k, rng) {
  const tier = k.talent >= 0.9 ? 'dorfstar' : k.talent >= 0.72 ? 'stark' : k.talent >= 0.5 ? 'gut' : 'ok';
  const p = generatePlayer(rng, { role: k.position, tier });
  const player = { ...p, name: k.name, age: 16 - ((c.season ?? 1) - 1), profession: 'Schüler', position: k.position, backstory: `Aus der eigenen Jugend, seit der E-Jugend im Verein.`, custom: 'youth' };
  player.rating = ratePlayer(player);
  const idx = addCustomPlayer(c, player);
  c.players[idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
  c.youth.prospects.push(idx);
  return idx;
}

export const tierForTalent = (t) => (t >= 0.9 ? 'dorfstar' : t >= 0.72 ? 'stark' : t >= 0.5 ? 'gut' : 'ok');

// --- Ereignisse rund um die Jugend -------------------------------------------------
const kidPick = (c, rng, filter = () => true) => {
  const list = (c.youth?.kids ?? []).filter(filter);
  return list.length ? { k: rng.pick(list).id } : null;
};
const kidById = (c, id) => c.youth.kids.find((k) => k.id === id);
const kn = (c, ctx) => kidById(c, ctx.k)?.name.split(' ')[0] ?? 'Das Kind';
const joy = (c, ctx, d) => {
  const k = kidById(c, ctx.k);
  if (k) k.joy = clamp01(k.joy + d);
};
const tal = (c, ctx, d) => {
  const k = kidById(c, ctx.k);
  if (k) k.talent = clamp01(k.talent + d);
};
const drop = (c, ctx) => (c.youth.kids = c.youth.kids.filter((k) => k.id !== ctx.k));

export const ACADEMY_EVENTS = {
  ehrgeiziger_vater: {
    weight: 1.5,
    needs: (c, rng) => kidPick(c, rng, (k) => k.parent === 'ehrgeizig'),
    text: (c, ctx) => `Der Vater von ${kn(c, ctx)} brüllt beim Jugendspiel so laut am Rand, dass der Schiri das Spiel unterbricht. ${kn(c, ctx)} weint in der Kabine.`,
    options: [
      {
        label: 'Klares Gespräch mit dem Vater',
        effect: outcome([
          { w: 3, run: (c, ctx) => (joy(c, ctx, 0.15), (kidById(c, ctx.k).parent = null), 'Er sieht es ein. Ab jetzt steht er still am Rand – mit verschränkten Armen, aber still.') },
          { w: 1.5, run: (c, ctx) => (joy(c, ctx, -0.1), 'Er fühlt sich angegriffen: „Ich will doch nur das Beste für ihn."') },
          { w: 1, run: (c, ctx) => (drop(c, ctx), `Der Vater meldet ${kn(c, ctx)} ab – beim großen Stadtverein. „Da wird wenigstens gefördert."`) },
          { w: 1, run: (c, ctx) => ((kidById(c, ctx.k).parent = 'engagiert'), book(c, 'Spende vom geläuterten Vater', 40), 'Nach dem Gespräch wird er zum Helfer: Er fährt jetzt jedes Auswärtsspiel und spendet 40 € für Bälle.') },
        ]),
      },
      {
        label: 'Platzverbot für Eltern beim nächsten Spiel',
        effect: outcome([
          { w: 2, run: (c, ctx) => (joy(c, ctx, 0.2), adjustMood(c, 0.02), 'Ohne Eltern am Rand spielen die Kinder befreit auf. Bestes Spiel der Saison.') },
          { w: 2, run: (c) => (adjustMood(c, -0.03), 'Mehrere Eltern beschweren sich beim Vorstand. „Kollektivstrafe!"') },
          { w: 1, run: (c, ctx) => (drop(c, ctx), 'Der Vater nimmt es persönlich. Sein Kind kommt nicht mehr.') },
        ]),
      },
      {
        label: 'Lassen, der beruhigt sich',
        effect: outcome([
          { w: 3, run: (c, ctx) => joy(c, ctx, -0.15) ?? `${kn(c, ctx)} hat immer weniger Lust auf Fußball.` },
          { w: 1, run: () => 'Nächste Woche ist er tatsächlich leiser.' },
          { w: 1, run: (c, ctx) => (tal(c, ctx, 0.04), joy(c, ctx, -0.2), `Der Druck macht ${kn(c, ctx)} besser – und unglücklicher.`) },
        ]),
      },
    ],
  },

  nlz_anfrage: {
    weight: 1,
    needs: (c, rng) => kidPick(c, rng, (k) => k.talent >= 0.7 && k.age >= 11),
    text: (c, ctx) => `Ein Scout vom Nachwuchsleistungszentrum des großen Stadtvereins hat ${kn(c, ctx)} (${kidById(c, ctx.k).age}) beobachtet. Sie wollen ${kidById(c, ctx.k).girl ? 'sie' : 'ihn'} holen.`,
    options: [
      {
        label: 'Viel Glück! (Ausbildungsentschädigung 80 €)',
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, 'Ausbildungsentschädigung NLZ', 80), chronicle(c, `${kidById(c, ctx.k).name} aus der eigenen Jugend wechselt ins Nachwuchsleistungszentrum.`), drop(c, ctx), adjustMood(c, 0.05), 'Der Wechsel ist perfekt. Der Verein ist stolz – und 80 € reicher.') },
          { w: 1, run: (c, ctx) => (book(c, 'Ausbildungsentschädigung NLZ', 80), drop(c, ctx), 'Wechsel perfekt. Die Mitspieler vermissen ihn/sie jetzt schon.') },
          { w: 1, run: (c, ctx) => (joy(c, ctx, 0.2), `${kn(c, ctx)} will gar nicht wechseln: „Hier sind meine Freunde." Bleibt.`) },
        ]),
      },
      {
        label: 'Den Eltern abraten – hier wächst er/sie in Ruhe',
        effect: outcome([
          { w: 2, run: (c, ctx) => (joy(c, ctx, 0.1), 'Die Eltern sind einverstanden. Talent bleibt im Dorf.') },
          { w: 2, run: (c, ctx) => (drop(c, ctx), 'Die Eltern entscheiden anders. Weg ist er/sie – ohne Entschädigung.') },
          { w: 1, run: (c, ctx) => (tal(c, ctx, -0.05), joy(c, ctx, -0.1), `${kn(c, ctx)} bleibt, fragt sich aber, was gewesen wäre.`) },
        ]),
      },
    ],
  },

  kuchenbasar: {
    weight: 1.5,
    needs: (c) => ((c.youth?.kids ?? []).length >= 5 ? {} : null),
    text: () => 'Die Jugendeltern wollen einen Kuchenbasar am Heimspieltag machen – für neue Trikots der E-Jugend.',
    options: [
      {
        label: 'Klar, ich backe auch was',
        effect: outcome([
          { w: 3, run: (c, ctx, rng) => { const n = rng.int(60, 130); book(c, 'Kuchenbasar der Jugend', n); adjustMood(c, 0.04); return `${n} € für die Jugend! Dein Marmorkuchen war als Erstes weg.`; } },
          { w: 1, run: (c) => (book(c, 'Kuchenbasar der Jugend', 35), 'Regen. Nur 35 €, aber viel Kuchen für die Kabine.') },
          { w: 1, run: (c) => (book(c, 'Kuchenbasar der Jugend', 90), adjustEnergy(c, -4), 'Du stehst vier Stunden am Stand. 90 € – und du kannst keinen Kuchen mehr sehen.') },
        ]),
      },
      { label: 'Macht mal, ich hab keine Zeit', effect: outcome([{ w: 3, run: (c, ctx, rng) => (book(c, 'Kuchenbasar der Jugend', rng.int(40, 80)), 'Die Eltern ziehen es ohne dich durch. Klappt auch.') }, { w: 1, run: (c) => (adjustMood(c, -0.02), 'Ein paar Eltern finden, der Trainer sollte sich auch mal zeigen.') }]) },
    ],
  },

  fahrgemeinschaft: {
    weight: 1.2,
    needs: (c) => ((c.youth?.kids ?? []).length >= 6 ? {} : null),
    text: () => 'Auswärtsspiel der D-Jugend, 40 km weg – und nur zwei Eltern haben Zeit zu fahren. Es fehlen drei Plätze.',
    options: [
      {
        label: 'Ich fahre selbst',
        effect: outcome([
          { w: 3, run: (c) => (adjustEnergy(c, -4), adjustMood(c, 0.03), 'Neun Kinder, zwei Autos, eine Schlager-Playlist. Die Kinder lieben dich.') },
          { w: 1, run: (c) => (adjustEnergy(c, -6), 'Auf der Rückfahrt wird einem Kind schlecht. Du reinigst die Rückbank bis Mitternacht.') },
          { w: 1, run: (c) => { for (const k of c.youth.kids) k.joy = clamp01(k.joy + 0.05); adjustEnergy(c, -4); return 'Ihr gewinnt 5:1. Auf der Heimfahrt singen alle – sogar du.'; } },
        ]),
      },
      { label: 'Kleinbus vom Autohaus leihen (25 €)', effect: outcome([{ w: 3, run: (c) => (book(c, 'Kleinbus für die Jugend', -25), 'Stilvoll im Vereinsbus. Die Kinder fühlen sich wie Profis.') }, { w: 1, run: (c) => (book(c, 'Kleinbus gratis vom Sponsor', 0), 'Der Autohändler verlangt nichts. „Für die Jugend immer."') }]) },
      {
        label: 'Dann fahren wir mit weniger Kindern',
        effect: outcome([
          { w: 2, run: () => 'Sieben Kinder fahren, zwei bleiben zu Hause. Die sind traurig.' },
          { w: 1, run: (c, ctx, rng) => { const k = rng.pick(c.youth.kids); k.joy = clamp01(k.joy - 0.2); return `${k.name.split(' ')[0]} muss zu Hause bleiben – zum dritten Mal. Er/sie hat keine Lust mehr.`; } },
          { w: 1, run: () => 'Ihr tretet mit einem weniger an und gewinnt trotzdem. Kinder sind unglaublich.' },
        ]),
      },
    ],
  },

  abwerbung: {
    weight: 1.8,
    needs: (c, rng) => {
      const prospects = (c.youth?.prospects ?? []).filter((idx) => playerOf(c, idx).rating >= 42 && !playerOf(c, idx).custom);
      if (prospects.length && rng.chance(0.4)) return { p: rng.pick(prospects), club: c.flags?.derbyRival ?? null };
      const k = kidPick(c, rng, (x) => x.talent >= 0.55 && x.age >= 10);
      return k ? { ...k, club: c.flags?.derbyRival ?? null } : null;
    },
    text: (c, ctx) => {
      const who = ctx.p != null ? `${playerOf(c, ctx.p).name} (A-Jugend)` : `${kidById(c, ctx.k).name} (${kidById(c, ctx.k).age})`;
      const rival = ctx.club ? c.clubs.find((x) => x.id === ctx.club)?.name ?? 'der Derby-Rivale' : 'ein Nachbarverein';
      return `Alarm: ${rival} will ${who} abwerben. Die Eltern haben schon ein Probetraining ausgemacht.`;
    },
    options: [
      {
        label: 'Mit der Familie reden – hier ist sein/ihr Zuhause',
        effect: outcome([
          { w: 3, run: (c, ctx) => (ctx.k && joy(c, ctx, 0.1), 'Die Familie bleibt. „Wir wussten nicht, dass er euch so wichtig ist."') },
          { w: 1.5, run: (c, ctx) => loseYouth(c, ctx, 'Das Gespräch war nett, aber die Entscheidung stand schon fest. Weg.') },
          { w: 1, run: (c, ctx) => (ctx.k && tal(c, ctx, 0.03), adjustEnergy(c, -3), 'Drei Abende Gespräche. Am Ende bleibt er – und trainiert motivierter als je zuvor.') },
          { w: 0.7, run: (c) => (adjustMood(c, 0.04), 'Als die Kabine davon hört, schreiben alle Spieler der ersten Mannschaft eine Nachricht an das Kind. Es bleibt.') },
        ]),
      },
      {
        label: 'Gegenangebot: Förderung (neue Schuhe & Extratraining, 40 €)',
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, 'Jugendförderung gegen Abwerbung', -40), ctx.k && joy(c, ctx, 0.15), ctx.k && tal(c, ctx, 0.03), 'Er bleibt – mit neuen Schuhen und einem Extratraining pro Woche beim Co-Trainer.') },
          { w: 1, run: (c, ctx) => (book(c, 'Jugendförderung gegen Abwerbung', -40), loseYouth(c, ctx, 'Er nimmt die Schuhe – und wechselt trotzdem.')) },
          { w: 1, run: (c) => (book(c, 'Jugendförderung gegen Abwerbung', -40), adjustMood(c, -0.03), 'Er bleibt. Aber jetzt wollen alle Jugendeltern neue Schuhe.') },
        ]),
      },
      {
        label: 'Ziehen lassen',
        effect: outcome([
          { w: 3, run: (c, ctx) => loseYouth(c, ctx, 'Er ist weg. Beim nächsten Jugendderby spielt er gegen euch.') },
          { w: 1, run: (c, ctx) => (ctx.k && joy(c, ctx, 0.05), 'Das Probetraining war ein Reinfall. Er kommt kleinlaut zurück.') },
          { w: 1, run: (c, ctx) => (book(c, 'Ablöse Jugend (Trikotsatz)', 30), loseYouth(c, ctx, 'Er geht, aber der andere Verein spendet als Wiedergutmachung einen Trikotsatz – 30 € gespart.')) },
        ]),
      },
    ],
  },

  talentsichtung: {
    weight: 1,
    needs: (c) => (!c.flags?.talentScout && c.round >= 2 ? {} : null),
    text: () => 'Die Grundschule fragt, ob der Verein eine Fußball-AG anbietet. Einmal die Woche, nach dem Unterricht.',
    options: [
      {
        label: 'Machen wir – ich komme selbst',
        effect: outcome([
          { w: 3, run: (c) => ((c.flags.talentScout = true), adjustEnergy(c, -5), 'Die AG ist voll. Im Sommer kommen mehr Kinder zum Schnuppertraining – und bessere.') },
          { w: 1, run: (c) => ((c.flags.talentScout = true), adjustEnergy(c, -8), book(c, 'Zuschuss der Schule', 50), 'Die Schule zahlt sogar 50 € Zuschuss. Anstrengend, aber es lohnt sich.') },
          { w: 1, run: (c) => (adjustEnergy(c, -5), 'Nach drei Wochen kommt keiner mehr. Die Kinder spielen lieber am Handy.') },
        ]),
      },
      { label: 'Der Jugendtrainer soll das machen', effect: outcome([{ w: 2, run: (c) => ((c.flags.talentScout = true), 'Er macht es gern. Die Kinder finden ihn toll.') }, { w: 1, run: (c) => ((c.youth.coach.quality = Math.max(0.1, c.youth.coach.quality - 0.05)), 'Er übernimmt sich und ist völlig überlastet.') }, { w: 1, run: (c) => ((c.flags.talentScout = true), (c.youth.coach.quality = Math.min(1, c.youth.coach.quality + 0.05)), 'Die AG macht ihn sogar besser – er macht jetzt einen Trainerschein.') }]) },
      { label: 'Keine Kapazität', effect: outcome([{ w: 3, run: () => 'Die Schule fragt den Nachbarverein.' }, { w: 1, run: () => 'Ein Elternteil bietet an, es zu machen. Vielleicht nächstes Jahr.' }]) },
    ],
  },
};

// --- Abwerben: in beide Richtungen ------------------------------------------------
const RIVAL_YOUTH = ['JSG Kanalbezirk', 'SV Blau-Weiß (Jugend)', 'FC Viktoria Oststadt', 'Kicker vom Kanal (Jugend)', 'TuS Grünwald'];

// Jede Saison: drei Talente bei anderen Vereinen, von denen man hört.
export function scoutList(c) {
  const y = c.youth;
  if (y.scoutSeason !== c.season) {
    const rng = createRng((c.seed * 29 + c.season * 211 + 3) >>> 0);
    y.scoutSeason = c.season;
    y.scouted = Array.from({ length: 3 }, () => ({ ...makeKid(c, rng, rng.int(10, 15), 0.12), club: rng.pick(RIVAL_YOUTH), status: 'open' }));
  }
  return y.scouted;
}

export const poachChance = (c, kid) => Math.max(0.1, Math.min(0.8, 0.3 + c.youth.coach.quality * 0.3 + (c.mood ?? 0) * 0.15 + (c.flags?.talentScout ? 0.1 : 0) - kid.talent * 0.25));

export function poachKid(c, id) {
  const kid = scoutList(c).find((k) => k.id === id);
  if (!kid || kid.status !== 'open' || !c.week || c.week.poached) return null;
  c.week.poached = true;
  adjustEnergy(c, -3);
  const rng = createRng((c.seed * 17 + c.round * 7 + id.length) >>> 0);
  if (rng.chance(poachChance(c, kid))) {
    kid.status = 'joined';
    const { club, status, ...rest } = kid;
    c.youth.kids.push({ ...rest, joy: Math.min(1, kid.joy + 0.1) });
    kid.reply = `${kid.name.split(' ')[0]} wechselt zu euch! Die Eltern fanden das Training bei ${club} „viel zu verbissen".`;
    return 'joined';
  }
  kid.status = 'declined';
  if (rng.chance(0.3)) {
    book(c, 'Beschwerde beim Kreis: Abwerbung', -20);
    kid.reply = `Abgeblitzt – und ${kid.club} beschwert sich beim Kreis. 20 € Verwaltungsstrafe.`;
  } else kid.reply = 'Die Eltern bleiben beim alten Verein. „Da sind seine Freunde."';
  return 'declined';
}

// Andere wollen deine Talente – der Derby-Rivale genauso wie der Nachbarverein.

function loseYouth(c, ctx, text) {
  if (ctx.p != null) {
    c.youth.prospects = c.youth.prospects.filter((i) => i !== ctx.p);
    const rival = ctx.club && c.clubs.find((x) => x.id === ctx.club);
    if (rival) rival.squad.push(ctx.p);
    else delete c.players[ctx.p];
  } else drop(c, ctx);
  return text;
}
