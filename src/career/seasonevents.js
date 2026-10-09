// Ereignisse für die dünnen Stellen: das Saisonende (Aufstiegsfeier, Abstiegsangst, Abschiedsspiel,
// Urlaub vorm Finale), die Mitte der Karriere (Firmenlauf, Platzsperre, Trainerschein, undichte Kabine,
// Flutlicht) und die höheren Ligen (Schiedsrichtermangel, Lizenzpflicht, Hospitation).
// Die Messung (`_probe`-Läufe, siehe ROADMAP 11.5) zeigte, dass hier am wenigsten passierte.
// Wirkungsgrößen wie bei den vorhandenen Ereignissen: Stimmung ±0,03 … 0,15, Tagesform ±0,1 … 0,5,
// Kasse ±15 … 150 €, Absage 1 Woche, „angefressen" 1–3 Wochen.
import { tr } from '../core/i18n.js';
import { humanClub, playerOf, table } from './career.js';
import { MAX_LEVEL } from './clubs.js';
import { adjustForm, adjustMood } from './events.js';
import { book } from './finances.js';
import { hasFacility } from './facilities.js';
import { canLose, first, leaveTeam, outcome, sitOut } from './outcomes.js';
import { lateOr } from './spielbericht.js';
import { adjustEnergy, adjustPatience, isCoach } from './personal.js';
import { isBanned } from './suspensions.js';
import { setRelation } from './relations.js';
import { chronicle } from './sagas.js';
import { adjustRel } from './sponsors.js';
import { clampN, clubLife } from './clublife.js';
import { holderOf } from './staff.js';

const level = (c) => c.level ?? 1;
const rounds = (c) => c.fixtures?.length ?? 10;
const squad = (c) => humanClub(c).squad.filter((i) => !isCoach(c, i));
const team = (c, d) => humanClub(c).squad.forEach((i) => adjustForm(c, i, d));
const hurt = (c, idx, weeks = 1) => {
  if (!c.players[idx]) return;
  c.players[idx].injuryWeeks = Math.max(c.players[idx].injuryWeeks ?? 0, weeks);
  sitOut(c, idx);
};
const neighbors = (c, d) => (clubLife(c).neighbors = clampN(clubLife(c).neighbors + d));
const supporters = (c, d) => (clubLife(c).supporters = Math.max(0, clubLife(c).supporters + d));
const standing = (c) => {
  const rows = table(c);
  return { pos: rows.findIndex((r) => r.club.human) + 1, size: rows.length };
};
// Zufällige, verschiedene Spieler aus dem Kader (ohne dich selbst).
const some = (c, rng, n) => {
  const pool = squad(c).filter((i) => !isBanned(c, i)); // Gesperrte nicht für „kommt zu spät / fehlt“ ziehen
  const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return out;
};

// Je Saison höchstens einmal: gemerkt wird beim Entscheiden (auch beim automatischen Entscheiden am Spieltag).
const seasonDone = (c, id) => c.flags?.sev?.[id] === c.season;
const markDone = (c, id) => {
  c.flags ??= {};
  (c.flags.sev ??= {})[id] = c.season;
};
function seasonal(id, def) {
  return { ...def, options: def.options.map((o) => ({ ...o, effect: (c, ctx, rng) => (markDone(c, id), o.effect(c, ctx, rng)) })) };
}

