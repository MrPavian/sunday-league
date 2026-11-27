# Advanced Football System – Phase 8: KI-Trainer vor dem Spiel (Matchplan)

Stand: 2026-11-27. Grundlage: `docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md` Abschnitt 5, Entscheidungen E5 (Fairness) und E7
(Schwierigkeit). Code: `src/intel/matchplan.js`, Einbau in `src/career/career.js prepareMatch` und `recordResult`, Gegenmittel in
`src/career/patterns.js`. Messung: `scripts/afs-plan.mjs`, `scripts/afs-plan-season.mjs`. Tests: `tests/afsMatchplan.test.js`.

## 1. Nutzerentscheidungen (2026-11-27)

| Frage | Entscheidung |
|---|---|
| Was tut der CPU-Trainer vor dem Spiel? | Gemessenes Gegenmittel gegen die Handschrift des Gegners, nur wenn es zur Philosophie passt. Keine Vorschläge aus den eigenen Befunden (Phase 7). |
| Was sieht er vom Menschen? | Nur den Plan, mit dem der Mensch im **letzten** Spiel aufgelaufen ist. |
| Notiz nach dem Spiel? | Weglassen. Ein einzelnes Spiel belegt keine Wirkung (Phase 3). |
| Nach der Neumessung | Nur das Gegenmittel gegen Pressing bleibt, für CPU und Mensch. |

## 2. Ablauf

```
prepareMatch ─► je CPU-Verein: seenPattern(Gegner) ─► PATTERNS[..].counter ─► Philosophie meidet? ─► Reaktionsfreude × Schwierigkeit
                                                                                                   └─► Befehl in team.tactic.orders
recordResult ─► career.seenPlan = Plan des Menschen in diesem Spiel (sieht der nächste Gegner)
```

- **Erkennen:** CPU-Gegner – seine feste Handschrift (`patterns.js patternOf`), wie der Mensch sie im Scouting sieht. Mensch – die
  erste Handschrift, deren Befehle alle im Plan seines letzten Spiels standen (`seenPattern`).
- **Philosophie:** Ein Gegenmittel, das der Trainertyp meidet (`intel/philosophy.js avoid`), setzt er nicht.
- **Häufigkeit:** Reaktionsfreude des Typs (`sim/aicoach.js PERSONAS react`, Stratege 0,85 … Kumpeltyp 0,35). Gegen den Menschen mal
  dem Faktor der Schwierigkeit aus dem Spiel (`aicoach.js DIFFICULTY`: entspannt 0,5, normal 1, hart 1,35; höchstens 0,95). Beides
  sind vorhandene Spielwerte, keine neuen.
- **Kein Zufallsstrom:** Die Entscheidung ist ein Hash aus Spielstand-Seed, Saison, Spieltag und Verein. Der Würfel des Spiels
  (`prepareMatch` rng) bleibt unberührt (Test: gleicher Spiel-Seed mit Schalter an und aus).
- **Schalter:** `PLAN.on` (Standard an). Aus: jede Woche die feste Handschrift wie vor Phase 8.
- **Speicher:** `career.seenPlan`, ein Objekt mit höchstens wenigen Befehlen.

## 3. Neumessung der Gegenmittel

Die Gegenmittel in `patterns.js` stammten aus einer früheren Messung (Sportplatz, je 120 Spiele, älterer Engine-Stand). Vor der
Nutzung durch die CPU wurden sie neu gemessen: `node scripts/afs-plan.mjs 60` und `node scripts/afs-plan.mjs 120 sportplatz`.
Mannschaft 0 mit Handschrift, Mannschaft 1 ohne Befehl gegen mit Gegenmittel, 4 Paarungen, gleiche Seeds (gepaart).

