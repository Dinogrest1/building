import * as THREE from 'three';
import { COPING } from './config.js';
import { computeLayout } from './layout.js';
import { buildFacade } from './facade.js';
import { createRoof } from './roof.js';
import { InstanceSink, Placer, createRng, disposeObject } from './utils.js';

/** Toggleable element categories (each becomes a child group). */
export const LAYERS = ['structure', 'windows', 'fins', 'hvac', 'entrance', 'service', 'roof'];

/**
 * The complete building. All geometry is generated procedurally from `params`:
 * core mass, four extruded facade skins with real openings, windows, fins,
 * HVAC units, entrance/stair, service area, parapet and roof equipment.
 */
export class Building extends THREE.Group {
  constructor(params, materials) {
    super();
    this.name = 'Building';
    this.params = params;
    this.materials = materials;
    this.parts = {};
    this.sinks = {};
    for (const key of LAYERS) {
      const g = new THREE.Group();
      g.name = key;
      this.parts[key] = g;
      this.sinks[key] = new InstanceSink();
      this.add(g);
    }
    this.placer = new Placer(this.sinks, this.parts);
    this.rng = createRng(params.seed);
    this.layout = computeLayout(params);

    this.createStructure();
    this.createFacades();
    this.createRoof();
    this.finalize();
  }

  /** Main mass: inner core box (behind the facade skins) + parapet coping. */
  createStructure() {
    const p = this.params;
    const { roofLevel, parapetTop } = this.layout.levels;
    const W = p.buildingWidth;
    const D = p.buildingDepth;
    const t = p.wallThickness;
    const e = 0.005; // avoids coplanar faces with the skins

    const core = new THREE.Mesh(
      new THREE.BoxGeometry(W - 2 * t - 2 * e, roofLevel + 0.3, D - 2 * t - 2 * e),
      this.materials.interior,
    );
    core.position.set(0, (roofLevel - 0.3) / 2, 0);
    core.castShadow = true;
    core.receiveShadow = true;
    core.name = 'core';
    this.parts.structure.add(core);

    // parapet coping – long sides run full length, short sides fit between
    const c = COPING.overhang;
    const y0 = parapetTop;
    const y1 = parapetTop + COPING.height;
    const m = this.materials.coping;
    const P = this.placer;
    P.boxMinMax('structure', m, -W / 2 - c, y0, D / 2 - t - c, W / 2 + c, y1, D / 2 + c);
    P.boxMinMax('structure', m, -W / 2 - c, y0, -D / 2 - c, W / 2 + c, y1, -D / 2 + t + c);
    P.boxMinMax('structure', m, W / 2 - t - c, y0, -D / 2 + t + c, W / 2 + c, y1, D / 2 - t - c);
    P.boxMinMax('structure', m, -W / 2 - c, y0, -D / 2 + t + c, -W / 2 + t + c, y1, D / 2 - t - c);
  }

  /** Front, sides and back – each from the layout description (see layout.js). */
  createFacades() {
    const ctx = { params: this.params, levels: this.layout.levels, materials: this.materials, rng: this.rng };
    for (const def of this.layout.facades) buildFacade(this.placer, def, ctx);
  }

  createRoof() {
    createRoof(this.placer, this.params, this.layout.levels, this.materials, this.rng);
  }

  /** Converts collected instances into InstancedMeshes. */
  finalize() {
    for (const key of LAYERS) this.sinks[key].build(this.parts[key]);
  }

  setLayerVisible(key, visible) {
    if (this.parts[key]) this.parts[key].visible = visible;
  }

  /** Axis-aligned bounds used by the camera/controls. */
  getBounds() {
    return new THREE.Box3().setFromObject(this);
  }

  stats() {
    let meshes = 0;
    let instances = 0;
    this.traverse((o) => {
      if (o.isInstancedMesh) { meshes++; instances += o.count; } else if (o.isMesh) meshes++;
    });
    return { drawCalls: meshes, instances };
  }

  dispose() {
    disposeObject(this);
  }
}
