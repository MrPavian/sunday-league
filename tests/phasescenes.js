// Gemeinsame Lagen für die Tests der Phasen-Ereignisse (deutsch und englisch, src/career/phaseevents.js).
import { createCareer, humanClub } from '../src/career/career.js';
import { PHASE_EVENTS } from '../src/career/phaseevents.js';
import { createRng } from '../src/core/rng.js';

export const IDS = Object.keys(PHASE_EVENTS);
export const FOLLOW = IDS.filter((id) => PHASE_EVENTS[id].followUp);
export const CHAINS = { jugendleiter_ueberlastet: 'jugendleiter_bilanz' };
// Spieltag (von 10), in dem das Ereignis passt: 0 Anfang (0–3), 1 Mitte (4–6), 2 Ende (7–9).
export const ROUND = { ziel_nachverhandeln: 1, ziel_zwischenbilanz: 5, jugendleiter_ueberlastet: 4, helfer_abschluss: 8, kassenwart_belege: 8 };
export const LEVEL1 = ['selbst_pfeifen', 'dorf_schiri', 'kreis_schiri'];
const LINKS = { jugendleiter_bilanz: () => ({ tone: 1 }) };

// Ein Zustand, in dem das Ereignis passt. level: Stufe der Liga (Schiri-Ereignisse nur 1).
export function scene(id, seed0 = 1, { level = LEVEL1.includes(id) ? 1 : 4, link = {}, round } = {}) {
  for (let seed = seed0; seed < seed0 + 400; seed++) {
    const c = createCareer({ seed });
    c.level = level;
    c.round = round ?? ROUND[id] ?? 5;
    c.week.weather = { id: 'sonne' };
    if (id === 'kreis_schiri') for (let r = 0; r < c.round; r++) for (const f of c.fixtures[r]) f.result = f.home === humanClub(c).id ? { home: 2, away: 0 } : f.away === humanClub(c).id ? { home: 0, away: 2 } : { home: 1, away: 1 }; // Spitzenspiel: wir führen
    for (const k of Object.keys(c.week.availability)) if (c.week.availability[k] === 'late') c.week.availability[k] = 'yes';
    if (id === 'elfmeter_training') c.pokale = { kreis: { kind: 'kreis', season: c.season, rounds: [c.round + 2], round: 0, done: false, out: false } };
    if (PHASE_EVENTS[id].followUp) (c.flags.chain ??= {})[id] = { season: c.season, due: c.round, ...LINKS[id](c), ...link };
    const ctx = PHASE_EVENTS[id].needs(c, createRng(seed));
    if (ctx) return { c, ctx, seed };
  }
  throw new Error('keine passende Lage für ' + id);
}
