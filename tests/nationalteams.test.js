// Turniere der Nationalteams (nationalteams.js, natboost.js): Kalender, Feld und Format, Nominierung nur aus den Profiligen,
// Schnellmodell und 3D-Spiel, Marktwert-Schub, Abwesenheit nach Winterturnieren, Entschädigung bei der Weltmeisterschaft.
import { afterEach, describe, expect, it } from 'vitest';
import { INTER } from '../src/career/natplayoffs.js';
import { createCareer, humanClub, playerOf, simulate } from '../src/career/career.js';
import { NATIONS } from '../src/data/nations.js';
import { dueTournaments, finishAll, missedRounds, NAT, natRunning, nextOwnMatch, prepareNatMatch, quickOwnMatch, recordNatMatch, startTournament, TOURNAMENTS } from '../src/career/nationalteams.js';
import { natBoostMul } from '../src/career/natboost.js';
import { salaryDemand, sign } from '../src/career/contracts.js';

const NOMINATE = NAT.nominate;
const TIERS = { ...NAT.tier };
afterEach(() => {
  NAT.nominate = NOMINATE;
  Object.assign(NAT.tier, TIERS);
});
const career = (level = 9, seed = 7) => {
  const c = createCareer({ seed });
  c.level = level;
  return c;
};
const squad = (c) => humanClub(c).squad.filter((i) => i !== c.coach?.idx);
// Für die Tests: jeder eigene Spieler eines Teilnehmerlandes ist gut genug.
const callUp = (c, nations) => {
  NAT.nominate = 1e9;
  c.natLock = {};
  squad(c).forEach((idx, i) => (c.natLock[idx] = nations[i % nations.length]));
};

describe('Kalender', () => {
  it('Rhythmus wie in echt: Weltmeisterschaft 2030, Europa und Südamerika 2028, Asien Januar 2027, Afrika im Winter', () => {
    const c = career(1);
    const at = (s) => ((c.season = s), [dueTournaments(c, 'summer').join(','), dueTournaments(c, 'winter').join(',')]);
    expect(at(1)).toEqual(['nam', 'asi']); // Sommer 2027, Januar 2027
    expect(at(2)).toEqual(['em,sam,oce', 'afr']); // Sommer 2028, Dezember 2027
    expect(at(3)).toEqual(['nam', '']);
    expect(at(4)).toEqual(['wm', 'afr']); // Sommer 2030
    expect(at(5)).toEqual(['nam', 'asi']); // Januar 2031
  });
});

describe('Feld und Format', () => {
  it('Teilnehmer je Verband, Gruppen zu vier, so viele Spiele wie in echt', () => {
    const counts = { wm: 104 - 1, em: 51, sam: 32 - 1, nam: 31, afr: 52 - 1, asi: 51, oce: 15 }; // ohne Spiel um Platz drei
    for (const [id, cfg] of Object.entries(TOURNAMENTS)) {
      const c = career(1);
      const t = startTournament(c, id);
      const size = Object.values(cfg.slots).reduce((a, b) => a + b, 0) + (INTER[id]?.places ?? 0); // + interkontinentale Play-offs
      expect(t.field, id).toHaveLength(size);
      expect(new Set(t.field).size).toBe(size);
      for (const [conf, n] of Object.entries(cfg.slots)) {
        const got = t.field.filter((x) => NATIONS[x].conf === conf).length;
        expect(got, `${id} ${conf}`).toBeGreaterThanOrEqual(n);
        expect(got, `${id} ${conf}`).toBeLessThanOrEqual(n + Math.min(INTER[id]?.from[conf] ?? 0, INTER[id]?.places ?? 0));
      }
      expect(t.groups.every((g) => g.length === 4)).toBe(true);
      // Ohne eigene Spieler läuft das Turnier sofort durch.
      expect(t.done).toBe(true);
      const h = c.natHistory.at(-1);
      expect(h.id).toBe(id);
      expect(t.field).toContain(h.winner);
      expect(t.matches.filter((m) => m.result), id).toHaveLength(counts[id]);
      expect(t.matches.filter((m) => m.step !== 'f' && !m.step.startsWith('g')).every((m) => m.result)).toBe(true);
    }
  });
  it('fest je Karriere: gleicher Seed, gleicher Sieger; zweimal starten geht nicht', () => {
    const a = career(1, 11);
    const b = career(1, 11);
    startTournament(a, 'em');
    startTournament(b, 'em');
    expect(a.natHistory[0].winner).toBe(b.natHistory[0].winner);
    expect(startTournament(a, 'em')).toBeNull();
  });
});

