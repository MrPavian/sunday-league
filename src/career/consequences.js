// Folgen sichtbar machen: Vor einer Entscheidung wird der Vereinszustand gemerkt,
// danach verglichen. Heraus kommen kurze Chips wie „Stimmung ↑", „Kasse −15 €",
// „Kalle & Jens: jetzt Kumpels" – damit man sieht, dass die Wahl etwas bewirkt.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf } from './career.js';
import { REL } from './relations.js';

export function snapshot(c) {
  const club = humanClub(c);
  const players = {};
  for (const idx of club.squad) {
    const r = c.players[idx] ?? {};
    players[idx] = { form: r.form ?? 0, injury: r.injuryWeeks ?? 0, grumpy: r.grumpy ?? 0, absence: r.absenceMul ?? 1 };
  }
  return {
    mood: c.mood ?? 0,
    cash: c.cash ?? 0,
    squad: [...club.squad],
    players,
    relations: { ...(c.relations ?? {}) },
    energy: c.coach?.energy ?? null,
    patience: c.coach?.patience ?? null,
    sponsors: (c.sponsors ?? []).map((s) => ({ id: s.id, rel: s.rel ?? 50 })),
  };
}

const first = (c, idx) => playerOf(c, idx)?.name.split(' ')[0] ?? '?';

// good: true (grün), false (rot), null (neutral)
export function consequences(c, before) {
  const after = snapshot(c);
  const out = [];
  const add = (text, good) => out.push({ text, good });
  const dm = after.mood - before.mood;
  if (Math.abs(dm) >= 0.02) add(dm > 0 ? tr('Stimmung ↑', 'Morale ↑') : tr('Stimmung ↓', 'Morale ↓'), dm > 0);
  const dc = Math.round(after.cash - before.cash);
  if (dc) add(tr(`Kasse ${dc > 0 ? '+' : '−'}${Math.abs(dc)} €`, `Kitty ${dc > 0 ? '+' : '−'}€${Math.abs(dc)}`), dc > 0);
  for (const idx of before.squad.filter((i) => !after.squad.includes(i))) add(tr(`${first(c, idx)} ist weg`, `${first(c, idx)} has gone`), false);
  for (const idx of after.squad.filter((i) => !before.squad.includes(i))) add(tr(`${first(c, idx)} ist neu dabei`, `${first(c, idx)} has joined`), true);
  for (const [k, p] of Object.entries(after.players)) {
    const b = before.players[k];
    if (!b) continue;
    const idx = Number(k);
    const df = p.form - b.form;
    if (Math.abs(df) >= 0.05) add(tr(`Form ${first(c, idx)} ${df > 0 ? '↑' : '↓'}`, `${first(c, idx)}'s form ${df > 0 ? '↑' : '↓'}`), df > 0);
    if (p.injury > b.injury) add(tr(`${first(c, idx)} fällt ${p.injury} Wo. aus`, `${first(c, idx)} out ${p.injury} wk`), false);
    else if (p.injury < b.injury) add(tr(`${first(c, idx)} früher zurück`, `${first(c, idx)} back sooner`), true);
    if (p.grumpy > b.grumpy) add(tr(`${first(c, idx)} ist angefressen`, `${first(c, idx)} is sulking`), false);
    if (p.absence > b.absence + 0.05) add(tr(`${first(c, idx)} sagt öfter ab`, `${first(c, idx)} will drop out more`), false);
    else if (p.absence < b.absence - 0.05) add(tr(`${first(c, idx)} kommt zuverlässiger`, `${first(c, idx)} more reliable`), true);
  }
  const keys = new Set([...Object.keys(before.relations), ...Object.keys(after.relations)]);
  for (const k of keys) {
    if (before.relations[k] === after.relations[k]) continue;
    const [a, b] = k.split('-').map(Number);
    const type = after.relations[k];
    const names = `${first(c, a)} & ${first(c, b)}`;
    if (!type || type === 'none') add(tr(`${names}: Streit beigelegt`, `${names}: feud settled`), before.relations[k] === 'rivalen' || before.relations[k] === 'feinde' ? true : null);
    else add(tr(`${names}: jetzt ${REL[type]?.plural ?? type}`, `${names}: now ${REL[type]?.plural ?? type}`), type !== 'rivalen' && type !== 'feinde');
  }
  if (after.energy != null && before.energy != null && Math.abs(after.energy - before.energy) >= 3) add(after.energy > before.energy ? tr('Deine Energie ↑', 'Your energy ↑') : tr('Deine Energie ↓', 'Your energy ↓'), after.energy > before.energy);
  if (after.patience != null && before.patience != null && Math.abs(after.patience - before.patience) >= 3) add(after.patience > before.patience ? tr('Familie zufriedener', 'Family happier') : tr('Familie genervt', 'Family annoyed'), after.patience > before.patience);
  for (const s of after.sponsors) {
    const b = before.sponsors.find((x) => x.id === s.id);
    if (b && Math.abs(s.rel - b.rel) >= 3) add(s.rel > b.rel ? tr('Sponsor zufriedener', 'Sponsor happier') : tr('Sponsor verstimmt', 'Sponsor unhappy'), s.rel > b.rel);
  }
  return out.slice(0, 6);
}

export const effectChips = (list) =>
  list?.length ? `<ul class="effects">${list.map((e) => `<li class="${e.good === true ? 'good' : e.good === false ? 'bad' : ''}">${e.text}</li>`).join('')}</ul>` : '';
