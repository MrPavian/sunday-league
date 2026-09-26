// Taktik: System (wer steht wo) und Spielstil (wie hoch, wie breit, wie direkt).
// Koordinaten wie in formation.js: Anteil von halfLength/halfWidth, Team 0 spielt nach +x.
import { tr } from '../core/i18n.js';
import { FORMATIONS } from './formation.js';

const gk = { role: 'gk', x: -0.96, z: 0 };
const d = (x, z) => ({ role: 'def', x, z });
const mi = (x, z) => ({ role: 'mid', x, z });
const f = (x, z) => ({ role: 'fwd', x, z });

// Systeme je Spielformat (Anzahl inklusive Torwart). Das erste ist der Standard.
export const SYSTEMS = {
  4: {
    '1-1-1': { label: '1-1-1', formation: FORMATIONS[4] },
    '2-1': { label: '2-1', formation: [gk, d(-0.6, -0.35), d(-0.6, 0.35), f(-0.2, 0)] },
    '1-2': { label: '1-2', formation: [gk, d(-0.6, 0), f(-0.22, -0.4), f(-0.22, 0.4)] },
  },
  5: {
    '2-1-1': { label: '2-1-1', formation: FORMATIONS[5] },
    raute: { label: tr('Raute 1-2-1', 'Diamond 1-2-1'), formation: [gk, d(-0.64, 0), mi(-0.4, -0.45), mi(-0.4, 0.45), f(-0.15, 0)] },
    '2-2': { label: '2-2', formation: [gk, d(-0.62, -0.34), d(-0.62, 0.34), f(-0.2, -0.35), f(-0.2, 0.35)] },
    '1-1-2': { label: '1-1-2', formation: [gk, d(-0.64, 0), mi(-0.4, 0), f(-0.16, -0.4), f(-0.16, 0.4)] },
  },
  7: {
    '2-3-1': { label: '2-3-1', formation: FORMATIONS[7] },
    '3-2-1': { label: '3-2-1', formation: [gk, d(-0.66, -0.45), d(-0.68, 0), d(-0.66, 0.45), mi(-0.4, -0.3), mi(-0.4, 0.3), f(-0.14, 0)] },
    '2-2-2': { label: '2-2-2', formation: [gk, d(-0.66, -0.32), d(-0.66, 0.32), mi(-0.42, -0.4), mi(-0.42, 0.4), f(-0.16, -0.3), f(-0.16, 0.3)] },
    '3-1-2': { label: '3-1-2', formation: [gk, d(-0.66, -0.45), d(-0.68, 0), d(-0.66, 0.45), mi(-0.42, 0), f(-0.16, -0.35), f(-0.16, 0.35)] },
  },
};

