// Spielablauf im Trainer-Modus: Taktik pausiert, Info läuft weiter, Wechsel pausiert, Lagekarte
// wirkt, Halbzeit und Abpfiff; dazu das Freeze-Szenario (Spieler kommt verspätet, ?stau).
import { checker, launch, leaveHalftime, page } from './lib.mjs';

async function trainerFlow(b) {
  const ok = checker('Trainer-Spiel: Taktik, Info, Wechsel, Lagekarte, Halbzeit, Abpfiff');
  const p = await page(b, 'land', { query: '?venue=ascheplatz&notitle&trainer&debug&dauer=60&seed=3', store: { 'sunday-league:coachlevel': 'profi' } });
  await p.waitForTimeout(1500);
  const t = () => p.evaluate(() => __sl.match.time);
  const hidden = (id) => p.evaluate((i) => document.getElementById(i).hidden, id);
  await p.click('[data-tap="plan"]');
  await p.waitForTimeout(700);
  let t0 = await t();
  await p.waitForTimeout(700);
  ok((await t()) === t0, 'Taktik-Blatt hält das Spiel nicht an');
  await p.click('.plan-panel [data-action="shout"][data-value="press"]');
  await p.waitForTimeout(400);
  ok((await p.evaluate(() => __sl.match.orders?.[0]?.press)) === 'hoch', 'Zuruf „Pressing" setzt keinen Befehl');
  await p.click('.plan-panel footer [data-action="close"]');
  await p.waitForTimeout(600);
  t0 = await t();
  await p.waitForTimeout(700);
  ok((await t()) > t0, 'Spiel läuft nach dem Taktik-Blatt nicht weiter');
  await p.click('[data-tap="info"]');
  await p.waitForTimeout(600);
  t0 = await t();
  await p.waitForTimeout(700);
  ok((await t()) > t0, 'Spiel steht bei offenem Info-Blatt');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  await p.click('[data-tap="sub"]');
  await p.waitForTimeout(600);
  ok(!(await hidden('subpanel')), 'Wechseltafel öffnet nicht');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  await p.evaluate(() => { const m = __sl.match; m.coachCard = { type: 'ENDGAME', team: 0, title: 'Test', text: 'Test', options: [{ group: 'build', value: 'halten', label: 'Ball laufen lassen' }], severity: 0.6, t: m.time }; });
  await p.waitForTimeout(500);
  await p.click('.coach-card [data-answer="0"]');
  await p.waitForTimeout(400);
  ok((await p.evaluate(() => __sl.match.orders?.[0]?.build)) === 'halten', 'Antwort auf die Lagekarte wirkt nicht');
  await p.waitForFunction(() => !document.getElementById('halfpanel').hidden, null, { timeout: 200000 }).catch(() => {});
  ok(!(await hidden('halfpanel')), 'Halbzeit erscheint nicht');
  await leaveHalftime(p);
  await p.waitForFunction(() => !document.getElementById('end').hidden, null, { timeout: 200000 }).catch(() => {});
  ok(!(await hidden('end')), 'Abpfiff/Zeitung erscheint nicht');
  ok((await p.$$eval('#end .news-tab', (e) => e.length)) >= 3, 'Zeitung hat weniger als 3 Seiten');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// Ton aus: keine Audioknoten, AudioContext angehalten; Ton wieder an: Kontext läuft, Klänge entstehen.
function countAudioNodes() {
  window.__audioNodes = 0;
  const B = window.BaseAudioContext?.prototype;
  if (!B) return;
  for (const k of Object.getOwnPropertyNames(B)) {
    if (!k.startsWith('create') || typeof B[k] !== 'function') continue;
    const orig = B[k];
    B[k] = function (...a) {
      window.__audioNodes++;
      return orig.apply(this, a);
    };
  }
}

export async function audio(b) {
  const ok = checker('Ton aus: keine Klänge, Audio angehalten; Ton an: Klänge');
  const p = await page(b, 'desk', { query: '?venue=park&notitle&debug&dauer=60&seed=3', store: { 'sunday-league:muted': '1' }, init: countAudioNodes });
  await p.mouse.click(5, 5); // Nutzeraktion: erst dann darf der AudioContext entstehen
  await p.waitForTimeout(500);
  const n0 = await p.evaluate(() => window.__audioNodes);
  await p.waitForTimeout(8000);
  const muted = await p.evaluate(() => ({ n: window.__audioNodes, state: __sl.sound?.ctx?.state ?? null }));
  ok(muted.n === n0, `Ton aus erzeugt Audioknoten: ${n0} → ${muted.n}`);
  ok(muted.state === 'suspended', `AudioContext bei Ton aus nicht angehalten (${muted.state})`);
  await p.keyboard.press('n');
  await p.waitForTimeout(8000);
  const on = await p.evaluate(() => ({ n: window.__audioNodes, state: __sl.sound?.ctx?.state ?? null, muted: __sl.sound?.muted }));
  ok(on.muted === false && on.state === 'running', `Ton an: Kontext läuft nicht (${on.state}, stumm=${on.muted})`);
  ok(on.n > muted.n, `Ton an erzeugt keine Klänge (${muted.n} → ${on.n})`);
  ok(!p.errors.length, `Fehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

async function freeze(b) {
  const ok = checker('Freeze-Szenario: verspäteter Spieler (?stau) bis zum Abpfiff');
  const p = await page(b, 'land', { query: '?venue=ascheplatz&notitle&trainer&debug&stau&dauer=45&seed=7', store: { 'sunday-league:tempo': 'schnell' } });
  const late = await p.evaluate(() => __sl.match.lateArrival?.at ?? null);
  ok(late != null, 'Szenario ohne verspäteten Spieler');
  let last = null;
  let stuck = 0;
  for (let i = 0; i < 180; i++) {
    const s = await p.evaluate(() => ({ t: __sl.match.time, phase: __sl.match.phase, frame: __sl.diag.frame }));
    if (s.phase === 'ended') break;
    stuck = last && s.frame === last.frame ? stuck + 1 : 0;
    ok(stuck < 3, `Bildschleife steht bei t=${s.t.toFixed(1)} (Phase ${s.phase})`);
    if (stuck >= 3) break;
    last = s;
    if (await p.evaluate(() => !document.getElementById('halfpanel').hidden)) await leaveHalftime(p);
    await p.waitForTimeout(1000);
  }
  ok((await p.evaluate(() => __sl.match.phase)) === 'ended', 'Spiel erreicht den Abpfiff nicht');
  ok(!p.errors.length, `Fehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

export async function run() {
  const b = await launch();
  const fails = (await trainerFlow(b)) + (await freeze(b)) + (await audio(b));
  await b.close();
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await run();
