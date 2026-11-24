export type Dir = "n" | "e" | "s" | "w";
export type TileKind = "wall" | "floor" | "goal" | "gap";
export type BoxKind = "timber" | "iron" | "glass";
export type FloorMorph = "bridge" | "seal";
export type AttemptStatus = "playing" | "cleared";
export type LevelMode = "slide" | "roll";
export type PatternId = "blank" | "ring" | "wave" | "leaf" | "star" | "spiral" | "moon";
export type FaceKey = "up" | "down" | "north" | "south" | "east" | "west";
export type Orientation = Record<FaceKey, FaceKey>;

export interface NetPos {
  x: number;
  y: number;
}

export interface NetCell extends NetPos {
  pattern: PatternId;
}

export interface CubeSkin {
  id: string;
  name: string;
  cells: NetCell[];
  root?: NetPos;
  seal?: NetPos & { dir: Dir };
}

export interface CubeState {
  skin: CubeSkin;
  orientation: Orientation;
  stamp: string;
  stampFace: FaceKey;
  packageId: string;
  mirrored: boolean;
}

export interface CubeFace {
  pattern: PatternId;
  north: FaceKey;
  east: FaceKey;
}

export interface FoldedCube {
  faces: Record<FaceKey, CubeFace>;
  seal: { a: FaceKey; b: FaceKey } | null;
}

export interface Receipt {
  id: string;
  label: string;
  packageId: string;
  top: PatternId;
  sealDir: Dir;
  stamp?: string | null;
}

export interface Vec {
  x: number;
  y: number;
}

export interface Box {
  id: string;
  kind: BoxKind;
  x: number;
  y: number;
  cube?: CubeState;
}

export interface Plate {
  id: string;
  x: number;
  y: number;
  accept: BoxKind;
  doorIds: string[];
  floorIds: string[];
  powered: boolean;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  open: boolean;
}

export interface FloorPatch {
  id: string;
  x: number;
  y: number;
  morph: FloorMorph;
  active: boolean;
}

export interface RuntimeLevel {
  id: string;
  title: string;
  blurb: string;
  mode: LevelMode;
  width: number;
  height: number;
  tiles: TileKind[][];
  player: Vec;
  boxes: Box[];
  plates: Plate[];
  doors: Door[];
  floors: FloorPatch[];
  receipts: Receipt[];
}

export interface Attempt {
  steps: number;
  status: AttemptStatus;
}

export interface LevelRecord {
  bestSteps: number;
  clearedAt: number;
}

export interface GameDocument {
  version: 1;
  currentLevelId: string;
  level: RuntimeLevel;
  attempt: Attempt;
  records: Record<string, LevelRecord>;
}

export interface MoveResult {
  moved: boolean;
  pushed: boolean;
  rolled?: boolean;
  boxId?: string;
  reason?: "blocked" | "cleared" | "idle";
}

export const BOX_LABEL: Record<BoxKind, string> = {
  timber: "木箱",
  iron: "铁箱",
  glass: "玻璃箱",
};

export const DIR_VEC: Record<Dir, Vec> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};
