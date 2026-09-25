import * as THREE from 'three';
import { FIN, FRONT_ZONES, SIDE_ZONES, SERVICE, SMALL_DOOR, ENTRANCE, WINDOW, HVAC } from './config.js';
import { createRng } from './utils.js';

/**
 * Pure layout step: turns parameters into a list of facade descriptions
 * (openings, fins, HVAC positions, special features). No Three.js meshes here,
 * which keeps the architecture easy to inspect and modify.
 *
 * Facade-local coordinates: u = along the wall (left → right seen from outside),
 * v = height above grade, w = outward from the wall face.
 */

export function levels(p) {
  const roofLevel = p.groundFloorLevel + p.floorCount * p.floorHeight;
  return {
    floor: (i) => p.groundFloorLevel + i * p.floorHeight,
    roofLevel,
    parapetTop: roofLevel + p.parapetHeight,
  };
}

/** Distributes groups of panes across a zone with equal piers between them. */
function layoutGroups(zoneStart, zoneWidth, panesList, paneWidth) {
  const n = panesList.length;
  const totalPanes = panesList.reduce((a, b) => a + b, 0);
  const minPier = 0.3;
  let pw = paneWidth;
  if (zoneWidth - totalPanes * pw < minPier * (n + 1)) {
    pw = Math.max(0.35, (zoneWidth - minPier * (n + 1)) / totalPanes);
  }
  const pier = (zoneWidth - totalPanes * pw) / (n + 1);
  const groups = [];
  let u = zoneStart + pier;
  panesList.forEach((panes, i) => {
    const w = panes * pw;
    groups.push({ index: i, u0: u, w, panes, paneWidth: pw });
    u += w + pier;
  });
  return groups;
}

/**
 * Fins stand just outside each group edge. When two groups are close,
 * the neighbouring fins merge into a single pilaster centred on the pier.
 */
function layoutFins(groups, zoneKey) {
  const cands = [];
  for (const g of groups) {
    const off = FIN.width / 2 + FIN.gap;
    cands.push({ u: g.u0 - off, groups: [g.index] });
    cands.push({ u: g.u0 + g.w + off, groups: [g.index] });
  }
  cands.sort((a, b) => a.u - b.u);
  const fins = [];
  for (const c of cands) {
    const last = fins[fins.length - 1];
    if (last && c.u - last.u < FIN.width + 0.12) {
      last.u = (last.u + c.u) / 2;
      last.groups.push(...c.groups);
    } else {
      fins.push({ u: c.u, groups: [...c.groups], zone: zoneKey });
    }
  }
  return fins;
}

/** Stacks one or more rows of windows (one per floor) from a group layout. */
function addWindowZone(facade, p, lv, zoneKey, groups, floors, skip = () => false) {
  const winV0 = (f) => lv.floor(f) + p.sillHeight;
  for (const f of floors) {
    for (const g of groups) {
      if (skip(f, g.index)) continue;
      facade.openings.push({
        kind: 'window', zone: zoneKey, group: g.index, floor: f,
        u0: g.u0, v0: winV0(f), w: g.w, h: p.windowHeight,
        panes: g.panes, paneWidth: g.paneWidth,
      });
    }
  }
  for (const fin of layoutFins(groups, zoneKey)) {
    for (const f of floors) {
      const active = fin.groups.some((gi) => !skip(f, gi));
      if (!active) continue;
      facade.fins.push({
        u: fin.u,
        v0: winV0(f) - FIN.overhang,
        h: p.windowHeight + 2 * FIN.overhang,
      });
    }
  }
}

/** Vertical strip of small square stair-core windows (+ optional door at grade). */
function addStairStrip(facade, p, lv, uCenter, withDoor) {
  const s = WINDOW.squareSize;
  const doorTop = SMALL_DOOR.height + 0.35;
  if (withDoor) {
    facade.openings.push({
      kind: 'smallDoor', u0: uCenter - SMALL_DOOR.width / 2, v0: 0,
      w: SMALL_DOOR.width, h: SMALL_DOOR.height,
    });
  }
  for (let f = 0; f < p.floorCount; f++) {
    for (let k = 0; k < p.squaresPerFloor; k++) {
      const vc = lv.floor(f) + (p.floorHeight * (k + 0.5)) / p.squaresPerFloor;
      if (withDoor && vc - s / 2 < doorTop) continue;
      if (vc + s / 2 > lv.roofLevel - 0.25) continue;
      facade.openings.push({ kind: 'square', u0: uCenter - s / 2, v0: vc - s / 2, w: s, h: s, floor: f });
    }
  }
}

