// Roter Bereich der Trainer-Balken (personal.js RED, vom Nutzer entschieden 2026-10-31): Wer fast leer ist, merkt es schon vor
// der Krise. Energie im roten Bereich: eine Aktion weniger in der Woche (müde, man schafft weniger). Familie im roten Bereich:
// Die Familie kommt nicht mehr mit zu den Spielen (personal.js weeklyPersonal, der günstigere Sonntag fällt weg).
// Gemessen vorher (6 Karrieren × 4 Saisons, Trainer trainiert selbst): Energie in rund 28 % der Wochen rot.
import { tr } from '../core/i18n.js';
import { coachAway, isPresident, RED } from './personal.js';

export function startWeek(c) {
  const k = c.coach;
  const w = c.week;
  if (!k || !w || isPresident(c) || coachAway(c) || w.breakWeek) return;
  if (k.energy < RED && (w.actions ?? 0) > 0) {
    w.actions--;
    w.tired = true;
    w.chat?.push({ from: null, text: tr('Du bist platt. Diese Woche schaffst du eine Sache weniger.', "You're shattered. This week you'll get one thing less done."), time: 'Mo 06:50', tired: true });
  }
  if (k.patience < RED && k.flags?.familyAtGames && !w.familyAway) {
    w.familyAway = true;
    w.chat?.push({ from: null, text: tr('Zuhause ist dicke Luft. Sonntag kommt die Familie nicht mit an den Platz.', "There's tension at home. The family won't come to the ground on Sunday."), time: 'Mo 07:05' });
  }
}
