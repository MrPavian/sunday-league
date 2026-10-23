// TRANSFERS (Reiter in „Mannschaft“): vier Unterbereiche statt einer langen Seite –
// Gerüchteküche (wie bisher), Spielersuche (Spieler fremder Vereine holen), Eigene Spieler (Liste, Angebote, Leihe)
// und Fristen & Meldungen. Logik in career/transfers.js, Regeln und Quellen in career/transferrules.js.
// Methoden des Vereinsheims (this = Clubhouse), eingemischt wie die anderen Bildschirme.
import { tr } from '../../core/i18n.js';
import { button, chip, segmented, tabs as uiTabs } from '../ds.js';
import { ARG_IDS, ARGUMENTS, knownMotives, MOTIVES } from '../../career/recruiting.js';
import { humanClub, maxSquad, MIN_SQUAD } from '../../career/career.js';
import { coachAway, isCoach } from '../../career/personal.js';
import { importanceLabel, trainingFee, windowLabel, FEE_BASE } from '../../career/transferrules.js';
import {
  acceptOffer, anyClub, approachFree, argueDeal, askAroundDeal, askClub, clubRating, counterOffer, declineOffer, EXTRA_STEPS, HANDGELD_STEPS, listPlayer, loanIn, loanOut,
  freeAgents, loansIn, loansOut, marketList, MAX_REQUESTS, playerChance, priceOf, setHandgeld, talkDeal, tstate, windowInfo,
} from '../../career/transfers.js';
import { banGames } from '../../career/suspensions.js';
import { TRAITS } from '../../data/traits.js';
import { jobName } from '../../data/names.js';
import { tierById } from '../../data/tiers.js';
import { POSITIONS } from '../../sim/generator.js';

const SUBS = ['rumors', 'market', 'own', 'news'];
const POS_ABBR = () => ({ all: tr('Alle', 'All'), gk: tr('TW', 'GK'), def: tr('ABW', 'DEF'), mid: tr('MF', 'MID'), fwd: tr('ST', 'FWD') });
const MAX_ROWS = 40;
// Kurz gehalten: vier Felder müssen auch auf dem kleinsten Bildschirm in eine Zeile passen (e2e ui, Größe tiny).
const SCOPES = () => [['all', tr('Alle', 'All')], ['own', tr('Liga', 'League')], ['neighbor', tr('Nachbar', 'Nearby')], ['free', tr('Vereinslos', 'Free')]];
const euro = (n) => `${n.toLocaleString('de-DE')} €`;

// Rückmeldungen der Aktionen (Codes aus career/transfers.js).
const MSG = () => ({
  window: tr('Die Wechselfrist ist zu – erst wieder in der nächsten Periode.', 'The transfer period is closed – wait for the next one.'),
  busy: tr('Dazu läuft schon etwas.', 'Something is already under way.'),
  limit: tr('Keine Anfragen mehr in dieser Periode.', 'No more requests this period.'),
  gone: tr('Der Spieler ist nicht mehr dort.', 'The player is no longer there.'),
  full: tr('Kader voll – erst jemanden verabschieden.', 'Squad full – release someone first.'),
  cash: tr('Dafür reicht die Kasse nicht.', 'Not enough in the kitty.'),
  squad: tr('Dann wären wir zu wenige im Kader.', 'We would be left with too few players.'),
  nein: tr('Der Verein will ihn nicht verleihen.', 'The club will not lend him.'),
  ok: '',
});

const tierBadge = (p) => {
  const t = tierById(p.tier);
  return `<span class="badge" style="--c:${t.color}">${t.name}</span>`;
};

