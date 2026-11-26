// Anzeige der Spieldaten (AFS Phase 4): nur Kennzahlen, die die Validierung bestanden haben
// (docs/ADVANCED-FOOTBALL-SYSTEM-03-VALIDATION.md, Abschnitt 6) – mit Herkunft, Mindeststichprobe und als Stufe statt Nachkommastellen.
// Spielbericht (ein Spiel, beschreibend), Spielerkarte (Saison), Tabellenzeile eines Vereins (Saison gegen den Liga-Schnitt).
import { getLang, tr } from '../core/i18n.js';
import { seasonRow } from '../career/seasonstats.js';

// Mindeststichproben und Streuung je Spiel (Spielwerte aus Phase 3: Basis-SD, Rasenplatz und Großfeld gemittelt):
//   passPct – Passquote einer Mannschaft, ab 8 Spielen; SD 0,065 je Spiel
//   packing – überspielte Gegner je angekommenem Pass, Streuung relativ zum Mittel 0,2 je Spiel
//   xg      – xG einer Mannschaft je Spiel, Streuung relativ 0,45 je Spiel
//   tilt    – Feldvorteil (Anteil am Ballbesitz im letzten Drittel), SD 0,12 je Spiel
//   clubMin – vorher zeigt die Tabellenzeile keine Stufen; playerXgMin – ab so vielen Einsätzen „trifft wie erwartet“
export const AFS_VIEW = { passPctMin: 8, sdPassPct: 0.065, relPacking: 0.2, relXg: 0.45, sdTilt: 0.12, clubMin: 3, playerXgMin: 14, z: 1.96 };

const de = () => getLang() === 'de';
const dec = (v, d = 1) => (de() ? v.toFixed(d).replace('.', ',') : v.toFixed(d));
const pct = (v) => `${Math.round(v * 100)} %`;
const ratio = (a, b) => (b > 0 ? a / b : null);

// Stufe gegen einen Vergleichswert: deutlich mehr / im Schnitt / deutlich weniger, je nach Streuung und Zahl der Spiele.
export function level(value, ref, sdPerMatch, n) {
  if (value == null || ref == null || !(n > 0)) return null;
  const se = sdPerMatch / Math.sqrt(n);
  const z = (value - ref) / se;
  return z >= AFS_VIEW.z ? 'more' : z <= -AFS_VIEW.z ? 'less' : 'avg';
}
const LEVEL_TEXT = {
  more: () => tr('deutlich mehr als der Liga-Schnitt', 'clearly above the league average'),
  avg: () => tr('im Liga-Schnitt', 'around the league average'),
  less: () => tr('deutlich weniger als der Liga-Schnitt', 'clearly below the league average'),
};

const TILT_TEXT = {
  more: () => tr('deutlich mehr als die Gegner', 'clearly more than the opponents'),
  avg: () => tr('ausgeglichen', 'even'),
  less: () => tr('deutlich weniger als die Gegner', 'clearly less than the opponents'),
};

// --- Spielbericht: Werte dieses einen Spiels (wie Ballbesitz – beschreibend, keine Prognose).
export function matchRows(m) {
  const T = m.an?.teams;
  if (!T) return [];
  const third = T[0].third[2] + T[1].third[2];
  const rows = [
    [tr('Pässe (angekommen)', 'Passes (completed)'), ...T.map((t) => `${t.pass} (${t.pass ? pct(t.passOk / t.pass) : '–'})`)],
    [tr('Überspielte Gegner', 'Opponents bypassed'), ...T.map((t) => t.packing)],
    [tr('Erwartete Tore (xG)', 'Expected goals (xG)'), ...T.map((t) => dec(t.xg, 2))],
  ];
  if (third > 0) rows.push([tr('Feldvorteil', 'Field tilt'), ...T.map((t) => pct(t.third[2] / third))]);
  return rows;
}
export const matchNote = () =>
  tr(
    'xG: Chancenqualität aus dem Spielmodell · Überspielte Gegner: zwischen Abspiel- und Annahmeort · Feldvorteil: Anteil am Ballbesitz im letzten Drittel.',
    'xG: chance quality from the match model · Opponents bypassed: between where a pass is played and received · Field tilt: share of possession in the final third.',
  );

