// Ausrüstervertrag (ROADMAP 11.10, vom Nutzer gewünscht): Ein Teamsport-Ausrüster gibt Rabatt auf die Trikotsätze und ab
// einer Liga Freiware. Alle Marken sind erfunden – keine echten Hersteller oder Händler.
//
// Eckdaten aus Angeboten von Teamsport-Händlern (abgerufen 2026-10-29; Anbieterangaben, frei verhandelbar):
//  - Laufzeit meist drei Jahre (https://www.sportdeal24.de/ausruestungsvertrag, https://sportverein.marketing/ausruestervertraege/)
//  - Standardrabatt ab 40 %, bis 50 % auf den Listenpreis, je nach Marke (ebd.)
//  - Freiware je nach Umsatz und Liga (https://www.ts-teamwear.de/Vereinsfoerderung)
// Spielwerte: welche Marke welchen Rabatt gibt und ab welcher Liga es Freiware gibt (ein Trikotsatz je Saison gratis).
import { tr } from '../core/i18n.js';
import { KIT_COST } from './finances.js';
import { chronicle } from './sagas.js';

export const OUTFITTER_SEASONS = 3;
export const OUTFITTERS = [
  { id: 'kanalsport', name: 'Kanalsport Teamwear', discount: 0.4, freeFrom: 6, line: tr('Der Händler um die Ecke, mit Beflockung im Hinterzimmer.', 'The shop round the corner, with printing in the back room.') },
  { id: 'torwerk', name: 'Torwerk', discount: 0.5, freeFrom: null, line: tr('Halber Preis, aber keine Geschenke – „Freiware gibt es bei uns nicht."', 'Half price, but no freebies – "We don\'t do free kit."') },
  { id: 'flanke', name: 'Flanke 76', discount: 0.35, freeFrom: 5, line: tr('Etwas teurer, dafür ab der Bezirksliga ein Satz im Jahr umsonst.', 'A bit pricier, but from the county league up one free set a year.') },
  { id: 'pfosten', name: 'Pfostenschuss Sport', discount: 0.45, freeFrom: 8, line: tr('Rüstet auch Oberligisten aus und lässt das gern fallen.', 'Also kits out Oberliga clubs and likes to mention it.') },
];
export const outfitterDef = (id) => OUTFITTERS.find((o) => o.id === id);

// Laufender Vertrag (bis einschließlich Saison until), sonst null.
export const outfitterOf = (c) => (c.outfitter && c.season <= c.outfitter.until ? c.outfitter : null);

// Angebote ohne laufenden Vertrag: zwei Marken je Saison, fest aus Seed und Saison.
export function outfitterOffers(c) {
  if (outfitterOf(c)) return [];
  const h = ((c.seed ?? 0) * 31 + (c.season ?? 1) * 17) >>> 0;
  const a = h % OUTFITTERS.length;
  const b = (a + 1 + (h >>> 3) % (OUTFITTERS.length - 1)) % OUTFITTERS.length;
  return [OUTFITTERS[a], OUTFITTERS[b]];
}

export function signOutfitter(c, id) {
  const def = outfitterDef(id);
  if (!def || outfitterOf(c) || !outfitterOffers(c).includes(def)) return false;
  c.outfitter = { id, since: c.season, until: c.season + OUTFITTER_SEASONS - 1, freeUsed: null };
  chronicle(c, tr(`Ausrüstervertrag mit ${def.name} für ${OUTFITTER_SEASONS} Saisons.`, `Kit supplier deal with ${def.name} for ${OUTFITTER_SEASONS} seasons.`));
  return true;
}

// Freiware in dieser Saison noch offen?
export const freeKitLeft = (c) => {
  const o = outfitterOf(c);
  const def = o && outfitterDef(o.id);
  return !!(def?.freeFrom && (c.level ?? 1) >= def.freeFrom && o.freeUsed !== c.season);
};
// Preis eines neuen Trikotsatzes (Heim und Auswärts) mit Ausrüster; Freiware zuerst.
export function kitPrice(c) {
  const o = outfitterOf(c);
  if (!o) return KIT_COST;
  if (freeKitLeft(c)) return 0;
  return Math.round(KIT_COST * (1 - outfitterDef(o.id).discount));
}
// Beim Kauf: Freiware verbrauchen.
export function useKitDeal(c) {
  if (freeKitLeft(c)) c.outfitter.freeUsed = c.season;
}
