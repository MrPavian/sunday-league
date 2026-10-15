# Messung Spielmechanik und Ballphysik (ROADMAP 11.8, Stand 2026-10-15)
Hinweis: Zeilennummern in Abschnitt 1 teils aus dem Lesen geschätzt (Stand Worktree agent-mech); vor Änderungen per grep prüfen.

Nur Messung, kein Spielcode geändert. Skript: `scripts/mech-audit.mjs` (`phys` = Physiktest je Untergrund; `match <Platz> [N]` = KI gegen KI,
Voreinstellungsmannschaften, Seeds 900+i, aiCoach aus, Standard-Spielzeit „kurz“). Stichprobe 40 Spiele je Platz (Stadion = Großfeld, gleiche
Maße und Seeds, daher identische Werte; nur in der Tabelle doppelt). Rohdaten lagen im Scratchpad (`.../scratchpad/mech/*.json`, `phys.json`).
Kein echtes Android-Gerät, keine Browserprüfung.

## 1. Konstanten (file:line)
Ball (`src/sim/ball.js`): Radius 0,11 (:1), g 9,81 (:2), Pfostenradius 0,06 (:3), Bande `BOARD_BOUNCE` 0,5 (:6). Abprall am Boden nur wenn vy < -1,0:
`vy = -vy * surface.bounce`, horizontal × 0,88 (:47-50). Rollen am Boden: `h * exp(-rollFriction*dt) - rollDecel*dt` (:60-62); in der Luft nur
`h * (1 - 0,04*dt)` (:64). Unter 0,05 m/s Stillstand (:66). Wind drückt Bälle über 0,5 m (:38). Kein Drall/Effet, kein Luftwiderstand in y.
Pfosten/Latte: Reflexion mit Faktor 1,6 (:112, :129). Wand hinter dem Tor: Faktor 0,5 (:99), Fangnetz Halle 0,06 (:93).
Untergründe (`src/sim/surfaces.js`, rollFriction / rollDecel / bounce / bumpiness): Asphalt 0,55/0,45/0,55/0,04 (:8-11) · Beton 0,5/0,4/0,6/0,06 (:21-24) ·
Asche 0,8/0,7/0,45/0,10 (:34-37) · Rasen 0,7/0,6/0,5/0,07 (:47-50) · Parkwiese 0,95/0,8/0,45/0,14 (:60-63) · Halle 0,42/0,35/0,68/0,005 (:73-76) ·
Kunstrasen 0,45/0,4/0,6/0,01 (:86-89, in keinem Platz benutzt). Nässe: `incidents.js:731` (× grip).
Spielerlauf (`actions.js`): Tempo 4,6 + 2,6·pace (:27), Sprint × 1,28 (:28), Beschleunigung 18 m/s² (:63). Reichweite `REACH` 0,75 (:18).
Schuss (`actions.js:174-178`): v = (8 + 18·power) · (0,85 + 0,15·shooting) [· 1,15 Hammer] [· Halle shotBoost 1,2]; vy = 0,8 + 5·power² + Streuanteil;
Streuwinkel σ = 0,025 + 0,16·(1-shooting) + 0,08·Müdigkeit + 0,05·power (+0,005 KI) (:168). Pass (`:304-361`): flach v = clamp(3,5 + 0,75·d, 5,5, 16), vy 0,2
(3,5 bei d > 16 m, nicht Halle) (:356-357); Pass in den Lauf v = clamp(rollFriction·(d+2,5), 6, 15) (:352); Flanke Höchsttempo 24/27 (:223); Befreiungsschlag 15 m/s, vy 5 (:222);
Passstreuung σ = 0,02 + 0,12·(1-passing) + 0,05·Müdigkeit, Tempo-Streuung 8 %·(1-passing) (:360-361). Kopfball max 22 m/s (:555).
Ballmitnahme/Annahme (`dribbleTouch`, `actions.js:737-826`): Berührung nur wenn Ball < 0,6 m, Sperre 0,2-0,32 s (:778); harte Bälle (> 9 m/s) verspringen mit
1 - clamp(0,45 + 0,5·Technik - 0,03·(v-9), 0,2, 0,98) (:785), dann Rückprall × -0,35 (:790) oder Ablenkung (`DEFLECT` :718); Ballführung: Ball läuft mit v·(1+0,1·(1-tech)) + 0,3 + 0,4·(1-tech) vor dem Spieler (:822),
Verspringer pro Berührung mit Chance `bumpiness` (:825). Passabfangen `passBeatsPresser` (:692-712). Zweikampf (`tackles.js`): Grätsche Reichweite 0,95, Stoß 4-7 (`knockBall` :128), Stochern gewinnt
0,32 + 0,45·tackling - 0,35·Technik (:134), Foulchance Grätsche 0,12·(1-tackling) + 0,2 von hinten (:160). Torwart (`actions.js:432-548`): Reichweite 0,85 + 0,75·keeping (:445), Fangchance
0,3 + 0,6·keeping - 0,03·(v-8) (:536), „beaten“ = (v-8)·0,02 + Ecke·0,85 + … (:512). KI-Schussreichweite (`ai.js:750`): (10 + 5·shooting + Stil + brisk·2,5)·small + (halfLength-20)·0,45; Fernschuss + 7 m (:817).
Spielzeitraffung: `HALF_BY_PITCH` (`match.js:44`) Halbzeit 90-180 s statt 45 min = Faktor 15-30; Physik und Lauftempo laufen in Echtzeit, nur die Anzahl der Aktionen je Spiel ist gerafft.

