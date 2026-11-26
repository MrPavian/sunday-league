# Sunday League – Roadmap: was noch offen ist

Stand 2026-11-11. Diese Datei ist die kurze Liste der offenen Punkte. Alles Erledigte, die Herleitungen, Messwerte und Quellen
stehen im Archiv: **[docs/ROADMAP-ARCHIV.md](docs/ROADMAP-ARCHIV.md)**. Abschnittsnummern in Code-Kommentaren und Tests
(„ROADMAP 11.x“) meinen das Archiv; die Nummern in Klammern unten verweisen ebenfalls dorthin.

Gestrichen nach Nutzerentscheid: Koop und Mehrspieler, Bolzplatz-Modus, Challenges, Saisonziele zum Selbstwählen.
Editoren und Modding (Phase 8) nur auf ausdrücklichen Auftrag.

## 1. Als Nächstes

### 11.18 Spielqualität und neue Ideen (vom Nutzer festgelegt, 2026-11-11)
Reihenfolge: erst die Spielqualität (A), dann Ausbau des Bestehenden (B), dann die neuen Ideen (C). Der Test auf einem echten
Android-Gerät steht nach Nutzerentscheid ganz am Ende.

**A – Spielqualität**
1. **Balance über lange Karrieren messen.** ✅ **Erste Messung 2026-11-12** (`scripts/balance-audit.mjs`, echte simulierte
   Spiele, selbst angelegter Trainer, drei Spielweisen; 12 Karrieren × 12 Saisons ab Liga 1 und je 6 × 6 mit Start in den Ligen
   1, 5, 7, 9, 10, 12; keine Abstürze).
   - Gemessen und belastbar: Stimmung, Energie und Vertrauen hängen nirgends dauerhaft am Anschlag. In den Ligen 1–5 gab es
     keine Entlassung (252 Saisons), ab Liga 7 wird entlassen.
   - **Befund Familie:** Die Geduld der Familie fällt bei einem Trainer, der jede Woche beide Aktionen nutzt, im Mittel nur auf
     82–90 und im schlechtesten Zehntel auf 65–85 – der Bereich unter 60 wird praktisch nie erreicht. Die Ereignisse dafür
     (familienwochenende, priv_krise, priv_trennung) kamen in keiner Messung vor. Die Werte hat der Nutzer am 2026-10-31
     festgelegt. ✅ **Nutzerentscheid 2026-11-12:** „ein Mittelding, je nach Schwierigkeitsgrad schwieriger" – umgesetzt in
     difficulty.js (normal: Krise unter 45, ab der Regionalliga ein Punkt Geduld weniger in jeder zweiten Woche; hart: unter 60,
     ein Punkt je Woche; entspannt: wie vorher). Offen: nachmessen, sobald der Mess-Bot oben mithalten kann.
   - **Behoben:** Fast jeder Trainer ohne Käufe galt als „Sparfuchs" (10 von 12 Saisons). Jetzt erst ab 20 000 € auf dem Konto
     (Spielwert).
   - **Nicht belastbar:** Kasse und Tabellenplatz in den oberen Ligen. Der Mess-Bot stellt nicht um, kauft kaum ein und steigt
     von dort regelmäßig ab (im Mittel Platz 5 von 6); die 3 bis 7 Entlassungen je 10 Saisons oben messen den Bot, nicht das
     Spiel. Der Start in den Ligen 5 und 7 trägt zudem den Unterhalt der vollen Zulassung (Kasse tief im Minus). Offen: ein Bot,
     der spielt wie ein Mensch (Aufstellung, Transfers, Taktik), dann Kasse und Entlassungen oben neu messen.
2. **Ereignisdichte prüfen.** ✅ **Erste Zählung 2026-11-12** (`scripts/events-count.mjs`: 72 Karrieren × 12 Saisons über alle
   zwölf Ligen, 9504 Wochen, gemischte Ergebnisse ohne simulierte Spiele).
   - In 67 % der Wochen gibt es ein Ereignis, in jeder Liga zwischen 63 und 71 %. Keines ist zu häufig: vorn liegen die
     Derby-Wochen (je 5,9 %, so gewollt), Angebote (5,0 %) und Tims Runde (3,3 %); alles andere unter 2 %.
   - 170 von 202 ziehbaren Ereignissen kamen vor. Von den 32 fehlenden gehen die meisten auf die Messung zurück (keine Alten
     Herren und kein NLZ gegründet, keine simulierten Verletzungen, Vereinswechsel am Wechsel vorbei gesetzt). Echte Lücke: die
     drei Familien-Ereignisse aus Punkt 1.
   - ✅ **Geprüft 2026-11-15** (tests/event_reach.test.js): Die elf nie gezählten Ereignisse scheitern an der Messung, nicht am
     Spiel. Die Zählung würfelt nie ein 0:0 (`tiger_schlaf`), lässt Spieler sich nicht entwickeln (`profivertrag` ab Stärke 68,
     `berater` ab 130 – Profikader liegen bei 141 und mehr), hat keine Jugend (`profi_scout` → `profi_rueckkehr`,
     `mittraining_graetsche`, `pate_meint`), keine Unruhe (`grueppchen`, `mannschaftsrat`), vermutlich keinen Pokal in Reichweite
     (`elfmeter_training`). `rasenheizung` ist ein Bau, kein Ereignis. Der Test stellt für fünf davon (Grüppchen, Mannschaftsrat,
     Profivertrag, Tim schläft, Profi-Scout) den Zustand her und zeigt, dass sie dann kommen; die übrigen nur nach der Bedingung im Code; die Ligen 1 und 11 bleiben in der Zählung dünn besetzt.
3. **Einstieg für neue Spieler.** ✅ **Erster Durchgang 2026-11-12** (frische Karriere im Hochformat durchgeklickt und jede
   Seite vermessen): Überschrift der Gründungsversammlung war abgeschnitten (behoben); die Kasse war in Woche 1 5,4 Bildschirme
   lang – Ausrüster-Angebote jetzt eingeklappt; unter „Du" waren 17 von 35 Knöpfen gesperrt – der Privat-Block zeigt je Bereich
   nur noch die nächste Stufe. Reiter zusammengelegt ✅ (2026-11-15: je vier, Clubhouse.js MERGED). Startseite (Anpfiff auf dem ersten Bildschirm) und Trikot-Editor (81 statt 136 Knöpfe) ✅ (2026-11-15). Offen:
   ein zweiter Durchgang im Querformat und mit einem echten Neuling.
4. **Spielstände absichern.** ✅ **2026-11-12** (career.js saveCareer/restoreBackup, tests/savebackup.test.js): je Speicherplatz
   eine Sicherung vom Ende der letzten Saison, unter „Spielstände" mit „Dorthin zurück". Export und Import als Datei gab es schon.
   Eine Sicherung je Platz, weil der Browser-Speicher knapp ist (ein Stand hat 100–230 KB, gemessen).
5. **Schwierigkeitsgrad.** ✅ **2026-11-12** (career/difficulty.js, tests/difficulty.test.js): entspannt, normal, hart – Wahl
   beim Anlegen des Trainers, umstellbar unter Verein → Du. Wirkt auf den Druck des Vorstands (×0,7 / 1 / 1,3), das
   Sponsorengeld (×1,15 / 1 / 0,85) und die Familie (siehe Punkt 1). Alles Spielwerte; alte Spielstände laufen auf „normal".

