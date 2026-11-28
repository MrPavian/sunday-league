# Balancing & Simulation QA – 4. Spielerwerte (Schritt A2, Teil 1: Ursache von I1)

Stand 2026-11-28, Code-Stand `888f324`. Abschnitt A: nur gemessen, **nichts am Spielcode geändert**.
Frage aus A1 (`docs/BALANCING-QA-03-ISSUES.md` I1): Warum entscheidet auf dem Großfeld die Kaderstärke kaum?

## 1. Messung

- `scripts/qa-league.mjs` schreibt je Spiel zusätzlich die Startelf-Werte beim Anpfiff (Mittel je Rolle und Wert, Feld `xi`).
- 24 Karrieren (Start Liga 1, 3, 4, 5, 7, 9 × Seeds 11, 23, 37, 41 × 5 Saisons), erste Saison der Starter-Läufe ausgelassen:
  **6 975 Spiele** ausgewertet; `scripts/qa-attr.mjs` (Regression der Tordifferenz auf die Unterschiede der Werte).
- Diagnose-Skripte (nur Messung, im Arbeitsordner, nicht im Repo): gleiche Mannschaft gekappt gegen ungekappt
  (4 × 160 = 640 Spiele), Anteil gekappter Kader (4 Karrieren).

## 2. Ergebnisse

### 2.1 Die Werte entscheiden – die Stärkezahl bildet sie ab Liga 5 nicht mehr ab

| Liga | Spiele | R² nur Stärke (rating) | R² alle Werte | r (rating, Tordifferenz) | r (V1-Gewichte auf Spielwerte) |
|---|---|---|---|---|---|
| 1 | 1 020 | – | – | 0,21 | 0,32 |
| 2 | 240 / 420 | 0,17 | 0,29 | 0,43 | 0,45 |
| 3 | 840 | 0,19 | 0,23 | 0,43 | 0,45 |
| 4 | 1 320 | 0,18 | 0,24 | 0,42 | 0,46 |
| 5 | 900 | 0,03 | 0,20 | 0,16 | 0,40 |
| 6 | 720 | 0,02 | 0,20 | 0,13 | 0,41 |
| 7 | 480 | 0,01 | 0,27 | 0,11 | 0,44 |
| 8 | 300 | 0,00 | 0,32 | −0,05 | 0,45 |

Die Engine reagiert auf allen Stufen auf die Spielerwerte (r 0,40–0,46 mit den Anzeige-Gewichten V1, angewandt auf die Werte,
**mit denen tatsächlich gespielt wird**). Die gespeicherte Stärke `rating` passt ab Liga 5 nicht mehr zu diesen Werten
(Liga 8: r 0,05 zwischen rating und den Spielwerten; Ø 123,6 gegen 108,5). Die Gewichte V1 sind also nicht das Problem
(V2 sagt gleich gut voraus: 0,39–0,45).

### 2.2 CPU gegen CPU ist in Ordnung, der Verein des Menschen nicht

| Liga | CPU gegen CPU: r (rating, Tordifferenz) | Spiele des Menschen: Ø Stärkevorsprung | Ø Tordifferenz des Menschen |
|---|---|---|---|
| 5 | 0,36 | +3,1 | −0,48 |
| 6 | 0,25 | +10,8 | −0,52 |
| 7 | 0,36 | +12,3 | −0,97 |
| 8 | 0,20 | +17,3 | −1,07 |

Echte Ligen: r 0,25–0,47 (Testbericht Abschnitt 2). Der Befund I1 entsteht fast ganz in den Spielen des menschlichen Vereins.

### 2.3 Ursache: Kappung auf 0,98 aus der Zeit vor Stärkemodell 3

**[Code]** Mehrere Stellen begrenzen Spielwerte beim Anwenden eines Bonus auf höchstens 0,98. Seit Stärkemodell 3
(`career/career.js` STRENGTH_MODEL = 3, eingeschaltet 2026-10-31) liegen Technikwerte ab Liga 5 über 1 (`sim/niveau.js`
liftsAttr hebt nur Technik, Passen, Abschluss, Zweikampf, Kopfball; Tempo, Ausdauer, Körper nicht). Die Kappung schneidet den
Aufschlag ab. `sim/fit.js` (Zeile ~63) löst es bereits richtig („Deckel nur für Werte, die schon darunter lagen“).

| Stelle | Wer | Wann | Betroffene Werte |
|---|---|---|---|
| `career/events.js` applyForm (Z. 75, seit 2026-09-25) | eigener Verein (CPU hat Form 0) | **jedes Spiel**, sobald Stimmung oder Form ≠ 0 | Tempo, Ausdauer, Technik, Passen, Abschluss, Zweikampf |
| `data/jobs.js` clampAttr in applyJobPerks (aufgerufen in `sim/match.js` createMatch) | **beide Mannschaften** | jedes Spiel, sobald ein Spieler einen Beruf mit Mannschaftsbonus hat | je Bonus, z. B. „bier“: Passen, Technik für alle |
| `career/relations.js` applyChemistry (Z. 87) | eigener Verein | Kumpels und Rivalen in der Elf | je Beziehung |
| `career/pub.js` (Z. 200) | eigener Verein (Bierdeckel-Taktik), CPU (Tipp vom Wirt) | wenn gewählt | je Taktik |
| `sim/halftalk.js` (Z. 54) | angesprochene Mannschaft | Halbzeitansprache | Tempo bis Zweikampf |
| `career/matchday.js` (Z. 69, „oma_kuchen“) | ein Spieler | Spieltagsereignis | **alle** Werte, auch Torwartspiel |

