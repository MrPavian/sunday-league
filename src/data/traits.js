// Besondere Fähigkeiten – bewusst bodenständig, nie überzeichnet.
import { tr } from '../core/i18n.js';
export const TRAITS = {
  schnell: { name: tr('Sehr schneller Läufer', 'Very quick runner'), desc: tr('Höheres Grundtempo.', 'Higher base pace.') },
  pferdelunge: { name: tr('Pferdelunge', 'Engine of a horse'), desc: tr('Ermüdet deutlich langsamer.', 'Tires much more slowly.') },
  gutes_auge: { name: tr('Gutes Auge für Mitspieler', 'Good eye for a pass'), desc: tr('Sieht Anspielstationen auch im Augenwinkel, präzisere Pässe.', 'Spots team-mates out of the corner of his eye, more accurate passes.') },
  anfuehrer: { name: tr('Anführer', 'Leader'), desc: tr('Mitspieler in der Nähe ermüden langsamer.', 'Nearby team-mates tire more slowly.') },
  teamchemie: { name: tr('Steigert die Teamchemie', 'Boosts team spirit'), desc: tr('Hält die Truppe zusammen (wirkt ab der Saison-Phase).', 'Keeps the squad together (works in career mode).') },
  ballsicher: { name: tr('Ruhe am Ball', 'Calm on the ball'), desc: tr('Weniger verunglückte Ballkontakte.', 'Fewer botched touches.') },
  kopfball: { name: tr('Kopfballungeheuer', 'Aerial monster'), desc: tr('Kommt an hohe Bälle ran und köpft sie gezielt.', 'Wins high balls and heads them with purpose.') },
  hammer: { name: tr('Strammer Schuss', 'Thunderous shot'), desc: tr('Zieht aus der Distanz ab – nicht immer genau.', 'Shoots from distance – not always on target.') },
  meckerer: { name: tr('Meckerer', 'Moaner'), desc: tr('Beschwert sich nach jedem Zweikampf – und steht dabei rum.', 'Complains after every challenge – and stands around doing it.') },
  raucher: { name: tr('Raucher', 'Smoker'), desc: tr('In der Halbzeit an der Eckfahne. Geht schneller die Puste aus.', 'Spends half-time at the corner flag. Runs out of breath sooner.') },
  hart_im_nehmen: { name: tr('Hart im Nehmen', 'Tough as nails'), desc: tr('Schürfwunden stören kaum – grätscht auch mal auf Asche.', 'Grazes barely bother him – will even slide on cinders.') },
  ex_profi: { name: tr('Ex-Profi', 'Ex-pro'), desc: tr('Hat ganz oben gespielt. Kaum Fehler am Ball, die Mitspieler laufen neben ihm mehr.', 'Played at the very top. Hardly ever misplaces the ball, and team-mates run more alongside him.') },
};

export const TRAIT_IDS = Object.keys(TRAITS);

// Was zufällig vergeben werden kann – "Ex-Profi" gibt es nur mit Lebenslauf.
export const RANDOM_TRAIT_IDS = TRAIT_IDS.filter((id) => id !== 'ex_profi');

export const hasTrait = (player, id) => player.traits.includes(id);