describe('Qualifikation', () => {
  it('Gruppen je Verband, die Weitergekommenen bilden das Feld; ohne Überzahl keine Qualifikation', () => {
    const c = career(1, 3);
    const t = startTournament(c, 'wm');
    expect(t.quali.uefa).toHaveLength(12); // wie in echt zwölf Gruppen
    expect(t.quali.conmebol).toHaveLength(1); // eine Liga
    expect(t.quali.caf).toHaveLength(9);
    for (const [conf, tables] of Object.entries(t.quali)) {
      const q = tables.flat().filter((r) => r.q).map((r) => r.nid);
      expect(q.length, conf).toBeGreaterThanOrEqual(TOURNAMENTS.wm.slots[conf]); // plus Sieger der interkontinentalen Play-offs
      expect(q.length, conf).toBeLessThanOrEqual(TOURNAMENTS.wm.slots[conf] + (INTER.wm.from[conf] ?? 0));
      for (const nid of q) expect(t.field).toContain(nid);
      for (const tb of tables) expect(tb[0].q, `${conf}: Gruppensieger`).toBe(true);
    }
    const nam = startTournament(career(1, 3), 'nam'); // 16 Länder, 16 Plätze
    expect(nam.quali).toEqual({});
  });
  it('auch große Länder können scheitern – das steht im Kreisblatt', () => {
    let failed = 0;
    for (let seed = 1; seed <= 60 && !failed; seed++) {
      const c = career(1, seed);
      const t = startTournament(c, 'wm');
      if (t.failed.length) {
        failed++;
        expect(c.natHistory.at(-1).failed).toEqual(t.failed);
        expect([...(c.week?.chat ?? []).map((m) => m.text), ...(c.pendingNews ?? [])].some((x) => /Qualifikation/.test(x))).toBe(true);
      }
    }
    expect(failed).toBe(1);
  });
});

describe('Nominierung', () => {
  it('nur aus den Profiligen, nur für Teilnehmerländer, nur wer gut genug ist', () => {
    const low = career(8);
    callUp(low, ['jpn']);
    expect(Object.keys(startTournament(low, 'wm').own)).toEqual([]);
    const c = career(9);
    callUp(c, ['jpn', 'fij']); // Fidschi spielt keine Weltmeisterschaft (Ozeanien hat einen Platz)
    const t = startTournament(c, 'wm');
    expect(t.own.jpn?.length).toBeGreaterThan(0);
    expect(t.own.fij).toBeUndefined();
    NAT.nominate = NOMINATE;
    const d = career(9);
    d.natLock = Object.fromEntries(squad(d).map((i) => [i, 'jpn']));
    const real = startTournament(d, 'wm');
    for (const idx of real.own.jpn ?? []) expect(playerOf(d, idx).rating).toBeGreaterThanOrEqual(real.str.jpn - NAT.nominate - 30);
    expect(real.own.jpn ?? []).toHaveLength(0); // Regionalliga-Spieler sind für Japan zu schwach
  });
});

