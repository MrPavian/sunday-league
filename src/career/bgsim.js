// Hintergrundspiele parallel (ROADMAP 8.5 „Simulation im Web Worker“, 2026-11-06): Die übrigen Spiele eines Spieltags rechnen
// mehrere Web Worker gleichzeitig statt eines nach dem anderen auf dem Haupt-Thread.
// Gleich wie vorher (gemessen 2026-11-06, scratch equiv2): Die Vorbereitung eines Spiels ändert den Spielstand nicht, und die
// Spiele eines Spieltags hängen nicht voneinander ab – ein Worker bekommt eine Kopie des Spielstands, bereitet vor und rechnet;
// eingetragen wird danach der Reihe nach wie bisher. Byte für Byte derselbe Spielstand (Freizeitliga und Regionalliga, mehrere
// Seeds und Spieltage). Kann ein Gerät keine Worker (oder geht etwas schief), läuft alles wie bisher auf dem Haupt-Thread.
import { getLang, setLang } from '../core/i18n.js';
import { MATCH } from '../sim/match.js';
import { currentFixtures, prepareMatch, recordResult, registerCustomPlayers, simulate, simulateSync } from './career.js';

// Fertiges Spiel ohne seine Zufallsgeneratoren (Funktionen lassen sich nicht übergeben; nach dem Abpfiff braucht sie niemand).
export function plainMatch(m) {
  for (const k of Object.keys(m)) if (m[k] && typeof m[k] === 'object' && typeof m[k].next === 'function') delete m[k];
  return m;
}

// Kern, den der Worker ausführt (und die Tests direkt): Spiele des aktuellen Spieltags vorbereiten und rechnen.
export function simFixtures(career, indices, { duration, match, lang } = {}) {
  if (match) Object.assign(MATCH, match);
  if (lang && lang !== getLang()) setLang(lang);
  registerCustomPlayers(career);
  const all = currentFixtures(career);
  return indices.map((i) => {
    const p = prepareMatch(career, all[i], { duration });
    simulateSync(p);
    return plainMatch(p.match);
  });
}

// --- Worker-Pool (nur im Browser) ---------------------------------------------------------------------------------------
let pool;
let broken = false;
// Vorerst nur zum Testen (Adresse mit ?worker): Im Browser-Test auf vier Kernen war der Gewinn verrauscht (3,6 statt 3,9 s je
// Spieltag, der erste mit Anlauf langsamer). Einschalten, sobald es Messwerte von einem echten Handy gibt.
export const BGSIM = { enabled: /[?&]worker\b/.test(globalThis.location?.search ?? '') };
const size = () => Math.max(1, Math.min(4, (globalThis.navigator?.hardwareConcurrency ?? 2) - 1));
function workers() {
  if (pool !== undefined) return pool;
  pool = null;
  try {
    if (typeof Worker === 'undefined') return pool;
    pool = Array.from({ length: size() }, () => new Worker(new URL('./simworker.js', import.meta.url), { type: 'module' }));
  } catch {
    pool = null;
  }
  return pool;
}
let seq = 0;
function ask(w, msg) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const done = (e) => {
      if (e.data?.id !== id) return;
      w.removeEventListener('message', done);
      w.removeEventListener('error', fail);
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.matches);
    };
    const fail = (e) => {
      w.removeEventListener('message', done);
      w.removeEventListener('error', fail);
      reject(e instanceof Error ? e : new Error(e?.message ?? 'worker'));
    };
    w.addEventListener('message', done);
    w.addEventListener('error', fail);
    w.postMessage({ id, ...msg });
  });
}

// Vorwärmen (beim Öffnen des Vereinsheims): Worker starten und den Spielerpool bauen lassen, bevor der erste Spieltag sie braucht.
let warmed = false;
export function warmWorkers(career) {
  if (warmed || broken || !BGSIM.enabled) return;
  const ws = workers();
  if (!ws?.length) return;
  warmed = true;
  for (const w of ws) w.postMessage({ warm: true, names: career?.names ?? 1, lang: getLang() });
}

// Spiele parallel rechnen; null, wenn es ohne Worker weitergehen muss.
async function parallel(career, indices, opts) {
  const ws = broken || !BGSIM.enabled ? null : workers();
  if (!ws?.length || indices.length < 2) return null;
  const parts = ws.map(() => []);
  indices.forEach((ix, k) => parts[k % ws.length].push(k));
  const settings = { duration: opts.duration, match: { ...MATCH }, lang: getLang() };
  try {
    const results = await Promise.all(parts.map((ks, wi) => (ks.length ? ask(ws[wi], { career, indices: ks.map((k) => indices[k]), opts: settings }) : [])));
    const out = new Array(indices.length);
    parts.forEach((ks, wi) => ks.forEach((k, j) => (out[k] = results[wi][j])));
    return out;
  } catch (e) {
    broken = true; // einmal schiefgegangen: ab jetzt wie bisher (z. B. alter WebView, Datei ohne Server)
    console.warn('Hintergrundspiele ohne Worker:', e?.message ?? e);
    return null;
  }
}

// Die übrigen Spiele eines Spieltags rechnen und eintragen (matchflow.js runRound). Reihenfolge des Eintragens wie bisher.
export async function runFixtures(career, fixtures, { duration } = {}) {
  const all = currentFixtures(career);
  const indices = fixtures.map((f) => all.indexOf(f));
  const plains = await parallel(career, indices, { duration });
  for (let k = 0; k < fixtures.length; k++) {
    const prepared = prepareMatch(career, fixtures[k], { duration });
    if (plains) prepared.match = plains[k];
    else await simulate(prepared);
    recordResult(career, fixtures[k], prepared);
  }
}
