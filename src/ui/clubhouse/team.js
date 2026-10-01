// MANNSCHAFT: Kader (Karten), Spielerprofil, Aufstellung (Magnettafel), Taktik, Training, Jugend, Transfers.
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { tr } from '../../core/i18n.js';
import { kitPreviewURL } from '../../render/kitPaint.js';
import { STYLES as PLAY_STYLES, systemsFor } from '../../sim/tactics.js';
import { jobFits, styleFit } from '../../sim/fit.js';
import { GROUP_LABELS, ORDERS, packLines, SIMPLE, SIMPLE_IDS } from '../../sim/commands.js';
import { coachLevel } from '../prefs.js';
import { button, haptic, icon, segmented, tabs as uiTabs } from '../ds.js';
import { ATTR_LABELS } from '../PoolBrowser.js';
import { isLight, playerCard as collectorCard, trainerCard } from '../world.js';
import { planTarget } from '../../sim/plan.js';
import { jobPerk } from '../../data/jobs.js';
import { awardLabel } from '../../career/awards.js';
import { FIT_LOW, fitnessCap, fitnessOf, fitnessPct, fitnessShown } from '../../career/fitness.js';
import { SHIFT_JOBS } from '../../career/chat.js';
import { currentLineup, humanClub, nextPitch, maxSquad, MIN_SQUAD, recruit, recruitChance, setLineupSlot, table } from '../../career/career.js';
import { inviteChance, isRawDiamond, MAX_STATIONS, STATIONS, TRAINING_COST, trainingDone } from '../../career/training.js';
import { roleName, STAFF_ROLES } from '../../career/youth.js';
import { FOCUS, ownKids, poachChance, poachKid, scoutList, talentGuess, TEAMS, teamOfAge } from '../../career/academy.js';
import { chemistry, REL, relationLabel, shortName } from '../../career/relations.js';
import { coachAway, isCoach, trainingLocked } from '../../career/personal.js';
import { TRAITS } from '../../data/traits.js';
import { jobName } from '../../data/names.js';
import { tierById } from '../../data/tiers.js';
import { POSITIONS } from '../../sim/generator.js';
import { STATUS, first, formArrow } from './shared.js';

