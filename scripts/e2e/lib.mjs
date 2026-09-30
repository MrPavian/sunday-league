// Browser-Regressionstests (Playwright, Chromium). Kein Projekt-Dependency: Playwright wird aus
// PLAYWRIGHT_PATH, dem Projekt oder der globalen Installation geladen. Grafik per SwiftShader –
// Bildzeiten sind damit nicht aussagekräftig, Ablauf, Ressourcen und Fehler schon.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export function playwright() {
  for (const p of [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/node22/lib/node_modules/playwright']) {
    if (!p) continue;
    try {
      return require(p);
    } catch {}
  }
  throw new Error('Playwright nicht gefunden (PLAYWRIGHT_PATH setzen oder playwright installieren)');
}

export const BASE = process.env.E2E_BASE ?? 'http://localhost:4199';
export const SIZES = {
  land: { width: 800, height: 360, touch: true },
  port: { width: 360, height: 780, touch: true },
  tiny: { width: 320, height: 568, touch: true },
  desk: { width: 1366, height: 768, touch: false },
};

export async function launch() {
  return playwright().chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
}

// Neue Seite mit leerem Speicher (Deutsch, Effekte aus); sammelt Seitenfehler. `init` läuft vor
// jedem Seitenskript (z. B. Zähler an Browser-APIs).
export async function page(browser, size = 'land', { query = '?notitle', store = {}, init = null } = {}) {
  const s = SIZES[size];
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: s.touch, isMobile: s.touch });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && m.text().includes('sl-diag') && p.errors.push(m.text()));
  await p.goto(`${BASE}/?notitle`);
  await p.evaluate((st) => {
    localStorage.clear();
    localStorage.setItem('sunday-league:lang', 'de');
    localStorage.setItem('sunday-league:fx', '0');
    for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v);
  }, store);
  await p.goto(`${BASE}/${query}`);
  await p.waitForTimeout(2000);
  return p;
}

export const click = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) throw new Error(`fehlt: ${s}`); el.click(); }, sel);
export const visible = (p, id) => p.evaluate((i) => !document.getElementById(i).hidden, id);

export async function newCareer(p) {
  await p.click('.career button');
  await p.waitForTimeout(500);
  await p.fill('#cc-first', 'Erika');
  await p.fill('#cc-last', 'Test');
  await p.click('#creator [data-action="done"]');
  await p.waitForTimeout(1500);
}

// Karrierespiel als Trainer bis zum Abpfiff, zurück ins Vereinsheim.
export async function playCareerMatch(p) {
  await p.waitForSelector('[data-action="onCoach"]', { state: 'attached', timeout: 60000 });
  await click(p, '[data-action="onCoach"]');
  await p.waitForTimeout(2500);
  await p.waitForFunction(() => !document.getElementById('halfpanel').hidden || !document.getElementById('end').hidden, null, { timeout: 300000 });
  await leaveHalftime(p);
  await p.waitForFunction(() => !document.getElementById('end').hidden, null, { timeout: 300000 });
  await p.waitForTimeout(800);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('club').hidden, null, { timeout: 30000 });
  await p.waitForTimeout(1000);
}

// Kabine verlassen: Das Blatt ignoriert Tipps direkt nach dem Öffnen (Schutz vor Durchtippen) –
// daher kurz warten und wiederholen, bis es zu ist.
export async function leaveHalftime(p) {
  for (let i = 0; i < 20 && (await p.evaluate(() => !document.getElementById('halfpanel').hidden)); i++) {
    await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('.half-panel [data-action="go"]')?.click());
  }
}

// Prüfungen sammeln statt beim ersten Fehler abbrechen.
export function checker(suite) {
  const fails = [];
  const ok = (cond, msg) => {
    if (!cond) fails.push(msg);
    return cond;
  };
  ok.done = () => {
    if (fails.length) console.log(`✗ ${suite}\n  - ${fails.join('\n  - ')}`);
    else console.log(`✓ ${suite}`);
    return fails.length;
  };
  return ok;
}

// Schaltflächen kleiner als 44 px (nur für Touch-Größen relevant).
export const smallTargets = (p, sel, ignore = []) =>
  p.evaluate(
    ([s, ig]) =>
      [...document.querySelectorAll(s)]
        .filter((x) => !ig.some((c) => x.matches(c)))
        .filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && Math.min(r.width, r.height) < 44; })
        .map((x) => `${x.className || x.tagName}${x.dataset.action ? `[${x.dataset.action}]` : ''}:${x.getBoundingClientRect().width.toFixed(2)}x${x.getBoundingClientRect().height.toFixed(2)}`),
    [sel, ignore],
  );
// Warten, bis Übergangs-Animationen (z. B. Bereichswechsel) durch sind – gemessen wird der Ruhezustand.
export const settle = (p) => p.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 2000))]));
export const hScroll = (p) => p.evaluate(() => document.scrollingElement.scrollWidth > innerWidth);
