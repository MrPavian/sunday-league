// Schlechte Laune im Team (Nutzerwunsch 2026-11-04): Wer grummelt, steckt andere an – Grüppchen in der Kabine, dann eine
// Aussprache mit dem Mannschaftsrat. Bleibt der Trainer stur, ist das Klima vergiftet, bis sich alle beruhigt haben.
// Gestreikt wird nicht als Mannschaft, sondern einzeln, um einen Wechsel zu erzwingen (poaching.js wechselstreik,
// Nutzerklarstellung). Schwellen und Wirkungen sind Spielwerte.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { humanClub } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { outcome } from './outcomes.js';
import { adjustEnergy, isCoach } from './personal.js';

// Ab so viel Druck (Unzufriedene, siehe pressure) wird es eine Sache des Teams (Spielwerte).
export const UNREST_MIN = [2, 2]; // Grüppchen, Mannschaftsrat

const state = (c) => ((c.flags ??= {}).unrest ??= { stage: 0, round: -1, season: c.season ?? 1 });
export const grumblers = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx) && (c.players[idx]?.grumpy ?? 0) > 0);
// Unzufriedene: wer gerade grummelt. Bankfrust zählt nicht direkt (in jedem Kader sitzen einige draußen) – er führt
// über Abwerben und Wechselwünsche zum Grummeln.
export const unhappy = (c) => grumblers(c);
// Druck im Team: Grummler, dazu Punkte für miese Stimmung (Spielwerte).
export const pressure = (c) => grumblers(c).length + ((c.mood ?? 0) <= -0.2 ? 1 : 0) + ((c.mood ?? 0) <= -0.5 ? 1 : 0);
export const unrestStage = (c) => c.flags?.unrest?.stage ?? 0;
const setStage = (c, stage) => Object.assign(state(c), { stage, round: c.round ?? 0, season: c.season ?? 1 });
const later = (c) => {
  const s = state(c);
  return s.season !== c.season || (c.round ?? 0) > s.round;
};
// Frieden: Wer grummelt, kriegt sich ein; das Team atmet durch.
function calm(c, weeks = 0) {
  for (const idx of humanClub(c).squad) if (c.players[idx]) c.players[idx].grumpy = Math.min(c.players[idx].grumpy ?? 0, weeks);
  setStage(c, 0);
}
const due = (c, stage) => unrestStage(c) === stage && later(c) && pressure(c) >= UNREST_MIN[stage] && (c.mood ?? 0) <= 0.1;

// Wöchentlich (events.js weeklyMood): Ist kaum noch jemand sauer, flaut die Unruhe eine Stufe ab.
// Ansteckung: Wer richtig sauer ist (noch 2+ Wochen), zieht bei mieser Stimmung manchmal einen Mitspieler mit (Spielwert).
export const CONTAGION = 0.25;
export function weeklyUnrest(c) {
  if ((c.mood ?? 0) <= 0) {
    const squad = humanClub(c).squad.filter((idx) => c.players[idx] && !isCoach(c, idx));
    const rng = createRng(((c.seed ?? 0) * 31 + (c.season ?? 1) * 977 + (c.round ?? 0) * 61 + 4301) >>> 0);
    for (const idx of squad.filter((i) => (c.players[i].grumpy ?? 0) >= 2)) {
      if (!rng.chance(CONTAGION)) continue;
      const calmOnes = squad.filter((i) => !(c.players[i].grumpy > 0));
      if (calmOnes.length) c.players[calmOnes[Math.floor(rng.next() * calmOnes.length)]].grumpy = 2;
    }
  }
  const s = c.flags?.unrest;
  if (s?.stage >= 2) adjustMood(c, -0.02); // vergiftetes Klima
  if (s?.stage > 0 && pressure(c) < 2) s.stage--;
}

