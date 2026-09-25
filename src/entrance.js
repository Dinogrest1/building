import { ENTRANCE, SMALL_DOOR } from './config.js';

const L = 'entrance';

/** Double glass door leaf set, fitted into a recessed opening. */
function createDoubleDoor(placer, o, mats, z) {
  const { u0, v0, w, h } = o;
  const fw = 0.07;
  const fd = 0.09;
  const transomV = v0 + h * 0.8;

  // glass (leaves + fanlight)
  placer.box(L, mats.glass, u0 + w / 2, v0 + h / 2, z - 0.02, w - 0.02, h - 0.02, 0.02, { castShadow: false });
  // outer frame
  placer.box(L, mats.door, u0 + w / 2, v0 + h - fw / 2, z, w, fw, fd);
  placer.box(L, mats.door, u0 + fw / 2, v0 + h / 2, z, fw, h, fd);
  placer.box(L, mats.door, u0 + w - fw / 2, v0 + h / 2, z, fw, h, fd);
  placer.box(L, mats.door, u0 + w / 2, transomV, z, w, fw, fd);
  // leaves: stiles, rails, kick plates
  const leafW = (w - 2 * fw) / 2;
  for (let i = 0; i < 2; i++) {
    const lu0 = u0 + fw + i * leafW;
    placer.box(L, mats.door, lu0 + 0.04, (v0 + transomV) / 2, z + 0.01, 0.08, transomV - v0, fd * 0.8);
    placer.box(L, mats.door, lu0 + leafW - 0.04, (v0 + transomV) / 2, z + 0.01, 0.08, transomV - v0, fd * 0.8);
    placer.box(L, mats.door, lu0 + leafW / 2, v0 + 0.15, z + 0.01, leafW, 0.3, fd * 0.8);
    placer.box(L, mats.door, lu0 + leafW / 2, v0 + 1.05, z + 0.012, leafW, 0.06, fd * 0.8);
    // vertical pull handle
    const hu = i === 0 ? lu0 + leafW - 0.14 : lu0 + 0.14;
    placer.rod(L, mats.sill, [hu, v0 + 0.8, z + 0.09], [hu, v0 + 1.5, z + 0.09], 0.016);
  }
}

/**
 * Main entrance: recessed double doors, canopy, concrete landing, a real
 * multi-step stair running parallel to the facade, and metal railings.
 */
