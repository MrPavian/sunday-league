// „Was ist neu": die Highlights jeder Lieferung, zweisprachig. Neueste zuerst; id = Datum der Lieferung.
// Muss zu CHANGELOG.md / CHANGELOG.en.md passen (tests/whatsnew.test.js prüft die Überschriften).
export const CHANGELOG = [
  {
    id: '2026-10-23-2',
    de: { title: 'Transfermarkt, Wappen-Editor und Alte Herren', items: ['Transfermarkt mit Wechselperioden im Sommer und Winter: Spieler von Nachbarvereinen holen, eigene abgeben oder verleihen – mit Ausbildungsentschädigung und Dorfgespräch.', 'Abwerbungen anderer Vereine wirken erst in der nächsten Wechselperiode; vereinslose Spieler kannst du jederzeit holen (Rubrik „Vereinslos“).', 'Wappen-Editor: Gründungsjahr einstellbar, viel mehr Muster, Formen, Motive und eine dritte Farbe.', 'Alte Herren: eine Ü32-Mannschaft mit eigener Runde, Kader aus Ehemaligen und eigener Bierkasse.', 'Behoben: Der Tür-Knopf oben rechts führt wieder ins Hauptmenü.'] },
    en: { title: 'Transfer market, crest editor and old boys', items: ['Transfer market with summer and winter windows: sign players from nearby clubs, sell or loan out your own – with training compensation and village gossip.', 'Other clubs poaching your players only takes effect in the next transfer window; free agents can join at any time (“Free” filter).', 'Crest editor: founding year adjustable, many more patterns, shapes, emblems and a third colour.', 'Old boys: an over-32 side with its own league, a squad of former players and its own beer kitty.', 'Fixed: the door button at the top right takes you back to the main menu again.'] },
  },
  {
    id: '2026-10-23',
    de: { title: 'Trainerbefehle mit Wirkung, schnelleres Spiel', items: ['Jeder Trainerbefehl wirkt jetzt spürbar – „Zentrum zumachen“ war bisher nur halb eingebaut.', 'Kompakter, Tempo rein/raus, Konter absichern, Seite absichern und mittleres Pressing greifen deutlich stärker.', 'Doppelpässe und Ablagen kommen öfter beim Läufer an.', 'Die Spielberechnung ist rund 40 % schneller – das schont auf dem Handy Akku und Bildrate.'] },
    en: { title: 'Coaching orders that count, faster game', items: ['Every coaching order now has a noticeable effect – “Close the middle” was only half built before.', 'Stay compact, speed up/slow down, guard against the counter, cover a side and the mid-block take hold much more strongly.', 'One-twos and lay-offs reach the runner more often.', 'The match engine is about 40 % faster – easier on phone battery and frame rate.'] },
  },
  {
    id: '2026-10-22',
    de: { title: 'Präsidium, Vereinsfest, Platzpflege und Tim', items: ['Beim Start wählbar: Spielertrainer oder nur Trainer – später kannst du einen Trainer verpflichten und den Verein als Präsident führen.', 'Vereinsfest am Saisonende und Sommerturnier vor der Saison.', 'Platzpflege, Pachtvertrag und neue Ausbauten: Kunstrasen, Tribünen bis zum Dach, Biergarten.', 'Edelfan Tim „Der Tiger“ steht bei jedem Spiel am Rand – mit 19 eigenen Ereignissen.', 'Behoben: Pokalsieg-Anzeige, Schließen-Knopf im Handy, Bild teilen und Spielstand-Export auf Android.'] },
    en: { title: 'Presidency, club festival, pitch care and Tim', items: ['Choose at the start: player-manager or manager only – later you can hire a manager and run the club as president.', 'Club festival at the end of the season and a summer tournament before it.', 'Pitch care, lease contract and new facilities: artificial turf, stands up to a roof, beer garden.', 'Superfan Tim “The Tiger” stands at the touchline at every match – with 19 events of his own.', 'Fixed: cup win notice, close button on the phone, sharing the picture and exporting saves on Android.'] },
  },
  {
    id: '2026-10-19',
    de: { title: 'Reines Managerspiel', items: ['Hauptmenü nur noch mit Karriere, Spielständen und Einstellungen.', 'Du coachst jedes Spiel von der Seitenlinie oder per Liveticker – selbst spielen gibt es nicht mehr.', 'Freundschaftsspiel, Challenges und Spielerpool sind entfernt.', 'Alte Spielstände laden weiter.'] },
    en: { title: 'Pure manager game', items: ['Main menu with only Career, Saves and Settings.', 'You coach every match from the touchline or via the live ticker – playing yourself is gone.', 'Friendly match, challenges and player pool are removed.', 'Old saves still load.'] },
  },
  {
    id: '2026-10-16',
    de: { title: 'Hallenboden, Ballphysik, Körperkraft', items: ['Neuer Spielerwert „Körper“: Abschirmen, Zweikampf und Kopfball hängen auch davon ab.', 'Der Ball rollt realistischer, Schüsse auf dem Großfeld kommen aus höchstens 30 m.', 'Weniger Ping-Pong-Ballwechsel.', 'Die Halle hat einen eigenen Boden außerhalb der Bande.'] },
    en: { title: 'Hall floor, ball physics, strength', items: ['New player attribute “Strength”: shielding, duels and headers depend on it too.', 'The ball rolls more realistically; shots on the full-size pitch come from 30 m at most.', 'Fewer ping-pong exchanges.', 'The hall has its own floor outside the boards.'] },
  },
  {
    id: '2026-10-15',
    de: { title: 'Halle und Polizei', items: ['Bandenpässe in der Halle, die Bandentür schwingt auf.', 'Die Halle ist torreicher geworden.', 'Die Polizei trägt Blau mit Schirmmütze.'] },
    en: { title: 'Hall and police', items: ['Board passes in the hall; the board door swings open.', 'The hall is higher-scoring.', 'The police wear blue with a peaked cap.'] },
  },
  {
    id: '2026-10-14',
    de: { title: 'Positionsfremd und Hallenspiel', items: ['Positionsfremd gespielt bedeutet Stärkeabzug – mit Gewöhnung und Murren im Chat.', 'Die KI wechselt nur noch auf gleicher Position.', 'Halle: flacher gespielt, Fangnetze, betrunkener Fan statt Polizei.', 'Niemand läuft mehr durch die Bande.'] },
    en: { title: 'Out of position and hall play', items: ['Playing out of position costs strength – with getting used to it and grumbling in the chat.', 'The AI now only substitutes like for like.', 'Hall: flatter play, catch nets, a drunk fan instead of the police.', 'Nobody walks through the boards any more.'] },
  },
  {
    id: '2026-10-09',
    de: { title: 'Fouls, Sponsoren, 42 neue Ereignisse', items: ['Fouls mit Vorteil, direkter Roter Karte und Sperren in der Karriere.', 'Sponsoren mit Laufzeit von 1 bis 3 Saisons, Kündigung und Wünschen.', '42 neue Ereignisse, darunter fünf mehrteilige Ketten.', 'Neue Animationen: Fouls, Szenen nach dem Pfiff, Schiri-Gesten.'] },
    en: { title: 'Fouls, sponsors, 42 new events', items: ['Fouls with advantage, straight red cards and suspensions in the career.', 'Sponsors with terms of 1 to 3 seasons, termination and wishes.', '42 new events, including five multi-part chains.', 'New animations: fouls, scenes after the whistle, referee gestures.'] },
  },
  {
    id: '2026-10-08',
    de: { title: 'Ecken, Kopfbälle und überregionaler Pokal', items: ['Mehr Ecken und Kopfballtore auf allen Feldern.', 'Befreiungsschläge der Abwehr unter Druck.', 'Im überregionalen Pokal sind die Profis stärker, das Stadion voller.', '12 neue Saison-Ereignisse und ein Derby-Rückspiel.'] },
    en: { title: 'Corners, headers and the nationwide cup', items: ['More corners and headed goals on all pitches.', 'Defenders clear the ball under pressure.', 'In the nationwide cup the pros are stronger and the stadium fuller.', '12 new season events and a derby return leg.'] },
  },
  {
    id: '2026-10-07',
    de: { title: 'Pokal-Ausbau und Gewitter', items: ['Pokal: Verlängerung wählbar, dazu Landespokal und ein überregionaler Pokal gegen fiktive Profivereine.', 'Bei Gewitter gibt es an jedem Spielort echte Unterstände.', 'Aufwärmen am Rand und lebendigere Zuschauer.'] },
    en: { title: 'Cup expansion and thunderstorms', items: ['Cup: extra time is selectable, plus the State Cup and a nationwide cup against fictional pro clubs.', 'In a thunderstorm every venue has real shelters.', 'Warming up at the touchline and livelier spectators.'] },
  },
  {
    id: '2026-10-04',
    de: { title: 'Optik, Torwart und Spielfluss', items: ['Neue Frisuren, Bärte, Wappen-Motive und Trikotmuster.', 'Torjubel mit Traube und ein deutlich lebendigerer Torwart.', 'Flanken in drei Arten, Kopfbälle nach Flanken.', 'Mehr Abwechslung in Teamchat und Ereignissen.'] },
    en: { title: 'Looks, goalkeeper and flow of play', items: ['New hairstyles, beards, crest motifs and kit patterns.', 'Goal celebration pile-ons and a much livelier goalkeeper.', 'Three kinds of crosses, headers after crosses.', 'More variety in team chat and events.'] },
  },
  {
    id: '2026-10-03',
    de: { title: 'Pokale unter der Woche und Außenspiel', items: ['Kreispokal und Bezirkspokal im K.-o.-Modus.', 'Sponsor-Logos auf den Trikots.', 'Englische Namen, Vereine, Ligen und Sponsoren.', 'Angriffe laufen öfter über außen.'] },
    en: { title: 'Midweek cups and wing play', items: ['District Cup and County Cup as knockouts.', 'Sponsor logos on the kits.', 'English names, clubs, leagues and sponsors.', 'Attacks go down the wings more often.'] },
  },
  {
    id: '2026-10-02',
    de: { title: 'Vereinsgründung und Android', items: ['Gründungsversammlung: Farbwahl und Ehrenämter selbst besetzen.', 'Android-App als Download.'] },
    en: { title: 'Club founding and Android', items: ['Founding meeting: colour choice and filling the honorary posts yourself.', 'The Android app as a download.'] },
  },
  {
    id: '2026-10-01',
    de: { title: 'Jugend, Fitness und Bezirksliga', items: ['Kreisliga A (9 gegen 9) und Bezirksliga (11 gegen 11).', 'Jugend mit Ligabetrieb, Spielfesten und Wechsel ins Leistungszentrum.', 'Fitness von 50 bis 100 Prozent je Spieler.', 'Abwerbeversuche und Profivertrag.'] },
    en: { title: 'Youth, fitness and the Bezirksliga', items: ['Kreisliga A (9 against 9) and the Bezirksliga (11 against 11).', 'Youth with league play, match festivals and the move to a performance centre.', 'Fitness from 50 to 100 percent per player.', 'Poaching attempts and pro contracts.'] },
  },
  {
    id: '2026-09-30',
    de: { title: 'Das Vereinsheim als Raum', items: ['Neue Oberfläche: Vereinsheim als Raum mit Taktiktafel und Fenster zum Platz.', 'Kader als Stapel Spielerkarten, Aufstellung als Magnettafel.', 'Der Teamchat lebt im Handy des Trainers.', 'Mehr Offensivspiel: Doppelpass, Ablage, „Kombinieren“.'] },
    en: { title: 'The clubhouse as a room', items: ['New interface: the clubhouse as a room with a tactics board and a window onto the pitch.', 'Squad as a deck of player cards, line-up as a magnet board.', 'The team chat lives in the manager’s phone.', 'More attacking play: one-two, lay-off, “Combine”.'] },
  },
  {
    id: '2026-09-29',
    de: { title: 'Trainermodus 2.0 und neues Design', items: ['Neues Designsystem mit Klubübersicht „Heute“.', 'Spielerkarten und Aufstellung auf dem Platz.', 'Vibrationseinstellung.', 'Behoben: Einfrieren, wenn der Nachzügler mitten im Spiel dazukam.'] },
    en: { title: 'Manager mode 2.0 and new design', items: ['New design system with the club overview “Today”.', 'Player cards and the line-up on the pitch.', 'Vibration setting.', 'Fixed: freeze when the late arrival joined mid-match.'] },
  },
  {
    id: '2026-09-28',
    de: { title: 'Grafik 2.0 und Trainermodus 2.0', items: ['Grafik 2.0: Pixelraster, Licht, neue Spieler, Zuschauer, Wetter und Effekte.', 'Trainermodus 2.0: Befehle mit echter Wirkung, Lagekarte, Halbzeit-Ansprache.', 'Tricks: Übersteiger, Hackentrick, Zidane-Trick, Fallzieher.', 'Besser lesbare Ziffernschrift.'] },
    en: { title: 'Graphics 2.0 and manager mode 2.0', items: ['Graphics 2.0: pixel grid, light, new players, spectators, weather and effects.', 'Manager mode 2.0: orders with real effect, situation map, half-time talk.', 'Tricks: step-over, heel flick, Zidane trick, scissor kicks.', 'Easier-to-read digit font.'] },
  },
  {
    id: '2026-09-27',
    de: { title: 'Stimmung im Stadion', items: ['Atmosphäre mit Zuschauern, Rufen, Applaus und Tor-Tröte.', 'Verletzungen im Spiel, Wechseltafel und Wechselregeln je Liga.', 'Halbzeitlänge je Platz einstellbar.', 'Ligen mit 8 Teams möglich.'] },
    en: { title: 'Atmosphere in the ground', items: ['Atmosphere with spectators, shouts, applause and goal horn.', 'In-match injuries, substitution board and substitution rules per league.', 'Half length adjustable per pitch.', 'Leagues with 8 teams possible.'] },
  },
  {
    id: '2026-09-26',
    de: { title: 'Vereinsleben, Taktik und Android', items: ['Drei Spielwege: selbst spielen, Trainer in 3D oder Liveticker.', 'Vereinsleben mit Folgen: Teamchat, Vereinsgedächtnis, Spieltags-Überraschungen.', 'Vereinsmuseum, Saisonziel vom Vorstand und Saisonrückblick im Kreisblatt.', 'Android-App und installierbare Web-App.', 'Wappen-Editor und Positionsspiel mit Systemen und Spielstilen.'] },
    en: { title: 'Club life, tactics and Android', items: ['Three ways to play: play yourself, manager in 3D, or live ticker.', 'Club life with consequences: team chat, club memory, matchday surprises.', 'Club museum, a season goal from the board and a season review in the district paper.', 'Android app and installable web app.', 'Crest editor and positional play with systems and playing styles.'] },
  },
  {
    id: '2026-09-25',
    de: { title: 'Die Anfänge', items: ['Spielplätze vom Hinterhof bis zum Rasenplatz, dazu ein Hallenturnier.', 'Karriere mit Auf- und Abstieg, Transfers, Mannschaftskasse und Sponsoren.', 'Lebensgeschichten, Wetter und Spielvorfälle.', 'Komplette englische Übersetzung und drei Speicherplätze.'] },
    en: { title: 'The beginning', items: ['Venues from the backyard to the grass pitch, plus a hall tournament.', 'Career with promotion and relegation, transfers, a team cash box and sponsors.', 'Life stories, weather and match incidents.', 'A complete English translation and three save slots.'] },
  },
];

export const NEWEST_ID = CHANGELOG[0].id;
