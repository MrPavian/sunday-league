// Jugendabteilung mit Jahrgängen: E-, D-, C- und B-Jugend. Kinder haben Talent
// (das man nur so genau sieht, wie der Jugendtrainer gut ist) und Spaß am
// Fußball. Zu viel Drill vergrault sie, zu wenig lässt Talent liegen. Mit 16
// wechseln sie in die A-Jugend und werden zu richtigen Spielern.
import { createRng } from '../core/rng.js';
import { tr } from '../core/i18n.js';
import { FIRST_NAMES, LAST_NAMES } from '../data/names.js';
import { generatePlayer, ratePlayer } from '../sim/generator.js';
import { book } from './finances.js';
import { addCustomPlayer, humanClub, playerOf } from './career.js';
import { adjustMood } from './events.js';
import { outcome } from './outcomes.js';
import { adjustEnergy, childAge } from './personal.js';
import { chronicle } from './sagas.js';

export const TEAMS = [
  { id: 'E', name: tr('E-Jugend', 'U11s'), ages: [8, 10] },
  { id: 'D', name: tr('D-Jugend', 'U13s'), ages: [11, 12] },
  { id: 'C', name: tr('C-Jugend', 'U15s'), ages: [13, 14] },
  { id: 'B', name: tr('B-Jugend', 'U17s'), ages: [15, 15] },
];
export const teamOfAge = (age) => TEAMS.find((t) => age >= t.ages[0] && age <= t.ages[1]) ?? null;
const GIRL_NAMES = ['Lena', 'Mia', 'Emma', 'Hannah', 'Lea', 'Sophie', 'Ela', 'Zoe', 'Ida', 'Merve'];

export const FOCUS = {
  spass: { name: tr('Spaß & Spiel', 'Fun & games'), desc: tr('Kleine Spiele, viel lachen. Kaum Fortschritt, aber keiner hört auf.', 'Small games, lots of laughing. Barely any progress, but nobody quits.'), growth: 0.004, joy: 0.05 },
  technik: { name: tr('Technik', 'Technique'), desc: tr('Ballgefühl, Passen, Annehmen. Gute Entwicklung, etwas zäh.', 'Touch, passing, first touch. Good development, a bit dull.'), growth: 0.012, joy: -0.02 },
  kondition: { name: tr('Kondition', 'Fitness'), desc: tr('Laufen, laufen, laufen. Bringt was, macht aber keinen Spaß.', 'Running, running, running. Does something, but no fun at all.'), growth: 0.009, joy: -0.05 },
  turnier: { name: tr('Turniervorbereitung', 'Tournament prep'), desc: tr('Spielzüge und Ehrgeiz. Gut für die Besten, Frust für die anderen.', 'Set moves and ambition. Great for the best, frustrating for the rest.'), growth: 0.008, joy: -0.01, elite: true },
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
    if (pos === 1) chronicle(c, tr(`Die ${t.name} wird Kreismeister!`, `The ${t.name} become district champions!`));
  }
  if (results.length) {
    y.results.push({ season: c.season, results });
    notes.push(tr(`Jugend: ${results.map((r) => `${r.team}-Jugend ${r.pos}. Platz`).join(', ')}.`, `Youth: ${results.map((r) => `${TEAMS.find((t) => t.id === r.team).name} ${r.pos}${r.pos === 1 ? 'st' : r.pos === 2 ? 'nd' : r.pos === 3 ? 'rd' : 'th'}`).join(', ')}.`));
  }
  // Aufhören: wer den Spaß verloren hat (und ab und zu einfach so)
  const quit = y.kids.filter((k) => k.joy < 0.3 || rng.chance(0.06));
  if (quit.length) notes.push(tr(`Aufgehört: ${quit.map((k) => k.name.split(' ')[0]).join(', ')}${quit.some((k) => k.joy < 0.3) ? ' – zu viel Drill, zu wenig Spaß' : ''}.`, `Quit: ${quit.map((k) => k.name.split(' ')[0]).join(', ')}${quit.some((k) => k.joy < 0.3) ? ' – too much drilling, not enough fun' : ''}.`));
  y.kids = y.kids.filter((k) => !quit.includes(k));
  for (const k of y.kids) k.age++;
  // 16 → A-Jugend (Mädchen ins Frauenteam, wenn es eins gibt)
  const grads = y.kids.filter((k) => k.age >= 16);
  y.kids = y.kids.filter((k) => k.age < 16);
  for (const k of grads) {
    if (k.girl) {
      if (c.saga?.frauen) {
        c.saga.frauen.strength = Math.min(0.9, c.saga.frauen.strength + k.talent * 0.05);
        notes.push(tr(`${k.name} wechselt aus der Jugend ins Frauenteam.`, `${k.name} moves up from the youth section to the women's team.`));
      }
      continue;
    }
    const idx = graduate(c, k, rng);
    notes.push(tr(`${playerOf(c, idx).name} kommt aus der eigenen B-Jugend in die A-Jugend (Stärke ${playerOf(c, idx).rating}).`, `${playerOf(c, idx).name} comes up from the club's own U17s to the U19s (strength ${playerOf(c, idx).rating}).`));
  }
  // Schnuppertraining im Sommer: 3–5 Neue, mit gutem Trainer und Talentsichtung mehr Talent
  const count = 3 + (y.coach.quality >= 0.6 ? 1 : 0) + (c.flags?.talentScout ? 1 : 0);
  for (let i = 0; i < count; i++) y.kids.push(makeKid(c, rng, rng.int(8, 10), c.flags?.talentScout ? 0.08 : 0));
  if (c.flags) c.flags.talentScout = false;
  notes.push(tr(`Schnuppertraining: ${count} neue Kinder in der E-Jugend.`, `Taster training: ${count} new kids in the U11s.`));
  return notes;
}

