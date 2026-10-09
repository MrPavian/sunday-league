// Elektronischer Spielbericht: Ab Kreisliga A (Stufe 4) gibt es kein „kommt zur 2. Halbzeit" mehr.
// Der Bericht wird vor dem Anpfiff freigegeben (FVN-Durchführungsbestimmungen: 30 Minuten vorher,
// danach ändert nur noch der Schiedsrichter) – wer nicht da ist und nicht eingetragen wurde, spielt nicht.
// Reine Helfer ohne Abhängigkeiten, damit Ereignisse, Chat und Oberfläche dieselbe Schwelle nutzen.
export const SPIELBERICHT_STUFE = 4;

// c ist ein Karriere-Stand oder eine Stufe (Zahl).
export const spielberichtStreng = (c) => (typeof c === 'number' ? c : c?.level ?? 1) >= SPIELBERICHT_STUFE;

// Verfügbarkeit, wie sie in dieser Liga gelten darf:
// - 'late' (Zuspätkommen: Anreise, Schicht, Feier, Stau …) wird oberhalb der Schwelle zu 'no'.
// - 'bench' (Strafbank/Disziplin) ist anwesend und steht im Spielbericht: ab der Schwelle Auswechselspieler
//   ab Anpfiff, darunter wie bisher „erste Halbzeit draußen" ('late').
export const statusFor = (c, status) => (spielberichtStreng(c) ? (status === 'late' ? 'no' : status) : status === 'bench' ? 'late' : status);

// Satzteil je Stufe: erst eine Zahl/Karriere, dann Text für „kommt später" und für „Spielbericht zu".
export const lateOr = (c, later, strict) => (spielberichtStreng(c) ? strict : later);
