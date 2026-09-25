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
  poolPlayer,
  resetLineup,
  setLineupSlot,
  seasonOver,
  table,
} from '../career/career.js';
import { TRAITS } from '../data/traits.js';
import { tierById } from '../data/tiers.js';
import { POSITIONS } from '../sim/generator.js';
import { PITCHES } from '../sim/pitch.js';

const STATUS = { yes: ['Zusage', 'yes'], no: ['Absage', 'no'], late: ['Kommt später', 'late'] };
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const first = (name) => name.split(' ')[0];

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
      else if (action === 'kitColor') {
        const [part, color] = value.split(':');
        this.draft.kit[part] = Number(color);
      } else if (action === 'kitPattern') this.draft.kit.pattern = value;
      else if (action === 'saveClub') {
        updateClub(this.career, this.draft);
        this.draft = null;
        this.h.onChange();
      } else if (action === 'scout') {
        scoutRumor(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'recruit') {
        recruit(this.career, Number(value));
        this.h.onChange();
      } else if (action === 'release') {
        const p = poolPlayer(Number(value));
        if (!confirm(`${p.name} wirklich verabschieden?`)) return;
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

  bindLineup() {
    this.root.querySelectorAll('select[data-slot]').forEach((sel) =>
      sel.addEventListener('change', () => {
        setLineupSlot(this.career, Number(sel.dataset.slot), Number(sel.value));
        this.h.onChange();
        this.render();
      }),
    );
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
      ['squad', 'Kader'],
      ['lineup', 'Aufstellung'],
      ['transfers', 'Transfers'],
      ['table', 'Tabelle'],
      ['club', 'Verein'],
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
    this.bindClubForm();
  }

  nextMatch() {
    const c = this.career;
    const f = humanFixture(c);
    const club = humanClub(c);
    const home = f.home === club.id;
    const opp = clubById(c, home ? f.away : f.home);
    const venue = PITCHES[clubById(c, f.home).venue];
    const avail = Object.values(c.week.availability);
    const count = (s) => avail.filter((a) => a === s).length;
    return `
      <div class="fixture-card">
        <p class="label">Sonntag, 10:30 Uhr</p>
        <h3>${home ? club.short : opp.short} – ${home ? opp.short : club.short}</h3>
        <p>${home ? 'Heimspiel' : 'Auswärts'} gegen <b>${opp.name}</b></p>
        <p class="venue-line">${venue.name} · ${venue.surface.name} · ${venue.format} gegen ${venue.format}</p>
        <p class="avail">${count('yes')} Zusagen · ${count('late')} später · ${count('no')} Absagen</p>
        ${count('yes') < venue.format ? '<p class="warn">Zu wenige Zusagen – es hilft jemand aus dem Bekanntenkreis aus.</p>' : ''}
        ${this.busy ? `<p class="busy">${this.busy}</p>` : `
        <button class="primary" data-action="onPlay">Selbst spielen</button>
        <button data-action="onSimulate">Simulieren</button>`}
      </div>`;
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
        <button class="primary" data-action="onNewSeason">Nächste Saison</button>
      </div>`;
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
        const p = poolPlayer(msg.from);
        const status = STATUS[w.availability[msg.from]];
        return `<div class="bubble"><b>${p.name}</b>${msg.text}<time>${msg.time}</time>${status ? `<i class="st ${status[1]}"></i>` : ''}</div>`;
      })
      .join('');
    const declined = club.squad.filter((idx) => w.availability[idx] === 'no' && !w.nudged.includes(idx) && !c.players[idx].injuryWeeks);
    return `
      <div class="chat-head">„Wer kann Sonntag?" · ${club.squad.length} Mitglieder</div>
      <div class="chat">${bubbles}</div>
      <div class="nudge">
        <span>Nachhaken (${w.nudges} übrig):</span>
        ${declined.length && w.nudges > 0 && !this.results
          ? declined.map((idx) => `<button data-action="nudge" data-value="${idx}">${first(poolPlayer(idx).name)}</button>`).join('')
          : '<em>niemand</em>'}
      </div>`;
  }

  tab_squad() {
    const c = this.career;
    const club = humanClub(c);
    const canRelease = club.squad.length > MIN_SQUAD && !this.results;
    const rows = club.squad
      .map((idx) => ({ idx, p: poolPlayer(idx), r: c.players[idx] }))
      .sort((a, b) => b.p.rating - a.p.rating)
      .map(({ idx, p, r }) => {
        const tier = tierById(p.tier);
        const st = c.week ? STATUS[c.week.availability[idx]] : null;
        const avg = r.graded ? (r.gradeSum / r.graded).toFixed(1).replace('.', ',') : '–';
        return `<tr style="--c:${tier.color}">
          <td><span class="badge">${tier.name}</span></td>
          <td><b>${p.name}</b>${p.title ? ` <em>${p.title}</em>` : ''}<small>${p.age} J. · ${p.profession}</small></td>
          <td>${POSITIONS[p.position]}</td><td class="num">${p.rating}</td>
          <td>${r.injuryWeeks ? '<span class="st-text no">verletzt</span>' : st ? `<span class="st-text ${st[1]}">${st[0]}</span>` : ''}</td>
          <td class="num">${r.apps}</td><td class="num">${r.goals}</td><td class="num">${r.assists}</td><td class="num">${avg}</td>
          <td>${canRelease ? `<button class="tiny" data-action="release" data-value="${idx}" title="Verabschieden">×</button>` : ''}</td>
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
      .map((idx) => ({ idx, p: poolPlayer(idx) }))
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
    const keeper = lineup[gkIdx] != null ? poolPlayer(lineup[gkIdx]) : null;
    const keeperNote = keeper && keeper.position !== 'gk' ? `<p class="warn">Kein Torwart da – ${keeper.name.split(' ')[0]} muss ran. Handschuhe liegen im Kofferraum.</p>` : '';
    const benchList = bench.length
      ? bench.map((idx) => `<li>${poolPlayer(idx).name}${c.week.availability[idx] === 'late' ? ' <em>(kommt zur 2. HZ)</em>' : ''}</li>`).join('')
      : '<li><em>niemand</em></li>';
    return `
      <p class="chat-head">${formation.length} gegen ${formation.length} · ${c.week.lineup ? 'eigene Aufstellung' : 'automatisch aufgestellt'}</p>
      <div class="lineup">${slots}</div>
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
        const p = poolPlayer(r.idx);
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
            <button data-action="scout" data-value="${i}" ${known || w.actions <= 0 ? 'disabled' : ''}>Beim Kick zuschauen</button>
            <button class="primary" data-action="recruit" data-value="${i}" ${w.actions <= 0 || full ? 'disabled' : ''}>Ansprechen <small>(~${chance} %)</small></button>
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
    return `
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
          ${editable
            ? '<button class="primary" data-action="saveClub">Trikots bestellen</button>'
            : '<p class="warn">Die Trikots für diese Saison sind bestellt. Änderungen wieder vor dem ersten Spieltag der nächsten Saison.</p>'}
        </div>
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

