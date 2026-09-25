// Challenge-Belohnungen in der Karriere einlösen: Geld in die Kasse oder ein
// neuer Spieler, der beim Zuschauen Lust bekommen hat.
import { createRng } from '../core/rng.js';
import { getPool, humanClub, joinSquad, maxSquad, playerOf } from './career.js';
import { book } from './finances.js';

export function applyChallengeRewards(career, progress) {
  const applied = [];
  const keep = [];
  const taken = new Set([...career.clubs.flatMap((c) => c.squad), ...(career.youth?.prospects ?? []), ...(career.alumni ?? []).map((a) => a.idx)]);
  for (const r of progress.pendingRewards ?? []) {
    if (r.cash) {
      book(career, `Challenge „${r.id}": ${r.text}`, r.cash);
      applied.push(r);
      continue;
    }
    if (r.player) {
      if (humanClub(career).squad.length >= maxSquad(career)) {
        keep.push(r); // später, wenn Platz ist
        continue;
      }
      const rng = createRng(career.seed + r.id.length * 101);
      const list = getPool()
        .byTier(r.player.tier)
        .filter((p) => !taken.has(p.poolIndex) && (!r.player.position || p.position === r.player.position) && (!r.player.minAge || playerOf(career, p.poolIndex).age >= r.player.minAge));
      const p = rng.pick(list);
      if (!p) continue;
      joinSquad(career, p.poolIndex, 'Hab euch bei der Challenge gesehen – ich will mitspielen!');
      taken.add(p.poolIndex);
      applied.push({ ...r, playerName: p.name });
    }
  }
  progress.pendingRewards = keep;
  return applied;
}
