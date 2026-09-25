// Verletzungen: von der Zerrung bis zum Kreuzbandriss – und ganz selten die
// Sportinvalidität. Wer nie wieder spielen kann, bleibt dem Verein auf Wunsch
// erhalten: als Co-Trainer, Platzwart, Wirt oder Betreuer.
import { createRng } from '../core/rng.js';
import { hasTrait } from '../data/traits.js';
import { book } from './finances.js';
import { humanClub, MIN_SQUAD, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { first, outcome } from './outcomes.js';
import { isCoach } from './personal.js';
import { chronicle } from './sagas.js';
import { roleName } from './youth.js';
import { tr, plural, euroFmt } from '../core/i18n.js';

export const INJURIES = {
  zerrung: { label: tr('Zerrung', 'strain'), weeks: [1, 2], w: 40 },
  prellung: { label: tr('Prellung', 'bruise'), weeks: [1, 1], w: 25 },
  baender: { label: tr('Bänderdehnung im Sprunggelenk', 'sprained ankle ligaments'), weeks: [2, 4], w: 16 },
  muskelfaser: { label: tr('Muskelfaserriss', 'torn muscle fibre'), weeks: [3, 5], w: 10 },
  meniskus: { label: tr('Meniskusschaden', 'meniscus damage'), weeks: [5, 8], w: 5 },
  kreuzband: { label: tr('Kreuzbandriss', 'torn cruciate ligament'), weeks: [18, 30], w: 2.5 },
  achilles: { label: tr('Achillessehnenriss', 'ruptured Achilles tendon'), weeks: [20, 32], w: 1.5 },
};
export const SEVERE = 5; // ab so vielen Wochen gibt es eine Diagnose mit Entscheidung
const BASE_CHANCE = 0.018; // pro Spieler und Spiel

function rollType(rng) {
  let r = rng.next() * Object.values(INJURIES).reduce((s, i) => s + i.w, 0);
  for (const [id, i] of Object.entries(INJURIES)) if ((r -= i.w) < 0) return id;
  return 'zerrung';
}

// Nach einem eigenen Spiel: Wer hat sich wehgetan?
export function rollInjuries(c, prepared, fixtureRound = c.round) {
  const m = prepared.match;
  const rng = createRng((c.seed * 613 + c.season * 97 + fixtureRound * 13 + 7) >>> 0);
  const news = [];
  const players = [...m.players, ...m.bench.flat(), ...(m.sentOff ?? [])];
  for (const p of players) {
    const rec = c.players[p.poolIndex];
    const st = m.stats.players[p.id];
    if (!rec || !st || st.seconds <= 0 || !humanClub(c).squad.includes(p.poolIndex)) continue;
    const age = playerOf(c, p.poolIndex).age;
    let chance = BASE_CHANCE * (age >= 33 ? 1.6 : age >= 28 ? 1.2 : 1) * (m.pitch.surface.hard ? 1.3 : 1) * (m.derby ? 1.25 : 1);
    if (hasTrait(p, 'hart_im_nehmen')) chance *= 0.7;
    if (hasTrait(p, 'raucher')) chance *= 1.2;
    if ((p.injury?.severity ?? 0) >= 2) chance += 0.15; // die Schürfwunde war schlimmer als gedacht
    if (!rng.chance(chance)) continue;
    const type = rollType(rng);
    const def = INJURIES[type];
    const weeks = rng.int(def.weeks[0], def.weeks[1]);
    rec.injuryWeeks = Math.max(rec.injuryWeeks ?? 0, weeks);
    rec.injury = { type, label: def.label, weeks };
    news.push({ idx: p.poolIndex, type, weeks });
  }
  const severe = news.find((n) => n.weeks >= SEVERE);
  if (severe) {
    c.flags ??= {};
    c.flags.injuryNews = severe;
  }
  return news;
}

export const injuryText = (rec) => {
  if (!(rec?.injuryWeeks > 0)) return null;
  const label = rec.injury?.label ?? tr('verletzt', 'injured');
  const weeks = plural(rec.injuryWeeks, 'Woche', 'Wochen', 'week', 'weeks');
  return tr(`${label}, noch ${rec.injuryWeeks} ${weeks}`, `${label}, ${rec.injuryWeeks} ${weeks} left`);
};

// Laufbahn beendet: Er verlässt den Kader und bekommt ein Amt – oder wird Ehrenmitglied.
// Der Titel wird in c.alumni immer auf Deutsch gespeichert (wie bei den Jugend-Ämtern) und
// erst bei der Anzeige über roleName() übersetzt.
export function endCareer(c, idx, role) {
  const club = humanClub(c);
  const p = playerOf(c, idx);
  const rec = c.players[idx];
  club.squad = club.squad.filter((x) => x !== idx);
  if (c.week) delete c.week.availability[idx];
  let title = 'Ehrenmitglied';
  if (role && c.staff && !c.staff[role]) {
    c.staff[role] = { idx, name: p.name };
    title = { cotrainer: 'Co-Trainer', platzwart: 'Platzwart', wirt: 'Wirt im Vereinsheim' }[role];
  } else if (role === 'betreuer') title = 'Betreuer und Zeugwart';
  c.alumni ??= [];
  c.alumni.push({ idx, name: p.name, age: p.age, apps: (rec?.total?.apps ?? 0) + (rec?.apps ?? 0), goals: (rec?.total?.goals ?? 0) + (rec?.goals ?? 0), season: c.season, role: title });
  if (role === 'betreuer') c.flags.betreuer = p.name;
  delete c.players[idx];
  return title;
}

const canEnd = (c) => humanClub(c).squad.length - 1 >= MIN_SQUAD;
const freeRole = (c) => ['cotrainer', 'platzwart', 'wirt'].find((r) => !c.staff?.[r]) ?? 'betreuer';

export const INJURY_EVENTS = {
  diagnose: {
    weight: 100,
    needs: (c) => {
      const n = c.flags?.injuryNews;
      if (!n || !humanClub(c).squad.includes(n.idx) || isCoach(c, n.idx)) return null;
      return { ...n };
    },
    text: (c, ctx) => tr(`Diagnose vom Orthopäden: ${first(c, ctx.s ?? ctx.idx)} hat einen ${INJURIES[ctx.type].label}. Mindestens ${ctx.weeks} Wochen Pause.`, `Diagnosis from the orthopaedist: ${first(c, ctx.s ?? ctx.idx)} has a ${INJURIES[ctx.type].label}. At least ${ctx.weeks} weeks out.`),
    options: [
      {
        label: tr(`Beste Behandlung beim Physio am Markt (${euroFmt(60)})`, `Best treatment at the physio in town (${euroFmt(60)})`),
        effect: outcome([
          { w: 4, run: (c, ctx) => (clear(c), book(c, tr('Physio: Reha', 'Physio: rehab'), -60), shorten(c, ctx.idx, 0.7), tr(`Die Reha schlägt an. ${first(c, ctx.idx)} ist schneller zurück als gedacht: noch ${c.players[ctx.idx].injuryWeeks} Wochen.`, `The rehab works. ${first(c, ctx.idx)} is back sooner than expected: ${c.players[ctx.idx].injuryWeeks} weeks left.`)) },
          { w: 2, run: (c, ctx) => (clear(c), book(c, tr('Physio: Reha', 'Physio: rehab'), -60), (c.players[ctx.idx].loyal = true), tr(`Der Physio ist gut – und ${first(c, ctx.idx)} weiß, dass der Verein für ihn da war. Er wird dir das nie vergessen.`, `The physio is good – and ${first(c, ctx.idx)} knows the club was there for him. He'll never forget it.`)) },
          { w: 1, run: (c, ctx) => (clear(c), book(c, tr('Physio: Reha', 'Physio: rehab'), -60), shorten(c, ctx.idx, 1.3), tr(`Komplikationen. Die Pause wird länger: noch ${c.players[ctx.idx].injuryWeeks} Wochen.`, `Complications. The lay-off gets longer: ${c.players[ctx.idx].injuryWeeks} weeks left.`)) },
          { w: 1, run: (c, ctx) => (clear(c), book(c, tr('Physio: Reha (Sponsor zahlt die Hälfte)', 'Physio: rehab (sponsor pays half)'), -30), shorten(c, ctx.idx, 0.75), tr('Der Physio ist Sponsor-Kunde und rechnet nur die Hälfte ab.', 'The physio is a sponsor customer and only charges half price.')) },
          { w: (c, ctx) => (isSevere(ctx) && canEnd(c) ? 0.5 : 0), run: (c, ctx) => invalid(c, ctx) },
        ]),
      },
      {
        label: tr('Schnell zurück – wir brauchen ihn', 'Back quickly – we need him'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (clear(c), shorten(c, ctx.idx, 0.6), adjustForm(c, ctx.idx, -0.5), tr(`${first(c, ctx.idx)} beißt auf die Zähne und ist früher zurück. Ganz fit ist er nicht.`, `${first(c, ctx.idx)} grits his teeth and returns early. He's not fully fit.`)) },
          { w: 2, run: (c, ctx) => (clear(c), shorten(c, ctx.idx, 1.6), tr(`Zu früh belastet. Rückschlag – jetzt ist er noch ${c.players[ctx.idx].injuryWeeks} Wochen raus.`, `Came back too soon. Setback – now he's out for ${c.players[ctx.idx].injuryWeeks} more weeks.`)) },
          { w: 1, run: (c, ctx) => (clear(c), (c.players[ctx.idx].grumpy = 3), tr(`${first(c, ctx.idx)} fühlt sich unter Druck gesetzt. „Ich bin doch kein Profi."`, `${first(c, ctx.idx)} feels under pressure. "I'm not a pro, you know."`)) },
          { w: (c, ctx) => (isSevere(ctx) && canEnd(c) ? 1.2 : 0), run: (c, ctx) => invalid(c, ctx) },
        ]),
      },
      {
        label: tr('Er soll sich Zeit lassen – Hauptsache gesund', 'Let him take his time – health comes first'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (clear(c), tr(`${first(c, ctx.idx)} kuriert sich in Ruhe aus. Er kommt regelmäßig zum Zuschauen.`, `${first(c, ctx.idx)} takes his time to heal. He comes to watch regularly.`)) },
          { w: 1.5, run: (c, ctx) => (clear(c), (c.players[ctx.idx].loyal = true), adjustMood(c, 0.04), tr(`Die Mannschaft schickt ihm ein Trikot mit allen Unterschriften ins Krankenhaus. Er weint ein bisschen.`, `The team sends him a shirt to hospital, signed by everyone. He tears up a little.`)) },
          { w: 1, run: (c, ctx) => (clear(c), shorten(c, ctx.idx, 1.2), adjustForm(c, ctx.idx, -0.4), tr(`Die Heilung dauert. Und die Motivation leidet.`, `Healing takes its time. And motivation suffers.`)) },
          { w: (c, ctx) => (playerOf(c, ctx.idx).age >= 32 && canEnd(c) ? 1.5 : 0), run: (c, ctx) => { clear(c); const name = playerOf(c, ctx.idx)?.name; const role = roleName(endCareer(c, ctx.idx, freeRole(c))); chronicle(c, tr(`${name ?? 'Ein Spieler'} beendet nach Verletzung die Laufbahn und wird ${role}.`, `${name ?? 'A player'} ends his career after the injury and becomes ${role}.`)); return tr(`Mit über 30 und dieser Verletzung? ${first(c, ctx.idx)} hört auf. Er bleibt dem Verein aber erhalten – als ${role}.`, `Over 30 with an injury like this? ${first(c, ctx.idx)} calls it a day. But he stays with the club – as ${role}.`); } },
          { w: (c, ctx) => (isSevere(ctx) && canEnd(c) ? 0.6 : 0), run: (c, ctx) => invalid(c, ctx) },
        ]),
      },
    ],
  },

  invaliditaet: {
    weight: 100,
    needs: (c) => {
      const n = c.flags?.invalid;
      return n && humanClub(c).squad.includes(n.idx) ? { ...n } : null;
    },
    text: (c, ctx) => tr(`Der Arzt ist deutlich: ${first(c, ctx.idx)} wird nie wieder Fußball spielen können. Sportinvalidität. Er sitzt im Vereinsheim und schaut ins Leere.`, `The doctor is clear: ${first(c, ctx.idx)} will never play football again. Career-ending injury. He sits in the clubhouse, staring into space.`),
    options: [
      ...['cotrainer', 'platzwart', 'wirt'].map((role) => ({
        label: tr(`Als ${{ cotrainer: 'Co-Trainer', platzwart: 'Platzwart', wirt: 'Wirt' }[role]} dabeibleiben`, `Stay on as ${{ cotrainer: 'assistant coach', platzwart: 'groundskeeper', wirt: 'landlord' }[role]}`),
        effect: outcome([
          { w: 3, run: (c, ctx) => farewell(c, ctx, role, tr('Er nimmt das Amt an. „Ohne den Verein wäre ich jetzt ganz allein."', 'He accepts the role. "Without the club I\'d be all on my own now."')) },
          { w: 1, run: (c, ctx) => farewell(c, ctx, role, tr('Er braucht ein paar Wochen, dann ist er jeden Tag auf dem Platz. Engagierter als je zuvor.', 'It takes him a few weeks, then he\'s at the pitch every day. More committed than ever.')) },
          { w: 1, run: (c, ctx) => farewell(c, ctx, role, tr('Er macht es – aber man sieht, wie es ihn schmerzt, am Rand zu stehen.', 'He does it – but you can see how much it hurts him to stand on the sidelines.'), -0.04) },
        ]),
      })),
      {
        label: tr('Ehrenmitglied – und einfach da sein', 'Honorary member – just being there'),
        effect: outcome([
          { w: 3, run: (c, ctx) => farewell(c, ctx, null, tr('Er bekommt die goldene Nadel und einen festen Platz am Stammtisch.', 'He gets the golden pin and a permanent seat at the regulars\' table.')) },
          { w: 1, run: (c, ctx) => farewell(c, ctx, 'betreuer', tr('Er übernimmt von selbst das Trikotwaschen und die Getränke. Alle nennen ihn jetzt „den Betreuer".', 'He takes over washing the kit and sorting the drinks, unasked. Everyone now calls him "the kit man".')) },
          { w: 1, run: (c, ctx) => farewell(c, ctx, null, tr('Er zieht sich zurück. Manchmal sieht man ihn am Zaun stehen.', 'He withdraws. Sometimes you see him standing by the fence.'), -0.06) },
        ]),
      },
    ],
  },
};

