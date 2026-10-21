// Nach dem Traineramt (ROADMAP 11.9): Wer als Trainer aufhört (oder als Spielertrainer zu den Alten Herren
// wechselt), muss den Nachfolger an der Linie nicht erben – man engagiert ihn selbst. Drei Bewerber, ein kurzes
// Gespräch, dann sitzt die eigene Figur im Präsidium: Finanzen, Ausbau, Sponsoren, Saisonziele, Trainerwahl.
// Gespielt wird ohne einen an der Seitenlinie: Der eingestellte Trainer (c.hired) stellt auf, wählt die Taktik
// und kümmert sich um Zusagen und Neuzugänge; man schaut zu (Tribüne/Liveticker) oder lässt simulieren.
//
// Zustand im Spielstand:
//   c.coach.office = 'president'   die eigene Figur sitzt im Präsidium (isPresident, personal.js)
//   c.hired = { … } | null         der eingestellte Trainer; null = Stelle vakant
//   c.hiredCount                   wie oft schon ein Trainer eingestellt wurde (die erste Einstellung kostet nichts)
//
// Alle Beträge sind Spielwerte (keine reale Quelle): Sie sind an die knappe Kasse des Spiels angepasst
// (Einnahmen auf Stufe 1 liegen bei ein paar hundert Euro je Saison, siehe finances.js). Zum Vergleich in der
// Wirklichkeit: Übungsleiterpauschale 275 €/Monat (staff.js).
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { HAIR_COLORS, SKIN_TONES } from '../data/names.js';
import { personName } from '../data/origins.js';
import { STYLE_IDS, STYLES, systemsFor } from '../sim/tactics.js';
import { GOALS, targetPos } from './board.js';
import { humanClub, maxSquad, nudge, playerOf, recruit, seasonOver } from './career.js';
import { adjustMood } from './events.js';
import { book } from './finances.js';
import { coachPlaying, hangUpBoots, legacy } from './legacy.js';
import { isPresident } from './personal.js';
import { chronicle } from './sagas.js';
import { promoteProspect } from './youth.js';

export { isPresident };

// Wochenlohn je Liga-Stufe (Spielwert), skaliert mit dem Ruf des Trainers.
const SALARY_BASE = [0, 12, 20, 30, 42, 56];
export const SEVERANCE_WEEKS = 6; // Abfindung bei Entlassung: sechs Wochenlöhne (Spielwert)
export const HIRE_FEE_WEEKS = 2; // Handgeld ab der zweiten Einstellung: zwei Wochenlöhne (Spielwert)
const PERSONAS = ['stratege', 'oldschool', 'grossmaul', 'kumpeltyp']; // wie bei den Trainern der Gegner (opponents.js)
const FORMATS = [4, 5, 7, 9, 11];

const hash = (...parts) => parts.reduce((h, p) => (Math.imul(h ^ (p | 0), 0x9e3779b1) + 0x7f4a7c15) >>> 0, 0x2c1b3c6d);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const hasCoach = (c) => !!c.hired;
export const vacant = (c) => isPresident(c) && !c.hired;
export const hiredAge = (c) => (c.hired ? c.hired.age + Math.max(0, (c.season ?? 1) - c.hired.since) : null);
export const weeklySalary = (c) => c.hired?.salary ?? 0;
export const severance = (c) => (c.hired ? Math.round(c.hired.salary * SEVERANCE_WEEKS) : 0);

// --- Bewerber ------------------------------------------------------------------

// Drei Typen, damit die Wahl eine ist: der Routinier (teuer, sicher, alte Schule), der Ehrgeizige (billig, riskant,
// frische Ideen) und der Vereinsmensch (mittendrin, kennt jede Mutter).
const ARCHETYPES = {
  routinier: { age: [54, 66], quality: [0.62, 0.8], rep: [65, 90], styles: ['mauern', 'konter', 'ausgewogen', 'fluegel'], persona: 'oldschool' },
  ehrgeizig: { age: [27, 35], quality: [0.4, 0.72], rep: [12, 40], styles: ['pressing', 'offensiv', 'kurzpass'], persona: ['stratege', 'grossmaul'] },
  vereinsmensch: { age: [40, 52], quality: [0.45, 0.66], rep: [32, 60], styles: ['ausgewogen', 'fluegel', 'kurzpass', 'konter'], persona: 'kumpeltyp' },
};
const ARCH_IDS = Object.keys(ARCHETYPES);

