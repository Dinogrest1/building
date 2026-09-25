import * as THREE from 'three';
import { BASEMENT, ARROWS } from './config.js';

export const STAIR_COLOR = '#c9c5bd';
export const DOOR_FRAME_COLOR = '#6d7175';

/** Subtle procedural plaster noise so large walls don't look like flat CG. */
function createPlasterTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  let seed = 1234;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 238 + rnd() * 17;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  // faint horizontal panel joints (every 1/2 tile)
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
  ctx.moveTo(0, 0.5); ctx.lineTo(size, 0.5);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / 3.5, 1 / 3.5); // extrude UVs are in metres → one tile ≈ 3.5 m
  tex.anisotropy = 4;
  return tex;
}

/** Roofing membrane: sheets with slightly visible seams. */
function createRoofTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  let seed = 99;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 225 + rnd() * 30;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  const sheets = 4;
  for (let i = 0; i <= sheets; i++) {
    const p = (i / sheets) * size;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
  }
  for (let i = 0; i <= 2; i++) {
    const p = (i / 2) * size + (i % 2) * 8;
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Creates the restrained architectural material palette.
 * Colours come from params.colors so they can be changed live from the GUI.
 */
export function createMaterials(colors) {
  const plaster = createPlasterTexture();
  const roofTex = createRoofTexture();

  const m = {
    facade: new THREE.MeshStandardMaterial({ color: colors.facade, map: plaster, roughness: 0.92, metalness: 0 }),
    sideFacade: new THREE.MeshStandardMaterial({ color: colors.sideFacade, map: plaster, roughness: 0.92, metalness: 0 }),
    plinth: new THREE.MeshStandardMaterial({ color: colors.plinth, roughness: 0.95 }),
    coping: new THREE.MeshStandardMaterial({ color: '#b9b8b5', roughness: 0.6, metalness: 0.3 }),
    fin: new THREE.MeshStandardMaterial({ color: colors.fin, roughness: 0.85 }),
    interior: new THREE.MeshStandardMaterial({ color: '#3d4043', roughness: 1 }),

    glass: new THREE.MeshPhysicalMaterial({
      color: colors.glass,
      roughness: 0.06,
      metalness: 0.25,
      reflectivity: 0.5,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.8,
    }),
    frame: new THREE.MeshStandardMaterial({ color: colors.frame, roughness: 0.5, metalness: 0.4 }),
    sill: new THREE.MeshStandardMaterial({ color: '#a7a8a8', roughness: 0.45, metalness: 0.5 }),

    roof: new THREE.MeshStandardMaterial({ color: colors.roof, map: roofTex, roughness: 0.95 }),
    roofEquipment: new THREE.MeshStandardMaterial({ color: '#8a8d90', roughness: 0.55, metalness: 0.45 }),
    roofEquipmentDark: new THREE.MeshStandardMaterial({ color: '#5e6164', roughness: 0.6, metalness: 0.4 }),
    roofPad: new THREE.MeshStandardMaterial({ color: '#8c8b88', roughness: 0.95 }),

    metal: new THREE.MeshStandardMaterial({ color: colors.metal, roughness: 0.45, metalness: 0.7 }),
    hvac: new THREE.MeshStandardMaterial({ color: colors.hvac, roughness: 0.6, metalness: 0.25 }),
    hvacGrille: new THREE.MeshStandardMaterial({ color: '#0b0c0d', roughness: 0.8, metalness: 0.2 }),

    concrete: new THREE.MeshStandardMaterial({ color: '#b5b3ae', roughness: 0.95 }),
    door: new THREE.MeshStandardMaterial({ color: '#34373a', roughness: 0.4, metalness: 0.6 }),
    shutter: new THREE.MeshStandardMaterial({ color: '#8b8e91', roughness: 0.5, metalness: 0.55 }),
    grille: new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: 0.7, metalness: 0.3 }),

    // ---- interior ----
    slab: new THREE.MeshStandardMaterial({ color: '#b9b7b2', roughness: 0.95 }),
    interiorWall: new THREE.MeshStandardMaterial({ color: '#e8e6e1', roughness: 0.9 }),
    cubicle: new THREE.MeshStandardMaterial({ color: '#aebcc2', roughness: 0.6 }),
    doorFrame: new THREE.MeshStandardMaterial({ color: '#6d7175', roughness: 0.5, metalness: 0.4 }),
    doorFrameNarrow: new THREE.MeshStandardMaterial({ color: '#6d7175', roughness: 0.5, metalness: 0.4 }),
    doorLeaf: new THREE.MeshStandardMaterial({ color: '#d6d0c2', roughness: 0.7 }),
    stair: new THREE.MeshStandardMaterial({ color: STAIR_COLOR, roughness: 0.85 }),
    stairNosing: new THREE.MeshStandardMaterial({ color: '#8b8e91', roughness: 0.5, metalness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: '#d3d8dc', roughness: 0.22, metalness: 0.9 }),
    markup: new THREE.MeshStandardMaterial({ color: '#45484c', roughness: 0.8 }),
    route: new THREE.MeshStandardMaterial({ color: ARROWS.color, roughness: 0.6, emissive: '#3a0703', side: THREE.DoubleSide }),
    // front additions
    canopySheet: new THREE.MeshStandardMaterial({ color: BASEMENT.canopyColor, roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide }),
    canopyRib: new THREE.MeshStandardMaterial({ color: BASEMENT.ribColor, roughness: 0.5, metalness: 0.5 }),
    arrow: new THREE.MeshStandardMaterial({ color: ARROWS.color, roughness: 0.6, emissive: '#3a0703', side: THREE.DoubleSide }),
    railGlass: new THREE.MeshPhysicalMaterial({
      color: '#a8d6d4', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false,
    }),
  };

  // Keep a reference for texture repeat updates on the roof.
  m.roof.userData.texture = roofTex;
  return m;
}

