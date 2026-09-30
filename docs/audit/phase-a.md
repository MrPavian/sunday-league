# Sunday League – Codebase Lean & Performance Audit, Phase A

Stand: Commit `858e978` (main), 30.09.2026. **Nur Audit – kein Code geändert.**
Messumgebung: Cloud-Container, Chromium mit SwiftShader (Software-GPU), Node 22. **Kein echtes
Android-Gerät, keine echte GPU** – Bildzeiten sind GPU-gebunden und nicht aussagekräftig;
aussagekräftig sind CPU-Skriptzeit, Draw Calls, Ressourcen, Speicher, Bundle.

---

## 0. Baseline

| Kennzahl | Wert |
|---|---|
| Source-Dateien (`src/`) | 149 (144 JS, 3 CSS, 2 Fonts) |
| Test-Dateien | 64 (62 `*.test.js`, `golden.js`, `fixtures/`) |
| JS Source | 1 663 101 B, 29 609 Zeilen |
| CSS Source | 160 519 B (style.css 128 504, world.css 15 185, ds.css 12 362 inkl. Kommentare) |
| Build | 2,2 s, `dist/` 2,0 MB, 21 Dateien |
| JS-Bundle | `index.js` 1 761 894 B (gzip 564,9 kB) + `StyleGuide` 6,7 kB (bereits lazy) |
| CSS-Bundle | 138 398 B (gzip 33,7 kB) |
| Chunks | 2 JS, 1 CSS; Build-Warnung „chunk > 500 kB“ |
| Tests | 362, alle grün; Summe Dateilaufzeiten 640 s (parallel ≈ 140 s) |
| langsamste Tests | sim 91 s, commands 54 s, longrun 52 s, tips 44 s, review 43 s, profiles 39 s, incidents 38 s |
| Simulation | 27–46 µs pro Schritt (1/60 s), max. 10 ms Einzelschritt (Parkplatz) |
| Main-Thread-Skript pro Bild | Spiel PC_HIGH 4,2 ms · ANDROID_MEDIUM 3,4 ms · Menü (3D läuft dahinter) 3,2 ms |
| Layout/Style pro Bild | ≈ 0 ms Layout, 0,05 ms Style (≈ 1 Neuberechnung pro Bild) |
| Draw Calls | 57 (Halle) … 101 (Parkplatz); Ascheplatz 63–70 je nach Stufe |
| Dreiecke | 11 k (Hinterhof) … 35 k (Halle) |
| Texturen / Geometrien / Programme | 24–39 / 33–57 / 15–21 |
| Szene | 254–400 Objekte, 47–72 Meshes; Schattenwerfer statisch 9–37, dynamisch 13–24 |
| JS-Heap im Spiel | 12–19 MB |
| DOM-Knoten / Listener | ≈ 1 663 / 74 (Spiel), 2 230 / 87 (Vereinsheim) |
| Spielstand | 16 kB (Saisonstart) … 27 kB (nach 1 Saison), 0,1–0,2 ms pro Speichern |
| UI-Neuaufbau je Klick (Vereinsheim, 360×780) | 5–19 ms (Kader 18,8, Handy 19,0, Heute 13,7) |

### Bundle-Zusammensetzung (Source-Map-Auswertung des Produktions-Builds, minifiziert)

| Bereich | Bytes | Anteil |
|---|---|---|
| three.js (core + module) | 584 652 | 37,4 % |
| src/career | 398 040 | 25,5 % |
| src/ui | 202 343 | 12,9 % |
| src/sim | 163 704 | 10,5 % |
| src/render | 126 167 | 8,1 % |
| src/data | 41 250 | 2,6 % |
| main.js | 21 747 | 1,4 % |
| audio, challenges, input, core, three/addons | 25 114 | 1,6 % |

Größte eigene Module im Bundle: Clubhouse 84 kB, events 39 kB, sponsors 34 kB, career 23 kB,
clublife 23 kB, main 22 kB, PlayerModel 21 kB, life 21 kB, academy 20 kB.

---

## 1. Repository-Map

