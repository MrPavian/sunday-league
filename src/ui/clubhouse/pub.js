// KNEIPE: Stammtisch, Wirt, Einzelgespräch, Taktik auf dem Bierdeckel, Dart.
// Methoden des Vereinsheims (this = Clubhouse), aus Clubhouse.js herausgelöst – Verhalten unverändert.
import { tr } from '../../core/i18n.js';
import { button } from '../ds.js';
import { humanClub, table } from '../../career/career.js';
import { dossier, PUB_ACTIONS, PUB_NAME, pubOpen, pubState, ROUND_PRICE, TACTICS, wirtName } from '../../career/pub.js';
import { DOSSIER_LABELS } from '../../data/backstories.js';
import { canSupportDream, DREAM_COST } from '../../career/pub.js';
import { relationLabel, relationsOfPlayer } from '../../career/relations.js';
import { isCoach } from '../../career/personal.js';

export const pubScreens = {
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
  },

  dartPos() {
    const t = (performance.now() - this.dart.t0) / 1000;
    const speed = 1.6 + this.dart.throws.length * 0.35; // jeder Wurf etwas wackliger
    return Math.sin(t * speed * Math.PI) * (0.92 + 0.08 * Math.sin(t * 7.3));
  },

  animateDart() {
    const pin = this.root.querySelector('.dart .pin');
    if (!pin || !this.dart) return;
    pin.style.left = `${50 + this.dartPos() * 48}%`;
    requestAnimationFrame(() => this.animateDart());
  },
};
