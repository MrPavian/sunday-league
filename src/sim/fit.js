// Aha-Mechaniken: Passt der Spielstil zu Wetter und Platz? Passen die Berufe der
// Spieler zum Stil? Kleine Boni und Mali, die man auf der Taktiktafel sieht und die
// das Kreisblatt hinterher lobt („Kluger Schachzug").
import { tr } from '../core/i18n.js';
import { jobPerk } from '../data/jobs.js';

// Bedingungen des Platzes in Stichworten.
export function conditions(pitch) {
  const s = pitch.surface ?? {};
  return {
    wet: !!s.wet,
    bumpy: s.id === 'ash' || s.id === 'parkGrass' || (s.bumpiness ?? 0) > 0.3,
    hot: (pitch.heat ?? 1) > 1.1,
    windy: !!pitch.wind,
    small: pitch.halfLength < 18,
    big: pitch.halfLength > 22,
  };
}

// Stil gegen Bedingungen: +1 passt, −1 passt nicht. Mit Begründung.
export function styleFit(style, pitch) {
  const c = conditions(pitch);
  const r = [];
  const add = (score, text) => r.push({ score, text });
  if (style === 'kurzpass') {
    if (c.wet || c.bumpy) add(-1, tr('Kurzpass auf holprigem oder nassem Boden – der Ball verspringt', 'Short passing on a bumpy or wet surface – the ball bobbles'));
    if (c.small) add(1, tr('Auf engem Raum läuft das Kurzpassspiel', 'Short passing thrives in tight spaces'));
  }
  if (style === 'mauern' || style === 'konter') {
    if (c.wet || c.bumpy) add(1, tr('Auf schwerem Boden zahlt sich Kompaktheit aus', 'Compactness pays off on heavy ground'));
    if (c.big && style === 'konter') add(1, tr('Viel Platz im Rücken des Gegners – ideal zum Kontern', 'Lots of space behind them – perfect for the counter'));
  }
  if (style === 'pressing' && c.hot) add(-1, tr('Pressing bei Hitze – die Luft ist nach einer Halbzeit raus', 'Pressing in the heat – out of breath after one half'));
  if (style === 'fluegel') {
    if (c.windy) add(-1, tr('Flanken bei Sturmböen landen im Nachbargarten', 'Crosses in a gale end up in the neighbour’s garden'));
    if (c.big) add(1, tr('Breiter Platz – Raum auf den Flügeln', 'Wide pitch – room on the flanks'));
  }
  if (style === 'offensiv' && c.small) add(1, tr('Auf dem kleinen Feld ist jeder Angriff gefährlich', 'On a small pitch every attack is dangerous'));
  const score = Math.max(-1, Math.min(1, r.reduce((s, x) => s + x.score, 0)));
  return { score, reasons: r };
}

// Welche Berufsboni passen zu welchem Stil (nach den Werten, die der Beruf hebt)?
const STYLE_ATTRS = { pressing: ['stamina', 'tackling'], konter: ['pace', 'stamina'], fluegel: ['pace', 'heading'], kurzpass: ['passing', 'technique'], mauern: ['tackling', 'keeping'], offensiv: ['shooting', 'pace'], ausgewogen: [] };
export function jobFits(style, profession) {
  const perk = jobPerk(profession);
  const attrs = STYLE_ATTRS[style] ?? [];
  return !!perk?.attrs && attrs.some((k) => (perk.attrs[k] ?? 0) > 0);
}

// Aufs Spiel anwenden: Stil-Bedingungen und Berufe verschieben die Werte ein wenig.
export function applyFit(team, style, pitch) {
  const fit = styleFit(style, pitch);
  const attrs = STYLE_ATTRS[style] ?? [];
  let matches = 0;
  const players = team.players.map((p) => {
    const d = fit.score * 0.025;
    const job = jobFits(style, p.profession);
    if (job) matches++;
    if (!d && !job) return p;
    const a = { ...p.attrs };
    for (const k of Object.keys(a)) a[k] = Math.max(0.05, Math.min(0.98, a[k] + d));
    if (job) for (const k of attrs) if (a[k] != null) a[k] = Math.min(0.98, a[k] + 0.02);
    return { ...p, attrs: a };
  });
  return { players, fit, matches };
}
