# ADVANCED FOOTBALL SYSTEM – Ergänzung 02: Advanced Football Intelligence (AFI)

Stand: 2026-11-25. Gehört zusammen mit `docs/ADVANCED-FOOTBALL-SYSTEM-00-ENGINE-AUDIT.md` (Auftrag 00) zu **einem** System:
Analytics liefert Kennzahlen mit Herkunft, AFI deutet sie und leitet Entscheidungen ab. **Nichts implementiert** – Architektur,
Datenflüsse, Machbarkeit und Roadmap zur Freigabe.

Grundsätze aus Auftrag 00, die hier verbindlich weitergelten: Herkunftskennzeichnung (MEASURED … UNAVAILABLE), keine gesetzten
Gewichte in Indizes, Mindeststichproben, nur messen, was die Engine simuliert, Mitschrift ändert das Spiel nicht.

---

## 1. Was heute schon Entscheidungen trifft (Bestandsaufnahme)

| System | Datei | Entscheidet | Datenbasis heute | Bezug zu AFI |
|---|---|---|---|---|
| **Lageerkennung** | `sim/situations.js` | erkennt 12 Lagen je Team, jede Sekunde (`stepSituations`): `OPP_FLANK, OUR_SIDE_WORKS, SPACE_BEHIND, PRESS_BYPASSED, PRESS_TIRING, STRIKER_ISOLATED, SECOND_BALLS, OPP_DEEP_BLOCK, UNDER_PRESSURE, OPP_TIRING, WE_TIRING, ENDGAME` – mit `severity`, `confidence`, `evidence`, `options` (Befehle) | Spielprotokoll `matchlog.js` (gleitendes Fenster) | **ist bereits die Live-Diagnose von AFI**; beide Teams gleich behandelt |
| **KI-Trainer im Spiel** | `sim/aicoach.js` | wählt aus den `options` der stärksten Lage einen Befehl, je Persona (Stratege, Alte Schule, Großmaul, Kumpeltyp) mit `react`, `like`, `avoid`; höchstens 4 Änderungen; eigener Zufall `m.coachRng` | Lagen | Kern für Phase 8 (während des Spiels) |
| **Co-Trainer-Karten (Mensch)** | `sim/coachfeed.js` | wann eine Karte mit drei Möglichkeiten erscheint; höchstens drei Karten je Halbzeit; prüft nach, ob die Entscheidung gewirkt hat | Lagen | Vorbild für Manager-Beratung (Phase 12): selten, konkret, mit Wirkungskontrolle |
| **Wechselhinweise** | `sim/subadvice.js` | wer jetzt passt (frisch, schnell, sicher, Knipser) | Profile, Kraft, Befehle | Spieler-Eignung im Spiel |
| **Gegner-Handschrift** | `career/patterns.js`, `career/opponents.js coachOf` | CPU-Trainer laufen mit festen Mustern auf (pressing, lang, mauern, konter) je Trainertyp; Gegenmittel nur, wo gemessen hilfreich | Trainertyp | Grundlage der Philosophien (Abschnitt 6) |
| **Gegner-Scouting** | `career/opponentscout.js`, `career/scouting.js` | was man über den Gegner weiß (Kenntnis 0–3 je Spieler) | Form, Tabelle, Kenntnis | Vor-dem-Spiel-Analyse (Phase 8) |
| **Aufstellung CPU** | `career/career.js buildLineup/teamForMatch`, `tacticOf` | Startelf nach Verfügbarkeit und Stärke; Taktik = Vereinsstil + Muster | Werte, Verfügbarkeit | Rollenwahl (Phase 8) |
| **CPU-Transfers** | `career/transfers.js cpuTransfers:477` | **zufällig gewichtet**: Zielverein nach Stärke, Spieler zufällig aus Rang 3+ des abgebenden Vereins | Stärke (`rating`) | wird in Phase 10 ersetzt |
| **Abwerben** | `career/poaching.js` | wer dem Menschen Spieler abwirbt | Spielzeit, Laune, Stärke | Phase 10 |
| **Entwicklung/Training** | `career/development.js`, `career/teamtraining.js FOCUS` | Zuwachs je Saison nach Entwicklungstyp, Liga, Trainingsschwerpunkt (ausgewogen, Kondition, Ball, Abschluss, Zweikampf) | Werte | Phase 11 |
| **Nachanalyse** | `sim/report.js`, `sim/trace.js` | Spielbericht in Sätzen, Kausalkette je Tor | Protokoll | Text-Vorlagen und Erklärlogik für AFI |

