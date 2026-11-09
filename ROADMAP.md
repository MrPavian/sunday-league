# Sunday League – Game Design, Featureliste & Roadmap

> Arbeitstitel: **Sunday League** (Alternativen: *Kreisklasse*, *Asche & Ehre*, *Dritte Halbzeit*)
> Status: spielbarer Prototyp mit vollständiger Karriere · Stand: 2026-11-05 · Überblick: [docs/OVERVIEW.md](docs/OVERVIEW.md)

---

## 1. Vision

Ein Fußballspiel über die schönste Nebensache der Welt, wie sie wirklich gespielt wird:
Sonntag, 10:30 Uhr, Nieselregen, sieben Zuschauer, zwei davon Hunde. Du baust einen
zusammengewürfelten Haufen aus Normalos – Paketbote, Zahnarzt, Azubi, Frührentner –
zu einem Verein auf, der sich vom Parkplatz bis ins Amateurstadion hocharbeitet.

### Design-Säulen

1. **Charmant statt überzeichnet** – Keine Superhelden. Stärken und Schwächen sind
   bodenständig, glaubwürdig und oft liebenswert.
2. **Das Leben spielt mit** – Job, Familie, Kater und Urlaub bestimmen, wer Sonntag kann.
3. **Wachstum spürbar machen** – Jeder Aufstieg verändert Platz, Trikot, Vereinsheim,
   Zuschauer und Gegner sichtbar.
4. **Fußball, der sich amateurhaft anfühlt** – Fehlpässe, verspringende Bälle,
   Luftlöcher und Konditionseinbrüche sind Feature, nicht Bug.
5. **Moderner Look** – Hochauflösende Pixelart auf 3D-Modellen (HD-2D-/„3D-Pixel“-Stil).

---

## 2. Kern-Featureliste (aus der Grundidee)

| Bereich | Feature | Beschreibung |
|---|---|---|
| Spielorte | Park, Parkplatz, Hinterhof, Bolzplatz | Frühe Spielstätten mit eigenen Regeln (Jackentore, Bordsteinkanten, Garagentor) |
| Spielorte | Asche-, Rasen-, Kunstrasenplatz, Kleinstadion | Freischaltung über Ligenaufstieg |
| Spieler | Vollamateure aus allen Schichten | Beruf, Alter, Lebenssituation beeinflussen Verfügbarkeit & Form |
| Spieler | Besondere Fähigkeiten (Traits) | Bodenständig: „sehr schneller Läufer“, „gutes Auge“, „Pferdelunge“, „Anführer“, „steigert Teamchemie“ |
| Kader | Transfers | Spieler werben, tauschen, überzeugen |
| Kader | Challenges | Freischaltungen und Belohnungen über Aufgaben |
| Kader | Nachwuchs | Jugendabteilung, Talente aus dem Umfeld |
| Minispiele | Open Training | Offenes Probetraining zum Entdecken von Rohdiamanten |
| Verein | Trikot-Editor | Jede Saison neu gestaltbar (Farben, Muster, Sponsor, Wappen) |
| Verein | Lokales Sponsoring | Bäckerei, Fahrschule, Döner, Autohaus, Physiopraxis … |
| Präsentation | HD-Pixelart + 3D | Low-Poly-3D-Modelle, Pixel-Shader, Outlines, dynamisches Licht |

---

## 3. Neue Ideen: Features, Modi & Mechaniken

### 3.1 Spielmechaniken

**„Wer kann Sonntag?“ – Die Mannschafts-Chatgruppe**
- Zentrales UI-Element im Stil eines Messenger-Chats.
- Unter der Woche trudeln Zu- und Absagen ein: „Bin auf Montage“, „Hochzeit von der Cousine“,
  „Komme, aber erst zur 2. Halbzeit“, „Knie zwickt“.
- Du kannst nachhaken, überreden, Fahrgemeinschaften organisieren – kostet „Überredungspunkte“
  oder Beziehung.
- Kaderengpass ist echter Druck: im Zweifel spielt der Spielertrainer selbst oder der Kumpel
  vom Linksverteidiger.

**Alltagssystem & Form**
- Jeder Spieler hat Beruf (Schichtarbeit, Homeoffice, Selbstständig, Student …),
  Familienstand und Hobbys.
- Wöchentliche Events: Überstunden, Geburt, Umzug, Grippe, Junggesellenabschied.
- **Samstagabend-Faktor**: Party am Vorabend → Kater-Debuff für die erste Halbzeit.
- Formkurve ergibt sich aus Alltag + Trainingsbeteiligung + Spielpraxis.

**Traits – positiv, negativ und leise**
- Positive Beispiele: Schneller Läufer, Gutes Auge, Pferdelunge, Anführer, Teamchemie-Booster,
  Kopfballungeheuer, Standard-Spezialist, Ruhe am Ball, Linksfuß, Zweikampfstark, Lautsprecher
  (organisiert Abwehr), Motivator nach Rückstand.
- Negative/ambivalente Beispiele: Meckerer (Kartenrisiko), Chronisch zu spät, Raucher
  (Ausdauer −, Teamchemie + in der Raucherecke), Wetterfühlig, Schonhaltung, Ballverliebt,
  Diva, Nur rechter Fuß, Kommt nur mit seinem Bruder.
- Traits sind teilweise **verborgen** und werden erst durch Spiele/Training entdeckt.
- Seltenheit: Die meisten Spieler haben 0–1 Trait, wenige 2, ganz selten 3.

**Amateurhafte Physik**
- Platzbeschaffenheit beeinflusst Ballverhalten: Buckel, Maulwurfshügel, Pfützen, Asche.
- Technische Fehler skalieren mit Attributen und Müdigkeit (Luftloch, Stolpern, Ball verspringt).
- Kondition bricht ab ca. Minute 60 spürbar ein – Einwechslungen sind wichtig.
- Wetter: Regen (rutschig, Grätschen weiter), Wind (Flanken/Abstöße), Hitze, Frost,
  Schlammschlacht.

**Untergrund bestimmt den Zweikampf**
- Jede Spielstätte hat einen Untergrund mit eigener Ballphysik *und* eigener Zweikampfkultur:
  | Untergrund | Ball | Zweikampf | Risiko |
  |---|---|---|---|
  | Asphalt / Beton | schnell, springt | Stochern im Stehen, Grätsche kommt kaum ins Rutschen | Schürfwunde sehr wahrscheinlich |
  | Asche | bremst, verspringt oft | Stochern, Grätsche nur von Hitzköpfen | „Asche im Knie“ |
  | Rasen | mittel, holprig | Grätschen normal | keins |
  | Kunstrasen | schnell, sauber | Grätschen, lange Rutschwege | Kunstrasen-Verbrennung |
- Auf hartem Boden ist die Zweikampftaste Stochern; Sprint + Zweikampf erzwingt die Grätsche –
  bewusste Entscheidung mit Konsequenz.
- Schürfwunden: Pflaster am Knie, leichtes Humpeln, etwas weniger Tempo und mehr Ermüdung;
  stapeln sich bis ×3. Die KI grätscht verletzt nicht mehr auf hartem Boden.
- Trait **Hart im Nehmen**: grätscht auch mal auf Asche, Wunden stören kaum.
- Später: Verletzungen wirken in die Woche hinein (Chatgruppe: „Knie ist offen, spiel lieber nicht“),
  Wetter verändert den Untergrund (nasser Rasen = lange Grätschen, gefrorene Asche = Beton).

**Schiedsrichter & Regeln**
- Hobby-Schiris mit eigenen Eigenschaften (pingelig, lässt laufen, schlechte Sicht, parteiisch).
- Linienrichter werden von den Vereinen gestellt – dein Ersatzspieler mit der Fahne.
- In den untersten Spielorten gibt es gar keinen Schiri: „Wer foult, sagt Bescheid“.
- Spielabsage bei unbespielbarem Platz, Nachholspiele unter der Woche (Kaderproblem!).

**Teamchemie & Kabine**
- Beziehungsnetz zwischen Spielern: Kumpels, Kollegen, Schwager, Rivalen.
- Kabinenansprache vor dem Spiel und zur Halbzeit (Multiple-Choice mit Persönlichkeitsbezug).
- **Dritte Halbzeit**: Nach dem Spiel in die Kneipe/ins Vereinsheim – kurze Dialogszenen,
  Teamchemie-Events, Gerüchte, spontane Transferhinweise („Mein Arbeitskollege hat früher
  Landesliga gespielt …“).

**Wirtschaft ohne Profigeld**
- Einnahmen: Mitgliedsbeiträge, Sponsoren, Getränke- und Grillverkauf, Sommerfest, Tombola.
- Ausgaben: Platzmiete, Bälle, Trikots, Schiri-Gebühr, Verbandsstrafen, Fahrtkosten.
- Transfers laufen selten über Geld: eine Kiste Bier, ein Trikotsatz, ein Gefallen, ein Job-Tipp.
- Sponsoren haben lokale Ziele („Mind. 30 Zuschauer beim Heimspiel“, „Spieler besucht Laden“).

**Spielerpool & Klassen** *(umgesetzt als Grundlage)*
- Ein Pool von 25.000 Spielern in der Region, deterministisch aus einem Seed erzeugt – jeder Spieler ist
  über seine Nummer reproduzierbar, gespeichert werden muss nur, was sich ändert.
- Sechs Klassen mit Seltenheit:

  | Klasse | Anteil | Ø Stärke | Wer ist das? |
  |---|---|---|---|
  | OK | ~55 % | 40 | Kickt halt mit. |
  | Gut | ~28 % | 51 | Stammspieler in jeder Kreisklasse. |
  | Stark | ~12 % | 62 | Leistungsträger. |
  | Dorfstar | ~4 % | 71 | Kennt im Ort jeder, Torschützenkönig, Vereinsikone. |
  | Superstar | ~0,8 % | 80 | Hat mal höher gespielt: Oberliga, Regionalliga, Jugend eines Profivereins. |
  | Ex-Profi | ~0,04 % (≈10 im Pool) | 87 | Karriere vorbei, will einfach nur kicken. |

- **Ex-Profis** sind fiktive Archetypen – bewusst **keine echten Namen oder erkennbaren Personen**
  (Persönlichkeits- und Namensrechte): Der Abwehrturm, Der Zehner, Der Knipser, Die Torwartlegende,
  Der Staubsauger, Der Flügelflitzer. Weltklasse am Ball, aber Tempo und Puste sind im Ruhestand.
  Eigene Eigenschaft „Ex-Profi“: kaum Fehlkontakte, präzise Pässe, Mitspieler in der Nähe laufen mehr.
- Superstars und Dorfstars haben einen Lebenslauf mit fiktiven Vereinen; Karrierejahre passen zum Alter.
- Stärke (1–99) nach Position gewichtet, Besonderheiten zählen mit.

**Ideen für die Anwerbung (Saison-Phase)**
- Gerüchte statt Transferliste: „Beim Bäcker erzählen sie, dass der ehemalige Abwehrchef von Borussia
  Nordhafen ins Neubaugebiet gezogen ist.“ → Event-Kette.
- Ex-Profis wollen **keinen Rummel**: Sie gehen lieber zum kleinen Verein mit guter Teamchemie als zum
  ambitionierten Nachbarn. Presse und Social Media des Vereins schrecken sie eher ab.
- Überzeugen über die Dritte Halbzeit, ein Open Training, einen gemeinsamen Kumpel im Team.
- Superstars haben Bedingungen: „Nur, wenn ich sonntags um 15 Uhr wieder zu Hause bin.“
- Scouting deckt Klasse und verborgene Eigenschaften erst nach und nach auf – im Pool-Browser später
  mit „???“ statt Werten, bis man den Spieler gesehen hat.

### 3.2 Vereins- & Meta-Systeme

- **Vereinsheim-Ausbau**: Bauwagen → Container → Vereinsheim mit Theke → Clubhaus mit Terrasse.
  Jedes Upgrade bringt Boni (Einnahmen, Teamchemie, Regeneration, Nachwuchsattraktivität).
- **Platzausbau**: Tore mit Netz, Linien, Flutlicht, Anzeigetafel (erst Kreide-Tafel, dann digital),
  Tribüne, Bandenwerbung (anfangs selbst bemalt).
- **Ehrenamt**: Platzwart, Kassenwart, Zeugwart, Grillmeister – NPCs mit Einfluss
  (ein guter Platzwart verbessert den Rasen).
- **Fans & Zuschauer**: Wenige Stammgäste mit Namen (Oma Gisela, der Mann mit Hund,
  der Ex-Trainer auf der Bank). Mit Erfolg wächst die Fanbasis, später kleine Fangruppe mit Trommel.
- **Vereinschronik**: Mannschaftsfoto jeder Saison hängt im Vereinsheim, Rekorde, Torschützenkönige,
  Legenden. Ehemalige Spieler werden Co-Trainer, Platzwart oder Jugendtrainer.
- **Lokalzeitung („Kreisblatt“)**: Spielberichte, Noten, Elf der Woche, Interviews,
  Gerüchte. Auch Social-Media-Account des Vereins mit Followern.
- **Rivalitäten & Derbys**: Nachbardorf, Betriebssportgruppe, der „Retortenclub“ mit
  dem reichen Sponsor. Derbys mit eigener Stimmung und Belohnung.

### 3.3 Spielmodi

| Modus | Beschreibung |
|---|---|
| **Karriere: Spielertrainer** (Hauptmodus) | Du bist Spieler + Trainer + Vereinsvorsitzender in Personalunion. Vom Parkplatz zur Oberliga. Dein Avatar altert und wechselt irgendwann ganz an die Seitenlinie. |
| **Karriere: Einzelspieler** | Ein Normalo-Spieler, der sich von der Hobbyrunde hocharbeitet, Vereine wechselt, Job und Fußball vereinbaren muss. |
| **Bolzplatz / Straße** | Schnelle Freundschaftsspiele 3v3 bis 7v7 mit Hausregeln (Jackentore, „Letzter Mann“, Torwart wechselt). |
| **Pokal-Wochenende** | Kreispokal-Modus: Außenseiter gegen Höherklassige, K.-o.-Spiele. |
| **Turniere & Events** | Hallenturnier im Winter (Futsal-artig), Sommerfest-Blitzturnier, Firmencup, Elfmeterschießen-Event, Alte-Herren-Spiel. |
| **Challenges** | Szenarien: „Gewinne mit 9 Mann“, „Halte das 1:0 auf Schlammboden“, „Aufstieg ohne Transfers“, „Nur Spieler über 35“. |
| ~~Couch-Koop / Versus~~, ~~Online-Freizeitliga~~ | **Gestrichen** (vom Nutzer entschieden 2026-11-07: kein Koop, kein Mehrspieler). |

### 3.4 Minispiele & Scouting

- **Open Training**: Offenes Probetraining – Stationen (Sprint, Passen, Torschuss, Kopfball)
  als kurze Minispiele. Du beobachtest und entdeckst verborgene Traits.
- **Bolzplatz-Scouting**: Durch den Stadtteil laufen, spontanen Kicks zuschauen, Leute ansprechen.
- **Kicker, Latte schießen, Flaschen-Challenge** in der Kneipe als Teambuilding.
- **Trainingseinheiten**: Rondo, Torschusstraining, Laufeinheit – kurze Skill-Minispiele
  mit Einfluss auf Form und Chemie (oder automatisch simulierbar).
- **Elfmeter-Nerven**: Rhythmus/Timing-Minispiel mit Druckanzeige.

### 3.5 Präsentation & Atmosphäre

- Tageszeiten- und Wetterwechsel, Flutlicht bei Abendspielen.
- Umgebungsdetails: Hunde auf dem Platz, Ball fliegt über den Zaun (Einwurf verzögert),
  Kinder hinterm Tor, Rasenmäher-Spuren, Einkaufswagen am Parkplatzrand.
- Audio: echte Sonntagsgeräusche – Rufe der Mitspieler, Trainer-Gebrüll, Kirchenglocken,
  Straßenverkehr; statt TV-Kommentator ein Stadionsprecher mit Mikrofonrauschen (ab höheren Ligen)
  oder ein Zuschauer, der kommentiert.
- **Fotomodus** und Mannschaftsfoto-Generator.
- Umfangreiche Editoren: Trikot, Wappen, Vereinsname, Spieler-Aussehen.

---

## 4. Liga- und Spielstätten-Progression

| Stufe | Liga (fiktiv/generisch) | Spielstätte | Format |
|---|---|---|---|
| 0 | Hobbyrunde / Freizeitliga | Park, Parkplatz, Hinterhof | 5v5 – 7v7, Jackentore |
| 1 | Kreisklasse C | Bolzplatz / Ascheplatz | 11v11 |
| 2 | Kreisklasse B | Ascheplatz / alter Rasen | 11v11 |
| 3 | Kreisklasse A | Rasenplatz | 11v11 |
| 4 | Kreisliga | Kunstrasen mit Flutlicht | 11v11 |
| 5 | Bezirksliga | Sportplatz mit kleiner Tribüne | 11v11 |
| 6 | Landesliga | Kleinstadion | 11v11 |
| 7 | Oberliga (Endgame) | Amateurstadion | 11v11 |

Liga- und Vereinsnamen bleiben fiktiv (keine Lizenzen nötig); regionale Varianten
(DE/AT/CH/UK „Sunday League“) als späteres Lokalisierungs-Feature.

---

## 5. Technik & Art-Style

