# Balancing & Simulation QA – Nutzerauftrag (2026-11-27)

Wortlaut des Auftrags, unverändert. Einordnung (Claude, vom Nutzer mit „Weiter“ bestätigt): nach AFS Phase 5b, vor Phase 9.
Abschnitt A (Audit und Tests, keine Spielwerte ändern) → ausdrückliche Freigabe → Abschnitt B (Balancing) → AFS 9 → 10 → 2 → 11 → 13.
Anpassungen an den Bestand stehen in ROADMAP.md (Eintrag „Balancing & Simulation QA“). Ergebnisse: `docs/BALANCING-QA-*.md`.

---

MASTER-AUFTRAG: GAME BALANCING & SIMULATION QA

Umfassender Spieltest, statistische Validierung und Balancing des Fußballmanagers

1. ZIELSETZUNG

Führe einen umfassenden Qualitäts-, Spielmechanik- und Balancing-Test meines Fußballmanagers durch.

Das Ziel ist eine realistische, faire, abwechslungsreiche und langfristig funktionierende Fußballsimulation.

Untersuche nicht nur, ob das Spiel technisch funktioniert, sondern insbesondere, ob sich die Fußballwelt plausibel verhält.

Das Spiel soll:

- Realistische Spielergebnisse erzeugen.
- Unterschiedliche Spielstärken sinnvoll abbilden.
- Favoriten und Außenseiter angemessen behandeln.
- Eine glaubwürdige Tabellenentwicklung ermöglichen.
- Spielerattribute sinnvoll gewichten.
- Taktische Entscheidungen spürbar machen.
- Unterschiedliche Spielstile ermöglichen.
- Langfristig über viele Saisons funktionieren.
- Keine offensichtlich übermächtigen Strategien oder Spielerkombinationen enthalten.

Wichtig: Qualität geht vor Quantität. Ein funktionierendes Spiel ist nicht automatisch ein gut ausbalanciertes Spiel.

2. PHASE 1 – VOLLSTÄNDIGER BESTANDSAUDIT

Untersuche zunächst die gesamte Codebasis.

Analysiere insbesondere:

- Match Engine.
- Spielerattribute und deren Gewichtung.
- Mannschaftsstärken.
- Formationen und taktische Einstellungen.
- Spielerrollen.
- Torwartverhalten.
- Schuss- und Abschlussberechnungen.
- Pass- und Ballbesitzsystem.
- Zweikampfberechnungen.
- Pressing und Defensivverhalten.
- Verletzungen und Sperren.
- Fitness und Ausdauer.
- Heimvorteil.
- Zufallsmechanismen.
- KI-Entscheidungen.
- Ligaspielbetrieb.
- Tabellenberechnung.
- Transfer- und Kaderlogik.

Erstelle eine Übersicht der relevanten Parameter, Berechnungen und Stellschrauben.

Identifiziere insbesondere:

- Doppelte Einflussfaktoren.
- Unverhältnismäßig starke Attribute.
- Zu schwache Attribute.
- Unbeabsichtigte Wechselwirkungen.
- Zufällige Ergebnisse ohne ausreichende sportliche Grundlage.
- Mögliche Exploits.
- Fehlerhafte oder unrealistische Grenzwerte.

Noch keine Werte verändern.

3. PHASE 2 – MATCH ENGINE BALANCING

Teste die Spielsimulation systematisch.

A. Torverteilung

Prüfe:

- Durchschnittliche Tore pro Spiel.
- Heim- und Auswärtstore.
- Verteilung der Ergebnisse.
- Häufigkeit von 0:0, 1:0, 2:1, 3:2 und hohen Ergebnissen.
- Häufigkeit von sehr hohen Siegen.
- Häufigkeit torloser Spiele.

Ziel ist eine plausible Torverteilung, die sich an realen Fußballligen orientiert.

B. Schüsse und Chancen

Prüfe:

- Schüsse pro Spiel.
- Schüsse auf das Tor.
- Verhältnis von Schüssen zu Toren.
- Qualität der Torchancen.
- Verwertung klarer Torchancen.
- Fernschüsse.
- Kopfballabschlüsse.
- Abschlüsse innerhalb und außerhalb des Strafraums.

Verhindere, dass bestimmte Abschlussarten systematisch zu effektiv oder wirkungslos sind.

C. Ballbesitz und Passspiel

Prüfe:

- Durchschnittlichen Ballbesitz.
- Passquoten.
- Erfolgreiche lange Bälle.
- Flanken.
- Vertikale und horizontale Spielweise.
- Ballverluste.
- Ballbesitzverteilung zwischen Mannschaften unterschiedlicher Stärke.

