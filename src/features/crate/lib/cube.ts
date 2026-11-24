import type {
  CubeFace,
  CubeSkin,
  CubeState,
  Dir,
  FaceKey,
  FoldedCube,
  NetCell,
  NetPos,
  Orientation,
  PatternId,
  Receipt,
} from "@/shared/types";

export const FACE_KEYS: FaceKey[] = ["up", "down", "north", "south", "east", "west"];

export const FACE_VEC: Record<FaceKey, readonly [number, number, number]> = {
  up: [0, 0, 1],
  down: [0, 0, -1],
  north: [0, 1, 0],
  south: [0, -1, 0],
  east: [1, 0, 0],
  west: [-1, 0, 0],
};

export const FACE_OPPOSITE: Record<FaceKey, FaceKey> = {
  up: "down",
  down: "up",
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

const FACE_BY_VEC = new Map<string, FaceKey>(
  FACE_KEYS.map((face) => [vecKey(FACE_VEC[face]), face]),
);

export const DIR_FACE: Record<Dir, FaceKey> = { n: "north", e: "east", s: "south", w: "west" };
export const FACE_DIR: Record<FaceKey, Dir | null> = {
  up: null,
  down: null,
  north: "n",
  south: "s",
  east: "e",
  west: "w",
};

export const PATTERN_LABEL: Record<PatternId, string> = {
  blank: "素面",
  ring: "回心",
  wave: "水波",
  leaf: "叶脉",
  star: "星芒",
  spiral: "螺纹",
  moon: "月牙",
};

export const FACE_LABEL: Record<FaceKey, string> = {
  up: "顶",
  down: "底",
  north: "北",
  south: "南",
  east: "东",
  west: "西",
};

export const DIR_LABEL: Record<Dir, string> = { n: "北", e: "东", s: "南", w: "西" };

function vecKey(vector: readonly number[]): string {
  return vector.join(",");
}

type Vec3 = [number, number, number];

function negate(vector: readonly number[]): Vec3 {
  return [-vector[0], -vector[1], -vector[2]];
}

function faceOf(vector: readonly number[]): FaceKey | null {
  return FACE_BY_VEC.get(vecKey(vector)) ?? null;
}

function netKey(pos: NetPos): string {
  return `${pos.x},${pos.y}`;
}

interface Frame {
  cell: NetCell;
  normal: Vec3;
  right: Vec3;
  down: Vec3;
}

export function cellAt(skin: CubeSkin, x: number, y: number): NetCell | undefined {
  return skin.cells.find((cell) => cell.x === x && cell.y === y);
}

export function netBounds(skin: CubeSkin): { width: number; height: number; minX: number; minY: number } {
  const xs = skin.cells.map((cell) => cell.x);
  const ys = skin.cells.map((cell) => cell.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    width: Math.max(...xs) - minX + 1,
    height: Math.max(...ys) - minY + 1,
    minX,
    minY,
  };
}

/**
 * Fold a flat six-cell skin into a cube. Each cell becomes one face; the
 * returned `north`/`east` fields record how the artwork is oriented on that
 * face. Mirror-image skins therefore never fold into the same cube.
 */
export function foldSkin(skin: CubeSkin): FoldedCube {
  if (skin.cells.length !== 6) throw new Error("箱皮必须正好六格");
  const byPos = new Map(skin.cells.map((cell) => [netKey(cell), cell]));
  if (byPos.size !== 6) throw new Error("箱皮有重叠格");
  const rootAt = skin.root ?? { x: skin.cells[0].x, y: skin.cells[0].y };
  const rootCell = byPos.get(netKey(rootAt));
  if (!rootCell) throw new Error("折起点不在箱皮上");
  const frames = new Map<string, Frame>();
  const root: Frame = { cell: rootCell, normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] };
  frames.set(netKey(rootCell), root);
  const queue: Frame[] = [root];
  const steps: { dx: number; dy: number; kind: Dir }[] = [
    { dx: 1, dy: 0, kind: "e" },
    { dx: -1, dy: 0, kind: "w" },
    { dx: 0, dy: 1, kind: "s" },
    { dx: 0, dy: -1, kind: "n" },
  ];
  while (queue.length > 0) {
    const current = queue.shift() as Frame;
    for (const step of steps) {
      const cell = byPos.get(netKey({ x: current.cell.x + step.dx, y: current.cell.y + step.dy }));
      if (!cell) continue;
      const key = netKey(cell);
      let frame: Frame;
      if (step.kind === "e") {
        frame = { cell, normal: current.right, right: negate(current.normal), down: current.down };
      } else if (step.kind === "w") {
        frame = { cell, normal: negate(current.right), right: current.normal, down: current.down };
      } else if (step.kind === "s") {
        frame = { cell, normal: current.down, right: current.right, down: negate(current.normal) };
      } else {
        frame = { cell, normal: negate(current.down), right: current.right, down: current.normal };
      }
      const existing = frames.get(key);
      if (existing) {
        if (vecKey(existing.normal) !== vecKey(frame.normal)) throw new Error("箱皮折起后重叠");
        continue;
      }
      frames.set(key, frame);
      queue.push(frame);
    }
  }
  if (frames.size !== 6) throw new Error("箱皮不连通");
  const faces = {} as Record<FaceKey, CubeFace>;
  for (const frame of frames.values()) {
    const normal = faceOf(frame.normal);
    const north = faceOf(negate(frame.down));
    const east = faceOf(frame.right);
    if (!normal || !north || !east) throw new Error("箱皮折起失败");
    faces[normal] = { pattern: frame.cell.pattern, north, east };
  }
  if (FACE_KEYS.some((face) => !faces[face])) throw new Error("箱皮未盖满六面");
  let seal: FoldedCube["seal"] = null;
  if (skin.seal) {
    const cell = cellAt(skin, skin.seal.x, skin.seal.y);
    if (!cell) throw new Error("封条不在箱皮上");
    const frame = [...frames.values()].find((item) => item.cell === cell);
    if (!frame) throw new Error("封条无法折起");
    const a = faceOf(frame.normal);
    const edgeVec =
      skin.seal.dir === "n"
        ? negate(frame.down)
        : skin.seal.dir === "s"
          ? frame.down
          : skin.seal.dir === "e"
            ? frame.right
            : negate(frame.right);
    const b = faceOf(edgeVec);
    if (!a || !b) throw new Error("封条方向无效");
    seal = { a, b };
  }
  return { faces, seal };
}

