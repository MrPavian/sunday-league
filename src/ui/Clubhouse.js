import { plural, tr } from '../core/i18n.js';
import { kitPreviewURL } from '../render/kitPaint.js';
import { jobPerk } from '../data/jobs.js';
import { CREST_COLORS, CREST_DIVISIONS, CREST_SHAPES, CREST_SYMBOLS, crestOf, crestSVG, defaultCrest, FIGURES } from './crest.js';
import { awardLabel } from '../career/awards.js';
import { relegationNeeded, relegationOf } from '../career/relegation.js';
import { LEAGUES } from '../career/clubs.js';
import {
  clubById,
  currentLineup,
  humanClub,
  KIT_COLORS,
  KIT_PATTERNS,
  kitEditable,
  updateClub,
  updateCrest,
  maxSquad,
  leagueOf,
  MIN_SQUAD,
  recruit,
  recruitChance,
  releasePlayer,
  scoutRumor,
  humanFixture,
  nudge,
  playerOf,
  resetLineup,
  setLineupSlot,
  seasonOver,
  table,
} from '../career/career.js';
import { acceptSponsor, bookTrip, FINES, KIT_COST, SLOTS, TRIP_COST } from '../career/finances.js';
import { DESTINATIONS, tripChoose, tripStage, tripState, tripVerdict } from '../career/trip.js';
import { build, canBuild, facilities, FACILITIES } from '../career/facilities.js';
import { bossOf, goalProgress, goalText, lineOf, negotiate, relLabel, shirtSponsor, sponsorColor, TRAITS as SPONSOR_TRAITS } from '../career/sponsors.js';
import { inviteChance, inviteTrialist, isRawDiamond, MAX_STATIONS, runStation, startTraining, STATIONS, TRAINING_COST, trainingDone } from '../career/training.js';
import { promoteProspect, roleName, STAFF_ROLES } from '../career/youth.js';
import { eventView, moodLabel, moodText, resolveEvent, storyTag } from '../career/events.js';
import { storyLabels } from '../career/stories.js';
import { chronicleData, yearOf } from '../career/sagas.js';
import { coachAge, coachPlaying, legacy, legacyPrompt, resolveLegacy, stepDown, succeed, successionCandidates } from '../career/legacy.js';
import { askWirt, buyRound, dossier, playDart, PUB_ACTIONS, PUB_NAME, pubOpen, pubState, ROUND_PRICE, setTactic, TACTICS, talk, wirtName } from '../career/pub.js';
import { DOSSIER_LABELS } from '../data/backstories.js';
import { weatherLine } from '../career/weather.js';
import { FOCUS, ownKids, poachChance, poachKid, scoutList, setYouthFocus, talentGuess, TEAMS, teamOfAge } from '../career/academy.js';
import { derbyOf, isDerbyFixture } from '../career/derby.js';
import { CUP_NAME, CUPS, cupClub, cupOf, groupTable, humanCupMatch, PRIZES, stageName, tournamentOpen, winterCupDue, winterCupRunning } from '../career/tournament.js';
import { canSupportDream, DREAM_COST, supportDream } from '../career/pub.js';
import { chemistry, REL, relationLabel, relationsOfPlayer, shortName } from '../career/relations.js';
import { childAge, coachAway, coachName, energyLabel, familyText, isCoach, patienceLabel, STYLES, trainingLocked } from '../career/personal.js';
import { TRAITS } from '../data/traits.js';
import { jobName } from '../data/names.js';
import { tierById } from '../data/tiers.js';
import { POSITIONS } from '../sim/generator.js';
import { PITCHES } from '../sim/pitch.js';

const STATUS = { yes: [tr('Zusage', 'In'), 'yes'], no: [tr('Absage', 'Out'), 'no'], late: [tr('Kommt später', 'Coming late'), 'late'] };
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const first = (name) => name.split(' ')[0];
// Dart: je näher an der Mitte, desto mehr Punkte (max. 60 pro Wurf).
const dartPoints = (x) => Math.round(60 * Math.max(0, 1 - Math.abs(x)) ** 1.4);
const formArrow = (f = 0) => (f >= 0.25 ? ` <span class="form up" title="${tr('gut drauf', 'in form')}">▲</span>` : f <= -0.25 ? ` <span class="form down" title="${tr('nicht in Form', 'out of form')}">▼</span>` : '');
// Chat-Zeit „Mo 09:00" → „Mon 09:00".
const timeLabel = (t) => tr(t, String(t ?? '').replace(/^(Mo|Di|Mi|Do|Fr|Sa|So)\b/, (d) => ({ Mo: 'Mon', Di: 'Tue', Mi: 'Wed', Do: 'Thu', Fr: 'Fri', Sa: 'Sat', So: 'Sun' })[d]));
const leagueName = (c) => leagueOf(c)?.name ?? c.league;
const euro = (n) => tr(`${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`, `€${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`);

