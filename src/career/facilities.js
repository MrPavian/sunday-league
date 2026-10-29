// Vereinsheim ausbauen: Aus dem Bauwagen mit kalter Dusche wird Schritt für Schritt
// ein Vereinsheim mit Theke, Flutlicht und Tribüne. Jeder Ausbau kostet Geld und
// Bauzeit – oder einen Samstag Arbeitseinsatz, bei dem alles passieren kann.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { humanClub } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { first, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { chronicle } from './sagas.js';
import { hasGround, landOk, landState } from './platz.js';

export const FACILITIES = {
  duschen: { group: 'heim', name: tr('Warme Duschen', 'Hot showers'), cost: 180, weeks: 2, upkeep: 1, desc: tr('Weniger Absagen, und Neue kommen lieber.', 'Fewer drop-outs, and new players are keener to join.'), done: tr('Die erste warme Dusche seit 1987. Einer duscht 40 Minuten.', 'The first hot shower since 1987. Someone stays in for 40 minutes.') },
  grill: { group: 'gastro', name: tr('Grill & Theke', 'Barbecue & bar'), cost: 220, weeks: 2, upkeep: 0, desc: tr('Ein Viertel mehr Getränke- und Wurstverkauf bei Heimspielen.', 'A quarter more drinks and sausage sales at home games.'), done: tr('Die Theke steht! Der erste Kasten ist nach zwölf Minuten leer.', 'The bar is up! The first crate is empty after twelve minutes.') },
  ballmaschine: { group: 'heim', name: tr('Ballmaschine', 'Ball machine'), cost: 150, weeks: 1, upkeep: 0, desc: tr('Junge Spieler (bis 23) entwickeln sich schneller.', 'Young players (up to 23) develop faster.'), done: tr('Die Ballmaschine schießt härter als euer Stürmer. Der Torwart hat Angst.', 'The ball machine shoots harder than your striker. The keeper is scared.') },
  kabine: { group: 'heim', name: tr('Neue Kabine', 'New dressing room'), cost: 350, weeks: 3, upkeep: 1, desc: tr('Bessere Stimmung jede Woche, Neuzugänge sagen eher zu.', 'Better spirit every week, new signings say yes more often.'), done: tr('Neue Kabine mit Haken für alle. Und einer Bank, die nicht wackelt.', 'New dressing room with pegs for everyone. And a bench that doesn\'t wobble.') },
  flutlicht: { group: 'platz', name: tr('Flutlicht', 'Floodlights'), cost: 500, weeks: 3, upkeep: 3, desc: tr('Training nach Feierabend – kostet weniger Familienzeit, Spieler werden schneller wieder fit.', 'Training after work – costs less family time, players get fit again faster.'), done: tr('Das Flutlicht geht an. Die halbe Nachbarschaft kommt gucken.', 'The floodlights come on. Half the neighbourhood comes to look.') },
  vereinsbus: { group: 'heim', name: tr('Vereinsbus', 'Club minibus'), cost: 900, weeks: 2, upkeep: 3, needs: ['kabine'], desc: tr('Auswärtsfahrten halb so teuer, etwas weniger Absagen.', 'Away trips cost half, slightly fewer drop-outs.'), done: tr('Der Neunsitzer ist da – gebraucht, mit Vereinswappen auf der Tür. Die Hupe spielt „Oh, wie ist das schön".', 'The nine-seater has arrived – second-hand, with the club crest on the door. The horn plays a football chant.') },
  jugendhaus: { group: 'heim', name: tr('Jugendhaus', 'Youth centre'), cost: 1200, weeks: 4, upkeep: 4, needs: ['ballmaschine'], desc: tr('Ein Talent mehr pro Jahrgang, und die Jugend entwickelt sich schneller.', 'One more talent per intake, and the youth develop faster.'), done: tr('Das Jugendhaus steht: zwei Räume, eine Taktiktafel und ein Kicker. Die A-Jugend zieht praktisch ein.', 'The youth centre is up: two rooms, a tactics board and a table-football table. The U19s practically move in.') },
  // === Sportplatz, Tribünen, Gastro (ROADMAP 11.9) ===============================================================
  // Alle Preise, Bauzeiten und Nebenkosten sind Spielwerte (auf die Kasse des Spiels geeicht, scripts/longrun.mjs --bot),
  // nicht die echten Summen. Die Reihenfolge der Größen folgt der Wirklichkeit: Ein Kunstrasenplatz mit Entwässerung und
  // Flutlicht kostet eine Kommune rund 0,6–0,7 Mio. € (Lüneburg, mindestens 700 000 €, Ratsinformation
  // https://buergerinfo.stadt.lueneburg.de/public/wicket/resource/org.apache.wicket.Application/doc212872.pdf; Hamburg-Milchhalle
  // ca. 580 000 €, davon Flutlicht ≈ 60 000 €, 2016, https://gruene-nord.de/userspace/HH/galnord/Bilder/Fraktion/antraege/160712_HA_AN_GRUENE__SPD_SportplatzMilchhalle.pdf)
  // – der Rasenersatz ist also der mit Abstand teuerste Posten, das Flutlicht rund ein Zehntel.
  // land: braucht Baurecht auf dem Grund (Pacht mit Restlaufzeit oder Eigentum, siehe platz.js landOk).
  kunstrasen: { group: 'platz', land: true, ground: true, name: tr('Kunstrasen', 'Artificial turf'), cost: 2400, weeks: 8, upkeep: 3, desc: tr('Kein Verschleiß, keine Platzsperre, nichts zu mähen – und die Schule mietet ihn (+8 €/Woche).', 'No wear, no pitch closures, nothing to mow – and the school hires it (+€8/week).'), done: tr('Der Kunstrasen ist ausgerollt. Der Platzwart steht davor und weiß nicht, wohin mit seinen Händen.', 'The artificial turf is rolled out. The groundsman stands in front of it and does not know what to do with his hands.') },
  trainingsplatz: { group: 'platz', land: true, ground: true, name: tr('Zweiter Platz (Trainingsplatz)', 'Second pitch (training ground)'), cost: 1100, weeks: 6, upkeep: 2, desc: tr('Training und Ausweichen: der Hauptplatz wird geschont (kaum Trainingsverschleiß), bei Regen wird auf den Nebenplatz verlegt statt abgesagt.', 'Training and fall-back: the main pitch is spared (hardly any training wear) and in rain matches move to the side pitch instead of being called off.'), done: tr('Der Nebenplatz ist eingesät. Drei Wochen darf keiner drauf, dann kommt der Platzwart mit dem Zollstock.', 'The side pitch is sown. Nobody may set foot on it for three weeks, then the groundsman comes with a folding ruler.') },
  stehstufen: { group: 'tribuene', name: tr('Stehstufen', 'Standing steps'), cost: 300, weeks: 2, upkeep: 0, desc: tr('Drei Betonstufen am Spielfeldrand: 12 % mehr Zuschauer, Platz für 400.', 'Three concrete steps at the touchline: 12 % more spectators, room for 400.'), done: tr('Stehstufen am Spielfeldrand. Die erste Reihe bringt Kissen mit.', 'Standing steps at the touchline. The front row brings cushions.') },
  sitzplaetze: { group: 'tribuene', land: true, name: tr('Sitzplätze', 'Seats'), cost: 1400, weeks: 6, upkeep: 3, needs: ['tribuene'], desc: tr('Schalensitze statt Holzbank: 55 % mehr Zuschauer als ohne Ausbau, Platz für 800.', 'Bucket seats instead of wooden benches: 55 % more spectators than without, room for 800.'), done: tr('Schalensitze in Vereinsfarben. Zwei Reihen sind schon vergeben – an Dauerkartenbesitzer mit Sitzkissen.', 'Bucket seats in club colours. Two rows are already taken – by season-ticket holders with cushions.') },
  tribdach: { group: 'tribuene', land: true, name: tr('Tribünendach', 'Stand roof'), cost: 900, weeks: 4, upkeep: 2, needs: ['sitzplaetze'], desc: tr('Trocken bleiben: bei Regen und Schnee kommen fast so viele wie sonst, Platz für 1000.', 'Stay dry: in rain and snow almost as many come as usual, room for 1,000.'), done: tr('Das Dach ist drauf. Beim ersten Platzregen jubelt die Tribüne lauter als bei jedem Tor.', 'The roof is on. At the first downpour the stand cheers louder than at any goal.') },
  bratwurststand: { group: 'gastro', name: tr('Bratwurststand', 'Sausage stall'), cost: 120, weeks: 1, upkeep: 0, desc: tr('Ein Rost, ein Sonnenschirm: 10 % mehr Getränke- und Wurstverkauf.', 'A grill and a parasol: 10 % more drinks and sausage sales.'), done: tr('Der erste Rost glüht. Der Geruch zieht bis zum Parkplatz.', 'The first grill glows. The smell reaches the car park.') },
  biergarten: { group: 'gastro', land: true, name: tr('Biergarten', 'Beer garden'), cost: 650, weeks: 3, upkeep: 2, needs: ['grill'], desc: tr('Bierbänke unter Kastanien: der Verkauf steigt um die Hälfte, bei Sonne noch mehr.', 'Beer benches under chestnut trees: sales go up by half, even more in the sun.'), done: tr('Der Biergarten ist eröffnet. Die Kastanie spendet Schatten, die Nachbarn Beschwerden.', 'The beer garden is open. The chestnut gives shade, the neighbours give complaints.') },
  // Ab der Landesliga: Ausbau zum kleinen Stadion. Fassungsvermögen wie die Mindestgröße der Regionalliga West und Bayern
  // (2500 Plätze, davon 150 bzw. 100 überdachte Sitzplätze: WDFV-Zulassungsrichtlinien,
  // https://wdfv.de/download/herren-regionalliga-west/herren-regionalliga-west-richtlinien-fuer-das-allgemeine-zulassungsverfahren.pdf;
  // BFV-Erklärung zur Spielstätte 2024/25). Für die Oberliga gibt es keine Mindestgröße. Preis, Bauzeit und Nebenkosten sind Spielwerte.
  stadion: { group: 'tribuene', land: true, minLevel: 6, name: tr('Stadionausbau', 'Stadium upgrade'), cost: 6000, weeks: 10, upkeep: 8, needs: ['tribdach'], desc: tr('Stehwälle rundum, Kassenhäuschen, Ordner: Platz für 2500 – so viel verlangt die Regionalliga.', 'Terracing all round, ticket booths, stewards: room for 2,500 – what the Regionalliga requires.'), done: tr('Das Stadion ist fertig. Beim ersten Heimspiel verläuft sich der Platzwart auf dem Weg zum Kassenhäuschen.', 'The stadium is finished. At the first home game the groundsman gets lost on the way to the ticket booth.') },
  tribuene: { group: 'tribuene', name: tr('Kleine Tribüne', 'Small stand'), cost: 700, weeks: 4, upkeep: 2, needs: ['grill'], desc: tr('Drei Stufen, ein Dach – ein Drittel mehr Zuschauer.', 'Three steps and a roof – a third more spectators.'), done: tr('Die Tribüne steht! Drei Stufen Beton und ein Dach aus dem Baumarkt.', 'The stand is up! Three concrete steps and a roof from the DIY store.') },
};

