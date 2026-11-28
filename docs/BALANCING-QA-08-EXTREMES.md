# Balancing & Simulation QA – 8. Extrem- und Grenzfälle (Phase 6)

Stand 2026-11-28, Code-Stand `36f64aa`. Abschnitt A: nur gemessen, **nichts am Spielcode geändert**. Skript `scripts/qa-extreme.mjs`
(neu). Auftrag: „Ein extremer Spielervorteil darf nicht zu völlig unrealistischen Ergebnissen führen. Gleichzeitig müssen deutliche
Qualitätsunterschiede spürbar bleiben.“

## 1. Messung

- Grundkader wie Bericht 04 Abschnitt 6 (angehoben auf ein Niveau). Testmannschaft = Grundkader mit einer Veränderung, Gegner =
  unveränderter Grundkader. Gleicher Kader und Seed in allen Fällen, Seiten im Wechsel, KI-Trainer an (wie im Spiel).
- Die Größe der Veränderungen sind **Versuchswerte** (gewählt): ±0,3 auf alle Werte; drei Niveaus höher (`sim/niveau.js` lifted);
  Tempo bzw. Kopfball und Körper aller Feldspieler auf mindestens 0,95; Technik aller Feldspieler +0,3; bestes Drittel der
  Feldspieler −0,2 auf alle Werte (Ersatzleute für Verletzte); Platzverweis eines Mittelfeldspielers (`sim/referee.js` sendOff) beim
  Anpfiff bzw. zur Halbzeit; Startausdauer 60 % (`fitness` 0,6, wie `career/career.js` sie setzt); Alter 19 gegen 33 bei gleichen
  Werten; sehr defensiv = Stil Mauern + Pressing tief + kompakt; maximal offensiv = Stil Offensiv + Pressing hoch + Aufrücken +
  Angriffsweg Tiefe.
- 14 Fälle × 160 Kader × 2 Seiten je Platz: Ascheplatz 5er Niveau 1 und Großfeld Niveau 5. **Durchgeführt: 8 960 Spiele.**
- Echte Vergleichswerte (football-data.co.uk, D1/D2/E0/E3/EC 2022/23–2024/25, 6 286 Spiele, selbst nachgerechnet): Favorit mit
  Quote unter 1,25 (n = 172): S / U / N 83 / 13 / 3 %, Tordifferenz +2,19, Abstand ≥ 4 Tore 20 %, höchstens 9 Tore einer Mannschaft;
  Quote 1,25–1,5 (n = 598): 71 / 19 / 10 %, +1,42. Mannschaft mit einer roten Karte, Zeitpunkt unbekannt (n = 850): 19 / 24 / 57 %,
  −0,87.

## 2. Ergebnisse (Sicht der Testmannschaft, Tordifferenz ± Standardfehler)

| Fall | 5er: Tordiff. | S / U / N % | Abstand ≥ 4 | Großfeld: Tordiff. | S / U / N % | Abstand ≥ 4 |
|---|---|---|---|---|---|---|
| gleich stark | 0 | 39 / 23 / 39 | 5,6 % | 0 | 33 / 33 / 33 | 1,3 % |
| alle Werte +0,3 | +3,17 ± 0,11 | 91 / 7 / 3 | 44 % | +1,69 ± 0,08 | 79 / 17 / 4 | 10 % |
| alle Werte −0,3 | −3,38 ± 0,11 | 1 / 6 / 93 | 48 % | −1,63 ± 0,08 | 4 / 21 / 75 | 13 % |
| drei Niveaus höher | +2,50 ± 0,10 | 88 / 8 / 4 | 26 % | +2,19 ± 0,09 | 85 / 13 / 3 | 19 % |
| alle schnell (Tempo ≥ 0,95) | +0,42 ± 0,11 | 48 / 22 / 30 | 10 % | **+0,65 ± 0,07** | 51 / 33 / 16 | 2,5 % |
| alle Technik +0,3 | +0,25 ± 0,10 | 43 / 22 / 35 | 4 % | **+0,04 ± 0,07** | 35 / 34 / 32 | 0,9 % |
| alle kopfballstark (Kopfball, Körper ≥ 0,95) | +0,48 ± 0,10 | 50 / 21 / 29 | 7 % | +0,14 ± 0,08 | 38 / 32 / 30 | 1,9 % |
| sehr defensiv | +0,54 ± 0,10 | 48 / 23 / 29 | 7 % | −0,06 ± 0,07 | 31 / 35 / 34 | 0,9 % |
| maximal offensiv | +0,13 ± 0,11 | 45 / 19 / 36 | 6 % | +0,17 ± 0,08 | 37 / 32 / 31 | 1,9 % |
| Stammspieler verletzt | −0,70 ± 0,09 | 23 / 24 / 53 | 5 % | −0,44 ± 0,07 | 22 / 31 / 48 | 1,3 % |
| ein Spieler weniger ab Anpfiff | −0,97 ± 0,10 | 21 / 21 / 58 | 10 % | **−0,10 ± 0,08** | 32 / 32 / 36 | 1,3 % |
| ein Spieler weniger ab Halbzeit | −0,36 ± 0,10 | 32 / 22 / 47 | 6 % | **+0,02 ± 0,07** | 33 / 35 / 32 | 0,6 % |
| Fitness 60 % | −0,34 ± 0,09 | 31 / 23 / 46 | 4 % | −0,51 ± 0,07 | 20 / 31 / 49 | 0,9 % |
| jung (19) gegen alt (33) | −0,06 ± 0,10 | 40 / 20 / 41 | 5 % | +0,05 ± 0,07 | 35 / 33 / 32 | 1,3 % |

