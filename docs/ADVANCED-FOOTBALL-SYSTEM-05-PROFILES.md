# Advanced Football System – Phase 5: Profile

Stand: 2026-11-26. Grundlage: `docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md` Abschnitt 4.1 und 9 (Phase 5), Entscheidung E2
(a + b) in Abschnitt 11. Code: `src/intel/profiles.js`, Erfassung in `src/career/seasonstats.js`, Messung
`scripts/afs-profiles.mjs`.

## 1. Was ein Profil ist

| Profil | Für wen | Werte | Quelle | Herkunft |
|---|---|---|---|---|
| Spieler | alle Spieler in Kadern der eigenen Liga mit Einsatz | Pässe, xG, Zweikämpfe (je ganzes Spiel), geschrumpft; Perzentil unter derselben Position | Saisonzeile `rec.an` mit Spielanteil | ESTIMATED |
| Verein | Vereine der eigenen Liga | Passquote, überspielte Gegner je Pass, xG für/gegen je Spiel, Feldvorteil | `career.an.clubs` | MEASURED |
| Trainer | CPU-Vereine der eigenen Liga (beim eigenen Verein stammen KI-Befehle aus automatisch simulierten Spielen, daher keins) | Befehle des KI-Trainers je Spiel, je Gruppe, häufigste Gruppe | `career.an.clubs[].dec` aus `m.decisions` (`by: 'ai'`) | MEASURED |
| Werte-Profil | Vereine anderer Ligen (kein Kader, Tabelle per Poisson) | Stärke wie in `pyramid.js simTable`, Rang der Stärke in der Liga, Trainertyp | `defStrength`, `opponents.js coachOf` | MODELED |

- Nur Spielerwerte, die Phase 3 für Spieler freigegeben hat (Abschnitt 6 dort). Passquote, Packing und xA je Spieler bleiben
  draußen.
- Profile werden **beim Lesen** aus den Saisonsummen berechnet und nicht gespeichert. Gespeichert werden nur zwei neue Zahlen:
  der Spielanteil je Spieler (Hundertstel eines ganzen Spiels, aus `m.stats.players[].seconds / m.duration`) und die
  KI-Befehle je Verein und Gruppe.
- Spielerzeilen aus älteren Ständen haben keinen Spielanteil. Sie bekommen ihn erst ab der nächsten Saison, damit keine Rate aus
  halb erfassten Spielen entsteht; bis dahin hat der Spieler kein Profil.
- Profile gelten für die laufende Saison. Ältere Saisons fließen nicht ein (Spieler entwickeln sich zwischen den Saisons).

## 2. Schrumpfung zum Mittel

Profilwert = (Summe + k · Positionsmittel der Liga) / (Spielanteil + k). Das Positionsmittel ist die Summe aller Werte geteilt
durch die Summe aller Spielanteile derselben Position in der eigenen Liga.

**k ist gemessen** (`scripts/afs-profiles.mjs` auf den 320 Basis-Spielen aus Phase 3: Rasenplatz und Großfeld, je zwei feste
Paarungen, 31 bzw. 46 Feldspieler mit 63–80 Einsätzen). Je Spieler dienen Blöcke aus n Einsätzen als Stichprobe, alle übrigen
Einsätze als Wahrheit. Das Rollenmittel wird ohne den Spieler gebildet. Gesucht ist das k mit dem kleinsten mittleren
quadratischen Fehler.

| Wert | Platz | n | bestes k | Fehler roh (k = 0) | Fehler bestes k | Fehler nur Rollenmittel (k = 80) |
|---|---|---|---|---|---|---|
| Pässe | Rasenplatz | 5 / 14 / 30 | 10,5 / 9,5 / 10,5 | 2,48 / 1,01 / 0,80 | 0,79 / 0,59 / 0,66 | 0,93 / 0,85 / 0,90 |
| Pässe | Großfeld | 5 / 14 / 30 | 4 / 5,5 / 8,5 | 1,00 / 0,48 / 0,32 | 0,49 / 0,34 / 0,24 | 0,90 / 0,77 / 0,57 |
| xG | Rasenplatz | 5 / 14 / 30 | 5 / 5,5 / 4 | 0,0178 / 0,0074 / 0,0038 | 0,0072 / 0,0048 / 0,0035 | 0,0115 / 0,0102 / 0,0089 |
| xG | Großfeld | 5 / 14 / 30 | 23 / 25 / 51,5 | 0,0044 / 0,0021 / 0,0022 | 0,0009 / 0,0009 / 0,0011 | 0,0009 / 0,0009 / 0,0011 |
| Zweikämpfe | Rasenplatz | 5 / 14 / 30 | 9,5 / 10,5 / 8,5 | 1,02 / 0,43 / 0,20 | 0,30 / 0,24 / 0,16 | 0,37 / 0,34 / 0,29 |
| Zweikämpfe | Großfeld | 5 / 14 / 30 | 15 / 13 / 17,5 | 0,44 / 0,16 / 0,12 | 0,11 / 0,09 / 0,08 | 0,13 / 0,12 / 0,10 |

