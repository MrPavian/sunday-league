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

## 6. A2 Teil 2: Wirkung der Werte und Spielertypen in gezielten Versuchen (2026-11-28, Code-Stand `c401052`)

Nur gemessen, nichts am Spielcode geändert. Skript `scripts/qa-attr-exp.mjs` (neu). Grundkader wie `scripts/strength-regression.mjs`
(`generateTeam` aus `TEAM_PRESETS[0]`), angehoben wie im Spiel (`sim/niveau.js` lifted, Stärkemodell 3), beide Mannschaften aus
demselben Grundkader, volle Engine (`createMatch`, ohne Menschen).

**Durchgeführte Spiele:** Regression 2 × 2 000 (Großfeld Niveau 5 und 8) · Spielertypen 2 × 3 840 (Großfeld Niveau 5, Rasenplatz 7er
Niveau 1; 12 Varianten × 160 Kader × 2 Seiten). Zusammen **11 680 Spiele**.

### 6.1 Regression: Wirkung je +0,1 Unterschied (Tore je Spiel, ± Standardfehler; * = |t| ≥ 2)

Je Spiel bekommen beide Mannschaften unabhängig zufällige Verschiebungen ±0,25 je Rolle und Wert (Untergrenze 0,05, keine Obergrenze).
Tore je Spiel: Niveau 5 1,71, Niveau 8 2,03.

| Wert | Tor | Abwehr N5 / N8 | Mittelfeld N5 / N8 | Sturm N5 / N8 |
|---|---|---|---|---|
| Torwartspiel | **0,082* / 0,109*** | – | – | – |
| Tempo | −0,018 / 0,000 | **0,049* / 0,070*** | **0,043* / 0,044*** | **0,071* / 0,081*** |
| Ausdauer | – | 0,031* / −0,006 | 0,005 / 0,020 | 0,007 / 0,023 |
| Technik | 0,016 / 0,011 | 0,022 / 0,034* | **0,042* / 0,037*** | 0,024 / 0,026 |
| Passen | 0,004 / −0,019 | 0,019 / −0,008 | 0,027 / −0,001 | 0,024 / −0,002 |
| Abschluss | – | 0,030* / −0,005 | 0,031* / 0,002 | **0,115* / 0,118*** |
| Zweikampf | – | **0,047* / 0,034*** | 0,016 / **0,044*** | 0,039* / 0,012 |
| Kopfball | – | −0,002 / 0,023 | −0,015 / 0,002 | 0,003 / 0,010 |
| Körper | 0,004 / 0,007 | 0,026 / 0,011 | 0,010 / 0,015 | −0,001 / −0,020 |

Standardfehler 0,014–0,016. Vergleich: Anzeige-Gewichte V1 (`sim/generator.js` RATING_WEIGHTS) je +0,1 = Gewicht × 10 Stärkepunkte.

### 6.2 Spielertypen bei gleicher Anzeige-Stärke

Typ für **alle Spieler der Rolle**, Stärke V1 gleich gehalten (die nicht berührten V1-Werte gleichen gemeinsam aus, Spalte „netto“).
Gegner: derselbe Kader ohne Typ. Aufschläge sind Versuchswerte (gewählt). Tordifferenz je Spiel ± Standardfehler (ungepaart gerechnet,
also eher zu groß); Kontrolle = 0.

| Typ | netto (je Spieler der Rolle) | Großfeld N5 | 7er N1 |
|---|---|---|---|
| Sturm schnell, technisch schwach | Tempo +0,2, Technik −0,2 | +0,07 ± 0,07 | +0,06 ± 0,09 |
| Sturm langsam, Techniker | Tempo −0,2, Technik +0,2 | −0,02 ± 0,07 | +0,03 ± 0,10 |
| Kopfballstarker Zielspieler | Kopfball +0,3, Körper +0,2, Tempo −0,15 | −0,04 ± 0,08 | +0,03 ± 0,10 |
| Pressingstürmer | Ausdauer +0,2, Zweikampf +0,2, Tempo +0,1, übrige −0,06 | −0,11 ± 0,08 | **+0,22 ± 0,09** |
| Kreativer Spielmacher | Passen +0,2, Technik +0,15, Ausdauer/Zweikampf/Abschluss/Tempo −0,175 | **−0,17 ± 0,07** | **−0,37 ± 0,10** |
| Defensiver Mittelfeldspieler | Zweikampf +0,25, Körper +0,15, Ausdauer +0,1, übrige −0,06 | +0,10 ± 0,07 | **+0,38 ± 0,10** |
| Zweikampfstarker Innenverteidiger | Zweikampf +0,2, Kopfball +0,15, Körper +0,15, Tempo/Passen/Ausdauer/Technik −0,15 | **−0,15 ± 0,07** | +0,15 ± 0,08 |
| Spielstarker Innenverteidiger | Passen +0,2, Technik +0,2, übrige −0,07 | +0,07 ± 0,07 | +0,17 ± 0,10 |
| Schneller Außenverteidiger | Tempo +0,25, Ausdauer +0,1, übrige −0,075 | +0,06 ± 0,07 | −0,01 ± 0,10 |
| Klassischer Torwart | Torwartspiel +0,1, Körper +0,15, Passen/Tempo/Technik/Ausdauer −0,15 | +0,09 ± 0,07 | +0,14 ± 0,09 |
| Mitspielender Torwart | Passen +0,25, Technik +0,25, Tempo +0,1, Torwartspiel/Ausdauer −0,086 | −0,11 ± 0,07 | −0,18 ± 0,10 |

