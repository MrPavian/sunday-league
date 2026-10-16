# Ping-Pong-Zerlegung (mech-audit Befund 4, Stand 2026-10-15)
Nur Messung, `src/` unverändert. Skript: `scripts/pingpong-audit.mjs` (`run <Platz> [N] [--fix=…] [--out=…]`, `table <json…>`). KI gegen KI, Voreinstellungsmannschaften,
Seeds 900+i, aiCoach aus, 20 Spiele je Platz (8 Plätze; Stadion = Großfeld). Kein echtes Android-Gerät, keine Browserprüfung.
Messprinzip: `ball.lastTouch` wird je Spiel durch einen Setter ersetzt; jede Zuweisung meldet Aufrufer (Funktion aus dem Stack), vorigen Ballführer und dessen Aktion, Ereignisse des Schritts,
Spieler im 2-m-Umkreis, Abstand des Vorgängers, Wandkontakt der letzten 0,8 s und die Zeit seit Ende der Berührungssperre des neuen Ballführers. „Wechsel“ = Zuweisung an einen Spieler der anderen
Mannschaft als der vorige Ballführer (wie mech-audit); „schnell“ = weniger als 1 s nach dem vorigen Wechsel. Der Basislauf reproduziert die Werte von Befund 4 (52,8 / 51,7 / 50,3 / 45,9 / 46,3 / 36,9 / 29,3 / 27,3 %).

## Kurzfassung
1. Ein „Wechsel“ ist meist kein Zweikampf, sondern eine **Berührung**: 28 % aller Wechsel (30 % der schnellen) sind `dribbleTouch` über ein laufendes Dribbling mit dem Vorgänger < 1,2 m daneben; echte Tackles
   (Stochern/Grätsche gewonnen + Aufnahme danach) zusammen nur 8 % aller Wechsel. Auf Hinterhof bis Aschenplatz sind es 21-26 schnelle Wechsel dieser Art je Spiel gegen 9 auf dem Großfeld.
2. Die schnellen Wechsel sind überwiegend echtes A→B→A: in 53-67 % holt **derselbe Spieler** den Ball zurück; in 27-36 % aller schnellen Wechsel (A→B→A: 43-50 %) geschieht das im Schritt, in dem seine Berührungssperre abläuft.
3. Auf kleinen Plätzen kommt zur Dribbelschaukel eine **Passabfang-Kaskade** (Berührung über Pass + Tritt über Pass: 17-19 schnelle Wechsel je Spiel auf den fünf kleinen Plätzen gegen 5 auf dem Großfeld) und bei Hinterhof/Halle die Fehlannahme harter Bälle (6-7,5 je Spiel gegen < 1).
4. Mit den ausprobierten Änderungen (Kopie von `src/`, nicht im Spiel) sinkt der Anteil binnen 1 s (ohne Standards) von 53/51/50/47/47/39/32/30 % auf 39/36/39/36/33/29/23/18 %. Kleine Plätze bleiben bei 35-39 %: den Rest tragen Pässe/Abfangen.
Referenz: **keine belastbare Quelle** für Ballbesitzwechsel je Spiel gefunden (siehe 6). Zielwert muss der Nutzer festlegen.

## 1. Tabellen (Basis, 20 Spiele je Platz; Rohdaten im Scratchpad `…/scratchpad/pp/base/*.json`)
### Übersicht je Platz (Stichprobe hinterhof 20, halle 20, park 20, parkplatz 20, ascheplatz 20, rasenplatz 20, sportplatz 20, grossfeld 20)

| Platz | Wechsel/Spiel | schnell (<1 s) % | schnell/Spiel | auf schnellen folgt wieder schnell % | gleicher Spieler holt zurück % | Mitspieler % | Wechsel mit >=2 Spielern im 2-m-Umkreis % (alle / schnell) | Vorgänger < 1,2 m % (alle / schnell) | Wand <0,8 s zuvor % (alle / schnell) |
|---|---|---|---|---|---|---|---|---|---|
| hinterhof | 132.8 | 52.8 | 70.1 | 55.3 | 52.9 | 47.1 | 40.5 / 46.9 | 51.1 / 59.0 | 14.5 / 10.0 |
| halle | 130.1 | 51.7 | 67.3 | 55.1 | 57.2 | 42.8 | 43.0 / 49.6 | 58.7 / 65.5 | 6.7 / 4.7 |
| park | 155.0 | 50.3 | 77.9 | 54.1 | 57.6 | 42.4 | 37.5 / 43.4 | 55.7 / 63.0 | 1.2 / 1.4 |
| parkplatz | 135.4 | 45.9 | 62.2 | 49.9 | 60.0 | 40.0 | 40.8 / 46.9 | 60.3 / 70.1 | 5.2 / 2.4 |
| ascheplatz | 158.3 | 46.3 | 73.2 | 50.4 | 58.5 | 41.5 | 31.6 / 36.5 | 52.9 / 61.6 | 1.9 / 2.1 |
| rasenplatz | 151.6 | 36.9 | 56.0 | 40.9 | 63.2 | 36.8 | 20.9 / 29.9 | 48.3 / 63.3 | 2.6 / 3.6 |
| sportplatz | 126.8 | 29.3 | 37.1 | 35.9 | 65.9 | 34.1 | 15.2 / 22.6 | 44.6 / 65.8 | 2.3 / 2.2 |
| grossfeld | 109.3 | 27.3 | 29.9 | 33.2 | 66.7 | 33.3 | 13.1 / 24.6 | 40.4 / 66.3 | 2.1 / 2.8 |

### Bereinigt um Standards (Anstoß/Einwurf/Ecke/Freistoß-Auslösung zählt weder als Wechsel noch als schneller Wechsel)

| Platz | Wechsel/Spiel | schnell % | schnell/Spiel | Tore | Schüsse | Pässe | Stochern gew./Spiel | Grätsche gew./Spiel | Fehlannahmen | Fouls | Wiederholer-gleicher-Spieler (A-B-A) % der schnellen | A-B-A durch Sperrenende (bereit <0,1 s) % der schnellen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hinterhof | 128.9 | 53.2 | 68.5 | 3.2 | 47.4 | 77.3 | 1.8 | 2.4 | 18.9 | 4.8 | 52.9 | 5.4 |
| halle | 126.5 | 51.4 | 65.0 | 2.4 | 29.5 | 80.7 | 3.5 | 3.1 | 15.8 | 4.8 | 57.2 | 5.4 |
| park | 131.8 | 50.5 | 66.6 | 1.7 | 23.8 | 105.0 | 2.2 | 9.7 | 6.9 | 7.8 | 57.6 | 4.9 |
| parkplatz | 129.8 | 47.1 | 61.1 | 1.9 | 26.0 | 94.0 | 2.3 | 2.5 | 10.8 | 5.4 | 60.0 | 5.7 |
| ascheplatz | 134.2 | 47.4 | 63.5 | 3.1 | 28.2 | 114.8 | 3.0 | 4.1 | 8.8 | 5.0 | 58.5 | 5.3 |
| rasenplatz | 123.8 | 38.5 | 47.7 | 3.5 | 32.8 | 121.5 | 2.4 | 8.9 | 14.3 | 6.5 | 63.2 | 4.1 |
| sportplatz | 98.3 | 31.5 | 31.0 | 3.2 | 28.4 | 112.4 | 1.4 | 6.8 | 19.8 | 6.5 | 65.9 | 4.2 |
| grossfeld | 84.4 | 30.2 | 25.5 | 3.5 | 25.3 | 92.4 | 1.5 | 6.0 | 18.5 | 4.5 | 66.7 | 5.0 |

### Ursache des schnellen Wechsels (Anteil an allen schnellen Wechseln in %, Platz-Spalten); letzte Spalte: Quote „schnell“ innerhalb der Ursache (alle Plätze)

