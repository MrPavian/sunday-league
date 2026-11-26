# Advanced Football System – Phase 6: Philosophien und Trainertyp „Ballbesitz“

Stand: 2026-11-26. Grundlage: `docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md` Abschnitt 6 und Entscheidung E4 (fünfter
Trainertyp). Code: `src/intel/philosophy.js`, `src/career/opponents.js` (`COACH5`, `coachOf`), `src/sim/aicoach.js`
(`PERSONAS.ballbesitz`), `src/career/patterns.js` (Handschrift `ballbesitz`), `src/career/president.js` (Bewerber), Gewichte in
`src/intel/core.js rank`. Messung: `scripts/afs-validate.mjs` (Befehle und Ballbesitzzeit), `scripts/afs-effects.mjs`,
`scripts/afs-philosophy.mjs`. Tests: `tests/afsPhilosophy.test.js`.

## 1. Nutzerentscheidungen (2026-11-26)

- Der neue Typ entsteht aus **etwa der Hälfte der bisherigen Kumpeltypen**. Alle anderen Vereine behalten Typ, Name, Handschrift
  und Sprüche.
- Der Typ ist auch im **Präsidium** als Trainer einstellbar.

## 2. Was ein Ballbesitz-Trainer tut – gemessen

Die typischen Befehle wurden wie in Phase 7 gegen Spiele ohne Befehl gemessen (Seeds 20000–20039, je Platz 160 Spiele ohne gegen
80 mit Befehl). Neu ist die **Ballbesitzzeit**: Das Messskript zählt die Sekunden, in denen eine Mannschaft zuletzt am Ball war
(`m.lastPossession`, `sim/ai.js`). Das zählt nur das Skript, das Spiel selbst ist unverändert.

| Befehl | Ballbesitz (Rasenplatz / Großfeld) | eigene xG | Pässe je Spiel | Passquote |
|---|---|---|---|---|
| `build:halten` | **+3,2 / +2,2 Prozentpunkte** (t 7,9 / 5,2) | **−0,44 / −0,20** | −1,6 / −1,1 | ± 0 |
| `risk:sicher` | **+2,1 / +1,1** (t 5,6 / 3,1) | **−0,28 / −0,18** | **−2,5 / −1,5** | ± 0 |
| `tempo:ruhig` | ± 0 | ± 0 | **−4,4 / −3,7** | ± 0 |
| `build:kurz` | ± 0 | ± 0 | ± 0 | ± 0 |
| `route:kombi` | ± 0 | ± 0 | +1,7 / +0,7 | **−2,9 / −4,4 Punkte** |

Fett: auf beiden Plätzen |t| ≥ 2 in dieselbe Richtung. Rohdaten: `scripts/afs-effects.mjs` auf `AFS_OUT` von
`node scripts/afs-validate.mjs 40 rasenplatz,grossfeld 80 build:halten,tempo:ruhig,route:kombi,risk:sicher,build:kurz,route:mitte`.

**Folge:**
- Handschrift `ballbesitz`: `build:halten`. Das ist der einzige Befehl, der den Ballbesitz deutlich hebt.
- Im Spiel mag der KI-Trainer `build:halten` und `risk:sicher` und meidet lange und schnelle Wege (`build:direkt`, `route:konter`,
  `route:tiefe`, `risk:aggressiv`).
- Ein Gegenmittel ist nicht gemessen (`counter: null`). Der Co-Trainer sagt nur, was gemessen ist: Der Gegner hält den Ball und
  wird dabei seltener gefährlich (eigene xG sinken).
- In der Engine bedeutet Ballbesitz nicht mehr Pässe oder eine bessere Passquote. Er bedeutet längeres Halten des Balls bei
  weniger Torgefahr.

## 3. Philosophie als Tabelle

`philosophyOf(type)` gibt `{ like, avoid, weights, src: 'SET' }` zurück:
- `like` und `avoid` stammen aus `aicoach.js PERSONAS`, sodass es dieselbe Quelle wie im Spiel ist. Dazu kommen gemiedene Grundstile.
- `weights` sagen, was den Trainer zuerst stört. `rank` multipliziert die gemessene Wirkung gegen einen Befund mit diesem Gewicht.
- Alles hier ist bewusst gesetzt (Charakter, **Spielwert**). Die Wirkungen selbst bleiben gemessen.

