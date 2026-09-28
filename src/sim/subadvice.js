// Wechselhinweise: Wer passt jetzt – nicht nur nach Stärke, sondern nach Lage. Der
// Frische gegen müde Beine, der Schnelle gegen die hohe Linie, der Sichere, wenn
// wir den Ball halten wollen, der Knipser, wenn ein Tor fehlt. Mit Begründung.
import { tr } from '../core/i18n.js';
import { hasProfile } from './profiles.js';
import { orderOf } from './plan.js';
import { usableBench } from './squad.js';

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function benchAdvice(m, team, outPlayer = null) {
  const onPitch = m.players.filter((p) => p.team === team && p.role !== 'gk');
  const tiredness = 1 - mean(onPitch.map((p) => p.stamina));
  const sit = new Set((m.situations?.[team] ?? []).map((s) => s.type));
  const diff = m.score[team] - m.score[1 - team];
  const late = m.time > m.duration * 0.65;
  const deep = orderOf(m, team, 'route') === 'tiefe' || orderOf(m, team, 'route') === 'konter' || sit.has('SPACE_BEHIND');
  const pressing = orderOf(m, team, 'press') === 'hoch' || sit.has('PRESS_TIRING');
  const keep = orderOf(m, team, 'build') === 'halten' || orderOf(m, team, 'build') === 'kurz';
  return usableBench(m, team)
    .map((b) => {
      const a = b.attrs;
      const reasons = [];
      let score = (b.rating ?? 50) / 100 + b.stamina * tiredness;
      if (tiredness > 0.35 && b.stamina > 0.85) reasons.push(tr('frische Beine', 'fresh legs'));
      if (outPlayer && b.position === outPlayer.role) {
        score += 0.15;
        reasons.push(tr('gleiche Position', 'same position'));
      }
      if (deep && b.position !== 'def') {
        score += (a.pace - 0.5) * 1.2 + (hasProfile(b, 'sprinter') ? 0.2 : 0);
        if (a.pace >= 0.65 || hasProfile(b, 'sprinter')) reasons.push(tr('schnell – für den Raum hinter der Abwehr', 'quick – for the space in behind'));
      }
      if (pressing) {
        score += (a.stamina - 0.5) * 0.8 + (a.tackling - 0.5) * 0.5;
        if (a.stamina >= 0.65 || hasProfile(b, 'kaempfer')) reasons.push(tr('Puste fürs Pressing', 'the engine for pressing'));
      }
      if (keep) {
        score += (a.passing + a.technique - 1) * 0.6;
        if (hasProfile(b, 'spielmacher') || hasProfile(b, 'teamplayer') || hasProfile(b, 'ruhepol')) reasons.push(tr('sicher am Ball', 'safe on the ball'));
      }
      if (sit.has('SECOND_BALLS')) {
        score += (a.tackling + a.heading - 1) * 0.5;
        if (hasProfile(b, 'kaempfer') || a.heading >= 0.65) reasons.push(tr('gewinnt zweite Bälle', 'wins the second balls'));
      }
      if (sit.has('OPP_DEEP_BLOCK')) {
        score += (a.technique + a.shooting - 1) * 0.5;
        if (a.shooting >= 0.65) reasons.push(tr('Distanzschuss gegen den Riegel', 'a long shot against the wall'));
      }
      if (late && diff < 0 && b.position !== 'def') {
        score += (a.shooting - 0.5) * 1.2;
        if (a.shooting >= 0.6) reasons.push(tr('Torgefahr für die Schlussphase', 'a goal threat for the closing stages'));
      }
      if (late && diff > 0 && b.position !== 'fwd') {
        score += (a.tackling - 0.5) * 1;
        if (a.tackling >= 0.6) reasons.push(tr('macht hinten dicht', 'shuts the door at the back'));
      }
      return { player: b, score, reasons: reasons.slice(0, 2) };
    })
    .sort((x, y) => y.score - x.score);
}

// Wen rausnehmen? Müde, angeschlagen, mit Gelb vorbelastet – mit Begründung.
export function outAdvice(m, team) {
  return m.players
    .filter((p) => p.team === team && !p.mustLeave)
    .map((p) => {
      const reasons = [];
      let score = 1 - p.stamina;
      if (p.stamina < 0.4) reasons.push(tr('platt', 'exhausted'));
      if (p.knock) {
        score += 0.35;
        reasons.push(tr('angeschlagen', 'carrying a knock'));
      }
      if (p.yellow) {
        score += 0.2;
        reasons.push(tr('Gelb – Gefahr Platzverweis', 'booked – could be sent off'));
      }
      if (p.role === 'gk') score -= 1; // den Torwart nimmt man nur im Notfall raus
      return { player: p, score, reasons };
    })
    .sort((x, y) => y.score - x.score);
}