// Aus dem Kind wird ein Spieler mit 16 – Talent entscheidet über die Stufe.
function graduate(c, k, rng) {
  const tier = k.talent >= 0.9 ? 'dorfstar' : k.talent >= 0.72 ? 'stark' : k.talent >= 0.5 ? 'gut' : 'ok';
  const p = generatePlayer(rng, { role: k.position, tier });
  const player = { ...p, name: k.name, age: 16 - ((c.season ?? 1) - 1), profession: 'Schüler', position: k.position, backstory: tr('Aus der eigenen Jugend, seit der E-Jugend im Verein.', 'Came up through the club, at the youth section since the U11s.'), custom: 'youth' };
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
const kn = (c, ctx) => kidById(c, ctx.k)?.name.split(' ')[0] ?? tr('Das Kind', 'The kid');
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
    text: (c, ctx) => tr(`Der Vater von ${kn(c, ctx)} brüllt beim Jugendspiel so laut am Rand, dass der Schiri das Spiel unterbricht. ${kn(c, ctx)} weint in der Kabine.`, `${kn(c, ctx)}'s dad bellows so loudly from the touchline during the youth match that the ref stops play. ${kn(c, ctx)} cries in the dressing room.`),
    options: [
      {
        label: tr('Klares Gespräch mit dem Vater', 'A firm word with the father'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (joy(c, ctx, 0.15), (kidById(c, ctx.k).parent = null), tr('Er sieht es ein. Ab jetzt steht er still am Rand – mit verschränkten Armen, aber still.', 'He takes it on board. From now on he stands quietly on the touchline – arms folded, but quiet.')) },
          { w: 1.5, run: (c, ctx) => (joy(c, ctx, -0.1), tr('Er fühlt sich angegriffen: „Ich will doch nur das Beste für ihn."', 'He feels got at: "I just want what\'s best for him."')) },
          { w: 1, run: (c, ctx) => (drop(c, ctx), tr(`Der Vater meldet ${kn(c, ctx)} ab – beim großen Stadtverein. „Da wird wenigstens gefördert."`, `The father pulls ${kn(c, ctx)} out – off to the big city club. "At least they get proper coaching there."`)) },
          { w: 1, run: (c, ctx) => ((kidById(c, ctx.k).parent = 'engagiert'), book(c, tr('Spende vom geläuterten Vater', 'Donation from the reformed father'), 40), tr('Nach dem Gespräch wird er zum Helfer: Er fährt jetzt jedes Auswärtsspiel und spendet 40 € für Bälle.', 'After the talk he turns into a helper: he now drives to every away game and donates (€40) for balls.')) },
        ]),
      },
      {
        label: tr('Platzverbot für Eltern beim nächsten Spiel', 'Ban parents from the touchline next match'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (joy(c, ctx, 0.2), adjustMood(c, 0.02), tr('Ohne Eltern am Rand spielen die Kinder befreit auf. Bestes Spiel der Saison.', 'Without parents on the touchline the kids play with total freedom. Best game of the season.')) },
          { w: 2, run: (c) => (adjustMood(c, -0.03), tr('Mehrere Eltern beschweren sich beim Vorstand. „Kollektivstrafe!"', 'Several parents complain to the committee. "Collective punishment!"')) },
          { w: 1, run: (c, ctx) => (drop(c, ctx), tr('Der Vater nimmt es persönlich. Sein Kind kommt nicht mehr.', 'The father takes it personally. His kid stops coming.')) },
        ]),
      },
      {
        label: tr('Lassen, der beruhigt sich', 'Leave it, he\'ll calm down'),
        effect: outcome([
          { w: 3, run: (c, ctx) => joy(c, ctx, -0.15) ?? tr(`${kn(c, ctx)} hat immer weniger Lust auf Fußball.`, `${kn(c, ctx)} is losing the taste for football.`) },
          { w: 1, run: () => tr('Nächste Woche ist er tatsächlich leiser.', 'Next week he\'s actually quieter.') },
          { w: 1, run: (c, ctx) => (tal(c, ctx, 0.04), joy(c, ctx, -0.2), tr(`Der Druck macht ${kn(c, ctx)} besser – und unglücklicher.`, `The pressure makes ${kn(c, ctx)} better – and more miserable.`)) },
        ]),
      },
    ],
  },

  nlz_anfrage: {
    weight: 1,
    needs: (c, rng) => kidPick(c, rng, (k) => k.talent >= 0.7 && k.age >= 11),
    text: (c, ctx) => tr(`Ein Scout vom Nachwuchsleistungszentrum des großen Stadtvereins hat ${kn(c, ctx)} (${kidById(c, ctx.k).age}) beobachtet. Sie wollen ${kidById(c, ctx.k).girl ? 'sie' : 'ihn'} holen.`, `A scout from the big city club's academy has been watching ${kn(c, ctx)} (${kidById(c, ctx.k).age}). They want to sign ${kidById(c, ctx.k).girl ? 'her' : 'him'}.`),
    options: [
      {
        label: tr('Viel Glück! (Ausbildungsentschädigung 80 €)', 'Good luck to them! (training compensation €80)'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, tr('Ausbildungsentschädigung NLZ', 'Academy training compensation'), 80), chronicle(c, tr(`${kidById(c, ctx.k).name} aus der eigenen Jugend wechselt ins Nachwuchsleistungszentrum.`, `${kidById(c, ctx.k).name}, from the club's own youth section, moves to the academy.`)), drop(c, ctx), adjustMood(c, 0.05), tr('Der Wechsel ist perfekt. Der Verein ist stolz – und 80 € reicher.', 'The move goes through. The club is proud – and (€80) richer.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Ausbildungsentschädigung NLZ', 'Academy training compensation'), 80), drop(c, ctx), tr('Wechsel perfekt. Die Mitspieler vermissen ihn/sie jetzt schon.', 'Move goes through. The team-mates already miss them.')) },
          { w: 1, run: (c, ctx) => (joy(c, ctx, 0.2), tr(`${kn(c, ctx)} will gar nicht wechseln: „Hier sind meine Freunde." Bleibt.`, `${kn(c, ctx)} doesn't want to move at all: "My friends are here." Stays.`)) },
        ]),
      },
      {
        label: tr('Den Eltern abraten – hier wächst er/sie in Ruhe', 'Advise the parents against it – he/she can grow up here in peace'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (joy(c, ctx, 0.1), tr('Die Eltern sind einverstanden. Talent bleibt im Dorf.', 'The parents agree. The talent stays in the village.')) },
          { w: 2, run: (c, ctx) => (drop(c, ctx), tr('Die Eltern entscheiden anders. Weg ist er/sie – ohne Entschädigung.', 'The parents decide otherwise. Off they go – no compensation.')) },
          { w: 1, run: (c, ctx) => (tal(c, ctx, -0.05), joy(c, ctx, -0.1), tr(`${kn(c, ctx)} bleibt, fragt sich aber, was gewesen wäre.`, `${kn(c, ctx)} stays, but wonders what might have been.`)) },
        ]),
      },
    ],
  },

  kuchenbasar: {
    weight: 1.5,
    needs: (c) => ((c.youth?.kids ?? []).length >= 5 ? {} : null),
    text: () => tr('Die Jugendeltern wollen einen Kuchenbasar am Heimspieltag machen – für neue Trikots der E-Jugend.', 'The youth parents want to hold a cake sale on home matchday – to fund new shirts for the U11s.'),
    options: [
      {
        label: tr('Klar, ich backe auch was', 'Sure, I\'ll bake something too'),
        effect: outcome([
          { w: 3, run: (c, ctx, rng) => { const n = rng.int(60, 130); book(c, tr('Kuchenbasar der Jugend', 'Youth cake sale'), n); adjustMood(c, 0.04); return tr(`${n} € für die Jugend! Dein Marmorkuchen war als Erstes weg.`, `(€${n}) for the youth section! Your marble cake sold out first.`); } },
          { w: 1, run: (c) => (book(c, tr('Kuchenbasar der Jugend', 'Youth cake sale'), 35), tr('Regen. Nur 35 €, aber viel Kuchen für die Kabine.', 'Rain. Only (€35), but plenty of cake left for the dressing room.')) },
          { w: 1, run: (c) => (book(c, tr('Kuchenbasar der Jugend', 'Youth cake sale'), 90), adjustEnergy(c, -4), tr('Du stehst vier Stunden am Stand. 90 € – und du kannst keinen Kuchen mehr sehen.', 'You stand at the stall for four hours. (€90) – and you never want to see cake again.')) },
        ]),
      },
      { label: tr('Macht mal, ich hab keine Zeit', 'You do it, I\'ve no time'), effect: outcome([{ w: 3, run: (c, ctx, rng) => (book(c, tr('Kuchenbasar der Jugend', 'Youth cake sale'), rng.int(40, 80)), tr('Die Eltern ziehen es ohne dich durch. Klappt auch.', 'The parents pull it off without you. Works fine too.')) }, { w: 1, run: (c) => (adjustMood(c, -0.02), tr('Ein paar Eltern finden, der Trainer sollte sich auch mal zeigen.', 'A few parents think the manager should show his face sometimes.')) }]) },
    ],
  },

  fahrgemeinschaft: {
    weight: 1.2,
    needs: (c) => ((c.youth?.kids ?? []).length >= 6 ? {} : null),
    text: () => tr('Auswärtsspiel der D-Jugend, 40 km weg – und nur zwei Eltern haben Zeit zu fahren. Es fehlen drei Plätze.', 'The U13s have an away game, 40km off – and only two parents have time to drive. Three seats short.'),
    options: [
      {
        label: tr('Ich fahre selbst', 'I\'ll drive myself'),
        effect: outcome([
          { w: 3, run: (c) => (adjustEnergy(c, -4), adjustMood(c, 0.03), tr('Neun Kinder, zwei Autos, eine Schlager-Playlist. Die Kinder lieben dich.', 'Nine kids, two cars, one cheesy pop playlist. The kids love you.')) },
          { w: 1, run: (c) => (adjustEnergy(c, -6), tr('Auf der Rückfahrt wird einem Kind schlecht. Du reinigst die Rückbank bis Mitternacht.', 'On the way back a kid feels sick. You\'re cleaning the back seat until midnight.')) },
          { w: 1, run: (c) => { for (const k of c.youth.kids) k.joy = clamp01(k.joy + 0.05); adjustEnergy(c, -4); return tr('Ihr gewinnt 5:1. Auf der Heimfahrt singen alle – sogar du.', 'You win 5-1. On the drive home everyone sings – even you.'); } },
        ]),
      },
      { label: tr('Kleinbus vom Autohaus leihen (25 €)', 'Borrow a minibus from the dealership (€25)'), effect: outcome([{ w: 3, run: (c) => (book(c, tr('Kleinbus für die Jugend', 'Minibus for the youth section'), -25), tr('Stilvoll im Vereinsbus. Die Kinder fühlen sich wie Profis.', 'Travelling in style in the club bus. The kids feel like pros.')) }, { w: 1, run: (c) => (book(c, tr('Kleinbus gratis vom Sponsor', 'Free minibus from the sponsor'), 0), tr('Der Autohändler verlangt nichts. „Für die Jugend immer."', 'The dealer won\'t take a penny. "Always happy to help the youth section."')) }]) },
      {
        label: tr('Dann fahren wir mit weniger Kindern', 'Then we\'ll take fewer kids'),
        effect: outcome([
          { w: 2, run: () => tr('Sieben Kinder fahren, zwei bleiben zu Hause. Die sind traurig.', 'Seven kids go, two stay home. They\'re gutted.') },
          { w: 1, run: (c, ctx, rng) => { const k = rng.pick(c.youth.kids); k.joy = clamp01(k.joy - 0.2); return tr(`${k.name.split(' ')[0]} muss zu Hause bleiben – zum dritten Mal. Er/sie hat keine Lust mehr.`, `${k.name.split(' ')[0]} has to stay home – for the third time. Losing all enthusiasm.`); } },
          { w: 1, run: () => tr('Ihr tretet mit einem weniger an und gewinnt trotzdem. Kinder sind unglaublich.', 'You take the field a man short and win anyway. Kids are incredible.') },
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
      const who = ctx.p != null ? tr(`${playerOf(c, ctx.p).name} (A-Jugend)`, `${playerOf(c, ctx.p).name} (U19s)`) : `${kidById(c, ctx.k).name} (${kidById(c, ctx.k).age})`;
      const rival = ctx.club ? c.clubs.find((x) => x.id === ctx.club)?.name ?? tr('der Derby-Rivale', 'the derby rival') : tr('ein Nachbarverein', 'a neighbouring club');
      return tr(`Alarm: ${rival} will ${who} abwerben. Die Eltern haben schon ein Probetraining ausgemacht.`, `Alert: ${rival} want to poach ${who}. The parents have already arranged a trial.`);
    },
    options: [
      {
        label: tr('Mit der Familie reden – hier ist sein/ihr Zuhause', 'Talk to the family – this is his/her home'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (ctx.k && joy(c, ctx, 0.1), tr('Die Familie bleibt. „Wir wussten nicht, dass er euch so wichtig ist."', 'The family stays. "We didn\'t know you cared about him this much."')) },
          { w: 1.5, run: (c, ctx) => loseYouth(c, ctx, tr('Das Gespräch war nett, aber die Entscheidung stand schon fest. Weg.', 'The talk was nice, but the decision was already made. Gone.')) },
          { w: 1, run: (c, ctx) => (ctx.k && tal(c, ctx, 0.03), adjustEnergy(c, -3), tr('Drei Abende Gespräche. Am Ende bleibt er – und trainiert motivierter als je zuvor.', 'Three evenings of talks. In the end he stays – and trains harder than ever.')) },
          { w: 0.7, run: (c) => (adjustMood(c, 0.04), tr('Als die Kabine davon hört, schreiben alle Spieler der ersten Mannschaft eine Nachricht an das Kind. Es bleibt.', 'When the dressing room hears about it, every first-team player sends the kid a message. It stays.')) },
        ]),
      },
      {
        label: tr('Gegenangebot: Förderung (neue Schuhe & Extratraining, 40 €)', 'Counter-offer: support package (new boots & extra training, €40)'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, tr('Jugendförderung gegen Abwerbung', 'Youth support against poaching'), -40), ctx.k && joy(c, ctx, 0.15), ctx.k && tal(c, ctx, 0.03), tr('Er bleibt – mit neuen Schuhen und einem Extratraining pro Woche beim Co-Trainer.', 'He stays – with new boots and an extra training session a week with the assistant manager.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Jugendförderung gegen Abwerbung', 'Youth support against poaching'), -40), loseYouth(c, ctx, tr('Er nimmt die Schuhe – und wechselt trotzdem.', 'He takes the boots – and switches anyway.'))) },
          { w: 1, run: (c) => (book(c, tr('Jugendförderung gegen Abwerbung', 'Youth support against poaching'), -40), adjustMood(c, -0.03), tr('Er bleibt. Aber jetzt wollen alle Jugendeltern neue Schuhe.', 'He stays. But now every youth parent wants new boots too.')) },
        ]),
      },
      {
        label: tr('Ziehen lassen', 'Let him go'),
        effect: outcome([
          { w: 3, run: (c, ctx) => loseYouth(c, ctx, tr('Er ist weg. Beim nächsten Jugendderby spielt er gegen euch.', 'He\'s gone. At the next youth derby he plays against you.')) },
          { w: 1, run: (c, ctx) => (ctx.k && joy(c, ctx, 0.05), tr('Das Probetraining war ein Reinfall. Er kommt kleinlaut zurück.', 'The trial was a flop. He comes back with his tail between his legs.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Ablöse Jugend (Trikotsatz)', 'Youth transfer fee (kit set)'), 30), loseYouth(c, ctx, tr('Er geht, aber der andere Verein spendet als Wiedergutmachung einen Trikotsatz – 30 € gespart.', 'He leaves, but the other club donates a kit set by way of apology – (€30) saved.'))) },
        ]),
      },
    ],
  },

  talentsichtung: {
    weight: 1,
    needs: (c) => (!c.flags?.talentScout && c.round >= 2 ? {} : null),
    text: () => tr('Die Grundschule fragt, ob der Verein eine Fußball-AG anbietet. Einmal die Woche, nach dem Unterricht.', 'The primary school asks if the club can run a football club. Once a week, after lessons.'),
    options: [
      {
        label: tr('Machen wir – ich komme selbst', 'Let\'s do it – I\'ll run it myself'),
        effect: outcome([
          { w: 3, run: (c) => ((c.flags.talentScout = true), adjustEnergy(c, -5), tr('Die AG ist voll. Im Sommer kommen mehr Kinder zum Schnuppertraining – und bessere.', 'The club is full. In summer more kids come to taster training – and better ones.')) },
          { w: 1, run: (c) => ((c.flags.talentScout = true), adjustEnergy(c, -8), book(c, tr('Zuschuss der Schule', 'Grant from the school'), 50), tr('Die Schule zahlt sogar 50 € Zuschuss. Anstrengend, aber es lohnt sich.', 'The school even chips in (€50). Exhausting, but worth it.')) },
          { w: 1, run: (c) => (adjustEnergy(c, -5), tr('Nach drei Wochen kommt keiner mehr. Die Kinder spielen lieber am Handy.', 'After three weeks nobody shows up any more. The kids would rather be on their phones.')) },
        ]),
      },
      { label: tr('Der Jugendtrainer soll das machen', 'Let the youth coach handle it'), effect: outcome([{ w: 2, run: (c) => ((c.flags.talentScout = true), tr('Er macht es gern. Die Kinder finden ihn toll.', 'He\'s happy to. The kids think he\'s great.')) }, { w: 1, run: (c) => ((c.youth.coach.quality = Math.max(0.1, c.youth.coach.quality - 0.05)), tr('Er übernimmt sich und ist völlig überlastet.', 'He takes on too much and is completely overloaded.')) }, { w: 1, run: (c) => ((c.flags.talentScout = true), (c.youth.coach.quality = Math.min(1, c.youth.coach.quality + 0.05)), tr('Die AG macht ihn sogar besser – er macht jetzt einen Trainerschein.', 'Running the club even makes him better – he\'s now doing a coaching badge.')) }]) },
      { label: tr('Keine Kapazität', 'No capacity for it'), effect: outcome([{ w: 3, run: () => tr('Die Schule fragt den Nachbarverein.', 'The school asks the neighbouring club instead.') }, { w: 1, run: () => tr('Ein Elternteil bietet an, es zu machen. Vielleicht nächstes Jahr.', 'A parent offers to run it. Maybe next year.') }]) },
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
    kid.reply = tr(`${kid.name.split(' ')[0]} wechselt zu euch! Die Eltern fanden das Training bei ${club} „viel zu verbissen".`, `${kid.name.split(' ')[0]} is switching to you! The parents found training at ${club} "far too intense".`);
    return 'joined';
  }
  kid.status = 'declined';
  if (rng.chance(0.3)) {
    book(c, tr('Beschwerde beim Kreis: Abwerbung', 'Complaint to the league: poaching'), -20);
    kid.reply = tr(`Abgeblitzt – und ${kid.club} beschwert sich beim Kreis. 20 € Verwaltungsstrafe.`, `Rebuffed – and ${kid.club} complains to the league. (€20) administrative fine.`);
  } else kid.reply = tr('Die Eltern bleiben beim alten Verein. „Da sind seine Freunde."', 'The parents stay with the old club. "That\'s where his friends are."');
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
