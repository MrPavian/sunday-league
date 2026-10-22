# Sunday League – Arbeitsregeln

Fußball-Managerspiel (Freizeitliga bis Bezirksliga) mit three.js-Pixelart-Darstellung, Vite, Capacitor (Android).
Ziel: stabil, wartbar und performant weiterentwickeln; Funktionen, Spielmechanik und visuellen Stil erhalten;
so wenig Kontext und Arbeit wie möglich für ein korrektes Ergebnis. Antworten und Code-Kommentare auf Deutsch.

## Befehle
- `npm run dev` – Entwicklung · `npm run build` – nach `dist/` · `npm run preview` – gebautes Spiel
- `npx vitest related <geänderte src-Dateien> --run` – nur betroffene Tests (Standard) · `npx vitest run tests/<datei>.test.js`
  – einzelne Tests · `npm test` – alle (lang, einmal je Lieferung)
- `node scripts/golden.mjs` – Golden-Datei der Simulation neu schreiben (nur bei gewollter Sim-Änderung)
- `npm run e2e -- ui|match|memory|modes` – Browsertests gegen `dist/` (vorher bauen; eigener Port per `E2E_BASE`)
- `npm run longrun` – Karriere über viele Saisons (Wirtschaft/Balance)
- `npm run android:apk` – APK (es gibt kein echtes Android-Gerät zum Testen; immer erwähnen)

## Architektur
- `src/sim/` – deterministische Match-Simulation, **kennt kein three.js**. Einstieg `match.js` (`createMatch`,
  `stepMatch`), Plätze/Maße `pitch.js`, Ball `ball.js`, KI `ai.js`, Aktionen `actions.js`. Zufall nur über `core/rng.js`.
- `src/career/` – Karriere, Wirtschaft, Ereignisse; reine Daten/Logik, Einstieg `career.js` (inkl. `migrateCareer`
  für alte Spielstände).
- `src/render/` – three.js-Darstellung: `PixelRenderer.js` (WebGLRenderer, Render-Targets, Nachbearbeitung),
  `CameraRig.js` (orthografische Kamera), `MatchView.js` (Szene eines Spiels), `venues/` (Spielorte),
  `PlayerModel.js`, `quality.js` (Qualitätsstufen).
- `src/ui/` – DOM-Oberfläche (Vereinsheim `Clubhouse.js` + `clubhouse/*`, Menüs, HUD).
  `src/core/`, `src/data/`, `src/audio/`, `src/input/` – Hilfen, Daten/Texte, Ton, Eingabe.
- `src/main.js` – Verdrahtung, Spielschleife (`requestAnimationFrame`), Simulation im festen Takt `STEP = 1/60`.
- Die Übersicht ersetzt nicht den Blick in den Code: zuständige Module je Aufgabe gezielt bestimmen.

## three.js-Konventionen (wie vorhanden)
- Ein Renderer (`PixelRenderer`), eine Hauptszene aus `main.js`; je Spiel eine neue `MatchView`, die alte wird
  vorher mit `view.dispose()` freigegeben.
- Kamera nur über `CameraRig`; keine zweite Spielfeld-Kamera (die Quad-Kamera im Renderer ist intern).
- Für die three.js-Darstellung nur die Schleife in `main.js`; UI-Animationen (Titel, Menü, Ticker, Kneipe)
  dürfen eigene haben. Die Darstellung folgt dem Sim-Zustand und verändert ihn nie.
- Jede neue Geometrie/Material/Textur/Render-Target wird freigegeben (`disposeTree` aus `render/merge.js`
  oder eigenes `dispose()`); Statisches über `merge.js` zusammenfassen.
- Grafik-Budget je Spielort (Draw Calls/Dreiecke) in `scripts/e2e/modes.mjs` einhalten.
- Ohne ausdrücklichen Auftrag: keine Umstellung auf WebGPU oder PBR, keine andere Kameraperspektive; HD-Pixel-Art,
  pixelgenaues Hochskalieren und die Render-Pipeline bleiben.

## Projektregeln
- Bestehende Spielmodi, Karrierefunktionen und Spielmechaniken erhalten; keine ungefragten Löschungen.
- Bei reinen Grafik- oder UI-Aufgaben die Simulation (`src/sim/`) nicht ändern.
- Nie Werte erfinden: messen oder recherchieren, Quelle nennen; Spielwerte im Code als solche kennzeichnen.
- Tests nie abschwächen, keine Seeds wechseln; größere Stichproben nur mit proportional wachsender Schwelle.
- Sim-Verhalten nur gewollt ändern: dann Golden neu schreiben und im Commit begründen, welche Fälle sich ändern.
- Alte Spielstände müssen laden (`migrateCareer`). Changelog: `src/data/changelog.js` + `CHANGELOG.md` + `CHANGELOG.en.md`.
- Keine Modellnamen in Dateien. Keine echten Vereins-/Verbandsmarken (z. B. nicht „DFB-Pokal").

## Arbeitsweise
- Zuerst Auftrag und Abnahmekriterien klären; nur das ändern, was der Auftrag verlangt (keine ungefragten
  Refactorings, Umbenennungen oder Zusatzfunktionen). Nach erfolgreicher Umsetzung stoppen.
- Nur die nötigen Dateien lesen; bekannte Inhalte nicht erneut lesen; `node_modules`, `dist`, `android/` nur bei
  konkretem Bezug. `docs/agent/*.md` (TASK, ROUTE, EFFORT, CHECKS, CONTEXT) nur, wenn für die Aufgabe relevant.
- Fehler gezielt eingrenzen (Ursache reproduzieren, betroffene Datei lesen) statt das Repository neu zu analysieren.
  Wiederholen nur mit geänderter Hypothese oder neuem Prüfschritt; „Flake" erst nach belegter Ursache
  (z. B. Last-Timeout, einzeln wiederholt grün).
- Unteragenten nur, wenn ein konkreter Vorteil den Mehraufwand rechtfertigt, nicht für kleine Aufgaben. Dann:
  eigener git-Worktree, kein Commit/Push durch den Agenten; die Hauptsitzung prüft den Diff und übernimmt.
- Modelle: Sonnet für gewöhnliche Umsetzung, Haiku für einfache Suchen, Opus nur bei konkretem Bedarf (ungelöster
  komplexer Fehler, wichtige Architekturentscheidung) – nie allein wegen der Größe einer Aufgabe.
- Direkt auf `main` committen und pushen ist freigegeben; anderes mit Außenwirkung vorher fragen.

## Prüfungen
- Kleine Änderung: gezielte Prüfung der betroffenen Funktion. Sim/Karriere: passende Vitest-Dateien.
  Renderer/UI: passende E2E-Suite, wenn sinnvoll. Gesamtintegration: `npm run build`; `npm test` bei breitem Einfluss.
- Kein voller Lauf doppelt ohne relevante Änderung seit dem letzten; nie unter Fremdlast (parallele Agenten/Läufe)
  testen. Mehrere Themen gebündelt liefern. Fehlschläge nie ignorieren.
- Android-Verhalten nie als getestet bezeichnen ohne echtes Gerät.

## Abschlussbericht (knapp)
**Geändert** (Dateien, Verhalten) · **Geprüft** (Befehl + Ergebnis) · **Offen** (ungeprüft, Risiken) ·
**Nächster Schritt** (nur wenn nötig). Keine Erfolgsmeldung ohne belegte Prüfung.
