import { describe, expect, it } from 'vitest';
import { awayKitOf, colorDistance, createCareer, humanClub, KIT_CLASH, kitChoice, resolveKitClash, resolveKits, updateClub } from '../src/career/career.js';
import { KIT_COST } from '../src/career/finances.js';

const club = (shirt, extra = {}) => ({ id: `c${shirt}`, kit: { shirt, shorts: 0x1c1c1c, socks: shirt, second: 0xf2efe6 }, keeperKit: { shirt: 0xe8742a, shorts: 0x1c1c1c, socks: 0xe8742a }, ...extra });

describe('away kit', () => {
  it('without its own away kit, a club plays away in its second colour', () => {
    const red = club(0xc8352f);
    expect(awayKitOf(red).shirt).toBe(0xf2efe6);
    expect(awayKitOf(red).shorts).toBe(0xc8352f);
    // Zweite Farbe zu nah an der Hauptfarbe: Weiß oder Schwarz.
    expect(colorDistance(awayKitOf(club(0xf2efe6, { kit: { shirt: 0xf2efe6, second: 0xe8e0d0 } })).shirt, 0xf2efe6)).toBeGreaterThan(150);
  });

  it('clash order: home kit, then away kit, then a neutral change kit', () => {
    const red = club(0xc8352f);
    const blue = club(0x2f6fb5);
    expect(kitChoice(red, blue)).toBe('heim');
    expect(resolveKitClash(red, blue).kit).toBe(blue.kit);
    const red2 = club(0xb83228);
    expect(kitChoice(red, red2)).toBe('auswaerts');
    expect(resolveKitClash(red, red2).kit.shirt).toBe(0xf2efe6);
    // Gastgeber in Weiß, Gast in Rot mit weißem Auswärtstrikot: Ausweichtrikot.
    const white = club(0xf2efe6, { kit: { shirt: 0xf2efe6, shorts: 0x1c1c1c, socks: 0xf2efe6, second: 0x1c1c1c } });
    const redWhite = club(0xc8352f, { awayKit: { shirt: 0xf0ece0, shorts: 0xc8352f, socks: 0xf0ece0 } });
    expect(kitChoice(white, { ...redWhite, kit: { ...redWhite.kit, shirt: 0xe8e4da } })).toBe('ausweich');
    const k = resolveKitClash(white, { ...redWhite, kit: { ...redWhite.kit, shirt: 0xe8e4da } }).kit;
    expect(colorDistance(k.shirt, white.kit.shirt)).toBeGreaterThan(KIT_CLASH);
  });

  it('the away keeper stands out from both teams and the home keeper', () => {
    const orange = club(0xe8742a); // Gastgeber in Orange – wie der Torwart des Gastes
    const blue = club(0x2f6fb5);
    const { home, away } = resolveKits(orange, blue); // der orange Torwart der Gastgeber zieht sich auch um
    for (const s of [orange.kit.shirt, away.kit.shirt]) expect(colorDistance(home.keeperKit.shirt, s)).toBeGreaterThan(150);
    for (const s of [orange.kit.shirt, away.kit.shirt, home.keeperKit.shirt]) expect(colorDistance(away.keeperKit.shirt, s)).toBeGreaterThan(150);
  });

  it('a shirt that only clashes with the home keeper is kept – the keeper changes instead', () => {
    // Gast in Orange, Gastgeber in Blau mit orangem Torwart: früher Ausweichtrikot, jetzt zieht sich der Torwart um.
    const blue = club(0x2f6fb5);
    const orange = club(0xe8742a, { awayKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 } });
    expect(kitChoice(blue, orange)).toBe('heim');
    const { home, away } = resolveKits(blue, orange);
    expect(away.kit).toBe(orange.kit);
    expect(home.kit).toBe(blue.kit);
    for (const s of [blue.kit.shirt, orange.kit.shirt]) expect(colorDistance(home.keeperKit.shirt, s)).toBeGreaterThan(150);
    for (const s of [blue.kit.shirt, orange.kit.shirt, home.keeperKit.shirt]) expect(colorDistance(away.keeperKit.shirt, s)).toBeGreaterThan(150);
    // Ohne Konflikt bleiben beide Vereine unverändert.
    const blueW = club(0x2f6fb5, { keeperKit: { shirt: 0xf2efe6, shorts: 0x1c1c1c, socks: 0xf2efe6 } });
    const red = club(0xc8352f, { keeperKit: { shirt: 0x1c1c1c, shorts: 0x1c1c1c, socks: 0x1c1c1c } });
    const r = resolveKits(blueW, red);
    expect(r.home).toBe(blueW);
    expect(r.away).toBe(red);
  });

  it('the kit editor orders home and away kit together for one price', () => {
    const c = createCareer({ seed: 70 });
    const me = humanClub(c);
    c.cash = 1000;
    expect(updateClub(c, { awayKit: { shirt: 0x2f6fb5 } })).toBe(true);
    expect(me.awayKit.shirt).toBe(0x2f6fb5);
    expect(c.cash).toBe(1000 - KIT_COST);
    expect(updateClub(c, { kit: { shirt: 0x2e6b3a }, awayKit: { shirt: 0xe0b020 } })).toBe(true);
    expect(c.cash).toBe(1000 - 2 * KIT_COST);
    expect(colorDistance(me.keeperKit.shirt, me.kit.shirt)).toBeGreaterThan(150);
    expect(colorDistance(me.keeperKit.shirt, me.awayKit.shirt)).toBeGreaterThan(150);
    // Unverändert abgeschickt: nichts bestellt, nichts bezahlt.
    expect(updateClub(c, { kit: { ...me.kit }, awayKit: { ...me.awayKit } })).toBe(true);
    expect(c.cash).toBe(1000 - 2 * KIT_COST);
  });
});
