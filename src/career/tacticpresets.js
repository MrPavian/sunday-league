// Taktik-Vorlagen (vom Nutzer gewünscht, 2026-11-05): verschiedene Taktiken voreinstellen, benennen und mit einem Tipp
// auswählen, statt jedes Mal System, Stil und Spielplan umzustellen. Eine Vorlage hält den Spielstil, das System je
// Spielerzahl (5er bis 11er) und die Spielplan-Befehle. Sie gehört dem Trainer (career.tacticPresets) und kommt bei einem
// Vereinswechsel mit. Höchstens PRESET_MAX Vorlagen (Spielwert).
import { humanClub } from './career.js';

export const PRESET_MAX = 8;
export const NAME_MAX = 24;

export const presetsOf = (c) => (c.tacticPresets ??= []);
const clean = (name) => String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
const snapshot = (club) => {
  const t = club.tactic ?? { style: 'ausgewogen', systems: {} };
  return { style: t.style ?? 'ausgewogen', systems: { ...(t.systems ?? {}) }, orders: { ...(t.orders ?? {}) } };
};

// Speichert die aktuelle Taktik unter diesem Namen (gleicher Name: überschreiben). Liefert die Vorlage oder einen Grund.
export function savePreset(c, name) {
  const n = clean(name);
  if (!n) return { ok: false, reason: 'name' };
  const list = presetsOf(c);
  const same = list.find((p) => p.name.toLowerCase() === n.toLowerCase());
  if (!same && list.length >= PRESET_MAX) return { ok: false, reason: 'full' };
  const data = snapshot(humanClub(c));
  if (same) Object.assign(same, data, { name: n });
  else list.push({ id: (c.tacticPresetSeq = (c.tacticPresetSeq ?? 0) + 1), name: n, ...data });
  return { ok: true, preset: same ?? list.at(-1) };
}

export function applyPreset(c, id) {
  const p = presetsOf(c).find((x) => x.id === Number(id));
  if (!p) return false;
  const club = humanClub(c);
  const before = JSON.stringify(club.tactic?.systems ?? {});
  club.tactic = { ...(club.tactic ?? {}), style: p.style, systems: { ...p.systems }, orders: { ...p.orders } };
  if (before !== JSON.stringify(club.tactic.systems) && c.week) c.week.lineup = null; // anderes System – neu aufstellen
  return true;
}

export function deletePreset(c, id) {
  const list = presetsOf(c);
  const i = list.findIndex((x) => x.id === Number(id));
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

// Ist gerade genau diese Vorlage eingestellt?
export function presetActive(c, p) {
  const now = snapshot(humanClub(c));
  const sys = (o) => JSON.stringify(Object.entries(o).sort());
  return now.style === p.style && sys(now.orders) === sys(p.orders) && Object.entries(p.systems).every(([f, s]) => now.systems[f] === s);
}
