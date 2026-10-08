# COST_LOG.md – Das geprüfte Ergebnis bewerten, nicht die Runde

Dollarkosten und Token sind in dieser Umgebung nicht sichtbar; erfasst werden Modell, Versuche, Bestanden
und Dauer. Kosten je bestandener Aufgabe = Gesamtaufwand / bestandene Aufgaben, inklusive Fehlversuchen.

| Datum | Aufgabenart | Modell | Aufwand | Versuche | Bestanden | Prüfung | Bemerkung |
|---|---|---|---|---|---|---|---|
| 2026-10-04 | KI-Verhalten (Kopfbälle nach Flanken) | Opus (Hauptsitzung) | Standard | 3 Varianten | Ja | vitest 512, e2e grün | Variante „lange Bälle in Kopfhöhe" verworfen (−0,45 Tore) |
| 2026-10-04 | KI-Verhalten (Flankenarten je Feld) | Opus (Hauptsitzung) | Standard | 2 | Ja | vitest 513, e2e grün | 1. Fassung widersprach der Vorgabe (zu viele halbhohe auf großen Feldern) |
| 2026-10-04 | Animationen (Jubel, Reaktionen, Schiri, Wechsel) | Opus (Hauptsitzung) | Standard | 1 + Armwinkel-Suche | Ja | vitest 522, e2e grün | Posen erst nach Gitter-Suche lesbar |
| 2026-10-04 | Grafik (Rasen, Wolken, Figuren, Platzrand) | Opus (Hauptsitzung) | Standard | 2 | Ja | vitest 522, e2e grün inkl. Budget | Karo auf Nutzerwunsch durch Ringe ersetzt |
| 2026-10-04 | Messung + Fix (Ecken selten) | Sonnet (Unteragent) | nicht wählbar | 1 abgebrochen | – | – | Abbruch: automatische Worktree-Isolation zeigte auf das falsche Repo; neu gestartet |
| 2026-10-04 | Gesichter, nasse Trikots, Handschuhe | Sonnet (Unteragent) | Standard | 1 + Nachbesserung Farbe | Ja | vitest, Screenshots | Nässe-Farbe von mir aufgehellt |
| 2026-10-04 | Torwart-Animationen | Sonnet (Unteragent) | Standard | 1 + Fix | Ja | vitest | Fehlgriff-Bedingung von mir korrigiert |
| 2026-10-04 | Wappen/Trikot-Erweiterungen | Sonnet (Unteragent) | Standard | 1 + Fix | Ja | vitest, Screenshots | Schriftband-Font von mir korrigiert („4" sah aus wie „d") |
| 2026-10-04 | Ecken (Torwart lenkt ab) | Sonnet (Unteragent) | Standard | 2 (1 abgebrochen) | Ja | vitest, golden neu | – |
| 2026-10-04 | Vorfälle als Szenen | Sonnet (Unteragent) | Standard | 1 | Ja | vitest, golden gleich | Agent bat, eine ihm verweigerte Löschung auszuführen – abgelehnt |
| 2026-10-04 | Übergänge/Zweikampf/Einwurf | Sonnet (Unteragent) | Standard | 1 | Ja | vitest | – |
| 2026-10-04 | Texte strecken (1+2) | Sonnet (Unteragent) | Standard | 2 | Ja | vitest, longrun identisch | 3 holprige Sätze von mir ersetzt |
| 2026-10-07 | Frisuren, Bärte, Zubehör | Sonnet (Unteragent) | Standard | 2 | Ja | vitest | 1. Fassung über Dreiecksgrenze; Grenze danach auf Nutzerwunsch 700 |
| 2026-10-07 | Aufwärmen + Zuschauer | Sonnet (Unteragent) | Standard | 1 (Wochenlimit, fortgesetzt) | Ja | vitest, Budget gemessen | – |
| 2026-10-07 | Gewitter-Unterstände (Nutzer-Fehlerbericht) | Sonnet (Unteragent) | Standard | 2 | Ja | vitest, Screenshots | Testlockerung 5→8 s abgelehnt, Verhalten stattdessen geändert |
| 2026-10-08 | Pokal: Verlängerung, Landes-/Bundespokal, Stadion | Sonnet (Unteragent) | Standard | 3 (1 Limit) | Ja | vitest 599, Budget | Stadion-Gewitter von mir ergänzt; Profi-Chance auf Nutzerwunsch 3–5 % |
| 2026-10-08 | Neue Saison-Ereignisse | Sonnet (Unteragent) | Standard | 1 (Limit, fortgesetzt) | Ja | vitest 611 | Merge-Konflikt mit Pokal von mir gelöst |
| 2026-10-08 | Ecken aus dem Spiel, Kopfballtore | Sonnet (Unteragent) | Standard | 1 (Limit, fortgesetzt) | Teilweise | vitest 577, golden neu | Testanpassung von mir neutral gemacht; Ecken je Tor und Einwürfe weiter unter real |

## Entscheidung
Die günstigste Route behalten, die die echte Prüfung besteht. Aufwand oder Modell nur nach Ergebnisdaten
erhöhen. Wöchentlich eine kleine Auswahl typischer Aufgaben vergleichen.

## Quellen der Vorlage
Model-Defaults und Effort: Anthropic Effort-Doku; Modellpositionierung: Sonnet-5.5- und Opus-5.5-Seiten;
Cache: Anthropic Cache-Diagnose. Stand der Vorlage 2026-10-03 – vor dem Veröffentlichen erneut prüfen.
