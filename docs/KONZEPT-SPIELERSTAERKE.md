# Konzept: Spielerstärke und Entwicklung von der Freizeitliga bis zur Bundesliga

Stand 2026-10-29, Wunsch des Nutzers: Seit die Pyramide bis zur Oberliga reicht (Stufe 8) und Profiligen auf der Roadmap stehen,
braucht es ein Stärke- und Entwicklungsmodell, das über alle Stufen trägt. Dieses Dokument ist ein Konzept, noch kein Einbau.
Alle Zahlen sind mit Quelle, gemessen oder ausdrücklich als *hergeleitet* bzw. *Spielwert* markiert.

## 1. Ist-Zustand (gemessen)

- Werte (Attribute) liegen zwischen 0 und 1 (begrenzt auf 0,05–0,98). Die Stärke (1–99) ist eine gewichtete Summe je Position plus
  ein Bonus für Besonderheiten (`ratePlayer`, generator.js).
- Spielerklassen OK bis Ex-Profi (data/tiers.js) haben feste Wertebereiche, die Ligen mischen sie (clubs.js `tiers`).
- Profis entstehen aus denselben Klassen plus einem pauschalen Zuschlag von +0,22 bzw. +0,24 auf alle Werte (bundespokal.js
  `PROFI_KLASSEN`).
- Stärke der besten 11 bzw. des Formats je Stufe, gemessen mit `defStrength` (12 Probekader je Verein):

| Stufe | Liga | Ø Stärke | Abstand zur Stufe darunter |
|---|---|---|---|
| 1 | Freizeitliga | 51,4 | – |
| 2 | Kreisklasse C | 57,1 | 5,7 |
| 3 | Kreisklasse B | 59,3 | 2,2 |
| 4 | Kreisliga A | 62,7 | 3,4 |
| 5 | Bezirksliga | 68,9 | 6,2 |
| 6 | Landesliga | 70,8 | 1,9 |
| 7 | Verbandsliga | 71,9 | 1,1 |
| 8 | Oberliga | 73,5 | 1,6 |
| 11 | Zweitligist | 95,3 | (21,8 über der Oberliga) |
| 12 | Erstligist | 96,5 | 1,2 |

- Wie stark das Spiel auf Stärkeunterschiede reagiert, ist an der Engine gemessen (pokal.js `QUICK`): Die Torerwartung steigt um
  den Faktor e^(0,03 je Punkt), bei großen Unterschieden e^(0,04 je Punkt). Damit gewinnt bei 5 Punkten Unterschied der Stärkere
  47 % der Spiele, bei 10 Punkten 57 %, bei 20 Punkten 76 % (Poisson-Rechnung mit 1,4 Toren je Team, ohne Heimvorteil).

**Drei Probleme:**
1. **Unten zu eng:** Die Amateurstufen liegen nur 1–6 Punkte auseinander. Ein Klassenhöherer gewinnt so kaum öfter als jeder
   andere, Tabellen und Aufstiege sind fast Zufall.
2. **Oben gedeckelt:** Der pauschale Zuschlag drückt die Profis an die Obergrenze 0,98. Erst- und Zweitligist liegen nur 1,2 Punkte
   auseinander, für Regionalliga und 3. Liga ist kein Platz mehr.
3. **Die Skala reicht nicht:** Bei der heutigen Engine bräuchte ein realistischer Ligaabstand 13–17 Punkte (siehe Abschnitt 2).
   Zwölf Stufen wären 150–200 Punkte, die Skala hat aber 1–99.

## 2. Was echte Ligen zeigen (Quellen)

