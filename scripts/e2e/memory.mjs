// Speicherzyklen: mehrere Karrierespiele hintereinander, Spielorte im Menü durchschalten und
// Freundschaftsspiele mit Vorfall (Besucher auf dem Platz). Nach jeder Runde (Speicherbereinigung
// erzwungen) dürfen GPU-Texturen, Geometrien, JS-Heap und Listener nicht dauerhaft wachsen.
import { checker, launch, newCareer, page, playCareerMatch } from './lib.mjs';

// Losgelöste DOM-Knoten aus einem Heap-Snapshot (vollständige Bereinigung inklusive DOM). Der
// Performance-Zähler „Nodes" enthält noch nicht eingesammelten Müll und taugt dafür nicht.
async function detachedNodes(cdp) {
  const chunks = [];
  const on = (e) => chunks.push(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', on);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', on);
  const snap = JSON.parse(chunks.join(''));
  const f = snap.snapshot.meta.node_fields;
  const NF = f.length;
  const iName = f.indexOf('name');
  const iDet = f.indexOf('detachedness');
  if (iDet < 0) return null;
  let n = 0;
  for (let i = 0; i < snap.nodes.length; i += NF) if (snap.nodes[i + iDet] === 2 && /^(HTML|SVG)/.test(snap.strings[snap.nodes[i + iName]])) n++;
  return n;
}

async function career(b, matches) {
  const ok = checker('Speicherzyklus (Karriere → Spiel → Vereinsheim)');
  const p = await page(b, 'land', { query: '?notitle&debug&dauer=30' });
  await newCareer(p);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Performance.enable');
  const snap = async () => {
    // Mehrfach bereinigen: DOM-Knoten gibt Blink erst nach einem eigenen (verzögerten) GC frei.
    for (let i = 0; i < 4; i++) {
      await cdp.send('HeapProfiler.collectGarbage');
      await p.waitForTimeout(500);
    }
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    const gl = await p.evaluate(() => ({ attached: document.getElementsByTagName('*').length, tex: __sl.renderer.info.memory.textures, geo: __sl.renderer.info.memory.geometries }));
    return { heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners, ...gl };
  };
  await cdp.send('HeapProfiler.enable');
  const rows = [];
  for (let i = 1; i <= matches; i++) {
    await playCareerMatch(p);
    const row = await snap();
    if (i === 1 || i === matches) row.detached = await detachedNodes(cdp);
    rows.push(row);
    await p.evaluate(() => document.querySelector('[data-action="onNextWeek"]')?.click());
    await p.waitForTimeout(1200);
  }
  console.table(rows);
  const first = rows[0];
  const last = rows.at(-1);
  // Nach dem ersten Spiel sind Caches gefüllt; danach nur noch Schwankung erlaubt.
  ok(last.tex - first.tex <= 6, `GPU-Texturen wachsen: ${first.tex} → ${last.tex} über ${matches - 1} Spiele`);
  ok(last.geo - first.geo <= 6, `Geometrien wachsen: ${first.geo} → ${last.geo}`);
  ok(last.heapMB - first.heapMB <= 8, `JS-Heap wächst: ${first.heapMB} → ${last.heapMB} MB`);
  ok(last.listeners - first.listeners <= 4, `Listener wachsen: ${first.listeners} → ${last.listeners}`);
  ok(last.attached - first.attached <= 150, `DOM (eingehängt) wächst: ${first.attached} → ${last.attached}`);
  ok(last.detached == null || last.detached - first.detached <= 50, `Losgelöste DOM-Knoten wachsen: ${first.detached} → ${last.detached}`);
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// GPU-Stand nach erzwungener Bereinigung.
async function gpu(p, cdp) {
  for (let i = 0; i < 3; i++) {
    await cdp.send('HeapProfiler.collectGarbage');
    await p.waitForTimeout(300);
  }
  return p.evaluate(() => ({ tex: __sl.renderer.info.memory.textures, geo: __sl.renderer.info.memory.geometries }));
}

// Spielorte im Menü durchschalten: Jeder Wechsel baut Kulisse, Licht (Schattenkarte) und ein
// Hintergrundspiel neu. Früher blieb je Wechsel die Schattenkarte der Sonne liegen.
export async function venues(b, rounds = 3) {
  const ok = checker('Speicherzyklus: Spielorte im Menü durchschalten');
  const p = await page(b, 'land', { query: '?notitle&debug' });
  const cdp = await p.context().newCDPSession(p);
  const n = await p.$$eval('.venue-card', (e) => e.length);
  const rows = [];
  for (let r = 0; r <= rounds; r++) {
    if (r) for (let i = 0; i < n; i++) {
      await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(700);
    }
    rows.push(await gpu(p, cdp));
  }
  console.table(rows);
  // Runde 0 → 1 füllt Caches (Shader, geteilte Materialien); danach darf nichts mehr wachsen.
  ok(rows.at(-1).tex - rows[1].tex <= 2, `GPU-Texturen wachsen je Ortswechsel: ${rows.map((x) => x.tex).join(' → ')}`);
  ok(rows.at(-1).geo - rows[1].geo <= 2, `Geometrien wachsen: ${rows.map((x) => x.geo).join(' → ')}`);
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// Freundschaftsspiele mit Polizei-Einsatz: Besucher-Figuren haben eigenen Atlas und eigenes
// Skelett. Früher blieben je Spiel 4 Texturen liegen.
export async function incidentMatches(b, matches = 4) {
  const ok = checker('Speicherzyklus: Freundschaftsspiele mit Vorfall (Polizei)');
  const p = await page(b, 'land', { query: '?notitle&debug&dauer=12&incident=polizei' });
  const cdp = await p.context().newCDPSession(p);
  const rows = [await gpu(p, cdp)];
  for (let i = 0; i < matches; i++) {
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.getElementById('menu').hidden, null, { timeout: 20000 });
    const police = await p.waitForFunction(() => __sl.match?.visitors?.length > 0, null, { timeout: 30000 }).then(() => true, () => false);
    ok(police, `Spiel ${i + 1}: Polizei kommt nicht aufs Feld`);
    for (let k = 0; k < 120 && (await p.evaluate(() => document.getElementById('end').hidden)); k++) {
      await p.evaluate(() => document.querySelector('.half-panel [data-action="go"]')?.click());
      await p.waitForTimeout(1000);
    }
    await p.waitForTimeout(800);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
    rows.push(await gpu(p, cdp));
  }
  console.table(rows);
  ok(rows.at(-1).tex - rows[1].tex <= 2, `GPU-Texturen wachsen je Spiel: ${rows.map((x) => x.tex).join(' → ')}`);
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

export async function run({ matches = 4 } = {}) {
  const b = await launch();
  const fails = (await career(b, matches)) + (await venues(b)) + (await incidentMatches(b));
  await b.close();
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await run();