**Folgerung:** AFI ist kein Neubau. Die Live-Ebene (Lage → Option → Persona → Befehl → Wirkungskontrolle) existiert und ist
gemessen. Es fehlt die **Ebene über das einzelne Spiel hinaus**: Profile von Spielern, Teams und Trainern über viele Spiele,
und Entscheider außerhalb des Spiels (Vorbereitung, Kader, Transfer, Training, Beratung), die diese Profile nutzen.

---

## 2. Architektur

```
Match Engine (sim/*, unverändert)            ── deterministisch, Seed
      │  Ereignisse, Protokoll (matchlog.js)
      ▼
ANALYTICS  (Auftrag 00, Phase 1–4)
  a) Live-Kennzahlen je Spiel           → situations.js (vorhanden), neue Kennzahlen gleiche Form
  b) Spielzusammenfassung beim Abpfiff  → kompakt, mit Herkunft und n
  c) Profile (Spieler/Team/Trainer)     → Saison-Aggregate mit Schrumpfung (Abschnitt 4.1)
      │  nur lesen
      ▼
AFI-KERN  (neu: src/intel/)
  diagnose(profile, kontext)   → Befunde  { typ, team|spieler, stärke, sicherheit, belege, herkunft }
  options(befund)              → Handlungsoptionen aus einem festen Katalog (Taktik, Rolle, Position, Jugend, Training, Transfer)
  rank(options, philosophie, ressourcen) → geordnete Optionen mit Begründung
      │
      ├── KI-Trainer: vor dem Spiel (Matchplan), im Spiel (aicoach.js, vorhanden), nach dem Spiel (Notiz fürs nächste Spiel)
      ├── Smart Scouting & Tactical Fit Score
      ├── Transfer-KI (ersetzt cpuTransfers-Zufall)
      ├── Spielerentwicklung (Trainingsschwerpunkte)
      ├── Manager-Beratung (Text aus Vorlagen, gedrosselt)
      └── Liga Intelligence (Ranglisten, Trainerprofile)
```

**Regeln der Architektur**
- **Lose Kopplung:** Der AFI-Kern kennt nur Profile und Befunde, nicht die Engine. Entscheider rufen `diagnose → options → rank` auf
  und wenden das Ergebnis mit den vorhandenen Funktionen an (`setOrder`, `setClubPlan`, `buildLineup`, Transferfunktionen).
- **Eine Diagnose für alle:** Mensch-Beratung und CPU-Trainer bekommen **dieselben Befunde** (wie heute `situations.js`: „kein
  Bonus, keine Abkürzung“). Unterschiede nur über Philosophie und Kenntnis (Scouting-Stufe).
- **Deterministisch:** jeder Entscheider hat einen eigenen Zufallsstrom aus `hashSeed(seed, saison, runde, verein, zweck)`
  (wie `cpuTransfers`), nie `m.rng`. Gleicher Spielstand → gleiche Entscheidungen.
- **Keine Doppelberechnung:** Profile werden einmal je Spieltag fortgeschrieben (in `recordResult`), alle Entscheider lesen sie.
- **Nachvollziehbar:** Jede Entscheidung speichert ihre Begründung kurz (`{ befund, option, philosophie, belege }`) – für
  Kreisblatt, Beratung und Tests.
- **Ohne Sprach-KI:** Texte aus Vorlagen je Befund und Option (wie `coachfeed.js TEXTS`, `report.js`).

---

## 3. Datenflüsse

| Von | Nach | Was | Wann | Größe |
|---|---|---|---|---|
| Engine | Protokoll (`m.log`) | Ereignisse, Ballbesitz, Pässe, Schüsse (+ Phase-1-Erweiterungen) | jeder Schritt / Ereignis | 150–260 KB, flüchtig |
| Protokoll | Lageerkennung | Fensterwerte | 1×/s | flüchtig |
| Protokoll | **Spielzusammenfassung** | Kennzahlen je Team und Spieler mit `n` und Herkunft | Abpfiff (`recordResult`) | Ziel: ≤ 1 KB je Spiel (Team) + ≤ 60 B je Spieler |
| Zusammenfassung | **Profile** | gleitende Saisonwerte (Summen + n), letzte N Spiele | Abpfiff | Ziel siehe Entscheidung E2 |
| Profile | AFI-Kern | Befunde | Spieltag / Woche / Transferfenster | flüchtig |
| AFI | Entscheider | geordnete Optionen + Begründung | bei Bedarf | flüchtig; nur getroffene Entscheidung gespeichert |
| Entscheidung | Spielstand | Taktikplan, Aufstellung, Transfer, Trainingsschwerpunkt, Hinweis | Woche | klein |

