import { describe, expect, it } from 'vitest';
import { createCareer } from '../src/career/career.js';
import { Clubhouse } from '../src/ui/Clubhouse.js';

// UI 3.0 Phase 6: Gruppenchat im Handy. Erster Blick in der Woche = Sperrbildschirm (neue
// Nachrichten), danach direkt der Chat. Inhalte und Entscheidungen bleiben dieselben wie vorher.
function house(c) {
  const h = new Clubhouse({ addEventListener() {} }, { onChange() {} });
  h.career = c;
  return h;
}

describe('Handy mit Gruppenchat', () => {
  it('Sperrbildschirm beim ersten Blick, danach Chat mit allen Nachrichten, Entscheidung und Nachhaken', () => {
    const c = createCareer({ seed: 21 });
    const h = house(c);
    const lock = h.tab_chat();
    expect(lock).toContain('lock-time');
    expect(lock).toContain('data-action="phone-open"');
    expect(lock).toContain('m-hand-back');
    h.phoneView = 'app';
    const app = h.tab_chat();
    expect(app).toContain('class="phone-stage open"');
    // jede Nachricht der Woche steht im Chat (Blase je Eintrag)
    expect((app.match(/class="bubble/g) ?? []).length).toBe(c.week.chat.length);
    if (c.week.event && c.week.event.choice === null) expect(app).toContain('data-action="event"');
    expect(app).toContain('data-action="phone-lock"');
    // Gleiche Woche: kein erneuter Sperrbildschirm
    expect(h.tab_chat()).not.toContain('lock-time');
  });

  it('neue Woche: wieder zuerst der Sperrbildschirm; Vorschau auf dem Sperrbildschirm ohne HTML', () => {
    const c = createCareer({ seed: 22 });
    const h = house(c);
    h.tab_chat();
    h.phoneView = 'app';
    c.round += 1;
    expect(h.tab_chat()).toContain('lock-time');
    c.week.chat.push({ from: c.week.chat.find((m) => m.from != null)?.from ?? null, text: '<img src=x onerror=alert(1)>Moin', time: 'So 09:59' });
    h.phoneWeek = null;
    expect(h.tab_chat()).not.toContain('<img src=x');
  });
});
