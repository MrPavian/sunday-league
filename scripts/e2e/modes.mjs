// Alle Modi und Varianten einmal durchspielen: Startbild, Freundschaftsspiel (selbst spielen),
// jede Qualitätsstufe, jedes Wetter, jede Tageszeit, jeder Vorfall, Elfmeterschießen, Challenge,
// Spielerpool, Spielstände, Englisch und ein alter Spielstand (fixtures/save-858e978.json: mit dem
// Stand vor dem Lean-Audit erzeugt, Spieltag 5; andere Datei per E2E_OLD_SAVE).
// Geprüft wird: keine Seitenfehler, Bildschleife läuft, Spiel erreicht den Abpfiff.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checker, click, launch, page, visible } from './lib.mjs';

const QUALITIES = ['PC_LOW', 'PC_MEDIUM', 'PC_HIGH', 'PC_ULTRA', 'ANDROID_LOW', 'ANDROID_MEDIUM', 'ANDROID_HIGH'];
const WEATHER = ['sonne', 'hitze', 'regen', 'wind', 'nebel', 'frost', 'schnee', 'laub'];
const TIMES = ['morgen', 'mittag', 'nachmittag', 'abend'];
// Jeder Vorfall auf einem Platz, auf dem er auch im Spiel vorkommt (VENUE_INCIDENTS); Zaun und
// Autoalarm brauchen ein auslösendes Ereignis (Ball fliegt drüber, Auto fährt vorbei).
// Seed je Vorfall fest: Der Autoalarm geht nur mit 60 % je Autotreffer los – mit Seed 13 trifft der
// Ball früh ein Auto und der Alarm kommt (alter wie neuer Code, bei 18 s).
const INCIDENTS = { hund: 'park', zaun: 'hinterhof', autoalarm: 'parkplatz', polizei: 'hinterhof', gewitter: 'park', sprenger: 'rasenplatz', ersatzschiri: 'rasenplatz' };
const INCIDENT_SEED = { autoalarm: 13 };
const TABS = [['home'], ['team', 'squad'], ['team', 'lineup'], ['team', 'tactic'], ['team', 'training'], ['team', 'youth'], ['team', 'transfers'], ['season', 'table'], ['season', 'fixtures'], ['season', 'cup'], ['club', 'cash'], ['club', 'club'], ['club', 'museum'], ['pub'], ['phone', 'chat']];

const frame = (p) => p.evaluate(() => globalThis.__sl?.diag?.frame ?? -1);
async function running(p) {
  const a = await frame(p);
  await p.waitForTimeout(800);
  return (await frame(p)) > a;
}
// Bis zum Abpfiff; Halbzeit im Trainermodus verlassen.
async function toEnd(p, maxSec = 150) {
  for (let i = 0; i < maxSec; i++) {
    if (await p.evaluate(() => globalThis.__sl?.match?.phase === 'ended')) return true;
    await p.evaluate(() => document.querySelector('.half-panel [data-action="go"]')?.click());
    await p.waitForTimeout(1000);
  }
  return false;
}

async function variants(b, label, list, query) {
  const ok = checker(label);
  for (const v of list) {
    const p = await page(b, 'land', { query: query(v) });
    await p.waitForTimeout(1500);
    ok(await running(p), `${v}: Bildschleife steht`);
    const calls = await p.evaluate(() => globalThis.__sl.renderer.info.render.calls);
    ok(calls > 0, `${v}: keine Draw Calls`);
    ok(!p.errors.length, `${v}: Fehler ${p.errors.slice(0, 2).join(' | ')}`);
    await p.context().close();
  }
  return ok.done();
}

async function qualities(b) {
  const ok = checker(`Qualitätsstufen (${QUALITIES.length})`);
  const seen = {};
  for (const q of QUALITIES) {
    const p = await page(b, 'land', { query: `?venue=ascheplatz&notitle&trainer&debug&dauer=30&quality=${q}` });
    await p.waitForTimeout(1500);
    ok(await running(p), `${q}: Bildschleife steht`);
    const r = await p.evaluate(() => ({ id: __sl.pixel.qualityId, h: __sl.pixel.quality?.internalHeight, calls: __sl.renderer.info.render.calls }));
    ok(r.id === q, `${q}: aktiv ist ${r.id}`);
    ok(r.calls > 0, `${q}: keine Draw Calls`);
    seen[q] = `${r.h}p/${r.calls}dc`;
    ok(!p.errors.length, `${q}: Fehler ${p.errors.slice(0, 2).join(' | ')}`);
    await p.context().close();
  }
  console.log('  ', Object.entries(seen).map(([k, v]) => `${k} ${v}`).join(' · '));
  return ok.done();
}

