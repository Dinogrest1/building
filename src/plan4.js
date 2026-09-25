/**
 * 4th-floor plan (KMBS), traced from the architectural drawing.
 *
 * Coordinates are in drawing pixels: the outer walls span x 410…1760 (building
 * length) and y 455…775 (depth). y grows toward the main facade (+Z). They are
 * mapped onto the parametric building box by `planToWorld`, so the plan follows
 * width/depth changes.
 *
 * Walls: [x1, y1, x2, y2, type, doors?] – axis-aligned.
 *   type: 'thick' | 'mid' | 'thin' | 'cubicle'; tag 'stair' marks stair-core walls.
 *   doors: [{ c, w, double?, open?, side? }] – c = position along the wall (px),
 *   w = clear width in mm as annotated on the drawing, open = opening without leaf,
 *   side = leaf swing side (+1 / -1 along the wall normal).
 */

export const PLAN_BOUNDS = { x0: 410, x1: 1760, y0: 455, y1: 775 };

/** Stair cores (plan px) – they coincide with the facade strips of small windows. */
export const PLAN_STAIRS = [
  { x0: 567, x1: 615, y0: 640, y1: 765, label: 'left' },
  { x0: 1449, x1: 1500, y0: 640, y1: 765, label: 'right' },
];

const D = (c, w, extra = {}) => ({ c, w, ...extra });
const DD = (c, w = 1200, extra = {}) => ({ c, w, double: true, ...extra });

export const PLAN_WALLS = [
  // ---------- west block: rooms, WC, common zone ----------
  [420, 575, 660, 575, 'mid', [D(490, 840), D(548, 840), D(592, 840), D(628, 840)]],
  [517, 465, 517, 575, 'thin'],
  [517, 528, 612, 528, 'thin', [D(592, 800, { side: -1 })]],
  [563, 465, 563, 528, 'thin'],
  [557, 528, 557, 575, 'thin', [D(549, 600)]],
  [580, 528, 580, 575, 'thin'],
  [517, 487, 545, 487, 'cubicle'],
  [517, 507, 545, 507, 'cubicle'],
  [585, 490, 612, 490, 'cubicle'],
  [585, 510, 612, 510, 'cubicle'],
  [612, 465, 612, 575, 'thin'],
  [660, 465, 660, 607, 'thick'],
  [660, 607, 748, 607, 'mid', [DD(694)]],
  [755, 465, 755, 590, 'thick'],
  [748, 590, 748, 640, 'mid', [DD(615, 1000)]],

  // ---------- corridor, north side ----------
  [748, 590, 1052, 590, 'mid', [DD(797), DD(1000)]],
  [1052, 465, 1052, 605, 'thick'],
  [1052, 605, 1400, 605, 'mid', [D(1075, 840), D(1203, 840), D(1285, 840), D(1320, 840), D(1360, 840)]],
  [1155, 465, 1155, 605, 'thin'],
  [1252, 465, 1252, 605, 'mid'],
  [1252, 515, 1302, 515, 'thin'],
  [1302, 465, 1302, 605, 'mid', [D(500, 800)]],
  [1352, 465, 1352, 605, 'thin'],
  [1402, 465, 1402, 575, 'mid'],

  // ---------- WC / technical / offices (north-east) ----------
  [1402, 567, 1550, 567, 'mid', [D(1433, 700), D(1466, 700), D(1535, 800)]],
  [1450, 465, 1450, 567, 'thin'],
  [1402, 497, 1420, 497, 'cubicle'],
  [1402, 517, 1420, 517, 'cubicle'],
  [1402, 537, 1420, 537, 'cubicle'],
  [1480, 497, 1500, 497, 'cubicle'],
  [1480, 517, 1500, 517, 'cubicle'],
  [1480, 537, 1500, 537, 'cubicle'],
  [1500, 465, 1500, 567, 'mid'],
  [1550, 465, 1550, 567, 'mid'],
  [1597, 465, 1597, 545, 'thin'],
  [1550, 545, 1655, 545, 'thin', [D(1612, 840)]],
  [1550, 567, 1655, 567, 'thin', [D(1580, 900)]],
  [1655, 465, 1655, 570, 'thick'],
  [1648, 570, 1648, 612, 'mid', [DD(591, 1200)]],
  [1648, 612, 1760, 612, 'thick'],
  [1655, 612, 1655, 720, 'thick'],
  [1655, 720, 1760, 720, 'thick'],

  // ---------- corridor, south side + rooms toward the main facade ----------
  [517, 640, 1552, 640, 'mid', [
    D(537, 840), DD(582, 900, { tag: 'stair' }), D(637, 840), DD(677), DD(903),
    D(992, 740), D(1015, 740), DD(1108), D(1150, 840), DD(1200),
    D(1285, 840), D(1320, 840), DD(1367), DD(1475, 1000, { tag: 'stair' }), D(1528, 600),
  ]],
  [420, 665, 515, 665, 'thin', [D(440, 840), D(492, 840)]],
  [462, 665, 462, 765, 'thin'],
  [515, 575, 515, 765, 'mid'],
  [567, 640, 567, 765, 'mid', null, 'stair'],
  [615, 640, 615, 765, 'mid', null, 'stair'],
  [660, 640, 660, 765, 'mid'],
  [757, 640, 757, 765, 'mid'],
  [953, 640, 953, 765, 'mid'],
  [1003, 640, 1003, 765, 'thin'],
  [1057, 640, 1057, 765, 'mid'],
  [1252, 640, 1252, 765, 'mid'],
  [1302, 655, 1302, 765, 'thin'],
  [1352, 640, 1352, 765, 'mid'],
  [1449, 640, 1449, 765, 'mid', null, 'stair'],
  [1500, 640, 1500, 765, 'mid', null, 'stair'],
  [1548, 660, 1548, 765, 'thin', [D(680, 600)]],
];

