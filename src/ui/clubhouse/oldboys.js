// ALTE HERREN (Reiter in „Verein"): das Ü32-Team mit Kader, Terminen und Ergebnissen, drei Unterbereiche statt einer langen Seite.
// Logik in career/oldboys.js. Methoden des Vereinsheims (this = Clubhouse), eingemischt wie die anderen Bildschirme.
import { tr } from '../../core/i18n.js';
import { button, chip, esc, tabs as uiTabs } from '../ds.js';
import { humanClub, playerOf } from '../../career/career.js';
import { acceptOffer, AGE_MIN, declineOffer, foundCheck, found, FOUND_COST, maxSize, moveFromFirst, nextGame, ohTable, oh, pendingGame, releaseMember, targetSize } from '../../career/oldboys.js';
import { MIN_SQUAD } from '../../career/career.js';
import { POSITIONS } from '../../sim/generator.js';

const SUBS = ['game', 'squad', 'games'];
const SRC = () => ({ first: tr('aus der Ersten', 'from the first team'), alumni: tr('Ehemalige', 'ex-player'), former: tr('Ex-Spieler', 'former'), new: tr('neu im Ort', 'new in town'), coach: tr('Trainer', 'manager'), retired: tr('Karriereende', 'retired') });
const euroTxt = (n) => tr(`${n} €`, `€${n}`);
const hexC = (n) => `#${(n ?? 0x888888).toString(16).padStart(6, '0')}`;

