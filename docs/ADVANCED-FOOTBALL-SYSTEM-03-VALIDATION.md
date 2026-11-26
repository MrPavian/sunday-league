# Advanced Football System – Phase 3: Validierung der Spieldaten

Stand 2026-11-26. Prüft die Kennzahlen aus Phase 1 (`src/sim/analytics.js`) nach Bericht 00, Abschnitt 9: Streuung bekannt,
Mindeststichprobe festgelegt, Reaktion auf Taktik nachgewiesen, unabhängig voneinander. Nur gemessen, nichts geändert.

## 1. Messaufbau

- Skript `scripts/afs-validate.mjs` (4 Worker-Threads), Lauf `node scripts/afs-validate.mjs 40 rasenplatz,grossfeld 80`:
  1600 Spiele in 460 s, Seeds 20000–20079, Spiellänge wie im Spiel (`matchDuration`), ohne KI-Trainer.
- Je Platz zwei **feste Paarungen** (Mannschaften aus `generateTeam` mit Seeds 11 und 12, Stil „ausgewogen“); es wechseln nur der
  Spiel-Seed und der Befehl der Mannschaft 0. Basis: 80 Spiele je Paarung ohne Befehl; je Befehl 40 Spiele.
- Befehle (`sim/plan.js ORDER_EFFECTS`): `press:hoch`, `press:tief`, `build:kurz`, `build:direkt`, `route:aussen`,
  `route:mitte`; Stile (`sim/tactics.js STYLES`): `offensiv`, `mauern`.
- Hypothesen vor dem Lauf festgelegt (Abschnitt 3). „Erfüllt“ = Richtung stimmt und |t| ≥ 2 (Welch).
- Mindest-n: Spiele, bis das 95-%-Intervall des Mittelwerts einer Mannschaft ±10 % des Mittels (Anzahlen) bzw. ±0,05 (Anteile)
  erreicht.
- Spielerwerte: gerade gegen ungerade Basis-Spiele, Korrelation über Feldspieler (Rasenplatz 33, Großfeld 50; je etwa 38 Spiele je
  Hälfte), **innerhalb der Rolle** (Rollenmittel abgezogen – sonst misst man nur, dass Stürmer anders spielen als Verteidiger).
  Zuverlässigkeit nach Spearman-Brown; „Spiele für 0,7“ = so viele Einsätze, bis ein Spielerwert zu 0,7 zuverlässig ist.

## 2. Streuung und Mindest-n je Mannschaft

| Kennzahl | Rasenplatz Mittel ± SD | Mindest-n | Großfeld Mittel ± SD | Mindest-n |
|---|---|---|---|---|
| Pässe | 52,5 ± 5,6 | 5 | 46,6 ± 4,6 | 4 |
| Passquote | 0,63 ± 0,06 | 6 | 0,61 ± 0,07 | 8 |
| Anteil Pässe unter Druck | 0,64 ± 0,07 | 8 | 0,61 ± 0,07 | 8 |
| Passquote unter Druck | 0,57 ± 0,08 | 11 | 0,57 ± 0,09 | 14 |
| Packing je angekommenem Pass | 1,23 ± 0,25 | 16 | 2,04 ± 0,42 | 17 |
| Mannschaftsteile je Pass | 0,58 ± 0,12 | 18 | 0,59 ± 0,14 | 22 |
| Zweikampfquote | 0,50 ± 0,12 | 22 | 0,50 ± 0,14 | 31 |
| Kopfballduelle | 1,8 ± 1,9 | 441 | 1,5 ± 1,7 | 489 |
| Anteil zweite Bälle | 0,50 ± 0,09 | 12 | 0,50 ± 0,09 | 13 |
| Abschlüsse | 11,9 ± 3,5 | 34 | 6,8 ± 2,7 | 62 |
| xG | 1,59 ± 0,57 | 50 | 0,76 ± 0,41 | 116 |
| xA | 0,93 ± 0,36 | 59 | 0,35 ± 0,22 | 159 |
| Field Tilt | 0,50 ± 0,13 | 25 | 0,50 ± 0,11 | 18 |