**B – Ausbau des Bestehenden** (Nutzerwunsch 2026-11-11)
6. **3D-Spiel verbessern: Ecken und Einwürfe.** ✅ **Erste Lieferung 2026-11-12**, jeweils gemessen:
   - **Elfmeter nach Ecken:** Beim Kopfballduell im Strafraum wurde viel zu oft gepfiffen (fouls.js FOUL.headerBox). Elfmeter je
     Spiel 0,54 / 0,70 / 0,34 → 0,36 / 0,28 / 0,23 (7er / 9er / Großfeld, 100 Spiele; echt: Bundesliga 0,30 in 2018/19 und 0,19 in
     2024/25); Elfmeter nach 7 / 13 / 4 % der Ecken → rund 3 %; Tore nach Ecken 10,4 / 12,0 / 10,3 % → 8,5 / 6,6 / 8,3 %.
     Folge: rund 0,2 Tore je Spiel weniger (300 Spiele: Großfeld 1,74 → 1,57, 9er 2,30 → 2,07).
   - **Einwürfe:** Zwei Mitspieler bieten sich an (kurz und die Linie entlang), der Werfer wartet bis zu 2,6 s auf sie
     (ai.js throwInOffers, `scripts/throwin-check.mjs`, tests/throwin_offer.test.js). Zuerst am Ball ist ein Mitspieler in
     81 / 85 / 92 % der Einwürfe (vorher 75 / 50 / 38 %); ohne freien Mitspieler in Wurfweite 2 / 4 / 1 % (vorher 55 / 77 / 88 %).
   - **Verworfen (gemessen, ohne klare Wirkung):** mehr Verteidiger in Raumdeckung bei Ecken; stärker streuende Schüsse im Gedränge.
   - Offen: Tore nach Ecken (binnen 8 s) liegen bei 7,6–11,1 % (240 Spiele je Platz, 2026-11-15; Profis rund 3 %, Opta über The
     Analyst; Ziel vom Nutzer rund 5 %). Geprüft und verworfen (2026-11-15, je 240 Spiele): Raumdeckung mit 1–2 Verteidigern mehr,
     schwächere Kopfbälle im Duell (Faktor 0,6 → 0,4), Beinblock für flache Schüsse (geblockt 1–6 % → 11–15 %, Ecken kaum
     weniger, Tore insgesamt deutlich weniger). Nach Ecken gibt es seltener einen Abschluss als bei Profis (rund 22 % statt 39 %),
     der trifft aber aus 7–10 m viel öfter; kurze Ecken führen in 8–16 % zu einem Tor. Mit dem Nutzer vertagt; Angreifer laufen ein ✅ (2026-11-13,
     ai.js CORNER_RUN, tests/corner_runin.test.js); Ballbesitz nach dem Einwurf ✅ geprüft (2026-11-14): Die Messung zählte jede Unterbrechung als Verlust, auch Fouls am
     eigenen Spieler; richtig gezählt 42–52 % nach 5 s (Premier League 2018/19: 54 %, Stone, Smith & Barry 2021) – für Amateure
     plausibel, keine Änderung; weiter Einwurf in den
     Strafraum ✅ (2026-11-14, ai.js LONG_THROW, tests/longthrow.test.js); Freistoß-Varianten und Abstand je Platz ✅ (2026-11-14,
     setpieces.js FK_DISTANCE, ai.js FREE_KICK, tests/freekick_rules.test.js).
7. **Animationen.** ✅ **2026-11-13:** Die Torwart-Animationen aus 11.1 gab es schon alle (render/player/keeper.js: Hechtsprung mit
   Abrollen, Fangen in drei Höhen, Fausten, Abwurf, Abschlag, Breitmachen, Fehlgriff). Neu: Arm hoch vor der Ecke, Winken beim
   Einwurf (render/reactions.js setPieceGestures, tests/setpiece_gestures.test.js). Ursprünglicher Punkt: offene Punkte aus 11.1 (Torwart: Hechtsprung mit Abrollen, Fangen, Fausten) und neue für Ecken und Einwürfe.
8. **Ereignisse in allen Bereichen:** neue Ereignisse für jede Liga und jeden Bereich (Kabine, Vorstand, Jugend, Zweite, Frauen,
   Alte Herren, Sponsoren, Fans, Presse, Privat, Nationalteam). Nach der Zählung aus Punkt 2, damit Lücken zuerst gefüllt werden.
   🔶 **Teil 1, 2026-11-14** (career/teamevents.js, tests/teamevents.test.js): Zählung nach Bedingung – Zweite 0, Frauen 2 (nur
   Gründung). Neu je drei für Zweite und Frauen. 🔶 **Teil 2, 2026-11-14:** Zählung nach Bedingung und Text: Nationalteam 0,
   Fans 7 (meist ab Regionalliga) – je drei neu. Kabine 19, Vorstand 11, Presse 14, Sponsoren 18, Jugend 22 (vorerst genug).
9. **Neue Textbausteine für alle interaktiven Bereiche.** 🔶 **Teil 1, 2026-11-13:** Seitenlinie im Liveticker (sim/touchline.js
   vary) und Kneipe (career/pub.js say), ohne den Spielzufall. Teil 2: Stadionsprecher, Kreisblatt-
   Schlagzeilen, Zurufe. Bank ist schon lagebezogen formuliert. ✅ Chat (2026-11-14): die kürzesten Listen (zwei bis vier Fassungen) auf vier bis acht.
   Ursprünglicher Punkt: Chat, Kneipe, Zurufe, Bank, Liveticker, Kreisblatt, Stadionsprecher,
   Halbzeit, Verhandlungen – mehr Vorlagen, damit sich nichts schnell wiederholt. Deutsch und Englisch.

**C – Neue Ideen**
10. **Karriereende und Vermächtnis.** ✅ **2026-11-13:** Abschied, Nachfolger und Ehrenpräsident gab es schon (legacy.js); neu ist
    der Rückblick der Ära (Aufstiege, Abstiege, beste Platzierung; tests/farewell.test.js). Ursprünglicher Punkt: Der Trainer altert; Abschied mit Rückblick und Ehrentafel, Weiterspielen mit einem Nachfolger
    im selben Verein.
11. **Pressekonferenz ab der Regionalliga.** ✅ **Erste Lieferung 2026-11-13** (career/presse.js, tests/presse.test.js): Spitzenspiel
    mit Ansage und Nachfrage eine Woche später, Siegesserie, Personalfrage. ✅ **2026-11-15:** Abstiegskampf, Pokal, Auftreten je Trainertypus;
    Wirkung auf die Fans (Förderverein). Ursprünglicher Punkt: zwei bis drei Fragen vor oder nach wichtigen Spielen; Antworten wirken auf Kabine,
    Vorstand und Fans (passt zu Auftreten und Trainertyp aus Punkt 17).
