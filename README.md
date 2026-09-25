# Sunday League

Kreisklasse-Fußball mit Vollamateuren – vom Parkplatz bis ins Amateurstadion.
Gebaut mit [three.js](https://github.com/mrdoob/three.js) im Stil „3D-Pixelart“ – Seitenansicht, PC-first (Tastatur & Gamepad).

![Platzwahl](docs/screenshot-menu.png)

| Hinterhof | Stadtpark | Ascheplatz |
|---|---|---|
| ![Hinterhof](docs/screenshot-hinterhof.png) | ![Park](docs/screenshot-park.png) | ![Ascheplatz](docs/screenshot-ascheplatz.png) |

## Spielorte

| Platz | Format | Boden | Besonderheit |
|---|---|---|---|
| Hinterhof Lindenstraße | 4 gegen 4 | Betonplatten | Garagentor vs. Kreidetor, Hauswände als Bande |
| Parkplatz am Getränkemarkt | 5 gegen 5 | Asphalt | Jackentore, „Ans Auto“-Regel |
| Stadtpark | 5 gegen 5 | Parkwiese | Rucksack-Tore, Einwurf an der gedachten Linie |
| Sportplatz Am Kanal | 5 gegen 5 | Asche | Jugendtore mit Pfosten & Latte, Ecken, Abstöße |

Design, Featureliste und Roadmap: [ROADMAP.md](ROADMAP.md)

## Starten

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm test         # Simulationstests
npm run build    # Produktions-Build nach dist/
```

`?seed=123` in der URL erzeugt reproduzierbar dieselben Teams und denselben Spielverlauf.
`?venue=hinterhof|parkplatz|park|ascheplatz` überspringt die Platzwahl.
`?surface=grass` (bzw. `ash`, `artificial`) spielt den Parkplatz testweise mit anderer Untergrund-Physik.

## Steuerung (Prototyp)

| Aktion | Tastatur | Gamepad |
|---|---|---|
| Laufen | WASD / Pfeiltasten | linker Stick |
| Sprinten | Shift | RB / RT |
| Schuss (halten = Kraft) | Leertaste / K | X / B |
| Pass (Shift + J = hoher Ball / Flanke) | J / E | A |
| Einwurf (Richtung mit Laufen wählen) | J oder Leertaste | A |
| Zweikampf (auf hartem Boden: stochern, sonst Grätsche) | L / Strg | Y |
| Grätsche erzwingen (Schürfwunden-Gefahr!) | Shift + L | RB + Y |
| Spieler wechseln | Q / L | LB |
| Hilfe ein/aus | H | – |
| Zurück zur Platzwahl | Esc / M | – |
| Spielerpool (im Menü) | P | – |
| Revanche nach Abpfiff | Enter | – |

## Aufbau

```
src/
  core/     Zufall (geseedet), Mathe-Helfer
  data/     Traits, Namen, Berufe, Teams
  sim/      Deterministische Match-Simulation (ohne three.js)
  render/   Pixel-Renderer, Kamera, Parkplatz-Szene, Spieler- & Ballmodelle
  input/    Tastatur & Gamepad
  ui/       HUD
tests/      Vitest-Tests für die Simulation
```
