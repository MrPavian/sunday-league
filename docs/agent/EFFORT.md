# EFFORT.md – Denktiefe nach Arbeitslast

## Fakten
- Claude-API-Standard: Sonnet 5.5 = high, Opus 5.5 = medium; beide kennen low, medium, high, xhigh, max.
- Aufwand steuert Verhalten, ist kein festes Token-Budget.
- In dieser Umgebung lässt sich für Unteragenten nur das Modell wählen, nicht die Aufwandsstufe. Stattdessen
  wird der Auftrag verbessert (mehr Kontext, engere Prüfung) – das ist ohnehin Schritt 2 unten.

## Startpunkt
- Sonnet, agentisches Programmieren: medium für klare, umrissene Arbeit; high für längere oder schwerere.
- Opus: beim Standard medium beginnen; nur höher, wenn Prüfungen bei dieser Arbeit echten Gewinn zeigen.

## Höher gehen
1. Erst die fehlschlagende Prüfung oder die offene Entscheidung benennen.
2. Den Auftrag und den Kontext verbessern, bevor mehr Denken ausgegeben wird.
3. Eine Stufe höher, dieselbe Prüfung erneut laufen lassen.
4. xhigh/max nur nach gemessenem Gewinn.

## Nicht verwechseln
Mehr Aufwand heißt nicht mehr Umfang. Eine längere Antwort ist keine besser erledigte Aufgabe.
Steuerungen in Claude Code können von API-Einstellungen abweichen – die tatsächliche Oberfläche prüfen.

## Protokoll
Modell, Aufwand (soweit wählbar), Prüfungen, Wiederholungen, Dauer in `COST_LOG.md`.