| Ursache (Auslöser des 2. Wechsels) | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld | schnell-Quote Ursache |
|---|---|---|---|---|---|---|---|---|---|
| touch über Dribbling, Vorgänger dran (Ballverlust im Duell) | 29.4 | 35.0 | 29.0 | 41.0 | 28.7 | 31.7 | 33.8 | 30.3 | 49.9 (3052/6112) |
| kick_pass über pass | 12.8 | 12.3 | 10.9 | 12.8 | 13.6 | 12.1 | 12.4 | 12.6 | 50.8 (1175/2314) |
| touch über Pass (Abfangen) | 11.1 | 14.3 | 11.4 | 13.9 | 12.7 | 6.7 | 5.5 | 4.4 | 30.3 (1027/3384) |
| restart (Standard/Anstoß) | 2.2 | 3.4 | 14.5 | 1.8 | 13.2 | 14.7 | 16.6 | 14.6 | 31.6 (893/2828) |
| touch nach Tackle-Stoß (Aufnahme) | 1.9 | 4.1 | 5.8 | 3.5 | 5.0 | 6.9 | 5.7 | 9.0 | 80.9 (462/571) |
| miscontrol (Fehlannahme harter Ball) | 10.7 | 8.9 | 1.0 | 4.7 | 1.4 | 1.2 | 2.0 | 1.8 | 45.7 (403/882) |
| keeper_parry (Parade/Fausten) | 4.6 | 3.4 | 3.0 | 3.4 | 4.5 | 3.4 | 1.7 | 0.7 | 35.2 (320/908) |
| slide (Grätsche gewonnen) | 2.1 | 2.2 | 5.6 | 1.8 | 2.2 | 4.2 | 3.5 | 5.7 | 35.5 (307/864) |
| touch über Dribbling, Vorgänger weg (loser Dribbelball) | 5.2 | 4.5 | 1.8 | 3.4 | 1.6 | 2.3 | 1.9 | 4.0 | 53.8 (291/541) |
| touch über Schuss (Abfangen/Block) | 5.1 | 2.8 | 3.5 | 2.0 | 2.3 | 2.2 | 2.7 | 2.0 | 32.8 (280/854) |
| kick_shoot über shoot | 4.5 | 4.6 | 2.0 | 2.7 | 2.0 | 2.3 | 2.2 | 2.2 | 51.0 (274/537) |
| body_block (Körperblock harter Ball) | 3.9 | 0.1 | 3.1 | 2.3 | 3.3 | 3.2 | 3.2 | 3.5 | 41.2 (262/636) |
| poke_won (Stochern gewonnen) | 1.8 | 3.6 | 1.9 | 2.3 | 3.1 | 3.0 | 2.3 | 2.0 | 67.3 (239/355) |
| touch nach block (loser Ball) | 1.6 | 0.1 | 2.0 | 1.3 | 2.5 | 1.5 | 3.4 | 1.8 | 91.0 (161/177) |
| keeper_catch (Torwart fängt) | 1.6 | 0.2 | 0.8 | 1.6 | 1.0 | 1.2 | 1.2 | 0.8 | 36.6 (100/273) |
| header (Kopfball) über pass | 0.1 | 0.0 | 1.5 | 0.2 | 0.9 | 1.3 | 0.9 | 1.3 | 29.1 (69/237) |
| header (Kopfball) über header | 0.0 | 0.0 | 1.0 | 0.2 | 0.5 | 0.6 | 0.4 | 1.3 | 89.8 (44/49) |
| touch nach header (loser Ball) | 0.0 | 0.0 | 0.5 | 0.3 | 0.5 | 0.5 | 0.1 | 0.8 | 22.5 (32/142) |
| touch nach save (loser Ball) | 0.9 | 0.4 | 0.1 | 0.2 | 0.1 | 0.0 | 0.0 | 0.0 | 11.5 (23/200) |
| header (Kopfball) über save | 0.0 | 0.0 | 0.2 | 0.3 | 0.3 | 0.3 | 0.1 | 0.3 | 94.7 (18/19) |
| header (Kopfball) über shoot | 0.1 | 0.0 | 0.0 | 0.2 | 0.1 | 0.2 | 0.4 | 0.2 | 19.6 (10/51) |
| kick_dribble über pass | 0.0 | 0.1 | 0.2 | 0.0 | 0.1 | 0.0 | 0.0 | 0.2 | 31.8 (7/22) |
| acrobatic:258 | 0.0 | 0.1 | 0.0 | 0.2 | 0.1 | 0.2 | 0.0 | 0.0 | 87.5 (7/8) |
| kick_dribble über shoot | 0.1 | 0.1 | 0.0 | 0.2 | 0.0 | 0.1 | 0.0 | 0.0 | 100.0 (5/5) |
| kick_block über pass | 0.1 | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 0.0 | 0.2 | 83.3 (5/6) |
| header (Kopfball) über block | 0.0 | 0.0 | 0.1 | 0.1 | 0.1 | 0.1 | 0.0 | 0.2 | 100.0 (5/5) |
| kick_block über shoot | 0.1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 100.0 (1/1) |
| kick_pass über shoot | 0.0 | 0.0 | 0.1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 50.0 (1/2) |
| kick_save über shoot | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 (0/1) |

### Schnelle Wechsel je Spiel nach Ursache (absolut)

| Ursache | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| touch über Dribbling, Vorgänger dran (Ballverlust im Duell) | 20.6 | 23.6 | 22.6 | 25.5 | 21.0 | 17.8 | 12.6 | 9.1 |
| kick_pass über pass | 9.0 | 8.3 | 8.5 | 8.0 | 9.9 | 6.8 | 4.6 | 3.8 |
| touch über Pass (Abfangen) | 7.8 | 9.6 | 8.9 | 8.7 | 9.3 | 3.8 | 2.0 | 1.3 |
| restart (Standard/Anstoß) | 1.6 | 2.3 | 11.3 | 1.1 | 9.7 | 8.3 | 6.2 | 4.3 |
| touch nach Tackle-Stoß (Aufnahme) | 1.4 | 2.8 | 4.5 | 2.1 | 3.6 | 3.9 | 2.1 | 2.7 |
| miscontrol (Fehlannahme harter Ball) | 7.5 | 6.0 | 0.8 | 2.9 | 1.1 | 0.7 | 0.8 | 0.6 |
| keeper_parry (Parade/Fausten) | 3.3 | 2.3 | 2.3 | 2.1 | 3.3 | 1.9 | 0.7 | 0.2 |
| slide (Grätsche gewonnen) | 1.4 | 1.4 | 4.4 | 1.1 | 1.6 | 2.4 | 1.3 | 1.7 |
| touch über Dribbling, Vorgänger weg (loser Dribbelball) | 3.6 | 3.0 | 1.4 | 2.1 | 1.1 | 1.3 | 0.7 | 1.2 |
| touch über Schuss (Abfangen/Block) | 3.6 | 1.9 | 2.7 | 1.3 | 1.7 | 1.3 | 1.0 | 0.6 |
| kick_shoot über shoot | 3.1 | 3.1 | 1.6 | 1.7 | 1.4 | 1.3 | 0.8 | 0.7 |
| body_block (Körperblock harter Ball) | 2.8 | 0.1 | 2.4 | 1.4 | 2.5 | 1.8 | 1.2 | 1.1 |
| poke_won (Stochern gewonnen) | 1.3 | 2.4 | 1.5 | 1.4 | 2.3 | 1.7 | 0.8 | 0.6 |
| touch nach block (loser Ball) | 1.1 | 0.1 | 1.6 | 0.8 | 1.9 | 0.8 | 1.3 | 0.6 |

### Zeit seit Ende der Berührungssperre des neuen Ballführers (Anteil % der schnellen Wechsel; alle / nur derselbe Spieler wie vor dem Gegner = A-B-A)

| Platz | <0.1 | 0.1-0.25 | 0.25-0.5 | >=0.5 | im selben Schritt abgelaufen | A-B-A: <0.1 | 0.1-0.25 | 0.25-0.5 | >=0.5 | A-B-A im selben Schritt abgelaufen |
|---|---|---|---|---|---|---|---|---|---|---|
| hinterhof | 5.8 | 7.8 | 8.9 | 50.9 | 26.6 | 10.2 | 12.4 | 14.8 | 18.2 | 44.3 |
| halle | 5.8 | 6.8 | 8.8 | 50.3 | 28.3 | 9.5 | 11.2 | 13.5 | 21.2 | 44.7 |
| park | 5.2 | 6.7 | 8.5 | 52.0 | 27.6 | 8.6 | 10.4 | 13.0 | 24.3 | 43.8 |
| parkplatz | 6.1 | 7.6 | 8.1 | 49.7 | 28.5 | 9.5 | 11.9 | 12.2 | 22.5 | 43.8 |
| ascheplatz | 5.5 | 6.8 | 8.9 | 50.8 | 28.1 | 9.0 | 11.0 | 13.5 | 23.8 | 42.7 |
| rasenplatz | 4.8 | 6.6 | 8.7 | 49.7 | 30.2 | 6.5 | 9.6 | 12.4 | 26.9 | 44.6 |
| sportplatz | 4.3 | 6.2 | 9.0 | 50.2 | 30.3 | 6.3 | 8.4 | 12.9 | 28.0 | 44.5 |
| grossfeld | 5.4 | 5.7 | 7.5 | 45.7 | 35.7 | 7.5 | 8.0 | 11.1 | 23.9 | 49.5 |

