// Einhängepunkte für neue Funktionsmodule (Alte Herren, Transfermarkt …): Ein Modul trägt sich in FEATURES ein und
// liefert, was es braucht – create, migrate, startWeek, finishRound, nextSeason(career, summary) –, statt career.js an
// vier Stellen zu ändern. Die Hooks laufen nach allem Bestehenden, in der Reihenfolge der Liste (neue Einträge hinten).
// Ältere Module (Fest, Tim, Platz …) hängen noch direkt in career.js; deren Reihenfolge bestimmt den Zufall und bleibt.
// Einträge als Namensraum-Import (`import * as x from './x.js'`), damit Kreisimporte mit career.js unschädlich sind.
import * as transfers from './transfers.js'; // Transfermarkt
import * as oldboys from './oldboys.js'; // Alte Herren
import * as women from './women.js'; // Frauenteam
import * as scouting from './scouting.js'; // Scouting
import * as teamtraining from './teamtraining.js'; // Trainingsplan
import * as referees from './referees.js'; // Schiedsrichter mit Gesicht
import * as rivals from './rivals.js'; // Rivalitäten
export const FEATURES = [transfers, oldboys, women, scouting, teamtraining, referees, rivals];

export function runHooks(name, career, ...args) {
  for (const f of FEATURES) f[name]?.(career, ...args);
}
