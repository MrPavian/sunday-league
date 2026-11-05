// Verdeckte Boni (Konzept Spielerstärke 10 und 12.9, Nutzerentscheide 2026-10-29 und 2026-11-05): besondere Spieler, deren
// Besonderheit nicht in der Stärkezahl steckt, aber im Spiel wirkt. Nur neue Karrieren (Stärkemodell 3).
//  - Weltklasse: in entscheidenden Momenten (Schlussphase, knappes Spiel) genauer und unbeirrt.
//  - Führungsspieler: die Stufe über „Anführer“ – Aura wie ein Anführer, beruhigt die Mitspieler unter Druck, hält die Kabine
//    zusammen (Unruhe steckt seltener an, Aussprachen gelingen eher).
//  - Star der Liga: relativ zur Liga – die stärksten Spieler der aktuellen Liga, vom Kreisblatt nach dem ersten „Monat“ gekürt.
//    Gegner decken ihn enger, Zuschauer kommen seinetwegen, andere Vereine werben eher ab. Nach einem Aufstieg ist der Titel weg,
//    bis das Kreisblatt neu kürt.
// Entdecken (Nutzerentscheid „mit der Zeit“): Weltklasse und Führungsspieler zeigen sich nach einigen Einsätzen im eigenen Verein
// (mit Co-Trainer früher) oder durch Scouting; den Star kürt das Kreisblatt öffentlich. Wirken tun sie auch unentdeckt.
// Anteile, Schwellen und Wirkungen sind Spielwerte; die Wirkung im Spiel ist gemessen (Konzept 12.9).
// Kein Zufallsstrom der Karriere wird angefasst (eigener Hash), damit bestehende Abläufe gleich bleiben.
import { tr } from '../core/i18n.js';
import { hasTrait } from '../data/traits.js';
import { humanClub, playerOf } from './career.js';
import { MONTH } from './awards.js';
import { chronicle } from './sagas.js';

export const BONUS_IDS = ['weltklasse', 'fuehrung', 'star'];
export const BONUS_NAMES = () => ({
  weltklasse: tr('Weltklasse', 'World class'),
  fuehrung: tr('Führungsspieler', 'Team leader'),
  star: tr('Star der Liga', 'Star of the league'),
});

export const BONUS_DESC = () => ({
  weltklasse: tr('Wenn es spät im Spiel eng wird, spielt er genauer und lässt sich nicht beirren.', 'When it is tight late on, he plays more precisely and keeps his nerve.'),
  fuehrung: tr('Mitspieler laufen neben ihm mehr und bleiben unter Druck ruhiger; in der Kabine hören sie auf ihn.', 'Team-mates run more next to him and stay calmer under pressure; in the dressing room they listen to him.'),
  star: tr('Vom Kreisblatt gekürt: Gegner decken ihn enger, Zuschauer kommen seinetwegen, andere Vereine wollen ihn. Auf der Bank wird er sauer.', 'Crowned by the District Gazette: opponents mark him tighter, fans come to see him, other clubs want him. On the bench he sulks.'),
});

// Spielwerte: wie selten, ab wann entdeckt, wie viele Stars je Liga.
export const BONUS = {
  weltklasseShare: 0.01, // jeder Hundertste
  fuehrungShare: 0.03,
  fuehrungAnfuehrer: 0.25, // wer schon „Anführer“ ist, wird eher Führungsspieler
  seenApps: { weltklasse: 8, fuehrung: 6 }, // Einsätze im eigenen Verein, bis es auffällt
  coachHelps: 3, // mit Co-Trainer so viele Einsätze früher
  stars: 3, // Stars je Liga
  starBench: 2, // so viele Spieltage in Folge ohne Einsatz, bis der Star sauer ist
  starPoach: 2, // Abwerben: so viel mehr Gewicht als ein starker Spieler (poaching.js)
  leaderContagion: 0.5, // Führungsspieler im Kader: Unruhe steckt nur halb so oft an (unrest.js)
  leaderTalk: 2, // … und Aussprachen gelingen eher (zusätzliches Gewicht)
};

