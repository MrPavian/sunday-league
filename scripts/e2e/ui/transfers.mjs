// Oberfläche: Transfermarkt (Reiter „Transfers“ in Mannschaft). Vier Unterbereiche, Spielersuche mit Filtern, Anfrage und Gespräch,
// Angebote für eigene Spieler, Meldungen; kein seitliches Scrollen, auf Touch keine Schaltflächen unter 44 px.
import { createCareer, humanClub } from '../../../src/career/career.js';
import { listPlayer } from '../../../src/career/transfers.js';
import { checker, click, hScroll, page, settle, SIZES, smallTargets } from '../lib.mjs';
import { NARROW_OK } from './core.mjs';

export async function transferMarkt(b, size, shots) {
  const ok = checker(`Transfermarkt (${size})`);
  // Kreisklasse C (Entschädigung 250 €), Sommerperiode offen, ein Angebot für den besten Spieler auf der Liste.
  const c = createCareer({ seed: 5 });
  c.level = 2;
  humanClub(c).venue = 'rasenplatz';
  c.cash = 900;
  const me = humanClub(c);
  const best = [...me.squad].filter((i) => i !== c.coach?.idx)[0];
  const rival = c.clubs.find((x) => !x.human);
  listPlayer(c, best, true);
  c.transfers.neighbors = []; // neu ziehen für die Kreisklasse C (Nachbarliga) beim Laden
  c.transfers.neighborKey = null;
  c.transfers.offers.push({ id: 1, idx: best, club: rival.id, key: `${c.season}:summer`, kind: 'summer', base: 250, fee: 250, wish: false, counter: false });
  c.transfers.nextOffer = 2;
  const p = await page(b, size, { query: '?notitle&debug', store: { 'sunday-league:career': JSON.stringify(c) } });
  const shot = async (name) => shots && (await p.screenshot({ path: `${shots}/${name}-${size}.png` }));
  const layout = async (label) => {
    await settle(p);
    ok(!(await hScroll(p)), `${label}: seitliches Scrollen`);
    ok(await p.evaluate(() => { const t = document.querySelector('[data-testid="tf"]'); return !t || t.scrollWidth <= t.clientWidth + 1; }), `${label}: Transfers läuft über den Rand`);
    if (SIZES[size].touch) {
      const s = await smallTargets(p, '#club [data-testid="tf"] button, #club [data-testid="tf"] .ui-tabs button', NARROW_OK);
      ok(!s.length, `${label}: Schaltflächen < 44 px: ${s.slice(0, 3).join(', ')}`);
    }
  };
  await click(p, '.career [data-c="continue"]');
  await p.waitForTimeout(1500);
  await click(p, '[data-action="area"][data-value="team"]');
  await p.evaluate(() => document.querySelector('[data-action="tab"][data-value="transfers"]')?.click());
  await p.waitForTimeout(400);
  ok(!!(await p.$('[data-testid="tf"]')), 'Reiter Transfers fehlt');
  const subs = await p.$$eval('[data-testid="tf"] .ui-tabs [data-action="tfSub"]', (e) => e.map((x) => x.dataset.value));
  ok(subs.join() === 'rumors,market,own,news', `Unterbereiche: ${subs.join()}`);
  // Gerüchteküche wie bisher
  ok(!!(await p.$('.rumor-board .rumor')), 'Gerüchteküche zeigt keine Gerüchte');
  await layout('Gerüchteküche');
  await shot('transfers-geruechte');
  // Spielersuche
  await click(p, '[data-action="tfSub"][data-value="market"]');
  await p.waitForTimeout(300);
  ok(/Wechselperiode offen/.test(await p.textContent('[data-testid="tf-banner"]')), 'Banner: Wechselperiode nicht als offen angezeigt');
  const rows = await p.$$eval('[data-testid="tf-row"]', (e) => e.length);
  ok(rows > 10 && rows <= 40, `Spielersuche: ${rows} Zeilen`);
  await layout('Spielersuche');
  await shot('transfers-suche');
  await click(p, '[data-action="tfFilter"][data-group="pos"][data-value="gk"]');
  await p.waitForTimeout(200);
  const gk = await p.$$eval('[data-testid="tf-row"] .tf-meta', (e) => e.map((x) => x.textContent));
  ok(gk.length > 0 && gk.every((t) => /Torwart/.test(t)), 'Positionsfilter Torwart greift nicht');
  await click(p, '[data-action="tfFilter"][data-group="pos"][data-value="all"]');
  await click(p, '[data-action="tfFilter"][data-group="scope"][data-value="neighbor"]');
  await p.waitForTimeout(200);
  const nb = await p.$$eval('[data-testid="tf-row"] .tf-meta', (e) => e.map((x) => x.textContent));
  ok(nb.length > 0 && nb.every((t) => /Nachbarliga/.test(t)), 'Ligafilter Nachbarliga greift nicht');
  await click(p, '[data-action="tfFilter"][data-group="scope"][data-value="own"]');
  await p.waitForTimeout(200);
  // Detail, Anfrage, Gespräch
  await click(p, '[data-testid="tf-row"]:last-child');
  await p.evaluate(() => document.querySelector('[data-testid="tf-list"] li:last-child [data-testid="tf-row"]')?.click());
  await p.waitForTimeout(300);
  ok(!!(await p.$('[data-testid="tf-back"]')), 'Detailansicht: Zurück-Knopf fehlt');
  await layout('Spielerdetail');
  await shot('transfers-detail');
  await click(p, '[data-testid="tf-ask"]');
  await p.waitForTimeout(300);
  ok(/Freigabe|Verein/.test(await p.textContent('[data-testid="tf-note"]')), 'Anfrage: keine Rückmeldung');
  ok(!!(await p.$('[data-action="tfTalk"]')), 'Nach der Anfrage fehlt der Schritt „Mit ihm reden“');
  await layout('Spielerdetail nach Anfrage');
  await click(p, '[data-testid="tf-talk"]');
  await p.waitForTimeout(300);
  ok((await p.$$('[data-action="tfArgue"]')).length >= 5, 'Gespräch: Argumente fehlen');
  await click(p, '[data-action="tfArgue"][data-value$=":kumpels"]');
  await p.waitForTimeout(200);
  await click(p, '[data-action="tfArgue"][data-value$=":erfolg"]');
  await p.waitForTimeout(300);
  ok(!!(await p.$('.tf-step .reply')), 'Gespräch: keine Antwort des Spielers');
  await layout('Spielerdetail nach Gespräch');
  await shot('transfers-gespraech');
  await click(p, '[data-testid="tf-back"]');
  // Eigene Spieler: Angebot annehmen
  await click(p, '[data-action="tfSub"][data-value="own"]');
  await p.waitForTimeout(300);
  ok(!!(await p.$('[data-testid="tf-offer"]')), 'Eigene Spieler: Angebot fehlt');
  ok((await p.$$('[data-testid="tf-list-btn"]')).length >= 6, 'Eigene Spieler: Listenknöpfe fehlen');
  await layout('Eigene Spieler');
  await shot('transfers-eigene');
  const before = await p.$$eval('.tf-own', (e) => e.length);
  await click(p, '[data-testid="tf-accept"]');
  await p.waitForTimeout(400);
  ok(!(await p.$('[data-testid="tf-offer"]')), 'Angebot nach der Zusage noch da');
  ok((await p.$$eval('.tf-own', (e) => e.length)) === before - 1, 'Spieler nach dem Wechsel noch im Kader');
  // Fristen & Meldungen
  await click(p, '[data-action="tfSub"][data-value="news"]');
  await p.waitForTimeout(300);
  ok(/Wechselperiode I/.test(await p.textContent('.tf-rules')), 'Fristen: Wechselperiode I fehlt');
  ok(/wechselt zu/.test(await p.textContent('[data-testid="tf-log"]')), 'Meldungen: Wechsel nicht im Kreisblatt');
  await layout('Fristen & Meldungen');
  await shot('transfers-meldungen');
  ok(!p.errors.length, `Seitenfehler: ${p.errors.slice(0, 2).join(' | ')}`);
  await p.context().close();
  return ok.done();
}

