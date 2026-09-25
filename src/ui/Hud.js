import { TRAITS } from '../data/traits.js';
import { tierById } from '../data/tiers.js';
import { POSITIONS } from '../sim/generator.js';
import { findAnyPlayer } from '../sim/squad.js';
import { REF_TRAITS } from '../sim/referee.js';
import { attackDir, getPlayer } from '../sim/match.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

// Anzeige in "Fußballminuten": die Spielzeit wird auf 90 Minuten hochgerechnet.
export const matchMinute = (match, t) => Math.min(90, Math.floor((t / match.duration) * 90) + 1);

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
      <div class="flash"></div>
      <div class="edge left"></div>
      <div class="edge right"></div>
      <div class="card">
        <div class="name"></div>
        <div class="meta"></div>
        <div class="tierline"></div>
        <div class="traits"></div>
        <div class="injury"></div>
        <div class="bar stamina"><i></i><span>Puste</span></div>
        <div class="bar charge"><i></i><span>Schuss</span></div>
      </div>
      <div class="help">
        <b>Pfeile</b> laufen · <b>Shift</b> sprinten · <b>W</b> Schuss (halten = fester) · <b>S</b> Pass · <b>E</b> hoher Ball ·
        <b>A</b> halten (abschirmen / festhalten) · <b>D</b> Grätsche · <b>Y</b> stochern · <b>Q</b> Spieler wechseln · <b>X</b> Auswechseln · <b>C</b> Tempo · <b>N</b> Ton · <b>G</b> Effekte · <b>H</b> Hilfe
      </div>`;
    this.root = root;
    this.$ = (sel) => root.querySelector(sel);
    this.toastTimer = 0;
    this.lastControlled = null;
  }

  init(match) {
    const r = match.referee;
    this.introPending = match.derby ? `DERBY! ${r ? `Schiri: ${r.name}` : 'Heute wird es heiß.'}` : r ? `Schiri heute: ${r.name} (${REF_TRAITS[r.trait].name})` : null;
    match.teams.forEach((t, i) => {
      const el = this.root.querySelector(`.team[data-t="${i}"]`);
      el.textContent = t.name;
      el.style.setProperty('--kit', hex(t.kit.shirt));
    });
    this.$('.venue').textContent = `${match.pitch.name} · ${match.pitch.surface.name}${r ? ` · Schiri: ${r.name}` : ''}`;
    this.hideToast();
    this.refName = r?.name ?? null;
    this.edgeKey = null;
    for (const w of ['rain', 'fog', 'snow', 'frost']) document.body.classList.remove(`weather-${w}`);
  }

  // Links und rechts am Bildschirmrand: wo ist unser Tor, wohin greifen wir an?
  updateEdges(match) {
    const team = match.humanTeam;
    const show = team !== null && team !== undefined;
    const s = show ? attackDir(match, team) : 1;
    const key = `${show}:${s}`;
    if (key === this.edgeKey) return;
    this.edgeKey = key;
    const [l, r] = [this.$('.edge.left'), this.$('.edge.right')];
    l.hidden = r.hidden = !show;
    if (!show) return;
    const kit = hex(match.teams[team].kit.shirt);
    const attack = `<span>ANGRIFF</span><b>${s > 0 ? '▶' : '◀'}</b>`;
    const own = `<span>EIGENES TOR</span>`;
    l.innerHTML = s > 0 ? own : attack;
    r.innerHTML = s > 0 ? attack : own;
    l.className = `edge left ${s > 0 ? 'own' : 'attack'}`;
    r.className = `edge right ${s > 0 ? 'attack' : 'own'}`;
    l.style.setProperty('--kit', kit);
    r.style.setProperty('--kit', kit);
  }

  lightning() {
    const el = this.$('.flash');
    el.classList.remove('on');
    void el.offsetWidth; // Animation neu starten
    el.classList.add('on');
  }

  toggleHelp() {
    this.$('.help').classList.toggle('hidden');
  }

  // Wichtige Meldungen (Tor) werden nicht von Kleinkram überschrieben.
  toast(text, seconds = 2, priority = 1) {
    if (this.toastTimer > 0 && priority < this.toastPriority) return;
    this.toastPriority = priority;
    const el = this.$('.toast');
    el.textContent = text;
    el.classList.toggle('long', text.length > 40);
    el.hidden = false;
    this.toastTimer = seconds;
  }

  hideToast() {
    this.$('.toast').hidden = true;
    this.toastTimer = 0;
  }

  handleEvents(match) {
    const short = (team) => match.teams[team].short;
    for (const e of match.events) {
      const p = e.playerId && findAnyPlayer(match, e.playerId);
      const first = p ? p.name.split(' ')[0] : '';
      if (e.type === 'goal') {
        const scorer = e.scorerId && findAnyPlayer(match, e.scorerId);
        const kind = e.ownGoal ? 'EIGENTOR!' : e.via === 'header' ? 'KOPFBALLTOR!' : 'TOR!';
        this.toast(`${kind} ${scorer?.name ?? ''}`, 2.4, 3);
      } else if (e.type === 'grab') this.toast(`${first} hält am Trikot fest …`, 0.9);
      else if (e.type === 'whiff') this.toast(`Luftloch von ${first}!`, 1.4);
      else if (e.type === 'foul') {
        const victim = findAnyPlayer(match, e.victimId);
        this.toast(`${e.kind === 'hold' ? 'Festhalten' : 'Foul'} von ${first}! Freistoß für ${short(victim.team)}`, 1.8, 2);
      } else if (e.type === 'car') this.toast(`Ans Auto, ${first}! Ball für ${short(e.team)}`, 1.8, 2);
      else if (e.type === 'out') {
        const text = { throwin: 'Einwurf', corner: 'Ecke', goalkick: 'Abstoß' }[e.restart];
        this.toast(`${text} ${short(e.team)}`, 1.2);
      } else if (e.type === 'complain') this.toast(`${first}: „${e.line}“`, 1.6, 2);
      else if (e.type === 'card') {
        const text = e.color === 'yellow' ? `Gelb für ${p.name}${e.reason === 'meckern' ? ' – wegen Meckern' : ''}` : `GELB-ROT! ${p.name} muss runter`;
        this.toast(text, 2, 3);
      } else if (e.type === 'no_call') this.toast('Schiri lässt laufen!', 1.2, 2);
      else if (e.type === 'post') this.toast('Pfosten!', 1.2);
      else if (e.type === 'bar') this.toast('Latte!', 1.2);
      else if (e.type === 'header' && e.onGoal) this.toast(`Kopfball ${first}!`, 0.9);
      else if (e.type === 'tackle') this.toast(`Saubere Grätsche, ${first}!`, 1.1);
      else if (e.type === 'scrape') this.toast(`Autsch! ${e.label} für ${first}`, 1.8);
      else if (e.type === 'save') this.toast(`${first} pariert!`, 1.2);
      else if (e.type === 'miscontrol') this.toast(`Verspringt ${first}…`, 1);
      else if (e.type === 'halftime') this.toast(`HALBZEIT ${match.score[0]}:${match.score[1]} – Seitenwechsel, jetzt Angriff nach ${match.humanTeam !== null && attackDir(match, match.humanTeam) > 0 ? 'links' : 'rechts'}`, 3.5, 4);
      else if (e.type === 'sub_requested') this.toast('Wechsel angemeldet – beim nächsten Stopp', 1.4, 2);
      else if (e.type === 'sub') {
        const out = findAnyPlayer(match, e.outId);
        const inn = findAnyPlayer(match, e.inId);
        this.toast(`Wechsel ${short(e.team)}: ${inn.name.split(' ')[0]} für ${out.name.split(' ')[0]}`, 1.6, 2);
      } else if (e.type === 'incident') this.toast(e.text, e.stage === 'start' ? 3.5 : 2.5, 5);
      else if (e.type === 'lightning') this.lightning();
      else if (e.type === 'end') this.toast('ABPFIFF', 2, 9);
    }
  }

  update(match, dt) {
    if (this.introPending) {
      this.toast(this.introPending, 2.5, 2);
      this.introPending = null;
    }
    for (const w of ['rain', 'fog', 'snow', 'frost']) document.body.classList.toggle(`weather-${w}`, match.weather === w);
    const r = match.referee;
    if (r && r.name !== this.refName) {
      // Ersatzschiri übernimmt: Kopfzeile nachziehen.
      if (this.refName) this.$('.venue').textContent = `${match.pitch.name} · ${match.pitch.surface.name} · Schiri: ${r.name}`;
      this.refName = r.name;
    }
    this.updateEdges(match);
    const [a, b] = match.score;
    this.$('.score').textContent = `${a} : ${b}`;
    this.$('.clock').textContent = `${match.half}. HZ · ${matchMinute(match, match.time)}'`;

    if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.hideToast();

    const p = getPlayer(match, match.controlledId);
    this.$('.card').hidden = !p;
    if (!p) return;
    if (p.id !== this.lastControlled) {
      this.lastControlled = p.id;
      this.$('.name').textContent = p.name;
      this.$('.meta').textContent = `${p.age} J. · ${p.profession}`;
      const tier = tierById(p.tier);
      const line = this.$('.tierline');
      line.style.setProperty('--c', tier.color);
      line.innerHTML = `<span class="badge">${tier.name}</span> Stärke ${p.rating} · ${POSITIONS[p.position] ?? ''}${p.title ? ` · <b>${p.title}</b>` : ''}`;
      this.$('.traits').innerHTML = p.traits.length
        ? p.traits.map((id) => `<span title="${TRAITS[id].desc}">${TRAITS[id].name}</span>`).join('')
        : '<em>keine Besonderheiten</em>';
    }
    const injury = p.injury ? `${p.injury.label}${p.injury.severity > 1 ? ` ×${p.injury.severity}` : ''}` : '';
    if (this.$('.injury').textContent !== injury) this.$('.injury').textContent = injury;
    this.$('.stamina i').style.width = `${Math.round(p.stamina * 100)}%`;
    this.$('.charge i').style.width = `${Math.round(p.charge * 100)}%`;
  }
}
