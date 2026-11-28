# Balancing & Simulation QA – 1. GAME BALANCING AUDIT (Bestandsaufnahme)

Stand 2026-11-27, Abschnitt A des Auftrags (`docs/BALANCING-QA-AUFTRAG.md`). **Nur gelesen, nichts geändert.**
Quellen: Code (Datei und Funktion angegeben; Zeilen „~“ sind ungefähr), dazu die vorhandenen Berichte
`docs/ADVANCED-FOOTBALL-SYSTEM-00-ENGINE-AUDIT.md` (Aufbau der Engine) und `docs/KONZEPT-SPIELERSTAERKE.md` (Stärkemodell).
Messwerte stehen im MATCH ENGINE TEST REPORT (`docs/BALANCING-QA-02-TESTS.md`); hier nur, wo eine Messung einen Befund stützt.

Kennzeichnung: **[Code]** aus dem Code gelesen · **[gemessen]** eigene Messung dieses Auftrags · **[Kommentar]** Angabe in einem
Code-Kommentar (frühere Messung oder Quelle, hier nicht neu geprüft) · **[Einschätzung]** theoretische Einschätzung, nicht getestet.

## 1. Wie ein Ergebnis entsteht

| Ebene | Wo | Wie |
|---|---|---|
| Eigene Liga, Pokal-Spiele des Menschen, Messspiele (5b) | `sim/match.js` createMatch / stepMatch, aufgerufen über `career/career.js` prepareMatch | volle Engine, 60 Schritte je Sekunde, Spiel im Zeitraffer (Länge je Platz, `matchDuration`) |
| Alle anderen Ligen der Pyramide | `career/pyramid.js` simTable | Poisson: Tore ~ Poisson(1,4 · e^(±s·Δ + 0,3 Heim)), `career/pokal.js` QUICK = {base 1,4, perPoint 0,03, home 0,3}; s ab Stärkemodell 3 aus `sim/niveau.js` slopeAt |
| CPU-Pokalrunden | `career/pokal.js` quickTie, playFieldRound | Poisson wie oben, Verlängerung 1/3, Elfmeter 50:50 |

**[Code]** Die Engine kennt **keinen Heimvorteil**: `homeTeam: 0` (`sim/match.js` ~148) dient nur Anzeige und Ansager; die
Zuschauerzahl `crowd` wirkt nicht auf Spielaktionen (nur Ansager, Kulisse, Finanzen). Indirekt bestimmt der Heimverein den Platz.
Die Poisson-Ligen haben dagegen +0,3 (× 1,35 Heimtore). **Systembruch:** eigene Liga ohne, alle anderen Ligen mit Heimvorteil.

## 2. Stellschrauben je Bereich (Auswahl der wirksamen Werte)

### 2.1 Spielerwerte und Stärke
- **[Code]** Werte: `sim/strength.js` ATTR_KEYS = Tempo, Ausdauer, Technik, Passen, Abschluss, Zweikampf, Kopfball, Torwart, Körper.
  Geistige Werte (Antizipation, Übersicht, Stellungsspiel, `sim/mind.js`) sind **abgeschaltet** (`MIND.on = false`).
- **[Code]** Anzeige-Stärke `rating` (`sim/generator.js` ratePlayer) nutzt **RATING_WEIGHTS (V1)**: ohne Körper, Stürmer
  Abschluss 0,3 / Technik 0,2 / Tempo 0,2 … Die gemessenen Gewichte **RATING_WEIGHTS_V2** (mit Körper 0,3 bei Abwehr, 0,2 im
  Mittelfeld) stehen daneben, „noch nicht in Gebrauch“. Jede Besonderheit gibt +1 (Ex-Profi +12, Meckerer/Raucher −2).
  → Die Stärke, nach der Kader, Tabellenprognosen, Poisson-Ligen und Transfers rechnen, ist nicht die, die in der Engine wirkt.
- **[Code]** Körper wirkt in Zweikämpfen: `STRENGTH_FX` {duel 0,3, shieldPerStrength 0,4, poke 0,3, pokeShieldPerStrength 0,5,
  head 0,3}; genutzt in `sim/tackles.js`, `sim/holding.js`, `sim/actions.js` (Abschirmen, Kopfball).
- **[Code]** Tempo: `sim/actions.js` ~48 maxSpeed = (4,6 + 2,6·Tempo + 0,6 „schnell“) · (0,72 + 0,28·Ausdauer); Sprint × 1,28.
- **[Code]** Werte gegen Gegner: `sim/skill.js` vs() = eigener Wert − 0,8 · (Gegnerwert − REF); soft-Grenze über 1 (Modell ≥ 2,
  Technikwerte bis 3). Stärkemodell 3 hebt Spieler je Liga an (`sim/niveau.js` NIVEAU_TARGET 51 … 126, SLOPE 0,05 → 0,033).
