# ADVANCED FOOTBALL SYSTEM – Auftrag 00: Match Engine Audit & Data Reality Check

Stand: 2026-11-25. Grundlage: Codebasis `src/sim/` (12 021 Zeilen in 56 Dateien), `src/career/` (Speichern, Hintergrundspiele),
eigene Messläufe (Abschnitt 7). **Nichts implementiert, nichts an der Engine geändert.** Alle Aussagen mit Datei und Funktion
belegt; was nicht im Code steht, ist als „nicht vorhanden“ geführt.

Kennzeichnung der Datenwerte in diesem Bericht (Regeln in Abschnitt 6): **MEASURED**, **DERIVED**, **MODELED**, **ESTIMATED**,
**UNAVAILABLE**.

---

## 1. Architekturübersicht der Match Engine

### 1.1 Grundprinzip

- **Zeitschrittbasiert, deterministisch.** Ein Spiel ist ein Objekt `m` aus `createMatch()` (`src/sim/match.js:75`) und wird mit
  `stepMatch(m, input, dt)` (`match.js:164`) fortgeschrieben. Alle Aufrufer nutzen `dt = 1/60 s`
  (`career.js simulate/simulateSync`, `ui/Ticker.js step`, `tests`). Zufall nur über den Seed-Generator `m.rng`
  (`core/rng.js`); gleicher Seed → gleiches Spiel (Golden-Test `scripts/golden.mjs`).
- **Ereignisse entstehen aus dem Zeitschritt**, nicht umgekehrt: Aktionen (Pass, Schuss, Grätsche …) werden im Schritt ausgeführt
  und schreiben dabei Ereignisse in `m.events` (68 Typen, z. B. `pass` `actions.js:563`, `shot` `actions.js:262`,
  `goal` `match.js:498`, `foul` `fouls.js:158`, `tackle`/`poke_won` `tackles.js:136/144`, `header` `actions.js:931`). Der
  Aufrufer leert die Liste nach jedem Schritt.
- **Phasen:** `m.phase` ∈ `play | setpiece | goal | halftime | incident | shootout | ended` (`match.js step`).
- **Spielzeit ist gestaucht.** Reguläre Spielzeit `m.duration` je Platz 180–360 Sim-Sekunden bei Länge „kurz“
  (`HALF_BY_PITCH`, `presetHalf`, `matchDuration` in `match.js:46–68`; „mittel“ ×1,5, „lang“ ×2,5). Die Anzeige rechnet auf
  90 Minuten hoch (`minute.js footballMinute`). Ein Spiel hat damit **rund 10 800–21 600 Schritte**, aber viel weniger Aktionen
  als ein echtes 90-Minuten-Spiel (Abschnitt 7.1). Absolute Zählwerte „je 90 Minuten“ sind mit Profidaten **nicht vergleichbar**,
  Anteile und Quoten eher.

### 1.2 Ablauf eines Schritts (`match.js step`, Zeilen 187–372)

1. Sonderphasen (Tor, Standard-Pause, Halbzeit, Vorfall, Elfmeterschießen) und Spielende.
2. `updateTactics(m, dt)` (`ai.js:83`): verteilt je Mannschaft Aufgaben – **Jäger** (`m.chasers`), **Absicherer** (`cover`),
   **Pressing-Zweiter** (`mark`), **Zonendeckung mit Übergabe** (`mark` auf Gegner in der eigenen Zone), **Linie halten**
   (`holdLine`), Torwart-Abstand. Ergebnis in `m.tactics[id]`.
3. Je Spieler: `humanIntent` (gesteuerter Spieler), `keeperIntent` (`ai.js:1367`) oder `outfieldIntent` (`ai.js:830`) →
   `movePlayer` (`actions.js`) oder Grätsche/Stochern (`tackles.js startTackle/startPoke`).
4. `separatePlayers`, Einwurfabstand, **Kontaktfouls** (`fouls.js stepContactFouls`), **Zweikämpfe** (`tackles.js resolveTackles`),
   Vorteil.
5. Ball am Fuß folgt dem Halter; ausstehende Aktionen `tryExecute` (Pass, Schuss, Flanke …); Torwartparaden, Kopfbälle,
   Akrobatik, Körperblock, Ballannahme (`dribbleTouch`), Dribbeln (`carryBall`), Abseits (`offside.js`, nur Großfeld).
6. Ballphysik `stepBall` (`ball.js:79`) → Tor/Aus/Pfosten → `handleBallEvent`.
7. Nach dem Schritt (`stepMatch`): Schiri, `trackStep` (Statistik), `trackNerves`, **`stepLog` (Spielprotokoll)**,
   `stepSituations` (Lageerkennung), Coach-Feed, Umschalt-Regeln, KI-Trainer (`aicoach.js`).

### 1.3 Wo die Engine läuft – und wo nicht

| Spiel | Wie gerechnet | Beleg |
|---|---|---|
| Eigenes Spiel (3D, Liveticker, „nur Ergebnis“) | volle Engine | `app/matchflow.js`, `ui/Ticker.js` |
| Übrige Spiele der **eigenen Liga** | volle Engine, Hintergrund (optional Web Worker) | `career/bgsim.js runFixtures`, `simFixtures` |
| Turniere (Stadt, Halle, Sommer), Relegation | volle Engine | `matchflow.js runCupRound`, `relegation.js:207` |
| Pokale ohne eigenen Verein, Europapokal, Nationalteams | **Poisson-Schnellmodell** (Torerwartung aus Stärke) | `pokal.js:356 QUICK`, `europa.js:104`, `nationalteams.js:197` |
| Andere Ligen der Pyramide | **Poisson-Schnellmodell** | `pyramid.js simTable:113` |

**Folge für Analytics:** Spieldaten (Positionen, Pässe, Schüsse …) gibt es nur für Spiele der eigenen Liga, Turniere und die
Relegation. Für alle anderen Vereine existieren nur Endergebnisse (**UNAVAILABLE** für jede Detailstatistik).

### 1.4 Module (Auswahl, nach Bedeutung für Analytics)

