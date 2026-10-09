// Generationen: Wer lange für den Verein gespielt hat, schickt irgendwann den
// Nachwuchs. Ein paar Jahre nach dem Abschied meldet sich „der Sohn von …" in der
// A-Jugend an – mit Papas Frisur und ein bisschen von Papas Stärke. Und die Alten
// stehen weiter am Zaun und haben zu jedem Ergebnis eine Meinung.
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { firstNameFor } from '../data/origins.js';
import { generatePlayer, ratePlayer } from '../sim/generator.js';
import { addCustomPlayer, humanClub, playerOf } from './career.js';
import { chronicle } from './sagas.js';

const ATTRS = ['pace', 'stamina', 'technique', 'passing', 'shooting', 'tackling', 'heading', 'keeping'];
const TIER_UP = { ok: 'gut', gut: 'stark', stark: 'stark', dorfstar: 'dorfstar', legende: 'dorfstar' };

const lastName = (name) => name.split(' ').slice(-1)[0];
const firstName = (name) => name.split(' ')[0];

// Wer taugt als Vater (oder Mutter) eines neuen Talents?
export function heirCandidates(c) {
  const done = new Set(c.heirs?.parents ?? []);
  return (c.alumni ?? []).filter((a) => a.idx != null && !done.has(a.idx) && a.idx !== c.coach?.idx && c.season - a.season >= 2 && a.age >= 30 && (a.apps >= 20 || a.goals >= 8));
}

// Saisonwechsel: höchstens ein Nachwuchs pro Jahr. Liefert eine Meldung oder null.
export function heirIntake(c, rng = createRng((c.seed * 257 + c.season * 31 + 11) >>> 0)) {
  const cands = heirCandidates(c).sort((a, b) => b.apps + b.goals * 3 - (a.apps + a.goals * 3));
  if (!cands.length || !rng.chance(0.4) || !c.youth) return null;
  const a = cands[0];
  const dad = playerOf(c, a.idx);
  const gen = createRng((c.seed * 613 + a.idx * 7 + c.season) >>> 0); // der Junior selbst
  const role = gen.chance(0.6) ? dad.position ?? 'mid' : gen.pick(['def', 'mid', 'fwd']);
  const p = generatePlayer(gen, { role, tier: TIER_UP[dad.tier] ?? 'gut' });
  // Papas beste Stärke vererbt sich ein bisschen.
  const best = ATTRS.filter((k) => k !== 'keeping' || role === 'gk').sort((x, y) => (dad.attrs[y] ?? 0) - (dad.attrs[x] ?? 0))[0];
  p.attrs[best] = Math.min(0.95, Math.max(p.attrs[best], (dad.attrs[best] ?? 0.5) - 0.08) + 0.03);
  const age = 16 + (gen.chance(0.5) ? 1 : 0);
  const player = {
    ...p,
    name: `${firstNameFor(lastName(a.name), gen, age)} ${lastName(a.name)}`,
    age: age - ((c.season ?? 1) - 1), // playerOf zählt die Saisons dazu
    profession: 'Schüler',
    position: role,
    backstory: tr(`Sohn von ${a.name} (${a.apps} Spiele, ${a.goals} Tore für den Verein). Stand schon im Kinderwagen am Spielfeldrand.`, `Son of ${a.name} (${a.apps} games, ${a.goals} goals for the club). Was already at the touchline in his pram.`),
    look: { ...p.look, skin: dad.look?.skin ?? p.look.skin, hair: gen.chance(0.6) ? dad.look?.hair ?? p.look.hair : p.look.hair, bald: false, beard: false, belly: 0 },
    traits: p.traits ?? [],
    custom: 'heir',
    parentIdx: a.idx,
    parentName: a.name,
  };
  player.rating = ratePlayer(player);
  const idx = addCustomPlayer(c, player);
  c.players[idx] = { apps: 0, goals: 0, assists: 0, gradeSum: 0, graded: 0, injuryWeeks: 0, heirOf: a.idx };
  c.youth.prospects.push(idx);
  c.heirs ??= { parents: [], kids: [] };
  c.heirs.parents.push(a.idx);
  c.heirs.kids.push(idx);
  const kid = firstName(player.name);
  chronicle(c, tr(`${player.name}, Sohn von ${a.name}, meldet sich in der A-Jugend an.`, `${player.name}, son of ${a.name}, joins the U19s.`));
  return tr(`Die nächste Generation: ${kid}, der Sohn von ${a.name}, spielt jetzt in unserer A-Jugend. „Er hat meinen linken Fuß – und leider auch meine Kondition", sagt der Papa.`, `The next generation: ${kid}, ${a.name}'s son, now plays in our U19s. "He's got my left foot – and sadly my stamina too," says his dad.`);
}