**Welche Vereine haben Profile?** Nur Spiele mit voller Engine erzeugen Leistungsdaten (Audit 00, Abschnitt 1.3): **eigene Liga,
Turniere, Relegation**. Vereine anderer Ligen (Poisson) haben keine Leistungsprofile – für sie arbeitet AFI nur mit Werten
(Attributen) und Ergebnissen, gekennzeichnet als MODELED bzw. UNAVAILABLE. Das betrifft vor allem Scouting und Transfers aus
Nachbarligen (`transfers.js ensureNeighbors`).

---

## 4. Entscheidungsmodelle

### 4.1 Profile und kleine Stichproben (Grundlage aller Modelle)

- Eine Amateursaison hat 14–30 Spiele, ein Spiel nur rund 55–76 Ballbesitze und 60–110 Pässe (Audit 00, 7.1). Spielerwerte
  schwanken daher stark.
- **Schrumpfung zum Mittel:** Profilwert = (Summe + k · Mittel der Position in der Liga) / (n + k). `k` wird **gemessen**
  (wie schnell sich der Wert eines Spielers über Seeds stabilisiert), nicht gesetzt. Herkunft: ESTIMATED, mit `n`.
- **Vergleich nur relativ:** Perzentil in der eigenen Liga und Position („unter den besten 20 %“), keine Absolutzahl „je 90“.

### 4.2 Diagnose (Befunde)

Ein Befund ist eine Regel über Profilwerte, mit Schwelle aus der Validierung (Phase 3), nicht aus dem Bauch. Vorlage wie
`situations.js` (severity, confidence, evidence). Beispiele und ihre **Machbarkeit nach Audit 00**:

| Befund (Beispiele aus dem Auftrag) | Regel (Skizze) | Daten | machbar ab |
|---|---|---|---|
| Viel Ballbesitz, wenig Territorium | Besitz-Perzentil hoch, Territorium-Perzentil niedrig | A + A | Phase 4 |
| Gewinnt viele zweite Bälle | Zweite-Ball-Quote hoch (B) | B | Phase 4 (nach Mitschrift) |
| Kann Pressing schlecht überspielen | Ballverluste im eigenen Drittel bei Nahdruck hoch (B) | B | Phase 4; volle Fassung erst nach Druckmodell |
| Anfällig, wenn erste Linie überspielt wird | Gegentore/Chancen nach Pässen, die eine Linie überspielen (Packing, Mitschrift) | B | Phase 4 |
| Verliert nach Ballverlust die Kontrolle | Chancen des Gegners innerhalb kurzer Zeit nach eigenem Ballverlust (`turnovers` + `shots`) | A | Phase 4 |
| Viele Angriffe, wenig Fortsetzung | Ballbesitze mit Eintritt ins letzte Drittel, aber selten Strafraum/Abschluss (`poss`) | A | Phase 4 |
| Spieler schafft wenig Raum | – | C | erst nach Raummodell; **bis dahin nicht anbieten** |
| Spieler nur auf einer Position effektiv | – | C | erst nach Feinrollen + Leistung je Rolle |

### 4.3 Optionen und Rangfolge

Optionen aus einem festen Katalog, geordnet nach **Kosten und Eingriffstiefe** – erst die billige Lösung:

1. **Taktik** (Befehl/Stil): sofort, kostenlos. Wirkung je Befehl ist gemessen (Projektregel „jede Schicht gegen den alten Stand“;
   `patterns.js` nennt Gegenmittel nur, wo gemessen).
2. **Rolle/Aufstellung:** anderer Spieler auf derselben Position, Positionswechsel (positionsfremd-Abschlag `position.js` beachten).
3. **Jugend/zweite Mannschaft:** vorhandene Talente (`youth.js`, `reserve.js`).
4. **Training:** Schwerpunkt (`teamtraining.js FOCUS`) – wirkt erst zum Saisonende.
5. **Transfer:** nur in der Wechselperiode, mit Budget, und nur wenn 1–4 über **mehrere Spiele** nicht geholfen haben.

`rank()` = Wirkung (gemessen, ESTIMATED) × Passung zur Philosophie × Machbarkeit (Budget, Kader, Fenster) – die
Philosophie-Gewichte sind die einzige bewusst gesetzte Größe (Charakter, kein Messwert) und als solche gekennzeichnet.

