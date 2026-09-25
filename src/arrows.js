import * as THREE from 'three';
import { ARROWS } from './config.js';

/**
 * Flat arrow painted on a floor: a polyline of strips ([u, w] points in the
 * placer's frame, at height y) ending in a triangular head. Works for any
 * segment direction.
 */
export function createFloorArrow(placer, category, points, y, material, opts = {}) {
  const width = opts.width ?? ARROWS.width;
  const headLength = opts.headLength ?? ARROWS.headLength;
  const headWidth = opts.headWidth ?? ARROWS.headWidth;
  const pts = points.map(([u, w]) => new THREE.Vector2(u, w));
  if (pts.length < 2) return;

  // stop the last strip where the head begins
  const n = pts.length;
  const lastDir = pts[n - 1].clone().sub(pts[n - 2]);
  const lastLen = lastDir.length();
  lastDir.normalize();
  const headBase = pts[n - 1].clone().addScaledVector(lastDir, -Math.min(headLength, lastLen));
  const strip = [...pts.slice(0, n - 1), headBase];

  for (let i = 0; i < strip.length - 1; i++) {
    const a = strip[i];
    const b = strip[i + 1];
    const d = b.clone().sub(a);
    const len = d.length();
    if (len < 1e-3) continue;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    // extend by half a width so the joints close
    placer.box(category, material, mid.x, y, mid.y, len + width, 0.004, width,
      { rotation: [0, Math.atan2(-d.y, d.x), 0], castShadow: false });
  }

  const nrm = new THREE.Vector2(-lastDir.y, lastDir.x);
  const tri = new THREE.Shape([
    pts[n - 1],
    headBase.clone().addScaledVector(nrm, headWidth / 2),
    headBase.clone().addScaledVector(nrm, -headWidth / 2),
  ]);
  const geo = new THREE.ShapeGeometry(tri);
  geo.rotateX(Math.PI / 2); // shape (u, w) → (u, 0, w)
  const head = new THREE.Mesh(geo, material);
  head.position.y = y + 0.001;
  head.receiveShadow = true;
  head.name = 'arrow-head';
  placer.mesh(category, head);
}
