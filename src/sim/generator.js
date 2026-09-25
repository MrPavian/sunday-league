import { clamp } from '../core/math.js';
import { createRng } from '../core/rng.js';
import { HIGHER_AMATEUR_CLUBS, LOWER_LEAGUES, PRO_CLUBS } from '../data/clubs.js';
import { LEGEND_ARCHETYPES } from '../data/legends.js';
import { FIRST_NAMES, HAIR_COLORS, LAST_NAMES, PROFESSIONS, SKIN_TONES } from '../data/names.js';
import { RANDOM_TRAIT_IDS } from '../data/traits.js';
import { rollTier, tierById } from '../data/tiers.js';

export const POSITIONS = { gk: 'Torwart', def: 'Abwehr', mid: 'Mittelfeld', fwd: 'Sturm', fan: 'Zuschauer' };

// Freizeitkick-Mischung für Schnellspiele: meist OK/Gut, Stars sind selten,
// ein Ex-Profi ist ein kleines Wunder.
export const HOBBY_TIER_WEIGHTS = { ok: 0.62, gut: 0.28, stark: 0.08, dorfstar: 0.018, superstar: 0.0018, legende: 0.0002 };

// Schwerpunkte je Position (Aufschlag auf die Grundwerte).
const FOCUS = {
  gk: { keeping: 0.12, passing: -0.05, shooting: -0.1 },
  def: { tackling: 0.08, heading: 0.07, shooting: -0.05 },
  mid: { passing: 0.07, stamina: 0.06, technique: 0.03 },
  fwd: { shooting: 0.08, pace: 0.05, tackling: -0.08 },
};

const ATTRS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'];

const STORIES = {
  superstar: [
    (c) => `Spielte ${c.years} Jahre ${c.league} beim ${c.amateur}. Dann kamen Job, Haus und Kinder – aber das Kicken lässt er sich nicht nehmen.`,
    (c) => `Stand mal im erweiterten Profikader von ${c.club}. Kreuzband, zweimal. Jetzt spielt er zum Spaß – und immer noch besser als alle anderen.`,
    (c) => `Aus der A-Jugend von ${c.club}. Hat sich damals fürs Studium entschieden. Bereut es nur sonntags ein bisschen.`,
    (c) => `${c.years} Jahre ${c.league}, Kapitän beim ${c.amateur}. Ist wegen der Schwiegereltern hergezogen.`,
  ],
  dorfstar: [
    (c) => `Torschützenkönig der Kreisliga ${c.year}. Im Ort kennt ihn jeder, im Vereinsheim hat er einen Stammplatz.`,
    (c) => `War mal Landesliga beim ${c.amateur}. Kam für die Liebe zurück ins Dorf.`,
    () => 'Macht seit 15 Jahren jedes Tor, das zählt. Behauptet er zumindest.',
    () => 'Hat als Einziger im Team eigene Schienbeinschoner. Und einen Spitznamen, den alle benutzen.',
  ],
};

// Karrierejahre passen zum Alter: frühestens mit 18 bei den Herren.
function careerFacts(rng, age) {
  return {
    years: rng.int(Math.min(3, age - 18), Math.max(3, Math.min(16, age - 19))),
    club: rng.pick(PRO_CLUBS),
    amateur: rng.pick(HIGHER_AMATEUR_CLUBS),
    league: rng.pick(LOWER_LEAGUES),
    year: rng.int(2012, 2025),
    goals: rng.int(100, 170),
    games: rng.int(260, 430),
  };
}

function makeLook(rng, age, overrides = {}) {
  return {
    skin: rng.pick(SKIN_TONES),
    hair: rng.pick(HAIR_COLORS),
    bald: age > 30 && rng.chance(0.35),
    beard: rng.chance(0.3),
    belly: age > 28 ? rng.next() * 0.9 : rng.next() * 0.3,
    height: rng.range(0.93, 1.07),
    ...overrides,
  };
}

function pickTraits(rng, dist) {
  const roll = rng.next();
  let count = 0;
  for (let acc = dist[0]; roll >= acc && count < dist.length - 1; acc += dist[count + 1]) count++;
  const traits = [];
  while (traits.length < count) {
    const t = rng.pick(RANDOM_TRAIT_IDS);
    if (!traits.includes(t)) traits.push(t);
  }
  return traits;
}

