import { describe, expect, it } from 'vitest';
import { clubById, createCareer, finishRound, humanClub, maxSquad, migrateCareer, MIN_SQUAD, nextSeason, playerOf, seasonOver, takenIndices } from '../src/career/career.js';
import { AMATEUR_MAX_MONTH } from '../src/career/leagueevents.js';
import { banGames, isBanned } from '../src/career/suspensions.js';
import { POACH_EVENTS } from '../src/career/poaching.js';
import { motivesOf } from '../src/career/recruiting.js';
import { EXTRA_STEPS, FEE_BASE, HANDGELD_STEPS, importanceIn, nextWindow, releaseChance, trainingFee, waitGames, windowAt } from '../src/career/transferrules.js';
import {
  acceptOffer, anyClub, argueDeal, askClub, counterOffer, declineOffer, ensureNeighbors, importanceOf, inTransfers, listPlayer, loanIn, loanOut, loansIn, loansOut, marketList, priceOf, setHandgeld, talkDeal,
  tstate, windowInfo,
} from '../src/career/transfers.js';

// Spieltage ohne Simulation abschließen (Ergebnisse 1:1), wie in den anderen Karriere-Tests.
function advanceTo(c, round) {
  while (!seasonOver(c) && c.round < round) {
    for (const f of c.fixtures[c.round]) f.result = { home: 1, away: 1 };
    finishRound(c);
  }
  return c;
}
const finishSeason = (c) => advanceTo(c, c.fixtures.length);
const reload = (c) => migrateCareer(JSON.parse(JSON.stringify(c)));
const allIdx = (c) => [...c.clubs.flatMap((x) => x.squad), ...tstate(c).neighbors.flatMap((n) => n.squad)];

// Ein Spieler aus der eigenen Liga mit dieser Antwort des Vereins (Anfrage ist je Spieler deterministisch).
function candidate(c, want) {
  const rows = marketList(c, { scope: 'own' }).sort((a, b) => a.importance - b.importance);
  for (const r of rows) {
    if (c.transfers.deals[r.idx]) continue;
    const probe = JSON.parse(JSON.stringify(c));
    migrateCareer(probe);
    if (askClub(probe, r.idx) === want) return r.idx;
  }
  throw new Error(`kein Kandidat mit ${want}`);
}

