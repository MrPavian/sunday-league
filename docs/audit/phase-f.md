# Phase F – Memory & Lifecycle (Protokoll)

Regel: jeden Lebenszyklus mehrfach durchlaufen, nach jeder Runde Speicherbereinigung erzwingen und
GPU-Texturen, Geometrien, Shader-Programme, JS-Heap, Listener, DOM und Szenenobjekte messen.
Wächst etwas dauerhaft, wird die Ursache per WebGL-Protokoll (`createTexture`/`deleteTexture` mit
Aufrufstapel, Größe, Format) belegt, dann behoben und mit einem Browser-Test abgesichert.

## F1 – Messung aller Lebenszyklen (Release-Build)

| Zyklus | Runden | Ergebnis vorher |
|---|---|---|
| Karriere: Spiel → Vereinsheim (bestehender Test) | 4 | Texturen 24 → 28 |
| Vereinsheim: alle 15 Tabs | 5 | stabil (Listener 87, DOM 1 492, Texturen 24) |
| Karriere-Runden per Liveticker | 4 | stabil nach Runde 1 (Listener 100, Texturen 24) |
| Challenges öffnen/schließen | 4 × 5 | stabil (Listener 75, DOM 615) |
| **Spielorte im Menü durchschalten (6 Orte je Runde)** | 4 | **Texturen 26 → 37 → 50 → 62 → 74** ✗ |
| Freundschaftsspiele an wechselnden Orten | 5 | schwankt je Ort (26–44), kein Trend |
| **Freundschaftsspiele mit Polizei-Einsatz (gleicher Ort)** | 5 | **Texturen 26 → 30 → 34 → 38 → 42 → 46** ✗ |

## F2 – Leck 1: Schattenkarte der Sonne beim Ortswechsel ✔

- **Beleg (WebGL-Protokoll, 12 Ortswechsel):** 12 × `1024×1024` Farb-Render-Target
  (`WebGLShadowMap.render`) + 12 × `1024×1024` Tiefentextur leben weiter – eine je Wechsel, obwohl
  nur der aktuelle Ort ein Sonnenlicht hat. ≈ 8 MB GPU-Speicher je Ortswechsel.
- **Ursache:** `disposeTree` (Kulisse freigeben) gab Geometrien und Materialien mit Textur frei,
  aber nie die Lichter; die Schattenkarte hängt am `DirectionalLight`.
- **Behebung (`src/render/merge.js`):** `if (o.isLight) o.dispose();` – three.js gibt damit die
  Schattenkarte frei (`LightShadow.dispose`).
- **Nachher:** Spielorte 4 Runden: 25 → 25 → 25 → 25 → 26. Auch der Karriere-Zyklus ist flacher
  (22 → 22 statt 24 → 28), weil Karrierespiele ebenfalls den Ort wechseln.

## F3 – Leck 2: Besucher-Figuren bei Vorfällen ✔

- **Beleg:** +4 Texturen je Spiel mit Polizei (2 Besucher × eigener Trikot-Atlas + Knochen-Textur).
- **Ursache:** `MatchView.dispose` gab Spieler und Schiri frei, nicht aber die Besucher-Figuren
  von `IncidentView` (Polizei, Hundebesitzer, …).
- **Behebung:** `IncidentView.dispose()` (gibt jede Besucher-Figur mit `disposeKit` frei), aufgerufen
  aus `MatchView.dispose`.
- **Nachher:** 5 Polizei-Spiele: 26 → 26 → 26 → 26 → 26 → 26.

## F4 – Neue Browser-Prüfungen (`scripts/e2e/memory.mjs`)

- **Spielorte im Menü durchschalten** (3 Runden × alle Orte): Texturen/Geometrien dürfen nach der
  ersten Runde höchstens um 2 wachsen.
- **Freundschaftsspiele mit Vorfall** (4 Spiele, `?incident=polizei`): prüft, dass die Polizei
  wirklich aufs Feld kommt, und dass Texturen nicht wachsen.
- Gegenprobe gegen den alten Code: siehe Abschnitt „Gegenprobe".

## Bewusst nicht geändert

- Materialien ohne Textur der Wetter-/Vorfall-Effekte werden nicht einzeln freigegeben: Shader-
  Programme blieben in allen Zyklen konstant (15–21 je nach Ort), GPU-Speicher hängt nur an Texturen
  und Geometrien – kein messbares Leck.
- JS-Heap wächst in den Menü-Zyklen um < 1 MB nach der ersten Runde und flacht ab (Caches, JIT) –
  kein Trend über die Runden.

## Gegenprobe

Beide neuen Prüfungen gegen den alten Code (Behebungen vorübergehend zurückgenommen) ausgeführt:
- Spielorte: **✗** „GPU-Texturen wachsen je Ortswechsel: 26 → 36 → 48 → 60"
- Polizei-Spiele: **✗** „GPU-Texturen wachsen je Spiel: 26 → 30 → 34 → 38 → 42"

Mit Behebung: beide ✓ (Spielorte 24 → 24 → 26 → 24, Polizei 24 → 26 → 26 → 26 → 26).

## Nebenbefund: einmalige Meldung „Schaltfläche < 44 px" (UI-Test, Hochformat, Verein)

- Im Gesamtlauf einmal gemeldet: „Vereinschronik" 143 × 44 (gerundet) – also knapp unter 44 px.
- Nicht reproduzierbar: 10 gezielte Durchläufe (einzeln und in Suite-Reihenfolge, Messung nach 0/100/250/1000 ms)
  zeigen die Schaltfläche exakt 44,000 px hoch; kein Vorfahre mit Skalierung. Einzige laufende
  Animation beim Messen: der Bereichswechsel (`area-in`, 0,18 s).
- Test robuster und aussagekräftiger gemacht, **nicht** gelockert: Grenze bleibt 44 px; gemessen
  wird nach Ende laufender Übergangs-Animationen (`settle`, max. 2 s), die Meldung zeigt jetzt exakte
  Maße mit zwei Nachkommastellen und die Aktion der Schaltfläche. Danach 3 × 4 Größen grün.
