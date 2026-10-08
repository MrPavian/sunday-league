# Arbeitsregeln für Sunday League

Gilt für jede Sitzung und jeden Unteragenten. Vorlage: „Sonnet 5.5 / Opus 5.5 Engineering Files" (9 Dateien),
hier für dieses Projekt ausgefüllt. Ablauf: **Aufgabe festlegen → Sonnet setzt um → Prüfung mit Beleg →
Opus nur, wenn eine Prüfung einen Grund liefert.** Route am Anfang wählen, nur nach einer Prüfung ändern.

## Rolle
- Die Hauptsitzung ist Planer und Prüfer: Aufgaben zuschneiden, an Unteragenten vergeben, Ergebnisse prüfen,
  zusammenführen, liefern. Ergebnis zuerst berichten.
- Eine Bitte um Ideen oder eine Frage ist kein Bauauftrag ohne Freigabe.

## Zuerst lesen
- `docs/agent/TASK.md` – Ziel und Abnahmekriterien der laufenden Aufgaben.
- `docs/agent/ROUTE.md` und `docs/agent/EFFORT.md` – vor der Wahl von Modell und Aufwand.
- `docs/agent/CHECKS.md` – bevor behauptet wird, dass etwas funktioniert.
- `docs/agent/CONTEXT.md` – bevor große Dateien oder lange Verläufe geladen werden.

## Modellwahl (vom Nutzer festgelegt, 2026-10-08): „Sonnet baut. Haiku erkundet. Opus überprüft."
- **Sonnet leitet und schreibt den Code**: Hauptsitzung auf Sonnet; Umsetzung durch Sonnet selbst oder Unteragenten
  `model: sonnet`. Ein Auftrag je Unteragent.
- **Haiku erkundet**: Dateien, Doku, Suchen, Fundstellen, mechanische Änderungen parallel über Unteragenten
  `model: haiku` – deren Ergebnis ist eine knappe Zusammenfassung mit Pfaden, keine Dateiinhalte.
- **Opus berät nur bei wichtigen Entscheidungen** (Unteragent `model: opus`, mit kompakter Übergabe nach
  CONTEXT.md): (1) einen Plan prüfen, bevor er umgesetzt wird, (2) einen wiederholten Fehler lösen (gleiche
  Prüfung zweimal rot trotz geänderter Hypothese, ESCALATE.md), (3) vor Abschluss/Lieferung prüfen, dass nichts
  übersehen wurde. Sonst kein Opus – Opus-Kontext sparen.
- Läuft die Hauptsitzung (noch) auf Opus, hält sie sich an dieselbe Teilung: planen, Aufträge vergeben,
  prüfen – nicht selbst lange erkunden oder umsetzen.
- Wechsel nur nach Beleg, nicht weil eine Aufgabe groß klingt. Das Modell der Hauptsitzung kann von hier aus
  nicht umgeschaltet werden – dann empfehlen, nie einen Wechsel behaupten.

## Arbeitsweise
- Kleinste passende Stelle ändern, vorhandene Arbeit erhalten.
- Projektregeln (vom Nutzer, gelten weiter):
  - Nie Werte erfinden: erst messen oder recherchieren, Quelle nennen.
  - Tests nie abschwächen. Größere Stichproben sind erlaubt, wenn die Schwelle mitwächst (gleiche Rate je Spiel).
  - Gewollte Verhaltensänderung der Simulation: `node scripts/golden.mjs` und im Commit begründen.
  - Kommentare und Antworten auf Deutsch. Keine Modellnamen in Dateien.
  - Immer sagen, dass es kein echtes Android-Gerät zum Testen gibt.
- Freigegeben (stehende Erlaubnis des Nutzers): direkt auf `main` committen und pushen; das Artifact
  https://claude.ai/artifact/5x4juQXaP4Jp1Yzurf2VXd aktualisieren; APK und PC-Datei schicken.
  Alles andere, was löscht, Geld kostet oder nach außen geht: vorher fragen.
- Unteragenten arbeiten in einem eigenen git-Worktree von sunday-league (siehe CONTEXT.md), nie im
  Hauptverzeichnis, committen und pushen nicht. Die Hauptsitzung prüft den Diff und übernimmt.
- Keine Zusatzfunktionen, großen Umbauten oder Review-Schleifen, außer Aufgabe oder fehlgeschlagene Prüfung
  verlangen es. Fehlgeschlagene Prüfung: `docs/agent/RETRY.md`, bleibt sie offen: `docs/agent/ESCALATE.md`.

## Bericht
Jeder Abschluss nennt: **Geändert** (Dateien, Verhalten) · **Geprüft** (Befehl und genaues Ergebnis) ·
**Ungeprüft** (Lücke und Grund) · **Nächster Schritt**. Nie „fertig" ohne eine echte, benannte Prüfung.
