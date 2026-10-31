// Oberfläche: Hauptmenü, alle Bereiche/Tabs des Vereinsheims, „Was ist neu“, erster Start, Liveticker-Runde.
import { CHANGELOG, NEWEST_ID } from '../../../src/data/changelog.js';
import { BASE, checker, click, hScroll, launch, newCareer, page, settle, SIZES, smallTargets, visible } from '../lib.mjs';

const TABS = [['home'], ['team', 'squad'], ['team', 'lineup'], ['team', 'tactic'], ['team', 'training'], ['team', 'youth'], ['team', 'youth', 'youthTab:teams'], ['team', 'transfers'], ['season', 'table'], ['season', 'fixtures'], ['season', 'cup'], ['club', 'cash'], ['club', 'club', 'clubSub:me'], ['club', 'club', 'clubSub:anlage'], ['club', 'club', 'clubSub:leben'], ['club', 'club', 'clubSub:trikot'], ['club', 'club', 'clubSub:wappen'], ['club', 'museum'], ['pub'], ['phone', 'chat']];
// Bewusst schmal: Tageskästchen im Kalender (große Spieltag-Knöpfe darunter sind die Alternative).
export const NARROW_OK = ['.cal-day'];

export async function screens(b, size) {
  const ok = checker(`Vereinsheim-Bildschirme (${size})`);
  const p = await page(b, size);
  await newCareer(p);
  for (const [area, tab, sub] of TABS) {
    await click(p, `[data-action="area"][data-value="${area}"]`);
    if (tab) await p.evaluate((t) => document.querySelector(`[data-action="tab"][data-value="${t}"]`)?.click(), tab);
    if (sub) {
      await p.waitForTimeout(150);
      const [act, val] = sub.split(':');
      await click(p, `[data-action="${act}"][data-value="${val}"]`); // Unterseiten (Verein, Jugend)
    }
    await p.waitForTimeout(250);
    await settle(p);
    const label = sub ? `${tab}/${sub.split(':')[1]}` : tab ?? area;
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
  // Reines Managerspiel: keine Seite „Steuerung", kein Spielmodus, keine Schwierigkeit/Auto-Wechsel.
  ok((await p.$$eval('.nb-tabs [data-value]', (e) => e.map((x) => x.dataset.value))).join() === 'spiel,ton,grafik,neu', 'Notizbuch: Seiten sind nicht Spiel, Ton, Grafik, Was ist neu');
  ok(!(await p.$('.nb-page .keys')) && !(await p.$('[data-action="mode"], [data-action="difficulty"], [data-action="autoswitch"], [data-action="bind"]')), 'Einstellungen zeigen noch Selbstspiel-Optionen');
  await click(p, '.settings-panel [data-action="back"]');
  await p.waitForTimeout(300);
  ok(await visible(p, 'club'), 'Zurück aus den Einstellungen führt nicht ins Vereinsheim');
  // Tür oben rechts: zurück ins Hauptmenü (war nach dem Umbau von main.js ohne Wirkung)
  await click(p, '.club-tools [data-action="onMenu"]');
  await p.waitForTimeout(300);
  ok((await visible(p, 'menu')) && !(await visible(p, 'club')), 'Tür-Knopf führt nicht ins Hauptmenü');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// Hauptmenü des Managerspiels: nur Karriere, Spielstände, Einstellungen – keine Platzwahl, keine Challenges,
// kein Spielerpool, kein Spielmodus-Schalter; ohne seitliches Scrollen, auf Touch ohne zu kleine Knöpfe.
export async function mainMenu(b, size) {
  const ok = checker(`Hauptmenü nur Karriere (${size})`);
  const p = await page(b, size);
  ok(await visible(p, 'menu'), 'Hauptmenü fehlt');
  ok(!(await p.$('.venue-card, .style-toggle, .challenges-link, .venues')), 'Hauptmenü zeigt noch Platzwahl, Spielmodus oder Challenges');
  const links = await p.$$eval('#menu button', (e) => e.map((x) => x.textContent.trim()));
  ok(links.length === 3 && /Karriere starten/.test(links[0]) && links.includes('Spielstände') && links.includes('Einstellungen'), `Hauptmenü-Knöpfe: ${links.join(' | ')}`);
  ok(!/Challenge|Spielerpool|Freundschaft|Spielmodus/.test(await p.textContent('#menu')), 'Hauptmenü-Text nennt entfernte Funktionen');
  ok(!(await hScroll(p)), 'Hauptmenü: seitliches Scrollen');
  if (SIZES[size].touch) {
    const small = await smallTargets(p, '#menu button');
    ok(!small.length, `Hauptmenü: Schaltflächen < 44 px: ${small.slice(0, 3).join(', ')}`);
  }
  // Hotkeys: O Einstellungen, L Spielstände (alte Hotkeys C/P/T tun nichts mehr).
  for (const k of ['KeyC', 'KeyP', 'KeyT']) await p.keyboard.press(k);
  await p.waitForTimeout(300);
  ok((await visible(p, 'menu')) && !(await p.evaluate(() => ['settings', 'saves', 'creator', 'club'].some((i) => !document.getElementById(i).hidden))), 'C/P/T öffnen noch etwas');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// „Was ist neu": Fenster einmal nach einem Update (alte gemerkte Version), nicht für neue Spieler, nicht nach
// dem Neuladen; die Einstellungen führen alle Einträge in beiden Sprachen auf.
export async function whatsNew(b, size, shots) {
  const ok = checker(`Was ist neu (${size})`);
  const KEY = 'sunday-league:seenChangelog';
  const sheetOpen = (p) => p.evaluate(() => !!document.querySelector('#whatsnew-sheet.open') && !document.getElementById('whatsnew-sheet').hidden);
  // Alter Stand: Fenster erscheint mit der neuesten Lieferung, merkt sich die Version, kommt nach Neuladen nicht wieder.
  let p = await page(b, size, { store: { [KEY]: '2026-09-25' } });
  ok(await sheetOpen(p), 'Fenster erscheint bei alter Version nicht');
  ok((await p.textContent('#whatsnew-sheet')).includes(CHANGELOG[0].de.title), 'Fenster zeigt die neueste Lieferung nicht');
  ok(!(await hScroll(p)), 'Fenster: seitliches Scrollen');
  if (SIZES[size].touch) ok(!(await smallTargets(p, '#whatsnew-sheet button')).length, 'Fenster: Schaltflächen < 44 px');
  if (shots) await p.screenshot({ path: `${shots}/popup-${size}.png` });
  ok((await p.evaluate((k) => localStorage.getItem(k), KEY)) === NEWEST_ID, 'Version wird nicht gemerkt');
  await p.reload();
  await p.waitForTimeout(1500);
  ok(!(await sheetOpen(p)), 'Fenster erscheint nach dem Neuladen noch einmal');
  // „Alle Änderungen" öffnet die Liste in den Einstellungen.
  await p.evaluate((k) => localStorage.setItem(k, '2026-09-25'), KEY);
  await p.reload();
  await p.waitForTimeout(1500);
  await click(p, '#whatsnew-sheet [data-action="wn-all"]');
  await p.waitForTimeout(600);
  ok((await visible(p, 'settings')) && (await p.$('.nb-page .wn-entry')) !== null, '„Alle Änderungen" öffnet die Liste nicht');
  await p.context().close();
  // Erststart (leerer Speicher, Sprachwahl): kein Fenster, Version wird still gemerkt.
  p = await browserFirstRun(b, size);
  ok(!(await sheetOpen(p)), 'Erststart: Fenster erscheint');
  ok((await p.evaluate((k) => localStorage.getItem(k), KEY)) === NEWEST_ID, 'Erststart: Version nicht still gemerkt');
  await p.context().close();
  // Einstellungen: Liste mit allen Einträgen, Deutsch und Englisch.
  for (const lang of ['de', 'en']) {
    p = await page(b, size, { query: `?notitle&lang=${lang}` });
    await click(p, '#menu .settings-link');
    await p.waitForTimeout(400);
    await click(p, '.nb-tabs [data-value="neu"]');
    await p.waitForTimeout(300);
    ok((await p.$$('.nb-page .wn-entry')).length === CHANGELOG.length, `${lang}: Liste zeigt nicht alle ${CHANGELOG.length} Einträge`);
    const text = await p.textContent('.nb-page');
    ok(text.includes(lang === 'de' ? CHANGELOG[0].de.title : CHANGELOG[0].en.title) && text.includes(lang === 'de' ? CHANGELOG.at(-1).de.title : CHANGELOG.at(-1).en.title), `${lang}: Titel fehlen`);
    ok((await p.textContent('.nb-tabs')).includes(lang === 'de' ? 'Was ist neu' : 'What’s new'), `${lang}: Reiter falsch beschriftet`);
    ok(!(await hScroll(p)), `${lang}: Liste: seitliches Scrollen`);
    if (SIZES[size].touch) ok(!(await smallTargets(p, '.settings-panel button')).length, `${lang}: Einstellungen: Schaltflächen < 44 px`);
    if (shots) await p.screenshot({ path: `${shots}/list-${lang}-${size}.png` });
    ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
    await p.context().close();
  }
  return ok.done();
}

// Erststart: leerer Speicher, keine Sprachwahl; nach der Wahl lädt das Spiel neu.
export async function browserFirstRun(b, size) {
  const s = SIZES[size];
  const ctx = await b.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: s.touch, isMobile: s.touch });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await p.goto(`${BASE}/?notitle`);
  await p.waitForTimeout(1500);
  await p.click('.first-run [data-value="de"]');
  await p.waitForTimeout(2500);
  return p;
}

export async function tickerRound(b) {
  const ok = checker('Karriere-Runde per Liveticker bis zur nächsten Woche, Systemwechsel im Ticker');
  const p = await page(b, 'land');
  await newCareer(p);
  await click(p, '[data-action="area"][data-value="home"]');
  await click(p, '[data-action="onSimulate"]');
  await p.waitForTimeout(1500);
  ok(await visible(p, 'ticker'), 'Liveticker öffnet nicht');
  // Systemwechsel im Ticker (plan.js setSystem): anderes System wählen – Kopfzeile und Kommentar zeigen es.
  for (let i = 0; i < 40 && !(await p.$('#ticker [data-action="system"]')); i++) {
    await p.evaluate(() => document.querySelector('#ticker .decision button')?.click()); // offene Entscheidung zuerst beantworten
    await p.waitForTimeout(250);
  }
  const sys = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('#ticker [data-action="system"]')].find((x) => !x.classList.contains('active'));
    if (!btn) return null;
    const label = btn.textContent.trim();
    btn.click();
    return { label, plans: document.querySelector('#ticker .plans')?.textContent ?? '', line: [...document.querySelectorAll('#ticker .lines li')].some((li) => li.textContent.includes(label)), active: document.querySelector('#ticker [data-action="system"].active')?.textContent.trim() };
  });
  ok(sys && sys.plans.includes(sys.label) && sys.line && sys.active === sys.label, `Liveticker: Systemwechsel wirkt nicht (${JSON.stringify(sys)})`);
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


// Vereinsfest und Sommerturnier: Einladung auf der Startseite, Turnierseite, Planungsblatt im Verein; bedienbar mit dem Daumen.
