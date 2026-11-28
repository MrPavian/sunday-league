# Balancing & Simulation QA – 6. BALANCING CHANGELOG

Alle freigegebenen und durchgeführten Änderungen am Spiel aus diesem Auftrag. Je Eintrag: Problem, Beleg, Parameter, Änderung,
Nebenwirkungen, Prüfung (Auftrag Abschnitt 10).

## 2026-11-28 – B1: Boni kappen Werte über 1 nicht mehr

- **Freigabe:** Nutzer, 2026-11-28 („Jetzt beheben“, vor Abschnitt B, weil Fehler statt Balancing).
- **Problem:** Ab Liga 5 spielte der eigene Verein deutlich schwächer als seine Stärke (Liga 9 rund 2 Tore je Spiel);
  Kaderstärke entschied auf dem Großfeld kaum (r 0,13).
- **Beleg:** `docs/BALANCING-QA-04-ATTRIBUTES.md` Abschnitt 2 (6 975 Ligaspiele, 640 Diagnosespiele).
- **Parameter:** kein Spielwert – Deckel 0,98 an sechs Stellen (Form, Berufsboni, Chemie, Kneipe, Halbzeit, Spieltagsereignis).
- **Änderung:** `sim/skill.js` bonusAttr: Deckel nur, wenn der Wert vorher höchstens 0,98 war. Schalter `BONUS_CAP.keepLift`.
- **Nebenwirkungen:** Werte unter 1 unverändert (Kleinfeld bitgleich). Höhere Ligen: eigener Verein spielt so stark, wie seine
  Werte sind – Aufstiege werden leichter als bisher. Berufsboni wirken jetzt auch bei Spielern über 1 (+0,01 bis +0,02).
- **Prüfung:** an/aus, 2 × 1 440 Spiele (Bericht 04 Abschnitt 5): r 0,13 → 0,39, Favorit ≥ 10 Punkte S 40 → 55 %.
  Tests 1 666 + 4 neue grün, Golden unverändert.