12. **Rivalität zwischen Trainern.** ✅ **Erste Lieferung 2026-11-13** (career/coachrival.js, tests/coachrival.test.js): ein
    Trainer mit Namen und Bilanz, folgt in eine neue Liga, Stichelei vor und Handschlag nach dem Duell. Gesicht ✅ (2026-11-15, rivalLook). Hitze im Spiel,
    Abwerben, Lehrgang ✅ (2026-11-15). Ursprünglicher Punkt: ein gegnerischer Trainer, der über mehrere Saisons wiederkehrt, mit Vorgeschichte.
13. **Spieltag als Erlebnis im Amateurbereich.** ✅ **Erste Lieferung 2026-11-13** (render/props.js makeMatchdayStaff): Platzwart
    mit Kreidewagen und Vereins-Linienrichter als stehende Figuren; die Bratwurstbude gab es schon. Flutlichtausfall als Ereignis am Schwarzen Brett
    (2026-11-13). Bewegte Figuren ✅ (2026-11-15, MatchView staffFrame). Flutlicht-Ausfall sichtbar ✅ (2026-11-15, MatchView mastShade). Ursprünglicher Punkt: Platzwart, Bratwurststand, Linienrichter aus dem eigenen Verein, ausgefallenes
    Flutlicht – kleine sichtbare Dinge am Platz.
14. **Legenden des Vereins.** ✅ **Erste Lieferung 2026-11-13** (career/legends.js, tests/legends.test.js): Abschied mit drei
    Ehrungen, Tafel im Museum, Besuch beim Training. Feste Rückennummern ab der Kreisklasse C mit Sperre für Legenden (career/numbers.js,
    tests/numbers.test.js; Ablauf nach 10 Saisons, Freigabe von Hand ab 3). Rückkehr in den Vorstand und Nummern der Gegner ✅ (2026-11-15). Ursprünglicher Punkt: Abschiedsspiel, Trikotnummer wird nicht mehr vergeben, Rückkehr als Co-Trainer oder im Vorstand;
    verbindet Ehemalige (alumni) und Museum.
    (Nicht aufgenommen nach Nutzerentscheid: Saisonziele zum Selbstwählen.)

**E – Seitenlinie und Spielbetrieb** (vom Nutzer gewünscht, 2026-11-15)
16. **Trainer an der Seitenlinie mit Gesten.** ✅ **2026-11-15** (render/coaches.js, sim/coachclash.js, tests/coaches.test.js; Rasen- und Ascheplatz). In jedem Karrierespiel stehen beide Trainer in ihrer Coaching-Zone: reinrufen,
    Laufwege zeigen, Jubel und Ärger. Je heißer die Rivalität (coachrival.js), desto wilder; ab einer gewissen Hitze Nase an Nase,
    der Schiri trennt und kann Gelb zeigen (IFAB Regel 12: Karten auch für Teamoffizielle), im schlimmsten Fall Tribüne.
    Grafik-Budget Ascheplatz dafür auf 80 Draw Calls angehoben (Nutzerentscheid 2026-11-15).
17. **Betreuerstab an der Bank.** Co-Trainer, Masseur, Teamarzt, Zeugwart usw. als eigene Anstellungen; wer angestellt ist, sitzt
    im Spiel sichtbar auf oder an der Trainerbank (Trainerteam aus 11.17 Punkt 5 und Ehrenämter aus staff.js einbeziehen).
18. **Profibereich am Spielfeldrand.** Vierter Offizieller mit Auswechseltafel (Rückennummern raus/rein) und Anzeige der
    Nachspielzeit. Dafür die Nachspielzeit in die Simulation einbauen (Unterbrechungen, Wechsel, Tore zählen; Regel 7).

**F – Gameplay 2.0** (vom Nutzer festgelegt, 2026-11-16). Kein Neubau, sondern Schicht für Schicht: jede Schicht neu, per Schalter
umschaltbar, mit 240 Spielen je Spielform gegen die alte gemessen (scripts/match-audit.mjs und eigene Messskripte); was nicht besser
ist, fliegt raus. Rückmeldung des Nutzers, was beim Zuschauen stört: dumme Pässe, zu viel Gewühl, Abpraller werden nicht
antizipiert, Richtungswechsel sehen aus wie auf Glatteis, kein Freilaufen, sehr viele Einzelaktionen.
19. **Entscheidungen der KI** (gegen dumme Pässe und zu viele Einzelaktionen): Statt vieler Einzelregeln bewertet der Ballführer jede
    Möglichkeit – Pass, Schuss, Dribbling, Flanke, Halten – nach Erfolgschance, Raumgewinn und Risiko (Passweg frei? Gegner im
    Laufweg? Mitspieler in besserer Lage?). Dribbling nur, wenn es sich lohnt.
20. **Freilaufen und Raumverhalten** (gegen fehlendes Freilaufen und Gewühl): Mitspieler bieten sich in freien Räumen und Passwegen
    an, halten Abstände und Breite, Linien verschieben gemeinsam; im Strafraum nicht alle zum Ball, sondern Räume besetzen.
21. **Abpraller und zweite Bälle antizipieren**: Spieler sagen voraus, wohin ein Abpraller, eine Kopfballabwehr oder ein geblockter
    Schuss fliegt, und laufen dorthin statt zum Ball; Absicherung am Strafraumrand.
22. **Bewegung der Spieler** (gegen „Glatteis“): Beschleunigen, Abbremsen und Richtungswechsel mit Körperträgheit (Abbremsschritt,
    Drehen über den Stand), mit Ball langsamer und ungenauer; Animation passend dazu.
23. **Ballphysik**: Luftwiderstand und Effet (Bananenflanke, angeschnittener Freistoß, flatternder Fernschuss), realistischer Absprung.
    Reihenfolge: 19 → 20 → 21 → 22 → 23 (die ersten beiden wirken am stärksten auf das, was stört). Danach Ecken und Kopfbälle neu messen.

**G – Gameplay 2.0, zweite Stufe** (vom Nutzer ausgewählt, 2026-11-19; Reihenfolge und Gewicht von Claude). Gleiche Regeln wie F:
Schicht für Schicht, per Schalter, gegen den alten Stand gemessen. Gewicht: (S) klein, (M) mittel, (L) groß.
24. **Absprung und Untergrund** (S): ✅ **2026-11-20** (sim/ground.js, tests/ground.test.js, Schalter TURF). Ascheplatz springt unberechenbar, tiefer Rasen bremst Flachpässe, Pfützen bei Regen stoppen
    den Ball; Absprunghöhen nach Quelle (FIFA-Rasenprüfung: Rücksprung 0,6–0,85 m aus 2 m). Rest aus Punkt 23.
25. **Mannschaftsteile, die zusammenhängen** (L): ✅ **2026-11-21** Abwehrkette auf einer Linie mit Abseits (ai.js LINES, tests/lines.test.js; Großfeld: Abstand vorderster–hinterster Verteidiger 6,0 → 4,7 m, Abseits 4,6 → 5,0 je Spiel, Bundesliga rund 4–5). Pressing-Auslöser gebaut und gemessen – ohne Wirkung (Ballgewinne in der gegnerischen Hälfte gleich), wieder entfernt. Viererkette verschiebt gemeinsam und stellt Abseits, Pressing-Auslöser
    (Rückpass, schlechte Annahme, Ball an der Seitenlinie). Wer schlecht zusammenspielt, reißt sichtbar Lücken.
