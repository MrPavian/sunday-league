// Oberfläche: wählbares Tutorial (ui/Tutorial.js). Angebot nach der Gründung, Rundgang durchs Vereinsheim mit Hervorhebung,
// dann Hinweise am ersten Spieltag an der Seitenlinie – solange eine Blase offen ist, steht das Spiel.
import { checker, click, hScroll, leaveHalftime, newCareer, page, SIZES, smallTargets } from '../lib.mjs';
import { NARROW_OK } from './core.mjs';

const bubble = (p) => p.evaluate(() => {
  const b = document.querySelector('.tutorial:not([hidden]) .tut-bubble');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { title: b.querySelector('h3').textContent, inView: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, focus: document.querySelectorAll('.tut-focus').length };
});

export async function tutorial(b, size, shots) {
  const ok = checker(`Tutorial (${size})`);
  const p = await page(b, size);
  await newCareer(p, { tutorial: true });
  const shot = async (name) => shots && (await p.screenshot({ path: `${shots}/${name}-${size}.png` }));
  ok((await p.getAttribute('.tutorial:not([hidden]) .tut-bubble', 'data-step').catch(() => null)) === 'offer', 'Nach der Gründung: kein Angebot fürs Tutorial');
  const offer = await bubble(p);
  ok(offer?.inView, 'Angebot: Blase ragt aus dem Bild');
  if (SIZES[size].touch) {
    const s = await smallTargets(p, '.tutorial:not([hidden]) .tut-bubble button', NARROW_OK);
    ok(!s.length, `Angebot: Schaltflächen < 44 px: ${s.join(', ')}`);
  }
  await shot('tutorial-angebot');
  await click(p, '.tutorial:not([hidden]) [data-tut="next"]'); // „Ja, gern“
  await p.waitForTimeout(400);
  ok((await p.getAttribute('.tutorial:not([hidden]) .tut-bubble', 'data-step').catch(() => null)) === 'hub', 'Nach „Ja“: Rundgang beginnt nicht auf „Heute“');
  // Rundgang: jeder Schritt mit Blase im Bild und hervorgehobenem Ziel.
  const seen = [];
  for (let i = 0; i < 15; i++) {
    const s = await bubble(p);
    if (!s) break;
    seen.push(s.title);
    ok(s.inView, `Rundgang „${s.title}“: Blase ragt aus dem Bild`);
    ok(s.focus === 1, `Rundgang „${s.title}“: Ziel nicht hervorgehoben (${s.focus})`);
    ok(!(await hScroll(p)), `Rundgang „${s.title}“: seitliches Scrollen`);
    if (SIZES[size].touch) {
      const t = await smallTargets(p, '.tutorial:not([hidden]) .tut-bubble button', []);
      ok(!t.length, `Rundgang „${s.title}“: Schaltflächen < 44 px: ${t.join(', ')}`);
    }
    if (i === 2) await shot('tutorial-schritt');
    await click(p, '.tutorial:not([hidden]) [data-tut="next"]');
    await p.waitForTimeout(350);
  }
  ok(seen.length === 11, `Rundgang: ${seen.length} statt 11 Schritte`);
  ok(new Set(seen).size === seen.length, 'Rundgang: Schritt doppelt');
  ok(!(await bubble(p)) && !!(await p.$('.hub')), 'Nach dem Rundgang: Blase offen oder nicht auf „Heute“');
  // Spieltag: Hinweise kommen nacheinander; solange einer offen ist, läuft die Uhr nicht.
  await click(p, '[data-action="onCoach"]');
  await p.waitForFunction(() => document.querySelector('.tutorial:not([hidden]) .tut-bubble'), null, { timeout: 60000 });
  const c1 = await p.textContent('.clock');
  await p.waitForTimeout(1500);
  ok(c1 === (await p.textContent('.clock')), 'Spiel läuft weiter, obwohl der Hinweis offen ist');
  await shot('tutorial-seitenlinie');
  const match = [];
  for (let i = 0; i < 8; i++) {
    const got = await p.waitForFunction(() => document.querySelector('.tutorial:not([hidden]) .tut-bubble') || !document.getElementById('end').hidden, null, { timeout: 300000 }).then(() => bubble(p));
    if (!got) break;
    match.push(got.title);
    ok(got.inView, `Spieltag „${got.title}“: Blase ragt aus dem Bild`);
    await click(p, '.tutorial:not([hidden]) [data-tut="next"]');
    await p.waitForTimeout(300);
    await leaveHalftime(p);
  }
  ok(match.length >= 5, `Spieltag: nur ${match.length} Hinweise (${match.join(' / ')})`);
  ok(match.some((t) => /Halbzeit|Half-time/.test(t)), 'Spieltag: Hinweis zur Halbzeit fehlt');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.join(' | ')}`);
  await p.context().close();
  return ok.done();
}