## 2. Messung
### 2a. Direkter Physiktest (ebene Fläche, vy = 0; Stopp-Weg m / Zeit s)
| Untergrund | 3,7 m/s | 10 m/s | 15 m/s | 20 m/s | Anfangsverzögerung bei 20 m/s | Abprall 2 m Fall (m / e²) | 10 m/s mit vy 3,5: Weg |
|---|---|---|---|---|---|---|---|
| Asphalt (Parkplatz) | 4,2 / 3,0 | 14,4 / 4,6 | 23,0 / 5,3 | 31,7 / 5,8 | 11,5 m/s² | 0,57 / 0,28 | 21,3 m |
| Beton (Hinterhof) | 4,7 / 3,3 | 15,9 / 5,1 | 25,3 / 5,8 | 34,9 / 6,4 | 10,4 | 0,68 / 0,34 | 22,8 |
| Asche | 2,8 / 2,0 | 9,8 / 3,1 | 15,7 / 3,5 | 21,7 / 3,9 | 16,7 | 0,38 / 0,19 | 17,1 |
| Rasen | 3,3 / 2,3 | 11,2 / 3,5 | 18,0 / 4,1 | 24,8 / 4,5 | 14,6 | 0,47 / 0,23 | 18,6 |
| Parkwiese | 2,4 / 1,7 | 8,3 / 2,6 | 13,3 / 3,0 | 18,4 / 3,3 | 19,8 | 0,38 / 0,19 | 16,0 |
| Halle | 5,5 / 3,9 | 18,8 / 6,0 | 30,0 / 6,9 | 41,4 / 7,5 | 8,8 | 0,87 / 0,44 | 25,3 |
| Kunstrasen (ungenutzt) | 5,0 / 3,5 | 17,3 / 5,4 | 27,7 / 6,3 | 38,4 / 6,9 | 9,4 | 0,68 / 0,34 | 23,8 |
Mittlere Verzögerung bei 3,7 m/s: Asphalt 1,2 · Beton 1,1 · Asche 1,9 · Rasen 1,6 · Parkwiese 2,2 · Halle 0,95 · Kunst 1,05 m/s². Bei 15 m/s im Mittel 2,2-5,0 m/s².
Rest der Tabellen (6, 25 m/s, Abprallzahlen) im Skriptaufruf `node scripts/mech-audit.mjs phys`.

