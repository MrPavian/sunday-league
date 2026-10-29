// Regionale Vor- und Nachnamen (vom Nutzer gewünscht 2026-10-29: Xaver kommt in Bayern öfter vor als in Niedersachsen).
import { afterEach, describe, expect, it } from 'vitest';
import { createCareer, getPool, playerOf, registerCustomPlayers, setVerband } from '../src/career/career.js';
import { REGION_NAMES } from '../src/data/regionalnames.js';
import { PRO_NAMES } from '../src/data/pronames.js';
import { regionalize, REGION_LAST_SHARE } from '../src/data/origins.js';

const pick = (v, seed = 41) => {
  const c = createCareer({ seed });
  c.founding = true;
  setVerband(c, v);
  return c;
};
const share = (names, list) => names.filter((n) => list.includes(n.split(' ').slice(1).join(' '))).length / names.length;
const poolNames = (n = 6000) => Array.from({ length: n }, (_, i) => getPool().get(i));

afterEach(() => createCareer({ seed: 1 })); // Pool wieder ohne Region für die anderen Tests

describe('Regionale Namen', () => {
  it('Bayern: Xaver, Josef, Korbinian, auch bei Älteren – in Niedersachsen nie; typische Nachnamen häufiger', () => {
    pick('bayern');
    const by = poolNames();
    const xBy = by.filter((p) => p.age <= 27 && /^(Xaver|Josef|Korbinian) /.test(p.name)).length;
    const lastBy = share(by.map((p) => p.name), REGION_NAMES.Bayern.last);
    pick('niedersachsen');
    const ni = poolNames();
    expect(xBy).toBeGreaterThan(30);
    expect(by.filter((p) => p.age > 27 && /^(Xaver|Josef|Korbinian) /.test(p.name)).length).toBeGreaterThan(30); // auch Ältere
    pick('hamburg');
    expect(poolNames().filter((p) => p.age > 27 && /^(Fiete|Jonte) /.test(p.name)).length).toBe(0); // Modenamen nur bei Jungen
    expect(ni.filter((p) => /^(Xaver|Korbinian) /.test(p.name)).length).toBe(0);
    expect(lastBy).toBeGreaterThan(share(ni.map((p) => p.name), REGION_NAMES.Bayern.last) + 0.1);
    expect(share(ni.map((p) => p.name), REGION_NAMES.Niedersachsen.last)).toBeGreaterThan(0.1);
  });

  it('nur Name und nur deutsche Nachnamen: Werte, Alter, Aussehen gleich; türkische Namen bleiben; nie ein Profiname', () => {
    createCareer({ seed: 1 });
    const plain = poolNames(3000).map((p) => ({ ...p }));
    pick('bayern');
    const reg = poolNames(3000);
    let changed = 0;
    for (let i = 0; i < plain.length; i++) {
      expect(reg[i].attrs).toEqual(plain[i].attrs);
      expect(reg[i].age).toBe(plain[i].age);
      expect(reg[i].look).toEqual(plain[i].look);
      expect(PRO_NAMES.has(reg[i].name)).toBe(false);
      if (/Yılmaz|Kaya|Demir|Koç|Aydın/.test(plain[i].name)) expect(reg[i].name).toBe(plain[i].name);
      if (reg[i].name !== plain[i].name) changed++;
    }
    expect(changed / plain.length).toBeGreaterThan(0.1);
    expect(changed / plain.length).toBeLessThan(REGION_LAST_SHARE + 0.05);
  });

  it('alte Spielstände (Verband ohne regionNames, kein Verband) behalten ihre Namen', () => {
    const c = pick('bayern');
    const regional = playerOf(c, c.clubs[0].squad[0]).name;
    delete c.regionNames;
    registerCustomPlayers(c);
    const old = createCareer({ seed: 41 });
    expect(playerOf(c, c.clubs[0].squad[0]).name).toBe(playerOf(old, old.clubs[0].squad[0]).name);
    expect(typeof regional).toBe('string');
  });

  it('fest je Person und Region; kein doppelter Vor- und Nachname', () => {
    expect(regionalize('Lukas Becker', 20, 7, 'Bayern')).toBe(regionalize('Lukas Becker', 20, 7, 'Bayern'));
    for (let k = 0; k < 3000; k++) {
      const [f, ...l] = regionalize('Paul Becker', 20, k, 'Saarland').split(' ');
      expect(f).not.toBe(l.join(' '));
    }
  });
});