| Bereich | Dateien |
|---|---|
| Schleife, Phasen, Tore | `match.js` |
| Spieler-KI (Bewegung, Entscheidungen, Pressing, Linien) | `ai.js` (1 505 Zeilen) |
| Aktionen (Pass, Schuss, Annahme, Kopfball, Torwart) | `actions.js` (1 164) |
| Ballphysik | `ball.js` |
| Zweikämpfe, Fouls, Karten | `tackles.js`, `fouls.js`, `referee.js` |
| Taktik (Systeme, Stile, Befehle) | `tactics.js`, `formation.js`, `plan.js`, `commands.js`, `switches.js`, `aicoach.js` |
| Spielerwerte und -profile | `generator.js`, `profiles.js`, `position.js`, `strength.js`, `habits.js`, `bonus.js`, `skill.js` |
| Mitschrift / Auswertung (lesen nur) | `stats.js`, `matchlog.js`, `situations.js`, `report.js`, `trace.js`, `chances.js` (Punkt 38) |

---

## 2. Antworten auf die Prüffragen

### A. Spielablauf

| Frage | Befund | Beleg |
|---|---|---|
| Ereignis- oder zeitschrittbasiert? | **Zeitschrittbasiert**; Ereignisse sind Nebenprodukt der Schritte | `match.js stepMatch/step` |
| Zeitliche Auflösung | 1/60 s Sim-Zeit; Sim-Zeit ist gegenüber 90 Minuten gestaucht (Faktor ≈ 15–30 bei „kurz“) | `match.js:46–68`, `minute.js` |
| Wie entstehen Ereignisse? | aus Aktionen, Ballphysik, Regeln (Schiri, Abseits, Fouls) | `actions.js`, `ball.js`, `fouls.js`, `offside.js` |
| Ballbesitz / Ballwechsel | Physisch: wer den Ball zuletzt berührt (`ball.lastTouch`, `m.lastTouchTeam`), Halter (`ball.holder`) nur bei Torwart/Einwurf. Protokoll: Besitzwechsel zählt erst nach 0,7 s (`matchlog.js CONFIRM`) | `match.js`, `matchlog.js stepLog` |
| Angriffe und Spielphasen | Keine explizite Phasen-Maschine (Aufbau/Angriff/Umschalten); **implizit** über Ballbesitz und Ballposition in `anchor()` (`ai.js:632`), Umschaltmoment `CAUGHT_TIME` (`ai.js:32`), Konter-Erkennung in `keyscene.js`. Im Protokoll: Ballbesitzphasen mit Start, Ende, Pässen, Vorstoß, Strafraum, Schüssen, Tor (`matchlog.js openPossession`) | s. links |

### B. Ballbewegung

| Frage | Befund | Beleg |
|---|---|---|
| Echte Ballposition? | **Ja, 3D** (`pos.x/y/z`, `vel`), jeder Schritt | `ball.js createBall/stepBall` |
| Kontinuierlich? | Ja, physikalisch (Rollwiderstand je Boden, Luftwiderstand, Wind, Pfützen, Bodenrauheit) | `ball.js`, `ground.js`, `surfaces.js` |
| Passwege/-richtung | Pass ist ein echter Ballflug zum Ziel (Start, Ziel, Streuung); Abfangen entsteht physisch | `actions.js:526–563` |
| Lange Bälle, Flanken, Chips | Ja, verschieden: `lofted`, `cross` (`flach`/`halbhoch`/`hoch`), `through`, Lupfer (`lobFor`), Effet (`curlAim`), langer Einwurf | `ball.js loftFor/lobFor/curlAim`, `actions.js:563`, `ai.js LONG_THROW` |
| Ballflug, Annahme, Abpraller | Ja: Flugbahn mit Spin, Annahme mit Technik-Streuung (`dribbleTouch`), Abpraller an Pfosten/Bande/Spielern/Torwart (Faustabwehr) | `ball.js collideFrame`, `actions.js dribbleTouch/keeperSaves/bodyBlock` |
| Abgewehrte und zweite Bälle | Ball bleibt frei und physisch; **Antizipation**: nach Block/Parade/Grätsche/Kopfball läuft je Team der Spieler hin, der den Ball zuerst erreicht (`ANTICIPATE`, `reachSpot`) | `ai.js:515–555, 147–156` |

### C. Spielerbewegungen

| Frage | Befund | Beleg |
|---|---|---|
| Echte Positionen? | **Ja**, alle Spieler (`p.pos`, `p.vel`, `p.facing`) jeden Schritt | `squad.js makeEntity`, `actions.js movePlayer` |
| Laufende Aktualisierung | Ja, 60/s | `match.js step` |
| Individuelle Laufwege | Ja, Ziel je Spieler aus `anchor()` (System-Ankerpunkt, Ballposition, Stil) bzw. Aufgabe aus `updateTactics` | `ai.js anchor/outfieldIntent` |
| Bewegung ohne Ball | Ja: Anbieten (`supportSpot`, `SUPPORT_FREE`), Lauern hinter der Abwehr (`lurking`), Hinterlaufen (`overlap`), Strafraumläufe bei Flanken (`boxRun`), Entgegenkommen (`fwdDrop`) | `ai.js:722–822` |
| Dynamische Positionswechsel | Nur innerhalb der Rolle (Anker verschiebt sich); **keine Rotation** zwischen Spielern, kein Tausch von Rollen im Lauf | `ai.js anchor` |
| Räume besetzen/öffnen/verlassen | Implizit: Breite (`STRETCH`), Kompaktheit, Linienhöhe; **kein Raummodell** (keine Raumkontrolle, keine Zuordnung „wer hat welchen Raum geöffnet“) | `ai.js anchor`, `plan.js` |
| Rollenabhängige Muster | Vier Rollen `gk/def/mid/fwd` mit unterschiedlichem Verhalten in `anchor()`; **keine Feinrollen** (Außen/Zentrum, Sechser/Zehner …). `position.js` sagt selbst: „Außen/Zentrum unterscheidet die Formation nicht“ | `formation.js`, `position.js:11` |

### D. Gegnerverhalten

