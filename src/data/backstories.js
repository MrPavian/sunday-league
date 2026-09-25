// Dossiers: Was man über einen Spieler erfährt, wenn man ihm am Tresen zuhört.
// Jeder Spieler bekommt deterministisch (aus seiner Pool-Nummer) je einen Satz
// Herkunft, Familie, Traum und Geheimnis. p = { first, age, profession }.

export const DOSSIER_ORDER = ['herkunft', 'familie', 'traum', 'geheimnis'];
export const DOSSIER_LABELS = { herkunft: 'Herkunft', familie: 'Familie', traum: 'Traum', geheimnis: 'Geheimnis' };

export const DOSSIER = {
  herkunft: [
    (p) => `${p.first} ist im Kanalviertel aufgewachsen, drei Straßen vom Platz entfernt. Der erste Ball war ein zusammengeknüllter Einkaufsbeutel.`,
    (p) => `Kam mit zwölf aus dem Ruhrgebiet her. Redet heute noch vom Bolzplatz hinter der Zeche.`,
    (p) => `${p.first} ist auf einem Bauernhof groß geworden. Hat als Kind gegen die Scheunenwand geschossen, bis das Tor schief hing.`,
    () => `Die Eltern kamen aus Anatolien, der Onkel hat in der Türkei in der dritten Liga gespielt. Das erwähnt er ungefähr jedes zweite Training.`,
    () => `Stammt aus einem Dorf, das so klein ist, dass man für ein Elf-gegen-elf zwei Nachbarorte brauchte.`,
    (p) => `Ist in Polen geboren, mit sechs hergezogen. Kann auf zwei Sprachen fluchen, und tut das auch.`,
    () => `War als Kind im Internat. Fußball war das Einzige, was dort Spaß gemacht hat.`,
    (p) => `${p.first} hat die halbe Kindheit im Kleingarten der Oma verbracht – das Gartentor war das Tor.`,
    () => `Wuchs in einem Hochhaus auf, der Käfig im Hof war sein Wohnzimmer. Daher auch die Technik auf engem Raum.`,
    () => `Kommt von der Küste. Findet, dass hier im Binnenland viel zu wenig Wind weht.`,
  ],
  familie: [
    (p) => `Hat drei ältere Schwestern. „Deswegen halte ich jeden Zweikampf aus."`,
    () => `Der Vater war Schiedsrichter in der Kreisliga. Er meckert trotzdem bei jeder Entscheidung.`,
    () => `Wohnt noch bei den Eltern. Die Mutter wäscht die Trikots der halben Mannschaft mit.`,
    () => `Ist frisch getrennt. Fußball ist gerade das Einzige, was sich normal anfühlt.`,
    () => `Seine Frau ist der größte Fan am Spielfeldrand. Lauter als alle anderen zusammen.`,
    () => `Hat eine kleine Tochter, die bei jedem Tor „Papaaa!" ruft. Er schießt seitdem öfter aufs Tor.`,
    () => `Der Bruder hat früher besser gespielt als er. Ist aber schon mit 19 wegen Knie aufgehört.`,
    () => `Pflegt nebenbei die kranke Oma. Deswegen muss er manchmal früher los.`,
    (p) => `Die Familie hält eigentlich zum Handball. ${p.first} ist das schwarze Schaf.`,
    () => `Ist Einzelkind und findet deswegen, dass die Mannschaft seine Familie ist.`,
  ],
  traum: [
    () => `Will einmal im Leben ein Tor per Fallrückzieher schießen. Übt heimlich auf der Matratze.`,
    (p) => `Träumt davon, später den Verein zu übernehmen – als Vorsitzender, mit Anzug und allem.`,
    () => `Will mit der Mannschaft einmal zum Auswärtsspiel nach Mallorca. Egal gegen wen.`,
    (p) => `Möchte irgendwann eine eigene Werkstatt aufmachen – ${p.profession === 'Dachdecker' ? 'Dachdeckerei' : 'irgendwas mit Holz'}.`,
    () => `Will einmal gegen eine Profimannschaft spielen. Und sei es beim Freundschaftsspiel im Sommer.`,
    () => `Träumt vom Aufstieg in die Kreisliga A. Hat schon ein Banner gemalt.`,
    () => `Will Jugendtrainer werden, „damit die Kleinen es besser haben als wir damals".`,
    () => `Möchte einmal eine Saison ohne Gelbe Karte schaffen. Bisher hat es nie geklappt.`,
    () => `Will nach Kanada auswandern. Seit zehn Jahren. Nächstes Jahr bestimmt.`,
    (p) => `Möchte mit 40 noch spielen. ${p.age >= 36 ? 'Das wird knapp.' : 'Er rechnet schon rückwärts.'}`,
  ],
  geheimnis: [
    () => `Hat einmal ein Probetraining bei einem Zweitligisten verschlafen. Wirklich verschlafen. Erzählt es niemandem.`,
    () => `Hat panische Angst vor Elfmetern. Deshalb humpelt er immer genau dann „leicht".`,
    () => `War früher beim Gegner vom Kanal. Ist wegen einer Wette gewechselt – die er verloren hat.`,
    () => `Trägt seit 15 Jahren dieselben Schienbeinschoner. Aberglaube. Sie riechen entsprechend.`,
    () => `Hat die Mannschaftskasse vor Jahren mal „geliehen" und heimlich zurückgezahlt. Mit Zinsen.`,
    () => `Kann eigentlich gar nicht schwimmen. Deswegen fehlt er bei jedem Ausflug an den See.`,
    () => `Schreibt heimlich Gedichte. Eins über den Ascheplatz hat er beim Stadtfest vorgelesen – unter anderem Namen.`,
    () => `Ist eigentlich Fan vom großen Rivalen aus der Stadt. Die Bettwäsche verrät ihn.`,
    () => `Hat mal einen Schiri-Lehrgang angefangen und nach dem ersten Tag abgebrochen: „Zu viel Verantwortung."`,
    () => `Spielt nur mit, weil er vor Jahren einem sterbenden Freund versprochen hat, nie mit dem Kicken aufzuhören.`,
  ],
};

