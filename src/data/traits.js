// Besondere Fähigkeiten – bewusst bodenständig, nie überzeichnet.
export const TRAITS = {
  schnell: { name: 'Sehr schneller Läufer', desc: 'Höheres Grundtempo.' },
  pferdelunge: { name: 'Pferdelunge', desc: 'Ermüdet deutlich langsamer.' },
  gutes_auge: { name: 'Gutes Auge für Mitspieler', desc: 'Sieht Anspielstationen auch im Augenwinkel, präzisere Pässe.' },
  anfuehrer: { name: 'Anführer', desc: 'Mitspieler in der Nähe ermüden langsamer.' },
  teamchemie: { name: 'Steigert die Teamchemie', desc: 'Hält die Truppe zusammen (wirkt ab der Saison-Phase).' },
  ballsicher: { name: 'Ruhe am Ball', desc: 'Weniger verunglückte Ballkontakte.' },
  kopfball: { name: 'Kopfballungeheuer', desc: 'Kommt an hohe Bälle ran und köpft sie gezielt.' },
  hammer: { name: 'Strammer Schuss', desc: 'Zieht aus der Distanz ab – nicht immer genau.' },
  meckerer: { name: 'Meckerer', desc: 'Beschwert sich nach jedem Zweikampf – und steht dabei rum.' },
  raucher: { name: 'Raucher', desc: 'In der Halbzeit an der Eckfahne. Geht schneller die Puste aus.' },
  hart_im_nehmen: { name: 'Hart im Nehmen', desc: 'Schürfwunden stören kaum – grätscht auch mal auf Asche.' },
};

export const TRAIT_IDS = Object.keys(TRAITS);

export const hasTrait = (player, id) => player.traits.includes(id);
