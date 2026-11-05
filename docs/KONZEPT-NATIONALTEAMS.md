# Konzept: Turniere der Nationalmannschaften (Entwurf, 2026-11-05)

Vom Nutzer gewünscht (2026-11-05): Weltmeisterschaft, Europameisterschaft, Afrikameisterschaft und alle anderen
Kontinentalmeisterschaften simulieren. Spieler können dort ihren Marktwert steigern. Für später: Nationaltrainer werden.

Status: **Entwurf, noch nicht gebaut.** Werte mit „Spielwert“ sind frei gewählt, mit „Quelle“ belegt, mit „prüfen“ noch offen.

## 1. Grundidee

- Die Turniere laufen **im Hintergrund** und werden mit dem Schnellmodell simuliert (wie die fremden Ligen, `pyramid.js`
  `simTable`, und die Pokalrunden, `pokal.js` `QUICK`). Kein 3D-Spiel, keine neue Match-Engine, der Golden-Test bleibt gleich.
- Wer im eigenen Kader nominiert wird, ist für die Turnierzeit weg. Nach dem Turnier kommt er mit Einsätzen, Toren,
  Note und einem **Turnier-Schub auf den Marktwert** zurück, der mit der Zeit wieder abklingt.
- Gemeldet wird alles im Chat und im Kreisblatt: Nominierung, Tore, Ausscheiden, Titel.
- Nur Länder und Turnierarten sind echt. Spieler, Trainer und Vereine bleiben erfunden. Turniernamen werden neutral
  beschrieben („Weltmeisterschaft“, „Afrikameisterschaft“), ohne Markennamen der Verbände – wie beim Bundespokal.

## 2. Turniere und Kalender

| Turnier (im Spiel) | Teilnehmer | Rhythmus | Zeit in der Saison | Quelle |
|---|---|---|---|---|
| Weltmeisterschaft | 48 | alle 4 Jahre | Sommerpause | 48 Teams ab 2026 (prüfen: Quelle verlinken) |
| Europameisterschaft | 24 | alle 4 Jahre, 2 Jahre versetzt zur WM | Sommerpause | prüfen |
| Afrikameisterschaft | 24 (6 Gruppen à 4) | Ausgabe 2025 im Winter | **Winter (Dezember–Januar)** | Flashscore, Afrika-Cup 2025: 21.12.2025–18.01.2026, 24 Teams in sechs Gruppen |
| Asienmeisterschaft | 24 | alle 4 Jahre | Winter (Januar) | prüfen |
| Südamerikameisterschaft | 16 (10 + 6 Gäste) | alle 4 Jahre, im Takt der EM | Sommerpause | Wikipedia „2028 Copa América“: 16 Teams erwartet, eine andere Meldung nennt 20 – prüfen |
| Nord- und Mittelamerikameisterschaft | 16 | alle 2 Jahre | Sommerpause | prüfen |
| Ozeanienmeisterschaft | 8 | prüfen | Sommerpause | prüfen |

Wichtig für das Spiel: Fast alle Turniere fallen in die Sommerpause und kosten keine Ligaspiele. Die Afrikameisterschaft
und die Asienmeisterschaft liegen im Winter. Wer dorthin fährt, **fehlt in der Rückrunde einige Spieltage**. Das ist wie
in echt und gibt eine Entscheidung: einen afrikanischen Stammspieler holen, der dann im Januar fehlt?

Die Turnierjahre hängen an der Saisonzahl der Karriere (Saison 1 = Startjahr des Kalenders, `calendar.js`), damit jede
Karriere denselben Takt hat.

## 3. Wer spielt für wen?

Die Spieler haben schon eine Herkunft (`origins.js`: de, tr, pl, yu, it, gr, pt, ar, wa, ua, ro, al, afg, bg, ir, vn …).
Daraus wird beim ersten Bedarf **einmal** die Nationalität für das Nationalteam festgelegt (fest je Spieler, aus dem Seed):

- `de` → Deutschland.
- Doppelte Möglichkeiten wie in echt: `tr` → Türkei oder Deutschland, `pl` → Polen oder Deutschland, `it`, `gr`, `pt` …
  ebenso. Wer für Deutschland zu schwach ist, nimmt eher das Land der Eltern.
- Sammelherkünfte werden auf Länder verteilt: `yu` → Serbien, Kroatien, Bosnien und Herzegowina, Montenegro, Nordmazedonien;
  `wa` → Ghana, Nigeria, Senegal, Elfenbeinküste, Kamerun …; `ar` → Marokko, Tunesien, Algerien, Ägypten, Libanon …
  (Verteilung Spielwert, nach Namen passend, wo möglich).