const PITCH = {
  routinier: tr(
    ['Ich habe schon in jedem Kreis den Abstieg verhindert. Mit mir gibt es keine Experimente und keinen Ärger.', 'Vierzig Jahre Fußball. Ich brauche keine Videoanalyse, ich sehe es am Gang, wer Sonntag ausfällt.', 'Ruhe, Ordnung, Abwehr. Der Rest ergibt sich.'],
    ['I have saved teams from relegation in every district. No experiments and no trouble with me.', 'Forty years of football. I do not need video analysis – I can tell by the way they walk who will drop out on Sunday.', 'Calm, order, defence. The rest follows.'],
  ),
  ehrgeizig: tr(
    ['Ich analysiere jedes Spiel auf Video und habe ein Notizbuch voller Ideen. Gebt mir Vertrauen, ich gebe euch Tore.', 'Ich will hoch hinaus – und den Verein mitnehmen. Pressing, Tempo, Mut.', 'Ich kenne die neuesten Übungen aus dem Internet. Die Hälfte davon funktioniert sogar.'],
    ['I analyse every game on video and have a notebook full of ideas. Give me your trust and I will give you goals.', 'I want to go places – and take the club with me. Pressing, tempo, courage.', 'I know the latest drills from the internet. Half of them even work.'],
  ),
  vereinsmensch: tr(
    ['Ich kenne hier jeden, und jeder kennt mich. Die Jungs spielen für mich, nicht wegen des Geldes.', 'Fußball ist für mich Gemeinschaft: erst die Mannschaft, dann die Taktik, dann das Bier.', 'Ich bin seit Jahren im Verein und weiß, wer mit wem nicht kann. Das ist mehr wert als jedes Taktikbuch.'],
    ['I know everyone here and everyone knows me. The lads play for me, not for the money.', 'To me football is community: team first, tactics second, beer third.', 'I have been around the club for years and know who cannot stand whom. That is worth more than any tactics book.'],
  ),
};

const WISH = {
  routinier: tr('Ruhe im Verein und einen Platz, auf dem man noch richtig grätschen darf.', 'Peace and quiet at the club and a pitch where you can still slide in properly.'),
  ehrgeizig: tr('Eine Videowand im Vereinsheim und die Freiheit, junge Leute auszuprobieren.', 'A video wall in the clubhouse and the freedom to try out young players.'),
  vereinsmensch: tr('Dass das Bier nach dem Spiel kalt ist und der Vorstand nicht reinredet.', 'That the beer is cold after the game and the board stays out of it.'),
};

const STYLE_ANSWER = {
  ausgewogen: tr('Jeder weiß, wo er steht, jeder hilft hinten. Kein Schnickschnack.', 'Everyone knows where he stands, everyone helps at the back. No frills.'),
  offensiv: tr('Hoch stehen, früh schießen. Wir kriegen vielleicht ein Tor mehr, schießen aber zwei.', 'High line, shoot early. We may concede one more, but we score two.'),
  konter: tr('Tief stehen, Ball erobern, dann steil. Die anderen laufen sich müde.', 'Sit deep, win the ball, then go direct. The others run themselves tired.'),
  fluegel: tr('Breit machen und flanken. Hauptsache, vorne steht einer, der den Kopf hinhält.', 'Go wide and cross. As long as someone is up front to put his head on it.'),
  kurzpass: tr('Der Ball muss laufen, nicht die Spieler. Sieht schön aus – wenn es klappt.', 'The ball has to run, not the players. Looks lovely – when it works.'),
  pressing: tr('Früh stören, zu zweit drauf. Nach siebzig Minuten wird es zäh, aber dann haben wir schon geführt.', 'Harass them early, two on the ball. It gets heavy after seventy minutes, but by then we are ahead.'),
  mauern: tr('Alle hinter den Ball, lange Bälle nach vorn. Hässlich, aber es gibt Punkte.', 'Everyone behind the ball, long balls forward. Ugly, but it earns points.'),
};