export const UNREST_EVENTS = {
  grueppchen: {
    weight: 4,
    needs: (c) => (due(c, 0) ? {} : null),
    text: (c) => tr(`In der Kabine gibt es Grüppchen. ${unhappy(c).length} Spieler sind sauer und stecken die Köpfe zusammen, die anderen ziehen sich schweigend um.`, `There are cliques in the dressing room. ${unhappy(c).length} players are unhappy and huddle together, the others change in silence.`),
    options: [
      { label: tr('Kabinenansprache: alle an einen Tisch', 'Dressing-room talk: everyone round one table'), effect: outcome([
        { w: (c) => 2 + 2 * (c.mood ?? 0), run: (c) => (calm(c, 1), adjustMood(c, 0.04), tr('Es wird laut, dann ehrlich. Am Ende klatschen sie sich ab.', 'It gets loud, then honest. In the end they high-five.')) },
        { w: 1, run: (c) => (setStage(c, 1), tr('Alle nicken – und danach stehen die Grüppchen wieder zusammen.', 'Everyone nods – and afterwards the cliques stand together again.')) },
      ]) },
      { label: tr('Grüppchen im Training mischen (Kraft)', 'Mix the cliques in training (energy)'), effect: outcome([
        { w: 2, run: (c) => (adjustEnergy(c, -4), calm(c, 1), adjustMood(c, 0.02), tr('Neue Paare beim Passspiel, gemischte Teams im Abschlussspiel. Es wirkt.', 'New pairs for passing drills, mixed teams in the practice match. It works.')) },
        { w: 1, run: (c) => (adjustEnergy(c, -4), setStage(c, 1), tr('Sie spielen mit, aber jeder passt zu seinen Leuten.', 'They go along with it, but everyone passes to their own people.')) },
      ]) },
      { label: tr('Das regelt sich von selbst', 'It will sort itself out'), effect: (c) => (setStage(c, 1), adjustMood(c, -0.03), tr('Es regelt sich nicht. Der Ton im Chat wird rauer.', 'It does not sort itself out. The tone in the chat gets rougher.')) },
    ],
  },

  mannschaftsrat: {
    weight: 6,
    needs: (c) => (due(c, 1) ? {} : null),
    text: () => tr('Der Mannschaftsrat bittet um ein Gespräch: Einsatzzeiten, der Ton im Training, die Mannschaftskasse. „So geht das nicht weiter."', 'The players’ council asks for a meeting: game time, the tone in training, the team kitty. "It cannot go on like this."'),
    options: [
      { label: tr('Zuhören und Zugeständnisse machen (50 € in die Mannschaftskasse)', 'Listen and make concessions (€50 into the team kitty)'), effect: (c) => (book(c, tr('Mannschaftskasse: Zugeständnis', 'Team kitty: concession'), -50), calm(c, 0), adjustMood(c, 0.06), tr('Ihr einigt euch. Die Stimmung ist besser – und alle wissen jetzt, dass Reden hilft.', 'You reach an agreement. The mood lifts – and everyone now knows that talking helps.')) },
      { label: tr('Aussprache, aber in der Sache hart bleiben', 'Talk it through, but stand firm'), effect: outcome([
        { w: (c) => 2 + 2 * (c.mood ?? 0), run: (c) => (calm(c, 1), adjustMood(c, 0.02), tr('Sie akzeptieren deine Linie, weil du sie erklärst.', 'They accept your line because you explain it.')) },
        { w: 2, run: (c) => (setStage(c, 2), adjustMood(c, -0.03), tr('Der Rat geht ohne Handschlag. Die Stimmung bleibt im Keller.', 'The council leaves without a handshake. The mood stays at rock bottom.')) },
      ]) },
      { label: tr('Abblocken: Hier entscheidet der Trainer', 'Shut it down: the manager decides here'), effect: (c) => (setStage(c, 2), adjustMood(c, -0.06), tr('Funkstille. Das Klima in der Kabine ist vergiftet.', 'Radio silence. The atmosphere in the dressing room is poisonous.')) },
    ],
  },
};