| Frage | Befund | Beleg |
|---|---|---|
| Positionierung gegen den Ball | Ankerpunkt `anchor(m, p, false)` + Kompaktheit, Linienhöhe, Seitenverschiebung (`COVER_SHIFT`) | `ai.js anchor` |
| Wie entsteht Pressing? | Jäger (nächster zum Ball), Absicherer zwischen Ball und Tor, optional **zweiter Presser** (`st.press`), Zonendeckung mit Übergabe | `ai.js updateTactics:83–200` |
| Pressingintensität | **Drei Stufen** über Befehl `press: hoch/mittel/tief` (Zone, Radius des zweiten Pressers 14/11/9 m, Block schiebt nach, Kraftkosten `tire`) | `plan.js ORDER_EFFECTS.press`, `ai.js` |
| Pressingfallen/-auslöser | **Auslöser** teilweise: Rückpass des Gegners → Linie rückt auf (`LINES`, `noteBackPass`); Torwart mit Ball → Rückzug. **Pressingfallen** (gezieltes Lenken in eine Zone und Zuschnappen): nur „nach außen lenken / Zentrum zumachen“ (`funnel`), kein Zuschnappen | `ai.js:40–64, 166–180` |
| Reaktion auf Gegnerbewegung | Zonendeckung übernimmt den Gegner, der in die Zone kommt; Abwehr reagiert verzögert auf Steilpass (`m.pass.react`) | `ai.js:200–240` |
| Abstände zwischen Mannschaftsteilen | Linien-Abstand gesteuert (`LINES.gapPressed/gapFree`); im Protokoll gemessen: letzte Linie, Spitze, Abstand der Spitze (`matchlog.js sample`) | `ai.js LINES`, `matchlog.js:150–170` |
| Raum- vs. Manndeckung | **Nur Zonendeckung** (mit Übergabe). Keine Manndeckung als Befehl (Suche nach Manndeckung im Code: kein Treffer) | `ai.js:200–240` |

### E. Taktik

| Frage | Befund | Beleg |
|---|---|---|
| Wirksame Anweisungen | Systeme je Format, Spielstile (`STYLES`), **9 Befehlsgruppen** `build/route/side/press/guard/cover/shape/tempo/risk` mit konkreten Wirkungen auf Pass-/Schussraten, Breite, Linie, Tempo, Kraft | `tactics.js:17–96`, `plan.js ORDER_EFFECTS:33–85` |
| Formationen | Ankerpunkte je Rolle in Platzanteilen (`formation.js`), auf die Platzgröße skaliert | `formation.js`, `tactics.js systemFormation` |
| Individuelle Rollen | Nein (nur 4 Grundrollen); individuelle Unterschiede über **Profile** (Spielmacher, Kämpfer, Solist …) und **Gewohnheiten** (nach innen ziehen, Fuß) | `profiles.js`, `habits.js` |
| Wirkung auf Positionen und Aktionen | Ja, über `styleOf/planMods` in `anchor()`, `aiDecide()`, `updateTactics()` | `plan.js`, `ai.js` |
| Änderungen im Spiel | Ja: Befehle (`setOrder`), Systemwechsel (`setSystem`), Zurufe, KI-Trainer, Umschalt-Regeln | `plan.js:93`, `coach.js`, `aicoach.js`, `switches.js` |

### F. Spielereigenschaften

- **Werte in der Engine** (`generator.js ROLL_ATTRS:29`): `pace, stamina, technique, passing, shooting, tackling, heading,
  keeping` + abgeleitet `strength` (`deriveStrength`). Nutzung im Sim-Code gezählt: pace 18, technique 13, keeping 12,
  shooting 10, tackling 9, passing 9, strength 7, stamina 3, heading 2 Stellen.
- **Nicht vorhanden** (UNAVAILABLE als Werte): Übersicht, Antizipation, Stellungsspiel, Entscheidungsfindung, Konzentration,
  Aggressivität. Teilweise **ersetzt** durch: Eigenschaften (`data/traits.js`: schnell, pferdelunge, gutes_auge, anfuehrer,
  ballsicher, kopfball, hammer, meckerer, hart_im_nehmen, ex_profi …), Profile (`profiles.js`), verdeckte Boni (`bonus.js`),
  Schwierigkeit (`ai.js SKILL`), Stimmung/Form/Nerven (`mentality.js`, `nerves.js`).
- **Druck:** `pressureOn()` (`profiles.js:75`) = Abstand zum **nächsten** Gegner < 2,2 m, linear 0…1; wirkt über
  `pressureChaos()` auf die Streuung von Pass und Schuss (`actions.js:229, 526`). Nur ein Gegner, **keine Richtung**, keine
  Mehrfachdeckung.
- **Zweikampf:** Stochern gewinnt nach `tackling` gegen `technique`, Körperkraft, Profilen (`tackles.js:136–140`); Kopfballduell
  nach Kraftunterschied (`actions.js:850–858`).
- **Positionsfremd:** fester Abschlag auf Fertigkeiten je Stufe (`position.js OOP_SKILL_MUL`), Gewöhnung in der Karriere
  (`career/positions.js`, `rec.posXp`).
- **Individuelle Fähigkeit vs. taktische Eignung:** Eignung gibt es nur **auf Mannschaftsebene** (Stil zu Platz/Wetter,
  Beruf zu Stil: `fit.js styleFit/jobFits/applyFit`), nicht je Spieler und Rolle.

---

## 3. Dateninventar

Spalten: **Existiert** · **Erzeugt in** · **Gespeichert in** · **Genauigkeit** · **im Spiel** · **nach dem Spiel** · **über Saisons**.
„nach dem Spiel“ = solange das Spielobjekt `m` lebt (Endbildschirm, Ticker-Ende); danach wird es verworfen.

