# ROUTE.md – Sonnet zuerst oder Opus zuerst?

Grundteilung (Nutzer, 2026-10-08): Sonnet leitet und baut, Haiku erkundet parallel, Opus berät nur bei
Planprüfung, wiederholtem Fehler und Abschlussprüfung (siehe CLAUDE.md „Modellwahl").

Startregel, kein allgemeiner Benchmark. Modell nach Form der Aufgabe und nach eigenen Ergebnissen
(`COST_LOG.md`) wählen.

## Sonnet zuerst
Umrissene Code-Änderungen, Tests, UI- und Grafik-Korrekturen, Routinerecherche, klar beschriebene
Messaufgaben. Immer mit vollständigem Auftrag (TASK.md) und konkreter Prüfung (CHECKS.md).
Beispiele hier: neue Animationen/Posen, Texturen, Ereignistexte, Messskripte, Tests für vorhandenes Verhalten.

## Opus zuerst
Ungelöste Architektur, systemübergreifende Abwägungen, lange Aufgaben mit vielen Abhängigkeiten.
Beispiele hier: KI-Verhalten, das Tore/Schussquote/Kombinationen gleichzeitig verschiebt (Ablation nötig);
Spielstand-Kompatibilität; Wirtschaft über viele Saisons. Außerdem: nachdem ein konkreter Sonnet-Fehlschlag
eine geänderte Hypothese und eine wiederholte Prüfung überstanden hat.

## Nicht wechseln
- nicht, um eine vage Aufgabe als „schwer" umzuetikettieren;
- nicht, indem der ganze Verlauf an ein neues Modell geht (Übergabe nach CONTEXT.md);
- ein anderes Modell ersetzt keine Tests.

## Protokoll je Aufgabe
`Aufgabe: [Art]  Start: [Modell]  Grund: [beobachtbarer Grund]  Prüfung: [Befehl]  Ergebnis: [bestanden/fehlgeschlagen/nicht gelaufen]`
Routen nach Kosten je geprüftem Ergebnis bewerten, nicht nach Preis je Token (COST_LOG.md).
