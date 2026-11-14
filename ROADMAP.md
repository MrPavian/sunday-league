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
   - Offen: prüfen, ob `grueppchen`/`mannschaftsrat` (Unruhe), `profi_scout`, `profi_rueckkehr`, `profivertrag`, `berater`,
     `rasenheizung`, `elfmeter_training`, `tiger_schlaf`, `mittraining_graetsche`, `pate_meint` erreichbar sind; die Ligen 1 und 11
     waren mit rund 150 Wochen dünn besetzt.
3. **Einstieg für neue Spieler.** ✅ **Erster Durchgang 2026-11-12** (frische Karriere im Hochformat durchgeklickt und jede
   Seite vermessen): Überschrift der Gründungsversammlung war abgeschnitten (behoben); die Kasse war in Woche 1 5,4 Bildschirme
   lang – Ausrüster-Angebote jetzt eingeklappt; unter „Du" waren 17 von 35 Knöpfen gesperrt – der Privat-Block zeigt je Bereich
   nur noch die nächste Stufe. Offen: Reiter zusammenlegen (Verein und Mannschaft haben je sechs), Startseite (2,9 Bildschirme),
   Trikot-Editor (150 Knöpfe), ein zweiter Durchgang im Querformat und mit einem echten Neuling.
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
   - Offen: Tore aus dem Spiel nach Ecken liegen noch bei 5–8 % (echt insgesamt 2,6–4,6 %); Angreifer laufen ein ✅ (2026-11-13,
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
   Schlagzeilen, Zurufe. Bank ist schon lagebezogen formuliert. Offen: Chat (hat schon viele Sprüche, 11.17).
   Ursprünglicher Punkt: Chat, Kneipe, Zurufe, Bank, Liveticker, Kreisblatt, Stadionsprecher,
   Halbzeit, Verhandlungen – mehr Vorlagen, damit sich nichts schnell wiederholt. Deutsch und Englisch.

**C – Neue Ideen**
10. **Karriereende und Vermächtnis.** ✅ **2026-11-13:** Abschied, Nachfolger und Ehrenpräsident gab es schon (legacy.js); neu ist
    der Rückblick der Ära (Aufstiege, Abstiege, beste Platzierung; tests/farewell.test.js). Ursprünglicher Punkt: Der Trainer altert; Abschied mit Rückblick und Ehrentafel, Weiterspielen mit einem Nachfolger
    im selben Verein.
11. **Pressekonferenz ab der Regionalliga.** ✅ **Erste Lieferung 2026-11-13** (career/presse.js, tests/presse.test.js): Spitzenspiel
    mit Ansage und Nachfrage eine Woche später, Siegesserie, Personalfrage. Offen: Wirkung auf die Fans, Fragen nach Pokal- und
    Abstiegsspielen, Verknüpfung mit dem Trainertyp. Ursprünglicher Punkt: zwei bis drei Fragen vor oder nach wichtigen Spielen; Antworten wirken auf Kabine,
    Vorstand und Fans (passt zu Auftreten und Trainertyp aus Punkt 17).
12. **Rivalität zwischen Trainern.** ✅ **Erste Lieferung 2026-11-13** (career/coachrival.js, tests/coachrival.test.js): ein
    Trainer mit Namen und Bilanz, folgt in eine neue Liga, Stichelei vor und Handschlag nach dem Duell. Offen: Gesicht,
    Wirkung der „Hitze“ aufs Spiel, mehr Ereignisse (Abwerben, gemeinsamer Lehrgang). Ursprünglicher Punkt: ein gegnerischer Trainer, der über mehrere Saisons wiederkehrt, mit Vorgeschichte.
13. **Spieltag als Erlebnis im Amateurbereich.** ✅ **Erste Lieferung 2026-11-13** (render/props.js makeMatchdayStaff): Platzwart
    mit Kreidewagen und Vereins-Linienrichter als stehende Figuren; die Bratwurstbude gab es schon. Flutlichtausfall als Ereignis am Schwarzen Brett
    (2026-11-13). Offen: bewegte Figuren, Ausfall sichtbar im 3D-Spiel. Ursprünglicher Punkt: Platzwart, Bratwurststand, Linienrichter aus dem eigenen Verein, ausgefallenes
    Flutlicht – kleine sichtbare Dinge am Platz.
14. **Legenden des Vereins.** ✅ **Erste Lieferung 2026-11-13** (career/legends.js, tests/legends.test.js): Abschied mit drei
    Ehrungen, Tafel im Museum, Besuch beim Training. Feste Rückennummern ab der Kreisklasse C mit Sperre für Legenden (career/numbers.js,
    tests/numbers.test.js; Ablauf nach 10 Saisons, Freigabe von Hand ab 3). Offen: Rückkehr in den Vorstand, Nummern der Gegner. Ursprünglicher Punkt: Abschiedsspiel, Trikotnummer wird nicht mehr vergeben, Rückkehr als Co-Trainer oder im Vorstand;
    verbindet Ehemalige (alumni) und Museum.
    (Nicht aufgenommen nach Nutzerentscheid: Saisonziele zum Selbstwählen.)

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