export function mirrorSkin(skin: CubeSkin): CubeSkin {
  const maxX = Math.max(...skin.cells.map((cell) => cell.x));
  return {
    ...skin,
    id: `${skin.id}-镜像`,
    name: `${skin.name}（镜像）`,
    cells: skin.cells.map((cell) => ({ ...cell, x: maxX - cell.x })),
    root: skin.root ? { x: maxX - skin.root.x, y: skin.root.y } : undefined,
    seal: skin.seal
      ? {
          x: maxX - skin.seal.x,
          y: skin.seal.y,
          dir: skin.seal.dir === "e" ? "w" : skin.seal.dir === "w" ? "e" : skin.seal.dir,
        }
      : undefined,
  };
}

export interface Rotation {
  a: Vec3;
  b: Vec3;
  c: Vec3;
}

function cross(a: readonly number[], b: readonly number[]): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function rotations(): Rotation[] {
  const axes = FACE_KEYS.map((face) => FACE_VEC[face]);
  const list: Rotation[] = [];
  for (const a of axes) {
    for (const b of axes) {
      if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] !== 0) continue;
      list.push({ a: [...a] as Vec3, b: [...b] as Vec3, c: cross(a, b) });
    }
  }
  return list;
}

const ROTATIONS = rotations();

function rotateVec(rotation: Rotation, v: readonly number[]): FaceKey {
  const x = rotation.a[0] * v[0] + rotation.b[0] * v[1] + rotation.c[0] * v[2];
  const y = rotation.a[1] * v[0] + rotation.b[1] * v[1] + rotation.c[1] * v[2];
  const z = rotation.a[2] * v[0] + rotation.b[2] * v[1] + rotation.c[2] * v[2];
  const result = faceOf([x, y, z]);
  if (!result) throw new Error("旋转结果不是面");
  return result;
}

function rotateFace(rotation: Rotation, face: FaceKey): FaceKey {
  return rotateVec(rotation, FACE_VEC[face]);
}

