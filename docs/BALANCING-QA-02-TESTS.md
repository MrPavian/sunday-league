# Balancing & Simulation QA – 2. MATCH ENGINE TEST REPORT (Schritt A1)

Stand 2026-11-27, Code-Stand `b43888d` (main). Abschnitt A: **nur gemessen, nichts geändert.**
Phase 2 (Match Engine) und der Tabellen-Teil von Phase 5 (Langzeit) des Auftrags. Attribute, Taktik, Extremfälle, Wirtschaft und
Diagramme folgen in eigenen Schritten (Abschnitt 8).

## 1. Methode

- **Werkzeug:** `scripts/qa-league.mjs` spielt Karrieren wie im Spiel (`createCareer`, `prepareMatch` mit voller Engine für jedes
  Spiel der eigenen Liga, `finishRound`, `nextSeason`) und schreibt je Spiel eine JSON-Zeile; `scripts/qa-report.mjs` wertet aus.
  Schüsse, Torschüsse und xG aus `sim/chances.js` feedChances (nur gelesen), Pässe und Zweikämpfe aus `sim/analytics.js`,
  Fouls, Karten, Ecken, Ballbesitz aus `sim/stats.js`.
- **Bedingungen:** Ligagröße 8 (14 Spieltage), Spiellänge Standard des Platzes, Schwierigkeit normal. Der Verein des Menschen
  spielt **ohne Eingriffe** (keine Aufstellung, Befehle, Training, Transfers) – wie ein CPU-Verein. Messspiele (Phase 5b) aus.
- **Feste Seeds:** 11, 23, 37, 41.
- **Läufe** (alle tatsächlich durchgeführt):

| Lauf | Start | Seeds × Saisons | Spiele | Saisontabellen | Rechenzeit (Summe) |
|---|---|---|---|---|---|
| Basis | Liga 1 | 4 × 25 | 6 000 | 100 | 47,9 min |
| Feste Ligen | Liga 3, 4, 5, 8 | 16 × 5 | 4 800 | 80 | 109 min |
| Direktstart | Liga 6, 7, 10 | 12 × 4 | 2 880 | 48 | – |
| **Summe** | | **4 + 28 Karrieren** | **13 680** | **228** | |

  Ohne Eingriffe bleibt die Karriere in Liga 1–2 (94 von 100 Saisons in Liga 1); höhere Ligen deshalb mit `--start=L`
  (Ablauf wie `scripts/balance-audit.mjs` liftTo). **Messartefakt:** liftTo gibt dem getauschten CPU-Verein den schwachen
  Startkader des Menschen (Stärke ≈ 47 statt ≈ 88). Die erste gemessene Saison dieser Läufe ist deshalb **nicht ausgewertet**
  (3 840 + 2 160 Spiele bleiben). Start in Liga 11 scheiterte (die Karriere landet in Liga 10; Ursache nicht geprüft). Nach Start 10 steigt der Verein
  ohne Eingriffe in allen 4 Seeds jede Saison ab (Platz 7, 8, 8, 8), Liga 10 fällt mit der ersten Saison aus der Auswertung.
  **Profiligen 10–12 sind damit ungemessen.**
- **Stärke** = Schnitt der besten n Spielerwerte `rating` des Kaders (n = Spieler auf dem Platz), wie `career/pokal.js` strength.

## 2. Vergleichswerte echter Ligen

Rohdaten von football-data.co.uk (`mmz4281/<Saison>/<Liga>.csv`, abgerufen 2026-11-27), Saisons 2022/23 – 2024/25, **selbst
nachgerechnet**. Profi- und Halbprofi-Ligen; für deutsche Amateurligen gibt es keine Rohdaten dieser Art (Einzelangaben aus der
Presse: höchste Liga der Uckermark 5,28 Tore je Spiel, Nordkurier; NOFV-Oberliga Nord rund 3,5, Tagesspiegel – nur Orientierung).

