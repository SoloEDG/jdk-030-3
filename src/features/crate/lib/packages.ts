import type { BoxKind, CubeSkin, CubeState, Dir, FaceKey, Orientation } from "@/shared/types";
import {
  initialOrientation,
  mirrorSkin,
  packageHash,
  rollOrientation,
} from "./cube";

export interface PackageDef {
  id: string;
  name: string;
  skins: CubeSkin[];
  hash: string;
  kind: BoxKind;
}

const RIPPLE: CubeSkin = {
  id: "ripple",
  name: "涟漪箱",
  root: { x: 1, y: 1 },
  seal: { x: 1, y: 0, dir: "s" },
  cells: [
    { x: 1, y: 0, pattern: "moon" },
    { x: 0, y: 1, pattern: "wave" },
    { x: 1, y: 1, pattern: "ring" },
    { x: 2, y: 1, pattern: "leaf" },
    { x: 1, y: 2, pattern: "star" },
    { x: 1, y: 3, pattern: "spiral" },
  ],
};

const SWIRL: CubeSkin = {
  id: "swirl",
  name: "回澜箱",
  root: { x: 1, y: 1 },
  seal: { x: 2, y: 1, dir: "w" },
  cells: [
    { x: 1, y: 0, pattern: "moon" },
    { x: 0, y: 1, pattern: "wave" },
    { x: 1, y: 1, pattern: "ring" },
    { x: 2, y: 1, pattern: "leaf" },
    { x: 1, y: 2, pattern: "star" },
    { x: 1, y: 3, pattern: "spiral" },
  ],
};

const DUNE: CubeSkin = {
  id: "dune",
  name: "沙脊箱",
  root: { x: 1, y: 1 },
  seal: { x: 1, y: 0, dir: "e" },
  cells: [
    { x: 1, y: 0, pattern: "spiral" },
    { x: 0, y: 1, pattern: "leaf" },
    { x: 1, y: 1, pattern: "moon" },
    { x: 2, y: 1, pattern: "star" },
    { x: 1, y: 2, pattern: "wave" },
    { x: 1, y: 3, pattern: "ring" },
  ],
};

const DEFS: { id: string; skin: CubeSkin }[] = [
  { id: "ripple", skin: RIPPLE },
  { id: "swirl", skin: SWIRL },
  { id: "dune", skin: DUNE },
];

export const PACKAGES: PackageDef[] = DEFS.map((entry) => ({
  id: entry.id,
  name: entry.skin.name,
  skins: [entry.skin, mirrorSkin(entry.skin)],
  hash: packageHash(entry.skin),
  kind: "timber",
}));

export function getPackage(id: string): PackageDef {
  const found = PACKAGES.find((entry) => entry.id === id || entry.hash === id);
  if (!found) throw new Error(`未知花色 ${id}`);
  return found;
}

export function packageByHash(hash: string): PackageDef | undefined {
  return PACKAGES.find(
    (entry) =>
      entry.hash === hash || entry.skins.some((skin) => packageHash(skin) === hash),
  );
}

export function skinOf(id: string, mirrored = false): CubeSkin {
  const pack = getPackage(id);
  return mirrored ? pack.skins[1] : pack.skins[0];
}

export function orientationFromSpins(spins: Dir[] = []): Orientation {
  let orientation = initialOrientation();
  for (const spin of spins) orientation = rollOrientation(orientation, spin);
  return orientation;
}

export interface CrateOptions {
  mirrored?: boolean;
  stamp?: string;
  stampFace?: FaceKey;
  spins?: Dir[];
}

export function buildCube(packageId: string, options: CrateOptions = {}): CubeState {
  const skin = skinOf(packageId, options.mirrored ?? false);
  return {
    skin,
    orientation: orientationFromSpins(options.spins),
    stamp: options.stamp ?? "",
    stampFace: options.stampFace ?? "north",
    packageId: packageHash(skin),
    mirrored: options.mirrored ?? false,
  };
}

export function packageNameOf(hash: string): string {
  const pack = packageByHash(hash);
  if (pack) {
    const mirrored = pack.skins[1] && packageHash(pack.skins[1]) === hash;
    return mirrored ? `${pack.name}（镜像拼法）` : pack.name;
  }
  return `未知包装 ${hash}`;
}
