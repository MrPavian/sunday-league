// Oberfläche in vier Größen: jeder Bereich/Tab des Vereinsheims öffnet ohne Fehler, ohne seitliches
// Scrollen, auf Touch ohne Schaltflächen unter 44 px; dazu die wichtigsten Interaktionen und eine
// Karriere-Runde per Liveticker bis zur nächsten Woche.
import { checker, click, hScroll, launch, newCareer, page, settle, SIZES, smallTargets, visible } from './lib.mjs';

const TABS = [['home'], ['team', 'squad'], ['team', 'lineup'], ['team', 'tactic'], ['team', 'training'], ['team', 'youth'], ['team', 'transfers'], ['season', 'table'], ['season', 'fixtures'], ['season', 'cup'], ['club', 'cash'], ['club', 'club'], ['club', 'museum'], ['pub'], ['phone', 'chat']];
// Bewusst schmal: Tageskästchen im Kalender (große Spieltag-Knöpfe darunter sind die Alternative).
const NARROW_OK = ['.cal-day'];

async function screens(b, size) {
  const ok = checker(`Vereinsheim-Bildschirme (${size})`);
  const p = await page(b, size);
  await newCareer(p);
  for (const [area, tab] of TABS) {
    await click(p, `[data-action="area"][data-value="${area}"]`);
    if (tab) await p.evaluate((t) => document.querySelector(`[data-action="tab"][data-value="${t}"]`)?.click(), tab);
    await p.waitForTimeout(250);
    await settle(p);
    const label = tab ?? area;
    ok(!(await hScroll(p)), `${label}: seitliches Scrollen`);
    if (SIZES[size].touch) {
      const small = await smallTargets(p, '#club button', NARROW_OK);
      ok(!small.length, `${label}: Schaltflächen < 44 px: ${small.slice(0, 3).join(', ')}`);
    }
  }
  // Interaktionen: Karte umdrehen, Tausch in der Aufstellung, Trainerkarte, Handy öffnen, Notizbuch.
  await click(p, '[data-action="area"][data-value="team"]');
  await click(p, '[data-action="tab"][data-value="squad"]');
  await p.waitForTimeout(200);
  const id = await p.$eval('.squad-deck .m-card', (e) => e.dataset.card);
  await click(p, `.squad-deck [data-flip="${id}"]`);
  ok(await p.$eval(`.squad-deck .m-card[data-card="${id}"]`, (e) => e.classList.contains('flipped')), 'Spielerkarte dreht sich nicht');
  await click(p, '[data-action="tab"][data-value="lineup"]');
  await p.waitForTimeout(200);
  const names = () => p.$$eval('.lp-token .lp-name', (e) => e.map((x) => x.textContent));
  const before = await names();
  await click(p, '.lp-token[data-value="1"]');
  await click(p, '.lp-token[data-value="2"]');
  const after = await names();
  ok(before[1] === after[2] && before[2] === after[1], 'Aufstellung: Tausch per Antippen wirkt nicht');
  await click(p, '[data-action="tab"][data-value="tactic"]');
  await p.waitForTimeout(200);
  await click(p, '.m-tcard[data-value="pressing"]');
  ok(await p.$eval('.m-tcard[data-value="pressing"]', (e) => e.classList.contains('active')), 'Trainerkarte wird nicht aktiv');
  await click(p, '[data-action="area"][data-value="phone"]');
  await p.waitForTimeout(200);
  if (await p.$('[data-action="phone-open"]')) await click(p, '[data-action="phone-open"]');
  ok(!!(await p.$('.phone-stage.open .wa-body')), 'Handy-Chat öffnet nicht');
  await click(p, '.club-tools [data-action="onSettings"]');
  await p.waitForTimeout(300);
  ok(await visible(p, 'settings'), 'Einstellungen öffnen nicht');
  await click(p, '.nb-tabs [data-value="tasten"]');
  ok(!!(await p.$('.nb-page .keys')), 'Notizbuch: Seite Steuerung fehlt');
  await click(p, '.settings-panel [data-action="back"]');
  await p.waitForTimeout(300);
  ok(await visible(p, 'club'), 'Zurück aus den Einstellungen führt nicht ins Vereinsheim');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

async function tickerRound(b) {
  const ok = checker('Karriere-Runde per Liveticker bis zur nächsten Woche');
  const p = await page(b, 'land');
  await newCareer(p);
  await click(p, '[data-action="area"][data-value="home"]');
  await click(p, '[data-action="onSimulate"]');
  await p.waitForTimeout(1500);
  ok(await visible(p, 'ticker'), 'Liveticker öffnet nicht');
  for (let i = 0; i < 300 && (await visible(p, 'ticker')); i++) {
    await p.evaluate(() => document.querySelector('#ticker .decision button, #ticker [data-action="done"], #ticker [data-action="skip"]')?.click());
    await p.waitForTimeout(300);
  }
  const clip = await p.waitForSelector('.results-clip', { timeout: 20000 }).catch(() => null);
  ok(!!clip, 'Ergebnisse im Vereinsheim fehlen');
  await click(p, '[data-action="onNextWeek"]');
  await p.waitForTimeout(1200);
  ok(!!(await p.$('[data-action="onCoach"]')), 'Nächste Woche ohne Anpfiff-Knopf');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

export async function run({ sizes = Object.keys(SIZES) } = {}) {
  const b = await launch();
  let fails = 0;
  for (const s of sizes) fails += await screens(b, s);
  fails += await tickerRound(b);
  await b.close();
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await run();
