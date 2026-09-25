import * as THREE from 'three';
import { BASEMENT, ARROWS } from './config.js';

/**
 * Basement entrance in front of the main facade (facade-local coordinates:
 * u along the wall, v up from grade, w outward). A pit with retaining walls,
 * steps descending toward the porch, a bottom landing with a metal door in the
 * facade, a railing on the pit edge and a lean-to canopy of profiled sheet.
 */
export function createBasementEntrance(placer, f, mats) {
  const B = BASEMENT;
  const { u0, u1, risers } = f;
  const r = B.depth / risers;
  const T = B.tread;
  const W = B.width;
  const L = 'basement';
  const bottom = -B.depth;

  // bottom landing + steps (solid concrete, top step reaches grade at u1)
  placer.boxMinMax(L, mats.concrete, u0, bottom - 0.2, 0.001, u0 + B.landing, bottom, W);
  for (let k = 0; k < risers - 1; k++) {
    const top = bottom + (k + 1) * r;
    placer.boxMinMax(L, mats.concrete, u0 + B.landing + k * T, bottom - 0.2, 0.001, u0 + B.landing + (k + 1) * T, top, W);
  }
  // retaining walls: along the outer edge and at the landing end, with a curb above grade
  placer.boxMinMax(L, mats.plinth, u0 - B.wall, bottom - 0.2, W, u1, B.curb, W + B.wall);
  placer.boxMinMax(L, mats.plinth, u0 - B.wall, bottom - 0.2, 0.001, u0, B.curb, W);

  // metal door at the landing (the opening is cut into the facade skin)
  const du0 = u0 + (B.landing - B.doorWidth) / 2;
  placer.boxMinMax('entrance', mats.door, du0, bottom, -0.12, du0 + B.doorWidth, bottom + B.doorHeight, -0.06);
  placer.box('entrance', mats.sill, du0 + B.doorWidth - 0.15, bottom + 1.0, -0.04, 0.12, 0.03, 0.05);

  // railing on the retaining wall
  const rh = 0.9;
  const railW = W + B.wall / 2;
  const posts = Math.max(2, Math.round((u1 - u0) / 1.1) + 1);
  for (let i = 0; i < posts; i++) {
    const u = u0 - B.wall / 2 + ((u1 - u0 + B.wall / 2 - 0.05) * i) / (posts - 1);
    placer.rod(L, mats.metal, [u, B.curb, railW], [u, B.curb + rh, railW], 0.022);
  }
  for (const h of [rh, rh * 0.5]) {
    placer.rod(L, mats.metal, [u0 - B.wall / 2, B.curb + h, railW], [u1 - 0.05, B.curb + h, railW], h === rh ? 0.024 : 0.015);
    placer.rod(L, mats.metal, [u0 - B.wall / 2, B.curb + h, 0.05], [u0 - B.wall / 2, B.curb + h, railW], h === rh ? 0.024 : 0.015);
  }

  createLeanToCanopy(placer, u0 - B.wall - B.canopyOverhang, u1 + B.canopyOverhang, W + B.wall + 0.25, mats);
}

/** Mono-pitch canopy: steel frame, profiled sheet with dark ribs running down the slope. */
function createLeanToCanopy(placer, a, b, depth, mats) {
  const B = BASEMENT;
  const L = 'canopies';
  const hi = B.canopyHigh;
  const lo = B.canopyLow;
  const slope = Math.atan2(hi - lo, depth);
  const len = Math.hypot(depth, hi - lo);
  const midV = (hi + lo) / 2;
  const rot = { rotation: [slope, 0, 0] };

  placer.box(L, mats.canopySheet, (a + b) / 2, midV, depth / 2, b - a, 0.03, len, rot);
  for (let u = a + B.ribSpacing / 2; u < b; u += B.ribSpacing) {
    placer.box(L, mats.canopyRib, u, midV + 0.025, depth / 2, 0.04, 0.03, len, { ...rot, castShadow: false });
  }
  // wall plate, front beam, posts standing on the retaining wall, diagonal brackets
  placer.boxMinMax(L, mats.metal, a, hi - 0.12, 0, b, hi, 0.08);
  placer.boxMinMax(L, mats.metal, a, lo - 0.14, depth - 0.1, b, lo - 0.02, depth);
  const posts = Math.max(2, Math.round((b - a) / 2.2) + 1);
  for (let i = 0; i < posts; i++) {
    const u = a + 0.1 + ((b - a - 0.2) * i) / (posts - 1);
    placer.boxMinMax(L, mats.metal, u - 0.04, B.curb, depth - 0.12, u + 0.04, lo - 0.1, depth - 0.04);
    placer.rod(L, mats.metal, [u, hi - 0.6, 0.02], [u, hi - 0.1, depth * 0.45], 0.015);
  }
}

/** Ground cut-out (world XZ rectangle) so the pit is open to the sky. */
export function basementCutout(f, frame) {
  const B = BASEMENT;
  const p0 = new THREE.Vector3(f.u0 - B.wall, 0, 0).applyMatrix4(frame);
  const p1 = new THREE.Vector3(f.u1, 0, B.width + B.wall).applyMatrix4(frame);
  return {
    x0: Math.min(p0.x, p1.x), x1: Math.max(p0.x, p1.x),
    z0: Math.min(p0.z, p1.z), z1: Math.max(p0.z, p1.z),
  };
}

/**
 * Painted route arrows on the ground: a polyline of flat strips (facade-local
 * [u, w] points) ending in a triangular head.
 */
export function createRouteArrow(placer, points, mats) {
  const A = ARROWS;
  const y = 0.012;
  const hw = A.width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const [u0, w0] = points[i];
    let [u1, w1] = points[i + 1];
    const last = i === points.length - 2;
    const du = Math.sign(u1 - u0);
    const dw = Math.sign(w1 - w0);
    if (last) { u1 -= du * A.headLength; w1 -= dw * A.headLength; } // leave room for the head
    // extend each strip by half a width so corners close
    placer.boxMinMax('arrows', mats.arrow,
      Math.min(u0, u1) - hw, 0.004, Math.min(w0, w1) - hw,
      Math.max(u0, u1) + hw, y, Math.max(w0, w1) + hw, { castShadow: false });
  }
  // head
  const [ua, wa] = points[points.length - 2];
  const [ub, wb] = points[points.length - 1];
  const dir = new THREE.Vector2(ub - ua, wb - wa).normalize();
  const n = new THREE.Vector2(-dir.y, dir.x);
  const base = new THREE.Vector2(ub, wb).addScaledVector(dir, -A.headLength);
  const tri = new THREE.Shape([
    new THREE.Vector2(ub, wb),
    base.clone().addScaledVector(n, A.headWidth / 2),
    base.clone().addScaledVector(n, -A.headWidth / 2),
  ]);
  const geo = new THREE.ShapeGeometry(tri);
  // shape (u, w) → local (x = u, y = 0, z = w)
  geo.rotateX(Math.PI / 2);
  const head = new THREE.Mesh(geo, mats.arrow);
  head.position.y = y;
  head.receiveShadow = true;
  head.name = 'arrow-head';
  placer.mesh('arrows', head);
}