Unterschiedliche Spielstile müssen unterschiedliche statistische Profile erzeugen.

D. Zweikämpfe und Defensive

Prüfe:

- Gewonnene Zweikämpfe.
- Kopfballduelle.
- Tacklings.
- Abgefangene Pässe.
- Ballverluste unter Gegnerdruck.
- Defensivfehler.
- Gegentore.
- Torwartparaden.

Verhindere, dass einzelne defensive Attribute das gesamte Spiel dominieren.

E. Spielverlauf

Prüfe:

- Torverteilung über die Spielzeit.
- Verhalten nach Führungen.
- Verhalten nach Rückständen.
- Auswirkungen von Auswechslungen.
- Ermüdung im Spielverlauf.
- Häufigkeit von späten Toren.
- Auswirkungen von Roten Karten.

Spiele sollen nicht nach einem starren Muster ablaufen.

4. PHASE 3 – SPIELERATTRIBUTE UND ROLLEN

Untersuche die tatsächliche Wirkung aller Spielerattribute.

Wichtige Fragen:

- Ist Geschwindigkeit zu mächtig?
- Wird Technik ausreichend berücksichtigt?
- Ist Übersicht relevant?
- Wirkt sich Antizipation tatsächlich aus?
- Haben Stellungsspiel und Defensivverhalten genügend Einfluss?
- Sind körperliche Attribute überbewertet?
- Haben mentale Attribute einen spürbaren Effekt?
- Ist Ausdauer ausreichend relevant?
- Sind Torhüterattribute sinnvoll gewichtet?

Teste unterschiedliche Spielertypen.

Beispiele:

- Schneller, technisch schwacher Stürmer.
- Langsamer, technisch hervorragender Stürmer.
- Kopfballstarker Zielspieler.
- Beweglicher Pressingstürmer.
- Kreativer Spielmacher.
- Defensiver Mittelfeldspieler.
- Zweikampfstarker Innenverteidiger.
- Spielstarker Innenverteidiger.
- Schneller Außenverteidiger.
- Klassischer Torwart.
- Mitspielender Torwart.

Ziel:
Jeder Spielertyp soll unter passenden taktischen Voraussetzungen einen echten Nutzen besitzen.

Vermeide eine Situation, in der ein einzelnes Attribut oder ein bestimmtes Spielerprofil alle anderen überflüssig macht.

5. PHASE 4 – TAKTIK UND FORMATIONEN

Teste unterschiedliche Spielsysteme und taktische Ausrichtungen.

Mindestens:

- 4-4-2
- 4-2-3-1
- 4-3-3
- 3-5-2
- 3-4-3
- 5-3-2
- 4-1-4-1

Zusätzlich unterschiedliche Spielphilosophien:

- Ballbesitzorientiert.
- Hohes Pressing.
- Tief stehende Defensive.
- Konterfußball.
- Direktes Spiel.
- Flügelorientiertes Spiel.
- Zentrumorientiertes Spiel.
- Ausgewogene Spielweise.

Prüfe:

- Welche Systeme funktionieren besonders gut?
- Welche sind auffällig schwach?
- Gibt es dominante Kombinationen?
- Sind taktische Anpassungen sinnvoll?
- Können Außenseiter durch taktische Entscheidungen Vorteile erzielen?
- Ist eine Formation unabhängig von der Mannschaftsqualität übermächtig?

Es darf keine einzelne Taktik geben, die unabhängig von Gegner und Spielermaterial dauerhaft überlegen ist.

6. PHASE 5 – LANGZEITSIMULATIONEN

Simuliere zahlreiche komplette Spielzeiten.

Wenn technisch möglich:

- Mindestens 100 komplette Saisons für grundlegende statistische Validierung.
- Bei ausreichender Performance zusätzlich 500 oder mehr Saisons für Langzeittests.
- Unterschiedliche Ausgangsbedingungen.
- Unterschiedliche Mannschaftsstärken.
- Unterschiedliche taktische Ausrichtungen.

Prüfe insbesondere:

Tabellenentwicklung

- Durchschnittliche Punkte pro Verein.
- Punkteabstände.
- Meisterschaftsentscheidungen.
- Abstiegskampf.
- Aufsteiger und Absteiger.
- Häufigkeit überraschender Ergebnisse.

Ligastruktur

- Entwickeln sich realistische Leistungsabstände?
- Dominiert immer derselbe Verein?
- Sind Überraschungsmeister möglich?
- Gibt es dauerhaft chancenlose Vereine?
- Funktioniert die Heim- und Auswärtsbilanz?

