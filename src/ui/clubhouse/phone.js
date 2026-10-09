// HANDY: Gruppenchat im Handy des Trainers (Sperrbildschirm, Chat, Entscheidung, Nachhaken).
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { tr } from '../../core/i18n.js';
import { effectChips } from '../../career/consequences.js';
import { button, haptic, icon } from '../ds.js';
import { lockScreen, phone } from '../world.js';
import { crestExtras, crestOf, crestSVG } from '../crest.js';
import { humanClub, nudge } from '../../career/career.js';
import { roleName } from '../../career/youth.js';
import { eventView, storyTag } from '../../career/events.js';
import { isCoach } from '../../career/personal.js';
import { isBanned } from '../../career/suspensions.js';
import { STATUS, first, timeLabel } from './shared.js';

export const phoneScreens = {
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
    const declined = club.squad.filter((idx) => w.availability[idx] === 'no' && !w.nudged.includes(idx) && !c.players[idx].injuryWeeks && !isBanned(c, idx)).filter((idx) => !isCoach(c, idx));
    const ev = w.event;
    const view = ev ? eventView(c, ev) : null;
    // Nach der Entscheidung: Karte erst offen (Ergebnis lesen), dann als schmale Leiste oder ganz weg –
    // sonst belegt sie auf dem Handy die halbe Anzeige. Zustand je Woche: open | mini | hidden.
    const weekId = `${c.season}:${c.round}`;
    if (this.eventFold?.week !== weekId) this.eventFold = { week: weekId, state: ev?.choice != null ? 'mini' : 'open' };
    const fold = ev && ev.choice !== null ? this.eventFold.state : 'open';
    const label = ev ? (ev.story === 'Vereinsleben' ? storyTag(ev.story) : ev.story ? `${tr('Geschichte', 'Story')} · ${storyTag(ev.story)}` : tr('Diese Woche im Verein', 'This week at the club')) : '';
    const foldBtns = `<span class="ev-fold">${button('–', { kind: 'ghost icon', action: 'eventFold', value: 'mini', 'aria-label': tr('Minimieren', 'Minimise'), title: tr('Minimieren', 'Minimise') })}${button('×', { kind: 'ghost icon', action: 'eventFold', value: 'hidden', 'aria-label': tr('Ausblenden', 'Hide'), title: tr('Ausblenden', 'Hide') })}</span>`;
    const eventCard = !ev || fold === 'hidden'
      ? ''
      : fold === 'mini'
        ? `<div class="event-card mini"><button class="ev-bar" data-action="eventFold" data-value="open" aria-expanded="false"><span class="label">${label}</span><span>➜ ${view.options[ev.choice] ?? ''}</span></button>${button('×', { kind: 'ghost icon', action: 'eventFold', value: 'hidden', 'aria-label': tr('Ausblenden', 'Hide'), title: tr('Ausblenden', 'Hide') })}</div>`
        : `<div class="event-card">
          <p class="label">${label}${ev.choice !== null ? foldBtns : ''}</p>
          <p>${view.text}</p>
          ${ev.choice !== null
            ? `<p class="reply ok">➜ ${view.options[ev.choice] ?? ''}: ${ev.result ?? ''}</p>${effectChips(ev.effects)}`
            : this.results
              ? ''
              : `<div class="actions">${view.options.map((o, i) => `<button ${i === 0 ? 'class="primary"' : ''} data-action="event" data-value="${i}">${o}</button>`).join('')}</div>`}
        </div>`;
    const pinChip = ev && ev.choice !== null && fold === 'hidden' ? button('📌', { kind: 'ghost icon', action: 'eventFold', value: 'mini', 'aria-label': tr('Entscheidung wieder anzeigen', 'Show the decision again'), title: tr('Entscheidung wieder anzeigen', 'Show the decision again') }) : '';
    // UI 3.0 Phase 6: Die Gruppe steckt im Handy (in der Hand des Trainers). Beim ersten Blick
    // in einer Woche zeigt es den Sperrbildschirm mit den neuesten Nachrichten – danach direkt den Chat.
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
          <span class="wa-crest">${crestSVG(crestOf(club), { size: 26, short: club.short, year: crestExtras(c).year, label: club.name })}</span>
          <div><b>${groupName}</b><small>${club.squad.length} ${tr('Mitglieder', 'members')}</small></div>${pinChip}</div>
        ${eventCard ? `<div class="wa-pinned${fold === 'mini' ? ' mini' : ''}">${eventCard}</div>` : ''}<div class="wa-body"><div class="chat">${bubbles}</div></div>
        <div class="wa-reply"><span>${tr('Nachhaken', 'Chase up')} (${w.nudges} ${tr('übrig', 'left')}):</span>${replies}</div>`;
    }
    const buzz = this.phoneView === 'lock' && this.phoneBuzz;
    this.phoneBuzz = false;
    if (buzz) haptic('message');
    return `<div class="phone-stage${this.phoneView === 'app' ? ' open' : ''}">${phone(screen, { skin, lit: this.phoneView === 'lock' && (pending || ordered.length > 0), buzz, rise: this.phoneView === 'lock', label: groupName })}</div>`;
  },
};
