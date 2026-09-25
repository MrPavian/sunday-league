// Ausgänge für Entscheidungen: Jede Antwort würfelt aus mehreren möglichen
// Folgen – vom Happy End bis zum Knall. Gewichte dürfen vom Kontext abhängen
// (Stimmung, Eigenschaften, Kadergröße); `if` schließt einen Ausgang ganz aus.
import { hasTrait } from '../data/traits.js';
import { humanClub, joinSquad, MIN_SQUAD, playerOf, releasePlayer } from './career.js';

// outcome([{ w, if, run }]) → effect(c, ctx, rng) für eine Event-Option.
export function outcome(list) {
  return (c, ctx, rng) => {
    const entries = list
      .filter((o) => !o.if || o.if(c, ctx))
      .map((o) => ({ o, w: Math.max(0, typeof o.w === 'function' ? o.w(c, ctx) : o.w ?? 1) }))
      .filter((e) => e.w > 0);
    if (!entries.length) return list[list.length - 1].run(c, ctx, rng);
    let r = rng.next() * entries.reduce((s, e) => s + e.w, 0);
    const hit = entries.find((e) => (r -= e.w) < 0) ?? entries[entries.length - 1];
    return hit.o.run(c, ctx, rng);
  };
}

export const first = (c, idx) => playerOf(c, idx).name.split(' ')[0];
export const canLose = (c, n = 1) => humanClub(c).squad.length - n >= MIN_SQUAD;
export const trait = (c, idx, t) => hasTrait(playerOf(c, idx), t);
export const inSquad = (c, idx) => humanClub(c).squad.includes(idx);

// Spieler geht (oder fliegt). Klappt nur, wenn danach noch genug Leute da sind.
export function leaveTeam(c, idx) {
  return inSquad(c, idx) && canLose(c) && releasePlayer(c, idx);
}

// Der Albtraum: Er wechselt ausgerechnet zum Derby-Rivalen.
export function joinRival(c, idx, rivalId) {
  const rival = c.clubs.find((x) => x.id === rivalId);
  if (!rival || !leaveTeam(c, idx)) return false;
  rival.squad.push(idx);
  c.players[idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
  return true;
}

export const sitOut = (c, idx, status = 'no') => {
  if (c.week?.availability[idx] !== undefined) c.week.availability[idx] = status;
};

export { joinSquad };
