// „Was ist neu": die Highlights jeder Lieferung, zweisprachig. Neueste zuerst; id = Datum der Lieferung.
// Muss zu CHANGELOG.md / CHANGELOG.en.md passen (tests/whatsnew.test.js prüft die Überschriften).
export const CHANGELOG = [
  {
    id: '2026-11-13-7',
    de: { title: 'Stadionsprecher, Kreisblatt und Zurufe mit Abwechslung', items: ['Stadionsprecher: Gästetore, Eigentore, Wechsel, Halbzeit, Endstand und Zuschauerzahl haben jetzt je drei Fassungen.', 'Kreisblatt: Die Schlagzeilen nach Nullnummer, Remis, knappem und hohem Sieg kommen in drei Fassungen.', 'Zurufe von der Linie: Jeder der vier Zurufe hat vier Fassungen in der Sprechblase; die Knöpfe heißen weiter wie vorher.'] },
    en: { title: 'Announcer, gazette and touchline shouts with more variety', items: ['Stadium announcer: away goals, own goals, substitutions, half-time, full time and attendance now come in three versions each.', 'District Gazette: headlines after goalless draws, draws, narrow and big wins come in three versions.', 'Touchline shouts: each of the four shouts has four versions in the speech bubble; the buttons keep their names.'] },
  },
  {
    id: '2026-11-13-6',
    de: { title: 'Mehr Abwechslung an der Linie und in der Kneipe', items: ['Liveticker an der Seitenlinie: Anpfiff, Halbzeitansprache und Gegentor haben jetzt mehrere Fassungen. Die Halbzeitfrage passt sich dem Spielstand an – Führung, Rückstand oder Gleichstand.', 'Kneipe: Runde ausgeben, Gespräche, Bierdeckel-Taktik und der Wirt erzählen nicht mehr jede Woche dasselbe.', 'Neu am Schwarzen Brett: Ein Flutlichtmast fällt beim Abschlusstraining aus. Elektriker rufen, selbst ranlassen – ein Elektriker im Kader repariert umsonst – oder im Halbdunkel weitermachen.'] },
    en: { title: 'More variety on the touchline and in the pub', items: ['Touchline live ticker: kick-off, half-time talk and conceding now come in several versions. The half-time question follows the score – ahead, behind or level.', 'Pub: buying a round, one-to-ones, beer-mat tactics and the landlord no longer say the same thing every week.', 'New on the noticeboard: a floodlight mast fails during final training. Call the electrician, let someone have a go – an electrician in the squad fixes it for free – or carry on in the half-light.'] },
  },
  {
    id: '2026-11-13-5',
    de: { title: 'Gesten bei Ecke und Einwurf', items: ['Ecke: Der Schütze hebt den Arm, bevor er anläuft – das übliche Zeichen an die Mitspieler.', 'Einwurf: Bis zu zwei Mitspieler in der Nähe winken nach dem Ball, solange der Werfer ihn in den Händen hält.'] },
    en: { title: 'Gestures at corners and throw-ins', items: ['Corner: the taker raises an arm before the run-up – the usual signal to team-mates.', 'Throw-in: up to two nearby team-mates wave for the ball while the thrower holds it.'] },
  },
  {
    id: '2026-11-13-4',
    de: { title: 'Feste Rückennummern', items: ['Ab der Kreisklasse C trägt jeder Spieler deiner Mannschaft eine feste Rückennummer – auf der Spielerkarte und im 3D-Spiel auf dem Trikot. Vergeben wird klassisch nach Position (Torwart 1, Abwehr 2–5, Mittelfeld 6, 8, 10, Angriff 9, 7, 11), danach ab der 12.', 'Im Spielerprofil kannst du die Nummer ändern. Trägt sie schon jemand, tauschen die beiden.', 'Vereinslegenden: Als vierte Ehrung kann ihre Rückennummer gesperrt werden. Nach 10 Saisons wird sie von selbst wieder frei; im Museum kannst du sie ab 3 Saisons von Hand wieder vergeben.'] },
    en: { title: 'Fixed shirt numbers', items: ['From the third district division up, every player in your team wears a fixed shirt number – on the player card and on the shirt in the 3D match. Numbers are given out the classic way by position (keeper 1, defence 2–5, midfield 6, 8, 10, attack 9, 7, 11), then from 12 upwards.', 'You can change the number in the player profile. If someone already wears it, the two swap.', 'Club legends: as a fourth honour their shirt number can be retired. After 10 seasons it becomes free again by itself; in the museum you can issue it again by hand from 3 seasons on.'] },
  },
  {
    id: '2026-11-13-3',
    de: { title: 'Vereinslegenden, Abschied und Leben am Platz', items: ['Vereinslegenden: Wer nach 100 Spielen oder 50 Toren für den Verein aufhört, wird verabschiedet – mit Abschiedsspiel, Trikot an der Wand des Vereinsheims oder Blumenstrauß. Die Legenden stehen im Museum und schauen später beim Training vorbei.', 'Trainerabschied: Die Ehrentafel der Trainer zeigt jetzt auch Aufstiege, Abstiege und die beste Platzierung der Amtszeit.', 'Am Rasen- und Ascheplatz stehen jetzt der Platzwart mit dem Kreidewagen und ein Linienrichter aus dem Verein an der Seitenlinie.'] },
    en: { title: 'Club legends, farewells and life at the ground', items: ['Club legends: anyone who retires after 100 games or 50 goals for the club gets a send-off – a farewell match, a shirt on the clubhouse wall or a bouquet. Legends are listed in the museum and drop in on training later.', 'Manager farewell: the managers\' roll of honour now also shows promotions, relegations and the best finish of the tenure.', 'On the grass and cinder pitches, the groundsman with his line marker and a club linesman now stand on the touchline.'] },
  },
  {
    id: '2026-11-13-2',
    de: { title: 'Trainer-Rivale', items: ['Ein gegnerischer Trainer kann dir jetzt persönlich im Nacken sitzen: Er entsteht aus einer deutlichen Niederlage (drei Tore Abstand) oder wenn dich derselbe Verein in einer Saison zweimal schlägt. Er hat einen Namen und eine Bilanz mit dir.', 'Wechselst du die Liga, übernimmt er früher oder später einen Verein dort – ihr seht euch wieder.', 'Vor dem Duell stichelt er in der Zeitung, danach geht es um den Handschlag. Siege gegen ihn heben die Stimmung besonders, Niederlagen drücken sie.', 'Du findest ihn unter Verein bei den Rivalen.'] },
    en: { title: 'Rival manager', items: ['An opposing manager can now get personal: he emerges from a heavy defeat (three goals or more) or when the same club beats you twice in a season. He has a name and a record against you.', 'If you change league, sooner or later he takes over a club there – you will meet again.', 'Before the game he needles you in the paper, afterwards it is about the handshake. Wins against him lift the mood more than usual, defeats weigh on it.', 'You find him under Club, among the rivals.'] },
  },
  {
    id: '2026-11-13-1',
    de: { title: 'Pressekonferenz', items: ['Ab der Regionalliga stellt die Presse Fragen. Vor einem Spitzenspiel (beide Mannschaften unter den ersten vier) kannst du eine große Ansage machen, den Gegner zum Favoriten erklären oder nichts sagen.', 'Wer den Mund voll nimmt, wird eine Woche später daran gemessen: Nach einem Sieg sind Vorstand und Kabine stolz, nach einer Niederlage wird dir dein Satz vorgelesen.', 'Nach drei Siegen in Folge kommt die Frage nach ganz oben, und bei einem unzufriedenen Spieler hakt die Presse nach, ob er noch eine Rolle spielt.'] },
    en: { title: 'Press conference', items: ['From the fourth tier up, the press asks questions. Before a top-of-the-table game (both teams in the top four) you can make a bold statement, call the opponents favourites or say nothing.', 'If you talk big, you are measured against it a week later: after a win, board and dressing room are proud; after a defeat your own line is read back to you.', 'After three wins in a row comes the question about the very top, and when a player is unhappy the press asks whether he still has a part to play.'] },
  },
  {
    id: '2026-11-12-3',
    de: { title: 'Einwürfe und weniger Elfmeter nach Ecken', items: ['Einwürfe: Zwei Mitspieler bieten sich jetzt an – einer kurz im Feld, einer die Linie entlang –, und der Werfer wartet einen Moment auf sie. Vorher warf er oft ins Leere, und der Gegner hatte den Ball.', 'Elfmeter: Beim Kopfballduell im Strafraum wurde viel zu oft gepfiffen, vor allem nach Ecken. Jetzt gibt es etwa halb so viele Elfmeter, so viele wie im echten Fußball.', 'Dadurch fallen im Schnitt rund 0,2 Tore je Spiel weniger.'] },
    en: { title: 'Throw-ins and fewer penalties after corners', items: ['Throw-ins: two team-mates now offer themselves – one short infield, one down the line – and the thrower waits a moment for them. Before, the throw often went to nobody and the opponents had the ball.', 'Penalties: aerial duels in the box were whistled far too often, above all after corners. There are now about half as many penalties, as many as in real football.', 'As a result, about 0.2 fewer goals are scored per match on average.'] },
  },
  {
    id: '2026-11-12-2',
    de: { title: 'Schwierigkeitsgrad und leichterer Einstieg', items: ['Neu: Schwierigkeitsgrad – entspannt, normal oder hart. Du wählst ihn beim Anlegen des Trainers und kannst ihn jederzeit unter Verein → Du umstellen. Er wirkt auf die Geduld des Vorstands, das Sponsorengeld und die Familie.', 'Familie: Im Profifußball (ab der Regionalliga) zehrt der Alltag jetzt etwas an der Geduld zu Hause, und eine Beziehungskrise kommt früher als bisher. Auf „entspannt“ bleibt es wie vorher, auf „hart“ wird es spürbar schwerer.', 'Einstieg: Die Kasse ist kürzer (Ausrüster-Angebote eingeklappt), unter „Privat“ steht je Bereich nur noch die nächste Stufe statt einer Wand gesperrter Knöpfe, und die Überschrift der Gründungsversammlung passt aufs Handy.', 'Stadionsprecher: Durchsagen warten jetzt, bis eine wichtigere Einblendung vorbei ist, statt verloren zu gehen.'] },
    en: { title: 'Difficulty and an easier start', items: ['New: difficulty – relaxed, normal or hard. You choose it when creating your manager and can change it at any time under Club → Me. It affects the board\'s patience, sponsor money and the family.', 'Family: in professional football (from the fourth tier) everyday life now wears a little on patience at home, and a relationship crisis comes sooner than before. On "relaxed" it stays as it was, on "hard" it gets noticeably tougher.', 'Getting started: the kitty page is shorter (supplier offers folded away), "Private life" shows only the next step per area instead of a wall of locked buttons, and the founding meeting\'s heading fits on a phone.', 'Stadium announcer: announcements now wait until a more important banner has gone instead of being lost.'] },
  },
  {
    id: '2026-11-12-1',
    de: { title: 'Sicherung der Spielstände', items: ['Jeder Speicherplatz bekommt automatisch eine Sicherung vom Ende der letzten Saison. Unter „Spielstände“ steht sie auf der Karte des Platzes; mit „Dorthin zurück“ holst du sie zurück (mit Nachfrage).', 'Ist der Speicher des Browsers voll, geht der Spielstand vor und die Sicherung fällt weg.', 'Trainertyp: „Sparfuchs“ ist man erst mit mindestens 20 000 € auf dem privaten Konto. Vorher galt fast jeder so, der sich unten noch gar nichts leisten konnte.'] },
    en: { title: 'Backup of your saves', items: ['Every save slot automatically gets a backup from the end of last season. Under "Saves" it is shown on the slot\'s card; "Go back to it" restores it (after asking).', 'If the browser\'s storage is full, the save itself takes priority and the backup is dropped.', 'Manager type: you only count as a "saver" with at least €20,000 in your private account. Before, almost everyone counted who could not yet afford anything lower down.'] },
  },
  {
    id: '2026-11-11-3',
    de: { title: 'Stadionsprecher: Halbzeit und Endstand', items: ['Die Durchsagen zum Halbzeitstand und zum Endstand waren nie zu sehen: Die eine ging unter der großen Halbzeit-Einblendung verloren, die andere wurde sofort vom Spielbericht verdeckt. Jetzt kommen beide an.', 'Bei Spielen mit Stadionsprecher erscheint der Spielbericht dafür gut drei Sekunden später.'] },
    en: { title: 'Stadium announcer: half-time and full time', items: ['The announcements of the half-time and final score were never visible: one was lost under the big half-time banner, the other was covered by the match report straight away. Both now come through.', 'In matches with an announcer, the match report therefore appears a good three seconds later.'] },
  },
  {
    id: '2026-11-11-2',
    de: { title: 'Gehalt verhandeln und Umzug', items: ['Wo der Verein dich bezahlt (ab der Bezirksliga), bittet der Vorstand einmal je Saison zum Vertragsgespräch: mehr fordern, alles lassen oder dem Verein zuliebe verzichten. Ob eine Forderung durchgeht, hängt am Vertrauen des Vorstands – eine Abfuhr kostet welches, ein Verzicht bringt welches.', 'Ein Verein, der im Sommer um dich wirbt, zahlt von sich aus 10 % mehr. Mit jedem Vereinswechsel beginnt ein neuer Vertrag.', 'Vereinswechsel in die Ferne (ab der Regionalliga immer, ab der Verbandsliga über Ligagrenzen): Du pendelst zunächst mit Zweitwohnung – das kostet Geld, Kraft und Geduld zu Hause. Umziehen beendet das, kostet einmalig und verlangt der Familie etwas ab, vor allem Schulkindern.'] },
    en: { title: 'Salary talks and moving house', items: ['Where the club pays you (from the County League up), the board asks for a contract talk once a season: demand more, leave things as they are or take a cut for the club\'s sake. Whether a demand goes through depends on the board\'s trust – a rebuff costs some, a cut earns some.', 'A club that courts you in the summer pays 10% more of its own accord. Every change of club starts a new contract.', 'Moving to a distant club (always from the fourth tier, across leagues from the sixth tier): at first you commute with a second flat – that costs money, energy and patience at home. Moving house ends that, costs a one-off sum and asks something of the family, school-age children above all.'] },
  },
  {
    id: '2026-11-11-1',
    de: { title: 'Privatleben des Trainers', items: ['Du verdienst jetzt eigenes Geld: unten bleibt etwas vom Beruf übrig, ab der Bezirksliga zahlt der Verein, in den Profiligen gibt es ein richtiges Gehalt. Das Geld liegt auf deinem privaten Konto, getrennt von der Vereinskasse.', 'Unter Verein → Ich gibt es „Privat“: Wohnen, Auto, Kleidung und Luxus kaufen, mit der Familie verreisen oder an den Verein spenden. Ein Zuhause entspannt die Familie, ein Auto spart Kraft – und dein Auftreten sollte zur Liga passen.', 'Aus deinem Verhalten ergibt sich ein Trainertyp (bodenständig, Sparfuchs, Lebemann, Geschäftsmann, Familienmensch, Wohltäter), der einmal je Saison wirkt.', 'Neue Familienereignisse: jemanden kennenlernen (Frau oder Mann), zusammenziehen, heiraten, Kinder, Einschulung, Pubertät, Krise, Trennung, Pflege der Eltern, Trauerfall. Trennung und Trauerfall lassen sich abschalten.', 'Endspiel und Supercup im neutralen Stadion werden nicht mehr wie ein Heimspiel abgerechnet.'] },
    en: { title: 'The manager\'s private life', items: ['You now earn money of your own: lower down something is left over from your job, from the County League the club pays, and in the professional leagues there is a proper salary. The money sits in your private account, separate from the club\'s.', 'Under Club → Me there is "Private life": buy a home, a car, clothes and luxuries, travel with the family or donate to the club. A home relaxes the family, a car saves energy – and your appearance should fit the league.', 'Your behaviour gives you a manager type (down to earth, saver, bon vivant, businessman, family person, benefactor), which takes effect once a season.', 'New family events: meeting someone (a woman or a man), moving in together, getting married, children, first day at school, the teenage years, a crisis, separation, caring for parents, bereavement. Separation and bereavement can be switched off.', 'Finals and the Super Cup at a neutral stadium are no longer accounted for like a home game.'] },
  },
  {
    id: '2026-11-09-8',
    de: { title: 'Stadionsprecher, Musik und mehr', items: ['Ab 60 Zuschauern gibt es eine Lautsprecheranlage: Gong, Begrüßung, Torschützen – der Sprecher ruft den Vornamen, die Fans den Nachnamen –, Wechsel, Zuschauerzahl, Halbzeit- und Endstand. Auf Wunsch auch mit Stimme (Sprachausgabe des Geräts).', 'Eigene, ruhige Musik im Vereinsheim und eine kurze Fanfare zum Einlaufen; in den Einstellungen unter Ton abschaltbar.', 'Regen: Die weißen Glanzpunkte auf dem nassen Boden standen still und sahen aus wie eingefrorene Tropfen – jetzt funkeln sie kurz auf, wie aufschlagende Tropfen.', 'Wechseln per Ziehen und Ablegen: Spieler von der Bank auf den ziehen, der raus soll (am Handy kurz halten, dann ziehen). Antippen geht weiter.', 'Turniere: Vor Hallen- und anderen Turnierspielen lässt sich jetzt aufstellen – wer fehlt, steht fürs ganze Turnier fest, und deine Aufstellung läuft genau so auf. Auf der Turnierkarte gibt es dafür „Aufstellung ändern“.'] },
    en: { title: 'Stadium announcer, music and more', items: ['From 60 spectators there is a PA system: chime, welcome, goalscorers – the announcer calls the first name, the fans the surname –, substitutions, attendance, half-time and final score. With a voice too if you like (the device\'s speech output).', 'Our own calm music in the clubhouse and a short fanfare as the teams walk out; can be switched off under Sound in the settings.', 'Rain: the white glints on the wet ground stood still and looked like frozen drops – now they flash up briefly, like drops hitting the ground.', 'Substitutions by drag and drop: pull a bench player onto the one who should come off (on a phone, hold briefly, then drag). Tapping still works.', 'Tournaments: you can now pick your line-up before indoor and other tournament games – who is missing is fixed for the whole tournament, and your line-up is exactly the one that takes the floor. The tournament card has a “Change the line-up” button.'] },
  },
  {
    id: '2026-11-09-7',
    de: { title: 'Preisprotest und Spiel der Europapokalsieger', items: ['Zu teure Eintrittskarten haben jetzt Folgen: Ab 150 % des üblichen Preises können die Fans protestieren – Spruchband, Auszug in der Halbzeit, weniger Zuschauer und schlechtere Stimmung im Verein. Je teurer, desto öfter.', 'Wer den obersten oder zweiten Europapokal gewinnt, spielt zum Saisonstart am Mittwochabend gegen den Sieger des anderen Wettbewerbs: ein Spiel im neutralen Stadion, bei Unentschieden direkt Elfmeterschießen, 4 Mio. € Startgeld und 1 Mio. € für den Sieger.'] },
    en: { title: 'Price protest and the match of the European winners', items: ['Overpriced tickets now have consequences: from 150% of the usual price, fans may protest – a banner, a walkout at half-time, fewer spectators and a sourer mood in the club. The dearer, the more often.', 'Whoever wins the top or second European cup plays the winners of the other competition on a Wednesday night at the start of the season: one match at a neutral stadium, straight to penalties if level, €4m participation fee and €1m for the winners.'] },
  },
  {
    id: '2026-11-09-6',
    de: { title: 'Vereinsgelände in 3D und mehr', items: ['Was du auf dem Vereinsgelände baust, steht jetzt auch im Spiel neben dem Platz: Trainingsplatz, Halle und Trainingszentrum, Funktionsgebäude, Medizin, Geschäftsstelle, Jugendhaus bis zum Nachwuchsleistungszentrum, Parkplatz, Fanshop und Vorplatz mit Shuttlebus.', 'Weltmeisterschaft, Süd- und Afrikameisterschaft mit Spiel um Platz 3 wie in echt.', 'Gegner-Check jetzt auch vor Pokalspielen.', 'Taktik umschalten auch in Unter- oder Überzahl nach Platzverweisen, auf Wunsch ab Anpfiff.'] },
    en: { title: 'Club grounds in 3D and more', items: ['What you build on the club grounds now stands next to the pitch in the game: training pitch, hall and training centre, team building, medical block, club office, youth house up to the academy, car park, club shop and forecourt with shuttle bus.', 'World Cup, South American and Africa Championship with a third-place play-off as in reality.', 'Opponent check now also before cup games.', 'Switch tactics also when a man down or up after sendings-off, from kick-off if you like.'] },
  },
  {
    id: '2026-11-09-5',
    de: { title: 'Nationaltrainer nachgebessert', items: ['In der Kaderliste des Nationalteams hat jetzt jeder Spieler einen eigenen Namen – vorher gab es manche Namen doppelt.', 'Neu geprüft im Browser: Anfrage annehmen, Kader ändern, Länderspielpause und das Spiel an der Seitenlinie mit Halbzeit und Wechseln.'] },
    en: { title: 'National team manager polished', items: ['In the national team squad list every player now has a name of their own – some names used to appear twice.', 'Newly checked in the browser: accepting the offer, changing the squad, the international break and the touchline game with half-time and substitutions.'] },
  },
  {
    id: '2026-11-09-4',
    de: { title: 'Nationaltrainer im Nebenamt', items: ['Mit gutem Ruf fragen Verbände an: Nationaltrainer neben dem Verein. Kleine Länder melden sich früh, die großen erst, wenn du oben angekommen bist – alle 126 Länder des Spiels sind möglich.', 'Du stellst den Kader aus allen Spielern des Landes zusammen, auch aus deinem eigenen Verein, und stehst bei Qualifikation, Nationenliga und Turnieren an der Seitenlinie: Taktik, Zurufe und bis zu fünf Wechsel wie im Verein.', 'Annehmen, ablehnen oder das Amt jederzeit niederlegen – die Bilanz läuft mit.'] },
    en: { title: 'National team manager on the side', items: ['With a good reputation, federations come asking: national team manager alongside your club. Small countries call early, the big ones only once you have made it to the top – all 126 countries in the game are possible.', 'You pick the squad from all of the country\'s players, your own club included, and stand on the touchline in qualifying, the League of Nations and tournaments: tactics, shouts and up to five substitutions as at your club.', 'Accept, decline or resign at any time – your record is kept.'] },
  },
  {
    id: '2026-11-09-3',
    de: { title: 'Ausscheidungen für die interkontinentalen Play-offs', items: ['Wer in die interkontinentalen Play-offs der WM darf, spielen die Verbände jetzt aus wie in echt: Asien mit einer vierten Runde in zwei Dreiergruppen und einem Duell mit Hin- und Rückspiel, Afrika mit Halbfinale und Finale der vier besten Gruppenzweiten, Ozeanien mit Halbfinale und Finale (der Verlierer des Finals geht in die Play-offs).', 'Nord- und Mittelamerika spielt die Qualifikation jetzt in drei Gruppen wie in echt.'] },
    en: { title: 'Eliminations for the inter-confederation play-offs', items: ['Who gets into the World Cup inter-confederation play-offs is now decided by the confederations as in reality: Asia with a fourth round in two groups of three and a two-legged tie, Africa with semi-finals and a final of the four best runners-up, Oceania with semi-finals and a final (the losing finalist goes into the play-offs).', 'North and Central America now plays qualifying in three groups, as in reality.'] },
  },
  {
    id: '2026-11-09-2',
    de: { title: 'Qualifikation über zwei Saisons', items: ['Die europäische Qualifikation zu Welt- und Europameisterschaft beginnt jetzt wie in echt schon im März der Saison davor: zwei Spieltage im März, zwei im Juni nach der Saison, der Rest im Herbst, Play-offs im März danach.', 'Im März spielen nur Gruppen ohne Viertelfinalisten der Ligen der Nationalteams – die steigen erst im Juni ein, wie in echt.', 'Steht dein Spieler schon im März im Einsatz, kommt das Spiel als Karte ins Vereinsheim.'] },
    en: { title: 'Qualifying over two seasons', items: ['European qualifying for the World Cup and the European Championship now starts in the March of the season before, as in reality: two matchdays in March, two in June after the season, the rest in the autumn, play-offs the following March.', 'In March only groups without quarter-finalists of the national team leagues play – those join in June, as in reality.', 'If your player is already called up in March, the game appears as a card in the clubhouse.'] },
  },
  {
    id: '2026-11-09-1',
    de: { title: 'Trikotvorlagen aus der Trikotgeschichte', items: ['17 neue Trikotvorlagen nach der Trikotgeschichte, die du geschickt hast – nah am Original und frei einfärbbar, ohne Wappen, Sponsoren oder Herstellerzeichen.', 'Neu sind unter anderem Raglanpasse, Passe mit Brustband, Seitenbalken, Westennaht, Bogenseiten und Schulterbalken, dazu in Retro Pinselschultern, Winkelbalken, Verlaufsringel, Punktverlauf, Fächersaum und Schulterband und Ton in Ton Quadrate und Scherben.', 'Symmetrie wie im Vorbild: Wo das Original nicht spiegelgleich ist, ist es die Vorlage auch nicht – etwa Pinselstriche, Winkelbalken, Würfelraster und die Allover-Muster Zickzack, Welle, Keile, Linienbruch und Konfetti.'] },
    en: { title: 'Kit templates from the kit history', items: ['17 new kit templates based on the kit history you sent – close to the originals and freely colourable, without crests, sponsors or maker marks.', 'New are, among others, raglan yoke, yoke and chest band, side bars, vest seam, curved side panels and shoulder bars, plus brushed shoulders, chevron bars, fading hoops, dot fade, fan hem and shoulder band in retro, and tonal squares and shards.', 'Symmetry as in the original: where the original is not mirror-symmetrical, neither is the template – for example brush strokes, chevron bars, block grid and the all-over patterns zigzag, wave, wedges, broken lines and confetti.'] },
  },
  {
    id: '2026-11-08-9',
    de: { title: 'Abstellungsgebühren und neue Trikotvorlagen', items: ['23 neue Trikotvorlagen nach deinen Trikotbögen, alle frei einfärbbar: Sägezahn, Rauten, Zickzack-Ringel, Pinselstriche, Stern, Blockkaro, Doppel-V und mehr. Im Editor neu sortiert nach 1-, 2-, 3- und 4-farbig und Retro – mit vierter Farbe für die neuen 4-farbigen Vorlagen.', 'Mehr Farben zur Auswahl, auch Neon: Gelb, Grün, Orange, Pink, Cyan und Violett. Muster mit Raster oder Zufallsverteilung sind jetzt spiegelgleich zur Mitte.', 'Für jeden Spieler, den du für ein Länderspiel abstellst, bekommt dein Verein jetzt Geld – mit den echten Sätzen: in Europa 3659 € je Spieler und Spiel, für die WM-Qualifikation zusätzlich 2362 € vom Weltverband.', 'Bei der Europameisterschaft gibt es neu eine Entschädigung je Spieler und Tag, gestaffelt nach Liga: 10 187 € in der 1. Liga, 3395 € ab der 3. Profiliga.', 'Die Gebühren stehen in der Kasse und in der Nachricht zur Länderspielpause.'] },
    en: { title: 'Release fees and new kit templates', items: ['23 new kit templates based on your kit sheets, all freely colourable: sawtooth, diamonds, zigzag hoops, brush strokes, star, block checks, double V and more. The editor now sorts them into 1, 2, 3 and 4 colours and retro – with a fourth colour for the new four-colour templates.', 'More colours to choose from, including neon: yellow, green, orange, pink, cyan and violet. Patterns with a grid or random spread are now mirror-symmetrical to the centre.', 'For every player you release for an international, your club now receives money – at the real rates: in Europe €3,659 per player and game, plus €2,362 from the world governing body for World Cup qualifiers.', 'New at the European Championship: compensation per player and day, graded by league – €10,187 in the top division, €3,395 from the third professional tier down.', 'The fees appear in the accounts and in the international break news.'] },
  },
  {
    id: '2026-11-08-8',
    de: { title: 'Ligen der europäischen Nationalteams', items: ['In den Jahren ohne europäische Qualifikation spielen die europäischen Länder jetzt in drei Ligen mit Auf- und Abstieg – im Herbst sechs Spieltage, im März Viertelfinale und Abstiegs-Play-offs mit Hin- und Rückspiel, im Sommer die Endrunde der besten vier.', 'Die Gruppensieger ziehen wie in echt in die Play-offs der nächsten Qualifikation ein, wenn sie es nicht über die Gruppe schaffen. Die Gruppendritten sind dort nicht mehr dabei.', 'Spieler aus deinem Kader werden auch dafür nominiert: Ihre Spiele stehen in der Länderspielpause im Vereinsheim, mit Liga und Gruppe.'] },
    en: { title: 'Leagues for the European national teams', items: ['In the years without European qualifying, the European countries now play in three leagues with promotion and relegation – six matchdays in the autumn, quarter-finals and relegation play-offs over two legs in March, and the finals of the best four in the summer.', 'As in reality, the group winners go into the play-offs of the next qualifying campaign if they do not make it through their group. The third-placed teams are no longer part of them.', 'Players from your squad are called up for it as well: their games are in the clubhouse during the international break, with league and group.'] },
  },
  {
    id: '2026-11-08-7',
    de: { title: 'Play-offs der Qualifikation', items: ['Die Play-off-Plätze werden jetzt gespielt statt einfach den Nächstbesten gegeben – im echten Format: in Europa Halbfinale und Finale in einem Spiel, je Pfad ein Platz; bei der Europameisterschaft je nach Gastgeberplätzen auch mit Hin- und Rückspiel.', 'Neu bei der Weltmeisterschaft: die interkontinentalen Play-offs mit sechs Ländern aus fünf Verbänden um zwei Plätze, die zwei Stärksten gesetzt im Finale.', 'Die Play-offs liegen in der Länderspielpause im März. Steht dein Spieler im Halbfinale, folgt bei einem Sieg gleich das Finale – mit Verlängerung und Elfmeterschießen, wenn du im Stadion zuschaust.'] },
    en: { title: 'Qualifying play-offs', items: ['The play-off places are now played for instead of simply going to the next best – in the real format: in Europe a one-off semi-final and final, one place per path; at the European Championship, depending on the host places, also over two legs.', 'New at the World Cup: the inter-confederation play-offs with six countries from five confederations for two places, the two strongest seeded into the finals.', 'The play-offs are in the March international break. If your player reaches a semi-final, a win goes straight on to the final – with extra time and penalties if you watch in the stadium.'] },
  },
  {
    id: '2026-11-08-6',
    de: { title: 'Länderspielpausen', items: ['Die Qualifikation zu Welt- und Kontinentalmeisterschaften läuft jetzt über die Saison: drei Länderspielpausen wie im echten Kalender – im Herbst bis zu vier Spiele, im November und im März je zwei. Die Liga ruht, kein Ligaspiel fällt aus.', 'Sind Spieler aus deinem Kader nominiert, steht ihr Spiel im Vereinsheim: im Stadion ansehen, nur das Ergebnis nehmen oder den Rest vorspulen – mit Gruppentabelle. Sie kommen etwas müde zurück, manchmal verletzt, und ihr Marktwert steigt ein wenig.', 'Gastgeber sind automatisch dabei, wo sie feststehen – bei der Weltmeisterschaft 2030 alle sechs.'] },
    en: { title: 'International breaks', items: ['Qualifying for the World Cup and the continental championships now runs through the season: three international breaks as in the real calendar – up to four games in the autumn, two each in November and March. The league rests, no league game is lost.', 'If players from your squad are called up, their game is in the clubhouse: watch it in the stadium, take the result only or skip the rest – with the group table. They come back a little tired, sometimes injured, and their market value rises a little.', 'Hosts qualify automatically where they are known – all six at the 2030 World Cup.'] },
  },
  {
    id: '2026-11-08-5',
    de: { title: 'Vereinsheim ohne Fenster', items: ['Das Fenster zum Platz ist weg. An seiner Stelle wählst du, was an der Wand hängt: eine Vitrine mit deinen Meisterschaften, Pokalen und Aufstiegen, ein Mannschaftsfoto in Vereinsfarben (jede Saison neu) oder große Tafeln.', 'Große Tafeln: Auf der Taktiktafel stehen die Namen deiner Aufstellung, die Pinnwand zeigt deinen Tabellenausschnitt, der Kalender die nächsten drei Termine – Liga, Pokal und Europapokal.', 'Umschalten mit ⇄ an der Wand oder im Notizbuch unter Grafik.'] },
    en: { title: 'Clubhouse without the window', items: ['The window onto the pitch is gone. In its place you choose what hangs on the wall: a trophy cabinet with your titles, cups and promotions, a team photo in club colours (new every season) or big boards.', 'Big boards: the tactics board shows the names in your line-up, the notice board your part of the table, the calendar the next three dates – league, cup and European games.', 'Switch with ⇄ on the wall or in the notebook under Graphics.'] },
  },
  {
    id: '2026-11-08-4',
    de: { title: 'Europapokal', items: ['Platz 1 bis 4 der 1. Liga spielt in der nächsten Saison europäisch: Meister und Vize im obersten von drei Wettbewerben, der Dritte im zweiten, der Vierte im dritten – gegen erfundene Vereine aus 22 Ländern.', 'Echtes Format: Ligaphase mit 36 Vereinen und acht Gegnern aus vier Lostöpfen, Platz 1–8 direkt ins Achtelfinale, 9–24 in die Play-offs, K.-o.-Runden mit Hin- und Rückspiel, Endspiel auf neutralem Platz.', 'Dienstags und donnerstags unter Flutlicht, vor dem Ligaspiel am Sonntag. Prämien in echter Höhe: Startgeld, Sieg- und Remisprämien, Rundenprämien bis zum Endspiel.', 'Profis spielen keinen Landespokal mehr – wie in echt stehen Zweit- und Erstligisten direkt im überregionalen Pokal.'] },
    en: { title: 'European football', items: ['Places 1 to 4 in the 1. Liga play in Europe next season: champions and runners-up in the top one of three competitions, third place in the second, fourth in the third – against fictional clubs from 22 countries.', 'The real format: a league phase with 36 clubs and eight opponents from four pots, places 1–8 straight into the round of 16, 9–24 into the play-offs, two-legged knockout rounds, a one-off final at a neutral ground.', 'Tuesdays and Thursdays under floodlights, before the league game on Sunday. Real-size prize money: starting fee, win and draw bonuses, round bonuses all the way to the final.', 'Pro clubs no longer play the state cup – as in real life, second- and top-flight clubs go straight into the national cup.'] },
  },
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
