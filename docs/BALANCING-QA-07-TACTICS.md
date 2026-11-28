# Balancing & Simulation QA – 7. Taktik und Spielsysteme (Phase 4)

Stand 2026-11-28, Code-Stand `73273bf`. Abschnitt A: nur gemessen, **nichts am Spielcode geändert**.
Skript `scripts/qa-tactics.mjs` (neu). Auftrag: `docs/BALANCING-QA-AUFTRAG.md` Phase 4 – „Es darf keine einzelne Taktik geben, die
unabhängig von Gegner und Spielermaterial dauerhaft überlegen ist.“

## 1. Was es im Spiel gibt

**[Code]** `sim/tactics.js` SYSTEMS je Format (je 3–4 Systeme), STYLES (7 Spielstile), `sim/plan.js` ORDER_EFFECTS (Befehle).

| Auftrag | im Spiel |
|---|---|
| 4-4-2, 4-2-3-1, 4-3-3, 3-5-2 | vorhanden (Großfeld) |
| 3-4-3, 5-3-2, 4-1-4-1 | **nicht vorhanden** – nicht gebaut (Auftrag: in Abschnitt A nichts neu einführen) |
| Ballbesitz · Hohes Pressing · Tief stehend · Konter · Flügel · Ausgewogen | Stile `kurzpass` · `pressing` · `mauern` · `konter` · `fluegel` · `ausgewogen` |
| Direktes Spiel · Zentrumsorientiert | kein eigener Stil – gemessen als Befehl Aufbau „direkt“ bzw. Angriffsweg „mitte“ auf `ausgewogen` |
| (zusätzlich) | Stil `offensiv` |

Kleinfeld-Systeme: 5er 2-1-1, Raute 1-2-1, 2-2, 1-1-2; 7er 2-3-1, 3-2-1, 2-2-2, 3-1-2.

## 2. Messung

- Grundkader wie `docs/BALANCING-QA-04-ATTRIBUTES.md` Abschnitt 6 (angehoben auf ein Niveau), beide Mannschaften aus demselben Kader.
- Je Spiel ziehen beide Mannschaften unabhängig ein System und eine von 9 Spielweisen (gleichverteilt). Mannschaft 0 bekommt
  zusätzlich einen Stärkeunterschied d (gleichverteilt ±0,15 auf alle Spielwerte außer Spielintelligenz).
- KI-Trainer aus (`aiCoach: false`): gemessen wird die gewählte Taktik, nicht ein Wechsel während des Spiels. In Ligaspielen ist
  der KI-Trainer an – die Werte gelten für die Grundausrichtung.
- Auswertung: Regression der Tordifferenz auf d und die Unterschiede (Heim − Gast) von System und Spielweise (Bezug 4-4-2 bzw.
  erstes System, `ausgewogen`); Spielweise gegen Spielweise um d bereinigt (je Paarung 70–100 Spiele, Standardfehler 0,15–0,3);
  Außenseiter = |d| ≥ 0,08.
- **Durchgeführt: 10 800 Spiele** – Ascheplatz 5er Niveau 1 (Liga 1–2), Rasenplatz 7er Niveau 1, Großfeld Niveau 5, je 3 600.

## 3. Ergebnisse

### 3.1 Wirkung der Spielweise (Tordifferenz je Spiel gegenüber `ausgewogen`, ± Standardfehler)

| Spielweise | 5er | 7er | Großfeld | Außenseiter 5er / 7er / Großfeld |
|---|---|---|---|---|
| Ballbesitz (`kurzpass`) | **−0,47 ± 0,09** | −0,04 ± 0,09 | **+0,22 ± 0,07** | **−0,81** / −0,01 / +0,09 |
| Hohes Pressing | −0,12 ± 0,09 | −0,04 ± 0,09 | +0,05 ± 0,07 | −0,03 / **−0,39** / −0,11 |
| Tief stehend (`mauern`) | **+0,57 ± 0,09** | **+0,38 ± 0,09** | **−0,16 ± 0,07** | **+0,59** / +0,19 / **−0,22** |
| Konter | **+0,51 ± 0,09** | **+0,75 ± 0,09** | +0,10 ± 0,07 | **+0,49** / **+0,74** / −0,01 |
| Direkt (Befehl) | −0,04 ± 0,09 | +0,16 ± 0,09 | +0,03 ± 0,07 | −0,15 / −0,12 / −0,11 |
| Flügel | −0,19 ± 0,09 | +0,19 ± 0,09 | −0,05 ± 0,07 | −0,10 / +0,15 / +0,08 |
| Zentrum (Befehl) | −0,02 ± 0,09 | **+0,38 ± 0,09** | **+0,20 ± 0,06** | +0,29 / +0,07 / +0,12 |
| Offensiv | **−0,26 ± 0,09** | +0,11 ± 0,09 | +0,10 ± 0,07 | −0,18 / −0,15 / +0,07 |

