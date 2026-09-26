// Die Gruppe lebt: Sprüche im Teamchat, und die Antworten haben Folgen. Wer
// dreimal absagt, wird angezählt; wer nach dem Spiel gelobt wird, spielt befreiter;
// wer den Falschen aufzieht, hat einen neuen Rivalen. Manches kocht hoch und wird
// zur Entscheidung für den Trainer (BANTER_EVENTS).
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { book } from './finances.js';
import { humanClub, playerOf } from './career.js';
import { adjustForm, adjustMood } from './events.js';
import { canLose, first, leaveTeam, outcome } from './outcomes.js';
import { isCoach } from './personal.js';
import { relationOf, setRelation } from './relations.js';

const regulars = (c) => humanClub(c).squad.filter((idx) => !isCoach(c, idx) && !playerOf(c, idx).custom);
const clockAt = (day, h, m) => `${day} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const pickText = (rng, list, vars) => rng.pick(list).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const bad = (t) => t === 'rivalen' || t === 'feinde';

// Wie reagiert der Angesprochene? Kumpels lachen, Rivalen nicht.
function mood(c, rng, from, to, spicy) {
  const rel = relationOf(c, from, to);
  if (rel && !bad(rel)) return rng.chance(0.85) ? 'laugh' : 'annoyed';
  if (bad(rel)) return rng.chance(0.3) ? 'annoyed' : 'angry';
  const r = rng.next();
  return r < 0.55 - spicy * 0.3 ? 'laugh' : r < 0.85 - spicy * 0.15 ? 'annoyed' : 'angry';
}

// Beziehung verschieben: lachen verbindet manchmal, Wut entzweit.
function shift(c, rng, a, b, reaction, notes) {
  const rel = relationOf(c, a, b);
  if (reaction === 'laugh' && !rel && rng.chance(0.18)) {
    setRelation(c, a, b, 'kumpel');
    notes.push({ a, b, type: 'kumpel' });
  } else if (reaction === 'angry') {
    if (rel === 'rivalen') {
      setRelation(c, a, b, 'feinde');
      c.flags.chatFeud = { a, b, round: c.round, season: c.season };
    } else if (!bad(rel) && rng.chance(rel ? 0.25 : 0.45)) {
      setRelation(c, a, b, 'rivalen');
      notes.push({ a, b, type: 'rivalen' });
      if (rng.chance(0.5)) c.flags.chatFeud = { a, b, round: c.round, season: c.season };
    }
  }
}

const T = {
  streak: tr(
    ['Du hast jetzt {n}x in Folge abgesagt, {to}. Bist du noch im Verein?', '{to}, {n} Absagen am Stück. Hast du ein Ersatzhobby?', 'Wir haben schon ein Suchplakat für {to} gedruckt. {n} Wochen nicht gesehen.'],
    ['That is {n} no-shows in a row, {to}. Are you still in the club?', '{to}, {n} cancellations on the trot. Found a new hobby?', 'We have printed a missing poster for {to}. Not seen for {n} weeks.'],
  ),
  knee: tr(
    ['{to}, geh endlich mal zum Arzt wegen deiner Knieprobleme.', 'Du humpelst seit Wochen, {to}. Lass das mal anschauen.', '{to}, dein Knie knackt lauter als der Rasensprenger.'],
    ['{to}, go and see a doctor about that knee already.', 'You have been limping for weeks, {to}. Get it looked at.', '{to}, your knee creaks louder than the sprinkler.'],
  ),
  hangover: tr(
    ['Wieder zu viel gesoffen gestern, {to}?', '{to} kommt erst zur zweiten Halbzeit. Lass mich raten: Schützenfest.', 'Ich hab {to} um 3 noch an der Tanke gesehen. Nur so.'],
    ['Too much to drink again last night, {to}?', '{to} only turning up for the second half. Let me guess: village fête.', 'Saw {to} at the petrol station at 3am. Just saying.'],
  ),
  home: tr(
    ['Na, nervt deine Olle wieder, {to}?', '{to} darf nicht. Frau hat Nein gesagt.', 'Grüß mal zuhause, {to}. Vom Pantoffel.'],
    ['Missus giving you grief again, {to}?', '{to} is not allowed. The wife said no.', 'Say hi at home, {to}. From the slipper.'],
  ),
  praise: tr(
    ['Geiles Spiel letzte Woche, {to}!', '{to} hat Sonntag gespielt wie ein junger Gott. Wer hätte das gedacht.', 'Note {grade} im Kreisblatt, {to}. Das hängt bei Oma an der Wand.'],
    ['Cracking game last week, {to}!', '{to} played like a young god on Sunday. Who would have thought.', 'Grade {grade} in the Kreisblatt, {to}. Gran will frame that.'],
  ),
  blame: tr(
    ['Wer hat eigentlich hinten gepennt? Ich sag nur {to}.', '{to}, Sonntag warst du keine Hilfe. Ehrlich.', 'Das {score} geht auf deine Kappe, {to}.'],
    ['Who was asleep at the back? I will just say {to}.', '{to}, you were no help on Sunday. Honestly.', 'That {score} is on you, {to}.'],
  ),
};
const R = {
  laugh: tr(['Haha, erwischt.', 'Ja ja, ist ja gut 😅', 'Touché.', 'Pass auf, sonst erzähl ich was von dir.'], ['Haha, busted.', 'Yeah yeah, alright 😅', 'Touché.', 'Careful, or I will tell them about you.']),
  annoyed: tr(['Muss das hier sein?', 'Ist gut jetzt.', '…'], ['Does this have to be in here?', 'That will do now.', '…']),
  angry: tr(['Halt einfach die Klappe.', 'Sag mir das Sonntag ins Gesicht.', 'Ich bin raus aus der Gruppe. (war er dann doch nicht)'], ['Just shut it.', 'Say that to my face on Sunday.', 'I am out of this group. (He was not.)']),
};

// Einmal pro Woche nach den Zu- und Absagen: zwei bis drei Sprüche.
export function weeklyBanter(c) {
  const w = c.week;
  if (!w) return [];
  c.flags ??= {};
  const rng = createRng((c.seed * 61 + c.season * 997 + c.round * 37 + 5) >>> 0);
  const squad = regulars(c);
  if (squad.length < 3) return [];
  // Absagen-Serien mitzählen.
  for (const idx of squad) {
    const rec = c.players[idx];
    const st = w.availability[idx];
    if (st === 'no' && !(rec.injuryWeeks > 0) && !(rec.awayWeeks > 0)) rec.noStreak = (rec.noStreak ?? 0) + 1;
    else if (st === 'yes' || st === 'late') rec.noStreak = 0;
  }
  const me = humanClub(c).id;
  const last = c.fixtures[c.round - 1]?.find((f) => f.home === me || f.away === me);
  const res = last?.result ? (last.home === me ? [last.result.home, last.result.away] : [last.result.away, last.result.home]) : null;
  const lastGrade = (idx) => (c.players[idx]?.recent ?? []).find((g) => g.round === c.round - 1)?.grade ?? null;

  const cands = [];
  for (const idx of squad) {
    const rec = c.players[idx];
    const p = playerOf(c, idx);
    const st = w.availability[idx];
    if ((rec.noStreak ?? 0) >= 3) cands.push({ kind: 'streak', to: idx, w: 5, spicy: 0.5 });
    if (st === 'late') cands.push({ kind: 'hangover', to: idx, w: 2, spicy: 0.3 });
    if (st === 'no' && p.age >= 26 && !(rec.injuryWeeks > 0)) cands.push({ kind: 'home', to: idx, w: 0.8, spicy: 0.7 });
    if (!(rec.injuryWeeks > 0) && (p.age >= 33 || rec.injury) && rec.doctor == null) cands.push({ kind: 'knee', to: idx, w: 0.7, spicy: 0.1 });
    const g = lastGrade(idx);
    if (g != null && g <= 2.2) cands.push({ kind: 'praise', to: idx, w: 3, spicy: 0, grade: g });
    if (g != null && g >= 4.5 && res && res[0] < res[1]) cands.push({ kind: 'blame', to: idx, w: 2.5, spicy: 0.8 });
  }
  const said = [];
  const notes = [];
  const n = Math.min(cands.length, rng.chance(0.4) ? 3 : 2);
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  for (let k = 0; k < n; k++) {
    const total = cands.reduce((s, x) => s + x.w, 0);
    let r = rng.next() * total;
    const pick = cands.find((x) => (r -= x.w) < 0) ?? cands[0];
    cands.splice(cands.indexOf(pick), 1);
    if (said.some((s) => s.to === pick.to)) continue;
    const others = squad.filter((i) => i !== pick.to);
    // Wer frotzelt? Gern ein Rivale, beim Lob gern ein Kumpel.
    const pref = others.filter((i) => (pick.kind === 'praise' ? relationOf(c, i, pick.to) && !bad(relationOf(c, i, pick.to)) : bad(relationOf(c, i, pick.to))));
    const from = rng.pick(pref.length && rng.chance(0.6) ? pref : others);
    const day = days[Math.min(days.length - 1, k + 1)];
    const vars = { to: first(c, pick.to), n: c.players[pick.to].noStreak, grade: pick.grade?.toFixed(1).replace('.', ','), score: res ? `${res[0]}:${res[1]}` : '' };
    w.chat.push({ from, text: pickText(rng, T[pick.kind], vars), time: clockAt(day, 20 + k, 10 + rng.int(0, 45)), banter: pick.kind });
    const reaction = pick.kind === 'praise' ? 'laugh' : mood(c, rng, from, pick.to, pick.spicy);
    const reply = pick.kind === 'praise' ? tr(rng.pick(['Danke, Männer! 🙏', 'Hab ich immer gesagt.', 'Nächste Woche wieder.']), rng.pick(['Cheers, lads! 🙏', 'Always said so.', 'Same again next week.'])) : rng.pick(R[reaction]);
    w.chat.push({ from: pick.to, text: reply, time: clockAt(day, 20 + k, 50 + rng.int(0, 9)), banter: pick.kind });
    applyBanter(c, rng, pick, from, reaction, notes);
    said.push({ ...pick, from, reaction });
  }
  // Nachschlag: Wer letzte Woche zum Arzt sollte, meldet sich.
  for (const idx of squad) {
    const rec = c.players[idx];
    if (rec.doctor !== c.round) continue;
    rec.doctor = -1;
    const r = rng.next();
    let text;
    if (r < 0.55) {
      adjustForm(c, idx, 0.1);
      text = tr('War beim Doc. Nur Überlastung, Salbe drauf, weiter geht’s.', 'Saw the doc. Just overuse, rub some cream on it, carry on.');
    } else if (r < 0.85) {
      rec.injuryWeeks = Math.max(rec.injuryWeeks ?? 0, 2);
      rec.injury = { type: 'meniskus', label: tr('Reizung im Knie', 'irritated knee'), weeks: 2 };
      w.availability[idx] = 'no';
      text = tr('Doc sagt: zwei Wochen Pause, sonst ist der Meniskus hin. Gut, dass ich hin bin.', 'Doc says two weeks off or the meniscus goes. Good thing I went.');
    } else text = tr('Arzt hatte keinen Termin frei. Geht schon so.', 'The doctor had no appointments. It will be fine.');
    w.chat.push({ from: idx, text, time: 'Di 18:05', banter: 'doctor' });
  }
  w.banter = said;
  return said;
}

function applyBanter(c, rng, pick, from, reaction, notes) {
  const rec = c.players[pick.to];
  switch (pick.kind) {
    case 'praise':
      adjustForm(c, pick.to, 0.08);
      if (!relationOf(c, from, pick.to) && rng.chance(0.2)) setRelation(c, from, pick.to, 'kumpel');
      break;
    case 'streak':
      if (reaction === 'laugh') rec.absenceMul = Math.max(0.7, (rec.absenceMul ?? 1) * 0.8); // peinlich – nächste Woche ist er da
      else if (reaction === 'angry') rec.grumpy = 2;
      c.flags.dauerabsager = { idx: pick.to, round: c.round, season: c.season };
      break;
    case 'knee':
      if (reaction !== 'angry') rec.doctor = c.round + 1;
      break;
    case 'blame':
      adjustForm(c, pick.to, reaction === 'laugh' ? 0.03 : -0.08);
      if (reaction !== 'laugh') adjustMood(c, -0.02);
      break;
    case 'home':
      if (reaction === 'angry') adjustMood(c, -0.02);
      break;
    default:
      break;
  }
  shift(c, rng, from, pick.to, reaction, notes);
}

// Wenn es im Chat hochkocht, muss der Trainer ran.
export const BANTER_EVENTS = {
  chat_zoff: {
    weight: 40,
    needs: (c) => {
      const f = c.flags?.chatFeud;
      if (!f || f.round !== c.round || f.season !== c.season) return null;
      const sq = humanClub(c).squad;
      return sq.includes(f.a) && sq.includes(f.b) ? { a: f.a, b: f.b } : null;
    },
    text: (c, ctx) => tr(`Im Teamchat fliegen die Fetzen: ${first(c, ctx.a)} und ${first(c, ctx.b)} gehen sich seit gestern Abend an. 47 neue Nachrichten, drei davon mit Großbuchstaben.`, `The team chat is on fire: ${first(c, ctx.a)} and ${first(c, ctx.b)} have been at each other since last night. 47 new messages, three of them in capitals.`),
    options: [
      {
        label: tr('Machtwort in der Gruppe', 'Lay down the law in the group'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (setRelation(c, ctx.a, ctx.b, 'rivalen'), adjustMood(c, 0.03), tr('„Schluss jetzt. Geklärt wird das auf dem Platz." Es wird still. Freunde werden die beiden nicht, aber es knallt nicht mehr.', '"Enough. Sort it out on the pitch." Silence. They will not be friends, but it stops.')) },
          { w: 1.5, run: (c) => (adjustMood(c, -0.03), tr('Jetzt sind beide auf dich sauer. Immerhin: Sie sind sich mal einig.', 'Now both are angry with you. At least they agree on something.')) },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.b) ? tr(`${first(c, ctx.b)} verlässt die Gruppe. Und den Verein.`, `${first(c, ctx.b)} leaves the group. And the club.`) : tr('Es wird still.', 'It goes quiet.')) },
        ]),
      },
      {
        label: tr('Beide zum Bier einladen (15 €)', 'Take both for a beer (€15)'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, tr('Friedensbier', 'Peace beer'), -15), setRelation(c, ctx.a, ctx.b, null), adjustMood(c, 0.04), tr('Nach zwei Bier lachen sie über den Chatverlauf. Streit beigelegt.', 'After two beers they are laughing at the chat history. Feud settled.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Friedensbier', 'Peace beer'), -15), setRelation(c, ctx.a, ctx.b, 'kumpel'), adjustMood(c, 0.06), tr('Es stellt sich raus: Beide hassen denselben Schiri. Beste Freunde.', 'Turns out they both hate the same referee. Best friends now.')) },
          { w: 1, run: (c) => (book(c, tr('Friedensbier', 'Peace beer'), -15), tr('Sie sitzen an zwei Enden des Tresens. 15 € für nichts.', 'They sit at opposite ends of the bar. €15 for nothing.')) },
        ]),
      },
      {
        label: tr('Gruppe stummschalten', 'Mute the group'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.04), tr('Die Gruppe eskaliert ohne dich weiter. Sonntag ist die Stimmung im Keller.', 'The group escalates without you. By Sunday the mood is in the cellar.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.a].injuryWeeks = Math.max(c.players[ctx.a].injuryWeeks ?? 0, 1)), tr(`Beim Training grätscht ${first(c, ctx.b)} ${first(c, ctx.a)} um. Eine Woche Pause.`, `At training ${first(c, ctx.b)} slides into ${first(c, ctx.a)}. A week out.`)) },
          { w: 1, run: () => tr('Am Donnerstag ist alles vergessen. Männer.', 'By Thursday it is all forgotten. Men.') },
        ]),
      },
    ],
  },
  dauerabsager: {
    weight: 30,
    needs: (c) => {
      const f = c.flags?.dauerabsager;
      if (!f || f.round !== c.round || f.season !== c.season || !humanClub(c).squad.includes(f.idx)) return null;
      return { idx: f.idx, n: c.players[f.idx].noStreak ?? 3 };
    },
    text: (c, ctx) => tr(`${first(c, ctx.idx)} hat jetzt ${ctx.n}x in Folge abgesagt. In der Gruppe wird schon gelästert. Was machst du?`, `${first(c, ctx.idx)} has now cried off ${ctx.n} times in a row. The group is already talking. What do you do?`),
    options: [
      {
        label: tr('Anrufen und nachfragen', 'Call and ask'),
        effect: outcome([
          { w: 2, run: (c, ctx) => ((c.players[ctx.idx].absenceMul = 0.7), adjustForm(c, ctx.idx, 0.1), tr(`Stress auf der Arbeit, aber er freut sich über den Anruf. „Sonntag bin ich da. Versprochen."`, `Stress at work, but he appreciates the call. "I will be there Sunday. Promise."`)) },
          { w: 1.5, run: (c, ctx) => ((c.players[ctx.idx].absenceMul = 1.3), (c.players[ctx.idx].loyal = true), tr('Das Baby zahnt, er schläft nicht. Er kommt seltener – aber er bleibt dem Verein treu.', 'The baby is teething, he does not sleep. He will come less often – but he stays loyal.')) },
          { w: (c) => (canLose(c) ? 1 : 0), run: (c, ctx) => (leaveTeam(c, ctx.idx) ? tr('Er druckst herum: Eigentlich hat er keine Lust mehr. Er hört auf.', 'He hems and haws: he has lost interest. He is packing it in.') : tr('Er druckst herum.', 'He hems and haws.')) },
        ]),
      },
      {
        label: tr('Öffentlich Ansage in der Gruppe', 'Call him out in the group'),
        effect: outcome([
          { w: 2, run: (c, ctx) => ((c.players[ctx.idx].absenceMul = 0.8), adjustMood(c, 0.03), tr('Die Gruppe applaudiert mit Daumen. Er ist Sonntag da – mit Kuchen.', 'The group thumbs-ups the message. He turns up on Sunday – with cake.')) },
          { w: 1.5, run: (c, ctx) => ((c.players[ctx.idx].grumpy = 3), (c.players[ctx.idx].absenceMul = 1.5), tr('Er fühlt sich vorgeführt. Jetzt kommt er erst recht nicht.', 'He feels humiliated. Now he definitely will not come.')) },
          { w: (c) => (canLose(c) ? 0.8 : 0), run: (c, ctx) => (leaveTeam(c, ctx.idx) ? tr('„Dann eben nicht." Er verlässt Gruppe und Verein.', '"Fine then." He leaves the group and the club.') : tr('Er schweigt.', 'He says nothing.')) },
        ]),
      },
      {
        label: tr('Laufen lassen', 'Let it go'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.03), tr('Die anderen fragen sich, warum sie eigentlich jeden Sonntag kommen.', 'The others wonder why they bother turning up every Sunday.')) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.idx].absenceMul = 0.9), tr('Von allein kommt er zurück. Ohne Erklärung. Hauptsache da.', 'He comes back on his own. No explanation. At least he is here.')) },
        ]),
      },
    ],
  },
};