26. **Zweikämpfe mit Körper** (L): ⚠️ **2026-11-21** Schulter an Schulter gebaut und gemessen – nicht besser, wieder entfernt:
    Ballführer behielten den Ball 4–5 Punkte seltener (rasenplatz, 100 Spiele), Ecken 3,23 → 3,00 und Fausten 1,41 → 1,22 je Spiel;
    nur ums Leder beschränkt verschwand der Kraftunterschied ganz (65,7 / 65,1 / 65,3 %). Abschirmen und Grätsche zählen Kraft schon
    (strength.js). Ursprünglich: Schulter an Schulter, Ball abschirmen, Grätsche mit echtem Risiko; Kraft und Größe zählen.
27. **Weitere Animationen der Spieler** (M): ✅ **2026-11-21** neu Ballannahme mit Brust und Oberschenkel, Mauer springt und dreht
    sich weg, Schuh binden bei Freistoß/Abstoß (tests/duels27.test.js); die übrigen gab es schon. Ursprünglich, zusammen mit 26: Schulterduell, Grätsche mit Rutschen, Kopfballduell mit Sprung,
    Ballannahme mit Brust und Oberschenkel, Seit- und Fallrückzieher, Stolpern, am Boden liegen und Behandlung, Reklamieren,
    Abklatschen beim Wechsel, Schuh binden, Trinken an der Linie, Mauer springt hoch und dreht sich weg.
28. **Spielfluss und Endphase** (M): ⚠️ **2026-11-21** teils gebaut. Torwart geht in der letzten Minute bei einer Ecke mit nach vorn
    (nur bei einem Tor Rückstand, läuft danach zurück; sim/plan.js LATE, tests/late.test.js – auf Wunsch als seltener Show-Moment
    behalten). Gemessen und verworfen (je 60 Spiele Rasenplatz, 30 Großfeld): offener ab der 75. Minute bei engem Spielstand
    (Nutzerwunsch) und Aufrücken der zurückliegenden Mannschaft – Ausgleich nach einem Tor Rückstand 7/25 → 3/25 bzw. 2/16 → 0/16;
    ohne Aufrücken ebenfalls 3/25 und 0/16. Offen: Tore ab der 75. Minute sind bei uns 11–12 %, in der Premier League 22–26 %.
    Ursprünglich: ab der 75. Minute größere Abstände und mehr Hin und Her; wer hinten liegt, wirft Leute nach
    vorne; in der Schlussminute geht der Torwart bei der letzten Ecke mit.
29. **Spielerpersönlichkeit auf dem Platz** (L): ✅ **2026-11-21** (sim/habits.js, tests/habits.test.js): starker Fuß fest je Spieler
    (21 % Linksfüße, Carey u. a. 2001), die Figur schießt mit ihm; „zieht nach innen“ – Außen auf der Seite des schwachen Fußes dribbelt
    im letzten Drittel meist zur Mitte (je Anlauf 60 %; Rasenplatz 50 → 80 %, Großfeld 43 → 68–95 %; immer nach innen nahm die Flanken:
    Kopfballtore Großfeld 2,7 % statt 5–8 %). Tore 3,51 → 3,15 (Rasenplatz) bzw. 1,90 → 1,94 (Großfeld), 120/60 Spiele;
    „reklamiert jeden Pfiff“ ist der Meckerer. Spielerkarte: Block „Spielweise“ (Fuß, Profil, Gewohnheiten), auch im Wechselmenü.
    „Sucht den Abschluss“ gebaut und verworfen (kaum zu erkennen: +10 % / −6 % Schüsse). Ursprünglich: zwei, drei Gewohnheiten je Spieler (zieht nach innen, nur rechter Fuß, sucht den
    Abschluss, reklamiert jeden Pfiff). Man erkennt die eigenen Leute am Spiel.
30. **Taktische Muster des Gegners** (M): ✅ **2026-11-23** (career/patterns.js, tests/patterns.test.js): Handschrift je Trainertyp
    (Großmaul: hohes Pressing; Alte Schule: lange Bälle oder Mauern; Stratege: Konter oder Pressing; Kumpeltyp: keine), wirkt als
    Befehl im Spiel. Scouting zeigt sie mit Satz des Co-Trainers und Knopf „Gegenmittel übernehmen“ – nur wo gemessen (je 120 Spiele,
    Torverhältnis ohne → mit): Pressing −0,08 → +0,24 (lang spielen), lange Bälle −0,28 → +0,04 (tief stehen), Konter −0,17 → +0,05
    (ruhiges Tempo); gegen Mauern half nichts. Karriere: 1,10 Punkte je Spiel mit und ohne Handschrift (60 Spiele). Ursprünglich: Gegnertrainer haben eine Handschrift (lange Bälle auf den Großen, hohes Pressing, Mauern);
    das Scouting vor dem Spiel zeigt sie, man kann darauf reagieren.
31. **Fehler, die menschlich wirken** (S): ✅ **2026-11-25** (sim/nerves.js HUMAN, tests/nerves.test.js; Spielwerte): Ball springt
    auf Asche und Wiese über den Fuß (Asche 1,6 je Spiel); vergebene Großchance (je nach Platz bis 9 m) – Schütze eine Weile
    verunsichert (mehr Streuung); Tor aus 18 m und mehr – Torwart wackelt (öfter geschlagen); Kommentar zu allem. Gemessen je 120
    Spiele: Rasen 3,24 → 3,37, Asche 3,93 → 3,68, Parkplatz 2,51 → 2,53 Tore. Auf Rasen kostete „über den Fuß“ 9 % der Tore – dort
    abgeschaltet. Ursprünglich: Ball springt über den Fuß, Stürmer nach vergebener Großchance verunsichert, Torwart patzt
    nach einem Fehler eher noch einmal.

**H – Kurzweil im 3D-Spiel und im Textmodus** (vom Nutzer ausgewählt, 2026-11-19)
32. **Schlüsselszenen-Modus** (M): ✅ **2026-11-20** (sim/keyscene.js, tests/keyscene.test.js; vierte Stufe der Taste C, nur an der Seitenlinie; Großfeld rund 36 % kürzer, Sport-/Rasenplatz 15–19 %, kleine Plätze kaum – dort spielt fast alles vor dem Tor). Zeitraffer zwischen den spannenden Momenten, bei Chancen, Standards und Kontern normales Tempo
    zum Eingreifen. Ein Spiel in 4–5 Minuten, ohne dass etwas Wichtiges fehlt.
33. **Momente mit Stimmung** (S): ✅ **2026-11-21** (render/mood.js, tests/mood.test.js; nur Ton und Bild, Spiel unverändert):
    knappes Spiel (höchstens ein Tor Abstand) in den letzten 15 % lauter bis zum Abpfiff; vor dem Elfmeter (auch im Elfmeterschießen)
    still und die Kamera nah an Schütze, Ball und Torwart; Raunen bei knapp vorbei (bis 1,5 m neben dem Pfosten oder 1 m über die
    Latte, auch auf Plätzen mit Wänden) – gemessen 0,8 (Großfeld) bis 4,2 (Rasenplatz) je Spiel. Ursprünglich: Zuschauer in den letzten Minuten lauter, Stille beim Elfmeter, Raunen und Jubel, die Kamera geht
    auf den Schützen.