Höchstwerte: 5er bis 11 Tore einer Mannschaft, bis 12 Tore im Spiel (alle Werte ±0,3); Großfeld bis 7 bzw. 8 Tore. Häufigstes Ergebnis
bei „drei Niveaus höher“: Großfeld 2:0 (21 %), 3:0 (19 %); 5er 2:0, 3:1, 3:0, 4:0 (je 11–12 %).

## 3. Bewertung

| Prüfpunkt | Befund |
|---|---|
| Deutliche Qualitätsunterschiede spürbar? | **Ja.** Großfeld „drei Niveaus höher“ 85 / 13 / 3 %, +2,19, Abstand ≥ 4 in 19 % – fast genau wie echte Favoriten mit Quote unter 1,25 (83 / 13 / 3 %, +2,19, 20 %). |
| Extreme Vorteile → unrealistische Ergebnisse? | **Nein.** Großfeld höchstens 7 Tore einer Mannschaft (echt bis 9). Im 5er sind 44–48 % Kantersiege bei ±0,3 viel, aber für Kleinfeld mit 3,9 Toren je Spiel ohne echten Vergleich (kein Großfeld-Gegenstück). |
| Gleich starke Mannschaften | Großfeld 33 % Remis, 0:0 in 21 % – zu viele (echt 25–27 % Remis, 0:0 4–8 %; bekannt als I2). |
| Elf schnelle Spieler | Großfeld +0,65 – größte Einzelwirkung unter den Typen, aber kein Übergewicht ins Absurde (51 % Siege). |
| Elf Techniker | **Großfeld ohne Wirkung** (+0,04 ± 0,07), 5er +0,25. Neu I18. |
| Kopfballstark | Großfeld +0,14, im Rauschen (vgl. I14). |
| Sehr defensiv / maximal offensiv | Kleinfeld: defensiv +0,54 (vgl. I16), Großfeld beide nahe 0. |
| Viele Verletzte | −0,44 (Großfeld) / −0,70 (5er): spürbar, plausibel. |
| Ein Spieler weniger | 5er ab Anpfiff −0,97 – plausibel. **Großfeld ohne messbare Wirkung** (−0,10 ab Anpfiff, +0,02 ab Halbzeit); echte Mannschaften mit Rot: 19 / 24 / 57 %, −0,87. Geprüft: Der Platzverweis nimmt den Spieler wirklich vom Feld (10 gegen 11 bis Spielende, Einzelprobe). Neu I17. |
| Geringere Fitness | −0,34 / −0,51: spürbar. |
| Jung gegen erfahren | Keine Wirkung. **[Code]** Alter wirkt im Spiel nur über die Verletzungsgefahr ab 33 (`sim/knocks.js`, `sim/tricks.js`) und die Profile „nervös“ (unter 23 und Technik unter 0,4) und „Ruhepol“ (ab 32 und Technik ab 0,6, `sim/profiles.js`); die Werte selbst sind im Versuch gleich. Erfahrung als eigener Wert gibt es nicht. |