export function facilities(c) {
  c.facilities ??= { built: {}, building: null };
  c.facilities.queue ??= [];
  return c.facilities;
}
export const KUNST_HIRE = 8; // Spielwert €/Woche
export const hasFacility = (c, id) => !!c.facilities?.built?.[id];

export const FACILITY_GROUPS = [
  { id: 'heim', name: tr('Vereinsheim', 'Clubhouse') },
  { id: 'platz', name: tr('Sportplatz', 'Sports ground') },
  { id: 'tribuene', name: tr('Tribünen', 'Stands') },
  { id: 'gastro', name: tr('Gastro', 'Catering') },
];

// Stufen: der höchste Ausbau zählt. Zuschauerbedarf (fansMul) und Fassungsvermögen (capacity) – Spielwerte; die Tribüne
// (ab 1.33) und das Grundmaß waren schon vorher so (unverändert, damit alte Spielstände gleich bleiben).
const STAND_TIERS = [['stadion', 1.65, 2500], ['tribdach', 1.65, 1000], ['sitzplaetze', 1.55, 800], ['tribuene', 1.33, 600], ['stehstufen', 1.12, 400]];
const stand = (c) => STAND_TIERS.find(([id]) => hasFacility(c, id));
export const standLevel = (c) => (stand(c) ? STAND_TIERS.length - STAND_TIERS.indexOf(stand(c)) : 0);
export const CAPACITY_BASE = 250; // Spielwert: Zaun und Wiese rund um den Platz
export const capacity = (c) => stand(c)?.[2] ?? CAPACITY_BASE;
const GASTRO_TIERS = [['biergarten', 1.5], ['grill', 1.25], ['bratwurststand', 1.1]];