| Datenbereich | Existiert | Erzeugt in | Gespeichert in | Genauigkeit | Im Spiel | Nach dem Spiel | Über Saisons |
|---|---|---|---|---|---|---|---|
| Zeit (Sim-Sekunde, Spielminute) | ja – MEASURED | `match.js step`, `minute.js` | `m.time`, Ereignis-Zeit nur bei `goal` (`time`) und im Protokoll (`t`) | 1/60 s; Minute hochgerechnet | ja | ja (Protokoll) | nein |
| Ballposition/-bewegung | ja – MEASURED | `ball.js stepBall` | nur aktueller Zustand `m.ball`; alle 0,5 s Ballvorstoß/-seite in `m.log.samples` | exakt (Sim) | ja | nur Stichproben | nein |
| Ballbesitz | ja – MEASURED (Berührung) / DERIVED (Phase ≥ 0,7 s) | `match.js`, `matchlog.js` | `m.lastTouchTeam`, `m.stats.teams[].possession` (Sekunden), `m.log.poss` | gut; freie Bälle zählen zum letzten Berührer | ja | ja | **nein** (nur Ergebnis) |
| Spielerposition/-bewegung | ja – MEASURED | `actions.js movePlayer` | nur aktueller Zustand `p.pos/vel`; Linien/Spitze alle 0,5 s (`samples`) | exakt | ja | nur Stichproben | nein |
| Spieleraktionen | ja – MEASURED | diverse | `m.events` (je Schritt geleert), Zähler `m.stats.players` (Tore, Vorlagen, Schüsse, Pässe, Zweikämpfe, Paraden, Fouls, Luftlöcher, Kopfbälle, Blocks, Karten, Sekunden) | Zähler exakt | ja | ja | **teilweise**: `rec.apps, goals, assists, gradeSum/graded`, Spielanteil (`career.js recordResult:1411–1433`), letzte 8 Noten (`awards.js logGrade`), Saisonchronik der letzten 12 Saisons mit Stärke, Spielen, Toren, Vorlagen, Notenschnitt (`awards.js logSeason`) |
| Pässe: Start | ja – MEASURED | `actions.js:563` | Ereignis `pass.from`, Protokoll `m.log.passes` (Zone/Drittel/Seite) | exakt | ja | ja | nein |
| Pässe: Ziel, Richtung | ja – MEASURED (Zielspieler-Position beim Abspiel) | `actions.js:563` | Ereignis `pass.to`, `targetId`; Protokoll nur `targetId` | Zielpunkt = Spielerposition beim Abspiel, nicht Ankunftsort | ja | teilweise | nein |
| Pässe: Erfolg | ja – DERIVED | `matchlog.js stepLog` (nächste Berührung) | `m.log.passes[].done/receiver` | gut; Abpraller vom Mitspieler zählt als angekommen | ja | ja | nein |
| Zweikämpfe | teilweise – MEASURED | `tackles.js`, `actions.js` (Kopfball) | Ereignisse `slide/poke/tackle/poke_won/foul`; Zähler `tackles`; **Verlierer und Ort nicht** im Ereignis | Gewinner exakt; Ort nur live aus Positionen | ja | Zähler | nein |
| Pressing / Druck | teilweise – MODELED | `profiles.js pressureOn` (nur intern), `ai.js` Rollen | **nicht gespeichert** (nur `log.shots[].press` = Abstand des nächsten Gegners beim Schuss) | einfaches Abstandsmodell | live berechenbar | nein | nein |
| Laufwege | ja – MEASURED (Bahn), Absicht MODELED | `ai.js`, `actions.js` | **nicht gespeichert**; Absicht nur flüchtig in `m.tactics[id].type` (`zone/cover/mark`) | Bahn exakt | ja | nein | nein |
| Räume (frei/besetzt) | **nein** – UNAVAILABLE | – | – | – | aus Positionen berechenbar | nein | nein |
| Angriffe (Beginn, Verlauf, Ende) | ja – DERIVED | `matchlog.js openPossession` | `m.log.poss[]`: Start, Ende, Art (Ballgewinn/Abstoß…), Pässe, max. Vorstoß, Seite beim Eintritt ins Drittel, Strafraum, Schüsse, Tor | gut | ja | ja | nein |
| Ballverluste | ja – DERIVED | `matchlog.js` | `m.log.turnovers[]` (Art: Zweikampf, Abfangen, Torwart, frei; Drittel, Seite) | gut | ja | ja | nein |
| Zweite Bälle | teilweise | `ai.js ANTICIPATE` (Verhalten), `ball.lastAction` | **nicht gespeichert**; Gewinner über nächste Berührung live ableitbar | Ableitung zuverlässig, Positionierung nicht modelliert | live | nein | nein |
| Taktik | ja – MEASURED | `tactics.js`, `plan.js` | `m.plan`, `m.orders`, Entscheidungen `m.decisions` (mit Zeit, Urheber) | exakt | ja | ja | Vereinstaktik ja (Spielstand), Verlauf nein |
| Schüsse | ja – MEASURED | `actions.js:262`, `tricks.js:265` | `m.log.shots[]`: Ort (Zone), Abstand, Druck, Ausgang (Tor/Parade/Block/Pfosten/vorbei) | gut | ja | ja | nur Tore/Vorlagen |
| Chancen-Auswertung | ja – DERIVED | `report.js chanceStats/missedChances` (Großchance = Schuss aus ≤ 7 m, `BIG_CHANCE_DIST`) | Endbildschirm, Halbzeit, Ticker-Ende | Schwelle gesetzt | ja | ja | nein |
| xG | ja – MODELED (aus der Sim hergeleitet) | `chances.js shotXg` (Punkt 38, noch nicht committet; Tests `tests/xg38.test.js`) | nur Ticker (`createChanceLog`) | geeicht, Gegenprobe in Fünfteln stimmig | ja (Ticker) | Ticker-Ende | nein |
| Tore, Fouls, Karten, Ecken, Abseits | ja – MEASURED | `match.js`, `fouls.js`, `referee.js`, `offside.js` | `m.stats` | exakt | ja | ja | Tore, Karten/Sperren |
| Noten | ja – MODELED (feste Gewichte) | `stats.js gradePlayers` | Karriere: Summe, Anzahl, Verlauf | Gewichte gesetzt, nicht hergeleitet | nach Spiel | ja | ja |
| Lagebild (Situationen) | ja – DERIVED | `situations.js` | `m.situations` (flüchtig) | Schwellwerte | ja | nein | nein |

**Speicher:** Spielstand in `localStorage`, drei Plätze (`career.js:1610–1760`), 100–230 KB je Stand (ROADMAP, gemessen).
Ein ganzes Spielprotokoll `m.log` hat 150–260 KB (Abschnitt 7.1) – **dauerhaft speicherbar ist nur eine starke Verdichtung.**

---

## 4. DATA REALITY MATRIX

Regel: **A** nur, wenn die Kennzahl ohne Näherung aus vorhandenen Messwerten folgt. Eine Kennzahl, die erst *während* der
Simulation mitgeschrieben werden muss (aber ohne neue Mechanik), ist **B** („live ableitbar“).

| # | Kennzahl | Stufe | Kurz |
|---|---|---|---|
| 1 | Territorial Dominance Index | **A** | Ballposition und Ballbesitz jeden Schritt gemessen |
| 2 | Positional Flexibility Index | **C** | nur 4 Grundrollen, kein Leistungsnachweis je Rolle |
| 3 | Second Ball Efficiency Index | **B** (Gewinnquote) / **C** (Positionierung) | wer den freien Ball holt: live ableitbar |
| 4 | Pressing Resistance Index | **B** (einfacher Druck) / **C** (volles Druckmodell) | Druck = nur nächster Gegner < 2,2 m |
| 5 | Space Creation Index | **C** | kein Raummodell, keine Zuordnung von Läufen zu Raumgewinn |
| 6 | Attack Continuity Index | **A** | Ballbesitzphasen mit Pässen, Vorstoß, Ende gemessen |
| 7 | Team Performance Index | **B** | Zutaten vorhanden; Gewichtung muss hergeleitet werden |
| 8 | Tactical Fit Score | **B** (Mannschaft/Stil) / **C** (Spieler/Rolle) | Stil-Eignung existiert, Spieler-Eignung nicht |

