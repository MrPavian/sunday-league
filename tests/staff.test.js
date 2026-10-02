import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, playerOf, updateClub } from '../src/career/career.js';
import { appointStaff, EHRENAMT_MONTH, holderOf, outsideCandidate, releaseStaff, squadCandidates, STAFF_MIN_AGE, UEBUNGSLEITER_MONTH, weeklyFee, weeklyStaff } from '../src/career/staff.js';
import { KIT_COST } from '../src/career/finances.js';

const deps = (c) => ({ playerOf, squad: humanClub(c).squad });

describe('Ehrenamt selbst besetzen', () => {
  it('Pauschalen nach § 3 Nr. 26/26a EStG (ab 2026): 3.300 € bzw. 960 € im Jahr', () => {
    expect(UEBUNGSLEITER_MONTH * 12).toBe(3300);
    expect(EHRENAMT_MONTH * 12).toBe(960);
  });

  it(`aus dem Kader: nur Spieler ab ${STAFF_MIN_AGE}, nicht du, jeder nur ein Amt`, () => {
    const c = createCareer({ seed: 5 });
    const cands = squadCandidates(c, 'wirt', deps(c));
    expect(cands.length).toBeGreaterThan(0);
    for (const x of cands) {
      expect(playerOf(c, x.idx).age).toBeGreaterThanOrEqual(STAFF_MIN_AGE);
      expect(x.idx).not.toBe(c.coach?.idx);
    }
    expect(appointStaff(c, 'wirt', { idx: cands[0].idx }, deps(c))).toBe(true);
    expect(c.staff.wirt).toMatchObject({ idx: cands[0].idx, playing: true });
    expect(squadCandidates(c, 'platzwart', deps(c)).some((x) => x.idx === cands[0].idx)).toBe(false);
  });

  it('aus dem Kader kostet nichts; per Aushang wird jede Woche die Pauschale fällig', () => {
    const c = createCareer({ seed: 6 });
    const [a] = squadCandidates(c, 'cotrainer', deps(c));
    appointStaff(c, 'cotrainer', { idx: a.idx }, deps(c));
    const cash0 = c.cash;
    weeklyStaff(c, deps(c));
    expect(c.cash).toBe(cash0);
    appointStaff(c, 'platzwart', 'outside', deps(c));
    expect(c.staff.platzwart).toMatchObject({ outside: true, fee: EHRENAMT_MONTH, idx: null });
    weeklyStaff(c, deps(c));
    expect(cash0 - c.cash).toBe(weeklyFee('platzwart'));
    // Übers Jahr höchstens die Pauschale (gerundet auf ganze Euro je Woche).
    expect(Math.abs(weeklyFee('cotrainer') * 52 - 3300)).toBeLessThanOrEqual(26);
  });

  it('verlässt der Spieler den Verein, ist das Amt frei; als Ehemaliger behält er es', () => {
    const c = createCareer({ seed: 7 });
    const [a, b] = squadCandidates(c, 'wirt', deps(c));
    appointStaff(c, 'wirt', { idx: a.idx }, deps(c));
    appointStaff(c, 'platzwart', { idx: b.idx }, deps(c));
    const club = humanClub(c);
    club.squad = club.squad.filter((x) => x !== a.idx && x !== b.idx);
    c.alumni.push({ idx: b.idx, name: 'B', role: 'Platzwart' });
    const notes = weeklyStaff(c, deps(c));
    expect(c.staff.wirt).toBe(null);
    expect(c.staff.platzwart?.idx).toBe(b.idx);
    expect(notes).toHaveLength(1);
  });

  it('Jugendleiter neu besetzen und abgeben (dann wieder der alte Heinz)', () => {
    const c = createCareer({ seed: 8 });
    const best = squadCandidates(c, 'jugendleiter', deps(c))[0];
    appointStaff(c, 'jugendleiter', { idx: best.idx }, deps(c));
    expect(holderOf(c, 'jugendleiter')).toMatchObject({ from: best.idx, quality: best.quality });
    releaseStaff(c, 'jugendleiter');
    expect(c.youth.coach.name).toBe('Heinz Brückner');
    expect(outsideCandidate(c, 'jugendleiter')).toEqual(outsideCandidate(c, 'jugendleiter')); // je Saison derselbe
  });

  it('Spielwoche läuft mit externem Co-Trainer (Nachfolge-Kandidat ohne Kaderplatz wird übersprungen)', () => {
    const c = createCareer({ seed: 9 });
    c.cash = 1000;
    appointStaff(c, 'cotrainer', 'outside', deps(c));
    for (let i = 0; i < 3; i++) finishRound(c);
    expect(c.staff.cotrainer.outside).toBe(true);
  });
});

describe('Ehrenamt und Kasse: keine Schulden', () => {
  it('per Aushang nur, wenn der erste Monat bezahlbar ist', () => {
    const c = createCareer({ seed: 11 });
    c.cash = UEBUNGSLEITER_MONTH - 1;
    expect(appointStaff(c, 'cotrainer', 'outside', deps(c))).toBe(false);
    expect(c.staff.cotrainer).toBe(null);
    c.cash = UEBUNGSLEITER_MONTH;
    expect(appointStaff(c, 'cotrainer', 'outside', deps(c))).toBe(true);
  });

  it('reicht die Kasse nicht mehr für die Woche, hört der Helfer auf – die Kasse bleibt im Plus', () => {
    const c = createCareer({ seed: 12 });
    c.cash = 300;
    appointStaff(c, 'cotrainer', 'outside', deps(c));
    for (let i = 0; i < 10 && c.staff.cotrainer; i++) weeklyStaff(c, deps(c));
    expect(c.staff.cotrainer).toBe(null);
    expect(c.cash).toBeGreaterThanOrEqual(0);
  });
});

describe('Gründung zu Karrierebeginn', () => {
  it('Erstausstattung ist frei, ein neuer Satz später kostet', () => {
    const c = createCareer({ seed: 10 });
    const cash0 = c.cash;
    updateClub(c, { name: 'FC Testhausen', short: 'fct', kit: { shirt: 0x1c1c1c } }, { free: true });
    expect(c.cash).toBe(cash0);
    expect(humanClub(c)).toMatchObject({ name: 'FC Testhausen', short: 'FCT' });
    expect(humanClub(c).kitHistory ?? []).toHaveLength(0);
    updateClub(c, { kit: { shirt: 0xf2efe6 } });
    expect(cash0 - c.cash).toBe(KIT_COST);
  });
});