// Wirkung einzelner Ausbauten an den passenden Stellen im Spiel.
export const absenceMul = (c) => (hasFacility(c, 'duschen') ? 0.92 : 1) * (hasFacility(c, 'vereinsbus') ? 0.96 : 1);
// weatherId: Der Biergarten lebt von der Sonne (×1,15 bei Sonne/Hitze).
export const salesMul = (c, weatherId = null) => (GASTRO_TIERS.find(([id]) => hasFacility(c, id))?.[1] ?? 1) * (hasFacility(c, 'biergarten') && (weatherId === 'sonne' || weatherId === 'hitze') ? 1.15 : 1);
export const fansMul = (c) => stand(c)?.[1] ?? 1;
// Das Dach hält bei Regen und Schnee die Leute: die Wetterbremse auf die Zuschauer wird halbiert.
export const roofRelief = (c) => hasFacility(c, 'tribdach');
export const recruitBonus = (c) => (hasFacility(c, 'duschen') ? 0.03 : 0) + (hasFacility(c, 'kabine') ? 0.06 : 0);
export const youthGrowthMul = (c) => (hasFacility(c, 'ballmaschine') ? 1.25 : 1) * (hasFacility(c, 'jugendhaus') ? 1.2 : 1);
export const travelMul = (c) => (hasFacility(c, 'vereinsbus') ? 0.5 : 1);
export const youthExtra = (c) => (hasFacility(c, 'jugendhaus') ? 1 : 0);
export const trainingRelief = (c) => (hasFacility(c, 'flutlicht') ? 1 : 0);

