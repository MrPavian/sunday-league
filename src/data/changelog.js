// „Was ist neu": die Highlights jeder Lieferung, zweisprachig. Neueste zuerst; id = Datum der Lieferung.
// Muss zu CHANGELOG.md / CHANGELOG.en.md passen (tests/whatsnew.test.js prüft die Überschriften).
export const CHANGELOG = [
  {
    id: '2026-11-08-3',
    de: { title: 'A-Jugend als eigenes Team', items: ['Ab der Regionalliga spielt deine A-Jugend jede Woche in einer eigenen Liga – ohne Leistungszentrum in der Verbandsliga, mit Leistungszentrum in der U19-Nachwuchsliga mit Vorrunde, Meister- oder Hauptrunde und Endrunde.', 'Wer in der Verbandsliga nach der Hinrunde vorne steht, steigt direkt in die Nachwuchsliga auf. Talente mit mindestens fünf Einsätzen entwickeln sich schneller. Zu sehen unter Mannschaft → Teams.'] },
    en: { title: 'U19s as their own team', items: ['From the Regionalliga your U19s play every week in their own league – the state league without a youth academy, the U19 Youth League with a first phase, championship or main round and finals with one.', 'Top of the state league at the halfway mark means going straight up to the Youth League. Talents with at least five appearances develop faster. See Squad → Teams.'] },
  },
  {
    id: '2026-11-08-2',
    de: { title: 'Regeln wie im echten Fußball', items: ['Überregionaler Pokal: Als Amateur hast du gegen Profis bis zum Halbfinale immer Heimrecht, das Finale steigt neutral im Stadion. Als Zweit- oder Erstligist triffst du in den ersten beiden Runden auf Amateure – auswärts.', 'Tabelle: Bei Punktgleichheit zählen nach Tordifferenz und Toren jetzt der direkte Vergleich und die Auswärtstore. Bei Welt- und Europameisterschaft entscheidet zuerst der direkte Vergleich.'] },
    en: { title: 'Rules like real football', items: ['National knockout cup: as an amateur side you always have home advantage against pro clubs up to the semi-final; the final is played at a neutral stadium. As a second- or top-flight club you face amateurs in the first two rounds – away.', 'League table: when level on points, head-to-head and away goals now count after goal difference and goals scored. At the World Cup and European Championship head-to-head comes first.'] },
  },
  {
    id: '2026-11-08-1',
    de: { title: 'Erfolge', items: ['Neu im Vereinsmuseum: 19 Erfolge mit Augenzwinkern – vom ersten Dreier über „Luftloch-König“ und „Ans Auto ×5“ bis „Ganz oben“.', 'Jeder neue Erfolg steht einmal im Kreisblatt. Bestehende Spielstände bekommen Meistertitel und Aufstiege aus der Chronik nachgetragen.'] },
    en: { title: 'Achievements', items: ['New in the club museum: 19 tongue-in-cheek achievements – from your first three points via “King of air shots” and “Off a car ×5” to “The very top”.', 'Every new achievement makes the District Gazette once. Existing saves get their titles and promotions filled in from the chronicle.'] },
  },
  {
    id: '2026-11-07-9',
    de: { title: 'Saisonrückblick als Seite', items: ['Das Kreisblatt-Sonderheft am Saisonende gibt es jetzt auch als eigene Seite: mit Wappen, Abschlusstabelle, allen Spielen und den Zahlen jedes Spielers.', 'Die Seite lässt sich per Messenger oder Mail verschicken und öffnet sich in jedem Browser, auch ohne Internet. Ältere Sonderhefte im Archiv kannst du ebenfalls teilen.'] },
    en: { title: 'Season review as a page', items: ['The Kreisblatt special at season’s end now also comes as its own page: with crest, final table, every match and each player’s numbers.', 'Send the page by messenger or email; it opens in any browser, even offline. Older specials in the archive can be shared too.'] },
  },
  {
    id: '2026-11-07-8',
    de: { title: 'Mehr englische Namen', items: ['Neue Karrieren auf Englisch würfeln aus deutlich mehr Vor- und Nachnamen, auch walisische, schottische und nordenglische.', 'Mehr Namen auch für Spieler mit irischen, osteuropäischen, südasiatischen, afrikanischen und karibischen Wurzeln. Bestehende Spielstände behalten ihre Spieler.'] },
    en: { title: 'More English names', items: ['New careers in English draw from many more first names and surnames, Welsh, Scottish and northern English ones too.', 'More names for players with Irish, Eastern European, South Asian, African and Caribbean roots as well. Existing saves keep their players.'] },
  },
  {
    id: '2026-11-07-7',
    de: { title: 'Tiefer Platz und echter Wind', items: ['Regen von Oktober bis März macht Rasen und Asche tief: Der Ball bleibt hängen, Laufen kostet mehr Kraft. Die Spielkarte warnt vorher.', 'Bei Sturmböen treiben hohe Bälle deutlich ab – flach spielen lohnt sich.'] },
    en: { title: 'Heavy pitches and real wind', items: ['Rain from October to March makes grass and cinder pitches heavy: the ball sticks, running costs more energy. The match card warns you beforehand.', 'In gales, high balls drift clearly – keeping it on the ground pays off.'] },
  },
  {
    id: '2026-11-07-6',
    de: { title: 'Gegner-Check', items: ['Auf der Spielkarte unter „Heute“: Form, Tabellenplatz, Stärke, Spielweise, Stärken und Schwäche des nächsten Gegners und sein gefährlichster Spieler.', 'Je besser du den Gegner kennst, desto genauer der Bericht. „Gegner beobachten“ kostet eine Aktion der Woche, ein Tipp vom Wirt hilft auch.'] },
    en: { title: 'Opponent check', items: ['On the match card under “Today”: form, league position, strength, style, strengths and weakness of your next opponent and their most dangerous player.', 'The better you know them, the sharper the report. “Watch the opponent” costs one action of the week; a tip from the landlord helps too.'] },
  },
  {
    id: '2026-11-07-5',
    de: { title: 'Stadionbau sichtbar', items: ['Auf dem eigenen Großfeld wächst das Stadion mit jeder Ausbaustufe: Stehwälle, überdachte Haupttribüne mit Sitzen in Vereinsfarben, Gästeblock, Dächer über den Kurven, zweiter Rang in der Großarena.', 'Heimspiele im ausgebauten Stadion beginnen mit einem kurzen Blick auf die Ränge.', 'Behoben: Die Stahlrohrtribüne (Sitzplätze) wird im Ligaspiel jetzt gezeichnet.'] },
    en: { title: 'Stadium growth you can see', items: ['On your own full-size pitch the stadium grows with every upgrade: terraces, a covered main stand with seats in club colours, an away block, roofs over the ends, a second tier in the grand arena.', 'Home games in an upgraded stadium open with a short look at the stands.', 'Fixed: the scaffold stand (Seats) is now drawn in league matches.'] },
  },
  {
    id: '2026-11-07-4',
    de: { title: 'Zweite Mannschaft', items: ['Ab der Regionalliga kannst du unter Mannschaft → Teams eine Zweite Mannschaft melden – mit eigener Liga, Tabelle, Auf- und Abstieg.', 'Wer am Wochenende bei der Ersten nicht spielt, bekommt in der Zweiten Spielpraxis: Er entwickelt sich besser und murrt weniger. A-Jugendliche ab 18 spielen mit und wachsen schneller.', 'Wie beim DFB: Die Zweite beginnt ganz unten und spielt höchstens eine Liga unter der Ersten – die Zweite eines Drittligisten nie in der Regionalliga.'] },
    en: { title: 'Reserve team', items: ['From the Regionalliga you can register a reserve team under Squad → Teams – with its own league, table, promotion and relegation.', 'Anyone who does not play for the first team at the weekend gets match practice in the reserves: they develop better and grumble less. U19 players aged 18+ join in and grow faster.', 'As with the DFB: the reserves start at the bottom and play at most one league below the first team – a third-division club’s reserves never in the Regionalliga.'] },
  },
  {
    id: '2026-11-07-3',
    de: { title: 'Trainerteam ab der Regionalliga', items: ['Ab der Regionalliga: Torwarttrainer, Athletiktrainer und Physiotherapeut einstellen (Mannschaft → Training).', 'Jede Saison zwei Bewerber je Aufgabe – günstiger oder erfahrener. Das Gehalt richtet sich nach Liga und Erfahrung: in der Regionalliga auf Minijob-Basis, ab der 3. Liga in Vollzeit.', 'Spürbare Wirkung: Torhüter entwickeln sich schneller, weniger Verletzungen, Verletzte sind schneller zurück.'] },
    en: { title: 'Coaching staff from the Regionalliga', items: ['From the Regionalliga: hire a goalkeeper coach, a fitness coach and a physiotherapist (Squad → Training).', 'Two applicants per job every season – cheaper or more experienced. Wages depend on league and experience: part-time (mini-job) in the Regionalliga, full-time from the 3. Liga.', 'A real difference: goalkeepers develop faster, fewer injuries, injured players return sooner.'] },
  },
  {
    id: '2026-11-07-2',
    de: { title: 'Taktik im Spiel umschalten', items: ['Taktik-Vorlagen im Spiel per Tipp ausspielen: Im Taktik-Blatt stehen jetzt alle gespeicherten Taktiken – ein Tipp stellt Stil, System und Spielplan um.', 'Umschalten nach Plan: Unter Mannschaft → Taktik bis zu zwei Regeln festlegen, z. B. „ab Minute 70, bei Führung → Mauern“. Die Mannschaft stellt dann von selbst um, auch im Liveticker.', 'Im Spiel siehst du, welche Regel noch wartet, und kannst sie für dieses Spiel streichen.'] },
    en: { title: 'Switch tactics during the match', items: ['Play your tactic presets with one tap during the match: the tactics sheet now lists all your saved tactics – one tap changes style, system and game plan.', 'Switch by plan: under Squad → Tactics, set up to two rules, e.g. \"from minute 70, when leading → Park the bus\". The team then switches on its own, in the live ticker too.', 'During the match you can see which rule is still waiting and drop it for this match.'] },
  },
  {
    id: '2026-11-07-1',
    de: { title: 'Bugsuche: Fehler aus langen Karrieren', items: ['Jugendspieler zum Profiverein: Die Ausbildungsentschädigung wird nicht mehr doppelt gebucht, der Zeitungsartikel kommt nur einmal.', 'Entscheidungen der Woche: Ist ein Beteiligter nicht mehr im Verein, hat sich die Sache erledigt – kein Hängenbleiben mehr.', 'Alte Herren: Niemand spielt mehr gleichzeitig für die Alten Herren und einen Gegner.', 'Chatgruppe: Gesperrte schreiben nicht mehr alle denselben Satz.'] },
    en: { title: 'Bug hunt: fixes from long careers', items: ['Youth player off to a pro club: the development fee is no longer booked twice, and the newspaper story only appears once.', 'Decisions of the week: if someone involved has left the club, the matter is closed – no more getting stuck.', 'Old boys: nobody plays for the old boys and an opponent at the same time any more.', 'Group chat: suspended players no longer all write the same sentence.'] },
  },
  {
    id: '2026-11-06-6',
    de: { title: 'Neues Startbild und Blick aus dem Vereinsheim', items: ['Startbild neu gezeichnet: Sonntagmorgen auf dem Dorfplatz, gestochen scharf auf jedem Bildschirm – mit Dorf und Kirche, Morgensonne, Tribüne und dem Platzwart am Kreidewagen.', 'Fenster im Vereinsheim: Unter „Heute“ schaust du jetzt von oben auf den Platz, wie aus dem ersten oder zweiten Stock.', 'Eigene Jugend wächst mit der Liga: Talente aus dem eigenen Verein kommen jetzt passend zum Niveau hoch, auch in den Profiligen.', 'Behoben: doppelte Spieler nach Auf- oder Abstieg; der Neue vom Sommerfest passt jetzt zur Liga.'] },
    en: { title: 'New title screen and a view from the clubhouse', items: ['Title screen redrawn: Sunday morning at the village pitch, pin-sharp on every screen – with village and church, morning sun, a stand and the groundsman with his chalk cart.', 'Clubhouse window: under "Today" you now look down on the pitch, as if from the first or second floor.', 'Your own youth grows with the league: home-grown talents now come up at a fitting level, in the professional leagues too.', 'Fixed: duplicate players after promotion or relegation; the newcomer from the summer party now fits your league.'] },
  },
  {
    id: '2026-11-06-5',
    de: { title: 'Tutorial für den Einstieg', items: ['Nach der Vereinsgründung fragt das Spiel, ob du eine kurze Führung möchtest.', 'Rundgang durchs Vereinsheim: Jeder Schritt öffnet seinen Reiter und hebt hervor, worum es geht.', 'Erster Spieltag an der Seitenlinie: Hinweise zu Zurufen, Wechseln, Co-Trainer, Lagekarte und Halbzeit – das Spiel steht, solange ein Hinweis offen ist.', 'Jederzeit abbrechbar, in den Einstellungen neu startbar.', 'Behoben: A-Jugend und Alte Herren passen zur eigenen Liga (vorher Talente über 100 schon in der Freizeitliga); beim Einwurf 2 m Abstand; Gerüchteküche in der Winterpause wieder mit zwei Aktionen.'] },
    en: { title: 'A tutorial to get started', items: ['After founding your club, the game asks whether you would like a quick tour.', 'Clubhouse tour: each step opens its tab and highlights what it is about.', 'First match on the touchline: tips on shouts, substitutions, the assistant, situation cards and half-time – the match is paused while a tip is open.', 'Stop any time, restart it in the settings.', 'Fixed: U19s and old boys match your own league (before, talents over 100 even in the recreational league); 2 m distance at throw-ins; rumour mill has two actions again in the winter break.'] },
  },
  {
    id: '2026-11-06-4',
    de: { title: 'Vereinsgelände: Training, Medizin, Geschäftsstelle, Jugend und Umfeld', items: ['Sechs neue Ausbau-Bereiche, je in drei Stufen von Ehrenamt bis Profi: Trainingsgelände, Teamgebäude, Medizin, Geschäftsstelle, Jugend und Stadionumfeld.', 'Jeder Ausbau wirkt spürbar: schnellere Entwicklung, kürzere Ausfälle, weniger Verletzungen, mehr Sponsorengeld, mehr Zuschauer, mehr Talente.', 'Ab der 2. Liga braucht die Zulassung ein Nachwuchsleistungszentrum – wie in echt.', 'Übersichtlichere Menüs: höchstens zwei Ebenen. Im Verein eigene Reiter für Kasse, Anlage, Vereinsleben, Trikot & Wappen, Museum und Du; Jugend, Frauen und Alte Herren unter Mannschaft → Teams.'] },
    en: { title: 'Club grounds: training, medical, club office, youth and surroundings', items: ['Six new upgrade areas, each in three steps from volunteers to professionals: training ground, team building, medical, club office, youth and stadium surroundings.', 'Every upgrade makes a real difference: faster development, shorter absences, fewer injuries, more sponsor money, more spectators, more talents.', 'From the second division up, a licence needs a youth academy – as in reality.', 'Tidier menus: at most two levels. Separate club tabs for kitty, grounds, club life, kit & crest, museum and you; youth, women and old boys under Squad → Teams.'] },
  },
  {
    id: '2026-11-06-3',
    de: { title: 'Eintrittspreise, Dauerkarten und ein Kader, der nicht leerläuft', items: ['Eintritt selbst festlegen (ab der Bezirksliga): billiger bringt mehr Zuschauer, teurer lohnt sich nur bei vollem Stadion. Ab dem Drittliga-Stadion mit eigenem Sitzplatzpreis.', 'Dauerkarten: Geld zum Saisonstart, die Inhaber kommen auch bei Regen.', 'Fehler behoben: Liefen in den Profiligen alle Verträge aus, stand nach einer Saison kein Spieler mehr im Kader. Jetzt verlängert der Verein notfalls die Besten um ein Jahr.', 'Ein Absturz bei Ereignissen mit leerem Kader ist behoben.'] },
    en: { title: 'Ticket prices, season tickets and a squad that cannot run dry', items: ['Set your own entry price (from the district league up): cheaper brings more spectators, dearer only pays with a full ground. From the third-division stadium with a separate seat price.', 'Season tickets: money at the start of the season, and holders turn up even in the rain.', 'Fixed: when every contract ran out in the professional leagues, the squad was empty after one season. Now the club extends the best players by a year if needed.', 'Fixed a crash in events with an empty squad.'] },
  },
  {
    id: '2026-11-06-2',
    de: { title: 'Weltmeisterschaft, Europameisterschaft und Kontinentalturniere', items: ['Weltmeisterschaft, Europameisterschaft und die Meisterschaften von Afrika, Asien, Südamerika, Nord- und Mittelamerika und Ozeanien – im echten Rhythmus, mit Gruppen und K.-o.-Runde.', 'Ab der Regionalliga werden eigene Spieler für ihr Land nominiert. Ihre Spiele kannst du im Stadion in 3D ansehen oder nur das Ergebnis nehmen.', 'Gute Turniere heben den Marktwert: mehr Ablöse, höhere Gehaltsforderung. Bei der Weltmeisterschaft zahlt der Weltverband für jeden Tag.', 'Afrika- und Asienmeisterschaft liegen im Winter: Wer lange dabei ist, fehlt danach Ligaspiele.', 'Vorher die Qualifikation in Gruppen je Kontinent – auch große Länder können scheitern.'] },
    en: { title: 'World Cup, European Championship and continental tournaments', items: ['World Cup, European Championship and the championships of Africa, Asia, South America, North and Central America and Oceania – on their real schedule, with groups and knockout rounds.', 'From the Regional League up, your players get called up by their country. Watch their games in the stadium in 3D or just take the result.', 'Good tournaments raise market value: higher fees, higher wage demands. At the World Cup the world body pays for every day.', 'The Africa and Asia championships are in winter: whoever goes far misses league games afterwards.', 'Qualifying groups on every continent first – even big countries can miss out.'] },
  },
  {
    id: '2026-11-06-1',
    de: { title: 'Vereinswechsel im Sommer', items: ['Unter den ersten drei? Am Saisonende fragen Vereine aus der Liga darüber an – als Meister gleich zwei. In der 1. Liga melden sich die großen Vereine derselben Liga.', 'Zusagen mit einem Tipp, noch einmal tippen zum Bleiben. Der Wechsel gilt ab der neuen Saison: neuer Kader, neuer Spielplan, Kasse und Anlage fangen neu an.', 'Im Sommer entlassen? Dann ruft auch ein Verein aus der Liga darunter an.'] },
    en: { title: 'Summer moves to other clubs', items: ['In the top three? At the end of the season clubs from the league above get in touch – two if you are champions. In the first division the big clubs of the same league call.', 'Accept with one tap, tap again to stay. The move takes effect next season: new squad, new fixtures, kitty and grounds start afresh.', 'Sacked in the summer? Then a club from the league below calls too.'] },
  },
  {
    id: '2026-11-05-7',
    de: { title: '2. Liga und 1. Liga', items: ['Die Pyramide reicht jetzt bis ganz nach oben: 2. Liga und 1. Liga mit eigenen Vereinen. Der Meister der 3. Liga steigt wieder auf.', 'Geld nach dem Wirtschaftsbericht der Profiligen: Gehälter, Fernsehgeld, Vermarktung, Eintritt und Zuschauer wie in echt im Schnitt.', 'Zulassung wie in echt: 15 000 Plätze, Rasenheizung, Flutlicht mit 1200 Lux (2. Liga) bzw. 8000 Sitzplätze und 1800 Lux (1. Liga).', 'Neue Ausbauten: Rasenheizung (keine Platzsperre mehr bei Frost), helleres Flutlicht, Sitzplatzausbau, Großarena für 50 000.'] },
    en: { title: 'Second and first division', items: ['The pyramid now goes all the way to the top: second and first division with their own clubs. The 3. Liga champions go up again.', 'Money based on the professional leagues\' financial report: wages, TV money, marketing, tickets and crowds as on average in reality.', 'Licensing as in reality: 15,000 places, undersoil heating, 1,200 lux floodlights (second division) or 8,000 seats and 1,800 lux (first division).', 'New facilities: undersoil heating (no more frozen-pitch closures), brighter floodlights, seating expansion, a grand arena for 50,000.'] },
  },
  {
    id: '2026-11-05-6',
    de: { title: 'Mehrere Wechsel, eigene Taktiken, schärfere Figuren', items: ['Im Wechselmenü mehrere Wechsel auf einmal: „+ Weiterer Wechsel“, dann alle zusammen beim nächsten Stopp.', 'Wechselregeln nach Liga: ab der Kreisklasse fünf Wechsel, in Regionalliga und 3. Liga fünf Wechsel in höchstens drei Unterbrechungen – die Halbzeit zählt nicht.', 'Taktiken speichern: System, Stil und Spielplan unter einem Namen ablegen und mit einem Tipp wieder einstellen.', 'Figuren mit mehr Schattierung und abgesetzten Schuhsohlen – ohne mehr Rechenaufwand.', 'Streifen, Ringel und Karos sitzen jetzt gleichmäßig in der Mitte statt versetzt.'] },
    en: { title: 'Several subs, your own tactics, sharper figures', items: ['Several substitutions at once in the sub menu: "+ Another change", then all together at the next stoppage.', 'Substitution rules by league: five from the district league up, in the Regional League and Third Division five in at most three stoppages – half-time does not count.', 'Save tactics: store system, style and game plan under a name and switch back with one tap.', 'Figures with more shading and contrasting boot soles – at no extra cost.', 'Stripes, hoops and checks now sit evenly in the middle instead of offset.'] },
  },
  {
    id: '2026-11-05-5',
    de: { title: 'Neue Trikots, Namen, Ereignisse und Sprüche', items: ['18 neue Trikotvorlagen, sortiert nach Farben: einfarbig (Ton in Ton), zweifarbig und dreifarbig – dazu weiter die Retro-Muster.', 'Mehr Vor- und Nachnamen in jeder Herkunft (neue Karrieren).', 'Alle Ereignisse geprüft: Dorfkram wie Arbeitseinsatz, Tombola oder Fahrgemeinschaft gibt es oben nicht mehr, Platzereignisse nicht in der Halle, Berufsgeschichten nur bis zur Regionalliga.', 'Neu ab der Oberliga: Pressekonferenz, Spielerberater, Fanprotest, Pyro-Strafe, VIP-Abend, Social Media, Rasenheizung, Talentangebot, Montagsspiel im Fernsehen, Dopingkontrolle und Livestream.', '20 neue Chat-Nachrichten und mehr Zu- und Absagen; was nicht zur Liga passt, kommt dort nicht mehr.'] },
    en: { title: 'New kits, names, events and chat lines', items: ['18 new kit templates, sorted by colours: one colour (tonal), two and three colours – plus the retro patterns as before.', 'More first and last names in every origin (new careers).', 'Every event checked: village chores like work parties, raffles or car pools no longer appear higher up, pitch events not in the hall, job stories only up to the Regional League.', 'New from the top amateur tier: press conference, player agent, fan protest, pyro fine, VIP evening, social media, undersoil heating, talent offer, Monday TV game, doping control and live stream.', '20 new chat messages and more yes/no replies; anything that does not suit the league no longer appears there.'] },
  },
  {
    id: '2026-11-05-4',
    de: { title: 'Tastenhilfe aus dem Weg', items: ['Die Tastenhilfe an der Seitenlinie sitzt jetzt unter der Anzeigetafel statt daneben – sie verdeckte bei mittlerer Fensterbreite den Namen der Gastmannschaft.', 'Nach acht Sekunden blendet sie sich aus; mit H holst du sie zurück.', 'Neue Karrieren sind schneller angelegt.', 'Die 3D-Grafik läuft auf der neuesten Version der Grafikbibliothek – sie sieht aus wie vorher.'] },
    en: { title: 'Key help out of the way', items: ['The key help on the touchline now sits below the scoreboard instead of next to it – at medium window widths it covered the away team’s name.', 'It fades out after eight seconds; press H to bring it back.', 'New careers are set up faster.', 'The 3D graphics run on the latest version of the graphics library – they look the same as before.'] },
  },
  {
    id: '2026-11-05-3',
    de: { title: 'Der Stuhl wackelt', items: ['Der Vorstand misst dich am Saisonziel. Wie viel Geduld er hat, hängt an der Liga: in der Freizeitliga unendlich, oben wenig.', 'Erst kommt eine Warnung, dann ein Ultimatum: vier Punkte aus drei Spielen. Klappt es nicht, bist du entlassen.', 'Nach der Entlassung wollen dich andere Vereine der Liga – du übernimmst Kader, Tabellenplatz und Spielplan, Kasse und Anlage fangen neu an.', 'Als Präsident machen die Mitglieder Druck: Ein Misstrauensantrag kostet den Trainer – oder dich das Amt.', 'Den Rückhalt siehst du unter Verein → Du. Gilt für neue Karrieren.'] },
    en: { title: 'The seat gets hot', items: ['The board measures you against the season target. How patient it is depends on the league: endless in the Sunday league, little at the top.', 'First a warning, then an ultimatum: four points from three games. If not, you are sacked.', 'After the sack other clubs in the league want you – you take over their squad, position and fixtures, while kitty and grounds start afresh.', 'As president the members apply the pressure: a motion of no confidence costs the manager – or you the office.', 'Your backing is shown under Club → You. Applies to new careers.'] },
  },
  {
    id: '2026-11-05-2',
    de: { title: 'Regionalliga und 3. Liga', items: ['Über der Oberliga geht es weiter: Regionalliga (je nach Bundesland Nord, Nordost, West, Südwest oder Bayern) und 3. Liga, mit stärkeren Gegnern, mehr Zuschauern und Fernsehgeld.', 'Ab der Regionalliga haben Spieler Verträge mit Monatsgehalt und Laufzeit. Im letzten Jahr verlängern – sonst gehen sie ablösefrei. Wer von einem Profiverein kommt, kostet Ablöse.', 'Zulassung: Für den Aufstieg braucht ihr Stadion, Flutlicht und Geld auf dem Konto. Was fehlt, steht unter Verein → Anlage.', 'Jeder Verein kann auf den Aufstieg verzichten – unten passiert das öfter. Verzichtet der Meister, steigt der Zweite direkt auf. Der Meister der 3. Liga verzichtet vorerst immer.', 'Gilt für neue Karrieren.'] },
    en: { title: 'Regional League and Third Division', items: ['Above the top amateur tier it goes on: the Regional League (North, North-East, West, South-West or Bavaria, depending on your state) and the Third Division, with stronger opponents, bigger crowds and TV money.', 'From the Regional League on, players have contracts with a monthly wage and a term. Extend in the final year – or they leave on a free. Anyone from a pro club costs a transfer fee.', 'Licence: promotion needs a stadium, floodlights and money in the bank. What is missing is shown under Club → Grounds.', 'Any club can turn down promotion – lower down it happens more often. If the champions decline, the runners-up go straight up. The Third Division champions always decline for now.', 'Applies to new careers.'] },
  },
  {
    id: '2026-11-05-1',
    de: { title: 'Weltklasse, Führungsspieler, Star der Liga', items: ['Manche Spieler haben etwas Besonderes, das nicht in der Stärkezahl steht – du entdeckst es mit der Zeit, durch Scouting sofort.', 'Weltklasse: Wenn es spät eng wird, spielt er genauer und bleibt ruhig.', 'Führungsspieler: Neben ihm laufen alle mehr und bleiben ruhiger, in der Kabine hören sie auf ihn.', 'Star der Liga: Das Kreisblatt kürt die drei Stärksten. Gegner decken ihn enger, mehr Zuschauer kommen, auf der Bank wird er sauer.', 'Gilt für neue Karrieren.'] },
    en: { title: 'World class, team leaders, star of the league', items: ['Some players have something special that is not in their rating – you discover it over time, straight away by scouting.', 'World class: when it gets tight late on, he plays more precisely and stays calm.', 'Team leader: next to him everyone runs more and stays calmer, in the dressing room they listen to him.', 'Star of the league: the District Gazette crowns the three strongest. Opponents mark him tighter, more fans come, on the bench he sulks.', 'Applies to new careers.'] },
  },
  {
    id: '2026-11-04-3',
    de: { title: 'Jugend, Liebe, Schule – und Wechselstreik', items: ['Wer als Kind viel Talent hatte, wird eher ein großes Talent – sicher ist es nicht.', 'Abiklausuren, Ausbildung, erste Liebe und Liebeskummer, Band, Gaming, Partys und der Führerschein.', 'Kinder im Internat wollen manchmal zurück; ab der Verbandsliga brauchen junge Neue eine Gastfamilie.', 'Schlechte Laune steckt an: Grüppchen in der Kabine, Aussprache mit dem Mannschaftsrat. Und wer einen Wechsel verweigert bekommt, streikt manchmal – bleibst du hart, meldet er sich vielleicht ohne Freigabe ab.', 'Abendspiele und die Kneipe sind deutlich heller und kontrastreicher.'] },
    en: { title: 'Youth, love, school – and transfer strikes', items: ['A kid with lots of talent is more likely to become a big talent – but it is no guarantee.', 'Final exams, apprenticeships, first love and heartbreak, bands, gaming, parties and the driving test.', 'Kids at a boarding academy sometimes want to come back; from the State League on, young signings need a host family.', 'Bad moods spread: cliques in the dressing room, a meeting with the players’ council. And a player refused a move sometimes goes on strike – stand firm and he may deregister without a release.', 'Evening games and the pub are much brighter and crisper.'] },
  },
  {
    id: '2026-11-04-2',
    de: { title: 'Zu gut für die Liga', items: ['Wer über dem Niveau seiner Liga steht, lernt weniger dazu – je Liga darüber etwas weniger, höchstens die Hälfte.', 'Auf der Spielerkarte steht dann „über seiner Liga“.', 'Vereine aus der Liga darüber versuchen solche Spieler abzuwerben.', 'Manche wollen selbst höher spielen: freigeben, gemeinsamen Aufstieg versprechen oder halten – dann sind sie sauer.', 'Gilt für neue Karrieren.'] },
    en: { title: 'Too good for the league', items: ['Anyone above the level of their league learns less – a little less per league above, at most half.', 'The player card then says “above his league”.', 'Clubs from the league above try to poach such players.', 'Some want to play higher themselves: release them, promise to go up together or hold on to them – then they sulk.', 'Applies to new careers.'] },
  },
  {
    id: '2026-11-04-1',
    de: { title: 'Liganiveau, Entwicklung und Talent', items: ['Neben der Stärkezahl steht jetzt, zu welcher Liga ein Spieler passt, z. B. „Stärke 84 · Niveau Bezirksliga“.', 'Zu sehen auf der Spielerkarte, in der Gerüchteküche, auf dem Transfermarkt und bei dir selbst – bei geschätzter Stärke als „Niveau etwa …“.', 'Ab der Landesliga legen Spieler mehr Stärkepunkte zu, weil oben ein Punkt weniger bewirkt – ein junger Oberliga-Spieler rund 27 statt 19 in acht Saisons.', 'Jeder Spieler hat ein verborgenes Talent: Manche schießen nach oben, viele werden normal besser, manche bleiben fast stehen. Die Einschätzung auf der Karte wird mit der Zeit genauer.', 'Gilt für neue Karrieren.'] },
    en: { title: 'League level, development and talent', items: ['Next to the rating it now says which league a player fits, e.g. “Rating 84 · level County Senior League”.', 'Shown on the player card, in the rumour mill, on the transfer market and for yourself – as “level about …” when the rating is an estimate.', 'From the Regional League Canal Group upwards players gain more rating points, because higher up a point counts for less – a young top-amateur player about 27 instead of 19 over eight seasons.', 'Every player has a hidden talent: some shoot up, many get steadily better, some barely move. The estimate on the card gets more accurate over time.', 'Applies to new careers.'] },
  },
  {
    id: '2026-10-31-6',
    de: { title: 'Neues Stärkemodell (neue Karrieren)', items: ['Jeder Spieler hat jetzt ein festes Niveau von Freizeitliga bis Oberliga. Die Ligen liegen dadurch deutlich weiter auseinander.', 'Stärkezahlen gehen über 99: Freizeitliga um 54, Oberliga um 128, Profis 180 bis 195.', 'Wer aufsteigt, braucht bessere Leute – ein Klassenhöherer holt oben rund 80 % der Punkte.', 'Fehler hängen jetzt vom Gegner ab: Gegen starke Teams passt und schießt man unsauberer.', 'Laufende Karrieren spielen mit dem alten Modell weiter.'] },
    en: { title: 'New strength model (new careers)', items: ['Every player now has a fixed level from Sunday league to the top amateur tier. The leagues are much further apart.', 'Ratings go beyond 99: Sunday league around 54, top amateur tier around 128, pros 180 to 195.', 'Promotion means you need better players – a side one level up takes about 80 % of the points.', 'Mistakes now depend on the opponent: against strong sides passes and shots get sloppier.', 'Careers already under way keep the old model.'] },
  },
  {
    id: '2026-10-31-5',
    de: { title: 'Familie und Energie je Liga', items: ['Ab der Bezirksliga springt der Co-Trainer ein, wenn du ausfällst – sofern du einen hast.', 'Ab der Verbandsliga dauern Familienkrise und Burnout eine Woche statt zwei.', 'Im roten Bereich spürst du es schon vorher: Müde schaffst du eine Sache weniger in der Woche, und bei dicker Luft zuhause kommt die Familie nicht mehr mit an den Platz.'] },
    en: { title: 'Family and energy by league', items: ['From the County Senior League on, your assistant steps in when you are out – if you have one.', 'From the State League on, a family crisis or burnout lasts one week instead of two.', 'In the red zone you feel it earlier: when you are tired you get one thing less done a week, and when things are tense at home the family stops coming to games.'] },
  },
  {
    id: '2026-10-31-4',
    de: { title: 'Mehr Leben im Chat', items: ['Jede Woche etwas aus dem Vereinsumfeld: Gemeinde, Nachbarn, Sponsoren, Fans, andere Vereine – und Dinge, mit denen keiner rechnet.', 'Die Spielansage und die Kreisblatt-Meldungen klingen nicht mehr jede Woche gleich.', 'Die Warnung vor dem gegnerischen Torjäger kommt nur noch, wenn er wieder getroffen hat.'] },
    en: { title: 'More life in the chat', items: ['Every week something from around the club: the parish, the neighbours, sponsors, fans, other clubs – and things nobody saw coming.', 'The match call and the Gazette reports no longer sound the same every week.', 'The warning about the opposing striker only comes when he has scored against you again.'] },
  },
  {
    id: '2026-10-31-3',
    de: { title: 'Übersichtlicher Verein', items: ['Der Reiter Verein ist in Unterseiten geteilt: Du, Anlage, Vereinsleben, Trikot und Wappen.', 'Die Ausbaugruppen (Vereinsheim, Sportplatz, Tribünen, Gastro) lassen sich auf- und zuklappen.', 'Jugend: A-Jugend und Jugendteams sind eigene Reiter. Kasse: Strafenkatalog und Kassenbuch zum Aufklappen.'] },
    en: { title: 'Tidier club pages', items: ['The Club tab is split into sub-pages: You, Grounds, Club life, Kit and Crest.', 'The upgrade groups (clubhouse, pitch, stands, catering) can be expanded and collapsed.', 'Youth: U19s and youth teams have their own tabs. Kitty: fines list and ledger can be expanded.'] },
  },
  {
    id: '2026-10-31-2',
    de: { title: 'Zuschauer und Tribünen', items: ['Unter Verein → Tribünen siehst du Zuschauerschnitt, Auslastung und Rekord.', 'Ist ein Heimspiel ausverkauft, steht da, wie viele draußen bleiben mussten – und welcher Ausbau helfen würde.', 'Ab Bezirksliga auch der Eintritt, der dabei entgangen ist.'] },
    en: { title: 'Crowds and stands', items: ['Under Club → Stands you can see average attendance, how full the ground is and the record.', 'When a home game sells out, it shows how many had to stay outside – and which upgrade would help.', 'From the County Senior League on, also the gate money you missed out on.'] },
  },
  {
    id: '2026-10-31-1',
    de: { title: 'Mehr Sponsoren', items: ['Zwölf größere Firmen aus der Region klopfen ab Bezirksliga, Landesliga und Verbandsliga an.', 'Neue Werbeplätze: Rückensponsor ab Bezirksliga, Hosensponsor ab Verbandsliga.', 'Weiter oben steht eine größere Firma auf der Trikotbrust – der Kiosk bleibt an der Bande.'] },
    en: { title: 'More sponsors', items: ['Twelve bigger firms from the region come knocking from the County Senior League upwards.', 'New ad spaces: back-of-shirt sponsor from the County Senior League, shorts sponsor from the State League.', 'Higher up a bigger firm goes on the front of the shirt – the kiosk stays on the advertising boards.'] },
  },
  {
    id: '2026-10-30-7',
    de: { title: 'Rivalitäten', items: ['Aus Spitzen- und Kellerduellen, Rudelbildung, Wechseln zum Gegner und verlorenen Titelrennen werden Rivalitäten.', 'Gegen einen Rivalen geht es zu wie im Derby: hitziger, mehr Zuschauer, mehr Stimmung.', 'Unter Verein stehen deine Rivalen samt Vorgeschichte.'] },
    en: { title: 'Rivalries', items: ['Top and bottom clashes, melees, players moving to the other side and lost title races turn into rivalries.', 'Against a rival it feels like a derby: more heated, bigger crowd, more at stake for the mood.', 'Under Club you can see your rivals and their history.'] },
  },
  {
    id: '2026-10-30-6',
    de: { title: 'Schiedsrichter mit Gesicht', items: ['Jede Ebene hat ihre festen Schiris: gleicher Name, gleiches Gesicht, gleiche Art zu pfeifen.', 'Auf der Spielkarte steht, wer Sonntag pfeift – und wie es bisher mit ihm lief.', 'Unter Verein siehst du alle Schiris deiner Ebene mit Eigenheiten und Bilanz.'] },
    en: { title: 'Referees with faces', items: ['Every level has its regular referees: same name, same face, same way of reffing.', 'The match card shows who is reffing on Sunday – and how it has gone with him so far.', 'Under Club you can see all referees at your level with their quirks and record.'] },
  },
  {
    id: '2026-10-30-5',
    de: { title: 'Trainingsplan', items: ['Unter Mannschaft → Training legst du fest, wie oft und worauf die Mannschaft trainiert.', 'Mehr Training bringt mehr Entwicklung zum Saisonende, kostet aber jede Woche Familie und Kraft.', 'Schwerpunkte wie Kondition oder Ball und Passspiel, dazu Extra-Torwarttraining.'] },
    en: { title: 'Training plan', items: ['Under Squad → Training you decide how often and on what the team trains.', 'More training means more development at the end of the season, but costs family time and energy every week.', 'Focus areas such as fitness or ball work and passing, plus extra keeper training.'] },
  },
  {
    id: '2026-10-30-4',
    de: { title: 'Scouting', items: ['Spieler anderer Vereine zeigen ihre Stärke nur als Spanne – je besser du sie kennst, desto genauer.', '„Spiel anschauen“ beim Verein deckt seine Spieler auf, Klasse und Eigenschaften siehst du erst nach dem Zuschauen.', '„Zum Bolzplatz“: zwei Vereinslose für die Gerüchteküche.'] },
    en: { title: 'Scouting', items: ['Players at other clubs only show their rating as a range – the better you know them, the narrower it gets.', '"Watch them play" at a club reveals its players; class and traits only show after you have watched.', '"Go to the kickabout pitch": two unattached players for the rumour board.'] },
  },
  {
    id: '2026-10-30-3',
    de: { title: 'Die Kneipe in 3D', items: ['„Zum Anstoß“ ist jetzt ein Raum: Wirt hinter der Theke, Opa Heinz und die Jungs am Stammtisch, zwei beim Darts.', 'Wimpel, Schals und Meisterwimpel in deinen Vereinsfarben.', 'Tipp eine Person an: Runde beim Wirt, Taktik bei Opa Heinz, Gespräch mit einem Spieler, Duell an der Dartscheibe.', 'Hochkant näher dran: seitlich durch den Raum wischen, die Kamera fährt zur gewählten Person.'] },
    en: { title: 'The pub in 3D', items: ['The pub is now a room: the landlord behind the bar, Grandpa Heinz and the lads at the regulars\' table, two playing darts.', 'Pennants, scarves and title pennants in your club colours.', 'Tap a person: a round from the landlord, tactics with Grandpa Heinz, a chat with a player, a duel at the dartboard.', 'Closer in portrait: swipe through the room, the camera moves to the person you pick.'] },
  },
  {
    id: '2026-10-30-2',
    de: { title: 'Kraft, Nerven und zweite Luft', items: ['Die Spieler werden über das Spiel müde wie im echten Fußball – nicht mehr schon nach einem Drittel platt. Eingewechselte bringen frische Beine.', 'Wer knapp führt, bekommt in der Schlussphase Druck. Nervöse wackeln, Ruhepole bleiben cool.', 'Ein Anschlusstreffer setzt manchmal noch einmal Kräfte frei – nicht immer.', 'Neues Spielerprofil „Zweite Luft“: holt sich spät im Spiel noch einmal Kraft.'] },
    en: { title: 'Legs, nerves and a second wind', items: ['Players tire over the match like in real football – no longer spent after a third of it. Substitutes bring fresh legs.', 'A narrow lead brings pressure late on. Nervy players wobble, calm heads stay cool.', 'Pulling a goal back sometimes frees up fresh energy – not always.', 'New player profile "Second wind": finds fresh legs late in the game.'] },
  },
  {
    id: '2026-10-30-1',
    de: { title: 'Technik schlägt Masse', items: ['Im Schulterduell zählt der Körper etwas weniger. Vorher war er im Sturm wichtiger als Technik und Abschluss, jetzt liegen sie gleichauf.', 'Abschirmen im Stehen bleibt Sache des Körpers.'] },
    en: { title: 'Skill beats bulk', items: ['Strength counts a little less in shoulder-to-shoulder duels. Before, it mattered more for strikers than technique and finishing; now they are level.', 'Shielding the ball while standing is still down to strength.'] },
  },
  {
    id: '2026-10-29-9',
    de: { title: 'Frauenteam mit Kader und Liga', items: ['Das Frauenteam hat jetzt 16 echte Spielerinnen, eine Trainerin und eine eigene Liga mit Tabelle – Verein → Frauen.', 'Ergebnisse jede Woche in der Chatgruppe, Meister steigen auf.', 'Mädchen aus der Jugend und deine Töchter rücken mit 16 als Spielerinnen auf.'] },
    en: { title: "Women's team with squad and league", items: ["The women's team now has 16 real players, a coach and its own league table – Club → Women.", 'Results every week in the group chat, champions go up.', 'Girls from the youth section and your daughters join at 16 as players.'] },
  },
  {
    id: '2026-10-29-8',
    de: { title: 'Bunte Trikots, Hallenuhr und Hallentore', items: ['Deine bunten Trikots bleiben: Beißt sich nur der Torwart, zieht sich der Torwart um – nicht die ganze Mannschaft.', 'Die Hallenuhr läuft 2 × 20 Minuten wie im Futsal statt bis zur 90.', 'Rot-weiße Handballtore und leichte Fangnetze in der Halle – man sieht, wer vor dem Tor steht.'] },
    en: { title: 'Colourful kits, indoor clock and indoor goals', items: ['Your colourful kits stay on: if only the keeper clashes, the keeper changes – not the whole team.', 'The indoor clock runs 2 × 20 minutes like futsal instead of up to 90.', 'Red-and-white handball goals and light catch nets indoors – you can see who is in front of goal.'] },
  },
  {
    id: '2026-10-29-7',
    de: { title: 'Mehr Nationalitäten', items: ['Neue Karrieren: auch ukrainische, rumänische, kosovarische, afghanische, bulgarische, iranische und vietnamesische Namen – im Verhältnis wie im Mikrozensus 2024, deutscher Anteil wie bisher.', 'Eigene Vornamen und Dossier-Sätze je Gruppe; keine echten Nationalspieler als Namen.'] },
    en: { title: 'More nationalities', items: ['New careers: Ukrainian, Romanian, Kosovar, Afghan, Bulgarian, Iranian and Vietnamese names too – in proportion to the 2024 German microcensus, German share as before.', 'Own first names and dossier lines per group; no real internationals as names.'] },
  },
  {
    id: '2026-10-29-6',
    de: { title: 'Retro-Trikots, neuer Trikot-Editor, Ausrüster und Trainer des Monats', items: ['14 Retro-Muster nach legendären 90er-Trikots, frei einfärbbar, viele mit dritter Farbe.', 'Trikot-Editor in Abschnitten, Muster als Vorschau in deinen Farben.', 'Ausrüstervertrag: Rabatt auf Trikotsätze, ab einer Liga Freiware.', 'Trainer des Monats und der Saison im Kreisblatt, mit Platz auf der Ehrentafel.'] },
    en: { title: 'Retro kits, new kit editor, kit supplier and Manager of the Month', items: ['14 retro patterns after legendary 90s shirts, in any colours, many with a third colour.', 'Kit editor in sections, patterns previewed in your colours.', 'Kit supplier deal: discount on kit sets, free kit from a certain league up.', 'Manager of the Month and of the Season in the District Gazette, with a place on the roll of honour.'] },
  },
  {
    id: '2026-10-29-5',
    de: { title: 'Stadion, Schiri-Spesen, Kadergrenze und Fahrten mit echten Preisen', items: ['Ab der Landesliga lässt sich der Platz zum Stadion für 2500 Zuschauer ausbauen.', 'Die Kadergrenze steht im Kader-Reiter und lässt sich mit − und + verschieben.', 'Schiri-Spesen wie im echten Verband – ab der Landesliga mit zwei Assistenten.', 'Abschlussfahrt und Trainingslager kosten je Person so viel wie in echt; der Verein gibt einen Zuschuss, den du festlegst.', 'Trainingslager je Liga: Baggersee, Sportschule des Verbands oder Belek.'] },
    en: { title: 'Stadium, referee fees, squad limit and trips at real prices', items: ['From the Landesliga up you can expand your ground into a stadium for 2,500 spectators.', 'The squad limit is shown in the squad tab and can be moved with − and +.', 'Referee fees as in a real association – from the Landesliga up with two assistants.', 'The end-of-season trip and training camp cost what they really cost per person; the club gives a subsidy you set.', 'Training camp by league: the lake, the association\'s sports school or Belek.'] },
  },
  {
    id: '2026-10-29-4',
    de: { title: 'Regionale Namen, Tim am Fenster, graue Haare', items: ['Mit gewähltem Bundesland tragen viele Spieler, Trainer und Schiris dort typische Namen – in Bayern Huber, Gruber oder Mayr, dazu Vornamen wie Xaver, Josef und Korbinian.', 'Trainerbewerber sehen so alt aus, wie sie sind; Spieler und Trainer werden mit den Jahren grau.', 'Der Namensgenerator erzeugt keine Namen bekannter Nationalspieler mehr.', 'Tim „Der Tiger“ lehnt im Hinterhof auf einem Kissen vor dem Fenster – Kopf und Arme verschwinden nicht mehr in der Wand.'] },
    en: { title: 'Regional names, Tim at the window, grey hair', items: ['With a state chosen, many players, managers and referees carry names typical of it – Huber, Gruber or Mayr in Bavaria, with first names like Xaver, Josef and Korbinian.', 'Manager applicants look as old as they are; players and managers turn grey over the years.', 'The name generator no longer produces names of well-known internationals.', 'Tim "The Tiger" leans on a cushion in front of the backyard window – his head and arms no longer vanish into the wall.'] },
  },
  {
    id: '2026-10-29-3',
    de: { title: 'Ligen bis zur Oberliga, Bundesland, voller überregionaler Pokal und Winterpause', items: ['Bundesland wählen: Die Ligen heißen wie in deinem Landesverband, die Vereine bekommen regional klingende, erfundene Namen.', 'Drei neue Ligen über der Bezirksliga bis zur Oberliga – mehr Zuschauer, höherer Eintritt, stärkere Gegner. Ab der Landesliga direkt in den Landespokal.', 'Auf- und Abstieg auch für alle anderen Vereine, in jeder Liga.', 'Überregionaler Pokal mit 64 Vereinen: Alle Paarungen laufen mit, der echte Sieger wird ausgespielt.', 'Winterpause als eigene Woche mit dem Hallenturnier und eigener Turnier-Aufstellung.'] },
    en: { title: 'Leagues up to the Oberliga, choose your state, full nationwide cup and winter break', items: ['Choose your state: leagues are named as in your regional association, and clubs get made-up names that sound local.', 'Three new leagues above the county league up to the Oberliga – more spectators, higher entry fees, stronger opponents. From the Landesliga up, straight into the State Cup.', 'Promotion and relegation for all the other clubs too, in every league.', 'Nationwide cup with 64 clubs: every tie is played and the real winner is decided.', 'Winter break as its own week with the indoor tournament and a separate tournament line-up.'] },
  },
  {
    id: '2026-10-29-2',
    de: { title: 'Systemwechsel im laufenden Spiel', items: ['Im Taktik-Blatt an der Seitenlinie und im Liveticker lässt sich das System während des Spiels umstellen.', 'Die Spieler laufen ihre neuen Positionen an – bis alle stehen, wackelt die Ordnung.'] },
    en: { title: 'Change system during the match', items: ['In the touchline tactics sheet and in the live ticker you can change your system during the match.', 'The players run to their new positions – until everyone is in place, the shape wobbles.'] },
  },
  {
    id: '2026-10-29',
    de: { title: 'Ecken: Torwart fängt Flanken, Abwehr deckt eng', items: ['Auf dem Großfeld fängt der Torwart Flanken in den Fünfmeterraum ab.', 'Verteidiger gehen mit ihrem Mann zum Ball; ein echtes Kopfballduell entscheidet, wer köpft.', 'Tore nach Ecken auf dem Großfeld: etwa jede elfte statt jede siebte Ecke.'] },
    en: { title: 'Corners: keeper claims crosses, tighter marking', items: ['On the full-size pitch the goalkeeper claims crosses into the six-yard box.', 'Defenders go to the ball with their man; a real aerial duel decides who heads it.', 'Goals from corners on the full-size pitch: about one in eleven instead of one in seven.'] },
  },
  {
    id: '2026-10-28-3',
    de: { title: 'Torwart im Strafraum', items: ['Schüsse aus dem Strafraum gehen auf Sportplatz und Großfeld nicht mehr so oft rein – etwa jeder fünfte statt jeder dritte.', 'Vor dem großen Tor hechtet der Torwart weiter.', 'Kopfbälle zählen für den Torwart als Schuss – auf dem Großfeld sind rund 15 % der Tore Kopfballtore. In kurzen Spielen fallen auf großen Plätzen weniger Tore.'] },
    en: { title: 'Goalkeeper in the box', items: ['Shots from inside the box no longer go in as often on the 9-a-side and full-size pitches – about one in five instead of one in three.', 'In front of the big goal the keeper dives further.', 'Headers count as shots for the keeper – about 15 % of goals on the full-size pitch are headers. Short games on large pitches have fewer goals.'] },
  },
  {
    id: '2026-10-28-2',
    de: { title: 'Torwart hält Fernschüsse, Relegation mit Pause', items: ['Auf dem Großfeld geht nur noch etwa jeder achte Schuss rein statt jeder fünfte – Fernschüsse hält der Torwart fast immer. In kurzen Spielen fallen dort dafür weniger Tore.', 'Relegation: Nach dem Hinspiel erst das Ergebnis und „Weiter zum Rückspiel“.', 'Behoben: Der Torwart lenkt harte Schüsse nicht mehr ins eigene Netz.'] },
    en: { title: 'Keepers stop long shots, play-off with a break', items: ['On the full-size pitch only about one shot in eight goes in instead of one in five – the keeper almost always stops long shots. Short games there have fewer goals as a result.', 'Play-off: after the first leg you see the result and “On to the second leg” first.', 'Fixed: the goalkeeper no longer tips hard shots into his own net.'] },
  },
  {
    id: '2026-10-28',
    de: { title: 'Auswärtstrikot, Englische Woche, Krähe und Spielerentwicklung', items: ['Auswärtstrikot im Trikot-Editor: Bei ähnlichen Farben läuft der Gast im Auswärtstrikot auf, sonst im Ausweichtrikot – der Torwart hebt sich immer ab.', 'Englische Woche: Nach dem Pokalspiel erst das Ergebnis und „Weiter zum Sonntag“, dann das Ligaspiel; höchstens ein Pokal je Woche, wenn der Kalender Platz hat.', 'Spielerentwicklung mit verborgenen Typen – früh, spät, Durchbruch oder Stillstand – und einer Grenze je Liga; Nachhaken im Teamchat nur noch zweimal je Spieltag.', 'Neuer Vorfall: Eine renitente Krähe greift die Spieler an. Ecken kommen im Strafraum an, Gewitter nur zur passenden Jahreszeit, Namen und Kneipengeschichten passen zu Herkunft und Position.', 'Behoben: kein Rückwechsel, Torwart im Feld im normalen Trikot, Relegation mit Aufstellung und richtiger Spielerzahl, Hallenbande bündig, Kabine am Ascheplatz, Streifen an Hauswänden.'] },
    en: { title: 'Away kit, midweek games, crow and player development', items: ['Away kit in the kit editor: with similar colours the visitors wear their away kit, otherwise a change kit – the goalkeeper always stands out.', 'Midweek games: after the cup game you see the result and “On to Sunday” first, then the league match; at most one cup per week when the calendar has room.', 'Player development with hidden types – early, late, breakthrough or stalled – and a limit per league; asking again in the team chat only twice per match day.', 'New incident: a stubborn crow attacks the players. Corners reach the box, thunderstorms only come in the right season, names and pub stories match origin and position.', 'Fixed: no re-entry, goalkeeper playing outfield in the normal shirt, play-off with line-up and the right number of players, indoor boards flush, ash pitch shelter, stripes on house walls.'] },
  },
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
