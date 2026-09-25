import GUI from 'lil-gui';
import { CAMERA_PRESETS, DEFAULT_PARAMS, DEFAULT_PRESET, SERVICE } from './config.js';
import { FACADES } from './building.js';
import { NAV } from './navigation.js';
import { sanitizeSignText, setAnnexSignText } from './serviceArea.js';

/** Display toggles that map directly onto building layers. */
const LAYER_TOGGLES = {
  roof: 'roof', hvac: 'hvac', fins: 'fins', windows: 'windows',
  slabs: 'slabs', interiorWalls: 'interior', stairWalls: 'stairWalls', stairs: 'stairs', labels: 'labels',
  porch: 'porch', canopies: 'canopies', annex: 'annex', entranceDoors: 'entrance', service: 'service',
  basement: 'basement', arrows: 'arrows', markup: 'markup',
};
const FACADE_KEYS = { front: 'wallFront', back: 'wallBack', left: 'wallLeft', right: 'wallRight' };

/**
 * lil-gui panel + HTML camera preset buttons.
 * `app` exposes: viewer, building(), params, rebuild(), setWireframe(), applyColors(),
 * setStairStyle(), setNarrowDoors().
 */
export function createUI(app) {
  const { viewer, params } = app;
  const gui = new GUI({ title: 'Building' });

  const VIEW_DEFAULTS = {
    roof: true, hvac: true, fins: true, windows: true,
    shadows: true, wireframe: false, ambientOcclusion: true,
    sunIntensity: viewer.sun.intensity,
    // walls & interior
    wallFront: true, wallBack: true, wallLeft: true, wallRight: true,
    slabs: true, interiorWalls: true, stairWalls: true, stairs: true, labels: true,
    highlightStairs: false, stairColor: '#e8742c',
    transparentStairs: false, stairOpacity: 0.35,
    narrowDoors: false,
    // additions in front of the main facade
    porch: true, canopies: true, annex: true, entranceDoors: true, service: true,
    basement: true, arrows: true,
    annexText: SERVICE.sign.text, // digits on the technical annex sign
    stairFront: true, // facade strips in front of the stair shafts
    markup: true,     // plan lines on the 4th floor
    floor4Facade: true, // exterior walls with windows of the 4th floor
    // section through the stair shafts
    section: false, sectionDepth: 4.2,
  };
  const view = {
    ...VIEW_DEFAULTS,
    resetCamera: () => { viewer.applyPreset(DEFAULT_PRESET); setActive(DEFAULT_PRESET); },
    resetAll: () => resetAll(),
    showFloor4: () => showFloor4(),
    showStairShafts: () => showStairShafts(),
  };

  gui.add(view, 'resetAll').name('↺ Reset all to defaults');

  // ---------------- Camera / navigation ----------------
  const nav = viewer.nav;
  const camState = { speed: NAV.speed, fov: viewer.camera.fov, walk: () => toggleWalk() };
  const fCam = gui.addFolder('Camera');
  const walkCtrl = fCam.add(camState, 'walk').name('▸ Walk mode (first person)');
  fCam.add(camState, 'speed', 1, 60, 0.5).name('move speed, m/s').onChange((v) => { nav.speed = v; });
  const fovCtrl = fCam.add(camState, 'fov', 5, 90, 1).name('lens (field of view), °').onChange((v) => {
    viewer.anim = null;
    viewer.camera.fov = v;
    viewer.camera.updateProjectionMatrix();
  });
  // keep the lens slider in sync when presets animate the field of view
  viewer.controls.addEventListener('change', () => {
    if (Math.abs(camState.fov - viewer.camera.fov) > 0.5) { camState.fov = Math.round(viewer.camera.fov); fovCtrl.updateDisplay(); }
  });
  fCam.add(view, 'resetCamera').name('Reset camera');

  const HINTS = {
    orbit: 'Drag: rotate · Right drag: pan · Wheel: zoom · WASD/arrows: move · Q/E: down/up · Shift: faster · Double-click: new pivot',
    walk: 'Walk mode · Drag: look around · WASD/arrows: walk · Q/E: down/up · Wheel: step · Shift: faster · Esc: exit',
  };
  const hint = document.querySelector('#hud .hint');
  const syncNav = (mode) => {
    if (hint) hint.textContent = HINTS[mode];
    walkCtrl.name(mode === 'walk' ? '◂ Exit walk mode' : '▸ Walk mode (first person)');
    walkBtn?.classList.toggle('active', mode === 'walk');
    if (walkBtn) walkBtn.textContent = mode === 'walk' ? 'Exit walk' : 'Walk';
    if (mode === 'walk') setActive(null);
  };
  nav.onChange(syncNav);

  /** Walk mode continues from the current camera position, direction and lens. */
  function toggleWalk() {
    nav.toggle();
  }

  /** Pushes every display option in `view` onto the scene. */
  function applyView() {
    const b = app.building();
    for (const [k, layer] of Object.entries(LAYER_TOGGLES)) b.setLayerVisible(layer, view[k]);
    for (const f of FACADES) {
      b.setScopeVisible(f, view[FACADE_KEYS[f]]);
      b.setScopeVisible(`${f}-floor4`, view[FACADE_KEYS[f]] && view.floor4Facade);
      b.setScopeVisible(`${f}-parapet`, view[FACADE_KEYS[f]] && view.roof); // parapet + coping go with the roof
    }
    b.setScopeVisible('front-stairs', view.wallFront && view.stairFront);
    b.setScopeVisible('front-stairs-floor4', view.wallFront && view.stairFront && view.floor4Facade);
    viewer.setShadows(view.shadows);
    viewer.setAO(view.ambientOcclusion);
    viewer.setSunIntensity(view.sunIntensity);
    app.setWireframe(view.wireframe);
    app.setStairStyle({
      highlight: view.highlightStairs, color: view.stairColor,
      transparent: view.transparentStairs, opacity: view.stairOpacity,
    });
    app.setNarrowDoors(view.narrowDoors);
    app.setSection(view.section ? view.sectionDepth : null);
    setAnnexSignText(app.building(), view.annexText);
    applyRooms();
    viewer.setAO(view.ambientOcclusion && !view.section); // AO pass ignores clipping
  }

  // ---------------- Display ----------------
  const fView = gui.addFolder('Display');
  for (const key of ['roof', 'hvac', 'fins', 'windows']) fView.add(view, key).onChange(applyView);
  fView.add(view, 'shadows').onChange(applyView);
  fView.add(view, 'ambientOcclusion').name('ambient occlusion').onChange(applyView);
  fView.add(view, 'wireframe').onChange(applyView);
  fView.add(view, 'sunIntensity', 0, 5, 0.05).name('sun intensity').onChange(applyView);

  // ---------------- Walls & interior ----------------
  const fWalls = gui.addFolder('Walls & interior');
  fWalls.add(view, 'showFloor4').name('▸ Look into 4th floor');
  fWalls.add(view, 'wallFront').name('front facade').onChange(applyView);
  fWalls.add(view, 'stairFront').name('front wall of stair shafts').onChange(applyView);
  fWalls.add(view, 'floor4Facade').name('4th floor exterior walls & windows').onChange(applyView);
  fWalls.add(view, 'wallBack').name('back facade').onChange(applyView);
  fWalls.add(view, 'wallLeft').name('left facade').onChange(applyView);
  fWalls.add(view, 'wallRight').name('right facade').onChange(applyView);
  fWalls.add(view, 'interiorWalls').name('4th floor walls & doors').onChange(applyView);
  fWalls.add(view, 'stairWalls').name('stair core walls').onChange(applyView);
  fWalls.add(view, 'slabs').name('floor slabs').onChange(applyView);
  fWalls.add(view, 'labels').name('room names').onChange(applyView);
  fWalls.add(view, 'narrowDoors').name('mark doors < 900 mm').onChange(applyView);

  const fStairs = fWalls.addFolder('Stairs');
  fStairs.add(view, 'stairs').name('show stairs').onChange(applyView);
  fStairs.add(view, 'highlightStairs').name('highlight colour').onChange(applyView);
  fStairs.addColor(view, 'stairColor').name('colour').onChange(applyView);
  fStairs.add(view, 'transparentStairs').name('transparent flights').onChange(applyView);
  fStairs.add(view, 'stairOpacity', 0.05, 1, 0.05).name('opacity').onChange(applyView);

  // ---------------- Front additions ----------------
  const fFront = gui.addFolder('Front additions');
  fFront.add(view, 'porch').name('entrance porch & steps').onChange(applyView);
  fFront.add(view, 'canopies').name('canopies').onChange(applyView);
  fFront.add(view, 'annex').name('technical annex').onChange(applyView);
  const signCtrl = fFront.add(view, 'annexText').name(`annex sign (${SERVICE.sign.maxDigits} digits)`).onChange((v) => {
    const clean = sanitizeSignText(v);
    if (clean !== v) { view.annexText = clean; signCtrl.updateDisplay(); }
    setAnnexSignText(app.building(), clean);
  });
  const signInput = signCtrl.domElement.querySelector('input');
  signInput.maxLength = SERVICE.sign.maxDigits;
  signInput.inputMode = 'numeric';
  signInput.placeholder = '0000';
  fFront.add(view, 'basement').name('basement stair (under canopy)').onChange(applyView);
  fFront.add(view, 'arrows').name('route arrows').onChange(applyView);
  fFront.add(view, 'entranceDoors').name('entrance & utility doors').onChange(applyView);
  fFront.add(view, 'service').name('roller shutters & grilles').onChange(applyView);

  // ---------------- Section through the stair shafts ----------------
  const fSection = gui.addFolder('Section (stair shafts)');
  fSection.add(view, 'showStairShafts').name('▸ Show stair shafts');
  fSection.add(view, 'section').name('section cut').onChange(applyView);
  fSection.add(view, 'sectionDepth', 0, 13, 0.1).name('cut depth from facade, m').onChange(applyView);

  // ---------------- Rooms of the 4th floor ----------------
  // per-room state survives rebuilds (rooms keep their index)
  const roomList = () => app.building().rooms || [];
  const defaultRoomState = (r) => ({ fill: false, color: r.color, label: r.named, route: false });
  let roomState = roomList().map(defaultRoomState);
  let selectedRoom = -1; // orange outline, set by clicking a room or picking it in the list
  function applyRooms() {
    const b = app.building();
    b.setSelectedRoom(selectedRoom);
    roomList().forEach((r, i) => {
      roomState[i] ??= defaultRoomState(r);
      b.setRoom(i, roomState[i]);
    });
  }
  const fRooms = gui.addFolder('Rooms (4th floor)');
  const wallsCtl = {
    hideWalls: () => { view.interiorWalls = false; view.stairWalls = false; view.markup = true; applyView(); refreshControls(); },
    showWalls: () => { view.interiorWalls = true; view.stairWalls = true; applyView(); refreshControls(); },
  };
  fRooms.add(wallsCtl, 'hideWalls').name('▸ Hide all walls (keep markup)');
  fRooms.add(wallsCtl, 'showWalls').name('▸ Show all walls');
  fRooms.add(view, 'markup').name('plan markup on the floor').onChange(applyView);
  fRooms.add(view, 'floor4Facade').name('exterior walls & windows').onChange(applyView);

  const roomOptions = Object.fromEntries(roomList().map((r) => [r.displayName, r.index]));
  const sel = { room: 0, fill: false, color: '#8fb8de', label: true, route: false, nearest: '' };
  const syncSel = () => {
    const r = roomList()[sel.room];
    const st = roomState[sel.room];
    Object.assign(sel, { fill: st.fill, color: st.color, label: st.label, route: st.route });
    sel.nearest = r?.length != null ? `${r.stairName} · ${r.length.toFixed(1)} m` : 'no route';
    for (const c of fRooms.controllersRecursive()) c.updateDisplay();
  };
  const editSel = (key) => (v) => { roomState[sel.room][key] = v; applyRooms(); };
  fRooms.add(sel, 'room', roomOptions).name('room').onChange((i) => { selectedRoom = i; app.building().setSelectedRoom(i); syncSel(); });
  fRooms.add(sel, 'fill').name('colour the floor').onChange(editSel('fill'));
  fRooms.addColor(sel, 'color').name('colour').onChange((v) => { roomState[sel.room].color = v; roomState[sel.room].fill = true; sel.fill = true; applyRooms(); syncSel(); });
  fRooms.add(sel, 'label').name('show name').onChange(editSel('label'));
  fRooms.add(sel, 'route').name('arrow to nearest stairs').onChange(editSel('route'));
  fRooms.add(sel, 'nearest').name('nearest stairs').disable();
  const roomsCtl = {
    only: () => { roomState.forEach((st, i) => { st.label = i === sel.room; st.route = i === sel.room; }); applyRooms(); syncSel(); },
    allRoutes: () => { roomState.forEach((st) => { st.route = true; }); applyRooms(); syncSel(); },
    noRoutes: () => { roomState.forEach((st) => { st.route = false; }); applyRooms(); syncSel(); },
    allNames: () => { roomState.forEach((st) => { st.label = true; }); applyRooms(); syncSel(); },
    noNames: () => { roomState.forEach((st) => { st.label = false; }); applyRooms(); syncSel(); },
    clearColours: () => { roomState = roomList().map((r, i) => ({ ...roomState[i], fill: false, color: r.color })); applyRooms(); syncSel(); },
  };
  fRooms.add(roomsCtl, 'only').name('Only this room (name + arrow)');
  fRooms.add(roomsCtl, 'allRoutes').name('Arrows from every room');
  fRooms.add(roomsCtl, 'noRoutes').name('Hide all arrows');
  fRooms.add(roomsCtl, 'allNames').name('Show all names');
  fRooms.add(roomsCtl, 'noNames').name('Hide all names');
  fRooms.add(roomsCtl, 'clearColours').name('Clear room colours');
  syncSel();

  // click a room on the 4th floor to select it here
  nav.onPick((hit) => {
    if (!hit) return;
    const i = app.building().roomAt(hit.point);
    if (i < 0) return;
    sel.room = i;
    selectedRoom = i;
    app.building().setSelectedRoom(i);
    syncSel();
    gui.open();
    fRooms.open();
    fRooms.domElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  // keep the panel short: less used sections start collapsed
  for (const f of [fCam, fView, fFront, fSection, fStairs]) f.close();

  gui.add({ reset: () => resetDisplay() }, 'reset').name('↺ Default display, walls & interior');

  // ---------------- Parameters ----------------
  // Parametric model – geometry is regenerated on change
  const fParams = gui.addFolder('Parameters (rebuild)');
  const rebuild = () => {
    app.rebuild();
    applyView(); // keep display toggles after rebuild
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
  fParams.add({ reset: () => resetParams() }, 'reset').name('↺ Default parameters');
  fParams.close();

  // ---------------- Colours ----------------
  const fColors = gui.addFolder('Colours');
  for (const key of Object.keys(params.colors)) {
    fColors.addColor(params.colors, key).onChange(() => app.applyColors());
  }
  fColors.add({ reset: () => resetColors() }, 'reset').name('↺ Default colours');
  fColors.close();

  const refreshControls = () => { for (const c of gui.controllersRecursive()) c.updateDisplay(); };

  /** Building geometry parameters → defaults, one rebuild. */
  function resetParams() {
    const { colors, ...rest } = structuredClone(DEFAULT_PARAMS);
    Object.assign(params, rest);
    rebuild();
    refreshControls();
  }

  function resetColors() {
    Object.assign(params.colors, DEFAULT_PARAMS.colors); // keep the object the colour controllers are bound to
    app.applyColors();
    refreshControls();
  }

  /** Display + walls & interior toggles → defaults. */
  function resetDisplay() {
    Object.assign(view, VIEW_DEFAULTS);
    roomState = roomList().map(defaultRoomState);
    selectedRoom = -1;
    syncSel();
    applyView();
    refreshControls();
  }

  /** Restores every parameter, colour, display toggle and the camera. */
  function resetAll() {
    resetColors();
    resetDisplay();
    resetParams();
    view.resetCamera();
  }

  /** Cutaway: hide roof and front facade, then look down into the top floor. */
  function showFloor4() {
    view.roof = false;
    view.wallFront = false;
    applyView();
    refreshControls();
    viewer.applyPreset('Interior');
    setActive('Interior');
  }

  /** Cuts away the front of the building just in front of the stair flights. */
  function showStairShafts() {
    const well = app.building().wells?.[0];
    view.section = true;
    view.sectionDepth = well ? +(params.buildingDepth / 2 - well.zs + 0.25).toFixed(1) : 4.2;
    view.highlightStairs = true;
    view.stairWalls = true;
    view.roof = true;
    applyView();
    refreshControls();
    viewer.applyPreset('Section');
    setActive('Section');
  }

  // HTML preset buttons (bottom of the screen)
  const bar = document.getElementById('presets');
  const buttons = {};
  const setActive = (name) => {
    for (const [n, b] of Object.entries(buttons)) b.classList.toggle('active', n === name);
  };
  const addButton = (label, onClick, title) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    bar.appendChild(b);
    return b;
  };
  for (const name of Object.keys(CAMERA_PRESETS)) {
    if (name === 'Interior' || name === 'Section') continue;
    buttons[name] = addButton(name, () => { viewer.applyPreset(name); setActive(name); });
  }
  buttons.Interior = addButton('4th floor', showFloor4, 'Hide roof and front facade, look into the 4th floor');
  buttons.Section = addButton('Stair shafts', showStairShafts, 'Section cut through both stair shafts');
  const walkBtn = addButton('Walk', toggleWalk, 'First-person walk: drag to look, WASD to move');
  addButton('Reset camera', view.resetCamera);
  addButton('Reset all', resetAll, 'Restore all parameters, colours, display options and the camera');
  setActive(DEFAULT_PRESET);
  viewer.controls.addEventListener('start', () => setActive(null));

  syncNav(nav.mode);
  applyView();
  return gui;
}