/** Row of roller shutters with ventilation grilles above (service area). */
function addServiceRow(facade, zoneStart, zoneWidth, count, shutterWidth) {
  const gap = (zoneWidth - count * shutterWidth) / (count + 1);
  for (let i = 0; i < count; i++) {
    const u0 = zoneStart + gap + i * (shutterWidth + gap);
    facade.openings.push({ kind: 'shutter', u0, v0: 0, w: shutterWidth, h: SERVICE.shutterHeight });
    const gu0 = u0 + (shutterWidth - SERVICE.grilleWidth) / 2;
    facade.openings.push({
      kind: 'grille', u0: gu0, v0: SERVICE.shutterHeight + SERVICE.grilleGap,
      w: SERVICE.grilleWidth, h: SERVICE.grilleHeight,
    });
    // pilasters between the service bays
    if (i > 0) facade.pilasters.push({ u: u0 - gap / 2, v0: 0, h: SERVICE.shutterHeight + 1.25 });
  }
  facade.bands.push({ u0: zoneStart, u1: zoneStart + zoneWidth, v: SERVICE.shutterHeight + 1.35 });
}

/** Assigns external AC units to windows with a seeded, semi-irregular distribution. */
function assignHVAC(facade, p, rng, densityScale = 1) {
  for (const o of facade.openings) {
    if (o.kind !== 'window') continue;
    if (rng() > p.hvacDensity * densityScale) continue;
    // no units directly above the service bays (band + grilles occupy that wall)
    if (o.floor === 1 && facade.bands.some((bd) => o.u0 + o.w > bd.u0 && o.u0 < bd.u1)) continue;
    const roomForCluster = Math.floor(o.w / (HVAC.width * 0.9 + 0.06));
    let count = 1;
    const r = rng();
    if (roomForCluster >= 3 && r < 0.18) count = 3;
    else if (roomForCluster >= 2 && r < 0.4) count = 2;
    const scale = count > 1 ? 0.88 : 1;
    const uw = HVAC.width * scale;
    const span = count * uw + (count - 1) * 0.06;
    // pick a pane, then keep the unit (cluster) inside the opening's width
    const pane = Math.floor(rng() * o.panes);
    let uc = o.u0 + o.paneWidth * (pane + 0.5);
    uc = THREE.MathUtils.clamp(uc, o.u0 + span / 2, o.u0 + o.w - span / 2);
    const h = HVAC.height * scale;
    const vc = o.v0 - HVAC.belowSill - h / 2 - rng() * 0.08;
    for (let i = 0; i < count; i++) {
      facade.hvac.push({ u: uc - span / 2 + uw / 2 + i * (uw + 0.06), v: vc, w: uw, h, d: HVAC.depth * scale });
    }
  }
}

function newFacade(name, length, frame, material, plinthRange) {
  return {
    name, length, frame, material, plinthRange,
    openings: [], fins: [], hvac: [], pilasters: [], bands: [], features: [],
  };
}

