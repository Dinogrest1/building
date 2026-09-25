import { Viewer } from './scene.js';
import { Building } from './building.js';
import * as THREE from 'three';
import { createMaterials, applyColors, setWireframe, setStairStyle, setNarrowDoorHighlight, setSectionCut } from './materials.js';
import { DEFAULT_PARAMS } from './config.js';
import { createUI } from './ui.js';

const params = structuredClone(DEFAULT_PARAMS);
const viewer = new Viewer(document.getElementById('app'));
const materials = createMaterials(params.colors);
const sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0); // keeps z ≤ constant

let building = new Building(params, materials);
viewer.scene.add(building);
viewer.setGroundCutouts(building.groundCutouts);

const app = {
  viewer,
  params,
  building: () => building,
  rebuild() {
    viewer.scene.remove(building);
    building.dispose();
    building = new Building(params, materials);
    viewer.scene.add(building);
    viewer.setGroundCutouts(building.groundCutouts);
  },
  setWireframe: (v) => setWireframe(materials, v),
  applyColors: () => applyColors(materials, params.colors),
  setStairStyle: (style) => setStairStyle(materials, style),
  setNarrowDoors: (v) => setNarrowDoorHighlight(materials, v),
  /** depth = metres behind the main facade where the building is cut; null removes the cut. */
  setSection(depth) {
    if (depth == null) { setSectionCut(materials, null); return; }
    sectionPlane.constant = params.buildingDepth / 2 - depth;
    setSectionCut(materials, sectionPlane);
  },
};

createUI(app);
viewer.start();

// handy for inspection from the browser console
window.app = app;
