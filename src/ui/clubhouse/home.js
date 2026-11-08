// HEUTE: Vereinsheim-Raum, nächstes Spiel, Ergebnisse, Saisonende und Aushang.
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { tr } from '../../core/i18n.js';
import { spielberichtStreng } from '../../career/spielbericht.js';
import { effectChips } from '../../career/consequences.js';
import { seasonReview } from '../../career/review.js';
import { reviewHTML } from '../review.js';
import { GOALS } from '../../career/board.js';
import { button, esc, icon } from '../ds.js';
import { clubScene } from '../ClubScene.js';
import { phone } from '../world.js';
import { homeView, wallView } from '../prefs.js';
import { crestExtras, crestOf, crestSVG } from '../crest.js';
import { relegationNeeded, relegationOf } from '../../career/relegation.js';
import { LEAGUES, MAX_LEVEL, maxLevel } from '../../career/clubs.js';
import { blockText, championWaives, licenseNeeds, promotionBlock } from '../../career/license.js';
import { firedState, offerClubs } from '../../career/pressure.js';
import { startCash, summerMove, summerOffers } from '../../career/clubchange.js';
import { nationName, natRunning, nextOwnMatch, reachLabel, recentNat, stepLabel, tournamentName } from '../../career/nationalteams.js';
import { windowView } from '../../career/natquali.js';
import { leagueTitle } from '../../career/verband.js';
import { clubById, humanClub, kitChoice, leagueOf, humanFixture, playerOf, seasonOver, table } from '../../career/career.js';
import { DESTINATIONS, tripChoose, tripStage, tripState, tripVerdict } from '../../career/trip.js';
import { eventView, moodLabel, moodText } from '../../career/events.js';
import { storyLabels } from '../../career/stories.js';
import { coachAge, legacy, legacyPrompt, stepDown, successionCandidates } from '../../career/legacy.js';
import { vacant } from '../../career/president.js';
import { talk } from '../../career/pub.js';
import { deepGround, weatherLine } from '../../career/weather.js';
import { LEVEL_TEXT, scoutReport } from '../../career/opponentscout.js';
import { canWatch } from '../../career/scouting.js';
import { ATTR_LABELS } from '../attrLabels.js';
import { refereeLine } from '../../career/referees.js';
import { isRival, rivalLabel, rivalPoints } from '../../career/rivals.js';
import { nachholLabel } from '../../career/platz.js';
import { derbyOf, isDerbyFixture } from '../../career/derby.js';
import { CUP_NAME, CUPS, cupOf, PRIZES, summerCupDue, summerCupRunning, tournamentOpen, winterCupDue, winterCupRunning } from '../../career/tournament.js';
import { humanTie, pokalClub, pokalDue, pokalWonNow, POKALE, pokalOf, pokalWhen, roundName } from '../../career/pokal.js';
import { countryName, euroMoney, firstLegOf } from '../../career/europa.js';
import { levelName } from '../../career/bundespokal.js';
import { MATCH } from '../../sim/match.js';
import { coachAway, coachMode, energyLabel, isPresident, patienceLabel, standInName } from '../../career/personal.js';
import { PITCHES } from '../../sim/pitch.js';
import { FIT_LOW, fitnessOf, fitnessPct } from '../../career/fitness.js';

// Zusagen, die nicht fit sind: eine echte Entscheidung (spielen lassen oder schonen?).
function unfitNote(c, club) {
  const low = club.squad.filter((idx) => c.week.availability[idx] !== 'no' && fitnessOf(c, idx) < FIT_LOW);
  if (!low.length) return '';
  const names = low.map((idx) => `${playerOf(c, idx).name.split(' ').at(-1)} (${fitnessPct(fitnessOf(c, idx))} %)`).join(', ');
  return tr(`Nicht ganz fit: ${names} – spielen lassen oder schonen?`, `Not fully fit: ${names} – play them or give them a rest?`);
}
import { hex, first, euro, shareChooser } from './shared.js';
import { travelCost } from '../../career/travel.js';
import { unrestStage } from '../../career/unrest.js';

// Jugendspieltag vom Wochenende (kurz): „Jugend: D 3:1 · C 0:2 · E Spielfest".
function youthNote(c) {
  const lw = c.youth?.lastWeek;
  if (!lw || lw.round !== c.round - 1 || !lw.games.length) return '';
  const games = lw.games.map((g) => (g.team === 'E' ? tr(`E Spielfest ${g.gf}:${g.ga}`, `U11 festival ${g.gf}-${g.ga}`) : `${g.team} ${g.gf}:${g.ga}`)).join(' · ');
  const picked = lw.sichtung?.length ? tr(` – ${lw.sichtung.join(', ')} zum DFB-Stützpunkt eingeladen!`, ` – ${lw.sichtung.join(', ')} invited to the DFB centre!`) : '';
  return tr(`Jugend am Wochenende: ${games}${picked}`, `Youth at the weekend: ${games}${picked}`);
}

// Welches Trikot der Gast trägt (career.js kitChoice), als Zeile unter dem Spielort.
const KIT_NAMES = () => ({ heim: tr('Heimtrikot', 'home kit'), auswaerts: tr('Auswärtstrikot', 'away kit'), ausweich: tr('Ausweichtrikot', 'change kit') });
function kitLine(hc, ac, home) {
  const name = KIT_NAMES()[kitChoice(hc, ac)];
  return home ? tr(`Trikots: wir im Heimtrikot, ${ac.short} im ${name}`, `Kits: we wear our home kit, ${ac.short} their ${name}`) : tr(`Wir laufen im ${name} auf.`, `We play in our ${name}.`);
}

