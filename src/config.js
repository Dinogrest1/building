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
  centralModules: 17,       // number of window groups in the long central zone
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

/** Main facade zones (left → right). Widths in metres; the central zone takes the rest. */
export const FRONT_ZONES = {
  cornerPier: 0.5,
  leftWing: { width: 5.8, panes: [2, 1, 2] },
  stairStrip: 1.6,
  rightWing: { width: 5.8, panes: [2, 2, 1] },
  // pane pattern of the long central zone; cycles, creating an irregular rhythm
  centralPattern: [2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 3],
  minCentral: 6,
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
};
export const DEFAULT_PRESET = 'Front Right';
