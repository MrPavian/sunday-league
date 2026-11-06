// Wählbares Tutorial (vom Nutzer gewünscht 2026-11-06: „Vereinsheim + Spieltag, beim Karrierestart fragen“).
// Zwei Teile, beide jederzeit abbrechbar und in den Einstellungen neu startbar:
//  - club:  Tour durchs Vereinsheim – jeder Schritt öffnet seinen Reiter und hebt hervor, worum es geht.
//  - match: der erste Spieltag an der Seitenlinie – die Hinweise kommen, wenn das Spiel so weit ist (Anpfiff, erste Lagekarte,
//           Halbzeit); solange ein Hinweis offen ist, steht das Spiel.
// Der Stand liegt im Spielstand (career.tutorial), damit er Neustarts übersteht.
import { tr } from '../core/i18n.js';

export const CLUB_STEPS = () => [
  { id: 'hub', tab: 'home', target: '.hub-match', title: tr('Willkommen im Vereinsheim', 'Welcome to the clubhouse'), text: tr('Hier unter „Heute“ siehst du die Woche: den nächsten Gegner, was ansteht – und unten den Anpfiff. Jede Woche endet mit dem Spiel.', 'Under "Today" you see the week: the next opponent, what needs doing – and the kick-off at the bottom. Every week ends with the match.') },
  { id: 'chat', tab: 'chat', target: '.club-rail [data-value="phone"]', title: tr('Handy: die Chatgruppe', 'Phone: the group chat'), text: tr('Hier sagen die Spieler für Sonntag zu oder ab. Manchmal wartet eine Entscheidung – die rote Zahl zeigt sie an.', 'This is where players say yes or no for Sunday. Sometimes a decision is waiting – the red number shows it.') },
  { id: 'lineup', tab: 'lineup', target: '.club-rail [data-value="team"]', title: tr('Mannschaft: Aufstellung', 'Squad: line-up'), text: tr('Wer spielt, wer sitzt draußen? Tippe einen Spieler an und dann den Platz, auf den er soll.', 'Who plays, who sits out? Tap a player and then the spot he should go to.') },
  { id: 'tactic', tab: 'tactic', target: '[data-action="tab"][data-value="tactic"]', title: tr('Taktik', 'Tactics'), text: tr('System, Spielstil und Spielplan. Passt der Stil nicht zur Mannschaft, zeigt es dir die Anzeige.', 'Formation, playing style and game plan. If the style does not suit the team, the indicator tells you.') },
  { id: 'training', tab: 'training', target: '[data-action="tab"][data-value="training"]', title: tr('Training', 'Training'), text: tr('Trainingsplan und Übungen. Jede Woche hast du nur ein paar Aktionen – überleg, wofür.', 'Training plan and drills. You only have a few actions each week – choose wisely.') },
  { id: 'transfers', tab: 'transfers', target: '[data-action="tab"][data-value="transfers"]', title: tr('Transfers', 'Transfers'), text: tr('Neue Spieler über die Gerüchteküche und die Suche. Unter „Teams“ findest du Jugend, Frauen und Alte Herren.', 'New players via the rumour mill and the search. Under "Teams" you find the youth, women and old boys.') },
  { id: 'season', tab: 'table', target: '.club-rail [data-value="season"]', title: tr('Saison', 'Season'), text: tr('Tabelle, Spielplan und Turniere. Das Saisonziel des Vorstands steht oben.', 'Table, fixtures and tournaments. The board\'s season target is at the top.') },
  { id: 'cash', tab: 'cash', target: '.club-rail [data-value="club"]', title: tr('Verein: Kasse', 'Club: kitty'), text: tr('Einnahmen, Ausgaben, Sponsoren. Ohne Geld kein Ausbau – und keine Fahrt zum Saisonabschluss.', 'Income, spending, sponsors. No money, no upgrades – and no end-of-season trip.') },
  { id: 'anlage', tab: 'anlage', target: '[data-action="tab"][data-value="anlage"]', title: tr('Anlage', 'Grounds'), text: tr('Platz pflegen und ausbauen: Duschen, Tribüne, Trainingsplätze, Medizin und mehr. Jeder Ausbau wirkt auf etwas Bestimmtes.', 'Look after the pitch and expand: showers, stands, training pitches, medical and more. Each upgrade affects something specific.') },
  { id: 'pub', tab: 'pub', target: '.club-rail [data-value="pub"]', title: tr('Kneipe', 'Pub'), text: tr('Am Stammtisch hörst du, was im Ort geredet wird – und manchmal wird hier ein Spieler überredet.', 'At the regulars\' table you hear what the town is saying – and sometimes a player gets talked round here.') },
  { id: 'go', tab: 'home', target: '.coach-play', title: tr('Anpfiff', 'Kick-off'), text: tr('Bereit? Mit „Anpfiff – an der Seitenlinie“ stehst du beim Spiel am Rand. Das Tutorial findest du jederzeit in den Einstellungen wieder.', 'Ready? With "Kick-off – on the touchline" you stand at the side of the pitch. You can restart the tutorial any time in the settings.') },
];

