// HEUTE: Vereinsheim-Raum, nächstes Spiel, Ergebnisse, Saisonende und Aushang.
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { tr } from '../../core/i18n.js';
import { effectChips } from '../../career/consequences.js';
import { seasonReview } from '../../career/review.js';
import { reviewHTML } from '../review.js';
import { GOALS } from '../../career/board.js';
import { button, icon } from '../ds.js';
import { clubScene } from '../ClubScene.js';
import { phone } from '../world.js';
import { homeView } from '../prefs.js';
import { crestOf, crestSVG } from '../crest.js';
import { relegationNeeded, relegationOf } from '../../career/relegation.js';
import { LEAGUES } from '../../career/clubs.js';
import { clubById, humanClub, leagueOf, humanFixture, playerOf, seasonOver, table } from '../../career/career.js';
import { DESTINATIONS, tripChoose, tripStage, tripState, tripVerdict } from '../../career/trip.js';
import { eventView, moodLabel, moodText } from '../../career/events.js';
import { storyLabels } from '../../career/stories.js';
import { coachAge, legacy, legacyPrompt, stepDown, successionCandidates } from '../../career/legacy.js';
import { talk } from '../../career/pub.js';
import { weatherLine } from '../../career/weather.js';
import { derbyOf, isDerbyFixture } from '../../career/derby.js';
import { CUP_NAME, CUPS, cupOf, PRIZES, tournamentOpen, winterCupDue, winterCupRunning } from '../../career/tournament.js';
import { coachAway, energyLabel, patienceLabel } from '../../career/personal.js';
import { PITCHES } from '../../sim/pitch.js';
import { FIT_LOW, fitnessOf, fitnessPct } from '../../career/fitness.js';

// Zusagen, die nicht fit sind: eine echte Entscheidung (spielen lassen oder schonen?).
function unfitNote(c, club) {
  const low = club.squad.filter((idx) => c.week.availability[idx] !== 'no' && fitnessOf(c, idx) < FIT_LOW);
  if (!low.length) return '';
  const names = low.map((idx) => `${playerOf(c, idx).name.split(' ').at(-1)} (${fitnessPct(fitnessOf(c, idx))} %)`).join(', ');
  return tr(`Nicht ganz fit: ${names} – spielen lassen oder schonen?`, `Not fully fit: ${names} – play them or give them a rest?`);
}
import { hex, first, euro } from './shared.js';

