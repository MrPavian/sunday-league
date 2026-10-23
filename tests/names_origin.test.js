// Namen, Herkunft und Kneipengeschichten passen zusammen (vom Nutzer gewünscht, 2026-10-23):
// kein „Max El-Amrani“, kein Müller mit Eltern aus Anatolien, kein Torwart, der „öfter aufs Tor schießt“.
import { describe, expect, it } from 'vitest';
import { createPlayerPool } from '../src/sim/generator.js';
import { NAME_EDITION, nameLocaleOf } from '../src/data/names.js';
import { germanFirst, originOf, setNameLocale } from '../src/data/origins.js';
import { DOSSIER, dossierFacts, DREAM_SUPPORT } from '../src/data/backstories.js';
import { createRng } from '../src/core/rng.js';

const N = 6000;
// Alle deutschen Vornamen der Auflage (alle Jahrgänge, viele Würfe).
const GERMAN = new Set(Array.from({ length: 3000 }, (_, i) => germanFirst(createRng(i + 1), [20, 33, 48][i % 3])));
const STRICT = ['tr', 'ar', 'wa', 'yu', 'gr', 'pt', 'it'];

describe('Namen nach Herkunft (Auflage 7)', () => {
  it('neue deutsche Karrieren nutzen Auflage 7', () => expect(NAME_EDITION).toBe(7));

  it('türkische, arabische, westafrikanische … Nachnamen haben keinen deutschen Vornamen; Werte wie Auflage 6 (bis auf Körper)', () => {
    setNameLocale(nameLocaleOf(7));
    const pool = createPlayerPool({ seed: 1921, edition: 7 });
    const old = createPlayerPool({ seed: 1921, edition: 6 });
    let strict = 0;
    for (let i = 0; i < N; i++) {
      const p = pool.get(i);
      const [first, ...rest] = p.name.split(' ');
      const origin = originOf(rest.join(' '));
      if (STRICT.includes(origin)) {
        strict++;
        // Ausnahme: Namen, die es in beiden Listen gibt (Marco, Luca, Stefan …), sind auch in der Herkunft üblich.
        expect(GERMAN.has(first) && !['Marco', 'Luca', 'Stefan', 'David', 'Daniel', 'Alexander', 'Dominik', 'Mario', 'Fabio', 'Marcel', 'Robin', 'Jan'].includes(first), p.name).toBeFalsy();
      }
      const q = old.get(i);
      // Körper hängt auch am Namen (strength.js): Wer einen anderen Vornamen bekommt, kann dort abweichen – sonst alles gleich.
      expect({ ...p.attrs, strength: 0 }).toEqual({ ...q.attrs, strength: 0 });
      expect(p.look.skin).toBe(q.look.skin);
    }
    expect(strict).toBeGreaterThan(N * 0.1);
    setNameLocale(nameLocaleOf(NAME_EDITION));
  });
});

describe('Kneipengeschichten passen zu Herkunft und Position', () => {
  const all = (kind, facts) => DOSSIER[kind].map((f) => f(facts));
  const base = { first: 'Jonas', age: 25, profession: 'Elektriker', position: 'mid' };

  it('Herkunftssätze nur bei passender Herkunft', () => {
    const de = all('herkunft', { ...base, origin: 'de' }).join(' ');
    expect(de).not.toMatch(/Anatolien|Polen|Kasachstan|Balkan|Kalabrien|Thessaloniki|Porto|Arabisch|Westafrika/);
    expect(all('herkunft', { ...base, origin: 'tr' }).join(' ')).toMatch(/Anatolien/);
    expect(all('herkunft', { ...base, origin: 'pl' }).join(' ')).toMatch(/Polen/);
    expect(all('herkunft', { ...base, origin: 'russ' }).join(' ')).toMatch(/Kasachstan/);
    expect(all('herkunft', { ...base, origin: 'tr' }).join(' ')).not.toMatch(/Polen/);
  });

  it('Torwart: keine Torschüsse, kein Fallrückzieher, Elfmeterangst als Torwart', () => {
    const facts = dossierFacts({ name: 'Kai Ludwig', age: 30, profession: 'Koch', position: 'gk' }, 'de');
    const text = ['familie', 'traum', 'geheimnis'].flatMap((k) => all(k, facts)).join(' ');
    expect(text).not.toMatch(/öfter aufs Tor|Fallrückzieher|humpelt er immer/);
    expect(text).toMatch(/Parade/);
    expect(DREAM_SUPPORT[0]('Kai', facts)).not.toMatch(/Fallrückzieher/);
    const field = ['familie', 'traum'].flatMap((k) => all(k, { ...facts, position: 'fwd' })).join(' ');
    expect(field).toMatch(/öfter aufs Tor/);
  });
});
