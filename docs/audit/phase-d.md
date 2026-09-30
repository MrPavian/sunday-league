# Phase D – Runtime Optimization (Protokoll)

Regel: MEASURE → PROVE → CHANGE → VERIFY. Umgesetzt wird nur, was eine Messung als Nutzen belegt.
Umgebung: Chromium headless mit SwiftShader – Bildzeiten sind dort nicht aussagekräftig; gemessen
werden daher Arbeit (Knoten, Aufrufe, CPU-Profil), nicht FPS. Ein Android-Gerät stand nicht zur
Verfügung.

## D1 – CPU-Profil (Spiel, Vereinsheim, Menü; je 10 s, Entwicklungs-Build)

| Szene | JS gesamt | three.js | eigener Code (größte Posten) |
|---|---|---|---|
| Spiel (Trainer) | ~720 ms / 10 s | 350 ms | Bildschleife 44, Simulation 35+31, MatchView 16, PlayerModel 16, HUD 7 |
| Vereinsheim | ~730 ms / 10 s | 358 ms | Simulation 40+39 (Hintergrundspiel), PlayerModel 22, HUD 14 |
| Menü | ~670 ms / 10 s | 321 ms | Simulation 47+31 (Hintergrundspiel), PlayerModel 22 |

Hauptthread zu ~93 % im Leerlauf; kein Hot-Path im eigenen Code. Bestätigt Phase A
(Simulation 27–46 µs/Schritt, Render-Sync ohne Allokationen) → **nicht angefasst**.

## D2 – Ton aus: keine Klänge bauen, AudioContext anhalten (R8) ✔

**Messung (Spiel 60 s Spielzeit, Park, Seed 3; Zähler an `BaseAudioContext.create*`):**

| | vorher | nachher |
|---|---|---|
| Ton an | 922 Knoten | 921 Knoten (Zufallsgeräusche) – unverändert |
| Ton aus | **785 Knoten** + Hall/Kulisse/Zuschauerrauschen rechnen weiter | **8** (einmaliger Aufbau), Kontext `suspended` |
| Lautstärke 0 | **924 Knoten** | **8**, Kontext `suspended` |

- **Änderung (`src/audio/Sound.js`):** `silent()` (Ton aus oder Lautstärke 0); `handle`/`update`
  bauen stumm nichts; `applyGain()` hält den AudioContext an bzw. setzt ihn fort (Ton-Taste N,
  Einstellungen, Lautstärkeregler). Die Zuschauermenge wird weiter gemerkt, damit beim Einschalten
  mitten im Spiel alles stimmt.
- **Verhalten:** hörbar identisch (stumm bleibt stumm, an bleibt an). Klang-Zufall nutzt
  `Math.random` außerhalb der Simulation → Seed-Determinismus unberührt (Golden-Test grün).
- **Nutzen:** keine Audio-Arbeit bei stummem Spiel – auf Android weniger CPU/Akku (Größe dort
  ungemessen, kein Gerät).
- **Test:** neue Browser-Prüfung `audio` in `scripts/e2e/match.mjs` (Ton aus: 0 neue Knoten und
  `suspended`; Taste N: `running`, Klänge entstehen). `__sl.sound` im Debug-Objekt dafür ergänzt.

## D3 – Verworfen bzw. zurückgestellt (mit Messung)

| Kandidat | Messung | Entscheidung |
|---|---|---|
| HUD-Elemente cachen | `Hud.js` 7–14 ms pro 10 s (< 0,02 ms/Bild) | **nicht umgesetzt** – kein messbarer Nutzen |
| Trikot-Vorschau-Cache (R2) | Kader-Aufbau bleibt 17–19 ms (Phase C) | **verworfen** |
| Kader-Neuaufbau per gezieltem DOM-Update | 17–19 ms pro Klick, ~800 Knoten | **nicht umgesetzt** – großer Umbau aller Bildschirme, Nutzen nur auf Gerät belegbar |
| Menü-Hintergrund drosseln (R10) | 3D-Hintergrundspiel ~670 ms JS / 10 s | **zurückgestellt** – sichtbar, braucht Gerätemessung |
| Vereinsheim: 3D-Szene hinter Tabs drosseln | Hintergrund 94 % deckend, „Heute" bewusst durchsichtig | **zurückgestellt** – sichtbare Änderung, Nutzen ohne Gerät unbelegt |

Empfehlung für eine Gerätemessung (Android, `chrome://inspect`): Bildzeit und Akku im Menü und
Vereinsheim mit/ohne Hintergrundspiel; erst dann über R10 entscheiden.
