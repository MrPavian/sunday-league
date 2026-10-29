// Oberfläche: Frauenteam (Reiter „Frauen“ in Verein, nur mit Frauenteam). Drei Unterbereiche (Tabelle, Kader, Ergebnisse);
// kein seitliches Scrollen, auf Touch keine Schaltflächen unter 44 px. Ohne Frauenteam gibt es den Reiter nicht.
import { createCareer, currentFixtures, finishRound, migrateCareer } from '../../../src/career/career.js';
import { SQUAD, TEAMS } from '../../../src/career/women.js';
import { checker, click, hScroll, page, settle, SIZES, smallTargets } from '../lib.mjs';
import { NARROW_OK } from './core.mjs';

function career(team) {
  let c = createCareer({ seed: 5 });
  if (!team) return c;
  c.saga.frauen = { founded: 0, captain: 'Lena Kaya', strength: 0.4, seasons: [] };
  c = migrateCareer(JSON.parse(JSON.stringify(c)));
  for (let i = 0; i < 3; i++) {
    for (const f of currentFixtures(c)) f.result = { home: 1, away: 0 };
    finishRound(c); // ein paar Spieltage, damit Tabelle und Ergebnisse etwas zeigen
  }
  return c;
}

export async function frauen(b, size, shots) {
  const ok = checker(`Frauenteam (${size})`);
  const none = await page(b, size, { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(career(false)) } });
  await click(none, '.career [data-c="continue"]');
  await none.waitForTimeout(1500);
  await click(none, '[data-action="area"][data-value="club"]');
  ok(!(await none.$('[data-action="tab"][data-value="women"]')), 'Reiter Frauen ohne Frauenteam');
  await none.context().close();

  const p = await page(b, size, { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(career(true)) } });
  const shot = async (name) => shots && (await p.screenshot({ path: `${shots}/${name}-${size}.png` }));
  const layout = async (label) => {
    await settle(p);
    ok(!(await hScroll(p)), `${label}: seitliches Scrollen`);
    ok(await p.evaluate(() => { const t = document.querySelector('[data-testid="women"]'); return !t || t.scrollWidth <= t.clientWidth + 1; }), `${label}: Frauenteam läuft über den Rand`);
    if (SIZES[size].touch) {
      const s = await smallTargets(p, '#club [data-testid="women"] .ui-tabs button', NARROW_OK);
      ok(!s.length, `${label}: Schaltflächen < 44 px: ${s.slice(0, 3).join(', ')}`);
    }
  };
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  await click(p, '[data-action="area"][data-value="club"]');
  await p.evaluate(() => document.querySelector('[data-action="tab"][data-value="women"]')?.click());
  await p.waitForTimeout(400);
  ok(!!(await p.$('[data-testid="women"]')), 'Reiter Frauen fehlt');
  const subs = await p.$$eval('[data-testid="women"] .ui-tabs [data-action="woSub"]', (e) => e.map((x) => x.dataset.value));
  ok(subs.join() === 'table,squad,games', `Unterbereiche: ${subs.join()}`);
  ok((await p.$$eval('[data-testid="women-table"] tbody tr', (e) => e.length)) === TEAMS, `Tabelle: nicht ${TEAMS} Mannschaften`);
  await layout('Tabelle');
  await shot('frauen-tabelle');
  await click(p, '[data-action="woSub"][data-value="squad"]');
  await p.waitForTimeout(300);
  const players = await p.$$eval('[data-testid="women-player"]', (e) => e.length);
  ok(players === SQUAD, `Kader: ${players} Spielerinnen`);
  ok((await p.$$eval('[data-testid="women-player"] svg.portrait', (e) => e.length)) === SQUAD, 'Kader: Porträts fehlen');
  await layout('Kader');
  await shot('frauen-kader');
  await click(p, '[data-action="woSub"][data-value="games"]');
  await p.waitForTimeout(300);
  await layout('Ergebnisse');
  await shot('frauen-ergebnisse');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}
