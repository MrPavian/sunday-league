// Vereinsheim ausbauen: Aus dem Bauwagen mit kalter Dusche wird Schritt für Schritt
// ein Vereinsheim mit Theke, Flutlicht und Tribüne. Jeder Ausbau kostet Geld und
// Bauzeit – oder einen Samstag Arbeitseinsatz, bei dem alles passieren kann.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { humanClub } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { first, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { chronicle } from './sagas.js';

export const FACILITIES = {
  duschen: { name: tr('Warme Duschen', 'Hot showers'), cost: 180, weeks: 2, upkeep: 1, desc: tr('Weniger Absagen, und Neue kommen lieber.', 'Fewer drop-outs, and new players are keener to join.'), done: tr('Die erste warme Dusche seit 1987. Einer duscht 40 Minuten.', 'The first hot shower since 1987. Someone stays in for 40 minutes.') },
  grill: { name: tr('Grill & Theke', 'Barbecue & bar'), cost: 220, weeks: 2, upkeep: 0, desc: tr('Ein Viertel mehr Getränke- und Wurstverkauf bei Heimspielen.', 'A quarter more drinks and sausage sales at home games.'), done: tr('Die Theke steht! Der erste Kasten ist nach zwölf Minuten leer.', 'The bar is up! The first crate is empty after twelve minutes.') },
  ballmaschine: { name: tr('Ballmaschine', 'Ball machine'), cost: 150, weeks: 1, upkeep: 0, desc: tr('Junge Spieler (bis 23) entwickeln sich schneller.', 'Young players (up to 23) develop faster.'), done: tr('Die Ballmaschine schießt härter als euer Stürmer. Der Torwart hat Angst.', 'The ball machine shoots harder than your striker. The keeper is scared.') },
  kabine: { name: tr('Neue Kabine', 'New dressing room'), cost: 350, weeks: 3, upkeep: 1, desc: tr('Bessere Stimmung jede Woche, Neuzugänge sagen eher zu.', 'Better spirit every week, new signings say yes more often.'), done: tr('Neue Kabine mit Haken für alle. Und einer Bank, die nicht wackelt.', 'New dressing room with pegs for everyone. And a bench that doesn\'t wobble.') },
  flutlicht: { name: tr('Flutlicht', 'Floodlights'), cost: 500, weeks: 3, upkeep: 3, desc: tr('Training nach Feierabend – kostet weniger Familienzeit.', 'Training after work – costs less family time.'), done: tr('Das Flutlicht geht an. Die halbe Nachbarschaft kommt gucken.', 'The floodlights come on. Half the neighbourhood comes to look.') },
  tribuene: { name: tr('Kleine Tribüne', 'Small stand'), cost: 700, weeks: 4, upkeep: 2, needs: ['grill'], desc: tr('Drei Stufen, ein Dach – ein Drittel mehr Zuschauer.', 'Three steps and a roof – a third more spectators.'), done: tr('Die Tribüne steht! Drei Stufen Beton und ein Dach aus dem Baumarkt.', 'The stand is up! Three concrete steps and a roof from the DIY store.') },
};

export function facilities(c) {
  c.facilities ??= { built: {}, building: null };
  return c.facilities;
}
export const hasFacility = (c, id) => !!c.facilities?.built?.[id];

// Wirkung einzelner Ausbauten an den passenden Stellen im Spiel.
export const absenceMul = (c) => (hasFacility(c, 'duschen') ? 0.92 : 1);
export const salesMul = (c) => (hasFacility(c, 'grill') ? 1.25 : 1);
export const fansMul = (c) => (hasFacility(c, 'tribuene') ? 1.33 : 1);
export const recruitBonus = (c) => (hasFacility(c, 'duschen') ? 0.03 : 0) + (hasFacility(c, 'kabine') ? 0.06 : 0);
export const youthGrowthMul = (c) => (hasFacility(c, 'ballmaschine') ? 1.25 : 1);
export const trainingRelief = (c) => (hasFacility(c, 'flutlicht') ? 1 : 0);

export function canBuild(c, id) {
  const f = facilities(c);
  const def = FACILITIES[id];
  if (!def || f.built[id] || f.building) return false;
  if ((def.needs ?? []).some((n) => !f.built[n])) return false;
  return true;
}