// Vereinsheim: Chatgruppe, Kader, Tabelle, Spielplan – und der nächste Spieltag.
export class Clubhouse {
  constructor(root, handlers) {
    this.root = root;
    this.h = handlers;
    this.tab = 'chat';
    this.busy = null;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t || this.busy) return;
      const { action, value } = t.dataset;
      if (action === 'tab') this.tab = value;
      else if (action === 'playerCard') this.openPlayer = this.openPlayer === Number(value) ? null : Number(value);
      else if (action === 'poachKid') {
        poachKid(this.career, value);
        this.h.onChange();
      } else if (action === 'youthFocus') {
        setYouthFocus(this.career, value);
        this.h.onChange();
      }
      else if (action === 'chronicle') this.showChronicle = !this.showChronicle;
      else if (action === 'kitColor') {
        const [part, color] = value.split(':');
        this.draft.kit[part] = Number(color);
      } else if (action === 'kitPattern') this.draft.kit.pattern = value;
      else if (action.startsWith('crest')) this.crestAction(action, value);
      else if (action === 'saveClub') {
        const res = updateClub(this.career, this.draft);
        this.clubNote = res === 'nocash' ? tr(`Zu wenig in der Kasse – ein neuer Trikotsatz kostet ${KIT_COST} €.`, `Not enough in the kitty – a new kit costs €${KIT_COST}.`) : tr('Bestellt!', 'Ordered!');
        if (res !== 'nocash') this.draft = null;
        this.h.onChange();
      } else if (action === 'negotiate') {
        negotiate(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'build') {
        const [id, mode] = value.split(':');
        build(this.career, id, mode);
        this.h.onChange();
      } else if (action === 'sponsor') {
        acceptSponsor(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'training') {
        startTraining(this.career);
        this.h.onChange();
      } else if (action === 'station') {
        runStation(this.career, value);
        this.h.onChange();
      } else if (action === 'invite') {
        inviteTrialist(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'pubRound') {
        buyRound(this.career);
        this.h.onChange();
      } else if (action === 'pubTalk') {
        talk(this.career, Number(this.pubPick), value);
        this.h.onChange();
      } else if (action === 'pubDream') {
        supportDream(this.career, Number(this.pubPick));
        this.h.onChange();
      } else if (action === 'pubTactic') {
        setTactic(this.career, value);
        this.h.onChange();
      } else if (action === 'pubWirt') {
        askWirt(this.career);
        this.h.onChange();
      } else if (action === 'dartStart') {
        this.dart = { throws: [], t0: performance.now() };
        this.render();
        this.animateDart();
      } else if (action === 'dartThrow' && this.dart) {
        this.dart.throws.push(dartPoints(this.dartPos()));
        if (this.dart.throws.length >= 3) {
          const sum = this.dart.throws.reduce((a, b) => a + b, 0);
          this.dart = null;
          playDart(this.career, sum);
          this.h.onChange();
        } else this.render(), this.animateDart();
      } else if (action === 'event') {
        resolveEvent(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'promote') {
        promoteProspect(this.career, Number(value), maxSquad(this.career));
        this.h.onChange();
      } else if (action === 'legacy') {
        resolveLegacy(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'stepDown') {
        if (!this.confirmStepDown) {
          this.confirmStepDown = true;
          this.render();
          return;
        }
        this.confirmStepDown = false;
        stepDown(this.career);
        this.h.onChange();
      } else if (action === 'successor') {
        const cand = successionCandidates(this.career)[Number(value)];
        if (cand?.type === 'neu') return this.h.onNewCoach();
        if (cand) succeed(this.career, cand);
        this.h.onChange();
      } else if (action === 'tripChoose') {
        tripChoose(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'trip') {
        bookTrip(this.career, value);
        this.h.onChange();
      } else if (action === 'scout') {
        scoutRumor(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'recruit') {
        recruit(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'release') {
        // Zweiter Klick bestätigt (Browser-Dialoge sind nicht überall erlaubt).
        if (this.confirmRelease !== Number(value)) {
          this.confirmRelease = Number(value);
          this.render();
          return;
        }
        this.confirmRelease = null;
        releasePlayer(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'autoLineup') {
        resetLineup(this.career);
        this.h.onChange();
      } else if (action === 'nudge') {
        nudge(this.career, Number(value));
        this.h.onChange();
      } else if (action in this.h) return this.h[action](value);
      this.render();
    });
  }

  bindClubForm() {
    this.root.querySelectorAll('input[data-field]').forEach((el) =>
      el.addEventListener('input', () => {
        this.draft[el.dataset.field] = el.value;
      }),
    );
  }

  bindPub() {
    const sel = this.root.querySelector('select[data-pub-pick]');
    sel?.addEventListener('change', () => {
      this.pubPick = Number(sel.value);
      this.render();
    });
  }

  bindLineup() {
    this.root.querySelectorAll('select[data-slot]').forEach((sel) =>
      sel.addEventListener('change', () => {
        setLineupSlot(this.career, Number(sel.dataset.slot), Number(sel.value));
        this.h.onChange();
        this.render();
      }),
    );
  }

  // Spieler mit aktueller Entwicklung und Alter.
  p(idx) {
    return playerOf(this.career, idx);
  }

  show(career, { results = null } = {}) {
    this.career = career;
    this.results = results;
    this.busy = null;
    this.root.hidden = false;
    this.render();
  }

  hide() {
    this.root.hidden = true;
  }

  setBusy(text) {
    this.busy = text;
    this.render();
  }

  render() {
    const c = this.career;
    const club = humanClub(c);
    const over = seasonOver(c);
    const roundNo = Math.min(c.round + 1, c.fixtures.length);
    const tabs = [
      ['chat', tr('Chatgruppe', 'Group chat')],
      ['pub', tr('Kneipe', 'Pub')],
      ['squad', tr('Kader', 'Squad')],
      ['lineup', tr('Aufstellung', 'Line-up')],
      ['transfers', tr('Transfers', 'Transfers')],
      ['training', tr('Training', 'Training')],
      ['youth', tr('Jugend', 'Youth')],
      ['table', tr('Tabelle', 'Table')],
      ['cup', tr('Turnier', 'Cup')],
      ['club', tr('Verein', 'Club')],
      ['cash', tr('Kasse', 'Kitty')],
      ['fixtures', tr('Spielplan', 'Fixtures')],
    ];
    this.root.innerHTML = `
      <div class="club-panel">
        <header style="--kit:${hex(club.kit.shirt)}">
          <div><h2>${crestSVG(crestOf(club), { size: 30, short: club.short, label: club.name })}${club.name}</h2>
          <small>${leagueName(c)} · ${tr('Saison', 'Season')} ${c.season} · ${over ? tr('Saison beendet', 'Season over') : `${this.results ? tr('Ergebnisse', 'Results') : tr('Woche vor', 'Week before')} ${tr('Spieltag', 'matchday')} ${roundNo} / ${c.fixtures.length}`}</small></div>
          <button data-action="onMenu">${tr('Hauptmenü', 'Main menu')}</button>
        </header>
        <div class="club-grid">
          <section class="main">
            <nav>${tabs.map(([id, label]) => `<button data-action="tab" data-value="${id}" class="${this.tab === id ? 'active' : ''}">${label}</button>`).join('')}</nav>
            <div class="tab">${this[`tab_${this.tab}`]()}</div>
          </section>
          <aside>${over ? this.seasonEnd() : this.results ? this.roundResults() : this.nextMatch()}</aside>
        </div>
      </div>`;
    this.bindLineup();
    this.bindPub();
    this.bindClubForm();
  }

  nextMatch() {
    const c = this.career;
    const f = humanFixture(c);
    const club = humanClub(c);
    const home = f.home === club.id;
    const opp = clubById(c, home ? f.away : f.home);
    const venue = PITCHES[clubById(c, f.home).venue];
    const w = c.week;
    const avail = Object.values(c.week.availability);
    const count = (s) => avail.filter((a) => a === s).length;
    return `
      <div class="fixture-card">
        <p class="label">${tr('Sonntag, 10:30 Uhr', 'Sunday, 10:30')}${isDerbyFixture(c, f) ? ` · <b class="derby">${derbyOf(c).name}</b>` : ''}</p>
        <h3>${home ? club.short : opp.short} – ${home ? opp.short : club.short}</h3>
        <p>${home ? tr('Heimspiel', 'Home') : tr('Auswärts', 'Away')} ${tr('gegen', 'against')} <b>${opp.name}</b></p>
        <p class="venue-line">${venue.name} · ${venue.surface.name} · ${venue.format} ${tr('gegen', 'v')} ${venue.format}</p>
        <p class="venue-line weather">${weatherLine(c.week?.weather)}</p>
        <p class="avail">${count('yes')} ${tr('Zusagen', 'in')} · ${count('late')} ${tr('später', 'late')} · ${count('no')} ${tr('Absagen', 'out')}</p>
        <p class="mood-line">${tr('Stimmung im Team', 'Team spirit')}: <b class="mood mood-${moodLabel(c.mood ?? 0)}">${moodText(c.mood ?? 0)}</b></p>
        ${w.event && w.event.choice === null ? `<p class="warn">${tr('In der Gruppe wartet eine Entscheidung auf dich.', 'A decision is waiting for you in the group chat.')}</p>` : ''}
        ${storyLabels(c).length ? `<ul class="stories">${storyLabels(c).map((s) => `<li>${s}</li>`).join('')}</ul>` : ''}
        ${count('yes') < venue.format ? `<p class="warn">${tr('Zu wenige Zusagen – es hilft jemand aus dem Bekanntenkreis aus.', 'Not enough players – someone from a mate\'s circle will help out.')}</p>` : ''}
        ${this.meBars()}
        ${winterCupDue(c) ? `<div class="winter-cup"><p class="label">${tr('Winterpause', 'Winter break')}</p><p>${tr(`Am Wochenende: <b>${CUPS.halle.name}</b> in der ${CUPS.halle.place}. Acht Teams, Bande, Handballtore – ${CUPS.halle.prizes.winner} € für den Sieger.`, `This weekend: <b>${CUPS.halle.name}</b> at ${CUPS.halle.place}. Eight teams, boards, handball goals – €${CUPS.halle.prizes.winner} for the winner.`)}</p>
          <button class="primary" data-action="onCupStart" data-value="halle">${tr('Anmelden', 'Enter')}</button> <button data-action="onCupSkip" data-value="halle">${tr('Diesmal nicht', 'Not this time')}</button></div>` : ''}
        ${this.busy ? `<p class="busy">${this.busy}</p>` : winterCupDue(c) ? `<p class="empty">${tr('Erst entscheiden: Hallenturnier ja oder nein? Danach geht die Liga weiter.', 'Decide first: indoor tournament, yes or no? Then the league carries on.')}</p>` : winterCupRunning(c) ? `<button class="primary" data-action="tab" data-value="cup">${tr('Zum Hallenturnier', 'To the indoor tournament')}</button><p class="empty">${tr('Der nächste Ligaspieltag steigt nach dem Turnier.', 'The next league match is after the tournament.')}</p>` : `
        ${coachAway(c) ? `<p class="warn">${tr('Du bist diese Woche nicht da – der Kapitän stellt auf, du bekommst nur das Ergebnis.', 'You are away this week – the captain picks the team, you just get the result.')}</p>` : `<button class="primary" data-action="onPlay">${tr('Selbst spielen', 'Play it yourself')}</button>`}
        <button data-action="onSimulate">${coachAway(c) ? tr('Ergebnis abwarten', 'Wait for the result') : tr('Simulieren · Liveticker', 'Simulate · live ticker')}</button>`}
      </div>`;
  }

  // Jahrgänge E bis B mit Trainingsschwerpunkt der Woche.
  academyBlock() {
    const c = this.career;
    const kids = [...(c.youth.kids ?? []), ...ownKids(c)];
    const focus = c.week?.youthFocus ?? 'spass';
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
    const focusButtons = Object.entries(FOCUS)
      .map(([id, f]) => `<button class="${focus === id ? 'active' : ''}" data-action="youthFocus" data-value="${id}" ${!c.week || this.results ? 'disabled' : ''} title="${f.desc}">${f.name}</button>`)
      .join('');
    const teams = TEAMS.map((t) => {
      const list = kids.filter((k) => teamOfAge(k.age)?.id === t.id).sort((a, b) => b.age - a.age);
      if (!list.length) return '';
      const rows = list
        .map((k) => `<li class="${k.own ? 'own' : ''}"><b>${k.name}</b>${k.own ? ` <span class="me-tag">${k.girl ? tr('Tochter', 'daughter') : tr('Sohn', 'son')}</span>` : ''} <small>${k.age}${tr(' J.', ' yrs')} · ${POSITIONS[k.position]}${k.girl ? tr(' · Mädchen', ' · girl') : ''}${k.parent === 'ehrgeizig' ? tr(' · ehrgeiziger Vater', ' · pushy father') : k.parent === 'engagiert' ? tr(' · Eltern helfen mit', ' · parents help out') : ''}</small>
          <span class="stars" title="${tr('Einschätzung des Jugendtrainers', 'Youth coach\'s assessment')}">${stars(talentGuess(c, k))}</span><span class="me-bar mini"><i style="--v:${Math.round(k.joy * 100)}%"></i><small>${tr('Spaß', 'fun')}</small></span></li>`)
        .join('');
      return `<article class="youth-team"><h5>${t.name} <small>(${t.ages[0]}–${t.ages[1]}${tr(' J.', ' yrs')})</small></h5><ul class="plain">${rows}</ul></article>`;
    }).join('');
    const last = c.youth.results?.at(-1);
    return `<h4>${tr('Jugendtraining diese Woche', 'Youth training this week')}</h4>
      <div class="actions">${focusButtons}</div>
      <p class="empty">${FOCUS[focus].desc} ${tr('Mit 16 wechseln die Kinder in die A-Jugend – Mädchen ins Frauenteam, sobald es eins gibt.', 'At 16 the kids move up to the U19s – girls to the women\'s team once there is one.')}</p>
      <div class="youth-teams">${teams || `<p class="empty">${tr('Keine Kinder in der Jugend.', 'No kids in the youth section.')}</p>`}</div>
      ${last ? `<p>${tr('Letzte Saison', 'Last season')}: ${last.results.map((r) => tr(`${r.team}-Jugend ${r.pos}.`, `${r.team} youth: ${r.pos}.`)).join(' · ')}</p>` : ''}
      <h4>${tr('Talente bei anderen Vereinen', 'Talents at other clubs')}</h4>
      <p class="empty">${tr('Einmal pro Woche kannst du die Eltern eines Talents ansprechen. Kostet Kraft – und die anderen Vereine mögen das gar nicht.', 'Once a week you can approach a talent\'s parents. It costs energy – and the other clubs really don\'t like it.')}</p>
      <ul class="plain scout-kids">${scoutList(c)
        .map((k) => `<li><b>${k.name}</b> <small>${k.age}${tr(' J.', ' yrs')} · ${POSITIONS[k.position]} · ${k.club}</small> <span class="stars">${stars(talentGuess(c, k))}</span>
          ${k.status === 'open' ? `<button class="tiny" data-action="poachKid" data-value="${k.id}" ${!c.week || c.week.poached || this.results ? 'disabled' : ''}>${tr('Ansprechen', 'Approach')} (~${Math.round(poachChance(c, k) * 100)} %)</button>` : `<small class="reply ${k.status === 'joined' ? 'ok' : 'no'}">${k.reply}</small>`}</li>`)
        .join('')}</ul>`;
  }

  // Stammkneipe: zwei Aktionen pro Woche.
  tab_pub() {
    const c = this.career;
    if (!c.week || this.results) return `<p class="empty">${tr(`Die „${PUB_NAME}" macht nach dem Spieltag wieder auf.`, `"${PUB_NAME}" opens again after matchday.`)}</p>`;
    if (!pubOpen(c)) return `<p class="warn">${tr('Du bist diese Woche nicht da. Die Jungs gehen ohne dich – und erzählen dir hinterher nur die Hälfte.', 'You are away this week. The lads go without you – and only tell you half of it afterwards.')}</p>`;
    const pub = pubState(c);
    const club = humanClub(c);
    const left = pub.actions;
    const dis = left <= 0 ? 'disabled' : '';
    const mates = club.squad.filter((idx) => !isCoach(c, idx));
    if (this.pubPick == null || !mates.includes(Number(this.pubPick))) this.pubPick = mates[0];
    const pick = Number(this.pubPick);
    const facts = pick != null ? dossier(c, pick) : [];
    const cost = Math.round(club.squad.length * ROUND_PRICE);
    const tactics = Object.entries(TACTICS)
      .map(([id, t]) => `<button class="${pub.tactic === id ? 'active' : ''}" data-action="pubTactic" data-value="${id}" ${dis} title="${t.desc}">${t.name}</button>`)
      .join('');
    const dart = this.dart
      ? `<div class="dart"><div class="board"><i class="zone z1"></i><i class="zone z2"></i><i class="zone z3"></i><b class="pin"></b></div>
          <p>${tr('Wurf', 'Throw')} ${this.dart.throws.length + 1} ${tr('von', 'of')} 3 ${this.dart.throws.length ? `· ${tr('bisher', 'so far')} ${this.dart.throws.join(' + ')}` : ''}</p>
          <button class="primary" data-action="dartThrow">${tr('Werfen!', 'Throw!')}</button></div>`
      : `<button data-action="dartStart" ${dis}>${tr('Dart gegen Opa Heinz – Verlierer zahlt die Runde', 'Darts against Grandpa Heinz – loser buys the round')}</button>`;
    return `
      <div class="pub">
        <p class="chat-head">${tr(`„${PUB_NAME}" · Wirt ${wirtName(c)} · noch ${left} von ${PUB_ACTIONS} Aktionen diese Woche <small>(jede kostet etwas Familienzeit)</small>`, `"${PUB_NAME}" · landlord ${wirtName(c)} · ${left} of ${PUB_ACTIONS} actions left this week <small>(each costs a little family time)</small>`)}</p>
        <blockquote class="heinz">${tr('Opa Heinz am Stammtisch', 'Grandpa Heinz at the regulars\' table')}: ${pub.heinz}</blockquote>
        ${pub.log.length ? `<ul class="pub-log">${pub.log.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
        <div class="pub-grid">
          <article><h4>${tr('Runde ausgeben', 'Buy a round')}</h4><p>${tr(`Für alle ${club.squad.length}: ${cost} €. Hebt die Stimmung.`, `For all ${club.squad.length}: €${cost}. Lifts the mood.`)}</p><button data-action="pubRound" ${dis}>${tr('Runde bestellen', 'Order a round')}</button></article>
          <article><h4>${tr('Wirt ausfragen', 'Pump the landlord')}</h4><p>${tr(`${wirtName(c)} kennt jeden. Mal ein Name für die Transfers, mal ein Tipp zum nächsten Gegner.`, `${wirtName(c)} knows everyone. Sometimes a name for transfers, sometimes a tip on the next opponent.`)}</p><button data-action="pubWirt" ${dis}>${tr('„Und, was gibt\'s Neues?"', '"So, what\'s new?"')}</button>${pub.intel ? `<p class="reply ok">${tr('Tipp zum Gegner notiert – wirkt am Sonntag.', 'Tip on the opponent noted – it counts on Sunday.')}</p>` : ''}</article>
          <article class="wide"><h4>${tr('Einzelgespräch', 'One-to-one')}</h4>
            <select data-pub-pick>${mates.map((idx) => `<option value="${idx}" ${idx === pick ? 'selected' : ''}>${this.p(idx).name}</option>`).join('')}</select>
            <ul class="dossier">${facts.map((f) => `<li><b>${DOSSIER_LABELS[f.kind]}:</b> ${f.known ? f.text : `<em>${tr('noch unbekannt', 'not known yet')}</em>`}</li>`).join('')}
              ${pick != null && relationsOfPlayer(c, pick).length ? `<li><b>${tr('Im Team', 'In the team')}:</b> ${relationLabel(c, pick)}</li>` : ''}
              ${pick != null && c.players[pick]?.dreamDone ? `<li><b>${tr('Traum', 'Dream')}:</b> <em>${tr('unterstützt – er ist dir dankbar und sagt seltener ab', 'supported – he is grateful and drops out less often')}</em></li>` : ''}</ul>
            ${pick != null && canSupportDream(c, pick) ? `<button data-action="pubDream" ${c.cash < DREAM_COST ? 'disabled' : ''}>${tr(`Seinen Traum unterstützen (${DREAM_COST} €, kostet Kraft)`, `Support his dream (€${DREAM_COST}, costs energy)`)}</button>` : ''}
            <div class="actions">
              <button data-action="pubTalk" data-value="listen" ${dis}>${tr('Zuhören', 'Listen')}</button>
              <button data-action="pubTalk" data-value="cheer" ${dis}>${tr('Aufmuntern', 'Cheer him up')}</button>
              <button data-action="pubTalk" data-value="straight" ${dis}>${tr('Klartext reden', 'Give it to him straight')}</button>
            </div></article>
          <article class="wide"><h4>${tr('Taktik auf dem Bierdeckel', 'Tactics on a beer mat')}</h4><p>${tr('Gilt fürs nächste Spiel.', 'Applies to the next match.')}${pub.tactic ? ` ${tr('Gewählt', 'Chosen')}: <b>${TACTICS[pub.tactic].name}</b>.` : ''}</p><div class="actions">${tactics}</div></article>
          <article class="wide"><h4>${tr('Dart', 'Darts')}</h4>${dart}${pub.dart ? `<p class="reply">${tr('Letztes Duell', 'Last duel')}: ${pub.dart.you} ${tr('zu', 'to')} ${pub.dart.heinz}</p>` : ''}</article>
        </div>
      </div>`;
  }

  dartPos() {
    const t = (performance.now() - this.dart.t0) / 1000;
    const speed = 1.6 + this.dart.throws.length * 0.35; // jeder Wurf etwas wackliger
    return Math.sin(t * speed * Math.PI) * (0.92 + 0.08 * Math.sin(t * 7.3));
  }

  animateDart() {
    const pin = this.root.querySelector('.dart .pin');
    if (!pin || !this.dart) return;
    pin.style.left = `${50 + this.dartPos() * 48}%`;
    requestAnimationFrame(() => this.animateDart());
  }

  // Vereinschronik – zum Jubiläum als Festschrift.
  chronicleBlock() {
    const d = chronicleData(this.career);
    const title = d.festschrift ? tr(`Festschrift: ${d.festschrift.age} Jahre ${d.name}`, `Anniversary book: ${d.festschrift.age} years of ${d.name}`) : tr(`Chronik des ${d.name}`, `${d.name} chronicle`);
    if (!this.showChronicle) return `<p><button data-action="chronicle">${d.festschrift ? tr('Festschrift lesen', 'Read the anniversary book') : tr('Vereinschronik', 'Club chronicle')}</button> <small>${tr('gegründet', 'founded')} ${d.founded} · ${d.age} ${tr('Jahre', 'years')}</small></p>`;
    const seasons = d.seasons.length
      ? d.seasons.map((h) => `<tr><td>${h.year}</td><td>${h.league}</td><td class="num">${h.pos}.</td><td>${h.pos === 1 ? tr('Meister', 'Champions') : h.relegated ? tr('Abstieg', 'Relegated') : ''}</td><td>${h.topScorer ? `${h.topScorer.name} (${h.topScorer.goals})` : '–'}</td></tr>`).join('')
      : `<tr><td colspan="5"><em>${tr('Die erste Saison läuft noch.', 'The first season is still under way.')}</em></td></tr>`;
    const list = (arr, key, unit) => arr.filter((p) => p[key] > 0).map((p) => `<li>${p.name}${p.active ? '' : tr(' <small>(Ehemaliger)</small>', ' <small>(former)</small>')} – ${p[key]} ${unit}</li>`).join('') || `<li><em>${tr('noch keine', 'none yet')}</em></li>`;
    const events = d.events.length ? d.events.map((e) => `<li><b>${yearOf(this.career, e.season)}</b> ${e.text}</li>`).join('') : `<li><em>${tr('Die großen Geschichten kommen noch.', 'The big stories are still to come.')}</em></li>`;
    const frauen = d.frauen ? `<p>${tr(`Frauenteam seit Saison ${d.frauen.founded}, Kapitänin ${d.frauen.captain}`, `Women's team since season ${d.frauen.founded}, captain ${d.frauen.captain}`)}${d.frauen.seasons.length ? ` · ${tr('Platzierungen', 'Finishes')}: ${d.frauen.seasons.map((s) => `${s.pos}.`).join(', ')}` : ''}</p>` : '';
    const pros = d.pros.length ? `<p>${tr('Aus der eigenen Jugend zu den Profis', 'From our youth to the pros')}: ${d.pros.map((p) => `${p.name} (${p.club})${p.back ? tr(' – zurück im Verein', ' – back at the club') : ''}`).join(', ')}</p>` : '';
    return `<div class="paper chronicle-paper">
        <div class="masthead">${title} <small>${tr('seit', 'since')} ${d.founded}</small></div>
        <p class="lead">${tr(`Gegründet ${d.founded} am Stammtisch einer Kneipe am Kanal – mit einem Ball, elf Leuten und keinem Tor.`, `Founded in ${d.founded} at the regulars' table of a pub by the canal – with one ball, eleven people and no goal.`)}</p>
        <h4>${tr('Saisons', 'Seasons')}</h4>
        <table class="stats season-table"><thead><tr><th>${tr('Jahr', 'Year')}</th><th>${tr('Liga', 'League')}</th><th>${tr('Platz', 'Pos.')}</th><th></th><th>${tr('Torschützenkönig', 'Top scorer')}</th></tr></thead><tbody>${seasons}</tbody></table>
        <div class="records"><div><h4>${tr('Rekordspieler', 'Most appearances')}</h4><ul>${list(d.topApps, 'apps', tr('Spiele', 'games'))}</ul></div><div><h4>${tr('Rekordtorschützen', 'Top scorers')}</h4><ul>${list(d.topGoals, 'goals', tr('Tore', 'goals'))}</ul></div></div>
        ${frauen}${pros}
        ${this.erasBlock()}
        <h4>${tr('Meilensteine', 'Milestones')}</h4><ul class="milestones">${events}</ul>
        <button data-action="chronicle">${tr('Zuklappen', 'Close')}</button>
      </div>`;
  }

  // Vereinsheim ausbauen: Handwerker oder Arbeitseinsatz.
  facilityBlock() {
    const c = this.career;
    const f = facilities(c);
    const rows = Object.entries(FACILITIES)
      .map(([id, def]) => {
        const built = f.built[id];
        const building = f.building?.id === id;
        const locked = (def.needs ?? []).some((n) => !f.built[n]);
        const state = built
          ? `<span class="ok">${tr('steht seit Saison', 'built in season')} ${built}</span>`
          : building
            ? `<span class="warn">${tr('im Bau, noch', 'under construction,')} ${f.building.weeks} ${plural(f.building.weeks, 'Woche', 'Wochen', 'week', 'weeks')}${tr('', ' to go')}</span>`
            : locked
              ? `<small>${tr('braucht erst', 'needs first')}: ${def.needs.map((n) => FACILITIES[n].name).join(', ')}</small>`
              : canBuild(c, id)
                ? `<button data-action="build" data-value="${id}:handwerker" ${c.cash < def.cost ? 'disabled' : ''}>${tr('Handwerker', 'Builders')} (${euro(def.cost)})</button>
                   <button data-action="build" data-value="${id}:einsatz" ${c.cash < def.cost / 2 ? 'disabled' : ''}>${tr('Arbeitseinsatz', 'Work party')} (${euro(def.cost / 2)}, ${def.weeks * 2} ${tr('Wo.', 'wks')})</button>`
                : `<small>${tr('erst die laufende Baustelle fertig machen', 'finish the current building work first')}</small>`;
        return `<li class="facility${built ? ' built' : ''}"><div><b>${def.name}</b> <small>${def.weeks} ${plural(def.weeks, 'Woche', 'Wochen', 'week', 'weeks')}${def.upkeep ? ` · ${euro(def.upkeep)}${tr('/Woche Nebenkosten', '/week running costs')}` : ''}</small><br><small>${def.desc}</small></div><div class="state">${state}</div></li>`;
      })
      .join('');
    return `<div class="facilities"><h4>${tr('Vereinsheim ausbauen', 'Upgrade the clubhouse')} <small>${tr('Kasse', 'Kitty')}: ${euro(c.cash)}</small></h4>
      ${f.note ? `<p class="reply ok">${f.note}</p>` : ''}<ul class="plain">${rows}</ul></div>`;
  }

  // Trainer-Ären: Wer saß wann an der Seitenlinie?
  erasBlock() {
    const c = this.career;
    const eras = legacy(c).eras;
    const since = c.coach?.since ?? 1;
    const now = c.coach?.idx != null ? `<li><b>${yearOf(c, since)}–${tr('heute', 'today')}</b> ${playerOf(c, c.coach.idx).name}${c.coach.generation > 1 ? tr(` <small>(${c.coach.generation}. Trainer-Ära)</small>`, ` <small>(manager era no. ${c.coach.generation})</small>`) : ''}</li>` : '';
    if (!eras.length) return '';
    return `<h4>${tr('Trainer', 'Managers')}</h4><ul class="milestones">${eras.map((e) => `<li><b>${yearOf(c, e.from)}–${yearOf(c, e.to)}</b> ${e.name} – ${e.seasons} ${plural(e.seasons, 'Saison', 'Saisons', 'season', 'seasons')}${e.titles ? tr(`, ${e.titles}× Meister`, `, ${e.titles}× champions`) : ''}${tr(', heute Ehrenpräsident', ', now honorary president')}</li>`).join('')}${now}</ul>`;
  }

  // Familie & Energie des Spielertrainers als kleine Balken.
  meBars() {
    const k = this.career.coach;
    if (!k) return '';
    const bar = (label, v, text) => `<div class="me-bar ${v < 25 ? 'low' : v < 50 ? 'mid' : ''}"><span>${label}</span><i style="--v:${v}%"></i><small>${text}</small></div>`;
    return `<div class="me-bars">${bar(tr('Familie', 'Family'), k.patience, patienceLabel(k.patience))}${bar(tr('Energie', 'Energy'), k.energy, energyLabel(k.energy))}</div>`;
  }

  roundResults() {
    const c = this.career;
    const round = this.results;
    return `
      <div class="fixture-card">
        <p class="label">${tr('Ergebnisse Spieltag', 'Results, matchday')} ${c.round + 1}</p>
        <ul class="results">${round
          .map((f) => {
            const h = clubById(c, f.home);
            const a = clubById(c, f.away);
            const mine = h.human || a.human;
            return `<li class="${mine ? 'mine' : ''}"><span>${h.short}</span><b>${f.result.home} : ${f.result.away}</b><span>${a.short}</span></li>`;
          })
          .join('')}</ul>
        ${this.miniTable()}
        <button class="primary" data-action="onNextWeek">${tr('Weiter zur nächsten Woche', 'On to next week')}</button>
      </div>`;
  }

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
        ${this.miniTable()}
        ${chronicle}
        ${this.tripBlock()}
        ${this.legacyAside() ?? this.relegationAside() ?? this.cupAside()}
      </div>`;
  }

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
      <button class="primary" data-action="onRelPlay">${leg === 0 ? tr('Hinspiel selbst spielen', 'Play the first leg') : tr('Rückspiel selbst spielen', 'Play the second leg')}</button>
      <button data-action="onRelSimulate">${tr('Simulieren · Liveticker', 'Simulate · live ticker')}</button>`;
  }

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
  }

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
  }

  // Saisonende: erst Stadtmeisterschaft (oder absagen), dann die neue Saison.
  cupAside() {
    const c = this.career;
    const t = cupOf(c);
    if (!t) return `<p class="label">${tr('Sommer', 'Summer')}: ${CUP_NAME}</p><p>${tr(`Acht Vereine, ein Pokal, ${PRIZES.winner} € für den Sieger.`, `Eight clubs, one trophy, €${PRIZES.winner} for the winner.`)}</p>
      <button class="primary" data-action="onCupStart">${tr(`Zur ${CUP_NAME} anmelden`, `Enter the ${CUP_NAME}`)}</button>
      <button data-action="onCupSkip">${tr('Diesmal nicht – direkt in die neue Saison', 'Not this time – straight into the new season')}</button>`;
    if (tournamentOpen(c)) return `<p class="label">${tr(`${CUP_NAME} läuft`, `${CUP_NAME} under way`)}</p><button class="primary" data-action="tab" data-value="cup">${tr('Zum Turnier', 'To the tournament')}</button>`;
    return `${t.log.length && !t.skipped ? `<p class="reply ok">${t.log.at(-1)}</p>` : ''}<button class="primary" data-action="onNewSeason">${tr('Nächste Saison', 'Next season')}</button>`;
  }

  tab_cup() {
    const c = this.career;
    const trophies = (c.trophies ?? []).length ? `<h4>${tr('Vitrine', 'Trophy cabinet')}</h4><ul class="plain trophies">${c.trophies.map((t) => `<li>${tr('Pokal', 'Trophy')}: ${t.name}</li>`).join('')}</ul>` : '';
    const running = ['halle', 'stadt'].filter((k) => cupOf(c, k) && !cupOf(c, k).skipped);
    const intro = `<p class="empty">${tr(`Zwei Turniere pro Saison: die ${CUPS.halle.name} in der Winterpause (Saisonmitte, ${CUPS.halle.place}, Bande und Handballtore) und die ${CUPS.stadt.name} im Sommer nach dem letzten Spieltag (${CUPS.stadt.place}).`, `Two tournaments per season: the ${CUPS.halle.name} in the winter break (mid-season, ${CUPS.halle.place}, boards and handball goals) and the ${CUPS.stadt.name} in summer after the last matchday (${CUPS.stadt.place}).`)}</p>`;
    return `${running.length ? running.map((k) => this.cupSection(k)).join('<hr>') : intro}${trophies}`;
  }

  cupSection(kind) {
    const c = this.career;
    const t = cupOf(c, kind);
    const cfg = CUPS[kind];
    const me = humanClub(c).id;
    const table = (g) => `<table class="squad cup-table"><thead><tr><th>${tr('Gruppe', 'Group')} ${g === 0 ? 'A' : 'B'}</th><th>${tr('Sp.', 'P')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt.', 'Pts')}</th></tr></thead><tbody>${groupTable(c, g, kind)
      .map((r, i) => `<tr class="${r.id === me ? 'mine' : ''} ${i < 2 ? 'through' : ''}"><td>${r.club.name}</td><td class="num">${r.p}</td><td class="num">${r.gf}:${r.ga}</td><td class="num">${r.pts}</td></tr>`)
      .join('')}</tbody></table>`;
    const line = (m) =>
      `<li class="${m.home === me || m.away === me ? 'mine' : ''}"><small>${stageName(m)}</small> ${cupClub(c, m.home).short} ${m.result ? `<b>${m.result.home}:${m.result.away}</b>${m.pens ? ` <small>(${m.pens.home}:${m.pens.away} ${tr('i. E.', 'pens')})</small>` : ''}` : '–:–'} ${cupClub(c, m.away).short}</li>`;
    const ko = t.matches.filter((m) => m.stage === 'SF' || m.stage === 'F');
    const next = humanCupMatch(c, kind);
    let action = '';
    if (t.stage === 'done') action = `<p class="reply ok">${t.log.at(-1) ?? ''}</p>`;
    else if (this.busy) action = `<p class="busy">${this.busy}</p>`;
    else if (next) {
      const opp = cupClub(c, next.home === me ? next.away : next.home);
      action = `<div class="fixture-card"><p class="label">${stageName(next)}</p><h3>${humanClub(c).short} – ${opp.short}</h3><p>${tr('gegen', 'against')} <b>${opp.name}</b>${next.stage !== 'A' && next.stage !== 'B' ? tr(' · bei Unentschieden Elfmeterschießen', ' · penalties if level') : ''}</p>
        <button class="primary" data-action="onCupPlay" data-value="${kind}">${tr('Selbst spielen', 'Play it yourself')}</button> <button data-action="onCupSimulate" data-value="${kind}">${tr('Simulieren · Liveticker', 'Simulate · live ticker')}</button></div>`;
    } else action = `<p>${tr('Ihr seid raus – die anderen spielen noch.', 'You are out – the others are still playing.')}</p><button data-action="onCupSimulate" data-value="${kind}">${tr('Nächste Runde anschauen', 'Watch the next round')}</button>`;
    return `
      <p class="chat-head">${cfg.name} ${t.year} · ${cfg.place} · ${tr(`Sieger ${cfg.prizes.winner} €, Finale ${cfg.prizes.final} €, Halbfinale ${cfg.prizes.semi} €`, `winner €${cfg.prizes.winner}, final €${cfg.prizes.final}, semi-final €${cfg.prizes.semi}`)}</p>
      ${action}
      <div class="cup-groups">${table(0)}${table(1)}</div>
      ${ko.length ? `<h4>${tr('K.-o.-Runde', 'Knockout round')}</h4><ul class="plain cup-list">${ko.map(line).join('')}</ul>` : ''}
      <h4>${tr('Alle Spiele', 'All matches')}</h4><ul class="plain cup-list">${t.matches.filter((m) => m.result).map(line).join('') || `<li><em>${tr('Gleich geht es los.', 'Kick-off is coming up.')}</em></li>`}</ul>
      ${t.log.length ? `<h4>${tr('Eure Ergebnisse', 'Your results')}</h4><ul class="plain">${t.log.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}`;
  }

  miniTable() {
    return `<ol class="mini">${table(this.career)
      .map((r) => `<li class="${r.club.human ? 'mine' : ''}"><span>${r.club.short}</span><b>${r.pts}</b></li>`)
      .join('')}</ol>`;
  }

  tab_chat() {
    const c = this.career;
    if (!c.week) return `<p class="empty">${tr('Die Gruppe ist ruhig. Saisonpause.', 'The group is quiet. Off-season.')}</p>`;
    const w = c.week;
    const club = humanClub(c);
    const bubbles = w.chat
      .map((msg) => {
        if (msg.from === null) return `<div class="bubble me"><b>${tr('Du (Trainer)', 'You (manager)')}</b>${msg.text}<time>${timeLabel(msg.time)}</time></div>`;
        const p = this.p(msg.from);
        const status = STATUS[w.availability[msg.from]];
        return `<div class="bubble"><b>${p.name}</b>${msg.text}<time>${timeLabel(msg.time)}</time>${status ? `<i class="st ${status[1]}"></i>` : ''}</div>`;
      })
      .join('');
    const declined = club.squad.filter((idx) => w.availability[idx] === 'no' && !w.nudged.includes(idx) && !c.players[idx].injuryWeeks).filter((idx) => !isCoach(c, idx));
    const ev = w.event;
    const view = ev ? eventView(c, ev) : null;
    const eventCard = ev
      ? `<div class="event-card">
          <p class="label">${ev.story ? `${tr('Geschichte', 'Story')} · ${storyTag(ev.story)}` : tr('Diese Woche im Verein', 'This week at the club')}</p>
          <p>${view.text}</p>
          ${ev.choice !== null
            ? `<p class="reply ok">➜ ${view.options[ev.choice] ?? ''}: ${ev.result ?? ''}</p>`
            : this.results
              ? ''
              : `<div class="actions">${view.options.map((o, i) => `<button ${i === 0 ? 'class="primary"' : ''} data-action="event" data-value="${i}">${o}</button>`).join('')}</div>`}
        </div>`
      : '';
    return `
      ${eventCard}
      <div class="chat-head">${tr('„Wer kann Sonntag?"', '"Who can play Sunday?"')} · ${club.squad.length} ${tr('Mitglieder', 'members')}</div>
      <div class="chat">${bubbles}</div>
      <div class="nudge">
        <span>${tr('Nachhaken', 'Chase up')} (${w.nudges} ${tr('übrig', 'left')}):</span>
        ${declined.length && w.nudges > 0 && !this.results
          ? declined.map((idx) => `<button data-action="nudge" data-value="${idx}">${first(this.p(idx).name)}</button>`).join('')
          : `<em>${tr('niemand', 'nobody')}</em>`}
      </div>`;
  }

  tab_squad() {
    const c = this.career;
    const club = humanClub(c);
    const canRelease = club.squad.length > MIN_SQUAD && !this.results;
    const rows = club.squad
      .map((idx) => ({ idx, p: this.p(idx), r: c.players[idx] }))
      .sort((a, b) => b.p.rating - a.p.rating)
      .map(({ idx, p, r }) => {
        const tier = tierById(p.tier);
        const st = c.week ? STATUS[c.week.availability[idx]] : null;
        const avg = r.graded ? tr((r.gradeSum / r.graded).toFixed(1).replace('.', ','), (r.gradeSum / r.graded).toFixed(1)) : '–';
        return `<tr style="--c:${tier.color}">
          <td><span class="badge">${tier.name}</span></td>
          <td><button class="linkish" data-action="playerCard" data-value="${idx}" title="${tr('Formkurve und Verlauf', 'Form and history')}"><b>${p.name}</b></button>${r.awards?.length ? ` <span class="award" title="${r.awards.map(awardLabel).join(' · ')}">★${r.awards.length > 1 ? r.awards.length : ''}</span>` : ''}${isCoach(c, idx) ? ` <span class="me-tag">${tr('Du', 'You')}</span>` : ''}${p.title ? ` <em>${p.title}</em>` : ''}${formArrow(r.form)}${r.absenceMul > 1.2 ? tr(' <span class="grumpy" title="hat gerade wenig Zeit – sagt öfter ab">selten da</span>', ' <span class="grumpy" title="short of time at the moment – drops out more often">rarely around</span>') : ''}${r.grumpy ? tr(' <span class="grumpy" title="angefressen – sagt öfter ab">grummelt</span>', ' <span class="grumpy" title="sulking – drops out more often">sulking</span>') : ''}<small>${p.age}${tr(' J.', ' yrs')} · ${jobName(p.profession)}${jobPerk(p.profession) ? ` <span class="perk-tag" title="${jobPerk(p.profession).label}">${tr('Bonus', 'perk')}</span>` : ''}</small>${relationLabel(c, idx) ? `<small class="rel">${relationLabel(c, idx)}</small>` : ''}</td>
          <td>${POSITIONS[p.position]}</td><td class="num">${p.rating}</td>
          <td>${r.injuryWeeks ? `<span class="st-text no" title="${r.injury?.label ?? tr('verletzt', 'injured')}">${r.injury ? `${r.injury.label} · ${r.injuryWeeks} ${tr('Wo.', 'wks')}` : tr('verletzt', 'injured')}</span>` : st ? `<span class="st-text ${st[1]}">${st[0]}</span>` : ''}</td>
          <td class="num">${r.apps}</td><td class="num">${r.goals}</td><td class="num">${r.assists}</td><td class="num">${avg}</td>
          <td>${canRelease && !isCoach(c, idx) ? (this.confirmRelease === idx ? `<button class="tiny danger" data-action="release" data-value="${idx}">${tr('Wirklich?', 'Sure?')}</button>` : `<button class="tiny" data-action="release" data-value="${idx}" title="${tr('Verabschieden', 'Release')}">×</button>`) : ''}</td>
        </tr>${this.openPlayer === idx ? `<tr class="player-card"><td colspan="10">${playerCard(c, idx, p, r)}</td></tr>` : ''}`;
      })
      .join('');
    return `<table class="squad"><thead><tr><th></th><th>${tr('Spieler', 'Player')}</th><th>${tr('Pos.', 'Pos.')}</th><th>${tr('Stärke', 'Rating')}</th><th>${tr('Sonntag', 'Sunday')}</th><th>${tr('Sp.', 'Apps')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Vorl.', 'Ast.')}</th><th>${tr('Ø Note', 'Avg.')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  tab_lineup() {
    const c = this.career;
    if (!c.week || this.results) return `<p class="empty">${tr('Die Aufstellung für den nächsten Spieltag gibt es nach dem Wochenstart.', 'The line-up for the next matchday is available once the week starts.')}</p>`;
    const { formation, lineup, bench } = currentLineup(c);
    const club = humanClub(c);
    const ROLE = tr({ gk: 'Tor', def: 'Abwehr', mid: 'Mitte', fwd: 'Sturm' }, { gk: 'GK', def: 'Def', mid: 'Mid', fwd: 'Att' });
    const options = club.squad
      .filter((idx) => c.week.availability[idx] === 'yes')
      .map((idx) => ({ idx, p: this.p(idx) }))
      .sort((a, b) => b.p.rating - a.p.rating);
    const slots = formation
      .map((slot, i) => {
        const current = lineup[i];
        const opts = options
          .map(({ idx, p }) => `<option value="${idx}" ${idx === current ? 'selected' : ''}>${p.name} · ${POSITIONS[p.position]} · ${p.rating}</option>`)
          .join('');
        return `<label class="slot slot-${slot.role}"><span>${ROLE[slot.role]}</span>
          <select data-slot="${i}">${current == null ? `<option selected>${tr('Aushilfe aus dem Bekanntenkreis', 'Stand-in from a mate\'s circle')}</option>` : ''}${opts}</select></label>`;
      })
      .join('');
    const gkIdx = formation.findIndex((f) => f.role === 'gk');
    const keeper = lineup[gkIdx] != null ? this.p(lineup[gkIdx]) : null;
    const keeperNote = keeper && keeper.position !== 'gk' ? `<p class="warn">${tr(`Kein Torwart da – ${keeper.name.split(' ')[0]} muss ran. Handschuhe liegen im Kofferraum.`, `No keeper – ${keeper.name.split(' ')[0]} has to go in goal. The gloves are in the boot.`)}</p>` : '';
    const chem = chemistry(c, lineup);
    const chemLine = chem.pairs.length
      ? `<p class="chem ${chem.score < 0 ? 'bad' : 'good'}">${tr('Teamchemie', 'Chemistry')} ${chem.score > 0 ? '+' : ''}${chem.score}: ${chem.pairs.map((pr) => `${shortName(c, pr.a)} & ${shortName(c, pr.b)} (${REL[pr.type].plural})`).join(' · ')}</p>`
      : `<p class="chem">${tr('Teamchemie: In dieser Aufstellung kennt sich keiner näher.', 'Chemistry: nobody in this line-up knows each other well.')}</p>`;
    const benchList = bench.length
      ? bench.map((idx) => `<li>${this.p(idx).name}${c.week.availability[idx] === 'late' ? tr(' <em>(kommt zur 2. HZ)</em>', ' <em>(arrives for the 2nd half)</em>') : ''}</li>`).join('')
      : `<li><em>${tr('niemand', 'nobody')}</em></li>`;
    if (coachAway(c)) return `<p class="warn">${tr('Du bist diese Woche nicht da. Der Kapitän stellt auf – nach bestem Wissen und Gewissen.', 'You are away this week. The captain picks the team – to the best of his knowledge.')}</p><h4>${tr('Bank', 'Bench')}</h4><ul class="bench">${benchList}</ul>`;
    return `
      <p class="chat-head">${formation.length} ${tr('gegen', 'v')} ${formation.length} · ${c.week.lineup ? tr('eigene Aufstellung', 'your line-up') : tr('automatisch aufgestellt', 'picked automatically')}</p>
      <div class="lineup">${slots}</div>
      ${chemLine}
      ${keeperNote}
      <h4>${tr('Bank', 'Bench')}</h4><ul class="bench">${benchList}</ul>
      <button data-action="autoLineup">${tr('Automatisch aufstellen', 'Pick automatically')}</button>`;
  }

  tab_transfers() {
    const c = this.career;
    const w = c.week;
    if (!w || this.results) return `<p class="empty">${tr('Die Gerüchteküche meldet sich nach dem Wochenstart.', 'The rumour mill starts up once the week begins.')}</p>`;
    const club = humanClub(c);
    const full = club.squad.length >= maxSquad(c);
    const cards = w.rumors
      .map((r, i) => {
        const p = this.p(r.idx);
        const tier = tierById(p.tier);
        const known = r.scouted;
        const badge = known ? `<span class="badge" style="--c:${tier.color}">${tier.name}</span>` : '<span class="badge unknown">?</span>';
        const rating = known ? `${tr('Stärke', 'Rating')} ${p.rating}` : `${tr('Stärke ca.', 'Rating approx.')} ${r.range[0]}–${r.range[1]}`;
        const traits = known && p.traits.length ? `<p class="traits">${p.traits.map((t) => `<i title="${TRAITS[t].desc}">${TRAITS[t].name}</i>`).join('')}</p>` : '';
        const story = known && p.backstory ? `<p class="story">${p.backstory}</p>` : '';
        const chance = Math.round(recruitChance(c, r) * 100);
        let footer;
        if (r.status === 'joined') footer = tr(`<p class="reply ok">„${r.reply}" – ist jetzt im Kader!</p>`, `<p class="reply ok">"${r.reply}" – now in the squad!</p>`);
        else if (r.status === 'declined') footer = tr(`<p class="reply no">„${r.reply}"</p>`, `<p class="reply no">"${r.reply}"</p>`);
        else
          footer = `<div class="actions">
            <button data-action="scout" data-value="${i}" ${known || w.actions <= 0 || coachAway(c) ? 'disabled' : ''}>${tr('Beim Kick zuschauen', 'Watch him play')}</button>
            <button class="primary" data-action="recruit" data-value="${i}" ${w.actions <= 0 || full || coachAway(c) ? 'disabled' : ''}>${tr('Ansprechen', 'Approach')} <small>(~${chance} %)</small></button>
          </div>`;
        return `<article class="rumor ${p.tier === 'legende' ? 'legend' : ''}" style="--c:${known ? tier.color : '#666'}">
          <p class="source">${r.source}</p>
          <div class="who">${badge} <b>${p.name}</b>${known && p.title ? ` <em>${p.title}</em>` : ''}
            <small>${p.age}${tr(' J.', ' yrs')} · ${jobName(p.profession)} · ${POSITIONS[p.position]} · ${rating}</small>${jobPerk(p.profession) ? `<small class="perk">${jobPerk(p.profession).label}</small>` : ''}</div>
          ${traits}${story}${footer}
        </article>`;
      })
      .join('');
    return `
      ${coachAway(c) ? `<p class="warn">${tr('Du bist diese Woche nicht da – Gespräche mit neuen Leuten müssen warten.', 'You are away this week – talks with new players will have to wait.')}</p>` : ''}
      <p class="chat-head">${tr('Kader', 'Squad')} ${club.squad.length}/${maxSquad(c)} · ${tr(`noch ${w.actions} Aktion${w.actions === 1 ? '' : 'en'} diese Woche`, `${w.actions} action${w.actions === 1 ? '' : 's'} left this week`)}${full ? tr(' · Kader voll – erst jemanden verabschieden', ' · squad full – release someone first') : ''}</p>
      <div class="rumors">${cards}</div>`;
  }

  tab_club() {
    const c = this.career;
    const club = humanClub(c);
    const editable = kitEditable(c);
    this.draft ??= { name: club.name, short: club.short, kit: { pattern: 'uni', second: 0xf2efe6, ...club.kit } };
    const d = this.draft;
    const mainSponsor = shirtSponsor(c);
    const sponsorShown = mainSponsor ? { name: mainSponsor.name, color: sponsorColor(mainSponsor) } : null;
    const shirtCss = (k) => `url(${kitPreviewURL(k, sponsorShown)}) center / 100% 100%`;
    const swatches = (part, label) => `
      <div class="swatch-row"><span>${label}</span>${KIT_COLORS.map(
        (col) => `<button class="swatch ${d.kit[part] === col ? 'on' : ''}" style="background:${hex(col)}" data-action="kitColor" data-value="${part}:${col}" ${editable ? '' : 'disabled'}></button>`,
      ).join('')}</div>`;
    const k = c.coach;
    const me = k?.idx != null ? this.p(k.idx) : null;
    const profile = k
      ? `<div class="me-card"><h4>${tr('Du', 'You')} – ${coachPlaying(c) ? tr('Spielertrainer', 'player-manager') : tr('Trainer', 'manager')}${k.generation > 1 ? tr(` <small>(${k.generation}. Trainer-Ära)</small>`, ` <small>(manager era no. ${k.generation})</small>`) : ''}</h4>
          <p><b>${coachName(c)}</b>${me ? ` · ${me.age}${tr(' J.', ' yrs')} · ${jobName(me.profession)} · ${POSITIONS[me.position]} · ${tr('Stärke', 'Rating')} ${me.rating}` : ''}</p>
          ${k.style ? `<p>${tr('Spielertyp', 'Player type')}: ${STYLES[k.style]?.name ?? ''}</p>` : ''}
          <p>${k.relation ? familyText(k.relation, k.children ?? []) : k.family}${k.flags.kasse ? tr(' · machst nebenbei die Vereinskasse', ' · also keeping the club accounts') : ''}${k.flags.familyAtGames ? tr(' · die Familie kommt sonntags mit', ' · the family comes along on Sundays') : ''}</p>
          ${(k.children ?? []).length ? `<ul class="plain">${k.children.map((ch) => {
            const age = childAge(c, ch);
            const where = ch.inFrauen ? tr('spielt im Frauenteam', 'plays in the women\'s team') : ch.idx != null ? (c.youth.prospects.includes(ch.idx) ? tr('in der A-Jugend', 'in the U19s') : humanClub(c).squad.includes(ch.idx) ? tr('im Kader', 'in the squad') : tr('spielt woanders', 'plays elsewhere')) : age >= 16 && ch.sex === 'w' ? tr('wartet auf ein Frauenteam', 'waiting for a women\'s team') : tr(`kickt ab 16 mit (noch ${Math.max(0, 16 - age)} Jahre)`, `plays from 16 (${Math.max(0, 16 - age)} years to go)`);
            return `<li>${ch.sex === 'w' ? tr('Tochter', 'Daughter') : tr('Sohn', 'Son')} ${ch.name}, ${age}${tr(' J.', ' yrs')} – ${where}</li>`;
          }).join('')}</ul>` : ''}
          ${this.meBars()}
          <p class="empty">${tr('Training, Scouting und Spieltage kosten Zeit mit der Familie. Unbesetzte Posten (Co-Trainer, Wirt, Platzwart) und Zusatzämter ziehen Energie. Ist einer der beiden Werte leer, fällst du zwei Wochen aus.', 'Training, scouting and matchdays cost family time. Empty posts (assistant, bar manager, groundsman) and extra duties drain energy. If either bar runs empty, you are out for two weeks.')}</p>
        </div>`
      : '';
    return `
      ${profile}
      ${this.facilityBlock()}
      ${this.chronicleBlock()}
      <div class="club-form">
        <div class="kit-preview">
          <div class="shirt" style="background:${shirtCss(d.kit)}"></div>
          <div class="shorts" style="background:${hex(d.kit.shorts)}"></div>
          <div class="socks"><i style="background:${hex(d.kit.socks)}"></i><i style="background:${hex(d.kit.socks)}"></i></div>
          <b>${d.short}</b>
          <small class="sponsor-note">${sponsorShown ? tr(`Auf der Brust: ${sponsorShown.name}`, `On the chest: ${sponsorShown.name}`) : tr('Noch kein Trikotsponsor', 'No shirt sponsor yet')}</small>
        </div>
        <div class="fields">
          <label>${tr('Vereinsname', 'Club name')} <input data-field="name" value="${d.name}" maxlength="32" ${editable ? '' : 'disabled'}></label>
          <label>${tr('Kürzel', 'Short name')} <input data-field="short" value="${d.short}" maxlength="4" ${editable ? '' : 'disabled'}></label>
          <div class="swatch-row"><span>${tr('Muster', 'Pattern')}</span>${Object.entries(KIT_PATTERNS)
            .map(([id, label]) => `<button class="${d.kit.pattern === id ? 'active' : ''}" data-action="kitPattern" data-value="${id}" ${editable ? '' : 'disabled'}>${label}</button>`)
            .join('')}</div>
          ${swatches('shirt', tr('Trikot', 'Shirt'))}
          ${d.kit.pattern !== 'uni' ? swatches('second', tr('2. Farbe', '2nd colour')) : ''}
          ${swatches('shorts', tr('Hose', 'Shorts'))}
          ${swatches('socks', tr('Stutzen', 'Socks'))}
          ${this.clubNote ? `<p class="warn">${this.clubNote}</p>` : ''}
          ${editable
            ? `<button class="primary" data-action="saveClub">${tr(`Trikots bestellen <small>(neuer Satz ${KIT_COST} €, Name gratis)</small>`, `Order kits <small>(new set €${KIT_COST}, name change free)</small>`)}</button>`
            : `<p class="warn">${tr('Die Trikots für diese Saison sind bestellt. Änderungen wieder vor dem ersten Spieltag der nächsten Saison.', 'This season\'s kits are ordered. Changes again before the first matchday of next season.')}</p>`}
        </div>
      </div>
      ${this.crestBlock()}`;
  }

  crestAction(action, value) {
    const club = humanClub(this.career);
    const d = (this.crestDraft ??= structuredClone(crestOf(club)));
    if (action === 'crestShape') d.shape = value;
    else if (action === 'crestDivision') d.division = value;
    else if (action === 'crestSymbol') d.symbol = value;
    else if (action === 'crestColor') {
      const [slot, col] = value.split(':');
      d.colors[slot] = Number(col);
    } else if (action === 'crestBand') d.band = !d.band;
    else if (action === 'crestSlot') this.crestSlot = value;
    else if (action === 'crestRandom') {
      const seed = { id: `${club.id}-${Math.random()}`, kit: { shirt: d.colors.field, second: d.colors.second } };
      this.crestDraft = { ...defaultCrest(seed), colors: { ...d.colors } };
    } else if (action === 'crestReset') this.crestDraft = null;
    else if (action === 'crestSave') {
      updateCrest(this.career, d);
      this.crestDraft = null;
      this.crestNote = tr('Neues Wappen ist beim Schildermacher bestellt. Und schon auf der Anzeigetafel.', 'New crest ordered from the sign maker. Already on the scoreboard.');
      this.h.onChange();
    }
  }

  // Wappen-Editor: Form, Teilung, Symbol oder Figur, vier Farben, Schriftband.
  crestBlock() {
    const club = humanClub(this.career);
    const d = this.crestDraft ?? crestOf(club);
    const slot = this.crestSlot ?? 'field';
    const mini = (patch) => crestSVG({ ...d, ...patch, colors: d.colors }, { size: 30, short: club.short });
    const choice = (action, entries, current, patch) =>
      entries.map(([id, label]) => `<button class="crest-choice ${current === id ? 'active' : ''}" data-action="${action}" data-value="${id}" title="${label}">${mini(patch(id))}<small>${label}</small></button>`).join('');
    const symbols = Object.entries(CREST_SYMBOLS);
    const slots = tr({ field: 'Feld', second: 'Teilung', symbol: 'Symbol', border: 'Rand & Band' }, { field: 'Field', second: 'Division', symbol: 'Symbol', border: 'Border & band' });
    return `
      <div class="crest-editor">
        <div class="crest-preview">
          ${crestSVG(d, { size: 150, short: club.short, label: club.name })}
          <b>${club.name}</b>
          <div class="crest-actions">
            <button data-action="crestRandom">${tr('Würfeln', 'Shuffle')}</button>
            <button data-action="crestBand" class="${d.band ? 'active' : ''}">${tr('Schriftband', 'Name band')}</button>
            ${this.crestDraft ? `<button data-action="crestReset">${tr('Verwerfen', 'Discard')}</button>` : ''}
            <button class="primary" data-action="crestSave" ${this.crestDraft ? '' : 'disabled'}>${tr('Wappen übernehmen', 'Use this crest')}</button>
          </div>
          ${this.crestNote && !this.crestDraft ? `<p class="empty">${this.crestNote}</p>` : ''}
        </div>
        <div class="crest-options">
          <h4>${tr('Form', 'Shape')}</h4>
          <div class="crest-grid">${choice('crestShape', Object.entries(CREST_SHAPES), d.shape, (id) => ({ shape: id }))}</div>
          <h4>${tr('Teilung', 'Division')}</h4>
          <div class="crest-grid">${choice('crestDivision', Object.entries(CREST_DIVISIONS), d.division, (id) => ({ division: id }))}</div>
          <h4>${tr('Symbole', 'Symbols')}</h4>
          <div class="crest-grid">${choice('crestSymbol', symbols.filter(([id]) => !FIGURES.has(id)), d.symbol, (id) => ({ symbol: id }))}</div>
          <h4>${tr('Figuren', 'Figures')}</h4>
          <div class="crest-grid">${choice('crestSymbol', symbols.filter(([id]) => FIGURES.has(id)), d.symbol, (id) => ({ symbol: id }))}</div>
          <h4>${tr('Farben', 'Colours')}</h4>
          <div class="swatch-row">${Object.entries(slots).map(([id, label]) => `<button class="${slot === id ? 'active' : ''}" data-action="crestSlot" data-value="${id}"><i class="dot" style="background:${hex(d.colors[id])}"></i>${label}</button>`).join('')}</div>
          <div class="swatch-row">${CREST_COLORS.map((col) => `<button class="swatch ${d.colors[slot] === col ? 'on' : ''}" style="background:${hex(col)}" data-action="crestColor" data-value="${slot}:${col}"></button>`).join('')}</div>
        </div>
      </div>`;
  }

  tab_training() {
    const c = this.career;
    const w = c.week;
    if (!w || this.results) return `<p class="empty">${tr('Das nächste Open Training gibt es nach dem Wochenstart.', 'The next open training is available once the week starts.')}</p>`;
    const tt = w.training;
    if (!tt && trainingLocked(c))
      return `<p class="warn">${coachAway(c) ? tr('Du bist diese Woche nicht da.', 'You are away this week.') : tr('Du hast das Training abgegeben, um durchzuschnaufen.', 'You handed over training to catch your breath.')} ${tr('Kein Open Training in dieser Woche.', 'No open training this week.')}</p>`;
    if (!tt)
      return `
        ${tr(`<p>Einmal pro Woche kannst du ein <b>Open Training</b> ausrichten: Aushang beim Bäcker, ein paar Hütchen, Bälle aufpumpen.
        Es kommen sechs Leute aus der Region, die noch keinen Verein haben – meist Hobbykicker, manchmal aber ein <b>Rohdiamant</b>.</p>
        <p>Du baust <b>${MAX_STATIONS} von ${Object.keys(STATIONS).length} Stationen</b> auf. Die Messwerte musst du selbst deuten – danach darfst du zwei Leute einladen.</p>`, `<p>Once a week you can hold an <b>open training</b> session: a notice at the bakery, a few cones, pump up the balls.
        Six people from the area turn up who have no club yet – mostly hobby players, but sometimes a <b>rough diamond</b>.</p>
        <p>You set up <b>${MAX_STATIONS} of ${Object.keys(STATIONS).length} stations</b>. You have to read the results yourself – then you may invite two people.</p>`)}
        <button class="primary" data-action="training" ${c.cash < TRAINING_COST ? 'disabled' : ''}>${tr(`Open Training ausrichten (${TRAINING_COST} €)`, `Hold open training (€${TRAINING_COST})`)}</button>`;
    const done = trainingDone(c);
    const stationButtons = Object.entries(STATIONS)
      .map(([id, st]) => `<button data-action="station" data-value="${id}" class="${tt.stations.includes(id) ? 'active' : ''}" ${tt.stations.includes(id) || done ? 'disabled' : ''}>${st.name}</button>`)
      .join('');
    const best = {};
    for (const id of tt.stations) {
      const vals = tt.trialists.map((t) => Number(t.results[id]));
      best[id] = STATIONS[id].better === 'low' ? Math.min(...vals) : Math.max(...vals);
    }
    const rows = tt.trialists
      .map((t, i) => {
        const p = this.p(t.idx);
        const diamond = done && isRawDiamond(p);
        const cells = tt.stations.map((id) => `<td class="num ${Number(t.results[id]) === best[id] ? 'best' : ''}">${t.results[id]}</td>`).join('');
        let action = '';
        if (t.status === 'joined') action = tr(`<span class="reply ok">„${t.reply}"</span>`, `<span class="reply ok">"${t.reply}"</span>`);
        else if (t.status === 'declined') action = tr(`<span class="reply no">„${t.reply}"</span>`, `<span class="reply no">"${t.reply}"</span>`);
        else if (done) action = `<button class="primary tiny" data-action="invite" data-value="${i}" ${tt.invites <= 0 ? 'disabled' : ''}>${tr('Einladen', 'Invite')} (~${Math.round(inviteChance(c, t) * 100)} %)</button>`;
        return `<tr>
          <td><b>${p.name}</b>${diamond ? ` <span class="diamond">${tr('Rohdiamant', 'Rough diamond')}</span>` : ''}<small>${p.age}${tr(' J.', ' yrs')} · ${jobName(p.profession)} · ${POSITIONS[p.position]}</small>
            ${t.notes.length ? `<small class="note">${[...new Set(t.notes)].join(' · ')}</small>` : ''}</td>
          ${cells}<td>${action}</td></tr>`;
      })
      .join('');
    return `
      <p class="chat-head">${tr('Stationen', 'Stations')} ${tt.stations.length}/${MAX_STATIONS}${done ? tr(` · noch ${tt.invites} Einladung${tt.invites === 1 ? '' : 'en'}`, ` · ${tt.invites} invitation${tt.invites === 1 ? '' : 's'} left`) : tr(' · wähle, was du sehen willst', ' · choose what you want to see')}</p>
      <div class="stations">${stationButtons}</div>
      <table class="squad training"><thead><tr><th>${tr('Teilnehmer', 'Trialist')}</th>${tt.stations.map((id) => `<th class="num">${STATIONS[id].name}<small>${STATIONS[id].unit}</small></th>`).join('')}<th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  tab_youth() {
    const c = this.career;
    const club = humanClub(c);
    const full = club.squad.length >= maxSquad(c);
    const stars = (q) => '★'.repeat(Math.max(1, Math.round(q * 5))) + '☆'.repeat(5 - Math.max(1, Math.round(q * 5)));
    const staff = Object.entries(STAFF_ROLES)
      .map(([id, r]) => `<li><b>${r.name}:</b> ${c.staff[id] ? `${c.staff[id].name} <small>– ${r.effect}</small>` : `<em>${tr('unbesetzt – vielleicht übernimmt das mal ein Ehemaliger', 'vacant – maybe a former player will take it on one day')}</em>`}</li>`)
      .join('');
    const prospects = c.youth.prospects
      .map((idx) => ({ idx, p: this.p(idx) }))
      .sort((a, b) => b.p.rating - a.p.rating)
      .map(({ idx, p }) => {
        const talent = p.rating >= 50 ? tr('großes Talent', 'big talent') : p.rating >= 40 ? tr('solide', 'solid') : tr('noch roh', 'still raw');
        return `<tr><td><b>${p.name}</b><small>${p.age}${tr(' J.', ' yrs')} · ${jobName(p.profession)}</small></td><td>${POSITIONS[p.position]}</td>
          <td class="num">${p.rating}</td><td><em>${talent}</em></td>
          <td><button class="primary tiny" data-action="promote" data-value="${idx}" ${full ? 'disabled' : ''}>${tr('Hochziehen', 'Promote')}</button></td></tr>`;
      })
      .join('');
    const alumni = c.alumni.length
      ? c.alumni.map((a) => tr(`<li>${a.name} – ${a.apps} Spiele, ${a.goals} Tore · ${a.role} (seit Saison ${a.season + 1})</li>`, `<li>${a.name} – ${a.apps} games, ${a.goals} goals · ${roleName(a.role)} (since season ${a.season + 1})</li>`)).join('')
      : `<li><em>${tr('noch niemand – der Verein ist jung', 'nobody yet – the club is young')}</em></li>`;
    return `
      <h4>${tr('Ehrenamt', 'Volunteers')}</h4>
      <ul class="plain staff"><li><b>${tr('Jugendtrainer', 'Youth coach')}:</b> ${c.youth.coach.name} <span class="stars">${stars(c.youth.coach.quality)}</span> <small>${tr('– je besser, desto mehr Talente', '– the better, the more talents')}</small></li>${staff}</ul>
      ${this.academyBlock()}
      <h4>${tr('A-Jugend (16–19)', 'U19s (16–19)')}</h4>
      ${prospects
        ? `<table class="squad"><thead><tr><th>${tr('Talent', 'Talent')}</th><th>${tr('Pos.', 'Pos.')}</th><th>${tr('Stärke', 'Rating')}</th><th>${tr('Einschätzung', 'Assessment')}</th><th></th></tr></thead><tbody>${prospects}</tbody></table>
           <p class="empty">${tr('Talente entwickeln sich auch in der Jugend. Mit 20 wechseln sie zum Nachbarn, wenn du sie nicht hochziehst.', 'Talents develop in the youth team too. At 20 they leave for a neighbouring club if you do not promote them.')}${full ? tr(' Kader voll – erst Platz schaffen.', ' Squad full – make room first.') : ''}</p>`
        : `<p class="empty">${tr('Kein Talent in der A-Jugend. Der nächste Jahrgang kommt zur neuen Saison.', 'No talent in the U19s. The next intake arrives with the new season.')}</p>`}
      <h4>${tr('Ehemalige', 'Former players')}</h4>
      <ul class="plain">${alumni}</ul>`;
  }

  tab_cash() {
    const c = this.career;
    const club = humanClub(c);
    const offers = c.round === 0 && c.offers.length
      ? c.offers
          .map(
            (o, i) => `<article class="rumor" style="--c:${o.renew ? '#5cc46a' : '#c9a227'}"><div class="who"><b>${o.name}</b> <em>${SLOTS[o.slot]}${o.renew ? tr(' · Verlängerung', ' · renewal') : ''}</em>
              <small>${lineOf(o)} · ${bossOf(o)}, ${SPONSOR_TRAITS[o.trait]?.name ?? SPONSOR_TRAITS.treu.name}</small></div>
              <p>${euro(o.weekly)} ${tr('pro Spieltag', 'per matchday')} · ${tr('Bonus', 'bonus')} ${euro(o.bonus)} ${tr('bei', 'for')}: ${goalText(o.goal)}</p>
              <div class="actions"><button class="primary" data-action="sponsor" data-value="${i}">${tr('Unterschreiben', 'Sign')}</button>${o.negotiated ? '' : `<button data-action="negotiate" data-value="${i}">${tr('Nachverhandeln', 'Negotiate')}</button>`}</div></article>`,
          )
          .join('')
      : '';
    const active = c.sponsors.length
      ? c.sponsors
          .map(
            (s) => `<li class="sponsor"><b>${s.name}</b> <small>${SLOTS[s.slot]}${s.seasons ? tr(` · ${s.seasons + 1}. Saison`, ` · season ${s.seasons + 1}`) : ''}</small><br>
              ${euro(s.weekly)}${tr('/Spieltag', '/matchday')}${s.pause > 0 ? tr(` <em>(setzt ${s.pause} Wochen aus)</em>`, ` <em>(pausing for ${s.pause} weeks)</em>`) : s.owed ? tr(` <em>(schuldet ${euro(s.owed)})</em>`, ` <em>(owes ${euro(s.owed)})</em>`) : ''} · ${tr('Bonus', 'bonus')} ${euro(s.bonus)} ${tr('bei', 'for')} ${goalText(s.goal)} <small>(${goalProgress(c, s.goal)})</small>
              <span class="rel"><i style="width:${s.rel ?? 50}%"></i></span><small>${bossOf(s)} ${tr('ist', 'is')} ${relLabel(s.rel ?? 50)}</small></li>`,
          )
          .join('')
      : `<li><em>${tr('noch keine Sponsoren', 'no sponsors yet')}</em></li>`;
    const sinners = Object.entries(c.fines)
      .filter(([idx]) => club.squad.includes(Number(idx)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([idx, amount]) => `<li>${this.p(Number(idx)).name} <b>${euro(amount)}</b></li>`)
      .join('');
    const ledger = c.ledger
      .slice(-12)
      .reverse()
      .map((e) => `<li><span>${tr('ST', 'MD')} ${e.round} · ${e.text}</span><b class="${e.amount < 0 ? 'minus' : 'plus'}">${e.amount > 0 ? '+' : ''}${euro(e.amount)}</b></li>`)
      .join('');
    return `
      <div class="cash-head"><span>${tr('Mannschaftskasse', 'Team kitty')}</span><b class="${c.cash < 0 ? 'minus' : ''}">${euro(c.cash)}</b>
        <small>${tr('Ziel: Saisonabschlussfahrt (ab', 'Goal: end-of-season trip (from')} ${euro(DESTINATIONS.kegeltour.cost)})${c.spirit ? tr(' · Stimmung nach der letzten Fahrt: bestens (weniger Absagen)', ' · spirits after the last trip: excellent (fewer drop-outs)') : ''}</small></div>
      <div class="cash-grid">
        <section><h4>${tr('Sponsoren', 'Sponsors')}</h4><ul class="plain">${active}</ul>
          ${c.sponsorNote && c.round === 0 ? `<p class="reply ok">${c.sponsorNote}</p>` : ''}${offers ? `<h4>${tr('Angebote für diese Saison', 'Offers for this season')}</h4><div class="rumors">${offers}</div>` : c.round === 0 ? '' : `<p class="empty">${tr('Neue Angebote gibt es vor der nächsten Saison.', 'New offers come before next season.')}</p>`}</section>
        <section><h4>${tr('Strafenkatalog', 'Fines list')}</h4><ul class="plain fines">${FINES.map((f) => `<li>${f.label} <b>${euro(f.amount)}</b></li>`).join('')}</ul>
          <h4>${tr('Sünderkartei', 'Hall of shame')}</h4><ol class="plain">${sinners || `<li><em>${tr('alle brav', 'all well behaved')}</em></li>`}</ol></section>
        <section><h4>${tr('Kassenbuch', 'Ledger')}</h4><ul class="plain ledger">${ledger || `<li><em>${tr('noch keine Buchungen', 'no entries yet')}</em></li>`}</ul></section>
      </div>`;
  }

  tab_table() {
    const rows = table(this.career)
      .map(
        (r, i) => `<tr class="${r.club.human ? 'mine' : ''}"><td>${i + 1}.</td><td class="club-cell">${crestSVG(crestOf(r.club), { size: 16, label: r.club.name })}${r.club.name}</td><td class="num">${r.played}</td>
          <td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td><td class="num">${r.gf}:${r.ga}</td><td class="num"><b>${r.pts}</b></td></tr>`,
      )
      .join('');
    return `<table class="league"><thead><tr><th></th><th>${tr('Verein', 'Club')}</th><th>${tr('Sp.', 'P')}</th><th>${tr('S', 'W')}</th><th>${tr('U', 'D')}</th><th>${tr('N', 'L')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt.', 'Pts')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  tab_fixtures() {
    const c = this.career;
    return c.fixtures
      .map(
        (round, i) => `<div class="round ${i === c.round ? 'current' : ''}"><h4>${tr('Spieltag', 'Matchday')} ${i + 1}</h4>${round
          .map((f) => {
            const h = clubById(c, f.home);
            const a = clubById(c, f.away);
            return `<p class="${h.human || a.human ? 'mine' : ''}">${h.name} – ${a.name} <b>${f.result ? `${f.result.home}:${f.result.away}` : '-:-'}</b></p>`;
          })
          .join('')}</div>`,
      )
      .join('');
  }
}


// Spielerkarte im Kader: Formkurve der letzten Noten, Stärke über die Saisons,
// Auszeichnungen vom Kreisblatt.
function playerCard(c, idx, p, r) {
  const gradeTxt = (g) => tr(g.toFixed(1).replace('.', ','), g.toFixed(1));
  const recent = r.recent ?? [];
  // Note 1 = sehr gut → hoher Balken, 6 = schwach → niedriger Balken.
  const bars = recent.length
    ? `<div class="form-bars">${recent.map((g) => `<span style="--h:${Math.round(((6 - g.grade) / 5) * 100)}%" class="${g.grade <= 2 ? 'good' : g.grade >= 4 ? 'bad' : ''}" title="${tr('Spieltag', 'Matchday')} ${g.round + 1}: ${gradeTxt(g.grade)}"><i></i><b>${gradeTxt(g.grade)}</b></span>`).join('')}</div>`
    : `<p class="hint">${tr('Noch keine Noten – erst ein paar Spiele machen.', 'No grades yet – play a few matches first.')}</p>`;
  const seasons = [...(r.seasons ?? []), { season: c.season, rating: p.rating, apps: r.apps, goals: r.goals, assists: r.assists, avg: r.graded ? r.gradeSum / r.graded : null, now: true }];
  const rows = seasons
    .map((x, i) => {
      const prev = seasons[i - 1]?.rating;
      const delta = prev == null ? '' : x.rating > prev ? ` <span class="up">+${x.rating - prev}</span>` : x.rating < prev ? ` <span class="down">${x.rating - prev}</span>` : '';
      return `<tr><td>${x.now ? tr('jetzt', 'now') : `S${x.season}`}</td><td class="num">${x.rating}${delta}</td><td class="num">${x.apps}</td><td class="num">${x.goals}</td><td class="num">${x.assists}</td><td class="num">${x.avg != null ? gradeTxt(x.avg) : '–'}</td></tr>`;
    })
    .join('');
  const awards = (r.awards ?? []).map((a) => `<li>★ ${awardLabel(a)}</li>`).join('');
  const total = r.total ? tr(`Karriere bei uns: ${r.total.apps + r.apps} Spiele, ${r.total.goals + r.goals} Tore, ${r.total.assists + r.assists} Vorlagen.`, `Career with us: ${r.total.apps + r.apps} games, ${r.total.goals + r.goals} goals, ${r.total.assists + r.assists} assists.`) : '';
  return `<div class="card-grid">
    <div><h4>${tr('Formkurve', 'Form')} <small>${tr('letzte Noten', 'recent grades')}</small></h4>${bars}</div>
    <div><h4>${tr('Verlauf', 'History')}</h4><table class="mini"><thead><tr><th></th><th>${tr('Stärke', 'Rating')}</th><th>${tr('Sp.', 'Apps')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Vorl.', 'Ast.')}</th><th>Ø</th></tr></thead><tbody>${rows}</tbody></table><p class="hint">${total}</p></div>
    ${awards ? `<div><h4>${tr('Auszeichnungen', 'Awards')}</h4><ul class="awards">${awards}</ul></div>` : ''}
    ${jobPerk(p.profession) ? `<div><h4>${tr('Beruf', 'Job')}: ${jobName(p.profession)}</h4><p class="hint">${jobPerk(p.profession).label}</p></div>` : ''}
  </div>`;
}