### 4.1 Territorial Dominance Index – A
- **Daten:** Ballposition (`m.ball.pos`) und Besitz (`m.lastTouchTeam`, `ball.holder`) jeden Schritt (MEASURED); Pässe mit Drittel
  (`m.log.passes[].third`); Stichproben `samples.ballAdv/poss` alle 0,5 s.
- **Berechnung:** Anteil der Spielzeit mit Ball im letzten Drittel je Mannschaft (so bereits in Punkt 38, `chances.js` Druck-Leiste);
  Field-Tilt-Variante über Pässe im letzten Drittel (DERIVED aus `log.passes`).
- **Grenzen:** „Besitz“ ist der letzte Berührer – freie Bälle zählen mit; Ballberührungen außer Pässen werden nicht gezählt
  (Field Tilt nach Ballkontakten wäre B). Absolute Werte je Platzgröße verschieden → je Platz normieren.

### 4.2 Positional Flexibility Index – C
- **Vorhanden:** Rolle je Einsatz (`p.role`, `formationEntry`), Gewöhnung `rec.posXp` (Spiele je fremder Rolle), fester Abschlag
  `OOP_SKILL_MUL` (MODELED, `position.js`).
- **Fehlt:** Feinrollen (Außen/Zentrum, defensives/offensives Mittelfeld), Leistung **je Rolle** (Noten werden ohne Rolle gespeichert,
  `logGrade` speichert nur Runde und Note der letzten 8 Spiele), Rollenwechsel im Spiel.
- **Warum nicht B:** Aus „hat X Spiele auf Rolle Y“ lässt sich nur eine Einsatzbreite zählen. Ob er dort *gut* war, ist nicht
  belegt; der Abschlag ist ein gesetzter Wert, kein Messwert. Ein Index daraus wäre Scheinpräzision.

### 4.3 Second Ball Efficiency Index – B / C
- **Vorhanden:** `ball.lastAction` (block/save/tackle/header), freie Bälle sind physisch, `ANTICIPATE` schickt je Team einen Spieler
  zum erreichbaren Punkt (`ai.js:147–156`), nächste Berührung `ball.lastTouch`.
- **B (Gewinnquote):** „Nach Kopfball/Block/Abwehr/Grätsche: Welche Mannschaft berührt den Ball als Nächstes, wo?“ – zuverlässig,
  aber **nur live** (wie die Passauflösung in `stepLog`), heute nicht gespeichert.
- **C (Effizienz der Positionierung):** Es gibt keine gezielte Staffelung für zweite Bälle (nur ein Spieler je Team antizipiert);
  der Verlierer eines Kopfballduells wird nicht erfasst. Eine Bewertung *wie gut* eine Mannschaft auf zweite Bälle steht, braucht
  neue Mechanik.

### 4.4 Pressing Resistance Index – B / C
- **Vorhanden:** `pressureOn()` (nächster Gegner < 2,2 m), Wirkung auf Streuung (`pressureChaos`), Pass-Erfolg (`log.passes.done`),
  Ballverluste mit Art (`log.turnovers`), Dribbling/Annahme-Fehler (`miscontrol`, `whiff`).
- **B:** „Ballsicherung unter Nahdruck“ = Anteil erfolgreicher Pässe/Ballbehauptungen, wenn bei Ballannahme ein Gegner ≤ 2,2 m war.
  Live ableitbar (Druck beim Abspiel mitschreiben).
- **C:** Pressingresistenz im Sinne „mehrere Gegner, Laufrichtung, Pressinglinie überspielt“ – die Engine modelliert Druck nur
  über den **einen** nächsten Gegner ohne Richtung. Ein solcher Index würde etwas messen, das die Engine nicht simuliert.

### 4.5 Space Creation Index – C
- **Vorhanden:** alle Positionen jeden Schritt (MEASURED), Läufe ohne Ball als Verhalten (Lauern, Hinterlaufen, Strafraumläufe).
- **Fehlt:** Raumkontrolle (welche Mannschaft beherrscht welchen Raum), Kennzeichnung der Laufabsicht (in `m.tactics` nur
  `zone/cover/mark`, Läufe aus `anchor()` haben keinen Namen), Reaktion des Verteidigers *wegen* des Laufs.
- **Warum nicht B:** Raumschaffung ist kontrafaktisch („ohne den Lauf wäre der Raum zu“). Ohne Absichtskennung und ohne
  Raummodell lässt sich der Gewinn keinem Spieler zuordnen. Raumkontrolle (Voronoi/Pitch Control) wäre aus Positionen
  berechenbar, aber teuer (Abschnitt 7) und erst Grundlage, nicht die Kennzahl.

### 4.6 Attack Continuity Index – A
- **Daten:** `m.log.poss[]` (Start, Ende, Art des Gewinns, Pässe, max. Vorstoß, Eintrittsseite, Strafraum, Schüsse, Tor),
  `m.log.turnovers[]` (Art, Drittel).
- **Berechnung:** Pässe je Ballbesitz, Anteil der Ballbesitze mit Eintritt ins letzte Drittel / in den Strafraum / mit Abschluss,
  Ballverlust-Art und -Ort. Alles DERIVED aus gemessenen Daten ohne Näherung.
- **Grenze:** Ballbesitz zählt erst nach 0,7 s (`CONFIRM`) – kurze Ballberührungen fallen heraus (gewollt). Spiele sind gestaucht:
  rund 55–76 Ballbesitze je Spiel (gemessen), Quoten vergleichbar, Absolutwerte nicht.

### 4.7 Team Performance Index – B
- **Zutaten vorhanden:** Ergebnis, xG für/gegen (MODELED, Punkt 38), Territorium (A), Angriffskontinuität (A), Ballverluste,
  Standards.