Eine Saison hat 10 oder 14 Ligaspiele (6 oder 8 Vereine). Werte mit Mindest-n über 14 sind in einer Saison nur als grobe Stufe
zeigbar, nie als Zahl mit Nachkommastellen.

## 3. Reaktion auf Taktik (Mannschaft 0 mit Befehl, gleiche Seeds und Paarungen)

| Hypothese | Rasenplatz | t | Großfeld | t | Ergebnis |
|---|---|---|---|---|---|
| Field Tilt: hoch pressen > tief stehen | 0,54 / 0,48 | 3,3 | 0,53 / 0,49 | 2,4 | **erfüllt** |
| Gegner unter Druck: hoch > tief | 0,64 / 0,66 | −1,9 | 0,60 / 0,61 | −1,1 | nicht erfüllt |
| Gegner-Passquote: hoch < tief | 0,63 / 0,65 | −1,5 | 0,60 / 0,61 | −0,6 | nicht erfüllt (Richtung stimmt, zu schwach) |
| Pässe: kurz > direkt | 53,8 / 53,7 | 0,2 | 47,7 / 47,6 | 0,1 | nicht erfüllt |
| Passquote: kurz > direkt | 0,64 / 0,62 | 2,1 | 0,60 / 0,55 | 4,9 | **erfüllt** |
| Packing je Pass: kurz < direkt | 1,18 / 1,43 | −6,4 | 1,95 / 2,56 | −8,2 | **erfüllt** |
| Field Tilt: mauern < offensiv | 0,51 / 0,59 | −4,2 | 0,49 / 0,55 | −3,7 | **erfüllt** |
| xG: mauern < offensiv | 1,79 / 1,82 | −0,3 | 0,83 / 0,86 | −0,4 | nicht erfüllt |
| Kopfballduelle: außen > Mitte | 1,96 / 2,11 | −0,5 | 1,96 / 1,82 | 0,5 | nicht erfüllt |

Nebenbefunde aus derselben Tabelle (nicht vorab festgelegt, nur Hinweis): `route:mitte` bringt mehr Abschlüsse und xG als
`route:aussen` (Rasenplatz 15,3 / 10,9 Abschlüsse, Großfeld 9,2 / 6,0); `press:hoch` bringt mehr Zweikämpfe als `press:tief`
(20,5 / 16,7 und 14,6 / 12,7).

**Befunde zur Engine** (keine Messfehler; Kandidaten für Phase 2):
- **Pressing stört den Gegner kaum messbar.** `press:hoch` schiebt die Mannschaft nach vorn (Field Tilt, mehr Zweikämpfe), aber der
  Gegner spielt nicht öfter unter Druck und kaum schlechter. Druck heißt heute: nächster Gegner unter 2,2 m (`profiles.js
  pressureOn`) – das trifft ohnehin rund 60 % aller Pässe. Entspricht Bericht 00, Matrix Nr. 4 (Pressingresistenz B/C) und
  Erweiterung C1.
- **`build:kurz` erhöht die Zahl der Pässe nicht,** obwohl es `passRate` × 1,35 setzt; es wirkt auf Länge und Quote.
- **Mauern erzeugt so viel xG wie Offensiv** (lange Bälle auf die Spitze). Ob das gewollt ist, ist eine Balancefrage, keine
  Messfrage.
- **Kopfballduelle sind selten** (1,5–2 je Mannschaft und Spiel) und reagieren nicht auf Flügelspiel. Erweiterung D2 (Kopfballduell
  mit Verlierer) wäre die Voraussetzung.
