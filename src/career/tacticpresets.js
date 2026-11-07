// Taktik-Vorlagen (vom Nutzer gewünscht, 2026-11-05): verschiedene Taktiken voreinstellen, benennen und mit einem Tipp
// auswählen, statt jedes Mal System, Stil und Spielplan umzustellen. Eine Vorlage hält den Spielstil, das System je
// Spielerzahl (5er bis 11er) und die Spielplan-Befehle. Sie gehört dem Trainer (career.tacticPresets) und kommt bei einem
// Vereinswechsel mit. Höchstens PRESET_MAX Vorlagen (Spielwert).
import { humanClub } from './career.js';
import { SWITCH_MAX, SWITCH_MINUTES, SWITCH_WHEN } from '../sim/switches.js';
import { systemsFor } from '../sim/tactics.js';

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
  c.tacticSwitches = switchesOf(c).filter((s) => s.preset !== Number(id)); // Regeln mit dieser Vorlage fallen weg
  return true;
}

// Ist gerade genau diese Vorlage eingestellt?
export function presetActive(c, p) {
  const now = snapshot(humanClub(c));
  const sys = (o) => JSON.stringify(Object.entries(o).sort());
  return now.style === p.style && sys(now.orders) === sys(p.orders) && Object.entries(p.systems).every(([f, s]) => now.systems[f] === s);
}

// Umschalten im Spiel (switches.js): Regeln „ab Minute X, wenn Spielstand Y → Vorlage Z“. Sie gehören wie die Vorlagen
// dem Trainer (career.tacticSwitches). Höchstens SWITCH_MAX (Spielwert).
export const switchesOf = (c) => (c.tacticSwitches ??= []);

export function addSwitch(c) {
  const list = switchesOf(c);
  const first = presetsOf(c)[0];
  if (!first || list.length >= SWITCH_MAX) return false;
  list.push({ minute: 70, when: 'any', preset: first.id });
  return true;
}

export function setSwitch(c, i, field, value) {
  const sw = switchesOf(c)[Number(i)];
  if (!sw) return false;
  if (field === 'minute' && SWITCH_MINUTES.includes(Number(value))) sw.minute = Number(value);
  else if (field === 'when' && SWITCH_WHEN.includes(value)) sw.when = value;
  else if (field === 'preset' && presetsOf(c).some((p) => p.id === Number(value))) sw.preset = Number(value);
  else return false;
  return true;
}

export function removeSwitch(c, i) {
  const list = switchesOf(c);
  if (!list[Number(i)]) return false;
  list.splice(Number(i), 1);
  return true;
}

// Vorlage fürs Spiel auflösen: das System gilt nur, wenn die Vorlage eins für diese Spielerzahl hat.
const resolve = (p, format) => {
  const sys = p.systems?.[format];
  return { id: p.id, name: p.name, style: p.style, system: sys && systemsFor(format)[sys] ? sys : null, orders: { ...(p.orders ?? {}) } };
};

// Was der eigene Verein zusätzlich ins Spiel mitnimmt: alle Vorlagen (zum Umschalten per Tipp) und die Regeln.
export function matchTactic(c, format) {
  const presets = presetsOf(c).map((p) => resolve(p, format));
  const switches = switchesOf(c)
    .map((s) => {
      const p = presets.find((x) => x.id === s.preset);
      return p ? { ...p, minute: s.minute, when: s.when } : null;
    })
    .filter(Boolean);
  return presets.length ? { presets, switches } : {};
}
