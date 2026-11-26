# Advanced Football System – Phase 7: AFI-Kern

Stand: 2026-11-26. Grundlage: `docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md` Abschnitt 2, 4.2 und 4.3. Code:
`src/intel/core.js` (Kern), `src/intel/levels.js` (Stufen, gemeinsam mit der Anzeige aus Phase 4), Messung
`scripts/afs-effects.mjs`, Tests `tests/afsCore.test.js`.

## 1. Ablauf

```
teamProfile (Phase 5) ──► diagnose(career, id) ──► Befunde ──► options(befund) ──► rank(befunde, { philosophy, current })
```

- **Lose Kopplung:** Der Kern liest nur Profile und kennt die Engine nicht. Anwenden (Plan setzen, Aufstellung) bleibt Sache der
  Entscheider in Phase 8 und 12.
- **Eine Diagnose für alle:** Für jeden Verein der eigenen Liga gelten dieselben Regeln, für den Menschen wie für die CPU.
- **Deterministisch:** kein Zufall; gleicher Spielstand ergibt gleiche Befunde und gleiche Rangfolge (Test mit einer echten Saison).
- **Begründung:** Jeder Vorschlag nennt, welche Befunde er verbessert (`helps`), welche er verschlechtert (`hurts`) und ob er
  zur Philosophie passt.

## 2. Befunde

Nur Vereinswerte, die Phase 3 freigegeben hat. Ein Befund entsteht, wenn der Saisonwert mit z ≥ 1,96 vom Liga-Schnitt abweicht
(Feldvorteil: von 0,5). Die Streuungen je Spiel stammen aus Phase 3, Abschnitt 2.

| Befund | Wert | gute Richtung | ab Spielen | Herkunft der Belege |
|---|---|---|---|---|
| `xg:low` / `xg:high` | eigene xG je Spiel | mehr | 3 | MEASURED (Modell-xG, je Platz geeicht) |
| `xgA:high` / `xgA:low` | xG des Gegners je Spiel | weniger | 3 | MEASURED |
| `tilt:low` / `tilt:high` | Feldvorteil | mehr | 3 | MEASURED |
| `packing:low` / `packing:high` | überspielte Gegner je angekommenem Pass | mehr | 3 | MEASURED |
| `passPct:low` / `passPct:high` | Passquote | mehr | 8 | MEASURED |

Jeder Befund trägt `kind` (Problem oder Stärke), z und die Belege (`value`, `ref`, `n`, `src`). Stärken haben keine Optionen,
sie dienen später dem Gegnerprofil vor dem Spiel (Entscheidung E8).

**Nicht aufgenommen:**
- Spielerbefunde: Für Rollen- und Positionswechsel gibt es keine gemessene Wirkung, und xG je Spieler ist auf Großfeld nicht
  besser als die Position (Phase 5).
- Befunde aus Druck, zweiten Bällen und Mannschaftsteilen: in Phase 3 nicht freigegeben.
- Die Beispiele aus Ergänzung 02, die Ballbesitz, Angriffsfortsetzung oder Ballverluste nach Zeit brauchen: Diese Werte sind
  nicht in der Saisonsumme gespeichert und nicht validiert.

## 3. Optionen mit gemessener Wirkung

Messung: `scripts/afs-effects.mjs` auf den Phase-3-Rohdaten (Seeds 20000–20079, feste Paarungen, je Platz 160 Spiele ohne Befehl
gegen 80 mit Befehl). Aufgenommen ist nur, was auf **beiden** Plätzen mit |t| ≥ 2 in dieselbe Richtung geht. Die Wirkung steht in
Standardabweichungen eines Spiels ohne Befehl; verwendet wird der kleinere Wert der beiden Plätze.

| Befehl | Wirkung (Rasenplatz / Großfeld) | im Kern |
|---|---|---|
| `build:direkt` | überspielte Gegner je Pass +0,80 / +1,32; Passquote −0,29 / −0,93 | +0,80 / −0,29 |
| `style:mauern` | überspielte Gegner je Pass +1,92 / +1,08; Passquote −0,37 / −0,70 | +1,08 / −0,37 |
| `route:mitte` | Passquote +0,42 / +0,30 | +0,30 |
| `style:offensiv` | Feldvorteil +0,49 / +0,42 | +0,42 |

Auf nur einem Platz belegt und deshalb **nicht** im Kern: `press:hoch` xG +0,18 (nur Rasenplatz), `press:tief` Feldvorteil −0,05
(nur Rasenplatz), `route:aussen` xG −0,24 (nur Rasenplatz), `route:mitte` xG +0,18 (nur Großfeld), `style:offensiv` überspielte
Gegner (nur Großfeld) und Gegner-xG +0,12 (nur Großfeld).