// Deterministisch aus Seed, Saison und Zahl der bisherigen Einstellungen: dieselben drei Bewerber beim Neuladen.
export function coachApplicants(c) {
  const rng = createRng(hash(c.seed ?? 0, c.season ?? 1, c.hiredCount ?? 0, c.round ?? 0, 977));
  const level = clamp(c.level ?? 1, 1, 5);
  const order = ARCH_IDS.map((id) => ({ id, k: rng.next() })).sort((a, b) => a.k - b.k).map((x) => x.id);
  return order.map((arch, i) => {
    const a = ARCHETYPES[arch];
    const age = Math.round(rng.range(a.age[0], a.age[1]));
    const name = personName(rng, age);
    const [first, ...rest] = name.split(' ');
    const quality = Math.round(rng.range(a.quality[0], a.quality[1]) * 100) / 100;
    const reputation = Math.round(rng.range(a.rep[0], a.rep[1]));
    const style = rng.pick(a.styles.filter((s) => STYLES[s]));
    const persona = Array.isArray(a.persona) ? rng.pick(a.persona) : a.persona;
    const look = {
      skin: rng.chance(0.82) ? SKIN_TONES[rng.int(0, 2)] : SKIN_TONES[rng.int(3, SKIN_TONES.length - 1)],
      hair: age > 55 && rng.chance(0.6) ? HAIR_COLORS[5] : HAIR_COLORS[rng.int(0, HAIR_COLORS.length - 1)],
      bald: age > 45 && rng.chance(0.3),
      beard: rng.chance(arch === 'ehrgeizig' ? 0.35 : 0.25),
    };
    const salary = Math.max(6, Math.round(SALARY_BASE[level] * (0.55 + (reputation / 100) * 0.95)));
    const promise = quality >= 0.7 ? 'aufstieg' : quality >= 0.52 ? 'obere' : 'erhalt';
    const pitch = rng.pick(PITCH[arch]);
    return { id: `${arch}-${i}`, arch, first, last: rest.join(' '), name, age, look, style, persona, quality, reputation, salary, promise, pitch, wish: WISH[arch], haggled: false, irritated: false };
  });
}

// --- Gespräch ------------------------------------------------------------------

export const QUESTIONS = ['style', 'goal', 'wish', 'money'];
export const questionLabel = (q) => ({ style: tr('Wie lässt du spielen?', 'How do you set the team up?'), goal: tr('Was traust du der Mannschaft zu?', 'What do you think this team can do?'), wish: tr('Was wünschst du dir vom Verein?', 'What do you want from the club?'), money: tr('Und das Gehalt?', 'And the pay?') })[q];

export function interviewAnswer(cand, q) {
  if (q === 'style') return STYLE_ANSWER[cand.style];
  if (q === 'goal') {
    const g = GOALS[cand.promise].name;
    return cand.quality >= 0.7
      ? tr(`Mit mir: ${g}. Ich lege mich fest.`, `With me: ${g}. I will commit to that.`)
      : cand.quality >= 0.52
        ? tr(`${g} – das ist realistisch. Mehr verspreche ich nicht.`, `${g} – that is realistic. I will not promise more.`)
        : tr(`Erst mal: ${g}. Dann sehen wir weiter.`, `First of all: ${g}. Then we will see.`);
  }
  if (q === 'wish') return cand.wish;
  if (q === 'money') return cand.haggled
    ? cand.irritated
      ? tr(`Ich hab es gesagt: ${cand.salary} € pro Woche. Mehr Feilschen bringt nichts.`, `I told you: €${cand.salary} a week. More haggling gets us nowhere.`)
      : tr(`Na gut, ${cand.salary} € pro Woche. Aber das war mein letztes Wort.`, `Fine, €${cand.salary} a week. But that is my final offer.`)
    : tr(`${cand.salary} € pro Woche. Dafür bekommst du jemanden, der ${cand.reputation >= 60 ? 'weiß, was er wert ist' : 'noch etwas beweisen will'}.`, `€${cand.salary} a week. For that you get someone who ${cand.reputation >= 60 ? 'knows what he is worth' : 'still has something to prove'}.`);
  return '';
}

// Einmal um das Gehalt feilschen: Wer sich einen Namen gemacht hat, gibt seltener nach.
// Liefert einen neuen Bewerber (der alte bleibt unverändert) und ob es geklappt hat.
export function haggle(c, cand) {
  if (cand.haggled) return { cand, ok: false };
  const rng = createRng(hash(c.seed ?? 0, c.season ?? 1, c.hiredCount ?? 0, cand.age, cand.salary, 31));
  const ok = rng.chance(clamp(0.7 - cand.reputation / 160, 0.15, 0.7));
  const next = { ...cand, haggled: true, irritated: !ok, salary: ok ? Math.max(6, Math.round(cand.salary * 0.85)) : cand.salary };
  return { cand: next, ok };
}

