// Oberfläche: Wappen-Editor (Gründungsversammlung und Reiter „Verein“). Reiter Form / Muster / Farben / Symbol / Band & Jahr,
// Live-Vorschau ändert sich, Gründungsjahr einstellbar und gespeichert; kein seitliches Scrollen, auf Touch keine Schaltflächen unter 44 px.
import { createCareer } from '../../../src/career/career.js';
import { checker, click, hScroll, page, settle, SIZES, smallTargets } from '../lib.mjs';

const TABS = ['form', 'muster', 'farben', 'symbol', 'band'];

export async function crestEditor(b, size, shots) {
  const ok = checker(`Wappen-Editor (${size})`);
  const shot = (p, name) => shots && p.screenshot({ path: `${shots}/${name}-${size}.png` });
  const preview = (p) => p.$eval('[data-testid="crest-preview"]', (e) => e.innerHTML.replace(/cr\d+/g, 'cr#'));
  const layout = async (p, label) => {
    await settle(p);
    ok(!(await hScroll(p)), `${label}: seitliches Scrollen`);
    ok(await p.evaluate(() => { const t = document.querySelector('[data-testid="crest-editor"]'); return !t || t.scrollWidth <= t.clientWidth + 1; }), `${label}: Editor läuft über den Rand`);
    if (SIZES[size].touch) {
      const s = await smallTargets(p, '#club .crest-editor button, #club .crest-editor input', []);
      ok(!s.length, `${label}: Schaltflächen < 44 px: ${s.slice(0, 3).join(', ')}`);
    }
  };
  // Alle Reiter durchgehen: Inhalt vorhanden, Layout in Ordnung.
  const walk = async (p, label) => {
    for (const t of TABS) {
      await click(p, `[data-action="crestTab"][data-value="${t}"]`);
      await p.waitForTimeout(150);
      ok((await p.$eval('.crest-panel', (e) => e.dataset.tab)) === t, `${label}: Reiter ${t} öffnet nicht`);
      ok((await p.$$eval('.crest-panel button, .crest-panel input', (e) => e.length)) > 1, `${label}: Reiter ${t} ist leer`);
      await layout(p, `${label} ${t}`);
    }
  };

  // 1) Reiter „Verein“ einer laufenden Karriere.
  const c = createCareer({ seed: 5 });
  const p = await page(b, size, { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(c) } });
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  await click(p, '[data-action="area"][data-value="club"]');
  await p.evaluate(() => document.querySelector('[data-action="tab"][data-value="club"]')?.click());
  await p.waitForTimeout(400);
  ok(!!(await p.$('[data-testid="crest-editor"]')), 'Wappen-Editor fehlt im Reiter Verein');
  await p.evaluate(() => document.querySelector('[data-testid="crest-editor"]')?.scrollIntoView({ block: 'start' }));
  await walk(p, 'Verein');
  // Muster wählen: Vorschau ändert sich; dreifarbig braucht dritte Farbe.
  const before = await preview(p);
  await click(p, '[data-action="crestTab"][data-value="muster"]');
  await click(p, '[data-action="crestDivision"][data-value="trikv"]');
  await p.waitForTimeout(150);
  const afterPattern = await preview(p);
  ok(afterPattern !== before, 'Muster ändert die Vorschau nicht');
  await shot(p, 'crest-muster');
  await click(p, '[data-action="crestOverlay"][data-value="ring2"]');
  ok((await preview(p)) !== afterPattern, 'Ring ändert die Vorschau nicht');
  // Farbe der dritten Farbe
  await click(p, '[data-action="crestTab"][data-value="farben"]');
  await click(p, '[data-action="crestSlot"][data-value="third"]');
  const beforeColor = await preview(p);
  await p.evaluate(() => document.querySelectorAll('[data-action="crestColor"]')[2].click());
  ok((await preview(p)) !== beforeColor, 'dritte Farbe ändert die Vorschau nicht');
  await shot(p, 'crest-farben');
  // Symbol
  await click(p, '[data-action="crestTab"][data-value="symbol"]');
  const beforeSym = await preview(p);
  const nSym = await p.$$eval('[data-action="crestSymbol"]', (e) => e.length);
  ok(nSym >= 75, `nur ${nSym} Symbole`);
  await click(p, '[data-action="crestSymbol"][data-value="leuchtturm"]');
  ok((await preview(p)) !== beforeSym, 'Symbol ändert die Vorschau nicht');
  await shot(p, 'crest-symbol');
  // Form
  await click(p, '[data-action="crestTab"][data-value="form"]');
  const beforeShape = await preview(p);
  await click(p, '[data-action="crestShape"][data-value="zinnen"]');
  ok((await preview(p)) !== beforeShape, 'Form ändert die Vorschau nicht');
  await shot(p, 'crest-form');
  // Band & Jahr: Schritte, Tippen, Grenzen, Vorschau zeigt das Jahr im Band
  await click(p, '[data-action="crestTab"][data-value="band"]');
  await click(p, '[data-action="crestBandText"][data-value="year"]');
  const year = () => p.$eval('[data-crest-year]', (e) => Number(e.value));
  ok((await year()) === 2004, `Jahr startet nicht bei 2004: ${await year()}`);
  await click(p, '[data-action="crestYearStep"][data-value="-10"]');
  ok((await year()) === 1994, `−10: ${await year()}`);
  await click(p, '[data-action="crestYearStep"][data-value="1"]');
  ok((await year()) === 1995, `+1: ${await year()}`);
  await p.fill('[data-crest-year]', '1950');
  await p.dispatchEvent('[data-crest-year]', 'change');
  await p.waitForTimeout(150);
  ok((await year()) === 1950, `getipptes Jahr: ${await year()}`);
  ok((await preview(p)).includes('>1950</text>'), 'Vorschau zeigt 1950 nicht im Band');
  await p.fill('[data-crest-year]', '1500');
  await p.dispatchEvent('[data-crest-year]', 'change');
  ok((await year()) === 1880, `Untergrenze: ${await year()}`);
  await p.fill('[data-crest-year]', '2099');
  await p.dispatchEvent('[data-crest-year]', 'change');
  ok((await year()) === 2026, `Obergrenze (Spieljahr): ${await year()}`);
  await p.fill('[data-crest-year]', '1950');
  await p.dispatchEvent('[data-crest-year]', 'change');
  await shot(p, 'crest-band');
  await layout(p, 'Verein Band & Jahr');
  await click(p, '[data-action="crestSave"]');
  await p.waitForTimeout(600);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('sunday-league:career')));
  const me = saved.clubs.find((x) => x.human);
  ok(saved.founded === 1950, `Gründungsjahr nicht gespeichert: ${saved.founded}`);
  ok(me.crest?.division === 'trikv' && me.crest.symbol === 'leuchtturm' && me.crest.shape === 'zinnen' && me.crest.overlay === 'ring2' && typeof me.crest.colors.third === 'number', `Wappen nicht gespeichert: ${JSON.stringify(me.crest)}`);
  ok(p.errors.length === 0, `Seitenfehler: ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();

  // 2) Gründungsversammlung: Jahr und Muster vor dem Start.
  const f = createCareer({ seed: 7 });
  f.founding = true;
  const q = await page(b, size, { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(f) } });
  await click(q, '.career [data-c="continue"]');
  await q.waitForTimeout(1500);
  ok(!!(await q.$('[data-action="foundClub"]')), 'Gründungsversammlung fehlt');
  await q.evaluate(() => document.querySelector('[data-testid="crest-editor"]')?.scrollIntoView({ block: 'start' }));
  await walk(q, 'Gründung');
  await click(q, '[data-action="crestTab"][data-value="muster"]');
  await click(q, '[data-action="crestDivision"][data-value="diag3"]');
  await shot(q, 'crest-gruendung');
  await click(q, '[data-action="crestTab"][data-value="band"]');
  await q.fill('[data-crest-year]', '1911');
  await q.dispatchEvent('[data-crest-year]', 'change');
  await click(q, '[data-action="foundClub"]');
  await q.waitForTimeout(800);
  const s2 = await q.evaluate(() => JSON.parse(localStorage.getItem('sunday-league:career')));
  ok(s2.founded === 1911 && !s2.founding, `Gründung: Jahr ${s2.founded}, founding ${s2.founding}`);
  ok(s2.clubs.find((x) => x.human).crest?.division === 'diag3', 'Gründung: Muster nicht gespeichert');
  ok(q.errors.length === 0, `Seitenfehler: ${q.errors.slice(0, 2).join(' | ')}`);
  await q.context().close();
  return ok.done();
}
