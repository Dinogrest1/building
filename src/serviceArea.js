import { SERVICE, FIN, COPING } from './config.js';

const L = 'service';

/** Ribbed roller shutter with side guides, external drum housing and a small canopy slab. */
export function createShutter(placer, o, mats) {
  const { u0, v0, w, h } = o;
  const z = -0.14;
  placer.boxMinMax(L, mats.shutter, u0, v0, z - 0.03, u0 + w, v0 + h, z);
  // horizontal ribs
  const ribs = Math.floor(h / SERVICE.ribSpacing);
  for (let i = 1; i < ribs; i++) {
    placer.box(L, mats.roofEquipmentDark, u0 + w / 2, v0 + i * SERVICE.ribSpacing, z + 0.006, w, 0.014, 0.012, { castShadow: false });
  }
  // bottom rail + guides
  placer.boxMinMax(L, mats.metal, u0, v0, z - 0.02, u0 + w, v0 + 0.08, z + 0.03);
  placer.boxMinMax(L, mats.metal, u0, v0, z - 0.04, u0 + 0.06, v0 + h, z + 0.04);
  placer.boxMinMax(L, mats.metal, u0 + w - 0.06, v0, z - 0.04, u0 + w, v0 + h, z + 0.04);
  // drum housing on the wall face above the opening
  placer.boxMinMax(L, mats.shutter, u0 - 0.08, v0 + h, 0, u0 + w + 0.08, v0 + h + 0.3, 0.28);
  // projecting canopy slab above
  placer.boxMinMax(L, mats.concrete, u0 - 0.25, v0 + h + 0.3, 0, u0 + w + 0.25, v0 + h + 0.4, SERVICE.canopyDepth);
}

/** Recessed louvred ventilation grille. */
export function createGrille(placer, o, mats) {
  const { u0, v0, w, h } = o;
  const z = -0.1;
  placer.boxMinMax(L, mats.hvacGrille, u0, v0, z - 0.06, u0 + w, v0 + h, z - 0.05);
  const fw = 0.04;
  placer.boxMinMax(L, mats.grille, u0, v0, z - 0.02, u0 + w, v0 + fw, z + 0.04);
  placer.boxMinMax(L, mats.grille, u0, v0 + h - fw, z - 0.02, u0 + w, v0 + h, z + 0.04);
  placer.boxMinMax(L, mats.grille, u0, v0, z - 0.02, u0 + fw, v0 + h, z + 0.04);
  placer.boxMinMax(L, mats.grille, u0 + w - fw, v0, z - 0.02, u0 + w, v0 + h, z + 0.04);
  const slats = 5;
  for (let i = 0; i < slats; i++) {
    const v = v0 + fw + ((h - 2 * fw) * (i + 0.5)) / slats;
    placer.box(L, mats.grille, u0 + w / 2, v, z, w - 2 * fw, 0.012, 0.09, { rotation: [-0.6, 0, 0] });
  }
}

/** Flat pilaster between service bays (shallower than the window fins). */
export function createPilaster(placer, pl, mats) {
  placer.box(L, mats.fin, pl.u, pl.v0 + pl.h / 2, FIN.depth * 0.3, FIN.width, pl.h, FIN.depth * 0.6);
}

/** Horizontal band marking the different subdivision of the service zone. */
export function createBand(placer, b, mats) {
  placer.boxMinMax(L, mats.fin, b.u0, b.v - 0.09, 0, b.u1, b.v + 0.09, 0.1);
}

/** Low walled utility enclosure projecting from the facade. */
export function createEnclosure(placer, u, mats) {
  const E = SERVICE.enclosure;
  const u0 = u - E.width / 2;
  const u1 = u + E.width / 2;
  placer.boxMinMax(L, mats.facade, u0, 0, 0.001, u1, E.height, E.depth);
  placer.boxMinMax(L, mats.coping, u0 - COPING.overhang, E.height, 0.001, u1 + COPING.overhang, E.height + COPING.height, E.depth + COPING.overhang);
  placer.boxMinMax(L, mats.plinth, u0 - 0.03, 0, 0.001, u1 + 0.03, 0.35, E.depth + 0.03);
  // metal service door + small louvre in the front
  placer.boxMinMax(L, mats.door, u0 + 0.5, 0.35, E.depth, u0 + 1.4, 1.7, E.depth + 0.03);
  placer.boxMinMax(L, mats.grille, u1 - 1.0, 1.0, E.depth, u1 - 0.4, 1.5, E.depth + 0.02);
}
