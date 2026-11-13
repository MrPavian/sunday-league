// Rivalität zwischen Trainern (ROADMAP 11.18 Punkt 12, 2026-11-13). Neben den Rivalitäten zwischen Vereinen (rivals.js) gibt es
// höchstens einen Trainer, der dir persönlich im Nacken sitzt: Er entsteht aus einer deutlichen Niederlage oder daraus, dass
// derselbe Verein dich in einer Saison zweimal schlägt, bekommt einen Namen und eine Bilanz mit dir – und er zieht dir nach.
// Bist du in eine andere Liga gewechselt oder aufgestiegen, übernimmt er in einer der nächsten Sommerpausen einen Verein deiner
// neuen Liga. Duelle mit ihm schlagen stärker auf die Stimmung; vor dem Spiel stichelt er in der Zeitung, danach geht es um den
// Handschlag. Alle Schwellen, Chancen und Wirkungen sind Spielwerte. Eigener Zufall (hash): kein bestehender Zufallsstrom
// verschiebt sich.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { FIRST_NAMES, LAST_NAMES } from '../data/names.js';
import { clubById, humanClub, humanFixture } from './career.js';
import { adjustMood } from './events.js';
import { outcome } from './outcomes.js';
import { isPresident } from './personal.js';

export const NEMESIS = {
  margin: 3, // Niederlage mit so vielen Toren Abstand: Er hat dich vorgeführt
  twice: 2, // oder so viele Niederlagen gegen denselben Verein in einer Saison
  follow: 0.5, // Chance je Sommerpause, dass er dir in deine Liga folgt
  win: 0.04, // Stimmung nach einem Sieg gegen ihn
  loss: -0.03, // … nach einer Niederlage
  heatMax: 5,
};
const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x51ed270b);
const rngFor = (c, salt) => createRng(hash(c.seed >>> 0, c.season ?? 1, c.round ?? 0, salt));

export const nemesis = (c) => c.nemesis ?? null;
export const nemesisHere = (c) => !!c.nemesis && !!clubById(c, c.nemesis.club) && !clubById(c, c.nemesis.club).human;
export const facesNemesis = (c) => {
  const f = humanFixture(c);
  const me = humanClub(c).id;
  return nemesisHere(c) && !!f && (f.home === c.nemesis.club || f.away === c.nemesis.club) && (f.home === me || f.away === me);
};
export const record = (n) => tr(`${n.w} Siege, ${n.d} Remis, ${n.l} Niederlagen`, `${n.w} wins, ${n.d} draws, ${n.l} defeats`);
const trust = (c, d) => {
  if (c.board) c.board.trust = Math.max(0, Math.min(100, c.board.trust + d));
};
const heat = (c, d) => {
  c.nemesis.heat = Math.max(0, Math.min(NEMESIS.heatMax, (c.nemesis.heat ?? 1) + d));
};
const news = (c, text) => (c.pendingNews ??= []).push(text);
const note = (c, text) => {
  c.nemesis.notes = [...(c.nemesis.notes ?? []), { season: c.season, text }].slice(-4);
};

function create(c, club, gf, ga) {
  const rng = rngFor(c, 11);
  const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  c.nemesis = { name, club: club.id, clubName: club.name, since: c.season, w: 0, d: 0, l: 1, heat: 1, notes: [] };
  note(c, tr(`${c.season}: ${gf}:${ga} gegen ${club.name}.`, `${c.season}: ${gf}-${ga} against ${club.name}.`));
  news(c, tr(`Kreisblatt: ${name}, Trainer von ${club.name}, nach dem ${ga}:${gf}: „Gegen die spielen wir immer gern.“ Den Namen merkst du dir.`, `District Gazette: ${name}, manager of ${club.name}, after the ${ga}-${gf}: "We always enjoy playing them." You make a note of the name.`));
}

