// Liveticker: macht aus den Spielereignissen kurze Kommentarzeilen – für simulierte
// Partien, die man nicht selbst spielt. Nutzt einen eigenen Zufall, damit der
// Ticker das Ergebnis nicht verändert.
import { TRICKS } from './tricks.js';
import { MATCH_INJURIES } from './knocks.js';
import { bondOf, isBad, isGood } from './bonds.js';
import { tr } from '../core/i18n.js';
import { createRng } from '../core/rng.js';
import { attackDir } from './players.js';
import { findAnyPlayer } from './squad.js';

export const tickerMinute = (m, t = m.time) => Math.min(90, Math.floor((t / m.duration) * 90) + 1);
const scoreText = (m) => tr(`${m.score[0]}:${m.score[1]}`, `${m.score[0]}-${m.score[1]}`);
const last = (p) => p.name.split(' ').slice(1).join(' ') || p.name;

const pools = {
  save: tr(
    ['{gk} ist unten und hält.', '{gk} pariert stark!', 'Glanzparade von {gk}!', '{gk} faustet den Ball weg.', '{gk} ist zur Stelle.'],
    ['{gk} gets down and saves.', 'Strong save from {gk}!', 'Superb stop by {gk}!', '{gk} punches it clear.', '{gk} is equal to it.'],
  ),
  punch: tr(['{gk} steigt hoch und faustet den Ball weg!', 'Fäuste raus – {gk} klärt im Getümmel.', '{gk} faustet, der Ball fliegt bis zur Mittellinie.'], ['{gk} rises and punches it away!', 'Fists out – {gk} clears in the crowd.', '{gk} punches, the ball flies to halfway.']),
  high: tr(['{gk} pflückt den Ball aus der Luft.', 'Hoch gesprungen – {gk} hat ihn.', '{gk} holt sich den hohen Ball.'], ['{gk} plucks it out of the air.', 'Up he goes – {gk} has it.', '{gk} claims the high ball.']),
  catch: tr(['{gk} fängt sicher.', 'Kein Problem für {gk}.', '{gk} packt zu.'], ['{gk} holds on comfortably.', 'No trouble for {gk}.', '{gk} gathers it.']),
  wide: tr(['Knapp vorbei!', 'Drüber. Weit drüber.', 'Vorbei – der Ball rollt bis zum Zaun.', 'Das war eher eine Flanke.'], ['Just wide!', 'Over. Well over.', 'Wide – the ball rolls all the way to the fence.', 'That was more of a cross.']),
  quiet: tr(
    [
      '{team} schiebt den Ball hinten rum. Vorne wartet man auf Ideen.',
      'Viel Mittelfeld, wenig Strafraum.',
      '{team} hat mehr vom Spiel, aber keinen Plan.',
      'Einer ruft „Hintermann!“ – ein bisschen zu spät.',
      'Ruhige Phase. Am Spielfeldrand wird über Bratwurst diskutiert.',
      '{team} drückt jetzt aufs Tempo.',
      'Zweikampf an der Seitenlinie. Keiner will zurückstecken.',
      'Ein Zuschauer ruft: „Spielt doch mal flach!“',
    ],
    [
      '{team} knock it around at the back. Up front they are waiting for ideas.',
      'Lots of midfield, not much penalty box.',
      '{team} have more of the ball but no plan.',
      'Someone shouts "Man on!" – a little too late.',
      'A quiet spell. On the touchline they are debating sausages.',
      '{team} are upping the tempo now.',
      'A tussle on the touchline. Nobody wants to back down.',
      'A spectator shouts: "Keep it on the floor!"',
    ],
  ),
};

