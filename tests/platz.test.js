import { describe, expect, it } from 'vitest';
import { createCareer, currentFixtures, finishRound, humanClub, migrateCareer, nextPitch, nextSeason, prepareMatch, recordResult, seasonOver, simulateSync, startWeek } from '../src/career/career.js';
import { buildBlock, buildCost, buildWeeks, build, capacity, dequeue, enqueue, facilities, fansMul, hasFacility, salesMul, weeklyFacilities } from '../src/career/facilities.js';
import { PITCHES } from '../src/sim/pitch.js';
import {
  applyPlatz, buyGround, care, careBlock, ensureVertrag, groundKind, HELPER_SLOTS, landOk, longLease, nachholDate, nachholLabel, PACHT_PER_MATCH, platz, platzNewSeason, playAnyway, purchasePrice, renew,
  rentPerMatch, sperreCheck, sperreReason, termLeft, weeklyPlatz,
} from '../src/career/platz.js';

// Ein Verein auf dem Rasenplatz (Stufe 2), Wetter und Woche fest vorgegeben.
function rasen(seed = 31, weather = 'sonne') {
  const c = createCareer({ seed });
  c.level = 2;
  humanClub(c).venue = 'rasenplatz';
  setWeather(c, weather);
  ensureVertrag(c);
  return c;
}
const setWeather = (c, id) => {
  c.week.weather = { ...c.week.weather, id };
};
// Eine Woche vergehen lassen (ohne Spiele), mit vorgegebenem Wetter; Heimspiel wird erzwungen oder ausgeschlossen.
function week(c, { weather = 'sonne', home = false } = {}) {
  setWeather(c, weather);
  const me = humanClub(c).id;
  const f = c.fixtures[c.round].find((x) => x.home === me || x.away === me);
  if ((f.home === me) !== home) [f.home, f.away] = [f.away, f.home];
  const notes = weeklyPlatz(c);
  c.round = Math.min(c.round + 1, c.fixtures.length - 1);
  return notes;
}

