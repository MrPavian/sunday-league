import { describe, expect, it } from 'vitest';
import { createMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { commitment, setOrder } from '../src/sim/plan.js';
import { anchor, updateTactics } from '../src/sim/ai.js';
import { dribbleTouch } from '../src/sim/actions.js';
import { attackDir } from '../src/sim/players.js';
import { STYLES } from '../src/sim/tactics.js';
import { detectSituations } from '../src/sim/situations.js';

const newMatch = (seed = 1) => {
  const m = createMatch({ seed, pitch: PITCHES.ascheplatz, human: false, aiCoach: false });
  m.phase = 'play';
  return m;
};

describe('Trainermodus 2.0 – Spielregeln', () => {
  // B1: Ein gerade gespielter Pass am Presser vorbei ist ein Duell (Passwert gegen Zweikampf),
  // nicht mehr automatisch weg, sobald ein Gegner in Reichweite steht.
  it('Pass am Presser vorbei: gelingt dem guten Passspieler öfter als dem schlechten', () => {
    const through = (passing) => {
      let ok = 0;
      for (let seed = 1; seed <= 120; seed++) {
        const m = newMatch(seed);
        const s = attackDir(m, 0);
        const k = m.players.find((p) => p.team === 0 && p.role !== 'gk');
        const o = m.players.find((p) => p.team === 1 && p.role !== 'gk');
        for (const p of m.players) if (p !== k && p !== o) p.pos = { x: -s * 15, z: 8 };
        k.attrs.passing = passing;
        o.attrs.tackling = 0.5;
        k.pos = { x: 0, z: 0 };
        k.kickCooldown = 0.35;
        o.pos = { x: s * 0.5, z: 0.3 };
        o.kickCooldown = 0;
        Object.assign(m.ball, { holder: null, lastTouch: k.id, lastAction: 'pass' });
        m.ball.pos = { x: s * 0.4, y: 0.11, z: 0 };
        m.ball.vel = { x: s * 10, y: 0, z: 0 };
        m.lastPass = { playerId: k.id, team: 0, time: m.time };
        dribbleTouch(m);
        if (m.ball.lastTouch === k.id) ok++;
      }
      return ok / 120;
    };
    const lo = through(0.2);
    const hi = through(0.9);
    expect(hi).toBeGreaterThan(lo + 0.2);
    expect(lo).toBeGreaterThan(0); // auch der schlechte Passspieler bringt ihn mal durch
    expect(hi).toBeLessThan(1); // und der gute nicht immer
  });

  // B2: Engagement nach vorn folgt den Befehlen – 0 ohne Befehl im ausgewogenen Stil.
  it('Engagement: 0 ohne Befehl, positiv beim Angreifen, negativ beim Absichern', () => {
    const m = newMatch();
    expect(commitment(m, 0)).toBeCloseTo(0);
    setOrder(m, 0, 'shape', 'aufruecken');
    setOrder(m, 0, 'risk', 'aggressiv');
    expect(commitment(m, 0)).toBeGreaterThan(0.4);
    const d = newMatch();
    setOrder(d, 0, 'press', 'tief');
    setOrder(d, 0, 'guard', 'konter');
    setOrder(d, 0, 'risk', 'sicher');
    expect(commitment(d, 0)).toBeLessThan(-0.5);
  });

  // B2: Steht die gegnerische Abwehr hoch, bleibt der Stürmer gegen den Ball vorne (lauert);
  // steht sie tief, arbeitet er mit nach hinten.
  it('Stürmer lauert nur, wenn hinter der gegnerischen Abwehr Platz ist', () => {
    const fwdAnchor = (lineAdv) => {
      const m = newMatch(4);
      const s = attackDir(m, 0);
      for (const p of m.players.filter((q) => q.team === 1 && q.role !== 'gk')) p.pos = { x: lineAdv * m.pitch.halfLength * s, z: p.pos.z };
      m.ball.pos = { x: -s * 5, y: 0.11, z: 0 };
      m.lastTouchTeam = 1;
      updateTactics(m, 1 / 60);
      const f = m.players.find((p) => p.team === 0 && p.role === 'fwd');
      return (anchor(m, f, false).x * s) / m.pitch.halfLength;
    };
    const high = fwdAnchor(0.2); // Gegner-Abwehr knapp in ihrer Hälfte, viel Platz dahinter
    const deep = fwdAnchor(0.75); // Gegner-Abwehr vor dem eigenen Strafraum
    expect(high).toBeGreaterThan(deep + 0.05);
  });

  // B2: Kurz nach dem Ballverlust presst nicht mit, wer vor dem Ball stand.
  it('Umschaltmoment: wer beim Ballverlust vor dem Ball stand, ist kurz aus dem Spiel', () => {
    const m = newMatch(6);
    const s = attackDir(m, 0);
    const up = m.players.find((p) => p.team === 0 && p.role === 'fwd');
    m.ball.pos = { x: 0, y: 0.11, z: 0 };
    up.pos = { x: s * 6, z: 0 };
    m.lastTouchTeam = 0;
    updateTactics(m, 1 / 60);
    m.lastTouchTeam = 1; // Ballverlust
    m.time += 0.1;
    updateTactics(m, 1 / 60);
    expect(m.tactics[up.id].type).toBe('zone');
    expect(m.tactics[up.id].x * s).toBeLessThan(up.pos.x * s); // auf dem Rückweg
    expect(m.chasers[0]).not.toBe(up.id);
  });

  // B3: Stile entsprechen ihrer Beschreibung.
  it('Mauern schießt nicht eifriger als ausgewogen; Kurzpass bestraft kurze Pässe nach vorn nicht', () => {
    expect(STYLES.mauern.shoot).toBeLessThanOrEqual(STYLES.ausgewogen.shoot);
    // Netto je Meter Raumgewinn: Vorwärtsgewicht minus Längenstrafe darf nicht deutlich negativ sein.
    expect(STYLES.kurzpass.forward - STYLES.kurzpass.shortPass).toBeGreaterThan(-0.01);
  });

  // B4: Die Schlussphasen-Karte bietet nur an, was gemessen wirkt (siehe situations.js).
  it('Schlussphase: knapp vorne Ball halten/Konter, sonst Mehr Risiko/So weiterspielen – nicht „tief stehen"', () => {
    const card = (score) => {
      const m = newMatch(2);
      m.log = { poss: [], turnovers: [], passes: [], shots: [], samples: [] };
      m.time = m.duration * 0.85;
      m.score = score;
      return detectSituations(m, 0).find((s) => s.type === 'ENDGAME');
    };
    const lead = card([1, 0]);
    expect(lead.options.map((o) => `${o.group}:${o.value}`)).toEqual(['build:halten', 'route:konter']);
    for (const sc of [[0, 1], [0, 0]]) expect(card(sc).options.map((o) => `${o.group}:${o.value}`)).toEqual(['risk:aggressiv', 'risk:null']);
  });
});