- **Problem:** Ein einzelner Index braucht Gewichte. Gesetzte Gewichte wären „unbegründete Gewichtung“. Zulässig nur, wenn die
  Gewichte **hergeleitet** werden (z. B. welche Kombination sagt die Punkte der nächsten Spiele am besten voraus, gemessen über
  viele Simulationsspiele) – sonst als getrennte Kennzahlen zeigen.

### 4.8 Tactical Fit Score – B / C
- **Vorhanden:** Mannschafts-Eignung Stil ↔ Platz/Wetter und Beruf ↔ Stil (`fit.js styleFit/jobFits/applyFit`, MODELED mit
  gesetzten Boni), Profile, positionsfremd-Abschlag.
- **B (Mannschaft):** Wirkung eines Befehls/Stils lässt sich **experimentell messen**: gleiches Spiel (Seeds) mit und ohne Befehl,
  Unterschied in xG, Territorium, Kontinuität (ESTIMATED, mit Stichprobengröße). So wurde in diesem Projekt bisher jede Schicht
  bewertet.
- **C (Spieler ↔ Rolle/Befehl):** Kein Wert beschreibt, ob ein Spieler zu „hohem Pressing“ oder „Konter“ passt; Werte wie
  Antizipation/Übersicht fehlen. Eine Spieler-Eignung wäre heute erfunden.

---

## 5. Fehlende Simulationsmechanismen und Bewertung möglicher Erweiterungen

Skala Aufwand: S (Tage) · M (1–2 Wochen) · L (mehrere Wochen). Performance: Mehrkosten je Schritt.

| Erweiterung | Was fehlt heute | Aufwand | Einfluss auf Sim | Performance | Abhängigkeiten | Nutzen | Risiko |
|---|---|---|---|---|---|---|---|
| **A1 Einheitliches Koordinatensystem, Zonen** | vorhanden (`x` Länge, `z` Breite, `attackDir`, Drittel/Seiten in `matchlog.js`) | – | – | – | – | Grundlage steht | – |
| **A2 Mitschrift erweitern (Ereignis-Kontext)** | Ort/Verlierer bei Zweikämpfen, Druck beim Abspiel, zweite Bälle, Laufabsicht | S | **keiner** (nur lesen) | gering (nur bei Ereignissen) | Datenmodell (Phase 1) | hoch: macht B-Kennzahlen messbar | gering; Golden muss gleich bleiben |
| **A3 Raumkontrolle (Pitch Control, vereinfacht)** | kein Raummodell | M | keiner, wenn nur gemessen | **hoch**, wenn jeden Schritt; gering bei Stichprobe (z. B. 2/s oder nur bei Ereignissen) | A2 | mittel (Grundlage für Raum-Kennzahlen) | Rechenzeit auf dem Handy |
| **B1 Feinrollen** (Außen/Zentrum, 6er/10er, AV einrückend) | nur 4 Rollen | L | **groß** (anchor, Formationen, Positionsabschlag) | gering | Formations-/Taktik-UI, Kalibrierung | hoch für Flexibilität/Eignung | hoch: verändert Balance, viele Tests |
| **B2 Bewegungsvarianten** (zurückfallende Stürmer ✔ vorhanden, einrückende AV, nachrückende 8er, Verschieben ✔ teilweise) | Einrücken, Rotation | M je Variante | mittel | gering | B1 | mittel | Balance |
| **C1 Druckmodell mit mehreren Gegnern und Richtung** | nur nächster Gegner | M | mittel (wirkt auf Streuung, Entscheidungen) | gering–mittel | A2 | hoch für Pressingresistenz | Balance von Pass/Schuss |
| **C2 Pressingauslöser/-fallen** | nur Rückpass, Torwart, Lenken | M | mittel | gering | C1 | mittel | Balance |
| **C3 Pressinglinien überspielen** (Packing) | – | S als Messung | keiner | gering (bei Pässen) | A2 | hoch, gut erklärbar | gering |
| **D1 Zweite-Ball-Staffelung** | nur ein Spieler antizipiert je Team | M | mittel | gering | A2 | mittel | Balance (Tore nach Abprallern) |
| **D2 Kopfballduell mit Verlierer** | nur Gewinner im Ereignis | S | keiner (nur Ereignis ergänzen) | – | A2 | mittel | gering |
| **E1 Raumbesetzung/Überzahl** (Läufe binden Gegner) | keine Absichtskennung | L | groß | mittel | A3, B1 | hoch, aber teuer | hoch |

**Bereits vorhanden und nicht neu zu bauen:** Ballflug inkl. Flanken/Chips/Effet, Abpraller, Antizipation freier Bälle,
Zonendeckung mit Übergabe, Pressingstufen, Linienführung, Läufe ohne Ball (Lauern, Hinterlaufen, Strafraumläufe), Umschaltmoment,
Spielprotokoll mit Ballbesitzphasen, Lageerkennung, Kausalkette je Tor (`trace.js`).

---

## 6. Regeln für Qualität und Glaubwürdigkeit der Daten

1. **Jeder Wert trägt eine Herkunft:** `MEASURED | DERIVED | MODELED | ESTIMATED | UNAVAILABLE`, dazu `n` (Stichprobe) und
   `scope` (Spiel, Saison, Platz). Die Kennzeichnung bleibt bei jeder Weiterrechnung erhalten: ein Ergebnis hat die
   **schwächste** Herkunft seiner Zutaten (DERIVED aus MODELED ist MODELED).
2. **Keine Anzeige ohne Mindeststichprobe.** Beispiele (Spielwerte, vor Umsetzung zu messen): Quote erst ab 10 Versuchen,
   Spieler-Saisonwert erst ab 5 Spielen bzw. 270 Spielminuten (hochgerechnet).
3. **Unsicherheit zeigen statt Nachkommastellen:** Bereiche oder Stufen („deutlich besser als der Schnitt“) statt 0,734.
4. **Keine Doppelbewertung:** Eine Aktion zählt je Kennzahl einmal (z. B. Pass, der zum Schuss führt: xA beim Passgeber, xG beim
   Schützen – nicht beides beim Schützen). Zusammengesetzte Kennzahlen dürfen keine zwei Zutaten enthalten, die dieselbe Aktion
   messen (Territorium und Field Tilt nicht zusammen in einen Index).
5. **Keine gesetzten Gewichte in Indizes.** Gewichte nur hergeleitet (Messläufe, Vorhersagekraft) und dokumentiert; sonst
   Kennzahlen getrennt zeigen.
6. **Nur messen, was die Engine simuliert.** Eine Kennzahl, deren Mechanik fehlt (Abschnitt 4: Stufe C/D), wird nicht angezeigt
   – auch nicht als Näherung.
