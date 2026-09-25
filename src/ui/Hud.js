import { TRAITS } from '../data/traits.js';
import { getPlayer } from '../sim/match.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

export class Hud {
  constructor(root) {
    root.innerHTML = `
      <div class="scoreboard">
        <span class="team" data-t="0"></span>
        <span class="score"></span>
        <span class="team" data-t="1"></span>
        <span class="clock"></span>
      </div>
      <div class="venue"></div>
      <div class="toast" hidden></div>
      <div class="card">
        <div class="name"></div>
        <div class="meta"></div>
        <div class="traits"></div>
        <div class="bar stamina"><i></i><span>Puste</span></div>
        <div class="bar charge"><i></i><span>Schuss</span></div>
      </div>
      <div class="help">
        <b>WASD/Pfeile</b> laufen · <b>Shift</b> sprinten · <b>Leertaste</b> halten = Schuss ·
        <b>J</b> Pass · <b>Q</b> Spieler wechseln · <b>H</b> Hilfe
      </div>`;
    this.root = root;
    this.$ = (sel) => root.querySelector(sel);
    this.toastTimer = 0;
    this.lastControlled = null;
  }

  init(match) {
    match.teams.forEach((t, i) => {
      const el = this.root.querySelector(`.team[data-t="${i}"]`);
      el.textContent = t.name;
      el.style.setProperty('--kit', hex(t.kit.shirt));
    });
    this.$('.venue').textContent = match.pitch.name;
    this.hideToast();
  }

  toggleHelp() {
    this.$('.help').classList.toggle('hidden');
  }

  toast(text, seconds = 2) {
    const el = this.$('.toast');
    el.textContent = text;
    el.hidden = false;
    this.toastTimer = seconds;
  }

  hideToast() {
    this.$('.toast').hidden = true;
    this.toastTimer = 0;
  }

  handleEvents(match) {
    for (const e of match.events) {
      const p = e.playerId && getPlayer(match, e.playerId);
      const first = p ? p.name.split(' ')[0] : '';
      if (e.type === 'goal') {
        const scorer = e.scorerId && getPlayer(match, e.scorerId);
        this.toast(e.ownGoal ? `EIGENTOR! ${scorer?.name ?? ''}` : `TOR! ${scorer?.name ?? ''}`, 2.4);
      } else if (e.type === 'whiff') this.toast(`Luftloch von ${first}!`, 1.4);
      else if (e.type === 'save') this.toast(`${first} pariert!`, 1.2);
      else if (e.type === 'miscontrol') this.toast(`Verspringt ${first}…`, 1);
      else if (e.type === 'end') this.toast('ABPFIFF – Enter für Revanche', 999);
    }
  }

  update(match, dt) {
    const [a, b] = match.score;
    this.$('.score').textContent = `${a} : ${b}`;
    const t = Math.min(match.time, match.duration);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    this.$('.clock').textContent = `${mm}:${ss}`;

    if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.hideToast();

    const p = getPlayer(match, match.controlledId);
    if (p.id !== this.lastControlled) {
      this.lastControlled = p.id;
      this.$('.name').textContent = p.name;
      this.$('.meta').textContent = `${p.age} J. · ${p.profession}`;
      this.$('.traits').innerHTML = p.traits.length
        ? p.traits.map((id) => `<span title="${TRAITS[id].desc}">${TRAITS[id].name}</span>`).join('')
        : '<em>keine Besonderheiten</em>';
    }
    this.$('.stamina i').style.width = `${Math.round(p.stamina * 100)}%`;
    this.$('.charge i').style.width = `${Math.round(p.charge * 100)}%`;
  }
}
