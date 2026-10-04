# CONTEXT.md – Arbeitsmenge klein und stabil halten

## Laden
Mit Aufgabe, geltenden Regeln und der kleinsten Dateimenge beginnen, die die nächste Frage beantwortet.
Nur erweitern, wenn eine Abhängigkeit oder eine fehlgeschlagene Prüfung darüber hinaus zeigt; für jede
Erweiterung einen kurzen Grund behalten.

Karte des Repos:
- `src/sim/` – deterministische Spielsimulation (ai.js KI, actions.js Pässe/Schüsse/Kopfbälle, match.js Ablauf,
  setpieces.js Standards, pitch.js Plätze). Änderungen hier verschieben den Golden-Test.
- `src/render/` – three.js-Darstellung (PlayerModel.js Figuren und Posen, MatchView.js Simulation → Figuren,
  reactions.js reine Reaktionslogik, PixelRenderer.js Post-Shader, textures.js Böden, venues/ Spielorte,
  quality.js Qualitätsstufen).
- `src/career/` – Karriere, Ligen, Pokale, Ereignisse. `src/ui/` – Oberfläche.
- `tests/` – vitest; `scripts/e2e/` – Browsertests; `ROADMAP.md` – Stand und offene Punkte.

## Weglassen
Keine ganzen Logs, doppelten Suchen oder das halbe Repo in einen Auftrag. Genaue Belegstellen
(Datei:Zeile, Befehl) statt Abschriften. Nie Geheimnisse in eine Übergabe.

## Unteragenten-Arbeitskopie
Eigener git-Worktree von sunday-league im Scratchpad, angelegt von der Hauptsitzung:
`git -C /home/user/sunday-league worktree add -b agent-<name> <scratchpad>/wt-<name> HEAD` und
`ln -s /home/user/sunday-league/node_modules <scratchpad>/wt-<name>/node_modules`.
Nicht die automatische Worktree-Isolation des Agent-Werkzeugs verwenden: Die legt den Worktree im
Arbeitsverzeichnis der Sitzung an (AKAI-MPC-Sample-Teacher), nicht in sunday-league.
Dev-Server je Agent auf eigenem Port (e2e nutzt 4199, Hauptsitzung 5199).

## Übergabe (kompakt)
`Ziel: [ein Satz]  Dateien: [Pfade]  Bekannte Fakten: [geprüft]  Fehlgeschlagene Prüfung: [genaues Ergebnis]
Nächste Frage: [eine umrissene Entscheidung]` – diesen Stand schicken, keinen Verlauf.