export const oldBoysScreens = {
  tab_oldboys() {
    const c = this.career;
    const a = (this.ah ??= { sub: 'game', note: '' });
    if (!SUBS.includes(a.sub)) a.sub = 'game';
    const o = oh(c);
    if (!o) return this.ahFoundCard();
    const offers = o.offers.length;
    const subs = uiTabs([['game', tr('Spiel', 'Game')], ['squad', tr('Kader', 'Squad'), offers || null], ['games', tr('Ergebnisse', 'Results')]], a.sub, 'ahSub');
    const note = a.note ? `<p class="oh-note" role="status" data-testid="oh-note">${a.note}</p>` : '';
    const body = a.sub === 'squad' ? this.ahSquad() : a.sub === 'games' ? this.ahGames() : this.ahGame();
    return `<div class="oh" data-testid="oh"><h3 class="oh-title">${esc(o.name)}</h3>${subs}${note}${body}</div>`;
  },

  // Noch keine Mannschaft: Erklärung, Voraussetzungen, Gründen.
  ahFoundCard() {
    const c = this.career;
    const chk = foundCheck(c);
    const a = this.ah;
    const need = chk.reasons.length ? `<ul class="oh-reasons">${chk.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>` : '';
    return `<div class="oh" data-testid="oh"><h3 class="oh-title">${tr('Alte Herren', 'Old boys')}</h3>
      <p>${tr('Ein zweites Team für alle ab 32: freitagabends, alle zwei Wochen, in einer kleinen Ü32-Runde. Kein Training – dafür Bierkasse und Grillen danach. Die Erste bleibt, wie sie ist; wer will, wechselt später freiwillig herüber.', 'A second side for everyone aged 32 and over: Friday evenings, every two weeks, in a small over-32 league. No training – instead a beer kitty and a barbecue afterwards. The first team stays as it is; anyone who wants to can move across later.')}</p>
      <p class="oh-facts">${chip(tr(`${chk.count} Ü32 im Umfeld`, `${chk.count} over-32s around`), { plain: true })} ${chip(tr(`Gründung ${euroTxt(FOUND_COST)}`, `Founding ${euroTxt(FOUND_COST)}`), { plain: true })}</p>
      ${need}
      ${a?.note ? `<p class="oh-note" role="status" data-testid="oh-note">${a.note}</p>` : ''}
      ${button(tr('Alte Herren gründen', 'Found the old boys'), { kind: 'primary block', action: 'ahFound', disabled: !chk.ok, 'data-testid': 'oh-found' })}
    </div>`;
  },

  // Nächstes Spiel und Tabelle.
  ahGame() {
    const c = this.career;
    const pend = pendingGame(c);
    const nx = nextGame(c);
    const live = !this.results;
    let card;
    if (pend) {
      card = `<div class="oh-card" data-testid="oh-next"><b>${pend.home ? tr('Heimspiel', 'Home game') : tr('Auswärtsspiel', 'Away game')} · ${tr('Freitagabend', 'Friday night')}</b>
        <p>${esc(pend.opp.name)}</p>
        <p class="t-2">${tr('Ergebnis kommt von selbst zum Spieltag; wer zuschauen will, nimmt den Liveticker.', 'The result comes by itself on matchday; to watch, use the live ticker.')}</p>
        ${live ? button(tr('Im Liveticker ansehen', 'Watch in the live ticker'), { kind: 'primary block', action: 'onOldBoysTicker', 'data-testid': 'oh-ticker' }) : ''}</div>`;
    } else if (nx) {
      card = `<div class="oh-card" data-testid="oh-next"><b>${tr('Nächstes Spiel', 'Next game')}</b>
        <p>${nx.weeks === 0 ? tr('Diese Woche', 'This week') : tr(`in ${nx.weeks} Woche${nx.weeks === 1 ? '' : 'n'}`, `in ${nx.weeks} week${nx.weeks === 1 ? '' : 's'}`)} · ${nx.home ? tr('zu Hause gegen', 'at home to') : tr('auswärts bei', 'away at')} ${esc(nx.opp.name)}</p></div>`;
    } else {
      card = `<div class="oh-card" data-testid="oh-next"><b>${tr('Die Runde ist gespielt', 'The league is over')}</b><p class="t-2">${tr('Nächste Saison geht es weiter.', 'It carries on next season.')}</p></div>`;
    }
    const rows = ohTable(c)
      .map((r, i) => `<tr class="${r.own ? 'mine' : ''}"><td>${i + 1}.</td><td class="oh-club"><i style="background:${hexC(r.kit.shirt)}"></i><span>${esc(r.name)}</span></td><td class="num">${r.played}</td><td class="num">${r.gf}:${r.ga}</td><td class="num"><b>${r.pts}</b></td></tr>`)
      .join('');
    return `${card}<table class="oh-table" data-testid="oh-table"><thead><tr><th></th><th>${tr('Mannschaft', 'Team')}</th><th>${tr('Sp.', 'P')}</th><th>${tr('Tore', 'Goals')}</th><th>${tr('Pkt.', 'Pts')}</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="t-2">${tr('Ü32-Runde, einfach (5 Spiele), alle zwei Wochen. Bierkasse bei Heimspielen, kein Training.', 'Over-32 league, single round (5 games), every two weeks. Beer kitty at home games, no training.')}</p>`;
  },

  // Kader, Angebote bei Karriereende, Wechsel aus der Ersten.
  ahSquad() {
    const c = this.career;
    const o = oh(c);
    const src = SRC();
    const offers = o.offers.map((x) => `<li class="oh-row" data-testid="oh-offer"><span class="oh-name">${esc(x.name)}<small>${x.age} ${tr('J.', 'yrs')} · ${tr('hört auf', 'retiring')}</small></span><span class="oh-btns">${button(tr('Aufnehmen', 'Take'), { kind: 'secondary', action: 'ahAccept', value: x.idx })}${button(tr('Nein', 'No'), { kind: 'ghost', action: 'ahDecline', value: x.idx })}</span></li>`).join('');
    const rows = [...o.squad]
      .map((i) => ({ i, p: playerOf(c, i) }))
      .sort((a, b) => b.p.rating - a.p.rating)
      .map(({ i, p }) => {
        const st = o.stats[i] ?? { apps: 0, goals: 0 };
        const hurt = (o.hurt[i] ?? 0) > 0;
        return `<li class="oh-row" data-testid="oh-member"><span class="oh-name">${esc(p.name)}<small>${POSITIONS[p.position]} · ${p.age} ${tr('J.', 'yrs')} · ${tr('Stärke', 'Rating')} ${p.rating}${hurt ? ` · ${tr('angeschlagen', 'knocked')}` : ''}</small></span><span class="oh-meta">${chip(src[o.src[i]] ?? '', { plain: true })}<small>${st.apps} ${tr('Sp.', 'gp')} · ${st.goals} ${tr('Tore', 'gls')}</small></span></li>`;
      })
      .join('');
    const firstTeam = humanClub(c).squad.filter((i) => i !== c.coach?.idx && playerOf(c, i).age >= AGE_MIN);
    const canMove = humanClub(c).squad.length > MIN_SQUAD && o.squad.length < maxSize(c);
    const movers = firstTeam
      .map((i) => ({ i, p: playerOf(c, i) }))
      .map(({ i, p }) => `<li class="oh-row"><span class="oh-name">${esc(p.name)}<small>${POSITIONS[p.position]} · ${p.age} ${tr('J.', 'yrs')} · ${tr('Stärke', 'Rating')} ${p.rating}</small></span>${button(tr('Zu den Alten Herren', 'To the old boys'), { kind: 'ghost', action: 'ahMove', value: i, disabled: !canMove })}</li>`)
      .join('');
    return `${offers ? `<h4>${tr('Angebote bei Karriereende', 'Offers on retirement')}</h4><ul class="oh-list">${offers}</ul>` : ''}
      <h4>${tr(`Kader (${o.squad.length} von ${targetSize(c)})`, `Squad (${o.squad.length} of ${targetSize(c)})`)}</h4><ul class="oh-list">${rows}</ul>
      <h4>${tr('Aus der Ersten (ab 32)', 'From the first team (32+)')}</h4>${movers ? `<ul class="oh-list">${movers}</ul>` : `<p class="t-2">${tr('Niemand in der Ersten ist 32 oder älter.', 'Nobody in the first team is 32 or older.')}</p>`}
      <p class="t-2">${tr('Wer wechselt, spielt nur noch Freitagabend. Die Erste behält ihren Kader sonst unverändert.', 'Anyone who moves only plays Friday nights. The first team is otherwise untouched.')}</p>`;
  },

  // Ergebnisse, Torschützen, Bilanz.
  ahGames() {
    const c = this.career;
    const o = oh(c);
    const games = [...o.games].reverse().slice(0, 10).map((g) => `<li class="oh-row"><span class="oh-name">${g.home ? tr('gg.', 'v') : tr('bei', 'at')} ${esc(g.opp)}<small>${tr('Saison', 'Season')} ${g.season}</small></span><b class="oh-score ${g.gf > g.ga ? 'w' : g.gf < g.ga ? 'l' : 'd'}">${g.gf}:${g.ga}</b></li>`).join('');
    const scorers = Object.entries(o.stats)
      .filter(([i, s]) => s.goals > 0 && o.squad.includes(Number(i)))
      .sort((a, b) => b[1].goals - a[1].goals)
      .slice(0, 5)
      .map(([i, s]) => `<li class="oh-row"><span class="oh-name">${esc(playerOf(c, Number(i)).name)}</span><b>${s.goals}</b></li>`)
      .join('');
    const t = o.totals;
    const hist = [...o.history].reverse().slice(0, 5).map((h) => `<li class="oh-row"><span class="oh-name">${tr('Saison', 'Season')} ${h.season}<small>${h.w}-${h.d}-${h.l} · ${h.gf}:${h.ga}</small></span><b>${h.pos}. ${tr('Platz', 'place')}</b></li>`).join('');
    return `<div class="oh-card"><b>${tr('Bilanz', 'Record')}</b><p>${t.w} ${tr('S', 'W')} · ${t.d} ${tr('U', 'D')} · ${t.l} ${tr('N', 'L')} · ${t.gf}:${t.ga} ${tr('Tore', 'goals')}</p><p class="t-2">${tr('Bierkasse', 'Beer kitty')}: ${t.cash >= 0 ? '+' : ''}${euroTxt(t.cash)}</p></div>
      <h4>${tr('Letzte Spiele', 'Recent games')}</h4>${games ? `<ul class="oh-list">${games}</ul>` : `<p class="t-2">${tr('Noch kein Spiel.', 'No game yet.')}</p>`}
      ${scorers ? `<h4>${tr('Torschützen', 'Scorers')}</h4><ul class="oh-list">${scorers}</ul>` : ''}
      ${hist ? `<h4>${tr('Frühere Runden', 'Past seasons')}</h4><ul class="oh-list">${hist}</ul>` : ''}`;
  },

  ahAction(action, value) {
    const c = this.career;
    const a = (this.ah ??= { sub: 'game', note: '' });
    a.note = '';
    if (action === 'ahSub') {
      a.sub = value;
      return false;
    }
    if (action === 'ahFound') {
      a.note = found(c) ? tr('Die Alten Herren sind gegründet.', 'The old boys are founded.') : tr('Das geht noch nicht.', 'Not possible yet.');
      return true;
    }
    if (action === 'ahMove') {
      a.note = moveFromFirst(c, Number(value)) ? tr('Gewechselt – ab jetzt nur noch Freitagabend.', 'Moved – Friday nights only from now on.') : tr('Das geht gerade nicht.', 'Not possible right now.');
      return true;
    }
    if (action === 'ahAccept') {
      a.note = acceptOffer(c, Number(value)) ? tr('Aufgenommen.', 'Welcomed.') : tr('Das hat nicht geklappt.', 'That did not work.');
      return true;
    }
    if (action === 'ahDecline') {
      declineOffer(c, Number(value));
      return true;
    }
    if (action === 'ahRelease') return releaseMember(c, Number(value));
    return false;
  },
};
