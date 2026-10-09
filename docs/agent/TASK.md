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

## Reihenfolge (vom Nutzer festgelegt, 2026-10-04)
1. Animationen: restliche Punkte aus ROADMAP 11.1 (Torwart inkl. Abrollen/Abtauchen, Reaktionen bei Vorfällen,
   Einwurf mit Anlauf, Aufwärmen am Rand, Zuschauer, weichere Übergänge, Körpereinsatz).
2. Aussehen (11.2) plus Erweiterungen von Wappen-Editor und Trikots.
3. Ereignisse (11.5, Wiederholungen im Langzeitlauf).
4. Pokal: Verlängerung, Landespokal, ein überregionaler Pokal mit erfundenem Namen (nicht „DFB-Pokal") und als
   Höhepunkt ein Spiel gegen einen Profiverein (ebenfalls erfunden, keine echten Vereine).
5. Kopfballtore und Ecken, danach eine Prüfung aller Plätze und Spielerstärken auf Auffälligkeiten.
Unabhängige Bereiche (andere Dateien) dürfen parallel laufen; geliefert wird in dieser Reihenfolge.

## Nächste Wünsche (vom Nutzer festgelegt, 2026-10-08)
1. Fouls und Elfmeter (deutlich zu selten; real recherchierte Vergleichswerte, Karten, Vorteil, Sperren).
2. Mehr und verbesserte Spieleranimationen (u. a. Fallen nach Foul, Reklamieren, Karte zeigen, Dehnen am Rand).
3. Ausbau der Ereignisse.
4. Ausbau des Sponsorings.
Parallel möglich: 1 (Sim) mit 4 (Karriere); danach 2 (baut auf 1 auf) und 3.

## Danach (vom Nutzer festgelegt, 2026-10-09)
Nach der Lieferung von Fouls/Animationen/Ereignissen/Sponsoring: Ereignisse für die noch dünnen Bereiche –
Training und Ehrenamt in Saisonmitte und -ende, Schiri in der untersten Liga (Messung: scripts/events-audit.mjs).

## Gesperrt bis zum ausdrücklichen Auftrag (vom Nutzer festgelegt, 2026-10-07)
Couch-Koop, Online-Liga mit Freunden, Editoren und Modding (ROADMAP Phase 8) bleiben auf der Roadmap, werden
aber erst bearbeitet, wenn der Nutzer das ausdrücklich beauftragt. Nicht von sich aus vorschlagen oder anfangen.

## Laufende Aufgaben (Oktober 2026)
| Aufgabe | Route | Abnahme |
|---|---|---|
| Ecken selten (ROADMAP 11.6) | Sonnet, Worktree `agent-ecken` | Ursache belegt; Ecken je Tor näher an Vergleichswert mit Quelle; Tore im Rauschen; neuer Test; vitest grün |
| Torwart-Animationen (ROADMAP 11.1) | Sonnet, Worktree `agent-keeper` | Fangen Brust/Kopf, Fausten beidhändig, Abschlag, Breitmachen, Fehlgriff sichtbar (Screenshots); keine neuen Draw Calls; Entscheidungslogik mit Simulation getestet; vitest grün |
| Gesichter, nasse Trikots, Torwartkleidung (ROADMAP 11.2) | Sonnet, Worktree `agent-faces` | Neue Gesichter im Spiel sichtbar (Screenshots); Erschöpfung aus Ausdauer getestet; keine neuen Draw Calls; vitest grün |
| Ereignisse: weniger Wiederholungen (ROADMAP 11.5) | Sonnet, Worktree `agent-events` | Langzeitlauf vorher/nachher mit gleichen Seeds: meistwiederholte Texte deutlich seltener; DE und EN vollständig; vitest grün |
