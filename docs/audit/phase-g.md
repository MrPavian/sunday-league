# Phase G – Final Verification & Abschlussbericht

Vergleich **Baseline = Commit `858e978`** (Stand vor dem Audit) gegen **After = aktueller Stand**.
Alle Laufzeitwerte in derselben Sitzung A/B gemessen (alter Build auf Port 4301, neuer auf 4173),
mit den unveränderten Mess-Skripten aus Phase A. Umgebung: Cloud-Container, Chromium headless mit
SwiftShader (Software-GPU), Node 22. **Kein echtes Android-Gerät** – Bildzeiten (GPU) sind nicht
aussagekräftig; aussagekräftig sind Skriptzeit, Draw Calls, Ressourcen, Speicher, Bundle, Start.

## G1 – Seed-Determinismus und alte Spielstände (alter gegen neuen Code)

`determinism.mjs` spielt dieselben Szenarien unter beiden Code-Ständen und vergleicht SHA-256-Hashes
des vollständigen Zustands.

| Szenario | alt | neu | |
|---|---|---|---|
| Karriere Seed 11: volle Saison, jedes Spiel, Saisonwechsel, 3 weitere Spieltage (15 Stände) | `6211b641adc9ddd3` | `6211b641adc9ddd3` | alle 15 Spieltag-Hashes gleich |
| Karriere Seed 4242 (15 Stände) | `a975207101f0550c` | `a975207101f0550c` | alle 15 gleich |
| Einzelspiel je Platz (6), Seed 777, mit Vorfällen | Ergebnis, Schrittzahl, Endzustand | identisch | 6/6 gleich |
| Spielstand mit **altem** Code erzeugt (Spieltag 5, 25 kB), mit **neuem** Code weitergespielt | `e04b749acde88cf4` | `e04b749acde88cf4` | 6 Spieltage gleich |
| Simulations-Benchmark (6 Plätze × 6 Spiele) | 36 Ergebnisse | identisch | gleiche Schrittzahlen |

## G2 – Regression aller Modi (neue Browser-Suite `modes`)

Modi und Varianten aus dem Repository ermittelt (`QUALITY`, `WEATHER`, `TIME_PARAM`, `VENUE_INCIDENTS`,
Menü-Einträge), nicht aus einer Liste im Auftrag:

| Prüfung | Ergebnis |
|---|---|
| Startbild → Menü | ✓ |
| Freundschaftsspiel selbst spielen (Tastatur) bis Abpfiff → Menü | ✓ |
| 7 Qualitätsstufen (PC_LOW … PC_ULTRA, ANDROID_LOW … HIGH): Stufe aktiv, richtige Auflösung, Draw Calls | ✓ 7/7 |
| 8 Wetterlagen, 4 Tageszeiten | ✓ 12/12 |
| 7 Vorfälle jeweils auf ihrem Platz bis zum Abpfiff | ✓ 7/7 |
| Elfmeterschießen | ✓ |
| Spielerpool, Spielstände, Challenge bis zum Ergebnis | ✓ |
| Englisch: Menü und alle 15 Vereinsheim-Tabs | ✓ |
| Alter Spielstand (Stand `858e978`): laden, alle Tabs, Stadtmeisterschaft auslassen, Liveticker-Runde | ✓ |
| Bisherige Suiten: 15 Tabs × 4 Größen, Interaktionen, Trainer-Spiel, Freeze, Ton, 3 Speicherzyklen | ✓ |

**Gefundener Altfehler (nicht durch das Audit entstanden, im alten Code identisch):** Testschalter
`?incident=ersatzschiri` auf einem Platz ohne Schiri → `TypeError` in `stepMatch`, Spiel steht. Im
echten Spiel filtert die Auslosung den Vorfall dort heraus (`incidents.js`), nur der Testschalter
umging den Filter. Behoben in `main.js` (Schalter wendet denselben Filter an); Spiellogik unberührt.

## G3 – Messungen

Siehe Abschlussbericht unten; Rohdaten: `simbench`, `cpu`, `runtime`, `uirender`, `savesize`,
`scripts/e2e/memory.mjs`, Start-Paarvergleich (je 15 Läufe, 4× CPU-Drosselung).

---

