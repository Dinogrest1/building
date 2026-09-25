/**
 * Central configuration for the building.
 *
 * Coordinate system (metres):
 *   X = building length (left → right when looking at the main facade)
 *   Y = height, ground level at Y = 0
 *   Z = depth, main facade faces +Z
 *
 * DEFAULT_PARAMS are user-tweakable (exposed in the GUI, trigger a rebuild).
 * The other constants describe fixed architectural details.
 */

export const DEFAULT_PARAMS = {
  buildingWidth: 50,        // X extent
  buildingDepth: 13,        // Z extent
  floorCount: 4,
  floorHeight: 3.2,
  groundFloorLevel: 0.6,    // raised ground floor (reached by the entrance stair)
  parapetHeight: 0.6,       // "roof height": parapet rise above the roof membrane
  wallThickness: 0.3,       // outer facade skin / parapet thickness

  windowPaneWidth: 0.78,    // width of one vertical glass section
  windowHeight: 2.0,
  sillHeight: 0.66,         // window sill above floor level
  centralModules: 15,       // number of window groups in the long central zone
  squaresPerFloor: 2,       // small stair-core windows per floor

  hvacDensity: 0.55,        // probability that a window gets an external AC unit
  seed: 11,                 // random seed for semi-irregular distribution

  colors: {
    facade: '#c9c8c5',
    sideFacade: '#bdbcb9',
    plinth: '#8f8d89',
    fin: '#8e9093',
    glass: '#7aa9c6',
    frame: '#2b2e31',
    roof: '#68696b',
    hvac: '#1c1e20',
    metal: '#3a3d40',
  },
};

/** Vertical architectural fins / pilasters beside window groups. */
export const FIN = {
  width: 0.3,
  depth: 0.26,
  overhang: 0.22,     // extension above and below the opening
  gap: 0.03,          // clearance between fin and window opening
};

/** Window construction details. */
export const WINDOW = {
  recess: 0.14,       // depth of frame plane behind the wall face
  frameWidth: 0.06,
  frameDepth: 0.08,
  mullionWidth: 0.05,
  transomRatio: 0.72, // height fraction of the transom bar
  glassThickness: 0.02,
  sillDepth: 0.22,
  sillProjection: 0.06,
  squareSize: 0.55,   // small stair-core windows
};

/** External AC units. */
export const HVAC = {
  width: 0.8,
  height: 0.55,
  depth: 0.32,
  standoff: 0.03,     // gap to the wall (sits on brackets)
  fanRadius: 0.19,
  belowSill: 0.16,    // gap between sill and top of unit
};

/** Plinth / foundation strip. */
export const PLINTH = {
  projection: 0.05,
};

/** Parapet coping. */
export const COPING = {
  overhang: 0.05,
  height: 0.08,
};

/**
 * Main facade zones (left → right).
 * The two strips of small square windows are the stair cores; their centres
 * come from the 4th-floor plan (fractions of the building length), the wings
 * and the central zone fill the space around them.
 */
export const FRONT_ZONES = {
  cornerPier: 0.5,
  stairCores: [0.134, 0.7885], // plan: left "сходи" and right stair, as fraction of length
  stairStrip: 1.85,            // stair core width (plan ≈ 1.8–1.9 m)
  leftWing: { panes: [2, 1, 2] },
  rightWing: { panes: [2, 2, 1, 2] },
  // pane pattern of the long central zone; cycles, creating an irregular rhythm
  centralPattern: [2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 3],
};

/** Side facades (X = ±width/2). */
export const SIDE_ZONES = {
  panes: [3, 2],
};

/** Entrance & stair. */
export const ENTRANCE = {
  doorWidth: 1.9,
  doorHeight: 2.7,
  doorRecess: 0.24,
  canopyDepth: 1.35,
  canopyThickness: 0.16,
  canopyOverhang: 0.6,
  landingDepth: 1.7,
  landingExtraLeft: 0.9,
  stairWidth: 1.5,
  riserMax: 0.175,
  tread: 0.3,
  railHeight: 0.9,
  postSpacing: 1.0,
};