**Beispiel (aus dem Auftrag):** „62 % Ballbesitz, kaum in der gegnerischen Hälfte“
- Befund: Besitz hoch (A), Territorium niedrig (A), Ballverluste im Mittelfeld unter Nahdruck hoch (B).
- Optionen: `route: tiefe` / `build: direkt` (gemessene Wirkung auf Territorium), Stürmer kommt entgegen (`shape: stuermer_fallen`),
  Spieler mit höherer Passquote unter Druck auf die zentrale Position.
- Stratege: nimmt die gemessen beste Option; Alte Schule: `build: direkt`; Kumpeltyp: meist nichts.
- Text an den Menschen (Vorlage): „Wir haben den Ball, kommen aber selten ins letzte Drittel (Liga: untere 20 %). Ein paar mehr
  Bälle in die Tiefe könnten helfen.“

### 4.4 Tactical Fit Score (TFS)

**Ziel:** Wie gut passt Spieler X auf Rolle R im System S des Vereins V (Philosophie P)?

**Aufbau – ohne erfundene Gewichte:**
1. **Anforderungsprofil je Rolle und System** = welche Spielerwerte die Wirkung dieser Rolle tatsächlich verändern. **Gemessen
   durch Simulationsexperimente:** dieselben Spiele (Seeds), ein Spieler auf Rolle R mit Wert k hoch vs. niedrig, Unterschied in
   Team-Kennzahlen (xG-Differenz, Territorium, Ballverluste). Die gemessenen Effektgrößen sind die Gewichte (ESTIMATED, mit
   Stichprobe).
2. **Spielerseite:** Werte (Attribute, MEASURED als Spielstand) + Leistungsprofil auf dieser Rolle (ESTIMATED, geschrumpft) +
   Profile/Eigenschaften (`profiles.js`).
3. **TFS** = gewichtete Übereinstimmung, ausgegeben als **Stufe** (passt sehr gut / gut / bedingt / nicht), nie als 0–100 mit
   Nachkommastellen.
4. **Philosophie** verschiebt nur die Rangfolge zwischen Kandidaten mit ähnlicher Stufe, nicht die Stufe selbst.

**Warum ein 75er für ein System wertvoller sein kann als ein 85er:** `rating` (`generator.js ratePlayer`) mischt alle Werte mit
festen Gewichten. Wenn die gemessenen Rollengewichte z. B. für einen pressenden Mittelfeldspieler Tempo und Zweikampf hoch und
Abschluss niedrig gewichten, gewinnt der Spieler mit dem passenden Profil – das ist dann belegt, nicht behauptet.

**Grenzen (Audit 00):** Rollen gibt es heute nur als `gk/def/mid/fwd`. Ein TFS „Außenverteidiger“ oder „Sechser“ ist erst nach
den Feinrollen (Phase 4, B1) sinnvoll. Bis dahin: TFS je Grundrolle × System × Befehlsprofil.

### 4.5 Unterscheidung der Qualitätsbegriffe (Scouting)

| Begriff | Quelle | Herkunft |
|---|---|---|
| Absolute Qualität | `rating`, Werte | MEASURED (Spielstand) – Sichtbarkeit nach Scouting-Kenntnis (`scouting.js`) |
| Relative Qualität in der Liga | Perzentil der Leistungsprofile in der eigenen Liga | ESTIMATED; nur eigene Liga |
| Taktische Eignung | TFS | ESTIMATED |
| Entwicklungspotenzial | Entwicklungstyp (`development.js`, verborgen), Alter | MODELED; für Fremde nur geschätzt nach Kenntnis |
| Kosten | Preis, Gehalt, Vertrag (`transfers.js priceOf`, `contracts.js`) | MEASURED |

### 4.6 Transfer-KI (CPU)

Ersetzt den heutigen Zufall in `cpuTransfers` schrittweise:
1. **Bedarf** aus Befunden (z. B. „verliert zweite Bälle im Mittelfeld“, wiederholt über ≥ N Spiele) und aus dem Kader (Alter,
   Vertragsende, Abgänge).
2. **Erst Alternativen** (4.3, Stufen 1–4). Transferbedarf nur, wenn keine Alternative in der Philosophie des Trainers trägt.
3. **Kandidaten** aus erreichbaren Spielern (eigene Liga, Nachbarligen, Vereinslose; Ligatier `to.tiers` wie heute), bewertet
   nach TFS, Preis/Gehalt/Budget, Alter, Konkurrenz (andere CPU-Vereine mit gleichem Bedarf – Reihenfolge deterministisch).