describe('Spiele', () => {
  it('Europameisterschaft: Entschädigung je Spieler und Tag nach Liga (1. Liga 10 187 €, ab der 3. Profiliga 3395 €)', () => {
    for (const k of Object.keys(NAT.tier)) NAT.tier[k] = 60;
    for (const [level, rate] of [
      [12, 10187],
      [10, 3395],
    ]) {
      const c = career(level, 9);
      c.season = 2; // Sommer 2028
      const nid = startTournament(career(level, 9), 'em').field[0];
      callUp(c, [nid]);
      const cash = c.cash;
      startTournament(c, 'em');
      finishAll(c);
      const h = c.natHistory.at(-1);
      expect(h.id).toBe('em');
      expect(h.own.length).toBeGreaterThan(0);
      for (const o of h.own) expect(o.pay % rate).toBe(0);
      expect(h.own.every((o) => o.pay >= rate * 3)).toBe(true);
      expect(c.cash).toBeCloseTo(cash + h.own.reduce((s, o) => s + o.pay, 0), 0);
    }
  });

  it('Schnellmodell bis zum Ende: Einsätze, Marktwert-Schub, Entschädigung bei der Weltmeisterschaft', () => {
    for (const k of Object.keys(NAT.tier)) NAT.tier[k] = 60; // alle Länder so schwach, dass die eigenen Spieler in die Startelf kommen
    const probe = career(9);
    const nid = startTournament(probe, 'wm').field[0];
    const c = career(9);
    callUp(c, [nid]);
    const cash = c.cash;
    const t = startTournament(c, 'wm');
    expect(t.own[nid].length).toBeGreaterThan(0);
    expect(nextOwnMatch(c)).toBeTruthy();
    let n = 0;
    while (quickOwnMatch(c)) n++;
    expect(n).toBeGreaterThanOrEqual(3);
    expect(t.done).toBe(true);
    expect(natRunning(c)).toHaveLength(0);
    const h = c.natHistory.at(-1);
    expect(h.own.length).toBe(t.own[nid].length);
    expect(h.own.every((o) => o.pay >= 5000 * 10)).toBe(true);
    expect(c.cash).toBeCloseTo(cash + h.own.reduce((s, o) => s + o.pay, 0), 0);
    expect(h.own.reduce((s, o) => s + o.apps, 0)).toBeGreaterThan(0);
    const played = h.own.find((o) => o.apps > 0);
    expect(played.boost).toBeGreaterThan(0);
    expect(natBoostMul(c, played.idx)).toBeGreaterThan(1);
    expect(c.players[played.idx].natCaps).toBe(played.apps);
  });

  it('3D-Spiel: beide Teams von der KI, Ergebnis und Einsätze aus der Engine', async () => {
    const c = career(9);
    callUp(c, ['jpn']);
    startTournament(c, 'wm');
    const next = nextOwnMatch(c);
    const prep = prepareNatMatch(c, next, { duration: 60 });
    expect(prep.match.humanTeam ?? null).toBeNull();
    expect(prep.match.players).toHaveLength(22);
    expect(prep.match.teams.map((x) => x.name)).toContain('Japan');
    await simulate(prep);
    expect(recordNatMatch(c, prep)).toBe(true);
    expect(next.m.result).toBeTruthy();
    expect(next.m.watched).toBe(true);
    expect(recordNatMatch(c, prep)).toBe(false); // nicht doppelt
    finishAll(c);
    expect(natRunning(c)).toHaveLength(0);
  });

  it('Winterturnier: wer lange dabei ist, fehlt danach Ligaspiele', () => {
    const c = career(9);
    const t = { id: 'asi', year: 2027 };
    expect(missedRounds(c, t, Date.UTC(2027, 0, 5))).toBe(0); // vor dem Ende der Winterpause zurück
    expect(missedRounds(c, t, Date.UTC(2027, 1, 5))).toBeGreaterThanOrEqual(1);
    const afr = { id: 'afr', year: 2027 };
    expect(missedRounds(c, afr, Date.UTC(2028, 0, 18))).toBeGreaterThanOrEqual(1);
    expect(missedRounds(c, afr, Date.UTC(2027, 11, 30))).toBe(0);
  });
});

describe('Marktwert', () => {
  it('Schub hebt Gehaltsforderung und Ablöse, klingt nach einer Saison ab', () => {
    const c = career(9);
    const idx = squad(c)[0];
    sign(c, idx, 2, 1000);
    const before = salaryDemand(c, idx);
    c.players[idx].natBoost = { v: 0.2, season: c.season };
    expect(natBoostMul(c, idx)).toBeCloseTo(1.2);
    expect(salaryDemand(c, idx)).toBeGreaterThan(before);
    c.season += 1;
    expect(natBoostMul(c, idx)).toBeCloseTo(1.2);
    c.season += 1;
    expect(natBoostMul(c, idx)).toBeCloseTo(1.1);
    c.season += 1;
    expect(natBoostMul(c, idx)).toBe(1);
  });
});
