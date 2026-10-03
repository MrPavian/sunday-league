import { tr } from '../core/i18n.js';
import { museum } from '../career/museum.js';
import { seasonReview } from '../career/review.js';
import { shareReview } from './review.js';
import { GROUP_LABELS, SIMPLE } from '../sim/commands.js';
import { coachLevel, homeView, setCoachLevel } from './prefs.js';
import { button, haptic, icon, tabs as uiTabs } from './ds.js';
import { TacticBoard } from './TacticBoard.js';
import { bindFlips, phone } from './world.js';
import { crestOf, crestSVG } from './crest.js';
import { appointStaff, releaseStaff } from '../career/staff.js';

// Was im Vereinsheim scrollt (je nach Bildschirmgröße das Fenster, der Inhalt oder die Mappe).
const SCROLLERS = '.club-panel, .club-main, .club-body, .club-folder, .folder-sheet';
const scrollKey = (el) => SCROLLERS.split(', ').find((sel) => el.matches(sel));
import { argueRumor, askRumor, currentLineup, humanClub, updateClub, updateCrest, setClubTactic, setClubPlan, maxSquad, recruit, releasePlayer, scoutRumor, talkRumor, nudge, playerOf, resetLineup, setLineupSlot, seasonOver, table } from '../career/career.js';
import { appointCoach, startCourse } from '../career/youthteams.js';
import { acceptSponsor, bookTrip, KIT_COST } from '../career/finances.js';
import { tripChoose } from '../career/trip.js';
import { build } from '../career/facilities.js';
import { negotiate } from '../career/sponsors.js';
import { inviteTrialist, runStation, startTraining } from '../career/training.js';
import { promoteProspect } from '../career/youth.js';
import { setPate, toggleTrainUp } from '../career/bridge.js';
import { resolveEvent } from '../career/events.js';
import { legacy, resolveLegacy, stepDown, succeed, successionCandidates } from '../career/legacy.js';
import { askWirt, buyRound, playDart, setTactic, talk } from '../career/pub.js';
import { poachKid, setYouthFocus } from '../career/academy.js';
import { supportDream } from '../career/pub.js';
import { clubScreens } from './clubhouse/club.js';
import { homeScreens } from './clubhouse/home.js';
import { phoneScreens } from './clubhouse/phone.js';
import { pubScreens } from './clubhouse/pub.js';
import { seasonScreens } from './clubhouse/season.js';
import { teamScreens } from './clubhouse/team.js';
import { hex, dartPoints, leagueName } from './clubhouse/shared.js';


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
      else if (action === 'youthTab') this.youthTab = value;
      else if (action === 'playerStep') this.stepPlayer(Number(value));
      else if (action === 'squadSort') this.squadSort = value;
      else if (action === 'slotPick' || action === 'benchPick') this.lineupPick(action === 'slotPick' ? { slot: Number(value) } : { idx: Number(value) });
      else if (action === 'pickCancel') this.pick = null;
      else if (action === 'poachKid') {
        poachKid(this.career, value);
        this.h.onChange();
      } else if (action === 'youthFocus') {
        const [team, focus] = String(value).includes(':') ? String(value).split(':') : [null, value];
        setYouthFocus(this.career, focus, team);
        this.h.onChange();
      } else if (action === 'youthCoach') {
        const [team, kind] = String(value).split(':');
        appointCoach(this.career, team, kind, (idx) => playerOf(this.career, idx).name);
        this.h.onChange();
      } else if (action === 'staffSquad') {
        const sel = this.root.querySelector(`select[data-staff-pick="${value}"]`);
        if (sel) appointStaff(this.career, value, { idx: Number(sel.value) }, { playerOf: (c, idx) => playerOf(c, idx), squad: humanClub(this.career).squad });
        this.h.onChange();
      } else if (action === 'staffOutside') {
        appointStaff(this.career, value, 'outside');
        this.h.onChange();
      } else if (action === 'staffRelease') {
        releaseStaff(this.career, value);
        this.h.onChange();
      } else if (action === 'youthCourse') {
        startCourse(this.career, value);
        this.h.onChange();
      }
      else if (action === 'chronicle') this.showChronicle = !this.showChronicle;
      else if (action === 'kitColor') {
        const [part, color] = value.split(':');
        this.draft.kit[part] = Number(color);
      } else if (action === 'kitPattern') this.draft.kit.pattern = value;
      else if (action.startsWith('crest')) this.crestAction(action, value);
      else if (action === 'foundClub') {
        updateClub(this.career, this.draft ?? {}, { free: true });
        if (this.crestDraft) updateCrest(this.career, this.crestDraft);
        delete this.career.founding;
        this.draft = null;
        this.crestDraft = null;
        this.tab = 'home';
        this.h.onChange();
      } else if (action === 'saveClub') {
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
      } else if (action === 'eventFold') {
        this.eventFold = { week: `${this.career.season}:${this.career.round}`, state: value };
      } else if (action === 'event') {
        resolveEvent(this.career, Number(value));
        this.eventFold = { week: `${this.career.season}:${this.career.round}`, state: 'open' }; // Ergebnis einmal zeigen
        haptic('confirm');
        this.h.onChange();
      } else if (action === 'trainUp') {
        toggleTrainUp(this.career, Number(value));
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
      } else if (action === 'askAround') {
        askRumor(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'talk') {
        talkRumor(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'argue') {
        const [i, arg] = String(value).split(':');
        argueRumor(this.career, Number(i), arg);
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

  // Neuzeichnen ersetzt das ganze Fenster – ohne das hier springt jede Farbwahl nach oben.
  saveScroll() {
    const els = [this.root, ...this.root.querySelectorAll(SCROLLERS)];
    return { page: document.scrollingElement?.scrollTop ?? 0, list: els.map((el) => [el === this.root ? null : scrollKey(el), el.scrollTop]).filter(([, top]) => top > 0) };
  }

  restoreScroll({ page, list }) {
    for (const [key, top] of list) {
      const el = key == null ? this.root : this.root.querySelector(key);
      if (el) el.scrollTop = top;
    }
    if (document.scrollingElement && page) document.scrollingElement.scrollTop = page;
  }

  renderFounding() {
    const scroll = this.shownTab === 'founding' ? this.saveScroll() : null;
    this.shownTab = 'founding';
    this.root.classList.remove('see-through');
    this.root.innerHTML = this.founding();
    if (scroll) this.restoreScroll(scroll);
    this.bindClubForm();
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

  // A-Jugend: Pate auswählen (Auswahlliste je Talent).
  bindPate() {
    this.root.querySelectorAll('select[data-pate]').forEach((sel) =>
      sel.addEventListener('change', () => {
        setPate(this.career, Number(sel.dataset.pate), sel.value === '' ? null : Number(sel.value));
        this.h.onChange();
        this.render();
      }),
    );
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

  // Android-Zurück-Taste: erst Auswahl/Spielerkarte schließen, dann zurück auf „Heute".
  // false = nichts mehr zurückzunehmen (dann geht es ins Hauptmenü).
  back() {
    if (this.busy) return true;
    if (this.career?.founding) return false; // Gründung bleibt offen, geht beim nächsten Mal weiter
    if (this.pick) this.pick = null;
    else if (this.openPlayer != null) this.openPlayer = null;
    else if (this.tab !== 'home') this.tab = 'home';
    else return false;
    this.render();
    return true;
  }

  setBusy(text) {
    this.busy = text;
    this.render();
  }

  render() {
    const c = this.career;
    const club = humanClub(c);
    if (c.founding) return this.renderFounding();
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
    this.root.classList.toggle('see-through', area.id === 'home' && homeView() !== 'klassisch');
    // Neuer Bereich/Tab: Inhalt blendet einmal kurz ein (nicht bei jedem Neuzeichnen).
    const enter = this.shownTab !== this.tab;
    this.shownTab = this.tab;
    const scroll = enter ? null : this.saveScroll();
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
    if (scroll) this.restoreScroll(scroll);
    this.bindLineup();
    // Chat im Handy: beim Öffnen unten anfangen (neueste Nachricht), wie im echten Messenger.
    const wa = this.root.querySelector('.phone-stage.open .wa-body');
    if (wa) wa.scrollTop = wa.scrollHeight;
    this.bindPub();
    this.bindPate();
    this.bindCalSwipe();
    this.bindClubForm();
    const slot = this.root.querySelector('.club-tboard');
    if (slot && this.boardData) {
      this.tboard ??= new TacticBoard();
      slot.appendChild(this.tboard.el);
      this.tboard.update(this.boardData.formation, this.boardData.target);
    }
  }

}

// Bildschirme je Bereich (src/ui/clubhouse/*): Methoden mit demselben this wie oben.
Object.assign(Clubhouse.prototype, homeScreens, teamScreens, seasonScreens, clubScreens, phoneScreens, pubScreens);
