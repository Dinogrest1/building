import { PLAN_WALLS, PLAN_ROOMS, PLAN_STAIR_TARGETS, PLAN_BOUNDS } from './plan4.js';

/**
 * Evacuation routes on the traced plan: every room → nearest stair.
 *
 * The plan is rasterised (drawing pixels → grid cells), walls become obstacles,
 * doorways stay open, and a multi-source Dijkstra from both stair cores gives
 * each cell its distance to the nearest stair. A room's route follows the
 * parent pointers from its centre and is then shortened by line-of-sight
 * ("string pulling"). All in drawing pixels; the caller maps to metres.
 */

const CELL = 3;             // drawing px per grid cell
const WALL_PX = { thick: 8, mid: 6, thin: 3, cubicle: 2 };
const CLEARANCE = 4;        // keep routes this many px away from walls (not through door jambs)

function buildGrid() {
  const B = PLAN_BOUNDS;
  const cols = Math.ceil((B.x1 - B.x0) / CELL);
  const rows = Math.ceil((B.y1 - B.y0) / CELL);
  const blocked = new Uint8Array(cols * rows);
  const soft = new Uint8Array(cols * rows); // wall + clearance (routes avoid it, doors cut through)
  const cx = (px) => Math.floor((px - B.x0) / CELL);
  const cy = (py) => Math.floor((py - B.y0) / CELL);
  const fill = (arr, x0, y0, x1, y1, v = 1) => {
    for (let y = Math.max(0, cy(y0)); y <= Math.min(rows - 1, cy(y1)); y++) {
      for (let x = Math.max(0, cx(x0)); x <= Math.min(cols - 1, cx(x1)); x++) arr[y * cols + x] = v;
    }
  };

  // outer walls
  const o = 10;
  for (const arr of [blocked, soft]) {
    fill(arr, B.x0, B.y0, B.x1, B.y0 + o);
    fill(arr, B.x0, B.y1 - o, B.x1, B.y1);
    fill(arr, B.x0, B.y0, B.x0 + o, B.y1);
    fill(arr, B.x1 - o, B.y0, B.x1, B.y1);
  }

  for (const [ax, ay, bx, by, type, doors] of PLAN_WALLS) {
    const h = ay === by;
    const t = WALL_PX[type] / 2;
    const segs = [[Math.min(h ? ax : ay, h ? bx : by), Math.max(h ? ax : ay, h ? bx : by)]];
    // doorway gaps
    const gaps = (doors || []).map((d) => {
      const half = (d.w / 1000) * (h ? 27 : 24.6) / 2; // mm → drawing px (≈ plan scale)
      return [d.c - half, d.c + half];
    });
    const pieces = segs.flatMap(([s0, s1]) => {
      let out = [[s0, s1]];
      for (const [g0, g1] of gaps) {
        out = out.flatMap(([a, b]) => (g1 <= a || g0 >= b ? [[a, b]] : [[a, g0], [g1, b]].filter(([p, q]) => q - p > 0.5)));
      }
      return out;
    });
    for (const [a, b] of pieces) {
      if (h) {
        fill(blocked, a - t, ay - t, b + t, ay + t);
        fill(soft, a - t - CLEARANCE, ay - t - CLEARANCE, b + t + CLEARANCE, ay + t + CLEARANCE);
      } else {
        fill(blocked, ax - t, a - t, ax + t, b + t);
        fill(soft, ax - t - CLEARANCE, a - t - CLEARANCE, ax + t + CLEARANCE, b + t + CLEARANCE);
      }
    }
  }
  return { cols, rows, blocked, soft, cx, cy, toPx: (x, y) => [B.x0 + (x + 0.5) * CELL, B.y0 + (y + 0.5) * CELL] };
}