### Häufigste Ursachen-Paare schneller Wechsel (alle Plätze zusammen, Anzahl)

- 1463 (15.4 %)  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)  =>  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)
- 673 (7.1 %)  touch über Pass (Abfangen)  =>  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)
- 554 (5.8 %)  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)  =>  kick_pass über pass
- 366 (3.9 %)  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)  =>  touch über Pass (Abfangen)
- 265 (2.8 %)  slide (Grätsche gewonnen)  =>  touch nach Tackle-Stoß (Aufnahme)
- 231 (2.4 %)  kick_pass über pass  =>  touch über Pass (Abfangen)
- 208 (2.2 %)  touch über Pass (Abfangen)  =>  touch über Pass (Abfangen)
- 191 (2.0 %)  poke_won (Stochern gewonnen)  =>  touch nach Tackle-Stoß (Aufnahme)
- 188 (2.0 %)  kick_pass über pass  =>  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)
- 142 (1.5 %)  body_block (Körperblock harter Ball)  =>  touch nach block (loser Ball)
- 141 (1.5 %)  kick_shoot über shoot  =>  restart (Standard/Anstoß)
- 134 (1.4 %)  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)  =>  keeper_parry (Parade/Fausten)
- 129 (1.4 %)  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)  =>  restart (Standard/Anstoß)
- 128 (1.4 %)  miscontrol (Fehlannahme harter Ball)  =>  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)

### Zeitabstand schneller Wechsel zum vorigen Wechsel (Anteil %), und Zeit seit der eigenen letzten Berührung des neuen Ballführers

| Platz | Abstand <0.2 s | Abstand 0.2-0.4 s | Abstand 0.4-0.6 s | Abstand 0.6-0.8 s | Abstand >=0.8 s | eigene Berührung vor <0.2 s | eigene Berührung vor 0.2-0.35 s | eigene Berührung vor 0.35-0.5 s | eigene Berührung vor 0.5-0.75 s | eigene Berührung vor >=0.75 s | eigene Berührung vor keine s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hinterhof | 22.1 | 26.7 | 17.2 | 17.8 | 16.3 | 0.9 | 10.8 | 14.8 | 14.1 | 56.4 | 3.0 |
| halle | 25.9 | 22.6 | 17.1 | 19.1 | 15.4 | 1.4 | 13.5 | 13.6 | 13.0 | 54.5 | 4.0 |
| park | 24.6 | 22.0 | 18.5 | 17.4 | 17.5 | 1.3 | 13.5 | 10.3 | 13.2 | 58.7 | 3.0 |
| parkplatz | 25.6 | 22.7 | 19.2 | 16.6 | 15.9 | 0.7 | 15.8 | 11.1 | 14.0 | 55.0 | 3.4 |
| ascheplatz | 23.0 | 23.2 | 18.4 | 16.3 | 19.1 | 1.8 | 13.3 | 11.7 | 12.6 | 57.2 | 3.4 |
| rasenplatz | 27.6 | 20.0 | 21.3 | 15.3 | 15.8 | 2.2 | 15.1 | 10.3 | 13.9 | 56.3 | 2.2 |
| sportplatz | 29.5 | 23.4 | 18.6 | 15.5 | 13.1 | 1.6 | 17.6 | 8.3 | 14.5 | 54.1 | 3.8 |
| grossfeld | 33.8 | 22.1 | 15.2 | 17.8 | 11.1 | 2.7 | 19.3 | 9.5 | 12.4 | 48.7 | 7.4 |

### Ketten (aufeinanderfolgende schnelle Wechsel; Länge = Zahl der beteiligten Wechsel, Anzahl je Spiel)

- hinterhof: 2er 13.1, 3er 9.3, 4er 3.9, 5er 2.4, 6er 1.2, 7er 0.6, 8er 0.3, 9er 0.3, 10er 0.1, 11er 0.1, 13er 0.1
- halle: 2er 13.4, 3er 7.9, 4er 3.5, 5er 2.5, 6er 1.2, 7er 0.9, 8er 0.3, 9er 0.2, 11er 0.1
- park: 2er 15.8, 3er 10.4, 4er 4.2, 5er 2.5, 6er 1.1, 7er 0.9, 8er 0.5, 9er 0.3, 10er 0.1, 11er 0.1, 14er 0.1, 15er 0.1
- parkplatz: 2er 15.7, 3er 8.1, 4er 3.3, 5er 2.3, 6er 0.8, 7er 0.4, 8er 0.3, 9er 0.2, 10er 0.1, 11er 0.1
- ascheplatz: 2er 17.8, 3er 9.3, 4er 4.3, 5er 2.5, 6er 1.4, 7er 0.5, 8er 0.3, 9er 0.1, 10er 0.1
- rasenplatz: 2er 19.4, 3er 8.4, 4er 3.0, 5er 1.1, 6er 0.5, 7er 0.5, 8er 0.1
- sportplatz: 2er 15.2, 3er 5.8, 4er 1.8, 5er 0.6, 6er 0.3, 7er 0.1, 8er 0.1, 9er 0.1
- grossfeld: 2er 13.7, 3er 4.0, 4er 1.4, 5er 0.4, 6er 0.3, 10er 0.1

### Spieler im 2-m-Umkreis des Balls beim Wechsel (ohne neuen Ballführer), Verteilung 0/1/2/3/4+ in % (schnell)

- hinterhof: 14.2 / 38.9 / 35.9 / 10.5 / 0.6   (alle Wechsel: 19.1 / 40.4 / 31.5 / 8.7 / 0.3)
- halle: 14.6 / 35.7 / 36.4 / 12.3 / 1.0   (alle Wechsel: 18.0 / 39.0 / 32.6 / 9.7 / 0.7)
- park: 18.5 / 38.1 / 30.1 / 12.6 / 0.7   (alle Wechsel: 24.6 / 37.9 / 27.4 / 9.4 / 0.7)
- parkplatz: 11.4 / 41.7 / 35.1 / 10.9 / 0.8   (alle Wechsel: 17.8 / 41.5 / 31.6 / 8.6 / 0.6)
- ascheplatz: 21.2 / 42.2 / 29.4 / 6.7 / 0.4   (alle Wechsel: 28.3 / 40.0 / 26.0 / 5.4 / 0.2)
- rasenplatz: 21.5 / 48.5 / 26.1 / 3.7 / 0.2   (alle Wechsel: 34.2 / 44.9 / 18.3 / 2.4 / 0.2)
- sportplatz: 24.1 / 53.3 / 21.3 / 1.3 / 0.0   (alle Wechsel: 41.9 / 42.9 / 14.4 / 0.8 / 0.0)
- grossfeld: 20.1 / 55.3 / 22.3 / 2.3 / 0.0   (alle Wechsel: 46.1 / 40.8 / 12.0 / 1.1 / 0.0)

### Ursachen aller Wechsel (Anteil %, alle Plätze, mit Folge-Wechsel binnen 1 s %)

