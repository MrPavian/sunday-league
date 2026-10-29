// Landespokal-Gegner und der überregionale Pokal samt fiktiven Profivereinen – nur Daten und Texte.
// Alles erfunden: keine echten Vereine, Spieler oder Wettbewerbe. Wappen und Trikotfarben bewusst
// abseits bekannter Kombinationen (kein Rot-Weiß, Schwarz-Gelb, Blau-Weiß, Grün-Weiß, Schwarz-Rot).
import { tr } from '../core/i18n.js';

// Der Name des überregionalen Pokals steht NUR hier – zum Umbenennen genügt diese eine Zeile.
// Nie den Namen eines echten Wettbewerbs verwenden.
export const BUND_NAME = tr('Bundespokal', 'National Cup');

// Oberliga (Stufe 8): Stammvereine der Oberliga (clubs.js OL_CLUBS), im Landespokal und als Amateure im überregionalen Pokal.
export const OBERLIGA = [
  { id: 'ol-oberhafen', name: tr('FC Oberhafen 1909', 'Upper Harbour FC 1909'), short: tr('FCO', 'UHF'), kit: { shirt: 0x2f6f73, shorts: 0xf2efe6, socks: 0x2f6f73, pattern: 'uni' }, keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 }, tiers: { gut: 0.12, stark: 0.4, dorfstar: 0.32, superstar: 0.15, legende: 0.01 } },
  { id: 'ol-eisenbrueck', name: tr('TSV Eisenbrück', 'Ironbridge TSV'), short: tr('TSE', 'IBT'), kit: { shirt: 0xe07b1c, shorts: 0x3a2a20, socks: 0xe07b1c, pattern: 'uni' }, keeperKit: { shirt: 0x6b2a8a, shorts: 0x1c1c1c, socks: 0x6b2a8a }, tiers: { gut: 0.1, stark: 0.42, dorfstar: 0.33, superstar: 0.14, legende: 0.01 } },
  { id: 'ol-sandberg', name: tr('SC Sandberg 1921', 'Sandhill SC 1921'), short: tr('SCS', 'SSC'), kit: { shirt: 0xd8c690, shorts: 0x2a3b66, socks: 0xd8c690, pattern: 'uni' }, keeperKit: { shirt: 0x3fa05a, shorts: 0x1c1c1c, socks: 0x3fa05a }, tiers: { gut: 0.14, stark: 0.4, dorfstar: 0.31, superstar: 0.14, legende: 0.01 } },
  { id: 'ol-tannenhoehe', name: tr('VfR Tannenhöhe', 'Firhill Rovers'), short: tr('VTH', 'FHR'), kit: { shirt: 0x58c9a5, shorts: 0x1f2a44, socks: 0x58c9a5, pattern: 'uni' }, keeperKit: { shirt: 0xc0392b, shorts: 0x1c1c1c, socks: 0xc0392b }, tiers: { gut: 0.12, stark: 0.41, dorfstar: 0.32, superstar: 0.14, legende: 0.01 } },
];