export const homeScreens = {
  // HEUTE: das Vereinsheim als Raum (Szene), das Spiel (oder Ergebnisse/Saisonende) groß,
  // daneben letzte Ergebnisse, Aushang und was in der Gruppe auf dich wartet.
  hub() {
    const c = this.career;
    const over = seasonOver(c);
    const main = over ? this.seasonEnd() : this.results ? this.roundResults() : this.nextMatch();
    const mine = [];
    // Während der Ergebnisanzeige ist der eben gespielte Spieltag schon dabei.
    for (let i = Math.min(this.results ? c.round : c.round - 1, c.fixtures.length - 1); i >= 0 && mine.length < 5; i--) {
      const f = c.fixtures[i].find((x) => clubById(c, x.home).human || clubById(c, x.away).human);
      if (f?.result) mine.push({ f, i });
    }
    const letter = ({ f }) => {
      const home = clubById(c, f.home).human;
      const [a, b] = home ? [f.result.home, f.result.away] : [f.result.away, f.result.home];
      return a > b ? ['S', 'W', 'win'] : a < b ? ['N', 'L', 'loss'] : ['U', 'D', 'draw'];
    };
    const last = mine.length
      ? `<ul class="hub-results">${mine
          .map((x) => {
            const [de, en, cls] = letter(x);
            const h = clubById(c, x.f.home);
            const a = clubById(c, x.f.away);
            return `<li><i class="res ${cls}" title="${tr({ S: 'Sieg', U: 'Unentschieden', N: 'Niederlage' }[de], { W: 'win', D: 'draw', L: 'loss' }[en])}">${tr(de, en)}</i><span>${h.short} ${x.f.result.home}:${x.f.result.away} ${a.short}</span><small>${tr('Sp.', 'MD')} ${x.i + 1}</small></li>`;
          })
          .join('')}</ul>`
      : `<p class="t-2">${tr('Noch kein Spiel gespielt.', 'No games played yet.')}</p>`;
    const ev = c.week?.event;
    const pending = ev && ev.choice === null && !this.results;
    const side = `
      <div class="ui-card"><p class="t-cap">${tr('Letzte Ergebnisse', 'Recent results')}</p>${last}</div>
      ${pending ? `<button class="ui-card tap notify hub-pending" data-action="tab" data-value="chat"><p class="t-cap">${icon('phone', 16)} ${tr('Handy', 'Phone')}</p><p class="t-body">${tr('In der Gruppe wartet eine Entscheidung auf dich.', 'A decision is waiting for you in the group chat.')}</p></button>` : ''}
      ${this.noticeCard()}`;
    // Die Szene zeigt Tabellenplatz, Termin, Taktik und Handy als Objekte im Raum (ClubScene.js).
    const classic = homeView() === 'klassisch';
    return `<div class="hub${classic ? ' classic' : ''}"><div class="hub-scene">${clubScene(c, { results: this.results, classic })}</div><section class="hub-main">${main}</section><aside class="hub-side ui-stack tight">${side}</aside></div>`;
  },

  nextMatch() {
    const c = this.career;
    const f = humanFixture(c);
    const club = humanClub(c);
    const home = f.home === club.id;
    const opp = clubById(c, home ? f.away : f.home);
    const [hc, ac] = home ? [club, opp] : [opp, club];
    const venue = PITCHES[clubById(c, f.home).venue];
    const w = c.week;
    const avail = Object.values(c.week.availability);
    const count = (s) => avail.filter((a) => a === s).length;
    const place = table(c).findIndex((r) => r.club.human) + 1;
    // Ebene 3: Hinweise, die nur manchmal gelten – als kurze Liste unter dem Wichtigsten.
    const notes = [
      w.notice && w.notice.choice === null && !(w.event && w.event.choice === null) ? tr('Am Schwarzen Brett hängt etwas für dich.', 'Something on the notice board needs you.') : '',
      w.event && w.event.choice === null ? tr('In der Gruppe wartet eine Entscheidung auf dich.', 'A decision is waiting for you in the group chat.') : '',
      count('yes') < venue.format ? tr('Zu wenige Zusagen – es hilft jemand aus dem Bekanntenkreis aus.', 'Not enough players – someone from a mate\'s circle will help out.') : '',
      unfitNote(c, club),
    ].filter(Boolean);
    const stories = storyLabels(c);
    let actions;
    if (this.busy) actions = `<p class="busy">${this.busy}</p>`;
    else if (winterCupDue(c)) actions = `<p class="t-2">${tr('Erst entscheiden: Hallenturnier ja oder nein? Danach geht die Liga weiter.', 'Decide first: indoor tournament, yes or no? Then the league carries on.')}</p>`;
    else if (winterCupRunning(c)) actions = `${button(tr('Zum Hallenturnier', 'To the indoor tournament'), { kind: 'primary big block', action: 'tab', value: 'cup' })}<p class="t-2">${tr('Der nächste Ligaspieltag steigt nach dem Turnier.', 'The next league match is after the tournament.')}</p>`;
    else if (coachAway(c)) actions = `<p class="warn">${tr('Du bist diese Woche nicht da – der Kapitän stellt auf, du bekommst nur das Ergebnis.', 'You are away this week – the captain picks the team, you just get the result.')}</p>${button(tr('Ergebnis abwarten', 'Wait for the result'), { kind: 'secondary big block', action: 'onSimulate' })}`;
    else
      actions = `${button(tr('Anpfiff – an der Seitenlinie', 'Kick-off – on the touchline'), { kind: 'primary big block coach-play', action: 'onCoach' })}
        <div class="hub-alt">${button(tr('Liveticker mit Entscheidungen', 'Live ticker with decisions'), { action: 'onSimulate' })}${button(tr('Selbst spielen', 'Play it yourself'), { kind: 'self-play', action: 'onPlay' })}</div>`;
    return `
      <article class="ui-card match hub-match" style="--kit:${hex(club.kit.shirt)}">
        <p class="t-cap">${tr('Sonntag, 10:30 Uhr', 'Sunday, 10:30')} · ${tr('Spieltag', 'Matchday')} ${c.round + 1}${isDerbyFixture(c, f) ? ` · <b class="derby">${derbyOf(c).name}</b>` : ''}</p>
        <div class="hub-vs">
          <span>${crestSVG(crestOf(hc), { size: 44, short: hc.short, label: hc.name })}<b>${hc.short}</b></span>
          <i>–</i>
          <span>${crestSVG(crestOf(ac), { size: 44, short: ac.short, label: ac.name })}<b>${ac.short}</b></span>
        </div>
        <p class="t-body hub-opp">${home ? tr('Heimspiel', 'Home') : tr('Auswärts', 'Away')} ${tr('gegen', 'against')} <b>${opp.name}</b></p>
        <p class="t-2">${venue.name} · ${venue.surface.name} · ${venue.format} ${tr('gegen', 'v')} ${venue.format}</p>
        <p class="t-2 weather">${weatherLine(c.week?.weather)}</p>
        <div class="ui-chips hub-facts">
          <span class="ui-chip" style="--c:#5cc46a" title="${tr('Zusagen', 'in')}">${count('yes')} ${tr('Zusagen', 'in')}</span>
          ${count('late') ? `<span class="ui-chip" style="--c:#e0b020">${count('late')} ${tr('später', 'late')}</span>` : ''}
          <span class="ui-chip" style="--c:#d9534f">${count('no')} ${tr('Absagen', 'out')}</span>
          <span class="ui-chip plain">${tr('Stimmung', 'Spirit')}: <b class="mood mood-${moodLabel(c.mood ?? 0)}">${moodText(c.mood ?? 0)}</b></span>
        </div>
        ${c.goal?.season === c.season ? `<p class="t-2 goal-line">${tr('Saisonziel', 'Season target')}: <b>${GOALS[c.goal.type].name}</b> · ${tr('jetzt', 'now')} ${place}. ${tr('Platz', 'place')} <small>(${tr('Ziel', 'target')}: ${tr('bis Platz', 'top')} ${c.goal.target})</small></p>` : ''}
        ${notes.length ? `<ul class="hub-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
        ${stories.length ? `<ul class="stories">${stories.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
        ${this.meBars()}
        ${winterCupDue(c) ? `<div class="winter-cup"><p class="label">${tr('Winterpause', 'Winter break')}</p><p>${tr(`Am Wochenende: <b>${CUPS.halle.name}</b> in der ${CUPS.halle.place}. Acht Teams, Bande, Handballtore – ${CUPS.halle.prizes.winner} € für den Sieger.`, `This weekend: <b>${CUPS.halle.name}</b> at ${CUPS.halle.place}. Eight teams, boards, handball goals – €${CUPS.halle.prizes.winner} for the winner.`)}</p>
          <div class="ui-row">${button(tr('Anmelden', 'Enter'), { kind: 'primary', action: 'onCupStart', value: 'halle' })}${button(tr('Diesmal nicht', 'Not this time'), { action: 'onCupSkip', value: 'halle' })}</div></div>` : ''}
        <div class="hub-actions">${actions}</div>
      </article>`;
  },

  // Familie & Energie des Spielertrainers als kleine Balken.
  meBars() {
    const k = this.career.coach;
    if (!k) return '';
    const bar = (label, v, text) => `<div class="me-bar ${v < 25 ? 'low' : v < 50 ? 'mid' : ''}"><span>${label}</span><i style="--v:${v}%"></i><small>${text}</small></div>`;
    return `<div class="me-bars">${bar(tr('Familie', 'Family'), k.patience, patienceLabel(k.patience))}${bar(tr('Energie', 'Energy'), k.energy, energyLabel(k.energy))}</div>`;
  },

  roundResults() {
    const c = this.career;
    const round = this.results;
    return `
      <div class="ui-card hub-card results-clip">
        <p class="clip-mast">${tr('KREISBLATT', 'THE DISTRICT GAZETTE')}</p>
        <p class="t-cap">${tr('Ergebnisse Spieltag', 'Results, matchday')} ${c.round + 1}</p>
        <ul class="results">${round
          .map((f) => {
            const h = clubById(c, f.home);
            const a = clubById(c, f.away);
            const mine = h.human || a.human;
            return `<li class="${mine ? 'mine' : ''}"><span>${h.short}</span><b>${f.result.home} : ${f.result.away}</b><span>${a.short}</span></li>`;
          })
          .join('')}</ul>
        ${this.miniTable()}
        <div class="hub-actions">${button(tr('Weiter zur nächsten Woche', 'On to next week'), { kind: 'primary big block', action: 'onNextWeek' })}</div>
      </div>`;
  },

  seasonEnd() {
    const c = this.career;
    const t = table(c);
    const pos = t.findIndex((r) => r.club.human) + 1;
    const champ = t[0].club;
    const level = leagueOf(c).level;
    const last = pos === t.length;
    let msg;
    const rel = relegationOf(c);
    if (pos === 1 && level === 1) msg = tr('MEISTER! Aufstieg in die Kreisklasse C – eigener Rasenplatz, Schiri, 7 gegen 7. Die Runde im Vereinsheim geht aufs Haus.', 'CHAMPIONS! Promotion to District League C – your own grass pitch, a referee, 7-a-side. The round at the clubhouse is on the house.');
    else if (pos === 1 && level === 2) msg = tr('MEISTER der Kreisklasse C! Aufstieg in die Kreisklasse B – stärkere Gegner, mehr Zuschauer, mehr Geld.', 'District League C CHAMPIONS! Promotion to District League B – tougher opponents, bigger crowds, more money.');
    else if (pos === 1) msg = tr('MEISTER der Kreisklasse B! Ganz oben im Kanalbezirk. Die Schale bekommt einen Ehrenplatz im Vereinsheim.', 'District League B CHAMPIONS! The top of the Kanalbezirk. The trophy gets pride of place in the clubhouse.');
    else if (last && level > 1) msg = tr(`Letzter Platz – Abstieg in die ${LEAGUES[level - 1].name}. Kopf hoch, nächstes Jahr geht's wieder rauf.`, `Bottom of the table – relegated to the ${LEAGUES[level - 1].name}. Chin up, next year we go again.`);
    else if (rel?.done) msg = rel.kind === 'up'
      ? rel.won ? tr(`Vizemeister – und über die Relegation aufgestiegen (${rel.agg[0]}:${rel.agg[1]}${rel.pens ? `, i. E. ${rel.pens.ours}:${rel.pens.theirs}` : ''})! Ab jetzt ${LEAGUES[level + 1].name}.`, `Runners-up – and promoted via the play-off (${rel.agg[0]}-${rel.agg[1]}${rel.pens ? `, ${rel.pens.ours}-${rel.pens.theirs} on pens` : ''})! ${LEAGUES[level + 1].name} from now on.`) : tr(`Vizemeister, aber die Relegation verloren (${rel.agg[0]}:${rel.agg[1]}${rel.pens ? `, i. E. ${rel.pens.ours}:${rel.pens.theirs}` : ''}). Nächstes Jahr.`, `Runners-up, but lost the play-off (${rel.agg[0]}-${rel.agg[1]}${rel.pens ? `, ${rel.pens.ours}-${rel.pens.theirs} on pens` : ''}). Next year.`)
      : rel.won ? tr(`Klassenerhalt in der Relegation (${rel.agg[0]}:${rel.agg[1]}${rel.pens ? `, i. E. ${rel.pens.ours}:${rel.pens.theirs}` : ''}). Durchatmen!`, `Survived in the play-off (${rel.agg[0]}-${rel.agg[1]}${rel.pens ? `, ${rel.pens.ours}-${rel.pens.theirs} on pens` : ''}). Deep breath!`) : tr(`Relegation verloren (${rel.agg[0]}:${rel.agg[1]}${rel.pens ? `, i. E. ${rel.pens.ours}:${rel.pens.theirs}` : ''}) – Abstieg in die ${LEAGUES[level - 1].name}.`, `Lost the play-off (${rel.agg[0]}-${rel.agg[1]}${rel.pens ? `, ${rel.pens.ours}-${rel.pens.theirs} on pens` : ''}) – relegated to the ${LEAGUES[level - 1].name}.`);
    else if (pos === 2 && relegationNeeded(c)) msg = tr('Vizemeister! Jetzt noch die Relegation – zwei Spiele um den Aufstieg.', 'Runners-up! Now the play-off – two games for promotion.');
    else if (relegationNeeded(c)) msg = tr('Vorletzter. Jetzt zählt es: Relegation um den Klassenerhalt.', 'Second from bottom. Now it counts: a play-off to stay up.');
    else if (pos === 2) msg = tr('Vizemeister! Nächstes Jahr greifen wir an.', 'Runners-up! Next year we go for it.');
    else if (last) msg = tr('Rote Laterne. Aber die Stimmung stimmt.', 'Wooden spoon. But the spirit is right.');
    else msg = tr('Solides Mittelfeld. Die Mannschaftsfahrt ist trotzdem gebucht.', 'Solid mid-table. The team trip is still booked.');
    const chronicle = (c.history ?? []).length
      ? `<p class="label">${tr('Vereinschronik', 'Club chronicle')}</p><ul class="chronicle">${c.history.slice(-5).map((h) => tr(`<li>Saison ${h.season}: ${h.pos}. Platz · ${h.league}</li>`, `<li>Season ${h.season}: ${h.pos}. place · ${h.league}</li>`)).join('')}</ul>`
      : '';
    return `
      <div class="fixture-card">
        <p class="label">${tr('Saisonende', 'End of season')}</p>
        <h3>${tr('Platz', 'Position')} ${pos}</h3>
        <p>${msg}</p>
        <p>${tr('Meister', 'Champions')}: <b>${champ.name}</b></p>
        ${reviewHTML(seasonReview(c), { share: true })}
        ${this.miniTable()}
        ${chronicle}
        ${this.tripBlock()}
        ${this.legacyAside() ?? this.relegationAside() ?? this.cupAside()}
      </div>`;
  },

  // Relegation: Hin- und Rückspiel, bevor es in den Sommer geht.
  relegationAside() {
    const c = this.career;
    const need = relegationNeeded(c);
    const r = relegationOf(c);
    if (!need || r?.done) return null;
    const target = LEAGUES[need.kind === 'up' ? need.other : need.level].name;
    const opp = r?.opponent ?? { name: tr(`ein Verein aus der ${LEAGUES[need.other].name}`, `a club from the ${LEAGUES[need.other].name}`) };
    const legs = r
      ? r.legs.map((l, i) => `<li>${i === 0 ? tr('Hinspiel', 'First leg') : tr('Rückspiel', 'Second leg')} ${l.home === 'relegation' ? tr('auswärts', 'away') : tr('zu Hause', 'at home')}: ${l.result ? `<b>${l.result.ours}:${l.result.theirs}</b>` : '–'}</li>`).join('')
      : '';
    const intro =
      need.kind === 'up'
        ? tr(`Vizemeister – jetzt geht es in der Relegation um den Aufstieg in die ${target}. Gegner: <b>${opp.name}</b>.`, `Runners-up – now the play-off decides promotion to the ${target}. Opponent: <b>${opp.name}</b>.`)
        : tr(`Vorletzter – in der Relegation geht es um den Klassenerhalt in der ${target}. Gegner: <b>${opp.name}</b>.`, `Second from bottom – the play-off decides whether we stay in the ${target}. Opponent: <b>${opp.name}</b>.`);
    const leg = r ? r.leg : 0;
    return `<p class="label">${tr('Relegation', 'Play-off')}</p><p>${intro}</p>
      <p class="hint">${tr('Hin- und Rückspiel, es zählt das Gesamtergebnis. Steht es danach gleich: Elfmeterschießen.', 'Two legs, aggregate score counts. Level after both: penalties.')}</p>
      ${legs ? `<ul class="legs">${legs}</ul>` : ''}
      ${r && r.leg === 1 ? `<p>${tr('Gesamt bisher', 'Aggregate so far')}: <b>${r.agg[0]}:${r.agg[1]}</b></p>` : ''}
      <button class="primary self-play" data-action="onRelPlay">${leg === 0 ? tr('Hinspiel selbst spielen', 'Play the first leg') : tr('Rückspiel selbst spielen', 'Play the second leg')}</button>
      <button class="coach-play" data-action="onRelCoach">${tr('Trainer an der Seitenlinie', 'Manager on the touchline')}</button>
      <button data-action="onRelSimulate">${tr('Liveticker mit Entscheidungen', 'Live ticker with decisions')}</button>`;
  },

  // Saisonabschlussfahrt: Ziel wählen, dann drei Etappen mit Entscheidungen.
  tripBlock() {
    const c = this.career;
    if (!c.tripBooked)
      return `<div class="trip"><p class="label">${tr('Saisonabschlussfahrt', 'End-of-season trip')}</p><p>${tr('Kasse', 'Kitty')}: ${euro(c.cash)}. ${tr('Wohin geht es?', 'Where to?')}</p>
        ${Object.entries(DESTINATIONS).map(([id, d]) => `<button class="successor" data-action="trip" data-value="${id}" ${c.cash < d.cost ? 'disabled' : ''}><b>${d.name} – ${euro(d.cost)}</b><small>${d.desc}</small></button>`).join('')}</div>`;
    const t = tripState(c);
    const d = DESTINATIONS[t.dest];
    const log = t.log.map((e) => `<p class="trip-log"><small>${e.a}</small><br>${e.text}</p>`).join('');
    const stage = tripStage(c);
    if (stage)
      return `<div class="trip"><p class="label">${d.name} · ${tr('Etappe', 'Stage')} ${stage.n} / 3</p>${log}<p>${stage.text}</p>
        ${stage.options.map((o, i) => `<button data-action="tripChoose" data-value="${i}">${o}</button>`).join('')}</div>`;
    return `<div class="trip"><p class="label">${d.name} – ${tripVerdict(t.score)}</p>${log}<p class="reply ok">${t.score >= 0 ? tr('Die Mannschaft geht mit bester Laune in die neue Saison (weniger Absagen).', 'The team goes into the new season in the best of moods (fewer drop-outs).') : tr('Darüber redet man besser nicht. Die Stimmung braucht ein paar Wochen.', 'Best not to talk about it. Spirits will take a few weeks to recover.')}</p></div>`;
  },

  // Karriereende und Nachfolge: Solange eine Entscheidung offen ist, wartet die neue Saison.
  legacyAside() {
    const c = this.career;
    const L = legacy(c);
    const last = L.last?.season === c.season ? `<p class="label">${L.last.title}</p><p class="reply ok">${L.last.text}</p>` : '';
    const prompt = legacyPrompt(c);
    if (prompt)
      return `<div class="legacy"><p class="label">${prompt.title}</p><p>${prompt.text}</p>
        ${prompt.options.map((o, i) => `<button data-action="legacy" data-value="${i}">${o}</button>`).join('')}</div>`;
    if (L.choosing) {
      const list = successionCandidates(c);
      return `<div class="legacy">${last}<p class="label">${tr('Wer übernimmt?', 'Who takes over?')}</p>
        ${list.map((x, i) => `<button class="successor${x.type === 'neu' ? ' new' : ''}" data-action="successor" data-value="${i}"><b>${x.name}</b>${x.age ? ` (${x.age})` : ''}<small>${x.desc}</small></button>`).join('')}</div>`;
    }
    const age = coachAge(c);
    const step = c.coach && age != null && age >= 50
      ? this.confirmStepDown
        ? `<button data-action="stepDown" class="danger">${tr('Wirklich abtreten? Nochmal klicken', 'Really step down? Click again')}</button>`
        : `<button data-action="stepDown">${tr(`Amt übergeben (du bist ${age})`, `Hand over the job (you are ${age})`)}</button>`
      : '';
    return last || step ? `${last}${step}${this.relegationAside() ?? this.cupAside()}` : null;
  },

  // Saisonende: erst Stadtmeisterschaft (oder absagen), dann die neue Saison.
  cupAside() {
    const c = this.career;
    const t = cupOf(c);
    if (!t) return `<p class="label">${tr('Sommer', 'Summer')}: ${CUP_NAME}</p><p>${tr(`Acht Vereine, ein Pokal, ${PRIZES.winner} € für den Sieger.`, `Eight clubs, one trophy, €${PRIZES.winner} for the winner.`)}</p>
      <button class="primary" data-action="onCupStart">${tr(`Zur ${CUP_NAME} anmelden`, `Enter the ${CUP_NAME}`)}</button>
      <button data-action="onCupSkip">${tr('Diesmal nicht – direkt in die neue Saison', 'Not this time – straight into the new season')}</button>`;
    if (tournamentOpen(c)) return `<p class="label">${tr(`${CUP_NAME} läuft`, `${CUP_NAME} under way`)}</p><button class="primary" data-action="tab" data-value="cup">${tr('Zum Turnier', 'To the tournament')}</button>`;
    return `${t.log.length && !t.skipped ? `<p class="reply ok">${t.log.at(-1)}</p>` : ''}<button class="primary" data-action="onNewSeason">${tr('Nächste Saison', 'Next season')}</button>`;
  },

  miniTable() {
    return `<ol class="mini">${table(this.career)
      .map((r) => `<li class="${r.club.human ? 'mine' : ''}"><span>${r.club.short}</span><b>${r.pts}</b></li>`)
      .join('')}</ol>`;
  },

  // Schwarzes Brett: das kleine Vereinsleben-Thema der Woche (hängt im Vereinsheim, nicht im Handy).
  noticeCard() {
    const c = this.career;
    const w = c.week;
    if (!w) return '';
    const nt = w.notice;
    const nview = nt ? eventView(c, nt) : null;
    const noticeCard = nt
      ? `<div class="event-card board">
          <p class="label">📌 ${tr('Schwarzes Brett im Vereinsheim', 'Clubhouse notice board')}</p>
          <p>${nview.text}</p>
          ${nt.choice !== null
            ? `<p class="reply ok">➜ ${nview.options[nt.choice] ?? ''}: ${nt.result ?? ''}</p>${effectChips(nt.effects)}`
            : this.results
              ? ''
              : `<div class="actions">${nview.options.map((o, i) => `<button ${i === 0 ? 'class="primary"' : ''} data-action="notice" data-value="${i}">${o}</button>`).join('')}</div>`}
        </div>`
      : '';
    return noticeCard;
  },
};
