# Phase E – Bundle & Startup (Protokoll)

Regel: erst messen, dann nur ändern, was die Messung trägt. Chromium headless (SwiftShader);
„4×" = CDP-CPU-Drosselung als grobe Annäherung an ein Mittelklasse-Handy. Kein Android-Gerät.

## E1 – Startzeit (Release-Build, Seite laden bis Menü sichtbar, je 5 Läufe, Median)

| | vorher | nachher |
|---|---|---|
| normal (5 Läufe) | 328 ms | 303 ms (im Rauschen) |
| 4× gedrosselt (5 Läufe) | 1 066 ms | 1 073 ms (Streuung 956–1 229 – zu wenige Läufe) |
| **4×, Paarvergleich alt/neu abwechselnd, je 15 Läufe** | **1 103 ms** (mittlere Hälfte 1 039–1 161) | **1 018 ms** (988–1 069) → **−85 ms / −8 %** |

## E2 – Woraus der Start besteht (Trace/Profil, 4×)

| Posten | Zeit | Bewertung |
|---|---|---|
| Bundle parsen | 92 ms, **im Hintergrund-Thread** (Script-Streaming) | blockiert den Start kaum |
| Oberster Modul-Code aller career/ui/sim/core-Module | **~20 ms** | Lazy Loading brächte fast nichts |
| Hintergrundspiel im Menü: 22 Figuren bauen (`createPlayerModel`) | 353 ms | **Hebel → E4** |
| Spielort bauen (Parkplatz: Kulisse, Asphalt-Textur, Verschmelzen) | 412 ms | Typed Arrays, Seed-gebunden; nur bei Ortswechsel neu → nicht angefasst |
| Erstes Bild (`PixelRenderer.render`, Shader-Aufbau) | 802 ms | GPU/Shader – ohne Grafikverlust nicht kürzbar |

## E3 – Probe-Builds (R9)

| Probe | Ergebnis | Entscheidung |
|---|---|---|
| three.js nur Renderer + Szene + Kamera | 615 825 B | – |
| three.js mit allen 62 genutzten Klassen + `mergeGeometries` | 694 097 B | höchstens 11 % von three.js sind überhaupt „optional" – alles genutzte Grafik → **nichts einsparbar** |
| Karriere/Vereinsheim nachladen (dynamic import) | spart ≤ ~20 ms Modul-Auswertung + Teil der Hintergrund-Analyse; 66 Importzyklen in `src/career` | **nicht umgesetzt** – Nutzen zu klein für das Risiko (Auswertungsreihenfolge, Zyklen) |

## E4 – Figuren schneller bauen ✔ (bitgleich)

- **Körperteile:** statt je Teil `new BoxGeometry(w, h, d).toNonIndexed()` (~45 Teile je Figur)
  eine einmal gebaute Einheitsbox skalieren (`boxGeometry`, ±0,5 · Maß = ±Maß/2).
- **Gesichter:** gleichfarbige Läufe je Zeile als ein Rechteck statt 448 Einzelpixel je Figur;
  Farbtext je Zeichen einmal.
- **Eckfarben:** ohne Hilfs-Array je Ecke.
- **Beweis gleiches Aussehen:** Fingerabdruck über 60 Figuren (alle 11 Trikotmuster, mit/ohne
  Nummer, Sponsor, Torwart, ohne Textur) aus Position, Normale, Farbe, UV, Knochen und
  **Atlas-Pixeln**: vorher `ebd5ab64`, nachher `ebd5ab64`. Neuer Test `tests/boxgeometry.test.js`
  (45 Maße, Ecken/Normalen/UV exakt gleich wie BoxGeometry).
- **Messung (22 Figuren, kalter Start, 4×, Median von 5):** 353 ms → **283 ms (−20 %)**;
  Bereiche 324–400 vs. 259–309 überschneiden sich nicht.
- **Grenze (ehrlich):** Mit aufgewärmter JS-Engine (spätere Anstöße) kein messbarer Unterschied
  (45 vs. 47 ms) – der Gewinn liegt beim ersten Aufbau, also beim App-Start.

## Wirkung

| | vorher (Phase D) | nachher |
|---|---|---|
| Start bis Menü (4×, Paarvergleich) | 1 103 ms | 1 018 ms |
| JS-Bundle | 1 761 391 B | 1 761 837 B (gzip -6: 558 169 B) – +446 B Code |
| CSS-Bundle | 136 310 B | unverändert |
| Tests / Browser-Suite | 362 / grün | 364 / grün |
| Aussehen der Figuren | – | bitgleich (Fingerabdruck `ebd5ab64`) |