// Handwerker kosten das Volle. Arbeitseinsatz: halber Preis, doppelte Zeit – und Überraschungen.
export function build(c, id, mode = 'handwerker') {
  if (!canBuild(c, id)) return null;
  const def = FACILITIES[id];
  const cost = mode === 'einsatz' ? Math.round(def.cost / 2) : def.cost;
  if (c.cash < cost) return null;
  book(c, `${def.name}: ${mode === 'einsatz' ? tr('Material für den Arbeitseinsatz', 'materials for the work party') : tr('Handwerker', 'builders')}`, -cost);
  facilities(c).building = { id, weeks: mode === 'einsatz' ? def.weeks * 2 : def.weeks, mode };
  let text = mode === 'einsatz' ? tr('Samstag, 9 Uhr, Arbeitseinsatz. Wer Werkzeug hat, bringt es mit.', 'Saturday, 9am, work party. Bring tools if you have them.') : tr('Die Handwerker kommen. Irgendwann. Diese Woche vielleicht.', 'The builders are coming. At some point. Maybe this week.');
  if (mode === 'einsatz') text = workParty(c, id);
  facilities(c).note = text;
  return text;
}

const helpers = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx));

function workParty(c, id) {
  const rng = createRng((c.seed * 29 + c.season * 7 + c.round * 3 + id.length) >>> 0);
  const b = facilities(c).building;
  const run = outcome([
    { w: 3, run: () => (adjustMood(c, 0.06), tr('Zwölf Leute, drei Bohrmaschinen, ein Grill. Das schweißt zusammen.', 'Twelve people, three drills, one barbecue. That brings you together.')) },
    { w: 2, run: () => ((b.weeks = Math.max(1, b.weeks - 2)), adjustMood(c, 0.04), tr('Einer ist gelernter Maurer und übernimmt das Kommando. Doppelt so schnell wie gedacht.', 'One of them is a trained bricklayer and takes charge. Twice as fast as expected.')) },
    {
      w: 1.5,
      run: () => {
        const s = rng.pick(helpers(c));
        c.players[s].injuryWeeks = Math.max(c.players[s].injuryWeeks ?? 0, 2);
        c.players[s].injury = { label: tr('Daumen (Hammer)', 'thumb (hammer)') };
        sitOut(c, s);
        return tr(`${first(c, s)} haut sich mit dem Hammer auf den Daumen. Zwei Wochen raus – und er muss sich das noch lange anhören.`, `${first(c, s)} hits his thumb with a hammer. Out for two weeks – and he will be hearing about it for a long time.`);
      },
    },
    { w: 1, run: () => ((b.weeks += 2), tr('Es kommen nur drei. Die anderen haben „was mit der Familie". Das dauert länger.', 'Only three show up. The others have "family stuff". It will take longer.')) },
    { w: 1, run: () => (book(c, tr('Materialspende Sanitär Blum', 'Material donation Sanitär Blum'), 40), tr('Ein Sponsor bringt Material vorbei und will nur ein Schild dafür. 40 € gespart.', 'A sponsor drops off materials and only wants a sign in return. €40 saved.')) },
    { w: 1, run: () => (adjustMood(c, -0.04), book(c, tr('Falsch gebohrt (Wasserleitung)', 'Drilled in the wrong place (water pipe)'), -30), tr('Einer bohrt in die Wasserleitung. 30 € Notdienst und eine nasse Kabine.', 'Someone drills into the water pipe. €30 emergency plumber and a wet dressing room.')) },
    { w: 0.7, run: () => ((c.flags.pressWeeks = 2), adjustMood(c, 0.05), tr('Das Kreisblatt kommt vorbei: „Hier packt noch jeder an!" Mehr Zuschauer am Sonntag.', 'The District Gazette drops by: "Everyone still mucks in here!" More spectators on Sunday.')) },
  ]);
  return run(c, {}, rng);
}

// Jede Woche: Bauen, Nebenkosten, und die neue Kabine hebt die Laune.
export function weeklyFacilities(c) {
  const f = facilities(c);
  if (f.building) {
    f.building.weeks--;
    if (f.building.weeks <= 0) {
      const def = FACILITIES[f.building.id];
      f.built[f.building.id] = c.season;
      chronicle(c, tr(`${def.name} fertig${f.building.mode === 'einsatz' ? ' – in Eigenarbeit gebaut' : ''}.`, `${def.name} finished${f.building.mode === 'einsatz' ? ' – built by the members themselves' : ''}.`));
      c.week?.chat.push({ from: null, text: tr(`Fertig: ${def.name}! ${def.done}`, `Finished: ${def.name}! ${def.done}`), time: 'Fr 18:00' });
      adjustMood(c, 0.05);
      f.building = null;
    }
  }
  const upkeep = Object.keys(f.built).reduce((s, id) => s + (FACILITIES[id]?.upkeep ?? 0), 0);
  if (upkeep) book(c, tr('Nebenkosten Vereinsheim (Strom, Wasser)', 'Clubhouse running costs (power, water)'), -upkeep);
  if (hasFacility(c, 'kabine')) adjustMood(c, 0.01);
}

