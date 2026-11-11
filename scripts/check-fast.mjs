// Schneller Prüflauf für die laufende Arbeit: nur die Tests, die an den geänderten Dateien hängen (vitest related), dazu auf
// Wunsch einzelne Browser-Modi. Ersetzt NICHT den vollen Lauf vor einer Lieferung (golden.mjs, alle Tests, e2e/run.mjs).
//   node scripts/check-fast.mjs                 geänderte Dateien gegenüber HEAD (auch neue)
//   node scripts/check-fast.mjs privatLife ...  zusätzlich diese Modi aus scripts/e2e/modes.mjs (eigener Server auf Port 4299)
import { execSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).split('\n').filter(Boolean);
const changed = [...new Set([...sh('git diff --name-only HEAD'), ...sh('git ls-files --others --exclude-standard')])].filter((f) => /^(src|tests)\/.*\.js$/.test(f));
const modes = process.argv.slice(2);
let failed = 0;
if (!changed.length) console.log('Keine geänderten Dateien unter src/ oder tests/.');
else {
  console.log(`Geändert: ${changed.length} Dateien – Tests, die daran hängen:`);
  failed += spawnSync('npx', ['vitest', 'related', '--run', '--reporter=dot', ...changed], { stdio: 'inherit' }).status ? 1 : 0;
}
if (modes.length) {
  const out = mkdtempSync(join(tmpdir(), 'sl-fast-'));
  failed += spawnSync('npx', ['vite', 'build', '--outDir', out, '--logLevel', 'error'], { stdio: 'inherit' }).status ? 1 : 0;
  const server = spawn('npx', ['vite', 'preview', '--outDir', out, '--port', '4299', '--strictPort'], { stdio: 'ignore', detached: true });
  await new Promise((r) => setTimeout(r, 4000));
  failed += spawnSync('node', ['scripts/e2e/modes.mjs'], { stdio: 'inherit', env: { ...process.env, E2E_BASE: 'http://localhost:4299', E2E_ONLY: modes.join(',') } }).status ? 1 : 0;
  try { process.kill(-server.pid); } catch {}
  rmSync(out, { recursive: true, force: true });
}
console.log(failed ? 'SCHNELLER LAUF: FEHLER' : 'SCHNELLER LAUF: grün (voller Lauf vor der Lieferung bleibt Pflicht)');
process.exitCode = failed ? 1 : 0;
