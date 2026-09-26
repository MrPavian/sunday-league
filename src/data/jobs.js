// Was der Beruf auf dem Platz bringt. Kleine Boni, damit sich niemand nur nach
// dem Beruf aufstellt – aber genug, dass der Postbote nach 80 Minuten noch läuft.
//   attrs: gilt für den Spieler selbst
//   team:  gilt für alle Mitspieler im Spiel (gleiche Sorte zählt nur einmal)
//   medic: Verletzte im Kader sind schneller wieder da
import { tr } from '../core/i18n.js';

const P = (label, perk) => ({ ...perk, label });

export const JOB_PERKS = {
  // Laufberufe
  Postbote: P(tr('Läuft jeden Tag 15 km: mehr Ausdauer', 'Walks 15 km a day: more stamina'), { attrs: { stamina: 0.06 } }),
  Paketbote: P(tr('Treppen hoch, Treppen runter: mehr Ausdauer', 'Up and down stairs all day: more stamina'), { attrs: { stamina: 0.04, pace: 0.01 } }),
  Fahrradkurier: P(tr('Fährt 80 km am Tag: Tempo und Ausdauer', 'Rides 80 km a day: pace and stamina'), { attrs: { pace: 0.03, stamina: 0.03 } }),
  Pizzabote: P(tr('Immer in Eile: etwas schneller', 'Always in a hurry: a bit quicker'), { attrs: { pace: 0.03 } }),
  Kellner: P(tr('Serviert jeden Ball auf dem Tablett: besseres Passspiel', 'Serves every ball on a tray: better passing'), { attrs: { passing: 0.04, stamina: 0.02 } }),
  Fitnesstrainer: P(tr('Lebt im Studio: Tempo und Ausdauer', 'Lives at the gym: pace and stamina'), { attrs: { pace: 0.03, stamina: 0.03 } }),
  Sportlehrer: P(tr('Macht jeden Tag vor: Technik und Ausdauer', 'Demonstrates every day: technique and stamina'), { attrs: { technique: 0.03, stamina: 0.02 } }),
  Förster: P(tr('Kennt jeden Waldweg: mehr Ausdauer', 'Knows every forest trail: more stamina'), { attrs: { stamina: 0.04 } }),
  // Kraftberufe
  Dachdecker: P(tr('Schwindelfrei: gewinnt Kopfbälle', 'Has no fear of heights: wins headers'), { attrs: { heading: 0.05 } }),
  Gerüstbauer: P(tr('Schwindelfrei und zäh: Kopfball und Zweikampf', 'Head for heights and tough: headers and tackles'), { attrs: { heading: 0.03, tackling: 0.03 } }),
  Maurer: P(tr('Hände wie Schaufeln: stark im Zweikampf', 'Hands like shovels: strong in the tackle'), { attrs: { tackling: 0.04 } }),
  Landwirt: P(tr('Um fünf im Stall: Zweikampf und Ausdauer', 'In the barn by five: tackling and stamina'), { attrs: { tackling: 0.03, stamina: 0.03 } }),
  Müllwerker: P(tr('Hinten am Wagen, bei jedem Wetter: mehr Ausdauer', 'Hanging off the truck in any weather: more stamina'), { attrs: { stamina: 0.04, tackling: 0.01 } }),
  Feuerwehrmann: P(tr('Fürchtet nichts: Zweikampf und Ausdauer', 'Fears nothing: tackling and stamina'), { attrs: { tackling: 0.03, stamina: 0.02 } }),
  Polizist: P(tr('Stellt jeden: stark im Zweikampf', 'Stops anyone: strong in the tackle'), { attrs: { tackling: 0.03 } }),
  Türsteher: P(tr('Hier kommt keiner vorbei: Zweikampf', 'Nobody gets past: tackling'), { attrs: { tackling: 0.05, pace: -0.02 } }),
  Tätowierer: P(tr('Schaut böse: Gegner zucken im Zweikampf', 'Looks mean: opponents flinch in the tackle'), { attrs: { tackling: 0.02 } }),
  Hufschmied: P(tr('Schlägt fest zu: harter Schuss', 'Strikes hard: powerful shot'), { attrs: { shooting: 0.04 } }),
  // Feinmotorik und Überblick
  Barista: P(tr('Ruhige Hand, feiner Fuß: mehr Technik', 'Steady hand, soft touch: more technique'), { attrs: { technique: 0.03 } }),
  Uhrmacher: P(tr('Millimeterarbeit: mehr Technik', 'Precision work: more technique'), { attrs: { technique: 0.04, pace: -0.01 } }),
  Goldschmied: P(tr('Feinste Arbeit: mehr Technik', 'The finest work: more technique'), { attrs: { technique: 0.03 } }),
  Kranführer: P(tr('Überblick von oben: besseres Passspiel', 'The view from above: better passing'), { attrs: { passing: 0.04 } }),
  Fluglotse: P(tr('Hat alles auf dem Schirm: besseres Passspiel', 'Has everything on the radar: better passing'), { attrs: { passing: 0.04 } }),
  Taxifahrer: P(tr('Kennt jede Abkürzung: etwas schneller', 'Knows every shortcut: a bit quicker'), { attrs: { pace: 0.02, passing: 0.01 } }),
  Schornsteinfeger: P(tr('Bringt Glück: trifft öfter', 'Brings luck: scores more often'), { attrs: { shooting: 0.03 } }),
  Schlagzeuger: P(tr('Hat den Rhythmus: Technik und Passspiel', 'Has rhythm: technique and passing'), { attrs: { technique: 0.02, passing: 0.02 } }),
  Bademeister: P(tr('Sieht alles vom Hochsitz: guter Torwart', 'Sees everything from the chair: good in goal'), { attrs: { keeping: 0.04 } }),
  Sicherheitsmann: P(tr('Lässt nichts durch: guter Torwart', 'Lets nothing through: good in goal'), { attrs: { keeping: 0.03, tackling: 0.01 } }),
  'Student (12. Semester)': P(tr('Viel Zeit zum Kicken, wenig Schlaf: Technik rauf, Ausdauer runter', 'Lots of time for football, little sleep: more technique, less stamina'), { attrs: { technique: 0.03, stamina: -0.03 } }),
  Frührentner: P(tr('Weiß, wie es geht, nur nicht mehr so schnell', 'Knows how it’s done, just not as fast'), { attrs: { passing: 0.03, pace: -0.02 } }),
  Schichtarbeiter: P(tr('Kommt direkt von der Nachtschicht: weniger Ausdauer', 'Straight off the night shift: less stamina'), { attrs: { stamina: -0.03, tackling: 0.02 } }),
  Softwareentwickler: P(tr('Sitzt den ganzen Tag, denkt aber schnell: Pass rauf, Ausdauer runter', 'Sits all day but thinks fast: better passing, less stamina'), { attrs: { passing: 0.03, stamina: -0.02 } }),
  // Fürs ganze Team
  'Verkäufer im Getränkemarkt': P(tr('Bringt den Kollegen günstig Bier mit: bessere Teamchemie', 'Brings his teammates cheap beer: better team chemistry'), { team: { bier: { passing: 0.015, technique: 0.01 } } }),
  'Fahrer beim Getränkehandel': P(tr('Die Kiste ist immer schon im Auto: bessere Teamchemie', 'The crate is always already in the van: better team chemistry'), { team: { bier: { passing: 0.015, technique: 0.01 } } }),
  Bierbrauer: P(tr('Eigenes Helles nach dem Training: bessere Teamchemie', 'His own lager after training: better team chemistry'), { team: { bier: { passing: 0.015, technique: 0.01 } } }),
  Metzger: P(tr('Grillt nach jedem Heimspiel: alle laufen ein bisschen mehr', 'Barbecues after every home game: everyone runs a bit more'), { team: { grill: { stamina: 0.015 } } }),
  Koch: P(tr('Nudelparty vor dem Spiel: alle haben mehr Ausdauer', 'Pasta party before the match: everyone has more stamina'), { team: { grill: { stamina: 0.015 } } }),
  Bäcker: P(tr('Bringt sonntags Brötchen mit: alle haben mehr Ausdauer', 'Brings rolls on Sundays: everyone has more stamina'), { team: { grill: { stamina: 0.015 } } }),
  Grundschullehrer: P(tr('Erklärt alles dreimal geduldig: das Team spielt besser zusammen', 'Explains everything three times, patiently: the team plays better together'), { team: { schule: { passing: 0.01 } } }),
  Pfarrer: P(tr('Das Team betet vor dem Anstoß: alle bleiben ruhiger am Ball', 'The team prays before kick-off: everyone stays calmer on the ball'), { team: { segen: { technique: 0.01 } } }),
  DJ: P(tr('Macht die Kabinenmusik: das Team geht mit Schwung rein', 'Runs the dressing-room playlist: the team starts with a spring in its step'), { team: { musik: { pace: 0.01 } } }),
  Fahrlehrer: P(tr('Brüllt klare Anweisungen: das Team steht besser', 'Shouts clear instructions: the team keeps its shape better'), { team: { kommando: { tackling: 0.01 } } }),
  Physiotherapeut: P(tr('Tapet alle vor dem Spiel: Verletzte sind schneller zurück', 'Tapes everyone before the match: the injured come back sooner'), { medic: true }),
  Rettungssanitäter: P(tr('Erste Hilfe am Spielfeldrand: Verletzte sind schneller zurück', 'First aid on the touchline: the injured come back sooner'), { medic: true }),
  Tierarzt: P(tr('Hat schon Schlimmeres geflickt: Verletzte sind schneller zurück', 'Has patched up worse: the injured come back sooner'), { medic: true }),
  Orthopädietechniker: P(tr('Baut Einlagen für alle: Verletzte sind schneller zurück', 'Makes insoles for everyone: the injured come back sooner'), { medic: true }),
};

export const jobPerk = (job) => JOB_PERKS[job] ?? null;

const clampAttr = (v) => Math.max(0.05, Math.min(0.98, v));

// Boni aufs Spiel anwenden: eigener Beruf plus die Team-Boni der Mitspieler.
// Gibt neue Spielerobjekte zurück, der Pool bleibt unverändert.
export function applyJobPerks(players) {
  const team = {};
  for (const p of players) for (const [kind, bonus] of Object.entries(jobPerk(p.profession)?.team ?? {})) team[kind] ??= bonus;
  const bonuses = Object.values(team);
  return players.map((p) => {
    const own = jobPerk(p.profession)?.attrs;
    if (!own && !bonuses.length) return p;
    const attrs = { ...p.attrs };
    for (const b of [own ?? {}, ...bonuses]) for (const [k, v] of Object.entries(b)) if (attrs[k] != null) attrs[k] = clampAttr(attrs[k] + v);
    return { ...p, attrs };
  });
}

// Welche Team-Boni sind im Kader? Für die Anzeige im Vereinsheim.
export function teamPerkJobs(players) {
  return players.filter((p) => jobPerk(p.profession)?.team || jobPerk(p.profession)?.medic);
}