function generateLegend(rng, role) {
  // Passender Archetyp zur gewünschten Position, sonst irgendeiner (außer Torwart).
  const fitting = LEGEND_ARCHETYPES.filter((a) => (role === 'gk' ? a.role === 'gk' : a.role !== 'gk'));
  const arch = rng.pick(fitting.length ? fitting : LEGEND_ARCHETYPES);
  const age = rng.int(32, 42);
  const attrs = {};
  for (const k of ATTRS) attrs[k] = clamp(arch.attrs[k] + rng.gauss() * 0.02, 0.05, 0.98);
  return {
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    age,
    profession: rng.pick(['Privatier', 'Hat eine Fußballschule', 'Teilhaber im Autohaus', 'Gelegentlich TV-Experte']),
    tier: 'legende',
    archetype: arch.id,
    title: arch.title,
    position: arch.role,
    backstory: arch.story(careerFacts(rng, age)),
    attrs,
    traits: [...arch.traits],
    look: makeLook(rng, age, arch.look),
  };
}

export function generatePlayer(rng, { role = 'mid', tier = null, tierWeights = null } = {}) {
  const t = tier ? tierById(tier) : rollTier(rng, tierWeights);
  let player;
  if (t.id === 'legende') {
    player = generateLegend(rng, role);
  } else {
    const age = rng.int(t.age[0], t.age[1]);
    const [lo, hi] = t.range;
    const focus = FOCUS[role] ?? {};
    const attrs = {};
    for (const k of ATTRS) attrs[k] = clamp(rng.range(lo, hi) + rng.gauss() * 0.04 + (focus[k] ?? 0), 0.08, 0.92);
    if (role !== 'gk') attrs.keeping = 0.1 + rng.next() * 0.2;
    if (age > 32) {
      attrs.pace = clamp(attrs.pace - 0.1, 0.08, 1);
      attrs.stamina = clamp(attrs.stamina - 0.06, 0.08, 1);
      attrs.technique = clamp(attrs.technique + 0.05, 0.08, 1);
    }
    const stories = STORIES[t.id];
    player = {
      name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
      age,
      profession: rng.pick(PROFESSIONS),
      tier: t.id,
      position: role,
      backstory: stories ? rng.pick(stories)(careerFacts(rng, age)) : null,
      attrs,
      traits: pickTraits(rng, t.traits),
      look: makeLook(rng, age),
    };
  }
  player.rating = ratePlayer(player);
  return player;
}

// Stärke 1–99, gewichtet nach Position.
const RATING_WEIGHTS = {
  gk: { keeping: 0.6, passing: 0.1, pace: 0.1, technique: 0.1, stamina: 0.1 },
  def: { tackling: 0.3, heading: 0.15, pace: 0.15, passing: 0.15, stamina: 0.15, technique: 0.1 },
  mid: { passing: 0.25, technique: 0.25, stamina: 0.2, tackling: 0.1, shooting: 0.1, pace: 0.1 },
  fwd: { shooting: 0.3, technique: 0.2, pace: 0.2, heading: 0.1, passing: 0.1, stamina: 0.1 },
};

// Besonderheiten zählen mit: Ex-Profis spielen deutlich über ihren Laufwerten.
const TRAIT_RATING = { ex_profi: 12, meckerer: -2, raucher: -2 };

export function ratePlayer(p) {
  const w = RATING_WEIGHTS[p.position] ?? RATING_WEIGHTS.mid;
  let sum = 0;
  for (const [k, v] of Object.entries(w)) sum += p.attrs[k] * v;
  const bonus = p.traits.reduce((b, t) => b + (TRAIT_RATING[t] ?? 1), 0);
  return Math.max(1, Math.min(99, Math.round(sum * 100 + bonus)));
}

export function generateTeam(rng, preset, roles, { tierWeights = HOBBY_TIER_WEIGHTS } = {}) {
  return { ...preset, players: roles.map((role) => generatePlayer(rng, { role, tierWeights })) };
}

// Der große Spielerpool: jeder Spieler entsteht deterministisch aus Seed und
// Nummer – 25.000 Leute, ohne dass man sie speichern muss.
const POSITION_ROLL = [
  ['gk', 0.1],
  ['def', 0.3],
  ['mid', 0.35],
  ['fwd', 0.25],
];

export function createPlayerPool({ seed = 1921, size = 25000 } = {}) {
  const cache = new Map();
  const get = (index) => {
    if (cache.has(index)) return cache.get(index);
    const rng = createRng((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
    let r = rng.next();
    let role = 'mid';
    for (const [pos, w] of POSITION_ROLL) {
      if ((r -= w) < 0) {
        role = pos;
        break;
      }
    }
    const p = { ...generatePlayer(rng, { role }), id: `pool-${index}`, poolIndex: index };
    cache.set(index, p);
    return p;
  };
  let all = null;
  const everyone = () => (all ??= Array.from({ length: size }, (_, i) => get(i)));
  return {
    size,
    get,
    everyone,
    countByTier() {
      const counts = {};
      for (const p of everyone()) counts[p.tier] = (counts[p.tier] ?? 0) + 1;
      return counts;
    },
    byTier(tier) {
      return everyone().filter((p) => p.tier === tier);
    },
  };
}