// Nach dem Spieltag: Bilanz führen oder den Rivalen entstehen lassen.
export function finishRound(c) {
  if (isPresident(c)) return;
  const me = humanClub(c);
  const f = c.fixtures?.[c.round - 1]?.find((x) => x.home === me.id || x.away === me.id);
  if (!f?.result) return;
  const oppId = f.home === me.id ? f.away : f.home;
  const opp = clubById(c, oppId);
  if (!opp) return;
  const [gf, ga] = f.home === me.id ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
  const n = c.nemesis;
  if (n && n.club === oppId) {
    if (gf > ga) (n.w++, adjustMood(c, NEMESIS.win));
    else if (gf < ga) (n.l++, adjustMood(c, NEMESIS.loss));
    else n.d++;
    n.last = { season: c.season, round: c.round, result: Math.sign(gf - ga), score: `${gf}:${ga}` };
    note(c, tr(`${c.season}: ${gf}:${ga} gegen ${opp.name}.`, `${c.season}: ${gf}-${ga} against ${opp.name}.`));
    return;
  }
  if (n || gf >= ga) return;
  const lost = (c.nemesisLost ??= { season: c.season, by: {} });
  if (lost.season !== c.season) Object.assign(lost, { season: c.season, by: {} });
  lost.by[oppId] = (lost.by[oppId] ?? 0) + 1;
  if (ga - gf >= NEMESIS.margin || lost.by[oppId] >= NEMESIS.twice) {
    create(c, opp, gf, ga);
    delete c.nemesisLost;
  }
}

// Sommerpause: Ist er nicht (mehr) in deiner Liga, folgt er dir vielleicht.
export function nextSeason(c) {
  const n = c.nemesis;
  if (!n) return;
  n.heat = Math.max(1, (n.heat ?? 1) - 1);
  const here = clubById(c, n.club);
  if (here && !here.human) return void (n.clubName = here.name);
  const rng = rngFor(c, 23);
  if (!rng.chance(NEMESIS.follow)) return;
  const free = c.clubs.filter((x) => !x.human);
  if (!free.length) return;
  const club = rng.pick(free);
  const old = n.clubName;
  Object.assign(n, { club: club.id, clubName: club.name });
  news(c, tr(`Alter Bekannter: ${n.name}, früher ${old}, hat ${club.name} übernommen. Eure Bilanz: ${record(n)}.`, `An old acquaintance: ${n.name}, formerly of ${old}, has taken over ${club.name}. Your record: ${record(n)}.`));
}

// Zu Wochenbeginn: In der Woche des Wiedersehens weiß es die Gruppe.
export function startWeek(c) {
  const w = c.week;
  if (!w?.chat || w.breakWeek || !facesNemesis(c)) return;
  const n = c.nemesis;
  w.chat.push({ from: null, text: tr(`Sonntag gegen ${n.clubName} – und gegen ${n.name}. Bilanz des Trainers gegen ihn: ${record(n)}.`, `Sunday against ${n.clubName} – and against ${n.name}. The gaffer's record against him: ${record(n)}.`), time: 'Mo 07:50', nemesis: true });
}

const once = (c, id) => (c.eventLog ?? []).some((e) => e.id === id && e.season === c.season);

