// Besondere Fähigkeiten – bewusst bodenständig, nie überzeichnet.
export const TRAITS = {
  schnell: { name: 'Sehr schneller Läufer', desc: 'Höheres Grundtempo.' },
  pferdelunge: { name: 'Pferdelunge', desc: 'Ermüdet deutlich langsamer.' },
  gutes_auge: { name: 'Gutes Auge für Mitspieler', desc: 'Sieht Anspielstationen auch im Augenwinkel, präzisere Pässe.' },
  anfuehrer: { name: 'Anführer', desc: 'Mitspieler in der Nähe ermüden langsamer.' },
  teamchemie: { name: 'Steigert die Teamchemie', desc: 'Hält die Truppe zusammen (wirkt ab der Saison-Phase).' },
  ballsicher: { name: 'Ruhe am Ball', desc: 'Weniger verunglückte Ballkontakte.' },
};

export const TRAIT_IDS = Object.keys(TRAITS);

export const hasTrait = (player, id) => player.traits.includes(id);