- **Elo je Spielklasse, Saison 2026/27** ([elofootball.com, Deutschland](https://www.elofootball.com/country.php?countryiso=DEU),
  abgerufen 2026-10-29):

| Ebene | Liga | Ø Elo | Streuung | Abstand |
|---|---|---|---|---|
| 1 | Bundesliga | 1977 | 7,1 % | – |
| 2 | 2. Bundesliga | 1722 | 3,8 % | 255 |
| 3 | 3. Liga | 1518 | 5,1 % | 204 |
| 4 | Regionalliga (91 Vereine) | 1265 | 8,8 % | 253 |

- **Abstand je Stufe:** im Mittel 237 Elo. Nach der Elo-Formel heißt das: Gegen einen Verein eine Liga tiefer holt der höhere im
  Schnitt 80 % der Punkte (Sieg = 1, Remis = ½).
- **Streuung in der Liga:** 3,8–8,8 % von rund 1300–2000 Elo, also etwa ±70 bis ±140 Elo. Zwischen Bestem und Schlechtestem einer Liga
  mit 18 Vereinen liegen damit gut 300 Elo, also rund 1,4 Stufen. Die Ligen überlappen sich: Der Spitzenreiter einer Liga ist so stark wie das
  Mittelfeld darüber.
- **Gegenprobe Pokal:** Laut einer Auswertung kamen im DFB-Pokal in den 2010er-Jahren 5,5 % der Amateure weiter
  ([Förde News 2018](https://www.foerde.news/news/der-dfb-pokal-hatte-seine-eigenen-gesetze.html), Zweitquelle, Blog-Auswertung).
  Elo-Rechnung zum Vergleich: Ein Regionalligist (1265) hat mit Heimrecht gegen einen durchschnittlichen Profi (≈ 1850) eine
  Punkterwartung von etwa 5–6 %. Das passt.
- **Trainingsumfang je Liga** (schwache Quellen, Ratgeber eines Anbieters von Vorbereitungsplänen,
  [fitindiesaison.de](https://fitindiesaison.de/fussball-vorbereitung-der-komplette-guide-fuer-trainer/)):

| Liga | Einheiten je Woche |
|---|---|
| Kreisliga | 2 |
| Bezirks-/Landesliga | 3–4 |
| Oberliga | 4 und mehr (eine weitere Quelle: 4–5) |
| Profis | täglich, ohne Zahl |

  Rheinpfalz nennt dreimal pro Woche in der Landesliga (bereits in development.js zitiert).
- **Leistungshöhepunkt nach Position** ist schon belegt und eingebaut (development.js, Dendir 2016; Frontiers 2019).

## 3. Kernidee: eine absolute Leistungsskala

Jeder Spieler bekommt eine verborgene **Leistung** in Elo-Einheiten (der „wahre“ Wert). Daraus werden Werte und Stärke abgeleitet.
Jede Liga hat eine Ziel-Leistung als Mittel ihrer Kader:

| Stufe | Liga | Ziel-Leistung (Elo) | Herkunft |
|---|---|---|---|
| 12 | Bundesliga | 1977 | belegt |
| 11 | 2. Bundesliga | 1722 | belegt |
| 10 | 3. Liga | 1518 | belegt |
| 9 | Regionalliga | 1265 | belegt |
| 8 | Oberliga | ≈ 1028 | *hergeleitet*: −237 je Stufe |
| 7 | Verbandsliga | ≈ 791 | *hergeleitet* |
| 6 | Landesliga | ≈ 554 | *hergeleitet* |
| 5 | Bezirksliga | ≈ 317 | *hergeleitet* |
| 4 | Kreisliga A | ≈ 80 | *hergeleitet* |
| 3–1 | Kreisklasse B, C, Freizeitliga | weiter −237 je Stufe | *hergeleitet* |

Elo hat keinen festen Nullpunkt, deshalb sind negative Werte unten unproblematisch. Ob der Abstand unten wirklich 237 beträgt, ist
nicht belegt. Das ist die wichtigste offene Annahme; zu prüfen mit Kreis- und Bezirkspokal-Ergebnissen (Ergebnisse unterschiedlich
hoher Ligen gegeneinander), falls sich eine Quelle findet.

**Die Streuung in der Liga** übernehmen wir aus den Profiligen: ±100 Elo als Standardabweichung, hergeleitet aus dem Mittel von
3,8–8,8 %. Unten ist sie vermutlich größer (der Dorfstar neben dem Gelegenheitskicker), das wäre ein Spielwert.

## 4. Wie die Leistung ins Spiel kommt – drei Wege

**A. Engine steiler machen (Empfehlung).**
- Die sichtbare Stärke 1–99 wird linear aus der Leistung berechnet, rund 7,7 Stärkepunkte je Liga. Die Freizeitliga liegt um 12,
  die Bundesliga um 97.
- Die Engine muss dafür etwa doppelt so empfindlich werden: Bei 7,7 Punkten Unterschied sollen 80 % der Punkte herauskommen statt
  heute 64 %. Das betrifft die Erfolgsfunktionen der Aktionen (Pass, Zweikampf, Abschluss, Torwart) in sim/actions.js und ai.js,
  nicht die Laufgeschwindigkeit.
- Vorteil: eine Skala, eine Zahl je Spieler, ehrlich lesbar.
- Nachteil: Alle Eichungen der Spielmechanik müssen neu gemessen werden (Torquoten, Ecken, Pokalmodell). Golden ändert sich
  gewollt.

**B. Klassenunterschied als eigener Faktor.**
- Werte bleiben wie heute. Zusätzlich bekommt jede Mannschaft im Spiel einen Bonus aus dem Leistungsunterschied, z. B. auf
  Ballkontrolle und Entscheidungen.
- Vorteil: wenig Umbau.
- Nachteil: verdeckter Zuschlag, den man den Werten nicht ansieht. Der Nutzer will lesbare, echte Werte.

**C. Zwei Schichten: Körper und Fußballverstand.**
- Körperliche Werte (Tempo, Ausdauer, Körper) bleiben in echten Grenzen. Eine zweite Schicht „Spielverständnis/Routine“ trägt den
  großen Abstand zwischen den Ligen, wie in echt, wo Profis vor allem besser entscheiden und sauberer ausführen.
- Das ist eine Verfeinerung von A: Die Steilheit kommt dann aus den technisch-taktischen Werten.

**Empfehlung:** A mit dem Gedanken aus C. Die Geschwindigkeit bleibt in echten m/s (heute 4,6 + 2,6 × Tempo), die Steilheit kommt
aus Technik, Passen, Abschluss, Zweikampf, Torwart und einem neuen Wert für Spielverständnis.

## 5. Spielerentwicklung über alle Stufen

- **Potenzial (verborgen):** Jeder Spieler hat eine Obergrenze in Elo. Ihre Verteilung folgt der Größe der Pyramide: Wie viele
  Spieler das Potenzial einer Stufe haben, richtet sich nach der Zahl der Mannschaften auf dieser Stufe in Deutschland. Die
  Mannschaftszahlen je Stufe hole ich beim Einbau aus der Spielklassen-Tabelle der Wikipedia; Beispiel: Bundesliga 18, Regionalliga 91.
- **Zuwachs je Saison in Elo:**
  - Alterskurve wie heute (Entwicklungstypen, Höhepunkt je Position: belegt).
  - Umfeldfaktor aus dem Trainingsumfang der Liga: 2 Einheiten in der Kreisliga, 3–4 in der Bezirks- und Landesliga, 4–5 ab der
    Oberliga, täglich bei Profis. Das ersetzt `LEAGUE_GROWTH`, das heute ein Spielwert ist.
  - Spielpraxis wie heute.
  - Nie über das Potenzial hinaus. Wer sich in einer zu tiefen Liga aufhält, entwickelt sich langsamer: Umfeld und Gegner bremsen.
- **Durchlässigkeit:**
  - Wer über seiner Liga steht, wird von Vereinen weiter oben bemerkt: Abwerbeversuch, Wechselwunsch, Scouting (passt zum Punkt
    „Scouting“ in Verein/Kader).
  - Umgekehrt kommen Absteiger aus höheren Ligen (Ex-Profi, „hat mal höher gespielt“) mit Leistung über der Liga.
- **Abbau im Alter:** wie heute, aber in Elo. Profis halten länger, weil sie besser betreut werden; Quelle beim Einbau suchen.

## 6. Spielerpool und Gegner

- Der Pool erzeugt Spieler nach Ziel-Leistung und Streuung der Liga statt nach festen Klassenbereichen.
- Die Klassen OK bis Ex-Profi bleiben als lesbare Etiketten. Sie werden zu Leistungsbändern, z. B. „Dorfstar“ = deutlich über dem
  eigenen Ligaschnitt.
- Gegnerkader je Liga werden aus Ziel-Leistung und Streuung gezogen statt aus Hand-Mischungen. Die heutigen Mischungen der
  Stufen 6–8 sind ohnehin hergeleitet.
- Profis brauchen keinen pauschalen Zuschlag mehr: Ihre Leistung liegt einfach höher, ohne Deckel.

## 7. Prüfgrößen (an der Engine zu messen)

| Prüfung | Ziel |
|---|---|
| Ein Ligaabstand (Ø Kader) | ≈ 80 % der Punkte für den Klassenhöheren |
| Zwei Ligen Abstand | ≈ 94 % (Elo 474) |
| Tabellen | Spitze und Ende einer Liga liegen rund 1,4 Stufen auseinander, Aufsteiger halten sich meist im unteren Mittelfeld |
| Pokal | Regionalligist gegen Profi kommt in ≈ 5 % weiter (siehe Abschnitt 2), Oberligist seltener |
| Entwicklung | Die heutigen Zielwerte des Nutzers (16- bis 20-Jährige: +8 Freizeitliga, +14 Bezirksliga in 8 Saisons, 5–10 % Durchbruch) sind in Elo zu übersetzen und gelten weiter |
| Ausgeglichenheit | ≈ 1,4 Tore je Team und Spiel bleiben (pokal.js `QUICK`) |

## 8. Umstellung

- Neue Karrieren bekommen das neue Modell (eigene Auflage wie bei den Namen). Alte Spielstände behalten das alte, oder sie werden
  einmalig umgerechnet (Leistung aus der heutigen Stärke). Das ist eine Entscheidung für den Nutzer.
- Die angezeigten Stärkezahlen ändern sich: Freizeitliga um 12 statt um 51. Wer die alten Zahlen gewohnt ist, sieht kleinere Werte.
- Golden ändert sich gewollt. Die Spielmechanik wird danach neu geeicht (Torquoten, Ecken, Kopfbälle, Pokalmodell).

## 9. Schritte

1. Engine-Steilheit genau messen: Siegquote über dem Stärkeunterschied, je Platzformat, nur Messung.
2. Prototyp in einem Worktree: Erfolgsfunktionen steiler, Ziel ≈ 80 % je 7,7 Punkte; Torquoten und Golden beobachten.
3. Leistungsskala, Pool und Gegnerkader nach Ziel-Leistung.
4. Entwicklung in Elo mit Potenzial und Trainingsumfang.
5. Profiligen (Regionalliga, 3. Liga, 2. Liga, Bundesliga) setzen darauf auf.
6. Neu eichen; Prüfgrößen aus Abschnitt 7 als Tests.

## 10. Entscheidungen (Nutzer, 2026-10-29)

- **Weg:** Stärke 1–99 über alle 12 Ligen (Weg A), dazu verdeckte Boni für besondere Spieler, z. B. „Weltklassespieler“,
  „Führungsspieler“, „Star der Liga“. Umsetzung: Die Boni sind verborgene Eigenschaften, die im Spiel wirken (Entscheidungen,
  Mitspieler, Drucksituationen), aber nicht in der Stärkezahl stecken. Vorhandene Besonderheiten wie „Anführer“ oder „Teamchemie“
  werden dabei geprüft und eingeordnet; Größe der Boni als Spielwerte, beim Einbau an der Engine gemessen.
- **Alte Spielstände:** Nur neue Karrieren bekommen das neue Modell; laufende Spielstände spielen mit dem alten weiter.
- **Abstand unten:** In den Amateurligen kleiner als 237 Elo je Stufe. Das ist ein Spielwert ohne Quelle, im Code markiert. Vorschlag
  zum Einmessen: von Stufe 8 (Oberliga) nach unten schrittweise kleiner werdend. Den genauen Verlauf lege ich beim Prototyp fest
  und lege ihn vor dem Einbau mit den gemessenen Siegquoten vor.
- **Anzeige:** Zahl und Liganiveau, z. B. „Stärke 54 · Niveau Landesliga“.
- **Skala (2026-10-30, nach Messung 11.6):** Die Stärke darf über 99 gehen (etwa bis 150), rund 15 Punkte je Liga bei echten Kadern,
  unten kleinere Abstände. Die Engine bleibt so steil, wie sie ist. Damit ersetzt diese Entscheidung „1–99 über alle 12 Ligen“.
- **Reihenfolge (2026-10-30):** Erst die übrigen Punkte aus „Verein, Kader, Wirtschaft“, das neue Stärkemodell danach am Stück.

## 11. Messung Schritt 1 (2026-10-29)

Gemessen mit `scripts/strength-steepness.mjs`: zwei Mannschaften aus demselben Grundkader, eine mit allen Werten um D/200 höher,
die andere um D/200 niedriger (Stärkeunterschied der Startelf = D), Heim und Gast im Wechsel, Spiellänge wie eingestellt.
Punkte für den Stärkeren (Sieg 1, Remis ½); N Spiele je Zeile, Unsicherheit bei N = 40 etwa ±7 Prozentpunkte.

| Platz (Format) | N | D = 4 | D = 8 | D = 12 | D = 16 | D = 20 | D = 24 | Tore je Team (D = 0) |
|---|---|---|---|---|---|---|---|---|
| Park (5) | 40 | 59 % | 83 % | 71 % | – | 86 % | – | 0,89 |
| Rasenplatz (7) | 40 | 63 % | 78 % | 78 % | – | 90 % | – | 1,41 |
| Sportplatz (9) | 40 | 63 % | 69 % | 86 % | – | 93 % | – | 0,93 |
| Großfeld (11) | 24 | – | 69 % | – | 71 % | – | 90 % | 0,65 |

**Woher die Steilheit kommt** (D = 8, N = 60, nur eine Wertegruppe verschoben, gleicher Stärkeunterschied):

| Platz | nur Körper (Tempo, Ausdauer, Körper) | nur Technik (Passen, Technik, Abschluss, Zweikampf, Kopfball, Torwart) |
|---|---|---|
| Rasenplatz (7) | 77 % | 76 % |
| Sportplatz (9) | 76 % | 61 % |

**Was das heißt:**
1. Die Engine ist schon fast so steil wie nötig, wenn ein Stärkeunterschied aus allen Werten gleichmäßig kommt: bei 8 Punkten
   im Mittel etwa 75 % der Punkte (Ziel aus Abschnitt 3: 80 % bei 7,7 Punkten). Umgerechnet in das Poisson-Modell entspricht das
   etwa 0,05–0,06 je Punkt; für 80 % bräuchte es etwa 0,07 (Rechnung mit 1,2 Toren je Team). Also rund 1,3-mal steiler, nicht
   doppelt, wie in Abschnitt 4 angenommen.
2. Die Annahme in Abschnitt 4 (doppelt so steil) kam aus dem Pokalmodell (QUICK, 0,03 je Punkt), das an echten Kadern gemessen ist.
   Bei echten Kadern sagt die Stärkezahl das Ergebnis also schlechter voraus als bei gleichmäßig verschobenen Werten. Vermutete
   Gründe, noch zu messen: Zuschläge in der Stärke ohne gleich große Wirkung im Spiel (z. B. Ex-Profi +12), Gewichte je Position,
   die nicht zur Wirkung im Spiel passen, Spieler auf fremden Positionen.
3. Weg C (Steilheit nur aus der Technik, Körper bleibt) trägt so nicht: Je Stärkepunkt wirkt Körper mindestens so stark wie
   Technik, auf dem Sportplatz sogar deutlich stärker. Bei Weg C müsste die Technik im Spiel mehr Gewicht bekommen.
4. Das Hauptproblem „unten zu eng“ liegt damit vor allem an den Abständen der Kader zwischen den Ligen (1–6 Punkte), weniger an der
   Engine.

**Neuer Vorschlag für Schritt 2:**
- a) Stärkezahl ehrlicher machen: Gewichte je Position und Zuschläge an der Wirkung im Spiel messen (gleiche Methode, je Wert
  einzeln), damit die Zahl bei echten Kadern so gut vorhersagt wie im Versuch. Ziel: QUICK-Steigung an echten Kadern ≈ 0,05.
- b) Engine leicht steiler (Faktor ≈ 1,3), vorzugsweise über die Technikwerte, damit Profis vor allem besser entscheiden und
  ausführen (Gedanke aus Weg C).
- c) Ligen weiter auseinanderziehen (Ziel-Leistung je Liga, Abschnitt 3), unten kleinere Abstände (Nutzerentscheid).

### 11.1 Wirkung der einzelnen Werte (2026-10-29)

Rasenplatz (7er), N = 120 je Zeile, nur ein Wert verschoben, für die ganze Mannschaft um ±0,20. „Wirkung“ ist der Stärkeunterschied,
der im Versuch mit allen Werten (Steigung 0,043 je Punkt, kleinste Quadrate über D = 4/8/12/20) dieselbe Punktquote ergibt; in Klammern
die Spanne bei ±4,5 Prozentpunkten Unsicherheit. „Zählt“ ist, um wie viel sich die heutige Stärkezahl dabei ändert.

| Wert | Punkte | Wirkung | Zählt in der Stärke |
|---|---|---|---|
| Körper | 70 % | 7,6 (5,9–9,5) | 0 |
| Technik | 71 % | 8,0 (6,2–9,9) | 7,1 |
| Zweikampf | 69 % | 7,2 (5,4–9,0) | 5,1 |
| Abschluss | 68 % | 6,5 (4,7–8,3) | 3,4 |
| Tempo | 66 % | 5,8 (4,1–7,6) | 5,0 |
| Torwart | 64 % | 5,2 (3,5–7,0) | 3,4 |
| Passen | 63 % | 4,7 (3,0–6,4) | 7,1 |
| Ausdauer | 55 % | 1,9 (0,3–3,6) | 6,2 |
| Kopfball | 54 % | 1,4 (−0,3–3,0) | 2,3 |

**Folgerung:** Die Stärkezahl gewichtet anders, als die Engine wirkt. Körper fehlt ganz, Ausdauer und Passen zählen zu viel, Abschluss,
Zweikampf und Torwart zu wenig. Das erklärt, warum echte Kader flacher vorhersagen (QUICK 0,03) als der Versuch (0,043–0,06).
Ausdauer hängt an der Spiellänge (gemessen mit der eingestellten, kurzen Spielzeit); bei langen Spielen ist sie neu zu messen.
Nächste Messung: dieselbe Methode je Position (nur Abwehr, nur Mittelfeld, nur Sturm, nur Torwart), daraus neue Gewichte je Position
für die Stärkezahl der neuen Karrieren.

### 11.2 Wirkung je Position (2026-10-30)

Rasenplatz (7er), N = 80 je Zeile, nur ein Wert nur einer Position verschoben, um ±0,30. Wirkung wie in 11.1 in Stärkepunkten der
ganzen Mannschaft (Unsicherheit etwa ±2,3); „zählt“ = Änderung der heutigen Stärkezahl (Schnitt der Startelf).

| Position | Wert | Wirkung | Zählt |
|---|---|---|---|
| Torwart | Torwart | 7,2 | 4,9 |
| Torwart | Technik / Passen / Tempo / Körper | 1,6 / 0,9 / −0,4 / −0,7 | 0,8 / 0,8 / 0,8 / 0 |
| Abwehr | Zweikampf | 5,5 | 5,1 |
| Abwehr | Körper | 5,0 | 0 |
| Abwehr | Technik | 4,1 | 1,7 |
| Abwehr | Tempo / Passen / Ausdauer | 2,5 / 2,3 / 1,1 | 2,4 / 2,4 / 2,4 |
| Abwehr | Kopfball / Abschluss | −0,2 / −0,2 | 2,5 / 0 |
| Mittelfeld | Tempo | 6,7 | 2,4 |
| Mittelfeld | Technik | 6,5 | 6,3 |
| Mittelfeld | Körper | 5,0 | 0 |
| Mittelfeld | Zweikampf / Passen / Ausdauer | 3,6 / 2,7 / 2,0 | 2,5 / 6,3 / 5,0 |
| Mittelfeld | Abschluss / Kopfball | −0,2 / 0,4 | 2,5 / 0 |
| Sturm | Körper | 9,6 | 0 |
| Sturm | Technik | 6,2 | 1,7 |
| Sturm | Abschluss / Passen / Tempo | 4,1 / 3,6 / 3,4 | 2,5 / 0,8 / 1,6 |
| Sturm | Zweikampf / Ausdauer / Kopfball | 1,1 / −0,2 / −1,6 | 0 / 0,8 / 0,8 |

**Auffällig:**
- Körper ist im Spiel einer der stärksten Werte, im Sturm der stärkste – mehr als Technik und Abschluss.
- Kopfball wirkt auf dem 7er-Rasen nicht messbar (wenig Flanken); auf dem Großfeld noch zu messen.
- Ausdauer wirkt kaum (kurze, eingestellte Spielzeit).
- Passen im Mittelfeld zählt in der Stärke viel (6,3), wirkt aber wenig (2,7).

Vorschlag für Gewichte nach Wirkung (auf 0,05 gerundet, Werte im Rauschen weggelassen), nur Rasenplatz:
Torwart: Torwart 0,75, Technik 0,15, Passen 0,10 · Abwehr: Zweikampf 0,25, Körper 0,25, Technik 0,20, Tempo 0,10, Passen 0,10,
Ausdauer 0,05, Kopfball 0,05 (vorläufig, bis zur Messung auf dem Großfeld) · Mittelfeld: Tempo 0,25, Technik 0,25, Körper 0,20, Zweikampf 0,15, Passen 0,10, Ausdauer 0,05 ·
Sturm: Körper 0,35, Technik 0,25, Abschluss 0,15, Passen 0,10, Tempo 0,15.

### 11.3 Engine-Abgleich Körper und Ausdauer (2026-10-30, Nutzerentscheid „erst Engine, dann Zahl“)

**Körper.** Er wirkt über fünf Faktoren (sim/strength.js STRENGTH_FX): Schulterduell, Abschirmen im Stehen, Stochern, Festhalten,
Kopfballduell. Gemessen (Rasenplatz, Körper im Sturm, N = 80, ±0,30; Körper aller Positionen, N = 120, ±0,20):

| Variante | Körper im Sturm | Körper alle | Tests |
|---|---|---|---|
| vorher (duel 0,4) | 9,6 | 7,6 | grün |
| alles halbiert, Mitte gleich | 2,5 | 4,4 | Abschirmen nicht mehr Hauptfaktor (strength.test), 9er-Tore 2,19 → 1,88 je Spiel (80 Spiele) |
| nur Stochern und Festhalten halbiert | 9,1 | 9,4 | grün, aber keine Wirkung |
| **duel 0,3** (eingebaut) | **6,0** | 8,0 | grün |

Das Schulterduell ist der Hebel. Mit 0,3 liegt Körper im Sturm etwa bei der Technik (5,3–6,2); weiter herunter drückt es die Tore auf
dem 9er unter die vom Nutzer festgelegte Marke. Golden ändert sich gewollt.

**Ausdauer.** Am Spielende haben alle Feldspieler etwa 0,2 Restkraft, egal wie hoch ihre Ausdauer ist (6 Spiele je Platz: Ausdauer
unter 0,4 → 0,20–0,24, über 0,6 → 0,22). Ursache: Die KI sprintet, solange die Kraft über 0,25–0,35 liegt (ai.js). Gute Ausdauer heißt
dadurch „öfter sprinten“, nicht „frischer bleiben“. Ein Umbau (z. B. Kräfte einteilen je Restspielzeit) ist ein eigener Schritt;
bis dahin bekommt Ausdauer in der Stärkezahl nur ein kleines Gewicht.

### 11.4 Ausdauer eingemessen (2026-10-30)

**Ziel aus der Forschung:** In den letzten 15 Minuten 35–45 % weniger hochintensives Laufen als in den ersten 15, unabhängig von Spielklasse
und Position; Eingewechselte laufen am Ende 25 % mehr (Mohr, Krustrup & Bangsbo 2003, J Sports Sci 21:519–528,
https://read.qxmd.com/read/12848386). Messung im Spiel: Anteil der Zeit über 5 m/s in den ersten und letzten 15 % der Spielzeit.

| Platz | Abfall vorher | Faktor Kraftverlust | Abfall nachher |
|---|---|---|---|
| Park | 56 % | 0,56 | 33 % |
| Rasenplatz | 84 % | 0,29 | 39 % |
| Sportplatz | 94 % | 0,19 | 44 % |
| Großfeld | 88 % | 0,15 | 38–41 % |
| Halle | – | 0,67 | 43 % |
| Parkplatz, Hinterhof, Ascheplatz | – | 0,61 / 0,67 / 0,41 | auf 40 % eingemessen |

Eingewechselte laufen danach am Ende 3–45 % mehr (vorher teils weniger). Die Kraft fällt nicht mehr im ersten Drittel auf die Sprintschwelle,
sondern sinkt über das Spiel (Rasenplatz: 0,95 → 0,48 statt 0,81 → 0,25).

**Folge 1 – Zielgenauigkeit:** Schützen waren im Schnitt nur noch halb so müde (Großfeld 0,73 → 0,30). Die bisherigen Eichungen der
Torquoten hatten die ständige Erschöpfung stillschweigend eingerechnet. Deshalb wiegt Müdigkeit bei Schuss, Pass, Ballannahme und
Luftlöchern jetzt doppelt (actions.js STAMINA.skill = 2): frisch genauer, müde am Ende so schlecht wie vorher. Torzahlen je Spiel
(40 Spiele je Platz, scripts/engine.mjs, alt → neu): Parkplatz 2,1 → 2,4, Hinterhof 3,3 → 2,8, Park 1,9 → 1,6, Ascheplatz 3,0 → 2,9,
Rasenplatz 2,9 → 3,1, Sportplatz 2,1 → 2,2, Halle 2,3 → 2,4 – im Rauschen gleich. **Großfeld 0,9 → 1,8**, Trefferquote je Schuss
6 % → 12 % (real 10–12 %); mit Gewicht 3 wären es 1,6 und 10 %. Nutzerentscheid 2026-10-30: realistisch lassen (Gewicht 2).

**Folge 2 – Steilheit:** Bei 8 Punkten Unterschied holt der Stärkere jetzt 80 % der Punkte (Rasenplatz, N = 60) statt 74–78 %: das Ziel
aus Abschnitt 3 ist erreicht, ohne die Engine eigens steiler zu machen.

**Folge 3 – Ausdauer als Wert:** wirkt weiter kaum (Rasenplatz 51 %, Sportplatz 55 % bei ±0,20). Fitte Spieler sprinten mehr (wie bei
Mohr et al.: Fitness hängt mit der Menge an schnellen Läufen zusammen), bleiben aber nicht frischer. In der Stärkezahl bekommt Ausdauer
deshalb nur ein kleines Gewicht.

### 11.5 Kopf und Beine: Ergebnisdruck, Kraftschub, Zweite Luft (2026-10-30, vom Nutzer gewünscht)

Neu in sim/mentality.js (alle Werte Spielwerte, keine Quelle für feste Zahlen; dass der Spielstand die Laufarbeit beeinflusst, ist belegt,
Überblick Lago-Peñas 2012):
- **Ergebnisdruck** für den knapp Führenden ab 75 % der Spielzeit (bei zwei Toren halb), nach einem Anschlusstreffer sofort voll und über
  12 % der Spielzeit abklingend. Er verstärkt die Streuung unter Gegnerdruck: Nervöse voll, normale halb, Ruhepole gar nicht (ein Ruhepol
  in der Nähe halbiert es noch einmal).
- **Kraftschub** nach Anschlusstreffer oder Ausgleich in der zweiten Hälfte, in 60 % der Fälle: ein Viertel der verlorenen Kraft zurück,
  zum Spielende bis zum Anderthalbfachen.
- **Zweite Luft** (Profil, etwa jeder Fünfzehnte mit Ausdauer ab 0,45, nie Raucher): einmal je Spiel ab 70 % der Spielzeit, wenn die Kraft
  unter 0,4 liegt, +0,25.

Gemessen (je 80 Spiele Rasenplatz und Sportplatz, alt → neu): Wer bei 75 % der Spielzeit mit einem Tor hinten liegt, holt noch
mindestens einen Punkt in 20 % (11 von 56) → 16 % (10 von 63) der Fälle – im Rauschen, die Wirkung ist mild. Kraftschübe 11–18, Zweite Luft
15–20 je 80 Spiele. Tore unverändert (244 → 247, 190 → 184).

### 11.6 Neue Gewichte, geprüft an echten Kadern (2026-10-30)

**Messung per Regression** (scripts/strength-regression.mjs): In jedem Spiel zufällige Verschiebungen aller Werte je Position (±0,25),
Regression der Tordifferenz; 800 Spiele Rasenplatz, 600 Sportplatz, Unsicherheit ±0,31 bzw. gemittelt ±0,22 Tore je ganzem Wertpunkt.
Deutlich: Torwart 1,4 · Abschluss im Sturm 1,1 · Mittelfeld Tempo 0,84, Körper 0,77, Technik/Zweikampf/Passen je ≈ 0,6 · Abwehr
Körper 0,70, Technik 0,68, Tempo 0,46 · Kopfball auf 7er/9er ≈ 0 · Ausdauer klein. Daraus `RATING_WEIGHTS_V2` (generator.js, noch nicht in
Gebrauch).

**Prüfung an echten Kadern** (scripts/rating-validate.mjs, 400 Pokalspiele, echte Engine):

| Stärkezahl | Steigung je Punkt | Steigung × Streuung | Log-Likelihood |
|---|---|---|---|
| heute | 0,030 | 0,394 | −373,4 |
| neue Gewichte | 0,035 | 0,397 | −370,5 |
| neue Gewichte + Zuschläge (Ex-Profi …) | 0,035 | 0,405 | −370,0 |

**Folgerung:** Die neuen Gewichte sagen nur wenig besser voraus (≈ 3 %). Bei echten Kadern bestimmen Zufall und Spielverlauf den Ausgang
weit mehr als die Gewichtung. Wichtiger für die Ligen: Mit 0,035 je Punkt ergeben 7,7 Punkte Abstand nur ≈ 66 % der Punkte (Poisson, 1,4
Tore je Team); für die realistischen 80 % je Liga braucht es bei echten Kadern ≈ 15 Punkte. Zwölf Ligen passen so nicht auf 1–99, unten
kleinere Abstände (Nutzerentscheid) helfen nur teilweise.

## 12. Umsetzungsplan Stärkemodell (2026-10-31)

Grundlage: Entscheidungen in Abschnitt 10 (Skala über 99, rund 15 Punkte je Liga bei echten Kadern, unten kleinere Abstände, nur
neue Karrieren, Anzeige „Stärke · Niveau“, verdeckte Boni). Die Engine soll so steil bleiben, wie sie ist.

### 12.1 Messung: Die Engine sättigt über 1 (2026-10-31)

`scripts/strength-steepness.mjs` mit `BASE` (Technikwerte beider Teams angehoben) und `CAP` (Obergrenze der Technikwerte, Körperwerte
bleiben ≤ 0,98), Rasenplatz 7 gegen 7, 30 Spiele je Zeile, Unterschied 16 Stärkepunkte:

| BASE | Wirkung je Stärkepunkt (Tore, log) | Punkte für den Stärkeren | Tore je Team bei D = 0 |
|---|---|---|---|
| 0 (heute) | 0,039 | 92 % | 1,68 |
| +0,3 | 0,035 | 78 % | 1,25 |
| +0,6 | 0,029 | 82 % | 1,20 |
| +0,9 | 0,020 | 72 % | 1,28 |

Je höher die Werte, desto weniger bringt ein Punkt: Formeln mit festen Obergrenzen (z. B. Ballkontrolle `clamp(0,45 + 0,5·Technik,
0,2, 0,98)`, actions.js) sind ab Werten um 1 gesättigt. Ohne Umbau hätte ein Profikader mit Technik um 1,5 nur die halbe Wirkung je Punkt.

### 12.2 Schritte

1. **Engine für Werte über 1.** Alle Erfolgsformeln mit Technikwerten (Pass, Annahme, Zweikampf, Abschluss, Kopfball, Torwart) so
   umbauen, dass sie bis 1 genau wie heute rechnen und darüber weiter steigen, statt an eine Grenze zu stoßen – möglichst als
   Vergleich Angreifer gegen Verteidiger statt als feste Wahrscheinlichkeit. Prüfgröße: Wirkung je Punkt bei BASE 0 bis +1,2
   innerhalb von ±15 %, Tore je Team bei D = 0 zwischen 1,2 und 1,7. Golden bleibt unverändert, weil sich unter 1 nichts ändert.
2. **Werte und Skala.** Eine zentrale Obergrenze je Wert statt der verstreuten 0,98: Technikwerte bis etwa 2,5, Tempo, Ausdauer und
   Körper bleiben ≤ 0,98 (die Laufgeschwindigkeit bleibt in echten m/s). Stärke ohne Deckel bei 99. Gilt nur für neue Karrieren
   (Auflage im Spielstand); alte Spielstände rechnen wie bisher.
3. **Ligaziele.** Mittlere Stärke je Stufe als Tabelle (Spielwerte, Abstand unten kleiner, oben rund 15): Vorschlag Freizeitliga 51
   wie heute, dann +6, +7, +9, +11, +13, +14, +15 bis zur Oberliga (≈ 126), Profiligen je +15 (Bundesliga ≈ 186). Vor dem Einbau an
   der Engine messen: Ein Ligaabstand soll ≈ 80 % der Punkte bringen (Abschnitt 7).
4. **Spielerpool und Gegner** nach Ligaziel und Streuung statt fester Klassenmischungen; Klassen (OK bis Ex-Profi) bleiben als
   Etiketten. Profis ohne pauschalen Zuschlag.
5. **Gewichte V2** (11.6) mit der Umstellung einführen: Die Zahlen ändern sich für neue Karrieren ohnehin, und V2 bildet ab, was im
   Spiel wirkt (Körper und Tempo im Mittelfeld, Torwart).
6. **Entwicklung** in Stärkepunkten je Liga: verborgenes Potenzial, Trainingsumfang (teamtraining.js), Spielpraxis, Alterskurve; wer
   über seiner Liga steht, wird bemerkt (Scouting, Abwerben).
7. **Anzeige** „Stärke 54 · Niveau Landesliga“, verdeckte Boni (Weltklasse, Führungsspieler, Star der Liga) als Eigenschaften.
8. **Neu eichen und Prüfgrößen als Tests** (Abschnitt 7): Ligaabstand, Tabellenspreizung, Pokal, Entwicklung, Torquote.

Jeder Schritt endet mit Messung, Gesamtprüfung und Commit; Schritt 1 ist ohne sichtbare Änderung im heutigen Spiel.

### 12.3 Schritt 1, erster Stand: Engine für Werte über 1 (2026-10-31, Nutzerentscheid Weg A)

`src/sim/skill.js`: Jede Formel rechnet bis 1 wie bisher (Golden unverändert); darüber Zweikämpfe als Unterschied beider Spieler
(`contest`, `tilt` Torwart gegen Schütze), Fehler schrumpfen auf 25 % zu (`errScale`, Abstand 0,3), Fähigkeiten ohne Gegenspieler
weich (`soft`). Rund 35 Formeln in actions, ai, combos, fouls, shootout, tackles, tricks. Gefunden und behoben: fit.js schnitt vor
jedem Spiel alle Werte bei 0,98 ab; zwei Dribbel-Formeln wurden über 1 negativ; der Torwart fing über 1 fast fünfmal so oft.

Messung (Rasenplatz, 120 Spiele je Zeile, 16 Punkte Unterschied, nur Technikwerte angehoben):

| BASE | Wirkung je Punkt | Punkte für den Stärkeren | Tore je Team |
|---|---|---|---|
| 0 | 0,047 | 91 % | 1,61 |
| +0,3 | 0,042 | 84 % | 1,62 |
| +0,6 | 0,032 | 81 % | 1,46 |
| +0,9 | 0,021 | 70 % | 1,57 |
| +1,2 | 0,025 | 75 % | 1,50 |
| +1,5 | 0,014 | 64 % | 1,47 |

Tore stabil; die Wirkung je Punkt sinkt noch (Ziel ±15 % nicht erreicht), ein Teil schon unter 1. Nächster Schritt: je Formel messen,
was oben noch sättigt; sonst oben größere Ligaabstände (Entscheidung beim Nutzer).

### 12.4 Fehler gegen den Gegner (2026-10-31, Nutzerentscheid)

Gemessen je Wert (BASE 0 gegen +1,2, 80 Spiele): Technik, Passen und Zweikampf wirkten oben fast nicht mehr (0,048 → 0,004 je Punkt),
weil ihre Formeln Fehler rechnen, die bei zwei sehr guten Teams für beide gegen null gehen; Abschluss und Torwart wirkten weiter.
Nutzerentscheid: Fehler gegen den Gegner rechnen. `vs()` (sim/skill.js): eigener Wert minus 0,8 × (Niveau der gegnerischen Mannschaft
im passenden Wert − Schnitt heutiger Hobbyteams; Zweikampf 0,42, Technik 0,45, Kopfball 0,44). Passen, Annahme, Abschluss gegen
Zweikampf; Grätschen und Fouls gegen Technik; Kopfball gegen Kopfball. Torwart gegen Schütze mit Skalenabgleich (Torhüter 0,61,
Stürmer 0,50). Das ändert das heutige Spiel gewollt (Golden neu).

| BASE | Wirkung je Punkt | Punkte für den Stärkeren (16 Punkte) | Tore je Team |
|---|---|---|---|
| 0 | 0,053 | 91 % | 1,59 |
| +0,3 | 0,046 | 88 % | 1,27 |
| +0,6 | 0,039 | 84 % | 1,22 |
| +0,9 | 0,041 | 80 % | 1,47 |
| +1,2 | 0,032 | 77 % | 1,52 |
| +1,5 | 0,031 | 78 % | 1,50 |

Folgen: Großfeld 15 % mehr Tore, Kopfballtore gleich (Kette unverändert) – Kopfball-Platzierung 1,6 → 2,0 m. Paraden-Test misst nur
noch den Flug der Parade (Nutzer bestätigt). Rest-Abfall der Wirkung je Punkt (≈ 40 %) über die Ligaabstände ausgleichen (Schritt 3).

### 12.5 Niveau je Spieler (2026-10-31, Nutzerentscheid)

Gemessen (`defStrength`-Probekader, 12 je Verein): Ø Stärke je Klasse OK 40,1 · Gut 51,3 · Stark 62,0 · Dorfstar 71,7 · Superstar 79,9 ·
Ex-Profi 87,0; je Liga heute 51,5 · 57,2 · 58,9 · 62,5 · 68,8 · 71,2 · 71,6 · 73,8. Die Ligen 5–8 mischen fast dieselben Klassen; mit
Aufschlägen je Klasse allein kommen sie nicht auf ~15 Punkte Abstand.

**Entscheidung:** Jeder Spieler im Pool hat zusätzlich zur Klasse ein festes **Niveau** 1–8 (Freizeitliga bis Oberliga). Im neuen
Modell steigen seine Technikwerte so, dass seine Stärke um den Aufschlag seines Niveaus wächst (Tempo, Ausdauer, Körper bleiben):

| Niveau | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Ziel Ligamittel (beste n) | 51 | 57 | 64 | 73 | 84 | 97 | 111 | 126 |
| Aufschlag (Punkte) | 0 | 5,5 | 12,5 | 21,5 | 32,5 | 45,5 | 59,5 | 74,5 |
| Anteil im Pool (Spielwert) | 30 % | 22 % | 16 % | 12 % | 8 % | 6 % | 4 % | 2 % |

Vereine, Gerüchte und Transfermarkt einer Liga ziehen Spieler ihres Niveaus (Klassenmischung wie heute in der Freizeitliga, damit
die Etiketten OK bis Ex-Profi erhalten bleiben). Ziele und Anteile sind Spielwerte (unten kleinere Abstände nach Nutzerentscheid);
an der Engine zu prüfen: ein Ligaabstand ≈ 80 % der Punkte oben, unten weniger.

Durchgänge: (1) Niveau im Pool und Aufschlag, noch ohne Wirkung; (2) Vereinskader und Pyramide; (3) Gerüchte, Transfermarkt,
Probetraining, Bolzplatz; (4) Pokal und Profis neu eichen, dann für neue Karrieren einschalten (Kennung strength: 3).

Durchgang 1 (src/sim/niveau.js, noch ohne Wirkung im Spiel), an der Engine geprüft: Mannschaften aus Spielern eines Niveaus
(je Rolle der beste aus 40 Zufallsspielern), Sportplatz 9 gegen 9, 60 Spiele je Zeile:

| Begegnung | Stärke Startelf | Punkte für den Höheren | Tore |
|---|---|---|---|
| 1 gegen 1 (Kontrolle, 40 Spiele) | 61,8 / 61,1 | 46 % | 1,3 : 1,1 |
| 1 gegen 2 | 67,0 / 61,1 | 66 % | 1,6 : 0,9 |
| 4 gegen 5 | 93,8 / 83,8 | 78 % | 1,8 : 0,7 |
| 7 gegen 8 | 135,3 / 120,2 | 81 % | 2,3 : 0,9 |

Oben ≈ 80 % je Ligaabstand wie in Abschnitt 7 gefordert, unten kleinere Abstände (Nutzerentscheid).

Durchgang 2 (career.js squadPicker mit Liga-Stufe, clubNiveaus, playerOf, pyramid.js defStrength; an strength: 3 gebunden, noch
nicht eingeschaltet). Gemessen (6 Kaderziehungen je Verein, beste n): Liga 1–8 Ø 54,2 · 61,8 · 68,1 · 76,7 · 87,2 · 99,8 · 113,1 ·
128,9 (2–5 Punkte über dem Ziel, Abstände stimmen). Spanne der Vereine innerhalb einer Liga oben zu klein (Verbandsliga 111–114,
Oberliga 128–130) – in Durchgang 4 einstellen, zusammen mit dem Schnellmodell (pokal.js QUICK) für das neue Modell.