// Fiktive Profivereine (Kader der Stufen 11 und 12, siehe PROFI_KLASSEN) für alle Runden des überregionalen Pokals.
// Kader: nur die oberen Klassen des Spielerpools (Dorfstar bis Legende).
export const PROFIS = [
  { id: 'profi-kaiserstein', name: tr('FC Kaiserstein 1903', 'Kaiserstone Athletic'), short: tr('FKS', 'KSA'), kit: { shirt: 0x1f8a8a, shorts: 0x14233a, socks: 0x1f8a8a, pattern: 'uni' }, keeperKit: { shirt: 0xf0d34a, shorts: 0x14233a, socks: 0xf0d34a } },
  { id: 'profi-rheinbogen', name: tr('Sporting Rheinbogen', 'Rhinebend Sporting'), short: tr('SRB', 'RBS'), kit: { shirt: 0xe58a1f, shorts: 0x3a2a20, socks: 0xe58a1f, pattern: 'uni' }, keeperKit: { shirt: 0x5b3a8c, shorts: 0x1c1c1c, socks: 0x5b3a8c } },
  { id: 'profi-grauwasser', name: tr('Union Grauwasser 1899', 'Greywater Union'), short: tr('UGW', 'GWU'), kit: { shirt: 0xc8a228, shorts: 0x5a2346, socks: 0xc8a228, pattern: 'uni' }, keeperKit: { shirt: 0x37a6b8, shorts: 0x1c1c1c, socks: 0x37a6b8 } },
  { id: 'profi-nordlicht', name: tr('VfL Nordlicht-Metropole', 'Northern Lights City'), short: tr('VNM', 'NLC'), kit: { shirt: 0x58d6a8, shorts: 0x101c33, socks: 0x58d6a8, pattern: 'uni' }, keeperKit: { shirt: 0xd9534f, shorts: 0x1c1c1c, socks: 0xd9534f } },
  { id: 'profi-sturmfels', name: tr('Eintracht Sturmfels', 'Stormcrag Eagles'), short: tr('ESF', 'SCE'), kit: { shirt: 0x7a1f3d, shorts: 0xd9c9a0, socks: 0x7a1f3d, pattern: 'uni' }, keeperKit: { shirt: 0x9ad04a, shorts: 0x1c1c1c, socks: 0x9ad04a } },
  { id: 'profi-feuerland', name: tr('SV Feuerland 1910', 'Fireland Albion'), short: tr('SFL', 'FLA'), kit: { shirt: 0xd9663a, shorts: 0x2f3a2c, socks: 0xd9663a, pattern: 'uni' }, keeperKit: { shirt: 0x58c9e0, shorts: 0x1c1c1c, socks: 0x58c9e0 } },
  { id: 'profi-lindenau', name: tr('FC Lindenau-Süd', 'Lindenau South FC'), short: tr('FLS', 'LSF'), kit: { shirt: 0x5b4fa8, shorts: 0xe8e0c8, socks: 0x5b4fa8, pattern: 'uni' }, keeperKit: { shirt: 0xe0b020, shorts: 0x1c1c1c, socks: 0xe0b020 } },
  { id: 'profi-silberquelle', name: tr('FSV Silberquelle', 'Silverwell FSV'), short: tr('FSQ', 'SWF'), kit: { shirt: 0xa6c92f, shorts: 0x383c42, socks: 0xa6c92f, pattern: 'uni' }, keeperKit: { shirt: 0xe0457b, shorts: 0x1c1c1c, socks: 0xe0457b } },
  { id: 'profi-seewacht', name: tr('TSG Seewacht', 'Lakewatch TSG'), short: tr('TSW', 'LWT'), kit: { shirt: 0x3a8fb7, shorts: 0xd8c690, socks: 0x3a8fb7, pattern: 'uni' }, keeperKit: { shirt: 0xd9534f, shorts: 0x1c1c1c, socks: 0xd9534f } },
];

