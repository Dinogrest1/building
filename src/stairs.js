import { STAIRS } from './config.js';

const L = 'stairs';

/**
 * Geometry of one stair core, shared by the stairs and the slab openings.
 * The floor landing is on the corridor side (−Z), the intermediate landing
 * against the main facade (+Z) – next to the half-level small square windows.
 */
export function stairWell(core, p) {
  const S = STAIRS;
  const half = p.floorHeight / 2;
  const n = Math.max(3, Math.round(half / S.riserTarget)); // risers per flight
  const run = (n - 1) * S.tread;
  const xi0 = core.x0 + S.wallInset;
  const xi1 = core.x1 - S.wallInset;
  const zi1 = core.z1;
  const zL = zi1 - S.midLanding;
  const zs = zL - run;
  const fw = (xi1 - xi0 - S.gap) / 2;
  return {
    ...core, n, r: half / n, half, run, xi0, xi1, zi1, zL, zs, fw,
    // slab opening: flights + intermediate landing
    hole: { x0: xi0, x1: xi1, z0: zs, z1: zi1 },
  };
}

/** Sloped slab (waist) hanging below the line (zA, yA) → (zB, yB), aligned along Z. */
function waistSlab(placer, mat, x0, x1, zA, yA, zB, yB, thickness) {
  const dz = zB - zA;
  const dy = yB - yA;
  const len = Math.hypot(dz, dy);
  const rotX = Math.atan2(-dy, dz); // local +Z → direction of the flight
  // upward normal in the (z, y) plane
  const sgn = Math.sign(dz) || 1;
  const nz = (-dy / len) * sgn;
  const ny = (dz / len) * sgn;
  placer.box(L, mat, (x0 + x1) / 2, (yA + yB) / 2 - (ny * thickness) / 2, (zA + zB) / 2 - (nz * thickness) / 2,
    x1 - x0, thickness, len, { rotation: [rotX, 0, 0] });
}

/**
 * Two-flight (U-shaped) stair between every pair of storeys:
 * flight 1 rises toward the facade, turns on the intermediate landing,
 * flight 2 rises back to the next floor landing. Balustrade after the
 * reference: stainless posts with base plates, round handrail with a turn,
 * three horizontal rails parallel to the handrail, glass panel on the top landing,
 * wall handrails on brackets.
 */
export function createStairs(placer, well, p, lv, mats) {
  const S = STAIRS;
  const { n, r, half, xi0, xi1, zL, zs, zi1, fw } = well;
  const T = S.tread;
  const m = mats.stair;
  const aX0 = xi0;
  const aX1 = xi0 + fw;           // flight 1 (left half)
  const bX0 = xi1 - fw;
  const bX1 = xi1;                // flight 2 (right half)

  for (let i = 0; i < p.floorCount - 1; i++) {
    const y0 = lv.floor(i);

    // ---- flight 1: up toward the facade ----
    for (let k = 0; k < n - 1; k++) {
      const top = y0 + (k + 1) * r;
      placer.boxMinMax(L, m, aX0, top - r, zs + k * T, aX1, top, zs + (k + 1) * T);
      placer.boxMinMax(L, mats.stairNosing, aX0, top - 0.012, zs + (k + 1) * T - 0.03, aX1, top + 0.002, zs + (k + 1) * T, { castShadow: false });
    }
    waistSlab(placer, m, aX0, aX1, zs, y0, zL, y0 + half - r, S.waist);

    // ---- intermediate landing ----
    placer.boxMinMax(L, m, xi0, y0 + half - 0.2, zL, xi1, y0 + half, zi1);

    // ---- flight 2: back up to the next floor ----
    for (let k = 0; k < n - 1; k++) {
      const top = y0 + half + (k + 1) * r;
      placer.boxMinMax(L, m, bX0, top - r, zL - (k + 1) * T, bX1, top, zL - k * T);
      placer.boxMinMax(L, mats.stairNosing, bX0, top - 0.012, zL - (k + 1) * T, bX1, top + 0.002, zL - (k + 1) * T + 0.03, { castShadow: false });
    }
    waistSlab(placer, m, bX0, bX1, zL, y0 + half, zs, y0 + 2 * half - r, S.waist);

    createBalustrade(placer, well, y0, mats);
    createWallHandrails(placer, well, y0, mats);
  }

  // guard with glass panel at the top floor, along the edge of the well
  if (p.floorCount > 1) {
    const yT = lv.floor(p.floorCount - 1);
    const zg = zs - 0.05;
    const xa = xi0 + 0.06;
    const xb = bX0 + 0.05;
    const posts = [xa, (xa + xb) / 2, xb];
    for (const x of posts) post(placer, mats, x, yT, zg);
    rail(placer, mats, [xa, yT + S.railHeight, zg], [xb, yT + S.railHeight, zg], S.handrailRadius);
    // glass panel held by clamps (стеклодержатели)
    placer.boxMinMax(L, mats.railGlass, xa + 0.05, yT + 0.12, zg - 0.006, xb - 0.05, yT + S.railHeight - 0.08, zg + 0.006, { castShadow: false });
    for (const x of [xa, xb]) {
      for (const h of [0.25, S.railHeight - 0.2]) {
        const dx = x === xa ? 0.03 : -0.03;
        placer.box(L, mats.steel, x + dx, yT + h, zg, 0.04, 0.05, 0.03);
      }
    }
    // end caps (заглушки)
    placer.box(L, mats.steel, xa - 0.02, yT + S.railHeight, zg, 0.02, 0.055, 0.055);
  }
}