const isSevere = (ctx) => ctx.type === 'kreuzband' || ctx.type === 'achilles';
const clear = (c) => c.flags && (c.flags.injuryNews = null);
function shorten(c, idx, f) {
  const rec = c.players[idx];
  if (rec) rec.injuryWeeks = Math.max(1, Math.round(rec.injuryWeeks * f));
}
function invalid(c, ctx) {
  clear(c);
  c.flags.invalid = { idx: ctx.idx, type: ctx.type };
  c.players[ctx.idx].injuryWeeks = 99;
  adjustMood(c, -0.12);
  return tr(`Schlimmste Nachricht: Die Verletzung ist irreparabel. ${first(c, ctx.idx)} wird nie wieder spielen können.`, `The worst news: the injury is irreparable. ${first(c, ctx.idx)} will never play again.`);
}
function farewell(c, ctx, role, text, mood = 0.05) {
  const name = playerOf(c, ctx.idx).name;
  c.flags.invalid = null;
  const title = roleName(endCareer(c, ctx.idx, role));
  adjustMood(c, mood);
  chronicle(c, tr(`${name} muss nach einer schweren Verletzung aufhören und bleibt als ${title} im Verein.`, `${name} has to retire after a serious injury and stays with the club as ${title}.`));
  return `${text} (${title})`;
}