Zum Vergleich: +0,1 auf allen Spielwerten bringt 1,06 (5er) / 1,02 (7er) / 0,55 (Großfeld) Tore je Spiel. Die beste Spielweise
im 7er (Konter +0,75) ist damit so viel wert wie rund +0,07 auf allen Werten – etwa der Abstand von einer halben Liga.

### 3.2 Dominante Spielweisen (Spielweise gegen jede andere)

- **5er: `mauern` gewinnt gegen jede andere Spielweise** (+0,16 gegen Konter, +0,44 … +0,88 gegen den Rest), bei Favoriten
  (+0,63 ± 0,14), ausgeglichenen Spielen (+0,64 ± 0,12) und Außenseitern (+0,65 ± 0,11) gleich. Konter gewinnt gegen alle außer
  Mauern.
- **7er: `konter` gewinnt gegen jede andere Spielweise** (+0,32 … +0,94), in allen vier Systemen (+0,44 … +0,86) und bei Favoriten
  (+0,72 ± 0,12), ausgeglichen (+0,33 ± 0,12) und Außenseitern (+0,77 ± 0,11).
- **Großfeld: keine dominante Spielweise.** Ballbesitz ist vorn (+0,22), verliert aber gegen Zentrum (−0,09) und ist gegen Offensiv
  gleich (−0,01); in 4-3-3 ohne Vorteil (+0,04 ± 0,09). Mauern ist die schwächste (−0,16), auch als Außenseiter (−0,22).

Beide Befunde auf dem Kleinfeld verletzen die Vorgabe des Auftrags. Kleinfeld ist Liga 1–4, also der Anfang jeder Karriere.

### 3.3 Systeme (Tordifferenz gegenüber dem ersten System)

| Format | Systeme |
|---|---|
| 5er | 2-1-1 0 · Raute **−0,28 ± 0,06** · 2-2 **−0,25 ± 0,06** · 1-1-2 +0,10 ± 0,06 |
| 7er | 2-3-1 0 · 3-2-1 **+0,18 ± 0,06** · 2-2-2 **−0,18 ± 0,06** · 3-1-2 +0,03 ± 0,06 |
| Großfeld | 4-4-2 0 · 4-3-3 **−0,14 ± 0,04** · 4-2-3-1 **−0,09 ± 0,04** · 3-5-2 +0,04 ± 0,04 |

Unterschiede bis 0,3 Tore je Spiel, kein System klar übermächtig.

### 3.4 Kennzahlen je Spielweise (je Mannschaft und Spiel)

| Spielweise | Ballbesitz % 5er / 7er / Groß | Schüsse 5er / 7er / Groß | Flanken Groß | Steilpässe Groß | xG je Steilpass Groß |
|---|---|---|---|---|---|
| Ausgewogen | 51,0 / 51,1 / 51,1 | 12,3 / 12,4 / 7,0 | 2,6 | 7,3 | 0,037 |
| Ballbesitz | 50,7 / 51,8 / 51,2 | 11,0 / 11,6 / 7,3 | 2,2 | 8,0 | 0,039 |
| Pressing | 49,9 / 50,0 / 49,7 | 13,4 / 13,6 / 7,7 | 2,8 | 7,7 | 0,039 |
| Mauern | 49,9 / 49,1 / 49,3 | 13,8 / 14,7 / 7,4 | 2,0 | 4,3 | 0,045 |
| Konter | 49,0 / 48,4 / 48,9 | 15,6 / 16,8 / 8,5 | 2,5 | 5,3 | 0,050 |
| Direkt | 50,2 / 49,6 / 49,1 | 13,0 / 13,4 / 7,7 | 2,4 | 8,2 | 0,042 |
| Flügel | 50,9 / 50,9 / 50,9 | 11,1 / 11,7 / 6,0 | **4,5** | 6,6 | 0,032 |
| Zentrum | 50,0 / 50,3 / 50,7 | 15,4 / 16,6 / 8,7 | 1,4 | 7,1 | 0,044 |
| Offensiv | 48,5 / 48,7 / 49,2 | 15,1 / 14,9 / 7,6 | 3,0 | 7,4 | 0,041 |

