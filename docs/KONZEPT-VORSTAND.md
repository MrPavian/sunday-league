# Konzept: Vorstand und Erfolgsdruck

Stand 2026-11-05. Vom Nutzer gewünscht (ROADMAP 11.13, „Stuhl wackelt bei Negativserie“). Entscheidungen vom 2026-11-05:

- **Folge:** Ultimatum, dann Wechsel. Wer entlassen ist, bekommt Angebote anderer Vereine, und die Karriere geht dort weiter.
- **Stärke des Drucks:** wächst mit der Liga. In der Freizeitliga gibt es keinen Druck, in den Kreisligen kaum welchen, ab der
  Landesliga deutlichen, in Regionalliga und 3. Liga harten.
- **Als Präsident:** Die Mitglieder machen Druck. Ein knapp verlorener Misstrauensantrag kostet den eingestellten Trainer, man
  bleibt Präsident und holt einen neuen. Bei einem deutlich verlorenen oder dem zweiten verlorenen Antrag binnen zwei Saisons ist
  man abgewählt und bekommt Angebote als Trainer.
- **Nur neue Karrieren:** Kennung `career.pressure`.

Alle Zahlen sind **Spielwerte**. Eine Quelle zur Geduld von Vorständen gibt es nicht. Eingestellt sind sie mit
`scripts/pressure-audit.mjs`.

## Rückhalt (`career/pressure.js`)

- **Startwert:** 0–100, Start 60, nach einem Vereinswechsel 55.
- **Je Ligaspiel:** (Punkte − Erwartung) × 4 × Gewicht der Liga.
  - Erwartung nach dem Saisonziel des Vorstands: Aufstieg 1,7, obere Hälfte 1,3, nicht Letzter 0,9 Punkte.
  - Ab drei Niederlagen in Folge zusätzlich −3 × Gewicht je Spiel.
- **Gewicht je Stufe 1–10:** 0 · 0,1 · 0,15 · 0,2 · 0,3 · 0,4 · 0,5 · 0,6 · 0,75 · 0,9.
- **Saisonende:**
  - Ziel weit übertroffen +20, erreicht +10, verfehlt −15 × Gewicht.
  - Aufstieg +15, Abstieg −20 × Gewicht.
- **Unter 40:** Warnung im Chat.
- **Unter 25 – Ultimatum:** vier Punkte aus den nächsten drei Ligaspielen.
  - Geschafft: Rückhalt 40.
  - Nicht geschafft: entlassen.
  - In den letzten drei Spieltagen gibt es kein Ultimatum mehr. Dann entscheidet der Sommer: unter 5 sofort entlassen, sonst
    Ultimatum für die ersten drei Spiele der neuen Saison.
- **Als Präsident:** Unter 25 kommt statt des Ultimatums ein Misstrauensantrag.
  - Liegt der Rückhalt bei mindestens 12 und gab es keinen verlorenen Antrag in den letzten zwei Saisons, ist er knapp verloren.
  - Sonst ist man abgewählt.

## Vereinswechsel (`career/clubchange.js`)

- **Angebote:** bis zu drei Vereine derselben Liga, eher aus der unteren Tabellenhälfte, fest je Saison und Spieltag. Bis zur Wahl
  zeigt der Startbildschirm nur die Angebote.
- **Was man übernimmt:** Kader, Tabellenplatz und Spielplan des neuen Vereins. Der alte Verein spielt als CPU-Verein weiter.
- **Was neu anfängt:** alles, was am Verein hängt, also Kasse, Anlage, Platz, Sponsoren, Jugend, Ämter, Feste, Chronik, Rivalen,
  Frauenteam und Alte Herren. Die Startkasse sind sechs mittlere Heimspiele der Liga.
- **Grundausstattung nach Liga:**
  - ab der Bezirksliga Flutlicht, Grill und Stehstufen;
  - ab der Landesliga eine Tribüne;
  - ab der Verbandsliga Sitzplätze und ein Tribünendach;
  - ab der Oberliga das Stadion;
  - in der 3. Liga das Drittliga-Stadion und Flutlicht 800 Lux.
- **Was bleibt:** alles, was an der eigenen Figur hängt, also Familie, Kraft, Auszeichnungen, Vermächtnis und Kenntnis der Spieler.
  Ein Spielertrainer nimmt sich selbst mit.
- **Frühere Vereine:** stehen in `career.pastClubs` und unter Verein → Du.

## Messung (`scripts/pressure-audit.mjs 4 4`)

Vier Karrieren mit je vier Saisons je Zeile. Das ist eine kleine Stichprobe, die Werte schwanken um einige Prozentpunkte.

Die Formen sind zufällige Ergebnisse:

- gut: 45 % Siege, 25 % Remis;
- mittel: 33 % Siege, 27 % Remis;
- schlecht: 20 % Siege, 25 % Remis.

Angegeben ist der Anteil der Saisons mit Entlassung.

| Stufe | gut | mittel | schlecht |
|---|---|---|---|
| 1 Freizeitliga | 0 % | 0 % | 0 % |
| 3 Kreisklasse B | 0 % | 0 % | 0 % |
| 5 Bezirksliga | 0 % | 0 % | 6 % |
| 7 Verbandsliga | 0 % | 6 % | 13 % |
| 9 Regionalliga | 0 % | 6 % | 19 % |
| 10 3. Liga | 0 % | 13 % | 38 % |
