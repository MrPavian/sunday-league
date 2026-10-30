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
  // Sichtbare Marker liegen in der Bühne; hochkant (gezoomt) sind die außerhalb des Ausschnitts ausgeblendet, quer alle sichtbar.
  const shown = spots.filter((x) => !x.hidden);
  const out = shown.filter((x) => x.r.x + x.r.width / 2 < stage.x - 5 || x.r.x + x.r.width / 2 > stage.x + stage.width + 5);
  ok(!out.length, `Marker außerhalb der Bühne: ${out.map((x) => x.id).join(', ')}`);
  ok(shown.length >= (stage.width / stage.height < 1.6 ? 2 : spots.length), `zu wenige sichtbare Marker: ${shown.length}`);
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
  await click(p, `.pub-who [data-value="${player.id}"]`); // über die Liste: hochkant ist er vielleicht nicht im Ausschnitt
  await p.waitForTimeout(300);
  ok(!!(await p.$('[data-action="pubTalk"]')), 'Spieler: Gespräch fehlt');
  ok((await p.$eval('select[data-pub-pick]', (e) => e.value)) === player.id.slice(1), 'Spieler: falsche Person im Gespräch');
  await layout('Gespräch');
  // Hochkant: Wischen schwenkt den Raum und wählt dabei niemanden aus.
  if (stage.width / stage.height < 1.6) {
    const before = await p.$$eval('[data-pub-stage] .pub-spot', (e) => e.filter((x) => !x.hidden).map((x) => x.dataset.actor).join());
    // Der Gesprächspartner sitzt eher rechts – nach rechts wischen schwenkt zur Theke (links).
    await p.mouse.move(stage.x + stage.width * 0.15, stage.y + stage.height * 0.85);
    await p.mouse.down();
    for (let i = 1; i <= 10; i++) await p.mouse.move(stage.x + stage.width * 0.15 + i * 25, stage.y + stage.height * 0.85);
    await p.mouse.up();
    await p.waitForTimeout(500);
    const after = await p.$$eval('[data-pub-stage] .pub-spot', (e) => e.filter((x) => !x.hidden).map((x) => x.dataset.actor).join());
    ok(before !== after, 'Wischen schwenkt nicht');
    ok((await p.$eval('select[data-pub-pick]', (e) => e.value)) === player.id.slice(1), 'Wischen hat jemanden ausgewählt');
  }
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}
