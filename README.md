# Sunday League

Kreisklasse-Fußball mit Vollamateuren – vom Parkplatz bis ins Amateurstadion.
Gebaut mit [three.js](https://github.com/mrdoob/three.js) im Stil „3D-Pixelart“ – Seitenansicht, PC-first (Tastatur & Gamepad).

![Platzwahl](docs/screenshot-menu.png)

| Hinterhof | Stadtpark | Ascheplatz |
|---|---|---|
| ![Hinterhof](docs/screenshot-hinterhof.png) | ![Park](docs/screenshot-park.png) | ![Ascheplatz](docs/screenshot-ascheplatz.png) |

## Karriere (Saison-Minimalversion)

Im Menü mit **K**: Du übernimmst den SV Sonntagsschuss in der *Freizeitliga Kanalbezirk*
(6 Vereine, Hin- und Rückrunde). Jede Woche fragt die Chatgruppe „Wer kann Sonntag?“ –
Spieler sagen passend zu ihrem Beruf zu oder ab, du kannst dreimal nachhaken. Fehlen Leute,
springt „der Schwager von …“ ein. Den Spieltag spielst du selbst oder simulierst ihn;
die anderen Partien laufen im Hintergrund. Der Spielstand wird im Browser gespeichert.

Fast jede Woche passiert etwas im Verein: Freibier-Abend, Streit in der Gruppe, Kater am Spieltag,
ein Porträt im Kreisblatt oder ein Spieler, der Vater wird. Deine Antwort wirkt sich auf Kasse,
**Teamstimmung** und **Form** der Spieler aus. Gute Stimmung heißt weniger Absagen und leichtere Transfers. Manche Ereignisse sind der Anfang
einer **Lebensgeschichte** über mehrere Wochen: Umzug und Pendeln, Jobverlust, Hochzeit mit
Polterabend, Comeback nach Kreuzbandriss oder das Bruderduell gegen den Ligarivalen.

Auch im Spiel kann etwas passieren: Ein Hund klaut den Ball, der Ball fliegt zum Nachbarn,
ein Autoalarm heult, die Polizei kommt wegen Lärm, ein Gewitter macht den Platz rutschig, der
Rasensprenger springt an, oder der Schiri verletzt sich und ein Zuschauer pfeift weiter.

Du selbst bist **Spielertrainer** – mit Job, Familie und begrenzter Energie. Training, Scouting
und Spieltage kosten Familienzeit, unbesetzte Posten im Verein kosten Kraft. Wer beides verheizt,
fällt zwei Wochen aus und darf nur zuschauen, wie der Kapitän aufstellt.
Sponsoren wie die Bäckerei Krume oder Bestattungen Ruhe haben ihren eigenen Kopf: Du verhandelst nach, hältst
sie mit Siegen und Fototerminen bei Laune, und zufriedene Sponsoren verlängern mit Aufschlag.

Irgendwann knirschen die Knie: Ab 40 fragt dich das Saisonende, ob du noch selbst spielst, mit 50 hörst
du auf und bist nur noch Trainer. Mit 60 bis 80 übergibst du das Amt – an dein Kind, den Co-Trainer, den
alten Kapitän oder einen neuen Trainer. Der Spielstand läuft einfach weiter, über Generationen.

Über die Jahre schreibt der Verein Geschichte: Der Platz soll verkauft werden, es gibt Jubiläen
mit Festschrift, eine Fusion mit dem Nachbarn, das erste Frauenteam – und das Jugendtalent, das
Profi wird und irgendwann zurückkommt. Die Chronik steht im Verein-Tab.

In der Stammkneipe „Zum Anstoß" gibst du Runden aus, hörst deinen Spielern zu (jeder hat eine
Geschichte), malst die Taktik auf den Bierdeckel, fragst den Wirt aus und spielst Dart gegen Opa Heinz.

Die Saison läuft von August bis Mai, jeder Spieltag hat sein Wetter: Hitze zehrt an der Puste, Regen
macht Grätschen lang, Sturmböen verwehen hohe Bälle, Frost macht den Boden hart, im Schnee bleibt der
Ball liegen, und im Herbst fällt Laub.

| Vereinsheim | Kader |
|---|---|
| ![Vereinsheim](docs/screenshot-vereinsheim.png) | ![Kader](docs/screenshot-kader.png) |

## Challenges

Im Menü mit **C**: sechs Szenarien mit festem Spielstand und Restzeit – „Einer weniger“,
„Halt die Null“, „Aufholjagd“, „Parkplatz-Derby“, „Alte Herren“, „Der Knipser“. Bis zu drei Sterne
je Challenge; beim ersten Abschluss gibt es eine Belohnung für die Karriere (Geld für die Kasse
oder ein neuer Spieler).

![Challenges](docs/screenshot-challenges.png)

## Spielorte

| Platz | Format | Boden | Besonderheit |
|---|---|---|---|
| Hinterhof Lindenstraße | 4 gegen 4 | Betonplatten | Garagentor vs. Kreidetor, Hauswände als Bande |
| Parkplatz am Getränkemarkt | 5 gegen 5 | Asphalt | Jackentore, „Ans Auto“-Regel |
| Stadtpark | 5 gegen 5 | Parkwiese | Rucksack-Tore, Einwurf an der gedachten Linie |
| Sportplatz Am Kanal | 5 gegen 5 | Asche | Jugendtore mit Pfosten & Latte, Ecken, Abstöße |

Design, Featureliste und Roadmap: [ROADMAP.md](ROADMAP.md)

## Spielen im Browser

Jeder Push auf `main` baut das Spiel und veröffentlicht es über GitHub Pages
(`.github/workflows/pages.yml`). Einmalig im Repo aktivieren: *Settings → Pages → Source: GitHub Actions*.
Danach läuft es unter `https://mrpavian.github.io/sunday-league/`.

## Starten

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm test         # Simulationstests
npm run build    # Produktions-Build nach dist/
```

`?seed=123` in der URL erzeugt reproduzierbar dieselben Teams und denselben Spielverlauf.
`?venue=hinterhof|parkplatz|park|ascheplatz` überspringt die Platzwahl, `?dauer=60` spielt ein Kurzspiel (Sekunden).
`?surface=grass` (bzw. `ash`, `artificial`) spielt den Parkplatz testweise mit anderer Untergrund-Physik.

## Steuerung

Rechte Hand läuft, linke Hand spielt.

| Aktion | Tastatur | Gamepad |
|---|---|---|
| Laufen | Pfeiltasten | linker Stick |
| Sprinten | Shift | RB / RT |
| Schuss (halten = fester) | W | X |
| Pass flach | S | A |
| Hoher Ball / Flanke | E | B |
| Halten: mit Ball abschirmen, ohne Ball Gegner festhalten (Foulgefahr!) | A | LT |
| Grätsche (auf hartem Boden: Schürfwunden-Gefahr) | D | Y |
| Stochern (Zweikampf im Stehen) | Y | R3 |
| Einwurf (Richtung mit Laufen wählen) | S, E oder W | A |
| Spieler wechseln | Q | LB |
| Auswechseln (beim nächsten Stopp) | X | Back |
| Tempo (ruhig / normal / schnell) | C | – |
| Hilfe ein/aus | H | – |
| Ton an/aus | N | – |
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