export function createCommentator(m, seed = 1) {
  const rng = createRng(seed * 7919 + 17);
  const lines = [];
  let pendingShot = null; // { id, team, time, dist, header }
  let lastLine = 0;
  let started = false;
  // Nachname – bei Doppelungen im Spiel mit Initiale („J. Wagner").
  const everyone = [...m.players, ...m.bench.flat()];
  const surname = (p) => {
    if (!p) return '?';
    const l = last(p);
    return everyone.some((o) => o !== p && last(o) === l) ? `${p.name[0]}. ${l}` : l;
  };
  const pick = (arr, vars) => arr[rng.int(0, arr.length - 1)].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const who = (id) => findAnyPlayer(m, id);
  const team = (t) => m.teams[t]?.short ?? m.teams[t]?.name ?? '?';
  const add = (text, kind = 'info') => {
    lines.push({ minute: tickerMinute(m), text, kind });
    lastLine = m.time;
  };
  const keeperOf = (t) => m.players.find((p) => p.team === t && p.role === 'gk');

  const shotLine = (s) => {
    const p = who(s.id);
    const name = surname(p);
    if (s.header) return tr(`Kopfball ${name}!`, `Header from ${name}!`);
    if (s.acro === 'fallrueck') return pick(tr(['FALLRÜCKZIEHER von {p}!', '{p} hebt ab – Fallrückzieher!'], ['BICYCLE KICK from {p}!', '{p} takes off – overhead kick!']), { p: name });
    if (s.acro === 'seitfall') return pick(tr(['Seitfallzieher von {p}!', '{p} legt sich quer in die Luft – Seitfallzieher!'], ['Scissor kick from {p}!', '{p} goes horizontal – scissor kick!']), { p: name });
    if (s.dist > 14) return tr(`${name} versucht es aus ${s.dist} Metern …`, `${name} tries his luck from ${s.dist} metres …`);
    return pick(tr(['{p} zieht ab!', 'Schuss von {p}!', '{p} hält einfach drauf!'], ['{p} lets fly!', 'Shot from {p}!', '{p} just hits it!']), { p: name });
  };
  const resolveShot = (outcome, gkId) => {
    const s = pendingShot;
    pendingShot = null;
    if (!s) return;
    const gk = surname(who(gkId) ?? keeperOf(1 - s.team));
    if (outcome === 'punch') add(`${shotLine(s)} ${pick(pools.punch, { gk })}`, 'chance');
    else if (outcome === 'high') add(`${shotLine(s)} ${pick(pools.high, { gk })}`, 'chance');
    else if (outcome === 'save') add(`${shotLine(s)} ${pick(pools.save, { gk })}`, 'chance');
    else if (outcome === 'catch') add(`${shotLine(s)} ${pick(pools.catch, { gk })}`, 'chance');
    else if (outcome === 'post') add(`${shotLine(s)} ${tr('Pfosten!', 'Off the post!')}`, 'chance');
    else if (outcome === 'bar') add(`${shotLine(s)} ${tr('An die Latte!', 'Off the bar!')}`, 'chance');
    else if (outcome === 'wide' && (s.dist < 9 || rng.chance(0.2))) add(`${shotLine(s)} ${pick(pools.wide, {})}`, 'chance');
  };

  function feed(events) {
    if (!started) {
      started = true;
      const where = m.pitch?.name ? tr(` – ${m.pitch.name}`, ` – ${m.pitch.name}`) : '';
      add(tr(`Anpfiff! ${m.teams[0].name} gegen ${m.teams[1].name}${where}.`, `Kick-off! ${m.teams[0].name} v ${m.teams[1].name}${where}.`), 'whistle');
      if (m.surprise) add(m.surprise.text, 'info');
    }
    for (const e of events) {
      switch (e.type) {
        case 'shot': {
          resolveShot('wide');
          const p = who(e.playerId);
          const goalX = attackDir(m, p?.team ?? 0) * m.pitch.halfLength;
          const dist = p ? Math.round(Math.hypot(goalX - p.pos.x, p.pos.z)) : 10;
          pendingShot = { id: e.playerId, team: p?.team ?? 0, time: m.time, dist, acro: e.acro };
          break;
        }
        case 'header':
          if (e.onGoal) {
            resolveShot('wide');
            const p = who(e.playerId);
            pendingShot = { id: e.playerId, team: p?.team ?? 0, time: m.time, dist: 6, header: true };
          }
          break;
        case 'save':
        case 'catch':
          if (pendingShot) resolveShot(e.punch ? 'punch' : e.high ? 'high' : e.type, e.playerId);
          break;
        case 'post':
        case 'bar':
          if (pendingShot) resolveShot(e.type);
          else add(e.type === 'post' ? tr('Pfosten! Da hat nicht viel gefehlt.', 'Off the post! That was close.') : tr('Latte! Das Gebälk wackelt noch.', 'Off the bar! The woodwork is still shaking.'), 'chance');
          break;
        case 'goal': {
          pendingShot = null;
          const p = who(e.scorerId);
          const a = e.assistId && who(e.assistId);
          const name = surname(p);
          let text;
          if (e.ownGoal) text = tr(`Eigentor! ${name} lenkt den Ball ins eigene Netz. ${scoreText(m)}.`, `Own goal! ${name} turns it into his own net. ${scoreText(m)}.`);
          else {
            const how =
              e.acro === 'fallrueck'
                ? tr(' per FALLRÜCKZIEHER – was für ein Ding', ' with a BICYCLE KICK – what a goal')
                : e.acro === 'seitfall'
                  ? tr(' per Seitfallzieher – sehenswert', ' with a scissor kick – a beauty')
                  : e.via === 'header'
                ? tr(' per Kopf', ' with a header')
                : e.via === 'dribble'
                  ? tr(' – eiskalt eingeschoben', ' – slotted home coolly')
                  : ['save', 'block', 'tackle'].includes(e.via)
                    ? tr(' im Nachschuss', ' on the rebound')
                    : '';
            text = tr(`TOOOR für ${team(e.team)}! ${name} trifft${how}. ${scoreText(m)}.`, `GOAL for ${team(e.team)}! ${name} scores${how}. ${scoreText(m)}.`);
            if (a) text += tr(` Vorlage: ${surname(a)}.`, ` Assist: ${surname(a)}.`);
            const bond = bondOf(m, p, a);
            if (isGood(bond)) text += tr(' Die beiden sind Kumpels – blind verstanden.', ' Those two are mates – they found each other blindfolded.');
            else if (isBad(bond)) text += tr(' Ausgerechnet vom Rivalen aufgelegt. Abgeklatscht wird nicht.', ' Set up by his rival, of all people. No high five.');
            if (p?.story?.former) text += tr(' Ausgerechnet der Ex! Er jubelt demonstrativ vor der alten Bank.', ' The old boy, of all people! He celebrates right in front of his old bench.');
            else if (p?.story?.nemesis) text += tr(` Schon wieder ${name} – das ${p.story.nemesis + 1}. Tor gegen dieses Team.`, ` ${name} again – his goal number ${p.story.nemesis + 1} against this lot.`);
            else if (p?.story?.exClub) text += tr(' Gegen den Ex-Verein! Er hält sich den Finger vor den Mund.', ' Against his old club! Finger to the lips.');
          }
          add(text, 'goal');
          break;
        }
        case 'offside': {
          const p = who(e.playerId);
          add(pick(tr(['Pfiff – {p} stand im Abseits.', 'Abseits! {p} war zu früh gestartet.', '{p} läuft durch, aber der Schiri pfeift: Abseits.'], ['Whistle – {p} was offside.', 'Offside! {p} went too early.', '{p} runs through, but the referee blows: offside.']), { p: surname(p) }), 'foul');
          break;
        }
        case 'offside_missed': {
          const p = who(e.playerId);
          add(pick(tr(['Das war Abseits – aber ohne Linienrichter sieht der Schiri es nicht. {p} läuft weiter.', 'Die Abwehr hebt die Arme: Abseits! Der Schiri lässt laufen.'], ['That was offside – but with no linesman the referee misses it. {p} carries on.', 'The defence raise their arms: offside! The referee waves play on.']), { p: surname(p) }), 'foul');
          break;
        }
        case 'foul': {
          const p = who(e.playerId);
          const v = who(e.victimId);
          if (e.penalty) add(pick(tr(['ELFMETER! {p} legt {v} im Strafraum.', 'Strafstoß! {p} holt {v} von den Beinen.', 'Der Pfiff ist eindeutig: Elfmeter nach Foul von {p} an {v}.'], ['PENALTY! {p} brings down {v} in the box.', 'Spot kick! {p} takes {v}\'s legs away.', 'No doubt about it: penalty after {p} fouls {v}.']), { p: surname(p), v: surname(v) }), 'foul');
          else if (e.kind === 'hold') add(tr(`${surname(p)} hält ${surname(v)} am Trikot fest – Freistoß.`, `${surname(p)} tugs ${surname(v)}'s shirt – free kick.`), 'foul');
          else add(pick(tr(['Foul von {p} an {v}. Freistoß.', '{p} erwischt {v} am Knöchel. Freistoß.', '{p} geht zu hart rein – {v} liegt.'], ['Foul by {p} on {v}. Free kick.', '{p} catches {v} on the ankle. Free kick.', '{p} goes in too hard – {v} is down.']), { p: surname(p), v: surname(v) }), 'foul');
          break;
        }
        case 'injury': {
          const p = who(e.playerId);
          const label = MATCH_INJURIES[e.kind]?.label ?? '';
          add(e.out ? pick(tr(['{p} bleibt liegen und hält sich das Bein. {l}. Für ihn geht es nicht weiter.', 'Autsch. {p} ({l}) muss behandelt werden – das war es für heute.'], ['{p} stays down clutching his leg. {l}. He cannot carry on.', 'Ouch. {p} ({l}) needs treatment – that is it for today.']), { p: surname(p), l: label }) : tr(`${surname(p)} hat was abbekommen (${label}) – humpelt aber weiter.`, `${surname(p)} took a knock (${label}) – but limps on.`), 'foul');
          break;
        }
        case 'injury_off':
          add(tr(`${surname(who(e.playerId))} geht vom Platz, kein Wechsel mehr möglich – ${team(e.team)} spielt in Unterzahl.`, `${surname(who(e.playerId))} goes off with no subs left – ${team(e.team)} are a man down.`), 'red');
          break;
        case 'sub':
          if (e.forced) add(tr(`Verletzungsbedingter Wechsel bei ${team(e.team)}: ${surname(who(e.inId))} kommt für ${surname(who(e.outId))}.`, `Injury substitution for ${team(e.team)}: ${surname(who(e.inId))} replaces ${surname(who(e.outId))}.`));
          else if (rng.chance(0.5)) add(tr(`Wechsel bei ${team(e.team)}: ${surname(who(e.inId))} für ${surname(who(e.outId))}.`, `Substitution for ${team(e.team)}: ${surname(who(e.inId))} for ${surname(who(e.outId))}.`));
          break;
        case 'no_goal':
          add(tr(`${surname(who(e.playerId))} trifft aus der eigenen Hälfte – zählt aber nicht. Abstoß.`, `${surname(who(e.playerId))} scores from inside their own half – but it doesn't count. Goal kick.`), 'foul');
          break;
        case 'no_call':
          if (rng.chance(0.35)) add(m.referee ? tr(`${surname(who(e.playerId))} legt ${surname(who(e.victimId))} um – der Schiri lässt laufen.`, `${surname(who(e.playerId))} takes out ${surname(who(e.victimId))} – the ref waves play on.`) : tr(`${surname(who(e.victimId))} beschwert sich – ohne Schiri geht es einfach weiter.`, `${surname(who(e.victimId))} complains – with no ref, play just goes on.`), 'foul');
          break;
        case 'card': {
          const name = surname(who(e.playerId));
          if (e.color === 'yellow') add(tr(`Gelb für ${name}.`, `Yellow card for ${name}.`), 'card');
          else add(tr(`Gelb-Rot! ${name} muss vom Platz.`, `Second yellow! ${name} is sent off.`), 'red');
          break;
        }
        case 'setpiece':
          if (e.kind === 'corner' && rng.chance(0.6)) add(tr(`Ecke für ${team(e.team)}.`, `Corner to ${team(e.team)}.`));
          break;
        case 'car':
          add(tr(`Der Ball knallt gegen einen Kotflügel. Parkplatzregel: Freistoß für ${team(e.team)}.`, `The ball smacks into a wing mirror. Car park rules: free kick to ${team(e.team)}.`), 'incident');
          break;
        case 'incident':
          if (e.text) add(e.text, 'incident');
          break;
        case 'trick': {
          const p = surname(who(e.playerId));
          const v = surname(who(e.victimId));
          const t = TRICKS[e.trick]?.label ?? '';
          if (!e.victimId) {
            if (e.ok && rng.chance(0.4)) add(pick(tr(['{p} zeigt einen {t} – einfach so, fürs Publikum.', 'Kunststück von {p}: {t}. Die Zuschauer klatschen.'], ['{p} shows off a {t} – just for the crowd.', 'Party trick from {p}: a {t}. The crowd applauds.']), { p, t }));
          } else if (e.ok && rng.chance(0.6)) add(pick(tr(['{p} lässt {v} mit einem {t} stehen!', '{t} von {p} – {v} sucht noch den Ball.', 'Oha, {p}! {t}, und {v} ist aus dem Spiel.'], ['{p} leaves {v} for dead with a {t}!', 'What a {t} from {p} – {v} is still looking for the ball.', 'Ooh, {p}! A {t}, and {v} is out of the game.']), { p, v, t }), 'chance');
          else if (!e.ok && rng.chance(0.35)) add(pick(tr(['{p} will es mit einem {t} versuchen – hängen geblieben.', 'Zu viel gewollt: {p} verstolpert den {t}.'], ['{p} tries a {t} – and gets stuck.', 'Too clever by half: {p} fluffs the {t}.']), { p, t }));
          break;
        }
        case 'combo': {
          const a = surname(who(e.playerId));
          const w = surname(who(e.wallId));
          if (e.kind === 'onetwo' && rng.chance(0.7)) add(pick(tr(['Doppelpass {a} – {w} – {a}! Die Abwehr schaut hinterher.', '{a} spielt {w} an, läuft durch und bekommt ihn direkt zurück.', 'Schön kombiniert: {a} und {w} mit dem Doppelpass.'], ['One-two {a} – {w} – {a}! The defence is left watching.', '{a} plays it to {w}, keeps running and gets it straight back.', 'Lovely combination: {a} and {w} with the one-two.']), { a, w }), 'chance');
          else if (e.kind === 'layoff' && rng.chance(0.5)) add(pick(tr(['{a} lässt prallen, dreht ab – und {w} schickt ihn in die Tiefe.', 'Ablage, Abdrehen, Steilpass: {w} findet {a} hinter der Abwehr.'], ['{a} lays it off, spins – and {w} sends the ball in behind.', 'Lay-off, spin, through ball: {w} finds {a} behind the defence.']), { a, w }), 'chance');
          else if (e.kind === 'cutback' && rng.chance(0.5)) add(pick(tr(['{a} geht bis zur Grundlinie und legt flach zurück auf {w}.', 'Rückpass in den Rückraum – {w} läuft ein.'], ['{a} gets to the byline and cuts it back for {w}.', 'Cut-back into the danger zone – {w} arrives.']), { a, w }), 'chance');
          break;
        }
        case 'whiff':
          if (rng.chance(0.5)) add(tr(`Luftloch von ${surname(who(e.playerId))}! Der Ball bleibt einfach liegen.`, `Air shot from ${surname(who(e.playerId))}! The ball just sits there.`));
          break;
        case 'scrape':
          add(tr(`${surname(who(e.playerId))} schürft sich das Knie auf. Weiter geht's.`, `${surname(who(e.playerId))} takes the skin off his knee. Play on.`), 'foul');
          break;
        case 'tackle':
          if (rng.chance(0.15)) add(tr(`Saubere Grätsche von ${surname(who(e.playerId))}.`, `Clean sliding tackle from ${surname(who(e.playerId))}.`));
          break;
        case 'complain':
          if (e.line && rng.chance(0.3)) add(`${surname(who(e.playerId))}: „${e.line}“`);
          break;
        case 'halftime':
          resolveShot('wide');
          add(tr(`Halbzeit. Es steht ${scoreText(m)}. Kurz durchschnaufen, Wasser aus dem Kanister.`, `Half-time. It's ${scoreText(m)}. A breather and some water from the jerry can.`), 'whistle');
          break;
        case 'end':
          resolveShot('wide');
          add(tr(`Abpfiff! Endstand ${m.teams[0].short ?? m.teams[0].name} ${scoreText(m)} ${m.teams[1].short ?? m.teams[1].name}.`, `Full time! ${m.teams[0].short ?? m.teams[0].name} ${scoreText(m)} ${m.teams[1].short ?? m.teams[1].name}.`), 'whistle');
          break;
        default:
          break;
      }
    }
    // Schuss ohne Torwart, Pfosten oder Tor: nach anderthalb Sekunden ist er vorbei.
    if (pendingShot && m.time - pendingShot.time > 1.5) resolveShot('wide');
    // Lange nichts passiert? Dann ein Satz zur Lage.
    if (m.phase === 'play' && m.time - lastLine > m.duration / 9) {
      const st = m.stats.teams;
      const t = st[0].possession >= st[1].possession ? 0 : 1;
      add(pick(pools.quiet, { team: team(t) }));
    }
    return lines;
  }

  return { feed, lines };
}