export const NEMESIS_EVENTS = {
  // Vor dem Duell stichelt er in der Zeitung.
  tr_stichelei: {
    weight: 6,
    needs: (c) => (facesNemesis(c) && !isPresident(c) && !once(c, 'tr_stichelei') ? { name: c.nemesis.name, club: c.nemesis.clubName } : null),
    text: (c, ctx) => tr(`${ctx.name} (${ctx.club}) vor dem Spiel in der Zeitung: „Ich weiß, wie man gegen diesen Trainer gewinnt. Das habe ich oft genug gezeigt.“ Bilanz: ${record(c.nemesis)}.`, `${ctx.name} (${ctx.club}) in the paper before the game: "I know how to beat this manager. I have shown it often enough." Record: ${record(c.nemesis)}.`),
    options: [
      {
        label: tr('Kontern: „Am Sonntag reden wir weiter.“', 'Hit back: "We will talk on Sunday."'),
        effect: outcome([
          { w: 2, run: (c) => (heat(c, 1), adjustMood(c, 0.04), tr('Die Kabine liebt es. Der Ausschnitt hängt am Schwarzen Brett, das Spiel hat jetzt eine Vorgeschichte mehr.', 'The dressing room loves it. The cutting goes up on the noticeboard; the game now has one more chapter of history.')) },
          { w: 1, run: (c) => (heat(c, 1), trust(c, -1), adjustMood(c, 0.02), tr('Die Kabine grinst, der Vorstand weniger: „Wir führen unsere Duelle auf dem Platz.“', 'The dressing room grins, the board less so: "We fight our duels on the pitch."')) },
        ]),
      },
      { label: tr('Nichts sagen', 'Say nothing'), effect: () => tr('Du lässt die Zeitung liegen. Die Antwort gibt es am Sonntag – oder eben nicht.', 'You leave the paper where it is. The answer comes on Sunday – or it does not.') },
      { label: tr('Ihn loben: „Er macht gute Arbeit.“', 'Praise him: "He does a good job."'), effect: (c) => (heat(c, -1), trust(c, 1), tr('Damit hat er nicht gerechnet. Der Vorstand schätzt die Größe, in der Kabine wundert sich der eine oder andere.', 'He did not see that coming. The board appreciates the class; one or two in the dressing room are puzzled.')) },
    ],
  },
  // Nach dem Duell: der Handschlag.
  tr_handschlag: {
    weight: 30,
    followUp: true,
    needs: (c) => {
      const n = c.nemesis;
      if (!n?.last || isPresident(c) || n.last.season !== c.season || n.last.round !== c.round || n.last.asked) return null;
      return { name: n.name, result: n.last.result, score: n.last.score };
    },
    text: (c, ctx) => (ctx.result > 0
      ? tr(`Nach dem ${ctx.score} lässt dich ${ctx.name} am Spielfeldrand stehen und geht ohne Handschlag in die Kabine. Ein Reporter hat es gesehen.`, `After the ${ctx.score.replace(':', '-')}, ${ctx.name} leaves you standing on the touchline and walks off without a handshake. A reporter saw it.`)
      : ctx.result < 0
        ? tr(`Nach dem ${ctx.score} drückt dir ${ctx.name} lange die Hand und lächelt: „Wie immer ein Vergnügen.“`, `After the ${ctx.score.replace(':', '-')}, ${ctx.name} holds your hand a long time and smiles: "A pleasure, as always."`)
        : tr(`${ctx.score}. ${ctx.name} kommt nach dem Abpfiff auf dich zu: „Irgendwann entscheidet sich das zwischen uns.“`, `${ctx.score.replace(':', '-')}. ${ctx.name} walks up to you after the final whistle: "One day this will be settled between us."`)),
    options: [
      {
        label: tr('Größe zeigen', 'Show class'),
        effect: (c, ctx) => ((c.nemesis.last.asked = true), heat(c, -1), trust(c, 1), ctx.result > 0
          ? tr('„Jeder verliert anders.“ Mehr sagst du nicht. Der Vorstand ist stolz auf seinen Trainer.', '"Everyone loses in their own way." You say no more. The board is proud of its manager.')
          : tr('Du gratulierst, ehrlich und kurz. Das nimmt ihm den Wind aus den Segeln.', 'You congratulate him, honestly and briefly. That takes the wind out of his sails.')),
      },
      {
        label: tr('Einen Spruch zurückgeben', 'Give one back'),
        effect: (c, ctx) => ((c.nemesis.last.asked = true), heat(c, 1), adjustMood(c, ctx.result < 0 ? 0.03 : 0.02), ctx.result > 0
          ? tr('„Den Handschlag hole ich mir im Rückspiel.“ Am Montag steht es in der Zeitung, die Jungs feiern den Satz.', '"I will collect that handshake in the return game." It is in Monday\'s paper; the lads love the line.')
          : tr('„Genieß es. Es war das letzte Mal.“ Die Kabine hat es gehört und nimmt es mit ins nächste Duell.', '"Enjoy it. It was the last time." The dressing room heard it and takes it into the next meeting.')),
      },
    ],
  },
};