export function computeLayout(p) {
  const W = p.buildingWidth;
  const D = p.buildingDepth;
  const t = p.wallThickness;
  const lv = levels(p);
  const rng = createRng(p.seed);
  const floors = [...Array(p.floorCount).keys()];
  const upper = floors.slice(1);

  // ---------- zone widths along the long facades ----------
  // Stair-core strips sit where the plan puts the stairs; the rest fills around them.
  const Z = FRONT_ZONES;
  const stripW = Z.stairStrip;
  const coreX = Z.stairCores.map((f) => -W / 2 + f * W);
  const x = { start: -W / 2 + Z.cornerPier };
  x.leftWing = x.start;
  x.leftStrip = coreX[0] - stripW / 2;
  x.central = x.leftStrip + stripW;
  x.rightStrip = coreX[1] - stripW / 2;
  x.rightWing = x.rightStrip + stripW;
  const leftW = x.leftStrip - x.leftWing;
  const centralWidth = x.rightStrip - x.central;
  const rightW = W / 2 - Z.cornerPier - x.rightWing;

  const centralPanes = Array.from({ length: p.centralModules }, (_, i) => Z.centralPattern[i % Z.centralPattern.length]);
  const pw = p.windowPaneWidth;

  // ================= FRONT (+Z) =================
  const front = newFacade('front', W,
    new THREE.Matrix4().makeTranslation(0, 0, D / 2), 'facade',
    [-W / 2 - 0.05, W / 2 + 0.05]);

  addWindowZone(front, p, lv, 'leftWing', layoutGroups(x.leftWing, leftW, Z.leftWing.panes, pw), floors);
  addStairStrip(front, p, lv, x.leftStrip + stripW / 2, true);

  const centralGroups = layoutGroups(x.central, centralWidth, centralPanes, pw);
  const entranceGroup = centralGroups[0];
  const enclosureGroup = centralGroups[centralGroups.length - 1];
  addWindowZone(front, p, lv, 'central', centralGroups, floors,
    (f, gi) => f === 0 && (gi === entranceGroup.index || gi === enclosureGroup.index));

  addStairStrip(front, p, lv, x.rightStrip + stripW / 2, true);
  addWindowZone(front, p, lv, 'rightWing', layoutGroups(x.rightWing, rightW, Z.rightWing.panes, pw), upper);
  addServiceRow(front, x.rightWing, rightW, 3, SERVICE.shutterWidth);

  // main entrance in front of the first central bay
  const eu = entranceGroup.u0 + entranceGroup.w / 2;
  front.openings.push({
    kind: 'entrance', u0: eu - ENTRANCE.doorWidth / 2, v0: lv.floor(0),
    w: ENTRANCE.doorWidth, h: ENTRANCE.doorHeight,
  });
  front.features.push({ type: 'entrance', u: eu });
  front.features.push({ type: 'enclosure', u: enclosureGroup.u0 + enclosureGroup.w / 2 });

  // ================= RIGHT SIDE (+X) =================
  const sideL = D - 2 * t;
  const sidePlinth = [-D / 2 + 0.01, D / 2 - 0.01];
  const right = newFacade('right', sideL,
    new THREE.Matrix4().makeTranslation(W / 2, 0, 0).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)),
    'sideFacade', sidePlinth);
  addWindowZone(right, p, lv, 'side', layoutGroups(-sideL / 2 + 0.4, sideL - 0.8, SIDE_ZONES.panes, pw), upper);
  addServiceRow(right, -sideL / 2 + 0.3, sideL - 0.6, 3, SERVICE.sideShutterWidth);

  // ================= LEFT SIDE (-X) =================
  const left = newFacade('left', sideL,
    new THREE.Matrix4().makeTranslation(-W / 2, 0, 0).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2)),
    'sideFacade', sidePlinth);
  addWindowZone(left, p, lv, 'side', layoutGroups(-sideL / 2 + 0.4, sideL - 0.8, [...SIDE_ZONES.panes].reverse(), pw), floors);

  // ================= BACK (-Z) =================
  // Seen from behind, world +X is on the left, so the zones are mirrored;
  // stair strips stay aligned with the stair cores.
  const back = newFacade('back', W,
    new THREE.Matrix4().makeTranslation(0, 0, -D / 2).multiply(new THREE.Matrix4().makeRotationY(Math.PI)),
    'facade', [-W / 2 - 0.05, W / 2 + 0.05]);
  const mirror = (xw, width) => -(xw + width); // world x-range start → local u start
  addWindowZone(back, p, lv, 'rightWing', layoutGroups(mirror(x.rightWing, rightW), rightW, [...Z.rightWing.panes].reverse(), pw), floors);
  addStairStrip(back, p, lv, -(x.rightStrip + stripW / 2), true);
  const backPanes = centralPanes.map((_, i) => Z.centralPattern[(i + 5) % Z.centralPattern.length]);
  addWindowZone(back, p, lv, 'central', layoutGroups(mirror(x.central, centralWidth), centralWidth, backPanes, pw), floors);
  addStairStrip(back, p, lv, -(x.leftStrip + stripW / 2), false);
  addWindowZone(back, p, lv, 'leftWing', layoutGroups(mirror(x.leftWing, leftW), leftW, [2, 1, 2], pw), floors);

  const facades = [front, right, back, left];
  assignHVAC(front, p, rng, 1);
  assignHVAC(right, p, rng, 1);
  assignHVAC(back, p, rng, 0.6);
  assignHVAC(left, p, rng, 0.6);

  return { facades, levels: lv, zones: x, centralWidth, stairCoresX: coreX };
}
