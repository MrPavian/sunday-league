// Jugend, Punkt 4: Wechsel ins Nachwuchsleistungszentrum (NLZ) – mit echter
// Ausbildungsentschädigung nach DFB-Jugendordnung (gültig ab 2024/25).
//
// Wechselt ein Amateur-Jugendspieler zu einem höherklassigen Verein mit Leistungszentrum,
// zahlt der aufnehmende Verein einen Grundbetrag plus einen Betrag je angefangenem Spieljahr
// beim abgebenden Verein. Die Höhe richtet sich nach der Liga der ersten Mannschaft des
// aufnehmenden Vereins und nach der Altersklasse:
//   B-/jüngere A-Jugend: Bundesliga 5.000 € + 400 €/Saison, 2. Bundesliga 2.250 € + 200 €,
//                        3. Liga 1.250 € + 100 €
//   C-/ältere D-Jugend:  Bundesliga 3.000 € + 400 €/Spieljahr
// Gezählt werden höchstens sechs Spieljahre (ab der jüngeren D-Jugend). Für C-/D-Jugendliche
// nennt der DFB nur die Bundesliga-Beträge – deshalb holen bei uns nur Bundesliga-NLZ so junge
// Spieler.
//
// NLZ-Scouts schauen vor allem an den DFB-Stützpunkten. Ob es klappt, zeigt das Probetraining:
// Wer nur groß war (Frühentwickler), fällt dort oft durch.
import { tr } from '../core/i18n.js';
import { PRO_CLUBS, proClubIndex } from './poaching.js';
import { looksStrength } from './kidpersona.js';

export const NLZ_RATES = {
  bl: { label: tr('Bundesliga', 'Bundesliga'), older: [5000, 400], younger: [3000, 400] },
  bl2: { label: tr('2. Bundesliga', '2. Bundesliga'), older: [2250, 200], younger: null },
  bl3: { label: tr('3. Liga', '3. Liga'), older: [1250, 100], younger: null },
};
export const MAX_YEARS = 6;
export const NLZ_MIN_AGE = 12; // ältere D-Jugend
export const NLZ_MAX_AGE = 15; // bei uns endet die Jugend mit der B-Jugend
export const TRIAL_BAR = 0.9; // gemessen: angefragt werden Kinder mit 0,82–1,0; wer nur durch Größe auffiel, fällt durch

// Ausgedachte Vereine mit Leistungszentrum: die ersten vier Bundesliga, dann 2. und 3. Liga.
export const nlzTier = (club) => {
  const i = proClubIndex(club);
  return i < 4 ? 'bl' : i < 7 ? 'bl2' : 'bl3';
};

// Altersklasse: B-Jugend (15) gilt als „älter", C (13–14) und ältere D (12) als „jünger".
export const ageBand = (age) => (age >= 15 ? 'older' : 'younger');

// Spieljahre bei uns, gezählt ab der jüngeren D-Jugend (11), höchstens sechs, mindestens eins.
export function yearsAtClub(k, season) {
  const since = k.since ?? season - Math.max(0, k.age - 8); // alte Spielstände: seit der E-Jugend
  const joinedAge = k.age - (season - since);
  const from = Math.max(11, joinedAge);
  return Math.max(1, Math.min(MAX_YEARS, k.age - from + 1));
}

export function nlzCompensation(k, club, season) {
  const rate = NLZ_RATES[nlzTier(club)][ageBand(k.age)];
  if (!rate) return null;
  return rate[0] + rate[1] * yearsAtClub(k, season);
}

// Welcher Verein meldet sich? Für C-/D-Jugend nur Bundesliga (siehe oben).
export function nlzClub(k, rng) {
  const options = PRO_CLUBS.filter((cl) => NLZ_RATES[nlzTier(cl)][ageBand(k.age)]);
  return options[Math.floor(rng.next() * options.length)];
}

// Wen sehen die Scouts? Stützpunkt-Kinder fast immer, sonst nur, wer richtig auffällt.
export const scoutsNotice = (k) => k.age >= NLZ_MIN_AGE && k.age <= NLZ_MAX_AGE && !k.nlzSeen && (k.stuetzpunkt || looksStrength(k) >= 0.9);

// Probetraining: Dort sieht man das echte Talent (keine Größe mehr).
export const passesTrial = (k) => (k.talent ?? 0) >= TRIAL_BAR;
