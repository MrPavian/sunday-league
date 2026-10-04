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

## Entscheidung
Die günstigste Route behalten, die die echte Prüfung besteht. Aufwand oder Modell nur nach Ergebnisdaten
erhöhen. Wöchentlich eine kleine Auswahl typischer Aufgaben vergleichen.

## Quellen der Vorlage
Model-Defaults und Effort: Anthropic Effort-Doku; Modellpositionierung: Sonnet-5.5- und Opus-5.5-Seiten;
Cache: Anthropic Cache-Diagnose. Stand der Vorlage 2026-10-03 – vor dem Veröffentlichen erneut prüfen.