describe('Wechselfristen (transferrules)', () => {
  it('Sommer = erste Woche der Saison, Winter = erste Woche nach der Winterpause, sonst zu', () => {
    for (const leagueSize of [6, 8]) {
      const c = createCareer({ seed: 3, leagueSize });
      const half = Math.floor(c.fixtures.length / 2);
      const open = c.fixtures.map((_, r) => windowAt(c, r));
      expect(open[0]).toBe('summer');
      expect(open[half]).toBe('winter');
      expect(open.filter(Boolean)).toHaveLength(2);
    }
  });

  it('nextWindow zählt die Wochen bis zur nächsten Periode', () => {
    const c = createCareer({ seed: 3 });
    const half = Math.floor(c.fixtures.length / 2);
    expect(nextWindow(c)).toEqual({ kind: 'winter', round: half, weeks: half });
    c.round = half + 1;
    expect(nextWindow(c)).toEqual({ kind: 'summer', round: 0, weeks: c.fixtures.length - c.round });
  });

  it('Wartefrist: sechs von zehn Spielmonaten', () => {
    expect(waitGames({ fixtures: new Array(10) })).toBe(6);
    expect(waitGames({ fixtures: new Array(14) })).toBe(8);
  });

  it('Ausbildungsentschädigung nach der Tabelle des Landesverbands (Spielwert-Zuordnung)', () => {
    expect(FEE_BASE).toEqual({ 1: 0, 2: 250, 3: 250, 4: 250, 5: 500 });
    expect(trainingFee(3, 3, {})).toBe(250); // gleiche Klasse: Grundbetrag
    expect(trainingFee(4, 5, {})).toBe(500); // nach oben: Betrag der aufnehmenden Klasse
    expect(trainingFee(5, 4, {})).toBe(375); // nach unten: Mittel beider Klassen (KOL–KL A-D = 375 €)
    expect(trainingFee(1, 3, {})).toBe(0); // Freizeitliga: keine Entschädigung
    expect(trainingFee(3, 1, {})).toBe(0);
    expect(trainingFee(3, 3, { age: 19, seasonsAtClub: 3 })).toBe(375); // +50 %
    expect(trainingFee(3, 3, { age: 19, seasonsAtClub: 2 })).toBe(250);
    expect(trainingFee(3, 3, { recent: true })).toBe(125); // −50 %
    expect(trainingFee(3, 3, { age: 19, seasonsAtClub: 3, recent: true })).toBe(250);
  });

  it('Handgeld bleibt unter der Amateurgrenze (DFB-Spielordnung § 8)', () => {
    for (const v of HANDGELD_STEPS) expect(v).toBeLessThanOrEqual(AMATEUR_MAX_MONTH);
  });

  it('Freigabe: Leistungsträger selten, Derby-Rivale noch seltener, Geld hilft nur im Winter', () => {
    const base = { derby: false, rel: 0, kind: 'summer', extra: 0 };
    expect(releaseChance({ ...base, importance: 1 })).toBeLessThan(releaseChance({ ...base, importance: 0 }));
    expect(releaseChance({ ...base, importance: 0.5, derby: true })).toBeLessThan(releaseChance({ ...base, importance: 0.5 }));
    expect(releaseChance({ ...base, importance: 0.5, rel: 2 })).toBeGreaterThan(releaseChance({ ...base, importance: 0.5, rel: -2 }));
    expect(releaseChance({ ...base, importance: 0.5, extra: 250 })).toBe(releaseChance({ ...base, importance: 0.5 })); // Sommer: fest
    expect(releaseChance({ ...base, importance: 0.5, kind: 'winter', extra: 250 })).toBeGreaterThan(releaseChance({ ...base, importance: 0.5, kind: 'winter' }));
    for (const imp of [0, 0.5, 1]) for (const extra of EXTRA_STEPS) expect(releaseChance({ ...base, importance: imp, kind: 'winter', extra })).toBeLessThanOrEqual(0.95);
  });

  it('Wichtigkeit: bester = 1, schwächster = 0, einziger Torwart unverzichtbar', () => {
    const r = { 1: 70, 2: 50, 3: 30, 4: 60 };
    const pos = (i) => (i === 3 ? 'gk' : 'mid');
    expect(importanceIn([1, 2, 3, 4], 1, (i) => r[i], pos)).toBe(1);
    expect(importanceIn([1, 2, 4], 2, (i) => r[i], pos)).toBe(0);
    expect(importanceIn([1, 2, 3, 4], 3, (i) => r[i], pos)).toBe(1); // schwächster, aber einziger Torwart
  });
});

describe('Nachbarvereine und Markt', () => {
  it('Nachbarligen je nach Stufe, Spieler kommen nirgends doppelt vor', () => {
    const c = createCareer({ seed: 11 });
    expect(c.transfers.neighbors.every((n) => n.level === 2)).toBe(true); // unten gibt es keine Liga
    expect(c.transfers.neighbors).toHaveLength(3);
    c.level = 3;
    ensureNeighbors(c);
    expect(new Set(c.transfers.neighbors.map((n) => n.level))).toEqual(new Set([2, 4]));
    const all = allIdx(c);
    expect(new Set(all).size).toBe(all.length);
    for (const idx of tstate(c).neighbors.flatMap((n) => n.squad)) expect(takenIndices(c).has(idx)).toBe(true);
  });

  it('Neuzugänge passen zur Liga: Nachbarvereine ziehen nur Stufen ihrer Vorgabe', () => {
    const c = createCareer({ seed: 12 });
    c.level = 4;
    ensureNeighbors(c);
    for (const n of c.transfers.neighbors) for (const idx of n.squad) expect(n.tiers[playerOf(c, idx).tier]).toBeGreaterThan(0);
  });

  it('Suche filtert nach Position und Liga und sortiert nach Stärke', () => {
    const c = createCareer({ seed: 13 });
    const gk = marketList(c, { pos: 'gk' });
    expect(gk.length).toBeGreaterThan(0);
    expect(gk.every((r) => r.p.position === 'gk')).toBe(true);
    const own = marketList(c, { scope: 'own' });
    expect(own.every((r) => !r.neighbor)).toBe(true);
    const sorted = marketList(c, { sort: 'rating' }).map((r) => r.p.rating);
    expect(sorted).toEqual([...sorted].sort((a, b) => b - a));
    expect(marketList(c, { scope: 'neighbor' }).every((r) => r.neighbor)).toBe(true);
  });
});

