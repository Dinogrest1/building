import * as THREE from 'three';

/** Deterministic PRNG (mulberry32) so the "irregular" layout is reproducible. */
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shared unit geometries – every repeated element is a scaled instance of these. */
export const UNIT = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
  rod: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 16),
};

/**
 * Collects instance transforms per (geometry, material) pair and turns them
 * into InstancedMeshes. This keeps thousands of facade parts at a few dozen draw calls.
 */
export class InstanceSink {
  constructor() {
    this.buckets = new Map();
  }

  add(geometry, material, matrix, { color = null, castShadow = true, receiveShadow = true } = {}) {
    const key = `${geometry.uuid}|${material.uuid}|${castShadow}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { geometry, material, castShadow, receiveShadow, matrices: [], colors: [] };
      this.buckets.set(key, bucket);
    }
    bucket.matrices.push(matrix.clone());
    bucket.colors.push(color);
  }

  build(target) {
    for (const b of this.buckets.values()) {
      const mesh = new THREE.InstancedMesh(b.geometry, b.material, b.matrices.length);
      const hasColor = b.colors.some((c) => c);
      const white = new THREE.Color(1, 1, 1);
      b.matrices.forEach((m, i) => {
        mesh.setMatrixAt(i, m);
        if (hasColor) mesh.setColorAt(i, b.colors[i] || white);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = b.castShadow;
      mesh.receiveShadow = b.receiveShadow;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
      target.add(mesh);
    }
    this.buckets.clear();
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Places geometry in a local frame (e.g. a facade frame where u = X along
 * the wall, v = Y up, w = Z outward from the wall face) into category sinks.
 */
export class Placer {
  constructor(sinks, layers, frame = new THREE.Matrix4()) {
    this.sinks = sinks;   // { category: InstanceSink }
    this.layers = layers; // { category: THREE.Group } for unique meshes
    this.frame = frame;
  }

  /** New placer whose frame is this frame × local. */
  sub(local) {
    return new Placer(this.sinks, this.layers, this.frame.clone().multiply(local));
  }

  instance(category, geometry, material, position, rotation, scale, opts) {
    _q.setFromEuler(_e.set(rotation[0], rotation[1], rotation[2]));
    _m.compose(_p.set(...position), _q, _s.set(...scale));
    _m.premultiply(this.frame);
    this.sinks[category].add(geometry, material, _m, opts);
  }

  /** Axis-aligned box by centre + size (optionally rotated). */
  box(category, material, cx, cy, cz, sx, sy, sz, opts = {}) {
    const rot = opts.rotation || [0, 0, 0];
    this.instance(category, UNIT.box, material, [cx, cy, cz], rot, [sx, sy, sz], opts);
  }

  /** Box by min/max corners (handy for architectural extents). */
  boxMinMax(category, material, x0, y0, z0, x1, y1, z1, opts) {
    this.box(category, material, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2,
      Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), opts);
  }

  /** Vertical cylinder standing on (x, y0, z). */
  cylinder(category, material, x, y0, z, radius, height, opts = {}) {
    const geo = opts.geometry || UNIT.cylinder;
    this.instance(category, geo, material, [x, y0 + height / 2, z], opts.rotation || [0, 0, 0],
      [radius, height, radius], opts);
  }

  /** Thin rod between two points (railings, pipes). */
  rod(category, material, a, b, radius, opts = {}) {
    const pa = new THREE.Vector3(...a);
    const pb = new THREE.Vector3(...b);
    const dir = pb.clone().sub(pa);
    const len = dir.length();
    _q.setFromUnitVectors(_up, dir.normalize());
    _m.compose(pa.add(pb).multiplyScalar(0.5), _q, _s.set(radius, len, radius));
    _m.premultiply(this.frame);
    this.sinks[category].add(opts.geometry || UNIT.rod, material, _m, opts);
  }

  /** Adds a unique mesh transformed into this frame. */
  mesh(category, mesh) {
    mesh.applyMatrix4(this.frame);
    this.layers[category].add(mesh);
    return mesh;
  }
}

/** Subtracts intervals from [a, b]; returns the remaining segments. */
export function subtractIntervals(a, b, cuts) {
  let segs = [[a, b]];
  for (const [c0, c1] of cuts) {
    const next = [];
    for (const [s0, s1] of segs) {
      if (c1 <= s0 || c0 >= s1) { next.push([s0, s1]); continue; }
      if (c0 > s0) next.push([s0, c0]);
      if (c1 < s1) next.push([c1, s1]);
    }
    segs = next;
  }
  return segs.filter(([s0, s1]) => s1 - s0 > 0.02);
}

export function disposeObject(root) {
  const unitGeos = new Set(Object.values(UNIT));
  root.traverse((o) => {
    if (o.geometry && !unitGeos.has(o.geometry)) o.geometry.dispose();
    if (o.isInstancedMesh) o.dispose();
  });
}
