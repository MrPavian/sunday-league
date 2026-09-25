import { tr } from '../core/i18n.js';
import { PITCHES } from '../sim/pitch.js';

const starRow = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
// Angezeigt wird, ab welcher Fußballminute es losgeht, und wie lange real gespielt wird.
const timing = (s) => tr(`ab der ${90 - Math.round((s / 600) * 90) + 1}. Minute · ${Math.round(s / 60)} Min. Spielzeit`, `from minute ${90 - Math.round((s / 600) * 90) + 1} · ${Math.round(s / 60)} min of play`);

// Challenge-Liste und Ergebnis nach dem Abpfiff.
export class ChallengeScreen {
  constructor(root) {
    this.root = root;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const { action, value } = t.dataset;
      if (action === 'start') this.onStart?.(value);
      else if (action === 'back') this.onBack?.();
      else if (action === 'retry') this.onStart?.(this.lastId);
      else if (action === 'list') this.onList?.();
    });
    window.addEventListener('keydown', (e) => {
      if (this.root.hidden) return;
      if (e.code === 'Escape') this.onBack?.();
      if (this.mode === 'result' && e.code === 'Enter') this.onList?.();
      if (this.mode === 'result' && e.code === 'KeyR') this.onStart?.(this.lastId);
    });
  }

  hide() {
    this.root.hidden = true;
  }

  showList(challenges, progress, { onStart, onBack }) {
    this.mode = 'list';
    this.onStart = onStart;
    this.onBack = onBack;
    const total = Object.values(progress.stars).reduce((a, b) => a + b, 0);
    this.root.innerHTML = `
      <div class="pool-panel challenge-panel">
        <header><h2>Challenges <small>${total} / ${challenges.length * 3} ${tr('Sterne', 'stars')}</small></h2><button data-action="back">${tr('Zurück (Esc)', 'Back (Esc)')}</button></header>
        <p class="tier-desc" style="--c:var(--accent)">${tr('Kurze Szenarien mit festem Spielstand. Beim ersten Abschluss gibt es eine Belohnung für deine Karriere.', 'Short scenarios with a fixed scoreline. Clear one for the first time and your career gets a reward.')}</p>
        <div class="challenge-grid">${challenges
          .map((c) => {
            const stars = progress.stars[c.id] ?? 0;
            return `<article class="challenge ${stars ? 'done' : ''}">
              <h3>${c.title} <span class="stars">${starRow(stars)}</span></h3>
              <p class="facts">${PITCHES[c.venue].name} · ${tr('Stand', 'Score')} ${c.score[0]}:${c.score[1]} · ${timing(c.seconds)}${c.handicap ? tr(` · ${c.handicap} Mann weniger`, ` · ${c.handicap} player${c.handicap > 1 ? 's' : ''} down`) : ''}</p>
              <p>${c.story}</p>
              <ol>${c.goals.map((g) => `<li>${g.text}</li>`).join('')}</ol>
              <p class="reward">${tr('Belohnung', 'Reward')}: ${c.reward.text}${stars ? tr(' <em>(erhalten)</em>', ' <em>(received)</em>') : ''}</p>
              <button class="primary" data-action="start" data-value="${c.id}">${stars ? tr('Nochmal', 'Again') : tr('Anstoß', 'Kick off')}</button>
            </article>`;
          })
          .join('')}</div>
      </div>`;
    this.root.hidden = false;
  }

  showResult(def, m, evaluation, { firstClear, applied, hasCareer }, { onStart, onList, onBack }) {
    this.mode = 'result';
    this.lastId = def.id;
    this.onStart = onStart;
    this.onList = onList;
    this.onBack = onBack;
    const { results, stars } = evaluation;
    let reward = '';
    if (firstClear) {
      const player = applied.find((a) => a.playerName);
      reward = hasCareer
        ? `<p class="reward ok">${tr('Belohnung eingelöst', 'Reward claimed')}: ${def.reward.text}${player ? tr(` – <b>${player.playerName}</b> steht jetzt in deinem Kader.`, ` – <b>${player.playerName}</b> is now in your squad.`) : '.'}</p>`
        : `<p class="reward ok">${tr('Belohnung vorgemerkt – sie wird gutgeschrieben, sobald du eine Karriere startest.', 'Reward saved – it will be credited as soon as you start a career.')}</p>`;
    }
    this.root.innerHTML = `
      <div class="pool-panel challenge-panel result">
        <h2>${stars ? tr('Challenge geschafft!', 'Challenge complete!') : tr('Leider nicht geschafft', 'Not this time')}</h2>
        <p class="big-stars">${starRow(stars)}</p>
        <p class="score">${m.teams[0].name} ${m.score[0]} : ${m.score[1]} ${m.teams[1].name}</p>
        <ul class="goals">${def.goals.map((g, i) => `<li class="${results[i] ? 'ok' : 'no'}">${results[i] ? '✔' : '✘'} ${g.text}</li>`).join('')}</ul>
        ${reward}
        <p class="keys">${tr('<b>R</b> nochmal · <b>Enter</b> zur Challenge-Liste · <b>Esc</b> Hauptmenü', '<b>R</b> retry · <b>Enter</b> challenge list · <b>Esc</b> main menu')}</p>
        <div class="actions"><button data-action="retry">${tr('Nochmal', 'Again')}</button><button class="primary" data-action="list">${tr('Zur Liste', 'To the list')}</button></div>
      </div>`;
    this.root.hidden = false;
  }
}