/** Minimal binary heap keyed by distance. */
class Heap {
  constructor() { this.a = []; }
  push(k, v) {
    const a = this.a; a.push([k, v]);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1; const r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

let cache = null;

/** Computes (once) the route of every room to its nearest stair. */
export function computeRoutes() {
  if (cache) return cache;
  const g = buildGrid();
  const { cols, rows, blocked, soft } = g;
  const N = cols * rows;
  const dist = new Float64Array(N).fill(Infinity);
  const parent = new Int32Array(N).fill(-1);
  const source = new Int8Array(N).fill(-1);
  // walking next to walls costs more, so routes keep to the middle of corridors
  const cost = (i) => (soft[i] ? 3 : 1);
  const heap = new Heap();
  PLAN_STAIR_TARGETS.forEach((t, s) => {
    const i = g.cy(t.y) * cols + g.cx(t.x);
    dist[i] = 0; source[i] = s; heap.push(0, i);
  });
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (heap.size) {
    const [d, i] = heap.pop();
    if (d > dist[i]) continue;
    const x = i % cols; const y = (i / cols) | 0;
    for (const [dx, dy, w] of nb) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = ny * cols + nx;
      if (blocked[j]) continue;
      if (dx && dy && (blocked[y * cols + nx] || blocked[ny * cols + x])) continue; // no corner cutting
      const nd = d + w * cost(j);
      if (nd < dist[j]) { dist[j] = nd; parent[j] = i; source[j] = source[i]; heap.push(nd, j); }
    }
  }

  /**
   * Line of sight for string pulling: every cell on the segment must be free,
   * and cells close to walls are allowed only near the original path (doorways).
   */
  const clear = (x0, y0, x1, y1, near) => {
    const dx = Math.abs(x1 - x0); const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy; let x = x0; let y = y0;
    for (;;) {
      const i = y * cols + x;
      if (blocked[i] || (soft[i] && !near.has(i))) return false;
      if (x === x1 && y === y1) return true;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };

  const rooms = PLAN_ROOMS.map(([name, x0, y0, x1, y1, opt = {}], index) => {
    // start from the room centre, nudged to the nearest reachable cell
    const [lx, ly] = [(x0 + x1) / 2, (y0 + y1) / 2];
    let start = -1;
    let best = Infinity;
    for (let y = g.cy(y0 + 6); y <= g.cy(y1 - 6); y++) {
      for (let x = g.cx(x0 + 6); x <= g.cx(x1 - 6); x++) {
        const i = y * cols + x;
        if (!Number.isFinite(dist[i]) || soft[i]) continue;
        const [px, py] = g.toPx(x, y);
        const dd = (px - lx) ** 2 + (py - ly) ** 2;
        if (dd < best) { best = dd; start = i; }
      }
    }
    if (start < 0) return { index, name, stair: -1, path: null };
    const cells = [];
    for (let i = start; i >= 0; i = parent[i]) cells.push(i);
    // string pulling
    const near = new Set();
    for (const c of cells) {
      const x = c % cols; const y = (c / cols) | 0;
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) near.add((y + oy) * cols + x + ox);
    }
    const pts = [cells[0]];
    let anchor = 0;
    for (let k = 2; k < cells.length; k++) {
      const a = cells[anchor]; const b = cells[k];
      if (!clear(a % cols, (a / cols) | 0, b % cols, (b / cols) | 0, near)) {
        pts.push(cells[k - 1]);
        anchor = k - 1;
      }
    }
    pts.push(cells[cells.length - 1]);
    const full = pts.map((i) => g.toPx(i % cols, (i / cols) | 0));
    const path = fromDoorway(full, x0, y0, x1, y1);
    return { index, name, stair: source[start], path, opt };
  });

  cache = { rooms };
  return cache;
}

/**
 * Starts the route where it leaves the room – i.e. in its doorway – instead of
 * the room centre. Routes that never leave the room (stairs open onto it) stay whole.
 */
function fromDoorway(path, x0, y0, x1, y1) {
  const inside = ([x, y]) => x > x0 && x < x1 && y > y0 && y < y1;
  for (let k = 0; k < path.length - 1; k++) {
    const a = path[k];
    const b = path[k + 1];
    if (!inside(a) || inside(b)) continue;
    // first crossing of the room boundary on a → b
    let t = 1;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    if (dx > 0) t = Math.min(t, (x1 - a[0]) / dx);
    if (dx < 0) t = Math.min(t, (x0 - a[0]) / dx);
    if (dy > 0) t = Math.min(t, (y1 - a[1]) / dy);
    if (dy < 0) t = Math.min(t, (y0 - a[1]) / dy);
    const door = [a[0] + dx * t, a[1] + dy * t];
    return [door, ...path.slice(k + 1)];
  }
  return path;
}
