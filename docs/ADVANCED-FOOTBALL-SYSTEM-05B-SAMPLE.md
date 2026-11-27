# Advanced Football System – Phase 5b: Messspiele der Nachbarligen

Stand: 2026-11-27. Grundlage: `docs/ADVANCED-FOOTBALL-SYSTEM-02-INTELLIGENCE.md` Abschnitt 11.1, Entscheidung E2 Variante a.
Code: `src/intel/sample.js`, Profile in `src/intel/profiles.js samplePlayerProfiles`, Einbau in `src/app/matchflow.js runRound`,
Anzeige in `src/ui/clubhouse/transfers.js tfDetail`. Messung: `scripts/afs-sample.mjs`. Tests: `tests/afsSample.test.js`.

## 1. Nutzerentscheidungen (2026-11-27)

| Frage | Entscheidung |
|---|---|
| Welche Vereine? | Die Nachbarn aus dem Transfermarkt (`transfers.js genNeighbors`, je Nachbarliga `NEIGHBOR_CLUBS` = 3 mit Saisonkader). Keine neuen Kader. |
| Wie viele Messspiele? | Eines je Spieltag, abwechselnd Liga darunter und darüber. |
| Anzeige | Im Transfermarkt, beim Spieler eines Nachbarvereins. |
| Saisonwechsel | Wie bisher: Nachbarn und Messdaten gelten eine Saison. |

## 2. Ablauf

```
runRound (nach den Ligaspielen) ─► playSample ─► sampleFixture: Liga = Nachbarstufen[Spieltag mod Anzahl], Paarung im Wechsel
                                              ─► prepareSample: Stammdaten aus membersOf (Trikot, Platz, Trainer), Kader vom Nachbarn
                                              ─► volle Engine ─► recordSample: Spielerzeilen in career.an.nb
Transfermarkt ─► samplePlayerProfiles(Stufe) ─► Schrumpfung wie Phase 5, Perzentil unter derselben Position dieser Nachbarliga
```

- **Zählt nirgends:** kein Ergebnis, keine Tabelle (bleibt `pyramid.js simTable`), keine Verletzung, Karte, Form oder Chronik. Test:
  Spielstand ohne `career.an.nb` byte-gleich, Ergebnisse der Liga mit und ohne Messspiel gleich.
- **Kein Zufallsstrom des Spielstands:** eigener Seed aus Spielstand, Saison, Spieltag und Stufe.
- **Bedingungen wie in der Liga:** Platz und Format der Nachbarliga (`venueFor`), Wechselregel der Stufe, KI-Trainer nach Typ,
  Ausfälle 15 % wie `career.js aiAvailability`. Kein Wetter der eigenen Woche (anderer Ort).
- **Höchstens ein Messspiel je Spieltag** (`nb.k`), auch wenn `runRound` in einer Woche mehrfach läuft.
- **Nur im Spiel über `matchflow.js runRound`.** Skripte und Tests, die Saisons ohne Oberfläche rechnen, haben keine Messspiele,
  außer sie rufen `playSample` selbst auf.
- **Schalter:** `SAMPLE.on` (Standard an).
- **Speicher:** `career.an.nb = { s, k, n, p }`: Saison, letzter Spieltag, Messspiele je Nachbar, Spielerzeilen (`seasonstats.js
  PKEYS`). `closeSeasonAnalytics` löscht es.

## 3. Profile

Gleiche Rechnung wie Phase 5 (`PROFILE.k`, Schrumpfung zum Positionsmittel), aber Mittel und Perzentil nur unter den gemessenen
Spielern derselben Nachbarliga, weil Format und Stärke anders sind als in der eigenen Liga. Herkunft ESTIMATED, dazu `sample` (Zahl
der Messspiele des Vereins) und `level`. Anzeige: „N Messspiele (Liga) · Perzentil unter seiner Position dort: Pässe · xG ·
Zweikämpfe“. Keine Mindestzahl (offen wie in Phase 4); die Zahl der Messspiele steht dabei.

## 4. Messung

`node scripts/afs-sample.mjs 5 8 11 23 37`: 3 Seeds, je 5 Saisons, 8 Vereine, Schalter aus gegen an.

| Seed | Tabellen gleich | Spielstand nach 5 Saisons aus / an | Messdaten höchstens | Messspiele je Nachbar und Saison | Spieler mit Profil am Saisonende | ms je Messspiel (Node) |
|---|---|---|---|---|---|---|
| 11 | ja | 138,9 / 138,9 KB | 2,0 KB | 9,3 (9–10) | 97 % | Stufe 2: 874 |
| 23 | ja | 156,6 / 156,6 KB | 3,1 KB | 6,7 (4–10) | 93 % | Stufe 1: 504, 2: 869, 3: 891 |
| 37 | ja | 141,9 / 141,9 KB | 2,0 KB | 9,3 (9–10) | 96 % | Stufe 2: 940 |

- Aus der Freizeitliga gibt es nur die Liga darüber; dann ist jede Woche dort ein Messspiel (rund 9 je Verein). Mit zwei
  Nachbarligen halbiert es sich (Seed 23: 4–10).
- Speicher: während der Saison höchstens 3,1 KB (Budget 20 KB nach 5 Saisons; Phase 5 lag bei 7,2 KB, 6b bei +0,8 KB), am
  Saisonende 0.
- Rechenzeit: ein Spiel mehr je Spieltag, 0,5–0,9 s in Node. Auf dem Handy länger; im Browser läuft es in Häppchen (`simulate`).
  Auf dem Großfeld (ab Stufe 5) kostet ein Spiel rund 1,45 s (Node).

## 5. Grenzen und Offenes

- Profile der eigenen Liga (Phase 5) werden im Transfermarkt noch nicht angezeigt, nur die der Nachbarn.
- Messspiele nur über die Oberfläche (`runRound`), nicht in Wochen ohne Spieltag.
- Rechenzeit auf einem echten Gerät nicht gemessen.
- Phase 9 (Scouting-Kenntnis der CPU) kann dieselben Daten nutzen.
