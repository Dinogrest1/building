import * as THREE from 'three';
import { UNIT } from './utils.js';

const L = 'roof';

/**
 * Rooftop equipment layout, traced from the reference.
 * a: 0 = left end … 1 = right end, b: 0 = front parapet … 1 = back parapet.
 */
const ROOF_ITEMS = [
  { type: 'ahu', a: 0.075, b: 0.86, size: [2.3, 1.0, 1.7], top: true },
  { type: 'ahu', a: 0.2, b: 0.62, size: [2.0, 0.85, 1.6], top: true },
  { type: 'ahu', a: 0.9, b: 0.66, size: [2.2, 0.9, 1.6], top: true },
  { type: 'box', a: 0.1, b: 0.16, s: 0.85 },
  { type: 'box', a: 0.145, b: 0.1, s: 0.7 },
  { type: 'box', a: 0.045, b: 0.42, s: 0.8 },
  { type: 'box', a: 0.035, b: 0.18, s: 0.6 },
  { type: 'box', a: 0.14, b: 0.86, s: 0.75 },
  { type: 'box', a: 0.29, b: 0.18, s: 0.8 },
  { type: 'box', a: 0.51, b: 0.65, s: 1.0 },
  { type: 'box', a: 0.535, b: 0.8, s: 0.75 },
  { type: 'box', a: 0.505, b: 0.12, s: 0.85 },
  { type: 'box', a: 0.795, b: 0.62, s: 0.8 },
  { type: 'box', a: 0.745, b: 0.12, s: 0.85 },
  { type: 'box', a: 0.82, b: 0.2, s: 0.7 },
  { type: 'box', a: 0.905, b: 0.2, s: 0.9 },
  { type: 'box', a: 0.955, b: 0.44, s: 0.75 },
  { type: 'box', a: 0.97, b: 0.78, s: 0.7 },
  { type: 'vent', a: 0.825, b: 0.74 },
  { type: 'vent', a: 0.345, b: 0.5 },
  { type: 'vent', a: 0.64, b: 0.32 },
  { type: 'vent', a: 0.06, b: 0.62 },
  { type: 'hatch', a: 0.61, b: 0.56 },
  { type: 'hatch', a: 0.23, b: 0.35 },
  { type: 'drain', a: 0.25, b: 0.5 },
  { type: 'drain', a: 0.5, b: 0.45 },
  { type: 'drain', a: 0.75, b: 0.5 },
];

/**
 * Parametric rooftop equipment block.
 * Types: 'ahu' (air-handling unit), 'box' (small HVAC/vent box),
 * 'vent' (mushroom exhaust), 'hatch' (roof access hatch), 'drain'.
 */