- **Die Zweikampfquote hängt kaum an den Fähigkeiten:** Großfeld, 60 Spiele, 1580 Zweikämpfe, Feldspieler nach Tackling-Drittel:
  48,6 % / 50,2 % / 51,2 % gewonnen; nach Technik-Drittel 46,1 % / 52,0 % / 51,7 %.

## 4. Zuverlässigkeit der Spielerwerte (innerhalb der Rolle)

| Spielerwert | Rasenplatz | Großfeld | Urteil |
|---|---|---|---|
| Pässe je Spielanteil | 0,87 | 0,84 | zuverlässig |
| Passquote | 0,71 | 0,11 | nur Rasenplatz |
| Packing je Pass | −0,11 | 0,54 | nicht zuverlässig |
| Zweikampfquote | −0,02 | −0,31 | Zufall |
| zweite Bälle je Spielanteil | 0,21 | 0,87 | nur Großfeld |
| xG je Spielanteil | 0,91 | 0,93 | zuverlässig |
| xA je Spielanteil | 0,75 | 0,51 | nur Rasenplatz |

Werte = Zuverlässigkeit über alle Basis-Spiele (etwa 76 Einsätze). Bis 0,7 braucht ein Spieler (hergeleitet nach Spearman-Brown aus den Hälften): xG je Spielanteil 13–18 Einsätze, also etwa eine
Saison; Pässe je Spielanteil 26–33 Einsätze.

## 5. Abhängigkeit und Zusammenhang mit Toren

- Stark abhängig (|r| ≥ 0,7, beide Plätze): Passquote ~ Passquote unter Druck (0,77 / 0,79), Packing ~ Mannschaftsteile (0,88 /
  0,88), Abschlüsse ~ xG (0,86 / 0,81). Je Paar nur eine Kennzahl zeigen (Bericht 00, Regel 4).
- Tordifferenz ~ xG-Differenz: r 0,40 (Rasenplatz) / 0,49 (Großfeld); Tordifferenz ~ Field Tilt: r 0,24 / 0,24.
- **Tore je xG: 0,86 (Rasenplatz) / 1,12 (Großfeld).** Das xG-Modell (`chances.js`) ist über vier Plätze zusammen geeicht und liegt je
  Platz bis zu 14 % daneben.

## 6. Urteil je Kennzahl

| Kennzahl | Mannschaft | Spieler | Begründung |
|---|---|---|---|
| Pässe (Anzahl) | **frei** ab 5 Spielen | **frei** (je Spielanteil) ab etwa 26–33 Einsätzen, sonst nur Saisonsumme | stabil; MEASURED; reagiert nicht auf `build`, ist aber eine Zählung |
| Passquote | **frei** ab 8 Spielen | nicht frei | reagiert auf `build`; Spielerwert auf Großfeld unzuverlässig |
| Passquote unter Druck / Anteil unter Druck | nicht frei | nicht frei | doppelt die Passquote (r 0,78); Druck ohne Taktikreaktion – wartet auf C1 |
| Packing je Pass | **frei** als Stufe ab 17 Spielen | nicht frei | reagiert klar auf `build` und Stil; Spielerwert rollenbedingt |
| Mannschaftsteile je Pass | nicht zeigen | nicht zeigen | doppelt Packing (r 0,88) |
| Zweikämpfe (Anzahl) | **frei** als Zählung | **frei** als Zählung | MEASURED/DERIVED; reagiert auf Pressing |
| Zweikampfquote | nicht frei | nicht frei | fähigkeitsunabhängig, Spielerwert Zufall |
| Kopfballduelle | nicht frei | nicht frei | zu selten (Mindest-n > 400), keine Taktikreaktion |
| zweite Bälle | nicht frei | nicht frei | stabil (n 12–13), aber keine Taktikreaktion (Abschnitt 7.2) – wartet auf D1 |
| xG | **frei** als Stufe; Saisonsumme | **frei** ab einer Saison (≈ 14 Einsätze) | reagiert auf `route`; Spielerwert zuverlässig; je Platz geeicht (7.1) |
| xA | **frei** als Saisonsumme | nicht frei | Spielerwert nur auf Rasenplatz zuverlässig |
| Field Tilt | **frei** als Stufe ab 25 Spielen | – | reagiert auf Pressing und Stil |