- Die übrigen Länder eines Turniers bekommen erfundene Kader aus dem Spielerpool, mit der Stärke ihres Landes.

## 4. Stärke der Länder und Nominierung

- Jedes Land bekommt eine **Stärkestufe** (Spielwert, grob nach Weltranglisten-Gruppen, prüfen): Spitze, stark, mittel,
  klein. Die Stufe legt fest, wie gut der Kader ist und **ab welcher Spielerstärke** jemand nominiert wird.
- Beispiel (Spielwert, an `PRO_TARGET` angelehnt): Spitzenland nominiert ab dem Niveau der 1. Liga (Stärke ≈ 186+),
  mittleres Land ab der 2. Liga (≈ 171), kleines Land auch Spieler aus der 3. Liga oder Regionalliga (≈ 141–156).
  So kann auch ein Regionalliga-Spieler zur Afrikameisterschaft fahren – das passiert bei kleinen Ländern wirklich.
- Kadergröße 26 (WM 2026, prüfen). Nominiert werden die besten Spieler des Landes aus allen Vereinen des Spiels,
  eigene und CPU-Vereine; aufgefüllt wird mit erfundenen Spielern.

## 5. Simulation

- Gruppenphase und K.-o.-Runden mit dem Schnellmodell: Torerwartung aus der Stärke der besten elf, Elfmeterschießen
  wie im Spiel (`shootout.js`).
- Je Spiel bekommt jeder eingesetzte eigene Spieler Einsatzminuten, eventuell Tore und eine Note (wie im Spielbericht).
- Verletzungen und Müdigkeit: kleine Wahrscheinlichkeit, verletzt oder müde zurückzukommen (Spielwert).

## 6. Marktwert

- **Turnier-Schub**: Ein Faktor auf Marktwert, Ablöse und Gehaltsforderung (`transfers.js` `priceOf`,
  `contracts.js` `salaryDemand`, `transferFee`). Er wächst mit Einsätzen, Toren, guten Noten und dem Erreichen später
  Runden, ist gedeckelt (Spielwert, z. B. bis +40 %) und klingt über eine Saison ab.
- Hintergrund: Nach großen Turnieren hebt Transfermarkt die Marktwerte vieler Spieler an, nach der WM 2026 bei 99 Spielern
  (ran.de, „WM 2026: Die größten Marktwert-Gewinner“). Turnierleistungen halten aber nicht immer (James Rodríguez 2014,
  ebenda). Eine Studie mit festen Prozenten wurde nicht gefunden – darum ist die Größe des Schubs ein Spielwert.
- Folgen im Spiel: Bessere Angebote, wenn man ihn verkauft. Mehr Abwerbeversuche. Höhere Forderung bei der Verlängerung.
  Und Stolz in der Kabine: Stimmung und Ruf des Vereins steigen ein wenig.

## 7. Geld für den Verein

- Echte Vereine bekommen für abgestellte Spieler eine Entschädigung vom Weltverband (Programm für Vereine, Betrag je Spieler
  und Turniertag – **prüfen**, Quelle suchen). Im Spiel: Buchung „Abstellung Nationalspieler“, nur wenn die Quelle passt.

## 8. Später: Nationaltrainer (Roadmap)

- Ab einem guten Ruf (z. B. Titel in den oberen Ligen) kommen Anfragen eines Verbands, erst kleine Länder, später größere.
- Nebenamt oder Hauptamt: entweder neben dem Verein (wenige Länderspiele im Jahr) oder ganz.
- Als Nationaltrainer: Kader aus allen Spielern des Landes im Spiel nominieren, Testspiele, Qualifikation, Turniere –
  die Turnierspiele dann richtig in 3D.

## 9. Abgrenzung

- Vereinswettbewerbe der Kontinente (Europa für die eigene Liga) stehen als „Internationaler Wettbewerb“ getrennt auf der
  Roadmap (ROADMAP 11.17). Dieses Konzept betrifft nur die Nationalteams.
- Alte Spielstände: wie bei den Profiligen nur für neue Karrieren oder als Schalter (Entscheidung offen).

## 10. Offene Fragen an den Nutzer

1. Turniere nur ab den Profiligen (Regionalliga aufwärts) oder auch Amateure? (Vorschlag: nur Profiligen – Amateure werden
   nicht nominiert.)
2. Sollen die Spiele des eigenen Spielers im Turnier anschaubar sein (3D) oder reicht der Bericht? (Vorschlag: erst Bericht.)
3. Neutrale Turniernamen wie oben, oder eigene Fantasienamen?
