import { tr } from '../core/i18n.js';
import { keyLabel } from '../input/Input.js';
import { TRAITS } from '../data/traits.js';
import { tierById } from '../data/tiers.js';
import { POSITIONS } from '../sim/generator.js';
import { jobName } from '../data/names.js';
import { jobPerk } from '../data/jobs.js';
import { findAnyPlayer } from '../sim/squad.js';
import { REF_TRAITS } from '../sim/referee.js';
import { attackDir, getPlayer } from '../sim/match.js';
import { shootoutScore } from '../sim/shootout.js';
import { crestOf, crestSVG } from './crest.js';
import { SHOUTS } from '../sim/coach.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

// Anzeige in "Fußballminuten": die Spielzeit wird auf 90 Minuten hochgerechnet.
export const matchMinute = (match, t) => Math.min(90, Math.floor((t / match.duration) * 90) + 1);

export class Hud {
  constructor(root) {
    root.innerHTML = `
      <div class="scoreboard">
        <div class="board">
          <span class="team" data-t="0"></span>
          <span class="score"><b></b><i>:</i><b></b></span>
          <span class="team" data-t="1"></span>
        </div>
        <span class="clock"></span>
      </div>
      <div class="venue"></div>
      <div class="toast" hidden></div>
      <div class="coach-bubble" hidden></div>
      <div class="flash"></div>
      <div class="edge left"></div>
      <div class="edge right"></div>
      <div class="card">
        <div class="name"></div>
        <div class="meta"></div>
        <div class="perk"></div>
        <div class="tierline"></div>
        <div class="traits"></div>
        <div class="injury"></div>
        <div class="bar stamina"><i></i><span>${tr('Puste', 'Stamina')}</span></div>
        <div class="bar charge"><i></i><span>${tr('Schuss', 'Shot')}</span></div>
      </div>
      <div class="help">${helpText()}      </div>`;
    this.root = root;
    this.$ = (sel) => root.querySelector(sel);
    this.toastTimer = 0;
    this.refreshHelp = () => (this.$('.help').innerHTML = helpText());
    this.lastControlled = null;
  }

