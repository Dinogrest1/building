import * as THREE from 'three';

/** Camera navigation settings. */
export const NAV = {
  speed: 8,          // m/s
  fastFactor: 3,     // with Shift
  lookSpeed: 0.0032, // rad per pixel of drag
  walkNear: 0.05,
  orbitNear: 1,
  exitDistance: 8,   // fallback pivot distance when leaving walk mode
};

const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyE', 'PageUp', 'Space'],
  down: ['KeyQ', 'PageDown', 'KeyC'],
};

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Free camera movement on top of OrbitControls.
 *
 * - orbit mode: WASD / arrows move the camera together with its pivot, Q/E down/up,
 *   double-click re-centres the pivot on the clicked surface.
 * - walk mode: first-person – drag to look around, WASD to walk, Q/E down/up,
 *   wheel moves forward/back. OrbitControls is paused meanwhile.
 */
export class Navigation {
  constructor(viewer) {
    this.viewer = viewer;
    this.mode = 'orbit';
    this.speed = NAV.speed;
    this.pressed = new Set();
    this.listeners = new Set();
    this.raycaster = new THREE.Raycaster();
    this.dragging = null;

    const dom = viewer.renderer.domElement;
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.pressed.clear());
    dom.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    dom.addEventListener('pointermove', (e) => this.onPointerMove(e));
    dom.addEventListener('pointerup', (e) => this.onPointerUp(e));
    dom.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    dom.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  onChange(fn) { this.listeners.add(fn); }

  emit() { for (const fn of this.listeners) fn(this.mode); }

  onKey(e, down) {
    const el = e.target;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
    if (down && e.code === 'Escape' && this.mode === 'walk') { this.setMode('orbit'); return; }
    const known = Object.values(KEYS).some((list) => list.includes(e.code)) || e.code.startsWith('Shift');
    if (!known) return;
    if (down) this.pressed.add(e.code); else this.pressed.delete(e.code);
    if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Page')) e.preventDefault();
  }

  isDown(action) { return KEYS[action].some((c) => this.pressed.has(c)); }

  setMode(mode) {
    if (mode === this.mode) return;
    const v = this.viewer;
    const cam = v.camera;
    v.anim = null;
    if (mode === 'walk') {
      // start exactly where the camera is: same position, direction and lens
      this.orbitDistance = cam.position.distanceTo(v.controls.target);
      cam.near = NAV.walkNear;
      v.controls.enabled = false;
    } else {
      cam.near = NAV.orbitNear;
      // pivot straight ahead so orbiting continues from where the walk ended
      cam.getWorldDirection(_fwd);
      v.controls.target.copy(cam.position).addScaledVector(_fwd, this.orbitDistance ?? NAV.exitDistance);
      v.controls.enabled = true;
      v.controls.update();
    }
    cam.updateProjectionMatrix();
    this.mode = mode;
    this.emit();
  }

  toggle() { this.setMode(this.mode === 'walk' ? 'orbit' : 'walk'); }

  /** Per-frame keyboard movement. */
  update(dt) {
    const cam = this.viewer.camera;
    const f = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    const s = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    const u = (this.isDown('up') ? 1 : 0) - (this.isDown('down') ? 1 : 0);
    if (!f && !s && !u) return;
    const fast = this.pressed.has('ShiftLeft') || this.pressed.has('ShiftRight') ? NAV.fastFactor : 1;
    const step = this.speed * fast * dt;

    cam.getWorldDirection(_fwd);
    if (this.mode === 'orbit') { _fwd.y = 0; _fwd.normalize(); } // glide horizontally around the model
    _right.crossVectors(_fwd, UP).normalize();
    _move.set(0, 0, 0).addScaledVector(_fwd, f).addScaledVector(_right, s).addScaledVector(UP, u);
    if (_move.lengthSq() === 0) return;
    _move.normalize().multiplyScalar(step);

    cam.position.add(_move);
    if (this.mode === 'orbit') {
      this.viewer.controls.target.add(_move);
      this.viewer.anim = null;
    }
    cam.position.y = Math.max(0.3, cam.position.y);
  }

  // ---------- walk mode: drag to look ----------
  onPointerDown(e) {
    if (this.mode !== 'walk') return;
    this.dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.target.setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e) {
    const d = this.dragging;
    if (this.mode !== 'walk' || !d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    const cam = this.viewer.camera;
    _euler.setFromQuaternion(cam.quaternion, 'YXZ');
    _euler.y -= dx * NAV.lookSpeed;
    _euler.x = THREE.MathUtils.clamp(_euler.x - dy * NAV.lookSpeed, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    _euler.z = 0;
    cam.quaternion.setFromEuler(_euler);
  }

  onPointerUp(e) {
    if (this.dragging && this.dragging.id === e.pointerId) this.dragging = null;
  }

  onWheel(e) {
    if (this.mode !== 'walk') return;
    e.preventDefault();
    const cam = this.viewer.camera;
    cam.getWorldDirection(_fwd);
    cam.position.addScaledVector(_fwd, -Math.sign(e.deltaY) * Math.min(3, this.speed * 0.15));
  }

  // ---------- orbit mode: double-click sets the pivot ----------
  onDoubleClick(e) {
    const v = this.viewer;
    const rect = v.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, v.camera);
    const hit = this.raycaster.intersectObjects(v.scene.children, true).find((h) => isShown(h.object));
    if (!hit) return;
    if (this.mode === 'walk') {
      // walk toward the clicked point, stopping short of it
      const to = hit.point.clone().sub(v.camera.position);
      const dist = to.length();
      v.camera.position.addScaledVector(to.normalize(), Math.max(0, dist - 2));
      return;
    }
    v.focusOn(hit.point);
  }
}

function isShown(obj) {
  for (let o = obj; o; o = o.parent) if (!o.visible) return false;
  if (obj.material?.transparent && obj.material.opacity < 0.2) return false;
  return true;
}
