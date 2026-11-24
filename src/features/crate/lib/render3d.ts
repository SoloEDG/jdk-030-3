import type { CubeFace, Dir, FaceKey, FoldedCube, CubeSkin, Orientation } from "@/shared/types";
import { FACE_VEC, type CornerView } from "./cube";
import { paintPattern, type PatternPalette, DEFAULT_PALETTE } from "./pattern";

export type Vec3 = [number, number, number];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};
const faceVec = (face: FaceKey): Vec3 => [...FACE_VEC[face]] as Vec3;

function rotateAround(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const d = dot(v, axis);
  return [
    v[0] * c + (y * v[2] - z * v[1]) * s + x * d * (1 - c),
    v[1] * c + (z * v[0] - x * v[2]) * s + y * d * (1 - c),
    v[2] * c + (x * v[1] - y * v[0]) * s + z * d * (1 - c),
  ];
}

export interface Camera {
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  toCamera: Vec3;
}

function cameraFromVectors(toCamera: Vec3, upHint: Vec3 = [0, 1, 0]): Camera {
  const toCam = norm(toCamera);
  const forward = mul(toCam, -1);
  let right = cross(forward, upHint);
  if (Math.hypot(...right) < 1e-5) right = [1, 0, 0];
  right = norm(right);
  const up = norm(cross(right, forward));
  return { right, up, forward, toCamera: toCam };
}

export function cameraForCorner(view: CornerView): Camera {
  const front = faceVec(view.front);
  const right = faceVec(view.right);
  const up = faceVec("up");
  return cameraFromVectors(norm(add(add(front, right), up)));
}

export function cameraForOrbit(yaw: number, pitch: number): Camera {
  const cp = Math.cos(pitch);
  const toCamera: Vec3 = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
  return cameraFromVectors(toCamera);
}

export interface Projector {
  project(point: Vec3): { x: number; y: number; depth: number };
}

function projector(camera: Camera, scale: number, cx: number, cy: number): Projector {
  return {
    project(point: Vec3) {
      const x = dot(point, camera.right) * scale + cx;
      const y = -dot(point, camera.up) * scale + cy;
      const depth = dot(point, camera.toCamera);
      return { x, y, depth };
    },
  };
}


/**
 * Fill a projected parallelogram with a face motif. `origin`, `u` and `v`
 * define a unit square in the plane; the motif's north is the -v direction.
 */
function drawPatternQuad(
  ctx: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  u: { x: number; y: number },
  v: { x: number; y: number },
  pattern: CubeFace["pattern"] | "blank",
  palette: PatternPalette = DEFAULT_PALETTE,
  size = 128,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x + u.x, origin.y + u.y);
  ctx.lineTo(origin.x + u.x + v.x, origin.y + u.y + v.y);
  ctx.lineTo(origin.x + v.x, origin.y + v.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(u.x, u.y, v.x, v.y, origin.x, origin.y);
  ctx.scale(1 / size, 1 / size);
  paintPattern(ctx, pattern, size, palette);
  ctx.restore();
}

interface FaceGeometry {
  normal: FaceKey;
  center: Vec3;
  north: FaceKey;
  east: FaceKey;
  face: CubeFace;
}

function cubeFaceGeometry(folded: FoldedCube, orientation: Orientation): FaceGeometry[] {
  const result: FaceGeometry[] = [];
  for (const face of Object.keys(folded.faces) as FaceKey[]) {
    const world = orientation[face];
    const content = folded.faces[face];
    const northWorld = orientation[content.north];
    const eastWorld = orientation[content.east];
    result.push({
      normal: world,
      center: faceVec(world),
      north: northWorld,
      east: eastWorld,
      face: content,
    });
  }
  return result;
}

export interface CubeDrawOptions {
  size: number;
  centerX: number;
  centerY: number;
  palette?: PatternPalette;
  sealColor?: string;
  stamp?: string;
  stampFace?: FaceKey;
  orientation?: Orientation;
  dimHidden?: boolean;
}

/**
 * Draw a folded cube with its three camera-facing sides, printed motifs and
 * the seal stripe that runs from one face across an edge onto its neighbour.
 */
