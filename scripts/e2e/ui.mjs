// Oberfläche in vier Größen: jeder Bereich/Tab des Vereinsheims öffnet ohne Fehler, ohne seitliches
// Scrollen, auf Touch ohne Schaltflächen unter 44 px; dazu die wichtigsten Interaktionen und eine
// Karriere-Runde per Liveticker bis zur nächsten Woche. Die Prüfungen stehen je Bereich unter ui/.
import { launch, SIZES } from './lib.mjs';
import { mainMenu, screens, tickerRound, whatsNew } from './ui/core.mjs';
import { crestEditor } from './ui/crest.mjs';
import { festivalAndSummer } from './ui/festival.mjs';
import { phoneAndShare } from './ui/phone.mjs';
import { platzAnlage } from './ui/platz.mjs';
import { alteHerren, alteHerrenTicker } from './ui/oldboys.mjs';
import { transferMarkt } from './ui/transfers.mjs';
import { relegation } from './ui/relegation.mjs';
import { winterBreak } from './ui/winter.mjs';

export async function run({ sizes = Object.keys(SIZES) } = {}) {
  const b = await launch();
  let fails = 0;
  for (const s of sizes) fails += await mainMenu(b, s);
  for (const s of sizes) fails += await screens(b, s);
  for (const s of sizes) fails += await whatsNew(b, s, process.env.E2E_SHOTS);
  for (const s of sizes) fails += await festivalAndSummer(b, s, process.env.E2E_SHOTS);
  for (const s of sizes) fails += await crestEditor(b, s, process.env.E2E_SHOTS);
  for (const s of sizes) fails += await platzAnlage(b, s);
  for (const s of sizes) fails += await transferMarkt(b, s, process.env.E2E_SHOTS);
  for (const s of sizes) fails += await alteHerren(b, s, process.env.E2E_SHOTS);
  fails += await alteHerrenTicker(b, process.env.E2E_SHOTS);
  for (const s of sizes) fails += await phoneAndShare(b, s);
  fails += await relegation(b);
  fails += await winterBreak(b);
  fails += await tickerRound(b);
  await b.close();
  return fails;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await run();