- 27.8 %  touch über Dribbling, Vorgänger dran (Ballverlust im Duell)  (Folge-Wechsel binnen 1 s: 52.5 %)
- 15.4 %  touch über Pass (Abfangen)  (Folge-Wechsel binnen 1 s: 43.1 %)
- 12.9 %  restart (Standard/Anstoß)  (Folge-Wechsel binnen 1 s: 14.0 %)
- 10.5 %  kick_pass über pass  (Folge-Wechsel binnen 1 s: 36.2 %)
- 4.1 %  keeper_parry (Parade/Fausten)  (Folge-Wechsel binnen 1 s: 30.8 %)
- 4.0 %  miscontrol (Fehlannahme harter Ball)  (Folge-Wechsel binnen 1 s: 56.0 %)
- 3.9 %  slide (Grätsche gewonnen)  (Folge-Wechsel binnen 1 s: 53.9 %)
- 3.9 %  touch über Schuss (Abfangen/Block)  (Folge-Wechsel binnen 1 s: 38.1 %)
- 2.9 %  body_block (Körperblock harter Ball)  (Folge-Wechsel binnen 1 s: 52.8 %)
- 2.6 %  touch nach Tackle-Stoß (Aufnahme)  (Folge-Wechsel binnen 1 s: 41.2 %)
- 2.5 %  touch über Dribbling, Vorgänger weg (loser Dribbelball)  (Folge-Wechsel binnen 1 s: 42.1 %)
- 2.4 %  kick_shoot über shoot  (Folge-Wechsel binnen 1 s: 81.8 %)
- 1.6 %  poke_won (Stochern gewonnen)  (Folge-Wechsel binnen 1 s: 83.9 %)
- 1.2 %  keeper_catch (Torwart fängt)  (Folge-Wechsel binnen 1 s: 0.7 %)
- 1.1 %  header (Kopfball) über pass  (Folge-Wechsel binnen 1 s: 41.4 %)
- 0.9 %  touch nach save (loser Ball)  (Folge-Wechsel binnen 1 s: 50.0 %)
- 0.8 %  touch nach block (loser Ball)  (Folge-Wechsel binnen 1 s: 57.6 %)
- 0.6 %  touch nach header (loser Ball)  (Folge-Wechsel binnen 1 s: 41.5 %)
- 0.2 %  header (Kopfball) über shoot  (Folge-Wechsel binnen 1 s: 41.2 %)
- 0.2 %  header (Kopfball) über header  (Folge-Wechsel binnen 1 s: 51.0 %)
- 0.1 %  kick_dribble über pass  (Folge-Wechsel binnen 1 s: 86.4 %)
- 0.1 %  header (Kopfball) über save  (Folge-Wechsel binnen 1 s: 73.7 %)
- 0.0 %  acrobatic:258  (Folge-Wechsel binnen 1 s: 100.0 %)
- 0.0 %  kick_block über pass  (Folge-Wechsel binnen 1 s: 100.0 %)
- 0.0 %  kick_dribble über shoot  (Folge-Wechsel binnen 1 s: 100.0 %)
- 0.0 %  header (Kopfball) über block  (Folge-Wechsel binnen 1 s: 80.0 %)
- 0.0 %  kick_pass über shoot  (Folge-Wechsel binnen 1 s: 100.0 %)
- 0.0 %  kick_block über shoot  (Folge-Wechsel binnen 1 s: 100.0 %)
- 0.0 %  kick_save über shoot  (Folge-Wechsel binnen 1 s: 100.0 %)


## 2. Ursachen, nach Gewicht (Zahlen: alle 8 Plätze, 160 Spiele; Zeilen per grep geprüft)
Wie viele Wechsel gibt es überhaupt je Auslöser (Anteil aller Wechsel / Anteil schneller Wechsel an dieser Ursache): Dribbelduell-Berührung 27,8 % / 50 %; Berührung über Pass 15,4 % / 30 %;
Standard-Auslösung 12,9 % / 32 % (Artefakt: Aus nach schnellem Wechsel, auf Großplätzen 13-17 % der „schnellen“); Tritt über Pass 10,5 % / 51 %; Parade 4,1 % / 35 %; Fehlannahme 4,0 % / 46 %; Grätsche gewonnen 3,9 % / 36 %;
Berührung über Schuss 3,9 % / 33 %; Körperblock 2,9 % / 41 %; Aufnahme nach Tackle-Stoß 2,6 % / 81 %; loser Dribbelball 2,5 % / 54 %; Tritt über Schuss 2,4 % / 51 %; Stochern gewonnen 1,6 % / 67 %; Torwart fängt 1,2 % / 37 %.

### Mechanismus 1: Dribbelschaukel durch Berührungs-Klau ohne Sperre für den Verlierer und ohne Schutz für den Gewinner
Messung: 28 % aller Wechsel (30 % der schnellen), davon 50 % binnen 1 s wieder zurück; häufigstes Paar „Dribbelduell → Dribbelduell“ (15,4 % aller schnellen Wechsel). Je Spiel 20,6 (Hinterhof), 23,6 (Halle), 22,6 (Park), 25,5 (Parkplatz),
21,0 (Asche), 17,8 (Rasen), 12,6 (Sport), 9,1 (Großfeld). Das ist der größte Einzelposten des Unterschieds klein/groß (11,5 von 40 schnellen Wechseln Unterschied zwischen Hinterhof und Großfeld je Spiel, rund 30 %). Bei den schnellen Wechseln steht der Vorgänger in 59-70 % der Fälle < 1,2 m daneben; 47-50 % der schnellen Wechsel auf kleinen Plätzen haben ≥ 2 Spieler im 2-m-Umkreis (Großfeld 25 %).
Ursache: Der Klau ist kein Zweikampf, sondern ein Würfelwurf bei Berührung. `dribbleTouch` (`actions.js:746`) nimmt den nächsten Spieler mit `kickCooldown == 0` im Umkreis 0,6 m (`:750`) und ruft `shielded` (`:764`, Funktion `:653-662`):
Der Presser nimmt dem Ballführer (Ball ≤ 1,125 m von ihm) den Ball mit Wahrscheinlichkeit `clamp(0,3 + 0,3·Zweikampf − 0,3·Technik − …, 0,05, 0,5)` (`:658-659`); Misserfolg sperrt ihn 0,35 s (`:660`). Der Gewinner bekommt nur die normale Sperre
0,2-0,32 s (`:778`), der Verlierer keine zusätzliche, und `shielded` gilt sofort wieder für den Ex-Ballführer gegen den neuen. Es entsteht ein symmetrisches Hin und Her im 0,35-s-Takt mit ≈ 30 % je Versuch.
Sperrenende-Effekt: 27-36 % aller schnellen Wechsel (A→B→A: 43-50 %) geschehen im selben Rechenschritt, in dem die Sperre des Zurückholers abläuft (Spalte „im selben Schritt abgelaufen“); die Sperre `kickCooldown` wird in `match.js:283` heruntergezählt, Reihenfolge der Aufrufe `match.js:333-342`.
Stochern/Grätschen sind es nicht: nur 1,3-2,3 gewonnene Stochern und 1,4-4,4 gewonnene Grätschen je Spiel.

### Mechanismus 2: Passabfang-Kaskade (Berührung über Pass und freier Tritt über Pass)
Messung: „Berührung über Pass“ 7,8-9,6 und „Tritt über Pass“ 8,0-9,9 schnelle Wechsel je Spiel auf Hinterhof/Halle/Park/Parkplatz/Asche, 3,8 + 1,3 auf dem Großfeld. 24-27 % der schnellen Wechsel auf kleinen Plätzen (Großfeld 17 %); Paar
„Pass-Abfang → Dribbelduell“ (7,1 %), „Dribbelduell → Tritt über Pass“ (5,8 %), „Tritt über Pass → Abfang“ (2,4 %).
Ursache: Passwege sind auf kleinen Plätzen dicht (nächster Mitspieler 4,5-5,2 m, Passlänge 5,6-8,8 m, 3,5 Spieler im 5-m-Umkreis, mech-audit). `passBeatsPresser` (`actions.js:693-712`, nur in `dribbleTouch` `:763`, nur 0,4 s, `PASS_DUEL_TIME`)
prüft Abfangen nur beim Berührungspfad; der Tritt-Pfad `tryExecute` (`:102`, Ball-Test `:112-121`) lässt einen Gegner einen anrollenden Pass ohne Duell und ohne Kontrolltest direkt weiterspielen (`kick_pass über pass`: Quote „schnell“ 51 %).
Dazu bleibt der abgefangene Ball im Gedränge (Mechanismus 1).
Dieser Block ist teils gewollt (Passquote 70-76 % → 24-30 % abgefangen). Die Schaukel entsteht erst durch den Folgekampf.