**[gemessen]** Wirkung der Kappung, gleiche Mannschaft gegen sich selbst, je 160 Spiele, Seiten im Wechsel:

| Liga | Werte über 0,98 | Ø Tordifferenz ungekappt − gekappt | gekappte Mannschaft S / U / N |
|---|---|---|---|
| 3 (7er) | 0 % | −0,06 (Rauschen) | 59 / 44 / 57 |
| 5 Großfeld | 22 % | 0,24 | 41 / 59 / 60 |
| 7 Großfeld | 62 % | 0,98 | 12 / 45 / 103 |
| 9 Großfeld | 63 % | 1,97 | 1 / 25 / 134 |

**[gemessen]** Berufsboni: 6–7 von 8 Kadern in Liga 5–9 haben einen Spieler mit Mannschaftsbonus; 17–35 % ihrer Werte über
0,98 werden dadurch auf 0,98 gesetzt (ganzer Kader betrachtet, im Spiel nur die Aufgestellten).

**Folge für Spielende:** Ab Liga 5 spielt der eigene Verein deutlich schwächer, als seine Stärke anzeigt – in Liga 9 um rund
2 Tore je Spiel. Aufstieg in höhere Ligen wird dadurch stark erschwert; Kaderverbesserungen wirken kaum. Auf Kleinfeld
(Liga 1–4, Werte meist unter 1) gibt es keine Wirkung.

## 3. Was das für die übrigen Befunde heißt

- I1 (Großfeld: Stärke entscheidet kaum): **Ursache belegt**, Fehler statt Balancing (siehe Problemliste B1).
- I2 (wenige Tore auf dem Großfeld): möglicherweise teilweise mitverursacht (gekappte Mannschaften), **nicht geprüft**.
  Neu messen nach einer Korrektur.
- Die Wirkung einzelner Werte und Spielertypen (Phase 3 des Auftrags) ist auf dem Großfeld erst nach einer Korrektur sinnvoll
  messbar; auf dem Kleinfeld ist sie unabhängig davon.

## 4. Werte, die in echten Ligaspielen signifikant wirken (Ausschnitt, |t| ≥ 2, je +0,1 Unterschied)

Torwartspiel in jeder Liga (Liga 2: +0,20 Tore, Liga 4: +0,08, Liga 8: +0,09). Sonst je Liga verschieden und meist knapp
über der Schwelle (z. B. Liga 3: Tempo und Technik im Mittelfeld; Liga 5: Abschluss im Sturm, Zweikampf im Mittelfeld).
Aussagen über einzelne Werte folgen in A2 Teil 2 mit gezielten Versuchen statt natürlicher Streuung.

## 5. Korrektur B1 (vom Nutzer vorgezogen, 2026-11-28)

**Freigabe:** Nutzerentscheid 2026-11-28 „Jetzt beheben“ (vor Abschnitt B, weil es ein Fehler ist und spätere Großfeld-Messungen
sonst nicht mehr gelten).

- `sim/skill.js`: neu `bonusAttr(vorher, neu)` – Deckel 0,98 nur, wenn der Wert vorher höchstens 0,98 war (wie `sim/fit.js`);
  Schalter `BONUS_CAP.keepLift` (aus = alter Deckel für alle).
- Eingesetzt an den sechs Stellen aus 2.3: `career/events.js` applyForm, `data/jobs.js` applyJobPerks, `career/relations.js`
  applyChemistry, `career/pub.js`, `sim/halftalk.js`, `career/matchday.js` („oma_kuchen“).
- Werte bis 0,98 rechnen exakt wie vorher: Liga 1, 2 Saisons, Seed 11 – Messdatei mit und ohne Korrektur bitgleich; alle
  1 666 Tests einschließlich Golden unverändert grün. Neuer Test `tests/bonusCap.test.js` (4 Tests).

**Messung an / aus** (Start Liga 5, 7, 9 × Seeds 11, 23, 37, 41 × 3 Saisons, erste Saison ausgelassen, je 1 440 Spiele; nach der
ersten Saison laufen die Karrieren auseinander, die Ligen sind deshalb nicht genau gleich verteilt):

| | Schalter aus (vorher) | an (nachher) | Echte Ligen |
|---|---|---|---|
| r (Stärkeabstand, Tordifferenz), alle Spiele | 0,13 | **0,39** | 0,25–0,47 |
| CPU gegen CPU | 0,29 | 0,34 | |
| Spiele des Menschen | 0,01 | **0,46** | |
| Favorit ≥ 10 Stärkepunkte S / U / N % | 40 / 33 / 27 | **55 / 31 / 14** | 58–72 / 13–28 / 10–15 |
| Tore je Spiel | 1,57 | 1,64 | 2,6–3,2 |
| 0:0 % | 23,2 | 20,8 | 4–8 |

I1 ist damit behoben. Die Torarmut auf dem Großfeld (I2) bleibt fast unverändert und ist ein eigenes Thema.
