import * as THREE from 'three';
import { COPING, FRONT_ZONES } from './config.js';
import { computeLayout } from './layout.js';
import { buildFacade } from './facade.js';
import { createRoof } from './roof.js';
import { createFloorSlabs, createPlanFloor } from './interior.js';
import { createStairs, stairWell } from './stairs.js';
import { PLAN_STAIRS, planToWorld } from './plan4.js';
import { InstanceSink, Placer, createRng, disposeObject } from './utils.js';

/** Toggleable element categories (each becomes a child group). */
export const LAYERS = [
  'structure', 'windows', 'fins', 'hvac', 'entrance', 'service', 'roof',
  'slabs', 'interior', 'stairWalls', 'stairs', 'labels',
];

/** Scopes: each facade and each storey can be hidden on its own. */
export const FACADES = ['front', 'back', 'left', 'right'];

/**
 * The complete building. All geometry is generated procedurally from `params`:
 * four extruded facade skins with real openings, windows, fins, HVAC units,
 * entrance/stair, service area, parapet, roof equipment and the interior
 * (floor slabs, two-flight stairs in both stair cores, the traced 4th-floor plan).
 *
 * Instances are grouped as  category group → scope group  (e.g. windows → front),
 * so a category and a facade/floor can be toggled independently.
 */
export class Building extends THREE.Group {
  constructor(params, materials) {
    super();
    this.name = 'Building';
    this.params = params;
    this.materials = materials;
    this.parts = {};
    this.sinks = new Map();
    for (const key of LAYERS) {
      const g = new THREE.Group();
      g.name = key;
      this.parts[key] = g;
      this.add(g);
    }
    const store = {
      sink: (category, scope) => {
        const k = `${category}|${scope}`;
        if (!this.sinks.has(k)) this.sinks.set(k, new InstanceSink());
        return this.sinks.get(k);
      },
      group: (category, scope) => this.scopeGroup(category, scope),
    };
    this.placer = new Placer(store);
    this.rng = createRng(params.seed);
    this.layout = computeLayout(params);

    this.createStructure();
    this.createFacades();
    this.createInterior();
    this.createRoof();
    this.finalize();
  }

  scopeGroup(category, scope) {
    const parent = this.parts[category];
    let g = parent.children.find((c) => c.name === scope);
    if (!g) {
      g = new THREE.Group();
      g.name = scope;
      parent.add(g);
    }
    return g;
  }

  /** Parapet coping – long sides run full length, short sides fit between. */
  createStructure() {
    const p = this.params;
    const { parapetTop } = this.layout.levels;
    const W = p.buildingWidth;
    const D = p.buildingDepth;
    const t = p.wallThickness;
    const c = COPING.overhang;
    const y0 = parapetTop;
    const y1 = parapetTop + COPING.height;
    const m = this.materials.coping;
    const P = this.placer;
    P.withScope('front').boxMinMax('structure', m, -W / 2 - c, y0, D / 2 - t - c, W / 2 + c, y1, D / 2 + c);
    P.withScope('back').boxMinMax('structure', m, -W / 2 - c, y0, -D / 2 - c, W / 2 + c, y1, -D / 2 + t + c);
    P.withScope('right').boxMinMax('structure', m, W / 2 - t - c, y0, -D / 2 + t + c, W / 2 + c, y1, D / 2 - t - c);
    P.withScope('left').boxMinMax('structure', m, -W / 2 - c, y0, -D / 2 + t + c, -W / 2 + t + c, y1, D / 2 - t - c);
  }

  /** Front, sides and back – each from the layout description (see layout.js). */
  createFacades() {
    const ctx = { params: this.params, levels: this.layout.levels, materials: this.materials, rng: this.rng };
    for (const def of this.layout.facades) buildFacade(this.placer, def, ctx);
  }

  /** Stair cores (aligned with the facade strips), floor slabs, stairs and the traced plan. */
  createInterior() {
    const p = this.params;
    const lv = this.layout.levels;
    const W = p.buildingWidth;
    const D = p.buildingDepth;
    const t = p.wallThickness;
    const half = FRONT_ZONES.stairStrip / 2;
    this.wells = PLAN_STAIRS.map((s, i) => {
      const cx = this.layout.stairCoresX[i];
      const z0 = planToWorld(s.x0, s.y0, W, D, t)[1];
      return stairWell({ x0: cx - half, x1: cx + half, z0, z1: D / 2 - t }, p);
    });
    createFloorSlabs(this.placer, p, lv, this.wells.map((w) => w.hole), this.materials);
    for (const w of this.wells) createStairs(this.placer, w, p, lv, this.materials);
    createPlanFloor(this.placer, p, lv, this.materials);
  }

  createRoof() {
    createRoof(this.placer, this.params, this.layout.levels, this.materials, this.rng);
  }

  /** Converts collected instances into InstancedMeshes. */
  finalize() {
    for (const [key, sink] of this.sinks) {
      const [category, scope] = key.split('|');
      sink.build(this.scopeGroup(category, scope));
    }
    this.sinks.clear();
  }

  setLayerVisible(key, visible) {
    if (this.parts[key]) this.parts[key].visible = visible;
  }

  /** Shows/hides one facade (skin, windows, fins, AC units, doors…) or one storey. */
  setScopeVisible(scope, visible) {
    for (const g of Object.values(this.parts)) {
      for (const child of g.children) if (child.name === scope) child.visible = visible;
    }
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
