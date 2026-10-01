// Jugend, Punkt 2: Kinder sind verschieden.
//
// Entwicklung (relativer Alterseffekt): Kinder eines Jahrgangs liegen biologisch bis zu
// sechs Jahre auseinander. Frühentwickler sind größer, schneller, kräftiger – sie sehen
// besser aus, als sie sind, und gewinnen die Turniere. Spätentwickler wirken schwächer,
// sitzen bei Turnieren draußen und hören eher auf; wer bleibt, holt ab 13 auf und überholt
// oft (Spätgeborene aus NLZ-U19 schaffen es häufiger zu den Profis). Wer die Kleinen nur
// nach Größe aufstellt, verliert die Spätzünder.
//
// Schule: Manche haben Stress (Klassenarbeiten, Zeugnis). Dann fehlen sie im Training,
// und vor dem Zeugnis drohen die Eltern mit Fußballverbot.
//
// Eltern: ehrgeizig (Druck vom Rand), engagiert (fahren, helfen, spenden), desinteressiert
// (keiner holt ab, das Kind hört leichter auf), überbehütend (bei Regen zu Hause, Kondition
// ist „zu hart").
import { tr } from '../core/i18n.js';

export const BLOOM = {
  frueh: { label: tr('Frühentwickler', 'Early developer'), hint: tr('Größer und schneller als die anderen – noch.', 'Bigger and faster than the others – for now.') },
  normal: { label: '', hint: '' },
  spaet: { label: tr('Spätentwickler', 'Late developer'), hint: tr('Klein und schmal. Kommt später – wenn er dabeibleibt.', 'Small and slight. Comes good later – if he sticks with it.') },
};
export const SCHOOL = {
  locker: { label: '' },
  stress: { label: tr('Schulstress', 'School stress') },
};
export const PARENTS = {
  ehrgeizig: { label: tr('ehrgeizige Eltern', 'pushy parents') },
  engagiert: { label: tr('engagierte Eltern', 'helpful parents') },
  desinteressiert: { label: tr('Eltern nie da', 'parents never there') },
  ueberbehuetend: { label: tr('überbehütende Eltern', 'overprotective parents') },
};

const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
};
// Fester Würfel aus der Kind-ID (auch für alte Spielstände ohne diese Felder).
const roll = (k, salt) => (hash(`${k.id ?? k.name}|${salt}`) % 10000) / 10000;

// Anteile: etwa ein Fünftel deutlich früher, ein Fünftel deutlich später entwickelt.
export function persona(k) {
  if (!k.bloom) {
    const r = roll(k, 'bloom');
    k.bloom = r < 0.2 ? 'frueh' : r > 0.8 ? 'spaet' : 'normal';
  }
  k.school ??= roll(k, 'school') < 0.3 ? 'stress' : 'locker';
  if (!k.parentSet) {
    // Bestehende Eltern (ehrgeizig, engagiert) bleiben; sonst neu verteilt.
    if (!k.parent) {
      const r = roll(k, 'parent');
      k.parent = r < 0.1 ? 'desinteressiert' : r < 0.18 ? 'ueberbehuetend' : null;
    }
    k.parentSet = true;
  }
  return k;
}

// Körperlicher Vorsprung (sichtbar, nicht echt): Frühentwickler bis 12 deutlich vorn, mit
// 15 holen die anderen auf. Spätentwickler hinken bis 13 hinterher.
export function physEdge(k) {
  const b = k.bloom ?? 'normal';
  if (b === 'normal') return 0;
  const age = k.age ?? 10;
  if (b === 'frueh') return age <= 12 ? 0.14 : age === 13 ? 0.09 : age === 14 ? 0.04 : 0;
  return age <= 12 ? -0.12 : age === 13 ? -0.08 : age === 14 ? -0.03 : 0;
}
// Wie stark es auf dem Platz aussieht (Turniere, Aufstellung nach Augenschein).
export const looksStrength = (k) => Math.max(0, Math.min(1, (k.talent ?? 0) + physEdge(k)));

// Wachstumsfaktor im Training: Spätentwickler holen ab 13 auf, Frühentwickler stagnieren
// dann etwas (sie mussten sich nie durchsetzen).
export function bloomGrowth(k) {
  const age = k.age ?? 10;
  if (k.bloom === 'spaet') return age >= 13 ? 1.5 : 1;
  if (k.bloom === 'frueh') return age >= 13 ? 0.8 : 1;
  return 1;
}

// Klassenarbeitswochen: In etwa jeder vierten Woche fehlt ein Kind mit Schulstress.
// Und wer Fußballverbot hat (Zeugnis), fehlt sowieso.
export const missesTraining = (k, round) => (k.banUntil ?? -1) > round || (k.school === 'stress' && hash(`${k.id ?? k.name}|${round}`) % 4 === 0);

// Spaß-Wirkung der Eltern pro Woche.
export function parentJoy(k, focus, weather) {
  if (k.parent === 'ehrgeizig') return -0.01;
  if (k.parent === 'engagiert') return 0.005;
  if (k.parent === 'desinteressiert') return -0.005;
  if (k.parent === 'ueberbehuetend') return focus === 'kondition' ? -0.02 : ['regen', 'schnee', 'frost'].includes(weather) ? -0.01 : 0;
  return 0;
}

// Aufhör-Risiko zum Saisonende (zusätzlich zum Grundrisiko).
export function quitExtra(k) {
  let v = 0;
  if (k.parent === 'desinteressiert') v += 0.08;
  if (k.school === 'stress' && (k.age ?? 0) >= 13) v += 0.03;
  return v;
}

export function personaTags(k) {
  persona(k);
  return [BLOOM[k.bloom].label && { text: BLOOM[k.bloom].label, title: BLOOM[k.bloom].hint }, SCHOOL[k.school].label && { text: SCHOOL[k.school].label, title: tr('Fehlt in Klassenarbeitswochen', 'Misses training in exam weeks') }, k.parent && PARENTS[k.parent] && { text: PARENTS[k.parent].label }].filter(Boolean);
}
