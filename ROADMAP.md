# Sunday League – Game Design, Featureliste & Roadmap

> Arbeitstitel: **Sunday League** (Alternativen: *Kreisklasse*, *Asche & Ehre*, *Dritte Halbzeit*)
> Status: Karriere-Minimalversion spielbar · Stand: 2026-09-25

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
| **Couch-Koop / Versus** | 2–4 Spieler lokal, gemeinsam ein Team oder gegeneinander. |
| **Online-Freizeitliga** (Post-Launch) | Asynchrone Ligen mit Freunden, jeder managt einen Verein, Spiele werden simuliert oder live gespielt. |

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
- [x] Pixelschrift im Projekt statt Google Fonts
- [ ] Minimal-UI: Halbzeit, Endstand-Screen

**Meilenstein M1:** Spielbare Vertical Slice – ein Match von Anfang bis Ende, das Spaß macht.

### Phase 1b – Spielorte (erledigt)
- [x] Venue-System: Simulationsdaten (Größe, Format, Untergrund, Begrenzung, Torart) + Szenenaufbau je Platz
- [x] Hinterhof (4v4, Beton, Wände, Garagentor), Parkplatz, Stadtpark (Linien ohne Kreide), Ascheplatz (echte Tore)
- [x] Zuschauer aus dem Spielergenerator (Oma am Fenster, Hundebesitzer, Bankdrücker)
- [x] Platzwahl-Menü mit KI-Vorschau im Hintergrund

### Phase 2 – Team & Kader (ca. 4–6 Wochen)
- [ ] 11v11 auf Rasen/Asche, Formationen & Taktik-Grundeinstellungen
- [ ] Prozeduraler Spielergenerator (Aussehen, Name, Beruf, Traits)
- [ ] Kaderverwaltung, Aufstellung, Einwechslungen
- [ ] Teamchemie-Grundsystem
- [ ] Match-Simulation (ungespielte Partien) auf Basis derselben Engine

**Meilenstein M2:** Eigene Mannschaft zusammenstellen und gegen generierte Gegner spielen.

### Phase 3 – Saison & Liga (ca. 4–6 Wochen)
- [ ] Spielplan, Tabelle, Auf- und Abstieg über mehrere Ligen
- [ ] Wochenrhythmus: Training → Chatgruppe → Spieltag → Dritte Halbzeit
- [ ] „Wer kann Sonntag?“-Chat mit Zu-/Absagen
- [ ] Verletzungen, Karten, Sperren
- [ ] Speichern/Laden

**Meilenstein M3:** Eine komplette Saison spielbar – der Kern-Loop steht.

### Phase 4 – Verein & Wirtschaft (ca. 4–6 Wochen)
- [ ] Vereinsfinanzen, Sponsoren mit Zielen
- [ ] Trikot- und Wappen-Editor (saisonweise)
- [ ] Vereinsheim- und Platzausbau
- [ ] Zuschauer- und Fansystem

**Meilenstein M4:** Der Verein wächst sichtbar über mehrere Saisons.

### Phase 5 – Transfers, Scouting & Nachwuchs (ca. 4–6 Wochen)
- [ ] Transfersystem mit Überzeugungsgesprächen und Nicht-Geld-Deals
- [ ] Open Training als Minispiel-Sammlung
- [ ] Bolzplatz-Scouting
- [ ] Jugendabteilung & Nachwuchsspieler
- [ ] Verborgene Traits & Entdeckung

**Meilenstein M5:** Rohdiamanten finden, formen und in die erste Elf bringen.

### Phase 6 – Leben, Story & Atmosphäre (ca. 4–6 Wochen)
- [ ] Alltags-Eventsystem (Jobs, Familie, Samstagabend-Faktor)
- [ ] Dritte-Halbzeit-Szenen & Beziehungsnetz
- [ ] Kreisblatt/Lokalzeitung, Vereins-Social-Media
- [ ] Rivalitäten & Derbys, Kreispokal
- [ ] Schiedsrichter-Persönlichkeiten

**Meilenstein M6:** Das Spiel erzählt eigene Geschichten.

### Phase 7 – Content & Polish (ca. 6–8 Wochen)
- [ ] Alle Spielstätten (Park bis Amateurstadion), Wetter & Tageszeiten
- [ ] Challenges, Turniere (Halle, Sommerfest), Bolzplatz-Modus
- [ ] Audio-Atmosphäre, Musik, Stadionsprecher
- [ ] Balancing, Tutorial/Onboarding, Lokalisierung (DE/EN)
- [ ] Performance, Controller-Support, Barrierefreiheit

**Meilenstein M7:** Content-complete Beta → Early Access

### Phase 8 – Post-Launch
- [ ] Couch-Koop & lokales Versus
- [ ] Online-Freizeitliga mit Freunden
- [ ] Einzelspieler-Karriere
- [ ] Editoren & Modding-Support (Spieler-/Liga-Packs)
- [ ] Saisonale Events (Winterpause, Hallenmasters, Sommerfest)

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
| 9 | **Einstellungen** | Tasten frei belegen, Lautstärke, Spielgeschwindigkeit, farbenblind-sichere Trikots. |
| 10 | **Mehrsprachigkeit** | Alle Texte sind gerade fest auf Deutsch – i18n-Gerüst mit DE/EN. |
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

- **Geister-Spiele**: Das Team eines Freundes als Gegner, wahlweise simuliert oder selbst gespielt.
- **Asynchrone Freundes-Liga**: jede Woche ein Spieltag, alle Partien simuliert, das eigene Spiel optional live.
- **Trikot- und Wappen-Codes** zum Teilen, Steam Workshop für Liga- und Namenspakete.
- **Achievements** mit Augenzwinkern: „Luftloch-König“, „Asche im Knie ×3“, „Ans Auto – 5× in einem Spiel“.

### 8.5 Technik

- **Simulation im Web Worker** für schnelle Hintergrund-Simulation ganzer Spieltage.
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