**Folge:** Kein Befehl hebt die eigenen xG oder senkt die xG des Gegners auf beiden Plätzen. Die Befunde `xg:low` und `xgA:high`
haben deshalb keine Option. Der Kern meldet sie, schlägt aber nichts vor.

**Auffällig:** `style:mauern` überspielt mehr Gegner als alles andere (lange Bälle auf die Spitze, wie schon in Phase 3: Mauern
erzeugt so viel xG wie Offensiv). Gegen `packing:low` steht er deshalb vorn. Ob das gewollt ist, ist eine Balancefrage für
Phase 2, keine Frage des Kerns.

## 4. Rangfolge

Nutzen eines Befehls = Summe seiner gemessenen Wirkungen auf alle Problemwerte des Vereins. Wirkungen in die schlechte Richtung
zählen negativ. Danach gilt:
- Die Philosophie gibt `like` und `avoid` vor, im selben Format wie `aicoach.js PERSONAS`.
- Ein bevorzugter Befehl zählt × 1,5 (`INTEL.like`). Das ist eine gesetzte Charaktergröße und kein Messwert.
- Gemiedene und schon aktive Befehle fallen weg, ebenso alle mit Nutzen ≤ 0.

Beispiel: Ein Verein hat `packing:low` und `passPct:low`. Die Rangfolge ist `style:mauern` (1,08 − 0,37 = 0,71) vor
`build:direkt` (0,80 − 0,29 = 0,51) vor `route:mitte` (0,30).

## 5. Messung in echten Saisons

Zwei Karrieren (Seeds 11 und 23, 8 Vereine, Spiellänge wie im Spiel, 15 Spieltage). Nach jedem Spieltag wurde jeder Verein
diagnostiziert, wobei die aktuelle Taktik als `current` übergeben wurde.

| | Seed 11 | Seed 23 |
|---|---|---|
| Verein × Spieltag mit mindestens einem Befund | 60 / 120 | 45 / 120 |
| überspielte Gegner hoch / niedrig | 21 / 24 | 14 / 17 |
| Feldvorteil hoch / niedrig | 3 / 10 | 4 / 0 |
| eigene xG hoch / niedrig | 1 / 1 | 2 / 10 |
| Gegner-xG hoch / niedrig | 9 / 0 | 0 / 1 |
| Passquote hoch / niedrig | 11 / 10 | 1 / 8 |
| erster Vorschlag | `style:mauern` 17, `build:direkt` 7, `style:offensiv` 4, `route:mitte` 2 | `style:mauern` 17, `route:mitte` 8 |
| Rechenzeit des Kerns je Spieltag (alle Vereine) | 0,45 ms | 0,39 ms |

- Befunde zu überspielten Gegnern sind am häufigsten. Sie spiegeln vor allem die Handschrift der Vereine (Stil, Trainermuster)
  und ihre Heimplätze, siehe Abschnitt 6.
- Der häufigste erste Vorschlag ist `style:mauern`, weil er gemessen die größte Wirkung auf überspielte Gegner hat (Abschnitt 3).
  Bevor CPU-Trainer oder Beratung den Kern nutzen (Phase 8 und 12), braucht es die Philosophie (Phase 6) oder eine Entscheidung,
  ob Mauern dafür ein sinnvoller Rat ist.

## 6. Grenzen

- **Heimplätze:** Die Vereine einer Liga spielen auf verschiedenen Plätzen (Seed 11, Stufe 1: Hinterhof, Parkplatz, Ascheplatz,
  Park). Überspielte Gegner je Pass hängen stark am Platz (Phase 3: Rasenplatz 1,23, Großfeld 2,04). Ein Teil eines Befunds kann
  deshalb vom eigenen Heimplatz kommen. Ein Vergleichswert je Platz ist nur für Rasenplatz und Großfeld gemessen.

- Die Wirkungen sind Mittelwerte aus zwei Paarungen mit Stil „ausgewogen“ und ohne KI-Trainer. Gegen andere Gegner und Stile
  sind sie nicht gemessen.
- Die Wirkungen werden addiert; ob zwei Befehle zusammen so wirken wie einzeln, ist nicht gemessen. Der Kern schlägt deshalb eine
  Rangfolge vor und keine Kombination.
- Die Wirkung bezieht sich auf den Wert im Spiel und nicht auf Punkte. Tore hängen nur mäßig an xG und Feldvorteil (Phase 3,
  Abschnitt 5: r 0,40–0,49 und 0,24).
