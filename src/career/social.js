// Ereignisse aus dem Beziehungsnetz und den Dossiers: Rivalen geraten aneinander,
// ein Geheimnis macht die Runde, aus zwei Mitspielern werden Kumpels.
import { DOSSIER, dossierIndex, RUMOR_CHAT } from '../data/backstories.js';
import { book } from './finances.js';
import { humanClub, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { isCoach } from './personal.js';
import { relationOf, relationsAmong, setRelation } from './relations.js';

const first = (c, idx) => playerOf(c, idx).name.split(' ')[0];
const regulars = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx) && !playerOf(c, idx).custom);

export const SOCIAL_EVENTS = {
  rivalen_zoff: {
    weight: 3,
    needs: (c, rng) => {
      const pairs = relationsAmong(c, regulars(c)).filter((p) => p.type === 'rivalen');
      return pairs.length ? { ...rng.pick(pairs) } : null;
    },
    text: (c, ctx) => `${first(c, ctx.a)} und ${first(c, ctx.b)} geraten beim Abschlussspiel aneinander. Wieder mal. Einer schubst, der andere schreit.`,
    options: [
      {
        label: 'Aussprache am Tresen (Runde 15 €)',
        effect: (c, ctx, rng) => {
          book(c, 'Versöhnungsrunde', -15);
          if (rng.chance(0.55)) {
            setRelation(c, ctx.a, ctx.b, null);
            adjustMood(c, 0.05);
            return 'Nach dem dritten Bier umarmen sie sich. Keine Kumpels, aber der Streit ist beigelegt.';
          }
          return 'Sie reden, trinken, schweigen. Das wird so schnell nichts mehr.';
        },
      },
      {
        label: 'Beide eine Woche auf die Bank',
        effect: (c, ctx) => {
          for (const idx of [ctx.a, ctx.b]) {
            c.players[idx].grumpy = 2;
            if (c.week?.availability[idx] === 'yes') c.week.availability[idx] = 'late';
          }
          adjustMood(c, 0.03);
          return 'Ansage vor versammelter Mannschaft. Die beiden sitzen Sonntag zur ersten Halbzeit draußen – nebeneinander.';
        },
      },
      { label: 'Sollen sie das unter sich klären', effect: (c) => (adjustMood(c, -0.04), 'Die Kabine ist geteilt. Die einen halten zu dem einen, die anderen zum anderen.') },
    ],
  },

  geheimnis_auf: {
    weight: 2,
    needs: (c, rng) => {
      if (c.round < 2) return null;
      const list = regulars(c).filter((idx) => (c.players[idx]?.dossier ?? 0) < 4);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => {
      const p = playerOf(c, ctx.s);
      const secret = DOSSIER.geheimnis[dossierIndex(ctx.s, 3, DOSSIER.geheimnis.length)]({ first: first(c, ctx.s), age: p.age, profession: p.profession });
      return RUMOR_CHAT[ctx.s % RUMOR_CHAT.length](first(c, ctx.s), secret);
    },
    options: [
      {
        label: 'Öffentlich zu ihm halten',
        effect: (c, ctx) => {
          const rec = c.players[ctx.s];
          rec.dossier = 4;
          rec.loyal = true;
          adjustForm(c, ctx.s, 0.3);
          return `„Jeder hat seine Geschichte. Thema durch." ${first(c, ctx.s)} schreibt dir privat: „Danke, Trainer."`;
        },
      },
      {
        label: 'Mitlachen',
        effect: (c, ctx) => {
          c.players[ctx.s].dossier = 4;
          c.players[ctx.s].grumpy = 3;
          adjustMood(c, 0.03);
          return `Die Gruppe lacht. ${first(c, ctx.s)} lacht nicht mit.`;
        },
      },
      { label: 'Nichts dazu sagen', effect: (c, ctx) => ((c.players[ctx.s].dossier = 4), 'Nach einem Tag redet keiner mehr drüber. Fast keiner.') },
    ],
  },

  neue_freunde: {
    weight: 2,
    needs: (c, rng) => {
      const list = regulars(c);
      for (let i = 0; i < 12 && list.length > 1; i++) {
        const a = rng.pick(list);
        const b = rng.pick(list);
        if (a !== b && relationOf(c, a, b) === null) return { a, b };
      }
      return null;
    },
    text: (c, ctx) => `${first(c, ctx.a)} und ${first(c, ctx.b)} fahren seit ein paar Wochen zusammen zum Training. Jetzt waren sie auch zusammen beim Grillen.`,
    options: [
      { label: 'Schön zu sehen', effect: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'kumpel'), 'Aus Mitspielern werden Kumpels. Auf dem Platz finden sie sich blind.') },
    ],
  },
};
