// Zuschauer: dieselben prozeduralen Normalos wie die Spieler, nur in Zivil.
import { generatePlayer } from '../sim/generator.js';
import { createPlayerModel } from './PlayerModel.js';

const TOPS = [0x5a6b7d, 0x8c3b3b, 0x3f5e45, 0xc9b27a, 0x2f2f3a, 0x9a6b4f, 0x6b4f8c, 0xd8d0c0];
const BOTTOMS = [0x3b4d6b, 0x2a2a2a, 0x5a5048, 0x6b6b6b];

export function makeSpectator(rng, { x, z, facing = 0, sitting = false } = {}) {
  const person = generatePlayer(rng, { role: 'fan' });
  const kit = { shirt: rng.pick(TOPS), shorts: rng.pick(BOTTOMS), socks: rng.pick(BOTTOMS) };
  const model = createPlayerModel(person.look, kit);
  model.group.position.set(x, 0, z);
  model.group.rotation.y = facing;
  if (sitting) {
    model.body.position.y = -0.4;
    for (const leg of model.legs) leg.rotation.x = -1.45;
  }
  // Hände in die Hüften oder verschränkt – Zuschauer stehen nur rum.
  model.arms[0].rotation.z = 0.25;
  model.arms[1].rotation.z = -0.25;
  if (model.plaster) model.plaster.visible = false;
  return model.group;
}
