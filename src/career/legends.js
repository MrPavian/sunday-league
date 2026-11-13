// Legenden des Vereins (ROADMAP 11.18 Punkt 14, 2026-11-13). Wer nach vielen Spielen oder Toren aufhört (alumni: youth.js,
// injuries.js), wird Vereinslegende: Der Vorstand fragt, wie der Verein ihn verabschiedet – Abschiedsspiel, Trikot an die Wand
// des Vereinsheims oder ein Blumenstrauß. Legenden stehen im Museum auf einer eigenen Tafel und schauen später beim Training
// vorbei. Mit fester Rückennummer (numbers.js, ab der Kreisklasse C) kann sie gesperrt werden; die Sperre läuft nach zehn
// Saisons ab und lässt sich im Museum früher aufheben.
// Schwellen, Geld und Wirkungen sind Spielwerte.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { first } from './outcomes.js';
import { isCoach } from './personal.js';
import { RETIRE_MAX, retireNumber } from './numbers.js';

export const LEGEND = {
  apps: 100, // so viele Spiele für den Verein …
  goals: 50, // … oder so viele Tore
  gate: 40, // Einnahme des Abschiedsspiels je Ligastufe (€)
};
export const HONOURS = {
  spiel: tr('Abschiedsspiel', 'Farewell match'),
  trikot: tr('Trikot hängt im Vereinsheim', 'Shirt hangs in the clubhouse'),
  blumen: tr('Blumenstrauß', 'Bouquet'),
  nummer: tr('Rückennummer gesperrt', 'Shirt number retired'),
};
export const isLegend = (a) => (a?.apps ?? 0) >= LEGEND.apps || (a?.goals ?? 0) >= LEGEND.goals;
export const clubLegends = (c) => c.legends ?? [];
const known = (c, a) => clubLegends(c).some((l) => l.idx === a.idx && l.name === a.name);
// Ehemalige, die Legende sind und noch nicht verabschiedet wurden (nur frisch Ausgeschiedene: diese oder letzte Saison).
export const pendingLegend = (c) => (c.alumni ?? []).find((a) => isLegend(a) && !known(c, a) && c.season - a.season <= 1) ?? null;
function honour(c, ctx, how) {
  (c.legends ??= []).push({ idx: ctx.idx, name: ctx.name, apps: ctx.apps, goals: ctx.goals, season: c.season, honour: how, ...(ctx.number != null ? { number: ctx.number } : {}) });
}
const once = (c, id) => (c.eventLog ?? []).some((e) => e.id === id && e.season === c.season);
const squad = (c) => humanClub(c).squad.filter((i) => !isCoach(c, i));