/** Applies colour changes from the GUI without rebuilding geometry. */
export function applyColors(materials, colors) {
  materials.facade.color.set(colors.facade);
  materials.sideFacade.color.set(colors.sideFacade);
  materials.plinth.color.set(colors.plinth);
  materials.fin.color.set(colors.fin);
  materials.glass.color.set(colors.glass);
  materials.frame.color.set(colors.frame);
  materials.roof.color.set(colors.roof);
  materials.hvac.color.set(colors.hvac);
  materials.metal.color.set(colors.metal);
}

export function setWireframe(materials, enabled) {
  for (const mat of Object.values(materials)) mat.wireframe = enabled;
}

/** Stair appearance: highlight colour and transparent flights. */
export function setStairStyle(materials, { highlight, color, transparent, opacity }) {
  const m = materials.stair;
  m.color.set(highlight ? color : STAIR_COLOR);
  const wasTransparent = m.transparent;
  m.transparent = transparent;
  m.opacity = transparent ? opacity : 1;
  m.depthWrite = !transparent;
  if (wasTransparent !== transparent) m.needsUpdate = true;
}

/** Colours door frames narrower than the inclusivity norm. */
export function setNarrowDoorHighlight(materials, enabled) {
  materials.doorFrameNarrow.color.set(enabled ? '#d9342b' : DOOR_FRAME_COLOR);
  materials.doorFrameNarrow.emissive.set(enabled ? '#5a0d08' : '#000000');
}

/** Materials that stay whole in a section cut, so the stairs read through every floor. */
const SECTION_KEEP = new Set(['stair', 'stairNosing', 'steel', 'railGlass']);

/**
 * Section cut: everything in front of `plane` is clipped away except the stairs.
 * Pass null to remove the cut. Cut members show their back faces so they read as solids.
 */
export function setSectionCut(materials, plane) {
  for (const [key, m] of Object.entries(materials)) {
    if (SECTION_KEEP.has(key)) continue;
    const had = m.clippingPlanes?.length > 0;
    m.clippingPlanes = plane ? [plane] : [];
    m.clipShadows = true;
    m.userData.baseSide ??= m.side; // restore each material's own side when the cut is removed
    m.side = plane && key !== 'glass' ? THREE.DoubleSide : m.userData.baseSide;
    if (had !== Boolean(plane)) m.needsUpdate = true;
  }
}