export function createEntrance(placer, o, p, mats) {
  const E = ENTRANCE;
  const gl = p.groundFloorLevel;
  const { u0, v0, w, h } = o;

  createDoubleDoor(placer, o, mats, -E.doorRecess);
  // threshold
  placer.boxMinMax(L, mats.concrete, u0, v0 - 0.02, -E.doorRecess - 0.05, u0 + w, v0 + 0.02, 0.0);

  // canopy slab with fascia and tie rods
  const cu0 = u0 - E.canopyOverhang;
  const cu1 = u0 + w + E.canopyOverhang;
  const cTop = v0 + h + 0.45;
  placer.boxMinMax(L, mats.concrete, cu0, cTop - E.canopyThickness, 0, cu1, cTop, E.canopyDepth);
  placer.boxMinMax(L, mats.fin, cu0 - 0.02, cTop - E.canopyThickness - 0.06, E.canopyDepth - 0.06, cu1 + 0.02, cTop + 0.03, E.canopyDepth + 0.02);
  for (const cu of [cu0 + 0.15, cu1 - 0.15]) {
    placer.rod(L, mats.metal, [cu, cTop + 1.0, 0.02], [cu, cTop, E.canopyDepth - 0.1], 0.02);
  }

  // landing
  const landU0 = u0 - E.landingExtraLeft;
  const stairU0 = u0 + w + 0.35;
  placer.boxMinMax(L, mats.concrete, landU0, 0, 0.001, stairU0, gl, E.landingDepth);
  placer.boxMinMax(L, mats.plinth, landU0 - 0.02, gl - 0.06, E.landingDepth - 0.02, stairU0, gl + 0.005, E.landingDepth + 0.02);

  // stair: n risers, n-1 stepped blocks (the landing is the top step)
  const n = Math.ceil(gl / E.riserMax);
  const riser = gl / n;
  const sw = E.stairWidth;
  for (let k = 1; k < n; k++) {
    placer.boxMinMax(L, mats.concrete, stairU0 + (k - 1) * E.tread, 0, 0.001, stairU0 + k * E.tread, gl - k * riser, sw);
  }
  const stairU1 = stairU0 + (n - 1) * E.tread;
  // stair cheek wall
  placer.boxMinMax(L, mats.plinth, stairU0, 0, sw, stairU1 + 0.02, 0.12, sw + 0.12);

  // ----- railings -----
  const rh = E.railHeight;
  const post = (u, y, z) => placer.rod(L, mats.metal, [u, y, z], [u, y + rh, z], 0.024);
  const rail = (a, b, r = 0.022) => placer.rod(L, mats.metal, a, b, r);

  // stair outer rail (sloped)
  const zr = sw + 0.06;
  const stepTop = (u) => {
    const k = Math.min(n - 1, Math.max(0, Math.ceil((u - stairU0) / E.tread)));
    return gl - k * riser;
  };
  const posts = Math.max(2, Math.round((stairU1 - stairU0) / E.postSpacing) + 1);
  for (let i = 0; i < posts; i++) {
    const u = stairU0 + ((stairU1 - stairU0 - 0.1) * i) / (posts - 1);
    post(u, i === 0 ? gl : stepTop(u), zr);
  }
  rail([stairU0, gl + rh, zr], [stairU1 - 0.1, riser + rh, zr]);
  rail([stairU0, gl + rh * 0.5, zr], [stairU1 - 0.1, riser + rh * 0.5, zr], 0.015);
  // wall-side handrail on brackets
  rail([stairU0, gl + rh, 0.09], [stairU1, riser + rh, 0.09], 0.02);
  for (const t of [0.15, 0.85]) {
    const u = stairU0 + t * (stairU1 - stairU0);
    const y = gl + rh + t * (riser - gl);
    rail([u, y, 0.0], [u, y, 0.09], 0.012);
  }

  // landing rails: front edge and left side
  const zl = E.landingDepth - 0.06;
  const lu = landU0 + 0.06;
  const frontLen = stairU0 - lu;
  const nFront = Math.max(2, Math.round(frontLen / E.postSpacing) + 1);
  for (let i = 0; i < nFront; i++) post(lu + (frontLen * i) / (nFront - 1), gl, zl);
  rail([lu, gl + rh, zl], [stairU0, gl + rh, zl]);
  rail([lu, gl + rh * 0.5, zl], [stairU0, gl + rh * 0.5, zl], 0.015);
  post(lu, gl, 0.1);
  post(lu, gl, zl / 2);
  rail([lu, gl + rh, 0.05], [lu, gl + rh, zl]);
  rail([lu, gl + rh * 0.5, 0.05], [lu, gl + rh * 0.5, zl], 0.015);
  // connect landing front rail to stair rail
  rail([stairU0, gl + rh, zl], [stairU0, gl + rh, zr]);
}

/** Secondary / utility door at grade with a small canopy and concrete pad. */
export function createSmallDoor(placer, o, mats) {
  const { u0, v0, w, h } = o;
  const z = -0.12;
  const S = SMALL_DOOR;
  // frame and solid metal leaf with a small vision panel
  placer.boxMinMax(L, mats.door, u0, v0, z - 0.05, u0 + w, v0 + h, z + 0.03);
  placer.boxMinMax(L, mats.frame, u0 + 0.05, v0 + h - 0.06, z, u0 + w - 0.05, v0 + h, z + 0.06);
  placer.box(L, mats.glass, u0 + w / 2, v0 + h * 0.68, z + 0.035, w * 0.35, h * 0.28, 0.01, { castShadow: false });
  placer.box(L, mats.sill, u0 + w - 0.15, v0 + 1.0, z + 0.06, 0.12, 0.03, 0.05);
  // canopy
  const cu = u0 + w / 2;
  const ct = v0 + h + 0.35;
  placer.box(L, mats.concrete, cu, ct - 0.06, S.canopyDepth / 2, S.canopyWidth, 0.12, S.canopyDepth);
  placer.box(L, mats.fin, cu, ct - 0.08, S.canopyDepth, S.canopyWidth + 0.04, 0.18, 0.04);
  // pad
  placer.box(L, mats.concrete, cu, 0.06, 0.6, S.canopyWidth, 0.12, 1.2);
}