export const hireFee = (c, cand) => ((c.hiredCount ?? 0) > 0 ? Math.round(cand.salary * HIRE_FEE_WEEKS) : 0);
// Mindestens Handgeld plus die erste Wochenlohn-Zahlung muss in der Kasse sein (Schulden gibt es nicht).
export const canHire = (c, cand) => c.cash >= hireFee(c, cand) + cand.salary;

// --- Taktik und Aufstellung durch den Trainer ------------------------------------

// Der Trainer wählt Spielstil und je Format ein System – deterministisch aus seiner Handschrift.
export function applyCoachTactic(c) {
  const h = c.hired;
  if (!h) return false;
  const club = humanClub(c);
  club.tactic ??= { style: 'ausgewogen', systems: {} };
  if (club.tactic.coachSeed === h.seed) return false;
  club.tactic.style = h.style;
  club.tactic.systems = {};
  for (const f of FORMATS) {
    const keys = Object.keys(systemsFor(f));
    club.tactic.systems[f] = keys[hash(h.seed, f) % keys.length];
  }
  club.tactic.orders = {}; // Spielplan-Befehle des früheren Trainers gelten nicht mehr
  club.tactic.coachSeed = h.seed;
  if (c.week) c.week.lineup = null;
  return true;
}

// --- Einstellen und Entlassen ----------------------------------------------------

// Die Ära des Spielertrainers/Trainers endet, der Mensch rückt ins Präsidium (nur beim ersten Mal).
function becomePresident(c, cand) {
  const L = legacy(c);
  const k = c.coach;
  const since = k.since ?? 1;
  const tenure = (c.history ?? []).filter((h) => h.season >= since);
  const titles = tenure.filter((h) => h.pos === 1).length;
  const name = k.idx != null ? playerOf(c, k.idx).name : tr('Der alte Trainer', 'The old manager');
  if (coachPlaying(c)) {
    hangUpBoots(c);
    k.oldBoys ??= { since: seasonOver(c) ? c.season + 1 : c.season }; // Haken für die Alten Herren (legacy.js)
  }
  L.eras.push({ name, from: since, to: c.season, seasons: c.season - since + 1, titles, age: k.idx != null ? playerOf(c, k.idx).age : null, successor: cand.name, how: 'extern' });
  k.office = 'president';
  k.presidentSince = seasonOver(c) ? c.season + 1 : c.season;
  chronicle(c, tr(`Ende einer Ära an der Linie: ${name} geht nach ${c.season - since + 1} Saisons ins Präsidium und holt ${cand.name} als Trainer.`, `End of an era on the touchline: ${name} moves up to the president's office after ${c.season - since + 1} seasons and brings in ${cand.name} as manager.`));
  return name;
}

// Bewerber verpflichten. { ok, reason?, hired? }. Beim ersten Mal wird man Präsident, später ersetzt man nur den Trainer.
export function appointCoach(c, cand) {
  if (!c.coach) return { ok: false, reason: 'nocoach' };
  if (c.hired) return { ok: false, reason: 'occupied' };
  if (!canHire(c, cand)) return { ok: false, reason: 'cash' };
  const L = legacy(c);
  const first = !isPresident(c);
  if (first && !L.choosing) return { ok: false, reason: 'notchoosing' }; // erst Rücktritt bzw. Schuhe-Entscheidung (legacy.js)
  const oldName = first ? becomePresident(c, cand) : null;
  const fee = hireFee(c, cand);
  if (fee) book(c, tr(`Handgeld Trainer ${cand.name}`, `Signing-on fee, manager ${cand.name}`), -fee);
  c.hiredCount = (c.hiredCount ?? 0) + 1;
  c.hired = {
    id: c.hiredCount,
    seed: hash(c.seed ?? 0, c.hiredCount, cand.age, cand.salary) || 1,
    first: cand.first,
    last: cand.last,
    name: cand.name,
    age: cand.age,
    look: { ...cand.look },
    style: cand.style,
    persona: cand.persona,
    arch: cand.arch,
    quality: cand.quality,
    reputation: cand.reputation,
    salary: cand.salary,
    promise: cand.promise,
    pitch: cand.pitch,
    since: seasonOver(c) ? c.season + 1 : c.season,
    sinceRound: seasonOver(c) ? 0 : c.round,
    happy: clamp(60 - (cand.irritated ? 10 : 0), 0, 100),
    warned: false,
  };
  L.choosing = false;
  L.decided = c.season;
  applyCoachTactic(c);
  adjustMood(c, first ? 0.02 : 0.01);
  const text = first
    ? tr(`Neue Ära: ${cand.name} (${cand.age}) ist der neue Trainer. ${oldName} sitzt ab jetzt im Präsidium und sieht sich die Spiele von der Tribüne an.`, `New era: ${cand.name} (${cand.age}) is the new manager. ${oldName} now sits in the president's office and watches the games from the stand.`)
    : tr(`${cand.name} (${cand.age}) ist der neue Trainer.`, `${cand.name} (${cand.age}) is the new manager.`);
  L.notes.push(text);
  (c.pendingNews ??= []).push(first
    ? tr(`Kreisblatt: ${oldName} gibt die Linie ab und führt den Verein als Präsident. Neuer Trainer: ${cand.name} (${cand.age}), Spielstil „${STYLES[cand.style].label}“. Sein Motto: „${cand.pitch}“`, `District Gazette: ${oldName} hands over the touchline and runs the club as president. New manager: ${cand.name} (${cand.age}), style "${STYLES[cand.style].label}". His motto: "${cand.pitch}"`)
    : tr(`Kreisblatt: ${cand.name} (${cand.age}) ist der neue Trainer.`, `District Gazette: ${cand.name} (${cand.age}) is the new manager.`));
  chronicle(c, tr(`${cand.name} wird Trainer (Spielstil: ${STYLES[cand.style].label}).`, `${cand.name} becomes manager (style: ${STYLES[cand.style].label}).`));
  return { ok: true, hired: c.hired, first };
}

