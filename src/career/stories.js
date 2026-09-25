// Lebensgeschichten: mehrwöchige Ketten aus Ereignissen. Eine Geschichte startet wie ein
// normales Wochen-Ereignis, läuft dann Woche für Woche weiter und kann unterwegs neue
// Entscheidungen verlangen.
import { tr } from '../core/i18n.js';
import { jobName } from '../data/names.js';
import { POSITIONS } from '../sim/generator.js';
import { book, MEMBER_FEE } from './finances.js';
import { clubById, getPool, humanClub, joinSquad, maxSquad, playerOf, releasePlayer } from './career.js';
import { adjustForm, adjustMood } from './events.js';

const first = (c, idx) => playerOf(c, idx).name.split(' ')[0];
const inSquad = (c, idx) => humanClub(c).squad.includes(idx);
const say = (c, from, text, time) => c.week?.chat.push({ from, text, time });
const rec = (c, idx) => c.players[idx];

const CITIES = ['Hannover', 'Kassel', 'Bielefeld', 'Würzburg', 'Osnabrück', 'Erfurt'];
// Berufe bleiben intern deutsch; die Anzeige übersetzt jobName().
const NEW_JOBS = ['Lagerlogistiker', 'Hausmeister', 'Fahrer beim Getränkehandel', 'Verkäufer im Baumarkt', 'Sachbearbeiter'];
const GRAD_JOBS = ['Junior-Ingenieur', 'Trainee bei der Sparkasse', 'Softwareentwickler', 'Referendar'];
const NO_JOB_CUT = /^(Schüler|Student|Azubi|Frührentner|Rentner|Arbeitssuchend|FSJ)/;

// Laufende Geschichten liegen in career.arcs: { uid, id, idx, step, t, data }.
export const arcsOf = (c) => (c.arcs ??= []);
export const busyWithStory = (c, idx) => arcsOf(c).some((a) => a.idx === idx);
const findArc = (c, uid) => arcsOf(c).find((a) => a.uid === uid);

export function startStory(c, id, idx, data = {}) {
  const arc = { uid: `${id}-${idx}-${c.season}-${c.round}`, id, idx, step: 0, t: 0, data };
  arcsOf(c).push(arc);
  return arc;
}

// Spieler aus dem eigenen Kader, der gerade in keiner Geschichte steckt.
function subject(c, rng, filter = () => true) {
  const list = humanClub(c).squad.filter((idx) => !busyWithStory(c, idx) && filter(playerOf(c, idx), idx));
  return list.length ? rng.pick(list) : null;
}