Grenzen: Der Typ gilt für die ganze Reihe (ein einzelner Spieler wäre mit dieser Spielzahl nicht messbar); „Innen-“ und
„Außenverteidiger“ unterscheiden sich im Versuch nur durch die Werte, nicht durch die Position.

### 6.3 Antworten auf die Fragen aus Phase 3

| Frage | Befund | Beleg |
|---|---|---|
| Ist Tempo zu mächtig? | Tempo ist in jeder Feldreihe einer der stärksten Werte (0,04–0,08) und auf Niveau 8 etwa doppelt so wirksam wie Technik. Ob „zu mächtig“, ist eine Balancing-Frage; auffällig ist der Abstand zu Technik in höheren Ligen. Vermutung (nicht geprüft): Technikwerte liegen ab Niveau 5 über 1 und sind dort gedämpft (`sim/skill.js` soft), Tempo bleibt unter 1 und wirkt voll. | 6.1 |
| Wird Technik ausreichend berücksichtigt? | Im Mittelfeld ja (0,04), im Sturm und in der Abwehr schwach (0,02–0,03). V1 gewichtet Technik im Sturm mit 0,2 – die Engine gibt ihr weniger als ein Viertel der Abschlusswirkung. | 6.1 |
| Übersicht, Antizipation, Stellungsspiel | **Keine Wirkung im Spiel:** Schicht ausgeschaltet (`sim/mind.js` MIND.on = false, Nutzerentscheid 2026-11-27). Nicht neu gemessen. | `docs/ADVANCED-FOOTBALL-SYSTEM-06B-MIND.md` |
| Stellungsspiel und Defensivverhalten | Zweikampf wirkt in der Abwehr (0,03–0,05), Kopfball und Körper in der Abwehr kaum. | 6.1 |
| Sind Körperwerte überbewertet? | Körper (`strength`) wirkt auf dem Großfeld in keiner Reihe signifikant (−0,02 … 0,03). Auf 7er/9er maß Konzept 11.6 deutlich mehr (Mittelfeld 0,077, Abwehr 0,070 je +0,1). Tempo dagegen stark (s. o.). | 6.1; `docs/KONZEPT-SPIELERSTAERKE.md` 11.6 |
| Mentale Werte | Mentalität und Ergebnisdruck (`sim/mentality.js`) sind kein Spielerwert; Spielintelligenz aus (s. o.). | Code |
| Ist Ausdauer relevant? | Kaum: 0,005–0,03, nur einmal signifikant. Großfeld hat den geringsten Kraftverbrauch (`sim/pitch.js` STAMINA_DRAIN grossfeld 0,15 gegen 0,29 Rasenplatz). | 6.1 |
| Torwartwerte sinnvoll gewichtet? | Torwartspiel ist der zweitstärkste Einzelwert (0,08–0,11); Passen, Technik, Tempo des Torwarts ohne messbare Wirkung. Der mitspielende Torwart verliert bei gleicher Stärke (−0,11 / −0,18), der klassische gewinnt. | 6.1, 6.2 |
| Spielertypen | Bei gleicher Anzeige-Stärke verliert der kreative Spielmacher deutlich (Großfeld −0,17, 7er −0,37), der defensive Mittelfeldspieler gewinnt (+0,10 / +0,38). V1 gewichtet im Mittelfeld Passen und Technik mit je 0,25 – mehr, als die Engine ihnen gibt. Zweikampfstarke Innenverteidiger: 7er +0,15, Großfeld −0,15 (dort fehlt das abgegebene Tempo). | 6.2 |
| Kopfball | Auf allen Stufen ohne messbare Wirkung, auch auf dem Großfeld (vgl. I7: wenige Kopfball-Abschlüsse). Der Zielspieler bringt nichts. | 6.1, 6.2 |

### 6.4 Nebenbefund: Profile sättigen in höheren Ligen

`sim/profiles.js` profilesOf leitet Profile mit festen Schwellen aus den Werten ab, z. B. Spielmacher ab (Passen + Technik) / 2 > 0,64.
Die angehobenen Technikwerte überschreiten die Schwellen ab Niveau 3 immer öfter (300 Kader × 11 Spieler je Niveau):

