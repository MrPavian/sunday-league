// Oberfläche: Relegation nach dem letzten Spieltag (Vizemeister der Freizeitliga). Aufstellung und Taktik lassen sich wählen
// (vorher: „gibt es nach dem Wochenstart“), das Hinspiel läuft auf einem Platz der höheren Liga mit deren Spielerzahl
// (vorher 7 gegen 7 im Hinterhof).
import { createCareer, finishRound, humanClub, seasonOver, simulateSync } from '../../../src/career/career.js';
import { prepareRelegationMatch, recordRelegationLeg, startRelegation } from '../../../src/career/relegation.js';
import { checker, click, page } from '../lib.mjs';

function career() {
  const c = createCareer({ seed: 5 });
  const me = humanClub(c).id;
  const top = c.clubs.find((x) => !x.human).id;
  while (!seasonOver(c)) {
    for (const f of c.fixtures[c.round]) {
      const s = (id) => (id === top ? 5 : id === me ? 3 : 0);
      f.result = { home: s(f.home), away: s(f.away) };
    }
    finishRound(c);
  }
  return c;
}

export async function relegation(b) {
  const ok = checker('Relegation: Aufstellung, Taktik, Platz und Spielerzahl, „Weiter zum Rückspiel“');
  const c = career();
  const p = await page(b, 'land', { query: '?notitle&debug&dauer=10', store: { 'sunday-league:career': JSON.stringify(c) } });
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  ok(!!(await p.$('[data-action="onRelCoach"]')), 'Relegation: Knopf fürs Hinspiel fehlt');
  await click(p, '[data-action="area"][data-value="team"]');
  for (const tab of ['lineup', 'tactic']) {
    await p.evaluate((t) => document.querySelector(`[data-action="tab"][data-value="${t}"]`)?.click(), tab);
    await p.waitForTimeout(300);
    const text = await p.textContent('#club');
    ok(!/nach dem Wochenstart/.test(text), `Relegation: Reiter ${tab} nicht wählbar`);
  }
  ok(!!(await p.$('[data-action="tacticSystem"]')), 'Relegation: keine Systeme in der Taktik');
  await click(p, '[data-action="area"][data-value="home"]');
  await p.waitForTimeout(300);
  await click(p, '[data-action="onRelCoach"]');
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => ({ pitch: __sl.match?.pitch.id, base: __sl.match?.pitch.base, n: __sl.match?.players.filter((x) => x.team === 0).length, format: __sl.match?.pitch.format }));
  ok(info.pitch && info.pitch !== 'hinterhof' && info.n === info.format, `Relegation: Platz/Spielerzahl passt nicht (${JSON.stringify(info)})`);
  ok(!p.errors.length, `Seitenfehler: ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  // Nach dem Hinspiel: erst „Weiter zum Rückspiel“ (vom Nutzer gewünscht, 2026-10-28), dann das Rückspiel.
  const c2 = career();
  startRelegation(c2);
  const first = prepareRelegationMatch(c2, { duration: 10 });
  simulateSync(first);
  recordRelegationLeg(c2, first);
  const q = await page(b, 'land', { query: '?notitle&debug&dauer=10', store: { 'sunday-league:career': JSON.stringify(c2) } });
  await click(q, '.career [data-c="continue"]');
  await q.waitForTimeout(1500);
  ok(!!(await q.$('[data-action="onRelegationNext"]')) && !(await q.$('[data-action="onRelCoach"]')), 'Relegation: nach dem Hinspiel fehlt der Schritt „Weiter zum Rückspiel“');
  await click(q, '[data-action="onRelegationNext"]');
  await q.waitForTimeout(800);
  ok(!!(await q.$('[data-action="onRelCoach"]')), 'Relegation: nach „Weiter“ fehlt der Knopf fürs Rückspiel');
  ok(!q.errors.length, `Seitenfehler: ${q.errors.slice(0, 2).join(' | ')}`);
  await q.context().close();
  return ok.done();
}
