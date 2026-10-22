// Oberfläche: Platz, Pacht und Ausbau.
import { createCareer, humanClub } from '../../../src/career/career.js';
import { platz } from '../../../src/career/platz.js';
import { BASE, checker, click, hScroll, launch, newCareer, page, settle, SIZES, smallTargets, visible } from '../lib.mjs';
import { NARROW_OK } from './core.mjs';

export async function platzAnlage(b, size) {
  const ok = checker(`Platz, Pacht und Ausbau (${size})`);
  const c = createCareer({ seed: 5 });
  c.level = 2;
  humanClub(c).venue = 'rasenplatz';
  c.cash = 5000;
  platz(c).cond = 0.4;
  platz(c).chalk = 0.3;
  const p = await page(b, size, { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(c) } });
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  await click(p, '[data-action="area"][data-value="club"]');
  await p.evaluate(() => document.querySelector('[data-action="tab"][data-value="club"]')?.click());
  await p.waitForTimeout(400);
  await settle(p);
  ok(!!(await p.$('.facilities.platz')), 'Platz-Block fehlt');
  ok((await p.$$('.facilities.platz .me-bar')).length === 2, 'Zustands- und Linienbalken fehlen');
  const text = await p.evaluate(() => document.querySelector('.facilities.platz')?.innerText ?? '');
  ok(/Pachtvertrag|Lease/.test(text) && /Pacht|leased/.test(text), 'Pachtvertrag fehlt');
  ok(!!(await p.$('[data-action="care"][data-value="maehen:helfer"]')) && !!(await p.$('[data-action="care"][data-value="nachsaeen:profi"]')), 'Pflegeknöpfe fehlen');
  const bar = () => p.evaluate(() => document.querySelector('.facilities.platz .me-bar i')?.style.getPropertyValue('--v'));
  const before = await bar();
  await click(p, '[data-action="care"][data-value="maehen:helfer"]');
  await p.waitForTimeout(400);
  ok((await bar()) !== before, 'Mähen verändert den Rasenbalken nicht');
  const groups = await p.$$eval('.facilities h4.sub', (e) => e.map((x) => x.textContent.trim()));
  ok(['Vereinsheim', 'Sportplatz', 'Tribünen', 'Gastro'].every((g) => groups.some((t) => t.startsWith(g))), `Ausbau-Gruppen unvollständig: ${groups.join(' | ')}`);
  ok(!!(await p.$('[data-action="build"][data-value="kunstrasen:handwerker"]')), 'Kunstrasen nicht baubar angeboten');
  await click(p, '[data-action="build"][data-value="stehstufen:handwerker"]');
  await p.waitForTimeout(400);
  ok(/im Bau/.test(await p.evaluate(() => document.querySelector('.facilities:not(.platz):not(.clublife)')?.innerText ?? '')), 'Baustelle wird nicht angezeigt');
  ok(!!(await p.$('[data-action="enqueue"]')), 'Vormerken-Knopf fehlt bei laufender Baustelle');
  await click(p, '[data-action="enqueue"]');
  await p.waitForTimeout(300);
  ok(!!(await p.$('[data-action="dequeue"]')), 'Vorgemerkter Bau lässt sich nicht streichen');
  ok(!(await hScroll(p)), 'seitliches Scrollen');
  if (SIZES[size].touch) {
    const small = await smallTargets(p, '#club .facilities button', NARROW_OK);
    ok(!small.length, `Schaltflächen < 44 px: ${small.slice(0, 3).join(', ')}`);
  }
  if (process.env.E2E_SHOTS) {
    await p.evaluate(() => document.querySelector('.facilities.platz')?.scrollIntoView());
    await p.screenshot({ path: `${process.env.E2E_SHOTS}/platz-${size}.png` });
  }
  ok(!p.errors.length, `Seitenfehler: ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// Gespeicherten Spielstand vor dem nächsten Laden verändern (die App überschreibt ihn beim Verlassen der Seite,
// daher per Init-Skript direkt vor dem App-Start) und die Karriere fortsetzen.
