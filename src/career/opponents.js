// Gegner mit Gesicht: Jeder Verein hat einen Trainer mit eigener Art, der sich im
// Kreisblatt äußert. Nach dem Spiel gibt es Handschlag oder Rudelbildung – das
// merkt man sich. Mit wem man es sich verscherzt, der kommt hitziger zurück; wer
// fair war, bei dem will vielleicht einer wechseln.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { personName } from '../data/origins.js';
import { humanClub, playerOf, table } from './career.js';
import { chronicle } from './sagas.js';

const TYPES = {
  grossmaul: { name: tr('Großmaul', 'Big mouth') },
  stratege: { name: tr('Stratege', 'Tactician') },
  oldschool: { name: tr('Alte Schule', 'Old school') },
  kumpeltyp: { name: tr('Kumpeltyp', 'Good bloke') },
};

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export function coachOf(club) {
  const h = hash(club.id);
  const types = Object.keys(TYPES);
  return { name: personName(createRng(h), 42 + (h % 20)), type: types[(h >>> 16) % types.length] };
}

const feudOf = (c, id) => c.feuds?.[id] ?? 0;
// Text-Variante ohne Zufallsstrom: aus Verein, Saison und Runde abgeleitet, damit der Spielablauf gleich bleibt.
const spin = (list, ...n) => list[Math.abs([...n.join('|')].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7)) % list.length];

// Wochenbeginn: Vorbericht aus dem Kreisblatt – je nach Typ und Vorgeschichte.
export function preMatchVoice(c, opponent, chat) {
  if (!opponent || opponent.human) return;
  const coach = coachOf(opponent);
  const rows = table(c);
  const posOf = (id) => rows.findIndex((r) => r.club.id === id) + 1;
  const theirs = posOf(opponent.id);
  const ours = posOf(humanClub(c).id);
  const feud = feudOf(c, opponent.id);
  const last = [...(c.meetings?.[opponent.id] ?? [])].pop();
  let quote;
  if (feud <= -2) quote = spin(tr(['Mit denen haben wir noch eine Rechnung offen. Das weiß jeder.', 'Da steht noch was aus. Sonntag wird abgerechnet.', 'Das Hinspiel vergessen wir nicht. Die anderen auch nicht.', 'Die haben uns letztes Mal ausgelacht. Das vergisst keiner.', 'Mit dem Schiri reden wir danach. Erst mal die drei Punkte.', 'Ich sag nur: Revanche. Mehr sag ich nicht.', 'Die kennen uns, wir kennen die. Das gibt keinen Tanzabend.'], ['We have a score to settle with that lot. Everyone knows it.', 'There is unfinished business. Sunday we settle up.', 'We have not forgotten the last meeting. Neither have they.', 'They laughed at us last time. Nobody forgets that.', 'We will talk to the ref afterwards. Three points first.', 'All I will say: revenge. Nothing more.', 'They know us, we know them. This will be no dance evening.']), opponent.id, c.season, c.round);
  else if (feud >= 2) quote = spin(tr(['Faire Truppe, netter Verein. Aber Sonntag gibt es nichts geschenkt.', 'Mit denen trinkt man gern ein Bier. Nach dem Abpfiff.', 'Sympathischer Verein. Leider auch ordentlich Qualität.', 'Respekt vor denen. Aber verlieren dürfen sie trotzdem.', 'Das wird ein sauberes Spiel. Die Wurst danach ist schon bestellt.', 'Die kann man nicht nicht mögen. Sonntag müssen wir es trotzdem versuchen.', 'Fairplay-Pokal gehört denen, die Punkte uns.'], ['Fair bunch, decent club. But nothing is free on Sunday.', 'Good lads to have a beer with. After the final whistle.', 'Likeable club. Sadly also decent quality.', 'Respect for them. They are still allowed to lose, though.', 'This will be a clean game. The sausage afterwards is already ordered.', 'You cannot not like them. Sunday we have to try anyway.', 'The fair play cup is theirs, the points ours.']), opponent.id, c.season, c.round);
  else if (last && last.ga > last.gf) quote = tr(`Letztes Mal haben wir ${last.ga}:${last.gf} gewonnen. Warum sollte es diesmal anders sein?`, `Last time we won ${last.ga}-${last.gf}. Why would it be any different?`);
  else if (coach.type === 'grossmaul') quote = ours > theirs ? tr('Die stehen hinter uns, und da gehören sie auch hin.', 'They are below us and that is where they belong.') : tr('Tabelle lügt. Sonntag sieht man, wer kicken kann.', 'The table lies. Sunday will show who can play.');
  else if (coach.type === 'stratege') quote = tr('Wir haben sie dreimal auf Video angeschaut. Also das eine Video, das es gibt.', 'We watched them three times on video. Well, the one video there is.');
  else if (coach.type === 'oldschool') quote = tr('Grätschen, laufen, Mund halten. So haben wir das früher gemacht.', 'Tackle, run, keep your mouth shut. That is how we used to do it.');
  else quote = tr('Hauptsache, hinterher gibt es ein Bier mit denen.', 'As long as we have a beer with them afterwards.');
  chat.push({ from: null, text: tr(`Kreisblatt: Trainer ${coach.name} (${opponent.short}): „${quote}“`, `District Gazette: ${opponent.short} manager ${coach.name}: “${quote}”`), time: 'Do 06:30', press: true });
}

