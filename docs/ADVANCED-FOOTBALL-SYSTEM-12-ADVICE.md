# Advanced Football System – Phase 12: Manager-Beratung

Stand: 2026-11-26. Grundlage: `docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md` Abschnitt 4.8 und 11.2 (Entscheidung E8),
Kern aus Phase 7 (`docs/ADVANCED-FOOTBALL-SYSTEM-07-CORE.md`). Code: `src/intel/advice.js`, Anzeige
`src/ui/clubhouse/home.js` (`adviceCard`, Zeile im Gegner-Check), Einstellung `src/ui/prefs.js adviceMode` und
`src/ui/Settings.js`. Messung: `scripts/afs-advice.mjs`. Tests: `tests/afsAdvice.test.js`.

## 1. Was der Mensch sieht

| Wo | Was | Wann |
|---|---|---|
| Startseite, unter dem nächsten Spiel | „Co-Trainer“: Befund des eigenen Vereins mit Beleg (Wert, Liga-Schnitt, Spiele), mögliche Nebenwirkung, **ein** Button „Übernehmen: …“ | höchstens einmal je Woche (selten: je zwei Wochen), ab 5 eigenen Spielen der Saison |
| ebenda | „Nachgefasst“: Wert vor dem Übernehmen und in den Spielen seither, „hat geholfen / noch nicht“ | einmal, drei eigene Spiele nach dem Übernehmen |
| Gegner-Check | „Auffällig“: stärkster Befund des Gegners mit Beleg, ohne Button | wenn der Gegner einen Befund hat (ab 5 Spielen) |

Der Button setzt den Befehl in den Spielplan (`career.js setClubPlan`), wie das Gegenmittel im Gegner-Check.

## 2. Regeln

- **Quelle:** dieselben Befunde und dieselbe Rangfolge wie für die CPU (`core.js diagnose`, `rank`). Die Beratung erfindet nichts
  dazu: Sie zeigt nur Vorschläge mit gemessener Wirkung.
- **Kein Stilwechsel:** `style:mauern` und `style:offensiv` schlägt die Beratung nicht vor. Der Stil bleibt die Grundentscheidung
  des Menschen (Nutzerentscheidung 2026-11-26, nachdem Mauern in Phase 7 meist erster Vorschlag war). Damit bleiben
  `build:direkt` (gegen wenig überspielte Gegner) und `route:mitte` (gegen niedrige Passquote). Für Feldvorteil und beide
  xG-Befunde gibt es keinen Hinweis, weil es keine gemessene Handlung ohne Stilwechsel gibt.
- **Drosselung** (Spielwerte aus 11.2, nach Messläufen prüfen): ab 5 Spielen; höchstens ein Hinweis je Woche, „selten“ je zwei
  Wochen; derselbe Befund frühestens nach 4 Wochen wieder; ein schon aktiver Befehl wird nicht vorgeschlagen.
- **Eine Woche, ein Hinweis:** Der Hinweis wird beim ersten Anzeigen der Woche bestimmt und gemerkt (`career.advice`), damit er
  sich beim Neuzeichnen nicht ändert.
- **Nachfassen** wie `coachfeed.js checkFollowUps`: Nach 3 eigenen Spielen wird der Wert aus den Spielen **seit** dem Übernehmen
  (Differenz der Saisonsummen) mit dem Wert beim Hinweis verglichen. Besser in der guten Richtung → „hat geholfen“, sonst „noch
  nicht“. Der Text sagt dazu, dass nach so wenigen Spielen Zufall drinstecken kann (Streuung je Spiel siehe Phase 3).
- **Gegner:** Gegen Werte des Gegners hat Phase 7 keine Wirkung eines Befehls gemessen, deshalb nur der Befund. Das Gegenmittel gegen
  die Trainer-Handschrift (`patterns.js`) bleibt wie bisher.
- **Schalter:** Einstellungen → Spiel → „Co-Trainer-Hinweise: An / Selten / Aus“ (gespeichert im Browser wie die Trainer-Ansicht).
  „Aus“ liest und schreibt nichts.
- **Speicher:** `career.advice` hält die Woche, den zuletzt gezeigten Hinweis je Befund und höchstens ein Nachfassen mit einer Kopie
  der Vereinszeile (unter 1 KB).

## 3. Messung in echten Saisons

`node scripts/afs-advice.mjs 8 11 23 37 41 59 73`: je Seed eine Saison mit 8 Vereinen (15 Wochen), Spiellänge wie im Spiel, in vier
Läufen. „immer übernommen“ heißt: Jeder Hinweis wurde sofort übernommen.

| Seed | Hinweise (an, nie übernommen) | Hinweise (an, immer übernommen) | Nachfassen | Wochen mit Gegner-Befund | Tabelle „an, nie übernommen“ = „aus“ |
|---|---|---|---|---|---|
| 11 | 1 | 1 | – (zu spät in der Saison) | 8 | ja |
| 23 | 2 | 1 | geholfen | 5 | ja |
| 37 | 2 | 1 | noch nicht | 6 | ja |
| 41 | 3 | 1 | geholfen | 5 | ja |
| 59 | 3 | 2 | geholfen | 5 | ja |
| 73 | 3 | 1 | geholfen | 5 | ja |

- Alle Hinweise: „wenig überspielte Gegner → Direkt spielen“. Wer übernimmt, bekommt danach kaum noch Hinweise, weil der Befehl aktiv
  ist und kein anderer Befund eine Handlung ohne Stilwechsel hat. „selten“ ergab in diesen Läufen dieselben Hinweise wie „an“.
- Zusätzlich mit 6 Vereinen (10 Spieltage, Seeds 11 und 23): 1 Hinweis in 2 Saisons. Mit Mindestwert 5 Spiele bleiben nur 5 Wochen.
- Ohne Übernehmen ändert die Beratung das Spiel nicht (gleiche Tabelle in allen 8 Saisons). Mit Übernehmen ändern sich Ergebnisse
  (Seed 11, 6 Vereine: eigener Verein 9 → 10 Punkte).
- Rechenzeit je Woche (Hinweis, Nachfassen, Gegner): 0,07–0,29 ms.

## 4. Grenzen

- Die Beratung ist selten: Nur ein Befund hat in der Praxis eine Handlung. Mehr Hinweise bräuchten weitere gemessene Wirkungen
  (z. B. für xG) oder Stilvorschläge. Beides ist bewusst nicht drin.
- „Hat geholfen“ beruht auf 3 Spielen; ein Spiel streut stark (Phase 3). Das ist ein Hinweis und kein Beweis. Der Text sagt das.
- Heimplätze verzerren überspielte Gegner (Phase 7, Abschnitt 6). Ein Hinweis kann teilweise vom eigenen Platz kommen.
- Kader-, Saison- und Transferhinweise aus 4.8 brauchen Spielerbefunde. Die gibt es nicht (Phase 7, Abschnitt 2).