// Volles Teilnehmerfeld (64, ROADMAP 11.9): Bezug ist der echte Pokal mit 36 Erst- und Zweitligisten, 4 Drittligisten und 24 Amateuren
// (Landespokalsieger und weitere Amateure der großen Verbände). Eine dritte Liga gibt es hier nicht: 18 Erst-, 18 Zweitligisten und
// 27 Amateure plus der eigene Verein. Alle Namen sind erfunden (keine echten Orte oder Vereine nachgebildet).
// Stärke (Ø Wertung der besten 11, wie pokal.js strength), gemessen mit scripts aus 40 Kadern je Klasse (2026-10-29):
// Erstligist 96,5 ± 0,8, Zweitligist 95,3 ± 0,9, Oberligist (Landespokalsieger) 73,8 ± 2,7.
export const FIELD_STRENGTH = { erst: [96.5, 0.8], zweit: [95.3, 0.9], amateur: [73.8, 2.7] };
const PRO_EXTRA = [
  ['wolkenhain', 'FC Wolkenhain', 'FCW'], ['nebelstein', 'SV Nebelstein 1907', 'SVN'], ['kranichfurt', 'Kranichfurt 04', 'K04'], ['sternbachtal', 'TSV Sternbachtal', 'TST'],
  ['mondquell', 'VfB Mondquell', 'VMQ'], ['donnerhall', 'Donnerhall United', 'DHU'], ['goldammerfeld', 'SC Goldammerfeld', 'SCG'], ['rabenwacht', 'FC Rabenwacht 1912', 'FRW'],
  ['wellenbruch', 'Sportfreunde Wellenbruch', 'SFW'], ['eisvogelau', 'Eintracht Eisvogelau', 'EEA'], ['morgenkamm', 'VfL Morgenkamm', 'VMK'], ['kupferkessel', 'SV Kupferkessel', 'SKK'],
  ['falkenwiege', 'Falkenwiege 1898', 'F98'], ['hagelsturz', 'FC Hagelsturz', 'FCH'], ['lerchenzinne', 'TuS Lerchenzinne', 'TLZ'], ['bernsteinhafen', 'Union Bernsteinhafen', 'UBH'],
  ['windmuehlenau', 'FSV Windmühlenau', 'FWA'], ['glutberg', 'SC Glutberg-Nord', 'SGN'], ['eulenkreuz', 'Viktoria Eulenkreuz', 'VEK'], ['schwanenquell', 'FC Schwanenquell', 'FSN'],
  ['funkenheide', 'SV Funkenheide 1920', 'SFH'], ['taubengrund', 'Germania Taubengrund', 'GTG'], ['salzwind', 'Salzwind 1905', 'S05'], ['kometenfeld', 'TSG Kometenfeld', 'TKF'],
  ['brausewasser', 'VfR Brausewasser', 'VBW'], ['ahornspitz', 'FC Ahornspitz', 'FAS'], ['blitzmoor', 'Blitzmoor Athletic', 'BMA'],
];
const AMATEUR_FIELD = [
  ['heckenrose', 'SV Heckenrose'], ['kieselgrund', 'TSV Kieselgrund'], ['lindwurmtal', 'FC Lindwurmtal'], ['moorlerche', 'SpVgg Moorlerche'], ['distelwies', 'TuS Distelwies'],
  ['glockenacker', 'SV Glockenacker'], ['krummbirn', 'FC Krummbirn'], ['wichtelbrunn', 'DJK Wichtelbrunn'], ['hummelweide', 'SG Hummelweide'], ['tannzapfen', 'TSV Tannzapfen'],
  ['krähenkuppe', 'SV Krähenkuppe'], ['schlehdorn', 'FC Schlehdorn-West'], ['muschelsand', 'TuS Muschelsand'], ['ziegenstieg', 'SV Ziegenstieg'], ['ottergrund', 'FSV Ottergrund'],
  ['dachsbau', 'SG Dachsbau'], ['kressewiese', 'TSV Kressewiese'], ['feldlerchenau', 'TSV Feldlerchenau'], ['rosskastanie', 'FC Rosskastanie'], ['wiesenknopf', 'SV Wiesenknopf'],
  ['igelhain', 'SpVgg Igelhain'], ['brombeerhang', 'TuS Brombeerhang'], ['schwalbennest', 'SV Schwalbennest'], ['erlenbruchtal', 'FC Erlenbruchtal'], ['flachsland', 'TSV Flachsland-Ost'],
  ['grillenfeld', 'TSV Grillenfeld'], ['hasenpfad', 'SG Hasenpfad'],
];
// Die 9 bekannten Profis (PROFIS, mit Trikots) und 27 weitere; 18 Erst-, 18 Zweitligisten (fest je Eintrag).
export const FIELD_PROS = () => [...PROFIS.map((p) => ({ id: p.id, name: p.name, short: p.short })), ...PRO_EXTRA.map(([id, name, short]) => ({ id: `profi-${id}`, name, short }))].map((p, i) => ({ ...p, klass: i % 2 === 0 ? 'erst' : 'zweit' }));
// Kürzel: erster Buchstabe der Vereinsform und die ersten zwei des Ortes (SV Heckenrose → SHE).
const shortOf = (name) => { const [form, ...rest] = name.split(' '); return (form[0] + rest.join('').slice(0, 2)).toUpperCase(); };
export const FIELD_AMATEURS = () => AMATEUR_FIELD.map(([id, name]) => ({ id: `ama-${id}`, name, short: shortOf(name), klass: 'amateur' }));