export const STORIES = {
  vater: {
    label: (c, a) => tr(`${first(c, a.idx)} wird Papa`, `${first(c, a.idx)} is becoming a dad`),
    start: {
      weight: 1,
      needs: (c, rng) => {
        const s = subject(c, rng, (p) => p.age >= 24 && p.age <= 40);
        return s == null ? null : { s };
      },
      text: (c, ctx) => tr(`${first(c, ctx.s)} hat eine Nachricht mit Ultraschallbild geschickt: „Ich werde Papa!!"`, `${first(c, ctx.s)} has sent a message with an ultrasound picture: "I'm going to be a dad!!"`),
      options: [
        {
          label: tr('Blumen und eine Karte vom Team (15 €)', 'Flowers and a card from the team (€15)'),
          effect: (c, ctx) => {
            book(c, tr('Blumen für den werdenden Papa', 'Flowers for the dad-to-be'), -15);
            adjustMood(c, 0.1);
            startStory(c, 'vater', ctx.s);
            return tr('Alle freuen sich mit. In ein paar Wochen ist es so weit.', 'Everyone is delighted for him. In a few weeks it will be time.');
          },
        },
        {
          label: tr('Spontane Party im Vereinsheim (30 €)', 'Impromptu party at the clubhouse (€30)'),
          effect: (c, ctx) => {
            book(c, tr('Party für den werdenden Papa', 'Party for the dad-to-be'), -30);
            adjustMood(c, 0.15);
            adjustForm(c, ctx.s, -0.4);
            startStory(c, 'vater', ctx.s);
            return tr('Große Sause. Der werdende Papa hat danach sicherheitshalber Wasser getrunken. Ab Runde drei.', 'Big bash. To be on the safe side, the dad-to-be switched to water. From round three.');
          },
        },
      ],
    },
    steps: [
      {
        after: 2,
        run: (c, a) => {
          c.week.availability[a.idx] = 'no';
          const baby = tr(['Es ist ein Mädchen!!! 3.480 g', 'Es ist ein Junge!!! 3.720 g', 'ZWILLINGE!!! Ein Mädchen und ein Junge'], ["It's a girl!!! 3.48 kg", "It's a boy!!! 3.72 kg", 'TWINS!!! A girl and a boy'])[a.idx % 3];
          say(c, a.idx, tr(`${baby}, alle gesund. Bin Sonntag natürlich raus.`, `${baby}, everyone healthy. Obviously I'm out on Sunday.`), 'Mi 04:12');
          adjustMood(c, 0.1);
        },
      },
      {
        after: 1,
        run: (c, a) => {
          adjustForm(c, a.idx, -0.4);
          say(c, a.idx, tr('Bin wieder dabei. Habe seit einer Woche nicht geschlafen, aber egal. Kinderwagen steht am Spielfeldrand.', "I'm back. Haven't slept for a week, but whatever. The pram is parked on the touchline."), 'Do 22:40');
        },
      },
    ],
  },

  umzug: {
    label: (c, a) => tr(`${first(c, a.idx)} pendelt aus ${a.data.city}`, `${first(c, a.idx)} commutes from ${a.data.city}`),
    start: {
      weight: 1,
      needs: (c, rng) => {
        if (c.round < 1) return null;
        const s = subject(c, rng, (p) => p.age >= 22 && p.age <= 45 && !NO_JOB_CUT.test(p.profession));
        return s == null ? null : { s, city: CITIES[s % CITIES.length] };
      },
      text: (c, ctx) => tr(`${first(c, ctx.s)} hat einen neuen Job in ${ctx.city}, 90 km weg. „Ich würd ja gern weiter mitspielen …"`, `${first(c, ctx.s)} has a new job in ${ctx.city}, 90 km away. "I'd really like to keep playing …"`),
      options: [
        {
          label: tr('Fahrgeld aus der Kasse (10 €/Woche)', 'Petrol money from the kitty (€10/week)'),
          effect: (c, ctx) => {
            rec(c, ctx.s).absenceMul = 1.6;
            startStory(c, 'umzug', ctx.s, { city: ctx.city, paid: true });
            return tr(`${first(c, ctx.s)} pendelt, die Kasse zahlt den Sprit. Er kommt, so oft es geht.`, `${first(c, ctx.s)} commutes, the kitty pays for petrol. He comes as often as he can.`);
          },
        },
        {
          label: tr('Schweren Herzens verabschieden', 'Say goodbye with a heavy heart'),
          effect: (c, ctx) => {
            adjustMood(c, -0.05);
            if (releasePlayer(c, ctx.s)) return tr('Abschied mit Kasten Bier. Er bekommt ein signiertes Trikot mit.', 'A farewell with a crate of beer. He gets a signed shirt to take with him.');
            rec(c, ctx.s).absenceMul = 3;
            startStory(c, 'umzug', ctx.s, { city: ctx.city });
            return tr('Ohne ihn wären wir zu wenige – er pendelt vorerst doch.', 'Without him we would be too few – he commutes for now after all.');
          },
        },
        {
          label: tr('Pendeln – wir zählen auf dich', 'Commute – we are counting on you'),
          effect: (c, ctx) => {
            rec(c, ctx.s).absenceMul = 3;
            startStory(c, 'umzug', ctx.s, { city: ctx.city });
            return tr('Er versucht es. Sonntags früh um sieben auf der Autobahn – mal sehen, wie lange.', 'He gives it a go. Seven on a Sunday morning on the motorway – we will see how long for.');
          },
        },
      ],
    },
    weekly: (c, a) => {
      if (a.data.paid) book(c, tr(`Fahrgeld ${first(c, a.idx)} (${a.data.city})`, `Petrol money ${first(c, a.idx)} (${a.data.city})`), -10);
    },
    steps: [
      {
        after: 4,
        decision: {
          text: (c, a) => tr(`${first(c, a.idx)}: „Die Pendelei macht mich fertig. Jeden Sonntag 180 km für 60 Minuten Kick …"`, `${first(c, a.idx)}: "The commuting is killing me. 180 km every Sunday for 60 minutes of football …"`),
          options: [
            {
              label: tr('Fahrgemeinschaft organisieren', 'Organise a car share'),
              effect: (c, a) => {
                rec(c, a.idx).absenceMul = 1.3;
                adjustMood(c, 0.04);
                return tr('Er fährt jetzt mit einem Kumpel, der eh in die Richtung muss. Klappt besser.', 'He now rides with a mate who goes that way anyway. Works better.');
              },
            },
            {
              label: tr('Du musst dich entscheiden', 'You have to decide'),
              effect: (c, a, rng) => {
                if (rng.chance(0.5) && releasePlayer(c, a.idx)) {
                  a.done = true;
                  return tr('Er entscheidet sich für die Ruhe. Abschied per Sprachnachricht.', 'He chooses peace and quiet. Goodbye by voice message.');
                }
                rec(c, a.idx).absenceMul = 1.2;
                adjustForm(c, a.idx, 0.4);
                return tr('„Dann komm ich halt jeden Sonntag." Und er meint es ernst.', '"Then I\'ll just come every Sunday." And he means it.');
              },
            },
            { label: tr('Weiter wie bisher', 'Carry on as before'), effect: () => tr('Er pendelt weiter. Manchmal.', 'He keeps commuting. Sometimes.') },
          ],
        },
      },
      {
        after: 3,
        run: (c, a, rng) => {
          if (!rng.chance(0.3)) return;
          rec(c, a.idx).absenceMul = 1;
          say(c, a.idx, tr(`Die Firma macht den Standort in ${a.data.city} zu – ich werd zurückversetzt! Bin wieder ganz da.`, `The company is closing the ${a.data.city} site – I'm being moved back! I'm fully back.`), 'Fr 17:30');
          adjustMood(c, 0.06);
          a.data.paid = false;
        },
      },
    ],
  },

  jobverlust: {
    label: (c, a) => tr(`${first(c, a.idx)} sucht Arbeit`, `${first(c, a.idx)} is looking for work`),
    start: {
      weight: 1,
      needs: (c, rng) => {
        if (c.round < 2) return null;
        const s = subject(c, rng, (p) => p.age >= 20 && p.age <= 60 && !NO_JOB_CUT.test(p.profession));
        return s == null ? null : { s, job: playerOf(c, s).profession };
      },
      text: (c, ctx) => tr(`Schlechte Nachricht von ${first(c, ctx.s)} (${ctx.job}): Die Firma hat dichtgemacht. Er ist ab sofort arbeitslos.`, `Bad news from ${first(c, ctx.s)} (${jobName(ctx.job)}): the company has shut down. He is out of work as of now.`),
      options: [
        {
          label: tr('Team hört sich um', 'The team asks around'),
          effect: (c, ctx) => {
            Object.assign(rec(c, ctx.s), { job: 'Arbeitssuchend', absenceMul: 0.3 });
            adjustForm(c, ctx.s, -0.2);
            startStory(c, 'jobverlust', ctx.s, { help: true });
            return tr('Alle fragen in ihren Firmen nach. Immerhin hat er jetzt sonntags immer Zeit.', 'Everyone asks at their own companies. At least he always has time on Sundays now.');
          },
        },
        {
          label: tr('Mitgliedsbeitrag erlassen, bis er was hat', 'Waive his membership fee until he finds something'),
          effect: (c, ctx) => {
            Object.assign(rec(c, ctx.s), { job: 'Arbeitssuchend', absenceMul: 0.3 });
            adjustMood(c, 0.06);
            startStory(c, 'jobverlust', ctx.s, { help: true, feeFree: true });
            return tr('Kleine Geste, große Wirkung. Die Gruppe findet das stark.', 'Small gesture, big impact. The group thinks it is a great move.');
          },
        },
        {
          label: tr('„Kopf hoch, wird schon"', '"Chin up, it\'ll work out"'),
          effect: (c, ctx) => {
            Object.assign(rec(c, ctx.s), { job: 'Arbeitssuchend', absenceMul: 0.3 });
            adjustForm(c, ctx.s, -0.4);
            startStory(c, 'jobverlust', ctx.s, { help: false });
            return tr('Er nickt. Viel mehr kommt nicht.', 'He nods. Not much more than that.');
          },
        },
      ],
    },
    weekly: (c, a) => {
      if (a.data.feeFree && rec(c, a.idx)?.job === 'Arbeitssuchend') book(c, tr(`Beitrag erlassen (${first(c, a.idx)})`, `Fee waived (${first(c, a.idx)})`), -MEMBER_FEE);
    },
    steps: [
      {
        after: 3,
        decision: {
          text: (c, a) => {
            const where = c.sponsors?.[0]?.name ?? tr('Der Wirt vom Vereinsheim', 'The clubhouse landlord');
            return tr(`${where} sucht jemanden – anpacken, zuverlässig, gern sofort. Sollen wir ${first(c, a.idx)} empfehlen?`, `${where} is looking for someone – hands-on, reliable, ideally right away. Shall we recommend ${first(c, a.idx)}?`);
          },
          options: [
            {
              label: tr('Klar, wir empfehlen ihn', 'Of course, we recommend him'),
              effect: (c, a, rng) => {
                const sponsor = c.sponsors?.[0]?.name;
                Object.assign(rec(c, a.idx), { job: sponsor ? `Aushilfe bei ${sponsor}` : 'Aushilfe im Vereinsheim', absenceMul: 1 });
                adjustMood(c, a.data.help ? 0.1 : 0.06);
                adjustForm(c, a.idx, 0.5);
                a.done = true;
                return rng.chance(0.5) ? tr('Er hat den Job! Die erste Runde nach dem Training geht auf ihn.', 'He got the job! The first round after training is on him.') : tr('Genommen! Er schickt ein Foto in Arbeitsklamotten.', 'Hired! He sends a photo in his work clothes.');
              },
            },
            { label: tr('Er soll selbst suchen', 'He should look himself'), effect: () => tr('Er schreibt weiter Bewerbungen.', 'He keeps sending off applications.') },
          ],
        },
      },
      {
        after: 2,
        run: (c, a, rng) => {
          if (rec(c, a.idx)?.job !== 'Arbeitssuchend') return;
          const job = rng.pick(NEW_JOBS);
          Object.assign(rec(c, a.idx), { job, absenceMul: 1 });
          say(c, a.idx, tr(`Ich hab was! Ab Montag ${job}. Endlich wieder Struktur.`, `I've got something! Starting Monday as ${jobName(job)}. Finally some structure again.`), 'Di 12:05');
          adjustMood(c, 0.05);
        },
      },
    ],
  },

  comeback: {
    label: (c, a) => tr(`Comeback von ${playerOf(c, a.idx).name.split(' ')[0]}`, `${playerOf(c, a.idx).name.split(' ')[0]}'s comeback`),
    start: {
      weight: 1,
      needs: (c, rng) => {
        if (c.round < 2 || humanClub(c).squad.length >= maxSquad(c)) return null;
        const pool = getPool();
        const taken = new Set([...c.clubs.flatMap((x) => x.squad), ...(c.youth?.prospects ?? []), ...(c.alumni ?? []).map((a) => a.idx), ...arcsOf(c).map((a) => a.idx)]);
        for (let i = 0; i < 60; i++) {
          const p = pool.get(rng.int(0, pool.size - 1));
          if (!taken.has(p.poolIndex) && p.age >= 29 && p.age <= 38 && ['gut', 'stark', 'dorfstar'].includes(p.tier)) return { s: p.poolIndex };
        }
        return null;
      },
      text: (c, ctx) => {
        const p = playerOf(c, ctx.s);
        return tr(`${p.name} (${p.age}, ${p.position}) hat nach einem Kreuzbandriss zwei Jahre pausiert. Er will es nochmal wissen – bei euch.`, `${p.name} (${p.age}, ${POSITIONS[p.position] ?? p.position}) has been out for two years after a cruciate ligament tear. He wants one more go – with you.`);
      },
      options: [
        {
          label: tr('Aufbautraining mit dem Physio (20 €)', 'Rehab training with the physio (€20)'),
          effect: (c, ctx) => {
            book(c, tr('Physio: Aufbautraining Comeback', 'Physio: comeback rehab'), -20);
            startStory(c, 'comeback', ctx.s, { external: true });
            return tr('Zwei Wochen Reha-Programm, dann ist er dabei.', 'Two weeks of rehab, then he is in.');
          },
        },
        {
          label: tr('Soll direkt einsteigen', 'He should start straight away'),
          effect: (c, ctx) => {
            if (!joinSquad(c, ctx.s, tr('Knie ist getapet, ich bin dabei!', 'Knee is strapped up, I\'m in!'))) return tr('Der Kader ist inzwischen voll.', 'The squad is full by now.');
            adjustForm(c, ctx.s, -0.6);
            startStory(c, 'comeback', ctx.s, { rushed: true });
            return tr('Er ist sofort dabei. Etwas eingerostet – und das Knie ist noch nicht ganz stabil.', 'He is in straight away. A bit rusty – and the knee is not quite stable yet.');
          },
        },
        { label: tr('Kein Bedarf', 'Not needed'), effect: () => tr('Er versucht sein Glück woanders.', 'He tries his luck elsewhere.') },
      ],
    },
    steps: [
      {
        after: 2,
        run: (c, a, rng) => {
          if (a.data.rushed) {
            if (inSquad(c, a.idx) && rng.chance(0.4)) {
              rec(c, a.idx).injuryWeeks = 2;
              c.week.availability[a.idx] = 'no';
              say(c, a.idx, tr('Knie zwickt wieder. Der Doc sagt: zwei Wochen Pause. Hätte ich mal Reha gemacht …', 'Knee is twinging again. The doc says: two weeks out. Should have done the rehab …'), 'Mo 19:40');
            }
            return;
          }
          if (joinSquad(c, a.idx, tr('Knie hält! Der Physio hat mich freigegeben – ich bin bereit.', 'The knee is holding! The physio has cleared me – I\'m ready.'))) adjustForm(c, a.idx, 0.6);
        },
      },
    ],
  },

  abschluss: {
    label: (c, a) => tr(`${first(c, a.idx)} schreibt die Abschlussarbeit`, `${first(c, a.idx)} is writing his dissertation`),
    start: {
      weight: 1,
      needs: (c, rng) => {
        const s = subject(c, rng, (p) => p.profession.startsWith('Student'));
        return s == null ? null : { s };
      },
      text: (c, ctx) => tr(`${first(c, ctx.s)} muss in drei Wochen seine Abschlussarbeit abgeben. „Kann sein, dass ich ein paar Mal fehle."`, `${first(c, ctx.s)} has to hand in his dissertation in three weeks. "I might miss a few games."`),
      options: [
        {
          label: tr('Uni geht vor – viel Erfolg!', 'University comes first – good luck!'),
          effect: (c, ctx) => {
            rec(c, ctx.s).absenceMul = 2.5;
            startStory(c, 'abschluss', ctx.s);
            return tr('Er taucht erstmal ab. Die Bibliothek hat sonntags zum Glück zu.', 'He goes off the radar for now. Luckily the library is closed on Sundays.');
          },
        },
        {
          label: tr('Fußball ist die beste Pause', 'Football is the best break'),
          effect: (c, ctx) => {
            rec(c, ctx.s).absenceMul = 1.3;
            adjustForm(c, ctx.s, -0.3);
            startStory(c, 'abschluss', ctx.s, { stress: true });
            return tr('Er kommt – mit Augenringen und Karteikarten in der Sporttasche.', 'He comes – with bags under his eyes and revision cards in his kit bag.');
          },
        },
      ],
    },
    steps: [
      {
        after: 3,
        decision: {
          text: (c, a) => tr(`${first(c, a.idx)}: „BESTANDEN!!! 1,${a.data.stress ? 9 : 3}!" – nach ${a.idx % 5 + 9} Semestern.`, `${first(c, a.idx)}: "PASSED!!! ${a.data.stress ? 'A 2:1' : 'A first'}!" – after ${a.idx % 5 + 9} semesters.`),
          options: [
            {
              label: tr('Party im Vereinsheim (25 €)', 'Party at the clubhouse (€25)'),
              effect: (c, a, rng) => {
                book(c, tr(`Abschlussparty ${first(c, a.idx)}`, `Graduation party ${first(c, a.idx)}`), -25);
                adjustMood(c, 0.12);
                adjustForm(c, a.idx, -0.3);
                return graduate(c, a, rng, tr('Legendär. Irgendwann lief „Atemlos" – dreimal.', 'Legendary. At some point the same Schlager hit came on – three times.'));
              },
            },
            { label: tr('Glückwunsch in der Gruppe', 'Congratulations in the group chat'), effect: (c, a, rng) => (adjustMood(c, 0.03), graduate(c, a, rng, tr('Daumen hoch, Konfetti-Emojis.', 'Thumbs up, confetti emojis.'))) },
          ],
        },
      },
    ],
  },

  hochzeit: {
    label: (c, a) => tr(`${first(c, a.idx)} heiratet`, `${first(c, a.idx)} is getting married`),
    start: {
      weight: 1,
      needs: (c, rng) => {
        if (c.round + 3 >= c.fixtures.length) return null;
        const s = subject(c, rng, (p) => p.age >= 25 && p.age <= 45);
        return s == null ? null : { s };
      },
      text: (c, ctx) => tr(`${first(c, ctx.s)} heiratet in drei Wochen – am Samstag. Sonntag danach? „Eher schwierig."`, `${first(c, ctx.s)} is getting married in three weeks – on a Saturday. The Sunday after? "Tricky."`),
      options: [
        {
          label: tr('Polterabend mit dem ganzen Team!', 'Stag do with the whole team!'),
          effect: (c, ctx) => (adjustMood(c, 0.06), startStory(c, 'hochzeit', ctx.s, { polter: true }), tr('Die Planung läuft. Einer hat schon Porzellan vom Flohmarkt organisiert.', 'Planning is under way. Someone has already got hold of crockery from the flea market for smashing.')),
        },
        {
          label: tr('Geschenk vom Team (30 €)', 'A present from the team (€30)'),
          effect: (c, ctx) => (book(c, tr(`Hochzeitsgeschenk ${first(c, ctx.s)}`, `Wedding present ${first(c, ctx.s)}`), -30), adjustMood(c, 0.04), startStory(c, 'hochzeit', ctx.s), tr('Ein Gutschein fürs Möbelhaus. Romantisch.', 'A furniture store voucher. Romantic.')),
        },
        { label: tr('Herzlichen Glückwunsch!', 'Congratulations!'), effect: (c, ctx) => (startStory(c, 'hochzeit', ctx.s), tr('Er freut sich.', 'He is pleased.')) },
      ],
    },
    steps: [
      {
        after: 3,
        run: (c, a) => {
          c.week.availability[a.idx] = 'no';
          say(c, a.idx, tr('Wir haben JA gesagt!!! Sonntag bin ich raus, aber nächste Woche wieder da.', 'We said YES!!! Out on Sunday, but back next week.'), 'Sa 23:50');
          adjustMood(c, 0.08);
          if (!a.data.polter) return;
          for (const idx of humanClub(c).squad) if (c.week.availability[idx] === 'yes') adjustForm(c, idx, -0.5);
          const other = humanClub(c).squad.find((idx) => idx !== a.idx && c.week.availability[idx] === 'yes');
          if (other != null) say(c, other, tr('Polterabend war legendär. Ich seh immer noch doppelt. Sonntag wird hart.', 'The stag do was legendary. I\'m still seeing double. Sunday is going to be tough.'), 'So 09:12');
          adjustMood(c, 0.1);
        },
      },
      { after: 1, run: (c, a) => (adjustForm(c, a.idx, 0.4), say(c, a.idx, tr('Frisch verheiratet und voll motiviert. Flitterwochen erst im Sommer.', 'Newly married and fully motivated. Honeymoon not until the summer.'), 'Mo 18:02')) },
    ],
  },

  bruder: {
    label: (c, a) => tr(`Bruderduell gegen ${clubById(c, a.data.club)?.short ?? '?'}`, `Brother against brother vs ${clubById(c, a.data.club)?.short ?? '?'}`),
    start: {
      weight: 1,
      needs: (c, rng) => {
        const me = humanClub(c).id;
        const ahead = c.fixtures.slice(c.round + 1).flat().filter((f) => f.home === me || f.away === me);
        if (!ahead.length || arcsOf(c).some((a) => a.id === 'bruder')) return null;
        const f = rng.pick(ahead);
        const s = subject(c, rng);
        return s == null ? null : { s, club: f.home === me ? f.away : f.home };
      },
      text: (c, ctx) => tr(`${first(c, ctx.s)}s Bruder hat bei ${clubById(c, ctx.club).name} unterschrieben. Beim Familienessen wird es still.`, `${first(c, ctx.s)}'s brother has signed for ${clubById(c, ctx.club).name}. The family dinner goes quiet.`),
      options: [
        { label: tr('Wette: Verlierer zahlt eine Kiste', 'Bet: the loser buys a crate'), effect: (c, ctx) => (startStory(c, 'bruder', ctx.s, { club: ctx.club, bet: true }), tr('Die Wette gilt. Die Mutter kommt zum Spiel – mit zwei Schals.', 'The bet is on. Their mum is coming to the game – with two scarves.')) },
        { label: tr('Familie ist Familie', 'Family is family'), effect: (c, ctx) => (startStory(c, 'bruder', ctx.s, { club: ctx.club }), tr('Er nimmt es gelassen. Sagt er.', 'He is taking it calmly. So he says.')) },
      ],
    },
    steps: [
      {
        // Wartet, bis der Bruder-Verein der Gegner ist.
        when: (c, a) => {
          const f = currentFixture(c);
          return !!f && (f.home === a.data.club || f.away === a.data.club);
        },
        run: (c, a) => {
          a.data.round = c.round;
          c.week.availability[a.idx] = 'yes';
          adjustForm(c, a.idx, 0.6);
          say(c, a.idx, tr('Sonntag gegen meinen Bruder. Ich hab ihm schon ein Foto von der Tabelle geschickt. Ich BIN da.', 'Sunday against my brother. I\'ve already sent him a photo of the table. I AM there.'), 'Di 21:14');
        },
      },
      {
        after: 1,
        run: (c, a) => {
          const me = humanClub(c).id;
          const f = c.fixtures[a.data.round]?.find((x) => x.home === me || x.away === me);
          if (!f?.result) return;
          const [mine, theirs] = f.home === me ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
          if (mine > theirs) {
            adjustMood(c, 0.08);
            say(c, a.idx, a.data.bet ? tr('Kiste ist abgeholt. Mein Bruder hat sie persönlich gebracht. Schönster Tag des Jahres.', 'Crate collected. My brother delivered it personally. Best day of the year.') : tr('Weihnachten wird dieses Jahr sehr entspannt. Für mich.', 'Christmas is going to be very relaxed this year. For me.'), 'Mo 10:30');
          } else if (mine < theirs) {
            adjustForm(c, a.idx, -0.4);
            say(c, a.idx, a.data.bet ? tr('Muss eine Kiste kaufen. Und mir das ein Jahr lang anhören.', 'I have to buy a crate. And hear about it for a whole year.') : tr('Kein Kommentar. Bitte keine Fragen beim Familienessen.', 'No comment. No questions at family dinner, please.'), 'Mo 10:30');
          } else {
            say(c, a.idx, tr('Unentschieden. Mama ist zufrieden, sonst niemand.', 'A draw. Mum is happy, nobody else is.'), 'Mo 10:30');
          }
        },
      },
    ],
  },
};

