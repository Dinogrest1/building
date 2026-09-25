import * as THREE from 'three';
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
  placer.boxMinMax('canopies', mats.concrete, u0 - 0.25, v0 + h + 0.3, 0, u0 + w + 0.25, v0 + h + 0.4, SERVICE.canopyDepth);
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
  placer.boxMinMax('annex', mats.facade, u0, 0, 0.001, u1, E.height, E.depth);
  placer.boxMinMax('annex', mats.coping, u0 - COPING.overhang, E.height, 0.001, u1 + COPING.overhang, E.height + COPING.height, E.depth + COPING.overhang);
  placer.boxMinMax('annex', mats.plinth, u0 - 0.03, 0, 0.001, u1 + 0.03, 0.35, E.depth + 0.03);
  // metal service door + small louvre in the front
  placer.boxMinMax('annex', mats.door, u0 + 0.5, 0.35, E.depth, u0 + 1.4, 1.7, E.depth + 0.03);
  placer.boxMinMax('annex', mats.grille, u1 - 1.0, 1.0, E.depth, u1 - 0.4, 1.5, E.depth + 0.02);

  // sign block standing on the annex roof at its front edge; the digits are editable
  const S = SERVICE.sign;
  const top = E.height + COPING.height;
  const zf = E.depth + COPING.overhang - 0.02;
  placer.boxMinMax('annex', mats.metal, u - S.width / 2, top, zf - S.depth, u + S.width / 2, top + S.height, zf);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(S.width - 0.08, S.height - 0.08), signMaterial(S.text));
  face.position.set(u, top + S.height / 2, zf + 0.003);
  face.name = 'annex-sign';
  placer.mesh('annex', face);

  // the same code painted on the ground in front of the annex: "КОД: 0000"
  const G = SERVICE.groundCode;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(G.width, G.height), groundCodeMaterial(S.text));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(u, 0.014, E.depth + G.offset);
  ground.renderOrder = 3;
  ground.name = 'annex-ground-code';
  placer.mesh('annexCode', ground);
}

/** Transparent canvas texture with painted "КОД: digits" for the ground. */
function groundCodeTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = SERVICE.groundCode.color;
  ctx.font = '800 150px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${SERVICE.groundCode.prefix} ${text || ''}`.trim(), canvas.width / 2, canvas.height / 2 + 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function groundCodeMaterial(text) {
  const mat = new THREE.MeshBasicMaterial({
    map: groundCodeTexture(text), transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -3,
  });
  mat.userData.disposable = true;
  return mat;
}

/** Canvas texture with the sign digits. */
function signTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f3ef';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#2b2d30';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = '#1d1f22';
  ctx.font = '700 128px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text || ' ', canvas.width / 2, canvas.height / 2 + 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function signMaterial(text) {
  const mat = new THREE.MeshStandardMaterial({ map: signTexture(text), roughness: 0.6 });
  mat.userData.disposable = true;
  return mat;
}

/** Keeps digits only, at most SERVICE.sign.maxDigits of them. */
export function sanitizeSignText(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, SERVICE.sign.maxDigits);
}

/** Updates the digits on the annex sign and the painted ground code under `root`. */
export function setAnnexSignText(root, text) {
  root.traverse((o) => {
    const make = o.name === 'annex-sign' ? signTexture : o.name === 'annex-ground-code' ? groundCodeTexture : null;
    if (!make) return;
    o.material.map?.dispose();
    o.material.map = make(text);
    o.material.needsUpdate = true;
  });
}