// Profis nach „Liga": Zweitligist (Stufe 8) und Erstligist (Stufe 9). Kader aus den oberen Klassen des Spielerpools,
// dazu ein Aufschlag auf jede Fähigkeit (0…1-Skala) über denselben Weg wie die Entwicklung der eigenen Spieler
// (career.players[idx].delta) – Profis trainieren hauptberuflich, und der Pool allein reicht nicht: seine besten Klassen
// (Superstar, Legende) liegen kaum über den stärksten Amateurkadern. Die Werte sind GEMESSEN, nicht gesetzt: siehe
// scripts/bundespokal-calibrate.mjs, je 400 Spiele, KI gegen KI, Runde 1 mit Heimrecht des Amateurs. Ziel laut Vorgabe: 3–5 %.
// Weiterkommchance des Amateurs (Kader „mittel" = Zugänge eines Bezirksligisten / „bezirk" = stärkster Bezirksligist), je 400 Spiele,
// nach den Engine-Änderungen bei Ecken, Kopfbällen, Befreiungsschlag und Torzuordnung neu gemessen: Zweitligist (+0,23) 4,8 % / 5,3 %,
// Erstligist (+0,19) 3,5 % / 3,8 %. Mit den früheren Werten (+0,28 / +0,26) lag „mittel" bei 3,0 / 0,5 % (HEAD, 200 Spiele) und 1,5 / 2,0 %
// (200 Spiele) – unter dem Band. Der stärkere Kader liegt je Liga etwas höher; mit einem Wert je Liga lassen sich beide Kader nur grob ins
// Band 3–5 % legen. Nach der Deckelung der Schussreichweite auf großen Plätzen (ai.js, BIG_RANGE_CAP) neu gemessen (je 400 Spiele):
// Zweitligist (+0,23) mittel 3,3 % / bezirk 8,5 %; Erstligist mit +0,19 mittel 6,3 % / bezirk 5,8 %, mit +0,22 mittel 3,3 % / bezirk 5,0 %
// (95-%-Streuung ±1,7–2,7 Punkte). Nach sqrt-Rechnung, echtem Strafraum und Doppelpass-Fix (je 600 Spiele): Zweitligist +0,23 mittel 5,2 % /
// bezirk 8,2 %, mit +0,24 mittel 3,7 % / bezirk 8,5 %; Erstligist +0,22 mittel 3,7 % / bezirk 7,8 %. Nach Verstärkung der Trainerbefehle (KI-Vereine nutzen sie): Zweitligist +0,24
// mittel 4,3 % (1200 Spiele), Erstligist mittel 3,8 % (600). Tests: tests/pokal2.test.js.
export const PROFI_KLASSEN = {
  zweit: { level: 11, boost: 0.24, tiers: { gut: 0.05, stark: 0.3, dorfstar: 0.45, superstar: 0.2 } },
  erst: { level: 12, boost: 0.22, tiers: { stark: 0.1, dorfstar: 0.42, superstar: 0.45, legende: 0.03 } },
};
export const PROFI_ATTRS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'];
// Chance, dass der Gegner der Runde ein Erstligist ist (sonst Zweitligist): früh meist Zweitligist, ab Halbfinale Erstligist.
export const BUND_ERST = [0.3, 0.5, 0.65, 0.85, 1, 1];
// Heimrecht in den Runden 2…6: Der Amateur hat es gegen Höherklassige, wenn das Los es will – hier die Chance, dass
// der Profi stattdessen zu Hause spielt (Auswärtsspiel im großen Stadion).
export const BUND_AWAY = 0.4;

