// Gemeinsame Lagen für die Tests der lokalen Ereignisse (deutsch und englisch, src/career/localevents.js).
import { createCareer, humanClub } from '../src/career/career.js';
import { LOCAL_EVENTS } from '../src/career/localevents.js';
import { isCoach } from '../src/career/personal.js';
import { createRng } from '../src/core/rng.js';

export const IDS = Object.keys(LOCAL_EVENTS);
export const FOLLOW = IDS.filter((id) => LOCAL_EVENTS[id].followUp);
export const CHAINS = { reporter_woche: 'reportage_erscheint', leihanfrage: 'leihe_rueckkehr', fanclub_gruendung: 'fanclub_bus', platzwart_ruhestand: 'platzwart_nachfolge', wirt_kuendigt: 'wirt_neu' };
export const WEATHER = { sturmwarnung: 'wind', schneeschippen: 'schnee' };
const LINKS = {
  reportage_erscheint: () => ({ tone: 1 }),
  leihe_rueckkehr: (c) => ({ s: humanClub(c).squad.find((i) => !isCoach(c, i)) }),
  fanclub_bus: () => ({}),
  platzwart_nachfolge: () => ({}),
  wirt_neu: () => ({ how: 'neu' }),
};
export const AWAY = ['fahrgemeinschaft_bruch', 'fanclub_bus'];

// Eine Runde, in der der Mensch auswärts spielt.
export const awayRound = (c) => c.fixtures.findIndex((rd, i) => i >= 1 && rd.some((f) => f.away === humanClub(c).id));

// Ein Zustand, in dem das Ereignis passt (Folge-Ereignisse: mit fälliger Kette). level: Stufe der Liga.
export function scene(id, seed0 = 1, { level = 4, link = {} } = {}) {
  for (let seed = seed0; seed < seed0 + 400; seed++) {
    const c = createCareer({ seed });
    c.level = level;
    c.round = AWAY.includes(id) ? awayRound(c) : 3;
    c.week.weather = { id: WEATHER[id] ?? 'sonne' };
    // 'late' aus dem Wochenbeginn der Stufe 1 gibt es oberhalb der Schwelle nicht mehr.
    for (const k of Object.keys(c.week.availability)) if (c.week.availability[k] === 'late') c.week.availability[k] = 'yes';
    if (LOCAL_EVENTS[id].followUp) (c.flags.chain ??= {})[id] = { season: c.season, due: c.round, ...LINKS[id](c), ...link };
    const ctx = LOCAL_EVENTS[id].needs(c, createRng(seed));
    if (ctx) return { c, ctx, seed };
  }
  throw new Error('keine passende Lage für ' + id);
}