```
SUNDAY LEAGUE
LEAN CODEBASE REPORT

BASELINE  (858e978)
-------------------
Source files: 149 (144 JS, 3 CSS, 2 Fonts)
JS source:    1 663 101 B, 29 609 Zeilen
CSS source:   160 519 B
Build:        ok, 0,9–1,4 s (3 Läufe), dist 2 008 148 B / 21 Dateien
Bundle:       JS 1 761 894 B (gzip-6 558 469) · CSS 138 398 B (gzip-6 33 186)
Tests:        362 Unit-Tests grün · keine Browser-Suite
CPU:          Simulation 24,6–51,0 µs/Schritt · Skript/Bild: Spiel PC_HIGH 3,98 ms,
              ANDROID_MEDIUM 3,49 ms, Menü 2,92 ms · Start bis Menü (4×) 1 128 ms
Memory:       JS-Heap im Spiel 13,8–17,3 MB · GPU-Texturen wachsen: Karriere +38 je Spiel
              (62 → 176), Ortswechsel 26 → 270 (3 Runden), Polizei-Spiele +26 je Spiel
              · Ton aus: 785 Audioknoten je 60-s-Spiel, AudioContext läuft weiter
Draw calls:   57 (Halle) … 99–101 (Parkplatz)

AFTER
-------------------
Source files: 156 (151 JS, 3 CSS, 2 Fonts)
JS source:    1 667 869 B, 29 689 Zeilen
CSS source:   158 135 B
Build:        ok, 1,6–1,7 s (3 Läufe), dist 2 006 147 B / 21 Dateien
Bundle:       JS 1 761 979 B (gzip-6 558 214) · CSS 136 312 B (gzip-6 32 801)
Tests:        364 Unit-Tests grün · Browser-Suite 4 Teile (ui, match, memory, modes) grün
CPU:          Simulation 26,1–47,5 µs/Schritt · Skript/Bild: PC_HIGH 3,63 ms,
              ANDROID_MEDIUM 3,35 ms, Menü 2,97 ms · Start bis Menü (4×) 1 072 ms
Memory:       JS-Heap im Spiel 13,4–19,4 MB · GPU-Texturen stabil: Karriere 22 → 22,
              Ortswechsel 24 → 26, Polizei-Spiele 26 → 26 · Ton aus: 8 Knoten, Kontext angehalten
Draw calls:   57 (Halle) … 101 (Parkplatz) – identische Szenen

DELTA
-------------------
JS:       +4 768 B (+0,29 %), +80 Zeilen  (Vereinsheim-Aufteilung +5 342 B Importe/Köpfe,
          Behebungen/Optimierungen ≈ +2 500 B, toter Code ≈ −3 100 B)
CSS:      −2 384 B (−1,49 %)
Bundle:   JS +85 B roh / −255 B gzip · CSS −2 086 B roh / −385 B gzip · dist −2 001 B
CPU:      Simulation und Skript/Bild unverändert (Streuung ±10 %, Simulation nicht angefasst)
          · stummer Ton −99 % Audioknoten · Figurenbau kalt −20 %
Memory:   drei GPU-Lecks beseitigt (~8 MB Schattenkarte je Ortswechsel, Knochen-/Fleck-
          Texturen je Spielansicht, Besucher-Figuren) – vorher unbegrenztes Wachstum
Build:    unverändert (Streuung 0,9–1,7 s)
Startup:  −56 ms (−5 %) im Paarvergleich 4×; Phase E maß −85 ms (−8 %)

REMOVED
-------------------
Files:     keine Datei gelöscht (Clubhouse.js in 7 Module aufgeteilt, nicht entfernt)
Functions: 7 doppelte esc-Helfer, 5 doppelte hex-Helfer
Exports:   22 tote Exporte, 5 ungenutzte Importe
CSS:       26 Regeln / 30 Selektoren (Reste UI 1/2.0)
Assets:    keine (alle Fonts/Bilder referenziert)

CONSOLIDATED
-------------------
- esc → ds.js (8 → 1), hex → ds.js (6 → 1 identische Kopien)
- Vereinsheim: 1 816 Zeilen → Router 459 + home/team/season/club/phone/pub/shared
- Landscape-Media-Query einheitlich geschrieben (13 ×)
- Browser-Regressionssuite im Repo (npm run e2e): ui, match, memory, modes

OPTIMIZED
-------------------
- GPU-Speicher: Skelett-Knochentexturen, Kontaktschatten-Textur, Schattenkarten der Lichter
  beim Ortswechsel, Vorfall-Besucher werden freigegeben
- Ton aus / Lautstärke 0: keine Klänge, AudioContext angehalten
- Figurenbau: Einheitsbox statt BoxGeometry je Teil, Gesichter als Farbläufe (bitgleich)
- Testschalter ?incident=ersatzschiri ohne Schiri stürzt nicht mehr ab

UNCHANGED INTENTIONALLY
-------------------
- Simulations-Hot-Path, Render-Sync, Draw-Call-Budget (gemessen effizient)
- three.js-Importe (Probe: höchstens 11 % optional, alles genutzte Grafik)
- Lazy Loading von Karriere/Vereinsheim (spart ≤ ~20 ms, 66 Importzyklen)
- Karriere-Ablauf in main.js (braucht Kontext-Brücke, kein Gewinn)
- 760-px-Umbrüche, HUD-Cache, Trikot-Vorschau-Cache, gezielte DOM-Updates (kein Nutzen belegt)
- Menü-/Vereinsheim-Hintergrund drosseln (sichtbar, braucht Gerätemessung)
- Spielstand-Migration, Test-Exporte, ungenutzte Designsystem-Bausteine, spectators.js-Shim

RISKS
-------------------
- Vereinsheim-Methoden per Object.assign am Prototyp: gleiches this, geprüft per Bindungs-Check
  und Browser-Suite; ein künftiger Name-Konflikt zwischen Modulen würde still überschreiben
- AudioContext suspend/resume: im Chromium geprüft, auf Android-WebView (App im Hintergrund,
  Ton an/aus) ungeprüft
- UI-Test misst Touch-Ziele nach Animationsende: Probleme nur während einer Animation (≤ 0,2 s)
  würden nicht gemeldet
- Alle Laufzeitwerte mit Software-GPU; echte GPU-/Wärme-/Akkuwerte fehlen

REAL DEVICE TODO
-------------------
- Bildzeiten je Qualitätsstufe (ANDROID_LOW/MEDIUM/HIGH) auf 2–3 Geräten, Auto-Governor
- Start in der Capacitor-WebView (kalt/warm), APK-Größe
- Ton an/aus, App in den Hintergrund/zurück: AudioContext läuft wieder an
- Lange Sitzung (Karriere, viele Ortswechsel): GPU-Speicher/Abstürze
- Menü-/Vereinsheim-Hintergrund: Akku/Wärme messen, dann über Drosselung (R10) entscheiden
- Touch-Ziele und Hand/Handy-Ansicht auf echten Displays
```