4. **Wirtschaftlich plausibel:** Budget und Gehaltsstruktur nur, wo sie im Spiel existieren (Verträge ab Regionalliga,
   `contracts.js`); darunter Aufwandsentschädigung/Ausbildungsentschädigung (`transferrules.js`).
5. **Begrenzung:** Wechselzahl je Fenster wie heute als Obergrenze (Balance der Liga bleibt), nur die **Auswahl** wird klüger.

### 4.7 Spielerentwicklung

- Erkennen: Befunde je Spieler (z. B. „Pässe unter Nahdruck oft verloren“ – B), nur mit ausreichendem `n`.
- **Umsetzbar heute:** Trainingsschwerpunkte wirken auf vorhandene Werte (`FOCUS.w`), Profile wie `nervoes`/`ruhepol` hängen an
  Werten und Eigenschaften (`profiles.js`). Ein Schwerpunkt „Ball und Passspiel“ verbessert Technik/Passen und damit die Streuung
  unter Druck (`actions.js:526`) – **die Wirkung ist über die Engine nachweisbar**.
- **Nicht umsetzbar ohne neue Werte:** „Raumorientierung“, „Antizipation zweiter Bälle“, „Umschaltverhalten“ als eigene
  Fähigkeiten – die Engine hat dafür keine Werte (Audit 00, F). Entweder auf vorhandene Werte abbilden (offen gelegt) oder neue
  Werte einführen (Engine-Änderung, Entscheidung E6).

### 4.8 Manager-Beratung

- Quelle: dieselben Befunde wie für die CPU.
- **Drosselung** nach dem Vorbild `coachfeed.js`: höchstens ein Saison-/Kaderhinweis je Woche, einer vor dem Spiel, Live-Karten wie
  heute; nur Befunde mit Sicherheit über Schwelle und `n` über Mindestwert; derselbe Hinweis frühestens nach X Wochen wieder.
- **Jeder Hinweis** nennt Beleg („Liga: untere 20 %, 9 Spiele“) und genau eine Handlung (Button wie „Gegenmittel übernehmen“ in
  `home.js`, Punkt 30).
- **Wirkungskontrolle** wie im Spiel (`coachfeed.js checkFollowUps`): nach einigen Spielen „hat geholfen / noch nicht“.

---

## 5. KI-Trainer: vor, während, nach dem Spiel

| Zeitpunkt | Heute | Mit AFI |
|---|---|---|
| Vor dem Spiel | feste Muster je Trainertyp (`patterns.js`), Vereinsstil | Matchplan aus Gegnerprofil (Befunde des Gegners) + eigener Philosophie; Aufstellung nach TFS statt nur Stärke |
| Während | `aicoach.js`: Lage → Option → Persona | unverändert im Kern; zusätzlich Matchplan-Varianten als bevorzugte Optionen |
| Nach dem Spiel | nichts | Notiz: welche Befehle gewirkt haben (Vorher/Nachher wie `trace.js`), fließt in den nächsten Matchplan |

**Fairness:** CPU-Trainer dürfen über den Menschen nicht mehr wissen als der Mensch über sie (Scouting-Stufe gilt sinngemäß;
Entscheidung E5).

---

## 6. Philosophien (Vereinsidentität)

Vorhanden sind vier Trainertypen (`opponents.js TYPES`, `aicoach.js PERSONAS`, `patterns.js BY_TYPE`). Abbildung auf die
gewünschten Philosophien:

| Gewünscht | Vorhandener Typ | Was fehlt |
|---|---|---|
| Pressingorientiert | Großmaul (`press:hoch`, `risk:aggressiv`, Muster `pressing`) | Kaderwunsch (Tempo, Kondition) |
| Direkt spielend | Alte Schule (`build:direkt`, `press:tief`, Muster `lang/mauern`) | Kaderwunsch (Kopfball, Körper), Zweite-Ball-Fokus |
| Flexibel | Stratege (reagiert oft, Muster `konter/pressing`) | Systemwechsel vor dem Spiel nach Gegner |
| Ballbesitzorientiert | **fehlt** (Kumpeltyp ist „lässt machen“) | neuer Typ oder Kumpeltyp-Variante (Entscheidung E4) |

Eine Philosophie ist eine **kleine Tabelle**: bevorzugte/gemiedene Befehle (wie heute), Gewichte für Befunde („was stört mich
zuerst“), Kaderwünsche (welche Werte beim TFS den Ausschlag geben). Dieselbe Statistik führt so zu unterschiedlichen
Entscheidungen. Die Philosophie ist bewusst gesetzt (Charakter) und so gekennzeichnet.