| Typ | bevorzugt | meidet (zusätzlich zu PERSONAS) | Gewichte |
|---|---|---|---|
| Großmaul | Risiko, Aufrücken, Pressing, Tiefe | Mauern | xG × 1,5, Feldvorteil × 1,5 |
| Alte Schule | Pressing, kompakt, direkt, tief, Konter | Offensiv | Gegner-xG × 1,5, überspielte Gegner × 1,5 |
| Stratege | Kombinieren | – | – |
| Kumpeltyp | – | – | – |
| Ballbesitz | Ball halten, sicher | Mauern | Passquote × 2 |

Kaderwünsche aus Abschnitt 6 fehlen: Dafür braucht es Spielerbefunde, die es nicht gibt (Phase 7). Sie kommen mit der
Kaderpassung (Phase 8).

## 4. Messung

### 4.1 Verteilung (alle 60 Vereine der Pyramide)

| | Stratege | Alte Schule | Großmaul | Kumpeltyp | Ballbesitz |
|---|---|---|---|---|---|
| Schalter aus (alter Stand) | 17 | 18 | 13 | 12 | – |
| Schalter an | 17 | 18 | 13 | 5 | 7 |

In der untersten Liga (8 Vereine) sind `doener` und `intermailand` Ballbesitz-Vereine.

### 4.2 Gleiche Befunde, verschiedene Entscheidungen

12 Saisons (Seeds 11, 23, 37, 41, 59, 73, 89, 97, 101, 113, 127, 131; 8 Vereine). Nach jedem Spieltag wurde jeder Verein mit
Problem diagnostiziert und mit jeder der fünf Philosophien gerankt.

- **In 320 von 402 Fällen (80 %)** schlagen die Typen nicht alle dasselbe vor.
- Erster Vorschlag je Typ über alle Fälle:

| Typ | häufigste erste Vorschläge |
|---|---|
| Großmaul | `build:direkt` 251, `style:offensiv` 60, `route:mitte` 59, keiner 32 |
| Alte Schule | `build:direkt` 261, `route:mitte` 73, keiner 53, `style:mauern` 15 |
| Stratege | `style:mauern` 156, `build:direkt` 120, `route:mitte` 59, `style:offensiv` 44, keiner 23 |
| Kumpeltyp | wie Stratege |
| Ballbesitz | keiner 237, `route:mitte` 88, `style:offensiv` 77 |

- Stratege und Kumpeltyp unterscheiden sich im Kern nicht: Beide haben keine Gewichte, und Kombinieren ist keine gemessene Option.
  Im Spiel unterscheiden sie sich weiter über die Reaktionsfreude (`react` 0,85 gegen 0,35).
- Großmaul und Alte Schule kommen oft zum selben Vorschlag (`build:direkt`), aus verschiedenen Gründen.
- Ballbesitz schlägt am häufigsten nichts vor: Er meidet Direkt und Mauern, und für seine Probleme bleibt oft keine gemessene Option.

### 4.3 Schalter an gegen aus (dieselben 12 Saisons)

| | Punkte je Saison, Änderung | t |
|---|---|---|
| Ballbesitz-Vereine (24 Vereinssaisons) | −2,0 (Streuung 7,1) | −1,4 |
| übrige CPU-Vereine (60) | +0,3 (4,8) | 0,4 |
| eigener Verein (12) | +2,8 (6,4) | 1,5 |

- Tore je Spiel in der Liga: 2,96 aus, 2,98 an.
- Die Ballbesitz-Vereine holen im Mittel etwas weniger Punkte. Das passt zu den gesunkenen eigenen xG, ist mit 12 Saisons aber
  nicht gesichert (|t| < 2). Die Ergebnisse streuen stark, weil sich mit einem anderen Typ der ganze Saisonverlauf verschiebt.
- Rechenzeit: Eine Philosophie ist ein Tabellenzugriff; `rank` bleibt unter 0,5 ms je Spieltag (Phase 7).

## 5. Grenzen

- Die Philosophie wird von `rank` genutzt, aber noch von keinem Entscheider außerhalb des Spiels. Matchplan und Aufstellung der
  CPU folgen in Phase 8. Im Spiel wirkt der neue Typ schon über `PERSONAS` und die Handschrift.
- Die Wirkungen sind gegen einen Gegner im Stil „ausgewogen“ ohne KI-Trainer gemessen.
- Die Ballbesitzzeit ist eine Messgröße des Skripts und kein freigegebener Profilwert (nicht in `analytics.js`, nicht in Phase 3
  validiert).