export const transferScreens = {
  tab_transfers() {
    const c = this.career;
    const tf = (this.tf ??= { sub: 'rumors', pos: 'all', scope: 'all', sort: 'rating', open: null, note: '' });
    if (!SUBS.includes(tf.sub)) tf.sub = 'rumors';
    const off = !c.week || this.results;
    if (off) return `<p class="empty">${tr('Die Gerüchteküche und der Transfermarkt melden sich nach dem Wochenstart.', 'The rumour mill and the transfer market start up once the week begins.')}</p>`;
    const t = tstate(c);
    const info = windowInfo(c);
    const offers = t.offers.length;
    const subTabs = uiTabs([['rumors', tr('Gerüchte', 'Rumours')], ['market', tr('Suche', 'Search')], ['own', tr('Eigene', 'Ours'), offers || null], ['news', tr('Presse', 'Press')]], tf.sub, 'tfSub');
    const banner = `<p class="tf-banner ${info.open ? 'open' : 'closed'}" data-testid="tf-banner"><b>${info.open ? tr(`Wechselperiode offen: ${windowLabel(info.kind)}`, `Transfer period open: ${windowLabel(info.kind)}`) : tr('Wechselfrist geschlossen', 'Transfer period closed')}</b> · ${
      info.open
        ? tr(`noch ${info.left} von ${MAX_REQUESTS} Anfragen, ${c.week.actions} Aktion${c.week.actions === 1 ? '' : 'en'}`, `${info.left} of ${MAX_REQUESTS} requests left, ${c.week.actions} action${c.week.actions === 1 ? '' : 's'}`)
        : tr(`nächste Periode: ${windowLabel(info.next.kind)} in ${info.next.weeks} Woche${info.next.weeks === 1 ? '' : 'n'}`, `next period: ${windowLabel(info.next.kind)} in ${info.next.weeks} week${info.next.weeks === 1 ? '' : 's'}`)
    }</p>`;
    const note = tf.note ? `<p class="tf-note" role="status" data-testid="tf-note">${tf.note}</p>` : '';
    const body = tf.sub === 'market' ? this.tfMarket(info) : tf.sub === 'own' ? this.tfOwn(info) : tf.sub === 'news' ? this.tfNews(info) : this.rumorBoard();
    return `<div class="tf" data-testid="tf">${subTabs}${tf.sub === 'rumors' ? '' : banner}${note}${body}</div>`;
  },

  // --- Spielersuche ----------------------------------------------------------------------------------------------
  tfMarket(info) {
    const c = this.career;
    const tf = this.tf;
    if (tf.open != null) return this.tfDetail(tf.open, info);
    const pos = POS_ABBR();
    if (tf.scope === 'free') return this.tfFree(pos);
    const rows = marketList(c, { scope: tf.scope, pos: tf.pos, sort: tf.sort });
    const shown = rows.slice(0, MAX_ROWS);
    const filters = `<div class="tf-filters">
      ${segmented('pos', Object.entries(pos), tf.pos, { action: 'tfFilter' })}
      ${segmented('scope', SCOPES(), tf.scope, { action: 'tfFilter' })}
      ${segmented('sort', [['rating', tr('Stärke', 'Rating')], ['age', tr('Alter', 'Age')], ['club', tr('Verein', 'Club')]], tf.sort, { action: 'tfFilter' })}
    </div>`;
    const list = shown
      .map((r) => {
        const d = r.deal;
        const state = d?.status === 'joined' ? chip(tr('im Kader', 'signed'), { plain: true }) : d?.decision === 'ja' ? chip(tr('Freigabe', 'released'), { plain: true }) : d?.decision === 'nein' ? chip(tr('verweigert', 'refused'), { plain: true }) : r.loan ? chip(tr('Leihe', 'loan'), { plain: true }) : '';
        return `<li><button class="tf-row" data-action="tfOpen" data-value="${r.idx}" data-testid="tf-row">
          <span class="tf-name"><b>${r.p.name}</b> ${state}</span>
          <span class="tf-meta">${POSITIONS[r.p.position]} · ${r.p.age}${tr(' J.', ' yrs')} · ${r.clubName}${r.neighbor ? ` (${tr('Nachbarliga', 'neighbouring')})` : ''}${r.clubId === c.flags?.derbyRival ? ` · ${tr('Derby', 'derby')}` : ''}</span>
          <span class="tf-num" title="${tr('Stärke', 'Rating')}">${r.p.rating}</span>
          <span class="tf-imp">${importanceLabel(r.importance)}</span></button></li>`;
      })
      .join('');
    return `${filters}
      <p class="chat-head">${tr(`${rows.length} Spieler gefunden${rows.length > MAX_ROWS ? `, die ersten ${MAX_ROWS} angezeigt – Filter nutzen` : ''}`, `${rows.length} players found${rows.length > MAX_ROWS ? `, first ${MAX_ROWS} shown – use the filters` : ''}`)}</p>
      <ul class="tf-list" data-testid="tf-list">${list || `<li class="empty">${tr('Niemand passt zum Filter.', 'Nobody matches the filter.')}</li>`}</ul>`;
  },

  // Vereinslose: ohne Freigabe und Frist; Ansprechen setzt ihn auf die Gerüchteküche (Stärke wie dort nur als Spanne).
  tfFree(pos) {
    const c = this.career;
    const tf = this.tf;
    const rumors = c.week.rumors ?? [];
    let ids = freeAgents(c).filter((i) => tf.pos === 'all' || this.p(i).position === tf.pos);
    if (tf.sort === 'age') ids = ids.sort((a, b) => this.p(a).age - this.p(b).age);
    const full = humanClub(c).squad.length >= maxSquad(c);
    const filters = `<div class="tf-filters">
      ${segmented('pos', Object.entries(pos), tf.pos, { action: 'tfFilter' })}
      ${segmented('scope', SCOPES(), tf.scope, { action: 'tfFilter' })}
      ${segmented('sort', [['rating', tr('Stärke', 'Rating')], ['age', tr('Alter', 'Age')]], tf.sort === 'age' ? 'age' : 'rating', { action: 'tfFilter' })}
    </div>`;
    const list = ids
      .map((i) => {
        const p = this.p(i);
        const on = rumors.some((r) => r.idx === i);
        return `<li class="tf-own" data-testid="tf-free"><span class="tf-name">${tierBadge(p)} <b>${p.name}</b> <small>${POSITIONS[p.position]} · ${p.age}${tr(' J.', ' yrs')} · ${jobName(p.profession)}</small></span>
          <span class="tf-btns">${on ? chip(tr('auf der Gerüchteküche', 'on the rumour board'), { plain: true }) : button(tr('Ansprechen', 'Approach'), { action: 'tfFree', value: i, disabled: full, 'data-testid': 'tf-free-btn' })}</span></li>`;
      })
      .join('');
    return `${filters}
      <p class="chat-head">${tr('Vereinslose Spieler, von denen man diese Woche hört – sie brauchen keine Freigabe und dürfen jederzeit wechseln.', 'Players without a club you hear about this week – they need no release and can join at any time.')}</p>
      ${full ? `<p class="warn">${MSG().full}</p>` : ''}
      <ul class="tf-list" data-testid="tf-free-list">${list || `<li class="empty">${tr('Niemand passt zum Filter.', 'Nobody matches the filter.')}</li>`}</ul>`;
  },

  tfDetail(idx, info) {
    const c = this.career;
    const t = tstate(c);
    const p = this.p(idx);
    const row = marketList(c).find((r) => r.idx === idx);
    const back = button(tr('‹ Zur Liste', '‹ Back to list'), { kind: 'ghost', action: 'tfClose', 'data-testid': 'tf-back' });
    if (!row) return `${back}<p class="empty">${MSG().gone}</p>`;
    const club = row.club;
    const d = t.deals[idx];
    const me = humanClub(c);
    const full = me.squad.length >= maxSquad(c);
    const away = coachAway(c);
    const price = priceOf(c, idx, info.kind ?? 'summer');
    const winter = info.kind === 'winter';
    const tier = tierById(p.tier);
    const traits = p.traits.length ? `<p class="traits">${p.traits.map((x) => `<i title="${TRAITS[x].desc}">${TRAITS[x].name}</i>`).join('')}</p>` : '';
    const head = `<div class="tf-card">
      <p class="who">${tierBadge(p)} <b>${p.name}</b>${p.title ? ` <em>${p.title}</em>` : ''}</p>
      <p class="t-2">${POSITIONS[p.position]} · ${p.age}${tr(' J.', ' yrs')} · ${jobName(p.profession)} · ${tr('Stärke', 'Rating')} <b>${p.rating}</b></p>
      <p class="t-2">${club.name} (${row.neighbor ? tr('Nachbarliga', 'neighbouring league') : tr('deine Liga', 'your league')}) · ${tr('Vereinsstärke', 'club strength')} ${Math.round(clubRating(c, club))} · ${importanceLabel(row.importance)}${row.clubId === c.flags?.derbyRival ? ` · <b>${tr('Derby-Rivale', 'derby rival')}</b>` : ''}</p>
      ${traits}${p.backstory ? `<p class="story">${p.backstory}</p>` : ''}</div>`;
    // Schritt 1: Verein
    let step1;
    if (d) {
      step1 =
        d.decision === 'ja'
          ? `<p class="reply ok">${tr(`${club.name} gibt ihn frei.`, `${club.name} agree to release him.`)} ${d.fee + d.extra ? tr(`Ausbildungsentschädigung ${euro(d.fee + d.extra)} (wird bei der Zusage fällig).`, `Training compensation ${euro(d.fee + d.extra)} (due when he signs).`) : tr('Keine Entschädigung fällig.', 'No compensation due.')}</p>`
          : `<p class="reply no">${tr(`${club.name} verweigert die Freigabe.`, `${club.name} refuse to release him.`)} ${tr(`Du kannst ihn trotzdem ansprechen: Meldet er sich ohne Freigabe ab, darf er ${info.wait} Spieltage nicht spielen (Wartefrist, sechs Monate). Dein Verhältnis zum Verein leidet.`, `You can still approach him: if he deregisters without a release he cannot play for ${info.wait} match days (waiting period, six months). Your relationship with the club suffers.`)}</p>`;
    } else if (!info.open) step1 = `<p class="hint">${tr('Anfragen sind nur in der Wechselperiode möglich.', 'Requests are only possible during a transfer period.')}</p>`;
    else {
      const extraSeg = winter
        ? `<p class="hint">${tr('Winter: Der Betrag ist frei verhandelbar. Zusätzliches Geld an den Verein erhöht die Chance auf die Freigabe.', 'Winter: the amount is negotiable. Extra money for the club improves the chance of a release.')}</p>${segmented('extra', EXTRA_STEPS.map((v) => [v, v ? `+${v} €` : tr('nichts extra', 'nothing extra')]), this.tf.extra ?? 0, { action: 'tfFilter' })}`
        : `<p class="hint">${tr('Sommer: Die Ausbildungsentschädigung ist festgeschrieben.', 'Summer: the training compensation is fixed.')}</p>`;
      step1 = `<p class="t-2">${price ? tr(`Ausbildungsentschädigung: ${euro(price)}${winter ? ' (Verhandlungsbasis)' : ''}`, `Training compensation: ${euro(price)}${winter ? ' (starting point)' : ''}`) : tr('Keine Ausbildungsentschädigung (Freizeitliga).', 'No training compensation (casual league).')}</p>${extraSeg}
        <div class="actions">${button(tr('Beim Verein anfragen', 'Ask the club'), { kind: 'primary', action: 'tfAsk', value: idx, disabled: full || info.left <= 0 || me.squad.length >= maxSquad(c), 'data-testid': 'tf-ask' })}</div>
        ${full ? `<p class="warn">${MSG().full}</p>` : ''}`;
    }
    // Schritt 2: Spieler
    let step2 = '';
    if (d) {
      const motives = knownMotives(d, p);
      const motiveLine = `<p class="motives">${tr('Ihm wichtig', 'Matters to him')}: ${[0, 1].map((k) => (motives[k] ? `<b>${MOTIVES[motives[k]].label}</b>` : '<span class="unknown">?</span>')).join(' · ')}</p>`;
      const offA = c.week.actions <= 0 || away;
      if (d.status === 'joined') step2 = `<p class="reply ok" data-testid="tf-joined">${tr(`„${d.reply}" – ist jetzt im Kader!`, `"${d.reply}" – now in the squad!`)}</p>`;
      else if (d.status === 'declined') step2 = `<p class="reply no">${tr(`„${d.reply}"`, `"${d.reply}"`)}</p>`;
      else if (d.talk)
        step2 = `${motiveLine}<p class="hint">${tr(`Gespräch läuft – wähle ${2 - d.talk.args.length} Argument${d.talk.args.length ? '' : 'e'}:`, `Talk in progress – pick ${2 - d.talk.args.length} argument${d.talk.args.length ? '' : 's'}:`)}</p>
          <div class="actions args">${ARG_IDS.map((a) => `<button data-action="tfArgue" data-value="${idx}:${a}" title="${ARGUMENTS[a].hint}" aria-pressed="${d.talk.args.includes(a)}" ${d.talk.args.includes(a) ? 'disabled' : ''}>${ARGUMENTS[a].label}</button>`).join('')}</div>`;
      else
        step2 = `${motiveLine}
          <p class="hint">${tr('Handgeld (einmalig, bleibt unter der Amateurgrenze von 250 € im Monat):', 'Signing-on money (one-off, stays below the amateur limit of €250 a month):')}</p>
          ${segmented('handgeld', HANDGELD_STEPS.map((v) => [v, v ? `${v} €` : tr('keins', 'none')]), d.handgeld, { action: 'tfFilter' })}
          <div class="actions">
            ${button(tr('Rumfragen', 'Ask around'), { action: 'tfAskAround', value: idx, disabled: (d.known?.length ?? 0) >= 2 || offA })}
            ${button(`${tr('Mit ihm reden', 'Talk to him')} <small>(${tr('Grundchance', 'base')} ~${Math.round(playerChance(c, d) * 100)} %)</small>`, { kind: 'primary', action: 'tfTalk', value: idx, disabled: offA || full, 'data-testid': 'tf-talk' })}
          </div>`;
    }
    const loan = !d && info.open && !row.loan ? `<div class="tf-loan"><p class="t-2">${tr(`Oder für eine Saison ausleihen: ohne Ausbildungsentschädigung, 50 € Aufwandsersatz, danach geht er zurück (${loansIn(c).length}/2 Leihen).`, `Or borrow him for one season: no training compensation, €50 expenses, then he goes back (${loansIn(c).length}/2 loans).`)}</p>${button(tr('Ausleihen', 'Borrow'), { action: 'tfLoanIn', value: idx, disabled: full || loansIn(c).length >= 2, 'data-testid': 'tf-loan' })}</div>` : '';
    return `${back}${head}
      <h4>${tr('1 · Verein', '1 · The club')}</h4><div class="tf-step">${step1}</div>
      ${d ? `<h4>${tr('2 · Spieler', '2 · The player')}</h4><div class="tf-step">${step2}</div>` : ''}
      ${loan}`;
  },

  // --- Eigene Spieler ----------------------------------------------------------------------------------------------
  tfOwn(info) {
    const c = this.career;
    const t = tstate(c);
    const me = humanClub(c);
    const offerCards = t.offers
      .map((o) => {
        const club = anyClub(c, o.club);
        const p = this.p(o.idx);
        if (!club) return '';
        return `<article class="tf-card" data-testid="tf-offer"><p><b>${club.name}</b> ${tr('möchte', 'want')} <b>${p.name}</b> (${tr('Stärke', 'rating')} ${p.rating}${o.wish ? `, ${tr('will wohl weg', 'seems to want out')}` : ''})</p>
          <p class="t-2">${o.fee ? tr(`Ausbildungsentschädigung für uns: ${euro(o.fee)}${o.kind === 'winter' ? ' (verhandelbar)' : ''}`, `Training compensation for us: ${euro(o.fee)}${o.kind === 'winter' ? ' (negotiable)' : ''}`) : tr('Keine Entschädigung (Freizeitliga).', 'No compensation (casual league).')}</p>
          <div class="actions">${button(tr('Freigabe erteilen', 'Grant release'), { kind: 'primary', action: 'tfAccept', value: o.id, disabled: me.squad.length <= MIN_SQUAD, 'data-testid': 'tf-accept' })}${button(tr('Freigabe verweigern', 'Refuse release'), { action: 'tfDecline', value: o.id })}${o.kind === 'winter' && !o.counter && o.base > 0 ? button(tr('Mehr verlangen (+50 %)', 'Ask for more (+50%)'), { action: 'tfCounter', value: o.id }) : ''}</div>
          ${o.wish ? `<p class="hint">${tr('Wer weg will und festgehalten wird, ist sauer.', 'Someone who wants out and is held back will sulk.')}</p>` : ''}</article>`;
      })
      .join('');
    const pending = (t.pending ?? []).filter((x) => me.squad.includes(x.idx)).map((x) => `<li>${tr(`${this.p(x.idx).name} hat ${anyClub(c, x.club)?.name ?? '?'} zugesagt – das Angebot kommt zur nächsten Wechselperiode.`, `${this.p(x.idx).name} has said yes to ${anyClub(c, x.club)?.name ?? '?'} – the offer arrives with the next transfer period.`)}</li>`).join('');
    const rows = me.squad
      .filter((i) => !isCoach(c, i))
      .sort((a, b) => this.p(b).rating - this.p(a).rating)
      .map((i) => {
        const p = this.p(i);
        const listed = t.listed.includes(i);
        const wait = banGames(c, i) > 0 && c.players[i]?.ban?.reason === 'wartefrist';
        return `<li class="tf-own"><span class="tf-name"><b>${p.name}</b> <small>${POSITIONS[p.position]} · ${p.age}${tr(' J.', ' yrs')} · ${tr('Stärke', 'rating')} ${p.rating}${wait ? ` · ${tr('Wartefrist', 'waiting period')}` : ''}${c.players[i]?.loan ? ` · ${tr('Leihspieler', 'on loan')}` : ''}</small></span>
          <span class="tf-btns">${button(listed ? tr('Von der Liste', 'Remove from list') : tr('Auf die Liste', 'Put on list'), { action: 'tfList', value: i, 'aria-pressed': String(listed), 'data-testid': 'tf-list-btn' })}${info.open && !c.players[i]?.loan ? button(tr('Verleihen', 'Lend out'), { action: 'tfLoanOut', value: i, disabled: me.squad.length <= MIN_SQUAD }) : ''}</span></li>`;
      })
      .join('');
    const lo = [...loansIn(c).map((l) => ({ ...l, text: tr(`${this.p(l.idx).name} von ${anyClub(c, l.from)?.name ?? '?'}`, `${this.p(l.idx).name} from ${anyClub(c, l.from)?.name ?? '?'}`) })), ...loansOut(c).map((l) => ({ ...l, text: tr(`${this.p(l.idx).name} bei ${anyClub(c, l.to)?.name ?? '?'}`, `${this.p(l.idx).name} at ${anyClub(c, l.to)?.name ?? '?'}`) }))];
    return `<h4>${tr('Angebote anderer Vereine', 'Offers from other clubs')}</h4>
      ${offerCards || `<p class="empty">${info.open ? tr('Gerade liegt kein Angebot vor.', 'No offer at the moment.') : tr('Angebote kommen, wenn die Wechselperiode beginnt – wer auf der Liste steht, wird angefragt.', 'Offers arrive when the transfer period starts – players on the list get enquiries.')}</p>`}
      ${pending ? `<h4>${tr('Vorgemerkte Wechsel', 'Pending moves')}</h4><ul class="plain" data-testid="tf-pending">${pending}</ul>` : ''}
      <h4>${tr('Kader – Transferliste und Leihe', 'Squad – transfer list and loans')}</h4>
      <p class="empty">${tr('Wer auf der Liste steht, bekommt in der nächsten Periode Angebote. Ohne Freigabe geht niemand (außer mit Wartefrist).', 'Players on the list get offers in the next period. Nobody leaves without a release (except with a waiting period).')}</p>
      <ul class="tf-list">${rows}</ul>
      ${lo.length ? `<h4>${tr('Laufende Leihen (bis Saisonende)', 'Current loans (until season end)')}</h4><ul class="plain">${lo.map((l) => `<li>${l.dir === 'in' ? tr('zu uns', 'to us') : tr('von uns', 'from us')}: ${l.text}</li>`).join('')}</ul>` : ''}`;
  },

  // --- Fristen & Meldungen -----------------------------------------------------------------------------------------
  tfNews(info) {
    const c = this.career;
    const t = tstate(c);
    const lvl = c.level ?? 1;
    const up = lvl < 5 ? trainingFee(lvl, lvl + 1, {}) : 0;
    const log = [...t.log].reverse().slice(0, 14);
    const rels = Object.entries(t.rel)
      .filter(([, v]) => v !== 0)
      .map(([id, v]) => `<li>${anyClub(c, id)?.name ?? id}: ${v > 0 ? tr('gutes Verhältnis', 'good terms') : tr('angespannt', 'strained')} (${v > 0 ? '+' : ''}${v})</li>`)
      .join('');
    return `<h4>${tr('Wechselfristen', 'Transfer periods')}</h4>
      <ul class="plain tf-rules">
        <li><b>${tr('Sommer (Wechselperiode I)', 'Summer (period I)')}</b>: ${tr('erste Woche der Saison – in Wirklichkeit 1. Juli bis 31. August.', 'first week of the season – in reality 1 July to 31 August.')}</li>
        <li><b>${tr('Winter (Wechselperiode II)', 'Winter (period II)')}</b>: ${tr('erste Woche nach der Winterpause – in Wirklichkeit im Januar.', 'first week after the winter break – in reality in January.')}</li>
        <li>${tr('Ohne Freigabe des alten Vereins gilt eine Wartefrist von sechs Monaten – hier', 'Without the old club\'s release a six-month waiting period applies – here')} ${info.wait} ${tr('Spieltage.', 'match days.')}</li>
        <li>${tr(`Ausbildungsentschädigung (deine Liga): ${euro(FEE_BASE[lvl] ?? 0)} Grundbetrag${lvl > 1 && lvl < 5 && up !== FEE_BASE[lvl] ? `, bei Wechsel in eine höhere Liga ${euro(up)}` : ''}; U21-Spieler mit drei Jahren im Verein 50 % mehr, bei weniger als 18 Monaten 50 % weniger. Im Sommer fest, im Winter verhandelbar.`, `Training compensation (your league): ${euro(FEE_BASE[lvl] ?? 0)} base${lvl > 1 && lvl < 5 && up !== FEE_BASE[lvl] ? `, ${euro(up)} for a move to a higher league` : ''}; under-21s with three years at the club cost 50% more, under 18 months 50% less. Fixed in summer, negotiable in winter.`)}</li>
        <li>${tr('Handgeld bleibt unter 250 € im Monat – sonst wäre er Vertragsspieler.', 'Signing-on money stays below €250 a month – otherwise he would be a contract player.')}</li>
      </ul>
      <p class="t-2">${tr('Regeln nach den Spielordnungen von DFB und Landesverbänden (Stand 2026), Beträge nach der Tabelle des Hessischen Fußball-Verbands; Liga-Zuordnung und Stufen sind Spielwerte.', 'Rules after the DFB and regional association match regulations (2026), amounts after the Hessian association\'s table; league mapping and steps are game values.')}</p>
      <h4>${tr('Kreisblatt: Wechsel in der Gegend', 'District Gazette: moves around the area')}</h4>
      <ul class="plain tf-log" data-testid="tf-log">${log.map((e) => `<li>${e.text}</li>`).join('') || `<li class="empty">${tr('Noch keine Wechsel gemeldet.', 'No moves reported yet.')}</li>`}</ul>
      ${rels ? `<h4>${tr('Verhältnis zu anderen Vereinen', 'Relations with other clubs')}</h4><ul class="plain">${rels}</ul>` : ''}`;
  },

  // Ein Klick auf eine Transfer-Aktion (data-action beginnt mit „tf“). Gibt true zurück, wenn gespeichert werden muss.
  tfAction(action, value, el) {
    const c = this.career;
    const tf = (this.tf ??= { sub: 'rumors', pos: 'all', scope: 'all', sort: 'rating', open: null, note: '' });
    const msg = (code, ok = '') => (tf.note = code === 'ok' ? ok : MSG()[code] ?? '');
    tf.note = '';
    if (action === 'tfSub') {
      tf.sub = value;
      tf.open = null;
      return false;
    }
    if (action === 'tfFilter') {
      const g = el?.dataset.group;
      if (g === 'handgeld') return setHandgeld(c, tf.open, Number(value));
      if (g === 'extra') tf.extra = Number(value);
      else tf[g] = value;
      return false;
    }
    if (action === 'tfOpen') tf.open = Number(value);
    else if (action === 'tfClose') tf.open = null;
    else if (action === 'tfFree') {
      const code = approachFree(c, Number(value));
      tf.note = code === 'ok' ? tr('Er steht jetzt auf der Gerüchteküche – dort kannst du ihn umwerben.', 'He is on the rumour board now – you can court him there.') : MSG()[code] ?? '';
      return true;
    }
    else if (action === 'tfAsk') {
      const code = askClub(c, Number(value), tf.extra ?? 0);
      tf.note = code === 'ja' ? tr('Freigabe zugesagt.', 'Release agreed.') : code === 'nein' ? tr('Der Verein lehnt ab.', 'The club says no.') : MSG()[code] ?? '';
      return true;
    } else if (action === 'tfAskAround') askAroundDeal(c, Number(value));
    else if (action === 'tfTalk') talkDeal(c, Number(value));
    else if (action === 'tfArgue') {
      const [i, arg] = String(value).split(':');
      argueDeal(c, Number(i), arg);
    } else if (action === 'tfList') listPlayer(c, Number(value), !tstate(c).listed.includes(Number(value)));
    else if (action === 'tfAccept') msg(acceptOffer(c, Number(value)), tr('Der Wechsel ist vollzogen.', 'The move is done.'));
    else if (action === 'tfDecline') declineOffer(c, Number(value));
    else if (action === 'tfCounter') counterOffer(c, Number(value));
    else if (action === 'tfLoanIn') msg(loanIn(c, Number(value)), tr('Er kommt für eine Saison.', 'He joins for one season.'));
    else if (action === 'tfLoanOut') msg(loanOut(c, Number(value)), tr('Er spielt eine Saison woanders.', 'He plays elsewhere for a season.'));
    return true;
  },
};