7. **Bezug auf die Engine, nicht auf Profidaten.** Vergleichswerte (Liga-Schnitt, Platz-Schnitt) aus vielen Simulationsspielen;
   keine echten Spieler-, Vereins- oder Ligadaten. Gestauchte Spielzeit: Absolutzahlen nie „je 90 Minuten“ mit Profiwerten
   vergleichen.
8. **Mitschrift ändert nichts.** Analytics-Code liest nur (kein `m.rng`, keine Zustandsänderung); Prüfung: Golden-Test bleibt
   unverändert, Test „gleicher Seed, gleiches Ergebnis mit und ohne Mitschrift“ (wie `tests/chances.test.js`).
9. **Poisson-Spiele haben keine Detaildaten.** Für Vereine außerhalb der eigenen Liga nur Ergebnisse; jede Detailkennzahl dort ist
   UNAVAILABLE und wird nicht geschätzt.

---

## 7. Performance- und Architekturprüfung

### 7.1 Gemessen (2026-11-25, Node 22 im Container, je 3 Spiele, Länge „kurz“, Seeds 500–502)

| Platz | Spieler | Sim-Dauer | ms je Spiel | µs je Schritt | `m.log` (JSON) | Ballbesitze | Pässe | Schüsse | Stichproben |
|---|---|---|---|---|---|---|---|---|---|
| Hinterhof | 8 | 180 s | 1 461 | 119 | 147 KB | 55 | 58 | 41 | 353 |
| Rasenplatz | 14 | 300 s | 1 827 | 88 | 232 KB | 76 | 111 | 21 | 590 |
| Sportplatz | 18 | 330 s | 1 252 | 57 | 244 KB | 68 | 102 | 15 | 648 |
| Großfeld | 22 | 360 s | 2 022 | 84 | 262 KB | 65 | 97 | 14 | 706 |

Projektnotizen dazu: volle Simulation 2–3 s je Spiel auf dem Handy (`pokal.js:356`), Spieltag 3,6–3,9 s im Browser
(`bgsim.js` Kommentar). Kein echtes Android-Gerät im Test – Handywerte stammen aus früheren Messungen des Projekts.

### 7.2 Folgerungen

- **Speicher ist der Engpass, nicht die Rechenzeit.** Das Protokoll eines Spiels (150–260 KB) ist so groß wie ein ganzer
  Spielstand (100–230 KB, `localStorage`). Dauerhaft speicherbar sind nur **verdichtete Kennzahlen** (wenige hundert Byte je Spiel
  und Spieler-Saisonzeile), nie Rohdaten.
- **Mitschrift bei Ereignissen ist billig** (A2, C3, D2): wenige Dutzend bis gut hundert Ereignisse je Spiel.
- **Rechnungen über alle Spieler jeden Schritt sind teuer:** Raumkontrolle jeden Schritt für 22 Spieler auf einem Raster würde die
  heutigen 57–119 µs je Schritt vervielfachen. Nur als Stichprobe (z. B. 2/s, wie `samples`) oder nur bei Ereignissen vertretbar.
- **Hintergrundspiele:** Alle Spiele der eigenen Liga laufen voll; jede Mehrbelastung je Schritt wirkt × (Spiele je Spieltag).
  Messgrenze vorschlagen: **höchstens +10 % Rechenzeit** je Spiel für die gesamte Analytics-Mitschrift.

### 7.3 Optimierungsmöglichkeiten
- **Ereignisbasiert statt je Schritt** (Pass, Annahme, Zweikampf, Schuss, freier Ball) – deckt fast alle Kennzahlen aus Abschnitt 4.
- **Stichproben** für Flächengrößen (vorhanden: `samples` alle 0,5 s).
- **Verdichten nach dem Abpfiff:** Rohprotokoll → Spielzusammenfassung (Kennzahl, n, Herkunft) → Saisonsumme; Rohprotokoll verwerfen.
- **Detail nur, wo es wirkt:** volle Mitschrift für das eigene Spiel; für Hintergrundspiele nur die Saisonsummen, die Tabellen und
  Scouting brauchen.
- **Wiederverwendung:** `matchlog.js` (Ballbesitz, Pässe, Ballverluste) ist die Basis; keine zweite Mitschrift daneben bauen.
- Keine zweite Simulationsauflösung nötig: Die Engine ist überall gleich (Determinismus, Golden).

---

## 8. Drei Umsetzungsszenarien

| | **1 – Analytics ohne Engine-Umbau** | **2 – Gezielte Erweiterung** | **3 – Räumliche Engine** |
|---|---|---|---|
| Inhalt | Kennzahlen aus vorhandenen Daten + reine Mitschrift (A2, C3, D2) | wie 1 + Druckmodell mit mehreren Gegnern (C1), Zweite-Ball-Staffelung (D1), Raumkontrolle als Stichprobe (A3), Feinrollen nur Außen/Zentrum (B1 klein) | Feinrollen, Rotation, Raumbesetzung/Überzahl, volle Pitch Control, Pressingfallen |
| Kennzahlen (Abschnitt 4) | 1, 6 voll; 3, 4 (B-Fassung), 7, 8 (Mannschaft) | zusätzlich 3, 4 (C-Fassung), 2 (teilweise) | alle 8, 5 erst hier |
| Realismus | mittel – misst, was die Engine tut | gut | hoch (wenn kalibriert) |
| Aufwand | S–M | M–L | L+ (Monate) |
| Performance | + < 5 % (Ereignisse) | + 5–15 % (je nach Raumstichprobe) | deutlich mehr; Hintergrundspiele kritisch |
| Wartbarkeit | gut (nur Lese-Module) | mittel (Engine-Änderungen mit Golden/Balance) | schwer (viele verzahnte Schichten) |
| Langfristiger Nutzen | Grundlage für alles Weitere | hoch | hoch, aber Risiko für Spielgefühl und Balance |
| Kompatibilität | voll (Golden bleibt) | Golden ändert sich bei C1/D1/B1; je Schicht Schalter + Vorher/Nachher-Messung wie bisher | Umbau großer Teile von `ai.js`/`actions.js` |

### Empfehlung

**Szenario 1 sofort, Szenario 2 schrittweise danach, Szenario 3 nicht.**
- Szenario 1 liefert die zwei A-Kennzahlen (Territorium, Angriffskontinuität) und die B-Fassungen ohne Risiko und schafft das
  Datenmodell mit Herkunftskennzeichnung, auf dem alles Weitere aufbaut.
