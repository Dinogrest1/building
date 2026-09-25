import * as THREE from 'three';
import { PLINTH } from './config.js';
import { subtractIntervals } from './utils.js';
import { createWindowGroup, createSquareWindow, createVerticalFin } from './windows.js';
import { createHVACUnit } from './hvac.js';
import { createEntrance, createSmallDoor } from './entrance.js';
import { createShutter, createGrille, createPilaster, createBand, createEnclosure } from './serviceArea.js';

/** Kinds of openings that cut a real hole through the facade skin. */
const HOLE_KINDS = new Set(['window', 'square', 'entrance', 'smallDoor', 'shutter', 'grille']);

/** How far the skin extends below grade so openings at Y = 0 never touch the outline. */
const BELOW_GRADE = 0.3;

/**
 * Builds one facade from its layout description:
 * a real extruded wall skin with openings, plus all elements placed in those openings.
 */
export function buildFacade(rootPlacer, def, ctx) {
  const { params: p, levels: lv, materials: mats, rng } = ctx;
  const placer = rootPlacer.sub(def.frame, def.name);
  const t = p.wallThickness;

  // ---- wall skin with openings (ExtrudeGeometry keeps real reveals/depth) ----
  const L = def.length;
  const shape = new THREE.Shape();
  shape.moveTo(-L / 2, -BELOW_GRADE);
  shape.lineTo(L / 2, -BELOW_GRADE);
  shape.lineTo(L / 2, lv.parapetTop);
  shape.lineTo(-L / 2, lv.parapetTop);
  shape.closePath();
  for (const o of def.openings) {
    if (!HOLE_KINDS.has(o.kind)) continue;
    const hole = new THREE.Path();
    hole.moveTo(o.u0, o.v0);
    hole.lineTo(o.u0 + o.w, o.v0);
    hole.lineTo(o.u0 + o.w, o.v0 + o.h);
    hole.lineTo(o.u0, o.v0 + o.h);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -t);
  const skin = new THREE.Mesh(geo, mats[def.material]);
  skin.name = `skin-${def.name}`;
  skin.castShadow = true;
  skin.receiveShadow = true;
  placer.mesh('structure', skin);

  // ---- plinth / foundation strip, interrupted by openings at grade ----
  const cuts = def.openings
    .filter((o) => o.v0 < p.groundFloorLevel - 0.01 && HOLE_KINDS.has(o.kind))
    .map((o) => [o.u0 - 0.03, o.u0 + o.w + 0.03]);
  const [pu0, pu1] = def.plinthRange;
  for (const [a, b] of subtractIntervals(pu0, pu1, cuts)) {
    placer.boxMinMax('structure', mats.plinth, a, -BELOW_GRADE, -0.02, b, p.groundFloorLevel, PLINTH.projection);
  }

  // ---- contents of each opening ----
  for (const o of def.openings) {
    switch (o.kind) {
      case 'window': createWindowGroup(placer, o, mats, rng); break;
      case 'square': createSquareWindow(placer, o, mats, rng); break;
      case 'entrance': createEntrance(placer, o, p, mats); break;
      case 'smallDoor': createSmallDoor(placer, o, mats); break;
      case 'shutter': createShutter(placer, o, mats); break;
      case 'grille': createGrille(placer, o, mats); break;
      default: break;
    }
  }

  for (const fin of def.fins) createVerticalFin(placer, fin, mats);
  for (const pl of def.pilasters) createPilaster(placer, pl, mats);
  for (const b of def.bands) createBand(placer, b, mats);
  for (const unit of def.hvac) createHVACUnit(placer, unit, mats);
  for (const f of def.features) {
    if (f.type === 'enclosure') createEnclosure(placer, f.u, mats);
  }
}