// Hitzige Vorgeschichte: Das Spiel wird wie ein Derby gepfiffen.
export const grudgeMatch = (c, opponentId) => feudOf(c, opponentId) <= -2;

// Nach dem Spiel: Handschlag oder Rudelbildung. Liefert eine Meldung für die nächste Woche.
export function afterMatchVoice(c, prepared, oppId) {
  const m = prepared.match;
  const me = humanClub(c);
  const t = m.teams.findIndex((x) => x.name === me.name);
  if (t < 0 || !oppId) return null;
  const st = m.stats.teams;
  const fouls = st[0].fouls + st[1].fouls;
  const reds = st[0].red + st[1].red;
  const yellows = st[0].yellow + st[1].yellow;
  const [gf, ga] = [m.score[t], m.score[1 - t]];
  c.meetings ??= {};
  (c.meetings[oppId] ??= []).push({ season: c.season, gf, ga });
  c.feuds ??= {};
  const rng = createRng((c.seed * 71 + c.season * 13 + c.round * 7 + 3) >>> 0);
  // Kurze Spiele haben weniger Fouls – deshalb pro 4 Minuten gerechnet. Alte Rechnungen heizen nach.
  const per4 = 240 / Math.max(240, m.duration ?? 240);
  const heat = reds * 2 + yellows * 0.8 + fouls * 0.3 * per4 + (Math.abs(gf - ga) <= 1 ? 0.5 : 0) + (feudOf(c, oppId) < 0 ? 0.6 : 0) + rng.next() * 1.4;
  const opp = c.clubs.find((x) => x.id === oppId);
  const coach = coachOf(opp);
  let news;
  if (heat > 2.8) {
    c.feuds[oppId] = Math.max(-3, feudOf(c, oppId) - 1);
    news = tr(`Nach dem Abpfiff gegen ${opp.name}: Rudelbildung am Mittelkreis. ${coach.name} brüllt was von „Treter". Das Rückspiel wird heiß.`, `After the final whistle against ${opp.name}: a melee in the centre circle. ${coach.name} shouts something about “thugs”. The return fixture will be spicy.`);
    chronicle(c, tr(`Rudelbildung gegen ${opp.name}.`, `A melee against ${opp.name}.`));
  } else if (heat < 1.3) {
    c.feuds[oppId] = Math.min(3, feudOf(c, oppId) + 1);
    news = tr(`Handschlag, Bier am Zaun: ${coach.name} von ${opp.short} lobt eure faire Art.`, `Handshakes and a beer at the fence: ${coach.name} from ${opp.short} praises your fair play.`);
    // Wer fair ist, zieht Leute an: Einer von denen will wechseln.
    if (feudOf(c, oppId) >= 1 && opp.squad.length > 7 && rng.chance(0.35)) {
      const idx = rng.pick(opp.squad);
      c.pendingDefector = { idx, club: oppId };
    }
  }
  if (news) (c.pendingNews ??= []).push(news);
  // Taktik und Bedingungen: Das Kreisblatt lobt den klugen Schachzug – oder wundert sich.
  const fit = m.fits?.[t];
  if (fit?.score > 0 && gf > ga) (c.pendingNews ??= []).push(tr(`Kreisblatt: Kluger Schachzug des Trainers. ${fit.reasons.find((r) => r.score > 0)?.text ?? ''}.`, `District Gazette: A clever move by the manager. ${fit.reasons.find((r) => r.score > 0)?.text ?? ''}.`));
  else if (fit?.score < 0 && gf < ga) (c.pendingNews ??= []).push(tr(`Kreisblatt: Man wundert sich über die Taktik. ${fit.reasons.find((r) => r.score < 0)?.text ?? ''}.`, `District Gazette: Eyebrows raised at the tactics. ${fit.reasons.find((r) => r.score < 0)?.text ?? ''}.`));
  return news;
}

// Wochenbeginn: Meldungen von letzter Woche in den Chat, Wechselwillige als Gerücht.
export function deliverNews(c, chat) {
  for (const text of c.pendingNews ?? []) chat.push({ from: null, text, time: 'Mo 08:05', press: true });
  c.pendingNews = [];
  const d = c.pendingDefector;
  if (d && c.week) {
    c.pendingDefector = null;
    const opp = c.clubs.find((x) => x.id === d.club);
    if (!opp?.squad.includes(d.idx)) return;
    const p = playerOf(c, d.idx);
    const spread = 6;
    c.week.rumors ??= [];
    c.week.rumors.push({
      idx: d.idx,
      source: tr(`${p.name.split(' ')[0]} von ${opp.short} hat nach dem fairen Spiel Blut geleckt: „Bei euch ist es netter."`, `${p.name.split(' ')[0]} from ${opp.short} liked what he saw after the fair game: “It is nicer at your place.”`),
      scouted: true,
      status: 'open',
      range: [p.rating - 2, p.rating - 2 + spread],
      reply: null,
      season: c.season,
      until: c.round + 2,
    });
  }
}
