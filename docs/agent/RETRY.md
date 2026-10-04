# RETRY.md – Eine fehlgeschlagene Prüfung muss den nächsten Zug ändern

## Festhalten
Befehl: [genauer Befehl] · Fehler: [genaue Zeile oder Datei] · Geänderte Dateien: [seit der letzten grünen Prüfung]

## Ursache suchen
- Eine widerlegbare Hypothese aufstellen.
- Den kleinsten Fall isolieren, der noch fehlschlägt (z. B. einzelner Seed, einzelner Test mit `-t`).
- Den betroffenen Code oder die Ausgabe lesen, bevor repariert wird.
- Bei Spielverhalten: Ablation – je eine Änderung zurücknehmen und dieselbe Messung wiederholen.

## Wiederholen
Eine bedeutsame Variable ändern, dieselbe Prüfung erneut laufen lassen, festhalten, was das neue Ergebnis
beweist oder widerlegt.

## Aufhören
Zweimal derselbe Fehler ohne neuen Beleg: nicht weiter im Kreis. Keine unveränderte Leseabfrage auf
unverändertem Stand wiederholen. Keine fremden Umbauten nebenbei. ESCALATE.md, wenn ein anderes Modell oder
eine Nutzerentscheidung die konkrete offene Ursache lösen kann.

## Übergabe
Opus bekommt Fehler, versuchte Lösungen und die offene Frage – nicht den Auftrag, alles blind neu zu machen.