  init(match) {
    const r = match.referee;
    this.introPending = match.derby ? `DERBY! ${r ? `${tr('Schiri', 'Referee')}: ${r.name}` : tr('Heute wird es heiß.', 'It is going to get heated.')}` : r ? `${tr('Schiri heute', 'Referee today')}: ${r.name} (${REF_TRAITS[r.trait].name})` : null;
    match.teams.forEach((t, i) => {
      const el = this.root.querySelector(`.team[data-t="${i}"]`);
      const crest = t.crest ?? crestOf({ id: t.name, kit: t.clubKits?.kit ?? t.kit });
      el.innerHTML = `${crestSVG(crest, { size: 20, label: t.name })}<span>${t.name}</span>`;
      el.style.setProperty('--kit', hex(t.kit.shirt));
    });
    this.$('.venue').textContent = `${match.pitch.name} · ${match.pitch.surface.name}${r ? ` · ${tr('Schiri', 'Referee')}: ${r.name}` : ''}`;
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
    const attack = `<span>${tr('ANGRIFF', 'ATTACK')}</span><b>${s > 0 ? '▶' : '◀'}</b>`;
    const own = `<span>${tr('EIGENES TOR', 'OWN GOAL')}</span>`;
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
      if (e.type === 'shout') {
        const b = this.$('.coach-bubble');
        b.textContent = tr(`„${SHOUTS[e.shout].label}“`, `“${SHOUTS[e.shout].label}”`);
        b.hidden = false;
        b.classList.remove('pop');
        void b.offsetWidth; // Animation neu starten
        b.classList.add('pop');
        clearTimeout(this.bubbleTimer);
        this.bubbleTimer = setTimeout(() => (b.hidden = true), 1600);
      }
      const p = e.playerId && findAnyPlayer(match, e.playerId);
      const first = p ? p.name.split(' ')[0] : '';
      if (e.type === 'goal') {
        const scorer = e.scorerId && findAnyPlayer(match, e.scorerId);
        const kind = e.ownGoal ? tr('EIGENTOR!', 'OWN GOAL!') : e.via === 'header' ? tr('KOPFBALLTOR!', 'HEADED GOAL!') : tr('TOR!', 'GOAL!');
        this.toast(`${kind} ${scorer?.name ?? ''}`, 2.4, 3);
      } else if (e.type === 'grab') this.toast(tr(`${first} hält am Trikot fest …`, `${first} grabs a shirt …`), 0.9);
      else if (e.type === 'whiff') this.toast(tr(`Luftloch von ${first}!`, `Air shot from ${first}!`), 1.4);
      else if (e.type === 'foul') {
        const victim = findAnyPlayer(match, e.victimId);
        this.toast(tr(`${e.kind === 'hold' ? 'Festhalten' : 'Foul'} von ${first}! Freistoß für ${short(victim.team)}`, `${e.kind === 'hold' ? 'Holding' : 'Foul'} by ${first}! Free kick to ${short(victim.team)}`), 1.8, 2);
      } else if (e.type === 'car') this.toast(tr(`Ans Auto, ${first}! Ball für ${short(e.team)}`, `Off a car, ${first}! Ball to ${short(e.team)}`), 1.8, 2);
      else if (e.type === 'out') {
        const text = tr({ throwin: 'Einwurf', corner: 'Ecke', goalkick: 'Abstoß' }, { throwin: 'Throw-in', corner: 'Corner', goalkick: 'Goal kick' })[e.restart];
        this.toast(`${text} ${short(e.team)}`, 1.2);
      } else if (e.type === 'complain') this.toast(`${first}: „${e.line}“`, 1.6, 2);
      else if (e.type === 'card') {
        const text = e.color === 'yellow' ? tr(`Gelb für ${p.name}${e.reason === 'meckern' ? ' – wegen Meckern' : ''}`, `Yellow for ${p.name}${e.reason === 'meckern' ? ' – for dissent' : ''}`) : tr(`GELB-ROT! ${p.name} muss runter`, `SECOND YELLOW! ${p.name} is off`);
        this.toast(text, 2, 3);
      } else if (e.type === 'no_call') this.toast(tr('Schiri lässt laufen!', 'Ref waves play on!'), 1.2, 2);
      else if (e.type === 'post') this.toast(tr('Pfosten!', 'Off the post!'), 1.2);
      else if (e.type === 'bar') this.toast(tr('Latte!', 'Off the bar!'), 1.2);
      else if (e.type === 'header' && e.onGoal) this.toast(tr(`Kopfball ${first}!`, `Header from ${first}!`), 0.9);
      else if (e.type === 'tackle') this.toast(tr(`Saubere Grätsche, ${first}!`, `Clean tackle, ${first}!`), 1.1);
      else if (e.type === 'scrape') this.toast(tr(`Autsch! ${e.label} für ${first}`, `Ouch! ${e.label} for ${first}`), 1.8);
      else if (e.type === 'save') this.toast(tr(`${first} pariert!`, `Saved by ${first}!`), 1.2);
      else if (e.type === 'miscontrol') this.toast(tr(`Verspringt ${first}…`, `Bad touch, ${first}…`), 1);
      else if (e.type === 'halftime') this.toast(tr(`HALBZEIT ${match.score[0]}:${match.score[1]} – Seitenwechsel, jetzt Angriff nach ${match.humanTeam !== null && attackDir(match, match.humanTeam) > 0 ? 'links' : 'rechts'}`, `HALF-TIME ${match.score[0]}-${match.score[1]} – switching ends, now attacking to the ${match.humanTeam !== null && attackDir(match, match.humanTeam) > 0 ? 'left' : 'right'}`), 3.5, 4);
      else if (e.type === 'sub_requested') this.toast(tr('Wechsel angemeldet – beim nächsten Stopp', 'Substitution requested – at the next stoppage'), 1.4, 2);
      else if (e.type === 'sub') {
        const out = findAnyPlayer(match, e.outId);
        const inn = findAnyPlayer(match, e.inId);
        this.toast(tr(`Wechsel ${short(e.team)}: ${inn.name.split(' ')[0]} für ${out.name.split(' ')[0]}`, `Sub ${short(e.team)}: ${inn.name.split(' ')[0]} for ${out.name.split(' ')[0]}`), 1.6, 2);
      } else if (e.type === 'incident') this.toast(e.text, e.stage === 'start' ? 3.5 : 2.5, 5);
      else if (e.type === 'lightning') this.lightning();
      else if (e.type === 'end') this.toast(match.shootout?.done ? tr(`ENTSCHIEDEN – ${short(shootoutScore(match.shootout)[0] > shootoutScore(match.shootout)[1] ? 0 : 1)} gewinnt im Elfmeterschießen`, `DECIDED – ${short(shootoutScore(match.shootout)[0] > shootoutScore(match.shootout)[1] ? 0 : 1)} win on penalties`) : tr('ABPFIFF', 'FULL TIME'), 3, 9);
      else if (e.type === 'setpiece' && e.playerId === match.controlledId && (e.kind === 'freekick' || e.kind === 'corner')) {
        const k = (a) => keyLabel(a);
        this.toast(
          e.kind === 'corner'
            ? tr(`Ecke: ${k('pass')} kurz · ${k('loft')} hoch an den langen Pfosten · ${k('shoot')} scharf an den ersten`, `Corner: ${k('pass')} short · ${k('loft')} high to the far post · ${k('shoot')} driven to the near post`)
            : tr(`Freistoß: Richtung mit den Pfeilen · ${k('shoot')} Schuss (halten = fester) · ${k('pass')} Pass · ${k('loft')} hoch`, `Free kick: aim with the arrows · ${k('shoot')} shoot (hold = harder) · ${k('pass')} pass · ${k('loft')} lofted`),
          2.8,
          3,
        );
      } else if (e.type === 'fulltime_draw') this.toast(tr(`Unentschieden – ${match.pitch.id === 'halle' ? 'Siebenmeterschießen' : 'Elfmeterschießen'}!`, 'All square – penalties!'), 2.5, 6);
      else if (e.type === 'shootout_kick') {
        const shooter = findAnyPlayer(match, e.shooterId);
        const mine = e.team === match.humanTeam;
        const up = keyLabel('up');
        const down = keyLabel('down');
        this.toast(mine ? tr(`${shooter.name} läuft an – ${up}/${down} zielen, ${keyLabel('shoot')} halten und loslassen`, `${shooter.name} steps up – ${up}/${down} to aim, hold and release ${keyLabel('shoot')}`) : tr(`${shooter.name} schießt – ${up}/${down}: wohin springt dein Keeper?`, `${shooter.name} to shoot – ${up}/${down}: which way does your keeper dive?`), 3, 5);
      } else if (e.type === 'pen_goal') this.toast(tr(`Drin! ${p?.name ?? ''}`, `Scored! ${p?.name ?? ''}`), 1.4, 6);
      else if (e.type === 'pen_miss') this.toast(tr(`Nicht drin! ${p?.name ?? ''}`, `Missed! ${p?.name ?? ''}`), 1.4, 6);
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
      if (this.refName) this.$('.venue').textContent = `${match.pitch.name} · ${match.pitch.surface.name} · ${tr('Schiri', 'Referee')}: ${r.name}`;
      this.refName = r.name;
    }
    this.updateEdges(match);
    const [a, b] = match.score;
    const [da, db] = this.root.querySelectorAll('.score b');
    if (da.textContent !== String(a)) da.textContent = a;
    if (db.textContent !== String(b)) db.textContent = b;
    const so = match.shootout;
    if (so) {
      // Elfmeterschießen: Punkte je Schütze (● drin, ○ vorbei) statt Uhr.
      const dots = (t) => so.kicks[t].map((k) => (k ? '●' : '○')).join('') || '–';
      const [pa, pb] = shootoutScore(so);
      this.$('.clock').textContent = `${tr('i. E.', 'pens')} ${pa}:${pb} · ${dots(0)} | ${dots(1)}`;
    } else this.$('.clock').textContent = `${match.half}${tr('. HZ', 'H')} · ${matchMinute(match, match.time)}'`;

