# Balancing & Simulation QA – 3. BALANCING ISSUE LIST

Stand 2026-11-28 (nach Schritt A1 und A2 Teil 1). Sortiert nach Schweregrad. Belege: Testbericht `docs/BALANCING-QA-02-TESTS.md` (T),
Audit `docs/BALANCING-QA-01-AUDIT.md` (A). **Ursachen sind Hypothesen**, solange „Prüfung“ nicht erledigt ist. Nichts geändert.

Schweregrad: **S1** widerspricht einem Kernziel des Auftrags · **S2** deutlich unrealistisch · **S3** auffällig · **S4** Hinweis.

| # | Grad | Befund | Beleg | Hypothese (nicht geprüft) | Prüfung (nächste Schritte) |
|---|---|---|---|---|---|
| B1 | S1 | **Fehler:** Kappung auf 0,98 aus der Zeit vor Stärkemodell 3 schneidet Technikwerte über 1 ab – eigener Verein in jedem Spiel (Form/Stimmung), beide Mannschaften über Berufsboni; gleiche Mannschaft verliert dadurch 0,24 / 0,98 / 1,97 Tore je Spiel in Liga 5 / 7 / 9 | `docs/BALANCING-QA-04-ATTRIBUTES.md` 2.3 | belegt (gemessen) | ✅ **behoben 2026-11-28** (`sim/skill.js` bonusAttr, Schalter BONUS_CAP); r 0,13 → 0,39, Favorit-Siege 40 → 55 % (Bericht 04 Abschnitt 5) |
| I1 | S1 | ✅ **Ursache B1, behoben.** Großfeld (Liga 5–9): Kaderstärke bestimmt das Ergebnis kaum; r −0,29 … 0,10 (echt 0,25–0,47), Favorit mit ≥ 10 Punkten gewinnt 23–38 % | T 3.1 | a) `rating` (Anzeige-Gewichte V1) misst nicht, was auf dem Großfeld wirkt (A2: V2 „nicht in Gebrauch“, Großfeld bei V2 nicht gemessen); b) Technikwerte über 1 (Stärkemodell 3 hebt höhere Ligen an) wirken in der Engine gedämpft (`sim/skill.js` soft), zählen im rating aber voll; c) sehr wenige Tore → mehr Zufall | Regression der Tordifferenz je Wert auf dem Großfeld mit Kadern aus Liga 5 und 9 (`strength-regression.mjs`); Vergleich Kader mit gleicher Stärke aus Technik vs. Tempo/Körper |
| I2 | S2 | Großfeld und 9er: zu wenige Tore (1,1–1,9 bzw. 1,75), 0:0 15–33 % (echt 4–8 %), Remis bis 40 % | T 3, 3.1 | bekannt seit ROADMAP B6 (Großfeld 1,74 → 1,57); Platzgröße gegen Zeitraffer-Länge | Torentstehung je Platz: Schüsse je Ballbesitz im letzten Drittel, Torwartquote |
| I3 | S2 | Kein Heimvorteil in der Engine: H / U / A 38 / 24 / 38 (echt 43 / 25–27 / 30–32), Poisson-Ligen aber +0,3 | T 3, A1 | `sim/match.js`: `homeTeam` nur Anzeige, `crowd` ohne Wirkung | Entscheidung, ob und wie (B) |
| I4 | S2 | Führungen zu sicher: Halbzeitführung gewinnt 78–83 % (echt 69–74 %), verliert 2–6 % (echt 8–10 %) | T 3 | Rückstand erhöht Risiko zu wenig, Führender verwaltet zu gut; Mentalität (`sim/mentality.js`) „alle Spielwerte“ | Tore je Minute nach Spielstand; Wirkung von MENTAL und Trainerwechseln |
| I5 | S3 | Tore fallen eher früh: 2. Halbzeit 45–47 % (echt 53–56 %), erste 15 Minuten am meisten | T 3 | Müdigkeit wirkt auf beide gleich; späte Risikobereitschaft fehlt (vgl. I4) | wie I4 |
| I6 | S3 | Ballbesitz kaum unterschiedlich: Streuung 3,5–5,9 %-Punkte | T 3 | Stile ändern Ballbesitz wenig (AFS 3: ballbesitz-Trainer +2–3 %-Punkte) | Phase 4 (Stile je Format) |
| I7 | S3 | Kopfball-Abschlüsse selten (0,3–1,2 je Spiel) | T 3 | Format und Flankenzahl; echte Großfeld-Ligen haben deutlich mehr – Vergleichswert noch zu recherchieren | Phase 4 (Flügelspiel), Quelle suchen |
| I8 | S3 | Tore je xG 0,70–0,87 auf 7er bis 11er: xG-Modell überschätzt | T 3 | Messmodell (`chances.js` XG), wirkt nicht aufs Spiel; nur Anzeige betroffen | Neu eichen, falls AFS-Kennzahlen darauf bauen |
| I9 | S3 | Müdigkeit wirkt fünffach, Derby sechsfach, Zweikampfwert in der Foulrate doppelt | A3, A4, A6 | Stapelung möglicher Überwirkungen | Phase 6 (geringere Fitness, Derby) |
| I10 | S4 | Anzeige-Stärke und Wirkung auseinander (V1 vs. V2) | A2 | Grundlage auch für Transfers, Poisson-Ligen, Prognosen | mit I1 |
| I11 | S4 | Ohne Eingriffe bleibt der Verein in Liga 1 (94 %): CPU-Kader der Liga gleich stark wie der Start | T 1 | gewollt? | Phase 5 mit Bot (`longrun --bot`) |
| I12 | S4 | Messwerkzeug: Start in Liga 11 nicht möglich, liftTo erzeugt einen künstlich schwachen Verein | T 1 | betrifft nur Messung | eigener Startweg für Profiligen |

Nicht als Problem gewertet: Torzahl und Ergebnisverteilung 4er–7er, Rot-Wirkung (S / U / N 30 / 23 / 46 %), Tabellenstreuung,
keine Karten ohne Schiedsrichter (Freizeitliga, gewollt).