export function drawFoldedCube(
  ctx: CanvasRenderingContext2D,
  folded: FoldedCube,
  orientation: Orientation,
  camera: Camera,
  options: CubeDrawOptions,
): void {
  const { size, centerX, centerY } = options;
  const scale = size * 0.62;
  const proj = projector(camera, scale, centerX, centerY);
  const geometry = cubeFaceGeometry(folded, orientation);
  const visible = geometry.filter((face) => dot(face.center, camera.toCamera) > 0);
  visible.sort((a, b) => dot(a.center, camera.toCamera) - dot(b.center, camera.toCamera));

  for (const face of visible) {
    const center = mul(face.center, 0.5);
    const east = faceVec(face.east);
    const south = mul(faceVec(face.north), -1);
    const corners = [
      add(add(center, mul(east, -0.5)), mul(south, -0.5)),
      add(add(center, mul(east, 0.5)), mul(south, -0.5)),
      add(add(center, mul(east, 0.5)), mul(south, 0.5)),
      add(add(center, mul(east, -0.5)), mul(south, 0.5)),
    ];
    const projected = corners.map((point) => proj.project(point));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(projected[i].x, projected[i].y);
    ctx.closePath();
    const shade = 0.82 + 0.18 * Math.max(0, dot(norm(face.center), camera.toCamera));
    ctx.fillStyle = shadeColor("#d9c49a", shade);
    ctx.fill();
    drawPatternQuad(
      ctx,
      projected[0],
      sub2(projected[1], projected[0]),
      sub2(projected[3], projected[0]),
      face.face.pattern,
      options.palette ?? DEFAULT_PALETTE,
    );
    ctx.strokeStyle = "#2a1d12";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(projected[i].x, projected[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (folded.seal) {
      const open = [folded.seal.a, folded.seal.b];
      const partner = open.includes(face.normal)
        ? open.find((edge) => edge !== face.normal)
        : null;
      if (partner) {
        const partnerVec = faceVec(partner);
        const eastComp = dot(partnerVec, east);
        const southComp = dot(partnerVec, south);
        const localOrigin = projected[0];
        const u = sub2(projected[1], projected[0]);
        const v = sub2(projected[3], projected[0]);
        let start: { x: number; y: number };
        let end: { x: number; y: number };
        if (Math.abs(eastComp) > 0.5) {
          const a = eastComp > 0 ? 1 : 0;
          start = pointOn(localOrigin, u, v, a, 0.08);
          end = pointOn(localOrigin, u, v, a, 0.92);
        } else {
          const b = southComp > 0 ? 1 : 0;
          start = pointOn(localOrigin, u, v, 0.08, b);
          end = pointOn(localOrigin, u, v, 0.92, b);
        }
        ctx.save();
        ctx.strokeStyle = options.sealColor ?? "#8f2f1d";
        ctx.lineWidth = Math.max(2.5, size * 0.035);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (options.stamp && options.stampFace) {
      const stampWorld = orientation[options.stampFace];
      if (stampWorld === face.normal) {
        const centerProjected = proj.project(center);
        drawStamp(ctx, centerProjected.x, centerProjected.y, size * 0.16, options.stamp);
      }
    }
  }
}

function drawStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stamp: string,
): void {
  ctx.save();
  ctx.strokeStyle = "#7d2a1a";
  ctx.fillStyle = "rgba(214,196,160,0.85)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7d2a1a";
  ctx.font = `${Math.max(9, radius * 1.2)}px "Songti SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(stamp, x, y + radius * 0.06);
  ctx.restore();
}

function sub2(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: a.x - b.x, y: a.y - b.y };
}

function pointOn(
  origin: { x: number; y: number },
  u: { x: number; y: number },
  v: { x: number; y: number },
  a: number,
  b: number,
): { x: number; y: number } {
  return { x: origin.x + u.x * a + v.x * b, y: origin.y + u.y * a + v.y * b };
}


function shadeColor(hex: string, factor: number): string {
  const value = hex.replace("#", "");
  const r = Math.min(255, Math.round(parseInt(value.slice(0, 2), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(value.slice(2, 4), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(value.slice(4, 6), 16) * factor));
  return `rgb(${r},${g},${b})`;
}

export interface FoldStep {
  cellIndex: number;
  parentIndex: number | null;
  direction: Dir | null;
}

export interface NetLayout {
  steps: FoldStep[];
  rootIndex: number;
}

/** Breadth-first fold tree; child directions are net directions from the parent. */
export function netFoldTree(skin: CubeSkin, root: { x: number; y: number }): NetLayout {
  const indexOf = new Map<string, number>();
  skin.cells.forEach((cell, index) => indexOf.set(`${cell.x},${cell.y}`, index));
  const rootIndex = indexOf.get(`${root.x},${root.y}`);
  if (rootIndex === undefined) return { steps: [], rootIndex: 0 };
  const steps: FoldStep[] = skin.cells.map((_, index) => ({
    cellIndex: index,
    parentIndex: null,
    direction: null,
  }));
  const seen = new Set<number>([rootIndex]);
  const queue = [rootIndex];
  const dirs: { dx: number; dy: number; dir: Dir }[] = [
    { dx: 1, dy: 0, dir: "e" },
    { dx: -1, dy: 0, dir: "w" },
    { dx: 0, dy: 1, dir: "s" },
    { dx: 0, dy: -1, dir: "n" },
  ];
  while (queue.length > 0) {
    const current = queue.shift() as number;
    const cell = skin.cells[current];
    for (const step of dirs) {
      const next = indexOf.get(`${cell.x + step.dx},${cell.y + step.dy}`);
      if (next === undefined || seen.has(next)) continue;
      seen.add(next);
      steps[next] = { cellIndex: next, parentIndex: current, direction: step.dir };
      queue.push(next);
    }
  }
  return { steps, rootIndex };
}

interface FoldFrame {
  center: Vec3;
  right: Vec3;
  up: Vec3;
  normal: Vec3;
}

export function foldFrames(skin: CubeSkin, tree: NetLayout, progress: number): FoldFrame[] {
  const frames: FoldFrame[] = skin.cells.map(() => ({
    center: [0, 0, 0.5],
    right: [1, 0, 0],
    up: [0, 1, 0],
    normal: [0, 0, 1],
  }));
  if (tree.steps.length === 0) return frames;
  const totalSteps = tree.steps.filter((step) => step.parentIndex !== null).length || 1;
  const folded = Math.max(0, Math.min(1, progress)) * totalSteps;
  const root = tree.rootIndex;
  // The root face sits on the top of a unit cube centred on the origin, so the
  // folded neighbours land exactly on the cube's side faces.
  frames[root] = { center: [0, 0, 0.5], right: [1, 0, 0], up: [0, 1, 0], normal: [0, 0, 1] };
  const order: number[] = [root];
  let hingeIndex = 0;
  for (let cursor = 0; cursor < order.length; cursor += 1) {
    const index = order[cursor];
    for (let child = 0; child < tree.steps.length; child += 1) {
      const step = tree.steps[child];
      if (step.parentIndex !== index) continue;
      order.push(child);
      hingeIndex += 1;
      const local = Math.max(0, Math.min(1, folded - (hingeIndex - 1)));
      const angle = (Math.PI / 2) * local;
      const parent = frames[index];
      const dir = step.direction as Dir;
      const direction: Record<Dir, Vec3> = {
        e: parent.right,
        w: mul(parent.right, -1),
        n: parent.up,
        s: mul(parent.up, -1),
      };
      const hinge = add(parent.center, mul(direction[dir], 0.5));
      const axis = dir === "e" || dir === "w" ? parent.up : parent.right;
      const sign = dir === "e" || dir === "s" ? 1 : -1;
      const rotate = (point: Vec3): Vec3 =>
        add(hinge, rotateAround(sub(point, hinge), axis, angle * sign));
      const childCenter = add(parent.center, direction[dir]);
      frames[child] = {
        center: rotate(childCenter),
        right: rotateAround(parent.right, axis, angle * sign),
        up: rotateAround(parent.up, axis, angle * sign),
        normal: rotateAround(parent.normal, axis, angle * sign),
      };
    }
  }
  return frames;
}

export interface NetDrawOptions {
  size: number;
  centerX: number;
  centerY: number;
  camera: Camera;
  progress: number;
  root: { x: number; y: number };
  sealColor?: string;
}

/** Draw the flat skin, partially folded according to `progress` (0 flat, 1 cube). */
export function drawSkinNet(
  ctx: CanvasRenderingContext2D,
  skin: CubeSkin,
  options: NetDrawOptions,
): void {
  const tree = netFoldTree(skin, options.root);
  const frames = foldFrames(skin, tree, options.progress);
  const scale = options.size * 0.19;
  const proj = projector(options.camera, scale, options.centerX, options.centerY);
  const order = skin.cells.map((_, index) => index);
  order.sort(
    (a, b) => dot(frames[a].center, options.camera.toCamera) - dot(frames[b].center, options.camera.toCamera),
  );
  for (const index of order) {
    const frame = frames[index];
    const cell = skin.cells[index];
    const corners: Vec3[] = [
      add(add(frame.center, mul(frame.right, -0.5)), mul(frame.up, 0.5)),
      add(add(frame.center, mul(frame.right, 0.5)), mul(frame.up, 0.5)),
      add(add(frame.center, mul(frame.right, 0.5)), mul(frame.up, -0.5)),
      add(add(frame.center, mul(frame.right, -0.5)), mul(frame.up, -0.5)),
    ];
    const projected = corners.map((point) => proj.project(point));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(projected[i].x, projected[i].y);
    ctx.closePath();
    ctx.fillStyle = "#e3d0a8";
    ctx.fill();
    drawPatternQuad(
      ctx,
      projected[0],
      sub2(projected[1], projected[0]),
      sub2(projected[3], projected[0]),
      cell.pattern,
    );
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(projected[i].x, projected[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (skin.seal && skin.seal.x === cell.x && skin.seal.y === cell.y) {
      const u = sub2(projected[1], projected[0]);
      const v = sub2(projected[3], projected[0]);
      let start: { x: number; y: number };
      let end: { x: number; y: number };
      if (skin.seal.dir === "e" || skin.seal.dir === "w") {
        const a = skin.seal.dir === "e" ? 0.97 : 0.03;
        start = pointOn(projected[0], u, v, a, 0.1);
        end = pointOn(projected[0], u, v, a, 0.9);
      } else {
        const b = skin.seal.dir === "s" ? 0.97 : 0.03;
        start = pointOn(projected[0], u, v, 0.1, b);
        end = pointOn(projected[0], u, v, 0.9, b);
      }
      ctx.save();
      ctx.strokeStyle = options.sealColor ?? "#8f2f1d";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}


