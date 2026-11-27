import { tr } from '../core/i18n.js';

// Beschriftung der Spielerwerte (Kader, Spielerkarten); die letzten drei: Spielintelligenz (sim/mind.js, Phase 6b).
export const ATTR_LABELS = {
  pace: tr('Tempo', 'Pace'), stamina: tr('Ausdauer', 'Stamina'), technique: tr('Technik', 'Technique'), passing: tr('Passen', 'Passing'),
  shooting: tr('Schuss', 'Shooting'), tackling: tr('Zweikampf', 'Tackling'), heading: tr('Kopfball', 'Heading'), keeping: tr('Torwart', 'Goalkeeping'), strength: tr('Körper', 'Strength'),
  anticipation: tr('Antizipation', 'Anticipation'), vision: tr('Übersicht', 'Vision'), positioning: tr('Stellungsspiel', 'Positioning'),
};