| Kennzahl | Bundesliga | 2. Bundesliga | Premier League | League Two (4. Liga ENG) | National League (5. Liga ENG) |
|---|---|---|---|---|---|
| Spiele | 918 | 918 | 1 140 | 1 656 | 1 656 |
| Tore Ø (Heim / Gast) | 3,18 (1,76 / 1,41) | 3,02 (1,66 / 1,36) | 3,02 (1,65 / 1,37) | 2,61 (1,43 / 1,18) | 2,81 (1,55 / 1,25) |
| Sieg H / U / A % | 43 / 25 / 31 | 44 / 25 / 31 | 45 / 23 / 32 | 43 / 27 / 30 | 43 / 27 / 31 |
| 0:0 · 1:0 · 1:1 · 2:1 · 3:2 % | 5,4 · 11,0 · 11,4 · 13,3 · 6,0 | 5,4 · 14,3 · 10,5 · 17,3 · 5,4 | 4,4 · 14,6 · 10,6 · 15,1 · 4,5 | 7,8 · 19,2 · 13,0 · 16,1 · 4,2 | 5,9 · 16,3 · 13,7 · 15,6 · 5,0 |
| ≥ 5 Tore % · Differenz ≥ 4 % | 21,4 · 9,0 | 17,8 · 6,3 | 18,3 · 7,2 | 12,9 · 3,5 | 15,3 · 5,2 |
| Schüsse · aufs Tor · Tore je Schuss | 26,1 · 9,6 · 0,122 | 26,9 · 9,5 · 0,112 | 26,3 · 9,3 · 0,115 | 23,8 · 8,0 · 0,110 | – |
| Fouls · Gelb · Rot | 22,5 · 4,05 · 0,17 | 23,5 · 4,48 · 0,20 | 21,9 · 3,94 · 0,12 | 22,4 · 3,76 · 0,15 | – · 3,63 · 0,16 |
| Tore 2. Halbzeit % | 53,1 | 55,6 | 55,4 | 54,6 | 56,0 |
| Halbzeitführung S / U / N % | 74 / 17 / 9 | 69 / 20 / 10 | 72 / 17 / 10 | 74 / 18 / 8 | 70 / 21 / 10 |
| Punkte je Spiel: Streuung · Meister · Letzter | 0,46 · 2,38 · 0,70 | 0,33 · 1,93 · 0,79 | 0,49 · 2,32 · 0,46 | 0,28 · 1,93 · 0,84 | 0,36 · 2,25 · 0,58 |
| Vorhersagbarkeit: r (Wettquoten-Erwartung, Tordifferenz) | 0,47 | 0,30 | 0,47 | 0,25 | 0,35 |
| Klare Favoriten (Quoten-Abstand ≥ 0,4) S / U / N % | 68 / 20 / 12 | 72 / 13 / 15 | 71 / 18 / 11 | 58 / 28 / 14 | 72 / 18 / 10 |

Vorbehalte: Fouls im Spiel bewusst auf halber Echtquote (`sim/fouls.js`, Zeitraffer), Kleinfeld-Formate (4er bis 9er) haben
kein echtes Gegenstück. Wettquoten sind die beste verfügbare Vorhersage; die Stärke im Spiel ist ein gröberes Maß – ein
etwas kleineres r im Spiel ist daher zu erwarten.

## 3. Ergebnisse je Spielformat

4er und 5er aus dem Basislauf (Liga 1–2), 7er bis 11er aus „Feste Ligen“ (ohne erste Saison).

| Kennzahl | 4er | 5er | 7er | 9er | 11er |
|---|---|---|---|---|---|
| Spiele | 1163 | 4477 | 1080 | 1260 | 1500 |
| Tore Ø | 2,95 | 2,59 | 2,52 | 1,75 | 1,40 |
| Heim / Gast | 1,47 / 1,47 | 1,30 / 1,29 | 1,28 / 1,24 | 0,89 / 0,87 | 0,71 / 0,69 |
| Sieg H / U / A % | 38 / 25 / 37 | 38 / 24 / 38 | 37 / 25 / 37 | 34 / 33 / 33 | 31 / 39 / 30 |
| 0:0 % | 6,1 | 8,2 | 9,2 | 18,7 | 27,6 |
| 1:0 % | 14,8 | 20,1 | 18,3 | 28,9 | 32,1 |
| 1:1 % | 10,9 | 10,8 | 11,1 | 12,2 | 10,0 |
| 2:1 % | 16,1 | 14,5 | 14,2 | 8,6 | 7,3 |
| 3:2 % | 5,4 | 4,2 | 3,7 | 0,8 | 0,5 |
| ≥ 5 Tore % | 17,5 | 13,2 | 11,5 | 3,8 | 1,9 |
| Differenz ≥ 4 % | 5,7 | 4,7 | 5,5 | 3,3 | 2,0 |
| Schüsse | 37,7 | 23,3 | 26,2 | 21,1 | 11,9 |
| aufs Tor (gehalten oder Tor) | 8,7 | 6,3 | 7,1 | 6,4 | 4,3 |
| Tore je Schuss | 0,078 | 0,111 | 0,096 | 0,083 | 0,118 |
| Kopfball-Abschlüsse | 0,3 | 0,3 | 0,8 | 1,2 | 0,6 |
| Tore je xG | 1,00 | 0,87 | 0,76 | 0,70 | 0,80 |
| Pässe / angekommen % | 58 / 62 | 76 / 63 | 113 / 62 | 110 / 62 | 108 / 57 |
| Ballbesitz-Streuung (SD, %-Punkte) | 5,9 | 5,2 | 4,3 | 3,8 | 3,5 |
| Fouls | 2,7 | 3,1 | 6,2 | 6,6 | 6,0 |
| Gelb · Rot | 0 · 0 | 0 · 0 | 1,50 · 0,24 | 1,72 · 0,34 | 1,54 · 0,26 |
| Ecken | 0,0 | 0,3 | 2,9 | 2,1 | 1,9 |
| Tore 2. Halbzeit % | 46,0 | 46,7 | 45,6 | 46,2 | 45,5 |
| Halbzeitführung S / U / N % | 78 / 15 / 6 | 80 / 15 / 5 | 81 / 14 / 5 | 83 / 15 / 2 | 83 / 13 / 4 |
| r (Stärkeabstand, Tordifferenz) | 0,27 | 0,28 | 0,35 | 0,37 | 0,06 |
| Favorit ≥ 10 Stärkepunkte S / U / N % | 56 / 21 / 23 | 60 / 21 / 19 | 59 / 24 / 17 | 56 / 29 / 16 | 36 / 39 / 26 |