„Frei“ heißt: darf in Phase 4 angezeigt werden, mit Herkunft und Mindest-n; „als Stufe“ heißt ohne Nachkommastellen (deutlich
mehr / ähnlich / deutlich weniger als der Platz-Schnitt).

## 7. Nachträge (2026-11-26)

### 7.1 xG je Platz geeicht

Je Platz 60 Spiele (Seeds 8200–8259, ohne feste Paarungen, wie die ursprüngliche Eichung), nur Abschlüsse ohne Elfmeter; je Platz
die Verschiebung (Logit) gesucht, bei der die Summe der xG den Toren aus Abschlüssen entspricht.

| Platz | Abschlüsse | Tore | xG vorher | Tore/xG vorher | Verschiebung ± 95 % | übernommen | Gegenprobe Tore/xG (Seeds 8300–8339) |
|---|---|---|---|---|---|---|---|
| Parkplatz | 1434 | 151 | 160,1 | 0,94 | −0,07 ± 0,17 | nein | 0,91 |
| Hinterhof | 2473 | 189 | 261,2 | 0,72 | −0,37 ± 0,15 | **ja** | 1,01 |
| Park | 1559 | 126 | 173,1 | 0,73 | −0,36 ± 0,18 | **ja** | 1,12 |
| Ascheplatz | 1615 | 225 | 226,4 | 0,99 | −0,01 ± 0,14 | nein | 1,06 |
| Rasenplatz | 1459 | 189 | 189,8 | 1,00 | 0,00 ± 0,16 | nein | 1,08 |
| Sportplatz | 1233 | 133 | 145,8 | 0,91 | −0,11 ± 0,19 | nein | 0,81 |
| Großfeld | 862 | 108 | 84,1 | 1,28 | +0,30 ± 0,21 | **ja** | 0,98 |
| Halle | 1446 | 141 | 155,6 | 0,91 | −0,11 ± 0,18 | nein | 0,96 |

Übernommen nur, wo die Abweichung größer als ihr Intervall war (`chances.js XG.pitch`). In der Gegenprobe liegen alle acht Plätze
innerhalb ihres Intervalls. Die 0,86 auf dem Rasenplatz in Abschnitt 5 stammen aus den zwei festen Paarungen mit allen Toren
(auch Eigentoren und Abprallern) – das ist kein Eichfehler des Platzes.

### 7.2 Zweite Bälle und Taktik

Hypothese vorab: `shape:kompakt` gewinnt mehr zweite Bälle als `shape:aufruecken`. Je Platz 2 Paarungen × 40 Spiele: Rasenplatz
0,49 / 0,51 (t −1,3), Großfeld 0,49 / 0,50 (t −0,4) – **nicht erfüllt**. Über alle elf Befehle und Stile aus Abschnitt 3 und diesem
Nachtrag liegt der Anteil zwischen 0,48 und 0,52. Wer den freien Ball holt, hängt in der Engine nicht an der Taktik; die Kennzahl
bleibt gesperrt, bis Erweiterung D1 (Zweite-Ball-Staffelung) es gibt.

## 8. Offene Punkte

1. ~~xG je Platz eichen~~ erledigt (7.1).
2. ~~Zweite Bälle: Taktikprobe~~ erledigt, nicht bestanden (7.2).
3. Taktik und Zuverlässigkeit nur auf zwei Plätzen gemessen (Rasenplatz, Großfeld); die xG-Eichung auf allen acht.
4. Die Engine-Befunde aus Abschnitt 3 gehören in Phase 2 (Druckmodell C1, Kopfballduell D2) und gegebenenfalls in die Balance.