Langfristige Entwicklung

- Bleiben die Spielstatistiken über mehrere Saisons stabil?
- Entstehen extreme Rekorde?
- Gibt es unrealistische Torjägerwerte?
- Entwickeln sich Mannschaften und Spieler plausibel?

Dokumentiere Ausreißer und statistische Auffälligkeiten.

7. PHASE 6 – EXTREM- UND GRENZFALLTESTS

Teste gezielt ungewöhnliche Konstellationen.

Beispiele:

- Sehr starke Mannschaft gegen sehr schwache Mannschaft.
- Gleich starke Mannschaften.
- Mannschaft mit elf sehr schnellen Spielern.
- Mannschaft mit elf technisch starken Spielern.
- Mannschaft mit extrem kopfballstarken Spielern.
- Mannschaft mit sehr defensiver Ausrichtung.
- Mannschaft mit maximal offensiver Ausrichtung.
- Mannschaft mit vielen verletzten Stammspielern.
- Mannschaft mit einem Spieler weniger.
- Mannschaft mit deutlich geringerer Fitness.
- Sehr junge Mannschaft gegen erfahrene Mannschaft.

Prüfe, ob die Ergebnisse plausibel bleiben.

Besonders wichtig:
Ein extremer Spielervorteil darf nicht zu völlig unrealistischen Ergebnissen führen. Gleichzeitig müssen deutliche Qualitätsunterschiede spürbar bleiben.

8. PHASE 7 – WIRTSCHAFT UND SPIELERENTWICKLUNG

Prüfe auch die langfristige Balance außerhalb des Spielfeldes.

- Entwickeln sich Spieler realistisch?
- Sind junge Spieler zu schnell zu stark?
- Ist der Alterungsprozess plausibel?
- Funktioniert das Karriereende?
- Sind Verletzungen angemessen häufig?
- Sind Vertragsverlängerungen sinnvoll?
- Sind Transferpreise plausibel?
- Funktioniert die Gehaltsstruktur?
- Können kleinere Vereine wirtschaftlich überleben?
- Entsteht eine sinnvolle Leistungsdynamik zwischen den Vereinen?

Falls diese Systeme bereits existieren, sollen sie ebenfalls in die Langzeittests einbezogen werden.

9. PHASE 8 – STATISTISCHE AUSWERTUNG

Erstelle nach den Tests einen umfassenden Bericht.

Verwende geeignete statistische Auswertungen:

- Mittelwerte.
- Mediane.
- Standardabweichungen.
- Perzentile.
- Häufigkeitsverteilungen.
- Korrelationen.
- Ausreißeranalysen.
- Verteilungen über mehrere Saisons.

Erstelle Diagramme für:

- Torverteilungen.
- Punkteverteilungen.
- Mannschaftsstärken und Tabellenpositionen.
- Spielerattribute und Leistung.
- Taktik und Erfolgsquoten.
- Heim- und Auswärtsleistungen.
- Verletzungen und Fitness.
- Spielerentwicklung.

Vergleiche die Ergebnisse mit realen Fußballligen, sofern geeignete Referenzdaten verfügbar sind.

Wichtig:
Verwende reale Referenzwerte als Orientierung und nicht als starre Vorgabe. Die Simulation muss ihre eigene glaubwürdige Fußballwelt entwickeln können.

10. PHASE 9 – SYSTEMATISCHES BALANCING

Erst nachdem die Testergebnisse vorliegen, darfst du konkrete Balancing-Änderungen vorschlagen.

Für jede Änderung dokumentieren:

1. Welches Problem wurde festgestellt?
2. Welche Daten belegen das Problem?
3. Welcher Parameter ist verantwortlich?
4. Welche Änderung wird vorgeschlagen?
5. Welche Nebenwirkungen sind möglich?
6. Wie wird überprüft, ob die Änderung geholfen hat?

Verändere niemals wahllos mehrere Parameter gleichzeitig.

Nutze möglichst kontrollierte Vergleichstests:

- Ausgangsversion.
- Geänderte Version.
- Gleiche Ausgangsbedingungen.
- Vergleich über ausreichend viele Spiele.
- Statistische Bewertung der Unterschiede.

Wenn möglich, verwende feste Zufalls-Seeds, um identische Ausgangsbedingungen reproduzierbar zu testen.

Ziel ist eine iterative Verbesserung und kein blindes Herumprobieren.

11. PHASE 10 – AUTOMATISIERTE REGRESSIONSTESTS

Entwickle ein dauerhaft nutzbares Testsystem.

Nach zukünftigen Änderungen an der Match Engine sollen automatisch wichtige Simulationstests durchgeführt werden können.

