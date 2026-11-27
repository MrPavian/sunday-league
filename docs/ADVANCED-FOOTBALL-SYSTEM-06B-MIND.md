# Advanced Football System – Phase 6b: Spielintelligenz (Antizipation, Übersicht, Stellungsspiel)

Stand 2026-11-27. Entscheidung E6 (Bericht 02, Abschnitt 11): neue Fähigkeitswerte einführen, als schaltbare Schicht mit
Vorher/Nachher-Messung. Ergebnis: **Werte eingeführt, Engine-Wirkung gebaut, gemessen und ausgeschaltet** (Nutzerentscheid).

## 1. Entscheidungen des Nutzers (2026-11-27)

| Frage | Entscheidung |
|---|---|
| Wirkung | ergänzend um die Mitte 0,5 (später: verstärken und neu messen, dann Fehler-Modell) |
| Stärke (`ratePlayer`) | erst messen, später einrechnen |
| Anzeige | sichtbar auf Spielerkarte und Profil |
| Nach drei Messungen ohne Vorteil | Werte ja, Engine-Wirkung aus |

## 2. Werte und Herleitung (`src/sim/mind.js`)

- Schlüssel `anticipation`, `vision`, `positioning` in `p.attrs`, Werte 0,08–0,92 bei der Entstehung, höchstens 0,98.
- **Ohne Zufallsstrom** (wie „Körper“, `strength.js`): Der Pool, die Namen und alle alten Werte bleiben gleich. `deriveMind`:
  - verwandte Werte (Spielwert): Antizipation ½ Zweikampf + ½ Technik, Übersicht 0,6 Passen + 0,4 Technik, Stellungsspiel
    0,6 Zweikampf + 0,4 Kopfball; Anteil 0,5 der Abweichung vom Pool-Mittel (gemessen 0,449 / 0,456 / 0,442)
  - Erfahrung +0,006 je Jahr um 28 (18–34 begrenzt), Spielwert
  - stabiler Zufall ±0,08 (1 sigma) aus Alter und Aussehen (FNV-1a), ohne Namen: eine neue Namens-Auflage ändert die Werte nicht
- Gemessen am Standardpool (25.000 Spieler): Mittel 0,502 / 0,502 / 0,503, SD 0,105; 19 ms für den ganzen Pool.
- Nicht in der Stärke (`ratePlayer` unverändert), steigen nicht mit dem Niveau (`niveau.js liftsAttr`), Obergrenze 0,98 auch
  im Stärkemodell 2/3 (`skill.js attrMax`).
- **Alte Spielstände:** Pool-Spieler bekommen die Werte beim Erzeugen; eigene Spieler (`career.custom`) per `ensureMind` beim
  Laden, identisch zur Herleitung. Kinder, Söhne von Ex-Spielern und der Trainer-Avatar leiten nach dem Überschreiben von Alter
  und Aussehen neu ab (`generations.js`, `personal.js`).
- **Entwicklung** (`career.js developPlayers`): eigener Zufallsstrom (Salz 19), damit die Entwicklung der alten Werte gleich bleibt;
  nur Zuwachs, kein Abbau im Alter; Jugend wie die übrigen Werte (`youth.js`). Nur bei eingeschalteter Schicht.
- **Anzeige:** `ui/attrLabels.js` – Antizipation, Übersicht, Stellungsspiel auf Sammelkarte und im Profil-Tab „Werte“ (nur
  eigene Spieler; andere Vereine zeigen keine Einzelwerte, die Kenntnisregeln bleiben unverändert).

## 3. Engine-Wirkung (Schalter `MIND.on`, Standard aus)

Andockstellen (alle hinter dem Schalter; aus = Verhalten Bit für Bit wie vorher, Golden 6/6 identisch geprüft):

| Wert | Stelle | Fehler-Modell (zuletzt gemessen) |
|---|---|---|
| Antizipation | `ai.js updateTactics` → `reachSpot` (Abpraller) | Reaktionszeit 0,2 s + 0,25 s · Schwäche |
| Antizipation | `actions.js` Steilpass, `m.pass.react` | + 0,3 s · mittlere Schwäche der Verteidiger |
| Übersicht | `ai.js aiDecide` Steilpass „gesehen“ | Chance · (1 − 0,6 · Schwäche) |
| Übersicht | `ai.js aiDecide` freier Mitspieler vorn | Chance · (1 − 0,5 · Schwäche) |
| Stellungsspiel | `ai.js updateTactics` zone/mark | Ziel rückt 0,3 · Schwäche des Wegs zum Ball |
| Stellungsspiel | `ai.js` `CAUGHT_TIME` nach Ballverlust | · (1 + 0,6 · Schwäche) |

Schwäche = (0,75 − Wert) / 0,6, begrenzt auf 0–1. Alle Zahlen sind Spielwerte.

## 4. Messungen (`scripts/afs-mind.mjs`, 4 feste Paarungen, Seeds 30000+, Mannschaft 0 bekommt +0,2 auf einen Wert)

Referenz (+0,2 auf alte Werte, 240 Spiele je Platz): Technik Δ xG-Differenz +0,22 (t 3,0) / +0,22 (t 3,3), Zweikampf
+0,34 (t 4,2) / +0,19 (t 2,8) – Rasenplatz / Großfeld.

| Variante | Spiele je Platz | Tore/Spiel aus → an (Rasen / Groß) | Δ xG-Differenz Antizipation | Übersicht | Stellungsspiel |
|---|---|---|---|---|---|
| 1 um die Mitte | 240 | 3,00 → 2,93 / 1,71 → 1,70 | +0,05 / +0,04 | −0,02 / +0,07 | −0,11 / +0,13 |
| 2 Antizipation, Übersicht doppelt | 480 | 3,04 → 2,89 / 1,75 → 1,71 | −0,06 / −0,08 | +0,02 / 0,00 | −0,07 / −0,07 |
| 3 Fehler-Modell | 480 | 3,04 → 2,69 / 1,75 → 1,66 | +0,01 / −0,03 | −0,03 / −0,02 | **−0,23 (t −4,2)** / −0,09 |

Kein Wert bringt einen messbaren Vorteil; Stellungsspiel wirkt im Fehler-Modell signifikant **umgekehrt**: Verteidiger, die zum
Ball gezogen werden, verteidigen in dieser Engine besser. Daraus folgt kein Problem der neuen Werte, sondern ein Befund zur
Zonendeckung (`ai.js updateTactics`, Ankerpunkte `anchor()`): sie ist zu passiv. Weiteres Drehen an den Zahlen wäre Raten.

Rechenzeit (ein Thread, 20 Spiele je Platz abwechselnd, Variante 1): Rasenplatz 34,1 → 34,2 µs je Schritt, Großfeld 52,5 → 54,4
(+3,6 %). Speicher (Seed 11, 8 Vereine, 5 Saisons, Variante 1 an): 272,1 → 273,0 KB (+0,8 KB); mit Schalter aus kein Zuwachs
aus der Entwicklung, nur die Werte eigener Spieler.

## 5. Offen

- **Zonendeckung untersuchen** (vor Phase 11): warum ballorientiertes Verschieben besser verteidigt; danach die Wirkung von
  Stellungsspiel neu aufsetzen, Antizipation und Übersicht neu messen.
- Gewichte in der Stärke erst, wenn eine Wirkung gemessen ist.
- Entwicklung der Werte ruht bei ausgeschalteter Schicht; Training (Phase 11) baut darauf auf.