- **Ballbesitz-Anteil kaum beeinflussbar** (48,4–51,8 %): Der Ballbesitz-Stil bringt +0,1 bis +0,7 Prozentpunkte. Echte
  Unterschiede zwischen Ballbesitz- und Konterteams liegen bei 10–20 Prozentpunkten (Problemliste I6; Vergleichswert noch mit
  Quelle zu belegen).
- **Konter und Mauern schießen am meisten** (Kleinfeld 14–17 Schüsse gegen 11–12 bei Ballbesitz) – obwohl sie weniger Ball haben.
- Flügelspiel verdoppelt die Flanken, bringt aber weniger Schüsse und xG (passt zu Kopfball ohne Wirkung, I14).
- Ein Steilpass ist auf dem Großfeld 0,03–0,05 xG wert (vgl. Diagnose Übersicht, Bericht 04 Abschnitt 7).

## 4. Antworten auf die Fragen aus Phase 4

| Frage | Antwort |
|---|---|
| Welche Systeme funktionieren gut / schwach? | 5er 1-1-2 und 2-1-1 vor Raute und 2-2; 7er 3-2-1 vorn, 2-2-2 hinten; Großfeld 4-4-2 und 3-5-2 vor 4-3-3. Unterschiede ≤ 0,3. |
| Dominante Kombinationen? | **Ja, auf dem Kleinfeld:** Mauern im 5er, Konter im 7er – gegen jede Spielweise, in jedem System, bei jeder Stärke. Großfeld nein. |
| Sind taktische Anpassungen sinnvoll? | Auf dem Großfeld ja (Spielweisen schlagen sich gegenseitig, z. B. Zentrum schlägt Konter +0,39, Konter schlägt Flügel +0,40). Auf dem Kleinfeld gibt es eine beste Antwort auf alles. |
| Können Außenseiter durch Taktik Vorteile erzielen? | Ja, auf dem Kleinfeld stark (Mauern / Konter +0,5 … +0,77, so viel wie ~0,05–0,07 auf allen Werten). Auf dem Großfeld kaum (bestes +0,12). |
| Ist eine Formation unabhängig von der Qualität übermächtig? | Keine Formation; aber **eine Spielweise je Kleinfeld-Format** (s. o.). |

## 5. Was daraus folgt (nur Befund, Änderungen erst in Abschnitt B)

- **I16 (S1):** dominante Spielweisen auf dem Kleinfeld. CPU-Vereine wählen ihren Stil fest per Zufall aus dem Vereinsnamen
  (`sim/tactics.js` clubTactic, Liste mit 2× ausgewogen, je 1× offensiv, konter, fluegel, kurzpass, pressing, mauern) – Vereine mit
  Mauern/Konter haben damit dauerhaft einen Vorteil, Ballbesitz-Vereine im 5er einen Nachteil. Spielende können es ausnutzen.
  Vermutung (nicht geprüft): Auf kleinen Plätzen ist ein tiefer, kompakter Block ohnehin nah am Ball und der Weg zum Tor kurz, ohne
  dass der Gegner dafür etwas bezahlt – Pressing und Ballbesitz bringen keinen Gegenwert. Zusammenhang mit I15 (passive Zonendeckung)
  offen.
- **I6 (S3, bestätigt):** Spielweise ändert den Ballbesitz kaum.
- Prüfung in Abschnitt B: Warum schießen Mauern/Konter mehr – Schüsse je Ballgewinn nach Höhe des Ballgewinns, Wege bis zum Abschluss.
