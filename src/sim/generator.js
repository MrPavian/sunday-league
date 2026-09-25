import { clamp } from '../core/math.js';
import { FIRST_NAMES, LAST_NAMES, PROFESSIONS, SKIN_TONES, HAIR_COLORS } from '../data/names.js';
import { TRAIT_IDS } from '../data/traits.js';

// Vollamateure: Attribute liegen meist zwischen 0.3 und 0.65.
export function generatePlayer(rng, { role = 'mid' } = {}) {
  const age = rng.int(17, 42);
  const attr = () => clamp(0.28 + rng.next() * 0.38 + rng.gauss() * 0.05, 0.1, 0.85);
  const attrs = {
    pace: attr(),
    stamina: attr(),
    technique: attr(),
    passing: attr(),
    shooting: attr(),
    keeping: role === 'gk' ? clamp(0.4 + rng.next() * 0.35, 0, 0.9) : 0.15 + rng.next() * 0.2,
  };
  if (age > 32) {
    attrs.pace = clamp(attrs.pace - 0.1, 0.1, 1);
    attrs.stamina = clamp(attrs.stamina - 0.06, 0.1, 1);
    attrs.technique = clamp(attrs.technique + 0.05, 0.1, 1);
  }

  const traits = [];
  const roll = rng.next();
  const traitCount = roll < 0.6 ? 0 : roll < 0.93 ? 1 : 2;
  while (traits.length < traitCount) {
    const t = rng.pick(TRAIT_IDS);
    if (!traits.includes(t)) traits.push(t);
  }

  const look = {
    skin: rng.pick(SKIN_TONES),
    hair: rng.pick(HAIR_COLORS),
    bald: age > 30 && rng.chance(0.35),
    beard: rng.chance(0.3),
    belly: age > 28 ? rng.next() * 0.9 : rng.next() * 0.3,
    height: rng.range(0.93, 1.07),
  };

  return {
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    age,
    profession: rng.pick(PROFESSIONS),
    attrs,
    traits,
    look,
  };
}

export function generateTeam(rng, preset, roles) {
  return { ...preset, players: roles.map((role) => generatePlayer(rng, { role })) };
}