// Angebot nach der Gründung (ohne Ziel: Blase in der Mitte).
export const OFFER_STEP = () => ({ id: 'offer', target: null, title: tr('Kurze Führung gefällig?', 'Fancy a quick tour?'), text: tr('Erst ein Rundgang durchs Vereinsheim, dann Hinweise beim ersten Spiel an der Seitenlinie. Jederzeit abbrechbar und später in den Einstellungen neu startbar.', 'First a walk through the clubhouse, then tips during your first match on the touchline. You can stop any time and restart it later in the settings.') });

// m = laufendes Spiel. when: Ab wann der Hinweis kommt (der Reihe nach).
export const MATCH_STEPS = () => [
  { id: 'touchline', when: (m) => m.phase === 'play' && m.time > 1, target: '.hud-actions', title: tr('Du stehst an der Seitenlinie', 'You are on the touchline'), text: tr('Gespielt wird von deinen Spielern, nicht von dir. Du gibst Anweisungen – unten sind deine Werkzeuge. Das Spiel steht, solange dieser Hinweis offen ist.', 'Your players play, not you. You give instructions – your tools are at the bottom. The game is paused while this hint is open.') },
  { id: 'plan', when: () => true, target: '[data-tap="plan"]', title: tr('Taktik und Zurufe', 'Tactics and shouts'), text: tr('Zurufe wie „Hinten dicht“ oder „Pressing“ und Umstellungen im Spiel. Am Rechner gehen die Zurufe auch mit 1–4.', 'Shouts like "Shut up shop" or "Press" and changes during the game. On a computer the shouts also work with 1–4.') },
  { id: 'sub', when: () => true, target: '[data-tap="sub"]', title: tr('Wechsel', 'Substitutions'), text: tr('Wer müde ist oder schwach spielt, kommt raus – bei der nächsten Unterbrechung. Taste X.', 'Whoever is tired or playing badly comes off – at the next stoppage. Key X.') },
  { id: 'comm', when: () => true, target: '[data-tap="comm"]', title: tr('Co-Trainer', 'Assistant'), text: tr('Dein Co-Trainer meldet sich mit Beobachtungen. Eine Zahl am Knopf heißt: Er hat etwas für dich.', 'Your assistant reports what he sees. A number on the button means he has something for you.') },
  { id: 'card', when: (m) => !!m.coachCard, target: '.coach-card', title: tr('Lagekarte', 'Situation card'), text: tr('Jetzt ist eine Entscheidung gefragt. Wähle eine Antwort (am Rechner mit den Zahlentasten) – sie gilt für die nächsten Minuten.', 'A decision is needed now. Pick an answer (number keys on a computer) – it applies for the next few minutes.') },
  { id: 'half', when: (m) => m.phase === 'halftime', target: '.half-panel', title: tr('Halbzeit', 'Half-time'), text: tr('Was lief gut, was nicht? Hier stellst du für die zweite Hälfte um und wechselst in Ruhe. Danach weißt du alles – viel Erfolg!', 'What went well, what did not? This is where you make changes for the second half and substitute in peace. That is everything – good luck!') },
];