const on = (c) => (c?.strength ?? 1) >= 3;
function unit(...xs) {
  let h = 2166136261;
  for (const x of xs) h = Math.imul(h ^ (x >>> 0), 16777619) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

// Angeborene Boni (fest je Karriere und Spieler).
export function innateBonuses(c, idx) {
  if (!on(c)) return [];
  const out = [];
  if (unit(c.seed ?? 0, idx, 7301) < BONUS.weltklasseShare) out.push('weltklasse');
  const p = playerOf(c, idx);
  if (unit(c.seed ?? 0, idx, 7302) < (hasTrait(p, 'anfuehrer') ? BONUS.fuehrungAnfuehrer : BONUS.fuehrungShare)) out.push('fuehrung');
  return out;
}

// Stars der aktuellen Liga (vom Kreisblatt gekürt), nur solange der Verein in dieser Liga spielt.
const starState = (c) => c.flags?.stars;
export function isStar(c, idx) {
  const s = starState(c);
  return !!(on(c) && s && s.level === (c.level ?? 1) && s.ids.includes(idx));
}

export function bonusesOf(c, idx) {
  if (!on(c)) return [];
  const out = innateBonuses(c, idx);
  if (isStar(c, idx)) out.push('star');
  return out;
}

// Was der Trainer weiß: entdeckte Boni des Spielers (Star ist öffentlich).
export function knownBonuses(c, idx) {
  const seen = c.players?.[idx]?.bonusSeen ?? [];
  return bonusesOf(c, idx).filter((id) => id === 'star' || seen.includes(id) || c.players?.[idx]?.scouted);
}

// Kreisblatt kürt die Stars: die stärksten Spieler aller Vereine der Liga.
export function crownStars(c) {
  const all = c.clubs.flatMap((club) => club.squad.map((idx) => ({ idx, club, rating: playerOf(c, idx).rating })));
  all.sort((a, b) => b.rating - a.rating || a.idx - b.idx);
  const top = all.slice(0, BONUS.stars);
  (c.flags ??= {}).stars = { season: c.season ?? 1, level: c.level ?? 1, ids: top.map((t) => t.idx) };
  return top;
}

const totalApps = (rec) => (rec?.total?.apps ?? 0) + (rec?.apps ?? 0);
const post = (c, text) => c.week?.chat.push({ from: null, text, time: 'Mo 08:20' });

// Hook nach jedem Spieltag (hooks.js).
export function finishRound(c) {
  if (!on(c)) return;
  if (c.round === MONTH) {
    const top = crownStars(c);
    const names = top.map((t) => `${playerOf(c, t.idx).name} (${t.club.short})`).join(', ');
    post(c, tr(`Kreisblatt: Die Stars der Liga – ${names}.`, `District Gazette: The stars of the league – ${names}.`));
    for (const t of top.filter((x) => x.club.human)) chronicle(c, tr(`${playerOf(c, t.idx).name} ist ein Star der Liga.`, `${playerOf(c, t.idx).name} is a star of the league.`));
  }
  const coach = c.staff?.cotrainer ? BONUS.coachHelps : 0;
  for (const idx of humanClub(c).squad) {
    const rec = c.players[idx];
    if (!rec) continue;
    // Ein Star will spielen: zwei Spieltage in Folge ohne Einsatz (gesund und da), dann ist er sauer.
    if (isStar(c, idx) && !(rec.injuryWeeks > 0)) {
      const played = rec.recent?.at(-1)?.round === c.round - 1;
      rec.starBench = played ? 0 : (rec.starBench ?? 0) + 1;
      if (rec.starBench >= BONUS.starBench && !(rec.grumpy > 0)) {
        rec.grumpy = 2;
        rec.starBench = 0;
        post(c, tr(`${playerOf(c, idx).name} schreibt dir: „Ich bin der Star dieser Liga und sitze draußen? Ernsthaft?“`, `${playerOf(c, idx).name} messages you: "I am the star of this league and I am on the bench? Seriously?"`));
      }
    }
    for (const id of innateBonuses(c, idx)) {
      if (rec.bonusSeen?.includes(id) || totalApps(rec) < BONUS.seenApps[id] - coach) continue;
      rec.bonusSeen = [...(rec.bonusSeen ?? []), id];
      const name = playerOf(c, idx).name;
      post(c, id === 'weltklasse'
        ? tr(`Dir fällt es jetzt auf: Wenn es eng wird, ist ${name} da. Ruhig, genau, als wäre es ein Trainingsspiel – das ist Weltklasse.`, `It strikes you now: when it gets tight, ${name} is there. Calm, precise, as if it were a practice game – that is world class.`)
        : tr(`${name} ist ein Führungsspieler: Nach Gegentoren holt er alle zusammen, in der Kabine hören sie auf ihn.`, `${name} is a team leader: after conceding he gathers everyone, in the dressing room they listen to him.`));
    }
  }
}

// Führungsspieler im Kader (wirkt auch unentdeckt).
export const leadersIn = (c) => (on(c) ? humanClub(c).squad.filter((idx) => innateBonuses(c, idx).includes('fuehrung')) : []);

// Zuschauer kommen wegen der eigenen Stars (Spielwert: je Star +10 %).
export const STAR_FANS = 0.1;
export const starFans = (c) => 1 + STAR_FANS * (on(c) ? humanClub(c).squad.filter((idx) => isStar(c, idx)).length : 0);