### 2b. Spiele (40 je Platz, je Spiel; Spieldauer in Spielsekunden)
| | hinterhof | parkplatz | park | asche | rasenpl. | sportpl. | großfeld=stadion | halle |
|---|---|---|---|---|---|---|---|---|
| Spieldauer s | 180 | 210 | 210 | 240 | 300 | 330 | 360 | 180 |
| Tore | 3,20 | 1,80 | 2,00 | 3,08 | 3,90 | 3,42 | 3,75 | 2,17 |
| Schüsse | 47,0 | 25,7 | 24,2 | 27,5 | 32,5 | 27,4 | 26,2 | 29,0 |
| Tore je Schuss % | 6,8 | 7,0 | 8,3 | 11,2 | 12,0 | 12,5 | 14,3 | 7,5 |
| aufs Tor % (Ereignis*) | 26,6 (20 Sp.) | – | – | – | 36,5 (20) | – | 27,3 (20) | – |
| aufs Tor % (Geometrie**) | 39,4 | 38,5 | 39,4 | 47,0 | 39,7 | 33,7 | 18,5 | 17,6*** |
| Pässe (mit Ziel) | 76 | 94 | 104 | 114 | 121 | 112 | 93 | 82 |
| Passquote % | 73,1 | 70,7 | 69,7 | 71,8 | 73,6 | 76,1 | 69,1 | 71,4 |
| Passtempo flach Median / p90 m/s | 7,5 / 11,2 | 7,8 / 12,3 | 8,3 / 13,9 | 9,1 / 15,7 | 11,7 / 16,1 | 13,9 / 16,6 | 15,5 / 16,9 | 8,0 / 14,5 |
| Passlänge Median m | 5,6 | 7,2 | 7,6 | 8,8 | 12,3 | 15,7 | 25,3 | 6,8 |
| Ankunftstempo / Starttempo Median | 0,80 | 0,74 | 0,69 | 0,71 | 0,73 | 0,80 | 0,73 | 0,78 |
| Schusstempo Median m/s (p10-p90) | 20,2 (15,9-22,6) | 22,4 | 21,7 | 22,9 | 23,6 | 23,8 | 23,9 (22,0-27,1) | 26,5 (19,6-28,5) |
| Schussdistanz Median m | 7,7 | – | – | – | 15,5 | – | 31,9 (p90 44) | – |
| Ballkontakt-Wechsel je Spiel | 131 | 138 | 152 | 152 | 152 | 126 | 110 | 127 |
| davon < 1 s nach dem vorigen % („Ping-Pong“) | 52 | 47 | 49 | 45 | 37 | 31 | 27 | 51 |
| Zweikämpfe: Grätschen / gewonnen % | 4,2 / 55 | 5,3 / 50 | 15,2 / 64 | 5,8 / 63 | 15,8 / 61 | 12,3 / 58 | 10,0 / 58 | 5,0 / 62 |
| Stochern / gewonnen % | 7,1 / 28 | 9,7 / 29 | 8,5 / 27 | 10,1 / 26 | 8,2 / 29 | 5,6 / 28 | 4,4 / 35 | 8,5 / 37 |
| Fouls | 4,2 | 4,8 | 7,4 | 5,0 | 6,5 | 6,6 | 4,9 | 4,8 |
| Fehlannahmen je Berührung % | 4,1 | 1,9 | 1,4 | 1,6 | 2,4 | 3,2 | 2,9 | 3,4 |
| Einwürfe / Ecken / Abstöße | 0/0/0 | 0/0/0 | 6,9/4,7/8,1 | 8,4/4,3/8,3 | 7,3/4,0/11,4 | 6,9/3,2/12,8 | 3,6/2,8/12,0 | 0/0/0 |
| Ball in der Luft % der Spielzeit | 17,5 | 13,9 | 26,6 | 28,0 | 31,0 | 30,9 | 31,1 | 2,9 |
| Ball steht still % (längster Stillstand s) | 0,5 (0,7) | 0,5 (0,9) | 0,7 (3,4) | 0,5 (0,7) | 0,4 (0,8) | 0,4 (1,9) | 1,0 (2,9) | 0,5 (0,7) |
| Abstand zum nächsten Mitspieler Mittel m (relativ**** ) | 4,5 (0,42) | 5,2 (0,37) | 5,1 (0,37) | 6,2 (0,38) | 7,9 (0,46) | 8,7 (0,41) | 10,3 (0,39) | 4,8 (0,37) |
| Spieler im 5-m-Umkreis des Balls Mittel | 3,6 | 3,5 | 3,5 | 3,0 | 2,5 | 2,0 | 1,5 | 3,7 |
\* Schuss, auf den binnen 3 s Parade, Fangen oder Tor folgt (wie match-audit). \*\* Flugbahn zum Schusszeitpunkt (ohne Luftwiderstand/Abpraller) kreuzt
Torlinie im Rahmen. In der Halle > 100 % Paraden je „aufs Tor“, weil Bandenschüsse geometrisch nicht erfasst sind. \*\*\* wegen Bande unzuverlässig.
\*\*\*\* geteilt durch √(Fläche/Feldspieler).
Auffällig: kein Ball hängt > 4 s fest (0 Fälle in 360 Spielen); Passquote und Passtempo plausibel; Clumping auf keinem Platz auffällig (10 %-Quantil Abstand
1,5-5,4 m, relativ gleichmäßig 0,37-0,46 über alle Plätze).

