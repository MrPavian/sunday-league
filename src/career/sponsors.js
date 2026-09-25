// Sponsoren: Bäcker, Döner, Bestatter. Jeder hat eine Eigenart, eine Beziehung
// zum Verein (0–100) und ein Saisonziel. Man kann nachverhandeln, verlängern,
// verärgern – und manchmal will der Chef, dass sein Sohn mitspielt.
import { createRng } from '../core/rng.js';
import { humanClub, playerOf, table } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { first, outcome, sitOut } from './outcomes.js';
import { isCoach } from './personal.js';
import { chronicle } from './sagas.js';

// Eigenarten: treu (bleibt auch in schlechten Zeiten), ehrgeizig (zahlt mehr,
// will Erfolg), knauserig (wenig Geld, harte Verhandlung), großzügig (Extras).
export const TRAITS = {
  treu: { name: 'treu', pay: 0.9, win: 2, loss: -1, haggle: 0.5 },
  ehrgeizig: { name: 'ehrgeizig', pay: 1.25, win: 5, loss: -5, haggle: 0.45 },
  knauserig: { name: 'knauserig', pay: 0.8, win: 2, loss: -3, haggle: 0.25 },
  grosszuegig: { name: 'großzügig', pay: 1.1, win: 3, loss: -1, haggle: 0.65 },
};

export const SPONSORS = [
  { id: 'krume', name: 'Bäckerei Krume', line: 'Frische Brötchen nach dem Spiel inklusive.', trait: 'treu', boss: 'Bäckermeister Krume' },
  { id: 'vollgas', name: 'Fahrschule Vollgas', line: 'Wer einen Führerschein braucht, weiß Bescheid.', trait: 'ehrgeizig', boss: 'Fahrlehrer Rolf' },
  { id: 'sultan', name: 'Döner Sultan', line: 'Mannschaftsdöner nach jedem Heimsieg.', trait: 'grosszuegig', boss: 'Murat vom Sultan' },
  { id: 'brenner', name: 'Autohaus Brenner', line: 'Fährt auch mal den Bus zum Auswärtsspiel.', trait: 'ehrgeizig', boss: 'Autohändler Brenner' },
  { id: 'physio', name: 'Physio am Markt', line: 'Tapen vor dem Spiel zum Vereinspreis.', trait: 'treu', boss: 'Physiotherapeutin Sandra' },
  { id: 'schnittig', name: 'Friseur Schnittig', line: 'Frisur sitzt, auch nach 90 Minuten.', trait: 'grosszuegig', boss: 'Friseurin Jacqueline' },
  { id: 'kowalski', name: 'Dachdeckerei Kowalski', line: 'Hält dicht – wie unsere Abwehr (hoffentlich).', trait: 'knauserig', boss: 'Dachdecker Kowalski' },
  { id: 'hoffmann', name: 'Getränke Hoffmann', line: 'Die Kiste nach dem Spiel geht aufs Haus.', trait: 'grosszuegig', boss: 'Getränke-Hoffmann' },
  { id: 'enzo', name: 'Pizzeria Da Enzo', line: 'Nach dem Auswärtssieg eine Familienpizza.', trait: 'treu', boss: 'Enzo' },
  { id: 'blum', name: 'Sanitär Blum', line: 'Repariert auch die Duschen im Vereinsheim. Irgendwann.', trait: 'knauserig', boss: 'Installateur Blum' },
  { id: 'muckibude', name: 'Fitnessstudio Muckibude', line: 'Für die Bauchmuskeln, die man unter dem Trikot nicht sieht.', trait: 'ehrgeizig', boss: 'Studioleiter Dragan' },
  { id: 'kalle', name: 'Kiosk Kalle', line: 'Lotto, Zigaretten, Zeitung, Spielberichte.', trait: 'treu', boss: 'Kalle' },
  { id: 'ruhe', name: 'Bestattungen Ruhe', line: 'Wir holen jeden ab. Auch nach dem Abstieg.', trait: 'knauserig', boss: 'Herr Ruhe' },
  { id: 'funke', name: 'Elektro Funke', line: 'Macht das Flutlicht an. Wenn es eins gäbe.', trait: 'treu', boss: 'Elektromeister Funke' },
  { id: 'wolf', name: 'Metzgerei Wurst-Wolf', line: 'Bratwurst zum Sonderpreis am Grill.', trait: 'grosszuegig', boss: 'Metzger Wolf' },
  { id: 'klein', name: 'Versicherungsbüro Klein', line: 'Versichert alles. Außer Luftlöcher.', trait: 'ehrgeizig', boss: 'Versicherungsmakler Klein' },
];
export const sponsorDef = (id) => SPONSORS.find((s) => s.id === id);