describe('Spieler holen', () => {
  it('außerhalb der Wechselfrist ist die Anfrage gesperrt', () => {
    const c = advanceTo(createCareer({ seed: 21 }), 1);
    const idx = marketList(c, { scope: 'own' })[0].idx;
    expect(windowInfo(c).open).toBe(false);
    expect(askClub(c, idx)).toBe('window');
  });

  it('höchstens drei Anfragen je Periode, ein Spieler nur einmal', () => {
    const c = createCareer({ seed: 22 });
    const rows = marketList(c, { scope: 'own' }).slice(0, 5);
    expect(['ja', 'nein']).toContain(askClub(c, rows[0].idx));
    expect(askClub(c, rows[0].idx)).toBe('busy');
    askClub(c, rows[1].idx);
    askClub(c, rows[2].idx);
    expect(windowInfo(c).left).toBe(0);
    expect(askClub(c, rows[3].idx)).toBe('limit');
  });

  it('die Antwort des Vereins ist je Spieler bestimmt (Determinismus)', () => {
    const a = createCareer({ seed: 23 });
    const b = createCareer({ seed: 23 });
    const rows = marketList(a, { scope: 'own' }).slice(0, 3);
    expect(rows.map((r) => askClub(a, r.idx))).toEqual(rows.map((r) => askClub(b, r.idx)));
    expect(JSON.stringify(a.transfers)).toBe(JSON.stringify(b.transfers));
  });

  it('mit Freigabe: Spieler kommt, Verein holt Ersatz, Ausbildungsentschädigung und Handgeld fließen', () => {
    let tried = 0;
    for (let seed = 24; seed < 44; seed++) {
      const c = createCareer({ seed });
      c.level = 3; // Kreisklasse B: Entschädigung 250 €
      ensureNeighbors(c);
      c.cash = 1000;
      const idx = candidate(c, 'ja');
      const src = marketList(c, { scope: 'own' }).find((r) => r.idx === idx).club;
      const sizeBefore = src.squad.length;
      const squadBefore = humanClub(c).squad.length;
      expect(askClub(c, idx)).toBe('ja');
      const d = c.transfers.deals[idx];
      expect(d.fee).toBe(priceOf(c, idx, 'summer'));
      expect(d.fee).toBeGreaterThan(0);
      expect(setHandgeld(c, idx, 80)).toBe(true);
      expect(talkDeal(c, idx)).toBe(true);
      const [m1, m2] = motivesOf(playerOf(c, idx)); // beide Motive treffen: die beste Gesprächsführung
      argueDeal(c, idx, m1);
      const res = argueDeal(c, idx, m2);
      tried++;
      if (!res.joined) {
        expect(c.cash).toBe(1000); // abgelehnt: nichts bezahlt
        continue;
      }
      expect(humanClub(c).squad).toContain(idx);
      expect(humanClub(c).squad.length).toBe(squadBefore + 1);
      expect(src.squad).not.toContain(idx);
      expect(src.squad.length).toBe(sizeBefore); // Ersatz aus dem Pool, Kader nicht ausgedünnt
      expect(c.cash).toBeCloseTo(1000 - d.fee - 80, 5);
      expect(c.ledger.some((l) => /Ausbildungsentschädigung|Training compensation/.test(l.text) && l.amount === -d.fee)).toBe(true);
      expect(c.ledger.some((l) => /Handgeld|Signing-on/.test(l.text) && l.amount === -80)).toBe(true);
      expect(isBanned(c, idx)).toBe(false);
      expect(c.players[idx].since).toBe(c.season);
      expect(c.transfers.log.some((e) => e.kind === 'in')).toBe(true);
      expect(c.week.chat.some((m) => m.press && m.text.includes(playerOf(c, idx).name))).toBe(true); // Kreisblatt
      expect(c.transfers.stats.paid).toBe(d.fee + 80);
      const all = allIdx(c);
      expect(new Set(all).size).toBe(all.length);
      return;
    }
    throw new Error(`kein Spieler hat zugesagt (${tried} Versuche)`);
  });

  it('ohne Freigabe: Wartefrist statt Entschädigung, Verhältnis leidet', () => {
    // Mehrere Anfragen, bis ein Spieler zusagt (Gespräch deterministisch je Spiel).
    for (let seed = 30; seed < 50; seed++) {
      const c = createCareer({ seed });
      c.cash = 1000;
      const idx = candidate(c, 'nein');
      const clubId = marketList(c, { scope: 'own' }).find((r) => r.idx === idx).clubId;
      expect(askClub(c, idx)).toBe('nein');
      setHandgeld(c, idx, 150);
      talkDeal(c, idx);
      const [m1, m2] = motivesOf(playerOf(c, idx));
      argueDeal(c, idx, m1);
      const res = argueDeal(c, idx, m2);
      if (!res?.joined) continue;
      expect(c.cash).toBe(1000 - 150); // nur Handgeld
      expect(isBanned(c, idx)).toBe(true);
      expect(banGames(c, idx)).toBe(waitGames(c));
      expect(c.players[idx].ban.reason).toBe('wartefrist');
      expect(c.week.availability[idx]).toBe('no');
      expect(c.transfers.rel[clubId]).toBe(-2);
      return;
    }
    throw new Error('kein Spieler hat ohne Freigabe zugesagt');
  });

  it('volle Kasse reicht nicht: ohne Geld keine Anfrage', () => {
    const c = createCareer({ seed: 25 });
    c.level = 3;
    ensureNeighbors(c);
    c.cash = 10;
    expect(askClub(c, marketList(c, { scope: 'own' })[0].idx)).toBe('cash');
  });

  it('im Winter ist Geld verhandelbar (Preis wächst mit der Wichtigkeit), im Sommer fest', () => {
    const c = advanceTo(createCareer({ seed: 26 }), 5);
    c.level = 3;
    ensureNeighbors(c);
    expect(windowAt(c)).toBe('winter');
    const rows = marketList(c, { scope: 'own' }).sort((a, b) => b.importance - a.importance);
    const top = rows[0];
    const low = rows.at(-1);
    expect(priceOf(c, top.idx, 'winter')).toBeGreaterThan(priceOf(c, low.idx, 'winter'));
    expect(priceOf(c, top.idx, 'summer')).toBe(priceOf(c, low.idx, 'summer'));
  });
});

