# Konzept: Turniere der Nationalmannschaften (Entwurf, 2026-11-05)

Vom Nutzer gewünscht (2026-11-05): Weltmeisterschaft, Europameisterschaft, Afrikameisterschaft und alle anderen
Kontinentalmeisterschaften simulieren. Spieler können dort ihren Marktwert steigern. Für später: Nationaltrainer werden.

Status: **erste Fassung gebaut (2026-11-06)**, Abschnitt 11. Werte mit „Spielwert“ sind frei gewählt, mit „Quelle“ belegt, mit „prüfen“ noch offen.

Nutzerentscheide 2026-11-06: (1) nominiert wird nur aus den Profiligen, (2) die Spiele laufen direkt als 3D-Spiel, (3) neutrale
Turniernamen.

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

## 11. Gebaut (2026-11-06)

Code: `src/career/nationalteams.js`, Länder und Namen `src/data/nations.js`, Marktwert `src/career/natboost.js`, Tests
`tests/nationalteams.test.js`.

| Turnier | Teams | Format | Zeit | Rhythmus | Quelle / Status |
|---|---|---|---|---|---|
| Weltmeisterschaft | 48 | 12 Gruppen, 8 beste Dritte → Runde der 32 | 11.6.–19.7. | 4 Jahre (2030, 2034 …) | Format und Termine 2026; Plätze je Verband wie 2026, die zwei Play-off-Plätze an Asien und Nord-/Mittelamerika (Spielwert) |
| Europameisterschaft | 24 | 6 Gruppen, 4 beste Dritte → Achtelfinale | 9.6.–9.7. | 4 Jahre (2028) | [Wikipedia, Euro 2028](https://en.wikipedia.org/wiki/UEFA_Euro_2028), [SI](https://www.si.com/soccer/uefa-euro-2028-dates-venues-host-cities-format-schedule) |
| Südamerikameisterschaft | 16 (10 + 6 Gäste) | 4 Gruppen → Viertelfinale | Juni/Juli | 4 Jahre (2028) | [Wikipedia, 2028 Copa América](https://en.wikipedia.org/wiki/2028_Copa_Am%C3%A9rica) – Format vorläufig; Termine wie 2024 (prüfen) |
| Nord- und Mittelamerika | 16 | 4 Gruppen → Viertelfinale | Juni/Juli | 2 Jahre (2027) | [Verband: Qualifikation 2027](https://www.concacaf.com/news/2027-concacaf-gold-cup-qualification-pathway-confirmed) |
| Afrikameisterschaft | 24 | 6 Gruppen, 4 beste Dritte → Achtelfinale | 21.12.–18.1. | 2 Jahre im Winter (Spielwert) | Termine der Ausgabe 2025; Takt: Vier-Jahres-Takt ab 2028 angekündigt ([People Daily](https://peopledaily.digital/sports/afcon-to-be-held-every-four-years-from-2028-caf-announces)), später widersprüchliche Berichte ([Foot Africa](https://foot-africa.com/en/news/every-two-years-or-three-years-the-new-caf-calendar-raises-questions-about-the-future-of-the-africa-cup-of-nations-1404008/)) – prüfen |
| Asienmeisterschaft | 24 | 6 Gruppen, 4 beste Dritte → Achtelfinale | 7.1.–5.2. | 4 Jahre (Januar 2027) | [Wikipedia, 2027 AFC Asian Cup](https://en.wikipedia.org/wiki/2027_AFC_Asian_Cup), [WAM](https://www.wam.ae/en/article/bhkj9ai-afc-asian-cup-saudi-arabia-2027-dates-venues) |
| Ozeanienmeisterschaft | 8 | 2 Gruppen → Halbfinale | Juni | 4 Jahre (Spielwert, prüfen) | [Wikipedia, 2024 OFC Nations Cup](https://en.wikipedia.org/wiki/2024_OFC_Men%27s_Nations_Cup) (8 gemeldet, 7 gespielt) |

- **Länder:** 126 echte Länder mit neutralen Namen, Landesfarben als Trikot, Stärkestufe 1–5 grob nach den Gruppen der
  Weltrangliste (Spielwert). Stärke = Ligamittel der besten elf: 196 / 186 / 176 / 164 / 150 (an der 1. Liga mit 186 angelehnt),
  dazu ± 6 Turnierform je Land und Turnier (Spielwert). Die Teilnehmer jedes Verbands sind die Stärksten nach dieser Rechnung.
- **Kader:** Die übrigen Spieler sind erfunden – Pool-Spieler, auf die Stärke des Landes gehoben (`liftedTo`), mit Namen
  (`NAME_GROUPS`, häufige Namen, frei kombiniert) und Aussehen des Landes. Nichts davon wird gespeichert, die Kader entstehen je
  Spiel neu (fest je Karriere, Jahr und Land).
- **Nationalität:** aus der Herkunft des Nachnamens; mit zweiter Herkunft in 45 % der Fälle das Land, in dem er lebt (Spielwert).
  Nach der ersten Nominierung fest (`career.natLock`).
- **Nominierung:** nur ab der Regionalliga (Stufe 9), nicht verletzt, Stärke höchstens 8 unter der Stärke seines Landes
  (Spielwert), höchstens 26 je Land (Weltmeisterschaft seit 2022; für die anderen Turniere prüfen).
- **Spiele:** Spiele eines Landes mit eigenen Spielern: „Im Stadion ansehen“ (3D, beide Teams von der KI, Zuschauermodus wie
  beim Präsidenten), „Nur Ergebnis“ oder „Turnier vorspulen“. Alle anderen Spiele rechnet das Schnellmodell (wie `simTable`), in
  der K.-o.-Runde mit Verlängerung und Elfmeterschießen. Kein Spiel um Platz drei.
- **Marktwert:** Schub = (2 % je Einsatz + 4 % je Tor + Runde: Achtelfinale 4 %, Viertelfinale 8 %, Halbfinale 12 %, Finale 16 %,
  Titel 22 %) × Gewicht des Turniers (Weltmeisterschaft 1, Europa 0,9, Südamerika 0,8, Afrika/Asien 0,6, Nord-/Mittelamerika 0,5,
  Ozeanien 0,3), höchstens 40 % – alles Spielwerte. Wirkt auf Gehaltsforderung, Ablöse und Kaufpreis; voll in dieser und der
  nächsten Saison, dann halb, dann weg.
- **Entschädigung:** nur Weltmeisterschaft, 5000 € je Spieler und Tag bis zum Ausscheiden (hergeleitet aus dem Mindestbetrag
  von etwa 5000 US-Dollar 2026, [Weltverband](https://inside.fifa.com/organisation/media-releases/landmark-club-benefits-programme-world-cup-2026);
  2022 waren es etwa 10 950 US-Dollar laut [Outlook India](https://www.outlookindia.com/sports/football/fifa-club-benefits-programme-boost-world-cup-2026)).
- **Winter:** Der Spielkalender ist gestaucht (nach der Hinrunde geht es erst im Frühjahr weiter). Darum zählen die echten
  Spieltage der 1. Liga ab dem Ende ihrer Winterpause (Spielwert: 10. Januar, wöchentlich) bis zum Ausscheiden, umgerechnet auf
  die Spieltage der eigenen Liga (`missedRounds`). Asienmeisterschaft bis zum Finale: etwa vier echte Spieltage.
- **Ablauf im Spiel:** Sommerturniere beginnen nach dem letzten Spieltag (Karte im Saisonende), Winterturniere in der
  Winterpause (Karte in der Pause). Wer weitermacht, ohne zu Ende zu schauen, bekommt den Rest im Schnellmodell.

Offen: Stolz in der Kabine (Stimmung), Schiedsrichter aus anderen Ländern (bisher die Namensliste des Spiels), Spiel um Platz
drei, Gastgeber, Qualifikation als eigene Spiele, Nationaltrainer (Abschnitt 8).

## 10. Offene Fragen an den Nutzer (beantwortet 2026-11-06)

1. Turniere nur ab den Profiligen (Regionalliga aufwärts) oder auch Amateure? (Vorschlag: nur Profiligen – Amateure werden
   nicht nominiert.)
2. Sollen die Spiele des eigenen Spielers im Turnier anschaubar sein (3D) oder reicht der Bericht? (Vorschlag: erst Bericht.)
3. Neutrale Turniernamen wie oben, oder eigene Fantasienamen?
