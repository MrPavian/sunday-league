// Ausrüstervertrag: Rabatt auf Trikotsätze, Freiware ab einer Liga, drei Saisons (outfitter.js).
import { describe, expect, it } from 'vitest';
import { createCareer, humanClub, updateClub } from '../src/career/career.js';
import { KIT_COST } from '../src/career/finances.js';
import { kitPrice, OUTFITTERS, outfitterOf, outfitterOffers, signOutfitter } from '../src/career/outfitter.js';

describe('Ausrüster', () => {
  it('zwei Angebote, einer zur Zeit, drei Saisons; Rabatt auf den Trikotsatz', () => {
    const c = createCareer({ seed: 21 });
    const offers = outfitterOffers(c);
    expect(offers).toHaveLength(2);
    expect(offers[0].id).not.toBe(offers[1].id);
    const other = OUTFITTERS.find((o) => !offers.includes(o));
    expect(signOutfitter(c, other.id)).toBe(false); // nur aus den Angeboten
    const d = offers.find((o) => !o.freeFrom || o.freeFrom > 1);
    expect(signOutfitter(c, d.id)).toBe(true);
    expect(signOutfitter(c, offers.find((o) => o !== d).id)).toBe(false);
    expect(outfitterOffers(c)).toHaveLength(0);
    expect(kitPrice(c)).toBe(Math.round(KIT_COST * (1 - d.discount)));
    c.season += 3;
    expect(outfitterOf(c)).toBeNull(); // abgelaufen
    expect(kitPrice(c)).toBe(KIT_COST);
  });

  it('Freiware: ab der Liga ein Satz je Saison gratis, danach mit Rabatt', () => {
    const c = createCareer({ seed: 21 });
    c.outfitter = { id: 'flanke', since: c.season, until: c.season + 2, freeUsed: null };
    c.level = 5;
    c.cash = 500;
    expect(kitPrice(c)).toBe(0);
    const club = humanClub(c);
    expect(updateClub(c, { kit: { ...club.kit, shirt: 0x123456 } })).toBe(true);
    expect(c.cash).toBe(500);
    expect(kitPrice(c)).toBe(Math.round(KIT_COST * 0.65));
  });
});