34. **Kleine Geschichten im Spiel** (S): ✅ **2026-11-21** (career/storylines.js, tests/storylines.test.js; nur Text, Spiel unverändert):
    vor dem Anpfiff bis zu drei Anlässe – Debüt, rundes Spiel/Tor für den Verein, Torflaute (ab 3 Spielen), Torserie (ab 2), Ex-Verein,
    Wiedersehen mit einem Ehemaligen, Angstgegner, Sieges- und Sieglos-Serie, Hinspiel/Revanche. Laufschrift beim Anpfiff, Zeilen im
    Liveticker, der Kommentar greift sie beim Tor auf („Endlich! Nach 4 Spielen ohne Tor.“). Gemessen: 38 von 44 eigenen Spielen mit
    Anlass (2 Karrieren, je 2 Saisons). Ursprünglich: Laufschrift mit Anlässen („erstes Spiel gegen den alten Verein“, „seit drei Spielen ohne
    Tor“), die der Erzähler aufgreift.
35. **Wechsel als Gespräch** (M): ✅ **2026-11-20** (sim/subtalk.js, tests/subtalk.test.js; Co-Trainer-Karte „X raus, Y rein“ mit Grund und Regeln; im Liveticker Wechselfrage mit Rat und Knopf „Wechseln“ zum Selbstwechseln, Nutzerwunsch). Der Co-Trainer schlägt vor („X ist platt, Y brennt, Gegner stellt um“), ein Tipp zum Annehmen;
    Regelverstöße werden vorher erklärt. Schließt den kleinen Punkt „Wechsel auf dem Platz statt in Listen“ (Abschnitt 2) ein.
36. **Entscheidungsmomente im Textmodus** (M): ✅ **2026-11-22** (sim/touchline.js, tests/decisions36.test.js): Elfmeter – wer
    schießt (drei Kandidaten mit Schusswert, nervös/eiskalt/Kapitän); Freistoß vor dem Tor – selbst entscheiden, direkt, Flanke oder
    kurz; Gelb – weiter, vorsichtig (keine Grätsche, kaum noch Ziehen und Schubsen: Fouls 1,7 → 0,3 je Spiel, Karten gleich) oder
    runter. Die erste Antwort ändert nichts (Überspringen). Ursprünglich: Der Ticker hält kurz an: Wer schießt den Elfmeter? Freistoß direkt oder flanken?
    Gelb-Rot droht, runter nehmen?
37. **Halbzeitansprache mit Wirkung** (S): ✅ **2026-11-22** (sim/halftalk.js, tests/halftalk.test.js; Spielwerte): ruhig reden, laut
    werden oder einen der zwei Besten loben – in der 3D-Halbzeittafel und im Liveticker (nach der Ausrichtung). Nervöse +5 % bei Ruhe,
    −5 % bei Gebrüll; Kämpfer +5 % laut, aber ruhig bei Rückstand −2 %; Gelobter +5 % (Nervöse +7 %). Die Reaktion steht in der
    Tafel, im Ticker und zum Wiederanpfiff. Auf das Ergebnis über 80 Spiele nicht messbar (kleine Wirkung, gewollt). Ursprünglich: ruhig, laut, einzeln loben; Spieler reagieren je nach Persönlichkeit, sichtbar in der
    zweiten Halbzeit.
38. **Liveticker mit Bild** (M): ✅ **2026-11-25** (sim/chances.js, ui/tickerPicture.js, tests/xg38.test.js): Über dem Ticker eine
    Draufsicht jeder gefährlichen Szene (ab 0,15 xG oder Tor; Spieler als Punkte, Vorlage gestrichelt, Schuss als Pfeil, zum
    Blättern) und eine Druck-Leiste über das Spiel (18 Abschnitte: Anteil der Zeit mit Ball im letzten Drittel; Abschlüsse als
    Kreise nach xG, Tore gefüllt); xG im Kopf und in der Schlussstatistik. xG hergeleitet aus 160 Simulationsspielen (3512
    Abschlüsse, 429 Tore): Öffnungswinkel, Abstand, Kopfball, Verteidiger in der Schussbahn, Torwart neben der Bahn; Elfmeter 0,66
    (1019 von 1536 im Elfmeterschießen). Auffällig dabei: Im Spiel gehen Schüsse aus 2 m kaum öfter rein als aus 14 m (11,6 % gegen
    10,3 %) – frei vor dem Tor 27 %, mit Verteidiger in der Bahn 17 %. Liest nur, das Spiel bleibt gleich. Ursprünglich: kleine
    2D-Draufsicht der gefährlichen Szenen (Punkte und Pfeile) und eine Druck-Leiste über das Spiel (Chancen, xG).

**I – Bindung an die Mannschaft und Langzeitmotivation** (vom Nutzer ausgewählt, 2026-11-19)
39. **Vereinsrekorde zum Jagen** (S): Rekordtorschütze, längste Serie, höchster Sieg, meiste Zuschauer; Meldung, sobald einer fällt.
40. **Mannschaftsfoto jede Saison** (S): Eine Wand im Vereinsheim füllt sich Jahr für Jahr; ein Tipp zeigt die Tabelle von damals.
41. **Kapitän mit Gewicht** (M): ✅ **2026-11-22** (career/captain.js, tests/captain.test.js; Spielwerte): fester Kapitän, sonst der
    mit der größten Führungsstärke (Alter, Spiele, Anführer/Ex-Profi/Ruhepol, Meckerer zieht ab); „Zum Kapitän machen“ auf der
    Spielerkarte, K im Kader. Binde am linken Oberarm (gelb, auf hellem Trikot schwarz), je Mannschaft einer auf dem Platz.
    In der Krise (3 Niederlagen oder miese Stimmung) eine Ansprache – je nach Führungsstärke wirkt sie oder verpufft; Kapitän
    zweimal auf der Bank oder Binde abgenommen: Gerede, er ist angefressen. Gemessen 60 Spiele: 6 Ansprachen, 6× Bank-Gerede.
    Die Binde geht bei der Auswechslung nicht weiter (bleibt beim Ausgewechselten). Ursprünglich: spricht in Krisen für die Mannschaft, Binde sichtbar, Kapitänswahl kann zum Thema werden.
42. **Freundschaften und Grüppchen in der Kabine** (M): ✅ **2026-11-22** (career/friends.js, tests/friends.test.js; Spielwerte):
    Grüppchen = drei oder mehr, alle miteinander eng (Kumpel, Schulfreund, Schwager, Pate). Die Aufstellung zeigt, wen sie trennt;
    nach dem Spiel ist ein Freund, der da war und nicht spielte, während sein Kumpel spielte, manchmal angefressen (gemessen etwa
    jedes vierte Spiel), ein getrenntes Grüppchen kostet etwas Stimmung. Torjubel: Kumpels umarmen den Schützen schon aus 2,6 m,
    ein Rivale jubelt nicht mit. Freunde spielen sich schon lieber an (sim/bonds.js). Ursprünglich: Freunde spielen sich lieber an (sichtbar auf dem Platz); wer Freunde trennt,
    spürt es in der Stimmung. Baut auf 29 auf.
