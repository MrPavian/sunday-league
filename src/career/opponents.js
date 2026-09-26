// Gegner mit Gesicht: Jeder Verein hat einen Trainer mit eigener Art, der sich im
// Kreisblatt äußert. Nach dem Spiel gibt es Handschlag oder Rudelbildung – das
// merkt man sich. Mit wem man es sich verscherzt, der kommt hitziger zurück; wer
// fair war, bei dem will vielleicht einer wechseln.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { FIRST_NAMES, LAST_NAMES } from '../data/names.js';
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
  return { name: `${FIRST_NAMES[h % FIRST_NAMES.length]} ${LAST_NAMES[(h >>> 8) % LAST_NAMES.length]}`, type: types[(h >>> 16) % types.length] };
}
export const coachTypeName = (type) => TYPES[type]?.name ?? '';

const feudOf = (c, id) => c.feuds?.[id] ?? 0;

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
  if (feud <= -2) quote = tr('Mit denen haben wir noch eine Rechnung offen. Das weiß jeder.', 'We have a score to settle with that lot. Everyone knows it.');
  else if (feud >= 2) quote = tr('Faire Truppe, netter Verein. Aber Sonntag gibt es nichts geschenkt.', 'Fair bunch, decent club. But nothing is free on Sunday.');
  else if (last && last.ga > last.gf) quote = tr(`Letztes Mal haben wir ${last.ga}:${last.gf} gewonnen. Warum sollte es diesmal anders sein?`, `Last time we won ${last.ga}-${last.gf}. Why would it be any different?`);
  else if (coach.type === 'grossmaul') quote = ours > theirs ? tr('Die stehen hinter uns, und da gehören sie auch hin.', 'They are below us and that is where they belong.') : tr('Tabelle lügt. Sonntag sieht man, wer kicken kann.', 'The table lies. Sunday will show who can play.');
  else if (coach.type === 'stratege') quote = tr('Wir haben sie dreimal auf Video angeschaut. Also das eine Video, das es gibt.', 'We watched them three times on video. Well, the one video there is.');
  else if (coach.type === 'oldschool') quote = tr('Grätschen, laufen, Mund halten. So haben wir das früher gemacht.', 'Tackle, run, keep your mouth shut. That is how we used to do it.');
  else quote = tr('Hauptsache, hinterher gibt es ein Bier mit denen.', 'As long as we have a beer with them afterwards.');
  chat.push({ from: null, text: tr(`Kreisblatt: Trainer ${coach.name} (${opponent.short}): „${quote}“`, `Kreisblatt: ${opponent.short} manager ${coach.name}: “${quote}”`), time: 'Do 06:30', press: true });
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
  const heat = reds * 2 + yellows * 0.6 + fouls * 0.12 + (Math.abs(gf - ga) <= 1 ? 0.5 : 0) + rng.next();
  const opp = c.clubs.find((x) => x.id === oppId);
  const coach = coachOf(opp);
  let news;
  if (heat > 3.2) {
    c.feuds[oppId] = feudOf(c, oppId) - 1;
    news = tr(`Nach dem Abpfiff gegen ${opp.name}: Rudelbildung am Mittelkreis. ${coach.name} brüllt was von „Treter". Das Rückspiel wird heiß.`, `After the final whistle against ${opp.name}: a melee in the centre circle. ${coach.name} shouts something about “thugs”. The return fixture will be spicy.`);
    chronicle(c, tr(`Rudelbildung gegen ${opp.name}.`, `A melee against ${opp.name}.`));
  } else if (heat < 1.4) {
    c.feuds[oppId] = feudOf(c, oppId) + 1;
    news = tr(`Handschlag, Bier am Zaun: ${coach.name} von ${opp.short} lobt eure faire Art.`, `Handshakes and a beer at the fence: ${coach.name} from ${opp.short} praises your fair play.`);
    // Wer fair ist, zieht Leute an: Einer von denen will wechseln.
    if (feudOf(c, oppId) >= 1 && opp.squad.length > 7 && rng.chance(0.35)) {
      const idx = rng.pick(opp.squad);
      c.pendingDefector = { idx, club: oppId };
    }
  }
  if (news) (c.pendingNews ??= []).push(news);
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
    });
  }
}