// Preis und Bauzeit: Auf gepachtetem Grund will die Gemeinde mitreden (Baugenehmigung: +5 % Gebühr, +1 Woche);
// wer den Grund besitzt, baut ohne. Spielwerte. Arbeitseinsatz: halber Preis, doppelte Zeit.
export function buildCost(c, id, mode = 'handwerker') {
  const def = FACILITIES[id];
  const permit = def.land && landState(c) !== 'eigen' ? 1.05 : 1;
  return Math.round((mode === 'einsatz' ? def.cost / 2 : def.cost) * permit);
}
export function buildWeeks(c, id, mode = 'handwerker') {
  const def = FACILITIES[id];
  return (mode === 'einsatz' ? def.weeks * 2 : def.weeks) + (def.land && landState(c) !== 'eigen' ? 1 : 0);
}

// Warum nicht? null = baubar. Gründe: 'built' | 'building' | 'needs' | 'level' (Liga zu tief) | 'ground' (kein richtiger Platz) | 'land' (Pachtvertrag zu kurz).
export function buildBlock(c, id, { queued = false } = {}) {
  const f = facilities(c);
  const def = FACILITIES[id];
  if (!def) return 'unknown';
  if (f.built[id]) return 'built';
  if (!queued && f.building) return 'building';
  const pending = new Set([f.building?.id, ...f.queue.map((q) => q.id)].filter(Boolean));
  if (queued && pending.has(id)) return 'queued';
  if ((def.needs ?? []).some((n) => !f.built[n] && !(queued && pending.has(n)))) return 'needs';
  if (def.minLevel && (c.level ?? 1) < def.minLevel) return 'level';
  if (def.ground && !hasGround(c)) return 'ground';
  if (def.land && !landOk(c)) return 'land';
  return null;
}
export const canBuild = (c, id) => buildBlock(c, id) === null;

