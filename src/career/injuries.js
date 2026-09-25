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

export const INJURIES = {
  zerrung: { label: 'Zerrung', weeks: [1, 2], w: 40 },
  prellung: { label: 'Prellung', weeks: [1, 1], w: 25 },
  baender: { label: 'Bänderdehnung im Sprunggelenk', weeks: [2, 4], w: 16 },
  muskelfaser: { label: 'Muskelfaserriss', weeks: [3, 5], w: 10 },
  meniskus: { label: 'Meniskusschaden', weeks: [5, 8], w: 5 },
  kreuzband: { label: 'Kreuzbandriss', weeks: [18, 30], w: 2.5 },
  achilles: { label: 'Achillessehnenriss', weeks: [20, 32], w: 1.5 },
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

export const injuryText = (rec) => (rec?.injuryWeeks > 0 ? `${rec.injury?.label ?? 'verletzt'}, noch ${rec.injuryWeeks} ${rec.injuryWeeks === 1 ? 'Woche' : 'Wochen'}` : null);

// Laufbahn beendet: Er verlässt den Kader und bekommt ein Amt – oder wird Ehrenmitglied.
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
    text: (c, ctx) => `Diagnose vom Orthopäden: ${first(c, ctx.s ?? ctx.idx)} hat einen ${INJURIES[ctx.type].label}. Mindestens ${ctx.weeks} Wochen Pause.`,
    options: [
      {
        label: 'Beste Behandlung beim Physio am Markt (60 €)',
        effect: outcome([
          { w: 4, run: (c, ctx) => (clear(c), book(c, 'Physio: Reha', -60), shorten(c, ctx.idx, 0.7), `Die Reha schlägt an. ${first(c, ctx.idx)} ist schneller zurück als gedacht: noch ${c.players[ctx.idx].injuryWeeks} Wochen.`) },
          { w: 2, run: (c, ctx) => (clear(c), book(c, 'Physio: Reha', -60), (c.players[ctx.idx].loyal = true), `Der Physio ist gut – und ${first(c, ctx.idx)} weiß, dass der Verein für ihn da war. Er wird dir das nie vergessen.`) },
          { w: 1, run: (c, ctx) => (clear(c), book(c, 'Physio: Reha', -60), shorten(c, ctx.idx, 1.3), `Komplikationen. Die Pause wird länger: noch ${c.players[ctx.idx].injuryWeeks} Wochen.`) },
          { w: 1, run: (c, ctx) => (clear(c), book(c, 'Physio: Reha (Sponsor zahlt die Hälfte)', -30), shorten(c, ctx.idx, 0.75), 'Der Physio ist Sponsor-Kunde und rechnet nur die Hälfte ab.') },
          { w: (c, ctx) => (isSevere(ctx) && canEnd(c) ? 0.5 : 0), run: (c, ctx) => invalid(c, ctx) },
        ]),
      },
      {
        label: 'Schnell zurück – wir brauchen ihn',
        effect: outcome([
          { w: 2, run: (c, ctx) => (clear(c), shorten(c, ctx.idx, 0.6), adjustForm(c, ctx.idx, -0.5), `${first(c, ctx.idx)} beißt auf die Zähne und ist früher zurück. Ganz fit ist er nicht.`) },
          { w: 2, run: (c, ctx) => (clear(c), shorten(c, ctx.idx, 1.6), `Zu früh belastet. Rückschlag – jetzt ist er noch ${c.players[ctx.idx].injuryWeeks} Wochen raus.`) },
          { w: 1, run: (c, ctx) => (clear(c), (c.players[ctx.idx].grumpy = 3), `${first(c, ctx.idx)} fühlt sich unter Druck gesetzt. „Ich bin doch kein Profi."`) },
          { w: (c, ctx) => (isSevere(ctx) && canEnd(c) ? 1.2 : 0), run: (c, ctx) => invalid(c, ctx) },
        ]),
      },
      {
        label: 'Er soll sich Zeit lassen – Hauptsache gesund',
        effect: outcome([
          { w: 3, run: (c, ctx) => (clear(c), `${first(c, ctx.idx)} kuriert sich in Ruhe aus. Er kommt regelmäßig zum Zuschauen.`) },
          { w: 1.5, run: (c, ctx) => (clear(c), (c.players[ctx.idx].loyal = true), adjustMood(c, 0.04), `Die Mannschaft schickt ihm ein Trikot mit allen Unterschriften ins Krankenhaus. Er weint ein bisschen.`) },
          { w: 1, run: (c, ctx) => (clear(c), shorten(c, ctx.idx, 1.2), adjustForm(c, ctx.idx, -0.4), `Die Heilung dauert. Und die Motivation leidet.`) },
          { w: (c, ctx) => (playerOf(c, ctx.idx).age >= 32 && canEnd(c) ? 1.5 : 0), run: (c, ctx) => { clear(c); const role = endCareer(c, ctx.idx, freeRole(c)); chronicle(c, `${playerOf(c, ctx.idx)?.name ?? 'Ein Spieler'} beendet nach Verletzung die Laufbahn und wird ${role}.`); return `Mit über 30 und dieser Verletzung? ${first(c, ctx.idx)} hört auf. Er bleibt dem Verein aber erhalten – als ${role}.`; } },
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
    text: (c, ctx) => `Der Arzt ist deutlich: ${first(c, ctx.idx)} wird nie wieder Fußball spielen können. Sportinvalidität. Er sitzt im Vereinsheim und schaut ins Leere.`,
    options: [
      ...['cotrainer', 'platzwart', 'wirt'].map((role) => ({
        label: `Als ${{ cotrainer: 'Co-Trainer', platzwart: 'Platzwart', wirt: 'Wirt' }[role]} dabeibleiben`,
        effect: outcome([
          { w: 3, run: (c, ctx) => farewell(c, ctx, role, 'Er nimmt das Amt an. „Ohne den Verein wäre ich jetzt ganz allein."') },
          { w: 1, run: (c, ctx) => farewell(c, ctx, role, 'Er braucht ein paar Wochen, dann ist er jeden Tag auf dem Platz. Engagierter als je zuvor.') },
          { w: 1, run: (c, ctx) => farewell(c, ctx, role, 'Er macht es – aber man sieht, wie es ihn schmerzt, am Rand zu stehen.', -0.04) },
        ]),
      })),
      {
        label: 'Ehrenmitglied – und einfach da sein',
        effect: outcome([
          { w: 3, run: (c, ctx) => farewell(c, ctx, null, 'Er bekommt die goldene Nadel und einen festen Platz am Stammtisch.') },
          { w: 1, run: (c, ctx) => farewell(c, ctx, 'betreuer', 'Er übernimmt von selbst das Trikotwaschen und die Getränke. Alle nennen ihn jetzt „den Betreuer".') },
          { w: 1, run: (c, ctx) => farewell(c, ctx, null, 'Er zieht sich zurück. Manchmal sieht man ihn am Zaun stehen.', -0.06) },
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
  return `Schlimmste Nachricht: Die Verletzung ist irreparabel. ${first(c, ctx.idx)} wird nie wieder spielen können.`;
}
function farewell(c, ctx, role, text, mood = 0.05) {
  const name = playerOf(c, ctx.idx).name;
  c.flags.invalid = null;
  const title = endCareer(c, ctx.idx, role);
  adjustMood(c, mood);
  chronicle(c, `${name} muss nach einer schweren Verletzung aufhören und bleibt als ${title} im Verein.`);
  return `${text} (${title})`;
}