function post(placer, mats, x, y, z) {
  const S = STAIRS;
  placer.cylinder(L, mats.steel, x, y, z, 0.045, 0.012); // base plate (низ стойки)
  placer.rod(L, mats.steel, [x, y, z], [x, y + S.railHeight, z], S.postRadius);
}

function rail(placer, mats, a, b, radius) {
  placer.rod(L, mats.steel, a, b, radius);
}

/** Inner balustrade along the well: posts, sloped handrail with the landing turn, strings. */
function createBalustrade(placer, well, y0, mats) {
  const S = STAIRS;
  const { n, r, half, zs, zL, xi0, xi1, fw } = well;
  const T = S.tread;
  const xa = xi0 + fw - 0.05; // flight 1 inner edge
  const xb = xi1 - fw + 0.05; // flight 2 inner edge
  const H = S.railHeight;

  const stepsWithPosts = [];
  for (let k = 0; k < n - 1; k += S.postEvery) stepsWithPosts.push(k);
  if (stepsWithPosts[stepsWithPosts.length - 1] !== n - 2) stepsWithPosts.push(n - 2);

  // flight 1 (rising +Z)
  const f1 = stepsWithPosts.map((k) => ({ z: zs + (k + 0.5) * T, y: y0 + (k + 1) * r }));
  // flight 2 (rising −Z)
  const f2 = stepsWithPosts.map((k) => ({ z: zL - (k + 0.5) * T, y: y0 + half + (k + 1) * r }));
  for (const q of f1) post(placer, mats, xa, q.y, q.z);
  for (const q of f2) post(placer, mats, xb, q.y, q.z);

  const a0 = f1[0];
  const a1 = f1[f1.length - 1];
  const b0 = f2[0];
  const b1 = f2[f2.length - 1];
  // handrail (поручень) with the U-turn over the landing (повороты поручня)
  const zTurn = zL + 0.14;
  const yTurn = y0 + half + H;
  rail(placer, mats, [xa, a0.y + H, a0.z], [xa, a1.y + H, a1.z], S.handrailRadius);
  rail(placer, mats, [xa, a1.y + H, a1.z], [xa, yTurn, zTurn], S.handrailRadius);
  rail(placer, mats, [xa, yTurn, zTurn], [xb, yTurn, zTurn], S.handrailRadius);
  rail(placer, mats, [xb, yTurn, zTurn], [xb, b0.y + H, b0.z], S.handrailRadius);
  rail(placer, mats, [xb, b0.y + H, b0.z], [xb, b1.y + H, b1.z], S.handrailRadius);
  post(placer, mats, (xa + xb) / 2, y0 + half, zTurn);

  // strings (тетива) parallel to the handrail, turning with it
  for (const f of S.strings) {
    const h = H * f;
    const ya = y0 + half + h;
    rail(placer, mats, [xa, a0.y + h, a0.z], [xa, a1.y + h, a1.z], S.stringRadius);
    rail(placer, mats, [xa, a1.y + h, a1.z], [xa, ya, zTurn], S.stringRadius);
    rail(placer, mats, [xa, ya, zTurn], [xb, ya, zTurn], S.stringRadius);
    rail(placer, mats, [xb, ya, zTurn], [xb, b0.y + h, b0.z], S.stringRadius);
    rail(placer, mats, [xb, b0.y + h, b0.z], [xb, b1.y + h, b1.z], S.stringRadius);
  }
}

/** Wall-mounted handrails on the outer side of both flights (кронштейны настенные). */
function createWallHandrails(placer, well, y0, mats) {
  const S = STAIRS;
  const { n, r, half, zs, zL, xi0, xi1 } = well;
  const T = S.tread;
  const H = S.railHeight;
  const flights = [
    { x: xi0 + 0.07, wall: xi0, zA: zs + 0.5 * T, yA: y0 + r, zB: zL - 0.5 * T, yB: y0 + (n - 1) * r },
    { x: xi1 - 0.07, wall: xi1, zA: zL - 0.5 * T, yA: y0 + half + r, zB: zs + 0.5 * T, yB: y0 + half + (n - 1) * r },
  ];
  for (const f of flights) {
    rail(placer, mats, [f.x, f.yA + H, f.zA], [f.x, f.yB + H, f.zB], 0.02);
    for (const t of [0.15, 0.5, 0.85]) {
      const z = f.zA + (f.zB - f.zA) * t;
      const y = f.yA + (f.yB - f.yA) * t + H;
      placer.rod(L, mats.steel, [f.wall, y - 0.05, z], [f.x, y - 0.05, z], 0.008);
      placer.rod(L, mats.steel, [f.x, y - 0.05, z], [f.x, y, z], 0.008);
      placer.box(L, mats.steel, f.wall + Math.sign(f.x - f.wall) * 0.004, y - 0.05, z, 0.008, 0.06, 0.06);
    }
  }
}

