# Konzept: Profiligen (Regionalliga und 3. Liga)

Stand 2026-11-05. Vom Nutzer gewünscht (ROADMAP 11.14, „Regionalliga und 3. Liga spielbar“). Entscheidungen des Nutzers vom
2026-11-05:

- **Umfang „alles auf einmal“:** Ligen, Spielerverträge mit Gehalt und Laufzeit, Ablöse, Zulassung (Stadion, Flutlicht,
  Finanznachweis) in einem Schritt.
- **Oberste Stufe:** Die 3. Liga ist vorerst die oberste Stufe. Ihr Meister verzichtet aus finanziellen Gründen auf den
  Aufstieg. Verzichten kann jeder Verein in jeder Liga, unten kommt es häufiger vor.
- **Nur neue Karrieren:** Kennung `career.pro` (1). Alte Spielstände bleiben bei der Oberliga als oberster Stufe.

Kennzeichnung der Werte: **belegt** (mit Quelle), **hergeleitet** (aus belegten Werten gerechnet) oder **Spielwert**
(eingestellt, ohne Quelle).

## 1. Ligen

| Stufe | Liga | Vereine im Spiel | Stärke-Ziel (beste Elf) | Quelle |
|---|---|---|---|---|
| 9 | Regionalliga (Staffel nach Verband) | 5 + 2 (große Staffel) | 141 | Konzept Spielerstärke 10: 15 Punkte je Liga, Spielwert |
| 10 | 3. Liga | 5 + 2 | 156 | ebenso |

- **Fünf Staffeln:** Nord, Nordost, West, Südwest und Bayern, je 18 Vereine (belegt: de.wikipedia „Fußball-Regionalliga
  2023/24“). Die Zuordnung der Verbände steht in `verband.js` (`RL_STAFFEL`). Ohne gewählten Verband heißt die Liga nur
  „Regionalliga“.
- **3. Liga:** 20 Vereine (belegt: de.wikipedia „3. Fußball-Liga 2023/24“). Im Spiel gibt es wie in allen Ligen fünf oder sieben
  Gegner.
- **Vereine:** alle erfunden (`clubs.js`, `RL_CLUBS` und `DL_CLUBS`).
- **Spieler:** Der Pool kennt nur die Niveaus 1–8, und oben gibt es zu wenige Spieler für ganze Profiligen. Darum zieht ein
  Profiverein seine Spieler aus den Niveaus 6–8 und schreibt ihnen das Profi-Niveau 9 oder 10 fest zu (`career.proNiv`). Ihre
  Technikwerte steigen dann wie bei jedem Niveau (`sim/niveau.js`).
- **Gemessen** (`tests/profiligen.test.js`): Die Gegner in der Regionalliga liegen im Mittel innerhalb von 12 Punkten um 141.
- **Neue Karrieren:** Die besten Oberligisten holen jetzt auch Spieler vom Niveau 9, wie jede Liga vom Niveau darüber.
- **Entwicklung:** Der Zuwachs je Liga ist fortgesetzt (+0,13 je Stufe, hergeleitet). Die Trainingsnorm beträgt in beiden
  Ligen 5 Tage (Spielwert).

## 2. Zuschauer und Einnahmen

| Größe | Regionalliga | 3. Liga | Art |
|---|---|---|---|
| Zuschauer je Spiel (Mitte) | 1367 | 9620 | belegt (siehe unten) |
| Spanne | 780–1955 | 5485–13 755 | ±43 % wie in den Stufen 6–8, hergeleitet |
| Eintritt je Zuschauer (vor Abschlag) | 11 € | 15 € | hergeleitet |
| Fernsehgeld je Spieltag | – | 34 474 € | hergeleitet |
| Vermarktung je Spieltag | – | 40 000 € | Spielwert |
| Spielbetrieb je Woche | 1465 € | 10 307 € | 150 € × Zuschauerfaktor, hergeleitet |
| Schiri je Heimspiel | 400 € | 900 € | Spielwert |

Herkunft der Werte:

- **Zuschauer Regionalliga:** Saison 2023/24, Nord 940, Bayern 945, West 2217 je Spiel (de.wikipedia, Saisonartikel
  „Fußball-Regionalliga Nord/Bayern/West 2023/24“). Das Mittel ist 1367. Für Nordost und Südwest fand sich kein Schnitt.
- **Zuschauer 3. Liga:** Saison 2023/24, 9620 je Spiel (de.wikipedia „3. Fußball-Liga 2023/24“).
- **Eintritt Regionalliga:** liegt zwischen 8 € Stehplatz (BSG Chemie Leipzig nach dem Aufstieg 2017, Sachsen Fernsehen) und
  14,50 € (Stuttgarter Kickers, Stuttgarter Zeitung).
- **Eintritt 3. Liga:** Es fand sich kein Ligaschnitt. Die 2. Bundesliga nimmt 12,55 € je Stehplatz und 24,70 € je Karte im
  Schnitt (2024/25, bundesliga.com). Die 3. Liga liegt darunter.
- **Fernsehgeld:** rund 1,31 Mio. € je Drittligist und Saison (DFB, Medienvertrag ab 2023/24), geteilt durch 38 Spieltage.
- **Vermarktung:** Echte Drittligisten nehmen im Schnitt 16,2 Mio. € ein (DFB-Saisonreport 3. Liga 2023/24). Davon ist im Spiel
  nur ein Teil abgebildet, ebenso fehlen die Kosten außer den Gehältern. Der Wert ist so eingestellt, dass ein Verein mit dem
  Kader eines Ligamittleren etwa ausgeglichen wirtschaftet (Abschnitt 5).
- **Kostentabellen:** Vereinsfest, Turniere, Trainergehalt und Sponsoren wachsen wie bisher mit dem Zuschauerfaktor (hergeleitet).

Fassungsvermögen: Das Drittliga-Stadion fasst 5001 Plätze, die Arena 15 000. Die Arena ist eine Spielvariante. Mit dem
Drittliga-Stadion ist die Zuschauerzahl auf 5001 gedeckelt.

## 3. Verträge (`career/contracts.js`)

Ab der Regionalliga hat jeder eigene Spieler einen Vertrag mit Monatsgehalt und Laufzeit. In der Oberliga und darunter ruhen
die Verträge, dort gilt die Aufwandsentschädigung.

**Gehalt.** Formel: Schnitt der Liga × 6,5^((Stärke − Ziel der Liga) / 15), begrenzt auf das 0,25- bis 6,5-Fache. Gerundet wird
auf 50 €.

- **Schnitt Regionalliga:** 1000 € im Monat (MDR-Recherche, zitiert bei kuechenfibel.de – Sekundärquelle).
- **Spitzengehalt Regionalliga:** bis 6500 € im Monat, also das 6,5-Fache (ebenda). Das Spiel setzt es eine Liga Stärke über den
  Schnitt (hergeleitet).
- **Schnitt 3. Liga:** 15 000 € im Monat, hergeleitet. Der Personalaufwand im Spielbetrieb beträgt im Schnitt 5,467 Mio. € je
  Klub (DFB-Saisonreport 3. Liga 2023/24). Das Spiel teilt durch 12 Monate und 30 Köpfe (Annahme: 26 Spieler, 4 Trainer).
- **Steigung 3. Liga:** dieselbe wie in der Regionalliga (hergeleitet).

**Je Spieltag.** Abgebucht wird Monatsgehalt × 12 / echte Spieltage (Regionalliga 34, 3. Liga 38). So stehen Gehälter, Eintritt
und Fernsehgeld im selben Verhältnis wie in echt (hergeleitet).

**Laufzeit** (Spielwert): bis 23 Jahre drei Jahre, bis 29 zwei, danach ein Jahr.

**Verlängern** (Spielwert):

- Im letzten Vertragsjahr möglich, für 1–3 Jahre.
- Der Spieler verlangt 10 % mehr als seine Forderung.
- Wer sauer ist, verlängert nicht.
- Drei Spieltage vor Schluss kommt eine Erinnerung im Chat.
- Wer nicht verlängert, geht im Sommer ablösefrei.

