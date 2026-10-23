// Oberfläche: Alte Herren (Reiter „Alte Herren“ in Verein). Gründungskarte, drei Unterbereiche (Spiel/Tabelle, Kader, Ergebnisse),
// Liveticker für das Freitagsspiel; kein seitliches Scrollen, auf Touch keine Schaltflächen unter 44 px.
import { createCareer, finishRound, getPool, humanClub, playerOf, takenIndices } from '../../../src/career/career.js';
import { found, SIM } from '../../../src/career/oldboys.js';
import { checker, click, hScroll, page, settle, SIZES, smallTargets, visible } from '../lib.mjs';
import { NARROW_OK } from './core.mjs';

function career({ team }) {
  SIM.duration = 60;
  const c = createCareer({ seed: 5 });
  const taken = takenIndices(c);
  const olds = getPool().everyone().filter((p) => p.age >= 33 && p.age <= 40 && !taken.has(p.poolIndex)).slice(0, 5).map((p) => p.poolIndex);
  for (const idx of olds) c.alumni.push({ idx, name: playerOf(c, idx).name, age: playerOf(c, idx).age, apps: 30, goals: 5, season: 1, role: 'Ehrenmitglied' });
  c.cash = 300;
  if (team) {
    found(c);
    finishRound(c); // Spieltag 2: das erste Freitagsspiel ist diese Woche fällig
    // ein Ergebnis in der Historie, damit Ergebnisse und Tabelle etwas zeigen
  }
  // ein Spieler der Ersten ab 32 für den Wechsel
  const me = humanClub(c);
  const [old] = getPool().everyone().filter((p) => p.age >= 34 && !takenIndices(c).has(p.poolIndex)).slice(0, 1).map((p) => p.poolIndex);
  const young = me.squad.find((i) => playerOf(c, i).age < 32 && i !== c.coach?.idx);
  me.squad[me.squad.indexOf(young)] = old;
  c.players[old] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0 };
  return c;
}

export async function alteHerren(b, size, shots) {
  const ok = checker(`Alte Herren (${size})`);
  const c = career({ team: false });
  const p = await page(b, size, { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(c) } });
  const shot = async (name) => shots && (await p.screenshot({ path: `${shots}/${name}-${size}.png` }));
  const layout = async (label) => {
    await settle(p);
    ok(!(await hScroll(p)), `${label}: seitliches Scrollen`);
    ok(await p.evaluate(() => { const t = document.querySelector('[data-testid="oh"]'); return !t || t.scrollWidth <= t.clientWidth + 1; }), `${label}: Alte Herren läuft über den Rand`);
    if (SIZES[size].touch) {
      const s = await smallTargets(p, '#club [data-testid="oh"] button, #club [data-testid="oh"] .ui-tabs button', NARROW_OK);
      ok(!s.length, `${label}: Schaltflächen < 44 px: ${s.slice(0, 3).join(', ')}`);
    }
  };
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  await click(p, '[data-action="area"][data-value="club"]');
  await p.evaluate(() => document.querySelector('[data-action="tab"][data-value="oldboys"]')?.click());
  await p.waitForTimeout(400);
  ok(!!(await p.$('[data-testid="oh"]')), 'Reiter Alte Herren fehlt');
  ok(!!(await p.$('[data-testid="oh-found"]')), 'Gründungsknopf fehlt');
  await layout('Gründung');
  await shot('altherren-gruendung');
  await click(p, '[data-testid="oh-found"]');
  await p.waitForTimeout(400);
  const subs = await p.$$eval('[data-testid="oh"] .ui-tabs [data-action="ahSub"]', (e) => e.map((x) => x.dataset.value));
  ok(subs.join() === 'game,squad,games', `Unterbereiche: ${subs.join()}`);
  ok((await p.$$eval('[data-testid="oh-table"] tbody tr', (e) => e.length)) === 6, 'Tabelle: nicht sechs Mannschaften');
  await layout('Spiel und Tabelle');
  await shot('altherren-spiel');
  await click(p, '[data-action="ahSub"][data-value="squad"]');
  await p.waitForTimeout(300);
  const members = await p.$$eval('[data-testid="oh-member"]', (e) => e.length);
  ok(members >= 8, `Kader: ${members} Spieler`);
  ok(!!(await p.$('[data-action="ahMove"]')), 'Wechsel aus der Ersten fehlt');
  await layout('Kader');
  await shot('altherren-kader');
  await click(p, '[data-action="ahMove"]:not([disabled])');
  await p.waitForTimeout(300);
  ok(/Gewechselt/.test(await p.textContent('[data-testid="oh-note"]')), 'Wechsel: keine Rückmeldung');
  ok((await p.$$eval('[data-testid="oh-member"]', (e) => e.length)) === members + 1, 'Wechsel: Kader wächst nicht');
  await click(p, '[data-action="ahSub"][data-value="games"]');
  await p.waitForTimeout(300);
  await layout('Ergebnisse');
  await shot('altherren-ergebnisse');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}

// Das Freitagsspiel im Liveticker ansehen: Ergebnis landet in Tabelle und Ergebnissen.
export async function alteHerrenTicker(b, shots) {
  const ok = checker('Alte Herren: Liveticker');
  const c = career({ team: true });
  const p = await page(b, 'land', { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(c) } });
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  await click(p, '[data-action="area"][data-value="club"]');
  await p.evaluate(() => document.querySelector('[data-action="tab"][data-value="oldboys"]')?.click());
  await p.waitForTimeout(400);
  ok(!!(await p.$('[data-testid="oh-ticker"]')), 'Liveticker-Knopf fehlt (Spiel dieser Woche)');
  if (shots) await p.screenshot({ path: `${shots}/altherren-naechstes-land.png` });
  await click(p, '[data-testid="oh-ticker"]');
  await p.waitForTimeout(1500);
  ok(await visible(p, 'ticker'), 'Liveticker öffnet nicht');
  for (let i = 0; i < 300 && (await visible(p, 'ticker')); i++) {
    await p.evaluate(() => document.querySelector('#ticker [data-action="done"], #ticker [data-action="skip"]')?.click());
    await p.waitForTimeout(300);
  }
  await p.waitForSelector('[data-testid="oh"]', { timeout: 20000 }).catch(() => null);
  ok(!(await p.$('[data-testid="oh-ticker"]')), 'Nach dem Spiel ist der Ticker-Knopf noch da');
  const played = await p.$$eval('[data-testid="oh-table"] tbody tr', (rows) => rows.map((r) => Number(r.children[2].textContent)));
  ok(played.reduce((a, b2) => a + b2, 0) === 6, `Tabelle nach dem Spiel: ${played.join()}`);
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}
