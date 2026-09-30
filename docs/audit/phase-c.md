# Phase C – Structural Cleanup (Protokoll)

Grundlage: `docs/audit/phase-a.md` (God-Module, doppelte Helfer, Media-Queries). Jede Änderung mit
Beweis; Tests (362), Build und Browser-Suite (`npm run e2e`: ui, match, memory) grün.

## C0 – R2 (Trikot-Vorschau-Cache) verworfen

Hypothese aus Phase A: Kader-Neuaufbau (17–19 ms) kostet wegen der Trikot-Vorschau-Canvas.
Cache eingebaut, dreimal gemessen: weiterhin 17–19 ms → Kosten liegen im DOM/Layout (~800 Knoten),
nicht in der Canvas. **Zurückgenommen** (keine Optimierung ohne messbaren Nutzen).

## C1 – Vereinsheim aufgeteilt (`src/ui/Clubhouse.js`)

| | vorher | nachher |
|---|---|---|
| `Clubhouse.js` | 1 816 Zeilen / 129 878 B | 459 Zeilen (Konstruktor/Aktions-Router, Gesten, `render`) |
| `clubhouse/home.js` | – | Heute: Raum, nächstes Spiel, Ergebnisse, Saisonende, Aushang (11 Methoden) |
| `clubhouse/team.js` | – | Kader, Profil, Aufstellung, Taktik, Training, Jugend, Transfers (16 + `playerCard`) |
| `clubhouse/season.js` | – | Tabelle, Spielplan, Turniere (6) |
| `clubhouse/club.js` | – | Kasse, Verein, Wappen, Chronik, Museum (9) |
| `clubhouse/phone.js` / `pub.js` | – | Handy-Chat (1) / Kneipe inkl. Dart (3) |
| `clubhouse/shared.js` | – | gemeinsame Helfer (`STATUS`, `first`, `dartPoints`, `formArrow`, `timeLabel`, `leagueName`, `euro`) |

- **Technik:** Methoden wortgleich in Methoden-Objekte verschoben und per
  `Object.assign(Clubhouse.prototype, …)` wieder angehängt → `this`, Aufrufer, `data-action`-Router
  und Tests unverändert (clubnav-Test zählt weiterhin 14 `tab_`-Methoden am Prototyp).
- **Beweis Vollständigkeit:** Skript vergleicht alle Modul-Bindungen der alten Datei mit den
  Importen jeder neuen Datei. Die Browser-Suite fand dabei zwei Lücken (`ownKids`, `defaultCrest` –
  nur hinter Spread `...` benutzt, vom ersten Prüfskript übersehen); behoben, Prüfung korrigiert,
  danach 0 fehlende Bindungen.
- **Nutzen:** Bereiche einzeln lesbar/prüfbar; Grundlage für späteres Nachladen (Phase E).
- **Risiko:** gering (keine Logik geändert). **Performance/Verhalten:** unverändert.

## C2 – Doppelte Helfer

| Änderung | Beweis | Wirkung |
|---|---|---|
| `hex` (0xRRGGBB → `#rrggbb`) aus `ds.js`; 5 identische Kopien entfernt (Hud, ClubScene, TitleScreen, CoachCreator, Vereinsheim) | Zeichengleiche Definition | keine Verhaltensänderung |
| **behalten:** `hex` in `world.js`, `Ticker.js`, `SubPanel.js` | andere Rückfallwerte (Strings, `null`) | – |
| **behalten:** `hex` in `render/DebugOverlay.js`, `render/lighting.js` | Render-Schicht importiert nicht aus ui; lighting.js ist eine andere Funktion | – |
| **behalten:** `euro` in ClubScene | rundet auf ganze Euro (Vereinsheim-Szene), Vereinsheim zeigt Cent → verschiedenes Verhalten | – |

## C3 – Media-Queries

- `(orientation: landscape) and (max-height: 520px)` (6×) auf die Schreibweise
  `(max-height: 520px) and (orientation: landscape)` (jetzt 13×) vereinheitlicht – gleiche Bedeutung.
- **Behalten:** Umbrüche bei 760 px (Editor-, Kneipen-, Turnier-Raster). Ein Wechsel auf 720 px
  würde das Layout zwischen 721 und 760 px Breite sichtbar ändern.

## C4 – `main.js` Karriere-Ablauf: bewusst nicht ausgelagert

Messung: Der Karriere-Abschnitt (Zeilen 576–836, ~260 Zeilen) liest 9 und schreibt 3 veränderliche
Modulvariablen (`career`, `careerMatch`, `challengeRun`, `match`, `nextStyle`, `pitch`, `seed`,
`venue`, `last`) und ruft `startMatch`, `setMode`, `showMatch` direkt. Eine Auslagerung bräuchte eine
Kontext-Brücke mit Gettern/Settern für diese Zustände – mehr Code und ein Risiko genau an der
Spielschleife (Pause, Halbzeit, Abpfiff), ohne Laufzeit- oder Bundle-Gewinn. Nach der Regel „kein
Refactor nur für Schönheit" **nicht** umgesetzt; `main.js` bleibt bei 1 086 Zeilen mit klaren
Abschnitten (Menü, Karriere, Challenges, Loop).

## Wirkung

| | vorher (Phase B) | nachher |
|---|---|---|
| größte UI-Datei | `Clubhouse.js` 1 816 Zeilen | `clubhouse/team.js` 512 Zeilen |
| JS-Bundle | 1 761 269 B (gzip 558 222) | 1 761 220 B (gzip 564 370*) |
| CSS-Bundle | 136 312 B | 136 310 B |
| Tests / Browser-Suite | 362 / grün | 362 / grün |
| Speicherzyklus (4 Spiele) | Texturen 24 → 28, Heap 21 → 22 MB | unverändert |

\* gzip-Wert schwankt mit der Modulreihenfolge im Bundle (mehr Dateien, andere Anordnung);
Rohgröße praktisch gleich. Das ist kein Laufzeit-Effekt – Phase E prüft das Bundle gezielt.