---

## 7. Liga Intelligence

Nur für Ligen mit voller Engine (eigene Liga) und nur mit geprüften Kennzahlen:
- Ranglisten je Kennzahl (Team und Spieler, mit Mindest-n), „von klassischen Zahlen unterschätzt“ = hohe Leistungsprofile bei
  niedriger Note/Torzahl.
- Trainerprofile: Befehlsverlauf (`m.decisions`, `by: 'ai'`) über die Saison verdichtet → „hat seine Ausrichtung am stärksten
  verändert“.
- Systeme: Punkte je System/Stil in der Liga (ESTIMATED, kleine Zahl Vereine – nur mit Bereichsangabe).
- Andere Ligen: nur Tabellen (Poisson) – dort keine Analyse anbieten.

---

## 8. Abhängigkeiten und Konflikte

| Thema | Abhängigkeit / Konflikt | Umgang |
|---|---|---|
| Datenbasis | AFI braucht Profile über viele Spiele → **Phase 1 und eine neue Profil-Phase** vor allem anderen | neue Phase 5 (Abschnitt 9) |
| Poisson-Welt | keine Leistungsdaten außerhalb der eigenen Liga | dort nur Werte/Ergebnisse; klar kennzeichnen (Audit 00, Regel 9) |
| Kleine Stichproben | Spielerwerte schwanken | Schrumpfung, Perzentile, Mindest-n |
| Feinrollen | TFS je Außen/Zentrum, Positionsflexibilität | erst nach Engine-Erweiterung B1 |
| Neue Fähigkeiten | Training „Raumorientierung“ usw. | Entscheidung E6 |
| Balance | klügere CPU-Transfers und Matchpläne machen CPU stärker | Schwierigkeitsstufen (`difficulty.js`, `aicoach.js DIFFICULTY`) einbeziehen; Liga-Balance messen (Projekt-Skripte) |
| Determinismus / Golden | Entscheidungen vor dem Spiel ändern Aufstellung/Taktik → andere Spiele | gewollte Änderung; Golden nur bei bewusster Umstellung neu |
| Bestehende Module | `aicoach`, `coachfeed`, `patterns`, `opponentscout`, `subadvice` würden doppelt deuten | AFI-Kern als gemeinsame Quelle; vorhandene Module schrittweise darauf umstellen, je mit Vorher/Nachher-Messung |
| Speicher | Profile aller Spieler der eigenen Liga | Budget (Entscheidung E2 aus Auftrag 00) |
| Rechenzeit | AFI läuft je Spieltag/Woche, nicht je Schritt | vernachlässigbar gegenüber der Engine (1,3–2 s je Spiel) |

---

## 9. Gemeinsame Roadmap (Auftrag 00 + Ergänzung 02)

Die Phasennummern aus Ergänzung 02 (7–13) bleiben erhalten. Aus der technischen Abhängigkeit ergeben sich zwei zusätzliche
Phasen (5, 6) und die in Auftrag 00 begründete Umstellung (Validierung vor Engine-Erweiterungen). Die Phasen 5–8 aus Auftrag 00
gehen in den Phasen 7–13 auf.