// --- Spielerkarte: Spieldaten der laufenden Saison; „trifft wie erwartet“ erst ab playerXgMin Einsätzen.
export function playerLine(rec) {
  const r = seasonRow(rec?.an);
  if (!r) return '';
  const parts = [
    `${r.pass} ${tr('Pässe', 'passes')}`,
    `${r.duelWon + r.duelLost} ${tr('Zweikämpfe', 'duels')}`,
    `${r.shots} ${tr('Abschlüsse', 'shots')}`,
    `xG ${dec(r.xg)}`,
  ];
  let verdict = '';
  if ((rec.apps ?? 0) >= AFS_VIEW.playerXgMin && r.xg > 0) {
    const band = AFS_VIEW.z * Math.sqrt(Math.max(1, r.xg)); // Tore schwanken etwa wie Poisson um die xG (hergeleitet)
    const d = (rec.goals ?? 0) - r.xg;
    verdict = d > band ? tr('trifft deutlich öfter als erwartet', 'scores clearly more than expected') : d < -band ? tr('trifft deutlich seltener als erwartet', 'scores clearly less than expected') : tr('trifft etwa wie erwartet', 'scores about as expected');
  } else if (r.xg > 0) verdict = tr(`Urteil ab ${AFS_VIEW.playerXgMin} Einsätzen`, `verdict from ${AFS_VIEW.playerXgMin} appearances`);
  return `<p class="afs-line">${parts.join(' · ')}${verdict ? ` – ${verdict}` : ''}</p>`;
}
// xG einer vergangenen Saison aus der Chronik (null, wenn es damals noch keine Spieldaten gab).
export const xgShort = (v) => dec(v);
export const seasonXg = (season) => (season?.an ? seasonRow(season.an).xg : null);

// --- Tabellenzeile eines Vereins: Saisonwerte gegen den Liga-Schnitt (alle Vereine dieser Liga mit Daten).
function clubRatios(c) {
  const r = seasonRow(c.s);
  return { r, passPct: ratio(r.passOk, r.pass), packing: ratio(r.packing, r.passOk), xg: r.xg / c.n, xgA: (c.xgA ?? 0) / 100 / c.n, tilt: ratio(c.third[2], c.third[2] + (c.attA ?? 0)) };
}
export function clubLine(career, id) {
  const an = career.an;
  const c = an?.clubs?.[id];
  if (!c || !c.s || !c.n) return '';
  const me = clubRatios(c);
  const others = Object.values(an.clubs).filter((x) => x.s && x.n).map(clubRatios);
  const avg = (k) => {
    const v = others.map((o) => o[k]).filter((x) => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const parts = [`xG ${dec(me.xg)} : ${dec(me.xgA)} ${tr('je Spiel', 'per match')}`];
  if (c.n >= AFS_VIEW.passPctMin && me.passPct != null) parts.push(`${tr('Passquote', 'pass completion')} ${pct(me.passPct)}`);
  const lines = [];
  if (c.n >= AFS_VIEW.clubMin) {
    const ap = avg('packing');
    const lp = level(me.packing, ap, (ap ?? 0) * AFS_VIEW.relPacking, c.n);
    if (lp) lines.push(`${tr('Überspielte Gegner je Pass', 'Opponents bypassed per pass')}: ${LEVEL_TEXT[lp]()}`);
    const lt = level(me.tilt, 0.5, AFS_VIEW.sdTilt, c.n); // Feldvorteil gegen die eigenen Gegner; ausgeglichen = 0,5
    if (lt) lines.push(`${tr('Feldvorteil', 'Field tilt')}: ${TILT_TEXT[lt]()}`);
    const ax = avg('xg');
    const lx = level(me.xg, ax, (ax ?? 0) * AFS_VIEW.relXg, c.n);
    if (lx) lines.push(`${tr('Chancen (xG)', 'Chances (xG)')}: ${LEVEL_TEXT[lx]()}`);
  } else lines.push(tr(`Vergleich mit der Liga ab ${AFS_VIEW.clubMin} Spielen`, `league comparison from ${AFS_VIEW.clubMin} matches`));
  return `<div class="afs-club"><p class="afs-line">${parts.join(' · ')}</p><ul class="plain afs-levels">${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>`;
}
