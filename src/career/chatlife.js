// Chat-Leben (ROADMAP 11.13): Farbe aus dem Vereinsumfeld, ohne Entscheidung – Ort, Nachbarn, Gemeinde, Sponsoren, Fans, andere
// Vereine und Unerwartetes. Gezählt vor dem Einbau (6 Karrieren × 4 Saisons, 264 Wochen): 17 Nachrichten je Woche, davon rund
// 8 Zusagen und die Spielansage; Nachrichten über das Leben rund um den Verein fehlten fast ganz. Deshalb jede Woche eine,
// manchmal zwei, passend zur Lage (Wetter, Saisonphase, eigene Sponsoren, Rivalen, Ausbau). Dieselbe frühestens nach 16 Wochen.
// Eigener Zufall (hash): kein bestehender Zufallsstrom verschiebt sich. Reine Farbe, keine Wirkung auf Kasse oder Spiel.
import { tr } from "../core/i18n.js";
import { createRng } from "../core/rng.js";
import { humanClub, playerOf } from "./career.js";
import { hasFacility } from "./facilities.js";
import { rivalList } from "./rivals.js";
import { bossOf } from "./sponsors.js";

const hash = (...parts) =>
  parts.reduce(
    (h, p) => (Math.imul(h ^ p, 0x9e3779b1) + 0x7f4a7c15) >>> 0,
    0x3c6ef372,
  );
export const GAP = 16; // Wochen, bis dieselbe Nachricht wiederkommen darf
const SECOND = 0.3; // Chance auf eine zweite Nachricht in der Woche (Spielwert)

const firstOf = (c, idx) => playerOf(c, idx).name.split(" ")[0];
const mates = (c) => humanClub(c).squad.filter((i) => i !== c.coach?.idx);
const weather = (c) => c.week?.weather?.id ?? null;
const half = (c) => (c.round < (c.fixtures?.length ?? 10) / 2 ? 1 : 2);
const sponsor = (c, rng) => (c.sponsors?.length ? rng.pick(c.sponsors) : null);
const rival = (c) => rivalList(c).find((r) => r.here) ?? null;