describe('Platzpflege: Verschleiß und Erholung', () => {
  it('der Platz nutzt sich ab: Heimspiel und Regen mehr als eine ruhige Woche', () => {
    const quiet = rasen();
    const home = rasen();
    const rain = rasen();
    week(quiet, { weather: 'wind' });
    week(home, { weather: 'wind', home: true });
    week(rain, { weather: 'regen', home: true });
    const q = platz(quiet).cond, h = platz(home).cond, r = platz(rain).cond;
    expect(q).toBeLessThan(1);
    expect(h).toBeLessThan(q);
    expect(r).toBeLessThan(h);
  });

  it('ohne Pflege über eine Saison deutlich schlechter, mit Pflege gut bespielbar', () => {
    const neglect = rasen(32);
    const cared = rasen(32);
    for (let i = 0; i < 10; i++) {
      week(neglect, { weather: i % 3 === 2 ? 'regen' : 'wind', home: i % 2 === 0 });
      care(cared, 'maehen', 'helfer');
      care(cared, 'waessern', 'helfer');
      week(cared, { weather: i % 3 === 2 ? 'regen' : 'wind', home: i % 2 === 0 });
    }
    expect(platz(neglect).cond).toBeLessThan(0.7);
    expect(platz(cared).cond).toBeGreaterThan(platz(neglect).cond + 0.1);
  });

  it('Pflegeaktionen: Wirkung, Sperrfristen, Wetter, Ehrenamts-Grenze und Kosten', () => {
    const c = rasen(33);
    platz(c).cond = 0.5;
    platz(c).chalk = 0.3;
    c.cash = 100;
    expect(care(c, 'maehen', 'helfer')).toBeTruthy();
    expect(platz(c).cond).toBeCloseTo(0.5 + 0.04 * 0.7, 5); // Ehrenamtliche: 70 %
    expect(care(c, 'maehen', 'helfer')).toBe(null); // einmal pro Woche
    expect(careBlock(c, 'maehen', 'helfer')).toBe('done');
    expect(care(c, 'kreide', 'helfer')).toBeTruthy();
    expect(platz(c).chalk).toBeCloseTo(1, 5);
    expect(HELPER_SLOTS).toBe(2);
    expect(careBlock(c, 'nachsaeen', 'helfer')).toBe('helpers'); // beide Helfer-Einsätze verbraucht
    const before = c.cash;
    expect(care(c, 'nachsaeen', 'profi')).toBeTruthy();
    expect(before - c.cash).toBe(25); // Fachbetrieb kostet Geld
    expect(platz(c).cond).toBeCloseTo(0.5 + 0.028 + 0.12, 5);
    week(c);
    expect(careBlock(c, 'nachsaeen', 'profi')).toBe('gap'); // alle 3 Wochen
    setWeather(c, 'regen');
    expect(careBlock(c, 'waessern', 'helfer')).toBe('weather');
    c.cash = 1;
    expect(careBlock(c, 'maehen', 'profi')).toBe('cash');
    expect(careBlock(c, 'abziehen', 'helfer')).toBe('ground'); // nur Asche
  });

  it('Platzwart mäht von selbst und macht Ehrenamtliche voll wirksam', () => {
    const a = rasen(34);
    const b = rasen(34);
    b.staff = { cotrainer: null, wirt: null, platzwart: { idx: 1, name: 'Hans' } };
    for (const c of [a, b]) {
      platz(c).cond = 0.6;
      week(c, { weather: 'wind' });
    }
    expect(platz(b).cond).toBeGreaterThan(platz(a).cond);
    care(b, 'maehen', 'helfer');
    expect(platz(b).cond).toBeCloseTo(Math.min(1, 0.6 + 0.04 * 1) , 1);
  });

  it('Ascheplatz: abziehen statt mähen; Kunstrasen verschleißt kaum und braucht keine Pflege', () => {
    const c = rasen(35);
    humanClub(c).venue = 'ascheplatz';
    expect(groundKind(c)).toBe('asche');
    platz(c).cond = 0.4;
    expect(care(c, 'abziehen', 'helfer')).toBeTruthy();
    expect(platz(c).cond).toBeGreaterThan(0.5);
    expect(careBlock(c, 'maehen', 'helfer')).toBe('ground');

    const k = rasen(36);
    k.facilities = { built: { kunstrasen: 1 }, building: null, queue: [] };
    expect(groundKind(k)).toBe('kunst');
    for (let i = 0; i < 8; i++) week(k, { weather: 'regen', home: true });
    expect(platz(k).cond).toBeGreaterThan(0.9);
    expect(platz(k).chalk).toBe(1);
  });

  it('Sommerpause erholt den Rasen und zieht die Linien neu', () => {
    const c = rasen(37);
    platz(c).cond = 0.4;
    platz(c).chalk = 0.1;
    platz(c).avg = { sum: 3, n: 6 };
    platzNewSeason(c);
    expect(platz(c).cond).toBeCloseTo(0.6, 5);
    expect(platz(c).chalk).toBe(1);
    expect(platz(c).lastAvg).toBeCloseTo(0.5, 5);
  });

  it('Standardplatz bleibt bit-gleich: Zustand 1,0 gibt dieselbe Platzstruktur zurück, abgenutzt ändert nur Unebenheit und Rollen', () => {
    const c = rasen(38);
    const home = humanClub(c);
    const base = { ...PITCHES.rasenplatz };
    expect(applyPlatz(base, c, home)).toBe(base);
    platz(c).cond = 0.2;
    platz(c).chalk = 0.5;
    const worn = applyPlatz(base, c, home);
    expect(worn).not.toBe(base);
    expect(worn.surface.bumpiness).toBeGreaterThan(base.surface.bumpiness);
    expect(worn.surface.bumpiness).toBeCloseTo(PITCHES.rasenplatz.surface.bumpiness * 1.8, 5);
    expect(worn.surface.rollDecel).toBeGreaterThan(base.surface.rollDecel);
    expect(worn.surface.bounce).toBe(base.surface.bounce);
    expect(worn.worn).toBeCloseTo(0.8, 2);
    expect(worn.fade).toBeCloseTo(0.5, 2);
    expect(PITCHES.rasenplatz.surface.bumpiness).toBe(0.07); // Vorlage unangetastet
    // fremder Platz und Halle bleiben unberührt
    expect(applyPlatz(base, c, { human: false })).toBe(base);
    expect(applyPlatz(PITCHES.halle, c, home)).toBe(PITCHES.halle);
  });

  it('nextPitch / prepareMatch: neue Karriere hat einen unveränderten Platz; abgenutzt landet der Zustand in der Partie', () => {
    const c = rasen(39);
    const f = currentFixtures(c).find((x) => x.home === humanClub(c).id) ?? (() => {
      const x = currentFixtures(c)[0];
      return x;
    })();
    f.home = humanClub(c).id;
    f.away = c.clubs.find((x) => !x.human).id;
    const fresh = prepareMatch(c, f, { duration: 30 });
    expect(fresh.pitch.worn).toBeUndefined();
    expect(fresh.pitch.fade).toBeUndefined();
    platz(c).cond = 0.3;
    const worn = prepareMatch(c, f, { duration: 30 });
    expect(worn.pitch.worn).toBeCloseTo(0.7, 2);
    expect(worn.match.pitch.surface.bumpiness).toBeGreaterThan(fresh.match.pitch.surface.bumpiness);
    expect(nextPitch(c).worn).toBeCloseTo(0.7, 2);
  });
});

