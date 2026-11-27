// Taktische Muster des Gegners (Gameplay 2.0, Punkt 30): Jeder Gegnertrainer hat eine Handschrift, passend zu seinem Typ
// (opponents.js coachOf). Sie wirkt im Spiel als Befehl (sim/plan.js ORDER_EFFECTS), das Scouting zeigt sie, und der Co-Trainer
// nennt ein Gegenmittel – nur dort, wo es gemessen hilft (tests/patterns.test.js, Messung im Kommentar je Muster).
import { tr } from '../core/i18n.js';
import { coachOf } from './opponents.js';

// Gemessen (sportplatz, je 120 Spiele, Torverhältnis aus unserer Sicht ohne → mit Gegenmittel): Pressing −0,08 → +0,24 (lang
// spielen); lange Bälle −0,28 → +0,04 (tief stehen); Konter −0,17 → +0,05 (ruhiges Tempo; tief stehen nur −0,13); Mauern +0,08 –
// Kombinationsspiel +0,06, Aufrücken −0,21, über außen −0,12 (60 Spiele): kein Gegenmittel.
// Neu gemessen (AFS Phase 8, 2026-11-27, scripts/afs-plan.mjs, heutige Engine, 4 Paarungen, gepaarte Seeds, Δ Tordifferenz / Δ xG-
// Differenz für die Mannschaft mit Gegenmittel): Pressing → lang spielen: Sportplatz +0,21 (t 2,1) / +0,15 (t 2,7), Hinterhof
// +0,09 / +0,16 (t 2,5), Rasenplatz und Großfeld xG +0,10 / +0,13 (nicht gesichert) – bleibt. Lange Bälle → tief stehen und
// Konter → ruhiges Tempo: auf keinem der vier Plätze belegt (Tore −0,24 … +0,11, |t| ≤ 1,6) – kein Gegenmittel mehr
// (Nutzerentscheid 2026-11-27). Die CPU nutzt dieselben Gegenmittel (intel/matchplan.js).
// orders – Befehle des Gegners; counter – Gegenmittel als Befehl für uns (null: keins, das messbar hilft); hint – Satz des Co-Trainers.
export const PATTERNS = {
  pressing: {
    label: tr('Hohes Pressing', 'High press'),
    orders: { press: 'hoch' },
    counter: { group: 'build', value: 'direkt' },
    hint: tr('Die laufen uns vorne an. Nicht hinten rumspielen – lang raus, dann ist die Mitte leer.', 'They will press us high. Do not play it around at the back – go long, then the middle is empty.'),
  },
  lang: {
    label: tr('Lange Bälle auf die Spitze', 'Long balls up front'),
    orders: { build: 'direkt' },
    counter: null,
    hint: tr('Die schlagen alles lang. Auf die zweiten Bälle achten – ein Patentrezept gibt es nicht.', 'They hit everything long. Watch the second balls – there is no magic formula.'),
  },
  mauern: {
    label: tr('Mauern', 'Park the bus'),
    orders: { press: 'tief', shape: 'kompakt' },
    counter: null,
    hint: tr('Die stellen sich hinten rein. Geduld – ein Patentrezept gibt es nicht.', 'They will sit deep. Patience – there is no magic formula.'),
  },
  konter: {
    label: tr('Lauern auf Konter', 'Waiting to counter'),
    orders: { route: 'konter' },
    counter: null,
    hint: tr('Die warten auf unsere Fehler. Den Ball nicht leichtfertig verlieren – ein Patentrezept gibt es nicht.', 'They are waiting for our mistakes. Do not give the ball away cheaply – there is no magic formula.'),
  },
  // AFS Phase 6: Ballbesitz-Trainer. Gemessen (scripts/afs-effects.mjs): Ball halten hebt den eigenen Ballbesitz um 2–3
  // Prozentpunkte und senkt die eigenen xG (−0,20 bis −0,44 je Spiel). Ein Gegenmittel ist nicht gemessen.
  ballbesitz: {
    label: tr('Ballbesitz', 'Possession'),
    orders: { build: 'halten' },
    counter: null,
    hint: tr('Die lassen den Ball laufen und gehen wenig Risiko. Nicht nervös werden – gefährlich werden die selten.', 'They keep the ball and take few risks. Do not get nervous – they rarely carve you open.'),
  },
};

// Welche Handschriften passen zu welchem Trainertyp? (Kumpeltyp: keine feste.)
const BY_TYPE = { grossmaul: ['pressing'], oldschool: ['lang', 'mauern'], stratege: ['konter', 'pressing'], kumpeltyp: [], ballbesitz: ['ballbesitz'] };

const hash = (s) => [...String(s)].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0), 2166136261);

// Handschrift eines Gegners (Schlüssel aus PATTERNS) oder null.
export function patternOf(club) {
  if (!club || club.human) return null;
  const list = BY_TYPE[coachOf(club).type] ?? [];
  return list.length ? list[hash(`${club.id}:muster`) % list.length] : null;
}

// Befehle für das Spiel (career.js tacticOf).
export const patternOrders = (club) => ({ ...(PATTERNS[patternOf(club)]?.orders ?? {}) });