**Ablöse** (Spielwert): Jahresgehalt × Restlaufzeit × 0,5. Bei fremden Spielern gilt eine Restlaufzeit von 1–3 Jahren, fest je
Spieler und Saison. Sie ersetzt die Ausbildungsentschädigung, sobald der Spieler aus einem Profiverein kommt.

**Vorzeitige Auflösung** (Spielwert): Abfindung in Höhe der Hälfte der restlichen Gehälter.

## 4. Zulassung und Aufstiegsverzicht (`career/license.js`)

**Regionalliga:**

- Stadion für 2500 Plätze (WDFV-Zulassungsrichtlinien, im Spiel der „Stadionausbau“).
- Flutlicht. Gefordert sind mindestens 400 Lux (BFV, Zulassungsvoraussetzungen Regionalliga Bayern 2025/26). Im Spiel zählt das
  Flutlicht des Platzes.

**3. Liga:**

- 5001 Plätze, davon 2000 Sitzplätze (DFB, „Neu in der 3. Liga: das Zulassungsverfahren“).
- Flutlicht mit 800 Lux im Bestand, laut DFB-Beschluss.
- Im Spiel: die Ausbauten „Drittliga-Stadion“ und „Flutlicht 800 Lux“. Preise und Bauzeiten sind Spielwerte.

**Finanznachweis:** Rücklage für vier Wochen Spielbetrieb der neuen Liga (Spielwert). Die DFB-Regel ist vereinfacht. Dort sind
1 Mio. € Liquiditätsreserve nötig, wenn das Personal 80 % der Erträge oder mehr kostet.

Fehlt etwas, steigt der Verein nicht auf. Die Anforderungen stehen ab der Verbandsliga unter Verein → Anlage und am Saisonende.

**Verzicht:**

- **Eigener Verein:** kann am Saisonende auf den Aufstieg verzichten, auch vor oder nach der Relegation.
- **CPU-Vereine:** Der beste Verein verzichtet mit einem Anteil je Stufe, dann geht der Nächste. Anteile (Spielwerte): 20 % aus der
  Freizeitliga, dann je Stufe weniger, bis 6 % aus der Regionalliga.
- **Belege:** FC Hennef 05 verzichtete 2023 als Mittelrheinliga-Meister aus finanziellen Gründen (de.wikipedia „Fußball-Regionalliga
  West 2023/24“). Kaan-Marienborn zog wegen der Stadionauflagen zurück (ebenda). Die SpVgg Unterhaching verzichtete 2026 auf die
  Relegation zur 3. Liga, weil die wirtschaftlichen Rahmenbedingungen fehlten (ran.de, flashscore.de).
- **Meister der eigenen Liga verzichtet:** Dann steigt der Zweite direkt auf, ohne Relegation.
- **3. Liga:** Ihr Meister verzichtet immer, weil es noch keine 2. Liga gibt. Die besten vier spielen in der nächsten Saison den
  überregionalen Pokal (DFB-Regel).

## 5. Messung (`scripts/pro-audit.mjs`, Seed 5)

Eine Saison mit 10 Spieltagen und dem Kader eines Ligamittleren. Die Heimspiele sind als Erwartung gerechnet (mittlere Zuschauer
× Fanfaktor, gedeckelt). Sponsoren sind nicht enthalten.

| Liga | Kader (beste Elf) | Gehälter je Monat | Saldo |
|---|---|---|---|
| Regionalliga | 145 | 26 950 € | +4934 € |
| 3. Liga, mit Vermarktung | 157 | 347 700 € | +72 125 € |
| 3. Liga, ohne Vermarktung | 157 | 347 700 € | −368 000 € |
| 3. Liga, stärkster Kader | 162 | 557 650 € | −590 958 € |

Offen:

- echte Spesenordnung der Schiris;
- Ticketschnitt der 3. Liga;
- Lizenzgebühren;
- Merchandising als eigener Bereich;
- eine 2. Liga.