### Mechanismus 3: Fehlannahme harter Bälle und Abpraller auf kleinen Plätzen (Hinterhof/Halle/Parkplatz), danach Tackle-Stoß und Körperblock als Verstärker
Messung: Fehlannahme-Wechsel 7,5 (Hinterhof), 6,0 (Halle), 2,9 (Parkplatz) je Spiel, sonst 0,6-1,1; 10,7 / 8,9 / 4,7 % der schnellen Wechsel dort. Körperblock 2,8 je Spiel (Hinterhof, Halle fast 0: Halle hat flatPlay, Ball selten hüfthoch). Dazu
Aufnahme nach Tackle-Stoß (Quote „schnell“ 81 %), Stochern gewonnen (67 %; 84 % mit Folgewechsel), loser Ball nach Block (91 %).
Ursache: Annahmechance `pControl = 0,45 + 0,5·Technik − 0,03·(Tempo − 9)` (`actions.js:786`), gilt ab 9 m/s (`:787`); Schuss- und Passtempo auf Hinterhof/Halle liegt dauernd darüber (Schuss Median 20-26 m/s). Misslingt die Annahme, wird `lastTouch` trotzdem schon vorher
vergeben (`:779`) und der Ball springt mit −0,35 zurück (`:789-791`): Der Abpraller zählt als Ballgewinn des Annehmers und wird vom Vorbesitzer sofort zurückgeholt. `knockBall` (`tackles.js:102-111`, Aufruf `:128`, `:137`) sperrt weder Opfer noch Umstehende; das Opfer (normaler Zustand,
Sperre 0) nimmt den Stoß-Ball wieder auf, während der Tackler in Zustand `tackle`/`poke` noch nicht berühren darf.
Wirkung auf die Quote ist klein: bessere Annahme (Fix E) senkt die Fehlannahmen von 18,9 auf 10,2 je Spiel, den Anteil „schnell“ aber kaum (53,2 → 52,9 %), weil aus dem Abpraller ein Dribbelduell wird.
Nicht ursächlich (gemessen): Wandabpraller (Wand < 0,8 s zuvor nur bei Hinterhof 10 %, Halle 5 %, sonst ≤ 3 % der schnellen), Torwart-Abpraller (1-5 %), Kopfbälle (< 3 %), Kick-Cooldown als eigene Ursache (nur der Takt aus Mechanismus 1).
Verteilung der Zeitabstände: 22-34 % der schnellen Wechsel liegen < 0,2 s nach dem vorigen (Großfeld 34 %), 22-29 % bei 0,2-0,4 s: Keine Häufung bei einer festen Sperrdauer.

## 3. Ausprobierte Änderungen (nur im Audit, Kopie von `src/` per Textersetzung; Stichprobe 20 Spiele je Platz, Rauschen bei Tore/Spiel etwa ±0,4)
Anteil „schnell“ in % (ohne Standards), Basis zuerst:
| Variante | hinterhof | halle | park | parkplatz | asche | rasen | sport | großfeld |
|---|---|---|---|---|---|---|---|---|
| Basis | 53,2 | 51,4 | 50,5 | 47,1 | 47,4 | 38,5 | 31,5 | 30,2 |
| A losslock: Verlierer der Berührung sperrt 0,6 s (`actions.js` vor `:779`) | 46,2 | 42,7 | 45,9 | 40,4 | 38,4 | 35,8 | 24,7 | 22,2 |
| B winlock: Gewinner geschützt 0,6 s, Klauchance halbiert (`shielded` `:658`) | 51,5 | 45,7 | 44,3 | 44,2 | 43,1 | 33,9 | 27,9 | 25,7 |
| C tacklelock: Gegner ≤ 2,5 m nach `knockBall` 0,45 s gesperrt (`tackles.js:111`) | 52,3 | 50,7 | 47,8 | 48,4 | 47,5 | 38,8 | 32,4 | 27,9 |
| D stealdown: Klauchance × 0,6 (`:659`) | 47,6 | 45,3 | 43,5 | 39,7 | 38,7 | 33,7 | 28,1 | 24,8 |
| E control: `pControl` 0,6 + 0,5·T − 0,02·(v−9) (`:786`) | 52,9 | 51,4 | 49,8 | 49,3 | 46,8 | 38,9 | 29,8 | 30,1 |
| A+B+C | 44,8 | 37,8 | 38,9 | 37,7 | 35,6 | 30,7 | 23,2 | 20,1 |
| A+B+C+D+E | 39,0 | 35,6 | 39,1 | 35,6 | 32,5 | 29,2 | 23,1 | 18,2 |
Wechsel je Spiel (ohne Standards) Basis → A+B+C+D+E: 129→99, 127→92, 132→102, 130→103, 134→100, 124→103, 98→84, 84→65. Tore/Spiel, Schüsse, Pässe, Fouls siehe Anhang: Pässe und Schüsse im Rahmen (±10 %), Fouls −10 bis +10 %,
Tore: Hinterhof 3,2 → 1,9 und Halle 2,4 → 1,6 (nur 20 Spiele, Rauschen groß; müsste mit 40 Spielen nachgemessen werden), Großfeld 3,5 → 4,1.

Empfehlungen (nach Wirkung je Aufwand):
1. **A + B** (Verlierer-Sperre, Gewinner-Schutz) als zwei Konstanten in `dribbleTouch`/`shielded`: −5 bis −13 Prozentpunkte allein, kleinste Eingriffe, Kleinplätze profitieren am meisten (Halle −9, Asche −9). Risiko: Ballführer wird schwerer zu stehlen, mehr Dribbel-Tore auf kleinen Plätzen; Wert der Sperre (0,6 s) und Schutz (0,6 s, ×0,5) sind nicht aus einer Quelle, sondern Prototypwerte.
2. **D** (Klauchance senken, 0,3 → ~0,18) wirkt am stärksten auf Asche/Park/Parkplatz (−8 bis −9 Punkte), senkt aber auch Gewinne durch Stochern/Pressing, daher mit A/B kombinieren und lieber Konstante 0,3 selbst (`:658`) statt Faktor anpassen. Risiko: weniger Ballgewinne, weniger Tempo, Grätschen/Stochern übernehmen die Rolle.
3. **C** (Tackle-Stoß sperrt Opfer) bringt wenig (−0,5 bis −2,3), nur sinnvoll als Teil von A+B+C, weil „Aufnahme nach Tackle-Stoß“ 81 % schnell ist (kleine Menge: 2,6 % aller Wechsel).
4. **E** (Annahme) nicht zur Senkung der Quote; nur als Spielgefühl-Entscheidung (Fehlannahmen 18,9 → 10,2 je Spiel auf dem Hinterhof; mech-audit zeigt 4,1 % je Berührung, ohne Quelle).
5. Standards: Auslösung nach Aus als „Wechsel“ nicht mitzählen (Messartefakt in `mech-audit.mjs`, 13-17 % der schnellen Wechsel auf Parks/Rasen/Sport/Großfeld). Nicht für Hinterhof/Halle/Parkplatz (Wände).
Für Passabfang-Kaskade (Mechanismus 2) nicht ausprobiert: Duell auch im Tritt-Pfad (`tryExecute` `:112`) verlangen und Folgetritt des Abfangenden verzögern. Erwartung: größte verbleibende Reserve auf kleinen Plätzen (17-19 schnelle Wechsel je Spiel), aber Eingriff in die Passabfangrate (Passquote 70-76 %) – erst Zielwert festlegen.

## 4. Mögliche Messfehler
- „Wechsel“ zählt jede Zuweisung von `lastTouch`, auch eine misslungene Annahme oder Ablenkung (ein Abpraller gilt als Besitzwechsel). In echten Daten (Opta „Turnover“, Duelle gewonnen) zählt das nicht gleich; Vergleich 1:1 daher nicht möglich.
- Mehrere Zuweisungen im selben Schritt werden einzeln gezählt (mech-audit fasst sie zu einem zusammen): 122 gegenüber 120 Wechsel/Spiel Hinterhof im Test mit 3 Spielen.
- Ursache = Funktion der Zuweisung plus vorige Ballaktion, keine Absicht der KI. „Vorgänger dran“ = Vorgänger < 1,2 m vom Ball (nicht Zeit).
- Spalte „im selben Schritt abgelaufen“ folgt aus fehlendem Messwert (Sperre am Ende des vorigen Schritts > 0); bei Wechsel durch zwei Zuweisungen im selben Schritt kann das auch anders entstehen.
- Prototyp-Fixes verändern die Spielverläufe (andere Zufallsfolge); Tore/Schüsse mit 20 Spielen nur grob.
- Mannschaften = Voreinstellungsteams, kein Heimvorteil; Stichprobe 20 Spiele je Platz (mech-audit: 40).

