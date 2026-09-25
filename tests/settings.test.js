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