    if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.hideToast();

    const p = getPlayer(match, match.controlledId);
    this.$('.card').hidden = !p;
    if (!p) return;
    if (p.id !== this.lastControlled) {
      this.lastControlled = p.id;
      this.$('.name').textContent = p.name;
      this.$('.card').style.setProperty('--kit', hex(match.teams[p.team].kit.shirt));
      this.$('.meta').textContent = `${p.age}${tr(' J.', ' yrs')} · ${jobName(p.profession)}`;
      const perk = jobPerk(p.profession);
      this.$('.perk').textContent = perk ? perk.label : '';
      const tier = tierById(p.tier);
      const line = this.$('.tierline');
      line.style.setProperty('--c', tier.color);
      line.innerHTML = `<span class="badge">${tier.name}</span> ${tr('Stärke', 'Rating')} ${p.rating} · ${POSITIONS[p.position] ?? ''}${p.title ? ` · <b>${p.title}</b>` : ''}`;
      this.$('.traits').innerHTML = p.traits.length
        ? p.traits.map((id) => `<span title="${TRAITS[id].desc}">${TRAITS[id].name}</span>`).join('')
        : `<em>${tr('keine Besonderheiten', 'no special traits')}</em>`;
    }
    const injury = p.injury ? `${p.injury.label}${p.injury.severity > 1 ? ` ×${p.injury.severity}` : ''}` : '';
    if (this.$('.injury').textContent !== injury) this.$('.injury').textContent = injury;
    this.$('.stamina i').style.width = `${Math.round(p.stamina * 100)}%`;
    this.$('.charge i').style.width = `${Math.round(p.charge * 100)}%`;
  }
}