export const teamScreens = {
  // Kader als Spielerkarten. Ebene 1: Name, Position, Stärke, Sonntag. Alles Weitere im Profil.
  squadOrder() {
    const c = this.career;
    const ORDER = { gk: 0, def: 1, mid: 2, fwd: 3 };
    const list = humanClub(c).squad.map((idx) => ({ idx, p: this.p(idx) }));
    return list
      .sort((a, b) => (this.squadSort === 'pos' ? (ORDER[a.p.position] ?? 9) - (ORDER[b.p.position] ?? 9) : 0) || b.p.rating - a.p.rating)
      .map((x) => x.idx);
  },

  stepPlayer(dir) {
    const order = this.squadOrder();
    const i = order.indexOf(this.openPlayer);
    if (i < 0) return;
    this.openPlayer = order[(i + dir + order.length) % order.length];
    this.confirmRelease = null;
  },

  // Sonntag-Status als Chip: Farbe UND Text (nie nur Farbe).
  sundayChip(idx, withFit = true) {
    const c = this.career;
    const r = c.players[idx];
    if (r.injuryWeeks) return `<span class="ui-chip" style="--c:#d9534f" title="${r.injury?.label ?? tr('verletzt', 'injured')}">${r.injury ? `${r.injury.label} · ${r.injuryWeeks} ${tr('Wo.', 'wks')}` : tr('verletzt', 'injured')}</span>`;
    const st = c.week ? STATUS[c.week.availability[idx]] : null;
    const color = st && { yes: '#5cc46a', no: '#d9534f', late: '#e0b020' }[st[1]];
    return `${st ? `<span class="ui-chip" style="--c:${color}">${st[0]}</span>` : ''}${withFit ? fitChip(c, idx) : ''}`;
  },

  // Kleine Marker hinter dem Namen: Du, Auszeichnungen, Titel, Form, Launen.
  nameMarks(idx, p, r) {
    const c = this.career;
    return `${r.awards?.length ? ` <span class="award" title="${r.awards.map(awardLabel).join(' · ')}">★${r.awards.length > 1 ? r.awards.length : ''}</span>` : ''}${isCoach(c, idx) ? ` <span class="me-tag">${tr('Du', 'You')}</span>` : ''}${p.title ? ` <em>${p.title}</em>` : ''}${formArrow(r.form)}${r.absenceMul > 1.2 ? tr(' <span class="grumpy" title="hat gerade wenig Zeit – sagt öfter ab">selten da</span>', ' <span class="grumpy" title="short of time at the moment – drops out more often">rarely around</span>') : ''}${r.grumpy ? tr(' <span class="grumpy" title="angefressen – sagt öfter ab">grummelt</span>', ' <span class="grumpy" title="sulking – drops out more often">sulking</span>') : ''}`;
  },

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
  },

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
      badge: `${formArrow(r.form)}${fitBadge(c, idx)}`, // Fitness oben neben der Stärke – unten ist nur Platz für einen Chip
      art: `<span class="m-card-shirt" style="--shirt:url(${kitPreviewURL(club.kit)})"></span>`,
      sub: this.sundayChip(idx, false),
      attrs,
      extra,
      flipped: !!this.flipped[idx],
      w,
      open: open ? { action: 'playerCard', value: idx, label: tr(`Profil von ${p.name} öffnen`, `Open ${p.name}'s profile`) } : null,
    });
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
          <span class="lp-name">${p ? p.name.split(' ').at(-1) : tr('Aushilfe', 'Stand-in')}</span>${idx != null && fitnessShown(fitnessOf(c, idx)) ? `<span class="lp-fit${fitnessOf(c, idx) < FIT_LOW ? ' low' : ''}" title="${tr('Fitness', 'Fitness')}">${fitnessPct(fitnessOf(c, idx))} %</span>` : ''}
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
          <p class="t-cap">${c.week.lineup ? tr('Eigene Aufstellung', 'Your line-up') : tr('Automatisch aufgestellt (Stärke auf der Position, Form)', 'Picked automatically (strength in position, form)')} · ${PLAY_STYLES[tactic.style].label}</p>
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
  },

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
  },

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
  },

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
    // Unterreiter: eigene Jugend (A-Jugend zuerst), Talente anderer Vereine, Ehrenamt & Ehemalige.
    const sub = ['own', 'scout', 'club'].includes(this.youthTab) ? this.youthTab : 'own';
    const scouts = scoutList(c).filter((k) => k.status === 'open').length;
    const subTabs = uiTabs([['own', tr('Eigene Jugend', 'Our youth')], ['scout', tr('Andere Vereine', 'Other clubs'), scouts || null], ['club', tr('Ehrenamt & Ehemalige', 'Volunteers & alumni')]], sub, 'youthTab');
    if (sub === 'scout') return `${subTabs}${this.scoutBlock()}`;
    if (sub === 'club')
      return `${subTabs}
      <h4>${tr('Ehrenamt', 'Volunteers')}</h4>
      <ul class="plain staff"><li><b>${tr('Jugendtrainer', 'Youth coach')}:</b> ${c.youth.coach.name} <span class="stars">${stars(c.youth.coach.quality)}</span> <small>${tr('– je besser, desto mehr Talente', '– the better, the more talents')}</small></li>${staff}</ul>
      <h4>${tr('Ehemalige', 'Former players')}</h4>
      <ul class="plain">${alumni}</ul>`;
    return `${subTabs}
      <h4>${tr('A-Jugend (16–19)', 'U19s (16–19)')}</h4>
      ${prospects
        ? `<table class="squad prospects"><thead><tr><th>${tr('Talent', 'Talent')}</th><th>${tr('Pos.', 'Pos.')}</th><th>${tr('Stärke', 'Rating')}</th><th>${tr('Einschätzung', 'Assessment')}</th><th></th></tr></thead><tbody>${prospects}</tbody></table>
           <p class="empty">${tr('Talente entwickeln sich auch in der Jugend. Mit 20 wechseln sie zum Nachbarn, wenn du sie nicht hochziehst.', 'Talents develop in the youth team too. At 20 they leave for a neighbouring club if you do not promote them.')}${full ? tr(' Kader voll – erst Platz schaffen.', ' Squad full – make room first.') : ''}</p>`
        : `<p class="empty">${tr('Kein Talent in der A-Jugend. Der nächste Jahrgang kommt zur neuen Saison.', 'No talent in the U19s. The next intake arrives with the new season.')}</p>`}
      ${this.academyBlock()}`;
  },

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
      ${last ? `<p>${tr('Letzte Saison', 'Last season')}: ${last.results.map((r) => tr(`${r.team}-Jugend ${r.pos}.`, `${r.team} youth: ${r.pos}.`)).join(' · ')}</p>` : ''}`;
  },

  // Talente anderer Vereine (eigener Unterreiter der Jugend).
  scoutBlock() {
    const c = this.career;
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
    return `<h4>${tr('Talente bei anderen Vereinen', 'Talents at other clubs')}</h4>
      <p class="empty">${tr('Einmal pro Woche kannst du die Eltern eines Talents ansprechen. Kostet Kraft – und die anderen Vereine mögen das gar nicht.', 'Once a week you can approach a talent\'s parents. It costs energy – and the other clubs really don\'t like it.')}</p>
      <ul class="plain scout-kids">${scoutList(c)
        .map((k) => `<li><b>${k.name}</b> <small>${k.age}${tr(' J.', ' yrs')} · ${POSITIONS[k.position]} · ${k.club}</small> <span class="stars">${stars(talentGuess(c, k))}</span>
          ${k.status === 'open' ? `<button class="tiny" data-action="poachKid" data-value="${k.id}" ${!c.week || c.week.poached || this.results ? 'disabled' : ''}>${tr('Ansprechen', 'Approach')} (~${Math.round(poachChance(c, k) * 100)} %)</button>` : `<small class="reply ${k.status === 'joined' ? 'ok' : 'no'}">${k.reply}</small>`}</li>`)
        .join('')}</ul>`;
  },
};

// Fitness-Chip: nur, wenn jemand nicht ganz fit ist (Farbe UND Text).
function fitChip(c, idx) {
  const f = fitnessOf(c, idx);
  if (!fitnessShown(f)) return '';
  return `<span class="ui-chip" style="--c:${f < FIT_LOW ? '#d9534f' : '#e0b020'}" title="${tr('Fitness – unter 70 % steigt das Verletzungsrisiko', 'Fitness – below 70 % the injury risk goes up')}">${tr('Fitness', 'Fitness')} ${fitnessPct(f)} %</span>`;
}

// Kleine Plakette auf der Sammelkarte (Kopfzeile): Zahl + Farbe, Erklärung im Tooltip.
function fitBadge(c, idx) {
  const f = fitnessOf(c, idx);
  if (!fitnessShown(f)) return '';
  return `<span class="fit-badge${f < FIT_LOW ? ' low' : ''}" title="${tr('Fitness', 'Fitness')} ${fitnessPct(f)} %">${fitnessPct(f)} %</span>`;
}

// Was die Fitness ausmacht – in Worten.
function fitHint(c, idx, p) {
  const f = fitnessOf(c, idx);
  const cap = fitnessCap(p);
  const lines = [];
  if (f >= 0.95) lines.push(tr('Topfit.', 'Fully fit.'));
  else lines.push(tr('Startet mit weniger Puste und wird bis zum nächsten Spieltag ein Stück fitter.', 'Starts with less in the tank and gets a bit fitter by the next matchday.'));
  if (f < FIT_LOW) lines.push(tr('Unter 70 %: höheres Verletzungsrisiko – vielleicht lieber schonen.', 'Below 70 %: higher injury risk – maybe give him a rest.'));
  if (cap < 0.98) lines.push(tr(`Mit ${p.age} sind mehr als ${Math.round(cap * 100)} % nicht mehr drin.`, `At ${p.age}, more than ${Math.round(cap * 100)} % is out of reach.`));
  if (SHIFT_JOBS.includes(p.profession)) lines.push(tr('Schichtarbeit: In manchen Wochen kommt er müde aus der Nachtschicht.', 'Shift work: some weeks he comes in tired from the night shift.'));
  return lines.join(' ');
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
    <div><h4>${tr('Fitness', 'Fitness')} ${fitnessPct(fitnessOf(c, idx))} %</h4><p class="hint">${fitHint(c, idx, p)}</p></div>
    <div><h4>${tr('Verlauf', 'History')}</h4><table class="mini"><thead><tr><th></th><th>${tr('Stärke', 'Rating')}</th><th>${tr('Sp.', 'Apps')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Vorl.', 'Ast.')}</th><th>Ø</th></tr></thead><tbody>${rows}</tbody></table><p class="hint">${total}</p></div>
    ${awards ? `<div><h4>${tr('Auszeichnungen', 'Awards')}</h4><ul class="awards">${awards}</ul></div>` : ''}
    ${jobPerk(p.profession) ? `<div><h4>${tr('Beruf', 'Job')}: ${jobName(p.profession)}</h4><p class="hint">${jobPerk(p.profession).label}</p></div>` : ''}
  </div>`;
}