43. **Vereinskrisen und -chancen als kleine Geschichten** (M): Sponsor springt ab, Platz muss saniert werden, Talent aus dem
    Nachbardorf will kommen; über mehrere Wochen mit verschiedenen Ausgängen.
44. **Spielerrat und Ersatzkapitän** (M, Nutzerwunsch 2026-11-22): Ein Spielerrat (drei, vier Spieler) spricht für die Mannschaft
    mit dem Trainer und kann den Kapitän wählen; ein fester Ersatzkapitän übernimmt die Binde, wenn der Kapitän fehlt oder ausgewechselt
    wird. Alternativ als einstellbare Regel: Die Binde übernimmt der Dienstälteste im Verein oder der mit den meisten Spielen.
    Baut auf 41 auf.
45. **Trainer-Editor zum Start** (M, Nutzerwunsch 2026-11-23): Statt nur Haut-, Haarfarbe und Bart ein kleiner Editor für das
    eigene Alter Ego: Frisuren, Bart, Haarfarbe, Größe, Gewicht und mehr, mit Vorschau der Figur. Für den Spielertrainer verschiedene
    Spielertypen (z. B. Knipser, Arbeiter, Techniker, Abwehrchef), die die Fähigkeitspunkte verteilen – oder selbst verteilen.
46. **Fußballschuhe** (S, Nutzerwunsch 2026-11-23): verschiedene Schuhmodelle und Farben für die Spieler – angelehnt an aktuelle
    und klassische Formen (schlichter schwarzer Klassiker, knallige Neonfarben, hoher Schaft, Retro mit weißen Streifen), ohne
    echte Marken, Namen oder Logos.

47. **Moderne Statistiken** (L, Nutzerwunsch 2026-11-25): Kennzahlen aus der Profi-Analyse, im Spiel gemessen (sim liest nur mit,
    wie chances.js), mit kurzer Erklärung beim Antippen. Quellen: Packing (de.wikipedia „Packing (Fußball)“; Impect, gegründet von
    Stefan Reinartz und Jens Hegeler), xGOT, xT, PPDA, progressive Pässe, Field Tilt (Sky Sports „advanced stats explained“, FBref-
    Definition progressiver Pässe, Hudl zu xT). Einen eigenen Statistik-Beitrag von Christoph Kramer habe ich nicht gefunden – er
    ist als TV-Experte bekannt; Packing stammt von Impect.
    - **Spiel:** xG (Punkt 38) plus xGOT für Torhüter (Schuss aufs Tor: wohin er kam); Packing je Pass/Dribbling = überspielte
      Gegenspieler, „Impect“ = überspielte Verteidiger (die letzten sechs inkl. Torwart); Field Tilt (Anteil Ballkontakte im
      letzten Drittel); PPDA (gegnerische Pässe je eigener Abwehraktion in deren Hälfte). Im Ticker-Ende und im Spielbericht.
    - **Spieler:** je Spiel und Saison Packing, Impect, progressive Pässe (≥ 10 m näher ans Tor bzw. in den Strafraum), xG und
      xA (xG der Schüsse nach seinem Pass), Tore minus xG („trifft über/unter Erwartung“), gewonnene Zweikämpfe, Ballgewinne im
      letzten Drittel. Auf der Spielerkarte als kleine Balken gegen den Mannschaftsschnitt; fließt in die Noten (gradePlayers)
      und in Scouting/Transfers („überspielt viele Gegner“ als Merkmal statt nur Tore).
    - **Verein/Saison:** xG-Tabelle (Punkte nach xG gegen echte Punkte: Glück oder Pech), xG für/gegen, PPDA und Field Tilt im
      Schnitt, Packing der Mannschaft; im Saisonrückblick und in der Tabelle als umschaltbare Spalte.
    - **Taktik:** Wirkung der Anweisungen sichtbar machen: Pressing → PPDA sinkt, „direkt“ → mehr Packing pro Pass, Flügelspiel →
      Field Tilt außen; Gegner-Scouting (Punkt 30) zeigt dessen Werte („presst hoch: PPDA 6“). Der Co-Trainer erklärt in der
      Halbzeit einen auffälligen Wert („Wir überspielen kaum jemanden – mehr in die Tiefe“).
    - **Maßstab:** Alle Werte aus dem eigenen Spiel hergeleitet (wie xG in Punkt 38), Vergleichswerte aus vielen Simulations-
      spielen je Platz und Liga; keine echten Spieler- oder Vereinsdaten. Erst Spielbericht, dann Spieler, dann Saison.

**J – ADVANCED FOOTBALL SYSTEM** (Nutzerauftrag 00, 2026-11-25; hat Vorrang vor Punkt 47 und allen Analytics-Ideen). Bericht:
`docs/ADVANCED-FOOTBALL-SYSTEM-00-ENGINE-AUDIT.md`. Umsetzung erst nach Freigabe des Nutzers.
- **Phase 0 – Match Engine Audit & Data Reality Check:** ✅ **2026-11-25** (nur Analyse). Ergebnis: Engine zeitschrittbasiert
  (1/60 s), echte 3D-Ballphysik und Positionen aller Spieler; Spielprotokoll mit Ballbesitzphasen, Pässen, Ballverlusten, Schüssen
  vorhanden (`sim/matchlog.js`); Druck nur über den nächsten Gegner; nur 4 Grundrollen; Detaildaten nur für Spiele der eigenen
  Liga, Turniere, Relegation (sonst Poisson). Matrix: Territorium A, Angriffskontinuität A, Zweite Bälle B/C, Pressingresistenz
  B/C, Team-Index B, Taktik-Eignung B/C, Positionsflexibilität C, Raumschaffung C.
- **Phase 1 – Datenmodell und Ereigniserfassung** (Herkunft MEASURED/DERIVED/MODELED/ESTIMATED/UNAVAILABLE, Mitschrift ergänzen,
  verdichtete Saisonwerte).
- **Phase 3 – Validierung** (vorgezogen vor Phase 2): jede Kennzahl auf Stabilität, Taktikreaktion und Mindeststichprobe prüfen.
- **Phase 4 – Advanced Football Analytics** (Szenario 1: nur geprüfte Kennzahlen).
- **Phase 2 – gezielte Engine-Erweiterungen** (Szenario 2, je als Schicht mit Schalter): Druckmodell mit mehreren Gegnern →
  Zweite-Ball-Staffelung → Feinrollen Außen/Zentrum → Raumkontrolle als Stichprobe.
- **Phase 5 – Advanced Football Intelligence**, **Phase 6 – KI-Trainer, Scouting, Transfers**, **Phase 7 – Spielerentwicklung
  und Beratung**, **Phase 8 – Liga- und Saisonanalyse**.
- Empfehlung: Szenario 1 sofort, Szenario 2 schrittweise, Szenario 3 (volle räumliche Engine) nicht. Offene Entscheidungen:
  Bericht Abschnitt 10.

