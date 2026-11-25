// Spieldaten für Advanced Football Analytics (AFS Phase 1, docs/ADVANCED-FOOTBALL-SYSTEM-00-ENGINE-AUDIT.md Abschnitt 9):
// erweiterte Mitschrift zu Pässen, Zweikämpfen, zweiten Bällen, Territorium und Chancen – je Spieler und Mannschaft.
// Liest den Spielstand nur – kein Zufall, keine Wirkung aufs Spiel (Golden bleibt gleich, gleicher Seed mit und ohne Mitschrift
// gleiches Spiel). Schalter: AN.on. Läuft nach stepLog (match.js).
//
// Herkunft jedes Werts (Regel 1 im Audit, Abschnitt 6): FIELDS[name].src = MEASURED | DERIVED | MODELED.
//   MEASURED – direkt aus einem Ereignis der Engine gezählt.
//   DERIVED  – aus Positionen/Berührungen abgeleitet, ohne neue Annahme außer einer dokumentierten Schwelle.
//   MODELED  – enthält ein Modell (xG, Druck aus profiles.js pressureOn).
//
// Schwellen (alle Spielwerte, nicht gemessen): duelReach – so nah (m) muss der Ballführende am Ball sein, damit ein Tackling oder
// Stochern ein Zweikampf ist (dieselbe 1,0 m wie `contested` in tackles.js resolveTackles); duelWindow – so lange (s) nach dem
// Ansatz zählt ein Ballgewinn noch zum Zweikampf; aerialReach – Gegner so nah (m) am Kopfballspieler = Kopfballduell; looseWindow
// – so lange (s) nach einem Abpraller wird gewartet, wer den Ball als Nächster berührt; sonst behält ihn, wer ihn zuletzt hatte.
import { dist2d } from '../core/math.js';
import { pressureOn } from './profiles.js';
import { shotXg, XG } from './chances.js';
import { advance, thirdOf } from './matchlog.js';

export const AN = { on: true, duelReach: 1.0, duelWindow: 1.5, aerialReach: 1.5, looseWindow: 3, assistWindow: XG.assist };

// Kennzahlen je Spieler und Mannschaft, in dieser Reihenfolge in der Spielzusammenfassung (matchSummary) gespeichert.
export const FIELDS = {
  pass: { src: 'MEASURED', de: 'Pässe' },
  passOk: { src: 'DERIVED', de: 'angekommene Pässe (nächste Berührung durch einen Mitspieler)' },
  pressPass: { src: 'MODELED', de: 'Pässe unter Druck (Druckmodell der Engine > 0)' },
  pressPassOk: { src: 'MODELED', de: 'davon angekommen' },
  packing: { src: 'DERIVED', de: 'überspielte Gegner (zwischen Abspielort und Annahmeort, bei der Annahme)' },
  lines: { src: 'DERIVED', de: 'überspielte Mannschaftsteile (Abwehr, Mittelfeld, Sturm des Gegners)' },
  duelWon: { src: 'DERIVED', de: 'gewonnene Zweikämpfe am Boden' },
  duelLost: { src: 'DERIVED', de: 'verlorene Zweikämpfe am Boden' },
  aerialWon: { src: 'DERIVED', de: 'gewonnene Kopfballduelle' },
  aerialLost: { src: 'DERIVED', de: 'verlorene Kopfballduelle' },
  loose: { src: 'DERIVED', de: 'gewonnene zweite Bälle' },
  shots: { src: 'MEASURED', de: 'Abschlüsse aufs Tor (Schüsse, Kopfbälle aufs Tor)' },
  xg: { src: 'MODELED', de: 'Expected Goals (chances.js shotXg)' },
  xa: { src: 'MODELED', de: 'Expected Assists: xG des Abschlusses nach eigenem angekommenem Pass' },
};
export const KEYS = Object.keys(FIELDS);
// Nur für Mannschaften: Ballbesitz-Sekunden je Drittel (aus Sicht der Mannschaft), DERIVED (letzte Berührung).
export const TEAM_EXTRA = { third: { src: 'DERIVED', de: 'Sekunden mit Ball im eigenen / mittleren / letzten Drittel' } };

