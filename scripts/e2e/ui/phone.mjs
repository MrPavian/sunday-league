// Oberfläche: Handy-Karte schließen, Kreisblatt-Bild teilen.
import { BASE, checker, click, hScroll, launch, newCareer, page, settle, SIZES, smallTargets, visible } from '../lib.mjs';
import { NARROW_OK } from './core.mjs';

export async function reloadPatched(p, patch, extraInit = null) {
  await p.addInitScript((src) => {
    if (sessionStorage.getItem('patched')) return;
    sessionStorage.setItem('patched', '1');
    const k = 'sunday-league:career';
    const c = JSON.parse(localStorage.getItem(k));
    new Function('c', src)(c);
    localStorage.setItem(k, JSON.stringify(c));
  }, patch);
  if (extraInit) await p.addInitScript(extraInit);
  await p.goto(`${BASE}/?notitle`);
  await p.waitForTimeout(1500);
  await p.click('.career button');
  await p.waitForTimeout(1500);
}

// Fehler „Einblendung lässt sich nicht per X schließen": Die entschiedene Vereinskarte im Handy scrollt in ihrem
// Kasten – das „×" muss dabei erreichbar bleiben. Danach Saisonende: „Als Bild teilen" tut etwas.
export async function phoneAndShare(b, size) {
  const ok = checker(`Handy-Karte schließen, Kreisblatt-Bild (${size})`);
  const p = await page(b, size);
  await newCareer(p);
  await reloadPatched(p, "c.week.event = { id: 'vereinsheim', ctx: {}, text: 'Freitagabend im Vereinsheim?', options: ['Freibier', 'Nein'], choice: null, result: null, story: null };");
  await click(p, '[data-action="area"][data-value="phone"]');
  await p.waitForTimeout(300);
  if (await p.$('[data-action="phone-open"]')) await click(p, '[data-action="phone-open"]');
  await p.waitForTimeout(600);
  await click(p, '.event-card [data-action="event"]');
  await p.waitForTimeout(400);
  await p.evaluate(() => (document.querySelector('.event-card .reply').textContent += ' Legendärer Abend.'.repeat(14)));
  await p.evaluate(() => { const e = document.querySelector('.wa-pinned'); e.scrollTop = e.scrollHeight; });
  await p.waitForTimeout(200);
  const X = '.event-card [data-action="eventFold"][data-value="hidden"]';
  const hit = await p.evaluate((sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    return !!r && !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest(sel);
  }, X);
  ok(hit, '„×" der Vereinskarte ist nach dem Scrollen nicht mehr erreichbar');
  if (process.env.E2E_SHOTS) await p.screenshot({ path: `${process.env.E2E_SHOTS}/phonekarte-${size}.png` });
  await click(p, X);
  await p.waitForTimeout(300);
  ok(!(await p.$('.event-card')), 'Vereinskarte schließt nicht per „×"');
  await p.context().close();

  // Saisonende: Bild teilen (Handy mit Web Share) bzw. herunterladen (PC).
  const q = await page(b, size);
  await newCareer(q);
  const touch = SIZES[size].touch;
  await reloadPatched(q, 'c.round = c.fixtures.length; c.week = null;', () => {
    window.__shared = [];
    if (matchMedia('(pointer: coarse)').matches) {
      navigator.canShare = () => true;
      navigator.share = async (d) => { window.__shared.push(d.files.map((f) => `${f.name}:${f.type}:${f.size}`)); };
    }
  });
  ok(!!(await q.$('[data-action="reviewshare"]')), 'Saisonende: Knopf „Als Bild teilen" fehlt');
  const dl = q.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await click(q, '[data-action="reviewshare"]');
  if (touch) {
    await q.waitForTimeout(800);
    const shared = await q.evaluate(() => window.__shared);
    ok(shared.length === 1 && /^kreisblatt-\d+\.png:image\/png:\d{4,}$/.test(shared[0][0]), `Bild teilen: Web Share bekam keine PNG-Datei (${JSON.stringify(shared)})`);
  } else {
    const d = await dl;
    ok(!!d && /^kreisblatt-\d+\.png$/.test(d.suggestedFilename()), 'Bild exportieren: kein PNG-Download');
  }
  ok(!q.errors.length, `Seitenfehler: ${q.errors.join(' | ')}`);
  await q.context().close();
  return ok.done();
}