// Handwerker kosten das Volle. Arbeitseinsatz: halber Preis, doppelte Zeit – und Überraschungen.
export function build(c, id, mode = 'handwerker') {
  if (!canBuild(c, id)) return null;
  const def = FACILITIES[id];
  const cost = buildCost(c, id, mode);
  if (c.cash < cost) return null;
  book(c, `${def.name}: ${mode === 'einsatz' ? tr('Material für den Arbeitseinsatz', 'materials for the work party') : tr('Handwerker', 'builders')}`, -cost);
  facilities(c).building = { id, weeks: buildWeeks(c, id, mode), mode };
  let text = mode === 'einsatz' ? tr('Samstag, 9 Uhr, Arbeitseinsatz. Wer Werkzeug hat, bringt es mit.', 'Saturday, 9am, work party. Bring tools if you have them.') : tr('Die Handwerker kommen. Irgendwann. Diese Woche vielleicht.', 'The builders are coming. At some point. Maybe this week.');
  if (mode === 'einsatz') text = workParty(c, id);
  facilities(c).note = text;
  return text;
}

const helpers = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx));

function workParty(c, id) {
  const rng = createRng((c.seed * 29 + c.season * 7 + c.round * 3 + id.length) >>> 0);
  const b = facilities(c).building;
  const run = outcome([
    { w: 3, run: () => (adjustMood(c, 0.06), tr('Zwölf Leute, drei Bohrmaschinen, ein Grill. Das schweißt zusammen.', 'Twelve people, three drills, one barbecue. That brings you together.')) },
    { w: 2, run: () => ((b.weeks = Math.max(1, b.weeks - 2)), adjustMood(c, 0.04), tr('Einer ist gelernter Maurer und übernimmt das Kommando. Doppelt so schnell wie gedacht.', 'One of them is a trained bricklayer and takes charge. Twice as fast as expected.')) },
    {
      w: 1.5,
      run: () => {
        const s = rng.pick(helpers(c));
        c.players[s].injuryWeeks = Math.max(c.players[s].injuryWeeks ?? 0, 2);
        c.players[s].injury = { label: tr('Daumen (Hammer)', 'thumb (hammer)') };
        sitOut(c, s);
        return tr(`${first(c, s)} haut sich mit dem Hammer auf den Daumen. Zwei Wochen raus – und er muss sich das noch lange anhören.`, `${first(c, s)} hits his thumb with a hammer. Out for two weeks – and he will be hearing about it for a long time.`);
      },
    },
    { w: 1, run: () => ((b.weeks += 2), tr('Es kommen nur drei. Die anderen haben „was mit der Familie". Das dauert länger.', 'Only three show up. The others have "family stuff". It will take longer.')) },
    { w: 1, run: () => (book(c, tr('Materialspende Sanitär Blum', 'Material donation Sanitär Blum'), 40), tr('Ein Sponsor bringt Material vorbei und will nur ein Schild dafür. 40 € gespart.', 'A sponsor drops off materials and only wants a sign in return. €40 saved.')) },
    { w: 1, run: () => (adjustMood(c, -0.04), book(c, tr('Falsch gebohrt (Wasserleitung)', 'Drilled in the wrong place (water pipe)'), -30), tr('Einer bohrt in die Wasserleitung. 30 € Notdienst und eine nasse Kabine.', 'Someone drills into the water pipe. €30 emergency plumber and a wet dressing room.')) },
    { w: 0.7, run: () => ((c.flags.pressWeeks = 2), adjustMood(c, 0.05), tr('Das Kreisblatt kommt vorbei: „Hier packt noch jeder an!" Mehr Zuschauer am Sonntag.', 'The District Gazette drops by: "Everyone still mucks in here!" More spectators on Sunday.')) },
  ]);
  return run(c, {}, rng);
}

