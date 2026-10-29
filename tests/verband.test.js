// Landesverband wählen (ROADMAP 11.10): Ligennamen je Verband, Stufe 1 bleibt die Freizeitliga.
import { describe, expect, it } from 'vitest';
import { createCareer, finishRound, humanClub, nextSeason, seasonOver, setVerband } from '../src/career/career.js';
import { LEAGUES } from '../src/career/clubs.js';
import { leagueTitle, VERBAND_CHOICES, VERBAENDE, verbandLeagues } from '../src/career/verband.js';

describe('Landesverband', () => {
  it('21 Verbände nach Bundesland, je vier verschiedene Klassen (Stufe 2–5)', () => {
    expect(VERBAND_CHOICES()).toHaveLength(21);
    for (const [id, v] of Object.entries(VERBAENDE)) {
      if (!v.tiers) continue;
      expect(new Set(v.tiers).size).toBe(4);
      expect(leagueTitle({ verband: id }, 1)).toBe(LEAGUES[1].name);
    }
  });

  it('ohne Wahl (alte Spielstände) die bisherigen Namen', () => {
    for (let l = 1; l <= 5; l++) expect(leagueTitle({}, l)).toBe(LEAGUES[l].name);
  });

  it('Beispiele aus der Quelle: Westfalen, Bayern, Hessen', () => {
    expect(verbandLeagues({ verband: 'westfalen' })).toBe('Freizeitliga → Kreisliga C → Kreisliga B → Kreisliga A → Bezirksliga');
    expect(verbandLeagues({ verband: 'bayern' })).toBe('Freizeitliga → B-Klasse → A-Klasse → Kreisklasse → Kreisliga');
    expect(leagueTitle({ verband: 'hessen' }, 5)).toMatch(/^Kreisoberliga /);
  });

  it('nur bei der Gründung wählbar; nach dem Aufstieg trägt die Liga den Namen des Verbands', () => {
    const c = createCareer({ seed: 41 });
    expect(setVerband(c, 'bayern')).toBe(false);
    c.founding = true;
    expect(setVerband(c, 'bayern')).toBe(true);
    delete c.founding;
    const me = humanClub(c).id;
    while (!seasonOver(c)) {
      for (const f of c.fixtures[c.round]) f.result ??= f.home === me ? { home: 3, away: 0 } : f.away === me ? { home: 0, away: 3 } : { home: 1, away: 1 };
      finishRound(c);
    }
    nextSeason(c);
    expect(c.level).toBe(2);
    expect(c.league).toBe(leagueTitle(c, 2));
    expect(c.league).toMatch(/^B-Klasse /);
  });
});

describe('Regionale Vereinsnamen', () => {
  const pick = (v, seed = 41) => {
    const c = createCareer({ seed });
    c.founding = true;
    setVerband(c, v);
    return c;
  };
  it('ab Stufe 2 regional, eindeutig (Name, Ort, Kürzel); die Freizeitliga behält ihre Hobbynamen', () => {
    for (const v of ['bayern', 'westfalen', 'sachsen', 'hamburg', 'hessen', 'saarland', 'wuerttemberg']) {
      const c = pick(v);
      const all = [2, 3, 4, 5].flatMap((l) => c.leagues[l]);
      expect(new Set(all.map((d) => d.name)).size).toBe(all.length);
      expect(new Set(all.map((d) => d.short)).size).toBe(all.length);
      for (const d of c.leagues[1]) expect(LEAGUES[1].clubs.some((x) => x.name === d.name)).toBe(true);
    }
  });
  it('typische Endungen je Region und fest je Spielstand', () => {
    const by = pick('bayern').leagues[3].map((d) => d.name).join(' ');
    expect(by).toMatch(/(hofen|ing|ach|kirchen)\b/);
    const ost = pick('sachsen').leagues[4].map((d) => d.name).join(' ');
    expect(ost).toMatch(/(itz|ow|witz|au)\b/);
    expect(pick('westfalen').leagues[5].map((d) => d.name)).toEqual(pick('westfalen').leagues[5].map((d) => d.name));
  });
  it('ohne Verband (alte Spielstände) bleiben die Namen', () => {
    const c = createCareer({ seed: 41 });
    expect(c.clubs.map((x) => x.name)).toEqual(c.clubs.map((x) => x.name));
    for (const x of c.clubs.filter((y) => !y.human)) expect(LEAGUES[1].clubs.some((d) => d.name === x.name)).toBe(true);
  });
});