export async function incidents(b) {
  const ok = checker(`Vorfälle bis zum Abpfiff (${Object.keys(INCIDENTS).length}) + Ersatzschiri ohne Schiri`);
  for (const [v, venue] of Object.entries(INCIDENTS)) {
    // Fester Seed und volle Spielzeit: Zaun/Autoalarm brauchen ein auslösendes Ereignis, das mit
    // zufälligem Seed in einem kurzen Spiel mal kam und mal nicht (Test war Glückssache).
    const p = await page(b, 'land', { query: `?venue=${venue}&notitle&trainer&debug&dauer=120&seed=${INCIDENT_SEED[v] ?? 11}&incident=${v}`, store: { 'sunday-league:tempo': 'schnell' } });
    let seen = false;
    for (let i = 0; i < 400 && !seen; i++) {
      seen = await p.evaluate((t) => __sl.match.incident?.type === t, v);
      if (!seen && (await p.evaluate(() => __sl.match.phase === 'ended'))) break;
      if (!seen) {
        await p.evaluate(() => document.querySelector('.half-panel [data-action="go"]')?.click());
        await p.waitForTimeout(500);
      }
    }
    ok(seen, `${v} (${venue}): Vorfall tritt nicht auf`);
    ok(await toEnd(p, 240), `${v}: kein Abpfiff`);
    ok(!p.errors.length, `${v}: Fehler ${p.errors.slice(0, 2).join(' | ')}`);
    await p.context().close();
  }
  // Testschalter auf einem Platz ohne Schiri: Vorfall bleibt aus, Spiel läuft (früher stand es).
  const p = await page(b, 'land', { query: '?venue=park&notitle&trainer&debug&dauer=10&incident=ersatzschiri' });
  ok(await toEnd(p, 60), 'Ersatzschiri ohne Schiri: kein Abpfiff');
  ok(!p.errors.length, `Ersatzschiri ohne Schiri: Fehler ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  return ok.done();
}

async function friendlySelf(b) {
  const ok = checker('Freundschaftsspiel selbst spielen (Tastatur) bis zum Abpfiff, zurück ins Menü');
  const p = await page(b, 'desk', { query: '?notitle&debug&dauer=20' });
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(600);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => document.getElementById('menu').hidden && !__sl.match.manager), 'kein selbst gesteuertes Spiel');
  // etwas laufen, passen, schießen (nicht X: das öffnet die Wechseltafel und hält das Spiel an)
  for (const k of ['ArrowRight', 'ArrowUp', 'Space', 'ArrowLeft', 'KeyS']) {
    await p.keyboard.down(k);
    await p.waitForTimeout(400);
    await p.keyboard.up(k);
  }
  ok(await toEnd(p, 90), 'kein Abpfiff');
  await p.waitForTimeout(1600);
  ok(await visible(p, 'end'), 'Endbildschirm fehlt');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(800);
  if (!(await visible(p, 'menu'))) {
    await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
  }
  ok(await visible(p, 'menu'), 'nicht zurück im Menü');
  ok(!p.errors.length, `Fehler ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  return ok.done();
}

async function shootout(b) {
  const ok = checker('Elfmeterschießen (K.-o.-Freundschaftsspiel)');
  let done = false;
  // Bei Remis nach der Spielzeit folgt das Elfmeterschießen; mehrere Seeds, bis eins Remis ist.
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const p = await page(b, 'land', { query: `?venue=halle&notitle&trainer&debug&dauer=2&elfmeter&seed=${seed}` });
    let shot = false;
    for (let i = 0; i < 90; i++) {
      const s = await p.evaluate(() => __sl.match.phase);
      if (s === 'shootout') shot = true;
      if (s === 'ended') break;
      await p.evaluate(() => document.querySelector('.half-panel [data-action="go"]')?.click());
      await p.waitForTimeout(1000);
    }
    const end = await p.evaluate(() => __sl.match.phase === 'ended');
    ok(end, `Seed ${seed}: kein Abpfiff`);
    ok(!p.errors.length, `Seed ${seed}: Fehler ${p.errors.slice(0, 2).join(' | ')}`);
    await p.context().close();
    if (shot) {
      done = true;
      break;
    }
  }
  ok(done, 'in 6 Seeds kein Elfmeterschießen erreicht');
  return ok.done();
}