// Bauschlange: Was nicht sofort gebaut werden kann (andere Baustelle läuft), wird vorgemerkt – bezahlt wird erst beim
// Baustart (der Preis kann sich bis dahin ändern). Höchstens drei Einträge.
export const QUEUE_MAX = 3;
export function enqueue(c, id, mode = 'handwerker') {
  const f = facilities(c);
  if (!f.building || f.queue.length >= QUEUE_MAX || buildBlock(c, id, { queued: true }) !== null) return false;
  f.queue.push({ id, mode });
  return true;
}
export function dequeue(c, id) {
  const f = facilities(c);
  const n = f.queue.length;
  f.queue = f.queue.filter((q) => q.id !== id);
  // Wer von dem Gestrichenen abhing, fliegt mit raus.
  let again = true;
  while (again) {
    again = false;
    for (const q of [...f.queue]) if ((FACILITIES[q.id].needs ?? []).some((x) => !f.built[x] && x !== f.building?.id && !f.queue.some((o) => o.id === x))) {
      f.queue = f.queue.filter((o) => o !== q);
      again = true;
    }
  }
  return f.queue.length < n;
}
// Nach Fertigstellung: der nächste in der Schlange startet, sobald die Kasse reicht und er noch baubar ist.
function startNext(c) {
  const f = facilities(c);
  while (f.queue.length && !f.building) {
    const q = f.queue[0];
    if (buildBlock(c, q.id) !== null) {
      f.queue.shift(); // nicht mehr baubar (z. B. Pachtvertrag zu kurz geworden)
      continue;
    }
    if (c.cash < buildCost(c, q.id, q.mode)) {
      f.note = tr(`${FACILITIES[q.id].name}: Die Kasse reicht noch nicht für den Baustart.`, `${FACILITIES[q.id].name}: not enough in the kitty to start building yet.`);
      return;
    }
    f.queue.shift();
    build(c, q.id, q.mode);
  }
}

// Jede Woche: Bauen, Nebenkosten, und die neue Kabine hebt die Laune.
export function weeklyFacilities(c) {
  const f = facilities(c);
  if (f.building) {
    f.building.weeks--;
    if (f.building.weeks <= 0) {
      const def = FACILITIES[f.building.id];
      f.built[f.building.id] = c.season;
      chronicle(c, tr(`${def.name} fertig${f.building.mode === 'einsatz' ? ' – in Eigenarbeit gebaut' : ''}.`, `${def.name} finished${f.building.mode === 'einsatz' ? ' – built by the members themselves' : ''}.`));
      c.week?.chat.push({ from: null, text: tr(`Fertig: ${def.name}! ${def.done}`, `Finished: ${def.name}! ${def.done}`), time: 'Fr 18:00' });
      adjustMood(c, 0.05);
      f.building = null;
      f.note = null; // „Die Handwerker kommen …" ist erledigt
    }
  }
  startNext(c);
  const upkeep = Object.keys(f.built).reduce((s, id) => s + (FACILITIES[id]?.upkeep ?? 0), 0);
  if (upkeep) book(c, tr('Nebenkosten Vereinsheim (Strom, Wasser)', 'Clubhouse running costs (power, water)'), -upkeep);
  if (hasFacility(c, 'kabine')) adjustMood(c, 0.01);
  // Kunstrasen: Schulen und Firmen mieten ihn (Spielwert).
  if (hasFacility(c, 'kunstrasen')) book(c, tr('Platzvermietung (Kunstrasen)', 'Pitch hire (artificial turf)'), KUNST_HIRE);
}

