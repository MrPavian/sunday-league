// Oberfläche: Vereinsfest und Sommerturnier.
import { BASE, checker, click, hScroll, launch, newCareer, page, settle, SIZES, smallTargets, visible } from '../lib.mjs';
import { NARROW_OK } from './core.mjs';

export async function festivalAndSummer(b, size, shots) {
  const ok = checker(`Vereinsfest und Sommerturnier (${size})`);
  const p = await page(b, size);
  await newCareer(p);
  const shot = async (name) => shots && (await p.screenshot({ path: `${shots}/${name}-${size}.png` }));
  const small = async (label) => {
    if (SIZES[size].touch) {
      const s = await smallTargets(p, '#club button', NARROW_OK);
      ok(!s.length, `${label}: Schaltflächen < 44 px: ${s.slice(0, 3).join(', ')}`);
    }
    ok(!(await hScroll(p)), `${label}: seitliches Scrollen`);
  };
  // Einladung vor dem ersten Spieltag (nicht blockierend: Anpfiff bleibt da).
  ok(!!(await p.$('[data-testid="summer-invite"]')), 'Startseite: keine Einladung zum Sommerturnier');
  ok(!!(await p.$('[data-action="onCoach"]')), 'Startseite: Anpfiff fehlt neben der Einladung');
  await small('Startseite mit Einladung');
  await p.evaluate(() => document.querySelector('[data-testid="summer-invite"]').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  await shot('sommer-einladung');
  await click(p, '[data-action="onSummerStart"][data-value="invite"]');
  await p.waitForTimeout(800);
  await settle(p);
  ok(!!(await p.$('[data-testid="cup-sommer"]')), 'Turnierseite zeigt das Sommerturnier nicht');
  ok(!!(await p.$('.cup-groups table')), 'Turnierseite: keine Gruppentabelle');
  ok(!!(await p.$('[data-action="onCupCoach"][data-value="sommer"]')), 'Turnierseite: kein Knopf für das eigene Spiel');
  await small('Sommerturnier');
  await shot('sommer-turnier');
  // Abbrechen führt zurück zur Startseite ohne Einladung.
  await click(p, '[data-action="area"][data-value="home"]');
  await p.waitForTimeout(300);
  ok(await p.$eval('.hub-actions', (e) => /Sommerturnier/.test(e.textContent)), 'Startseite: Hinweis auf das laufende Turnier fehlt');
  await click(p, '[data-action="onCupSkip"][data-value="sommer"]');
  await p.waitForTimeout(800);
  ok(!(await p.$('[data-testid="summer-invite"]')) && !!(await p.$('[data-action="onCoach"]')), 'Nach dem Abbrechen: Einladung weg, Anpfiff da');
  // Planungsblatt im Verein.
  await click(p, '[data-action="area"][data-value="club"]');
  await p.evaluate(() => document.querySelector('[data-action="tab"][data-value="club"]')?.click());
  await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('[data-action="clubSub"][data-value="leben"]')?.click()); // Unterseite (club.js CLUB_SUBS)
  await p.waitForTimeout(400);
  ok(!!(await p.$('[data-testid="fest-plan"]')), 'Verein: kein Planungsblatt fürs Vereinsfest');
  await click(p, '.fest-part[data-value="grill"]');
  await click(p, '.fest-part[data-value="huepfburg"]');
  await p.waitForTimeout(200);
  ok((await p.$$eval('.fest-part.on', (e) => e.length)) === 2, 'Vereinsfest: Bausteine lassen sich nicht wählen');
  ok(/Kosten/.test(await p.textContent('.fest-sum')), 'Vereinsfest: Zusammenfassung fehlt');
  await p.evaluate(() => document.querySelector('[data-testid="fest-plan"]').scrollIntoView());
  await small('Vereinsfest planen');
  await shot('vereinsfest-plan');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// Platz und Anlage (ROADMAP 11.9): ein Verein auf dem Rasenplatz mit abgespieltem Platz. Die Seite „Verein" zeigt Zustand,
// Pflegeknöpfe, Pachtvertrag und die Ausbauten in Gruppen; Pflegen wirkt, Bauen und Vormerken funktionieren.