// Tastenhilfe aus der aktuellen Belegung (Einstellungen → Tastenbelegung).
function helpText() {
  const k = (a) => `<b>${keyLabel(a)}</b>`;
  const arrows = ['up', 'down', 'left', 'right'].map(keyLabel).join('') === '↑↓←→' ? tr('<b>Pfeile</b>', '<b>Arrows</b>') : `<b>${['up', 'left', 'down', 'right'].map(keyLabel).join('')}</b>`;
  return tr(
    `${arrows} laufen · ${k('sprint')} sprinten · ${k('shoot')} Schuss (halten = fester) · ${k('pass')} Pass · ${k('loft')} hoher Ball ·
        ${k('hold')} halten (abschirmen / festhalten) · ${k('tackle')} Grätsche · ${k('poke')} stochern · ${k('switchPlayer')} Spieler wechseln · ${k('sub')} Auswechseln · <b>C</b> Tempo · <b>N</b> Ton · <b>G</b> Effekte · <b>F2</b> Screenshot · <b>H</b> Hilfe`,
    `${arrows} run · ${k('sprint')} sprint · ${k('shoot')} shoot (hold = harder) · ${k('pass')} pass · ${k('loft')} lofted ball ·
        ${k('hold')} hold (shield / grab) · ${k('tackle')} slide tackle · ${k('poke')} poke · ${k('switchPlayer')} switch player · ${k('sub')} substitute · <b>C</b> tempo · <b>N</b> sound · <b>G</b> effects · <b>F2</b> screenshot · <b>H</b> help`,
  );
}