- **Ergänzung 02 – Advanced Football Intelligence** (Nutzerauftrag 2026-11-25, nur Konzept): `docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md`.
  Bestand: Lageerkennung (`sim/situations.js`, 12 Lagen), KI-Trainer im Spiel (`sim/aicoach.js`, 4 Trainertypen), Co-Trainer-Karten
  mit Wirkungskontrolle (`sim/coachfeed.js`) sind die Live-Ebene; es fehlen Profile über viele Spiele und Entscheider außerhalb
  des Spiels. Gemeinsame Phasen (Nummern aus Ergänzung 02 bleiben): 0 ✅ · 1 Datenmodell · 3 Validierung · 4 Analytics ·
  2 Engine-Erweiterungen · **5 Profile** · **6 Philosophien** · 7 AFI-Kern · 8 KI-Trainer · 9 Smart Scouting & Tactical Fit ·
  10 Transfer-KI · 11 Spielerentwicklung · 12 Manager-Beratung · 13 Liga Intelligence. Empfohlene Reihenfolge:
  1 → 3 → 4 → 5 → 7 → 12 → 6 → 8 → 9 → 10 → 2 (je Schicht) → 11 → 13. Offene Entscheidungen: Bericht 00 Abschnitt 10, Ergänzung 02
  Abschnitt 10 (E1–E8).
- **Entscheidungen 2026-11-25** (Ergänzung 02, Abschnitt 11): Reihenfolge ja; Profile auch außerhalb der eigenen Liga –
  Nachbarligen mit festen Kadern und Messspielen, übrige Ligen geschätzt (MODELED); CPU-Wechselzahl bleibt, Auswahl klüger; fünfter
  Trainertyp „Ballbesitz“; CPU-Scouting nach denselben Kenntnisregeln; neue Fähigkeitswerte (Antizipation, Übersicht,
  Stellungsspiel) einführen; „leicht“ dämpft die KI; Beratung: höchstens ein Wochenhinweis ab 5 Spielen, gleicher Hinweis frühestens
  nach 4 Wochen, Gegnerhinweis nur bei klarem Profil, Nachfassen nach 3 Spielen, Startseite statt Popup, Einstellung an/selten/aus.
  Neue Phasen 5b (Nachbarligen-Kader, Messspiele) und 6b (neue Fähigkeitswerte). Reihenfolge: 1 → 3 → 4 → 5 → 7 → 12 → 6 → 6b → 8 →
  5b → 9 → 10 → 2 (je Schicht) → 11 → 13. Offen vor Phase 1: Bericht 00 Abschnitt 10 (Speicher- und Rechenzeitbudget, Punkt 38).
- **Budget bestätigt (2026-11-25):** Kennzahlen im Spielstand höchstens 20 KB nach 5 Saisons; Mitschrift höchstens +10 % Rechenzeit je
  Spiel. Punkt 38 (xG im Ticker) bleibt und gehört zu Phase 4.
- **Phase 1, Schritt 1+2 ✅ 2026-11-25** – Spieldaten (`sim/analytics.js`, Schalter `AN.on`) und Saisonsummen
  (`career/seasonstats.js`). Je Spieler und Verein: Pässe, angekommen, unter Druck (Druckmodell der Engine), überspielte Gegner
  (Packing) und Mannschaftsteile, Zweikämpfe am Boden mit Gewinner und Verlierer, Kopfballduelle, zweite Bälle, Abschlüsse, xG, xA;
  je Verein Ballbesitz je Drittel (Field Tilt). Jede Kennzahl trägt ihre Herkunft (`FIELDS[].src`). Liest nur: Golden unverändert,
  gleicher Seed mit und ohne Mitschrift gleiches Spiel; Summen stimmen mit Spielprotokoll und Ticker überein. Gemessen: Mitschrift
  +0,6 % (Großfeld) bis +1,7 % (Hinterhof) Rechenzeit je Spiel (je 4 Spiele, Seeds 500–503); Spielstand nach 5 Saisons (8 Vereine,
  Seed 11) höchstens 5,6 KB zusätzlich, davon 2,3 KB dauerhaft (Chronik der Kaderspieler, 5 Saisons Vereinsbilanz). Nur
  Ligaspiele mit voller Simulation zählen; Pokal, Turniere, Relegation noch nicht. Schwellen (Zweikampf 1,0 m wie `tackles.js`,
  Kopfballduell 1,5 m, zweiter Ball 3 s) sind Spielwerte. Nächster Schritt: Phase 3 (Validierung).
- **Phase 3 – Validierung ✅ 2026-11-26** (`docs/ADVANCED-FOOTBALL-SYSTEM-03-VALIDATION.md`, `scripts/afs-validate.mjs`; 1600 Spiele,
  Rasenplatz und Großfeld, feste Paarungen). Frei für Phase 4: Pässe, Passquote (Mannschaft), Packing (Mannschaft, als Stufe),
  Zweikämpfe als Zählung, xG (Mannschaft als Stufe, Spieler ab einer Saison), xA (Saisonsumme), Field Tilt (als Stufe). Nicht
  frei: Druck-Kennzahlen (keine Reaktion auf Pressing, doppeln die Passquote), Zweikampfquote (hängt kaum an Tackling/Technik),
  Kopfballduelle (zu selten), Mannschaftsteile (doppeln Packing), zweite Bälle (keine Taktikreaktion, wartet auf D1). xG je
  Platz geeicht (`chances.js XG.pitch`: Hinterhof −0,37, Park −0,36, Großfeld +0,30; Gegenprobe auf neuen Seeds: alle acht Plätze
  im Intervall). Engine-Befunde für Phase 2: Pressing stört den Gegner kaum, `build:kurz` erhöht die
  Passzahl nicht, Mauern erzeugt so viel xG wie Offensiv.
- **Phase 4 – Anzeige ✅ 2026-11-26** (`ui/analyticsView.js`). Nur freigegebene Kennzahlen. Spielbericht: Pässe (angekommen,
  Quote), überspielte Gegner, xG, Feldvorteil – beschreibend, mit Erklärzeile. Spielerkarte: Saison-Pässe, Zweikämpfe, Abschlüsse,
  xG, xG-Spalte in der Chronik; „trifft wie erwartet / öfter / seltener“ erst ab 14 Einsätzen (Band 1,96·√xG, hergeleitet).
  Tabellenzeile des Vereins: xG für : gegen je Spiel, Passquote ab 8 Spielen, ab 3 Spielen Stufen (deutlich mehr / im Schnitt /
  deutlich weniger, z ≥ 1,96 mit den Streuungen je Spiel aus Phase 3) für Packing je Pass und xG gegen den Liga-Schnitt,
  Feldvorteil gegen die eigenen Gegner (Saisonsumme `attA`). Geprüft im Browser bei 360×780, 320×568 und quer: kein
  waagerechtes Scrollen, keine Fehler. Golden unverändert.
