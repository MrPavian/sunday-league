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
1. **Balance über lange Karrieren messen:** viele Karrieren über viele Saisons automatisch durchlaufen lassen und auswerten
   (Entlassungen, Tempo der Aufstiege, Kasse, Stimmung, Vertrauen, Geduld der Familie, privates Konto). Kein Wert darf dauerhaft
   am Anschlag hängen. Änderungen an Spielwerten nur mit Messung vorher und nachher.
2. **Ereignisdichte prüfen:** zählen, welche Ereignisse in zehn Saisons nie vorkommen und welche sich zu oft wiederholen
   (je Liga und je Paket); Gewichte danach richten.
3. **Einstieg für neue Spieler:** die erste Stunde einer frischen Karriere wie ein Neuling durchklicken, Stolperstellen notieren
   und beheben; Reiter unter „Verein" und „Mannschaft" entschlacken.
4. **Spielstände absichern:** Export und Import als Datei gibt es schon (SaveSlots.js); offen ist eine automatische Sicherung
   der letzten Stände, auf die man nach einem Fehler zurückgehen kann.
5. **Schwierigkeitsgrad:** Wahl zu Beginn (entspannt, normal, hart), verschiebt Geduld des Vorstands und Geld. Spielwerte, als
   solche markiert; „normal" bleibt der heutige Stand.

**B – Ausbau des Bestehenden** (Nutzerwunsch 2026-11-11)
6. **3D-Spiel verbessern: Ecken und Einwürfe** (Abläufe, Laufwege, Varianten, Ausführung), danach weitere Standards. Mit Messung
   (Tore aus Ecken je Spielort, siehe 11.6) und nur mit gewollten Golden-Änderungen.
7. **Animationen:** offene Punkte aus 11.1 (Torwart: Hechtsprung mit Abrollen, Fangen, Fausten) und neue für Ecken und Einwürfe.
8. **Ereignisse in allen Bereichen:** neue Ereignisse für jede Liga und jeden Bereich (Kabine, Vorstand, Jugend, Zweite, Frauen,
   Alte Herren, Sponsoren, Fans, Presse, Privat, Nationalteam). Nach der Zählung aus Punkt 2, damit Lücken zuerst gefüllt werden.
9. **Neue Textbausteine für alle interaktiven Bereiche:** Chat, Kneipe, Zurufe, Bank, Liveticker, Kreisblatt, Stadionsprecher,
   Halbzeit, Verhandlungen – mehr Vorlagen, damit sich nichts schnell wiederholt. Deutsch und Englisch.

**C – Neue Ideen**
10. **Karriereende und Vermächtnis:** Der Trainer altert; Abschied mit Rückblick und Ehrentafel, Weiterspielen mit einem Nachfolger
    im selben Verein.
11. **Pressekonferenz ab der Regionalliga:** zwei bis drei Fragen vor oder nach wichtigen Spielen; Antworten wirken auf Kabine,
    Vorstand und Fans (passt zu Auftreten und Trainertyp aus Punkt 17).
12. **Rivalität zwischen Trainern:** ein gegnerischer Trainer, der über mehrere Saisons wiederkehrt, mit Vorgeschichte.
13. **Spieltag als Erlebnis im Amateurbereich:** Platzwart, Bratwurststand, Linienrichter aus dem eigenen Verein, ausgefallenes
    Flutlicht – kleine sichtbare Dinge am Platz.
14. **Legenden des Vereins:** Abschiedsspiel, Trikotnummer wird nicht mehr vergeben, Rückkehr als Co-Trainer oder im Vorstand;
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
- Torwart-Animationen (11.1): Hechtsprung mit Abrollen, Fangen in Brust- und Kopfhöhe, Abtauchen, Fausten, Abwurf und Abschlag mit
  Ausholen, Herauslaufen im 1 gegen 1, sichtbarer Fehlgriff. → gehört zu 11.18 Punkt 7.
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
