import { plural, tr } from '../core/i18n.js';
import { kitPreviewURL } from '../render/kitPaint.js';
import { effectChips } from '../career/consequences.js';
import { museum } from '../career/museum.js';
import { seasonReview } from '../career/review.js';
import { clubLife, FEE_NAMES, neighborText } from '../career/clublife.js';
import { reviewHTML, shareReview } from './review.js';
import { GOALS } from '../career/board.js';
import { STYLES as PLAY_STYLES, systemsFor } from '../sim/tactics.js';
import { jobFits, styleFit } from '../sim/fit.js';
import { GROUP_LABELS, ORDERS, packLines, SIMPLE, SIMPLE_IDS } from '../sim/commands.js';
import { coachLevel, setCoachLevel } from './prefs.js';
import { button, haptic, icon, segmented, tabs as uiTabs } from './ds.js';
import { ATTR_LABELS } from './PoolBrowser.js';
import { TacticBoard } from './TacticBoard.js';
import { clubScene } from './ClubScene.js';
import { bindFlips, isLight, lockScreen, phone, playerCard as collectorCard, trainerCard } from './world.js';
import { planTarget } from '../sim/plan.js';
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
  setClubTactic,
  setClubPlan,
  nextPitch,
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
import { acceptSponsor, bookTrip, FINES, KIT_COST, MEMBER_FEE, SLOTS, TRIP_COST } from '../career/finances.js';
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
import { dateLabel, matchDate, monthLabel } from '../career/calendar.js';
import { CUP_NAME, CUPS, cupClub, cupOf, groupTable, humanCupMatch, PRIZES, stageName, tournamentOpen, winterCupDue, winterCupRunning, winterRound } from '../career/tournament.js';
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

// UI 2.0: höchstens zwei Ebenen – Bereich (Leiste) und Tab. Jeder alte Tab gehört genau einem
// Bereich; data-action="tab" mit einem alten Tab-Namen funktioniert deshalb weiter.
const AREAS = [
  { id: 'home', icon: 'home', label: () => tr('Heute', 'Today'), tabs: ['home'] },
  { id: 'team', icon: 'team', label: () => tr('Mannschaft', 'Squad'), tabs: ['squad', 'lineup', 'tactic', 'training', 'youth', 'transfers'] },
  { id: 'season', icon: 'season', label: () => tr('Saison', 'Season'), tabs: ['table', 'fixtures', 'cup'] },
  { id: 'club', icon: 'club', label: () => tr('Verein', 'Club'), tabs: ['cash', 'club', 'museum'] },
  { id: 'pub', icon: 'pub', label: () => tr('Kneipe', 'Pub'), tabs: ['pub'] },
  { id: 'phone', icon: 'phone', label: () => tr('Handy', 'Phone'), tabs: ['chat'] },
];
const TAB_LABELS = () => ({
  chat: tr('Chatgruppe', 'Group chat'),
  pub: tr('Kneipe', 'Pub'),
  squad: tr('Kader', 'Squad'),
  lineup: tr('Aufstellung', 'Line-up'),
  tactic: tr('Taktik', 'Tactics'),
  transfers: tr('Transfers', 'Transfers'),
  training: tr('Training', 'Training'),
  youth: tr('Jugend', 'Youth'),
  table: tr('Tabelle', 'Table'),
  cup: tr('Turnier', 'Cup'),
  club: tr('Verein', 'Club'),
  museum: tr('Museum', 'Museum'),
  cash: tr('Kasse', 'Kitty'),
  fixtures: tr('Spielplan', 'Fixtures'),
});
export const areaOfTab = (tab) => AREAS.find((a) => a.tabs.includes(tab)) ?? AREAS[0];
export const CLUB_AREAS = AREAS;