export const LEGEND_EVENTS = {
  // Der Abschied: Wie ehrt der Verein seine Legende?
  legende_abschied: {
    weight: 30,
    followUp: true,
    needs: (c) => {
      const a = pendingLegend(c);
      return a ? { idx: a.idx, name: a.name, apps: a.apps ?? 0, goals: a.goals ?? 0, number: a.number ?? null } : null;
    },
    text: (c, ctx) => tr(`${ctx.name} hat aufgehört – nach ${ctx.apps} Spielen und ${ctx.goals} Toren für den Verein. Im Vorstand sind sich alle einig: Das ist eine Vereinslegende. Wie verabschiedet ihr ihn?`, `${ctx.name} has retired – after ${ctx.apps} games and ${ctx.goals} goals for the club. The board agrees: this is a club legend. How do you send him off?`),
    options: [
      {
        label: tr('Abschiedsspiel ausrichten', 'Stage a farewell match'),
        effect: (c, ctx) => {
          const gate = LEGEND.gate * (c.level ?? 1);
          honour(c, ctx, 'spiel');
          book(c, tr(`Abschiedsspiel für ${ctx.name}`, `Farewell match for ${ctx.name}`), gate);
          adjustMood(c, 0.05);
          return tr(`Alte Weggefährten gegen die aktuelle Mannschaft, das halbe Dorf am Zaun. ${ctx.name} wird in der 60. Minute unter Applaus ausgewechselt. ${gate} € bleiben in der Kasse.`, `Old team-mates against the current side, half the village at the fence. ${ctx.name} is substituted to applause on the hour. €${gate} stays in the kitty.`);
        },
      },
      {
        label: tr('Sein Trikot im Vereinsheim aufhängen', 'Hang his shirt in the clubhouse'),
        effect: (c, ctx) => (honour(c, ctx, 'trikot'), adjustMood(c, 0.03), tr(`Gerahmt, mit allen Unterschriften, gleich neben dem Tresen. ${ctx.name} bekommt feuchte Augen und gibt eine Runde aus.`, `Framed, with every signature, right next to the bar. ${ctx.name} wells up and buys a round.`)),
      },
      {
        // Nur mit fester Nummer (ab der Kreisklasse C, numbers.js); ohne sie kommt das Trikot an die Wand.
        label: tr('Seine Rückennummer nicht mehr vergeben', 'Retire his shirt number'),
        effect: (c, ctx) => {
          if (ctx.number == null || !retireNumber(c, ctx.number, ctx.name)) return honour(c, ctx, 'trikot'), adjustMood(c, 0.03), tr(`${ctx.name} hatte nie eine feste Nummer. Stattdessen kommt sein Trikot gerahmt ins Vereinsheim.`, `${ctx.name} never had a fixed number. His shirt goes up framed in the clubhouse instead.`);
          honour(c, ctx, 'nummer');
          adjustMood(c, 0.04);
          return tr(`Die ${ctx.number} gehört ${ctx.name}. Sie wird nicht mehr vergeben – nach ${RETIRE_MAX} Jahren wird sie von selbst wieder frei, im Museum kann der Verein sie früher freigeben.`, `The number ${ctx.number} belongs to ${ctx.name}. It will not be issued again – after ${RETIRE_MAX} years it becomes free by itself, and the club can release it earlier in the museum.`);
        },
      },
      {
        label: tr('Blumenstrauß vor dem nächsten Heimspiel', 'A bouquet before the next home game'),
        effect: (c, ctx) => (honour(c, ctx, 'blumen'), tr(`Ein Handschlag, ein Strauß, ein Foto fürs Kreisblatt. ${ctx.name} bedankt sich – der eine oder andere hätte sich mehr gewünscht.`, `A handshake, a bouquet, a photo for the gazette. ${ctx.name} says thanks – one or two would have liked more.`)),
      },
    ],
  },
  // Später schaut die Legende beim Training vorbei.
  legende_besuch: {
    weight: 2,
    needs: (c, rng) => {
      if (once(c, 'legende_besuch') || squad(c).length < 3) return null;
      const old = clubLegends(c).filter((l) => l.season < c.season);
      if (!old.length) return null;
      const l = rng.pick(old);
      return { name: l.name, apps: l.apps };
    },
    text: (c, ctx) => tr(`${ctx.name} steht am Zaun und schaut beim Training zu. ${ctx.apps} Spiele für den Verein – die Jungen kennen ihn nur vom Foto im Vereinsheim.`, `${ctx.name} is at the fence watching training. ${ctx.apps} games for the club – the youngsters only know him from the photo in the clubhouse.`),
    options: [
      { label: tr('Vor der Mannschaft reden lassen', 'Let him speak to the team'), effect: (c, ctx) => (adjustMood(c, 0.04), tr(`„Dieses Trikot trägt man nicht, man verdient es sich.“ ${ctx.name} redet zwei Minuten, danach ist es sehr still – und dann sehr laut.`, `"You do not wear this shirt, you earn it." ${ctx.name} speaks for two minutes; afterwards it is very quiet – and then very loud.`)) },
      {
        label: tr('Mit dem Jüngsten arbeiten lassen', 'Let him work with the youngest'),
        effect: (c, ctx) => {
          const young = [...squad(c)].sort((a, b) => playerOf(c, a).age - playerOf(c, b).age)[0];
          adjustForm(c, young, 0.3);
          return tr(`Eine halbe Stunde nur die beiden und ein Ballnetz. ${first(c, young)} strahlt danach, als hätte er ein Autogramm bekommen.`, `Half an hour, just the two of them and a bag of balls. Afterwards ${first(c, young)} beams as if he had got an autograph.`);
        },
      },
      { label: tr('Auf ein Bier nach dem Training', 'A beer after training'), effect: (c, ctx) => tr(`${ctx.name} erzählt vom Aufstiegsspiel, das mit jedem Mal knapper wird. Ein schöner Abend, mehr nicht.`, `${ctx.name} tells the story of the promotion game, which gets closer every time. A nice evening, nothing more.`) },
    ],
  },
};
