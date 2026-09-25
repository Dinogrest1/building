import * as THREE from 'three';
import { ARROWS } from './config.js';

/**
 * Flat arrow painted on a floor: a ribbon along a polyline ([u, w] points in the
 * placer's frame, at height y) ending in a triangular head.
 *
 * The ribbon's U texture coordinate is the distance along the route in metres, so
 * the shared flow material (a repeating "-→" pattern, see materials.js) keeps the
 * same spacing on every route and can be animated by scrolling its texture offset.
 */
export function createFloorArrow(placer, category, points, y, mats, opts = {}) {
  const width = opts.width ?? ARROWS.width;
  const headLength = opts.headLength ?? ARROWS.headLength;
  const headWidth = opts.headWidth ?? ARROWS.headWidth;
  const pts = points.map(([u, w]) => new THREE.Vector2(u, w));
  if (pts.length < 2) return;

  // stop the ribbon where the head begins
  const n = pts.length;
  const lastDir = pts[n - 1].clone().sub(pts[n - 2]);
  const lastLen = lastDir.length();
  lastDir.normalize();
  const headBase = pts[n - 1].clone().addScaledVector(lastDir, -Math.min(headLength, lastLen * 0.9));
  const line = [...pts.slice(0, n - 1), headBase];

  const ribbon = ribbonGeometry(line, width);
  if (ribbon) {
    const mesh = new THREE.Mesh(ribbon, mats.flow);
    mesh.position.y = y;
    mesh.renderOrder = 3;
    mesh.name = 'arrow-flow';
    placer.mesh(category, mesh);
  }

  const nrm = new THREE.Vector2(-lastDir.y, lastDir.x);
  const tri = new THREE.Shape([
    pts[n - 1],
    headBase.clone().addScaledVector(nrm, headWidth / 2),
    headBase.clone().addScaledVector(nrm, -headWidth / 2),
  ]);
  const geo = new THREE.ShapeGeometry(tri);
  geo.rotateX(Math.PI / 2); // shape (u, w) → (u, 0, w)
  const head = new THREE.Mesh(geo, mats.flowHead);
  head.position.y = y + 0.001;
  head.renderOrder = 3;
  head.name = 'arrow-head';
  placer.mesh(category, head);
}

/**
 * One quad per segment (extended by half a width at inner joints so corners
 * close); U = distance along the line in metres, V = 0…1 across the ribbon.
 */
function ribbonGeometry(line, width) {
  const pos = [];
  const uv = [];
  const idx = [];
  const hw = width / 2;
  let dist = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const d = b.clone().sub(a);
    const len = d.length();
    if (len < 1e-4) continue;
    d.normalize();
    const nrm = new THREE.Vector2(-d.y, d.x);
    const ext = i > 0 ? hw : 0; // overlap into the previous segment at the corner
    const a0 = a.clone().addScaledVector(d, -ext);
    const u0 = dist - ext;
    const u1 = dist + len;
    const base = pos.length / 3;
    for (const [p, u] of [[a0, u0], [b, u1]]) {
      const l = p.clone().addScaledVector(nrm, hw);
      const r = p.clone().addScaledVector(nrm, -hw);
      pos.push(l.x, 0, l.y, r.x, 0, r.y);
      uv.push(u, 1, u, 0);
    }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    dist += len;
  }
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
