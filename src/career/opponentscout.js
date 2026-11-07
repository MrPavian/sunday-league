// Gegner-Scouting vor dem Spiel (ROADMAP 11.17 Punkt 8): Was weiß man über den nächsten Gegner? Form und Tabelle sind öffentlich;
// Mannschaftsstärke, Lieblingsstil, Stärken und der gefährlichste Spieler werden genauer, je besser man seine Spieler kennt
// (scouting.js: Kenntnis 0–3 je Spieler; „Spiel anschauen“ hebt sie, die eigene Liga ist mindestens „gesehen“). Ein Tipp vom Wirt
// (pub.js) zum selben Gegner gibt eine Stufe dazu. Nur Anzeige – auf das Spiel wirkt der Bericht nicht.
// Spielwerte: Stufe = gerundetes Mittel der Kenntnis über die besten elf; Spanne der Teamstärke wie SPREAD je Spieler.
import { tr } from '../core/i18n.js';
import { STYLES } from '../sim/tactics.js';
import { playerOf, table, tacticOf } from './career.js';
import { estimate, estimateText, knowledge, SPREAD } from './scouting.js';

const FIELD_ATTRS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading'];
const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x1b873593);

// Die besten n eines Kaders (nach echter Stärke – wer aufläuft, entscheidet der Gegner, nicht unser Wissen).
const topOf = (c, club, n) => [...club.squad].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating).slice(0, n);

// Wie genau ist der Bericht? 0 unbekannt … 3 gescoutet.
export function reportLevel(c, club, format = 11) {
  const top = topOf(c, club, format);
  if (!top.length) return 0;
  const mean = top.reduce((s, idx) => s + knowledge(c, idx), 0) / top.length;
  const tip = c.week?.pub?.intel?.club === club.id ? 1 : 0;
  return Math.min(3, Math.round(mean) + tip);
}

// Letzte fünf Ergebnisse (S/U/N aus Sicht des Vereins), älteste zuerst.
export function formOf(c, clubId, n = 5) {
  const out = [];
  for (const round of c.fixtures ?? [])
    for (const f of round) {
      if (!f.result || (f.home !== clubId && f.away !== clubId)) continue;
      const [us, them] = f.home === clubId ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
      out.push(us > them ? 'w' : us === them ? 'd' : 'l');
    }
  return out.slice(-n);
}

export function scoutReport(c, club, format = 11) {
  const level = reportLevel(c, club, format);
  const top = topOf(c, club, format);
  const field = top.filter((idx) => playerOf(c, idx).position !== 'gk');
  // Teamstärke als Spanne: Mittel der besten elf, Lage der Spanne fest je Verein und Stufe.
  const real = top.length ? top.reduce((s, idx) => s + playerOf(c, idx).rating, 0) / top.length : 0;
  const s = SPREAD[level];
  const u = 0.15 + ((hash(club.id.length, ...[...club.id].map((ch) => ch.charCodeAt(0)), level, c.seed ?? 0) % 1000) / 1000) * 0.7;
  const lo = Math.round(real - u * 2 * s);
  const strength = s ? { lo, hi: lo + 2 * s, exact: false } : { lo: Math.round(real), hi: Math.round(real), exact: true };

  const rows = table(c);
  const place = rows.findIndex((r) => r.club.id === club.id) + 1 || null;
  const out = { level, strength, form: formOf(c, club.id), place, style: null, system: null, strengths: [], weakness: null, danger: null };
  if (level >= 1) {
    const t = tacticOf(club, format);
    out.style = STYLES[t.style]?.label ?? t.style;
    if (level >= 2) out.system = t.system ?? null;
    // Stärken und Schwäche (Schlüssel der Spielerwerte): Mittel der Feldspieler je Wert, die höchsten und der niedrigste.
    if (field.length) {
      const avg = Object.fromEntries(FIELD_ATTRS.map((k) => [k, field.reduce((sum, idx) => sum + (playerOf(c, idx).attrs?.[k] ?? 0), 0) / field.length]));
      const ranked = FIELD_ATTRS.slice().sort((a, b) => avg[b] - avg[a]);
      out.strengths = ranked.slice(0, level >= 2 ? 2 : 1);
      if (level >= 2) out.weakness = ranked[ranked.length - 1];
    }
    // Gefährlichster Spieler: meiste Saisontore, sonst bester Schuss unter den Feldspielern.
    const pick = field
      .map((idx) => ({ idx, goals: c.players[idx]?.goals ?? 0, shot: playerOf(c, idx).attrs?.shooting ?? 0 }))
      .sort((a, b) => b.goals - a.goals || b.shot - a.shot)[0];
    if (pick) {
      const p = playerOf(c, pick.idx);
      const e = estimate(c, pick.idx);
      out.danger = { idx: pick.idx, name: p.name, goals: pick.goals, rating: estimateText(e), traits: e.traits ? (p.traits ?? []) : null };
    }
  }
  return out;
}

export const LEVEL_TEXT = () => [
  tr('Kaum etwas bekannt – schau sie dir an.', 'Hardly anything known – go and watch them.'),
  tr('Grob bekannt: Stil und ein Name, Stärke als Spanne.', 'Roughly known: style and a name, strength as a range.'),
  tr('Gut beobachtet: System, Stärken und Schwäche.', 'Well observed: system, strengths and weakness.'),
  tr('Genau gescoutet.', 'Scouted in detail.'),
];
