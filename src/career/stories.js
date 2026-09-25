// Lebensgeschichten: mehrwöchige Ketten aus Ereignissen. Eine Geschichte startet wie ein
// normales Wochen-Ereignis, läuft dann Woche für Woche weiter und kann unterwegs neue
// Entscheidungen verlangen.
import { book, MEMBER_FEE } from './finances.js';
import { clubById, getPool, humanClub, joinSquad, maxSquad, playerOf, releasePlayer } from './career.js';
import { adjustForm, adjustMood } from './events.js';

const first = (c, idx) => playerOf(c, idx).name.split(' ')[0];
const inSquad = (c, idx) => humanClub(c).squad.includes(idx);
const say = (c, from, text, time) => c.week?.chat.push({ from, text, time });
const rec = (c, idx) => c.players[idx];

const CITIES = ['Hannover', 'Kassel', 'Bielefeld', 'Würzburg', 'Osnabrück', 'Erfurt'];
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
    label: (c, a) => `${first(c, a.idx)} wird Papa`,
    start: {
      weight: 1,
      needs: (c, rng) => {
        const s = subject(c, rng, (p) => p.age >= 24 && p.age <= 40);
        return s == null ? null : { s };
      },
      text: (c, ctx) => `${first(c, ctx.s)} hat eine Nachricht mit Ultraschallbild geschickt: „Ich werde Papa!!"`,
      options: [
        {
          label: 'Blumen und eine Karte vom Team (15 €)',
          effect: (c, ctx) => {
            book(c, 'Blumen für den werdenden Papa', -15);
            adjustMood(c, 0.1);
            startStory(c, 'vater', ctx.s);
            return 'Alle freuen sich mit. In ein paar Wochen ist es so weit.';
          },
        },
        {
          label: 'Spontane Party im Vereinsheim (30 €)',
          effect: (c, ctx) => {
            book(c, 'Party für den werdenden Papa', -30);
            adjustMood(c, 0.15);
            adjustForm(c, ctx.s, -0.4);
            startStory(c, 'vater', ctx.s);
            return 'Große Sause. Der werdende Papa hat danach sicherheitshalber Wasser getrunken. Ab Runde drei.';
          },
        },
      ],
    },
    steps: [
      {
        after: 2,
        run: (c, a) => {
          c.week.availability[a.idx] = 'no';
          const baby = ['Es ist ein Mädchen!!! 3.480 g', 'Es ist ein Junge!!! 3.720 g', 'ZWILLINGE!!! Ein Mädchen und ein Junge'][a.idx % 3];
          say(c, a.idx, `${baby}, alle gesund. Bin Sonntag natürlich raus.`, 'Mi 04:12');
          adjustMood(c, 0.1);
        },
      },
      {
        after: 1,
        run: (c, a) => {
          adjustForm(c, a.idx, -0.4);
          say(c, a.idx, 'Bin wieder dabei. Habe seit einer Woche nicht geschlafen, aber egal. Kinderwagen steht am Spielfeldrand.', 'Do 22:40');
        },
      },
    ],
  },

  umzug: {
    label: (c, a) => `${first(c, a.idx)} pendelt aus ${a.data.city}`,
    start: {
      weight: 1,
      needs: (c, rng) => {
        if (c.round < 1) return null;
        const s = subject(c, rng, (p) => p.age >= 22 && p.age <= 45 && !NO_JOB_CUT.test(p.profession));
        return s == null ? null : { s, city: CITIES[s % CITIES.length] };
      },
      text: (c, ctx) => `${first(c, ctx.s)} hat einen neuen Job in ${ctx.city}, 90 km weg. „Ich würd ja gern weiter mitspielen …"`,
      options: [
        {
          label: 'Fahrgeld aus der Kasse (10 €/Woche)',
          effect: (c, ctx) => {
            rec(c, ctx.s).absenceMul = 1.6;
            startStory(c, 'umzug', ctx.s, { city: ctx.city, paid: true });
            return `${first(c, ctx.s)} pendelt, die Kasse zahlt den Sprit. Er kommt, so oft es geht.`;
          },
        },
        {
          label: 'Schweren Herzens verabschieden',
          effect: (c, ctx) => {
            adjustMood(c, -0.05);
            if (releasePlayer(c, ctx.s)) return 'Abschied mit Kasten Bier. Er bekommt ein signiertes Trikot mit.';
            rec(c, ctx.s).absenceMul = 3;
            startStory(c, 'umzug', ctx.s, { city: ctx.city });
            return 'Ohne ihn wären wir zu wenige – er pendelt vorerst doch.';
          },
        },
        {
          label: 'Pendeln – wir zählen auf dich',
          effect: (c, ctx) => {
            rec(c, ctx.s).absenceMul = 3;
            startStory(c, 'umzug', ctx.s, { city: ctx.city });
            return 'Er versucht es. Sonntags früh um sieben auf der Autobahn – mal sehen, wie lange.';
          },
        },
      ],
    },
    weekly: (c, a) => {
      if (a.data.paid) book(c, `Fahrgeld ${first(c, a.idx)} (${a.data.city})`, -10);
    },
    steps: [
      {
        after: 4,
        decision: {
          text: (c, a) => `${first(c, a.idx)}: „Die Pendelei macht mich fertig. Jeden Sonntag 180 km für 60 Minuten Kick …"`,
          options: [
            {
              label: 'Fahrgemeinschaft organisieren',
              effect: (c, a) => {
                rec(c, a.idx).absenceMul = 1.3;
                adjustMood(c, 0.04);
                return 'Er fährt jetzt mit einem Kumpel, der eh in die Richtung muss. Klappt besser.';
              },
            },
            {
              label: 'Du musst dich entscheiden',
              effect: (c, a, rng) => {
                if (rng.chance(0.5) && releasePlayer(c, a.idx)) {
                  a.done = true;
                  return 'Er entscheidet sich für die Ruhe. Abschied per Sprachnachricht.';
                }
                rec(c, a.idx).absenceMul = 1.2;
                adjustForm(c, a.idx, 0.4);
                return '„Dann komm ich halt jeden Sonntag." Und er meint es ernst.';
              },
            },
            { label: 'Weiter wie bisher', effect: () => 'Er pendelt weiter. Manchmal.' },
          ],
        },
      },
      {
        after: 3,
        run: (c, a, rng) => {
          if (!rng.chance(0.3)) return;
          rec(c, a.idx).absenceMul = 1;
          say(c, a.idx, `Die Firma macht den Standort in ${a.data.city} zu – ich werd zurückversetzt! Bin wieder ganz da.`, 'Fr 17:30');
          adjustMood(c, 0.06);
          a.data.paid = false;
        },
      },
    ],
  },

  jobverlust: {
    label: (c, a) => `${first(c, a.idx)} sucht Arbeit`,
    start: {
      weight: 1,
      needs: (c, rng) => {
        if (c.round < 2) return null;
        const s = subject(c, rng, (p) => p.age >= 20 && p.age <= 60 && !NO_JOB_CUT.test(p.profession));
        return s == null ? null : { s, job: playerOf(c, s).profession };
      },
      text: (c, ctx) => `Schlechte Nachricht von ${first(c, ctx.s)} (${ctx.job}): Die Firma hat dichtgemacht. Er ist ab sofort arbeitslos.`,
      options: [
        {
          label: 'Team hört sich um',
          effect: (c, ctx) => {
            Object.assign(rec(c, ctx.s), { job: 'Arbeitssuchend', absenceMul: 0.3 });
            adjustForm(c, ctx.s, -0.2);
            startStory(c, 'jobverlust', ctx.s, { help: true });
            return 'Alle fragen in ihren Firmen nach. Immerhin hat er jetzt sonntags immer Zeit.';
          },
        },
        {
          label: 'Mitgliedsbeitrag erlassen, bis er was hat',
          effect: (c, ctx) => {
            Object.assign(rec(c, ctx.s), { job: 'Arbeitssuchend', absenceMul: 0.3 });
            adjustMood(c, 0.06);
            startStory(c, 'jobverlust', ctx.s, { help: true, feeFree: true });
            return 'Kleine Geste, große Wirkung. Die Gruppe findet das stark.';
          },
        },
        {
          label: '„Kopf hoch, wird schon"',
          effect: (c, ctx) => {
            Object.assign(rec(c, ctx.s), { job: 'Arbeitssuchend', absenceMul: 0.3 });
            adjustForm(c, ctx.s, -0.4);
            startStory(c, 'jobverlust', ctx.s, { help: false });
            return 'Er nickt. Viel mehr kommt nicht.';
          },
        },
      ],
    },
    weekly: (c, a) => {
      if (a.data.feeFree && rec(c, a.idx)?.job === 'Arbeitssuchend') book(c, `Beitrag erlassen (${first(c, a.idx)})`, -MEMBER_FEE);
    },
    steps: [
      {
        after: 3,
        decision: {
          text: (c, a) => {
            const where = c.sponsors?.[0]?.name ?? 'Der Wirt vom Vereinsheim';
            return `${where} sucht jemanden – anpacken, zuverlässig, gern sofort. Sollen wir ${first(c, a.idx)} empfehlen?`;
          },
          options: [
            {
              label: 'Klar, wir empfehlen ihn',
              effect: (c, a, rng) => {
                const sponsor = c.sponsors?.[0]?.name;
                Object.assign(rec(c, a.idx), { job: sponsor ? `Aushilfe bei ${sponsor}` : 'Aushilfe im Vereinsheim', absenceMul: 1 });
                adjustMood(c, a.data.help ? 0.1 : 0.06);
                adjustForm(c, a.idx, 0.5);
                a.done = true;
                return rng.chance(0.5) ? 'Er hat den Job! Die erste Runde nach dem Training geht auf ihn.' : 'Genommen! Er schickt ein Foto in Arbeitsklamotten.';
              },
            },
            { label: 'Er soll selbst suchen', effect: () => 'Er schreibt weiter Bewerbungen.' },
          ],
        },
      },
      {
        after: 2,
        run: (c, a, rng) => {
          if (rec(c, a.idx)?.job !== 'Arbeitssuchend') return;
          const job = rng.pick(NEW_JOBS);
          Object.assign(rec(c, a.idx), { job, absenceMul: 1 });
          say(c, a.idx, `Ich hab was! Ab Montag ${job}. Endlich wieder Struktur.`, 'Di 12:05');
          adjustMood(c, 0.05);
        },
      },
    ],
  },

  comeback: {
    label: (c, a) => `Comeback von ${playerOf(c, a.idx).name.split(' ')[0]}`,
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
        return `${p.name} (${p.age}, ${p.position}) hat nach einem Kreuzbandriss zwei Jahre pausiert. Er will es nochmal wissen – bei euch.`;
      },
      options: [
        {
          label: 'Aufbautraining mit dem Physio (20 €)',
          effect: (c, ctx) => {
            book(c, 'Physio: Aufbautraining Comeback', -20);
            startStory(c, 'comeback', ctx.s, { external: true });
            return 'Zwei Wochen Reha-Programm, dann ist er dabei.';
          },
        },
        {
          label: 'Soll direkt einsteigen',
          effect: (c, ctx) => {
            if (!joinSquad(c, ctx.s, 'Knie ist getapet, ich bin dabei!')) return 'Der Kader ist inzwischen voll.';
            adjustForm(c, ctx.s, -0.6);
            startStory(c, 'comeback', ctx.s, { rushed: true });
            return 'Er ist sofort dabei. Etwas eingerostet – und das Knie ist noch nicht ganz stabil.';
          },
        },
        { label: 'Kein Bedarf', effect: () => 'Er versucht sein Glück woanders.' },
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
              say(c, a.idx, 'Knie zwickt wieder. Der Doc sagt: zwei Wochen Pause. Hätte ich mal Reha gemacht …', 'Mo 19:40');
            }
            return;
          }
          if (joinSquad(c, a.idx, 'Knie hält! Der Physio hat mich freigegeben – ich bin bereit.')) adjustForm(c, a.idx, 0.6);
        },
      },
    ],
  },

  abschluss: {
    label: (c, a) => `${first(c, a.idx)} schreibt die Abschlussarbeit`,
    start: {
      weight: 1,
      needs: (c, rng) => {
        const s = subject(c, rng, (p) => p.profession.startsWith('Student'));
        return s == null ? null : { s };
      },
      text: (c, ctx) => `${first(c, ctx.s)} muss in drei Wochen seine Abschlussarbeit abgeben. „Kann sein, dass ich ein paar Mal fehle."`,
      options: [
        {
          label: 'Uni geht vor – viel Erfolg!',
          effect: (c, ctx) => {
            rec(c, ctx.s).absenceMul = 2.5;
            startStory(c, 'abschluss', ctx.s);
            return 'Er taucht erstmal ab. Die Bibliothek hat sonntags zum Glück zu.';
          },
        },
        {
          label: 'Fußball ist die beste Pause',
          effect: (c, ctx) => {
            rec(c, ctx.s).absenceMul = 1.3;
            adjustForm(c, ctx.s, -0.3);
            startStory(c, 'abschluss', ctx.s, { stress: true });
            return 'Er kommt – mit Augenringen und Karteikarten in der Sporttasche.';
          },
        },
      ],
    },
    steps: [
      {
        after: 3,
        decision: {
          text: (c, a) => `${first(c, a.idx)}: „BESTANDEN!!! 1,${a.data.stress ? 9 : 3}!" – nach ${a.idx % 5 + 9} Semestern.`,
          options: [
            {
              label: 'Party im Vereinsheim (25 €)',
              effect: (c, a, rng) => {
                book(c, `Abschlussparty ${first(c, a.idx)}`, -25);
                adjustMood(c, 0.12);
                adjustForm(c, a.idx, -0.3);
                return graduate(c, a, rng, 'Legendär. Irgendwann lief „Atemlos" – dreimal.');
              },
            },
            { label: 'Glückwunsch in der Gruppe', effect: (c, a, rng) => (adjustMood(c, 0.03), graduate(c, a, rng, 'Daumen hoch, Konfetti-Emojis.')) },
          ],
        },
      },
    ],
  },

  hochzeit: {
    label: (c, a) => `${first(c, a.idx)} heiratet`,
    start: {
      weight: 1,
      needs: (c, rng) => {
        if (c.round + 3 >= c.fixtures.length) return null;
        const s = subject(c, rng, (p) => p.age >= 25 && p.age <= 45);
        return s == null ? null : { s };
      },
      text: (c, ctx) => `${first(c, ctx.s)} heiratet in drei Wochen – am Samstag. Sonntag danach? „Eher schwierig."`,
      options: [
        {
          label: 'Polterabend mit dem ganzen Team!',
          effect: (c, ctx) => (adjustMood(c, 0.06), startStory(c, 'hochzeit', ctx.s, { polter: true }), 'Die Planung läuft. Einer hat schon Porzellan vom Flohmarkt organisiert.'),
        },
        {
          label: 'Geschenk vom Team (30 €)',
          effect: (c, ctx) => (book(c, `Hochzeitsgeschenk ${first(c, ctx.s)}`, -30), adjustMood(c, 0.04), startStory(c, 'hochzeit', ctx.s), 'Ein Gutschein fürs Möbelhaus. Romantisch.'),
        },
        { label: 'Herzlichen Glückwunsch!', effect: (c, ctx) => (startStory(c, 'hochzeit', ctx.s), 'Er freut sich.') },
      ],
    },
    steps: [
      {
        after: 3,
        run: (c, a) => {
          c.week.availability[a.idx] = 'no';
          say(c, a.idx, 'Wir haben JA gesagt!!! Sonntag bin ich raus, aber nächste Woche wieder da.', 'Sa 23:50');
          adjustMood(c, 0.08);
          if (!a.data.polter) return;
          for (const idx of humanClub(c).squad) if (c.week.availability[idx] === 'yes') adjustForm(c, idx, -0.5);
          const other = humanClub(c).squad.find((idx) => idx !== a.idx && c.week.availability[idx] === 'yes');
          if (other != null) say(c, other, 'Polterabend war legendär. Ich seh immer noch doppelt. Sonntag wird hart.', 'So 09:12');
          adjustMood(c, 0.1);
        },
      },
      { after: 1, run: (c, a) => (adjustForm(c, a.idx, 0.4), say(c, a.idx, 'Frisch verheiratet und voll motiviert. Flitterwochen erst im Sommer.', 'Mo 18:02')) },
    ],
  },

  bruder: {
    label: (c, a) => `Bruderduell gegen ${clubById(c, a.data.club)?.short ?? '?'}`,
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
      text: (c, ctx) => `${first(c, ctx.s)}s Bruder hat bei ${clubById(c, ctx.club).name} unterschrieben. Beim Familienessen wird es still.`,
      options: [
        { label: 'Wette: Verlierer zahlt eine Kiste', effect: (c, ctx) => (startStory(c, 'bruder', ctx.s, { club: ctx.club, bet: true }), 'Die Wette gilt. Die Mutter kommt zum Spiel – mit zwei Schals.') },
        { label: 'Familie ist Familie', effect: (c, ctx) => (startStory(c, 'bruder', ctx.s, { club: ctx.club }), 'Er nimmt es gelassen. Sagt er.') },
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
          say(c, a.idx, 'Sonntag gegen meinen Bruder. Ich hab ihm schon ein Foto von der Tabelle geschickt. Ich BIN da.', 'Di 21:14');
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
            say(c, a.idx, a.data.bet ? 'Kiste ist abgeholt. Mein Bruder hat sie persönlich gebracht. Schönster Tag des Jahres.' : 'Weihnachten wird dieses Jahr sehr entspannt. Für mich.', 'Mo 10:30');
          } else if (mine < theirs) {
            adjustForm(c, a.idx, -0.4);
            say(c, a.idx, a.data.bet ? 'Muss eine Kiste kaufen. Und mir das ein Jahr lang anhören.' : 'Kein Kommentar. Bitte keine Fragen beim Familienessen.', 'Mo 10:30');
          } else {
            say(c, a.idx, 'Unentschieden. Mama ist zufrieden, sonst niemand.', 'Mo 10:30');
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
    return `${text} Neuer Job: ${job} – allerdings in ${city}. Er will pendeln.`;
  }
  r.absenceMul = 1;
  return `${text} Und er hat schon einen Job: ${job}, direkt hier in der Stadt.`;
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