export const tutorialState = (c) => c?.tutorial ?? null;
// Beim Karrierestart gefragt oder in den Einstellungen neu gestartet: beide Teile von vorn.
export function startTutorial(c) {
  c.tutorial = { club: 0, match: 0 };
  return c.tutorial;
}
export function stopTutorial(c, part = null) {
  if (!c?.tutorial) return;
  if (part) c.tutorial[part] = 'done';
  else c.tutorial = { club: 'done', match: 'done' };
}
export const tutorialActive = (c, part) => typeof c?.tutorial?.[part] === 'number';

// Sprechblase über allem: hebt das Ziel hervor und zeigt Titel, Text, „Weiter“ und „Beenden“.
export class TutorialBubble {
  constructor(root) {
    this.root = root;
    this.root.hidden = true;
    this.root.className = 'tutorial';
    this.focus = null;
    this.root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-tut]')?.dataset.tut;
      if (a === 'next') this.onNext?.();
      if (a === 'stop') this.onStop?.();
    });
    // Am Rechner: Enter = Weiter (vor allen anderen Tastenbelegungen, solange die Blase offen ist).
    window.addEventListener('keydown', (e) => {
      if (this.root.hidden || (e.code !== 'Enter' && e.code !== 'NumpadEnter')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.onNext?.();
    }, true);
  }

  get open() {
    return !this.root.hidden;
  }

  // total = 0: ohne Zähler (das Angebot nach der Gründung); nextLabel/stopLabel ersetzen die Knopftexte.
  show(step, { index = 0, total = 0, onNext, onStop, nextLabel = null, stopLabel = null }) {
    this.onNext = onNext;
    this.onStop = onStop;
    const last = index + 1 >= total;
    this.root.innerHTML = `<div class="tut-bubble" role="dialog" aria-live="polite" aria-label="${tr('Tutorial', 'Tutorial')}" data-step="${step.id}">
      <p class="tut-count">${tr('Tutorial', 'Tutorial')}${total ? ` · ${index + 1}/${total}` : ''}</p>
      <h3>${step.title}</h3><p>${step.text}</p>
      <div class="tut-buttons"><button type="button" class="ui-btn ghost" data-tut="stop">${stopLabel ?? tr('Tutorial beenden', 'End tutorial')}</button><button type="button" class="ui-btn primary" data-tut="next">${nextLabel ?? (last ? tr('Fertig', 'Done') : tr('Weiter', 'Next'))}</button></div>
    </div>`;
    this.root.hidden = false;
    this.mark(step.target, step.id !== this.stepId);
    this.stepId = step.id;
  }

  // Ziel hervorheben und die Blase oben oder unten platzieren (je nachdem, wo Platz ist).
  mark(selector, scroll = true) {
    this.focus?.classList.remove('tut-focus');
    this.focus = selector ? [...document.querySelectorAll(selector)].find((el) => el.offsetParent !== null || el.getClientRects().length) ?? null : null;
    const bubble = this.root.querySelector('.tut-bubble');
    if (!this.focus) {
      bubble.dataset.at = 'middle';
      return;
    }
    this.focus.classList.add('tut-focus');
    if (scroll) this.focus.scrollIntoView?.({ block: 'nearest' });
    const r = this.focus.getBoundingClientRect();
    bubble.dataset.at = r.top + r.height / 2 > window.innerHeight / 2 ? 'top' : 'bottom';
  }

  hide() {
    this.focus?.classList.remove('tut-focus');
    this.focus = null;
    this.stepId = null;
    this.onNext = this.onStop = null;
    this.root.hidden = true;
    this.root.innerHTML = '';
  }
}