Weitere Werte (Basislauf, alle Formate): Torminuten je 15 Minuten 19,6 / 17,9 / 16,1 / 14,9 / 15,4 / 16,1 %; wer zuerst trifft,
gewinnt 70,5 %; Elfmeter 0,1 je Spiel, verwandelt 54,5 %; Mannschaft mit einer roten Karte (7er, n = 56) S / U / N 30 / 23 / 46 %.

### 3.1 Großfeld je Liga (Direktstart, ohne erste Saison)

| Liga | Spiele | Tore Ø | 0:0 % | Remis % | r (Stärke, Tordifferenz) | Favorit ≥ 10 S / U / N % | r (Stärke, Tabellenrang) |
|---|---|---|---|---|---|---|---|
| 5 Bezirksliga | 660 | 1,12 | 33,3 | 40,2 | 0,10 | 35 / 42 / 23 | 0,19 |
| 6 Landesliga | 540 | 1,39 | 24,3 | 33,1 | 0,10 | 36 / 36 / 28 | 0,29 |
| 7 Verbandsliga | 420 | 1,88 | 16,7 | 26,0 | −0,03 | 38 / 28 / 34 | 0,04 |
| 8 Oberliga | 240 | 1,88 | 14,6 | 28,3 | −0,26 | 27 / 30 / 43 | −0,31 |
| 9 Regionalliga | 240 | 1,90 | 15,0 | 27,9 | −0,29 | 23 / 23 / 53 | −0,28 |

Die Läufe „Feste Ligen“ (anderer Startweg, Liga 5–7) zeigen dasselbe: r 0,17 / −0,03 / 0,03.

## 4. Tabellen (Phase 5, Teil 1)

| | Saisons | Punkte je Spiel: Streuung · Meister · Letzter | Abstand 1.–2. | r (Stärke, Rang) | Meister = stärkster Kader |
|---|---|---|---|---|---|
| Basis, Liga 1–2 | 100 | 0,42 · 2,01 · 0,68 | 0,23 | 0,45 | 18 % (Rang 2: 33 %) |
| Feste Ligen 2–4 (7er, 9er) | 39 | 0,43 … 0,46 · 2,0 · 0,56 … 0,75 | – | 0,50 … 0,64 | 24 … 50 % |
| Großfeld 5–9 | 35 | 0,41 … 0,58 · 1,95 … 2,25 · 0,30 … 0,74 | – | −0,31 … 0,29 | 0 … 44 % |

Streuung, Meister- und Schlusswerte liegen im Bereich echter Ligen (Abschnitt 2). Auf dem Großfeld entsteht diese Streuung
aber nicht aus der Kaderstärke.

## 5. Bewertung (Testergebnis, nicht Ursache)

- **Kleinfeld (4er–7er):** Torzahl, Ergebnisverteilung, Tore je Schuss und Vorhersagbarkeit (r 0,27–0,35) liegen im Bereich
  echter Ligen. Abweichungen: kein Heimvorteil, weniger Tore nach der Pause, Führungen zu sicher.
- **9er:** wenige Tore (1,75), 0:0 in 18,7 %, Remis 33 %.
- **Großfeld:** sehr wenige Tore (1,12–1,90), 0:0 bis 33 %, und **die Kaderstärke entscheidet fast nichts** – in Liga 8 und 9
  gewinnt der nominell Schwächere sogar häufiger. Das ist der schwerste Befund dieses Schritts.
- Ursachen sind hier **nicht** belegt; Hypothesen und Prüfungen stehen in der Problemliste (`docs/BALANCING-QA-03-ISSUES.md`).

## 6. Nicht gemessen in diesem Schritt

Profiligen 10–12; Pokal und Poisson-Ligen; Spielertypen und Werte (Phase 3); Systeme und Stile (Phase 4); Extremfälle (Phase 6);
Wirtschaft und Entwicklung (Phase 7); Diagramme (Phase 8); 500 Saisons. Verletzungen und Sperren nicht ausgewertet.

## 7. Nachvollziehen

```
node scripts/qa-league.mjs out-11.jsonl 25 8 11            # Basis, je Seed
node scripts/qa-league.mjs lv5-11.jsonl 5 8 11 --start=5   # feste Liga
node scripts/qa-report.mjs out-*.jsonl [--by=fmt|lv|pitch] [--json=out.json]
```