- **[Code]** Positionsfremd: `sim/position.js` OOP_SKILL_MUL {nah 0,92, fern 0,72, Feldspieler im Tor 0,85 …}.

### 2.2 Abschluss, Torwart, xG
- **[Code]** Schussstreuung `sim/actions.js` shoot(): σ = (0,025 + 0,16·(1 − Abschluss vs Zweikampf)) · … + 0,08·2·Müdigkeit
  + 0,05·Kraft; dazu Druck, erste Berührung, Drehung.
- **[Code]** Torwart (`actions.js` keeperSaves): Reichweite (0,85 + 0,75·Torwart) · Torbreite; „beaten“ 0,02 … 0,7; Fangen 0,08 … 0,95.
  **[Kommentar]** eingemessen an Opta-Werten (Strafraum 13–15 %, außerhalb 3–4 % Tore je Schuss).
- **[Code]** xG (`sim/chances.js` XG) ist ein Messmodell, **wirkt nicht** auf die Simulation (nur Anzeige und Auswertung).

### 2.3 Passen, Ballbesitz, Pressing, Taktik
- **[Code]** Passstreuung `actions.js` pass(): σ = (0,02 + 0,12·(1 − Passen vs Zweikampf)) · … + 0,05·2·Müdigkeit.
- **[Code]** Spielstile `sim/tactics.js` STYLES: ausgewogen, offensiv, konter, fluegel, kurzpass, pressing, mauern (je Linie,
  Kompaktheit, Breite, Aufrücken, Passrate, Flanken, lange Bälle, Müdigkeit `tire` 0,9 … 1,3).
- **[Code]** Befehle `sim/plan.js` ORDER_EFFECTS (Aufbau, Weg, Seite, Pressing, Absicherung, Formation, Tempo, Risiko); Umsetzung
  k = 0,35 … 1 nach Technik, Passen, Ausdauer, Position, Chemie.
- **[Code]** Systeme je Format (`sim/tactics.js` SYSTEMS): 4er 1-1-1, 2-1, 1-2 · 5er 2-1-1, Raute, 2-2, 1-1-2 · 7er 2-3-1, 3-2-1,
  2-2-2, 3-1-2 · 9er 3-3-2, 3-4-1, 4-3-1, 2-4-2 · 11er 4-4-2, 4-3-3, 4-2-3-1, 3-5-2. **3-4-3, 5-3-2 und 4-1-4-1 gibt es nicht.**
- **[Code]** CPU-Taktik `tactics.js` clubTactic: System und Stil fest aus einem Hash des Vereinsnamens (ausgewogen doppelt gewichtet).

### 2.4 Zweikämpfe, Fouls, Karten
- **[Code]** Stochern `sim/tackles.js`: Gewinn = 0,32 + 0,45·Zweikampf − 0,35·Gegner-Technik + 0,3·ΔKörper …, Grenzen 0,1 … 0,9.
- **[Code]** Fouls `sim/fouls.js` FOUL {contactPerSec 0,07 …}; **[Kommentar]** bewusst die Hälfte der echten Foulquote, weil die
  Engine im Zeitraffer läuft (≈ 92 statt ≈ 800 Pässe). Schiedsrichtertypen `sim/referee.js` REF_TRAITS („gewählt, nicht gemessen“).
- **[Code]** Ohne Schiedsrichter (Freizeitliga, 4er/5er) keine Karten.

### 2.5 Ausdauer, Wechsel, Verletzungen, Sperren
- **[Code]** Verbrauch `actions.js` ~57 × Platzfaktor `sim/pitch.js` STAMINA_DRAIN (hinterhof 0,67 … grossfeld 0,15) × (1,3 − 0,6·Ausdauer).
- **[Code]** Wechselregeln `sim/squad.js`: fliegend (Freizeitliga), 5 Wechsel Amateure, 5 in 3 Fenstern ab Liga 9.
- **[Code]** Verletzungen im Spiel `sim/knocks.js` (Foul 0,07, ohne Kontakt 0,0025 je Minute × Müdigkeit, Alter, Boden) und in der
  Karriere `career/injuries.js` (BASE_CHANCE 0,008 je Spieler und Spiel); Fitness `career/fitness.js` (Erholung 0,12 je Woche).
- **[Code]** Sperren `career/suspensions.js`: 5 Gelbe = 1 Spiel; Gelb-Rot 1, Notbremse 1, grobes Foul 2 – **nur der eigene Verein**.