/** Small utility / secondary doors at grade. */
export const SMALL_DOOR = {
  width: 1.1,
  height: 2.3,
  canopyWidth: 1.7,
  canopyDepth: 0.9,
};

/** Service area (roller shutters + ventilation grilles). */
export const SERVICE = {
  shutterWidth: 1.5,
  sideShutterWidth: 1.8,
  shutterHeight: 2.7,
  ribSpacing: 0.12,
  grilleWidth: 1.1,
  grilleHeight: 0.55,
  grilleGap: 0.5,         // between shutter top and grille bottom
  canopyDepth: 0.65,
  enclosure: { width: 3.4, height: 1.9, depth: 1.3 },
};

/** Basement entrance next to the main porch: stair pit along the facade under a lean-to canopy. */
export const BASEMENT = {
  depth: 2.4,          // basement floor below grade
  width: 1.3,          // pit width (out from the facade)
  landing: 1.3,        // bottom landing in front of the basement door
  riserMax: 0.17,
  tread: 0.28,
  wall: 0.2,           // retaining walls
  curb: 0.15,          // retaining wall top above grade
  gapToPorch: 0.5,     // clearance between porch stair and pit
  doorWidth: 1.0,
  doorHeight: 2.1,
  canopyHigh: 2.55,    // canopy height at the wall (above grade)
  canopyLow: 2.15,     // at the outer edge
  canopyOverhang: 0.3,
  ribSpacing: 0.2,
  canopyColor: '#4d6b86',
  ribColor: '#1c252d',
};

/** Route arrows painted on the ground in front of the building. */
export const ARROWS = {
  width: 0.3,
  headLength: 0.8,
  headWidth: 0.8,
  offset: 4.0,          // distance of the route from the facade
  color: '#d9342b',
};

/** Floor slabs. */
export const SLAB = {
  thickness: 0.25,
};

/** Two-flight (U-shaped) stairs inside the stair cores. */
export const STAIRS = {
  riserTarget: 0.165,
  tread: 0.28,
  midLanding: 1.2,      // intermediate landing depth at the facade (half-floor windows)
  gap: 0.14,            // well between the two flights
  wallInset: 0.12,      // core wall thickness
  waist: 0.16,          // structural slab under the steps
  railHeight: 0.9,
  postEvery: 3,         // a post every N steps
  postRadius: 0.021,
  handrailRadius: 0.025,
  stringRadius: 0.009,  // horizontal rails (тетива)
  strings: [0.25, 0.45, 0.65],
};

/** Interior of the planned floor. */
export const INTERIOR = {
  planFloor: 4,          // storey number the plan belongs to (1-based)
  wallThick: 0.3,
  wallMid: 0.2,
  wallThin: 0.12,
  cubicleHeight: 2.0,
  doorHeight: 2.1,
  doorLeaf: 0.04,
  frame: 0.06,
  accessibleWidth: 900,  // mm – inclusivity norm used to flag narrow doors
  labelHeight: 0.42,
};

/** Camera presets: [position, target]. */
// Long lens → near-axonometric presentation like the reference drawing.
export const CAMERA_FOV = 10;
export const CAMERA_PRESETS = {
  'Front Right': [[74, 118, 165], [1, 4, 0]],
  Front: [[0, 40, 265], [0, 6, 0]],
  'Front Left': [[-131, 103, 176], [0, 5, 0]],
  'Top Isometric': [[150, 190, 150], [0, 4, 0]],
  'Right Side': [[125, 30, 48], [14, 6, 0]],
  Roof: [[0, 280, 45], [0, 12, 0]],
  // cutaway into the top floor (roof + front facade hidden)
  Interior: [[22, 165, 118], [0, 8, 0]],
  // section through both stair shafts (front part of the building cut away)
  Section: [[55, 60, 205], [0, 7, 0]],
};
export const DEFAULT_PRESET = 'Front Right';
