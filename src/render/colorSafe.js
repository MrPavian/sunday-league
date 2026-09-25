// Farbenblind-sichere Trikots (Einstellungen): Beide Teams bekommen Farben aus der
// Okabe-Ito-Palette, die sich bei Rot-Grün-Schwäche klar unterscheiden – dazu
// helle gegen dunkle Hosen, damit auch die Helligkeit trennt. Nur die Anzeige
// ändert sich, die Vereinsfarben im Spielstand bleiben.
export const SAFE_KITS = [
  { kit: { shirt: 0x0072b2, shorts: 0xf2f2f2, socks: 0x0072b2 }, keeper: { shirt: 0xf0e442, shorts: 0x1c1c1c, socks: 0xf0e442 } },
  { kit: { shirt: 0xe69f00, shorts: 0x1c1c1c, socks: 0xe69f00 }, keeper: { shirt: 0xcc79a7, shorts: 0xf2f2f2, socks: 0xcc79a7 } },
];

// safe = true färbt um, false stellt die Vereinsfarben wieder her.
export function applyColorSafeKits(match, safe = true) {
  match.teams.forEach((team, i) => {
    team.clubKits ??= { kit: team.kit, keeperKit: team.keeperKit };
    team.kit = safe ? { ...SAFE_KITS[i].kit } : team.clubKits.kit;
    team.keeperKit = safe ? { ...SAFE_KITS[i].keeper } : team.clubKits.keeperKit;
  });
}
