import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CAMERA_PRESETS, CAMERA_FOV, DEFAULT_PRESET } from './config.js';
import { Navigation } from './navigation.js';

const BACKGROUND = 0xf3f3f1;

/**
 * Renderer, scene, lighting, ground, camera, controls and post-processing.
 */
export class Viewer {
  constructor(container) {
    this.container = container;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    scene.fog = new THREE.Fog(BACKGROUND, 400, 900);
    // soft studio environment for subtle glass/metal reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    this.scene = scene;

    this.createLights();
    this.createGround();

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 1, 2000);
    this.camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 520;
    controls.maxPolarAngle = Math.PI * 0.495; // stay above the ground
    controls.screenSpacePanning = true;
    this.controls = controls;
    this.targetBounds = new THREE.Box3(new THREE.Vector3(-35, 0, -25), new THREE.Vector3(35, 20, 25));
    controls.addEventListener('change', () => controls.target.clamp(this.targetBounds.min, this.targetBounds.max));
    controls.addEventListener('start', () => { this.anim = null; });

    this.nav = new Navigation(this);

    this.setupComposer();
    this.applyPreset(DEFAULT_PRESET, false);

    window.addEventListener('resize', () => this.onResize());
  }

  createLights() {
    this.hemi = new THREE.HemisphereLight(0xeef2f7, 0xc9c6c0, 1.05);
    this.scene.add(this.hemi);

    const sun = new THREE.DirectionalLight(0xfffaf2, 1.3);
    this.sunOffset = new THREE.Vector3(-22, 60, 40);
    sun.position.copy(this.sunOffset);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const s = sun.shadow.camera;
    s.left = -36; s.right = 36; s.top = 30; s.bottom = -30; s.near = 10; s.far = 160;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;
  }

  createGround() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(300, 64),
      new THREE.MeshStandardMaterial({ color: 0xeeedea, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);
    this.ground = ground;
  }

  setupComposer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    try {
      const ao = new GTAOPass(this.scene, this.camera, w, h);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 0.85;
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.2, samples: 16 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      this.composer.addPass(ao);
      this.aoPass = ao;
    } catch (err) {
      console.warn('GTAO unavailable, continuing without ambient occlusion', err);
    }
    this.composer.addPass(new OutputPass());
  }

  setAO(enabled) {
    if (this.aoPass) this.aoPass.enabled = enabled;
  }

  setShadows(enabled) {
    this.sun.castShadow = enabled;
  }

  setSunIntensity(v) {
    this.sun.intensity = v;
  }

  /** Moves the camera to a named preset (back in orbit mode), animated by default. */
  applyPreset(name, animate = true) {
    const preset = CAMERA_PRESETS[name];
    if (!preset) return;
    this.nav?.setMode('orbit');
    const [pos, target] = preset;
    const toPos = new THREE.Vector3(...pos);
    const toTarget = new THREE.Vector3(...target);
    if (!animate) {
      this.camera.position.copy(toPos);
      this.controls.target.copy(toTarget);
      this.camera.fov = CAMERA_FOV;
      this.camera.updateProjectionMatrix();
      this.controls.update();
      this.anim = null;
      return;
    }
    this.anim = {
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      fromFov: this.camera.fov,
      toPos, toTarget, toFov: CAMERA_FOV, t: 0, duration: 1.1,
    };
  }

  /** Keeps the camera offset but moves the orbit pivot to `point` (animated). */
  focusOn(point) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const toTarget = point.clone().clamp(this.targetBounds.min, this.targetBounds.max);
    // come a bit closer when the view is far away from the new pivot
    const dist = Math.min(offset.length(), Math.max(15, offset.length() * 0.6));
    this.anim = {
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      fromFov: this.camera.fov,
      toPos: toTarget.clone().add(offset.setLength(dist)),
      toTarget, toFov: this.camera.fov, t: 0, duration: 0.7,
    };
  }

  updateAnimation(dt) {
    const a = this.anim;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / a.duration);
    const k = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2; // easeInOutCubic
    this.camera.position.lerpVectors(a.fromPos, a.toPos, k);
    this.controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
    if (a.fromFov !== a.toFov) {
      this.camera.fov = a.fromFov + (a.toFov - a.fromFov) * k;
      this.camera.updateProjectionMatrix();
    }
    if (a.t >= 1) this.anim = null;
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(w, h);
  }

  start() {
    const timer = new THREE.Timer();
    const loop = (time) => {
      timer.update(time);
      const dt = Math.min(timer.getDelta(), 0.1);
      this.updateAnimation(dt);
      this.nav.update(dt);
      if (this.nav.mode === 'orbit') this.controls.update();
      this.composer.render();
      requestAnimationFrame(loop);
    };
    loop();
  }
}