describe('Eigene Spieler abgeben', () => {
  function withOffer(seed) {
    for (let s = seed; s < seed + 30; s++) {
      let c = createCareer({ seed: s });
      c.level = 3;
      ensureNeighbors(c);
      const me = humanClub(c);
      // Beste Spieler auf die Liste, dann in die Winterperiode.
      const best = [...me.squad].filter((i) => i !== c.coach?.idx).sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating).slice(0, 4);
      for (const i of best) listPlayer(c, i, true);
      advanceTo(c, 5);
      if (c.transfers.offers.length) return c;
    }
    throw new Error('keine Angebote');
  }

  it('Gelistete bekommen zu Periodenbeginn Angebote; Freigabe: Spieler geht, Geld kommt, Kader ≥ Minimum', () => {
    const c = withOffer(40);
    const o = c.transfers.offers[0];
    expect(o.key).toBe(`${c.season}:winter`);
    expect(inTransfers(c, o.idx)).toBe(true);
    const cash = c.cash;
    const club = anyClub(c, o.club);
    const name = playerOf(c, o.idx).name;
    const sizeBefore = club.squad.length;
    expect(humanClub(c).squad.length).toBeGreaterThan(MIN_SQUAD);
    expect(acceptOffer(c, o.id)).toBe('ok');
    expect(humanClub(c).squad).not.toContain(o.idx);
    expect(club.squad).toContain(o.idx);
    expect(club.squad.length).toBe(sizeBefore); // der Schwächste dort geht
    expect(c.cash).toBeCloseTo(cash + o.fee, 5);
    expect(c.formers[o.idx].club).toBe(club.id);
    expect(c.flags.poached[o.idx]).toBe(c.season);
    expect(c.transfers.log.some((e) => e.kind === 'out' && e.text.includes(name))).toBe(true);
    expect(c.transfers.listed).not.toContain(o.idx);
    expect(humanClub(c).squad.length).toBeGreaterThanOrEqual(MIN_SQUAD);
    const all = allIdx(c);
    expect(new Set(all).size).toBe(all.length);
  });

  it('Freigabe verweigern: bei Wechselwilligen sauer, bei selbst Gelistetem nichts; Gegenangebot nur im Winter', () => {
    const c = withOffer(60);
    const o = c.transfers.offers[0];
    const mood = c.mood;
    expect(declineOffer(c, o.id)).toBe(true);
    expect(c.transfers.offers.find((x) => x.id === o.id)).toBeUndefined();
    expect(c.mood).toBe(mood); // gelistet = wir wollten ihn abgeben
    // Wechselwilliger:
    const w = withOffer(80);
    const o2 = w.transfers.offers[0];
    o2.wish = true;
    const m2 = w.mood;
    declineOffer(w, o2.id);
    expect(w.players[o2.idx].grumpy).toBe(3);
    expect(w.mood).toBeLessThan(m2);
    // Gegenangebot (Winter, einmal)
    const x = withOffer(100);
    const o3 = x.transfers.offers.find((q) => q.base > 0);
    if (o3) {
      const before = o3.fee;
      counterOffer(x, o3.id);
      expect(o3.counter).toBe(true);
      expect(counterOffer(x, o3.id)).toBe(false);
      const still = x.transfers.offers.find((q) => q.id === o3.id);
      if (still) expect(still.fee).toBe(Math.round(before * 1.5));
    }
  });

  it('poaching.js lässt Gelistete und Spieler mit Angebot in Ruhe', () => {
    const c = createCareer({ seed: 50 });
    const me = humanClub(c);
    for (let r = 0; r < 3; r++) for (const f of c.fixtures[r]) f.result = { home: 1, away: 1 };
    for (const i of me.squad) c.players[i].grumpy = 3; // alle wären Kandidaten
    c.flags.derbyRival ??= c.clubs.find((x) => !x.human).id;
    for (const i of me.squad) listPlayer(c, i, true);
    const rng = { chance: () => true, next: () => 0, int: (a) => a, pick: (a) => a[0], range: (a) => a };
    expect(POACH_EVENTS.abwerbeversuch.needs(c, rng)).toBeNull();
    for (const i of me.squad) listPlayer(c, i, false);
    expect(POACH_EVENTS.abwerbeversuch.needs(c, rng)).not.toBeNull();
  });
});