| Niveau | Spielmacher | Ruhepol | Kämpfer | Teamplayer | Einzelkämpfer | Ballmagnet |
|---|---|---|---|---|---|---|
| 1 | 11 % | 12 % | 11 % | 16 % | 17 % | 14 % |
| 3 | 38 % | 31 % | 14 % | 14 % | 13 % | 9 % |
| 5 | 82 % | 46 % | 28 % | 6 % | 3 % | 2 % |
| 8 | 87 % | 48 % | 43 % | 0 % | 0 % | 0 % |

Wirkung im Spiel (Code): Spielmacher werden als Passziel bevorzugt (`sim/actions.js` +0,65 im Zielwert) und passen genauer (Streuung
× 0,85); Kämpfer +0,08 im Zweikampf (`sim/tackles.js`); Ruhepol beruhigt Mitspieler (`sim/profiles.js`). In höheren Ligen wird so
fast jeder Spieler zum Spielmacher – das Profil unterscheidet nicht mehr, und Teamplayer, Einzelkämpfer und Ballmagnet verschwinden.
Problemliste I13.

## 7. Diagnose Spielintelligenz (Nutzer: „Ja“ 2026-11-28, nur Messung)

Frage: Warum brachten Antizipation, Übersicht und Stellungsspiel in drei Messungen keinen Vorteil
(`docs/ADVANCED-FOOTBALL-SYSTEM-06B-MIND.md` Abschnitt 4)? Skript `scripts/qa-mind-diag.mjs` (neu). Schalter `MIND.on` und die
Stellschrauben `MIND_FX` werden nur im Messprozess gesetzt, der Spielcode bleibt unverändert (Schicht im Spiel weiter aus).

**Aufbau:** Grundkader wie Abschnitt 6, beide Mannschaften mit allen drei Werten auf 0,75 (`MIND_FX.hi`, fehlerfrei); die
Testmannschaft bekommt in einer Variante einen Wert auf 0,15 (`MIND_FX.lo`, volle Schwäche). Gleicher Kader und Seed in allen
Varianten, Seiten im Wechsel; Unterschied zur Kontrolle gepaart (± Standardfehler). Je Platz 160 Kader × 7 Varianten × 2 Seiten =
2 240 Spiele, zusammen **4 480 Spiele**. Steilpass-Folge: xG der eigenen Schüsse bis 8 s nach einem eigenen Steilpass (Messwert).

### 7.1 Ergebnisse (Testmannschaft mit voller Schwäche gegen die Kontrolle)

Großfeld Niveau 5 (Kontrolle: xG 0,97 je Mannschaft, 7,2 Schüsse, 15,0 zweite Bälle, 7,5 Steilpässe mit 0,28 xG Folge):

| Variante | Tordifferenz | xG für | xG gegen | Schüsse gegen | zweite Bälle Gegner | Steilpässe | xG nach Steilpass |
|---|---|---|---|---|---|---|---|
| Antizipation schwach | −0,07 ± 0,10 | +0,01 ± 0,04 | +0,06 ± 0,04 | +0,16 ± 0,21 | **+0,81 ± 0,28** | +0,15 ± 0,23 | +0,02 ± 0,02 |
| Übersicht schwach | −0,08 ± 0,09 | −0,00 ± 0,04 | +0,06 ± 0,04 | +0,28 ± 0,20 | **+0,94 ± 0,27** | **−3,13 ± 0,19** | **−0,08 ± 0,02** |
| Stellungsspiel schwach (beides) | **+0,44 ± 0,10** | **+0,23 ± 0,04** | **−0,27 ± 0,04** | **−2,25 ± 0,21** | **+1,59 ± 0,30** | −0,43 ± 0,23 | +0,08 ± 0,02 |
| – nur Zug zum Ball | **+0,44 ± 0,10** | **+0,14 ± 0,04** | **−0,33 ± 0,03** | **−2,56 ± 0,20** | **+1,21 ± 0,28** | **−0,88 ± 0,23** | +0,07 ± 0,02 |
| – nur längerer Rückweg | −0,09 ± 0,10 | +0,03 ± 0,04 | +0,09 ± 0,04 | **+0,52 ± 0,21** | +0,34 ± 0,29 | +0,25 ± 0,21 | +0,05 ± 0,02 |
| – Zug zum Ball doppelt | **+0,44 ± 0,10** | **+0,34 ± 0,04** | **−0,25 ± 0,03** | **−2,31 ± 0,20** | **+1,50 ± 0,30** | **−1,61 ± 0,21** | +0,06 ± 0,02 |

Rasenplatz 7er Niveau 1 (Kontrolle: xG 1,55, 12,1 Schüsse, 17,1 zweite Bälle, 1,9 Steilpässe mit 0,16 xG Folge):

