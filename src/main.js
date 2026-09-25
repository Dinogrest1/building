import { Viewer } from './scene.js';
import { Building } from './building.js';
import { createMaterials, applyColors, setWireframe } from './materials.js';
import { DEFAULT_PARAMS } from './config.js';
import { createUI } from './ui.js';

const params = structuredClone(DEFAULT_PARAMS);
const viewer = new Viewer(document.getElementById('app'));
const materials = createMaterials(params.colors);

let building = new Building(params, materials);
viewer.scene.add(building);

const app = {
  viewer,
  params,
  building: () => building,
  rebuild() {
    viewer.scene.remove(building);
    building.dispose();
    building = new Building(params, materials);
    viewer.scene.add(building);
  },
  setWireframe: (v) => setWireframe(materials, v),
  applyColors: () => applyColors(materials, params.colors),
};

createUI(app);
viewer.start();

// handy for inspection from the browser console
window.app = app;