export const SLOTS = { trikot: 'Trikotsponsor', bande: 'Bandenpartner', ball: 'Spielballpate', aermel: 'Ärmelsponsor' };
const SLOT_PAY = { trikot: [8, 14], bande: [4, 8], ball: [2, 4], aermel: [5, 9] };
export const slotsFor = (level) => (level > 1 ? ['trikot', 'aermel', 'bande', 'ball'] : ['trikot', 'bande', 'ball']);

// Saisonziele der Sponsoren mit Bonus bei Erfüllung.
const GOALS = [
  { type: 'wins', n: [3, 5], text: (n) => `mindestens ${n} Siege` },
  { type: 'goals', n: [12, 20], text: (n) => `mindestens ${n} eigene Tore` },
  { type: 'rank', n: [2, 3], text: (n) => `am Ende unter den ersten ${n}` },
  { type: 'fair', n: [6, 10], text: (n) => `höchstens ${n} Gelbe Karten` },
];

export function relLabel(v) {
  if (v >= 80) return 'begeistert';
  if (v >= 60) return 'zufrieden';
  if (v >= 40) return 'abwartend';
  if (v >= 20) return 'skeptisch';
  return 'verärgert';
}

export function adjustRel(s, d) {
  if (s) s.rel = Math.max(0, Math.min(100, Math.round((s.rel ?? 50) + d)));
}

function makeOffer(rng, sp, slot, level, extra = {}) {
  const goal = rng.pick(GOALS);
  const n = rng.int(goal.n[0], goal.n[1]);
  const scale = level > 1 ? 2 : 1;
  const [lo, hi] = SLOT_PAY[slot];
  const weekly = Math.max(1, Math.round(rng.int(lo, hi) * scale * TRAITS[sp.trait].pay));
  return { ...sp, slot, weekly, goal: { type: goal.type, n, text: goal.text(n) }, bonus: rng.int(4, 8) * 10 * scale, rel: 50, seasons: 0, ...extra };
}

// Angebote vor Saisonbeginn: Verlängerungen zuerst, dann neue Interessenten.
export function makeOffers(career, level) {
  const rng = createRng(career.seed + career.season * 31 + 5);
  career.offersSeason = career.season;
  const taken = new Set(career.sponsors.map((s) => s.slot));
  const renewals = (career.renewals ?? []).filter((r) => !taken.has(r.slot));
  career.renewals = [];
  const used = new Set([...career.sponsors.map((s) => s.id), ...renewals.map((r) => r.id), ...(career.sponsorBans ?? [])]);
  const offers = [...renewals];
  for (const slot of slotsFor(level)) {
    if (taken.has(slot)) continue;
    const n = renewals.some((r) => r.slot === slot) ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const pool = SPONSORS.filter((s) => !used.has(s.id));
      if (!pool.length) break;
      const sp = rng.pick(pool);
      used.add(sp.id);
      offers.push(makeOffer(rng, sp, slot, level));
    }
  }
  career.offers = offers;
}

export function acceptSponsor(career, i) {
  const o = career.offers[i];
  if (!o || career.round !== 0 || career.sponsors.some((s) => s.slot === o.slot)) return false;
  career.sponsors.push({ ...o, since: o.since ?? career.season });
  career.offers = career.offers.filter((x) => x.slot !== o.slot);
  if (o.renew) chronicle(career, `${o.name} verlängert als ${SLOTS[o.slot]} – ${o.seasons + 1}. Saison zusammen.`);
  return true;
}