- **Phase 5 – Profile ✅ 2026-11-26** (`intel/profiles.js`, `docs/ADVANCED-FOOTBALL-SYSTEM-05-PROFILES.md`,
  `scripts/afs-profiles.mjs`). Spieler der eigenen Liga: Pässe, xG, Zweikämpfe je Spiel, zum Positionsmittel geschrumpft
  (k gemessen per Kreuzvalidierung auf den Phase-3-Spielen: 6,5 / 12,5 / 12), Perzentil je Position. Verein: Passquote, Packing,
  xG für/gegen, Feldvorteil. Trainer (CPU): KI-Befehle je Spiel und Gruppe. Andere Ligen: Werte-Profil (Stärke, Rang, Trainertyp),
  MODELED. Neu gespeichert nur Spielanteil je Spieler und Befehle je Verein: nach 5 Saisons höchstens 7,2 KB, 3,1 KB dauerhaft.
  Befund: xG je Spieler auf Großfeld nicht besser als das Rollenmittel.

Reihenfolge G–I: 24 → 32 → 35 → 25 → 26 + 27 → 33 → 34 → 28 → 29 → 42 → 41 → 36 → 37 → 30 → 31 → 38 → 39 → 40 → 43 → 44 → 45 → 46 → 47.
Begründung: Zuerst der kleine Rest der Ballphysik (24), dann zwei schnell spürbare Verbesserungen (32, 35). Danach die großen
Spielschichten (25–27), zwischendurch kleine Würze (33, 34). Persönlichkeit (29) vor Freundschaften und Kapitän (42, 41), weil
diese darauf aufbauen. Textmodus und die übrigen Punkte zum Schluss.

**D – Zum Schluss**
15. **Test auf einem echten Android-Gerät** (durch den Nutzer): Bildrate, Akku, Touch-Ziele, Ton und Sprachausgabe; Mängelliste
    abarbeiten.

## 2. Kleinere Vorhaben aus der Durchsicht vom 2026-11-11
- **Wechsel auf dem Platz statt in Listen:** Bankspieler auf die Position in der Aufstellung ziehen, wie im Vereinsheim.
- **Stadionsprecher ausbauen:** Aufstellung vor dem Anpfiff, Karten, Nachspielzeit. Tor- und Wechsel-Durchsagen im Browser prüfen.
- **Preisprotest sichtbar:** Spruchband in 3D auf der Tribüne.
- **Ladezeit:** Hauptdatei 3,1 MB; messen, ob Nachladen bei Bedarf (Vereinsheim, Trikot-Editor, Nationalteams) spürbar hilft.
- **career.js teilen** (1660 Zeilen): nur schrittweise, wenn dort ohnehin gearbeitet wird.
- **Supercup als fester Browser-Test.**
- **Barrierefreiheit.**

## 3. Reste bereits gebauter Punkte
Aus den „Offen“-Vermerken des Archivs übernommen. Was durch spätere Arbeit sicher erledigt ist, wurde weggelassen
(Regionalliga, Vertragsspieler, Stadionausbau in 3D, Gegnerberichte, Wetter, Großfeld, Abstimmungen zu Punkt 17).
Einträge mit „(prüfen)“ könnten ebenfalls schon überholt sein.

**Trainer und Verein**
- Privatleben (11.17 Punkt 17): Patchwork-Familie, eigenes Kind im Nachwuchs als Ereignis, Presse-Meldungen zu Käufen, Besitz in 3D
  (Auto auf dem Parkplatz), bessere Quellen für Gehälter unterhalb der 1. Liga.
- Vereinswechsel (11.17 Punkt 2): Anfragen von unten nach einer Entlassung mitten in der Saison.
- Trainerteam (11.17 Punkt 5): auch für CPU-Vereine; Co-Trainer als bezahlte Stelle in den Profiligen.
- Nationaltrainer (11.17 Punkt 15): Entlassung bei Misserfolg; Gehalt (keine belegten Zahlen); Hauptamt bewusst nicht.
- Vereinsgelände (11.17 Punkt 16): Stadion-Erweiterung in mehr Stufen, Mehrzweckhalle, Fan-Treff, Wohnheim; Ausbau auch auf
  kleineren Plätzen als dem Rasenplatz; Wirkungen nach Rückmeldung nachjustieren.
- Scouting (11.10): Scout als Ehrenamt (eine Beobachtung je Woche von selbst).
- Training (11.10): einzelne Einheiten im Wochenverlauf, Trainingsbeteiligung.
- Rivalitäten (11.10): Retortenclub mit reichem Sponsor, Relegationsgegner, Rivalitäten der Fans.
- Schiedsrichter (11.10): Beschwerden mit Gedächtnis, Pokal- und Relegationsspiele, Assistenten als Figuren.

**Wettbewerbe und Regeln**
- Europapokal (11.17 Punkt 13): Qualifikationsrunden, Startplatz für den Pokalsieger, Klubkoeffizient für die Töpfe, Stadien und
  Atmosphäre der Gegner in 3D, Fernsehgeld-Effekt auf Sponsoren, Feinheiten der Prämienverteilung.
- Nationalteams (11.17 Punkt 14): Stimmung, ausländische Schiedsrichter; Qualifikation anderer Verbände über zwei Saisons;
  Reform der Nations League ab 2028/29 (Einzelheiten fehlen noch).
- Regelwerke (11.17): höchstens neun Ersatzspieler in der 1./2. Liga (nur Sekundärquelle); Gelb-Rot sperrt auch für die Zweite;
  Zeitstrafen unterhalb der Oberliga; Gruppenregeln der übrigen Kontinentalturniere.
- Sommerturnier in einer eigenen Vorbereitungswoche (11.10) (prüfen).

**Geld (nur mit Quelle)**
- Logen und Business-Plätze, Aufpreis für Sitzplätze unterhalb der Regionalliga (bisher keine belastbaren Zahlen).
- Ticketschnitt der 3. Liga, Lizenzgebühren (11.14); echte Ligaschnitte für die 6. und 7. Liga (11.10) (prüfen).
- Fahrtkosten der Schiedsrichter; Ausrüster-Logo auf dem Trikot (Grafik).

**3D-Spiel und Darstellung**
- Eckentore noch über dem echten Wert (2,6–4,6 %), vor allem Abpraller und Nachschüsse; Kopfballtore auf 7er-Feld und Großfeld
  selten (11.6, 11.9). → gehört zu 11.18 Punkt 6.
- Vorfälle (11.1): beim Gewitter rutscht einer aus, der Schiri ist zuerst unterm Vordach; die Polizei redet mit dem Trainer.
- Kleinigkeiten: Hand greift beim Dehnen nicht sichtbar an den Fuß; Glatze/Bauch mit dem Alter (keine Quelle).
- Frauenteam (11.9): 3D-Spiele mit eigenen Spielerinnen-Modellen.
- Vereinsheim („Heute“) als 3D-Raum, Prosten als gemeinsame Geste, Wimpel nach Pokalerfolgen (11.12).
- Retro-Trikots (11.16): Vorlagen aus Frankreich und Spanien (Quellen ohne Musterbeschreibung).

**Texte und Regionales**
- Chat (11.5, 11.13): Chat-Zusagen wiederholen sich am meisten; Banter-Lob, Wechselmeldungen, mehr Vorlagen für höhere Ligen.
  → gehört zu 11.18 Punkt 9.
- Dialektfärbung bei Spitznamen und Ereignistexten; mehr Vereinsnamen je Region; Herkunftsmischung und Sponsoren-Namen je
  Bundesland; Vereinsspieler ohne Länderspiel bei den Nationalteams (11.10).