// from: 'mate' = ein Spieler aus dem Kader, null = Meldung (Text mit Absender), w = Gewicht, if = passt gerade.
export const LIFE = [
  // Ort und Gemeinde
  {
    id: "baustelle",
    from: null,
    text: () =>
      tr(
        "Gemeindeblatt: Die Zufahrt zum Sportplatz ist ab Montag halbseitig gesperrt. Kanalarbeiten, voraussichtlich drei Wochen.",
        "Parish newsletter: the road to the ground is half-closed from Monday. Sewer works, probably three weeks.",
      ),
  },
  {
    id: "kirmes",
    from: "mate",
    if: (c) => half(c) === 1,
    text: (c, rng, m) =>
      tr(
        `Wer geht Samstag auf die Kirmes? ${firstOf(c, m)} hat letztes Jahr am Autoscooter einen Zahn verloren.`,
        `Who's going to the funfair on Saturday? ${firstOf(c, m)} lost a tooth on the dodgems last year.`,
      ),
  },
  {
    id: "buergermeister",
    from: null,
    text: () =>
      tr(
        "Der Bürgermeister war beim Training. Hat zwei Bälle über den Zaun geschossen und ist dann zum nächsten Termin.",
        "The mayor came to training. Kicked two balls over the fence and left for his next appointment.",
      ),
  },
  {
    id: "glascontainer",
    from: "mate",
    text: () =>
      tr(
        "Kann mal jemand dem Ordnungsamt sagen, dass der Glascontainer nicht auf UNSEREN Parkplatz gehört?",
        "Can someone tell the council the bottle bank does not belong on OUR car park?",
      ),
  },
  {
    id: "wahl",
    from: null,
    if: (c) => half(c) === 2,
    text: () =>
      tr(
        "Gemeindeblatt: Am Sonntag ist Wahl. Das Wahllokal ist im Vereinsheim – bitte keine Stollenschuhe im Flur.",
        "Parish newsletter: election on Sunday. The polling station is in the clubhouse – no studs in the corridor, please.",
      ),
  },
  {
    id: "feuerwehr",
    from: "mate",
    text: () =>
      tr(
        "Die Feuerwehr fragt, ob wir beim Grillfest Würstchen drehen. Im Gegenzug spritzen sie im Sommer den Platz.",
        "The fire brigade asks if we can man the grill at their barbecue. In return they water our pitch in summer.",
      ),
  },
  // Nachbarn
  {
    id: "nachbar_ball",
    from: "mate",
    text: () =>
      tr(
        "Herr Kowalczyk von nebenan hat schon wieder einen Ball einbehalten. „Bis Saisonende.“ Hat er gesagt.",
        'Mr Kowalczyk next door has confiscated another ball. "Until the end of the season", he says.',
      ),
  },
  {
    id: "nachbar_licht",
    from: null,
    if: (c) => hasFacility(c, "flutlicht"),
    text: () =>
      tr(
        "Brief von der Nachbarschaft: Das Flutlicht scheint ins Schlafzimmer. Ob man das nicht um 21:30 Uhr dimmen könne.",
        "Letter from the neighbours: the floodlights shine into the bedroom. Could they be dimmed at 9.30 pm.",
      ),
  },
  {
    id: "nachbar_hund",
    from: "mate",
    text: () =>
      tr(
        "Der Dackel vom Nachbarn hat beim Training wieder mitgespielt. Bester Pressingspieler, den wir haben.",
        "The neighbour's dachshund joined in training again. Best presser we have.",
      ),
  },
  {
    id: "nachbar_kuchen",
    from: null,
    text: () =>
      tr(
        "Frau Pohl aus der Siedlung hat einen Blechkuchen an der Kabine abgestellt. Ohne Zettel. Wir danken trotzdem.",
        "Mrs Pohl from the estate left a tray bake at the dressing room. No note. Thank you anyway.",
      ),
  },
  // Sponsoren
  {
    id: "sponsor_besuch",
    from: null,
    if: (c) => !!c.sponsors?.length,
    text: (c, rng) => {
      const s = sponsor(c, rng);
      return tr(
        `${bossOf(s)} (${s.name}) war beim Training und hat gefragt, wer von euch die Rückennummer 10 hat. Nur so.`,
        `${bossOf(s)} (${s.name}) dropped by at training and asked who wears the number 10. Just curious.`,
      );
    },
  },
  {
    id: "sponsor_gutschein",
    from: "mate",
    if: (c) => !!c.sponsors?.length,
    text: (c, rng) => {
      const s = sponsor(c, rng);
      return tr(
        `Hab bei ${s.name} gesagt, dass ich im Verein spiele. Zehn Prozent! Hätte ich das mal früher gewusst.`,
        `Told them at ${s.name} I play for the club. Ten percent off! Wish I'd known sooner.`,
      );
    },
  },
  {
    id: "sponsor_foto",
    from: null,
    if: (c) => !!c.sponsors?.length,
    text: (c, rng) => {
      const s = sponsor(c, rng);
      return tr(
        `Im Schaufenster von ${s.name} hängt jetzt unser Mannschaftsfoto. Leider das, auf dem alle die Augen zu haben.`,
        `Our team photo is now in the window at ${s.name}. Sadly the one where everyone has their eyes shut.`,
      );
    },
  },
  // Fans
  {
    id: "schal",
    from: null,
    text: (c) =>
      tr(
        `Oma Gerda strickt Schals in den Vereinsfarben. Bisher drei. Einer davon ist ein Topflappen geworden.`,
        `Grandma Gerda is knitting scarves in the club colours. Three so far. One of them turned into a pot holder.`,
      ),
  },
  {
    id: "kinder_autogramm",
    from: "mate",
    text: (c, rng, m) =>
      tr(
        `Zwei Kinder wollten nach dem Spiel ein Autogramm von ${firstOf(c, m)}. Er hat dreimal nachgefragt, ob sie ihn meinen.`,
        `Two kids wanted ${firstOf(c, m)}'s autograph after the game. He asked three times if they meant him.`,
      ),
  },
  {
    id: "fan_banner",
    from: null,
    text: (c) =>
      tr(
        `Am Zaun hängt seit Samstag ein Bettlaken: „${humanClub(c).short} – unser Sonntag“. Wer war das? Schön ist es.`,
        `Since Saturday there's a bedsheet on the fence: "${humanClub(c).short} – our Sunday". Who did it? It's lovely.`,
      ),
  },
  {
    id: "fan_trommel",
    from: "mate",
    text: () =>
      tr(
        "Der Typ mit der Trommel war wieder da. Ich glaub, der kommt gar nicht wegen uns. Der trommelt einfach gern.",
        "The drum guy was back. I don't think he even comes for us. He just likes drumming.",
      ),
  },
  // Andere Vereine
  {
    id: "rivale_klatsch",
    from: "mate",
    if: (c) => !!rival(c),
    text: (c) =>
      tr(
        `Hab gehört, bei ${rival(c).name} haben sie ein Foto von uns in der Kabine hängen. Mit Dartpfeilen drin.`,
        `Heard ${rival(c).name} have a photo of us in their dressing room. With darts in it.`,
      ),
  },
  {
    id: "nachbarverein",
    from: null,
    text: () =>
      tr(
        "Kreisblatt: Der SpVgg Kanalwiesen sucht dringend einen Torwart. „Handschuhe stellt der Verein.“",
        'District Gazette: SpVgg Kanalwiesen urgently need a goalkeeper. "Gloves provided by the club."',
      ),
  },
  {
    id: "tabelle_klatsch",
    from: "mate",
    if: (c) => c.round >= 3,
    text: (c) => {
      const o = c.clubs.filter((x) => !x.human);
      const cl = o[(c.round + (c.season ?? 1)) % o.length];
      return tr(
        `Habt ihr gesehen, ${cl.name} hat wieder einen neuen Trainer? Der dritte, seit ich zähle.`,
        `Did you see ${cl.name} have a new manager again? The third since I started counting.`,
      );
    },
  },
  {
    id: "altherren",
    from: null,
    text: () =>
      tr(
        "Die Alten Herren vom Nachbardorf fordern euch zum Elfmeterschießen heraus. Einsatz: eine Kiste. Mehr will keiner wissen.",
        "The veterans from the next village challenge you to a penalty shoot-out. Stake: a crate. Nobody wants to know more.",
      ),
  },
  // Wetter und Jahreszeit
  {
    id: "schnee",
    from: "mate",
    if: (c) => weather(c) === "schnee" || weather(c) === "frost",
    text: () =>
      tr(
        "Hat jemand einen Schneeschieber? Die Linien sieht man nicht mehr. Die Eckfahnen auch nicht.",
        "Anyone got a snow shovel? You can't see the lines any more. Or the corner flags.",
      ),
  },
  {
    id: "hitze",
    from: "mate",
    if: (c) => weather(c) === "hitze" || weather(c) === "sonne",
    text: () =>
      tr(
        "Wer bringt Sonntag die Wassermelone mit? Letztes Mal hatte keiner ein Messer.",
        "Who's bringing the watermelon on Sunday? Last time nobody had a knife.",
      ),
  },
  {
    id: "regen",
    from: "mate",
    if: (c) => weather(c) === "regen",
    text: () =>
      tr(
        "Kabine ist wieder nass. Irgendwo im Dach ist ein Loch, das nur bei Regen da ist.",
        "The dressing room is wet again. There's a hole in the roof that only exists when it rains.",
      ),
  },
  {
    id: "saisonstart",
    from: "mate",
    if: (c) => c.round <= 1,
    text: () =>
      tr(
        "Neue Saison, neues Glück. Ich hab sogar neue Schienbeinschoner. Die alten waren aus der D-Jugend.",
        "New season, new luck. I even got new shin pads. The old ones were from the under-12s.",
      ),
  },
  {
    id: "endspurt",
    from: "mate",
    if: (c) => (c.fixtures?.length ?? 0) - c.round <= 2,
    text: () =>
      tr(
        "Nur noch zwei Spiele. Ich merk, wie meine Knie schon Urlaub planen.",
        "Only two games left. I can feel my knees planning their holiday.",
      ),
  },
  // Unerwartetes
  {
    id: "fuchs",
    from: null,
    text: () =>
      tr(
        "Platzwart meldet: Ein Fuchs hat sich unter dem Geräteschuppen eingerichtet. Er bleibt. Der Fuchs, nicht der Platzwart.",
        "Groundsman reports: a fox has moved in under the shed. It's staying. The fox, not the groundsman.",
      ),
  },
  {
    id: "rosa",
    from: "mate",
    text: () =>
      tr(
        "Wer hat die Trikots mit dem roten Leibchen gewaschen? Wir spielen Sonntag in Rosa. Ich find's gut.",
        "Who washed the kits with the red bib? We're playing in pink on Sunday. I quite like it.",
      ),
  },
  {
    id: "schluessel",
    from: "mate",
    text: () =>
      tr(
        "Kabinenschlüssel ist weg. Letzte Spur: Jacke vom Kapitän, Kneipe, 23 Uhr.",
        "Dressing-room key is gone. Last seen: captain's jacket, pub, 11 pm.",
      ),
  },
  {
    id: "zeitung_falsch",
    from: null,
    text: (c, rng, m) =>
      tr(
        `Kreisblatt-Bildunterschrift von Sonntag: „${firstOf(c, m)} (links) beim Kopfball.“ Auf dem Foto ist ${firstOf(c, m)} rechts. Und es ist kein Kopfball.`,
        `District Gazette caption from Sunday: "${firstOf(c, m)} (left) heading the ball." In the photo ${firstOf(c, m)} is on the right. And it's not a header.`,
      ),
  },
  {
    id: "storch",
    from: null,
    text: () =>
      tr(
        "Auf dem Flutlichtmast sitzt seit gestern ein Storch. Der Platzwart sagt, das bringt Glück. Oder Arbeit.",
        "Since yesterday there's a stork on the floodlight mast. The groundsman says it brings luck. Or work.",
      ),
  },
  {
    id: "tor_weg",
    from: "mate",
    text: () =>
      tr(
        "Ein Tor vom Nebenplatz steht auf unserem Platz. Keiner weiß, wie. Es ist sehr schwer.",
        "A goal from the next pitch is standing on ours. Nobody knows how. It's very heavy.",
      ),
  },
  {
    id: "ball_dach",
    from: "mate",
    text: (c, rng, m) =>
      tr(
        `${firstOf(c, m)} hat beim Abschlusstraining den Ball aufs Vereinsheim geschossen. Da liegen jetzt sieben.`,
        `${firstOf(c, m)} kicked the ball onto the clubhouse roof in the last session. There are seven up there now.`,
      ),
  },
  {
    id: "hochzeit",
    from: "mate",
    text: (c, rng, m) =>
      tr(
        `Kleine Info: ${firstOf(c, m)} hat sich verlobt! Spalier stehen wir aber erst nach dem Spiel.`,
        `Quick update: ${firstOf(c, m)} got engaged! We'll form the guard of honour after the game though.`,
      ),
  },
  {
    id: "baby",
    from: "mate",
    if: (c) => c.round % 3 === 0,
    text: (c, rng, m) =>
      tr(
        `${firstOf(c, m)} ist Papa geworden! Name steht noch nicht fest. Er schlägt „Kevin-Pokal“ vor. Sie nicht.`,
        `${firstOf(c, m)} became a dad! No name yet. He's suggesting "Kevin-Cup". She isn't.`,
      ),
  },
];