describe('Wechsel zwischen CPU-Vereinen', () => {
  it('Gründungssommer: keine Wechsel; Winterperiode: Wechsel, Kaderstärke und -größe bleiben ligagerecht', () => {
    const c = createCareer({ seed: 61 });
    expect(c.transfers.stats.cpu).toBe(0);
    advanceTo(c, 4);
    const cpu = () => c.clubs.filter((x) => !x.human);
    const sizes = cpu().map((x) => x.squad.length);
    const ratings = cpu().map((x) => x.squad.reduce((s, i) => s + playerOf(c, i).rating, 0) / x.squad.length);
    const outs = c.transfers.log.filter((e) => e.kind === 'out').length;
    advanceTo(c, 5);
    expect(c.transfers.stats.cpu).toBeGreaterThan(0);
    // Die CPU-Wechsel lassen jeden Kader gleich groß (Ersatz aus dem Pool bzw. der Schwächste geht); nur Abgänge von dir (poaching.js) wachsen.
    const grown = c.transfers.log.filter((e) => e.kind === 'out').length - outs;
    expect(cpu().reduce((s, x) => s + x.squad.length, 0)).toBe(sizes.reduce((a, b) => a + b, 0) + grown);
    cpu().forEach((x, k) => {
      const avg = x.squad.reduce((s, i) => s + playerOf(c, i).rating, 0) / x.squad.length;
      expect(Math.abs(avg - ratings[k])).toBeLessThan(6);
      for (const idx of x.squad) expect(c.players[idx]).toBeTruthy();
    });
    expect(c.transfers.log.some((e) => e.kind === 'news' && /wechselt von/.test(e.text))).toBe(true);
    const all = allIdx(c);
    expect(new Set(all).size).toBe(all.length);
  });

  it('Zugänge passen zur Stufe des neuen Vereins', () => {
    for (const seed of [62, 63, 64]) {
      const c = createCareer({ seed });
      c.level = 3;
      ensureNeighbors(c);
      advanceTo(c, 5);
      for (const x of c.clubs.filter((cl) => !cl.human)) for (const idx of x.squad) if (x.tiers) expect(x.tiers[playerOf(c, idx).tier] ?? 0).toBeGreaterThanOrEqual(0);
      expect(c.clubs.filter((cl) => !cl.human).every((cl) => cl.squad.length >= 8)).toBe(true);
    }
  });

  it('gleicher Spielstand, gleiche Wechsel (Determinismus) – auch nach Speichern und Laden jede Woche', () => {
    const a = advanceTo(createCareer({ seed: 65 }), 6);
    let b = createCareer({ seed: 65 });
    while (b.round < 6) {
      for (const f of b.fixtures[b.round]) f.result = { home: 1, away: 1 };
      finishRound(b);
      b = reload(b);
    }
    expect(JSON.stringify(b.transfers.log)).toBe(JSON.stringify(a.transfers.log));
    expect(b.clubs.map((x) => x.squad)).toEqual(a.clubs.map((x) => x.squad));
  });

  it('über mehrere Saisons: Kader bleiben voll, nichts doppelt, Zustand bleibt klein', () => {
    let c = createCareer({ seed: 66 });
    for (let s = 0; s < 3; s++) {
      finishSeason(c);
      nextSeason(c);
      c = reload(c);
      const all = allIdx(c);
      expect(new Set(all).size).toBe(all.length);
      for (const x of c.clubs.filter((cl) => !cl.human)) expect(x.squad.length).toBeGreaterThanOrEqual(8);
    }
    expect(c.transfers.log.length).toBeLessThanOrEqual(40);
    expect(JSON.stringify(c.transfers).length).toBeLessThan(20000);
  });
});

