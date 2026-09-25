import { PITCHES } from '../sim/pitch.js';

const starRow = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
// Angezeigt wird, ab welcher Fußballminute es losgeht, und wie lange real gespielt wird.
const timing = (s) => `ab der ${90 - Math.round((s / 600) * 90) + 1}. Minute · ${Math.round(s / 60)} Min. Spielzeit`;

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
        <header><h2>Challenges <small>${total} / ${challenges.length * 3} Sterne</small></h2><button data-action="back">Zurück (Esc)</button></header>
        <p class="tier-desc" style="--c:var(--accent)">Kurze Szenarien mit festem Spielstand. Beim ersten Abschluss gibt es eine Belohnung für deine Karriere.</p>
        <div class="challenge-grid">${challenges
          .map((c) => {
            const stars = progress.stars[c.id] ?? 0;
            return `<article class="challenge ${stars ? 'done' : ''}">
              <h3>${c.title} <span class="stars">${starRow(stars)}</span></h3>
              <p class="facts">${PITCHES[c.venue].name} · Stand ${c.score[0]}:${c.score[1]} · ${timing(c.seconds)}${c.handicap ? ` · ${c.handicap} Mann weniger` : ''}</p>
              <p>${c.story}</p>
              <ol>${c.goals.map((g) => `<li>${g.text}</li>`).join('')}</ol>
              <p class="reward">Belohnung: ${c.reward.text}${stars ? ' <em>(erhalten)</em>' : ''}</p>
              <button class="primary" data-action="start" data-value="${c.id}">${stars ? 'Nochmal' : 'Anstoß'}</button>
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
        ? `<p class="reward ok">Belohnung eingelöst: ${def.reward.text}${player ? ` – <b>${player.playerName}</b> steht jetzt in deinem Kader.` : '.'}</p>`
        : '<p class="reward ok">Belohnung vorgemerkt – sie wird gutgeschrieben, sobald du eine Karriere startest.</p>';
    }
    this.root.innerHTML = `
      <div class="pool-panel challenge-panel result">
        <h2>${stars ? 'Challenge geschafft!' : 'Leider nicht geschafft'}</h2>
        <p class="big-stars">${starRow(stars)}</p>
        <p class="score">${m.teams[0].name} ${m.score[0]} : ${m.score[1]} ${m.teams[1].name}</p>
        <ul class="goals">${def.goals.map((g, i) => `<li class="${results[i] ? 'ok' : 'no'}">${results[i] ? '✔' : '✘'} ${g.text}</li>`).join('')}</ul>
        ${reward}
        <p class="keys"><b>R</b> nochmal · <b>Enter</b> zur Challenge-Liste · <b>Esc</b> Hauptmenü</p>
        <div class="actions"><button data-action="retry">Nochmal</button><button class="primary" data-action="list">Zur Liste</button></div>
      </div>`;
    this.root.hidden = false;
  }
}
