import * as THREE from 'three';
import { WINDOW, FIN } from './config.js';

const _c = new THREE.Color();

/** Slight per-window tint variation – real glazing never reflects identically. */
function glassTint(rng) {
  _c.setHSL(0, 0, 0.9 + rng() * 0.14);
  return _c.clone();
}

/**
 * A single recessed window module (one opening, one or more vertical panes).
 * Depth layering: wall face (w = 0) → sill (projects) → frame (recessed) → glass.
 */
export function createWindowModule(placer, o, mats, rng, { transom = true } = {}) {
  const { u0, v0, w, h } = o;
  const panes = o.panes || 1;
  const fw = WINDOW.frameWidth;
  const fd = WINDOW.frameDepth;
  const fz = -WINDOW.recess;
  const L = 'windows';

  // glass sheet behind the frame
  placer.box(L, mats.glass, u0 + w / 2, v0 + h / 2, fz - fd / 2 + 0.01,
    w - 0.01, h - 0.01, WINDOW.glassThickness, { color: glassTint(rng), castShadow: false });

  // outer frame
  placer.box(L, mats.frame, u0 + w / 2, v0 + fw / 2, fz, w, fw, fd);
  placer.box(L, mats.frame, u0 + w / 2, v0 + h - fw / 2, fz, w, fw, fd);
  placer.box(L, mats.frame, u0 + fw / 2, v0 + h / 2, fz, fw, h - 2 * fw, fd);
  placer.box(L, mats.frame, u0 + w - fw / 2, v0 + h / 2, fz, fw, h - 2 * fw, fd);

  // mullions between panes
  const pw = w / panes;
  for (let i = 1; i < panes; i++) {
    placer.box(L, mats.frame, u0 + i * pw, v0 + h / 2, fz, WINDOW.mullionWidth, h - 2 * fw, fd);
  }
  // transom bar (upper fanlight)
  if (transom && h > 1.2) {
    placer.box(L, mats.frame, u0 + w / 2, v0 + h * WINDOW.transomRatio, fz, w - 2 * fw, 0.045, fd * 0.9);
  }

  // projecting metal sill
  const sz0 = fz + fd / 2;
  const sz1 = WINDOW.sillProjection;
  placer.boxMinMax(L, mats.sill, u0 - 0.04, v0 - 0.05, sz0, u0 + w + 0.04, v0 + 0.015, sz1);
}

/** Horizontal group of panes (the typical facade module) – same construction, several panes. */
export function createWindowGroup(placer, o, mats, rng) {
  createWindowModule(placer, o, mats, rng, { transom: true });
}

/** Small square stair-core window. */
export function createSquareWindow(placer, o, mats, rng) {
  createWindowModule(placer, { ...o, panes: 1 }, mats, rng, { transom: false });
}

/** Vertical gray fin / pilaster protruding from the facade. */
export function createVerticalFin(placer, fin, mats) {
  placer.box('fins', mats.fin, fin.u, fin.v0 + fin.h / 2, FIN.depth / 2,
    FIN.width, fin.h, FIN.depth);
}
