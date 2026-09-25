import {
  clubById,
  currentLineup,
  humanClub,
  KIT_COLORS,
  KIT_PATTERNS,
  kitEditable,
  updateClub,
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
import { inviteChance, inviteTrialist, isRawDiamond, MAX_STATIONS, runStation, startTraining, STATIONS, TRAINING_COST, trainingDone } from '../career/training.js';
import { promoteProspect, STAFF_ROLES } from '../career/youth.js';
import { moodLabel, resolveEvent } from '../career/events.js';
import { storyLabels } from '../career/stories.js';
import { chronicleData, yearOf } from '../career/sagas.js';
import { askWirt, buyRound, dossier, playDart, PUB_ACTIONS, PUB_NAME, pubOpen, pubState, ROUND_PRICE, setTactic, TACTICS, talk, wirtName } from '../career/pub.js';
import { DOSSIER_LABELS } from '../data/backstories.js';
import { FOCUS, ownKids, poachChance, poachKid, scoutList, setYouthFocus, talentGuess, TEAMS, teamOfAge } from '../career/academy.js';
import { derbyOf, isDerbyFixture } from '../career/derby.js';
import { CUP_NAME, cupClub, cupOf, groupTable, humanCupMatch, PRIZES, stageName, tournamentOpen } from '../career/tournament.js';
import { canSupportDream, DREAM_COST, supportDream } from '../career/pub.js';
import { chemistry, REL, relationLabel, relationsOfPlayer, shortName } from '../career/relations.js';
import { childAge, coachAway, coachName, energyLabel, isCoach, patienceLabel, STYLES, trainingLocked } from '../career/personal.js';
import { TRAITS } from '../data/traits.js';
import { tierById } from '../data/tiers.js';
import { POSITIONS } from '../sim/generator.js';
import { PITCHES } from '../sim/pitch.js';

const STATUS = { yes: ['Zusage', 'yes'], no: ['Absage', 'no'], late: ['Kommt später', 'late'] };
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const first = (name) => name.split(' ')[0];
// Dart: je näher an der Mitte, desto mehr Punkte (max. 60 pro Wurf).
const dartPoints = (x) => Math.round(60 * Math.max(0, 1 - Math.abs(x)) ** 1.4);
const formArrow = (f = 0) => (f >= 0.25 ? ' <span class="form up" title="gut drauf">▲</span>' : f <= -0.25 ? ' <span class="form down" title="nicht in Form">▼</span>' : '');
const euro = (n) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`;

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
      else if (action === 'saveClub') {
        const res = updateClub(this.career, this.draft);
        this.clubNote = res === 'nocash' ? `Zu wenig in der Kasse – ein neuer Trikotsatz kostet ${KIT_COST} €.` : 'Bestellt!';
        if (res !== 'nocash') this.draft = null;
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
      } else if (action === 'trip') {
        bookTrip(this.career);
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
      } else if (action in this.h) return this.h[action]();
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
      ['chat', 'Chatgruppe'],
      ['pub', 'Kneipe'],
      ['squad', 'Kader'],
      ['lineup', 'Aufstellung'],
      ['transfers', 'Transfers'],
      ['training', 'Training'],
      ['youth', 'Jugend'],
      ['table', 'Tabelle'],
      ['cup', 'Turnier'],
      ['club', 'Verein'],
      ['cash', 'Kasse'],
      ['fixtures', 'Spielplan'],
    ];
    this.root.innerHTML = `
      <div class="club-panel">
        <header style="--kit:${hex(club.kit.shirt)}">
          <div><h2><span class="crest"></span>${club.name}</h2>
          <small>${c.league} · Saison ${c.season} · ${over ? 'Saison beendet' : `${this.results ? 'Ergebnisse' : 'Woche vor'} Spieltag ${roundNo} / ${c.fixtures.length}`}</small></div>
          <button data-action="onMenu">Hauptmenü</button>
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
        <p class="label">Sonntag, 10:30 Uhr${isDerbyFixture(c, f) ? ` · <b class="derby">${derbyOf(c).name}</b>` : ''}</p>
        <h3>${home ? club.short : opp.short} – ${home ? opp.short : club.short}</h3>
        <p>${home ? 'Heimspiel' : 'Auswärts'} gegen <b>${opp.name}</b></p>
        <p class="venue-line">${venue.name} · ${venue.surface.name} · ${venue.format} gegen ${venue.format}</p>
        <p class="avail">${count('yes')} Zusagen · ${count('late')} später · ${count('no')} Absagen</p>
        <p class="mood-line">Stimmung im Team: <b class="mood mood-${moodLabel(c.mood ?? 0)}">${moodLabel(c.mood ?? 0)}</b></p>
        ${w.event && w.event.choice === null ? '<p class="warn">In der Gruppe wartet eine Entscheidung auf dich.</p>' : ''}
        ${storyLabels(c).length ? `<ul class="stories">${storyLabels(c).map((s) => `<li>${s}</li>`).join('')}</ul>` : ''}
        ${count('yes') < venue.format ? '<p class="warn">Zu wenige Zusagen – es hilft jemand aus dem Bekanntenkreis aus.</p>' : ''}
        ${this.meBars()}
        ${this.busy ? `<p class="busy">${this.busy}</p>` : `
        ${coachAway(c) ? '<p class="warn">Du bist diese Woche nicht da – der Kapitän stellt auf, du bekommst nur das Ergebnis.</p>' : '<button class="primary" data-action="onPlay">Selbst spielen</button>'}
        <button data-action="onSimulate">${coachAway(c) ? 'Ergebnis abwarten' : 'Simulieren'}</button>`}
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
        .map((k) => `<li class="${k.own ? 'own' : ''}"><b>${k.name}</b>${k.own ? ` <span class="me-tag">${k.girl ? 'Tochter' : 'Sohn'}</span>` : ''} <small>${k.age} J. · ${POSITIONS[k.position]}${k.girl ? ' · Mädchen' : ''}${k.parent === 'ehrgeizig' ? ' · ehrgeiziger Vater' : k.parent === 'engagiert' ? ' · Eltern helfen mit' : ''}</small>
          <span class="stars" title="Einschätzung des Jugendtrainers">${stars(talentGuess(c, k))}</span><span class="me-bar mini"><i style="--v:${Math.round(k.joy * 100)}%"></i><small>Spaß</small></span></li>`)
        .join('');
      return `<article class="youth-team"><h5>${t.name} <small>(${t.ages[0]}–${t.ages[1]} J.)</small></h5><ul class="plain">${rows}</ul></article>`;
    }).join('');
    const last = c.youth.results?.at(-1);
    return `<h4>Jugendtraining diese Woche</h4>
      <div class="actions">${focusButtons}</div>
      <p class="empty">${FOCUS[focus].desc} Mit 16 wechseln die Kinder in die A-Jugend – Mädchen ins Frauenteam, sobald es eins gibt.</p>
      <div class="youth-teams">${teams || '<p class="empty">Keine Kinder in der Jugend.</p>'}</div>
      ${last ? `<p>Letzte Saison: ${last.results.map((r) => `${r.team}-Jugend ${r.pos}.`).join(' · ')}</p>` : ''}
      <h4>Talente bei anderen Vereinen</h4>
      <p class="empty">Einmal pro Woche kannst du die Eltern eines Talents ansprechen. Kostet Kraft – und die anderen Vereine mögen das gar nicht.</p>
      <ul class="plain scout-kids">${scoutList(c)
        .map((k) => `<li><b>${k.name}</b> <small>${k.age} J. · ${POSITIONS[k.position]} · ${k.club}</small> <span class="stars">${stars(talentGuess(c, k))}</span>
          ${k.status === 'open' ? `<button class="tiny" data-action="poachKid" data-value="${k.id}" ${!c.week || c.week.poached || this.results ? 'disabled' : ''}>Ansprechen (~${Math.round(poachChance(c, k) * 100)} %)</button>` : `<small class="reply ${k.status === 'joined' ? 'ok' : 'no'}">${k.reply}</small>`}</li>`)
        .join('')}</ul>`;
  }

  // Stammkneipe: zwei Aktionen pro Woche.
  tab_pub() {
    const c = this.career;
    if (!c.week || this.results) return `<p class="empty">Die „${PUB_NAME}" macht nach dem Spieltag wieder auf.</p>`;
    if (!pubOpen(c)) return '<p class="warn">Du bist diese Woche nicht da. Die Jungs gehen ohne dich – und erzählen dir hinterher nur die Hälfte.</p>';
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
          <p>Wurf ${this.dart.throws.length + 1} von 3 ${this.dart.throws.length ? `· bisher ${this.dart.throws.join(' + ')}` : ''}</p>
          <button class="primary" data-action="dartThrow">Werfen!</button></div>`
      : `<button data-action="dartStart" ${dis}>Dart gegen Opa Heinz – Verlierer zahlt die Runde</button>`;
    return `
      <div class="pub">
        <p class="chat-head">„${PUB_NAME}" · Wirt ${wirtName(c)} · noch ${left} von ${PUB_ACTIONS} Aktionen diese Woche <small>(jede kostet etwas Familienzeit)</small></p>
        <blockquote class="heinz">Opa Heinz am Stammtisch: ${pub.heinz}</blockquote>
        ${pub.log.length ? `<ul class="pub-log">${pub.log.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
        <div class="pub-grid">
          <article><h4>Runde ausgeben</h4><p>Für alle ${club.squad.length}: ${cost} €. Hebt die Stimmung.</p><button data-action="pubRound" ${dis}>Runde bestellen</button></article>
          <article><h4>Wirt ausfragen</h4><p>${wirtName(c)} kennt jeden. Mal ein Name für die Transfers, mal ein Tipp zum nächsten Gegner.</p><button data-action="pubWirt" ${dis}>„Und, was gibt's Neues?"</button>${pub.intel ? '<p class="reply ok">Tipp zum Gegner notiert – wirkt am Sonntag.</p>' : ''}</article>
          <article class="wide"><h4>Einzelgespräch</h4>
            <select data-pub-pick>${mates.map((idx) => `<option value="${idx}" ${idx === pick ? 'selected' : ''}>${this.p(idx).name}</option>`).join('')}</select>
            <ul class="dossier">${facts.map((f) => `<li><b>${DOSSIER_LABELS[f.kind]}:</b> ${f.known ? f.text : '<em>noch unbekannt</em>'}</li>`).join('')}
              ${pick != null && relationsOfPlayer(c, pick).length ? `<li><b>Im Team:</b> ${relationLabel(c, pick)}</li>` : ''}
              ${pick != null && c.players[pick]?.dreamDone ? '<li><b>Traum:</b> <em>unterstützt – er ist dir dankbar und sagt seltener ab</em></li>' : ''}</ul>
            ${pick != null && canSupportDream(c, pick) ? `<button data-action="pubDream" ${c.cash < DREAM_COST ? 'disabled' : ''}>Seinen Traum unterstützen (${DREAM_COST} €, kostet Kraft)</button>` : ''}
            <div class="actions">
              <button data-action="pubTalk" data-value="listen" ${dis}>Zuhören</button>
              <button data-action="pubTalk" data-value="cheer" ${dis}>Aufmuntern</button>
              <button data-action="pubTalk" data-value="straight" ${dis}>Klartext reden</button>
            </div></article>
          <article class="wide"><h4>Taktik auf dem Bierdeckel</h4><p>Gilt fürs nächste Spiel.${pub.tactic ? ` Gewählt: <b>${TACTICS[pub.tactic].name}</b>.` : ''}</p><div class="actions">${tactics}</div></article>
          <article class="wide"><h4>Dart</h4>${dart}${pub.dart ? `<p class="reply">Letztes Duell: ${pub.dart.you} zu ${pub.dart.heinz}</p>` : ''}</article>
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
    const title = d.festschrift ? `Festschrift: ${d.festschrift.age} Jahre ${d.name}` : `Chronik des ${d.name}`;
    if (!this.showChronicle) return `<p><button data-action="chronicle">${d.festschrift ? 'Festschrift lesen' : 'Vereinschronik'}</button> <small>gegründet ${d.founded} · ${d.age} Jahre</small></p>`;
    const seasons = d.seasons.length
      ? d.seasons.map((h) => `<tr><td>${h.year}</td><td>${h.league}</td><td class="num">${h.pos}.</td><td>${h.pos === 1 ? 'Meister' : h.relegated ? 'Abstieg' : ''}</td><td>${h.topScorer ? `${h.topScorer.name} (${h.topScorer.goals})` : '–'}</td></tr>`).join('')
      : '<tr><td colspan="5"><em>Die erste Saison läuft noch.</em></td></tr>';
    const list = (arr, key, unit) => arr.filter((p) => p[key] > 0).map((p) => `<li>${p.name}${p.active ? '' : ' <small>(Ehemaliger)</small>'} – ${p[key]} ${unit}</li>`).join('') || '<li><em>noch keine</em></li>';
    const events = d.events.length ? d.events.map((e) => `<li><b>${yearOf(this.career, e.season)}</b> ${e.text}</li>`).join('') : '<li><em>Die großen Geschichten kommen noch.</em></li>';
    const frauen = d.frauen ? `<p>Frauenteam seit Saison ${d.frauen.founded}, Kapitänin ${d.frauen.captain}${d.frauen.seasons.length ? ` · Platzierungen: ${d.frauen.seasons.map((s) => `${s.pos}.`).join(', ')}` : ''}</p>` : '';
    const pros = d.pros.length ? `<p>Aus der eigenen Jugend zu den Profis: ${d.pros.map((p) => `${p.name} (${p.club})${p.back ? ' – zurück im Verein' : ''}`).join(', ')}</p>` : '';
    return `<div class="paper chronicle-paper">
        <div class="masthead">${title} <small>seit ${d.founded}</small></div>
        <p class="lead">Gegründet ${d.founded} am Stammtisch einer Kneipe am Kanal – mit einem Ball, elf Leuten und keinem Tor.</p>
        <h4>Saisons</h4>
        <table class="stats season-table"><thead><tr><th>Jahr</th><th>Liga</th><th>Platz</th><th></th><th>Torschützenkönig</th></tr></thead><tbody>${seasons}</tbody></table>
        <div class="records"><div><h4>Rekordspieler</h4><ul>${list(d.topApps, 'apps', 'Spiele')}</ul></div><div><h4>Rekordtorschützen</h4><ul>${list(d.topGoals, 'goals', 'Tore')}</ul></div></div>
        ${frauen}${pros}
        <h4>Meilensteine</h4><ul class="milestones">${events}</ul>
        <button data-action="chronicle">Zuklappen</button>
      </div>`;
  }

  // Familie & Energie des Spielertrainers als kleine Balken.
  meBars() {
    const k = this.career.coach;
    if (!k) return '';
    const bar = (label, v, text) => `<div class="me-bar ${v < 25 ? 'low' : v < 50 ? 'mid' : ''}"><span>${label}</span><i style="--v:${v}%"></i><small>${text}</small></div>`;
    return `<div class="me-bars">${bar('Familie', k.patience, patienceLabel(k.patience))}${bar('Energie', k.energy, energyLabel(k.energy))}</div>`;
  }

  roundResults() {
    const c = this.career;
    const round = this.results;
    return `
      <div class="fixture-card">
        <p class="label">Ergebnisse Spieltag ${c.round + 1}</p>
        <ul class="results">${round
          .map((f) => {
            const h = clubById(c, f.home);
            const a = clubById(c, f.away);
            const mine = h.human || a.human;
            return `<li class="${mine ? 'mine' : ''}"><span>${h.short}</span><b>${f.result.home} : ${f.result.away}</b><span>${a.short}</span></li>`;
          })
          .join('')}</ul>
        ${this.miniTable()}
        <button class="primary" data-action="onNextWeek">Weiter zur nächsten Woche</button>
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
    if (pos === 1 && level === 1) msg = 'MEISTER! Aufstieg in die Kreisklasse C – eigener Rasenplatz, Schiri, 7 gegen 7. Die Runde im Vereinsheim geht aufs Haus.';
    else if (pos === 1) msg = 'MEISTER der Kreisklasse C! Die Kreisklasse B kommt in einem späteren Update – bis dahin wird die Schale jede Woche poliert.';
    else if (last && level > 1) msg = 'Letzter Platz – Abstieg in die Freizeitliga. Kopf hoch, der Hinterhof wartet.';
    else if (pos === 2) msg = 'Vizemeister! Nächstes Jahr greifen wir an.';
    else if (last) msg = 'Rote Laterne. Aber die Stimmung stimmt.';
    else msg = 'Solides Mittelfeld. Die Mannschaftsfahrt ist trotzdem gebucht.';
    const chronicle = (c.history ?? []).length
      ? `<p class="label">Vereinschronik</p><ul class="chronicle">${c.history.map((h) => `<li>Saison ${h.season}: ${h.pos}. Platz · ${h.league}</li>`).join('')}</ul>`
      : '';
    return `
      <div class="fixture-card">
        <p class="label">Saisonende</p>
        <h3>Platz ${pos}</h3>
        <p>${msg}</p>
        <p>Meister: <b>${champ.name}</b></p>
        ${this.miniTable()}
        ${chronicle}
        ${c.tripBooked
          ? '<p class="reply ok">Mannschaftsfahrt gebucht! Die Stimmung nächste Saison: bestens.</p>'
          : `<button data-action="trip" ${c.cash < TRIP_COST ? 'disabled' : ''}>Saisonabschlussfahrt buchen (${TRIP_COST} €, Kasse: ${euro(c.cash)})</button>`}
        ${this.cupAside()}
      </div>`;
  }

  // Saisonende: erst Stadtmeisterschaft (oder absagen), dann die neue Saison.
  cupAside() {
    const c = this.career;
    const t = cupOf(c);
    if (!t) return `<p class="label">Sommer: ${CUP_NAME}</p><p>Acht Vereine, ein Pokal, ${PRIZES.winner} € für den Sieger.</p>
      <button class="primary" data-action="onCupStart">Zur ${CUP_NAME} anmelden</button>
      <button data-action="onCupSkip">Diesmal nicht – direkt in die neue Saison</button>`;
    if (tournamentOpen(c)) return `<p class="label">${CUP_NAME} läuft</p><button class="primary" data-action="tab" data-value="cup">Zum Turnier</button>`;
    return `${t.log.length && !t.skipped ? `<p class="reply ok">${t.log.at(-1)}</p>` : ''}<button class="primary" data-action="onNewSeason">Nächste Saison</button>`;
  }

  tab_cup() {
    const c = this.career;
    const t = cupOf(c);
    const trophies = (c.trophies ?? []).length ? `<h4>Vitrine</h4><ul class="plain trophies">${c.trophies.map((tr) => `<li>Pokal: ${tr.name}</li>`).join('')}</ul>` : '';
    if (!t || t.skipped) return `<p class="empty">Die ${CUP_NAME} steigt im Sommer, nach dem letzten Spieltag: acht Vereine auf dem Sportplatz Am Kanal, 5 gegen 5 mit Schiri.</p>${trophies}`;
    const me = humanClub(c).id;
    const table = (g) => `<table class="squad cup-table"><thead><tr><th>Gruppe ${g === 0 ? 'A' : 'B'}</th><th>Sp.</th><th>Tore</th><th>Pkt.</th></tr></thead><tbody>${groupTable(c, g)
      .map((r, i) => `<tr class="${r.id === me ? 'mine' : ''} ${i < 2 ? 'through' : ''}"><td>${r.club.name}</td><td class="num">${r.p}</td><td class="num">${r.gf}:${r.ga}</td><td class="num">${r.pts}</td></tr>`)
      .join('')}</tbody></table>`;
    const line = (m) =>
      `<li class="${m.home === me || m.away === me ? 'mine' : ''}"><small>${stageName(m)}</small> ${cupClub(c, m.home).short} ${m.result ? `<b>${m.result.home}:${m.result.away}</b>${m.pens ? ` <small>(${m.pens.home}:${m.pens.away} i. E.)</small>` : ''}` : '–:–'} ${cupClub(c, m.away).short}</li>`;
    const ko = t.matches.filter((m) => m.stage === 'SF' || m.stage === 'F');
    const next = humanCupMatch(c);
    let action = '';
    if (t.stage === 'done') action = `<p class="reply ok">${t.log.at(-1) ?? ''}</p>`;
    else if (this.busy) action = `<p class="busy">${this.busy}</p>`;
    else if (next) {
      const opp = cupClub(c, next.home === me ? next.away : next.home);
      action = `<div class="fixture-card"><p class="label">${stageName(next)}</p><h3>${humanClub(c).short} – ${opp.short}</h3><p>gegen <b>${opp.name}</b>${next.stage !== 'A' && next.stage !== 'B' ? ' · bei Unentschieden Elfmeterschießen' : ''}</p>
        <button class="primary" data-action="onCupPlay">Selbst spielen</button> <button data-action="onCupSimulate">Simulieren</button></div>`;
    } else action = `<p>Ihr seid raus – die anderen spielen noch.</p><button data-action="onCupSimulate">Nächste Runde anschauen</button>`;
    return `
      <p class="chat-head">${CUP_NAME} ${t.year} · Sportplatz Am Kanal · Sieger ${PRIZES.winner} €, Finale ${PRIZES.final} €, Halbfinale ${PRIZES.semi} €</p>
      ${action}
      <div class="cup-groups">${table(0)}${table(1)}</div>
      ${ko.length ? `<h4>K.-o.-Runde</h4><ul class="plain cup-list">${ko.map(line).join('')}</ul>` : ''}
      <h4>Alle Spiele</h4><ul class="plain cup-list">${t.matches.filter((m) => m.result).map(line).join('') || '<li><em>Gleich geht es los.</em></li>'}</ul>
      ${t.log.length ? `<h4>Eure Ergebnisse</h4><ul class="plain">${t.log.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
      ${trophies}`;
  }

  miniTable() {
    return `<ol class="mini">${table(this.career)
      .map((r) => `<li class="${r.club.human ? 'mine' : ''}"><span>${r.club.short}</span><b>${r.pts}</b></li>`)
      .join('')}</ol>`;
  }

  tab_chat() {
    const c = this.career;
    if (!c.week) return '<p class="empty">Die Gruppe ist ruhig. Saisonpause.</p>';
    const w = c.week;
    const club = humanClub(c);
    const bubbles = w.chat
      .map((msg) => {
        if (msg.from === null) return `<div class="bubble me"><b>Du (Trainer)</b>${msg.text}<time>${msg.time}</time></div>`;
        const p = this.p(msg.from);
        const status = STATUS[w.availability[msg.from]];
        return `<div class="bubble"><b>${p.name}</b>${msg.text}<time>${msg.time}</time>${status ? `<i class="st ${status[1]}"></i>` : ''}</div>`;
      })
      .join('');
    const declined = club.squad.filter((idx) => w.availability[idx] === 'no' && !w.nudged.includes(idx) && !c.players[idx].injuryWeeks).filter((idx) => !isCoach(c, idx));
    const ev = w.event;
    const eventCard = ev
      ? `<div class="event-card">
          <p class="label">${ev.story ? `Geschichte · ${ev.story}` : 'Diese Woche im Verein'}</p>
          <p>${ev.text}</p>
          ${ev.choice !== null
            ? `<p class="reply ok">➜ ${ev.options[ev.choice] ?? ''}: ${ev.result ?? ''}</p>`
            : this.results
              ? ''
              : `<div class="actions">${ev.options.map((o, i) => `<button ${i === 0 ? 'class="primary"' : ''} data-action="event" data-value="${i}">${o}</button>`).join('')}</div>`}
        </div>`
      : '';
    return `
      ${eventCard}
      <div class="chat-head">„Wer kann Sonntag?" · ${club.squad.length} Mitglieder</div>
      <div class="chat">${bubbles}</div>
      <div class="nudge">
        <span>Nachhaken (${w.nudges} übrig):</span>
        ${declined.length && w.nudges > 0 && !this.results
          ? declined.map((idx) => `<button data-action="nudge" data-value="${idx}">${first(this.p(idx).name)}</button>`).join('')
          : '<em>niemand</em>'}
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
        const avg = r.graded ? (r.gradeSum / r.graded).toFixed(1).replace('.', ',') : '–';
        return `<tr style="--c:${tier.color}">
          <td><span class="badge">${tier.name}</span></td>
          <td><b>${p.name}</b>${isCoach(c, idx) ? ' <span class="me-tag">Du</span>' : ''}${p.title ? ` <em>${p.title}</em>` : ''}${formArrow(r.form)}${r.absenceMul > 1.2 ? ' <span class="grumpy" title="hat gerade wenig Zeit – sagt öfter ab">selten da</span>' : ''}${r.grumpy ? ' <span class="grumpy" title="angefressen – sagt öfter ab">grummelt</span>' : ''}<small>${p.age} J. · ${p.profession}</small>${relationLabel(c, idx) ? `<small class="rel">${relationLabel(c, idx)}</small>` : ''}</td>
          <td>${POSITIONS[p.position]}</td><td class="num">${p.rating}</td>
          <td>${r.injuryWeeks ? `<span class="st-text no" title="${r.injury?.label ?? 'verletzt'}">${r.injury ? `${r.injury.label} · ${r.injuryWeeks} Wo.` : 'verletzt'}</span>` : st ? `<span class="st-text ${st[1]}">${st[0]}</span>` : ''}</td>
          <td class="num">${r.apps}</td><td class="num">${r.goals}</td><td class="num">${r.assists}</td><td class="num">${avg}</td>
          <td>${canRelease && !isCoach(c, idx) ? (this.confirmRelease === idx ? `<button class="tiny danger" data-action="release" data-value="${idx}">Wirklich?</button>` : `<button class="tiny" data-action="release" data-value="${idx}" title="Verabschieden">×</button>`) : ''}</td>
        </tr>`;
      })
      .join('');
    return `<table class="squad"><thead><tr><th></th><th>Spieler</th><th>Pos.</th><th>Stärke</th><th>Sonntag</th><th>Sp.</th><th>Tore</th><th>Vorl.</th><th>Ø Note</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  tab_lineup() {
    const c = this.career;
    if (!c.week || this.results) return '<p class="empty">Die Aufstellung für den nächsten Spieltag gibt es nach dem Wochenstart.</p>';
    const { formation, lineup, bench } = currentLineup(c);
    const club = humanClub(c);
    const ROLE = { gk: 'Tor', def: 'Abwehr', mid: 'Mitte', fwd: 'Sturm' };
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
          <select data-slot="${i}">${current == null ? '<option selected>Aushilfe aus dem Bekanntenkreis</option>' : ''}${opts}</select></label>`;
      })
      .join('');
    const gkIdx = formation.findIndex((f) => f.role === 'gk');
    const keeper = lineup[gkIdx] != null ? this.p(lineup[gkIdx]) : null;
    const keeperNote = keeper && keeper.position !== 'gk' ? `<p class="warn">Kein Torwart da – ${keeper.name.split(' ')[0]} muss ran. Handschuhe liegen im Kofferraum.</p>` : '';
    const chem = chemistry(c, lineup);
    const chemLine = chem.pairs.length
      ? `<p class="chem ${chem.score < 0 ? 'bad' : 'good'}">Teamchemie ${chem.score > 0 ? '+' : ''}${chem.score}: ${chem.pairs.map((pr) => `${shortName(c, pr.a)} & ${shortName(c, pr.b)} (${REL[pr.type].plural})`).join(' · ')}</p>`
      : '<p class="chem">Teamchemie: In dieser Aufstellung kennt sich keiner näher.</p>';
    const benchList = bench.length
      ? bench.map((idx) => `<li>${this.p(idx).name}${c.week.availability[idx] === 'late' ? ' <em>(kommt zur 2. HZ)</em>' : ''}</li>`).join('')
      : '<li><em>niemand</em></li>';
    if (coachAway(c)) return `<p class="warn">Du bist diese Woche nicht da. Der Kapitän stellt auf – nach bestem Wissen und Gewissen.</p><h4>Bank</h4><ul class="bench">${benchList}</ul>`;
    return `
      <p class="chat-head">${formation.length} gegen ${formation.length} · ${c.week.lineup ? 'eigene Aufstellung' : 'automatisch aufgestellt'}</p>
      <div class="lineup">${slots}</div>
      ${chemLine}
      ${keeperNote}
      <h4>Bank</h4><ul class="bench">${benchList}</ul>
      <button data-action="autoLineup">Automatisch aufstellen</button>`;
  }

  tab_transfers() {
    const c = this.career;
    const w = c.week;
    if (!w || this.results) return '<p class="empty">Die Gerüchteküche meldet sich nach dem Wochenstart.</p>';
    const club = humanClub(c);
    const full = club.squad.length >= maxSquad(c);
    const cards = w.rumors
      .map((r, i) => {
        const p = this.p(r.idx);
        const tier = tierById(p.tier);
        const known = r.scouted;
        const badge = known ? `<span class="badge" style="--c:${tier.color}">${tier.name}</span>` : '<span class="badge unknown">?</span>';
        const rating = known ? `Stärke ${p.rating}` : `Stärke ca. ${r.range[0]}–${r.range[1]}`;
        const traits = known && p.traits.length ? `<p class="traits">${p.traits.map((t) => `<i title="${TRAITS[t].desc}">${TRAITS[t].name}</i>`).join('')}</p>` : '';
        const story = known && p.backstory ? `<p class="story">${p.backstory}</p>` : '';
        const chance = Math.round(recruitChance(c, r) * 100);
        let footer;
        if (r.status === 'joined') footer = `<p class="reply ok">„${r.reply}" – ist jetzt im Kader!</p>`;
        else if (r.status === 'declined') footer = `<p class="reply no">„${r.reply}"</p>`;
        else
          footer = `<div class="actions">
            <button data-action="scout" data-value="${i}" ${known || w.actions <= 0 || coachAway(c) ? 'disabled' : ''}>Beim Kick zuschauen</button>
            <button class="primary" data-action="recruit" data-value="${i}" ${w.actions <= 0 || full || coachAway(c) ? 'disabled' : ''}>Ansprechen <small>(~${chance} %)</small></button>
          </div>`;
        return `<article class="rumor ${p.tier === 'legende' ? 'legend' : ''}" style="--c:${known ? tier.color : '#666'}">
          <p class="source">${r.source}</p>
          <div class="who">${badge} <b>${p.name}</b>${known && p.title ? ` <em>${p.title}</em>` : ''}
            <small>${p.age} J. · ${p.profession} · ${POSITIONS[p.position]} · ${rating}</small></div>
          ${traits}${story}${footer}
        </article>`;
      })
      .join('');
    return `
      ${coachAway(c) ? '<p class="warn">Du bist diese Woche nicht da – Gespräche mit neuen Leuten müssen warten.</p>' : ''}
      <p class="chat-head">Kader ${club.squad.length}/${maxSquad(c)} · noch ${w.actions} Aktion${w.actions === 1 ? '' : 'en'} diese Woche${full ? ' · Kader voll – erst jemanden verabschieden' : ''}</p>
      <div class="rumors">${cards}</div>`;
  }

  tab_club() {
    const c = this.career;
    const club = humanClub(c);
    const editable = kitEditable(c);
    this.draft ??= { name: club.name, short: club.short, kit: { pattern: 'uni', second: 0xf2efe6, ...club.kit } };
    const d = this.draft;
    const shirtCss = (k) => {
      const a = hex(k.shirt);
      const b = hex(k.second ?? k.shirt);
      if (k.pattern === 'streifen') return `repeating-linear-gradient(90deg, ${a} 0 8px, ${b} 8px 16px)`;
      if (k.pattern === 'ringel') return `repeating-linear-gradient(0deg, ${a} 0 8px, ${b} 8px 16px)`;
      return a;
    };
    const swatches = (part, label) => `
      <div class="swatch-row"><span>${label}</span>${KIT_COLORS.map(
        (col) => `<button class="swatch ${d.kit[part] === col ? 'on' : ''}" style="background:${hex(col)}" data-action="kitColor" data-value="${part}:${col}" ${editable ? '' : 'disabled'}></button>`,
      ).join('')}</div>`;
    const k = c.coach;
    const me = k?.idx != null ? this.p(k.idx) : null;
    const profile = k
      ? `<div class="me-card"><h4>Du – Spielertrainer</h4>
          <p><b>${coachName(c)}</b>${me ? ` · ${me.age} J. · ${me.profession} · ${POSITIONS[me.position]} · Stärke ${me.rating}` : ''}</p>
          ${k.style ? `<p>Spielertyp: ${STYLES[k.style]?.name ?? ''}</p>` : ''}
          <p>${k.family}${k.flags.kasse ? ' · machst nebenbei die Vereinskasse' : ''}${k.flags.familyAtGames ? ' · die Familie kommt sonntags mit' : ''}</p>
          ${(k.children ?? []).length ? `<ul class="plain">${k.children.map((ch) => {
            const age = childAge(c, ch);
            const where = ch.inFrauen ? 'spielt im Frauenteam' : ch.idx != null ? (c.youth.prospects.includes(ch.idx) ? 'in der A-Jugend' : humanClub(c).squad.includes(ch.idx) ? 'im Kader' : 'spielt woanders') : age >= 16 && ch.sex === 'w' ? 'wartet auf ein Frauenteam' : `kickt ab 16 mit (noch ${Math.max(0, 16 - age)} Jahre)`;
            return `<li>${ch.sex === 'w' ? 'Tochter' : 'Sohn'} ${ch.name}, ${age} J. – ${where}</li>`;
          }).join('')}</ul>` : ''}
          ${this.meBars()}
          <p class="empty">Training, Scouting und Spieltage kosten Zeit mit der Familie. Unbesetzte Posten (Co-Trainer, Wirt, Platzwart) und Zusatzämter ziehen Energie. Ist einer der beiden Werte leer, fällst du zwei Wochen aus.</p>
        </div>`
      : '';
    return `
      ${profile}
      ${this.chronicleBlock()}
      <div class="club-form">
        <div class="kit-preview">
          <div class="shirt" style="background:${shirtCss(d.kit)}"></div>
          <div class="shorts" style="background:${hex(d.kit.shorts)}"></div>
          <div class="socks"><i style="background:${hex(d.kit.socks)}"></i><i style="background:${hex(d.kit.socks)}"></i></div>
          <b>${d.short}</b>
        </div>
        <div class="fields">
          <label>Vereinsname <input data-field="name" value="${d.name}" maxlength="32" ${editable ? '' : 'disabled'}></label>
          <label>Kürzel <input data-field="short" value="${d.short}" maxlength="4" ${editable ? '' : 'disabled'}></label>
          <div class="swatch-row"><span>Muster</span>${Object.entries(KIT_PATTERNS)
            .map(([id, label]) => `<button class="${d.kit.pattern === id ? 'active' : ''}" data-action="kitPattern" data-value="${id}" ${editable ? '' : 'disabled'}>${label}</button>`)
            .join('')}</div>
          ${swatches('shirt', 'Trikot')}
          ${d.kit.pattern !== 'uni' ? swatches('second', '2. Farbe') : ''}
          ${swatches('shorts', 'Hose')}
          ${swatches('socks', 'Stutzen')}
          ${this.clubNote ? `<p class="warn">${this.clubNote}</p>` : ''}
          ${editable
            ? `<button class="primary" data-action="saveClub">Trikots bestellen <small>(neuer Satz ${KIT_COST} €, Name gratis)</small></button>`
            : '<p class="warn">Die Trikots für diese Saison sind bestellt. Änderungen wieder vor dem ersten Spieltag der nächsten Saison.</p>'}
        </div>
      </div>`;
  }

  tab_training() {
    const c = this.career;
    const w = c.week;
    if (!w || this.results) return '<p class="empty">Das nächste Open Training gibt es nach dem Wochenstart.</p>';
    const tr = w.training;
    if (!tr && trainingLocked(c))
      return `<p class="warn">${coachAway(c) ? 'Du bist diese Woche nicht da.' : 'Du hast das Training abgegeben, um durchzuschnaufen.'} Kein Open Training in dieser Woche.</p>`;
    if (!tr)
      return `
        <p>Einmal pro Woche kannst du ein <b>Open Training</b> ausrichten: Aushang beim Bäcker, ein paar Hütchen, Bälle aufpumpen.
        Es kommen sechs Leute aus der Region, die noch keinen Verein haben – meist Hobbykicker, manchmal aber ein <b>Rohdiamant</b>.</p>
        <p>Du baust <b>${MAX_STATIONS} von ${Object.keys(STATIONS).length} Stationen</b> auf. Die Messwerte musst du selbst deuten – danach darfst du zwei Leute einladen.</p>
        <button class="primary" data-action="training" ${c.cash < TRAINING_COST ? 'disabled' : ''}>Open Training ausrichten (${TRAINING_COST} €)</button>`;
    const done = trainingDone(c);
    const stationButtons = Object.entries(STATIONS)
      .map(([id, st]) => `<button data-action="station" data-value="${id}" class="${tr.stations.includes(id) ? 'active' : ''}" ${tr.stations.includes(id) || done ? 'disabled' : ''}>${st.name}</button>`)
      .join('');
    const best = {};
    for (const id of tr.stations) {
      const vals = tr.trialists.map((t) => Number(t.results[id]));
      best[id] = STATIONS[id].better === 'low' ? Math.min(...vals) : Math.max(...vals);
    }
    const rows = tr.trialists
      .map((t, i) => {
        const p = this.p(t.idx);
        const diamond = done && isRawDiamond(p);
        const cells = tr.stations.map((id) => `<td class="num ${Number(t.results[id]) === best[id] ? 'best' : ''}">${t.results[id]}</td>`).join('');
        let action = '';
        if (t.status === 'joined') action = `<span class="reply ok">„${t.reply}"</span>`;
        else if (t.status === 'declined') action = `<span class="reply no">„${t.reply}"</span>`;
        else if (done) action = `<button class="primary tiny" data-action="invite" data-value="${i}" ${tr.invites <= 0 ? 'disabled' : ''}>Einladen (~${Math.round(inviteChance(c, t) * 100)} %)</button>`;
        return `<tr>
          <td><b>${p.name}</b>${diamond ? ' <span class="diamond">Rohdiamant</span>' : ''}<small>${p.age} J. · ${p.profession} · ${POSITIONS[p.position]}</small>
            ${t.notes.length ? `<small class="note">${[...new Set(t.notes)].join(' · ')}</small>` : ''}</td>
          ${cells}<td>${action}</td></tr>`;
      })
      .join('');
    return `
      <p class="chat-head">Stationen ${tr.stations.length}/${MAX_STATIONS}${done ? ` · noch ${tr.invites} Einladung${tr.invites === 1 ? '' : 'en'}` : ' · wähle, was du sehen willst'}</p>
      <div class="stations">${stationButtons}</div>
      <table class="squad training"><thead><tr><th>Teilnehmer</th>${tr.stations.map((id) => `<th class="num">${STATIONS[id].name}<small>${STATIONS[id].unit}</small></th>`).join('')}<th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  tab_youth() {
    const c = this.career;
    const club = humanClub(c);
    const full = club.squad.length >= maxSquad(c);
    const stars = (q) => '★'.repeat(Math.max(1, Math.round(q * 5))) + '☆'.repeat(5 - Math.max(1, Math.round(q * 5)));
    const staff = Object.entries(STAFF_ROLES)
      .map(([id, r]) => `<li><b>${r.name}:</b> ${c.staff[id] ? `${c.staff[id].name} <small>– ${r.effect}</small>` : '<em>unbesetzt – vielleicht übernimmt das mal ein Ehemaliger</em>'}</li>`)
      .join('');
    const prospects = c.youth.prospects
      .map((idx) => ({ idx, p: this.p(idx) }))
      .sort((a, b) => b.p.rating - a.p.rating)
      .map(({ idx, p }) => {
        const talent = p.rating >= 50 ? 'großes Talent' : p.rating >= 40 ? 'solide' : 'noch roh';
        return `<tr><td><b>${p.name}</b><small>${p.age} J. · ${p.profession}</small></td><td>${POSITIONS[p.position]}</td>
          <td class="num">${p.rating}</td><td><em>${talent}</em></td>
          <td><button class="primary tiny" data-action="promote" data-value="${idx}" ${full ? 'disabled' : ''}>Hochziehen</button></td></tr>`;
      })
      .join('');
    const alumni = c.alumni.length
      ? c.alumni.map((a) => `<li>${a.name} – ${a.apps} Spiele, ${a.goals} Tore · ${a.role} (seit Saison ${a.season + 1})</li>`).join('')
      : '<li><em>noch niemand – der Verein ist jung</em></li>';
    return `
      <h4>Ehrenamt</h4>
      <ul class="plain staff"><li><b>Jugendtrainer:</b> ${c.youth.coach.name} <span class="stars">${stars(c.youth.coach.quality)}</span> <small>– je besser, desto mehr Talente</small></li>${staff}</ul>
      ${this.academyBlock()}
      <h4>A-Jugend (16–19)</h4>
      ${prospects
        ? `<table class="squad"><thead><tr><th>Talent</th><th>Pos.</th><th>Stärke</th><th>Einschätzung</th><th></th></tr></thead><tbody>${prospects}</tbody></table>
           <p class="empty">Talente entwickeln sich auch in der Jugend. Mit 20 wechseln sie zum Nachbarn, wenn du sie nicht hochziehst.${full ? ' Kader voll – erst Platz schaffen.' : ''}</p>`
        : '<p class="empty">Kein Talent in der A-Jugend. Der nächste Jahrgang kommt zur neuen Saison.</p>'}
      <h4>Ehemalige</h4>
      <ul class="plain">${alumni}</ul>`;
  }

  tab_cash() {
    const c = this.career;
    const club = humanClub(c);
    const offers = c.round === 0 && c.offers.length
      ? c.offers
          .map(
            (o, i) => `<article class="rumor" style="--c:#c9a227"><div class="who"><b>${o.name}</b> <em>${SLOTS[o.slot]}</em>
              <small>${o.line}</small></div>
              <p>${euro(o.weekly)} pro Spieltag · Bonus ${euro(o.bonus)} bei: ${o.goal.text}</p>
              <div class="actions"><button class="primary" data-action="sponsor" data-value="${i}">Unterschreiben</button></div></article>`,
          )
          .join('')
      : '';
    const active = c.sponsors.length
      ? c.sponsors.map((s) => `<li><b>${s.name}</b> (${SLOTS[s.slot]}) – ${euro(s.weekly)}/Spieltag, Bonus ${euro(s.bonus)} bei ${s.goal.text}</li>`).join('')
      : '<li><em>noch keine Sponsoren</em></li>';
    const sinners = Object.entries(c.fines)
      .filter(([idx]) => club.squad.includes(Number(idx)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([idx, amount]) => `<li>${this.p(Number(idx)).name} <b>${euro(amount)}</b></li>`)
      .join('');
    const ledger = c.ledger
      .slice(-12)
      .reverse()
      .map((e) => `<li><span>ST ${e.round} · ${e.text}</span><b class="${e.amount < 0 ? 'minus' : 'plus'}">${e.amount > 0 ? '+' : ''}${euro(e.amount)}</b></li>`)
      .join('');
    return `
      <div class="cash-head"><span>Mannschaftskasse</span><b class="${c.cash < 0 ? 'minus' : ''}">${euro(c.cash)}</b>
        <small>Ziel: Saisonabschlussfahrt für ${euro(TRIP_COST)}${c.spirit ? ' · Stimmung nach der letzten Fahrt: bestens (weniger Absagen)' : ''}</small></div>
      <div class="cash-grid">
        <section><h4>Sponsoren</h4><ul class="plain">${active}</ul>
          ${offers ? `<h4>Angebote für diese Saison</h4><div class="rumors">${offers}</div>` : c.round === 0 ? '' : '<p class="empty">Neue Angebote gibt es vor der nächsten Saison.</p>'}</section>
        <section><h4>Strafenkatalog</h4><ul class="plain fines">${FINES.map((f) => `<li>${f.label} <b>${euro(f.amount)}</b></li>`).join('')}</ul>
          <h4>Sünderkartei</h4><ol class="plain">${sinners || '<li><em>alle brav</em></li>'}</ol></section>
        <section><h4>Kassenbuch</h4><ul class="plain ledger">${ledger || '<li><em>noch keine Buchungen</em></li>'}</ul></section>
      </div>`;
  }

  tab_table() {
    const rows = table(this.career)
      .map(
        (r, i) => `<tr class="${r.club.human ? 'mine' : ''}"><td>${i + 1}.</td><td>${r.club.name}</td><td class="num">${r.played}</td>
          <td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td><td class="num">${r.gf}:${r.ga}</td><td class="num"><b>${r.pts}</b></td></tr>`,
      )
      .join('');
    return `<table class="league"><thead><tr><th></th><th>Verein</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>Tore</th><th>Pkt.</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  tab_fixtures() {
    const c = this.career;
    return c.fixtures
      .map(
        (round, i) => `<div class="round ${i === c.round ? 'current' : ''}"><h4>Spieltag ${i + 1}</h4>${round
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