async function title(b) {
  const ok = checker('Startbild → Menü');
  const p = await page(b, 'land', { query: '?debug' });
  ok(await visible(p, 'title'), 'Startbild fehlt');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  ok(await visible(p, 'menu'), 'Menü erscheint nicht nach dem Startbild');
  ok(!p.errors.length, `Fehler ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  return ok.done();
}

async function menus(b) {
  const ok = checker('Spielerpool, Spielstände, Challenge bis zum Ergebnis');
  // Challenges haben eine feste Länge (?dauer gilt nicht) – im schnellen Tempo.
  const p = await page(b, 'land', { query: '?notitle&debug', store: { 'sunday-league:tempo': 'schnell' } });
  await click(p, '.pool-link');
  await p.waitForTimeout(600);
  ok(await visible(p, 'pool'), 'Spielerpool öffnet nicht');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#pool [data-action="back"], #pool .back')?.click());
  await p.waitForTimeout(400);
  await click(p, '.saves-link');
  await p.waitForTimeout(600);
  ok(await visible(p, 'saves'), 'Spielstände öffnen nicht');
  await p.evaluate(() => document.querySelector('#saves [data-action="back"]')?.click());
  await p.waitForTimeout(600);
  await click(p, '.challenges-link');
  await p.waitForTimeout(600);
  ok(await visible(p, 'challenges'), 'Challenges öffnen nicht');
  await click(p, '#challenges [data-action="start"]');
  await p.waitForTimeout(1500);
  ok(await toEnd(p, 400), 'Challenge: kein Abpfiff');
  let result = false;
  for (let i = 0; i < 10 && !result; i++) {
    await p.waitForTimeout(500);
    result = await p.evaluate(() => !document.getElementById('challenges').hidden && !!document.querySelector('#challenges [data-action="list"]'));
  }
  ok(result, 'Challenge: Ergebnis fehlt');
  ok(!p.errors.length, `Fehler ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  return ok.done();
}

async function tabs(p, ok, label) {
  for (const [area, tab] of TABS) {
    await click(p, `[data-action="area"][data-value="${area}"]`);
    if (tab) await p.evaluate((t) => document.querySelector(`[data-action="tab"][data-value="${t}"]`)?.click(), tab);
    await p.waitForTimeout(150);
  }
  ok(!p.errors.length, `${label}: Fehler ${p.errors.slice(0, 2).join(' | ')}`);
}

async function english(b) {
  const ok = checker('Englisch: Menü und alle Vereinsheim-Tabs');
  const p = await page(b, 'land', { query: '?notitle&debug', store: { 'sunday-league:lang': 'en' } });
  ok(/Start career/.test(await p.textContent('#menu')), 'Menü nicht englisch');
  await p.click('.career button');
  await p.waitForTimeout(500);
  await p.fill('#cc-first', 'Erika');
  await p.fill('#cc-last', 'Test');
  await p.click('#creator [data-action="done"]');
  await p.waitForTimeout(1500);
  await tabs(p, ok, 'EN');
  ok(/Squad|Season|Club/.test(await p.textContent('#club')), 'Vereinsheim nicht englisch');
  await p.context().close();
  return ok.done();
}

export async function oldSave(b, file) {
  const ok = checker('Alter Spielstand (mit dem Stand vor dem Audit erzeugt): laden, alle Tabs, Liveticker-Runde');
  const p = await page(b, 'land', { query: '?notitle&debug', store: { 'sunday-league:career': readFileSync(file, 'utf8') } });
  ok(!!(await p.$('.career [data-c="continue"]')), 'Menü bietet „Karriere fortsetzen" nicht an');
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  ok(await visible(p, 'club'), 'Vereinsheim öffnet nicht');
  await tabs(p, ok, 'alter Spielstand');
  await click(p, '[data-action="area"][data-value="home"]');
  // Der Stand liegt vor der Stadtmeisterschaft: erst das Turnier auslassen, dann den Spieltag simulieren.
  if (await p.$('[data-action="onCupSkip"]')) {
    await click(p, '[data-action="onCupSkip"]');
    await p.waitForTimeout(1500);
  }
  await p.waitForSelector('[data-action="onSimulate"]', { state: 'attached', timeout: 20000 });
  await click(p, '[data-action="onSimulate"]');
  await p.waitForTimeout(1500);
  for (let i = 0; i < 300 && (await visible(p, 'ticker')); i++) {
    await p.evaluate(() => document.querySelector('#ticker .decision button, #ticker [data-action="done"], #ticker [data-action="skip"]')?.click());
    await p.waitForTimeout(300);
  }
  ok(!!(await p.waitForSelector('.results-clip', { timeout: 20000 }).catch(() => null)), 'Ergebnisse nach der Runde fehlen');
  ok(!p.errors.length, `Fehler ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// Vereinsheim „Heute": Raum mit Fenster (Kamera zeigt dort das ganze Bild) und klassische Kacheln.
export async function homeViews(b) {
  const ok = checker('Vereinsheim „Heute": Fenster zeigt den Platz, klassische Ansicht per Notizbuch');
  for (const size of ['port', 'desk']) {
    const p = await page(b, size, { query: '?notitle&debug' });
    await p.click('.career button');
    await p.waitForTimeout(500);
    await p.fill('#cc-first', 'Erika');
    await p.fill('#cc-last', 'Test');
    await p.click('#creator [data-action="done"]');
    await p.waitForTimeout(1500);
    await click(p, '[data-action="area"][data-value="home"]');
    await p.waitForTimeout(600);
    const win = await p.evaluate(() => {
      const r = document.querySelector('.cs-window')?.getBoundingClientRect();
      const v = __sl.rig.camera.view;
      return { rect: r && [r.x, r.y, r.width, r.height], view: v?.enabled ? [v.offsetX, v.offsetY, v.fullWidth, v.fullHeight] : null };
    });
    ok(win.rect && win.view && Math.abs(win.view[0] + win.rect[0]) < 1 && Math.abs(win.view[1] + win.rect[1]) < 1 && Math.abs(win.view[3] - win.rect[3]) < 1, `${size}: Kamerabild liegt nicht im Fenster (${JSON.stringify(win)})`);
    await click(p, '[data-action="area"][data-value="team"]');
    await p.waitForTimeout(400);
    ok(!(await p.evaluate(() => __sl.rig.camera.view?.enabled)), `${size}: Fensteransicht bleibt nach dem Verlassen von „Heute" aktiv`);
    // Klassisch einstellen (Notizbuch → Grafik)
    await click(p, '.club-tools [data-action="onSettings"]');
    await p.waitForTimeout(300);
    await click(p, '.nb-tabs [data-value="grafik"]');
    await click(p, '[data-action="homeview"][data-value="klassisch"]');
    await click(p, '.settings-panel [data-action="back"]');
    await p.waitForTimeout(500);
    await click(p, '[data-action="area"][data-value="home"]');
    await p.waitForTimeout(600);
    const cl = await p.evaluate(() => ({ tiles: document.querySelectorAll('.club-classic .cc-tile').length, window: !!document.querySelector('.cs-window'), see: document.getElementById('club').classList.contains('see-through'), h: Math.min(...[...document.querySelectorAll('.cc-tile')].map((e) => e.getBoundingClientRect().height)), view: !!__sl.rig.camera.view?.enabled }));
    ok(cl.tiles === 10 && !cl.window && !cl.see && !cl.view, `${size}: klassische Ansicht falsch (${JSON.stringify(cl)})`);
    ok(cl.h >= 44, `${size}: Kachel kleiner als 44 px (${cl.h})`);
    ok(!(await p.evaluate(() => document.scrollingElement.scrollWidth > innerWidth)), `${size}: seitliches Scrollen`);
    ok(!p.errors.length, `${size}: Fehler ${p.errors.slice(0, 2).join(' | ')}`);
    await p.context().close();
  }
  return ok.done();
}

export async function run() {
  const b = await launch();
  let f = 0;
  f += await title(b);
  f += await friendlySelf(b);
  f += await qualities(b);
  f += await variants(b, `Wetter (${WEATHER.length})`, WEATHER, (w) => `?venue=rasenplatz&notitle&trainer&debug&dauer=30&wetter=${w}`);
  f += await variants(b, `Tageszeiten (${TIMES.length})`, TIMES, (z) => `?venue=ascheplatz&notitle&trainer&debug&dauer=30&zeit=${z}`);
  f += await incidents(b);
  f += await shootout(b);
  f += await menus(b);
  f += await english(b);
  f += await homeViews(b);
  f += await oldSave(b, process.env.E2E_OLD_SAVE ?? fileURLToPath(new URL('./fixtures/save-858e978.json', import.meta.url)));
  await b.close();
  return f;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await run();
