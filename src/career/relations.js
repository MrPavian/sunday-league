// Beziehungsnetz im Kader: Kumpels, Kollegen, Schwager – und Rivalen.
// Wer sich gut versteht, spielt sich die Bälle zu; Streithähne eher nicht.
// Beziehungen entstehen deterministisch aus den Pool-Nummern und können sich
// durch Ereignisse ändern (career.relations speichert nur die Änderungen).
import { humanClub, playerOf } from './career.js';
import { tr } from '../core/i18n.js';

export const REL = {
  kumpel: { name: tr('Kumpel', 'Mate'), plural: tr('Kumpels', 'Mates'), mods: { passing: 0.02, technique: 0.01 } },
  schwager: { name: tr('Schwager', 'Brother-in-law'), plural: tr('Schwager', 'Brothers-in-law'), mods: { passing: 0.015, stamina: 0.01 } },
  kollegen: { name: tr('Arbeitskollege', 'Workmate'), plural: tr('Arbeitskollegen', 'Workmates'), mods: { passing: 0.01 } },
  rivalen: { name: tr('Rivale', 'Rival'), plural: tr('Rivalen', 'Rivals'), mods: { passing: -0.03, technique: -0.01 } },
  feinde: { name: tr('Erzfeind', 'Arch-enemy'), plural: tr('Erzfeinde', 'Arch-enemies'), mods: { passing: -0.05, technique: -0.02, stamina: -0.01 } },
  schulfreunde: { name: tr('Schulfreund', 'Old school friend'), plural: tr('Schulfreunde', 'Old school friends'), mods: { passing: 0.03, technique: 0.01 } },
};
const GENERIC_JOBS = /^(Schüler|Student|Azubi|Arbeitssuchend)/;
const CAP = 0.06;
// Vorname plus Initiale, eindeutig auch bei zwei Torstens im Kader.
export const shortName = (c, idx) => {
  const [f, ...rest] = playerOf(c, idx).name.split(' ');
  return rest.length ? `${f} ${rest.join(' ')[0]}.` : f;
};

const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
function hash(a, b) {
  let h = (Math.min(a, b) * 2654435761) ^ (Math.max(a, b) * 40503);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return (h ^ (h >>> 13)) >>> 0;
}

export function relationOf(c, a, b) {
  if (a === b) return null;
  const k = key(a, b);
  const set = c.relations?.[k];
  if (set !== undefined) return set === 'none' ? null : set;
  const pa = playerOf(c, a);
  const pb = playerOf(c, b);
  if (pa.profession === pb.profession && !GENERIC_JOBS.test(pa.profession)) return 'kollegen';
  const r = hash(a, b) % 100;
  if (r < 6) return 'kumpel';
  if (r < 8) return 'schwager';
  if (r < 11) return 'rivalen';
  return null;
}

export function setRelation(c, a, b, type) {
  c.relations ??= {};
  c.relations[key(a, b)] = type ?? 'none';
}

// Alle Beziehungen unter einer Gruppe von Spielern (z. B. dem Kader oder der Startelf).
export function relationsAmong(c, list) {
  const out = [];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const type = relationOf(c, list[i], list[j]);
      if (type) out.push({ a: list[i], b: list[j], type });
    }
  return out;
}

export const relationsOfPlayer = (c, idx) =>
  humanClub(c)
    .squad.filter((o) => o !== idx)
    .map((o) => ({ other: o, type: relationOf(c, idx, o) }))
    .filter((r) => r.type);

// Teamchemie der Aufstellung: Aufschlag je Spieler, gedeckelt.
export function chemistry(c, lineup) {
  const pairs = relationsAmong(c, lineup.filter((idx) => idx != null));
  const mods = {};
  for (const { a, b, type } of pairs)
    for (const idx of [a, b]) {
      mods[idx] ??= {};
      for (const [k, v] of Object.entries(REL[type].mods)) mods[idx][k] = Math.max(-CAP, Math.min(CAP, (mods[idx][k] ?? 0) + v));
    }
  const score = pairs.reduce((s, p) => s + (p.type === 'rivalen' ? -1 : p.type === 'feinde' ? -2 : 1), 0);
  return { pairs, mods, score };
}

export function applyChemistry(c, lineup, players) {
  const { mods } = chemistry(c, lineup);
  for (const p of players) {
    const m = mods[p.poolIndex];
    if (!m) continue;
    for (const [k, v] of Object.entries(m)) p.attrs[k] = Math.max(0.05, Math.min(0.98, p.attrs[k] + v));
  }
  return players;
}

export function relationLabel(c, idx) {
  return relationsOfPlayer(c, idx)
    .map((r) => `${REL[r.type].name}: ${shortName(c, r.other)}`)
    .join(' · ');
}

// Neuzugang: Kennt er jemanden von früher? Schulfreund – oder der Mobber von damals.
export function pastLink(c, newcomer) {
  for (const other of humanClub(c).squad) {
    if (other === newcomer || relationOf(c, newcomer, other)) continue;
    const r = hash(newcomer * 7 + 3, other) % 100;
    if (r < 4) return { other, kind: 'mobber' };
    if (r < 9) return { other, kind: 'schulfreund' };
  }
  return null;
}
