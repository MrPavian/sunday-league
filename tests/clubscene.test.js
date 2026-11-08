import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { agenda, cabinet, clubScene } from '../src/ui/ClubScene.js';
import { startEuro } from '../src/career/europa.js';
import { CLUB_AREAS } from '../src/ui/Clubhouse.js';

// UI 3.0 Phase 2: Jedes Objekt im Vereinsheim führt dorthin, wohin auch die Leiste führt.
describe('Vereinsheim-Szene', () => {
  it('jedes Objekt ist ein Knopf mit Ziel, Beschriftung und Wert; Ziele sind echte Tabs', () => {
    const c = createCareer({ seed: 9 });
    const html = clubScene(c);
    const tabs = [...html.matchAll(/data-action="tab" data-value="([a-z]+)"/g)].map((m) => m[1]);
    const known = CLUB_AREAS.flatMap((a) => a.tabs);
    expect(tabs.length).toBeGreaterThanOrEqual(9);
    for (const t of tabs) expect(known).toContain(t);
    expect(html).toContain('data-action="onSettings"');
    for (const m of html.matchAll(/<button class="cs-obj[^>]*aria-label="([^"]*)"/g)) expect(m[1].length).toBeGreaterThan(3);
    expect(html).toMatch(/So\., \d+\. Aug\./); // nächster Termin aus dem Kalender
  });

  // 2026-11-08: Fenster weg (Nutzerwunsch), dafür wechselbar Vitrine, Mannschaftsfoto oder große Tafeln.
  it('Wand ohne Fenster, drei Varianten: Vitrine, Mannschaftsfoto, große Tafeln', () => {
    const c = createCareer({ seed: 9 });
    const objs = (html) => { const w = html.slice(html.indexOf('cs-wall'), html.indexOf('cs-desk')); return [...w.matchAll(/class="cs-obj (cs-[a-z]+)"/g)].map((m) => m[1]); };
    expect(clubScene(c)).not.toContain('cs-window');
    expect(objs(clubScene(c))).toEqual(['cs-cabinet', 'cs-board', 'cs-pin', 'cs-cal']); // Vorgabe: Vitrine
    expect(objs(clubScene(c, { wall: 'foto' }))).toEqual(['cs-photo', 'cs-board', 'cs-pin', 'cs-cal']);
    const big = clubScene(c, { wall: 'gross' });
    expect(objs(big)).toEqual(['cs-board', 'cs-pin', 'cs-cal']);
    expect(big).toContain('cs-row me'); // Tabellenausschnitt nur bei großen Tafeln
    expect(clubScene(c)).not.toContain('cs-row');
    // Umschalten an der Wand: Vitrine → Foto → große Tafeln → Vitrine.
    expect(clubScene(c)).toContain('data-action="wallView" data-value="foto"');
    expect(clubScene(c, { wall: 'foto' })).toContain('data-value="gross"');
    expect(clubScene(c, { wall: 'gross' })).toContain('data-action="wallView" data-value="vitrine"');
    // Klassisch: Vitrine als Kachel, das Foto (reine Stimmung) nicht.
    const classic = clubScene(c, { classic: true, wall: 'foto' });
    expect(classic).toContain('Vitrine');
    expect(classic).not.toContain('Mannschaftsfoto');
  });

  it('Vitrine zählt Meisterschaften, Pokale, Aufstiege und Erinnerungsfotos, die neuesten zuerst', () => {
    const c = createCareer({ seed: 9 });
    c.history = [{ season: 1, pos: 1, promoted: true, league: 'A' }, { season: 2, pos: 3, promoted: true, league: 'B' }, { season: 3, pos: 5, league: 'C' }];
    c.trophies = [{ name: 'Kreispokal 2027', season: 2 }, { name: 'Foto', season: 3, kind: 'foto' }];
    expect(cabinet(c).map((x) => x.type)).toEqual(['foto', 'up', 'cup', 'title']);
    expect(clubScene(c)).toMatch(/1 Meistertitel · 1 Pokal · 1 Aufstieg/);
  });

  it('Kalender: die nächsten drei Termine, Europapokal am Donnerstag vor dem Ligaspiel', () => {
    const c = createCareer({ seed: 11 });
    const league = agenda(c, 3);
    expect(league).toHaveLength(3);
    expect(league.every((d) => d.day === 'sun' && d.kind === 'liga')).toBe(true);
    expect(league.map((d) => d.week)).toEqual([0, 1, 2]);
    c.level = 12;
    c.euroQual = { season: c.season, kind: 'eu2', domestic: { eu1: [], eu2: [], eu3: [] } };
    startEuro(c);
    const next = agenda(c, 3);
    expect(next[0]).toMatchObject({ week: 0, day: 'thu', kind: 'eu2' });
    expect(next[0].label).toMatch(/^Do\., /);
    expect(next[1]).toMatchObject({ week: 0, day: 'sun', kind: 'liga' });
    expect(clubScene(c)).toMatch(/Kalender: Do\., \d+\./);
  });
});