// Stufen der Pokalgegner über der Bezirksliga (5): Landesliga, Oberliga, Profi.
// Stufen über der Oberliga (8): Regionalliga 9 und 3. Liga 10 gibt es im Spiel nicht, Zweitligist 11, Erstligist 12.
export const LEVEL_PROFI = 11;
export const levelName = (level, leagueName) => (level >= 12 ? tr('Erstligist', 'Top-flight club') : level >= LEVEL_PROFI ? tr('Zweitligist', 'Second-tier club') : leagueName);

// Spielorte für Heimspiele im überregionalen Pokal. Zuschauer = Vielfaches eines normalen Heimspiels (mul, gedeckelt
// durch die Kapazität cap), Theke = Anteil des Getränkeverkaufs, der beim Verein bleibt, rentUnits = Miete in Einheiten
// eines Durchschnitts-Heimspiels (homeUnit), mood = Heimgefühl (Stimmung der Mannschaft).
// Begründung der Größenordnung: größter Zuschauermultiplikator der Wirtschaft ist das Derby (1,8; finances.js); der
// Profibesuch zieht das ganze Dorf – eigener Platz ≈ 2,2 × Derby (×4), mit gemieteter Stahlrohrtribüne etwa das
// 1,75-Fache davon (×7), im Stadion nebenan das Doppelte der Tribünenlösung (×14, Rang-Kapazität). Kosten der Tribüne
// und des Stadions sind Spielannahmen (keine belastbare Quelle zu Stahlrohr-/Stadionmieten gefunden): so gewählt, dass
// jede Stufe netto mehr bringt als die vorherige, das Stadion aber das Heimgefühl kostet (mood) und den Getränkeverkauf
// größtenteils beim Betreiber lässt.
export const BUND_VENUES = {
  own: { mul: 4, cap: 900, theke: 1, rentUnits: 0, mood: 0.06, pitch: 'grossfeld' },
  stands: { mul: 7, cap: 1500, theke: 1, rentUnits: 0.6, mood: 0.03, pitch: 'grossfeld_tribuene' },
  stadium: { mul: 14, cap: 3500, theke: 0.4, rentUnits: 0.8, mood: -0.05, pitch: 'stadion' },
};
// Einnahmen aus Eintritt werden im Pokal geteilt: laut Berichten zum DFB-Pokal je 45 % für beide Vereine, 10 % für den
// Verband (Ordnungsdienst, Schiris); Getränke, Essen und Fanartikel bleiben beim Gastgeber.
// Quellen: https://ran.joyn.de/sports/fussball/dfb-pokal/preisgeld-im-dfb-pokal-warum-profitieren-vor-allem-kleine-klubs-in-der-ersten-runde-172418
// (Teilung, Gastgeber behält Gastronomie); https://www.drweb.de/wie-funktioniert-die-oekonomie-des-dfb-pokals/ (45/45/10).
export const BUND_GATE_SHARE = 0.45;
// Rundenprämie des Verbands: verdoppelt sich je Runde (DFB-Pokal 2025/26: 211.886 € in Runde 1, dann das Doppelte je
// Runde bis zum Halbfinale 3.390.175 €; Finale: Verlierer 2,88 Mio., Sieger 4,32 Mio.), in Vielfachen der ersten Runde:
// 1, 2, 4, 8, 16; Finalist 13,6 (= 2,88/0,2119), Sieger 20,4. Skaliert auf die Spielwirtschaft: die erste Runde zahlt so viel
// wie ein durchschnittliches Heimspiel einbringt (homeUnit) – ein Amateur nimmt in Wirklichkeit in der ersten Runde ein
// Mehrfaches seiner normalen Saisoneinnahmen ein, hier ist es ein Heimspiel mehr.
export const BUND_PRIZE = [1, 2, 4, 8, 16, 13.6]; // Finalist; Sieger: BUND_PRIZE_WINNER
export const BUND_PRIZE_WINNER = 20.4;
// Hauptsponsor: Vielfache seines Saisonziel-Bonus für jede gewonnene Runde (siehe PRAEMIE in pokal.js).
export const BUND_SPONSOR = [3, 1, 1, 1, 1, 3];
export const BUND_ROUND_NAMES = () => [tr('1. Runde', 'First round'), tr('2. Runde', 'Second round'), tr('Achtelfinale', 'Round of 16'), tr('Viertelfinale', 'Quarter-final'), tr('Halbfinale', 'Semi-final'), tr('Finale', 'Final')];
// Eintrittspreis- und Theken-Logik bleibt die normale (finances.js); die Zuschauerzahl ist die des Spiels (match.crowd).