/** Room labels: [x, y, text, vertical?] – vertical where the drawing writes them sideways. */
export const PLAN_LABELS = [
  [850, 530, 'Аудиторія'], [845, 705, 'Аудиторія'], [1203, 540, 'Аудиторія'],
  [1150, 705, 'Аудиторія'], [1400, 705, 'Аудиторія'], [1705, 540, 'Аудиторія'],
  [1105, 540, 'Офіс', true], [1278, 555, 'Офіс', true], [1328, 540, 'Офіс', true],
  [1377, 535, 'Офіс', true], [1573, 505, 'Офіс', true], [1625, 505, 'Офіс', true],
  [978, 705, 'Офіс', true], [1030, 705, 'Офіс', true], [1277, 705, 'Офіс', true],
  [1327, 705, 'Офіс', true],
  [1426, 482, 'WC'], [1475, 482, 'WC'],
  [1525, 520, 'Тех. прим.', true], [1525, 710, 'Тех. прим.', true],
  [1510, 603, 'Рецепція'], [1602, 700, 'Зона кафе', true],
  [600, 608, 'Спільна зона\nKMBS + журналісти'],
  [591, 705, 'Сходи', true], [1474, 705, 'Сходи', true],
];

/** Maps drawing pixels to building-local metres (X along length, Z toward the main facade). */
export function planToWorld(px, py, W, D, t) {
  const B = PLAN_BOUNDS;
  let x = ((px - B.x0) / (B.x1 - B.x0)) * W - W / 2;
  let z = ((py - B.y0) / (B.y1 - B.y0)) * D - D / 2;
  // snap walls that meet the outer walls to the inner face of the facade skin
  if (px <= B.x0 + 12) x = -W / 2 + t;
  if (px >= B.x1 - 12) x = W / 2 - t;
  if (py <= B.y0 + 12) z = -D / 2 + t;
  if (py >= B.y1 - 12) z = D / 2 - t;
  return [x, z];
}

export function planScale(W, D) {
  const B = PLAN_BOUNDS;
  return { sx: W / (B.x1 - B.x0), sz: D / (B.y1 - B.y0) };
}