// Nachverhandeln: Wer gut dasteht, bekommt mehr. Wer zu hoch pokert, verliert das Angebot.
export function negotiate(career, i) {
  const o = career.offers[i];
  if (!o || o.negotiated || career.round !== 0) return null;
  const rng = createRng((career.seed * 41 + career.season * 17 + i * 7 + o.id.length) >>> 0);
  const last = career.history?.at(-1);
  const standing = 0.5 * (career.mood ?? 0) + (last ? (last.pos <= 2 ? 0.2 : last.pos >= 5 ? -0.15 : 0) : 0) + (o.renew ? 0.15 : 0);
  const p = Math.max(0.1, Math.min(0.85, TRAITS[o.trait].haggle + standing));
  o.negotiated = true;
  const run = outcome([
    { w: p * 3, run: () => ((o.weekly = Math.round(o.weekly * 1.3)), `${o.boss} lacht: „Ihr habt Mumm." ${o.weekly} € pro Spieltag – 30 % mehr.`) },
    { w: 2, run: () => ((o.weekly = Math.round(o.weekly * 1.1 + 0.5)), `Zäh, aber es geht was: ${o.weekly} € pro Spieltag.`) },
    { w: 1.5, run: () => ((o.bonus = Math.round(o.bonus * 1.5)), (o.weekly = Math.max(1, o.weekly - 1)), `${o.boss} bietet was anderes an: weniger pro Woche, aber ${o.bonus} € Bonus bei ${o.goal.text}.`) },
    { w: (1 - p) * 3, run: () => `${o.boss} schüttelt den Kopf: „Mehr ist nicht drin." Das Angebot steht trotzdem.` },
    {
      w: (1 - p) * (o.trait === 'knauserig' ? 2.5 : 1.2),
      run: (c) => {
        c.offers = c.offers.filter((x) => x !== o);
        return `${o.boss} steht auf: „Dann eben nicht." Das Angebot ist weg.`;
      },
    },
    { w: o.trait === 'grosszuegig' ? 1 : 0.3, run: () => ((o.weekly += 2), (o.bonus += 20), (o.rel = 65), `${o.boss} spendiert eine Runde und legt drauf: ${o.weekly} € pro Spieltag, ${o.bonus} € Bonus. „Für den Verein!"`) },
  ]);
  const text = run(career, {}, rng);
  career.sponsorNote = text;
  return text;
}

// Jede Woche: Geld (wer verärgert ist, zahlt schleppend) und ein wachsames Auge aufs Ergebnis.
export function paySponsors(career) {
  for (const s of career.sponsors) {
    if (s.pause > 0) {
      s.pause--;
      continue;
    }
    if ((s.rel ?? 50) < 20 && ((career.round + s.id.length) % 3 === 0)) {
      s.owed = (s.owed ?? 0) + s.weekly;
      continue; // „Kommt nächste Woche, versprochen."
    }
    book(career, `${s.name} (${SLOTS[s.slot]})`, s.weekly + (s.owed ?? 0));
    s.owed = 0;
  }
  // Wer ganz unten ist, kündigt mitten in der Saison.
  const gone = career.sponsors.filter((s) => (s.rel ?? 50) <= 5);
  for (const s of gone) {
    career.sponsors = career.sponsors.filter((x) => x !== s);
    career.sponsorBans = [...(career.sponsorBans ?? []), s.id];
    career.week?.chat.push({ from: null, text: `${s.name} kündigt den Vertrag als ${SLOTS[s.slot]}. ${s.boss}: „So nicht."`, time: 'Fr 17:00' });
  }
}