### 2.6 Zufall
- **[Code]** Getrennte Ströme je Spiel: Hauptstrom, Foulstrom, Trainerstrom (`sim/match.js`); Karriere-Zufall aus dem Seed
  (`career/career.js` hashSeed). Rauschen in Schuss, Pass, Annahme, Torwartecke, KI-Taktung.

### 2.7 KI
- **[Code]** Trainer im Spiel `sim/aicoach.js` (6 Typen, Reaktionsfreude 0,35 … 0,85, höchstens 4 Umstellungen), Matchplan vor dem
  Spiel `intel/matchplan.js` (AFS 8).
- **[Code]** **Drei Schwierigkeits-Skalen**: Spielaktionen `sim/ai.js` SKILL {0,7 / 1 / 1,25}, Trainer und Matchplan DIFFICULTY
  {0,5 / 1 / 1,35}, Karriere `career/difficulty.js` (Vorstand, Sponsoren, Familie).

### 2.8 Liga, Tabelle, Auf- und Abstieg
- **[Code]** Tabelle `career/career.js` table(), Reihenfolge `core/standings.js` rankTable (Punkte, Tordifferenz, Tore, direkter
  Vergleich). Poisson-Ligen sortieren nur nach Punkten, Tordifferenz, Toren, ID (`pyramid.js`).
- **[Code]** CPU-Ligen: je Grenze 1 Auf- und 1 Absteiger (`pyramid.js` cpuMoves); Mensch: Relegation für Platz 2 / Vorletzten
  (`career/relegation.js`).

### 2.9 Entwicklung, Transfers, Geld
- **[Code]** Entwicklung `career/development.js` (Höhepunkt Stürmer 25 … Torwart 30, Ligawachstum 0,57 … 1,91, Talentstufen);
  **[Kommentar]** Zielwerte des Nutzers 2026-10-23 für 16- bis 20-Jährige gemessen erreicht (+8,0 / +13,5 in 8 Saisons).
- **[Code]** Transfers `career/transfers.js`, `career/transferrules.js`; Profi-Verträge `career/contracts.js`; Geld `career/finances.js`.

## 3. Auffälligkeiten (Kandidaten, noch zu messen oder zu entscheiden)

| # | Auffälligkeit | Art | Beleg |
|---|---|---|---|
| A1 | Kein Heimvorteil in der Engine, +0,3 in den Poisson-Ligen | Systembruch | [Code] s. o.; [gemessen] Heim/Gast-Tore fast gleich (Bericht 02) |
| A2 | Anzeige-Stärke (V1) ≠ gemessene Wirkung (V2, „nicht in Gebrauch“) | falsche Grundlage für Kader, Prognosen, Poisson | [Code] `generator.js` |
| A3 | Müdigkeit wirkt fünffach: Tempo, Schuss- und Passgenauigkeit, Foulrate, Verletzungen, Umsetzung der Taktik | mögliche Überwirkung | [Code] `actions.js`, `fouls.js`, `knocks.js`, `plan.js` |
| A4 | Derby wirkt sechsfach (Fouls × 1,3, Karten × 1,3, Verletzung × 1,2 / × 1,25, Grätschen × 1,4, Zuschauer × 1,8) | gewollt? | [Code] |
| A5 | Spiellänge wirkt dreifach (Torwart „brisk“, Schussfreude, Verbrauch × shortGame) | Absicht (Zeitraffer), prüfen | [Code] `actions.js`, `ai.js` |
| A6 | Zweikampfwert in der Foulrate zweimal (1,6 − 0,9·Zweikampf und Fehlerfaktor) | doppelt | [Code] `fouls.js` |
| A7 | Drei verschiedene Schwierigkeits-Skalen | unübersichtlich, nicht falsch | [Code] |
| A8 | Geistige Werte abgeschaltet (3 Messungen ohne Vorteil) | Phase 3 des Auftrags fragt nach Übersicht und Antizipation | [Code] `mind.js` |
| A9 | CPU-Taktik fest je Vereinsname | Abwechslung über Saisons | [Code] `tactics.js` clubTactic |
| A10 | Sperren nur für den eigenen Verein | Ungleichbehandlung (bewusst?) | [Code] `suspensions.js` |
| A11 | Fouls bewusst auf halbe Echtquote | gewollt (Spielfluss), Vergleich mit echten Werten nur bedingt | [Kommentar] `fouls.js` |

Exploits und unbeabsichtigte Wechselwirkungen werden in Phase 3 (Spielertypen), 4 (Taktik) und 6 (Extremfälle) gemessen.

## 4. Nicht gelesen

`sim/shootout.js`, `sim/setpieces.js`, `sim/situations.js`, `sim/bonus.js`, Wirkung der Besonderheiten (`traits`),
`core/standings.js` im Detail, `career/license.js`, Ausbau-Faktoren. Kommen bei Bedarf in den Folgeschritten dazu.
