import GUI from 'lil-gui';
import { CAMERA_PRESETS, DEFAULT_PRESET } from './config.js';

/**
 * lil-gui debug panel + HTML camera preset buttons.
 * `app` exposes: viewer, building(), params, rebuild(), setWireframe(), applyColors().
 */
export function createUI(app) {
  const { viewer, params } = app;
  const gui = new GUI({ title: 'Building' });

  const view = {
    roof: true, hvac: true, fins: true, windows: true,
    shadows: true, wireframe: false, ambientOcclusion: true,
    sunIntensity: viewer.sun.intensity,
    resetCamera: () => { viewer.applyPreset(DEFAULT_PRESET); setActive(DEFAULT_PRESET); },
  };

  const fView = gui.addFolder('Display');
  const layerToggle = (key, layers) => fView.add(view, key).onChange((v) => {
    for (const l of layers) app.building().setLayerVisible(l, v);
  });
  layerToggle('roof', ['roof']);
  layerToggle('hvac', ['hvac']);
  layerToggle('fins', ['fins']);
  layerToggle('windows', ['windows']);
  fView.add(view, 'shadows').onChange((v) => viewer.setShadows(v));
  fView.add(view, 'ambientOcclusion').name('ambient occlusion').onChange((v) => viewer.setAO(v));
  fView.add(view, 'wireframe').onChange((v) => app.setWireframe(v));
  fView.add(view, 'sunIntensity', 0, 5, 0.05).name('sun intensity').onChange((v) => viewer.setSunIntensity(v));
  fView.add(view, 'resetCamera').name('Reset camera');

  // Parametric model – geometry is regenerated on change
  const fParams = gui.addFolder('Parameters (rebuild)');
  const rebuild = () => {
    app.rebuild();
    // keep display toggles after rebuild
    for (const [k, layers] of Object.entries({ roof: ['roof'], hvac: ['hvac'], fins: ['fins'], windows: ['windows'] })) {
      for (const l of layers) app.building().setLayerVisible(l, view[k]);
    }
    app.setWireframe(view.wireframe);
  };
  fParams.add(params, 'buildingWidth', 30, 70, 0.5).name('building width').onFinishChange(rebuild);
  fParams.add(params, 'buildingDepth', 8, 20, 0.5).name('building depth').onFinishChange(rebuild);
  fParams.add(params, 'floorCount', 1, 8, 1).name('floors').onFinishChange(rebuild);
  fParams.add(params, 'floorHeight', 3.0, 4.2, 0.05).name('floor height').onFinishChange(rebuild);
  fParams.add(params, 'parapetHeight', 0.3, 1.8, 0.05).name('roof/parapet height').onFinishChange(rebuild);
  fParams.add(params, 'centralModules', 4, 20, 1).name('window modules').onFinishChange(rebuild);
  fParams.add(params, 'windowPaneWidth', 0.5, 1.2, 0.02).name('window pane width').onFinishChange(rebuild);
  fParams.add(params, 'windowHeight', 1.2, 2.4, 0.05).name('window height').onFinishChange(rebuild);
  fParams.add(params, 'sillHeight', 0.5, 1.2, 0.05).name('sill height').onFinishChange(rebuild);
  fParams.add(params, 'hvacDensity', 0, 1, 0.01).name('HVAC density').onFinishChange(rebuild);
  fParams.add(params, 'seed', 1, 999, 1).name('random seed').onFinishChange(rebuild);
  fParams.close();

  const fColors = gui.addFolder('Colours');
  for (const key of Object.keys(params.colors)) {
    fColors.addColor(params.colors, key).onChange(() => app.applyColors());
  }
  fColors.close();

  // HTML preset buttons (bottom of the screen)
  const bar = document.getElementById('presets');
  const buttons = {};
  const setActive = (name) => {
    for (const [n, b] of Object.entries(buttons)) b.classList.toggle('active', n === name);
  };
  for (const name of Object.keys(CAMERA_PRESETS)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.addEventListener('click', () => { viewer.applyPreset(name); setActive(name); });
    bar.appendChild(b);
    buttons[name] = b;
  }
  const reset = document.createElement('button');
  reset.textContent = 'Reset camera';
  reset.addEventListener('click', view.resetCamera);
  bar.appendChild(reset);
  setActive(DEFAULT_PRESET);
  viewer.controls.addEventListener('start', () => setActive(null));

  return gui;
}