// Nach jedem eigenen Spiel: Sieg freut, Niederlage ärgert – und Prämien werden fällig.
export function sponsorResult(career, gf, ga) {
  const prem = career.flags?.sponsorPremium;
  for (const s of career.sponsors) {
    const t = TRAITS[s.trait] ?? TRAITS.treu;
    adjustRel(s, gf > ga ? t.win : gf < ga ? t.loss : 0);
  }
  if (prem && prem.round === career.round) {
    const s = career.sponsors.find((x) => x.id === prem.id);
    if (gf > ga) {
      book(career, `Siegprämie ${prem.name}`, prem.amount);
      adjustRel(s, 5);
    } else if (prem.double) {
      book(career, `Doppelt oder nichts verloren (${prem.name})`, -Math.round(prem.amount / 2));
      adjustRel(s, -4);
    } else adjustRel(s, -3);
    career.flags.sponsorPremium = null;
  }
}

export function goalReached(goal, { wins, goals, rank, cards }) {
  if (goal.type === 'wins') return wins >= goal.n;
  if (goal.type === 'goals') return goals >= goal.n;
  if (goal.type === 'rank') return rank <= goal.n;
  if (goal.type === 'fair') return cards <= goal.n;
  return false;
}

// Wie steht es gerade ums Saisonziel?
export function goalProgress(career, goal) {
  const rows = table(career);
  const pos = rows.findIndex((r) => r.club.human);
  const own = rows[pos];
  if (goal.type === 'wins') return `${own.w} / ${goal.n} Siege`;
  if (goal.type === 'goals') return `${own.gf} / ${goal.n} Tore`;
  if (goal.type === 'rank') return `aktuell Platz ${pos + 1}`;
  if (goal.type === 'fair') return `${career.seasonCards ?? 0} / ${goal.n} Gelbe`;
  return '';
}

// Saisonende: Bonus, und wer zufrieden ist, bietet die Verlängerung an.
export function closeSponsors(career, summary) {
  career.renewals = [];
  const notes = [];
  for (const s of career.sponsors) {
    const reached = goalReached(s.goal, summary);
    if (reached) {
      book(career, `Bonus ${s.name}: ${s.goal.text}`, s.bonus);
      adjustRel(s, 15);
    } else adjustRel(s, -10);
    const loyal = s.trait === 'treu' ? 10 : 0;
    if ((s.rel ?? 50) + loyal >= 55) {
      const rng = createRng((career.seed + career.season * 13 + s.id.length) >>> 0);
      const raise = 1 + (reached ? 0.15 : 0) + ((s.rel ?? 50) >= 80 ? 0.1 : 0);
      const fresh = makeOffer(rng, sponsorDef(s.id) ?? s, s.slot, career.level ?? 1);
      career.renewals.push({ ...fresh, weekly: Math.max(fresh.weekly, Math.round(s.weekly * raise)), rel: Math.min(100, (s.rel ?? 50) + 5), seasons: (s.seasons ?? 0) + 1, since: s.since ?? career.season, renew: true });
    } else if ((s.rel ?? 50) < 30) notes.push(`${s.name} verlängert nicht. ${s.boss}: „War nett. War aber auch nicht gut."`);
  }
  career.sponsors = [];
  career.offers = [];
  career.sponsorNotes = notes;
  return notes;
}

// --- Ereignisse rund um die Sponsoren -------------------------------------------------

const mates = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx));
const pickSponsor = (c, rng, f = () => true) => {
  const list = (c.sponsors ?? []).filter(f);
  return list.length ? rng.pick(list) : null;
};
const sp = (c, ctx) => c.sponsors?.find((s) => s.id === ctx.id);
const withSponsor = (fn) => (c, ctx, rng) => {
  const s = sp(c, ctx);
  return s ? fn(c, ctx, rng, s) : 'Der Sponsor hat sich inzwischen erledigt.';
};