## 5. Reproduktion
`node scripts/pingpong-audit.mjs run hinterhof 20 --out=/pfad/hinterhof.json` (je Platz; `--fix=losslock,winlock,tacklelock,stealdown,control` für Prototypen), dann `node scripts/pingpong-audit.mjs table /pfad/*.json`. Fix-Läufe kopieren `src/` nach `$PP_TMP` bzw. `os.tmpdir()`, `src/` bleibt unberührt.

## 6. Referenzen (nur belegt)
- Keine belastbare Quelle für „Ballbesitzwechsel je Spiel“ oder „Wechsel binnen 1 s“ gefunden (Suche 2026-10-15). Nicht verwendbar: Opta zählt Besitz über Pässe, nicht über Wechsel.
- Nur Suchtreffer (Seite nicht abrufbar, Zahl ungeprüft): The FA, Game Insights, EPL 2025/26, „Fulham fewest turnovers per game (90), Brighton most (103)“, „70 % of possessions start with a turnover“,
  https://community.thefa.com/coaching/b/insights-analysis-blogs/posts/game-phases-and-moments-mastering-the-middle-3rd-transition . Definition von „Turnover“ dort unbekannt (vermutlich Ballverluste je Mannschaft, also ~180-200 beide Teams je 90 Minuten); NICHT als Zielwert verwenden.