| Variante | Tordifferenz | xG für | xG gegen | Schüsse gegen | Steilpässe | xG nach Steilpass |
|---|---|---|---|---|---|---|
| Antizipation schwach | −0,17 ± 0,13 | −0,01 ± 0,04 | +0,07 ± 0,04 | +0,37 ± 0,26 | +0,00 ± 0,11 | +0,01 ± 0,02 |
| Übersicht schwach | −0,13 ± 0,12 | +0,02 ± 0,04 | +0,05 ± 0,04 | +0,23 ± 0,25 | **−1,03 ± 0,10** | **−0,08 ± 0,01** |
| Stellungsspiel schwach (beides) | **+0,60 ± 0,14** | **+0,24 ± 0,04** | **−0,40 ± 0,04** | **−2,90 ± 0,27** | −0,28 ± 0,11 | −0,01 ± 0,02 |
| – nur Zug zum Ball | **+0,48 ± 0,14** | **+0,19 ± 0,04** | **−0,38 ± 0,04** | **−2,56 ± 0,27** | −0,38 ± 0,11 | −0,02 ± 0,02 |
| – nur längerer Rückweg | +0,02 ± 0,14 | +0,05 ± 0,04 | +0,00 ± 0,04 | +0,03 ± 0,25 | −0,09 ± 0,12 | −0,01 ± 0,02 |
| – Zug zum Ball doppelt | **+0,73 ± 0,14** | **+0,48 ± 0,05** | **−0,32 ± 0,04** | **−2,70 ± 0,26** | −0,31 ± 0,11 | +0,02 ± 0,02 |

### 7.2 Befund je Wert

- **Stellungsspiel – Ursache in der Grundaufstellung belegt:** Der „Fehler“ (Ziel rückt 0,3 · Schwäche des Wegs zum Ball,
  `sim/ai.js` updateTactics) lässt **ein Viertel bis ein Drittel weniger Schüsse zu** (−2,3 von 7,2 bzw. −2,9 von 12,1) und bringt
  +0,44 / +0,60 Tore je Spiel. Doppelter Zug hilft im Angriff noch mehr (mehr Ballgewinne nah am Ball), in der Abwehr nicht weiter.
  Die Wirkung kommt aus dem Zug, nicht aus dem Rückweg (der wirkt richtig herum, aber klein: Großfeld +0,5 Schüsse gegen).
  Folgerung: Die Zonendeckung ohne Ball (`sim/ai.js` anchor: Tiefe `adv · 0,22`, Breite `ball.z · 0,32`) verschiebt zu wenig zum
  Ball. Solange das so ist, ist ein Spieler, der zum Ball gezogen wird, im Vorteil – jede Fehler-Wirkung von Stellungsspiel muss
  daran scheitern. Problemliste I15.
- **Antizipation – wirkt richtig herum, aber zu klein:** Gegner gewinnt +0,8 zweite Bälle (+5 %), sonst alles im Rauschen. Die
  Strafe (+0,25 s Reaktionszeit bei Abprallern, +0,3 s beim Steilpass) verschiebt das Spiel kaum.
- **Übersicht – Verhalten ändert sich, das Ergebnis nicht:** Schwache Übersicht spielt 42 % (Großfeld) bzw. 55 % (7er) weniger
  Steilpässe, die xG danach sinken um 0,08 – aber die **gesamten xG bleiben gleich** (−0,00 / +0,02). Was stattdessen gespielt wird,
  bringt in dieser Engine genauso viel. Ein Steilpass ist im Mittel nur 0,04 (Großfeld) bzw. 0,09 (7er) xG wert. Solange er nicht
  mehr wert ist als die Alternative, kann Übersicht nichts bewirken.

### 7.3 Weg zur funktionierenden Spielintelligenz (Vorschlag, Umsetzung erst nach Freigabe in Abschnitt B)

1. **Zonendeckung zuerst (I15):** ballorientiertes Verschieben ohne Ball als Grundverhalten für alle, eigene Schicht mit Schalter,
   gemessen gegen heute (Schüsse gegen, Tore, Ballbesitz, Tore je Spiel I2). Danach Stellungsspiel als Abweichung vom richtigen
   Verschieben neu aufsetzen (zu spät, zu wenig, Raum offen) statt als Zug zum Ball.
2. **Übersicht:** erst den Wert des Steilpasses gegenüber der Alternative untersuchen (Phase 4, Stile und Angriffsmuster). Erst wenn
   ein gesehener Steilpass mehr bringt, kann Übersicht wirken.
3. **Antizipation:** nach Schritt 1 neu messen; die Größe der Strafe ist ein Spielwert ohne Quelle.
4. Danach Schicht an, Regression mit Zufallsverschiebungen (wie Abschnitt 6, ≥ 2 000 Spiele), erst dann Gewicht in der Stärke.