export const SEASON_EVENTS = {
  // --- Saisonende ---------------------------------------------------------------------
  aufstiegsfeier: seasonal('aufstiegsfeier', {
    weight: 10,
    needs: (c) => {
      if (level(c) >= MAX_LEVEL || seasonDone(c, 'aufstiegsfeier') || c.round < rounds(c) - 3) return null;
      const { pos } = standing(c);
      return pos >= 1 && pos <= 2 ? { pos, left: rounds(c) - c.round } : null;
    },
    text: (c, ctx) => tr(`Noch ${ctx.left} Spieltage, ihr steht auf Platz ${ctx.pos}. Der Wirt fragt, ob er schon Sekt kaltstellen soll – und die Fans malen ein Laken: „Aufstieg".`, `${ctx.left} matchdays to go, you are in position ${ctx.pos}. The landlord asks if he should chill the fizz already – and the fans are painting a bedsheet: "Promotion".`),
    options: [
      {
        label: tr('Feier vorbereiten: Sekt, Banner, Böller (60 €)', 'Prepare the party: fizz, banner, fireworks (€60)'),
        effect: outcome([
          { w: (c, ctx) => (ctx.pos === 1 ? 3 : 1.5), run: (c) => (book(c, tr('Aufstiegsfeier: Vorbereitung', 'Promotion party: preparations'), -60), adjustMood(c, 0.14), team(c, 0.1), tr('Das Banner hängt, der Sekt liegt im Kühlschrank der Eckkneipe. Die Mannschaft spielt, als sei es schon so weit – im besten Sinne.', 'The banner is up, the fizz is in the fridge at the corner pub. The team plays as if it were already done – in the best way.')) },
          { w: (c, ctx) => (ctx.pos === 1 ? 1 : 2), run: (c) => (book(c, tr('Aufstiegsfeier: Vorbereitung', 'Promotion party: preparations'), -60), adjustMood(c, -0.06), team(c, -0.2), tr('Ein Gegnerfan fotografiert das Banner und stellt es ins Netz. „Zu früh gefreut" ist noch das Netteste im Kommentar.', 'An opposition fan photographs the banner and posts it online. "Counting chickens" is the nicest comment.')) },
          { w: 1, run: (c) => (book(c, tr('Aufstiegsfeier: Vorbereitung', 'Promotion party: preparations'), -60), book(c, tr('Getränkehändler spendiert Sekt', 'Drinks dealer donates the fizz'), 30), adjustMood(c, 0.1), tr('Der Getränkehändler hört davon und legt zwei Kisten drauf. 30 € kommen zurück.', 'The drinks dealer hears about it and chips in two crates. €30 comes back.')) },
        ]),
      },
      {
        label: tr('Erst gewinnen, dann feiern', 'Win first, party later'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.03), team(c, 0.1), tr('Der Kapitän verbietet das Wort „Aufstieg" in der Kabine. Es steht trotzdem an der Taktiktafel.', 'The captain bans the word "promotion" in the dressing room. It is on the tactics board anyway.')) },
          { w: 1, run: (c) => (book(c, tr('Sekt vorbestellt (Wirt)', 'Fizz pre-ordered (landlord)'), -25), tr('Der Wirt hat den Sekt längst bestellt. Er stand halt da. 25 € – und niemand traut sich, ihn zurückzuschicken.', 'The landlord ordered the fizz ages ago. It was just there. €25 – and nobody dares send it back.')) },
        ]),
      },
      {
        label: tr('Die Mannschaft stimmt ab', 'Let the squad vote'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.06), tr('Einstimmig: Feiern ja, aber erst nach dem Abpfiff. Wer vorher Sekt anfasst, zahlt eine Runde.', 'Unanimous: party yes, but only after the final whistle. Whoever touches the fizz before pays a round.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Die Abstimmung endet 5:5. Der Torwart enthält sich. Das Thema begleitet euch bis zum Anpfiff.', 'The vote ends 5-5. The keeper abstains. The topic follows you right up to kick-off.')) },
        ]),
      },
    ],
  }),

  abstiegskrise: seasonal('abstiegskrise', {
    weight: 10,
    needs: (c) => {
      if (level(c) < 2 || seasonDone(c, 'abstiegskrise') || c.round < rounds(c) - 4) return null;
      const { pos, size } = standing(c);
      return pos >= size - 1 ? { pos, size, left: rounds(c) - c.round } : null;
    },
    text: (c, ctx) => tr(`Platz ${ctx.pos} von ${ctx.size}, noch ${ctx.left} Spieltage. Im Vereinsheim wird es still, wenn du hereinkommst. Der Vorsitzende fragt vorsichtig, ob du „einen Plan" hast.`, `Position ${ctx.pos} of ${ctx.size}, ${ctx.left} matchdays to go. The clubhouse goes quiet when you walk in. The chairman carefully asks whether you have "a plan".`),
    options: [
      {
        label: tr('Krisensitzung mit Pizza (30 €)', 'Crisis meeting with pizza (€30)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Krisensitzung: Pizza', 'Crisis meeting: pizza'), -30), adjustMood(c, 0.1), team(c, 0.15), tr('Zwei Stunden reden, keine Schuldzuweisungen. Am Ende steht ein Plan auf dem Pizzakarton.', 'Two hours of talking, no finger-pointing. In the end there is a plan on the pizza box.')) },
          { w: 1.5, run: (c, ctx, rng) => { book(c, tr('Krisensitzung: Pizza', 'Crisis meeting: pizza'), -30); const [a, b] = some(c, rng, 2); if (b != null) setRelation(c, a, b, 'rivalen'); adjustMood(c, -0.04); return b != null ? tr(`Aus der Aussprache wird ein Streit: ${first(c, a)} und ${first(c, b)} reden über den Fehlpass von vor drei Wochen. Und reden. Und reden.`, `The talk turns into a row: ${first(c, a)} and ${first(c, b)} go over a misplaced pass from three weeks ago. And over it. And over it.`) : tr('Die Pizza wird kalt, die Stimmung auch.', 'The pizza goes cold, and so does the mood.'); } },
          { w: 1, run: (c) => (book(c, tr('Krisensitzung: Pizza', 'Crisis meeting: pizza'), -30), adjustMood(c, 0.15), tr('Der Pizzabäcker erzählt, wie er mal mit dem Dorfverein fast abgestiegen wäre. Alle hören zu. Alle bestellen Nachschlag.', 'The pizza man tells how he nearly got relegated with his village club once. Everyone listens. Everyone orders seconds.')) },
        ]),
      },
      {
        label: tr('Ehemalige zum Mittrainieren einladen', 'Invite former players to train with the squad'),
        effect: outcome([
          { w: 3, run: (c, ctx, rng) => { const [a, b, d] = some(c, rng, 3); for (const i of [a, b, d]) if (i != null) adjustForm(c, i, 0.3); return tr('Die Alten zeigen, wie man im Zweikampf steht. Nach der Einheit wird sich sortiert. Und umarmt.', 'The old boys show how to stand firm in a tackle. After the session, they sort themselves out. And hug.'); } },
          { w: 1.5, run: (c, ctx, rng) => { const [a, b] = some(c, rng, 2); if (a != null) adjustForm(c, a, 0.2); if (b != null) hurt(c, b); return b != null ? tr(`Der Ex-Kapitän grätscht wie früher. ${first(c, b)} humpelt vom Platz und fehlt am Sonntag.`, `The ex-captain slides in like in the old days. ${first(c, b)} limps off and misses Sunday.`) : tr('Der Ex-Kapitän grätscht wie früher.', 'The ex-captain slides in like in the old days.'); } },
          { w: 1, run: (c) => (adjustMood(c, 0.08), tr('Der frühere Kapitän hält vor dem Anpfiff am Sonntag eine Rede. Es gibt Gänsehaut und einen Hustenanfall.', 'The former captain gives a speech before kick-off on Sunday. Goosebumps and a coughing fit.')) },
        ]),
      },
      {
        label: tr('Ruhe bewahren, nichts ändern', 'Stay calm, change nothing'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.05), tr('Die Ruhe wirkt wie Gleichgültigkeit. In der Kabine heißt es: „Der Trainer hat aufgegeben."', 'Your calm looks like indifference. In the dressing room they say: "The gaffer has given up."')) },
          { w: 1.5, run: (c) => (adjustMood(c, 0.03), team(c, 0.1), tr('Die Ruhe überträgt sich. Training ohne Hektik, ohne Gebrüll, mit Dehnen.', 'Your calm rubs off. Training without panic or shouting, with stretching.')) },
          { w: (c) => (c.sponsors?.length ? 1 : 0), run: (c) => (adjustRel(c.sponsors[0], -6), tr(`${c.sponsors[0].name} ruft an und fragt, ob man sich Sorgen machen müsse. Man muss es erklären.`, `${c.sponsors[0].name} rings and asks whether there is cause for concern. You have to explain.`)) },
        ]),
      },
    ],
  }),

  abschiedsspiel: seasonal('abschiedsspiel', {
    weight: 10,
    needs: (c) => {
      if (seasonDone(c, 'abschiedsspiel') || c.round < rounds(c) - 3) return null;
      const old = squad(c).filter((i) => playerOf(c, i).age >= 33).sort((a, b) => playerOf(c, b).age - playerOf(c, a).age)[0];
      return old != null ? { s: old } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} (${playerOf(c, ctx.s).age}) sagt, die Knie machen nicht mehr lange mit. „Ein Abschiedsspiel wäre schön. Mit den Altherren. Und Fassbier."`, `${first(c, ctx.s)} (${playerOf(c, ctx.s).age}) says his knees will not hold out much longer. "A farewell match would be nice. With the old boys. And a keg."`),
    options: [
      {
        label: tr('Abschiedsspiel mit den Altherren (40 € Auslagen)', 'Farewell match with the old boys (€40 costs)'),
        effect: outcome([
          { w: 3, run: (c, ctx, rng) => { const n = rng.int(70, 140); book(c, tr('Abschiedsspiel: Auslagen', 'Farewell match: costs'), -40); book(c, tr('Abschiedsspiel: Spenden', 'Farewell match: donations'), n); adjustMood(c, 0.12); return tr(`Das halbe Dorf kommt. ${first(c, ctx.s)} wird dreimal ausgewechselt und kehrt viermal zurück. ${n} € im Spendenhut.`, `Half the village turns up. ${first(c, ctx.s)} is subbed off three times and comes back four. €${n} in the collection tin.`); } },
          { w: 1, run: (c) => (book(c, tr('Abschiedsspiel: Auslagen', 'Farewell match: costs'), -40), book(c, tr('Abschiedsspiel: Spenden', 'Farewell match: donations'), 20), adjustMood(c, 0.05), tr('Dauerregen. Es kommen elf Zuschauer, und das Fassbier ist trotzdem leer. 20 € in der Kasse.', 'Pouring rain. Eleven spectators turn up, and the keg is still empty. €20 in the kitty.')) },
          { w: 1, run: (c, ctx) => (book(c, tr('Abschiedsspiel: Auslagen', 'Farewell match: costs'), -40), adjustMood(c, 0.1), hurt(c, ctx.s), tr(`Bei der Ehrenrunde zerrt sich ${first(c, ctx.s)} die Wade. Er lacht, die anderen auch. Am Sonntag fehlt er.`, `On his lap of honour ${first(c, ctx.s)} pulls his calf. He laughs, so do the others. He misses Sunday.`)) },
        ]),
      },
      {
        label: tr('Kurze Ehrung vor dem Anpfiff', 'A short tribute before kick-off'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (adjustMood(c, 0.04), (c.players[ctx.s].loyal = true), tr(`Blumen, Wimpel, Applaus. ${first(c, ctx.s)} wischt sich verdächtig oft die Augen. „Staub."`, `Flowers, a pennant, applause. ${first(c, ctx.s)} wipes his eyes suspiciously often. "Dust."`)) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, 0.5), tr(`${first(c, ctx.s)} spielt danach wie vor zehn Jahren. Sein Bruder auf der Tribüne weint offen.`, `${first(c, ctx.s)} plays like he did ten years ago. His brother in the stand weeps openly.`)) },
        ]),
      },
      {
        label: tr('Überreden: Noch ein Jahr!', 'Talk him round: one more year!'),
        effect: outcome([
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].loyal = true), adjustForm(c, ctx.s, 0.2), tr(`${first(c, ctx.s)} schwankt, dann nickt er. „Aber nur, wenn ich nicht mehr sprinten muss."`, `${first(c, ctx.s)} wavers, then nods. "But only if I no longer have to sprint."`)) },
          { w: 1.5, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), tr(`${first(c, ctx.s)} fühlt sich nicht ernst genommen. „Ich hab dich um einen Abschied gebeten, nicht um Überredung."`, `${first(c, ctx.s)} does not feel taken seriously. "I asked you for a send-off, not a sales pitch."`)) },
          { w: (c) => (canLose(c) ? 0.6 : 0), run: (c, ctx) => (leaveTeam(c, ctx.s) ? tr(`${first(c, ctx.s)} hängt die Schuhe noch am selben Abend an den Nagel. „Wenn nicht richtig, dann gar nicht."`, `${first(c, ctx.s)} hangs up his boots that same evening. "If not properly, then not at all."`) : tr('Er grummelt.', 'He grumbles.')) },
        ]),
      },
    ],
  }),

  urlaub_finale: seasonal('urlaub_finale', {
    weight: 8,
    needs: (c, rng) => {
      if (seasonDone(c, 'urlaub_finale') || c.round < rounds(c) - 2) return null;
      const list = squad(c);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} hat im Winter gebucht: Flug nach Antalya am Freitag vor dem Spieltag. „Wusste ja nicht, dass es dann um was geht."`, `${first(c, ctx.s)} booked in winter: a flight to Antalya on the Friday before the match. "How was I to know it would matter by then?"`),
    options: [
      {
        label: tr('Gönnen – wir kommen klar', 'Let him go – we will manage'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, 0.03), tr(`${first(c, ctx.s)} fehlt. Er schickt Fotos vom Pool in die Gruppe. Die Ersatzbank schreibt Dinge zurück.`, `${first(c, ctx.s)} is out. He sends photos of the pool to the group. The bench writes things back.`)) },
          { w: 1, run: (c, ctx, rng) => { sitOut(c, ctx.s); const b = rng.pick(squad(c).filter((i) => i !== ctx.s)); if (b != null) adjustForm(c, b, 0.4); return b != null ? tr(`${first(c, ctx.s)} fehlt – und ${first(c, b)} spielt an seiner Stelle, als hätte er drei Wochen darauf gewartet.`, `${first(c, ctx.s)} is out – and ${first(c, b)} plays in his place as if he had waited three weeks for it.`) : tr('Er fehlt.', 'He is out.'); } },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, 0.05), tr(`${first(c, ctx.s)} bringt der ganzen Mannschaft Magnete mit. Vierzehn Stück, alle mit Kamel.`, `${first(c, ctx.s)} brings the whole squad fridge magnets. Fourteen of them, all with a camel.`)) },
        ]),
      },
      {
        label: tr('Umbuchen lassen, Kosten übernehmen (50 €)', 'Have him rebook, club pays (€50)'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (book(c, tr('Umbuchung Urlaubsflug', 'Holiday flight rebooking'), -50), adjustForm(c, ctx.s, 0.2), tr(`${first(c, ctx.s)} fliegt am Montag. Am Sonntag läuft er für zwei.`, `${first(c, ctx.s)} flies on Monday. On Sunday he runs for two.`)) },
          { w: 1, run: (c, ctx) => (book(c, tr('Umbuchung Urlaubsflug', 'Holiday flight rebooking'), -20), adjustMood(c, 0.04), tr(`Das Reisebüro zeigt sich kulant: nur 20 €. ${first(c, ctx.s)} bringt Baklava mit.`, `The travel agent is generous: only €20. ${first(c, ctx.s)} brings baklava.`)) },
        ]),
      },
      {
        label: tr('Ohne Absprache nicht: spielen oder sitzen', 'No deal without talking: play or sit'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (sitOut(c, ctx.s), (c.players[ctx.s].grumpy = 3), tr(`${first(c, ctx.s)} fliegt trotzdem. Zurück kommt er braun und angefressen.`, `${first(c, ctx.s)} flies anyway. He comes back tanned and sulking.`)) },
          { w: 1, run: (c, ctx) => (adjustForm(c, ctx.s, -0.2), tr(`${first(c, ctx.s)} storniert wortlos und spielt. Die Mundwinkel hängen bis zum Anpfiff.`, `${first(c, ctx.s)} cancels without a word and plays. The corners of his mouth droop until kick-off.`)) },
        ]),
      },
    ],
  }),

  // --- Mitte der Saison -----------------------------------------------------------------
  firmenlauf: seasonal('firmenlauf', {
    weight: 6,
    needs: (c) => (!seasonDone(c, 'firmenlauf') && c.round >= 2 && c.round <= rounds(c) - 4 ? {} : null),
    text: () => tr('Beim Stadtlauf „Rund ums Rathaus" gibt es einen Firmenlauf, fünf Kilometer. Jemand hat den Verein einfach angemeldet. „Wir hatten noch einen Startplatz frei."', 'The town run "Around the Town Hall" has a company race, five kilometres. Someone has simply entered the club. "We still had a free place."'),
    options: [
      {
        label: tr('Als Team mitlaufen (30 € Startgebühr)', 'Run as a team (€30 entry fee)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Firmenlauf: Startgebühr', 'Company run: entry fee'), -30), adjustMood(c, 0.1), tr('Alle kommen ins Ziel, einer rückwärts. Die Stutzen sind einheitlich, die Gesichter rot.', 'Everyone finishes, one of them backwards. The socks match, the faces are red.')) },
          { w: 2, run: (c) => (book(c, tr('Firmenlauf: Startgebühr', 'Company run: entry fee'), -30), book(c, tr('Firmenlauf: Teampreis', 'Company run: team prize'), 50), adjustMood(c, 0.12), chronicle(c, tr('Zweiter Platz beim Firmenlauf.', 'Second place in the company run.')), tr('Zweiter in der Teamwertung! Hinter der Feuerwehr, aber vor der Bank. 50 € Preisgeld.', 'Second in the team ranking! Behind the fire brigade, but ahead of the bank. €50 prize money.')) },
          { w: 1, run: (c, ctx, rng) => { book(c, tr('Firmenlauf: Startgebühr', 'Company run: entry fee'), -30); const s = rng.pick(squad(c)); hurt(c, s); return tr(`Kurz vor dem Ziel knickt ${first(c, s)} um. Er humpelt trotzdem über die Linie – und fällt am Sonntag aus.`, `Just before the line ${first(c, s)} rolls his ankle. He hobbles over anyway – and misses Sunday.`); } },
          { w: 1, run: (c, ctx, rng) => { book(c, tr('Firmenlauf: Startgebühr', 'Company run: entry fee'), -30); const s = rng.pick(squad(c)); c.players[s].grumpy = 1; return tr(`Der Torwart schlägt alle Stürmer. ${first(c, s)} diskutiert den Streckenverlauf noch heute.`, `The keeper beats all the strikers. ${first(c, s)} is still discussing the route.`); } },
        ]),
      },
      {
        label: tr('Verpflegungsstand betreiben', 'Run a refreshment stall'),
        effect: outcome([
          { w: 3, run: (c, ctx, rng) => { const n = rng.int(40, 80); book(c, tr('Firmenlauf: Verpflegungsstand', 'Company run: refreshment stall'), n); adjustMood(c, 0.04); return tr(`Bananen, Wasser, Kuchen: ${n} € Spenden. Dazu drei neue Gesichter fürs Probetraining.`, `Bananas, water, cake: €${n} in donations. Plus three new faces for a trial.`); } },
          { w: 1, run: (c) => (book(c, tr('Firmenlauf: Verpflegungsstand', 'Company run: refreshment stall'), 10), tr('Es regnet, es läuft niemand schnell, und der Kuchen wird nass. 10 € Plus.', 'It rains, nobody runs fast, and the cake gets wet. €10 profit.')) },
        ]),
      },
      {
        label: tr('Absagen – wir sparen die Beine', 'Decline – save our legs'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.02), tr('Die Stadt ist enttäuscht. Die Beine sind es nicht.', 'The town is disappointed. The legs are not.')) },
          { w: 1, run: (c) => (team(c, 0.1), tr('Ausgeschlafen und ohne Muskelkater. Sonntag laufen sie doppelt so viel.', 'Well rested and no sore muscles. On Sunday they run twice as much.')) },
        ]),
      },
    ],
  }),

  platzsperre: seasonal('platzsperre', {
    weight: 8,
    needs: (c) => {
      const w = c.week?.weather?.id;
      if (!['regen', 'schnee', 'frost'].includes(w) || seasonDone(c, 'platzsperre')) return null;
      const f = (c.fixtures?.[c.round] ?? []).find((x) => x.home === humanClub(c).id || x.away === humanClub(c).id);
      return f && f.home === humanClub(c).id ? { w } : null;
    },
    text: (c, ctx) => (ctx.w === 'regen'
      ? tr('Drei Tage Dauerregen. Der Platzwart steht mit dem Spaten am Mittelkreis und schüttelt den Kopf. Der Kreis hat den Platz für Sonntag gesperrt.', 'Three days of constant rain. The groundsman stands at the centre circle with a spade, shaking his head. The league has closed the pitch for Sunday.')
      : tr('Der Platz ist steinhart gefroren, im Strafraum liegt Schnee. Der Kreis hat ihn für Sonntag gesperrt.', 'The pitch is frozen solid, snow lies in the box. The league has closed it for Sunday.')),
    options: [
      {
        label: tr('Ausweichplatz im Nachbarort mieten (60 €)', 'Hire a pitch in the next village (€60)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Platzmiete Ausweichplatz', 'Pitch hire: alternative ground'), -60), adjustMood(c, -0.02), tr('Der Nachbarverein stellt den Platz. Ihr müsst nur die Linien selbst kreiden.', 'The neighbouring club lends you the pitch. You only have to chalk the lines yourselves.')) },
          { w: 1, run: (c) => (book(c, tr('Platzmiete Ausweichplatz', 'Pitch hire: alternative ground'), -60), adjustMood(c, 0.06), tr('Kunstrasen! Die Jungs spielen wie auf Schienen. Einer fragt, ob man den nicht kaufen kann.', 'Artificial turf! The lads play as if on rails. One asks if you can buy it.')) },
          { w: 1, run: (c, ctx, rng) => { book(c, tr('Platzmiete Ausweichplatz', 'Pitch hire: alternative ground'), -60); const [a, b] = some(c, rng, 2); if (a != null) sitOut(c, a, 'late'); if (b != null) sitOut(c, b, 'late'); return lateOr(c, tr('Der Schlüssel zum Nachbarplatz ist beim Wirt. Der Wirt ist beim Angeln. Zwei kommen erst zur zweiten Halbzeit.', 'The key to the other pitch is with the landlord. The landlord is out fishing. Two turn up only for the second half.'), tr('Der Schlüssel zum Nachbarplatz ist beim Wirt. Der Wirt ist beim Angeln. Zwei kommen zu spät und stehen nicht auf dem Spielbericht.', 'The key to the other pitch is with the landlord. The landlord is out fishing. Two turn up too late and are not on the match report.')); } },
        ]),
      },
      {
        label: tr('Selbst herrichten: Arbeitseinsatz mit Sand und Besen', 'Fix it up yourselves: work party with sand and brooms'),
        effect: outcome([
          { w: (c) => (holderOf(c, 'platzwart') ? 3 : 0), run: (c) => (adjustMood(c, 0.06), tr('Der Platzwart hat Drainage-Tricks im Kopf, die niemand kennt. Um 14 Uhr ist der Platz bespielbar. Er will keinen Dank, nur eine Bratwurst.', 'The groundsman has drainage tricks nobody knows. By 2pm the pitch is playable. He wants no thanks, only a bratwurst.')) },
          { w: 2, run: (c) => (adjustEnergy(c, -3), adjustMood(c, 0.06), tr('Zwanzig Mann, vierzig Schubkarren Sand. Der Platz ist okay und die Truppe zusammengeschweißt.', 'Twenty men, forty wheelbarrows of sand. The pitch is fine and the squad is welded together.')) },
          { w: 1, run: (c, ctx, rng) => { adjustEnergy(c, -3); const s = rng.pick(squad(c)); hurt(c, s); return tr(`Beim Karren ziehen verhebt sich ${first(c, s)} den Rücken. Platz gut, Spieler hin.`, `Pulling a barrow, ${first(c, s)} wrenches his back. Pitch good, player gone.`); } },
        ]),
      },
      {
        label: tr('Verlegung auf Mittwochabend beantragen', 'Ask to move the match to Wednesday evening'),
        effect: outcome([
          { w: 2, run: (c, ctx, rng) => { for (const i of some(c, rng, 2)) sitOut(c, i, 'no'); adjustMood(c, -0.03); return tr('Der Gegner stimmt zu: Mittwoch, 19:30 Uhr. Zwei haben Spätschicht und fehlen.', 'The opposition agree: Wednesday, 7:30pm. Two are on late shift and miss it.'); } },
          { w: 1, run: (c) => (adjustMood(c, -0.04), team(c, -0.15), tr('Der Kreis lehnt ab. Es wird gespielt, auf einem Acker, der aussieht wie ein Reisfeld.', 'The league refuses. The match goes ahead, on a field that looks like a paddy.')) },
        ]),
      },
    ],
  }),

  flutlicht_defekt: seasonal('flutlicht_defekt', {
    weight: 6,
    needs: (c) => (hasFacility(c, 'flutlicht') && c.round >= 2 && !seasonDone(c, 'flutlicht_defekt') ? {} : null),
    text: () => tr('Samstag vor dem Abendspiel: Beim Probelauf bleibt Mast drei dunkel. Der Elektriker hat „frühestens Dienstag" Zeit.', 'Saturday before the evening match: at the test run, pylon three stays dark. The electrician has "Tuesday at the earliest".'),
    options: [
      {
        label: tr('Notdienst rufen (95 €)', 'Call the emergency service (€95)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Elektriker: Notdienst Flutlicht', 'Electrician: emergency floodlight repair'), -95), tr('Um 17 Uhr brennt Mast drei wieder. Der Elektriker bleibt zur Bratwurst.', 'By 5pm pylon three is back on. The electrician stays for a bratwurst.')) },
          { w: 1, run: (c) => (book(c, tr('Elektriker: Notdienst mit Zuschlag', 'Electrician: emergency call-out with surcharge'), -140), tr('Wochenendzuschlag, Anfahrt, Sicherung: 140 €. Das Licht geht trotzdem.', 'Weekend surcharge, call-out fee, fuse: €140. The lights do work, though.')) },
        ]),
      },
      {
        label: tr('Autos mit Fernlicht am Spielfeldrand', 'Cars with headlights at the touchline'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.08), neighbors(c, -1), tr('Zwölf Autos im Halbkreis, die Hupe als Torjubel. Die Stimmung ist legendär, die Nachbarn weniger.', 'Twelve cars in a half-circle, the horn as goal celebration. The atmosphere is legendary, the neighbours less so.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.04), neighbors(c, -2), supporters(c, 1), tr('Ein Fan fährt mit Anhänger vor – Flutlicht vom Bau. Die Nachbarn rufen das Ordnungsamt, der Fan tritt dem Förderverein bei.', 'A fan turns up with a trailer – building-site lights. The neighbours ring the council, the fan joins the supporters\' club.')) },
        ]),
      },
      {
        label: tr('Anstoß auf 14 Uhr vorziehen', 'Move kick-off forward to 2pm'),
        effect: outcome([
          { w: 2, run: (c, ctx, rng) => { for (const i of some(c, rng, 2)) sitOut(c, i, 'no'); adjustMood(c, -0.03); return tr('Der Gegner ist einverstanden. Zwei können am Nachmittag nicht – Hochzeit der Cousine.', 'The opposition agree. Two cannot make the afternoon – a cousin\'s wedding.'); } },
          { w: 1, run: (c) => (book(c, tr('Mehr Zuschauer am Nachmittag', 'More spectators in the afternoon'), 25), tr('Nachmittags kommen die Familien mit Kinderwagen. Kuchenverkauf: 25 € Plus.', 'In the afternoon the families come with prams. Cake sales: €25 profit.')) },
        ]),
      },
    ],
  }),

  trainerschein: seasonal('trainerschein', {
    weight: 5,
    needs: (c, rng) => {
      if (level(c) < 2 || c.round < 1 || c.round > rounds(c) - 3 || seasonDone(c, 'trainerschein')) return null;
      const list = squad(c).filter((i) => playerOf(c, i).age >= 20 && playerOf(c, i).age <= 40);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: (c, ctx) => tr(`${first(c, ctx.s)} will den Trainerschein machen, die C-Lizenz. Der Lehrgang kostet 120 €. Er fragt, ob der Verein was dazugibt.`, `${first(c, ctx.s)} wants to take his coaching badge, the C licence. The course costs €120. He asks whether the club will chip in.`),
    options: [
      {
        label: tr('Lehrgang komplett zahlen (120 €)', 'Pay the whole course (€120)'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (book(c, tr('Trainerlehrgang', 'Coaching course'), -120), (c.players[ctx.s].loyal = true), adjustForm(c, ctx.s, 0.2), adjustMood(c, 0.04), tr(`${first(c, ctx.s)} kommt mit einem Ordner voller Übungen zurück. Zwei davon sind sogar brauchbar.`, `${first(c, ctx.s)} returns with a folder full of drills. Two of them are even usable.`)) },
          { w: 1, run: (c, ctx) => (book(c, tr('Trainerlehrgang', 'Coaching course'), -120), adjustMood(c, -0.03), tr(`${first(c, ctx.s)} erklärt jetzt jede Woche, wie man „das eigentlich richtig" macht. Die Kabine seufzt.`, `${first(c, ctx.s)} now explains every week how it should "really" be done. The dressing room sighs.`)) },
          { w: (c) => (canLose(c) ? 0.4 : 0), run: (c, ctx) => (book(c, tr('Trainerlehrgang', 'Coaching course'), -120), leaveTeam(c, ctx.s) ? tr(`Mit dem Schein in der Tasche bekommt ${first(c, ctx.s)} ein Angebot als Trainer beim Nachbarn. Er sagt zu. Ihr habt ihn ausgebildet.`, `With the badge in his pocket ${first(c, ctx.s)} gets an offer to coach next door. He accepts. You trained him.`) : tr('Er bleibt, vorerst.', 'He stays, for now.')) },
        ]),
      },
      {
        label: tr('Die Hälfte zahlen (60 €)', 'Pay half (€60)'),
        effect: outcome([
          { w: 2, run: (c, ctx) => (book(c, tr('Trainerlehrgang (Zuschuss)', 'Coaching course (contribution)'), -60), adjustMood(c, 0.02), adjustForm(c, ctx.s, 0.1), tr(`${first(c, ctx.s)} nimmt es an und erzählt jedem, wie viel das gespart hat.`, `${first(c, ctx.s)} accepts and tells everyone how much it saved.`)) },
          { w: 1, run: (c, ctx) => (book(c, tr('Trainerlehrgang (Zuschuss)', 'Coaching course (contribution)'), -60), (c.players[ctx.s].grumpy = 1), tr('„Die Hälfte? Dann lerne ich eben nur die Hälfte." Er lacht nicht ganz.', '"Half? Then I will just learn half." He does not quite laugh.')) },
        ]),
      },
      {
        label: tr('Nein – wir brauchen dich auf dem Platz', 'No – we need you on the pitch'),
        effect: outcome([
          { w: 2, run: (c, ctx) => ((c.players[ctx.s].grumpy = 2), tr(`${first(c, ctx.s)} ist enttäuscht. „Dann halt nicht."`, `${first(c, ctx.s)} is disappointed. "Fine, then."`)) },
          { w: 1, run: (c, ctx) => ((c.players[ctx.s].loyal = true), tr(`${first(c, ctx.s)} bezahlt den Lehrgang selbst. Der Verein bekommt ihn trotzdem.`, `${first(c, ctx.s)} pays for the course himself. The club still gets him.`)) },
        ]),
      },
    ],
  }),

  kabine_undicht: seasonal('kabine_undicht', {
    weight: 5,
    needs: (c) => (c.round >= 3 && !hasFacility(c, 'kabine') && !seasonDone(c, 'kabine_undicht') ? {} : null),
    text: () => tr('Es tropft in der Kabine. Auf Bank drei, genau auf die Tasche des Kapitäns. Der Eimer darunter ist seit September voll.', 'The dressing room leaks. On bench three, right onto the captain\'s bag. The bucket underneath has been full since September.'),
    options: [
      {
        label: tr('Dachdecker holen (110 €)', 'Get a roofer in (€110)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Dachdecker Kabine', 'Roofer for the dressing room'), -110), adjustMood(c, 0.04), tr('Zwei Ziegel, ein Eimer Teer. Es tropft nicht mehr. Der Eimer bleibt aus Gewohnheit.', 'Two tiles, a bucket of tar. It no longer drips. The bucket stays out of habit.')) },
          { w: 1, run: (c) => (book(c, tr('Dachdecker Kabine', 'Roofer for the dressing room'), -150), adjustMood(c, 0.02), tr('Der Dachdecker findet noch zwei Löcher. 150 €, dafür bleibt der Boden endlich trocken.', 'The roofer finds two more holes. €150, but at least the floor stays dry.')) },
        ]),
      },
      {
        label: tr('Eimer, Folie und ein Arbeitseinsatz', 'Buckets, tarpaulin and a work party'),
        effect: outcome([
          { w: 2, run: (c) => (adjustEnergy(c, -3), adjustMood(c, 0.05), tr('Samstag auf dem Dach, Sonntag Bratwurst. Die Folie hält. Vorerst.', 'Saturday on the roof, Sunday bratwurst. The tarpaulin holds. For now.')) },
          { w: 1, run: (c) => (adjustEnergy(c, -3), adjustMood(c, -0.05), tr('Die Folie hält bis zum ersten Sturm. Danach hängt sie am Nachbarsgarten.', 'The tarpaulin holds until the first gale. After that it hangs in the neighbour\'s garden.')) },
        ]),
      },
      {
        label: tr('Aushalten, ist ja nur Wasser', 'Put up with it, it is only water'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, -0.06), tr('Die Jungs ziehen sich ab jetzt im Auto um. Die Laune sinkt mit dem Wasserstand.', 'The lads now change in their cars. Morale sinks with the water level.')) },
          { w: 1, run: (c, ctx, rng) => { const s = rng.pick(squad(c)); hurt(c, s); return tr(`${first(c, s)} erkältet sich auf der nassen Bank und liegt Sonntag mit Fieber im Bett.`, `${first(c, s)} catches a cold on the wet bench and is in bed with a fever on Sunday.`); } },
        ]),
      },
    ],
  }),

  // --- Höhere Ligen -------------------------------------------------------------------
  schiri_mangel: seasonal('schiri_mangel', {
    weight: 5,
    needs: (c, rng) => {
      if (level(c) < 2 || c.round < 2 || seasonDone(c, 'schiri_mangel')) return null;
      const list = squad(c);
      return list.length ? { s: rng.pick(list) } : null;
    },
    text: () => tr('Der Kreis meldet Schiedsrichtermangel: Für euer Heimspiel ist niemand eingeteilt. Stellt ihr einen eigenen Mann, ist das Spiel gesichert – sonst droht der Ausfall.', 'The league reports a shortage of referees: nobody is assigned to your home match. If you provide your own man the match is safe – otherwise it may be called off.'),
    options: [
      {
        label: tr('Einen aus dem Kader pfeifen lassen', 'Let one of the squad referee'),
        effect: outcome([
          { w: 3, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, 0.04), tr(`${first(c, ctx.s)} pfeift mit Pfeife vom Hund seiner Tante. Der Gegner lobt: „So fair war hier noch keiner."`, `${first(c, ctx.s)} blows a whistle from his aunt's dog. The opposition praise him: "Nobody has been this fair here before."`)) },
          { w: 2, run: (c, ctx) => (sitOut(c, ctx.s), adjustMood(c, -0.04), tr(`${first(c, ctx.s)} will keinen Heimvorteil geben und pfeift gegen euch jeden Einwurf. Zwei Gelbe für euch, null für die Gäste.`, `${first(c, ctx.s)} refuses to give you a home edge and whistles every throw-in against you. Two yellows for you, none for the visitors.`)) },
          { w: 1, run: (c, ctx) => (sitOut(c, ctx.s), book(c, tr('Kreis: Prämie für neuen Schiedsrichter', 'League: bonus for a new referee'), 25), tr(`${first(c, ctx.s)} findet es herrlich, einmal Chef zu sein, und meldet sich zum Schiri-Lehrgang. Der Kreis zahlt 25 € Prämie.`, `${first(c, ctx.s)} loves being the boss for once and signs up for a referee course. The league pays a €25 bonus.`)) },
        ]),
      },
      {
        label: tr('Den Vater eines Jugendspielers fragen (15 €)', 'Ask a youth player\'s dad (€15)'),
        effect: outcome([
          { w: 2, run: (c) => (book(c, tr('Aufwandsentschädigung Schiri', 'Referee expenses'), -15), tr('Er pfeift seit 30 Jahren die D-Jugend und gibt sich Mühe. Alle sind zufrieden. Er will eine Quittung.', 'He has whistled the under-12s for 30 years and tries hard. Everyone is happy. He wants a receipt.')) },
          { w: 1, run: (c) => (book(c, tr('Aufwandsentschädigung Schiri', 'Referee expenses'), -15), adjustMood(c, -0.04), tr('Sein Sohn spielt für euch. Der Gegner protestiert beim Kreis, bevor der Ball rollt.', 'His son plays for you. The opposition protest to the league before the ball rolls.')) },
        ]),
      },
      {
        label: tr('Spiel ausfallen lassen', 'Let the match be called off'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Verbandsstrafe: Spielausfall', 'League fine: match called off'), -30), adjustMood(c, -0.05), tr('Das Spiel wird neu angesetzt, 30 € Verwaltungsgebühr. Die Zuschauer gehen heim.', 'The match is rearranged, €30 admin fee. The spectators go home.')) },
          { w: 1, run: (c, ctx, rng) => { for (const i of some(c, rng, 2)) sitOut(c, i, 'no'); return tr('Neuer Termin: Mittwoch, 19:30 Uhr. Zwei haben da Spätschicht.', 'New date: Wednesday, 7:30pm. Two are on late shift.'); } },
        ]),
      },
    ],
  }),

  lizenzpflicht: seasonal('lizenzpflicht', {
    weight: 6,
    needs: (c) => (level(c) >= 4 && c.round >= 1 && c.round <= rounds(c) - 4 && !seasonDone(c, 'lizenzpflicht') ? {} : null),
    text: (c) => tr(`Der Kreis erinnert: In der ${c.league} braucht der Trainer eine gültige Lizenz. Deine ist abgelaufen – oder war nie da. Im Frühjahr wird kontrolliert.`, `The league reminds you: in the ${c.league} the manager needs a valid licence. Yours has run out – or was never there. Checks come in spring.`),
    options: [
      {
        label: tr('Lehrgang buchen (150 €, drei Abende)', 'Book a course (€150, three evenings)'),
        effect: outcome([
          { w: 3, run: (c) => (book(c, tr('Trainerlizenz: Lehrgang', 'Coaching licence: course'), -150), adjustEnergy(c, -5), adjustMood(c, 0.04), tr('Bestanden, Note 2. Der Prüfer lobt deine Aufstellung, zweifelt aber an deiner Handschrift.', 'Passed, grade B. The examiner praises your line-up but doubts your handwriting.')) },
          { w: 1, run: (c) => (book(c, tr('Trainerlizenz: Lehrgang und Wiederholung', 'Coaching licence: course and resit'), -200), adjustEnergy(c, -5), adjustPatience(c, -4), tr('Durchgefallen in Theorie. Die Wiederholung kostet 50 € – und zu Hause hängt der Haussegen schief.', 'Failed the theory paper. The resit costs €50 – and things are frosty at home.')) },
        ]),
      },
      {
        label: tr('Co-Trainer mit Lizenz melden', 'Register a co-manager with a licence'),
        effect: outcome([
          { w: (c) => (holderOf(c, 'cotrainer') ? 3 : 0), run: (c) => (adjustMood(c, 0.03), tr('Dein Co-Trainer hat den Schein. Der Kreis trägt ihn ein. Du darfst weiter brüllen, er zeichnet.', 'Your co-manager holds the badge. The league registers him. You carry on shouting, he signs.')) },
          { w: (c) => (holderOf(c, 'cotrainer') ? 1 : 0), run: (c) => (book(c, tr('Lizenz: Nachmeldegebühr', 'Licence: late registration fee'), -30), tr('Der Schein deines Co-Trainers ist seit März abgelaufen. Der Kreis nimmt 30 € Nachmeldegebühr und ein Passfoto.', 'Your co-manager\'s badge ran out in March. The league takes a €30 late fee and a passport photo.')) },
          { w: (c) => (holderOf(c, 'cotrainer') ? 0 : 3), run: (c) => (book(c, tr('Lizenzträger vom Nachbarverein', 'Licence holder from the neighbouring club'), -80), tr('Ihr habt keinen Co-Trainer. Ein Lizenzträger vom Nachbarn setzt sich für 80 € auf die Bank. Er sagt nie etwas.', 'You have no co-manager. A licence holder from next door sits on your bench for €80. He never says a word.')) },
          { w: (c) => (holderOf(c, 'cotrainer') ? 0 : 1), run: (c) => (adjustMood(c, 0.02), tr('Ein Lizenzträger vom Nachbarn kommt umsonst – wenn du ihm hinterher das Spiel erklärst. Du erklärst bis Mitternacht.', 'A licence holder from next door comes for free – if you explain the match to him afterwards. You explain until midnight.')) },
        ]),
      },
      {
        label: tr('Ignorieren, wird schon keiner merken', 'Ignore it, nobody will notice'),
        effect: outcome([
          { w: 2, run: (c) => (tr('Niemand kontrolliert. Diesmal.', 'Nobody checks. This time.')) },
          { w: 1, run: (c) => (book(c, tr('Verbandsstrafe: fehlende Lizenz', 'League fine: missing licence'), -60), adjustMood(c, -0.04), tr('Die Kontrolle kommt unangemeldet. 60 € Strafe, und der Kreis schickt eine freundliche, lange Mail.', 'The check arrives unannounced. €60 fine, and the league sends a friendly, very long e-mail.')) },
          { w: 1, run: (c) => (adjustMood(c, 0.02), tr('Der Kontrolleur ist Fan und drückt ein Auge zu. „Aber nächstes Jahr bitte."', 'The inspector is a fan and turns a blind eye. "But next year, please."')) },
        ]),
      },
    ],
  }),

  hospitation: seasonal('hospitation', {
    weight: 5,
    needs: (c) => (level(c) >= 3 && c.round >= 1 && c.round <= rounds(c) - 3 && !seasonDone(c, 'hospitation') ? {} : null),
    text: () => tr('Der Trainer eines Vereins aus der Liga darüber möchte bei eurem Training zuschauen und Notizen machen. „Hospitation, steht in meinem Lehrgang." Er hat ein Klemmbrett dabei.', 'The manager of a club from the league above wants to watch your training and take notes. "Observation, it is part of my course." He has brought a clipboard.'),
    options: [
      {
        label: tr('Gern, sogar mit Kaffee', 'Gladly, even with coffee'),
        effect: outcome([
          { w: 3, run: (c) => (adjustMood(c, 0.04), team(c, 0.15), tr('Er bringt eine Passübung mit, die wirklich funktioniert. Beim Abschied nimmt er sich zwei Tassen Kaffee mit.', 'He brings a passing drill that really works. On the way out he takes two cups of coffee.')) },
          { w: 1, run: (c) => (adjustMood(c, -0.05), tr('Seine Notizen landen als Kritik im Netz: „Laufwege wie auf dem Wochenmarkt." Die Kabine liest mit.', 'His notes end up online as a review: "Running lines like a weekly market." The dressing room reads along.')) },
        ]),
      },
      {
        label: tr('Nur gegen einen Gegenbesuch', 'Only in return for a visit'),
        effect: outcome([
          { w: 2, run: (c) => (adjustMood(c, 0.05), adjustEnergy(c, 3), tr('Du darfst bei ihm zuschauen. Drei Stunden Trainerfachsimpeln im Auto danach – du fährst beschwingt heim.', 'You get to watch at his place. Three hours of coaching shop talk in the car afterwards – you drive home buoyed up.')) },
          { w: 1, run: (c) => (tr('Er sagt zu und meldet sich nie wieder. Das Klemmbrett bleibt bei ihm.', 'He agrees and is never heard from again. The clipboard stays with him.')) },
        ]),
      },
      {
        label: tr('Nein – Trainingsgeheimnisse', 'No – training secrets'),
        effect: outcome([
          { w: 2, run: () => tr('Er schaut vom Parkplatz aus zu. Mit Fernglas.', 'He watches from the car park. With binoculars.') },
          { w: 1, run: (c) => (adjustMood(c, -0.03), tr('Er kommt trotzdem und filmt vom Hügel. Die Jungs winken freundlich in die Kamera.', 'He comes anyway and films from the hill. The lads wave politely at the camera.')) },
        ]),
      },
    ],
  }),
};