const TIMES = [
  "Mo 12:41",
  "Di 07:15",
  "Di 21:03",
  "Mi 13:20",
  "Do 18:47",
  "Fr 16:05",
  "Sa 10:22",
];

// Zu Wochenbeginn (hooks.js startWeek).
export function startWeek(c) {
  const w = c.week;
  if (!w?.chat) return;
  const squad = mates(c);
  if (!squad.length) return;
  const st = (c.chatLife ??= { recent: [], week: 0 });
  st.week++;
  const rng = createRng(
    hash(c.seed ?? 0, c.season ?? 1, c.round ?? 0, w.breakWeek ? 1 : 0, 7701),
  );
  const n = 1 + (rng.chance(SECOND) ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const used = new Set(
      st.recent.filter((r) => st.week - r.week < GAP).map((r) => r.id),
    );
    const pool = LIFE.filter((e) => !used.has(e.id) && (!e.if || e.if(c)));
    if (!pool.length) return;
    const e = rng.pick(pool);
    const mate = rng.pick(squad); // um wen es geht
    const others = squad.filter((i) => i !== mate);
    const speaker = others.length ? rng.pick(others) : mate; // wer es schreibt (nicht über sich selbst in der dritten Person)
    const text = e.text(c, rng, mate);
    w.chat.push({
      from: e.from === "mate" ? speaker : null,
      text,
      time: TIMES[(k * 3 + (c.round ?? 0)) % TIMES.length],
      life: e.id,
    });
    st.recent = [
      ...st.recent.filter((r) => st.week - r.week < GAP),
      { id: e.id, week: st.week },
    ];
  }
}