| Platz | Handschrift → Gegenmittel | Δ Tordifferenz | t | Δ xG-Differenz | t |
|---|---|---|---|---|---|
| Hinterhof | Pressing → lang spielen | +0,09 | 0,5 | **+0,16** | **2,5** |
| Rasenplatz | Pressing → lang spielen | −0,02 | −0,1 | +0,10 | 1,2 |
| Großfeld | Pressing → lang spielen | +0,13 | 1,1 | +0,13 | 1,8 |
| Sportplatz (480 Spiele je Bedingung) | Pressing → lang spielen | **+0,21** | **2,1** | **+0,15** | **2,7** |
| Hinterhof | lange Bälle → tief stehen | +0,09 | 0,6 | −0,10 | −1,8 |
| Rasenplatz | lange Bälle → tief stehen | +0,10 | 0,6 | −0,05 | −0,7 |
| Großfeld | lange Bälle → tief stehen | −0,10 | −0,8 | −0,07 | −0,9 |
| Sportplatz | lange Bälle → tief stehen | +0,11 | 1,0 | −0,03 | −0,5 |
| Hinterhof | Konter → ruhiges Tempo | +0,06 | 0,4 | ± 0,00 | 0,0 |
| Rasenplatz | Konter → ruhiges Tempo | −0,24 | −1,6 | −0,04 | −0,5 |
| Großfeld | Konter → ruhiges Tempo | −0,03 | −0,2 | +0,03 | 0,4 |
| Sportplatz | Konter → ruhiges Tempo | +0,02 | 0,1 | −0,08 | −1,6 |

(Hinterhof, Rasenplatz, Großfeld je 240 Spiele je Bedingung.)

**Folge:** Gegen Pressing hilft lang spielen auf allen vier Plätzen in die gute Richtung (xG), auf zweien gesichert. Die beiden anderen
Gegenmittel sind auf keinem Platz belegt und wurden entfernt (`counter: null`, wie bei Mauern und Ballbesitz). Damit bietet auch der
Co-Trainer des Menschen sie nicht mehr an; die Sätze im Scouting sagen jetzt, dass es kein Patentrezept gibt.

## 4. Messung in echten Saisons

`node scripts/afs-plan-season.mjs - ` und `… press:hoch`: 12 Saisons (Seeds 11 … 131), 8 Vereine, Schalter an gegen aus mit gleichem
Seed. Im zweiten Lauf setzt der eigene Verein die ganze Saison `press:hoch`.

| | ohne Plan des Menschen | Mensch mit Pressing |
|---|---|---|
| Pläne der CPU je Saison | 5,3 (gegen uns 0) | 11,8 (gegen uns 6,6) |
| Tore je Spiel aus / an | 2,98 / 2,95 | 2,89 / 2,87 |
| eigener Verein, Punkte an − aus | +0,5 (t 0,6) | −0,5 (Streuung 7,8, t −0,2) |
| Stratege / Ballbesitz / Alte Schule / Großmaul | −0,7 / ±0 / −0,3 / +1,1 (alle |t| ≤ 1,7) | −0,5 / +0,7 / −0,1 / +0,3 (alle |t| ≤ 1,5) |

- Die Wirkung eines Plans ist klein (rund +0,2 Tore in einem Spiel) und geht über eine Saison im Rauschen unter. Die Liga-Balance
  ändert sich nicht messbar.
- Rechenzeit: ein Tabellenzugriff und ein Hash je Verein und Spiel.

## 5. Grenzen und Offenes

- Der Mensch sieht im Scouting nicht, dass der Gegner sich auf seinen letzten Plan eingestellt hat. Ob das angezeigt werden soll, ist offen.
- Aufstellung nach Rollenpassung (TFS) und Kaderwünsche folgen mit Phase 9.
- Nur Spiele über `career.js prepareMatch`. Spiele aus `europa.js` und `nationalteams.js` bauen ihre Mannschaften selbst und bleiben unverändert.
- Die Gegenmittel sind gegen einen Gegner im Stil „ausgewogen“ ohne KI-Trainer gemessen. Im Spiel stellt der KI-Trainer weiter um
  (`aicoach.js`).