export const SPONSOR_EVENTS = {
  sponsor_fototermin: {
    weight: 1.2,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      if (!s || c.round < 1) return null;
      const star = [...mates(c)].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating)[0];
      return star != null ? { id: s.id, name: s.name, star } : null;
    },
    text: (c, ctx) => `${ctx.name} will ein Werbefoto für das Schaufenster. Am liebsten mit ${first(c, ctx.star)}, „dem Guten".`,
    options: [
      {
        label: `Den Star hinschicken`,
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), `${first(c, ctx.star)} lächelt wie ein Profi. Das Foto hängt jetzt neben den Mettbrötchen.`)) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), (c.players[ctx.star].grumpy = 2), `${first(c, ctx.star)} macht es, murrt aber: „Ich bin Fußballer, kein Model."`)) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 15), book(c, `Honorar Fotoshooting ${s.name}`, 25), 'Das Foto kommt so gut an, dass es 25 € Honorar gibt.')) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -5), adjustMood(c, -0.03), `${first(c, ctx.star)} vergisst den Termin. ${s.boss} hat umsonst die Deko aufgebaut.`)) },
          { w: 0.8, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 8), (c.flags.pressWeeks = 2), 'Das Kreisblatt druckt das Werbefoto nach. Mehr Zuschauer am Sonntag.')) },
        ]),
      },
      {
        label: 'Die ganze Mannschaft kommt',
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 12), adjustMood(c, 0.05), 'Mannschaftsfoto im Laden. Einer steht mit dem Kopf im Regal, alle lachen.')) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 6), book(c, 'Brötchen und Kaffee für alle (auf Vereinskosten)', -15), 'Hinterher gibt es Kaffee – leider auf Vereinskosten.')) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -4), 'Nur vier kommen. Das Foto sieht aus wie ein Kegelclub.')) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 18), adjustMood(c, 0.04), `${s.boss} ist so gerührt, dass er Trikots für die Jugend spendiert.`)) },
        ]),
      },
      { label: 'Keine Zeit, wir sind Fußballer', effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -8), `${s.boss} ist beleidigt. Die Brötchen sind am Sonntag etwas kleiner.`)) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -2), 'Der Sponsor nimmt stattdessen seinen Hund aufs Foto. Kommt super an.')) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -12), `Beim nächsten Heimspiel fehlt ${s.name} auf der Tribüne. Absichtlich.`)) }]) },
    ],
  },

  sponsor_sohn: {
    weight: 0.9,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: s.boss, son: rng.pick(['Kevin-Pascal', 'Justin', 'Maximilian', 'Jannik', 'Leon']) } : null;
    },
    text: (c, ctx) => `${ctx.boss} ruft an: Sein Sohn ${ctx.son} (19) will unbedingt mitspielen. „Er ist wirklich talentiert. Sagt seine Mutter."`,
    options: [
      {
        label: 'Er darf am Sonntag ran',
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 15), adjustMood(c, -0.05), `${ctx.son} spielt zwanzig Minuten und stolpert über den Ball. Der Vater filmt alles. Die Mannschaft verdreht die Augen.`)) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 20), adjustMood(c, 0.04), `${ctx.son} ist tatsächlich brauchbar! Keiner hat es geglaubt, am wenigsten er selbst.`)) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), book(c, `Spende ${s.name} (stolzer Vater)`, 50), `${ctx.son} schießt ein Tor, gegen einen Torwart mit Grippe. Der Vater spendet 50 €.`)) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -6), adjustMood(c, -0.06), `${ctx.son} beschwert sich beim Papa über „das Niveau". ${s.boss} ruft wieder an.`)) },
        ]),
      },
      {
        label: 'Erst mal Probetraining',
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), `${ctx.son} kommt, schwitzt, kommt nicht wieder. Alle sind zufrieden.`)) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 10), adjustMood(c, 0.03), `${ctx.son} ist nett und bringt Kuchen mit. Kein Fußballer, aber jetzt Betreuer am Getränkewagen.`)) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -10), `${ctx.son} erzählt zu Hause, er sei „gemobbt" worden. Er hat nur einen Ball an den Kopf bekommen.`)) },
        ]),
      },
      {
        label: 'Ehrlich absagen – bei uns spielt, wer trainiert',
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -12), adjustMood(c, 0.06), 'Die Mannschaft rechnet dir das hoch an. Der Sponsor weniger.')) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 2), `${s.boss} brummt: „Hätte ich an Ihrer Stelle auch gemacht."`)) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -30), adjustMood(c, 0.04), `${s.boss} ist tief beleidigt und spricht von „Konsequenzen". Die Brötchen sind jetzt richtig klein.`)) },
        ]),
      },
    ],
  },

  sponsor_konkurrenz: {
    weight: 0.8,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.slot === 'trikot' || x.slot === 'aermel');
      if (!s || c.round < 3) return null;
      const used = new Set([...c.sponsors.map((x) => x.id), ...(c.sponsorBans ?? [])]);
      const pool = SPONSORS.filter((x) => !used.has(x.id));
      if (!pool.length) return null;
      const rival = rng.pick(pool);
      return { id: s.id, name: s.name, rival: rival.id, rivalName: rival.name, offer: Math.round(s.weekly * 1.4 + 2) };
    },
    text: (c, ctx) => `${ctx.rivalName} will auf euer Trikot – und bietet ${ctx.offer} € pro Spieltag. Aktuell steht dort ${ctx.name}.`,
    options: [
      {
        label: 'Wechseln – Geld ist Geld',
        effect: outcome([
          {
            w: 3,
            run: withSponsor((c, ctx, rng, s) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              c.sponsorBans = [...(c.sponsorBans ?? []), s.id];
              const def = sponsorDef(ctx.rival);
              c.sponsors.push({ ...def, slot: s.slot, weekly: ctx.offer, goal: s.goal, bonus: s.bonus, rel: 55, seasons: 0, since: c.season });
              chronicle(c, `Trikotwechsel mitten in der Saison: ${def.name} ersetzt ${s.name}.`);
              return `Neue Trikots mit ${def.name}. ${s.boss} grüßt dich nicht mehr beim Bäcker.`;
            }),
          },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              c.sponsorBans = [...(c.sponsorBans ?? []), s.id];
              const def = sponsorDef(ctx.rival);
              c.sponsors.push({ ...def, slot: s.slot, weekly: ctx.offer, goal: s.goal, bonus: s.bonus, rel: 40, seasons: 0, since: c.season });
              book(c, 'Neue Trikots beflocken lassen', -30);
              adjustMood(c, -0.04);
              return `Gewechselt – aber die neuen Trikots muss der Verein beflocken lassen (30 €). Und die Jungs mochten die alten.`;
            }),
          },
        ]),
      },
      {
        label: 'Als Druckmittel nutzen',
        effect: outcome([
          { w: 2.5, run: withSponsor((c, ctx, rng, s) => ((s.weekly = Math.round((s.weekly + ctx.offer) / 2)), adjustRel(s, -5), `${s.boss} zieht zähneknirschend nach: ${s.weekly} € pro Spieltag.`)) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => ((s.weekly = ctx.offer), adjustRel(s, 5), `${s.boss}: „Was die können, kann ich schon lange." ${s.weekly} € pro Spieltag.`)) },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              c.sponsorBans = [...(c.sponsorBans ?? []), s.id];
              return `Verzockt. ${s.boss} steigt beleidigt aus, und ${ctx.rivalName} hat inzwischen den Nachbarverein gefunden. Der Platz ist leer.`;
            }),
          },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -15), `${s.boss} bleibt beim alten Betrag und ist jetzt dauerhaft eingeschnappt.`)) },
        ]),
      },
      { label: 'Treu bleiben', effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 15), `${s.boss} erfährt davon und ist gerührt. „Das vergess ich euch nicht."`)) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 20), (s.bonus += 20), `${s.boss} legt 20 € auf den Saisonbonus drauf. Treue lohnt sich.`)) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), 'Ob er es je erfährt? Egal. Man bleibt sich treu.')) }]) },
    ],
  },

  sponsor_pleite: {
    weight: 0.35,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.trait !== 'grosszuegig');
      return s && c.round >= 3 ? { id: s.id, name: s.name, boss: s.boss } : null;
    },
    text: (c, ctx) => `Schlechte Nachrichten: ${ctx.name} steckt in Schwierigkeiten. ${ctx.boss} fragt, ob er die nächsten Wochen aussetzen darf.`,
    options: [
      {
        label: 'Die Mannschaft kauft dort ein – Rettungsaktion',
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 30), adjustMood(c, 0.06), chronicle(c, `Rettungsaktion für ${s.name}: Die ganze Mannschaft kauft eine Woche nur dort ein.`), `Eine Woche lang kauft die ganze Mannschaft bei ${s.name}. ${s.boss} weint fast. Der Laden bleibt offen.`)) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 25), (s.weekly = Math.max(1, s.weekly - 2)), 'Der Laden überlebt, zahlt aber erst mal 2 € weniger. Ehrensache.')) },
          {
            w: 1,
            run: withSponsor((c, ctx, rng, s) => {
              c.sponsors = c.sponsors.filter((x) => x !== s);
              return `Es reicht leider nicht. ${s.name} schließt. ${s.boss} schenkt dem Verein zum Abschied das Ladenschild – es hängt jetzt im Vereinsheim.`;
            }),
          },
        ]),
      },
      {
        label: 'Aussetzen lassen',
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => ((s.pause = 3), adjustRel(s, 20), 'Drei Wochen ohne Geld. Dafür ein Sponsor fürs Leben.')) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 25), (s.bonus += 30), `${s.boss} berappelt sich schneller als gedacht und legt 30 € auf den Bonus. „Das vergess ich euch nie."`)) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (c.sponsors = c.sponsors.filter((x) => x !== s), 'Aus drei Wochen werden zehn, dann ist der Laden zu. Immerhin im Guten.')) },
        ]),
      },
      {
        label: 'Vertrag ist Vertrag',
        effect: outcome([
          { w: 2, run: withSponsor((c, ctx, rng, s) => (book(c, `Letzte Rate ${s.name}`, s.weekly * 2), (c.sponsors = c.sponsors.filter((x) => x !== s)), (c.sponsorBans = [...(c.sponsorBans ?? []), s.id]), adjustMood(c, -0.04), `${s.boss} zahlt zwei Raten und kündigt. Im Ort redet man darüber.`)) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -25), `${s.boss} zahlt weiter, mit zusammengebissenen Zähnen.`)) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => ((c.sponsors = c.sponsors.filter((x) => x !== s)), adjustMood(c, -0.08), 'Der Anwalt des Sponsors meldet sich. Kein Geld, dafür viel Ärger.')) },
        ]),
      },
    ],
  },

  sponsor_praemie: {
    weight: 1,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng, (x) => x.trait === 'ehrgeizig' || x.trait === 'grosszuegig');
      return s && !c.flags?.sponsorPremium ? { id: s.id, name: s.name, boss: s.boss, amount: (c.level ?? 1) > 1 ? 60 : 40 } : null;
    },
    text: (c, ctx) => `${ctx.boss} ist heiß auf Sonntag: „Wenn ihr gewinnt, gibt es ${ctx.amount} € Siegprämie!"`,
    options: [
      { label: 'Angenommen!', effect: outcome([{ w: 3, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), 'Prämie angenommen. Die Jungs trainieren plötzlich freiwillig.') }, { w: 1, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), adjustMood(c, 0.04), 'Die Gruppe rechnet schon aus, wie viele Kästen das sind.') }]) },
      { label: 'Doppelt oder nichts', effect: outcome([{ w: 2, run: (c, ctx) => ((c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount * 2, round: c.round, double: true }), `„Doppelt oder nichts – und bei Niederlage zahlt ihr die Hälfte." Es geht um ${ctx.amount * 2} €.`) }, { w: 1, run: (c, ctx) => (adjustRel(sp(c, ctx), -3), (c.flags.sponsorPremium = { id: ctx.id, name: ctx.name, amount: ctx.amount, round: c.round }), `${ctx.boss} winkt ab: „Übertreibt es nicht." Es bleibt bei ${ctx.amount} €.`) }]) },
      { label: 'Danke, wir spielen auch so', effect: outcome([{ w: 2, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -2), 'Der Sponsor ist irritiert, aber einverstanden.')) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 4), adjustMood(c, 0.02), `${s.boss}: „Ehrenamt pur. Respekt."`)) }]) },
    ],
  },

  sponsor_werbespot: {
    weight: 0.7,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s && c.round >= 2 ? { id: s.id, name: s.name, boss: s.boss } : null;
    },
    text: (c, ctx) => `${ctx.name} dreht einen Werbespot fürs Lokalradio-Internet. Die Mannschaft soll „authentisch jubeln". 30 € Gage.`,
    options: [
      {
        label: 'Machen wir!',
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (book(c, `Gage Werbespot ${s.name}`, 30), adjustRel(s, 10), 'Zwölf Takes, bis der Jubel echt aussieht. Beim dreizehnten war er echt, weil Feierabend war.')) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => (book(c, `Gage Werbespot ${s.name}`, 30), adjustRel(s, 15), (c.flags.pressWeeks = 3), 'Der Spot geht im Ort herum. Plötzlich kennt euch jeder – mehr Zuschauer!')) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (book(c, `Gage Werbespot ${s.name}`, 30), adjustMood(c, -0.05), 'Im Spot sieht man nur den Trainer beim Stolpern. Der Clip wird im Gegnerlager rauf und runter gespielt.')) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => { const s2 = rng.pick(mates(c)); sitOut(c, s2); return (book(c, `Gage Werbespot ${s.name}`, 30), `${first(c, s2)} zerrt sich beim Torjubel für die Kamera. Sonntag fehlt er.`); }) },
        ]),
      },
      { label: 'Nein, wir sind doch keine Schauspieler', effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -6), 'Der Sponsor dreht mit seinen Azubis. Die jubeln, als hätten sie noch nie einen Ball gesehen.')) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -1), `${s.boss} versteht es. „Dann eben mein Dackel."`)) }]) },
    ],
  },

  sponsor_feier: {
    weight: 0.8,
    needs: (c, rng) => {
      const s = pickSponsor(c, rng);
      return s ? { id: s.id, name: s.name, boss: s.boss, years: 10 + rng.int(0, 8) * 5 } : null;
    },
    text: (c, ctx) => `${ctx.name} feiert ${ctx.years}-jähriges Jubiläum – Samstagabend, und die Mannschaft ist eingeladen.`,
    options: [
      {
        label: 'Alle hin, wir feiern mit',
        effect: outcome([
          { w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 12), adjustMood(c, 0.06), 'Freibier, Musik vom Band, die Jungs singen das Vereinslied. Der Sponsor ist entzückt.')) },
          { w: 1.5, run: withSponsor((c, ctx, rng, s) => { const s2 = rng.pick(mates(c)); sitOut(c, s2, 'late'); return (adjustRel(s, 10), `Wurde lang. ${first(c, s2)} kommt Sonntag erst zur zweiten Halbzeit.`); }) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -8), 'Einer hält eine Rede über den Sponsor. Leider die ehrliche Version.')) },
          { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 18), book(c, `Spende von ${s.name} (Jubiläumslaune)`, 40), `Um Mitternacht zückt ${s.boss} das Portemonnaie: 40 € für die Mannschaftskasse.`)) },
        ]),
      },
      { label: 'Du gehst allein, die Jungs schlafen', effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 5), c.coach && (c.coach.patience = Math.max(0, c.coach.patience - 5)), 'Du stehst allein am Stehtisch. Der Sponsor freut sich trotzdem. Die Familie weniger.')) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, 9), `Du tanzt mit der Frau von ${s.boss}. Man redet noch Wochen darüber.`)) }]) },
      { label: 'Absagen, Sonntag ist Spieltag', effect: outcome([{ w: 3, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -7), 'Der Sponsor schickt ein Foto vom leeren Mannschaftstisch.')) }, { w: 1, run: withSponsor((c, ctx, rng, s) => (adjustRel(s, -1), `${s.boss}: „Verstehe. Hauptsache, ihr gewinnt."`)) }]) },
    ],
  },
};
