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
