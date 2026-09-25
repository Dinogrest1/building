import { HVAC } from './config.js';
import { UNIT } from './utils.js';

const FAN_ROT = [Math.PI / 2, 0, 0]; // cylinder axis Y → facade normal

/**
 * External split-system AC unit mounted on the facade.
 * Casing + recessed fan with grille bars + side louvres + wall brackets.
 */
export function createHVACUnit(placer, unit, mats) {
  const { u, v, w, h, d } = unit;
  const L = 'hvac';
  const z0 = HVAC.standoff;
  const zf = z0 + d; // front face

  // casing
  placer.box(L, mats.hvac, u, v, z0 + d / 2, w, h, d);

  // fan (dark recessed disc) on the right 60 % of the front
  const r = Math.min(HVAC.fanRadius * (h / HVAC.height), h * 0.4);
  const fu = u + w * 0.17;
  placer.instance(L, UNIT.cylinder, mats.hvacGrille, [fu, v, zf + 0.004], FAN_ROT, [r, 0.01, r]);
  // grille bars across the fan
  for (let i = -2; i <= 2; i++) {
    placer.box(L, mats.hvac, fu, v + i * r * 0.38, zf + 0.012, r * 2.02, 0.012, 0.01, { castShadow: false });
  }
  placer.box(L, mats.hvac, fu, v, zf + 0.014, 0.012, r * 2.02, 0.01, { castShadow: false });

  // side louvres on the left part
  const lu = u - w * 0.3;
  for (let i = 0; i < 4; i++) {
    placer.box(L, mats.hvacGrille, lu, v - h * 0.3 + i * h * 0.2, zf + 0.004, w * 0.28, 0.02, 0.008, { castShadow: false });
  }

  // wall brackets (L-shaped)
  for (const s of [-1, 1]) {
    const bu = u + s * w * 0.35;
    placer.box(L, mats.metal, bu, v - h / 2 - 0.02, (z0 + d) / 2, 0.035, 0.035, z0 + d);
    placer.box(L, mats.metal, bu, v - h / 2 + 0.02, 0.012, 0.035, 0.12, 0.024);
  }
}

