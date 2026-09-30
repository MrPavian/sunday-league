import { describe, expect, it } from 'vitest';
import { answerCard, stepCoachFeed } from '../src/sim/coachfeed.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { PITCHES } from '../src/sim/pitch.js';
import { chatCount, coachChat } from '../src/ui/benchChat.js';

// UI 3.0 Phase 5: Der Co-Trainer-Chat liest nur m.feed – keine eigene Wahrheit, kein Einfluss aufs Spiel.
const fake = () => {
  const m = createMatch({ seed: 4, pitch: PITCHES.ascheplatz, human: false });
  m.time = 400;
  m.feed = {
    shown: [{ type: 'OPP_FLANK', lane: 'left', t: 100, half: 1 }, { type: 'PRESS_TIRING', lane: null, t: 250, half: 1 }, { type: 'SECOND_BALLS', lane: null, t: 390, half: 2 }],
    followUps: [{ type: 'OPP_FLANK', lane: 'left', decidedAt: 104, choice: 'guard:links', label: 'Links dicht', severity: 0.7, done: true, result: 'better', text: 'Links ist jetzt dichter.' }],
    lastCard: 390,
    nextCheck: 401,
  };
  m.coachCard = { type: 'SECOND_BALLS', title: 'Zweite Bälle', text: 'Wir sind nicht da.', options: [{ label: 'Nachrücken' }, { label: 'Frei spielen lassen' }], t: 390 };
  return m;
};

describe('Co-Trainer-Chat', () => {
  it('Karte → Antwort → Nachkontrolle; abgelaufene Karte ohne Antwort; offene Karte mit Antworten', () => {
    const m = fake();
    const chat = coachChat(m, new Map([[100, { title: 'Links brennt es', text: 'Die kommen immer über links.' }]]));
    expect(chat.map((e) => e.kind)).toEqual(['card', 'answer', 'follow', 'card', 'missed', 'card']);
    expect(chat[0].title).toBe('Links brennt es');
    expect(chat[1]).toMatchObject({ from: 'me', text: 'Links dicht' });
    expect(chat[2]).toMatchObject({ result: 'better', text: 'Links ist jetzt dichter.' });
    expect(chat[3].title).not.toBe(''); // ohne gemerkten Titel: neutraler Titel statt nichts
    expect(chat[5]).toMatchObject({ pending: true, title: 'Zweite Bälle', options: ['Nachrücken', 'Frei spielen lassen'] });
    expect(chatCount(m)).toBe(3 + 1 + 1);
  });

  it('ohne Feed leer; Lesen verändert den Feed nicht', () => {
    const m = createMatch({ seed: 4, pitch: PITCHES.ascheplatz, human: false });
    expect(coachChat(m)).toEqual([]);
    expect(chatCount(m)).toBe(0);
    const f = fake();
    const before = JSON.stringify(f.feed);
    coachChat(f);
    chatCount(f);
    expect(JSON.stringify(f.feed)).toBe(before);
  });

  it('echter Ablauf: eine Karte kommt, wird im Chat beantwortet und erscheint als Antwort', () => {
    const m = createMatch({ seed: 9, pitch: PITCHES.ascheplatz, human: false, duration: 300 });
    let card = null;
    for (let i = 0; i < 60 * 300 && !card; i++) {
      stepMatch(m, undefined, 1 / 60);
      card = m.coachCard ?? stepCoachFeed(m, 0);
      m.events.length = 0;
    }
    expect(card).not.toBeNull();
    expect(coachChat(m).at(-1)).toMatchObject({ kind: 'card', pending: true });
    answerCard(m, 0, 0);
    const chat = coachChat(m);
    expect(chat.at(-1)).toMatchObject({ kind: 'answer', from: 'me', text: card.options[0].label });
  }, 60_000);
});
