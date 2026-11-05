// Passt ein Ereignis zur Liga, zum Platz und zur Professionalität? (vom Nutzer gewünscht, 2026-11-05: „alle bestehenden Ereignisse
// durchgehen, ob sie auf jede Liga passen, in der Halle, in größeren Stadien und höheren Ligen“). Jedes Ereignis wurde einzeln
// gelesen; hier steht, wo es NICHT passt. Was fehlt, passt überall.
// Stufen: 1 Freizeitliga … 5 Bezirksliga, 6–8 Landesliga bis Oberliga, 9 Regionalliga (halbprofessionell: viele haben noch einen
// Beruf), 10 3. Liga (Vollprofis). Wird nach den Bedingungen des Ereignisses geprüft, damit der Zufall der übrigen gleich bleibt.
import { humanClub } from './career.js';
import { hasFacility } from './facilities.js';

const lvl = (c) => c.level ?? 1;
const venue = (c) => humanClub(c)?.venue;
const indoor = (c) => venue(c) === 'halle';
const SMALL = new Set(['hinterhof', 'parkplatz', 'park']); // Plätze mit Nachbarn direkt am Zaun
const upTo = (n) => (c) => lvl(c) <= n;
const between = (a, b) => (c) => lvl(c) >= a && lvl(c) <= b;
const outdoor = (rule = () => true) => (c) => !indoor(c) && rule(c);

// Kurz: amateur = bis Oberliga (ehrenamtlich, Kreis/Verband, Beruf neben dem Fußball); semi = bis Regionalliga (Beruf noch möglich).
const amateur = upTo(8);
const semi = upTo(9);
const village = upTo(7); // Dorfverein-Kleinkram: Kassenwart mit Schuhkarton, Nachbarin von nebenan
const kreis = between(2, 5); // Kreis und Bezirk als Verband (Kreisblatt bleibt überall – im Profibereich die Lokalzeitung)

export const FIT = {
  // events.js
  arbeitseinsatz: outdoor(amateur), // Spieler stopfen Löcher – oben macht das der Greenkeeper
  nachbar: (c) => SMALL.has(venue(c)) && lvl(c) <= 2, // „Nachbar vom Hinterhof“ – nur auf Plätzen mitten im Wohngebiet
  trikots_eingelaufen: amateur, // oben wäscht der Zeugwart
  tombola: village,
  kind_im_park: upTo(6), // ein Junge vom Bolzplatz direkt in die erste Mannschaft
  firmenturnier: amateur,
  schiri_beschwerde: kreis, // „beim Kreis beschwert“
  // stories.js / personal.js / sagas.js
  umzug: semi, // neuer Job 90 km weg – Vollprofis ziehen nicht für einen Job weg
  jobverlust: semi,
  abschluss: semi,
  chef_samstag: amateur, // dein Chef – als Profitrainer hast du keinen
  chef_sponsor: amateur,
  vorstand_kasse: village,
  platz_verkauf: upTo(7), // Stadt verkauft den Platz – ein Stadion verkauft man nicht nebenbei
  fusion: upTo(7),
  profi_scout: amateur, // Scouts eines Profivereins – oben ist man selbst einer
  // life.js (Beruf neben dem Fußball): in der Regionalliga noch üblich, in der 3. Liga nicht
  schicht_tausch: semi,
  montage: semi,
  job_stress: semi,
  befoerderung: semi,
  elternzeit: semi,
  nebenjob: semi,
  // academy.js / sponsors.js / poaching.js
  nlz_anfrage: amateur, // oben hat der Verein selbst ein Leistungszentrum
  sponsor_sohn: village,
  profivertrag: amateur, // erster Profivertrag woanders – oben sind alle Vertragsspieler
  // leagueevents.js
  sportgericht: amateur, // „im Nebenzimmer einer Gaststätte“
  spielverlegung: amateur, // „Schützenfest“
  eintritt: between(4, 7),
  trommler: amateur,
  stadionsprecher: amateur,
  videoanalyse: amateur, // mit dem Handy vom Tribünendach
  testspiel_profi: amateur,
  ae_forderung: amateur, // Aufwandsentschädigung – ab der Regionalliga gibt es Verträge
  ordnerdienst: between(4, 7), // zwei Warnwesten und der Platzwart
  // seasonevents.js
  urlaub_finale: amateur,
  firmenlauf: amateur,
  platzsperre: outdoor(amateur), // oben: Rasenheizung, Kunstrasen, eigener Greenkeeper
  trainerschein: amateur, // C-Lizenz für 120 €
  kabine_undicht: village,
  schiri_mangel: upTo(5), // „Der Kreis meldet …“
  lizenzpflicht: between(4, 8),
  // localevents.js
  sturmwarnung: outdoor(),
  schneeschippen: outdoor(semi), // 3. Liga: Rasenheizung
  schiri_neuling: upTo(7),
  leihanfrage: amateur,
  fanclub_gruendung: amateur,
  fanclub_bus: amateur,
  altherren_ultras: amateur,
  platzwart_ruhestand: outdoor(amateur),
  platzwart_nachfolge: outdoor(amateur),
  kunstrasen_petition: outdoor(upTo(7)),
  wirt_kuendigt: amateur,
  wirt_neu: amateur,
  vater_sohn: amateur,
  fahrgemeinschaft_bruch: amateur, // oben fährt der Mannschaftsbus
  // phaseevents.js
  platz_unter_wasser: outdoor(amateur),
  kassenwart_belege: village,
  platzwart_krank: outdoor(amateur),
  helfer_abschluss: amateur,
  // clublife.js
  kassenpruefung: amateur,
  nachbarn: (c) => village(c) && !hasFacility(c, 'stadion'),
  ordnungsamt: village,
  flutlicht_strom: village,
  putzdienst: amateur,
  zapfanlage: amateur,
  // teenlife.js
  ausbildung: semi,
};

export const fitsEvent = (c, id) => !FIT[id] || FIT[id](c);