Beispielsweise:

- Torverteilung verändert sich unerwartet.
- Passquoten steigen oder fallen drastisch.
- Eine Formation wird plötzlich übermächtig.
- Bestimmte Spielertypen verlieren ihre Wettbewerbsfähigkeit.
- Die durchschnittliche Spielzeit oder Simulationsdauer steigt stark an.

Definiere sinnvolle Warnschwellen.

Wichtig:
Nicht jede statistische Veränderung ist automatisch ein Fehler. Das Testsystem soll auffällige Abweichungen melden und keine sinnvollen Weiterentwicklungen blockieren.

12. VERBINDUNG ZUM GEPLANTEN ADVANCED FOOTBALL SYSTEM

Berücksichtige bereits bei der Konzeption, dass später Advanced Football Analytics und Advanced Football Intelligence integriert werden sollen.

Die Tests sollen langfristig auch folgende Fragen beantworten können:

- Ist territoriale Dominanz tatsächlich mit sportlichem Erfolg verbunden?
- Wie stark beeinflussen zweite Bälle den Spielausgang?
- Wie relevant ist Pressingresistenz?
- Können positionsflexible Spieler einen messbaren Vorteil erzeugen?
- Haben taktische Anpassungen statistisch nachvollziehbare Auswirkungen?

Noch keine dieser Kennzahlen implementieren, sofern sie nicht bereits existieren.

Das Balancing-Audit soll die spätere Erweiterbarkeit berücksichtigen, ohne die Match Engine vorzeitig umzubauen.

13. ARBEITSREGELN

- Arbeite ausschließlich auf Basis der tatsächlichen Codebasis.
- Keine erfundenen Testergebnisse.
- Keine erfundenen Simulationen.
- Dokumentiere die Anzahl tatsächlich durchgeführter Tests.
- Unterscheide zwischen Testergebnissen und theoretischen Einschätzungen.
- Keine Änderungen ohne nachvollziehbare Begründung.
- Erstelle vor Änderungen einen Ausgangsstand.
- Sichere den bisherigen Zustand über Git-Commits oder geeignete Backups.
- Bestehende Funktionen dürfen nicht beschädigt werden.
- Nutze reproduzierbare Tests.
- Berücksichtige die Performance.
- Dokumentiere alle geänderten Parameter.

14. ERWARTETE ERGEBNISSE

Erstelle folgende Dokumente:

1. GAME BALANCING AUDIT
   Vollständige Bestandsaufnahme und Analyse.

2. MATCH ENGINE TEST REPORT
   Ergebnisse der tatsächlich durchgeführten Simulationen.

3. BALANCING ISSUE LIST
   Alle identifizierten Probleme, nach Schweregrad sortiert.

4. BALANCING PROPOSAL
   Konkrete Verbesserungsvorschläge mit Begründung.

5. REGRESSION TEST PLAN
   Vorschlag für dauerhaft automatisierte Qualitätssicherung.

6. BALANCING CHANGELOG
   Dokumentation aller freigegebenen und durchgeführten Anpassungen.

15. ABLAUF UND FREIGABE

Arbeite in zwei getrennten Abschnitten.

ABSCHNITT A – AUDIT UND TESTS

- Codebasis untersuchen.
- Testumgebung aufbauen.
- Simulationen durchführen.
- Ergebnisse auswerten.
- Probleme identifizieren.
- Verbesserungsvorschläge erstellen.

In diesem Abschnitt keine produktiven Balancing-Änderungen durchführen.

ABSCHNITT B – BALANCING

Erst nach meiner ausdrücklichen Freigabe:

- Parameter gezielt anpassen.
- Kontrollierte Vergleichstests durchführen.
- Regressionstests ausführen.
- Ergebnisse dokumentieren.
- Verbesserungen in die Projekt-Roadmap übernehmen.

ABSCHLIESSENDES ZIEL

Ich möchte keinen Fußballmanager, der nur technisch funktioniert.

Ich möchte eine glaubwürdige Fußballsimulation, in der:

- Gute Mannschaften häufiger gewinnen, aber nicht immer.
- Außenseiter echte Chancen besitzen.
- Unterschiedliche Spielertypen sinnvoll sind.
- Taktik einen spürbaren Unterschied macht.
- Spielerattribute nachvollziehbar wirken.
- Statistiken realistische Fußballentwicklungen widerspiegeln.
- Über viele Spielzeiten eine abwechslungsreiche und glaubwürdige Fußballwelt entsteht.

Teste nicht, ob das Spiel funktioniert. Teste, ob es sich wie Fußball anfühlt.