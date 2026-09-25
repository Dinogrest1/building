import * as THREE from 'three';
import { INTERIOR, SLAB } from './config.js';
import { PLAN_WALLS, PLAN_LABELS, planToWorld } from './plan4.js';
import { subtractIntervals } from './utils.js';

/** Storey index (0-based) that carries the traced plan. */
export function planFloorIndex(p) {
  return Math.min(INTERIOR.planFloor, p.floorCount) - 1;
}

/**
 * Floor slabs. The ground floor is a solid raised platform; every upper slab
 * is an extruded plate with openings over the stair wells.
 */
export function createFloorSlabs(placer, p, lv, wells, mats) {
  const W = p.buildingWidth;
  const D = p.buildingDepth;
  const t = p.wallThickness;
  const hw = W / 2 - t - 0.005;
  const hd = D / 2 - t - 0.005;

  for (let i = 0; i < p.floorCount; i++) {
    const scoped = placer.withScope(`floor${i + 1}`);
    if (i === 0) {
      scoped.boxMinMax('slabs', mats.slab, -hw, 0, -hd, hw, lv.floor(0), hd);
      continue;
    }
    // Shape in (x, −z) so that rotateX(−90°) lays it flat with +Y up.
    // Stair wells reach the facade wall, so they are notches in the outline
    // (a hole touching the outline would not be triangulated).
    const shape = new THREE.Shape();
    const notches = wells.filter((w) => w.z1 >= hd - 0.02).sort((a, b) => a.x0 - b.x0);
    shape.moveTo(-hw, -hd);
    for (const w of notches) {
      shape.lineTo(w.x0, -hd);
      shape.lineTo(w.x0, -w.z0);
      shape.lineTo(w.x1, -w.z0);
      shape.lineTo(w.x1, -hd);
    }
    shape.lineTo(hw, -hd); shape.lineTo(hw, hd); shape.lineTo(-hw, hd); shape.closePath();
    for (const w of wells.filter((x) => !notches.includes(x))) {
      const hole = new THREE.Path();
      hole.moveTo(w.x0, -w.z1); hole.lineTo(w.x1, -w.z1); hole.lineTo(w.x1, -w.z0); hole.lineTo(w.x0, -w.z0); hole.closePath();
      shape.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB.thickness, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    const slab = new THREE.Mesh(geo, mats.slab);
    slab.position.y = lv.floor(i) - SLAB.thickness;
    slab.castShadow = true;
    slab.receiveShadow = true;
    slab.name = `slab-floor${i + 1}`;
    scoped.mesh('slabs', slab);
  }
}

const THICK = { thick: INTERIOR.wallThick, mid: INTERIOR.wallMid, thin: INTERIOR.wallThin, cubicle: 0.05 };

/**
 * Walls, doorways and doors of the traced 4th-floor plan.
 * Door frames narrower than the 900 mm inclusivity norm use their own material
 * so they can be highlighted.
 */
export function createPlanFloor(placer, p, lv, mats) {
  const fi = planFloorIndex(p);
  const W = p.buildingWidth;
  const D = p.buildingDepth;
  const t = p.wallThickness;
  const y0 = lv.floor(fi);
  const y1 = (fi + 1 < p.floorCount ? lv.floor(fi + 1) : lv.roofLevel) - SLAB.thickness;
  const scoped = placer.withScope(`floor${fi + 1}`);
  const I = INTERIOR;

  for (const [ax, ay, bx, by, type, doors, tag] of PLAN_WALLS) {
    const horizontal = ay === by;
    const [wx0, wz0] = planToWorld(ax, ay, W, D, t);
    const [wx1, wz1] = planToWorld(bx, by, W, D, t);
    const th = THICK[type];
    const top = type === 'cubicle' ? y0 + I.cubicleHeight : y1;
    const category = tag === 'stair' ? 'stairWalls' : 'interior';
    const mat = type === 'cubicle' ? mats.cubicle : mats.interiorWall;

    // along-axis extent (extended by half a thickness so corners close)
    const a = (horizontal ? Math.min(wx0, wx1) : Math.min(wz0, wz1)) - th / 2;
    const b = (horizontal ? Math.max(wx0, wx1) : Math.max(wz0, wz1)) + th / 2;
    const n = horizontal ? wz0 : wx0; // position across the wall

    const openings = (doors || []).map((d) => {
      const cu = horizontal ? planToWorld(d.c, ay, W, D, t)[0] : planToWorld(ax, d.c, W, D, t)[1];
      const clear = d.w / 1000;
      return { ...d, cu, clear, u0: cu - clear / 2 - I.frame, u1: cu + clear / 2 + I.frame };
    });

    const put = (cat, m, u0, u1, v0, v1, thickness = th, offset = 0) => {
      if (horizontal) scoped.boxMinMax(cat, m, u0, v0, n - thickness / 2 + offset, u1, v1, n + thickness / 2 + offset);
      else scoped.boxMinMax(cat, m, n - thickness / 2 + offset, v0, u0, n + thickness / 2 + offset, v1, u1);
    };

    for (const [s0, s1] of subtractIntervals(a, b, openings.map((o) => [o.u0, o.u1]))) {
      put(category, mat, s0, s1, y0, top);
    }

    for (const o of openings) {
      const doorTop = y0 + I.doorHeight;
      // lintel above the doorway
      if (top > doorTop + I.frame + 0.02) put(category, mat, o.u0, o.u1, doorTop + I.frame, top);
      const catDoor = tag === 'stair' || o.tag === 'stair' ? 'stairWalls' : 'interior';
      const frameMat = o.w < I.accessibleWidth ? mats.doorFrameNarrow : mats.doorFrame;
      const fd = th + 0.03;
      // frame: two jambs + head
      put(catDoor, frameMat, o.u0, o.u0 + I.frame, y0, doorTop + I.frame, fd);
      put(catDoor, frameMat, o.u1 - I.frame, o.u1, y0, doorTop + I.frame, fd);
      put(catDoor, frameMat, o.u0, o.u1, doorTop, doorTop + I.frame, fd);
      if (o.open) continue;

      // leaves, drawn open at 90° like the swing arcs on the drawing
      const side = o.side ?? (horizontal ? (ay <= 620 ? -1 : 1) : 1);
      const leaves = o.double
        ? [[o.u0 + I.frame, o.clear / 2], [o.u1 - I.frame, -o.clear / 2]]
        : [[o.u0 + I.frame, o.clear]];
      for (const [hinge, len] of leaves) {
        const L = Math.abs(len);
        const hu = hinge + Math.sign(len) * I.doorLeaf / 2;
        const nOff = side * (th / 2 + L / 2);
        const hy = y0 + I.doorHeight / 2;
        if (horizontal) scoped.box(catDoor, mats.doorLeaf, hu, hy, n + nOff, I.doorLeaf, I.doorHeight - 0.02, L);
        else scoped.box(catDoor, mats.doorLeaf, n + nOff, hy, hu, L, I.doorHeight - 0.02, I.doorLeaf);
      }
    }
  }

  createRoomLabels(scoped, y0, W, D, t);
}

/** Room names as flat text on the floor (readable from above). */
function createRoomLabels(placer, y0, W, D, t) {
  for (const [px, py, text, vertical] of PLAN_LABELS) {
    const [x, z] = planToWorld(px, py, W, D, t);
    const mesh = makeLabel(text);
    mesh.position.set(x, y0 + 0.02, z);
    mesh.rotation.set(-Math.PI / 2, 0, vertical ? Math.PI / 2 : 0);
    placer.mesh('labels', mesh);
  }
}

function makeLabel(text) {
  const lines = text.split('\n');
  const fontPx = 64;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `600 ${fontPx}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const width = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 24;
  canvas.width = width;
  canvas.height = lines.length * fontPx * 1.15 + 16;
  ctx.font = `600 ${fontPx}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#2b2d30';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, width / 2, 8 + fontPx * 1.15 * (i + 0.5)));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const h = INTERIOR.labelHeight * lines.length * 1.15;
  const w = (canvas.width / canvas.height) * h;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  mat.userData.disposable = true;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = 2;
  mesh.name = `label-${text}`;
  return mesh;
}