- Frauen-WM 2015: 3740 Ballbesitzphasen in 52 Spielen, ≈ 72 je Spiel beide Teams (eigene Rechnung aus Suchtreffer https://frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.00487/text, Definition „possession“ der Studie nicht geprüft).
- CIES: Celtic 23,5 s je Ballbesitz, Gegner 11,1 s (https://football-observatory.com/Ball-possession-Celtic-heads-the-rankings); Größenordnung 10-25 s je Ballbesitzphase im Profifußball. Mit Raffung (Faktor 15-30) und Platzgröße nicht übertragbar.
- Im Spiel: 109-158 Wechsel je 180-360 s; mittlere Dauer zwischen Wechseln 1,4-3,3 s (eigene Rechnung Spielzeit/Wechsel). Das liegt weit unter 10 s, aber die Zeitraffung (Aktionen gerafft, Physik in Echtzeit) erklärt einen Teil nicht: Es gibt dafür keinen belegten Zielwert.

## Anhang: Vergleich der Varianten (20 Spiele je Platz)

schnell % (bereinigt um Standards)
| Variante | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| base | 53.2 | 51.4 | 50.5 | 47.1 | 47.4 | 38.5 | 31.5 | 30.2 |
| f_loss | 46.2 | 42.7 | 45.9 | 40.4 | 38.4 | 35.8 | 24.7 | 22.2 |
| f_win | 51.5 | 45.7 | 44.3 | 44.2 | 43.1 | 33.9 | 27.9 | 25.7 |
| f_tack | 52.3 | 50.7 | 47.8 | 48.4 | 47.5 | 38.8 | 32.4 | 27.9 |
| f_all | 44.8 | 37.8 | 38.9 | 37.7 | 35.6 | 30.7 | 23.2 | 20.1 |
| f_steal | 47.6 | 45.3 | 43.5 | 39.7 | 38.7 | 33.7 | 28.1 | 24.8 |
| f_ctl | 52.9 | 51.4 | 49.8 | 49.3 | 46.8 | 38.9 | 29.8 | 30.1 |
| f_combo | 39.0 | 35.6 | 39.1 | 35.6 | 32.5 | 29.2 | 23.1 | 18.2 |

Wechsel/Spiel (ohne Standards)
| Variante | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| base | 128.9 | 126.5 | 131.8 | 129.8 | 134.2 | 123.8 | 98.3 | 84.4 |
| f_loss | 118.2 | 108.3 | 120.8 | 113.8 | 116.8 | 117.5 | 90.7 | 77.2 |
| f_win | 127.8 | 112.9 | 121.6 | 121.8 | 124.5 | 117.3 | 94.0 | 79.7 |
| f_tack | 127.7 | 121.4 | 124.3 | 133.5 | 132.3 | 124.9 | 99.5 | 82.0 |
| f_all | 115.7 | 104.0 | 110.7 | 113.3 | 115.4 | 110.0 | 87.9 | 74.8 |
| f_steal | 116.9 | 102.1 | 112.5 | 109.2 | 105.3 | 102.3 | 86.8 | 70.5 |
| f_ctl | 132.1 | 123.8 | 131.3 | 133.3 | 134.9 | 120.6 | 96.7 | 80.8 |
| f_combo | 99.3 | 92.3 | 102.3 | 102.7 | 99.7 | 102.6 | 83.8 | 65.2 |

Tore/Spiel
| Variante | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| base | 3.2 | 2.4 | 1.7 | 1.9 | 3.1 | 3.5 | 3.2 | 3.5 |
| f_loss | 2.7 | 1.9 | 2.6 | 1.9 | 3.1 | 3.8 | 3.5 | 4.3 |
| f_win | 3.4 | 1.9 | 1.8 | 1.9 | 3.0 | 4.4 | 3.3 | 4.2 |
| f_tack | 3.8 | 2.3 | 2.3 | 2.3 | 3.1 | 3.3 | 3.4 | 4.0 |
| f_all | 2.1 | 1.6 | 1.8 | 2.2 | 2.7 | 3.5 | 2.9 | 3.9 |
| f_steal | 2.7 | 2.6 | 2.7 | 1.4 | 2.8 | 3.1 | 2.5 | 3.9 |
| f_ctl | 3.6 | 2.0 | 2.4 | 2.1 | 2.9 | 3.0 | 2.9 | 4.0 |
| f_combo | 1.9 | 1.6 | 1.8 | 2.4 | 3.1 | 3.3 | 3.1 | 4.1 |

Schüsse/Spiel
| Variante | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| base | 47.4 | 29.5 | 23.8 | 26.0 | 28.2 | 32.8 | 28.4 | 25.3 |
| f_loss | 47.3 | 26.4 | 24.5 | 25.3 | 25.9 | 33.8 | 27.1 | 26.4 |
| f_win | 48.3 | 28.5 | 21.4 | 26.7 | 27.4 | 31.3 | 28.8 | 26.9 |
| f_tack | 48.1 | 29.3 | 25.1 | 27.2 | 25.9 | 29.6 | 27.9 | 27.4 |
| f_all | 46.8 | 24.6 | 23.5 | 22.4 | 22.9 | 31.3 | 26.8 | 26.9 |
| f_steal | 47.0 | 29.8 | 25.9 | 25.9 | 26.9 | 31.7 | 26.9 | 26.6 |
| f_ctl | 48.9 | 27.6 | 25.4 | 26.6 | 25.6 | 29.7 | 26.9 | 28.0 |
| f_combo | 44.4 | 27.8 | 22.8 | 26.2 | 25.9 | 31.4 | 28.0 | 28.9 |

Pässe/Spiel
| Variante | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| base | 77.3 | 80.7 | 105.0 | 94.0 | 114.8 | 121.5 | 112.4 | 92.4 |
| f_loss | 73.4 | 79.5 | 106.5 | 92.8 | 112.0 | 120.1 | 112.2 | 93.5 |
| f_win | 75.3 | 80.3 | 106.1 | 94.5 | 114.7 | 123.5 | 113.6 | 91.8 |
| f_tack | 74.5 | 77.4 | 106.0 | 94.7 | 113.4 | 122.1 | 112.0 | 92.3 |
| f_all | 70.3 | 81.9 | 102.8 | 97.2 | 114.0 | 117.8 | 111.8 | 92.1 |
| f_steal | 76.0 | 83.8 | 109.0 | 96.7 | 114.5 | 123.2 | 114.5 | 92.8 |
| f_ctl | 74.8 | 84.0 | 106.7 | 94.8 | 116.0 | 120.3 | 116.3 | 90.2 |
| f_combo | 73.0 | 80.2 | 105.3 | 95.7 | 117.4 | 123.9 | 112.8 | 92.8 |

Fouls/Spiel
| Variante | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| base | 4.8 | 4.8 | 7.8 | 5.4 | 5.0 | 6.5 | 6.5 | 4.5 |
| f_loss | 4.0 | 4.5 | 6.8 | 4.5 | 5.3 | 6.3 | 6.8 | 4.1 |
| f_win | 4.5 | 4.9 | 6.2 | 4.6 | 4.9 | 6.4 | 5.9 | 4.8 |
| f_tack | 4.3 | 4.6 | 7.3 | 5.7 | 6.1 | 7.5 | 6.3 | 5.0 |
| f_all | 3.9 | 4.5 | 6.8 | 4.7 | 5.1 | 6.8 | 7.2 | 4.4 |
| f_steal | 4.5 | 4.2 | 8.6 | 4.5 | 5.2 | 6.3 | 7.5 | 4.7 |
| f_ctl | 4.5 | 4.8 | 8.4 | 5.3 | 4.9 | 6.5 | 5.8 | 4.0 |
| f_combo | 3.5 | 4.4 | 7.5 | 4.8 | 4.8 | 7.2 | 6.8 | 4.5 |

Fehlannahmen/Spiel
| Variante | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| base | 18.9 | 15.8 | 6.9 | 10.8 | 8.8 | 14.3 | 19.8 | 18.5 |
| f_loss | 17.4 | 13.7 | 7.6 | 10.6 | 8.6 | 16.1 | 19.2 | 17.9 |
| f_win | 18.4 | 15.4 | 7.1 | 10.7 | 9.2 | 15.7 | 20.4 | 19.4 |
| f_tack | 16.6 | 14.8 | 7.9 | 11.4 | 8.8 | 13.9 | 18.9 | 18.2 |
| f_all | 16.9 | 14.3 | 8.3 | 9.7 | 7.1 | 13.5 | 18.7 | 18.4 |
| f_steal | 18.4 | 15.9 | 8.3 | 11.0 | 9.3 | 15.8 | 20.1 | 18.0 |
| f_ctl | 10.2 | 9.7 | 4.0 | 6.5 | 4.7 | 7.9 | 12.6 | 9.8 |
| f_combo | 9.7 | 10.6 | 4.2 | 6.0 | 4.8 | 8.8 | 10.4 | 10.6 |

Stochern gew.+Grätsche gew./Spiel
| Variante | hinterhof | halle | park | parkplatz | ascheplatz | rasenplatz | sportplatz | grossfeld |
|---|---|---|---|---|---|---|---|---|
| base | 4.1 | 6.6 | 11.9 | 4.8 | 7.0 | 11.3 | 8.2 | 7.5 |
| f_loss | 4.5 | 6.0 | 13.4 | 5.5 | 6.1 | 12.3 | 8.9 | 6.0 |
| f_win | 5.2 | 5.3 | 12.7 | 5.5 | 6.1 | 10.1 | 8.1 | 6.4 |
| f_tack | 4.8 | 6.3 | 11.7 | 5.0 | 6.3 | 11.8 | 8.8 | 6.6 |
| f_all | 4.2 | 4.9 | 11.6 | 5.3 | 7.2 | 12.6 | 9.2 | 6.9 |
| f_steal | 5.1 | 5.3 | 11.9 | 4.7 | 4.9 | 9.8 | 8.6 | 6.7 |
| f_ctl | 4.5 | 6.0 | 12.4 | 6.0 | 6.8 | 10.3 | 7.5 | 7.0 |
| f_combo | 4.4 | 5.5 | 11.2 | 4.5 | 6.3 | 11.4 | 9.3 | 7.0 |


## 7. Umsetzung A + B und Körper (Stand 2026-10-16, Messung am Spiel selbst)
Code: `src/sim/strength.js` (Konstanten `PINGPONG`, `STRENGTH_FX`, Ableitung `deriveStrength`), `actions.js` (`shielded`, `dribbleTouch`, `headerTouch`), `tackles.js`, `holding.js`.
- **A** Verlierer einer Berührung darf den Ball 0.6 s nicht per Berührung zurückholen (`PINGPONG.loserLock`). **B** Gewinner 0.6 s geschützt, Klauchance halbiert (`winnerProtect`, `protectedStealMul`).
  Umgesetzt wie der Audit-Prototyp (jede Berührung, die den Ball vom Gegner holt, nicht nur Dribbelklau: Abfangen eines Passes eingeschlossen).
- **C** (`PINGPONG.tackleLock`, nur der Verlierer eines gewonnenen Stochern/einer Grätsche): gemessen, bringt nichts über A+B hinaus (Anteil <1 s ±1 Punkt, im Rauschen), Wert bleibt 0 (aus).
- **Körper** („strength“, UI Körper/Strength): Wirkung mittelwertneutral (Differenzen bzw. Mitte 0,5), daher keine Verschiebung der Gesamtwerte, nur Stärkere gegen Schwächere. Konstanten siehe `STRENGTH_FX`.
Messung: `PP_CFG=base|ab|abs|abc node scripts/mech-audit.mjs match <Platz> 40` und `node scripts/pingpong-audit.mjs run <Platz> 40`, Seeds 900+i, 40 Spiele je Platz. `base` reproduziert den Stand vor der Änderung bitgleich
(geprüft gegen eine Kopie von HEAD, mech-audit halle/rasenplatz 4 Spiele). Stichproben-Rauschen Tore/Spiel etwa ±0,4.

### mech-audit (40 Spiele je Platz): base = vorher, ab = A+B, abs = A+B+Körper, abc = A+B+C

flips
| Platz | base | ab | abs | abc |
|---|---|---|---|---|
| hinterhof | 130.7 | 111.5 | 115.33 | 114.3 |
| halle | 126.92 | 106.65 | 105.08 | 106.92 |
| park | 151.95 | 135.53 | 135.53 | 133.8 |
| parkplatz | 137.63 | 117.53 | 117.2 | 117.97 |
| ascheplatz | 152.1 | 135.5 | 136.65 | 135.05 |
| rasenplatz | 152.45 | 138.22 | 136.97 | 137.75 |
| sportplatz | 126.2 | 118.25 | 118.85 | 113.72 |
| grossfeld | 109.85 | 99.75 | 101.1 | 98.85 |

quick
| Platz | base | ab | abs | abc |
|---|---|---|---|---|
| hinterhof | 52.1 | 43.2 | 44.3 | 43.9 |
| halle | 51.1 | 40.4 | 38.9 | 39.7 |
| park | 49.1 | 42.1 | 41.5 | 40.3 |
| parkplatz | 47.2 | 36.6 | 36.9 | 37.1 |
| ascheplatz | 44.7 | 35 | 35.2 | 35.5 |
| rasenplatz | 37.3 | 32.1 | 31.1 | 30.5 |
| sportplatz | 30.8 | 23.8 | 24.3 | 23.1 |
| grossfeld | 27.2 | 21 | 21.7 | 20.4 |

goals
| Platz | base | ab | abs | abc |
|---|---|---|---|---|
| hinterhof | 3.2 | 3.13 | 2.98 | 2.65 |
| halle | 2.17 | 2.02 | 2.1 | 2.02 |
| park | 2 | 2.17 | 1.9 | 2.17 |
| parkplatz | 1.8 | 2.17 | 2.38 | 2.2 |
| ascheplatz | 3.08 | 3.15 | 3.42 | 3.05 |
| rasenplatz | 3.9 | 3.33 | 3.23 | 3.77 |
| sportplatz | 3.42 | 3.4 | 3.1 | 3.02 |
| grossfeld | 3.75 | 4.17 | 4.1 | 3.9 |

shots
| Platz | base | ab | abs | abc |
|---|---|---|---|---|
| hinterhof | 47 | 46.35 | 45.13 | 45.9 |
| halle | 29.02 | 27.23 | 26.02 | 26.07 |
| park | 24.2 | 22.5 | 22.98 | 23.57 |
| parkplatz | 25.68 | 24.1 | 24.6 | 24.43 |
| ascheplatz | 27.48 | 24.27 | 25.05 | 24 |
| rasenplatz | 32.5 | 32.33 | 31.25 | 31.95 |
| sportplatz | 27.43 | 26.18 | 26.85 | 26.73 |
| grossfeld | 26.2 | 27.15 | 27.13 | 26.8 |

pass
| Platz | base | ab | abs | abc |
|---|---|---|---|---|
| hinterhof | 73.1 | 74.1 | 72.4 | 73.5 |
| halle | 71.4 | 72.4 | 70.8 | 71.3 |
| park | 69.7 | 70.3 | 69.9 | 70.5 |
| parkplatz | 70.7 | 72 | 70.2 | 71 |
| ascheplatz | 71.8 | 71.7 | 71.1 | 71.9 |
| rasenplatz | 73.6 | 73.9 | 72.3 | 73.9 |
| sportplatz | 76.1 | 75 | 75.7 | 76.5 |
| grossfeld | 69.1 | 70.9 | 70.2 | 71 |

slide
| Platz | base | ab | abs | abc |
|---|---|---|---|---|
| hinterhof | 55 | 55.8 | 55.6 | 54.9 |
| halle | 61.8 | 65.1 | 66.3 | 67.3 |
| park | 63.7 | 64.3 | 67.4 | 63.1 |
| parkplatz | 50.2 | 56.8 | 52.4 | 49.7 |
| ascheplatz | 62.9 | 60.2 | 57.3 | 56.7 |
| rasenplatz | 60.8 | 63.6 | 58.7 | 59.3 |
| sportplatz | 58.3 | 60.9 | 60.9 | 61.5 |
| grossfeld | 57.8 | 54.6 | 57.1 | 60.2 |

poke
| Platz | base | ab | abs | abc |
|---|---|---|---|---|
| hinterhof | 28.4 | 28.7 | 30 | 28.1 |
| halle | 36.5 | 31.9 | 33.9 | 30.3 |
| park | 26.5 | 38.4 | 27.7 | 29.4 |
| parkplatz | 29.1 | 31.2 | 28.2 | 32.6 |
| ascheplatz | 25.6 | 28.5 | 26.9 | 34.9 |
| rasenplatz | 29 | 28.2 | 26.9 | 28.4 |
| sportplatz | 28.3 | 28.8 | 30.3 | 23.1 |
| grossfeld | 35 | 33.3 | 31.3 | 33 |

fouls
| Platz | base | ab | abs | abc |
|---|---|---|---|---|
| hinterhof | 4.22 | 3.7 | 3.58 | 3.88 |
| halle | 4.78 | 4.72 | 4.7 | 4.4 |
| park | 7.42 | 6.4 | 7.15 | 7.42 |
| parkplatz | 4.83 | 4.35 | 4.55 | 4.55 |
| ascheplatz | 5.03 | 5.15 | 5.17 | 4.3 |
| rasenplatz | 6.45 | 6.5 | 6.53 | 6.6 |
| sportplatz | 6.63 | 6.4 | 6.8 | 6.47 |
| grossfeld | 4.88 | 4.5 | 4.88 | 4.47 |


### pingpong-audit (40 Spiele je Platz, ohne Standards)

Wechsel/Spiel (ohne Standards)
| Platz | base | ab | abs |
|---|---|---|---|
| hinterhof | 128.6 | 109.6 | 113.3 |
| halle | 125.3 | 105.3 | 103.5 |
| park | 131.1 | 116.2 | 114.0 |
| parkplatz | 133.2 | 113.5 | 112.3 |
| ascheplatz | 128.9 | 115.2 | 114.7 |
| rasenplatz | 126.1 | 110.8 | 110.4 |
| sportplatz | 99.6 | 93.8 | 93.3 |
| grossfeld | 85.8 | 75.9 | 75.5 |

schnell % (ohne Standards)
| Platz | base | ab | abs |
|---|---|---|---|
| hinterhof | 52.6 | 43.4 | 44.3 |
| halle | 50.8 | 40.0 | 38.4 |
| park | 50.0 | 42.4 | 41.4 |
| parkplatz | 48.5 | 38.0 | 38.1 |
| ascheplatz | 46.4 | 36.0 | 36.2 |
| rasenplatz | 39.8 | 33.1 | 32.3 |
| sportplatz | 33.2 | 24.9 | 24.8 |
| grossfeld | 29.7 | 22.1 | 22.5 |

A-B-A gleicher Spieler % der schnellen
| Platz | base | ab | abs |
|---|---|---|---|
| hinterhof | 54.5 | 42.4 | 43.1 |
| halle | 58.6 | 44.3 | 43.6 |
| park | 57.8 | 48.6 | 47.0 |
| parkplatz | 61.5 | 50.2 | 48.7 |
| ascheplatz | 59.1 | 50.5 | 50.5 |
| rasenplatz | 62.7 | 54.5 | 52.7 |
| sportplatz | 66.9 | 59.9 | 58.3 |
| grossfeld | 67.3 | 59.4 | 57.7 |

Tore/Spiel
| Platz | base | ab | abs |
|---|---|---|---|
| hinterhof | 3.2 | 3.1 | 3.0 |
| halle | 2.2 | 2.0 | 2.1 |
| park | 2.0 | 2.2 | 1.9 |
| parkplatz | 1.8 | 2.2 | 2.4 |
| ascheplatz | 3.1 | 3.1 | 3.4 |
| rasenplatz | 3.9 | 3.3 | 3.2 |
| sportplatz | 3.4 | 3.4 | 3.1 |
| grossfeld | 3.8 | 4.2 | 4.1 |

Schüsse/Spiel
| Platz | base | ab | abs |
|---|---|---|---|
| hinterhof | 47.0 | 46.4 | 45.1 |
| halle | 29.0 | 27.2 | 26.0 |
| park | 24.2 | 22.5 | 23.0 |
| parkplatz | 25.7 | 24.1 | 24.6 |
| ascheplatz | 27.5 | 24.3 | 25.1 |
| rasenplatz | 32.5 | 32.3 | 31.3 |
| sportplatz | 27.4 | 26.2 | 26.9 |
| grossfeld | 26.2 | 27.1 | 27.1 |

Pässe/Spiel
| Platz | base | ab | abs |
|---|---|---|---|
| hinterhof | 75.8 | 69.6 | 71.3 |
| halle | 81.9 | 79.5 | 82.5 |
| park | 104.1 | 104.9 | 106.5 |
| parkplatz | 94.0 | 93.9 | 92.4 |
| ascheplatz | 114.5 | 113.3 | 114.3 |
| rasenplatz | 121.0 | 120.0 | 120.8 |
| sportplatz | 112.3 | 110.9 | 111.0 |
| grossfeld | 93.4 | 93.1 | 92.0 |

Stochern gew.+Grätsche gew./Spiel
| Platz | base | ab | abs |
|---|---|---|---|
| hinterhof | 4.3 | 4.0 | 4.5 |
| halle | 6.2 | 5.5 | 5.8 |
| park | 11.9 | 12.4 | 12.1 |
| parkplatz | 5.5 | 5.7 | 5.0 |
| ascheplatz | 6.2 | 6.1 | 5.7 |
| rasenplatz | 12.0 | 11.4 | 10.9 |
| sportplatz | 8.8 | 10.2 | 10.2 |
| grossfeld | 7.3 | 6.3 | 6.6 |


### Körper-Wirkung bei extremem Unterschied (40 Spiele, Team 0 alle Feldspieler Körper x, Team 1 y; Rasenplatz / Halle)
Tore je Spiel und Schüsse je Spiel (Team 0 : Team 1): Rasenplatz 0,5/0,5: 2,4:1,6 Tore, 16,5:16,1 Schüsse; 0,8/0,2: 3,1:1,3 Tore, 24,3:10,4 Schüsse; 0,2/0,8: 1,6:2,1 Tore, 11,4:22,2 Schüsse.
Halle 0,5/0,5: 1,1:0,8, 15,9:13,6; 0,8/0,2: 1,7:0,6, 23,2:6,3; 0,2/0,8: 0,5:1,6, 6,3:24,3. Ein Unterschied von 0,6 im Mannschaftsmittel kommt im Pool nie vor (1 sigma des Teammittels etwa 0,03-0,04);
einzelne Duelle mit 0,2-0,3 Unterschied schon. Regler: `STRENGTH_FX.duel` (0,4), `shieldPerStrength` (0,4), `poke` (0,3).

### Bundespokal-Kontrolle
Zwischenmessung mit Profi-Aufschlag auch auf Körper (inzwischen zurückgenommen: `bundespokal.js` bleibt unverändert, Profis haben ihren abgeleiteten Körper ohne Aufschlag): Weiter-Chance des Amateurs in % bei 1200 Spielen je Zeile
(±1,0 Punkte): Zweitligist „mittel“ 3,0 / „bezirk“ 5,4; Erstligist „mittel“ 2,4 / „bezirk“ 5,5 (Stand davor, 400 Spiele: 4,8 / 5,3 und 3,5 / 3,8). Mit dem Stand ohne Körper-Aufschlag ist die Kalibrierung noch offen und wird
nach dem Zusammenführen aller Änderungen einmal gemessen (`node scripts/bundespokal-calibrate.mjs 400 <bezirk|mittel> <zweit|erst>`, neu: `SEED0=400` verschiebt die Seeds für zusätzliche Läufe).
