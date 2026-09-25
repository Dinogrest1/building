import * as THREE from 'three';
import { PLINTH } from './config.js';
import { subtractIntervals } from './utils.js';
import { createWindowGroup, createSquareWindow, createVerticalFin } from './windows.js';
import { createHVACUnit } from './hvac.js';
import { createEntrance, createSmallDoor } from './entrance.js';
import { createShutter, createGrille, createPilaster, createBand, createEnclosure } from './serviceArea.js';
import { createBasementEntrance, createRouteArrow } from './basement.js';

/** Kinds of openings that cut a real hole through the facade skin. */
const HOLE_KINDS = new Set(['window', 'square', 'entrance', 'smallDoor', 'shutter', 'grille', 'basementDoor']);

/** How far the skin extends below grade (deep enough for the basement entrance pit). */
const BELOW_GRADE = 3.0;

function rectPath(u0, v0, u1, v1, path = new THREE.Path()) {
  path.moveTo(u0, v0);
  path.lineTo(u1, v0);
  path.lineTo(u1, v1);
  path.lineTo(u0, v1);
  path.closePath();
  return path;
}

/** Extruded wall panel (outer face at w = 0) with rectangular openings. */
function wallPanel(u0, v0, u1, v1, openings, t, material, name) {
  const shape = rectPath(u0, v0, u1, v1, new THREE.Shape());
  for (const o of openings) shape.holes.push(rectPath(o.u0, o.v0, o.u0 + o.w, o.v0 + o.h));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -t);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds one facade from its layout description:
 * a real extruded wall skin with openings, plus all elements placed in those openings.
 *
 * On the main facade the wall in front of each stair shaft is a separate panel
 * (scope '<facade>-stairs') with its own small windows, door and plinth, so it can
 * be hidden to look into the stairs without removing the rest of the facade.
 */
export function buildFacade(rootPlacer, def, ctx) {
  const { params: p, levels: lv, materials: mats, rng } = ctx;
  const placer = rootPlacer.sub(def.frame, def.name);
  const stripPlacer = placer.withScope(`${def.name}-stairs`);
  const t = p.wallThickness;
  const strips = def.stairStrips || [];
  const holes = def.openings.filter((o) => HOLE_KINDS.has(o.kind));
  const inStrip = (o) => o.strip != null && strips[o.strip];
  const stripTop = lv.roofLevel;
  const stripBottom = -BELOW_GRADE + 0.1;

  // ---- wall skin with openings (ExtrudeGeometry keeps real reveals/depth) ----
  const L = def.length;
  const skinHoles = holes.filter((o) => !inStrip(o))
    .concat(strips.map(([a, b]) => ({ u0: a, v0: stripBottom, w: b - a, h: stripTop - stripBottom })));
  placer.mesh('structure', wallPanel(-L / 2, -BELOW_GRADE, L / 2, lv.parapetTop, skinHoles, t, mats[def.material], `skin-${def.name}`));
  strips.forEach(([a, b], i) => {
    const own = holes.filter((o) => o.strip === i);
    stripPlacer.mesh('structure', wallPanel(a, stripBottom, b, stripTop, own, t, mats[def.material], `stair-wall-${def.name}-${i}`));
  });

  // ---- plinth / foundation strip, interrupted by openings at grade and by the stair strips ----
  const cutsFor = (list) => list
    .filter((o) => o.v0 < p.groundFloorLevel - 0.01)
    .map((o) => [o.u0 - 0.03, o.u0 + o.w + 0.03]);
  const [pu0, pu1] = def.plinthRange;
  const plinth = (pl, a, b) => pl.boxMinMax('structure', mats.plinth, a, -BELOW_GRADE, -0.02, b, p.groundFloorLevel, PLINTH.projection);
  for (const [a, b] of subtractIntervals(pu0, pu1, cutsFor(holes.filter((o) => !inStrip(o))).concat(strips))) plinth(placer, a, b);
  strips.forEach(([a, b], i) => {
    for (const [s0, s1] of subtractIntervals(a, b, cutsFor(holes.filter((o) => o.strip === i)))) plinth(stripPlacer, s0, s1);
  });

  // ---- contents of each opening ----
  for (const o of def.openings) {
    const pl = inStrip(o) ? stripPlacer : placer;
    switch (o.kind) {
      case 'window': createWindowGroup(pl, o, mats, rng); break;
      case 'square': createSquareWindow(pl, o, mats, rng); break;
      case 'entrance': createEntrance(pl, o, p, mats); break;
      case 'smallDoor': createSmallDoor(pl, o, mats); break;
      case 'shutter': createShutter(pl, o, mats); break;
      case 'grille': createGrille(pl, o, mats); break;
      default: break; // basement door leaf is built with the pit
    }
  }

  for (const fin of def.fins) createVerticalFin(placer, fin, mats);
  for (const pl of def.pilasters) createPilaster(placer, pl, mats);
  for (const b of def.bands) createBand(placer, b, mats);
  for (const unit of def.hvac) createHVACUnit(placer, unit, mats);
  for (const f of def.features) {
    if (f.type === 'enclosure') createEnclosure(placer, f.u, mats);
    if (f.type === 'basement') createBasementEntrance(placer, f, mats);
  }
  for (const route of def.arrows || []) createRouteArrow(placer, route, mats);
}