describe('Platzsperre und Nachholspiel', () => {
  const rain = { id: 'regen' };
  function homeCareer(seed = 40) {
    const c = rasen(seed);
    c.round = 2;
    const me = humanClub(c).id;
    const f = c.fixtures[2].find((x) => x.home === me || x.away === me);
    if (f.home !== me) [f.home, f.away] = [f.away, f.home];
    return { c, f };
  }

  it('Regen auf abgespieltem Rasen sperrt, auf gepflegtem nicht', () => {
    const { c, f } = homeCareer();
    platz(c).cond = 0.3;
    expect(sperreReason(c, rain, f)).toBe('regen');
    platz(c).cond = 0.9;
    expect(sperreReason(c, rain, f)).toBe(null);
    platz(c).cond = 0.5; // zwischen Regen- und Schneeschwelle
    expect(sperreReason(c, rain, f)).toBe(null);
    expect(sperreReason(c, { id: 'schnee' }, f)).toBe('schnee');
    expect(sperreReason(c, { id: 'frost' }, f)).toBe('frost');
    expect(sperreReason(c, { id: 'sonne' }, f)).toBe(null);
  });

  it('nie bei Auswärtsspiel, Kunstrasen, zweitem Platz, am Saisonende oder zwei Mal hintereinander', () => {
    const { c, f } = homeCareer(41);
    platz(c).cond = 0.1;
    expect(sperreReason(c, rain, { ...f, home: 'x', away: f.home })).toBe(null);
    c.round = c.fixtures.length - 1;
    expect(sperreReason(c, rain, f)).toBe(null);
    c.round = c.fixtures.length - 2;
    expect(sperreReason(c, rain, f)).toBe(null);
    c.round = 2;
    expect(sperreCheck(c, rain, f)).toEqual({ reason: 'regen' });
    expect(platz(c).sperren).toBe(1);
    c.round = 3;
    expect(sperreCheck(c, rain, f)).toBe(null); // nicht zwei Spieltage hintereinander
    c.round = 4;
    expect(sperreReason(c, rain, f)).toBe('regen');
    c.facilities = { built: { trainingsplatz: 1 }, building: null, queue: [] };
    expect(sperreReason(c, rain, f)).toBe(null);
    c.facilities = { built: { kunstrasen: 1 }, building: null, queue: [] };
    expect(sperreReason(c, rain, f)).toBe(null);
  });

  it('startWeek: bei Regen und kaputtem Platz wird das Heimspiel auf Mittwoch gelegt, mit Chatmeldung; „Trotzdem spielen" hebt es auf', () => {
    let found = null;
    for (let seed = 1; seed < 80 && !found; seed++) {
      const c = createCareer({ seed });
      c.level = 2;
      humanClub(c).venue = 'rasenplatz';
      platz(c).cond = 0.1;
      for (let r = 1; r < c.fixtures.length - 2; r++) {
        c.round = r;
        platz(c).lastSperre = -9;
        startWeek(c);
        if (c.week?.postponed) {
          found = c;
          break;
        }
      }
    }
    expect(found).toBeTruthy();
    const c = found;
    expect(c.week.postponed.reason).toMatch(/regen|schnee|frost/);
    expect(c.week.chat.some((m) => /Platzsperre/.test(m.text))).toBe(true);
    const cond = platz(c).cond;
    expect(playAnyway(c)).toBeTruthy();
    expect(c.week.postponed).toBe(null);
    expect(platz(c).cond).toBeLessThan(cond);
  });

  it('Kalender: Nachholtermin ist der Mittwoch nach dem Sonntag', () => {
    const c = rasen(42);
    const d = nachholDate(c, 3);
    expect(new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()).toBe(3);
    expect(nachholLabel(c, 3)).toMatch(/Mi\.|Wed/);
  });

  it('Nachholspiel kostet Zuschauer und Schiri-Aufschlag', () => {
    const base = rasen(43);
    const pp = rasen(43);
    for (const c of [base, pp]) {
      c.cash = 500;
      c.level = 3;
    }
    pp.week.postponed = { reason: 'regen' };
    const run = (c) => {
      const f = c.fixtures[c.round].find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
      f.home = humanClub(c).id;
      f.away = c.clubs.find((x) => !x.human).id;
      const prepared = prepareMatch(c, f, { duration: 30 });
      simulateSync(prepared);
      const n = c.ledger.length;
      recordResult(c, f, prepared);
      return c.ledger.slice(n);
    };
    const a = run(base);
    const b = run(pp);
    expect(b.some((l) => /Nachholspiel|replay/.test(l.text) && l.amount === -10)).toBe(true);
    expect(a.some((l) => /Nachholspiel|replay/.test(l.text))).toBe(false);
    const fans = (rows) => Number(/\((\d+)/.exec(rows.find((l) => /Getränke|Drinks/.test(l.text)).text)[1]);
    expect(fans(b)).toBeLessThanOrEqual(fans(a));
  });
});

describe('Platzmiete und Pachtvertrag', () => {
  const rentRow = (c) => {
    const f = c.fixtures[c.round].find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
    f.home = humanClub(c).id;
    f.away = c.clubs.find((x) => !x.human).id;
    const prepared = prepareMatch(c, f, { duration: 30 });
    simulateSync(prepared);
    const n = c.ledger.length;
    recordResult(c, f, prepared);
    return c.ledger.slice(n).find((l) => /Platzmiete|Pitch rent/.test(l.text))?.amount ?? 0;
  };

  it('Standardvertrag: Pacht 5 Saisons, 15 € je Heimspiel wie bisher, mit Platzwart die Hälfte', () => {
    const c = rasen(50);
    const v = ensureVertrag(c);
    expect(v).toMatchObject({ typ: 'pacht', mul: 1 });
    expect(v.bis - v.von + 1).toBe(5);
    expect(rentPerMatch(c)).toBe(PACHT_PER_MATCH);
    expect(rentRow(c)).toBe(-15);
    c.staff = { cotrainer: null, wirt: null, platzwart: { idx: 1, name: 'Hans' } };
    expect(rentPerMatch(c)).toBe(7.5);
  });

  it('Stufe 1 (Hinterhof): kein Vertrag, keine Pacht', () => {
    const c = createCareer({ seed: 51 });
    expect(ensureVertrag(c)).toBe(null);
    expect(rentPerMatch(c)).toBe(PACHT_PER_MATCH); // wirkt erst ab Stufe 2 (matchFinances)
    expect(landOk(c)).toBe(false);
  });

  it('Verlängerungsangebot: gepflegter Platz = Nachlass, verwahrloster = Aufschlag; kein Reagieren = stillschweigend teurer', () => {
    const mk = (avg) => {
      const c = rasen(52);
      c.season = 5; // letzte Saison des Vertrags
      platz(c).vertrag = { typ: 'pacht', von: 1, bis: 5, mul: 1 };
      platz(c).avg = { sum: avg * 10, n: 10 };
      platzNewSeason(c);
      return c;
    };
    const good = mk(0.85);
    expect(platz(good).angebot.kind).toBe('lob');
    expect(platz(good).angebot.mul).toBeLessThan(1);
    const bad = mk(0.3);
    expect(platz(bad).angebot.kind).toBe('erhoehung');
    expect(platz(bad).angebot.mul).toBeGreaterThan(1.1);
    // annehmen
    expect(renew(good)).toBeTruthy();
    expect(platz(good).vertrag.bis).toBe(5 + 4);
    expect(platz(good).angebot).toBe(null);
    expect(rentPerMatch(good)).toBeLessThan(15);
    // nicht reagiert: nächste Saison läuft der Vertrag still um ein Jahr mit +15 % weiter
    bad.season = 6;
    const notes = platzNewSeason(bad);
    expect(platz(bad).vertrag.mul).toBeCloseTo(platz(bad).vertrag.mul, 5);
    expect(platz(bad).vertrag.bis).toBe(6);
    expect(notes.some((n) => /stillschweigend|quietly/.test(n))).toBe(true);
    expect(platz(bad).angebot).toBeTruthy(); // und gleich wieder ein Angebot
  });

  it('Langzeitpacht: Gebühr, 10 Saisons, 20 % billiger; Kauf: keine Pacht mehr, Grundsteuer, kein Zweifel am Bauen', () => {
    const c = rasen(53);
    c.cash = 3000;
    const left0 = termLeft(c);
    expect(longLease(c)).toBeTruthy();
    expect(c.cash).toBe(3000 - 150);
    expect(termLeft(c)).toBe(10);
    expect(termLeft(c)).toBeGreaterThan(left0);
    expect(rentPerMatch(c)).toBeCloseTo(12, 5);
    expect(rentRow(c)).toBe(-12);
    const before = c.cash;
    expect(buyGround(c)).toBeTruthy();
    expect(before - c.cash).toBe(purchasePrice(c));
    expect(platz(c).vertrag.typ).toBe('eigen');
    expect(rentPerMatch(c)).toBe(0);
    expect(rentRow(c)).toBe(0);
    expect(buyGround(c)).toBe(null); // schon gekauft
    const cash = c.cash;
    weeklyPlatz(c);
    expect(cash - c.cash).toBe(2); // Grundsteuer und Unterhalt
    expect(termLeft(c)).toBe(Infinity);
  });

  it('Kauf und Langzeitpacht brauchen genug Geld', () => {
    const c = rasen(54);
    c.cash = 100;
    expect(longLease(c)).toBe(null);
    expect(buyGround(c)).toBe(null);
    expect(platz(c).vertrag.typ).toBe('pacht');
  });
});

describe('Ausbau: Kosten, Bauzeit, Warteschlange, Wirkung', () => {
  it('Großbauten brauchen einen Sportplatz und Restlaufzeit der Pacht oder Eigentum', () => {
    const hof = createCareer({ seed: 60 });
    expect(buildBlock(hof, 'kunstrasen')).toBe('ground');
    const c = rasen(60);
    expect(buildBlock(c, 'kunstrasen')).toBe(null);
    platz(c).vertrag = { typ: 'pacht', von: 1, bis: c.season + 1, mul: 1 }; // nur noch 2 Saisons
    expect(buildBlock(c, 'kunstrasen')).toBe('land');
    expect(buildBlock(c, 'stehstufen')).toBe(null); // ohne Baurecht erlaubt
    platz(c).vertrag = { typ: 'eigen', von: 1, bis: 9999, mul: 1 };
    expect(buildBlock(c, 'kunstrasen')).toBe(null);
  });

  it('Genehmigung auf Pachtgrund: +5 % und +1 Woche; im Eigentum nicht', () => {
    const c = rasen(61);
    expect(buildCost(c, 'kunstrasen')).toBe(Math.round(2400 * 1.05));
    expect(buildWeeks(c, 'kunstrasen')).toBe(9);
    expect(buildCost(c, 'kunstrasen', 'einsatz')).toBe(Math.round(1200 * 1.05));
    expect(buildWeeks(c, 'kunstrasen', 'einsatz')).toBe(17);
    expect(buildCost(c, 'stehstufen')).toBe(300); // ohne land
    platz(c).vertrag = { typ: 'eigen', von: 1, bis: 9999, mul: 1 };
    expect(buildCost(c, 'kunstrasen')).toBe(2400);
    expect(buildWeeks(c, 'kunstrasen')).toBe(8);
  });

  it('Bauschlange: vormerken, bezahlt wird erst beim Start, danach baut es von selbst weiter; Streichen nimmt Abhängige mit', () => {
    const c = rasen(62);
    c.cash = 1000;
    expect(enqueue(c, 'stehstufen')).toBe(false); // nichts im Bau: einfach bauen
    expect(build(c, 'bratwurststand')).toBeTruthy();
    expect(c.cash).toBe(880);
    expect(enqueue(c, 'stehstufen')).toBe(true);
    expect(enqueue(c, 'stehstufen')).toBe(false); // schon vorgemerkt
    expect(enqueue(c, 'grill')).toBe(true);
    expect(enqueue(c, 'biergarten')).toBe(true); // braucht Grill: der steht in der Schlange
    expect(enqueue(c, 'duschen')).toBe(false); // höchstens drei
    expect(c.cash).toBe(880); // noch nichts bezahlt
    weeklyFacilities(c); // Bratwurststand: 1 Woche -> fertig, Stehstufen starten
    expect(hasFacility(c, 'bratwurststand')).toBe(true);
    expect(facilities(c).building.id).toBe('stehstufen');
    expect(c.cash).toBeLessThan(880 - 300 + 1);
    expect(dequeue(c, 'grill')).toBe(true);
    expect(facilities(c).queue.map((q) => q.id)).toEqual([]); // Biergarten fiel mit
  });

  it('Warteschlange wartet, wenn die Kasse zum Baustart nicht reicht, und verwirft Unbaubares', () => {
    const c = rasen(63);
    c.cash = 500;
    build(c, 'bratwurststand'); // 120
    enqueue(c, 'sitzplaetze'); // braucht tribuene -> nicht vormerkbar
    expect(facilities(c).queue).toHaveLength(0);
    expect(enqueue(c, 'grill')).toBe(true);
    c.cash = 0;
    weeklyFacilities(c);
    expect(facilities(c).building).toBe(null);
    expect(facilities(c).queue).toHaveLength(1);
    expect(facilities(c).note).toMatch(/Kasse/);
    c.cash = 5000;
    weeklyFacilities(c);
    expect(facilities(c).building?.id).toBe('grill');
  });

  it('Wirkung: Tribünenstufen, Fassungsvermögen, Gastro, Dach', () => {
    const c = rasen(64);
    const set = (...ids) => {
      c.facilities = { built: Object.fromEntries(ids.map((i) => [i, 1])), building: null, queue: [] };
    };
    set();
    expect([fansMul(c), capacity(c), salesMul(c)]).toEqual([1, 250, 1]);
    set('stehstufen');
    expect([fansMul(c), capacity(c)]).toEqual([1.12, 400]);
    set('tribuene', 'grill');
    expect([fansMul(c), capacity(c), salesMul(c)]).toEqual([1.33, 600, 1.25]); // wie vor dem Umbau
    set('stehstufen', 'tribuene', 'sitzplaetze', 'tribdach', 'grill', 'biergarten');
    expect(fansMul(c)).toBe(1.65);
    expect(capacity(c)).toBe(1000);
    expect(salesMul(c)).toBe(1.5);
    expect(salesMul(c, 'sonne')).toBeCloseTo(1.725, 5);
    expect(salesMul(c, 'regen')).toBe(1.5);
    set('bratwurststand');
    expect(salesMul(c)).toBe(1.1);
  });

  it('Fassungsvermögen deckelt die Zuschauer im Heimspiel; Sitzplätze zeigen die Tribüne im Platz', () => {
    const c = rasen(65);
    c.level = 5;
    humanClub(c).venue = 'grossfeld';
    const f = c.fixtures[c.round].find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
    f.home = humanClub(c).id;
    f.away = c.clubs.find((x) => !x.human).id;
    expect(prepareMatch(c, f, { duration: 30 }).match.crowd).toBeLessThanOrEqual(250);
    c.facilities = { built: { sitzplaetze: 1 }, building: null, queue: [] };
    const p = prepareMatch(c, f, { duration: 30 });
    expect(p.pitch.extraStand).toBe(true);
    expect(p.match.crowd).toBeLessThanOrEqual(800);
  });

  it('Kunstrasen bringt Mieteinnahmen und kostet Unterhalt', () => {
    const c = rasen(66);
    c.cash = 3000;
    build(c, 'kunstrasen');
    for (let i = 0; i < 9; i++) weeklyFacilities(c);
    expect(hasFacility(c, 'kunstrasen')).toBe(true);
    expect(groundKind(c)).toBe('kunst');
    const rows = c.ledger.filter((l) => /Kunstrasen|artificial/.test(l.text));
    expect(rows.some((l) => l.amount > 0)).toBe(true);
  });

  it('Zweiter Platz schont den Hauptplatz im Training', () => {
    const a = rasen(67);
    const b = rasen(67);
    b.facilities = { built: { trainingsplatz: 1 }, building: null, queue: [] };
    for (let i = 0; i < 5; i++) {
      week(a, { weather: 'wind' });
      week(b, { weather: 'wind' });
    }
    expect(platz(b).cond).toBeGreaterThan(platz(a).cond);
  });
});

describe('Speichern, Laden, Determinismus', () => {
  it('alter Spielstand ohne Platzdaten: Platz gepflegt, Vertrag zu den bisherigen Bedingungen, gebaute Tribüne bleibt wirksam', () => {
    const c = createCareer({ seed: 70 });
    c.level = 3;
    humanClub(c).venue = 'rasenplatz';
    c.facilities = { built: { tribuene: 2, grill: 1 }, building: null }; // ohne queue
    delete c.platz;
    const old = migrateCareer(JSON.parse(JSON.stringify(c)));
    expect(old.platz.cond).toBe(1);
    expect(old.platz.chalk).toBe(1);
    expect(old.platz.vertrag.typ).toBe('pacht');
    expect(rentPerMatch(old)).toBe(15);
    expect(fansMul(old)).toBe(1.33);
    expect(salesMul(old)).toBe(1.25);
    expect(capacity(old)).toBe(600);
    expect(facilities(old).queue).toEqual([]);
    expect(old.week.postponed ?? null).toBe(null);
    expect(applyPlatz({ ...PITCHES.rasenplatz }, old, humanClub(old)).worn).toBeUndefined();
  });

  it('Speichern und Laden mitten in der Saison ändert nichts am Verlauf (gleiche Zahlen)', () => {
    const play = (roundtrip) => {
      let c = createCareer({ seed: 71 });
      c.level = 2;
      humanClub(c).venue = 'rasenplatz';
      while (!seasonOver(c)) {
        care(c, 'maehen', 'helfer');
        for (const f of currentFixtures(c)) {
          const p = prepareMatch(c, f, { duration: 60 });
          simulateSync(p);
          recordResult(c, f, p);
        }
        finishRound(c);
        if (roundtrip) c = migrateCareer(JSON.parse(JSON.stringify(c)));
      }
      return { cash: c.cash, platz: c.platz, ledger: c.ledger.length };
    };
    const a = play(false);
    const b = play(true);
    expect(b).toEqual(a);
    expect(a.platz.cond).toBeLessThan(1);
  }, 300000);

  it('Determinismus: gleiche Eingaben, gleicher Platzverlauf', () => {
    const run = () => {
      const c = rasen(72);
      const trace = [];
      for (let i = 0; i < 8; i++) {
        if (i % 2) care(c, 'kreide', 'helfer');
        week(c, { weather: ['sonne', 'regen', 'wind', 'hitze'][i % 4], home: i % 2 === 0 });
        trace.push([platz(c).cond, platz(c).chalk]);
      }
      return JSON.stringify(trace);
    };
    expect(run()).toBe(run());
  });

  it('Saisonwechsel: Spielstand läuft, Platz erholt sich, Angebot am Ende des Vertrags', () => {
    let c = createCareer({ seed: 73 });
    c.level = 2;
    humanClub(c).venue = 'rasenplatz';
    platz(c).vertrag = { typ: 'pacht', von: 1, bis: 2, mul: 1 };
    let sawOffer = false;
    for (let s = 0; s < 2; s++) {
      while (!seasonOver(c)) {
        for (const f of currentFixtures(c)) {
          const p = prepareMatch(c, f, { duration: 60 });
          simulateSync(p);
          recordResult(c, f, p);
        }
        finishRound(c);
      }
      const low = platz(c).cond;
      nextSeason(c);
      expect(platz(c).cond).toBeGreaterThanOrEqual(low);
      if (platz(c).angebot) sawOffer = true;
      c = migrateCareer(JSON.parse(JSON.stringify(c)));
    }
    expect(sawOffer).toBe(true);
  }, 300000);
});
