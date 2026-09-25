// Vereinsheim ausbauen: Aus dem Bauwagen mit kalter Dusche wird Schritt für Schritt
// ein Vereinsheim mit Theke, Flutlicht und Tribüne. Jeder Ausbau kostet Geld und
// Bauzeit – oder einen Samstag Arbeitseinsatz, bei dem alles passieren kann.
import { createRng } from '../core/rng.js';
import { humanClub } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { first, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { chronicle } from './sagas.js';

export const FACILITIES = {
  duschen: { name: 'Warme Duschen', cost: 180, weeks: 2, upkeep: 1, desc: 'Weniger Absagen, und Neue kommen lieber.', done: 'Die erste warme Dusche seit 1987. Einer duscht 40 Minuten.' },
  grill: { name: 'Grill & Theke', cost: 220, weeks: 2, upkeep: 0, desc: 'Ein Viertel mehr Getränke- und Wurstverkauf bei Heimspielen.', done: 'Die Theke steht! Der erste Kasten ist nach zwölf Minuten leer.' },
  ballmaschine: { name: 'Ballmaschine', cost: 150, weeks: 1, upkeep: 0, desc: 'Junge Spieler (bis 23) entwickeln sich schneller.', done: 'Die Ballmaschine schießt härter als euer Stürmer. Der Torwart hat Angst.' },
  kabine: { name: 'Neue Kabine', cost: 350, weeks: 3, upkeep: 1, desc: 'Bessere Stimmung jede Woche, Neuzugänge sagen eher zu.', done: 'Neue Kabine mit Haken für alle. Und einer Bank, die nicht wackelt.' },
  flutlicht: { name: 'Flutlicht', cost: 500, weeks: 3, upkeep: 3, desc: 'Training nach Feierabend – kostet weniger Familienzeit.', done: 'Das Flutlicht geht an. Die halbe Nachbarschaft kommt gucken.' },
  tribuene: { name: 'Kleine Tribüne', cost: 700, weeks: 4, upkeep: 2, needs: ['grill'], desc: 'Drei Stufen, ein Dach – ein Drittel mehr Zuschauer.', done: 'Die Tribüne steht! Drei Stufen Beton und ein Dach aus dem Baumarkt.' },
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
  book(c, `${def.name}: ${mode === 'einsatz' ? 'Material für den Arbeitseinsatz' : 'Handwerker'}`, -cost);
  facilities(c).building = { id, weeks: mode === 'einsatz' ? def.weeks * 2 : def.weeks, mode };
  let text = mode === 'einsatz' ? 'Samstag, 9 Uhr, Arbeitseinsatz. Wer Werkzeug hat, bringt es mit.' : 'Die Handwerker kommen. Irgendwann. Diese Woche vielleicht.';
  if (mode === 'einsatz') text = workParty(c, id);
  facilities(c).note = text;
  return text;
}

const helpers = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx));

function workParty(c, id) {
  const rng = createRng((c.seed * 29 + c.season * 7 + c.round * 3 + id.length) >>> 0);
  const b = facilities(c).building;
  const run = outcome([
    { w: 3, run: () => (adjustMood(c, 0.06), 'Zwölf Leute, drei Bohrmaschinen, ein Grill. Das schweißt zusammen.') },
    { w: 2, run: () => ((b.weeks = Math.max(1, b.weeks - 2)), adjustMood(c, 0.04), 'Einer ist gelernter Maurer und übernimmt das Kommando. Doppelt so schnell wie gedacht.') },
    {
      w: 1.5,
      run: () => {
        const s = rng.pick(helpers(c));
        c.players[s].injuryWeeks = Math.max(c.players[s].injuryWeeks ?? 0, 2);
        c.players[s].injury = { label: 'Daumen (Hammer)' };
        sitOut(c, s);
        return `${first(c, s)} haut sich mit dem Hammer auf den Daumen. Zwei Wochen raus – und er muss sich das noch lange anhören.`;
      },
    },
    { w: 1, run: () => ((b.weeks += 2), 'Es kommen nur drei. Die anderen haben „was mit der Familie". Das dauert länger.') },
    { w: 1, run: () => (book(c, 'Materialspende Sanitär Blum', 40), 'Ein Sponsor bringt Material vorbei und will nur ein Schild dafür. 40 € gespart.') },
    { w: 1, run: () => (adjustMood(c, -0.04), book(c, 'Falsch gebohrt (Wasserleitung)', -30), 'Einer bohrt in die Wasserleitung. 30 € Notdienst und eine nasse Kabine.') },
    { w: 0.7, run: () => ((c.flags.pressWeeks = 2), adjustMood(c, 0.05), 'Das Kreisblatt kommt vorbei: „Hier packt noch jeder an!" Mehr Zuschauer am Sonntag.') },
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
      chronicle(c, `${def.name} fertig${f.building.mode === 'einsatz' ? ' – in Eigenarbeit gebaut' : ''}.`);
      c.week?.chat.push({ from: null, text: `Fertig: ${def.name}! ${def.done}`, time: 'Fr 18:00' });
      adjustMood(c, 0.05);
      f.building = null;
    }
  }
  const upkeep = Object.keys(f.built).reduce((s, id) => s + (FACILITIES[id]?.upkeep ?? 0), 0);
  if (upkeep) book(c, 'Nebenkosten Vereinsheim (Strom, Wasser)', -upkeep);
  if (hasFacility(c, 'kabine')) adjustMood(c, 0.01);
}