describe('Alte Spielstände', () => {
  it('ein Stand ohne Transfermarkt lädt, bekommt Nachbarvereine und läuft weiter', () => {
    const c = createCareer({ seed: 71 });
    const json = JSON.parse(JSON.stringify(c));
    delete json.transfers;
    const old = migrateCareer(json);
    expect(old.transfers.v).toBe(1);
    expect(old.transfers.neighbors.length).toBeGreaterThan(0);
    const all = allIdx(old);
    expect(new Set(all).size).toBe(all.length);
    advanceTo(old, 6);
    expect(old.round).toBe(6);
  });

  it('mitten in der Saison geladen: keine Angebote und Anfragen aus fremden Perioden', () => {
    const c = advanceTo(createCareer({ seed: 72 }), 2);
    delete c.transfers;
    const old = migrateCareer(JSON.parse(JSON.stringify(c)));
    expect(windowInfo(old).open).toBe(false);
    expect(old.transfers.offers).toEqual([]);
  });
});

describe('Leihe', () => {
  it('Leihspieler kommt für eine Saison und geht zurück; Aufwandsersatz gebucht', () => {
    let done = false;
    for (let seed = 80; seed < 100 && !done; seed++) {
      let c = createCareer({ seed });
      c.cash = 500;
      const rows = marketList(c, { scope: 'own' }).sort((a, b) => a.importance - b.importance);
      for (const r of rows) {
        const probe = reload(c);
        if (loanIn(probe, r.idx) !== 'ok') continue;
        const from = r.clubId;
        expect(loanIn(c, r.idx)).toBe('ok');
        expect(humanClub(c).squad).toContain(r.idx);
        expect(c.cash).toBe(450);
        expect(c.players[r.idx].loan.from).toBe(from);
        expect(loansIn(c)).toHaveLength(1);
        expect(inTransfers(c, r.idx)).toBe(true);
        finishSeason(c);
        nextSeason(c);
        expect(humanClub(c).squad).not.toContain(r.idx);
        const back = clubById(c, from);
        if (back) expect(back.squad).toContain(r.idx);
        expect(loansIn(c)).toHaveLength(0);
        c = reload(c);
        done = true;
        break;
      }
    }
    expect(done).toBe(true);
  });

  it('höchstens zwei Leihspieler, nur in der Wechselfrist', () => {
    const c = createCareer({ seed: 81 });
    const rows = marketList(c, { scope: 'own' }).sort((a, b) => a.importance - b.importance);
    let n = 0;
    for (const r of rows) if (loanIn(c, r.idx) === 'ok') n++;
    expect(n).toBeLessThanOrEqual(2);
    const late = advanceTo(createCareer({ seed: 81 }), 1);
    expect(loanIn(late, rows[0].idx)).toBe('window');
  });

  it('eigenen Spieler verleihen: weg für die Saison, danach wieder da', () => {
    const c = createCareer({ seed: 82 });
    const me = humanClub(c);
    const idx = me.squad.find((i) => i !== c.coach?.idx && playerOf(c, i).tier !== 'superstar');
    expect(loanOut(c, idx)).toBe('ok');
    expect(me.squad).not.toContain(idx);
    expect(loansOut(c)).toHaveLength(1);
    expect(c.formers[idx].club).toBeTruthy(); // bleibt bei der Konkurrenz stehen
    finishSeason(c);
    nextSeason(c);
    expect(humanClub(c).squad).toContain(idx);
    expect(c.formers?.[idx]).toBeUndefined();
    expect(loansOut(c)).toHaveLength(0);
    expect(maxSquad(c)).toBeGreaterThan(0);
  });
});