const currentFixture = (c) => {
  const me = humanClub(c).id;
  return c.fixtures[c.round]?.find((f) => f.home === me || f.away === me) ?? null;
};

function graduate(c, a, rng, text) {
  const job = rng.pick(GRAD_JOBS);
  const r = rec(c, a.idx);
  if (!r) return text;
  r.job = job;
  if (rng.chance(0.3)) {
    const city = CITIES[(a.idx + 3) % CITIES.length];
    r.absenceMul = 3;
    startStory(c, 'umzug', a.idx, { city });
    return tr(`${text} Neuer Job: ${job} – allerdings in ${city}. Er will pendeln.`, `${text} New job: ${jobName(job)} – but in ${city}. He wants to commute.`);
  }
  r.absenceMul = 1;
  return tr(`${text} Und er hat schon einen Job: ${job}, direkt hier in der Stadt.`, `${text} And he already has a job: ${jobName(job)}, right here in town.`);
}

// Start-Ereignisse der Geschichten – werden mit den normalen Ereignissen verlost.
export const STORY_STARTS = Object.fromEntries(Object.entries(STORIES).map(([id, s]) => [id, s.start]));

// Entscheidung mitten in einer Geschichte: id "story:<uid>".
export function storyDecision(c, eventId) {
  if (!eventId.startsWith('story:')) return null;
  const arc = findArc(c, eventId.slice(6));
  const step = arc && STORIES[arc.id].steps[arc.data.pendingStep ?? -1];
  if (!step?.decision) return null;
  return {
    options: step.decision.options.map((o) => ({ label: o.label, effect: (cc, ctx, rng) => o.effect(cc, arc, rng) })),
  };
}