## 3. Referenzen (nur belegte Werte; keine Quelle = ausdrücklich so vermerkt)
- Senkrechter Abprall FIFA-Test, Fall 2 m: Beton erwartet 1,35 m (Rückprallzahl e = 0,825); Kunstrasen im FIFA-Programm gemessen 0,92-0,95 m (e ≈ 0,69).
  Colino et al., Sensors 2020, 20(6):1688, https://pmc.ncbi.nlm.nih.gov/articles/PMC7146741 . Zulässig für Kunstrasen „60-100 cm“ (Quality), „60-85 cm“ (Pro):
  FA-Merkblatt https://www.thefa.com/GetIntoFootball/Facilities/~/media/Files/PDF/Get%20into%20Football/AGP_Conditions_of_use_in_FA_Comps_2007_08.ashx (Stand 2007/08, Handbuch 2006; aktuelle Fassung 2024 nicht geprüft).
- Ball selbst auf Stahl 2 m: 120-165 cm je nach Güteklasse (Patent/Händlerangaben, uneinheitlich; Quelle schwach): https://www.wionews.com/sports/fifa-world-cup-7-mandatory-tests-world-cup-ball-undergoes-142866 .
- Futsal-Ball: erster Aufprall aus 2 m zwischen 50 und 65 cm (FIFA-Futsal-Regeln): https://www.thefa.com/football-rules-governance/lawsandrules/laws/futsal/law-2---the-ball .
- Rollverzögerung Spielfeld: britische Norm 1985 verlangt 0,45-1,5 m/s² Ballverzögerung, 90 % der Naturrasen-Messwerte lagen darin (Sekundärangabe aus einer Rechercheantwort,
  Originalnorm BS 7044 nicht eingesehen). FIFA-Rollprüfung: Rollweg 4-10 m (Quality) bzw. 4-8 m (Pro) von einer Rampe (FA-Link oben; Rampenhöhe/Startgeschwindigkeit
  NICHT bestätigt, ich habe 3,7 m/s angenommen = 1 m Rampe, rollend – ungeprüfte Annahme).
