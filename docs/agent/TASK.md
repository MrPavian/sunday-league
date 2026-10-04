# TASK.md – Erfolg festlegen, bevor ausgeführt wird

Jede Aufgabe (auch jeder Unteragenten-Auftrag) bekommt diesen Vertrag. Abgeschlossene Aufgaben wandern mit
Ergebnis in `COST_LOG.md`; der Stand des Spiels steht in `ROADMAP.md`.

## Vorlage
```
<objective>
Für den Nutzer sichtbares Ergebnis: [ein Satz]
Heute: [was jetzt passiert]
Ziel: [was stattdessen passieren soll]
</objective>
<boundaries>
Im Umfang: [Funktionen, Dateien, Systeme]
Nicht im Umfang: [ausdrücklich ausgeschlossen]
Freigabe nötig: [was weiter eine menschliche Entscheidung braucht]
</boundaries>
<acceptance>
[ ] Das Zielszenario funktioniert mit echten Eingaben (echte Simulation, echte Seiten).
[ ] Die engste passende Prüfung besteht (CHECKS.md).
[ ] Ein Regressionstest deckt das geänderte Verhalten ab.
[ ] Was der Nutzer sieht, entspricht der Bitte (bei Grafik: Screenshot angesehen).
</acceptance>
<execution>
Vorhandene Umsetzung ansehen, bevor geändert wird. Kleinste plausible Änderung und ihre Prüfung nennen.
Bei wesentlich unklaren Anforderungen zuerst fragen, sonst ohne Zwischenrunden ausführen.
</execution>
<stop>
Wenn die Abnahme belegt ist: aufhören und berichten. Bei Blockade: die fehlende Entscheidung nennen, die
fertige Arbeit behalten, den Umfang nicht still erweitern.
</stop>
```

## Laufende Aufgaben (Oktober 2026)
| Aufgabe | Route | Abnahme |
|---|---|---|
| Ecken selten (ROADMAP 11.6) | Sonnet, Worktree `agent-ecken` | Ursache belegt; Ecken je Tor näher an Vergleichswert mit Quelle; Tore im Rauschen; neuer Test; vitest grün |
| Torwart-Animationen (ROADMAP 11.1) | Sonnet, Worktree `agent-keeper` | Fangen Brust/Kopf, Fausten beidhändig, Abschlag, Breitmachen, Fehlgriff sichtbar (Screenshots); keine neuen Draw Calls; Entscheidungslogik mit Simulation getestet; vitest grün |
| Gesichter, nasse Trikots, Torwartkleidung (ROADMAP 11.2) | Sonnet, Worktree `agent-faces` | Neue Gesichter im Spiel sichtbar (Screenshots); Erschöpfung aus Ausdauer getestet; keine neuen Draw Calls; vitest grün |
