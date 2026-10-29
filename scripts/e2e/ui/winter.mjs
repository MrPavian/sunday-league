// Oberfläche: Winterpause als eigene Woche (vom Nutzer gewünscht, 2026-10-21). Erst das Hallenturnier (anmelden oder nicht),
// dann „Weiter zum nächsten Spieltag“ – vorher lag das Turnier in der Woche des Ligaspiels.
import { createCareer, finishRound, winterRound } from '../../../src/career/career.js';
import { checker, click, page } from '../lib.mjs';

export async function winterBreak(b) {
  const ok = checker('Winterpause: eigene Woche, Hallenturnier, dann weiter zum Spieltag');
  const c = createCareer({ seed: 93 });
  while (c.round < winterRound(c)) {
    for (const f of c.fixtures[c.round]) f.result ??= { home: 1, away: 0 };
    finishRound(c);
  }
  const p = await page(b, 'land', { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(c) } });
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  ok(!!(await p.$('.break-card [data-action="onCupStart"]')), 'Winterpause: Anmeldung zum Hallenturnier fehlt');
  ok(!(await p.$('[data-action="onCoach"], [data-action="onSimulate"]')), 'Winterpause: Ligaspiel wird angeboten');
  await click(p, '.break-card [data-action="onCupSkip"]');
  await p.waitForTimeout(600);
  ok(!!(await p.$('.break-card [data-action="onBreakDone"]')), 'Winterpause: „Weiter zum nächsten Spieltag“ fehlt');
  await click(p, '.break-card [data-action="onBreakDone"]');
  await p.waitForTimeout(1000);
  ok(!(await p.$('.break-card')) && !!(await p.$('[data-action="onCoach"], [data-action="onSimulate"]')), 'Nach der Winterpause fehlt das Ligaspiel');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  return ok.done();
}