// Spielstile. Werte sind Verschiebungen gegenüber „ausgewogen":
//   line     – wie hoch der Block steht (Anteil halfLength)
//   compact  – wie eng die Reihen gegen den Ball zusammenrücken (1 = Grundordnung)
//   width    – Breite bei Ballbesitz
//   push     – wie weit bei Ballbesitz aufgerückt wird
//   fwdHold  – Stürmer bleiben bei Ballverlust vorne (Konter)
//   forward  – Gewicht für Pässe nach vorne, shortPass – Strafe für lange Pässe
//   passRate – wie gern statt Dribbling abgespielt wird, cross – Flankenlust
//   press    – zweiter Mann geht drauf, shoot – Schussfreude (Meter Reichweite)
//   tire     – Kraftverbrauch (Pressing kostet Puste), long – lange Bälle auf die Spitze
export const STYLES = {
  ausgewogen: {
    label: tr('Ausgewogen', 'Balanced'),
    desc: tr('Jeder hält seine Position, rückt mit auf, hilft hinten. Kreisliga-Lehrbuch.', 'Everyone holds his position, pushes up, helps at the back. The textbook.'),
    line: 0, compact: 0.85, width: 1, push: 0.22, fwdHold: 0, forward: 0.05, shortPass: 0.035, passRate: 1, cross: 0.5, press: false, shoot: 0, long: 0.1, tire: 1,
  },
  offensiv: {
    label: tr('Offensiv', 'Attacking'),
    desc: tr('Hoch stehen, viele Leute vorne, früh schießen. Hinten wird es luftig.', 'High line, bodies forward, shoot early. It gets draughty at the back.'),
    line: 0.1, compact: 0.9, width: 1.05, push: 0.32, fwdHold: 0.05, forward: 0.07, shortPass: 0.03, passRate: 1, cross: 0.55, press: false, long: 0.1, tire: 1.12, shoot: 2,
  },
  konter: {
    label: tr('Auf Konter lauern', 'Counter-attack'),
    desc: tr('Tief und kompakt stehen, Ball erobern – und dann schnell und steil nach vorne. Die Spitzen bleiben oben.', 'Sit deep and compact, win the ball – then go forward fast and direct. The strikers stay high.'),
    line: -0.14, compact: 0.72, width: 0.9, push: 0.28, fwdHold: 0.22, forward: 0.1, shortPass: 0.02, passRate: 0.9, cross: 0.45, press: false, long: 0.55, tire: 0.95, shoot: 1,
  },
  fluegel: {
    label: tr('Flügelspiel', 'Wing play'),
    desc: tr('Breit machen, über außen kommen, flanken. Wer vorne einen Kopfballspieler hat, liebt das.', 'Stretch the pitch, come down the flanks, cross. Heaven if you have a big man up front.'),
    line: 0, compact: 0.85, width: 1.35, push: 0.24, fwdHold: 0, forward: 0.05, shortPass: 0.03, passRate: 1.05, cross: 0.85, press: false, long: 0.15, tire: 1, shoot: 0,
  },
  kurzpass: {
    label: tr('Kurzpassspiel', 'Short passing'),
    desc: tr('Ball laufen lassen, kurze Wege, wenig Dribblings. Sieht schön aus – wenn es klappt.', 'Keep the ball moving, short distances, few dribbles. Looks lovely – when it works.'),
    line: 0.03, compact: 0.8, width: 1.05, push: 0.2, fwdHold: 0, forward: 0.035, shortPass: 0.07, passRate: 1.6, cross: 0.3, press: false, long: 0, tire: 0.95, shoot: -1,
  },
  pressing: {
    label: tr('Hohes Pressing', 'High press'),
    desc: tr('Den Gegner schon am Strafraum stören, zu zweit drauf. Kostet Puste – nach 70 Minuten wird es zäh.', 'Harass them at their own box, two men on the ball. Costs stamina – after 70 minutes it gets heavy.'),
    line: 0.12, compact: 0.8, width: 1, push: 0.25, fwdHold: 0.08, forward: 0.06, shortPass: 0.035, passRate: 1.05, cross: 0.5, press: true, long: 0.1, tire: 1.3, shoot: 0,
  },
  mauern: {
    label: tr('Mauern', 'Park the bus'),
    desc: tr('Alle hinter den Ball, lange Bälle nach vorne. Hässlich, aber es gibt Punkte.', 'Everyone behind the ball, long balls forward. Ugly, but it earns points.'),
    line: -0.22, compact: 0.62, width: 0.8, push: 0.12, fwdHold: 0.08, forward: 0.08, shortPass: 0.01, passRate: 0.8, cross: 0.4, press: false, long: 0.6, tire: 0.9, shoot: 2,
  },
};
export const STYLE_IDS = Object.keys(STYLES);

export const systemsFor = (format) => SYSTEMS[format] ?? SYSTEMS[5];

export function systemFormation(format, id) {
  const all = systemsFor(format);
  return (all[id] ?? Object.values(all)[0]).formation;
}

export function normalizeTactic(tactic, format) {
  const systems = systemsFor(format);
  return {
    system: systems[tactic?.system] ? tactic.system : Object.keys(systems)[0],
    style: STYLES[tactic?.style] ? tactic.style : 'ausgewogen',
  };
}

export const styleOf = (m, team) => STYLES[m.plan?.[team]?.style] ?? STYLES.ausgewogen;

// Feste Taktik für KI-Vereine: jeder Verein hat seine Handschrift.
export function clubTactic(clubId, format) {
  let h = 5381;
  for (const ch of String(clubId)) h = (Math.imul(h, 33) + ch.charCodeAt(0)) >>> 0;
  const systems = Object.keys(systemsFor(format));
  const styles = ['ausgewogen', 'ausgewogen', 'offensiv', 'konter', 'fluegel', 'kurzpass', 'pressing', 'mauern'];
  return { system: systems[h % systems.length], style: styles[(h >>> 5) % styles.length] };
}

export const tacticLabel = (tactic, format) => {
  const t = normalizeTactic(tactic, format);
  return `${systemsFor(format)[t.system].label} · ${STYLES[t.style].label}`;
};