// Opa Heinz, seit 1971 jeden Sonntag am Zaun, weiß alles besser.
export const HEINZ = [
  '„Früher hat man den Ball gestoppt. Mit der Brust. Heute nur noch mit dem Handy."',
  '„Ein Tor ist ein Tor. Auch wenn es mit dem Knie war."',
  '„Asche im Knie ist wie ein Tattoo – nur ehrlicher."',
  '„Der Schiri pfeift, wie er frühstückt. Und heute hatte er nix."',
  '„Wer sonntags um zehn noch Restalkohol hat, gehört auf die Bank. Oder ins Tor."',
  '„Taktik ist, wenn der Dicke hinten bleibt."',
  '„Wir hatten 1978 auch nur neun Mann. Und haben 4:3 gewonnen. Glaube ich."',
  '„Pressing heißt: alle laufen hin, keiner kommt an."',
  '„Die Jugend von heute trinkt Wasser in der Halbzeit. Unglaublich."',
  '„Ein Trainer, der nicht meckert, hat schon aufgegeben."',
  '„Das Runde muss ins Eckige. Und das Bier in den Bauch."',
  '„Einmal hab ich einen Ball bis auf die Autobahn geschossen. Den suchen die heute noch."',
];

// Tipps vom Wirt über den nächsten Gegner (wirken auf dessen Werte).
export const INTEL = [
  { text: (o) => `„Der Torwart vom ${o} schiebt die ganze Woche Nachtschicht. Der sieht Sonntag doppelt."`, mods: { keeping: -0.07 } },
  { text: (o) => `„Beim ${o} haben sie diese Woche nur einmal trainiert. Die pumpen nach 20 Minuten."`, mods: { stamina: -0.06 } },
  { text: (o) => `„Der Stürmer vom ${o} hat Stress mit der Freundin. Der trifft gerade nicht mal das Klo."`, mods: { shooting: -0.06 } },
  { text: (o) => `„Beim ${o} fehlt der Abwehrchef, Hochzeit vom Cousin. Hinten ist da alles offen."`, mods: { tackling: -0.06 } },
];
