# Phase B – Safe Cleanup (Protokoll)

Grundlage: `docs/audit/phase-a.md`. Jede Änderung mit Beweis; Tests (362) und Browser-Suite
(`npm run e2e`: ui, match, memory) nach jedem Schritt grün.

## B1 – Browser-Regressionssuite (`scripts/e2e`, `npm run e2e`)

Startet den Vorschau-Server für `dist/`, prüft mit Zusicherungen, Exit-Code ≠ 0 bei Fehlern.
- **ui**: alle 15 Vereinsheim-Bereiche/Tabs in vier Größen (keine Fehler, kein seitliches Scrollen,
  Touch-Ziele ≥ 44 px außer Kalender-Tageskästchen), Karte umdrehen, Tausch in der Aufstellung,
  Trainerkarte, Handy-Chat, Notizbuch, Karriere-Runde per Liveticker bis zur nächsten Woche.
- **match**: Trainer-Spiel (Taktik pausiert, Info läuft, Wechsel, Lagekarte, Halbzeit, Abpfiff,
  Zeitungsseiten), Freeze-Szenario `?stau` bis zum Abpfiff.
- **memory**: vier Karrierespiele; GPU-Texturen, Geometrien, JS-Heap, Listener, eingehängter DOM und
  losgelöster DOM (aus Heap-Snapshot) dürfen nicht dauerhaft wachsen.

## B2 – GPU-Texturleck (R1, vorgezogen – mit Test belegt)

| Messung (4 Karrierespiele) | Texturen nach Spiel 1 → 4 |
|---|---|
| vorher | 62 → 176 (Test rot) |
| nachher | 28 → 32 (Test grün) |

Ursache (per WebGL-Protokoll: `texStorage2D 8×8 RGBA32F` × 66, `16×16` × 8 in drei Spielen):
- **Skelett-Knochentexturen**: three legt je `SkinnedMesh` eine Knochen-Textur an; `disposeKit`
  gab das Skelett nie frei → jetzt `model.mesh.skeleton.dispose()`.
- **Schattenflecken**: `MatchView.dispose` gab nur die Geometrie frei → jetzt auch Alpha-Maske,
  Material und Instanzpuffer.
- Trikot-Atlanten geprüft (Referenzzählung ausgeglichen) – **kein** Leck, Audit-Hypothese korrigiert.
- Hinweis: je Karrierespiel entstehen 4 Spielansichten (Karrierespiel + Hintergrundspiele im
  Vereinsheim) – daher wirkte sich das Leck vierfach aus.
- DOM: der Zähler „Nodes" wächst, der Heap-Snapshot zeigt aber konstant 1 losgelösten Knoten
  (Taktiktafel, gewollt) → kein DOM-Leck; der Zähler enthält nur noch nicht eingesammelten Müll.

## B3 – Toter Code (R3)

| REMOVED | WHY / PROOF UNUSED | FEATURE / SAVE IMPACT |
|---|---|---|
| 22 Exporte: `tierForTalent`, `LEAGUE_SIZES`, `injuryText`, `coachTypeName`, `hasTwists`, `useLang`, `teamPerkJobs`, `jobChoices`, `ATLAS_W`, `ATLAS_H`, `PATTERN_IDS`, `emissiveLevel`, `QUALITY_IDS`, `currentQualityId`, `toggleOrder`, `MATCH_DURATION`, `mirrorThird`, `teamExecution`, `sideness`, `ownGoalX`, `nearestTo`, `SHOUT_LIST` | Name kommt im gesamten Repository (src, tests, scripts, index.html, Strings) nur an der Definition vor | keine / keine |
| 5 ungenutzte Importe (`SHOUTS`, `TRIP_COST`, `humanClub` in academy, `plural` in injuries, `releasePlayer` in events) | Bindung im Modul nie verwendet; Modul bleibt über andere Importe geladen (Auswertungsreihenfolge unverändert) | keine |
| 26 CSS-Regeln / 30 Selektoren in style.css (`squad-grid`, `squad-card`, `sc-*`, `profile-shirt`, `slot-*`, `player-card`, `club-grid`, `hub-stats`, `shout-tools`, `venue-line`, `st-text`) | Klasse kommt in keiner JS-/HTML-Datei vor, auch nicht als String-Präfix; gemischte Selektorlisten nur um den toten Teil gekürzt | keine (Reste der UI-2.0-Kaderliste/-Aufstellung) |
| 7 doppelte `esc`-Helfer in ui/* | durch `esc` aus ds.js ersetzt (identisch, zusätzlich `null` → leer statt „null") | keine |

Bewusst **behalten**: Designsystem-Bausteine ohne aktuellen Nutzer (`ui-modal`, `ui-sr`, `m-torn`,
`m-stack`), Exporte nur für Tests (`migrateCareer`, `EVENTS`, …), Spielstand-Migration,
Kompatibilitäts-Shim `spectators.js` (5 Spielorte; Nutzen einer Umstellung gering).

## Wirkung

| | vorher (858e978) | nachher |
|---|---|---|
| JS Source | 1 663 101 B | 1 660 519 B |
| CSS Source | 160 519 B | 158 135 B |
| JS-Bundle | 1 761 894 B (gzip 564 889) | 1 761 269 B (gzip 558 222) |
| CSS-Bundle | 138 398 B (gzip 33 710) | 136 312 B (gzip 32 810) |
| GPU-Texturen nach 4 Spielen | 176 (wachsend) | 32 (stabil) |
| Tests | 362 grün | 362 grün + Browser-Suite |
| Simulation | – | unverändert (Golden-Test grün, keine Datei in sim/ fachlich geändert) |