- Aus Szenario 2 nur, was eine konkrete Kennzahl braucht und sich als **schaltbare Schicht** gegen den alten Stand messen lässt
  (Projektregel). Reihenfolge: C1 Druckmodell → D1 zweite Bälle → B1 klein (Außen/Zentrum) → A3 Raumstichprobe.
- Szenario 3 steht in keinem Verhältnis: Die Plätze sind klein (4er bis 11er), die Spiele gestaucht, die Engine läuft auf dem
  Handy für eine ganze Liga. Eine volle Raum-Engine würde Spielgefühl, Balance und Rechenzeit gefährden, ohne dass der Spieler
  den Unterschied in einem Amateurspiel sieht.

---

## 9. Roadmap (technisch)

| Phase | Inhalt | Priorität | Aufwand | Abhängigkeiten | Risiken | Akzeptanzkriterien | Start der nächsten Phase, wenn … |
|---|---|---|---|---|---|---|---|
| **0** Audit & Data Reality Check | dieser Bericht | – | erledigt | – | – | Bericht, Matrix, Entscheidungen offen | Nutzer gibt frei und entscheidet Abschnitt 10 |
| **1** Datenmodell & Ereigniserfassung | Herkunftskennzeichnung, Erweiterung `matchlog.js` (Druck beim Abspiel, Zweikampf-Ort/-Verlierer, freie Bälle, Packing/Linien), Spielzusammenfassung, Saisonsummen im Spielstand | hoch | M | Phase 0 | Speicher (localStorage) | Golden unverändert; Mitschrift ≤ +10 % Rechenzeit; Saisondaten ≤ 20 KB je Stand nach 5 Saisons (Zielwert, zu bestätigen) | Daten vollständig für A/B-Kennzahlen |
| **3** Validierung (vorgezogen) | Messläufe: Kennzahlen stabil (Seeds), sinnvoll (Befehl hoch pressen → mehr Ballgewinne vorne), unabhängig voneinander | hoch | S–M | Phase 1 | Erkenntnis „misst nichts“ | jede Kennzahl: Streuung bekannt, Mindest-n festgelegt, Reaktion auf Taktik nachgewiesen | Kennzahl besteht die Prüfung |
| **4** Advanced Football Analytics (Szenario 1) | Anzeige: Spielbericht, Spieler, Saison, Gegner-Scouting | hoch | M | 1, 3 | Überfrachtung der UI | nur geprüfte Kennzahlen, Herkunft sichtbar, Handy-Layout | Nutzer bestätigt Nutzen |
| **2** Engine-Erweiterungen (Szenario 2) | C1, D1, B1 klein, A3 – je als Schicht mit Schalter | mittel | M–L | 1, 3 | Balance, Golden | je Schicht: besser als vorher gemessen, sonst raus | Schicht bestanden |
| **3b** Validierung je Erweiterung | wie Phase 3 | mittel | S je Schicht | 2 | – | wie Phase 3 | – |
| **5** Advanced Football Intelligence | Lageerkennung (`situations.js`) auf neue Kennzahlen; Erklärungen | mittel | M | 4 | Scheinwissen | Aussagen nur aus geprüften Kennzahlen | – |
| **6** KI-Trainer, Scouting, Transfers | CPU-Trainer (`aicoach.js`) und Scouting nutzen Kennzahlen; **nur eigene Liga hat Detaildaten** | mittel | M | 4, 5 | Ungleichheit zu Poisson-Ligen | Entscheidungen nachvollziehbar, nicht stärker als Mensch | – |
| **7** Spielerentwicklung & Beratung | Training/Entwicklung an Kennzahlen; Empfehlungen an den Manager | niedrig | M | 4–6 | Gewichtungen | Empfehlungen messbar wirksam | – |
| **8** Liga- und Saisonanalyse | xG-Tabelle, Saisonrückblick; **nur eigene Liga** | niedrig | S–M | 1, 4 | Speicher | Speicherziel eingehalten | – |

**Geänderte Reihenfolge:** Validierung (3) **vor** Engine-Erweiterungen (2) und vor der Anzeige (4): Erst zeigt sich, welche
Kennzahlen aus den vorhandenen Daten tragen; Erweiterungen dann nur für nachgewiesene Lücken. Phase 2 läuft danach parallel zu 4.

---

## 10. Entscheidungen vor einer Implementierung

1. **Szenario:** 1 sofort, 2 schrittweise, 3 nicht – einverstanden?
2. **Speicherbudget** für Saison- und Spielerkennzahlen im Spielstand (Vorschlag ≤ 20 KB nach 5 Saisons) und wie viele Saisons
   aufbewahrt werden.
3. **Rechenzeitgrenze** für die Mitschrift (Vorschlag ≤ +10 % je Spiel).
4. **Umfang der Detaildaten:** nur eigener Verein, oder alle Vereine der eigenen Liga (für Scouting/Tabelle nötig, kostet Speicher)?
5. **Poisson-Ligen:** bleibt es dabei, dass Vereine außerhalb der eigenen Liga keine Detailwerte haben (Empfehlung: ja)?
6. **Anzeige der Herkunft:** sichtbar für den Spieler (Symbol/Tooltip) oder nur intern?
7. **Mindeststichproben** (Vorschläge in Abschnitt 6.2) bestätigen oder messen lassen.
8. **Punkt 38 (xG im Ticker):** fertig gebaut, aber nicht committet, weil dieser Auftrag Vorrang hat – behalten als Teil von
   Phase 4, oder zurückstellen?
9. **Punkt 47 der Projekt-Roadmap** (Moderne Statistiken) geht in diesem System auf – als „ersetzt durch ADVANCED FOOTBALL SYSTEM“
   führen?
10. **Feinrollen (B1):** gewünscht? Sie sind die Voraussetzung für Positionsflexibilität und Spieler-Eignung, verändern aber die
    Balance am stärksten.

---

## 11. Fortsetzung

Ergänzung 02 (Advanced Football Intelligence) baut auf diesem Bericht auf: `docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md`.
Dort steht die **gemeinsame Roadmap** beider Aufträge (Abschnitt 9); die Phasen 5–8 dieses Berichts gehen in den Phasen 7–13
der Ergänzung auf, dazu kommen Phase 5 (Profile) und Phase 6 (Philosophien).