export function createRoofUnit(placer, item, y, mats, rng) {
  const { x, z } = item;
  const rotY = (rng() - 0.5) * 0.04; // barely perceptible misalignment
  const rot = [0, rotY, 0];
  switch (item.type) {
    case 'ahu': {
      const [sx, sy, sz] = item.size;
      placer.box(L, mats.roofPad, x, y + 0.05, z, sx + 0.4, 0.1, sz + 0.4, { rotation: rot });
      placer.box(L, mats.roofEquipment, x, y + 0.1 + sy / 2, z, sx, sy, sz, { rotation: rot });
      // louvred side panel + seams
      for (let i = 0; i < 5; i++) {
        placer.box(L, mats.roofEquipmentDark, x - sx * 0.2, y + 0.25 + i * sy * 0.15, z + sz / 2 + 0.005,
          sx * 0.45, 0.03, 0.02, { castShadow: false });
      }
      placer.box(L, mats.roofEquipmentDark, x + sx * 0.15, y + 0.1 + sy / 2, z + sz / 2 + 0.004, 0.02, sy * 0.9, 0.01, { castShadow: false });
      // lid
      placer.box(L, mats.roofEquipmentDark, x, y + 0.1 + sy + 0.025, z, sx + 0.08, 0.05, sz + 0.08, { rotation: rot });
      if (item.top) {
        const tx = x - sx * 0.1;
        placer.box(L, mats.roofEquipment, tx, y + 0.15 + sy + 0.22, z, sx * 0.5, 0.44, sz * 0.6, { rotation: rot });
        placer.box(L, mats.roofEquipmentDark, tx, y + 0.15 + sy + 0.47, z, sx * 0.55, 0.06, sz * 0.66, { rotation: rot });
        // exhaust fan on top
        placer.cylinder(L, mats.roofEquipmentDark, x + sx * 0.32, y + 0.15 + sy, z, 0.28, 0.14);
      }
      break;
    }
    case 'box': {
      const s = item.s;
      const h = 0.4 + rng() * 0.3;
      const d = s * (0.8 + rng() * 0.3);
      placer.box(L, mats.roofEquipment, x, y + h / 2, z, s, h, d, { rotation: rot });
      placer.box(L, mats.roofEquipmentDark, x, y + h + 0.03, z, s + 0.06, 0.06, d + 0.06, { rotation: rot });
      if (rng() < 0.5) {
        placer.box(L, mats.roofEquipmentDark, x, y + h * 0.5, z + d / 2 + 0.005, s * 0.6, h * 0.45, 0.01, { castShadow: false });
      }
      break;
    }
    case 'vent': {
      placer.cylinder(L, mats.roofEquipment, x, y, z, 0.12, 0.6);
      placer.cylinder(L, mats.roofEquipmentDark, x, y + 0.62, z, 0.22, 0.04);
      placer.cylinder(L, mats.roofEquipment, x, y + 0.66, z, 0.22, 0.12, { geometry: UNIT.cone });
      placer.cylinder(L, mats.roofPad, x, y, z, 0.25, 0.08);
      break;
    }
    case 'hatch': {
      placer.box(L, mats.roofPad, x, y + 0.2, z, 1.0, 0.4, 1.0);
      placer.box(L, mats.roofEquipment, x, y + 0.43, z, 1.06, 0.06, 1.06);
      break;
    }
    case 'drain': {
      placer.cylinder(L, mats.hvacGrille, x, y, z, 0.12, 0.02);
      break;
    }
    default:
      break;
  }
}

/**
 * Flat roof: dark membrane set down inside the parapet, sparse equipment,
 * and a small pipe run with supports along the back parapet.
 */
export function createRoof(placer, p, lv, mats, rng) {
  const t = p.wallThickness;
  const iw = p.buildingWidth - 2 * t;
  const id = p.buildingDepth - 2 * t;
  const y = lv.roofLevel + 0.06;

  const geo = new THREE.BoxGeometry(iw - 0.02, 0.06, id - 0.02);
  const tex = mats.roof.userData.texture;
  if (tex) tex.repeat.set(iw / 8, id / 8);
  const membrane = new THREE.Mesh(geo, mats.roof);
  membrane.position.set(0, lv.roofLevel + 0.03, 0);
  membrane.receiveShadow = true;
  membrane.name = 'roof-membrane';
  placer.mesh(L, membrane);

  const margin = 0.9;
  for (const it of ROOF_ITEMS) {
    const x = THREE.MathUtils.clamp((it.a - 0.5) * iw, -iw / 2 + margin, iw / 2 - margin);
    const z = THREE.MathUtils.clamp((0.5 - it.b) * id, -id / 2 + margin, id / 2 - margin);
    createRoofUnit(placer, { ...it, x, z }, y, mats, rng);
  }

  // pipe run near the back parapet on small sleepers
  const pz = -id / 2 + 0.45;
  const px0 = -iw * 0.2;
  const px1 = iw * 0.08;
  placer.rod(L, mats.roofEquipment, [px0, y + 0.22, pz], [px1, y + 0.22, pz], 0.07);
  placer.rod(L, mats.roofEquipment, [px1, y + 0.22, pz], [px1, y + 0.22, pz + 2.0], 0.07);
  placer.rod(L, mats.roofEquipment, [px1, y + 0.22, pz + 2.0], [px1, y + 0.9, pz + 2.0], 0.07);
  for (let xs = px0 + 0.4; xs < px1; xs += 1.6) {
    placer.box(L, mats.roofPad, xs, y + 0.07, pz, 0.2, 0.14, 0.35);
  }
  placer.box(L, mats.roofPad, px1, y + 0.07, pz + 1.0, 0.35, 0.14, 0.2);
}