## Abschlussnachweis

1. **Wurden Features entfernt?** NEIN.
2. **Wurden Modi entfernt?** NEIN.
3. **Hat sich seeded Gameplay verändert?** NEIN – Karriere (2 Seeds, je 15 Stände), 6 Einzelspiele und
   36 Benchmark-Spiele liefern im alten und neuen Code identische Hashes/Ergebnisse.
4. **Funktionieren alte Saves?** JA – mit dem alten Code erzeugter Spielstand lädt, alle Tabs öffnen,
   Weiterspielen ergibt denselben Verlauf wie im alten Code (Hash-gleich über 6 Spieltage).
5. **Funktioniert Android?** Auf einem Gerät NICHT GEPRÜFT (kein Gerät verfügbar). Android-Projekt,
   Capacitor-Konfiguration, PWA/Service Worker und Build-Konfiguration sind unverändert; alle
   ANDROID-Qualitätsstufen und Touch-Größen laufen im Browser-Test.
6. **Funktionieren alle Quality Presets?** JA – alle 7 Stufen aktiv, richtige Auflösung, Bild läuft,
   keine Fehler (Software-GPU).
7. **Sind alle Tests grün?** JA – 364 Unit-Tests, Browser-Suite (ui, match, memory, modes).
8. **Ist der Build erfolgreich?** JA.
9. **Ist die Codebasis tatsächlich kleiner?** NEIN, nicht nennenswert: JS-Source +0,3 %, CSS −1,5 %,
   Bundle gleich groß. Toter Code, Duplikate und tote CSS sind entfernt, die Aufteilung des
   Vereinsheims in 7 Module kostet aber Import-Köpfe, und die Behebungen fügen Code hinzu.
   Kleiner geworden ist die größte Datei (1 816 → 512 Zeilen), nicht die Gesamtmenge.
10. **Ist die Runtime messbar effizienter?** JA bei Speicher und Lebenszyklus (drei GPU-Lecks weg,
    vorher unbegrenztes Wachstum), Start (−5 bis −8 %) und stummem Ton (−99 % Audioarbeit).
    NEIN bei der Rechenzeit pro Bild im laufenden Spiel – dort war nichts Messbares zu holen
    (Phase A/D), sie ist unverändert.