Die Plätze einer Liga wechseln (Heimplatz je Verein, `career.js prepareMatch`), deshalb gibt es **ein k je Wert**. Gewählt ist
das k, dessen schlechtester Fall über beide Plätze und n = 3 … 30 dem jeweils besten k am nächsten kommt:

| Wert | k | schlechtester Fall |
|---|---|---|
| Pässe | 6,5 | 1,05 × Fehler des besten k |
| xG | 12,5 | 1,19 × |
| Zweikämpfe | 12 | 1,02 × |

**Stabilität über Seeds:** In jeder Zeile ist der geschrumpfte Wert genauer als der rohe, bei 5 Einsätzen um den Faktor 2–5.
Rangfolge innerhalb der Rolle zwischen zwei getrennten Seed-Blöcken (Spearman, roh / geschrumpft): Pässe 0,40 / 0,38
(Rasenplatz, n 14) und 0,80 / 0,83 (Großfeld); Zweikämpfe 0,49 / 0,49 und 0,64 / 0,65; xG 0,47 / 0,46 und 0,28 / 0,29. Die
Schrumpfung ändert die Rangfolge kaum, sie zieht vor allem kurze Einsätze zum Mittel.

**Befund xG auf Großfeld:** Das reine Rollenmittel ist dort genauso genau wie jeder Spielerwert (letzte Spalte gleich der
vorletzten). Innerhalb der Rolle unterscheiden sich die Spieler beim xG auf Großfeld in diesen Paarungen nicht messbar. Das
xG-Profil eines Spielers sagt dort also kaum mehr als seine Position. Phase 7 darf darauf keinen Befund stützen, ohne es je Platz
erneut zu prüfen.

## 3. Grenzen der Messung

- Nur zwei Plätze und zwei Paarungen; ohne KI-Trainer, ohne Form, Fitness und Verletzungen über die Spiele hinweg.
- Feste Mannschaften: In der Karriere wechseln Gegner und Mitspieler. Das vergrößert die Streuung eher; k könnte dort größer sein.
- Positionen im Profil sind die eingetragenen Positionen (`playerOf().position`), in Phase 3 war es die Rolle im Spiel.

## 4. Speicher und Rechenzeit

Gleiche Messung wie in Phase 1 (Seed 11, 8 Vereine, Spiellänge 120 s, 5 Saisons):

| Saison | Spieldaten im Stand, höchstens | nach Saisonende (dauerhaft) | Profile berechnen (alle Spieler, Vereine, Trainer) |
|---|---|---|---|
| 1 | 5,2 KB | 1,0 KB | 1,2 ms |
| 3 | 6,1 KB | 2,0 KB | 0,9 ms |
| 5 | 7,2 KB | 3,1 KB | 0,9 ms |

- Budget aus Bericht 00 (E2): höchstens 20 KB nach 5 Saisons – eingehalten. Phase 1 allein lag bei 5,6 KB; Spielanteil und
  Trainerbefehle kosten also rund 1,6 KB mehr.
- Rechenzeit: Profile laufen nicht im Spiel, sondern beim Lesen; rund 1 ms je vollständiger Berechnung gegenüber 1,3–2 s je Spiel.
  Die Engine bleibt unberührt (Golden unverändert).
- In einer echten Karriere (Seed 11, nach 4 Spieltagen): 63 Spielerprofile (gk 9, def 19, mid 19, fwd 16); KI-Trainer gaben
  0,75–3 Befehle je Spiel, am häufigsten `press` und `shape`.

## 5. Nächste Schritte

- Phase 7 (AFI-Kern) liest diese Profile; Befunde nur aus Werten mit Herkunft und n.
- Die Anzeige von Profilen (Perzentil auf der Spielerkarte) ist nicht Teil dieser Phase.
