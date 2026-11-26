// AFS Phase 4: Anzeige der geprüften Spieldaten (src/ui/analyticsView.js) – Stufen, Mindeststichproben, Spielbericht.
import { describe, expect, it } from 'vitest';
import { createMatch, matchDuration, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { KEYS } from '../src/sim/analytics.js';
import { newsPages } from '../src/ui/EndScreen.js';
import { AFS_VIEW, clubLine, level, matchRows, playerLine } from '../src/ui/analyticsView.js';

const row = (o) => KEYS.map((k) => o[k] ?? 0);

describe('Anzeige der Spieldaten (AFS Phase 4)', () => {
  it('Stufe: erst bei klarer Abweichung „deutlich“, mit mehr Spielen reicht weniger Abstand', () => {
    expect(level(0.56, 0.5, 0.12, 3)).toBe('avg');
    expect(level(0.56, 0.5, 0.12, 30)).toBe('more');
    expect(level(0.4, 0.5, 0.12, 30)).toBe('less');
    expect(level(null, 0.5, 0.12, 30)).toBeNull();
  });

  it('Spielbericht: Pässe, überspielte Gegner, xG, Feldvorteil – mit Herkunftszeile', () => {
    const pitch = PITCHES.rasenplatz;
    const m = createMatch({ seed: 7501, pitch, human: false, duration: matchDuration(pitch), aiCoach: false });
    while (m.phase !== 'ended') {
      stepMatch(m, undefined, 1 / 60);
      m.events.length = 0;
    }
    const rows = matchRows(m);
    expect(rows.map((r) => r.length)).toEqual(rows.map(() => 3));
    expect(rows.length).toBe(4);
    const html = newsPages(m).find((p) => p.id === 'stats').html;
    expect(html).toContain('class="afs-note"');
    expect(html).toMatch(/xG/);
    delete m.an;
    expect(matchRows(m)).toEqual([]);
  }, 120000);

  it('Spielerkarte: Urteil zu Toren gegen xG erst ab der Mindestzahl Einsätze', () => {
    const an = row({ pass: 120, passOk: 80, shots: 20, xg: 300 });
    expect(playerLine({ an, apps: AFS_VIEW.playerXgMin - 1, goals: 3 })).toMatch(/ab 14 Einsätzen|from 14 appearances/);
    expect(playerLine({ an, apps: AFS_VIEW.playerXgMin, goals: 3 })).toMatch(/etwa wie erwartet|about as expected/);
    expect(playerLine({ an, apps: AFS_VIEW.playerXgMin, goals: 9 })).toMatch(/deutlich öfter|clearly more/);
    expect(playerLine({ apps: 20 })).toBe('');
  });

  it('Tabellenzeile: Vergleich erst ab der Mindestzahl Spiele, Passquote erst ab 8', () => {
    const club = (n, packing, att, attA) => ({ n, s: row({ pass: 50 * n, passOk: 30 * n, packing: packing * n, xg: 150 * n }), third: [0, 0, att], xgA: 120 * n, attA });
    const few = { an: { clubs: { a: club(2, 40, 100, 100), b: club(2, 40, 100, 100) } } };
    expect(clubLine(few, 'a')).toMatch(/ab 3 Spielen|from 3 matches/);
    expect(clubLine(few, 'a')).not.toMatch(/Passquote|pass completion/);
    const many = { an: { clubs: { a: club(10, 60, 700, 300), b: club(10, 30, 300, 700), c: club(10, 30, 500, 500) } } };
    const a = clubLine(many, 'a');
    expect(a).toMatch(/Passquote 60 %|pass completion 60 %/);
    expect(a).toMatch(/Überspielte Gegner je Pass: deutlich mehr|Opponents bypassed per pass: clearly above/);
    expect(a).toMatch(/Feldvorteil: deutlich mehr als die Gegner|Field tilt: clearly more than the opponents/);
    expect(clubLine(many, 'c')).toMatch(/Feldvorteil: ausgeglichen|Field tilt: even/);
    expect(clubLine({}, 'a')).toBe('');
  });
});
