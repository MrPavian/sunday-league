// Alle Browser-Regressionstests: baut nicht selbst, startet aber den Vorschau-Server für dist/.
//   npm run build && npm run e2e            (alle)
//   npm run e2e -- ui memory                (Auswahl: ui, match, memory)
// Voraussetzung: Chromium/Playwright (global oder PLAYWRIGHT_PATH). Kein Ersatz für ein echtes Gerät.
import { spawn } from 'node:child_process';
import { BASE } from './lib.mjs';

const SUITES = { ui: () => import('./ui.mjs'), match: () => import('./match.mjs'), memory: () => import('./memory.mjs') };
const pick = process.argv.slice(2).filter((a) => SUITES[a]);
const port = new URL(BASE).port;
const server = spawn('npx', ['vite', 'preview', '--port', port, '--strictPort'], { stdio: 'ignore' });
let fails = 0;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  for (const name of pick.length ? pick : Object.keys(SUITES)) {
    const t0 = Date.now();
    fails += await (await SUITES[name]()).run();
    console.log(`  (${name}: ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
} finally {
  server.kill();
}
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : '\nAlle Browser-Prüfungen bestanden');
process.exit(fails ? 1 : 0);