- **Engine: [three.js](https://github.com/mrdoob/three.js)** (entschieden) – läuft im Browser,
  Build mit **Vite**, Tests mit **Vitest**. Desktop-Builds später per Electron/Tauri möglich.
- **Pixelart-Pipeline** (`src/render/PixelRenderer.js`): Die Szene wird in niedriger Auflösung
  (~320 px Höhe) in ein Render-Target gerendert, zusätzlich ein Normalen-Pass. Ein Post-Shader
  erkennt Kanten über Tiefe (dunkle Silhouetten) und Normalen (helle Innenkanten) und skaliert
  pixelgenau hoch. Toon-Materialien mit 3-stufigem Verlauf, Echtzeit-Schatten.
- **Kamera**: Orthografische Schrägansicht, im Kameraraum auf das Texelraster gerastet
  (kein Pixel-Flimmern beim Scrollen).
- **Modelle**: Prozedurale Low-Poly-Normalos aus Quadern (Bauch, Glatze, Bart, Größe
  variieren). Später Blender → glTF mit gleicher Pipeline.
- **Architektur**: Spiellogik (`src/sim/`) kennt kein three.js. Deterministische,
  tick-basierte Simulation (60 Hz, geseedeter Zufall) → dieselbe Engine für gespielte und
  simulierte Partien, testbar und später online-fähig.
- **Daten**: Spieler, Traits, Teams, Events als datengetriebene JS-/JSON-Module (Modding-freundlich).
- **Prozedurale Generierung**: Spieler (Name, Aussehen, Beruf, Traits), Texturen (Asphalt,
  Schilder), Gegnervereine.

## 6. Roadmap

> Stand 2026-11-07 (Bugsuch-Test): Die Phasen 0–7 sind bis auf die als „teilweise“ markierten Punkte umgesetzt; offen sind vor allem Phase 8 und die Wünsche in Abschnitt 11.17.

### Phase 0 – Pre-Production (ca. 3–4 Wochen)
- [x] Engine-Entscheidung (three.js) & Projekt-Setup (Vite, Vitest)
- [x] Art-Style-Prototyp: prozedurale Spielermodelle, Parkplatz-Szene, Pixel-/Outline-Shader, Kamera
- [x] Steuerungs-Prototyp: Laufen, Sprinten, Dribbeln, Passen, Schuss mit Aufladen, Spielerwechsel
- [x] Deterministische Match-Simulation 4v4 mit einfacher KI und Torhütern
- [x] Grätschen & Fouls (Ball zuerst = sauber, Mann zuerst = Foul → Freistoß nach Parkplatzregel)
- [x] Untergründe (Asphalt, Asche, Rasen, Kunstrasen): Stochern vs. Grätsche, Schürfwunden
- [x] CI (Tests + Build bei jedem Push)
- [x] Kernentscheidungen getroffen (siehe Abschnitt 7)

**Meilenstein M0:** „Es fühlt sich gut an, auf dem Parkplatz gegen einen Ball zu treten.“

### Phase 1 – Core Match / Vertical Slice (ca. 6–8 Wochen)
- [x] 5v5-Match auf dem Parkplatz, komplette Steuerung (inkl. hoher Ball, Einwurf)
- [x] KI mit Rollen: Anlaufen, Absichern, Manndeckung, Freilaufen; Torwart mit weitem Abschlag
- [x] Attribute (Tempo, Ausdauer, Technik, Passen, Schuss, Zweikampf, Kopfball)
- [x] Amateur-Physik: Fehlerquote abhängig von Attributen & Müdigkeit; Kopfbälle, Blocks mit dem Körper
- [x] 11 Traits funktionsfähig (u. a. Kopfballungeheuer, Strammer Schuss, Meckerer, Raucher)
- [x] Regeln: Anstoß durch das Team, das das Tor kassiert hat; Einwurf, Ecke, Abstoß; Parkplatzregel „Ans Auto“
- [x] Pfosten & Latte bei echten Toren
- [x] Modus KI gegen KI (Grundlage für simulierte Ligaspiele)
- [x] Liveticker für simulierte Spiele (Kommentator auf Deutsch und Englisch)
- [x] Balance: Schutzzone für den Torwart, Ballführung am Fuß, schlagbare Kreisklasse-Keeper
- [x] Drei Ligen (Freizeitliga, Kreisklasse C, Kreisklasse B) mit Relegation in Hin- und Rückspiel
- [x] Elfmeterschießen, Freistöße mit Mauer, Ecken-Varianten, Schwierigkeitsgrad, Auto-Wechsel
- [x] Spielerentwicklung sichtbar (Formkurve, Verlauf), Spieler des Monats und der Saison
- [x] Tastenbelegung, Lautstärke, farbenblind-sichere Trikots, drei Speicherplätze mit Export/Import
- [x] Gameplay-Überarbeitung: Ballannahme und Passauswahl, Zielhilfe, Torwart-Reaktionszeit, Eins gegen eins,
  Distanzschüsse, Restverteidigung, keine Ecken-Hänger, aktive Mitspieler
- [x] Pixelschrift im Projekt statt Google Fonts
- [x] Minimal-UI: Halbzeit, Endstand-Screen – erledigt (HalftimePanel, EndScreen)

**Meilenstein M1:** Spielbare Vertical Slice – ein Match von Anfang bis Ende, das Spaß macht.

### Phase 1b – Spielorte (erledigt)
- [x] Venue-System: Simulationsdaten (Größe, Format, Untergrund, Begrenzung, Torart) + Szenenaufbau je Platz
- [x] Hinterhof (4v4, Beton, Wände, Garagentor), Parkplatz, Stadtpark (Linien ohne Kreide), Ascheplatz (echte Tore)
- [x] Zuschauer aus dem Spielergenerator (Oma am Fenster, Hundebesitzer, Bankdrücker)
- [x] Platzwahl-Menü mit KI-Vorschau im Hintergrund

### Phase 2 – Team & Kader (ca. 4–6 Wochen)
- [x] 11v11 auf Rasen/Asche, Formationen & Taktik-Grundeinstellungen – erledigt (Großfeld, Taktiktafel)
- [x] Prozeduraler Spielergenerator (Aussehen, Name, Beruf, Traits) – erledigt (sim/generator.js)
- [x] Kaderverwaltung, Aufstellung, Einwechslungen – erledigt (Mannschaft, Wechseltafel)
- [x] Teamchemie-Grundsystem – erledigt (sim/bonds.js, career/relations.js)
- [x] Match-Simulation (ungespielte Partien) auf Basis derselben Engine – erledigt (simulateSync, Web Worker)

**Meilenstein M2:** Eigene Mannschaft zusammenstellen und gegen generierte Gegner spielen.

### Phase 3 – Saison & Liga (ca. 4–6 Wochen)
- [x] Spielplan, Tabelle, Auf- und Abstieg über mehrere Ligen – erledigt (12 Stufen bis zur 1. Liga)
- [x] Wochenrhythmus: Training → Chatgruppe → Spieltag → Dritte Halbzeit – erledigt
- [x] „Wer kann Sonntag?“-Chat mit Zu-/Absagen – erledigt
- [x] Verletzungen, Karten, Sperren – erledigt
- [x] Speichern/Laden – erledigt (Spielstände)

**Meilenstein M3:** Eine komplette Saison spielbar – der Kern-Loop steht.

### Phase 4 – Verein & Wirtschaft (ca. 4–6 Wochen)
- [x] Vereinsfinanzen, Sponsoren mit Zielen – erledigt
- [x] Trikot- und Wappen-Editor (saisonweise) – erledigt
- [x] Vereinsheim- und Platzausbau – erledigt (Anlage, Vereinsgelände)
- [x] Zuschauer- und Fansystem – erledigt

**Meilenstein M4:** Der Verein wächst sichtbar über mehrere Saisons.

### Phase 5 – Transfers, Scouting & Nachwuchs (ca. 4–6 Wochen)
- [x] Transfersystem mit Überzeugungsgesprächen und Nicht-Geld-Deals – erledigt (Transfermarkt, Argumente)
- [ ] Open Training als Minispiel-Sammlung – teilweise (offen: Probetraining gibt es, Minispiele nicht)
- [x] Bolzplatz-Scouting – erledigt (career/scouting.js)
- [x] Jugendabteilung & Nachwuchsspieler – erledigt
- [x] Verborgene Traits & Entdeckung – erledigt (career/scouting.js: Eigenschaften erst nach Beobachtung)

**Meilenstein M5:** Rohdiamanten finden, formen und in die erste Elf bringen.

### Phase 6 – Leben, Story & Atmosphäre (ca. 4–6 Wochen)
- [x] Alltags-Eventsystem (Jobs, Familie, Samstagabend-Faktor) – erledigt
- [x] Dritte-Halbzeit-Szenen & Beziehungsnetz – erledigt (Kneipe, Beziehungen)
- [x] Kreisblatt/Lokalzeitung, Vereins-Social-Media – erledigt (Kreisblatt, career/social.js)
- [x] Rivalitäten & Derbys, Kreispokal – erledigt (Fehden, Pokale)
- [x] Schiedsrichter-Persönlichkeiten (2026-10-30, referees.js)

**Meilenstein M6:** Das Spiel erzählt eigene Geschichten.

### Phase 7 – Content & Polish (ca. 6–8 Wochen)
- [x] Alle Spielstätten (Park bis Amateurstadion), Wetter & Tageszeiten – erledigt (bis zum Stadion)
- [ ] Challenges, Turniere (Halle, Sommerfest), Bolzplatz-Modus – teilweise (Turniere erledigt; Challenges und Bolzplatz-Modus offen)
- [ ] Audio-Atmosphäre, Musik, Stadionsprecher – teilweise (Geräusche je Spielort vorhanden; Musik und Stadionsprecher offen)
- [x] Balancing, Tutorial/Onboarding, Lokalisierung (DE/EN) — Tutorial gebaut 2026-11-06 (ui/Tutorial.js) – erledigt (Tutorial 2026-11-06 (ui/Tutorial.js); Balancing laufend)
- [ ] Performance, Controller-Support, Barrierefreiheit – teilweise (Qualitätsstufen und Gamepad vorhanden; Barrierefreiheit offen)

**Meilenstein M7:** Content-complete Beta → Early Access

### Phase 8 – Post-Launch
Wird erst auf ausdrücklichen Auftrag des Nutzers bearbeitet (Editoren/Modding). Couch-Koop, Versus und Online-Liga sind gestrichen (Nutzer, 2026-11-07: kein Koop, kein Mehrspieler).
- [x] Einzelspieler-Karriere – erledigt
- [ ] Editoren & Modding-Support (Spieler-/Liga-Packs)
- [x] Saisonale Events (Winterpause, Hallenmasters, Sommerfest) – erledigt (Winterpause mit Hallenturnier, Sommerturnier, Vereinsfest)

### MVP-Definition (Minimum für ersten öffentlichen Test)
Phase 0–3 + Trikot-Editor + 3 Spielstätten (Parkplatz, Ascheplatz, Rasenplatz) + 15 Traits.

---

## 7. Entscheidungen

| Thema | Entscheidung |
|---|---|
| Spielgefühl | **Hybrid**: Vereinsmanagement + selbst gespielte Matches (jede Partie optional simulierbar) |
| Kamera | **Seitenansicht** (TV-Perspektive, orthografisch, ~20° Neigung) |
| Plattform | **PC** zuerst (Steam). Entwicklung im Browser, Desktop-Build per Tauri/Electron; Fokus auf Tastatur + Gamepad |
| Engine | **three.js** + Vite |
| Ton | **Warmherzig mit trockenem Humor** – liebevoll über die Figuren, nie über sie lustig machen; Komik entsteht aus Alltag und Situation, nicht aus Slapstick |
| Setting | **Mischung**: Herz ist eine fiktive deutsche Region (Kreisklasse, Vereinsheim, Getränkemarkt), Inhalte bleiben international lesbar; Lokalisierung DE/EN, später Sunday-League-UK-Paket |
| Repository | Eigenes Repository `sunday-league` |

---

## 8. Brainstorming: Was noch fehlt (Stand nach Phase 1b)

Das Spiel auf dem Platz steht, alles drumherum (Verein, Saison, Leben) fehlt noch komplett.
Gleichzeitig hat das Match noch Lücken, die man beim Spielen sofort merkt.

### 8.1 Pflicht vor einem öffentlichen Test (Early Access)

| # | Thema | Warum |
|---|---|---|
| 1 | **Sound** | Aktuell komplett stumm. Ballkontakt, Pfiff, Rufe („Hintermann!“, „Leo!“), Kirchenglocken, Hundebellen – ohne Ton fühlt sich nichts nach Sonntag an. |
| 2 | **Halbzeit, Seitenwechsel, Endscreen** | Mit Spielstatistik und Kreisblatt-Noten (1–6) für jeden Spieler. |
| 3 | **Auswechslungen** | Ausdauer ist ein Kernsystem – ohne Wechsel läuft sie ins Leere. Rollende Wechsel wie im Hobbyfußball. |
| 4 | **Torwart-Animationen** | Hechtsprung, Faustabwehr, Abschlag – der Keeper rettet gerade „unsichtbar“. |
| 5 | **Torjubel** | Individuell & amateurhaft: Flugzeug, Bierbauch-Rutscher auf Rasen (auf Asphalt lieber nicht), Trikot über den Kopf, Stolperer. |
| 6 | **Speichern/Laden** | Voraussetzung für alles Weitere. Versioniertes Format. |
| 7 | **Saison-Loop (Minimalversion)** | Woche → Chatgruppe → Spieltag → Tabelle. Die KI-gegen-KI-Simulation ist schon da. |
| 8 | **Tutorial** | Als Story: Du ziehst neu in die Stadt, kickst im Hinterhof mit und gründest mit den Leuten einen Verein. |
| 9 | **Einstellungen** | ✅ Menü mit Sprache, Ton, Effekten und Tempo (Taste O). Offen: Tasten frei belegen, Lautstärke, farbenblind-sichere Trikots. |
| 10 | **Mehrsprachigkeit** | ✅ Komplett auf Deutsch und Englisch, Wahl beim ersten Start und in den Einstellungen (`src/core/i18n.js`). |
| 11 | **Desktop-Build** | Tauri oder Electron + Steamworks (Achievements, Cloud-Saves). |

### 8.2 Match: sinnvolle Erweiterungen

- **Schiedsrichter ab dem Ascheplatz**: Hobby-Schiri mit Persönlichkeit, Karten, Vorteil. Linienrichter stellt
  der Heimverein (parteiisch!). Meckerer sammeln hier ihre Gelben.
- **Elfmeter & Elfmeterschießen** (Pokal) als Nerven-Minispiel.
- **Wetter & Tageszeit**: Regen (Pfützen stoppen den Ball), Wind, Frost (Asche wird zu Beton), Hitze (mehr
  Ausdauerverbrauch), Flutlichtspiele am Freitagabend.
- **7 gegen 7 und 11 gegen 11** für die höheren Ligen, mit Abseits (ab 11 gegen 11).
- **Taktik light**: „Hinten dicht“, „Alle nach vorne“, „Lange Bälle“, „Kurzpass“ – keine Taktiktafel wie im
  Profi-Manager, eher Kabinenansage.
- **Zu spät kommende Spieler**: „Bin in 10 Minuten da“ – man spielt in Unterzahl, bis er am Spielfeldrand
  auftaucht und reinläuft. Passt perfekt zur Chatgruppe.
- **Wiederholungen & Fotomodus**: Die Simulation ist deterministisch. Seed plus Eingaben reichen für
  Wiederholungen, Highlights und „Tor des Monats“ im Kreisblatt, ganz ohne Videoaufnahme.
- **Kamera-Juice**: leichtes Wackeln bei Pfosten und Latte, Zoom beim Elfmeter, Zeitlupe beim Siegtor.
- **Schwierigkeitsstufen** für die KI (Reaktionszeit, Fehlerquote).

### 8.3 Verein & Meta (der eigentliche Kern, noch nicht begonnen)

- **Mannschaftskasse & Strafenkatalog**: Zu spät: 5 €, Gelb wegen Meckern: 10 €, Handy in der Kabine: 2 €.
  Das Geld finanziert die **Saisonabschlussfahrt** (großes Teamchemie-Event). Urdeutsch und ein schöner
  Kreislauf aus Disziplin und Belohnung.
- **Sammelalbum**: Jeder Spieler bekommt eine Karte fürs Kreisblatt-Album, Legenden bekommen eine glänzende.
- **Spieler altern & hören auf**: Karriereende mit Abschiedsspiel, danach Co-Trainer, Platzwart oder Wirt im
  Vereinsheim.
- **Motivation statt Gehalt**: Amateure spielen für Spaß, Freunde und Einsatzzeit. Wer dauernd auf der Bank
  sitzt, sagt irgendwann ab oder wechselt zum Nachbarverein.
- **Gemischte Teams in der Hobbyrunde**: Freizeitligen sind oft gemischt. Spielerinnen als ganz normaler Teil
  der Hobbyrunde, dazu eine eigene Frauen-Mannschaft als späterer Vereinsausbau.
- **Vereinsleben-Events**: Sommerfest, Weihnachtsfeier, Arbeitseinsatz am Platz (Platzausbau gegen Ausdauer),
  Jahreshauptversammlung (Vorstandswahl, Beitragserhöhung).
- **Lokalzeitung „Kreisblatt“** als zentrale Bühne: Spielberichte, Noten, Gerüchte, Leserbriefe.

### 8.4 Online & Community (nach Release)

> Gestrichen sind alle Mehrspieler-Teile (Geister-Spiele gegen Freunde, Freundes-Liga) – vom Nutzer entschieden 2026-11-07: kein Koop, kein Mehrspieler. Teilen von Trikot-/Wappen-Codes und Achievements bleiben möglich.

- **Geister-Spiele**: Das Team eines Freundes als Gegner, wahlweise simuliert oder selbst gespielt.
- **Asynchrone Freundes-Liga**: jede Woche ein Spieltag, alle Partien simuliert, das eigene Spiel optional live.
- **Trikot- und Wappen-Codes** zum Teilen, Steam Workshop für Liga- und Namenspakete.
- ✅ **Achievements** mit Augenzwinkern (umgesetzt 2026-11-07, 11.17 Punkt 12): „Luftloch-König“, „Asche im Knie ×3“, „Ans Auto – 5× in einem Spiel“.

### 8.5 Technik

- **Simulation im Web Worker** für schnelle Hintergrund-Simulation ganzer Spieltage. Gebaut 2026-11-06 (bgsim.js, simworker.js),
  Byte für Byte gleiche Ergebnisse (tests/bgsim.test.js); vorerst nur mit `?worker` an – im Browser-Test auf vier Kernen kaum
  schneller (3,6 statt 3,9 s je Spieltag). Einschalten nach Messung auf einem echten Handy.
- **Schneller Testlauf** `npm run test:quick` (2026-11-06): ohne die neun Dateien, die viele ganze Spiele rechnen (zusammen gut
  die Hälfte der Rechenzeit). Vor jeder Lieferung weiter der volle Lauf.
- **Spiel-Engine schneller** (Messung 2026-11-06, scratch bench2/stat): Eingeschwungen kostet ein Spiel etwa 1 s Rechenzeit, verteilt
  über die ganze KI (Laufwege 14 %, Spielschritt 21 %, Bewegung, Absichern …) – kein einzelner Engpass. Byte-gleiche Kleinigkeiten
  (feste Form der Spielerobjekte, Laufwege-Tabelle ohne Prototyp, Abstandstest ohne Wurzel) helfen nur beim Anlauf (erste Spiele
  nach dem Start ≈ 5 %), eingeschwungen nicht messbar. Laufwege seltener berechnen bringt wenig und ändert das Spiel (30 statt
  60 je Sekunde: −7 % Zeit; 20: −17 % Zeit, aber 2,08 statt 2,42 Tore je Spiel) – verworfen. Der Hebel bleibt das parallele Rechnen
  (Web Worker oben) – nach Messung auf einem echten Handy.
- **Eingaben aufzeichnen** (Seed + Input-Stream) → Replays, Desync-Tests, später Online.
- **Asset-Pipeline**: Blender → glTF für detailliertere Modelle; Animationen weiter prozedural plus ein paar
  handgemachte Keyframe-Clips (Jubel, Hechtsprung).
- **Instancing** für Zuschauer, Autos und Bäume, sobald die Plätze voller werden.
- **Browser-Smoke-Test in der CI** (Playwright: Menü → Anstoß → 10 s spielen, keine Fehler).
- **Balancing-Werkzeug**: Das KI-Statistik-Skript aus der Entwicklung als `npm run balance` ins Repo.

### 8.6 Vorschlag für die Reihenfolge

1. ~~**Match-Abrundung**~~ ✅ Sound (synthetisch, je Platz eigene Kulisse), Halbzeit mit Seitenwechsel, Endscreen im
   Kreisblatt-Stil mit Noten/Statistik/Schlagzeile, rollende Wechsel mit Ersatzbank, Hechtsprung, 4 Jubelvarianten
2. ~~**Saison-Minimalversion**~~ ✅ Freizeitliga mit 6 Vereinen, Chatgruppe mit Zu-/Absagen je Beruf und
   Nachhaken, Aushilfen aus dem Pool, Auto-Aufstellung, selbst spielen oder simulieren, Tabelle,
   Spielplan, Saisonstatistik je Spieler (Einsätze, Tore, Vorlagen, Ø-Note), Speichern im Browser.
   ✅ Aufstellung selbst wählen · ✅ Transfers über die Gerüchteküche (3 Gerüchte/Woche, zuschauen deckt
   Stärke & Eigenschaften auf, Ansprechen mit Zusagechance, Ex-Profis meiden Rummel, Kader 7–12).
   ✅ Aufstieg in die Kreisklasse C (7 gegen 7, Schiri, Sportplatz Waldesruh), Abstieg zurück,
   Kader & Karriere-Gesamtstatistik bleiben, Vereinschronik. Offen: Kreisklasse B und höher, Spieler altern.
3. **Verein**: ✅ Trikot-Editor (Name, Kürzel, Farben, Uni/Streifen/Ringel, Bestellung vor Saisonbeginn,
   Ausweichtrikots bei Farbkonflikt) · ✅ Mannschaftskasse mit Strafenkatalog aus echten Spielszenen,
   lokale Sponsoren (Trikot/Bande, Saisonziel mit Bonus), Heimspiel-Einnahmen & -Kosten,
   Saisonabschlussfahrt (weniger Absagen in der nächsten Saison)
4. **Transfers & Scouting**: ✅ Gerüchteküche · ✅ Open Training (6 Stationen, 3 wählbar, Messwerte deuten,
   Eigenschafts-Hinweise, Rohdiamanten, Einladungen) · ✅ Spielerentwicklung & Altern je Saison ·
   ✅ Jugendabteilung (Jugendtrainer, Jahrgänge, hochziehen, Abgang mit 20) · ✅ Karriereende mit
   Abschiedsparty und Ehrenamt (Co-Trainer, Jugendtrainer, Wirt, Platzwart – jeweils mit Wirkung) ·
   offen: Bolzplatz-Scouting
5. ✅ Schiri & 7v7 · ✅ Challenges (6 Szenarien, Sterne, Karriere-Belohnungen) · offen: Wetter, 11v11, Kreisklasse B+

---

## 9. Geschichten, Vorfälle & Entscheidungen (Brainstorming, Ausbaustufe „Leben")

Grundbaustein: ein **Ereignis-System** – jedes Ereignis ist ein Datensatz mit Bedingung, Text in der
Chatgruppe, 2–3 Antworten und Folgen (Kasse, Verfügbarkeit, Stimmung, Form, Spieler kommen/gehen).
Mehrwöchige Geschichten sind Ketten solcher Ereignisse.

**Match-Vorfälle (selten):** Ball über den Zaun (Nachbar behält ihn ein), Hund klaut den Ball,
Autoalarm → Parkplatzsperre, Gewitter-Abbruch mit Nachholspiel, Rasensprenger springen an, verletzter
Schiri wird durch einen Zuschauer ersetzt, eingelaufene Trikots → Leibchen, Torwart kommt nicht,
Oma ruft wegen Lärm die Polizei, ein Promi kickt im Park mit.

**Vereinsleben:** Arbeitseinsatz am Platz, Freibier-Abend im Vereinsheim (Stimmung vs. Kater),
Streit in der Gruppe (schlichten / bestrafen / raushalten), Beschwerden der Nachbarn, Sommerfest mit
Tombola, Firmenturnier des Sponsors, Jahreshauptversammlung (Beiträge, „wollen wir aufsteigen?"),
Porträt im Kreisblatt (Zuschauer ↑, Ex-Profis ↓).

**Lebensgeschichten (mehrwöchig):** wird Vater, Jobverlust, Umzug & Pendeln, ewiger Student mit
Abschluss, Comeback nach langer Verletzung, Vater & Sohn im selben Team, Ex-Profi mit Geheimnis,
Hochzeit am Spieltag, Bruder beim Rivalen, der Aushilfsschwager will fest dabei sein.

**Trainer-Dilemmata:** Stammspieler vs. Jugend (Bankfrust), Superstar mit Allüren, Kumpel vs.
Leistung, Sponsor mit Haken (Name im Vereinsnamen), Aufstieg ablehnen, Fairplay-Geständnis,
Spieler beim Gegner abwerben, Strafenkatalog verschärfen.

**Persönliche Ebene (Spielertrainer):** eigener Avatar mit Job & Familie, selbst spielen oder
coachen, Familien-Geduld als Ressource, Angebot eines größeren Vereins, Ehrenamts-Burnout.

**Teamchemie:** Beziehungsnetz (Kumpels, Kollegen, Schwager, Rivalen), Stimmungswert, Cliquen
(Raucherecke, Junge, Alte Herren) bis hin zur Abspaltung.

**Langzeit:** Platz wird verkauft, Jubiläum mit Festschrift aus der echten Chronik, Fusion mit dem
Nachbarn, erste Frauenmannschaft, ehemaliger Jugendspieler wird Profi und kommt zurück.

Reihenfolge: (1) Ereignis-System + Wochen-Ereignisse · (2) Teamstimmung & Form · (3) Lebensgeschichten ·
(4) Match-Vorfälle · (5) persönliche Ebene · (6) Langzeit-Geschichten

**Stand:** (1) und (2) umgesetzt – 15 Wochen-Ereignisse mit 2–3 Antworten (Vereinsheim-Abend, Arbeitseinsatz,
Streit, Nachbar, Kreisblatt-Porträt, Kater, Bankfrust, eingelaufene Trikots, Tombola, Kind im Park,
Allüren, Sommerfest, Firmenturnier, Schiri-Beschwerde, „wird Vater“ als erste mehrwöchige Geschichte),
Teamstimmung (beeinflusst Absagen und Zusagen bei Transfers), Spielerform (±8 % Attribute), „grummelt“ nach
gebrochenen Versprechen. Unbeantwortete Ereignisse entscheidet die Gruppe am Spieltag selbst.

(3) umgesetzt – Geschichten-System (`src/career/stories.js`) mit 7 mehrwöchigen Lebensgeschichten:
wird Vater, Umzug & Pendeln (Fahrgeld, Fahrgemeinschaft, Rückversetzung), Jobverlust (Beitrag erlassen,
Job beim Sponsor vermitteln), Comeback nach Kreuzbandriss (Reha oder zu früh rein), Abschlussarbeit
(danach neuer Job – manchmal weit weg), Hochzeit mit Polterabend, Bruderduell gegen einen Ligarivalen.
Höchstens drei laufende Geschichten, jede einmal pro Saison; laufende Geschichten stehen im Vereinsheim.

(4) umgesetzt – Match-Vorfälle (`src/sim/incidents.js`, ca. jedes 2.–3. Spiel, passend zum Platz): Hund klaut
den Ball, Ball über den Zaun (Nachbar behält ihn → 15 € Ersatzball), Autoalarm nach Treffer ans Auto,
Polizei wegen Lärmbeschwerde, Gewitter (danach nasser, rutschiger Boden, Regen), Rasensprenger,
verletzter Schiri → Zuschauer pfeift weiter. Die Uhr steht währenddessen; Bericht im Kreisblatt.
Testschalter: `?venue=park&incident=hund`.

(5) umgesetzt – Spielertrainer (`src/career/personal.js`): Du stehst als eigener Spieler im Kader (Job, Familie),
mit zwei Ressourcen: **Familien-Geduld** (Spieltage, Training, Scouting kosten Zeit) und **Ehrenamts-Energie**
(unbesetzte Posten, Vereinskasse, Kreisklassen-Papierkram ziehen). Leer → Familienkrise bzw. Burnout: zwei
Wochen weg, der Kapitän stellt auf, kein Training/Scouting, nicht selbst spielen. Persönliche Ereignisse:
Familienwochenende, Hochzeitstag, Chef will Samstag Inventur (später Spende), Müdigkeit, Kassenwart-Posten,
Kind will kicken (Familie kommt mit), Trainerangebot nach dem Titel. Sommerpause lädt auf.

(6) umgesetzt – Langzeit-Geschichten (`src/career/sagas.js`): Platz soll verkauft werden (Bürgerinitiative mit
Unterschriften aus Heimspielen, Pacht übernehmen oder abwarten – sonst Umzug auf einen Ausweichplatz),
Jubiläum alle 5 Jahre (25 Jahre in Saison 4) mit Festschrift aus der echten Chronik (Saisons, Torschützenkönige,
Rekordspieler, Meilensteine), Fusion mit dem Tabellenletzten (die Besten wechseln, ein neuer Verein rückt nach),
erste Frauenmannschaft mit eigener Saisonbilanz, Jugendspieler wird Profi (Ausbildungsentschädigung) und kehrt
Jahre später als Ex-Profi zurück.

## 10. Vereinsleben vertiefen (Ausbaustufe „Stammtisch")

Reihenfolge: (1) Stammkneipe mit Einzelgesprächen · (2) Spielergeschichten & Beziehungsnetz ·
(3) Stadtturniere (Stadtmeisterschaft, Hallenturnier) · (4) Jugendarbeit mit Jahrgängen.

(1) umgesetzt – Stammkneipe „Zum Anstoß" (`src/career/pub.js`, Tab „Kneipe"): zwei Aktionen pro Woche,
jede kostet etwas Familienzeit. Runde ausgeben (Stimmung), Einzelgespräch (Zuhören deckt das Dossier auf:
Herkunft, Familie, Traum, Geheimnis · Aufmuntern · Klartext mit Risiko), Taktik auf dem Bierdeckel für das
nächste Spiel, Wirt ausfragen (neuer Transfer-Tipp oder Schwäche des nächsten Gegners), Dart-Minispiel gegen
Opa Heinz um die nächste Runde. Opa Heinz hat jede Woche eine neue Weisheit.

(2) umgesetzt – Beziehungsnetz (`src/career/relations.js`): Kumpels, Schwager, Arbeitskollegen (gleicher Beruf)
und Rivalen, deterministisch aus dem Pool und durch Ereignisse veränderbar. In der Aufstellung wirkt die
Teamchemie auf Passen/Technik (Rivalen bremsen). Dossiers mit Folgen: bekannten Traum unterstützen (30 €,
Kraft) macht den Spieler treu (weniger Absagen) und landet in der Chronik. Neue Ereignisse
(`src/career/social.js`): Zoff unter Rivalen, ein Geheimnis macht die Runde, zwei Mitspieler werden Kumpels.

(3) umgesetzt – Stadtmeisterschaft (`src/career/tournament.js`, Tab „Turnier"): nach dem letzten Spieltag,
8 Vereine (Liga + 2 Gäste wie Polizei-SV oder Feuerwehr), zwei Vierergruppen, Halbfinale, Finale mit
Elfmeterschießen, 5 gegen 5 mit Schiri auf dem Sportplatz Am Kanal. Selbst spielen oder simulieren,
Preisgeld, Pokal in der Vitrine, Chronik-Eintrag, Stadtmeister haben es bei Transfers leichter.
Hallen-Stadtmeisterschaft in der Winterpause (Saisonmitte) in der neuen Sporthalle Kanalschule: Parkett,
Bande, Handballtore, glatter Boden (Grätschen gibt Hallenbrand). Auch als Freundschaftsspiel-Ort wählbar.

**Lebendiger:** Ereignisse würfeln jetzt aus mehreren Ausgängen (`src/career/outcomes.js`): 3–7 Folgen pro Antwort,
gewichtet nach Stimmung, Eigenschaften und Kadergröße – bis hin zu „Spieler verlässt das Team", „fliegt raus"
oder „wechselt zum Derby-Rivalen". **Derbys** (`src/career/derby.js`): Kanal-Derby bzw. Bezirks-Derby mit
Derby-Woche, doppelten Zuschauern, mehr Karten, härteren Grätschen und Derby-Bilanz. **Dramen:** Einer spannt
dem anderen die Freundin/Frau aus; Neuzugänge kennen jemanden von früher (Schulfreund oder Mobber → Erzfeinde).

**Verletzungen & Alltag:** Verletzungen in sieben Stufen (`src/career/injuries.js`) von Prellung bis Kreuzband- und
Achillessehnenriss, Risiko nach Alter, Boden, Derby und Eigenschaften; schwere Fälle kommen mit Diagnose und
Entscheidung (Physio, Zeit lassen, schnell zurück), seltener Extremfall Sportinvalidität mit Amt im Verein
(Co-Trainer, Platzwart, Wirt, Betreuer). Alltag (`src/career/life.js`), gewichtet nach Beruf und Lebenslage:
Schichttausch, Montage, Job-Stress, Beförderung, kranke Kinder, Elternzeit, Nebenjob, Trennung.

(4) umgesetzt – Jugend mit Jahrgängen (`src/career/academy.js`): E-, D-, C-, B-Jugend mit Kindern (Talent, Spaß,
Eltern), eigene Kinder spielen mit; wöchentlicher Trainingsschwerpunkt (Spaß, Technik, Kondition,
Turniervorbereitung) – Drill bringt Talent, kostet Spaß, wer keinen Spaß mehr hat, hört auf. Mit 16 in die
A-Jugend (Talent bestimmt die Stufe), Mädchen ins Frauenteam. Saisonergebnisse der Jugendteams, Schnuppertraining
im Sommer, Talentsichtung über eine Schul-AG. Abwerben in beide Richtungen: Derby-Rivale oder NLZ wollen deine
Talente, du kannst selbst Talente anderer Vereine ansprechen. Eltern-Ereignisse: ehrgeiziger Vater,
Kuchenbasar, Fahrgemeinschaft.

**Wendungen** (`src/career/twists.js`): Lebensgeschichten, Vereinsgeschichte und private Entscheidungen behalten
ihre Grundwirkung und bekommen je Antwort eine zufällige Zusatzwendung – vom Glücksfall bis zum Austritt.

**Wetter & Jahreszeiten** (`src/career/weather.js`): Die Saison läuft von August bis Mai, jeder Spieltag hat
seinen Monat und würfelt ein Wetter nach Jahreszeit – Sonne, Hitze (Ausdauer schwindet schneller), Regen (nasser
Rasen, lange Grätschen), Sturmböen (hohe Bälle driften), Nebel, Frost (harter Boden, springende Bälle) und Schnee
(Ball bleibt liegen). Wetter wirkt auf Zuschauer und Absagen, im Herbst fällt Laub, einer im Chat kommentiert
es immer. In der Halle gibt es kein Wetter.

**Karriereende & Nachfolge** (`src/career/legacy.js`): Ab 40 fragt dich jedes Saisonende, ob du noch selbst
spielst (weiterspielen, Abschiedstour, Schuhe an den Nagel), mit 50 entscheidet der Körper. Als reiner Trainer
kommt ab 62 die Frage nach dem Amt, ab 70 jedes Jahr, mit Gesundheitsschreck und Familien-Ultimatum; spätestens
mit 80 ist Schluss. Der Spielstand endet nie: Nachfolger werden dein Kind (ab 23 – die nächste Generation
bekommt eine eigene Familie, die Dynastie geht weiter), der Co-Trainer, ein verdienter Kapitän, eine
Vereinslegende oder ein neu angelegter Trainer. Der alte Trainer wird Ehrenpräsident, die Chronik führt die
Trainer-Ären. Abtreten geht ab 50 auch freiwillig.

**Sponsoring** (`src/career/sponsors.js`): 16 lokale Sponsoren mit Chef und Eigenart (treu, ehrgeizig,
knauserig, großzügig), vier Werbeplätze (Trikot, Bande, Spielballpate, in der Kreisklasse Ärmel). Vor der Saison
nachverhandeln – mehr Geld, mehr Bonus oder das Angebot ist weg. Die Beziehung (0–100) steigt mit Siegen,
erfüllten Zielen und guten Entscheidungen; verärgerte Sponsoren zahlen schleppend und kündigen irgendwann.
Zufriedene bieten die Verlängerung mit Aufschlag an. Ereignisse: Fototermin, der Sohn vom Chef will spielen,
Konkurrenzangebot fürs Trikot, Sponsor in Not, Siegprämie (auch doppelt oder nichts), Werbespot, Firmenjubiläum.

**Vereinsheim ausbauen** (`src/career/facilities.js`, Tab „Verein"): Warme Duschen (weniger Absagen), Grill & Theke
(mehr Verkauf), Ballmaschine (Junge entwickeln sich schneller), neue Kabine (Stimmung, Transfers), Flutlicht
(Training kostet weniger Familienzeit), Tribüne (mehr Zuschauer, braucht die Theke). Mit Handwerkern oder als
Arbeitseinsatz zum halben Preis – mit Maurer-Glück, Hammer auf dem Daumen oder angebohrter Wasserleitung.
Nebenkosten pro Woche.

**Saisonabschlussfahrt** (`src/career/trip.js`): Kegeltour ins Sauerland (120 €), Hüttenwochenende im Harz
(250 €) oder Mallorca (450 €) – je drei Etappen mit Entscheidungen und gewürfelten Ausgängen (Bollerwagen im Zug,
Wette gegen den Kegelclub, Brockenwanderung, Beachsoccer gegen Castrop, Rettungsmission um 3 Uhr). Die Fahrt
knüpft Freundschaften und Rivalitäten, kostet mal Geld oder einen Sonnenstich, landet in der Chronik und
entscheidet, wie die Mannschaft in die neue Saison startet.

**Grafik** (`src/render/PixelRenderer.js`, `src/render/props.js`): Der Nachbearbeitungs-Shader bekommt
Kontaktschatten aus der Tiefe (SSAO light), ein leichtes Glühen heller Flächen, Farbkorrektur (Tönung, Sättigung,
Kontrast), Dunst mit der Entfernung, Vignette und geordnetes Bayer-Dithering im Pixelraster. Jedes Wetter hat
einen eigenen Look (Regen kühl und gedämpft, Nebel dicht, Hitze warm und hell, Schneedecke und Raureif auf dem
Boden) und eine eigene Lichtstimmung; ein kühles Gegenlicht hebt die Spieler vom Rasen ab. Taste G schaltet die
teuren Effekte für langsame Rechner ab.

## 11. Zukunft: Ausbau-Wünsche (Stand Oktober 2026)

Die Zahlen in Klammern sind der Stand im Code, damit „mehr" messbar bleibt. Erledigt (Oktober 2026):
englische Namen, Vereine, Ligen und Sponsoren (11.3, 11.4), mehr deutsche Namen (Namensauflage 6), 60 Sponsoren,
10 Ereignisse für höhere Ligen (11.5), Torwart-Hechtsprung in Phasen, Vorfälle als Szenen mit Taube (11.1),
Bratwurst- und Bierbude auf Rasen-, Sport- und Großfeld, an die Zuschauer ab und zu gehen (`src/render/crowd.js`),
Kreis- und Bezirkspokal im K.-o.-System unter der Woche (`src/career/pokal.js`, siehe 11.7).
Aus 11.9/11.10 erledigt (bis 2026-10-23): Alte Herren, Vereinsfest und Sommerturnier, Transfermarkt (Wechselperioden,
CPU-Wechsel, Leihe, Abwerbung erst zur Periode, Vereinslose jederzeit), Platzpflege/Pacht/Ausbau mit Tribünen und Gastro,
Wappen-Editor, die gemeldeten Fehler aus 11.10 (Textmodus, Pokalsieg, Bild teilen, Android-Export), Großfeld-Maße und Torwart.

### 11.1 Animationen
- ✅ Erledigt (Oktober 2026, `src/render/reactions.js`, `tests/reactions.test.js`): vier neue Jubel (Trikot über
  den Kopf, Hand ans Ohr, Daumen auf den Rücken, Faust aufs Wappen), Mitspieler laufen mit erhobenem Arm zum
  Torschützen und bilden eine Traube; nach vergebener Chance Hände an den Kopf (Pfosten, Latte, vorbei) oder
  abwinken (gehalten), der Torwart ballt nach der Parade die Faust; der Schiri zeigt an (Ecke, Abstoß und
  Elfmeter zum Punkt, Freistoß und Einwurf in Angriffsrichtung, nach dem Tor zur Mitte); beim Wechsel klatschen
  beide ab, der Ausgewechselte trottet vom Platz. Armwinkel für Kopf, Ohr und Rücken per Gitter-Suche an der
  Figur bestimmt (Hand höchstens 2 cm vom Ziel). Nur Darstellung, die Simulation bleibt unverändert.
- ✅ Zweite Runde (Oktober 2026, alles nur Darstellung, Simulation unverändert bis auf den Jubel):
  - Weitere Jubel (Trikot über den Kopf, Hand ans Ohr, Rücken, Brust, Umarmen, Hinterherlaufen), Gesten (Hände an
    den Kopf, abwinken, geballte Faust, zeigen, abklatschen, Schulterzucken, schimpfen, Wade halten).
  - Torschütze bleibt nach gut einer Sekunde stehen, Mitspieler sprinten hin: Traube in 41 von 62 Toren (7er,
    vorher 13).
  - Einwurf mit Anlauf, Fußstellung beim Schuss, Standbein, Körpereinsatz im Zweikampf, flacher Hechtsprung mit
    Abrollen; Torwart fängt in Kopf-, Brust- oder Bodenhöhe, faustet ein- oder beidhändig, Abwurf und Abschlag mit
    Ausholen, macht sich im 1 gegen 1 breit, Abpraller nach Fehlgriff sichtbar.
  - Erschöpftes Gesicht, nasse Trikots bei Regen, Torwarthandschuhe in Signalfarbe mit Manschetten.
  - Aufwärmen am Rand: je ein Auswechselspieler pro Team (Trab, Dehnen, Hopserlauf, Hüftkreisen, Armkreisen), zuerst
    der angesagte Einwechsler. Zuschauer verlagern das Gewicht, folgen dem Ball, stehen bei Chancen auf und springen
    beim Tor ihrer Mannschaft. Draw Calls +4 auf Plätzen mit Bank, alle unter dem Budget. Offen: Beim Dehnen
    greift die Hand nicht sichtbar an den Fuß.
  - Vorfälle: Gewitter mit echtem Unterstand je Spielort (`src/sim/shelter.js`: Hauseingang mit Vordach, Vordach
    am Getränkemarkt, Pavillon, Bankdach, Bandenlücke und Tribünendach, im Stadion der Streifen vor der Bande);
    erst runter vom Feld, dann außen herum, keiner läuft durch Wand, Auto oder Bande (`tests/storm_shelter.test.js`).
    Polizei redet mit dem Trainer, Hund schlägt Haken, Taube sitzt auf der Latte, Zaun-Kletterer mit Helfern.
- **Mehr Animationen:** Jubel (mehrere Varianten, Rutschen auf Knien, Trikot über den Kopf), Ärger nach
  vergebener Chance, Einwurf mit Anlauf, Schiri-Gesten (Karte zeigen, Vorteil), Abklatschen bei Wechseln,
  Aufwärmen am Rand, Zuschauer mit mehr Bewegung.
- **Bessere Animationen:** weichere Übergänge zwischen Laufen, Schuss und Pass; Fußstellung passend zum Ball;
  sichtbarer Körpereinsatz in Zweikämpfen; Fallen und Aufstehen nach Grätsche und Foul.
- **Torhüter zuerst:** ✅ Hechtsprung in Phasen (Abdruck, Flugbogen flach/hoch nach Ballhöhe, Landung, gefangener
  Ball an der Brust, Aufstehen; `tests/keeperanim.test.js`). Offen: Hechtsprung mit Abrollen, Fangen in Brust- und Kopfhöhe, Abtauchen in die Ecke, Fausten
  mit beiden Fäusten, Abwurf und Abschlag mit Ausholen, Herauslaufen und Breitmachen im 1 gegen 1,
  Fehlgriff/Abpraller sichtbar.

- **Vorfälle auf dem Platz animieren:** ✅ Gewitter (alle sprinten mit den Händen über dem Kopf vom Platz, der
  Schiri auch – vorher lief wegen eines Fehlers niemand los), Polizei (Zeigefinger, verschränkte Arme, alle schauen
  hin), Hund mit Herrchen, neue Taube (gleitet ein, pickt, wird verscheucht, fliegt davon);
  `tests/incidents_scene.test.js`. Noch offen:
  - Gewitter: einer rutscht aus; der Schiri ist zuerst unterm Vordach.
  - Polizei: die Beamten reden mit dem Trainer.
  - Hund: Haken schlagen, Ball im Maul schütteln, Spieler hechten daneben.
  - Taube: sitzt auf der Latte und flattert beim Schuss auf.
  - Rasensprenger, Ball über den Zaun, Autoalarm, Ersatzschiri: Reaktionen der Spieler (wegrennen, schimpfen,
    auf den Zaun klettern, zum Auto zeigen).

### 11.2 Grafik und Aussehen der Spieler
- ✅ Grafik-Ausbau (Oktober 2026), ohne mehr Szenen-Durchgänge:
  - Rasen: Texeldichte passend zu den Bildschirmpixeln der niedrigsten Stufe (PC 18, Android 17 statt 12
    Texel/m; Großfeld 17 wegen der Obergrenze von 3,2 Mio. Texeln). Feiner wird es nicht, sonst flimmert der
    Boden beim Schwenk. Halme, Randgras mit Klee und Gänseblümchen, Mähmuster je Platz (nur Streifen oder Ringe: 7er
    Streifen, Sportplatz Ringe um den Anstoßpunkt, Großfeld breite Bahnen), Abnutzung im Mittelkorridor, Kreidelinien etwa 15 cm breit
    (vorher 25 cm). `tests/groundtexels.test.js`.
  - Ziehende Wolkenschatten im Post-Pass: bei Sonne locker, bei Hitze wenige, bei Regen, Nebel, Schnee und abends
    keine, schneller bei Wind. Aus auf ANDROID_LOW. Nebenbei behoben: Der leichte Dunst lag als grobes
    Punktraster über der hinteren Platzhälfte (6 statt 24 Stufen).
  - Figuren: Lichtkante auf der Sonnenseite (aus dem Sonnenstand, nur Figurenpixel), Falten im Trikot,
    Körperbau schmal bis kräftig (±10 %).
  - Platzrand: Eckfahnen auf allen Plätzen (vorher keine), Trainerbänke mit Plexiglashaube auf der Gegenseite,
    auf der Kameraseite nur Flaches (Getränkekisten, Taschen, Ballnetz, Hütchen).
  - Kosten (ANDROID_MEDIUM, gemessen im Browser ohne Grafikkarte): Draw Calls 93/97/100/67/73 → 98/103/106/69/72
    (Rasen, Sportplatz, Großfeld, Asche, Park), Dreiecke +6 %, Bodentextur Großfeld 12 statt 6 MB.
    Obergrenzen im e2e-Test „Grafik-Budget je Spielort“. Echte Bildraten auf dem Handy sind ungeprüft
    (kein Gerät hier).
- ✅ Figuren (Oktober 2026): sechs neue Frisuren (Dutt, Undercut, Afro, Pferdeschwanz, Vokuhila, kurze Locken),
  drei Bärte (Ziegenbart, Koteletten, breiter Schnauzer), Stutzen runter 22 %, Schweißband 12 %, Knöcheltape 9 %,
  Handtape 6 %, Sportbrille 4 % (nie beim Schiri). Höchstens 700 Dreiecke je Figur, auch beim Torwart
  (`tests/looks.test.js`). Etwa 29 % der vorhandenen Spieler bekommen dadurch eine andere Frisur oder einen anderen Bart.
- ✅ Wappen: Schriftband (Kürzel, Gründungsjahr oder beides), Meistersterne aus der Vereinsgeschichte, 8 neue Motive.
  Trikots: Muster diagonal, breit, Verlauf, Ärmel; Kragen (rund, V, Polo) und Ärmel in Zweitfarbe.
- Figuren mit mehr Varianten: Körperbau (schlank, kräftig, Bauch), Größe, Frisuren, Bärte, Stutzen runter,
  Schweißbänder, Brillen-Sportband, Tape am Knöchel.
- Gesichter mit mehr Ausdruck (Jubel, Ärger, Erschöpfung), Trikots mit Falten und nassem Stoff bei Regen.
- Licht und Schatten auf den Figuren verfeinern, Torwarthandschuhe und eigene Torwartkleidung im Detail.

### 11.3 Namen
- ✅ Erledigt: englische Namen (Auflage 5, Herkunft nach Zensus 2021), englische Vereine und Ligen, deutsche
  Auflage 6 mit 58 Vornamen und 60 Nachnamen mehr. Ursprünglich: **Mehr Namen:** heute 140 Vornamen, 140 Nachnamen, 11 Herkunftsgruppen und 89 Berufe – Ziel: deutlich mehr
  Vielfalt, damit sich Namen über viele Saisons nicht wiederholen.
- Alte Spielstände behalten ihre Namen (Namens-Edition wie bisher, siehe `NAME_EDITION`).

### 11.4 Sponsoren
- ✅ Erledigt: 60 Sponsoren (12 neue Betriebe, 8 größere Firmen erst ab Kreisklasse B bzw. Kreisliga A), alle mit
  englischem Namen. Ursprünglich: **Mehr Sponsoren:** heute 40 lokale Sponsoren mit Chef und Eigenart – Ziel: mehr Auswahl je Liga und
  Region, dazu englische Sponsoren für die englische Version (heute deutsche Namen wie „Bäckerei Krume").

- ✅ Trikot-Logos statt Anfangsbuchstaben: jeder Sponsor hat ein Branchenzeichen (Brezel, Lenkrad, Schere, Biene …)
  in Marken- und Akzentfarbe, dazu eine Schriftmarke aus den Wortlängen des Namens; fünf Anordnungen (links,
  mittig, Band, Fleck, nur Schrift), immer kontrastreich zum Trikot (`src/render/sponsorLogos.js`).

### 11.5 Ereignisse
- ✅ Oktober 2026: Chat-Zusagen 22 → 112 Varianten, Verspätungen, Wetter-Chat, Teamchat-Antworten, Kreisblatt-Zitate
  und Wiedersehen gestreckt; häufigster Text im Langzeitlauf 53 → 14-mal. 12 neue Saison-Ereignisse
  (`src/career/seasonevents.js`: Aufstiegsfeier, Abstiegskrise, Abschiedsspiel, Urlaub vor dem Finale, Firmenlauf,
  Platzsperre, Flutlicht defekt, Trainerschein, Kabine undicht, Schiri-Mangel, Hospitation, Lizenzpflicht) und ein
  eigenes Derby-Rückspiel; das häufigste Ereignis macht nur noch 13 % statt 25–27 % aus.
- ✅ Erledigt: 10 Ereignisse für höhere Ligen (`src/career/leagueevents.js`: Sportgericht, Spielverlegung,
  Kreispokal, Eintritt, erste Fans, Stadionsprecher, Videoanalyse, Testspiel gegen Profi-U23, Geld bis zur
  DFB-Amateurgrenze, Ordnerdienst); in der Bezirksliga 14 % der Wochenereignisse. Offen: die Chat-Zusagen
  wiederholen sich am meisten (rund 90-mal in 14 Saisons). Ursprünglich: **Mehr Ereignisse:** heute rund 80 Ereignisse mit Entscheidungen (Verein 14, Jugend 13, Vereinsleben 13,
  Leben 8, Persönliches 8, Sponsoren 7, Geschichten 7, Soziales 5, dazu Derby, Verletzungen, Abwerben,
  Sprüche). Ausbau vor allem dort, wo sich Texte im Langzeitlauf am häufigsten wiederholen
  (`npm run longrun -- 10 77 --bot` zeigt die meistwiederholten Texte), sowie neue Ereignisse für die
  höheren Ligen (Kreisliga A, Bezirksliga).

- ✅ Oktober 2026, Ausbau der Ereignisse: Messung `node scripts/events-audit.mjs 60 8` (Familien, Ligen, Saisonphasen) zeigte
  die dünnsten Stellen (Presse, Wetter, Schiri-Nachwuchs, Wechsel, Fans, Training, Gegner, Platzwart, Vereinsheim, Familie).
  20 neue Ereignisse in `src/career/localevents.js`, davon fünf Ketten mit Folge-Ereignis Wochen später (Reporter → Reportage,
  Leihe → Rückkehr, Fanclub → Fanbus, Platzwart-Ruhestand → Nachfolge, Wirt kündigt → neuer Wirt); je Saison höchstens einmal,
  Verspätungen laufen über `sitOut(…, 'late')`/`lateOr` (ab Stufe 4 kein „später"). Verschiedene Ereignisse im Messlauf 83 → 101.

### 11.6 Angriffs-KI: Spiel über außen (umgebaut, Oktober 2026)
Gemessen mit `scripts/wing-audit.mjs` (Eintritt ins letzte Drittel; „Mitte" = mittleres Drittel der Breite),
48 Spiele je Platz, vorher → nachher:
- 7er-Feld: Mitte 82 % → 68 %, Flanken 1,3 → 2,9 je Spiel, Tore 2,9 → 2,7
- 9er-Feld: Mitte 80 % → 67 %, Flanken 1,1 → 2,8, Tore 2,7 → 2,2 (weniger, aber bessere Schüsse)
- Großfeld: Mitte 85 % → 78 %, Flanken 0,5 → 1,7, Tore 4,0 → 3,1
Bezug: In der Bundesliga laufen rund 33 % der Angriffe durch die mittlere *Hälfte* der Breite (Bundesliga
Match Facts „Attacking Zones"), unser Maß ist strenger (mittleres Drittel).
Umgesetzt: Breite im Ballbesitz (Außen gehen auf 0,8 der halben Breite, an Mauern mit Abstand), außen bleiben bis
zum letzten Drittel, bei freiem Flügel bis zur Grundlinie, schräg weg, wenn die Mitte zu ist, Passwahl schaut sich
um (Blickrichtung zählt weniger, freier Mann außen zählt), Flanke statt Schuss aus spitzem Winkel, Läufe an den
ersten/langen Pfosten. Verworfen: Spitze weicht zur Seite aus (kostete fast ein Tor je Spiel und die Doppelpässe).
Nebenbei behoben: Rückpass beim Doppelpass fiel auf „nach vorn bolzen" zurück, wenn der Läufer zu dicht stand.
Flankenverwertung (zweiter Schritt): Läufe in den Strafraum beginnen früher (Ball außen ab 20 % der halben Länge
vor der Mitte) und werden gesprintet. Steht die Spitze nah am Ball, bleibt sie Anspielstation, und nur der ballferne
Außen läuft ein. Geflankt wird aus spitzem Winkel nur noch, wenn einer im Strafraum steht oder der Flankengeber
bedrängt ist. Die Flanke geht auf den Laufpunkt des Abnehmers, nicht auf seine jetzige Stelle. Kopfbälle aufs Tor
reichen jetzt bis knapp hinter den Elfmeterpunkt; vorher galten fest 8 m, auf dem Großfeld (Elfmeter 11 m) gab es
deshalb keine Kopfbälle aufs Tor. Verworfen: den Läufer stur auf seinen Punkt steuern, ohne Gegnern auszuweichen.
Das senkte die Schussquote aus guter Lage von 0,65 auf 0,55 (48 Spiele).
Tore je Spiel, 24 Spiele je Platz, Stand 96fa064 → jetzt: 7er 3,1 → 2,9 · 9er 2,7 → 2,7 · Großfeld 3,6 → 3,9.
Damit ist der Torverlust aus dem ersten Schritt (2,7 / 2,2 / 3,1) aufgeholt. Mitte jetzt 66 % / 67 % / 81 %,
Flanken 2,7 / 2,9 / 1,1, von außen in den Strafraum 0,9 / 1,2 / 0,1 je Spiel. Schussquote aus guter Lage 0,61.
Kopfbälle (dritter Schritt): Vergleichswerte zuerst. Premier League: 1 Tor auf 79–91 Flanken aus dem Spiel,
gut 20 % kommen an, Flanken aus dem Spiel bringen rund 15 % der Tore (Studie EPL 2011/12, asjp.cerist.dz; Premier
League 2024/25). Kopfballtore Bundesliga 2025/26: 15,4 %, der tiefste Wert seit 33 Jahren (sportschau.de).
Kopfbälle: 34 % aufs Tor, rund 11–12 % werden Tore (StatsBomb; WM 2026). Bei uns kamen schon 17–25 % der
Flanken beim Mitspieler an, und pro Flanke fielen mehr Tore als real. Was fehlte, waren Kopfballtore: 0 in 240
Spielen (Stand bdc0489).
Zwei Ursachen behoben:
- Der Abnehmer eines hohen Balls rechnete mit Rollreibung, obwohl der Ball fast ungebremst fliegt, und lief deshalb
  zu kurz. Jetzt läuft er zum Landepunkt, bei einer Flanke zum Punkt, an dem sie fallend in Kopfhöhe ankommt.
  Verworfen: Auch lange Bälle in Kopfhöhe abnehmen. Das kostete fast ein halbes Tor je Spiel.
- Ein Kopfball aufs Tor flog immer mit 4–8 m/s, und der Torwart hielt 14 von 22. Jetzt behält er das Tempo der Flanke,
  und der Kopf legt 1,5–4,5 m/s drauf (bis zu 4,5 m/s beim Sprung- oder Standkopfball, MDPI Appl. Sci. 14/946, 2024).
80 Spiele je Platz, bdc0489 → jetzt (7er / 9er / Großfeld):
- Tore je Spiel: 2,8 / 2,1 / 2,6 → 3,4 / 2,8 / 3,1
- Kopfbälle aufs Tor je Spiel: 0,17 / 0,25 / 0,16 → 0,16 / 0,45 / 0,07
- Kopfballtore: 0 / 0 / 0 % → 0 / 5 / 1 % der Tore
- Tore nach Flanke: 4 / 6 / 6 % → 2 / 12 / 3 %
- Schussquote aus guter Lage: 0,61 → 0,67; Doppelpass-Rückgaben: 48 → 54
Test: `tests/wing.test.js` (9er-Feld, Kopfbälle aufs Tor und Kopfballtore).
Flankenarten nach Feldgröße (vierter Schritt). Vorgabe aus der Praxis: Auf dem 7er-Feld kommen Flanken eher flach,
halbhoch aus dem Halbfeld, oder der Ball wird über die Abwehr gelupft. Hohe Flanken sind auf den größeren Feldern
häufiger. Belastbare Zahlen zum Anteil flacher und hoher Flanken habe ich nicht gefunden, darum entscheidet die Lage:
flach, wenn der Weg am Boden zum Laufpunkt frei ist (auf dem 7er überall, sonst nur nah der Grundlinie); halbhoch aus
dem Halbfeld und auf dem 7er-Feld; sonst hoch. Lupfer über die Abwehr gab es schon (Pass in die Tiefe, gelupft, wenn
zugestellt): 7er 1,3, 9er 3,0–3,3, Großfeld 2,8 je Spiel.
80 Spiele je Platz, Flanken je Spiel flach / halbhoch / hoch (Tore danach):
- 7er: vorher nur hoch 2,31 (6) → 0,69 (2) / 1,39 (6) / 0,45 (0); Tore 3,40 → 3,14 (im Rauschen, ±0,27)
- 9er: hoch 2,94 (27) → 0,10 (2) / 1,04 (9) / 1,71 (17); Tore 2,80 → 2,66
- Großfeld: hoch 1,26 (7) → 0,05 (1) / 0,15 (1) / 0,95 (3); Tore 3,09 → 3,19
Schussquote aus guter Lage 0,66, Doppelpass-Rückgaben 64. Test: `tests/wing.test.js` (Flankenart passt zum Feld).
Offen:
- Kopfballtore auf dem 7er-Feld und dem Großfeld bleiben selten (real 15 %). Auf dem Großfeld köpfen die Abnehmer
  meist mehr als 13 m vom Tor entfernt (17 Kopfbälle nach Flanken, 4 davon aufs Tor; 60 Spiele). Auf dem 7er-Feld
  kommen 49 von 112 gezielten Flanken nie in Kopfhöhe an den Abnehmer.
- Ecken sind selten (0,4–1,0 je Spiel), daher kaum Kopfballtore nach Standards.
- „Nach außen lenken" / „Zentrum zumachen": ein Versuch (Anlaufen von innen, schmaler Block) änderte die
  Angriffsseiten des Gegners kaum (68 % → 66–67 %) und kostete eigene Tore – zurückgenommen. Braucht ein echtes
  Leiten des Ballführenden (Körperstellung, Doppeln außen).

### 11.6a Gesamtprüfung der Match-Engine (Oktober 2026)
Messskript `scripts/match-audit.mjs <Platz> <ww|ws|ss|bp> [Spiele] [Wurzel]` (KI gegen KI, Seeds 900+i, der Stärkere wechselt die Seite).
Einwürfe je Spiel vorher → nachher (80 Spiele, Paarung schwach–schwach): Park 2,1 → 7,1 · Asche 2,1 → 8,6 · 7er 3,5 → 8,5 · 9er 2,5 → 7,5 ·
Großfeld 1,5 → 3,2. Ursache: Die Abwehr hatte keinen Befreiungsschlag (unter Druck ging der Ball an irgendeinen Mitspieler oder blind in die
Mitte); Ballführer und Anspielstationen liegen im Schnitt bei 0,29 der halben Breite, die Außenlinie wird kaum erreicht. Mit breiteren Außen
(STRETCH, Klemmen, Abstand der Anspielstationen) änderten sich die Einwürfe nicht (je 24–48 Spiele). Neu: Abwehr schlägt bedrängt im eigenen
Drittel den Ball schräg Richtung Seitenlinie (`CLEAR_ZONE`, `CLEAR_CHANCE`, gewählt). Schussquote aus guter Lage 0,63 → 0,62, Doppelpass-Rückgaben 50 → 51.
Tore aus Ecken (Eckenphase endet bei Abstoß/Einwurf oder Spiel des Gegners): Großfeld 17,5 %, 9er 7,4 %, 7er 5,6 % der Ecken; 90 % der
Kopfballtore auf dem Großfeld fallen nach Ecken, deshalb gehen Kopfballtore und Tore aus Ecken nur gemeinsam zurück. Ein Torwart, der Flanken im
Strafraum fängt, senkte Großfeld/9er/7er auf 11/6/5 % bei Kopfballtoren 5,0/4,2/1,6 % (vorher 8,8/6,9/3,0) – nicht übernommen, weil er die
Handregel (Hände nur im Torraum, tests/keeper.test.js) aufhebt. Torzuordnung: Lenkt der Torwart oder ein Verteidiger einen Schuss ins Netz (letzter
Schuss höchstens 3 s her), zählt das Tor für den Schützen; vorher waren 25–35 % der Tore auf dem Großfeld „Eigentore" (real rund 5 %).
Bundespokal neu kalibriert (400 Spiele je Zeile, Kader „mittel"): Aufschlag Zweitligist 0,28 → 0,23, Erstligist 0,26 → 0,19; Weiterkommen 4,8 % / 3,5 %.

### 11.7 Pokale (erledigt, Oktober 2026)
- **Kreispokal** ab der Kreisklasse C: 16 Vereine aus allen Kreisligen, vier K.-o.-Runden mittwochs vor dem
  Ligaspieltag. **Bezirkspokal** in der Bezirksliga oder für den Kreispokalsieger der Vorsaison ab Kreisliga A:
  8 Vereine, auch aus der Landesliga.
- Regeln wie in vielen Kreisen: Heimrecht für den Klassentieferen, gespielt im Format des Gastgebers,
  bei Unentschieden direkt Elfmeterschießen (manche Kreise spielen vorher Verlängerung).
- Eigene Spiele werden gespielt (selbst, Seitenlinie, Liveticker), die übrigen per schnellem Ergebnismodell,
  das an der Engine gemessen ist (`scripts/pokal-calibrate.mjs`). Heimspiele bringen Theke und kosten Schiri.
- Das Ereignis „Heimrecht verkaufen" hängt jetzt am echten Los und tauscht wirklich den Spielort.
- **Verlängerung** als Einstellung (Spiel → Unentschieden im Pokal): ein Drittel der Spielzeit (2 × 15 bei 2 × 45), in
  der Engine (`m.extra`) und im schnellen Modell (Torerwartung × 1/3); Standard bleibt direkt Elfmeterschießen.
- **Landespokal** (8 Vereine inkl. fiktiver Oberligisten) für den Bezirkspokalsieger der Vorsaison;
  **Bundespokal** (Name zentral: `BUND_NAME` in `src/career/bundespokal.js`) für den Landespokalsieger: sechs Samstagsrunden,
  jede gegen einen fiktiven Zweit- oder Erstligisten, Spielortwahl (eigener Platz / Stahlrohrtribüne / Stadion),
  Rundenprämie (verdoppelt sich je Runde) und Eintrittsteilung nach dem Vorbild des realen Pokals, Foto mit dem Star in der Vitrine.
- **Sponsorenprämien** des Trikotsponsors für Pokalsiege als Vielfaches seines Saisonziel-Bonus (`PRAEMIE`).
- ~~Offen: Gegner und Profis im Bundespokal nur bis zum Finale als Einzelspiele (kein vollständiges 64er-Feld).~~ Erledigt 2026-10-29.

### 11.8 Spielmechanik und Ballphysik feilen (vom Nutzer gewünscht, 2026-10-15)
Nach der Hallen-Torquote (stärkere Flachschüsse, Bandenpässe): Spielmechanik und Ballphysik auf **allen Plätzen**
durchgehen. Vorgehen wie bei 11.6a: erst messen (KI gegen KI, feste Seeds, je Platz), Befunde mit realen
Vergleichswerten und Quellen belegen, dann gezielt ändern; andere Plätze bleiben bei platzspezifischen
Änderungen bitgleich. Kandidaten (zu prüfen, nicht beschlossen): Ballrollen und Reibung je Untergrund, Abpraller
und Effet, Annahme und Ballmitnahme, Schusshärte und Flugkurven, Zweikämpfe und Laufwege.

### 11.9 Nächste Ausbaustufe (vom Nutzer festgelegt, 2026-10-19)
**Grundsatz: reines Managerspiel.** Die Funktion, Spieler selbst zu steuern, wird entfernt. Gespielt wird nur noch
als Trainer an der Seitenlinie (Zurufe, Taktik, Wechsel) oder im Liveticker. Umfang (Freundschaftsspiel,
Challenges, Elfmeterschießen, Tastatur-/Touch-Steuerung, Tests) vor dem Umbau festlegen.

*Umgesetzt (Branch `agent-manager`, 2026-10-19, „Nur Karriere“):* Hauptmenü nur Karriere/Spielstände/Einstellungen;
Freundschaftsspiel, Platzwahl, Challenges (samt Belohnungen), Spielerpool-Browser, Spielmodus-Schalter, Tastenbelegung,
Schwierigkeit und Auto-Wechsel entfernt; `Input` liefert nur noch Trainer-Tasten. Die Match-Engine (`src/sim/`) ist
unverändert (Golden bitgleich); Testspiele über die Debug-URLs laufen immer im Trainer-Modus.

**Spielertrainer bleibt** (vom Nutzer bestätigt, 2026-10-19): Die eigene Figur steht weiter im Kader (von der KI
gesteuert), mit Karriereende, Kindern und Nachfolge. **Neu:** beim Karrierestart wählbar „Spielertrainer" oder
„nur Trainer" (ohne eigene Spielerfigur; Kader-, Nachfolge- und Generationen-Logik müssen beide Fälle kennen).

**Nach dem Trainerposten** (vom Nutzer gewünscht, 2026-10-19): Geht die eigene Figur „in Rente" oder wechselt als
Spieler zu den Alten Herren, engagiert man den neuen Trainer selbst (Kandidaten mit Stil, Gehalt, Ruf; Gespräch)
und spielt weiter – wahlweise in einem Vereinsamt, z. B. als **Präsident** (Finanzen, Ausbau, Sponsoren,
Trainerwahl, Ziele vorgeben, Trainer entlassen) statt an der Seitenlinie. Baut auf `generations.js`/`staff.js`
und der Ämterbesetzung auf.

*Umgesetzt (Branch `agent-rolle`, 2026-10-19, Startmodus und Präsidium):* Beim Karrierestart wählbar „Spielertrainer“ oder „Nur Trainer“
(`coach.mode`, alte Spielstände = Spielertrainer; „Nur Trainer“: die Figur steht nie im Kader, kein Karriereende als Spieler).
Nach dem Traineramt (Rücktritt im Sommer oder „Zu den Alten Herren“ beim Schuhe-Entscheid) kann man in der Nachfolge „Trainer verpflichten –
du wirst Präsident“ wählen: drei erzeugte Bewerber (Aussehen, Alter, Stil, Gehalt, Ruf, Vorstellung), kurzes Gespräch mit Feilschen, dann
Präsidium (`src/career/president.js`, Tab „Präsidium“ im Verein): Trainer entlassen/verpflichten (Abfindung bzw. Handgeld, Spielwerte), Saisonziel
selbst setzen, Taktik/Aufstellung lesend; Spiele von der Tribüne, im Liveticker oder nur als Ergebnis. Die Nachfolge durch ein Kind bleibt
als anderer Weg. Haken für die Alten Herren: `coach.oldBoys` (das Team selbst fehlt noch).

**Neue Mannschaften**
- ~~**Frauenteam** wahlweise: im Spiel als Option gründen, wenn genug Geld vorhanden ist (Startkosten, Trikots,
  Trainerin, Platzzeiten), eigener Kader und eigene Liga; Mädchen aus der Jugend rücken auf.~~ – erledigt 2026-10-29
  (Nutzerentscheid: verwaltet und simuliert, ohne 3D-Spiele; `src/career/women.js`, Reiter Verein → Frauen): 16 Spielerinnen,
  Trainerin, eigene Liga mit acht Mannschaften (Kreisliga bis Verbandsliga, Auf- und Abstieg), Ergebnisse parallel zu den
  Herren, Schiri-Spesen der Frauen (Westfalen 2025/26). Offen: 3D-Spiele mit Spielerinnen-Modellen (Animation und Grafik).

**Offene Punkte aus 11.1–11.8 abarbeiten**
- ~~Großfeld: zu hohe Torquote je Schuss (20 % statt real 10–12 %)~~ – eingemessen 2026-10-28 (Torwart lenkt nicht mehr ins eigene
  Netz, Fernschüsse hält er; Großfeld 13 %, Rasen/Sportplatz 10 %). Kurze Spiele auf dem Großfeld haben dadurch weniger Tore
  (2,8 → 1,8, vom Nutzer so entschieden). Nahschüsse 2026-10-28 eingemessen (Strafraum: Großfeld 32 → 22 %, Sportplatz 21 → 16 %,
  Großfeld nun 1,5 Tore je kurzem Spiel; Kopfball zählt als Schuss, 15 % der Tore). Ecken 2026-10-29: Torwart fängt Flanken (KEEPER_CLAIM), enge Deckung, Kopfballduell – Eckentore Großfeld 15 → 9 %,
  Rasen 13 → 11 %, Sportplatz 12 %; dafür Kopfballtore Großfeld 15 → 5 % der Tore (vom Nutzer so entschieden). Offen: Eckentore
  noch über real 2,6–4,6 % (WM 2022 / Copa América 2021) – vor allem Abpraller und Nachschüsse im Strafraum.
- Futsal-Ball Größe 4 in der Halle (eigener Ballradius je Platz).
- „Nach außen lenken" mit echtem Leiten des Ballführenden. Vorlage: Steuerungsverhalten aus Yuka
  (https://github.com/Mugen87/yuka, MIT, z. B. Interpose/Offset-Pursuit) – nur das Prinzip in die eigene,
  deterministische Engine übernehmen, die Bibliothek nicht einbinden.
- KI-Trainerentscheidungen (wann wechseln, umstellen) weicher machen; Idee: Fuzzy-Logik wie in Yuka, ebenfalls
  nur als Vorlage.
- Später, falls ein großes Effektpaket kommt (Pyro, Feuerwerk beim Aufstieg, Konfetti): zuerst mit dem eigenen
  Effects-System; three.quarks (https://github.com/Alchemist0823/three.quarks, MIT) nur, wenn das nicht reicht.
- Torwart-Animationen (Abrollen, Fangen Brust/Kopf, Fausten beidhändig, Abschlag mit Ausholen, Breitmachen,
  sichtbarer Fehlgriff), Dehnen greift an den Fuß, Reaktionen bei Sprenger/Autoalarm/Zaun, Ausrutschen beim Gewitter.
- Chat-Zusagen wiederholen sich am häufigsten.
- ~~Bundespokal: vollständiges Teilnehmerfeld statt nur eigener Spiele.~~ Erledigt 2026-10-29: 64 Vereine (18 Erst-, 18 Zweitligisten,
  27 Amateure, eigener Verein), alle Paarungen je Runde (pokal.js playFieldRound), Sieger steht auch nach dem Ausscheiden fest.

### 11.10 Rückmeldungen und Wünsche (vom Nutzer, 2026-10-21)

**Turniere im Kalender**
- ~~Hallen-Cup und Stadtpokal nicht direkt vor einem Spieltag, sondern in eigenen Pausen~~ – erledigt 2026-10-29: Winterpause als
  eigene Woche ohne Ligaspiel (career.js winterBreakWeek); die Stadtmeisterschaft lag schon nach dem letzten Spieltag (Sommerpause).
  Offen: Das Sommerturnier liegt weiter in der Woche des ersten Spieltags (Vorbereitung als eigene Woche wäre der nächste Schritt).
- ~~Zwischen den Turnierspielen die Aufstellung ändern können (Rotation)~~ – erledigt 2026-10-29: eigene Turnier-Aufstellung
  (week.cupLineup), getrennt von der Liga.

**Ligen: Bundesland wählen, Pyramide nach oben**
- Recherche (Quelle: https://de.wikipedia.org/wiki/Fu%C3%9Fball-Ligasystem_in_Deutschland, abgerufen 2026-10-21):
  bundesweit Ebene 1–3 (Bundesliga 18, 2. Bundesliga 18, 3. Liga 20 Teams), Ebene 4 Regionalliga in 5 Staffeln
  (Nord, Nordost, West, Südwest, Bayern), Ebene 5 die Oberligen (u. a. Oberliga Niedersachsen, NOFV Nord/Süd,
  Westfalen, Niederrhein, Mittelrheinliga, Hessenliga, Rheinland-Pfalz/Saar, Baden-Württemberg, Bayernliga mit 2 Staffeln).
  Darunter regelt jeder der 21 Landesverbände selbst; Namen und Ebenen unterscheiden sich, z. B.
  - Bayern: Landesliga (5 Staffeln) → Bezirksliga (15) → Kreisliga → Kreisklasse …
  - Niedersachsen: Landesliga (4) → Bezirksliga (17) → Kreisliga → Kreisklassen
  - Hessen: Verbandsliga (3) → Gruppenliga (6) → Kreisoberliga → Kreisliga A–D
  - Westfalen: Westfalenliga (2) → Landesliga (4) → Bezirksliga → Kreisliga A–D
  - Sachsen: Sachsenliga → Sachsenklasse (3) → Kreisoberliga …; Thüringen: Thüringenliga → Landesklasse (3)
  - Nordrhein-Westfalen und Baden-Württemberg haben je drei Verbände, Rheinland-Pfalz zwei.
  Die unteren Ebenen (ab 8) stehen dort nur beispielhaft; je Verband vor dem Einbau bei der Verbandsseite prüfen.
- ~~Bundesland/Verband beim Start wählen, Ligennamen je Verband, regionale Vereinsnamen~~ – erledigt 2026-10-29 (verband.js): 21 Verbände
  in der Gründungsversammlung, Ligennamen nach der Spielklassen-Tabelle der englischen Wikipedia (Stufe 5 = 8. Liga), regionale
  Vereinsnamen mit typischen Endungen und erfundenen Kanal-Stämmen. Offen: Dialektfärbung bei Spitznamen und Ereignistexten.
- ~~Pyramide nach oben: Landesliga, Verbandsliga, Oberliga~~ – erledigt 2026-10-29: Stufe 6 = 7. Liga, 7 = 6. Liga, 8 = Oberliga
  (Namen je Verband nach der Quelle; Hamburg/Niederrhein mit Stufe 8 „Oberliga (Spitzenstaffel)“ als Spielvariante). Ab Stufe 6
  direkt im Landespokal. Belegt: Oberliga-Zuschauer (Ø 298–462, Oberliga Westfalen) und 5 € Eintritt in der Landesliga; Zuschauer,
  Kaderstärke, Kosten und Zuzug der Stufen 6–7 sind hergeleitet (gleichmäßig zwischen Bezirks- und Oberliga). Offen: echte
  Ligaschnitte für 6./7. Liga, Vertragsspieler ab Oberliga (Profi-Übergang), Regionalliga.
- Plan (ursprünglich): Beim Start Bundesland (bzw. Verband) wählen; die Ligennamen und die Zahl der Stufen kommen aus einer Tabelle je
  Verband. Heute gibt es 5 Stufen (Freizeitliga, Kreisklasse C, Kreisklasse B, Kreisliga A, Bezirksliga).
  Nach oben erweitern: Landesliga/Verbandsliga, Oberliga, Regionalliga, später Profibereich.
- Namen im Profibereich: keine geschützten Namen (DFB, DFL, „Bundesliga“-Marke) – wie beim Bundespokal eigene
  Bezeichnungen wählen. Verbandsnamen nur als Region (z. B. „Westfalen“), keine Verbandskürzel/-logos.
- ~~Auf- und Abstiege der CPU-Teams (heute steigt nur der eigene Verein)~~ – erledigt 2026-10-29 (pyramid.js): jede Liga mit eigener
  Vereinsliste, je Grenze ein Auf- und ein Absteiger; fremde Ligen per Schnellmodell. Offen: großes Portfolio an Vereinsnamen je Region.
- Vereinsnamen passend zum gewählten Bundesland (vom Nutzer gewünscht, 2026-10-21): regionale Ortsnamen-Muster und Endungen
  (z. B. -ing/-hofen in Bayern, -büttel/-stedt im Norden, -rode/-hagen in Niedersachsen/Hessen, -itz/-ow im Osten,
  -scheid/-rath im Rheinland), typische Vereinskürzel je Region (FC, SV, TSV, SpVgg, DJK, TuS, BSG, Eintracht, Rot-Weiß …),
  Dialektfärbung bei Spitznamen und Ereignistexten. Nur erfundene Orte und Vereine, keine echten Vereine nachbilden.

**Verein, Kader, Wirtschaft**
- ~~Tribünen ausbauen als eigenes Feature~~ (Stehstufen, Tribüne, Sitzplätze, Dach und Stadion mit Fassungsvermögen gab es schon,
  facilities.js). Vertieft 2026-10-31 (`src/career/attendance.js`): Zuschauerschnitt, Auslastung, Rekord, ausverkaufte Heimspiele,
  draußen Gebliebene und entgangener Eintritt (ab Bezirksliga), Hinweis auf den nächsten Ausbau, Saisonarchiv; Anzeige unter Verein →
  Tribünen, Meldungen im Kreisblatt. Offen: Aufpreis für Sitzplätze (keine belastbare Quelle für Preise unterhalb der Regionalliga
  gefunden), Ausbaustufen im 3D-Bild außer der Stahlrohrtribüne auf dem Großfeld.
- ~~Integriertes Scouting.~~ Erster Ausbau 2026-10-30 (`src/career/scouting.js`): Kenntnis fremder Spieler in vier Stufen (unbekannt,
  gesehen, beobachtet, gescoutet); der Transfermarkt zeigt die Stärke als Spanne (±12/7/3, Spielwerte), Klasse und Eigenschaften erst ab
  „beobachtet“, sortiert nach der Schätzung. Eigene Liga und Gegner nach dem Spiel „gesehen“; „Spiel anschauen“ (eine Aktion) deckt einen
  Verein auf, „Bolzplatz“ (eine Aktion) bringt zwei Vereinslose auf die Gerüchteküche. Offen: Scout als Ehrenamt (eine Beobachtung je
  Woche von selbst), Gegnerberichte mit derselben Kenntnis.
- ~~Training und Trainingspläne.~~ Erster Ausbau 2026-10-30 (`src/career/teamtraining.js`, Reiter Mannschaft → Training): Trainingstage je
  Woche (Liga-Norm 1–4 nach Quellen zum Trainingsumfang), Schwerpunkt (Ausgewogen, Kondition, Ball und Passspiel, Abschluss, Zweikampf und
  Abwehr), Extra-Torwarttraining. Wirkt auf die Entwicklung zum Saisonende (±12 % je Tag, Schwerpunkt verteilt den Zuwachs um) und kostet je
  Tag über der Norm jede Woche Familie und Kraft. Ohne eigenen Plan unverändert. Offen: einzelne Einheiten im Wochenverlauf, Trainingsbeteiligung.
- ~~Spielleitung (Schiedsrichter mit Gesicht und Eigenarten).~~ Erster Ausbau 2026-10-30 (`src/career/referees.js`): fester Schiri-Stamm
  je Ebene (Kreis, Bezirk, Verband) mit Name, Pixel-Gesicht, Art zu pfeifen und Eigenheit; das eigene Ligaspiel pfeift einer aus dem Stamm
  (gleiches Aussehen im 3D-Spiel), Bilanz und Karten mit dem eigenen Verein, Ansage auf der Spielkarte und im Mannschaftschat, Liste unter
  Verein. Offen: Schiri-Beschwerden mit Gedächtnis, Pokal- und Relegationsspiele, Assistenten als Figuren.
- ~~Mehr Rivalitäten.~~ Erster Ausbau 2026-10-30 (`src/career/rivals.js`): Rivalitäten wachsen aus Spitzen- und Kellerduellen der
  zweiten Saisonhälfte, Rudelbildung, Wechseln zum Gegner und knapp verlorenem Titelrennen; Punkte mit Gründen, ab „Rivale“ Derby-Charakter
  (hitziger gepfiffen, mehr Zuschauer, Ergebnis wirkt stärker auf die Stimmung), Abkühlen im Sommer, bleibt beim Auf- und Abstieg erhalten.
  Schwellen gemessen (6 Karrieren × 5 Saisons: ab Saison 2 meist 1–2 Rivalen-Spiele je Saison). Offen: Retortenclub mit reichem Sponsor,
  Relegationsgegner, Rivalitäten der Fans (Tiger).
- Finanzsystem anpassen und erweitern; Sponsoring erweitern; Ausstattungsvertrag (Ausrüster). Erledigt 2026-10-29: Schiri-Spesen
  nach der Verbandstabelle (Westfalen 2025/26), Stadionausbau (2500 Plätze) ab Landesliga. Ausrüster erledigt (outfitter.js). Offen:
  Vertragsspieler ab Oberliga (Quellen bisher nur Foren/FAQ: 200–1500 € im Monat; gehört zum Profi-Übergang), Fahrtkosten der
  Schiris, Ausrüster-Logo auf dem Trikot (Grafik).
- ~~Abschlussfahrt und Trainingslager: Preise nach Teilnehmerzahl, Liga und Professionalität staffeln~~ – erledigt 2026-10-29
  (travel.js): echte Preise je Person, Spieler zahlen selbst, der Verein gibt einen Zuschuss (0–100 %), Mitfahrer nach
  Eigenanteil; Trainingslager unten Baggersee, ab Bezirksliga Sportschule, ab Oberliga Belek.
- ~~Maximale Spielerzahl pro Liga anzeigen und anpassbar machen~~ – erledigt 2026-10-29: Kadergrenze im Kader-Reiter, −/+ je
  Karriere, Standards aller Ligen aufklappbar.
- ~~Heim-, Auswärts- und Ausweichtrikot (bei Farbgleichheit automatisch).~~ Erledigt 2026-10-28 (`awayKitOf`, `kitChoice`,
  `resolveKitClash` in career.js; Editor mit Heim/Auswärts, Torwart hebt sich von allen Trikots ab).
- ~~Trainerauszeichnung (Trainer des Monats/der Saison)~~ – erledigt 2026-10-29 (coachawards.js).
- Mehr Sponsoren, mehr Spielernamen, mehr Nationalitäten. Erledigt 2026-10-29: Namensauflage 8 mit Ukraine, Rumänien, Kosovo,
  Afghanistan, Bulgarien, Iran, Vietnam (BAMF-Migrationsbericht 2024, Tabelle 7-2), deutscher Anteil wie bisher; regionale Namen
  (regionalnames.js). Mehr Sponsoren erledigt 2026-10-31: 12 größere Firmen der Region ab Bezirksliga/Landesliga/Verbandsliga
  (72 insgesamt), Rückensponsor ab Bezirksliga, Hosensponsor ab Verbandsliga, Trikotbrust ab Bezirksliga nur für größere Firmen.
  Offen: Herkunftsmischung je Bundesland, Sponsoren-Namen je Bundesland.

**Kleinkram aus der Prüfung 11.9**
- ~~Tim „Der Tiger“ im Hinterhof-Fenster: Clipping~~ – erledigt 2026-10-29: 0,5 m vor der Wand auf einem Kissen (gemessen: ab
  0,45 m bleiben alle Gesten vor dem Glas), Kissen über den Köpfen der Spieler; Clipping-Test in tests/tigerfigure.test.js.
- ~~Der Namensgenerator kann zufällig echte Profinamen erzeugen~~ – erledigt 2026-10-29 (pronames.js): Sperrliste aus Wikipedia
  (alle deutschen Nationalspieler, England ab 10 Länderspielen, aktuelle Kader Polen/Türkei), Ersatz-Nachname ohne Zufallsstrom.
  Offen: Vereinsspieler ohne Länderspiel. Dazu regionale Vor- und Nachnamen je Bundesland (regionalnames.js); Ältere bekommen
  nur zeitlose Vornamen (Einschätzung, keine Quelle für ältere Jahrgänge gefunden).
- ~~Pixel-Porträt der Trainerbewerber altert nicht~~ – erledigt 2026-10-29: Aussehen wie bei den Spielern (grau ab 40), und alle
  werden mit den Jahren grau (origins.js agedLook). Offen: Glatze/Bauch mit dem Alter (keine Quelle).

### 11.11 Weitere Wünsche (vom Nutzer, 2026-10-22)
- **Übersichtlichkeit:** Lange Menüs (z. B. Verein: Kasse, Ausbau, Platz, Fest, Präsidium; Mannschaft) in Unterseiten bzw.
  aufklappbare Bereiche gliedern. Zuerst messen, welche Seiten auf dem Handy am längsten sind. Erster Schritt 2026-10-31: gemessen
  (Handy 360 × 780, Spielstand Mitte 3. Saison): Verein 11,7 Bildschirmhöhen, Jugend 5,4, Kasse 3,3, alles andere ≤ 2. Der Reiter
  Verein hat jetzt Unterseiten (Du, Anlage, Vereinsleben, Trikot, Wappen; längste 3,5), die Ausbaugruppen sind aufklappbar.
  Danach Jugend (A-Jugend und Jugendteams getrennt: 2,1) und Kasse (Strafenkatalog und Kassenbuch aufklappbar: 2,7).
  Jetzt ist keine Seite länger als 3,5 Bildschirmhöhen (Trikot-Editor).
- **Hinterhof neu (vom Nutzer ausdrücklich gewünschte andere Kameraperspektive):** Blick wie aus dem 1. oder 2. Stock des
  Hauses auf den Hof – steiler von oben, von der Hauswandseite, ggf. Fensterbrett/Rahmen im Vordergrund. Nur der Hinterhof.
- ~~**Jugendspielerinnen → Frauenteam:**~~ erledigt 2026-10-29 (women.js `addFromYouth`). Bisher: Heute erhöhen Mädchen mit 16 nur einen abstrakten Stärkewert (`saga.frauen`), ohne
  Frauenteam verschwinden sie. Mit dem echten Frauenteam (11.9) als echte Spielerinnen in dessen Kader übernehmen.
- **Übergang Amateur → Profi (Vorschlag, Entscheidung später):** schrittweise ab Oberliga (erste Vertragsspieler),
  Regionalliga (Lizenzauflagen: Stadion, Flutlicht, Finanznachweis), Profibereich (hauptamtlich).
  - Neu: Arzt/Physio (Verletzungsdauer, Belastung), Athletiktrainer, Scouting-Abteilung, Pressesprecher, Merchandise
    (Fanshop, Trikotverkauf), TV- und Ticketeinnahmen, Spielerberater, Verträge mit Laufzeit, Ablöse, Lizenzprüfung.
  - Wandelt sich: Kneipe → VIP-/Sponsorenbereich (Stammkneipe bleibt als Fan-Treff), Ehrenämter → bezahlte Stellen,
    Chat/Absagen → feste Trainingszeiten, Kreisblatt → Lokalzeitung/TV.
  - Fällt weg: Absagen wegen Arbeit, Platzpflege durch Helfer, Ehrenamtsgeschichten, Vereinsfest als Geldquelle.
  - Mit der Zeit dazu (vom Nutzer, 2026-10-22): zweite Mannschaft (U23) und U19 als eigene Teams mit eigener Liga;
    Durchlässigkeit Jugend → U19 → U23 → Profikader, Einsätze von Profis in der U23 (Spielpraxis nach Verletzung).
- ~~**Systemwechsel im laufenden Spiel**~~ – erledigt 2026-10-29: im Taktik-Blatt an der Seitenlinie und im Liveticker
  (plan.js setSystem). Jeder bekommt den nächstgelegenen Platz der neuen Formation, die Spieler laufen ihre Positionen an.

### 11.12 Kneipe und Vereinsheim in 3D (vom Nutzer gewünscht, 2026-10-28)
- ✅ Erster Ausbau 2026-10-30 (`src/render/pub/PubView.js`, `src/ui/clubhouse/pub.js`): Die Stammkneipe ist ein 3D-Raum im Pixel-Stil,
  gerendert vom selben Renderer wie der Platz (kein zweiter WebGL-Kontext), solange der Kneipen-Reiter offen ist. Theke mit dem Wirt
  (angestellter Wirt mit seinem Aussehen, sonst Kalle), Flaschenregal, Stammtisch mit Opa Heinz und Spielern, zwei an der Dartscheibe
  (Wurf, Pfeile bleiben stecken), Barhocker, Lampen, Wimpelkette und Schals in den Vereinsfarben, Vereinsname über der Theke,
  Meisterwimpel aus der Vereinsgeschichte. Leute trinken, gestikulieren, reihum eine Sprechblase. Antippen einer Person (Marker,
  44 px) öffnet ihre Sache darunter: Wirt → Runde und Neuigkeiten, Opa Heinz → Stammtisch und Bierdeckel-Taktik, Dartscheibe → Duell,
  Spieler → Einzelgespräch mit Dossier und Traum. Liste aller Ansprechpartner als Alternative; die klassische Ansicht zeigt nur Liste
  und Inhalte. Hochkant (vom Nutzer gewünscht): näher ran, seitlich wischen, die Kamera fährt zur gewählten Person.
  Kosten: 39 Draw Calls, 6 Tsd. Dreiecke (Halle 61 / 32 Tsd.). Licht 2026-11-05 (Nutzerbefund „Raum ohne Licht“): eigener Look ohne
  Spielwetter und Nebel, warme Punktlichter über der Theke, leuchtende Lampen; dazu Abendspiele heller und der Parkplatz-Asphalt
  heller, abends eine Nuance dunkler. Offen: Vereinsheim („Heute“) als 3D-Raum, Prosten
  als gemeinsame Geste, Wimpel/Flaggen nach Erfolgen im Pokal.
- Kneipe bzw. Vereinsheim als begehbarer 3D-Raum im Stil des Spiels (Pixel-Shader, Low-Poly-Figuren wie auf dem Platz),
  statt der heutigen Kneipen-Seite. Heute: Vereinsheim-Szene als gezeichneter Raum (`src/ui/ClubScene.js`), Kneipe als
  Menü (`src/career/pub.js`).
- Figuren: eigene Spieler an der Theke und am Stammtisch, der Wirt hinter der Theke – immer die angestellte Person
  (`c.staff.wirt`, Aussehen wie ihr Porträt; ohne Anstellung der Standard-Wirt).
- Leben im Raum: Leute reden (Gesten, Sprechblasen), trinken, prosten sich zu; zwei spielen Darts an der Dartscheibe
  (Wurf-Animation, Pfeile bleiben stecken); Fanschals, Vereinsflaggen und Wimpel an Wänden und Decke, passend zu den
  Vereinsfarben und Erfolgen.
- Bedienung über die Figuren: Jede Kneipenfunktion (Runde ausgeben, Gespräch, Dossier, Träume unterstützen, Gerüchte,
  Taktik am Stammtisch …) öffnet man durch Antippen der passenden Person oder des Gegenstands – keine zusätzliche
  Menüebene; die heutigen Funktionen bleiben dieselben.
- Technik: eigene kleine Szene mit dem vorhandenen Renderer; Budget für Draw Calls und Handy-Leistung wie bei den Plätzen
  prüfen; Touch-Ziele groß genug; Barrierefreiheit: Liste der anklickbaren Figuren als Alternative.

### 11.13 Mehr Leben im Chat und rund um den Verein (vom Nutzer gewünscht, 2026-10-29)
- Mehr Ereignisse im Chat und mehr verschiedene Nachrichten, damit er lebendiger wird. Heute wiederholen sich vor allem die
  Zusagen (siehe 11.9 „Chat-Zusagen wiederholen sich“).
- Mehr Ereignisse rund um den Verein (Ort, Nachbarn, Gemeinde, Sponsoren, Fans, andere Vereine) und mehr Unerwartetes: Dinge,
  mit denen man nicht rechnet, auch ohne Entscheidung, einfach als Farbe im Vereinsleben.
- Vor dem Einbau: zählen, welche Nachrichten wie oft kommen (über viele Saisons), damit die neuen die Lücken füllen statt die
  Häufigen noch häufiger zu machen.
- Erster Ausbau 2026-10-31: gezählt (6 Karrieren × 4 Saisons, 264 Wochen): 17 Nachrichten je Woche, 733 Vorlagen; am häufigsten
  die Torjäger-Warnung (118, fast jede zweite Woche), die Spielansage (2 × 117) und die Rudelbildung (rund 60). Torjäger-Warnung nur
  noch, wenn er seit der letzten Warnung getroffen hat (3 Varianten), Spielansage 5 Varianten, Rudelbildung 3 Varianten. Neu
  `src/career/chatlife.js`: jede Woche eine, manchmal zwei Nachrichten aus Ort, Gemeinde, Nachbarschaft, Sponsoren, Fans,
  anderen Vereinen, Wetter, Saisonphase und Unerwartetem (36 Vorlagen, dieselbe frühestens nach 16 Wochen). Danach 799 Vorlagen,
  keine einzelne mehr über 62. Offen: Banter-Lob (die drei häufigsten Sprüche), Wechselmeldungen, mehr Vorlagen für höhere Ligen.

- **Familie und Energie nach Liga** (vom Nutzer entschieden 2026-10-31, `personal.js`, `coachload.js`): ab Bezirksliga springt
  der Co-Trainer ein (wenn besetzt), ab Verbandsliga dauert Familienkrise/Burnout eine statt zwei Wochen; roter Bereich (< 25):
  Energie kostet eine Aktion je Woche, Familie den günstigeren Sonntag. Gemessen vorher (6 Karrieren × 4 Saisons, Trainer
  trainiert selbst): Energie in rund 28 % der Wochen rot, etwa ein Burnout in vier Saisons, Familie nie rot. Grenzen und Schwelle
  sind Spielwerte (keine Quelle zum Zeitaufwand der Trainer oben gefunden). Vorstand und Erfolgsdruck ✅ 2026-11-05
  ([docs/KONZEPT-VORSTAND.md](docs/KONZEPT-VORSTAND.md)): Rückhalt je Liga, Warnung, Ultimatum, Entlassung mit Angeboten anderer
  Vereine, als Präsident Misstrauensantrag der Mitglieder (nur neue Karrieren).

### 11.14 Spielerstärke und Entwicklung über alle Ligen (vom Nutzer gewünscht, 2026-10-29)
- Konzept: [docs/KONZEPT-SPIELERSTAERKE.md](docs/KONZEPT-SPIELERSTAERKE.md). Eine absolute Leistungsskala in Elo-Einheiten. Die
  Profiligen sind belegt (Bundesliga 1977, 2. Liga 1722, 3. Liga 1518, Regionalliga 1265, im Mittel 237 je Stufe). Die
  Amateurstufen sind mit 237 je Stufe hergeleitet.
- Gemessen: Heute liegen die Amateurstufen nur 1–6 Stärkepunkte auseinander, realistisch wären bei der heutigen Engine 13–17. Die
  Profis stoßen an die Wert-Obergrenze (Erst- und Zweitligist nur 1,2 Punkte auseinander).
- Empfehlung: Engine steiler (≈ 7,7 Stärkepunkte je Liga), Entwicklung mit verborgenem Potenzial und Trainingsumfang je Liga.
  Entscheidungen des Nutzers (2026-10-29) stehen im Konzept, Abschnitt 10: Stärke 1–99 über alle Ligen plus verdeckte Boni
  (Weltklasse, Führungsspieler, Star der Liga), nur neue Karrieren, unten kleinere Abstände (Spielwert), Anzeige „Stärke · Niveau“.
  Voraussetzung für die Profiligen.

- **Umsetzung 2026-10-31** (Konzept Abschnitt 12): Engine für Werte über 1, Fehler gegen den Gegner, Niveau je Spieler (Freizeitliga
  bis Oberliga), Vereine/Zugänge/Pokal nach Niveau, Schnellmodell und Profis neu geeicht – für neue Karrieren eingeschaltet.
- ✅ **Erledigt 2026-11-04/05** (alles nur für neue Karrieren, Golden unverändert):
  - Anzeige „Stärke · Niveau“ auf Spielerkarte, Gerüchteküche, Transfermarkt und beim Trainer (`b291b95`).
  - Entwicklung in Stärkepunkten je Liga: oben mehr Punkte, weil ein Punkt dort weniger bewirkt (`9e9e67c`).
  - Verborgenes Talent je Spieler, die Einschätzung auf der Karte wird mit der Zeit genauer (Konzept 12.6, `17a01a9`).
  - Zu tiefe Liga (Konzept 12.7, `25f57a8`): Wer über dem Niveau seiner Liga steht, lernt weniger dazu (je Liga ×0,8, höchstens
    halb). Die Karte zeigt „über seiner Liga“, Vereine der Liga darüber werben ab, manche wollen selbst wechseln.
  - Eigene Jugend (Konzept 12.8, `8de7757`): Das Akademietalent der Kinder verschiebt das Spielertalent (nur Tendenz). Jugendleben:
    Abiklausuren, Ausbildung, erste Liebe, andere Interessen, Führerschein, Heimweh im Internat, Gastfamilien ab der Verbandsliga.
  - Unruhe in der Kabine (Konzept 12.8): Schlechte Laune steckt an, Grüppchen, Mannschaftsrat, vergiftetes Klima. Streik nur
    einzeln (Nutzerklarstellung): Wer einen Wechsel verweigert bekommt, streikt manchmal, um ihn zu erzwingen.
- ✅ Verdeckte Boni 2026-11-05 (Konzept 12.9): Weltklasse, Führungsspieler (Stufe über Anführer), Star der Liga (relativ zur Liga),
  mit der Zeit entdeckt; Wirkung im Spiel gemessen.
- ✅ Regionalliga und 3. Liga spielbar 2026-11-05 ([docs/KONZEPT-PROFILIGEN.md](docs/KONZEPT-PROFILIGEN.md), nur neue Karrieren):
  Regionalliga-Staffel nach Verband, 3. Liga als oberste Stufe (Meister verzichtet, keine 2. Liga), Spielerverträge mit Gehalt
  und Laufzeit, Ablöse, Zulassung (Stadion, Flutlicht, Finanznachweis), Aufstiegsverzicht eigener und fremder Vereine.
  Offen: Ticketschnitt der 3. Liga, Lizenzgebühren.
- ✅ 2. Liga und 1. Liga 2026-11-05 (Konzept Profiligen 6): Vereine, Finanzen nach DFL-Wirtschaftsreport, Zulassung nach DFL.

### 11.15 Physik-Engine für Effekte prüfen (vom Nutzer vorgeschlagen, 2026-10-29)
- [Jolt Physics](https://github.com/jrouwe/JoltPhysics) (C++, im Browser über den WebAssembly-Port JoltPhysics.js) prüfen – **nur für
  die Darstellung**, nicht für die Spielsimulation. Die Ballphysik ist eingemessen, und der Golden-Test sichert, dass jedes Spiel aus
  dem Seed gleich abläuft; die Spieler sind gesteuerte Figuren, keine freien Körper.
- Mögliche Einsätze (Animation und Grafik): Ragdoll beim Hinfallen nach Fouls, Ball im Netz (Netz beult aus), Gegenstände in der
  3D-Kneipe (11.12).
- Vor dem Einbau messen: Größe der App (zusätzliches WebAssembly-Modul), Rechenzeit und Draw Calls auf dem Handy (Budgets wie in
  scripts/e2e/modes.mjs); Simulation und Golden dürfen sich nicht ändern.

### 11.16 Retro-Trikots (vom Nutzer gewünscht, 2026-10-29)
- ~~Legendäre Trikotdesigns als einfärbbare Muster, Trikot-Editor übersichtlicher~~ – erledigt 2026-10-29: 14 Retro-Muster mit
  dritter Farbe (kitPaint.js RETRO_MODELS, Vorbilder aus Trikot-Ranglisten und Sammlerseiten), Editor in Abschnitten mit
  Vorschaukacheln. Ohne Vereinsnamen im Muster, ohne Wappen, Sponsoren, Hersteller. Offen: Ligue 1 / La Liga (Quellen nennen
  PSG auswärts 96/97 und Barcelona auswärts 95–97, aber ohne Musterbeschreibung).

### 11.17 Nächste Schritte (vom Nutzer festgelegt, 2026-11-05)
Reihenfolge nach Nutzerentscheid: zuerst 2. und 1. Liga, dann „so weiter wie vorgeschlagen“.
Reihenfolge ab 2026-11-06 (Nutzerentscheid): Tutorial ausliefern, dann **Hinterhof-Blick** (11.11), dann ein **großer Bugsuch-Test**
(lange Karrieren über alle Ligen, alte Spielstände, Oberfläche auf allen Größen, Balance-Stichprobe), danach **Punkt 7** (Taktik
im Spiel umschalten) und **Punkt 5** (Trainerteam).
1. **2. Liga und 1. Liga** (Stufen 11 und 12): echte Aufstiege aus der 3. Liga, Lizenz nach DFL (Stadion, Rasenheizung, Flutlicht),
   Gehälter, Fernsehgeld und Vermarktung nach dem DFL-Wirtschaftsreport. ✅ erledigt 2026-11-05.
2. **Vereinswechsel im Sommer und ligaübergreifend:** Anfragen von oben für erfolgreiche Trainer, nach einer Entlassung auch von unten.
   ✅ erledigt 2026-11-06 (clubchange.js summerOffers/moveTo, pressure.js lowerOffers): Platz 1–3 bekommt Anfragen aus der Liga
   darüber (Meister zwei, sonst eine; Spielwerte), wirksam zur neuen Saison. Entlassen im Sommer: dazu ein Verein von unten.
   Offen: Anfragen von unten nach einer Entlassung mitten in der Saison (die Liga darunter hat dann keinen Spielplan).
3. **Eintrittspreise selbst festlegen, Dauerkarten:** Stehplatz und Sitzplatz einstellbar, Zuschauer und Kasse reagieren.
   ✅ erledigt 2026-11-06 (tickets.js): ab der Bezirksliga, 50–200 % des Ligapreises, Sitzplätze ab dem Drittliga-Stadion
   (Sitzplatz = 1,8 × Stehplatz, hergeleitet), Nachfrage-Elastizität 0,5 darunter / 1,5 darüber (Spielwerte), Dauerkarten mit
   Anteil 1./2. Liga 55/57 % (Quelle), darunter Spielwerte, 20 % Rabatt (Spielwert). Offen: Logen/Business-Plätze, Preisprotest der Fans.
4. **Zweite Mannschaft und U19 als eigene Teams** (ab der Regionalliga).
   ✅ Zweite Mannschaft erledigt 2026-11-07 (reserve.js, Mannschaft → Teams): eigene Liga (16 Teams, Schnellmodell), Start in der
   Kreisklasse C, höchstens eine Liga unter der Ersten, Zweite eines Drittligisten nicht in der Regionalliga (DFB, „Wo dürfen zweite
   Mannschaften spielen?“); Spielpraxis für Nicht-Eingesetzte und A-Jugendliche ab 18; Kosten, Gegnerstärke, Wirkung Spielwerte.
   ✅ U19 als eigenes Team erledigt 2026-11-08 (u19.js, Mannschaft → Teams): Modus nach der U19-DFB-Nachwuchsliga (dfb.de):
   mit Leistungszentrum Vorrunde (8er-Gruppe, 14 Spieltage), dann Meisterrunde (Erste und Zweite, 6er-Gruppe, 10 Spieltage, die
   besten vier in die Endrunde, K.-o. mit Verlängerung 2 × 15 und Elfmeterschießen) oder Hauptrunde (8er-Gruppe, 14 Spieltage,
   obere Hälfte bleibt qualifiziert); ohne Leistungszentrum Verbandsliga (10 Teams, Spielwert), Herbstmeister direkt in die
   Hauptrunde. Gegnerstärken, Kosten und Entwicklungsbonus (+8 bis +18 % ab fünf Einsätzen) sind Spielwerte.
5. **Trainerteam ab der Regionalliga:** Torwart-, Athletiktrainer, Physio mit Gehalt und Wirkung.
   ✅ erledigt 2026-11-07 (coachteam.js, Mannschaft → Training): je Aufgabe zwei Bewerber pro Saison; Gehalt Regionalliga bis zur
   Minijob-Grenze 603 € (DRV 2026), 3. Liga nach Medianen (Athletiktrainer 36 400 €/Jahr StepStone, Physio 3452 €/Monat Entgeltatlas;
   Torwarttrainer hergeleitet wie Athletiktrainer), 2./1. Liga Spielwerte; Wirkung Spielwerte (Torhüter bis +20 % Entwicklung,
   Verletzungen bis −10 %, Ausfallzeit bis −15 %). Offen: Trainerteam der CPU-Vereine, Co-Trainer als bezahlte Stelle in den Profiligen.
6. **Stadionbau sichtbar machen:** Drittliga-Stadion und Arena wachsen in 3D.
   ✅ erledigt 2026-11-07 (render/venues/stands.js, facilities.js standStage): auf dem eigenen Großfeld je Stufe mehr Ränge
   (Stehwälle → Haupttribüne mit Gästeblock → Kurvendächer und Rang auf der Kameraseite → Sitzschalen → zweiter Rang), Sitze in
   Vereinsfarben, Stadionname der Namensrechte; kurzes Eröffnungsbild bei Heimspielen. Im Grafik-Budget (Großarena gemessen
   111 Draw Calls / 48,5 Tsd. Dreiecke, ANDROID_MEDIUM, volle Menge). Behoben: Stahlrohrtribüne der Sitzplätze fehlte im Ligaspiel.
   Offen: Umfeld (Parkplatz, Fanshop, Vorplatz) und Trainingsplätze in 3D; Ausbau auf kleineren Plätzen als dem Großfeld.
7. **Taktikvorlagen im Spiel umschalten** (z. B. „ab Minute 70 mauern“).
   ✅ erledigt 2026-11-07 (sim/switches.js, tacticpresets.js): Vorlagen im Taktik-Blatt per Tipp ausspielen; bis zu zwei Regeln
   „ab Minute X, bei Spielstand Y → Vorlage Z“ (Minuten 30–85 auf 90 gerechnet, Anzahl Spielwert), greifen auch im Ticker und im
   simulierten Spiel; im Spiel streichbar. Ohne Regeln unverändert (Golden). Offen: Regeln für Rote Karten oder Unterzahl.
8. **Gegner-Scouting vor dem Spiel:** Stärken, Lieblingsstil, gefährlichster Spieler; Genauigkeit nach eigenem Scouting.
   ✅ erledigt 2026-11-07 (career/opponentscout.js, Heute-Karte „Gegner-Check“): Form, Tabellenplatz, Teamstärke als Spanne,
   Spielweise, ab Stufe 2 System, Stärken und Schwäche, gefährlichster Spieler. Genauigkeit = gerundetes Mittel der Kenntnis
   (scouting.js) über die besten elf, Tipp vom Wirt +1; „Gegner beobachten“ kostet eine Wochenaktion. Nur Anzeige, keine Wirkung
   auf das Spiel (Golden unverändert). Stufen und Spannen: Spielwerte. Offen: Bericht auch vor Pokalspielen.
9. **Wetter mit spürbarerer Wirkung** (tiefer Platz, Wind) – nur mit Messung wie beim Bonus-Audit.
   ✅ erledigt 2026-11-07 (weather.js deepGround, ball.js WIND_ACCEL, scripts/weather-audit.mjs): Messung vorher (200 Spiele je
   Wetter, Rasenplatz, gleiche Seeds): Regen, Wind und Nebel ohne messbare Wirkung, nur Hitze (Restkraft −22 %) und Schnee.
   Neu: tiefer Platz bei Regen Oktober–März auf Rasen, Wiese, Asche (Rollwiderstand ×1,6 Spielwert; Laufkosten ×1,15 HERGELEITET
   aus Lejeune et al. 1998, Sand 1,2–1,6-fach) mit Hinweis auf der Spielkarte; Wind auf hohe Bälle HERGELEITET ≈ 3,8 m/s² bei
   Sturmböen um 60 km/h (vorher halb so stark). Messung nachher: tiefer Platz Tore 3,44 → 3,02, Restkraft 0,526 → 0,483;
   Wind Schüsse 31,9 → 30,5, Kopfbälle 12,5 → 11,6. Golden unverändert (ohne Wetter). Offen: Nebel nur Optik (Sichtweite der KI).
10. **Englische Namensliste erweitern.**
    ✅ erledigt 2026-11-07 (data/origins_en10.js, Namensauflage 10): rund 90 britische Nachnamen mehr (dazu walisische,
    schottische und nordenglische), je Jahrgang 30–40 Vornamen mehr nach den ONS-Vornamenlisten, alle Herkunftsgruppen größer.
    Gewichte nach Zensus 2021 unverändert; keine echten Fußballer (notPro). Neue englische Karrieren nutzen Auflage 10, alte
    behalten 5.
11. ✅ **Saisonrückblick als teilbare Seite** (2026-11-07): Neben „Als Bild teilen“ erzeugt „Als Seite teilen“ eine
    eigenständige HTML-Datei (src/ui/reviewpage.js, kein Skript, kein Netz, helles und dunkles Farbschema) mit Wappen,
    Höhepunkten, Abschlusstabelle, allen Ligaspielen und Kaderzahlen (Einsätze, Tore, Vorlagen, Notenschnitt). Das
    Sonderheft im Archiv speichert diese Abschnitte jetzt mit; ältere Sonderhefte lassen sich ohne sie teilen.
12. ✅ **Erfolge und Meilensteine** (2026-11-07): 19 Erfolge (src/career/achievements.js) – 11 aus dem eigenen Ligaspiel,
    4 am Saisonende, 4 aus der Karriere. Anzeige im Vereinsmuseum, jeder neue einmal im Kreisblatt; alte Spielstände bekommen
    Meister und Aufstieg still aus der Chronik. Alle Schwellen sind Spielwerte; kein Zufall, Spielablauf unverändert.
    **Regelwerks-Abgleich** (vom Nutzer beauftragt, 2026-11-07; Grundlage DFB-Spielordnung Stand 28.11.2025, IFAB 2025/26):
    - Geändert: Tabelle bei Punktgleichheit nach § 46 Nr. 1.3 (Tordifferenz, Tore, direkter Vergleich, Auswärtstore im direkten
      Vergleich, alle Auswärtstore; core/standings.js), Pokal-Heimrecht nach § 46 Nr. 2.1.1 (Amateur gegen Profi immer zu Hause,
      Profis in Runde 1/2 gegen Amateure, Finale neutral), WM/EM-Gruppen zuerst direkter Vergleich (FIFA 2026, UEFA EURO 2024).
      Kein Landespokal mehr für Zweit- und Erstligisten (2026-11-08; sie stehen direkt im überregionalen Pokal, § 46 Nr. 2.1).
    - Geprüft, passt: fünf Gelbe = ein Spiel, danach neu zählen, Gelb im Platzverweis-Spiel verfällt (§ 43); Gelb-Rot = ein Spiel;
      Verlängerung 2 × 15 min (hier ein Drittel der Spielzeit) und Elfmeterschießen; fünf Wechsel, Profis in drei Gelegenheiten;
      Wechselperioden; Torwart hält nie länger als 8 s (IFAB Regel 12 seit 1.7.2025); kein Abseits nach Einwurf, Abstoß, Ecke;
      A-Junioren 17/18 im Kalenderjahr des Saisonbeginns, in der Zweiten ab 18 (vereinfacht).
    - Offen: höchstens neun Ersatzspieler auf dem Spielbericht in der 1./2. Liga (DFL seit 2019/20, nur Sekundärquelle);
      Gelb-Rot sperrt auch für das nächste Spiel der Zweiten (§ 11 Nr. 3); Zeitstrafen unterhalb der Oberliga (Landesverbände);
      Gruppenregeln der übrigen Kontinentalturniere prüfen.
13. **Internationaler Wettbewerb** (vom Nutzer gewünscht, 2026-11-05) ✅ **2026-11-08** (europa.js, europadata.js,
    tests/europa.test.js, e2e „euro“). Nutzerentscheide: echtes Format, drei Wettbewerbe, echte Prämien, zwei Abende je Woche.
    - Drei erfundene Wettbewerbe (Namen nur in europadata.js), 74 erfundene Vereine aus 22 echten Ländern mit erfundenen Orten.
      Startplätze: 1. Liga Platz 1–2 oberster, 3 zweiter, 4 dritter Wettbewerb (direkt in die Ligaphase, ohne Qualifikation).
    - Format wie seit 2024/25: Ligaphase 36 Vereine, vier Töpfe nach Stärke, je Topf ein Heim- und ein Auswärtsgegner, kein
      Gegner aus dem eigenen Land; Platz 1–8 Achtelfinale, 9–24 Play-offs (feste Paare 9/10–23/24 …), K.-o. mit Hin- und
      Rückspiel (Rückspiel beim Gesetzten), Verlängerung und Elfmeterschießen, Endspiel neutral. Tabelle: Punkte, Tordifferenz,
      Tore, Auswärtstore, Siege, Auswärtssiege, dann Stärke (statt Gegnerpunkten, Fair Play, Koeffizient).
    - Kalender: 17 Termine, dienstags und donnerstags 21 Uhr, erste Woche nur donnerstags, nicht in der Winterpause,
      Endspiel am Donnerstag der letzten Woche. Erholung über die 72-Stunden-Regel (pokal.js midweekGap).
    - Prämien laut UEFA-Rundschreiben 32/2025 (Startgeld, Sieg/Remis, Platzierungsanteile, Zuschläge 1–8/9–16, Runden, Sieger).
    - Spielwerte: Stärke der Teilnehmer (oberster 188 ± 7, zweiter 178 ± 6, dritter 170 ± 6), Länderklassen.
    - Offen: „value pillar“ und Umverteilung nicht gezahlter Remis-Prämien, Supercup, Qualifikationsrunden, Startplatz für den
      Pokalsieger, Klubkoeffizient für die Töpfe, eigene Stadien/Atmosphäre der Gegner in 3D, Fernsehgeld-Effekt auf Sponsoren.
14. **Turniere der Nationalmannschaften** (vom Nutzer gewünscht, 2026-11-05; Entwurf [docs/KONZEPT-NATIONALTEAMS.md](docs/KONZEPT-NATIONALTEAMS.md)):
    Weltmeisterschaft, Europameisterschaft und alle Kontinentalmeisterschaften (Afrika, Asien, Südamerika, Nord- und
    Mittelamerika, Ozeanien) im Hintergrund simuliert. Eigene Spieler werden nach Herkunft und Stärke nominiert, fehlen bei
    Winterturnieren (Afrika, Asien) einige Spieltage und kommen mit einem Turnier-Schub auf den Marktwert zurück.
    ✅ erste Fassung 2026-11-06 (nationalteams.js): Nominierung nur aus den Profiligen, Spiele der eigenen Spieler im Stadion in 3D,
    neutrale Namen. Qualifikation Variante 1 (2026-11-06): beim Turnierstart im Schnellmodell, Gruppen je Verband wie in echt.
    Offen: Stimmung, ausländische Schiris, Spiel um Platz drei (Konzept Abschnitt 11).
    **Qualifikation Variante 2** (vom Nutzer auf die Roadmap gesetzt, 2026-11-06): über die Saison verteilt in Länderspielfenstern
    zwischen bestimmten Spieltagen (die Liga ruht, kein Ligaspiel fällt aus). Spiele eines Landes mit eigenen Spielern als Karte im
    Vereinsheim (im Stadion ansehen, nur Ergebnis, vorspulen), Gruppentabelle einsehbar, Einsätze zählen wenig für den Marktwert,
    etwas Müdigkeit und Verletzungsrisiko. Gastgeber automatisch dabei. Vorher recherchieren: Formate je Verband, Play-offs,
    Länderspielfenster; Zahl der Fenster im gestauchten Spielkalender als Spielwert mit dem Nutzer abstimmen.
    ✅ **Variante 2 gebaut 2026-11-08** („mach einfach weiter“, natquali.js): drei Fenster wie im Kalender des Weltverbands 2026–2030
    (Sep./Okt. bis 4 Spiele, Nov. 2, März 2; Juni nach der Saison), im gestauchten Kalender vor dem ersten Spieltag im Oktober bzw.
    November und vor dem zweiten Spieltag nach der Winterpause (Spielwert). Gruppen mit Doppelrunde, Wintermeisterschaften nur mit
    den Herbstfenstern. Gastgeber wo bekannt (WM 2030 alle sechs, WM 2034, EM 2028 mit zwei reservierten Plätzen, EM 2032, Afrika
    2027, Asien 2027). Eigene Spieler: Karte im Vereinsheim (ansehen/Ergebnis/vorspulen, Gruppentabelle), Müdigkeit je Spiel
    (höchstens 15 %), Verletzungsrisiko wie im Ligaspiel, Marktwert ein Viertel der Turnierwerte (Spielwerte). 
    ✅ **Echte Play-offs 2026-11-08** („Weiter“, natplayoffs.js): WM Europa wie 2026 (Pfade mit Halbfinale und Finale in einem
    Spiel; Nations-League-Plätze an die besten Dritten, Spielwert), EM wie 2028 (je nach Gastgeberplätzen 2–3 Pfade oder 4 Duelle
    mit Hin- und Rückspiel), interkontinentale Play-offs der WM wie 2026 (6 Teams, 2 gesetzt; Asien 8 und Nord-/Mittelamerika 6
    feste Plätze). Im März-Fenster, ohne genug Termine beim Turnierstart.
    ✅ **Nationenliga 2026-11-08** („Weiter“, natleague.js): Format der Nations League 2026/27 (Ligaphase im Herbst der Saisons ohne
    europäische Qualifikation, Viertelfinale und Play-off A/B im März mit Hin- und Rückspiel, Endrunde beim Saisonende, Auf- und
    Abstieg). Gruppensieger in den Play-offs der nächsten Qualifikation wie echt (statt der besten Dritten). Spielwerte: 37 Länder →
    Liga A 16, B 12, C Rest (Dreiergruppen, B/C direkter Tausch); erste Ausgabe nach Stärke. Offen: Reform ab 2028/29 (Einzelheiten
    fehlen noch).
    ✅ **Über zwei Saisons 2026-11-09** („Weiter“, natquali.js TWO_SEASON): europäische Qualifikation wie die EM-Quali 2028 – März der
    Saison davor (nur Gruppen ohne Viertelfinalisten der Nationenliga), Juni beim Saisonende, Herbst und Play-offs in der Turniersaison.
    Offen: andere Verbände über zwei Saisons (in echt
    dauert die Qualifikation teils länger), eigene Ausscheidungen der Verbände für die interkontinentalen Play-offs (hier der
    Nächstbeste).
    ✅ **Abstellungsgebühren 2026-11-08** (Nutzer: „binde es so ein“): Europäischer Verband 3659 € je Spieler und Spiel (Quali und
    Nationenliga), Weltverband 2362 je Spieler und Spiel (WM-Quali), EM-Entschädigung je Tag nach Kategorie (10 187 € / 6791 €
    Spielwert / 3395 €), WM weiter 5000 je Tag.
15. **Nationaltrainer werden** (später): Anfragen von Verbänden ab gutem Ruf, Neben- oder Hauptamt, eigener Kader aus allen
    Spielern des Landes, Turnierspiele in 3D.
16. **Vereinsgelände ausbauen** (vom Nutzer gewünscht, 2026-11-06). **Erste Lieferung gebaut 2026-11-06** (Nutzerentscheid: alle sechs
    Bereiche, je drei Stufen; Wirkung spürbar, nicht Pflicht, voll ausgebaut etwa 10–20 % je Bereich; NLZ ab der 2. Liga Pflicht wie
    in echt, § 3 Nr. 2 Lizenzordnung): Trainingsgelände (Athletikecke, Halle, Trainingszentrum → Entwicklung), Teamgebäude (Kraftraum,
    Regeneration, Videoraum → Erholung, Verletzungen, Scouting), Medizin (Behandlungsraum, Physio, medizinische Abteilung →
    Ausfallzeit, Verletzungen), Geschäftsstelle (Büro, Geschäftsstelle, Marketing → Sponsoren, Zuschauer), Jugend (Jugendhaus,
    Schulkooperation, Internat, NLZ → Talente, Entwicklung), Stadionumfeld (Parkplatz, Fanshop, Vorplatz → Zuschauer, Einnahmen);
    facilities.js, tests/gelaende.test.js. Offen: Sichtbarkeit in 3D, Stadion-Erweiterung in mehr Stufen, Mehrzweckhalle, Fan-Treff,
    Wohnheim; Wirkungen nach Rückmeldung nachjustieren. Bisher gibt es vier Ausbau-Gruppen (Vereinsheim, Sportplatz,
    Tribünen, Gastro; facilities.js). Neu dazu, je mit Kosten, Bauzeit, Unterhalt und spürbarer Wirkung im Spiel:
    - **Stadion:** Ausbau und Erweiterung in Stufen (auch in 3D sichtbar, siehe Punkt 6), dazu das **Umfeld**: Parkplätze,
      Anbindung, Fanshop, Vorplatz, Flutlicht- und Rasentechnik.
    - **Trainingsplätze:** zusätzliche Plätze (Rasen, Kunstrasen, Halle), Torwart- und Athletikbereich – wirken auf
      Trainingsplan, Entwicklung und Platzschonung (Platzsperre, Verschleiß).
    - **Teamgebäude:** Kabinen, Kraftraum, Regeneration (Sauna, Eisbecken), Videoraum – wirken auf Fitness, Erholung und Taktik.
    - **Medizinische Abteilung:** Behandlungsraum, Physio, Ärzte – kürzere Ausfallzeiten und weniger Verletzungen (mit
      Trainerteam, Punkt 5).
    - **Management/Geschäftsstelle:** Büros, Scouting-Abteilung, Marketing, Ticketing – wirken auf Sponsoren, Scouting,
      Zuschauer und Kosten.
    - **Jugendgebäude:** Nachwuchsleistungszentrum mit Internat und Schulkooperation – besserer Jahrgang, mehr Talente, weniger
      Abwanderung (mit Akademie und NLZ, academy.js / nlz.js).
    - **und weitere:** z. B. Mehrzweckhalle, Fan-Treff, Museum (es gibt museum.js), Wohnheim.
    Je Stufe Voraussetzungen nach Liga (unten Ehrenamt und Eigenleistung, oben Profi-Standard). Vorher recherchieren: Kosten
    echter Bauten (Trainingszentrum, NLZ, Funktionsgebäude) und belegbare Wirkungen; Wirkungen ohne Quelle sind Spielwerte und
    werden mit dem Nutzer abgestimmt. Messung wie beim Bonus-Audit, damit kein Ausbau Pflicht oder wirkungslos ist.
