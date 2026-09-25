# Sunday League – Game Design, Featureliste & Roadmap

> Arbeitstitel: **Sunday League** (Alternativen: *Kreisklasse*, *Asche & Ehre*, *Dritte Halbzeit*)
> Status: Phase 0 (Prototyp) · Stand: 2026-09-25

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
- [ ] Grätschen & Fouls
- [ ] CI (Tests + Build bei jedem Push)
- [ ] Entscheidung Kernfrage: Wie viel Action vs. Management (siehe Offene Fragen)

**Meilenstein M0:** „Es fühlt sich gut an, auf dem Parkplatz gegen einen Ball zu treten.“

### Phase 1 – Core Match / Vertical Slice (ca. 6–8 Wochen)
- [ ] 5v5-Match auf dem Parkplatz, komplette Steuerung
- [ ] Basis-KI (Positionsspiel, Pressing, Torwart)
- [ ] Attribute (Tempo, Ausdauer, Technik, Passen, Schuss, Zweikampf, Übersicht)
- [ ] Amateur-Physik: Fehlerquote abhängig von Attributen & Müdigkeit
- [ ] Erste 5 Traits funktionsfähig
- [ ] Minimal-UI: Anstoß, Spielstand, Halbzeit, Ende

**Meilenstein M1:** Spielbare Vertical Slice – ein Match von Anfang bis Ende, das Spaß macht.

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

## 7. Offene Fragen / Entscheidungen

1. **Spielgefühl**: Actionfußball (selbst steuern, à la *Sensible Soccer* / *Rematch*),
   reine Manager-Sim (à la *Football Manager*) oder Hybrid (Management + spielbare Matches
   mit Option „simulieren“)? → Empfehlung: **Hybrid**.
2. **Kamera**: Klassische Seitenansicht, isometrisch/schräg von oben oder dynamisch?
3. **Plattformen**: PC (Steam) zuerst? Konsole/Switch? Mobile?
4. ~~**Engine**~~ → three.js (entschieden)
5. **Ton**: Eher warmherzig-humorvoll (*Ted Lasso*) oder trocken-realistisch?
6. **Setting**: Fiktive deutsche Region, oder bewusst international/„generisch europäisch“?
7. **Repo**: Eigenes Repository für das Spiel anlegen (empfohlen) statt Unterordner hier.