| Phase | Inhalt | Prio | Aufwand | Abhängig von | Akzeptanzkriterium | Start der nächsten, wenn … |
|---|---|---|---|---|---|---|
| 0 | Audit & Data Reality Check | – | ✅ | – | Bericht 00 | Freigabe |
| 1 | Datenmodell & Ereigniserfassung | hoch | M | 0 | Golden unverändert, ≤ +10 % Rechenzeit | Daten für A/B-Kennzahlen vollständig |
| 3 | Validierung (vorgezogen) | hoch | S–M | 1 | jede Kennzahl: Streuung, Mindest-n, Taktikreaktion belegt | Kennzahl besteht |
| 4 | Analytics-Anzeige | hoch | M | 3 | nur geprüfte Kennzahlen, Herkunft sichtbar | Nutzer bestätigt |
| 2 | Engine-Erweiterungen (Druck, zweite Bälle, Außen/Zentrum, Raumstichprobe) | mittel | M–L | 1, 3 | je Schicht besser als vorher gemessen | Schicht bestanden |
| **5** | **Profile** (Spieler/Team/Trainer, Saison, Schrumpfung, Speicher) | hoch | M | 1, 3 | Profil stabil über Seeds, Speicherziel eingehalten | Profile für eigene Liga vorhanden |
| **6** | **Philosophien** (Tabellen je Trainertyp, Ballbesitz-Typ) | mittel | S | 5 | gleiche Lage → erkennbar verschiedene Entscheidungen je Typ | – |
| 7 | AFI-Kern (`diagnose → options → rank`, Befund-Katalog) | hoch | M | 5, 6 | Befunde reproduzierbar, Belege und Herkunft je Befund | Kern getestet |
| 8 | KI-Trainer-Integration (vor/nach dem Spiel; im Spiel auf Kern umstellen) | hoch | M | 7 | CPU-Punkte im Mittel unverändert ± Messfehler bei gleicher Schwierigkeit; Entscheidungen begründet | – |
| 9 | Smart Scouting & TFS | mittel | M | 5, 7; Feinrollen für Teile | TFS-Gewichte aus Experimenten; Stufen statt Zahlen | – |
| 10 | Transfer-KI | mittel | M–L | 8, 9 | Alternativen vor Transfer; Liga-Balance über 10 Saisons wie vorher | – |
| 11 | Spielerentwicklung | niedrig | M | 5, 7 (E6) | Trainingsfolge in der Engine messbar | – |
| 12 | Manager-Beratung | hoch (sichtbar) | S–M | 7 | ≤ 1 Hinweis je Woche + 1 vor dem Spiel; jeder mit Beleg und Handlung; Wirkungskontrolle | – |
| 13 | Liga Intelligence | niedrig | S–M | 5 | nur eigene Liga, nur geprüfte Kennzahlen | – |

**Empfohlene Reihenfolge:** 1 → 3 → 4 → 5 → 7 → 12 → 6 → 8 → 9 → 10 → 2 (parallel, je Schicht) → 11 → 13.
Begründung: Die Manager-Beratung (12) ist der sichtbarste Nutzen und braucht nur Profile und Kern; Transfers (10) greifen am
stärksten in die Liga-Balance ein und kommen deshalb spät.

**Grobaufwand gesamt** (S = Tage, M = 1–2 Wochen, L = mehrere Wochen, je mit Messläufen): Phasen 1–7 rund 2–3 Monate Arbeit in
diesem Projekttempo, 8–13 weitere 2–3 Monate. Schätzung, kein Messwert.

---

## 10. Entscheidungen vor der Umsetzung (zusätzlich zu Bericht 00, Abschnitt 10)

- **E1 Reihenfolge:** einverstanden mit der empfohlenen Reihenfolge (Beratung vor Transfer-KI)?
- **E2 Profile für wen:** nur eigene Liga (Empfehlung) – Nachbarligen und andere Ligen nur mit Werten?
- **E3 Transfer-KI:** soll sie die Zahl der CPU-Wechsel beibehalten und nur klüger auswählen (Empfehlung), oder mehr Wechsel zulassen?
- **E4 Ballbesitz-Philosophie:** neuer fünfter Trainertyp oder Umdeutung des Kumpeltyps?
- **E5 Fairness:** sollen CPU-Vereine beim Scouting denselben Kenntnisregeln unterliegen wie der Mensch?
- **E6 Neue Fähigkeiten** (Antizipation, Übersicht, Stellungsspiel): einführen (Engine-Änderung, Balance) oder bei den vorhandenen
  Werten bleiben und Training darauf abbilden (Empfehlung für den Anfang)?
- **E7 Schwierigkeit:** soll die Stufe „leicht“ die CPU-Intelligenz dämpfen (wie heute `aicoach.js DIFFICULTY`)?
- **E8 Häufigkeit der Beratung:** Vorschlag oben (1 je Woche + 1 vor dem Spiel) bestätigen.

---

## 11. Entscheidungen des Nutzers (2026-11-25)