// Zu Wochenbeginn: Geschichten weiterdrehen. Höchstens eine Entscheidung pro Woche.
export function advanceStories(c, rng) {
  // Alte Spielstände: „Vater"-Geschichte aus den Flags übernehmen.
  const legacy = c.flags?.arcVater;
  if (legacy) {
    if (legacy.step < 2) Object.assign(startStory(c, 'vater', legacy.idx), { step: legacy.step, t: c.round - legacy.round - (legacy.step ? 2 : 0) });
    delete c.flags.arcVater;
  }
  const arcs = arcsOf(c);
  for (const a of [...arcs]) {
    const def = STORIES[a.id];
    if (!def || a.done || (!a.data.external && !inSquad(c, a.idx))) {
      arcs.splice(arcs.indexOf(a), 1);
      continue;
    }
    a.t++;
    def.weekly?.(c, a);
    const step = def.steps[a.step];
    if (!step) {
      arcs.splice(arcs.indexOf(a), 1); // Geschichte zu Ende erzählt
      continue;
    }
    if (a.t < (step.after ?? 0) || (step.when && !step.when(c, a))) continue;
    if (step.decision) {
      if (c.week.event) continue; // nächste Woche
      a.data.pendingStep = a.step;
      c.week.event = { id: `story:${a.uid}`, ctx: {}, text: step.decision.text(c, a), options: step.decision.options.map((o) => o.label), choice: null, result: null, story: def.label(c, a) };
    } else {
      step.run(c, a, rng);
    }
    a.step++;
    a.t = 0;
    if (a.step >= def.steps.length && !step.decision && !a.data.external) arcs.splice(arcs.indexOf(a), 1);
  }
}

export const storyLabels = (c) => arcsOf(c).filter((a) => STORIES[a.id] && !a.done).map((a) => STORIES[a.id].label(c, a));