export const homeScreens = {
  // HEUTE: das Vereinsheim als Raum (Szene), das Spiel (oder Ergebnisse/Saisonende) groß,
  // daneben letzte Ergebnisse, Aushang und was in der Gruppe auf dich wartet.
  hub() {
    const c = this.career;
    const over = seasonOver(c);
    const main = firedState(c) && !this.results ? this.firedCard() : (over || this.results ? '' : this.pokalWonCard()) + (over ? this.seasonEnd() : this.results ? this.roundResults() : c.week?.midweek ? this.midweekCard() : c.week?.breakWeek ? this.breakCard() : this.nextMatch());
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
      ${over || this.results ? '' : this.qualiAside()}
      ${this.noticeCard()}`;
    // Die Szene zeigt Tabellenplatz, Termin, Taktik und Handy als Objekte im Raum (ClubScene.js).
    const classic = homeView() === 'klassisch';
    return `<div class="hub${classic ? ' classic' : ''}"><div class="hub-scene">${clubScene(c, { results: this.results, classic, wall: wallView() })}</div><section class="hub-main">${main}</section><aside class="hub-side ui-stack tight">${side}</aside></div>`;
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
      w.postponed ? `${tr(`Platzsperre: Das Spiel wird am ${nachholLabel(c)} nachgeholt (weniger Zuschauer, mehr Absagen).`, `Pitch closed: the game is replayed on ${nachholLabel(c)} (fewer spectators, more drop-outs).`)} ${button(tr('Trotzdem spielen', 'Play anyway'), { action: 'playAnyway' })}` : '',
      count('yes') < venue.format ? tr('Zu wenige Zusagen – es hilft jemand aus dem Bekanntenkreis aus.', 'Not enough players – someone from a mate\'s circle will help out.') : '',
      vacant(c) ? tr('Trainerstelle vakant – im Präsidium einen neuen Trainer verpflichten.', 'Manager post vacant – hire a new manager from the president\'s office.') : '',
      deepGround(w.weather, venue.surface.id) ? tr('Tiefer Boden: Der Ball bleibt im Matsch hängen, das Laufen kostet mehr Kraft.', 'Heavy pitch: the ball sticks in the mud, running costs more energy.') : '',
      unfitNote(c, club),
      youthNote(c),
      [null, tr('Unruhe in der Kabine: Grüppchen.', 'Unrest in the dressing room: cliques.'), tr('Unruhe: Das Klima in der Kabine ist vergiftet.', 'Unrest: the atmosphere in the dressing room is poisonous.')][Math.min(2, unrestStage(c))] ?? '', // unrest.js
    ].filter(Boolean);
    const stories = storyLabels(c);
    let actions;
    const pk = pokalDue(c);
    if (this.busy) actions = `<p class="busy">${this.busy}</p>`;
    else if (pk && (!coachAway(c) || isPresident(c))) actions = this.pokalCard(pk);
    else if (summerCupRunning(c)) actions = `<p class="t-2">${tr('Erst das Sommerturnier zu Ende spielen – oder abbrechen. Danach beginnt die Saison.', 'Finish the summer tournament first – or call it off. Then the season starts.')}</p>`;
    else if (winterCupDue(c)) actions = `<p class="t-2">${tr('Erst entscheiden: Hallenturnier ja oder nein? Danach geht die Liga weiter.', 'Decide first: indoor tournament, yes or no? Then the league carries on.')}</p>`;
    else if (winterCupRunning(c)) actions = `${button(tr('Zum Hallenturnier', 'To the indoor tournament'), { kind: 'primary big block', action: 'tab', value: 'cup' })}<p class="t-2">${tr('Der nächste Ligaspieltag steigt nach dem Turnier.', 'The next league match is after the tournament.')}</p>`;
    else if (isPresident(c)) actions = `${button(tr('Spiel von der Tribüne ansehen', 'Watch the game from the stand'), { kind: 'primary big block coach-play', action: 'onCoach' })}
        <div class="hub-alt">${button(tr('Liveticker', 'Live ticker'), { action: 'onSimulate' })}${button(tr('Nur das Ergebnis', 'Result only'), { action: 'onQuickSim' })}</div>`;
    else if (coachAway(c)) actions = `<p class="warn">${tr(`Du bist diese Woche nicht da – ${standInName(c)} stellt auf, du bekommst nur das Ergebnis.`, `You are away this week – ${standInName(c)} picks the team, you just get the result.`)}</p>${button(tr('Ergebnis abwarten', 'Wait for the result'), { kind: 'secondary big block', action: 'onSimulate' })}`;
    else
      actions = `${button(tr('Anpfiff – an der Seitenlinie', 'Kick-off – on the touchline'), { kind: 'primary big block coach-play', action: 'onCoach' })}
        <div class="hub-alt">${button(tr('Liveticker mit Entscheidungen', 'Live ticker with decisions'), { action: 'onSimulate' })}</div>`;
    return `
      <article class="ui-card match hub-match" style="--kit:${hex(club.kit.shirt)}">
        <p class="t-cap">${w.postponed ? `${nachholLabel(c)}, ${tr('Nachholspiel', 'replay')}` : tr('Sonntag, 10:30 Uhr', 'Sunday, 10:30')} · ${tr('Spieltag', 'Matchday')} ${c.round + 1}${isDerbyFixture(c, f) ? ` · <b class="derby">${derbyOf(c).name}</b>` : ''}</p>
        <div class="hub-vs">
          <span>${crestSVG(crestOf(hc), { size: 44, short: hc.short, ...(hc.human ? crestExtras(c) : {}), label: hc.name })}<b>${hc.short}</b></span>
          <i>–</i>
          <span>${crestSVG(crestOf(ac), { size: 44, short: ac.short, ...(ac.human ? crestExtras(c) : {}), label: ac.name })}<b>${ac.short}</b></span>
        </div>
        <p class="t-body hub-opp">${home ? tr('Heimspiel', 'Home') : tr('Auswärts', 'Away')} ${tr('gegen', 'against')} <b>${opp.name}</b>${isRival(c, opp.id) ? ` <b class="rival-tag" data-testid="rival-tag">${rivalLabel(rivalPoints(c, opp.id))}</b>` : ''}</p>
        <p class="t-2">${venue.name} · ${venue.surface.name} · ${venue.format} ${tr('gegen', 'v')} ${venue.format}</p>
        <p class="t-2 kit-line">${kitLine(hc, ac, home)}</p>
        <p class="t-2 weather">${weatherLine(c.week?.weather)}</p>
        ${refereeLine(c) ? `<p class="t-2 ref-line" data-testid="ref-line">${refereeLine(c)}</p>` : ''}
        <div class="ui-chips hub-facts">
          <span class="ui-chip" style="--c:#5cc46a" title="${tr('Zusagen', 'in')}">${count('yes')} ${tr('Zusagen', 'in')}</span>
          ${count('late') && !spielberichtStreng(c) ? `<span class="ui-chip" style="--c:#e0b020">${count('late')} ${tr('später', 'late')}</span>` : ''}
          <span class="ui-chip" style="--c:#d9534f">${count('no')} ${tr('Absagen', 'out')}</span>
          <span class="ui-chip plain">${tr('Stimmung', 'Spirit')}: <b class="mood mood-${moodLabel(c.mood ?? 0)}">${moodText(c.mood ?? 0)}</b></span>
        </div>
        ${c.goal?.season === c.season ? `<p class="t-2 goal-line">${tr('Saisonziel', 'Season target')}: <b>${GOALS[c.goal.type].name}</b> · ${tr('jetzt', 'now')} ${place}. ${tr('Platz', 'place')} <small>(${tr('Ziel', 'target')}: ${tr('bis Platz', 'top')} ${c.goal.target})</small></p>` : ''}
        ${notes.length ? `<ul class="hub-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
        ${stories.length ? `<ul class="stories">${stories.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
        ${this.oppCheck(opp, venue.format)}
        ${this.meBars()}
        ${summerCupDue(c) || summerCupRunning(c) ? this.summerCard() : ''}
        ${winterCupDue(c) ? `<div class="winter-cup"><p class="label">${tr('Winterpause', 'Winter break')}</p><p>${tr(`Am Wochenende: <b>${CUPS.halle.name}</b> in der ${CUPS.halle.place}. Acht Teams, Bande, Handballtore – ${CUPS.halle.prizes.winner} € für den Sieger.`, `This weekend: <b>${CUPS.halle.name}</b> at ${CUPS.halle.place}. Eight teams, boards, handball goals – €${CUPS.halle.prizes.winner} for the winner.`)}</p>
          <div class="ui-row">${button(tr('Anmelden', 'Enter'), { kind: 'primary', action: 'onCupStart', value: 'halle' })}${button(tr('Diesmal nicht', 'Not this time'), { action: 'onCupSkip', value: 'halle' })}</div></div>` : ''}
        <div class="hub-actions">${actions}</div>
      </article>`;
  },

  // Gegner-Check (opponentscout.js): was man über den nächsten Gegner weiß – genauer, je besser man ihn beobachtet hat.
  oppCheck(opp, format) {
    const c = this.career;
    const r = scoutReport(c, opp, format);
    const FORM = { w: ['S', 'W', '#5cc46a'], d: ['U', 'D', '#e0b020'], l: ['N', 'L', '#d9534f'] };
    const form = r.form.length ? r.form.map((x) => `<span class="ui-chip" style="--c:${FORM[x][2]}">${tr(FORM[x][0], FORM[x][1])}</span>`).join('') : `<span class="t-2">${tr('noch keine Spiele', 'no games yet')}</span>`;
    const lines = [
      `${tr('Tabelle', 'Table')}: ${r.place ? `${r.place}.` : '–'} · ${tr('Stärke', 'Strength')}: <b>${r.level ? (r.strength.exact ? r.strength.lo : `${r.strength.lo}–${r.strength.hi}`) : '?'}</b>`,
      r.style ? `${tr('Spielweise', 'Style')}: <b>${esc(r.style)}</b>${r.system ? ` · ${tr('System', 'System')} <b>${esc(r.system)}</b>` : ''}` : '',
      r.strengths.length ? `${tr('Stark in', 'Strong at')}: <b>${r.strengths.map((k) => ATTR_LABELS[k]).join(', ')}</b>${r.weakness ? ` · ${tr('schwach in', 'weak at')}: <b>${ATTR_LABELS[r.weakness]}</b>` : ''}` : '',
      r.danger ? `${tr('Aufpassen auf', 'Watch out for')}: <b>${esc(r.danger.name)}</b> (${r.danger.goals} ${tr('Tore', 'goals')}, ${tr('Stärke', 'rating')} ${r.danger.rating})` : '',
    ].filter(Boolean);
    const watch = canWatch(c, opp) ? button(tr('Gegner beobachten (1 Aktion)', 'Watch the opponent (1 action)'), { action: 'oppWatch', value: opp.id }) : '';
    return `<details class="opp-check" data-testid="opp-check"${this.oppNote ? ' open' : ''}><summary>${tr('Gegner-Check', 'Opponent check')} <small>${'●'.repeat(r.level)}${'○'.repeat(3 - r.level)}</small></summary>
      <div class="ui-chips">${tr('Form', 'Form')}: ${form}</div>
      ${lines.map((l) => `<p class="t-2">${l}</p>`).join('')}
      <p class="t-2"><i>${LEVEL_TEXT()[r.level]}</i></p>
      ${this.oppNote ? `<p class="t-2">${esc(this.oppNote)}</p>` : ''}${watch}</details>`;
  },

  // Gleich nach dem gewonnenen Finale: Sieg-Meldung ganz oben, nicht erst im Pokal-Reiter.
  pokalWonCard() {
    const kind = pokalWonNow(this.career);
    if (!kind) return '';
    const name = POKALE[kind].name;
    return `<article class="ui-card pokal-win"><p class="t-cap">${name}</p><h3>${tr('POKALSIEGER!', 'CUP WINNERS!')}</h3>
      <p class="t-body">${tr(`Der ${name} steht in der Vitrine.`, `The ${name} is in the trophy cabinet.`)}</p>${button(tr('Zum Pokal', 'To the cup'), { action: 'tab', value: 'cup' })}</article>`;
  },

  // Winterpause (career.js winterBreakWeek): kein Ligaspiel; Hallenturnier anmelden, spielen oder auslassen, dann weiter.
  breakCard() {
    const c = this.career;
    const t = cupOf(c, 'halle');
    let body;
    if (winterCupDue(c)) body = `<p class="t-body">${tr(`Am Wochenende: <b>${CUPS.halle.name}</b> in der ${CUPS.halle.place}. Acht Teams, Bande, Handballtore – ${CUPS.halle.prizes.winner} € für den Sieger.`, `This weekend: <b>${CUPS.halle.name}</b> at ${CUPS.halle.place}. Eight teams, boards, handball goals – €${CUPS.halle.prizes.winner} for the winner.`)}</p>
      <div class="ui-row">${button(tr('Anmelden', 'Enter'), { kind: 'primary', action: 'onCupStart', value: 'halle' })}${button(tr('Diesmal nicht', 'Not this time'), { action: 'onCupSkip', value: 'halle' })}</div>`;
    else if (winterCupRunning(c)) body = `${button(tr('Zum Hallenturnier', 'To the indoor tournament'), { kind: 'primary big block', action: 'tab', value: 'cup' })}<p class="t-2">${tr('Zwischen den Spielen kannst du die Aufstellung ändern – frische Beine rein.', 'Between games you can change the line-up – fresh legs in.')}</p>`;
    else body = `${t && !t.skipped && t.log.length ? `<p class="reply ok">${t.log.at(-1)}</p>` : `<p class="t-2">${tr('Ruhige Woche: Beine hochlegen, Kasse zählen.', 'A quiet week: feet up, count the takings.')}</p>`}
      <div class="hub-actions">${button(tr('Weiter zum nächsten Spieltag', 'On to the next matchday'), { kind: 'primary big block', action: 'onBreakDone' })}</div>`;
    return `<article class="ui-card hub-card break-card"><p class="t-cap">${tr('Winterpause', 'Winter break')} · ${tr('kein Ligaspiel', 'no league game')}</p>
      <h3 class="t-h2">${CUPS.halle.name}</h3>${body}${this.natAside()}</article>`;
  },

  // Turniere der Nationalteams (nationalteams.js): eigene Spieler unterwegs – nächstes Spiel ansehen (3D) oder nur das Ergebnis.
  natAside() {
    const c = this.career;
    const running = natRunning(c);
    const done = recentNat(c).filter((h) => h.own.length);
    if (!running.length && !done.length) return '';
    const next = nextOwnMatch(c);
    const runHTML = running.map((t) => {
      const own = Object.entries(t.own).flatMap(([nid, list]) => list.map((idx) => `${esc(playerOf(c, idx).name)} (${nationName(nid)})`));
      const log = t.log.slice(-4).map((l) => `<li>${esc(l)}</li>`).join('');
      const failed = t.failed?.length ? `<p class="t-2">${tr('In der Qualifikation gescheitert', 'Knocked out in qualifying')}: ${t.failed.map(nationName).join(', ')}</p>` : '';
      return `<p class="t-2"><b>${tournamentName(t.id)} ${t.year}</b> · ${stepLabel(t.step)}${own.length ? ` · ${tr('dabei', 'called up')}: ${own.join(', ')}` : ''}</p>${failed}${log ? `<ul class="nat-log">${log}</ul>` : ''}`;
    }).join('');
    const nextHTML = next
      ? `<p class="t-body">${tr('Nächstes Spiel', 'Next game')}: <b>${nationName(next.m.home)} – ${nationName(next.m.away)}</b> (${stepLabel(next.m.step)})</p>
        <div class="ui-row">${button(tr('Im Stadion ansehen', 'Watch in the stadium'), { kind: 'primary', action: 'onNatWatch', 'data-testid': 'nat-watch' })}${button(tr('Nur Ergebnis', 'Result only'), { action: 'onNatQuick', 'data-testid': 'nat-quick' })}${button(tr('Turnier vorspulen', 'Skip to the end'), { kind: 'ghost', action: 'onNatFinish', 'data-testid': 'nat-finish' })}</div>`
      : '';
    const doneHTML = done.map((h) => `<p class="t-2"><b>${tournamentName(h.id)} ${h.year}</b>: ${tr('Sieger', 'Winner')} ${nationName(h.winner)}. ${h.own.map((o) => tr(`${esc(o.name)} (${nationName(o.nat)}): ${o.apps} Spiele, ${o.goals} Tore, ${reachLabel(o.reached)}${o.boost ? `, Marktwert +${o.boost} %` : ''}${o.missed ? `, fehlt ${o.missed} Ligaspiele` : ''}`, `${esc(o.name)} (${nationName(o.nat)}): ${o.apps} games, ${o.goals} goals, ${reachLabel(o.reached)}${o.boost ? `, market value +${o.boost}%` : ''}${o.missed ? `, misses ${o.missed} league games` : ''}`)).join(' · ')}</p>`).join('');
    return `<div class="ui-card" data-testid="nat-card"><p class="label">${tr('Nationalteams', 'National teams')}</p>${runHTML}${nextHTML}${doneHTML}</div>`;
  },

  // Länderspielpause (natquali.js): Qualifikationsspiele der Länder mit eigenen Spielern – ansehen, nur Ergebnis oder vorspulen.
  qualiAside() {
    const c = this.career;
    const view = windowView(c);
    if (!view?.list.length) return '';
    const next = nextOwnMatch(c);
    const res = (m) => (m.result ? `<b>${m.result.home}:${m.result.away}</b>${m.pens ? ` ${tr('i. E.', 'pens')} ${m.pens.home}:${m.pens.away}` : m.et ? ` ${tr('n. V.', 'aet')}` : ''}` : '–:–');
    const blocks = view.list.map(({ comp, name, year, players, games, groups }) => {
      const who = players.map(({ idx, nid }) => `${esc(playerOf(c, idx).name)} (${nationName(nid)})`).join(', ');
      const list = games.map((m) => `<li>${stepLabel(m.step)}: ${nationName(m.home)} ${res(m)} ${nationName(m.away)}</li>`).join('');
      const tables = groups.map(({ g, rows, mine }) => `<details class="nat-table"><summary>${comp.groupNames?.[g] ?? `${tr('Gruppe', 'Group')} ${String.fromCharCode(65 + g)}`} (${mine.map(nationName).join(', ')})</summary><table class="ui-table compact"><tbody>${rows.map((r, i) => `<tr${mine.includes(r.nid) ? ' class="me"' : ''}><td>${i + 1}.</td><td>${nationName(r.nid)}</td><td>${r.p}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></details>`).join('');
      return `<p class="t-2"><b>${comp.nl ? `${name} ${comp.yearLabel}` : comp.conf === 'inter' ? tr(`Interkontinentale Play-offs zur ${name} ${year}`, `${name} ${year} inter-confederation play-offs`) : tr(`Qualifikation zur ${name} ${year}`, `${name} ${year} qualifying`)}</b> · ${tr('dabei', 'called up')}: ${who}</p><ul class="nat-log">${list}</ul>${tables}`;
    }).join('');
    const nextHTML = next?.t.isQuali
      ? `<p class="t-body">${tr('Nächstes Spiel', 'Next game')}: <b>${nationName(next.m.home)} – ${nationName(next.m.away)}</b> (${stepLabel(next.m.step)})</p>
        <div class="ui-row">${button(tr('Im Stadion ansehen', 'Watch in the stadium'), { kind: 'primary', action: 'onNatWatch', 'data-testid': 'quali-watch' })}${button(tr('Nur Ergebnis', 'Result only'), { action: 'onNatQuick', 'data-testid': 'quali-quick' })}${button(tr('Rest vorspulen', 'Skip the rest'), { kind: 'ghost', action: 'onNatFinish', 'data-testid': 'quali-finish' })}</div>`
      : `<p class="t-2">${tr('Alle Spiele dieser Länderspielpause sind gespielt. Am Sonntag geht die Liga weiter.', 'All games of this international break are played. The league carries on on Sunday.')}</p>`;
    return `<div class="ui-card" data-testid="quali-card"><p class="label">${tr('Länderspielpause', 'International break')}</p>${blocks}${nextHTML}</div>`;
  },

  // Englische Woche: nach dem Pokalspiel erst das Ergebnis, dann „Weiter zum …“ (pokal.js finishMidweek).
  midweekCard() {
    const c = this.career;
    const mw = c.week.midweek;
    const [a, b] = mw.result;
    const won = a + (mw.pens?.[0] ?? 0) * 0.01 > b + (mw.pens?.[1] ?? 0) * 0.01;
    const next = pokalDue(c);
    const nextDay = next && POKALE[next].euro ? humanTie(c, next)?.day : null;
    const label = next ? (nextDay === 'thu' ? tr('Weiter zum Donnerstag', 'On to Thursday') : POKALE[next].saturday ? tr('Weiter zum Samstag', 'On to Saturday') : tr('Weiter zum Mittwoch', 'On to Wednesday')) : tr('Weiter zum Sonntag', 'On to Sunday');
    return `<article class="ui-card hub-card midweek-card"><p class="t-cap">${pokalWhen(mw.kind, mw.day)} · <b>${POKALE[mw.kind].name}</b> · ${tr('Englische Woche', 'Midweek game')}</p>
      <h3 class="t-h2">${a} : ${b}${mw.et ? ` <small>${tr('n. V.', 'a.e.t.')}</small>` : ''}${mw.pens ? ` <small>(${tr('i. E.', 'pens')} ${mw.pens[0]}:${mw.pens[1]})</small>` : ''}</h3>
      <p class="t-body">${tr('gegen', 'against')} <b>${esc(mw.opp)}</b> – ${mw.note ? esc(mw.note) : won ? tr('eine Runde weiter.', 'through to the next round.') : tr('ausgeschieden.', 'knocked out.')}</p>
      <p class="t-2">${next ? tr(`Diese Woche wartet noch der ${POKALE[next].name}, danach die Liga am Sonntag.`, `The ${POKALE[next].name} is still to come this week, then the league on Sunday.`) : tr('Am Sonntag geht die Liga weiter. Bis dahin erholen sich die Beine – ganz frisch ist nach dem Pokal nicht jeder.', 'The league carries on on Sunday. Legs recover until then – not everyone will be completely fresh after the cup game.')}</p>
      <div class="hub-actions">${button(label, { kind: 'primary big block', action: 'onMidweekDone' })}</div></article>`;
  },

  // Pokalspiel unter der Woche: kommt vor dem Ligaspieltag.
  pokalCard(kind) {
    if (POKALE[kind].euro) return this.euroCard(kind);
    const c = this.career;
    const cup = pokalOf(c, kind);
    const tie = humanTie(c, kind);
    const me = humanClub(c).id;
    const home = tie.home === me;
    const opp = pokalClub(c, cup, home ? tie.away : tie.home);
    const lv = (id) => levelName(cup.levels[id], leagueTitle(c, Math.min(MAX_LEVEL, cup.levels[id])));
    const oppLevel = cup.levels[opp.id];
    const myLevel = cup.levels[me];
    const why = kind === 'bund' ? (!home ? tr(' – ihr müsst zum Profi ins große Stadion', ' – you have to visit the professionals in their big stadium') : tr(' – Heimrecht für den Amateur, volle Hütte', ' – home advantage for the amateurs, packed ground')) : oppLevel > myLevel ? tr(' – der Höherklassige muss zu euch', ' – the higher-league side has to come to you') : oppLevel < myLevel ? tr(' – ihr müsst zum Klassentieferen', ' – you have to visit the lower-league side') : '';
    const format = kind === 'bund' ? 11 : LEAGUES[Math.min(MAX_LEVEL, Math.max(2, cup.levels[tie.home]))].format;
    return `<div class="pokal-card"><p class="t-cap">${pokalWhen(kind)} · <b>${POKALE[kind].name}</b> · ${roundName(cup, tie.round)}</p>
      <p class="t-body">${home ? tr('Heimspiel', 'Home') : tr('Auswärts', 'Away')} ${tr('gegen', 'against')} <b>${opp.name}</b> <small>(${lv(opp.id)})</small>${why}.</p>
      ${kind === 'bund' ? `<p class="t-2">${tr('Spielort', 'Venue')}: <b>${{ own: tr('eigener Platz', 'own pitch'), stands: tr('eigener Platz mit Stahlrohrtribüne', 'own pitch with scaffold stand'), stadium: tr('großes Stadion', 'big stadium') }[home ? tie.venue ?? 'own' : 'stadium']}</b></p>` : ''}
      <p class="t-2">${format} ${tr('gegen', 'v')} ${format} · ${MATCH.pokalExtra ? tr('bei Unentschieden Verlängerung, dann Elfmeterschießen', 'if level: extra time, then penalties') : tr('bei Unentschieden direkt Elfmeterschießen', 'if level: straight to penalties')} · ${tr('am Sonntag geht die Liga weiter', 'the league carries on on Sunday')}</p>
      ${button(isPresident(c) ? tr('Spiel von der Tribüne ansehen', 'Watch the game from the stand') : tr('Anpfiff – an der Seitenlinie', 'Kick-off – on the touchline'), { kind: 'primary big block coach-play', action: 'onPokalCoach', value: kind })}
      <div class="hub-alt">${button(isPresident(c) ? tr('Liveticker', 'Live ticker') : tr('Liveticker mit Entscheidungen', 'Live ticker with decisions'), { action: 'onPokalSimulate', value: kind })}</div></div>`;
  },

  // Europapokal: Dienstag oder Donnerstag, 21 Uhr – Ligaphase oder K.-o.-Runde mit Hin- und Rückspiel.
  euroCard(kind) {
    const c = this.career;
    const cup = pokalOf(c, kind);
    const tie = humanTie(c, kind);
    const me = humanClub(c).id;
    const home = tie.home === me;
    const opp = pokalClub(c, cup, home ? tie.away : tie.home);
    const first = firstLegOf(cup, tie);
    const agg = first ? tr(`Hinspiel ${home ? first.home : first.away}:${home ? first.away : first.home} – es zählt das Gesamtergebnis, bei Gleichstand ${MATCH.pokalExtra ? 'Verlängerung und ' : ''}Elfmeterschießen.`, `First leg ${home ? first.home : first.away}:${home ? first.away : first.home} – aggregate counts; if level, ${MATCH.pokalExtra ? 'extra time and ' : ''}penalties.`) : '';
    const where = tie.neutral ? tr('Endspiel im neutralen Stadion', 'Final at a neutral stadium') : home ? tr('Heimspiel', 'Home') : tr('Auswärts', 'Away');
    const land = opp.country ? ` <small>(${countryName(opp.country)})</small>` : '';
    return `<div class="pokal-card euro-card" data-testid="euro-card"><p class="t-cap">${pokalWhen(kind, tie.day)} · <b>${POKALE[kind].name}</b> · ${roundName(cup, tie.round)}</p>
      <p class="t-body">${where} ${tr('gegen', 'against')} <b>${esc(opp.name)}</b>${land}.</p>
      ${agg ? `<p class="t-2">${agg}</p>` : ''}
      <p class="t-2">11 ${tr('gegen', 'v')} 11 · ${tr('Flutlicht', 'Floodlights')} · ${tr('bisher', 'so far')} ${euroMoney(cup.earned ?? 0)} ${tr('Prämien', 'prize money')}</p>
      ${button(isPresident(c) ? tr('Spiel von der Tribüne ansehen', 'Watch the game from the stand') : tr('Anpfiff – an der Seitenlinie', 'Kick-off – on the touchline'), { kind: 'primary big block coach-play', action: 'onPokalCoach', value: kind })}
      <div class="hub-alt">${button(isPresident(c) ? tr('Liveticker', 'Live ticker') : tr('Liveticker mit Entscheidungen', 'Live ticker with decisions'), { action: 'onPokalSimulate', value: kind })}</div></div>`;
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
    const block = c.pro ? promotionBlock(c, level) : null; // Profiligen (license.js)
    const upNow = (pos === 1 && level < maxLevel(c)) || (pos === 2 && championWaives(c, t));
    if (c.pro && pos === 1 && level >= maxLevel(c)) msg = tr(`MEISTER der ${leagueTitle(c, level)}! ${blockText(c, 'top', level)}`, `${leagueTitle(c, level)} CHAMPIONS! ${blockText(c, 'top', level)}`);
    else if (c.pro && upNow && block) msg = tr(`${pos === 1 ? 'MEISTER!' : 'Vizemeister – und der Meister verzichtet!'} ${blockText(c, block, level)}`, `${pos === 1 ? 'CHAMPIONS!' : 'Runners-up – and the champions waive promotion!'} ${blockText(c, block, level)}`);
    else if (c.pro && pos === 2 && championWaives(c, t)) msg = tr(`Vizemeister – und ${champ.name} verzichtet auf den Aufstieg! Ihr steigt direkt auf in die ${leagueTitle(c, level + 1)}.`, `Runners-up – and ${champ.name} turn down promotion! You go straight up to the ${leagueTitle(c, level + 1)}.`);
    else if (c.pro && pos === 1 && level >= 3) msg = tr(`MEISTER der ${leagueTitle(c, level)}! Aufstieg in die ${leagueTitle(c, level + 1)}.`, `${leagueTitle(c, level)} CHAMPIONS! Promotion to the ${leagueTitle(c, level + 1)}.`);
    else if (pos === 1 && level === 1) msg = tr('MEISTER! Aufstieg in die Kreisklasse C – eigener Rasenplatz, Schiri, 7 gegen 7. Die Runde im Vereinsheim geht aufs Haus.', 'CHAMPIONS! Promotion to District League C – your own grass pitch, a referee, 7-a-side. The round at the clubhouse is on the house.');
    else if (pos === 1 && level === 2) msg = tr('MEISTER der Kreisklasse C! Aufstieg in die Kreisklasse B – stärkere Gegner, mehr Zuschauer, mehr Geld.', 'District League C CHAMPIONS! Promotion to District League B – tougher opponents, bigger crowds, more money.');
    else if (pos === 1) msg = tr('MEISTER der Kreisklasse B! Ganz oben im Kanalbezirk. Die Schale bekommt einen Ehrenplatz im Vereinsheim.', 'District League B CHAMPIONS! The top of the Canal District. The trophy gets pride of place in the clubhouse.');
    else if (last && level > 1) msg = tr(`Letzter Platz – Abstieg in die ${leagueTitle(c, level - 1)}. Kopf hoch, nächstes Jahr geht's wieder rauf.`, `Bottom of the table – relegated to the ${leagueTitle(c, level - 1)}. Chin up, next year we go again.`);
    else if (rel?.done) msg = rel.kind === 'up'
      ? rel.won ? tr(`Vizemeister – und über die Relegation aufgestiegen (${rel.agg[0]}:${rel.agg[1]}${rel.pens ? `, i. E. ${rel.pens.ours}:${rel.pens.theirs}` : ''})! Ab jetzt ${leagueTitle(c, level + 1)}.`, `Runners-up – and promoted via the play-off (${rel.agg[0]}-${rel.agg[1]}${rel.pens ? `, ${rel.pens.ours}-${rel.pens.theirs} on pens` : ''})! ${leagueTitle(c, level + 1)} from now on.`) : tr(`Vizemeister, aber die Relegation verloren (${rel.agg[0]}:${rel.agg[1]}${rel.pens ? `, i. E. ${rel.pens.ours}:${rel.pens.theirs}` : ''}). Nächstes Jahr.`, `Runners-up, but lost the play-off (${rel.agg[0]}-${rel.agg[1]}${rel.pens ? `, ${rel.pens.ours}-${rel.pens.theirs} on pens` : ''}). Next year.`)
      : rel.won ? tr(`Klassenerhalt in der Relegation (${rel.agg[0]}:${rel.agg[1]}${rel.pens ? `, i. E. ${rel.pens.ours}:${rel.pens.theirs}` : ''}). Durchatmen!`, `Survived in the play-off (${rel.agg[0]}-${rel.agg[1]}${rel.pens ? `, ${rel.pens.ours}-${rel.pens.theirs} on pens` : ''}). Deep breath!`) : tr(`Relegation verloren (${rel.agg[0]}:${rel.agg[1]}${rel.pens ? `, i. E. ${rel.pens.ours}:${rel.pens.theirs}` : ''}) – Abstieg in die ${leagueTitle(c, level - 1)}.`, `Lost the play-off (${rel.agg[0]}-${rel.agg[1]}${rel.pens ? `, ${rel.pens.ours}-${rel.pens.theirs} on pens` : ''}) – relegated to the ${leagueTitle(c, level - 1)}.`);
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
        ${reviewHTML(seasonReview(c), { share: true, page: '' })}
        ${this.miniTable()}
        ${chronicle}
        ${this.tripBlock()}
        ${this.waiveAside(upNow || (pos === 2 && relegationNeeded(c)) || !!rel?.won && rel.kind === 'up')}
        ${this.summerAside()}
        ${this.natAside()}
        ${this.legacyAside() ?? this.relegationAside() ?? this.cupAside()}
      </div>`;
  },

  // Entlassen (pressure.js): Angebote anderer Vereine der Liga – erst nach der Wahl geht es weiter (clubchange.js).
  firedCard() {
    const c = this.career;
    const f = firedState(c);
    const rows = table(c);
    const offers = offerClubs(c).map((club) => {
      const pos = rows.findIndex((r) => r.club.id === club.id) + 1;
      return `<button class="successor" data-action="takeOver" data-value="${club.id}" data-testid="take-over"><b>${club.name}</b><small>${tr(`Platz ${pos} · ${rows[pos - 1]?.pts ?? 0} Punkte · Startkasse ${startCash(c.level ?? 1).toLocaleString('de-DE')} €`, `Place ${pos} · ${rows[pos - 1]?.pts ?? 0} points · starting kitty €${startCash(c.level ?? 1).toLocaleString('en-GB')}`)}</small></button>`;
    }).join('');
    const away = (f.away ?? []).map((o) => `<button class="successor" data-action="takeOver" data-value="${o.id}" data-testid="take-over-away"><b>${o.name}</b><small>${tr(`${leagueTitle(c, o.level)} · eine Liga tiefer · Startkasse ${startCash(o.level).toLocaleString('de-DE')} €`, `${leagueTitle(c, o.level)} · one league down · starting kitty €${startCash(o.level).toLocaleString('en-GB')}`)}</small></button>`).join('');
    return `<div class="fixture-card" data-testid="fired"><p class="label">${f.reason === 'president' ? tr('Abgewählt', 'Voted out') : tr('Entlassen', 'Sacked')}</p>
      <h3>${tr('Wie geht es weiter?', 'What next?')}</h3>
      <p>${tr(`Diese Vereine aus der ${leagueTitle(c, c.level ?? 1)} wollen dich als Trainer. Du übernimmst Kader, Tabellenplatz und Spielplan – Kasse, Anlage und Sponsoren fangen neu an.`, `These clubs from the ${leagueTitle(c, c.level ?? 1)} want you as manager. You take over their squad, league position and fixtures – kitty, grounds and sponsors start afresh.`)}</p>
      ${away ? `<p class="t-2">${tr('Aus der Liga darunter ruft auch einer an: Dort bekommst du einen neuen Kader und einen neuen Spielplan.', 'A club from the league below has called too: there you get a new squad and new fixtures.')}</p>` : ''}
      <div class="ui-stack">${offers}${away}</div></div>`;
  },

  // Sommer (clubchange.js): Anfragen anderer Vereine für einen erfolgreichen Trainer, wirksam zur neuen Saison.
  summerAside() {
    const c = this.career;
    const offers = summerOffers(c);
    if (!offers.length) return '';
    const chosen = summerMove(c)?.id;
    const list = offers.map((o) => `<button class="successor${chosen === o.id ? ' active' : ''}" data-action="summerMove" data-value="${o.id}" data-testid="summer-offer"><b>${chosen === o.id ? '✓ ' : ''}${o.name}</b><small>${leagueTitle(c, o.level)} · ${tr(`Startkasse ${startCash(o.level).toLocaleString('de-DE')} €`, `starting kitty €${startCash(o.level).toLocaleString('en-GB')}`)}</small></button>`).join('');
    return `<div class="ui-card" data-testid="summer-offers"><p class="label">${tr('Anfragen anderer Vereine', 'Offers from other clubs')}</p>
      <p class="t-2">${chosen ? tr('Zugesagt: Zur neuen Saison trainierst du dort. Noch einmal tippen, um doch zu bleiben.', 'Accepted: you will manage there from next season. Tap again to stay after all.') : tr('Deine Saison hat sich herumgesprochen. Wechselst du, fangen Kader, Kasse, Anlage und Sponsoren dort neu an; Familie, Auszeichnungen und deine eigene Figur kommen mit.', 'Word of your season has got around. If you move, squad, kitty, grounds and sponsors start afresh there; family, awards and your own player come with you.')}</p>
      <div class="ui-stack">${list}</div></div>`;
  },

  // Profiligen (license.js): Zulassung für die Liga darüber und freiwilliger Verzicht auf den Aufstieg.
  waiveAside(up) {
    const c = this.career;
    const level = c.level ?? 1;
    const waived = c.flags?.waiveUp === c.season;
    if (!c.pro || !(up || waived) || level >= maxLevel(c)) return '';
    const needs = licenseNeeds(c, level + 1);
    const list = needs.length ? `<ul class="license">${needs.map((x) => `<li>${x.ok ? '✓' : '✗'} ${x.label}</li>`).join('')}</ul>` : '';
    return `<div class="ui-card" data-testid="waive"><p class="label">${tr(`Zulassung ${leagueTitle(c, level + 1)}`, `Licence ${leagueTitle(c, level + 1)}`)}</p>${list}
      ${button(waived ? tr('Doch aufsteigen', 'Go up after all') : tr('Auf den Aufstieg verzichten', 'Waive promotion'), { kind: 'ghost', action: 'waiveUp', value: waived ? 0 : 1, 'data-testid': 'waive-up' })}
      <p class="t-2">${waived ? tr('Ihr bleibt in der Liga. Das Geld reicht für ein weiteres Jahr hier.', 'You stay in this league. The money lasts another year here.') : tr('Verzichten kann jeder Verein – meist aus Geldgründen. Dann steigt der Nächste auf.', 'Any club can waive promotion – usually for money reasons. Then the next club goes up.')}</p></div>`;
  },

  // Relegation: Hin- und Rückspiel, bevor es in den Sommer geht.
  relegationAside() {
    const c = this.career;
    const need = relegationNeeded(c);
    const r = relegationOf(c);
    if (!need || r?.done) return null;
    const target = leagueTitle(c, need.kind === 'up' ? need.other : need.level);
    const opp = r?.opponent ?? { name: tr(`ein Verein aus der ${leagueTitle(c, need.other)}`, `a club from the ${leagueTitle(c, need.other)}`) };
    const legs = r
      ? r.legs.map((l, i) => `<li>${i === 0 ? tr('Hinspiel', 'First leg') : tr('Rückspiel', 'Second leg')} ${l.home === 'relegation' ? tr('auswärts', 'away') : tr('zu Hause', 'at home')}: ${l.result ? `<b>${l.result.ours}:${l.result.theirs}</b>` : '–'}</li>`).join('')
      : '';
    const intro =
      need.kind === 'up'
        ? tr(`Vizemeister – jetzt geht es in der Relegation um den Aufstieg in die ${target}. Gegner: <b>${opp.name}</b>.`, `Runners-up – now the play-off decides promotion to the ${target}. Opponent: <b>${opp.name}</b>.`)
        : tr(`Vorletzter – in der Relegation geht es um den Klassenerhalt in der ${target}. Gegner: <b>${opp.name}</b>.`, `Second from bottom – the play-off decides whether we stay in the ${target}. Opponent: <b>${opp.name}</b>.`);
    const leg = r ? r.leg : 0;
    // Nach dem Hinspiel erst ein eigener Schritt (wie nach dem Pokalspiel unter der Woche), dann das Rückspiel.
    const actions = c.week?.legDone
      ? `<p>${tr(`Hinspiel ${r.legs[0].result.ours}:${r.legs[0].result.theirs}. Eine Woche Pause, dann fällt im Rückspiel die Entscheidung.`, `First leg ${r.legs[0].result.ours}-${r.legs[0].result.theirs}. A week off, then the second leg decides it.`)}</p>
      <button class="primary" data-action="onRelegationNext">${tr('Weiter zum Rückspiel', 'On to the second leg')}</button>`
      : `<button class="primary coach-play" data-action="onRelCoach">${isPresident(c) ? (leg === 0 ? tr('Hinspiel von der Tribüne ansehen', 'Watch the first leg from the stand') : tr('Rückspiel von der Tribüne ansehen', 'Watch the second leg from the stand')) : leg === 0 ? tr('Hinspiel an der Seitenlinie', 'First leg on the touchline') : tr('Rückspiel an der Seitenlinie', 'Second leg on the touchline')}</button>
      <button data-action="onRelSimulate">${isPresident(c) ? tr('Liveticker', 'Live ticker') : tr('Liveticker mit Entscheidungen', 'Live ticker with decisions')}</button>`;
    return `<p class="label">${tr('Relegation', 'Play-off')}</p><p>${intro}</p>
      <p class="hint">${tr('Hin- und Rückspiel, es zählt das Gesamtergebnis. Steht es danach gleich: Elfmeterschießen.', 'Two legs, aggregate score counts. Level after both: penalties.')}</p>
      ${legs ? `<ul class="legs">${legs}</ul>` : ''}
      ${r && r.leg === 1 ? `<p>${tr('Gesamt bisher', 'Aggregate so far')}: <b>${r.agg[0]}:${r.agg[1]}</b></p>` : ''}
      ${actions}`;
  },

  // Saisonabschlussfahrt: Ziel wählen, dann drei Etappen mit Entscheidungen.
  tripBlock() {
    const c = this.career;
    if (!c.tripBooked)
      return `<div class="trip"><p class="label">${tr('Saisonabschlussfahrt', 'End-of-season trip')}</p><p>${tr('Kasse', 'Kitty')}: ${euro(c.cash)}. ${tr('Wohin geht es?', 'Where to?')}</p>
        ${shareChooser(c)}
        ${Object.entries(DESTINATIONS).map(([id, d]) => { const k = travelCost(c, id); return `<button class="successor" data-action="trip" data-value="${id}" ${c.cash < k.club ? 'disabled' : ''}><b>${d.name} – ${euro(k.per)} ${tr('je Person', 'per person')}</b><small>${d.desc}</small><small>${tr(`Verein zahlt ${euro(k.club)}, jeder Mitfahrer ${euro(k.own)} · ${k.people} von ${k.players} dabei`, `Club pays ${euro(k.club)}, each player ${euro(k.own)} · ${k.people} of ${k.players} going`)}</small></button>`; }).join('')}</div>`;
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
      const btn = (x, i) => `<button class="successor${x.type === 'neu' || x.type === 'extern' ? ' new' : ''}" data-action="successor" data-value="${i}"><b>${x.name}</b>${x.age ? ` (${x.age})` : ''}<small>${x.desc}</small></button>`;
      const inClub = list.map((x, i) => [x, i]).filter(([x]) => x.type !== 'extern');
      const office = list.map((x, i) => [x, i]).filter(([x]) => x.type === 'extern');
      return `<div class="legacy">${last}<p class="label">${tr('Wer übernimmt?', 'Who takes over?')}</p>
        ${inClub.map(([x, i]) => btn(x, i)).join('')}
        ${office.length ? `<p class="label">${tr('Oder ein anderer Weg', 'Or another way')}</p>${office.map(([x, i]) => btn(x, i)).join('')}` : ''}</div>`;
    }
    const age = coachAge(c);
    const step = c.coach && age != null && (age >= 50 || coachMode(c) === 'coachOnly')
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
    return `${t.log.length && !t.skipped ? `<p class="reply ok">${t.log.at(-1)}</p>` : ''}${this.festivalCard({ seasonEnd: true })}<button class="primary" data-action="onNewSeason">${tr('Nächste Saison', 'Next season')}</button>`;
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