const zero = () => Object.fromEntries(KEYS.map((k) => [k, 0]));

export function createAnalytics(m) {
  const players = {};
  for (const p of m.players) players[p.id] = zero();
  return { players, teams: [{ ...zero(), third: [0, 0, 0] }, { ...zero(), third: [0, 0, 0] }], prevTouch: null, pass: null, lastOk: null, duels: [], loose: null };
}

const byId = (m, id) => (id == null ? null : m.players.find((p) => p.id === id) ?? null);
const row = (an, id) => (an.players[id] ??= zero()); // Einwechselspieler
function add(an, p, key, v = 1) {
  row(an, p.id)[key] += v;
  an.teams[p.team][key] += v;
}

// Gegner, die zwischen Abspiel- und Annahmeort liegen (Sicht der passenden Mannschaft), und überspielte Mannschaftsteile.
function overplayed(m, team, fromAdv, toAdv) {
  if (toAdv <= fromAdv) return { packing: 0, lines: 0 };
  let packing = 0;
  const groups = { def: [], mid: [], fwd: [] };
  for (const q of m.players) {
    if (q.team === team) continue;
    const a = advance(m, team, q.pos);
    if (a > fromAdv && a <= toAdv) packing++;
    if (groups[q.role]) groups[q.role].push(a);
  }
  let lines = 0;
  for (const g of Object.values(groups)) {
    if (!g.length) continue;
    const mean = g.reduce((s, a) => s + a, 0) / g.length;
    if (mean > fromAdv && mean <= toAdv) lines++;
  }
  return { packing, lines };
}

function openLoose(an, m, kind, holderId) {
  if (m.phase !== 'play') return;
  an.loose = { t: m.time, kind, by: holderId ?? m.ball.lastTouch };
}