// Texte rund um das Spiel gegen den Profi. {opp} = Profiverein, {club} = eigener Verein.
export const BUND_TEXT = {
  draw: (opp, club) => [
    tr(`Kreisblatt: Sensation im Los! ${club} bekommt im ${BUND_NAME} ${opp} zugelost – Heimrecht auf dem Großfeld. „Der Platzwart hat schon geweint."`, `District Gazette: sensation in the draw! ${club} get ${opp} in the ${BUND_NAME} – at home on the big pitch. "The groundsman has already cried."`),
    tr(`Kreisblatt, Titelseite: ${opp} kommt! Im ${BUND_NAME} wartet auf ${club} ein Profiverein. Die Stadt spricht über nichts anderes mehr.`, `District Gazette, front page: ${opp} are coming! A professional side awaits ${club} in the ${BUND_NAME}. The town talks about nothing else.`),
    tr(`Kreisblatt: ${club} trifft im ${BUND_NAME} auf ${opp}. Der Wirt rechnet schon mit der doppelten Menge Bratwurst.`, `District Gazette: ${club} face ${opp} in the ${BUND_NAME}. The bar manager is already planning on double the sausages.`),
  ],
  drawLater: (opp, club, round) => [
    tr(`Kreisblatt: Auslosung ${round} im ${BUND_NAME}: ${club} trifft auf ${opp}. „Wir haben das Wunder nicht bestellt, aber wir nehmen es.“`, `District Gazette: ${round} draw in the ${BUND_NAME}: ${club} face ${opp}. "We didn't order the miracle, but we'll take it."`),
    tr(`Kreisblatt: Das Los will es: ${club} gegen ${opp} im ${round}. Der Bürgermeister hat schon beim Verband angerufen.`, `District Gazette: the draw has spoken: ${club} v ${opp} in the ${round}. The mayor has already phoned the association.`),
  ],
  hype: (opp) => [
    tr(`Kreisblatt: Die Tribünen kommen morgen per Tieflader. Karten für das Spiel gegen ${opp} sind seit Montag vergriffen.`, `District Gazette: the temporary stands arrive tomorrow on a low-loader. Tickets for the match against ${opp} have been gone since Monday.`),
    tr(`Kreisblatt: Bürgermeister kündigt an, den Anstoß selbst auszuführen. Ordnungsamt prüft die Absperrung für das Spiel gegen ${opp}.`, `District Gazette: the mayor says he will take the kick-off himself. The council checks the barriers for the match against ${opp}.`),
    tr(`Kreisblatt: Reporter aus der Landeshauptstadt angekündigt – ${opp} reist mit eigenem Bus an.`, `District Gazette: reporters from the state capital announced – ${opp} are travelling in their own coach.`),
  ],
  matchday: (opp) => [
    tr(`Samstag, Spieltag: ${opp} ist da. Der Parkplatz war um zwölf Uhr voll, die Wiese dahinter auch.`, `Saturday, match day: ${opp} have arrived. The car park was full at noon, so was the meadow behind it.`),
    tr(`Heute kommt ${opp}. Der Wirt hat alles bestellt, was der Großhandel hergibt.`, `${opp} are here today. The bar manager has ordered everything the wholesaler could offer.`),
  ],
  // Mannschaftschat (kommt von Spielern).
  chat: (opp) => [
    tr(`Alter, ${opp}! Echte Profis! Ich muss mir noch Schienbeinschoner kaufen.`, `Mate, ${opp}! Proper pros! I still need to buy shin pads.`),
    tr(`Ich hab's meiner Mutter erzählt. Sie will Karten für die ganze Familie.`, `I told my mum. She wants tickets for the whole family.`),
    tr(`Wenn ich gegen den Linksverteidiger spiele, tausche ich hinterher das Trikot. Ist das erlaubt?`, `If I play against their left back I'm swapping shirts afterwards. Is that allowed?`),
    tr(`Wir verlieren eh. Aber dann mit Anstand. Und mit Bratwurst.`, `We'll lose anyway. But with dignity. And with sausage.`),
    tr(`Ich nehme mir Samstag frei. Der Chef ist selbst Fan von ${opp}.`, `I'm taking Saturday off. My boss is a ${opp} fan himself.`),
  ],
  win: (opp, club, score) => [
    tr(`Kreisblatt, Sonderausgabe: SENSATION! ${club} wirft Profiverein ${opp} aus dem ${BUND_NAME} (${score}). Der Platzsturm blieb aus – nur, weil die Absperrung gehalten hat.`, `District Gazette special edition: SENSATION! ${club} knock professional side ${opp} out of the ${BUND_NAME} (${score}). The pitch invasion only failed because the barriers held.`),
    tr(`Kreisblatt: Das Wunder von ${club}! ${opp} verliert im ${BUND_NAME} mit ${score}. Der Torwart wird auf Schultern aus dem Stadion getragen.`, `District Gazette: the miracle of ${club}! ${opp} lose in the ${BUND_NAME} ${score}. The goalkeeper is carried off on shoulders.`),
  ],
  winLater: (opp, club, score, round) => [
    tr(`Kreisblatt: Das Märchen geht weiter! ${club} schlägt ${opp} (${score}) und steht im ${round} des ${BUND_NAME}s. Die Stadt feiert bis in den Morgen.`, `District Gazette: the fairy tale goes on! ${club} beat ${opp} (${score}) and are into the ${round} of the ${BUND_NAME}. The town celebrates until morning.`),
    tr(`Kreisblatt, Sonderseite: Schon wieder ein Profi weniger. ${club} ringt ${opp} nieder (${score}) – ${round} im ${BUND_NAME}.`, `District Gazette, special page: one more professional side down. ${club} see off ${opp} (${score}) – ${round} of the ${BUND_NAME}.`),
  ],
  tickets: (opp) => [
    tr(`Kartenansturm: Der Vorverkauf für das Spiel gegen ${opp} war nach 40 Minuten ausverkauft. Der Kassierer hat die Schlange bis zur Bäckerei gezählt.`, `Ticket rush: advance sales for the match against ${opp} were sold out in 40 minutes. The treasurer counted the queue as far as the bakery.`),
    tr(`Auf dem Schwarzmarkt (Pinnwand im Vereinsheim) werden Karten für das Spiel gegen ${opp} schon für das Dreifache gehandelt. Der Vorstand ist entsetzt und geschmeichelt.`, `On the black market (the clubhouse noticeboard) tickets for the match against ${opp} are already going for three times the price. The board is appalled and flattered.`),
  ],
  closeLoss: (opp, club, score) => [
    tr(`Kreisblatt: Erhobenen Hauptes ausgeschieden. ${club} verlangt ${opp} im ${BUND_NAME} alles ab (${score}). „So sieht Amateurfußball aus."`, `District Gazette: out with heads held high. ${club} push ${opp} all the way in the ${BUND_NAME} (${score}). "That is what amateur football looks like."`),
    tr(`Kreisblatt: Fast die Sensation! ${club} unterliegt ${opp} nur knapp (${score}). Der Gästetrainer lobt: „Die hatten uns am Rande einer Niederlage."`, `District Gazette: almost a sensation! ${club} lose narrowly to ${opp} (${score}). The visiting manager says: "They had us on the brink."`),
  ],
  loss: (opp, club, score) => [
    tr(`Kreisblatt: ${opp} setzt sich im ${BUND_NAME} erwartbar durch (${score}). ${club} bekommt Applaus von beiden Seiten – und eine volle Kasse.`, `District Gazette: ${opp} win as expected in the ${BUND_NAME} (${score}). ${club} get applause from both sides – and a full till.`),
  ],
};