// Vereinsheim: Chatgruppe, Kader, Tabelle, Spielplan – und der nächste Spieltag.
export class Clubhouse {
  constructor(root, handlers) {
    this.root = root;
    this.h = handlers;
    this.tab = 'home';
    this.lastTab = {}; // je Bereich der zuletzt offene Tab
    this.flipped = {}; // umgedrehte Spielerkarten (nur Ansicht)
    // Karten umdrehen: Knopf überall, Wischen nur im Kartenstapel (im Profil blättert Wischen weiter).
    bindFlips(root, (id, on) => ((this.flipped[id] = on), haptic('tap')), { scope: '.squad-deck' });
    this.busy = null;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t || this.busy || this.suppressClick) return;
      if (t.classList.contains('m-card-open') && performance.now() - Number(root.dataset.swiped ?? 0) < 400) return; // war ein Wischen
      const { action, value } = t.dataset;
      if (action === 'tab') this.tab = value;
      else if (action === 'area') {
        const area = AREAS.find((a) => a.id === value) ?? AREAS[0];
        this.tab = this.lastTab[area.id] ?? area.tabs[0];
      }
      else if (action === 'playerCard') {
        this.openPlayer = Number(value);
        this.pulled = true; // Karte kommt einmal aus dem Stapel nach vorn
        this.profileTab = 'overview';
        this.confirmRelease = null;
      } else if (action === 'playerBack') this.openPlayer = null;
      else if (action === 'profileTab') this.profileTab = value;
      else if (action === 'playerStep') this.stepPlayer(Number(value));
      else if (action === 'squadSort') this.squadSort = value;
      else if (action === 'slotPick' || action === 'benchPick') this.lineupPick(action === 'slotPick' ? { slot: Number(value) } : { idx: Number(value) });
      else if (action === 'pickCancel') this.pick = null;
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
      } else if (action === 'reviewshare') {
        shareReview(seasonReview(this.career));
      } else if (action === 'tipsoff') {
        this.career.tipsOff = true;
        this.career.week.chat = this.career.week.chat.filter((m) => !m.tip);
        this.h.onChange();
      } else if (action === 'notice') {
        resolveEvent(this.career, Number(value), 'notice');
        haptic('confirm');
        this.h.onChange();
      } else if (action === 'event') {
        resolveEvent(this.career, Number(value));
        haptic('confirm');
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
      } else if (action === 'tacticSystem' || action === 'tacticStyle') {
        const { format } = currentLineup(this.career);
        setClubTactic(this.career, format, action === 'tacticSystem' ? { system: value } : { style: value });
        this.h.onChange();
      } else if (action === 'planOrder') {
        const cur = humanClub(this.career).tactic?.orders?.[t.dataset.group];
        setClubPlan(this.career, t.dataset.group, cur === value ? null : value);
        this.h.onChange();
      } else if (action === 'planSimple') {
        for (const [g, v] of Object.entries(SIMPLE[value].orders)) setClubPlan(this.career, g, v);
        this.playedCard = value;
        haptic('select');
        this.h.onChange();
      } else if (action === 'planReset') {
        for (const g of Object.keys(GROUP_LABELS)) setClubPlan(this.career, g, null);
        this.h.onChange();
      } else if (action === 'planLevel') {
        setCoachLevel(coachLevel() === 'profi' ? 'einsteiger' : 'profi');
        this.render();
      } else if (action === 'tableRow') {
        this.tableOpen = this.tableOpen === value ? null : value;
      } else if (action === 'calRound') {
        this.calRound = Number(value);
      } else if (action === 'calMonth') {
        this.calMonth = (this.calMonth ?? 0) + Number(value);
        this.calRound = null;
      } else if (action === 'phone-open' || action === 'phone-lock') {
        this.phoneView = action === 'phone-open' ? 'app' : 'lock';
        if (this.phoneView === 'app') haptic('tap');
      } else if (action === 'autoLineup') {
        resetLineup(this.career);
        this.h.onChange();
      } else if (action === 'nudge') {
        nudge(this.career, Number(value));
        haptic('tap');
        this.h.onChange();
      } else if (action in this.h) return this.h[action](value);
      this.render();
    });
  }

  // Ziehen auf dem Spielfeld (Maus und Finger, Pointer Events). Erst ab 8 px Bewegung – ein
  // kurzer Tipp bleibt ein Tipp. Kein Animations-Loop: der Geist folgt pointermove.
  bindDrag() {
    const pitch = this.root.querySelector('.lineup2');
    if (!pitch) return;
    let drag = null;
    const parse = (v) => {
      const [kind, n] = v.split(':');
      return kind === 'slot' ? { slot: Number(n) } : { idx: Number(n) };
    };
    pitch.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-drag]');
      if (!el || e.button > 0) return;
      drag = { el, from: parse(el.dataset.drag), x: e.clientX, y: e.clientY, ghost: null };
    });
    pitch.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.ghost) {
        if (Math.hypot(dx, dy) < 8) return;
        drag.ghost = drag.el.cloneNode(true);
        drag.ghost.classList.add('lp-ghost');
        const r = drag.el.getBoundingClientRect();
        Object.assign(drag.ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px` });
        document.body.appendChild(drag.ghost);
        drag.el.setPointerCapture?.(e.pointerId);
        drag.el.classList.add('dragging');
      }
      drag.ghost.style.transform = `translate(${dx}px, ${dy}px)`;
      e.preventDefault();
    });
    const end = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.ghost) return; // war ein Tipp – der Klick-Handler übernimmt
      d.ghost.remove();
      d.el.classList.remove('dragging');
      this.suppressClick = true;
      setTimeout(() => (this.suppressClick = false), 0);
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
      if (!target || target.dataset.drop === d.el.dataset.drag) return;
      const to = parse(target.dataset.drop);
      if (d.from.idx != null && to.idx != null) return; // Bank auf Bank: nichts zu tun
      this.pick = null;
      this.applyLineup(d.from, to);
      this.render();
    };
    pitch.addEventListener('pointerup', end);
    pitch.addEventListener('pointercancel', (e) => {
      if (drag?.ghost) drag.ghost.remove();
      drag?.el.classList.remove('dragging');
      drag = null;
    });
  }

  // Im Spielerprofil nach links/rechts wischen: nächster/voriger Spieler.
  bindProfileSwipe() {
    const el = this.root.querySelector('[data-swipe="player"]');
    if (!el) return;
    let start = null;
    el.addEventListener('pointerdown', (e) => (start = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }));
    el.addEventListener('pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        this.stepPlayer(dx < 0 ? 1 : -1);
        this.render();
      }
    });
  }

  // Wandkalender: waagrecht wischen = Monat blättern.
  bindCalSwipe() {
    const el = this.root.querySelector('[data-swipe="cal"]');
    if (!el) return;
    let start = null;
    el.addEventListener('pointerdown', (e) => (start = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }));
    el.addEventListener('pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        const before = this.calMonth;
        this.calMonth = Math.max(0, (this.calMonth ?? 0) + (dx < 0 ? 1 : -1));
        this.calRound = null;
        this.suppressClick = true;
        setTimeout(() => (this.suppressClick = false), 0);
        if (this.calMonth !== before) this.render();
      }
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
    this.bindDrag();
    this.bindProfileSwipe();
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
    if (this.tab === 'home' || !this[`tab_${this.tab}`]) this.tab = 'home';
    const area = areaOfTab(this.tab);
    this.lastTab[area.id] = this.tab;
    const w = c.week;
    // Offene Entscheidungen als Zähler: Gruppe (Handy), Aushang (Heute).
    const badges = { phone: w?.event && w.event.choice === null && !this.results ? 1 : 0, home: w?.notice && w.notice.choice === null && !this.results && area.id !== 'home' ? 1 : 0 };
    const rail = AREAS.map(
      (a) => `<button class="rail-btn" data-action="area" data-value="${a.id}" aria-current="${a.id === area.id ? 'page' : 'false'}">${icon(a.icon, 26)}<span>${a.label()}</span>${badges[a.id] ? `<b class="ui-badge">${badges[a.id]}</b>` : ''}</button>`,
    ).join('');
    const labels = TAB_LABELS();
    // Bereich „Verein" ist die Vereinsmappe: Register statt Reiterleiste, Inhalt in der Kartonmappe.
    const folder = area.id === 'club';
    const sub = area.tabs.length > 1
      ? folder
        ? `<div class="m-tabs folder-tabs" role="tablist">${area.tabs.map((t) => `<button role="tab" aria-selected="${t === this.tab}" data-action="tab" data-value="${t}">${labels[t]}</button>`).join('')}</div>`
        : uiTabs(area.tabs.map((t) => [t, labels[t]]), this.tab, 'tab')
      : '';
    // Im Vereinsheim („Heute") ist das Fenster der Szene durchsichtig: dahinter läuft der eigene Platz.
    this.root.classList.toggle('see-through', area.id === 'home');
    // Neuer Bereich/Tab: Inhalt blendet einmal kurz ein (nicht bei jedem Neuzeichnen).
    const enter = this.shownTab !== this.tab;
    this.shownTab = this.tab;
    this.root.innerHTML = `
      <div class="club-panel club2" style="--kit:${hex(club.kit.shirt)}">
        <nav class="club-rail" aria-label="${tr('Bereiche', 'Sections')}">${rail}</nav>
        <div class="club-main">
          <header class="club-top">
            <div class="club-id">${crestSVG(crestOf(club), { size: 34, short: club.short, label: club.name })}<div><h2>${club.name}</h2>
            <small>${leagueName(c)} · ${tr('Saison', 'Season')} ${c.season} · ${over ? tr('Saison beendet', 'Season over') : `${this.results ? tr('Ergebnisse', 'Results') : tr('Woche vor', 'Week before')} ${tr('Spieltag', 'matchday')} ${roundNo} / ${c.fixtures.length}`}</small></div></div>
            <div class="club-tools">${this.h.onSettings ? button(icon('gear'), { kind: 'ghost icon', action: 'onSettings', 'aria-label': tr('Einstellungen', 'Settings'), title: tr('Einstellungen', 'Settings') }) : ''}${button(icon('exit'), { kind: 'ghost icon', action: 'onMenu', 'aria-label': tr('Hauptmenü', 'Main menu'), title: tr('Hauptmenü', 'Main menu') })}</div>
          </header>
          ${sub}
          <div class="club-body ${area.id === 'home' ? 'is-home' : 'tab'}${folder ? ' in-folder' : ''}${enter ? ' enter' : ''}">${area.id === 'home' ? this.hub() : folder ? `<div class="m-folder club-folder"><div class="folder-sheet">${this[`tab_${this.tab}`]()}</div></div>` : this[`tab_${this.tab}`]()}</div>
        </div>
      </div>`;
    this.bindLineup();
    // Chat im Handy: beim Öffnen unten anfangen (neueste Nachricht), wie im echten Messenger.
    const wa = this.root.querySelector('.phone-stage.open .wa-body');
    if (wa) wa.scrollTop = wa.scrollHeight;
    this.bindPub();
    this.bindCalSwipe();
    this.bindClubForm();
    const slot = this.root.querySelector('.club-tboard');
    if (slot && this.boardData) {
      this.tboard ??= new TacticBoard();
      slot.appendChild(this.tboard.el);
      this.tboard.update(this.boardData.formation, this.boardData.target);
    }
  }

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
    return `<div class="hub"><div class="hub-scene">${clubScene(c, { results: this.results })}</div><section class="hub-main">${main}</section><aside class="hub-side ui-stack tight">${side}</aside></div>`;
  }

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
          <article class="wide coaster"><h4>${tr('Taktik auf dem Bierdeckel', 'Tactics on a beer mat')}</h4><p>${tr('Gilt fürs nächste Spiel.', 'Applies to the next match.')}${pub.tactic ? ` ${tr('Gewählt', 'Chosen')}: <b>${TACTICS[pub.tactic].name}</b>.` : ''}</p><div class="actions">${tactics}</div></article>
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

  // Vereinsleben: was die Entscheidungen rund ums Vereinsheim dauerhaft verändert haben.
  clubLifeBlock() {
    const c = this.career;
    const l = clubLife(c);
    const t = l.treasurer && humanClub(c).squad.includes(l.treasurer.idx) ? this.p(l.treasurer.idx).name : c.coach?.flags?.kasse ? tr('du selbst', 'you') : tr('der zweite Vorsitzende', 'the vice-chairman');
    const fee = MEMBER_FEE + l.fee;
    return `<div class="facilities clublife"><h4>${tr('Vereinsleben', 'Club life')}</h4><ul class="plain">
      <li><b>${tr('Beitrag', 'Membership fee')}:</b> ${euro(fee)} ${tr('pro Spieler und Spieltag', 'per player per matchday')} <small>(${FEE_NAMES[l.fee]} · ${tr('beschließt die Jahreshauptversammlung', 'set at the annual general meeting')})</small></li>
      <li><b>${tr('Förderverein', 'Supporters\' club')}:</b> ${l.supporters} ${plural(l.supporters, 'Mitglied', 'Mitglieder', 'member', 'members')} <small>(${euro(l.supporters)}${tr('/Woche', '/week')})</small></li>
      <li><b>${tr('Kassenwart', 'Treasurer')}:</b> ${t}</li>
      <li><b>${tr('Nachbarschaft', 'Neighbourhood')}:</b> ${neighborText(l.neighbors)}</li>
    </ul></div>`;
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
        ${reviewHTML(seasonReview(c), { share: true })}
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
      <button class="primary self-play" data-action="onRelPlay">${leg === 0 ? tr('Hinspiel selbst spielen', 'Play the first leg') : tr('Rückspiel selbst spielen', 'Play the second leg')}</button>
      <button class="coach-play" data-action="onRelCoach">${tr('Trainer an der Seitenlinie', 'Manager on the touchline')}</button>
      <button data-action="onRelSimulate">${tr('Liveticker mit Entscheidungen', 'Live ticker with decisions')}</button>`;
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
        <button class="primary self-play" data-action="onCupPlay" data-value="${kind}">${tr('Selbst spielen', 'Play it yourself')}</button> <button class="coach-play" data-action="onCupCoach" data-value="${kind}">${tr('Trainer an der Seitenlinie', 'Manager on the touchline')}</button> <button data-action="onCupSimulate" data-value="${kind}">${tr('Liveticker mit Entscheidungen', 'Live ticker with decisions')}</button></div>`;
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
  }

  tab_chat() {
    const c = this.career;
    if (!c.week) return `<p class="empty">${tr('Die Gruppe ist ruhig. Saisonpause.', 'The group is quiet. Off-season.')}</p>`;
    const w = c.week;
    const club = humanClub(c);
    // Chronologisch, wie in einer echten Gruppe (Einträge ohne Zeit bleiben an ihrer Stelle).
    const DAY = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const at = (t) => {
      const m = /^(\w\w) (\d\d):(\d\d)/.exec(t ?? '');
      return m && DAY.includes(m[1]) ? DAY.indexOf(m[1]) * 1440 + Number(m[2]) * 60 + Number(m[3]) : null;
    };
    let lastAt = 0;
    const ordered = w.chat
      .map((msg, i) => ({ msg, i, at: at(msg.time) ?? lastAt }))
      .map((x) => ((lastAt = x.at), x))
      .sort((a, b) => a.at - b.at || a.i - b.i)
      .map((x) => x.msg);
    const bubbles = ordered
      .map((msg) => {
        if (msg.tip) return `<div class="bubble tip"><b>${tr('Tipp', 'Tip')}</b>${msg.text}<button class="link" data-action="tipsoff">${tr('Keine Tipps mehr', 'No more tips')}</button></div>`;
        // Ohne Absender: nur die eigene Frage in die Runde ist „Du", der Rest ist ein Aushang.
        const mine = msg.from === null && (msg.me || /Wer kann\?$|Who can make it\?$/.test(msg.text));
        if (msg.press || (msg.from === null && !mine)) return `<div class="bubble press${msg.press ? '' : ' notice'}">${msg.text}<time>${timeLabel(msg.time)}</time></div>`;
        if (msg.from === null) return `<div class="bubble me"><b>${tr('Du (Trainer)', 'You (manager)')}</b>${msg.text}<time>${timeLabel(msg.time)}</time></div>`;
        const p = this.p(msg.from);
        if (msg.alum) return `<div class="bubble alum"><b>${p.name} <small>(${typeof msg.alum === 'string' ? roleName(msg.alum) : tr('Ehemaliger', 'former player')}, ${tr('am Zaun', 'at the fence')})</small></b>${msg.text}<time>${timeLabel(msg.time)}</time></div>`;
        const status = STATUS[w.availability[msg.from]];
        return `<div class="bubble"><b>${p.name}</b>${msg.text}<time>${timeLabel(msg.time)}</time>${status ? `<i class="st ${status[1]}"></i>` : ''}</div>`;
      })
      .join('');
    const declined = club.squad.filter((idx) => w.availability[idx] === 'no' && !w.nudged.includes(idx) && !c.players[idx].injuryWeeks).filter((idx) => !isCoach(c, idx));
    const ev = w.event;
    const view = ev ? eventView(c, ev) : null;
    const eventCard = ev
      ? `<div class="event-card">
          <p class="label">${ev.story === 'Vereinsleben' ? storyTag(ev.story) : ev.story ? `${tr('Geschichte', 'Story')} · ${storyTag(ev.story)}` : tr('Diese Woche im Verein', 'This week at the club')}</p>
          <p>${view.text}</p>
          ${ev.choice !== null
            ? `<p class="reply ok">➜ ${view.options[ev.choice] ?? ''}: ${ev.result ?? ''}</p>${effectChips(ev.effects)}`
            : this.results
              ? ''
              : `<div class="actions">${view.options.map((o, i) => `<button ${i === 0 ? 'class="primary"' : ''} data-action="event" data-value="${i}">${o}</button>`).join('')}</div>`}
        </div>`
      : '';
    // UI 3.0 Phase 6: Die Gruppe steckt im Handy (in der Hand des Trainers). Beim ersten Blick
    // in einer Woche zeigt es den Sperrbildschirm mit den neuesten Nachrichten – danach direkt den Chat.
    const weekId = `${c.season}:${c.round}`;
    const pending = ev && ev.choice === null && !this.results;
    if (this.phoneWeek !== weekId) {
      this.phoneWeek = weekId;
      this.phoneView = ordered.length || pending ? 'lock' : 'app';
      this.phoneBuzz = pending;
    }
    const coachIdx = c.coach?.idx;
    const skin = coachIdx != null ? c.players[coachIdx]?.look?.skin : undefined;
    const lastTime = [...ordered].reverse().find((msg) => /^\w\w \d\d:\d\d/.test(msg.time ?? ''))?.time ?? '';
    const plain = (h) => String(h ?? '').replace(/<[^>]+>/g, '');
    const cut = (t, n = 70) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
    const groupName = tr('Wer kann Sonntag?', 'Who can play Sunday?');
    let screen;
    if (this.phoneView === 'lock') {
      const notes = [];
      if (pending) notes.push({ app: tr('Verein', 'Club'), from: ev.story ? plain(storyTag(ev.story)) : tr('Diese Woche', 'This week'), text: cut(plain(view.text)) });
      for (const msg of [...ordered].reverse().filter((x) => x.from != null && !x.tip && !x.press).slice(0, pending ? 1 : 2)) notes.push({ app: groupName, from: first(this.p(msg.from).name), text: cut(plain(msg.text)) });
      screen = lockScreen({ time: timeLabel(lastTime), notes });
    } else {
      const replies = declined.length && w.nudges > 0 && !this.results
        ? declined.map((idx) => `<button class="wa-chip" data-action="nudge" data-value="${idx}">${first(this.p(idx).name)}</button>`).join('')
        : `<em>${tr('niemand', 'nobody')}</em>`;
      screen = `<div class="statusbar"><span>${timeLabel(lastTime)}</span><span>▮▮▮ ▰</span></div>
        <div class="wa-head">${button('‹', { kind: 'ghost icon', action: 'phone-lock', 'aria-label': tr('Zum Sperrbildschirm', 'To the lock screen') })}
          <span class="wa-crest">${crestSVG(crestOf(club), { size: 26, short: club.short, label: club.name })}</span>
          <div><b>${groupName}</b><small>${club.squad.length} ${tr('Mitglieder', 'members')}</small></div></div>
        ${eventCard ? `<div class="wa-pinned">${eventCard}</div>` : ''}<div class="wa-body"><div class="chat">${bubbles}</div></div>
        <div class="wa-reply"><span>${tr('Nachhaken', 'Chase up')} (${w.nudges} ${tr('übrig', 'left')}):</span>${replies}</div>`;
    }
    const buzz = this.phoneView === 'lock' && this.phoneBuzz;
    this.phoneBuzz = false;
    if (buzz) haptic('message');
    return `<div class="phone-stage${this.phoneView === 'app' ? ' open' : ''}">${phone(screen, { skin, lit: this.phoneView === 'lock' && (pending || ordered.length > 0), buzz, rise: this.phoneView === 'lock', label: groupName })}</div>`;
  }

  // Kader als Spielerkarten. Ebene 1: Name, Position, Stärke, Sonntag. Alles Weitere im Profil.
  squadOrder() {
    const c = this.career;
    const ORDER = { gk: 0, def: 1, mid: 2, fwd: 3 };
    const list = humanClub(c).squad.map((idx) => ({ idx, p: this.p(idx) }));
    return list
      .sort((a, b) => (this.squadSort === 'pos' ? (ORDER[a.p.position] ?? 9) - (ORDER[b.p.position] ?? 9) : 0) || b.p.rating - a.p.rating)
      .map((x) => x.idx);
  }

  stepPlayer(dir) {
    const order = this.squadOrder();
    const i = order.indexOf(this.openPlayer);
    if (i < 0) return;
    this.openPlayer = order[(i + dir + order.length) % order.length];
    this.confirmRelease = null;
  }

  // Sonntag-Status als Chip: Farbe UND Text (nie nur Farbe).
  sundayChip(idx) {
    const c = this.career;
    const r = c.players[idx];
    if (r.injuryWeeks) return `<span class="ui-chip" style="--c:#d9534f" title="${r.injury?.label ?? tr('verletzt', 'injured')}">${r.injury ? `${r.injury.label} · ${r.injuryWeeks} ${tr('Wo.', 'wks')}` : tr('verletzt', 'injured')}</span>`;
    const st = c.week ? STATUS[c.week.availability[idx]] : null;
    if (!st) return '';
    const color = { yes: '#5cc46a', no: '#d9534f', late: '#e0b020' }[st[1]];
    return `<span class="ui-chip" style="--c:${color}">${st[0]}</span>`;
  }

  // Kleine Marker hinter dem Namen: Du, Auszeichnungen, Titel, Form, Launen.
  nameMarks(idx, p, r) {
    const c = this.career;
    return `${r.awards?.length ? ` <span class="award" title="${r.awards.map(awardLabel).join(' · ')}">★${r.awards.length > 1 ? r.awards.length : ''}</span>` : ''}${isCoach(c, idx) ? ` <span class="me-tag">${tr('Du', 'You')}</span>` : ''}${p.title ? ` <em>${p.title}</em>` : ''}${formArrow(r.form)}${r.absenceMul > 1.2 ? tr(' <span class="grumpy" title="hat gerade wenig Zeit – sagt öfter ab">selten da</span>', ' <span class="grumpy" title="short of time at the moment – drops out more often">rarely around</span>') : ''}${r.grumpy ? tr(' <span class="grumpy" title="angefressen – sagt öfter ab">grummelt</span>', ' <span class="grumpy" title="sulking – drops out more often">sulking</span>') : ''}`;
  }

  tab_squad() {
    const c = this.career;
    const club = humanClub(c);
    if (this.openPlayer != null && club.squad.includes(this.openPlayer)) return this.playerProfile(this.openPlayer);
    this.openPlayer = null;
    const cards = this.squadOrder()
      .map((idx) => `<div class="deck-slot">${this.collector(idx)}</div>`)
      .join('');
    const count = { yes: 0, no: 0, late: 0 };
    for (const idx of club.squad) if (c.week?.availability[idx]) count[c.week.availability[idx]]++;
    return `
      <div class="squad-head">
        <p class="t-2">${club.squad.length} ${tr('Spieler', 'players')}${c.week ? ` · ${count.yes} ${tr('Zusagen', 'in')} · ${count.late} ${tr('später', 'late')} · ${count.no} ${tr('Absagen', 'out')}` : ''}</p>
        <div class="squad-sort">${segmented('sort', [['rating', tr('Stärke', 'Rating')], ['pos', tr('Position', 'Position')]], this.squadSort === 'pos' ? 'pos' : 'rating', { action: 'squadSort' })}</div>
      </div>
      <div class="squad-deck">${cards}</div>`;
  }

  // Sammelkarte eines Spielers: vorn Stärke, Trikot, Name, Position, Sonntag – hinten die Werte.
  collector(idx, { w, open = true } = {}) {
    const c = this.career;
    const p = this.p(idx);
    const r = c.players[idx];
    const tier = tierById(p.tier);
    const club = humanClub(c);
    const attrs = Object.entries(ATTR_LABELS)
      .filter(([k]) => p.attrs[k] != null && (k !== 'keeping' || p.position === 'gk' || p.attrs.keeping > 0.4))
      .map(([k, label]) => [label, Math.round(p.attrs[k] * 100)]);
    const traits = (p.traits ?? []).filter((t) => TRAITS[t]).map((t) => TRAITS[t].name);
    const extra = `<p class="m-card-extra">${jobName(p.profession)}${traits.length ? ` · ${traits.slice(0, 2).join(' · ')}` : ''}</p>`;
    const marks = `${r.awards?.length ? '★' : ''}${isCoach(c, idx) ? ` ${tr('Du', 'You')}` : ''}`;
    return collectorCard({
      id: idx,
      name: `${p.name}${marks ? ` ${marks}` : ''}`,
      pos: `${POSITIONS[p.position]} · ${tier.name}`,
      rating: p.rating,
      kit: club.kit.shirt,
      badge: formArrow(r.form),
      art: `<span class="m-card-shirt" style="--shirt:url(${kitPreviewURL(club.kit)})"></span>`,
      sub: this.sundayChip(idx),
      attrs,
      extra,
      flipped: !!this.flipped[idx],
      w,
      open: open ? { action: 'playerCard', value: idx, label: tr(`Profil von ${p.name} öffnen`, `Open ${p.name}'s profile`) } : null,
    });
  }

  // Spielerprofil: eigener Bildschirm mit Tabs statt weiterer Menüebenen. Wischen = nächster Spieler.
  playerProfile(idx) {
    const pulled = this.pulled;
    this.pulled = false;
    const c = this.career;
    const club = humanClub(c);
    const p = this.p(idx);
    const r = c.players[idx];
    const tier = tierById(p.tier);
    const canRelease = club.squad.length > MIN_SQUAD && !this.results && !isCoach(c, idx);
    const tab = this.profileTab ?? 'overview';
    const avg = r.graded ? tr((r.gradeSum / r.graded).toFixed(1).replace('.', ','), (r.gradeSum / r.graded).toFixed(1)) : '–';
    const rels = relationLabel(c, idx);
    const perk = jobPerk(p.profession);
    let body;
    if (tab === 'attrs') {
      body = `<div class="attr-list">${Object.entries(ATTR_LABELS)
        .filter(([k]) => p.attrs[k] != null && (k !== 'keeping' || p.position === 'gk' || p.attrs.keeping > 0.4))
        .map(([k, label]) => {
          const v = Math.round(p.attrs[k] * 100);
          return `<div class="attr-row"><span>${label}</span><i style="--v:${v}%"></i><b>${v}</b></div>`;
        })
        .join('')}</div>
        ${p.traits?.length ? `<p class="ui-section-title">${tr('Eigenheiten', 'Traits')}</p><div class="ui-chips">${p.traits.filter((t) => TRAITS[t]).map((t) => `<span class="ui-chip plain" title="${TRAITS[t].desc}">${TRAITS[t].name}</span>`).join('')}</div>` : ''}`;
    } else if (tab === 'stats') {
      body = `<div class="ui-row profile-stats">
          <div class="ui-stat"><b>${r.apps}</b><span>${tr('Spiele', 'Apps')}</span></div>
          <div class="ui-stat"><b>${r.goals}</b><span>${tr('Tore', 'Goals')}</span></div>
          <div class="ui-stat"><b>${r.assists}</b><span>${tr('Vorlagen', 'Assists')}</span></div>
          <div class="ui-stat"><b>${avg}</b><span>${tr('Ø Note', 'Avg. grade')}</span></div>
        </div>
        ${playerCard(c, idx, p, r)}`;
    } else {
      body = `<div class="ui-stack tight">
          <p class="t-body">${p.age}${tr(' Jahre', ' years')} · ${jobName(p.profession)}${perk ? ` <span class="perk-tag" title="${perk.label}">${tr('Bonus', 'perk')}</span>` : ''}</p>
          ${perk ? `<p class="t-2">${perk.label}</p>` : ''}
          ${rels ? `<p class="t-2 rel-line">${rels}</p>` : ''}
          ${r.awards?.length ? `<p class="t-2">★ ${r.awards.map(awardLabel).join(' · ')}</p>` : ''}
          ${p.traits?.length ? `<div class="ui-chips">${p.traits.filter((t) => TRAITS[t]).map((t) => `<span class="ui-chip plain" title="${TRAITS[t].desc}">${TRAITS[t].name}</span>`).join('')}</div>` : ''}
        </div>`;
    }
    const order = this.squadOrder();
    const pos = order.indexOf(idx);
    return `
      <div class="profile" data-swipe="player">
        <div class="profile-nav">
          ${button(`‹ ${tr('Kader', 'Squad')}`, { kind: 'ghost', action: 'playerBack' })}
          <span class="t-2">${pos + 1} / ${order.length}</span>
          <span class="ui-row">${button('‹', { kind: 'icon', action: 'playerStep', value: -1, 'aria-label': tr('Voriger Spieler', 'Previous player') })}${button('›', { kind: 'icon', action: 'playerStep', value: 1, 'aria-label': tr('Nächster Spieler', 'Next player') })}</span>
        </div>
        <div class="profile-head" style="--tier:${tier.color}">
          <div class="profile-card${pulled ? ' m-pull' : ''}">${this.collector(idx, { w: 150, open: false })}</div>
          <div>
            <h3 class="t-h2">${p.name}${this.nameMarks(idx, p, r)}</h3>
            <p class="t-body">${POSITIONS[p.position]} · <span class="badge" style="--c:${tier.color}">${tier.name}</span></p>
            <div class="ui-chips">${this.sundayChip(idx)}</div>
          </div>
        </div>
        ${uiTabs([['overview', tr('Übersicht', 'Overview')], ['attrs', tr('Attribute', 'Attributes')], ['stats', tr('Statistik', 'Stats')]], tab, 'profileTab')}
        <div class="profile-body">${body}</div>
        ${canRelease ? `<div class="profile-foot">${this.confirmRelease === idx ? button(tr('Wirklich verabschieden?', 'Really release him?'), { kind: 'danger', action: 'release', value: idx }) : button(tr('Verabschieden', 'Release'), { kind: 'ghost', action: 'release', value: idx })}</div>` : ''}
      </div>`;
  }

  // Spielplan: mit welchen Befehlen die Mannschaft aufläuft. Einsteiger: sechs Pakete,
  // Profi: jede Gruppe einzeln.
  planBlock(orders) {
    const active = (pack) => Object.entries(pack.orders).every(([g, v]) => v == null || orders[g] === v);
    // Einsteiger-Pakete als Trainerkarten: jede Karte zeigt, welche Befehle sie setzt.
    const played = this.playedCard;
    this.playedCard = null;
    const simple = SIMPLE_IDS.map((id) =>
      trainerCard({ action: 'planSimple', value: id, title: SIMPLE[id].label, lines: packLines(id), active: active(SIMPLE[id]), played: played === id }),
    ).join('');
    const groups = Object.keys(GROUP_LABELS).map((g) => {
      const chips = Object.keys(ORDERS).filter((k) => k.startsWith(`${g}:`)).map((k) => {
        const v = k.split(':')[1];
        return `<button class="${orders[g] === v ? 'active' : ''}" data-action="planOrder" data-group="${g}" data-value="${v}" title="${ORDERS[k].hint}">${ORDERS[k].label}</button>`;
      }).join('');
      return `<div class="plan-row"><small>${GROUP_LABELS[g]}</small><div class="styles">${chips}</div></div>`;
    }).join('');
    const summary = Object.entries(orders).map(([g, v]) => ORDERS[`${g}:${v}`]?.label).filter(Boolean);
    const pro = coachLevel() === 'profi';
    return `
      <h4>${tr('Spielplan', 'Game plan')} <small>${summary.length ? summary.join(' · ') : tr('nur der Grundstil', 'base style only')}</small></h4>
      <div class="tcard-row">${simple}</div>
      ${played ? `<p class="tp-preview" aria-live="polite"><b>${SIMPLE[played].label}</b> ${tr('ausgespielt – die Tafel zeigt, was sich ändert.', 'played – the board shows what changes.')}</p>` : ''}
      ${pro ? groups : ''}
      <p class="hint">${tr('Damit laufen die Jungs auf. Im Spiel kannst du jederzeit abweichen.', 'This is how the lads start. You can change it at any time during the match.')} <button class="linkish" data-action="planLevel">${pro ? tr('Weniger Optionen', 'Fewer options') : tr('Alle Befehle zeigen', 'Show all orders')}</button>${summary.length ? ` <button class="linkish" data-action="planReset">${tr('Zurücksetzen', 'Reset')}</button>` : ''}</p>`;
  }

  // Taktik: System, Spielstil, Passung, Spielplan-Befehle (früher oben in der Aufstellung).
  tab_tactic() {
    const c = this.career;
    if (!c.week || this.results) return `<p class="empty">${tr('Die Aufstellung für den nächsten Spieltag gibt es nach dem Wochenstart.', 'The line-up for the next matchday is available once the week starts.')}</p>`;
    const { formation, lineup, format, tactic } = currentLineup(c);
    const board = (f, active) => `<span class="mini-pitch ${active ? 'on' : ''}">${f.map((e) => `<i class="dot-${e.role}" style="left:${((e.x + 1) * 100).toFixed(0)}%;top:${((e.z + 1) * 50).toFixed(0)}%"></i>`).join('')}</span>`;
    const systems = Object.entries(systemsFor(format))
      .map(([id, sys]) => `<button class="system ${tactic.system === id ? 'active' : ''}" data-action="tacticSystem" data-value="${id}" aria-pressed="${tactic.system === id}">${board(sys.formation, tactic.system === id)}<b>${sys.label}</b></button>`)
      .join('');
    // Passt der Stil zum Platz und Wetter am Sonntag? Und zu den Berufen der Jungs?
    const pitch = nextPitch(c);
    const fitMark = (id) => {
      const f = pitch ? styleFit(id, pitch).score : 0;
      return f > 0 ? ' <i class="fit good">▲</i>' : f < 0 ? ' <i class="fit bad">▼</i>' : '';
    };
    const styles = Object.entries(PLAY_STYLES)
      .map(([id, st]) => `<button class="${tactic.style === id ? 'active' : ''}" data-action="tacticStyle" data-value="${id}" aria-pressed="${tactic.style === id}">${st.label}${fitMark(id)}</button>`)
      .join('');
    const reasons = pitch ? styleFit(tactic.style, pitch).reasons : [];
    const fitters = lineup.filter((idx) => idx != null && jobFits(tactic.style, this.p(idx).profession)).map((idx) => this.p(idx).name.split(' ')[0]);
    const fitNote = `${reasons.map((r) => `<span class="${r.score > 0 ? 'good' : 'bad'}">${r.score > 0 ? '▲' : '▼'} ${r.text}</span>`).join(' ')}${fitters.length ? ` <span class="good">▲ ${tr('Passt zum Stil (Beruf)', 'Suits the style (job)')}: ${fitters.join(', ')}</span>` : ''}`;
    // Tafel wie im Spiel: zeigt, was System, Stil und Spielplan verstellen.
    this.boardData = { formation, target: planTarget({ plan: [{ style: tactic.style }], orders: [tactic.orders ?? {}] }, 0) };
    return `
      <div class="tactic-board">
        <div class="club-tboard m-board"><span class="tray" aria-hidden="true"></span></div>
        <p class="ui-section-title">${tr('System', 'System')} · ${formation.length} ${tr('gegen', 'v')} ${formation.length}</p>
        <div class="systems">${systems}</div>
        <p class="ui-section-title">${tr('Spielstil', 'Playing style')}</p>
        <div class="styles">${styles}</div>
        <p class="hint">${PLAY_STYLES[tactic.style].desc}</p>
        ${fitNote ? `<p class="fit-note">${pitch ? `${tr('Sonntag', 'Sunday')}: ${pitch.name}, ${pitch.surface.name}. ` : ''}${fitNote}</p>` : ''}
        ${this.planBlock(tactic.orders ?? {})}
      </div>`;
  }

  // Aufstellung direkt auf dem Spielfeld: Spieler antippen, dann Ziel antippen (Position oder Bank)
  // – oder ziehen. Beides führt zu setLineupSlot, der Tausch passiert in der Karriere-Logik.
  lineupPick(target) {
    const c = this.career;
    const { lineup } = currentLineup(c);
    const cur = this.pick;
    if (!cur) {
      this.pick = target;
      return;
    }
    this.pick = null;
    if (cur.slot != null && target.slot === cur.slot) return; // abgewählt
    if (cur.idx != null && target.idx != null) return void (this.pick = target); // Bank → Bank: neue Auswahl
    this.applyLineup(cur, target, lineup);
  }

  applyLineup(a, b, lineup = currentLineup(this.career).lineup) {
    const slot = a.slot ?? b.slot;
    const other = a.slot != null && b.slot != null ? (a.slot === slot ? b.slot : a.slot) : null;
    const idx = a.idx ?? b.idx;
    if (other != null) {
      // Zwei Positionen tauschen (auch mit einer Aushilfe: dann rückt der Spieler einfach um).
      if (lineup[other] != null) setLineupSlot(this.career, slot, lineup[other]);
      else if (lineup[slot] != null) setLineupSlot(this.career, other, lineup[slot]);
      else return;
    } else if (idx != null) setLineupSlot(this.career, slot, idx);
    // Magnet „klackt" an der neuen Stelle ein (einmal, beim nächsten Zeichnen).
    this.justSet = new Set([slot, other].filter((x) => x != null));
    haptic('select');
    this.h.onChange();
  }

  tab_lineup() {
    const c = this.career;
    if (!c.week || this.results) return `<p class="empty">${tr('Die Aufstellung für den nächsten Spieltag gibt es nach dem Wochenstart.', 'The line-up for the next matchday is available once the week starts.')}</p>`;
    const { formation, lineup, bench, tactic } = currentLineup(c);
    const benchList = bench.length
      ? bench.map((idx) => `<li>${this.p(idx).name}${c.week.availability[idx] === 'late' ? tr(' <em>(kommt zur 2. Halbzeit)</em>', ' <em>(arrives for the 2nd half)</em>') : ''}</li>`).join('')
      : `<li><em>${tr('niemand', 'nobody')}</em></li>`;
    if (coachAway(c)) return `<p class="warn">${tr('Du bist diese Woche nicht da. Der Kapitän stellt auf – nach bestem Wissen und Gewissen.', 'You are away this week. The captain picks the team – to the best of his knowledge.')}</p><h4>${tr('Bank', 'Bench')}</h4><ul class="bench">${benchList}</ul>`;
    const ROLE = tr({ gk: 'Tor', def: 'Abwehr', mid: 'Mitte', fwd: 'Sturm' }, { gk: 'GK', def: 'Def', mid: 'Mid', fwd: 'Att' });
    const pick = this.pick;
    const snap = this.justSet ?? new Set();
    this.justSet = null;
    // Formation liegt in der eigenen Hälfte (x −0,96 … −0,14): auf das ganze Feld strecken, Tor links.
    const left = (x) => (6 + ((x + 0.96) / 0.82) * 84).toFixed(1);
    const top = (z) => (50 + z * 70).toFixed(1);
    const tokens = formation
      .map((slot, i) => {
        const idx = lineup[i];
        const p = idx != null ? this.p(idx) : null;
        const off = p && p.position !== slot.role && !(slot.role === 'mid' && p.position !== 'gk');
        const picked = pick?.slot === i;
        return `<button class="lp-token role-${slot.role}${picked ? ' picked' : ''}${p ? '' : ' standin'}${snap.has(i) ? ' snap' : ''}" data-action="slotPick" data-value="${i}" data-drop="slot:${i}" data-drag="slot:${i}" style="--x:${left(slot.x)}%;--y:${top(slot.z)}%" aria-pressed="${picked}" aria-label="${ROLE[slot.role]}: ${p ? p.name : tr('Aushilfe', 'Stand-in')}">
          <span class="lp-shirt">${p ? p.rating : '?'}</span>
          <span class="lp-name">${p ? p.name.split(' ').at(-1) : tr('Aushilfe', 'Stand-in')}</span>
          <span class="lp-role${off ? ' off' : ''}">${ROLE[slot.role]}${off ? ` · ${POSITIONS[p.position]}` : ''}</span>
        </button>`;
      })
      .join('');
    // Wer kann rein? Alle mit Zusage, die nicht schon spielen (wie früher in der Auswahlliste).
    const avail = humanClub(c).squad
      .filter((idx) => c.week.availability[idx] === 'yes' && !lineup.includes(idx))
      .map((idx) => ({ idx, p: this.p(idx) }))
      .sort((a, b) => b.p.rating - a.p.rating);
    const late = bench.filter((idx) => c.week.availability[idx] === 'late');
    const benchChips = [
      ...avail.map(({ idx, p }) => `<button class="lp-bench${pick?.idx === idx ? ' picked' : ''}" data-action="benchPick" data-value="${idx}" data-drop="bench:${idx}" data-drag="bench:${idx}" aria-pressed="${pick?.idx === idx}"><b>${p.rating}</b><span>${p.name}</span><small>${POSITIONS[p.position]}</small></button>`),
      ...late.map((idx) => `<span class="lp-bench late"><b>${this.p(idx).rating}</b><span>${this.p(idx).name}</span><small>${tr('kommt zur 2. Halbzeit', 'arrives for the 2nd half')}</small></span>`),
    ].join('');
    const gkIdx = formation.findIndex((f) => f.role === 'gk');
    const keeper = lineup[gkIdx] != null ? this.p(lineup[gkIdx]) : null;
    const keeperNote = keeper && keeper.position !== 'gk' ? `<p class="warn">${tr(`Kein Torwart da – ${keeper.name.split(' ')[0]} muss ran. Handschuhe liegen im Kofferraum.`, `No keeper – ${keeper.name.split(' ')[0]} has to go in goal. The gloves are in the boot.`)}</p>` : '';
    const chem = chemistry(c, lineup);
    const chemLine = chem.pairs.length
      ? `<p class="chem ${chem.score < 0 ? 'bad' : 'good'}">${tr('Teamchemie', 'Chemistry')} ${chem.score > 0 ? '+' : ''}${chem.score}: ${chem.pairs.map((pr) => `${shortName(c, pr.a)} & ${shortName(c, pr.b)} (${REL[pr.type].plural})`).join(' · ')}</p>`
      : `<p class="chem">${tr('Teamchemie: In dieser Aufstellung kennt sich keiner näher.', 'Chemistry: nobody in this line-up knows each other well.')}</p>`;
    const hint = pick
      ? pick.slot != null
        ? tr('Jetzt eine andere Position zum Tauschen antippen – oder einen Spieler von der Bank.', 'Now tap another position to swap – or a player from the bench.')
        : tr('Jetzt die Position antippen, auf der er spielen soll.', 'Now tap the position he should play.')
      : tr('Spieler antippen, dann Ziel antippen – oder einfach ziehen.', 'Tap a player, then the target – or just drag.');
    return `
      <div class="lineup2${isLight(humanClub(c).kit.shirt) ? ' light-kit' : ''}">
        <div class="lp-head">
          <p class="t-cap">${c.week.lineup ? tr('Eigene Aufstellung', 'Your line-up') : tr('Automatisch aufgestellt', 'Picked automatically')} · ${PLAY_STYLES[tactic.style].label}</p>
          <div class="ui-row">${pick ? button(tr('Abbrechen', 'Cancel'), { kind: 'ghost', action: 'pickCancel' }) : ''}${button(tr('Automatisch aufstellen', 'Pick automatically'), { action: 'autoLineup' })}</div>
        </div>
        <div class="lp-stage">
          <div class="lp-board m-board"><div class="lp-pitch" aria-label="${tr('Magnettafel', 'Magnet board')}"><i class="lp-box l"></i><i class="lp-box r"></i><i class="lp-mid"></i>${tokens}</div><span class="tray" aria-hidden="true"></span></div>
          <div class="lp-benchcol"><p class="ui-section-title">${tr('Bank', 'Bench')} · ${tr('verfügbar', 'available')}</p>
          <div class="lp-benchrow">${benchChips || `<p class="t-2">${tr('niemand', 'nobody')}</p>`}</div></div>
        </div>
        <p class="t-2 lp-hint" aria-live="polite">${hint}</p>
        ${keeperNote}
        ${chemLine}
      </div>`;
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
      <div class="rumor-board m-cork"><p class="rb-title m-hand black">${tr('Gerüchteküche', 'Rumour mill')}</p><div class="rumors">${cards}</div></div>`;
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
      ${this.clubLifeBlock()}
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

  // Vereinsmuseum: Vitrine, Rekorde, Legenden, Archiv.
  tab_museum() {
    const c = this.career;
    const club = humanClub(c);
    const mu = museum(c);
    const empty = (t) => `<p class="empty">${t}</p>`;
    const trophies = mu.trophies.length
      ? `<ul class="vitrine">${mu.trophies.map((t) => `<li><span class="cup"></span><b>${t.name}</b><small>${tr('Saison', 'Season')} ${t.season}</small></li>`).join('')}</ul>`
      : empty(tr('Die Vitrine ist noch leer. Der Staublappen liegt bereit.', 'The trophy cabinet is still empty. The duster is ready.'));
    const awards = mu.awards.length ? `<ul class="plain">${mu.awards.map((a) => `<li>★ ${a.name} – ${a.kind === 'season' ? tr('Spieler der Saison', 'Player of the Season') : tr('Spieler des Monats', 'Player of the Month')} (S${a.season})</li>`).join('')}</ul>` : empty(tr('Noch keine Auszeichnung vom Kreisblatt.', 'No Kreisblatt award yet.'));
    const records = mu.records.length ? `<ul class="plain">${mu.records.map((r) => `<li><b>${r.label}:</b> ${r.text}</li>`).join('')}</ul>` : empty(tr('Rekorde entstehen mit der Zeit.', 'Records come with time.'));
    const legends = mu.legends.length ? `<ol class="plain">${mu.legends.map((l) => `<li><span>${l.name}${l.active ? '' : ` <small>(${tr('ehemalig', 'former')})</small>`}</span><b>${l.goals} ${plural(l.goals, 'Tor', 'Tore', 'goal', 'goals')} · ${l.apps} ${plural(l.apps, 'Spiel', 'Spiele', 'app', 'apps')}</b></li>`).join('')}</ol>` : empty(tr('Noch keine Legenden.', 'No legends yet.'));
    const kits = `<div class="archive">${mu.kits.map((k) => `<figure><span class="kit-mini" style="background:url(${kitPreviewURL(k.kit)}) center/100% 100%"></span><figcaption>S${k.season}${k.now ? tr(' (aktuell)', ' (current)') : ''}</figcaption></figure>`).join('')}</div>`;
    const crests = mu.crests.length ? `<div class="archive">${mu.crests.map((k) => `<figure>${crestSVG(k.crest, { size: 40, short: club.short })}<figcaption>S${k.season}${k.now ? tr(' (aktuell)', ' (current)') : ''}</figcaption></figure>`).join('')}</div>` : '';
    return `<div class="museum">
      <section><h4>${tr('Vitrine', 'Trophy cabinet')}</h4>${trophies}</section>
      <section><h4>${tr('Ehrentafel', 'Roll of honour')}</h4>${awards}</section>
      <section><h4>${tr('Rekorde', 'Records')}</h4>${records}</section>
      <section><h4>${tr('Vereinslegenden', 'Club legends')}</h4>${legends}</section>
      <section><h4>${tr('Trikot- und Wappenarchiv', 'Kit and crest archive')}</h4>${kits}${crests}</section>
      ${(c.reviews ?? []).length ? `<section><h4>${tr('Sonderhefte', 'Season specials')}</h4>${[...c.reviews].reverse().map((r) => `<details><summary>${r.year}/${String(r.year + 1).slice(2)} · ${r.headline}</summary>${reviewHTML(r)}</details>`).join('')}</section>` : ''}
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
        return `<tr><td><b>${p.name}</b><small>${p.age}${tr(' J.', ' yrs')} · ${jobName(p.profession)}${p.parentName ? ` · ${tr('Sohn von', 'son of')} ${p.parentName}` : ''}</small></td><td>${POSITIONS[p.position]}</td>
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

  // TABELLE als Pinnwand (UI 3.0, Phase 7): die Tabelle hängt als Zettel am Kork, der eigene
  // Verein ist mit Textmarker markiert. Eintrag antippen: Form (letzte Spiele) und nächster Gegner –
  // alles aus dem Spielplan. Daneben: Aushang (Schwarzes Brett) und Plakat der Stadtmeisterschaften.
  tab_table() {
    const c = this.career;
    const rows = table(c)
      .map((r, i) => {
        const open = this.tableOpen === r.club.id;
        const main = `<tr class="${r.club.human ? 'mine' : ''}${open ? ' open' : ''}"><td>${i + 1}.</td><td class="club-cell"><button class="tbl-club" data-action="tableRow" data-value="${r.club.id}" aria-expanded="${open}">${crestSVG(crestOf(r.club), { size: 16, label: r.club.name })}<span>${r.club.name}</span></button></td><td class="num">${r.played}</td>
          <td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td><td class="num">${r.gf}:${r.ga}</td><td class="num"><b>${r.pts}</b></td></tr>`;
        return open ? `${main}<tr class="tbl-detail"><td></td><td colspan="7">${this.clubForm(r.club.id)}</td></tr>` : main;
      })
      .join('');
    const sheet = `<div class="pin-sheet m-paper m-pin"><p class="t-cap">${leagueName(c)} · ${tr('Saison', 'Season')} ${c.season}</p>
      <table class="league"><thead><tr><th></th><th>${tr('Verein', 'Club')}</th><th>${tr('Sp.', 'P')}</th><th>${tr('S', 'W')}</th><th>${tr('U', 'D')}</th><th>${tr('N', 'L')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt.', 'Pts')}</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="t-2 pin-hint">${tr('Verein antippen: Form und nächstes Spiel.', 'Tap a club: form and next match.')}</p></div>`;
    const notice = this.noticeCard();
    return `<div class="pinboard m-cork">${sheet}<div class="pin-side">${notice ? `<div class="pin-notice m-tape">${notice}</div>` : ''}${this.cupPoster()}</div></div>`;
  }

  // Form eines Vereins: letzte fünf Ergebnisse (S/U/N mit Ergebnis) und das nächste Spiel.
  clubForm(id) {
    const c = this.career;
    const played = [];
    let next = null;
    c.fixtures.forEach((round, i) => {
      const f = round.find((x) => x.home === id || x.away === id);
      if (!f) return;
      if (f.result) played.push({ f, i });
      else if (!next && i >= c.round) next = { f, i };
    });
    const mark = ({ f }) => {
      const home = f.home === id;
      const gf = home ? f.result.home : f.result.away;
      const ga = home ? f.result.away : f.result.home;
      const opp = clubById(c, home ? f.away : f.home);
      const k = gf > ga ? ['w', tr('S', 'W')] : gf < ga ? ['l', tr('N', 'L')] : ['d', tr('U', 'D')];
      return `<li class="${k[0]}" title="${opp.name}"><b>${k[1]}</b> ${gf}:${ga} ${home ? tr('gg.', 'v') : tr('bei', 'at')} ${opp.short}</li>`;
    };
    const form = played.slice(-5).map(mark).join('');
    const nx = next ? `${tr('Spieltag', 'Matchday')} ${next.i + 1} (${dateLabel(matchDate(c, next.i))}): ${next.f.home === id ? tr('gegen', 'v') : tr('bei', 'at')} ${clubById(c, next.f.home === id ? next.f.away : next.f.home).name}` : tr('Kein Spiel mehr in dieser Saison.', 'No more matches this season.');
    return `<ul class="tbl-form">${form || `<li class="none">${tr('noch kein Spiel', 'no games yet')}</li>`}</ul><p class="t-2">${nx}</p>`;
  }

  // Plakat der Stadtmeisterschaften: welches Turnier als Nächstes kommt, wo, was es zu gewinnen gibt.
  cupPoster() {
    const c = this.career;
    const halle = cupOf(c, 'halle');
    const kind = !halle && !seasonOver(c) && c.round <= winterRound(c) ? 'halle' : 'stadt';
    const cfg = CUPS[kind];
    const t = cupOf(c, kind);
    const when = t
      ? t.stage === 'done' ? tr('gespielt', 'played') : t.skipped ? tr('ohne uns', 'without us') : tr('läuft gerade', 'under way')
      : kind === 'halle'
        ? `${tr('Winterpause', 'Winter break')} · ${dateLabel(matchDate(c, winterRound(c)))}`
        : tr('Im Sommer, nach dem letzten Spieltag', 'In summer, after the last matchday');
    return `<button class="cup-poster m-pin" data-action="tab" data-value="cup" style="--pin:#2f6fb5">
      <span class="cp-kicker">${tr('Plakat', 'Poster')}</span><b>${cfg.name}</b><span>${cfg.place}</span>
      <span class="cp-when">${when}</span><span class="cp-prize">${tr(`${cfg.prizes.winner} € für den Sieger`, `€${cfg.prizes.winner} for the winner`)}</span></button>`;
  }

  // SPIELPLAN als Wandkalender: ein Blatt pro Monat, Spieltage auf den Sonntagen markiert, das
  // eigene Spiel mit Gegner und Ergebnis. Tag antippen: alle Spiele dieses Spieltags. Blättern mit
  // den Pfeilen oder Wischen. Datum aus calendar.js (abgeleitet, nicht erfunden).
  tab_fixtures() {
    const c = this.career;
    const dates = c.fixtures.map((_, i) => matchDate(c, i));
    const months = [];
    dates.forEach((d, i) => {
      const key = `${d.year}-${d.month}`;
      let m = months.find((x) => x.key === key);
      if (!m) months.push((m = { key, year: d.year, month: d.month, rounds: [] }));
      m.rounds.push(i);
    });
    const cur = Math.min(c.round, c.fixtures.length - 1);
    if (this.calMonth == null || this.calMonth >= months.length) this.calMonth = Math.max(0, months.findIndex((m) => m.rounds.includes(cur)));
    const mo = months[this.calMonth];
    const sel = this.calRound != null && mo.rounds.includes(this.calRound) ? this.calRound : mo.rounds.includes(cur) ? cur : mo.rounds[0];
    const me = humanClub(c).id;
    const first = (new Date(Date.UTC(mo.year, mo.month - 1, 1)).getUTCDay() + 6) % 7; // Mo = 0
    const days = new Date(Date.UTC(mo.year, mo.month, 0)).getUTCDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push('<span class="cal-day empty"></span>');
    for (let d = 1; d <= days; d++) {
      const r = mo.rounds.find((i) => dates[i].day === d);
      if (r == null) {
        cells.push(`<span class="cal-day${(first + d - 1) % 7 === 6 ? ' sun' : ''}">${d}</span>`);
        continue;
      }
      const f = c.fixtures[r].find((x) => x.home === me || x.away === me);
      const opp = f ? clubById(c, f.home === me ? f.away : f.home) : null;
      const res = f?.result ? `${f.home === me ? f.result.home : f.result.away}:${f.home === me ? f.result.away : f.result.home}` : '';
      cells.push(`<button class="cal-day md${r === cur && !seasonOver(c) ? ' next' : ''}${r === sel ? ' sel' : ''}${f?.result ? ' done' : ''}" data-action="calRound" data-value="${r}" aria-pressed="${r === sel}" aria-label="${dateLabel(dates[r])}: ${tr('Spieltag', 'Matchday')} ${r + 1}${opp ? ` ${tr('gegen', 'v')} ${opp.name}` : ''}${res ? ` ${res}` : ''}"><b>${d}</b><small>${opp ? opp.short : tr('frei', 'bye')}</small>${res ? `<i>${res}</i>` : ''}</button>`);
    }
    const round = c.fixtures[sel];
    const games = round
      .map((f) => {
        const h = clubById(c, f.home);
        const a = clubById(c, f.away);
        return `<p class="${h.human || a.human ? 'mine' : ''}">${h.name} – ${a.name} <b>${f.result ? `${f.result.home}:${f.result.away}` : '-:-'}</b></p>`;
      })
      .join('');
    const dow = tr(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    return `<div class="wall-cal">
      <div class="m-calendar cal-sheet" data-swipe="cal">
        <div class="rings" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="month cal-head">${button('‹', { kind: 'ghost icon', action: 'calMonth', value: -1, 'aria-label': tr('Voriger Monat', 'Previous month'), disabled: this.calMonth === 0 })}<span>${monthLabel(mo)}</span>${button('›', { kind: 'ghost icon', action: 'calMonth', value: 1, 'aria-label': tr('Nächster Monat', 'Next month'), disabled: this.calMonth === months.length - 1 })}</div>
        <div class="cal-grid">${dow.map((x, i) => `<span class="cal-dow${i === 6 ? ' sun' : ''}">${x}</span>`).join('')}${cells.join('')}</div>
        <div class="cal-chips">${mo.rounds.map((r) => `<button class="cal-chip${r === sel ? ' sel' : ''}" data-action="calRound" data-value="${r}" aria-pressed="${r === sel}">${tr('ST', 'MD')} ${r + 1} · ${dates[r].day}.</button>`).join('')}</div>
      </div>
      <div class="round current cal-round"><h4>${tr('Spieltag', 'Matchday')} ${sel + 1} · ${dateLabel(dates[sel], { year: true })}</h4>${games}</div>
    </div>`;
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