- Luftwiderstand: NASA nimmt Cd = 0,25 (https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-on-a-soccer-ball/), moderne Bälle im Windkanal Cd ≈ 0,12-0,15 (Asai & Seo 2013, https://link.springer.com/article/10.1186/2193-1801-2-171).
  Eigene Rechnung (nicht aus Quelle): bei 20 m/s 3,2-5,3 m/s² Verzögerung durch die Luft allein.
- Schusstempo: Spannstoß erfahrener Spieler im Mittel 95-109 km/h (26-30 m/s), U19 beste Schüsse 108,8 km/h (Cometti 2001 u. a., über
  https://www.sportspa.ftos.untz.ba/index.php/sportspa/article/view/82 ). Das sind Maximalschüsse, kein Spielmittel; Amateur-Spielwerte: keine Quelle gefunden.
- Schüsse aufs Tor: 37,6 % im Mittel europäischer Ligen (CIES, 2018/19), Ø Schussdistanz Premier League 17,4 m: https://football-observatory.com/IMG/sites/b5wp/2018/254/en/ .
  Bundesliga ca. 27 Schüsse je Spiel, 3,22 Tore je Spiel (https://bundesliga.com/en/bundesliga/news/germany-tops-european-scoring-charts-premier-league-liga-4838).
- Passquote: Profiligen 66-93 %, nimmt in tieferen Ligen deutlich ab (CIES https://football-observatory.com/Ball-masters-worldwide-PSG-shows-the-way ; Opta-Analyse
  https://theanalyst.com/articles/how-does-the-style-of-football-change-as-you-journey-down-the-english-football-league ). Amateur-Passquoten: keine Quelle gefunden.
- Nicht gefunden: Rollwiderstand Naturrasen/Asche/Asphalt mit Zahlen, Abprall Naturrasen, Amateur-Schusstempo, Fouls/Einwürfe je Amateurspiel, Ballwechsel je Spiel.

## 4. Befunde, nach Gewicht
### 1. Fernschüsse auf dem Großfeld/Stadion (und Sportplatz): Median 32 m, p90 44 m
Gemessen: Schussdistanz Großfeld Median 31,9 m (Mittel 29,8, 20 Spiele, 505 Schüsse); Rasenplatz 15,5 m; Hinterhof 7,7 m. Aufs Tor (Ereignis) 27 % bei Tor/Schuss 14,3 %; geometrisch nur 18,5 %.
Referenz: Ø Schussdistanz Premier League 17,4 m, 37,6 % aufs Tor, ca. 10-15 Tore je 100 Schüsse (CIES/Bundesliga-Links oben).
Ursache: `ai.js:750` Reichweite = (10 + … + brisk·2,5) + (halfLength-20)·0,45 → auf 52,5 m Halblänge ≈ 25 m + brisk-Anteil, Fernschuss + 7 m (:817); `brisk` wächst mit
Raffung und Platzlänge (:745). Zugleich hält die Torwartformel (:512, :536) Schüsse aus 25-40 m kaum (Ereignis-Quote 27 % vs. 14 % Tore), d. h. Fernschüsse sind zu leicht und zu zahlreich.
Änderung: Großfeld-Reichweite deckeln (ca. 22-25 m, Fernschuss nur noch bis + 3 m), `brisk` für `halfLength > 30` nicht weiter wachsen lassen; Tore dafür über bessere Chancen (Strafraum) statt Fernschüsse. Nebenwirkung: weniger Tore/Schüsse auf Großfeld
(Tore 3,75 → ggf. 2,5-3), Golden ändert sich, Bundespokal-Kalibrierung (`scripts/bundespokal-calibrate.mjs`) neu messen. Prüfung: `node scripts/mech-audit.mjs match grossfeld 40` – Schussdistanz Median ≈ 18-22 m, aufs Tor ≈ 35 %, Tore ≈ 2,8-3,2; andere Plätze bitgleich halten (nur `halfLength > 30`).

### 2. Rollen von Pässen: Ball bremst zu stark bei Passtempo, falsche Form der Bremsung
Gemessen (Rasen, 15 m/s): Stopp nach 18 m / 4,1 s, nach 5 m nur noch 11,3 m/s (-25 %). Anfangsverzögerung bei 20 m/s 14,6 m/s² (Parkwiese 19,8, Asche 16,7). Bei 3,7 m/s
Mittel 1,6 m/s² (Rasen), 1,05 (Kunstrasen), 0,95 (Halle): passt zur Spanne 0,45-1,5 nur für Halle/Kunstrasen/Asphalt/Beton, Rasen/Asche/Parkwiese 1,6-2,2 darüber.
Referenz: Verzögerung 0,45-1,5 m/s² (low speed) plus Luftwiderstand ∝ v² (3-5 m/s² bei 20 m/s). Modellrechnung (eigene, mit diesen Bereichen): 15 m/s rollt real 41-100 m, 20 m/s 57-131 m,
Spiel 18 m bzw. 25 m (Rasen). Das Spiel bremst also ∝ v (exp) statt ∝ v² + konstant: schnelle Bälle zu stark, langsame nahezu richtig. Kein Quellenwert für Rasen-Rollwiderstand gefunden – Aussage "zu stark" stützt sich auf die Spanne 0,45-1,5 plus Luftwiderstandsrechnung.
Ursache: `ball.js:60-62` exponentieller Term, `surfaces.js` rollFriction 0,42-0,95; Luft nur 0,04/s (:64) – in der Luft zu wenig, am Boden zu viel. Passtempo-Kopplung: `actions.js:352` (Pass in den Lauf nutzt rollFriction).
Änderung (Vorschlag, zuerst Messung gegen 1-2 Prüfwerte): Bodenbremse = rollDecel (0,45-1,5) + kleiner Luftterm ∝ v² statt exp (z. B. kd = 0,008-0,010 1/m) und rollFriction aus Passformel `actions.js:352` ersetzen durch die tatsächlich resultierende Stopp-Strecke.
Nebenwirkung: Bälle laufen weiter → mehr Aus, schnellere Angriffe, ändert Passquote, Torwart-/Schussdosierung, `receiveSpot` der KI, Golden und alle Plätze (Untergrundunterschied bleibt als Ordnung). Prüfung: `mech-audit phys` (Rasen 15 m/s Stopp > 35 m; Artificial 3,7 m/s innerhalb 4-10 m bleibt) + `match` je Platz (Passquote ≥ 65 %, Aus je Spiel nicht > +30 %).
Offene Frage: Absicht – schnelle Bälle sollen für das Spielgefühl bremsen; Raffung (Plätze kleiner als echt: Hinterhof 24×14 m) rechtfertigt stärkere Bremse auf kleinen Plätzen. Entscheidung Nutzer.

### 3. Abprallzahlen: harte Böden zu tot, Halle zu lebhaft für einen Hallenball
Gemessen (2 m Fall): Beton 0,68 m (e 0,60), Asphalt 0,57 m (e 0,55), Halle 0,87 m, Rasen 0,47 m, Asche 0,38, Parkwiese 0,38, Kunstrasen 0,68 m.
Referenz: Beton 1,35 m (e 0,825) gemessen; Kunstrasen 0,92-0,95 m gemessen, Programmgrenze 0,6-1,0 m; Futsal-Ball 0,50-0,65 m. Naturrasen: keine Quelle.
→ Beton/Asphalt ~ 2× zu niedrig; Halle (Futsal-Ball?) ~ 1,4-1,7× zu hoch (aber Hallenfußball in D auch mit normalem Ball oder Filzball – Annahme klären); Kunstrasen im Spiel ungenutzt.
Ursache: `surfaces.js` bounce (:11, :24, :76) und `ball.js:47`; zusätzlich horizontal × 0,88 je Aufprall und Schwelle vy < -1,0 (:46), kein Drall.
Änderung: Beton 0,6 → 0,75-0,8, Asphalt 0,55 → 0,7-0,75 (Quelle: e 0,825 bei FIFA-Test mit Ball auf Beton, Straßenbelag weicher → konservativ), Halle je nach Ball 0,68 → 0,55-0,6 (Futsal) – Parkplatz/Hinterhof/Halle (Halle: Bande/Boden, Flachpass-Stil, Test `tests/flatplay.test.js`). Nebenwirkung: Hinterhof/Parkplatz mehr Bälle über Kopfhöhe, Verspringer, Torwart; `scripts/flat-audit.mjs`, `board-audit.mjs` und `tests/boardplay.test.js` neu laufen lassen. Prüfung: `mech-audit phys` Abprall 2 m Fall; Spiele: Luftanteil, Tore Hinterhof/Parkplatz.

### 4. „Ping-Pong“: Ballbesitz wechselt auf kleinen Plätzen in der Hälfte der Fälle binnen 1 s
Gemessen: Anteil Ballkontakt-Wechsel < 1 s nach dem vorigen: Hinterhof 52 %, Halle 51 %, Park 49 %, Parkplatz 47 %, Asche 45 %, Rasen 37 %, Sportplatz 31 %, Großfeld 27 %; Wechsel je Spiel 110-152 (bei nur 76-121 Pässen).
Referenz: keine belastbare Quelle gefunden (Opta-/CIES-„Turnover“-Zahlen nicht auffindbar) – daher nur als Spielgefühl-Befund. Hohe Anteile deuten auf Abpraller zwischen zwei Gegnern (Stochern gewinnt nur 26-37 %, `tackles.js:134`,
`knockBall` 3-5/4-7 m/s), Ablenkung (`DEFLECT`), kurze Berührungssperre 0,2-0,32 s (`actions.js:778`).
Änderung: erst Ursache trennen (Messung je Auslöser: Abpraller nach Stochern, Block, Fehlannahme, Schuss-Block); erst dann Konstanten. Nebenwirkung unbekannt. Prüfung: `mech-audit` Spalte flipUnder1sPct (Ziel z. B. < 30 % auf kleinen Plätzen; Zielwert muss der Nutzer festlegen, da keine Quelle).

### 5. Passanzahl sehr niedrig gegenüber Berührungen (Raffung), Fouls/Einwürfe/Ecken deutlich unter echten Werten – Quelle fehlt
Gemessen: Großfeld 93 Pässe (mit Ziel), 655 Berührungen; Fouls 4,9; Einwürfe 3,6; Ecken 2,8 je Spiel. Referenz: keine Amateurwerte gefunden; Profi-Bundesliga ca. 27 Schüsse – das Spiel liegt bei Schüssen (24-32) im Rahmen,
Einwürfe und Ecken sind gegenüber echten Spielen (nach Erinnerung ~30-40 bzw. ~10 je Spiel, NICHT belegt) niedrig. Nur als Hinweis; nicht ändern ohne Quelle.

### 6. Hallenschüsse: Tempo und Verzerrung der Messung
Gemessen: Median 26,5 m/s (p90 28,5, max 33 m/s), Tore/Schuss 7,5 %, Tore 2,17. Referenz: nur Maximalwerte 26-30 m/s (siehe oben) → Hallenmedian auf Maximalniveau. Kommentar im Code sagt „shotBoost: 1.28“, Wert ist 1.2 (`pitch.js`, Zeile mit `flatPlay`). Änderung: Kommentar korrigieren; Tempo nicht ändern, solange Tore/Spiel sinnvoll (Halle bewusst angehoben, ROADMAP 11.8 Einleitung).

## 5. In Ordnung
- Passquote 69-76 % auf allen Plätzen, im Rahmen der Profi-Spanne 66-93 % nach unten versetzt (tiefere Ligen), Passtempo skaliert sinnvoll mit der Länge (Median 7,5 m/s bei 5,6 m bis 15,5 m/s bei 25 m), Ankunft bei 0,69-0,80 des Starttempos.
- Kein Ball bleibt hängen (0 Fälle > 4 s, Stillstand 0,4-1,0 % der Zeit, längster 3,4 s Park).
- Gedränge: Abstand zum nächsten Mitspieler relativ zur Fläche je Spieler 0,37-0,46 auf allen Plätzen, 10 %-Quantil nie unter 1,5 m; im 5-m-Umkreis des Balls 1,5 (Großfeld) bis 3,7 Spieler (Halle) – plausibel.
- Fehlannahmen 1,4-4,1 % der Berührungen, Luftlöcher ~5-7 je Spiel, Parkwiese/Asche haben wie gewollt mehr Verspringer.
- Rollweg bei 3,7 m/s auf Kunstrasen (5,0 m), Halle (5,5 m) liegt in der FIFA-Spanne 4-10 m (unter der Annahme Startgeschwindigkeit 3,7 m/s).
- Schusstempo Großfeld Median 23,9 m/s (86 km/h), unter den 95-109 km/h Maximalwerten; Torwart-Quoten (Parade+Fangen/aufs Tor) 64-95 %.
- Grätschenquote auf Rasen höher (10-16 je Spiel gegen 4-6 auf Hartboden) = gewollt (`slideDamp`, Foul-/Schürfrisiko).

## 6. Grenzen der Messung
Mannschaften sind die Voreinstellungsteams (nicht Liga-Kader), kein Heimvorteil gesteuert. „Aufs Tor“ in zwei Näherungen, die sich bei Halle/Hinterhof unterscheiden. Pässe ohne Zielspieler (Befreiungsschläge, Schüsse als Pass) zählen nicht in die Passquote.
Stadion hat identische Physik und Seeds wie Großfeld (Kopie von `BIG_PITCH`), daher identische Zahlen. Maschine war ausgelastet; Stichprobe 40 Spiele (Schussdistanz/aufs-Tor-Ereignis nur 20 Spiele für drei Plätze).