```
src/
  main.js          Einstieg, Spielschleife, Modus-/Screen-Orchestrierung, Karriere-Ablauf (1086 Z.)
  core/            i18n, rng, math (3 Dateien, Fan-in i18n 92, rng 32)
  data/            statische Daten: Namen, Berufe, Eigenschaften, Legenden, Stufen, Teams, Vereine (9)
  sim/             Spielsimulation: match, ai, actions, ball, players, tackles, tricks, incidents,
                   setpieces, stats, plan, tactics, commands, coach(feed), situations, trace … (35)
  career/          Karriere: career, events, sponsors, finances, stories, sagas, clublife, life,
                   academy, legacy, trip, tournament, relegation, pub, … (40)
  render/          three.js: PixelRenderer, MatchView, PlayerModel, BallView/-Model, Effects, weather,
                   crowd, lighting, props, textures, materials, kitPaint, merge, quality, venues/* (27)
  ui/              DOM-Oberfläche: Clubhouse, Hud, ShoutBar, PlanPanel, SubPanel, Halftime, EndScreen,
                   Settings, Menu, Ticker, TitleScreen, ds.js, world.js, … (26)
  audio/Sound.js   WebAudio, prozedural
  input/Input.js   Tastatur, Gamepad, Touch
  challenges/      Challenge-Definitionen
  style.css, ds.css, world.css, fonts/
tests/  62 Vitest-Dateien + golden.js (Golden Master) + fixtures
scripts/ engine, golden, longrun, audit, situations, tactics(-matrix) – Dev-Werkzeuge (nicht im Bundle)
android/ Capacitor-Projekt (53 versionierte Dateien, Build-Ordner per .gitignore ausgeschlossen)
public/  manifest, Service Worker, Icons
docs/    Screenshots (≈ 7 MB, nicht im Bundle), Doku
```

## 2. File Inventory (Kurzfassung)

Status-Zählung: **alle 144 JS-Module sind vom Einstieg `main.js` aus erreichbar** – es gibt keine toten
Dateien. Klassifikation der auffälligen Dateien:

| Datei | Größe | Status | Anmerkung |
|---|---|---|---|
| src/ui/Clubhouse.js | 130 kB, 1816 Z. | REQUIRED BUT REFACTORABLE | Router + Controller + 14 Screens, 63 `action ===`-Zweige, 49 Imports |
| src/main.js | 45 kB, 1086 Z. | REQUIRED BUT REFACTORABLE | 52 Imports; `setMode` ≈ 200 Z. mit allen Screen-Handlern |
| src/style.css | 128 kB, 1813 Z. | REQUIRED BUT REFACTORABLE | ~20 tote Klassen, doppelte Media-Query-Schreibweisen, UI-2.0/3.0-Schichten übereinander |
| src/career/career.js | 53 kB | REQUIRED | Kern; Mittelpunkt vieler Import-Zyklen |
| src/render/spectators.js | 294 B | COMPATIBILITY SHIM | reiner Re-Export aus crowd.js (Umbenennung) für 5 Spielorte |
| src/render/DebugOverlay.js | 4,6 kB | DEV ONLY (im Bundle) | nur mit `?gfx`/Taste sichtbar, aber statisch importiert |
| src/ui/StyleGuide.js | 7,7 kB | DEV ONLY | bereits dynamisch geladen (`?ds`) – ok |
| scripts/* | – | DEV/BUILD ONLY | nicht im Bundle |
| android/app/src/{test,androidTest}/…/Example*.java | – | GENERATED | Capacitor-Vorlage, harmlos |

Die vollständige Liste (Größe, Importe, Fan-in) liegt maschinenlesbar in der Audit-Auswertung
(`graph.json`, im Arbeitsverzeichnis der Sitzung erzeugt; reproduzierbar mit dem Skript im Anhang).

## 3. Import-Graph

- **Fan-out:** main.js 52 · Clubhouse 49 · career 40 · sim/match 32 · career/events 20 · ui/Hud 18
- **Fan-in:** core/i18n 92 · career/career 35 · core/rng 32 · career/finances 23 · career/events 22 ·
  career/sagas 21 · career/personal 20 · data/traits 19 · core/math 19 · render/materials 17
- **Zyklen:** 66 Zyklen, fast alle innerhalb von `src/career` – ein großer Knoten um
  `career ↔ events ↔ personal ↔ finances ↔ sponsors` (z. B. `career → awards → events → career`,
  `finances → sponsors → finances`). Außerhalb: `sim/actions ↔ sim/ai`. Funktioniert heute (ESM,
  Aufrufe erst zur Laufzeit), erschwert aber Lazy Loading und macht Initialisierungsreihenfolge fragil.
- **Schichtgrenzen:** Simulation importiert **nur** sim/core/data (sauber). Einzige Querverbindung:
  `career/career.js → ui/crest.js (defaultCrest)` (Karriere kennt ein UI-Modul).

## 4. Feature Preservation Matrix

| Feature | Einstieg | Module | Test | nach Refactor prüfen |
|---|---|---|---|---|
| Schnelles Spiel (selbst spielen), 6 Plätze | Menü, `?venue=` | main, sim/*, render/venues/* | sim, sim2, golden | Golden + Browser |
| Trainer-Modus (Zurufe, Taktik, Wechsel, Info, Co-Trainer) | Menü T, `?trainer` | ShoutBar, PlanPanel, SubPanel, coach*, plan, commands | coach, coachfeed, commands, subs, benchchat, trainercards | Browser-Ablauf |
| Halbzeit | automatisch | HalftimePanel | – (nur Browser) | Browser |
| Elfmeterschießen | Turnier/`?elfmeter` | sim/shootout | tournament | Golden |
| Karriere (Wochen, Chat, Ereignisse, Aufstellung, Taktik, Training, Jugend, Transfers) | Menü K | career/*, Clubhouse | career, events, academy, lineupui, … | Tests + longrun |
| Liveticker | Clubhouse | ui/Ticker | – | Browser |
| Stadt-/Hallenmeisterschaft | Clubhouse | career/tournament | tournament | Tests |
| Relegation, Ligagröße 6/8, Auf-/Abstieg | Saisonende | career/relegation | leaguesize | Tests |
| Sponsoren, Kasse, Strafen | Vereinsmappe | sponsors, finances | sponsors, economy | Tests |
| Kneipe, Dart, Stammtisch | Kneipe | career/pub | pub | Tests |
| Vereinsheim-Ausbau, Museum, Legenden, Generationen | Verein | facilities, museum, legacy, generations | facilities, legacy, generations | Tests |
| Saisonabschlussfahrt | Saisonende | career/trip | trip | Tests |
| Wetter (Regen, Schnee, Nebel, Frost, Hitze), Jahreszeiten | automatisch, `?wetter=` | career/weather, render/weather | weather | Browser |
| Vorfälle (Hund, Stau, Rasensprenger …) | Spiel, `?incident=` | sim/incidents, render/IncidentView | incidents, freeze | Tests + Browser |
| Tricks, Profile, Beziehungen, Matchups | Spiel | sim/tricks, profiles, relations | tricks, profiles, relations | Golden |
| Challenges | Menü C | challenges, ui/Challenges | challenges | Tests |
| Spielstände (Slots, Export/Import, Migration) | Menü L | career.save/load/migrate, SaveSlots | career, longrun, look, tips | Tests |
| Spielerpool, Namens-Editionen | Menü P | PoolBrowser | names, look | Tests |
| Trainer-Editor, Wappen-Editor | Karriere-Start / Verein | CoachCreator, crest | – / clubscene | Browser |
| Einstellungen (Sprache DE/EN, Ton, Grafik, Tempo, Dauer, Tasten, Vibration, Farbenblind) | Notizbuch | Settings, prefs | settings, english, ds | Tests + Browser |
| Qualitätsstufen PC_LOW…PC_ULTRA, ANDROID_LOW…HIGH, Auto-Governor | automatisch, `?quality=` | render/quality, PixelRenderer | quality, post | Browser je Stufe |
| Post-Processing (AO, Bloom, Kanten, Dither, Grading, Vignette) | Qualität | PixelRenderer | post | Browser |
| Zuschauer, Flutlicht, Tageszeiten | automatisch, `?zeit=` | crowd, lighting | crowd, lighting | Browser |
| Titelbildschirm, Startbild | Start | TitleScreen, logo | – | Browser |
| UI 3.0 (Szene, Karten, Magnettafel, Handy, Zeitung, Pinnwand, Kalender, Mappe, Notizbuch) | Vereinsheim | Clubhouse, ClubScene, world, EndScreen | clubnav, clubscene, world, phonechat, newspaper, calendar, tacticboard | Browser |
| Dev-Schalter `?debug ?gfx ?ds ?px ?quality ?nomerge ?dauer ?seed ?stau …` | URL | main, DebugOverlay | – | manuell |
| Android (Capacitor, PWA, Service Worker) | `npm run android:apk` | android/, public/ | – | **echtes Gerät nötig** |

## 5. Top 20 größte Source-Dateien

| Bytes | Zeilen | Datei |
|---|---|---|
| 130 524 | 1816 | src/ui/Clubhouse.js |
| 128 504 | 1813 | src/style.css |
| 56 054 | 681 | src/career/events.js |
| 52 795 | 1122 | src/career/career.js |
| 46 233 | 511 | src/career/sponsors.js |
| 45 496 | 1000 | src/render/PlayerModel.js |
| 45 018 | 1086 | src/main.js |
| 43 733 | 816 | src/sim/ai.js |
| 41 017 | 901 | src/render/PixelRenderer.js |
| 30 039 | 635 | src/sim/actions.js |
| 29 599 | 313 | src/career/clublife.js |
| 28 647 | 390 | src/career/academy.js |
| 28 135 | 528 | src/career/stories.js |
| 27 447 | 281 | src/career/social.js |
| 27 079 | 285 | src/career/life.js |
| 26 474 | 412 | src/career/personal.js |
| 26 250 | 334 | src/career/legacy.js |
| 22 262 | 350 | src/career/sagas.js |
| 21 393 | 178 | src/career/trip.js |
| 21 316 | 445 | src/render/MatchView.js |

Die großen Career-Dateien sind überwiegend **Inhalt** (zweisprachige Texte) – groß, aber fachlich kohärent.

## 6. Dead-Code-Kandidaten (Beleg: Name kommt im gesamten Repo nur an der Definition vor)

Exporte, die **nirgends** importiert **und** lokal nicht benutzt werden (Suche über src, tests,
scripts, index.html, inkl. Strings/`data-action`):

`career/academy tierForTalent` · `career/clubs LEAGUE_SIZES` · `career/injuries injuryText` ·
`career/opponents coachTypeName` · `career/twists hasTwists` · `core/i18n useLang` ·
`data/jobs teamPerkJobs` · `data/names jobChoices` · `render/kitPaint ATLAS_W, ATLAS_H, PATTERN_IDS` ·
`render/materials emissiveLevel` · `render/quality QUALITY_IDS, currentQualityId` ·
`sim/commands toggleOrder` · `sim/match MATCH_DURATION` · `sim/matchlog mirrorThird` ·
`sim/plan teamExecution, sideness` · `sim/players ownGoalX` · `sim/squad nearestTo` ·
`ui/ShoutBar SHOUT_LIST` (22 Stück).

Weitere 90+ Exporte werden nur **lokal** benutzt (Export überflüssig, Funktion nötig) – kein Byte-Gewinn,
nur API-Klarheit. 53 Exporte werden nur von Tests/Skripten importiert (z. B. `migrateCareer`, `EVENTS`,
`FACES`) – **behalten** (Testschnittstelle).

**Tote CSS-Klassen** (keine Verwendung in JS/HTML, dynamische Präfixe wie `role-${…}`, `weather-${…}`
berücksichtigt): `squad-grid squad-card sc-name sc-pos sc-tier sc-rating sc-sun profile-shirt
slot-gk slot-def slot-mid slot-fwd player-card club-grid hub-stats shout-tools venue-line st-text`
(Reste der UI-2.0-Kaderliste/-Aufstellung und älterer HUD-Teile), in ds.css `ui-modal ui-sr`,
in world.css `m-torn m-stack` (Designsystem-Bausteine ohne Nutzer – eher behalten).

## 7. Duplikat-Kandidaten (semantisch)

| Helfer | Vorkommen | Befund |
|---|---|---|
| `esc` (HTML-Escape) | 8 Dateien, ds.js exportiert ihn bereits | identisch → aus ds.js importieren |
| `hex` (Zahl → #rrggbb) | 9 UI-Dateien + DebugOverlay | identisch bis auf Fallback-Varianten (Ticker `?? 0x888888`, SubPanel/world `typeof`) |
| `first`/`surname` (Namensteile) | 15 / 8 Dateien | trivial, lokal – geringer Nutzen |
| `euro` (Geldformat) | 2 Dateien | zusammenführbar |
| Media Queries | `(orientation: landscape) and (max-height: 520px)` 7× und in umgekehrter Schreibweise 5×; Breakpoints 720 und 760 px nebeneinander | vereinheitlichen |

**Nicht** zusammenlegen (ähnlich, fachlich verschieden): `data/clubs.js` (Lebenslauf-Vereinsnamen) vs.
`career/clubs.js` (Ligagegner); `data/teams.js` (Schnellspiel-Teams) vs. Karriere-Vereine.

## 8. Legacy-/Kompatibilitäts-Kandidaten

- `render/spectators.js`: Re-Export-Shim (`spectatorSlot as makeSpectator`). Die 5 Spielorte könnten
  direkt aus `crowd.js` importieren. Nutzen gering, Risiko gering.
- `career.migrateCareer` + Defaults beim Laden: **Spielstand-Kompatibilität – behalten** (siehe 17).
- `Clubhouse.playerCard()` (Modulfunktion am Dateiende, „Spielerkarte im Kader: Formkurve …“) wird
  nach dem UI-3.0-Umbau noch vom Profil (Statistik) benutzt – prüfen, nicht löschen.
- Kommentare/Stile aus UI 2.0, die UI 3.0 überschreibt (z. B. `.lp-shirt` clip-path → Magnet),
  liegen als Überschreibungsschichten in style.css.

## 9. God-Module-Kandidaten

1. **src/ui/Clubhouse.js** – Router (Bereiche/Tabs), Controller (63 Aktionszweige, ruft Karriere-
   Funktionen direkt), Renderer von 14 Screens, eigene Interaktionen (Drag, Wischen, Dart-Animation).
   Natürliche Schnitte: `clubhouse/nav`, `…/team` (Kader, Profil, Aufstellung, Taktik, Training,
   Jugend, Transfers), `…/season` (Tabelle, Kalender, Turnier), `…/club` (Kasse, Verein, Museum),
   `…/phone`, `…/pub`, `…/hub`. Nutzen: Lesbarkeit, Testbarkeit, Voraussetzung für Lazy Loading.
2. **src/main.js** – Spielschleife **und** Screen-Orchestrierung **und** Karriere-Ablauf
   (playCareerMatch, runRound, Cup, Relegation, Ticker) **und** Dev-Diagnose. Der Karriere-Ablauf
   (≈ 200 Z., Z. 685–841) und `setMode` (≈ 200 Z.) sind abtrennbar, ohne die Schleife anzufassen.
3. **src/style.css** – historisch gewachsene Schichten (UI 1 → 2.0 → 3.0) statt Gliederung nach Bereich.

## 10. Hot-Path-Kandidaten (gemessen)

| Pfad | Messung | Bewertung |
|---|---|---|
| Simulation `stepMatch` | 27–46 µs/Schritt | **effizient – nicht anfassen** |
| Render-Sync (MatchView, BallView, Effects, weather, crowd, IncidentView) | keine Allokationen pro Bild außer 1× `players.find` (22 Elemente) | **effizient – nicht anfassen** |
| Main-Thread-Skript pro Bild | 3,4–4,2 ms | davon ein Teil three.js-Render-Vorbereitung |
| HUD `Hud.update` | ~8 `querySelector` + Uhrtext + 2 Style-Breiten pro Bild, 4 `classList.toggle` auf body | gemessen 0,05 ms Style/Bild → geringer Nutzen |
| Menü: 3D-Szene läuft hinter dem Menü weiter | 3,2 ms Skript/Bild im Leerlauf | gewollt (Hintergrundspiel); auf Android ggf. drosselbar |

## 11. Per-Frame-Allokationen

Render-Pfad: bereits mit Scratch-Objekten und Pools gebaut (Effects, Weather, BallView, PlayerModel
„ohne Zuteilungen pro Bild“). Gefunden nur:
- `MatchView.sync`: `match.players.find(...)` pro Bild – vernachlässigbar (n = 22).
- `Hud.update`: Template-Strings für die Uhr jedes Bild, `querySelectorAll('.score b')` jedes Bild.
**Empfehlung: kein Umbau** außer ggf. HUD-Elemente cachen (LOW Nutzen).

## 12. DOM-/UI-Effizienz-Kandidaten

- **Kader-Neuaufbau erzeugt pro Karte ein Canvas + `toDataURL`** (`kitPreviewURL(club.kit)` in
  `Clubhouse.collector`, 10+ Aufrufe pro Render, gleiches Trikot) → Ergebnis pro Kit cachen.
  Beleg: Kader-Render 18,8 ms vs. Aufstellung 5,7 ms. Gleiches Muster im Verein-Tab (Trikotvorschau)
  und Museum (Trikotarchiv).
- **Vollständiges `innerHTML`-Rendern pro Klick** (5–19 ms, 400–800 Knoten). Für Android relevant,
  aber gezielte Updates wären ein großer Umbau. Erst Kit-Cache und Handy-Bildschirm (19 ms: Hand-SVG
  wird pro Render als String eingefügt, ist aber gecacht) messen, dann entscheiden.
- `crestSVG` erzeugt je Aufruf eine neue ID (`cr${++uid}`) – harmlos, aber Knoten wachsen nicht.
- Event-Listener: Die `bind*`-Methoden hängen nach jedem Render neue Listener an **neue** Knoten
  (alte Knoten werden verworfen) – kein Leck; gemessen konstant 87→99 Listener über 4 Spiele.

## 13. Three.js-Ressourcen-Kandidaten

- Materialien: vertexToon-Material geteilt, Kulisse per `mergeStatic` verschmolzen (Draw Calls 57–101).
- Doppelte Texturen: Trikot-Atlanten pro Team (gewollt), Schilder/Böden je Spielort (gewollt).
- Shader-Programme 15–21 – unauffällig.
- `?nomerge` existiert zum Vergleich – gut.

## 14. Memory-Leak-Kandidaten (**wichtigster Befund**)

Zyklus Karriere → Spiel → Ergebnis → Vereinsheim, 4×, jeweils nach erzwungener Speicherbereinigung:

| Zeitpunkt | JS-Heap | DOM | Listener | **GPU-Texturen** | Geometrien | Programme |
|---|---|---|---|---|---|---|
| Vereinsheim | 19,1 MB | 2230 | 87 | 35 | 50 | 14 |
| nach Spiel 1 | 21,8 | 2269 | 99 | **62** | 50 | 15 |
| nach Spiel 2 | 22,3 | 2279 | 99 | **98** | 50 | 15 |
| nach Spiel 3 | 22,4 | 2286 | 99 | **134** | 50 | 15 |
| nach Spiel 4 | 22,0 | 2364 | 99 | **156** | 43 | 17 |

JS-Heap, DOM und Listener sind stabil. **GPU-Texturen wachsen um ~36 pro Spiel und werden nie
freigegeben.** Rückverfolgung (WebGL-Texturen, die während Spiel 2 entstanden und danach noch leben):
- 4× `KitAtlas` (`PlayerModel.js`) – Trikot-Atlanten; `release()` erreicht offenbar nie 0.
- 1× Schattenfleck-Textur aus `MatchView.makeBlobs` – `dispose()` gibt nur die Geometrie frei.
- 16× entstehen erst beim Rendern (`PixelRenderer.render`) – Hypothese: Schattenkarten/Render-
  Targets der Spielort-Lichter, die beim Platzwechsel (`loadVenue → disposeTree`) nicht freigegeben
  werden (`disposeTree` behandelt nur `material.map`, keine `light.shadow.map`, `emissiveMap` o. ä.).
  **Noch zu beweisen** (Phase F).
Auf Android besonders relevant (Schattenkarten 1024–2048², mehrere MB je Stück; WebView-GPU-Speicher
ist knapp). Nach vielen Karrierespielen ohne Neustart droht Speicherdruck/Abbruch.

## 15. Bundle-Kandidaten

- three.js 585 kB (37 %): `import * as THREE` in 20 Dateien. Ob benannte Importe mehr einsparen, ist
  **ungeprüft** – erst Probe-Build vergleichen (Rolldown kann Namespace-Zugriffe oft schon schütteln).
- Karriere + Vereinsheim ≈ 480–600 kB (career 398 kB + Clubhouse/UI-Anteile) werden **vor dem
  Titelbildschirm** geladen, obwohl Schnellspiel und Titel sie nicht brauchen.
- Schriften: Pixelify 400/600 in latin, latin-ext, cyrillic (woff + woff2). Browser laden nur
  benötigte Bereiche; im APK ≈ 60 kB Dateien, davon cyrillic ≈ 9 kB unbenutzt – vernachlässigbar.
- DebugOverlay (4,6 kB) statisch im Bundle – klein.

## 16. Lazy-Load-Kandidaten

| Kandidat | Größe (min.) | Voraussetzung | Risiko |
|---|---|---|---|
| Karriere-UI (Clubhouse, ClubScene, world, EndScreen-Extras) | ~100 kB | Import-Grenze in main.js | MITTEL |
| Karriere-Logik (src/career) | ~400 kB | `loadCareer`/Spielstand-Info fürs Menü braucht career.js → Zyklen im career-Knoten erschweren den Schnitt | HOCH |
| Challenges | 6 kB | – | gering, kaum Nutzen |
| DebugOverlay | 4,6 kB | nur bei `?gfx`/Taste | gering, kaum Nutzen |
| StyleGuide | – | **bereits lazy** | – |

Startzeit (Parse/Evaluate) wurde noch nicht separat gemessen – vor jeder Aufteilung messen.

## 17. Spielstand-Kompatibilitätsrisiken

- `SAVE_VERSION = 1`, Migration über `migrateCareer` (fehlende Felder ergänzen). Alle Felder, die dort
  ergänzt werden, sind **Kompatibilitätscode – nicht löschen**.
- Exporte, die nur Tests nutzen (`migrateCareer`, `setNameEdition`), sind Teil der Kompatibilitäts-
  prüfung – behalten.
- Jede Änderung am Karriere-Datenmodell (Deduplizierung) würde Migration erfordern → derzeit **kein**
  Nutzen belegt (Spielstände 16–27 kB, Speichern 0,2 ms).

## 18. Android-Risiken

- **GPU-Texturleck** (14) trifft Android am stärksten.
- Menü rendert die 3D-Szene weiter (3,2 ms Skript + GPU pro Bild) – Akku/Wärme auf dem Handy.
- Vollständiger UI-Neuaufbau 5–19 ms auf dem Desktop-Container → auf Mittelklasse-Handys eher
  15–50 ms pro Tipp (Schätzung, **nicht gemessen**).
- Keine Messung auf echter Hardware: CPU, GPU, Wärme, GC, APK-Größe, WebView-Start – **offen**.
- android/-Projekt ist schlank (nur Manifest mit INTERNET, MainActivity, Ressourcen); nichts zu entfernen.

## 19. Testlücken

- **Match-Lebenszyklus / Freigabe von Ressourcen:** kein Test – genau dort sitzt das Texturleck.
- Browser-only-Module ohne Unit-Test (werden nur von Playwright-Skripten außerhalb des Repos geprüft):
  MatchView, IncidentView, CameraRig, props, textures, merge, Spielorte, Menu, Settings, ShoutBar,
  PlanPanel, SubPanel, HalftimePanel, Ticker, TitleScreen, CoachCreator, SaveSlots, Challenges-UI, Sound.
- Die Browser-Regressionsskripte (Spielablauf, Halbzeit, Abpfiff, Karriere-Runde, Freeze) liegen
  nicht im Repository → ins Repo holen (z. B. `scripts/e2e/`), damit jede Phase sie ausführen kann.
- Langsame Tests (sim 91 s, commands 54 s, longrun 52 s) – nicht kürzen, ggf. parallelisieren/markieren.

## 20. Optimierungs-Roadmap (priorisiert: hoher Nutzen + geringes Risiko zuerst)

### R1 – GPU-Texturleck beim Spielwechsel beheben (Phase F, vorgezogen)
- FILE(S): render/MatchView.js (dispose, makeBlobs), render/PlayerModel.js (KitAtlas/disposeKit), render/merge.js (disposeTree), main.js (loadVenue)
- CURRENT: +36 GPU-Texturen pro Spiel, nie freigegeben
- PROBLEM: wachsender GPU-Speicher über eine Karriere
- EVIDENCE: Tabelle Abschnitt 14 + Stack-Rückverfolgung
- PROPOSED: Atlas-Referenzzählung korrigieren, Blob-Textur freigeben, Licht-Schattenkarten/weitere Texturkanäle beim Platzwechsel freigeben; **Regressionstest** (Zyklus-Messung als Skript) zuerst
- EXPECTED BENEFIT: konstanter Texturbestand über beliebig viele Spiele
- FEATURE RISK: gering (nur Freigabe nach Nutzung) · DETERMINISM: keins · SAVE: keins
- PERFORMANCE: Speicher stabil, kein Frame-Einfluss · CONFIDENCE: HOCH (Leck), MITTEL (genaue Ursache der 16)

### R2 – Trikot-Vorschau cachen (Phase D)
- FILE(S): render/kitPaint.js `kitPreviewURL`
- CURRENT: neues Canvas + `toDataURL` je Karte je Render
- PROPOSED: kleiner Cache (Schlüssel: Kit + Sponsor, begrenzt z. B. 32 Einträge)
- EXPECTED BENEFIT: Kader-Render deutlich unter 18,8 ms · RISK: gering · CONFIDENCE: HOCH

### R3 – Sicher toten Code entfernen (Phase B)
- 22 unbenutzte Exporte/Funktionen (Abschnitt 6), ~20 tote CSS-Klassen, `esc`-Duplikate → ds.js
- BENEFIT: weniger Ballast, klarere API (einige kB) · RISK: gering (Beweis: Name nur an der Definition) · CONFIDENCE: HOCH

### R4 – Browser-Regressionsskripte ins Repo (vor Phase C/D)
- Spielablauf, Halbzeit/Abpfiff, Karriere-Runde, Freeze-Szenario, UI-3.0-Screens, Speicherzyklus
- BENEFIT: jede weitere Phase belastbar prüfbar · RISK: keins · CONFIDENCE: HOCH

### R5 – Doppelte Helfer/Media Queries vereinheitlichen (Phase B/C)
- `hex`, `esc`, `euro`; Media-Query-Schreibweisen; Breakpoints 720/760
- BENEFIT: Wartbarkeit · RISK: gering (CSS: Browser-Vergleich je Größe) · CONFIDENCE: MITTEL

### R6 – Clubhouse.js entlang der Bereiche zerlegen (Phase C)
- Router/Aktionen bleiben, Screens in Bereichsmodule; `data-action`-Muster beibehalten
- BENEFIT: Kopplung sinkt, Voraussetzung für Lazy Loading · RISK: MITTEL (viele Screens) · PERFORMANCE: neutral · CONFIDENCE: MITTEL

### R7 – Karriere-Ablauf aus main.js lösen (Phase C)
- playCareerMatch/runRound/Cup/Relegation/Ticker-Steuerung in ein `careerFlow`-Modul; Spielschleife unverändert
- RISK: MITTEL (Match-Lebenszyklus, Freeze-Historie) → nur mit R4 · CONFIDENCE: MITTEL

### R8 – Sound: bei „Ton aus“ keine Knoten erzeugen (Phase D)
- `Sound.handle` baut heute auch stumm Oszillatoren/Filter (Lautstärke 0) · BENEFIT: weniger Audio-Arbeit auf Android · RISK: gering · CONFIDENCE: MITTEL (Kosten auf Gerät unbekannt)

### R9 – Bundle: Probe-Builds für three.js-Importe und Karriere-Lazy-Loading (Phase E)
- erst messen (Parse/Evaluate-Zeit, Bundle), dann entscheiden; Zyklen im career-Knoten sind die Hürde
- BENEFIT: möglich −30…40 % initiales JS · RISK: MITTEL–HOCH · CONFIDENCE: NIEDRIG (unbewiesen)

### R10 – Menü-Hintergrund auf Android drosseln (Phase D, nur nach Gerätemessung)
- RISK: sichtbar (Hintergrundspiel) · CONFIDENCE: NIEDRIG ohne Gerät

### Bewusst NICHT anfassen (Befund „effizient“)
- Simulations-Hot-Path (27–46 µs/Schritt), Render-Sync ohne Allokationen, Spielstand-Serialisierung,
  Draw-Call-Budget (Kulisse bereits verschmolzen), Sim-Schichtgrenze, RNG (kein `Math.random` in sim/career).

---

## Anhang: Messwerkzeuge (reproduzierbar)

- Bundle nach Quelle: Produktions-Build mit `--sourcemap`, Auswertung der Source-Map pro Quelldatei.
- Import-Graph: `es-module-lexer` über src/tests/scripts (Erreichbarkeit ab main.js, Fan-in/out, Zyklen, ungenutzte Exporte).
- Laufzeit: Playwright/Chromium (`?debug`): `renderer.info`, `PixelRenderer.stats`, CDP `Performance.getMetrics`.
- Speicherzyklus: 4 Karrierespiele, `HeapProfiler.collectGarbage` vor jeder Messung; Texturrückverfolgung über gehookte `Texture.needsUpdate`/`dispose` und WebGL `createTexture`/`deleteTexture` im Dev-Server.
- Simulation: 6 Spiele × 6 Plätze × 240 s in Node, Zeit pro `stepMatch`.
