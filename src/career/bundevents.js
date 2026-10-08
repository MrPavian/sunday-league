// Spielort-Entscheidung vor jedem Heimspiel im überregionalen Pokal (Ereignis mit Ausgängen).
// (a) eigener Platz: Heimgefühl, wenig Plätze; (b) Stahlrohrtribüne mieten: Kosten, mehr Zuschauer;
// (c) Umzug ins große Stadion: viel mehr Zuschauer, aber kein Heimgefühl. Zahlen: BUND_VENUES in bundespokal.js.
// Unbeantwortet gilt die letzte Option (eigener Platz) – siehe autoResolve in events.js.
import { tr } from '../core/i18n.js';
import { humanClub } from './career.js';
import { BUND_NAME, BUND_VENUES } from './bundespokal.js';
import { adjustMood, resolveEvent } from './events.js';
import { book, homeUnit } from './finances.js';
import { outcome } from './outcomes.js';
import { pokalClub, pokalOf, roundName } from './pokal.js';

const tieOf = (c, ctx) => pokalOf(c, 'bund').ties[ctx.i];
const rent = (c, key) => Math.round(homeUnit(c.level ?? 1) * BUND_VENUES[key].rentUnits);
const set = (c, ctx, key, cost, label) => {
  const tie = tieOf(c, ctx);
  if (tie.result) return; // Spiel schon gespielt: keine Miete und keine Stimmung mehr buchen
  tie.venue = key;
  if (cost) book(c, label, -cost);
};

const mood = (c, ctx, v) => {
  if (!tieOf(c, ctx).result) adjustMood(c, v); // nach dem Spiel keine Stimmung mehr
};

export const BUND_EVENTS = {
  bund_spielort: {
    weight: 0,
    needs: () => null, // wird nur über bundVenueEvent gesetzt
    text: (c, ctx) => tr(`${BUND_NAME}, ${ctx.round}: ${ctx.opp} kommt zu euch. Wo soll das Spiel steigen? Der Verband will bis Donnerstag Bescheid. Die Karten für den eigenen Platz wären nach zwei Stunden weg.`, `${BUND_NAME}, ${ctx.round}: ${ctx.opp} are coming to you. Where should the match be played? The association wants an answer by Thursday. Tickets for your own ground would be gone within two hours.`),
    options: [
      {
        label: tr('Umzug ins große Stadion', 'Move to the big stadium'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (set(c, ctx, 'stadium', rent(c, 'stadium'), tr('Stadionmiete (Pokalspiel)', 'Stadium hire (cup tie)')), mood(c, ctx, BUND_VENUES.stadium.mood), tr(`Ihr zieht ins Stadion um: ${BUND_VENUES.stadium.cap} Plätze, Rasenheizung, Flutlicht. Miete ${rent(c, 'stadium')} €. Die Kabine ist fremd, die Ränge sind riesig – Heimspiel fühlt sich anders an.`, `You move to the stadium: ${BUND_VENUES.stadium.cap} seats, undersoil heating, floodlights. Hire ${rent(c, 'stadium')} €. The dressing room is strange, the stands are huge – it does not feel like a home game.`)) },
          { w: 1, run: (c, ctx) => (set(c, ctx, 'stadium', rent(c, 'stadium') + 40, tr('Stadionmiete (Pokalspiel) mit Zuschlag', 'Stadium hire (cup tie) with surcharge')), mood(c, ctx, BUND_VENUES.stadium.mood), tr(`Der Stadionbetreiber schlägt 40 € Reinigungspauschale drauf. Gespielt wird trotzdem im Stadion.`, `The stadium operator adds a €40 cleaning fee. You play in the stadium all the same.`)) },
        ]),
      },
      {
        label: tr('Stahlrohrtribüne mieten', 'Hire a scaffold stand'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (set(c, ctx, 'stands', rent(c, 'stands'), tr('Miete Stahlrohrtribüne', 'Scaffold stand hire')), mood(c, ctx, BUND_VENUES.stands.mood), tr(`Die Tribüne kommt per Tieflader und steht am Donnerstag. ${BUND_VENUES.stands.cap} Plätze, Miete ${rent(c, 'stands')} €. Der Platzwart bewacht sie wie sein eigenes Kind.`, `The stand arrives on a low-loader and is up by Thursday. ${BUND_VENUES.stands.cap} places, hire ${rent(c, 'stands')} €. The groundsman guards it like his own child.`)) },
          { w: 1, run: (c, ctx) => (set(c, ctx, 'stands', rent(c, 'stands') + 30, tr('Miete Stahlrohrtribüne mit Abnahmegebühr', 'Scaffold stand hire with inspection fee')), mood(c, ctx, 0.01), tr('Das Bauamt nimmt die Tribüne ab – gegen 30 € Gebühr und eine Auflage: drei zusätzliche Ordner.', 'The building inspector signs off the stand – for a €30 fee and one condition: three extra stewards.')) },
        ]),
      },
      {
        label: tr('Auf dem eigenen Platz bleiben', 'Stay on your own pitch'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (set(c, ctx, 'own', 0), mood(c, ctx, BUND_VENUES.own.mood), tr('Zu Hause bleiben! Die Jungs kennen jeden Maulwurfshügel. Wer keine Karte hat, schaut vom Hang aus zu.', 'Staying home! The lads know every molehill. Anyone without a ticket watches from the bank.')) },
          { w: 1, run: (c, ctx) => (set(c, ctx, 'own', 0), mood(c, ctx, 0.03), tr('Der Platzwart mäht in Streifen, die Anwohner hängen Fahnen aus den Fenstern. Eng wird es trotzdem.', 'The groundsman mows stripes, the neighbours hang flags from their windows. It will be tight all the same.')) },
        ]),
      },
    ],
  },
};

// Vor dem Anpfiff des eigenen Heimspiels: ein noch offenes Spielort-Ereignis dieses Spiels gilt als „eigener Platz".
export function bundVenueAutoResolve(c, i) {
  const e = c.week?.event;
  if (e?.id === 'bund_spielort' && e.choice === null && e.ctx?.i === i) resolveEvent(c, BUND_EVENTS.bund_spielort.options.length - 1);
}

// Zu Wochenbeginn, vor den Zufallsereignissen: Steht ein Heimspiel im überregionalen Pokal an und ist der Ort noch
// offen, wird die Entscheidung zum Ereignis der Woche.
export function bundVenueEvent(c) {
  const cup = pokalOf(c, 'bund');
  if (!cup || cup.done || cup.out || !c.week || c.week.event || cup.rounds[cup.round] !== c.round) return null;
  const me = humanClub(c).id;
  const i = cup.ties.findIndex((t) => t.round === cup.round && t.home === me && !t.result && t.venue == null);
  if (i < 0) return null;
  const ctx = { i, opp: pokalClub(c, cup, cup.ties[i].away).name, round: roundName(cup) };
  const def = BUND_EVENTS.bund_spielort;
  c.week.event = { id: 'bund_spielort', ctx, text: def.text(c, ctx), options: def.options.map((o) => o.label), choice: null, result: null, story: 'Vereinsgeschichte' };
  (c.eventLog ??= []).push({ id: 'bund_spielort', season: c.season, round: c.round });
  return c.week.event;
}