function releaseHired(c, why) {
  const h = c.hired;
  if (!h) return null;
  const L = legacy(c);
  (L.hiredLog ??= []).push({ name: h.name, from: h.since, to: c.season, why });
  c.hired = null;
  return h;
}

// Trainer entlassen: kostet die Abfindung (Schulden gibt es nicht – ohne Geld keine Entlassung).
export function fireCoach(c) {
  if (!isPresident(c) || !c.hired) return { ok: false, reason: 'nocoach' };
  const fee = severance(c);
  if (c.cash < fee) return { ok: false, reason: 'cash', fee };
  const h = c.hired;
  book(c, tr(`Abfindung Trainer ${h.name}`, `Severance, manager ${h.name}`), -fee);
  releaseHired(c, 'fired');
  adjustMood(c, -0.05);
  chronicle(c, tr(`${h.name} wird als Trainer entlassen.`, `${h.name} is sacked as manager.`));
  (c.pendingNews ??= []).push(tr(`Kreisblatt: ${h.name} muss als Trainer gehen. Der Präsident sucht einen Nachfolger.`, `District Gazette: ${h.name} has to go as manager. The president is looking for a successor.`));
  return { ok: true, fee };
}

// --- Saisonziele ---------------------------------------------------------------

// Der Präsident legt das Saisonziel selbst fest – bis zum Zwischenzeugnis.
export function canSetGoal(c) {
  return isPresident(c) && !!c.goal && c.goal.season === c.season && !c.goal.mid && !seasonOver(c);
}
export function setPresidentGoal(c, type) {
  if (!canSetGoal(c) || !GOALS[type]) return false;
  c.goal = { ...c.goal, type, target: targetPos(c, type), byPresident: true };
  return true;
}

// --- Woche und Saison -------------------------------------------------------------

export const happyLabel = (v) => (v >= 70 ? tr('zufrieden', 'content') : v >= 45 ? tr('geht so', 'so-so') : v >= 20 ? tr('unzufrieden', 'unhappy') : tr('will weg', 'wants out'));

// Wochenende vorbei (vor round++): Lohn zahlen, Stimmung des Trainers nach dem Ergebnis. Liefert Meldungen.
export function weeklyHired(c) {
  const h = c.hired;
  if (!isPresident(c) || !h) return [];
  const notes = [];
  if (c.cash < h.salary) {
    // Leere Kasse: Wer nicht bezahlt wird, hört auf – wie beim Ehrenamt (staff.js).
    releaseHired(c, 'unpaid');
    notes.push(tr(`Die Kasse ist leer: ${h.name} bekommt den Lohn nicht mehr und hört als Trainer auf.`, `The kitty is empty: ${h.name} is no longer paid and quits as manager.`));
    return notes;
  }
  book(c, tr(`Trainer ${h.name} (Lohn)`, `Manager ${h.name} (wages)`), -h.salary);
  const f = (c.fixtures[c.round] ?? []).find((x) => x.result && (x.home === humanClub(c).id || x.away === humanClub(c).id));
  if (f) {
    const mine = f.home === humanClub(c).id ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
    h.happy = clamp(h.happy + (mine[0] > mine[1] ? 2 : mine[0] < mine[1] ? -2 : 0), 0, 100);
  }
  if (h.happy <= 15 && !h.warned) {
    h.warned = true;
    notes.push(tr(`${h.name} grummelt: „So macht das keinen Spaß." Ein Gespräch im Präsidium wäre nicht schlecht.`, `${h.name} grumbles: "This is no fun like this." A word from the president's office would not hurt.`));
  } else if (h.happy > 30) h.warned = false;
  if (h.happy <= 0) {
    releaseHired(c, 'quit');
    chronicle(c, tr(`${h.name} wirft als Trainer hin.`, `${h.name} quits as manager.`));
    notes.push(tr(`${h.name} hat die Nase voll und wirft als Trainer hin. Die Stelle ist frei.`, `${h.name} has had enough and quits as manager. The post is vacant.`));
  }
  return notes;
}

