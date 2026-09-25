import { describe, expect, it } from 'vitest';
import { bindingOf, keyName, resetBindings, setBinding } from '../src/input/Input.js';
import { applyColorSafeKits, SAFE_KITS } from '../src/render/colorSafe.js';

describe('key bindings', () => {
  it('rebinds an action and swaps when the key is already taken', () => {
    resetBindings();
    setBinding('shoot', 'KeyJ');
    expect(bindingOf('shoot')).toEqual(['KeyJ']);
    setBinding('pass', 'KeyJ'); // J lag auf Schuss → Schuss bekommt S
    expect(bindingOf('pass')).toEqual(['KeyJ']);
    expect(bindingOf('shoot')).toEqual(['KeyS']);
    resetBindings();
    expect(bindingOf('shoot')).toEqual(['KeyW', 'Space']);
  });

  it('shows readable key names', () => {
    expect(keyName('KeyW')).toBe('W');
    expect(keyName('ArrowUp')).toBe('↑');
    expect(keyName('ShiftLeft')).toBe('Shift');
  });
});

describe('colour-blind safe kits', () => {
  it('recolours both teams and restores the club colours', () => {
    const m = { teams: [{ kit: { shirt: 0xc8352f }, keeperKit: { shirt: 0x2e8b57 } }, { kit: { shirt: 0x2f6fb5 }, keeperKit: { shirt: 0x111111 } }] };
    applyColorSafeKits(m, true);
    expect(m.teams[0].kit.shirt).toBe(SAFE_KITS[0].kit.shirt);
    expect(m.teams[1].keeperKit.shirt).toBe(SAFE_KITS[1].keeper.shirt);
    applyColorSafeKits(m, false);
    expect(m.teams[0].kit.shirt).toBe(0xc8352f);
  });
});

describe('save slots, export and import', () => {
  const memory = () => {
    const d = {};
    return { getItem: (k) => d[k] ?? null, setItem: (k, v) => (d[k] = String(v)), removeItem: (k) => delete d[k], d };
  };
  const coach = { first: 'Sam', last: 'Baker', age: 40, relation: 'single', profession: 'Elektriker', style: 'libero', children: [] };

  it('keeps three independent slots; slot 1 uses the old key', async () => {
    const { createCareer, saveCareer, loadCareer, setActiveSlot, slotSummaries, deleteCareer } = await import('../src/career/career.js');
    const st = memory();
    const a = createCareer({ seed: 1, coach });
    const b = createCareer({ seed: 2, coach });
    saveCareer(a, st, 1);
    saveCareer(b, st, 3);
    expect(st.d['sunday-league:career']).toBeTruthy();
    expect(loadCareer(st, 3).seed).toBe(2);
    expect(loadCareer(st, 2)).toBeNull();
    setActiveSlot(3, st);
    expect(loadCareer(st).seed).toBe(2);
    const sums = slotSummaries(st);
    expect(sums.map((x) => !!x.empty)).toEqual([false, true, false]);
    expect(sums[0].club).toBeTruthy();
    deleteCareer(st, 3);
    expect(loadCareer(st, 3)).toBeNull();
  });

  it('exports to a file and imports it back; rejects foreign files', async () => {
    const { createCareer, exportCareer, importCareer } = await import('../src/career/career.js');
    const c = createCareer({ seed: 5, coach });
    const back = importCareer(exportCareer(c));
    expect(back.seed).toBe(5);
    expect(back.clubs.length).toBe(c.clubs.length);
    expect(() => importCareer('kein json')).toThrow('json');
    expect(() => importCareer('{"hallo": 1}')).toThrow('format');
  });
});