// Nach jedem Schritt (nach stepLog), mit den Ereignissen dieses Schritts.
export function stepAnalytics(m, dt) {
  if (!AN.on) return;
  const an = (m.an ??= createAnalytics(m));
  const { ball } = m;
  for (const e of m.events) {
    const p = byId(m, e.playerId);
    switch (e.type) {
      case 'pass': {
        if (!p) break;
        const press = pressureOn(m, p) > 0;
        add(an, p, 'pass');
        if (press) add(an, p, 'pressPass');
        an.pass = { id: p.id, team: p.team, fromAdv: advance(m, p.team, ball.pos), press, t: m.time };
        if (an.loose && an.loose.by === p.id) resolveLoose(an, m, p);
        break;
      }
      case 'shot':
      case 'header': {
        if (!p || m.phase === 'shootout') break;
        if (e.type === 'header') {
          // Kopfballduell: der nächste Gegner in Reichweite hat es verloren.
          let opp = null, best = AN.aerialReach;
          for (const q of m.players) if (q.team !== p.team && q.role !== 'gk' && dist2d(q.pos, p.pos) < best) (best = dist2d(q.pos, p.pos)), (opp = q);
          if (opp) add(an, p, 'aerialWon'), add(an, opp, 'aerialLost');
          if (!e.onGoal) openLoose(an, m, 'header', p.id);
          if (!e.onGoal) break;
        }
        const xg = shotXg(m, p, { head: e.type === 'header', penalty: e.type === 'shot' && m.penaltyKick === m.time });
        add(an, p, 'shots');
        add(an, p, 'xg', xg);
        const lo = an.lastOk;
        if (lo && lo.to === p.id && m.time - lo.t <= AN.assistWindow) {
          const g = byId(m, lo.id);
          if (g) add(an, g, 'xa', xg);
        }
        an.lastOk = null;
        break;
      }
      case 'slide':
      case 'poke': {
        if (!p) break;
        const opp = byId(m, an.prevTouch);
        if (opp && opp.team !== p.team && dist2d(opp.pos, ball.pos) < AN.duelReach + 0.5) an.duels.push({ by: p.id, vs: opp.id, t: m.time, won: false });
        break;
      }
      case 'tackle':
      case 'poke_won': {
        if (!p) break;
        const d = an.duels.find((x) => x.by === p.id && !x.won);
        if (d) d.won = true;
        openLoose(an, m, 'tackle', p.id);
        break;
      }
      case 'foul': {
        const d = an.duels.find((x) => x.by === e.playerId && !x.won);
        if (d) d.foul = true;
        break;
      }
      case 'block':
      case 'save':
      case 'whiff':
      case 'miscontrol':
      case 'post':
      case 'bar':
        openLoose(an, m, e.type);
        break;
    }
  }
  // Zweikämpfe auflösen: gewonnen sofort, sonst nach duelWindow verloren (Foul zählt als verloren).
  if (an.duels.length) {
    an.duels = an.duels.filter((d) => {
      if (!d.won && !d.foul && m.time - d.t <= AN.duelWindow) return true;
      const a = byId(m, d.by), b = byId(m, d.vs);
      if (a && b) d.won ? (add(an, a, 'duelWon'), add(an, b, 'duelLost')) : (add(an, a, 'duelLost'), add(an, b, 'duelWon'));
      return false;
    });
  }
  // Pass angekommen? Entschieden, sobald ein anderer den Ball berührt (wie matchlog.js).
  const ps = an.pass;
  if (ps && ball.lastTouch && ball.lastTouch !== ps.id) {
    const r = byId(m, ball.lastTouch);
    const g = byId(m, ps.id);
    if (r && g && r.team === ps.team) {
      add(an, g, 'passOk');
      if (ps.press) add(an, g, 'pressPassOk');
      const o = overplayed(m, ps.team, ps.fromAdv, advance(m, ps.team, ball.pos));
      if (o.packing) add(an, g, 'packing', o.packing);
      if (o.lines) add(an, g, 'lines', o.lines);
      an.lastOk = { id: g.id, to: r.id, t: m.time };
    }
    an.pass = null;
  }
  // Zweiter Ball: Wer berührt ihn als Nächster? Ohne neue Berührung behält ihn, wer ihn zuletzt hatte.
  const lb = an.loose;
  if (lb) {
    if (m.phase !== 'play') an.loose = null;
    else if (ball.lastTouch && ball.lastTouch !== lb.by) resolveLoose(an, m, byId(m, ball.lastTouch));
    else if (m.time - lb.t > AN.looseWindow) resolveLoose(an, m, byId(m, lb.by));
  }
  // Territorium: Ballbesitz (letzte Berührung) je Drittel.
  if (m.phase === 'play' && m.lastTouchTeam != null) {
    const t = m.lastTouchTeam;
    const th = thirdOf(advance(m, t, ball.pos));
    an.teams[t].third[th === 'def' ? 0 : th === 'mid' ? 1 : 2] += dt;
  }
  an.prevTouch = ball.lastTouch;
}

function resolveLoose(an, m, p) {
  if (p) add(an, p, 'loose');
  an.loose = null;
}

// Kompakte Spielzusammenfassung zum Speichern: Zahlen in der Reihenfolge von KEYS (xG/xA auf 2 Stellen, Drittel auf ganze
// Sekunden). Spieler ohne jede Aktion fehlen.
const pack = (r) => KEYS.map((k) => (k === 'xg' || k === 'xa' ? Math.round(r[k] * 100) / 100 : r[k]));
export function matchSummary(m) {
  const an = m.an;
  if (!an) return null;
  const players = {};
  for (const [id, r] of Object.entries(an.players)) if (KEYS.some((k) => r[k])) players[id] = pack(r);
  return { v: 1, keys: KEYS, teams: an.teams.map((t) => ({ s: pack(t), third: t.third.map((x) => Math.round(x)) })), players };
}

// Field Tilt: Anteil am Ballbesitz im letzten Drittel (DERIVED); null, wenn keiner dort war.
export function fieldTilt(sum, team) {
  const a = sum.teams[team].third[2], b = sum.teams[1 - team].third[2];
  return a + b ? a / (a + b) : null;
}