| Nr. | Frage | Entscheidung | Folge |
|---|---|---|---|
| E1 | Reihenfolge (Beratung vor Transfer-KI) | **ja** | Roadmap-Reihenfolge Abschnitt 9 gilt |
| E2 | Profile nur für die eigene Liga | **nein** | Vereine anderer Ligen haben heute **keinen festen Kader** (`pyramid.js ensureLeagues` „ohne Kader“, Tabelle in einem Zug per Poisson `simTable`); Nachbarvereine des Transfermarkts werden je Saison neu gezogen (`transfers.js genNeighbors`). Profile außerhalb der eigenen Liga brauchen daher erst feste Kader und eine Datenquelle – **gewählt: Variante a + b** (11.1) |
| E3 | CPU-Wechselzahl wie bisher, nur klüger auswählen | **ja** | `cpuTransfers` behält die Obergrenze je Fenster |
| E4 | Ballbesitz-Philosophie | **neuer fünfter Trainertyp** | `opponents.js TYPES`, `aicoach.js PERSONAS`, `patterns.js BY_TYPE` erweitern; Verteilung der Typen auf die Vereine ändert sich (Golden/Balance messen) |
| E5 | CPU-Scouting nach denselben Kenntnisregeln | **ja** | CPU-Vereine brauchen eigene Kenntnisstände (`scouting.js` heute nur für den Menschen) – Speicher beachten |
| E6 | Neue Fähigkeitswerte (Antizipation, Übersicht, Stellungsspiel) | **einführen** | Engine-Änderung: neue Werte in `generator.js ROLL_ATTRS`, Wirkung in `ai.js`/`actions.js`, Entwicklung/Training, Stärke (`ratePlayer`), alte Spielstände migrieren; Balance neu messen. Eigene Phase vor 11, als schaltbare Schicht mit Vorher/Nachher-Messung |
| E7 | Stufe „leicht“ dämpft die KI | **ja** | wie heute `aicoach.js DIFFICULTY`, auf alle AFI-Entscheider ausgeweitet |
| E8 | Häufigkeit der Beratung | **Vorschlag 11.2 übernommen** | Zahlen sind Spielwerte, nach ersten Messläufen prüfen |

### 11.1 Varianten für E2 (Profile außerhalb der eigenen Liga)

| Variante | Inhalt | Speicher | Rechenzeit | Herkunft |
|---|---|---|---|---|
| a) Nachbarligen mit Stichprobenspielen | Eine Liga darüber und darunter bekommen feste Kader; je Spieltag laufen dort wenige Spiele mit voller Engine nur zum Messen (Ergebnis zählt nicht, Tabelle bleibt Poisson) | mittel (2 Ligen Kader) | + einige Spiele je Woche im Hintergrund | MEASURED aus Stichprobe, kleineres n |
| b) Werte-Profile für alle anderen | Aus den Werten der Spieler geschätzt, ohne Spiele | gering | gering | MODELED, so gekennzeichnet |
| c) Alle Ligen voll | feste Kader und volle Spiele für die ganze Pyramide | sehr hoch (übersteigt den Browser-Speicher von 100–230 KB je Stand um ein Vielfaches) | sehr hoch | MEASURED |

Empfehlung: **a + b** (Nachbarligen gemessen, Rest geschätzt und gekennzeichnet); c nicht.

### 11.2 Vorschlag Beratung (E8)

- **Im Spiel:** wie heute (Co-Trainer-Karten, höchstens drei je Halbzeit).
- **Wochenhinweis:** höchstens **einer je Woche** zu Saison, Kader oder Taktik – erst ab **5 Spielen** Datengrundlage, nur bei
  sicherem Befund; derselbe Hinweis frühestens nach **4 Wochen** wieder.
- **Vor dem Spiel:** ein Hinweis zum Gegner **nur, wenn er ein klares Profil hat** – nicht jede Woche.
- **Nachfassen:** drei Spiele nach einem befolgten Hinweis „hat geholfen / noch nicht“ (wie `coachfeed.js`).
- **Ort:** im Postfach/auf der Startseite, keine Aufpopper; Einstellung **Beratung: an / selten / aus**.
- Alle Zahlen sind Spielwerte, nach den ersten Messläufen zu prüfen.

### 11.3 Folgen für die Roadmap

- **Neue Phase 5b – Feste Kader der Nachbarligen und Messspiele** (E2 a): nach Phase 5, vor Phase 9/10. Speicher und Rechenzeit
  messen (Budget aus Bericht 00, Entscheidung E2 dort noch offen).
- **Werte-Profile** für alle übrigen Ligen (E2 b) in Phase 5, gekennzeichnet MODELED.
- **Neue Phase 6b – Neue Fähigkeitswerte** (E6): Antizipation, Übersicht, Stellungsspiel als Engine-Schicht mit Schalter,
  Migration alter Stände; vor Phase 9 (TFS braucht sie) und 11 (Training).
- **Fünfter Trainertyp „Ballbesitz“** (E4) in Phase 6.
- **CPU-Scouting-Kenntnis** (E5) in Phase 9.
- Reihenfolge damit: 1 → 3 → 4 → 5 → 7 → 12 → 6 → 6b → 8 → 5b → 9 → 10 → 2 (je Schicht) → 11 → 13.
