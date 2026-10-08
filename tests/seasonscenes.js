// Gemeinsame Lagen für die Tests der Saison-Ereignisse (deutsch und englisch).
import { createCareer, humanClub } from '../src/career/career.js';
import { SEASON_EVENTS } from '../src/career/seasonevents.js';
import { createRng } from '../src/core/rng.js';

export const IDS = Object.keys(SEASON_EVENTS);
export const rounds = (c) => c.fixtures.length;

// Ergebnisse aller Runden vor `upTo`: Mensch gewinnt alles / verliert alles / Remis, der Rest remis.
export function play(c, upTo, mode) {
  const me = humanClub(c).id;
  for (let r = 0; r < upTo; r++)
    for (const f of c.fixtures[r]) {
      const mine = f.home === me || f.away === me;
      if (!mine || mode === 'mid') f.result = { home: 1, away: 1 };
      else f.result = (f.home === me) === (mode === 'top') ? { home: 3, away: 0 } : { home: 0, away: 3 };
    }
}
export const homeRound = (c) => c.fixtures.findIndex((rd, i) => i >= 2 && rd.some((f) => f.home === humanClub(c).id));

// Ein Zustand, in dem das Ereignis passt.
export const SCENES = {
  aufstiegsfeier: (c) => { c.level = 3; c.round = 8; play(c, 8, 'top'); },
  abstiegskrise: (c) => { c.level = 3; c.round = 8; play(c, 8, 'bottom'); },
  abschiedsspiel: (c) => { c.round = 8; },
  urlaub_finale: (c) => { c.round = 8; },
  firmenlauf: (c) => { c.round = 3; },
  platzsperre: (c) => { c.round = homeRound(c); c.week.weather = { id: 'regen' }; },
  flutlicht_defekt: (c) => { c.round = 3; c.facilities = { built: { flutlicht: true }, building: null }; },
  trainerschein: (c) => { c.level = 2; c.round = 3; },
  kabine_undicht: (c) => { c.round = 4; },
  schiri_mangel: (c) => { c.level = 2; c.round = 3; },
  lizenzpflicht: (c) => { c.level = 4; c.round = 3; },
  hospitation: (c) => { c.level = 3; c.round = 3; },
};

// Karriere mit passender Lage; sucht eine Mannschaft, in der das Ereignis einen Mitspieler findet.
export function scene(id, seed0 = 1) {
  for (let seed = seed0; seed < seed0 + 400; seed++) {
    const c = createCareer({ seed });
    SCENES[id](c);
    const ctx = SEASON_EVENTS[id].needs(c, createRng(seed));
    if (ctx) return { c, ctx, seed };
  }
  throw new Error('keine passende Lage für ' + id);
}