// Saisonende (vor dem Saisonwechsel, nach seasonGoalVerdict): Ziel erreicht oder verfehlt, Angebote von außen.
export function presidentSeasonEnd(c, pos) {
  const h = c.hired;
  if (!isPresident(c) || !h) return [];
  const notes = [];
  const g = c.goal;
  if (g && g.season === c.season) h.happy = clamp(h.happy + (pos <= g.target ? 15 : -20), 0, 100);
  // Ein Meistertrainer mit Namen wird abgeworben (nicht jedes Jahr).
  const rng = createRng(hash(c.seed ?? 0, c.season ?? 1, h.id, 53));
  if (pos <= 2 && h.reputation >= 55 && rng.chance(0.12)) {
    releaseHired(c, 'poached');
    chronicle(c, tr(`${h.name} verlässt den Verein als Trainer – ein größerer Verein hat angeklopft.`, `${h.name} leaves the club as manager – a bigger club came calling.`));
    notes.push(tr(`${h.name} hat ein Angebot von einem größeren Verein und geht als Trainer. Die Stelle ist frei.`, `${h.name} has an offer from a bigger club and leaves as manager. The post is vacant.`));
  }
  return notes;
}

// Faktor auf die Entwicklung der Spieler (career.js, developPlayers): ein guter Trainer holt etwas mehr heraus.
export const hiredGrowth = (c) => (isPresident(c) && c.hired ? 1 + (c.hired.quality - 0.5) * 0.3 : 1);

// Der Trainer macht seine Wochenarbeit (nach startWeek): Taktik, Zusagen, Neuzugänge, Talente aus der Jugend.
// Nutzt dafür eigene Aktionen, die dem Präsidenten nichts wegnehmen.
export function coachWeek(c) {
  if (!isPresident(c) || !c.week) return [];
  const w = c.week;
  const notes = [];
  if (!c.hired) {
    notes.push(tr('Trainerstelle vakant: Bis ein neuer Trainer da ist, stellt der Kapitän auf. Im Präsidium kann man einen verpflichten.', 'Manager post vacant: the captain picks the team until a new manager is in. You can hire one from the president\'s office.'));
    return notes;
  }
  applyCoachTactic(c);
  const club = humanClub(c);
  // Absagen nachfassen (zwei pro Woche, ohne die Anrufe des Präsidenten zu verbrauchen).
  const saved = w.nudges;
  w.nudges = 2;
  for (const idx of club.squad) if (w.availability[idx] === 'no' && w.nudges > 0) nudge(c, idx);
  w.nudges = saved;
  // Kader zu klein: den Besten aus der Jugend holen, sonst jemanden aus dem Umfeld ansprechen.
  const cap = maxSquad(c);
  const want = Math.max(cap - 2, 8);
  if (club.squad.length < want) {
    const prospects = [...(c.youth?.prospects ?? [])].sort((a, b) => playerOf(c, b).rating - playerOf(c, a).rating);
    for (const idx of prospects) {
      if (club.squad.length >= want) break;
      if (playerOf(c, idx).rating >= 40) promoteProspect(c, idx, cap);
    }
  }
  if (club.squad.length < want) {
    const keep = w.actions;
    for (let i = 0; i < (w.rumors ?? []).length && club.squad.length < cap - 1; i++) {
      if (w.rumors[i].status !== 'open') continue;
      w.actions = 1;
      recruit(c, i);
      break; // einer pro Woche
    }
    w.actions = keep;
  }
  return notes;
}
