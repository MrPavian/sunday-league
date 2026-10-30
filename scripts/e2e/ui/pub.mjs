// Oberfläche: Kneipe als 3D-Raum (ROADMAP 11.12). Bühne mit Markern über den Figuren, Liste der Ansprechpartner, Antippen öffnet
// die passende Sache (Wirt: Runde und Neuigkeiten, Opa Heinz: Stammtisch und Taktik, Dartscheibe, Spieler: Gespräch). Kein
// seitliches Scrollen, auf Touch keine Schaltflächen unter 44 px, keine Seitenfehler, Marker im Bild.
import { createCareer } from '../../../src/career/career.js';
import { checker, click, hScroll, page, settle, SIZES, smallTargets } from '../lib.mjs';
import { NARROW_OK } from './core.mjs';

export async function kneipe(b, size, shots) {
  const ok = checker(`Kneipe 3D (${size})`);
  const p = await page(b, size, { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(createCareer({ seed: 5 })) } });
  const layout = async (label) => {
    await settle(p);
    ok(!(await hScroll(p)), `${label}: seitliches Scrollen`);
    if (SIZES[size].touch) {
      const s = await smallTargets(p, '#club [data-testid="pub"] button', NARROW_OK);
      ok(!s.length, `${label}: Schaltflächen < 44 px: ${s.slice(0, 3).join(', ')}`);
    }
  };
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  await click(p, '[data-action="area"][data-value="pub"]');
  await p.waitForTimeout(1200);
  ok(!!(await p.$('[data-pub-stage]')), 'Bühne fehlt');
  const spots = await p.$$eval('[data-pub-stage] .pub-spot', (e) => e.map((x) => ({ id: x.dataset.actor, hidden: x.hidden, r: x.getBoundingClientRect() })));
  const stage = await p.$eval('[data-pub-stage]', (e) => e.getBoundingClientRect());
  ok(spots.length >= 4, `Marker: ${spots.length}`);
  const inside = spots.filter((x) => !x.hidden && x.r.x + x.r.width / 2 >= stage.x - 1 && x.r.x + x.r.width / 2 <= stage.x + stage.width + 1);
  ok(inside.length === spots.length, `Marker außerhalb der Bühne: ${spots.filter((x) => !inside.includes(x)).map((x) => x.id).join(', ')}`);
  ok((await p.$$eval('.pub-who button', (e) => e.length)) === spots.length, 'Liste und Marker passen nicht zusammen');
  ok(await p.evaluate(() => __sl.renderer.info.render.calls < 61), 'Draw Calls über dem Hallen-Budget');
  await layout('Stammtisch');
  if (shots) await p.screenshot({ path: `${shots}/kneipe-${size}.png` });
  ok(!!(await p.$('[data-action="pubTactic"]')), 'Opa Heinz: Taktik fehlt');
  await click(p, '.pub-who [data-value="wirt"]');
  await p.waitForTimeout(300);
  ok(!!(await p.$('[data-action="pubRound"]')) && !!(await p.$('[data-action="pubWirt"]')), 'Wirt: Runde/Neuigkeiten fehlen');
  await click(p, '.pub-who [data-value="dart"]');
  await p.waitForTimeout(300);
  ok(!!(await p.$('[data-action="dartStart"]')), 'Dartscheibe: Duell fehlt');
  const player = spots.find((x) => x.id.startsWith('p'));
  await click(p, `[data-pub-stage] [data-actor="${player.id}"]`);
  await p.waitForTimeout(300);
  ok(!!(await p.$('[data-action="pubTalk"]')), 'Spieler: Gespräch fehlt');
  ok((await p.$eval('select[data-pub-pick]', (e) => e.value)) === player.id.slice(1), 'Spieler: falsche Person im Gespräch');
  await layout('Gespräch');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}
