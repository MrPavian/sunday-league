# CHECKS.md – Beleg vor Abschluss

## Befehle (im Repo-Wurzelverzeichnis bzw. im Worktree)
| Prüfung | Befehl | Dauer |
|---|---|---|
| Einzeltest (eng) | `npx vitest run tests/<datei>.test.js` | Sekunden bis Minuten |
| Alle Tests | `npx vitest run` (≈ 520 Tests) | ≈ 4 Min. |
| Build | `npm run build` | < 1 Min. |
| Browser (e2e) | `npm run build && npm run e2e` (Suiten: ui, match, memory, modes; einzeln `npm run e2e -- modes`) | ≈ 55 Min. |
| Golden (Simulation) | `node scripts/golden.mjs` – nur nach gewollter Verhaltensänderung, im Commit begründen | Sekunden |
| Typecheck / Lint | nicht eingerichtet (reines JavaScript, kein ESLint) – nicht als „bestanden" melden | – |

Messskripte für Spielverhalten: `scripts/wing-audit.mjs [N] [Platz]`, `scripts/orders-audit.mjs`,
`scripts/pokal-calibrate.mjs`, `scripts/longrun.mjs`; eigene Messungen mit festen Seeds
(`createMatch({ seed: 900 + i, … })`), mindestens 40 Spiele je Platz, vorher/nachher mit gleichen Seeds.

## Regeln
- Erst die enge Prüfung, die das geänderte Verhalten ausübt, dann die breiteren für den berührten Bereich.
- Syntax oder „lädt ohne Fehler" beweist keine Funktion.
- Tests nie abschwächen; größere Stichprobe nur mit mitwachsender Schwelle.
- Höchstens eine schwere Messung parallel zu e2e (4 Kerne; sonst Bildstau-Fehlalarme), mit `nice`.
- Lieferung (APK, PC-Datei, Artifact) erst, wenn alle laufenden Unteragenten fertig, ihre Diffs geprüft und
  zusammengeführt sind (Nutzervorgabe 2026-10-04) – vorher Qualitätsprüfung des Gesamtstands.
- Vor jedem Commit: vitest + build + e2e grün. Lieferkette danach: APK (`npm run android:apk` baut aus der
  Arbeitskopie – fremde Änderungen vorher wegstashen), PC-Datei, Artifact.

## Belege
- Je behauptetem Ergebnis Befehl und Ergebnis nennen; bei Fehlern die genaue Fehlerzeile behalten.
- Grafik und Animation: das fertige Bild ansehen (Playwright-Screenshot mit `?debug`, Read-Tool), nicht nur
  den Code. Bildraten sind hier nicht messbar (keine Grafikkarte); Ersatz: Draw Calls und Dreiecke
  (e2e „Grafik-Budget je Spielort").

## Nicht lauffähig
Sagen, welche Prüfung nicht lief, warum, und welches Risiko bleibt – immer: kein echtes Android-Gerät.
Fehlenden Beleg nicht durch selbstsichere Sprache ersetzen.

## Bericht
Geändert: [Dateien und Verhalten] · Geprüft: [Befehle und genaue Ergebnisse] · Ungeprüft: [Lücken und Grund]