// Nach dem Spiel: Das erste Tor des Juniors ist eine Meldung wert.
export function heirMoments(c) {
  const out = [];
  for (const idx of c.heirs?.kids ?? []) {
    const rec = c.players[idx];
    if (!rec || rec.heirGoal || !humanClub(c).squad.includes(idx)) continue;
    if ((rec.goals ?? 0) + (rec.total?.goals ?? 0) < 1) continue;
    rec.heirGoal = true;
    const p = playerOf(c, idx);
    const text = tr(`Kreisblatt: Wie der Vater, so der Sohn – ${p.name} trifft zum ersten Mal. ${firstName(p.parentName)} stand am Zaun und hat geweint. Sagt er selbst.`, `District Gazette: Like father, like son – ${p.name} scores his first goal. ${firstName(p.parentName)} was at the fence in tears. His words.`);
    (c.pendingNews ??= []).push(text);
    chronicle(c, tr(`Erstes Tor von ${p.name} – wie früher sein Vater ${p.parentName}.`, `First goal for ${p.name} – just like his father ${p.parentName} used to.`));
    out.push(text);
  }
  return out;
}

const FENCE = {
  win: tr(
    ['Früher hätten wir das höher gewonnen. Aber gut.', 'Schön gespielt, Jungs. Fast so wie wir damals.', 'Sieg ist Sieg. Das Bier danach schmeckt trotzdem besser.', 'Ich hab’s am Zaun gesagt: die zweite Halbzeit gehört uns.'],
    ['We would have won by more in my day. But fine.', 'Nicely played, lads. Almost like we used to.', 'A win is a win. The beer afterwards tastes better anyway.', 'I said it at the fence: the second half is ours.'],
  ),
  loss: tr(
    ['Zu meiner Zeit hätte es das nicht gegeben.', 'Mehr laufen, weniger meckern. Hat bei uns auch geholfen.', 'Kopf hoch. Wir haben früher auch mal 0:6 verloren – beim Grillen danach waren wir trotzdem Erster.', 'Ich stell mich nächste Woche wieder an den Zaun. Irgendwer muss ja rufen.'],
    ['That would never have happened in my day.', 'Run more, moan less. Worked for us.', 'Chin up. We lost 6-0 once too – still came first at the barbecue afterwards.', 'I will be back at the fence next week. Someone has to shout.'],
  ),
  draw: tr(
    ['Unentschieden. Wie früher gegen die vom Kanal – jedes Jahr.', 'Ein Punkt ist ein Punkt, hat mein alter Trainer immer gesagt.'],
    ['A draw. Like against the canal lot back in the day – every year.', 'A point is a point, my old manager always said.'],
  ),
};

// Wochenbeginn: Einer der Ehemaligen meldet sich zum letzten Ergebnis.
export function fenceVoice(c, chat, result) {
  if (!result) return null;
  const rng = createRng((c.seed * 43 + c.season * 101 + c.round * 13 + 9) >>> 0);
  const alumni = (c.alumni ?? []).filter((a) => a.idx != null && a.idx !== c.coach?.idx && (a.apps ?? 0) >= 10);
  if (!alumni.length || !rng.chance(0.3)) return null;
  const a = rng.pick(alumni);
  const [gf, ga] = result;
  const list = gf > ga ? FENCE.win : gf < ga ? FENCE.loss : FENCE.draw;
  const msg = { from: a.idx, text: rng.pick(list), time: 'Mo 07:15', alum: a.role ?? true };
  chat.push(msg);
  return msg;
}