function faceToken(rotation: Rotation, face: CubeFace, normal: FaceKey): string {
  return `${face.pattern}@${normal}>${rotateFace(rotation, face.north)},${rotateFace(rotation, face.east)}`;
}

/** Rotation-invariant fingerprint of the printed skin (no stamp). */
export function skinSignature(skin: CubeSkin): string {
  let best: string | null = null;
  const cube = foldSkin(skin);
  for (const rotation of ROTATIONS) {
    const tokens = FACE_KEYS.map((face) =>
      faceToken(rotation, cube.faces[face], rotateFace(rotation, face)),
    ).sort();
    let seal = "seal:none";
    if (cube.seal) {
      const a = rotateFace(rotation, cube.seal.a);
      const b = rotateFace(rotation, cube.seal.b);
      const answer = a === "up" ? b : b === "up" ? a : null;
      seal = answer ? `seal:up>${answer}` : `seal:${[a, b].sort().join("-")}`;
    }
    const signature = `${tokens.join("|")}#${seal}`;
    if (best === null || signature < best) best = signature;
  }
  if (best === null) throw new Error("无法生成箱皮签名");
  return best;
}

export function hashSignature(signature: string): string {
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function packageHash(skin: CubeSkin): string {
  return hashSignature(skinSignature(skin));
}

export const ROLL_MAP: Record<Dir, Record<FaceKey, FaceKey>> = {
  n: { up: "north", north: "down", down: "south", south: "up", east: "east", west: "west" },
  s: { up: "south", south: "down", down: "north", north: "up", east: "east", west: "west" },
  e: { up: "east", east: "down", down: "west", west: "up", north: "north", south: "south" },
  w: { up: "west", west: "down", down: "east", east: "up", north: "north", south: "south" },
};

export function initialOrientation(): Orientation {
  return { up: "up", down: "down", north: "north", south: "south", east: "east", west: "west" };
}

/** Orientation maps body face -> world face. */
export function rollOrientation(orientation: Orientation, dir: Dir): Orientation {
  const map = ROLL_MAP[dir];
  const next = {} as Orientation;
  for (const face of FACE_KEYS) next[face] = map[orientation[face]];
  return next;
}

export function bodyAtWorld(orientation: Orientation): Record<FaceKey, FaceKey> {
  const result = {} as Record<FaceKey, FaceKey>;
  for (const face of FACE_KEYS) result[orientation[face]] = face;
  return result;
}


export function topPattern(cube: FoldedCube, orientation: Orientation): PatternId {
  return cube.faces[bodyAtWorld(orientation).up].pattern;
}

export function sealWorldEdge(cube: FoldedCube, orientation: Orientation): FaceKey[] {
  if (!cube.seal) return [];
  return [orientation[cube.seal.a], orientation[cube.seal.b]];
}

/** The direction from the top face toward the sealed side face, if the seal touches the top. */
export function sealTopDir(cube: FoldedCube, orientation: Orientation): Dir | null {
  if (!cube.seal) return null;
  const world = sealWorldEdge(cube, orientation);
  for (const face of world) {
    if (face === "up") {
      const other = world[0] === "up" ? world[1] : world[0];
      return FACE_DIR[other];
    }
  }
  return null;
}



export type ReceiptVerdict =
  | "ok"
  | "wrong-package"
  | "wrong-stamp"
  | "wrong-top"
  | "wrong-seal"
  | "not-on-goal"
  | "no-seal";

export function receiptVerdict(
  state: CubeState,
  receipt: Receipt,
  folded: FoldedCube = foldSkin(state.skin),
): ReceiptVerdict {
  const packOk = !receipt.packageId || packageHash(state.skin) === receipt.packageId;
  if (!packOk) return "wrong-package";
  if (receipt.stamp != null && receipt.stamp !== "" && receipt.stamp !== state.stamp) {
    return "wrong-stamp";
  }
  if (topPattern(folded, state.orientation) !== receipt.top) return "wrong-top";
  if (!folded.seal) return "no-seal";
  const dir = sealTopDir(folded, state.orientation);
  if (dir !== receipt.sealDir) return "wrong-seal";
  return "ok";
}


export interface SealHint {
  current: Dir | null;
  target: Dir;
  quarterTurns: number | null;
  /** The board edge the crate must be rolled over to bring the seal around. */
  edge: FaceKey;
}

/**
 * When the only mismatch is the seal direction, describe which edge has to be
 * turned toward the receiver. The crate cannot spin in place, so the edge is
 * the side the seal must arrive on.
 */
export function sealHint(
  state: CubeState,
  receipt: Receipt,
  folded: FoldedCube = foldSkin(state.skin),
): SealHint {
  return {
    current: sealTopDir(folded, state.orientation),
    target: receipt.sealDir,
    quarterTurns: null,
    edge: DIR_FACE[receipt.sealDir],
  };
}

const ALL_ORIENTATIONS: Orientation[] = (() => {
  const start = initialOrientation();
  const seen = new Map<string, Orientation>();
  const key = (orientation: Orientation) => FACE_KEYS.map((face) => orientation[face]).join(",");
  seen.set(key(start), start);
  const queue: Orientation[] = [start];
  const dirs: Dir[] = ["n", "e", "s", "w"];
  while (queue.length > 0) {
    const current = queue.shift() as Orientation;
    for (const dir of dirs) {
      const next = rollOrientation(current, dir);
      const nextKey = key(next);
      if (seen.has(nextKey)) continue;
      seen.set(nextKey, next);
      queue.push(next);
    }
  }
  return [...seen.values()];
})();

export function allOrientations(): Orientation[] {
  return ALL_ORIENTATIONS;
}

export function sameOrientation(a: Orientation, b: Orientation): boolean {
  return FACE_KEYS.every((face) => a[face] === b[face]);
}


export interface CornerView {
  front: FaceKey;
  right: FaceKey;
}

/** The three mutually adjacent faces visible when looking from `from`. */
export function cornerFrom(dir: Dir): CornerView {
  const front = DIR_FACE[dir];
  const right: Record<FaceKey, FaceKey> = {
    south: "east",
    east: "north",
    north: "west",
    west: "south",
    up: "east",
    down: "east",
  };
  return { front, right: right[front] };
}

export function orbitCorner(view: CornerView, turn: "left" | "right"): CornerView {
  const dir = FACE_DIR[view.front] ?? "s";
  const order: Dir[] = ["s", "e", "n", "w"];
  const step = turn === "right" ? 1 : -1;
  const next = order[(order.indexOf(dir) + step + 4) % 4];
  return cornerFrom(next);
}


export function visibleWorldFaces(view: CornerView): FaceKey[] {
  return ["up", view.front, view.right];
}


export interface FaceView {
  world: FaceKey;
  face: CubeFace;
  slot: "top" | "front" | "right";
}

export interface CubeView {
  view: CornerView;
  faces: FaceView[];
  hidden: FaceKey[];
  sealVisible: boolean;
  sealBetween: [FaceKey, FaceKey] | null;
  stampVisibleWorld: FaceKey | null;
  stampValue: string;
}

export function cubeView(
  folded: FoldedCube,
  orientation: Orientation,
  view: CornerView,
  stamp: string,
  stampFace: FaceKey,
): CubeView {
  const world = bodyAtWorld(orientation);
  const visible = visibleWorldFaces(view);
  const faces: FaceView[] = [];
  const slots: ("top" | "front" | "right")[] = ["top", "front", "right"];
  const worldFaces: FaceKey[] = ["up", view.front, view.right];
  for (let index = 0; index < 3; index += 1) {
    const worldFace = worldFaces[index];
    const bodyFace = world[worldFace];
    const content = folded.faces[bodyFace];
    faces.push({ world: worldFace, face: content, slot: slots[index] });
  }
  const hidden = FACE_KEYS.filter((face) => !visible.includes(face));
  const sealWorld = folded.seal
    ? ([orientation[folded.seal.a], orientation[folded.seal.b]] as [FaceKey, FaceKey])
    : null;
  const sealVisible = sealWorld
    ? sealWorld.every((face) => visible.includes(face)) &&
      sealWorld.includes("up") &&
      sealWorld.some((face) => face !== "up")
    : false;
  const stampWorld = orientation[stampFace];
  return {
    view,
    faces,
    hidden,
    sealVisible,
    sealBetween: sealVisible ? sealWorld : null,
    stampVisibleWorld: visible.includes(stampWorld) ? stampWorld : null,
    stampValue: stamp,
  };
}


